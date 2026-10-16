import { h, clear } from '@core/dom';
import { collect, exposure } from '@/services/fingerprint';
import type { WinDef } from '@ui/wm/types';

export const fingerprintWindow = (): WinDef => ({
  id: 'fingerprint',
  title: 'what this page can see',
  tag: 4,
  order: 1,
  create() {
    const tbody = h('tbody');
    const score = h('span', { class: 'score' });
    const render = () => {
      const rows = collect();
      clear(tbody);
      for (const r of rows) {
        tbody.append(h('tr', { class: `w${r.weight}` }, h('th', null, r.key), h('td', null, r.value)));
      }
      score.textContent = `${exposure(rows)}/100`;
    };
    render();
    // viewport changes on resize, keep it honest
    window.addEventListener('resize', render, { passive: true }); // FIXME: never removed. window lives forever anyway

    return h(
      'div',
      { class: 'prose' },
      h(
        'p',
        { class: 'small' },
        'any site can read this without asking. this one reads it only to show you, right here. it is not stored and it is not sent: ',
        h('code', null, "connect-src 'none'"),
        '.',
      ),
      h('table', { class: 'tbl fp' }, tbody),
      h('p', { class: 'small muted' }, 'exposure (made-up score): ', score, '. canvas/webgl/audio fingerprinting left out on purpose. demonstrating it means doing it.'),
    );
  },
});
