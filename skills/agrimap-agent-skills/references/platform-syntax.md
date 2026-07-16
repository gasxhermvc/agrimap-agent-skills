# Provider syntax

The umbrella skill is `agrimap-agent-skills`. Provider aliases route to it and pass `operation` plus raw requester arguments; authority fields remain distinct.

## Provider detection (do this first)

You already know which provider you are: your own model identity and harness determine it — a GPT/Codex model in Codex CLI is **Codex**; a Claude model in Claude Code is **Claude Code**; a Gemini model in Gemini CLI is **Gemini CLI**. Do not ask the user which provider they are on, and do not guess from the command text they typed (users copy syntax across providers — that is exactly the failure to prevent).

All help output, alias lists, and examples must use **only the active provider's section below**. Showing another provider's invocation form as if it were runnable here is a defect: a Codex user given `/agrimap-agent-skills:agm-review` will get a hard failure because Codex has no plugin slash commands — the only runnable form on Codex is the `$agm-*` skill mention.

Successful routing must produce an activation receipt containing `AgriMap skill active`, the selected operation, requester, normalized input coverage, and the pre-work checklist before substantive work. The receipt confirms the umbrella was loaded; it must not ask for routine permission already covered by the request.

## Codex

- Canonical: `$agrimap-agent-skills`
- Thin aliases: `$agm-analyze`, `$agm-plan`, `$agm-review`, and the other generated `$agm-*` skills.
- Codex uses skill mentions rather than portable slash commands. There is no plugin-prefixed form: `/agrimap-agent-skills:agm-review` and `$agrimap-agent-skills:agm-review` are both invalid — type the alias skill directly (`$agm-review ...`).
- Managed worktrees are surface-dependent. Do not treat a spawned local subagent as worktree-isolated unless the current environment proves it.
- Example: `$agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"`
- Help: `$agm-analyze -h`

## Claude Code

- Installed plugin canonical: `/agrimap-agent-skills:agrimap-agent-skills`
- Thin aliases: `/agrimap-agent-skills:agm-analyze`, `/agrimap-agent-skills:agm-plan`, and related commands.
- A standalone copy containing only the umbrella skill uses `/agrimap-agent-skills operation=<operation>`. It exposes `/agm-*` only when the corresponding alias skill directories are installed too.
- When supported, start a session with `claude --worktree <name>` or set a custom subagent's `isolation: worktree`. Without isolation, a normal subagent starts in the main session's current working directory.
- Example: `/agrimap-agent-skills:agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"`
- Help: `/agrimap-agent-skills:agm-analyze -h`; umbrella-only standalone: `/agrimap-agent-skills operation=analyze -h`.

## Gemini CLI

- Skill activation: `agrimap-agent-skills`
- Thin custom commands: `/agm-analyze`, `/agm-plan`, `/agm-review`, and related `/agm-*` commands.
- Gemini may request native skill activation consent; do not add another approval layer.
- Example: `/agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"`
- Help: `/agm-analyze -h`

## Alias contract

Each alias must contain only:

1. the requested operation;
2. the raw arguments;
3. an instruction to activate/read the umbrella skill;
4. no copied workflow rules.

An alias receiving `-h` or `--help` routes to the umbrella help contract without starting a task or writing project state.

For large text, images, attachments, multiple files, and line-specific references, use [input-and-scope.md](input-and-scope.md). Attachments use the host's native attachment control; the request itself must provide a stable label, intent, priority, and expected coverage rather than depend on an invented cross-provider attachment token.
