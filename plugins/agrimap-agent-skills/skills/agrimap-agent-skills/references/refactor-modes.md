# Refactor modes

Require one mode before changing code. If the owner did not name one, present these choices and recommend the narrowest mode that closes the problem.

## `performance-preserve-behavior`

Improve measured performance while preserving externally observable behavior and business results. Require a baseline, target metric, representative data, and regression checks.

## `readability-organization`

Improve clarity, naming, structure, or duplication without changing logic, contracts, output, ordering, or side effects. Avoid broad architectural movement.

## `strict-preserve-logic`

Allow mechanical restructuring only. Preserve conditions, calculation order, transaction behavior, queries, contracts, and error mapping. Prove equivalence with tests or before/after evidence.

## `strict-allow-logic-change`

Allow intentional logic improvement. Require concern -> conversation -> owner trade-off before editing. Record old behavior, new behavior, compatibility impact, migration/rollback, and the selected unit tests/test cases.

## `targeted-bug-fix`

Change only the logic required to eliminate a proven defect. Capture the failing case first, add regression evidence, and keep unrelated cleanup as a follow-up concern.

## Required refactor brief

Record:

- `mode`
- `objective`
- `behavior_to_preserve`
- `behavior_allowed_to_change`
- `performance_metric` when applicable
- `scope_files`
- `excluded_scope`
- `tests`
- `rollback`

