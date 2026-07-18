# Compact operation entrypoint: agm-design

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `design`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `product-read-only`
- Purpose: Design a user flow, behavior, and acceptance criteria.
- Deliverable: direct design at light; tracked design artifact only at standard/regulated

## Inputs and help

- Required: objective.
- Conditional: target_kind when FE/BE placement remains ambiguous; phase for FE/BE work when repository evidence cannot resolve it.
- Minimal example: `$agm-design depth=light target_kind=fe-main objective="Design empty/loading/error states"`

## Execute this contract

1. Define actors, entry points, states, transitions, validation, failure/recovery, accessibility, and measurable acceptance.
2. Use the target discipline selected by the conditional routing below; do not implement.

## Load now

- [analysis-discipline.md](../analysis-discipline.md) — facts versus proposed design
- [input-and-scope.md](../input-and-scope.md) — design reference coverage

## Load only when the condition matches

- When target_kind is fe-main or fe-library: [frontend-engineer.md](../frontend-engineer.md) — frontend design discipline
- When target_kind is be-main or be-library: [backend-engineer.md](../backend-engineer.md) — backend boundary discipline
- When the backend design contains C#: [patterns/csharp.md](../patterns/csharp.md) — project-wide C# contract and boundary examples
- When the backend design includes cookie, header, query, form, JSON body, or device-ID resolution: [patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md](../patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md) — request-value resolution contract

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
