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

function passed(result) {
  return result.status === 0;
}

export function ensureSqlfluff({ run = defaultRun } = {}) {
  let verification = invoke(run, "sqlfluff", ["--version"]);
  if (passed(verification)) {
    return { ok: true, installed: false, installer: null, version: verification.stdout };
  }

  const attempts = [];
  for (const [command, args] of installers) {
    const installation = invoke(run, command, args);
    attempts.push(installation);
    if (!passed(installation)) continue;

    verification = invoke(run, "sqlfluff", ["--version"]);
    if (passed(verification)) {
      return { ok: true, installed: true, installer: installation.command, version: verification.stdout };
    }
  }

  const error = new Error("SQLFluff is unavailable and automatic installation did not produce a runnable sqlfluff command.");
  error.code = "SQLFLUFF_PREREQUISITE_FAILED";
  error.attempts = attempts;
  throw error;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    console.log(JSON.stringify(ensureSqlfluff(), null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      code: error.code || "SQLFLUFF_PREREQUISITE_FAILED",
      message: error.message,
      attempts: error.attempts || [],
    }, null, 2));
    process.exitCode = 1;
  }
}
