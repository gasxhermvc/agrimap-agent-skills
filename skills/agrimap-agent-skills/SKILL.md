---
name: agrimap-agent-skills
description: Cross-agent AgriMap engineering workflow for analysis, deep diagnosis, simulation, planning, design, architecture, phase-aware frontend and backend engineering, code review, auditable requester/task history, FE/BE/SQL refactoring, QA, unit tests, feature creation, and execution-ready prompt generation. Use for `/agm-*` or equivalent Codex, Claude, and Gemini tasks; for AgriMap main or library work; and whenever owner trade-offs, code-impact analysis, reuse discovery/indexing, task memory, delegation, or Leader integration are required.
---

# AgriMap Agent Skills

Treat this skill as the workflow source of trust across models and providers. Do not load or recreate legacy `.agm` governance. Use platform-native permissions and safety controls; do not add a second permission system.

เจตนาหลัก: เข้าใจปัญหาและผลกระทบก่อนลงมือ แก้ปัญหาเดิมให้จบด้วยการเปลี่ยนแปลงที่เล็กแต่ครบถ้วน ให้มนุษย์ตัดสินใจเฉพาะ trade-off ที่มีนัยสำคัญ และห้ามปิดงานถ้า checklist, QA, memory หรือ logs ยังไม่ครบ

## Command help / วิธีใช้คำสั่ง

When the requester arguments contain a standalone `-h` or `--help` token, return command help and stop before the normal task lifecycle. Do not resolve a requester, create a task, write project memory or logs, emit an activation receipt, delegate, or run QA for a help-only request. Session context already supplied by a provider hook may remain available, but help must not turn it into task state.

Return concise help containing the provider-specific command, operation and purpose, required and conditional inputs, and one minimal example. Read [platform-syntax.md](references/platform-syntax.md) for invocation syntax and [workflows.md](references/workflows.md) for operation-specific inputs. If the umbrella skill is invoked without an operation, list the available `agm-*` aliases and show how to request help for one operation.

You always know which provider you are running under — you are the model (Codex/GPT runs in Codex CLI, Claude in Claude Code, Gemini in Gemini CLI). Render every command, alias list, and example **only in the active provider's syntax** from [platform-syntax.md](references/platform-syntax.md). Never show another provider's invocation form as the usable command; at most add a one-line note that other providers use a different syntax. Advertising Claude-style `/plugin:command` to a Codex session (where only `$agm-*` skill mentions work) is a help-contract defect.

## Answer audit/history questions / ตอบว่าใครทำอะไรเมื่อไร

Treat `.agrimap-agent/logs/**/*.jsonl` as the chronological source of truth for workflow attribution: who requested a task, which model/role/agent/provider recorded each valid versioned event, what files valid versioned non-terminal events claimed were affected, and when the event was appended. Legacy file claims remain diagnostic as `legacyClaimedFiles` and must not be promoted into versioned attribution. This is not proof of the human who physically edited a file or authored a commit. For requests such as “who did what between these dates?” or “show A's work in the last five days,” run the read-only `agm-workspace.mjs history` query described in [workflows.md](references/workflows.md), inspect `attributionSemantics`, `auditStorage`, `invalidLines`, and the returned task/result/QA artifacts, then distinguish requester, workflow executor, legacy evidence, and Git author in the answer. Use Git history or blame separately when actual commit/file authorship is requested.

Report `events[].timestampUtc` for normalized UTC chronology while preserving the original `events[].timestamp` as logged. Do not answer from conversational recall alone, infer requester identity from Git/OS/machine data, count invalid versioned records as evidence, or claim team durability when `auditStorage` reports ignored/untracked/local-only logs.

History lookup is read-only: it does not require identifying the person asking the question, create an active task, or append another audit event unless the requester separately asks to change the project.

## Start every task / เริ่มงาน

1. Resolve the target project root. Never use the global Skill/plugin installation directory as a state root. Read, when present:
   - `.agrimap-agent/runtime/sessions/<session-id>.json` when the provider supplies a session ID
   - `.agrimap-agent/config.json`
   - `.agrimap-agent/memory/project.md`
   - `.agrimap-agent/memory/current/<active-task-id>.md` when a task is active
   - the active task under `.agrimap-agent/tasks/`
2. Resolve the requester for this session/task. If unknown or the 24-hour confirmation has expired, ask before substantive work and persist it under ignored session runtime. A Git user name may be offered only as an unconfirmed suggestion. Never use one shared active-owner file in a multi-person project. Copy the requester, optional requester ID, and identity source into the task brief and durable events; the created event must preserve the requested objective. Record executing `model`, `role`, `agent`, and `provider` separately — **from your own runtime identity**: you always know your model family and host CLI (a Claude model in Claude Code records `provider: claude`; a GPT/Codex model in Codex CLI records `provider: codex`; Gemini likewise, with the most specific model name you know for `model`). Hook-injected "flavor" or previously recorded identity lines are configuration hints, not proof — never copy them over your own identity, and never record `model: unknown` or a provider you are not actually running under when you can name your own.
3. If a previous task ended and Git has uncommitted changes, remind the requester to commit before starting the next task, then continue the explicit request. Do not auto-commit; stop only for unsafe overlap with dirty changes.
4. Normalize text, large text, images, attachments, URLs, and pointed file paths using [input-and-scope.md](references/input-and-scope.md). Never silently truncate an input.
5. Resolve missing parameters with [elicitation.md](references/elicitation.md): infer from evidence and declare it, apply fixed defaults, and ask remaining never-guess inputs in one batched question. Never invent `target_kind`, `backend_profile`, `refactor_mode`, a provider, or an artifact name without direct evidence.
6. Scan `.agrimap-agent/decisions/` frontmatter (`topic`, `affected`, `service_refs`) for approved records intersecting the task scope; load matches as `FACT`. Two approved records for one topic is a workflow defect — stop and ask the owner which is current.
7. State the current scope, non-goals, assumptions, and evidence still missing.
8. Before substantive work, return a concise activation receipt containing `AgriMap skill active`, the selected operation, requester, normalized input coverage, declared inferences, a `Patterns:` line, and the pre-work checklist. The `Patterns:` line names the exact pattern/reference files selected for this task's scope by the routing section (for example `patterns/sql.md + golden/sql manifest`), or states `Patterns: none applicable — <reason>`. FE/BE/SQL engineering output produced without a named loaded pattern file is invalid — general model knowledge is not a substitute. This receipt proves routing; it is not an extra permission gate. If required input is missing, name it instead of pretending the workflow is active and ready.

## Owner reference library

`.agrimap-agent/knowledge/references/` is the persistent, owner-curated reference library; it is loaded by matching work on every task without being re-pointed, unlike per-task input manifests:

- `db-schema/`: database DDL — tables, views, procedures;
- `api-contracts/`: OpenAPI/proto/contract samples;
- `docs/`: business and domain documents, requirements, glossaries;
- `design/`: design tokens, brand identity, UI guidelines.

For any SQL or data-touching work, read the matching files under `db-schema/` before proposing changes and treat them as `FACT`. Never infer a table, column, type, key, or constraint that is not present in a loaded reference; if the needed schema is missing, name it and ask instead of guessing. The same load-as-FACT rule applies to `api-contracts/` for integration work and `design/` for design-affecting work, with the design fallback ladder in [frontend-engineer.md](references/frontend-engineer.md). A missing reference never blocks unrelated work: declare the gap in the receipt and continue on evidence.

## Use the evidence order

Keep workflow rules from this skill authoritative. For technical implementation details, use this order:

1. Explicit owner decision for the current task.
2. Current repository code, tests, contracts, and local documentation.
3. Verified AgriMap patterns and golden collections marked `current`.
4. Annotated `legacy-compatible` or `unverified` golden evidence.
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
- Record follow-on concerns separately instead of silently expanding scope: when you notice a bug, issue, or debt outside the current scope — flag it to the owner in one line, append it to the Pending issues ledger in `memory/project.md` (see [memory-and-logs.md](references/memory-and-logs.md)), and return to the task. Do not fix it now; a new task will pick it up.
- Use hypothesis -> evidence -> bounded experiment -> observed result for uncertain diagnostics. Do not perform unexplained trial and error.
- Preserve existing logic unless the selected refactor mode explicitly allows change. Read [refactor-modes.md](references/refactor-modes.md).

## Route technical patterns

- FE main or library: automatically compose [frontend-engineer.md](references/frontend-engineer.md) as a discipline with the requested analysis, design, architecture, implementation, review, refactor, test, QA, or prompt workflow. Also read [frontend.md](references/patterns/frontend.md), and [conflict-resolution.md](references/patterns/conflict-resolution.md) when golden evidence is involved. For a release evaluation after changing this skill or frontend golden guidance, run the scenarios in [fe-scenarios.md](references/evals/fe-scenarios.md); do not load that eval catalog for ordinary task execution.
- BE main (`backend_profile=agmws|agmbo`) or BE library: automatically compose [backend-engineer.md](references/backend-engineer.md) as a passive phase-aware discipline. Also read [backend.md](references/patterns/backend.md) and [conflict-resolution.md](references/patterns/conflict-resolution.md) when golden evidence is involved.
- SQL table, procedure, or combined work: load matching `.agrimap-agent/knowledge/references/db-schema/` files as `FACT` first (see Owner reference library), then read [sql.md](references/patterns/sql.md) and [conflict-resolution.md](references/patterns/conflict-resolution.md) when golden evidence is involved.
- Missing or unverified patterns: read [pattern-status.md](references/patterns/pattern-status.md) and [owner-example-intake.md](references/patterns/owner-example-intake.md).
- Cross-service, cross-database, integration, or ownership-sensitive work: read [service-ownership.md](references/service-ownership.md) and use only `.agrimap-agent/knowledge/service-ownership.yaml` as the project ownership SoT.

Read `references/patterns/golden/manifest.json` and the selected collection manifest before using golden material. A `current` curated reference is maintained AgriMap guidance; raw immutable material is compatibility evidence and must be interpreted through its annotation. Never override an owner decision or an active-project contract blindly.

**Read economy (token budget):** load references selectively, never in bulk. For one task read: the one router file for the scope (`frontend.md` / `backend.md` / `sql.md`) → the collection `manifest.json` → **only the golden files whose manifest `heading` matches the task topic** (typically 1-3 files) → `conflict-resolution.md` only when a selected golden file is actually used. Do not read every collection, every reference, or an entire golden directory "for context". If after the receipt you cannot name which specific files you will read and why, the routing — not more reading — is what is missing.

## Delegate deliberately

**Delegation is proportional.** A small task — one artifact or a few files, one writer, no cross-contract integration — runs as a single agent plus one independent read-only QA pass; do not spawn planner/executor subagents, parallel researchers, or extra review waves for it. Fan-out exists for multi-file integration with distinct ownership, not as a default ceremony; burning millions of tokens on a one-file deliverable is a workflow defect, not thoroughness.

**Work with the harness, not against it.** Each spawned subagent starts with an empty context — if its prompt says "read the umbrella skill and references", every subagent re-pays the full reading cost. Instead, inline into the handoff prompt the specific rules, pattern excerpts, and file/line targets that subagent needs; a subagent must not reload the skill or reference tree beyond its assignment. When the active provider surface genuinely has no callable subagent capability, run Leader → executor → QA as **sequential passes in one session**: do not re-read unchanged references between passes; QA independence there means re-opening only the changed artifacts and re-running the verification commands, not rebuilding context from zero. Do not replicate what the harness already provides (permission prompts, todo tracking, session transcripts) with extra workflow steps.

Assign the Leader role to the frontier-capability model responsible for decomposition, final integration, QA dispatch, evidence synthesis, and memory closure. For implementation tasks, assign final verification to an independent read-only QA subagent/context; the Leader must not QA its own implementation or edit a QA finding inside the task being verified. Use no more than five active subagents. Before delegation, specify and verify `workspace_need` and create a file-ownership map. In one integration wave, one file and one logical contract have one writer model; QA agents may read but never edit. Assign each subagent a bounded task, model profile, execution identity, workspace need, required skill references, file/line targets, forbidden files, verification steps, and structured result contract.

Read [subagents-and-branches.md](references/subagents-and-branches.md) and [model-capability-matrix.yaml](references/model-capability-matrix.yaml). A project override at `.agrimap-agent/model-capability-matrix.yaml` wins for model names only; it cannot weaken this workflow.

For prompt generation, read [create-prompt.md](references/create-prompt.md) and follow its staged elicitation contract; prompt generation never starts execution — running an approved prompt is the separate `agm-exec` operation. Treat each approved generated prompt as the execution SoT for that task. Use simple language but include explicit file names, current line numbers plus stable symbol anchors, ordered steps, tests, constraints, deviation handling, and expected handoff fields so a lightweight model does not need to reinterpret the plan.

## Checkpoint every atomic task

After each Leader task or delegated subtask:

1. Write a concise result or handoff.
2. Update `.agrimap-agent/memory/current/<task-id>.md` immediately; update `memory/project.md` only for project-wide facts.
3. Append durable knowledge or decisions only when they remain useful beyond the task.
4. Append a concise event to `.agrimap-agent/logs/YYYY-MM/<task-id>.jsonl` containing schema version, exact UTC time, requester attribution, execution identity, what, why, affected files, verification, and explicit automatic Git HEAD/dirty context (`null` outside Git). A schema-v2 `changed` event must name at least one nonblank affected file. For observability, also record `skillsUsed` — the [skill-registry.md](references/skill-registry.md) IDs of the modules that actually informed the step (optional; never a validation gate, but use registry IDs only). Never rewrite or prune durable logs.
5. Store recent task memory for the configured 10-30 day retention window; never delete durable logs during memory pruning.

Read [memory-and-logs.md](references/memory-and-logs.md) for schemas and retention.

## Verify and close / ตรวจสอบก่อนปิดงาน

1. Inspect every changed point and its nearby impact surface.
2. Run proportional tests, static checks, builds, SQL validation, or targeted manual checks.
3. Have the Leader review all executor handoffs, then dispatch the QA workflow to an independent read-only QA subagent/context. QA must reopen the artifacts and rerun selected claims rather than trust the handoff.
4. Check every pre-work checklist item.
5. Do not claim completion while any required checklist item is incomplete.
6. If QA fails, close the implementation attempt as `qa-failed`, do not fix it in the same task, and have the Leader summarize the evidence plus prepare a proposed prompt for a new owner-approved correction task.
7. Report completed scope, verification evidence, remaining concerns, memory/log updates, and the recommended commit boundary — and always close with an **Outstanding items** summary: every still-open Pending issues ledger entry plus any new ones from this task, or an explicit `no pending issues`. Reconcile the ledger while doing so (mark entries this task resolved).

Read [qa-and-done.md](references/qa-and-done.md) for the result and done contracts.

## Provider invocation

Read [platform-syntax.md](references/platform-syntax.md). Treat provider aliases as thin routers only. Keep all decision logic here and in the directly linked references.
