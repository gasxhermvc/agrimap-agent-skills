#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCliArgs } from "../skills/agrimap-agent-skills/scripts/cli-args.mjs";

const args = parseCliArgs(process.argv.slice(2));
const { source, output, collection } = args;

if (!source || !output || !collection) {
  console.error(
    "Usage: node tools/extract-code-blocks.mjs --source <markdown> --output <directory> --collection <name>",
  );
  process.exit(2);
}

const extensionByLanguage = {
  csharp: "cs",
  cs: "cs",
  css: "css",
  html: "html",
  json: "json",
  scss: "scss",
  sql: "sql",
  text: "txt",
  ts: "ts",
  typescript: "ts",
};

function slugify(value) {
  const slug = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return slug || "example";
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const markdown = await readFile(source, "utf8");
const blockPattern = /^```([^\r\n]*)\r?\n([\s\S]*?)^```[\t ]*\r?$/gm;
const blockMatches = [...markdown.matchAll(blockPattern)];
const headingMatches = [
  ...markdown.matchAll(/^#{1,6}\s+(.+)\r?$/gm),
]
  .filter((headingMatch) => !blockMatches.some((blockMatch) => (
    headingMatch.index >= blockMatch.index
    && headingMatch.index < blockMatch.index + blockMatch[0].length
  )))
  .map((match) => ({ index: match.index, title: match[1].trim() }));

const blocks = [];

for (const match of blockMatches) {
  const language = match[1].trim().toLowerCase() || "text";
  const body = match[2];
  const lineStart = markdown.slice(0, match.index).split(/\r?\n/).length;
  const lineEnd = lineStart + match[0].split(/\r?\n/).length - 1;
  const heading = headingMatches
    .filter((item) => item.index < match.index)
    .at(-1)?.title ?? "example";
  const ordinal = String(blocks.length + 1).padStart(3, "0");
  const extension = extensionByLanguage[language] ?? "txt";
  const fileName = `${ordinal}-${slugify(heading).slice(0, 64)}.${extension}`;

  blocks.push({
    body,
    fileName,
    heading,
    language,
    lineEnd,
    lineStart,
    sha256: sha256(body),
  });
}

await mkdir(output, { recursive: true });
for (const block of blocks) {
  await writeFile(path.join(output, block.fileName), block.body, "utf8");
}

const manifest = {
  schemaVersion: 1,
  collection,
  source: source.replaceAll("\\", "/"),
  sourceSha256: sha256(markdown),
  note: "Extracted code blocks only. Legacy prose and guardrails were intentionally excluded.",
  examples: blocks.map(({ body: _body, ...block }) => block),
};

await writeFile(
  path.join(output, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Extracted ${blocks.length} code blocks from ${source} to ${output}.`);
