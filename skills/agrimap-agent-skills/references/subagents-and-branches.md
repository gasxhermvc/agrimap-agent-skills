# Subagents and branches

## สารบัญ

- [Decompose](#decompose)
- [Workspace modes](#workspace-modes)
- [Branch and worktree](#branch-and-worktree)
- [Overlap check before dispatch](#overlap-check-before-dispatch)
- [Delegation packet](#delegation-packet)
- [Visible progress](#visible-progress--native-first-no-silent-wait)
- [Required handoff](#required-handoff)

## Decompose

- Use at most five active subagents.
- Current Codex releases enable subagent workflows by default; never route Codex to a sequential fallback merely because an older contract claimed native subagents were unavailable.
- Delegate only independent, bounded work with a clear integration boundary.
- Keep unresolved material decisions with the Leader until the recorded decision owner approves them.
- Before dispatch, map every target and forbidden file to exactly one writer for the integration wave.
- One file and one logical contract have one writer model per wave. Read-only analysis and QA may overlap; writes may not.
- If two tasks need the same file, shared registry, route table, DI setup, public export, schema object, generated artifact, or contract, combine them under one writer or run them sequentially.
- The Leader owns integration files by default and prevents instructions whose scopes overlap indirectly.
- QA is a verification-only subagent/context with no product-artifact write set. It may inspect every integrated artifact and may write only its `qa.md`, heartbeat, and checkpoint/log evidence; it cannot own or modify source, tests, product docs, generated output, implementation prompts, checklists, scope, or acceptance criteria.

## Workspace modes

Do not assume that a provider's subagent, sandbox, branch, or commit is visible to another agent.

| Mode | Dispatch rule | Required return |
| --- | --- | --- |
| `shared-workspace` | Assign disjoint write sets; branches are optional. | Changed files, tests, and handoff. |
| `isolated-worktree` | Use only after verifying the worktree and Git refs are visible to the Leader. | Branch plus commit SHA or patch, tests, and handoff. |
| `isolated-sandbox` | Do not rely on a branch name for integration. | Portable patch/diff or complete changed artifacts, tests, and handoff. |
| `unknown` | Do not parallelize writers. Execute sequentially until visibility is proven. | Normal handoff after each step. |

The Leader defines `workspace_need`, verifies and records `workspace_mode`, integrates every artifact, resolves conflicts, dispatches independent verification-only QA, and synthesizes the final evidence. Neither the requester nor decision owner is responsible for discovering or merging scattered agent work.

## Branch and worktree

The Leader assigns branch names using:

`agm/<task-id>/<role>-<short-scope>`

Branches are optional isolation aids, not the delegation contract. Prefer an isolated worktree only when the provider supports it and the Leader has verified integration visibility. Do not create branches for read-only analysis. If the repository is dirty, preserve owner changes and establish the integration boundary before branch/worktree creation. An isolated worker starts from the recorded base commit; uncommitted parent changes are unavailable unless the provider explicitly proves otherwise.

Never tell multiple agents to create independent commits against the same file set and expect Git to resolve the design. If a branch/worktree is not visible, require a portable patch or changed artifact in the handoff.

Provider capability is not the workspace mode. For example, Claude Code can isolate a custom subagent with `isolation: worktree`, but a normal subagent starts in the current working directory. Codex managed worktrees are surface-dependent and do not prove that every local subagent is isolated. Verify the current run rather than infer from the provider name.

## Overlap check before dispatch

The Leader must reject or reshape a delegation wave when any two tasks overlap on:

- the same target file or generated output;
- the same public symbol, API route, DTO/schema, database object, or behavior contract;
- a writer's target and another writer's formatter/generator output;
- a shared registration/index/export/migration file;
- caller and callee changes that cannot be verified independently.

Record the final map as `file_ownership`, including the Leader-owned integration set. A later wave may reassign a file only after the earlier handoff has been integrated and checked.

## Delegation packet

Include:

- task ID, `requestedBy`, requester authority, decision owner, authority evidence, model profile, configurable model label, executing actual `model`, `role`, `agent`, `provider`, objective, and non-goals;
- required skill/reference files;
- complete `workspace_need`, verified `workspace_mode`, integration owner, and branch/worktree name when applicable;
- exact `file_ownership` plus other writers' forbidden files;
- exact target files, current line numbers, and stable symbols;
- the primary native progress channel; include `.agrimap-agent/runtime/progress/<task-id>.jsonl` and per-step write instructions only when native activity is genuinely unavailable;
- a descriptive native display label/nickname, the user-facing one-line task description, expected output, and inspection instructions for the active surface;
- status cadence: the Leader reports `running|completed|blocked` at dispatch, on a meaningful transition, and at least every 60 seconds while it is otherwise waiting;
- ordered implementation steps and reason for each;
- logic/contract/data constraints;
- tests and acceptance criteria;
- files the agent must not modify;
- handoff format.

For a QA packet, replace product write ownership with `product_artifacts: read-only` and `workflow_writes: qa.md|heartbeat|checkpoint-log`, name the integrated artifact/commit/file set to inspect, list claimed checks to sample independently, and require findings only. Do not include an implementation step.

## Visible progress — native first, no silent wait

Current Codex releases enable subagent workflows by default and surface activity in all local clients. Use the native channel first:

- **Codex app:** each delegated agent has an inspectable thread; open it from activity in the main task.
- **Codex CLI:** run `/agent` to inspect and switch between active agent threads.
- **Codex IDE extension:** expand the background-agent panel above the composer when available, then open an individual thread or stop active agents.

Before calling spawn, the Leader posts a dispatch receipt such as:

```text
Delegating 2 independent tasks:
- api-contract-review — inspect route/DTO regressions — returns findings with file references
- test-gap-scan — inspect missing failure-path coverage — returns proposed tests only
Inspect: app agent threads | CLI /agent | IDE background-agent panel
```

Use a descriptive task name and, where custom agents are configured, `nickname_candidates` so the UI does not show indistinguishable repeated agent names. While agents run, the Leader continues safe independent work. If it has nothing useful to do, it waits/polls for no more than 60 seconds at a time, inspects live agent state, and posts one concise update with each agent's `running|completed|blocked` status and last known bounded task. A blind 5–7 minute wait or repeated status with no agent/task detail is a workflow defect.

The native thread is the primary detailed trace; do not duplicate every tool call into chat. When a provider/surface genuinely cannot expose native activity, explicitly declare the fallback and use `.agrimap-agent/runtime/progress/<task-id>.jsonl` as append-only workflow runtime state:

```json
{"t":"2026-07-16T05:40:12Z","agent":"fe","event":"step","step":"3/6","doing":"checking affected consumers"}
```

For that fallback only, write `started`, one `step` line per ordered step, and `finished|blocked`. The Leader tells the requester how to tail/open the file. It remains ignored runtime state, never durable audit evidence. Codex native threads do not require this fallback file.

Official Codex behavior reference: [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents).

## Required handoff

Every executing subagent returns:

- `status`: `completed`, `partial`, or `blocked`;
- `requestedBy` inherited from the Leader handoff;
- configurable `model_label` plus actual `model`, `role`, `agent`, and `provider` recorded separately;
- native display label/thread identifier and progress channel used;
- `summary`;
- `files_changed` with symbols/lines;
- `behavior_changed`;
- `decisions_and_reasons`;
- `commands_and_tests` with results;
- `remaining_risks`;
- `memory_facts`;
- `integration_artifact`: visible commit SHA, portable patch, or shared-workspace file set;
- `commit_or_branch` when applicable.

The Leader verifies that the artifact is integrated, then sends it to an independent QA model resolved on the active host. A subagent saying “done” or returning a Result Package is not completion evidence.
