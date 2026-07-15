---
name: agrimap-agent-skills
description: Cross-agent AgriMap engineering workflow for analysis, deep diagnosis, simulation, planning, design, architecture, phase-aware frontend and backend engineering, code review, FE/BE/SQL refactoring, QA, unit tests, feature creation, and execution-ready prompt generation. Use for `/agm-*` or equivalent Codex, Claude, and Gemini tasks; for AgriMap main or library work; and whenever owner trade-offs, code-impact analysis, reuse discovery/indexing, task memory, delegation, or Leader integration are required.
---

# AgriMap Agent Skills

Treat this skill as the workflow source of trust across models and providers. Do not load or recreate legacy `.agm` governance. Use platform-native permissions and safety controls; do not add a second permission system.

เจตนาหลัก: เข้าใจปัญหาและผลกระทบก่อนลงมือ แก้ปัญหาเดิมให้จบด้วยการเปลี่ยนแปลงที่เล็กแต่ครบถ้วน ให้มนุษย์ตัดสินใจเฉพาะ trade-off ที่มีนัยสำคัญ และห้ามปิดงานถ้า checklist, QA, memory หรือ logs ยังไม่ครบ

## Command help / วิธีใช้คำสั่ง

When the requester arguments contain a standalone `-h` or `--help` token, return command help and stop before the normal task lifecycle. Do not resolve a requester, create a task, write project memory or logs, emit an activation receipt, delegate, or run QA for a help-only request. Session context already supplied by a provider hook may remain available, but help must not turn it into task state.

Return concise help containing the provider-specific command, operation and purpose, required and conditional inputs, and one minimal example. Read [platform-syntax.md](references/platform-syntax.md) for invocation syntax and [workflows.md](references/workflows.md) for operation-specific inputs. If the umbrella skill is invoked without an operation, list the available `agm-*` aliases and show how to request help for one operation.

## Start every task / เริ่มงาน

1. Resolve the target project root. Never use the global Skill/plugin installation directory as a state root. Read, when present:
   - `.agrimap-agent/runtime/sessions/<session-id>.json` when the provider supplies a session ID
   - `.agrimap-agent/config.json`
   - `.agrimap-agent/memory/project.md`
   - `.agrimap-agent/memory/current/<active-task-id>.md` when a task is active
   - the active task under `.agrimap-agent/tasks/`
2. Resolve the requester for this session/task. If unknown, ask before substantive work and persist it under ignored session runtime. Never use one shared active-owner file in a multi-person project. Copy the requester into every task brief and log event; record executing `model`, `role`, `agent`, and `provider` separately.
3. If a previous task ended and Git has uncommitted changes, remind the requester to commit before starting the next task, then continue the explicit request. Do not auto-commit; stop only for unsafe overlap with dirty changes.
4. Normalize text, large text, images, attachments, URLs, and pointed file paths using [input-and-scope.md](references/input-and-scope.md). Never silently truncate an input.
5. State the current scope, non-goals, assumptions, and evidence still missing.
6. Before substantive work, return a concise activation receipt containing `AgriMap skill active`, the selected operation, requester, normalized input coverage, and the pre-work checklist. This receipt proves routing; it is not an extra permission gate. If required input is missing, name it instead of pretending the workflow is active and ready.

## Use the evidence order

Keep workflow rules from this skill authoritative. For technical implementation details, use this order:

1. Explicit owner decision for the current task.
2. Current repository code, tests, contracts, and local documentation.
3. Verified AgriMap patterns in this skill.
4. Annotated golden examples as evidence, not unquestionable law.
5. General engineering practice.

Stop and discuss only when an unresolved choice can change business logic, public contract, data behavior, architecture ownership, destructive scope, or a costly implementation direction. Do not request permission for routine, reversible actions already inside the approved scope.

## Analyze before editing / วิเคราะห์ก่อนแก้

1. Inspect the target and enough callers, consumers, contracts, tests, configuration, and data flow to understand the likely impact.
2. Identify the hidden/root problem before proposing a solution.
3. Separate `FACT`, `INFERENCE`, `HYPOTHESIS`, and `UNKNOWN` with source pointers and bounded checks. Read [analysis-discipline.md](references/analysis-discipline.md).
4. Offer multiple viable solutions before implementation when more than one materially different solution exists. Include owner trade-offs and a recommendation.
5. For logic-affecting or complex work, ask whether to add unit tests or test cases before implementation unless the owner already decided.
6. Produce a pre-work checklist and explain why each planned change is necessary.

Read [workflows.md](references/workflows.md) for task routing, [roles.md](references/roles.md) for role-specific responsibilities, and [platform-syntax.md](references/platform-syntax.md) for provider invocation. Use command help for a runnable example without depending on files outside this skill.

## Execute to close the original problem / แก้ปัญหาเดิมให้จบ

- Prefer the smallest complete change that fixes the current problem.
- Continue from existing structure and patterns; do not bolt on a parallel architecture.
- Finish correctness and behavior first. Refactor or improve only when required for the fix or explicitly requested.
- Record follow-on concerns separately instead of silently expanding scope.
- Use hypothesis -> evidence -> bounded experiment -> observed result for uncertain diagnostics. Do not perform unexplained trial and error.
- Preserve existing logic unless the selected refactor mode explicitly allows change. Read [refactor-modes.md](references/refactor-modes.md).

## Route technical patterns

- FE main or library: automatically compose [frontend-engineer.md](references/frontend-engineer.md) as a discipline with the requested analysis, design, architecture, implementation, review, refactor, test, QA, or prompt workflow. Also read [frontend.md](references/patterns/frontend.md), and [conflict-resolution.md](references/patterns/conflict-resolution.md) when golden evidence is involved.
- BE main (`backend_profile=agmws|agmbo`) or BE library: automatically compose [backend-engineer.md](references/backend-engineer.md) as a passive phase-aware discipline. Also read [backend.md](references/patterns/backend.md) and [conflict-resolution.md](references/patterns/conflict-resolution.md) when golden evidence is involved.
- SQL table, procedure, or combined work: read [sql.md](references/patterns/sql.md) and [conflict-resolution.md](references/patterns/conflict-resolution.md) when golden evidence is involved.
- Missing or unverified patterns: read [pattern-status.md](references/patterns/pattern-status.md) and [owner-example-intake.md](references/patterns/owner-example-intake.md).
- Cross-service, cross-database, integration, or ownership-sensitive work: read [service-ownership.md](references/service-ownership.md) and use only `.agrimap-agent/knowledge/service-ownership.yaml` as the project ownership SoT.

Never import a golden example blindly. Compare it with the current project and its annotation first.

## Delegate deliberately

Assign the Leader role to the frontier-capability model responsible for decomposition, final integration, QA dispatch, evidence synthesis, and memory closure. For implementation tasks, assign final verification to an independent read-only QA subagent/context; the Leader must not QA its own implementation or edit a QA finding inside the task being verified. Use no more than five active subagents. Before delegation, specify and verify `workspace_need` and create a file-ownership map. In one integration wave, one file and one logical contract have one writer model; QA agents may read but never edit. Assign each subagent a bounded task, model profile, execution identity, workspace need, required skill references, file/line targets, forbidden files, verification steps, and structured result contract.

Read [subagents-and-branches.md](references/subagents-and-branches.md) and [model-capability-matrix.yaml](references/model-capability-matrix.yaml). A project override at `.agrimap-agent/model-capability-matrix.yaml` wins for model names only; it cannot weaken this workflow.

For prompt generation, read [create-prompt.md](references/create-prompt.md). Treat each approved generated prompt as the execution SoT for that task. Use simple language but include explicit file names, current line numbers plus stable symbol anchors, ordered steps, tests, constraints, deviation handling, and expected handoff fields so a lightweight model does not need to reinterpret the plan.

## Checkpoint every atomic task

After each Leader task or delegated subtask:

1. Write a concise result or handoff.
2. Update `.agrimap-agent/memory/current/<task-id>.md` immediately; update `memory/project.md` only for project-wide facts.
3. Append durable knowledge or decisions only when they remain useful beyond the task.
4. Append a concise event to `.agrimap-agent/logs/YYYY-MM/<task-id>.jsonl` containing who, what, why, affected files, and verification.
5. Store recent task memory for the configured 10-30 day retention window; never delete durable logs during memory pruning.

Read [memory-and-logs.md](references/memory-and-logs.md) for schemas and retention.

## Verify and close / ตรวจสอบก่อนปิดงาน

1. Inspect every changed point and its nearby impact surface.
2. Run proportional tests, static checks, builds, SQL validation, or targeted manual checks.
3. Have the Leader review all executor handoffs, then dispatch the QA workflow to an independent read-only QA subagent/context. QA must reopen the artifacts and rerun selected claims rather than trust the handoff.
4. Check every pre-work checklist item.
5. Do not claim completion while any required checklist item is incomplete.
6. If QA fails, close the implementation attempt as `qa-failed`, do not fix it in the same task, and have the Leader summarize the evidence plus prepare a proposed prompt for a new owner-approved correction task.
7. Report completed scope, verification evidence, remaining concerns, memory/log updates, and the recommended commit boundary.

Read [qa-and-done.md](references/qa-and-done.md) for the result and done contracts.

## Provider invocation

Read [platform-syntax.md](references/platform-syntax.md). Treat provider aliases as thin routers only. Keep all decision logic here and in the directly linked references.
