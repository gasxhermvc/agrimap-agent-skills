# Skill registry — ชื่ออ้างอิงมาตรฐานของทุก knowledge module

ทะเบียนรหัสสั้นสำหรับอ้างถึง skill/knowledge ใน receipt, handoff, และ log (`skillsUsed`)
เพื่อให้คนอ่าน logs เห็นว่า "งานชิ้นนี้คิดแบบนี้ เพราะใช้สกิลนี้" — **เป็น observability
ไม่ใช่ gate**: การไม่ใส่ไม่ทำให้ event ผิด แต่การใส่ให้ใช้รหัสจากตารางนี้เท่านั้น ห้ามแต่งรหัสใหม่

## Core workflow

| ID | ไฟล์ | ใช้เมื่อ |
|---|---|---|
| `agm:router` | `SKILL.md` | เลือก dedicated operation skill เท่านั้น; ไม่ execute task |
| `agm:glossary` | `glossary.md` | นิยาม authority, work boundary, task size, QA, model identity |
| `agm:lifecycle-core` | `lifecycle-core.md` | compact `light|standard|regulated` contract และ milestone selector สำหรับ aliases |
| `agm:workflows` | `workflows.md` | compatibility source map; ไม่โหลดใน normal alias path |
| `agm:roles` | `roles.md` | เลือก/สวมบทบาท |
| `agm:qa-and-done` | `qa-and-done.md` | QA scope, sequence, completion gate |
| `agm:analysis-discipline` | `analysis-discipline.md` | แยก FACT/INFERENCE/HYPOTHESIS/UNKNOWN |
| `agm:elicitation` | `elicitation.md` | resolve parameter ที่ขาด |
| `agm:input-and-scope` | `input-and-scope.md` | normalize inputs/attachments |
| `agm:refactor-modes` | `refactor-modes.md` | เลือกโหมด refactor |
| `agm:memory-and-logs` | `memory-and-logs.md` | schema ของ memory/log |
| `agm:subagents` | `subagents-and-branches.md` | delegation / workspace mode |
| `agm:create-prompt` | `create-prompt.md` | สร้าง prompt SoT |
| `agm:service-ownership` | `service-ownership.md` | งานข้าม service/ownership |
| `agm:platform-syntax` | `platform-syntax.md` | provider detection / invocation syntax |
| `agm:skill-registry` | `skill-registry.md` | ทะเบียนนี้เอง |

## Engineering disciplines

| ID | ไฟล์ | ใช้เมื่อ |
|---|---|---|
| `agm:fe-engineer` | `frontend-engineer.md` | ทุกงาน FE (detection, reuse, phase gates, structure-over-logic) |
| `agm:be-engineer` | `backend-engineer.md` | ทุกงาน BE (profile detection, host profiles, phase gates) |

## Patterns (routers + shared)

| ID | ไฟล์ | ใช้เมื่อ |
|---|---|---|
| `agm:patterns/frontend` | `patterns/frontend.md` | router งาน FE ทุกชนิด |
| `agm:patterns/backend` | `patterns/backend.md` | router งาน BE ทุกชนิด |
| `agm:patterns/sql` | `patterns/sql.md` | router งาน SQL + DDL Standard + message gate |
| `agm:patterns/gencode-api` | `patterns/gencode-api.md` | งาน generated API ทุก workspace |
| `agm:patterns/conflict-resolution` | `patterns/conflict-resolution.md` | เมื่อใช้ golden evidence |
| `agm:patterns/status` | `patterns/pattern-status.md` | pattern ขาด/ยังไม่ verify |
| `agm:patterns/owner-intake` | `patterns/owner-example-intake.md` | ขอ example ใหม่จาก owner |

## Golden collections

| ID | โฟลเดอร์ | ใช้เมื่อ |
|---|---|---|
| `agm:golden/frontend-main` | `patterns/golden/frontend-main/` | งานแอปหลัก `agmwa-platform-ng` |
| `agm:golden/frontend-libraries` | `patterns/golden/frontend-libraries/` | งาน `@agrimap/*` library workspace |
| `agm:golden/backend-main` | `patterns/golden/backend-main/` | งาน BE main (agmws + agmbo ใช้ร่วมกัน) |
| `agm:golden/backend-libraries` | `patterns/golden/backend-libraries/` | งาน `AgriMap.Platform` libraries |
| `agm:golden/backend-request-values` | `patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md` | งานอ่าน/normalize cookie, header, query, form, JSON body และ device ID ทั้ง BE main/library |
| `agm:golden/sql` | `patterns/golden/sql/` | หลักฐาน SQL |

## วิธีใช้ใน logs

ใส่ field `skillsUsed` ใน log event เป็น array ของรหัสข้างบน เรียงตามน้ำหนักที่มีผลต่อการคิด
ระบุเฉพาะตัวที่**มีผลจริง**ต่อ step นั้น ไม่ใช่ทุกตัวที่เปิดผ่าน:

```json
"skillsUsed": ["agm:patterns/sql", "agm:golden/sql", "agm:qa-and-done"]
```

อ้างอิงในข้อความ receipt/handoff ใช้รหัสเดียวกัน เช่น
`Patterns: agm:patterns/sql + agm:golden/sql (LUT_NOTI_CHANNEL.sql)`
