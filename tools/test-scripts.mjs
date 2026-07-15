#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const workspaceScript = path.join(root, "skills", "agrimap-agent-skills", "scripts", "agm-workspace.mjs");
const hookScript = path.join(root, "skills", "agrimap-agent-skills", "scripts", "hook-context.mjs");
const reuseScript = path.join(root, "skills", "agrimap-agent-skills", "scripts", "frontend-reuse-index.mjs");
const temp = await mkdtemp(path.join(os.tmpdir(), "agrimap-agent-skills-"));

function run(script, args, input) {
  return JSON.parse(execFileSync(process.execPath, [script, ...args], {
    cwd: temp,
    encoding: "utf8",
    input: input ? JSON.stringify(input) : undefined,
  }));
}

try {
  const initialized = run(workspaceScript, ["init", "--cwd", temp]);
  assert.equal(initialized.ok, true);
  assert.equal(initialized.needsRequester, true);
  assert.match(
    await readFile(path.join(temp, ".agrimap-agent", "knowledge", "service-ownership.yaml"), "utf8"),
    /source_of_trust: \.agrimap-agent\/knowledge\/service-ownership\.yaml/,
  );
  assert.equal(await readFile(path.join(temp, ".agrimap-agent", ".gitignore"), "utf8"), "runtime/\ncache/\n");
  const stateConfig = JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "config.json"), "utf8"));
  assert.equal(stateConfig.stateScope, "target-project");
  assert.equal(stateConfig.installDirectoryWrites, false);
  assert.equal(stateConfig.aiGateway, "disabled");

  const missingRequester = spawnSync(process.execPath, [workspaceScript, "start", "--cwd", temp, "--session", "unknown", "--task", "should-not-start"], { encoding: "utf8" });
  assert.notEqual(missingRequester.status, 0);
  assert.equal(JSON.parse(missingRequester.stdout).needsRequester, true);

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-a", "--owner", "Alice", "--model", "gpt-5.6-sol", "--role", "leader", "--agent", "primary", "--provider", "codex"]);
  run(workspaceScript, ["identify", "--cwd", temp, "--session", "session-b", "--owner", "Bob", "--model", "fable", "--role", "leader", "--agent", "primary", "--provider", "claude"]);
  const taskA = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-a", "--operation", "analyze"]);
  const taskB = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--operation", "create-feature"]);
  assert.equal(taskA.activeTask.requestedBy, "Alice");
  assert.equal(taskB.activeTask.requestedBy, "Bob");
  assert.deepEqual(
    { model: taskA.activeTask.model, role: taskA.activeTask.role, agent: taskA.activeTask.agent, provider: taskA.activeTask.provider },
    { model: "gpt-5.6-sol", role: "leader", agent: "primary", provider: "codex" },
  );
  assert.deepEqual(
    { model: taskB.activeTask.model, role: taskB.activeTask.role, agent: taskB.activeTask.agent, provider: taskB.activeTask.provider },
    { model: "fable", role: "leader", agent: "primary", provider: "claude" },
  );

  const activeA = JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  const activeB = JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-b.json"), "utf8"));
  assert.equal(activeA.taskId, "task-a");
  assert.equal(activeB.taskId, "task-b");

  const checkpointA = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-a", "--summary", "Analyzed task A", "--files", "src/a.ts", "--verification", "inspection passed", "--model", "gpt-5.4", "--role", "executor", "--agent", "be", "--provider", "codex"]);
  const checkpointB = run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--summary", "Analyzed task B", "--files", "src/b.ts"]);
  assert.equal(checkpointA.requestedBy, "Alice");
  assert.equal(checkpointB.requestedBy, "Bob");
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "current", "task-a.md"), "utf8"), /Requested by: Alice/);
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "current", "task-b.md"), "utf8"), /Requested by: Bob/);
  const taskALog = await readFile(path.join(temp, ".agrimap-agent", "logs", new Date().toISOString().slice(0, 7), "task-a.jsonl"), "utf8");
  assert.equal(taskALog.includes('"requestedBy":"Alice"'), true);
  assert.equal(taskALog.includes('"model":"gpt-5.4"'), true);
  assert.equal(taskALog.includes('"role":"executor"'), true);
  assert.equal(taskALog.includes('"agent":"be"'), true);
  assert.equal(taskALog.includes('"actor"'), false);

  const hookA = run(hookScript, ["--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "BeforeAgent",
  });
  assert.match(hookA.hookSpecificOutput.additionalContext, /Requested by: Alice/);
  assert.match(hookA.hookSpecificOutput.additionalContext, /Active task: task-a/);
  assert.match(hookA.hookSpecificOutput.additionalContext, /model=gpt-5.6-sol, role=leader, agent=primary, provider=codex/);

  const hookUnknown = run(hookScript, ["--provider", "claude", "--mode", "session"], {
    cwd: temp,
    session_id: "new-session",
    hook_event_name: "SessionStart",
  });
  assert.match(hookUnknown.hookSpecificOutput.additionalContext, /Requester is unknown/);
  assert.doesNotMatch(hookUnknown.hookSpecificOutput.additionalContext, /Requested by: Bob/);

  const subagentHook = run(hookScript, ["--provider", "claude", "--mode", "subagent"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "SubagentStart",
  });
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /One writer owns them per integration wave/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /integration artifact/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /Read workspace_need before any write/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /base commit/);

  const taskADirectory = path.join(temp, ".agrimap-agent", "tasks", "task-a");
  await writeFile(path.join(taskADirectory, "checklist.md"), "# Checklist\n\n- [x] Scope inspected.\n- [x] Work verified.\n- [x] Memory and logs updated.\n", "utf8");
  await writeFile(path.join(taskADirectory, "qa.md"), "# QA\n\n- Status: passed\n", "utf8");
  await writeFile(path.join(taskADirectory, "result.md"), "# Result\n\nTask A passed.\n", "utf8");
  assert.equal(run(workspaceScript, ["validate", "--cwd", temp, "--task", "task-a"]).ok, true);
  assert.equal(run(workspaceScript, ["complete", "--cwd", temp, "--session", "session-a", "--task", "task-a"]).ok, true);
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  assert.equal(JSON.parse(await readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-b.json"), "utf8")).taskId, "task-b");
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "recent", "task-a.md"), "utf8"), /Task A passed/);

  const taskC = run(workspaceScript, ["start", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--operation", "create-feature"]);
  assert.equal(taskC.activeTask.requestedBy, "Alice");
  run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--summary", "Implementation returned for QA"]);
  const taskCDirectory = path.join(temp, ".agrimap-agent", "tasks", "task-c");
  await writeFile(path.join(taskCDirectory, "qa.md"), "# QA\n\n- Status: failed\n\nReproducible defect.\n", "utf8");
  await writeFile(path.join(taskCDirectory, "result.md"), "# Result\n\n- Outcome: `qa-failed`\n", "utf8");
  const nextPrompt = path.join(temp, ".agrimap-agent", "prompts", "task-c-fix", "executor.md");
  await mkdir(path.dirname(nextPrompt), { recursive: true });
  await writeFile(nextPrompt, "# Proposed correction prompt\n", "utf8");
  const closedC = run(workspaceScript, [
    "close", "--cwd", temp, "--session", "session-a", "--task", "task-c", "--status", "qa-failed",
    "--next-prompt", ".agrimap-agent/prompts/task-c-fix/executor.md",
  ]);
  assert.equal(closedC.complete, false);
  assert.equal(closedC.status, "qa-failed");
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "runtime", "active", "session-a.json"), "utf8"));
  assert.match(await readFile(path.join(temp, ".agrimap-agent", "memory", "recent", "task-c.md"), "utf8"), /qa-failed/);

  const sourceDirectory = path.join(temp, "src", "app", "shared");
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(
    path.join(sourceDirectory, "data-table.component.ts"),
    "@Component({ selector: 'agm-data-table' })\nexport class DataTableComponent {}\nexport function paginateRows() { return []; }\n",
    "utf8",
  );
  const index = ".agrimap-agent/knowledge/frontend-reuse-test.jsonl";
  const scanned = run(reuseScript, ["scan", "--cwd", temp, "--paths", "src", "--index", index, "--by", "test-scanner"]);
  assert.equal(scanned.discovered, 2);
  const reuseEntries = (await readFile(path.join(temp, index), "utf8")).trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(reuseEntries.find((entry) => entry.symbol === "DataTableComponent").kind, "component");
  assert.equal(reuseEntries.find((entry) => entry.symbol === "paginateRows").kind, "function");
  const searched = run(reuseScript, ["search", "--cwd", temp, "--index", index, "--query", "data table"]);
  assert.ok(searched.count >= 1);
  const componentId = reuseEntries.find((entry) => entry.symbol === "DataTableComponent").id;
  run(reuseScript, ["deprecate", "--cwd", temp, "--index", index, "--id", componentId, "--by", "Alice", "--reason", "Replaced in test"]);
  const excluded = run(reuseScript, ["search", "--cwd", temp, "--index", index, "--query", "DataTableComponent"]);
  assert.equal(excluded.results.some((result) => result.entry.id === componentId), false);
  const validated = run(reuseScript, ["validate", "--cwd", temp, "--index", index]);
  assert.equal(validated.ok, true);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    cases: [
      "missing requester blocks substantive task start",
      "target project initializes tracked state while ignoring only runtime and cache",
      "two sessions retain different requester and structured model-role-agent-provider identity",
      "checkpoint logs use structured execution identity without actor composites",
      "completion gate archives only its own session task",
      "QA failure closes without completion and requires a separate next-task prompt",
      "workspace initializes the canonical service ownership source of trust",
      "hooks load only current-session identity",
      "subagent hook reinforces file ownership and sandbox integration",
      "frontend reuse scan/search/deprecate/validate",
    ],
  }, null, 2)}\n`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
