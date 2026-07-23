import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "../helpers/harness.mjs";

const read = (relative) => readFile(path.join(projectRoot, ...relative.split("/")), "utf8");
const operations = JSON.parse(await read("config/operations.json"));
const qaPolicy = await read("skills/agrimap-agent-skills/references/qa-and-done.md");
const lifecycle = await read("skills/agrimap-agent-skills/references/lifecycle-core.md");
const modelMatrix = await read("skills/agrimap-agent-skills/references/model-capability-matrix.yaml");
const sqlPolicy = await read("skills/agrimap-agent-skills/references/patterns/sql.md");
const taskSchema = JSON.parse(await read("skills/agrimap-agent-skills/assets/task-artifact-schema.json"));

test("QA defaults, escalation, and executable tools are provider-neutral and closed", () => {
  const qa = operations.operations.find((item) => item.operation === "qa");
  assert.deepEqual(qa.depth, { default: "light", allowed: ["light", "regulated"] });
  assert.match(qa.deliverable, /direct QA evidence at light/i);
  const entrypointPolicy = qa.instructions.join("\n");
  for (const marker of [
    "depth=light and qa_mode=light",
    "never selects full by itself",
    "LocalDB, dbserver, SQL Server",
    "Never format SQL, install SQLFluff",
    "dotnet build",
    "npm run start:agrimap:development",
    "do not run other product commands",
  ]) assert.ok(entrypointPolicy.includes(marker), `QA entrypoint missing: ${marker}`);

  for (const marker of [
    "Start every QA request at `depth=light` and `qa_mode=light`",
    "Verification tool allowlist",
    "Do not use LocalDB, dbserver, SQL Server",
    "SQLFluff installation and formatting are writer actions and are excluded",
    "do not run other `npm run ...`, `dotnet test`, or database validation",
    "provider, and model capability never select `full`",
  ]) assert.ok(qaPolicy.includes(marker), `QA policy missing: ${marker}`);

  assert.match(lifecycle, /`workflow_depth` and `qa_mode` are separate/);
  assert.match(lifecycle, /light.*must not create anything under `tasks\/\*\*`/s);
  assert.match(modelMatrix, /Model capability and provider affect assignment only; they never change workflow depth, QA mode, allowed tools/);
  assert.deepEqual(taskSchema.artifacts["qa.md"].requiredFields.find((field) => field.label === "QA mode").enum, ["not-applicable", "light", "full"]);
  assert.equal(taskSchema.qaFullTriggers.some((trigger) => /public contract|data behavior|generated-code/i.test(trigger)), false);
});

test("SQL actor and target user semantics remain distinct", () => {
  assert.match(sqlPolicy, /@PI_SESSION_USER_ID NUMERIC\(38, 0\).*actor authenticated in the current session/i);
  assert.match(sqlPolicy, /@PI_USER_ID NUMERIC\(38, 0\).*subject\/target user/i);
  assert.match(sqlPolicy, /WHERE \[USER_ID\] = @PI_USER_ID/);
  assert.match(sqlPolicy, /\[USER_MODIFIED\] = @PI_SESSION_USER_ID/);
  assert.match(sqlPolicy, /Never substitute session user for target user or assume they are equal/);
});
