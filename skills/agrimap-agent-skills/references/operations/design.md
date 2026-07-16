# Compact operation entrypoint: agm-design

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `design`
- Lifecycle: `lightweight-eligible`
- Mode: `product-read-only`
- Purpose: Design a user flow, behavior, and acceptance criteria.
- Deliverable: .agrimap-agent/tasks/<task-id>/design.md

## Inputs and help

- Required: objective.
- Conditional: target_kind when FE/BE placement remains ambiguous; phase for FE/BE work when repository evidence cannot resolve it.
- Minimal example: `$agm-design requested_by=Billy target_kind=fe-main objective="Design empty/loading/error states"`

## Execute this contract

1. Define actors, entry points, states, transitions, validation, failure/recovery, accessibility, and measurable acceptance.
2. Use the target discipline selected by the conditional routing below; do not implement.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — facts versus proposed design
- [input-and-scope.md](../input-and-scope.md) — design reference coverage

## Load only when the condition matches

- When target_kind is fe-main or fe-library: [frontend-engineer.md](../frontend-engineer.md) — frontend design discipline
- When target_kind is be-main or be-library: [backend-engineer.md](../backend-engineer.md) — backend boundary discipline

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
