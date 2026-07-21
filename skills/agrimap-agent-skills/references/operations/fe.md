# Compact operation entrypoint: agm-fe

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `fe`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `action-routed`
- Purpose: Analyze, design, create, edit, or explicitly test frontend work through one domain façade.
- Deliverable: action-specific frontend analysis, design, bounded implementation, or selected tests

## Action gate

Resolve exactly one action from an explicit `action=<name>` or unambiguous natural-language intent before target inspection or product writes. Passive activation supplies analysis only and never grants product-write authority.

| Action | Mode | Activation | Allowed depth | Purpose |
| --- | --- | --- | --- | --- |
| `analyze` | `product-read-only` | `explicit-or-passive` | `light`, `standard`, `regulated` | Inspect frontend scope, behavior, callers, risks, and trade-offs without editing |
| `design` | `product-read-only` | `explicit-or-passive` | `light`, `standard`, `regulated` | Define frontend flow, states, accessibility, validation, and acceptance without editing |
| `create` | `product-write` | `explicit` | `light` | Create a bounded new frontend slice |
| `edit` | `product-write` | `explicit` | `light` | Modify a bounded existing frontend slice |
| `test` | `product-write` | `explicit` | `light` | Create explicitly requested or selected frontend tests after passive test advice |

## Inputs and help

- Required: one action or unambiguous natural-language intent; an objective or pointed frontend target.
- Conditional: phase and target_kind when repository evidence cannot resolve them; requester selection when passive test advice finds unspecified coverage.
- Minimal example: `$agm-fe action=edit target_files=src/order.component.ts objective="Handle the empty state"`

## Execute this contract

1. Resolve exactly one action before inspection. Explicit action= wins; otherwise infer only from unambiguous verbs and report the resolved action. Ask one short question when create versus edit or read versus write remains ambiguous.
2. For analyze/design, never edit product files. For create/edit/test, show the bounded slice, stay within light limits, and route broader work to agm-create-prompt before any product write.
3. Run the passive test advisor during analyze, design, create, and edit. Suggest prioritized coverage but never create tests unless action=test or the requester explicitly asked to create tests.

## Load now

- [passive-capabilities.md](../passive-capabilities.md) — passive design and test-advisor boundaries
- [elicitation.md](../elicitation.md) — action, scope, and propose-first resolution
- [frontend-engineer.md](../frontend-engineer.md) — frontend phase discipline
- [patterns/frontend.md](../patterns/frontend.md) — current frontend contract

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when lifecycle-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
