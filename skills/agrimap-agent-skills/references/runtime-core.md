# Compact runtime and lifecycle

Read this file with [glossary.md](glossary.md) and exactly one generated `operations/<operation>.md`. Do not load the routing `SKILL.md`. Missing compact input is `PACKAGE_ENTRYPOINT_MISSING`.

## Choose one lifecycle before task work

Use the operation entrypoint's `Lifecycle` value:

- `stateless`: answer from existing evidence without requester persistence or `.agrimap-agent` task artifacts.
- `tracked-only`: use the tracked lane below.
- `lightweight-eligible`: use lightweight only when every eligibility condition below is proven; otherwise use tracked.

Lightweight eligibility requires all of these:

- at most three product artifacts, one logical contract, and one writer;
- no active tracked task/prompt dependency and no delegation;
- no public contract, persisted data/migration, security/access, cross-service ownership, shared registry/generator, destructive action, or commit/publish/release boundary;
- no unresolved material choice or owner decision;
- no requester demand for durable audit, task artifacts, or separate QA.

Inspection may establish eligibility. If uncertain, or if scope grows, promote to tracked before the next product write.

## Lightweight lane

1. Use the current request as the objective; do not ask for or persist requester identity solely for workflow attribution.
2. Do not emit an activation receipt. Do not create brief, checklist, memory, log, QA, prompt, or result artifacts.
3. Load only the operation and matching technical references, perform the bounded work with one agent, then self-review and run proportional targeted verification.
4. Return a concise outcome, changed files when any, verification results, and remaining concerns.

## Tracked lane

1. Resolve the project root, provider, requester authority, decision owner, inputs, scope, non-goals, and selected patterns.
2. Start `.agrimap-agent` task state and emit one compact activation receipt.
3. Use the schema-owned brief/checklist and append checkpoints only for durable state transitions.
4. Load [subagents-and-branches.md](subagents-and-branches.md) only if delegation is justified.
5. Before tracked completion, load [qa-and-done.md](qa-and-done.md) and apply its canonical QA/result contract.
6. Complete only through the schema validator; commit/publish/release requires passed full QA.

## Common boundaries

- Follow the operation `Mode`: product-read-only operations never modify product artifacts; verification-only mode follows the canonical QA contract; product-write mode stays inside the confirmed scope.
- Label material claims `FACT`, `INFERENCE`, `HYPOTHESIS`, or `UNKNOWN` with evidence.
- Load only references named by the operation entrypoint. For FE/BE/SQL, select the matching pattern and typically 1–3 relevant golden files rather than whole collections.
- Stop for a decision owner only when a material choice remains unresolved; routine reversible work inside scope needs no extra permission.
