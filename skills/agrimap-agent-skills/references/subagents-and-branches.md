# Subagents and branches

## Decompose

- Use at most five active subagents.
- Delegate only independent, bounded work with a clear integration boundary.
- Keep ambiguous owner decisions with the frontier.
- Before dispatch, map every target and forbidden file to exactly one writer for the integration wave.
- One file and one logical contract have one writer model per wave. Read-only analysis and QA may overlap; writes may not.
- If two tasks need the same file, shared registry, route table, DI setup, public export, schema object, generated artifact, or contract, combine them under one writer or run them sequentially.
- The frontier owns integration files by default and prevents instructions whose scopes overlap indirectly.
- QA is a read-only subagent/context with no write set. It may inspect every integrated artifact but cannot own or modify a source, test, prompt, checklist, or acceptance file.

## Workspace modes

Do not assume that a provider's subagent, sandbox, branch, or commit is visible to another agent.

| Mode | Dispatch rule | Required return |
| --- | --- | --- |
| `shared-workspace` | Assign disjoint write sets; branches are optional. | Changed files, tests, and handoff. |
| `isolated-worktree` | Use only after verifying the worktree and Git refs are visible to the frontier. | Branch plus commit SHA or patch, tests, and handoff. |
| `isolated-sandbox` | Do not rely on a branch name for integration. | Portable patch/diff or complete changed artifacts, tests, and handoff. |
| `unknown` | Do not parallelize writers. Execute sequentially until visibility is proven. | Normal handoff after each step. |

The frontier selects and records `workspace_mode`, integrates every artifact, resolves conflicts, dispatches independent read-only QA, and synthesizes the final evidence. The owner must not be asked to discover or merge scattered agent work.

## Branch and worktree

The frontier assigns branch names using:

`agm/<task-id>/<role>-<short-scope>`

Branches are optional isolation aids, not the delegation contract. Prefer an isolated worktree only when the provider supports it and the frontier has verified integration visibility. Do not create branches for read-only analysis. If the repository is dirty, preserve owner changes and establish the integration boundary before branch/worktree creation.

Never tell multiple agents to create independent commits against the same file set and expect Git to resolve the design. If a branch/worktree is not visible, require a portable patch or changed artifact in the handoff.

Provider capability is not the workspace mode. For example, Claude Code can isolate a custom subagent with `isolation: worktree`, but a normal subagent starts in the current working directory. Codex managed worktrees are surface-dependent and do not prove that every local subagent is isolated. Verify the current run rather than infer from the provider name.

## Overlap check before dispatch

The frontier must reject or reshape a delegation wave when any two tasks overlap on:

- the same target file or generated output;
- the same public symbol, API route, DTO/schema, database object, or behavior contract;
- a writer's target and another writer's formatter/generator output;
- a shared registration/index/export/migration file;
- caller and callee changes that cannot be verified independently.

Record the final map as `file_ownership`, including the frontier-owned integration set. A later wave may reassign a file only after the earlier handoff has been integrated and checked.

## Delegation packet

Include:

- task ID, `requestedBy`, executing `actor`, objective, non-goals, and model profile;
- required skill/reference files;
- verified `workspace_mode`, integration owner, and branch/worktree name when applicable;
- exact `file_ownership` plus other writers' forbidden files;
- exact target files, current line numbers, and stable symbols;
- ordered implementation steps and reason for each;
- logic/contract/data constraints;
- tests and acceptance criteria;
- files the agent must not modify;
- handoff format.

For a QA packet, replace write ownership with `read_only: true`, name the integrated artifact/commit/file set to inspect, list claimed checks to sample independently, and require findings only. Do not include an implementation step.

## Required handoff

Every executing subagent returns:

- `status`: `completed`, `partial`, or `blocked`;
- `requestedBy` inherited from the frontier handoff;
- `actor` identifying the executing model/agent;
- `summary`;
- `files_changed` with symbols/lines;
- `behavior_changed`;
- `decisions_and_reasons`;
- `commands_and_tests` with results;
- `remaining_risks`;
- `memory_facts`;
- `integration_artifact`: visible commit SHA, portable patch, or shared-workspace file set;
- `commit_or_branch` when applicable.

The frontier verifies that the artifact is integrated, then sends it to an independent QA actor. A subagent saying “done” or returning a Result Package is not completion evidence.
