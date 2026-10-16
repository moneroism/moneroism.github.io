import type { Plugin } from 'vite';

// gpl wants the notice to travel with the code. minifier would strip a normal comment
export function licenseBanner(text: string): Plugin {
  return {
    name: 'mnr:license-banner',
    apply: 'build',
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk' && file.isEntry) {
          file.code = `/*! ${text} */\n` + file.code;
        }
      }
    },
  };
}
