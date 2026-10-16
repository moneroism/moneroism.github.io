import type { Command } from '../types';
import { fail } from '../types';

const touch: Command = {
  name: 'touch',
  summary: 'create empty file',
  run({ args, fs, shell }) {
    if (!args.length) fail('missing file operand');
    for (const a of args) {
      const abs = fs.resolve(a, shell.cwd);
      if (!fs.lookup(abs)) fs.write(abs, '');
      else fs.stat(abs).mtime = Date.now();
    }
  },
};

const mkdir: Command = {
  name: 'mkdir',
  summary: 'make directory',
  run({ args, fs, shell }) {
    if (!args.length) fail('missing operand');
    for (const a of args) fs.mkdir(fs.resolve(a, shell.cwd));
  },
};

const rm: Command = {
  name: 'rm',
  summary: 'remove files (only ones you made)',
  usage: 'rm [-r] [-f] file...',
  run({ args, fs, shell, out, c }) {
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const files = args.filter((a) => !a.startsWith('-'));
    if (flags.includes('r') && files.some((f) => fs.resolve(f, shell.cwd) === '/')) {
      // classic
      out(c.red("rm: it is dangerous to operate recursively on '/'"));
      out(c.dim('rm: nice try though. --no-preserve-root is not implemented, on purpose'));
      return 1;
    }
    if (!files.length) fail('missing operand');
    for (const f of files) fs.rm(fs.resolve(f, shell.cwd));
  },
};

export default [touch, mkdir, rm];
