import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "../../helpers/harness.mjs";

const read = (relativePath) => readFile(path.join(projectRoot, relativePath), "utf8");
const operations = JSON.parse(await read("config/operations.json")).operations;
const usage = await read("docs/USAGE.md");
const canonical = await read("skills/agrimap-agent-skills/SKILL.md");
const platformSyntax = await read("skills/agrimap-agent-skills/references/platform-syntax.md");
const rootIgnore = await read(".gitignore");
const codexManifest = JSON.parse(await read("plugins/agrimap-agent-skills/.codex-plugin/plugin.json"));
const claudeManifest = JSON.parse(await read("plugins/agrimap-agent-skills/.claude-plugin/plugin.json"));
const geminiManifest = JSON.parse(await read("gemini-extension.json"));
const refactorModes = [...(await read("skills/agrimap-agent-skills/references/refactor-modes.md")).matchAll(/^## `([^`]+)`/gm)].map((match) => match[1]);

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(entryPath));
    else files.push(entryPath);
  }
  return files;
}

test("published aliases use operation-specific progressive-disclosure entrypoints", async () => {
  assert.ok(operations.some((item) => item.name === "agm-history" && item.operation === "history"));
  for (const item of operations) {
    const aliasSkill = await read(`plugins/agrimap-agent-skills/skills/${item.name}/SKILL.md`);
    const geminiCommand = await read(`commands/${item.name}.toml`);
    assert.match(aliasSkill, /references\/runtime-core\.md/);
    assert.match(aliasSkill, /references\/glossary\.md/);
    assert.ok(aliasSkill.includes(`references/operations/${item.operation}.md`));
    assert.ok(aliasSkill.includes(`Run operation \`${item.operation}\``));
    assert.match(aliasSkill, /Do \*\*not\*\* read `\.\.\/agrimap-agent-skills\/SKILL\.md` during a normal alias invocation/);
    assert.match(aliasSkill, /standalone `-h` or `--help` token/);
    assert.ok(geminiCommand.includes(`operation ${item.operation}`));
    assert.match(geminiCommand, /compact progressive-disclosure entrypoint/);
    assert.match(geminiCommand, /do not load the umbrella SKILL\.md during a normal alias invocation/);
    assert.match(geminiCommand, /standalone -h or --help token/);
    assert.ok((await read(`skills/agrimap-agent-skills/references/operations/${item.operation}.md`)).includes(`Operation: \`${item.operation}\``));
    assert.ok(usage.includes(`\`${item.name}\``));
    assert.ok(usage.includes(`$${item.name} `));
  }

  const commands = (await readdir(path.join(projectRoot, "commands"))).filter((name) => name.endsWith(".toml"));
  assert.deepEqual(commands.sort(), operations.map((item) => `${item.name}.toml`).sort());
  assert.equal(operations.some((item) => item.name === "agm-fe-engineer"), false);
});

test("plugin umbrella is a byte-for-byte generated mirror of the canonical skill", async () => {
  const canonicalRoot = path.join(projectRoot, "skills", "agrimap-agent-skills");
  const mirrorRoot = path.join(projectRoot, "plugins", "agrimap-agent-skills", "skills", "agrimap-agent-skills");
  const canonicalFiles = (await filesUnder(canonicalRoot)).map((file) => path.relative(canonicalRoot, file)).sort();
  const mirrorFiles = (await filesUnder(mirrorRoot)).map((file) => path.relative(mirrorRoot, file)).sort();
  assert.deepEqual(mirrorFiles, canonicalFiles, "Run npm run sync: plugin umbrella file list drifted from canonical.");
  for (const relativeFile of canonicalFiles) {
    assert.deepEqual(
      await readFile(path.join(mirrorRoot, relativeFile)),
      await readFile(path.join(canonicalRoot, relativeFile)),
      `Run npm run sync: plugin umbrella content drifted at ${relativeFile}.`,
    );
  }
  assert.match(await read("plugins/agrimap-agent-skills/README.md"), /Do not edit generated copies directly/);
});

test("usage documentation covers activation, help, and provider syntax", async () => {
  assert.match(canonical, /AgriMap skill active/);
  assert.match(canonical, /activation receipt/i);
  assert.match(canonical, /standalone `-h` or `--help` token/);
  assert.doesNotMatch(canonical, /\.\.\/\.\.\/docs\/USAGE\.md/);
  assert.doesNotMatch(platformSyntax, /\.\.\/\.\.\/\.\.\/docs\/USAGE\.md/);
  assert.match(platformSyntax, /umbrella-only standalone: `\/agrimap-agent-skills operation=analyze -h`/);
  assert.match(usage, /Larger text \/ ข้อความยาว/);
  assert.match(usage, /รูปภาพและ visual reference/);
  assert.match(usage, /Attachments, pointed files, directories, and exact lines/);
  assert.match(usage, /Automated smoke test vs\. live-provider check/);
  assert.match(usage, /\$agm-analyze -h/);
  assert.match(usage, /\/agrimap-agent-skills:agm-analyze -h/);
  assert.match(usage, /\/agrimap-agent-skills operation=analyze -h/);
  assert.match(usage, /Start-Process "https:\/\/github\.com\/gasxhermvc\/agrimap-agent-skills\/blob\/main\/docs\/USAGE\.md"/);
  assert.match(usage, /code \.\\docs\\USAGE\.md/);
  assert.match(usage, /notepad \.\\docs\\USAGE\.md/);
  assert.ok(rootIgnore.split(/\r?\n/).includes(".agrimap-agent/"));
  assert.equal(await read("plugins/agrimap-agent-skills/docs/USAGE.md"), usage);
});

test("provider hook discovery is isolated per host", async () => {
  assert.equal(codexManifest.hooks, "./hooks/codex-hooks.json");
  assert.equal(claudeManifest.hooks, "./hooks/claude-hooks.json");
  assert.equal(codexManifest.version, JSON.parse(await read("package.json")).version);
  assert.equal(claudeManifest.version, codexManifest.version);
  assert.equal(geminiManifest.version, codexManifest.version);

  const providerArtifacts = [
    ["codex", `plugins/agrimap-agent-skills/${codexManifest.hooks.replace(/^\.\//, "")}`, 3],
    ["claude", `plugins/agrimap-agent-skills/${claudeManifest.hooks.replace(/^\.\//, "")}`, 3],
    ["gemini", "hooks/hooks.json", 2],
  ];
  for (const [provider, hookPath, expectedCount] of providerArtifacts) {
    const content = await read(hookPath);
    assert.equal(content.match(new RegExp(`--provider ${provider}`, "g"))?.length, expectedCount);
    for (const otherProvider of ["codex", "claude", "gemini"].filter((candidate) => candidate !== provider)) {
      assert.doesNotMatch(content, new RegExp(`--provider ${otherProvider}`), `${hookPath} leaks ${otherProvider}`);
    }
  }

  await assert.rejects(
    read("plugins/agrimap-agent-skills/hooks/hooks.json"),
    { code: "ENOENT" },
    "Codex and Claude must not share an auto-discovered default hook file",
  );
});

test("usage documentation covers supported targets and refactor modes", () => {
  for (const targetKind of ["fe-main", "fe-library", "be-main", "be-library", "sql-table", "sql-procedure", "sql-table-and-procedure"])
    assert.ok(usage.includes(`target_kind=${targetKind}`));
  for (const backendProfile of ["agmws", "agmbo"])
    assert.ok(usage.includes(`backend_profile=${backendProfile}`));
  for (const mode of refactorModes)
    assert.ok(usage.includes(`refactor_mode=${mode}`));
  for (const usedMode of [...usage.matchAll(/refactor_mode=([a-z-]+)/g)].map((match) => match[1]))
    assert.ok(refactorModes.includes(usedMode), `Unknown refactor mode in usage guide: ${usedMode}`);
});

test("published input fixtures match their plugin copies", async () => {
  const largeRequest = await read("examples/inputs/LONG-REQUEST.md");
  const visualReference = await read("examples/inputs/references/checkout-flow.svg");
  const requesterNote = await read("examples/inputs/references/feature-note.md");
  assert.equal(await read("plugins/agrimap-agent-skills/examples/inputs/LONG-REQUEST.md"), largeRequest);
  assert.equal(await read("plugins/agrimap-agent-skills/examples/inputs/references/checkout-flow.svg"), visualReference);
  assert.match(largeRequest, /## Acceptance criteria/);
  assert.match(largeRequest, /## Authorized decision-owner decisions/);
  assert.match(largeRequest, /Requester authority: owner/);
  assert.match(visualReference, /^<svg[\s\S]+<title[\s\S]+<desc[\s\S]+<\/svg>\s*$/);
  assert.match(requesterNote, /network timeout as an unknown outcome/);
});
