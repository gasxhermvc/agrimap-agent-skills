# Workflow glossary

These definitions are normative across dedicated operation skills, shared references, templates, prompts, logs, and generated provider copies. The routing-only umbrella does not execute these contracts. A narrower document may add constraints but must not redefine these terms.

The task-artifact structure is likewise centralized: [`task-artifact-schema.json`](../assets/task-artifact-schema.json) owns scaffold order, template mapping, completion fields/sections, cross-artifact QA gates, and full-QA triggers. `agm-workspace.mjs`, package validation, tests, and generated README/Usage blocks consume that schema; do not restate a divergent artifact contract by hand.

## People and authority

- **Requester**: the human who asks for the current task. Record this identity as `requestedBy`. Requesting work does not by itself grant authority to approve a material trade-off.
- **Decision owner**: the human or recorded project role authorized to approve material choices for the affected product, service, data, contract, or release boundary. The decision owner may be the requester, a different person, or unresolved.
- **Requester authority**: record one of `owner`, `delegated`, `requester-only`, or `unknown`. `delegated` requires a named decision owner plus evidence of delegation. `requester-only` and `unknown` may clarify intent and supply evidence but may not satisfy a decision-owner gate.
- **Owner approval / owner decision**: an explicit decision by the decision owner, or by a requester whose recorded authority is `owner` or `delegated`. Silence, task submission, prior requester identity, and approval by a `requester-only`/`unknown` requester are not owner approval.
- **Owner reference**: project material curated or accepted by a decision owner. This describes authority over the reference, not necessarily who requested the current task.

Every tracked task brief and generated prompt records `requested_by`, `requester_authority`, `decision_owner`, and `authority_evidence`. Lightweight/stateless work creates neither artifact. If a material decision is required while authority is `requester-only` or `unknown`, safe product-read-only investigation may continue, but the affected decision and any dependent write must stop.

## Work and artifact boundaries

- **Product artifact**: source, tests, SQL, schema/data, configuration, generated output, product documentation, build/release content, or any external system state delivered by the project.
- **Workflow artifact**: files used only to run and audit this workflow, including `.agrimap-agent/tasks/**`, prompts, memory, decisions, knowledge, logs, and ignored runtime progress/session files.
- **Preparatory inspection**: locating the project root; reading workflow configuration, task state, and Git status; or checking whether required input exists. It is non-mutating and does not advance the technical objective.
- **Substantive work**: any task-specific reading or diagnostic that advances the objective, creating task/workflow state, analysis, planning, delegation, QA, editing a product artifact, or causing an external side effect. Target-code reading, task-specific grep, tests, typechecks, and diagnostics are substantive even when non-mutating. Preparatory inspection and help-only output are not.
- **Verification-only QA**: the tracked-lane verifier defined once in [qa-and-done.md](qa-and-done.md); “read-only” describes product artifacts, not its bounded workflow-evidence writes.

## Task size, decisions, and checkpoints

- **Checkpoint unit**: exactly one durable state transition: task creation; an authorized scope/decision change; completion of one logical implementation batch; integration of one delegated handoff; one verification or QA outcome; or a terminal task transition. Append one checkpoint per unit. A file read, tool call, liveness update, unchanged retry, or conversational update is not a checkpoint unit.
- **Material statement**: a statement which, if wrong, could change scope, behavior, contract, data, ownership, verification, or acceptance. It requires an evidence label.
- **Material choice/change**: a choice that can alter business logic, externally visible behavior, a public contract, persisted data or migration behavior, security/access, service/architecture ownership, destructive scope, release behavior, or acceptance criteria. It requires decision-owner authority.
- **Complex work**: work is complex when any one is true: it crosses a service/database/public-contract boundary; changes data or migration behavior; changes more than one logical contract; needs more than one writer or integration wave; changes shared generators/registries; or has an unproven cause requiring multiple bounded experiments. File count alone does not make work complex.
- **Few files / small task**: at most three product artifacts, one logical contract, one writer, and no cross-service, public-contract, data/migration, shared-registry, or destructive change. Mechanically generated mirrors from one canonical source count as one output family only when the generator and every output are verified together.

## Proportional verification

“Proportional verification” means the minimum evidence tier that covers every changed risk, never merely “some tests”:

1. Workflow/docs-only: format/schema/link checks plus the directly affected contract test.
2. Small single-contract product change: relevant parse/typecheck/lint plus targeted primary and affected failure-path tests.
3. Complex or material product change: all relevant static/build checks plus targeted tests and the affected integration/regression suite.
4. Public contract, data/migration, generated-code regeneration, or commit/publish/release boundary: `qa_mode=full` and the required release/data evidence; forbidden QA side effects remain the executor/Leader's responsibility.

Record each selected or omitted check with its risk rationale. If a required tier cannot run, report `blocked` or an explicit limitation; do not silently lower the tier.

## QA depth counter

- **QA coverage key**: a stable service, library, application area, database object family, or repository-relative module path used to decide whether QA runs cover the same area.
- A `passed` `full` run resets the fast counter to `0` for every coverage key it covers.
- A `passed` `fast` run increments the counter for each coverage key. At most two consecutive passed-fast task closures are allowed for one key; the third closure for that key must use `full`.
- Failed, blocked, or not-applicable QA does not reset or increment the passed-fast counter. Record `coverage_key` and `fast_sequence` in `qa.md`.

## Model identity

- **Model profile**: required capability such as `reasoning_review` or `execution_standard`; it is not a model name.
- **Configurable model label**: an owner/project-editable routing preference from the capability matrix or prompt. It is not proof that the current host offers that model.
- **Actual model**: the model identity exposed or self-reported by the running host for this execution. Durable execution fields named `model` record this actual value, or `unknown` only when the host genuinely does not expose it.
- **Dispatch resolution**: before delegation, resolve the configurable label against models actually available on the active host. Record both the label and actual model. If the label is unavailable, select an available model only when it satisfies the same profile; otherwise stop for a decision-owner choice rather than silently downgrading capability.
- **Provider identity**: the active host only—`codex`, `claude`, or `gemini`. Generated host hooks always pass exactly their own provider. `unknown` is reserved for legacy/imported audit data or a pre-resolution runtime record and cannot satisfy the current task completion schema.
