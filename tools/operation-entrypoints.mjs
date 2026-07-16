import path from "node:path";

export function operationEntrypointFile(item) {
  return `${item.operation}.md`;
}

export function renderOperationIndex(config) {
  return [
    "# AgriMap operation routing index",
    "",
    "<!-- Generated from config/operations.json. Do not edit directly. -->",
    "",
    "Use this file only to select one dedicated `agm-*` skill. It is not an execution contract.",
    "",
    "| Dedicated skill | Operation | Purpose | Mode | Workflow depth |",
    "| --- | --- | --- | --- | --- |",
    ...config.operations.map((item) => `| \`${item.name}\` | \`${item.operation}\` | ${item.description} | \`${item.mode}\` | default \`${item.depth.default}\`; allowed ${item.depth.allowed.map((depth) => `\`${depth}\``).join(", ")} |`),
    "",
    "After selecting one row, hand off to that skill and stop the router. Never combine multiple operation skills implicitly.",
    "",
  ].join("\n");
}

export function operationConfigIssues(config) {
  const issues = [];
  if (config?.schemaVersion !== 3) issues.push("schemaVersion must be 3");
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
    const allowedDepths = item?.depth?.allowed;
    if (!["light", "standard", "regulated"].includes(item?.depth?.default)) issues.push(`${item.name}: depth.default must be light|standard|regulated`);
    if (!Array.isArray(allowedDepths) || allowedDepths.length === 0 || allowedDepths.some((depth) => !["light", "standard", "regulated"].includes(depth))) {
      issues.push(`${item.name}: depth.allowed must contain only light|standard|regulated`);
    } else if (!allowedDepths.includes(item.depth.default)) {
      issues.push(`${item.name}: depth.allowed must include depth.default`);
    }
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
    : ["- No additional conditional reference by default; select one target pattern only when lifecycle-core routing requires it."];
  return [
    `# Compact operation entrypoint: ${item.name}`,
    "",
    "<!-- Generated from config/operations.json. Do not edit directly. -->",
    "",
    `- Operation: \`${item.operation}\``,
    `- Workflow depth: default \`${item.depth.default}\`; allowed ${item.depth.allowed.map((depth) => `\`${depth}\``).join(", ")}`,
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
    "Do not read the router `SKILL.md` during operation execution. If this generated entrypoint is missing or corrupt, stop with `PACKAGE_ENTRYPOINT_MISSING` and ask for package sync/reinstallation; never broaden into the router.",
    "",
  ].join("\n");
}

export function renderAliasSkill(item) {
  const base = "../agrimap-agent-skills/references";
  return `---\nname: ${item.name}\ndescription: ${item.description}. Use only for the dedicated AgriMap \`${item.operation}\` operation or when the requester explicitly invokes this alias; do not use it as a general AgriMap router.\n---\n\nRun only operation \`${item.operation}\`. Read exactly these two files relative to this skill before any conditional discipline:\n\n1. \`${base}/lifecycle-core.md\`\n2. \`${base}/operations/${operationEntrypointFile(item)}\`\n\nDo **not** preload the glossary, umbrella, or another operation. The operation entrypoint names every conditional reference. Pass the requester's arguments unchanged. A standalone \`-h\` or \`--help\` returns compact help at \`light\` depth without identity, task state, or artifact writes. If either required file is missing or corrupt, stop with \`PACKAGE_ENTRYPOINT_MISSING\`; never fall back to the router.\n`;
}

export function renderGeminiCommandPrompt(item) {
  return [
    `Run only AgriMap operation ${item.operation} through its compact progressive-disclosure entrypoint.`,
    `Read exactly skills/agrimap-agent-skills/references/lifecycle-core.md and references/operations/${operationEntrypointFile(item)} first; do not preload the glossary, routing SKILL.md, or another operation.`,
    "The operation entrypoint names any additional conditional references. Treat those compact files as the workflow source of trust. If one is missing or corrupt, stop with PACKAGE_ENTRYPOINT_MISSING; never fall back to the router.",
    "When requester arguments contain a standalone -h or --help token, return compact operation help without starting a task or writing project state.",
    "Requester arguments:",
    "{{args}}",
  ].join("\n\n");
}

export function operationEntrypointPath(skillRoot, item) {
  return path.join(skillRoot, "references", "operations", operationEntrypointFile(item));
}
