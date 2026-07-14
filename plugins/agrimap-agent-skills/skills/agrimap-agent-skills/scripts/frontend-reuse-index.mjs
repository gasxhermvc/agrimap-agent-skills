#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRECTORIES = new Set([".git", "bin", "obj", "node_modules", "dist", "coverage", ".angular"]);

function parseArgs(argv) {
  const values = {};
  for (let index = 3; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    const key = argv[index].slice(2);
    const next = argv[index + 1];
    values[key] = next && !next.startsWith("--") ? next : true;
    if (values[key] !== true) index += 1;
  }
  return values;
}

function workspaceRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return path.resolve(cwd);
  }
}

function normalizePath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readIndex(indexPath) {
  if (!(await exists(indexPath))) return [];
  const content = await readFile(indexPath, "utf8");
  const entries = [];
  for (const [lineIndex, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`Invalid JSONL at ${indexPath}:${lineIndex + 1}: ${error.message}`);
    }
  }
  return entries;
}

async function writeIndex(indexPath, entries) {
  await mkdir(path.dirname(indexPath), { recursive: true });
  const ordered = [...entries].sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const content = ordered.length ? `${ordered.map((entry) => JSON.stringify(entry)).join("\n")}\n` : "";
  await writeFile(indexPath, content, "utf8");
}

async function walk(directory, files = []) {
  if (!(await exists(directory))) return files;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(entryPath, files);
    else if (
      entry.isFile()
      && SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      && !entry.name.endsWith(".d.ts")
      && !/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(entry.name)
    ) files.push(entryPath);
  }
  return files;
}

function inferKind(file, declaration, prefix) {
  const lower = file.toLowerCase();
  if (declaration === "class" && (/@Component\s*\(/.test(prefix) || lower.includes(".component."))) return "component";
  if (declaration === "class" && (/@Injectable\s*\(/.test(prefix) || lower.includes(".service."))) return "service";
  if (declaration === "class" && (/@Directive\s*\(/.test(prefix) || lower.includes(".directive."))) return "directive";
  if (declaration === "class" && (/@Pipe\s*\(/.test(prefix) || lower.includes(".pipe."))) return "pipe";
  if (declaration === "class" && lower.includes(".facade.")) return "facade";
  if (lower.includes(".token.")) return "token";
  if (lower.includes(".config.")) return "config";
  if (declaration === "function") return "function";
  if (["interface", "type", "enum"].includes(declaration)) return declaration;
  return declaration === "class" ? "class" : "value";
}

function inferScope(file) {
  const segments = file.toLowerCase().split("/");
  if (segments.some((segment) => ["generated", "gencode", "api-client"].includes(segment))) return "generated";
  if (segments.some((segment) => ["core", "codebase"].includes(segment))) return "core";
  if (segments.some((segment) => ["shared", "common"].includes(segment))) return "shared";
  if (segments.some((segment) => ["projects", "libs", "library", "libraries"].includes(segment))) return "library";
  return "feature";
}

function searchableWords(symbol, file) {
  return `${symbol} ${file}`
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((word, index, values) => word.length > 1 && values.indexOf(word) === index)
    .slice(0, 20);
}

function vectorText(entry) {
  return [
    entry.name,
    entry.kind,
    entry.scope,
    ...(entry.capabilities || []),
    ...(entry.tags || []),
    ...(entry.inputs || []),
    ...(entry.outputs || []),
    entry.selector,
    entry.file,
  ].filter(Boolean).join(" | ").toLowerCase();
}

function discover(content, file, fileHash, updatedBy) {
  const entries = [];
  const pattern = /\bexport\s+(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(class|function|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const prefix = content.slice(Math.max(0, match.index - 900), match.index);
    const decoratorStart = Math.max(
      prefix.lastIndexOf("@Component"),
      prefix.lastIndexOf("@Injectable"),
      prefix.lastIndexOf("@Directive"),
      prefix.lastIndexOf("@Pipe"),
    );
    const possibleDecoratorContext = decoratorStart >= 0 ? prefix.slice(decoratorStart) : "";
    const decoratorContext = /\bexport\s+/.test(possibleDecoratorContext) ? "" : possibleDecoratorContext;
    const selector = decoratorContext.match(/\bselector\s*:\s*["'`]([^"'`]+)["'`]/)?.[1] || null;
    const declaration = match[1];
    const symbol = match[2];
    const kind = inferKind(file, declaration, decoratorContext);
    const scope = inferScope(file);
    const tags = searchableWords(symbol, file);
    const entry = {
      id: `${kind}:${file}#${symbol}`,
      name: symbol,
      kind,
      file,
      symbol,
      selector,
      scope,
      capabilities: tags.slice(0, 8),
      inputs: [],
      outputs: [],
      consumers: [],
      tags,
      status: "discovered",
      hash: fileHash,
      vectorReadyText: "",
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    entry.vectorReadyText = vectorText(entry);
    entries.push(entry);
  }
  return entries;
}

function validateEntry(entry) {
  const required = ["id", "name", "kind", "file", "symbol", "scope", "status", "hash", "vectorReadyText", "updatedAt", "updatedBy"];
  return required.filter((field) => !entry[field]);
}

async function scan(root, indexPath, args) {
  const paths = String(args.paths || "src,projects,libs")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const updatedBy = String(args.by || "scanner");
  const files = [];
  for (const sourcePath of paths) await walk(path.resolve(root, sourcePath), files);

  const existing = await readIndex(indexPath);
  const existingById = new Map(existing.map((entry) => [entry.id, entry]));
  const discovered = [];
  for (const filePath of files.sort()) {
    const content = await readFile(filePath, "utf8");
    const file = normalizePath(root, filePath);
    for (const candidate of discover(content, file, sha256(content), updatedBy)) {
      const previous = existingById.get(candidate.id);
      if (previous) {
        const unchanged = previous.hash === candidate.hash;
        discovered.push({
          ...candidate,
          ...previous,
          hash: candidate.hash,
          file: candidate.file,
          symbol: candidate.symbol,
          selector: previous.selector || candidate.selector,
          vectorReadyText: previous.vectorReadyText || vectorText({ ...candidate, ...previous }),
          updatedAt: unchanged ? previous.updatedAt : candidate.updatedAt,
          updatedBy: unchanged ? previous.updatedBy : updatedBy,
        });
        existingById.delete(candidate.id);
      } else {
        discovered.push(candidate);
      }
    }
  }
  const merged = [...discovered, ...existingById.values()];
  await writeIndex(indexPath, merged);
  return { ok: true, scannedFiles: files.length, discovered: discovered.length, preserved: existingById.size, index: normalizePath(root, indexPath) };
}

async function search(indexPath, args) {
  const query = String(args.query || args.q || "").toLowerCase().trim();
  if (!query) return { ok: false, message: "--query is required." };
  const terms = query.split(/\s+/).filter(Boolean);
  const limit = Math.max(1, Math.min(100, Number(args.limit) || 20));
  const results = (await readIndex(indexPath))
    .filter((entry) => args["include-deprecated"] || entry.status !== "deprecated")
    .map((entry) => {
      const haystack = vectorText(entry);
      const matches = terms.filter((term) => haystack.includes(term)).length;
      const exactName = String(entry.name).toLowerCase() === query ? 5 : 0;
      const verified = entry.status === "verified" ? 0.25 : 0;
      return { entry, score: matches + exactName + verified };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || String(left.entry.id).localeCompare(String(right.entry.id)))
    .slice(0, limit);
  return { ok: true, query, count: results.length, results };
}

async function upsert(root, indexPath, args) {
  if (!args.entry) return { ok: false, message: "--entry <json-file> is required." };
  const input = JSON.parse(await readFile(path.resolve(root, String(args.entry)), "utf8"));
  const filePath = path.resolve(root, input.file || "");
  const content = await readFile(filePath, "utf8").catch(() => null);
  const entry = {
    ...input,
    id: input.id || `${input.kind}:${String(input.file).replace(/\\/g, "/")}#${input.symbol}`,
    capabilities: input.capabilities || [],
    inputs: input.inputs || [],
    outputs: input.outputs || [],
    consumers: input.consumers || [],
    tags: input.tags || [],
    status: input.status || "verified",
    hash: content === null ? input.hash : sha256(content),
    updatedAt: new Date().toISOString(),
    updatedBy: String(args.by || input.updatedBy || "frontier"),
  };
  entry.vectorReadyText = input.vectorReadyText || vectorText(entry);
  const missing = validateEntry(entry);
  if (missing.length) return { ok: false, message: `Missing required fields: ${missing.join(", ")}` };

  const entries = await readIndex(indexPath);
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index >= 0) entries[index] = entry;
  else entries.push(entry);
  await writeIndex(indexPath, entries);
  return { ok: true, action: index >= 0 ? "updated" : "created", entry };
}

async function deprecate(indexPath, args) {
  const id = String(args.id || "").trim();
  if (!id) return { ok: false, message: "--id is required." };
  const entries = await readIndex(indexPath);
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return { ok: false, message: `Entry not found: ${id}` };
  entries[index] = {
    ...entries[index],
    status: "deprecated",
    replacementId: args.replacement || entries[index].replacementId || null,
    deprecationReason: args.reason || entries[index].deprecationReason || "Deprecated by frontier review.",
    updatedAt: new Date().toISOString(),
    updatedBy: String(args.by || "frontier"),
  };
  await writeIndex(indexPath, entries);
  return { ok: true, entry: entries[index] };
}

async function validate(root, indexPath) {
  const entries = await readIndex(indexPath);
  const issues = [];
  const ids = new Set();
  for (const entry of entries) {
    const missing = validateEntry(entry);
    if (missing.length) issues.push({ id: entry.id || null, issue: "missing-fields", fields: missing });
    if (ids.has(entry.id)) issues.push({ id: entry.id, issue: "duplicate-id" });
    ids.add(entry.id);
    const filePath = path.resolve(root, entry.file || "");
    const content = await readFile(filePath, "utf8").catch(() => null);
    if (content === null && entry.status !== "deprecated") issues.push({ id: entry.id, issue: "missing-file", file: entry.file });
    else if (sha256(content) !== entry.hash) issues.push({ id: entry.id, issue: "stale-hash", file: entry.file });
  }
  return { ok: issues.length === 0, entries: entries.length, issues };
}

const command = process.argv[2];
const args = parseArgs(process.argv);
const root = workspaceRoot(args.cwd || process.cwd());
const indexPath = path.resolve(root, String(args.index || ".agrimap-agent/knowledge/frontend-reuse.jsonl"));
let result;

switch (command) {
  case "scan":
    result = await scan(root, indexPath, args);
    break;
  case "search":
    result = await search(indexPath, args);
    break;
  case "upsert":
    result = await upsert(root, indexPath, args);
    break;
  case "deprecate":
    result = await deprecate(indexPath, args);
    break;
  case "validate":
    result = await validate(root, indexPath);
    break;
  default:
    result = { ok: false, message: "Use scan, search, upsert, deprecate, or validate." };
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exitCode = 1;
