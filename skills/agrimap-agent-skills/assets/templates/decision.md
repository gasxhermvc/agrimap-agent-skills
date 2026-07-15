---
topic: {{area}}/{{subject}}
status: proposed # proposed|approved|rejected|superseded
supersedes: null # previous decision file name for the same topic, or null
superseded_by: null # filled in when a newer decision replaces this one
affected: [] # for example [agmws, fe-main, sql]
service_refs: [] # service_id values from knowledge/service-ownership.yaml
review_evidence: "{{task_id}}" # latest task that confirmed this decision is current
date: {{date}}
requested_by: {{requested_by}}
---

# Decision: {{title}}

- Task: `{{task_id}}`

## Problem and evidence

{{problem_and_evidence}}

## Options and trade-offs

{{options}}

## Decision, reason, and consequences

{{decision_reason_consequences}}

## Continuation notes

{{continuation_notes}}
