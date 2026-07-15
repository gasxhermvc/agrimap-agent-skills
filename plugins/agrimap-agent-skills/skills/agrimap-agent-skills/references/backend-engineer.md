# Back-end Engineer discipline

Apply this passive discipline whenever `target_kind` is `be-main` or `be-library`, including analysis, architecture, feature work, refactor, review, tests, QA, and prompt generation. Do not expose a separate Back-end Engineer command.

## Required classification

Record:

- `target_kind`: `be-main` or `be-library`;
- `backend_profile`: required only for `be-main`, exactly `agmws` or `agmbo`;
- `phase`: `foundation`, `active-development`, or `stabilization`;
- affected Domain boundary, contracts, consumers, data, and runtime path;
- logic/contract/data/ownership impact.

Do not add Type A/B/C or a required `change_kind`. Derive the concrete work from the owner objective and current code. `agmws` and `agmbo` describe host/runtime shape, not task types or architecture variants.

## Host profiles

### `backend_profile=agmws`

Use the local web flow:

```text
Presentation/Controller -> Application/UseCase -> Domain -> Port -> Infrastructure -> response mapping
```

Keep Controller/route code thin. Contract binding and response mapping belong at the edge; orchestration belongs in Application/UseCase; business meaning and invariants belong in Domain; external/data mechanics belong in Infrastructure.

### `backend_profile=agmbo`

Use the batch flow without a Presentation tier:

```text
Quartz/TaskScheduler trigger -> Application/UseCase -> Domain -> Port -> Infrastructure
```

Keep `Infrastructure/TaskScheduler.cs` limited to scheduling/registration concerns. Do not put business logic in the scheduler. Record trigger, concurrency, retry, error, and registration effects when scheduling changes.

## Phase 1: `foundation`

Build the smallest stable runway:

- inspect and reuse `agrimap.platform` libraries before creating Core/platform infrastructure;
- establish template, project/folder shape, configuration, DI, generated boundaries, logging/observability, test/build commands, and local development infrastructure;
- define Domain ownership and host profile before scaffolding feature layers;
- for libraries, define the public surface, compatibility boundary, README structure, Playground, build, and packaging path.

Foundation gate:

- no duplicated platform/Core capability without evidence;
- configuration and DI are reproducible;
- one representative vertical path proves the structure;
- Domain, contract, and persistence model placement is explicit.

## Phase 2: `active-development`

Analyze the Domain before creating files:

1. If the Domain boundary exists, extend that boundary and complete only the required vertical slice.
2. If it does not exist, establish the smallest evidence-backed Domain boundary and ownership, then create the required web Controller or batch trigger plus Application/UseCase, Domain, Port, and Infrastructure pieces.
3. Classify every model as transport DTO, Application model, Domain entity/value object, or persistence/external projection before placement.
4. Preserve route, response, error, stored-procedure, event, and public API contracts unless the owner approved change.
5. Keep Controllers and batch triggers thin; never use the entry point as the business layer.
6. For libraries, update `README.md` and Playground in the same feature task.

Active-development gate:

- the original feature/bug is complete across the required layers;
- no speculative layer, model, repository, or abstraction was added;
- affected callers, registrations, contracts, and data mappings were checked;
- proportional tests/build/static checks passed.

## Phase 3: `stabilization`

Prioritize release confidence:

- establish a behavioral baseline before refactor;
- verify critical flows, regression paths, failure behavior, configuration, and deployment build;
- run the project's existing vulnerability, dependency, and production-readiness checks without inventing a parallel security policy;
- inspect performance and data behavior where evidence or scale makes them relevant;
- keep refactor bounded and require owner trade-off before logic, contract, data, or ownership changes;
- record remaining debt as separate prioritized work.

Stabilization gate:

- release-critical paths and production configuration are verified;
- blocking effects are fixed or explicitly accepted;
- refactor preservation/change mode is proven;
- no cleanup is hidden inside an unrelated bug fix.
