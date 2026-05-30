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
      .map(function (l) {
        return '<span class="meta">' + esc(l) + '</span>';
      })
      .join('<br>');
  }

  function cell(row, key, fallbackLabel) {
    var v = row[key];
    if (v) return esc(v).replace(/\n/g, '<br>');
    var sec = (row.sections || []).find(function (s) {
      return s.label === fallbackLabel;
    });
    return sec ? esc(sec.lines.join('\n')).replace(/\n/g, '<br>') : '—';
  }

  var body = rows
    .map(function (row, idx) {
      var pend = cell(row, 'pendientes', 'Pendientes');
      if (row.signos) {
        var sig = esc(row.signos).replace(/\n/g, '<br>');
        pend = sig + (pend !== '—' ? '<br>' + pend : '');
      }
      return (
        '<tr class="' +
        (idx % 2 ? 'alt' : '') +
        '">' +
        '<td>' +
        esc(row.num) +
        '</td>' +
        '<td class="censo-cama-v">' +
        esc(row.cama).replace(/\n/g, '<br>') +
        '</td>' +
        '<td class="censo-center">' +
        pacienteCell(row) +
        '</td>' +
        '<td class="censo-center censo-bold">' +
        cell(row, 'dx', 'Diagnósticos') +
        '</td>' +
        '<td class="censo-center">' +
        cell(row, 'meds', 'ATB / Medicamentos') +
        '</td>' +
        '<td>' +
        cell(row, 'labs', 'Laboratorios') +
        '</td>' +
        '<td>' +
        cell(row, 'accesos', 'Accesos') +
        '</td>' +
        '<td>' +
        cell(row, 'cultivos', 'Cultivos') +
        '</td>' +
        '<td>' +
        pend +
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
    'body{font-family:system-ui,sans-serif;font-size:11px;line-height:1.4;color:#1a1d24;margin:0;padding:12px 14px}' +
    'h1{margin:0 0 2px;font-size:16px}' +
    '.sub{color:#5c6370;font-size:8px;margin-bottom:8px}' +
    '.mes{text-align:center;font-weight:700;color:#1e4d72;font-size:12px;margin:-22px 0 8px}' +
    'table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}' +
    'th,td{border:1px solid #d0d4dc;padding:3px 4px;vertical-align:middle;word-wrap:break-word}' +
    'th{background:#eef1f5;font-size:9px;text-transform:uppercase;color:#1e4d72}' +
    'tr.alt td{background:#f8f9fb}' +
    '.meta{color:#5c6370;font-weight:400}' +
    '.censo-center{text-align:center;vertical-align:middle}' +
    '.censo-bold{font-weight:700}' +
    '.censo-cama-v{width:2.5%;text-align:center;vertical-align:middle;font-weight:700;writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;padding:4px 2px}' +
    'th.censo-cama-v,th.censo-center{text-align:center}' +
    'col.num{width:3%}col.cama{width:2.5%}col.pac{width:10%}col.dx{width:14%}col.med{width:11%}col.lab{width:18%}col.acc{width:6%}col.cult{width:12%}col.pend{width:11%}' +
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
    '<table><colgroup><col class="num"><col class="cama"><col class="pac"><col class="dx"><col class="med"><col class="lab"><col class="acc"><col class="cult"><col class="pend"></colgroup>' +
    '<thead><tr><th>#</th><th class="censo-cama-v">Cama</th><th class="censo-center">Paciente</th><th class="censo-center censo-bold">Dx</th><th class="censo-center">ATB/Meds</th><th>Labs</th><th>Accesos</th><th>Cultivos</th><th>Pend.</th></tr></thead>' +
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
  return true;
}

/**
 * @deprecated Usar openCensoPreviewInApp.
 * @param {{ header?: Record<string, string>, rows?: Array<Record<string, unknown>> }} payload
 */
export function openCensoPreviewWindow(payload) {
  return openCensoPreviewInApp(payload);
}
