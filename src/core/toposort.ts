/**
 * kahn's algorithm. stable: nodes keep insertion order when there's no constraint between them,
 * so the boot log doesn't shuffle around between reloads.
 */
export function toposort<T>(nodes: T[], id: (n: T) => string, deps: (n: T) => string[]): T[] {
  const byId = new Map(nodes.map((n) => [id(n), n]));
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();

  for (const n of nodes) {
    const k = id(n);
    indeg.set(k, indeg.get(k) ?? 0);
    for (const d of deps(n)) {
      if (!byId.has(d)) throw new Error(`toposort: "${k}" depends on unknown "${d}"`);
      indeg.set(k, (indeg.get(k) ?? 0) + 1);
      out.set(d, [...(out.get(d) ?? []), k]);
    }
  }

  const queue = nodes.filter((n) => indeg.get(id(n)) === 0).map(id);
  const res: T[] = [];
  while (queue.length) {
    const k = queue.shift()!;
    res.push(byId.get(k)!);
    for (const m of out.get(k) ?? []) {
      const d = indeg.get(m)! - 1;
      indeg.set(m, d);
      if (d === 0) queue.push(m);
    }
  }

  if (res.length !== nodes.length) {
    const stuck = nodes.map(id).filter((k) => indeg.get(k)! > 0);
    throw new Error(`toposort: cycle between ${stuck.join(', ')}`);
  }
  return res;
}
