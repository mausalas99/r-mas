/**
 * ↑ / ↓ walks the visible census. Ignored while typing or inside overlays.
 */

/**
 * Next/prev id in the visible census (pinned → active → archived).
 * Wraps. If current is not in the list, starts at the end matching delta.
 * @param {string[]} ids
 * @param {string|number|null|undefined} currentId
 * @param {number} delta
 * @returns {string|null}
 */
export function nextCensusPatientId(ids, currentId, delta) {
  var list = Array.isArray(ids) ? ids : [];
  if (!list.length) return null;
  var step = Number(delta);
  if (!step) return null;
  var cur = currentId != null ? String(currentId) : '';
  var idx = list.indexOf(cur);
  if (idx < 0) return list[step > 0 ? 0 : list.length - 1];
  var next = idx + step;
  if (next < 0) next = list.length - 1;
  if (next >= list.length) next = 0;
  return list[next];
}

export function censusWalkDeltaForKey(key) {
  if (key === 'ArrowDown') return 1;
  if (key === 'ArrowUp') return -1;
  return 0;
}

function eventTargetElement(target) {
  if (!target) return null;
  return target.nodeType === 3 ? target.parentElement : target;
}

export function isCensusWalkTypingContext(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  var node = eventTargetElement(target);
  if (node && typeof node.closest === 'function') {
    if (node.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) {
      return true;
    }
  }
  var tag = (target.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Palettes, dialogs, and the app tab strip keep their own arrow keys. */
export function isCensusWalkWidgetContext(target) {
  var node = eventTargetElement(target);
  if (!node || typeof node.closest !== 'function') return false;
  return !!node.closest('[role="dialog"], [role="listbox"], [role="menu"], [role="tablist"]');
}

/** @param {Document|{ querySelector?: Function }|null|undefined} root */
export function isCensusWalkOverlayOpen(root) {
  var doc = root || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.querySelector !== 'function') return false;
  if (doc.querySelector('.modal-backdrop.open')) return true;
  var cmdk = doc.querySelector('.cmdk-backdrop');
  return !!(cmdk && !cmdk.hidden);
}

/**
 * @param {{ key?: string, metaKey?: boolean, ctrlKey?: boolean, altKey?: boolean, shiftKey?: boolean, isComposing?: boolean, target?: { tagName?: string, isContentEditable?: boolean, closest?: Function, nodeType?: number, parentElement?: Element|null } }} e
 * @param {{ focusMode?: boolean, root?: Document }} [opts]
 */
export function shouldHandleCensusWalkKeydown(e, opts) {
  if (!e) return false;
  if (e.isComposing) return false;
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return false;
  if (censusWalkDeltaForKey(e.key) === 0) return false;
  if (isCensusWalkTypingContext(e.target)) return false;
  if (isCensusWalkWidgetContext(e.target)) return false;
  if (opts && opts.focusMode) return false;
  if (isCensusWalkOverlayOpen(opts && opts.root)) return false;
  return true;
}

/**
 * @param {KeyboardEvent} e
 * @param {(delta: number) => void} advanceFn
 * @param {{ focusMode?: boolean, root?: Document }} [opts]
 */
export function handleCensusWalkKeydown(e, advanceFn, opts) {
  if (!shouldHandleCensusWalkKeydown(e, opts)) return false;
  var delta = censusWalkDeltaForKey(e.key);
  if (typeof e.preventDefault === 'function') e.preventDefault();
  if (typeof advanceFn === 'function') advanceFn(delta);
  return true;
}
