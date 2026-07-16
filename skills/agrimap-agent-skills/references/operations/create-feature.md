# Compact operation entrypoint: agm-create-feature

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `create-feature`
- Mode: `product-write`
- Purpose: Create a target-specific FE, BE, batch, library, or SQL feature.
- Deliverable: confirmed vertical slice plus verification and Result Package

## Inputs and help

- Required: objective.
- Conditional: target_kind when placement evidence is absent; backend_profile for be-main; full command approval for a new project scaffold.
- Minimal example: `$agm-create-feature requested_by=Billy target_kind=be-main backend_profile=agmws objective="Add cancel-order endpoint"`

## Execute this contract

1. Inspect existing structure and propose the smallest complete slice with every output path before writing.
2. Use the matching target discipline; new project scaffolds require the exact command and working-directory approval.

## Load now

- [elicitation.md](../elicitation.md) — placement, naming, and scaffold gates

## Load only when the condition matches

- When target is FE: [frontend-engineer.md](../frontend-engineer.md) — frontend feature discipline
- When target is BE: [backend-engineer.md](../backend-engineer.md) — backend feature discipline
- When target is SQL: [patterns/sql.md](../patterns/sql.md) — SQL creation and deployment discipline

Do not read the umbrella `SKILL.md` during a normal alias invocation. Use it only when this generated entrypoint is missing/corrupt or the requester directly invoked the umbrella with an unknown operation.
