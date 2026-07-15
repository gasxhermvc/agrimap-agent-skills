#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCliArgs } from "./cli-args.mjs";

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
const identity = sessionId
  ? await readJson(path.join(stateRoot, "runtime", "sessions", `${sessionId}.json`))
  : null;
const activeTask = sessionId
  ? await readJson(path.join(stateRoot, "runtime", "active", `${sessionId}.json`))
  : null;
const requestedBy = identity?.requestedBy || activeTask?.requestedBy || null;
const execution = activeTask || identity || {};
const projectMemory = await readText(path.join(stateRoot, "memory", "project.md"));
const currentTaskMemory = activeTask?.taskId
  ? await readText(path.join(stateRoot, "memory", "current", `${activeTask.taskId}.md`))
  : "";
const taskFingerprint = fingerprint(JSON.stringify({
  requestedBy,
  execution,
  activeTask,
  currentTaskMemory,
}));
const hookStatePath = hookSessionKey && (projectMemory || identity || activeTask)
  ? path.join(stateRoot, "runtime", "hooks", `${safeSessionId(provider)}-${hookSessionKey}.json`)
  : "";
const previousHookState = mode === "task" && hookStatePath
  ? await readJson(hookStatePath)
  : null;

const context = [
  "AgriMap Agent Skills context:",
  `- Provider: ${provider}`,
  `- Hook mode: ${mode}`,
  sessionId ? `- Session: ${sessionId}` : "- Session ID is unavailable. Create a stable local conversation ID before substantive task work.",
  requestedBy
    ? `- Requested by: ${requestedBy}`
    : "- Requester is unknown for this session/task. Ask the human before substantive work; never infer from the latest shared log.",
  `- Execution identity: model=${execution.model || "unknown"}, role=${execution.role || "leader"}, agent=${execution.agent || "primary"}, provider=${execution.provider || provider}.`,
  "- Persist session identity with agm-workspace.mjs identify --session <id> --owner <name>; runtime identity is ignored by Git.",
  "- Copy requestedBy into the tracked task brief and every durable log event; record model, role, agent, and provider as separate fields. Never combine them into actor names such as frontier-codex.",
  "- Read the umbrella skill before using an agm workflow.",
  "- Do not add permission gates. Discuss only material logic/contract/data/architecture trade-offs.",
  "- Update memory and concise logs after every atomic task; do not claim completion with unchecked items.",
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

if (mode !== "task" && projectMemory) context.push("\nCurrent project memory:\n", projectMemory);
if (currentTaskMemory) context.push("\nCurrent task memory:\n", currentTaskMemory);

const hookEventName = input.hook_event_name || input.hookEventName || "SessionStart";
let additionalContext = context.join("\n");

if (mode === "task") {
  if (previousHookState?.taskFingerprint === taskFingerprint) {
    additionalContext = "";
  } else {
    await writeJson(hookStatePath, { version: 1, taskFingerprint });
  }
} else if (mode === "session") {
  await writeJson(hookStatePath, { version: 1, taskFingerprint });
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
