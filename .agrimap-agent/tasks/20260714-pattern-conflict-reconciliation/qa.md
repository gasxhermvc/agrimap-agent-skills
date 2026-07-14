# QA

- Status: passed
- Requested by: Billy
- QA actor: frontier

## Requirement evidence

- `references/patterns/conflict-resolution.md` classifies FE/BE/SQL contradictions without modifying raw examples.
- `subagents-and-branches.md`, `create-prompt.md`, task/checklist templates, umbrella routing, and subagent hook enforce one writer per file/logical contract and explicit workspace mode.
- README/package/provider metadata use `gasxhermvc/agrimap-agent-skills`; `origin` points to the same repository.
- MIT recommendation and golden-example rights concern are recorded separately; no `LICENSE` was silently added.

## Commands and observed results

- `npm run sync`: passed; 15 adapters rebuilt from the canonical umbrella.
- `npm test`: passed 6 cases, including subagent ownership/sandbox integration context.
- `npm run validate`: passed manifests, adapters, identity, JSONL, conflict routing, delegation ownership, and golden verification.
- `npm run verify:golden`: passed 69/69 hashes.
- Official skill validator: passed.
- Official Codex plugin validator: passed.
- Authored JSON excluding immutable pseudo-JSON evidence, 15 Gemini TOML commands, and 27 local Markdown links: passed.
- Broad `.json` parse intentionally rejected five immutable backend response-shape examples; the conflict annotation classifies them as illustrative notes rather than valid fixtures.

## Regression surface

- Plugin canonical copy matches the authored skill after sync.
- No raw golden content changed; hashes still match.
- Existing provider aliases remain 15 and thin.
- Hook still preserves per-session requester identity and now adds non-overlap/integration guidance only for subagents.
- No publish, push, commit, or license grant occurred.

## Limitations

- FE/BE/SQL conventions marked project-dependent or owner-required remain intentionally unresolved until Billy's project tour/evidence.
- Native sandbox visibility differs by provider; the policy therefore defaults unknown environments to sequential writers.
- Public licensing remains pending rights confirmation for the preserved golden examples.
