# Workflow source map

This compatibility index contains no executable lifecycle or operation rules. Normal `agm-*` invocations must not load it.

Use one source for each concern:

| Concern | Canonical source |
| --- | --- |
| lightweight/stateless/tracked selection and shared boundaries | [runtime-core.md](runtime-core.md) |
| operation inputs, mode, deliverable, and conditional references | generated `operations/<operation>.md` from `config/operations.json` |
| operation discovery | [operation-index.md](operation-index.md) |
| missing-input resolution | [elicitation.md](elicitation.md) |
| QA, correction cycle, terminal outcome, and tracked completion | [qa-and-done.md](qa-and-done.md) |
| delegation/workspace/progress | [subagents-and-branches.md](subagents-and-branches.md) |
| FE, BE, and SQL constraints | the single matching engineer/pattern reference named by the operation entrypoint |

Provider aliases are selection mechanisms, not permission gates. Apply the selected operation's mode and lifecycle exactly; do not merge multiple operation contracts or recreate the former six-phase umbrella flow.
