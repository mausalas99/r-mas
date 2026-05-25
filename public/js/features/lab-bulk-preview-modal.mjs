import { bulkPreviewStatusLabel } from '../lab-bulk-paste.mjs';

/** @type {{ showToast(msg: string, type?: string): void }} */
let rt = {
  showToast() {},
};

var pendingConfirm = null;

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusClass(status) {
  if (status === 'ok') return 'lab-bulk-preview-status--ok';
  if (status === 'no-patient' || status === 'parse-errors') return 'lab-bulk-preview-status--err';
  if (status === 'mixed-expediente') return 'lab-bulk-preview-status--warn';
  return 'lab-bulk-preview-status--muted';
}

function renderPreviewSummary(blocks) {
  var totalReports = blocks.reduce(function (acc, b) {
    return acc + (b.reportCount || 0);
  }, 0);
  var okReports = blocks.reduce(function (acc, b) {
    return acc + (b.okReportCount || 0);
  }, 0);
  var sets = blocks.reduce(function (acc, b) {
    return acc + (b.setsAfterMerge || 0);
  }, 0);
  var processable = blocks.filter(function (b) {
    return b.canProcess && b.okReportCount > 0 && b.patient;
  }).length;
  var issues = blocks.filter(function (b) {
    return b.status !== 'ok';
  }).length;

  var parts = [
    blocks.length + ' bloque' + (blocks.length === 1 ? '' : 's'),
    okReports + ' reporte' + (okReports === 1 ? '' : 's') + ' válido' + (okReports === 1 ? '' : 's'),
    sets + ' conjunto' + (sets === 1 ? '' : 's') + ' a guardar',
  ];
  if (processable) {
    parts.push(processable + ' paciente' + (processable === 1 ? '' : 's') + ' listo' + (processable === 1 ? '' : 's'));
  }
  if (issues) {
    parts.push(issues + ' con aviso' + (issues === 1 ? '' : 's'));
  }
  return parts.join(' · ');
}

function renderReportIssues(block) {
  var bad = (block.reports || []).filter(function (r) {
    return !r.ok;
  });
  if (!bad.length) return '';
  return (
    '<ul class="lab-bulk-preview-issues">' +
    bad
      .map(function (r, idx) {
        var msg = r.error || 'No se pudo parsear el reporte';
        var label = r.expediente ? 'Exp. ' + r.expediente : 'Reporte ' + (idx + 1);
        return '<li><strong>' + esc(label) + ':</strong> ' + esc(msg) + '</li>';
      })
      .join('') +
    '</ul>'
  );
}

function renderPreviewTable(blocks) {
  var rows = blocks
    .map(function (block, idx) {
      var issues = renderReportIssues(block);
      return (
        '<tr class="lab-bulk-preview-row lab-bulk-preview-row--' +
        esc(block.status || 'unknown') +
        '">' +
        '<td>' +
        (idx + 1) +
        '</td>' +
        '<td><strong>' +
        esc(block.patientName || '—') +
        '</strong>' +
        (block.primaryExpediente
          ? '<span class="lab-bulk-preview-exp">Exp. ' + esc(block.primaryExpediente) + '</span>'
          : '') +
        '</td>' +
        '<td>' +
        (block.reportCount || 0) +
        ' <span class="lab-bulk-preview-muted">(' +
        (block.okReportCount || 0) +
        ' ok)</span></td>' +
        '<td>' +
        esc(block.daysLabel || '—') +
        '</td>' +
        '<td>' +
        (block.setsAfterMerge || 0) +
        '</td>' +
        '<td><span class="lab-bulk-preview-status ' +
        statusClass(block.status) +
        '">' +
        esc(bulkPreviewStatusLabel(block.status)) +
        '</span></td>' +
        '</tr>' +
        (issues
          ? '<tr class="lab-bulk-preview-detail-row"><td colspan="6">' + issues + '</td></tr>'
          : '')
      );
    })
    .join('');

  return (
    '<table class="lab-bulk-preview-table">' +
    '<thead><tr>' +
    '<th>#</th><th>Paciente</th><th>Reportes</th><th>Días</th><th>Conjuntos</th><th>Estado</th>' +
    '</tr></thead>' +
    '<tbody>' +
    rows +
    '</tbody></table>'
  );
}

export function registerLabBulkPreviewModalRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

/**
 * @param {{ blocks: object[], onConfirm?: () => void }} opts
 */
export function openLabBulkPreviewModal(opts) {
  var blocks = (opts && opts.blocks) || [];
  var backdrop = document.getElementById('lab-bulk-preview-backdrop');
  var summary = document.getElementById('lab-bulk-preview-summary');
  var body = document.getElementById('lab-bulk-preview-body');
  var btn = document.getElementById('lab-bulk-preview-confirm');
  if (!backdrop || !body) return;

  pendingConfirm = opts && typeof opts.onConfirm === 'function' ? opts.onConfirm : null;
  if (summary) summary.textContent = renderPreviewSummary(blocks);
  body.innerHTML = renderPreviewTable(blocks);

  var processable = blocks.some(function (b) {
    return b.canProcess && b.okReportCount > 0 && b.patient;
  });
  if (btn) {
    btn.disabled = !processable;
    btn.setAttribute('aria-disabled', processable ? 'false' : 'true');
    btn.title = processable
      ? 'Guardar en historial y mostrar resultado'
      : 'Corrige los errores antes de procesar';
  }

  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('lab-bulk-preview-modal-open');
}

export function closeLabBulkPreviewModal() {
  var backdrop = document.getElementById('lab-bulk-preview-backdrop');
  var body = document.getElementById('lab-bulk-preview-body');
  pendingConfirm = null;
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('lab-bulk-preview-modal-open');
  if (body) body.innerHTML = '';
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
