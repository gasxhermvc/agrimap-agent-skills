# Compact operation entrypoint: agm-analyze

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `analyze`
- Lifecycle: `lightweight-eligible`
- Mode: `product-read-only`
- Purpose: Analyze scope, hidden problems, impacts, and trade-offs.
- Deliverable: .agrimap-agent/tasks/<task-id>/analysis.md

## Inputs and help

- Required: objective or a pointed target.
- Conditional: target_kind when repository evidence cannot resolve the affected discipline.
- Minimal example: `$agm-analyze requested_by=Billy target_files=src/orders.ts objective="Explain duplicate requests; do not edit"`

## Execute this contract

1. Inspect the full target and affected callers before conclusions.
2. Return facts, inferences, unknowns, impacts, viable options, and a recommendation; never edit product artifacts.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — evidence labels and reasoning quality
- [input-and-scope.md](../input-and-scope.md) — target and input coverage

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
