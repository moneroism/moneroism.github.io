/*
 * in-memory fs for the terminal. files are either strings or generators (for /proc and friends).
 * no permissions model beyond "readonly". no symlinks. no inodes. it's a website.
 */

export type FileContent = string | (() => string);

export interface FileNode {
  type: 'file';
  name: string;
  content: FileContent;
  readonly?: boolean;
  mtime: number;
}

export interface DirNode {
  type: 'dir';
  name: string;
  children: Map<string, Node>;
  readonly?: boolean;
  mtime: number;
}

export type Node = FileNode | DirNode;

export class FsError extends Error {
  constructor(
    public path: string,
    public reason: string,
  ) {
    super(`${path}: ${reason}`);
  }
}

export const ENOENT = 'No such file or directory';
export const ENOTDIR = 'Not a directory';
export const EISDIR = 'Is a directory';
export const EROFS = 'Read-only file system';
export const EEXIST = 'File exists';

/** pure path normalisation. no fs access. */
export function normalize(path: string, cwd = '/', home = '/'): string {
  if (path === '~' || path.startsWith('~/')) path = home + path.slice(1);
  const abs = path.startsWith('/') ? path : `${cwd}/${path}`;
  const out: string[] = [];
  for (const seg of abs.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return '/' + out.join('/');
}

export const basename = (p: string) => p.split('/').filter(Boolean).pop() ?? '/';
export const dirname = (p: string) => {
  const parts = p.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
};

export const dir = (name: string, kids: Node[] = [], readonly = false): DirNode => ({
  type: 'dir',
  name,
  readonly,
  mtime: Date.now(),
  children: new Map(kids.map((k) => [k.name, k])),
});

export const file = (name: string, content: FileContent, readonly = true): FileNode => ({
  type: 'file',
  name,
  content,
  readonly,
  mtime: Date.now(),
});

export class Vfs {
  constructor(
    public root: DirNode,
    public home = '/',
  ) {}

  resolve(path: string, cwd = '/') {
    return normalize(path, cwd, this.home);
  }

  lookup(abs: string): Node | null {
    let node: Node = this.root;
    for (const seg of abs.split('/').filter(Boolean)) {
      if (node.type !== 'dir') return null;
      const next = node.children.get(seg);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  stat(abs: string): Node {
    const n = this.lookup(abs);
    if (!n) throw new FsError(abs, ENOENT);
    return n;
  }

  read(abs: string): string {
    const n = this.stat(abs);
    if (n.type === 'dir') throw new FsError(abs, EISDIR);
    return typeof n.content === 'function' ? n.content() : n.content;
  }

  list(abs: string): Node[] {
    const n = this.stat(abs);
    if (n.type !== 'dir') throw new FsError(abs, ENOTDIR);
    return [...n.children.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private parentOf(abs: string): DirNode {
    const parent = this.lookup(dirname(abs));
    if (!parent) throw new FsError(abs, ENOENT);
    if (parent.type !== 'dir') throw new FsError(abs, ENOTDIR);
    if (parent.readonly) throw new FsError(abs, EROFS);
    return parent;
  }

  write(abs: string, data: string, append = false) {
    const existing = this.lookup(abs);
    if (existing?.type === 'dir') throw new FsError(abs, EISDIR);
    if (existing?.readonly) throw new FsError(abs, EROFS);
    if (existing) {
      const prev = append ? this.read(abs) : '';
      existing.content = prev + data;
      existing.mtime = Date.now();
      return;
    }
    const parent = this.parentOf(abs);
    parent.children.set(basename(abs), file(basename(abs), data, false));
  }

  mkdir(abs: string) {
    if (this.lookup(abs)) throw new FsError(abs, EEXIST);
    const parent = this.parentOf(abs);
    parent.children.set(basename(abs), dir(basename(abs)));
  }

  rm(abs: string) {
    const n = this.stat(abs);
    if (n.readonly) throw new FsError(abs, EROFS);
    if (n.type === 'dir' && n.children.size) throw new FsError(abs, 'Directory not empty');
    this.parentOf(abs).children.delete(basename(abs));
  }

  /** paths under `abs` matching a prefix. for tab completion */
  complete(partial: string, cwd: string): string[] {
    const slash = partial.lastIndexOf('/');
    const dirPart = slash >= 0 ? partial.slice(0, slash + 1) : '';
    const namePart = slash >= 0 ? partial.slice(slash + 1) : partial;
    const abs = this.resolve(dirPart || '.', cwd);
    const n = this.lookup(abs);
    if (!n || n.type !== 'dir') return [];
    return [...n.children.values()]
      .filter((c) => c.name.startsWith(namePart) && (namePart.startsWith('.') || !c.name.startsWith('.')))
      .map((c) => dirPart + c.name + (c.type === 'dir' ? '/' : ''))
      .sort();
  }
}
