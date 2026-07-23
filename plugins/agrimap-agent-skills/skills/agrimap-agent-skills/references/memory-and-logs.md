# Memory, tasks, prompts, reports, and logs

All operational state belongs under `<target-project>/.agrimap-agent/`. A globally installed package is stateless and must never receive project memory, prompts, tasks, reports, identity, or logs. Repository-specific `AGENTS.md` rules apply only in the repository that contains them; they are not exported as target-project behavior.

## Canonical layout

```text
.agrimap-agent/
├── memory/
│   ├── project.md
│   ├── current/YYYY-MM/<ddHHmmss>-<slug>.md
│   └── recent/YYYY-MM/<ddHHmmss>-<slug>.md
├── tasks/
│   ├── YYYY-MM/<task-id>/{brief,analysis,checklists,qa,result}.md
│   ├── complete/YYYY-MM/<task-id>/...
│   └── cancelled/YYYY-MM/<task-id>/...
├── prompts/
│   └── YYYY-MM/<session-id|context-id|room-id>/
│       ├── history.md
│       └── <context>-vNNN.md
├── instructions/YYYY-MM/<task-id>/<role>.prompt.md
├── reports/YYYY-MM/<ddHHmmss>-<context>.md
├── logs/YYYY-MM/YYYY-MM-DD.jsonl
└── runtime/                         # ignored live identity/active/reservation state
```

`task_id` and the execution run ID use project-local `ddHHmmss`. Atomic reservation must reject a same-second collision instead of merging executions. Legacy paths remain readable, but all new writes use the canonical layout.

## Deterministic memory lifecycle

- `recent`: create at every started execution. Append only concise decisions, acceptance milestones, verification outcomes, and terminal status. It is a thought/result journal, not a transcript or raw tool log.
- `current`: create at start. It contains only the state required to resume work: objective, latest milestone, relevant files/evidence, concerns, and next action. A blocked execution remains here. Completion, cancellation, or terminal failure removes it.
- `project.md`: update only at terminal close or when a durable project-wide fact changes. Terminal close appends one short dated note containing outcome, objective, execution/task ID, and report pointer. Do not copy full results.

This transition is mechanical, not model discretion: `start → current+recent`, `checkpoint → rewrite current+append recent`, `blocked → keep current`, `terminal → finalize recent+report+project note+delete current`.

## Raw history and Prompt Result contracts

`prompts/YYYY-MM/<conversation-id>/history.md` stores every verbatim requester submission captured at `UserPromptSubmit` for that conversation, without AI answers:

```text
### [2026-07-21 11:46:07]
<verbatim requester prompt>
```

Versioned model Prompt Results use `prompts/YYYY-MM/<conversation>/<context>-vNNN.md` and follow [prompt.md](prompt.md). V0 has no file; the first finalized model result is V1. Prior versions are immutable, keep their original period, and are never moved when a task closes.

Do not store AI answers, generated executor prompts, QA prompts, task artifacts, tool output, or model reasoning in raw history. Execution-generated operational instructions go to `instructions/`; a one-file Prompt Result may describe Main/Subagent ownership but does not create those role files.

## Daily JSONL audit schema

Append one valid JSON object per line to the project-local daily file. Writes use a cross-process lock and ISO-8601 UTC timestamps; the folder/date is computed in the configured project time zone.

```json
{
  "schema_version": 4,
  "timestamp": "2026-07-21T04:46:07.171Z",
  "execution_id": "21074607",
  "task_id": null,
  "workflow_depth": "light",
  "requester": "006006",
  "requester_id": null,
  "identity_source": "manual-confirmed",
  "model": "gpt-5.6-sol",
  "model_label": "not-configured",
  "role": "leader",
  "agent": "primary",
  "provider": "codex",
  "event": "created",
  "log_type": "request",
  "message": "Started analyze execution.",
  "reason": "Inspect the requested scope.",
  "request": "Inspect the requested scope.",
  "files": [],
  "verification": [],
  "git_head": null,
  "git_dirty": null
}
```

For `light`, `task_id` is `null`; for `standard|regulated`, it is required. `workflow_depth` is always `light|standard|regulated`. `log_type` is `request|action|decision|verification|result|error`. Intermediate events additionally carry canonical milestone when required. Schema v1-v3 remains readable without rewriting history.

Canonical events: `created|changed|verified|decision|qa-finding|qa-failed|blocked|cancelled|completed`

Canonical milestones: `scope-decision|acceptance-slice|integration|verification-gate`

Logs are concise machine chronology, not project documentation, memory loaded every turn, prompt-template storage, raw telemetry, or a human report. Human terminal summaries live in `reports/`.

## Requester identity and history

Persist confirmed session identity under ignored `runtime/sessions/<session-id>.json`. Never infer the requester from machine, OS, Git identity, or the most recent log. Keep actual `model` separate from configured `model_label`.

`history` normalizes legacy and v4 events, reports invalid lines, storage durability, requester/executor semantics, claimed files, and available brief/analysis/checklists/QA/result/memory/report paths. Workflow file claims are not Git authorship proof.

## Retention and migration

Prune `memory/recent` recursively according to the configured 10–30 day retention. Never prune project memory, current memory, tasks, reports, raw history, Prompt Results, or audit logs through the recent-memory command. Do not bulk-move legacy state automatically; read legacy paths and write only the new format.
