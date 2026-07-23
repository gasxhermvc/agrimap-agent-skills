import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOG_EVENTS, QA_FAILED_EVENT } from "../../../../skills/agrimap-agent-skills/scripts/log-events.mjs";

const logEventSet = new Set(LOG_EVENTS);

export async function identityAndCheckpoint(harness) {
  const { temp, run, spawn, readTaskLog } = harness;
  const workspaceScript = harness.scripts.workspace;
  const state = path.join(temp, ".agrimap-agent");

  const missingRequester = spawn(workspaceScript, ["start", "--cwd", temp, "--session", "unknown", "--execution", "01010001", "--title", "Must not start without attribution"]);
  assert.equal(JSON.parse(missingRequester.stdout).needsRequester, true);

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-a", "--owner", "Alice", "--model", "gpt-5.6-sol", "--role", "leader", "--agent", "primary", "--provider", "codex"]);
  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-b", "--owner", "Bob", "--model", "fable", "--role", "leader", "--agent", "primary", "--provider", "claude"]);
  const identityA = JSON.parse(await readFile(path.join(state, "runtime", "sessions", "session-a.json"), "utf8"));
  assert.equal(identityA.identitySource, "manual-confirmed");
  assert.equal(typeof identityA.machine, "string");

  const light = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-b", "--execution", "01010002", "--operation", "analyze", "--depth", "light", "--title", "Artifactless direct analysis"]);
  assert.equal(light.activeTask.taskId, null);
  assert.equal(light.activeTask.workflowDepth, "light");
  await assert.rejects(readFile(path.join(state, "tasks", light.activeTask.period, "01010002", "brief.md"), "utf8"), { code: "ENOENT" });
  assert.match(await readFile(path.join(state, light.activeTask.currentMemoryPath), "utf8"), /Task ID: not-applicable/);
  const lightLog = await readTaskLog("01010002");
  assert.equal(lightLog[0].schema_version, 4);
  assert.equal(lightLog[0].task_id, null);
  assert.equal(lightLog[0].workflow_depth, "light");
  const lightClose = run(workspaceScript, ["close", "--cwd", temp, "--session", "session-b", "--execution", "01010002", "--status", "cancelled", "--reason", "Fixture closed"]);
  assert.equal(lightClose.promptsMoved, false);
  await assert.rejects(readFile(path.join(state, light.activeTask.currentMemoryPath), "utf8"), { code: "ENOENT" });
  assert.equal(typeof await readFile(path.join(state, lightClose.report), "utf8"), "string");

  const taskA = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--execution", "01010003", "--operation", "analyze", "--depth", "regulated", "--title", "Analyze task A audit behavior", "--requester-authority", "owner", "--decision-owner", "Alice", "--authority-evidence", "confirmed in test"]);
  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-b", "--owner", "Bob", "--model", "fable", "--provider", "claude"]);
  const taskB = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-b", "--execution", "01010004", "--operation", "create-prompt", "--depth", "regulated", "--title", "Prepare task B feature contract", "--requester-authority", "owner", "--decision-owner", "Bob", "--authority-evidence", "confirmed in test"]);
  assert.equal(taskA.activeTask.taskId, "01010003");
  assert.equal(taskB.activeTask.taskId, "01010004");
  for (const active of [taskA.activeTask, taskB.activeTask]) {
    for (const scaffold of ["brief.md", "checklists.md"]) assert.equal(typeof await readFile(path.join(state, active.taskPath, scaffold), "utf8"), "string");
    for (const deferred of ["analysis.md", "qa.md", "result.md"]) await assert.rejects(readFile(path.join(state, active.taskPath, deferred), "utf8"), { code: "ENOENT" });
  }

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "collision-session", "--owner", "Mallory"]);
  const collision = spawn(workspaceScript, ["start", "--cwd", temp, "--session", "collision-session", "--execution", "01010003", "--title", "Must not merge"]);
  assert.equal(JSON.parse(collision.stdout).code, "RUN_ID_COLLISION");

  const checkpointA = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--execution", "01010003", "--summary", "Analyzed task A", "--files", "src/a.ts", "--verification", "inspection passed", "--model", "gpt-5.4", "--role", "executor", "--agent", "be", "--provider", "codex"]);
  const checkpointB = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--execution", "01010004", "--summary", "Analyzed task B", "--files", "src/b.ts"]);
  assert.equal(checkpointA.requestedBy, "Alice");
  assert.equal(checkpointB.requestedBy, "Bob");
  assert.match(await readFile(path.join(state, taskA.activeTask.currentMemoryPath), "utf8"), /Requested by: Alice/);
  assert.match(await readFile(path.join(state, taskB.activeTask.currentMemoryPath), "utf8"), /Requested by: Bob/);

  const events = await readTaskLog("01010003");
  assert.equal(events.every((event) => event.schema_version === 4 && event.execution_id === "01010003"), true);
  assert.equal(events[0].request, "Analyze task A audit behavior");
  assert.equal(events[1].milestone, "acceptance-slice");
  assert.equal(events.every((event) => logEventSet.has(event.event)), true);
  assert.equal(events.every((event) => !("machine" in event) && !("osUser" in event)), true);

  const verbose = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--execution", "01010003", "--event", "decision", "--summary", "S".repeat(320), "--reason", "R".repeat(520), "--concerns", "C".repeat(520), "--verification", Array.from({ length: 10 }, (_, index) => `${index}-${"V".repeat(320)}`).join(",")]);
  assert.deepEqual(verbose.compaction, { summaryTruncated: true, reasonTruncated: true, concernsTruncated: true, verificationItemsOmitted: 2, verificationItemsTruncated: 8 });
  const compacted = (await readTaskLog("01010003")).at(-1);
  assert.equal(compacted.message.length, 240);
  assert.equal(compacted.reason.length, 400);
  assert.equal(compacted.verification.length, 8);

  const before = JSON.stringify(await readTaskLog("01010004"));
  const invalidEvent = spawn(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--execution", "01010004", "--summary", "Rejected", "--event", "not-documented"]);
  assert.match(JSON.parse(invalidEvent.stdout).message, new RegExp(`${QA_FAILED_EVENT}\\|blocked\\|cancelled`));
  assert.equal(JSON.stringify(await readTaskLog("01010004")), before);
  const invalidTerminal = spawn(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--execution", "01010004", "--summary", "Terminal", "--event", "completed"]);
  assert.equal(JSON.parse(invalidTerminal.stdout).code, "CHECKPOINT_EVENT_NOT_MILESTONE");
  const missingFiles = spawn(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--execution", "01010004", "--summary", "Changed without files"]);
  assert.equal(JSON.parse(missingFiles.stdout).code, "CHANGED_FILES_REQUIRED");
}
