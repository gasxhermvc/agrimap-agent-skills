# Compact operation entrypoint: agm-be

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `be`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `action-routed`
- Purpose: Analyze, design, create, edit, or explicitly test backend work through one domain façade.
- Deliverable: action-specific backend analysis, design, bounded implementation, or selected tests

## Action gate

Resolve exactly one action from an explicit `action=<name>` or unambiguous natural-language intent before target inspection or product writes. Passive activation supplies analysis only and never grants product-write authority.

| Action | Mode | Activation | Allowed depth | Purpose |
| --- | --- | --- | --- | --- |
| `analyze` | `product-read-only` | `explicit-or-passive` | `light`, `standard`, `regulated` | Inspect backend scope, contracts, callers, data, risks, and trade-offs without editing |
| `design` | `product-read-only` | `explicit-or-passive` | `light`, `standard`, `regulated` | Define backend boundaries, flow, validation, failure behavior, and acceptance without editing |
| `create` | `product-write` | `explicit` | `light` | Create a bounded new backend slice |
| `edit` | `product-write` | `explicit` | `light` | Modify a bounded existing backend slice |
| `test` | `product-write` | `explicit` | `light` | Create explicitly requested or selected backend tests after passive test advice |

## Inputs and help

- Required: one action or unambiguous natural-language intent; an objective or pointed backend target.
- Conditional: target_kind, backend_profile, and phase when repository evidence cannot resolve them; requester selection when passive test advice finds unspecified coverage.
- Minimal example: `$agm-be action=create target_kind=be-main backend_profile=agmws objective="Add cancel-order endpoint"`

## Execute this contract

1. Resolve exactly one action before inspection. Explicit action= wins; otherwise infer only from unambiguous verbs and report the resolved action. Ask one short question when create versus edit or read versus write remains ambiguous.
2. For analyze/design, never edit product files. For create/edit/test, show the bounded slice, stay within light limits, and route broader work to agm-create-prompt before any product write.
3. Run the passive test advisor during analyze, design, create, and edit. Suggest prioritized coverage but never create tests unless action=test or the requester explicitly asked to create tests.

## Load now

- [passive-capabilities.md](../passive-capabilities.md) — passive design and test-advisor boundaries
- [elicitation.md](../elicitation.md) — action, scope, and propose-first resolution
- [backend-engineer.md](../backend-engineer.md) — backend phase and profile discipline
- [patterns/backend.md](../patterns/backend.md) — current backend contract

## Load only when the condition matches

- When the backend target contains C#: [patterns/csharp.md](../patterns/csharp.md) — project-wide C# baseline
- When the target reads cookie, header, query, form, JSON body, or device ID: [patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md](../patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md) — request-value behavior and compatibility

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
