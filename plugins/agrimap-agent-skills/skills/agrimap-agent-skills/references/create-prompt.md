# Create-prompt workflow

## สารบัญ

- [Staged elicitation contract](#staged-elicitation-contract)
- [Prompt file naming and lifecycle](#prompt-file-naming-and-lifecycle)
- [Required input variables](#required-input-variables)
- [Build the prompt](#build-the-prompt)
- [Delegation overlap contract](#delegation-overlap-contract)
- [Workspace-need contract](#workspace-need-contract)
- [File and step contracts](#file-and-line-contract)
- [Prompt SoT and deviation contract](#prompt-sot-and-deviation-contract)
- [Input contract](#input-contract)
- [Provider rendering](#provider-rendering)
- [Generated prompt sections](#generated-prompt-sections)
- [Prompt QA](#prompt-qa)

Generate prompts that an executor can run without reconstructing the Leader's reasoning. The approved prompt is the execution source of truth for one tracked task. Use plain language and reference canonical contracts instead of copying them.

## Staged elicitation contract

Run the stages in order. Skip B–D only when the requester explicitly requests `express` within recorded authority; the default is the full sequence.

- **Stage A — intake and sweep.** Collect the requester objective, requester authority, decision owner, authority evidence, and inputs, then sweep the current conversation and `.agrimap-agent/` state (memory, decisions, knowledge, prior prompts, owner reference library) without asking the requester to repeat anything already said. Summarize the evidence ledger, including what remains `UNKNOWN`. Do not write any prompt yet.
- **Stage B — approach with mandatory counter-arguments.** Present the viable approaches with trade-offs, and argue against the leading option at least once with evidence. Agreement without challenge is a stage failure.
- **Stage C — thesis refinement.** Reduce the discussion to a thesis: problem → reasoning → chosen approach → measurable success criteria. Iterate with the requester; route every material choice to the recorded decision owner. The thesis is carried into the generated prompt so it stays repeatable and auditable.
- **Stage D — understanding checklist gate.** Return the full understanding as a checklist. The requester confirms factual intent; the decision owner approves material choices. Do not proceed to Stage E until the required authority approves; if an authorized participant corrects an item, update and re-present only the changed items.
- **Stage E — generation.** Produce the Leader/executor/QA prompt files below with `prompt_status: draft`. Only the decision owner, or a requester with recorded `owner|delegated` authority, may flip a material prompt to `owner-approved`. Generation is the end of this operation: **never begin executing a generated prompt.** Running it is a separate authorized action through `agm-exec`.

Authority gates in this contract are real stops. A completed stage output is never permission to advance past a gate without the required requester's confirmation or decision owner's approval.

## Prompt file naming and lifecycle

Write prompt files as `.agrimap-agent/prompts/<task-id>/<role>.prompt.md`, for example `leader.prompt.md`, `executor.prompt.md`, `executor-fe.prompt.md`, and `qa.prompt.md`. The `.prompt.md` suffix is required so editor tooling recognizes the files; do not rename them to encode status — `prompt_status` in the manifest is the single status source.

When the task closes, `agm-workspace.mjs complete|close` moves the whole task prompt folder to `.agrimap-agent/prompts/complete/<task-id>/` automatically. Never move or rename prompt files by hand, and never execute a prompt found under `complete/`.

## Required input variables

Use these names in the generated prompt manifest:

- `requested_by`: human requester copied into task logs and handoffs
- `requester_authority`: `owner`, `delegated`, `requester-only`, or `unknown`
- `decision_owner`
- `authority_evidence`
- `prompt_id`
- `prompt_role`: `leader`, `executor`, or `qa`
- `prompt_status`: `draft`, `owner-approved`, `superseded`, or `executed`
- `task_id`
- `provider`: `codex`, `claude`, or `gemini`
- `operation`
- `objective`
- `non_goals`
- `target_kind`: one value, or a list for cross-target work, from `fe-main`, `fe-library`, `be-main`, `be-library`, `sql-table`, `sql-procedure`, or `sql-table-and-procedure`
- `backend_profile`: required for every `be-main` target; exactly `agmws` or `agmbo`; omit for other targets
- `refactor_mode` when applicable
- `logic_impact`: `none`, `preserve`, or `change-approved`
- `model_profile`
- `model_label`: configurable routing preference; not availability evidence
- `actual_model`: `unresolved-until-dispatch` in a draft, then the runtime-observed model
- `role`: `leader`, `executor`, `qa`, `reviewer`, or `analyst`
- `agent_name`: stable functional label such as `primary`, `fe`, `be`, `sql`, `designer`, or `qa`
- `workspace_mode`: `shared-workspace`, `isolated-worktree`, `isolated-sandbox`, or `unknown`
- `workspace_need`: required contract containing `isolation`, `requested_mode`, `base_ref`, `base_commit`, `provider_instruction`, `visibility_check`, `integration_return`, and `fallback_mode`
- `integration_owner`
- `display_label`: descriptive native agent label/nickname for delegated work
- `progress_channel`: native app/CLI/IDE agent thread by default; fallback JSONL path only when native activity is unavailable
- `branch_name`
- `file_ownership`
- `required_skills`
- `service_ownership_refs`: relevant `service_id` values from `.agrimap-agent/knowledge/service-ownership.yaml`; omit when not applicable
- `inputs`
- `evidence_ledger`: material `FACT`, `INFERENCE`, `HYPOTHESIS`, and `UNKNOWN` items
- `authorized_decisions`
- `target_files`
- `forbidden_files`
- `steps`
- `tests`
- `acceptance_criteria`
- `deviation_policy`
- `handoff_contract`

Allow the decision owner to override `model_label` in the generated prompt file. The label is only a routing preference and may name a model the host does not offer. At dispatch, resolve it against the active host, preserve `model_profile`, and record the actual model separately. If no available model satisfies the profile, stop for a decision-owner choice rather than silently weakening capability. Keep `model_label`, `actual_model`, `role`, `agent_name`, and `provider` separate; do not create composite names such as `frontier-codex` or `gpt-5.4-fe` as the only identity record.

## Build the prompt

1. Read the complete requester request, authority metadata, and current memory.
2. Inspect relevant code, callers, consumers, contracts, tests, and patterns.
3. Label material evidence using [analysis-discipline.md](analysis-discipline.md) and resolve every material trade-off with the decision owner; requester confirmation alone is insufficient unless authority is `owner|delegated`.
4. Reject `agmws` or `agmbo` as `target_kind`. Require one as `backend_profile` for every `be-main` target.
5. Select a model profile from `model-capability-matrix.yaml`.
6. Split work only when tasks are independent; use at most five active subagents.
7. Define `workspace_need` before delegation. State whether isolation is required/preferred/not-needed, the requested mode, base ref and exact base commit containing the required state, provider-specific instruction, visibility check, integration return, and safe fallback. Assign a descriptive native display label and state how the requester inspects progress; never leave the main thread in an unexplained multi-minute wait.
8. Verify the real workspace mode. Do not assume sandbox commits, branches, worktrees, or uncommitted parent changes are visible to the Leader.
9. Build a file/logical-contract ownership map. One writer model owns a file or contract per integration wave; combine or sequence overlapping tasks.
10. Assign branch/worktree names only when the selected workspace mode supports them. If required state is uncommitted and absent from the base commit, use shared/sequential work or obtain an explicit decision-owner-approved commit boundary; never pretend an isolated worker can see it.
11. Write the required role prompts under `.agrimap-agent/prompts/<task-id>/`. A QA prompt imports [qa-and-done.md](qa-and-done.md) as its complete boundary; do not duplicate that policy here or in generated Leader/executor prompts.
12. Add the exact skill/reference files the executor must load.
13. For cross-service or ownership-sensitive work, point to exact `service_id` entries in `.agrimap-agent/knowledge/service-ownership.yaml`; never paste a second ownership map into the prompt.
14. Validate that each prompt contains the fields below.

## Delegation overlap contract

Before rendering prompts, compare each executor's target files, generators, shared registries, exports, routes, DI files, schemas, callers, and contracts. A file may appear in only one writer's `file_ownership` for the wave. Put every other writer's set in `forbidden_files`.

QA/review prompts use the canonical boundary in [qa-and-done.md](qa-and-done.md). Generated prompts name that source and task-specific evidence only; they do not restate status, correction, or terminal rules. When writer overlap cannot be removed, use one executor or sequence the prompts.

The Leader names the integration artifact for the chosen workspace mode: shared-workspace file set, visible commit SHA, or portable patch/changed artifacts. Integration and evidence synthesis remain Leader responsibilities, never requester cleanup.

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
- The prompt captures the problem, required end state, authorized decision-owner decisions, evidence, scope, ownership, ordered work, verification, and Result Package. References may point to project SoTs instead of duplicating them.
- An executor may make routine local choices that preserve the contract. Record them in `decisions_and_reasons`.
- If evidence contradicts the prompt or a required material change falls outside its logic, contract, data, ownership, file, or acceptance boundary, stop that affected step and return `deviation_from_prompt` with evidence and a proposed next decision. Do not silently reinterpret the prompt.

## Input contract

Carry the normalized input manifest into the prompt. For large text, list read chunks and unread coverage. For images, list visible facts and unresolved interpretation. For attachments and pointed files, list the validated paths and priority. Never paste an unbounded directory or silently omit part of the requester's input.

## Provider rendering

### Codex

- Use `$skill-name` for explicit skill loading.
- Name the selected Codex model in the task metadata when the surface supports delegation.
- Preserve file, branch, test, and handoff instructions in plain Markdown.

### Claude

- Use `/plugin:skill` or the installed standalone `/skill` syntax.
- Name the selected Claude model/agent in delegation metadata when supported.
- Include `$ARGUMENTS` only in thin command adapters, not in generated execution prompts.

### Gemini

- Use the installed operation-specific `/agm-*` custom command supported by the active Gemini CLI extension. The `agrimap-agent-skills` router may recommend that command but never executes prompt generation; do not emit Codex `$skill-name` or Claude `/plugin:skill` syntax.
- Record `provider: gemini` and the exact active Gemini model when the host exposes it. If the matrix selects `gemini-cli-default`, resolve that routing label at dispatch and record the actual model in execution identity.
- Keep generated execution prompts in plain Markdown. Use `{{args}}` only in generated Gemini command adapters, never inside the execution prompt itself.

## Generated prompt sections

1. Requester, requester authority, decision owner, authority evidence, plus separate model label, actual model, role, agent, and provider assignment
2. Prompt identity, role, status, and task identity
3. Problem, required end state, and definition of done
4. Authorized decision-owner decisions and trade-offs
5. Inputs, evidence ledger, and source of trust
6. Scope and non-goals
7. Workspace need, verified mode, base commit, integration owner, native display label/progress channel, and branch/worktree when applicable
8. File/logical-contract ownership and forbidden overlap
9. Target files, lines, and anchors
10. Ordered execution steps
11. Behavior/logic constraints and deviation policy
12. Tests and canonical QA handoff when tracked
13. Memory/log checkpoint
14. Structured Result Package and integration artifact

## Prompt QA

Reject the generated prompt if an executor must guess a material business rule, file, placement, model profile/label resolution, workspace visibility, integration artifact, test, ownership source, authority, or output format. Also reject a delegation wave with overlapping writers or a QA prompt that can modify product artifacts. Return to requester discussion and decision-owner approval instead of hiding ambiguity inside the prompt.
