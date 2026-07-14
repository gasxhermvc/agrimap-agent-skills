# Provider syntax

The umbrella skill is `agrimap-agent-skills`. Provider aliases route to it and pass `operation` plus raw owner arguments.

## Codex

- Canonical: `$agrimap-agent-skills`
- Thin aliases: `$agm-analyze`, `$agm-plan`, `$agm-review`, and the other generated `$agm-*` skills.
- Codex uses skill mentions rather than portable slash commands.
- Managed worktrees are surface-dependent. Do not treat a spawned local subagent as worktree-isolated unless the current environment proves it.

## Claude Code

- Installed plugin canonical: `/agrimap-agent-skills:agrimap-agent-skills`
- Thin aliases: `/agrimap-agent-skills:agm-analyze`, `/agrimap-agent-skills:agm-plan`, and related commands.
- Standalone project copies may expose `/agm-*` without the plugin namespace.
- When supported, start a session with `claude --worktree <name>` or set a custom subagent's `isolation: worktree`. Without isolation, a normal subagent starts in the main session's current working directory.

## Gemini CLI

- Skill activation: `agrimap-agent-skills`
- Thin custom commands: `/agm-analyze`, `/agm-plan`, `/agm-review`, and related `/agm-*` commands.
- Gemini may request native skill activation consent; do not add another approval layer.

## Alias contract

Each alias must contain only:

1. the requested operation;
2. the raw arguments;
3. an instruction to activate/read the umbrella skill;
4. no copied workflow rules.
