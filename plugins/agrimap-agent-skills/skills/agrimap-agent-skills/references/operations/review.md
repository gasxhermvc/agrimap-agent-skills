# Compact operation entrypoint: agm-review

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `review`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-read-only`
- Purpose: Review code or artifacts with evidence-backed findings.
- Deliverable: direct findings at light; tracked review artifact only at standard/regulated

## Inputs and help

- Required: target.
- Conditional: review_scope when the requester wants narrower coverage than the default.
- Minimal example: `$agm-review depth=light target_files=src/orders.ts review_scope=correctness,regression,tests`

## Execute this contract

1. Review correctness, regressions, contracts/data, maintainability, relevant performance, and tests in that order.
2. Report actionable findings by severity with file/line, evidence, and impact; do not fix them.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — finding evidence and severity

## Load only when the condition matches

- When the target is FE, BE, or SQL: [patterns/pattern-status.md](../patterns/pattern-status.md) — route to the current target pattern only

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
