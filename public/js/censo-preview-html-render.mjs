import { parseCamaCellForCenso, formatCamaCellLabel } from './censo-build.mjs';
import { classifyCensoTableLine } from './censo-table-style.mjs';
import {
  censoColgroupCssRules,
  censoColgroupHtml,
  censoTheadRowHtml,
  resolveCensoColWeights,
} from './censo-table-columns.mjs';

import { escHtml as escCensoHtml } from './dom-escape.mjs';
export function censoLineClass(role) {
  if (role === 'muted') return 'censo-line censo-line--muted';
  if (role === 'emphasis') return 'censo-line censo-line--emphasis';
  if (role === 'lab-date') return 'censo-line censo-line--lab-date';
  if (role === 'lab-panel') return 'censo-line censo-line--lab-panel';
  if (role === 'label-led') return 'censo-line censo-line--label-led';
  return 'censo-line';
}

export function renderCensoLines(text, colKey) {
  var raw = String(text || '').trim();
  if (!raw) {
    if (colKey === 'accesos' || colKey === 'cultivos' || colKey === 'pendientes') return '';
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
      return '<span class="' + censoLineClass(role) + '">' + escCensoHtml(l) + '</span>';
    })
    .join('');
}

export function renderCensoPacienteCell(row) {
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
      var cls = censoLineClass(role);
      if (i === 0) cls += ' censo-paciente-nombre';
      return '<span class="' + cls + '">' + escCensoHtml(l) + '</span>';
    })
    .join('');
}

export function renderCensoCamaCell(camaText) {
  var label = formatCamaCellLabel(parseCamaCellForCenso(camaText));
  if (label === '—') return '—';
  return '<span class="censo-cama-vline">' + escCensoHtml(label) + '</span>';
}

export function renderCensoSectionCell(row, key, fallbackLabel) {
  var v = row[key];
  if (v) return renderCensoLines(v, key);
  var sec = (row.sections || []).find(function (s) {
    return s.label === fallbackLabel;
  });
  if (!sec) {
    if (key === 'accesos' || key === 'cultivos' || key === 'pendientes') return '';
    return '<span class="censo-line censo-line--empty">—</span>';
  }
  return renderCensoLines(sec.lines.join('\n'), key);
}

export function renderCensoColMultiline(row, key) {
  var v = String(row[key] || '').trim();
  if (!v) return '';
  return renderCensoLines(v, key);
}

function censoPreviewCellClass(key) {
  if (key === 'paciente') return 'censo-paciente';
  if (key === 'dx') return 'censo-dx';
  if (key === 'meds') return 'censo-meds';
  if (key === 'labs') return 'censo-labs';
  if (key === 'signos') return 'censo-signos';
  if (key === 'io') return 'censo-io';
  if (key === 'accesos') return 'censo-acc';
  if (key === 'cultivos') return 'censo-cult';
  if (key === 'pend') return 'censo-pend';
  if (key === 'num') return 'censo-num';
  if (key === 'cama') return 'censo-cama';
  return key;
}

function renderCensoPreviewCell(row, key) {
  if (key === 'num') {
    return (
      '<td class="censo-data-cell censo-center censo-bold censo-num">' +
      '<span class="censo-num-val">' +
      escCensoHtml(row.num) +
      '</span></td>'
    );
  }
  if (key === 'cama') {
    return (
      '<td class="censo-data-cell censo-center censo-bold censo-cama">' +
      renderCensoCamaCell(row.cama) +
      '</td>'
    );
  }
  if (key === 'paciente') {
    return '<td class="censo-data-cell censo-center censo-paciente">' + renderCensoPacienteCell(row) + '</td>';
  }
  if (key === 'dx') {
    return '<td class="censo-data-cell censo-center censo-dx">' + renderCensoSectionCell(row, 'dx', 'Diagnósticos') + '</td>';
  }
  if (key === 'meds') {
    return '<td class="censo-data-cell censo-center censo-meds">' + renderCensoSectionCell(row, 'meds', 'ATB / Medicamentos') + '</td>';
  }
  if (key === 'labs') {
    return '<td class="censo-data-cell censo-labs">' + renderCensoSectionCell(row, 'labs', 'Laboratorios') + '</td>';
  }
  if (key === 'signos') {
    return '<td class="censo-data-cell censo-signos">' + renderCensoColMultiline(row, 'signosCol') + '</td>';
  }
  if (key === 'io') {
    return '<td class="censo-data-cell censo-io">' + renderCensoColMultiline(row, 'ioCol') + '</td>';
  }
  if (key === 'accesos') {
    return '<td class="censo-data-cell censo-acc">' + renderCensoSectionCell(row, 'accesos', 'Accesos') + '</td>';
  }
  if (key === 'cultivos') {
    return '<td class="censo-data-cell censo-cult">' + renderCensoSectionCell(row, 'cultivos', 'Cultivos') + '</td>';
  }
  if (key === 'pend') {
    return '<td class="censo-data-cell censo-pend">' + renderCensoSectionCell(row, 'pendientes', 'Pendientes') + '</td>';
  }
  return '<td class="censo-data-cell ' + censoPreviewCellClass(key) + '"></td>';
}

export function buildCensoPreviewBodyHtml(rows, weights) {
  var cols = resolveCensoColWeights(rows || []);
  if (weights && weights.length) cols = weights;
  return (rows || [])
    .map(function (row, idx) {
      return (
        '<tr class="' +
        (idx % 2 ? 'alt' : '') +
        '">' +
        cols
          .map(function (col) {
            return renderCensoPreviewCell(row, col.key);
          })
          .join('') +
        '</tr>'
      );
    })
    .join('');
}

export const CENSO_PREVIEW_STYLES =
  '@page{size:legal landscape;margin:10mm}' +
  'body{font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:10px;line-height:1.35;color:#1a2332;margin:0;padding:12px 14px;background:#fff}' +
  'h1{margin:0 0 2px;font-size:15px;font-weight:700;letter-spacing:-0.01em}' +
  '.sub{color:#5c6778;font-size:8.5px;margin-bottom:10px;line-height:1.4}' +
  '.mes{text-align:center;font-weight:700;color:var(--color-accent);font-size:11px;margin:-24px 0 10px;letter-spacing:0.04em}' +
  'table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}' +
  'th,td{border:1px solid #d4dae3;padding:5px 6px;word-wrap:break-word;overflow-wrap:anywhere}' +
  'th.censo-th{background:#eef1f6;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-ink-muted);vertical-align:middle;text-align:center;white-space:nowrap;line-height:1.2;padding:6px 4px}' +
  'th.censo-th.censo-bold{font-weight:800}' +
  'tbody td.censo-data-cell{vertical-align:middle}' +
  'tr.alt td{background:#f7f8fb}' +
  '.censo-line{display:block;line-height:1.28;margin:0}' +
  '.censo-line + .censo-line{margin-top:1px}' +
  '.censo-line--empty{color:#9aa3b2;font-weight:400}' +
  'td.censo-center .censo-line{text-align:center;margin-left:auto;margin-right:auto}' +
  '.censo-line--muted{color:#5c6778;font-size:8px;font-weight:400}' +
  '.censo-line--emphasis{font-weight:700;color:#1a2332}' +
  '.censo-line--lab-date{font-weight:700;color:var(--color-accent);font-size:8px;margin-bottom:2px}' +
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
  'td.censo-num .censo-num-val{color:var(--color-accent);font-weight:700}' +
  'td.censo-cama .censo-cama-vline{display:block;margin:0 auto}' +
  '.censo-cama-vline{font-weight:700;font-size:9px;color:var(--color-accent);writing-mode:vertical-rl;text-orientation:mixed;line-height:1;white-space:nowrap}' +
  '.censo-paciente-nombre,.censo-line--emphasis.censo-paciente-nombre{font-weight:700;color:#1a2332}';

export function buildCensoPreviewStyles(weights) {
  return CENSO_PREVIEW_STYLES + censoColgroupCssRules(weights);
}

export function buildCensoPreviewDocumentHtml(header, bodyHtml, rows) {
  var weights = resolveCensoColWeights(rows || []);
  var titleLine = header.titleLine || 'Censo de Sala';
  var equipoLine = header.equipoLine || '';
  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
    '<title>Censo ' +
    escCensoHtml(header.fecha) +
    '</title>' +
    '<style>' +
    buildCensoPreviewStyles(weights) +
    '</style></head><body>' +
    '<h1>' +
    escCensoHtml(titleLine) +
    '</h1>' +
    (header.mes ? '<div class="mes">' + escCensoHtml(header.mes) + '</div>' : '') +
    '<div class="sub">' +
    (equipoLine ? escCensoHtml(equipoLine) : '') +
    (equipoLine && header.fecha ? ' · ' : '') +
    (header.fecha ? escCensoHtml(header.fecha) : '') +
    '</div>' +
    '<table><colgroup>' +
    censoColgroupHtml(weights) +
    '</colgroup>' +
    '<thead><tr>' +
    censoTheadRowHtml(weights) +
    '</tr></thead>' +
    '<tbody>' +
    bodyHtml +
    '</tbody></table></body></html>'
  );
}
