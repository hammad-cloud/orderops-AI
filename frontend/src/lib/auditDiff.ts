/** Turn an audit entry's `changes` into short "field: before → after" lines for display. */
export function describeChanges(changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } & Record<string, unknown>) {
  const { before, after, ...context } = changes;
  const show = (v: unknown): string => {
    if (v === null || v === undefined) return "—";
    if (Array.isArray(v)) return v.map((i) => (i && typeof i === "object" && "sku" in i ? `${i.sku}×${i.quantity}` : show(i))).join(", ");
    return String(v);
  };
  const lines: string[] = [];
  if (before || after) {
    const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
    for (const key of keys) {
      const [b, a] = [before?.[key], after?.[key]];
      if (!before) lines.push(`${key}: ${show(a)}`);
      else if (JSON.stringify(b) !== JSON.stringify(a)) lines.push(`${key}: ${show(b)} → ${show(a)}`);
    }
  }
  for (const [key, value] of Object.entries(context)) lines.push(`${key}: ${show(value)}`);
  return lines;
}
