# Compact operation entrypoint: agm-create-prompt

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `create-prompt`
- Lifecycle: `tracked-only`
- Mode: `workflow-write-only`
- Purpose: Create provider-specific Leader, executor, and QA prompts.
- Deliverable: .agrimap-agent/prompts/<task-id>/<role>.prompt.md

## Inputs and help

- Required: objective; provider.
- Conditional: target_kind/backend_profile for target-specific work; decision-owner approval before execution.
- Minimal example: `$agm-create-prompt requested_by=Billy provider=codex objective="Delegate cancel-order implementation"`

## Execute this contract

1. Run staged elicitation, build one execution SoT per task, and create separate Leader/executor/QA prompts when implementation is delegated.
2. Generation ends in draft; never execute the generated prompt in this operation.

## Load now

- [create-prompt.md](../create-prompt.md) — prompt lifecycle and provider rendering
- [subagents-and-branches.md](../subagents-and-branches.md) — delegation, visibility, and integration
- [model-capability-matrix.yaml](../model-capability-matrix.yaml) — capability-profile routing labels

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
