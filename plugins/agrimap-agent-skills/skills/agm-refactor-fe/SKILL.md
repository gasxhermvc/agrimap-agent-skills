---
name: agm-refactor-fe
description: Refactor frontend code using an explicit behavior mode. Use only for the dedicated AgriMap `refactor-fe` operation or when the requester explicitly invokes this alias; do not use it as a general AgriMap router.
---

Run only operation `refactor-fe`. Before conditional discipline, read exactly:

1. `../agrimap-agent-skills/references/lifecycle-core.md`
2. `../agrimap-agent-skills/references/operations/refactor-fe.md`

Activation gate: load both files and each matching reference before inspection/tools/writes/delegation. Otherwise stop `CONTRACT_NOT_LOADED`; memory/arguments cannot override. Do **not** preload the glossary, umbrella, or another operation. A standalone `-h` or `--help` returns compact help at `light` depth without identity, task state, or artifact writes. If either required file is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING`; never fall back to the router.
