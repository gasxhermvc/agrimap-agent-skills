import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const serverPath = path.join(root, "skills", "agrimap-agent-skills", "scripts", "mcp-server.mjs");

function startServer() {
  const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "inherit"] });
  child.stdout.setEncoding("utf8");
  const waiters = new Map();
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      if (message.id !== undefined && waiters.has(message.id)) {
        waiters.get(message.id)(message);
        waiters.delete(message.id);
      }
    }
  });
  let nextId = 1;
  function request(method, params) {
    const id = nextId++;
    return new Promise((resolve) => {
      waiters.set(id, resolve);
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }
  function notify(method, params) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }
  return { child, request, notify };
}

async function callRead(request, referencePath) {
  const response = await request("tools/call", {
    name: "read_reference",
    arguments: { path: referencePath },
  });
  return response.result;
}

test("mcp-server initializes, lists, and serves bundled references", async () => {
  const { child, request, notify } = startServer();
  try {
    const init = await request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    assert.equal(init.result.protocolVersion, "2025-06-18");
    assert.equal(init.result.serverInfo.name, "agrimap-agent-skills");
    assert.ok(init.result.capabilities.tools);
    notify("notifications/initialized", {});

    const list = await request("tools/list", {});
    const readTool = list.result.tools.find((tool) => tool.name === "read_reference");
    assert.ok(readTool, "read_reference tool must be advertised");
    assert.deepEqual(readTool.inputSchema.required, ["path"]);

    const lifecycle = await callRead(request, "lifecycle-core.md");
    assert.notEqual(lifecycle.isError, true);
    assert.match(lifecycle.content[0].text, /Workflow lifecycle core/);

    const entrypoint = await callRead(request, "operations/analyze.md");
    assert.notEqual(entrypoint.isError, true);
    assert.match(entrypoint.content[0].text, /Compact operation entrypoint/);

    // Operation entrypoints link conditional references as `../name.md`; the
    // server must accept that verbatim form and normalize it to the root.
    const csharp = await callRead(request, "../patterns/csharp.md");
    assert.notEqual(csharp.isError, true);
    assert.ok(csharp.content[0].text.length > 0);

    // Embedded traversal out of the references root is refused.
    const escape = await callRead(request, "patterns/../../../package.json");
    assert.equal(escape.isError, true);
    assert.match(escape.content[0].text, /CONTRACT_NOT_LOADED/);

    // A missing reference is a tool-level error, not a transport crash.
    const missing = await callRead(request, "no-such-reference.md");
    assert.equal(missing.isError, true);
    assert.match(missing.content[0].text, /CONTRACT_NOT_LOADED/);

    // Unknown methods return a JSON-RPC error rather than hanging.
    const unknown = await request("does/not/exist", {});
    assert.equal(unknown.error.code, -32601);
  } finally {
    child.stdin.end();
    child.kill();
  }
});
