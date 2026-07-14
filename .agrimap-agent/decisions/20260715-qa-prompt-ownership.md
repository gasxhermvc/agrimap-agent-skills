# QA, prompt, and service ownership decision

- Requested by: Billy
- QA: Implementation QA runs in an independent read-only subagent/context. QA reopens artifacts and samples executor claims; it never edits or conditionally passes.
- Frontier: Integrate handoffs, dispatch QA, synthesize results, and close memory. On QA failure, do not fix within the verified task; close it as `qa-failed` and propose/discuss a new correction-task prompt.
- Prompt: One owner-approved prompt is the execution SoT for one task. Use simple language while keeping the problem, end state, evidence, decisions, ownership, steps, verification, deviation policy, and Result Package complete.
- Service ownership: `.agrimap-agent/knowledge/service-ownership.yaml` is the only project service/data ownership map. All other artifacts point to `service_id` entries.
- Evidence status: Only `confirmed` ownership may drive a hard boundary. `tentative` and `unknown` remain investigation/owner-decision inputs.
- Migration: Do not promote the Fable service inventory as authoritative while its entries remain unverified/TBD.
- Reason: Separate implementation from verification, close work in auditable tasks, prevent conflicting SoTs, and reduce repeated model interpretation.
