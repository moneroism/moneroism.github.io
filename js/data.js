// all the text on the site lives here. the page and the terminal both read from it.

export const profile = {
  handle: 'moneroism',
  taglines: ['free software enjoyer', 'no telemetry. ever.', 'verify, don\'t trust', 'privacy is not a crime'],
  bio: [
    'free software enjoyer. i write code in my free time, mostly low-level stuff nobody asked for.',
    'the goal is simple: less surveillance. no telemetry, no tracking, no "anonymous usage statistics". software should do what you told it to and nothing else. if it phones home, it\'s spyware with a nicer logo.',
  ],
  principles: [
    ['free software', 'as in freedom. GPL wherever i can.'],
    ['read the source', "if i can't read it, i don't trust it."],
    ['local first', 'your data stays on your machine.'],
    ['verify', 'check the signature. check the hash.'],
    ['less code', 'less code, less attack surface.'],
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
      'linux-hardened kernel configured per machine, signed modules, lockdown',
      'musl, busybox, sinit — as little code as possible',
      'every source verified: pinned sha256 + upstream gpg signatures',
      'wayland only (dwl + foot), no X11, no d-bus',
      'own build tool (cigbuild) and package manager (smoke) with `smoke audit`',
    ],
  },
  {
    id: 'hashcheck',
    name: 'hashcheck',
    tagline: 'tiny cli that checks a downloaded file against an expected sha-256.',
    lang: 'Python',
    status: 'early',
    url: 'https://github.com/moneroism/hashcheck',
    points: ['reads the file in chunks, compares hashes, warns on mismatch', 'one script, no dependencies'],
  },
  {
    id: 'site',
    name: 'moneroism.github.io',
    tagline: 'this website. static html/css/js, zero dependencies, zero trackers.',
    lang: 'HTML · CSS · JS',
    status: 'live',
    url: 'https://github.com/moneroism/moneroism.github.io',
    points: ["CSP blocks every outgoing connection", 'press ` for the terminal'],
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
