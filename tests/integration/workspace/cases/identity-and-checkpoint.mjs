import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOG_EVENTS, QA_FAILED_EVENT } from "../../../../skills/agrimap-agent-skills/scripts/log-events.mjs";

const logEventSet = new Set(LOG_EVENTS);

export async function identityAndCheckpoint(harness) {
  const { temp, run, spawn, readTaskLog } = harness;
  const workspaceScript = harness.scripts.workspace;

  const missingRequester = spawn(workspaceScript, [
    "start", "--cwd", temp, "--session", "unknown", "--task", "should-not-start",
    "--title", "Must not start without attribution",
  ]);
  assert.notEqual(missingRequester.status, 0);
  assert.equal(JSON.parse(missingRequester.stdout).needsRequester, true);

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-a", "--owner", "Alice", "--model", "gpt-5.6-sol", "--role", "leader", "--agent", "primary", "--provider", "codex"]);
  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-b", "--owner", "Bob", "--model", "fable", "--role", "leader", "--agent", "primary", "--provider", "claude"]);
  const missingObjective = spawn(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "missing-objective"]);
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
  const directFeatureStart = spawn(workspaceScript, ["start", "--cwd", temp, "--session", "session-b", "--task", "direct-feature", "--operation", "create-feature", "--title", "Build directly without workflow state"]);
  assert.equal(directFeatureStart.status, 1);
  assert.deepEqual(
    { code: JSON.parse(directFeatureStart.stdout).code, routeTo: JSON.parse(directFeatureStart.stdout).routeTo },
    { code: "CREATE_FEATURE_TRACKING_FORBIDDEN", routeTo: "agm-create-prompt" },
  );
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "tasks", "direct-feature", "brief.md"), "utf8"), { code: "ENOENT" });

  const taskB = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--operation", "create-prompt", "--title", "Prepare task B feature contract"]);
  run(workspaceScript, ["identify", "--cwd", temp, "--session", "collision-session", "--owner", "Mallory"]);
  const taskIdCollision = spawn(workspaceScript, [
    "start", "--cwd", temp, "--session", "collision-session", "--task", "task-a", "--title", "Must not mix attribution",
  ]);
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
  for (const scaffold of ["brief.md", "checklist.md"]) {
    assert.equal(typeof await readFile(path.join(temp, ".agrimap-agent", "tasks", "task-b", scaffold), "utf8"), "string");
  }
  for (const deferred of ["qa.md", "result.md"]) {
    await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "tasks", "task-b", deferred), "utf8"), { code: "ENOENT" });
  }

  const checkpointA = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-a", "--summary", "Analyzed task A", "--files", "src/a.ts", "--verification", "inspection passed", "--model", "gpt-5.4", "--role", "executor", "--agent", "be", "--provider", "codex"]);
  const checkpointB = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--summary", "Analyzed task B", "--files", "src/b.ts"]);
  assert.equal(checkpointA.requestedBy, "Alice");
  assert.equal(checkpointA.milestone, "acceptance-slice");
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
  const taskALogEntries = await readTaskLog("task-a");
  assert.equal(taskALogEntries[0].request, "Analyze task A audit behavior");
  assert.equal(taskALogEntries.every((entry) => entry.schemaVersion === 3 && new Date(entry.timestamp).toISOString() === entry.timestamp), true);
  assert.equal(taskALogEntries[0].workflowDepth, "regulated");
  assert.equal(taskALogEntries[1].milestone, "acceptance-slice");
  assert.equal(taskALogEntries.every((entry) => logEventSet.has(entry.event)), true);
  assert.equal(taskALogEntries.every((entry) => entry.gitHead === null && entry.gitDirty === null), true);

  const verboseCheckpoint = run(workspaceScript, [
    "checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-a", "--event", "decision",
    "--summary", "S".repeat(320), "--reason", "R".repeat(520), "--concerns", "C".repeat(520),
    "--verification", Array.from({ length: 10 }, (_, index) => `${index}-${"V".repeat(320)}`).join(","),
  ]);
  assert.deepEqual(verboseCheckpoint.compaction, {
    summaryTruncated: true,
    reasonTruncated: true,
    concernsTruncated: true,
    verificationItemsOmitted: 2,
    verificationItemsTruncated: 8,
  });
  const compactedEvent = (await readTaskLog("task-a")).at(-1);
  assert.equal(compactedEvent.summary.length, 240);
  assert.equal(compactedEvent.reason.length, 400);
  assert.equal(compactedEvent.verification.length, 8);
  assert.equal(compactedEvent.verification.every((item) => item.length === 300), true);

  const taskBMemoryPath = path.join(temp, ".agrimap-agent", "memory", "current", "task-b.md");
  const taskBLogBeforeInvalidEvent = JSON.stringify(await readTaskLog("task-b"));
  const taskBMemoryBeforeInvalidEvent = await readFile(taskBMemoryPath, "utf8");
  const invalidEventCheckpoint = spawn(workspaceScript, [
    "checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b",
    "--summary", "This checkpoint must be rejected", "--event", "not-documented",
  ]);
  assert.equal(invalidEventCheckpoint.status, 1);
  const invalidEventResult = JSON.parse(invalidEventCheckpoint.stdout);
  assert.equal(invalidEventResult.code, "INVALID_LOG_EVENT");
  assert.match(invalidEventResult.message, new RegExp(`${QA_FAILED_EVENT}\\|blocked\\|cancelled`));
  assert.equal(JSON.stringify(await readTaskLog("task-b")), taskBLogBeforeInvalidEvent);
  assert.equal(await readFile(taskBMemoryPath, "utf8"), taskBMemoryBeforeInvalidEvent);

  const invalidTerminalCheckpoint = spawn(workspaceScript, [
    "checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b",
    "--summary", "Terminal event belongs to close", "--event", "completed",
  ]);
  assert.equal(invalidTerminalCheckpoint.status, 1);
  assert.equal(JSON.parse(invalidTerminalCheckpoint.stdout).code, "CHECKPOINT_EVENT_NOT_MILESTONE");

  const missingChangedFiles = spawn(workspaceScript, [
    "checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b",
    "--summary", "A changed event without file attribution must be rejected",
  ]);
  assert.equal(missingChangedFiles.status, 1);
  assert.equal(JSON.parse(missingChangedFiles.stdout).code, "CHANGED_FILES_REQUIRED");
  assert.equal(JSON.stringify(await readTaskLog("task-b")), taskBLogBeforeInvalidEvent);
  assert.equal(await readFile(taskBMemoryPath, "utf8"), taskBMemoryBeforeInvalidEvent);
}
