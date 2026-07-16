# Subagents and branches

## สารบัญ

- [Decompose](#decompose)
- [Workspace modes](#workspace-modes)
- [Branch and worktree](#branch-and-worktree)
- [Overlap check before dispatch](#overlap-check-before-dispatch)
- [Delegation packet](#delegation-packet)
- [Progress heartbeat](#progress-heartbeat--ให้-owner-ดูได้ว่า-subagent-ยังทำงานอยู่และเป็นใคร)
- [Required handoff](#required-handoff)

## Decompose

- Use at most five active subagents.
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
- the progress heartbeat file path (`.agrimap-agent/runtime/progress/<task-id>.jsonl`) and the instruction to announce identity first, then one line per step;
- ordered implementation steps and reason for each;
- logic/contract/data constraints;
- tests and acceptance criteria;
- files the agent must not modify;
- handoff format.

For a QA packet, replace product write ownership with `product_artifacts: read-only` and `workflow_writes: qa.md|heartbeat|checkpoint-log`, name the integrated artifact/commit/file set to inspect, list claimed checks to sample independently, and require findings only. Do not include an implementation step.

## Progress heartbeat — ให้ owner ดูได้ว่า subagent ยังทำงานอยู่และเป็นใคร

The host UI shows only "Waiting for subagent…" while a subagent runs — the owner cannot see whether it is alive or which model it is. The observable channel that works on every provider is a file the owner can open/tail while waiting:

`.agrimap-agent/runtime/progress/<task-id>.jsonl` — append-only, one JSON line per signal:

1. **First action of every subagent (before any other work):** append a `started` line announcing self-reported identity — this answers "ใช้ model ไหน" immediately:
   ```json
   {"t":"2026-07-16T05:40:12Z","agent":"fe","event":"started","model":"claude-sonnet-5","provider":"claude","role":"executor","step":"0/6","doing":"loading handoff + target files"}
   ```
2. **Per ordered step:** append one line when the step begins (`"event":"step"`, `"step":"3/6"`, `"doing":"<one short phrase>"`). One line per step — not per tool call; this is a heartbeat, not a transcript.
3. **On exit:** append `"event":"finished|blocked"` with the final status before returning the handoff.

The Leader includes this file path in the delegation packet and tells the owner where it is when dispatching ("progress: `.agrimap-agent/runtime/progress/<task-id>.jsonl`"). A subagent silent in this file for its whole run is a handoff-contract violation the Leader reports. The directory lives under ignored runtime state — never tracked, never audit evidence; durable attribution stays in `logs/`.

Provider notes: on Claude Code the owner can also expand the running task in the UI/transcript view for the raw stream, and the `SubagentStart` hook already fires; the heartbeat file is still required because it is the only channel that is provider-independent and readable outside the UI.

## Required handoff

Every executing subagent returns:

- `status`: `completed`, `partial`, or `blocked`;
- `requestedBy` inherited from the Leader handoff;
- configurable `model_label` plus actual `model`, `role`, `agent`, and `provider` recorded separately;
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
