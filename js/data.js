// all the text on the site lives here. the page and the terminal both read from it.

export const profile = {
  handle: 'moneroism',
  taglines: ['free software enjoyer', 'privacy is not a crime', "verify, don't trust", 'software without telemetry'],
  bio: [
    'i write free software in my spare time, mostly low-level stuff.',
    'i care about privacy. software should do what you ask and nothing else, without telemetry or tracking.',
  ],
};

export const projects = [
  {
    id: 'cig',
    name: 'cig',
    tagline: 'a minimal, hardened GNU/Linux distribution built from source.',
    lang: 'C · sh',
    status: 'beta 0.2.1',
    url: 'https://github.com/moneroism/cig',
    featured: true,
    points: [
      'linux-hardened kernel, configured per machine',
      'musl, busybox, sinit',
      'sources pinned by sha256 and checked against upstream signatures',
      'wayland (dwl + foot), no X11',
      'own build tool and package manager',
    ],
  },
  {
    id: 'hashcheck',
    name: 'hashcheck',
    tagline: 'checks a file against an expected sha-256 hash.',
    lang: 'Python',
    status: 'early',
    url: 'https://github.com/moneroism/hashcheck',
    points: ['single script, no dependencies'],
  },
  {
    id: 'site',
    name: 'moneroism.github.io',
    tagline: 'this website.',
    lang: 'HTML · CSS · JS',
    status: 'live',
    url: 'https://github.com/moneroism/moneroism.github.io',
    points: ['plain html/css/js', 'press ` for a terminal'],
  },
];

// fill these in later. empty = "nothing here yet"
export const contact = [
  // { label: 'email', value: 'me@example.org', href: 'mailto:me@example.org' },
];

export const donate = {
  xmr: '', // monero address
};

export const github = 'https://github.com/moneroism';
