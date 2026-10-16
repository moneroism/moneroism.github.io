import type { Kernel } from '@core/kernel';
import type { Vfs } from '@/fs/vfs';
import { FsError } from '@/fs/vfs';
import { colors, stripAnsi } from './ansi';
import { parse, ParseError, tokenize, type Pipeline } from './parser';
import type { Registry } from './registry';
import { ExitError, type Ctx, type TermApi } from './types';
import type { Prefs } from '@/services/storage';

export interface ShellOpts {
  kernel: Kernel;
  fs: Vfs;
  registry: Registry;
  prefs: Prefs;
  user: string;
  host: string;
}

export class Shell {
  cwd: string;
  env: Record<string, string>;
  history: string[];
  readonly registry: Registry;
  readonly fs: Vfs;
  private kernel: Kernel;
  private prefs: Prefs;
  private maxHistory: number;

  constructor(o: ShellOpts) {
    this.kernel = o.kernel;
    this.fs = o.fs;
    this.registry = o.registry;
    this.prefs = o.prefs;
    this.cwd = o.fs.home;
    this.maxHistory = o.kernel.config.term.historySize;
    this.env = {
      USER: o.user,
      HOME: o.fs.home,
      HOSTNAME: o.host,
      SHELL: '/bin/msh',
      PWD: this.cwd,
      TERM: 'xterm-256color', // lies
      PATH: '/bin',
      '?': '0',
    };
    this.history = o.prefs.get<string[]>('history', []);
  }

  prompt(): string {
    const home = this.fs.home;
    const w = this.cwd === home ? '~' : this.cwd.startsWith(home + '/') ? '~' + this.cwd.slice(home.length) : this.cwd;
    return this.kernel.config.term.prompt
      .replace(/\\u/g, this.env.USER ?? '')
      .replace(/\\h/g, this.env.HOSTNAME ?? '')
      .replace(/\\w/g, w);
  }

  private pushHistory(line: string) {
    if (!line.trim() || line.startsWith(' ')) return; // HISTCONTROL=ignorespace, like a real one
    if (this.history[this.history.length - 1] === line) return;
    this.history.push(line);
    if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
    this.prefs.set('history', this.history);
  }

  clearHistory() {
    this.history = [];
    this.prefs.remove('history');
  }

  /**
   * run a full line. stdout of the last stage + all stderr goes to `write`.
   * returns exit status of the last pipeline.
   */
  async exec(
    line: string,
    term: TermApi,
    write: (s: string, stream: 'out' | 'err') => void,
    opts: { history?: boolean } = {},
  ): Promise<number> {
    // !! history expansion. only !!, not !n or !str. scope creep stops here
    if (line.includes('!!')) {
      const last = this.history[this.history.length - 1];
      if (!last) {
        write('msh: !!: event not found\n', 'err');
        return 1;
      }
      line = line.replace(/!!/g, last);
      write(line + '\n', 'out');
    }
    if (opts.history !== false) this.pushHistory(line);

    let items;
    try {
      items = parse(tokenize(line, this.env));
    } catch (e) {
      if (e instanceof ParseError) {
        write(`msh: ${e.message}\n`, 'err');
        this.env['?'] = '2';
        return 2;
      }
      throw e;
    }

    let status = 0;
    for (const item of items) {
      if (item.join === '&&' && status !== 0) continue;
      if (item.join === '||' && status === 0) continue;
      status = await this.runPipeline(item.pipeline, term, write);
      this.env['?'] = String(status);
    }
    return status;
  }

  private async runPipeline(
    p: Pipeline,
    term: TermApi,
    write: (s: string, stream: 'out' | 'err') => void,
  ): Promise<number> {
    let stdin: string | null = null;
    let status = 0;

    for (let i = 0; i < p.commands.length; i++) {
      const { argv } = p.commands[i]!;
      const last = i === p.commands.length - 1;
      const isatty = last && !p.redirect;
      const name = argv[0]!;
      const cmd = this.registry.get(name);

      if (!cmd) {
        write(`msh: ${name}: command not found\n`, 'err');
        status = 127;
        stdin = '';
        continue;
      }

      let buf = '';
      const ctx: Ctx = {
        argv,
        args: argv.slice(1),
        stdin,
        isatty,
        c: colors(isatty),
        out: (s) => {
          if (isatty) write(s.endsWith('\n') ? s : s + '\n', 'out');
          else buf += s.endsWith('\n') ? s : s + '\n';
        },
        err: (s) => write(`${name}: ${s}\n`, 'err'),
        shell: this,
        kernel: this.kernel,
        fs: this.fs,
        term,
      };

      try {
        const r = await cmd.run(ctx);
        status = typeof r === 'number' ? r : 0;
      } catch (e) {
        if (e instanceof ExitError) {
          ctx.err(e.message);
          status = e.code;
        } else if (e instanceof FsError) {
          ctx.err(e.message);
          status = 1;
        } else {
          ctx.err(`internal error: ${(e as Error).message}`);
          this.kernel.logger.log('err', 'msh', `${name} crashed: ${(e as Error).stack ?? e}`);
          status = 70;
        }
      }
      stdin = isatty ? null : stripAnsi(buf);
    }

    if (p.redirect && stdin !== null) {
      const abs = this.fs.resolve(p.redirect.path, this.cwd);
      try {
        if (abs !== '/dev/null') this.fs.write(abs, stdin, p.redirect.append);
      } catch (e) {
        write(`msh: ${(e as Error).message}\n`, 'err');
        return 1;
      }
    }
    return status;
  }

  /** tab completion. returns [replacement candidates, the token being completed] */
  complete(line: string): { token: string; options: string[] } {
    const m = /(\S*)$/.exec(line);
    const token = m?.[1] ?? '';
    const before = line.slice(0, line.length - token.length);
    const isCmd = !before.trim() || /(\||;|&&|\|\|)\s*$/.test(before);
    if (isCmd) return { token, options: this.registry.completions(token) };
    return { token, options: this.fs.complete(token, this.cwd) };
  }
}
