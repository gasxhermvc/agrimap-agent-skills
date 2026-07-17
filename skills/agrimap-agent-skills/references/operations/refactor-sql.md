# Compact operation entrypoint: agm-refactor-sql

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `refactor-sql`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-write`
- Purpose: Refactor SQL using an explicit behavior mode.
- Deliverable: bounded SQL changes plus direct verified result at light or schema result at standard/regulated

## Inputs and help

- Required: target; refactor_mode.
- Conditional: decision-owner approval for data, result-shape, transaction, or error-contract change.
- Minimal example: `$agm-refactor-sql depth=light target_kind=sql-procedure refactor_mode=strict-preserve-logic target_files=sql/usp_Order_Search.sql`

## Execute this contract

1. Load matching schema references as facts before editing and select exactly one refactor mode.
2. Preserve result sets, transactions, side effects, error mapping, and deployment idempotency unless authorized otherwise.
3. For every newly created SQL artifact, use the golden-first sql/<GROUP_OR_DOMAIN>/table|procedure plus messages.sql layout, keep one object per file, and run validate-sql-artifacts.mjs before handoff.

## Load now

- [refactor-modes.md](../refactor-modes.md) — allowed behavior-change boundary
- [patterns/sql.md](../patterns/sql.md) — current SQL contract and message gate

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when lifecycle-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
