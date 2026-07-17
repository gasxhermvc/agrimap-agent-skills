import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { sqlContractPreflight } from "../../skills/agrimap-agent-skills/scripts/sql-contract-preflight.mjs";
import { projectRoot } from "../helpers/harness.mjs";

test("selects an exact procedure golden and the executable message insert template", async () => {
  const result = await sqlContractPreflight({ targetKind: "sql-procedure", objectName: "UM_USER_I" });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.gate, "SQL_CONTRACT_READY");
  assert.equal(result.selectedGolden[0].path, "references/patterns/golden/sql/UM_USER_I.sql");
  assert.equal(result.selectedGolden[1].path, "references/patterns/golden/sql/LUT_APP_MESSAGES.example.sql");
  const template = await readFile(path.join(projectRoot, "skills", "agrimap-agent-skills", result.selectedGolden[1].path), "utf8");
  assert.match(template, /IF\s+NOT\s+EXISTS/i);
  assert.match(template, /INSERT\s+INTO\s+\[agrimap_app\]\.\[LUT_APP_MESSAGES\]\s*\(\[ID\],\s*\[DESCR\]\)/i);
});

test("selects current lookup and query structures for new objects", async () => {
  const lookup = await sqlContractPreflight({ targetKind: "sql-table", objectName: "LUT_ORDER_STATUS" });
  const query = await sqlContractPreflight({ targetKind: "sql-procedure", objectName: "ORDER_ITEM_Q" });
  assert.equal(lookup.ok, true, JSON.stringify(lookup.issues));
  assert.equal(query.ok, true, JSON.stringify(query.issues));
  assert.equal(lookup.selectedGolden[0].path, "references/patterns/golden/sql/LUT_AUTH_TYPE.sql");
  assert.match(query.selectedGolden[0].path, /_Q\.sql$/);
});

test("fails closed before golden selection when SQL identity is incomplete", async () => {
  const result = await sqlContractPreflight({ targetKind: "sql-procedure", objectName: "UM_USER_SAVE" });
  assert.equal(result.ok, false);
  assert.equal(result.gate, "SQL_CONTRACT_BLOCKED");
  assert.ok(result.issues.some((issue) => issue.code === "PROCEDURE_SUFFIX_INVALID"));
});
