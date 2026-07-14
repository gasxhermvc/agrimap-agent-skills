# Task brief

- Task ID: `20260714-pattern-conflict-reconciliation`
- Requested by: Billy
- Actor: frontier
- Operation: `agm-architect`, `agm-review`, `agm-create-prompt`
- Objective: Reconcile conflicting golden coding patterns without mutating evidence, bind GitHub metadata, and prevent overlapping delegated writes/sandbox integration loss.
- Scope: FE/BE/SQL conflict classification, delegation file ownership/workspace modes, provider prompt contract, GitHub URLs, memory/logs, validation, and QA.
- Non-goals: Change raw golden files, invent missing company patterns, publish/push, or apply a license before golden-example rights are confirmed.
- Target kind: `mixed`
- Logic impact: `none`
- Workspace mode: `shared-workspace`
- Integration owner: frontier
- Branch/worktree: `feat/agrimap-agent-skills-v1` (existing uncommitted boundary continued by owner)

## File and logical-contract ownership

- Frontier is the only writer for this task.
- No subagents were dispatched.
- Raw `references/patterns/golden/**` content is forbidden; its manifest annotation may change without changing evidence hashes.

## Decisions and trade-offs

- Correct objective defects in annotation; defer project/business semantics to project evidence or owner discussion.
- Use one writer per file/logical contract per integration wave.
- Recommend MIT, but hold the license until golden-example publication rights are confirmed.

## Concerns

- Billy's pattern tour is required to promote unverified project conventions.
- Native provider sandbox/worktree behavior varies; the skill records an explicit workspace mode instead of assuming shared Git visibility.
