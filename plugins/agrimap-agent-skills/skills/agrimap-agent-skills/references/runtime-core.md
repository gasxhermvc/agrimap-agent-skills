# Compact runtime core

This is the common runtime contract for generated `/agm-*` and `$agm-*` aliases. Read it with [glossary.md](glossary.md) and exactly one generated file under `operations/`. Do not read the umbrella `SKILL.md` during a normal alias invocation; the umbrella is only the direct/unknown-operation fallback.

## Start and authority

1. Resolve the stable target-project root and current provider (`codex|claude|gemini`).
2. Resolve and record requester identity before glossary-defined substantive work. Record requester authority, decision owner, and authority evidence separately.
3. Normalize pointed inputs and verify required coverage. Ask one batched question only for unresolved never-guess inputs named by the operation entrypoint.
4. Start the task under `<target-project>/.agrimap-agent/`; never write project state into the installed skill/plugin.
5. Return the activation receipt: `AgriMap skill active`, operation, requester, input coverage, declared inferences, exact `Patterns:` selection or `none applicable — <reason>`, and a short pre-work checklist.

## Evidence, scope, and writes

- Label material statements `FACT`, `INFERENCE`, `HYPOTHESIS`, or `UNKNOWN` with evidence.
- Follow the operation entrypoint's mode. Product-read-only operations may write only their assigned workflow artifacts. Verification-only QA may write only `qa.md`, its heartbeat/progress fallback, and QA checkpoint/log evidence.
- Before a product write, record objective, scope, non-goals, file/logical-contract ownership, authorized decisions, and proportional-verification tier.
- Load only references named by the compact operation entrypoint. For FE/BE/SQL scope, select only the matching target pattern, its manifest, and typically 1–3 matching golden files; do not load unrelated collections.

## Delegation and visible progress

- Small work uses one agent plus independent QA. Delegate only bounded independent work and use at most five active subagents.
- Current Codex releases enable subagent workflows by default. Before spawning, announce each display label, bounded task, expected output, and how the requester can inspect it: open the agent thread in the app, use `/agent` in CLI, or expand the background-agent panel in the IDE.
- Use descriptive agent labels/nicknames. Never enter a silent multi-minute wait: while agents run, continue safe local work or inspect status and report `running|completed|blocked` at least once every 60 seconds.
- Native agent-thread activity is the primary progress channel. Use `.agrimap-agent/runtime/progress/<task-id>.jsonl` only as an explicit fallback when the active provider/surface cannot expose native thread activity.
- One file and one logical contract have one writer per integration wave. The Leader owns integration, conflict resolution, QA dispatch, and final synthesis.

## Checkpoint, QA, and completion

- Append one concise checkpoint per glossary-defined durable state transition, not per read/tool call/wait poll.
- Integrate all handoffs before independent verification-only QA. A subagent `done` status is testimony, not completion evidence.
- Completion requires the schema-owned brief/checklist/QA/result fields, no unresolved template values, proportional verification, independent QA evidence, and explicit Outstanding items.
- A failed QA attempt closes as `qa-failed`; corrections use a new decision-owner-approved task/prompt.
- Commit, publish, and release boundaries require passed full QA. The same coverage key may close with passed fast QA at most twice consecutively; the third closure must be full.
