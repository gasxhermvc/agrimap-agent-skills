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

// task mode (fires on every prompt) is silent by design: identity is asked once per
// 24h at session start, and memory is loaded once per session — never re-injected
// into every model call. Only two conditions may speak here.
const context = [];

if (mode === "task") {
  if (!confirmedIdentity) {
    context.push(
      identity?.expired
        ? `AgriMap: requester confirmation expired (last: ${identity.requestedBy}). Ask the human once for today's requester name, persist it with agm-workspace.mjs identify --session ${effectiveSessionId || "<stable-local-id>"} --owner <name>, then this reminder stops for 24h.`
        : `AgriMap: session requester is unknown. Ask the human once for today's requester name, persist it with agm-workspace.mjs identify --session ${effectiveSessionId || "<stable-local-id>"} --owner <name>, then this reminder stops for 24h.`,
    );
  }
  if (previousHookState && previousHookState.memoryFingerprint !== memoryFingerprint) {
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
    : "- Session ID is unavailable. Create a stable local conversation ID before substantive task work.",
  confirmedIdentity
    ? `- Confirmed session requester: ${confirmedIdentity.requestedBy}; valid until ${confirmedIdentity.expiresAt}.`
    : identity?.expired
      ? `- Requester confirmation expired. Last confirmed requester was ${identity.requestedBy}; ask the human to confirm again before substantive work.`
      : "- Session requester is unknown. Ask the human before substantive work; never infer attribution from shared logs, machine/OS user, or Git config.",
  taskRequester
    ? `- Active task requested by: ${taskRequester}; immutable task attribution comes from its tracked brief and created log event.`
    : "- No active task requester is recorded for this session.",
  `- Previously recorded execution identity (may be stale — your own runtime identity wins): model=${execution.model || "unrecorded"}, role=${execution.role || "leader"}, agent=${execution.agent || "primary"}, provider=${execution.provider || "unrecorded"}.`,
  effectiveSessionId
    ? `- Persist or reconfirm identity with agm-workspace.mjs identify --session ${effectiveSessionId} --owner <confirmed-human-name>; runtime identity is ignored by Git.`
    : "- Persist identity with agm-workspace.mjs identify --session <stable-local-id> --owner <confirmed-human-name>; runtime identity is ignored by Git.",
  suggestedRequester
    ? `- Unconfirmed Git-name suggestion: ${suggestedRequester}. Ask the human to confirm it; never attribute work automatically from this value.`
    : "- Do not substitute machine, OS, or Git identity for explicit human confirmation.",
  "- Durable audit rule: every task must record who requested what in its tracked brief and created log; checkpoint each durable state transition (not each read/tool call) with an accurate UTC timestamp.",
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
    "- Write .agrimap-agent/runtime/progress/<task-id>.jsonl only when the handoff explicitly declares it as a fallback because native activity is unavailable; then write started, one line per ordered step, and finished/blocked.",
    "- Read workspace_need before any write. Verify the required mode, base commit, visibility, ownership, and integration-return method; report unsupported isolation and use only the named fallback.",
    "- Write only the files and logical contract assigned to you. One writer owns them per integration wave; stop and report overlap not resolved by the Leader.",
    "- Do not assume a sandbox branch or commit is visible. Return the requested integration artifact for the verified workspace mode.",
    "- Return a structured handoff: status, requestedBy, requesterAuthority, decisionOwner, displayLabel, nativeThreadId, progressChannel, modelLabel, actual model, role, agent, provider, summary, files_changed, behavior_changed, decisions_and_reasons, commands_and_tests, remaining_risks, memory_facts, integration_artifact, and branch/commit when applicable.",
  );
}

if (mode !== "task") {
  context.push(
    "- For a generated agm alias, read compact runtime-core.md, glossary.md, and its operations/<operation>.md entrypoint; do not load the umbrella unless directly invoked or the compact route is missing/corrupt.",
    "- Do not add permission gates. Discuss only material logic/contract/data/architecture trade-offs.",
    "- Current Codex releases enable subagents by default. Before spawning, announce each descriptive agent label, bounded task, expected output, and inspection path (app thread, CLI /agent, or IDE background-agent panel).",
    "- Never wait silently for minutes: continue safe work or inspect status in intervals no longer than 60 seconds and report running/completed/blocked with agent/task detail. Native threads are primary; use a progress JSONL file only as an explicit fallback.",
    "- Update memory and concise logs after every glossary-defined durable state transition; do not claim completion with unchecked items.",
    "- Memory loading policy: this one-time load (plus the pending-work summary above) is the memory context for the whole session. It is not re-injected on later prompts; reopen the memory files yourself only after context compaction or an on-disk change notice.",
  );
  if (projectMemory) context.push("\nCurrent project memory:\n", projectMemory);
  if (currentTaskMemory) context.push("\nCurrent task memory (pending work to reconcile):\n", currentTaskMemory);
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
