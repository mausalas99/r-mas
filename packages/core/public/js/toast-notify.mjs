/** Toast through the late-bound `window.showToast` (set by app-shell once ui-toast loads); no-op before that. */
export function notify(msg, type, opts) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') window.showToast(msg, type, opts);
}
