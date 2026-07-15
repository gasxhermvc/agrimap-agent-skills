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

  const missingRequester = spawnSync(process.execPath, [workspaceScript, "start", "--cwd", temp, "--session", "unknown", "--task", "should-not-start", "--title", "Must not start without attribution"], { encoding: "utf8" });
  assert.notEqual(missingRequester.status, 0);
  assert.equal(JSON.parse(missingRequester.stdout).needsRequester, true);

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-a", "--owner", "Alice", "--model", "gpt-5.6-sol", "--role", "leader", "--agent", "primary", "--provider", "codex"]);
  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-b", "--owner", "Bob", "--model", "fable", "--role", "leader", "--agent", "primary", "--provider", "claude"]);
  const missingObjective = spawnSync(process.execPath, [workspaceScript, "start", "--cwd", temp, "--session", "session-a", "--task", "missing-objective"], { encoding: "utf8" });
  assert.equal(missingObjective.status, 1);
  assert.equal(JSON.parse(missingObjective.stdout).code, "REQUEST_OBJECTIVE_REQUIRED");
  const identityA = JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "sessions", "session-a.json"), "utf8"));
  assert.equal(identityA.schemaVersion, 1);
  assert.equal(identityA.identitySource, "manual-confirmed");
  assert.equal(Number.isFinite(Date.parse(identityA.confirmedAt)), true);
  assert.equal(Date.parse(identityA.expiresAt) > Date.parse(identityA.confirmedAt), true);
  assert.equal(typeof identityA.machine, "string");
  assert.equal(typeof identityA.osUser, "string");

  const taskA = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-a", "--operation", "analyze", "--title", "Analyze task A audit behavior"]);
  const taskB = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--operation", "create-feature", "--title", "Build task B feature"]);
  run(workspaceScript, ["identify", "--cwd", temp, "--session", "collision-session", "--owner", "Mallory"]);
  const taskIdCollision = spawnSync(process.execPath, [
    workspaceScript, "start", "--cwd", temp, "--session", "collision-session", "--task", "task-a", "--title", "Must not mix attribution",
  ], { encoding: "utf8" });
  assert.equal(taskIdCollision.status, 1);
  assert.equal(JSON.parse(taskIdCollision.stdout).code, "TASK_ID_EXISTS");
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
  assert.equal(taskALog.includes('"machine"'), false);
  assert.equal(taskALog.includes('"osUser"'), false);
  assert.equal((await readTaskLog("task-a"))[0].request, "Analyze task A audit behavior");
  assert.equal((await readTaskLog("task-a")).every((entry) => entry.schemaVersion === 1 && new Date(entry.timestamp).toISOString() === entry.timestamp), true);
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
  assert.match(hookA.hookSpecificOutput.additionalContext, /Confirmed session requester: Alice/);
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
  assert.match(repeatedHookA.hookSpecificOutput.additionalContext, /Confirmed session requester: Alice/);
  assert.doesNotMatch(repeatedHookA.hookSpecificOutput.additionalContext, /Current task memory/);
  await writeFile(path.join(temp, ".agrimap-agent", "memory", "project.md"), "# Project memory\n\n- Audit history must remain queryable.\n", "utf8");
  const changedProjectMemoryHook = run(hookScript, ["--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "BeforeAgent",
  });
  assert.match(changedProjectMemoryHook.hookSpecificOutput.additionalContext, /Project memory \(changed since the last hook refresh\)/);
  assert.match(changedProjectMemoryHook.hookSpecificOutput.additionalContext, /Audit history must remain queryable/);

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
  assert.match(unchangedClaudePrompt.hookSpecificOutput.additionalContext, /Confirmed session requester: Bob/);
  assert.doesNotMatch(unchangedClaudePrompt.hookSpecificOutput.additionalContext, /Current task memory/);

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
  assert.match(repeatedClaudePrompt.hookSpecificOutput.additionalContext, /Confirmed session requester: Bob/);
  assert.doesNotMatch(repeatedClaudePrompt.hookSpecificOutput.additionalContext, /Current task memory/);

  const hookUnknown = run(hookScript, ["--provider", "claude", "--mode", "session"], {
    cwd: temp,
    session_id: "new-session",
    hook_event_name: "SessionStart",
  });
  assert.match(hookUnknown.hookSpecificOutput.additionalContext, /Session requester is unknown/);
  assert.doesNotMatch(hookUnknown.hookSpecificOutput.additionalContext, /Confirmed session requester: Bob/);

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "transcript-fallback.jsonl", "--owner", "Carol", "--provider", "gemini"]);
  const transcriptFallbackHook = run(hookScript, ["--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    transcript_path: path.join(temp, "transcript-fallback.jsonl"),
    hook_event_name: "BeforeAgent",
  });
  assert.match(transcriptFallbackHook.hookSpecificOutput.additionalContext, /Session: transcript-fallback\.jsonl \(derived from transcript path\)/);
  assert.match(transcriptFallbackHook.hookSpecificOutput.additionalContext, /Confirmed session requester: Carol/);

  const expiredIdentityResult = run(workspaceScript, ["identify", "--cwd", temp, "--session", "expired-session", "--owner", "Dana"]);
  await writeFile(
    path.join(temp, ".agrimap-agent", "runtime", "sessions", "expired-session.json"),
    `${JSON.stringify({ ...expiredIdentityResult.identity, confirmedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-01-02T00:00:00.000Z" }, null, 2)}\n`,
    "utf8",
  );
  const expiredStart = spawnSync(process.execPath, [
    workspaceScript, "start", "--cwd", temp, "--session", "expired-session", "--task", "expired-task", "--title", "Must reconfirm requester",
  ], { encoding: "utf8" });
  assert.equal(expiredStart.status, 1);
  assert.equal(JSON.parse(expiredStart.stdout).identityExpired, true);

  await writeFile(
    path.join(temp, ".agrimap-agent", "runtime", "sessions", "legacy-session.json"),
    `${JSON.stringify({ requestedBy: "Eve", actor: "legacy-model", role: "leader", provider: "claude", updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  const legacyHook = run(hookScript, ["--provider", "claude", "--mode", "task"], {
    cwd: temp,
    session_id: "legacy-session",
    hook_event_name: "UserPromptSubmit",
  });
  assert.match(legacyHook.hookSpecificOutput.additionalContext, /Confirmed session requester: Eve/);
  assert.match(legacyHook.hookSpecificOutput.additionalContext, /model=legacy-model/);

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
  const taskAActivePath = path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json");
  const taskAMemoryPath = path.join(temp, ".agrimap-agent", "memory", "current", "task-a.md");
  const taskARecentPath = path.join(temp, ".agrimap-agent", "memory", "recent", "task-a.md");
  const taskAActiveBeforePlaceholder = await readFile(taskAActivePath, "utf8");
  const taskAMemoryBeforePlaceholder = await readFile(taskAMemoryPath, "utf8");
  const taskALogBeforePlaceholder = JSON.stringify(await readTaskLog("task-a"));
  await writeFile(path.join(taskADirectory, "brief.md"), "# Task brief\n\n- Requested by: {{requested_by}}\n- Objective: Define before implementation.\n- Scope: <scope>\n- Non-goals: TODO\n", "utf8");
  await writeFile(path.join(taskADirectory, "checklist.md"), "# Checklist\n\n- [x] {{checklist_status}}\n- [x] <remaining-check>\n", "utf8");
  await writeFile(path.join(taskADirectory, "qa.md"), "# QA\n\n- Status: `passed|failed|blocked|not-applicable`\n- Read-only: <true>\n\n## Requirement evidence\n\n{{requirement_to_evidence}}\n\n## Commands and observed results\n\n{{verification}}\n", "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), "# Result\n\n- Outcome: `completed|qa-failed|blocked|cancelled`\n- Requested by: {{requested_by}}\n- QA status: `passed|failed|blocked|not-applicable`\n\n## Changes and verification\n\n{{files_behavior_and_evidence}}\n\n## Checklist and memory\n\n{{checklist_status}}\n", "utf8");
  const placeholderCompletion = spawnSync(process.execPath, [
    workspaceScript, "complete", "--cwd", temp, "--session", "session-a", "--task", "task-a",
  ], { encoding: "utf8" });
  assert.equal(placeholderCompletion.status, 1);
  const placeholderValidation = JSON.parse(placeholderCompletion.stdout);
  assert.equal(placeholderValidation.ok, false);
  assert.deepEqual(
    [...new Set(placeholderValidation.placeholderFailures.map((failure) => failure.file))].sort(),
    ["brief.md", "checklist.md", "qa.md", "result.md"],
  );
  assert.equal(placeholderValidation.contentFailures.some((failure) => failure.reason === "scaffold-placeholder"), true);
  assert.equal(placeholderValidation.contentFailures.some((failure) => failure.reason === "angle-placeholder"), true);
  assert.equal(placeholderValidation.contentFailures.some((failure) => failure.reason === "todo-placeholder"), true);
  assert.equal(placeholderValidation.contentFailures.some((failure) => failure.reason === "unresolved-choice"), true);
  assert.equal(await readFile(taskAActivePath, "utf8"), taskAActiveBeforePlaceholder);
  assert.equal(await readFile(taskAMemoryPath, "utf8"), taskAMemoryBeforePlaceholder);
  assert.equal(JSON.stringify(await readTaskLog("task-a")), taskALogBeforePlaceholder);
  await assert.rejects(readFile(taskARecentPath, "utf8"), { code: "ENOENT" });

  await writeFile(path.join(taskADirectory, "brief.md"), "# Task brief\n\n- Task ID: `task-a`\n- Requested by: Alice\n- Objective: Analyze Angular {{orderStatus}} behavior.\n- Scope: Task A artifacts and evidence.\n- Non-goals: Unrelated task changes.\n", "utf8");
  await writeFile(path.join(taskADirectory, "checklist.md"), "# Checklist\n\n- [x] Scope and Angular {{orderStatus}} behavior inspected.\n- [x] Work verified.\n- [x] Memory and logs updated.\n", "utf8");
  await writeFile(path.join(taskADirectory, "qa.md"), "# QA\n\n- Status: passed\n- Requested by: Alice\n- Read-only: true\n\n## Requirement evidence\n\nTODO\n\n## Commands and observed results\n\n- Targeted inspection passed.\n", "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), "# Result\n\n- Outcome: completed\n- Requested by: Alice\n- QA status: passed\n\n## Changes and verification\n\n<files_behavior_and_evidence>\n\n## Checklist and memory\n\nDefine before implementation.\n", "utf8");
  const sectionScaffoldCompletion = spawnSync(process.execPath, [
    workspaceScript, "complete", "--cwd", temp, "--session", "session-a", "--task", "task-a",
  ], { encoding: "utf8" });
  assert.equal(sectionScaffoldCompletion.status, 1);
  const sectionScaffoldValidation = JSON.parse(sectionScaffoldCompletion.stdout);
  assert.equal(sectionScaffoldValidation.ok, false);
  assert.deepEqual(sectionScaffoldValidation.placeholderFailures, []);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "Requirement evidence" && failure.reason === "todo-placeholder"), true);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "Changes and verification" && failure.reason === "angle-placeholder"), true);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "Checklist and memory" && failure.reason === "scaffold-placeholder"), true);
  assert.equal(await readFile(taskAActivePath, "utf8"), taskAActiveBeforePlaceholder);
  assert.equal(await readFile(taskAMemoryPath, "utf8"), taskAMemoryBeforePlaceholder);
  assert.equal(JSON.stringify(await readTaskLog("task-a")), taskALogBeforePlaceholder);
  await assert.rejects(readFile(taskARecentPath, "utf8"), { code: "ENOENT" });

  await writeFile(path.join(taskADirectory, "qa.md"), "# QA\n\n- Status: passed\n- Requested by: Alice\n- Read-only: true\n\n## Requirement evidence\n\n- Task A requirements map to inspected Angular {{orderStatus}} evidence.\n\n## Commands and observed results\n\n- Targeted inspection passed.\n", "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), "# Result\n\n- Outcome: completed\n- Requested by: Alice\n- QA status: passed\n\n## Changes and verification\n\nTask A passed targeted inspection, including Angular {{orderStatus}} interpolation.\n\n## Checklist and memory\n\nChecklist, memory, and logs are complete.\n", "utf8");
  assert.equal(run(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]).ok, true);
  assert.equal(run(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]).ok, true);
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  assert.equal(JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-b.json"), "utf8")).taskId, "task-b");
  assert.match(await readFile(taskARecentPath, "utf8"), /Task A passed targeted inspection/);

  const taskC = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--operation", "create-feature", "--title", "Implement task C and send it to QA"]);
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

  run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-d", "--operation", "analyze", "--title", "Analyze task D before cancellation"]);
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

  await writeFile(
    path.join(temp, ".agrimap-agent", "logs", new Date().toISOString().slice(0, 7), "malformed-audit.jsonl"),
    "{malformed audit fixture}\n",
    "utf8",
  );
  const todayUtc = new Date().toISOString().slice(0, 10);
  const aliceHistory = run(workspaceScript, ["history", "--cwd", temp, "--requester", "alice", "--days", "5"]);
  assert.equal(aliceHistory.ok, true);
  assert.equal(aliceHistory.timeBasis, "UTC");
  assert.equal(aliceHistory.events.every((event) => event.requestedBy === "Alice"), true);
  assert.equal(aliceHistory.events.every((event) => new Date(event.timestamp).toISOString() === event.timestamp), true);
  assert.equal(aliceHistory.invalidLines.some((line) => line.reason === "invalid-json"), true);
  assert.equal(aliceHistory.tasks.find((task) => task.taskId === "task-a").request, "Analyze task A audit behavior");
  assert.match(aliceHistory.tasks.find((task) => task.taskId === "task-a").artifacts.recentMemory, /memory\/recent\/task-a\.md$/);
  assert.equal(aliceHistory.requesters.find((requester) => requester.requestedBy === "Alice").taskIds.includes("task-c"), true);
  const dateHistory = run(workspaceScript, ["history", "--cwd", temp, "--from", todayUtc, "--to", todayUtc]);
  assert.equal(dateHistory.count >= aliceHistory.count, true);
  assert.equal(dateHistory.filters.from, `${todayUtc}T00:00:00.000Z`);
  assert.equal(dateHistory.filters.toExclusive, new Date(Date.parse(`${todayUtc}T00:00:00.000Z`) + 86_400_000).toISOString());
  const ambiguousTimeHistory = spawnSync(process.execPath, [
    workspaceScript, "history", "--cwd", temp, "--from", `${todayUtc}T10:00`,
  ], { encoding: "utf8" });
  assert.equal(ambiguousTimeHistory.status, 1);
  assert.equal(JSON.parse(ambiguousTimeHistory.stdout).code, "INVALID_TIME_RANGE");
  const bobHistory = run(workspaceScript, ["history", "--cwd", temp, "--requester", "Bob", "--days", "5"]);
  assert.equal(bobHistory.events.every((event) => event.requestedBy === "Bob"), true);
  assert.equal(bobHistory.tasks.some((task) => task.taskId === "task-b"), true);

  const ambiguousActiveDirectory = path.join(temp, ".agrimap-agent", "runtime", "active");
  await writeFile(path.join(ambiguousActiveDirectory, "ambiguous-one.json"), `${JSON.stringify({ taskId: "ambiguous-task", sessionId: "ambiguous-one", requestedBy: "Alice" })}\n`, "utf8");
  await writeFile(path.join(ambiguousActiveDirectory, "ambiguous-two.json"), `${JSON.stringify({ taskId: "ambiguous-task", sessionId: "ambiguous-two", requestedBy: "Bob" })}\n`, "utf8");
  const ambiguousCheckpoint = spawnSync(process.execPath, [
    workspaceScript, "checkpoint", "--cwd", temp, "--task", "ambiguous-task", "--summary", "Must not inherit the first session",
  ], { encoding: "utf8" });
  assert.equal(ambiguousCheckpoint.status, 1);
  const ambiguousResult = JSON.parse(ambiguousCheckpoint.stdout);
  assert.equal(ambiguousResult.code, "AMBIGUOUS_ACTIVE_TASK");
  assert.deepEqual(ambiguousResult.sessions.map((entry) => entry.sessionId).sort(), ["ambiguous-one", "ambiguous-two"]);
  await rm(path.join(ambiguousActiveDirectory, "ambiguous-one.json"));
  await rm(path.join(ambiguousActiveDirectory, "ambiguous-two.json"));

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
      "new task start requires a durable request objective",
      "tracked task IDs cannot be reused across requesters",
      "shared CLI parsing preserves boolean flags and key-value options",
      "code extraction ignores Markdown headings inside fenced blocks",
      "prune is fail-safe without valid config and stays within recent memory",
      "target project initializes tracked state while ignoring only runtime and cache",
      "two sessions retain different requester and structured model-role-agent-provider identity",
      "checkpoint logs use structured execution identity without actor composites",
      "versioned logs retain exact UTC timestamps and the original request without local machine metadata",
      "log events reject undocumented values and preserve memory/log state",
      "completion gate archives only its own session task",
      "completion gate rejects unresolved placeholders without mutating task state",
      "completion gate rejects section scaffolds while allowing non-workflow moustache syntax",
      "QA failure closes without completion and requires a separate next-task prompt",
      "non-complete task outcomes use documented log events",
      "workspace initializes the canonical service ownership source of trust",
      "hooks load only current-session identity",
      "hook identity survives transcript-key fallback, legacy schema migration, and every-prompt memory deduplication",
      "changed project memory refreshes on the next prompt without suppressing the identity envelope",
      "expired requester identity blocks task start until reconfirmed",
      "hook arguments survive boolean flags and providers are never inferred from environment variables",
      "Claude injects project memory at session start and refreshes changed task context only once",
      "history queries return requester work by rolling days and inclusive UTC date range with artifact pointers",
      "history rejects timezone-ambiguous timestamps",
      "history reports malformed durable log lines instead of silently omitting audit gaps",
      "ambiguous active sessions require an explicit session instead of inheriting the first match",
      "subagent hook reinforces file ownership and sandbox integration",
      "frontend reuse scan/search/deprecate/validate",
    ],
  }, null, 2)}\n`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
