# Compact operation entrypoint: agm-sql

<!-- Generated from config/operations.json. Do not edit directly. -->

- Operation: `sql`
- Workflow depth: default `light`; allowed `light`, `standard`, `regulated`
- Mode: `action-routed`
- Purpose: Analyze, design, create, edit, or explain SQL work through one domain façade.
- Deliverable: action-specific SQL analysis, design, explanation, or bounded SQL implementation

## Action gate

Resolve exactly one action from an explicit `action=<name>` or unambiguous natural-language intent before target inspection or product writes. Passive activation supplies analysis only and never grants product-write authority.

| Action | Mode | Activation | Allowed depth | Purpose |
| --- | --- | --- | --- | --- |
| `analyze` | `product-read-only` | `explicit-or-passive` | `light`, `standard`, `regulated` | Inspect SQL scope, schema, callers, contracts, risks, and trade-offs without editing |
| `design` | `product-read-only` | `explicit-or-passive` | `light`, `standard`, `regulated` | Define SQL objects, data flow, result and error contracts, deployment, and acceptance without editing |
| `create` | `product-write` | `explicit` | `light` | Create a bounded new SQL object or slice |
| `edit` | `product-write` | `explicit` | `light` | Modify a bounded existing SQL object or slice |
| `explain` | `product-read-only` | `explicit-or-passive` | `light`, `standard`, `regulated` | Explain SQL purpose, contracts, reads/writes, flow, transactions, errors, assumptions, and risks without execution or edits |

## Inputs and help

- Required: one action or unambiguous natural-language intent; an objective or pointed SQL target.
- Conditional: target_kind when table/procedure placement cannot be resolved; owner evidence for persisted-data or contract decisions.
- Minimal example: `$agm-sql action=explain target_files=sql/ORDER/ORDER_Q.sql`

## Execute this contract

1. Resolve exactly one action before inspection. Explicit action= wins; otherwise infer only from unambiguous verbs and report the resolved action. Ask one short question when create versus edit or read versus write remains ambiguous.
2. For analyze/design/explain, never execute SQL, connect to a database, or edit product files. Explain uses FACT, INFERENCE, and UNKNOWN and routes requested modifications to edit.
3. For create/edit, show the bounded slice, stay within light limits, load applicable schema/caller evidence, and route broader work to agm-create-prompt before any product write.

## Load now

- [passive-capabilities.md](../passive-capabilities.md) — passive design and SQL explain boundaries
- [elicitation.md](../elicitation.md) — action and scope resolution
- [patterns/sql.md](../patterns/sql.md) — current SQL contract, formatting, and validation

## Load only when the condition matches

- No additional conditional reference by default; select one target pattern only when lifecycle-core routing requires it.

Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.
