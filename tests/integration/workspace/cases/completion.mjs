import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOG_EVENTS } from "../../../../skills/agrimap-agent-skills/scripts/log-events.mjs";

const logEventSet = new Set(LOG_EVENTS);

export async function completion(harness) {
  const { temp, run, spawn, readTaskLog } = harness;
  const workspaceScript = harness.scripts.workspace;

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
  const placeholderCompletion = spawn(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]);
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
  const sectionScaffoldCompletion = spawn(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]);
  assert.equal(sectionScaffoldCompletion.status, 1);
  const sectionScaffoldValidation = JSON.parse(sectionScaffoldCompletion.stdout);
  assert.equal(sectionScaffoldValidation.ok, false);
  assert.deepEqual(sectionScaffoldValidation.placeholderFailures, []);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "Requirement evidence" && failure.reason === "todo-placeholder"), true);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "Changes and verification" && failure.reason === "angle-placeholder"), true);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "Checklist and memory" && failure.reason === "scaffold-placeholder"), true);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "QA mode" && failure.reason === "missing"), true);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "Patterns" && failure.reason === "missing"), true);
  assert.equal(sectionScaffoldValidation.contentFailures.some((failure) => failure.field === "Outstanding items" && failure.reason === "missing"), true);
  assert.equal(await readFile(taskAActivePath, "utf8"), taskAActiveBeforePlaceholder);
  assert.equal(await readFile(taskAMemoryPath, "utf8"), taskAMemoryBeforePlaceholder);
  assert.equal(JSON.stringify(await readTaskLog("task-a")), taskALogBeforePlaceholder);
  await assert.rejects(readFile(taskARecentPath, "utf8"), { code: "ENOENT" });

  await writeFile(path.join(taskADirectory, "qa.md"), "# QA\n\n- Status: passed\n- QA mode: fast\n- Patterns: patterns/frontend.md\n- Requested by: Alice\n- QA model: gemini-cli-default\n- QA role: qa\n- QA agent: qa\n- QA provider: gemini\n- Read-only: true\n- Implementation model: gpt-5.6-sol\n- Implementation role: leader\n- Implementation agent: primary\n- Implementation provider: codex\n\n## Requirement evidence\n\n- Task A requirements map to inspected Angular {{orderStatus}} evidence.\n\n## Commands and observed results\n\n- Targeted inspection passed.\n", "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), "# Result\n\n- Outcome: completed\n- Requested by: Alice\n- QA status: passed\n- QA mode: fast\n- Delivery boundary: release\n\n## Changes and verification\n\nTask A passed targeted inspection, including Angular {{orderStatus}} interpolation.\n\n## Checklist and memory\n\nChecklist, memory, and logs are complete.\n\n## Outstanding items\n\nno pending issues\n", "utf8");
  const releaseBoundaryCompletion = spawn(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]);
  assert.equal(releaseBoundaryCompletion.status, 1);
  assert.equal(JSON.parse(releaseBoundaryCompletion.stdout).contentFailures.some((failure) => failure.field === "Delivery boundary" && failure.reason === "requires-full-qa"), true);
  await writeFile(path.join(taskADirectory, "result.md"), "# Result\n\n- Outcome: completed\n- Requested by: Alice\n- QA status: passed\n- QA mode: fast\n- Delivery boundary: task\n\n## Changes and verification\n\nTask A passed targeted inspection, including Angular {{orderStatus}} interpolation.\n\n## Checklist and memory\n\nChecklist, memory, and logs are complete.\n\n## Outstanding items\n\nno pending issues\n", "utf8");
  assert.equal(run(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]).ok, true);
  assert.equal(run(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]).ok, true);
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  assert.equal(JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-b.json"), "utf8")).taskId, "task-b");
  assert.match(await readFile(taskARecentPath, "utf8"), /Task A passed targeted inspection/);
  assert.deepEqual((await readTaskLog("task-a")).at(-1).files, ["src/a.ts"]);

  const taskC = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--operation", "create-feature", "--title", "Implement task C and send it to QA"]);
  assert.equal(taskC.activeTask.requestedBy, "Alice");
  run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--summary", "Implementation returned for QA", "--files", "src/c.ts"]);
  const taskCDirectory = path.join(temp, ".agrimap-agent", "tasks", "task-c");
  const taskCLogPath = path.join(temp, ".agrimap-agent", "logs", new Date().toISOString().slice(0, 7), "task-c.jsonl");
  const invalidTaskCFileClaim = {
    schemaVersion: 2,
    timestamp: new Date().toISOString(),
    taskId: "task-c",
    requestedBy: "Alice",
    requesterId: null,
    identitySource: "manual-confirmed",
    model: "forged-model",
    role: "executor",
    agent: "forged-agent",
    provider: "forged-provider",
    event: "changed",
    summary: "Invalid v2 evidence must never be promoted by closure aggregation.",
    reason: "The required gitHead and gitDirty fields are deliberately absent.",
    files: ["src/evil.ts"],
    verification: [],
  };
  const legacyTaskCFileClaim = {
    timestamp: new Date().toISOString(),
    taskId: "task-c",
    requestedBy: "Alice",
    actor: "legacy-agent",
    event: "changed",
    summary: "Legacy evidence remains diagnostic only.",
    reason: "Unversioned compatibility fixture.",
    files: ["src/legacy.ts"],
    verification: [],
  };
  await writeFile(taskCLogPath, `${JSON.stringify(invalidTaskCFileClaim)}\n${JSON.stringify(legacyTaskCFileClaim)}\n`, { encoding: "utf8", flag: "a" });
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
  assert.deepEqual(taskCLog.at(-1).files, ["src/c.ts"]);
  assert.equal(taskCLog.at(-1).files.includes("src/evil.ts"), false);
  assert.equal(taskCLog.at(-1).files.includes("src/legacy.ts"), false);

  run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-d", "--operation", "analyze", "--title", "Analyze task D before cancellation"]);
  const taskDDirectory = path.join(temp, ".agrimap-agent", "tasks", "task-d");
  await writeFile(path.join(taskDDirectory, "result.md"), "# Result\n\n- Outcome: `cancelled`\n", "utf8");
  const closedD = run(workspaceScript, ["close", "--cwd", temp, "--session", "session-a", "--task", "task-d", "--status", "cancelled"]);
  assert.equal(closedD.status, "cancelled");
  const taskDLog = await readTaskLog("task-d");
  assert.equal(taskDLog.at(-1).event, "cancelled");

  for (const taskId of ["task-a", "task-b", "task-c", "task-d"]) {
    assert.equal((await readTaskLog(taskId)).every((entry) => logEventSet.has(entry.event)), true);
  }
}
