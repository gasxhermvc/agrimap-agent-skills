# Compact operation entrypoint: agm-create-unit-test

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `create-unit-test`
- Lifecycle: `lightweight-eligible`
- Mode: `product-write`
- Purpose: Create target-specific unit or regression tests.
- Deliverable: selected tests plus verification and Result Package

## Inputs and help

- Required: target.
- Conditional: requester selection when behaviors were not already specified; backend_profile for be-main.
- Minimal example: `$agm-create-unit-test requested_by=Billy target_files=src/orders.ts objective="cover duplicate cancellation"`

## Execute this contract

1. Inspect the existing test framework and propose a numbered risk/behavior list when coverage was not specified.
2. Create only selected tests and follow the matching target discipline and naming.

## Load now

- [elicitation.md](../elicitation.md) — propose-first selection contract

## Load only when the condition matches

- When target is FE: [frontend-engineer.md](../frontend-engineer.md) — frontend test discipline
- When target is BE: [backend-engineer.md](../backend-engineer.md) — backend test discipline
- When target is SQL: [patterns/sql.md](../patterns/sql.md) — SQL verification boundary

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
