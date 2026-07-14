# Result

- Outcome: Backend target taxonomy normalized without a generic fallback.
- Requested by: Billy
- Frontier actor: frontier
- QA status: passed

## Canonical contract

```yaml
target_kind: be-main
backend_profile: agmws | agmbo
```

- `agmws` and `agmbo` are never `target_kind` values.
- `backend_profile` is required for BE main and omitted for FE, BE library, and SQL targets.
- `backend_profile=agmbo` activates the `TaskScheduler.cs` inspection rule when scheduling applies.

## Verification and boundary

- Sync, tests, package/official validators, and 69 golden hashes passed.
- Memory, decision, knowledge index, and task logs are updated.
- Changes remain within the existing uncommitted v0.1.0 boundary; commit before the next implementation task.
