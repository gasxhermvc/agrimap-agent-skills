# SQL patterns

Classify the task as `sql-table`, `sql-procedure`, or `sql-table-and-procedure`. Inspect current schema, callers, existing objects, data behavior, and deployment conventions before writing SQL.

## Source priority

1. Existing target database project and neighboring objects.
2. Owner-approved behavior and relationships.
3. Verified project-specific AgriMap pattern.
4. Immutable golden files under `golden/sql/` as legacy compatibility evidence.

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

## Message dictionary

Every added business error code must be mapped through the active project's message artifact. Keep user-facing messages separate from technical diagnostics. Inspect whether the project uses a readable dictionary, idempotent insert script, or both.

## Golden examples and conflicts

Ten raw files under `golden/sql/` are byte-for-byte copies with SHA-256 entries in `golden/manifest.json`.

Read [conflict-resolution.md](conflict-resolution.md) before using them. The legacy set contains competing styles and business semantics, including default constraints, splitter/cursor choices, cascade actions, fixed seed IDs, duplicate index candidates, and replace-all role/permission updates. Preserve the files but do not promote one variant without current-project evidence and, where logical/data behavior changes, owner approval.

## SQL verification

Use parse/build validation when available, inspect dependencies, validate object/result contracts, test representative and failure inputs, check transaction rollback, and measure execution plans/data volume for performance work.
