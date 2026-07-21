/**
 * Teach wizard page 1 — residual SOME candidates selection.
 */
import { esc } from '../dom-escape.mjs';

/**
 * @param {{ candidates?: object[], coveredCount?: number }} residual
 * @param {{ candidates?: object[] }} state
 */
function syncCandidatesIntoState(residual, state) {
  var incoming = (residual && residual.candidates) || [];
  if (!state.candidates || !state.candidates.length) {
    state.candidates = incoming.map(function (c) {
      return Object.assign({}, c, { selected: c.selected !== false });
    });
    return;
  }
  var byId = Object.create(null);
  state.candidates.forEach(function (c) {
    if (c && c.id != null) byId[c.id] = c;
  });
  state.candidates = incoming.map(function (c) {
    var prev = c.id != null ? byId[c.id] : null;
    return Object.assign({}, c, {
      selected: prev ? !!prev.selected : c.selected !== false,
    });
  });
}

function formatRef(c) {
  if (c.min != null && c.max != null && isFinite(c.min) && isFinite(c.max)) {
    return c.min + ' - ' + c.max;
  }
  return '';
}

function renderCandidateItem(c, idx) {
  var selected = c.selected !== false;
  var ref = formatRef(c);
  return (
    '<label class="lab-panel-teach-some-item' +
    (selected ? ' is-selected' : '') +
    '" data-teach-some-idx="' +
    idx +
    '">' +
    '<input type="checkbox" class="lab-panel-teach-some-cb" data-teach-some-idx="' +
    idx +
    '"' +
    (selected ? ' checked' : '') +
    ' />' +
    '<span class="lab-panel-teach-some-item-label">' +
    esc(c.label || '') +
    (ref
      ? '<span class="lab-panel-teach-some-item-ref"> · ' + esc(ref) + '</span>'
      : '') +
    '</span>' +
    '<span class="lab-panel-teach-some-item-value">' +
    esc(c.value || '') +
    '</span>' +
    '</label>'
  );
}

/**
 * @param {HTMLElement|null} container
 * @param {{ candidates?: object[], coveredCount?: number }} residual
 * @param {{ candidates?: object[] }} state
 */
export function renderTeachSomePage(container, residual, state) {
  if (!container) return;
  syncCandidatesIntoState(residual || {}, state || {});
  var covered = residual && residual.coveredCount != null ? residual.coveredCount : 0;
  var items = (state.candidates || []).map(renderCandidateItem).join('');
  var hint =
    covered > 0
      ? '<p class="lab-panel-teach-hint" style="margin:0 0 8px;padding:0 10px;">' +
        esc(String(covered)) +
        ' estudio(s) ya reconocidos en este pegado.</p>'
      : '';
  var empty =
    !state.candidates || !state.candidates.length
      ? '<p class="lab-panel-teach-hint" style="margin:12px;padding:0;">No hay estudios residuales para mapear.</p>'
      : '';
  container.innerHTML = hint + empty + items;
}

/**
 * @param {{ candidates?: object[] }} state
 * @returns {object[]}
 */
export function getSelectedCandidates(state) {
  return ((state && state.candidates) || []).filter(function (c) {
    return c && c.selected !== false;
  });
}

/**
 * @param {HTMLElement|null} container
 * @param {() => ({ candidates?: object[] }|null)} getState
 * @param {() => void} [onChange]
 */
export function wireTeachSomePage(container, getState, onChange) {
  if (!container || container._teachSomeWired) return;
  container._teachSomeWired = true;
  container.addEventListener('change', function (ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('lab-panel-teach-some-cb')) return;
    var state = typeof getState === 'function' ? getState() : getState;
    if (!state || !state.candidates) return;
    var idx = parseInt(t.getAttribute('data-teach-some-idx'), 10);
    if (!Number.isFinite(idx) || !state.candidates[idx]) return;
    state.candidates[idx].selected = !!t.checked;
    var row = t.closest('.lab-panel-teach-some-item');
    if (row) row.classList.toggle('is-selected', !!t.checked);
    if (typeof onChange === 'function') onChange();
  });
}
