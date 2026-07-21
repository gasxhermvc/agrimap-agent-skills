# Memory: Domain-oriented command surface v1

- Date: 2026-07-21
- Requested by: 006006
- Requirement: `agrimap-agent/requirements/command-surface/v1.md`
- Outcome: implemented and verified

## Decisions retained

1. The primary engineering surface is domain-oriented: `agm-fe`, `agm-be`, `agm-sql`, and `agm-refactor`.
2. Domain façades resolve exactly one action before inspection or product writes.
3. `analyze`, `design`, and SQL `explain` are product-read-only; `create`, `edit`, and explicit FE/BE `test` are product-write.
4. Passive design and test advice never grant write authority. SQL explain never executes SQL, connects to a database, or edits files.
5. Direct domain writes are light-only and route broader work to `agm-create-prompt`.
6. Old analyze/design/create-feature/create-unit-test/refactor-target aliases remain callable but are hidden from primary routing help as compatibility aliases.

## Implementation evidence

- Extended `config/operations.json` with three action-routed domain operations and one unified refactor operation.
- Extended operation generation and validation for action tables, public visibility, and compatibility replacements.
- Added `passive-capabilities.md` and integrated it into domain commands and `agm-create-prompt`.
- Updated lifecycle, elicitation, README, usage guide, generated provider adapters, and contract tests.
- Verification: `npm test` passed — 52 unit tests, 6 workspace integration tests, 7 usage integration tests, and golden verification 90/90.
