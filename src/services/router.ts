import type { Module } from '@core/kernel';

/*
 * hash router. #/proj -> tag 2 etc. hash and not history api because github pages has no
 * rewrites and the 404.html trick is gross.
 */

export function tagFromHash(hash: string, tags: { id: number; name: string }[]): number | null {
  const seg = hash.replace(/^#\/?/, '').split('/')[0]?.toLowerCase() ?? '';
  if (!seg) return null;
  const n = Number(seg);
  if (Number.isInteger(n) && tags.some((t) => t.id === n)) return n;
  return tags.find((t) => t.name === seg)?.id ?? null;
}

export const routerModule: Module = {
  name: 'routed',
  description: 'maps #/tag urls to workspaces',
  init({ kernel }) {
    const tags = kernel.config.wm.tags;
    let syncing = false;

    const fromHash = () => {
      const id = tagFromHash(location.hash, tags);
      if (id !== null) {
        syncing = true;
        kernel.store.set({ tag: id });
        syncing = false;
      }
    };

    const off = kernel.store.select(
      (s) => s.tag,
      (id) => {
        if (syncing) return;
        const name = tags.find((t) => t.id === id)?.name ?? String(id);
        // replaceState so back button isn't 40 entries of tag switching
        history.replaceState(null, '', id === 1 ? location.pathname + location.search : `#/${name}`);
      },
    );

    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => {
      off();
      window.removeEventListener('hashchange', fromHash);
    };
  },
};
