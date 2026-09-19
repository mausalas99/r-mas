/** Look up a window-published handler by name, without a static import. */
export function resolveGlobalFn(name) {
  if (typeof window !== 'undefined' && typeof window[name] === 'function') {
    return window[name];
  }
  if (typeof globalThis[name] === 'function') return globalThis[name];
  return null;
}
