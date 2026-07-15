export function parseCliArgs(tokens) {
  const values = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (typeof token !== "string" || !token.startsWith("--")) continue;

    const separator = token.indexOf("=");
    if (separator > 2) {
      values[token.slice(2, separator)] = token.slice(separator + 1);
      continue;
    }

    const key = token.slice(2);
    if (!key) continue;
    const next = tokens[index + 1];
    values[key] = typeof next === "string" && !next.startsWith("--") ? next : true;
    if (values[key] !== true) index += 1;
  }

  return values;
}
