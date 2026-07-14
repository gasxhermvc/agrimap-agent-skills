# Architecture decision

- Requested by: Billy
- Decision: Use an umbrella kernel named `agrimap-agent-skills` as the only authored workflow source of trust.
- Distribution: Generate thin syntax adapters for Codex, Claude, and Gemini.
- Reason: Preserve one workflow while respecting different native invocation and hook formats.
- Constraint: Adapters may route and bind arguments but must not duplicate policy text.
