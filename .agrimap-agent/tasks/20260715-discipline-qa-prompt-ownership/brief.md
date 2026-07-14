# Task brief

- Task ID: `20260715-discipline-qa-prompt-ownership`
- Requested by: Billy
- Session: `codex-20260715-billy`
- Operation: `review-and-update`
- Objective: Integrate approved Fable strengths: FE discipline, independent QA, analysis evidence, prompt SoT, and service ownership SoT
- Scope: Integrate owner-approved review strengths 1-5 into the canonical umbrella, references, templates, memory workspace, provider adapters, and validation. Verify current Claude/Codex worktree behavior from official sources.
- Non-goals: Do not introduce the proposed Back-end Engineer discipline, phase/change-kind taxonomy, or change BE coding patterns until Billy decides the open design trade-off. Do not import the Fable service inventory as confirmed ownership.
- Logic impact: Workflow contract changes only; golden coding examples and application runtime logic remain unchanged.
- Workspace mode: `shared-workspace`; Frontier is the only writer and QA is read-only.

## Owner decisions

- FE Engineer is a composable discipline, with `/agm-fe-engineer` as a direct entry point.
- Independent QA verifies integrated implementation; QA and Frontier do not fix findings inside the task under verification.
- Frontier synthesizes failed QA and proposes/discusses a prompt for a new correction task.
- Prompt language may be simple, but the approved prompt is the complete task execution SoT.
- Service ownership has one canonical project file and evidence status.
- `fable` and the previously written `fable5` are the same Fable 5 model.

## Open owner trade-off

- Back-end Engineer discipline: proposed separate axes are `target_kind`, `backend_profile`, `phase`, and `change_kind`; not implemented in this task.
