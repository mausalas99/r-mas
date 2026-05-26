/** Diferir trabajo pesado para no bloquear el cambio de pestaña. */

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
  var timeout = timeoutMs == null ? 150 : timeoutMs;
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: timeout });
    return;
  }
  setTimeout(fn, 0);
}
