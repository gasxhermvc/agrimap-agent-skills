#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseCliArgs } from "../skills/agrimap-agent-skills/scripts/cli-args.mjs";
import { LOG_EVENTS } from "../skills/agrimap-agent-skills/scripts/log-events.mjs";

const root = process.cwd();
const workspaceScript = path.join(root, "skills", "agrimap-agent-skills", "scripts", "agm-workspace.mjs");
const hookScript = path.join(root, "skills", "agrimap-agent-skills", "scripts", "hook-context.mjs");
const reuseScript = path.join(root, "skills", "agrimap-agent-skills", "scripts", "frontend-reuse-index.mjs");
const extractorScript = path.join(root, "tools", "extract-code-blocks.mjs");
const temp = await mkdtemp(path.join(os.tmpdir(), "agrimap-agent-skills-"));
const logEventSet = new Set(LOG_EVENTS);

function run(script, args, input) {
  return JSON.parse(execFileSync(process.execPath, [script, ...args], {
    cwd: temp,
    encoding: "utf8",
    input: input ? JSON.stringify(input) : undefined,
  }));
}

async function readTaskLog(taskId) {
  const content = await readFile(
    path.join(temp, ".agrimap-agent", "logs", new Date().toISOString().slice(0, 7), `${taskId}.jsonl`),
    "utf8",
  );
  return content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

try {
  assert.deepEqual(
    parseCliArgs(["--debug", "--provider", "gemini", "--mode", "task"]),
    { debug: true, provider: "gemini", mode: "task" },
  );
  assert.deepEqual(
    parseCliArgs(["--provider=claude", "--dry-run"]),
    { provider: "claude", "dry-run": true },
  );

  const extractorSource = path.join(temp, "extractor-fixture.md");
  const extractorOutput = path.join(temp, "extracted");
  await writeFile(
    extractorSource,
    "# Correct Section\n\n```text\n# Fake Heading\ninside first block\n```\n\n```ts\nconst value = 1;\n```\n",
    "utf8",
  );
  execFileSync(process.execPath, [
    extractorScript,
    "--source", extractorSource,
    "--output", extractorOutput,
    "--collection", "regression",
  ], { cwd: temp, encoding: "utf8" });
  const extractorManifest = JSON.parse(await readFile(path.join(extractorOutput, "manifest.json"), "utf8"));
  assert.equal(extractorManifest.examples[1].heading, "Correct Section");
  assert.equal(extractorManifest.examples[1].fileName, "002-correct-section.ts");

  const pruneWithoutState = run(workspaceScript, ["prune", "--cwd", temp]);
  assert.deepEqual(pruneWithoutState, {
    ok: true,
    pruned: false,
    reason: "config-missing",
    retentionDays: null,
    removed: [],
    logsPreserved: true,
  });
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "config.json"), "utf8"), { code: "ENOENT" });

  const initialized = run(workspaceScript, ["init", "--cwd", temp]);
  assert.equal(initialized.ok, true);
  assert.equal(initialized.needsRequester, true);
  assert.match(
    await readFile(path.join(temp, ".agrimap-agent", "knowledge", "service-ownership.yaml"), "utf8"),
    /source_of_trust: \.agrimap-agent\/knowledge\/service-ownership\.yaml/,
  );
  assert.equal(await readFile(path.join(temp, ".agrimap-agent", ".gitignore"), "utf8"), "runtime/\ncache/\n");
  const stateConfig = JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "config.json"), "utf8"));
  assert.equal(stateConfig.stateScope, "target-project");
  assert.equal(stateConfig.installDirectoryWrites, false);
  assert.equal(stateConfig.aiGateway, "disabled");

  const configPath = path.join(temp, ".agrimap-agent", "config.json");
  const oldRecentPath = path.join(temp, ".agrimap-agent", "memory", "recent", "prune-old.md");
  const protectedPrunePaths = [
    path.join(temp, ".agrimap-agent", "memory", "current", "prune-protected.md"),
    path.join(temp, ".agrimap-agent", "logs", "prune-protected.jsonl"),
    path.join(temp, ".agrimap-agent", "tasks", "prune-protected", "result.md"),
    path.join(temp, ".agrimap-agent", "decisions", "prune-protected.md"),
  ];
  for (const filePath of [oldRecentPath, ...protectedPrunePaths]) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "protected prune fixture\n", "utf8");
  }
  const fortyDaysAgo = new Date(Date.now() - 40 * 86_400_000);
  await Promise.all([oldRecentPath, ...protectedPrunePaths].map((filePath) => utimes(filePath, fortyDaysAgo, fortyDaysAgo)));

  await rm(configPath);
  const pruneWithoutConfig = run(workspaceScript, ["prune", "--cwd", temp]);
  assert.equal(pruneWithoutConfig.pruned, false);
  assert.equal(pruneWithoutConfig.reason, "config-missing");
  assert.deepEqual(pruneWithoutConfig.removed, []);
  assert.equal(await readFile(oldRecentPath, "utf8"), "protected prune fixture\n");

  await writeFile(configPath, "{ invalid json\n", "utf8");
  const invalidConfigPrune = spawnSync(process.execPath, [workspaceScript, "prune", "--cwd", temp], { encoding: "utf8" });
  assert.equal(invalidConfigPrune.status, 1);
  assert.equal(invalidConfigPrune.stderr, "");
  const invalidConfigResult = JSON.parse(invalidConfigPrune.stdout);
  assert.equal(invalidConfigResult.code, "INVALID_CONFIG");
  assert.equal(invalidConfigResult.pruned, false);
  assert.deepEqual(invalidConfigResult.removed, []);
  assert.equal(await readFile(oldRecentPath, "utf8"), "protected prune fixture\n");

  await writeFile(configPath, `${JSON.stringify({ ...stateConfig, retentionDays: 1 }, null, 2)}\n`, "utf8");
  const lowerBoundPrune = run(workspaceScript, ["prune", "--cwd", temp]);
  assert.equal(lowerBoundPrune.pruned, true);
  assert.equal(lowerBoundPrune.retentionDays, 10);
  assert.equal(lowerBoundPrune.removed.includes("prune-old.md"), true);
  await assert.rejects(readFile(oldRecentPath, "utf8"), { code: "ENOENT" });
  for (const filePath of protectedPrunePaths) {
    assert.equal(await readFile(filePath, "utf8"), "protected prune fixture\n");
  }

  const upperBoundRecentPath = path.join(temp, ".agrimap-agent", "memory", "recent", "prune-upper-bound.md");
  await writeFile(upperBoundRecentPath, "upper bound fixture\n", "utf8");
  const twentyDaysAgo = new Date(Date.now() - 20 * 86_400_000);
  await utimes(upperBoundRecentPath, twentyDaysAgo, twentyDaysAgo);
  await writeFile(configPath, `${JSON.stringify({ ...stateConfig, retentionDays: 999 }, null, 2)}\n`, "utf8");
  const upperBoundPrune = run(workspaceScript, ["prune", "--cwd", temp]);
  assert.equal(upperBoundPrune.retentionDays, 30);
  assert.equal(upperBoundPrune.removed.includes("prune-upper-bound.md"), false);
  assert.equal(await readFile(upperBoundRecentPath, "utf8"), "upper bound fixture\n");
  await rm(upperBoundRecentPath);
  await writeFile(configPath, `${JSON.stringify(stateConfig, null, 2)}\n`, "utf8");

  const missingRequester = spawnSync(process.execPath, [workspaceScript, "start", "--cwd", temp, "--session", "unknown", "--task", "should-not-start"], { encoding: "utf8" });
  assert.notEqual(missingRequester.status, 0);
  assert.equal(JSON.parse(missingRequester.stdout).needsRequester, true);

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-a", "--owner", "Alice", "--model", "gpt-5.6-sol", "--role", "leader", "--agent", "primary", "--provider", "codex"]);
  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-b", "--owner", "Bob", "--model", "fable", "--role", "leader", "--agent", "primary", "--provider", "claude"]);
  const taskA = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-a", "--operation", "analyze"]);
  const taskB = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--operation", "create-feature"]);
  assert.equal(taskA.activeTask.requestedBy, "Alice");
  assert.equal(taskB.activeTask.requestedBy, "Bob");
  assert.deepEqual(
    { model: taskA.activeTask.model, role: taskA.activeTask.role, agent: taskA.activeTask.agent, provider: taskA.activeTask.provider },
    { model: "gpt-5.6-sol", role: "leader", agent: "primary", provider: "codex" },
  );
  assert.deepEqual(
    { model: taskB.activeTask.model, role: taskB.activeTask.role, agent: taskB.activeTask.agent, provider: taskB.activeTask.provider },
    { model: "fable", role: "leader", agent: "primary", provider: "claude" },
  );

  const activeA = JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  const activeB = JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-b.json"), "utf8"));
  assert.equal(activeA.taskId, "task-a");
  assert.equal(activeB.taskId, "task-b");

  const checkpointA = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-a", "--summary", "Analyzed task A", "--files", "src/a.ts", "--verification", "inspection passed", "--model", "gpt-5.4", "--role", "executor", "--agent", "be", "--provider", "codex"]);
  const checkpointB = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--summary", "Analyzed task B", "--files", "src/b.ts"]);
  assert.equal(checkpointA.requestedBy, "Alice");
  assert.equal(checkpointB.requestedBy, "Bob");
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "current", "task-a.md"), "utf8"), /Requested by: Alice/);
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "current", "task-b.md"), "utf8"), /Requested by: Bob/);
  const taskALog = await readFile(path.join(temp, ".agrimap-agent", "logs", new Date().toISOString().slice(0, 7), "task-a.jsonl"), "utf8");
  assert.equal(taskALog.includes('"requestedBy":"Alice"'), true);
  assert.equal(taskALog.includes('"model":"gpt-5.4"'), true);
  assert.equal(taskALog.includes('"role":"executor"'), true);
  assert.equal(taskALog.includes('"agent":"be"'), true);
  assert.equal(taskALog.includes('"actor"'), false);
  assert.equal((await readTaskLog("task-a")).every((entry) => logEventSet.has(entry.event)), true);

  const taskBMemoryPath = path.join(temp, ".agrimap-agent", "memory", "current", "task-b.md");
  const taskBLogBeforeInvalidEvent = JSON.stringify(await readTaskLog("task-b"));
  const taskBMemoryBeforeInvalidEvent = await readFile(taskBMemoryPath, "utf8");
  const invalidEventCheckpoint = spawnSync(process.execPath, [
    workspaceScript,
    "checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b",
    "--summary", "This checkpoint must be rejected", "--event", "not-documented",
  ], { encoding: "utf8" });
  assert.equal(invalidEventCheckpoint.status, 1);
  const invalidEventResult = JSON.parse(invalidEventCheckpoint.stdout);
  assert.equal(invalidEventResult.code, "INVALID_LOG_EVENT");
  assert.match(invalidEventResult.message, /qa-failed\|blocked\|cancelled/);
  assert.equal(JSON.stringify(await readTaskLog("task-b")), taskBLogBeforeInvalidEvent);
  assert.equal(await readFile(taskBMemoryPath, "utf8"), taskBMemoryBeforeInvalidEvent);

  const hookA = run(hookScript, ["--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "BeforeAgent",
  });
  assert.match(hookA.hookSpecificOutput.additionalContext, /Requested by: Alice/);
  assert.match(hookA.hookSpecificOutput.additionalContext, /Active task: task-a/);
  assert.match(hookA.hookSpecificOutput.additionalContext, /model=gpt-5.6-sol, role=leader, agent=primary, provider=codex/);
  assert.doesNotMatch(hookA.hookSpecificOutput.additionalContext, /Current project memory:/);

  const booleanFlagHook = run(hookScript, ["--debug", "--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    session_id: "parser-regression",
    hook_event_name: "BeforeAgent",
  });
  assert.match(booleanFlagHook.hookSpecificOutput.additionalContext, /Provider: gemini/);
  assert.match(booleanFlagHook.hookSpecificOutput.additionalContext, /Hook mode: task/);

  const autoProviderHook = run(hookScript, ["--provider", "auto", "--mode", "session"], {
    cwd: temp,
    session_id: "provider-regression",
    hook_event_name: "SessionStart",
  });
  assert.match(autoProviderHook.hookSpecificOutput.additionalContext, /Provider: unknown/);

  const repeatedHookA = run(hookScript, ["--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "BeforeAgent",
  });
  assert.equal(repeatedHookA.hookSpecificOutput, undefined);

  const claudeSessionB = run(hookScript, ["--provider", "claude", "--mode", "session"], {
    cwd: temp,
    session_id: "session-b",
    hook_event_name: "SessionStart",
  });
  assert.match(claudeSessionB.hookSpecificOutput.additionalContext, /Current project memory:/);
  assert.match(claudeSessionB.hookSpecificOutput.additionalContext, /Current task memory:/);
  const unchangedClaudePrompt = run(hookScript, ["--provider", "claude", "--mode", "task"], {
    cwd: temp,
    session_id: "session-b",
    hook_event_name: "UserPromptSubmit",
    prompt: "Continue the task",
  });
  assert.equal(unchangedClaudePrompt.hookSpecificOutput, undefined);

  run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--summary", "Task B context changed", "--event", "verified"]);
  const refreshedClaudePrompt = run(hookScript, ["--provider", "claude", "--mode", "task"], {
    cwd: temp,
    session_id: "session-b",
    hook_event_name: "UserPromptSubmit",
    prompt: "Continue after the checkpoint",
  });
  assert.match(refreshedClaudePrompt.hookSpecificOutput.additionalContext, /Task B context changed/);
  assert.doesNotMatch(refreshedClaudePrompt.hookSpecificOutput.additionalContext, /Current project memory:/);
  const repeatedClaudePrompt = run(hookScript, ["--provider", "claude", "--mode", "task"], {
    cwd: temp,
    session_id: "session-b",
    hook_event_name: "UserPromptSubmit",
    prompt: "Continue again",
  });
  assert.equal(repeatedClaudePrompt.hookSpecificOutput, undefined);

  const hookUnknown = run(hookScript, ["--provider", "claude", "--mode", "session"], {
    cwd: temp,
    session_id: "new-session",
    hook_event_name: "SessionStart",
  });
  assert.match(hookUnknown.hookSpecificOutput.additionalContext, /Requester is unknown/);
  assert.doesNotMatch(hookUnknown.hookSpecificOutput.additionalContext, /Requested by: Bob/);

  const subagentHook = run(hookScript, ["--provider", "claude", "--mode", "subagent"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "SubagentStart",
  });
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /One writer owns them per integration wave/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /integration artifact/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /Read workspace_need before any write/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /base commit/);

  const taskADirectory = path.join(temp, ".agrimap-agent", "tasks", "task-a");
  await writeFile(path.join(taskADirectory, "checklist.md"), "# Checklist\n\n- [x] Scope inspected.\n- [x] Work verified.\n- [x] Memory and logs updated.\n", "utf8");
  await writeFile(path.join(taskADirectory, "qa.md"), "# QA\n\n- Status: passed\n", "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), "# Result\n\nTask A passed.\n", "utf8");
  assert.equal(run(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]).ok, true);
  assert.equal(run(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]).ok, true);
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  assert.equal(JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-b.json"), "utf8")).taskId, "task-b");
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "recent", "task-a.md"), "utf8"), /Task A passed/);

  const taskC = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--operation", "create-feature"]);
  assert.equal(taskC.activeTask.requestedBy, "Alice");
  run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--summary", "Implementation returned for QA"]);
  const taskCDirectory = path.join(temp, ".agrimap-agent", "tasks", "task-c");
  await writeFile(path.join(taskCDirectory, "qa.md"), "# QA\n\n- Status: failed\n\nReproducible defect.\n", "utf8");
  await writeFile(path.join(taskCDirectory, "result.md"), "# Result\n\n- Outcome: `qa-failed`\n", "utf8");
  const nextPrompt = path.join(temp, ".agrimap-agent", "prompts", "task-c-fix", "executor.md");
  await mkdir(path.dirname(nextPrompt), { recursive: true });
  await writeFile(nextPrompt, "# Proposed correction prompt\n", "utf8");
  const closedC = run(workspaceScript, [
    "close", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--status", "qa-failed",
    "--next-prompt", ".agrimap-agent/prompts/task-c-fix/executor.md",
  ]);
  assert.equal(closedC.complete, false);
  assert.equal(closedC.status, "qa-failed");
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "recent", "task-c.md"), "utf8"), /qa-failed/);
  const taskCLog = await readTaskLog("task-c");
  assert.equal(taskCLog.at(-1).event, "qa-failed");

  run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-d", "--operation", "analyze"]);
  const taskDDirectory = path.join(temp, ".agrimap-agent", "tasks", "task-d");
  await writeFile(path.join(taskDDirectory, "result.md"), "# Result\n\n- Outcome: `cancelled`\n", "utf8");
  const closedD = run(workspaceScript, [
    "close", "--cwd", temp, "--session", "session-a", "--task", "task-d", "--status", "cancelled",
  ]);
  assert.equal(closedD.status, "cancelled");
  const taskDLog = await readTaskLog("task-d");
  assert.equal(taskDLog.at(-1).event, "cancelled");

  for (const taskId of ["task-a", "task-b", "task-c", "task-d"]) {
    assert.equal((await readTaskLog(taskId)).every((entry) => logEventSet.has(entry.event)), true);
  }

  const sourceDirectory = path.join(temp, "src", "app", "shared");
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(
    path.join(sourceDirectory, "data-table.component.ts"),
    "@Component({ selector: 'agm-data-table' })\nexport class DataTableComponent {}\nexport function paginateRows() { return []; }\n",
    "utf8",
  );
  const index = ".agrimap-agent/knowledge/frontend-reuse-test.jsonl";
  const scanned = run(reuseScript, ["scan", "--cwd", temp, "--paths", "src", "--index", index, "--by", "test-scanner"]);
  assert.equal(scanned.discovered, 2);
  const reuseEntries = (await readFile(path.join(temp, index), "utf8")).trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(reuseEntries.find((entry) => entry.symbol === "DataTableComponent").kind, "component");
  assert.equal(reuseEntries.find((entry) => entry.symbol === "paginateRows").kind, "function");
  const searched = run(reuseScript, ["search", "--cwd", temp, "--index", index, "--query", "data table"]);
  assert.ok(searched.count >= 1);
  const componentId = reuseEntries.find((entry) => entry.symbol === "DataTableComponent").id;
  run(reuseScript, ["deprecate", "--cwd", temp, "--index", index, "--id", componentId, "--by", "Alice", "--reason", "Replaced in test"]);
  const excluded = run(reuseScript, ["search", "--cwd", temp, "--index", index, "--query", "DataTableComponent"]);
  assert.equal(excluded.results.some((result) => result.entry.id === componentId), false);
  const validated = run(reuseScript, ["validate", "--cwd", temp, "--index", index]);
  assert.equal(validated.ok, true);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    cases: [
      "missing requester blocks substantive task start",
      "shared CLI parsing preserves boolean flags and key-value options",
      "code extraction ignores Markdown headings inside fenced blocks",
      "prune is fail-safe without valid config and stays within recent memory",
      "target project initializes tracked state while ignoring only runtime and cache",
      "two sessions retain different requester and structured model-role-agent-provider identity",
      "checkpoint logs use structured execution identity without actor composites",
      "log events reject undocumented values and preserve memory/log state",
      "completion gate archives only its own session task",
      "QA failure closes without completion and requires a separate next-task prompt",
      "non-complete task outcomes use documented log events",
      "workspace initializes the canonical service ownership source of trust",
      "hooks load only current-session identity",
      "hook arguments survive boolean flags and providers are never inferred from environment variables",
      "Claude injects project memory at session start and refreshes changed task context only once",
      "subagent hook reinforces file ownership and sandbox integration",
      "frontend reuse scan/search/deprecate/validate",
    ],
  }, null, 2)}\n`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
