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
const backendPattern = await read("skills/agrimap-agent-skills/references/patterns/backend.md");
const backendDiscipline = await read("skills/agrimap-agent-skills/references/backend-engineer.md");
const frontendPattern = await read("skills/agrimap-agent-skills/references/patterns/frontend.md");
const frontendDiscipline = await read("skills/agrimap-agent-skills/references/frontend-engineer.md");
const promptPolicy = await read("skills/agrimap-agent-skills/references/create-prompt.md");
const delegationPolicy = await read("skills/agrimap-agent-skills/references/subagents-and-branches.md");
const createFeatureEntrypoint = await read("skills/agrimap-agent-skills/references/operations/create-feature.md");
const passiveCapabilities = await read("skills/agrimap-agent-skills/references/passive-capabilities.md");
const lifecycle = await read("skills/agrimap-agent-skills/references/lifecycle-core.md");

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

test("domain façades resolve one action and keep passive capabilities read-only", async () => {
  for (const name of ["fe", "be", "sql"]) {
    const operation = operations.operations.find((item) => item.operation === name);
    assert.equal(operation.mode, "action-routed");
    assert.match(operation.instructions.join("\n"), /Resolve exactly one action before inspection/i);
    const entrypoint = await read(`skills/agrimap-agent-skills/references/operations/${name}.md`);
    assert.match(entrypoint, /Resolve exactly one action.*before target inspection or product writes/i);
    for (const action of operation.actions.filter((item) => item.activation === "explicit-or-passive")) {
      assert.equal(action.mode, "product-read-only");
    }
  }
  assert.match(lifecycle, /Passive activation never grants write authority/);
  assert.match(passiveCapabilities, /never grant product-write authority/);
  assert.match(passiveCapabilities, /Do not create tests from passive activation/);
  assert.match(passiveCapabilities, /Explicit `action=test`/);
});

test("SQL explain is evidence-labelled and cannot execute or edit", () => {
  const sql = operations.operations.find((item) => item.operation === "sql");
  const explain = sql.actions.find((item) => item.name === "explain");
  assert.equal(explain.mode, "product-read-only");
  assert.equal(explain.activation, "explicit-or-passive");
  for (const marker of ["FACT", "INFERENCE", "UNKNOWN", "do not execute SQL", "connect to a database", "never edits"])
    assert.ok(passiveCapabilities.includes(marker), `SQL explain marker missing: ${marker}`);
});

test("one public refactor routes FE, BE, and SQL while legacy aliases stay compatibility-only", () => {
  const refactor = operations.operations.find((item) => item.operation === "refactor");
  assert.deepEqual(refactor.requiredInputs.slice(0, 1), ["target=fe|be|sql"]);
  for (const target of ["fe", "be", "sql"])
    assert.ok(refactor.conditionalReferences.some((item) => item.when === `target=${target}`));
  for (const name of ["agm-refactor-fe", "agm-refactor-be", "agm-refactor-sql"])
    assert.equal(operations.operations.find((item) => item.name === name).visibility, "compatibility");
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
  assert.match(analysis, /At `light`.*mandatory brief, checklist, current memory, logs, and closure result/);
  assert.doesNotMatch(analysis, /A chat answer alone is not a closed deliverable/);
});

test("SQL writers install lazily only on command-not-found and fail closed when folder parsing stops", () => {
  const single = 'sqlfluff format --exclude-rules "CP02, LT01, RF06" --dialect tsql <FILE>.sql';
  const folder = 'sqlfluff format --exclude-rules "CP02, LT01, RF06" --dialect tsql .';
  assert.ok(sqlPolicy.includes(single));
  assert.ok(sqlPolicy.includes(folder));
  assert.match(sqlPolicy, /install-sqlfluff\.mjs/);
  assert.match(sqlPolicy, /CommandNotFound/);
  assert.match(sqlPolicy, /ENOENT/);
  assert.match(sqlPolicy, /other failures never install/);
  assert.doesNotMatch(sqlPolicy, /Before SQL writes.*--version|ensure-sqlfluff/);
  assert.match(sqlPolicy, /nonzero folder exit is incomplete and may be partial/i);
  assert.match(sqlPolicy, /run each changed file separately/i);
  assert.match(sqlPolicy, /rerun the folder command to zero/i);
  assert.match(sqlPolicy, /validate-sql-artifacts\.mjs --files/);
  assert.match(sqlPolicy, /Use OS temp for probes and always clean it/);
  assert.match(sqlPolicy, /never create `\.tmp-\*` under project\/workspace/);
  assert.doesNotMatch(sqlPolicy, /--ignore\s+parsing|finalize-sql-artifacts|sqlfluff fix|--force|\.sqlfluff/);
});

test("create-feature SQL loads the complete command owner and proves format coverage", () => {
  const operation = operations.operations.find((item) => item.operation === "create-feature");
  assert.ok(operation.conditionalReferences.some((item) => item.when === "target is SQL" && item.path === "patterns/sql.md"));
  assert.match(createFeatureEntrypoint, /When target is SQL: \[patterns\/sql\.md\]/);
  for (const marker of [
    "sql-contract-preflight.mjs --target-kind sql-table|sql-procedure --object <OBJECT>",
    'sqlfluff format --exclude-rules "CP02, LT01, RF06" --dialect tsql <FILE>.sql',
    'sqlfluff format --exclude-rules "CP02, LT01, RF06" --dialect tsql .',
    "install-sqlfluff.mjs",
    "validate-sql-artifacts.mjs --files",
    "format_set",
    "formatted N/N",
  ]) assert.ok(sqlPolicy.includes(marker), `SQL command/coverage marker missing: ${marker}`);
  assert.match(sqlPolicy, /Do not hand-tune cosmetic indentation, alignment, wrapping, or whitespace/);
  assert.doesNotMatch(sqlPolicy, /align the block with the statement/);
});

test("compact pattern references keep their canonical owners co-loaded", () => {
  const pairs = [
    ["refactor-be", ["backend-engineer.md", "patterns/backend.md"]],
    ["refactor-fe", ["frontend-engineer.md", "patterns/frontend.md"]],
    ["create-prompt", ["create-prompt.md", "subagents-and-branches.md"]],
    ["execute", ["create-prompt.md", "subagents-and-branches.md"]],
  ];
  for (const [name, required] of pairs) {
    const operation = operations.operations.find((item) => item.operation === name);
    const routed = operation.references.map((item) => item.path);
    for (const path of required) assert.ok(routed.includes(path), `${name} must load ${path}`);
  }

  assert.match(backendPattern, /Apply \[backend-engineer\.md\].*unchanged/);
  assert.match(backendPattern, /MongoDB document or ORM entity.*Infrastructure\.Persistence\.Models/s);
  assert.match(backendPattern, /AtlasX Core Query result.*Domain entity\/value object/s);
  assert.match(backendPattern, /Do not add another namespace or `Application\.Models`/);
  for (const marker of ["Do not add Type A/B/C", "Ask the owner only when the signals", "### `backend_profile=agmbo`", "Structure over logic"])
    assert.ok(backendDiscipline.includes(marker), `backend owner missing: ${marker}`);

  assert.match(frontendPattern, /Apply \[frontend-engineer\.md\].*unchanged/);
  for (const marker of ["Ask the owner only when the signals", "Structure over logic", "Reuse-first decision", "Reuse index"])
    assert.ok(frontendDiscipline.includes(marker), `frontend owner missing: ${marker}`);

  assert.match(promptPolicy, /exact \[Workspace-need contract\]/);
  for (const marker of ["at most five active agents", "isolation: worktree", "required uncommitted parent state"])
    assert.ok(delegationPolicy.includes(marker), `delegation owner missing: ${marker}`);
});
