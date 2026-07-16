# Compact operation entrypoint: agm-refactor-fe

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `refactor-fe`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-write`
- Purpose: Refactor frontend code using an explicit behavior mode.
- Deliverable: bounded frontend changes plus direct verified result at light or schema result at standard/regulated

## Inputs and help

- Required: target; refactor_mode.
- Conditional: target_kind and phase when repository evidence cannot resolve them; decision-owner approval for logic change.
- Minimal example: `$agm-refactor-fe depth=light target_kind=fe-main refactor_mode=strict-preserve-logic target_files=src/order.component.ts`

## Execute this contract

1. Prove current behavior and select exactly one refactor mode before editing.
2. Preserve or change behavior only as that mode allows; run frontend pattern gates and proportional verification.

## Load now

- [refactor-modes.md](../refactor-modes.md) — allowed behavior-change boundary
- [frontend-engineer.md](../frontend-engineer.md) — frontend phase discipline
- [patterns/frontend.md](../patterns/frontend.md) — current frontend contract

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when lifecycle-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
