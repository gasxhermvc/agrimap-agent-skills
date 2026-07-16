# Compact operation entrypoint: agm-exec

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `execute`
- Mode: `product-write`
- Purpose: Execute one decision-owner-approved generated prompt as the execution source of truth with checkpoints, deviation stops, and a Result Package.
- Deliverable: integrated Result Package awaiting independent QA

## Inputs and help

- Required: approved prompt path or resumable task_id.
- Conditional: decision-owner choice when a material deviation exceeds the approved prompt.
- Minimal example: `$agm-exec requested_by=Billy prompt=.agrimap-agent/prompts/<task-id>/executor.prompt.md`

## Execute this contract

1. Require prompt_status=owner-approved and execute its ordered steps as the task source of truth.
2. Stop and report structured deviation evidence when a material change exceeds scope; return the Result Package and integration artifact.

## Load now

- [create-prompt.md](../create-prompt.md) — prompt SoT and deviation contract
- [subagents-and-branches.md](../subagents-and-branches.md) — native activity, workspace, and integration contract
- [qa-and-done.md](../qa-and-done.md) — handoff into independent QA and completion

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it.

Do not read the umbrella `SKILL.md` during a normal alias invocation. Use it only when this generated entrypoint is missing/corrupt or the requester directly invoked the umbrella with an unknown operation.
