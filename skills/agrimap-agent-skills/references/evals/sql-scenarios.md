# SQL Scenario Evals

Run these scenarios on the same clean fixture with Claude, Codex, and Gemini after changing `patterns/sql.md`, SQL golden status, or SQL generation routing. Grade paths and SQL structure with `validate-sql-artifacts.mjs`; do not use model judgment for deterministic assertions.

## S1 — Golden structure wins over a mixed project

**Situation:** A repository stores old scripts together under `Database/Scripts/`, mixes `INT` and `BIGINT` general keys, and has no stable procedure suffix convention.

**Prompt:** "Create the UM user table, insert procedure, and user-not-found message."

- **[HARD]** Output is `sql/UM/table/UM_USER.sql`, `sql/UM/procedure/UM_USER_I.sql`, and `sql/UM/messages.sql`.
- **[HARD]** No new artifact is written under `Database/Scripts/`.
- **[HARD]** `UM_USER` key is `NUMERIC(38, 0)` and all lifecycle/audit fields match the normalized golden contract.
- **[RUBRIC]** The result identifies the old project layout as conflicting structural evidence without changing its existing files.

**Anti-pattern:** Follow the nearest mixed project script because it already exists.

## S2 — One object per file

**Situation:** A feature needs `AUTH_FLOW`, `AUTH_FLOW_TRANSACTION`, `AUTH_FLOW_I`, and `AUTH_FLOW_TRANSACTION_Q`.

**Prompt:** "Create the auth-flow SQL slice."

- **[HARD]** Exactly four object files are created under `sql/AUTH_FLOW/table|procedure/`.
- **[HARD]** Every table/procedure file contains exactly one top-level object and its filename matches that object.
- **[HARD]** `sql-table-and-procedure` is not rendered as a combined deployment file.
- **[RUBRIC]** The output manifest lists every path before writing.

**Anti-pattern:** Create one `AUTH_FLOW.sql` containing all four objects.

## S3 — Lookup and general table types

**Situation:** The domain needs `LUT_USER_STATUS` and `UM_USER_PROFILE`.

**Prompt:** "Create both tables using AgriMap fundamentals."

- **[HARD]** `LUT_USER_STATUS` declares `[ID] INT` and `[NAME] NVARCHAR(255)`.
- **[HARD]** `UM_USER_PROFILE` declares `[ID] NUMERIC(38, 0)`.
- **[HARD]** Both tables declare `DATE_CREATED`, `DATE_MODIFIED`, `USER_CREATED`, `USER_MODIFIED`, and `DEL_FLAG` with the normalized types/nullability.
- **[RUBRIC]** `LUT_APP_MESSAGES` is treated as a fixed registry exception, not copied as the generic lookup shape.

**Anti-pattern:** Use one universal ID type or copy a neighboring project's audit types.

## S4 — Idempotent domain messages

**Situation:** `UM_USER_I` emits `username_required` and `username_duplicate`.

**Prompt:** "Add the user-facing SQL messages."

- **[HARD]** Entries are written only to `sql/UM/messages.sql`.
- **[HARD]** Every entry inserts into `[agrimap_app].[LUT_APP_MESSAGES] ([ID], [DESCR])`.
- **[HARD]** Every insert has a preceding `IF NOT EXISTS` guard on the same literal ID.
- **[RUBRIC]** Existing same-ID/same-meaning entries are reused; conflicting meanings are stopped for an owner decision.

**Anti-pattern:** Create `MESSAGE.sql`, `messages.txt`, or an unguarded insert.

## S5 — Procedure behavior suffix

**Situation:** The feature needs add, edit, delete, query, and duplicate-check procedures for `CONTENT`.

**Prompt:** "Create the CONTENT stored procedures."

- **[HARD]** Names end in `_I`, `_U`, `_D`, `_Q`, and `_CHECK_Q` respectively.
- **[HARD]** Each uppercase filename stem equals the stored procedure object name.
- **[HARD]** Every procedure file contains one procedure and preserves required `PI_*`/`PO_*` parameters.
- **[RUBRIC]** The golden procedure comment shell includes a runnable data-test section.

**Anti-pattern:** Invent `_SAVE`, `_GET`, `_DEL`, or combine procedure variants in one file.

## S6 — Procedure flow comments

**Situation:** A new insert procedure validates required parameters and a lookup, writes two related records in a transaction, and returns `@PO_DATA`.

**Prompt:** "Create the procedure with AgriMap comments so a reviewer can scan every gate and business step."

- **[HARD]** Every section uses the compact three-line `-- =============================================` block.
- **[HARD]** Required inputs share `Validate required parameters`; the lookup has its own specific `Validate <PARAMETER_OR_RULE>` section; every numbered `THROW` belongs to a `Validate ...` section.
- **[HARD]** Transaction statements have matching `Begin Transaction`, `Commit Transaction`, and `Rollback Transaction` sections.
- **[HARD]** Business phases use sequential `Step 1: <specific intent>` labels, and the output assignment has `Return PO_DATA`.
- **[RUBRIC]** Inline comments explain only non-obvious rules or transformations instead of narrating every SQL line.

**Anti-pattern:** Use vague headings such as `Check data`, omit the return/transaction sections, or place blank lines inside the three-line section block.

## Release gate

- All HARD assertions pass on every provider run.
- Run each provider at least three times from a clean fixture.
- Any path, filename, object-count, key/audit type, suffix, or message-guard failure blocks release.
