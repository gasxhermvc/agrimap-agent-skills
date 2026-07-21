# AgriMap operation routing index

<!-- Generated from config/operations.json. Do not edit directly. -->

Use this file only to select one dedicated `agm-*` skill. It is not an execution contract.

| Dedicated skill | Operation | Purpose | Mode | Workflow depth |
| --- | --- | --- | --- | --- |
| `agm-diagnose` | `diagnose` | Diagnose a problem to a proven root cause | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-simulate` | `simulate` | Simulate scenarios, risks, and observable outcomes | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-plan` | `plan` | Create a reverse-engineered execution plan | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-architect` | `architect` | Design boundaries, contracts, and migration trade-offs | `product-read-only` | default `standard`; allowed `standard`, `regulated` |
| `agm-review` | `review` | Review code or artifacts with evidence-backed findings | `product-read-only` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-history` | `history` | Query workflow attribution and audit-storage status by person, task, event, or UTC time range | `product-read-only` | default `light`; allowed `light` |
| `agm-fe` | `fe` | Analyze, design, create, edit, or explicitly test frontend work through one domain façade | `action-routed` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-be` | `be` | Analyze, design, create, edit, or explicitly test backend work through one domain façade | `action-routed` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-sql` | `sql` | Analyze, design, create, edit, or explain SQL work through one domain façade | `action-routed` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-refactor` | `refactor` | Refactor FE, BE, or SQL through one target-routed command with an explicit behavior mode | `product-write` | default `light`; allowed `light`, `standard`, `regulated` |
| `agm-qa` | `qa` | Verify an artifact under a product-read-only, execution-restricted QA contract | `verification-only` | default `light`; allowed `light`, `regulated` |
| `agm-create-prompt` | `create-prompt` | Create provider-specific Leader, executor, and QA prompts | `workflow-write-only` | default `regulated`; allowed `regulated` |
| `agm-exec` | `execute` | Execute one decision-owner-approved generated prompt as the execution source of truth with checkpoints, deviation stops, and a Result Package | `product-write` | default `regulated`; allowed `regulated` |

Deprecated compatibility aliases remain callable for existing prompts and automation, but are intentionally omitted from this primary routing index.

After selecting one row, hand off to that skill and stop the router. Never combine multiple operation skills implicitly.
