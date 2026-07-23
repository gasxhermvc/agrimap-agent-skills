import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "../helpers/harness.mjs";

const read = (relative) => readFile(path.join(projectRoot, relative), "utf8");
const operations = JSON.parse(await read("config/operations.json")).operations;
const passiveMap = JSON.parse(await read("skills/agrimap-agent-skills/assets/passive-skill-map.json"));
const urlMatrix = await read("skills/agrimap-agent-skills/references/application-url-matrix.md");
const hook = await read("skills/agrimap-agent-skills/scripts/hook-context.mjs");

test("Goal Rules are mandatory across the approved operation matrix", () => {
  const expected = ["analyze", "architect", "be", "design", "diagnose", "fe", "sql", "review", "simulate", "execute", "plan", "qa", "prompt"];
  const goalRules = passiveMap.capabilities.find((item) => item.id === "goal-rules");
  assert.deepEqual(goalRules.operations, expected);
  for (const operation of expected) {
    const item = operations.find((candidate) => candidate.operation === operation);
    assert.ok(item.references.some((reference) => reference.path === "goal-rules.md"), `${operation} must load Goal Rules`);
  }
});

test("passive capabilities never grant product writes", () => {
  assert.deepEqual(passiveMap.capabilities.map((item) => item.id), ["goal-rules", "refactor-guard", "test-decision", "design-discipline", "sql-explain"]);
  for (const capability of passiveMap.capabilities) assert.equal(capability.grantsProductWrite, false, capability.id);
});

test("domain refactor replaces every standalone refactor alias", () => {
  const names = operations.map((item) => item.name);
  for (const removed of ["agm-refactor", "agm-refactor-fe", "agm-refactor-be", "agm-refactor-sql"]) assert.equal(names.includes(removed), false);
  for (const name of ["agm-fe", "agm-be", "agm-sql"]) {
    const action = operations.find((item) => item.name === name).actions.find((item) => item.name === "refactor");
    assert.deepEqual(action, {
      name: "refactor",
      mode: "product-write",
      activation: "explicit",
      depths: ["light", "standard", "regulated"],
      purpose: action.purpose,
    });
  }
});

test("agm-prompt is the only prompt alias and remains artifactless light", () => {
  assert.equal(operations.some((item) => item.name === "agm-create-prompt"), false);
  const prompt = operations.find((item) => item.name === "agm-prompt");
  assert.deepEqual(prompt.depth, { default: "light", allowed: ["light"] });
  assert.equal(prompt.mode, "workflow-write-only");
  assert.match(prompt.deliverable, /never tasks\/\*\*/);
});

test("URL matrix preserves exact environment and callback invariants", () => {
  for (const exact of [
    "`http://localhost:4202/agrimap-suite-wa/ii-online`",
    "`http://localhost:4202/agrimap-suite-wa/executive`",
    "`https://agrimap-online.cdg.co.th`",
    "`https://agrimap-ex.ldd.go.th`",
    "`https://agrimap-platform.ldd.go.th/callback`",
    "`https://agrimap-pro.cdg.co.th/callback`",
  ]) assert.ok(urlMatrix.includes(exact), exact);
  const onlineCallback = urlMatrix.match(/^\| \*\*agrimap-online\*\* \| (?:Default|Normal) \|.*$/gm);
  const exCallback = urlMatrix.match(/^\| \*\*agrimap-ex\*\* \| (?:Default|Normal) \|.*$/gm);
  assert.equal(onlineCallback.length, 4);
  assert.equal(exCallback.length, 4);
  assert.match(urlMatrix, /Never synthesize a URL by generic string concatenation/);
  assert.match(urlMatrix, /Unsupported combinations return an explicit unsupported result/);
});

test("raw hook stores requester submits only in the conversation history file", () => {
  assert.match(hook, /prompts", local\.period, conversationId, "history\.md"/);
  assert.match(hook, /### \[\$\{local\.date\} \$\{local\.time\}\]/);
  assert.doesNotMatch(hook, /Command: \$\{prompt\}/);
});
