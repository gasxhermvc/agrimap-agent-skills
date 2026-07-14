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

function parseArgs(argv) {
  const values = {};
  for (let index = 3; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    const key = argv[index].slice(2);
    const next = argv[index + 1];
    values[key] = next && !next.startsWith("--") ? next : true;
    if (values[key] !== true) index += 1;
  }
  return values;
}

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

  const configPath = path.join(state, "config.json");
  if (!(await exists(configPath))) {
    await writeJson(configPath, {
      schemaVersion: 1,
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
    actor: String(args.actor || "frontier"),
    provider: String(args.provider || "unknown"),
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
      `# Task brief\n\n- Task ID: \`${taskId}\`\n- Requested by: ${requestedBy}\n- Session: \`${sessionId}\`\n- Operation: \`${operation}\`\n- Objective: ${args.title || "Define before implementation."}\n- Scope: Define before implementation.\n- Non-goals: Define before implementation.\n`,
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

  const actor = String(args.actor || "frontier");
  const active = { taskId, operation, sessionId, requestedBy, actor, startedAt: now() };
  await writeJson(activePath, active);
  await writeFile(
    path.join(state, "memory", "current", `${taskId}.md`),
    `# Current task memory\n\n- Task: \`${taskId}\`\n- Requested by: ${requestedBy}\n- Actor: ${actor}\n- Status: started\n- Operation: \`${operation}\`\n- Last checkpoint: ${now()}\n- Summary: ${args.title || "Task started; scope must be completed in the task brief."}\n`,
    "utf8",
  );
  await appendLog(state, {
    taskId,
    requestedBy,
    actor,
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
  const state = await ensureLayout(root);
  const taskId = safeTaskId(args.task);
  const summary = String(args.summary || "").trim();
  if (!taskId || !summary) return { ok: false, message: "--task and --summary are required." };

  const activeMatch = await findActiveForTask(state, taskId, safeSessionId(args.session));
  const taskPath = path.join(state, "tasks", taskId);
  const requestedBy = activeMatch?.active?.requestedBy || await taskRequester(taskPath) || await resolveRequester(state, args);
  if (!requestedBy) return { ok: false, needsRequester: true, message: "Requester is missing from the session and task brief." };

  const actor = String(args.actor || activeMatch?.active?.actor || "frontier");
  const files = listValue(args.files);
  const verification = listValue(args.verification);
  const concerns = String(args.concerns || "None recorded.");
  await writeFile(
    path.join(state, "memory", "current", `${taskId}.md`),
    `# Current task memory\n\n- Task: \`${taskId}\`\n- Requested by: ${requestedBy}\n- Actor: ${actor}\n- Status: ${args.status || "in-progress"}\n- Last checkpoint: ${now()}\n- Summary: ${summary}\n- Reason: ${args.reason || "Atomic task checkpoint."}\n- Files: ${files.length ? files.map((file) => `\`${file}\``).join(", ") : "None"}\n- Verification: ${verification.length ? verification.join("; ") : "Not yet run"}\n- Concerns: ${concerns}\n`,
    "utf8",
  );
  await appendLog(state, {
    taskId,
    requestedBy,
    actor,
    event: String(args.event || "changed"),
    summary,
    reason: String(args.reason || "Atomic task checkpoint."),
    files,
    verification,
  });
  return { ok: true, taskId, requestedBy, actor, memory: `memory/current/${taskId}.md` };
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

  const checklist = await readFile(path.join(taskPath, "checklist.md"), "utf8").catch(() => "");
  const unchecked = checklist.split(/\r?\n/).filter((line) => /^\s*- \[ \]/.test(line));
  const qa = await readFile(path.join(taskPath, "qa.md"), "utf8").catch(() => "");
  const qaAccepted = /^\s*(?:-\s*)?Status:\s*(passed|not-applicable)\s*$/im.test(qa);
  const requestedBy = await taskRequester(taskPath);
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
    ok: missing.length === 0 && unchecked.length === 0 && qaAccepted && taskLogged && Boolean(requestedBy) && memoryRecorded,
    taskId,
    missing,
    unchecked,
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
  const actor = String(args.actor || activeMatch?.active?.actor || "frontier");

  await copyFile(path.join(taskPath, "result.md"), path.join(state, "memory", "recent", `${taskId}.md`));
  await rm(path.join(state, "memory", "current", `${taskId}.md`), { force: true });
  if (activeMatch) await rm(activeMatch.activePath, { force: true });
  await appendLog(state, {
    taskId,
    requestedBy,
    actor,
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
  const actor = String(args.actor || activeMatch?.active?.actor || "frontier");

  await copyFile(resultPath, path.join(state, "memory", "recent", `${taskId}.md`));
  await rm(path.join(state, "memory", "current", `${taskId}.md`), { force: true });
  if (activeMatch) await rm(activeMatch.activePath, { force: true });
  await appendLog(state, {
    taskId,
    requestedBy,
    actor,
    event: status === "qa-failed" ? "failed" : status,
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
  const config = await readJson(path.join(state, "config.json"));
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
  return { ok: true, retentionDays, removed, logsPreserved: true };
}

const command = process.argv[2];
const args = parseArgs(process.argv);
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
