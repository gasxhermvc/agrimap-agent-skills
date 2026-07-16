# Compact operation entrypoint: agm-simulate

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `simulate`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-read-only`
- Purpose: Simulate scenarios, risks, and observable outcomes.
- Deliverable: direct simulation at light; tracked simulation artifact only at standard/regulated

## Inputs and help

- Required: scenario.
- Conditional: inputs and observables when they cannot be derived from the scenario.
- Minimal example: `$agm-simulate depth=light scenario="Retry after timeout" inputs=timeout,retry-count`

## Execute this contract

1. Model the initial state, transitions, branches, failure modes, and observables.
2. Label assumptions and confidence; do not present a simulation as measured runtime fact.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — assumption and confidence labels

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when lifecycle-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
