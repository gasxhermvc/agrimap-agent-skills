# Compact operation entrypoint: agm-architect

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `architect`
- Workflow depth: default `standard`; allowed `standard`, `regulated`
- Mode: `product-read-only`
- Purpose: Design boundaries, contracts, and migration trade-offs.
- Deliverable: .agrimap-agent/decisions/<decision-id>.md

## Inputs and help

- Required: boundary question or objective.
- Conditional: decision-owner approval before an architecture record becomes approved.
- Minimal example: `$agm-architect requested_by=Billy objective="Choose ownership boundary for order status"`

## Execute this contract

1. Map ownership, contracts, data flow, runtime/deployment effects, alternatives, migration, rollback, and reversible decisions.
2. Produce a proposed decision record; only recorded authority may approve it.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — architecture evidence and counterarguments
- [service-ownership.md](../service-ownership.md) — canonical service and data ownership

## Load only when the condition matches

- When target_kind is fe-main or fe-library: [frontend-engineer.md](../frontend-engineer.md) — frontend architecture fundamentals
- When target_kind is be-main or be-library: [backend-engineer.md](../backend-engineer.md) — backend architecture fundamentals

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
