import type { Command } from './types';

export class Registry {
  private cmds = new Map<string, Command>();
  private aliases = new Map<string, string>();

  add(...cmds: Command[]): this {
    for (const c of cmds) {
      if (this.cmds.has(c.name)) throw new Error(`registry: duplicate command ${c.name}`);
      this.cmds.set(c.name, c);
      c.aliases?.forEach((a) => this.aliases.set(a, c.name));
    }
    return this;
  }

  get(name: string): Command | undefined {
    return this.cmds.get(name) ?? this.cmds.get(this.aliases.get(name) ?? '');
  }

  names(includeHidden = false): string[] {
    return [...this.cmds.values()]
      .filter((c) => includeHidden || !c.hidden)
      .map((c) => c.name)
      .sort();
  }

  all(): Command[] {
    return [...this.cmds.values()];
  }

  /** names + aliases, for completion */
  completions(prefix: string): string[] {
    return [...this.cmds.keys(), ...this.aliases.keys()].filter((n) => n.startsWith(prefix)).sort();
  }
}
