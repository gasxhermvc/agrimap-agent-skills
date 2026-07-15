#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { LOG_EVENTS } from "../skills/agrimap-agent-skills/scripts/log-events.mjs";

const root = process.cwd();
const errors = [];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function parseJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

async function filesUnder(directory) {
  const result = [];
  if (!(await exists(directory))) return result;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(entryPath));
    else result.push(entryPath);
  }
  return result;
}

function hookCommands(value) {
  if (Array.isArray(value)) return value.flatMap(hookCommands);
  if (!value || typeof value !== "object") return [];
  return [
    ...(typeof value.command === "string" ? [value.command] : []),
    ...Object.entries(value)
      .filter(([key]) => key !== "command")
      .flatMap(([, child]) => hookCommands(child)),
  ];
}

for (const required of [
  "skills/agrimap-agent-skills/SKILL.md",
  "plugins/agrimap-agent-skills/.codex-plugin/plugin.json",
  "plugins/agrimap-agent-skills/.claude-plugin/plugin.json",
  ".agents/plugins/marketplace.json",
  ".claude-plugin/marketplace.json",
  "gemini-extension.json",
  "hooks/hooks.json",
  "skills/agrimap-agent-skills/references/patterns/conflict-resolution.md",
  "skills/agrimap-agent-skills/references/analysis-discipline.md",
  "skills/agrimap-agent-skills/references/backend-engineer.md",
  "skills/agrimap-agent-skills/references/service-ownership.md",
  "skills/agrimap-agent-skills/scripts/log-events.mjs",
  "skills/agrimap-agent-skills/scripts/identity.mjs",
  "skills/agrimap-agent-skills/assets/templates/service-ownership.yaml",
  "tests/README.md",
  "tests/helpers/harness.mjs",
  "tests/unit/cli-args.test.mjs",
  "tests/unit/extract-code-blocks.test.mjs",
  "tests/unit/verify-golden.test.mjs",
  "tests/integration/package/usage.test.mjs",
  "tests/integration/workspace/workspace.test.mjs",
  "tests/integration/workspace/cases/bootstrap-and-prune.mjs",
  "tests/integration/workspace/cases/identity-and-checkpoint.mjs",
  "tests/integration/workspace/cases/hooks.mjs",
  "tests/integration/workspace/cases/completion.mjs",
  "tests/integration/workspace/cases/history.mjs",
  "tests/integration/workspace/cases/frontend-reuse.mjs",
  "docs/USAGE.md",
  "plugins/agrimap-agent-skills/docs/USAGE.md",
  "examples/inputs/LONG-REQUEST.md",
  "examples/inputs/references/checkout-flow.svg",
  "plugins/agrimap-agent-skills/examples/inputs/references/checkout-flow.svg",
]) {
  if (!(await exists(path.join(root, required)))) errors.push(`${required}: missing`);
}

for (const legacyTestRunner of ["tools/test-scripts.mjs", "tools/test-usage-examples.mjs"]) {
  if (await exists(path.join(root, legacyTestRunner))) errors.push(`${legacyTestRunner}: obsolete monolithic test runner found`);
}

const packageManifest = await parseJson("package.json");
const operations = await parseJson("config/operations.json");
const codexPlugin = await parseJson("plugins/agrimap-agent-skills/.codex-plugin/plugin.json");
const claudePlugin = await parseJson("plugins/agrimap-agent-skills/.claude-plugin/plugin.json");
const codexMarketplace = await parseJson(".agents/plugins/marketplace.json");
const claudeMarketplace = await parseJson(".claude-plugin/marketplace.json");
const geminiExtension = await parseJson("gemini-extension.json");
const geminiHooks = await parseJson("hooks/hooks.json");
const pluginHooks = await parseJson("plugins/agrimap-agent-skills/hooks/hooks.json");

if (!packageManifest?.scripts?.test?.includes("npm run verify:golden")) errors.push("npm test must include golden verification.");
for (const scriptName of ["test:unit", "test:integration", "test:workspace", "test:usage"]) {
  if (!packageManifest?.scripts?.[scriptName]) errors.push(`package.json script is missing: ${scriptName}`);
}
if (!packageManifest?.scripts?.test?.includes("npm run test:unit") || !packageManifest?.scripts?.test?.includes("npm run test:integration")) {
  errors.push("npm test must run the categorized unit and integration suites.");
}

const canonicalSkill = await readFile(path.join(root, "skills", "agrimap-agent-skills", "SKILL.md"), "utf8");
if (!/^---\r?\nname: agrimap-agent-skills\r?\ndescription: .+\r?\n---/s.test(canonicalSkill)) errors.push("Canonical SKILL.md frontmatter is invalid.");
if (canonicalSkill.split(/\r?\n/).length > 500) errors.push("Canonical SKILL.md exceeds 500 lines.");
for (const marker of ["Answer audit/history questions", "conversational recall alone", "created event must preserve the requested objective"])
  if (!canonicalSkill.includes(marker)) errors.push(`Canonical audit/history contract missing marker: ${marker}`);

const memoryAndLogsReference = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "memory-and-logs.md"), "utf8");
const documentedLogEvents = memoryAndLogsReference.match(/"event":\s*"([^"]+)"/)?.[1]?.split("|") || [];
if (JSON.stringify(documentedLogEvents) !== JSON.stringify(LOG_EVENTS)) {
  errors.push(`Documented log event enum differs from scripts/log-events.mjs: ${documentedLogEvents.join("|") || "missing"}`);
}
const workspaceScriptReference = await readFile(path.join(root, "skills", "agrimap-agent-skills", "scripts", "agm-workspace.mjs"), "utf8");
if (!workspaceScriptReference.includes('from "./log-events.mjs"')) {
  errors.push("agm-workspace.mjs does not enforce the canonical log event enum.");
}
for (const marker of ["auditEventIssues", 'case "history"', "REQUEST_OBJECTIVE_REQUIRED", "TASK_ID_EXISTS", "AMBIGUOUS_ACTIVE_TASK"])
  if (!workspaceScriptReference.includes(marker)) errors.push(`Workspace audit implementation missing marker: ${marker}`);

const syncAdapter = await readFile(path.join(root, "tools", "sync-adapters.mjs"), "utf8");
if (!syncAdapter.includes("packageManifest.version")) errors.push("Sync adapter does not read the canonical package version.");
if (/\bversion\s*:\s*["']\d+\.\d+\.\d+/.test(syncAdapter)) errors.push("Sync adapter contains a hardcoded semantic version.");

const ownerExampleStatus = "missing-owner-example";
for (const relativePath of [
  "README.md",
  "skills/agrimap-agent-skills/references/patterns/conflict-resolution.md",
  "skills/agrimap-agent-skills/references/patterns/pattern-status.md",
]) {
  const content = await readFile(path.join(root, relativePath), "utf8");
  if (!content.includes(ownerExampleStatus)) errors.push(`${relativePath}: canonical owner-example status is missing`);
  if (content.includes("needs-owner-example")) errors.push(`${relativePath}: obsolete owner-example status found`);
}

const conflictReference = "references/patterns/conflict-resolution.md";
if (!canonicalSkill.includes(conflictReference)) errors.push("Canonical skill does not route golden evidence through conflict-resolution.md.");
for (const relativePath of [
  "skills/agrimap-agent-skills/references/patterns/frontend.md",
  "skills/agrimap-agent-skills/references/patterns/backend.md",
  "skills/agrimap-agent-skills/references/patterns/sql.md",
]) {
  const content = await readFile(path.join(root, relativePath), "utf8");
  if (!content.includes("conflict-resolution.md")) errors.push(`${relativePath}: conflict-resolution link missing`);
}

const delegationReference = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "subagents-and-branches.md"), "utf8");
for (const marker of ["one writer model per wave", "workspace_need", "base commit", "isolated-sandbox", "portable patch", "The owner must not be asked"])
  if (!delegationReference.includes(marker)) errors.push(`Delegation contract missing marker: ${marker}`);
for (const marker of ["QA is a read-only subagent/context", "isolation: worktree", "normal subagent starts in the current working directory"])
  if (!delegationReference.includes(marker)) errors.push(`Delegation/QA isolation contract missing marker: ${marker}`);

const workflowReference = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "workflows.md"), "utf8");
const createFeatureSection = workflowReference.split("## `/agm-create-feature`")[1]?.split("## `/agm-create-prompt`")[0] || "";
const createFeatureTargetList = createFeatureSection.split("When `target_kind=be-main`")[0];
if (!createFeatureSection.includes("require `backend_profile`") || !createFeatureSection.includes("- `agmws`") || !createFeatureSection.includes("- `agmbo`")) errors.push("Create-feature workflow does not require the two approved backend profiles.");
if (!createFeatureSection.includes("Do not use `agmws` or `agmbo` as `target_kind`")) errors.push("Create-feature workflow does not reject backend profiles as target kinds.");
if (createFeatureTargetList.includes("- `agmws`") || createFeatureTargetList.includes("- `agmbo`")) errors.push("Create-feature target_kind still contains a backend profile.");
for (const marker of ["SQL message collection gate", "table-only", "Back-end error/message reconciliation", "idempotent deployment insert"])
  if (!workflowReference.includes(marker)) errors.push(`Workflow message-collection contract missing marker: ${marker}`);

const sqlPattern = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "patterns", "sql.md"), "utf8");
for (const marker of ["## Message collection gate", "`messages.txt`-style artifact", "same code + same meaning", "same code + different or ambiguous meaning", "rerunnable/idempotent insert", "`no message changes`", "`readability-organization`", "`strict-preserve-logic`"])
  if (!sqlPattern.includes(marker)) errors.push(`SQL message-collection contract missing marker: ${marker}`);

const promptReference = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "create-prompt.md"), "utf8");
if (promptReference.includes("`project_kind`")) errors.push("create-prompt still uses the superseded project_kind dimension.");
if (!promptReference.includes("exactly `agmws` or `agmbo`")) errors.push("create-prompt backend_profile enum is missing.");
for (const marker of ["execution source of truth", "deviation_from_prompt", "independent read-only QA", "service-ownership.yaml", "workspace_need", "base_commit", "fallback_mode"])
  if (!promptReference.includes(marker)) errors.push(`create-prompt contract missing marker: ${marker}`);

const qaReference = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "qa-and-done.md"), "utf8");
for (const marker of ["independent read-only QA", "Result Package as testimony", "There is no conditional pass", "qa-failed"])
  if (!qaReference.includes(marker)) errors.push(`QA contract missing marker: ${marker}`);
for (const marker of ["`messages.txt`-style artifact", "duplicate handling plus idempotent inserts", "QA evidence must name the artifact path", "codes found, reused, added, and conflicted", "inspected producer files", "explicit `no message changes`"])
  if (!qaReference.includes(marker)) errors.push(`QA message-artifact contract missing marker: ${marker}`);

const frontendDiscipline = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "frontend-engineer.md"), "utf8");
if (!frontendDiscipline.includes("discipline layer, not a standalone workflow")) errors.push("Frontend engineering is not defined as a composable discipline.");
if (frontendDiscipline.includes("`/agm-fe-engineer`")) errors.push("Frontend engineering still declares a standalone alias.");

const backendDiscipline = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "backend-engineer.md"), "utf8");
for (const marker of ["passive discipline", "`be-main`", "`be-library`", "`agmws`", "`agmbo`", "`foundation`", "`active-development`", "`stabilization`", "Do not add Type A/B/C or a required `change_kind`"])
  if (!backendDiscipline.includes(marker)) errors.push(`Backend discipline missing marker: ${marker}`);
if (backendDiscipline.includes("Require `change_kind`")) errors.push("Backend discipline incorrectly requires change_kind.");
for (const marker of ["## Error/message reconciliation", "same code + same meaning", "same code + different or ambiguous meaning", "idempotent insert", "`no message changes`"])
  if (!backendDiscipline.includes(marker)) errors.push(`Backend message-reconciliation contract missing marker: ${marker}`);

const modelMatrix = await readFile(path.join(root, "skills", "agrimap-agent-skills", "references", "model-capability-matrix.yaml"), "utf8");
if (modelMatrix.includes("fable5")) errors.push("Fable is duplicated as fable and fable5 instead of one model label.");
if (!modelMatrix.includes("fable: Fable 5")) errors.push("Fable 5 display label is missing.");
if (!modelMatrix.includes("mode: sparse_overrides") || !modelMatrix.includes("fallback: model_key")) errors.push("Display-label fallback policy must declare sparse overrides with model-key fallback.");

const rootIgnore = await readFile(path.join(root, ".gitignore"), "utf8").catch(() => "");
if (!rootIgnore.split(/\r?\n/).includes(".agrimap-agent/")) errors.push("Development repository must ignore its entire local .agrimap-agent state.");

const goldenManifest = await parseJson("skills/agrimap-agent-skills/references/patterns/golden/manifest.json");
if (goldenManifest?.annotation !== "../conflict-resolution.md") errors.push("Golden manifest does not point to the canonical conflict annotation.");
if (packageManifest?.repository?.url !== "git+https://github.com/gasxhermvc/agrimap-agent-skills.git") errors.push("Package repository URL is invalid.");

if (await exists(path.join(root, ".agm"))) errors.push("Legacy .agm directory must not exist.");
if (await exists(path.join(root, ".agrimap-agent", "owner.json"))) errors.push("Shared owner.json must not exist.");
if (await exists(path.join(root, ".agrimap-agent", "runtime", "active-task.json"))) errors.push("Shared active-task.json must not exist.");

for (const [label, manifest] of [["Codex", codexPlugin], ["Claude", claudePlugin], ["Gemini", geminiExtension]]) {
  if (manifest && manifest.name !== "agrimap-agent-skills") errors.push(`${label} manifest name differs from agrimap-agent-skills.`);
  if (manifest && manifest.version !== packageManifest?.version) errors.push(`${label} manifest version differs from package version ${packageManifest?.version}.`);
}
if (codexMarketplace?.plugins?.[0]?.source?.path !== "./plugins/agrimap-agent-skills") errors.push("Codex marketplace source path is invalid.");
if (claudeMarketplace?.plugins?.[0]?.source !== "./plugins/agrimap-agent-skills") errors.push("Claude marketplace source path is invalid.");
if (claudeMarketplace?.plugins?.[0]?.version !== packageManifest?.version) errors.push(`Claude marketplace version differs from package version ${packageManifest?.version}.`);
if (!geminiHooks?.hooks?.SessionStart || !geminiHooks?.hooks?.BeforeAgent) errors.push("Gemini context hooks are incomplete.");
if (!pluginHooks?.hooks?.SessionStart || !pluginHooks?.hooks?.UserPromptSubmit || !pluginHooks?.hooks?.SubagentStart) errors.push("Claude context hooks are incomplete.");
const claudeHookCommands = hookCommands(pluginHooks);
if (!claudeHookCommands.length || claudeHookCommands.some((command) => !command.includes("--provider claude"))) errors.push("Claude hooks must pass an explicit claude provider.");
const geminiHookCommands = hookCommands(geminiHooks);
if (!geminiHookCommands.length || geminiHookCommands.some((command) => !command.includes("--provider gemini"))) errors.push("Gemini hooks must pass an explicit gemini provider.");

if (operations) {
  const names = operations.operations.map((item) => item.name);
  if (new Set(names).size !== names.length) errors.push("Operation aliases are not unique.");
  if (names.includes("agm-fe-engineer")) errors.push("Passive frontend discipline must not expose agm-fe-engineer.");
  if (!operations.operations.some((item) => item.name === "agm-history" && item.operation === "history")) errors.push("agm-history operation is required for durable requester/task queries.");
  for (const name of names) {
    for (const target of [
      path.join(root, "commands", `${name}.toml`),
      path.join(root, "plugins", "agrimap-agent-skills", "skills", name, "SKILL.md"),
    ]) {
      if (!(await exists(target))) errors.push(`${path.relative(root, target)}: generated adapter missing`);
    }
  }
  const commands = (await filesUnder(path.join(root, "commands"))).filter((file) => file.endsWith(".toml"));
  if (commands.length !== names.length) errors.push(`Expected ${names.length} Gemini commands; found ${commands.length}.`);
}

for (const command of await filesUnder(path.join(root, "commands"))) {
  if (!command.endsWith(".toml")) continue;
  const content = await readFile(command, "utf8");
  if (!/^description = ".+"\r?\nprompt = ".+"\r?\n$/s.test(content)) errors.push(`${path.relative(root, command)}: unexpected TOML adapter shape`);
  if (content.includes("\\\\n")) errors.push(`${path.relative(root, command)}: contains literal escaped newline text`);
}

const canonicalDirectory = path.join(root, "skills", "agrimap-agent-skills");
const pluginCanonicalDirectory = path.join(root, "plugins", "agrimap-agent-skills", "skills", "agrimap-agent-skills");
const canonicalFiles = (await filesUnder(canonicalDirectory)).map((file) => path.relative(canonicalDirectory, file)).sort();
const pluginCanonicalFiles = (await filesUnder(pluginCanonicalDirectory)).map((file) => path.relative(pluginCanonicalDirectory, file)).sort();

for (const relativeFile of canonicalFiles.filter((file) => file.endsWith(".md"))) {
  const sourcePath = path.join(canonicalDirectory, relativeFile);
  const content = await readFile(sourcePath, "utf8");
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim();
    if (/^(?:https?:\/\/|mailto:|#)/i.test(rawTarget)) continue;
    const target = rawTarget.split("#", 1)[0];
    const resolvedTarget = path.resolve(path.dirname(sourcePath), target);
    const relativeTarget = path.relative(canonicalDirectory, resolvedTarget);
    if (relativeTarget === ".." || relativeTarget.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTarget)) {
      errors.push(`${path.relative(root, sourcePath)}: relative link escapes the standalone skill root: ${rawTarget}`);
    } else if (!(await exists(resolvedTarget))) {
      errors.push(`${path.relative(root, sourcePath)}: relative link target is missing: ${rawTarget}`);
    }
  }
}

if (JSON.stringify(canonicalFiles) !== JSON.stringify(pluginCanonicalFiles)) {
  errors.push("Plugin canonical skill file list differs from the authored umbrella skill; run npm run sync.");
} else {
  for (const relativeFile of canonicalFiles) {
    const authored = await readFile(path.join(canonicalDirectory, relativeFile));
    const generated = await readFile(path.join(pluginCanonicalDirectory, relativeFile));
    if (!authored.equals(generated)) errors.push(`Plugin canonical copy differs: ${relativeFile}`);
  }
}

try {
  const result = JSON.parse(execFileSync(process.execPath, [path.join(root, "skills", "agrimap-agent-skills", "scripts", "verify-golden.mjs")], { cwd: root, encoding: "utf8" }));
  assert.equal(result.ok, true);
} catch (error) {
  errors.push(`Golden verification failed: ${error.message}`);
}

if (errors.length) {
  process.stdout.write(`${JSON.stringify({ ok: false, errors }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ ok: true, aliases: operations.operations.length, checks: "manifests, adapters, skill, passive disciplines, dev-state isolation, delegation ownership, usage examples, golden sources" }, null, 2)}\n`);
}
