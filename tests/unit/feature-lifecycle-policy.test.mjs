import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "../helpers/harness.mjs";

const read = (relative) => readFile(path.join(projectRoot, ...relative.split("/")), "utf8");
const operations = JSON.parse(await read("config/operations.json"));
const lifecycle = await read("skills/agrimap-agent-skills/references/lifecycle-core.md");
const memoryPolicy = await read("skills/agrimap-agent-skills/references/memory-and-logs.md");
const passive = await read("skills/agrimap-agent-skills/references/passive-capabilities.md");
const workspaceScript = await read("skills/agrimap-agent-skills/scripts/agm-workspace.mjs");
const schema = JSON.parse(await read("skills/agrimap-agent-skills/assets/task-artifact-schema.json"));

test("light is artifactless while tracked depths complete the canonical five files", () => {
  assert.deepEqual(schema.artifactlessDepths, ["light"]);
  assert.deepEqual(schema.scaffoldOrder, ["brief.md", "checklists.md"]);
  assert.deepEqual(Object.keys(schema.artifacts), ["brief.md", "analysis.md", "checklists.md", "qa.md", "result.md"]);
  for (const definition of Object.values(schema.artifacts)) {
    assert.deepEqual(definition.requiredForDepths, ["standard", "regulated"]);
  }
  assert.match(lifecycle, /must not create anything under `tasks\/\*\*`/);
  assert.match(lifecycle, /tasks\/complete\/YYYY-MM/);
  assert.match(lifecycle, /tasks\/cancelled\/YYYY-MM/);
  assert.match(workspaceScript, /const taskId = TASK_WORKFLOW_DEPTHS\.has\(workflowDepth\) \? executionId : null/);
  assert.match(workspaceScript, /PREMATURE_RESULT_ARTIFACT/);
});

test("removed aliases stay absent and unit tests are a passive deterministic decision", () => {
  const names = operations.operations.map((item) => item.name);
  for (const removed of ["agm-create-feature", "agm-create-unit-test", "agm-refactor-fe", "agm-refactor-be", "agm-refactor-sql"]) {
    assert.equal(names.includes(removed), false);
  }
  for (const kept of ["agm-analyze", "agm-design", "agm-fe", "agm-be", "agm-sql", "agm-refactor"]) {
    assert.equal(names.includes(kept), true);
  }
  assert.match(passive, /`required`, `recommended`, or `not_applicable`/);
  assert.match(passive, /Passive activation never grants write authority/);
  assert.match(passive, /product-read-only action may classify\/recommend tests but never create them/);
});

test("checkpoint memory and logs use provider-neutral compact budgets", () => {
  for (const marker of ["summary: 240", "reason: 400", "concerns: 400", "verificationItems: 8", "verificationItem: 300"]) {
    assert.match(workspaceScript, new RegExp(marker));
  }
  assert.match(memoryPolicy, /This transition is mechanical, not model discretion/);
  assert.match(memoryPolicy, /Logs are concise machine chronology/);
  assert.match(memoryPolicy, /Schema v1-v3 remains readable/);
});
