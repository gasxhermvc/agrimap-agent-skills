# Task execution source of truth

> Keep the language simple. Do not remove a contract field merely to make the prompt shorter.

## Prompt identity

- `prompt_id`: {{prompt_id}}
- `prompt_role`: `{{leader_executor_or_qa}}`
- `prompt_status`: `draft|owner-approved|superseded|executed`
- `task_id`: {{task_id}}
- Supersedes / superseded by: {{prompt_version_pointer_or_none}}

## Requester and assignment

- `requested_by`: {{requested_by}}
- `provider`: {{provider}}
- `model_profile`: {{model_profile}}
- `model_name`: {{model_name_owner_editable}}
- `role`: {{leader_executor_qa_reviewer_or_analyst}}
- `agent_name`: {{primary_fe_be_sql_designer_qa_or_custom}}
- `target_kind`: {{target_kind}}
- `backend_profile`: {{backend_profile_if_be_main}}
- `required_skills`: {{required_skills}}

## Problem, required end state, and done

{{problem_current_behavior_required_end_state_acceptance}}

## Evidence and source of trust

{{facts_inferences_hypotheses_unknowns_with_sources}}

- Service ownership references: {{service_ids_or_not_applicable}}

## Owner decisions and inputs

{{owner_approved_tradeoffs_and_input_manifest}}

## Scope and non-goals

{{scope_non_goals_logic_contract_data_impact}}

## Workspace and ownership

- Workspace need: {{workspace_need}}
- Verified workspace mode: `{{workspace_mode}}`
- Base ref/commit containing required state: {{base_ref_and_commit}}
- Provider instruction: {{provider_workspace_instruction}}
- Visibility check: {{workspace_visibility_check}}
- Unsupported-mode fallback: {{workspace_fallback}}
- Integration owner: {{integration_owner}}
- Branch/worktree: {{branch_or_not_applicable}}
- File/logical-contract ownership: {{file_ownership}}
- Forbidden files/contracts: {{forbidden_overlap}}

## Targets

{{branch_files_lines_stable_anchors}}

## Ordered steps and reasons

For each step include target, action, reason, constraints, verification, expected output, and required reference.

{{ordered_steps}}

## Logic constraints and deviation policy

{{behavior_contract_data_and_generated_code_constraints}}

Continue through routine choices that preserve this contract and record them. If evidence contradicts the prompt or a material change exceeds scope, ownership, logic, contract, data, files, or acceptance criteria, stop the affected step and return:

- `deviation_from_prompt`
- conflicting evidence
- affected files/symbols
- decision required
- proposed next prompt change

## Tests and independent QA

{{constraints_tests}}

- QA is a separate read-only model/agent: {{qa_execution_identity_and_prompt}}
- Claims QA should independently sample: {{qa_claims_to_rerun}}

## Memory checkpoint and Result Package

{{memory_log_and_handoff_contract}}
