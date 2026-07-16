---
name: agm-refactor-be
description: Refactor backend code using an explicit behavior mode. Use only for the dedicated AgriMap `refactor-be` operation or when the requester explicitly invokes this alias; do not use it as a general AgriMap router.
---

Run only operation `refactor-be`. Read exactly these two files relative to this skill before any conditional discipline:

1. `../agrimap-agent-skills/references/lifecycle-core.md`
2. `../agrimap-agent-skills/references/operations/refactor-be.md`

Do **not** preload the glossary, umbrella, or another operation. The operation entrypoint names every conditional reference. Pass the requester's arguments unchanged. A standalone `-h` or `--help` returns compact help at `light` depth without identity, task state, or artifact writes. If either required file is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING`; never fall back to the router.
