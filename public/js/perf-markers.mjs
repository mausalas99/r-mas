export function isPerfEnabled() {
  if (globalThis.__RPLUS_PERF__) return true;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('rplus-perf') === '1';
  } catch (_) {
    return false;
  }
}

export function perfMark(name) {
  if (!isPerfEnabled()) return;
  try {
    performance.mark(name);
  } catch (_) {}
}

export function perfMeasure(name, startMark, endMark) {
  if (!isPerfEnabled()) return;
  try {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name, 'measure');
    const entry = entries[entries.length - 1];
    if (entry) {
      console.log(`[R+ perf] ${name}: ${entry.duration.toFixed(1)}ms`);
    }
  } catch (_) {}
}
