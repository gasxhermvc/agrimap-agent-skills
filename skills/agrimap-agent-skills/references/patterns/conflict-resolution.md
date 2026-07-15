# Pattern conflict resolution

Use this file before using any golden example. Raw files under `golden/` are immutable evidence, not copy-ready templates. Correct code in the active project; never "fix" the evidence file.

## Decision precedence

1. Owner-approved behavior for the current task.
2. Current project code, tests, contracts, generated-code boundary, and neighboring conventions.
3. A `canonical-v1` decision in this file.
4. Golden examples as legacy compatibility evidence.
5. General engineering practice.

When two current-project sources disagree, show the evidence and trade-off to the owner. Do not use a golden example to break an active contract.

## Statuses

These resolution statuses apply to individual conflict-matrix rows. For catalog authority statuses, use [pattern-status.md](pattern-status.md). `missing-owner-example` is shared by both taxonomies with the same meaning.

- `resolved-defect`: a compile, name, format, or redundant-code defect; never reproduce it.
- `canonical-v1`: safe structural guidance for new work; preserve existing public contracts unless change is approved.
- `project-dependent`: inspect the active project and follow its proven convention.
- `owner-decision-required`: behavior, data, or logical semantics need an explicit owner choice.
- `missing-owner-example`: evidence is insufficient; collect the requested example before establishing a shared convention.

## Frontend main conflict matrix

The frontend-main collection was renumbered and de-duplicated on 2026-07-16 (see `golden/frontend-main/manifest.json`). Files carrying the old defects (`list` vs `items` mismatch, undeclared `konectApi`, placeholder symbols in `013-example.ts`/`026-1-2-rule.txt`, `items` vs `items()` mixing) were removed or superseded by content regenerated from `CODING-STANDARD.md`; those `resolved-defect` rows are retired. Remaining rows:

| Evidence | Conflict | Resolution | Status |
| --- | --- | --- | --- |
| `010-5-component-layout.md`, `014-9-domain-file-template.ts` | Snippets use example symbols (`ExampleFlowFacade`, `XxxStore`). | Treat as structural sketches only. Imports, providers, selectors, and class names must resolve in the target build. | `canonical-v1` |
| `010-5-component-layout.md`, `013-8-naming-patterns.md` | Signal `input()`/`output()` may compete with decorator-based project code. | Follow the Angular version and neighboring component convention. Do not migrate syntax inside an unrelated task. | `project-dependent` |
| `017-10-assets-management.md` | Static image path depends on asset/build configuration (`baseHref`/`$base-path` per env). | Resolve through the active workspace asset and base-path convention. | `project-dependent` |
| `002-2-architecture-rules.md` (R1–R5) | Prose forbids component subscriptions/API access and store async work. | Keep stores synchronous and pure. Put feature orchestration in the facade when shared state/flow warrants it. A trivial local view may use the local service pattern with lifecycle safety when a facade/store adds no value. | `canonical-v1` |

The AgriMap baseline remains `Feature UI -> Facade -> Signal Store and/or Generated API`, but it is a complexity-shaped pattern, not a requirement to create every layer for every component.

## Backend main conflict matrix

| Evidence | Conflict | Resolution | Status |
| --- | --- | --- | --- |
| `002-1-presentation-controller-examples.cs`, `003-1-presentation-controller-examples.cs` | Duplicate import and duplicate placeholder method signatures. | Remove duplicate imports in real code; never copy mutually exclusive template variants into one class. | `resolved-defect` |
| `007-*` through `010-*` | Task-returning method names mix suffix and non-suffix forms. | Preserve existing public contracts. For new APIs, apply the active project's async naming consistently across interface, implementation, and caller; prefer `Async` when no project rule exists. | `project-dependent` |
| `009-4-1-repository-interface.cs` | Repository port is under Infrastructure and consumes Presentation DTOs. | For new boundaries, map Presentation DTOs to inward Application/Domain inputs before the repository port. Locate the port in the project's established inward layer. Do not silently relocate legacy types during a feature fix. | `canonical-v1` |
| `017-5-domain-example.cs` | A model labeled Domain contains external uppercase JSON field mappings. | Classify by meaning: invariant/business concept belongs inward; procedure/external projection belongs in Infrastructure and maps inward. This example is unclassified until the owner tour. | `missing-owner-example` |
| `010-4-2-repository-implementation.cs` | Incomplete surrounding declarations and redundant `await Task.FromResult(...)`. | Supply real dependencies from the target class and return an already-computed value directly. | `resolved-defect` |
| `025-*` through `029-*` | Files use `.json` but contain comments/placeholders/multiple illustrative roots. | Treat them as response-shape notes, never JSON fixtures or parser inputs. | `resolved-defect` |
| Controller examples | Route styles and response envelopes differ. | Preserve the deployed API contract and follow neighboring controllers; a change requires compatibility analysis and owner approval. | `project-dependent` |

## SQL conflict matrix

| Evidence | Conflict | Resolution | Status |
| --- | --- | --- | --- |
| `NOTIFICATION_*.sql` | Unnamed defaults and section naming may differ from the active database project. | Follow the neighboring table/deployment convention; do not normalize unrelated scripts. | `project-dependent` |
| `NOTIFICATION_CONTENT.sql` | A unique key on `(MESSAGE_ID, CHANNEL_ID)` is paired with a same-key non-unique index. | Do not reproduce a duplicate index unless included columns/order/filter or measured workload proves a separate purpose. | `resolved-defect` |
| `NOTIFICATION_*.sql` | Foreign keys mix `CASCADE` and `NO ACTION`. | Cascade behavior is relationship semantics, not style. Require schema/caller evidence and owner decision before changing it. | `owner-decision-required` |
| `LUT_NOTI_CHANNEL.sql` | Fixed identity seed values are deployment and ownership assumptions. | Confirm stable IDs, rerun/idempotency behavior, and environment ownership before seeding. | `owner-decision-required` |
| `FILE_STORAGE_I.sql`, `UM_USER_I.sql`, `UM_USER_U.sql`, `NOTIFICATION_USERS_Q.sql` | Custom splitter, `STRING_SPLIT`, and cursors coexist. | Choose from database version, input contract, order requirements, volume, and measured plan. Do not promote one technique globally yet. | `project-dependent` |
| `UM_USER_U.sql` | Update deletes and recreates all roles/permissions. | Treat as explicit replace semantics. Never infer it for a generic update or refactor; owner approval and regression cases are required. | `owner-decision-required` |
| `UM_USER_I.sql`, `UM_USER_U.sql`, `UM_USER_D.sql`, `messages.txt` | Role restrictions and message codes encode business policy. | Preserve as project behavior only; do not publish it as a universal coding convention. | `owner-decision-required` |
| Message artifacts across active projects | Dictionary tables, columns, module fields, languages, and deployment shapes differ. | Discover and reuse the active project's `messages.txt` or equivalent contract; never select a golden dictionary profile globally. | `project-dependent` |
| Same error code with different or ambiguous meanings | Reusing the key can show users the wrong message or overwrite another module's contract. | Stop that entry and obtain an owner decision; never silently replace the existing meaning. | `owner-decision-required` |

## Copy-readiness gate

An executor may use a golden example only after recording:

- the target project evidence it matches;
- every conflict row that applies;
- corrected symbols/contracts in the execution plan;
- compile/parse/build and behavior verification appropriate to the target.

If this cannot be established, use the golden file for discussion only.

## Owner tour backlog

Confirm these before promoting more patterns:

- FE main: actual Signal/store/facade/provider wiring, Angular input/output convention, asset paths, and generated API boundary;
- FE library: public API, reusable service/component, generated API, consumer, and test examples;
- BE main: repository-port location, Presentation-to-Application mapping, Domain versus persistence model examples, route/response conventions;
- BE library: README and Playground conventions;
- BE main with `backend_profile=agmbo`: `Infrastructure/TaskScheduler.cs` and registration/retry behavior;
- SQL: default constraint naming, cascade policy, index review, seed deployment, list-input convention, and update-versus-replace semantics;
- FE/BE/SQL: unit-test conventions.
