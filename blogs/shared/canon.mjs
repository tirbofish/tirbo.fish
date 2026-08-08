/** Stable JSON for signing — sorted object keys, no whitespace. */
export function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;
}

export function parseFrontmatter(src) {
  if (!src.startsWith("---\n")) {
    return { meta: {}, body: src };
  }
  const end = src.indexOf("\n---\n", 4);
  if (end === -1) return { meta: {}, body: src };
  const raw = src.slice(4, end);
  const meta = {};
  for (const line of raw.split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return { meta, body: src.slice(end + 5) };
}
