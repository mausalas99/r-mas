/**
 * Shared UI field kit for HF objective-data forms (Part C, Phase 2).
 * Generalizes the tri-state select first built inline in
 * `estado-actual-cardio-html.mjs`, adds an enum-backed select (reads option
 * lists from `lib/cardio/hf-enums.mjs`) with a "(valor previo)" fallback for
 * legacy free-typed values, a large narrative textarea, a generic
 * Previo/Actual table renderer for labs/echo/scores screens, and repeatable-row
 * helpers for comorbilidades/medicamentos-previos lists — mirroring the
 * add/remove/field-update shape of `medications-cardio-rows.mjs` and the
 * data-attribute row markup of `medications-cardio-html.mjs`.
 */
import { escHtml, escAttr } from '../../dom-escape.mjs';

/**
 * @param {string} dataAttr data-attribute suffix, e.g. "ea-cardio-pocus"
 * @param {string} key field key stored under that data attribute
 * @param {unknown} val true|false|null
 */
export function triSelect(dataAttr, key, val) {
  var v = val === true ? 'true' : val === false ? 'false' : '';
  function opt(value, label) {
    return '<option value="' + value + '"' + (v === value ? ' selected' : '') + '>' + label + '</option>';
  }
  return (
    '<select class="ea-input" data-' + dataAttr + '="' + escAttr(key) + '">' +
    opt('', '—') +
    opt('true', 'Sí') +
    opt('false', 'No') +
    '</select>'
  );
}

/**
 * @param {unknown} val
 * @param {Array<{value: string, label: string}>} options
 * @returns {string} `<option>` markup, including a trailing "(valor previo)"
 *   fallback option when `val` is set but doesn't match any option value —
 *   this preserves legacy free-typed data instead of silently dropping it.
 */
function enumOptionsHtml(val, options) {
  var v = val == null ? '' : String(val);
  var matched = false;
  var opts = (options || [])
    .map(function (o) {
      var ov = String(o.value);
      if (v !== '' && ov === v) matched = true;
      return '<option value="' + escAttr(ov) + '"' + (v === ov ? ' selected' : '') + '>' + escHtml(o.label) + '</option>';
    })
    .join('');
  var extra = v !== '' && !matched ? '<option value="' + escAttr(v) + '" selected>' + escHtml(v) + ' (valor previo)</option>' : '';
  return '<option value="">—</option>' + opts + extra;
}

/**
 * @param {string} dataAttr data-attribute suffix, e.g. "ea-cardio"
 * @param {string} key field key stored under that data attribute
 * @param {unknown} val current value (may be a legacy value not in `options`)
 * @param {Array<{value: string, label: string}>} options from hf-enums.mjs
 */
export function enumSelect(dataAttr, key, val, options) {
  return (
    '<select class="ea-input" data-' + dataAttr + '="' + escAttr(key) + '">' + enumOptionsHtml(val, options) + '</select>'
  );
}

/**
 * @param {string} dataAttr data-attribute suffix
 * @param {string} key field key stored under that data attribute
 * @param {unknown} val
 * @param {string} label
 * @param {{ rows?: number, widthPct?: number }} [opts] `rows` shortens the
 *   textarea (default 5) and `widthPct` lets two narratives sit side by side
 *   in a flex row instead of always stacking full-width — used to fit two
 *   narratives into one wizard step without vertical scroll.
 */
export function narrativeTextarea(dataAttr, key, val, label, opts) {
  var o = opts || {};
  var rows = o.rows || 5;
  var widthPct = o.widthPct || 100;
  // `.hf-narrative`'s CSS min-height (120px) ignores the `rows` attribute —
  // a `rows="3"` textarea still measured ~120px tall. `.hf-narrative--tight`
  // (rows <= 3) drops that floor so a short narrative actually gets short.
  var tightClass = rows <= 3 ? ' hf-narrative--tight' : '';
  return (
    '<label class="ea-field" style="flex:1 1 ' +
    widthPct +
    '%">' +
    '<span class="ea-label">' +
    escHtml(label) +
    '</span>' +
    '<textarea class="ea-input hf-narrative' +
    tightClass +
    '" rows="' +
    rows +
    '" data-' +
    dataAttr +
    '="' +
    escAttr(key) +
    '">' +
    escHtml(val) +
    '</textarea>' +
    '</label>'
  );
}

/**
 * Generic Previo/Actual two-column table, reused by labs/echo/scores screens.
 * @param {Array<{key: string, label: string, unit?: string}>} rowsDef
 * @param {Record<string, unknown> | null} previo
 * @param {Record<string, unknown> | null} actual
 */
export function prevActualTable(rowsDef, previo, actual) {
  var p = previo || {};
  var a = actual || {};
  function cell(v, unit) {
    if (v == null || v === '') return '—';
    return escHtml(String(v)) + (unit ? ' ' + escHtml(unit) : '');
  }
  var rows = (rowsDef || [])
    .map(function (r) {
      return (
        '<tr>' +
        '<td class="hf-prev-actual-label">' +
        escHtml(r.label) +
        '</td>' +
        '<td class="hf-prev-actual-val">' +
        cell(p[r.key], r.unit) +
        '</td>' +
        '<td class="hf-prev-actual-val">' +
        cell(a[r.key], r.unit) +
        '</td>' +
        '</tr>'
      );
    })
    .join('');
  return (
    '<table class="hf-prev-actual-table">' +
    '<thead><tr><th></th><th>Previo</th><th>Actual</th></tr></thead>' +
    '<tbody>' +
    rows +
    '</tbody>' +
    '</table>'
  );
}

/**
 * Same Previo/Actual table as `prevActualTable`, split into `numCols`
 * side-by-side tables (`.hf-prev-actual-columns` flex wrapper) with tighter
 * row height (`.hf-prev-actual-table--tight`) — used inside Consulta IC's
 * "ver tabla completa" modals so a 20-30+ row table fits one modal screen
 * with no scroll in either direction (splitting into columns cuts the
 * height instead of the width, unlike a plain scroll container would).
 * @param {Array<{key: string, label: string, unit?: string}>} rowsDef
 * @param {Record<string, unknown> | null} previo
 * @param {Record<string, unknown> | null} actual
 * @param {number} numCols
 */
export function prevActualTableColumns(rowsDef, previo, actual, numCols) {
  var rows = rowsDef || [];
  var n = Math.max(1, numCols || 1);
  var perCol = Math.ceil(rows.length / n);
  var cols = [];
  for (var i = 0; i < rows.length; i += perCol) cols.push(rows.slice(i, i + perCol));
  return (
    '<div class="hf-prev-actual-columns">' +
    cols
      .map(function (colRows) {
        return prevActualTable(colRows, previo, actual).replace(
          'class="hf-prev-actual-table"',
          'class="hf-prev-actual-table hf-prev-actual-table--tight"'
        );
      })
      .join('') +
    '</div>'
  );
}

/** @returns {string} short, unique-enough row id for repeatable-row lists */
function genRowId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Factory for a repeatable-row CRUD + HTML kit (add/remove/update-by-id,
 * row markup, list markup with an empty state + "add" button). Shared by
 * the comorbilidades list (one enum `select` field + a free-text field)
 * and the medicamentos-previos list (two free-text fields) — same shape,
 * different field config.
 * @param {string} dataPrefix data-attribute prefix, e.g. "hf-comorb"
 * @param {Array<{key: string, type: 'select'|'text', placeholder?: string}>} fields
 * @param {string} emptyText shown when the list has no rows
 * @param {string} addLabel label for the "add row" button
 */
function repeatableRowKit(dataPrefix, fields, emptyText, addLabel) {
  function emptyRow() {
    var row = { id: genRowId() };
    fields.forEach(function (f) {
      row[f.key] = '';
    });
    return row;
  }

  function normalizeRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(function (r) {
        return r && typeof r === 'object';
      })
      .map(function (r) {
        var next = { id: String(r.id || genRowId()) };
        fields.forEach(function (f) {
          next[f.key] = String(r[f.key] || '');
        });
        return next;
      });
  }

  function addRow(rows) {
    return normalizeRows(rows).concat([emptyRow()]);
  }

  function removeRow(rows, id) {
    return normalizeRows(rows).filter(function (r) {
      return r.id !== id;
    });
  }

  function updateField(rows, id, field, value) {
    return normalizeRows(rows).map(function (r) {
      if (r.id !== id) return r;
      var next = Object.assign({}, r);
      next[field] = String(value == null ? '' : value);
      return next;
    });
  }

  function fieldHtml(f, row, options) {
    if (f.type === 'select') {
      return (
        '<select class="ea-input" data-' +
        dataPrefix +
        '-field="' +
        f.key +
        '" data-' +
        dataPrefix +
        '-id="' +
        escAttr(row.id) +
        '">' +
        enumOptionsHtml(row[f.key], options) +
        '</select>'
      );
    }
    return (
      '<input type="text" class="ea-input" placeholder="' +
      escAttr(f.placeholder || '') +
      '" data-' +
      dataPrefix +
      '-field="' +
      f.key +
      '" data-' +
      dataPrefix +
      '-id="' +
      escAttr(row.id) +
      '" value="' +
      escAttr(row[f.key]) +
      '">'
    );
  }

  function rowHtml(row, options) {
    var r = row || {};
    var body = fields
      .map(function (f) {
        return fieldHtml(f, r, options);
      })
      .join('');
    return (
      '<div data-' +
      dataPrefix +
      '-row="' +
      escAttr(r.id) +
      '" style="display:flex;align-items:center;gap:8px;">' +
      body +
      '<button type="button" class="ea-btn ea-btn--ghost" data-' +
      dataPrefix +
      '-action="remove" data-' +
      dataPrefix +
      '-id="' +
      escAttr(r.id) +
      '">Quitar</button>' +
      '</div>'
    );
  }

  function listHtml(rows, options) {
    var list = normalizeRows(rows);
    var body = list.length
      ? list
          .map(function (r) {
            return rowHtml(r, options);
          })
          .join('')
      : '<p class="ea-muted">' + emptyText + '</p>';
    return body + '<button type="button" class="ea-btn ea-btn--ghost" data-' + dataPrefix + '-action="add">' + addLabel + '</button>';
  }

  return { emptyRow: emptyRow, normalizeRows: normalizeRows, addRow: addRow, removeRow: removeRow, updateField: updateField, rowHtml: rowHtml, listHtml: listHtml };
}

var comorbilidadKit = repeatableRowKit(
  'hf-comorb',
  [
    { key: 'value', type: 'select' },
    { key: 'otra', type: 'text', placeholder: 'Otra (si aplica)' },
  ],
  'Sin comorbilidades registradas.',
  '+ Agregar comorbilidad'
);

/** @returns {{ id: string, value: string, otra: string }} */
export function emptyComorbilidadRow() {
  return comorbilidadKit.emptyRow();
}

/**
 * @param {unknown} rows
 * @returns {Array<{ id: string, value: string, otra: string }>}
 */
export function normalizeComorbilidadRows(rows) {
  return comorbilidadKit.normalizeRows(rows);
}

/** @param {unknown} rows */
export function addComorbilidadRow(rows) {
  return comorbilidadKit.addRow(rows);
}

/**
 * @param {unknown} rows
 * @param {string} id
 */
export function removeComorbilidadRow(rows, id) {
  return comorbilidadKit.removeRow(rows, id);
}

/**
 * @param {unknown} rows
 * @param {string} id
 * @param {'value' | 'otra'} field
 * @param {unknown} value
 */
export function updateComorbilidadField(rows, id, field, value) {
  return comorbilidadKit.updateField(rows, id, field, value);
}

/**
 * @param {{ id: string, value: string, otra: string }} row
 * @param {Array<{value: string, label: string}>} options COMORBILIDADES
 */
export function comorbilidadRowHtml(row, options) {
  return comorbilidadKit.rowHtml(row, options);
}

/**
 * @param {unknown} rows
 * @param {Array<{value: string, label: string}>} options COMORBILIDADES
 */
export function comorbilidadListHtml(rows, options) {
  return comorbilidadKit.listHtml(rows, options);
}

var medicamentoPrevioKit = repeatableRowKit(
  'hf-medprevio',
  [
    { key: 'medicamento', type: 'text', placeholder: 'Medicamento' },
    { key: 'dosis', type: 'text', placeholder: 'Dosis' },
  ],
  'Sin medicamentos previos registrados.',
  '+ Agregar medicamento'
);

/** @returns {{ id: string, medicamento: string, dosis: string }} */
export function emptyMedicamentoPrevioRow() {
  return medicamentoPrevioKit.emptyRow();
}

/**
 * @param {unknown} rows
 * @returns {Array<{ id: string, medicamento: string, dosis: string }>}
 */
export function normalizeMedicamentoPrevioRows(rows) {
  return medicamentoPrevioKit.normalizeRows(rows);
}

/** @param {unknown} rows */
export function addMedicamentoPrevioRow(rows) {
  return medicamentoPrevioKit.addRow(rows);
}

/**
 * @param {unknown} rows
 * @param {string} id
 */
export function removeMedicamentoPrevioRow(rows, id) {
  return medicamentoPrevioKit.removeRow(rows, id);
}

/**
 * @param {unknown} rows
 * @param {string} id
 * @param {'medicamento' | 'dosis'} field
 * @param {unknown} value
 */
export function updateMedicamentoPrevioField(rows, id, field, value) {
  return medicamentoPrevioKit.updateField(rows, id, field, value);
}

/** @param {{ id: string, medicamento: string, dosis: string }} row */
export function medicamentoPrevioRowHtml(row) {
  return medicamentoPrevioKit.rowHtml(row);
}

/** @param {unknown} rows */
export function medicamentoPrevioListHtml(rows) {
  return medicamentoPrevioKit.listHtml(rows);
}
