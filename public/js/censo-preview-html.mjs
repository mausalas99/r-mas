import { parseCamaCellForCenso, formatCamaCellLabel } from './censo-build.mjs';
import { classifyCensoTableLine } from './censo-table-style.mjs';
import {
  censoColgroupCssRules,
  censoColgroupHtml,
  censoTheadRowHtml,
} from './censo-table-columns.mjs';

/**
 * Vista previa HTML del censo (tabla compacta, alineada al PDF).
 * @param {{ header?: Record<string, string>, rows?: Array<Record<string, unknown>> }} payload
 * @returns {string}
 */
export function renderCensoPreviewHtml(payload) {
  var header = payload.header || {};
  var rows = payload.rows || [];
  var titleLine = header.titleLine || 'Censo de Sala';
  var equipoLine = header.equipoLine || '';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function lineClass(role) {
    if (role === 'muted') return 'censo-line censo-line--muted';
    if (role === 'emphasis') return 'censo-line censo-line--emphasis';
    if (role === 'lab-date') return 'censo-line censo-line--lab-date';
    if (role === 'lab-panel') return 'censo-line censo-line--lab-panel';
    if (role === 'label-led') return 'censo-line censo-line--label-led';
    return 'censo-line';
  }

  function renderLines(text, colKey) {
    var raw = String(text || '').trim();
    if (!raw) {
      return '<span class="censo-line censo-line--empty">—</span>';
    }
    return raw
      .split('\n')
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean)
      .map(function (l, i) {
        var role = classifyCensoTableLine(l, colKey, i);
        return '<span class="' + lineClass(role) + '">' + esc(l) + '</span>';
      })
      .join('');
  }

  function pacienteCell(row) {
    var lines = [String(row.pacienteNombre || '—').trim() || '—'];
    String(row.pacienteMeta || '')
      .split('\n')
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean)
      .forEach(function (l) {
        lines.push(l);
      });
    return lines
      .map(function (l, i) {
        var role = classifyCensoTableLine(l, 'paciente', i);
        var cls = lineClass(role);
        if (i === 0) cls += ' censo-paciente-nombre';
        return '<span class="' + cls + '">' + esc(l) + '</span>';
      })
      .join('');
  }

  function camaCellHtml(camaText) {
    var label = formatCamaCellLabel(parseCamaCellForCenso(camaText));
    if (label === '—') return '—';
    return '<span class="censo-cama-vline">' + esc(label) + '</span>';
  }

  function cell(row, key, fallbackLabel) {
    var v = row[key];
    if (v) return renderLines(v, key);
    var sec = (row.sections || []).find(function (s) {
      return s.label === fallbackLabel;
    });
    if (!sec) {
      return '<span class="censo-line censo-line--empty">—</span>';
    }
    return renderLines(sec.lines.join('\n'), key);
  }

  function colMultiline(row, key) {
    var v = String(row[key] || '').trim();
    if (!v) {
      return '<span class="censo-line censo-line--empty">—</span>';
    }
    return renderLines(v, key);
  }

  var body = rows
    .map(function (row, idx) {
      return (
        '<tr class="' +
        (idx % 2 ? 'alt' : '') +
        '">' +
        '<td class="censo-data-cell censo-center censo-bold censo-num">' +
        '<span class="censo-num-val">' +
        esc(row.num) +
        '</span></td>' +
        '<td class="censo-data-cell censo-center censo-bold censo-cama">' +
        camaCellHtml(row.cama) +
        '</td>' +
        '<td class="censo-data-cell censo-center censo-paciente">' +
        pacienteCell(row) +
        '</td>' +
        '<td class="censo-data-cell censo-center censo-dx">' +
        cell(row, 'dx', 'Diagnósticos') +
        '</td>' +
        '<td class="censo-data-cell censo-center censo-meds">' +
        cell(row, 'meds', 'ATB / Medicamentos') +
        '</td>' +
        '<td class="censo-data-cell censo-labs">' +
        cell(row, 'labs', 'Laboratorios') +
        '</td>' +
        '<td class="censo-data-cell censo-signos">' +
        colMultiline(row, 'signosCol') +
        '</td>' +
        '<td class="censo-data-cell censo-io">' +
        colMultiline(row, 'ioCol') +
        '</td>' +
        '<td class="censo-data-cell censo-acc">' +
        cell(row, 'accesos', 'Accesos') +
        '</td>' +
        '<td class="censo-data-cell censo-cult">' +
        cell(row, 'cultivos', 'Cultivos') +
        '</td>' +
        '<td class="censo-data-cell censo-pend">' +
        cell(row, 'pendientes', 'Pendientes') +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
    '<title>Censo ' +
    esc(header.fecha) +
    '</title>' +
    '<style>' +
    '@page{size:legal landscape;margin:10mm}' +
    'body{font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:10px;line-height:1.35;color:#1a2332;margin:0;padding:12px 14px;background:#fff}' +
    'h1{margin:0 0 2px;font-size:15px;font-weight:700;letter-spacing:-0.01em}' +
    '.sub{color:#5c6778;font-size:8.5px;margin-bottom:10px;line-height:1.4}' +
    '.mes{text-align:center;font-weight:700;color:#4a52e8;font-size:11px;margin:-24px 0 10px;letter-spacing:0.04em}' +
    'table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}' +
    'th,td{border:1px solid #d4dae3;padding:5px 6px;word-wrap:break-word;overflow-wrap:anywhere}' +
    'th.censo-th{background:#eef1f6;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#3b42c9;vertical-align:middle;text-align:center;white-space:nowrap;line-height:1.2;padding:6px 4px}' +
    'th.censo-th.censo-bold{font-weight:800}' +
    'tbody td.censo-data-cell{vertical-align:middle}' +
    'tr.alt td{background:#f7f8fb}' +
    '.censo-line{display:block;line-height:1.28;margin:0}' +
    '.censo-line + .censo-line{margin-top:1px}' +
    '.censo-line--empty{color:#9aa3b2;font-weight:400}' +
    'td.censo-center .censo-line{text-align:center;margin-left:auto;margin-right:auto}' +
    '.censo-line--muted{color:#5c6778;font-size:8px;font-weight:400}' +
    '.censo-line--emphasis{font-weight:700;color:#1a2332}' +
    '.censo-line--lab-date{font-weight:700;color:#4a52e8;font-size:8px;margin-bottom:2px}' +
    '.censo-line--lab-panel{font-weight:600;font-size:7.5px;font-family:"IBM Plex Mono",ui-monospace,monospace;letter-spacing:-0.01em}' +
    '.censo-line--label-led{font-size:8px;font-weight:600}' +
    'td.censo-labs .censo-line{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:7.5px;line-height:1.28}' +
    'td.censo-signos,td.censo-io,td.censo-pend,td.censo-acc,td.censo-cult{font-size:8px;text-align:left}' +
    'td.censo-paciente,td.censo-dx,td.censo-meds{text-align:center}' +
    'td.censo-paciente{font-size:8.5px}' +
    'td.censo-dx{font-weight:700;font-size:8px;line-height:1.25}' +
    'td.censo-meds{font-size:7.5px;line-height:1.28}' +
    'td.censo-acc,td.censo-cult{font-size:8px}' +
    '.censo-center{text-align:center;vertical-align:middle}' +
    '.censo-bold{font-weight:700}' +
    'td.censo-num,td.censo-cama{padding:4px 2px;text-align:center;vertical-align:middle}' +
    'td.censo-num .censo-num-val{color:#4a52e8;font-weight:700}' +
    'td.censo-cama .censo-cama-vline{display:block;margin:0 auto}' +
    '.censo-cama-vline{font-weight:700;font-size:9px;color:#4a52e8;writing-mode:vertical-rl;text-orientation:mixed;line-height:1;white-space:nowrap}' +
    '.censo-paciente-nombre,.censo-line--emphasis.censo-paciente-nombre{font-weight:700;color:#1a2332}' +
    censoColgroupCssRules() +
    '</style></head><body>' +
    '<h1>' +
    esc(titleLine) +
    '</h1>' +
    (header.mes ? '<div class="mes">' + esc(header.mes) + '</div>' : '') +
    '<div class="sub">' +
    (equipoLine ? esc(equipoLine) : '') +
    (equipoLine && header.fecha ? ' · ' : '') +
    (header.fecha ? esc(header.fecha) : '') +
    '</div>' +
    '<table><colgroup>' +
    censoColgroupHtml() +
    '</colgroup>' +
    '<thead><tr>' +
    censoTheadRowHtml() +
    '</tr></thead>' +
    '<tbody>' +
    body +
    '</tbody></table></body></html>'
  );
}

function ensureCensoPreviewModal() {
  var existing = document.getElementById('censo-preview-backdrop');
  if (existing) return existing;
  var backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop censo-preview-backdrop';
  backdrop.id = 'censo-preview-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.innerHTML =
    '<div class="modal censo-preview-modal" role="dialog" aria-modal="true" aria-labelledby="censo-preview-title">' +
    '<div class="censo-preview-modal-head">' +
    '<h3 id="censo-preview-title" class="modal-title">Vista previa del censo</h3>' +
    '<p class="profile-hint censo-preview-hint">Así se verá el PDF. Usa Imprimir para guardar como PDF desde el sistema.</p>' +
    '</div>' +
    '<iframe id="censo-preview-frame" class="censo-preview-frame" title="Vista previa del censo"></iframe>' +
    '<div class="modal-actions">' +
    '<button type="button" class="btn-med-secondary" id="censo-preview-close">Cerrar</button>' +
    '<button type="button" class="btn-generate" id="censo-preview-print">Imprimir</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);

  if (!ensureCensoPreviewModal._wired) {
    ensureCensoPreviewModal._wired = true;
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeCensoPreviewModal();
    });
    document.getElementById('censo-preview-close')?.addEventListener('click', closeCensoPreviewModal);
    document.getElementById('censo-preview-print')?.addEventListener('click', function () {
      var frame = document.getElementById('censo-preview-frame');
      try {
        frame?.contentWindow?.print();
      } catch (_e) {
        /* noop */
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var el = document.getElementById('censo-preview-backdrop');
      if (el?.classList.contains('open')) closeCensoPreviewModal();
    });
  }

  return backdrop;
}

export function closeCensoPreviewModal() {
  var backdrop = document.getElementById('censo-preview-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('censo-preview-open');
  var frame = document.getElementById('censo-preview-frame');
  if (frame) frame.removeAttribute('srcdoc');
}

/**
 * Vista previa dentro de la app (sin ventanas emergentes).
 * @param {{ header?: Record<string, string>, rows?: Array<Record<string, unknown>> }} payload
 * @returns {boolean}
 */
export function openCensoPreviewInApp(payload) {
  var html = renderCensoPreviewHtml(payload);
  var backdrop = ensureCensoPreviewModal();
  var frame = document.getElementById('censo-preview-frame');
  if (!frame) return false;
  frame.srcdoc = html;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('censo-preview-open');
  return true;
}

/**
 * @deprecated Usar openCensoPreviewInApp.
 * @param {{ header?: Record<string, string>, rows?: Array<Record<string, unknown>> }} payload
 */
export function openCensoPreviewWindow(payload) {
  return openCensoPreviewInApp(payload);
}
