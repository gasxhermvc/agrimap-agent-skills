import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const helpersDirectory = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(helpersDirectory, "..", "..");

export const scripts = Object.freeze({
  extractor: path.join(projectRoot, "tools", "extract-code-blocks.mjs"),
  hook: path.join(projectRoot, "skills", "agrimap-agent-skills", "scripts", "hook-context.mjs"),
  reuse: path.join(projectRoot, "skills", "agrimap-agent-skills", "scripts", "frontend-reuse-index.mjs"),
  workspace: path.join(projectRoot, "skills", "agrimap-agent-skills", "scripts", "agm-workspace.mjs"),
});

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(target));
    else result.push(target);
  }
  return result;
}

export async function createHarness(prefix = "agrimap-agent-skills-") {
  const temp = await mkdtemp(path.join(os.tmpdir(), prefix));

  return {
    temp,
    scripts,
    exec(script, args, cwd = temp) {
      return execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
    },
    run(script, args, input, cwd = temp) {
      return JSON.parse(execFileSync(process.execPath, [script, ...args], {
        cwd,
        encoding: "utf8",
        input: input ? JSON.stringify(input) : undefined,
      }));
    },
    spawn(script, args, input, cwd = temp) {
      return spawnSync(process.execPath, [script, ...args], {
        cwd,
        encoding: "utf8",
        input: input ? JSON.stringify(input) : undefined,
      });
    },
    async readTaskLog(taskId) {
      const entries = [];
      for (const file of (await filesUnder(path.join(temp, ".agrimap-agent", "logs"))).filter((item) => item.endsWith(".jsonl"))) {
        const content = await readFile(file, "utf8");
        for (const line of content.split(/\r?\n/).filter(Boolean)) {
          try {
            const entry = JSON.parse(line);
            if (entry.execution_id === taskId || entry.task_id === taskId || entry.executionId === taskId || entry.taskId === taskId) entries.push(entry);
          } catch {
            // Shared daily logs may contain malformed compatibility fixtures for history tests.
          }
        }
      }
      return entries.sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
    },
    async cleanup() {
      await rm(temp, { recursive: true, force: true });
    },
  };
}
