#!/usr/bin/env node

// AgriMap reference server (Model Context Protocol, stdio transport).
//
// Gemini CLI sandboxes its file tools to the workspace root, so a model running
// in a user's project cannot read the AgriMap contract/reference files that ship
// inside the installed extension directory. This server is declared in
// gemini-extension.json under `mcpServers`, where ${extensionPath} resolves to
// the install directory. It runs as a separate stdio subprocess (one per Gemini
// CLI instance, no shared port), so it reads the bundled references from disk and
// returns their text to the model on demand — the Gemini equivalent of the
// progressive-disclosure file reads Codex/Claude perform through their harness.
//
// Read-only and dependency-free by design: it only serves files under this
// skill's `references/` directory and never touches the user's workspace.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, "..");
const referencesRoot = path.join(skillRoot, "references");

const SERVER_NAME = "agrimap-agent-skills";
let SERVER_VERSION = "0.0.0";
try {
  const manifest = JSON.parse(
    await readFile(path.resolve(skillRoot, "..", "..", "gemini-extension.json"), "utf8"),
  );
  if (typeof manifest.version === "string") SERVER_VERSION = manifest.version;
} catch {
  // serverInfo.version is informational; a missing manifest is not fatal.
}

const READ_TOOL = {
  name: "read_reference",
  description:
    "Read one AgriMap reference file bundled in this extension and return its text. " +
    "Provide `path` relative to the skill references directory, e.g. `lifecycle-core.md`, " +
    "`operations/analyze.md`, or `patterns/csharp.md`. A leading `./`, `../`, or `references/` " +
    "segment is accepted (operation entrypoints link references as `../name.md`). Use this tool " +
    "for AgriMap contract/reference files only; use your normal file tools for the user's project files.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Reference path relative to the references directory (e.g. lifecycle-core.md).",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
};

function resolveReference(input) {
  let rel = String(input ?? "").replace(/\\/g, "/").trim();
  if (!rel) return null;
  rel = rel.replace(/^\/+/, "");
  rel = rel.replace(/^(?:\.\.?\/)+/, "");
  rel = rel.replace(/^references\//, "");
  if (!rel) return null;
  const target = path.resolve(referencesRoot, rel);
  if (target !== referencesRoot && !target.startsWith(referencesRoot + path.sep)) return null;
  return target;
}

async function readReference(input) {
  const target = resolveReference(input);
  if (!target) {
    return {
      content: [{
        type: "text",
        text: `CONTRACT_NOT_LOADED: refused reference path ${JSON.stringify(String(input ?? ""))} (outside the references root).`,
      }],
      isError: true,
    };
  }
  try {
    const text = await readFile(target, "utf8");
    return { content: [{ type: "text", text }] };
  } catch {
    const shown = path.relative(referencesRoot, target).replace(/\\/g, "/");
    return {
      content: [{ type: "text", text: `CONTRACT_NOT_LOADED: reference not found: ${shown}` }],
      isError: true,
    };
  }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function respond(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function respondError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(message) {
  if (message === null || typeof message !== "object") return;
  const { id, method, params } = message;
  const isNotification = id === undefined || id === null;
  switch (method) {
    case "initialize": {
      const requested = params?.protocolVersion;
      respond(id, {
        protocolVersion: typeof requested === "string" ? requested : "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
      return;
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return; // Notifications never receive a response.
    case "ping":
      if (!isNotification) respond(id, {});
      return;
    case "tools/list":
      if (!isNotification) respond(id, { tools: [READ_TOOL] });
      return;
    case "tools/call": {
      if (isNotification) return;
      if (params?.name !== READ_TOOL.name) {
        respondError(id, -32602, `Unknown tool: ${params?.name}`);
        return;
      }
      respond(id, await readReference(params?.arguments?.path));
      return;
    }
    default:
      if (!isNotification) respondError(id, -32601, `Method not found: ${method}`);
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue; // Ignore malformed lines rather than crashing the transport.
    }
    Promise.resolve(handle(message)).catch(() => {});
  }
});
process.stdin.on("end", () => process.exit(0));
