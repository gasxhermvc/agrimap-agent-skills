# Compact operation entrypoint: agm-history

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `history`
- Lifecycle: `stateless`
- Mode: `product-read-only`
- Purpose: Query workflow attribution and audit-storage status by person, task, event, or UTC time range.
- Deliverable: structured history result

## Inputs and help

- Required: at least one useful person, task, event, or time-range query.
- Conditional: explicit UTC offset for timestamp inputs.
- Minimal example: `$agm-history requester=Billy days=5`

## Execute this contract

1. Run the workspace history command and answer from versioned workflow evidence, not conversational recall.
2. Separate requester, execution identity, claimed files, Git authorship, and storage durability.

## Load now

- [memory-and-logs.md](../memory-and-logs.md) — history filters and attribution semantics

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
