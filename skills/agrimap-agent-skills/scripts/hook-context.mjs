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
const providerValue = typeof args.provider === "string" ? args.provider.toLowerCase() : "";
const provider = new Set(["codex", "claude", "gemini"]).has(providerValue)
  ? providerValue
  : "unknown";
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

const context = [
  "AgriMap identity and audit context:",
  `- Hook flavor: ${provider} (the installed hook's configuration flag — NOT proof of the running provider)`,
  `- Hook mode: ${mode}`,
  "- Record executing model and provider from your own runtime identity: you always know your model family and host CLI. Never copy this hook's flavor or `unknown` into briefs/logs when your own identity says otherwise; `model: unknown` is a recording defect unless you genuinely cannot name your own model.",
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
  "- Durable audit rule: every task must record who requested what in its tracked brief and created log; checkpoint each atomic action with an accurate UTC timestamp.",
  "- For audit/history questions, run agm-workspace.mjs history with person/date/task filters; inspect attributionSemantics, auditStorage, invalidLines, and returned brief/result/QA/memory paths. Distinguish requester, workflow executor, claimed files, and Git author; never answer from conversational recall alone.",
  "- Durable project memory is .agrimap-agent/memory/project.md; reopen it when context was compacted or current project facts are needed.",
];

if (activeTask?.taskId) {
  context.push(`- Active task: ${activeTask.taskId} (${activeTask.operation || "unspecified"}).`);
}

if (mode === "subagent") {
  context.push(
    "- Inherit requestedBy from the Leader handoff/session and identify model, role, agent, and provider separately.",
    "- Read workspace_need before any write. Verify the required mode, base commit, visibility, ownership, and integration-return method; report unsupported isolation and use only the named fallback.",
    "- Write only the files and logical contract assigned to you. One writer owns them per integration wave; stop and report overlap not resolved by the Leader.",
    "- Do not assume a sandbox branch or commit is visible. Return the requested integration artifact for the verified workspace mode.",
    "- Return a structured handoff: status, requestedBy, model, role, agent, provider, summary, files_changed, behavior_changed, decisions_and_reasons, commands_and_tests, remaining_risks, memory_facts, integration_artifact, and branch/commit when applicable.",
  );
}

if (mode !== "task") {
  context.push(
    "- Read the umbrella skill before using an agm workflow.",
    "- Do not add permission gates. Discuss only material logic/contract/data/architecture trade-offs.",
    "- Update memory and concise logs after every atomic task; do not claim completion with unchecked items.",
  );
  if (projectMemory) context.push("\nCurrent project memory:\n", projectMemory);
  if (currentTaskMemory) context.push("\nCurrent task memory:\n", currentTaskMemory);
} else if (currentTaskMemory && previousHookState?.memoryFingerprint !== memoryFingerprint) {
  if (projectMemory) context.push("\nProject memory (changed since the last hook refresh):\n", projectMemory);
  context.push("\nCurrent task memory (changed since the last hook refresh):\n", currentTaskMemory);
} else if (projectMemory && previousHookState?.memoryFingerprint !== memoryFingerprint) {
  context.push("\nProject memory (changed since the last hook refresh):\n", projectMemory);
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
