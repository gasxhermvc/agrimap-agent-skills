#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const goldenRoot = path.resolve(scriptDirectory, "..", "references", "patterns", "golden");
const catalog = JSON.parse(await readFile(path.join(goldenRoot, "manifest.json"), "utf8"));
const failures = [];
let checked = 0;

for (const item of catalog.collections.sql.files) {
  const content = await readFile(path.join(goldenRoot, item.path));
  const actual = hash(content);
  checked += 1;
  if (actual !== item.sha256) failures.push({ path: item.path, expected: item.sha256, actual });
}

for (const collectionName of ["frontend-main", "backend-main"]) {
  const manifest = JSON.parse(
    await readFile(path.join(goldenRoot, collectionName, "manifest.json"), "utf8"),
  );
  for (const example of manifest.examples) {
    const content = await readFile(path.join(goldenRoot, collectionName, example.fileName));
    const actual = hash(content);
    checked += 1;
    if (actual !== example.sha256) {
      failures.push({ path: `${collectionName}/${example.fileName}`, expected: example.sha256, actual });
    }
  }
}

process.stdout.write(`${JSON.stringify({ ok: failures.length === 0, checked, failures }, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

