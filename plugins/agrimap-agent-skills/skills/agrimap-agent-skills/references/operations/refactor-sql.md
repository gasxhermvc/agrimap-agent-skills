# Compact operation entrypoint: agm-refactor-sql

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `refactor-sql`
- Lifecycle: `lightweight-eligible`
- Mode: `product-write`
- Purpose: Refactor SQL using an explicit behavior mode.
- Deliverable: bounded SQL changes plus static/contract verification and Result Package

## Inputs and help

- Required: target; refactor_mode.
- Conditional: decision-owner approval for data, result-shape, transaction, or error-contract change.
- Minimal example: `$agm-refactor-sql requested_by=Billy target_kind=sql-procedure refactor_mode=strict-preserve-logic target_files=sql/usp_Order_Search.sql`

## Execute this contract

1. Load matching schema references as facts before editing and select exactly one refactor mode.
2. Preserve result sets, transactions, side effects, error mapping, and deployment idempotency unless authorized otherwise.

## Load now

- [refactor-modes.md](../refactor-modes.md) — allowed behavior-change boundary
- [patterns/sql.md](../patterns/sql.md) — current SQL contract and message gate

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
