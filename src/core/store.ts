type Listener<T> = (state: T, prev: T) => void;

export interface Store<T extends object> {
  get(): T;
  set(patch: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(fn: Listener<T>): () => void;
  select<U>(selector: (s: T) => U, fn: (v: U, prev: U) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();

  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      const prev = state;
      state = { ...state, ...p };
      // shallow equality check, skip notify if nothing actually changed
      let changed = false;
      for (const k in p) {
        if (!Object.is(prev[k], state[k])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      listeners.forEach((l) => l(state, prev));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    select(selector, fn) {
      let last = selector(state);
      const l: Listener<T> = (s) => {
        const next = selector(s);
        if (!Object.is(next, last)) {
          const prev = last;
          last = next;
          fn(next, prev);
        }
      };
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
