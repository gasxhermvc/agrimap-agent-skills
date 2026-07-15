# Owner example intake

Read `golden/manifest.json`, the relevant collection manifest, and [pattern-status.md](pattern-status.md) first. Request only an unresolved item that can change the active task; never request a full example set already covered by a `current` collection. Keep raw owner evidence immutable and place interpretation in an annotation.

## Remaining gaps

### FE main

- assertion depth beyond mandatory store/facade success and error cases;
- an owner exception when the active Angular version or deployed contract conflicts with the current collection.

### FE library

- agreed minor/major semver triggers beyond the current patch workflow;
- richer unit-test assertions beyond the documented smoke-test baseline;
- an owner exception for a published symbol or consumer contract.

### BE main with `backend_profile=agmws`

- repository-port placement and Presentation-to-Application mapping in the current service;
- Domain entity versus persistence projection examples;
- route/response conventions and representative tests where neighboring code conflicts.

### BE main with `backend_profile=agmbo`

- batch entry point/use case and `Infrastructure/TaskScheduler.cs`;
- scheduling registration, retry, concurrency, and error logging;
- representative tests and run command.

### BE library

- a published API or package-version case not covered by `golden/backend-libraries`;
- representative tests for behavior beyond the documented Playground/smoke path;
- compatibility policy when a current consumer contradicts the reference.

### SQL

- relationship semantics: cascade, uniqueness, indexes, seed ownership, or replace behavior;
- the active project's deployment/rollback and structured-input convention when absent from database references;
- representative SQL test commands and failure cases.

For every new example, record `project`, `target_kind`, conditional `backend_profile`, `file`, `symbol`, `authorityStatus`, `evidenceMode`, `source`, `owner`, `capturedAt`, and known exceptions. Add it to exactly one collection manifest and verify its SHA-256 before use.
