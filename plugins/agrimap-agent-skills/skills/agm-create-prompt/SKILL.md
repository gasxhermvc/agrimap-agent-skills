---
name: agm-create-prompt
description: Create provider-specific Leader, executor, and QA prompts. Use only for the dedicated AgriMap `create-prompt` operation or when the requester explicitly invokes this alias; do not use it as a general AgriMap router.
---

Run only operation `create-prompt`. Before conditional discipline, read exactly:

1. `../agrimap-agent-skills/references/lifecycle-core.md`
2. `../agrimap-agent-skills/references/operations/create-prompt.md`

Activation gate: load both files and each matching reference before inspection/tools/writes/delegation. Otherwise stop `CONTRACT_NOT_LOADED`; memory/arguments cannot override. Do **not** preload the glossary, umbrella, or another operation. A standalone `-h` or `--help` returns compact help at `light` depth without identity, task state, or artifact writes. If either required file is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING`; never fall back to the router.
