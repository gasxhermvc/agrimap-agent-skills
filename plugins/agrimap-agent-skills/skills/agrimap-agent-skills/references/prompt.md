# Versioned Prompt Result workflow

`agm-prompt` turns requester intent into one executable Prompt Package. It is a `light`, workflow-write-only operation: it may write prompt/memory/log/report evidence, but never product files or `tasks/**`.

## V0 and immutable versions

- V0 is only the requester input/start state. Do not create a V0 file.
- The first finalized model answer creates V1 immediately.
- A later requester turn focused on the prior Prompt Result creates V2, V3, and so on. Never overwrite or edit an earlier version.
- Keep the original `YYYY-MM` partition and stable context slug for the full family, including continuations in a later month.
- One version is one Prompt Package file. Main and Subagent assignments are sections in that same file, not separate role files.

Canonical path:

```text
.agrimap-agent/prompts/YYYY-MM/<conversation-id>/<context>-vNNN.md
```

Use `scripts/agm-prompt-version.mjs create` to validate source lineage and allocate the next version atomically.

## Source selection

1. When the requester names a Prompt Result file, validate that it is inside `.agrimap-agent/prompts/YYYY-MM/<conversation-id>/`, matches `<context>-vNNN.md`, belongs to the requested conversation/context family, and is the latest version. Use it as the explicit source.
2. Without an explicit file, inspect only the same conversation and context. Continue automatically only when exactly one credible family exists.
3. Zero families means a new V1 family. More than one family, a mismatched path, or uncertain conversational focus stops with `PROMPT_SOURCE_CONFIRM_REQUIRED`; ask the owner/requester to identify the source file.
4. Previous Prompt Result content is source material, not a mutable document. The new version must carry forward still-valid requirements and explicitly apply additions, changes, or removals.

## Required metadata

Every version records:

- `prompt_family_id`
- `version`
- `supersedes`
- `requester`
- `created_at`
- `provider`
- `model`
- `source_selection_method`
- `prompt_status`: `draft|owner-approved|superseded|executed`
- `intended_execution_operation`

Do not store full transcripts, raw tool output, hidden reasoning, or AI conversational answers in metadata. Raw requester submits are separate conversation-scoped history evidence.

## Reasoning and scope

Apply Goal Rules before producing the package:

1. restate the problem, current evidence, and required end state;
2. resolve material ambiguity instead of guessing;
3. choose the smallest complete approach and state materially simpler alternatives;
4. define logic/contract/data boundaries and non-goals;
5. define measurable acceptance and verification before ordered work;
6. use the URL matrix whenever FE/BE domain, redirect, or callback logic is in scope.

## Main and Subagent boundary

Small or tightly coupled work uses Main only. Large work may assign Subagents only for independent ownership.

The Prompt Package always contains:

- `## Main Assignment` with overall ownership, integration, files/contracts, forbidden scope, model profile, ordered work, verification, and handoff;
- `## Subagent Assignments` with either `None — Main owns all work` or one bounded subsection per Subagent;
- one writer per file or logical contract in an integration wave;
- explicit forbidden overlap for every writer;
- Main ownership of integration, conflict resolution, final verification synthesis, and deviation decisions.

Each Subagent assignment names objective, model/profile, exact files or logical contracts, forbidden files/contracts, ordered work, verification, workspace/integration return, and handoff. Generating these assignments does not dispatch agents.

## Prompt Package sections

After the metadata front matter, use this order:

1. `# Prompt Result — <title>`
2. `## Problem and Required End State`
3. `## Evidence and Source of Trust`
4. `## Authorized Decisions and Requester Inputs`
5. `## Scope and Non-goals`
6. `## Logic, Contract, and Data Constraints`
7. `## Main Assignment`
8. `## Subagent Assignments`
9. `## Ordered Execution and Verification`
10. `## Acceptance Criteria`
11. `## Deviation and Handoff Contract`

The model result must be executable without reconstructing hidden reasoning. Point to canonical references instead of copying their full policy.

## Execution boundary

- `agm-prompt` ends after saving the version and its light memory/log/report evidence.
- It never executes the package, creates task files, or creates `.agrimap-agent/instructions/**` role files.
- `agm-exec` accepts only an approved Prompt Result, starts its own regulated execution, and treats the selected version as immutable source of truth.
- Routine local choices may proceed when they preserve the package. Contradictory evidence or a material scope/logic/contract/data/ownership deviation stops the affected step and returns structured evidence for a new Prompt Result version.
