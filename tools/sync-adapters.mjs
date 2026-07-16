#!/usr/bin/env node

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadTaskArtifactSchema,
  renderTaskArtifactSchemaDocs,
  replaceTaskArtifactSchemaDocs,
  taskArtifactSchemaIssues,
} from "../skills/agrimap-agent-skills/scripts/task-artifact-schema.mjs";

const root = process.cwd();
const canonicalSkill = path.join(root, "skills", "agrimap-agent-skills");
const pluginRoot = path.join(root, "plugins", "agrimap-agent-skills");
const pluginSkills = path.join(pluginRoot, "skills");
const packageManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const packageVersion = packageManifest.version;
if (typeof packageVersion !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(packageVersion)) {
  throw new Error("package.json version must be a valid semantic version.");
}
const operations = JSON.parse(await readFile(path.join(root, "config", "operations.json"), "utf8"));
const taskArtifactSchema = await loadTaskArtifactSchema(canonicalSkill);
const schemaIssues = taskArtifactSchemaIssues(taskArtifactSchema);
if (schemaIssues.length) throw new Error(`Invalid task artifact schema:\n- ${schemaIssues.join("\n- ")}`);
const generatedTaskArtifactDocs = renderTaskArtifactSchemaDocs(taskArtifactSchema);
for (const relativePath of ["README.md", path.join("docs", "USAGE.md")]) {
  const filePath = path.join(root, relativePath);
  const content = await readFile(filePath, "utf8");
  await writeFile(filePath, replaceTaskArtifactSchemaDocs(content, generatedTaskArtifactDocs), "utf8");
}

await rm(pluginSkills, { recursive: true, force: true });
await mkdir(pluginSkills, { recursive: true });
await cp(canonicalSkill, path.join(pluginSkills, "agrimap-agent-skills"), { recursive: true });
for (const directory of ["docs", "examples"]) {
  await rm(path.join(pluginRoot, directory), { recursive: true, force: true });
  await cp(path.join(root, directory), path.join(pluginRoot, directory), { recursive: true });
}

for (const item of operations.operations) {
  const aliasDirectory = path.join(pluginSkills, item.name);
  await mkdir(aliasDirectory, { recursive: true });
  await writeFile(
    path.join(aliasDirectory, "SKILL.md"),
    `---\nname: ${item.name}\ndescription: ${item.description}. Use when the requester invokes this AgriMap alias.\n---\n\nActivate the umbrella skill: read \`../agrimap-agent-skills/SKILL.md\` **relative to this file** (the umbrella directory sits next to this alias directory inside the same installed plugin — do not search elsewhere for it). Run operation \`${item.operation}\` with the requester's current arguments. Follow the umbrella's routing and read-economy rules: load only the reference/pattern files its routing section selects for this operation and scope, never the whole reference tree. Keep the umbrella workflow authoritative; do not add or duplicate rules in this alias. When the arguments contain a standalone \`-h\` or \`--help\` token, use the umbrella command-help contract (provider-native syntax only) and return help without starting a task or writing project state.\n`,
    "utf8",
  );
}

const codexManifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
const codexManifest = JSON.parse(await readFile(codexManifestPath, "utf8"));
codexManifest.version = packageVersion;
codexManifest.hooks = "./hooks/codex-hooks.json";
await writeFile(codexManifestPath, `${JSON.stringify(codexManifest, null, 2)}\n`, "utf8");

const claudeMarketplacePath = path.join(root, ".claude-plugin", "marketplace.json");
const claudeMarketplace = JSON.parse(await readFile(claudeMarketplacePath, "utf8"));
const claudeMarketplaceEntry = claudeMarketplace.plugins?.find((plugin) => plugin.name === packageManifest.name);
if (!claudeMarketplaceEntry) throw new Error(`Claude marketplace entry not found for ${packageManifest.name}.`);
claudeMarketplaceEntry.version = packageVersion;
await writeFile(claudeMarketplacePath, `${JSON.stringify(claudeMarketplace, null, 2)}\n`, "utf8");

const claudeManifestDirectory = path.join(pluginRoot, ".claude-plugin");
await mkdir(claudeManifestDirectory, { recursive: true });
await writeFile(
  path.join(claudeManifestDirectory, "plugin.json"),
  `${JSON.stringify({
    name: "agrimap-agent-skills",
    description: "Cross-agent AgriMap engineering workflows, patterns, memory, and QA",
    version: packageVersion,
    author: { name: "Billy" },
    hooks: "./hooks/claude-hooks.json",
  }, null, 2)}\n`,
  "utf8",
);

function providerHooks(provider, pluginRootToken) {
  const script = `node \"${pluginRootToken}/skills/agrimap-agent-skills/scripts/hook-context.mjs\"`;
  return {
    hooks: {
      SessionStart: [
        {
          hooks: [
            {
              type: "command",
              command: `${script} --provider ${provider} --mode session`,
              statusMessage: "Loading AgriMap task memory",
            },
          ],
        },
      ],
      UserPromptSubmit: [
        {
          hooks: [
            {
              type: "command",
              command: `${script} --provider ${provider} --mode task`,
              statusMessage: "Refreshing AgriMap task context",
            },
          ],
        },
      ],
      SubagentStart: [
        {
          hooks: [
            {
              type: "command",
              command: `${script} --provider ${provider} --mode subagent`,
              statusMessage: "Loading AgriMap handoff contract",
            },
          ],
        },
      ],
    },
  };
}

const hooksDirectory = path.join(pluginRoot, "hooks");
// This directory is shared by the Codex and Claude packages. Never generate
// hooks/hooks.json here: both hosts auto-discover that default path, which can
// cross-load the other host's provider flag. Their manifests select only the
// provider-specific files below. Gemini uses the repository-root extension
// hooks/hooks.json and is therefore outside this plugin root.
await rm(hooksDirectory, { recursive: true, force: true });
await mkdir(hooksDirectory, { recursive: true });
await writeFile(
  path.join(hooksDirectory, "codex-hooks.json"),
  `${JSON.stringify(providerHooks("codex", "${PLUGIN_ROOT}"), null, 2)}\n`,
  "utf8",
);
await writeFile(
  path.join(hooksDirectory, "claude-hooks.json"),
  `${JSON.stringify(providerHooks("claude", "${CLAUDE_PLUGIN_ROOT}"), null, 2)}\n`,
  "utf8",
);

await rm(path.join(root, "commands"), { recursive: true, force: true });
await mkdir(path.join(root, "commands"), { recursive: true });
for (const item of operations.operations) {
  const prompt = [
    `Activate the agrimap-agent-skills umbrella skill and run operation ${item.operation}.`,
    "Treat the umbrella skill as the workflow source of trust.",
    "When requester arguments contain a standalone -h or --help token, return umbrella command help without starting a task or writing project state.",
    "Requester arguments:",
    "{{args}}",
  ].join("\n\n");
  await writeFile(
    path.join(root, "commands", `${item.name}.toml`),
    `description = ${JSON.stringify(item.description)}\nprompt = ${JSON.stringify(prompt)}\n`,
    "utf8",
  );
}

const geminiHooks = {
  hooks: {
    SessionStart: [
      {
        hooks: [
          {
            type: "command",
            name: "agm-session-context",
            command: "node \"${extensionPath}${/}skills${/}agrimap-agent-skills${/}scripts${/}hook-context.mjs\" --provider gemini --mode session",
            description: "Load requester and current AgriMap memory without blocking the session",
          },
        ],
      },
    ],
    BeforeAgent: [
      {
        hooks: [
          {
            type: "command",
            name: "agm-task-context",
            command: "node \"${extensionPath}${/}skills${/}agrimap-agent-skills${/}scripts${/}hook-context.mjs\" --provider gemini --mode task",
            description: "Refresh AgriMap task context before agent planning",
          },
        ],
      },
    ],
  },
};
await mkdir(path.join(root, "hooks"), { recursive: true });
await writeFile(path.join(root, "hooks", "hooks.json"), `${JSON.stringify(geminiHooks, null, 2)}\n`, "utf8");

await writeFile(
  path.join(root, "gemini-extension.json"),
  `${JSON.stringify({
    name: "agrimap-agent-skills",
    version: packageVersion,
    description: "Cross-agent AgriMap engineering workflows, patterns, memory, and QA",
  }, null, 2)}\n`,
  "utf8",
);

process.stdout.write(
  `${JSON.stringify({ ok: true, version: packageVersion, aliases: operations.operations.length, canonicalSkill, pluginRoot }, null, 2)}\n`,
);
