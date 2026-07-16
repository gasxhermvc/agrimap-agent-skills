# Workflows

## สารบัญ

- [Task lifecycle](#task-lifecycle--ทุก-operation-วิ่งผ่าน-6-กระบวนการนี้)
- [Operation write boundary](#operation-write-boundary--รั้วเดียว-ใช้ทุกคำสั่ง)
- [Problem reporting](#problem-reporting--กระบวนการแจ้งปัญหา-cross-cutting)
- [Choosing an operation](#choosing-an-operation)
- [`/agm-analyze` through `/agm-history`](#agm-analyze)
- [Refactor workflows](#agm-refactor-fe-agm-refactor-be-agm-refactor-sql)
- [`/agm-qa`](#agm-qa)
- [`/agm-create-unit-test`](#agm-create-unit-test)
- [`/agm-create-feature`](#agm-create-feature)
- [`/agm-create-prompt`](#agm-create-prompt)
- [`/agm-exec`](#agm-exec)

Use this router after intake and impact analysis. Apply [glossary.md](glossary.md) for authority, artifact boundaries, task sizing, verification, QA, and model identity. Combine a workflow with the relevant technical role; do not treat command names as permission gates. Automatically compose the passive [Front-end Engineer discipline](frontend-engineer.md) for FE targets and [Back-end Engineer discipline](backend-engineer.md) for BE targets. Resolve missing inputs with [elicitation.md](elicitation.md) before asking anything.

## Task lifecycle — ทุก operation วิ่งผ่าน 6 กระบวนการนี้

This file is the **operation catalog**; the lifecycle spine lives in `SKILL.md`. Every task, regardless of operation, passes these phases in order — each has a measurable exit gate. Phase 6 is cross-cutting and can fire from inside any phase.

| # | กระบวนการ | ทำอะไร | กฎอยู่ที่ | Exit gate (ชี้วัด — ผ่านเมื่อ) |
|---|---|---|---|---|
| 1 | **คิด** (Think) | normalize inputs, หา root/hidden problem, แยก FACT/INFERENCE, ตัวเลือก+trade-off | SKILL §Start (4–7), §Analyze before editing, [analysis-discipline.md](analysis-discipline.md) | scope/non-goals/assumptions ถูกประกาศ; evidence มี label; มี recommendation เมื่อทางเลือก >1 |
| 2 | **เตรียมบทบาท** (Prepare) | requester/identity, target detection, เลือก role + โหลด pattern ตาม scope | SKILL §Start (1–3, 8), §Route technical patterns, [roles.md](roles.md), engineer disciplines | activation receipt ออกแล้ว พร้อมบรรทัด `Patterns:` + ผล detection + execution identity จริง |
| 3 | **จ่ายงาน** (Dispatch) | ตัดสิน single-agent vs fan-out, ownership map, handoff แบบ inline-fundamentals | SKILL §Delegate deliberately, [subagents-and-branches.md](subagents-and-branches.md) | งานเล็ก = ไม่ fan-out; งานใหญ่ = ownership map ครบ ≤5 subagents, handoff มี fundamentals ติดไป |
| 4 | **ทำงาน** (Execute) | ทำตาม operation contract ในไฟล์นี้ + เคารพ write boundary | SKILL §Execute, operation sections ด้านล่าง, patterns | deliverable ของ operation ถูกเขียนลง artifact ที่กำหนด; ไม่มีการเขียนนอก boundary |
| 5 | **สรุปผล** (Conclude) | checkpoint memory/logs, verify, QA อิสระ, result package | SKILL §Checkpoint + §Verify and close, [qa-and-done.md](qa-and-done.md) | checklist reconciled; QA status บันทึกแล้ว; result fields ครบ; commit boundary ระบุแล้ว |
| 6 | **แจ้งปัญหา** (Report problems) | ส่งสัญญาณเมื่อติด/ขัดแย้ง/เพี้ยนจากแผน — จากกระบวนการไหนก็ได้ | §Problem reporting ด้านล่าง | ปัญหาถูกรายงานพร้อม evidence และงานหยุดถูกจุด — ไม่มีการ self-unblock |

## Operation write boundary — รั้วเดียว ใช้ทุกคำสั่ง

- **Product-read-only operations** — `analyze`, `diagnose`, `simulate`, `plan`, `design`, `architect`, `review`, `history`, `qa`: ห้ามแก้ product artifact ใด ๆ (source/tests/SQL/config/schema/data/product docs/generated output) และห้าม execution ที่มี side effect (deploy, สร้าง/แก้ database, run server, publish, install) — เขียนได้เฉพาะ workflow artifact ใต้ `.agrimap-agent/` ที่ operation นั้นเป็นเจ้าของ ไม่มีการตีความ objective ใดเปิดทางให้ลงมือได้; อยากให้แก้ = ปิดงานนี้แล้วเปิด write operation แยก
- **Write operations** — `refactor-fe/be/sql`, `create-feature`, `create-unit-test`, `exec`: แก้ project ได้ตาม confirmed scope + ต้องรัน verify loop ตาม pattern ของ scope

## Problem reporting — กระบวนการแจ้งปัญหา (cross-cutting)

เมื่อเจอสถานการณ์เหล่านี้ ให้หยุดจุดที่กระทบ รายงานพร้อมหลักฐาน แล้วรอการตัดสินใจ — ห้ามแก้ปัญหาข้ามรั้วเพื่อไปต่อ:

| สถานการณ์ | สัญญาณที่ต้องส่ง | บันทึกที่ |
|---|---|---|
| ความจริงขัดกับ prompt/แผนที่อนุมัติ | `deviation_from_prompt` + evidence (ห้ามตีความ prompt ใหม่เงียบ ๆ) | result/handoff + log event |
| ตรวจไม่ได้โดยไม่ละเมิด write boundary | `blocked` + ระบุ evidence ที่ขาด | qa.md / task artifact |
| QA พบ defect | `failed` + severity/file/line/impact — ห้ามซ่อมเองในงานเดิม | qa.md, งานปิดเป็น `qa-failed` |
| decision record ขัดกันสองใบใน topic เดียว | หยุด ถาม decision owner ว่าใบไหน current | รายงานใน receipt/chat |
| pattern/example ที่ต้องใช้ไม่มี | ประกาศ gap ใน receipt + `missing-owner-example` แล้วทำงานต่อบน evidence ที่มี (gap ไม่ block งานที่ไม่เกี่ยว) | receipt + [pattern-status.md](patterns/pattern-status.md) |
| scope บานเกินที่อนุมัติ | บันทึกเป็น follow-up แยก — ห้ามขยายเงียบ ๆ | current memory + result concerns |

## Choosing an operation

| Operation | Use when the requester is asking | Ends with | Wrong fit → use instead |
| --- | --- | --- | --- |
| `agm-analyze` | "What is this, where is it, what does it impact, what are the options?" — nothing is broken | evidence + options + recommendation | a clear defect exists → `diagnose` |
| `agm-diagnose` | "Why is it broken?" — a symptom exists | proven root cause + smallest proposed fix | only understanding is needed → `analyze` |
| `agm-simulate` | "If we do X, what happens?" — risk preview before acting | scenarios + risks + observables | something already failed → `diagnose` |
| `agm-plan` | "We know what to do; give ordered steps to finish it" | verifiable execution plan | the goal itself is unclear → `analyze` |
| `agm-design` | "How should the flow/behavior/states look for the user?" | flow + states + acceptance criteria | system boundaries are the question → `architect` |
| `agm-architect` | "Where should this live, who owns the contract, how do we migrate?" | a durable decision record | only understanding is needed → `analyze` |
| `agm-review` | "Check this existing artifact" | findings by severity, product-read-only | the requester wants the fix applied → `refactor` |
| `agm-history` | "Who did what, when, in which task?" | audit answer from tracked evidence | — |
| `agm-refactor-fe/be/sql` | "Working code, improve quality under a stated behavior contract" | changed code + preservation evidence | a full rewrite → `plan` + `create-feature` |
| `agm-qa` | "Is the finished work actually finished?" — independent acceptance | passed/failed + evidence, never conditional | — |
| `agm-create-unit-test` | "Protect behavior against regressions" | tests the authorized participant selected | — |
| `agm-create-feature` | "Build something new" | feature per the confirmed slice plan | changing existing behavior → `refactor` |
| `agm-create-prompt` | "Large or delegated work; prepare a verifiable brief for another agent" | approved prompt SoT + thesis | small self-contained work → run the operation directly |
| `agm-exec` | "Run an approved prompt exactly, with rails" | Result Package awaiting Leader/QA | no approved prompt exists → `create-prompt` |

## `/agm-analyze`

Use [analysis-discipline.md](analysis-discipline.md). Produce labeled evidence, hidden problems, dependencies, impact surface, unknowns, solution options, trade-offs, recommendation, and an execution-ready checklist. For delegation candidates, identify shared files/contracts that prevent parallel writes.

**Analysis is product-read-only.** It never edits source, tests, SQL, config, schema, data, product docs, or generated output—not even a one-line "obvious fix"—and no phrasing of the objective counts as an implied implementation request. Its only writes are the task's own workflow artifacts under `.agrimap-agent/`. When the requester wants the fix applied, close the analysis and route to the matching execution operation (`refactor-*` / `create-feature` / `exec`) as a separate explicit request. An analyze run that changed a product artifact is a workflow defect regardless of whether the change was correct.

## `/agm-diagnose`

Trace symptoms to root cause using [analysis-discipline.md](analysis-discipline.md). Build a hypothesis table with evidence for/against, run bounded diagnostics, identify the proven cause, and propose the smallest complete fix.

**Diagnostics are product-read-only and observational**: read, grep, parse, typecheck, existing non-mutating tests/builds. They never mutate product files, schemas, databases, or data, and never deploy anything. The fix is *proposed*, never applied in this operation — no objective phrasing counts as an implied implementation request; execution is a separate explicit operation. The only writes are assigned `.agrimap-agent/` workflow artifacts. Write the deliverable to `.agrimap-agent/tasks/<task-id>/diagnosis.md` using [analysis.md](../assets/templates/analysis.md).

## `/agm-simulate`

Model explicit scenarios, inputs, state transitions, affected components, failure modes, observables, and rollback. Label assumptions and confidence. Simulation informs a decision; it is not a mandatory gate for routine work. Write the deliverable to `.agrimap-agent/tasks/<task-id>/simulation.md` using [analysis.md](../assets/templates/analysis.md).

## `/agm-plan`

Reverse-engineer from the required end state. Include dependencies, files, symbols, current line positions, ordered steps, verification, decision points, truly independent tasks, file/logical-contract ownership, workspace mode, integration artifacts, memory checkpoints, and done criteria. Write the deliverable to `.agrimap-agent/tasks/<task-id>/plan.md` using [plan.md](../assets/templates/plan.md) so the plan stays reusable and auditable after the chat ends.

## `/agm-design`

Define user flow, state, interface behavior, component boundaries, data requirements, accessibility expectations, and acceptance criteria. Separate visual preference from product behavior. Write the deliverable to `.agrimap-agent/tasks/<task-id>/design.md` using [design.md](../assets/templates/design.md).

## `/agm-architect`

Map boundaries, ownership, contracts, data flow, deployment/runtime effects, alternatives, migration path, and reversible decisions. Require a decision-owner trade-off before changing established logical boundaries.

Architect knowledge is a single thread per topic. Every architect run ends with a decision record under `.agrimap-agent/decisions/` using [decision.md](../assets/templates/decision.md); a chat answer alone is not an accepted outcome. Before writing, search existing records by `topic` frontmatter:

- a matching record exists → reopen it as `FACT` and continue, extend, or supersede it; never open a parallel record for the same topic;
- supersession links both directions: the new record sets `supersedes`, the old record gets `superseded_by` and `status: superseded`;
- one topic has exactly one `approved` record at any time. Finding two is a workflow defect: stop and ask the recorded decision owner which one is current.

Decision-impact lookup is a Leader responsibility at intake and uses frontmatter only (`topic`, `affected`, `service_refs`); open the full record only when it intersects the task scope. Executors receive the relevant decisions inside their prompt and never search on their own. QA verifies that touched decisions are still current; tasks that touch no decision pay no cost. When an `agm-analyze` run surfaces a boundary or ownership question, end it with a recommendation to escalate to `agm-architect` instead of deciding inline.

## `/agm-review`

Review correctness first, then behavior regressions, contracts/data, maintainability, performance when relevant, and tests. Report findings by severity with file, line, evidence, impact, and actionable fix. **Review is product-read-only** — do not refactor, patch, or "fix while here" during a review-only request, and never execute anything mutating or deploy anything; the only writes are assigned `.agrimap-agent/` workflow artifacts. Write the deliverable to `.agrimap-agent/tasks/<task-id>/review.md` using [review.md](../assets/templates/review.md).

## `/agm-history`

Answer requester/task audit questions from tracked evidence without creating a task or changing project state. Run `node <skill>/scripts/agm-workspace.mjs history --cwd <target-project>` with any applicable filters:

- `--requester <confirmed-human-name>` or `--requester-id <stable-id>`;
- `--from YYYY-MM-DD|ISO-8601` and `--to YYYY-MM-DD|ISO-8601`;
- `--days <1..3650>` for a rolling 24-hour window;
- `--task <task-id>` or `--event <canonical-event>`.

Bare dates are UTC and inclusive by calendar date (`--to 2026-07-15` includes that whole UTC day). Timestamp filters must include `Z` or an explicit UTC offset so the range cannot depend on the machine timezone. Use `events[].timestampUtc` for normalized chronology and retain `events[].timestamp` when the exact recorded representation matters.

Read `attributionSemantics` before answering: `requestedBy` is the confirmed human requester, `executors` are valid workflow-recorded model/role/agent/provider identities, and `recordedFiles` are claimed affected paths from valid versioned non-terminal events. `legacyClaimedFiles` is diagnostic only and must not be presented as versioned attribution. None proves who physically edited or committed a file. Use `gitHeads` only as event-time repository context and inspect Git log/blame separately for actual commit authorship. Read `auditStorage`; ignored, untracked, partially tracked, or dirty logs are not guaranteed to exist in another clone. Open `tasks[].artifacts.brief`, `result`, `qa`, `currentMemory`, or `recentMemory` for detail. Report `invalidLines` as an audit limitation and never count excluded invalid versioned records as evidence.

## `/agm-refactor-fe`, `/agm-refactor-be`, `/agm-refactor-sql`

Require a selected mode from [refactor-modes.md](refactor-modes.md). Establish a behavioral baseline, inspect consumers, constrain scope, implement, and prove the selected preservation/change contract. Write the required refactor brief to `.agrimap-agent/tasks/<task-id>/refactor-brief.md` using [refactor-brief.md](../assets/templates/refactor-brief.md) before changing code.

For `agm-refactor-sql` in `readability-organization` or `strict-preserve-logic`, run the [SQL message collection gate](patterns/sql.md#message-collection-gate) after the mechanical change. Reconcile the existing error-code inventory into the active project's `messages.txt`-style artifact, but do not rename a code, add a new failure path, change a condition, query, result, transaction, side effect, or exception mapping. The message artifact is a companion definition/deployment artifact, not permission to change SQL behavior. If the touched SQL emits no user-facing code, record `no message changes` with the inspected files instead of inventing one.

## `/agm-qa`

Run in an independent verification-only QA subagent/context: product artifacts are read-only; writes are limited to `qa.md`, the QA heartbeat, and QA checkpoint/log evidence. Accept `qa_mode=fast|full`—default `fast`; escalate on the explicit triggers in [qa-and-done.md](qa-and-done.md#qa-depth-modes--fast-default--full), including `full` before the third consecutive passed-fast closure for the same coverage key. Always record mode, reason, coverage key, and fast sequence. Load the scope's pattern discipline and run its Detect gates, then map requirements to evidence, reopen product artifacts, and rerun selected executor claims at the glossary-defined proportional-verification tier. QA never deploys, mutates a database, runs servers, publishes, installs, regenerates, changes Git, or fixes findings. Return `passed`, `failed`, `blocked`, or justified `not-applicable`; never return a conditional pass.

## `/agm-create-unit-test`

Classify `target_kind` as FE main/library, BE main/library, or SQL contract from path and structure evidence per [elicitation.md](elicitation.md); declare the inferred classification in the receipt. When `target_kind=be-main`, also require `backend_profile=agmws|agmbo`. Inspect the existing test framework and local naming/mocking pattern. Cover behavior and regression risk, not implementation trivia.

When the requester has not named the behaviors to cover, run the propose-first flow: present a numbered list of behaviors and regression risks worth testing with recommended entries marked, let an authorized participant select in one reply (`approve`/`all`/numbers), and create only the selected tests. A material behavior choice requires decision-owner authority.

## `/agm-create-feature`

Require `target_kind`:

- `fe-main`
- `fe-library`
- `be-main`
- `be-library`
- `sql-table`
- `sql-procedure`
- `sql-table-and-procedure`

When `target_kind=be-main`, require `backend_profile` as exactly one of:

- `agmws`: web service/application host.
- `agmbo`: batch host using the same backend-main structure; inspect `Infrastructure/TaskScheduler.cs` when scheduling applies.

Do not use `agmws` or `agmbo` as `target_kind`, and do not invent a fallback profile.

Derive only the files required for that target. Do not assume the old controller-to-repository chain covers every target.

The objective is Tier 1 per [elicitation.md](elicitation.md): never guess what to build. Infer placement from repository evidence when possible, then propose the smallest slice plan (files to create or modify) and confirm once before building. Every file path the work will create or modify must be visible in the confirmed slice plan before the first file is written. Ask any remaining Tier 1 inputs in one batched question.

### New project scaffolding (company templates)

Creating a whole new project is not manual scaffolding: run the company `dotnet new` template in the terminal. Select the template from the classification:

- `fe-main` new app → `agmwa`
- `be-main` + `backend_profile=agmws` → `agmws`
- `be-main` + `backend_profile=agmbo` → `agmbo`

Command patterns—`<subject>` comes from the requester-confirmed name; every other value is derived from it as a recommendation, not a silent fact:

```powershell
dotnet new agmwa --name "agmwa-<subject>-ng" --app-name "agmwa-<subject>-ng" --project-key "AGMWA-<SUBJECT>-NG" --base-href "agrimap-<subject>-wa" --port-number "<42xx>" --image-name "agmwa_<subject>_ng"

dotnet new agmws --name "agmws-<subject>-netcore" --project-key "AGMWS-<SUBJECT>" --image-name "agmws_<subject>_netcore" --base-path "agmws-<subject>" --port-number "5000" --https-port-number "5001"

dotnet new agmbo --name "agmbo-<subject>-netcore" --project-key "AGMBO-<SUBJECT>" --image-name "agmbo_<subject>_netcore" --port-number "5000" --https-port-number "5001"
```

Derivation rules: `--project-key` is the name uppercased with `-netcore` dropped; `--image-name` replaces `-` with `_`; `--base-path` (agmws) is the name without `-netcore`; `--app-name` (agmwa) equals `--name`; ports default to FE `42xx` and BE `5000`/`5001` — confirm against ports already used in the workspace. Follow the current template's actual parameter set when it differs; the template is the contract, this pattern is the elicitation guide.

Gate: present the complete command plus the working directory it will run in, wait for decision-owner approval because scaffolding creates a material product boundary, then run it. Never run a scaffold command the decision owner has not seen verbatim, and never invent a parameter value outside these derivations without asking.

After generating `sql-table`, `sql-procedure`, or `sql-table-and-procedure`, run the [SQL message collection gate](patterns/sql.md#message-collection-gate). A table-only slice still performs and reports the inventory; it must not invent an error code when no table/deployment path emits one. For `be-main` and `be-library`, compose the [Back-end error/message reconciliation](backend-engineer.md#error-message-reconciliation) because BE code may define, map, or forward codes even when SQL does not. A feature with a user-facing code is not complete until the active message artifact contains an unambiguous definition and, when the project dictionary contract is proven, an idempotent deployment insert.

## `/agm-create-prompt`

Create provider-specific, execution-ready Leader, executor, and independent QA prompts using [create-prompt.md](create-prompt.md), following its staged elicitation contract (intake sweep → approach with mandatory counter-arguments → thesis refinement → understanding checklist gate → generation). Treat the approved prompt as the task execution SoT. Include separate model/role/agent/provider assignment, required skills, complete `workspace_need`, verified workspace mode, non-overlapping file ownership, branch name only when supported, file/line targets, steps, tests, deviation handling, integration artifact, and the handoff contract.

This operation only generates prompt files; it never begins executing them. Execution is a separate authorized action through `agm-exec`.

## `/agm-exec`

Execute one decision-owner-approved generated prompt as the execution source of truth.

1. Load the prompt file (`*.prompt.md`). Require `prompt_status: owner-approved`. Refuse `draft`, `superseded`, and `executed` prompts, and refuse any prompt under `.agrimap-agent/prompts/complete/` — a closed task needs a new prompt through `agm-create-prompt`.
2. Emit the activation receipt naming the prompt id, task, role, provider, and requester.
3. Follow the ordered steps exactly, checkpointing memory and logs only at glossary-defined checkpoint units rather than every tool call or file read.
4. When observed reality contradicts the prompt, stop the affected step and return `deviation_from_prompt` with evidence per [create-prompt.md](create-prompt.md); never reinterpret the prompt silently.
5. Finish with the structured Result Package and hand off to the Leader and independent verification-only QA. Never claim completion; the completion gate belongs to `validate`/`complete`.
6. Resume: when invoked with a task id whose current memory shows an in-progress state, continue from the last checkpoint instead of restarting the task.
