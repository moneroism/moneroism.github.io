export const profile = {
  handle: 'moneroism',
  tagline: 'free software enjoyer',
  // paragraphs. lowercase on purpose
  bio: [
    'free software enjoyer. i write code in my free time, mostly low-level stuff nobody asked for.',
    'the goal is simple: less surveillance. no telemetry, no tracking, no "anonymous usage statistics", no crash reporter that quietly uploads half your home directory. software should do what you told it to and nothing else. if it phones home, it\'s spyware with a nicer logo.',
    'fuck telemetry.',
  ],
  principles: [
    ['free software', 'as in freedom. GPL wherever i can.'],
    ['read the source', "if i can't read it, i don't trust it."],
    ['local first', 'your data stays on your machine.'],
    ['verify', "check the signature. check the hash. don't just trust the mirror."],
    ['less code', 'less code, less attack surface. small beats clever.'],
  ] as [string, string][],
  // shown in the about window footer
  thisSite: [
    'no cookies, no analytics, no web fonts, no cdn.',
    'a CSP blocks every outgoing connection from this page.',
    'type `telemetry` in the terminal if you don\'t believe me.',
  ],
};
