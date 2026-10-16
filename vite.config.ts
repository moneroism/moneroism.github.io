import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { buildInfo, csp, licenseBanner } from './build/plugins/index.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': r('./src'),
      '@core': r('./src/core'),
      '@ui': r('./src/ui'),
    },
  },
  plugins: [
    buildInfo(pkg.version),
    csp({
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'self'"],
        // inline style attrs are used all over the wm (grid sizes etc). TODO: move to CSSOM only
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'font-src': ["'self'"],
        // the whole point. nothing goes out.
        'connect-src': ["'none'"],
        'form-action': ["'none'"],
        'base-uri': ["'none'"],
        'manifest-src': ["'self'"],
      },
    }),
    licenseBanner(`moneroism.github.io v${pkg.version} | GPL-3.0-or-later | no telemetry`),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 0,
    reportCompressedSize: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
