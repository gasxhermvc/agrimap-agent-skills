# QA

- Status: passed
- Requested by: Billy
- QA actor: `/root/independent_qa`
- Read-only: true

## Requirement evidence

- FE discipline: canonical routing, role contract, workflow, alias metadata, and generated provider copy agree.
- QA separation: Frontier integrates/dispatches/synthesizes; independent QA reopens artifacts, samples claims, and cannot edit.
- QA failure: workspace `close --status qa-failed --next-prompt ...` requires a separate correction prompt and never marks the task complete.
- Analysis: `FACT`, `INFERENCE`, `HYPOTHESIS`, and `UNKNOWN` are routed through one discipline and template.
- Prompt SoT: one task prompt contains identity, evidence, decisions, ownership, steps, verification, deviation policy, and Result Package.
- Service ownership: `.agrimap-agent/knowledge/service-ownership.yaml` is the only project map, initialized empty; no Fable/TBD inventory was promoted.
- Fable: one canonical `fable` model label serves reasoning/review and hard execution; display label is Fable 5.
- Worktree: capability/surface detection replaces provider-name assumptions.
- Scope: no Back-end Engineer phase/change-kind discipline was introduced.

## Commands and observed results

- `npm test`: passed, 8 cases.
- `npm run validate`: passed, 15 aliases and package/contract checks.
- `npm run verify:golden`: passed, 69 checked and 0 failures.
- Independent SHA-256 comparison: 107 canonical files and 107 generated files, 0 mismatches.
- Active-source searches: no `change_kind`, Back-end phase coupling, or `fable5` entry.

## Findings

None.
