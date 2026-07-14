# Pattern status

Use these statuses:

- `verified`: owner or current project confirms the pattern is authoritative.
- `legacy-compatible`: retained because deployed code may follow it; compare with the current project.
- `unverified`: useful evidence with unresolved correctness or placement concerns.
- `missing-owner-example`: do not establish a new global convention from this skill.

## Current catalog

| Pattern | Status | Notes |
| --- | --- | --- |
| FE main facade/signal/generated API | `legacy-compatible` | Architecture is useful; `conflict-resolution.md` contains canonical corrections while raw snippets remain immutable. |
| FE library | `missing-owner-example` | Read local library or request examples. |
| BE new boundary placement | `verified` | Map transport DTOs before inward repository ports; classify models by meaning. Do not silently migrate legacy code. |
| BE main with `backend_profile=agmws` examples | `legacy-compatible` | Layer flow is useful; exact port location, route/response conventions, and Domain versus persistence examples need owner tour evidence. |
| BE main with `backend_profile=agmbo` scheduler | `missing-owner-example` | Requires `TaskScheduler.cs` example. |
| BE library README + Playground | `missing-owner-example` | Requirement known; exact pattern missing. |
| SQL structural frame | `legacy-compatible` | Raw examples are immutable; follow current-project headers, transaction, and deployment rhythm. |
| SQL relationship/data semantics | `unverified` | Cascade, seed IDs, list input, indexing, and replace semantics require project evidence or owner decision. |
| FE/BE/SQL unit tests | `missing-owner-example` | Read the target project's framework and naming first. |

Change a status only with owner approval or strong current-project evidence. Record the change in `.agrimap-agent/decisions/` and knowledge index.
