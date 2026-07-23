# Passive capability catalog

`assets/passive-skill-map.json` is the machine-readable routing source. This file owns the human discipline details. Passive capabilities are not public aliases: they may constrain or advise an operation, but never grant product-write authority, select a write action, or create product files by themselves.

## Goal Rules

The mandatory `goal-rules` capability is owned by [goal-rules.md](goal-rules.md). Every mapped operation loads it before substantive reasoning or product writes.

## Design

- Inspect current behavior and evidence before proposing a design.
- Define actors, entry points, states, transitions, validation, failure/recovery, accessibility where applicable, and measurable acceptance.
- Label current facts separately from proposed behavior and unresolved owner decisions.
- `agm-fe`, `agm-be`, `agm-sql`, and `agm-prompt` may use this discipline automatically.

## Passive FE/BE/refactor test decision

- During analyze, design, create, edit, and refactor, inspect the existing test framework, behavior branches, validation, failure paths, boundaries, and regression risks.
- Record exactly one decision with evidence: `required`, `recommended`, or `not_applicable`.
- Select `required` when the already-authorized implementation changes behavior, data semantics, a public contract, a bug regression, multiple/failure branches, concurrency/security behavior, or a shared component with an existing test harness. Required tests remain inside the existing product-write authority and completion scope.
- Select `recommended` for lower-risk testable work. Explain the behavior and value, then let the requester decide whether to expand scope.
- Select `not_applicable` only with a concrete reason such as documentation-only work or no executable behavior boundary.
- Passive activation never grants write authority. Analyze, review, diagnose, design, SQL explain, and any other product-read-only action may classify/recommend tests but never create them.
- Explicit `action=test`, an unambiguous request to create tests, or a `required` decision inside an already-authorized product-write implementation grants test write intent. If behaviors are already named, create only those; otherwise create the smallest risk-complete set.
- Keep test naming, placement, framework, and public-contract expectations consistent with repository evidence.

## Refactor guard

- Activate only after explicit `action=refactor` or unambiguous refactor intent has selected `agm-fe`, `agm-be`, or `agm-sql`.
- Load [refactor-modes.md](refactor-modes.md), require exactly one mode, and record the logic-preservation boundary before editing.
- If the mode is ambiguous, present all five modes with one recommendation and stop before editing.
- This guard cannot initiate a refactor, convert read intent into write intent, or broaden file scope.

## SQL explain

- Remain product-read-only: do not execute SQL, connect to a database, edit files, format SQL, or create migrations.
- Explain purpose; inputs and outputs/result sets; objects read and written; joins, filters, and business rules; control flow; transactions; error/message behavior; deployment/idempotency; assumptions; risks; and relevant performance concerns.
- Label claims as `FACT` when directly supported by SQL/schema/callers, `INFERENCE` when derived, and `UNKNOWN` when evidence is missing.
- Prefer plain language or compact pseudocode. If modification is requested, route to `agm-sql action=edit`; explain itself never edits.
