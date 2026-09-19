import { esc } from './dom-escape.mjs';
import { parseRegistrosFromBulkInput } from './patient-registro-parse.mjs';

var registroModalRows = [''];
var registroModalMultiMode = false;

function setElementDisplay(el, visible) {
  if (!el) return;
  el.style.display = visible ? '' : 'none';
}

function registroRowsForRender() {
  if (registroModalMultiMode) {
    return registroModalRows.length ? registroModalRows.slice() : [''];
  }
  return [registroModalRows[0] || ''];
}

function renderRegistroModalListHtml() {
  var rows = registroRowsForRender();
  return rows
    .map(function (val, i) {
      var canRemove = registroModalMultiMode && rows.length > 1;
      var placeholder = registroModalMultiMode ? 'Registro ' + (i + 1) : '0000000-0';
      return (
        '<div class="vpo-dx-row list-row">' +
        '<input type="text" class="ea-input m-registro-row-input" value="' +
        esc(val) +
        '" placeholder="' +
        esc(placeholder) +
        '" oninput="onRegistroModalInput(' +
        i +
        ', this.value)" onpaste="onRegistroModalRowPaste(event, ' +
        i +
        ')">' +
        '<button type="button" class="btn-remove" onclick="removeRegistroModalRow(' +
        i +
        ')"' +
        (canRemove ? '' : ' style="visibility:hidden"') +
        ' aria-label="Eliminar">×</button></div>'
      );
    })
    .join('');
}

function refreshRegistroModalListDom() {
  var listEl = document.getElementById('m-registro-list');
  if (!listEl) return;
  listEl.innerHTML = renderRegistroModalListHtml();
}

/** @param {string[]} [values] */
export function initRegistroModalRows(values) {
  registroModalRows = values && values.length ? values.slice() : [''];
  if (registroModalMultiMode && !registroModalRows.length) registroModalRows = [''];
  var paste = document.getElementById('m-registro-paste');
  if (paste) paste.value = '';
  refreshRegistroModalListDom();
}

export function setRegistroModalMultiMode(on) {
  registroModalMultiMode = !!on;
  setElementDisplay(document.getElementById('m-registro-toolbar'), on);
  setElementDisplay(document.getElementById('m-registro-paste-wrap'), on);
  if (!on && registroModalRows.length > 1) {
    registroModalRows = [registroModalRows[0] || ''];
  }
  refreshRegistroModalListDom();
}

/** @param {string[]} rows */
export function normalizeRegistroModalValues(rows) {
  return parseRegistrosFromBulkInput(
    rows
      .map(function (r) {
        return String(r || '').trim();
      })
      .filter(Boolean)
      .join('\n')
  );
}

/**
 * Si el valor de una caja trae varios expedientes (pegar con Enter/espacios),
 * los reparte en cajas individuales; si no, actualiza esa caja.
 * @param {string[]} rows
 * @param {number} index
 * @param {string} value
 * @returns {string[]}
 */
export function expandRegistroRowsFromInput(rows, index, value) {
  var base = Array.isArray(rows) ? rows.slice() : [''];
  var idx = Math.max(0, Number(index) || 0);
  while (base.length <= idx) base.push('');
  var parsed = parseRegistrosFromBulkInput(value);
  if (parsed.length <= 1) {
    base[idx] = String(value || '');
    return base;
  }
  var before = base.slice(0, idx);
  var after = base.slice(idx + 1).filter(function (r) {
    return String(r || '').trim();
  });
  return before.concat(parsed).concat(after).concat(['']);
}

/**
 * Vuelca texto del área «Pegar varios» a cajas (uno por expediente).
 * @param {string[]} rows
 * @param {string} pasteRaw
 * @returns {string[]}
 */
export function mergeRegistroPasteIntoRows(rows, pasteRaw) {
  var parsed = parseRegistrosFromBulkInput(pasteRaw);
  if (!parsed.length) return Array.isArray(rows) ? rows.slice() : [''];
  return parsed.concat(['']);
}

export function collectRegistroModalRegistros() {
  var inputs = document.querySelectorAll('#m-registro-list .m-registro-row-input');
  var values = [];
  inputs.forEach(function (input) {
    values.push(String(input.value || '').trim());
  });
  var paste = document.getElementById('m-registro-paste');
  if (paste && String(paste.value || '').trim()) {
    values = values.concat(parseRegistrosFromBulkInput(paste.value));
  }
  return normalizeRegistroModalValues(values);
}

export function readRegistroModalPrimary() {
  var list = collectRegistroModalRegistros();
  return list[0] || '';
}

export function focusRegistroModalFirst() {
  var inputs = document.querySelectorAll('#m-registro-list .m-registro-row-input');
  for (var i = 0; i < inputs.length; i++) {
    if (!String(inputs[i].value || '').trim()) {
      try {
        inputs[i].focus();
      } catch (_e) {
        void _e;
      }
      return;
    }
  }
  if (inputs.length) {
    try {
      inputs[0].focus();
    } catch (_e) {
      void _e;
    }
  }
}

export function focusRegistroModalAny() {
  var inputs = document.querySelectorAll('#m-registro-list .m-registro-row-input');
  if (inputs.length) {
    try {
      inputs[0].focus();
    } catch (_e) {
      void _e;
    }
    return;
  }
  var legacy = document.getElementById('m-registro');
  if (legacy) {
    try {
      legacy.focus();
    } catch (_e) {
      void _e;
    }
  }
}

export function onRegistroModalInput(index, value) {
  var parsed = parseRegistrosFromBulkInput(value);
  if (!registroModalMultiMode) {
    if (parsed.length > 1) {
      registroModalRows = expandRegistroRowsFromInput([''], 0, value);
      setRegistroModalMultiMode(true);
      return;
    }
    registroModalRows = [String(value || '')];
    return;
  }
  if (!Array.isArray(registroModalRows)) registroModalRows = [''];
  registroModalRows = expandRegistroRowsFromInput(registroModalRows, index, value);
  if (parsed.length > 1) refreshRegistroModalListDom();
}

/** Pegar con Enter: usa el texto del portapapeles (conserva saltos de línea). */
export function onRegistroModalRowPaste(event, index) {
  var clip =
    event &&
    event.clipboardData &&
    typeof event.clipboardData.getData === 'function'
      ? event.clipboardData.getData('text')
      : '';
  if (!clip || parseRegistrosFromBulkInput(clip).length <= 1) return;
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
  onRegistroModalInput(index, clip);
}

export function addRegistroModalRow() {
  if (!registroModalMultiMode) return;
  if (!Array.isArray(registroModalRows)) registroModalRows = [''];
  registroModalRows.push('');
  refreshRegistroModalListDom();
  var inputs = document.querySelectorAll('#m-registro-list .m-registro-row-input');
  var last = inputs[inputs.length - 1];
  if (last) {
    try {
      last.focus();
    } catch (_e) {
      void _e;
    }
  }
}

export function removeRegistroModalRow(index) {
  if (!registroModalMultiMode || !Array.isArray(registroModalRows)) return;
  if (registroModalRows.length <= 1) return;
  registroModalRows.splice(index, 1);
  refreshRegistroModalListDom();
}

export function splitRegistroModalPaste() {
  var ta = document.getElementById('m-registro-paste');
  if (!ta || !registroModalMultiMode) return;
  if (!parseRegistrosFromBulkInput(ta.value).length) return;
  registroModalRows = mergeRegistroPasteIntoRows(registroModalRows, ta.value);
  ta.value = '';
  refreshRegistroModalListDom();
}

/** Auto-separa al pegar varios con Enter (uno por línea). */
export function onRegistroModalPasteAreaInput() {
  var ta = document.getElementById('m-registro-paste');
  if (!ta || !registroModalMultiMode) return;
  var raw = String(ta.value || '');
  if (!raw.trim() || !/[\r\n]/.test(raw)) return;
  if (!parseRegistrosFromBulkInput(raw).length) return;
  splitRegistroModalPaste();
}

export const patientRegistroModalWindowHandlers = {
  onRegistroModalInput,
  onRegistroModalRowPaste,
  addRegistroModalRow,
  removeRegistroModalRow,
  splitRegistroModalPaste,
  onRegistroModalPasteAreaInput,
};
