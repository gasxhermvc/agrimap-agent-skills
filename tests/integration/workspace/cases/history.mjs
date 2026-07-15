import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export async function history(harness) {
  const { temp, run, spawn } = harness;
  const workspaceScript = harness.scripts.workspace;

  const schemaV1CompatibilityEvent = {
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
    summary: "Schema v1 changed event without files remains readable after the v2 upgrade.",
    reason: "Compatibility fixture.",
    files: [],
    verification: [],
  };
  const blankSchemaV2ChangedEvent = {
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
    summary: "Whitespace is not a usable affected path.",
    reason: "Schema-v2 validation fixture.",
    files: ["   "],
    verification: [],
    gitHead: null,
    gitDirty: null,
  };
  const unsupportedSchemaEvent = {
    ...blankSchemaV2ChangedEvent,
    schemaVersion: 99,
    taskId: "unsupported-audit-schema",
    files: ["src/future.ts"],
  };
  await writeFile(
    path.join(temp, ".agrimap-agent", "logs", new Date().toISOString().slice(0, 7), "malformed-audit.jsonl"),
    `{malformed audit fixture}\n${JSON.stringify({
      schemaVersion: 2,
      timestamp: new Date().toISOString(),
      taskId: "forged-versioned-event",
      requestedBy: "Mallory",
      event: "changed",
      summary: "This incomplete versioned record must not become audit evidence.",
      reason: "Missing required execution and identity attribution.",
      files: ["src/forged.ts"],
      verification: [],
    })}\n${JSON.stringify(blankSchemaV2ChangedEvent)}\n${JSON.stringify(unsupportedSchemaEvent)}\n${JSON.stringify(schemaV1CompatibilityEvent)}\n`,
    "utf8",
  );

  const todayUtc = new Date().toISOString().slice(0, 10);
  const aliceHistory = run(workspaceScript, ["history", "--cwd", temp, "--requester", "alice", "--days", "5"]);
  assert.equal(aliceHistory.ok, true);
  assert.equal(aliceHistory.timeBasis, "UTC");
  assert.match(aliceHistory.attributionSemantics.requestedBy, /not proof of who edited or committed/i);
  assert.match(aliceHistory.attributionSemantics.integrity, /not cryptographically tamper-evident/i);
  assert.equal(aliceHistory.auditStorage.status, "local-only-no-git");
  assert.equal(aliceHistory.events.every((event) => event.requestedBy === "Alice"), true);
  assert.equal(aliceHistory.events.every((event) => new Date(event.timestamp).toISOString() === event.timestamp), true);
  assert.equal(aliceHistory.events.every((event) => event.timestampUtc === event.timestamp), true);
  assert.equal(aliceHistory.events.every((event) => ["versioned-workflow-log", "legacy-unverified"].includes(event.evidenceLevel)), true);
  assert.equal(aliceHistory.events.some((event) => event.taskId === "task-c" && event.evidenceLevel === "legacy-unverified"), true);
  assert.equal(aliceHistory.invalidLines.some((line) => line.reason === "invalid-json"), true);
  assert.equal(aliceHistory.invalidLines.some((line) => line.reason === "audit-identitySource-missing"), true);
  assert.equal(aliceHistory.invalidLines.some((line) => line.reason === "audit-gitHead-missing"), true);
  assert.equal(aliceHistory.invalidLines.some((line) => line.reason === "audit-gitDirty-missing"), true);
  assert.equal(aliceHistory.invalidLines.some((line) => line.reason === "audit-files-required-on-changed-event"), true);
  assert.equal(aliceHistory.invalidLines.some((line) => line.reason === "audit-files-must-contain-nonblank-paths"), true);
  assert.equal(aliceHistory.invalidLines.some((line) => line.reason === "audit-schemaVersion-unsupported"), true);
  assert.equal(aliceHistory.events.some((event) => event.taskId === "forged-versioned-event"), false);
  assert.equal(aliceHistory.events.some((event) => event.taskId === "blank-v2-file-claim"), false);
  assert.equal(aliceHistory.events.some((event) => event.taskId === "unsupported-audit-schema"), false);

  const taskAHistory = aliceHistory.tasks.find((task) => task.taskId === "task-a");
  assert.equal(taskAHistory.request, "Analyze task A audit behavior");
  assert.match(taskAHistory.artifacts.recentMemory, /memory\/recent\/task-a\.md$/);
  assert.match(taskAHistory.artifacts.result, /tasks\/task-a\/result\.md$/);
  assert.match(taskAHistory.artifacts.qa, /tasks\/task-a\/qa\.md$/);
  assert.deepEqual(taskAHistory.recordedFiles, ["src/a.ts"]);
  assert.equal(taskAHistory.executors.some((executor) => executor.model === "gpt-5.4" && executor.agent === "be"), true);

  const taskCHistory = aliceHistory.tasks.find((task) => task.taskId === "task-c");
  assert.deepEqual(taskCHistory.recordedFiles, ["src/c.ts"]);
  assert.deepEqual(taskCHistory.legacyClaimedFiles, ["src/legacy.ts"]);
  assert.equal(taskCHistory.recordedFiles.includes("src/evil.ts"), false);
  assert.equal(taskCHistory.executors.some((executor) => executor.model === "forged-model"), false);
  assert.equal(aliceHistory.requesters.find((requester) => requester.requestedBy === "Alice").taskIds.includes("task-c"), true);

  const dateHistory = run(workspaceScript, ["history", "--cwd", temp, "--from", todayUtc, "--to", todayUtc]);
  assert.equal(dateHistory.count >= aliceHistory.count, true);
  assert.equal(dateHistory.filters.from, `${todayUtc}T00:00:00.000Z`);
  assert.equal(dateHistory.filters.toExclusive, new Date(Date.parse(`${todayUtc}T00:00:00.000Z`) + 86_400_000).toISOString());
  const ambiguousTimeHistory = spawn(workspaceScript, ["history", "--cwd", temp, "--from", `${todayUtc}T10:00`]);
  assert.equal(ambiguousTimeHistory.status, 1);
  assert.equal(JSON.parse(ambiguousTimeHistory.stdout).code, "INVALID_TIME_RANGE");

  const bobHistory = run(workspaceScript, ["history", "--cwd", temp, "--requester", "Bob", "--days", "5"]);
  assert.equal(bobHistory.events.every((event) => event.requestedBy === "Bob"), true);
  assert.equal(bobHistory.tasks.some((task) => task.taskId === "task-b"), true);
  const schemaV1History = run(workspaceScript, ["history", "--cwd", temp, "--task", "schema-v1-compatibility"]);
  assert.equal(schemaV1History.count, 1);
  assert.equal(schemaV1History.events[0].schemaVersion, 1);
  assert.deepEqual(schemaV1History.events[0].files, []);

  const auditGitRoot = path.join(temp, "audit-git-project");
  await mkdir(auditGitRoot, { recursive: true });
  execFileSync("git", ["init"], { cwd: auditGitRoot, stdio: "ignore" });
  await writeFile(path.join(auditGitRoot, ".gitignore"), ".agrimap-agent/\n", "utf8");
  execFileSync("git", ["add", ".gitignore"], { cwd: auditGitRoot, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Audit Fixture", "-c", "user.email=audit@example.invalid", "commit", "-m", "Ignore local audit state"], { cwd: auditGitRoot, stdio: "ignore" });
  const auditBaseCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: auditGitRoot, encoding: "utf8" }).trim();
  run(workspaceScript, ["init", "--cwd", auditGitRoot]);
  run(workspaceScript, ["identify", "--cwd", auditGitRoot, "--session", "audit-session", "--owner", "Auditor"]);
  run(workspaceScript, ["start", "--cwd", auditGitRoot, "--session", "audit-session", "--task", "audit-task", "--operation", "analyze", "--title", "Audit storage durability"]);
  run(workspaceScript, ["checkpoint", "--cwd", auditGitRoot, "--session", "audit-session", "--task", "audit-task", "--summary", "Recorded an attributed change", "--files", "src/audit.ts"]);
  const ignoredAuditHistory = run(workspaceScript, ["history", "--cwd", auditGitRoot, "--task", "audit-task"]);
  assert.equal(ignoredAuditHistory.auditStorage.status, "local-only-ignored");
  assert.equal(ignoredAuditHistory.auditStorage.recoverableFromCurrentCommit, false);
  assert.equal(ignoredAuditHistory.tasks[0].gitHeads.includes(auditBaseCommit), true);
  await writeFile(path.join(auditGitRoot, ".gitignore"), "", "utf8");
  execFileSync("git", ["add", ".gitignore", ".agrimap-agent"], { cwd: auditGitRoot, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Audit Fixture", "-c", "user.email=audit@example.invalid", "commit", "-m", "Track audit history"], { cwd: auditGitRoot, stdio: "ignore" });
  const trackedAuditHistory = run(workspaceScript, ["history", "--cwd", auditGitRoot, "--task", "audit-task"]);
  assert.equal(trackedAuditHistory.auditStorage.status, "tracked-clean");
  assert.equal(trackedAuditHistory.auditStorage.recoverableFromCurrentCommit, true);

  const ambiguousActiveDirectory = path.join(temp, ".agrimap-agent", "runtime", "active");
  await writeFile(path.join(ambiguousActiveDirectory, "ambiguous-one.json"), `${JSON.stringify({ taskId: "ambiguous-task", sessionId: "ambiguous-one", requestedBy: "Alice" })}\n`, "utf8");
  await writeFile(path.join(ambiguousActiveDirectory, "ambiguous-two.json"), `${JSON.stringify({ taskId: "ambiguous-task", sessionId: "ambiguous-two", requestedBy: "Bob" })}\n`, "utf8");
  const ambiguousCheckpoint = spawn(workspaceScript, [
    "checkpoint", "--cwd", temp, "--task", "ambiguous-task", "--summary", "Must not inherit the first session", "--files", "src/ambiguous.ts",
  ]);
  assert.equal(ambiguousCheckpoint.status, 1);
  const ambiguousResult = JSON.parse(ambiguousCheckpoint.stdout);
  assert.equal(ambiguousResult.code, "AMBIGUOUS_ACTIVE_TASK");
  assert.deepEqual(ambiguousResult.sessions.map((entry) => entry.sessionId).sort(), ["ambiguous-one", "ambiguous-two"]);
  await rm(path.join(ambiguousActiveDirectory, "ambiguous-one.json"));
  await rm(path.join(ambiguousActiveDirectory, "ambiguous-two.json"));
}
