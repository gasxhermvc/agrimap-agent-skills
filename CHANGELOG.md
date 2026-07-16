# Changelog

## 0.1.2 - 2026-07-16

- Isolated Codex, Claude, and Gemini hook discovery so each host records only its own provider.
- Added runtime provider correction for stale cross-loaded Codex/Claude hook artifacts.
- Added a normative workflow glossary separating requester from decision-owner authority and defining substantive work, checkpoint units, material/complex/small work, proportional verification, verification-only QA, the exact two-fast-then-full QA counter, and configured versus actual model identity.
- Centralized task artifact fields, required sections, QA/full-release rules, templates, generated documentation, and completion validation in `assets/task-artifact-schema.json`.
- Added historical QA-counter enforcement, independent QA identity checks, workflow-write/product-read-only evidence, and schema/template/docs contract tests.
- Replaced stale Codex subagent fallback guidance with the current native app/CLI/IDE workflow, including `/agent`, inspectable threads, descriptive labels, and a mandatory non-silent 60-second status cadence.
- Changed generated aliases and Gemini commands from umbrella reloads to compact runtime-core + glossary + operation-specific entrypoints generated from `config/operations.json`.
- Bumped the package version so provider-hook fixes replace cached `0.1.1` installations.

## 0.1.1 - 2026-07-16

- Split Codex and Claude plugin hooks into explicitly selected provider-specific files; Gemini retains its extension hooks.
- Added Gemini prompt rendering and model-capability routing without inventing a fixed live model name.
- Enforced QA mode, pattern evidence, separate implementation/QA identity, delivery boundary, and Outstanding items in task completion validation.
- Updated silent task-hook integration expectations and restored green workspace/package tests.
- Linked frontend scenario evals from the skill and wired their structural contract into the automated unit suite.
- Added tables of contents to long operational references for selective loading.
- Consolidated five non-parseable legacy response-shape `.json` fragments into one clearly labeled Markdown reference.

## 0.1.0 - 2026-07-14

- Created the `agrimap-agent-skills` umbrella workflow and `/agm-*` provider adapters.
- Added role/workflow contracts, explicit refactor modes, prompt delegation, QA gates, and task-level memory/logging.
- Added per-session requester attribution for multi-person projects.
- Added phase-aware Front-end Engineer workflow and reusable-artifact index tooling.
- Preserved legacy FE/BE/SQL coding examples with provenance and hashes, then removed legacy `.agm` governance.
- Added a canonical conflict matrix that separates corrected defects, project-dependent choices, and owner-required logical/data decisions without modifying raw examples.
- Added one-file/one-logical-contract writer ownership, workspace-mode detection, and Frontier-owned sandbox integration.
- Normalized `agmws` and `agmbo` as the only `backend_profile` values under `target_kind=be-main`; removed them from the target-kind dimension.
- Bound installation and package metadata to `gasxhermvc/agrimap-agent-skills`; license remains pending golden-example rights confirmation.
- Added Codex plugin, Claude marketplace/plugin, and Gemini extension packaging.
- Made `package.json` the single package-version source of truth for all generated provider manifests and marketplace metadata.
