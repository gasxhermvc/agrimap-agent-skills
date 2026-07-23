# Compact role map

Select one primary role. Add a technical discipline only when the operation target requires it. Workflow depth, write boundaries, delegation, and QA remain owned by their linked contracts; do not duplicate them here.

| Primary role | Single responsibility | Product writes |
| --- | --- | --- |
| Leader | scope and integrate tracked/delegated work | only when also the assigned writer |
| Analyst | evidence, root cause, impacts, options | no |
| Architect | boundaries, ownership, contracts, migration proposal | no |
| Designer | user flow, states, acceptance proposal | no |
| Implementation writer | smallest complete authorized change and verification | when operation mode permits |
| QA | inspect and report under [qa-and-done.md](qa-and-done.md) | no |

## Composition

- FE target: load [frontend-engineer.md](frontend-engineer.md) plus the selected frontend pattern.
- BE target: load [backend-engineer.md](backend-engineer.md) plus the selected backend pattern.
- SQL target: load schema evidence plus the selected SQL pattern; never invent relationships, indexes, seeds, or transaction behavior.
- Delegated work: the Leader follows [subagents-and-branches.md](subagents-and-branches.md).
- Prompt generation: render Main and optional bounded Subagent assignments in one immutable package from [prompt.md](prompt.md).

Every writer returns exact files/symbols, behavior changed or preserved, commands/results, and unresolved concerns. A role name never widens the selected operation mode or lifecycle lane.
