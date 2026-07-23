# Canonical QA and completion

This file is the single policy source for direct `light` QA, tracked `regulated` QA, correction, and regulated completion. Standard work uses proportional writer verification and records QA as not applicable.

## Verifier boundary

Product artifacts are read-only. At `light`, record concise memory/log evidence without creating `tasks/**`, `qa.md`, or a separate verifier context. Standard tracked work writes `qa.md` as `not-applicable` with its proportional writer-verification reason. At `regulated`, use a verifier context that did not write the product change; it may write only `qa.md`, checkpoint/log evidence, and an explicitly declared progress fallback. QA never fixes findings, deploys, mutates data, installs, publishes, regenerates, changes Git, or changes product files/configuration.

Treat the implementation Result Package as testimony: reopen actual files and diffs. A stronger model or provider does not receive broader tools or permission.

## Default and full selection

Start every QA request at `depth=light` and `qa_mode=light` unless one of these exact triggers is already present:

1. the requester explicitly asks for `qa_mode=full` or highest verification;
2. the requested delivery boundary is explicitly commit, publish, or release;
3. this is fresh re-QA after the task's first `qa-finding` correction; or
4. this is the third consecutive passed-light tracked closure for the same coverage key.

SQL/BE/FE scope, database-related code, public/data behavior, diff size, regulated implementation depth, provider, and model capability never select `full` by themselves. Record the selected mode and exact trigger; if none applies, the mode is `light`.

Workflow depth and QA mode are separate. A direct explicit full review may remain `depth=light qa_mode=full` without task artifacts; tracked separate QA is `depth=regulated`, and commit/publish/release, correction re-QA, or the third passed-light regulated closure requires `depth=regulated qa_mode=full`.

## Verification tool allowlist

Read-only file inspection, `git diff`, repository search, and AgriMap skill scripts are allowed. For executable validation, the allowlist is closed:

1. read-only script paths; SQLFluff installation and formatting are writer actions and are excluded;
2. `dotnet build <existing-project-or-solution>` for BE only when compile evidence is necessary—do not restore/install packages or change source/configuration; and
3. `npm run start:agrimap:development` for FE only at `qa_mode=full`, only when startup compilation evidence is explicitly necessary, and stop after ready/error evidence without browser interaction.

Do not use LocalDB, dbserver, SQL Server, `sqlcmd`, SSMS, database connections, migrations, seeds, containers, services, HTTP/browser calls, installs, SQLFluff, scanners/test runners, or other product commands. In particular, do not run other `npm run ...`, `dotnet test`, or database validation. Existing writer-produced results may be inspected as evidence but are not rerun. If required evidence exceeds the allowlist, return `blocked` or a limitation; do not expand tools.

## QA evidence

| Mode | Required evidence |
| --- | --- |
| `light` | requirements/diff review, relevant pattern Detect gates, static inspection, allowed AgriMap scripts, and a BE build only when compile evidence is necessary |
| `full` | broader light evidence plus only the necessary allowlisted BE build or FE startup check |

Map each requirement to evidence, inspect affected callers/contracts/data, and record exact commands actually run plus omitted checks and reasons.

## Status and correction

- `passed`: required allowlisted evidence exists and no blocking defect remains.
- `failed`: a reproducible defect or missing required item remains.
- `blocked`: required external evidence or authority is unavailable under the allowlist.
- `not-applicable`: only for a product-read-only artifact with a recorded reason.

There is no conditional pass. On the first regulated failure, end the verifier context, preserve the finding in `qa.md`, and append non-terminal `qa-finding`. The assigned writer may correct once within existing scope; then a fresh verifier runs full QA. A repeated failure closes without completion; the terminal audit event is `qa-failed`.

## Regulated completion gate

Complete only when scope/decisions/checklist are reconciled; proportional verification passed; the latest verifier passed or justified not-applicable; any correction has a fresh full result; schema fields contain no placeholders; memory/logs and delivery boundary are final; and commit/publish/release has full QA. The machine validator owns exact fields through `assets/task-artifact-schema.json`.
