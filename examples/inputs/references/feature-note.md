# Checkout retry requester note

- Treat a network timeout as an unknown outcome, not a confirmed failure.
- Preserve the existing idempotency key until the outcome is resolved.
- The diagram defines behavior and transitions; its colors are illustrative only.
- If current code contradicts this note, report the conflict before implementation.
