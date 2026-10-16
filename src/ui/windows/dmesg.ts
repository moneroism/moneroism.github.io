import { h } from '@core/dom';
import { Logger, type LogEntry } from '@core/logger';
import type { WinDef } from '@ui/wm/types';

export const dmesgWindow = (): WinDef => ({
  id: 'dmesg',
  title: 'dmesg -w',
  tag: 4,
  order: 2,
  cls: 'win-mono',
  create(kernel) {
    const pre = h('div', { class: 'dmesg' });
    const line = (e: LogEntry) => {
      pre.append(h('div', { class: `lv-${e.level}` }, Logger.format(e)));
      if (pre.childElementCount > 300) pre.firstElementChild?.remove();
      pre.parentElement?.parentElement?.scrollTo({ top: 1e9 });
    };
    kernel.logger.entries().forEach(line);
    kernel.logger.pipe(line);
    return pre;
  },
});
