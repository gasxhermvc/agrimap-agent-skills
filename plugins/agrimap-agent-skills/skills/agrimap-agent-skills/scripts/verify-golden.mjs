#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STATUSES = new Set([
  "current",
  "verified",
  "legacy-compatible",
  "unverified",
  "missing-owner-example",
  "mixed",
]);
const EVIDENCE_MODES = new Set(["curated-reference", "raw-immutable", "mixed"]);
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLLECTION_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultGoldenRoot = path.resolve(scriptDirectory, "..", "references", "patterns", "golden");

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relative(root, target) {
  return path.relative(root, target).split(path.sep).join("/") || ".";
}

async function readJson(filePath, root, fail, code) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(code, relative(root, filePath), error.message);
    return null;
  }
}

async function discoverExampleFiles(directory, root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await discoverExampleFiles(entryPath, root));
    else if (entry.name !== "manifest.json") files.push(relative(root, entryPath));
  }
  return files;
}

export async function verifyGolden({ goldenRoot = defaultGoldenRoot } = {}) {
  const root = path.resolve(goldenRoot);
  const failures = [];
  const fail = (code, file, message) => failures.push({ code, path: file, message });
  let checked = 0;
  let declared = 0;
  let discoveredFiles = [];

  try {
    discoveredFiles = await discoverExampleFiles(root, root);
  } catch (error) {
    fail("GOLDEN_ROOT_UNREADABLE", ".", error.message);
    return { ok: false, collections: 0, checked, declared, discovered: 0, failures };
  }

  const catalogPath = path.join(root, "manifest.json");
  const catalog = await readJson(catalogPath, root, fail, "CATALOG_INVALID");
  if (!catalog) {
    return {
      ok: false,
      collections: 0,
      checked,
      declared,
      discovered: discoveredFiles.length,
      failures,
    };
  }

  if (catalog.schemaVersion !== 2) fail("CATALOG_SCHEMA", "manifest.json", "schemaVersion must be 2");
  if (typeof catalog.policy !== "string" || !catalog.policy.trim()) {
    fail("CATALOG_POLICY_MISSING", "manifest.json", "policy must be a non-empty string");
  }
  if (catalog.annotation !== "../conflict-resolution.md") {
    fail("CATALOG_ANNOTATION", "manifest.json", "annotation must point to ../conflict-resolution.md");
  }
  if (!['developing', 'near-complete', 'complete'].includes(catalog.maturity)) {
    fail("CATALOG_MATURITY_INVALID", "manifest.json", "maturity must be developing, near-complete, or complete");
  }
  if (typeof catalog.coverage !== "string" || !/^\d{1,3}%\+?$/.test(catalog.coverage)) {
    fail("CATALOG_COVERAGE_INVALID", "manifest.json", "coverage must be a percentage such as 90%+");
  }
  if (!catalog.collections || typeof catalog.collections !== "object" || Array.isArray(catalog.collections)) {
    fail("COLLECTIONS_INVALID", "manifest.json", "collections must be an object");
  }

  const collections = catalog.collections && typeof catalog.collections === "object" && !Array.isArray(catalog.collections)
    ? Object.entries(catalog.collections)
    : [];
  const collectionNames = new Set(collections.map(([name]) => name));
  const rootEntries = await readdir(root, { withFileTypes: true });

  for (const entry of rootEntries) {
    if (entry.isDirectory() && !collectionNames.has(entry.name)) {
      fail("UNREGISTERED_COLLECTION", entry.name, "directory is not declared in the root manifest");
    } else if (entry.isFile() && entry.name !== "manifest.json") {
      fail("UNEXPECTED_ROOT_FILE", entry.name, "only manifest.json and collection directories are allowed at golden root");
    }
  }

  const contentOwners = new Map();
  for (const [collectionName, metadata] of collections) {
    const collectionPath = path.join(root, collectionName);
    if (!COLLECTION_NAME.test(collectionName)) {
      fail("COLLECTION_NAME_INVALID", "manifest.json", `invalid collection name: ${collectionName}`);
      continue;
    }
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      fail("COLLECTION_METADATA_INVALID", `manifest.json#${collectionName}`, "collection metadata must be an object");
      continue;
    }
    if (!STATUSES.has(metadata.status)) {
      fail("STATUS_INVALID", `manifest.json#${collectionName}`, `unsupported status: ${metadata.status}`);
    }
    if (!EVIDENCE_MODES.has(metadata.evidenceMode)) {
      fail("EVIDENCE_MODE_INVALID", `manifest.json#${collectionName}`, `unsupported evidenceMode: ${metadata.evidenceMode}`);
    }
    if (!Array.isArray(metadata.knownIssues)) {
      fail("KNOWN_ISSUES_INVALID", `manifest.json#${collectionName}`, "knownIssues must be an array");
    }

    const expectedManifest = `${collectionName}/manifest.json`;
    if (metadata.manifest !== expectedManifest) {
      fail("MANIFEST_PATH_INVALID", `manifest.json#${collectionName}`, `manifest must be ${expectedManifest}`);
      continue;
    }

    let directoryEntries;
    try {
      directoryEntries = await readdir(collectionPath, { withFileTypes: true });
    } catch (error) {
      fail("COLLECTION_DIRECTORY_MISSING", collectionName, error.message);
      continue;
    }

    const collectionManifestPath = path.join(root, metadata.manifest);
    const manifest = await readJson(collectionManifestPath, root, fail, "COLLECTION_MANIFEST_INVALID");
    if (!manifest) continue;
    if (manifest.schemaVersion !== 2) {
      fail("COLLECTION_SCHEMA", metadata.manifest, "schemaVersion must be 2");
    }
    if (manifest.collection !== collectionName) {
      fail("COLLECTION_ID_MISMATCH", metadata.manifest, `collection must be ${collectionName}`);
    }
    if (manifest.status !== metadata.status) {
      fail("COLLECTION_STATUS_MISMATCH", metadata.manifest, `status must match root value ${metadata.status}`);
    }
    if (manifest.evidenceMode !== metadata.evidenceMode) {
      fail("COLLECTION_MODE_MISMATCH", metadata.manifest, `evidenceMode must match root value ${metadata.evidenceMode}`);
    }
    if (typeof manifest.source !== "string" || !manifest.source.trim()) {
      fail("COLLECTION_SOURCE_MISSING", metadata.manifest, "source must be a non-empty string");
    }
    if (typeof manifest.capturedAt !== "string" || !ISO_DATE.test(manifest.capturedAt)) {
      fail("COLLECTION_DATE_INVALID", metadata.manifest, "capturedAt must use YYYY-MM-DD");
    }
    if (!Array.isArray(manifest.examples) || manifest.examples.length === 0) {
      fail("EXAMPLES_INVALID", metadata.manifest, "examples must be a non-empty array");
      continue;
    }

    const physicalFiles = new Set();
    for (const entry of directoryEntries) {
      if (entry.isDirectory()) {
        fail("NESTED_COLLECTION_DIRECTORY", `${collectionName}/${entry.name}`, "golden collections must be flat");
      } else if (entry.name !== "manifest.json") {
        physicalFiles.add(entry.name);
      }
    }

    const declaredFiles = new Set();
    for (const [index, example] of manifest.examples.entries()) {
      const entryPath = `${metadata.manifest}#examples[${index}]`;
      if (!example || typeof example !== "object" || Array.isArray(example)) {
        fail("EXAMPLE_INVALID", entryPath, "example must be an object");
        continue;
      }

      const fileName = example.fileName;
      if (typeof fileName !== "string" || !fileName || path.basename(fileName) !== fileName || fileName === "manifest.json") {
        fail("EXAMPLE_PATH_INVALID", entryPath, "fileName must be a plain file name inside its collection");
        continue;
      }
      if (declaredFiles.has(fileName)) {
        fail("DUPLICATE_DECLARATION", `${collectionName}/${fileName}`, "file is declared more than once");
        continue;
      }
      declaredFiles.add(fileName);
      declared += 1;

      if (typeof example.heading !== "string" || !example.heading.trim()) {
        fail("HEADING_MISSING", `${collectionName}/${fileName}`, "heading must be a non-empty string");
      }
      if (typeof example.language !== "string" || !example.language.trim()) {
        fail("LANGUAGE_MISSING", `${collectionName}/${fileName}`, "language must be a non-empty string");
      }

      const entryStatus = example.status ?? manifest.status;
      const entryMode = example.evidenceMode ?? manifest.evidenceMode;
      if (manifest.status === "mixed" && example.status === undefined) {
        fail("ENTRY_STATUS_REQUIRED", `${collectionName}/${fileName}`, "mixed collections require entry status");
      } else if (manifest.status !== "mixed" && example.status !== undefined && example.status !== manifest.status) {
        fail("ENTRY_STATUS_MISMATCH", `${collectionName}/${fileName}`, `entry status must inherit ${manifest.status}`);
      }
      if (manifest.evidenceMode === "mixed" && example.evidenceMode === undefined) {
        fail("ENTRY_MODE_REQUIRED", `${collectionName}/${fileName}`, "mixed collections require entry evidenceMode");
      } else if (manifest.evidenceMode !== "mixed" && example.evidenceMode !== undefined && example.evidenceMode !== manifest.evidenceMode) {
        fail("ENTRY_MODE_MISMATCH", `${collectionName}/${fileName}`, `entry evidenceMode must inherit ${manifest.evidenceMode}`);
      }
      if (!STATUSES.has(entryStatus) || entryStatus === "mixed") {
        fail("ENTRY_STATUS_INVALID", `${collectionName}/${fileName}`, `unsupported entry status: ${entryStatus}`);
      }
      if (!EVIDENCE_MODES.has(entryMode) || entryMode === "mixed") {
        fail("ENTRY_MODE_INVALID", `${collectionName}/${fileName}`, `unsupported entry evidenceMode: ${entryMode}`);
      }
      if (typeof example.sha256 !== "string" || !SHA256.test(example.sha256)) {
        fail("HASH_FORMAT_INVALID", `${collectionName}/${fileName}`, "sha256 must be 64 lowercase hexadecimal characters");
        continue;
      }
      if (!physicalFiles.has(fileName)) {
        fail("DECLARED_FILE_MISSING", `${collectionName}/${fileName}`, "manifest entry has no matching file");
        continue;
      }

      const filePath = path.join(collectionPath, fileName);
      const actual = hash(await readFile(filePath));
      checked += 1;
      if (actual !== example.sha256) {
        fail("HASH_MISMATCH", `${collectionName}/${fileName}`, `expected ${example.sha256}; received ${actual}`);
      }
      const previousOwner = contentOwners.get(actual);
      if (previousOwner && previousOwner !== `${collectionName}/${fileName}`) {
        fail("DUPLICATE_CONTENT", `${collectionName}/${fileName}`, `byte-for-byte duplicate of ${previousOwner}`);
      } else {
        contentOwners.set(actual, `${collectionName}/${fileName}`);
      }
    }

    for (const fileName of physicalFiles) {
      if (!declaredFiles.has(fileName)) {
        fail("UNDECLARED_FILE", `${collectionName}/${fileName}`, "file is not declared in its collection manifest");
      }
    }
  }

  if (declared !== discoveredFiles.length) {
    fail("COVERAGE_MISMATCH", "manifest.json", `declared ${declared} files but discovered ${discoveredFiles.length}`);
  }
  failures.sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));
  return {
    ok: failures.length === 0,
    collections: collections.length,
    checked,
    declared,
    discovered: discoveredFiles.length,
    failures,
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = await verifyGolden();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
