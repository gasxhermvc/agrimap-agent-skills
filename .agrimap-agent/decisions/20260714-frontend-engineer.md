# Front-end Engineer decision

- Requested by: Billy
- Decision: Use Front-end Engineer as a discipline automatically composed with every FE workflow. Keep `/agm-fe-engineer` as its direct entry point, with `foundation`, `active-development`, and `stabilization` phases.
- Reuse rule: Search the codebase and reusable-artifact index before creating reusable functions, code, components, services, directives, pipes, tokens, or config.
- Index: Keep `.agrimap-agent/knowledge/frontend-reuse.jsonl` deterministic and vector-ready; scanner discoveries require frontier/human verification.
- Boundary: Prefer reuse, safe extension, and composition, but do not force a generic abstraction without proven consumers.
- Reason: Frontend scope and team divergence create distributed technical debt even when individual code units are not algorithmically difficult.
- Updated: 2026-07-15 by Billy's explicit decision after the Fable comparison.
