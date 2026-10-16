import { token } from '@core/container';
import type { Kernel, Module } from '@core/kernel';
import { h, $ } from '@core/dom';
import { KEYS } from '@/services/keys';
import { THEMES } from '@/services/theme';
import { clamp } from '@/utils/misc';
import type { Win, WinDef, WinHandle } from './types';

/*
 * the "window manager". dwl-ish: tags instead of workspaces, master/stack tiling, monocle.
 * no floating, no dragging, no resizing beyond mfact. on narrow screens css throws all of
 * this away and just stacks the windows, which is honestly the better ux on a phone.
 */

export interface Wm {
  windows(): Win[];
  focus(id: string): void;
  show(id: string, tag?: number): void;
  close(id: string): void;
  get(id: string): Win | undefined;
  visible(tag?: number): Win[];
  root: HTMLElement;
  barSlot: HTMLElement;
}

export const WM = token<Wm>('wm');

export function createWmModule(defs: WinDef[]): Module {
  return {
    name: 'wm',
    description: 'tiling window manager (not dwl. inspired by dwl.)',
    deps: ['keyd', 'themed', 'routed'],
    critical: true,
    init({ kernel, log }) {
      const app = $('#app');
      if (!app) throw new Error('#app missing');

      const barSlot = h('header', { class: 'bar', role: 'banner' });
      const views = h('main', { class: 'views', id: 'main' });
      const views_by_tag = new Map<number, HTMLElement>();
      for (const t of kernel.config.wm.tags) {
        const v = h('div', { class: 'tagview', dataset: { tag: String(t.id) }, 'aria-label': t.name });
        views_by_tag.set(t.id, v);
        views.append(v);
      }
      app.replaceChildren(barSlot, views);

      const wins = new Map<string, Win>();

      const makeWin = (def: WinDef): Win => {
        const body = h('div', { class: 'win-body' });
        const titleEl = h('span', { class: 'win-title' }, def.title);
        const el = h(
          'section',
          {
            class: ['win', def.cls],
            dataset: { win: def.id },
            'aria-label': def.title,
            onmousedown: () => wm.focus(def.id),
            onfocusin: () => wm.focus(def.id),
          },
          h('div', { class: 'win-head' }, titleEl),
          body,
        );
        const handle: WinHandle = {
          id: def.id,
          el,
          body,
          setTitle(t) {
            titleEl.textContent = t;
            if (kernel.store.get().focused === def.id) kernel.bus.emit('wm:arrange');
          },
          close: () => wm.close(def.id),
          isFocused: () => kernel.store.get().focused === def.id,
        };
        return { def, handle, tag: def.tag, closed: false, mounted: false };
      };

      const arrange = () => {
        const { tag, layout, focused } = kernel.store.get();
        for (const [id, view] of views_by_tag) {
          const active = id === tag;
          view.hidden = !active;
          const vis = visible(id);
          // detach windows that moved away
          for (const w of wins.values()) {
            if ((w.tag !== id || w.closed) && w.handle.el.parentElement === view) w.handle.el.remove();
          }
          vis.forEach((w, i) => {
            if (w.handle.el.parentElement !== view || view.children[i] !== w.handle.el) {
              view.insertBefore(w.handle.el, view.children[i] ?? null);
            }
            if (!w.mounted) {
              w.handle.body.append(w.def.create(kernel, w.handle));
              w.mounted = true;
            }
            w.handle.el.classList.toggle('is-focused', w.def.id === focused);
            w.handle.el.classList.toggle('is-master', i === 0);
            const mono = layout === 'monocle' && vis.length > 1;
            const monoTarget = vis.some((x) => x.def.id === focused) ? focused : vis[0]?.def.id;
            w.handle.el.hidden = mono && w.def.id !== monoTarget;
            w.handle.el.style.gridRow = i === 0 ? `1 / span ${Math.max(1, vis.length - 1)}` : '';
            w.handle.el.style.gridColumn = i === 0 ? '1' : '2';
          });
          view.dataset.count = String(vis.length);
          view.dataset.layout = layout;
          if (active) view.style.setProperty('--mfact', `${(mfact * 100).toFixed(1)}%`);
        }
        kernel.bus.emit('wm:arrange');
      };

      const visible = (tag = kernel.store.get().tag) =>
        [...wins.values()].filter((w) => w.tag === tag && !w.closed).sort((a, b) => a.def.order - b.def.order);

      let mfact = kernel.config.wm.mfact;

      const wm: Wm = {
        root: app,
        barSlot,
        windows: () => [...wins.values()],
        get: (id) => wins.get(id),
        visible,
        focus(id) {
          const w = wins.get(id);
          if (!w || w.closed) return;
          if (kernel.store.get().focused === id) return;
          kernel.store.set({ focused: id });
          w.def.onFocus?.();
        },
        show(id, tag) {
          const w = wins.get(id);
          if (!w) return;
          w.closed = false;
          if (tag !== undefined) w.tag = tag;
          kernel.store.set({ tag: w.tag });
          arrange();
          // focus after arrange so onFocus can touch the dom
          kernel.store.set({ focused: null });
          wm.focus(id);
        },
        close(id) {
          const w = wins.get(id);
          if (!w) return;
          w.closed = true;
          const next = visible()[0];
          kernel.store.set({ focused: next?.def.id ?? null });
          arrange();
        },
      };
      kernel.container.value(WM, wm);

      for (const d of defs) wins.set(d.id, makeWin(d));

      // tag change: focus the master of the new tag, notify show/hide
      let prevTag = kernel.store.get().tag;
      const offTag = kernel.store.select(
        (s) => s.tag,
        (tag) => {
          visible(prevTag).forEach((w) => w.def.onHide?.());
          prevTag = tag;
          const first = visible(tag)[0];
          kernel.store.set({ focused: first?.def.id ?? null });
          arrange();
          visible(tag).forEach((w) => w.def.onShow?.());
          if (first) first.def.onFocus?.();
        },
      );
      const offOther = kernel.store.subscribe((s, p) => {
        if (s.focused !== p.focused || s.layout !== p.layout) arrange();
      });

      // keybindings
      const keys = kernel.get(KEYS);
      const cycle = (dir: 1 | -1) => {
        const vis = visible();
        if (!vis.length) return;
        const i = vis.findIndex((w) => w.def.id === kernel.store.get().focused);
        const next = vis[(i + dir + vis.length) % vis.length]!;
        wm.focus(next.def.id);
      };
      const unbind = [
        ...kernel.config.wm.tags.flatMap((t) => [
          keys.bind({ combo: `Mod+${t.id}`, desc: `view tag ${t.id} (${t.name})`, run: () => kernel.store.set({ tag: t.id }) }),
          // plain digits too, browsers like to eat alt+digit for tab switching
          keys.bind({ combo: `${t.id}`, desc: '', run: () => kernel.store.set({ tag: t.id }) }),
        ]),
        keys.bind({ combo: 'Mod+j', desc: 'focus next window', run: () => cycle(1) }),
        keys.bind({ combo: 'Mod+k', desc: 'focus previous window', run: () => cycle(-1) }),
        keys.bind({
          combo: 'Mod+h',
          desc: 'shrink master',
          run: () => {
            mfact = clamp(mfact - 0.05, 0.2, 0.8);
            arrange();
          },
        }),
        keys.bind({
          combo: 'Mod+l',
          desc: 'grow master',
          run: () => {
            mfact = clamp(mfact + 0.05, 0.2, 0.8);
            arrange();
          },
        }),
        keys.bind({ combo: 'Mod+t', desc: 'tile layout', run: () => kernel.store.set({ layout: 'tile' }) }),
        keys.bind({ combo: 'Mod+m', desc: 'monocle layout', run: () => kernel.store.set({ layout: 'monocle' }) }),
        keys.bind({
          combo: 'Mod+Enter',
          desc: 'terminal (on current tag)',
          global: true,
          run: () => wm.show('term', kernel.store.get().tag),
        }),
        keys.bind({
          combo: 'Mod+Shift+t',
          desc: 'next theme',
          global: true,
          run: () => {
            const i = THEMES.indexOf(kernel.store.get().theme);
            kernel.store.set({ theme: THEMES[(i + 1) % THEMES.length]! });
          },
        }),
        keys.bind({
          combo: 'Mod+Shift+c',
          desc: 'close focused window',
          global: true,
          run: () => {
            const f = kernel.store.get().focused;
            if (f) wm.close(f);
          },
        }),
      ];

      kernel.store.set({ focused: visible()[0]?.def.id ?? null });
      arrange();
      visible().forEach((w) => w.def.onShow?.());
      log.info(`${wins.size} windows on ${views_by_tag.size} tags`);

      return () => {
        offTag();
        offOther();
        unbind.forEach((u) => u());
      };
    },
  };
}
