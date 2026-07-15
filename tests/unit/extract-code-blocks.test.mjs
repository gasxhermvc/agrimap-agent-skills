import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createHarness } from "../helpers/harness.mjs";

test("code extraction ignores Markdown headings inside fenced blocks", async (t) => {
  const harness = await createHarness("agrimap-extractor-");
  t.after(() => harness.cleanup());

  const source = path.join(harness.temp, "extractor-fixture.md");
  const output = path.join(harness.temp, "extracted");
  await mkdir(output, { recursive: true });
  await writeFile(
    source,
    "# Correct Section\n\n```text\n# Fake Heading\ninside first block\n```\n\n```ts\nconst value = 1;\n```\n",
    "utf8",
  );

  harness.exec(harness.scripts.extractor, [
    "--source", source,
    "--output", output,
    "--collection", "regression",
  ]);

  const manifest = JSON.parse(await readFile(path.join(output, "manifest.json"), "utf8"));
  assert.equal(manifest.examples[1].heading, "Correct Section");
  assert.equal(manifest.examples[1].fileName, "002-correct-section.ts");
});
