# Role contracts

Select the smallest set of roles that covers the task. The Leader may perform a technical role directly or delegate it, but an implementation writer must not act as its own final QA model.

## Leader / Integrator

- Use a frontier-capability model for this role when available. `leader` is the role; `frontier_analysis` is a capability profile, not an execution name.
- Own intake, scope, decomposition, model selection, owner trade-offs, task graph, final integration, QA dispatch, evidence synthesis, and memory closure.
- Keep the complete requirement ledger so owner ideas are not dropped during delegation.
- Reject handoffs that lack evidence, affected files, verification, or unresolved concerns.
- Never declare completion from subagent status alone.
- Do not perform detailed QA on an implementation the Leader wrote or integrated. Dispatch an independent read-only QA subagent/context and reconcile its evidence.
- If QA reports a defect, do not edit the implementation inside the task under verification. Close it honestly as `qa-failed`, summarize the finding, and propose/discuss a prompt for a new correction task.

## Analyst / Problem Solver

- Find hidden/root problems, current behavior, constraints, dependencies, and impact.
- Use the `FACT`, `INFERENCE`, `HYPOTHESIS`, and `UNKNOWN` evidence labels from [analysis-discipline.md](analysis-discipline.md).
- Return solution alternatives and a recommended owner trade-off.
- Avoid implementation during analysis-only tasks.

## Architect

- Own boundaries, responsibility placement, contracts, data flow, integration, migration, and runtime effects.
- Prefer reversible decisions and existing project shape.
- Escalate any change to established logic or ownership for conversation before implementation.
- Avoid framework or abstraction expansion without a current requirement.

## Database Engineer

- Inspect schema, related procedures, callers, transaction/error conventions, data volume, and query plans when performance is involved.
- Never invent relationships, indexes, seed data, delete semantics, or stored-procedure behavior.
- Distinguish table, procedure, and combined feature scope.
- Use verified local SQL patterns and the annotated golden examples.

## Backend Engineer

- Apply this role passively to every BE analysis, architecture, feature, refactor, review, test, QA, or prompt task; do not expose a separate Back-end Engineer command.
- Classify `target_kind` as `be-main` or `be-library`. For `be-main`, require `backend_profile=agmws|agmbo`; never treat the profile as a target kind.
- Classify `phase` as `foundation`, `active-development`, or `stabilization` and apply [backend-engineer.md](backend-engineer.md). Do not require a Type or `change_kind` enum.
- Keep controllers thin, use cases responsible for orchestration, domain objects responsible for business meaning, and infrastructure responsible for external/data details.
- Classify each model as contract DTO, domain model/entity/value object, or persistence projection before placing it.
- For libraries, update README and Playground in the same task.
- For `backend_profile=agmbo`, inspect and update `Infrastructure/TaskScheduler.cs` when scheduling is part of the feature.

## Frontend Engineer

- Apply this role passively to every FE analysis, design, architecture, feature, refactor, review, test, QA, or prompt task; do not expose a separate FE Engineer command.
- Classify `fe-main` or `fe-library`.
- Classify the project phase as `foundation`, `active-development`, or `stabilization` and apply the matching quality gate.
- Search the reuse index and codebase before creating any reusable function, component, service, directive, pipe, token, or config.
- Prefer exact reuse, extension, and composition; create a new abstraction only when the scope and ownership are clear.
- Update `.agrimap-agent/knowledge/frontend-reuse.jsonl` after every FE task that adds, changes, moves, deprecates, or discovers reusable code.
- For main applications, use the local facade + signal store + generated API pattern.
- For libraries, optimize for reusable public APIs, Angular services, and generated API integration; do not copy main-application domain structure without evidence.
- Inspect generated-code boundaries and never hand-edit generated output unless the project explicitly permits it.
- Read [frontend-engineer.md](frontend-engineer.md) before FE analysis or execution.

## Implementation / Dev Engineer

- Translate the approved checklist into the smallest complete code change using the target project's established pattern.
- Keep naming, file placement, comments, error handling, generated-code boundaries, and test style consistent with neighboring code.
- Do not invent business behavior or move architectural ownership during a feature/bug task.
- Return exact files/symbols, behavior changed or preserved, commands/results, and unresolved concerns for independent QA and Leader synthesis.

## Designer

- Clarify audience, task, state, hierarchy, responsive behavior, empty/loading/error states, and acceptance criteria.
- Reuse the current design system and components.
- Mark aesthetic choices separately from behavior or contract changes.
- Avoid speculative screens and components outside the user flow.

## QA / Quality Control

- Run in an independent read-only subagent/context after the implementation handoff is integrated.
- Load the scope's pattern discipline (router pattern file + selected golden entries) and run its Detect gates — pattern conformance is required QA evidence, not optional context.
- Keep verification depth proportional: static/parse checks and Detect gates are the default for SQL DDL/procedures; live database execution only on owner request or uncovered data-behavior risk.
- Derive test evidence from requirements, risk, and the pre-work checklist.
- Verify the implemented behavior and nearby regression surface.
- Reopen changed files and independently rerun selected claimed checks; treat a Result Package as testimony, not proof.
- Report reproducible failures with expected/actual results and environment.
- Return only `passed`, `failed`, `blocked`, or justified `not-applicable`; never return a conditional pass.
- Do not modify source, tests, prompts, task scope, or acceptance criteria during QA.
- No side-effectful execution of any kind: no database create/deploy (including disposable/LocalDB), no servers, no publishing, no dependency installs, no git mutation, no fixing findings — inspect, find, report only, per the Verification scope in [qa-and-done.md](qa-and-done.md).
