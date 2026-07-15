# Frontend patterns

Classify the target as `fe-main` or `fe-library` before choosing files or architecture. Also classify the delivery phase and apply [frontend-engineer.md](../frontend-engineer.md). Reuse discovery and index maintenance are required for both main and library work.

## FE main

Use the current project as the primary pattern. The AgriMap baseline is:

```text
Feature UI -> Facade -> Signal Store and/or Generated API
```

- Component: render state, bind input/output, and send user events to the facade.
- Facade: orchestrate APIs/services, transformations, side effects, and store mutations.
- Store: hold signal state, computed selectors, and pure synchronous mutations; do not call APIs.
- Generated API: keep generated code isolated and regenerate through the project toolchain.
- Provider: group local facade/store/service providers when the project uses component-scoped lifecycle.
- Shared UI: remain reusable and unaware of feature business flow.

Prefer Observable APIs with lifecycle-safe subscriptions in the facade and signal state for feature UI when that matches the local application. Do not introduce a store/facade for a trivial component that has no domain state or orchestration.

## FE library

Optimize for reuse and a stable public API:

- public exports and backward compatibility;
- reusable components/directives/pipes;
- Angular services for library behavior;
- generated API integration behind a stable library surface;
- no assumption that a consuming application's facade/store belongs inside the library.

Use the current curated references under `golden/frontend-libraries/` for published API, naming, generated APIs, environment injection, Playground, and the test baseline. The active library's `public-api.ts`, package version, consumers, and neighboring tests remain the contract. Request owner evidence only for gaps listed in `owner-example-intake.md`.

## Naming and file placement

- folders/files/CSS classes: project `kebab-case` pattern;
- TypeScript classes/interfaces/types: `PascalCase`;
- UI variables and functions: `camelCase`;
- Observables: local `$` suffix convention;
- external API fields: generated contract naming, commonly `snake_case`;
- types: keep feature-local types local; move only genuinely shared types to core/shared models.

## Golden examples

Current curated application references live under `golden/frontend-main/`; current library references live under `golden/frontend-libraries/`. Read each `manifest.json` for source, status, evidence mode, and hashes.

Before using an entry, read [conflict-resolution.md](conflict-resolution.md). Defects from the retired frontend-main extraction were removed on 2026-07-16. Apply only the remaining collection known issues and conflict rows, including library public-API compatibility and project-dependent syntax.

Current golden references are maintained guidance, not permission to bypass the active contract. Match the Angular version, target kind, public API, value kinds, generated-code boundary, and local project pattern before applying them.

## FE verification

Check generated-code boundaries, type checking, lint/build, component tests where present, loading/error/empty states, input/output contracts, subscription lifecycle, affected consumers, reuse-search evidence, and the updated frontend reuse index.
