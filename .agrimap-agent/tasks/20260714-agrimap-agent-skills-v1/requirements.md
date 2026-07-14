# Requirement ledger

Nothing in this ledger may be silently dropped. `Implemented` means the package contains a concrete workflow, script, template, or adapter; `Needs example` means behavior is intentionally not invented.

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| R01 | Read skill/context before work | Implemented | `SKILL.md` start sequence; session/task hooks |
| R02 | Always expose material owner trade-offs | Implemented | `SKILL.md` evidence/analysis rules |
| R03 | Present materially different solutions before implementation | Implemented | `SKILL.md` analyze-before-editing |
| R04 | Pre-work checklist | Implemented | `assets/templates/checklist.md`; workspace CLI |
| R05 | State reason for changes | Implemented | checklist, prompt step contract, log schema |
| R06 | Avoid over-engineering | Implemented | smallest-complete-change and role boundaries |
| R07 | Finish original problem; separate follow-on concerns | Implemented | execution and completion contract |
| R08 | Inspect related code and impact before changes | Implemented | analysis workflow and QA sequence |
| R09 | Confirm scope before work | Implemented | input/scope ledger and task brief |
| R10 | Inspect changed point and impact afterward | Implemented | QA sequence |
| R11 | Never claim done with unchecked checklist | Implemented | CLI validation and completion gate |
| R12 | Correctness first; refactor/improve afterward | Implemented | execution workflow and refactor modes |
| R13 | Frontier prompts include exact files, current lines, stable anchors, and explicit steps | Implemented | `create-prompt.md` |
| R14 | Assign task by model capability | Implemented | model capability matrix |
| R15 | Provider/model names are prompt variables and owner-editable | Implemented | prompt workflow/template/matrix override |
| R16 | Same umbrella SoT across providers/models | Implemented | canonical skill plus generated thin aliases |
| R17 | Logic changes require concern/conversation/trade-off and test choice | Implemented | `SKILL.md`; strict logic-change mode |
| R18 | Executor prompts name extra skills/references to load | Implemented | prompt required variables and sections |
| R19 | Frontier integrates and runs final QA; effect work becomes a new task with memory | Implemented | subagent and QA contracts |
| R20 | Frontier assigns branch/worktree names when useful | Implemented | `subagents-and-branches.md` |
| R21 | Maximum five active subagents | Implemented | umbrella and model matrix |
| R22 | Frontier updates vector/index-ready knowledge SoT | Implemented | memory/knowledge schema and FE reuse index |
| A01 | Remove old `.agm` rules; preserve only coding patterns | Implemented | `.agm` absent; 69 golden blocks/files hash-verified |
| A02 | One umbrella, Thai+English usage, official Codex/Claude/Gemini packaging | Implemented | three provider adapters and `README.md` |
| A03 | GitHub/company Git installation | Implemented | Codex/Claude marketplaces and Gemini extension guide |
| A04 | Large text, images, attachments, URLs, and pointed files | Implemented | `input-and-scope.md` |
| A05 | Explicit FE/BE/SQL refactor intent including logic-changing mode | Implemented | `refactor-modes.md` |
| A06 | FE/BE main versus library; `agmws`; `agmbo` scheduler | Implemented | workflow router and pattern references |
| A07 | Feature/test target classification instead of one fixed chain | Implemented | create-feature and create-unit-test workflows |
| A08 | Hooks load context/memory without extra permission cage | Implemented | provider hooks and hook script |
| A09 | Current + recent 10-30 day memory; checkpoint every atomic task | Implemented | memory/log contract and workspace CLI |
| A10 | First session resolves human requester; team logs retain name | Implemented | per-session identity, `requestedBy`, `actor`, concurrency test |
| A11 | Remind commit at task boundary without auto-commit | Implemented | start workflow and CLI reminder |
| A12 | Subagent returns enough evidence for frontier QA | Implemented | structured handoff contract/template |
| A13 | FE reuse-first workflow and reusable component/file/scope index | Implemented | `/agm-fe-engineer`, index script, QA gate |
| A14 | FE foundation/active-development/stabilization quality levels | Implemented | `frontend-engineer.md` |
| E01 | FE library golden pattern | Needs example | exact intake listed in `owner-example-intake.md` |
| E02 | BE library README + Playground pattern | Needs example | exact intake listed in `owner-example-intake.md` |
| E03 | `agmbo` `TaskScheduler.cs` pattern | Needs example | exact intake listed in `owner-example-intake.md` |
| E04 | FE/BE/SQL unit-test patterns | Needs example | exact intake listed in `owner-example-intake.md` |
