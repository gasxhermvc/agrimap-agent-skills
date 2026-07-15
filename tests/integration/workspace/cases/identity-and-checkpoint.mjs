import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOG_EVENTS } from "../../../../skills/agrimap-agent-skills/scripts/log-events.mjs";

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
  const taskB = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--operation", "create-feature", "--title", "Build task B feature"]);
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
  const taskALogEntries = await readTaskLog("task-a");
  assert.equal(taskALogEntries[0].request, "Analyze task A audit behavior");
  assert.equal(taskALogEntries.every((entry) => entry.schemaVersion === 2 && new Date(entry.timestamp).toISOString() === entry.timestamp), true);
  assert.equal(taskALogEntries.every((entry) => logEventSet.has(entry.event)), true);
  assert.equal(taskALogEntries.every((entry) => entry.gitHead === null && entry.gitDirty === null), true);

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
  assert.match(invalidEventResult.message, /qa-failed\|blocked\|cancelled/);
  assert.equal(JSON.stringify(await readTaskLog("task-b")), taskBLogBeforeInvalidEvent);
  assert.equal(await readFile(taskBMemoryPath, "utf8"), taskBMemoryBeforeInvalidEvent);

  const missingChangedFiles = spawn(workspaceScript, [
    "checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b",
    "--summary", "A changed event without file attribution must be rejected",
  ]);
  assert.equal(missingChangedFiles.status, 1);
  assert.equal(JSON.parse(missingChangedFiles.stdout).code, "CHANGED_FILES_REQUIRED");
  assert.equal(JSON.stringify(await readTaskLog("task-b")), taskBLogBeforeInvalidEvent);
  assert.equal(await readFile(taskBMemoryPath, "utf8"), taskBMemoryBeforeInvalidEvent);
}
