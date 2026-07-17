# Compact operation entrypoint: agm-create-feature

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `create-feature`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-write`
- Purpose: Create a target-specific FE, BE, batch, library, or SQL feature.
- Deliverable: confirmed vertical slice plus direct verified result at light or schema result at standard/regulated

## Inputs and help

- Required: objective.
- Conditional: target_kind when placement evidence is absent; backend_profile for be-main; full command approval for a new project scaffold.
- Minimal example: `$agm-create-feature depth=light target_kind=be-main backend_profile=agmws objective="Add cancel-order endpoint"`

## Execute this contract

1. Inspect existing structure and propose the smallest complete slice with every output path before writing.
2. Use the matching target discipline; new project scaffolds require the exact command and working-directory approval.
3. For SQL creation, apply golden structure above mixed project structure, write one object per canonical sql/<GROUP_OR_DOMAIN>/table|procedure file, use domain messages.sql for guarded LUT_APP_MESSAGES inserts, and run validate-sql-artifacts.mjs.

## Load now

- [elicitation.md](../elicitation.md) — placement, naming, and scaffold gates

## Load only when the condition matches

- When target is FE: [frontend-engineer.md](../frontend-engineer.md) — frontend feature discipline
- When target is BE: [backend-engineer.md](../backend-engineer.md) — backend feature discipline
- When target is SQL: [patterns/sql.md](../patterns/sql.md) — SQL creation and deployment discipline

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
