import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export async function history(harness) {
  const { temp, run, spawn } = harness;
  const workspaceScript = harness.scripts.workspace;
  const state = path.join(temp, ".agrimap-agent");

  const schemaV1 = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    taskId: "schema-v1-compatibility",
    requestedBy: "Legacy V1",
    requesterId: null,
    identitySource: "legacy-migrated",
    model: "unknown",
    role: "leader",
    agent: "primary",
    provider: "unknown",
    event: "changed",
    summary: "Legacy event remains readable.",
    reason: "Compatibility fixture.",
    files: [],
    verification: [],
  };
  const invalidV2 = {
    schemaVersion: 2,
    timestamp: new Date().toISOString(),
    taskId: "blank-v2-file-claim",
    requestedBy: "Mallory",
    requesterId: null,
    identitySource: "manual-confirmed",
    model: "unknown",
    role: "leader",
    agent: "primary",
    provider: "unknown",
    event: "changed",
    summary: "Whitespace is invalid.",
    reason: "Fixture.",
    files: ["   "],
    verification: [],
    gitHead: null,
    gitDirty: null,
  };
  const malformedDirectory = path.join(state, "logs", "legacy-fixtures");
  await mkdir(malformedDirectory, { recursive: true });
  await writeFile(path.join(malformedDirectory, "malformed.jsonl"), `{malformed}\n${JSON.stringify({ schemaVersion: 2, timestamp: new Date().toISOString(), taskId: "forged", requestedBy: "Mallory", event: "changed", summary: "Incomplete", reason: "Fixture", files: ["src/forged.ts"], verification: [] })}\n${JSON.stringify(invalidV2)}\n${JSON.stringify({ ...invalidV2, schemaVersion: 99, taskId: "unsupported" })}\n${JSON.stringify(schemaV1)}\n`, "utf8");

  const alice = run(workspaceScript, ["history", "--cwd", temp, "--requester", "alice", "--days", "5"]);
  assert.equal(alice.ok, true);
  assert.equal(alice.timeBasis, "UTC");
  assert.match(alice.attributionSemantics.requestedBy, /not proof of who edited or committed/i);
  assert.match(alice.attributionSemantics.integrity, /not cryptographically tamper-evident/i);
  assert.equal(alice.auditStorage.status, "local-only-no-git");
  assert.equal(alice.events.every((event) => event.requestedBy === "Alice"), true);
  assert.equal(alice.events.every((event) => event.executionId === "01010003"), true);
  assert.equal(alice.invalidLines.some((line) => line.reason === "invalid-json"), true);
  assert.equal(alice.invalidLines.some((line) => line.reason === "audit-identitySource-missing"), true);
  assert.equal(alice.invalidLines.some((line) => line.reason === "audit-files-must-contain-nonblank-paths"), true);
  assert.equal(alice.invalidLines.some((line) => line.reason.startsWith("audit-schema") && line.reason.endsWith("-unsupported")), true);
  const taskA = alice.tasks.find((task) => task.executionId === "01010003");
  assert.equal(taskA.taskId, "01010003");
  assert.equal(taskA.workflowDepth, "regulated");
  assert.equal(taskA.request, "Analyze task A audit behavior");
  assert.match(taskA.artifacts.brief, /tasks\/complete\/\d{4}-\d{2}\/01010003\/brief\.md$/);
  assert.match(taskA.artifacts.analysis, /analysis\.md$/);
  assert.match(taskA.artifacts.checklists, /checklists\.md$/);
  assert.match(taskA.artifacts.recentMemory, /memory\/recent\/\d{4}-\d{2}\/01010003-/);
  assert.match(taskA.artifacts.report, /reports\/\d{4}-\d{2}\/01010003-/);
  assert.deepEqual(taskA.recordedFiles, ["src/a.ts"]);
  assert.equal(taskA.executors.some((executor) => executor.model === "gpt-5.4" && executor.agent === "be"), true);

  const bob = run(workspaceScript, ["history", "--cwd", temp, "--requester", "Bob", "--days", "5"]);
  assert.equal(bob.tasks.some((task) => task.executionId === "01010002" && task.taskId === null && task.workflowDepth === "light"), true);
  assert.equal(bob.tasks.some((task) => task.executionId === "01010004" && /tasks\/cancelled\//.test(task.artifacts.brief)), true);
  assert.equal(bob.requesters[0].executionIds.includes("01010002"), true);

  const legacy = run(workspaceScript, ["history", "--cwd", temp, "--task", "schema-v1-compatibility"]);
  assert.equal(legacy.count, 1);
  assert.equal(legacy.events[0].schemaVersion, 1);
  assert.deepEqual(legacy.events[0].files, []);

  const todayUtc = new Date().toISOString().slice(0, 10);
  const dateHistory = run(workspaceScript, ["history", "--cwd", temp, "--from", todayUtc, "--to", todayUtc]);
  assert.equal(dateHistory.filters.from, `${todayUtc}T00:00:00.000Z`);
  const ambiguousTime = spawn(workspaceScript, ["history", "--cwd", temp, "--from", `${todayUtc}T10:00`]);
  assert.equal(JSON.parse(ambiguousTime.stdout).code, "INVALID_TIME_RANGE");

  const auditGitRoot = path.join(temp, "audit-git-project");
  await mkdir(auditGitRoot, { recursive: true });
  execFileSync("git", ["init"], { cwd: auditGitRoot, stdio: "ignore" });
  await writeFile(path.join(auditGitRoot, ".gitignore"), ".agrimap-agent/\n", "utf8");
  execFileSync("git", ["add", ".gitignore"], { cwd: auditGitRoot, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Audit Fixture", "-c", "user.email=audit@example.invalid", "commit", "-m", "Ignore local audit state"], { cwd: auditGitRoot, stdio: "ignore" });
  const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: auditGitRoot, encoding: "utf8" }).trim();
  run(workspaceScript, ["init", "--cwd", auditGitRoot]);
  run(workspaceScript, ["identify", "--cwd", auditGitRoot, "--session", "audit-session", "--owner", "Auditor"]);
  run(workspaceScript, ["start", "--cwd", auditGitRoot, "--session", "audit-session", "--execution", "01010006", "--operation", "analyze", "--depth", "light", "--title", "Audit storage durability"]);
  run(workspaceScript, ["checkpoint", "--cwd", auditGitRoot, "--session", "audit-session", "--execution", "01010006", "--summary", "Recorded an attributed change", "--files", "src/audit.ts"]);
  const ignored = run(workspaceScript, ["history", "--cwd", auditGitRoot, "--task", "01010006"]);
  assert.equal(ignored.auditStorage.status, "local-only-ignored");
  assert.equal(ignored.tasks[0].gitHeads.includes(base), true);
  await writeFile(path.join(auditGitRoot, ".gitignore"), "", "utf8");
  execFileSync("git", ["add", ".gitignore", ".agrimap-agent"], { cwd: auditGitRoot, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Audit Fixture", "-c", "user.email=audit@example.invalid", "commit", "-m", "Track audit history"], { cwd: auditGitRoot, stdio: "ignore" });
  const tracked = run(workspaceScript, ["history", "--cwd", auditGitRoot, "--task", "01010006"]);
  assert.equal(tracked.auditStorage.status, "tracked-clean");
  assert.equal(tracked.auditStorage.recoverableFromCurrentCommit, true);

  const activeDirectory = path.join(state, "runtime", "active");
  await writeFile(path.join(activeDirectory, "ambiguous-one.json"), JSON.stringify({ executionId: "ambiguous-task", taskId: null, sessionId: "ambiguous-one", requestedBy: "Alice" }) + "\n", "utf8");
  await writeFile(path.join(activeDirectory, "ambiguous-two.json"), JSON.stringify({ executionId: "ambiguous-task", taskId: null, sessionId: "ambiguous-two", requestedBy: "Bob" }) + "\n", "utf8");
  const ambiguous = spawn(workspaceScript, ["checkpoint", "--cwd", temp, "--execution", "ambiguous-task", "--summary", "Must not inherit first", "--files", "src/ambiguous.ts"]);
  assert.equal(JSON.parse(ambiguous.stdout).code, "AMBIGUOUS_ACTIVE_TASK");
  await rm(path.join(activeDirectory, "ambiguous-one.json"));
  await rm(path.join(activeDirectory, "ambiguous-two.json"));
}
