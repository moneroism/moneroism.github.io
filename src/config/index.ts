import defaults from './default';
import type { Config } from './schema';
import { deepMerge, type DeepPartial } from '@/utils/deep-merge';

/*
 * config layers, lowest to highest:
 *   1. default.ts
 *   2. VITE_FEATURE_* env (build time, .env / .env.local)
 *   3. query string (?crt=0&debug=1), for when i'm testing on my phone
 */

const flag = (v: string | undefined): boolean | undefined =>
  v === undefined || v === '' ? undefined : v === '1' || v === 'true';

function fromEnv(): DeepPartial<Config> {
  const env = import.meta.env;
  return {
    features: {
      crt: flag(env.VITE_FEATURE_CRT),
      debug: flag(env.VITE_FEATURE_DEBUG),
    },
  };
}

function fromQuery(search: string): DeepPartial<Config> {
  const q = new URLSearchParams(search);
  const features: Record<string, boolean | undefined> = {};
  for (const k of ['crt', 'debug'] as const) {
    features[k] = flag(q.get(k) ?? undefined);
  }
  return { features };
}

export function loadConfig(search = typeof location !== 'undefined' ? location.search : ''): Config {
  return deepMerge(defaults, fromEnv(), fromQuery(search));
}

export type { Config };
