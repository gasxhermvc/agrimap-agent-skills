#!/usr/bin/env node

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const canonicalSkill = path.join(root, "skills", "agrimap-agent-skills");
const pluginRoot = path.join(root, "plugins", "agrimap-agent-skills");
const pluginSkills = path.join(pluginRoot, "skills");
const operations = JSON.parse(await readFile(path.join(root, "config", "operations.json"), "utf8"));

await rm(pluginSkills, { recursive: true, force: true });
await mkdir(pluginSkills, { recursive: true });
await cp(canonicalSkill, path.join(pluginSkills, "agrimap-agent-skills"), { recursive: true });

for (const item of operations.operations) {
  const aliasDirectory = path.join(pluginSkills, item.name);
  await mkdir(aliasDirectory, { recursive: true });
  await writeFile(
    path.join(aliasDirectory, "SKILL.md"),
    `---\nname: ${item.name}\ndescription: ${item.description}. Use when the requester invokes this AgriMap alias.\n---\n\nActivate and read the sibling \`agrimap-agent-skills\` umbrella skill. Run operation \`${item.operation}\` with the requester's current arguments. Keep the umbrella workflow authoritative; do not add or duplicate rules in this alias.\n`,
    "utf8",
  );
}

const claudeManifestDirectory = path.join(pluginRoot, ".claude-plugin");
await mkdir(claudeManifestDirectory, { recursive: true });
await writeFile(
  path.join(claudeManifestDirectory, "plugin.json"),
  `${JSON.stringify({
    name: "agrimap-agent-skills",
    description: "Cross-agent AgriMap engineering workflows, patterns, memory, and QA",
    version: "0.1.0",
    author: { name: "Billy" },
  }, null, 2)}\n`,
  "utf8",
);

const pluginHooks = {
  hooks: {
    SessionStart: [
      {
        hooks: [
          {
            type: "command",
            command: "node \"${CLAUDE_PLUGIN_ROOT}/skills/agrimap-agent-skills/scripts/hook-context.mjs\" --provider auto --mode session",
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
            command: "node \"${CLAUDE_PLUGIN_ROOT}/skills/agrimap-agent-skills/scripts/hook-context.mjs\" --provider auto --mode task",
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
            command: "node \"${CLAUDE_PLUGIN_ROOT}/skills/agrimap-agent-skills/scripts/hook-context.mjs\" --provider auto --mode subagent",
            statusMessage: "Loading AgriMap handoff contract",
          },
        ],
      },
    ],
  },
};
await mkdir(path.join(pluginRoot, "hooks"), { recursive: true });
await writeFile(path.join(pluginRoot, "hooks", "hooks.json"), `${JSON.stringify(pluginHooks, null, 2)}\n`, "utf8");

await mkdir(path.join(root, "commands"), { recursive: true });
for (const item of operations.operations) {
  const prompt = [
    `Activate the agrimap-agent-skills umbrella skill and run operation ${item.operation}.`,
    "Treat the umbrella skill as the workflow source of trust.",
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
    version: "0.1.0",
    description: "Cross-agent AgriMap engineering workflows, patterns, memory, and QA",
  }, null, 2)}\n`,
  "utf8",
);

process.stdout.write(
  `${JSON.stringify({ ok: true, aliases: operations.operations.length, canonicalSkill, pluginRoot }, null, 2)}\n`,
);
