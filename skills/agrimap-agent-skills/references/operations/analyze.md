# Compact operation entrypoint: agm-analyze

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `analyze`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-read-only`
- Purpose: Analyze scope, hidden problems, impacts, and trade-offs.
- Deliverable: direct analysis response at light; tracked analysis artifact only at standard/regulated

## Inputs and help

- Required: objective or a pointed target.
- Conditional: target_kind when repository evidence cannot resolve the affected discipline.
- Minimal example: `$agm-analyze depth=light target_files=src/orders.ts objective="Explain duplicate requests; do not edit"`

## Execute this contract

1. Inspect the full target and affected callers before conclusions.
2. Return facts, inferences, unknowns, impacts, viable options, and a recommendation; never edit product artifacts.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — evidence labels and reasoning quality
- [input-and-scope.md](../input-and-scope.md) — target and input coverage

## Load only when the condition matches

- When target_kind is fe-main or fe-library: [frontend-engineer.md](../frontend-engineer.md) — frontend analysis fundamentals
- When target_kind is be-main or be-library: [backend-engineer.md](../backend-engineer.md) — backend analysis fundamentals including request-value normalization
- When the backend target reads cookie, header, query, form, JSON body, or device ID: [patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md](../patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md) — exact normalize API and compatibility behavior

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
