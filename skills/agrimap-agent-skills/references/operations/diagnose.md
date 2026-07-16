# Compact operation entrypoint: agm-diagnose

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `diagnose`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-read-only`
- Purpose: Diagnose a problem to a proven root cause.
- Deliverable: direct diagnosis at light; tracked diagnosis artifact only at standard/regulated

## Inputs and help

- Required: symptom.
- Conditional: reproduction evidence when the symptom is not observable from the repository.
- Minimal example: `$agm-diagnose depth=light symptom="Save returns 500" target_files=src/orders.ts implementation=false`

## Execute this contract

1. Reproduce or trace the symptom, separate causes from correlations, and test bounded hypotheses.
2. Return the proven root cause, evidence, affected path, and proposed fix; do not apply the fix.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — hypothesis and evidence discipline
- [input-and-scope.md](../input-and-scope.md) — symptom and target coverage

## Load only when the condition matches

- When the symptom may involve cookie, header, query, form, JSON body, or device-ID resolution: [backend-engineer.md](../backend-engineer.md#http-request-value-normalization) — normalization failure hypotheses for main/library code
- When that backend request-value condition matches: [patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md](../patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md) — expected extraction, normalization, and precedence

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
