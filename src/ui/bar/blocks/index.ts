import type { Kernel } from '@core/kernel';
import { PERF } from '@/services/perf';
import { formatBytes, formatDuration, pad } from '@/utils/misc';

/*
 * status blocks, slstatus style. each one renders a short string on an interval.
 * `title` is the hover text. keep them short or the bar wraps on small screens.
 */

export interface Block {
  name: string;
  interval: number;
  render(k: Kernel): { text: string; title?: string; warn?: boolean };
}

const SPARK = '▁▂▃▄▅▆▇█';

export const blocks: Record<string, Block> = {
  net: {
    name: 'net',
    interval: 2000,
    render(k) {
      const r = k.get(PERF).requests();
      return {
        text: `ext ${r.external}`,
        title: `${r.total} requests this session, ${r.external} to other hosts${r.hosts.length ? ': ' + r.hosts.join(', ') : ''}`,
        warn: r.external > 0,
      };
    },
  },
  fps: {
    name: 'fps',
    interval: 500,
    render(k) {
      const p = k.get(PERF);
      const ft = p.frameTimes().slice(-8);
      const spark = ft
        .map((t) => SPARK[Math.min(SPARK.length - 1, Math.max(0, Math.round((t / 33) * (SPARK.length - 1))))])
        .join('');
      return { text: `${spark} ${pad(p.fps(), 3, ' ')}fps`, title: 'frame times, last 8 frames' };
    },
  },
  mem: {
    name: 'mem',
    interval: 3000,
    render() {
      const m = performance.memory;
      return m ? { text: `mem ${formatBytes(m.usedJSHeapSize)}`, title: 'js heap (chromium only)' } : { text: '' };
    },
  },
  uptime: {
    name: 'uptime',
    interval: 1000,
    render: (k) => ({ text: `up ${formatDuration(k.uptime())}`, title: 'time since this tab booted' }),
  },
  clock: {
    name: 'clock',
    interval: 1000,
    render() {
      const d = new Date();
      return { text: `${pad(d.getHours())}:${pad(d.getMinutes())}`, title: d.toDateString() };
    },
  },
};
