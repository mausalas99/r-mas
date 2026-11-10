import { extractLabPatientFromBulkBlock } from '../lab-bulk-paste.mjs';
import { closePatientDatosModal } from '../patient-datos-modal.mjs';
import { shouldOfferBulkPreviewAddPatient, isRepeatOfEarlierMissingPatient } from './lab-bulk-preview-rules.mjs';

export { shouldOfferBulkPreviewAddPatient, isRepeatOfEarlierMissingPatient };

/** @type {{
 *   showToast(msg: string, type?: string): void,
 *   rebuildBulkLabPreviewBlocks?(text: string): object[],
 *   openAddModalFromLabPatient?(patient: object, opts?: { onSaved?: (p: object) => void }): void,
 * }} */

let rt = {
  showToast() {},
};

var pendingConfirm = null;
var modalSession = null;

// The Preact list loads on first use: a static import would join the boot graph.
var listView = null;
function paintList(body, blocks) {
  if (listView) return listView.drawLabBulkPreviewList(body, blocks);
  import('./lab-bulk-preview-view.jsx').then(
    function (m) {
      listView = m;
      if (modalSession && modalSession.blocks === blocks) m.drawLabBulkPreviewList(body, blocks);
    },
    function () {
      rt.showToast('No se pudo mostrar la vista previa', 'error');
    }
  );
}

function renderPreviewSummary(blocks) {
  var okReports = blocks.reduce(function (acc, b) {
    return acc + (b.okReportCount || 0);
  }, 0);
  var sets = blocks.reduce(function (acc, b) {
    return acc + (b.setsAfterMerge || 0);
  }, 0);
  var processable = blocks.filter(function (b) {
    return b.canProcess && b.okReportCount > 0 && b.patient;
  }).length;
  var badReports = blocks.reduce(function (acc, b) {
    var n = (b.reports || []).filter(function (r) {
      return !r.ok;
    }).length;
    return acc + n;
  }, 0);
  var missing = blocks.filter(function (b, idx) {
    return shouldOfferBulkPreviewAddPatient(b) && !isRepeatOfEarlierMissingPatient(blocks, idx);
  }).length;
  var conflicts = blocks.reduce(function (acc, b) {
    return acc + (Array.isArray(b.conflictReports) ? b.conflictReports.length : 0);
  }, 0);

  var parts = [];
  if (processable) {
    parts.push(
      processable + ' paciente' + (processable === 1 ? '' : 's') + ' listo' + (processable === 1 ? '' : 's')
    );
  }
  parts.push(okReports + ' reporte' + (okReports === 1 ? '' : 's'));
  parts.push(sets + ' conjunto' + (sets === 1 ? '' : 's'));
  if (badReports) {
    parts.push(badReports + ' omitido' + (badReports === 1 ? '' : 's'));
  }
  if (conflicts) {
    parts.push(conflicts + ' excluido' + (conflicts === 1 ? '' : 's') + ' (otro expediente)');
  }
  if (missing) {
    parts.push(missing + ' sin registrar');
  }
  return parts.join(' · ');
}

export function resolveBulkPreviewConfirmState(blocks) {
  var list = Array.isArray(blocks) ? blocks : [];
  var processable = list.some(function (b) {
    return b && b.canProcess && b.okReportCount > 0 && b.patient;
  });
  var displayable = list.some(function (b) {
    return b && b.okReportCount > 0;
  });
  return {
    processable: processable,
    displayable: displayable,
    canConfirm: processable || displayable,
  };
}


function paintModalContent(blocks) {
  var summary = document.getElementById('lab-bulk-preview-summary');
  var body = document.getElementById('lab-bulk-preview-body');
  var btn = document.getElementById('lab-bulk-preview-confirm');
  if (summary) summary.textContent = renderPreviewSummary(blocks);
  if (body) paintList(body, blocks);

  var confirmState = resolveBulkPreviewConfirmState(blocks);
  if (btn) {
    btn.disabled = !confirmState.canConfirm;
    btn.setAttribute('aria-disabled', confirmState.canConfirm ? 'false' : 'true');
    btn.textContent = confirmState.processable
      ? 'Procesar todo'
      : confirmState.displayable
        ? 'Ver resultados'
        : 'Procesar todo';
    btn.title = confirmState.processable
      ? 'Guardar en historial y mostrar resultado'
      : confirmState.displayable
        ? 'Formatear sin guardar en historial; agrega el paciente desde el banner'
        : 'Corrige los errores antes de procesar';
  }
}

function rebuildSessionBlocks() {
  if (
    !modalSession ||
    !modalSession.sourceText ||
    typeof rt.rebuildBulkLabPreviewBlocks !== 'function'
  ) {
    return modalSession ? modalSession.blocks : [];
  }
  return rt.rebuildBulkLabPreviewBlocks(modalSession.sourceText);
}

function refreshModalPreview() {
  if (!modalSession) return;
  modalSession.blocks = rebuildSessionBlocks();
  paintModalContent(modalSession.blocks);
}

/** After alta: process immediately when nothing else is blocking. */
export function shouldAutoConfirmAfterPatientSave(blocks) {
  var state = resolveBulkPreviewConfirmState(blocks);
  if (!state.processable) return false;
  return !(blocks || []).some(shouldOfferBulkPreviewAddPatient);
}

function handleBulkPreviewPatientSaved() {
  refreshModalPreview();
  if (typeof rt.tourOnBulkPreviewPatientSaved === 'function') {
    rt.tourOnBulkPreviewPatientSaved();
  }
  if (!modalSession) return;
  if (!shouldAutoConfirmAfterPatientSave(modalSession.blocks)) {
    resumeLabBulkPreviewModalIfSuspended();
    if (typeof rt.showToast === 'function') {
      rt.showToast('Paciente registrado. Revisa el resto en la vista previa.', 'success');
    }
    return;
  }
  if (typeof rt.showToast === 'function') {
    rt.showToast('Paciente registrado', 'success');
  }
  confirmLabBulkPreview();
}

function handlePreviewBodyClick(event) {
  var btn = event.target && event.target.closest ? event.target.closest('[data-bulk-block-idx]') : null;
  if (!btn || !modalSession) return;
  var idx = parseInt(btn.getAttribute('data-bulk-block-idx'), 10);
  if (!Number.isFinite(idx) || idx < 0 || idx >= modalSession.blocks.length) return;
  var block = modalSession.blocks[idx];
  if (!shouldOfferBulkPreviewAddPatient(block)) return;
  var labPatient = extractLabPatientFromBulkBlock(block);
  if (!labPatient) {
    rt.showToast('No hay datos del paciente en este bloque', 'error');
    return;
  }
  if (typeof rt.openAddModalFromLabPatient !== 'function') {
    rt.showToast('No se pudo abrir el formulario de alta', 'error');
    return;
  }
  suspendLabBulkPreviewModal();
  rt.openAddModalFromLabPatient(labPatient, {
    fromBulkPreview: true,
    onSaved: handleBulkPreviewPatientSaved,
  });
}

function wirePreviewBody(body) {
  if (!body) return;
  body.onclick = handlePreviewBodyClick;
}

export function registerLabBulkPreviewModalRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

/**
 * @param {{ blocks: object[], sourceText?: string, onConfirm?: () => void }} opts
 */
export function openLabBulkPreviewModal(opts) {
  var blocks = (opts && opts.blocks) || [];
  var backdrop = document.getElementById('lab-bulk-preview-backdrop');
  var body = document.getElementById('lab-bulk-preview-body');
  if (!backdrop || !body) return;

  pendingConfirm = opts && typeof opts.onConfirm === 'function' ? opts.onConfirm : null;
  modalSession = {
    blocks: blocks.slice(),
    sourceText: opts && opts.sourceText ? String(opts.sourceText) : '',
  };

  paintModalContent(modalSession.blocks);
  wirePreviewBody(body);

  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('lab-bulk-preview-modal-open');
}

/** Texto SOME del modal de vista previa (p. ej. tour tras limpiar #lab-input). */
export function getBulkLabPreviewSourceText() {
  return modalSession && modalSession.sourceText ? String(modalSession.sourceText) : '';
}

export function isBulkLabPreviewModalOpen() {
  var backdrop = document.getElementById('lab-bulk-preview-backdrop');
  return !!(backdrop && backdrop.classList.contains('open'));
}

export function hasPendingBulkLabPreviewSession() {
  return !!(modalSession && pendingConfirm);
}

/** Hide preview while reviewing expediente; session stays for Procesar todo. */
export function suspendLabBulkPreviewModal() {
  var backdrop = document.getElementById('lab-bulk-preview-backdrop');
  if (!backdrop || !modalSession) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('lab-bulk-preview-modal-open');
}

export function resumeLabBulkPreviewModalIfSuspended() {
  if (!modalSession || !pendingConfirm) return false;
  closePatientDatosModal();
  if (isBulkLabPreviewModalOpen()) return true;
  var backdrop = document.getElementById('lab-bulk-preview-backdrop');
  var body = document.getElementById('lab-bulk-preview-body');
  if (!backdrop || !body) return false;
  modalSession.blocks = rebuildSessionBlocks();
  paintModalContent(modalSession.blocks);
  wirePreviewBody(body);
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('lab-bulk-preview-modal-open');
  return true;
}

export function closeLabBulkPreviewModal() {
  var backdrop = document.getElementById('lab-bulk-preview-backdrop');
  var body = document.getElementById('lab-bulk-preview-body');
  pendingConfirm = null;
  modalSession = null;
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('lab-bulk-preview-modal-open');
  if (body) {
    if (listView) listView.clearLabBulkPreviewList(body);
    body.onclick = null;
  }
}

export function confirmLabBulkPreview() {
  var fn = pendingConfirm;
  if (!fn) {
    rt.showToast('Nada que procesar: revisa los avisos en la tabla', 'error');
    return;
  }
  closeLabBulkPreviewModal();
  fn();
}

export const windowHandlers = {
  openLabBulkPreviewModal,
  closeLabBulkPreviewModal,
  confirmLabBulkPreview,
};
