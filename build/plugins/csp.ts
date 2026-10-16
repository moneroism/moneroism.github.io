import type { Plugin } from 'vite';

export interface CspOptions {
  directives: Record<string, string[]>;
}

const serialize = (d: CspOptions['directives']) =>
  Object.entries(d)
    .map(([k, v]) => (v.length ? `${k} ${v.join(' ')}` : k))
    .join('; ');

/**
 * injects a CSP <meta> on build only. dev needs inline scripts for HMR so it stays off there.
 * github pages can't set headers, so meta is the best we get. (frame-ancestors is ignored in
 * meta, which is why it's not in the list. don't add it back.)
 */
export function csp(opts: CspOptions): Plugin {
  return {
    name: 'mnr:csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: serialize(opts.directives) },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}
