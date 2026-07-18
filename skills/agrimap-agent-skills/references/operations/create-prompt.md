# Compact operation entrypoint: agm-create-prompt

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `create-prompt`
- Workflow depth: default `regulated`; allowed `regulated`
- Mode: `workflow-write-only`
- Purpose: Create provider-specific Leader, executor, and QA prompts.
- Deliverable: tracked brief.md and acceptance checklist.md plus .agrimap-agent/prompts/<task-id>/<role>.prompt.md; no implementation, qa.md, or result.md

## Inputs and help

- Required: objective; provider.
- Conditional: target_kind/backend_profile for target-specific work; decision-owner approval before execution.
- Minimal example: `$agm-create-prompt requested_by=Billy provider=codex objective="Delegate cancel-order implementation"`

## Execute this contract

1. Own the tracked feature contract: run staged elicitation, write the approved brief.md and acceptance checklist.md, build one execution SoT per task, and create separate Leader/executor/QA prompts when implementation is delegated.
2. Generation ends in draft and a non-terminal scope-decision checkpoint; never execute the generated prompt, create qa.md, create result.md, or complete the implementation task in this operation.

## Load now

- [create-prompt.md](../create-prompt.md) — prompt lifecycle and provider rendering
- [subagents-and-branches.md](../subagents-and-branches.md) — delegation, visibility, and integration
- [model-capability-matrix.yaml](../model-capability-matrix.yaml) — capability-profile routing labels

## Load only when the condition matches

- When target_kind is fe-main or fe-library: [frontend-engineer.md](../frontend-engineer.md) — frontend fundamentals that every generated handoff must carry
- When target_kind is be-main or be-library: [backend-engineer.md](../backend-engineer.md) — backend fundamentals that every generated handoff must carry
- When the backend handoff contains C#: [patterns/csharp.md](../patterns/csharp.md) — project-wide C# rules that every generated handoff must carry
- When the backend handoff touches cookie, header, query, form, JSON body, or device-ID resolution: [patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md](../patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md) — request-value rules that every generated handoff must carry
- When target_kind is sql-table, sql-procedure, or sql-table-and-procedure: [patterns/sql.md](../patterns/sql.md) — SQL fundamentals that every generated handoff must carry

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
