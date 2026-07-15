import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
      const content = await readFile(
        path.join(temp, ".agrimap-agent", "logs", new Date().toISOString().slice(0, 7), `${taskId}.jsonl`),
        "utf8",
      );
      return content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    },
    async cleanup() {
      await rm(temp, { recursive: true, force: true });
    },
  };
}
