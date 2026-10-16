import type { Kernel } from '@core/kernel';
import type { Vfs } from '@/fs/vfs';
import type { Colors } from './ansi';
import type { Shell } from './shell';

/** what a command can do to the terminal it's running in, beyond writing text */
export interface TermApi {
  clear(): void;
  /** close the terminal window (exit) */
  close(): void;
  /** append an arbitrary node. only use when stdout is a tty */
  node(n: Node): void;
  cols(): number;
}

export interface Ctx {
  argv: string[];
  /** argv minus argv[0] */
  args: string[];
  stdin: string | null;
  isatty: boolean;
  c: Colors;
  out(s: string): void;
  err(s: string): void;
  shell: Shell;
  kernel: Kernel;
  fs: Vfs;
  term: TermApi;
}

export interface Command {
  name: string;
  aliases?: string[];
  summary: string;
  usage?: string;
  man?: string;
  /** not listed in help (easter eggs) */
  hidden?: boolean;
  run(ctx: Ctx): number | void | Promise<number | void>;
}

export class ExitError extends Error {
  constructor(
    public code: number,
    msg: string,
  ) {
    super(msg);
  }
}

/** throw from a command for "cmd: msg" + exit status */
export const fail = (msg: string, code = 1): never => {
  throw new ExitError(code, msg);
};
