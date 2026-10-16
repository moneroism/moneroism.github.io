import { Container, token, type Token } from './container';
import { EventBus } from './events';
import { Logger, type ScopedLogger } from './logger';
import { createStore, type Store } from './store';
import { toposort } from './toposort';
import type { AppEvents, AppState, ProcState } from './types';
import type { Config } from '@/config/schema';

/*
 * "kernel". owns the container, bus, store, log, and the module lifecycle.
 * modules are services + ui pieces; boot() inits them in dependency order and gives each a pid
 * so `ps` and `kill` in the terminal have something real to look at.
 */

export interface ModuleCtx {
  kernel: Kernel;
  log: ScopedLogger;
}

export interface Module {
  name: string;
  description: string;
  deps?: string[];
  /** kill refuses these */
  critical?: boolean;
  /** may return a teardown fn */
  init(ctx: ModuleCtx): void | (() => void) | Promise<void | (() => void)>;
}

export interface Proc {
  pid: number;
  name: string;
  description: string;
  state: ProcState;
  startedAt: number;
  critical: boolean;
}

export const KERNEL = token<Kernel>('kernel');

export class Kernel {
  readonly container = new Container();
  readonly bus = new EventBus<AppEvents>();
  readonly logger = new Logger();
  readonly store: Store<AppState>;
  readonly bootedAt = performance.now();

  private modules: Module[] = [];
  private procs = new Map<number, Proc>();
  private teardowns = new Map<number, () => void>();
  // pid 1 is sinit, it's fake, everyone knows
  private nextPid = 2;
  private log: ScopedLogger;

  constructor(
    readonly config: Config,
    initial: AppState,
  ) {
    this.store = createStore(initial);
    this.log = this.logger.scope('kernel');
    this.container.value(KERNEL, this);
    this.procs.set(1, {
      pid: 1,
      name: 'sinit',
      description: 'pid 1. reaps zombies, does nothing else',
      state: 'S',
      startedAt: 0,
      critical: true,
    });
  }

  use(mod: Module): this {
    if (this.modules.some((m) => m.name === mod.name)) {
      throw new Error(`kernel: module "${mod.name}" registered twice`);
    }
    this.modules.push(mod);
    return this;
  }

  get<T>(t: Token<T>): T {
    return this.container.resolve(t);
  }

  async boot() {
    const order = toposort(
      this.modules,
      (m) => m.name,
      (m) => m.deps ?? [],
    );
    this.log.info(`starting ${order.length} modules`);

    for (const mod of order) {
      const pid = this.nextPid++;
      const proc: Proc = {
        pid,
        name: mod.name,
        description: mod.description,
        state: 'R',
        startedAt: performance.now(),
        critical: !!mod.critical,
      };
      this.procs.set(pid, proc);
      try {
        const td = await mod.init({ kernel: this, log: this.logger.scope(mod.name) });
        if (typeof td === 'function') this.teardowns.set(pid, td);
        proc.state = 'S';
        this.logger.log('ok', 'runit', `started ${mod.name}`);
      } catch (e) {
        proc.state = 'Z';
        this.logger.log('err', 'runit', `${mod.name} failed: ${(e as Error).message}`);
        if (mod.critical) throw e;
      }
      this.bus.emit('kernel:proc', { pid, name: mod.name, state: proc.state });
    }
    this.log.info(`boot took ${(performance.now() - this.bootedAt).toFixed(1)}ms`);
  }

  ps(): Proc[] {
    return [...this.procs.values()].sort((a, b) => a.pid - b.pid);
  }

  kill(pid: number): { ok: boolean; reason?: string } {
    const p = this.procs.get(pid);
    if (!p || p.state === 'X') return { ok: false, reason: 'no such process' };
    if (p.critical) return { ok: false, reason: 'operation not permitted' };
    try {
      this.teardowns.get(pid)?.();
    } catch (e) {
      this.log.warn(`teardown of ${p.name} threw: ${(e as Error).message}`);
    }
    this.teardowns.delete(pid);
    p.state = 'X';
    this.log.info(`killed ${p.name} (pid ${pid})`);
    this.bus.emit('kernel:proc', { pid, name: p.name, state: 'X' });
    return { ok: true };
  }

  uptime(): number {
    return performance.now() - this.bootedAt;
  }
}
