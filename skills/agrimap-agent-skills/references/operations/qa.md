# Compact operation entrypoint: agm-qa

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `qa`
- Lifecycle: `tracked-only`
- Mode: `verification-only`
- Purpose: Verify tracked work in a separate product-read-only context.
- Deliverable: .agrimap-agent/tasks/<task-id>/qa.md

## Inputs and help

- Required: active task or task_id; integrated artifact to verify.
- Conditional: qa_mode=full when a schema full-QA trigger applies.
- Minimal example: `$agm-qa requested_by=Billy task_id=order-cancel-001 artifact="integrated workspace"`

## Execute this contract

1. Apply qa-and-done.md as the complete policy; reopen integrated artifacts, map requirements to evidence, and rerun selected claims.
2. Return only the canonical status and evidence; do not copy policy text into the report.

## Load now

- [qa-and-done.md](../qa-and-done.md) — single QA, correction, and completion policy

## Load only when the condition matches

- When the task is FE, BE, or SQL: [patterns/pattern-status.md](../patterns/pattern-status.md) — select exactly the matching pattern and Detect gates

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
