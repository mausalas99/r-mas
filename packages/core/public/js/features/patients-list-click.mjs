/** Resolve census card id from click/pointer events (iOS may target text nodes). */

var INTERACTIVE = 'button, a[href], input, textarea, select';

function eventStartNode(ev) {
  if (ev && typeof ev.composedPath === 'function') {
    var path = ev.composedPath();
    if (path && path[0]) return path[0];
  }
  return ev && ev.target;
}

function elementFromNode(node) {
  if (!node) return null;
  if (node.nodeType === 3) return node.parentElement;
  if (typeof node.closest === 'function') return node;
  return node.parentElement || null;
}

/**
 * @param {{ target?: EventTarget, composedPath?: () => EventTarget[] }|null|undefined} ev
 * @returns {string}
 */
export function patientCardIdFromEvent(ev) {
  var el = elementFromNode(eventStartNode(ev));
  if (!el) return '';
  if (el.closest(INTERACTIVE)) return '';
  var card = el.closest('.patient-card[data-patient-id]');
  if (!card) return '';
  return card.getAttribute('data-patient-id') || '';
}

/**
 * Mouse already synthesizes click. Touch/pen often do not when :active transform runs.
 * @param {{ pointerType?: string }|null|undefined} ev
 */
export function shouldHandleTouchPointerUp(ev) {
  var type = ev && ev.pointerType;
  return type === 'touch' || type === 'pen';
}
