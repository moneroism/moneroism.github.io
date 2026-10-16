import buildInfo from 'virtual:build-info';
import { h } from '@core/dom';
import { KEYS } from '@/services/keys';
import type { WinDef } from '@ui/wm/types';

export const helpWindow = (): WinDef => ({
  id: 'help',
  title: 'man 7 moneroism',
  tag: 5,
  order: 0,
  create(kernel) {
    const mod = kernel.config.wm.mod;
    const binds = kernel
      .get(KEYS)
      .list()
      .filter((b) => b.desc)
      // collapse Mod+1..Mod+5 into one row
      .filter((b) => !/^Mod\+[2-9]$/.test(b.combo))
      .map((b) => (b.combo === 'Mod+1' ? { ...b, combo: 'Mod+[1-5]', desc: 'view tag (plain 1-5 work too)' } : b));

    const fmt = (c: string) => c.replace('Mod', mod).split('+').map((k, i) => [i ? '+' : '', h('kbd', null, k)]);

    return h(
      'article',
      { class: 'prose' },
      h('h2', null, 'NAME'),
      h('p', null, 'moneroism.github.io - a personal website pretending to be a desktop'),
      h('h2', null, 'KEYBINDINGS'),
      h('table', { class: 'tbl' }, h('tbody', null, ...binds.map((b) => h('tr', null, h('th', null, ...fmt(b.combo)), h('td', null, b.desc))))),
      h('h2', null, 'TERMINAL'),
      h('p', null, 'type ', h('code', null, 'help'), '. tab completes, arrows walk history, ', h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'L'), ' clears. history stays in your browser.'),
      h('h2', null, 'PRIVACY'),
      h('p', null, 'no cookies. no analytics. no third-party anything. localStorage keeps your theme and shell history and nothing else, and you can wipe it with ', h('code', null, 'history -c'), ' or by clearing site data.'),
      h('h2', null, 'URL FLAGS'),
      h('p', null, h('code', null, '?crt=0'), ' disable the crt toggle. ', h('code', null, '?debug=1'), ' more logging.'),
      h('h2', null, 'SEE ALSO'),
      h('p', null, h('a', { href: kernel.config.site.repo, target: '_blank', rel: 'noopener noreferrer' }, 'source'), ' (GPL-3.0-or-later)'),
      h('h2', null, 'VERSION'),
      h('p', { class: 'muted' }, `${buildInfo.version} (${buildInfo.commit}), built ${buildInfo.builtAt.slice(0, 10)}`),
    );
  },
});
