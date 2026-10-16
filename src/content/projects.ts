export type Status = 'active' | 'beta' | 'early' | 'archived';

export interface Project {
  id: string;
  name: string;
  summary: string;
  lang: string;
  status: Status;
  version?: string;
  url: string;
  license?: string;
  /** long form, rendered in the detail window and `cat`able in the terminal */
  details: Section[];
}

export type Section =
  | { kind: 'p'; text: string }
  | { kind: 'list'; title?: string; items: string[] }
  | { kind: 'table'; title?: string; rows: [string, string][] }
  | { kind: 'code'; text: string };

export const projects: Project[] = [
  {
    id: 'cig',
    name: 'cig',
    summary: 'a minimal, hardened GNU/Linux distribution built from source.',
    lang: 'C / sh',
    status: 'beta',
    version: '0.2.1',
    url: 'https://github.com/moneroism/cig',
    license: 'GPL-3.0',
    details: [
      {
        kind: 'p',
        text: 'in the spirit of GrapheneOS, but for the PC: as little code as possible, every source verified, nothing running that isn\'t needed, and nothing hardcoded to one machine.',
      },
      {
        kind: 'p',
        text: 'status: 0.2.1 (beta), on the way to 0.3.0. a hybrid ISO boots a live system and the installer installs a system that boots on its own, with its own linux-hardened kernel, signed modules and lockdown, and a wayland desktop. tested in qemu (uefi). not for daily use yet.',
      },
      {
        kind: 'list',
        title: 'principles',
        items: [
          'minimal attack surface: musl, busybox, sinit, samurai. unused features compiled out.',
          'every source verified: pinned sha256, upstream gpg signatures checked against the keys the recipe names.',
          'compiled on the machine: kernel configured for the hardware it runs on; module signing key generated during the build and deleted after.',
          'nothing hardcoded: gpu drivers, kernel drivers, firmware are detected or chosen.',
          'upstream defaults: no theming.',
          'auditable: one inventory says what is installed and why. `smoke audit` checks it.',
        ],
      },
      {
        kind: 'table',
        title: 'design',
        rows: [
          ['kernel', 'linux-hardened 6.18 LTS, configured per machine'],
          ['libc', 'musl'],
          ['userland', 'busybox (no network daemons, no su, no setuid)'],
          ['init', 'sinit + runit applets'],
          ['devices', 'devtmpfs + mdev, libudev-zero, seatd'],
          ['boot', 'EFISTUB, no bootloader'],
          ['admin', 'doas (the only setuid program)'],
          ['packages', 'cigbuild builds, smoke installs'],
          ['desktop', 'wayland: dwl + foot. no X11'],
          ['d-bus', 'none'],
        ],
      },
      {
        kind: 'code',
        text: 'cigbuild pin dwl     # verify upstream signature, pin sha256\ncigbuild build dwl   # fetch + verify + build\nsmoke add -c dwl     # compile on this device and install\nsmoke audit          # check the system against the inventory',
      },
    ],
  },
  {
    id: 'hashcheck',
    name: 'hashcheck',
    summary: 'tiny cli that checks a downloaded file against an expected sha-256.',
    lang: 'Python',
    status: 'early',
    url: 'https://github.com/moneroism/hashcheck',
    details: [
      {
        kind: 'p',
        text: 'reads a file in 8k chunks, hashes it, asks for the expected hash and tells you if they match. if they don\'t, the file may have been tampered with. one script, no deps.',
      },
      { kind: 'code', text: 'python main.py path/to/file' },
      {
        kind: 'p',
        text: 'the terminal on this site has `sha256sum` built in, same idea, runs locally in your browser.',
      },
    ],
  },
  {
    id: 'site',
    name: 'moneroism.github.io',
    summary: 'this website. over-engineered on purpose.',
    lang: 'TypeScript',
    status: 'active',
    url: 'https://github.com/moneroism/moneroism.github.io',
    license: 'GPL-3.0',
    details: [
      {
        kind: 'p',
        text: 'a tiling wm in a browser tab. hand-rolled everything: di container, event bus, module "kernel" with pids, a shell with pipes and a virtual fs. zero runtime dependencies.',
      },
      {
        kind: 'list',
        items: [
          'no external requests. CSP connect-src \'none\'.',
          'build fails if any non-allowlisted host shows up in dist/ (scripts/telemetry-guard.mjs).',
          'works without storage, works without js-heavy effects (prefers-reduced-motion respected).',
        ],
      },
    ],
  },
];

export const findProject = (id: string) => projects.find((p) => p.id === id);
