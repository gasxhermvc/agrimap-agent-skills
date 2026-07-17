# Memory and logs

## สารบัญ

- [State location](#state-location)
- [Layout](#layout)
- [Requester identity](#requester-identity-in-a-multi-person-project)
- [Memory loading policy](#memory-loading-policy-owner-decision-2026-07-16)
- [Pending issues ledger](#pending-issues-ledger--สมุดงานค้าง-owner-decision-2026-07-16)
- [Memory tiers](#memory-tiers)
- [Durable state-transition checkpoint](#durable-state-transition-checkpoint)
- [Log schema](#log-schema)
- [Audit/history query](#audithistory-query)
- [Retention](#retention)
- [New-task transition](#new-task-transition)

Use `.agrimap-agent/` under the target project root as the cross-provider workspace state. Keep prose concise and factual. A globally installed Skill/plugin is stateless: never write memory, logs, identity, prompts, or task artifacts into its installation directory.

Provider verbosity is not evidence quality. Claude/Fable, Codex/GPT, and Gemini use the same milestone count and compact field budgets; preserve decisions, results, and source pointers, not hidden reasoning or a transcript. Direct/light operations, including `agm-create-feature`, write none of this state.

## State location

- Installed use: resolve the project currently being worked on and write both durable memory and concise logs to `<target-project>/.agrimap-agent/`.
- Skill/plugin development repository: keep that repository's entire `.agrimap-agent/` local-only with a root `.gitignore` entry. Do not publish developer logs or memory with the package. Consequently, its history is available only on that machine and is not recoverable from a fresh clone; `history.auditStorage` must report this explicitly.
- Runtime identity/cache inside an ordinary target project remains ignored through `.agrimap-agent/.gitignore`; project memory, task artifacts, decisions, knowledge, prompts, and logs remain visible for the project to track.
- Do not use an AI Gateway in v1. It is neither a sink, mirror, fallback, nor completion dependency.

## Layout

```text
.agrimap-agent/
├── .gitignore                         # ignores runtime/ and cache/ in target projects
├── config.json
├── model-capability-matrix.yaml        # optional project override
├── memory/
│   ├── project.md
│   ├── current/<task-id>.md
│   └── recent/
├── knowledge/
│   ├── index.jsonl
│   ├── frontend-reuse.jsonl
│   └── service-ownership.yaml          # single project ownership SoT
├── decisions/
├── tasks/<task-id>/
│   ├── brief.md                         # contract phase
│   ├── checklist.md                     # acceptance ledger, initialized with contract
│   ├── handoffs/
│   ├── qa.md                            # verification phase, after implementation
│   ├── result.md                        # closure phase, written last
│   └── <operation deliverable>            # analysis.md | diagnosis.md | simulation.md |
│                                           # plan.md | design.md | review.md | refactor-brief.md
├── prompts/<task-id>/
├── logs/YYYY-MM/<task-id>.jsonl
└── runtime/                            # local/ignored
    ├── sessions/<session-id>.json
    ├── active/<session-id>.json
    └── hooks/<provider>-<session-id>.json
```

## Requester identity in a multi-person project

- Resolve the human requester at the first chat/session interaction and reconfirm after the configured confirmation window (default 24 hours). If the provider does not expose a stable session ID, use the provider transcript-path key consistently for hook lookup or create a stable local conversation ID before task work.
- Store live identity only in ignored `runtime/sessions/<session-id>.json`; never use one shared current-owner file.
- Store `schemaVersion`, `requestedBy`, optional `requesterId`, `identitySource`, `confirmedAt`, `expiresAt`, actual execution identity, optional configurable model label, and local audit-only `machine`/`osUser` metadata in that ignored file. Machine and OS user fields help local diagnosis only and must never become requester attribution or tracked log fields.
- Requester identity is not decision authority. Record `requester_authority`, `decision_owner`, and `authority_evidence` in the task brief; copy them into prompts/results that make or report material decisions.
- A Git `user.name` may be shown as a suggested default, but the human must confirm it. Store `identitySource=git-config-confirmed` only after confirmation; otherwise use `manual-confirmed`.
- At `standard` or `regulated` depth, copy the requester, optional requester ID, and identity source into the task brief and every durable event as `requestedBy`, `requesterId`, and `identitySource`. Preserve the exact normalized objective as `request` on the `created` event.
- A subagent inherits `requestedBy` and authority fields from its Leader handoff or session, then records configurable `modelLabel` separately from actual `model`, `role`, `agent`, and `provider`.
- Never infer the current requester from the most recent project log. Ask only when `standard` or `regulated` work lacks both session and task identity.
- Multiple requesters may append to the same monthly log. `schemaVersion`, `taskId`, requester fields, execution fields, `event`, and `timestamp` keep events attributable. If a task is active in multiple sessions, mutating commands must require `--session` rather than choosing the first runtime file.

Use `role=leader` for orchestration/integration. `frontier_analysis` remains a capability profile, not a person/agent name. Examples:

- `modelLabel=GPT-5.6-sol`, `model=<host-reported-model>`, `role=leader`, `agent=primary`, `provider=codex`;
- `modelLabel=gpt-5.4`, `model=<host-reported-model>`, `role=executor`, `agent=fe`, `provider=codex`;
- `modelLabel=fable`, `model=<host-reported-model>`, `role=qa`, `agent=qa`, `provider=claude`.

Record the actual model exposed by the running surface. If it is unavailable, use `model=unknown`; never present a configured/default model label as observed fact.

## Memory loading policy (owner decision, 2026-07-16)

Writing and loading are asymmetric by design:

- **Write by depth and milestone**: `light` writes none. `standard`/`regulated` append one event and update current memory only at the milestone types below; start and terminal commands write their own events.
- **Load on demand**: hooks inject only active-task memory, never the full project memory into unrelated work. Reopen project/current memory after compaction, an external-change pointer, or when tracked context is required.
- **Honest expectation**: session memory is a งานตกค้าง-and-project-facts summary, not deep recall. Cross-session "knowing the owner's mind" is a harness-level capability, not something these rules can or should fake with heavier context injection.

## Pending issues ledger — สมุดงานค้าง (owner decision, 2026-07-16)

Workflow นี้ปิดงานเป็นงาน ๆ แม้ยังมีบัค/issue เหลือ (เปิด task ใหม่แทนการลากงานเดิม) — ledger นี้คือที่อยู่ของ "ข้อที่ยังไม่ทำ" เพื่อไม่ให้หายไปกับ context:

Maintain a `## Pending issues` section inside `.agrimap-agent/memory/project.md` (already loaded once per session by the hook — no extra plumbing). One line per item:

```markdown
## Pending issues
- [ ] 2026-07-16 · from 20260716-task-x · map-viewer แสดง layer ผิดลำดับเมื่อ filter ซ้อน · src/app/features/map-viewer/... · severity: med
- [x] 2026-07-15 · from 20260715-task-y · resolved by 20260716-task-z
```

**Lifecycle (บังคับสามจังหวะ):**

1. **เจอระหว่างงาน → ทัก + จด, ห้ามทำตอนนั้น**: เมื่อพบปัญหา/บัค/debt นอก scope ปัจจุบัน (รวม terminal QA closure ที่แก้ใน task เดิมไม่ได้) — บอก owner สั้น ๆ ในแชท, append หนึ่งบรรทัดลง ledger, แล้วกลับมางานเดิม. QA finding ที่แก้ได้ภายใน authorized scope ไม่ใช่ follow-on issue. การจดลง ledger คือรูปธรรมของกฎ "record follow-on concerns separately" — ไม่ใช่เขียนไว้ในแชทเฉย ๆ แล้วหาย.
2. **เริ่มงาน → เตือน + reconcile**: session-start memory load ทำให้ ledger โผล่เอง; ก่อนเริ่มงานให้กวาดดูรายการเปิด — งานปัจจุบันจะแก้ข้อไหนได้ให้บอก, ข้อไหนถูกงานอื่นแก้ไปแล้วให้ mark `[x]` พร้อม task ที่แก้.
3. **ปิดงาน → สรุปเสมอ**: ทุก result/รายงานปิดงาน ลงท้ายด้วยส่วน **"Outstanding items"** — รายการค้างที่ยังเปิดอยู่ (ของเก่า + ที่เกิดใหม่ในงานนี้) หรือระบุชัดว่า `no pending issues`. ห้ามปิดงานเงียบ ๆ โดยไม่แตะเรื่องนี้.

Ledger เก็บเฉพาะ "ปัญหาที่รอเปิดงาน" — ไม่ใช่ tech-debt catalog ถาวร; ข้อที่ owner ตัดสินใจไม่ทำแล้วให้ลบออกพร้อมหมายเหตุสั้น ๆ.

## Memory tiers

- `memory/project.md`: current project-wide facts and pointers; update only when the project context changes.
- `memory/current/<task-id>.md`: only facts required to continue that active task. Update after each glossary-defined milestone so concurrent tasks do not overwrite each other.
- `memory/recent/`: task snapshots retained for 10-30 days; default to 30.
- `knowledge/index.jsonl`: durable facts and pointers that remain useful across tasks.
- `knowledge/service-ownership.yaml`: the only project service/data ownership map; task artifacts point to `service_id` instead of copying it.
- `decisions/`: owner-approved decisions and trade-offs.
- `logs/YYYY-MM/<task-id>.jsonl`: durable concise event history split by task to reduce multi-person Git collisions. Memory pruning must not delete logs. “Durable for the team” requires these files to be tracked and committed; a local ignored/untracked log is durable only for that filesystem.

Do not use generated provider memory as the only copy of a required rule or project decision.

Write durable knowledge as JSONL with `id`, `type`, `status`, `summary`, `keywords`, `source`, `updatedAt`, `updatedBy`, and normalized `vectorReadyText`. Keep source pointers so the Leader can re-verify a fact before using it. A vector database is optional; `knowledge/index.jsonl` remains the deterministic source when no vector service exists.

## Durable milestone checkpoint

`start` records creation and `complete|close` records the terminal event. Between them append one checkpoint only for `scope-decision`, `acceptance-slice`, `integration`, or `verification-gate`. The acceptance slice must cross an observable acceptance boundary; it is not each atomic task or file. Do not checkpoint reads, diagnostics, planning steps, individual files, tool calls, unchanged retries, liveness, or conversations. Record:

- objective and status;
- files/symbols affected;
- behavior changed or preserved;
- decision and reason;
- commands/tests and results;
- remaining concerns;
- knowledge worth retaining.

The workspace script compacts checkpoint fields provider-neutrally: summary 240 characters, reason and concerns 400 each, at most 8 verification items of 300 characters each. Put longer evidence in a task artifact or product-owned file and record its path instead of copying it into memory/logs.

## Log schema

Append one JSON object per line:

```json
{
  "schemaVersion": 3,
  "timestamp": "2026-07-15T09:20:31.123Z",
  "taskId": "task-id",
  "requestedBy": "human name",
  "requesterId": "optional-stable-human-id-or-null",
  "identitySource": "manual-confirmed|git-config-confirmed|legacy-migrated",
  "model": "actual-model-or-unknown",
  "modelLabel": "optional-configurable-routing-label",
  "role": "leader|executor|qa|reviewer|analyst",
  "agent": "primary|fe|be|sql|designer|qa|custom-label",
  "provider": "codex|claude|gemini|unknown",
  "event": "created|changed|verified|decision|qa-finding|qa-failed|blocked|cancelled|completed",
  "milestone": "scope-decision|acceptance-slice|integration|verification-gate",
  "summary": "concise action",
  "reason": "problem addressed",
  "files": ["path"],
  "verification": ["command/result"],
  "skillsUsed": ["agm:patterns/sql", "agm:golden/sql"],
  "gitHead": "40-or-64-character-commit-id-or-null",
  "gitDirty": false
}
```

`skillsUsed` is an **optional observability field**: the registry IDs from [skill-registry.md](skill-registry.md) naming which skill modules actually informed this step, so a human reading the log can see "this step was reasoned with these skills". List only modules that materially shaped the step, ordered by influence. Its absence never invalidates an event, and it is not a validation gate — but when present, IDs must come from the registry, never invented.

The first event for every new task is `created` and also contains `request`, the durable normalized statement of what the human asked for. Timestamps are ISO-8601 UTC and logs are append-only. Schema v2 added explicit `gitHead`/`gitDirty` plus nonblank files for `changed`; schema v3 adds `workflowDepth` and a canonical `milestone` on intermediate checkpoints. Older v1/v2 records remain readable without retroactive fields. Closure carries forward files only from valid versioned non-terminal events; Git context is not proof of authorship.

For a current run, `provider` is exactly `codex`, `claude`, or `gemini`; provider-specific hooks pass that value explicitly and runtime guard logic corrects a stale cross-loaded Codex/Claude hook. `provider=unknown` remains readable only for legacy/imported or pre-resolution audit data and cannot satisfy the task-artifact completion schema.

The canonical event enum is defined in `scripts/log-events.mjs`; event semantics and the one-correction boundary live only in [qa-and-done.md](qa-and-done.md). Keep QA status `failed` in `qa.md`; never invent a bare `failed` log event.

## Audit/history query

Use the tracked logs for chronology and task memory/briefs for supporting detail:

```powershell
node <skill>\scripts\agm-workspace.mjs history --cwd . --from 2026-07-01 --to 2026-07-15
node <skill>\scripts\agm-workspace.mjs history --cwd . --requester Billy --days 5
```

The result groups matching events into `requesters` and `tasks`, retains exact `events[].timestamp` values, adds normalized `events[].timestampUtc`, and aggregates task `executors`, `recordedFiles`, `legacyClaimedFiles`, `gitHeads`, and paths to brief/checklist/QA/result/current/recent artifacts. `recordedFiles` comes only from valid versioned non-terminal events; `legacyClaimedFiles` is diagnostic evidence that is never promoted into versioned attribution. `attributionSemantics` states what each identity proves; `auditStorage` reports whether logs are ignored, untracked, partially tracked, dirty, or recoverable from the current commit. `--from` is inclusive. A bare `--to` date includes the entire UTC calendar day; an ISO timestamp is inclusive to that instant and must include `Z` or an explicit UTC offset. `--days` is a rolling number of 24-hour periods.

Invalid versioned records are excluded from authoritative events and reported through `invalidLines`; legacy unversioned records remain visible with `evidenceLevel=legacy-unverified`. Never infer actual editor/commit authorship from requester or workflow execution fields. For that question, correlate the task evidence with Git history or blame and report the two evidence sources separately. Project-controlled JSONL is append-only by workflow contract but is not cryptographically tamper-evident; use Git history or an external immutable audit system when adversarial integrity matters.

## Retention

- Clamp recent-memory retention to 10-30 days.
- Prune only `memory/recent/` entries older than the configured value.
- If `config.json` is missing or invalid, remove nothing and return a structured skipped/error result instead of throwing.
- Keep current memory, durable knowledge, decisions, task results, prompts, and logs unless the owner explicitly changes the retention policy.

## New-task transition

Before task two or any later task, check the previous result and Git status. Remind the requester to commit a completed boundary when changes remain uncommitted, then continue the newly requested work. Stop only when dirty changes overlap the new task or make its integration boundary unsafe; do not auto-commit.
