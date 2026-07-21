/**
 * Lab panel teach wizard — modal shell (open/close, steps, confirm).
 * Document access is guarded inside open/close/handlers for Node import smoke.
 */
import { findResidualSomeStudies } from '../labs-panel-residual.mjs';
import {
  draftRowsToPanelDef,
  previewLinesFromDraft,
} from '../labs-panel-teach-model.mjs';
import { panelDefToOverlayPatch } from '../labs-panel-overlay.mjs';
import { upsertLabPanelOverlay } from '../labs-panel-overlay-store.mjs';
import {
  getSelectedCandidates,
  renderTeachSomePage,
  wireTeachSomePage,
} from './lab-panel-teach-page-some.mjs';
import {
  addEmptyTeachRow,
  buildDraftFromSelected,
  readDraftRowsFromDom,
  readTeachMetaFromDom,
  refreshTeachPreview,
  renderTeachRowsPage,
  wireTeachRowsPage,
} from './lab-panel-teach-page-rows.mjs';
import { queueLabPanelOverlayLanSync } from './lan/lab-panel-overlay-sync.mjs';

export { queueLabPanelOverlayLanSync };

/** @type {null | {
 *   sourceText: string,
 *   resLabs: string[],
 *   residual: { candidates: object[], coveredCount: number },
 *   patient: unknown,
 *   onConfirm: ((payload: object) => void) | null,
 *   candidates: object[],
 *   draftRows: object[],
 *   step: 1 | 2,
 * }} */
var session = null;
var wired = false;


function getSession() {
  return session;
}

function makePanelId() {
  var uuid =
    globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : Date.now().toString(36) + '_' + Math.random().toString(16).slice(2);
  return 'user:' + uuid;
}

function serializeGates(gates) {
  return (gates || []).map(function (g) {
    if (typeof g === 'string') return g;
    if (g instanceof RegExp) return g.source;
    return String(g);
  });
}

function serializeFields(fields) {
  return (fields || []).map(function (f) {
    if (f.patterns) {
      return {
        key: f.key,
        patterns: (f.patterns || []).map(function (p) {
          return p instanceof RegExp ? p.source : String(p);
        }),
      };
    }
    return { key: f.key, labels: (f.labels || []).slice() };
  });
}

function sectionPrefix(line) {
  var s = String(line || '');
  var tab = s.indexOf('\t');
  if (tab >= 0) return s.slice(0, tab);
  var sp = s.search(/\s/);
  return sp >= 0 ? s.slice(0, sp) : s;
}

/**
 * Replace existing resLabs lines whose section prefix matches preview.
 * @param {string[]} existing
 * @param {string[]} previewLines
 */
export function mergeResLabsWithPreview(existing, previewLines) {
  var prefixes = Object.create(null);
  (previewLines || []).forEach(function (line) {
    var p = sectionPrefix(line);
    if (p) prefixes[p] = true;
  });
  var kept = (existing || []).filter(function (line) {
    return !prefixes[sectionPrefix(line)];
  });
  return kept.concat(previewLines || []);
}

/**
 * Pure confirm payload builder (DOM-free / testable).
 * @param {{ draftRows: object[], meta: { sectionKey: string, mode: string }, sourceText: string, resLabs: string[] }} opts
 */
export function buildTeachConfirmPayload(opts) {
  var draftRows = opts.draftRows || [];
  var meta = opts.meta || { sectionKey: 'USER', mode: 'num' };
  var sourceText = opts.sourceText || '';
  var resLabs = opts.resLabs || [];
  var def = draftRowsToPanelDef(draftRows, meta);
  var overlayRecord = panelDefToOverlayPatch(def, {
    panelId: makePanelId(),
    updatedAt: Date.now(),
    updatedBy: 'local',
    gates: serializeGates(def.gates),
    fields: serializeFields(def.fields),
  });
  var previewLines = previewLinesFromDraft(draftRows, meta, sourceText);
  return {
    overlayRecord: overlayRecord,
    previewLines: previewLines,
    mergedResLabs: mergeResLabsWithPreview(resLabs, previewLines),
  };
}

function el(id) {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id);
}

function setStepVisible(step) {
  var s1 = el('lab-panel-teach-step-1');
  var s2 = el('lab-panel-teach-step-2');
  if (s1) {
    if (step === 1) s1.removeAttribute('hidden');
    else s1.setAttribute('hidden', '');
  }
  if (s2) {
    if (step === 2) s2.removeAttribute('hidden');
    else s2.setAttribute('hidden', '');
  }
}

function paintPreview() {
  if (!session) return;
  var rowsEl = el('lab-panel-teach-rows');
  if (rowsEl) session.draftRows = readDraftRowsFromDom(rowsEl);
  var meta = readTeachMetaFromDom(typeof document !== 'undefined' ? document : null);
  refreshTeachPreview(
    el('lab-panel-teach-preview'),
    session.draftRows,
    meta,
    session.sourceText,
  );
}

function goToStep2() {
  if (!session) return;
  var selected = getSelectedCandidates(session);
  if (!selected.length) return;
  session.draftRows = buildDraftFromSelected(selected, session.draftRows);
  var rowsEl = el('lab-panel-teach-rows');
  renderTeachRowsPage(rowsEl, session.draftRows);
  wireTeachRowsPage(rowsEl, getSession, paintPreview);
  var sectionEl = el('lab-panel-teach-section');
  if (sectionEl && !String(sectionEl.value || '').trim()) {
    sectionEl.value = 'USER';
  }
  session.step = 2;
  setStepVisible(2);
  paintPreview();
}

function goToStep1() {
  if (!session) return;
  var rowsEl = el('lab-panel-teach-rows');
  if (rowsEl) session.draftRows = readDraftRowsFromDom(rowsEl);
  renderTeachSomePage(el('lab-panel-teach-some-list'), session.residual, session);
  session.step = 1;
  setStepVisible(1);
}

function handleConfirm() {
  if (!session) return;
  var rowsEl = el('lab-panel-teach-rows');
  if (rowsEl) session.draftRows = readDraftRowsFromDom(rowsEl);
  var meta = readTeachMetaFromDom(typeof document !== 'undefined' ? document : null);
  var payload = buildTeachConfirmPayload({
    draftRows: session.draftRows,
    meta: meta,
    sourceText: session.sourceText,
    resLabs: session.resLabs,
  });
  upsertLabPanelOverlay(payload.overlayRecord);
  try {
    queueLabPanelOverlayLanSync(payload.overlayRecord);
  } catch {
    /* fire-and-forget */
  }
  var onConfirm = session.onConfirm;
  closeLabPanelTeachModal();
  if (typeof onConfirm === 'function') onConfirm(payload);
}

function onEscapeKey(ev) {
  if (!ev || ev.key !== 'Escape') return;
  if (!isLabPanelTeachModalOpen()) return;
  ev.preventDefault();
  closeLabPanelTeachModal();
}

function onBackdropClick(ev) {
  var backdrop = el('lab-panel-teach-backdrop');
  if (!backdrop || ev.target !== backdrop) return;
  closeLabPanelTeachModal();
}

function wireOnce() {
  if (wired || typeof document === 'undefined') return;
  wired = true;

  wireTeachSomePage(el('lab-panel-teach-some-list'), getSession);
  wireTeachRowsPage(el('lab-panel-teach-rows'), getSession, paintPreview);

  var closeBtn = el('lab-panel-teach-close');
  var cancel1 = el('lab-panel-teach-cancel');
  var cancel2 = el('lab-panel-teach-cancel-2');
  var cont = el('lab-panel-teach-continue');
  var back = el('lab-panel-teach-back');
  var addRow = el('lab-panel-teach-add-row');
  var confirmBtn = el('lab-panel-teach-confirm');
  var sectionEl = el('lab-panel-teach-section');
  var modeEl = el('lab-panel-teach-mode');
  var backdrop = el('lab-panel-teach-backdrop');

  if (closeBtn) closeBtn.addEventListener('click', closeLabPanelTeachModal);
  if (cancel1) cancel1.addEventListener('click', closeLabPanelTeachModal);
  if (cancel2) cancel2.addEventListener('click', closeLabPanelTeachModal);
  if (cont) cont.addEventListener('click', goToStep2);
  if (back) back.addEventListener('click', goToStep1);
  if (addRow) {
    addRow.addEventListener('click', function () {
      if (!session) return;
      var rowsEl = el('lab-panel-teach-rows');
      if (rowsEl) session.draftRows = readDraftRowsFromDom(rowsEl);
      addEmptyTeachRow(session.draftRows, rowsEl);
      paintPreview();
    });
  }
  if (confirmBtn) confirmBtn.addEventListener('click', handleConfirm);
  if (sectionEl) sectionEl.addEventListener('input', paintPreview);
  if (modeEl) modeEl.addEventListener('change', paintPreview);
  if (backdrop) backdrop.addEventListener('click', onBackdropClick);
  document.addEventListener('keydown', onEscapeKey, true);
}

/**
 * @param {{
 *   sourceText: string,
 *   resLabs?: string[],
 *   residual?: { candidates: object[], coveredCount: number },
 *   patient?: unknown,
 *   onConfirm?: (payload: object) => void,
 * }} opts
 */
export function openLabPanelTeachModal(opts) {
  if (typeof document === 'undefined') return;
  opts = opts || {};
  var sourceText = String(opts.sourceText || '');
  var resLabs = Array.isArray(opts.resLabs) ? opts.resLabs.slice() : [];
  var residual =
    opts.residual || findResidualSomeStudies(sourceText, { resLabs: resLabs });

  session = {
    sourceText: sourceText,
    resLabs: resLabs,
    residual: residual,
    patient: opts.patient != null ? opts.patient : null,
    onConfirm: typeof opts.onConfirm === 'function' ? opts.onConfirm : null,
    candidates: [],
    draftRows: [],
    step: 1,
  };

  wireOnce();

  renderTeachSomePage(el('lab-panel-teach-some-list'), residual, session);

  var rowsEl = el('lab-panel-teach-rows');
  if (rowsEl) rowsEl.innerHTML = '';
  var previewEl = el('lab-panel-teach-preview');
  if (previewEl) previewEl.textContent = '';
  var sectionEl = el('lab-panel-teach-section');
  if (sectionEl) sectionEl.value = '';
  var modeEl = el('lab-panel-teach-mode');
  if (modeEl) modeEl.value = 'num';

  setStepVisible(1);

  var backdrop = el('lab-panel-teach-backdrop');
  if (!backdrop) return;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('lab-panel-teach-modal-open');
}

export function closeLabPanelTeachModal() {
  if (typeof document === 'undefined') return;
  session = null;
  setStepVisible(1);
  var backdrop = el('lab-panel-teach-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
  }
  document.documentElement.classList.remove('lab-panel-teach-modal-open');
  var listEl = el('lab-panel-teach-some-list');
  if (listEl) listEl.innerHTML = '';
  var rowsEl = el('lab-panel-teach-rows');
  if (rowsEl) rowsEl.innerHTML = '';
  var previewEl = el('lab-panel-teach-preview');
  if (previewEl) previewEl.textContent = '';
}

export function isLabPanelTeachModalOpen() {
  if (typeof document === 'undefined') return false;
  var backdrop = el('lab-panel-teach-backdrop');
  return !!(backdrop && backdrop.classList.contains('open'));
}

export const windowHandlers = {
  openLabPanelTeachModal,
  closeLabPanelTeachModal,
};
