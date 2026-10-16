import { h } from '@core/dom';
import { contact, donate } from '@/content/contact';
import type { WinDef } from '@ui/wm/types';

export const contactWindow = (): WinDef => ({
  id: 'contact',
  title: '~/contact.txt',
  tag: 3,
  order: 0,
  create() {
    const empty = (what: string) => h('p', { class: 'empty' }, h('span', { class: 'muted' }, `$ cat ${what}`), h('br'), `(empty. nothing here yet.)`);

    return h(
      'article',
      { class: 'prose' },
      h('h2', null, 'contact'),
      contact.length
        ? h(
            'dl',
            { class: 'kv' },
            ...contact.flatMap((c) => [h('dt', null, c.label), h('dd', null, c.href ? h('a', { href: c.href }, c.value) : c.value)]),
          )
        : empty('contact.txt'),
      h(
        'p',
        { class: 'muted small' },
        'for now: open an issue on ',
        h('a', { href: 'https://github.com/moneroism', target: '_blank', rel: 'noopener noreferrer' }, 'github'),
        '.',
      ),
      h('h2', null, 'donate'),
      donate.xmr
        ? h('div', null, h('p', null, 'monero:'), h('pre', { class: 'code addr' }, donate.xmr))
        : empty('donate.txt'),
      h('p', { class: 'muted small' }, 'no paypal, no patreon, no "buy me a coffee" tracking pixel.'),
    );
  },
});
