#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCliArgs } from "./cli-args.mjs";
import { normalizeIdentity } from "./identity.mjs";

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

function safeSessionId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
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
const rawIdentity = effectiveSessionId
  ? await readJson(path.join(stateRoot, "runtime", "sessions", `${effectiveSessionId}.json`))
  : null;
const identity = rawIdentity ? normalizeIdentity(rawIdentity, { defaultProvider: provider }) : null;
const confirmedIdentity = identity && !identity.expired ? identity : null;
const activeTask = effectiveSessionId
  ? await readJson(path.join(stateRoot, "runtime", "active", `${effectiveSessionId}.json`))
  : null;
const taskRequester = activeTask?.requestedBy || null;
const execution = activeTask || confirmedIdentity || identity || {};
const suggestedRequester = confirmedIdentity ? null : gitRequesterSuggestion(cwd);
const projectMemory = await readText(path.join(stateRoot, "memory", "project.md"));
const currentTaskMemory = activeTask?.taskId
  ? await readText(path.join(stateRoot, "memory", "current", `${activeTask.taskId}.md`))
  : "";
const memoryFingerprint = fingerprint(JSON.stringify({
  projectMemory,
  activeTask,
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
        ? `AgriMap: requester confirmation expired (last: ${identity.requestedBy}). Consult the operation Lifecycle; reconfirm/persist only for tracked work. Lightweight/stateless work must not ask solely for attribution.`
        : "AgriMap: requester is not persisted. Consult the operation Lifecycle; identify the human only for tracked work. Lightweight/stateless work proceeds without workflow attribution.",
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
  "- Record executing model and provider from your own runtime identity: you always know your model family and host CLI. The resolved hook provider is runtime evidence, but your own host/model identity still wins if any external configuration is stale; `model: unknown` is a recording defect unless you genuinely cannot name your own model.",
  effectiveSessionId
    ? `- Session: ${effectiveSessionId}${sessionId ? "" : " (derived from transcript path)"}`
    : "- Session ID is unavailable. Create one only if the selected operation enters tracked work.",
  confirmedIdentity
    ? `- Confirmed session requester: ${confirmedIdentity.requestedBy}; valid until ${confirmedIdentity.expiresAt}.`
    : identity?.expired
      ? `- Requester confirmation expired. Last confirmed requester was ${identity.requestedBy}; reconfirm only for tracked work.`
      : "- Session requester is unknown. Resolve it only after the operation selects tracked work; lightweight/stateless work skips persistence.",
  taskRequester
    ? `- Active task requested by: ${taskRequester}; immutable task attribution comes from its tracked brief and created log event.`
    : "- No active task requester is recorded for this session.",
  `- Previously recorded execution identity (may be stale — your own runtime identity wins): model=${execution.model || "unrecorded"}, role=${execution.role || "leader"}, agent=${execution.agent || "primary"}, provider=${execution.provider || "unrecorded"}.`,
  effectiveSessionId
    ? `- For tracked work only, persist/reconfirm with agm-workspace.mjs identify --session ${effectiveSessionId} --owner <confirmed-human-name>.`
    : "- For tracked work only, create a stable session ID and persist the confirmed human.",
  suggestedRequester
    ? `- Unconfirmed Git-name suggestion: ${suggestedRequester}. Ask the human to confirm it; never attribute work automatically from this value.`
    : "- Do not substitute machine, OS, or Git identity for explicit human confirmation.",
  "- Lifecycle rule: lightweight/stateless work creates no task artifacts or audit events. Tracked work records requester/objective and durable transitions.",
  "- For audit/history questions, run agm-workspace.mjs history with person/date/task filters; inspect attributionSemantics, auditStorage, invalidLines, and returned brief/result/QA/memory paths. Distinguish requester, workflow executor, claimed files, and Git author; never answer from conversational recall alone.",
  "- Durable project memory is .agrimap-agent/memory/project.md; reopen it when context was compacted or current project facts are needed.",
);
}

if (mode !== "task" && activeTask?.taskId) {
  context.push(`- Active task: ${activeTask.taskId} (${activeTask.operation || "unspecified"}) — pending work carried over; reconcile or close it before starting unrelated work.`);
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
    "- For a generated agm alias, read compact runtime-core.md, glossary.md, and exactly its operations/<operation>.md entrypoint; never load the routing-only umbrella during execution. A missing/corrupt compact route is PACKAGE_ENTRYPOINT_MISSING and requires sync/reinstallation.",
    "- Do not add permission gates. Discuss only material logic/contract/data/architecture trade-offs.",
    "- Select Lifecycle before attribution or workflow writes. Lightweight/stateless work skips receipt, task artifacts, memory/logs, and separate QA.",
    "- For tracked work, reopen project memory on demand and update it only at durable transitions; do not inject it into unrelated lightweight work.",
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
