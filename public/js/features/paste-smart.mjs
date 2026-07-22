/**
 * Paste-anywhere / Procesar inteligente — global paste + ⌘K action.
 * Routes SOME text to census patients with one confirm when ambiguous.
 * Lab workbench loads on demand (no static boot import).
 */
import { patients } from '../app-state.mjs';
import { findPatientByRegistro } from './patients-modal-commit.mjs';
import { selectPatient } from './patients.mjs';
import {
  looksLikeSmartPasteCandidate,
  planSmartPaste,
  assignPatientToBulkBlock,
  shouldSkipGlobalSmartPaste,
} from './paste-smart-model.mjs';
import { cancelOverlayClose, closeOverlayAnimated } from '../ui-motion.mjs';

var wired = false;
var confirmDom = null;

function showToast(msg, type) {
  if (typeof window.showToast === 'function') window.showToast(msg, type);
}

function switchToLabTab() {
  if (typeof window.switchAppTab === 'function') window.switchAppTab('lab');
}

function fillLabInput(text) {
  var ta = document.getElementById('lab-input');
  if (ta) ta.value = String(text || '');
}

function getQuickLabOutput() {
  try {
    var raw = localStorage.getItem('labOutputPrefs');
    if (!raw) return false;
    var prefs = JSON.parse(raw);
    return !!(prefs && prefs.quickLabOutput);
  } catch (err) {
    void err;
    return false;
  }
}

function loadLabPasteRuntime() {
  return import('../lazy-feature-routes.mjs')
    .then(function (routes) {
      return routes.ensureLabsLoaded();
    })
    .then(function () {
      return Promise.all([
        import('./lab-bulk-preview-modal.mjs'),
        import('./lab-panel-workbench.mjs'),
      ]);
    })
    .then(function (mods) {
      return {
        openLabBulkPreviewModal: mods[0].openLabBulkPreviewModal,
        finalizeBulkLabPaste: mods[1].finalizeBulkLabPaste,
      };
    });
}

/**
 * @param {string} text
 * @param {{ force?: boolean }} [opts]
 */
export function processSmartPaste(text, opts) {
  var plan = planSmartPaste(text, {
    patients: patients,
    findPatientByRegistro: findPatientByRegistro,
    quickLabOutput: getQuickLabOutput(),
  });

  if (plan.kind === 'empty' || plan.kind === 'not-some') {
    if (opts && opts.force) showToast(plan.message || 'No hay reporte SOME', 'error');
    return plan;
  }

  if (plan.kind === 'ambiguous' || plan.kind === 'confirm-single') {
    openSmartPasteConfirm(plan, plan.kind);
    return plan;
  }

  void executeSmartPastePlan(plan);
  return plan;
}

/** ⌘K / explicit action: read clipboard and process. */
export function procesarSomeFromClipboard() {
  return readClipboardText().then(function (text) {
    if (!String(text || '').trim()) {
      showToast('Copia un reporte SOME al portapapeles primero', 'error');
      return null;
    }
    return processSmartPaste(text, { force: true });
  });
}

export function initPasteSmart() {
  if (wired || typeof document === 'undefined') return;
  wired = true;
  document.addEventListener('paste', onDocumentPaste, true);
}

function onDocumentPaste(ev) {
  if (!ev || !ev.clipboardData) return;
  if (shouldSkipGlobalSmartPaste(ev.target)) return;
  var text = '';
  try {
    text = ev.clipboardData.getData('text/plain') || '';
  } catch (err) {
    void err;
    return;
  }
  if (!looksLikeSmartPasteCandidate(text)) return;
  ev.preventDefault();
  ev.stopPropagation();
  processSmartPaste(text, { force: true });
}

function executeSmartPastePlan(plan, chosenPatient) {
  var blocks = (plan.blocks || []).slice();
  var sourceText = plan.sourceText || '';
  if (chosenPatient) {
    blocks = blocks.map(function (b) {
      if (b && b.okReportCount > 0 && (!b.canProcess || !b.patient)) {
        return assignPatientToBulkBlock(b, chosenPatient);
      }
      return b;
    });
  }

  var primary =
    chosenPatient ||
    plan.primaryPatient ||
    (blocks[0] && blocks[0].patient) ||
    null;
  if (primary && primary.id != null) selectPatient(primary.id);

  switchToLabTab();
  fillLabInput(sourceText);

  var totalOk = plan.totalOkReports || 0;
  var needsPreview = !!plan.needsPreview || plan.kind === 'preview';

  return loadLabPasteRuntime().then(function (rt) {
    if (needsPreview) {
      rt.openLabBulkPreviewModal({
        blocks: blocks,
        sourceText: sourceText,
        onConfirm: function () {
          rt.finalizeBulkLabPaste(sourceText, blocks, totalOk);
        },
      });
      return;
    }
    rt.finalizeBulkLabPaste(sourceText, blocks, totalOk);
  });
}

function openSmartPasteConfirm(plan, mode) {
  var d = ensureConfirmDom();
  cancelOverlayClose(d.backdrop, { panelEl: d.panel });
  d.backdrop.hidden = false;
  d.panel.hidden = false;
  d.title.textContent = mode === 'ambiguous' ? '¿A qué paciente pertenece?' : 'Confirmar paciente';
  d.lead.textContent =
    mode === 'ambiguous'
      ? 'El reporte coincide con más de un paciente del censo. Elige uno para procesar.'
      : plan.message || 'Confirma antes de guardar en el expediente.';
  d.list.textContent = '';
  var list = mode === 'ambiguous' ? plan.candidates : plan.candidates.slice(0, 1);
  list.forEach(function (p) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'paste-smart-choice';
    var nameEl = document.createElement('span');
    nameEl.className = 'paste-smart-choice-name';
    nameEl.textContent = p.nombre || 'Sin nombre';
    var hintEl = document.createElement('span');
    hintEl.className = 'paste-smart-choice-hint';
    hintEl.textContent = patientHint(p);
    btn.appendChild(nameEl);
    btn.appendChild(hintEl);
    btn.addEventListener('click', function () {
      closeSmartPasteConfirm();
      void executeSmartPastePlan(plan, p);
    });
    d.list.appendChild(btn);
  });
  d.cancel.focus();
}

function patientHint(p) {
  var parts = [];
  if (p.registro) parts.push('Exp ' + p.registro);
  var bed = [p.cuarto, p.cama].filter(Boolean).join('-');
  if (bed) parts.push(bed);
  return parts.join(' · ') || 'Sin registro';
}

function closeSmartPasteConfirm() {
  if (!confirmDom) return;
  var d = confirmDom;
  closeOverlayAnimated(
    d.backdrop,
    function () {
      d.backdrop.hidden = true;
      d.panel.hidden = true;
    },
    { panelEl: d.panel }
  );
}

function ensureConfirmDom() {
  if (confirmDom) return confirmDom;
  var backdrop = document.createElement('div');
  backdrop.className = 'paste-smart-backdrop';
  backdrop.id = 'paste-smart-backdrop';
  backdrop.hidden = true;
  backdrop.addEventListener('click', function (ev) {
    if (ev.target === backdrop) closeSmartPasteConfirm();
  });

  var panel = document.createElement('div');
  panel.className = 'paste-smart-modal';
  panel.id = 'paste-smart-modal';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'paste-smart-title');

  var head = document.createElement('div');
  head.className = 'paste-smart-head';
  var title = document.createElement('h3');
  title.id = 'paste-smart-title';
  var lead = document.createElement('p');
  lead.className = 'paste-smart-lead';
  head.appendChild(title);
  head.appendChild(lead);

  var list = document.createElement('div');
  list.className = 'paste-smart-list';
  list.setAttribute('role', 'list');

  var actions = document.createElement('div');
  actions.className = 'paste-smart-actions';
  var cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn-med-secondary';
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', closeSmartPasteConfirm);
  actions.appendChild(cancel);

  panel.appendChild(head);
  panel.appendChild(list);
  panel.appendChild(actions);
  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  confirmDom = { backdrop: backdrop, panel: panel, title: title, lead: lead, list: list, cancel: cancel };
  return confirmDom;
}

function readClipboardText() {
  if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    return navigator.clipboard.readText().catch(function () {
      return '';
    });
  }
  return Promise.resolve('');
}

export function isSmartPasteConfirmOpen() {
  return !!(confirmDom && confirmDom.panel && !confirmDom.panel.hidden);
}

export function closeSmartPasteConfirmIfOpen() {
  if (isSmartPasteConfirmOpen()) closeSmartPasteConfirm();
}

export var windowHandlers = {
  processSmartPaste: processSmartPaste,
  procesarSomeFromClipboard: procesarSomeFromClipboard,
  closeSmartPasteConfirm: closeSmartPasteConfirm,
};
