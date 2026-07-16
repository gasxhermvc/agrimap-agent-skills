---
name: agm-analyze
description: Analyze scope, hidden problems, impacts, and trade-offs. Use only for the dedicated AgriMap `analyze` operation or when the requester explicitly invokes this alias; do not use it as a general AgriMap router.
---

Run only operation `analyze` through its compact progressive-disclosure path. Read exactly these files relative to this skill before loading any conditional discipline:

1. `../agrimap-agent-skills/references/runtime-core.md`
2. `../agrimap-agent-skills/references/glossary.md`
3. `../agrimap-agent-skills/references/operations/analyze.md`

Do **not** read `../agrimap-agent-skills/SKILL.md` during operation execution or combine another operation implicitly. The compact entrypoint is authoritative for this one operation and names every additional reference that may be loaded. Pass the requester's current arguments unchanged. If they contain a standalone `-h` or `--help` token, return the compact entrypoint's purpose, required inputs, conditional inputs, and minimal example without starting a task or writing project state. If a required compact file is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never fall back to the router.
