import type { Kernel } from '@core/kernel';
import { h } from '@core/dom';
import { parseAnsi } from '@/shell/ansi';
import { Shell } from '@/shell/shell';
import type { TermApi } from '@/shell/types';
import { defaultRegistry } from '@/shell/commands';
import { buildVfs } from '@/fs/tree';
import { PREFS } from '@/services/storage';
import { PERF } from '@/services/perf';
import { isTouch } from '@/utils/misc';
import type { WinDef } from '@ui/wm/types';

const LINK_RE = /\bhttps:\/\/(?:github\.com|codeberg\.org)\/[\w./-]+/g;
const MAX_LINES = 2000;

/** ansi text -> dom, with allowlisted links made clickable */
export function renderAnsi(text: string, stream: 'out' | 'err'): HTMLElement {
  const line = h('div', { class: ['tl', stream === 'err' && 'tl-err'] });
  for (const span of parseAnsi(text)) {
    const el = span.cls.length ? h('span', { class: span.cls }) : line;
    let last = 0;
    for (const m of span.text.matchAll(LINK_RE)) {
      el.append(span.text.slice(last, m.index));
      el.append(h('a', { href: m[0], target: '_blank', rel: 'noopener noreferrer' }, m[0]));
      last = m.index! + m[0].length;
    }
    el.append(span.text.slice(last));
    if (el !== line) line.append(el);
  }
  return line;
}

let _shell: Shell | null = null;
// exported for tests. and for poking at it from devtools, which i do a lot
export const getShell = () => _shell;

export function terminalWindow(): WinDef {
  let input: HTMLInputElement;
  let screen: HTMLElement;

  return {
    id: 'term',
    title: 'msh',
    tag: 1,
    order: 1,
    cls: 'win-term',
    onFocus() {
      // don't pop the keyboard on phones every time you switch tags
      if (!isTouch()) input?.focus({ preventScroll: true });
    },
    create(kernel: Kernel, win) {
      const { handle, hostname: host } = kernel.config.site;
      const registry = defaultRegistry();
      const fs = buildVfs({
        user: handle,
        host,
        uptime: () => kernel.uptime(),
        commands: () => registry.names(true),
        fps: () => (kernel.container.has(PERF) ? kernel.get(PERF).fps() : 0),
      });
      const shell = new Shell({ kernel, fs, registry, prefs: kernel.get(PREFS), user: handle, host });
      _shell = shell;

      screen = h('div', { class: 'term-screen', role: 'log', 'aria-live': 'polite' });
      const promptEl = h('span', { class: 'term-prompt' }, shell.prompt());
      input = h('input', {
        class: 'term-input',
        type: 'text',
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        'aria-label': 'shell input',
        enterkeyhint: 'send',
      });
      const inputLine = h('label', { class: 'term-line' }, promptEl, input);
      const root = h('div', { class: 'term', onclick: () => window.getSelection()?.isCollapsed && input.focus() }, screen, inputLine);

      const write = (s: string, stream: 'out' | 'err') => {
        for (const l of s.replace(/\n$/, '').split('\n')) screen.append(renderAnsi(l, stream));
        while (screen.childElementCount > MAX_LINES) screen.firstElementChild!.remove();
      };

      const scroll = () => {
        root.scrollTop = root.scrollHeight;
      };

      const term: TermApi = {
        clear: () => screen.replaceChildren(),
        close: () => win.close(),
        node: (n) => screen.append(n),
        cols: () => Math.floor(screen.clientWidth / 8.4) || 80, // 8.4 ~ char width at 14px. close enough
      };

      let histIdx = -1;
      let draft = '';
      let busy = false;

      const run = async (line: string) => {
        screen.append(h('div', { class: 'tl tl-cmd' }, h('span', { class: 'term-prompt' }, shell.prompt()), line));
        busy = true;
        inputLine.hidden = true;
        try {
          await shell.exec(line, term, write);
        } catch (e) {
          write(`msh: ${(e as Error).message}`, 'err');
        }
        busy = false;
        inputLine.hidden = false;
        promptEl.textContent = shell.prompt();
        histIdx = -1;
        scroll();
        if (win.isFocused() && !isTouch()) input.focus({ preventScroll: true });
      };

      input.addEventListener('keydown', (e) => {
        if (busy) return;
        if (e.key === 'Enter') {
          const line = input.value;
          input.value = '';
          void run(line);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!shell.history.length) return;
          if (histIdx === -1) {
            draft = input.value;
            histIdx = shell.history.length;
          }
          histIdx = Math.max(0, histIdx - 1);
          input.value = shell.history[histIdx] ?? '';
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (histIdx === -1) return;
          histIdx++;
          if (histIdx >= shell.history.length) {
            histIdx = -1;
            input.value = draft;
          } else input.value = shell.history[histIdx] ?? '';
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const { token, options } = shell.complete(input.value);
          if (options.length === 1) {
            const opt = options[0]!;
            input.value = input.value.slice(0, input.value.length - token.length) + opt + (opt.endsWith('/') ? '' : ' ');
          } else if (options.length > 1) {
            // complete the common prefix, then list
            let pre = options[0]!;
            for (const o of options) while (!o.startsWith(pre)) pre = pre.slice(0, -1);
            if (pre.length > token.length) input.value = input.value.slice(0, input.value.length - token.length) + pre;
            else {
              screen.append(h('div', { class: 'tl tl-cmd' }, h('span', { class: 'term-prompt' }, shell.prompt()), input.value));
              write(options.join('  '), 'out');
              scroll();
            }
          }
        } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
          e.preventDefault();
          term.clear();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'c' && !window.getSelection()?.toString()) {
          e.preventDefault();
          screen.append(h('div', { class: 'tl tl-cmd' }, h('span', { class: 'term-prompt' }, shell.prompt()), input.value + '^C'));
          input.value = '';
          histIdx = -1;
          scroll();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'u') {
          e.preventDefault();
          input.value = '';
        }
      });

      // other parts of the ui can run commands (help window links etc)
      kernel.bus.on('term:exec', ({ line }) => {
        kernel.store.set({ tag: kernel.store.get().tag }); // noop, keeps tag
        void run(line);
      });

      // motd
      write(fs.read('/etc/motd'), 'out');
      write('', 'out');
      void shell.exec('fetch', term, write, { history: false }).then(scroll);

      return root;
    },
  };
}
