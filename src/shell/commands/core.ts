import type { Command } from '../types';
import { fail } from '../types';
import { basename } from '@/fs/vfs';

const help: Command = {
  name: 'help',
  summary: 'list commands',
  run({ shell, out, c }) {
    const cmds = shell.registry.all().filter((x) => !x.hidden).sort((a, b) => a.name.localeCompare(b.name));
    const w = Math.max(...cmds.map((x) => x.name.length));
    out(c.dim('builtins. `man <cmd>` for more. pipes, ;, &&, ||, > and >> work.\n'));
    for (const x of cmds) out(`  ${c.accent(x.name.padEnd(w))}  ${x.summary}`);
    out(c.dim('\nthere are also some that aren\'t listed.'));
  },
};

const man: Command = {
  name: 'man',
  summary: 'manual pages',
  usage: 'man <command>',
  run({ args, shell, out, c }) {
    const name = args[0];
    if (!name) fail('What manual page do you want?\nFor example, try \'man man\'.');
    const cmd = shell.registry.get(name!);
    if (!cmd) fail(`No manual entry for ${name}`, 16);
    const title = `${cmd!.name.toUpperCase()}(1)`;
    out(`${title}${' '.repeat(Math.max(1, 40 - title.length * 2))}msh manual${' '.repeat(6)}${title}\n`);
    out(c.bold('NAME'));
    out(`       ${cmd!.name} - ${cmd!.summary}\n`);
    out(c.bold('SYNOPSIS'));
    out(`       ${cmd!.usage ?? cmd!.name}\n`);
    if (cmd!.aliases?.length) {
      out(c.bold('ALIASES'));
      out(`       ${cmd!.aliases.join(', ')}\n`);
    }
    out(c.bold('DESCRIPTION'));
    out(
      (cmd!.man ?? 'no further documentation. read the source.')
        .split('\n')
        .map((l) => '       ' + l)
        .join('\n'),
    );
  },
};

const echo: Command = {
  name: 'echo',
  summary: 'print arguments',
  usage: 'echo [-n] [-e] [string...]',
  run({ args, out }) {
    let s = args.filter((a) => a !== '-n' && a !== '-e').join(' ');
    if (args.includes('-e')) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\e\[/g, '\x1b[');
    // -n is accepted and ignored because out() always ends lines. close enough
    out(s);
  },
};

const clear: Command = {
  name: 'clear',
  aliases: ['cls'],
  summary: 'clear the screen (also ctrl+l)',
  run: ({ term }) => term.clear(),
};

const pwd: Command = {
  name: 'pwd',
  summary: 'print working directory',
  run: ({ shell, out }) => out(shell.cwd),
};

const cd: Command = {
  name: 'cd',
  summary: 'change directory',
  usage: 'cd [dir]',
  run({ args, shell, fs }) {
    const target = args[0] === '-' ? (shell.env.OLDPWD ?? shell.cwd) : (args[0] ?? '~');
    const abs = fs.resolve(target, shell.cwd);
    const n = fs.stat(abs);
    if (n.type !== 'dir') fail(`${target}: Not a directory`);
    shell.env.OLDPWD = shell.cwd;
    shell.cwd = abs;
    shell.env.PWD = abs;
  },
};

const ls: Command = {
  name: 'ls',
  aliases: ['dir'],
  summary: 'list directory',
  usage: 'ls [-a] [-l] [path...]',
  run({ args, shell, fs, out, c, isatty }) {
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const all = flags.includes('a');
    const long = flags.includes('l');
    const paths = args.filter((a) => !a.startsWith('-'));
    if (!paths.length) paths.push('.');

    for (const p of paths) {
      const abs = fs.resolve(p, shell.cwd);
      const node = fs.stat(abs);
      const entries = node.type === 'dir' ? fs.list(abs) : [node];
      if (paths.length > 1) out(`${p}:`);
      const shown = entries.filter((e) => all || !e.name.startsWith('.'));
      if (long) {
        for (const e of shown) {
          const size = e.type === 'file' ? (typeof e.content === 'string' ? e.content.length : 0) : 4096;
          const perm = (e.type === 'dir' ? 'd' : '-') + (e.readonly ? 'r--r--r--' : 'rw-r--r--');
          const d = new Date(e.mtime);
          const date = d.toLocaleString('en', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
          const nm = e.type === 'dir' ? c.blue(c.bold(e.name)) : e.name;
          out(`${perm} 1 ${shell.env.USER} ${shell.env.USER} ${String(size).padStart(5)} ${date} ${nm}`);
        }
      } else if (isatty) {
        out(shown.map((e) => (e.type === 'dir' ? c.blue(c.bold(e.name)) + '/' : e.name)).join('  ') || '');
      } else {
        // one per line when piped, like the real one
        shown.forEach((e) => out(e.name));
      }
    }
  },
};

const cat: Command = {
  name: 'cat',
  summary: 'print files',
  usage: 'cat [file...]',
  run({ args, stdin, shell, fs, out }) {
    if (!args.length) {
      if (stdin !== null) out(stdin.replace(/\n$/, ''));
      return;
    }
    let status = 0;
    for (const f of args) {
      const abs = fs.resolve(f, shell.cwd);
      const content = fs.read(abs);
      if (content === '' && basename(abs).endsWith('.txt')) {
        // contact.txt / donate.txt are empty for now, be honest about it
        out(`(${basename(abs)} is empty. nothing here yet.)`);
        status = 0;
        continue;
      }
      out(content);
    }
    return status;
  },
};

const history: Command = {
  name: 'history',
  summary: 'command history (stored locally only)',
  usage: 'history [-c]',
  run({ args, shell, out }) {
    if (args[0] === '-c') return shell.clearHistory();
    shell.history.forEach((h, i) => out(`${String(i + 1).padStart(5)}  ${h}`));
  },
};

const env: Command = {
  name: 'env',
  aliases: ['printenv'],
  summary: 'print environment',
  run({ shell, out }) {
    for (const [k, v] of Object.entries(shell.env)) if (k !== '?') out(`${k}=${v}`);
  },
};

const exportCmd: Command = {
  name: 'export',
  summary: 'set environment variable',
  usage: 'export NAME=value',
  run({ args, shell }) {
    for (const a of args) {
      const eq = a.indexOf('=');
      if (eq <= 0) fail(`\`${a}': not a valid identifier`);
      shell.env[a.slice(0, eq)] = a.slice(eq + 1);
    }
  },
};

const which: Command = {
  name: 'which',
  aliases: ['type'],
  summary: 'locate a command',
  run({ args, shell, out }) {
    let st = 0;
    for (const a of args) {
      if (shell.registry.get(a)) out(`/bin/${shell.registry.get(a)!.name}`);
      else st = 1;
    }
    return st;
  },
};

const trueCmd: Command = { name: 'true', summary: 'do nothing, successfully', hidden: true, run: () => 0 };
const falseCmd: Command = { name: 'false', summary: 'do nothing, unsuccessfully', hidden: true, run: () => 1 };

const exit: Command = {
  name: 'exit',
  aliases: ['logout'],
  summary: 'close the terminal',
  run: ({ term }) => term.close(),
};

export default [help, man, echo, clear, pwd, cd, ls, cat, history, env, exportCmd, which, trueCmd, falseCmd, exit];
