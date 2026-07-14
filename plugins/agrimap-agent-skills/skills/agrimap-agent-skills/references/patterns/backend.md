# Backend patterns

Classify the target before designing files:

- `target_kind=be-main` with required `backend_profile=agmws`: web service/application.
- `target_kind=be-main` with required `backend_profile=agmbo`: batch application using the same main structure plus `Infrastructure/TaskScheduler.cs` when scheduling applies.
- `be-library`: reusable codebase with a stable public surface; update `README.md` and Playground in every feature task.

`agmws` and `agmbo` are backend-main profiles, not target kinds. No fallback profile exists.

## Main flow

Use the local Clean Architecture implementation. The baseline request flow is:

```text
Controller -> UseCase -> Domain -> Repository port -> Infrastructure implementation
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

## `backend_profile=agmbo`

Inspect `Infrastructure/TaskScheduler.cs` for scheduled tasks. Record trigger, concurrency behavior, retry/error handling, and registration impact. Do not add a schedule when the feature is only an executable batch operation.

## BE libraries

For every library feature:

- update public API and compatibility notes;
- update `README.md` with setup and usage;
- add or update the Playground example;
- run library tests/build and the Playground verification path.

No verified BE-library or scheduler golden example exists in the legacy source. Use local-project evidence or request the owner-example set.

## Golden examples

Raw extracted blocks live under `golden/backend-main/` with hashes and source provenance. They demonstrate controllers, DTOs, use cases, repository calls, response shapes, routes, and stored-procedure integration.

Read [conflict-resolution.md](conflict-resolution.md) before using them. Known legacy issues include duplicate imports, duplicate placeholder methods, inconsistent async naming, Presentation DTO leakage into a repository port, pseudo-JSON files, and ambiguous Domain versus persistence placement.

For new code, map transport DTOs before inward repository boundaries and classify models by meaning. Preserve existing public contracts and layer placement during a feature/bug task unless architecture correction is explicitly in scope. Treat raw blocks as compatibility evidence, never a universal or copy-ready mandate.
