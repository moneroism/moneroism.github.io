# moneroism.github.io

my website. a tiling wm in a browser tab, because a normal personal page was too easy.

no cookies, no analytics, no cdn, no web fonts. the build injects a CSP with
`connect-src 'none'` and `scripts/telemetry-guard.mjs` fails the build if anything
in `dist/` points at a host that isn't allowlisted.

## dev

```sh
npm ci
npm run dev        # or: make dev
npm run build      # typecheck + build + telemetry guard
npm test
```

url flags: `?crt=0`, `?debug=1` (exposes `window.__kernel`).

## layout

```
build/plugins/   vite plugins (build info, csp, license banner)
scripts/         telemetry-guard
src/core/        di container, event bus, store, "kernel" (module lifecycle, pids), logger
src/services/    prefs, theme, keys, router, perf, fingerprint
src/shell/       msh: parser, pipes, commands
src/fs/          the fake filesystem the shell sees
src/ui/          wm, bar, windows
src/content/     the actual text. edit this, not the ui
```

contact/donate are in `src/content/contact.ts`, empty for now.

## license

GPL-3.0-or-later
