# Multi-person identity decision

- Requested by: Billy
- Decision: Resolve requester identity and active task per provider session/conversation.
- Runtime: Store live identity and active task under ignored `runtime/sessions/<session-id>.json` and `runtime/active/<session-id>.json`.
- Durable attribution: Copy the human into `requestedBy` and the executing frontier/subagent into `actor` for tracked task/log/handoff artifacts.
- Prohibited: One shared `owner.json`, one shared `active-task.json`, or inferring the current human from the latest team log.
- Reason: Many people work in the same project and durable shared logs must remain correctly attributable without concurrent sessions overwriting one another.
