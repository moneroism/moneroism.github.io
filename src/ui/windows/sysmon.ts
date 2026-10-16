import { h } from '@core/dom';
import { PERF } from '@/services/perf';
import { formatBytes, formatDuration } from '@/utils/misc';
import type { WinDef } from '@ui/wm/types';

/*
 * htop-ish. the cpu "meters" are frame time based because that's the only cpu-ish
 * number a page can see without doing something sketchy. proc list = kernel modules.
 */

const BAR_W = 24;

function meter(label: string, frac: number, text: string) {
  const n = Math.round(Math.min(1, Math.max(0, frac)) * BAR_W);
  return `${label.padStart(4)} [${'|'.repeat(n).padEnd(BAR_W)}${text.padStart(9)}]`;
}

export const sysmonWindow = (): WinDef => {
  let timer: number | undefined;
  let tick: () => void = () => {};

  return {
    id: 'sysmon',
    title: 'htop',
    tag: 4,
    order: 0,
    cls: 'win-mono',
    onShow() {
      clearInterval(timer);
      tick();
      timer = window.setInterval(tick, 1000);
    },
    onHide() {
      clearInterval(timer);
    },
    create(kernel) {
      const meters = h('pre', { class: 'meters' });
      const table = h('pre', { class: 'proctable' });

      tick = () => {
        const perf = kernel.get(PERF);
        const ft = perf.frameTimes();
        const avg = ft.length ? ft.reduce((a, b) => a + b, 0) / ft.length : 16.7;
        const worst = ft.length ? Math.max(...ft) : 16.7;
        const mem = performance.memory;
        const req = perf.requests();
        meters.textContent = [
          meter('frm', avg / 33.3, `${avg.toFixed(1)}ms`),
          meter('jank', worst / 100, `${worst.toFixed(0)}ms`),
          mem ? meter('heap', mem.usedJSHeapSize / mem.jsHeapSizeLimit, formatBytes(mem.usedJSHeapSize)) : meter('heap', 0, 'n/a'),
          meter('net', req.external ? 1 : 0, `${req.external} ext`),
          '',
          `  Tasks: ${kernel.ps().length}, uptime: ${formatDuration(kernel.uptime())}, fps: ${perf.fps()}`,
        ].join('\n');

        const rows = kernel.ps().map((p) => {
          const t = p.state === 'X' ? '--:--' : formatDuration(kernel.uptime() - p.startedAt).slice(3);
          return `${String(p.pid).padStart(5)} ${'mnr'.padEnd(6)} ${p.state}${p.critical ? '<' : ' '} ${t.padStart(6)}  ${p.name}`;
        });
        table.textContent = [`  PID USER   S   TIME+  Command`, ...rows].join('\n');
      };

      return h(
        'div',
        { class: 'sysmon' },
        meters,
        table,
        h('p', { class: 'muted small' }, 'F9 kill → type ', h('code', null, 'kill <pid>'), ' in the terminal. F10 quit → no.'),
      );
    },
  };
};
