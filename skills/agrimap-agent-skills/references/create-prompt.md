# Create-prompt workflow

Generate prompts that a lightweight executor can run without reconstructing the Leader model's reasoning. The approved prompt is the execution source of truth for one task: use plain, direct language while keeping every material contract explicit. Create separate prompts for Leader, executor, and independent read-only QA when implementation is delegated.

## Staged elicitation contract

Run the stages in order. Skip B–D only when the owner explicitly requests `express`; the default is the full sequence.

- **Stage A — intake and sweep.** Collect the objective and inputs, then sweep the current conversation and `.agrimap-agent/` state (memory, decisions, knowledge, prior prompts, owner reference library) without asking the owner to repeat anything already said. Summarize the evidence ledger, including what remains `UNKNOWN`. Do not write any prompt yet.
- **Stage B — approach with mandatory counter-arguments.** Present the viable approaches with trade-offs, and argue against the leading option at least once with evidence. Agreement without challenge is a stage failure.
- **Stage C — thesis refinement.** Reduce the discussion to a thesis: problem → reasoning → chosen approach → measurable success criteria. Iterate with the owner until the thesis is stable. The thesis is carried into the generated prompt so it stays repeatable and auditable.
- **Stage D — understanding checklist gate.** Return the full understanding as a checklist for owner confirmation. Do not proceed to Stage E until the owner approves it; if the owner corrects an item, update and re-present only the changed items.
- **Stage E — generation.** Produce the Leader/executor/QA prompt files below with `prompt_status: draft`. The owner reviews and flips approval to `owner-approved`. Generation is the end of this operation: **never begin executing a generated prompt.** Running it is a separate owner action through `agm-exec`.

Owner gates in this contract are real stops. A completed stage output is never permission to advance past a gate without the owner's reply.

## Prompt file naming and lifecycle

Write prompt files as `.agrimap-agent/prompts/<task-id>/<role>.prompt.md`, for example `leader.prompt.md`, `executor.prompt.md`, `executor-fe.prompt.md`, and `qa.prompt.md`. The `.prompt.md` suffix is required so editor tooling recognizes the files; do not rename them to encode status — `prompt_status` in the manifest is the single status source.

When the task closes, `agm-workspace.mjs complete|close` moves the whole task prompt folder to `.agrimap-agent/prompts/complete/<task-id>/` automatically. Never move or rename prompt files by hand, and never execute a prompt found under `complete/`.

## Required input variables

Use these names in the generated prompt manifest:

- `requested_by`: human requester copied into task logs and handoffs
- `prompt_id`
- `prompt_role`: `leader`, `executor`, or `qa`
- `prompt_status`: `draft`, `owner-approved`, `superseded`, or `executed`
- `task_id`
- `provider`: `codex` or `claude`
- `operation`
- `objective`
- `non_goals`
- `target_kind`: one value, or a list for cross-target work, from `fe-main`, `fe-library`, `be-main`, `be-library`, `sql-table`, `sql-procedure`, or `sql-table-and-procedure`
- `backend_profile`: required for every `be-main` target; exactly `agmws` or `agmbo`; omit for other targets
- `refactor_mode` when applicable
- `logic_impact`: `none`, `preserve`, or `change-approved`
- `model_profile`
- `model_name`
- `role`: `leader`, `executor`, `qa`, `reviewer`, or `analyst`
- `agent_name`: stable functional label such as `primary`, `fe`, `be`, `sql`, `designer`, or `qa`
- `workspace_mode`: `shared-workspace`, `isolated-worktree`, `isolated-sandbox`, or `unknown`
- `workspace_need`: required contract containing `isolation`, `requested_mode`, `base_ref`, `base_commit`, `provider_instruction`, `visibility_check`, `integration_return`, and `fallback_mode`
- `integration_owner`
- `branch_name`
- `file_ownership`
- `required_skills`
- `service_ownership_refs`: relevant `service_id` values from `.agrimap-agent/knowledge/service-ownership.yaml`; omit when not applicable
- `inputs`
- `evidence_ledger`: material `FACT`, `INFERENCE`, `HYPOTHESIS`, and `UNKNOWN` items
- `owner_decisions`
- `target_files`
- `forbidden_files`
- `steps`
- `tests`
- `acceptance_criteria`
- `deviation_policy`
- `handoff_contract`

Allow the owner to override `model_name` in the generated prompt file. Preserve the capability profile so the Leader can detect an unsuitable override and discuss it rather than silently changing it. Keep `model_name`, `role`, `agent_name`, and `provider` separate; do not create composite names such as `frontier-codex` or `gpt-5.4-fe` as the only identity record.

## Build the prompt

1. Read the complete owner request and current memory.
2. Inspect relevant code, callers, consumers, contracts, tests, and patterns.
3. Label material evidence using [analysis-discipline.md](analysis-discipline.md) and resolve all material trade-offs with the requester/owner before producing an execution prompt.
4. Reject `agmws` or `agmbo` as `target_kind`. Require one as `backend_profile` for every `be-main` target.
5. Select a model profile from `model-capability-matrix.yaml`.
6. Split work only when tasks are independent; use at most five active subagents.
7. Define `workspace_need` before delegation. State whether isolation is required/preferred/not-needed, the requested mode, base ref and exact base commit containing the required state, provider-specific instruction, visibility check, integration return, and safe fallback.
8. Verify the real workspace mode. Do not assume sandbox commits, branches, worktrees, or uncommitted parent changes are visible to the Leader.
9. Build a file/logical-contract ownership map. One writer model owns a file or contract per integration wave; combine or sequence overlapping tasks.
10. Assign branch/worktree names only when the selected workspace mode supports them. If required state is uncommitted and absent from the base commit, use shared/sequential work or obtain an explicit owner commit boundary; never pretend an isolated worker can see it.
11. Write a Leader/executor prompt per task to `.agrimap-agent/prompts/<task-id>/` using the `<role>.prompt.md` naming above. For implementation work, also write a separate read-only QA prompt whose model/agent identity is independent from the writer.
12. Add the exact skill/reference files the executor must load.
13. For cross-service or ownership-sensitive work, point to exact `service_id` entries in `.agrimap-agent/knowledge/service-ownership.yaml`; never paste a second ownership map into the prompt.
14. Validate that each prompt contains the fields below.

## Delegation overlap contract

Before rendering prompts, compare each executor's target files, generators, shared registries, exports, routes, DI files, schemas, callers, and contracts. A file may appear in only one writer's `file_ownership` for the wave. Put every other writer's set in `forbidden_files`.

QA/review prompts may inspect all files but must be read-only and return findings rather than edit any file. A failed finding closes the current implementation attempt as `qa-failed`; the Leader prepares a new correction prompt for owner discussion instead of routing an edit inside the task under verification. When overlap cannot be removed, use one executor for that scope or execute the prompts sequentially.

The Leader must name the integration artifact expected for the chosen workspace mode: shared-workspace file set, visible commit SHA, or portable patch/changed artifacts. Integration, QA dispatch, and evidence synthesis remain Leader responsibilities, never owner cleanup; detailed final verification belongs to the independent QA model.

## Workspace-need contract

Treat workspace isolation as task scope, not a suggestion. Render all fields explicitly:

```yaml
workspace_need:
  isolation: required|preferred|not-needed
  requested_mode: isolated-worktree|isolated-sandbox|shared-workspace|sequential
  base_ref: branch-or-ref
  base_commit: exact-sha-containing-required-state
  provider_instruction: exact instruction/configuration for this provider
  visibility_check: how the worker proves cwd, ref, and Leader-visible return path
  integration_return: shared-file-set|commit-sha|portable-patch|changed-artifacts
  fallback_mode: sequential|shared-workspace|stop-and-report
```

For Claude Code, use `isolation: worktree` in the custom subagent configuration when that installed version supports it; a prose mention alone is not proof. For Codex, select a managed task worktree only on a surface that exposes it. If the provider/version cannot perform the requested mode, the executor reports it and uses only `fallback_mode`; it must not invent a branch or claim isolation.

## File and line contract

For every existing target, include:

- repository-relative file path;
- current line number or line range;
- stable symbol, heading, SQL object, or nearby text anchor;
- intended change;
- reason;
- affected callers/consumers.

Line numbers are navigation hints and may move. Stable anchors are mandatory. Mark new files as `NEW` and include their exact intended directory and responsibility.

## Step contract

Write ordered, imperative steps. Each step must name the target, action, reason, constraints, verification, and expected output. Do not use vague instructions such as “update related files,” “handle edge cases,” or “follow best practices” without listing what that means for the current task.

## Prompt SoT and deviation contract

- Keep one approved prompt version active for a task. Mark earlier files `superseded` and point to the replacement; do not maintain conflicting live copies.
- The prompt captures the problem, required end state, owner decisions, evidence, scope, ownership, ordered work, verification, and Result Package. References may point to project SoTs instead of duplicating them.
- An executor may make routine local choices that preserve the contract. Record them in `decisions_and_reasons`.
- If evidence contradicts the prompt or a required material change falls outside its logic, contract, data, ownership, file, or acceptance boundary, stop that affected step and return `deviation_from_prompt` with evidence and a proposed next decision. Do not silently reinterpret the prompt.

## Input contract

Carry the normalized input manifest into the prompt. For large text, list read chunks and unread coverage. For images, list visible facts and unresolved interpretation. For attachments and pointed files, list the validated paths and priority. Never paste an unbounded directory or silently omit part of the owner's input.

## Provider rendering

### Codex

- Use `$skill-name` for explicit skill loading.
- Name the selected Codex model in the task metadata when the surface supports delegation.
- Preserve file, branch, test, and handoff instructions in plain Markdown.

### Claude

- Use `/plugin:skill` or the installed standalone `/skill` syntax.
- Name the selected Claude model/agent in delegation metadata when supported.
- Include `$ARGUMENTS` only in thin command adapters, not in generated execution prompts.

## Generated prompt sections

1. Requester plus separate model, role, agent, and provider assignment
2. Prompt identity, role, status, and task identity
3. Problem, required end state, and definition of done
4. Owner decisions and trade-offs
5. Inputs, evidence ledger, and source of trust
6. Scope and non-goals
7. Workspace need, verified mode, base commit, integration owner, and branch/worktree when applicable
8. File/logical-contract ownership and forbidden overlap
9. Target files, lines, and anchors
10. Ordered execution steps
11. Behavior/logic constraints and deviation policy
12. Tests and independent QA evidence
13. Memory/log checkpoint
14. Structured Result Package and integration artifact

## Prompt QA

Reject the generated prompt if an executor must guess a material business rule, file, placement, model, workspace visibility, integration artifact, test, ownership source, or output format. Also reject a delegation wave with overlapping writers or a QA prompt that can edit. Return to owner discussion instead of hiding ambiguity inside the prompt.
