# AgriMap operation routing index

<!-- Generated from config/operations.json. Do not edit directly. -->

Use this file only to select one dedicated `agm-*` skill. It is not an execution contract.

| Dedicated skill | Operation | Purpose | Mode | Workflow depth |
| --- | --- | --- | --- | --- |
| `agm-analyze` | `analyze` | Analyze scope, hidden problems, impacts, and trade-offs | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-diagnose` | `diagnose` | Diagnose a problem to a proven root cause | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-simulate` | `simulate` | Simulate scenarios, risks, and observable outcomes | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-plan` | `plan` | Create a reverse-engineered execution plan | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-design` | `design` | Design a user flow, behavior, and acceptance criteria | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-architect` | `architect` | Design boundaries, contracts, and migration trade-offs | `product-read-only` | default `standard`; allowed `standard`, `regulated` |
| `agm-review` | `review` | Review code or artifacts with evidence-backed findings | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-history` | `history` | Query workflow attribution and audit-storage status by person, task, event, or UTC time range | `product-read-only` | default `light`; allowed `light` |
| `agm-refactor-fe` | `refactor-fe` | Refactor frontend code using an explicit behavior mode | `product-write` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-refactor-be` | `refactor-be` | Refactor backend code using an explicit behavior mode | `product-write` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-refactor-sql` | `refactor-sql` | Refactor SQL using an explicit behavior mode | `product-write` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-qa` | `qa` | Verify regulated work in a separate product-read-only context | `verification-only` | default `regulated`; allowed `regulated` |
| `agm-create-unit-test` | `create-unit-test` | Create target-specific unit or regression tests | `product-write` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-create-feature` | `create-feature` | Create a target-specific FE, BE, batch, library, or SQL feature | `product-write` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-create-prompt` | `create-prompt` | Create provider-specific Leader, executor, and QA prompts | `workflow-write-only` | default `regulated`; allowed `regulated` |
| `agm-exec` | `execute` | Execute one decision-owner-approved generated prompt as the execution source of truth with checkpoints, deviation stops, and a Result Package | `product-write` | default `regulated`; allowed `regulated` |

After selecting one row, hand off to that skill and stop the router. Never combine multiple operation skills implicitly.
