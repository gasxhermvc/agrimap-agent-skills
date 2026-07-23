# Workflow lifecycle core

Read this file with exactly one generated `operations/<operation>.md`. A missing compact route is `PACKAGE_ENTRYPOINT_MISSING`.

## Select `workflow_depth`

- `light`: bounded direct or product-read-only work, one execution context, no regulated trigger. It creates memory and daily audit events but **must not create anything under `tasks/**`**.
- `standard`: resumable tracked work that needs the five task artifacts but no regulated boundary.
- `regulated`: tracked work involving separate assurance, public/cross-service contracts, security/access, persisted-data decisions, shared generators/registries, destructive action, material owner decisions, or commit/publish/release.

Help and history remain light diagnostics and do not start a new lifecycle merely to answer a query. Other operations start execution state before substantive work. Promote before the next product write; never demote active state.

`workflow_depth` and `qa_mode` are separate. Use `qa_mode=not-applicable|light|full`; regulated work selects light or full assurance according to [qa-and-done.md](qa-and-done.md).

For `action-routed` operations, resolve one action before target inspection. `analyze`, `design`, and SQL `explain` are product-read-only. `create`, `edit`, and explicit FE/BE `test` are product-write. Passive capability activation never grants write authority.

## Persistence by depth

Every started execution writes:

- `memory/current/YYYY-MM/<ddHHmmss>-<slug>.md` while work is active;
- `memory/recent/YYYY-MM/<ddHHmmss>-<slug>.md` as a concise execution journal;
- `logs/YYYY-MM/YYYY-MM-DD.jsonl` created, milestone, and terminal events.

Only `standard|regulated` write `tasks/YYYY-MM/<task-id>/`, where `task_id=ddHHmmss` and the completion set is exactly:

1. `brief.md`
2. `analysis.md`
3. `checklists.md`
4. `qa.md`
5. `result.md`

Start scaffolds only `brief.md` and `checklists.md`. Analysis is written after inspection, QA during verification, and result last. On success move the folder to `tasks/complete/YYYY-MM/<task-id>/`; on cancellation or terminal QA failure move it to `tasks/cancelled/YYYY-MM/<task-id>/`. A blocked execution stays active and keeps current memory.

## Terminal lifecycle

On completion:

1. append the terminal daily JSONL event;
2. finalize recent memory;
3. write `reports/YYYY-MM/<ddHHmmss>-<context>.md`;
4. append one short dated pointer to `memory/project.md`;
5. remove the matching current-memory file;
6. move tracked task artifacts to `tasks/complete/`.

Raw requester submissions are append-only input evidence under `prompts/YYYY-MM/<conversation-id>/history.md` and never include AI answers. Immutable Prompt Results use `prompts/YYYY-MM/<conversation-id>/<context>-vNNN.md`. Completion never moves or rewrites either. Execution-generated executor/QA instructions belong under `instructions/YYYY-MM/<task-id>/`.

## Milestone checkpoints

`start` owns `created`; `complete|close` owns terminal events. Checkpoint only an authorized scope decision, behaviorally complete acceptance slice, delegated integration, or verification gate whose outcome changed. Do not checkpoint reads, tools, individual files, planning chatter, unchanged retries, liveness, transcripts, or raw outputs.

## Boundaries

- Memory excludes transcripts, raw tool output, every prompt invocation, hidden chain-of-thought, and facts without a valid source.
- Tasks exclude permanent cross-task knowledge, raw telemetry, copied prompt templates, and project-wide changelogs.
- Logs are not project documentation, startup memory, prompt storage, or a human narrative report.
- Obey the operation mode: product-read-only never edits product artifacts.
- Stop for unresolved material authority or unsafe/irreversible action.
