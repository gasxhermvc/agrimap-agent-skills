# Provider syntax

The `agrimap-agent-skills` skill is a routing-only selector. It chooses exactly one dedicated `agm-*` skill and stops. Generated operation skills pass their raw requester arguments through the compact runtime core plus one operation entrypoint; authority fields remain distinct. They never load the router during execution.

## Provider detection (do this first)

You already know which provider you are: your own model identity and harness determine it — a GPT/Codex model in Codex CLI is **Codex**; a Claude model in Claude Code is **Claude Code**; a Gemini model in Gemini CLI is **Gemini CLI**. Do not ask the user which provider they are on, and do not guess from the command text they typed (users copy syntax across providers — that is exactly the failure to prevent).

All help output, alias lists, and examples must use **only the active provider's section below**. Showing another provider's invocation form as if it were runnable here is a defect: a Codex user given `/agrimap-agent-skills:agm-review` will get a hard failure because Codex has no plugin slash commands — the only runnable form on Codex is the `$agm-*` skill mention.

A successful router invocation returns `AgriMap router active`, the selected dedicated skill, match reason, and provider-specific invocation, then stops. The selected operation skill—not the router—must later produce the `AgriMap skill active` activation receipt before substantive work.

## Codex

- Router only: `$agrimap-agent-skills`
- Thin aliases: `$agm-analyze`, `$agm-plan`, `$agm-review`, and the other generated `$agm-*` skills.
- Codex uses skill mentions rather than portable slash commands. There is no plugin-prefixed form: `/agrimap-agent-skills:agm-review` and `$agrimap-agent-skills:agm-review` are both invalid — type the alias skill directly (`$agm-review ...`).
- Managed worktrees are surface-dependent. Do not treat a spawned local subagent as worktree-isolated unless the current environment proves it.
- Current Codex releases enable subagent workflows by default. Inspect app agent threads directly, use `/agent` in CLI, or expand the IDE background-agent panel; the Leader must announce labels/tasks before spawn and may not wait silently for more than 60 seconds.
- Example: `$agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"`
- Help: `$agm-analyze -h`

## Claude Code

- Router only: `/agrimap-agent-skills:agrimap-agent-skills`
- Thin aliases: `/agrimap-agent-skills:agm-analyze`, `/agrimap-agent-skills:agm-plan`, and related commands.
- A standalone copy containing only the router can recommend an operation but cannot execute one. Install the corresponding alias skill directories before using `/agm-*`.
- When supported, start a session with `claude --worktree <name>` or set a custom subagent's `isolation: worktree`. Without isolation, a normal subagent starts in the main session's current working directory.
- Example: `/agrimap-agent-skills:agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"`
- Help: `/agrimap-agent-skills:agm-analyze -h`; router catalog: `/agrimap-agent-skills:agrimap-agent-skills -h`.

## Gemini CLI

- Skill activation: `agrimap-agent-skills`
- Thin custom commands: `/agm-analyze`, `/agm-plan`, `/agm-review`, and related `/agm-*` commands.
- Gemini may request native skill activation consent; do not add another approval layer.
- Example: `/agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"`
- Help: `/agm-analyze -h`

## Alias contract

Each generated alias must contain only:

1. the requested operation;
2. the raw arguments;
3. exact relative paths to `lifecycle-core.md` and its generated `operations/<operation>.md` entrypoint;
4. an explicit instruction not to read the router during execution;
5. no copied workflow rules.

An alias receiving `-h` or `--help` returns purpose, required/conditional inputs, and the minimal example from its compact operation entrypoint without starting a task or writing project state. A missing/corrupt compact file is `PACKAGE_ENTRYPOINT_MISSING` and requires package sync/reinstallation; the routing skill is never an execution fallback.

For large text, images, attachments, multiple files, and line-specific references, use [input-and-scope.md](input-and-scope.md). Attachments use the host's native attachment control; the request itself must provide a stable label, intent, priority, and expected coverage rather than depend on an invented cross-provider attachment token.
