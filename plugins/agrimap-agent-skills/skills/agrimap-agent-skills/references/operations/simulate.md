# Compact operation entrypoint: agm-simulate

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `simulate`
- Mode: `product-read-only`
- Purpose: Simulate scenarios, risks, and observable outcomes.
- Deliverable: .agrimap-agent/tasks/<task-id>/simulation.md

## Inputs and help

- Required: scenario.
- Conditional: inputs and observables when they cannot be derived from the scenario.
- Minimal example: `$agm-simulate requested_by=Billy scenario="Retry after timeout" inputs=timeout,retry-count`

## Execute this contract

1. Model the initial state, transitions, branches, failure modes, and observables.
2. Label assumptions and confidence; do not present a simulation as measured runtime fact.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — assumption and confidence labels

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it.

Do not read the umbrella `SKILL.md` during a normal alias invocation. Use it only when this generated entrypoint is missing/corrupt or the requester directly invoked the umbrella with an unknown operation.
