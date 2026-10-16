/*
 * minimal SGR parser. supports: 0 reset, 1 bold, 2 dim, 3 italic, 4 underline, 7 inverse,
 * 30-37 / 90-97 fg, 39 default fg. no 256 colour, no truecolor. colours map to theme vars.
 */

export const ESC = '\x1b[';

const NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

export interface Span {
  text: string;
  cls: string[];
}

// eslint-disable-next-line no-control-regex
const SGR_RE = /\x1b\[([\d;]*)m/g;

export function stripAnsi(s: string) {
  return s.replace(SGR_RE, '');
}

export function parseAnsi(s: string): Span[] {
  const spans: Span[] = [];
  let fg: string | null = null;
  const flags = new Set<string>();
  let last = 0;

  const push = (text: string) => {
    if (!text) return;
    const cls = [...flags];
    if (fg) cls.push(fg);
    spans.push({ text, cls });
  };

  for (const m of s.matchAll(SGR_RE)) {
    push(s.slice(last, m.index));
    last = m.index! + m[0].length;
    const codes = (m[1] || '0').split(';').map(Number);
    for (const c of codes) {
      if (c === 0) {
        fg = null;
        flags.clear();
      } else if (c === 1) flags.add('a-bold');
      else if (c === 2) flags.add('a-dim');
      else if (c === 3) flags.add('a-italic');
      else if (c === 4) flags.add('a-ul');
      else if (c === 7) flags.add('a-inv');
      else if (c >= 30 && c <= 37) fg = 'a-' + NAMES[c - 30];
      else if (c >= 90 && c <= 97) fg = 'a-br-' + NAMES[c - 90];
      else if (c === 39) fg = null;
    }
  }
  push(s.slice(last));
  return spans;
}

/** colour helpers. pass tty=false to get plain text (for pipes) */
export function colors(tty: boolean) {
  const w =
    (code: number) =>
    (s: string | number): string =>
      tty ? `${ESC}${code}m${s}${ESC}0m` : String(s);
  return {
    bold: w(1),
    dim: w(2),
    red: w(31),
    green: w(32),
    yellow: w(33),
    blue: w(34),
    magenta: w(35),
    cyan: w(36),
    accent: w(93), // bright yellow -> mapped to --accent in css. yes it's a lie. it's fine
    inv: w(7),
  };
}

export type Colors = ReturnType<typeof colors>;
