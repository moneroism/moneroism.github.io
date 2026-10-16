import { h } from '@core/dom';
import { profile } from '@/content/profile';
import { BANNER } from '@/content/banner';
import type { WinDef } from '@ui/wm/types';

export const aboutWindow = (): WinDef => ({
  id: 'about',
  title: '~/about.txt',
  tag: 1,
  order: 0,
  cls: 'win-about',
  create(kernel) {
    const cmd = (line: string, label = line) =>
      h('button', { class: 'cmdlink', type: 'button', onclick: () => kernel.bus.emit('term:exec', { line }) }, label);

    return h(
      'article',
      { class: 'about prose' },
      h('pre', { class: 'banner', 'aria-label': profile.handle }, BANNER),
      h('p', { class: 'tagline' }, `// ${profile.tagline}`),
      ...profile.bio.map((p, i) => h('p', { class: i === profile.bio.length - 1 ? 'shout' : '' }, p)),
      h('h2', null, 'principles'),
      h(
        'dl',
        { class: 'kv' },
        ...profile.principles.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]),
      ),
      h('h2', null, 'this site'),
      h(
        'ul',
        { class: 'dash' },
        h('li', null, profile.thisSite[0]),
        h('li', null, profile.thisSite[1]),
        h('li', null, "don't believe it? run ", cmd('telemetry'), ' or ', cmd('smoke audit'), '.'),
      ),
      h(
        'p',
        { class: 'muted small' },
        'see ',
        h('a', { href: '#/proj' }, 'projects'),
        ', or press ',
        h('kbd', null, '2'),
        '. ',
        h('kbd', null, '5'),
        ' for keybindings.',
      ),
    );
  },
});
