# Memory and logs

Use `.agrimap-agent/` under the target project root as the cross-provider workspace state. Keep prose concise and factual. A globally installed Skill/plugin is stateless: never write memory, logs, identity, prompts, or task artifacts into its installation directory.

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
│   ├── brief.md
│   ├── checklist.md
│   ├── handoffs/
│   ├── qa.md
│   └── result.md
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
- Store `schemaVersion`, `requestedBy`, optional `requesterId`, `identitySource`, `confirmedAt`, `expiresAt`, execution identity, and local audit-only `machine`/`osUser` metadata in that ignored file. Machine and OS user fields help local diagnosis only and must never become requester attribution or tracked log fields.
- A Git `user.name` may be shown as a suggested default, but the human must confirm it. Store `identitySource=git-config-confirmed` only after confirmation; otherwise use `manual-confirmed`.
- Copy the requester, optional requester ID, and identity source into the tracked task brief and every durable event as `requestedBy`, `requesterId`, and `identitySource`. Preserve the exact normalized objective as `request` on the `created` event.
- A subagent inherits `requestedBy` from its Leader handoff or session, then records `model`, `role`, `agent`, and `provider` separately.
- Never infer the current requester from the most recent project log. Ask when session identity and task identity are both missing.
- Multiple requesters may append to the same monthly log. `schemaVersion`, `taskId`, requester fields, execution fields, `event`, and `timestamp` keep events attributable. If a task is active in multiple sessions, mutating commands must require `--session` rather than choosing the first runtime file.

Use `role=leader` for orchestration/integration. `frontier_analysis` remains a capability profile, not a person/agent name. Examples:

- `model=gpt-5.6-sol`, `role=leader`, `agent=primary`, `provider=codex`;
- `model=gpt-5.4`, `role=executor`, `agent=fe`, `provider=codex`;
- `model=fable`, `role=qa`, `agent=qa`, `provider=claude`.

Record the actual model exposed by the running surface. If it is unavailable, use `model=unknown`; never present a configured/default model label as observed fact.

## Memory tiers

- `memory/project.md`: current project-wide facts and pointers; update only when the project context changes.
- `memory/current/<task-id>.md`: only facts required to continue that active task. Update immediately after every atomic task so concurrent tasks do not overwrite each other.
- `memory/recent/`: task snapshots retained for 10-30 days; default to 30.
- `knowledge/index.jsonl`: durable facts and pointers that remain useful across tasks.
- `knowledge/service-ownership.yaml`: the only project service/data ownership map; task artifacts point to `service_id` instead of copying it.
- `decisions/`: owner-approved decisions and trade-offs.
- `logs/YYYY-MM/<task-id>.jsonl`: durable concise event history split by task to reduce multi-person Git collisions. Memory pruning must not delete logs. “Durable for the team” requires these files to be tracked and committed; a local ignored/untracked log is durable only for that filesystem.

Do not use generated provider memory as the only copy of a required rule or project decision.

Write durable knowledge as JSONL with `id`, `type`, `status`, `summary`, `keywords`, `source`, `updatedAt`, `updatedBy`, and normalized `vectorReadyText`. Keep source pointers so the Leader can re-verify a fact before using it. A vector database is optional; `knowledge/index.jsonl` remains the deterministic source when no vector service exists.

## Atomic checkpoint

After a Leader task or delegated subtask, record:

- objective and status;
- files/symbols affected;
- behavior changed or preserved;
- decision and reason;
- commands/tests and results;
- remaining concerns;
- knowledge worth retaining.

## Log schema

Append one JSON object per line:

```json
{
  "schemaVersion": 2,
  "timestamp": "2026-07-15T09:20:31.123Z",
  "taskId": "task-id",
  "requestedBy": "human name",
  "requesterId": "optional-stable-human-id-or-null",
  "identitySource": "manual-confirmed|git-config-confirmed|legacy-migrated",
  "model": "actual-model-or-unknown",
  "role": "leader|executor|qa|reviewer|analyst",
  "agent": "primary|fe|be|sql|designer|qa|custom-label",
  "provider": "codex|claude|gemini|unknown",
  "event": "created|changed|verified|decision|qa-failed|blocked|cancelled|completed",
  "summary": "concise action",
  "reason": "problem addressed",
  "files": ["path"],
  "verification": ["command/result"],
  "gitHead": "40-or-64-character-commit-id-or-null",
  "gitDirty": false
}
```

The first event for every new task is `created` and also contains `request`, the durable normalized statement of what the human asked for. Timestamps are generated at append time as ISO-8601 UTC and logs are append-only. Schema v2 requires explicit `gitHead`/`gitDirty` repository context (both may be `null` outside Git) and requires every `changed` checkpoint to contain at least one nonblank claimed affected file. Completed/non-complete closure events carry forward unique files only from valid versioned, non-terminal task events; invalid, legacy-unverified, and earlier terminal records cannot supply carried attribution. Those Git fields are context, not proof that the logged requester or executor authored that commit. Completion validation keeps schema v1 readable without retroactively imposing the v2 Git or changed-file rules, while rejecting incomplete attribution/execution/time fields or a missing created request in every versioned event.

The canonical event enum is defined in `scripts/log-events.mjs`. `qa-failed` is a task outcome event; keep the QA status `failed` in `qa.md` rather than writing `failed` as a log event.

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
