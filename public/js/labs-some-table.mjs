/**
 * Parser y exportación de tablas SOME por tipo de estudio (departamento + subgrupo).
 * Complementa procesarLabs: conserva filas tabulares del reporte original.
 */
import { buildTableTsv, copyTableModelAsPng, copyTableText } from './tend-export.mjs';

export const SOME_DEPARTMENTS = [
  'HEMATOLOGIA',
  'QUIMICA CLINICA',
  'BACTERIOLOGIA',
  'GASOMETRIA',
  'GASOMETRIAS',
  'INMUNOLOGIA',
  'COAGULACION',
  'URIANALISIS',
  'EXAMEN GENERAL DE ORINA',
  'ANALISIS DE ORINA',
  'CULTIVO',
  'BANDEJA',
];

const DEPT_RE = new RegExp(
  '^(' +
    SOME_DEPARTMENTS.map(function (d) {
      return d.replace(/\s+/g, '\\s+');
    }).join('|') +
    ')$',
  'i'
);

function normLine(raw) {
  return String(raw == null ? '' : raw).replace(/\r/g, '').trim();
}

function cleanValue(raw) {
  return normLine(raw).replace(/^\*+\s*/, '').trim();
}

function cleanEstudio(raw) {
  return normLine(raw).replace(/\t+$/, '').trim();
}

function isTableHeaderLine(line) {
  var u = line.toUpperCase();
  return /ESTUDIO/.test(u) && /RESULTADO/.test(u);
}

function isDepartmentLine(line) {
  var c = cleanEstudio(line).toUpperCase();
  return DEPT_RE.test(c);
}

function departmentKey(line) {
  var c = cleanEstudio(line).toUpperCase();
  var m = c.match(DEPT_RE);
  if (!m) return '';
  var hit = SOME_DEPARTMENTS.find(function (d) {
    return d.replace(/\s+/g, ' ') === m[1].replace(/\s+/g, ' ');
  });
  return hit || m[1];
}

function isFlagToken(tok) {
  return /^[*AB]$/.test(String(tok || '').trim());
}

function isMetadataLine(line) {
  var t = line.trim();
  if (!t) return true;
  if (/^(Expediente|Solicitud|Nombre|Sexo|Edad|Ubicaci[oó]n|M[eé]dico|Fecha\s+Registro)\s*:/i.test(t)) {
    return true;
  }
  if (/^[A-Za-z]{3}\s+\d{1,2}\s+\d{4}/.test(t) && t.indexOf('\t') !== -1) return true;
  return false;
}

function isLikelyGroupTitle(line, nextLines, currentGroupTitle) {
  var name = cleanEstudio(line);
  if (!name || isTableHeaderLine(name) || isDepartmentLine(name)) return false;
  if (isFlagToken(name)) return false;
  if (/^\d+([.,]\d+)?$/.test(name)) return false;
  if (name === ':') return false;
  if (looksLikeUnitsRefLine(name)) return false;
  if (currentGroupTitle && name.toUpperCase() === String(currentGroupTitle).toUpperCase()) return false;
  if (!/[A-ZÁÉÍÓÚÑ]/.test(name)) return false;
  var upper = name.toUpperCase();
  if (upper !== name && upper.replace(/[^A-ZÁÉÍÓÚÑ0-9\s/().-]/g, '') !== upper) return false;

  for (var i = 0; i < Math.min(nextLines.length, 4); i++) {
    var n = cleanEstudio(nextLines[i]);
    if (!n) continue;
    if (isTableHeaderLine(n)) return true;
    if (isDepartmentLine(n)) return true;
    if (isFlagToken(n)) {
      if (i === 0 && n === name) continue;
      return i > 0;
    }
    if (n.toUpperCase() === upper && i <= 1) return true;
    if (n.toUpperCase().indexOf(upper + ' ') === 0) return true;
    break;
  }
  return (
    name.length > 22 ||
    /\b(CITOQUIMICO DE|LIQUIDOS CORPORALES|BIOMETRIA HEMATICA|TIEMPO DE|EXAMEN GENERAL|FISICOQUIMICO|FIBRAS VEGETALES|COMENTARIO DE MUESTRA|RELACION A\/G|PROTEINAS TOTALES|GLOBULINA|BILIRRUBINA|CREATININA|COLESTEROL|TRIGLICERIDOS|PLAQUETAS CON|FROTIS|VELOCIDAD DE)\b/i.test(
      name
    )
  );
}

function looksLikeUnitsRefLine(line) {
  var t = String(line || '').trim();
  if (!t) return false;
  if (/\t/.test(t)) {
    var left = t.split('\t')[0].trim();
    if (left && !/^\d/.test(left)) return true;
    if (/\d/.test(t)) return true;
  }
  if (/^(NEGATIVO|POSITIVO|AUSENTE|AUSENTES|N\/A|NA)$/i.test(t)) return true;
  if (/^\d/.test(t) && /\s-\s/.test(t)) return true;
  if (/^(g\/dL|mg\/dL|mmol\/L|K\/uL|M\/uL|mm\/hr|mm3|\/CAMPO|UI\/L|IU\/L|E\.U\.|%|SEG\.?|fL|pg)$/i.test(t)) {
    return true;
  }
  if (/^[A-Za-z][A-Za-z0-9/.%\-]*\/[A-Za-z0-9/.%\-]+$/i.test(t)) return true;
  return false;
}

function parseUnitsRef(line) {
  var t = String(line || '').trim();
  if (!t) return { unidades: '', ref: '' };
  var tab = t.indexOf('\t');
  if (tab >= 0) {
    return {
      unidades: t.slice(0, tab).trim(),
      ref: t.slice(tab + 1).trim(),
    };
  }
  if (/^\d/.test(t) && /\s-\s/.test(t) && !/[a-zA-Z]{3,}/.test(t.split(/\s-\s/)[0])) {
    return { unidades: '', ref: t };
  }
  if (/^(NEGATIVO|POSITIVO|AUSENTE|AUSENTES|N\/A|NA)$/i.test(t)) {
    return { unidades: '', ref: t };
  }
  return { unidades: t, ref: '' };
}

function finalizeRow(estudio, flag, valueParts) {
  var est = cleanEstudio(estudio);
  if (!est) return null;
  var flagTok = isFlagToken(flag) ? flag.trim() : '*';
  var value = '';
  var unidades = '';
  var ref = '';
  for (var i = 0; i < valueParts.length; i++) {
    var p = cleanValue(valueParts[i]);
    if (!p) continue;
    if (!value && p !== ':') {
      value = p;
      continue;
    }
    var ur = parseUnitsRef(p);
    if (!unidades && ur.unidades) unidades = ur.unidades;
    if (!ref && ur.ref) ref = ur.ref;
    if (!unidades && !ref && p !== value) {
      if (/^\d/.test(p) && /\s-\s/.test(p)) ref = p;
      else if (!unidades) unidades = p;
    }
  }
  return {
    estudio: est,
    flag: flagTok,
    resultado: value,
    unidades: unidades,
    ref: ref,
    abnormal: flagTok === 'A' || flagTok === 'B',
  };
}

function readRowAt(lines, startIdx, currentGroupTitle) {
  var estudio = cleanEstudio(lines[startIdx]);
  if (!estudio || isFlagToken(estudio) || isTableHeaderLine(estudio) || isDepartmentLine(estudio)) {
    return null;
  }

  var j = startIdx + 1;
  var flag = '*';
  var parts = [];

  while (j < lines.length) {
    var raw = lines[j];
    var t = cleanEstudio(raw);
    j++;
    if (!t) continue;
    if (isTableHeaderLine(t) || isDepartmentLine(t)) {
      j--;
      break;
    }
    if (!parts.length && isFlagToken(t)) {
      flag = t;
      continue;
    }
    if (isLikelyGroupTitle(t, lines.slice(j), currentGroupTitle)) {
      j--;
      break;
    }
    parts.push(t);
    if (looksLikeUnitsRefLine(t)) break;
    if (parts.length >= 1) {
      var nxt = cleanEstudio(lines[j] || '');
      var nxtFlag = cleanEstudio(lines[j + 1] || '');
      if (nxt && isFlagToken(nxtFlag)) break;
    }
    if (parts.length >= 4) break;
  }

  var row = finalizeRow(estudio, flag, parts);
  if (!row) return null;
  return { row: row, nextIdx: j };
}

/**
 * @param {string} textoBruto — reporte SOME completo
 * @returns {{ departments: Array<{ key: string, label: string, groups: Array<{ title: string, rows: object[] }> }> }}
 */
export function parseSomeReportTables(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') {
    return { departments: [] };
  }

  var lines = textoBruto.replace(/\r/g, '').split('\n');
  var departments = [];
  var currentDept = null;
  var currentGroup = null;

  function ensureDept(key) {
    if (currentDept && currentDept.key === key) return currentDept;
    currentDept = { key: key, label: key, groups: [] };
    departments.push(currentDept);
    currentGroup = null;
    return currentDept;
  }

  function ensureGroup(title) {
    if (!currentDept) return null;
    var t = title || '';
    if (currentGroup && currentGroup.title === t) return currentGroup;
    currentGroup = { title: t, rows: [] };
    currentDept.groups.push(currentGroup);
    return currentGroup;
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = cleanEstudio(line);
    if (!trimmed || isMetadataLine(trimmed)) continue;

    if (isDepartmentLine(trimmed)) {
      ensureDept(departmentKey(trimmed));
      currentGroup = null;
      continue;
    }

    if (isTableHeaderLine(trimmed)) continue;

    if (!currentDept) continue;

    if (isLikelyGroupTitle(trimmed, lines.slice(i + 1), currentGroup && currentGroup.title)) {
      ensureGroup(trimmed);
      var dup = cleanEstudio(lines[i + 1] || '');
      if (dup && dup.toUpperCase() === trimmed.toUpperCase()) {
        var parsedDup = readRowAt(lines, i + 1, trimmed);
        if (parsedDup && parsedDup.row) {
          currentGroup.rows.push(parsedDup.row);
          i = parsedDup.nextIdx - 1;
        } else {
          i++;
        }
      }
      continue;
    }

    var parsed = readRowAt(lines, i, currentGroup && currentGroup.title);
    if (!parsed || !parsed.row) continue;
    if (!currentGroup) ensureGroup('');
    currentGroup.rows.push(parsed.row);
    i = parsed.nextIdx - 1;
  }

  departments.forEach(function (dept) {
    dept.groups = dept.groups.filter(function (g) {
      return g.rows.length > 0;
    });
  });

  return {
    departments: departments.filter(function (d) {
      return d.groups.length > 0;
    }),
  };
}

export function buildSomeGroupExportModel(group) {
  var rows = (group && group.rows) || [];
  return {
    columns: [
      { header: 'Resultado', hidden: false },
      { header: 'Unidades', hidden: false },
      { header: 'Valor de Referencia', hidden: false },
    ],
    rows: rows.map(function (r) {
      var resTxt = r.resultado || '';
      if (r.flag && r.flag !== '*' && resTxt) resTxt = resTxt + ' (' + r.flag + ')';
      else if (r.flag && r.flag !== '*' && !resTxt) resTxt = r.flag;
      return {
        label: r.estudio,
        hidden: false,
        cells: [
          { text: resTxt || '—', abnormal: r.abnormal },
          { text: r.unidades || '', abnormal: false },
          { text: r.ref || '', abnormal: false },
        ],
      };
    }),
  };
}

export function buildSomeGroupTsv(group, title) {
  var model = buildSomeGroupExportModel(group);
  var tsv = buildTableTsv(model);
  if (!tsv) return '';
  var lines = tsv.split('\n');
  if (lines.length) lines[0] = lines[0].replace(/^Analito\t/, 'Estudio\t');
  if (title) lines.unshift(String(title));
  return lines.join('\n');
}

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderSomeTableGroupHtml(group, opts) {
  var options = opts || {};
  var rows = (group && group.rows) || [];
  if (!rows.length) return '';

  var title = group.title ? String(group.title) : '';
  var tableId = options.tableId || '';
  var exportLabel = options.exportLabel || title || 'Tabla';

  var html = '<div class="lab-some-group"' + (tableId ? ' data-table-id="' + escHtml(tableId) + '"' : '') + '>';
  if (title) {
    html += '<div class="lab-some-group-title">' + escHtml(title) + '</div>';
  }
  html +=
    '<div class="lab-some-table-toolbar">' +
    '<button type="button" class="lab-some-export-btn" data-export="tsv" data-label="' +
    escHtml(exportLabel) +
    '" title="Copiar tabla como texto">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
    'TSV</button>' +
    '<button type="button" class="lab-some-export-btn" data-export="png" data-label="' +
    escHtml(exportLabel) +
    '" title="Copiar tabla como imagen">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
    'PNG</button>' +
    '</div>';
  html += '<div class="lab-some-table-wrap"><table class="lab-some-table"><thead><tr>';
  html += '<th>Estudio</th><th>Resultado</th><th>Unidades</th><th>Valor de Referencia</th>';
  html += '</tr></thead><tbody>';
  rows.forEach(function (r) {
    var resClass = r.abnormal ? ' lab-some-abnormal' : '';
    var flagHtml =
      r.flag && r.flag !== '*'
        ? '<span class="lab-some-flag">' + escHtml(r.flag) + '</span> '
        : '';
    html += '<tr>';
    html += '<td class="lab-some-estudio">' + escHtml(r.estudio) + '</td>';
    html +=
      '<td class="lab-some-resultado' +
      resClass +
      '">' +
      flagHtml +
      escHtml(r.resultado || '—') +
      '</td>';
    html += '<td class="lab-some-unidades">' + escHtml(r.unidades || '') + '</td>';
    html += '<td class="lab-some-ref">' + escHtml(r.ref || '') + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

export function renderSomeReportTablesHtml(parsed, opts) {
  var options = opts || {};
  if (!parsed || !parsed.departments || !parsed.departments.length) return '';

  var html = '<div class="lab-some-tables">';
  parsed.departments.forEach(function (dept, di) {
    html += '<section class="lab-some-dept" data-dept="' + escHtml(dept.key) + '">';
    html += '<header class="lab-some-dept-header">' + escHtml(dept.label) + '</header>';
    dept.groups.forEach(function (group, gi) {
      var tableId = 'some-' + di + '-' + gi;
      html += renderSomeTableGroupHtml(group, {
        tableId: tableId,
        exportLabel: (dept.label + (group.title ? ' — ' + group.title : '')).trim(),
      });
    });
    html += '</section>';
  });
  html += '</div>';
  return html;
}

export function exportSomeGroupCopy(group, format, title, onDone) {
  var done = typeof onDone === 'function' ? onDone : function () {};
  var model = buildSomeGroupExportModel(group);
  if (format === 'png') {
    copyTableModelAsPng(model, title || 'Tabla SOME', done);
    return;
  }
  copyTableText(buildSomeGroupTsv(group, title || ''), done);
}

export function wireSomeTableExportButtons(container, onToast) {
  if (!container) return;
  container.querySelectorAll('.lab-some-export-btn').forEach(function (btn) {
    if (btn.dataset.someWired === '1') return;
    btn.dataset.someWired = '1';
    btn.addEventListener('click', function () {
      var groupEl = btn.closest('.lab-some-group');
      var deptEl = btn.closest('.lab-some-dept');
      if (!groupEl || !deptEl) return;
      var deptKey = deptEl.getAttribute('data-dept') || '';
      var titleEl = groupEl.querySelector('.lab-some-group-title');
      var groupTitle = titleEl ? titleEl.textContent.trim() : '';
      var label = btn.getAttribute('data-label') || deptKey;
      var rows = [];
      groupEl.querySelectorAll('tbody tr').forEach(function (tr) {
        var tds = tr.querySelectorAll('td');
        if (tds.length < 4) return;
        var estudio = (tds[0].textContent || '').trim();
        var resCell = tds[1];
        var flagEl = resCell.querySelector('.lab-some-flag');
        var flag = flagEl ? flagEl.textContent.trim() : '*';
        var resultado = (resCell.textContent || '').replace(/^[AB]\s*/, '').trim();
        rows.push({
          estudio: estudio,
          flag: flag,
          resultado: resultado === '—' ? '' : resultado,
          unidades: (tds[2].textContent || '').trim(),
          ref: (tds[3].textContent || '').trim(),
          abnormal: resCell.classList.contains('lab-some-abnormal'),
        });
      });
      var group = { title: groupTitle, rows: rows };
      exportSomeGroupCopy(group, btn.getAttribute('data-export'), label, function (ok) {
        if (typeof onToast === 'function') {
          onToast(
            ok ? 'Tabla copiada ✓' : 'No se pudo copiar la tabla',
            ok ? 'success' : 'error'
          );
        }
      });
    });
  });
}
