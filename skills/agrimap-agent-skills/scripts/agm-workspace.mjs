#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  appendFile,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCliArgs } from "./cli-args.mjs";
import {
  confirmationExpiry,
  DEFAULT_CONFIRMATION_HOURS,
  IDENTITY_SCHEMA_VERSION,
  isIdentitySource,
  localAuditMetadata,
  normalizeIdentity,
} from "./identity.mjs";
import { isLogEvent, logEventError, MILESTONE_TYPES, QA_FAILED_EVENT } from "./log-events.mjs";
import { loadTaskArtifactSchema } from "./task-artifact-schema.mjs";

const AUDIT_SCHEMA_VERSION = 3;
const SUPPORTED_AUDIT_SCHEMA_VERSIONS = new Set([1, 2, AUDIT_SCHEMA_VERSION]);
const TERMINAL_AUDIT_EVENTS = new Set([QA_FAILED_EVENT, "blocked", "cancelled", "completed"]);
const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const taskArtifactSchema = await loadTaskArtifactSchema(skillRoot);
const TRACKED_WORKFLOW_DEPTHS = new Set(taskArtifactSchema.workflowDepths || ["standard", "regulated"]);
const completionTemplateTokenNames = new Set();
for (const definition of Object.values(taskArtifactSchema.artifacts || {})) {
  const template = await readFile(path.join(skillRoot, "assets", "templates", definition.template), "utf8");
  for (const token of template.match(/\{\{[^{}\r\n]+\}\}/g) || []) {
    completionTemplateTokenNames.add(token.slice(2, -2).trim());
  }
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
    modelLabel: firstValue(args.modelLabel, args["model-label"], fallback.modelLabel, "not-configured"),
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

async function renderAssetTemplate(fileName, replacements = {}) {
  let content = await readFile(path.join(skillRoot, "assets", "templates", fileName), "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, String(value));
  }
  return content.endsWith("\n") ? content : `${content}\n`;
}

async function renderTaskArtifact(artifactName, replacements = {}) {
  const definition = taskArtifactSchema.artifacts?.[artifactName];
  if (!definition?.template) throw new Error(`Task artifact schema is missing a template for ${artifactName}.`);
  return renderAssetTemplate(definition.template, replacements);
}

function now() {
  return new Date().toISOString();
}

function confirmationHours(value) {
  return Math.min(168, Math.max(1, Number(value) || DEFAULT_CONFIRMATION_HOURS));
}

function taskSubjectSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 5)
    .join("-")
    .slice(0, 60);
}

function defaultTaskId(operation, subject) {
  return `${now().replace(/[-:TZ.]/g, "").slice(0, 14)}-${taskSubjectSlug(subject) || operation || "task"}`;
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
        confirmationHours: DEFAULT_CONFIRMATION_HOURS,
        gitRequesterSuggestion: true,
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

  const referenceLibrary = {
    "db-schema": "# db-schema references\n\nOwner-provided database DDL: tables, views, and procedures (for example `TABLE_ORDER.sql`, `UM_USER_Q.sql`).\n\nAgents load matching files here as `FACT` before any SQL or data-touching work and must never infer a table, column, type, key, or constraint that is not present in a loaded reference. If the needed schema is missing, the agent names it and asks instead of guessing.\n",
    "api-contracts": "# api-contracts references\n\nOpenAPI/Swagger documents, `.proto` files, and representative request/response samples.\n\nAgents load matching contracts here as `FACT` for integration and cross-service work instead of inferring payload shapes.\n",
    docs: "# docs references\n\nBusiness and domain documents: requirements, business rules, glossaries, and process notes.\n\nAgents treat requester-supplied documents and decision-owner-approved references as `FACT` only with evidence pointers for scope and acceptance decisions.\n",
    design: "# design references\n\nDesign tokens, brand identity, and UI guidelines.\n\nAgents load these as `FACT` for design-affecting work and never invent a new visual language while a loaded token or identity answers the question. When this folder is empty, agents fall back to tokens already present in the codebase and record `missing-owner-example`.\n",
  };
  for (const [directory, readme] of Object.entries(referenceLibrary)) {
    const referencePath = path.join(state, "knowledge", "references", directory);
    await mkdir(referencePath, { recursive: true });
    const readmePath = path.join(referencePath, "README.md");
    if (!(await exists(readmePath))) await writeFile(readmePath, readme, "utf8");
  }
  return state;
}

async function archivePrompts(state, taskId) {
  const source = path.join(state, "prompts", taskId);
  if (!(await exists(source))) return { moved: false, reason: "no-prompts" };
  const destination = path.join(state, "prompts", "complete", taskId);
  if (await exists(destination)) return { moved: false, reason: "destination-exists", destination: `prompts/complete/${taskId}` };
  await mkdir(path.dirname(destination), { recursive: true });
  await rename(source, destination);
  return { moved: true, destination: `prompts/complete/${taskId}` };
}

function sessionIdentityPath(state, sessionId) {
  return path.join(state, "runtime", "sessions", `${safeSessionId(sessionId)}.json`);
}

function activeTaskPath(state, sessionId) {
  return path.join(state, "runtime", "active", `${safeSessionId(sessionId)}.json`);
}

async function identify(state, args) {
  const sessionId = safeSessionId(args.session);
  const requestedBy = String(args.requestedBy || args["requested-by"] || args.owner || "").trim();
  if (!sessionId || !requestedBy) {
    return { ok: false, needsSession: !sessionId, needsRequester: !requestedBy, message: "--session and --requested-by are required (--owner remains a legacy alias)." };
  }
  const identitySource = String(args.source || args.identitySource || args["identity-source"] || "manual-confirmed").trim();
  if (!isIdentitySource(identitySource) || identitySource === "legacy-migrated") {
    return { ok: false, code: "INVALID_IDENTITY_SOURCE", message: "--source must be manual-confirmed or git-config-confirmed." };
  }
  const config = await readJson(path.join(state, "config.json")).catch(() => ({}));
  const hours = confirmationHours(args.confirmationHours || args["confirmation-hours"] || config?.identity?.confirmationHours);
  const confirmedAt = now();
  const identity = {
    schemaVersion: IDENTITY_SCHEMA_VERSION,
    sessionId,
    requestedBy,
    requesterId: String(args.requesterId || args["requester-id"] || "").trim() || null,
    identitySource,
    confirmedAt,
    expiresAt: confirmationExpiry(confirmedAt, hours),
    ...executionIdentity(args),
    ...localAuditMetadata(),
    updatedAt: confirmedAt,
  };
  await writeJson(sessionIdentityPath(state, sessionId), identity);
  return { ok: true, identity };
}

async function sessionIdentity(state, sessionId, defaultProvider = "unknown") {
  if (!sessionId) return null;
  try {
    return normalizeIdentity(await readJson(sessionIdentityPath(state, sessionId)), { defaultProvider });
  } catch {
    return null;
  }
}

function gitRequesterSuggestion(root) {
  try {
    const requestedBy = execFileSync("git", ["config", "--get", "user.name"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return requestedBy ? { requestedBy, source: "git-config-unconfirmed" } : null;
  } catch {
    return null;
  }
}

async function resolveRequester(state, args) {
  const explicit = String(args.requestedBy || args["requested-by"] || args.owner || "").trim();
  if (explicit) return explicit;
  const sessionId = safeSessionId(args.session);
  if (!sessionId) return null;
  try {
    const identity = await sessionIdentity(state, sessionId, args.provider);
    return identity && !identity.expired ? identity.requestedBy : null;
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

function gitOutput(root, args, options = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "ignore"],
        input: options.input,
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout || "").trim(),
    };
  }
}

function gitAuditSnapshot(root) {
  const repository = gitOutput(root, ["rev-parse", "--is-inside-work-tree"]);
  if (!repository.ok || repository.stdout !== "true") return { gitHead: null, gitDirty: null };
  const head = gitOutput(root, ["rev-parse", "HEAD"]);
  const status = gitOutput(root, ["status", "--porcelain=v1"]);
  return {
    gitHead: head.ok && /^[0-9a-f]{40,64}$/i.test(head.stdout) ? head.stdout : null,
    gitDirty: status.ok ? Boolean(status.stdout) : null,
  };
}

function auditEventIssues(event) {
  const issues = [];
  const schemaVersion = event.schemaVersion;
  if (!SUPPORTED_AUDIT_SCHEMA_VERSIONS.has(schemaVersion)) {
    issues.push({ field: "schemaVersion", reason: "unsupported" });
  }
  const requiredFields = ["timestamp", "taskId", "requestedBy", "identitySource", "model", "role", "agent", "provider", "event", "summary", "reason"];
  for (const field of requiredFields) {
    if (!String(event[field] || "").trim()) issues.push({ field, reason: "missing" });
  }
  if (!Number.isFinite(Date.parse(event.timestamp)) || new Date(event.timestamp).toISOString() !== event.timestamp) {
    issues.push({ field: "timestamp", reason: "must-be-iso-utc" });
  }
  if (!isLogEvent(event.event)) issues.push({ field: "event", reason: "invalid" });
  if (!isIdentitySource(event.identitySource)) issues.push({ field: "identitySource", reason: "invalid" });
  if (event.event === "created" && !String(event.request || "").trim()) {
    issues.push({ field: "request", reason: "missing-on-created-event" });
  }
  if (schemaVersion >= 3) {
    if (!TRACKED_WORKFLOW_DEPTHS.has(String(event.workflowDepth || "").toLowerCase())) {
      issues.push({ field: "workflowDepth", reason: "missing-or-invalid" });
    }
    const milestoneEvents = new Set(["changed", "verified", "decision", "qa-finding"]);
    if (milestoneEvents.has(event.event) && !MILESTONE_TYPES.includes(event.milestone)) {
      issues.push({ field: "milestone", reason: "missing-or-invalid" });
    }
    if (!milestoneEvents.has(event.event) && event.milestone !== undefined) {
      issues.push({ field: "milestone", reason: "forbidden-on-created-or-terminal-event" });
    }
  }
  if (!Array.isArray(event.files)) issues.push({ field: "files", reason: "must-be-array" });
  else if (schemaVersion >= 2) {
    if (event.files.some((file) => typeof file !== "string" || !file.trim())) {
      issues.push({ field: "files", reason: "must-contain-nonblank-paths" });
    }
    if (event.event === "changed" && !event.files.some((file) => typeof file === "string" && file.trim())) {
      issues.push({ field: "files", reason: "required-on-changed-event" });
    }
  }
  if (!Array.isArray(event.verification)) issues.push({ field: "verification", reason: "must-be-array" });
  if (schemaVersion >= 2 && !Object.hasOwn(event, "gitHead")) issues.push({ field: "gitHead", reason: "missing" });
  if (schemaVersion >= 2 && !Object.hasOwn(event, "gitDirty")) issues.push({ field: "gitDirty", reason: "missing" });
  if (event.gitHead !== null && event.gitHead !== undefined && !/^[0-9a-f]{40,64}$/i.test(String(event.gitHead))) {
    issues.push({ field: "gitHead", reason: "invalid" });
  }
  if (event.gitDirty !== null && event.gitDirty !== undefined && typeof event.gitDirty !== "boolean") {
    issues.push({ field: "gitDirty", reason: "must-be-boolean-or-null" });
  }
  return issues;
}

async function appendLog(state, event) {
  if (!isLogEvent(event.event)) {
    const error = new TypeError(logEventError(event.event).message);
    error.code = "INVALID_LOG_EVENT";
    throw error;
  }
  const { machine: _machine, osUser: _osUser, ...trackableEvent } = event;
  const timestamp = now();
  const gitSnapshot = gitAuditSnapshot(path.dirname(state));
  const record = { ...trackableEvent, schemaVersion: AUDIT_SCHEMA_VERSION, timestamp, ...gitSnapshot };
  const issues = auditEventIssues(record);
  if (issues.length > 0) {
    const error = new TypeError(`Audit event is incomplete: ${issues.map((issue) => `${issue.field}:${issue.reason}`).join(", ")}`);
    error.code = "INVALID_AUDIT_EVENT";
    error.issues = issues;
    throw error;
  }
  const month = timestamp.slice(0, 7);
  const directory = path.join(state, "logs", month);
  await mkdir(directory, { recursive: true });
  await appendFile(
    path.join(directory, `${String(event.taskId || "unscoped").replace(/[^a-zA-Z0-9._-]+/g, "-")}.jsonl`),
    `${JSON.stringify(record)}\n`,
    "utf8",
  );
}

async function init(root, args) {
  const state = await ensureLayout(root);
  let identity = null;
  if (args.session && (args.requestedBy || args["requested-by"] || args.owner)) {
    const result = await identify(state, args);
    if (!result.ok) return result;
    identity = result.identity;
  } else if (args.session) {
    identity = await sessionIdentity(state, safeSessionId(args.session), args.provider);
  }
  const needsRequester = !identity?.requestedBy || identity.expired;
  return {
    ok: true,
    root,
    state,
    identity,
    needsRequester,
    suggestedRequester: needsRequester ? gitRequesterSuggestion(root) : null,
  };
}

async function start(root, args) {
  const state = await ensureLayout(root);
  const workflowDepth = String(args.depth || args["workflow-depth"] || "regulated").trim().toLowerCase();
  if (workflowDepth === "light") {
    return { ok: false, code: "LIGHT_DEPTH_STATE_FORBIDDEN", message: "Light depth must not start task state; execute directly without requester persistence or workflow artifacts." };
  }
  if (!TRACKED_WORKFLOW_DEPTHS.has(workflowDepth)) {
    return { ok: false, code: "INVALID_WORKFLOW_DEPTH", message: "--depth must be standard or regulated when starting tracked state." };
  }
  const sessionId = safeSessionId(args.session);
  if (!sessionId) {
    return { ok: false, needsSession: true, message: "A stable --session is required so concurrent project users do not collide." };
  }
  const objective = String(args.title || args.objective || "").trim();
  if (!objective) {
    return { ok: false, code: "REQUEST_OBJECTIVE_REQUIRED", needsObjective: true, message: "--title or --objective is required so the durable audit can record what was requested." };
  }

  if (args.owner || args.requestedBy) {
    const identity = await identify(state, args);
    if (!identity.ok) return identity;
  }
  const confirmedIdentity = await sessionIdentity(state, sessionId, args.provider);
  if (!confirmedIdentity || confirmedIdentity.expired) {
    return {
      ok: false,
      needsRequester: true,
      identityExpired: Boolean(confirmedIdentity?.expired),
      lastRequester: confirmedIdentity?.requestedBy || null,
      suggestedRequester: gitRequesterSuggestion(root),
      message: confirmedIdentity?.expired
        ? "Requester confirmation expired; confirm the human requester again before substantive task work."
        : "Requester is required before substantive task work.",
    };
  }
  const requestedBy = confirmedIdentity.requestedBy;
  const execution = executionIdentity(args, confirmedIdentity);

  const activePath = activeTaskPath(state, sessionId);
  if (await exists(activePath)) {
    return { ok: false, activeTask: await readJson(activePath), message: "This session already has an active task." };
  }

  const operation = args.operation || "task";
  const taskId = safeTaskId(args.task || defaultTaskId(operation, args.subject || objective));
  if (!taskId) return { ok: false, message: "Task ID is empty after normalization." };
  const taskPath = path.join(state, "tasks", taskId);
  if (await exists(taskPath)) {
    return {
      ok: false,
      code: "TASK_ID_EXISTS",
      taskId,
      message: "This task ID already has tracked artifacts. Use a new task ID so requester and request history cannot be mixed.",
    };
  }
  await mkdir(path.join(taskPath, "handoffs"), { recursive: true });

  const scaffoldReplacements = {
    "brief.md": {
      task_id: taskId,
      requested_by: requestedBy,
      requester_id_or_not_recorded: confirmedIdentity.requesterId || "Not recorded",
      identity_source: confirmedIdentity.identitySource,
      requester_authority: args.requesterAuthority || args["requester-authority"] || "unknown",
      decision_owner_or_not_required: args.decisionOwner || args["decision-owner"] || "unresolved",
      authority_evidence_or_not_required: args.authorityEvidence || args["authority-evidence"] || "unresolved",
      session_id: sessionId,
      model_label_or_not_configured: execution.modelLabel,
      actual_model_or_unknown: execution.model,
      role: execution.role,
      agent_name: execution.agent,
      provider: execution.provider,
      operation,
      workflow_depth: workflowDepth,
      objective,
    },
    "checklist.md": {},
  };
  for (const artifactName of taskArtifactSchema.scaffoldOrder || []) {
    const requiredForDepths = taskArtifactSchema.artifacts?.[artifactName]?.requiredForDepths || [];
    if (!requiredForDepths.includes(workflowDepth)) continue;
    const artifactPath = path.join(taskPath, artifactName);
    if (!(await exists(artifactPath))) {
      await writeFile(artifactPath, await renderTaskArtifact(artifactName, scaffoldReplacements[artifactName] || {}), "utf8");
    }
  }

  const active = {
    taskId,
    operation,
    workflowDepth,
    objective,
    sessionId,
    requestedBy,
    requesterId: confirmedIdentity.requesterId,
    identitySource: confirmedIdentity.identitySource,
    requesterAuthority: scaffoldReplacements["brief.md"].requester_authority,
    decisionOwner: scaffoldReplacements["brief.md"].decision_owner_or_not_required,
    authorityEvidence: scaffoldReplacements["brief.md"].authority_evidence_or_not_required,
    ...execution,
    startedAt: now(),
  };
  await writeJson(activePath, active);
  await writeFile(
    path.join(state, "memory", "current", `${taskId}.md`),
    `# Current task memory\n\n- Task: \`${taskId}\`\n- Workflow depth: \`${workflowDepth}\`\n- Requested by: ${requestedBy}\n- Requester authority: \`${scaffoldReplacements["brief.md"].requester_authority}\`\n- Decision owner: ${scaffoldReplacements["brief.md"].decision_owner_or_not_required}\n- Request: ${objective}\n- Model label: \`${execution.modelLabel}\`\n- Actual model: \`${execution.model}\`\n- Role: \`${execution.role}\`\n- Agent: \`${execution.agent}\`\n- Provider: \`${execution.provider}\`\n- Status: started\n- Operation: \`${operation}\`\n- Last milestone: ${now()}\n- Summary: ${objective}\n`,
    "utf8",
  );
  await appendLog(state, {
    taskId,
    requestedBy,
    requesterId: confirmedIdentity.requesterId,
    identitySource: confirmedIdentity.identitySource,
    ...execution,
    workflowDepth,
    event: "created",
    summary: `Started ${operation} task.`,
    request: objective,
    reason: objective,
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
  if (event === "created" || TERMINAL_AUDIT_EVENTS.has(event)) {
    return { ok: false, code: "CHECKPOINT_EVENT_NOT_MILESTONE", message: "start owns created; complete|close owns terminal events. checkpoint accepts only durable intermediate milestones." };
  }
  const defaultMilestone = event === "decision"
    ? "scope-decision"
    : event === "verified" || event === "qa-finding"
      ? "verification-gate"
      : "acceptance-slice";
  const milestone = String(args.milestone || defaultMilestone).trim().toLowerCase();
  const allowedMilestonesByEvent = {
    changed: new Set(["acceptance-slice", "integration"]),
    decision: new Set(["scope-decision"]),
    verified: new Set(["verification-gate"]),
    "qa-finding": new Set(["verification-gate"]),
  };
  if (!MILESTONE_TYPES.includes(milestone) || !allowedMilestonesByEvent[event]?.has(milestone)) {
    return { ok: false, code: "INVALID_MILESTONE", message: `--milestone must match event ${event}: ${[...(allowedMilestonesByEvent[event] || [])].join("|") || "none"}.` };
  }
  const files = listValue(args.files);
  if (event === "changed" && files.length === 0) {
    return {
      ok: false,
      code: "CHANGED_FILES_REQUIRED",
      message: "A changed checkpoint requires --files so later history can distinguish what the executor claims to have changed.",
    };
  }
  const state = await ensureLayout(root);
  if (event === "qa-finding") {
    if (files.length > 0) {
      return {
        ok: false,
        code: "QA_FINDING_PRODUCT_FILES_FORBIDDEN",
        message: "qa-finding is verification-only evidence and must not claim changed product files.",
      };
    }
    if (await countTaskEvents(state, taskId, "qa-finding") >= 1) {
      return {
        ok: false,
        code: "QA_CORRECTION_LIMIT",
        message: `This task already used its one in-scope correction cycle. Record terminal ${QA_FAILED_EVENT} and move further correction to a new approved task/prompt.`,
      };
    }
  }

  const activeMatch = await findActiveForTask(state, taskId, safeSessionId(args.session));
  if (activeMatch?.ambiguous) return activeTaskAmbiguityError(taskId, activeMatch.matches);
  const taskPath = path.join(state, "tasks", taskId);
  const taskIdentity = await taskAuditIdentity(taskPath);
  const requestedBy = activeMatch?.active?.requestedBy || taskIdentity.requestedBy || await resolveRequester(state, args);
  if (!requestedBy) return { ok: false, needsRequester: true, message: "Requester is missing from the session and task brief." };

  const execution = executionIdentity(args, activeMatch?.active || {});
  const requesterId = activeMatch?.active?.requesterId || taskIdentity.requesterId || null;
  const identitySource = activeMatch?.active?.identitySource || taskIdentity.identitySource || "legacy-migrated";
  const request = activeMatch?.active?.objective || taskIdentity.request || null;
  const verification = listValue(args.verification);
  const concerns = String(args.concerns || "None recorded.");
  await writeFile(
    path.join(state, "memory", "current", `${taskId}.md`),
    `# Current task memory\n\n- Task: \`${taskId}\`\n- Workflow depth: \`${activeMatch?.active?.workflowDepth || taskIdentity.workflowDepth || "regulated"}\`\n- Requested by: ${requestedBy}\n- Request: ${request || "Not recorded (legacy task)"}\n- Model label: \`${execution.modelLabel}\`\n- Actual model: \`${execution.model}\`\n- Role: \`${execution.role}\`\n- Agent: \`${execution.agent}\`\n- Provider: \`${execution.provider}\`\n- Status: ${args.status || "in-progress"}\n- Last milestone: \`${milestone}\` at ${now()}\n- Summary: ${summary}\n- Reason: ${args.reason || "Durable milestone checkpoint."}\n- Files: ${files.length ? files.map((file) => `\`${file}\``).join(", ") : "None"}\n- Verification: ${verification.length ? verification.join("; ") : "Not yet run"}\n- Concerns: ${concerns}\n`,
    "utf8",
  );
  await appendLog(state, {
    taskId,
    requestedBy,
    requesterId,
    identitySource,
    ...execution,
    workflowDepth: activeMatch?.active?.workflowDepth || taskIdentity.workflowDepth || "regulated",
    event,
    milestone,
    summary,
    reason: String(args.reason || "Durable milestone checkpoint."),
    files,
    verification,
  });
  return { ok: true, taskId, milestone, requestedBy, requesterId, identitySource, ...execution, memory: `memory/current/${taskId}.md` };
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

async function countTaskEvents(state, taskId, eventName) {
  let count = 0;
  const logFiles = (await filesUnder(path.join(state, "logs"))).filter((file) => file.endsWith(".jsonl"));
  for (const file of logFiles) {
    for (const line of (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean)) {
      try {
        const entry = JSON.parse(line);
        if (
          entry.taskId === taskId
          && entry.event === eventName
          && SUPPORTED_AUDIT_SCHEMA_VERSIONS.has(entry.schemaVersion)
          && auditEventIssues(entry).length === 0
        ) count += 1;
      } catch {
        // Invalid audit lines remain diagnostic and never consume the correction allowance.
      }
    }
  }
  return count;
}

async function recordedTaskFiles(state, taskId) {
  const recorded = new Set();
  const logFiles = (await filesUnder(path.join(state, "logs"))).filter((file) => file.endsWith(".jsonl"));
  for (const file of logFiles) {
    for (const line of (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean)) {
      try {
        const event = JSON.parse(line);
        const versioned = SUPPORTED_AUDIT_SCHEMA_VERSIONS.has(event.schemaVersion);
        if (
          event.taskId !== taskId
          || !versioned
          || TERMINAL_AUDIT_EVENTS.has(event.event)
          || auditEventIssues(event).length > 0
        ) continue;
        for (const changedFile of event.files) {
          const normalized = typeof changedFile === "string" ? changedFile.trim() : "";
          if (normalized) recorded.add(normalized);
        }
      } catch {
        // Invalid lines are reported by validation/history and never supply file attribution.
      }
    }
  }
  return [...recorded];
}

function auditStorageStatus(root, logFiles) {
  const repository = gitOutput(root, ["rev-parse", "--is-inside-work-tree"]);
  const relativeLogs = logFiles
    .map((file) => path.relative(root, file).replace(/\\/g, "/"))
    .sort((a, b) => a.localeCompare(b));
  if (!repository.ok || repository.stdout !== "true") {
    return {
      status: relativeLogs.length ? "local-only-no-git" : "no-logs",
      gitRepository: false,
      logFileCount: relativeLogs.length,
      trackedCount: 0,
      ignoredCount: 0,
      workingTreeChanges: [],
      recoverableFromCurrentCommit: false,
      note: "Logs exist only in this local filesystem because the target is not a Git worktree.",
    };
  }

  const trackedOutput = gitOutput(root, ["ls-files", "--", ".agrimap-agent/logs"]);
  const tracked = new Set(trackedOutput.stdout.split(/\r?\n/).filter(Boolean).map((file) => file.replace(/\\/g, "/")));
  const ignoredOutput = relativeLogs.length
    ? gitOutput(root, ["check-ignore", "--stdin"], { input: `${relativeLogs.join("\n")}\n` })
    : { stdout: "" };
  const ignored = new Set(ignoredOutput.stdout.split(/\r?\n/).filter(Boolean).map((file) => file.replace(/\\/g, "/")));
  const workingTree = gitOutput(root, ["status", "--porcelain=v1", "--", ".agrimap-agent/logs"]);
  const workingTreeChanges = workingTree.stdout.split(/\r?\n/).filter(Boolean);
  const trackedCount = relativeLogs.filter((file) => tracked.has(file)).length;
  const ignoredCount = relativeLogs.filter((file) => ignored.has(file)).length;
  const allTracked = relativeLogs.length > 0 && trackedCount === relativeLogs.length;
  const recoverableFromCurrentCommit = allTracked && workingTreeChanges.length === 0;

  let status = "no-logs";
  if (relativeLogs.length > 0 && allTracked) status = recoverableFromCurrentCommit ? "tracked-clean" : "tracked-with-working-tree-changes";
  else if (trackedCount > 0) status = "partially-tracked";
  else if (ignoredCount > 0) status = "local-only-ignored";
  else if (relativeLogs.length > 0) status = "untracked";

  const notes = {
    "no-logs": "No durable audit log files exist yet.",
    "tracked-clean": "All audit logs are present in the current Git commit; remote/team recovery still depends on pushing that commit.",
    "tracked-with-working-tree-changes": "Audit logs are tracked but have staged or unstaged changes that are not fully recoverable from the current commit.",
    "partially-tracked": "Only some audit logs are tracked; history is incomplete for another clone.",
    "local-only-ignored": "Audit logs are ignored by Git and will not be available in another clone or to teammates.",
    untracked: "Audit logs are not ignored, but they have not been added to Git and are local-only.",
  };
  return {
    status,
    gitRepository: true,
    logFileCount: relativeLogs.length,
    trackedCount,
    ignoredCount,
    workingTreeChanges,
    recoverableFromCurrentCommit,
    note: notes[status],
  };
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
  if (/^unresolved\.?$/i.test(normalized)) return "unresolved-placeholder";
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

function optionalMarkdownField(content, label) {
  const value = plainMarkdownValue(markdownField(content, label));
  return value && !/^not recorded$/i.test(value) ? value : null;
}

async function taskAuditIdentity(taskPath) {
  const brief = await readFile(path.join(taskPath, "brief.md"), "utf8").catch(() => "");
  return {
    requestedBy: optionalMarkdownField(brief, "Requested by"),
    requesterId: optionalMarkdownField(brief, "Requester ID"),
    identitySource: optionalMarkdownField(brief, "Identity source"),
    request: optionalMarkdownField(brief, "Objective"),
    sessionId: optionalMarkdownField(brief, "Session"),
    workflowDepth: optionalMarkdownField(brief, "Workflow depth"),
  };
}

async function priorPassedQaRuns(state, currentTaskId, coverageKey) {
  const normalizedCoverageKey = String(coverageKey || "").trim().toLowerCase();
  if (!normalizedCoverageKey) return [];
  const completedAt = new Map();
  const logFiles = (await filesUnder(path.join(state, "logs"))).filter((file) => file.endsWith(".jsonl"));
  for (const file of logFiles) {
    for (const line of (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean)) {
      try {
        const event = JSON.parse(line);
        if (event.taskId === currentTaskId || event.event !== "completed" || auditEventIssues(event).length > 0) continue;
        const timestamp = Date.parse(event.timestamp);
        if (Number.isFinite(timestamp) && timestamp > (completedAt.get(event.taskId) || 0)) completedAt.set(event.taskId, timestamp);
      } catch {
        // Invalid audit lines cannot establish prior completion or QA counter state.
      }
    }
  }

  const runs = [];
  for (const [taskId, timestamp] of completedAt) {
    const qa = await readFile(path.join(state, "tasks", taskId, "qa.md"), "utf8").catch(() => "");
    if (plainMarkdownValue(markdownField(qa, "Status")).toLowerCase() !== "passed") continue;
    if (plainMarkdownValue(markdownField(qa, "Coverage key")).toLowerCase() !== normalizedCoverageKey) continue;
    const mode = plainMarkdownValue(markdownField(qa, "QA mode")).toLowerCase();
    if (!new Set(["fast", "full"]).has(mode)) continue;
    runs.push({ taskId, timestamp, mode });
  }
  return runs.sort((left, right) => left.timestamp - right.timestamp || left.taskId.localeCompare(right.taskId));
}

async function validate(root, args) {
  const state = path.join(root, ".agrimap-agent");
  const taskId = safeTaskId(args.task);
  if (!taskId) return { ok: false, message: "--task is required." };
  const taskPath = path.join(state, "tasks", taskId);
  const artifactDefinitions = taskArtifactSchema.artifacts || {};
  const briefPreview = await readFile(path.join(taskPath, "brief.md"), "utf8").catch(() => "");
  const workflowDepth = String(args.depth || args["workflow-depth"] || optionalMarkdownField(briefPreview, "Workflow depth") || "regulated").toLowerCase();
  if (!TRACKED_WORKFLOW_DEPTHS.has(workflowDepth)) {
    return { ok: false, taskId, workflowDepth, contentFailures: [{ file: "brief.md", field: "Workflow depth", reason: "invalid-enum" }] };
  }
  const required = Object.entries(artifactDefinitions)
    .filter(([, definition]) => definition.requiredForCompletion && (definition.requiredForDepths || []).includes(workflowDepth))
    .map(([file]) => file);
  const missing = [];
  for (const file of required) {
    if (!(await exists(path.join(taskPath, file)))) missing.push(file);
  }

  const artifacts = {};
  for (const file of required) {
    artifacts[file] = await readFile(path.join(taskPath, file), "utf8").catch(() => "");
  }
  const brief = artifacts["brief.md"] || "";
  const checklist = artifacts["checklist.md"] || "";
  const qa = artifacts["qa.md"] || "";
  const result = artifacts["result.md"] || "";
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

  const artifactFields = {};
  let checklistItems = [];
  let unchecked = [];
  for (const [file, definition] of Object.entries(artifactDefinitions)) {
    if (!required.includes(file)) continue;
    const content = artifacts[file] || "";
    artifactFields[file] = {};
    for (const field of definition.requiredFields || []) {
      const value = requireField(file, content, field.label);
      artifactFields[file][field.label] = value;
      const normalized = value.toLowerCase();
      if (field.enum && !field.enum.map((item) => String(item).toLowerCase()).includes(normalized)) {
        contentFailures.push({ file, field: field.label, reason: "invalid-enum" });
      }
      if (field.const !== undefined && normalized !== String(field.const).toLowerCase()) {
        contentFailures.push({ file, field: field.label, reason: "const-mismatch" });
      }
    }
    for (const heading of definition.requiredSections || []) requireSection(file, content, heading);
    for (const [fieldLabel, cases] of Object.entries(definition.requiredSectionsByField || {})) {
      const selected = String(artifactFields[file][fieldLabel] || "").toLowerCase();
      for (const heading of cases[selected] || []) requireSection(file, content, heading);
    }
    if (definition.kind === "checklist") {
      checklistItems = content.split(/\r?\n/)
        .map((line) => line.match(/^\s*- \[([ xX])\]\s*(.*?)\s*$/))
        .filter(Boolean);
      unchecked = content.split(/\r?\n/).filter((line) => /^\s*- \[ \]/.test(line));
      if (checklistItems.length < Number(definition.minimumItems || 1)) {
        contentFailures.push({ file, field: "checkboxes", reason: "missing" });
      }
      for (const item of checklistItems) {
        const reason = placeholderValueReason(item[2]);
        if (reason) contentFailures.push({ file, field: "checkbox", reason });
      }
    }
  }

  const rules = taskArtifactSchema.crossArtifactRules || {};
  const regulated = workflowDepth === String(rules.regulatedDepth || "regulated");
  const artifactTaskId = artifactFields["brief.md"]?.[rules.taskIdField] || "";
  if (artifactTaskId !== taskId) contentFailures.push({ file: "brief.md", field: rules.taskIdField, reason: "task-id-mismatch" });
  const requestedBy = artifactFields["brief.md"]?.[rules.requesterField] || "";
  const decisionOwner = artifactFields["brief.md"]?.[rules.decisionOwnerField] || "";
  const briefWorkflowDepth = String(artifactFields["brief.md"]?.[rules.workflowDepthField] || "").toLowerCase();
  const resultWorkflowDepth = String(artifactFields["result.md"]?.[rules.workflowDepthField] || "").toLowerCase();
  if (briefWorkflowDepth !== workflowDepth) contentFailures.push({ file: "brief.md", field: rules.workflowDepthField, reason: "depth-mismatch" });
  if (resultWorkflowDepth !== workflowDepth) contentFailures.push({ file: "result.md", field: rules.workflowDepthField, reason: "depth-mismatch" });
  const qaStatus = String(artifactFields["qa.md"]?.[rules.qaStatusField] || "").toLowerCase();
  const qaMode = String(artifactFields["qa.md"]?.[rules.qaModeField] || "").toLowerCase();
  const qaAccepted = regulated ? (rules.acceptedQaStatuses || []).includes(qaStatus) : true;
  if (regulated && !qaAccepted) contentFailures.push({ file: "qa.md", field: rules.qaStatusField, reason: "not-accepted" });
  const patterns = artifactFields["qa.md"]?.[rules.patternField] || "";
  if (regulated && /^none(?:\s+applicable)?\.?$/i.test(patterns)) {
    contentFailures.push({ file: "qa.md", field: rules.patternField, reason: "none-requires-reason" });
  }

  for (const file of [...(regulated ? ["qa.md"] : []), "result.md"]) {
    const artifactRequester = artifactFields[file]?.[rules.requesterField] || "";
    if (requestedBy && artifactRequester && requestedBy !== artifactRequester) {
      contentFailures.push({ file, field: rules.requesterField, reason: "requester-mismatch" });
    }
    const artifactDecisionOwner = artifactFields[file]?.[rules.decisionOwnerField] || "";
    if (decisionOwner && artifactDecisionOwner && decisionOwner !== artifactDecisionOwner) {
      contentFailures.push({ file, field: rules.decisionOwnerField, reason: "decision-owner-mismatch" });
    }
  }

  const qaIdentity = (rules.qaIdentityFields || []).map((label) => String(artifactFields["qa.md"]?.[label] || "").toLowerCase());
  const implementationIdentity = (rules.implementationIdentityFields || []).map((label) => String(artifactFields["qa.md"]?.[label] || "").toLowerCase());
  if (regulated && qaStatus === "passed" && qaIdentity.length && qaIdentity.every((value, index) => value === implementationIdentity[index])) {
    contentFailures.push({ file: "qa.md", field: "QA identity", reason: "not-independent" });
  }

  const fastSequence = String(artifactFields["qa.md"]?.[rules.fastSequenceField] || "");
  if (regulated && qaMode === "full" && fastSequence !== String(rules.fullFastSequence)) {
    contentFailures.push({ file: "qa.md", field: rules.fastSequenceField, reason: "full-must-reset-counter" });
  }
  if (regulated && qaMode === "fast" && !(rules.fastAllowedSequences || []).map(String).includes(fastSequence)) {
    contentFailures.push({ file: "qa.md", field: rules.fastSequenceField, reason: "fast-sequence-limit" });
  }
  const coverageKey = artifactFields["qa.md"]?.[rules.coverageKeyField] || "";
  const priorQaRuns = regulated ? await priorPassedQaRuns(state, taskId, coverageKey) : [];
  let priorConsecutiveFast = 0;
  for (const run of priorQaRuns) priorConsecutiveFast = run.mode === "full" ? 0 : priorConsecutiveFast + 1;
  const expectedFastSequence = priorConsecutiveFast + 1;
  if (regulated && qaMode === "fast" && priorConsecutiveFast >= (rules.fastAllowedSequences || []).length) {
    contentFailures.push({ file: "qa.md", field: rules.qaModeField, reason: "historical-full-required" });
  } else if (regulated && qaMode === "fast" && fastSequence !== String(expectedFastSequence)) {
    contentFailures.push({ file: "qa.md", field: rules.fastSequenceField, reason: "historical-sequence-mismatch" });
  }

  const resultQaStatus = String(artifactFields["result.md"]?.[rules.resultQaStatusField] || "").toLowerCase();
  if (regulated && (!qaAccepted || resultQaStatus !== qaStatus)) {
    contentFailures.push({ file: "result.md", field: rules.resultQaStatusField, reason: "qa-status-mismatch" });
  } else if (!regulated && resultQaStatus !== "not-applicable") {
    contentFailures.push({ file: "result.md", field: rules.resultQaStatusField, reason: "standard-requires-not-applicable" });
  }
  const resultQaMode = String(artifactFields["result.md"]?.[rules.resultQaModeField] || "").toLowerCase();
  if (regulated && resultQaMode !== qaMode) contentFailures.push({ file: "result.md", field: rules.resultQaModeField, reason: "qa-mode-mismatch" });
  if (!regulated && resultQaMode !== "not-applicable") contentFailures.push({ file: "result.md", field: rules.resultQaModeField, reason: "standard-requires-not-applicable" });
  const deliveryBoundary = String(artifactFields["result.md"]?.[rules.deliveryBoundaryField] || "").toLowerCase();
  if (!regulated && (rules.fullQaBoundaries || []).includes(deliveryBoundary)) {
    contentFailures.push({ file: "result.md", field: rules.deliveryBoundaryField, reason: "requires-regulated-depth" });
  } else if (regulated && (rules.fullQaBoundaries || []).includes(deliveryBoundary) && qaMode !== "full") {
    contentFailures.push({ file: "result.md", field: rules.deliveryBoundaryField, reason: "requires-full-qa" });
  }

  const memoryRecorded = await exists(path.join(state, "memory", "current", `${taskId}.md`))
    || await exists(path.join(state, "memory", "recent", `${taskId}.md`));
  const logFiles = (await filesUnder(path.join(state, "logs"))).filter((file) => file.endsWith(".jsonl"));
  let taskLogged = false;
  let createdRequestRecorded = false;
  const auditFailures = [];
  for (const file of logFiles) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean);
    const source = path.relative(root, file).replace(/\\/g, "/");
    const belongsToTask = path.basename(file) === `${taskId}.jsonl`;
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
      const line = lines[lineNumber];
      try {
        const event = JSON.parse(line);
        if (event.taskId !== taskId) continue;
        if (event.requestedBy) taskLogged = true;
        if (event.event === "created" && eventRequest(event)) createdRequestRecorded = true;
        if (Number(event.schemaVersion) >= 1) {
          for (const issue of auditEventIssues(event)) auditFailures.push({ source, line: lineNumber + 1, ...issue });
          if (requestedBy && event.requestedBy && requestedBy !== event.requestedBy) {
            auditFailures.push({ source, line: lineNumber + 1, field: "requestedBy", reason: "task-brief-mismatch" });
          }
        }
      } catch {
        if (belongsToTask) auditFailures.push({ source, line: lineNumber + 1, field: "json", reason: "invalid" });
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
      && createdRequestRecorded
      && auditFailures.length === 0
      && Boolean(requestedBy)
      && memoryRecorded,
    taskId,
    missing,
    unchecked,
    checklistItems: checklistItems.length,
    placeholderFailures,
    contentFailures,
    qaAccepted,
    workflowDepth,
    qaCounter: {
      coverageKey,
      priorPassedRuns: priorQaRuns,
      priorConsecutiveFast,
      expectedFastSequence,
    },
    taskLogged,
    createdRequestRecorded,
    auditFailures,
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
  const matches = [];
  for (const file of await readdir(activeDirectory).catch(() => [])) {
    if (!file.endsWith(".json")) continue;
    const candidatePath = path.join(activeDirectory, file);
    const candidate = await readJson(candidatePath).catch(() => null);
    if (candidate?.taskId === taskId) matches.push({ active: candidate, activePath: candidatePath });
  }
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return { ambiguous: true, matches };
}

function activeTaskAmbiguityError(taskId, matches) {
  return {
    ok: false,
    code: "AMBIGUOUS_ACTIVE_TASK",
    needsSession: true,
    taskId,
    sessions: matches.map(({ active, activePath }) => ({
      sessionId: active?.sessionId || path.basename(activePath, ".json"),
      requestedBy: active?.requestedBy || null,
      activePath: activePath.replace(/\\/g, "/"),
    })),
    message: "Multiple sessions have this task active; pass --session so requester and execution attribution cannot be inherited from the wrong session.",
  };
}

async function complete(root, args) {
  const taskId = safeTaskId(args.task);
  const validation = await validate(root, { ...args, task: taskId });
  if (!validation.ok) return validation;

  const state = path.join(root, ".agrimap-agent");
  const taskPath = path.join(state, "tasks", taskId);
  const activeMatch = await findActiveForTask(state, taskId, safeSessionId(args.session));
  if (activeMatch?.ambiguous) return activeTaskAmbiguityError(taskId, activeMatch.matches);
  const taskIdentity = await taskAuditIdentity(taskPath);
  const requestedBy = activeMatch?.active?.requestedBy || taskIdentity.requestedBy;
  const execution = executionIdentity(args, activeMatch?.active || {});
  const files = await recordedTaskFiles(state, taskId);

  await copyFile(path.join(taskPath, "result.md"), path.join(state, "memory", "recent", `${taskId}.md`));
  await rm(path.join(state, "memory", "current", `${taskId}.md`), { force: true });
  if (activeMatch) await rm(activeMatch.activePath, { force: true });
  const prompts = await archivePrompts(state, taskId);
  await appendLog(state, {
    taskId,
    requestedBy,
    requesterId: activeMatch?.active?.requesterId || taskIdentity.requesterId || null,
    identitySource: activeMatch?.active?.identitySource || taskIdentity.identitySource || "legacy-migrated",
    ...execution,
    workflowDepth: validation.workflowDepth,
    event: "completed",
    summary: "Task passed its completion gate.",
    reason: validation.workflowDepth === "regulated"
      ? "Checklist, regulated QA, memory, and milestone logs are complete."
      : "Checklist, proportional verification, memory, and milestone logs are complete.",
    files,
    verification: prompts.moved
      ? ["agm-workspace validate: passed", `prompts archived: ${prompts.destination}`]
      : ["agm-workspace validate: passed"],
  });
  return { ok: true, taskId, requestedBy, archived: `memory/recent/${taskId}.md`, prompts };
}

async function closeTask(root, args) {
  const taskId = safeTaskId(args.task);
  const status = String(args.status || "").trim();
  const allowed = new Set([QA_FAILED_EVENT, "blocked", "cancelled"]);
  if (!taskId || !allowed.has(status)) {
    return { ok: false, message: `--task and --status ${QA_FAILED_EVENT}|blocked|cancelled are required.` };
  }

  const state = path.join(root, ".agrimap-agent");
  const taskPath = path.join(state, "tasks", taskId);
  const resultPath = path.join(taskPath, "result.md");
  if (!(await exists(resultPath))) return { ok: false, message: "result.md is required before closing a non-complete task." };

  const qaPath = path.join(taskPath, "qa.md");
  if (status === QA_FAILED_EVENT) {
    const qa = await readFile(qaPath, "utf8").catch(() => "");
    const result = await readFile(resultPath, "utf8");
    const nextPrompt = String(args.nextPrompt || args["next-prompt"] || "").trim();
    const nextPromptPath = nextPrompt ? path.resolve(root, nextPrompt) : "";
    const promptsRoot = path.resolve(state, "prompts");
    const promptRelative = nextPromptPath ? path.relative(promptsRoot, nextPromptPath) : "";
    if (!/^\s*(?:-\s*)?Status:\s*failed\s*$/im.test(qa)) {
      return { ok: false, message: `qa.md must record Status: failed before closing as ${QA_FAILED_EVENT}.` };
    }
    if (!new RegExp(`Outcome:\\s*\`?${QA_FAILED_EVENT}\`?`, "i").test(result)) {
      return { ok: false, message: `result.md must record Outcome: ${QA_FAILED_EVENT}.` };
    }
    if (!nextPromptPath || promptRelative.startsWith("..") || path.isAbsolute(promptRelative) || !(await exists(nextPromptPath))) {
      return { ok: false, message: "--next-prompt must point to an existing file under .agrimap-agent/prompts/." };
    }
  }

  const activeMatch = await findActiveForTask(state, taskId, safeSessionId(args.session));
  if (activeMatch?.ambiguous) return activeTaskAmbiguityError(taskId, activeMatch.matches);
  const taskIdentity = await taskAuditIdentity(taskPath);
  const requestedBy = activeMatch?.active?.requestedBy || taskIdentity.requestedBy;
  if (!requestedBy) return { ok: false, needsRequester: true, message: "Requester is missing from the task brief." };
  const execution = executionIdentity(args, activeMatch?.active || {});
  const files = await recordedTaskFiles(state, taskId);

  await copyFile(resultPath, path.join(state, "memory", "recent", `${taskId}.md`));
  await rm(path.join(state, "memory", "current", `${taskId}.md`), { force: true });
  if (activeMatch) await rm(activeMatch.activePath, { force: true });
  const prompts = await archivePrompts(state, taskId);
  await appendLog(state, {
    taskId,
    requestedBy,
    requesterId: activeMatch?.active?.requesterId || taskIdentity.requesterId || null,
    identitySource: activeMatch?.active?.identitySource || taskIdentity.identitySource || "legacy-migrated",
    ...execution,
    workflowDepth: activeMatch?.active?.workflowDepth || taskIdentity.workflowDepth || "regulated",
    event: status,
    summary: `Task closed as ${status}; it did not pass the completion gate.`,
    reason: String(args.reason || "Closed without claiming completion."),
    files,
    verification: [
      ...(status === QA_FAILED_EVENT ? [`QA failed; next prompt: ${args.nextPrompt || args["next-prompt"]}`] : []),
      ...(prompts.moved ? [`prompts archived: ${prompts.destination}`] : []),
    ],
  });
  return {
    ok: true,
    taskId,
    requestedBy,
    status,
    complete: false,
    archived: `memory/recent/${taskId}.md`,
    prompts,
    nextPrompt: status === QA_FAILED_EVENT ? args.nextPrompt || args["next-prompt"] : null,
  };
}

function auditBoundary(value, kind) {
  const raw = String(value || "").trim();
  if (!raw) return { value: null };
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = Date.parse(`${raw}T00:00:00.000Z`);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== raw) {
      return { error: `${kind} must be a valid YYYY-MM-DD date or ISO 8601 timestamp.` };
    }
    return { value: kind === "to" ? parsed + 86_400_000 : parsed, bareDate: true };
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)) {
    return { error: `${kind} timestamp must be ISO 8601 with Z or an explicit UTC offset.` };
  }
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return { error: `${kind} must be a valid YYYY-MM-DD date or ISO 8601 timestamp.` };
  return { value: kind === "to" ? parsed + 1 : parsed, bareDate: false };
}

function displayIso(value) {
  return Number.isFinite(value) ? new Date(value).toISOString() : null;
}

function eventRequest(event) {
  return String(event.request || (event.event === "created" ? event.reason : "") || "").trim() || null;
}

async function history(root, args) {
  const state = path.join(root, ".agrimap-agent");
  const fromInput = auditBoundary(args.from, "from");
  const toInput = auditBoundary(args.to, "to");
  if (fromInput.error || toInput.error) {
    return { ok: false, code: "INVALID_TIME_RANGE", message: fromInput.error || toInput.error };
  }

  let fromMs = fromInput.value;
  let toExclusiveMs = toInput.value;
  const daysRaw = args.days;
  let days = null;
  if (daysRaw !== undefined) {
    days = Number(daysRaw);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      return { ok: false, code: "INVALID_DAYS", message: "--days must be an integer from 1 to 3650." };
    }
    const end = Date.now() + 1;
    if (toExclusiveMs === null) toExclusiveMs = end;
    if (fromMs === null) fromMs = toExclusiveMs - days * 86_400_000;
  }
  if (fromMs !== null && toExclusiveMs !== null && fromMs >= toExclusiveMs) {
    return { ok: false, code: "INVALID_TIME_RANGE", message: "The start of the time range must be before its end." };
  }

  const requesterFilter = String(args.requester || args.owner || "").trim();
  const requesterIdFilter = String(args.requesterId || args["requester-id"] || "").trim();
  const taskFilter = safeTaskId(args.task);
  const eventFilter = String(args.event || "").trim();
  if (eventFilter && !isLogEvent(eventFilter)) return logEventError(eventFilter);

  const logFiles = (await filesUnder(path.join(state, "logs")))
    .filter((file) => file.endsWith(".jsonl"))
    .sort((a, b) => a.localeCompare(b));
  const allEvents = [];
  const invalidLines = [];
  for (const file of logFiles) {
    const source = path.relative(root, file).replace(/\\/g, "/");
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (!lines[index].trim()) continue;
      try {
        const event = JSON.parse(lines[index]);
        const timestampMs = Date.parse(event.timestamp);
        if (!Number.isFinite(timestampMs)) {
          invalidLines.push({ source, line: index + 1, reason: "invalid-or-missing-timestamp" });
          continue;
        }
        const versioned = Object.hasOwn(event, "schemaVersion");
        if (versioned) {
          const issues = auditEventIssues(event);
          for (const issue of issues) {
            invalidLines.push({ source, line: index + 1, reason: `audit-${issue.field}-${issue.reason}` });
          }
          if (issues.length > 0) continue;
        }
        allEvents.push({
          ...event,
          source,
          line: index + 1,
          timestampMs,
          timestampUtc: new Date(timestampMs).toISOString(),
          evidenceLevel: versioned ? "versioned-workflow-log" : "legacy-unverified",
        });
      } catch {
        invalidLines.push({ source, line: index + 1, reason: "invalid-json" });
      }
    }
  }
  allEvents.sort((a, b) => a.timestampMs - b.timestampMs || a.source.localeCompare(b.source) || a.line - b.line);

  const filtered = allEvents.filter((event) => {
    if (fromMs !== null && event.timestampMs < fromMs) return false;
    if (toExclusiveMs !== null && event.timestampMs >= toExclusiveMs) return false;
    if (requesterFilter && String(event.requestedBy || "").localeCompare(requesterFilter, undefined, { sensitivity: "accent" }) !== 0) return false;
    if (requesterIdFilter && String(event.requesterId || "") !== requesterIdFilter) return false;
    if (taskFilter && event.taskId !== taskFilter) return false;
    if (eventFilter && event.event !== eventFilter) return false;
    return true;
  });

  const requesterMap = new Map();
  for (const event of filtered) {
    const requestedBy = String(event.requestedBy || "Unknown requester");
    const key = event.requesterId
      ? `id:${event.requesterId}`
      : `name:${requestedBy.toLocaleLowerCase()}`;
    const entry = requesterMap.get(key) || {
      requestedBy,
      requesterIds: new Set(),
      eventCount: 0,
      taskIds: new Set(),
      firstAt: event.timestampUtc,
      lastAt: event.timestampUtc,
    };
    if (event.requesterId) entry.requesterIds.add(event.requesterId);
    entry.eventCount += 1;
    if (event.taskId) entry.taskIds.add(event.taskId);
    entry.lastAt = event.timestampUtc;
    requesterMap.set(key, entry);
  }

  const taskIds = [...new Set(filtered.map((event) => event.taskId).filter(Boolean))];
  const tasks = [];
  for (const taskId of taskIds) {
    const matching = filtered.filter((event) => event.taskId === taskId);
    const completeHistory = allEvents.filter((event) => event.taskId === taskId);
    const versionedHistory = completeHistory.filter((event) => event.evidenceLevel === "versioned-workflow-log");
    const legacyHistory = completeHistory.filter((event) => event.evidenceLevel === "legacy-unverified");
    const attributionHistory = versionedHistory.filter((event) => !TERMINAL_AUDIT_EVENTS.has(event.event));
    const created = versionedHistory.find((event) => event.event === "created")
      || completeHistory.find((event) => event.event === "created")
      || completeHistory[0];
    const recordedFiles = [...new Set(attributionHistory.flatMap((event) => Array.isArray(event.files) ? event.files : [])
      .map((file) => typeof file === "string" ? file.trim() : "").filter(Boolean))];
    const legacyClaimedFiles = [...new Set(legacyHistory.flatMap((event) => Array.isArray(event.files) ? event.files : [])
      .map((file) => typeof file === "string" ? file.trim() : "").filter(Boolean))];
    const gitHeads = [...new Set(versionedHistory.map((event) => event.gitHead).filter(Boolean))];
    const legacyActors = [...new Set(legacyHistory.map((event) => String(event.actor || "").trim()).filter(Boolean))];
    const executorMap = new Map();
    for (const event of versionedHistory) {
      if (![event.model, event.role, event.agent, event.provider].some((value) => String(value || "").trim())) continue;
      const executor = {
        model: String(event.model || "unknown"),
        modelLabel: String(event.modelLabel || "not-recorded"),
        role: String(event.role || "unknown"),
        agent: String(event.agent || "unknown"),
        provider: String(event.provider || "unknown"),
      };
      const key = `${executor.model}\u0000${executor.modelLabel}\u0000${executor.role}\u0000${executor.agent}\u0000${executor.provider}`;
      const existing = executorMap.get(key) || { ...executor, eventCount: 0, firstAt: event.timestampUtc, lastAt: event.timestampUtc };
      existing.eventCount += 1;
      existing.lastAt = event.timestampUtc;
      executorMap.set(key, existing);
    }
    const taskPath = path.join(state, "tasks", taskId);
    const briefIdentity = await taskAuditIdentity(taskPath);
    const artifactCandidates = {
      brief: path.join(taskPath, "brief.md"),
      checklist: path.join(taskPath, "checklist.md"),
      qa: path.join(taskPath, "qa.md"),
      result: path.join(taskPath, "result.md"),
      currentMemory: path.join(state, "memory", "current", `${taskId}.md`),
      recentMemory: path.join(state, "memory", "recent", `${taskId}.md`),
    };
    const artifacts = {};
    for (const [name, file] of Object.entries(artifactCandidates)) {
      artifacts[name] = await exists(file) ? path.relative(root, file).replace(/\\/g, "/") : null;
    }
    artifacts.logSources = [...new Set(completeHistory.map((event) => event.source))];
    tasks.push({
      taskId,
      requestedBy: created?.requestedBy || briefIdentity.requestedBy || null,
      requesterId: created?.requesterId || briefIdentity.requesterId || null,
      identitySource: created?.identitySource || briefIdentity.identitySource || null,
      request: eventRequest(created || {}) || briefIdentity.request || null,
      firstAt: matching[0]?.timestampUtc || null,
      lastAt: matching.at(-1)?.timestampUtc || null,
      eventCount: matching.length,
      events: [...new Set(matching.map((event) => event.event))],
      recordedFiles,
      legacyClaimedFiles,
      executors: [...executorMap.values()],
      legacyActors,
      gitHeads,
      artifacts,
    });
  }

  const events = filtered.map(({ timestampMs, ...event }) => event);
  const auditStorage = auditStorageStatus(root, logFiles);
  const versionedEventCount = allEvents.filter((event) => event.evidenceLevel === "versioned-workflow-log").length;
  const legacyEventCount = allEvents.length - versionedEventCount;
  return {
    ok: true,
    timeBasis: "UTC",
    timestampSemantics: "events[].timestamp preserves the recorded value; events[].timestampUtc, requester/task ranges, and filters use normalized UTC.",
    rangeSemantics: "--from is inclusive; --to YYYY-MM-DD includes the whole UTC date; --days is a rolling 24-hour window.",
    attributionSemantics: {
      requestedBy: "Confirmed human who requested the task; not proof of who edited or committed files.",
      executionIdentity: "Actual model, optional configurable model label, role, agent, and provider recorded by the workflow event.",
      recordedFiles: "Paths claimed by valid versioned non-terminal workflow events; not filesystem or Git authorship proof.",
      legacyClaimedFiles: "Paths found only in unversioned legacy events; visible for diagnosis but never promoted into versioned attribution or closure events.",
      gitContext: "gitHead/gitDirty describe repository state when a versioned event was appended; use Git history/blame separately for commit authorship.",
      integrity: "Project-controlled JSONL is not cryptographically tamper-evident; inspect Git history or an external audit system when adversarial integrity matters.",
    },
    auditStorage,
    evidence: {
      versionedEventCount,
      legacyEventCount,
      invalidLineCount: invalidLines.length,
      includedEventCount: allEvents.length,
    },
    filters: {
      requester: requesterFilter || null,
      requesterId: requesterIdFilter || null,
      taskId: taskFilter || null,
      event: eventFilter || null,
      from: displayIso(fromMs),
      toExclusive: displayIso(toExclusiveMs),
      days,
    },
    count: events.length,
    requesters: [...requesterMap.values()].map((entry) => ({
      ...entry,
      requesterIds: [...entry.requesterIds],
      taskIds: [...entry.taskIds],
    })),
    tasks,
    events,
    invalidLines,
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
  case "history":
    result = await history(root, args);
    break;
  case "prune":
    result = await prune(root);
    break;
  default:
    result = { ok: false, message: "Use init, identify, start, checkpoint, validate, complete, close, history, or prune." };
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
