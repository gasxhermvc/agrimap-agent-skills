# SQL patterns

## สารบัญ

- [Source priority](#source-priority)
- [Do not invent](#do-not-invent)
- [Table work](#table-work)
- [DDL Standard](#ddl-standard--canonical-format-for-new-table-scripts-owner-approved-2026-07-16)
- [Stored procedure work](#stored-procedure-work)
- [Message collection gate](#message-collection-gate)
- [Golden examples and conflicts](#golden-examples-and-conflicts)
- [SQL verification](#sql-verification)

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
    [USER_MODIFIED]   NVARCHAR(50) NULL,               -- เมื่อระบบต้องรู้ผู้แก้

    -- Soft Delete (และ Concurrency เมื่อจำเป็น)
    [DEL_FLAG]        BIT NOT NULL,                    -- DF → (0)
    [ROW_VERSION]     ROWVERSION NOT NULL,             -- เฉพาะตารางที่มี optimistic concurrency

    CONSTRAINT [PK_MY_TABLE] PRIMARY KEY CLUSTERED ([ID] ASC),
    CONSTRAINT [UQ_MY_TABLE_MY_TABLE_ID] UNIQUE NONCLUSTERED ([MY_TABLE_ID] ASC),
    CONSTRAINT [CK_MY_TABLE_NAME_NOT_BLANK] CHECK (LEN(LTRIM(RTRIM([NAME]))) > 0)
) ON [PRIMARY];
```

- ชื่อตาราง/คอลัมน์: `UPPER_SNAKE_CASE` · lifecycle ใช้ชุด `DATE_CREATED / DATE_MODIFIED / DATE_EXPIRED`
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

ตัวอย่างเต็มที่ถูกต้องตามมาตรฐานนี้: งานจริง `APP_STATE.sql` (task
`20260715204535-sql-server-ddl-app-state`) — สร้าง 4 ตารางด้วยโครงนี้ครบทุกข้อ

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
