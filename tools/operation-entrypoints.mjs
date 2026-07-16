import path from "node:path";

export function operationEntrypointFile(item) {
  return `${item.operation}.md`;
}

export function operationConfigIssues(config) {
  const issues = [];
  if (config?.schemaVersion !== 2) issues.push("schemaVersion must be 2");
  if (!Array.isArray(config?.operations) || config.operations.length === 0) return [...issues, "operations must be a non-empty array"];
  const names = new Set();
  const operations = new Set();
  for (const item of config.operations) {
    for (const field of ["name", "operation", "description", "mode", "deliverable", "example"]) {
      if (!String(item?.[field] || "").trim()) issues.push(`${item?.name || "unknown"}: ${field} is required`);
    }
    if (names.has(item.name)) issues.push(`duplicate alias: ${item.name}`);
    if (operations.has(item.operation)) issues.push(`duplicate operation: ${item.operation}`);
    names.add(item.name);
    operations.add(item.operation);
    for (const field of ["requiredInputs", "conditionalInputs", "instructions", "references"]) {
      if (!Array.isArray(item?.[field]) || item[field].length === 0) issues.push(`${item.name}: ${field} must be non-empty`);
    }
    for (const reference of [...(item.references || []), ...(item.conditionalReferences || [])]) {
      if (!reference?.path || !reference?.why) issues.push(`${item.name}: every reference needs path and why`);
    }
  }
  return issues;
}

function referenceLink(reference) {
  const [file, anchor] = String(reference.path).split("#", 2);
  const target = `../${file}${anchor ? `#${anchor}` : ""}`;
  return `[${file}](${target}) — ${reference.why}`;
}

export function renderOperationEntrypoint(item) {
  const conditional = (item.conditionalReferences || []).length
    ? item.conditionalReferences.map((reference) => `- When ${reference.when}: ${referenceLink(reference)}`)
    : ["- No additional conditional reference by default; select one target pattern only when runtime-core routing requires it."];
  return [
    `# Compact operation entrypoint: ${item.name}`,
    "",
    "<!-- Generated from config/operations.json. Do not edit directly. -->",
    "",
    `- Operation: \`${item.operation}\``,
    `- Mode: \`${item.mode}\``,
    `- Purpose: ${item.description}.`,
    `- Deliverable: ${item.deliverable}`,
    "",
    "## Inputs and help",
    "",
    `- Required: ${item.requiredInputs.join("; ")}.`,
    `- Conditional: ${item.conditionalInputs.join("; ")}.`,
    `- Minimal example: \`${item.example}\``,
    "",
    "## Execute this contract",
    "",
    ...item.instructions.map((instruction, index) => `${index + 1}. ${instruction}`),
    "",
    "## Load now",
    "",
    ...item.references.map((reference) => `- ${referenceLink(reference)}`),
    "",
    "## Load only when the condition matches",
    "",
    ...conditional,
    "",
    "Do not read the umbrella `SKILL.md` during a normal alias invocation. Use it only when this generated entrypoint is missing/corrupt or the requester directly invoked the umbrella with an unknown operation.",
    "",
  ].join("\n");
}

export function renderAliasSkill(item) {
  const base = "../agrimap-agent-skills/references";
  return `---\nname: ${item.name}\ndescription: ${item.description}. Use when the requester invokes this AgriMap alias.\n---\n\nRun operation \`${item.operation}\` through the compact progressive-disclosure path. Read exactly these files relative to this alias before routing any conditional discipline:\n\n1. \`${base}/runtime-core.md\`\n2. \`${base}/glossary.md\`\n3. \`${base}/operations/${operationEntrypointFile(item)}\`\n\nDo **not** read \`../agrimap-agent-skills/SKILL.md\` during a normal alias invocation. The compact entrypoint is authoritative for this operation and names every additional reference that may be loaded. Pass the requester's current arguments unchanged. If they contain a standalone \`-h\` or \`--help\` token, return the compact entrypoint's purpose, required inputs, conditional inputs, and minimal example without starting a task or writing project state. Use the umbrella only as an explicit fallback when a compact file is missing/corrupt or the requester invoked the umbrella directly with an unknown operation.\n`;
}

export function renderGeminiCommandPrompt(item) {
  return [
    `Run AgriMap operation ${item.operation} through its compact progressive-disclosure entrypoint.`,
    `Read only skills/agrimap-agent-skills/references/runtime-core.md, references/glossary.md, and references/operations/${operationEntrypointFile(item)} first; do not load the umbrella SKILL.md during a normal alias invocation.`,
    "The operation entrypoint names any additional conditional references. Treat those compact files as the workflow source of trust.",
    "When requester arguments contain a standalone -h or --help token, return compact operation help without starting a task or writing project state.",
    "Requester arguments:",
    "{{args}}",
  ].join("\n\n");
}

export function operationEntrypointPath(skillRoot, item) {
  return path.join(skillRoot, "references", "operations", operationEntrypointFile(item));
}
