/*
 * dependency injection container.
 * yes, for a personal website. it started as a joke and then it was actually useful for tests.
 */

export interface Token<T> {
  readonly key: symbol;
  readonly __type?: T; // phantom, never set
}

export const token = <T>(name: string): Token<T> => ({ key: Symbol(name) });

type Factory<T> = (c: Container) => T;

interface Entry<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class Container {
  private entries = new Map<symbol, Entry<unknown>>();
  private resolving = new Set<symbol>();

  constructor(private parent?: Container) {}

  register<T>(t: Token<T>, factory: Factory<T>, opts: { singleton?: boolean } = {}): this {
    this.entries.set(t.key, { factory, singleton: opts.singleton ?? true });
    return this;
  }

  value<T>(t: Token<T>, v: T): this {
    this.entries.set(t.key, { factory: () => v, singleton: true, instance: v });
    return this;
  }

  resolve<T>(t: Token<T>): T {
    const e = this.entries.get(t.key) as Entry<T> | undefined;
    if (!e) {
      if (this.parent) return this.parent.resolve(t);
      throw new Error(`container: nothing registered for ${t.key.description}`);
    }
    if (e.singleton && 'instance' in e && e.instance !== undefined) return e.instance;
    if (this.resolving.has(t.key)) {
      throw new Error(`container: circular dependency at ${t.key.description}`);
    }
    this.resolving.add(t.key);
    try {
      const inst = e.factory(this);
      if (e.singleton) e.instance = inst;
      return inst;
    } finally {
      this.resolving.delete(t.key);
    }
  }

  has(t: Token<unknown>): boolean {
    return this.entries.has(t.key) || !!this.parent?.has(t);
  }

  child(): Container {
    return new Container(this);
  }
}
