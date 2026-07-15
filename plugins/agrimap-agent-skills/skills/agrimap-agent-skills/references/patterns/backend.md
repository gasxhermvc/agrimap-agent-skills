# Backend patterns

Classify the target and delivery phase before designing files. Apply [backend-engineer.md](../backend-engineer.md):

- `target_kind=be-main` with required `backend_profile=agmws`: web service/application.
- `target_kind=be-main` with required `backend_profile=agmbo`: batch application using the same main structure plus `Infrastructure/TaskScheduler.cs` when scheduling applies.
- `be-library`: reusable codebase with a stable public surface; update `README.md` and Playground in every feature task.

`agmws` and `agmbo` are backend-main profiles, not target kinds. No fallback profile exists.
Do not add Type A/B/C or require `change_kind`; derive concrete work from the objective and current code.

## Main flow

Use the local Clean Architecture implementation. The baseline request flow is:

```text
Presentation/Controller -> Application/UseCase -> Domain -> Repository port -> Infrastructure implementation -> response mapping
```

Create only responsibilities required by the feature. Do not generate the entire chain for a library, SQL-only task, simple endpoint reuse, or feature that has no new persistence dependency.

## Responsibility placement

| Artifact | Place by meaning |
| --- | --- |
| HTTP request/response contract | Presentation DTO |
| Use-case orchestration input/output not exposed as HTTP | Application model |
| Business identity, invariant, value, or concept reused beyond persistence | Domain entity/model/value object |
| Stored-procedure row, join projection, or data-source-specific shape | Infrastructure persistence model |
| Data-access abstraction consumed inward | Repository port in the project's established inward layer |
| SQL/API implementation and mapping | Infrastructure |

Do not place a model under Repository/Infrastructure merely because a repository returns it. Ask what the type means. If it represents the business domain, place it in Domain. If it only mirrors a procedure result or external schema, keep it in Infrastructure and map inward.

Do not relocate existing repository interfaces or models across layers during a feature/bug task unless the selected scope explicitly includes architecture correction.

## Controller and use case

- Keep controllers thin and contract-focused.
- Keep orchestration, business validation, and flow decisions in the use case.
- Keep data access and external service mechanics in Infrastructure.
- Register new dependencies using the current DI pattern.
- Preserve route, DTO, response, error, and stored-procedure contracts unless change is approved.

## Error-code contract

BE can originate a code in Domain/Application, translate it at the response boundary, or forward it from Infrastructure/SQL. For every affected vertical slice, apply [Error/message reconciliation](../backend-engineer.md#error-message-reconciliation) and the SQL [Message collection gate](sql.md#message-collection-gate) when a procedure participates. Do not create a second entry for a code whose meaning is already identical, and do not remap a conflicting meaning silently. The output is the active project's `messages.txt`-style artifact plus duplicate/idempotency evidence, or an explicit `no message changes` result.

## `backend_profile=agmbo`

There is no Presentation tier. Use `Quartz/TaskScheduler trigger -> Application/UseCase -> Domain -> Port -> Infrastructure`. Inspect `Infrastructure/TaskScheduler.cs` for scheduled tasks. Record trigger, concurrency behavior, retry/error handling, and registration impact. Do not put business logic in the scheduler or add a schedule when the feature is only an executable batch operation.

## BE libraries

For every library feature:

- update public API and compatibility notes;
- update `README.md` with setup and usage;
- add or update the Playground example;
- run library tests/build and the Playground verification path.

Current curated BE-library references live under `golden/backend-libraries/` and cover public behavior, configuration, README-style usage, and Playground paths. Match them to the active package version and published surface. No verified `backend_profile=agmbo` scheduler example exists; request the scheduler-specific owner set when that gap affects the task.

## Golden examples

Raw legacy-compatible blocks live under `golden/backend-main/`; current curated library references live under `golden/backend-libraries/`. Their manifests record status, evidence mode, hashes, and source provenance.

Read [conflict-resolution.md](conflict-resolution.md) before using them. Known legacy issues include duplicate imports, duplicate placeholder methods, inconsistent async naming, Presentation DTO leakage into a repository port, pseudo-JSON files, and ambiguous Domain versus persistence placement.

For new code, map transport DTOs before inward repository boundaries and classify models by meaning. Preserve existing public contracts and layer placement during a feature/bug task unless architecture correction is explicitly in scope. Treat raw blocks as compatibility evidence, never a universal or copy-ready mandate.
