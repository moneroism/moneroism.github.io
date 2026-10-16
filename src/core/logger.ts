import { ktime } from '@/utils/misc';

export type Level = 'debug' | 'info' | 'ok' | 'warn' | 'err';

export interface LogEntry {
  t: number;
  level: Level;
  facility: string;
  msg: string;
}

type Sink = (e: LogEntry) => void;

/** ring buffer. dmesg reads from here. nothing ever leaves the tab */
export class Logger {
  private buf: LogEntry[] = [];
  private sinks = new Set<Sink>();

  constructor(private capacity = 512) {}

  log(level: Level, facility: string, msg: string) {
    const e: LogEntry = { t: performance.now(), level, facility, msg };
    this.buf.push(e);
    if (this.buf.length > this.capacity) this.buf.shift();
    this.sinks.forEach((s) => s(e));
    if (import.meta.env.DEV && level === 'err') console.error(`[${facility}] ${msg}`);
  }

  scope(facility: string) {
    return {
      debug: (m: string) => this.log('debug', facility, m),
      info: (m: string) => this.log('info', facility, m),
      ok: (m: string) => this.log('ok', facility, m),
      warn: (m: string) => this.log('warn', facility, m),
      err: (m: string) => this.log('err', facility, m),
    };
  }

  entries(): readonly LogEntry[] {
    return this.buf;
  }

  pipe(sink: Sink): () => void {
    this.sinks.add(sink);
    return () => this.sinks.delete(sink);
  }

  static format(e: LogEntry): string {
    return `${ktime(e.t)} ${e.facility}: ${e.msg}`;
  }
}

export type ScopedLogger = ReturnType<Logger['scope']>;
