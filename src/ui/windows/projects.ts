import { h, clear } from '@core/dom';
import { projects, findProject, type Project, type Section } from '@/content/projects';
import type { WinDef } from '@ui/wm/types';

const statusClass = (s: Project['status']) => `status status-${s}`;

export const projectListWindow = (): WinDef => ({
  id: 'projects',
  title: '~/projects',
  tag: 2,
  order: 0,
  create(kernel) {
    const rows = projects.map((p) =>
      h(
        'li',
        null,
        h(
          'button',
          {
            class: 'proj-row',
            type: 'button',
            dataset: { id: p.id },
            onclick: () => kernel.store.set({ project: p.id }),
          },
          h('span', { class: 'proj-perm' }, 'drwxr-xr-x'),
          h('span', { class: 'proj-name' }, p.name + '/'),
          h('span', { class: statusClass(p.status) }, p.version ? `${p.status} ${p.version}` : p.status),
          h('span', { class: 'proj-lang' }, p.lang),
          h('span', { class: 'proj-sum' }, p.summary),
        ),
      ),
    );
    const sync = (id: string) =>
      rows.forEach((r) => r.firstElementChild!.classList.toggle('is-sel', (r.firstElementChild as HTMLElement).dataset.id === id));
    kernel.store.select((s) => s.project, sync);
    sync(kernel.store.get().project);

    return h(
      'div',
      { class: 'projlist' },
      h('p', { class: 'muted small' }, `total ${projects.length}`),
      h('ul', { class: 'proj-rows', role: 'list' }, ...rows),
      h(
        'p',
        { class: 'muted small' },
        'more on ',
        h('a', { href: 'https://github.com/moneroism', target: '_blank', rel: 'noopener noreferrer' }, 'github'),
        '.',
      ),
    );
  },
});

function renderSection(s: Section): Node[] {
  switch (s.kind) {
    case 'p':
      return [h('p', null, ...inlineCode(s.text))];
    case 'list':
      return [
        ...(s.title ? [h('h3', null, s.title)] : []),
        h('ul', { class: 'dash' }, ...s.items.map((i) => h('li', null, ...inlineCode(i)))),
      ];
    case 'table':
      return [
        ...(s.title ? [h('h3', null, s.title)] : []),
        h('table', { class: 'tbl' }, h('tbody', null, ...s.rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v))))),
      ];
    case 'code':
      return [h('pre', { class: 'code' }, s.text)];
  }
}

// `foo` -> <code>foo</code>. that's the whole markdown implementation
function inlineCode(text: string): (string | HTMLElement)[] {
  return text.split(/(`[^`]+`)/).map((part) => (part.startsWith('`') && part.endsWith('`') ? h('code', null, part.slice(1, -1)) : part));
}

export const projectDetailWindow = (): WinDef => ({
  id: 'project',
  title: 'README',
  tag: 2,
  order: 1,
  create(kernel, win) {
    const root = h('article', { class: 'prose project' });
    const render = (id: string) => {
      const p = findProject(id) ?? projects[0]!;
      win.setTitle(`~/projects/${p.id}/README`);
      clear(root);
      root.append(
        h('h1', null, p.name),
        h(
          'p',
          { class: 'meta' },
          h('span', { class: statusClass(p.status) }, p.version ? `${p.status} ${p.version}` : p.status),
          ` ${p.lang}`,
          p.license ? ` · ${p.license}` : '',
          ' · ',
          h('a', { href: p.url, target: '_blank', rel: 'noopener noreferrer' }, p.url.replace('https://', '')),
        ),
        h('p', { class: 'lede' }, p.summary),
        ...p.details.flatMap(renderSection),
      );
      root.parentElement?.scrollTo(0, 0);
    };
    kernel.store.select((s) => s.project, render);
    render(kernel.store.get().project);
    return root;
  },
});
