# Compact operation entrypoint: agm-create-feature

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `create-feature`
- Workflow depth: default `light`; allowed `light`
- Mode: `product-write`
- Purpose: Create a bounded FE, BE, batch, library, or SQL feature.
- Deliverable: confirmed bounded vertical slice plus one concise direct verified result; no brief, checklist, QA, result, memory, or log artifacts

## Inputs and help

- Required: objective.
- Conditional: target_kind if placement is unresolved; backend_profile for be-main; agm-create-prompt handoff beyond light or for a new scaffold.
- Minimal example: `$agm-create-feature depth=light target_kind=be-main backend_profile=agmws objective="Add cancel-order endpoint"`

## Execute this contract

1. This operation is light/direct only: never start tracked task state, invoke QA, select qa_mode, delegate/spawn/wait, or write .agrimap-agent artifacts, memory, prompts, or logs.
2. Propose the smallest complete slice and output paths before writing; after confirmation, implement and verify proportionally.
3. For separate QA, an unresolved or material persisted-data decision, standard/regulated depth, more than three product artifacts, material owner decisions, or a new scaffold, stop before writes and route the work to agm-create-prompt; never promote or partially execute.
4. Return the result only after product writes and verification finish; never pre-write a result artifact.
5. Use the matching target discipline.
6. For direct SQL, a bounded slice within the three-artifact limit remains direct only with resolved owner/golden/schema/caller evidence. Run sql-contract-preflight.mjs per object and load returned paths. Use [agrimap_app], canonical files, guarded messages.sql inserts, and the SQLFluff format-then-validate gate. Do not hand-tune cosmetic layout: format every declared changed .sql path, validate the same complete set, and report formatted N/N. Never use a database, ScriptDom, or other parser/runtime.

## Load now

- [elicitation.md](../elicitation.md) — placement, naming, and scaffold gates

## Load only when the condition matches

- When target is FE: [frontend-engineer.md](../frontend-engineer.md) — frontend feature discipline
- When target is BE: [backend-engineer.md](../backend-engineer.md) — backend feature discipline
- When the backend target contains C#: [patterns/csharp.md](../patterns/csharp.md) — C# baseline
- When the backend target reads request values or resolves device ID: [patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md](../patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md) — request priority
- When target is SQL: [patterns/sql.md](../patterns/sql.md) — SQL creation and deployment discipline

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
