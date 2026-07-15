# Front-end Engineer

Frontend code is usually broad rather than algorithmically difficult. Control technical debt by making reuse visible, keeping project patterns searchable, and changing the quality emphasis by delivery phase.

This is a passive discipline layer, not a standalone workflow or alias. Apply it automatically whenever `target_kind` is `fe-main` or `fe-library`, including analysis, design, architecture, feature work, refactor, review, unit tests, QA, and prompt generation.

## Required classification

Record:

- `target_kind`: `fe-main` or `fe-library`;
- `phase`: `foundation`, `active-development`, or `stabilization`;
- `reuse_scope`: `core`, `shared`, `library`, `feature`, or `generated`;
- affected flows and consuming teams;
- project/company standards and local exceptions.

## Reuse-first decision

Before creating reusable code:

1. Search `.agrimap-agent/knowledge/frontend-reuse.jsonl` by name, capability, tags, input/output, and scope.
2. Search the codebase for selectors, exported symbols, services, tokens, configs, pipes, directives, utilities, and similar behavior.
3. Inspect candidates and their consumers; an index hit is not proof of suitability.
4. Choose in this order:
   - exact reuse;
   - configure or safely extend an existing artifact;
   - compose existing artifacts;
   - generalize an existing artifact when at least two proven consumers need the same contract;
   - create a new local artifact with explicit ownership and scope.
5. Avoid forced reuse that creates boolean-option explosions, hidden coupling, or an abstraction with only a hypothetical future consumer.
6. Record the decision and update the index.

## Reuse index

Maintain `.agrimap-agent/knowledge/frontend-reuse.jsonl` as the deterministic source for search and future vectorization. One JSON object per artifact:

```json
{
  "id": "component:src/app/shared/components/data-table/data-table.component.ts#DataTableComponent",
  "name": "DataTableComponent",
  "kind": "component",
  "file": "src/app/shared/components/data-table/data-table.component.ts",
  "symbol": "DataTableComponent",
  "selector": "agm-data-table",
  "scope": "shared",
  "capabilities": ["tabular data", "pagination", "row actions"],
  "inputs": ["columns", "rows"],
  "outputs": ["rowSelected"],
  "consumers": ["feature-a"],
  "tags": ["table", "list"],
  "status": "verified",
  "hash": "sha256",
  "vectorReadyText": "searchable normalized description",
  "updatedAt": "ISO-8601",
  "updatedBy": "requester"
}
```

Use `scripts/frontend-reuse-index.mjs` to scan, search, upsert, deprecate, and validate. Scanner entries use `status=discovered`; a human or Leader must inspect them before promotion to `verified`. Deprecate moved/retired entries with an optional replacement ID; ordinary search excludes them while history remains auditable. Do not add an embedding service in v1. `vectorReadyText` keeps the catalog ready for a future company vector store without making that dependency mandatory.

## Phase 1: `foundation`

Focus on a stable development runway:

- project and folder structure;
- design tokens, themes, style layers, and naming;
- environment/configuration and generated API toolchain;
- lint, format, typecheck, tests, build, and local development infrastructure;
- Core/CodeBase/SharedComponent boundaries and public exports;
- initial reusable functions, services, components, directives, and pipes;
- initial reuse index and ownership.

Avoid building feature-specific abstractions into Core/Shared before real use cases prove them.

Foundation gate:

- architecture and token decisions recorded;
- toolchain commands reproducible;
- generated boundaries clear;
- reusable public surfaces documented and indexed;
- one representative feature/library path proves the structure.

## Phase 2: `active-development`

Assume two or more developers are creating divergence and hidden debt. For every task:

- refresh/search the reuse index before implementation;
- compare with company and project patterns;
- inspect neighboring features and recent changes;
- keep facade/store/service/component boundaries consistent;
- detect duplicated utilities/components, one-off styling, token bypass, generated-code edits, silent contract drift, missing tests, and unreported breakage;
- make executor prompts explicit enough for mixed skill levels;
- update index, examples, and concise knowledge immediately;
- record debt as bounded follow-up work rather than spreading a cleanup refactor across the current feature.

Active-development gate:

- no unexplained new reusable artifact;
- reuse decision recorded;
- public and cross-feature impacts reviewed;
- typecheck/lint/tests/build proportional to the change;
- changed reusable items and consumers indexed.

## Phase 3: `stabilization`

Prioritize flow continuity and release confidence:

- verify end-to-end critical flows and affected regression paths;
- close bugs and incomplete loading/error/empty states;
- remove proven dead code and duplicated paths only with evidence;
- run existing project/platform security and deployment checks without creating a new security policy;
- review accessibility, performance, bundle impact, tokens/styles, and public API stability when relevant;
- refactor high-risk debt only when tests and schedule allow it;
- require owner trade-off for broad or logic-changing cleanup near release.

Stabilization gate:

- critical flows and deployment build verified;
- blocker/high-risk debt resolved or explicitly accepted;
- reuse index and consumer links current;
- no unchecked cleanup hidden inside a bug-fix task;
- remaining debt is prioritized with impact and owner decision.
