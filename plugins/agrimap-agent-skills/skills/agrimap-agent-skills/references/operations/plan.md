# Compact operation entrypoint: agm-plan

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `plan`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-read-only`
- Purpose: Create a reverse-engineered execution plan.
- Deliverable: direct plan at light; tracked plan artifact only at standard/regulated

## Inputs and help

- Required: objective.
- Conditional: decision-owner choice when multiple material approaches remain viable.
- Minimal example: `$agm-plan depth=light objective="Add order cancellation" target_files=src/orders.ts`

## Execute this contract

1. Reverse-engineer current behavior, dependencies, callers, tests, and integration order before planning.
2. Each step names target, action, reason, verification, and decision-owner gate; do not implement.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — evidence-backed plan assumptions
- [input-and-scope.md](../input-and-scope.md) — scope ledger

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when lifecycle-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
