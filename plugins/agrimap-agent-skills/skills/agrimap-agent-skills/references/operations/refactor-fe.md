# Compact operation entrypoint: agm-refactor-fe

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `refactor-fe`
- Mode: `product-write`
- Purpose: Refactor frontend code using an explicit behavior mode.
- Deliverable: bounded frontend changes plus verification and Result Package

## Inputs and help

- Required: target; refactor_mode.
- Conditional: target_kind and phase when repository evidence cannot resolve them; decision-owner approval for logic change.
- Minimal example: `$agm-refactor-fe requested_by=Billy target_kind=fe-main refactor_mode=strict-preserve-logic target_files=src/order.component.ts`

## Execute this contract

1. Prove current behavior and select exactly one refactor mode before editing.
2. Preserve or change behavior only as that mode allows; run frontend pattern gates and proportional verification.

## Load now

- [refactor-modes.md](../refactor-modes.md) — allowed behavior-change boundary
- [frontend-engineer.md](../frontend-engineer.md) — frontend phase discipline
- [patterns/frontend.md](../patterns/frontend.md) — current frontend contract

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it.

Do not read the umbrella `SKILL.md` during a normal alias invocation. Use it only when this generated entrypoint is missing/corrupt or the requester directly invoked the umbrella with an unknown operation.
