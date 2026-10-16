import type { Module } from '@core/kernel';
import { h, clear } from '@core/dom';
import { WM } from '@ui/wm/wm';
import { blocks as allBlocks } from './blocks';

export const barModule: Module = {
  name: 'bar',
  description: 'status bar: tags, layout, title, status blocks',
  deps: ['wm', 'perfd'],
  init({ kernel, log }) {
    const wm = kernel.get(WM);
    const { tags } = kernel.config.wm;

    const tagBtns = tags.map((t) =>
      h(
        'button',
        {
          class: 'tag',
          type: 'button',
          title: `${t.name} (Mod+${t.id})`,
          onclick: () => kernel.store.set({ tag: t.id }),
        },
        h('span', { class: 'tag-id' }, String(t.id)),
        h('span', { class: 'tag-name' }, t.name),
      ),
    );

    const layoutBtn = h('button', {
      class: 'layout',
      type: 'button',
      title: 'toggle layout (Mod+t / Mod+m)',
      onclick: () => kernel.store.set({ layout: kernel.store.get().layout === 'tile' ? 'monocle' : 'tile' }),
    });
    const title = h('div', { class: 'bar-title' });
    const status = h('div', { class: 'bar-status', 'aria-live': 'off' });

    const nav = h('nav', { class: 'tags', 'aria-label': 'workspaces' }, ...tagBtns);
    wm.barSlot.append(nav, layoutBtn, title, status);

    const sync = () => {
      const s = kernel.store.get();
      tags.forEach((t, i) => {
        const b = tagBtns[i]!;
        b.classList.toggle('is-active', t.id === s.tag);
        b.classList.toggle('is-occupied', wm.visible(t.id).length > 0);
        b.setAttribute('aria-current', t.id === s.tag ? 'page' : 'false');
      });
      const n = wm.visible().length;
      layoutBtn.textContent = s.layout === 'tile' ? '[]=' : `[${n}]`;
      title.textContent = (s.focused && wm.get(s.focused)?.handle.el.querySelector('.win-title')?.textContent) || '';
    };

    const offBus = kernel.bus.on('wm:arrange', sync);
    const offStore = kernel.store.subscribe(sync);
    sync();

    const timers: number[] = [];
    const names = kernel.config.bar.blocks.filter((n) => {
      if (!allBlocks[n]) log.warn(`unknown block '${n}', skipping`);
      return !!allBlocks[n];
    });
    clear(status);
    for (const name of names) {
      const b = allBlocks[name]!;
      const el = h('span', { class: 'block', dataset: { block: name } });
      status.append(el);
      const tick = () => {
        try {
          const r = b.render(kernel);
          el.textContent = r.text;
          el.hidden = !r.text;
          el.title = r.title ?? '';
          el.classList.toggle('is-warn', !!r.warn);
        } catch (e) {
          el.textContent = `${name}: err`;
          log.err(`${name}: ${(e as Error).message}`);
        }
      };
      tick();
      timers.push(window.setInterval(tick, b.interval));
    }

    return () => {
      offBus();
      offStore();
      timers.forEach(clearInterval);
    };
  },
};
