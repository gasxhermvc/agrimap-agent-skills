import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "../helpers/harness.mjs";
import {
  budgetIssuesForStage,
  measureText,
  routeCoverageIssues,
} from "../../skills/agrimap-agent-skills/scripts/token-coverage.mjs";

const script = path.join(projectRoot, "skills", "agrimap-agent-skills", "scripts", "token-coverage.mjs");

test("token coverage uses deterministic word, character, and estimate counts", () => {
  assert.deepEqual(measureText("one two\nthree"), {
    words: 3,
    characters: 13,
    lines: 2,
    estimatedTokensLow: 4,
    estimatedTokensHigh: 5,
  });
});

test("route coverage reports a condition that an operation cannot load", () => {
  assert.deepEqual(
    routeCoverageIssues(
      { activate: ["frontend-engineer.md"] },
      { operation: "analyze", conditionalReferences: [] },
    ).map((issue) => issue.code),
    ["ROUTE_REFERENCE_MISSING"],
  );
});

test("budget coverage checks words and upper token estimate", () => {
  assert.deepEqual(
    budgetIssuesForStage(
      "required",
      { words: 11, estimatedTokensHigh: 21 },
      { maxWords: 10, maxEstimatedTokensHigh: 20 },
    ).map((issue) => issue.code),
    ["WORD_BUDGET_EXCEEDED", "TOKEN_BUDGET_EXCEEDED"],
  );
});

test("CLI reports a selected scenario with three progressive-disclosure stages", () => {
  const report = JSON.parse(execFileSync(
    process.execPath,
    [script, "--root", projectRoot, "--scenario", "refactor-fe-main-light", "--json"],
    { cwd: projectRoot, encoding: "utf8" },
  ));
  assert.equal(report.summary.scenarios, 1);
  assert.equal(report.summary.coverageIssues, 0);
  assert.equal(report.summary.budgetIssues, 0);
  assert.equal(report.scenarios[0].files.filter((file) => file.group === "direct").length, 3);
  assert.ok(report.scenarios[0].stages.direct.words < report.scenarios[0].stages.required.words);
  assert.deepEqual(report.scenarios[0].stages.required, report.scenarios[0].stages.scenario);
});

test("router scenario excludes lifecycle and operation execution contracts", () => {
  const report = JSON.parse(execFileSync(
    process.execPath,
    [script, "--root", projectRoot, "--scenario", "router-only", "--json"],
    { cwd: projectRoot, encoding: "utf8" },
  ));
  const countedPaths = report.scenarios[0].files.map((file) => file.path);
  assert.equal(report.summary.coverageIssues, 0);
  assert.equal(report.scenarios[0].files.filter((file) => file.group === "direct").length, 1);
  assert.ok(countedPaths.some((file) => file.endsWith("references/operation-index.md")));
  assert.ok(countedPaths.some((file) => file.endsWith("references/platform-syntax.md")));
  assert.ok(countedPaths.every((file) => !file.endsWith("references/lifecycle-core.md")));
});

test("strict CLI succeeds for the curated refactor scenario", () => {
  const result = spawnSync(
    process.execPath,
    [script, "--root", projectRoot, "--scenario", "refactor-fe-main-light", "--strict", "--json"],
    { cwd: projectRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
