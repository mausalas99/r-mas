/** Read a store from a Preact component: the component redraws when the value changes. */
import { useEffect, useState } from 'preact/hooks';

/** @template T @param {{ get(): T, subscribe(fn: (v: T) => void): () => void }} store @returns {T} */
export function useStore(store) {
  const [value, setValue] = useState(store.get());
  useEffect(() => {
    setValue(store.get());
    return store.subscribe(setValue);
  }, [store]);
  return value;
}
