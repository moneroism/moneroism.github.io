import { describe, expect, it } from 'vitest';
import { parse, tokenize, ParseError } from '../src/shell/parser';
import { normalize } from '../src/fs/vfs';
import { toposort } from '../src/core/toposort';

describe('tokenize', () => {
  it('handles quotes and vars', () => {
    expect(tokenize(`echo 'a $X' "b $X" c\\ d`, { X: 'y' })).toEqual([
      { t: 'word', v: 'echo' },
      { t: 'word', v: 'a $X' },
      { t: 'word', v: 'b y' },
      { t: 'word', v: 'c d' },
    ]);
  });
  it('throws on unterminated quote', () => {
    expect(() => tokenize(`echo "nope`)).toThrow(ParseError);
  });
});

describe('parse', () => {
  it('pipes, lists, redirects', () => {
    const items = parse(tokenize('ls | grep a > out; true && echo ok'));
    expect(items).toHaveLength(3);
    expect(items[0]!.pipeline.commands).toHaveLength(2);
    expect(items[0]!.pipeline.redirect).toEqual({ path: 'out', append: false });
    expect(items[2]!.join).toBe('&&');
  });
  it('rejects leading pipe', () => {
    expect(() => parse(tokenize('| ls'))).toThrow(ParseError);
  });
});

describe('normalize', () => {
  it('resolves ~ and ..', () => {
    expect(normalize('~/a/../b', '/', '/home/m')).toBe('/home/m/b');
    expect(normalize('../../..', '/a')).toBe('/');
  });
});

describe('toposort', () => {
  it('orders deps and detects cycles', () => {
    const n = (id: string, deps: string[] = []) => ({ id, deps });
    expect(toposort([n('b', ['a']), n('a')], (x) => x.id, (x) => x.deps).map((x) => x.id)).toEqual(['a', 'b']);
    expect(() => toposort([n('a', ['b']), n('b', ['a'])], (x) => x.id, (x) => x.deps)).toThrow(/cycle/);
  });
});
