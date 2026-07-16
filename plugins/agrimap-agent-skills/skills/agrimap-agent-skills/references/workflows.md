# Workflow source map

This compatibility index contains no executable lifecycle or operation rules. Normal `agm-*` invocations must not load it.

Use one source for each concern:

| Concern | Canonical source |
| --- | --- |
| `light|standard|regulated` selection, shared boundaries, and milestones | [lifecycle-core.md](lifecycle-core.md) |
| operation inputs, mode, deliverable, and conditional references | generated `operations/<operation>.md` from `config/operations.json` |
| operation discovery | [operation-index.md](operation-index.md) |
| missing-input resolution | [elicitation.md](elicitation.md) |
| regulated QA, correction cycle, terminal outcome, and completion | [qa-and-done.md](qa-and-done.md) |
| delegation/workspace/progress | [subagents-and-branches.md](subagents-and-branches.md) |
| FE, BE, and SQL constraints | the single matching engineer/pattern reference named by the operation entrypoint |

Provider aliases are selection mechanisms, not permission gates. Apply the selected operation's mode and workflow depth exactly; do not merge multiple operation contracts or recreate the former six-phase umbrella flow.
