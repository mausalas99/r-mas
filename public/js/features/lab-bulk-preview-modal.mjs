import {
  bulkPreviewStatusLabel,
  extractLabPatientFromBulkBlock,
} from '../lab-bulk-paste.mjs';
import { closePatientDatosModal } from '../patient-datos-modal.mjs';

/** @type {{
 *   showToast(msg: string, type?: string): void,
 *   rebuildBulkLabPreviewBlocks?(text: string): object[],
 *   openAddModalFromLabPatient?(patient: object, opts?: { onSaved?: (p: object) => void }): void,
 * }} */

import { esc } from '../dom-escape.mjs';
let rt = {
  showToast() {},
};

var pendingConfirm = null;
var modalSession = null;

function statusClass(status) {
  if (status === 'ok') return 'lab-bulk-preview-status--ok';
  if (status === 'no-patient' || status === 'parse-errors') return 'lab-bulk-preview-status--err';
  if (status === 'mixed-expediente') return 'lab-bulk-preview-status--warn';
  return 'lab-bulk-preview-status--muted';
}

export function shouldOfferBulkPreviewAddPatient(block) {
  return !!(block && block.okReportCount > 0 && block.status === 'no-patient');
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
  var missing = blocks.filter(function (b) {
    return shouldOfferBulkPreviewAddPatient(b);
  }).length;

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
  if (missing) {
    parts.push(missing + ' sin registrar');
  }
  return parts.join(' · ');
}

function countBadReports(block) {
  return (block.reports || []).filter(function (r) {
    return !r.ok;
  }).length;
}

function renderReportIssues(block) {
  var bad = (block.reports || []).filter(function (r) {
    return !r.ok;
  });
  if (!bad.length) return '';
  var maxShow = 3;
  var shown = bad.slice(0, maxShow);
  var more = bad.length - shown.length;
  return (
    '<details class="lab-bulk-preview-issues">' +
    '<summary>' +
    bad.length +
    ' reporte' +
    (bad.length === 1 ? '' : 's') +
    ' omitido' +
    (bad.length === 1 ? '' : 's') +
    ' (ruido del portal)</summary>' +
    '<ul>' +
    shown
      .map(function (r, idx) {
        var msg = r.error || 'No se pudo parsear';
        var label = r.expediente ? 'Exp. ' + r.expediente : 'Reporte ' + (idx + 1);
        return '<li><span class="lab-bulk-preview-issue-label">' + esc(label) + '</span> ' + esc(msg) + '</li>';
      })
      .join('') +
    (more > 0 ? '<li>+' + more + ' más</li>' : '') +
    '</ul></details>'
  );
}

function renderRowActions(block, idx) {
  var html =
    '<span class="lab-bulk-preview-status ' +
    statusClass(block.status) +
    '">' +
    esc(bulkPreviewStatusLabel(block.status)) +
    '</span>';
  if (shouldOfferBulkPreviewAddPatient(block)) {
    html +=
      '<button type="button" class="lab-bulk-preview-add-pill" data-bulk-block-idx="' +
      idx +
      '" title="Registrar paciente con datos del reporte">Agregar</button>';
  }
  return html;
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

function renderBlockMeta(block) {
  var parts = [];
  var ok = block.okReportCount || 0;
  var total = block.reportCount || 0;
  var sets = block.setsAfterMerge || 0;
  var omitted = countBadReports(block);
  if (ok) parts.push(ok + '/' + total + ' reportes');
  else if (total) parts.push(total + ' reportes');
  if (sets) parts.push(sets + ' conjunto' + (sets === 1 ? '' : 's'));
  if (block.daysLabel && block.daysLabel !== '—') parts.push(block.daysLabel);
  if (omitted) parts.push(omitted + ' omitido' + (omitted === 1 ? '' : 's'));
  return parts.join(' · ');
}

function renderPreviewList(blocks) {
  return (
    '<ul class="lab-bulk-preview-list">' +
    blocks
      .map(function (block, idx) {
        var issues = renderReportIssues(block);
        return (
          '<li class="lab-bulk-preview-row lab-bulk-preview-row--' +
          esc(block.status || 'unknown') +
          '">' +
          '<div class="lab-bulk-preview-row-main">' +
          '<div class="lab-bulk-preview-row-text">' +
          '<div class="lab-bulk-preview-row-name">' +
          esc(block.patientName || '—') +
          '</div>' +
          '<div class="lab-bulk-preview-row-meta">' +
          (block.primaryExpediente ? 'Exp. ' + esc(block.primaryExpediente) + ' · ' : '') +
          esc(renderBlockMeta(block)) +
          '</div>' +
          '</div>' +
          '<div class="lab-bulk-preview-row-aside">' +
          renderRowActions(block, idx) +
          '</div>' +
          '</div>' +
          (issues || '') +
          '</li>'
        );
      })
      .join('') +
    '</ul>'
  );
}

function paintModalContent(blocks) {
  var summary = document.getElementById('lab-bulk-preview-summary');
  var body = document.getElementById('lab-bulk-preview-body');
  var btn = document.getElementById('lab-bulk-preview-confirm');
  if (summary) summary.textContent = renderPreviewSummary(blocks);
  if (body) body.innerHTML = renderPreviewList(blocks);

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
    onSaved: function () {
      refreshModalPreview();
      if (typeof rt.tourOnBulkPreviewPatientSaved === 'function') {
        rt.tourOnBulkPreviewPatientSaved();
      }
    },
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
    body.innerHTML = '';
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
