import assert from "node:assert/strict";
import test from "node:test";
import { ensureSqlfluff } from "../../skills/agrimap-agent-skills/scripts/ensure-sqlfluff.mjs";

test("uses an existing SQLFluff command without installing", () => {
  const calls = [];
  const result = ensureSqlfluff({
    run(command, args) {
      calls.push([command, ...args].join(" "));
      return { status: 0, stdout: "sqlfluff, version 4.2.2" };
    },
  });

  assert.deepEqual(calls, ["sqlfluff --version"]);
  assert.equal(result.installed, false);
  assert.equal(result.version, "sqlfluff, version 4.2.2");
});

test("installs SQLFluff with pip when the command is missing and verifies it", () => {
  const calls = [];
  let checks = 0;
  const result = ensureSqlfluff({
    run(command, args) {
      calls.push([command, ...args].join(" "));
      if (command === "sqlfluff") {
        checks += 1;
        return checks === 1 ? { status: null, error: new Error("ENOENT") } : { status: 0, stdout: "sqlfluff, version 4.2.2" };
      }
      return { status: 0 };
    },
  });

  assert.deepEqual(calls, ["sqlfluff --version", "pip install sqlfluff", "sqlfluff --version"]);
  assert.equal(result.installed, true);
  assert.equal(result.installer, "pip install sqlfluff");
});

test("fails closed when no installer produces a runnable SQLFluff command", () => {
  const calls = [];
  assert.throws(
    () => ensureSqlfluff({
      run(command, args) {
        calls.push([command, ...args].join(" "));
        return { status: null, error: new Error("ENOENT") };
      },
    }),
    (error) => error.code === "SQLFLUFF_PREREQUISITE_FAILED",
  );
  assert.deepEqual(calls, [
    "sqlfluff --version",
    "pip install sqlfluff",
    "python -m pip install sqlfluff",
    "py -m pip install sqlfluff",
  ]);
});
