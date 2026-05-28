/** Diferir trabajo pesado para no bloquear el cambio de pestaña. */

let idleGeneration = 0;

/** Invalida callbacks pendientes de scheduleIdle (p. ej. al cambiar de pestaña). */
export function cancelDeferredIdleWork() {
  idleGeneration += 1;
  return idleGeneration;
}

export function scheduleAfterPaint(fn) {
  if (typeof fn !== 'function') return;
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function () {
      requestAnimationFrame(fn);
    });
    return;
  }
  setTimeout(fn, 0);
}

export function scheduleIdle(fn, timeoutMs) {
  if (typeof fn !== 'function') return;
  const gen = idleGeneration;
  const timeout = timeoutMs == null ? 150 : timeoutMs;
  const run = function () {
    if (gen !== idleGeneration) return;
    fn();
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: timeout });
    return;
  }
  setTimeout(run, 0);
}
