/**
 * Auto-advance rules for form boxes. Pure rules, no DOM.
 *
 * Vitals and glucose: same rule as R+ iOS. A box moves on at once when the
 * typed value cannot grow into another plausible value.
 * Cuarto and cama: 2 or 3 characters, then a short idle pause (no iOS rule for rooms).
 * Registro: moves at once when it reads "0000000-0".
 * Only typed digits move a box. Deleting or pasting never moves it.
 */

/** iOS SignosDraft.plausible. */
export const PLAUSIBLE = {
  tas: [50, 260], tad: [20, 160], fc: [20, 250], fr: [4, 60],
  temp: [30, 45], sat: [50, 100], glucosa: [20, 600],
};

/** Cuarto and cama: allowed lengths. */
export const BOX_LEN_RANGE = { cuarto: [2, 3], cama: [2, 3] };

/** Idle pause before a cuarto or cama box moves on. */
export const BOX_IDLE_MS = 800;

/** Registro box: one expediente, 7 digits, dash, check digit ("0000000-0"). */
const REGISTRO_RE = /^\d{7}-\d$/;

/**
 * iOS rule. Temp needs one decimal. Others: 3 characters, or fewer when ×10 leaves the range.
 * @param {string} key one of PLAUSIBLE keys
 * @param {string} raw
 */
export function isValueComplete(key, raw) {
  const s = String(raw || '').trim();
  if (key === 'temp') return /[.,]\d/.test(s);
  const r = PLAUSIBLE[key];
  const v = Number(s);
  if (!r || !s || !Number.isFinite(v)) return false;
  return s.length >= 3 || (v * 10 > r[1] && v >= r[0]);
}

/**
 * Cuarto, cama or registro value is ready to move on.
 * @param {{ key?: string, value?: string, isRegistro?: boolean }} box
 */
export function isBoxReady(box) {
  const v = String(box.value || '').trim();
  if (box.isRegistro) return REGISTRO_RE.test(v);
  const r = BOX_LEN_RANGE[box.key];
  return !!r && v.length >= r[0] && v.length <= r[1];
}

let idleTimer = null;

/**
 * Move focus from el to next. Call on every input event in the box.
 * ready false cancels a pending move. idle true waits BOX_IDLE_MS first; a number waits that many ms.
 * @param {HTMLElement} el
 * @param {HTMLElement | null | undefined} next
 * @param {boolean} ready
 * @param {boolean | number} idle
 */
export function boxAdvanceOnInput(el, next, ready, idle) {
  clearTimeout(idleTimer);
  if (!next || !ready) return;
  const go = () => {
    if (document.activeElement === el && next.isConnected && !next.disabled) {
      try { next.focus(); } catch (_e) { void _e; }
    }
  };
  if (idle) idleTimer = setTimeout(go, idle === true ? BOX_IDLE_MS : idle);
  else go();
}

/** Typed text only. Deletes and pastes never advance. */
export function isTypedInput(e) {
  return /^insert/.test(String(e.inputType || ''));
}
