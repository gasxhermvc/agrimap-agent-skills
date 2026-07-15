# SQL patterns

Classify the task as `sql-table`, `sql-procedure`, or `sql-table-and-procedure`. Inspect current schema, callers, existing objects, data behavior, and deployment conventions before writing SQL.

## Source priority

1. Existing target database project and neighboring objects.
2. Owner-approved behavior and relationships.
3. Verified project-specific AgriMap pattern.
4. Golden SQL entries under `golden/sql/`, using each entry's manifest status and evidence mode.

## Do not invent

Do not infer foreign keys, cascade actions, uniqueness, indexes, seed values, delete/replace/upsert semantics, permissions, paging/sorting rules, or message behavior without evidence. Present the material options and trade-offs to the owner.

## Table work

Determine:

- database/schema/object name;
- surrogate and business keys;
- column meaning, type, nullability, and default behavior;
- audit and soft-delete behavior;
- proven relationships and constraints;
- known query patterns before indexes;
- deployment order and rollback;
- whether seed data is truly defined.

Follow the local script header, column grouping, constraint sections, extended-property style, and `GO` rhythm. Do not normalize an existing table script merely to make it look newer.

## Stored procedure work

Determine:

- query versus DML behavior;
- exact inputs, outputs, result sets, and message/error contract;
- transaction boundary and concurrency behavior;
- validation, existence, duplicate, and permission behavior explicitly required by the feature;
- current splitter/structured-input convention;
- runnable data test and affected callers.

Preserve the local `TRY/CATCH`, output, audit, and transaction pattern. Do not choose cursor, `STRING_SPLIT`, custom splitter, TVP, or JSON solely from a legacy example; choose from the active contract and owner trade-off.

## Message collection gate

Run this gate after creating or changing `sql-table`, `sql-procedure`, or `sql-table-and-procedure`, and after a no-logic-change SQL refactor. A `messages.txt`-style artifact means one reviewable feature/deployment artifact that lists each error code, its user-facing meaning, and the idempotent insert required by the active project. It does not mean every project uses the golden table or column names.

1. Locate the active project's message artifact and dictionary contract from repository/deployment evidence. Reuse `messages.txt` when that is the local convention; otherwise use the proven equivalent. Never infer `[LUT_APP_MESSAGES]`, `[MESSAGE]`, `[SYS_ERROR_CODE]`, column names, schema, module fields, or language from golden evidence alone.
2. Inventory every user-facing code emitted, returned, mapped, or forwarded by the touched SQL and its in-scope BE caller. Include project-specific equivalents of `THROW 50001, '<error_code>', 1`; do not limit the scan to that syntax.
3. Reconcile by exact code and business meaning before writing:
   - same code + same meaning: reuse the existing entry and do not add another insert;
   - same code + different or ambiguous meaning: stop that entry as an owner conflict; never overwrite it silently;
   - new code: add one clear user-facing definition in the active project language and one rerunnable/idempotent insert that matches the proven dictionary schema and deployment style.
4. Keep database exception text, stack traces, SQL text, and other technical diagnostics in logs/telemetry. Do not expose or store them as the user-facing dictionary description.
5. For table-only work, report the inventory even when it is empty. Record `no message changes` rather than inventing validation or business errors that the table does not emit.
6. Before handoff, report the message artifact path, codes found, entries reused, entries added, conflicts, and duplicate/idempotency check. If a user-facing code exists but the dictionary contract cannot be proven, the feature is incomplete: obtain the missing project evidence instead of generating a guessed insert.

For `readability-organization` and `strict-preserve-logic`, collection is contract reconciliation only. Preserve existing code identifiers, throw sites, conditions, ordering, result sets, transactions, side effects, and error mapping. A missing dictionary entry may be added to the companion message artifact under this owner-approved gate; it must not be used as a reason to change the SQL procedure or table behavior.

## Golden examples and conflicts

The SQL collection manifest covers every file under `golden/sql/`. It intentionally mixes current AgriMap schema/deployment references, one curated idempotent message example, and immutable legacy-compatible evidence. Read `golden/sql/manifest.json` before selecting an entry.

Read [conflict-resolution.md](conflict-resolution.md) before using them. Legacy entries contain competing styles and business semantics, including default constraints, splitter/cursor choices, cascade actions, fixed seed IDs, duplicate index candidates, and replace-all role/permission updates. Current entries prove only their recorded AgriMap object shape; they do not override the active database reference. Do not promote a project-specific variant without current-project evidence and, where logical/data behavior changes, owner approval.

## SQL verification

Use parse/build validation when available, inspect dependencies, validate object/result contracts, test representative and failure inputs, check transaction rollback, and measure execution plans/data volume for performance work.
