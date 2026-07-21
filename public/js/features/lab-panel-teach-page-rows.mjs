/**
 * Teach wizard page 2 — editable draft rows + live preview.
 */
import { esc } from '../dom-escape.mjs';
import {
  candidatesToDraftRows,
  previewLinesFromDraft,
  suggestKeyFromLabel,
} from '../labs-panel-teach-model.mjs';

function emptyDraftRow() {
  return {
    included: true,
    label: '',
    key: '',
    value: '',
    min: null,
    max: null,
    mode: 'num',
    qual: '',
    sco: '',
  };
}

function numOrEmpty(v) {
  if (v == null || v === '') return '';
  return String(v);
}

function renderRowHead() {
  return (
    '<div class="lab-panel-teach-row lab-panel-teach-row-head" aria-hidden="true">' +
    '<span></span><span>Estudio</span><span>Clave</span><span>Valor</span><span>Mín</span><span>Máx</span>' +
    '</div>'
  );
}

function renderDraftRow(row, idx) {
  var included = row.included !== false;
  return (
    '<div class="lab-panel-teach-row' +
    (included ? '' : ' is-covered') +
    '" data-teach-row-idx="' +
    idx +
    '">' +
    '<input type="checkbox" class="lab-panel-teach-row-included" data-field="included"' +
    (included ? ' checked' : '') +
    ' title="Incluir" />' +
    '<input type="text" class="profile-input" data-field="label" value="' +
    esc(row.label || '') +
    '" placeholder="Etiqueta SOME" />' +
    '<input type="text" class="profile-input" data-field="key" value="' +
    esc(row.key || '') +
    '" placeholder="Clave" maxlength="16" />' +
    '<input type="text" class="profile-input" data-field="value" value="' +
    esc(row.value || '') +
    '" placeholder="Valor" />' +
    '<input type="text" class="profile-input" data-field="min" value="' +
    esc(numOrEmpty(row.min)) +
    '" placeholder="Mín" />' +
    '<input type="text" class="profile-input" data-field="max" value="' +
    esc(numOrEmpty(row.max)) +
    '" placeholder="Máx" />' +
    '</div>'
  );
}

/**
 * Merge previous draft edits into new rows by label (case-insensitive).
 * @param {object[]} nextRows
 * @param {object[]} [prevRows]
 */
export function mergeDraftRowsByLabel(nextRows, prevRows) {
  var prev = prevRows || [];
  var byLabel = Object.create(null);
  prev.forEach(function (r) {
    var k = String(r.label || '')
      .trim()
      .toUpperCase();
    if (k) byLabel[k] = r;
  });
  return (nextRows || []).map(function (row) {
    var k = String(row.label || '')
      .trim()
      .toUpperCase();
    var old = k ? byLabel[k] : null;
    if (!old) return row;
    return Object.assign({}, row, {
      included: old.included !== false,
      key: old.key || row.key,
      value: old.value != null && old.value !== '' ? old.value : row.value,
      min: old.min != null ? old.min : row.min,
      max: old.max != null ? old.max : row.max,
      mode: old.mode || row.mode,
      qual: old.qual || row.qual,
      sco: old.sco || row.sco,
    });
  });
}

/**
 * @param {HTMLElement|null} container
 * @param {object[]} draftRows
 */
export function renderTeachRowsPage(container, draftRows) {
  if (!container) return;
  var rows = draftRows || [];
  container.innerHTML = renderRowHead() + rows.map(renderDraftRow).join('');
}

function fieldEl(node, field) {
  return node.querySelector('[data-field="' + field + '"]') || null;
}

function parseOptionalNum(raw) {
  var s = String(raw || '').trim();
  if (!s) return null;
  var n = parseFloat(s.replace(',', '.'));
  return n != null && isFinite(n) ? n : null;
}

function normalizeTeachMode(mode) {
  return mode === 'qual' ? 'qual' : 'num';
}

function readOneDraftRow(node, mode) {
  var includedEl = fieldEl(node, 'included');
  var minEl = fieldEl(node, 'min');
  var maxEl = fieldEl(node, 'max');
  var labelEl = fieldEl(node, 'label');
  var keyEl = fieldEl(node, 'key');
  var valueEl = fieldEl(node, 'value');
  return {
    included: includedEl ? !!includedEl.checked : true,
    label: labelEl ? String(labelEl.value || '') : '',
    key: keyEl ? String(keyEl.value || '') : '',
    value: valueEl ? String(valueEl.value || '') : '',
    min: parseOptionalNum(minEl ? minEl.value : ''),
    max: parseOptionalNum(maxEl ? maxEl.value : ''),
    mode: normalizeTeachMode(mode),
    qual: '',
    sco: '',
  };
}

/**
 * Read draft rows from the rows container DOM.
 * Uses wizard mode from #lab-panel-teach-mode (or passed meta) so confirm honors qual vs num.
 * @param {HTMLElement|null} container
 * @param {{ sectionKey?: string, mode?: string }|null} [meta]
 * @returns {object[]}
 */
export function readDraftRowsFromDom(container, meta) {
  if (!container) return [];
  var resolved =
    meta && meta.mode
      ? { mode: normalizeTeachMode(meta.mode) }
      : readTeachMetaFromDom(container.ownerDocument || (typeof document !== 'undefined' ? document : null));
  var mode = resolved.mode || 'num';
  var nodes = container.querySelectorAll('.lab-panel-teach-row[data-teach-row-idx]');
  var out = [];
  nodes.forEach(function (node) {
    out.push(readOneDraftRow(node, mode));
  });
  return out;
}

/**
 * @param {Document|null} doc
 * @returns {{ sectionKey: string, mode: string }}
 */
export function readTeachMetaFromDom(doc) {
  var d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d) return { sectionKey: 'USER', mode: 'num' };
  var sectionEl = d.getElementById('lab-panel-teach-section');
  var modeEl = d.getElementById('lab-panel-teach-mode');
  var sectionKey = sectionEl ? String(sectionEl.value || '').trim() : '';
  var mode = modeEl ? String(modeEl.value || 'num') : 'num';
  if (mode !== 'qual') mode = 'num';
  return { sectionKey: sectionKey || 'USER', mode: mode };
}

/**
 * @param {HTMLElement|null} previewEl
 * @param {object[]} draftRows
 * @param {{ sectionKey?: string, mode?: string }} meta
 * @param {string} sourceText
 */
export function refreshTeachPreview(previewEl, draftRows, meta, sourceText) {
  if (!previewEl) return;
  var lines = previewLinesFromDraft(draftRows, meta, sourceText || '');
  previewEl.textContent = lines.length ? lines.join('\n') : '(sin vista previa — revisa filas o grupo)';
  return lines;
}

/**
 * Build draft from selected candidates, preserving prior edits by label.
 * @param {object[]} selected
 * @param {object[]} [prevDraft]
 */
export function buildDraftFromSelected(selected, prevDraft) {
  var base = candidatesToDraftRows(selected || []);
  return mergeDraftRowsByLabel(base, prevDraft);
}

/**
 * Append an empty editable row to state + DOM container.
 * @param {object[]} draftRows
 * @param {HTMLElement|null} container
 */
export function addEmptyTeachRow(draftRows, container) {
  var row = emptyDraftRow();
  row.key = suggestKeyFromLabel('Campo');
  draftRows.push(row);
  if (container) renderTeachRowsPage(container, draftRows);
  return row;
}

/**
 * Wire input/change on rows container to sync state + preview.
 * @param {HTMLElement|null} container
 * @param {() => ({ draftRows: object[] }|null)} getState
 * @param {() => void} refreshPreview
 */
export function wireTeachRowsPage(container, getState, refreshPreview) {
  if (!container || container._teachRowsWired) return;
  container._teachRowsWired = true;

  function syncFromDom() {
    var state = typeof getState === 'function' ? getState() : getState;
    if (!state) return;
    state.draftRows = readDraftRowsFromDom(container);
    if (typeof refreshPreview === 'function') refreshPreview();
  }

  container.addEventListener('input', function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute || !t.getAttribute('data-field')) return;
    syncFromDom();
  });
  container.addEventListener('change', function (ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('lab-panel-teach-row-included')) return;
    var row = t.closest('.lab-panel-teach-row');
    if (row) row.classList.toggle('is-covered', !t.checked);
    syncFromDom();
  });
}
