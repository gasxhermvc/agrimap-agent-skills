import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function frontendReuse(harness) {
  const { temp, run } = harness;
  const reuseScript = harness.scripts.reuse;
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
}
