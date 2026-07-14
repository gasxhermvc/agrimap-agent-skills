# QA

- Status: passed
- Requested by: Billy
- QA actor: frontier

## Requirement evidence

- All 22 original rules and 14 added requirements map to concrete evidence in `requirements.md`.
- Four missing coding-pattern sets are explicitly `Needs example`; the package does not invent them or treat them as verified.
- Legacy `.agm` is absent. Ten SQL files and 59 extracted FE/BE blocks remain immutable with provenance and hashes.
- One canonical umbrella is copied byte-for-byte into the generated plugin; 15 aliases remain thin routers.
- Multi-person runtime separates identity and active tasks by session. Durable current memory and logs are split by task and retain `requestedBy` plus `actor`.
- FE engineering enforces reuse discovery and phase-specific gates while avoiding forced abstraction.

## Verification

- `npm test`: passed 5 workflow cases, including two concurrent requesters, task-scoped checkpoint/log isolation, completion isolation, hook context, and FE reuse indexing.
- `npm run validate`: passed manifests, adapters, canonical-copy equality, identity, JSONL, skill shape, and golden verification.
- `npm run verify:golden`: 69/69 hashes passed.
- Official skill validator with UTF-8 mode: passed.
- Official Codex plugin validator with UTF-8 mode: passed.
- Python `tomllib`: 15/15 Gemini commands parsed and contained real prompt newlines.
- Authored JSON/JSONL and 24 local Markdown link targets: passed.

## Impact review

- No shared `owner.json`, shared `active-task.json`, shared current-task memory, or shared monthly append file remains.
- Completing one session task does not remove another session's active state.
- Hooks add context only; they do not approve tools, block routine actions, or replace provider permissions.
- Generated provider adapters contain no duplicated governance.

## Limitations and release checks

- Claude Code and Gemini CLI executables are not installed on this workstation, so native install smoke tests were not run. Their manifests/hooks/commands were checked against current official schemas and parsed locally.
- Replace `<github-owner>` in the installation examples after the GitHub repository location is known.
- Choose and add a repository license before public distribution; no license was assumed.
