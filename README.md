# agrimap-agent-skills

Official AgriMap engineering skill package by Billy. One umbrella workflow is the source of trust; Codex, Claude Code, and Gemini CLI receive thin provider-native `/agm-*` or `$agm-*` adapters.

ชุด Skill ทางการสำหรับงาน AgriMap ครอบคลุม analysis, diagnosis, simulation, planning, design, architecture, FE engineering, review, FE/BE/SQL refactor, QA, unit tests, feature creation, prompt delegation, project memory, and concise logs.

## Design

```text
skills/agrimap-agent-skills/       canonical workflow + patterns + scripts
              │
              ├── Codex plugin skills ($agrimap-agent-skills, $agm-*)
              ├── Claude plugin skills (/agrimap-agent-skills:agm-*)
              └── Gemini extension commands (/agm-*) + umbrella skill

project/.agrimap-agent/            tracked tasks, per-task memory/logs, knowledge, decisions
project/.agrimap-agent/runtime/    ignored per-session identity + active tasks
```

The package does not import legacy `.agm` governance and does not create an extra permission layer. Platform permissions remain authoritative. Preserved legacy code samples are compatibility evidence only and are hash-verified.

## Requirements

- Git
- Node.js 20 or newer for hooks and workspace/index scripts
- one supported host: Codex, Claude Code, or Gemini CLI

Repository: [gasxhermvc/agrimap-agent-skills](https://github.com/gasxhermvc/agrimap-agent-skills)

Usage guide: [docs/USAGE.md](docs/USAGE.md) — provider syntax, activation proof, all operation examples, large text, images, attachments, and pointed files/lines.

## Install for Codex

```powershell
codex plugin marketplace add gasxhermvc/agrimap-agent-skills
codex plugin add agrimap-agent-skills@agrimap-agent-skills
```

Start a new Codex session after installation. In Codex CLI, `/plugins` can also browse and install the plugin after the marketplace is added. Invoke the umbrella as `$agrimap-agent-skills` or an active alias such as `$agm-create-feature`.

Local repository testing:

```powershell
codex plugin marketplace add .
codex plugin add agrimap-agent-skills@agrimap-agent-skills
```

## Install for Claude Code

From a terminal:

```powershell
claude plugin marketplace add gasxhermvc/agrimap-agent-skills
claude plugin install agrimap-agent-skills@agrimap-agent-skills
```

Or run the equivalent `/plugin marketplace add` and `/plugin install` commands inside Claude Code. Installed skill names are namespaced, for example:

```text
/agrimap-agent-skills:agrimap-agent-skills
/agrimap-agent-skills:agm-create-feature
/agrimap-agent-skills:agm-create-prompt
```

Local validation and installation:

```powershell
claude plugin validate .
claude plugin marketplace add .
claude plugin install agrimap-agent-skills@agrimap-agent-skills
```

## Install for Gemini CLI

Run from the terminal, not from Gemini's interactive prompt:

```powershell
gemini extensions install https://github.com/gasxhermvc/agrimap-agent-skills
```

Restart Gemini CLI after installation. Invoke `/agm-create-feature`, `/agm-plan`, or another generated command. For local development:

```powershell
gemini extensions link .
```

Gemini may show its native consent prompt when activating a skill or fingerprinting a hook. The package does not add a second approval gate.

## First use in a project

At the first chat/session interaction, the Leader must resolve who is requesting the work. In a multi-person project there is no shared `owner.json`.

- ignored live identity: `.agrimap-agent/runtime/sessions/<session-id>.json`
- ignored active task: `.agrimap-agent/runtime/active/<session-id>.json`
- tracked attribution: `Requested by` in the task brief and `requestedBy` in every task-scoped JSONL log event
- execution attribution: `model`, `role`, `agent`, and `provider` are separate; `requestedBy` remains the human

If the hook cannot identify the current human, it instructs the agent to ask before substantive work. It must never copy the requester from the latest shared log.

Manual bootstrap or diagnostics:

```powershell
node <installed-package>\skills\agrimap-agent-skills\scripts\agm-workspace.mjs init --cwd .
node <installed-package>\skills\agrimap-agent-skills\scripts\agm-workspace.mjs identify --cwd . --session <session-id> --owner "Billy" --model "gpt-5.6-sol" --role leader --agent primary --provider codex
node <installed-package>\skills\agrimap-agent-skills\scripts\agm-workspace.mjs start --cwd . --session <session-id> --operation create-feature --title "Build shared table"
node <installed-package>\skills\agrimap-agent-skills\scripts\agm-workspace.mjs checkpoint --cwd . --session <session-id> --task <task-id> --summary "Reuse scan completed" --files "src/a.ts,src/b.ts" --verification "typecheck passed"
```

Commit `.agrimap-agent/tasks`, `memory/project.md`, task-scoped `memory/current|recent`, `knowledge`, `decisions`, `prompts`, and task-scoped `logs`. Do not commit `.agrimap-agent/runtime` or `.agrimap-agent/cache`.

## Operations

| Alias | Purpose |
| --- | --- |
| `agm-analyze` | hidden problem, scope, impact, options, trade-off |
| `agm-diagnose` | evidence-led root cause |
| `agm-simulate` | scenarios, risks, transitions, observables |
| `agm-plan` | reverse-engineered execution plan |
| `agm-design` | flow, behavior, states, acceptance |
| `agm-architect` | boundaries, contracts, migration |
| `agm-review` | evidence-backed findings |
| `agm-refactor-fe/be/sql` | explicit refactor behavior mode |
| `agm-qa` | independent read-only requirements-to-evidence verification |
| `agm-create-unit-test` | target-specific tests |
| `agm-create-feature` | FE/BE/batch/library/SQL feature |
| `agm-create-prompt` | provider/model-aware delegation prompts |

For backend creation/testing, use `target_kind=be-main` with required `backend_profile=agmws|agmbo`. These profiles are not target kinds; no generic or fallback profile exists. `be-library` does not use `backend_profile`.

## Front-end Engineer discipline

The passive discipline is automatically composed with every FE analysis, design, architecture, feature, refactor, review, test, QA, and prompt task. It has no separate command. Every FE task classifies `fe-main` or `fe-library` and one phase:

- `foundation`: structure, tokens, config, development infrastructure, Core/CodeBase/SharedComponent;
- `active-development`: reuse discovery, consistency, consumer impact, technical-debt containment for multi-developer delivery;
- `stabilization`: flow completion, bugs, quality, bounded refactor, platform security checks, and deploy confidence.

Before creating a reusable function/component/service/directive/pipe/token/config, search code and `.agrimap-agent/knowledge/frontend-reuse.jsonl`. Prefer exact reuse, safe extension, or composition. Do not force reuse into an option-heavy abstraction.

```powershell
node <installed-package>\skills\agrimap-agent-skills\scripts\frontend-reuse-index.mjs scan --cwd . --paths src,projects,libs --by "Billy"
node <installed-package>\skills\agrimap-agent-skills\scripts\frontend-reuse-index.mjs search --cwd . --query "table pagination"
node <installed-package>\skills\agrimap-agent-skills\scripts\frontend-reuse-index.mjs deprecate --cwd . --id "component:src/path#Symbol" --replacement "component:src/new-path#Symbol" --by "Billy"
node <installed-package>\skills\agrimap-agent-skills\scripts\frontend-reuse-index.mjs validate --cwd .
```

Scanner results start as `discovered`. The Leader inspects suitability and promotes an entry to `verified` with `upsert`; no embedding/vector service is required in v1.

## Back-end Engineer discipline

The passive discipline is automatically composed with every BE task and has no separate command. It requires:

- `target_kind=be-main|be-library`;
- `backend_profile=agmws|agmbo` only for `be-main`;
- `phase=foundation|active-development|stabilization`.

There is no Type A/B/C and no required `change_kind`. `agmws` is the web host flow `Presentation -> Application/UseCase -> Domain -> Port -> Infrastructure -> response`. `agmbo` has no Presentation tier and starts from `Quartz/TaskScheduler -> Application/UseCase -> Domain -> Port -> Infrastructure`; `Infrastructure/TaskScheduler.cs` contains scheduling concerns, never business logic.

Foundation reuses `agrimap.platform` before creating Core infrastructure. Active development analyzes the existing Domain first and completes the smallest vertical slice. Stabilization emphasizes regression safety, production configuration, deployment, existing vulnerability checks, and bounded refactor.

## Model labels and prompt generation

The default capability matrix preserves Billy's configurable labels. Claude reasoning/review uses `fable` (displayed as Fable 5) or `opus4.8`; the same `fable` model is also the hard executor, while standard/light execution uses `sonnet5`, `sonnet4.6`, or `haiku4.5`. Codex reasoning/review uses `GPT-5.6-sol`; execution uses `gpt-5.6-sol`, `gpt-5.4`, or `gpt-5.4-mini`.

These are owner-editable routing labels, not hardcoded provider claims. Override model names in `.agrimap-agent/model-capability-matrix.yaml` or the generated prompt without weakening the workflow contract.

An owner-approved generated prompt is the execution SoT for exactly one task. It keeps the problem, end state, evidence, owner decisions, file/contract ownership, ordered steps, verification, deviation policy, and Result Package together. Plain language is preferred; missing contracts are not.

## QA separation and task closure

Implementation and final QA are separate responsibilities. The Leader integrates executor handoffs, then dispatches an independent read-only QA subagent/context. QA reopens the actual artifact and reruns selected claims; it never fixes findings and never returns a conditional pass.

If QA fails, the Leader records `qa-failed`, summarizes the evidence, and prepares a correction prompt for a new task. It does not edit the failed implementation inside the task under verification:

```powershell
node <installed-package>\skills\agrimap-agent-skills\scripts\agm-workspace.mjs close --cwd . --session <session-id> --task <failed-task-id> --status qa-failed --next-prompt .agrimap-agent/prompts/<new-task-id>/executor.md
```

`complete` remains reserved for a checked checklist plus passed or justified not-applicable QA.

## State and log location

The global installation is stateless. On real work, both logs and memory are written to the project currently being changed: `<target-project>/.agrimap-agent/`. The Skill/plugin installation directory is never a state destination.

This repository is the Skill's development source, so its entire `.agrimap-agent/` is local-only and ignored by Git. It will not be published to GitHub. In an ordinary target project, the generated `.agrimap-agent/.gitignore` ignores only `runtime/` and `cache/`; project memory, knowledge, task results, prompts, and concise logs remain available to the project team.

AI Gateway storage is not part of v1.

## Service ownership source of trust

Use `.agrimap-agent/knowledge/service-ownership.yaml` as the only project service/data ownership map. Analyses, prompts, decisions, and memory point to its `service_id` entries instead of copying another map. Claims are `confirmed`, `tentative`, `unknown`, or `deprecated`; only confirmed, current evidence may drive a hard ownership decision.

The package initializes an empty canonical file and intentionally does not promote the Fable service inventory with many TBD values. Migrate each useful entry after evidence review.

## Delegation and sandbox integration

The Leader must define `workspace_need` and verify whether executors share a workspace, use visible worktrees, or run in isolated sandboxes. A branch name alone is never accepted as proof that another agent's work can be integrated.

- one file and one logical contract have one writer model per integration wave;
- shared registration/export/route/DI/schema files belong to one executor or the Leader;
- overlapping work is combined or executed sequentially;
- isolated work returns a visible commit SHA, portable patch, or complete changed artifacts;
- the Leader integrates, dispatches independent QA, and synthesizes evidence, so the human owner is not left to collect agent fragments.

Every delegation prompt states isolation need, requested mode, base ref/commit, provider instruction, visibility check, integration return, and fallback. Claude Code can use custom subagent `isolation: worktree` when the installed version supports it; Codex managed worktrees are surface-dependent. Unsupported or unknown modes use only the named shared/sequential fallback. Uncommitted parent changes are never assumed visible in an isolated worktree.

## License status

No license is committed yet. MIT is the recommended license for the skill engine and newly authored documentation, but preserved golden examples must first be confirmed as publishable by their rights holder or sanitized/excluded. A public repository without a license is visible but does not grant general reuse rights.

## Missing pattern examples

The package deliberately does not invent company conventions. These example sets are still needed to promote patterns from `missing-owner-example`:

- FE library public API/service/generated API/consumer/test
- BE library README and Playground
- `agmbo` `Infrastructure/TaskScheduler.cs`
- FE/BE/SQL unit-test conventions

See `skills/agrimap-agent-skills/references/patterns/owner-example-intake.md` for the exact files, symbols, naming, comments, and commands to provide. Raw examples stay immutable; annotation and status live separately.

## Maintain and release

```powershell
npm run sync
npm test
npm run validate
```

`package.json` is the only package-version source of truth. `npm run sync` propagates that version to the Codex manifest, Claude manifest/marketplace, and Gemini manifest while rebuilding all thin aliases and provider adapters from the canonical umbrella and `config/operations.json`. Never edit generated alias skills, Gemini command files, or generated manifest versions directly. Before a public release, resolve the golden-example rights/license decision, update `package.json`, add the release entry to `CHANGELOG.md`, then rerun sync, tests, and validation.

Official format references: [Codex plugins](https://developers.openai.com/codex/build-plugins), [Claude plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), and [Gemini extensions](https://geminicli.com/docs/extensions/reference/).
