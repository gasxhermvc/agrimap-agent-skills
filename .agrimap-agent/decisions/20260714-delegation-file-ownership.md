# Delegation file ownership decision

- Requested by: Billy
- Decision: One file and one logical contract have one writer model per integration wave.
- Overlap handling: Combine overlapping work under one executor/Frontier or run it sequentially. QA agents inspect and report; they do not concurrently patch another writer's files.
- Workspace modes: `shared-workspace`, `isolated-worktree`, `isolated-sandbox`, or `unknown`.
- Branch rule: A branch is optional and usable only after Frontier verifies that its worktree/ref is visible for integration.
- Integration: Frontier owns shared registration/export/route/DI/schema files by default, receives a visible commit/patch/artifact, integrates, resolves conflicts, dispatches independent read-only QA, and synthesizes the evidence. Frontier does not perform detailed QA or fix findings inside the task under verification.
- Human boundary: The owner must not be left to discover or merge scattered agent work.
- Reason: Prevent concurrent file conflicts and false assumptions about sandbox or branch visibility across providers.
- Provider finding: Claude Code supports explicit worktree isolation; Codex managed worktrees are surface-dependent. Provider name alone never proves the current subagent workspace mode.
