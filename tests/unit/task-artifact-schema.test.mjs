import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  loadTaskArtifactSchema,
  renderTaskArtifactSchemaDocs,
  replaceTaskArtifactSchemaDocs,
  taskArtifactRequiredSections,
  taskArtifactSchemaIssues,
  TASK_ARTIFACT_SCHEMA_END,
  TASK_ARTIFACT_SCHEMA_START,
} from "../../skills/agrimap-agent-skills/scripts/task-artifact-schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillRoot = path.join(root, "skills", "agrimap-agent-skills");

test("task artifact schema owns scaffold, completion fields, templates, and generated docs", async () => {
  const schema = await loadTaskArtifactSchema(skillRoot);
  assert.deepEqual(taskArtifactSchemaIssues(schema), []);
  assert.deepEqual(schema.scaffoldOrder, ["brief.md", "checklist.md"]);
  assert.deepEqual(schema.workflowDepths, ["standard", "regulated"]);
  assert.deepEqual(schema.artifacts["qa.md"].requiredForDepths, ["regulated"]);
  assert.equal(schema.artifacts["result.md"].requiredSections.includes("Outstanding items"), true);
  assert.deepEqual(schema.crossArtifactRules.fastAllowedSequences, ["1", "2"]);
  assert.equal(schema.qaFullTriggers.some((trigger) => trigger.includes("third consecutive passed-fast closure")), true);

  for (const definition of Object.values(schema.artifacts)) {
    const template = await readFile(path.join(skillRoot, "assets", "templates", definition.template), "utf8");
    for (const field of definition.requiredFields || []) assert.match(template, new RegExp(`^- ${field.label}:`, "m"));
    for (const heading of taskArtifactRequiredSections(definition)) assert.equal(template.includes(`## ${heading}`), true);
  }

  const generated = renderTaskArtifactSchemaDocs(schema);
  assert.match(generated, /`qa\.md`/);
  assert.match(generated, /Required depths/);
  assert.match(generated, /`standard`/);
  assert.match(generated, /`regulated`/);
  assert.match(generated, /`Outstanding items`/);
  assert.match(generated, /third consecutive passed-fast closure/);
  assert.equal(
    replaceTaskArtifactSchemaDocs(`${TASK_ARTIFACT_SCHEMA_START}\nstale\n${TASK_ARTIFACT_SCHEMA_END}`, generated),
    generated,
  );
});
