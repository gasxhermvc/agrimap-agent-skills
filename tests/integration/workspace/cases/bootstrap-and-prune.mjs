import assert from "node:assert/strict";
import { mkdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import path from "node:path";

export async function bootstrapAndPrune(harness) {
  const { temp, run, spawn } = harness;
  const workspaceScript = harness.scripts.workspace;

  const pruneWithoutState = run(workspaceScript, ["prune", "--cwd", temp]);
  assert.deepEqual(pruneWithoutState, {
    ok: true,
    pruned: false,
    reason: "config-missing",
    retentionDays: null,
    removed: [],
    logsPreserved: true,
  });
  await assert.rejects(readFile(path.join(temp, ".agrimap-agent", "config.json"), "utf8"), { code: "ENOENT" });

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
  assert.equal(stateConfig.activation.auto, false);

  const configPath = path.join(temp, ".agrimap-agent", "config.json");
  const oldRecentPath = path.join(temp, ".agrimap-agent", "memory", "recent", "prune-old.md");
  const protectedPrunePaths = [
    path.join(temp, ".agrimap-agent", "memory", "current", "prune-protected.md"),
    path.join(temp, ".agrimap-agent", "logs", "prune-protected.jsonl"),
    path.join(temp, ".agrimap-agent", "tasks", "prune-protected", "result.md"),
    path.join(temp, ".agrimap-agent", "decisions", "prune-protected.md"),
  ];
  for (const filePath of [oldRecentPath, ...protectedPrunePaths]) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "protected prune fixture\n", "utf8");
  }
  const fortyDaysAgo = new Date(Date.now() - 40 * 86_400_000);
  await Promise.all([oldRecentPath, ...protectedPrunePaths].map((filePath) => utimes(filePath, fortyDaysAgo, fortyDaysAgo)));

  await rm(configPath);
  const pruneWithoutConfig = run(workspaceScript, ["prune", "--cwd", temp]);
  assert.equal(pruneWithoutConfig.pruned, false);
  assert.equal(pruneWithoutConfig.reason, "config-missing");
  assert.deepEqual(pruneWithoutConfig.removed, []);
  assert.equal(await readFile(oldRecentPath, "utf8"), "protected prune fixture\n");

  await writeFile(configPath, "{ invalid json\n", "utf8");
  const invalidConfigPrune = spawn(workspaceScript, ["prune", "--cwd", temp]);
  assert.equal(invalidConfigPrune.status, 1);
  assert.equal(invalidConfigPrune.stderr, "");
  const invalidConfigResult = JSON.parse(invalidConfigPrune.stdout);
  assert.equal(invalidConfigResult.code, "INVALID_CONFIG");
  assert.equal(invalidConfigResult.pruned, false);
  assert.deepEqual(invalidConfigResult.removed, []);
  assert.equal(await readFile(oldRecentPath, "utf8"), "protected prune fixture\n");

  await writeFile(configPath, `${JSON.stringify({ ...stateConfig, retentionDays: 1 }, null, 2)}\n`, "utf8");
  const lowerBoundPrune = run(workspaceScript, ["prune", "--cwd", temp]);
  assert.equal(lowerBoundPrune.pruned, true);
  assert.equal(lowerBoundPrune.retentionDays, 10);
  assert.equal(lowerBoundPrune.removed.includes("memory/recent/prune-old.md"), true);
  await assert.rejects(readFile(oldRecentPath, "utf8"), { code: "ENOENT" });
  for (const filePath of protectedPrunePaths) {
    assert.equal(await readFile(filePath, "utf8"), "protected prune fixture\n");
  }

  const upperBoundRecentPath = path.join(temp, ".agrimap-agent", "memory", "recent", "prune-upper-bound.md");
  await writeFile(upperBoundRecentPath, "upper bound fixture\n", "utf8");
  const twentyDaysAgo = new Date(Date.now() - 20 * 86_400_000);
  await utimes(upperBoundRecentPath, twentyDaysAgo, twentyDaysAgo);
  await writeFile(configPath, `${JSON.stringify({ ...stateConfig, retentionDays: 999 }, null, 2)}\n`, "utf8");
  const upperBoundPrune = run(workspaceScript, ["prune", "--cwd", temp]);
  assert.equal(upperBoundPrune.retentionDays, 30);
  assert.equal(upperBoundPrune.removed.includes("prune-upper-bound.md"), false);
  assert.equal(await readFile(upperBoundRecentPath, "utf8"), "upper bound fixture\n");
  await rm(upperBoundRecentPath);
  await writeFile(configPath, `${JSON.stringify(stateConfig, null, 2)}\n`, "utf8");
}
