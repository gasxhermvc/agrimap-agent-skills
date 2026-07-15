# QA and done contract

## QA sequence

1. Use an independent read-only QA subagent/context that did not write the implementation. Give it no file ownership and no instruction to fix findings.
2. Re-read the owner objective, approved trade-offs, execution prompt SoT, and pre-work checklist.
3. Treat the executor Result Package as testimony. Reopen the actual diff/files and verify the stated symbols and behavior.
4. Map every requirement to observed evidence.
5. Independently select and rerun one or two material verification claims when available, including one primary-path check and one risk-focused check proportional to the change.
6. Test the primary path and affected failure paths.
7. Check nearby callers, contracts, data, build/static health, and regression surface.
8. Verify generated files, DI/registration, README/Playground, scheduler, and message artifacts when applicable.
9. For frontend tasks, verify reuse-search evidence and that `knowledge/frontend-reuse.jsonl` reflects created, changed, moved, deprecated, or newly discovered reusable artifacts.
10. Record reproducible evidence and unresolved limitations without editing source, tests, prompts, scope, or acceptance criteria.

## QA status

- `passed`: all required evidence is present and no blocking defect remains.
- `failed`: a reproducible defect or missing required checklist item remains.
- `blocked`: required external state or owner decision is unavailable.
- `not-applicable`: allowed only for a clearly read-only artifact, with a reason.

There is no conditional pass. A limitation that prevents required evidence is `blocked`; a reproducible defect or missing requirement is `failed`.

## Leader after QA

- Synthesize the QA evidence and reconcile it with the requirement ledger; do not replace QA with Leader self-review.
- On `passed`, run the completion gate.
- On `failed`, do not modify the implementation in the same task. Record the task outcome as `qa-failed`, close the attempt without claiming completion, and prepare a proposed prompt for a new correction task.
- Present or discuss that new prompt with the owner, including why the defect exists, exact files/symbols, acceptance criteria, and regression evidence. Start the correction only as a new task.
- On `blocked`, state the missing evidence/decision and keep the task non-complete until it is resolved or explicitly closed as blocked.

## Completion gate

Do not say complete unless:

- scope and checklist are fully reconciled;
- changed points and impact were inspected;
- proportional verification passed;
- Leader reviewed all handoffs and an independent QA model verified the integrated artifact;
- QA status is `passed` or justified `not-applicable`;
- result, memory, knowledge/decision updates, and concise logs are written;
- brief, checklist, QA, and result artifacts contain no unresolved workflow template tokens or standalone scaffold values outside fenced evidence; unrelated domain template syntax such as Angular moustache expressions remains valid;
- completion fields are semantically final: checklist items exist and are checked, QA evidence is populated, and result outcome is `completed`;
- a failed gate leaves active task state, current memory, recent memory, and completion logs unchanged;
- remaining concerns are explicitly separated as follow-up work;
- effects outside the approved scope are opened as a new task/conversation with a pointer in current memory instead of silently extending the task;
- the recommended commit boundary is stated.

## Final result fields

- outcome;
- owner-approved decisions;
- files and behavior changed;
- verification evidence;
- checklist status;
- memory/log updates;
- concerns and next tasks;
- commit/branch recommendation.
