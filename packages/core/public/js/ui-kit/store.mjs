/**
 * Tiny shared store: one value, readable and writable from old DOM modules and from Preact
 * components alike. Plain JS (no Preact import) so HF/Neumo can vendor it.
 * Not for lists of records: use it for UI state that two modules must agree on.
 *
 * @template T
 * @param {T} initial
 * @returns {{ get(): T, set(next: T | ((prev: T) => T)): void, subscribe(fn: (v: T) => void): () => void }}
 */
export function createStore(initial) {
  let value = initial;
  const subs = new Set();
  return {
    get: () => value,
    set(next) {
      const v = typeof next === 'function' ? next(value) : next;
      if (Object.is(v, value)) return;
      value = v;
      for (const fn of [...subs]) fn(value);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
