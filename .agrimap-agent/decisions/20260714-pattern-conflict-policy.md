# Pattern conflict policy decision

- Requested by: Billy
- Decision: Keep raw golden examples immutable and resolve contradictions in a separate canonical annotation matrix.
- Classification: `resolved-defect`, `canonical-v1`, `project-dependent`, `owner-decision-required`, or `needs-owner-example`.
- Source priority: owner-approved current behavior, active project evidence, canonical annotation, then golden compatibility evidence.
- Boundary: Compile/name/format defects are never copied. Logical, data, API, route, cascade, and replacement semantics are not selected without project evidence and owner trade-off.
- Follow-up: Use Billy's pattern tour to promote only confirmed project conventions.
- Reason: Preserve the original evidence without allowing old mistakes or stale guardrail prose to become the new source of trust.
