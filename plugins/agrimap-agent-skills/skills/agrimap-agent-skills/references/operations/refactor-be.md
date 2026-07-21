# Compact operation entrypoint: agm-refactor-be

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `refactor-be`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-write`
- Purpose: Refactor backend code using an explicit behavior mode.
- Deliverable: bounded backend changes plus direct verified result at light or schema result at standard/regulated
- Compatibility: deprecated; use agm-refactor target=be. Preserve this operation name only for existing prompts, audit, and automation.


## Inputs and help

- Required: target; refactor_mode.
- Conditional: backend_profile for be-main; decision-owner approval for logic or contract change.
- Minimal example: `$agm-refactor-be depth=light target_kind=be-main backend_profile=agmws refactor_mode=strict-preserve-logic target_files=Application/Orders.cs`

## Execute this contract

1. Prove current behavior and select exactly one refactor mode before editing.
2. Preserve architecture, routes, responses, messages, data, and public contracts unless authority explicitly approves change.

## Load now

- [refactor-modes.md](../refactor-modes.md) — allowed behavior-change boundary
- [backend-engineer.md](../backend-engineer.md) — backend phase and profile discipline
- [patterns/backend.md](../patterns/backend.md) — current backend contract

## Load only when the condition matches

- When the backend refactor contains C#: [patterns/csharp.md](../patterns/csharp.md) — project-wide C# refactor baseline
- When the refactor touches direct request/header/cookie/query/form/body access or repeated blank/trim/fallback logic: [patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md](../patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md) — behavior-preserving normalization target for main/library code

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
