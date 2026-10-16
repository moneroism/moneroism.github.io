import { token } from '@core/container';
import type { Module } from '@core/kernel';

/*
 * localStorage wrapper. everything is namespaced and json encoded, and every access is wrapped
 * because private windows / blocked site data throw on access instead of just returning null.
 * if storage is unavailable we fall back to a Map and the site just forgets things on reload.
 *
 * nothing in here is ever sent anywhere. it's prefs: theme, crt, shell history. that's it.
 */

const PREFIX = 'mnr:';
const VERSION_KEY = PREFIX + 'v';
const CURRENT = 2;

export interface Prefs {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  keys(): string[];
  readonly persistent: boolean;
}

export const PREFS = token<Prefs>('prefs');

type Backend = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

function memoryBackend(): Backend {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

function probe(): Backend | null {
  try {
    const s = window.localStorage;
    const k = PREFIX + '__probe';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

// each entry migrates from version i to i+1
const migrations: ((b: Backend) => void)[] = [
  // 0 -> 1: the old (pre-ts) site stored the theme unprefixed
  (b) => {
    const old = b.getItem('theme');
    if (old !== null) {
      b.setItem(PREFIX + 'theme', JSON.stringify(old));
      b.removeItem('theme');
    }
  },
  // 1 -> 2: history used to be one string joined with \n. which broke on multiline echo. oops
  (b) => {
    const raw = b.getItem(PREFIX + 'history');
    if (raw !== null && !raw.startsWith('[')) {
      b.setItem(PREFIX + 'history', JSON.stringify(raw.split('\n').filter(Boolean)));
    }
  },
];

export function migrate(b: Backend) {
  let v = Number(b.getItem(VERSION_KEY) ?? 0);
  if (!Number.isFinite(v)) v = 0;
  while (v < CURRENT) {
    migrations[v]?.(b);
    v++;
  }
  b.setItem(VERSION_KEY, String(CURRENT));
}

export function createPrefs(backend: Backend | null = probe()): Prefs {
  const persistent = backend !== null;
  const b = backend ?? memoryBackend();
  try {
    migrate(b);
  } catch {
    /* not worth crashing over */
  }

  return {
    persistent,
    get<T>(key: string, fallback: T): T {
      try {
        const raw = b.getItem(PREFIX + key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        b.setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        // quota or blocked. shrug
      }
    },
    remove(key) {
      try {
        b.removeItem(PREFIX + key);
      } catch {
        /* */
      }
    },
    keys() {
      const out: string[] = [];
      try {
        for (let i = 0; i < b.length; i++) {
          const k = b.key(i);
          if (k?.startsWith(PREFIX) && k !== VERSION_KEY) out.push(k.slice(PREFIX.length));
        }
      } catch {
        /* */
      }
      return out;
    },
  };
}

export const storageModule: Module = {
  name: 'prefsd',
  description: 'local prefs (theme, history). localStorage only, never leaves the browser',
  critical: true,
  init({ kernel, log }) {
    // registered early in main.ts so the initial state can read from it; this just reports
    const prefs = kernel.get(PREFS);
    log.info(prefs.persistent ? 'using localStorage' : 'storage blocked, using memory');
  },
};
