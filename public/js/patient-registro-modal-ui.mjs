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
        ', this.value)">' +
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

export function collectRegistroModalRegistros() {
  var inputs = document.querySelectorAll('#m-registro-list .m-registro-row-input');
  var values = [];
  inputs.forEach(function (input) {
    values.push(String(input.value || '').trim());
  });
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
  if (!registroModalMultiMode) {
    registroModalRows = [String(value || '')];
    return;
  }
  if (!Array.isArray(registroModalRows)) registroModalRows = [''];
  while (registroModalRows.length <= index) registroModalRows.push('');
  registroModalRows[index] = String(value || '');
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
  var parsed = parseRegistrosFromBulkInput(ta.value);
  if (!parsed.length) return;
  registroModalRows = parsed.concat(['']);
  ta.value = '';
  refreshRegistroModalListDom();
}

export const patientRegistroModalWindowHandlers = {
  onRegistroModalInput,
  addRegistroModalRow,
  removeRegistroModalRow,
  splitRegistroModalPaste,
};
