# Backend target taxonomy decision

- Requested by: Billy
- Decision: `agmws` and `agmbo` are profiles under `target_kind=be-main`, not target kinds.
- Allowed backend profiles: `agmws` and `agmbo` only.
- Required: Every `be-main` create-feature, create-unit-test, or generated prompt declares one of those two profiles.
- Omitted: `backend_profile` is not emitted for FE, BE library, or SQL targets.
- Prohibited: No `generic`, fallback, inferred, or provider-created backend profile.
- Reason: Target kind describes the codebase boundary; backend profile selects the AgriMap host behavior within BE main.
