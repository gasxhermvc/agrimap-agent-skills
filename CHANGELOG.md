# Changelog

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
