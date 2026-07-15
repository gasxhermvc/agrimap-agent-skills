import assert from "node:assert/strict";
import test from "node:test";
import { parseCliArgs } from "../../skills/agrimap-agent-skills/scripts/cli-args.mjs";

test("CLI parsing preserves boolean flags and key-value options", () => {
  assert.deepEqual(
    parseCliArgs(["--debug", "--provider", "gemini", "--mode", "task"]),
    { debug: true, provider: "gemini", mode: "task" },
  );
  assert.deepEqual(
    parseCliArgs(["--provider=claude", "--dry-run"]),
    { provider: "claude", "dry-run": true },
  );
});
