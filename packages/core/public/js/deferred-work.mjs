/** Diferir trabajo pesado para no bloquear el cambio de pestaña. */

let idleGeneration = 0;
let afterPaintGeneration = 0;
let trailingGeneration = 0;
/** @type {ReturnType<typeof setTimeout>|null} */
let trailingTimer = null;

/** Invalida callbacks pendientes de scheduleIdle / scheduleAfterPaint / scheduleTrailing. */
export function cancelDeferredIdleWork() {
  idleGeneration += 1;
  afterPaintGeneration += 1;
  trailingGeneration += 1;
  if (trailingTimer != null) {
    clearTimeout(trailingTimer);
    trailingTimer = null;
  }
  return idleGeneration;
}

export function scheduleAfterPaint(fn) {
  if (typeof fn !== 'function') return;
  const gen = afterPaintGeneration;
  const run = function () {
    if (gen !== afterPaintGeneration) return;
    fn();
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function () {
      requestAnimationFrame(run);
    });
    return;
  }
  setTimeout(run, 0);
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

/** Paint first (INP), then run fn on idle so a cold chart cannot steal the frame. */
export function scheduleAfterPaintThenIdle(fn, timeoutMs) {
  if (typeof fn !== 'function') return;
  scheduleAfterPaint(function () {
    scheduleIdle(fn, timeoutMs);
  });
}

/**
 * Coalesce bursts (census ↑/↓). Highlight stays on the key; heavy work waits.
 * @param {number} [delayMs]
 */
export function scheduleTrailing(fn, delayMs) {
  if (typeof fn !== 'function') return;
  if (trailingTimer != null) clearTimeout(trailingTimer);
  const gen = trailingGeneration;
  const delay = delayMs == null ? 120 : delayMs;
  trailingTimer = setTimeout(function () {
    trailingTimer = null;
    if (gen !== trailingGeneration) return;
    fn();
  }, delay);
}
