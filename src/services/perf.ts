import { token } from '@core/container';
import type { Module } from '@core/kernel';

/*
 * fps + request accounting. the request counter is real: PerformanceObserver sees every
 * resource the page loads. "external" = different origin. should always be zero.
 */

export interface Perf {
  fps(): number;
  frameTimes(): readonly number[];
  requests(): { total: number; external: number; hosts: string[] };
}

export const PERF = token<Perf>('perf');

const SAMPLES = 60;

export const perfModule: Module = {
  name: 'perfd',
  description: 'frame timing + counts every network request (external should be 0)',
  init({ kernel, log }) {
    const times: number[] = [];
    let last = performance.now();
    let raf = 0;
    let total = 0;
    const hosts = new Set<string>();
    let external = 0;

    const tick = (now: number) => {
      times.push(now - last);
      if (times.length > SAMPLES) times.shift();
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const account = (entries: PerformanceEntryList) => {
      for (const e of entries) {
        total++;
        try {
          const u = new URL(e.name);
          if (u.origin !== location.origin && u.protocol.startsWith('http')) {
            external++;
            hosts.add(u.host);
            log.warn(`external request to ${u.host}. this should not happen`);
          }
        } catch {
          /* data: urls etc */
        }
      }
    };

    account(performance.getEntriesByType('resource'));
    let obs: PerformanceObserver | undefined;
    try {
      obs = new PerformanceObserver((l) => account(l.getEntries()));
      obs.observe({ type: 'resource', buffered: false });
    } catch {
      log.warn('PerformanceObserver unavailable, request count will be stale');
    }

    kernel.container.value(PERF, {
      fps() {
        if (!times.length) return 0;
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        return avg > 0 ? Math.min(240, Math.round(1000 / avg)) : 0;
      },
      frameTimes: () => times,
      requests: () => ({ total, external, hosts: [...hosts] }),
    });

    return () => {
      cancelAnimationFrame(raf);
      obs?.disconnect();
    };
  },
};
