# Compact operation entrypoint: agm-refactor

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `refactor`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-write`
- Purpose: Refactor FE, BE, or SQL through one target-routed command with an explicit behavior mode.
- Deliverable: bounded target-specific changes with preserved or explicitly authorized behavior and proportional verification

## Inputs and help

- Required: target=fe|be|sql; target files or objective; refactor_mode.
- Conditional: backend_profile for be-main; decision-owner approval for logic, contract, data, or result-shape change.
- Minimal example: `$agm-refactor target=sql refactor_mode=performance-preserve-behavior target_files=sql/usp_Order_Search.sql`

## Execute this contract

1. Resolve exactly one target discipline and one refactor mode before editing; when mode is ambiguous, show all five modes with one recommendation.
2. Dispatch to only the matching FE, BE, or SQL discipline. Preserve behavior except where the selected mode and recorded authority explicitly allow a change.
3. For SQL, preserve result sets, transactions, side effects, error mapping, and deployment idempotency, then format and validate every declared changed SQL path.

## Load now

- [refactor-modes.md](../refactor-modes.md) — allowed behavior-change boundary
- [elicitation.md](../elicitation.md) — target and mode resolution

## Load only when the condition matches

- When target=fe: [frontend-engineer.md](../frontend-engineer.md) — frontend refactor discipline
- When target=fe: [patterns/frontend.md](../patterns/frontend.md) — current frontend contract
- When target=be: [backend-engineer.md](../backend-engineer.md) — backend refactor discipline
- When target=be: [patterns/backend.md](../patterns/backend.md) — current backend contract
- When the backend target contains C#: [patterns/csharp.md](../patterns/csharp.md) — project-wide C# refactor baseline
- When the backend refactor touches request values or device-ID resolution: [patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md](../patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md) — request-value behavior and precedence
- When target=sql: [patterns/sql.md](../patterns/sql.md) — current SQL refactor, formatting, and validation contract

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
