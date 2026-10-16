type Handler<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(type: K, fn: Handler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => this.off(type, fn);
  }

  once<K extends keyof Events>(type: K, fn: Handler<Events[K]>): () => void {
    const off = this.on(type, (p) => {
      off();
      fn(p);
    });
    return off;
  }

  off<K extends keyof Events>(type: K, fn: Handler<Events[K]>) {
    this.handlers.get(type)?.delete(fn as Handler<never>);
  }

  emit<K extends keyof Events>(type: K, ...[payload]: Events[K] extends void ? [] : [Events[K]]) {
    const set = this.handlers.get(type);
    if (!set) return;
    // copy, handlers may unsubscribe while we iterate
    for (const fn of [...set]) {
      try {
        (fn as Handler<Events[K]>)(payload as Events[K]);
      } catch (e) {
        console.error(`[bus] handler for "${String(type)}" threw`, e);
      }
    }
  }

  /** for tests */
  listenerCount(type: keyof Events) {
    return this.handlers.get(type)?.size ?? 0;
  }
}
