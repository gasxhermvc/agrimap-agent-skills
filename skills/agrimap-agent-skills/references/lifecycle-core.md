# Workflow depth core

Read this with exactly one generated `operations/<operation>.md`. Do not preload another operation, the router, or glossary. Missing input is `PACKAGE_ENTRYPOINT_MISSING`.

## Select one depth

Use only a depth allowed by the operation:

- `light`: bounded direct work; at most three product artifacts, one writer/contract, no delegation or regulated trigger. Durable task, memory, and log evidence is still mandatory.
- `standard`: resumable non-regulated work needing attribution or multiple milestones.
- `regulated`: separate QA/delegation, public/cross-service contracts, unresolved/material persisted-data decisions, security/access, shared registries/generators, destructive action, material owner decisions, or commit/publish/release.

Help and history are always `light`. Any other read-only query remains `light` unless broader coordination or verification requires promotion. Every activated operation is tracked; promote before the next product write and never demote active state.

`agm-qa` starts `depth=light qa_mode=light`. Target type, size, data relevance, prior regulated work, or provider never promotes it. Regulated QA requires tracked/release QA, correction re-QA, or the third passed-light tracked closure. Explicit full QA without tracking may stay `depth=light qa_mode=full`.

`agm-create-feature` is a special bounded-write operation and is always `light`. It still writes the mandatory task, memory, and log evidence. If scope would promote, stop before product writes and route the whole task to `agm-create-prompt`.

## Execute the selected depth

- `light`: identify the requester, start with `--depth light`, create concise task artifacts, update current memory, append created/milestone/terminal logs, use one agent, avoid separate QA, and keep the result compact.
- `standard`: identify the requester, start with `--depth standard`, emit one compact receipt, maintain phase-owned artifacts and memory, and log milestones only. Omit `qa.md`; write `result.md` at closure with QA not-applicable.
- `regulated`: start with `--depth regulated`, maintain phase-owned artifacts, load [glossary.md](glossary.md), delegate only when useful, and apply [qa-and-done.md](qa-and-done.md) before closure.

The full artifact set is a completion set, not a start scaffold. Every depth starts with `brief.md` and `checklist.md`; QA writes `qa.md` only when required after implementation; the Leader writes `result.md` last after verification and applicable QA. Never pre-create empty QA or result files.

## Milestone checkpoints

`start` owns creation and `complete|close` owns termination. Append one checkpoint only after:

1. an authorized scope/decision change;
2. a behaviorally complete acceptance slice, not a file/tool/atomic subtask;
3. delegated integration; or
4. a verification gate whose outcome changed.

Do not checkpoint reads, diagnostics, individual files/tools, unchanged retries, conversation, liveness, or planning. Combine one milestone's files/tests in one event.

## Common boundaries

- Obey operation `Mode`; product-read-only never edits product artifacts.
- Stop for unresolved material authority or unsafe/irreversible action.
- Load only routed references and one matching FE/BE/SQL pattern.
- Report consequential assumptions, changed files, verification, and concerns without copying this policy.
