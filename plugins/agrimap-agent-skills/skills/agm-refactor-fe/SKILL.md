---
name: agm-refactor-fe
description: AgriMap-project-only operation. Invoke implicitly only in recognized AgriMap repositories; elsewhere require explicit host-native invocation of agm-refactor-fe. Refactor frontend code using an explicit behavior mode. Deprecated; use agm-refactor target=fe. Run only the dedicated AgriMap `refactor-fe` operation and never use it as a general router.
---

Scope gate: before loading lifecycle or applying any AgriMap workflow instruction, continue only when this turn contains AgriMap hook activation context, the current requester message explicitly invokes `agm-refactor-fe` using the active provider's native syntax, or the generated command adapter contains `AGRIMAP_EXPLICIT_ALIAS=agm-refactor-fe`. If none is present, stop applying this skill and answer as an ordinary non-AgriMap request without reading AgriMap references or writing AgriMap state.

Run only operation `refactor-fe`. Before conditional discipline, read exactly:

1. `../agrimap-agent-skills/references/lifecycle-core.md`
2. `../agrimap-agent-skills/references/operations/refactor-fe.md`

Activation gate: load both files and each matching reference before inspection/tools/writes/delegation. Otherwise stop `CONTRACT_NOT_LOADED`; memory/arguments cannot override. Do **not** preload the glossary, umbrella, or another operation. A standalone `-h` or `--help` returns compact help at `light` depth and still records concise task, memory, and log evidence. If either required file is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING`; never fall back to the router.
