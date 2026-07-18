import assert from "node:assert/strict";
import test from "node:test";
import { installSqlfluff } from "../../skills/agrimap-agent-skills/scripts/install-sqlfluff.mjs";

test("installs SQLFluff immediately and verifies it once", () => {
  const calls = [];
  const result = installSqlfluff({
    run(command, args) {
      calls.push([command, ...args].join(" "));
      return command === "sqlfluff"
        ? { status: 0, stdout: "sqlfluff, version 4.2.2" }
        : { status: 0 };
    },
  });

  assert.deepEqual(calls, ["pip install sqlfluff", "sqlfluff --version"]);
  assert.equal(result.installer, "pip install sqlfluff");
  assert.equal(result.version, "sqlfluff, version 4.2.2");
});

test("falls back to another pip entrypoint", () => {
  const calls = [];
  const result = installSqlfluff({
    run(command, args) {
      calls.push([command, ...args].join(" "));
      if (command === "pip") return { status: null, error: new Error("ENOENT") };
      if (command === "python") return { status: 0 };
      return { status: 0, stdout: "sqlfluff, version 4.2.2" };
    },
  });

  assert.deepEqual(calls, ["pip install sqlfluff", "python -m pip install sqlfluff", "sqlfluff --version"]);
  assert.equal(result.installer, "python -m pip install sqlfluff");
});

test("fails closed when no installer produces a runnable command", () => {
  const calls = [];
  assert.throws(
    () => installSqlfluff({
      run(command, args) {
        calls.push([command, ...args].join(" "));
        return { status: null, error: new Error("ENOENT") };
      },
    }),
    (error) => error.code === "SQLFLUFF_INSTALL_FAILED",
  );
  assert.deepEqual(calls, [
    "pip install sqlfluff",
    "python -m pip install sqlfluff",
    "py -m pip install sqlfluff",
  ]);
});
