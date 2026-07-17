import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "../helpers/harness.mjs";

const read = (relative) => readFile(path.join(projectRoot, ...relative.split("/")), "utf8");
const operations = JSON.parse(await read("config/operations.json"));
const analysis = await read("skills/agrimap-agent-skills/references/analysis-discipline.md");
const elicitation = await read("skills/agrimap-agent-skills/references/elicitation.md");
const refactorModes = await read("skills/agrimap-agent-skills/references/refactor-modes.md");
const sqlPolicy = await read("skills/agrimap-agent-skills/references/patterns/sql.md");

const modes = [
  "performance-preserve-behavior",
  "readability-organization",
  "strict-preserve-logic",
  "strict-allow-logic-change",
  "targeted-bug-fix",
];

test("SQL refactor exposes all five modes instead of a recommendation-only extra turn", () => {
  const operation = operations.operations.find((item) => item.operation === "refactor-sql");
  const contract = [operation.requiredInputs.join("\n"), operation.instructions.join("\n"), elicitation, refactorModes].join("\n");
  for (const mode of modes) assert.match(contract, new RegExp(mode));
  assert.match(operation.instructions.join("\n"), /show all five enums/i);
  assert.match(operation.instructions.join("\n"), /never return a recommendation alone/i);
  assert.match(elicitation, /ตอบเลขหรือ enum/);
});

test("light analysis is CLI-readable and database conclusions fail soft on missing project evidence", () => {
  const operation = operations.operations.find((item) => item.operation === "analyze");
  const contract = [operation.instructions.join("\n"), analysis].join("\n");
  for (const heading of ["Scope", "Evidence", "Findings", "Impacts", "Options", "Recommendation", "Unknowns"]) {
    assert.match(contract, new RegExp(heading));
  }
  assert.match(contract, /actual project code/i);
  assert.match(contract, /db-schema/i);
  assert.match(contract, /representative examples|representative local examples/i);
  assert.match(contract, /preliminary/i);
  assert.match(analysis, /At `light`, the direct chat response is the complete deliverable/);
  assert.doesNotMatch(analysis, /A chat answer alone is not a closed deliverable/);
});

test("SQL writers format directly and fail closed when folder parsing stops", () => {
  const single = 'sqlfluff format --exclude-rules "CP02, LT01, RF06" --dialect tsql <FILE>.sql';
  const folder = 'sqlfluff format --exclude-rules "CP02, LT01, RF06" --dialect tsql .';
  assert.ok(sqlPolicy.includes(single));
  assert.ok(sqlPolicy.includes(folder));
  assert.match(sqlPolicy, /nonzero folder-format exit is incomplete and may be partial/i);
  assert.match(sqlPolicy, /broken file can stop parsing/i);
  assert.match(sqlPolicy, /single-file command per changed file/i);
  assert.match(sqlPolicy, /rerun the folder command to zero/i);
  assert.match(sqlPolicy, /Then run `validate-sql-artifacts\.mjs`/);
  assert.doesNotMatch(sqlPolicy, /--ignore\s+parsing|finalize-sql-artifacts|sqlfluff fix|--force|\.sqlfluff/);
});
