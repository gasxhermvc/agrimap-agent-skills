# Canonical regulated QA and completion

This file is the single policy source for `regulated` QA, correction, and completion. `light` and `standard` do not load it; standard completion uses proportional self-verification with QA marked not applicable.

## Verifier boundary

Use a verifier context that did not write the product change. Product artifacts are read-only. It may write only the current `qa.md`, its checkpoint/log evidence, and an explicitly declared progress fallback. It never fixes findings, changes scope/checklists/prompts, deploys, mutates data, runs servers, installs, publishes, regenerates, or mutates Git.

Allowed checks are non-mutating inspection, pattern Detect gates, parse/static validation, typecheck/lint, and existing build/tests proportional to risk. If required evidence needs a forbidden action, return `blocked`.

## QA depth

| Mode | Evidence | Use |
| --- | --- | --- |
| `fast` | pattern gates, diff/requirements, parse/typecheck/lint; no suite/full build | default tracked iteration |
| `full` | fast evidence plus proportional build/tests/integration checks | commit/publish/release; public/data/migration/generated boundary; re-QA; third same-key closure after two fast passes; authorized request |

Record mode, reason, coverage key, and fast sequence. Passed full resets sequence to `0`; passed fast may close only at `1` or `2`.

## Verification sequence

1. Reopen the objective, authorized decisions, checklist, integrated artifacts, and selected scope pattern.
2. Treat the implementation Result Package as testimony; inspect actual files/diff.
3. Map requirements to evidence and rerun one primary-path plus one risk-focused claim when available.
4. Inspect affected callers, contracts/data, regression surface, and required companion artifacts.
5. Record exact commands/results, limitations, and findings without product edits.

Conditional technical evidence belongs to the selected FE/BE/SQL pattern, not this file. Load only that pattern's relevant Detect gates and manifest entries.

## Status and one correction cycle

- `passed`: required evidence exists and no blocking defect remains.
- `failed`: a reproducible defect or missing required item remains.
- `blocked`: required external evidence or authorized decision is unavailable.
- `not-applicable`: only for a product-read-only artifact with a recorded reason.

There is no conditional pass. On the first failure, end the verifier context, preserve the finding in `qa.md`, and append non-terminal `qa-finding`. The assigned writer may correct once in the same task only within existing scope/acceptance and without a new material decision; then a fresh verifier runs full QA. A repeated failure or correction outside that boundary closes without completion and moves to a new approved task. The terminal audit event is `qa-failed`.

## Regulated completion gate

Complete only when:

- scope/checklist and authorized decisions are reconciled;
- proportional verification passed;
- the latest verifier passed or justified not-applicable, with required identity/mode/pattern fields;
- any prior finding has a correction checkpoint plus fresh full result;
- schema-owned brief/checklist/QA/result fields contain no unresolved placeholders;
- memory/log updates, delivery boundary, concerns, and Outstanding items are final;
- commit/publish/release has passed full QA.

The machine validator owns exact artifact fields and sections through `assets/task-artifact-schema.json`; do not restate them here.
