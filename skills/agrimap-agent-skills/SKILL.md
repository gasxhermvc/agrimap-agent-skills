---
name: agrimap-agent-skills
description: Route an ambiguous or direct umbrella AgriMap request to exactly one dedicated agm-* operation skill. Use when the requester asks which AgriMap operation to choose, invokes the umbrella without a dedicated alias, or provides an unknown legacy operation name. Do not use this router to execute engineering, QA, history, memory, delegation, or prompt-generation work when a dedicated agm-* skill is known.
---

# AgriMap operation router

Perform one task only: select one dedicated `agm-*` skill. Do not execute that skill's workflow, inspect product code, create task state, load domain patterns, update memory/logs, delegate, or run QA from this router.

## Route

1. Read only [operation-index.md](references/operation-index.md).
2. Preserve the requester's objective and arguments verbatim.
3. Select exactly one operation when the request clearly matches one row.
4. Render the selected alias in the active provider's syntax from [platform-syntax.md](references/platform-syntax.md).
5. Return a routing receipt containing:
   - `AgriMap router active`
   - selected dedicated skill and operation;
   - one-sentence match reason;
   - runnable provider-specific invocation with preserved arguments.
6. Stop. The selected dedicated skill owns activation, requester/authority resolution, product/workflow artifacts, references, execution, memory, delegation, QA, and completion.

If two or three operations remain materially plausible, ask one short disambiguation question listing only those candidates. Do not load their operation entrypoints to decide. If no operation matches, report `UNKNOWN_OPERATION` and list the closest dedicated skills without executing them.

## Help

For `-h`, `--help`, or a request with no objective, list the dedicated skills and their one-line purposes from the generated index. Do not start a task or write project state.

## Package failure

The router is not a fallback execution engine. If a selected alias, runtime core, glossary, or generated operation entrypoint is missing/corrupt, report `PACKAGE_ENTRYPOINT_MISSING` with the affected path and instruct the requester to run package sync or reinstall. Never broaden this router into FE, BE, SQL, memory, QA, delegation, or prompt execution.
