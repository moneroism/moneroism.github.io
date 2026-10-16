import { token } from '@core/container';
import type { Module } from '@core/kernel';

/*
 * keybindings. combos are strings like "Mod+Shift+2". Mod resolves to config.wm.mod.
 * matching is on event.code for digits/letters so shift+2 doesn't turn into "@" on us
 * (and keyboard layouts don't matter. learned that one the hard way on a german keyboard)
 */

export interface Combo {
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string; // normalised: "1", "j", "enter", "escape"...
}

export interface Binding {
  combo: string;
  desc: string;
  /** fire even if focus is in an input */
  global?: boolean;
  run(e: KeyboardEvent): void;
}

export interface Keys {
  bind(b: Binding): () => void;
  list(): readonly Binding[];
}

export const KEYS = token<Keys>('keys');

export function parseCombo(s: string): Combo {
  const parts = s.split('+').map((p) => p.trim().toLowerCase());
  const key = parts.pop() ?? '';
  const has = (m: string) => parts.includes(m);
  return {
    mod: has('mod'),
    ctrl: has('ctrl') || has('control'),
    alt: has('alt'),
    shift: has('shift'),
    meta: has('meta') || has('super'),
    key: key === 'return' ? 'enter' : key === 'esc' ? 'escape' : key,
  };
}

export function eventKey(e: Pick<KeyboardEvent, 'code' | 'key'>): string {
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5);
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  return e.key.toLowerCase();
}

export function matches(
  c: Combo,
  e: Pick<KeyboardEvent, 'code' | 'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>,
  mod: 'Alt' | 'Meta' | 'Control',
): boolean {
  const want = {
    ctrl: c.ctrl || (c.mod && mod === 'Control'),
    alt: c.alt || (c.mod && mod === 'Alt'),
    meta: c.meta || (c.mod && mod === 'Meta'),
    shift: c.shift,
  };
  return (
    e.ctrlKey === want.ctrl &&
    e.altKey === want.alt &&
    e.metaKey === want.meta &&
    e.shiftKey === want.shift &&
    eventKey(e) === c.key
  );
}

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export const keysModule: Module = {
  name: 'keyd',
  description: 'keybindings (dwl-ish, Mod = Alt by default)',
  init({ kernel }) {
    const bindings: (Binding & { parsed: Combo })[] = [];
    const mod = kernel.config.wm.mod;

    kernel.container.value(KEYS, {
      bind(b) {
        const entry = { ...b, parsed: parseCombo(b.combo) };
        bindings.push(entry);
        return () => {
          const i = bindings.indexOf(entry);
          if (i >= 0) bindings.splice(i, 1);
        };
      },
      list: () => bindings,
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const editable = isEditable(e.target);
      for (const b of bindings) {
        // plain keys (no modifiers) never fire while typing
        const hasMods = b.parsed.mod || b.parsed.ctrl || b.parsed.alt || b.parsed.meta;
        if (editable && !b.global && !hasMods) continue;
        if (matches(b.parsed, e, mod)) {
          e.preventDefault();
          b.run(e);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  },
};
