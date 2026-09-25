import { VITAL_KEYS } from './estado-actual-panel-constants.mjs';

export const REGISTRO_TAB_SKIP_SELECTOR = [
  '[data-ea-vital-add]',
  '[data-ea-altered]',
  '[data-ea-glu-altered]',
  '[data-ea-glu-rescue-units]',
  '[data-ea-glu-post-rescue-value]',
  '[data-ea-glu-remove]',
  '#ea-add-glu',
  '#ea-add-bomba',
  '#ea-bomba-enabled',
  '[data-ea-io-turno-nc]',
  '.ea-registro-paste-btn',
].join(',');

/** @param {HTMLElement | null} form */
export function applyRegistroTabSkipAttributes(form) {
  if (!form) return;
  form.querySelectorAll(REGISTRO_TAB_SKIP_SELECTOR).forEach(function (el) {
    el.setAttribute('tabindex', '-1');
  });
}

/**
 * Visible value spine for Tab.
 * @param {HTMLElement} form
 * @returns {HTMLElement[]}
 */
export function getRegistroTabSpineElements(form) {
  /** @type {HTMLElement[]} */
  var out = [];
  var recorded = form.querySelector('#ea-recorded-at');
  if (recorded) out.push(/** @type {HTMLElement} */ (recorded));

  VITAL_KEYS.forEach(function (key) {
    var stack = form.querySelector('[data-ea-vital-stack="' + key + '"]');
    if (!stack) return;
    var count = Math.max(1, Number(stack.getAttribute('data-ea-layer-count') || '1'));
    var input = stack.querySelector(
      '[data-ea-vital="' + key + '"][data-ea-layer-idx="' + (count - 1) + '"]'
    );
    if (input && isFocusableVisible_(input)) out.push(/** @type {HTMLElement} */ (input));
  });

  var bombaOn = form.querySelector('#ea-bomba-enabled');
  var useBomba = bombaOn && /** @type {HTMLInputElement} */ (bombaOn).checked;
  var list = form.querySelector(useBomba ? '#ea-bomba-list' : '#ea-glu-list');
  if (list) {
    var fields = useBomba
      ? ['[data-ea-bomba-time]', '[data-ea-bomba-value]', '[data-ea-bomba-units]']
      : ['[data-ea-glu-time]:not([type="hidden"])', '[data-ea-glu-value]'];
    list.querySelectorAll(useBomba ? '.ea-bomba-row' : '.ea-glu-row').forEach(function (row) {
      fields.forEach(function (sel) {
        var el = row.querySelector(sel);
        if (el && isFocusableVisible_(el)) out.push(/** @type {HTMLElement} */ (el));
      });
    });
  }

  [
    'ea-io-ing-t1',
    'ea-io-ing-t2',
    'ea-io-ing-t3',
    'ea-io-egr-t1',
    'ea-io-egr-t2',
    'ea-io-egr-t3',
    'ea-io-evac',
  ].forEach(function (id) {
    var el = form.querySelector('#' + id);
    if (el && isFocusableVisible_(el)) out.push(/** @type {HTMLElement} */ (el));
  });
  return out;
}

/** @param {Element} el */
function isFocusableVisible_(el) {
  if (!el || typeof el.getAttribute !== 'function') return false;
  if (el.closest && el.closest('[hidden]')) return false;
  var style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
  return true;
}

/**
 * @param {HTMLElement} form
 * @param {HTMLElement} current
 * @param {1|-1} dir
 * @returns {HTMLElement | null}
 */
export function moveRegistroTabFocus(form, current, dir) {
  var spine = getRegistroTabSpineElements(form);
  var idx = spine.indexOf(current);
  if (idx < 0) {
    idx = dir === 1 ? -1 : spine.length;
  }
  var next = spine[idx + dir];
  if (!next) return null;
  if (typeof next.focus === 'function') next.focus();
  return next;
}

/**
 * @param {HTMLElement} form
 * @param {KeyboardEvent} ev
 */
export function handleRegistroTabKeydown(form, ev) {
  if (ev.key !== 'Tab') return;
  var t = /** @type {HTMLElement | null} */ (ev.target);
  if (!t || !form.contains(t)) return;
  var spine = getRegistroTabSpineElements(form);
  var onSpine = spine.indexOf(t) >= 0;
  var onSkip = t.matches && t.matches(REGISTRO_TAB_SKIP_SELECTOR);
  if (!onSpine && !onSkip) return;
  ev.preventDefault();
  moveRegistroTabFocus(form, t, ev.shiftKey ? -1 : 1);
}
