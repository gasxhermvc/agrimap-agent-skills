# Compact operation entrypoint: agm-qa

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `qa`
- Mode: `verification-only`
- Purpose: Run independent verification-only QA over product artifacts.
- Deliverable: .agrimap-agent/tasks/<task-id>/qa.md

## Inputs and help

- Required: active task or task_id; integrated artifact to verify.
- Conditional: qa_mode=full when a schema full-QA trigger applies.
- Minimal example: `$agm-qa requested_by=Billy task_id=order-cancel-001 artifact="integrated workspace"`

## Execute this contract

1. Use an independent agent/context, reopen the integrated product artifacts, map requirements to evidence, and rerun selected claims.
2. Never fix findings; product artifacts are read-only and only QA workflow evidence is writable.

## Load now

- [qa-and-done.md](../qa-and-done.md) — QA scope, depth, sequence, and statuses
- [roles.md](../roles.md) — independent QA role boundary

## Load only when the condition matches

- When the task is FE, BE, or SQL: [patterns/pattern-status.md](../patterns/pattern-status.md) — select exactly the matching pattern and Detect gates

Do not read the umbrella `SKILL.md` during a normal alias invocation. Use it only when this generated entrypoint is missing/corrupt or the requester directly invoked the umbrella with an unknown operation.
