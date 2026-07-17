import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOG_EVENTS, QA_FAILED_EVENT } from "../../../../skills/agrimap-agent-skills/scripts/log-events.mjs";

const logEventSet = new Set(LOG_EVENTS);

function validBrief({ taskId = "task-a", depth = "regulated" } = {}) {
  return `# Task brief

- Task ID: \`${taskId}\`
- Requested by: Alice
- Identity source: \`manual-confirmed\`
- Requester authority: \`owner\`
- Decision owner: Alice
- Authority evidence: Confirmed by Alice in this session.
- Model label: GPT-5.6-sol
- Actual model: \`gpt-5.6-sol-runtime\`
- Role: \`leader\`
- Agent: \`primary\`
- Provider: \`codex\`
- Operation: \`analyze\`
- Workflow depth: \`${depth}\`
- Objective: Analyze Angular {{orderStatus}} behavior.
- Scope: Task A artifacts and evidence.
- Non-goals: Unrelated task changes.

## File and logical-contract ownership

Task A workflow artifacts; no product artifacts changed.

## Inputs

The active task state and Angular {{orderStatus}} evidence.

## Authorized decisions and trade-offs

Alice authorized the stated task-only scope.

## Service ownership references

Not applicable; no service boundary changed.

## Concerns

None.
`;
}

function validQa({ mode = "light", lightSequence = "1" } = {}) {
  return `# QA

- Status: passed
- QA mode: ${mode}
- QA mode reason: ${mode === "full" ? "Release boundary requires full QA." : "Task-only closure within the light-QA allowance."}
- Coverage key: src/angular-order-status
- Light sequence: ${lightSequence}
- Patterns: patterns/frontend.md
- Requested by: Alice
- Decision owner: Alice
- QA model label: gemini-cli-default
- QA actual model: gemini-runtime-model
- QA role: qa
- QA agent: qa-independent
- QA provider: gemini
- Product artifacts modified: false
- Workflow artifacts written: qa.md and QA checkpoint log
- Implementation model label: GPT-5.6-sol
- Implementation actual model: gpt-5.6-sol-runtime
- Implementation role: leader
- Implementation agent: primary
- Implementation provider: codex

## Requirement evidence

- Task A requirements map to inspected Angular {{orderStatus}} evidence.

## Commands and observed results

- Targeted inspection passed.

## Findings and attempt history

- Any prior qa-finding was corrected by the assigned writer; this fresh independent QA context reran full verification when required.
`;
}

function validResult({ mode = "light", boundary = "task", depth = "regulated" } = {}) {
  return `# Result

- Outcome: completed
- Requested by: Alice
- Decision owner: Alice
- Leader model label: GPT-5.6-sol
- Leader actual model: gpt-5.6-sol-runtime
- Leader role: leader
- Leader agent: primary
- Leader provider: codex
- Workflow depth: ${depth}
- QA status: ${depth === "regulated" ? "passed" : "not-applicable"}
- QA mode: ${depth === "regulated" ? mode : "not-applicable"}
- Delivery boundary: ${boundary}

## Authorized decisions

Alice authorized the task-only scope and verification boundary.

## Changes and verification

Task A passed targeted inspection, including Angular {{orderStatus}} interpolation.

## Checklist and memory

Checklist, memory, and logs are complete.

## Concerns and commit boundary

${boundary === "task" ? "No concerns; no commit, publish, or release boundary requested." : `No concerns; the ${boundary} boundary is covered by the recorded QA mode.`}

## Outstanding items

no pending issues
`;
}

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
  await writeFile(path.join(taskADirectory, "qa.md"), "# QA\n\n- Status: `passed|failed|blocked|not-applicable`\n- Product artifacts modified: <false>\n- Workflow artifacts written: {{qa_workflow_artifacts_written}}\n\n## Requirement evidence\n\n{{requirement_to_evidence}}\n\n## Commands and observed results\n\n{{verification}}\n", "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), `# Result\n\n- Outcome: \`completed|${QA_FAILED_EVENT}|blocked|cancelled\`\n- Requested by: {{requested_by}}\n- QA status: \`passed|failed|blocked|not-applicable\`\n\n## Changes and verification\n\n{{files_behavior_and_evidence}}\n\n## Checklist and memory\n\n{{checklist_status}}\n`, "utf8");
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
  await writeFile(path.join(taskADirectory, "qa.md"), "# QA\n\n- Status: passed\n- Requested by: Alice\n- Product artifacts modified: false\n- Workflow artifacts written: qa.md\n\n## Requirement evidence\n\nTODO\n\n## Commands and observed results\n\n- Targeted inspection passed.\n", "utf8");
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

  await writeFile(path.join(taskADirectory, "brief.md"), validBrief(), "utf8");
  await writeFile(path.join(taskADirectory, "qa.md"), validQa(), "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), validResult({ boundary: "release" }), "utf8");
  const releaseBoundaryCompletion = spawn(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]);
  assert.equal(releaseBoundaryCompletion.status, 1);
  assert.equal(JSON.parse(releaseBoundaryCompletion.stdout).contentFailures.some((failure) => failure.field === "Delivery boundary" && failure.reason === "requires-full-qa"), true);

  await writeFile(path.join(taskADirectory, "qa.md"), validQa({ lightSequence: "3" }), "utf8");
  const overFastLimitProcess = spawn(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]);
  assert.equal(overFastLimitProcess.status, 1);
  const overFastLimit = JSON.parse(overFastLimitProcess.stdout);
  assert.equal(overFastLimit.ok, false);
  assert.equal(overFastLimit.contentFailures.some((failure) => failure.field === "Light sequence" && failure.reason === "invalid-enum"), true);

  const nonIndependentQa = validQa()
    .replace("gemini-runtime-model", "gpt-5.6-sol-runtime")
    .replace("qa-independent", "primary")
    .replace("- QA provider: gemini", "- QA provider: codex");
  await writeFile(path.join(taskADirectory, "qa.md"), nonIndependentQa, "utf8");
  const nonIndependentProcess = spawn(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]);
  assert.equal(nonIndependentProcess.status, 1);
  const nonIndependent = JSON.parse(nonIndependentProcess.stdout);
  assert.equal(nonIndependent.ok, false);
  assert.equal(nonIndependent.contentFailures.some((failure) => failure.field === "QA identity" && failure.reason === "not-independent"), true);

  const qaFinding = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-a", "--event", "qa-finding", "--summary", "Initial QA attempt found an in-scope defect"]);
  assert.equal(qaFinding.ok, true);
  assert.equal(JSON.parse(await readFile(taskAActivePath, "utf8")).taskId, "task-a");
  await writeFile(path.join(taskADirectory, "qa.md"), validQa({ mode: "full", lightSequence: "0" }), "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), validResult({ mode: "full", boundary: "release" }), "utf8");
  assert.equal(run(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]).ok, true);

  const priorCounterEvents = [];
  for (const [index, taskId] of ["prior-fast-1", "prior-fast-2"].entries()) {
    const priorDirectory = path.join(temp, ".agrimap-agent", "tasks", taskId);
    await mkdir(priorDirectory, { recursive: true });
    const priorQa = validQa({ lightSequence: String(index + 1) });
    const historicalQa = index === 0
      ? priorQa.replace("- QA mode: light", "- QA mode: fast").replace("- Light sequence:", "- Fast sequence:")
      : priorQa;
    await writeFile(path.join(priorDirectory, "qa.md"), historicalQa, "utf8");
    priorCounterEvents.push({
      schemaVersion: 2,
      timestamp: new Date(Date.now() - (2 - index) * 60_000).toISOString(),
      taskId,
      requestedBy: "Alice",
      requesterId: null,
      identitySource: "manual-confirmed",
      model: "gpt-5.6-sol-runtime",
      modelLabel: "GPT-5.6-sol",
      role: "leader",
      agent: "primary",
      provider: "codex",
      event: "completed",
      summary: "Prior light-QA task completed.",
      reason: "Historical QA counter fixture.",
      files: [],
      verification: ["completion gate passed"],
      gitHead: null,
      gitDirty: null,
    });
  }
  const counterLogPath = path.join(temp, ".agrimap-agent", "logs", new Date().toISOString().slice(0, 7), "prior-fast-counter.jsonl");
  await writeFile(counterLogPath, `${priorCounterEvents.map((event) => JSON.stringify(event)).join("\n")}\n`, { encoding: "utf8", flag: "a" });
  await writeFile(path.join(taskADirectory, "qa.md"), validQa({ lightSequence: "1" }), "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), validResult(), "utf8");
  const thirdFastClosureProcess = spawn(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]);
  assert.equal(thirdFastClosureProcess.status, 1);
  const thirdFastClosure = JSON.parse(thirdFastClosureProcess.stdout);
  assert.equal(thirdFastClosure.ok, false);
  assert.equal(thirdFastClosure.qaCounter.priorConsecutiveLight, 2);
  assert.equal(thirdFastClosure.contentFailures.some((failure) => failure.field === "QA mode" && failure.reason === "historical-full-required"), true);

  await writeFile(path.join(taskADirectory, "qa.md"), validQa({ mode: "full", lightSequence: "0" }), "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), validResult({ mode: "full" }), "utf8");
  assert.equal(run(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]).ok, true);
  assert.equal(run(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]).ok, true);
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  assert.equal(JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-b.json"), "utf8")).taskId, "task-b");
  assert.match(await readFile(taskARecentPath, "utf8"), /Task A passed targeted inspection/);
  const completedTaskALog = await readTaskLog("task-a");
  assert.equal(completedTaskALog.some((entry) => entry.event === "qa-finding"), true);
  assert.equal(completedTaskALog.at(-1).event, "completed");
  assert.deepEqual(completedTaskALog.at(-1).files, ["src/a.ts"]);

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
  const qaFindingWithFiles = spawn(workspaceScript, [
    "checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--event", "qa-finding",
    "--summary", "QA found a defect", "--files", "src/c.ts",
  ]);
  assert.equal(qaFindingWithFiles.status, 1);
  assert.equal(JSON.parse(qaFindingWithFiles.stdout).code, "QA_FINDING_PRODUCT_FILES_FORBIDDEN");
  assert.equal(run(workspaceScript, [
    "checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--event", "qa-finding",
    "--summary", "First QA attempt found an in-scope defect",
  ]).ok, true);
  const repeatedQaFinding = spawn(workspaceScript, [
    "checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--event", "qa-finding",
    "--summary", "Fresh full re-QA still failed",
  ]);
  assert.equal(repeatedQaFinding.status, 1);
  assert.equal(JSON.parse(repeatedQaFinding.stdout).code, "QA_CORRECTION_LIMIT");
  await writeFile(path.join(taskCDirectory, "qa.md"), "# QA\n\n- Status: failed\n\nReproducible defect.\n", "utf8");
  await writeFile(path.join(taskCDirectory, "result.md"), `# Result\n\n- Outcome: \`${QA_FAILED_EVENT}\`\n`, "utf8");
  const nextPrompt = path.join(temp, ".agrimap-agent", "prompts", "task-c-fix", "executor.prompt.md");
  await mkdir(path.dirname(nextPrompt), { recursive: true });
  await writeFile(nextPrompt, "# Proposed correction prompt\n", "utf8");
  const closedC = run(workspaceScript, [
    "close", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--status", QA_FAILED_EVENT,
    "--next-prompt", ".agrimap-agent/prompts/task-c-fix/executor.prompt.md",
  ]);
  assert.equal(closedC.complete, false);
  assert.equal(closedC.status, QA_FAILED_EVENT);
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "recent", "task-c.md"), "utf8"), new RegExp(QA_FAILED_EVENT));
  const taskCLog = await readTaskLog("task-c");
  assert.equal(taskCLog.at(-1).event, QA_FAILED_EVENT);
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

  const lightStart = spawn(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--depth", "light", "--title", "Must remain stateless"]);
  assert.equal(lightStart.status, 1);
  assert.equal(JSON.parse(lightStart.stdout).code, "LIGHT_DEPTH_STATE_FORBIDDEN");

  run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-standard", "--operation", "refactor-be", "--depth", "standard", "--title", "Standard bounded refactor"]);
  const standardDirectory = path.join(temp, ".agrimap-agent", "tasks", "task-standard");
  await writeFile(path.join(standardDirectory, "brief.md"), validBrief({ taskId: "task-standard", depth: "standard" }), "utf8");
  await writeFile(path.join(standardDirectory, "checklist.md"), "# Checklist\n\n- [x] Bounded refactor and targeted verification passed.\n", "utf8");
  await assert.rejects(readFile(path.join(standardDirectory, "qa.md"), "utf8"));
  await writeFile(path.join(standardDirectory, "result.md"), validResult({ depth: "standard", boundary: "commit" }), "utf8");
  const standardCommitValidation = spawn(workspaceScript, ["validate", "--cwd", temp, "--task", "task-standard"]);
  assert.equal(standardCommitValidation.status, 1);
  assert.equal(JSON.parse(standardCommitValidation.stdout).contentFailures.some((failure) => failure.reason === "requires-regulated-depth"), true);
  await writeFile(path.join(standardDirectory, "result.md"), validResult({ depth: "standard" }), "utf8");
  const completedStandard = run(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-standard"]);
  assert.equal(completedStandard.ok, true);
  assert.equal((await readTaskLog("task-standard")).at(-1).workflowDepth, "standard");

  for (const taskId of ["task-a", "task-b", "task-c", "task-d", "task-standard"]) {
    assert.equal((await readTaskLog(taskId)).every((entry) => logEventSet.has(entry.event)), true);
  }
}
