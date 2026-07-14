# Owner example intake

Request only the missing set relevant to the active task. Keep raw owner examples immutable and add a separate annotation.

## FE main

- feature component TS/HTML/SCSS;
- facade, store, provider;
- generated API usage;
- route and tests;
- expected naming, comments, inputs, outputs, and error handling.

## FE library

- workspace/project tree and `public-api.ts`;
- reusable component/directive/pipe;
- Angular service and generated API wrapper;
- consumer example;
- unit tests/build command/versioning notes.

## BE main with `backend_profile=agmws`

- controller, request/response DTO, use-case interface/implementation;
- Domain entity/model/value object;
- persistence projection and repository port/implementation;
- DI registration, error mapping, and tests.

## BE main with `backend_profile=agmbo`

- batch entry point/use case;
- `Infrastructure/TaskScheduler.cs`;
- scheduling registration/configuration;
- retry/concurrency/error logging;
- tests and run command.

## BE library

- public API and project tree;
- representative domain/service/infrastructure code;
- `README.md` structure;
- Playground project and example;
- tests, build, packaging, and compatibility rules.

## SQL

- one current table script;
- query and DML procedure examples;
- message artifact;
- deployment/rollback convention;
- naming and test command.

## Unit tests

- one test per target kind;
- file/method naming;
- setup/fixture/mock pattern;
- assertion style;
- test/build commands;
- integration-test boundary.

For every example, record `project`, `target_kind`, conditional `backend_profile`, `file`, `symbol`, `status`, `owner`, `date`, and known exceptions.
