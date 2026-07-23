# Elicitation and parameter resolution

## สารบัญ

- [Resolution ladder](#resolution-ladder)
- [Tiers](#tiers)
- [Batched questions](#batched-questions)
- [Do not rush](#do-not-rush)
- [Per-operation resolution](#per-operation-resolution)
- [Propose-first creation](#propose-first-creation)
- [Refactor mode menu](#refactor-mode-menu)

Reduce parameter hallucination. An agent must never invent an input value that changes a behavior contract. This discipline defines how every operation resolves its inputs from a short, friendly command, and when and how to ask.

## Resolution ladder

Resolve each input in this order and stop at the first source that answers it:

1. Explicit `key=value` arguments. This is the power-user shortcut and always wins.
2. Host-native mentions and attachments (`@file`, drag-drop, attach) normalized per [input-and-scope.md](input-and-scope.md).
3. Free-text intent: remaining natural language supplies `objective`, `symptom`, `scenario`, or scope narrowing.
4. Repository and session evidence: pointed file extensions and paths, project structure (`.sln`/`.csproj` → BE, `angular.json`/`*.component.ts` → FE, `projects/`/`libs/` → library, `sql/` → SQL), host project profile, the active task, and `.agrimap-agent` state.
5. Fixed defaults (Tier 3 below).
6. One batched question for the remaining Tier 1 inputs.

## Tiers

| Tier | Rule | Inputs |
| --- | --- | --- |
| 1 — never guess | No direct evidence → ask in one batch. Never default silently; a wrong value changes contracts, data, or behavior. | domain `action` when read/write or create/edit intent is ambiguous, `target_kind`, `backend_profile`, `refactor_mode`, `provider` for create-prompt, new project/artifact names, the objective of any creation work, and the destination of a new project scaffold |
| 2 — infer and declare | Infer from evidence, state the inferred value in the activation receipt, and proceed; the requester corrects cheaply. | `phase`, review scope, inferred target files, objective refinements |
| 3 — fixed default, never ask | The discipline supplies it. | analyze/diagnose/simulate/plan/design/architect/review/history/qa are product-read-only and never edit product artifacts; each may write only its assigned workflow artifacts. Implementation requires a write operation requested within recorded authority. |

Direct evidence for Tier 1 means a pointed file's path or extension, an existing host project, or an explicit statement in the request. A plausible-sounding value is not evidence.

## Batched questions

When Tier 1 inputs remain unknown, ask once for all of them together:

- Number every question. Give numeric options. Mark the recommended value when one exists.
- The requester answers non-material input questions in one line, positionally (`1 2 approve`) or with `key=value` overrides. A material choice requires the recorded decision owner or requester authority=`owner|delegated`.
- `approve` accepts every recommended value.
- Ask at most one follow-up batch when the reply is still ambiguous, then summarize the unresolved point instead of looping.

Example:

```text
Requester: /agm-create-prompt provider=codex สร้าง project template ใหม่ให้หน่อย ขอชื่อ publisher

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

New project scaffolds always exceed direct/light scope. Route them through `agm-create-prompt`, place the exact company `dotnet new agmwa|agmws|agmbo` command and working directory in the approved executor prompt, and run it only through `agm-exec` after decision-owner approval. For direct work inside an existing repository, the destination needs no question—every created or modified path is already visible in the confirmed slice plan.

## Do not rush

A generated analysis, plan, proposal list, or prompt is never permission to execute. Never auto-advance past an authority gate: batched answers require the requester's actual reply; material approvals and explicit go-signals require the decision owner or requester authority=`owner|delegated`. Analysis-family operations never edit product artifacts even when a fix looks obvious; return the finding while writing only their assigned workflow artifacts.

## Per-operation resolution

| Operation | Bare usage | Inferred (Tier 2) | Ask only when |
| --- | --- | --- | --- |
| `agm-analyze` | `@file` or a plain question | targets from mentions/paths; objective from free text | no target and no question at all |
| `agm-diagnose` | free text is the symptom | targets discovered from the symptom | the symptom is empty or contradictory |
| `agm-simulate` | free text is the scenario | inputs/observables derived from the scenario | the scenario is empty |
| `agm-plan` | free text is the objective | dependencies from the repository | the objective is empty |
| `agm-design` | free text is the objective | `target_kind` from repo evidence; `phase` declared in the receipt | FE/BE placement is genuinely ambiguous |
| `agm-architect` | free text is the boundary question | affected decisions from frontmatter lookup | the objective is empty |
| `agm-review` | `@file` alone works | scope defaults to correctness → regressions → contracts/data → tests; free text narrows it (for example "ตรวจคำผิด") | no target |
| `agm-history` | free text maps to filters ("ของ Billy 7 วันล่าสุด" → `--requester Billy --days 7`) | UTC boundaries from bare dates | person/time range stays ambiguous |
| `agm-fe` / `agm-be` | explicit `action=analyze|design|create|edit|test` or a clear natural-language verb | target/profile/phase from path and repository evidence; passive test advice for every action | read versus write, create versus edit, or target/profile remains ambiguous |
| `agm-sql` | explicit `action=analyze|design|create|edit|explain` or a clear natural-language verb | SQL object kind, schema, and callers from repository evidence | read versus write, create versus edit, or object placement remains ambiguous |
| `agm-refactor` | `target=fe|be|sql` plus free text that selects a mode | target from pointed path; mode from intent when exactly one mode matches | target or mode cannot be resolved exactly |
| `agm-refactor` | free text may select the mode and domain | mode from intent ("เร็วขึ้น" → performance, "อ่านง่าย" → readability, "แก้บั๊ก X" → targeted-bug-fix); `target_kind` from intent + path; `backend_profile` from the host project | intent does not select exactly one mode/domain, or the profile cannot be found |
| `agm-qa` | bare works with an active task | `task_id` from the active task; product artifacts read-only and QA workflow writes are fixed | no active task and no `task_id` |
| `agm-create-prompt` | needs the objective; owns tracked brief/checklist | task context swept from the conversation and `.agrimap-agent` state | `provider` and any unresolved Tier 1 input |
| `agm-exec` | needs the prompt file or a resumable task id | resume point from task memory | the prompt path/task id is missing |

## Propose-first creation

Domain `create`, `edit`, and explicit FE/BE `test` actions embed bounded passive analysis/design; do not require a separate analysis task first. Unit-test generation is a passive capability: required for complex/high-risk behavior, recommended for simpler logic when value is plausible, and not-applicable for product-read-only or non-executable changes.

- Unit tests: passive FE/BE test advice classifies the target, existing framework, behavior branches, and regression risks but never writes. Explicit `action=test` or an unambiguous request to create tests supplies write intent. Present a numbered list with recommended entries when coverage is unspecified; accept `approve`, `all`, or numbers such as `1 2 5`. Skip the proposal when the requester already named the behaviors to cover, and create only the requested or selected tests.
- Features: the objective is Tier 1 and never guessed. Infer placement from evidence, propose the smallest slice plan (files to create or modify), and confirm once. Build directly only when the entire slice remains light; when it needs more than three product artifacts, tracking, delegation, separate QA, or material owner decisions, route the unexecuted slice to `agm-create-prompt`.

## Refactor mode menu

When the request does not select exactly one mode, present every enum in one reply and require one answer. Mark one as `Recommended`; never collapse or omit a mode:

```text
เลือก refactor mode หนึ่งค่า ตอบเลขหรือ enum:
1 = performance-preserve-behavior — ปรับ performance จาก baseline/metric โดยคงผลและพฤติกรรมภายนอก
2 = readability-organization — ปรับความอ่านง่าย โครงสร้าง หรือ duplication โดยไม่เปลี่ยนพฤติกรรม
3 = strict-preserve-logic — ปรับเชิงกลเท่านั้น; คง logic, ลำดับ, transaction, query และผลลัพธ์
4 = strict-allow-logic-change — เปลี่ยน logic ได้เฉพาะ trade-off ที่ decision owner อนุมัติก่อน
5 = targeted-bug-fix — แก้เฉพาะ defect ที่พิสูจน์แล้วพร้อม regression evidence
```

A full rewrite is not a refactor. Route "เปลี่ยนทั้งหมด" requests to `agm-plan`/`agm-architect`, then use `agm-fe|agm-be|agm-sql action=create|edit` only for a light slice or `agm-create-prompt` for tracked execution, so the word refactor never becomes a back door for rebuilding a system.
