# Analysis discipline

Use this discipline for analysis, diagnosis, planning, architecture, review, and any implementation task whose cause or impact is not already proven.

## Evidence labels

Label important statements so an executor and QA model can tell what is known:

- `FACT`: directly observed in owner input, current code, tests, runtime output, contracts, or verified project knowledge. Include the source pointer.
- `INFERENCE`: a conclusion supported by named facts. State the reasoning and confidence.
- `HYPOTHESIS`: a testable explanation not yet proven. State the bounded check that would confirm or reject it.
- `UNKNOWN`: missing evidence that may change scope, logic, ownership, or the selected solution.

Do not turn an inference into a fact through repetition. Replace a hypothesis with the observed result after running its check.

## Hidden-problem probes

Run only the probes relevant to the task, and record `not-relevant` with a short reason when a material probe was considered but does not apply:

1. Contract drift: caller, route, DTO, event, schema, generated client, or public API no longer agrees.
2. Failure path: error, timeout, retry, empty state, rollback, partial result, or cleanup behaves differently from the primary path.
3. Boundary and ownership: logic, data, model, reusable artifact, or configuration is placed under the wrong owner.
4. State and concurrency: duplicate actions, stale state, races, scheduling overlap, idempotency, or lifecycle cleanup can alter the result.
5. Data integrity: nullability, transaction boundary, mapping, ordering, precision, seed, or delete semantics can lose or corrupt meaning.
6. Performance: query shape, repeated work, payload, rendering, allocation, or network fan-out matters at the observed scale.
7. Consistency and debt spread: a new path duplicates or bypasses an existing project pattern and will multiply maintenance cost.
8. Project controls: existing authorization, privacy, deployment, or operational checks are affected. Apply the project's controls; do not invent a parallel security policy.

## Analysis output

Return:

- objective, current behavior, required end state, and scope;
- evidence ledger using the labels above;
- hidden/root problem and impact surface;
- solution options with trade-offs and recommendation when materially different choices exist;
- owner decisions and unresolved unknowns;
- smallest complete execution checklist;
- verification and QA evidence required to close the task.

Use [../assets/templates/analysis.md](../assets/templates/analysis.md) when writing a durable analysis artifact.
