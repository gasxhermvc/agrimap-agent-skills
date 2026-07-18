#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const installers = [
  ["pip", ["install", "sqlfluff"]],
  ["python", ["-m", "pip", "install", "sqlfluff"]],
  ["py", ["-m", "pip", "install", "sqlfluff"]],
];

function defaultRun(command, args) {
  return spawnSync(command, args, { encoding: "utf8", windowsHide: true });
}

function invoke(run, command, args) {
  try {
    const result = run(command, args) || {};
    return {
      command: [command, ...args].join(" "),
      status: Number.isInteger(result.status) ? result.status : null,
      stdout: String(result.stdout || "").trim(),
      stderr: String(result.stderr || result.error?.message || "").trim(),
    };
  } catch (error) {
    return { command: [command, ...args].join(" "), status: null, stdout: "", stderr: String(error?.message || error) };
  }
}

export function installSqlfluff({ run = defaultRun } = {}) {
  const attempts = [];
  for (const [command, args] of installers) {
    const installation = invoke(run, command, args);
    attempts.push(installation);
    if (installation.status !== 0) continue;

    const verification = invoke(run, "sqlfluff", ["--version"]);
    if (verification.status === 0) {
      return { ok: true, installer: installation.command, version: verification.stdout };
    }
    attempts.push(verification);
  }

  const error = new Error("Automatic installation did not produce a runnable sqlfluff command.");
  error.code = "SQLFLUFF_INSTALL_FAILED";
  error.attempts = attempts;
  throw error;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    console.log(JSON.stringify(installSqlfluff(), null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      code: error.code || "SQLFLUFF_INSTALL_FAILED",
      message: error.message,
      attempts: error.attempts || [],
    }, null, 2));
    process.exitCode = 1;
  }
}
