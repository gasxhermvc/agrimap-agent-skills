# Compact operation entrypoint: agm-architect

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `architect`
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

- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it.

Do not read the umbrella `SKILL.md` during a normal alias invocation. Use it only when this generated entrypoint is missing/corrupt or the requester directly invoked the umbrella with an unknown operation.
