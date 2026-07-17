import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "../helpers/harness.mjs";

const sqlDiscipline = await readFile(path.join(projectRoot, "skills", "agrimap-agent-skills", "references", "patterns", "sql.md"), "utf8");
const evals = await readFile(path.join(projectRoot, "skills", "agrimap-agent-skills", "references", "evals", "sql-scenarios.md"), "utf8");

test("SQL eval catalog is reachable and encodes deterministic cross-provider gates", () => {
  assert.match(sqlDiscipline, /\[sql-scenarios\.md\]\(\.\.\/evals\/sql-scenarios\.md\)/);
  assert.match(sqlDiscipline, /do not load the eval catalog during ordinary SQL work/i);

  const matches = [...evals.matchAll(/^## S(\d+) —[^\n]+\n([\s\S]*?)(?=^## S\d+ —|^## Release gate)/gm)];
  assert.deepEqual(matches.map((match) => Number(match[1])), [1, 2, 3, 4, 5, 6]);
  for (const [scenarioId, body] of matches.map((match) => [`S${match[1]}`, match[2]])) {
    assert.match(body, /^\*\*Situation:\*\*/m, `${scenarioId}: Situation missing`);
    assert.match(body, /^\*\*Prompt:\*\*/m, `${scenarioId}: Prompt missing`);
    assert.match(body, /\*\*\[HARD\]\*\*/, `${scenarioId}: HARD assertion missing`);
    assert.match(body, /\*\*\[RUBRIC\]\*\*/, `${scenarioId}: RUBRIC assertion missing`);
    assert.match(body, /^\*\*Anti-pattern:\*\*/m, `${scenarioId}: anti-pattern missing`);
  }

  for (const provider of ["Claude", "Codex", "Gemini"]) assert.ok(evals.includes(provider));
  assert.match(evals, /at least three times/i);
  assert.match(evals, /validate-sql-artifacts\.mjs/);
});
