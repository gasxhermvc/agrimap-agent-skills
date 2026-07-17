# SQL patterns

## สารบัญ

- [Source priority](#source-priority)
- [Output artifact contract](#output-artifact-contract)
- [Do not invent](#do-not-invent)
- [Table work](#table-work)
- [DDL Standard](#ddl-standard--canonical-format-for-new-table-scripts-owner-approved-2026-07-16)
- [Stored procedure work](#stored-procedure-work)
- [Message collection gate](#message-collection-gate)
- [Golden examples and conflicts](#golden-examples-and-conflicts)
- [SQL verification](#sql-verification)

Classify the task as `sql-table`, `sql-procedure`, or `sql-table-and-procedure`. Inspect current schema, callers, existing objects, data behavior, and deployment conventions before writing SQL.

## Source priority

Use golden AgriMap structure above a neighboring project's structure. Existing projects may contain mixed or accidental conventions and must not silently redefine the shared standard.

1. Owner-approved requirements and decisions for the current task.
2. Active database schema, callers, result sets, relationships, and deployed behavior as compatibility facts. Preserve these unless the owner approves a behavior or data change.
3. This normalized SQL contract plus matching `current` entries under `golden/sql/` for structure, naming, types, comments, and file organization.
4. Neighboring project structure only where the normalized contract and selected golden evidence are silent.
5. `legacy-compatible` golden evidence and general engineering practice.

When project structure conflicts with golden structure, use golden structure for every new artifact and report the mismatch; do not copy the project inconsistency. Never use structural precedence to change an existing deployed data or behavior contract without authority.

## Output artifact contract

Write every new SQL artifact under one domain directory. Treat `sql-table-and-procedure` as task scope, never as permission to bundle objects.

```text
sql/
└── <GROUP_OR_DOMAIN>/
    ├── table/
    │   └── <TABLE>.sql
    ├── procedure/
    │   └── <PROCEDURE>.sql
    └── messages.sql
```

- Use one domain segment such as `UM`, `CONTENT`, or `AUTH_FLOW`. Select the business domain from the feature/golden evidence; do not derive `AUTH_FLOW` as merely `AUTH` by splitting at the first underscore.
- Store exactly one `CREATE TABLE` object in `sql/<GROUP_OR_DOMAIN>/table/<TABLE>.sql`. Match the uppercase filename stem to the table name, for example `sql/UM/table/UM_USER.sql` or `sql/AUTH_FLOW/table/AUTH_FLOW_TRANSACTION.sql`.
- Store exactly one `CREATE|ALTER|CREATE OR ALTER PROCEDURE` object in `sql/<GROUP_OR_DOMAIN>/procedure/<PROCEDURE>.sql`. Match the uppercase filename stem to the procedure name, for example `sql/UM/procedure/UM_USER_I.sql`.
- Store the domain's idempotent message inserts only in lowercase `sql/<GROUP_OR_DOMAIN>/messages.sql`.
- Never combine multiple tables, multiple procedures, or a table and procedure in one file. Never put table/procedure definitions in `messages.sql`.
- List every exact output path before writing. For a modified legacy artifact, preserve its existing path unless the task explicitly authorizes migration; apply this layout to all newly created artifacts.
- Validate created artifacts before handoff:

```text
node <skill-root>/scripts/validate-sql-artifacts.mjs --cwd . --files "sql/UM/table/UM_USER.sql,sql/UM/procedure/UM_USER_I.sql,sql/UM/messages.sql"
```

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

Use the matching golden header, column grouping, constraint sections, extended-property style, and `GO` rhythm. Do not copy a conflicting neighboring-project style into a new artifact. Do not normalize an unrelated existing table merely to make it look newer.

## DDL Standard — canonical format for NEW table scripts (owner-approved 2026-07-16)

กติกานี้คือคำตอบของคำถาม "format ถูกไหม" สำหรับ **สคริปต์ใหม่** ทุกไฟล์ — ใช้สไตล์ modern
(TRY/CATCH + named constraints) ผสม convention ของ AgriMap สคริปต์เก่าสไตล์ SSMS-export
(`USE [AgriMapDB]`, `[nvarchar] (50)`, `WITH (PAD_INDEX...)`) เป็น legacy: อ่านเป็นหลักฐานได้
แต่**ห้ามเขียนเพิ่มด้วยสไตล์นั้น** และห้ามไล่ rewrite ไฟล์เก่าให้เป็นสไตล์ใหม่นอกงานที่สั่ง

### โครงไฟล์ (บังคับเรียงตามนี้)

```sql
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
SET XACT_ABORT ON;
GO

/* header comment: อธิบายหน้าที่ของแต่ละตารางในไฟล์ */

-- [1] schema guard (ถ้า schema อาจยังไม่มี)
IF SCHEMA_ID(N'agrimap_app') IS NULL
    EXEC(N'CREATE SCHEMA [agrimap_app] AUTHORIZATION [dbo];');
GO

-- [2] rerun guard: มีตารางเป้าหมายอยู่แล้ว → หยุด ไม่เขียนทับ
IF OBJECT_ID(N'[agrimap_app].[MY_TABLE]', N'U') IS NOT NULL
    THROW 50000, N'MY_TABLE deployment stopped because the target table already exists.', 1;
GO

-- [3] ทั้งไฟล์อยู่ใน transaction เดียว
BEGIN TRY
    BEGIN TRANSACTION;
    /* CREATE TABLE → defaults → FKs → indexes → extended properties */
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
```

- **ไม่มี `USE <database>`** — deployment เป็นผู้เลือกฐานข้อมูล (default; โปรเจกต์ override ได้ด้วยหลักฐาน)
- type เขียนตัวใหญ่ไม่ใส่วงเล็บเหลี่ยม: `NVARCHAR(200)`, `DATETIME2(7)`, `NUMERIC(38, 0)` — ไม่ใช่สไตล์ bracket ตัวเล็ก `[nvarchar] (200)` แบบ SSMS-export

### คอลัมน์มาตรฐาน AgriMap (จัดกลุ่มพร้อม comment คั่น)

Apply these table-class rules before adding feature columns:

| Table class | Required key | Required display column |
|---|---|---|
| Lookup (`LUT_*`) | `[ID] INT` primary key | `[NAME] NVARCHAR(255)` |
| General | `[ID] NUMERIC(38, 0)` primary key | feature-defined |

`LUT_APP_MESSAGES` is a fixed message registry with `[ID]` and `[DESCR]`; it is not the generic `LUT_*` table template and must not be recreated by a feature script.

Every new business table, including a new lookup table, includes this lifecycle/audit baseline unless the owner approves a recorded exception:

```sql
[DATE_CREATED]   DATETIME2(7) NOT NULL,
[DATE_MODIFIED]  DATETIME2(7) NULL,
[USER_CREATED]   NUMERIC(38, 0) NOT NULL,
[USER_MODIFIED]  NUMERIC(38, 0) NULL,
[DEL_FLAG]       BIT NOT NULL
```

`USER_CREATED` and `USER_MODIFIED` are user identifiers, not timestamps. Their type follows the AgriMap general user key `NUMERIC(38, 0)`.

```sql
CREATE TABLE [agrimap_app].[MY_TABLE]
(
    -- Primary Key
    [ID]              NUMERIC(38, 0) IDENTITY(1, 1) NOT NULL,

    -- Public and Business Keys
    [MY_TABLE_ID]     UNIQUEIDENTIFIER NOT NULL,      -- public key: DF → NEWSEQUENTIALID()

    -- Business Data
    [NAME]            NVARCHAR(500) NULL,

    -- Audit Columns
    [DATE_CREATED]    DATETIME2(7) NOT NULL,           -- DF → SYSUTCDATETIME() (UTC เสมอ)
    [DATE_MODIFIED]   DATETIME2(7) NULL,
    [USER_CREATED]    NUMERIC(38, 0) NOT NULL,
    [USER_MODIFIED]   NUMERIC(38, 0) NULL,

    -- Soft Delete (และ Concurrency เมื่อจำเป็น)
    [DEL_FLAG]        BIT NOT NULL,                    -- DF → (0)
    [ROW_VERSION]     ROWVERSION NOT NULL,             -- เฉพาะตารางที่มี optimistic concurrency

    CONSTRAINT [PK_MY_TABLE] PRIMARY KEY CLUSTERED ([ID] ASC),
    CONSTRAINT [UQ_MY_TABLE_MY_TABLE_ID] UNIQUE NONCLUSTERED ([MY_TABLE_ID] ASC),
    CONSTRAINT [CK_MY_TABLE_NAME_NOT_BLANK] CHECK (LEN(LTRIM(RTRIM([NAME]))) > 0)
) ON [PRIMARY];
```

- ชื่อตาราง/คอลัมน์: `UPPER_SNAKE_CASE` · lifecycle ใช้ชุด `DATE_CREATED / DATE_MODIFIED / USER_CREATED / USER_MODIFIED / DEL_FLAG` และเพิ่ม `DATE_EXPIRED` เมื่อ contract ต้องใช้
- soft delete ใช้ `DEL_FLAG BIT NOT NULL DEFAULT (0)` เสมอ — ไม่ประดิษฐ์ชื่ออื่น

### ชนิดของ ID (กติกาปิด — owner กำหนด 2026-07-16)

surrogate key `[ID]` ใช้ได้ **2 ชนิดเท่านั้น** เลือกตามชนิดตาราง:

| ชนิดตาราง | ID type | หลักฐาน golden |
|---|---|---|
| ตารางหลัก / transaction / ข้อมูลโต (default) | `NUMERIC(38, 0) IDENTITY(1, 1)` | `UM_USER`, `APP_USER_TOKEN` |
| Lookup (`LUT_*`) | `INT IDENTITY(1, 1)` (seed คงที่ใช้ `SET IDENTITY_INSERT` ตอน insert) | `LUT_AUTH_TYPE`, `LUT_NOTI_CHANNEL` |

- ห้ามใช้ `BIGINT`, `SMALLINT`, `UNIQUEIDENTIFIER` หรือชนิดอื่นเป็น surrogate `[ID]` —
  `UNIQUEIDENTIFIER` เป็นได้เฉพาะ **public key** คู่กับ `[ID]` (เช่น `MY_TABLE_ID` ในโครงด้านบน)
- FK ที่ชี้เข้าแต่ละตารางต้องใช้ชนิดตรงกับ `[ID]` ปลายทาง: ชี้ตารางหลัก → `NUMERIC(38, 0)`,
  ชี้ `LUT_*` → `INT` — ห้ามชนิดไม่ตรงกันเด็ดขาด (implicit conversion กิน index)
- ตารางเก่าที่ผิดกติกานี้ (เช่น `CONTENT.sql` ใช้ `INT` ทั้งที่ไม่ใช่ LUT) เป็น legacy —
  ห้ามเลียนแบบ และห้ามแก้ชนิด ID ของตารางเดิมโดยไม่มี owner decision (กระทบ FK ทุกตัวที่ชี้เข้า)

### Constraint ทุกตัวต้องมีชื่อ ตาม prefix นี้ (ห้าม anonymous default เด็ดขาด)

| prefix | ใช้กับ | รูปแบบชื่อ |
|---|---|---|
| `PK_` | primary key | `PK_<TABLE>` |
| `UQ_` | unique constraint | `UQ_<TABLE>_<COLUMN>` |
| `DF_` | default | `DF_<TABLE>_<COLUMN>` — ประกาศผ่าน `ALTER TABLE ... ADD CONSTRAINT` |
| `CK_` | check | `CK_<TABLE>_<MEANING>` |
| `FK_` | foreign key | `FK_<TABLE>_<REF>` — `WITH CHECK` + `CHECK CONSTRAINT` ตามหลังเสมอ |
| `IX_` | nonclustered index | `IX_<TABLE>_<MEANING>` |
| `UX_` | unique filtered index | `UX_<TABLE>_<MEANING>` |

### Index และ FK

- ตารางที่มี `DEL_FLAG`: index สำหรับ lookup ใช้ **filtered index** `WHERE [DEL_FLAG] = 0`
  และ business-key uniqueness ใช้ `UX_` filtered unique (unique เฉพาะแถว active)
- covering index ใส่ `INCLUDE (...)` ตาม query pattern ที่พิสูจน์แล้ว — ไม่หว่าน index ล่วงหน้า
- FK cascade (`ON DELETE/UPDATE CASCADE`) ต้องมีหลักฐาน/owner decision ต่อความสัมพันธ์นั้น
  (ดู conflict matrix) — default คือไม่ cascade

### Extended properties (บังคับ)

ทุกตาราง + ทุกคอลัมน์ business ต้องมี `MS_Description` **ภาษาไทย** ผ่าน
`sys.sp_addextendedproperty` ในไฟล์เดียวกัน

### Detect (ใช้เกรดงาน review)

- `grep -iE "^USE \[" *.sql` ในไฟล์ใหม่ → เจอ = violation
- `grep -E "ADD +DEFAULT" *.sql` (anonymous default ไม่มีชื่อ DF_) → เจอ = violation
- `grep -E "\[(n?var)?char\]\(" *.sql` (type สไตล์ SSMS ในไฟล์ใหม่) → เจอ = violation
- `grep -iE "\[ID\]\s+(BIGINT|SMALLINT|TINYINT|UNIQUEIDENTIFIER)" *.sql` → เจอ = violation (ID ต้องเป็น NUMERIC(38, 0) หรือ INT เฉพาะ LUT)
- ตาราง `LUT_*` ที่ `[ID]` ไม่ใช่ `INT` / ตารางหลักที่ `[ID]` ไม่ใช่ `NUMERIC(38, 0)` → violation
- ไฟล์ใหม่ไม่มี rerun guard / TRY-CATCH transaction / extended properties → violation

## Stored procedure work

Name every procedure by its behavior and keep the filename identical to the object name:

| Suffix | Behavior |
|---|---|
| `_I` | insert/add |
| `_U` | update/edit |
| `_D` | delete or approved soft delete |
| `_Q` | query/read |
| `_CHECK_Q` | validation/existence check without mutation |

Reject an invented suffix for these behaviors. A procedure file contains one procedure only. Use the selected current golden procedure shell for the comment block: object header, `Author`, `Create date`, `Description`, runnable `Data test`, `Modified by`, `Modified date`, and modification `Description`. Preserve complete `PI_*` inputs and `PO_*` outputs required by the active contract.

### Stored procedure section comments

Every new procedure uses compact three-line section comments for control-flow gates and major business steps. Copy the separator exactly, keep the three lines adjacent, and align the block with the statement it describes:

```sql
-- =============================================
-- Begin Transaction
-- =============================================
BEGIN TRANSACTION;

BEGIN TRY
    -- =============================================
    -- Validate required parameters
    -- =============================================
    IF (@PI_SESSION_USER_ID IS NULL)
    BEGIN
        THROW 50001, 'session_user_required', 1;
    END

    -- =============================================
    -- Validate WIDGET_TYPE_ID
    -- =============================================
    IF NOT EXISTS
    (
        SELECT 1
        FROM [agrimap_app].[LUT_DD_WIDGET_TYPE]
        WHERE [ID] = @PI_WIDGET_TYPE_ID
          AND [ACTIVE] = 1
    )
    BEGIN
        THROW 50001, 'invalid_widget_type', 1;
    END

    -- =============================================
    -- Step 1: Insert dashboard widget
    -- =============================================
    INSERT INTO [agrimap_app].[DD_DASHBOARD_WIDGET] (...)
    VALUES (...);

    -- =============================================
    -- Return PO_DATA
    -- =============================================
    SET @PO_DATA = SCOPE_IDENTITY();

    -- =============================================
    -- Commit Transaction
    -- =============================================
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    -- =============================================
    -- Rollback Transaction
    -- =============================================
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
```

Apply these comment gates:

- Group null/blank checks under one `Validate required parameters` section. Do not repeat the section for every parameter in the same contiguous group.
- Open a separate `Validate <PARAMETER_OR_RULE>` section for each lookup, existence, duplicate, permission, state, or business-rule gate. Every numbered `THROW`, such as `THROW 50001`, must belong to the nearest `Validate ...` section. Use `Validate`, not a vague `Check data` or `Validate data` title.
- Mark each major query or mutation phase as `Step <N>: <specific business intent>`. Start at `1`, increase without gaps, and let one step cover adjacent statements that implement the same intent. Do not use a title that merely repeats `INSERT`, `UPDATE`, or `SELECT` without the business purpose.
- Place `Begin Transaction`, `Commit Transaction`, and `Rollback Transaction` immediately before their matching transaction boundary when that boundary exists.
- Place `Return PO_DATA` immediately before assigning or selecting the `@PO_DATA` output. Use the actual `PO_*` name instead when the contract defines a different single output; list multiple output names in one specific `Return ...` title when they are produced together.
- Use ordinary inline comments only for a non-obvious condition or transformation inside a section. Section comments describe intent and flow; they do not narrate every SQL line.

Determine:

- query versus DML behavior;
- exact inputs, outputs, result sets, and message/error contract;
- transaction boundary and concurrency behavior;
- validation, existence, duplicate, and permission behavior explicitly required by the feature;
- current splitter/structured-input convention;
- runnable data test and affected callers.

Preserve the local `TRY/CATCH`, output, audit, and transaction pattern. Do not choose cursor, `STRING_SPLIT`, custom splitter, TVP, or JSON solely from a legacy example; choose from the active contract and owner trade-off.

## Message collection gate

Run this gate after creating or changing `sql-table`, `sql-procedure`, or `sql-table-and-procedure`, and after a no-logic-change SQL refactor. Use exactly `sql/<GROUP_OR_DOMAIN>/messages.sql` as the reviewable feature/deployment artifact. Store every generated message in `[agrimap_app].[LUT_APP_MESSAGES] ([ID], [DESCR])`.

1. Locate or create the domain `messages.sql`. Do not create alternate `MESSAGE.sql`, `messages.txt`, per-procedure message files, or a project-specific dictionary shape.
2. Inventory every user-facing code emitted, returned, mapped, or forwarded by the touched SQL and its in-scope BE caller. Include project-specific equivalents of `THROW 50001, '<error_code>', 1`; do not limit the scan to that syntax.
3. Reconcile by exact code and business meaning before writing:
   - same code + same meaning: reuse the existing entry and do not add another insert;
   - same code + different or ambiguous meaning: stop that entry as an owner conflict; never overwrite it silently;
   - new code: add one clear user-facing definition and one rerunnable insert guarded by `IF NOT EXISTS` against the same ID, for example:

```sql
IF NOT EXISTS
(
    SELECT 1
    FROM [agrimap_app].[LUT_APP_MESSAGES]
    WHERE [ID] = 'user_not_found'
)
BEGIN
    INSERT INTO [agrimap_app].[LUT_APP_MESSAGES] ([ID], [DESCR])
    VALUES ('user_not_found', N'ไม่พบข้อมูลผู้ใช้งานที่ต้องการ');
END;
GO
```

   The guard and insert must use the same literal `[ID]`, so rerunning `messages.sql` never fails on an existing message.
4. Keep database exception text, stack traces, SQL text, and other technical diagnostics in logs/telemetry. Do not expose or store them as the user-facing dictionary description.
5. For table-only work, report the inventory even when it is empty. Record `no message changes` rather than inventing validation or business errors that the table does not emit.
6. Before handoff, report the message artifact path, codes found, entries reused, entries added, conflicts, and duplicate/idempotency check. If a user-facing code exists but the dictionary contract cannot be proven, the feature is incomplete: obtain the missing project evidence instead of generating a guessed insert.

For `readability-organization` and `strict-preserve-logic`, collection is contract reconciliation only. Preserve existing code identifiers, throw sites, conditions, ordering, result sets, transactions, side effects, and error mapping. A missing dictionary entry may be added to the companion message artifact under this owner-approved gate; it must not be used as a reason to change the SQL procedure or table behavior.

## Golden examples and conflicts

The SQL collection manifest covers every file under `golden/sql/`. It intentionally mixes current AgriMap schema/deployment references, one curated idempotent message example, and immutable legacy-compatible evidence. Read `golden/sql/manifest.json` before selecting an entry. Use the normalized contract in this file plus a matching `current` entry above neighboring project structure.

Read [conflict-resolution.md](conflict-resolution.md) before using them. Legacy entries contain competing styles and business semantics, including default constraints, splitter/cursor choices, cascade actions, fixed seed IDs, duplicate index candidates, and replace-all role/permission updates. Current entries and this normalized contract override project structure for new artifacts; active schema, callers, and deployed behavior remain compatibility facts. Never copy business semantics from an example without project evidence and, where logical/data behavior changes, owner approval.

For release evaluation after changing this SQL discipline or its golden guidance, run [sql-scenarios.md](../evals/sql-scenarios.md). Do not load the eval catalog during ordinary SQL work.

## SQL verification

Run `validate-sql-artifacts.mjs` on every created SQL artifact. Then use parse/build validation when available, inspect dependencies, validate object/result contracts, test representative and failure inputs, check transaction rollback, and measure execution plans/data volume for performance work.
