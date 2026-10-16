// TODO: split this file up. it's been "temporary" since like v0.3

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function pad(n: number | string, len = 2, ch = '0'): string {
  return String(n).padStart(len, ch);
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...a: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

export function formatBytes(n: number): string {
  const units = ['B', 'K', 'M', 'G'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return (i === 0 ? n : n.toFixed(1)) + (units[i] ?? '?');
}

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

// used to be lodash.get. dropped lodash in 0.6, kept the one function
export function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj as unknown);
}

export const noop = () => {};

/** dmesg style "[    1.234567]" */
export function ktime(ms: number = performance.now()): string {
  const s = (ms / 1000).toFixed(6);
  return `[${s.padStart(12, ' ')}]`;
}

// export function uuid() {
//   return crypto.randomUUID();
// }
// ^ not needed anymore since windows have fixed ids. leaving it in case
