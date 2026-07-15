# AgriMap Agent Skills — Usage Guide

คู่มือนี้ใช้หลังติดตั้ง `agrimap-agent-skills` แล้ว จุดประสงค์คือทำให้ผู้ใช้เห็นชัดว่า alias โหลด umbrella skill จริง, ส่ง input ครบ และเขียน memory/logs ลงโปรเจกต์ที่กำลังทำงาน ไม่ใช่ global install directory.

## 1. เรียก Skill ตามค่าย AI

แทน `<alias>` และ `<arguments>` ด้วย operation และรายละเอียดงานจากตารางด้านล่าง:

| Provider | Syntax |
| --- | --- |
| Codex | `$<alias> <arguments>` |
| Claude Code plugin | `/agrimap-agent-skills:<alias> <arguments>` |
| Claude standalone — umbrella only | `/agrimap-agent-skills operation=<operation> <arguments>` |
| Claude standalone — umbrella + alias folders | `/<alias> <arguments>` |
| Gemini CLI | `/<alias> <arguments>` |

ตัวอย่างเดียวกันสามค่าย:

```text
# Codex
$agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"

# Claude Code plugin
/agrimap-agent-skills:agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"

# Claude standalone — copied only skills/agrimap-agent-skills
/agrimap-agent-skills operation=analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"

# Gemini CLI
/agm-analyze requested_by=Billy target_files=src/app.ts objective="Find the root cause; do not edit"
```

การคัดลอกเฉพาะ umbrella skill จะยังไม่มี thin aliases เช่น `/agm-analyze`; ต้องติดตั้ง alias folders เพิ่มก่อนจึงใช้รูปแบบ `/<alias>` ได้.

หาก alias ไม่ปรากฏหลังติดตั้ง ให้เปิด session ใหม่ก่อน หากยังไม่พบ ให้เรียก umbrella โดยตรงและระบุ `operation=analyze`:

```text
# Codex
$agrimap-agent-skills operation=analyze requested_by=Billy objective="Find the root cause; do not edit"

# Claude Code plugin
/agrimap-agent-skills:agrimap-agent-skills operation=analyze requested_by=Billy objective="Find the root cause; do not edit"
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

# Claude standalone ที่คัดลอกเฉพาะ umbrella skill
/agrimap-agent-skills operation=analyze -h

# Gemini CLI
/agm-analyze -h
```

Help ต้องแสดง command, purpose, required/conditional inputs และ minimal example ของ operation นั้น. หากต้องการเปิดคู่มือฉบับเต็มบน Windows ให้รันจาก PowerShell; เลือกอย่างใดอย่างหนึ่ง:

```powershell
# Browser — เปิดฉบับล่าสุดบน GitHub
Start-Process "https://github.com/gasxhermvc/agrimap-agent-skills/blob/main/docs/USAGE.md"

# VS Code — รันจาก repository root
code .\docs\USAGE.md

# Notepad — รันจาก repository root
notepad .\docs\USAGE.md
```

## 2. หลักฐานว่า Skill active แล้ว

ก่อนทำ substantive work คำตอบแรกต้องมี activation receipt ที่สั้นและตรวจได้:

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

Receipt นี้ไม่ใช่ permission gate เพิ่มเติม ถ้าไม่รู้ชื่อผู้สั่งงาน agent ต้องถามทันที หาก input ขาด agent ต้องระบุสิ่งที่ขาด ห้ามแสดงว่า ready ทั้งที่ยังอ่านไม่ครบ.

หลังเริ่มงานจริง ให้ตรวจที่ root ของโปรเจกต์เป้าหมาย:

```text
<target-project>/.agrimap-agent/
├── tasks/<task-id>/brief.md
├── memory/current/<task-id>.md
└── logs/YYYY-MM/<task-id>.jsonl
```

ใน log ต้องแยก `requestedBy`, `model`, `role`, `agent`, และ `provider`. Global installation ต้องไม่มี project logs/memory. สำหรับ repository ที่ใช้พัฒนา Skill นี้เอง `.agrimap-agent/` ทั้งก้อนถูก ignore และอยู่เฉพาะเครื่องผู้พัฒนา.

## 3. Minimal runnable cases — ทุก operation

เริ่มจาก Codex syntax ด้านล่าง สำหรับ Claude/Gemini ให้เปลี่ยนเฉพาะ prefix ตามหัวข้อ 1 และคง arguments เดิม.

| Alias | Minimal case |
| --- | --- |
| `agm-analyze` | `$agm-analyze requested_by=Billy target_files=src/orders.ts objective="Explain duplicate requests; do not edit"` |
| `agm-diagnose` | `$agm-diagnose requested_by=Billy symptom="Save returns 500" target_files=src/orders.ts,tests/orders.test.ts implementation=false` |
| `agm-simulate` | `$agm-simulate requested_by=Billy scenario="Retry after timeout" inputs="timeout,retry-count" expected_output="state transitions and risks"` |
| `agm-plan` | `$agm-plan requested_by=Billy objective="Add order cancellation" target_files=src/orders.ts,tests/orders.test.ts output="reverse-engineered steps"` |
| `agm-design` | `$agm-design requested_by=Billy target_kind=fe-main phase=foundation objective="Design empty/loading/error states for order list"` |
| `agm-architect` | `$agm-architect requested_by=Billy objective="Choose ownership boundary for order status" non_goals="implementation"` |
| `agm-review` | `$agm-review requested_by=Billy target_files=src/orders.ts review_scope="correctness,regression,tests" read_only=true` |
| `agm-history` | `$agm-history requester=Billy days=5` |
| `agm-refactor-fe` | `$agm-refactor-fe requested_by=Billy target_kind=fe-main phase=stabilization refactor_mode=strict-preserve-logic target_files=src/order-table.component.ts` |
| `agm-refactor-be` | `$agm-refactor-be requested_by=Billy target_kind=be-main backend_profile=agmws phase=stabilization refactor_mode=performance-preserve-behavior target_files=Application/Orders/OrderUseCase.cs` |
| `agm-refactor-sql` | `$agm-refactor-sql requested_by=Billy target_kind=sql-procedure refactor_mode=performance-preserve-behavior target_files=sql/usp_Order_Search.sql` |
| `agm-qa` | `$agm-qa requested_by=Billy task_id=order-cancel-001 artifact="current integrated workspace" read_only=true acceptance="tests pass; cancellation remains idempotent"` |
| `agm-create-unit-test` | `$agm-create-unit-test requested_by=Billy target_kind=be-main backend_profile=agmws phase=active-development target_files=Application/Orders/OrderUseCase.cs objective="cover duplicate cancellation"` |
| `agm-create-feature` | `$agm-create-feature requested_by=Billy target_kind=be-main backend_profile=agmws phase=active-development objective="Add cancel-order endpoint"` |
| `agm-create-prompt` | `$agm-create-prompt requested_by=Billy provider=codex objective="Delegate cancel-order implementation" target_kind=be-main backend_profile=agmws phase=active-development` |

งาน FE/BE จะ compose discipline ให้อัตโนมัติ ไม่มี `/agm-fe-engineer` หรือ `/agm-be-engineer`. `agmws|agmbo` เป็น `backend_profile` ของ `be-main`, ไม่ใช่ `target_kind`.

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
| SQL table | `$agm-create-feature requested_by=Billy target_kind=sql-table objective="Add OrderRetry table"` | `$agm-create-unit-test requested_by=Billy target_kind=sql-table target_files=sql/tables/OrderRetry.sql objective="verify constraints and defaults"` |
| SQL procedure | `$agm-create-feature requested_by=Billy target_kind=sql-procedure objective="Add retry lookup procedure"` | `$agm-create-unit-test requested_by=Billy target_kind=sql-procedure target_files=sql/procedures/usp_OrderRetry_Get.sql objective="verify result and failure contracts"` |
| SQL combined | `$agm-create-feature requested_by=Billy target_kind=sql-table-and-procedure objective="Add retry persistence slice"` | `$agm-create-unit-test requested_by=Billy target_kind=sql-table-and-procedure target_files=sql/tables/OrderRetry.sql,sql/procedures/usp_OrderRetry_Get.sql objective="verify combined contract"` |

### Refactor mode matrix

ห้ามใช้คำว่า “refactor ให้ดีขึ้น” อย่างเดียว ต้องเลือก mode หนึ่งค่า:

| Mode | Runnable example |
| --- | --- |
| `performance-preserve-behavior` | `$agm-refactor-sql requested_by=Billy target_kind=sql-procedure refactor_mode=performance-preserve-behavior target_files=sql/usp_Order_Search.sql metric="duration and logical reads"` |
| `readability-organization` | `$agm-refactor-fe requested_by=Billy target_kind=fe-main phase=stabilization refactor_mode=readability-organization target_files=src/order-table.component.ts` |
| `strict-preserve-logic` | `$agm-refactor-be requested_by=Billy target_kind=be-main backend_profile=agmws phase=stabilization refactor_mode=strict-preserve-logic target_files=Application/Orders/OrderUseCase.cs` |
| `strict-allow-logic-change` | `$agm-refactor-be requested_by=Billy target_kind=be-main backend_profile=agmws phase=stabilization refactor_mode=strict-allow-logic-change objective="Change retry rule after owner trade-off"` |
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
  owner_intent: preserve every state and transition; visual styling may change
```

ใช้ [checkout-flow.svg](../examples/inputs/references/checkout-flow.svg) เป็นไฟล์ทดลองได้. หลังตรวจภาพ agent จึงบันทึก `loaded=visual-inspection`, แยก visible fact ออกจาก interpretation และบอกจุดที่ภาพไม่ชัด. หาก host/model มองภาพไม่ได้ ให้บันทึก `loaded=unavailable` และขอ text alternative เช่น [feature-note.md](../examples/inputs/references/feature-note.md) แทน.

## 6. Attachments, pointed files, directories, and exact lines

ไฟล์แนบทั่วไปให้ใช้ native attachment ของ host แล้วอ้างชื่อไฟล์ใน manifest. ไฟล์ใน repository ให้ใช้ relative path; หลีกเลี่ยง path เฉพาะเครื่องเมื่อคนอื่นต้องทำงานต่อ.

```text
$agm-diagnose requested_by=Billy symptom="Duplicate submit after timeout" implementation=false

inputs:
- id: owner-note
  kind: file
  source: examples/inputs/references/feature-note.md
  priority: required
  owner_intent: treat acceptance criteria as owner decision
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
- { id: requirements, kind: large-text, source: examples/inputs/LONG-REQUEST.md, priority: required, owner_intent: preserve acceptance criteria }
- { id: flow, kind: image, source: attached checkout-flow.svg, priority: required, owner_intent: preserve states and transitions }
- { id: note, kind: file, source: examples/inputs/references/feature-note.md, priority: supporting, owner_intent: clarify retry behavior }
tests: ask before implementation if existing coverage is insufficient
```

3. ตรวจ activation receipt และ pre-work checklist.
4. ให้ Owner เลือกเมื่อมี material trade-off; routine in-scope work ไม่ต้องขอ permission ซ้ำ.
5. หลัง integration เรียก QA แยก:

```text
$agm-qa requested_by=Billy task_id=<feature-task-id> artifact="integrated workspace" read_only=true acceptance="all owner states covered; shared UI reused; regression checks pass"
```

6. ตรวจ task result, passed QA, memory checkpoint และ JSONL log ก่อนรับคำว่าเสร็จ.

## 8. Prompt delegation and workspace isolation

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

ถ้า mode ที่ขอใช้ไม่ได้ ต้องใช้ `fallback_mode` เท่านั้น. หนึ่งไฟล์/หนึ่ง logical contract มี writer model เดียวต่อ integration wave; QA อ่านอย่างเดียวและห้ามแก้ finding.

## 9. Automated smoke test vs. live-provider check

ใน source repository รัน:

```powershell
npm run sync
npm run test:usage
npm test
npm run validate
```

`test:usage` ตรวจครบทุก alias ว่ามี Codex/Claude thin skill, Gemini command, umbrella activation route, documentation case และ multimodal fixtures. มันไม่สามารถพิสูจน์ UI/session ของ provider ที่ไม่ได้ติดตั้งบนเครื่องนั้นได้. หลัง install จึงต้องทำ live check อย่างน้อยหนึ่ง alias และเห็น activation receipt ตามหัวข้อ 2.
