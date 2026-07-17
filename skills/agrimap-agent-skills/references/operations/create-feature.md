# Compact operation entrypoint: agm-create-feature

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `create-feature`
- Workflow depth: default `light`; allowed `light`
- Mode: `product-write`
- Purpose: Create a bounded FE, BE, batch, library, or SQL feature directly without tracked workflow artifacts.
- Deliverable: confirmed bounded vertical slice plus one concise direct verified result; no brief, checklist, QA, result, memory, or log artifacts

## Inputs and help

- Required: objective.
- Conditional: target_kind when placement evidence is absent; backend_profile for be-main; agm-create-prompt handoff when scope exceeds light or requests a new project scaffold.
- Minimal example: `$agm-create-feature depth=light target_kind=be-main backend_profile=agmws objective="Add cancel-order endpoint"`

## Execute this contract

1. This operation is light/direct only: never start tracked task state, invoke QA, select qa_mode, delegate/spawn/wait, or write .agrimap-agent artifacts, memory, prompts, or logs.
2. Inspect existing structure and propose the smallest complete slice with every output path before writing; after confirmation, implement that slice and verify it proportionally.
3. If scope includes separate QA, a persisted-data contract, standard/regulated depth, more than three product artifacts, material owner decisions, or a new scaffold, stop before product writes and route the work to agm-create-prompt; never promote or partially execute here.
4. Return the result only after product writes and verification finish using proportional writer checks; never pre-write a result artifact.
5. Use the matching target discipline.
6. For direct SQL, first run sql-contract-preflight.mjs once per named object and load every returned path; then use [agrimap_app], golden-first canonical files, executable guarded messages.sql inserts, and validate-sql-artifacts.mjs only. Report the selected golden and scripts; never use a database, ScriptDom, or another parser/runtime.

## Load now

- [elicitation.md](../elicitation.md) — placement, naming, and scaffold gates

## Load only when the condition matches

- When target is FE: [frontend-engineer.md](../frontend-engineer.md) — frontend feature discipline
- When target is BE: [backend-engineer.md](../backend-engineer.md) — backend feature discipline
- When target is SQL: [patterns/sql.md](../patterns/sql.md) — SQL creation and deployment discipline

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
