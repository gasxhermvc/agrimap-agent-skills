import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "../helpers/harness.mjs";

const read = (relative) => readFile(path.join(projectRoot, ...relative.split("/")), "utf8");
const operations = JSON.parse(await read("config/operations.json"));
const lifecycle = await read("skills/agrimap-agent-skills/references/lifecycle-core.md");
const promptWorkflow = await read("skills/agrimap-agent-skills/references/create-prompt.md");
const memoryPolicy = await read("skills/agrimap-agent-skills/references/memory-and-logs.md");
const workspaceScript = await read("skills/agrimap-agent-skills/scripts/agm-workspace.mjs");
const schema = JSON.parse(await read("skills/agrimap-agent-skills/assets/task-artifact-schema.json"));

test("create-feature stays direct while tracked feature artifacts follow phase ownership", () => {
  const createFeature = operations.operations.find((item) => item.operation === "create-feature");
  const createPrompt = operations.operations.find((item) => item.operation === "create-prompt");

  assert.deepEqual(createFeature.depth, { default: "light", allowed: ["light"] });
  assert.match(createFeature.instructions.join("\n"), /never start tracked task state/i);
  assert.match(createFeature.instructions.join("\n"), /route the work to agm-create-prompt/i);
  assert.match(createFeature.instructions.join("\n"), /Return the result only after product writes and verification finish/i);
  assert.match(createFeature.instructions.join("\n"), /never start tracked task state, invoke QA, select qa_mode, delegate\/spawn\/wait/i);
  assert.match(createFeature.instructions.join("\n"), /unresolved or material persisted-data decision/i);
  assert.match(createFeature.instructions.join("\n"), /bounded slice within the three-artifact limit.*remains direct/i);
  assert.match(createFeature.instructions.join("\n"), /sql-contract-preflight\.mjs/i);
  assert.match(createFeature.instructions.join("\n"), /Do not hand-tune cosmetic layout/i);
  assert.match(createFeature.instructions.join("\n"), /format every declared changed \.sql path/i);
  assert.match(createFeature.instructions.join("\n"), /validate the same complete set/i);
  assert.match(createFeature.instructions.join("\n"), /formatted N\/N/i);
  assert.match(createFeature.instructions.join("\n"), /never use a database, ScriptDom/i);

  assert.match(createPrompt.deliverable, /brief\.md and acceptance checklist\.md/i);
  assert.match(createPrompt.instructions.join("\n"), /never execute the generated prompt, create qa\.md, create result\.md/i);
  assert.match(lifecycle, /full artifact set is a completion set, not a start scaffold/i);
  assert.match(promptWorkflow, /agm-exec` owns implementation/i);
  assert.match(promptWorkflow, /Leader writes `result\.md` only as the final closure record/i);

  assert.deepEqual(schema.scaffoldOrder, ["brief.md", "checklist.md"]);
  assert.equal(schema.artifacts["qa.md"].writePhase, "verification");
  assert.equal(schema.artifacts["result.md"].writePhase, "closure");
  assert.match(workspaceScript, /CREATE_FEATURE_TRACKING_FORBIDDEN/);
  assert.match(workspaceScript, /PREMATURE_RESULT_ARTIFACT/);
});

test("checkpoint memory and logs use the same compact budget for every provider", () => {
  for (const marker of ["summary: 240", "reason: 400", "concerns: 400", "verificationItems: 8", "verificationItem: 300"]) {
    assert.match(workspaceScript, new RegExp(marker));
  }
  assert.match(memoryPolicy, /Claude\/Fable, Codex\/GPT, and Gemini use the same milestone count and compact field budgets/);
  assert.match(memoryPolicy, /Direct\/light operations, including `agm-create-feature`, write none of this state/);
});
