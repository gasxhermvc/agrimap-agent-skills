---
name: agm-design
description: Design a user flow, behavior, and acceptance criteria. Use when the requester invokes this AgriMap alias.
---

Run operation `design` through the compact progressive-disclosure path. Read exactly these files relative to this alias before routing any conditional discipline:

1. `../agrimap-agent-skills/references/runtime-core.md`
2. `../agrimap-agent-skills/references/glossary.md`
3. `../agrimap-agent-skills/references/operations/design.md`

Do **not** read `../agrimap-agent-skills/SKILL.md` during a normal alias invocation. The compact entrypoint is authoritative for this operation and names every additional reference that may be loaded. Pass the requester's current arguments unchanged. If they contain a standalone `-h` or `--help` token, return the compact entrypoint's purpose, required inputs, conditional inputs, and minimal example without starting a task or writing project state. Use the umbrella only as an explicit fallback when a compact file is missing/corrupt or the requester invoked the umbrella directly with an unknown operation.
