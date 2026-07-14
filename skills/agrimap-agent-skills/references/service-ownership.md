# Service ownership source of trust

Use exactly one project-owned file for technical service and data ownership:

`.agrimap-agent/knowledge/service-ownership.yaml`

All task briefs, analyses, architecture decisions, generated prompts, and memories must point to this file and the relevant `service_id`; do not copy a second service map into another rule or prompt. The reusable schema template is [../assets/templates/service-ownership.yaml](../assets/templates/service-ownership.yaml).

## Evidence levels

- `confirmed`: approved by the named human or supported by a current authoritative repository/contract source. May drive routing and placement.
- `tentative`: supported by partial evidence but not approved as authoritative. May guide investigation; may not silently change an ownership boundary.
- `unknown`: insufficient evidence. Record the question and affected decision.
- `deprecated`: retained only for traceability and must include a replacement or reason.

Every non-unknown ownership claim requires `evidence` with file/URL/decision pointers and `updated_by`. A human name under `technical_owner` or `business_owner` is not evidence by itself.

## Use contract

1. Read the canonical file for cross-service, cross-database, integration, route ownership, or business-boundary work.
2. Verify that the referenced evidence still matches the current project before relying on a high-impact claim.
3. Use only `confirmed` claims as hard routing or placement decisions.
4. For `tentative` or `unknown`, continue safe read-only investigation. Discuss with the owner before a task changes logic, public contract, data ownership, or service boundary.
5. Update the same canonical entry after an owner decision. Record who decided, the evidence, and the superseded claim when applicable.
6. Put task-specific observations in task memory/logs and point back to `service_id`; do not create another ownership SoT.

Do not import the legacy/Fable service list as confirmed data. Migrate each useful entry only after evidence review, preserving `tentative` or `unknown` where confirmation is missing.
