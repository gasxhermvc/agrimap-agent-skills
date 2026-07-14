# Input and scope contract

Normalize all owner input before analysis.

## Input manifest

Record each item with:

- `id`
- `kind`: `text`, `large-text`, `image`, `attachment`, `file`, `directory`, `url`, or `owner-note`
- `source`
- `priority`
- `owner_intent`
- `loaded`: `full`, `chunked`, `visual-inspection`, `metadata-only`, or `unavailable`
- `hash` when available
- `facts`
- `uncertainties`

## Large text

- Measure size before reading.
- Read fully when practical; otherwise index and chunk by stable headings or line ranges.
- Track which chunks were read.
- Never claim full coverage after partial reading.

## Images and multimodal files

- Use the platform's visual/file tools rather than treating binary content as text.
- Separate visible facts from interpretation.
- Preserve owner annotations and spatial references.
- If the model or tool cannot inspect the file, state that limitation and ask for a supported representation.

## Pointed files and directories

- Validate the path and scope before reading.
- Respect ignore files and the configured binary skip list.
- If the owner explicitly points to a normally skipped binary, use a suitable inspector; do not dump raw binary into context.

## Default skip list

Skip generated/dependency/build output unless the task targets it:

- `.git/`, `node_modules/`, `bin/`, `obj/`, `dist/`, `coverage/`
- `*.dll`, `*.exe`, `*.pdb`, `*.so`, `*.dylib`, `*.class`

Do not turn this list into a security policy. It is context hygiene only.

## Scope ledger

Before implementation, record objective, deliverables, non-goals, affected systems, logic/contract/data impact, tests, owner decisions, and unresolved concerns. For cross-service scope, point to the relevant `service_id` in `.agrimap-agent/knowledge/service-ownership.yaml`; do not copy a second ownership map. Update the ledger when the owner adds requirements.
