# Compact operation entrypoint: agm-refactor-sql

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `refactor-sql`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-write`
- Purpose: Refactor SQL using an explicit behavior mode.
- Deliverable: bounded SQL changes plus direct verified result at light or schema result at standard/regulated

## Inputs and help

- Required: target; refactor_mode=performance-preserve-behavior|readability-organization|strict-preserve-logic|strict-allow-logic-change|targeted-bug-fix.
- Conditional: decision-owner approval for data, result-shape, transaction, or error-contract change.
- Minimal example: `$agm-refactor-sql depth=light target_kind=sql-procedure refactor_mode=strict-preserve-logic target_files=sql/usp_Order_Search.sql`

## Execute this contract

1. Load matching schema facts and select one mode. If intent is ambiguous, show all five enums with one-line boundaries and one marked recommendation in the first reply; never return a recommendation alone.
2. Preserve result sets, transactions, side effects, error mapping, and deployment idempotency unless authorized otherwise.
3. Before SQL writes, run ensure-sqlfluff.mjs; failure blocks writes. Format each create/edit with the exact file/folder command, then validate. Folder nonzero is incomplete: isolate changed files, fix only in-scope parse defects, and rerun the folder command.

## Load now

- [refactor-modes.md](../refactor-modes.md) — allowed behavior-change boundary
- [patterns/sql.md](../patterns/sql.md) — current SQL contract and message gate

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when lifecycle-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
