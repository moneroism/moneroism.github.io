import type { Command, Ctx } from '../types';
import { fail } from '../types';

// helpers shared by the text utils. reads files if given, else stdin
function input(ctx: Ctx, files: string[]): string {
  if (files.length) return files.map((f) => ctx.fs.read(ctx.fs.resolve(f, ctx.shell.cwd))).join('\n');
  return ctx.stdin ?? '';
}

const lines = (s: string) => {
  const l = s.split('\n');
  if (l[l.length - 1] === '') l.pop();
  return l;
};

function numFlag(args: string[], def: number): { n: number; rest: string[] } {
  const rest: string[] = [];
  let n = def;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-n') n = Number(args[++i]);
    else if (/^-\d+$/.test(a)) n = Number(a.slice(1));
    else rest.push(a);
  }
  if (!Number.isFinite(n)) fail('invalid number of lines');
  return { n, rest };
}

const grep: Command = {
  name: 'grep',
  summary: 'search text',
  usage: 'grep [-i] [-v] [-n] [-c] pattern [file...]',
  man: 'pattern is a javascript regex, not posix. sue me.',
  run(ctx) {
    const flags = new Set<string>();
    const rest: string[] = [];
    for (const a of ctx.args) {
      if (/^-[ivnc]+$/.test(a)) a.slice(1).split('').forEach((f) => flags.add(f));
      else rest.push(a);
    }
    const [pat, ...files] = rest;
    if (pat === undefined) fail('usage: grep [-ivnc] pattern [file...]', 2);
    let re: RegExp;
    try {
      re = new RegExp(pat!, flags.has('i') ? 'i' : '');
    } catch {
      return fail(`invalid regex: ${pat}`, 2);
    }
    const hits: string[] = [];
    lines(input(ctx, files)).forEach((l, i) => {
      if (re.test(l) !== flags.has('v')) {
        const shown = ctx.isatty && !flags.has('v') ? l.replace(new RegExp(re.source, 'g' + re.flags), (m) => ctx.c.red(ctx.c.bold(m))) : l;
        hits.push(flags.has('n') ? `${ctx.c.green(i + 1)}:${shown}` : shown);
      }
    });
    if (flags.has('c')) ctx.out(String(hits.length));
    else hits.forEach((h) => ctx.out(h));
    return hits.length ? 0 : 1;
  },
};

const wc: Command = {
  name: 'wc',
  summary: 'count lines, words, bytes',
  usage: 'wc [-l|-w|-c] [file...]',
  run(ctx) {
    const flag = ctx.args.find((a) => a.startsWith('-'));
    const s = input(
      ctx,
      ctx.args.filter((a) => !a.startsWith('-')),
    );
    const l = (s.match(/\n/g) ?? []).length;
    const w = s.split(/\s+/).filter(Boolean).length;
    const c = new TextEncoder().encode(s).length;
    if (flag === '-l') ctx.out(String(l));
    else if (flag === '-w') ctx.out(String(w));
    else if (flag === '-c') ctx.out(String(c));
    else ctx.out(`${String(l).padStart(7)} ${String(w).padStart(7)} ${String(c).padStart(7)}`);
  },
};

const head: Command = {
  name: 'head',
  summary: 'first lines',
  usage: 'head [-n N] [file...]',
  run(ctx) {
    const { n, rest } = numFlag(ctx.args, 10);
    lines(input(ctx, rest)).slice(0, n).forEach((l) => ctx.out(l));
  },
};

const tail: Command = {
  name: 'tail',
  summary: 'last lines',
  usage: 'tail [-n N] [file...]',
  run(ctx) {
    const { n, rest } = numFlag(ctx.args, 10);
    lines(input(ctx, rest)).slice(-n).forEach((l) => ctx.out(l));
  },
};

const sort: Command = {
  name: 'sort',
  summary: 'sort lines',
  usage: 'sort [-r] [-n] [file...]',
  run(ctx) {
    const r = ctx.args.includes('-r');
    const n = ctx.args.includes('-n');
    const ls = lines(input(ctx, ctx.args.filter((a) => !a.startsWith('-'))));
    ls.sort(n ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (r) ls.reverse();
    ls.forEach((l) => ctx.out(l));
  },
};

const uniq: Command = {
  name: 'uniq',
  summary: 'drop repeated adjacent lines',
  usage: 'uniq [-c]',
  run(ctx) {
    const count = ctx.args.includes('-c');
    const ls = lines(input(ctx, ctx.args.filter((a) => !a.startsWith('-'))));
    let prev: string | undefined;
    let k = 0;
    const emit = () => prev !== undefined && ctx.out(count ? `${String(k).padStart(7)} ${prev}` : prev);
    for (const l of ls) {
      if (l === prev) k++;
      else {
        emit();
        prev = l;
        k = 1;
      }
    }
    emit();
  },
};

const rev: Command = {
  name: 'rev',
  summary: 'reverse lines',
  run(ctx) {
    lines(input(ctx, ctx.args)).forEach((l) => ctx.out([...l].reverse().join('')));
  },
};

const tr: Command = {
  name: 'tr',
  summary: 'translate characters',
  usage: 'tr SET1 SET2',
  man: 'supports a-z style ranges. no classes, no -d, no -s.',
  run(ctx) {
    const [a, b] = ctx.args;
    if (a === undefined || b === undefined) fail('usage: tr SET1 SET2');
    const expand = (s: string) =>
      s.replace(/(.)-(.)/g, (_, x: string, y: string) => {
        let r = '';
        for (let i = x.charCodeAt(0); i <= y.charCodeAt(0); i++) r += String.fromCharCode(i);
        return r;
      });
    const from = expand(a!);
    const to = expand(b!);
    const map = new Map([...from].map((ch, i) => [ch, to[Math.min(i, to.length - 1)] ?? '']));
    ctx.out((ctx.stdin ?? '').replace(/\n$/, '').replace(/./g, (ch) => map.get(ch) ?? ch));
  },
};

const tee: Command = {
  name: 'tee',
  summary: 'copy stdin to file and stdout',
  usage: 'tee [-a] file',
  run(ctx) {
    const append = ctx.args.includes('-a');
    const f = ctx.args.find((a) => !a.startsWith('-'));
    const s = ctx.stdin ?? '';
    if (f) ctx.fs.write(ctx.fs.resolve(f, ctx.shell.cwd), s, append);
    ctx.out(s.replace(/\n$/, ''));
  },
};

export default [grep, wc, head, tail, sort, uniq, rev, tr, tee];
