# Workflows

Use this router after intake and impact analysis. Combine a workflow with the relevant technical role; do not treat command names as permission gates. Whenever a target is `fe-main` or `fe-library`, automatically compose the [Front-end Engineer discipline](frontend-engineer.md) with that workflow.

## `/agm-analyze`

Use [analysis-discipline.md](analysis-discipline.md). Produce labeled evidence, hidden problems, dependencies, impact surface, unknowns, solution options, trade-offs, recommendation, and an execution-ready checklist. For delegation candidates, identify shared files/contracts that prevent parallel writes. Do not edit unless the owner also requests implementation.

## `/agm-diagnose`

Trace symptoms to root cause using [analysis-discipline.md](analysis-discipline.md). Build a hypothesis table with evidence for/against, run bounded diagnostics, identify the proven cause, and propose the smallest complete fix. Do not implement unless requested.

## `/agm-simulate`

Model explicit scenarios, inputs, state transitions, affected components, failure modes, observables, and rollback. Label assumptions and confidence. Simulation informs a decision; it is not a mandatory gate for routine work.

## `/agm-plan`

Reverse-engineer from the required end state. Include dependencies, files, symbols, current line positions, ordered steps, verification, decision points, truly independent tasks, file/logical-contract ownership, workspace mode, integration artifacts, memory checkpoints, and done criteria.

## `/agm-design`

Define user flow, state, interface behavior, component boundaries, data requirements, accessibility expectations, and acceptance criteria. Separate visual preference from product behavior.

## `/agm-architect`

Map boundaries, ownership, contracts, data flow, deployment/runtime effects, alternatives, migration path, and reversible decisions. Require owner trade-off before changing established logical boundaries.

## `/agm-review`

Review correctness first, then behavior regressions, contracts/data, maintainability, performance when relevant, and tests. Report findings by severity with file, line, evidence, impact, and actionable fix. Do not refactor during a review-only request.

## `/agm-fe-engineer`

Use this alias to enter or inspect the Front-end Engineer discipline directly; it is not a separate delivery pipeline. Require `phase=foundation`, `active-development`, or `stabilization`. Search the frontend reuse index and repository before creating functions, components, services, directives, pipes, tokens, or config. Prefer exact reuse, safe extension, or composition before new code. Update the reuse index and run the phase quality gate after every FE task. Read [frontend-engineer.md](frontend-engineer.md).

## `/agm-refactor-fe`, `/agm-refactor-be`, `/agm-refactor-sql`

Require a selected mode from [refactor-modes.md](refactor-modes.md). Establish a behavioral baseline, inspect consumers, constrain scope, implement, and prove the selected preservation/change contract.

## `/agm-qa`

Run in an independent read-only QA subagent/context. Translate requirements and checklist items into evidence, reopen the changed artifacts, and rerun selected claims from the executor Result Package. Test the changed path, relevant regression surface, failure paths, and build/static health. Return `passed`, `failed`, `blocked`, or justified `not-applicable` with reproducible evidence; never fix findings or return a conditional pass.

## `/agm-create-unit-test`

Classify `target_kind` as FE main/library, BE main/library, or SQL contract. When `target_kind=be-main`, also require `backend_profile=agmws|agmbo`. Inspect the existing test framework and local naming/mocking pattern. Cover behavior and regression risk, not implementation trivia. Ask before adding tests only when the owner has not already selected testing for a logic-impacting task.

## `/agm-create-feature`

Require `target_kind`:

- `fe-main`
- `fe-library`
- `be-main`
- `be-library`
- `sql-table`
- `sql-procedure`
- `sql-table-and-procedure`

When `target_kind=be-main`, require `backend_profile` as exactly one of:

- `agmws`: web service/application host.
- `agmbo`: batch host using the same backend-main structure; inspect `Infrastructure/TaskScheduler.cs` when scheduling applies.

Do not use `agmws` or `agmbo` as `target_kind`, and do not invent a fallback profile.

Derive only the files required for that target. Do not assume the old controller-to-repository chain covers every target.

## `/agm-create-prompt`

Create provider-specific, execution-ready frontier, executor, and independent QA prompts using [create-prompt.md](create-prompt.md). Treat the approved prompt as the task execution SoT. Include model assignment, skills to load, verified workspace mode, non-overlapping file ownership, branch name only when supported, file/line targets, steps, tests, deviation handling, integration artifact, and the handoff contract.
