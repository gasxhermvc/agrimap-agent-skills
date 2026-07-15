#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  appendFile,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { parseCliArgs } from "./cli-args.mjs";
import { isLogEvent, logEventError } from "./log-events.mjs";

function workspaceRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return path.resolve(cwd);
  }
}

function safeSessionId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function safeTaskId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function firstValue(...values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function executionIdentity(args = {}, fallback = {}) {
  const role = firstValue(args.role, fallback.role, "leader");
  return {
    model: firstValue(args.model, args.modelName, args["model-name"], fallback.model, "unknown"),
    role,
    agent: firstValue(args.agent, args.agentName, args["agent-name"], fallback.agent, role === "leader" ? "primary" : role),
    provider: firstValue(args.provider, fallback.provider, "unknown"),
  };
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function now() {
  return new Date().toISOString();
}

function defaultTaskId(operation) {
  return `${now().replace(/[-:TZ.]/g, "").slice(0, 14)}-${operation || "task"}`;
}

async function ensureLayout(root) {
  const state = path.join(root, ".agrimap-agent");
  const directories = [
    "decisions",
    "knowledge",
    "logs",
    "memory/current",
    "memory/recent",
    "prompts",
    "runtime/active",
    "runtime/sessions",
    "tasks",
  ];
  await Promise.all(directories.map((directory) => mkdir(path.join(state, directory), { recursive: true })));

  const stateIgnorePath = path.join(state, ".gitignore");
  if (!(await exists(stateIgnorePath))) {
    await writeFile(stateIgnorePath, "runtime/\ncache/\n", "utf8");
  }

  const configPath = path.join(state, "config.json");
  if (!(await exists(configPath))) {
    await writeJson(configPath, {
      schemaVersion: 1,
      stateScope: "target-project",
      installDirectoryWrites: false,
      aiGateway: "disabled",
      retentionDays: 30,
      trackConciseLogs: true,
      identity: {
        mode: "per-session",
        runtimePath: ".agrimap-agent/runtime/sessions",
      },
      memory: {
        projectPath: ".agrimap-agent/memory/project.md",
        currentTaskPath: ".agrimap-agent/memory/current/<task-id>.md",
        recentPath: ".agrimap-agent/memory/recent",
      },
      logs: {
        mode: "per-task",
        path: ".agrimap-agent/logs/YYYY-MM/<task-id>.jsonl",
      },
      skip: {
        directories: [".git", "bin", "obj", "node_modules", "dist", "coverage"],
        extensions: [".dll", ".exe", ".pdb", ".so", ".dylib", ".class"],
      },
    });
  }

  const memoryPath = path.join(state, "memory", "project.md");
  if (!(await exists(memoryPath))) {
    await writeFile(memoryPath, "# Project memory\n\n- No durable project context recorded.\n", "utf8");
  }

  for (const file of ["index.jsonl", "frontend-reuse.jsonl"]) {
    const indexPath = path.join(state, "knowledge", file);
    if (!(await exists(indexPath))) await writeFile(indexPath, "", "utf8");
  }
  const serviceOwnershipPath = path.join(state, "knowledge", "service-ownership.yaml");
  if (!(await exists(serviceOwnershipPath))) {
    await writeFile(
      serviceOwnershipPath,
      "schema_version: 1\nsource_of_trust: .agrimap-agent/knowledge/service-ownership.yaml\nupdated_at: null\nupdated_by: null\nservices: []\n",
      "utf8",
    );
  }
  return state;
}

function sessionIdentityPath(state, sessionId) {
  return path.join(state, "runtime", "sessions", `${safeSessionId(sessionId)}.json`);
}

function activeTaskPath(state, sessionId) {
  return path.join(state, "runtime", "active", `${safeSessionId(sessionId)}.json`);
}

async function identify(state, args) {
  const sessionId = safeSessionId(args.session);
  const requestedBy = String(args.owner || args.requestedBy || "").trim();
  if (!sessionId || !requestedBy) {
    return { ok: false, needsSession: !sessionId, needsRequester: !requestedBy, message: "--session and --owner are required." };
  }
  const identity = {
    sessionId,
    requestedBy,
    ...executionIdentity(args),
    updatedAt: now(),
  };
  await writeJson(sessionIdentityPath(state, sessionId), identity);
  return { ok: true, identity };
}

async function resolveRequester(state, args) {
  const explicit = String(args.owner || args.requestedBy || "").trim();
  if (explicit) return explicit;
  const sessionId = safeSessionId(args.session);
  if (!sessionId) return null;
  try {
    const identity = await readJson(sessionIdentityPath(state, sessionId));
    return String(identity.requestedBy || "").trim() || null;
  } catch {
    return null;
  }
}

async function gitStatus(root) {
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

async function appendLog(state, event) {
  if (!isLogEvent(event.event)) {
    const error = new TypeError(logEventError(event.event).message);
    error.code = "INVALID_LOG_EVENT";
    throw error;
  }
  const month = now().slice(0, 7);
  const directory = path.join(state, "logs", month);
  await mkdir(directory, { recursive: true });
  await appendFile(
    path.join(directory, `${String(event.taskId || "unscoped").replace(/[^a-zA-Z0-9._-]+/g, "-")}.jsonl`),
    `${JSON.stringify({ timestamp: now(), ...event })}\n`,
    "utf8",
  );
}

async function init(root, args) {
  const state = await ensureLayout(root);
  let identity = null;
  if (args.session && (args.owner || args.requestedBy)) {
    const result = await identify(state, args);
    if (!result.ok) return result;
    identity = result.identity;
  } else if (args.session) {
    try {
      identity = await readJson(sessionIdentityPath(state, args.session));
    } catch {
      identity = null;
    }
  }
  return { ok: true, root, state, identity, needsRequester: !identity?.requestedBy };
}

async function start(root, args) {
  const state = await ensureLayout(root);
  const sessionId = safeSessionId(args.session);
  if (!sessionId) {
    return { ok: false, needsSession: true, message: "A stable --session is required so concurrent project users do not collide." };
  }

  if (args.owner || args.requestedBy) {
    const identity = await identify(state, args);
    if (!identity.ok) return identity;
  }
  const requestedBy = await resolveRequester(state, args);
  if (!requestedBy) {
    return { ok: false, needsRequester: true, message: "Requester is required before substantive task work." };
  }
  const sessionIdentity = await readJson(sessionIdentityPath(state, sessionId)).catch(() => null);
  const execution = executionIdentity(args, sessionIdentity || {});

  const activePath = activeTaskPath(state, sessionId);
  if (await exists(activePath)) {
    return { ok: false, activeTask: await readJson(activePath), message: "This session already has an active task." };
  }

  const operation = args.operation || "task";
  const taskId = safeTaskId(args.task || defaultTaskId(operation));
  if (!taskId) return { ok: false, message: "Task ID is empty after normalization." };
  const taskPath = path.join(state, "tasks", taskId);
  await mkdir(path.join(taskPath, "handoffs"), { recursive: true });

  if (!(await exists(path.join(taskPath, "brief.md")))) {
    await writeFile(
      path.join(taskPath, "brief.md"),
      `# Task brief\n\n- Task ID: \`${taskId}\`\n- Requested by: ${requestedBy}\n- Session: \`${sessionId}\`\n- Model: \`${execution.model}\`\n- Role: \`${execution.role}\`\n- Agent: \`${execution.agent}\`\n- Provider: \`${execution.provider}\`\n- Operation: \`${operation}\`\n- Objective: ${args.title || "Define before implementation."}\n- Scope: Define before implementation.\n- Non-goals: Define before implementation.\n`,
      "utf8",
    );
  }
  if (!(await exists(path.join(taskPath, "checklist.md")))) {
    await writeFile(
      path.join(taskPath, "checklist.md"),
      "# Checklist\n\n- [ ] Scope and impacts inspected.\n- [ ] Owner trade-offs resolved when material.\n- [ ] Implementation or analysis completed.\n- [ ] Verification completed.\n- [ ] Independent read-only QA completed.\n- [ ] Memory and logs updated.\n",
      "utf8",
    );
  }

  const active = { taskId, operation, sessionId, requestedBy, ...execution, startedAt: now() };
  await writeJson(activePath, active);
  await writeFile(
    path.join(state, "memory", "current", `${taskId}.md`),
    `# Current task memory\n\n- Task: \`${taskId}\`\n- Requested by: ${requestedBy}\n- Model: \`${execution.model}\`\n- Role: \`${execution.role}\`\n- Agent: \`${execution.agent}\`\n- Provider: \`${execution.provider}\`\n- Status: started\n- Operation: \`${operation}\`\n- Last checkpoint: ${now()}\n- Summary: ${args.title || "Task started; scope must be completed in the task brief."}\n`,
    "utf8",
  );
  await appendLog(state, {
    taskId,
    requestedBy,
    ...execution,
    event: "created",
    summary: `Started ${operation} task.`,
    reason: args.title || "Requester request",
    files: [],
    verification: [],
  });

  const dirty = await gitStatus(root);
  return {
    ok: true,
    activeTask: active,
    commitReminder: dirty ? "Git has uncommitted changes; confirm the previous task boundary with the requester." : null,
  };
}

function listValue(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function checkpoint(root, args) {
  const taskId = safeTaskId(args.task);
  const summary = String(args.summary || "").trim();
  if (!taskId || !summary) return { ok: false, message: "--task and --summary are required." };
  const event = String(args.event || "changed").trim();
  if (!isLogEvent(event)) return logEventError(event);
  const state = await ensureLayout(root);

  const activeMatch = await findActiveForTask(state, taskId, safeSessionId(args.session));
  const taskPath = path.join(state, "tasks", taskId);
  const requestedBy = activeMatch?.active?.requestedBy || await taskRequester(taskPath) || await resolveRequester(state, args);
  if (!requestedBy) return { ok: false, needsRequester: true, message: "Requester is missing from the session and task brief." };

  const execution = executionIdentity(args, activeMatch?.active || {});
  const files = listValue(args.files);
  const verification = listValue(args.verification);
  const concerns = String(args.concerns || "None recorded.");
  await writeFile(
    path.join(state, "memory", "current", `${taskId}.md`),
    `# Current task memory\n\n- Task: \`${taskId}\`\n- Requested by: ${requestedBy}\n- Model: \`${execution.model}\`\n- Role: \`${execution.role}\`\n- Agent: \`${execution.agent}\`\n- Provider: \`${execution.provider}\`\n- Status: ${args.status || "in-progress"}\n- Last checkpoint: ${now()}\n- Summary: ${summary}\n- Reason: ${args.reason || "Atomic task checkpoint."}\n- Files: ${files.length ? files.map((file) => `\`${file}\``).join(", ") : "None"}\n- Verification: ${verification.length ? verification.join("; ") : "Not yet run"}\n- Concerns: ${concerns}\n`,
    "utf8",
  );
  await appendLog(state, {
    taskId,
    requestedBy,
    ...execution,
    event,
    summary,
    reason: String(args.reason || "Atomic task checkpoint."),
    files,
    verification,
  });
  return { ok: true, taskId, requestedBy, ...execution, memory: `memory/current/${taskId}.md` };
}

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(entryPath));
    else files.push(entryPath);
  }
  return files;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markdownField(content, label) {
  return content.match(new RegExp(`^\\s*-\\s*${escapeRegExp(label)}:\\s*(.*?)\\s*$`, "im"))?.[1]?.trim() || "";
}

function plainMarkdownValue(value) {
  const normalized = String(value || "").trim();
  return normalized.startsWith("`") && normalized.endsWith("`")
    ? normalized.slice(1, -1).trim()
    : normalized;
}

function placeholderValueReason(value) {
  const normalized = plainMarkdownValue(value);
  if (!normalized) return "missing";
  if (unresolvedTemplateTokens(normalized).length > 0) return "template-placeholder";
  if (/^<[^<>\r\n]+>$/.test(normalized)) return "angle-placeholder";
  if (/^(?:todo|tbd|tbc|fixme)\.?$/i.test(normalized)) return "todo-placeholder";
  if (/^define before implementation\.?$/i.test(normalized)) return "scaffold-placeholder";
  if (/^[a-z][a-z0-9-]*(?:\|[a-z][a-z0-9-]*)+$/i.test(normalized)) return "unresolved-choice";
  return null;
}

function markdownSection(content, heading) {
  const lines = String(content || "").split(/\r?\n/);
  const expected = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "i");
  const start = lines.findIndex((line) => expected.test(line));
  if (start < 0) return "";
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,6}\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

const completionTemplateTokenNames = new Set([
  "task_id", "requested_by", "actual_model_or_unknown", "role", "agent_name", "provider", "operation",
  "objective", "scope", "non_goals", "target_kind", "backend_profile", "logic_impact", "workspace_mode",
  "integration_owner", "branch_name", "file_ownership", "input_manifest", "approved_decisions",
  "service_ids_from_canonical_ownership_file_or_not_applicable", "open_concerns", "model",
  "implementation_model_role_agent_provider", "prompt_path", "requirement_to_evidence", "verification",
  "executor_claims_reopened_and_rerun", "regression_checks", "limitations", "findings_only_no_edits",
  "qa_status", "owner_approved_decisions", "files_behavior_and_evidence", "checklist_status",
  "memory_and_log_updates", "remaining_concerns", "commit_recommendation", "new_prompt_path_or_not_applicable",
]);

function unresolvedTemplateTokens(content) {
  return [...new Set(String(content || "").match(/\{\{[^{}\r\n]+\}\}/g) || [])]
    .filter((token) => completionTemplateTokenNames.has(token.slice(2, -2).trim()));
}

function standaloneScaffoldReasons(content) {
  const reasons = new Set();
  let inFence = false;
  for (const rawLine of String(content || "").split(/\r?\n/)) {
    if (/^\s*(?:```|~~~)/.test(rawLine)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    let line = rawLine.trim();
    line = line.replace(/^(?:>\s*)+/, "");
    line = line.replace(/^(?:[-*+]|\d+[.)])\s+/, "");
    line = line.replace(/^\[[ xX]\]\s*/, "");
    if (!line) continue;
    const reason = placeholderValueReason(line);
    if (reason) reasons.add(reason);
  }
  return [...reasons];
}

async function taskRequester(taskPath) {
  const brief = await readFile(path.join(taskPath, "brief.md"), "utf8").catch(() => "");
  return brief.match(/^\s*- Requested by:\s*(.+?)\s*$/im)?.[1]?.trim() || null;
}

async function validate(root, args) {
  const state = path.join(root, ".agrimap-agent");
  const taskId = safeTaskId(args.task);
  if (!taskId) return { ok: false, message: "--task is required." };
  const taskPath = path.join(state, "tasks", taskId);
  const required = ["brief.md", "checklist.md", "qa.md", "result.md"];
  const missing = [];
  for (const file of required) {
    if (!(await exists(path.join(taskPath, file)))) missing.push(file);
  }

  const artifacts = {};
  for (const file of required) {
    artifacts[file] = await readFile(path.join(taskPath, file), "utf8").catch(() => "");
  }
  const brief = artifacts["brief.md"];
  const checklist = artifacts["checklist.md"];
  const qa = artifacts["qa.md"];
  const result = artifacts["result.md"];
  const placeholderFailures = [];
  for (const [file, content] of Object.entries(artifacts)) {
    for (const token of unresolvedTemplateTokens(content)) placeholderFailures.push({ file, token });
  }

  const contentFailures = [];
  const requireField = (file, content, label) => {
    const value = markdownField(content, label);
    const reason = placeholderValueReason(value);
    if (reason) contentFailures.push({ file, field: label, reason });
    return plainMarkdownValue(value);
  };
  const requireSection = (file, content, heading) => {
    const value = markdownSection(content, heading);
    if (!value) {
      contentFailures.push({ file, field: heading, reason: "missing" });
    } else {
      for (const reason of standaloneScaffoldReasons(value)) {
        contentFailures.push({ file, field: heading, reason });
      }
    }
    return value;
  };

  const requestedBy = requireField("brief.md", brief, "Requested by");
  for (const label of ["Objective", "Scope", "Non-goals"]) requireField("brief.md", brief, label);

  const checklistItems = checklist.split(/\r?\n/)
    .map((line) => line.match(/^\s*- \[([ xX])\]\s*(.*?)\s*$/))
    .filter(Boolean);
  const unchecked = checklist.split(/\r?\n/).filter((line) => /^\s*- \[ \]/.test(line));
  if (checklistItems.length === 0) contentFailures.push({ file: "checklist.md", field: "checkboxes", reason: "missing" });
  for (const item of checklistItems) {
    const reason = placeholderValueReason(item[2]);
    if (reason) contentFailures.push({ file: "checklist.md", field: "checkbox", reason });
  }

  const qaStatus = requireField("qa.md", qa, "Status").toLowerCase();
  const qaAccepted = qaStatus === "passed" || qaStatus === "not-applicable";
  if (!qaAccepted) contentFailures.push({ file: "qa.md", field: "Status", reason: "not-accepted" });
  const qaReadOnly = requireField("qa.md", qa, "Read-only").toLowerCase() === "true";
  if (!qaReadOnly) contentFailures.push({ file: "qa.md", field: "Read-only", reason: "must-be-true" });
  if (qaStatus === "passed") {
    requireSection("qa.md", qa, "Requirement evidence");
    requireSection("qa.md", qa, "Commands and observed results");
  } else if (qaStatus === "not-applicable") {
    requireSection("qa.md", qa, "Limitations");
  }

  const resultOutcome = requireField("result.md", result, "Outcome").toLowerCase();
  if (resultOutcome !== "completed") contentFailures.push({ file: "result.md", field: "Outcome", reason: "must-be-completed" });
  const resultRequester = requireField("result.md", result, "Requested by");
  if (requestedBy && resultRequester && requestedBy !== resultRequester) {
    contentFailures.push({ file: "result.md", field: "Requested by", reason: "requester-mismatch" });
  }
  const resultQaStatus = requireField("result.md", result, "QA status").toLowerCase();
  if (!qaAccepted || resultQaStatus !== qaStatus) {
    contentFailures.push({ file: "result.md", field: "QA status", reason: "qa-status-mismatch" });
  }
  requireSection("result.md", result, "Changes and verification");
  requireSection("result.md", result, "Checklist and memory");

  const memoryRecorded = await exists(path.join(state, "memory", "current", `${taskId}.md`))
    || await exists(path.join(state, "memory", "recent", `${taskId}.md`));
  const logFiles = (await filesUnder(path.join(state, "logs"))).filter((file) => file.endsWith(".jsonl"));
  let taskLogged = false;
  for (const file of logFiles) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.taskId === taskId && event.requestedBy) taskLogged = true;
      } catch {
        // Malformed lines are handled by repository QA; they are not completion evidence.
      }
    }
  }

  return {
    ok: missing.length === 0
      && unchecked.length === 0
      && placeholderFailures.length === 0
      && contentFailures.length === 0
      && qaAccepted
      && taskLogged
      && Boolean(requestedBy)
      && memoryRecorded,
    taskId,
    missing,
    unchecked,
    checklistItems: checklistItems.length,
    placeholderFailures,
    contentFailures,
    qaAccepted,
    taskLogged,
    requesterRecorded: Boolean(requestedBy),
    memoryRecorded,
  };
}

async function findActiveForTask(state, taskId, sessionId) {
  if (sessionId) {
    const activePath = activeTaskPath(state, sessionId);
    if (await exists(activePath)) {
      const active = await readJson(activePath);
      if (active.taskId === taskId) return { active, activePath };
    }
    return null;
  }
  const activeDirectory = path.join(state, "runtime", "active");
  for (const file of await readdir(activeDirectory).catch(() => [])) {
    if (!file.endsWith(".json")) continue;
    const candidatePath = path.join(activeDirectory, file);
    const candidate = await readJson(candidatePath).catch(() => null);
    if (candidate?.taskId === taskId) return { active: candidate, activePath: candidatePath };
  }
  return null;
}

async function complete(root, args) {
  const taskId = safeTaskId(args.task);
  const validation = await validate(root, { ...args, task: taskId });
  if (!validation.ok) return validation;

  const state = path.join(root, ".agrimap-agent");
  const taskPath = path.join(state, "tasks", taskId);
  const activeMatch = await findActiveForTask(state, taskId, safeSessionId(args.session));
  const requestedBy = activeMatch?.active?.requestedBy || await taskRequester(taskPath);
  const execution = executionIdentity(args, activeMatch?.active || {});

  await copyFile(path.join(taskPath, "result.md"), path.join(state, "memory", "recent", `${taskId}.md`));
  await rm(path.join(state, "memory", "current", `${taskId}.md`), { force: true });
  if (activeMatch) await rm(activeMatch.activePath, { force: true });
  await appendLog(state, {
    taskId,
    requestedBy,
    ...execution,
    event: "completed",
    summary: "Task passed its completion gate.",
    reason: "Checklist, QA, memory, and logs are complete.",
    files: [],
    verification: ["agm-workspace validate: passed"],
  });
  return { ok: true, taskId, requestedBy, archived: `memory/recent/${taskId}.md` };
}

async function closeTask(root, args) {
  const taskId = safeTaskId(args.task);
  const status = String(args.status || "").trim();
  const allowed = new Set(["qa-failed", "blocked", "cancelled"]);
  if (!taskId || !allowed.has(status)) {
    return { ok: false, message: "--task and --status qa-failed|blocked|cancelled are required." };
  }

  const state = path.join(root, ".agrimap-agent");
  const taskPath = path.join(state, "tasks", taskId);
  const resultPath = path.join(taskPath, "result.md");
  if (!(await exists(resultPath))) return { ok: false, message: "result.md is required before closing a non-complete task." };

  const qaPath = path.join(taskPath, "qa.md");
  if (status === "qa-failed") {
    const qa = await readFile(qaPath, "utf8").catch(() => "");
    const result = await readFile(resultPath, "utf8");
    const nextPrompt = String(args.nextPrompt || args["next-prompt"] || "").trim();
    const nextPromptPath = nextPrompt ? path.resolve(root, nextPrompt) : "";
    const promptsRoot = path.resolve(state, "prompts");
    const promptRelative = nextPromptPath ? path.relative(promptsRoot, nextPromptPath) : "";
    if (!/^\s*(?:-\s*)?Status:\s*failed\s*$/im.test(qa)) {
      return { ok: false, message: "qa.md must record Status: failed before closing as qa-failed." };
    }
    if (!/Outcome:\s*`?qa-failed`?/i.test(result)) {
      return { ok: false, message: "result.md must record Outcome: qa-failed." };
    }
    if (!nextPromptPath || promptRelative.startsWith("..") || path.isAbsolute(promptRelative) || !(await exists(nextPromptPath))) {
      return { ok: false, message: "--next-prompt must point to an existing file under .agrimap-agent/prompts/." };
    }
  }

  const activeMatch = await findActiveForTask(state, taskId, safeSessionId(args.session));
  const requestedBy = activeMatch?.active?.requestedBy || await taskRequester(taskPath);
  if (!requestedBy) return { ok: false, needsRequester: true, message: "Requester is missing from the task brief." };
  const execution = executionIdentity(args, activeMatch?.active || {});

  await copyFile(resultPath, path.join(state, "memory", "recent", `${taskId}.md`));
  await rm(path.join(state, "memory", "current", `${taskId}.md`), { force: true });
  if (activeMatch) await rm(activeMatch.activePath, { force: true });
  await appendLog(state, {
    taskId,
    requestedBy,
    ...execution,
    event: status,
    summary: `Task closed as ${status}; it did not pass the completion gate.`,
    reason: String(args.reason || "Closed without claiming completion."),
    files: [],
    verification: status === "qa-failed" ? [`QA failed; next prompt: ${args.nextPrompt || args["next-prompt"]}`] : [],
  });
  return {
    ok: true,
    taskId,
    requestedBy,
    status,
    complete: false,
    archived: `memory/recent/${taskId}.md`,
    nextPrompt: status === "qa-failed" ? args.nextPrompt || args["next-prompt"] : null,
  };
}

async function prune(root) {
  const state = path.join(root, ".agrimap-agent");
  const configPath = path.join(state, "config.json");
  if (!(await exists(configPath))) {
    return {
      ok: true,
      pruned: false,
      reason: "config-missing",
      retentionDays: null,
      removed: [],
      logsPreserved: true,
    };
  }

  let config;
  try {
    config = await readJson(configPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        ok: true,
        pruned: false,
        reason: "config-missing",
        retentionDays: null,
        removed: [],
        logsPreserved: true,
      };
    }
    const code = error instanceof SyntaxError ? "INVALID_CONFIG" : "CONFIG_READ_FAILED";
    return {
      ok: false,
      pruned: false,
      code,
      message: code === "INVALID_CONFIG"
        ? ".agrimap-agent/config.json is not valid JSON."
        : ".agrimap-agent/config.json could not be read.",
      retentionDays: null,
      removed: [],
      logsPreserved: true,
    };
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      ok: false,
      pruned: false,
      code: "INVALID_CONFIG",
      message: ".agrimap-agent/config.json must contain a JSON object.",
      retentionDays: null,
      removed: [],
      logsPreserved: true,
    };
  }
  const retentionDays = Math.min(30, Math.max(10, Number(config.retentionDays) || 30));
  const recent = path.join(state, "memory", "recent");
  const threshold = Date.now() - retentionDays * 86_400_000;
  const removed = [];
  for (const file of await readdir(recent).catch(() => [])) {
    const filePath = path.join(recent, file);
    const details = await stat(filePath);
    if (details.isFile() && details.mtimeMs < threshold) {
      await rm(filePath, { force: true });
      removed.push(file);
    }
  }
  return { ok: true, pruned: true, retentionDays, removed, logsPreserved: true };
}

const command = process.argv[2];
const args = parseCliArgs(process.argv.slice(3));
const root = workspaceRoot(args.cwd || process.cwd());
let result;

switch (command) {
  case "init":
    result = await init(root, args);
    break;
  case "identify": {
    const state = await ensureLayout(root);
    result = await identify(state, args);
    break;
  }
  case "start":
    result = await start(root, args);
    break;
  case "checkpoint":
    result = await checkpoint(root, args);
    break;
  case "validate":
    result = await validate(root, args);
    break;
  case "complete":
    result = await complete(root, args);
    break;
  case "close":
    result = await closeTask(root, args);
    break;
  case "prune":
    result = await prune(root);
    break;
  default:
    result = { ok: false, message: "Use init, identify, start, checkpoint, validate, complete, close, or prune." };
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
