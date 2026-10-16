/*
 * shell grammar, roughly:
 *
 *   list      := pipeline ((';' | '&&' | '||') pipeline)*
 *   pipeline  := command ('|' command)* redirect?
 *   redirect  := ('>' | '>>') word
 *   command   := word+
 *
 * quoting: '...' literal, "..." with $VAR expansion, backslash escapes outside single quotes.
 * no subshells, no globbing, no here-docs. if you need those open a real terminal
 */

export type Op = '|' | ';' | '&&' | '||' | '>' | '>>';

export type Tok = { t: 'word'; v: string } | { t: 'op'; v: Op };

export interface SimpleCommand {
  argv: string[];
}

export interface Pipeline {
  commands: SimpleCommand[];
  redirect?: { path: string; append: boolean };
}

export interface ListItem {
  pipeline: Pipeline;
  /** operator that joins this item to the PREVIOUS one */
  join: ';' | '&&' | '||' | null;
}

export class ParseError extends Error {}

export function tokenize(src: string, env: Record<string, string> = {}): Tok[] {
  const out: Tok[] = [];
  let buf = '';
  let inWord = false;
  let i = 0;

  const flush = () => {
    if (inWord) out.push({ t: 'word', v: buf });
    buf = '';
    inWord = false;
  };

  const expandVar = (): string => {
    // at src[i] === '$'
    i++;
    if (src[i] === '?') {
      i++;
      return env['?'] ?? '0';
    }
    let name = '';
    if (src[i] === '{') {
      const end = src.indexOf('}', i);
      if (end < 0) throw new ParseError('bad substitution');
      name = src.slice(i + 1, end);
      i = end + 1;
    } else {
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i]!)) name += src[i++];
    }
    if (!name) return '$';
    return env[name] ?? '';
  };

  while (i < src.length) {
    const c = src[i]!;

    if (c === ' ' || c === '\t') {
      flush();
      i++;
      continue;
    }

    if (c === '#' && !inWord) break; // comment

    if (c === "'") {
      const end = src.indexOf("'", i + 1);
      if (end < 0) throw new ParseError('unterminated quote');
      buf += src.slice(i + 1, end);
      inWord = true;
      i = end + 1;
      continue;
    }

    if (c === '"') {
      inWord = true;
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && (src[i + 1] === '"' || src[i + 1] === '\\' || src[i + 1] === '$')) {
          buf += src[i + 1];
          i += 2;
        } else if (src[i] === '$') {
          buf += expandVar();
        } else {
          buf += src[i++];
        }
      }
      if (src[i] !== '"') throw new ParseError('unterminated quote');
      i++;
      continue;
    }

    if (c === '\\') {
      if (i + 1 < src.length) buf += src[i + 1];
      inWord = true;
      i += 2;
      continue;
    }

    if (c === '$') {
      buf += expandVar();
      inWord = true;
      continue;
    }

    // operators. longest match first
    const two = src.slice(i, i + 2);
    if (two === '&&' || two === '||' || two === '>>') {
      flush();
      out.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    if (c === '|' || c === ';' || c === '>') {
      flush();
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '&') throw new ParseError('background jobs not supported');

    buf += c;
    inWord = true;
    i++;
  }
  flush();
  return out;
}

export function parse(toks: Tok[]): ListItem[] {
  const items: ListItem[] = [];
  let i = 0;
  let join: ListItem['join'] = null;

  const peek = () => toks[i];

  while (i < toks.length) {
    const pipeline: Pipeline = { commands: [] };
    let argv: string[] = [];

    while (i < toks.length) {
      const tk = peek()!;
      if (tk.t === 'word') {
        argv.push(tk.v);
        i++;
      } else if (tk.v === '|') {
        if (!argv.length) throw new ParseError("syntax error near unexpected token `|'");
        pipeline.commands.push({ argv });
        argv = [];
        i++;
      } else if (tk.v === '>' || tk.v === '>>') {
        const target = toks[i + 1];
        if (!target || target.t !== 'word') throw new ParseError('syntax error: expected filename');
        pipeline.redirect = { path: target.v, append: tk.v === '>>' };
        i += 2;
      } else break; // ; && ||
    }

    if (argv.length) pipeline.commands.push({ argv });
    if (!pipeline.commands.length) {
      const tk = peek();
      throw new ParseError(`syntax error near unexpected token \`${tk ? tk.v : 'newline'}'`);
    }
    items.push({ pipeline, join });

    const sep = peek();
    if (sep && sep.t === 'op') {
      join = sep.v as ListItem['join'];
      i++;
      // trailing ';' is fine, trailing && is not
      if (i >= toks.length && join !== ';') throw new ParseError('syntax error: unexpected end of input');
    }
  }
  return items;
}
