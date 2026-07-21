# Passive domain capabilities

Passive capabilities are composable reasoning disciplines, not standalone write operations. They may activate inside a domain action or `agm-create-prompt`, but they never grant product-write authority, select a write action, or create product files by themselves.

## Design

- Inspect current behavior and evidence before proposing a design.
- Define actors, entry points, states, transitions, validation, failure/recovery, accessibility where applicable, and measurable acceptance.
- Label current facts separately from proposed behavior and unresolved owner decisions.
- `agm-fe`, `agm-be`, `agm-sql`, and `agm-create-prompt` may use this discipline automatically.

## FE/BE test advisor

- During analyze, design, create, and edit, inspect the existing test framework, behavior branches, validation, failure paths, boundaries, and regression risks.
- Return a short prioritized proposal with the behavior and reason for each useful test. Do not create tests from passive activation.
- Explicit `action=test` or an unambiguous request to create tests grants the write intent. If behaviors are already named, create only those; otherwise propose a numbered list and create only the selected entries.
- Keep test naming, placement, framework, and public-contract expectations consistent with repository evidence.

## SQL explain

- Remain product-read-only: do not execute SQL, connect to a database, edit files, format SQL, or create migrations.
- Explain purpose; inputs and outputs/result sets; objects read and written; joins, filters, and business rules; control flow; transactions; error/message behavior; deployment/idempotency; assumptions; risks; and relevant performance concerns.
- Label claims as `FACT` when directly supported by SQL/schema/callers, `INFERENCE` when derived, and `UNKNOWN` when evidence is missing.
- Prefer plain language or compact pseudocode. If modification is requested, route to `agm-sql action=edit`; explain itself never edits.
