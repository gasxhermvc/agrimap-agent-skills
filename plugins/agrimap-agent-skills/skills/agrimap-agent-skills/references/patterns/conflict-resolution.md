# Pattern conflict resolution

Use this file before using any golden material. First read `golden/manifest.json` and the selected collection manifest:

- `evidenceMode=curated-reference`: maintained AgriMap guidance. Correct it together with its manifest hash when the owner updates the standard.
- `evidenceMode=raw-immutable`: source evidence retained byte-for-byte. Correct active code and the annotation; never edit the evidence to hide a source defect.
- `evidenceMode=mixed`: inspect the status and evidence mode on every manifest entry.

## Decision precedence

1. Owner-approved behavior for the current task.
2. Current project code, tests, contracts, generated-code boundary, and neighboring conventions.
3. A verified AgriMap pattern or golden entry marked `current`.
4. A `canonical-v1` decision in this file.
5. Annotated `legacy-compatible` or `unverified` golden evidence.
6. General engineering practice.

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
| `018-11-generated-api-contract.md` | Anything hand-written under `generated-apis/`, or an API client/DTO created by hand in `domain/`. | API contract is produced only by `npm run gen-api:api` from swagger. Never hand-edit generated files or invent API clients/DTOs; add the endpoint to swagger or `services.api.json` and regenerate. | `canonical-v1` |
| `019-12-testing-conventions.md` | App has 85 component smoke tests and zero facade/store/service tests; logic layers are untested. | Newly established (2026-07-16): store mutators and facade use cases MUST have tests (levels 2–3). App uses Karma+Jasmine with `fixture.detectChanges()` (not the library's `whenStable()`). Assertion depth beyond the mandated success/error cases stays owner-extensible. | `canonical-v1` |

The AgriMap baseline remains `Feature UI -> Facade -> Signal Store and/or Generated API`, but it is a complexity-shaped pattern, not a requirement to create every layer for every component.

## Frontend libraries conflict matrix

Applies to the `@agrimap/*` workspace (`golden/frontend-libraries`). The overriding rule here is the **published contract**: anything re-exported from a library's `public-api.ts` is frozen — refactor internals freely, but changing a public symbol is a breaking change that requires a version bump and a fix to every consumer (see `003-3-public-api-contract.md`).

| Evidence | Conflict | Resolution | Status |
| --- | --- | --- | --- |
| `005-5-naming-in-libraries.md` | Library naming (no-suffix `TextBox`, `text-box.ts`) differs from frontend-main (`TextBoxComponent`, `text-box.component.ts`). | Use the library convention inside a library; use the app convention inside the app. Do not port one into the other. | `project-dependent` |
| `005-5-naming-in-libraries.md` | Legacy inconsistency inside libraries: `import-layer.facade.store.ts`, `menu-app.component.ts` suffix, `.css` vs `.scss`, mixed semicolon style. | New code follows the standard (`xxx.store.ts`, no `.component` suffix, `.scss`). Do not mass-rename legacy — files exported via `public-api.ts` cannot be renamed without a breaking bump. | `resolved-defect` |
| `009-9-ui-kit-form-control-pattern.ts` | ui-kit form-control outputs use native-event names (`input`/`change`/`focus`/`blur`), conflicting with app N4 (no `on` prefix, past tense). | Keep as-is; these are public API of ui-kit. Do not imitate in app components and do not rename in libraries. | `project-dependent` |
| `002-2-library-catalog-dependency-graph.md` | `auth-client` pins `@agrimap/ui-kit` at exact `0.0.75`; others use `*`/`^`. | When bumping `ui-kit`, update this exact pin in `auth-client/package.json` too. Verify with a grep across all `package.json` before publishing. | `owner-decision-required` |
| `006-6-facade-patterns-in-library.md` | Baseline says `UI → Facade → Store`, but most libraries (ui-kit, map-core, auth-client) have no facade. | Presentational/utility components stay facade-less. Add a facade only when there is shared state, async orchestration, or a generated-API call. Do not add empty layers during refactor. | `canonical-v1` |
| `004-4-versioning-publish-workflow.md` | Full semver (minor/major) rules are not yet agreed by the team. | Interim: dev bumps patch on `0.0.N`, prod on `1.0.N`. Do not introduce minor/major jumps until the team ratifies a scheme. | `owner-decision-required` |
| `012-11-testing-conventions.ts` | Only smoke tests (`should create`) exist; deeper assertion patterns are unestablished. | Baseline is `TestBed` + `await fixture.whenStable()`. Establishing richer assertion conventions is an owner decision. | `missing-owner-example` |

## Backend main conflict matrix

| Evidence | Conflict | Resolution | Status |
| --- | --- | --- | --- |
| `002-1-presentation-controller-examples.cs`, `003-1-presentation-controller-examples.cs` | Duplicate import and duplicate placeholder method signatures. | Remove duplicate imports in real code; never copy mutually exclusive template variants into one class. | `resolved-defect` |
| `007-*` through `010-*` | Task-returning method names mix suffix and non-suffix forms. | Preserve existing public contracts. For new APIs, apply the active project's async naming consistently across interface, implementation, and caller; prefer `Async` when no project rule exists. | `project-dependent` |
| `009-4-1-repository-interface.cs` | Repository port is under Infrastructure and consumes Presentation DTOs. | For new boundaries, map Presentation DTOs to inward Application/Domain inputs before the repository port. Locate the port in the project's established inward layer. Do not silently relocate legacy types during a feature fix. | `canonical-v1` |
| `017-5-domain-example.cs` | A model labeled Domain contains external uppercase JSON field mappings. | Classify by meaning: invariant/business concept belongs inward; procedure/external projection belongs in Infrastructure and maps inward. This example is unclassified until the owner tour. | `missing-owner-example` |
| `010-4-2-repository-implementation.cs` | Incomplete surrounding declarations and redundant `await Task.FromResult(...)`. | Supply real dependencies from the target class and return an already-computed value directly. | `resolved-defect` |
| `024-*` through `028-*` | Files use `.json` but contain comments/placeholders/multiple illustrative roots. | Treat them as response-shape notes, never JSON fixtures or parser inputs. | `resolved-defect` |
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

For a `current` curated reference, record the target kind, active framework/package version, published or deployed contracts checked, applicable known issues, and verification path. For raw immutable or legacy-compatible evidence, also record:

- the target project evidence it matches;
- every conflict row that applies;
- corrected symbols/contracts in the execution plan;
- compile/parse/build and behavior verification appropriate to the target.

If the required match cannot be established, use that golden entry for discussion only. Do not downgrade an entire `current` collection because one entry has a documented exception.

## Owner tour backlog

Confirm these before promoting more patterns:

- FE main: assertion depth beyond the mandated store/facade success+error tests (section 12) — the generated API boundary (section 11) and store/facade/provider wiring are now documented;
- FE library: full semver rules (minor/major triggers) and richer unit-test assertion conventions — remaining open items now that `golden/frontend-libraries` documents public API, facade usage, generated API, and consumer wiring;
- BE main: repository-port location, Presentation-to-Application mapping, Domain versus persistence model examples, route/response conventions;
- BE library: README and Playground conventions;
- BE main with `backend_profile=agmbo`: `Infrastructure/TaskScheduler.cs` and registration/retry behavior;
- SQL: default constraint naming, cascade policy, index review, seed deployment, list-input convention, and update-versus-replace semantics;
- BE main, BE library, and SQL: representative unit/integration-test conventions. FE-main mandatory store/facade tests and the FE-library smoke-test baseline are already documented.
