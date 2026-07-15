# Memory and logs

Use `.agrimap-agent/` under the target project root as the cross-provider workspace state. Keep prose concise and factual. A globally installed Skill/plugin is stateless: never write memory, logs, identity, prompts, or task artifacts into its installation directory.

## State location

- Installed use: resolve the project currently being worked on and write both durable memory and concise logs to `<target-project>/.agrimap-agent/`.
- Skill/plugin development repository: keep that repository's entire `.agrimap-agent/` local-only with a root `.gitignore` entry. Do not publish developer logs or memory with the package.
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
    └── active/<session-id>.json
```

## Requester identity in a multi-person project

- Resolve the human requester at the first chat/session interaction. If the provider does not expose a stable session ID, create a local conversation ID before task work.
- Store live identity only in ignored `runtime/sessions/<session-id>.json`; never use one shared current-owner file.
- Copy the requester into the tracked task brief and every durable event as `requestedBy`.
- A subagent inherits `requestedBy` from its Leader handoff or session, then records `model`, `role`, `agent`, and `provider` separately.
- Never infer the current requester from the most recent project log. Ask when session identity and task identity are both missing.
- Multiple requesters may append to the same monthly log. `taskId`, `requestedBy`, `model`, `role`, `agent`, `provider`, and `timestamp` keep events attributable.

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
- `logs/YYYY-MM/<task-id>.jsonl`: durable concise event history split by task to reduce multi-person Git collisions. Memory pruning must not delete logs.

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
  "timestamp": "ISO-8601",
  "taskId": "task-id",
  "requestedBy": "human name",
  "model": "actual-model-or-unknown",
  "role": "leader|executor|qa|reviewer|analyst",
  "agent": "primary|fe|be|sql|designer|qa|custom-label",
  "provider": "codex|claude|gemini|unknown",
  "event": "created|changed|verified|decision|qa-failed|blocked|cancelled|completed",
  "summary": "concise action",
  "reason": "problem addressed",
  "files": ["path"],
  "verification": ["command/result"]
}
```

The canonical event enum is defined in `scripts/log-events.mjs`. `qa-failed` is a task outcome event; keep the QA status `failed` in `qa.md` rather than writing `failed` as a log event.

## Retention

- Clamp recent-memory retention to 10-30 days.
- Prune only `memory/recent/` entries older than the configured value.
- If `config.json` is missing or invalid, remove nothing and return a structured skipped/error result instead of throwing.
- Keep current memory, durable knowledge, decisions, task results, prompts, and logs unless the owner explicitly changes the retention policy.

## New-task transition

Before task two or any later task, check the previous result and Git status. Remind the requester to commit a completed boundary when changes remain uncommitted, then continue the newly requested work. Stop only when dirty changes overlap the new task or make its integration boundary unsafe; do not auto-commit.
