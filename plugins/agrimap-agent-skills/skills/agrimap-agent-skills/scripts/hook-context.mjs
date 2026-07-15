#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const values = {};
  for (let index = 2; index < argv.length; index += 2) {
    values[argv[index].replace(/^--/, "")] = argv[index + 1];
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

async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

const args = parseArgs(process.argv);
const input = await readStdin();
const provider = args.provider === "auto"
  ? process.env.PLUGIN_ROOT
    ? "codex"
    : process.env.CLAUDE_PLUGIN_ROOT
      ? "claude"
      : process.env.GEMINI_SESSION_ID
        ? "gemini"
        : "unknown"
  : args.provider || "unknown";
const cwd = workspaceRoot(path.resolve(input.cwd || process.cwd()));
const stateRoot = path.join(cwd, ".agrimap-agent");
const sessionId = safeSessionId(input.session_id || input.sessionId || input.conversation_id || input.conversationId);
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

const context = [
  "AgriMap Agent Skills context:",
  `- Provider: ${provider}`,
  `- Hook mode: ${args.mode || "session"}`,
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

if (args.mode === "subagent") {
  context.push(
    "- Inherit requestedBy from the Leader handoff/session and identify model, role, agent, and provider separately.",
    "- Read workspace_need before any write. Verify the required mode, base commit, visibility, ownership, and integration-return method; report unsupported isolation and use only the named fallback.",
    "- Write only the files and logical contract assigned to you. One writer owns them per integration wave; stop and report overlap not resolved by the Leader.",
    "- Do not assume a sandbox branch or commit is visible. Return the requested integration artifact for the verified workspace mode.",
    "- Return a structured handoff: status, requestedBy, model, role, agent, provider, summary, files_changed, behavior_changed, decisions_and_reasons, commands_and_tests, remaining_risks, memory_facts, integration_artifact, and branch/commit when applicable.",
  );
}

if (projectMemory) context.push("\nCurrent project memory:\n", projectMemory);
if (currentTaskMemory) context.push("\nCurrent task memory:\n", currentTaskMemory);

const hookEventName = input.hook_event_name || input.hookEventName || "SessionStart";
process.stdout.write(
  JSON.stringify({
    continue: true,
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName,
      additionalContext: context.join("\n"),
    },
  }),
);
