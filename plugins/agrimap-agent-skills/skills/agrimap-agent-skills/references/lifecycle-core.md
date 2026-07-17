# Workflow depth core

Read this file with exactly one generated `operations/<operation>.md`. Do not preload the glossary, router, or another operation. Missing compact input is `PACKAGE_ENTRYPOINT_MISSING`.

## Select one depth

Use only a depth allowed by the operation contract:

- `light`: help, history, read-only queries, direct `agm-qa`, or bounded work with at most three product artifacts, one logical contract/writer, no delegation, no durable-audit request, and no regulated trigger.
- `standard`: resumable non-regulated work that needs project attribution or spans multiple meaningful milestones.
- `regulated`: separate QA/delegation, public or cross-service contracts, persisted data/migration, security/access, shared registries/generators, destructive action, owner-controlled material decisions, or commit/publish/release.

Help and history are always `light`. Any other read-only query remains `light` unless the requester explicitly asks for a durable tracked artifact. Promote before the next product write when scope crosses the selected boundary; never demote active task state.

`agm-qa` is a special read-only operation: start at `depth=light` and `qa_mode=light`. The target being SQL, BE, FE, public/data-related, large, or produced by regulated work does not itself promote QA. Use `regulated` only for tracked task QA, an explicit durable/release boundary, correction re-QA, or the third passed-light tracked closure. An explicit highest-verification request without durable tracking may remain `depth=light qa_mode=full`.

## Execute the selected depth

- `light`: do not identify/persist the requester, emit a receipt, or create `.agrimap-agent` state. Use one agent, self-review or direct QA as selected, targeted proportional verification, and a concise direct result.
- `standard`: identify the requester, start with `--depth standard`, emit one compact receipt, maintain schema-owned brief/checklist/result plus task memory, and log only the milestones below. Separate QA and `qa.md` are not required; record QA fields as `not-applicable` in the result.
- `regulated`: start with `--depth regulated`, use the full artifact set, load formal terms from [glossary.md](glossary.md), delegate only when justified, and apply [qa-and-done.md](qa-and-done.md) before completion.

## Milestone checkpoints

`start` owns the created event and `complete|close` owns the terminal event. Between them, append one checkpoint only after:

1. an authorized material scope or decision change;
2. a behaviorally complete acceptance slice, not a file/tool/atomic subtask;
3. integration of a delegated handoff; or
4. a verification gate with a changed outcome.

Do not checkpoint reads, diagnostics, individual files, tool calls, unchanged retries, conversations, liveness, or planning steps that do not change the durable task state. Combine files/tests from one milestone in one event.

## Common boundaries

- Follow operation `Mode`; product-read-only never edits product artifacts.
- Stop only for unresolved material authority or an unsafe/irreversible boundary.
- Load only references named by the operation. Select one matching FE/BE/SQL pattern and only relevant examples.
- State consequential assumptions and report changed files, verification, and remaining concerns without reproducing this policy.
