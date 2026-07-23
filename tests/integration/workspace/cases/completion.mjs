import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function writeTrackedCompletion(taskPath, { taskId, requester, decisionOwner, depth, qaStatus, qaMode, qaAgent = "qa-verifier", implementationAgent = "primary" }) {
  await writeFile(path.join(taskPath, "analysis.md"), `# Analysis — ${taskId}\n\n## Current State\n\nInspected the active contract and affected workflow runtime.\n\n## Findings\n\n| # | Finding | Severity | Impact |\n|---|---|---|---|\n| 1 | Canonical lifecycle evidence is present. | LOW | Closure may proceed. |\n\n## Proposed Approach\n\nPreserve the approved scope and close only after validation.\n`, "utf8");
  await writeFile(path.join(taskPath, "checklists.md"), `# Checklists — ${taskId}\n\n- [x] Governance and scope loaded.\n- [x] Implementation or analysis completed.\n- [x] Verification passed.\n- [x] Memory and report lifecycle reconciled.\n`, "utf8");
  await writeFile(path.join(taskPath, "qa.md"), `# QA\n\n- Status: \`${qaStatus}\`\n- QA mode: \`${qaMode}\`\n- QA mode reason: ${qaMode === "not-applicable" ? "Standard writer verification; separate assurance not required." : "Regulated sampled verification."}\n- Coverage key: workflow-lifecycle\n- Light sequence: \`${qaMode === "full" ? "0" : qaMode === "light" ? "1" : "0"}\`\n- Patterns: lifecycle-core.md and memory-and-logs.md\n- Requested by: ${requester}\n- Decision owner: ${decisionOwner}\n- QA model label: not-configured\n- QA actual model: gpt-5.6-sol\n- QA role: \`qa\`\n- QA agent: ${qaAgent}\n- QA provider: \`codex\`\n- Product artifacts modified: \`false\`\n- Workflow artifacts written: qa.md only\n- Implementation model label: not-configured\n- Implementation actual model: gpt-5.6-sol\n- Implementation role: leader\n- Implementation agent: ${implementationAgent}\n- Implementation provider: \`codex\`\n\n## Requirement evidence\n\nTask paths, memory, and daily audit records were reopened.\n\n## Commands and observed results\n\nWorkspace validation passed.\n\n## Limitations\n\nNo external service was invoked.\n`, "utf8");
  await writeFile(path.join(taskPath, "result.md"), `# Result\n\n- Outcome: \`completed\`\n- Requested by: ${requester}\n- Decision owner: ${decisionOwner}\n- Leader model label: not-configured\n- Leader actual model: gpt-5.6-sol\n- Leader role: \`leader\`\n- Leader agent: primary\n- Leader provider: \`codex\`\n- Workflow depth: \`${depth}\`\n- QA status: \`${qaStatus}\`\n- QA mode: \`${qaMode}\`\n- Delivery boundary: \`task\`\n\n## Authorized decisions\n\nUse the approved lifecycle contract.\n\n## Changes and verification\n\nCanonical artifacts were completed and validated.\n\n## Checklist and memory\n\nAll checklist items are complete; terminal lifecycle will promote the short pointer.\n\n## Concerns and commit boundary\n\nNo remaining concern; no commit requested.\n\n## Outstanding items\n\nNo pending issues.\n`, "utf8");
}

export async function completion(harness) {
  const { temp, run, spawn, readTaskLog } = harness;
  const workspaceScript = harness.scripts.workspace;
  const state = path.join(temp, ".agrimap-agent");

  const activeA = JSON.parse(await readFile(path.join(state, "runtime", "active", "session-a.json"), "utf8"));
  const taskAPath = path.join(state, activeA.taskPath);
  run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--execution", "01010003", "--event", "verified", "--summary", "Regulated evidence verified", "--verification", "workspace validation prepared"]);
  await writeTrackedCompletion(taskAPath, { taskId: "01010003", requester: "Alice", decisionOwner: "Alice", depth: "regulated", qaStatus: "passed", qaMode: "light" });
  const validationA = run(workspaceScript, ["validate", "--cwd", temp, "--session", "session-a", "--execution", "01010003"]);
  assert.equal(validationA.ok, true);
  const completedA = run(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--execution", "01010003"]);
  assert.equal(completedA.archivedTask, `tasks/complete/${activeA.period}/01010003`);
  assert.equal(completedA.promptsMoved, false);
  for (const file of ["brief.md", "analysis.md", "checklists.md", "qa.md", "result.md"]) assert.equal(typeof await readFile(path.join(state, completedA.archivedTask, file), "utf8"), "string");
  await assert.rejects(readFile(path.join(state, activeA.currentMemoryPath), "utf8"), { code: "ENOENT" });
  assert.match(await readFile(path.join(state, activeA.recentMemoryPath), "utf8"), /· completed · Completion gate passed/);
  assert.match(await readFile(path.join(state, "memory", "project.md"), "utf8"), /execution `01010003`/);
  const reportA = await readFile(path.join(state, completedA.report), "utf8");
  assert.match(reportA, /^# Execution Log —/);
  assert.match(reportA, /Final Status: ✅ COMPLETED/);
  assert.match(reportA, /Memory \(recent\)/);
  assert.match(reportA, /Task Files Status/);
  assert.match(reportA, /Appendix — Task File Mini-Templates/);
  assert.doesNotMatch(reportA, /\{\{[A-Z_]+\}\}/);
  assert.equal((await readTaskLog("01010003")).at(-1).event, "completed");

  const activeB = JSON.parse(await readFile(path.join(state, "runtime", "active", "session-b.json"), "utf8"));
  const blocked = run(workspaceScript, ["close", "--cwd", temp, "--session", "session-b", "--execution", "01010004", "--status", "blocked", "--reason", "Waiting for owner evidence"]);
  assert.equal(blocked.remainsCurrent, true);
  assert.equal(typeof await readFile(path.join(state, activeB.currentMemoryPath), "utf8"), "string");
  assert.equal(typeof await readFile(path.join(state, activeB.taskPath, "brief.md"), "utf8"), "string");
  const cancelled = run(workspaceScript, ["close", "--cwd", temp, "--session", "session-b", "--execution", "01010004", "--status", "cancelled", "--reason", "Owner cancelled fixture"]);
  assert.equal(cancelled.archivedTask, `tasks/cancelled/${activeB.period}/01010004`);
  await assert.rejects(readFile(path.join(state, activeB.currentMemoryPath), "utf8"), { code: "ENOENT" });
  assert.doesNotMatch(await readFile(path.join(state, "memory", "project.md"), "utf8"), /execution `01010004`/);
  assert.match(await readFile(path.join(state, cancelled.report), "utf8"), /Final Status: ❌ FAILED/);

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-standard", "--owner", "Carol", "--model", "gpt-5.6-sol", "--provider", "codex"]);
  const standard = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-standard", "--execution", "01010005", "--operation", "refactor", "--depth", "standard", "--title", "Standard tracked closure", "--requester-authority", "owner", "--decision-owner", "Carol", "--authority-evidence", "confirmed in test"]);
  run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-standard", "--execution", "01010005", "--event", "verified", "--summary", "Standard writer verification passed", "--verification", "static review passed"]);
  await writeTrackedCompletion(path.join(state, standard.activeTask.taskPath), { taskId: "01010005", requester: "Carol", decisionOwner: "Carol", depth: "standard", qaStatus: "not-applicable", qaMode: "not-applicable" });
  assert.equal(run(workspaceScript, ["validate", "--cwd", temp, "--session", "session-standard", "--execution", "01010005"]).ok, true);
  const completedStandard = run(workspaceScript, ["complete", "--cwd", temp, "--session", "session-standard", "--execution", "01010005"]);
  assert.equal(completedStandard.archivedTask, `tasks/complete/${standard.activeTask.period}/01010005`);
}
