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

The legacy source did not contain a verified FE-library golden example. Read the target library and its tests first. If no local pattern exists, request the owner-example set in `owner-example-intake.md` before defining a new convention.

## Naming and file placement

- folders/files/CSS classes: project `kebab-case` pattern;
- TypeScript classes/interfaces/types: `PascalCase`;
- UI variables and functions: `camelCase`;
- Observables: local `$` suffix convention;
- external API fields: generated contract naming, commonly `snake_case`;
- types: keep feature-local types local; move only genuinely shared types to core/shared models.

## Golden examples

Raw extracted blocks live under `golden/frontend-main/` and are immutable. Read its `manifest.json` for source lines and hashes.

Before using a block, read [conflict-resolution.md](conflict-resolution.md). Known issues include inconsistent `list/items` state names, an API/provider variable mismatch, child-component naming typos, and mixed Signal/template access. These are resolved in annotation, not by editing the raw evidence.

Golden examples are not copy-ready. Use them for architectural rhythm and syntax evidence only after matching the current Angular version, value kinds, generated-code boundary, and local project pattern.

## FE verification

Check generated-code boundaries, type checking, lint/build, component tests where present, loading/error/empty states, input/output contracts, subscription lifecycle, affected consumers, reuse-search evidence, and the updated frontend reuse index.
