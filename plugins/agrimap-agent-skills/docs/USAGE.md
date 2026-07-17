# AgriMap Agent Skills — Usage Guide

คู่มือนี้ใช้หลังติดตั้ง `agrimap-agent-skills` แล้ว จุดประสงค์คือทำให้ผู้ใช้เรียก dedicated skill ที่ตรง operation: alias โหลด compact runtime core + glossary + operation entrypoint ของตัวเอง แล้วเขียน memory/logs ลงโปรเจกต์ที่กำลังทำงาน ไม่ใช่ global install directory. `agrimap-agent-skills` เป็น router สำหรับเลือก alias เท่านั้นและไม่ execute งาน.

## 1. เรียก Skill ตามค่าย AI

แทน `<alias>` และ `<arguments>` ด้วย operation และรายละเอียดงานจากตารางด้านล่าง:

| Provider | Syntax |
| --- | --- |
| Codex — dedicated operation | `$<alias> <arguments>` |
| Codex — route only | `$agrimap-agent-skills <request>` |
| Claude Code plugin — dedicated operation | `/agrimap-agent-skills:<alias> <arguments>` |
| Claude Code plugin — route only | `/agrimap-agent-skills:agrimap-agent-skills <request>` |
| Claude standalone with alias folders | `/<alias> <arguments>` |
| Gemini CLI — dedicated operation | `/<alias> <arguments>` |

ตัวอย่างเดียวกันสามค่าย:

```text
# Codex
$agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"

# Claude Code plugin
/agrimap-agent-skills:agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"

# Gemini CLI
/agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"
```

การคัดลอกเฉพาะ routing skill จะเลือก operation ได้แต่ execute ไม่ได้ ต้องติดตั้ง alias folders เช่น `agm-analyze/` ด้วยก่อนใช้รูปแบบ `/<alias>`.

หาก alias ไม่ปรากฏหลังติดตั้ง ให้เปิด session ใหม่ก่อน หากยังไม่พบ ให้ sync/reinstall package ห้ามใช้ router เป็น execution fallback:

```text
PACKAGE_ENTRYPOINT_MISSING: agm-analyze
npm run sync  # local package development; otherwise reinstall the plugin/extension
```

## Help แบบสั้นด้วย `-h`

ถ้าต้องการดูวิธีใช้ ให้เติม `-h` หรือ `--help` โดยไม่ต้องเริ่ม task หรือสร้าง memory ก่อน:

```text
# Codex
$agm-analyze -h

# Claude Code plugin
/agrimap-agent-skills:agm-analyze -h

# Claude standalone ที่ติดตั้ง alias folder แล้ว
/agm-analyze -h

# Gemini CLI
/agm-analyze -h
```

Help ของ dedicated skill ต้องแสดง command, purpose, required/conditional inputs และ minimal example ของ operation นั้น. `$agrimap-agent-skills -h` หรือ `/agrimap-agent-skills:agrimap-agent-skills -h` แสดง catalog เพื่อเลือก alias เท่านั้น. หากต้องการเปิดคู่มือฉบับเต็มบน Windows ให้รันจาก PowerShell; เลือกอย่างใดอย่างหนึ่ง:

ทุก alias สร้างจาก `config/operations.json` และอ่านตรงเพียงสองไฟล์: `references/lifecycle-core.md` กับ `references/operations/<operation>.md`. Glossary/technical reference โหลดเมื่อ depth หรือ operation condition ตรงเท่านั้น; ห้ามอ่าน routing `SKILL.md` หรือรวม operation อื่น. หาก compact input สูญหาย/เสียหายให้หยุดด้วย `PACKAGE_ENTRYPOINT_MISSING`.

```powershell
# Browser — เปิดฉบับล่าสุดบน GitHub
Start-Process "https://github.com/gasxhermvc/agrimap-agent-skills/blob/main/docs/USAGE.md"

# VS Code — รันจาก repository root
code .\docs\USAGE.md

# Notepad — รันจาก repository root
notepad .\docs\USAGE.md
```

## 2. เลือก `light|standard|regulated` ก่อนสร้าง workflow state

ทุก dedicated operation ระบุ default/allowed depth จาก `config/operations.json` และใช้ selector กลางที่ `references/lifecycle-core.md`:

- `light`: help, history/read-only query และงาน bounded ใช้ agent เดียว + self-review + targeted verification โดยไม่ถาม requester เพื่อ attribution, ไม่ออก receipt, ไม่สร้าง brief/checklist/memory/log/QA/prompt/result;
- `standard`: งานต่อเนื่องที่ไม่เข้า regulated เก็บ requester, brief/checklist/result, memory และ milestone log แต่ไม่สร้าง `qa.md`/ไม่เปิด verifier แยก;
- `regulated`: งาน delegation, public/data/security/cross-service/shared generator, material owner decision หรือ commit/publish/release ใช้ artifacts และ QA เต็มชุด.

เฉพาะ `standard`/`regulated` เท่านั้นที่ต้องมี activation receipt สั้นและตรวจได้:

```text
AgriMap skill active
Operation: analyze
Requested by: Billy
Input coverage: 1 file validated; full read pending
Pre-work checklist:
- [ ] Inspect target and affected callers
- [ ] Separate facts, inferences, and unknowns
- [ ] Present material solution trade-offs before editing
```

Receipt นี้ไม่ใช่ permission gate เพิ่มเติม. ถ้า `standard`/`regulated` ไม่รู้ชื่อผู้สั่งงานจึงถาม; `light` ไม่ถามเพื่อ attribution อย่างเดียว. หาก input ขาดให้ระบุสิ่งที่ขาด ห้ามแสดงว่า ready ทั้งที่ยังอ่านไม่ครบ.

`substantive work` รวมการอ่าน target code, task-specific grep, diagnostics, tests และการเขียน workflow state; ไม่รวมแค่การหา project root/อ่าน workflow config/ดู Git status เพื่อเตรียมงาน. `requester` คือผู้ขอ ส่วน `decision owner` คือผู้มีสิทธิ์อนุมัติ material trade-off—อาจเป็นคนละคนกัน. นิยามบังคับทั้งหมดอยู่ที่ `references/glossary.md`.

เมื่อเริ่ม `standard`/`regulated` ให้ตรวจที่ root ของโปรเจกต์เป้าหมาย:

```text
<target-project>/.agrimap-agent/
├── tasks/<task-id>/brief.md
├── memory/current/<task-id>.md
└── logs/YYYY-MM/<task-id>.jsonl
```

ใน log ต้องแยก `requestedBy`, `model`, `role`, `agent`, และ `provider`. Global installation ต้องไม่มี project logs/memory. สำหรับ repository ที่ใช้พัฒนา Skill นี้เอง `.agrimap-agent/` ทั้งก้อนถูก ignore และอยู่เฉพาะเครื่องผู้พัฒนา.

### Standard/regulated task artifact contract

ตารางนี้ generate จาก `skills/agrimap-agent-skills/assets/task-artifact-schema.json`; ให้แก้ schema/templates แล้วรัน `npm run sync` ไม่แก้ตารางด้วยมือ.

<!-- BEGIN GENERATED TASK ARTIFACT SCHEMA -->
<!-- Generated by npm run sync from skills/agrimap-agent-skills/assets/task-artifact-schema.json. -->
| Artifact | Required depths | Template | Purpose | Required fields | Required sections |
| --- | --- | --- | --- | --- | --- |
| `brief.md` | `standard`<br>`regulated` | `task-brief.md` | Requester, authority, execution identity, objective, scope, ownership, and decisions. | `Task ID`<br>`Requested by`<br>`Identity source`<br>`Requester authority`<br>`Decision owner`<br>`Authority evidence`<br>`Model label`<br>`Actual model`<br>`Role`<br>`Agent`<br>`Provider`<br>`Operation`<br>`Workflow depth`<br>`Objective`<br>`Scope`<br>`Non-goals` | `File and logical-contract ownership`<br>`Inputs`<br>`Authorized decisions and trade-offs`<br>`Service ownership references`<br>`Concerns` |
| `checklist.md` | `standard`<br>`regulated` | `checklist.md` | Checked completion ledger derived from the task contract. | — | — |
| `qa.md` | `regulated` | `qa.md` | Tracked QA evidence under the canonical product-read-only verifier contract. | `Status`<br>`QA mode`<br>`QA mode reason`<br>`Coverage key`<br>`Light sequence`<br>`Patterns`<br>`Requested by`<br>`Decision owner`<br>`QA model label`<br>`QA actual model`<br>`QA role`<br>`QA agent`<br>`QA provider`<br>`Product artifacts modified`<br>`Workflow artifacts written`<br>`Implementation model label`<br>`Implementation actual model`<br>`Implementation role`<br>`Implementation agent`<br>`Implementation provider` | `Requirement evidence`<br>`Commands and observed results`<br>`Limitations` |
| `result.md` | `standard`<br>`regulated` | `result.md` | Leader closure result, QA boundary, verification, memory, and outstanding work. | `Outcome`<br>`Requested by`<br>`Decision owner`<br>`Leader model label`<br>`Leader actual model`<br>`Leader role`<br>`Leader agent`<br>`Leader provider`<br>`Workflow depth`<br>`QA status`<br>`QA mode`<br>`Delivery boundary` | `Authorized decisions`<br>`Changes and verification`<br>`Checklist and memory`<br>`Concerns and commit boundary`<br>`Outstanding items` |

Completion cross-artifact gates:

- Standard completion omits `qa.md` and records result QA status/mode as `not-applicable`.
- Regulated accepted QA statuses: `passed`<br>`not-applicable`.
- At regulated depth, `Requested by` and `Decision owner` match across brief, QA, and result.
- Regulated QA identity (`QA actual model`<br>`QA agent`<br>`QA provider`) must differ from implementation identity (`Implementation actual model`<br>`Implementation agent`<br>`Implementation provider`).
- Delivery boundaries `commit`<br>`publish`<br>`release` require regulated depth and `QA mode: full`.
- A regulated full run records `Light sequence: 0`; light runs may record only `1`<br>`2`.

Full QA is mandatory when any schema trigger applies:

1. commit, publish, or release boundary
2. same-task full re-QA after a qa-finding
3. third consecutive passed-light tracked closure for the same coverage key
4. explicit requester request for qa_mode=full or highest verification
<!-- END GENERATED TASK ARTIFACT SCHEMA -->

## 3. วิธีใช้หลัก — สั้นก่อน, สนทนาเมื่อจำเป็น, key=value คือทางลัด

### 3.1 แบบสั้น (แนะนำให้เริ่มแบบนี้)

ไม่ต้องรู้ parameter ก่อนใช้ — agent resolve ให้เองตาม discipline (อ้างอิง `references/elicitation.md`): ชี้ไฟล์ด้วย `@file` หรือเล่าเป็นภาษาคน ค่า default ที่ปลอดภัยถูกเติมให้ (เช่น review/analyze เป็น read-only เสมอ). งาน `standard`/`regulated` ประกาศค่าที่ infer ได้ใน activation receipt; งาน `light` สรุปเฉพาะ assumption ที่มีผลต่อผลลัพธ์:

```text
# ถามกว้าง ๆ ได้เลย — free text คือ objective
$agm-analyze มีการเพิ่ม cache ที่ไหนบ้างของระบบ login

# ชี้ไฟล์ + ขยายความสั้น ๆ — @file คือ target, ข้อความคือการจำกัด scope
$agm-review @README.md ตรวจคำผิด

# อาการผิดปกติ = diagnose
$agm-diagnose กดบันทึกแล้วขึ้น 500 บางครั้ง
```

สิ่งที่ agent **ห้ามเดาเด็ดขาด** (ไม่มีหลักฐานตรง → ถาม): `target_kind`, `backend_profile`, `refactor_mode`, ชื่อ project/artifact ใหม่ และ objective ของงานสร้างของใหม่.

### 3.2 แบบสนทนา — ถามครั้งเดียว ตอบบรรทัดเดียว

เมื่อขาดค่าที่ห้ามเดา agent จะรวมทุกคำถามเป็นชุดเดียว เป็นตัวเลือกตัวเลข พร้อมค่าแนะนำ แล้วให้ตอบกลับบรรทัดเดียว:

```text
Requester: $agm-create-feature สร้าง project template ใหม่ให้หน่อย ขอชื่อ publisher

Agent: ขอ 3 คำตอบ ตอบบรรทัดเดียวเรียงลำดับ เช่น "1 2 approve":
  1) target: 1=main  2=library
  2) ประเภท: 1=webservice (agmws)  2=job worker (agmbo)
  3) ชื่อ: เสนอ agmbo-publisher-netcore (format: agmws|agmbo-<project_name>-netcore)
     ตอบ approve หรือพิมพ์ชื่อใหม่

Requester: 1 2 agmbo-job-publisher-netcore

Agent: สร้างด้วย company template — ยืนยันคำสั่งก่อนรัน (ที่ workspace root):
  dotnet new agmbo --name "agmbo-job-publisher-netcore" --project-key "AGMBO-JOB-PUBLISHER"
    --image-name "agmbo_job_publisher_netcore" --port-number "5000" --https-port-number "5001"
  ตอบ approve หรือแก้ค่า

Decision owner: approve
```

งานสร้างโปรเจกต์ใหม่ทั้งก้อนใช้ company template `dotnet new agmwa|agmws|agmbo` — agent derive ค่าที่เหลือ (project-key, image-name, base-path/href, ports) จากชื่อที่ confirm แล้วตาม convention, โชว์คำสั่งเต็ม + working directory ให้เห็นก่อนเสมอ, และรันหลัง approve เท่านั้น ส่วนงานในโปรเจกต์เดิม ทุก path ที่จะสร้าง/แก้เห็นครบใน slice plan ก่อนไฟล์แรกถูกเขียน.

`agm-create-unit-test` ใช้ propose-first: ตรวจ target จาก path/โครงสร้างเอง แล้วเสนอรายการจุดเสี่ยงที่ควรมีเทสพร้อม mark recommended ให้เลือกตอบ `approve` / `all` / เลขที่ต้องการ เช่น `1 2 5` — ไม่มีเทสไหนถูกสร้างโดยไม่เห็นในรายการก่อน. ส่วน refactor ที่ไม่ระบุ mode จะได้เมนูภาษาคน 4 ระดับ (ห้ามเปลี่ยน logic / ปรับแต่พฤติกรรมเดิม 100% / เปลี่ยนเฉพาะจุดที่ตกลง / แก้บั๊กเดียว) — การรื้อใหม่ทั้งหมดไม่ใช่ refactor ให้ไป `agm-plan` + `agm-create-feature`.

### 3.3 เลือกคำสั่งไหน

| คำสั่ง | ใช้เมื่อเสียงในหัวคือ | จบที่ |
| --- | --- | --- |
| `agm-analyze` | "มันคืออะไร อยู่ไหน กระทบอะไร" — ยังไม่มีอะไรพัง | evidence + options + recommendation |
| `agm-diagnose` | "**ทำไม**มันพัง" — มีอาการอยู่จริง | root cause ที่พิสูจน์แล้ว |
| `agm-simulate` | "**ถ้า**ทำ X จะเกิดอะไร" | scenarios + risks + observables |
| `agm-plan` | "รู้แล้วจะทำอะไร ขอลำดับขั้น" | แผน execution ตรวจได้ |
| `agm-design` | "หน้าตา/flow/พฤติกรรมควรเป็นยังไง" | flow + states + acceptance |
| `agm-architect` | "ของนี้ควรอยู่ไหน ใครเป็นเจ้าของ contract" | decision record ถาวร ใช้ซ้ำได้ |
| `agm-review` | "ช่วยตรวจของที่มีอยู่" | findings เรียง severity ไม่แก้ให้ |
| `agm-history` | "ใครทำอะไรเมื่อไหร่" | คำตอบ audit จาก log จริง |
| `agm-refactor-*` | "ปรับคุณภาพโค้ดเดิม แบบคุมพฤติกรรม" | โค้ด + หลักฐาน preserve ตาม mode |
| `agm-qa` | "งานที่ว่าเสร็จ เสร็จจริงไหม" | passed/failed + evidence |
| `agm-create-unit-test` | "อยากได้เทสกันพัง" | เทสตามรายการที่เลือก |
| `agm-create-feature` | "สร้างของใหม่" | feature ตาม slice plan ที่ confirm |
| `agm-create-prompt` | "งานใหญ่ เตรียมโจทย์ให้ agent อื่น" | prompt SoT + thesis (ยังไม่รัน) |
| `agm-exec` | "รัน prompt ที่ approve แล้วแบบมี rails" | Result Package รอ QA |

### 3.4 key=value minimal cases — ทุก operation (ทางลัด power user, ไม่บังคับ)

เริ่มจาก Codex syntax ด้านล่าง สำหรับ Claude/Gemini ให้เปลี่ยนเฉพาะ prefix ตามหัวข้อ 1 และคง arguments เดิม.

| Alias | Minimal case |
| --- | --- |
| `agm-analyze` | `$agm-analyze depth=light target_files=src/orders.ts objective="Explain duplicate requests; do not edit"` |
| `agm-diagnose` | `$agm-diagnose depth=light symptom="Save returns 500" target_files=src/orders.ts,tests/orders.test.ts implementation=false` |
| `agm-simulate` | `$agm-simulate depth=light scenario="Retry after timeout" inputs="timeout,retry-count" expected_output="state transitions and risks"` |
| `agm-plan` | `$agm-plan depth=light objective="Add order cancellation" target_files=src/orders.ts,tests/orders.test.ts output="reverse-engineered steps"` |
| `agm-design` | `$agm-design depth=light target_kind=fe-main phase=foundation objective="Design empty/loading/error states for order list"` |
| `agm-architect` | `$agm-architect requested_by=Billy objective="Choose ownership boundary for order status" non_goals="implementation"` |
| `agm-review` | `$agm-review depth=light target_files=src/orders.ts review_scope="correctness,regression,tests"` |
| `agm-history` | `$agm-history requester=Billy days=5` |
| `agm-refactor-fe` | `$agm-refactor-fe depth=light target_kind=fe-main phase=stabilization refactor_mode=strict-preserve-logic target_files=src/order-table.component.ts` |
| `agm-refactor-be` | `$agm-refactor-be depth=light target_kind=be-main backend_profile=agmws phase=stabilization refactor_mode=performance-preserve-behavior target_files=Application/Orders/OrderUseCase.cs` |
| `agm-refactor-sql` | `$agm-refactor-sql depth=light target_kind=sql-procedure refactor_mode=performance-preserve-behavior target_files=sql/usp_Order_Search.sql` |
| `agm-qa` | `$agm-qa depth=light qa_mode=light artifact="current integrated workspace" acceptance="cancellation remains idempotent"` |
| `agm-create-unit-test` | `$agm-create-unit-test depth=light target_kind=be-main backend_profile=agmws phase=active-development target_files=Application/Orders/OrderUseCase.cs objective="cover duplicate cancellation"` |
| `agm-create-feature` | `$agm-create-feature depth=light target_kind=be-main backend_profile=agmws phase=active-development objective="Add cancel-order endpoint"` |
| `agm-create-prompt` | `$agm-create-prompt requested_by=Billy provider=codex objective="Delegate cancel-order implementation" target_kind=be-main backend_profile=agmws phase=active-development` |
| `agm-exec` | `$agm-exec requested_by=Billy prompt=.agrimap-agent/prompts/<task-id>/executor.prompt.md` |

งาน FE/BE จะ compose discipline ให้อัตโนมัติ ไม่มี `/agm-fe-engineer` หรือ `/agm-be-engineer`. `agmws|agmbo` เป็น `backend_profile` ของ `be-main`, ไม่ใช่ `target_kind`.

งาน BE ทั้ง main/library ที่อ่านหรือ refactor cookie/header/query/form/JSON body/device ID จะโหลด `013-1-extensions-request-value-normalize.md` แบบมีเงื่อนไข. Analyzer/diagnose ตรวจ duplication และ semantic mismatch; `refactor-be` ห้าม mass-replace ก่อนพิสูจน์ precedence, blank→null/trim, multi-value และ buffering; `agm-qa` ตรวจ representative source/fallback. Static extensions ชุดนี้ไม่ต้องเพิ่ม DI registration.

`agm-history` ตอบจาก workflow evidence: `requestedBy` คือผู้ขอ, executor คือ model/role/agent/provider จาก versioned event ที่ผ่าน validation และ `recordedFiles` คือไฟล์จาก valid versioned non-terminal event เท่านั้น ส่วน `legacyClaimedFiles` เป็นข้อมูลวินิจฉัยที่ห้ามยกระดับเป็น versioned attribution ทั้งหมดนี้ไม่ใช่หลักฐานว่าใครเป็นผู้พิมพ์แก้หรือ author ของ commit. ถ้าถามผู้แก้จริงให้ตรวจ Git log/blame แยกต่างหาก และต้องดู `auditStorage` ก่อน—logs ที่ ignored/untracked เป็นข้อมูลเฉพาะเครื่องและจะไม่ตามไป clone ใหม่.

### Create-feature and create-unit-test target matrix

ทุก target ใช้ได้กับทั้ง `$agm-create-feature` และ `$agm-create-unit-test`; ด้านล่างให้คำสั่งทั้งสองแบบเพื่อไม่ให้ผู้ใช้ต้องเดา field ที่จำเป็น:

| Case | Feature command | Unit-test command |
| --- | --- | --- |
| FE main | `$agm-create-feature requested_by=Billy target_kind=fe-main phase=active-development objective="Add order table"` | `$agm-create-unit-test requested_by=Billy target_kind=fe-main phase=active-development target_files=src/order-table.component.ts objective="cover empty and error states"` |
| FE library | `$agm-create-feature requested_by=Billy target_kind=fe-library phase=active-development objective="Add reusable status badge"` | `$agm-create-unit-test requested_by=Billy target_kind=fe-library phase=active-development target_files=projects/ui/status-badge.component.ts objective="cover public states"` |
| BE main web | `$agm-create-feature requested_by=Billy target_kind=be-main backend_profile=agmws phase=active-development objective="Add cancel endpoint"` | `$agm-create-unit-test requested_by=Billy target_kind=be-main backend_profile=agmws phase=active-development target_files=Application/Orders/CancelUseCase.cs objective="cover idempotency"` |
| BE main batch | `$agm-create-feature requested_by=Billy target_kind=be-main backend_profile=agmbo phase=active-development objective="Add stale-order job"` | `$agm-create-unit-test requested_by=Billy target_kind=be-main backend_profile=agmbo phase=active-development target_files=Application/Orders/StaleOrderJob.cs objective="cover retry behavior"` |
| BE library | `$agm-create-feature requested_by=Billy target_kind=be-library phase=active-development objective="Add order-id capability with README and Playground"` | `$agm-create-unit-test requested_by=Billy target_kind=be-library phase=active-development target_files=src/OrderId.cs objective="cover public contract"` |
| SQL table | `$agm-create-feature requested_by=Billy target_kind=sql-table objective="Add ORDER_RETRY table in ORDER domain"` | `$agm-create-unit-test requested_by=Billy target_kind=sql-table target_files=sql/ORDER/table/ORDER_RETRY.sql objective="verify constraints and defaults"` |
| SQL procedure | `$agm-create-feature requested_by=Billy target_kind=sql-procedure objective="Add ORDER_RETRY_Q query procedure"` | `$agm-create-unit-test requested_by=Billy target_kind=sql-procedure target_files=sql/ORDER/procedure/ORDER_RETRY_Q.sql objective="verify result and failure contracts"` |
| SQL combined | `$agm-create-feature requested_by=Billy target_kind=sql-table-and-procedure objective="Add retry persistence slice in ORDER domain"` | `$agm-create-unit-test requested_by=Billy target_kind=sql-table-and-procedure target_files=sql/ORDER/table/ORDER_RETRY.sql,sql/ORDER/procedure/ORDER_RETRY_Q.sql,sql/ORDER/messages.sql objective="verify table, procedure, and guarded messages"` |

### Refactor mode matrix

ห้ามใช้คำว่า “refactor ให้ดีขึ้น” อย่างเดียว ต้องเลือก mode หนึ่งค่า:

| Mode | Runnable example |
| --- | --- |
| `performance-preserve-behavior` | `$agm-refactor-sql requested_by=Billy target_kind=sql-procedure refactor_mode=performance-preserve-behavior target_files=sql/usp_Order_Search.sql metric="duration and logical reads"` |
| `readability-organization` | `$agm-refactor-fe requested_by=Billy target_kind=fe-main phase=stabilization refactor_mode=readability-organization target_files=src/order-table.component.ts` |
| `strict-preserve-logic` | `$agm-refactor-be requested_by=Billy target_kind=be-main backend_profile=agmws phase=stabilization refactor_mode=strict-preserve-logic target_files=Application/Orders/OrderUseCase.cs` |
| `strict-allow-logic-change` | `$agm-refactor-be requested_by=Billy target_kind=be-main backend_profile=agmws phase=stabilization refactor_mode=strict-allow-logic-change objective="Change retry rule after decision-owner trade-off"` |
| `targeted-bug-fix` | `$agm-refactor-fe requested_by=Billy target_kind=fe-main phase=active-development refactor_mode=targeted-bug-fix symptom="double submit after timeout"` |

## 4. Larger text / ข้อความยาว

วิธีแนะนำคือเก็บข้อความในไฟล์ Markdown ภายในโปรเจกต์แล้วชี้ path เพื่อรักษาหัวข้อ, line references และตรวจ coverage ได้. ตัวอย่าง fixture อยู่ที่ [LONG-REQUEST.md](../examples/inputs/LONG-REQUEST.md):

```text
$agm-plan requested_by=Billy input_file=examples/inputs/LONG-REQUEST.md input_kind=large-text coverage_required=full objective="Create an execution plan only; do not edit"
```

Agent ต้องวัดขนาด, อ่านเต็มเมื่อทำได้ หรือแบ่ง chunk ด้วย heading/line range แล้วรายงาน `read` และ `unread`. ห้ามบอกว่าอ่านครบเมื่ออ่านเพียงบางส่วน.

ถ้าจำเป็นต้อง paste ใน chat ให้ใช้ขอบเขตที่ชัดเจน:

```text
$agm-analyze requested_by=Billy objective="Analyze all content between markers; do not edit"

--- BEGIN OWNER INPUT: order-cancellation-v2 ---
<large text>
--- END OWNER INPUT: order-cancellation-v2 ---
```

ถ้า interface ตัดข้อความหรือไม่รับทั้งหมด ให้หยุดและขอเป็นไฟล์ ไม่เดาส่วนที่หาย.

## 5. รูปภาพและ visual reference

ใช้ปุ่ม/คำสั่งแนบไฟล์ของ Codex, Claude หรือ Gemini ก่อน แล้วบอก label, intent, priority และสิ่งที่ต้องสังเกตใน prompt. ไม่มี attachment token กลางที่ใช้เหมือนกันทุกค่าย.

```text
$agm-design requested_by=Billy target_kind=fe-main phase=foundation objective="Design the checkout states from the attached flow"

inputs:
- id: checkout-flow
  kind: image
  source: attached checkout-flow.svg
  priority: required
  requester_intent: preserve every state and transition; visual styling may change
```

ใช้ [checkout-flow.svg](../examples/inputs/references/checkout-flow.svg) เป็นไฟล์ทดลองได้. หลังตรวจภาพ agent จึงบันทึก `loaded=visual-inspection`, แยก visible fact ออกจาก interpretation และบอกจุดที่ภาพไม่ชัด. หาก host/model มองภาพไม่ได้ ให้บันทึก `loaded=unavailable` และขอ text alternative เช่น [feature-note.md](../examples/inputs/references/feature-note.md) แทน.

## 6. Attachments, pointed files, directories, and exact lines

ไฟล์แนบทั่วไปให้ใช้ native attachment ของ host แล้วอ้างชื่อไฟล์ใน manifest. ไฟล์ใน repository ให้ใช้ relative path; หลีกเลี่ยง path เฉพาะเครื่องเมื่อคนอื่นต้องทำงานต่อ.

```text
$agm-diagnose requested_by=Billy symptom="Duplicate submit after timeout" implementation=false

inputs:
- id: requester-note
  kind: file
  source: examples/inputs/references/feature-note.md
  priority: required
  requester_intent: treat acceptance criteria as requested; material acceptance changes still require decision-owner authority
- id: submit-handler
  kind: file
  source: src/checkout/submit-order.ts
  lines: 80-145
  anchor: submitOrder
  priority: required
- id: checkout-tests
  kind: directory
  source: tests/checkout
  priority: supporting
```

Line numbers เป็น navigation hint; ต้องให้ stable symbol/heading/SQL object ควบคู่เสมอ. การชี้ directory ไม่ได้อนุญาตให้ agent dump ทุกไฟล์เข้า context: agent ต้องตรวจ scope, ignore generated/dependency output และรายงาน coverage.

## 7. End-to-end case: feature + references + QA

1. แนบ `examples/inputs/references/checkout-flow.svg` ผ่าน host.
2. ส่งคำสั่งสร้าง feature:

```text
$agm-create-feature requested_by=Billy target_kind=fe-main phase=active-development objective="Implement checkout retry states without duplicating shared UI"

inputs:
- { id: requirements, kind: large-text, source: examples/inputs/LONG-REQUEST.md, priority: required, requester_intent: preserve acceptance criteria }
- { id: flow, kind: image, source: attached checkout-flow.svg, priority: required, requester_intent: preserve states and transitions }
- { id: note, kind: file, source: examples/inputs/references/feature-note.md, priority: supporting, requester_intent: clarify retry behavior }
tests: ask before implementation if existing coverage is insufficient
```

3. ตรวจ activation receipt และ pre-work checklist.
4. ให้ decision owner (หรือ requester ที่บันทึก authority=`owner|delegated`) เลือกเมื่อมี material trade-off; routine in-scope work ไม่ต้องขอ permission ซ้ำ.
5. หลัง integration เรียก QA แยก:

```text
$agm-qa depth=regulated qa_mode=light requested_by=Billy task_id=<feature-task-id> artifact="integrated workspace" acceptance="all authorized states covered; shared UI reused; regression evidence is present"
```

6. ตรวจ task result, QA เมื่อเป็น regulated, milestone memory และ JSONL log ก่อนรับคำว่าเสร็จ.

## 8. Prompt delegation, execution, and workspace isolation

`agm-create-prompt` เดินเป็น stage: **intake sweep → เสนอแนวทางพร้อม counter-argument → ปรับ Thesis → checklist ความเข้าใจ (ต้อง approve) → generate**. มันกวาดบริบทจากบทสนทนาและ `.agrimap-agent/` (memory, decisions, knowledge) ให้เอง ไม่ต้องเล่าซ้ำ และ**จบที่การสร้างไฟล์ prompt เท่านั้น** — ไม่เริ่มรันเอง:

```text
.agrimap-agent/prompts/<task-id>/leader.prompt.md
.agrimap-agent/prompts/<task-id>/executor.prompt.md
.agrimap-agent/prompts/<task-id>/qa.prompt.md
```

Task ID เป็น `yyyyMMddHHmmss-<subject>` เรียงตามเวลาในตัว. เมื่อ decision owner approve (`prompt_status: owner-approved`) จึงนำไปรันด้วย `agm-exec`:

```text
$agm-exec requested_by=Billy prompt=.agrimap-agent/prompts/<task-id>/executor.prompt.md
```

`agm-exec` ปฏิเสธ prompt ที่ยัง `draft`, ถูก `superseded` หรืออยู่ใต้ `prompts/complete/` (งานปิดแล้ว — ต้องออก prompt ใหม่). เมื่อ task ปิดด้วย `complete|close` สคริปต์จะย้ายโฟลเดอร์ prompt ไป `prompts/complete/<task-id>/` ให้อัตโนมัติ ห้ามย้าย/เปลี่ยนชื่อเอง.

เมื่อใช้ `agm-create-prompt`, Leader ต้องใส่ `workspace_need` ครบ ไม่พึ่งให้ executor เดาว่า Codex/Claude รองรับ worktree หรือไม่:

```yaml
workspace_need:
  isolation: preferred
  requested_mode: isolated-worktree
  base_ref: feat/order-cancel
  base_commit: <exact-sha-containing-required-state>
  provider_instruction: <exact provider command or agent configuration>
  visibility_check: report cwd, git ref, and integration return path
  integration_return: commit-sha
  fallback_mode: sequential
```

ถ้า mode ที่ขอใช้ไม่ได้ ต้องใช้ `fallback_mode` เท่านั้น. หนึ่งไฟล์/หนึ่ง logical contract มี writer model เดียวต่อ integration wave. เฉพาะ regulated QA ใช้สัญญาที่ [`qa-and-done.md`](../skills/agrimap-agent-skills/references/qa-and-done.md); prompt/role/subagent docs ต้องอ้างอิงและไม่คัดลอก policy ซ้ำ.

### ดูว่า subagent กำลังทำอะไร

Codex รุ่นปัจจุบันเปิด subagent workflow โดย default. ก่อน spawn Leader ต้องแสดงรายการ `ชื่อ agent — งานที่ทำ — output ที่จะคืน` และช่องทางดูสถานะ:

- Codex app: เปิด agent thread จาก activity ใน main task;
- Codex CLI: ใช้ `/agent` เพื่อดู/สลับ active thread;
- Codex IDE: ขยาย background-agent panel เหนือ composer แล้วเปิด agent ที่ต้องการ.

ถ้า Leader ไม่มีงานอิสระให้ทำระหว่างรอ ต้อง poll ไม่เกินครั้งละ 60 วินาทีและรายงาน `running|completed|blocked` พร้อมชื่อ agent/งาน ห้ามปล่อย “Waiting for subagent…” เปล่า ๆ 5–7 นาที. `.agrimap-agent/runtime/progress/<task-id>.jsonl` ใช้เฉพาะ fallback เมื่อ surface นั้นไม่มี native activity จริง และเขียนเฉพาะ start, phase/status transition, finish/block—ไม่เขียนทุก step/tool call; unchanged liveness ไม่ถี่กว่าทุก 5 นาที. ดูเอกสารทางการ [Codex Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents).

## 9. Automated smoke test vs. live-provider check

ใน source repository รัน:

```powershell
npm run sync
npm run audit:tokens
npm run test:usage
npm test
npm run validate
```

`test:usage` ตรวจครบทุก alias ว่ามี Codex/Claude dedicated skill, Gemini command, operation-specific entrypoint, ข้อห้ามโหลด router/รวม operation อื่น, fail-closed package error, documentation case และ multimodal fixtures. มันไม่สามารถพิสูจน์ UI/session ของ provider ที่ไม่ได้ติดตั้งบนเครื่องนั้นได้. หลัง install จึงต้องทำ live check อย่างน้อยหนึ่ง alias, เห็น activation receipt ตามหัวข้อ 2 และเมื่อใช้ subagent ต้องเปิดดู native agent thread ได้.

`audit:tokens` ตรวจ progressive-disclosure path ของทุก operation baseline และ scenario สำคัญ โดยแยก direct alias preload, cumulative `Load now`, conditional discipline และ selected manifest/golden พร้อม words, characters และช่วง token โดยประมาณ. ใช้ `npm run audit:tokens -- --scenario <id> --details` เพื่อดูไฟล์ที่ถูกนับ หรือ `npm run audit:tokens:strict` เพื่อให้ missing route/reference และ budget overflow คืน exit code 1 สำหรับ CI. Token เป็นค่าประมาณ 3–4 characters/token เพราะแต่ละ provider ใช้ tokenizer ต่างกัน.
