# QA and done contract

## สารบัญ

- [QA verification scope](#qa-verification-scope--inspect-find-report-nothing-else)
- [QA depth modes](#qa-depth-modes--fast-default--full)
- [QA sequence](#qa-sequence)
- [QA status](#qa-status)
- [Leader after QA](#leader-after-qa)
- [Completion gate](#completion-gate)
- [Final result fields](#final-result-fields)

## QA verification scope — inspect, find, report; nothing else

**What QA reviews (the whole scope, per task relevance):**

- scope/checklist reconciliation against the owner objective and approved trade-offs;
- pattern conformance of changed artifacts via the scope's Detect gates;
- correctness of the changed path and its declared behavior;
- contracts (routes, DTOs, public APIs, stored-procedure/result shapes, message codes);
- nearby regression surface, callers/consumers, DI/registration, generated-code boundary;
- build/static/parse health proportional to the change;
- required companion artifacts (tests, README/Playground, message artifact, reuse index).

**Allowed actions (read/observe only):**

- open and read files, diffs, manifests, and task artifacts;
- run Detect greps, parse/static validation, typecheck, lint;
- run the project's **existing non-mutating** build/test commands proportional to the change.

**Forbidden actions — no exception, even to "prove" a finding:**

- editing, creating, or deleting any project file (source, tests, SQL, config, docs);
- deploying or executing anything with side effects: creating/altering databases (including disposable/LocalDB), running servers, publishing packages, calling external services;
- installing dependencies, regenerating code, or any git mutation;
- fixing, working around, or partially remediating a finding.

QA's entire output is its report: findings with severity, file/line, evidence, and impact, written to the task's `qa.md` plus the returned status. Found a problem → record it and return `failed`; cannot verify without a forbidden action → return `blocked` naming the missing evidence — never perform the forbidden action to unblock yourself.

## QA depth modes — `fast` (default) / `full`

รัน test จริงเป็นช่วง ๆ ก็พอ (owner decision 2026-07-16) — ไม่ใช่ทุกรอบ:

| mode | ทำอะไร | เมื่อไร |
|---|---|---|
| `fast` (**default**) | pattern Detect gates + parse/typecheck/lint + เปิด diff ตรวจ requirement/contract — **ไม่รัน test suite, ไม่ build เต็ม** | ทุกงานระหว่าง iterate |
| `full` | ทุกอย่างใน `fast` + build + test suite ที่เกี่ยวข้อง (proportional, non-mutating เช่นเดิม) | ตาม trigger ด้านล่าง |

**Escalate เป็น `full` เมื่อข้อใดข้อหนึ่งจริง:**

- งานกำลังปิดเข้า commit / publish / release boundary (ด่านสุดท้ายก่อนของออกจากมือ);
- การเปลี่ยนแตะ public contract, data behavior, generated-code regeneration, หรือ migration;
- QA รอบก่อนของงานเดียวกันคืน `failed` (retest ต้องเต็ม);
- มี `fast` ผ่านติดกันหลายงานบนพื้นที่โค้ดเดียวกันโดยยังไม่เคยรัน `full` เลย — อย่าปล่อยให้ test ไม่ถูกรันจนถึงวันปล่อยของ;
- owner สั่ง `qa_mode=full` เอง

กติกาคงเดิมทุกข้อ: `fast` ไม่ลดรั้ว read-only, ไม่ลดมิติที่ตรวจ (pattern conformance ยังบังคับ),
และ `qa.md` ต้องระบุ mode ที่ใช้ + เหตุผล เสมอ เพื่อให้ history เห็นว่ารอบไหนตรวจลึกแค่ไหน
`fast` ที่ `passed` ปิด task ได้ตามปกติ แต่ **commit/publish boundary ต้องมี `full` ที่ `passed`
ครอบพื้นที่นั้นอย่างน้อยหนึ่งครั้ง** ก่อนของออกจริง

## QA sequence

1. Use an independent read-only QA subagent/context that did not write the implementation. Give it no file ownership and no instruction to fix findings.
2. Re-read the owner objective, approved trade-offs, execution prompt SoT, and pre-work checklist.
3. **Load the same scope discipline the implementation was required to use** — the routing pattern file for the scope (`patterns/sql.md` / `frontend.md` / `backend.md`) and the specific golden/manifest entries it selects, following the umbrella read-economy rule. Pattern conformance is a required QA dimension: run the pattern's Detect gates (grep checks) against the changed artifacts and record each result. QA that judges FE/BE/SQL output without a named loaded pattern file is invalid, exactly as it is for the implementer.
4. Treat the executor Result Package as testimony. Reopen the actual diff/files and verify the stated symbols and behavior.
5. Map every requirement to observed evidence.
6. Independently select and rerun one or two material verification claims when available, including one primary-path check and one risk-focused check proportional to the change — within the allowed actions of the Verification scope only. **Verification depth is proportional (owner decision 2026-07-16):** for SQL DDL/procedure work, pattern-conformance Detect gates plus parse/static-level validation are the sufficient evidence; deploying to any database (including disposable/LocalDB) is never QA's action. When data-behavior risk or an owner request requires live-execution evidence, the executor/Leader produces it during implementation verification and QA inspects the recorded results — QA that cannot verify without a forbidden action returns `blocked`.
7. Test the primary path and affected failure paths.
8. Check nearby callers, contracts, data, build/static health, and regression surface.
9. Verify generated files, DI/registration, README/Playground, scheduler, and message artifacts when applicable. For SQL/BE error-code scope, reconcile emitted/mapped/forwarded codes against the active `messages.txt`-style artifact and verify duplicate handling plus idempotent inserts. QA evidence must name the artifact path and list codes found, reused, added, and conflicted. Accept an empty result only when the evidence lists the inspected producer files and records explicit `no message changes`.
10. For frontend tasks, verify reuse-search evidence and that `knowledge/frontend-reuse.jsonl` reflects created, changed, moved, deprecated, or newly discovered reusable artifacts.
11. Record reproducible evidence and unresolved limitations without editing source, tests, prompts, scope, or acceptance criteria.

## QA status

- `passed`: all required evidence is present and no blocking defect remains.
- `failed`: a reproducible defect or missing required checklist item remains.
- `blocked`: required external state or owner decision is unavailable.
- `not-applicable`: allowed only for a clearly read-only artifact, with a reason.

There is no conditional pass. A limitation that prevents required evidence is `blocked`; a reproducible defect or missing requirement is `failed`.

## Leader after QA

- Synthesize the QA evidence and reconcile it with the requirement ledger; do not replace QA with Leader self-review.
- On `passed`, run the completion gate.
- On `failed`, do not modify the implementation in the same task. Record the task outcome as `qa-failed`, close the attempt without claiming completion, and prepare a proposed prompt for a new correction task.
- Present or discuss that new prompt with the owner, including why the defect exists, exact files/symbols, acceptance criteria, and regression evidence. Start the correction only as a new task.
- On `blocked`, state the missing evidence/decision and keep the task non-complete until it is resolved or explicitly closed as blocked.

## Completion gate

Do not say complete unless:

- scope and checklist are fully reconciled;
- changed points and impact were inspected;
- proportional verification passed;
- Leader reviewed all handoffs and an independent QA model verified the integrated artifact;
- `qa.md` records `qa_mode=fast|full`, exact loaded pattern files (or a reason none apply), separate QA and implementation identities, and read-only status;
- QA status is `passed` or justified `not-applicable`;
- result, memory, knowledge/decision updates, and concise logs are written;
- brief, checklist, QA, and result artifacts contain no unresolved workflow template tokens or standalone scaffold values outside fenced evidence; unrelated domain template syntax such as Angular moustache expressions remains valid;
- completion fields are semantically final: checklist items exist and are checked, QA evidence is populated, and result outcome is `completed`;
- a failed gate leaves active task state, current memory, recent memory, and completion logs unchanged;
- remaining concerns are explicitly separated as follow-up work;
- effects outside the approved scope are opened as a new task/conversation with a pointer in current memory instead of silently extending the task;
- the recommended commit boundary is stated — and when that boundary is an actual commit/publish/release, the touched area is covered by at least one `passed` `qa_mode=full` run (a chain of `fast`-only passes cannot carry code out the door).

## Final result fields

- outcome;
- QA status/mode and delivery boundary;
- owner-approved decisions;
- files and behavior changed;
- verification evidence;
- checklist status;
- memory/log updates;
- concerns and next tasks;
- **Outstanding items** — open Pending issues ledger entries (carried + new), or explicit `no pending issues`; never omit this field;
- commit/branch recommendation.
