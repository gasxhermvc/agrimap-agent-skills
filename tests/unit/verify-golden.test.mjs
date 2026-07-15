import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyGolden } from "../../skills/agrimap-agent-skills/scripts/verify-golden.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fixture(t) {
  const temp = await mkdtemp(path.join(tmpdir(), "agrimap-golden-"));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const goldenRoot = path.join(temp, "golden");
  const collectionRoot = path.join(goldenRoot, "sample");
  await mkdir(collectionRoot, { recursive: true });

  const content = "authoritative example\n";
  await writeFile(path.join(collectionRoot, "example.md"), content, "utf8");
  await writeJson(path.join(collectionRoot, "manifest.json"), {
    schemaVersion: 2,
    collection: "sample",
    source: "test fixture",
    capturedAt: "2026-07-16",
    status: "current",
    evidenceMode: "curated-reference",
    examples: [{
      fileName: "example.md",
      heading: "Example",
      language: "md",
      sha256: digest(content),
    }],
  });
  await writeJson(path.join(goldenRoot, "manifest.json"), {
    schemaVersion: 2,
    policy: "test policy",
    annotation: "../conflict-resolution.md",
    maturity: "near-complete",
    coverage: "90%+",
    collections: {
      sample: {
        status: "current",
        evidenceMode: "curated-reference",
        manifest: "sample/manifest.json",
        knownIssues: [],
      },
    },
  });
  return { goldenRoot, collectionRoot };
}

const codes = (result) => new Set(result.failures.map((failure) => failure.code));

test("golden verifier accepts a complete manifest-driven collection", async (t) => {
  const { goldenRoot } = await fixture(t);
  assert.deepEqual(await verifyGolden({ goldenRoot }), {
    ok: true,
    collections: 1,
    checked: 1,
    declared: 1,
    discovered: 1,
    failures: [],
  });
});

test("golden verifier rejects structural, coverage, integrity, and authority defects", async (t) => {
  await t.test("undeclared physical file", async (t) => {
    const { goldenRoot, collectionRoot } = await fixture(t);
    await writeFile(path.join(collectionRoot, "extra.md"), "extra\n", "utf8");
    const result = await verifyGolden({ goldenRoot });
    assert.equal(result.ok, false);
    assert.ok(codes(result).has("UNDECLARED_FILE"));
    assert.ok(codes(result).has("COVERAGE_MISMATCH"));
  });

  await t.test("declared file missing from disk", async (t) => {
    const { goldenRoot, collectionRoot } = await fixture(t);
    const manifestPath = path.join(collectionRoot, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.examples.push({
      fileName: "missing.md",
      heading: "Missing",
      language: "md",
      sha256: digest("missing\n"),
    });
    await writeJson(manifestPath, manifest);
    const result = await verifyGolden({ goldenRoot });
    assert.ok(codes(result).has("DECLARED_FILE_MISSING"));
    assert.ok(codes(result).has("COVERAGE_MISMATCH"));
  });

  await t.test("content hash changed without manifest update", async (t) => {
    const { goldenRoot, collectionRoot } = await fixture(t);
    await writeFile(path.join(collectionRoot, "example.md"), "changed\n", "utf8");
    const result = await verifyGolden({ goldenRoot });
    assert.ok(codes(result).has("HASH_MISMATCH"));
  });

  await t.test("byte-for-byte duplicate content", async (t) => {
    const { goldenRoot, collectionRoot } = await fixture(t);
    const duplicate = "authoritative example\n";
    await writeFile(path.join(collectionRoot, "duplicate.md"), duplicate, "utf8");
    const manifestPath = path.join(collectionRoot, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.examples.push({
      fileName: "duplicate.md",
      heading: "Duplicate",
      language: "md",
      sha256: digest(duplicate),
    });
    await writeJson(manifestPath, manifest);
    const result = await verifyGolden({ goldenRoot });
    assert.ok(codes(result).has("DUPLICATE_CONTENT"));
    assert.equal(result.declared, result.discovered);
  });

  await t.test("collection directory omitted from root catalog", async (t) => {
    const { goldenRoot } = await fixture(t);
    const rogue = path.join(goldenRoot, "rogue");
    await mkdir(rogue);
    await writeFile(path.join(rogue, "rogue.md"), "rogue\n", "utf8");
    const result = await verifyGolden({ goldenRoot });
    assert.ok(codes(result).has("UNREGISTERED_COLLECTION"));
    assert.ok(codes(result).has("COVERAGE_MISMATCH"));
  });

  await t.test("mixed collection without per-entry authority", async (t) => {
    const { goldenRoot, collectionRoot } = await fixture(t);
    const catalogPath = path.join(goldenRoot, "manifest.json");
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    catalog.collections.sample.status = "mixed";
    catalog.collections.sample.evidenceMode = "mixed";
    await writeJson(catalogPath, catalog);
    const manifestPath = path.join(collectionRoot, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.status = "mixed";
    manifest.evidenceMode = "mixed";
    await writeJson(manifestPath, manifest);
    const result = await verifyGolden({ goldenRoot });
    assert.ok(codes(result).has("ENTRY_STATUS_REQUIRED"));
    assert.ok(codes(result).has("ENTRY_MODE_REQUIRED"));
  });

  await t.test("entry path escapes its collection", async (t) => {
    const { goldenRoot, collectionRoot } = await fixture(t);
    const manifestPath = path.join(collectionRoot, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.examples[0].fileName = "../example.md";
    await writeJson(manifestPath, manifest);
    const result = await verifyGolden({ goldenRoot });
    assert.ok(codes(result).has("EXAMPLE_PATH_INVALID"));
    assert.ok(codes(result).has("UNDECLARED_FILE"));
  });

  await t.test("invalid catalog authority and missing provenance", async (t) => {
    const { goldenRoot, collectionRoot } = await fixture(t);
    const catalogPath = path.join(goldenRoot, "manifest.json");
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    catalog.collections.sample.status = "latest-ish";
    await writeJson(catalogPath, catalog);
    const manifestPath = path.join(collectionRoot, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.status = "latest-ish";
    delete manifest.capturedAt;
    await writeJson(manifestPath, manifest);
    const result = await verifyGolden({ goldenRoot });
    assert.ok(codes(result).has("STATUS_INVALID"));
    assert.ok(codes(result).has("ENTRY_STATUS_INVALID"));
    assert.ok(codes(result).has("COLLECTION_DATE_INVALID"));
  });
});
