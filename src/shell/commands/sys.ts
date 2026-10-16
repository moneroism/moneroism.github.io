import buildInfo from 'virtual:build-info';
import type { Command } from '../types';
import { fail } from '../types';
import { kernelVersion } from '@/fs/tree';
import { Logger } from '@core/logger';
import { PERF } from '@/services/perf';
import { THEMES, isTheme } from '@/services/theme';
import { collect, exposure } from '@/services/fingerprint';
import { CIG_LOGO } from '@/content/banner';
import { projects, findProject } from '@/content/projects';
import { projectMd } from '@/content/text';
import { donate } from '@/content/contact';
import { formatBytes, formatDuration, ktime } from '@/utils/misc';
import { tagFromHash } from '@/services/router';

const uname: Command = {
  name: 'uname',
  summary: 'system information',
  usage: 'uname [-a|-r|-s|-n|-m]',
  run({ args, out }) {
    const f = args[0] ?? '-s';
    const parts = {
      s: 'Linux',
      n: 'cig',
      r: '6.18.0-hardened1-cig',
      v: `#1 SMP PREEMPT_DYNAMIC ${new Date(buildInfo.builtAt).toUTCString()}`,
      m: 'x86_64',
      o: 'msh',
    };
    if (f === '-a') out(Object.values(parts).join(' '));
    else out(parts[f.replace('-', '') as keyof typeof parts] ?? parts.s);
  },
};

const whoami: Command = {
  name: 'whoami',
  summary: 'print user name',
  run: ({ shell, out }) => out(shell.env.USER ?? 'nobody'),
};

const id: Command = {
  name: 'id',
  summary: 'print user identity',
  run: ({ shell, out }) => {
    const u = shell.env.USER;
    out(`uid=1000(${u}) gid=1000(${u}) groups=1000(${u}),10(wheel),27(video)`);
  },
};

const hostname: Command = {
  name: 'hostname',
  summary: 'print host name',
  run: ({ shell, out }) => out(shell.env.HOSTNAME ?? 'localhost'),
};

const date: Command = {
  name: 'date',
  summary: 'print date',
  usage: 'date [-u] [-I]',
  run({ args, out }) {
    const d = new Date();
    if (args.includes('-I')) out(d.toISOString().slice(0, 10));
    else if (args.includes('-u')) out(d.toUTCString());
    else out(d.toString());
  },
};

const uptime: Command = {
  name: 'uptime',
  summary: 'how long this tab has been open',
  run({ kernel, out }) {
    const now = new Date().toTimeString().slice(0, 8);
    const fps = kernel.get(PERF).fps();
    const l = Math.max(0, (60 - fps) / 60).toFixed(2);
    out(` ${now} up ${formatDuration(kernel.uptime())},  1 user,  load average: ${l}, ${l}, ${l}`);
  },
};

const ps: Command = {
  name: 'ps',
  aliases: ['top', 'htop'],
  summary: 'list "processes" (the site\'s modules)',
  man: 'every module the kernel started gets a pid. kill works on them. some are critical.',
  run({ kernel, out, c }) {
    out(c.bold('  PID STAT     TIME COMMAND'));
    for (const p of kernel.ps()) {
      const t = formatDuration(p.state === 'X' ? 0 : kernel.uptime() - p.startedAt).slice(3);
      const st = p.state === 'Z' ? c.red('Z') : p.state === 'X' ? c.dim('X') : p.state;
      out(`${String(p.pid).padStart(5)} ${st}${p.critical ? '<' : ' '}   ${t.padStart(7)} ${p.name}`);
    }
  },
};

const kill: Command = {
  name: 'kill',
  aliases: ['pkill', 'killall'],
  summary: 'stop a module',
  usage: 'kill [-9] <pid|name>',
  man: 'try killing perfd or idled. things will break a little. reload to fix.',
  run({ args, kernel }) {
    const target = args.find((a) => !a.startsWith('-'));
    if (!target) fail('usage: kill [-9] <pid|name>');
    let pid = Number(target);
    if (!Number.isInteger(pid)) {
      const p = kernel.ps().find((x) => x.name === target && x.state !== 'X');
      if (!p) fail(`(${target}) - No such process`);
      pid = p!.pid;
    }
    if (pid === 1) fail("(1) - Operation not permitted. you can't kill init. nobody can.");
    const r = kernel.kill(pid);
    if (!r.ok) fail(`(${pid}) - ${r.reason}`);
  },
};

const dmesg: Command = {
  name: 'dmesg',
  summary: 'kernel ring buffer',
  usage: 'dmesg [-l level]',
  run({ args, kernel, out, c }) {
    const li = args.indexOf('-l');
    const lvl = li >= 0 ? args[li + 1] : undefined;
    for (const e of kernel.logger.entries()) {
      if (lvl && e.level !== lvl) continue;
      const line = Logger.format(e);
      const colour = e.level === 'err' ? c.red : e.level === 'warn' ? c.yellow : e.level === 'ok' ? c.green : (s: string) => s;
      out(colour(line));
    }
  },
};

const theme: Command = {
  name: 'theme',
  aliases: ['colorscheme'],
  summary: 'change colour scheme',
  usage: `theme [${THEMES.join('|')}]`,
  run({ args, kernel, out, c }) {
    const t = args[0];
    if (!t) {
      const cur = kernel.store.get().theme;
      THEMES.forEach((x) => out(x === cur ? c.accent(`* ${x}`) : `  ${x}`));
      return;
    }
    if (t === 'next') {
      const i = THEMES.indexOf(kernel.store.get().theme);
      kernel.store.set({ theme: THEMES[(i + 1) % THEMES.length]! });
      return;
    }
    if (!isTheme(t)) fail(`unknown theme '${t}'. try: ${THEMES.join(', ')}`);
    kernel.store.set({ theme: t as (typeof THEMES)[number] });
  },
};

const crt: Command = {
  name: 'crt',
  summary: 'toggle scanlines',
  usage: 'crt [on|off]',
  run({ args, kernel, out }) {
    if (!kernel.config.features.crt) fail('disabled at build time (VITE_FEATURE_CRT=0)');
    const v = args[0] === 'on' ? true : args[0] === 'off' ? false : !kernel.store.get().crt;
    kernel.store.set({ crt: v });
    out(`crt ${v ? 'on' : 'off'}`);
  },
};

const open: Command = {
  name: 'open',
  aliases: ['xdg-open'],
  summary: 'switch workspace or open a project',
  usage: 'open <home|proj|contact|sys|help|1-5|project>',
  run({ args, kernel, out }) {
    const a = args[0];
    if (!a) fail('usage: open <tag|project>');
    const p = findProject(a!);
    if (p) {
      kernel.store.set({ project: p.id, tag: 2 });
      return;
    }
    const tag = tagFromHash('#/' + a, kernel.config.wm.tags);
    if (tag !== null) {
      kernel.store.set({ tag });
      return;
    }
    if (/^https:\/\/(github\.com|codeberg\.org)\//.test(a!)) {
      window.open(a, '_blank', 'noopener,noreferrer');
      out(`opened ${a}`);
      return;
    }
    fail(`don't know how to open '${a}'`);
  },
};

const projectsCmd: Command = {
  name: 'projects',
  aliases: ['proj'],
  summary: 'list projects, or show one',
  usage: 'projects [name]',
  run({ args, out, c }) {
    const p = args[0] ? findProject(args[0]) : undefined;
    if (args[0] && !p) fail(`no project '${args[0]}'`);
    if (p) return void out(projectMd(p));
    const w = Math.max(...projects.map((x) => x.id.length));
    for (const x of projects) out(`${c.accent(x.id.padEnd(w))}  ${c.dim(`[${x.status}]`.padEnd(9))} ${x.summary}`);
    out(c.dim('\n`projects <name>` or `cat ~/projects/<name>.md`'));
  },
};

const fetch: Command = {
  name: 'fetch',
  aliases: ['neofetch', 'fastfetch', 'screenfetch'],
  summary: 'system info, with a logo',
  run({ kernel, shell, out, c, isatty }) {
    const perf = kernel.get(PERF);
    const user = `${shell.env.USER}@${shell.env.HOSTNAME}`;
    const mem = performance.memory;
    const info = [
      c.accent(c.bold(user)),
      '-'.repeat(user.length),
      `${c.accent('OS')}: cig (web) ${buildInfo.version}`,
      `${c.accent('Kernel')}: 6.18.0-hardened1-cig`,
      `${c.accent('Uptime')}: ${formatDuration(kernel.uptime())}`,
      `${c.accent('Packages')}: ${kernel.ps().length - 1} (smoke)`,
      `${c.accent('Shell')}: msh`,
      `${c.accent('WM')}: not-dwl`,
      `${c.accent('Theme')}: ${kernel.store.get().theme}`,
      `${c.accent('CPU')}: ${navigator.hardwareConcurrency ?? '?'} threads`,
      `${c.accent('Memory')}: ${mem ? formatBytes(mem.usedJSHeapSize) + ' / ' + formatBytes(mem.jsHeapSizeLimit) : 'not telling'}`,
      `${c.accent('FPS')}: ${perf.fps()}`,
      `${c.accent('Telemetry')}: none`,
      '',
      isatty ? [31, 32, 33, 34, 35, 36, 37].map((n) => `\x1b[${n}m███\x1b[0m`).join('') : '',
    ];
    const logo = CIG_LOGO.split('\n');
    const lw = Math.max(...logo.map((l) => l.length));
    const rows = Math.max(logo.length, info.length);
    for (let i = 0; i < rows; i++) {
      const l = (logo[i - 3] ?? '').padEnd(lw); // -3: vertically center-ish. magic number, sorry
      out(`${c.accent(l)}   ${info[i] ?? ''}`);
    }
  },
};

const telemetry: Command = {
  name: 'telemetry',
  summary: 'what this site collects about you',
  run({ kernel, out, c }) {
    const req = kernel.get(PERF).requests();
    const cookies = document.cookie ? document.cookie.split(';').length : 0;
    const row = (k: string, v: number | string, note = '') =>
      out(`  ${k.padEnd(22)} ${String(v) === '0' ? c.green(v) : c.red(v)}  ${c.dim(note)}`);
    out('telemetry: collecting...');
    row('analytics scripts', 0);
    row('third-party requests', req.external, `(${req.total} requests total, all same-origin)`);
    row('cookies', cookies);
    row('fingerprinting', 0, '(`fingerprint` shows what we *could* read)');
    row('bytes sent', 0, "(CSP connect-src 'none')");
    out(req.external ? c.red('\nsomething leaked. that is a bug, please report it.') : '\ntelemetry: nothing to report. fuck telemetry.');
    return req.external ? 1 : 0;
  },
};

const fingerprint: Command = {
  name: 'fingerprint',
  aliases: ['fp'],
  summary: 'what any site can read about your browser',
  man: 'none of this is stored or sent. it is read when you run the command and printed. that is all.',
  run({ out, c }) {
    const rows = collect();
    for (const r of rows) out(`  ${c.accent(r.key.padEnd(20))} ${r.value}`);
    out(c.dim(`\nexposure score: ${exposure(rows)}/100 (made up, but it goes up when you leak more)`));
    out(c.dim("most sites send all of that somewhere. this one can't."));
  },
};



const sudo: Command = {
  name: 'sudo',
  summary: 'not here',
  hidden: true,
  run: ({ out }) => out("sudo: command not found. cig doesn't ship sudo. try doas (it won't work either)."),
};

const doas: Command = {
  name: 'doas',
  aliases: ['su'],
  summary: 'no',
  hidden: true,
  run: () => fail('Operation not permitted. it\'s a website. nobody gets root. see /etc/doas.conf'),
};

const net: Command = {
  name: 'curl',
  aliases: ['wget', 'ping', 'ssh', 'nc', 'telnet'],
  summary: 'network stuff',
  hidden: true,
  run: ({ argv }) => fail(`${argv[0]}: CSP says connect-src 'none'. this page cannot open a connection. that's the point.`),
};

const editor: Command = {
  name: 'vi',
  aliases: ['vim', 'nvim', 'nano', 'emacs', 'ed'],
  summary: 'no editor',
  hidden: true,
  run: ({ argv }) =>
    fail(argv[0] === 'emacs' ? 'this is a website, not an operating system. oh wait' : 'no editor here. use echo and >>. (and you\'d never exit anyway)'),
};

const sha256sum: Command = {
  name: 'sha256sum',
  aliases: ['sha256'],
  summary: 'hash files or stdin (locally, webcrypto)',
  usage: 'sha256sum [file...] | sha256sum -s <string>',
  man: 'like hashcheck, but in your browser. -s hashes the argument itself.',
  async run({ args, stdin, fs, shell, out }) {
    if (!crypto.subtle) fail('webcrypto needs a secure context (https or localhost)');
    const hash = async (s: string) => {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
    };
    if (args[0] === '-s') return void out(`${await hash(args.slice(1).join(' '))}  -`);
    if (!args.length) return void out(`${await hash(stdin ?? '')}  -`);
    for (const f of args) out(`${await hash(fs.read(fs.resolve(f, shell.cwd)))}  ${f}`);
  },
};

const base64: Command = {
  name: 'base64',
  summary: 'encode/decode base64',
  usage: 'base64 [-d]',
  run({ args, stdin, out }) {
    const s = (stdin ?? args.filter((a) => a !== '-d').join(' ')).replace(/\n$/, '');
    try {
      if (args.includes('-d')) out(new TextDecoder().decode(Uint8Array.from(atob(s.trim()), (ch) => ch.charCodeAt(0))));
      else out(btoa(String.fromCharCode(...new TextEncoder().encode(s))));
    } catch {
      fail('invalid input');
    }
  },
};

const xmr: Command = {
  name: 'xmr',
  aliases: ['donate'],
  summary: 'donate (monero)',
  run({ out, c }) {
    if (!donate.xmr) return void out(c.dim('no address yet. check back later.'));
    out(donate.xmr);
  },
};


const yes: Command = {
  name: 'yes',
  summary: 'y',
  hidden: true,
  run({ args, out }) {
    const s = args.join(' ') || 'y';
    // capped. an infinite loop in the main thread is a bad time
    for (let i = 0; i < 64; i++) out(s);
    out('yes: ok that\'s enough');
  },
};

const smoke: Command = {
  name: 'smoke',
  summary: 'package manager (for the site\'s modules)',
  usage: 'smoke <list|audit|why <pkg>>',
  man: 'named after the cig package manager. list shows modules, audit checks this page for privacy leaks.',
  run({ args, kernel, out, c }) {
    const sub = args[0] ?? 'list';
    const procs = kernel.ps().filter((p) => p.pid !== 1);
    if (sub === 'list') {
      const w = Math.max(...procs.map((p) => p.name.length));
      for (const p of procs) out(`${p.name.padEnd(w)}  ${c.dim(p.critical ? 'explicit ' : 'dependency')}  ${p.state === 'X' ? c.red('(dead)') : ''}`);
      return;
    }
    if (sub === 'why') {
      const p = procs.find((x) => x.name === args[1]);
      if (!p) fail(`${args[1] ?? ''}: not installed`);
      return void out(`${p!.name}: ${p!.description}`);
    }
    if (sub === 'audit') {
      let bad = 0;
      const check = (ok: boolean, what: string) => {
        if (!ok) bad++;
        out(`${ok ? c.green('ok  ') : c.red('FAIL')}  ${what}`);
      };
      const req = kernel.get(PERF).requests();
      check(req.external === 0, `no external requests (${req.total} same-origin)`);
      check(!document.cookie, 'no cookies');
      check(
        import.meta.env.DEV || !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
        import.meta.env.DEV ? 'CSP (skipped in dev)' : 'CSP present',
      );
      check(!document.querySelector('script[src^="http"]'), 'no third-party scripts');
      check(!document.querySelector('link[href^="http"][rel="stylesheet"]'), 'no third-party stylesheets');
      check(!document.querySelector('iframe'), 'no iframes');
      const dead = procs.filter((p) => p.state === 'Z');
      check(!dead.length, dead.length ? `zombie modules: ${dead.map((p) => p.name).join(', ')}` : 'no zombie modules');
      out(bad ? c.red(`\n${bad} problem(s)`) : c.dim('\naudit clean.'));
      return bad ? 1 : 0;
    }
    fail(`unknown subcommand '${sub}'`);
  },
};

const version: Command = {
  name: 'version',
  summary: 'build info',
  run({ out }) {
    out(`moneroism.github.io ${buildInfo.version} (${buildInfo.commit})`);
    out(`built ${buildInfo.builtAt} with node ${buildInfo.node} [${buildInfo.mode}]`);
    out(`${ktime()} ${kernelVersion()}`);
  },
};

export default [
  uname, whoami, id, hostname, date, uptime, ps, kill, dmesg, theme, crt, open, projectsCmd, fetch,
  telemetry, fingerprint, sudo, doas, net, editor, sha256sum, base64, xmr, yes,
  smoke, version,
];
