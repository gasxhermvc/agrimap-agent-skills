---
name: agm-history
description: Query workflow attribution and audit-storage status by person, task, event, or UTC time range. Use when the requester invokes this AgriMap alias.
---

Activate and read the sibling `agrimap-agent-skills` umbrella skill. Run operation `history` with the requester's current arguments. Keep the umbrella workflow authoritative; do not add or duplicate rules in this alias. When the arguments contain a standalone `-h` or `--help` token, use the umbrella command-help contract and return help without starting a task or writing project state.
