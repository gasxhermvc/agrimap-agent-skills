#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const operations = JSON.parse(await read("config/operations.json")).operations;
const usage = await read("docs/USAGE.md");
const canonical = await read("skills/agrimap-agent-skills/SKILL.md");
const rootIgnore = await read(".gitignore");
const claudeHooks = await read("plugins/agrimap-agent-skills/hooks/hooks.json");
const geminiHooks = await read("hooks/hooks.json");
const refactorModes = [...(await read("skills/agrimap-agent-skills/references/refactor-modes.md")).matchAll(/^## `([^`]+)`/gm)].map((match) => match[1]);

assert.match(canonical, /AgriMap skill active/);
assert.match(canonical, /activation receipt/i);
assert.match(usage, /Larger text \/ ข้อความยาว/);
assert.match(usage, /รูปภาพและ visual reference/);
assert.match(usage, /Attachments, pointed files, directories, and exact lines/);
assert.match(usage, /Automated smoke test vs\. live-provider check/);
assert.ok(rootIgnore.split(/\r?\n/).includes(".agrimap-agent/"));
assert.equal(await read("plugins/agrimap-agent-skills/docs/USAGE.md"), usage);
assert.doesNotMatch(claudeHooks, /--provider auto/);
assert.equal(claudeHooks.match(/--provider claude/g)?.length, 3);
assert.equal(geminiHooks.match(/--provider gemini/g)?.length, 2);

const aliasCases = [];
for (const item of operations) {
  const aliasSkill = await read(`plugins/agrimap-agent-skills/skills/${item.name}/SKILL.md`);
  const geminiCommand = await read(`commands/${item.name}.toml`);
  assert.match(aliasSkill, /Activate and read the sibling `agrimap-agent-skills` umbrella skill/);
  assert.ok(aliasSkill.includes(`Run operation \`${item.operation}\``));
  assert.ok(geminiCommand.includes(`run operation ${item.operation}`));
  assert.ok(usage.includes(`\`${item.name}\``));
  assert.ok(usage.includes(`$${item.name} `));
  aliasCases.push({ alias: item.name, operation: item.operation, route: "verified" });
}

const commands = (await readdir(path.join(root, "commands"))).filter((name) => name.endsWith(".toml"));
assert.deepEqual(commands.sort(), operations.map((item) => `${item.name}.toml`).sort());
assert.equal(operations.some((item) => item.name === "agm-fe-engineer"), false);

for (const targetKind of ["fe-main", "fe-library", "be-main", "be-library", "sql-table", "sql-procedure", "sql-table-and-procedure"])
  assert.ok(usage.includes(`target_kind=${targetKind}`));
for (const backendProfile of ["agmws", "agmbo"])
  assert.ok(usage.includes(`backend_profile=${backendProfile}`));
for (const mode of refactorModes)
  assert.ok(usage.includes(`refactor_mode=${mode}`));
for (const usedMode of [...usage.matchAll(/refactor_mode=([a-z-]+)/g)].map((match) => match[1]))
  assert.ok(refactorModes.includes(usedMode), `Unknown refactor mode in usage guide: ${usedMode}`);

const largeRequest = await read("examples/inputs/LONG-REQUEST.md");
const visualReference = await read("examples/inputs/references/checkout-flow.svg");
const ownerNote = await read("examples/inputs/references/feature-note.md");
assert.equal(await read("plugins/agrimap-agent-skills/examples/inputs/LONG-REQUEST.md"), largeRequest);
assert.equal(await read("plugins/agrimap-agent-skills/examples/inputs/references/checkout-flow.svg"), visualReference);
assert.match(largeRequest, /## Acceptance criteria/);
assert.match(largeRequest, /## Owner decisions/);
assert.match(visualReference, /^<svg[\s\S]+<title[\s\S]+<desc[\s\S]+<\/svg>\s*$/);
assert.match(ownerNote, /network timeout as an unknown outcome/);

process.stdout.write(`${JSON.stringify({
  ok: true,
  aliases: aliasCases.length,
  cases: [
    "Codex, Claude, and Gemini invocation syntax documented",
    "activation receipt contract present",
    "every published alias routes to the umbrella operation",
    "every published alias has a minimal runnable example",
    "Claude and Gemini hooks pass explicit provider names",
    "all FE, BE, and SQL creation/test target cases documented",
    "all supported refactor modes documented and enum-checked",
    "large-text file and bounded-paste guidance present",
    "image, attachment, directory, file, line, and stable-anchor guidance present",
    "large-text, visual, and owner-note fixtures validated",
    "development .agrimap-agent state is ignored",
  ],
  operations: aliasCases,
}, null, 2)}\n`);
