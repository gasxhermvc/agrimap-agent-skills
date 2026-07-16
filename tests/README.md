# Test structure

The test suite is grouped by behavior rather than by implementation script:

```text
tests/
├── helpers/                         shared process and temporary-workspace harness
├── unit/                            isolated parser/extractor/eval-contract behavior
└── integration/
    ├── package/                     published adapters, docs, and fixture mirrors
    └── workspace/
        ├── workspace.test.mjs       ordered end-to-end scenario
        └── cases/                   one workspace concern per module
```

## Commands

- `npm run test:unit`: isolated unit tests.
- `npm run test:workspace`: workspace lifecycle, hooks, completion, history, and reuse integration.
- `npm run test:usage`: published package/documentation integration.
- `npm run test:integration`: all integration categories.
- `npm test`: package validation, unit, integration, and golden verification.

Workspace case modules intentionally share one temporary project because later cases verify durable history produced by earlier lifecycle cases. Their order is explicit in `workspace.test.mjs`; unit and package tests remain independent.

Add new tests to the narrowest matching category. Create a new case module when a workspace concern does not fit an existing module; do not grow the runner into another monolith.
