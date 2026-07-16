---
name: agm-refactor-be
description: Refactor backend code using an explicit behavior mode. Use when the requester invokes this AgriMap alias.
---

Activate the umbrella skill: read `../agrimap-agent-skills/SKILL.md` **relative to this file** (the umbrella directory sits next to this alias directory inside the same installed plugin — do not search elsewhere for it). Run operation `refactor-be` with the requester's current arguments. Follow the umbrella's routing and read-economy rules: load only the reference/pattern files its routing section selects for this operation and scope, never the whole reference tree. Keep the umbrella workflow authoritative; do not add or duplicate rules in this alias. When the arguments contain a standalone `-h` or `--help` token, use the umbrella command-help contract (provider-native syntax only) and return help without starting a task or writing project state.
