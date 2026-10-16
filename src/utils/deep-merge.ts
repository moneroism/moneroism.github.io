export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

/** arrays are replaced, not merged. undefined in the patch is skipped. */
export function deepMerge<T>(base: T, ...patches: (DeepPartial<T> | undefined)[]): T {
  let out: unknown = structuredClone(base);
  for (const patch of patches) {
    if (patch === undefined) continue;
    out = mergeInto(out, patch);
  }
  return out as T;
}

function mergeInto(target: unknown, patch: unknown): unknown {
  if (!isPlainObject(target) || !isPlainObject(patch)) return patch;
  const res: Record<string, unknown> = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    res[k] = k in target ? mergeInto(target[k], v) : v;
  }
  return res;
}
