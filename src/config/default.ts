import type { Config } from './schema';

const config: Config = {
  site: {
    handle: 'moneroism',
    hostname: 'cig',
    title: 'moneroism',
    repo: 'https://github.com/moneroism/moneroism.github.io',
  },
  features: {
    crt: true,
    debug: false,
  },
  wm: {
    mod: 'Alt',
    mfact: 0.55,
    tags: [
      { id: 1, name: 'home' },
      { id: 2, name: 'proj' },
      { id: 3, name: 'contact' },
      { id: 4, name: 'sys' },
      { id: 5, name: 'help' },
    ],
  },
  term: {
    historySize: 200,
    // \u user \h host \w cwd. bash style, only these three are supported
    prompt: '\\u@\\h:\\w$ ',
  },
  bar: {
    blocks: ['net', 'fps', 'mem', 'uptime', 'clock'],
  },
};

export default config;
