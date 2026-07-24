#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCliArgs } from "./cli-args.mjs";
import { normalizeIdentity } from "./identity.mjs";
import { AGRIMAP_OPERATION_ALIASES, AGRIMAP_ROUTER_ALIAS } from "./operation-aliases.mjs";

const AGRIMAP_PROJECT_PATTERNS = Object.freeze([
  /^agmwa-[a-z]+(?:-[a-z]+)*-ng$/i,
  /^agm(?:ws|bo)-[a-z]+(?:-[a-z]+)*-netcore$/i,
  /^agrimap-[a-z]+(?:-[a-z]+)*$/i,
  /^agrimap\.[a-z]+(?:\.[a-z]+)*$/i,
]);

const EXPLICIT_SKILL_ALIASES = Object.freeze([
  AGRIMAP_ROUTER_ALIAS,
  ...AGRIMAP_OPERATION_ALIASES,
]);

const EXPLICIT_SKILL_ALTERNATION = EXPLICIT_SKILL_ALIASES.map(escapeRegex).join("|");
const EXPLICIT_SKILL_PATTERNS = Object.freeze({
  codex: new RegExp(`(?:^|\\s)\\$(?:${EXPLICIT_SKILL_ALTERNATION})(?=$|\\s)`, "i"),
  claude: new RegExp(`(?:^|\\s)/agrimap-agent-skills:(?:${EXPLICIT_SKILL_ALTERNATION})(?=$|\\s)`, "i"),
  gemini: new RegExp(`(?:^|\\s)/(?:${EXPLICIT_SKILL_ALTERNATION})(?=$|\\s)`, "i"),
});

const SQL_META_INTENT_PATTERN = /\bagm-sql\b|\b(?:skill|plugin|package|hook|routing|router)s?\b|(?:สกิล|ปลั๊กอิน|แพ็กเกจ|ฮุก|ไม่ใช้\s*(?:skill|agm-sql))/iu;
const SQL_ACTION_PATTERN = /\b(?:create|add|write|generate|edit|modify|update|change|fix|refactor|analy[sz]e|explain|review|inspect)\b|(?:สร้าง|เพิ่ม|เขียน|แก้ไข|แก้|ปรับ|รีแฟกเตอร์|วิเคราะห์|อธิบาย|ตรวจ)/iu;
const SQL_TARGET_PATTERN = /(?:\.sql\b|\b(?:sql|t-?sql|stored\s+procedure|procedure|ddl|dml)\b|(?:เอสคิวแอล|สโตร์ดโปรซีเยอร์|โปรซีเยอร์))/iu;
const SQL_DEFINITION_PATTERN = /\b(?:create|alter|drop)\s+(?:table|view|procedure|function|trigger|index)\b|(?:สร้าง|แก้ไข|ปรับ)\s*(?:ตาราง|วิว|โปรซีเยอร์)/iu;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function workspaceRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return cwd;
  }
}

function remoteRepositoryName(cwd) {
  try {
    const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const tail = remote.replace(/[\\/]+$/, "").split(/[\\/:]/).filter(Boolean).at(-1) || "";
    return tail.replace(/\.git$/i, "");
  } catch {
    return "";
  }
}

function recognizedProjectName(value) {
  const name = String(value || "").trim();
  return Boolean(name) && AGRIMAP_PROJECT_PATTERNS.some((pattern) => pattern.test(name));
}

function explicitSkillInvocation(provider, prompt) {
  const value = String(prompt || "");
  const pattern = EXPLICIT_SKILL_PATTERNS[provider];
  const adapterMarker = new RegExp(`(?:^|\\s)AGRIMAP_EXPLICIT_ALIAS=(?:${EXPLICIT_SKILL_ALTERNATION})(?=$|\\s)`, "i");
  return Boolean(value) && ((Boolean(pattern) && pattern.test(value)) || adapterMarker.test(value));
}

function primarySqlProductIntent(prompt) {
  const value = String(prompt || "").trim();
  if (!value || SQL_META_INTENT_PATTERN.test(value)) return false;
  if (SQL_DEFINITION_PATTERN.test(value)) return true;
  return SQL_ACTION_PATTERN.test(value) && SQL_TARGET_PATTERN.test(value);
}

function projectActivation(cwd, config) {
  if (config?.activation?.auto === true) return { active: true, reason: "config-opt-in" };
  const rootName = path.basename(cwd);
  if (recognizedProjectName(rootName)) return { active: true, reason: `project-name:${rootName}` };
  const remoteName = remoteRepositoryName(cwd);
  return recognizedProjectName(remoteName)
    ? { active: true, reason: `remote-name:${remoteName}` }
    : { active: false, reason: "not-agrimap" };
}

function safeSessionId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function zonedParts(timestamp = new Date().toISOString(), timeZone = "Asia/Bangkok") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    period: `${value.year}-${value.month}`,
    date: `${value.year}-${value.month}-${value.day}`,
    time: `${value.hour}:${value.minute}:${value.second}`,
    runId: `${value.day}${value.hour}${value.minute}${value.second}`,
  };
}

async function archiveRawPrompt(stateRoot, config, input) {
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  const eventName = input.hook_event_name || input.hookEventName || "";
  if (eventName !== "UserPromptSubmit" || !prompt) return null;
  const timestamp = new Date().toISOString();
  const local = zonedParts(timestamp, config?.timeZone || "Asia/Bangkok");
  const conversationId = safeSessionId(
    input.session_id || input.sessionId || input.conversation_id || input.conversationId || input.context_id || input.contextId || input.room_id || input.roomId,
  ) || "unscoped";
  const promptPath = path.join(stateRoot, "prompts", local.period, conversationId, "history.md");
  await mkdir(path.dirname(promptPath), { recursive: true });
  await appendFile(promptPath, `### [${local.date} ${local.time}]\n${prompt}\n\n`, "utf8");
  return path.relative(stateRoot, promptPath).replace(/\\/g, "/");
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function readText(filePath, limit = 7000) {
  try {
    const value = await readFile(filePath, "utf8");
    return value.length > limit
      ? `${value.slice(0, limit)}\n[context truncated by hook; read the file directly]`
      : value;
  } catch {
    return "";
  }
}

async function isSkillPackageRepository(cwd) {
  const [manifest, operations, lifecycle] = await Promise.all([
    readJson(path.join(cwd, "package.json")),
    readJson(path.join(cwd, "config", "operations.json")),
    readText(path.join(cwd, "skills", "agrimap-agent-skills", "references", "lifecycle-core.md"), 200),
  ]);
  return manifest?.name === "agrimap-agent-skills"
    && Array.isArray(operations?.operations)
    && lifecycle.startsWith("# Workflow lifecycle core");
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeProvider(value) {
  const provider = typeof value === "string" ? value.toLowerCase() : "";
  return new Set(["codex", "claude", "gemini"]).has(provider)
    ? provider
    : "unknown";
}

function resolveHookProvider(configuredProvider, environment) {
  // Codex exports both PLUGIN_ROOT and the Claude-compatible root. Check its
  // provider-specific variable first so a cached Claude hook cannot mislabel a
  // Codex session. Gemini has no equivalent host environment marker; its hook
  // lives in the extension-only root and carries an explicit provider value.
  if (String(environment.PLUGIN_ROOT || "").trim()) {
    return { provider: "codex", source: "Codex PLUGIN_ROOT" };
  }
  if (configuredProvider === "gemini") {
    return { provider: "gemini", source: "Gemini extension hook" };
  }
  if (String(environment.CLAUDE_PLUGIN_ROOT || "").trim()) {
    return { provider: "claude", source: "Claude CLAUDE_PLUGIN_ROOT" };
  }
  return { provider: configuredProvider, source: "explicit hook configuration" };
}

function gitRequesterSuggestion(cwd) {
  try {
    return execFileSync("git", ["config", "--get", "user.name"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || null;
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  if (!filePath) return;
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch {
    // Context delivery must remain fail-open. A later prompt may retry the refresh.
  }
}

async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

const args = parseCliArgs(process.argv.slice(2));
const input = await readStdin();
const mode = args.mode || "session";
const configuredProvider = normalizeProvider(args.provider);
const providerResolution = resolveHookProvider(configuredProvider, process.env);
const provider = providerResolution.provider;
const providerMismatch = configuredProvider !== provider;
const cwd = workspaceRoot(path.resolve(input.cwd || process.cwd()));
const stateRoot = path.join(cwd, ".agrimap-agent");
const sessionId = safeSessionId(input.session_id || input.sessionId || input.conversation_id || input.conversationId);
const hookSessionKey = sessionId || safeSessionId(path.basename(input.transcript_path || input.transcriptPath || ""));
const effectiveSessionId = hookSessionKey;
const hostReportedModel = String(input.model || "").trim() || null;
const activeTask = effectiveSessionId
  ? await readJson(path.join(stateRoot, "runtime", "active", `${effectiveSessionId}.json`))
  : null;
const activationConfig = await readJson(path.join(stateRoot, "config.json"));
const projectCandidate = projectActivation(cwd, activationConfig);
const explicitInvocation = explicitSkillInvocation(provider, input.prompt);
const activation = activeTask
  ? { active: true, reason: "active-task" }
  : explicitInvocation
    ? { active: true, reason: "explicit-skill" }
    : projectCandidate;

if (!activation.active) {
  await new Promise((resolve) => process.stdout.write(
    JSON.stringify({ continue: true, suppressOutput: true }),
    resolve,
  ));
  process.exit(0);
}

const archivedPromptPath = await archiveRawPrompt(stateRoot, activationConfig, input);
if (archivedPromptPath && activeTask && effectiveSessionId) {
  activeTask.rawPromptHistoryPath = archivedPromptPath;
  await writeJson(path.join(stateRoot, "runtime", "active", `${effectiveSessionId}.json`), activeTask);
}

const rawIdentity = effectiveSessionId
  ? await readJson(path.join(stateRoot, "runtime", "sessions", `${effectiveSessionId}.json`))
  : null;
const identity = rawIdentity ? normalizeIdentity(rawIdentity, { defaultProvider: provider }) : null;
const skillPackageRepository = await isSkillPackageRepository(cwd);
const sqlProductRoutingRequired = !activeTask && !explicitInvocation && primarySqlProductIntent(input.prompt);
const confirmedIdentity = identity && !identity.expired ? identity : null;
const taskRequester = activeTask?.requestedBy || null;
const execution = {
  ...(activeTask || confirmedIdentity || identity || {}),
  ...(hostReportedModel ? { model: hostReportedModel } : {}),
};
const suggestedRequester = confirmedIdentity ? null : gitRequesterSuggestion(cwd);
const projectMemory = await readText(path.join(stateRoot, "memory", "project.md"));
const currentMemoryRelative = activeTask?.currentMemoryPath
  || (activeTask?.taskId ? `memory/current/${activeTask.taskId}.md` : "");
const currentTaskMemory = currentMemoryRelative
  ? await readText(path.join(stateRoot, currentMemoryRelative))
  : "";
const { promptPath: _promptPath, rawPromptHistoryPath: _rawPromptHistoryPath, ...activeTaskForFingerprint } = activeTask || {};
const memoryFingerprint = fingerprint(JSON.stringify({
  projectMemory,
  activeTask: activeTaskForFingerprint,
  currentTaskMemory,
}));
const hookStatePath = effectiveSessionId && (projectMemory || identity || activeTask)
  ? path.join(stateRoot, "runtime", "hooks", `${safeSessionId(provider)}-${hookSessionKey}.json`)
  : "";
const previousHookState = mode === "task" && hookStatePath
  ? await readJson(hookStatePath)
  : null;

// Task mode stays silent except for tracked-lane state that genuinely needs attention.
const context = [];

if (mode === "task") {
  if (!confirmedIdentity) {
    context.push(
      identity?.expired
        ? `AgriMap: requester confirmation expired (last: ${identity.requestedBy}). Reconfirm the human before starting any operation so task, memory, and log attribution remain durable.`
        : "AgriMap: requester is not persisted. Identify the human before starting any operation; every depth requires memory and audit attribution, while only standard/regulated create task artifacts.",
    );
  }
  if (activeTask && previousHookState && previousHookState.memoryFingerprint !== memoryFingerprint) {
    context.push(
      "AgriMap: task/project memory changed on disk since the last refresh — if you did not write that change yourself, reopen .agrimap-agent/memory/ before continuing.",
    );
  }
} else {
context.push(
  "AgriMap identity and audit context:",
  `- Hook provider: ${provider} (resolved from ${providerResolution.source}).`,
  providerMismatch
    ? `- Ignored mismatched hook configuration provider=${configuredProvider}; host evidence requires provider=${provider}. Refresh the installed plugin to remove the stale hook.`
    : `- Hook configuration and runtime provider agree: ${provider}.`,
  `- Hook mode: ${mode}`,
  hostReportedModel
    ? `- Host-reported active model: ${hostReportedModel}. Record this exact value as actual model; keep configured modelLabel separate.`
    : "- The hook did not report an active model. Record `model: unknown` only after checking the host runtime; never substitute a configured modelLabel as actual model.",
  effectiveSessionId
    ? `- Session: ${effectiveSessionId}${sessionId ? "" : " (derived from transcript path)"}`
    : "- Session ID is unavailable. Create one before starting any operation.",
  confirmedIdentity
    ? `- Confirmed session requester: ${confirmedIdentity.requestedBy}; valid until ${confirmedIdentity.expiresAt}.`
    : identity?.expired
      ? `- Requester confirmation expired. Last confirmed requester was ${identity.requestedBy}; reconfirm before starting any operation.`
      : "- Session requester is unknown. Resolve it before starting the operation; every depth persists concise memory/log evidence and tracked depths also persist task artifacts.",
  taskRequester
    ? `- Active task requested by: ${taskRequester}; immutable task attribution comes from its tracked brief and created log event.`
    : "- No active task requester is recorded for this session.",
  `- Previously recorded execution identity (may be stale — your own runtime identity wins): model=${execution.model || "unrecorded"}, role=${execution.role || "leader"}, agent=${execution.agent || "primary"}, provider=${execution.provider || "unrecorded"}.`,
  effectiveSessionId
    ? `- Persist/reconfirm with agm-workspace.mjs identify --session ${effectiveSessionId} --owner <confirmed-human-name> --model "${hostReportedModel || "unknown"}" --provider ${provider} before any operation.`
    : `- Create a stable session ID and persist the confirmed human with --model "${hostReportedModel || "unknown"}" --provider ${provider} before any operation.`,
  suggestedRequester
    ? `- Unconfirmed Git-name suggestion: ${suggestedRequester}. Ask the human to confirm it; never attribute work automatically from this value.`
    : "- Do not substitute machine, OS, or Git identity for explicit human confirmation.",
  "- Workflow depth controls persistence: light creates no tasks/** artifacts; standard and regulated create tracked task artifacts. Every depth creates current/recent memory and daily created/milestone/terminal audit events.",
  "- For audit/history questions, run agm-workspace.mjs history with person/date/task filters; inspect attributionSemantics, auditStorage, invalidLines, and returned brief/result/QA/memory paths. Distinguish requester, workflow executor, claimed files, and Git author; never answer from conversational recall alone.",
  "- Durable project memory is .agrimap-agent/memory/project.md; reopen it when context was compacted or current project facts are needed.",
);
}

if (skillPackageRepository) {
  context.push(
    "- Workspace kind: `skill-package`. Requests about skills, operations, hooks, contracts, generators, documentation, or tests are package work; they do not create root FE/BE/SQL product artifacts unless the requester explicitly authorizes a fixture/example target and exact path.",
  );
}

if (sqlProductRoutingRequired) {
  context.push(
    "- Operation routing gate: Primary SQL product intent detected. Invoke the dedicated `agm-sql` operation and resolve exactly one action before target inspection or product writes. This routing requirement grants no write authority.",
  );
}

if (mode !== "task" && (activeTask?.executionId || activeTask?.taskId)) {
  context.push(`- Active execution: ${activeTask.executionId || activeTask.taskId}${activeTask.taskId ? `; task ${activeTask.taskId}` : "; light/artifactless"} (${activeTask.operation || "unspecified"}) — pending work carried over; reconcile or close it before starting unrelated work.`);
}

if (mode === "subagent") {
  context.push(
    "- Inherit requestedBy and authority fields from the Leader handoff/session; record configurable modelLabel separately from actual model, role, agent, and provider.",
    "- Native agent-thread activity is the primary progress channel. Keep the delegated display label and bounded task visible in your thread; the requester can inspect it from the app thread, CLI /agent, or IDE background-agent panel on current Codex releases.",
    "- Write .agrimap-agent/runtime/progress/<task-id>.jsonl only when the handoff explicitly declares a fallback because native activity is unavailable. Write started, meaningful phase/status transitions, and finished/blocked; never write per step, tool call, file read, or unchanged poll. Optional unchanged liveness is capped at once per five minutes.",
    "- Read workspace_need before any write. Verify the required mode, base commit, visibility, ownership, and integration-return method; report unsupported isolation and use only the named fallback.",
    "- Write only the files and logical contract assigned to you. One writer owns them per integration wave; stop and report overlap not resolved by the Leader.",
    "- Do not assume a sandbox branch or commit is visible. Return the requested integration artifact for the verified workspace mode.",
    "- Return a structured handoff: status, requestedBy, requesterAuthority, decisionOwner, displayLabel, nativeThreadId, progressChannel, modelLabel, actual model, role, agent, provider, summary, files_changed, behavior_changed, decisions_and_reasons, commands_and_tests, remaining_risks, memory_facts, integration_artifact, and branch/commit when applicable.",
  );
}

if (mode !== "task") {
  context.push(
    "- For a generated agm alias, read exactly lifecycle-core.md and its operations/<operation>.md entrypoint; do not preload the glossary or routing umbrella. A missing/corrupt compact route is PACKAGE_ENTRYPOINT_MISSING.",
    "- Do not add permission gates. Discuss only material logic/contract/data/architecture trade-offs.",
    "- Select light|standard|regulated, identify the requester, and start execution state before substantive work. Light writes memory/logs without tasks/**; standard and regulated also write the five tracked task artifacts.",
    "- Raw requester submits contain no AI answers and belong only in .agrimap-agent/prompts/YYYY-MM/<conversation>/history.md. Versioned Prompt Results belong in .agrimap-agent/prompts/YYYY-MM/<conversation>/<context>-vNNN.md; generated execution-only role instructions belong under .agrimap-agent/instructions/.",
    "- Reopen project memory on demand and update current execution memory only at defined milestones; do not inject unrelated project memory into the execution.",
  );
  if (currentTaskMemory) context.push("\nCurrent tracked-task memory:\n", currentTaskMemory);
}

const hookEventName = input.hook_event_name || input.hookEventName || "SessionStart";
const additionalContext = context.join("\n");

if (mode === "task") {
  await writeJson(hookStatePath, { version: 2, memoryFingerprint });
} else if (mode === "session") {
  await writeJson(hookStatePath, { version: 2, memoryFingerprint });
}

const output = {
  continue: true,
  suppressOutput: true,
};
if (additionalContext) {
  output.hookSpecificOutput = {
    hookEventName,
    additionalContext,
  };
}

process.stdout.write(
  JSON.stringify(output),
);
