import { sortLabHistoryChronological } from '../tend-core.mjs';
import {
  buildEstudiosCopyLinesFromLabSets,
  groupLabHistoryByDay,
} from '../lab-history-set.mjs';
import { labLinesToClipboardPayload } from '../lab-clipboard.mjs';

/** @type {{
 *   getActiveId(): string|null,
 *   ensureParsedLabHistory(pid: string, opts?: object): unknown[],
 *   ensureParsedLabHistoryCached?(pid: string): unknown[],
 *   showToast(msg: string, type?: string): void,
 *   copyToClipboardSafe(text: string, html?: string): Promise<boolean>,
 * }} */

import { esc } from '../dom-escape.mjs';
let rt = {
  getActiveId() {
    return null;
  },
  ensureParsedLabHistory() {
    return [];
  },
  showToast() {},
  copyToClipboardSafe() {
    return Promise.resolve(false);
  },
};

export function registerLabHistoryBatchCopyRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function loadPatientHistory() {
  var pid = rt.getActiveId();
  if (!pid) return { pid: null, ordered: [], groups: [] };
  var ordered;
  if (rt.ensureParsedLabHistoryCached) {
    ordered = sortLabHistoryChronological(rt.ensureParsedLabHistoryCached(pid));
  } else {
    ordered = sortLabHistoryChronological(
      rt.ensureParsedLabHistory(pid, { readOnly: true })
    );
  }
  return { pid: pid, ordered: ordered, groups: groupLabHistoryByDay(ordered) };
}

function selectedDayKeysFromBackdrop(backdrop) {
  var keys = [];
  backdrop.querySelectorAll('.lab-batch-copy-cb:checked').forEach(function (cb) {
    var dk = cb.getAttribute('data-day-key');
    if (dk) keys.push(dk);
  });
  return keys;
}

function syncBatchCopyActions(backdrop, ordered) {
  var ta = backdrop.querySelector('#lab-batch-copy-preview');
  var countEl = backdrop.querySelector('#lab-batch-copy-count');
  var copyBtn = backdrop.querySelector('#lab-batch-copy-ok');
  if (!ta) return;
  var keys = selectedDayKeysFromBackdrop(backdrop);
  var n = keys.length;
  var sends = 0;
  backdrop.querySelectorAll('.lab-batch-copy-cb:checked').forEach(function (cb) {
    sends += parseInt(cb.getAttribute('data-sends') || '0', 10);
  });
  backdrop.querySelectorAll('.lab-copydays-row').forEach(function (row) {
    var cb = row.querySelector('.lab-batch-copy-cb');
    row.classList.toggle('is-on', !!(cb && cb.checked));
  });
  if (countEl) {
    countEl.textContent =
      n === 0
        ? 'Ningún día seleccionado'
        : n + ' día' + (n === 1 ? '' : 's') + ' · ' + sends + ' envío' + (sends === 1 ? '' : 's');
  }
  if (copyBtn) {
    copyBtn.disabled = n === 0;
    copyBtn.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
  }
  if (!n) {
    ta.value = '';
    ta.placeholder = 'La vista previa aparece al marcar uno o más días.';
    return;
  }
  ta.placeholder = '';
  ta.value = labLinesToClipboardPayload(
    buildEstudiosCopyLinesFromLabSets(ordered, { onlyDayKeys: keys })
  ).text;
}

function closeBatchCopyModal(backdrop) {
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}

var WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** dayKey is "YYYY-M-D" (dayKeyFromLabSet); anything else shows the raw label. */
function dayRowParts(group) {
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(group.dayKey);
  if (!m) return { date: group.label, weekday: '' };
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  return {
    date: ('0' + m[3]).slice(-2) + '/' + ('0' + m[2]).slice(-2),
    weekday: WEEKDAYS[d.getDay()],
  };
}

function buildBatchCopyListHtml(groups) {
  return groups
    .map(function (group) {
      var parts = dayRowParts(group);
      var n = group.sets.length;
      return (
        '<label class="lab-copydays-row">' +
        '<input type="checkbox" class="lab-batch-copy-cb" data-day-key="' +
        esc(group.dayKey) +
        '" data-sends="' +
        n +
        '" />' +
        '<span class="lab-copydays-box" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
        '<span class="lab-copydays-date">' +
        esc(parts.date) +
        '</span>' +
        '<span class="lab-copydays-wd">' +
        esc(parts.weekday) +
        '</span>' +
        '<span class="lab-copydays-sends">' +
        (n > 1 ? n + ' envíos' : '') +
        '</span></label>'
      );
    })
    .join('');
}

function buildBatchCopyModalHtml(listHtml) {
  return (
    '<div class="lab-conflict-modal lab-copydays" role="dialog" aria-modal="true" aria-labelledby="lab-batch-copy-title">' +
    '<div class="lab-copydays-head"><h3 id="lab-batch-copy-title">Copiar varios días</h3>' +
    '<button type="button" id="lab-batch-copy-close" class="lab-copydays-close" aria-label="Cerrar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button></div>' +
    '<p class="lab-copydays-sub">Marca los días. Se copia el bloque Estudios de cada día, con laboratorio y cultivos.</p>' +
    '<div class="lab-copydays-chips">' +
    '<button type="button" class="lab-copydays-chip" data-pick="3">Últimos 3</button>' +
    '<button type="button" class="lab-copydays-chip" data-pick="7">Últimos 7</button>' +
    '<button type="button" class="lab-copydays-chip" data-pick="all">Todos</button>' +
    '<button type="button" class="lab-copydays-chip" data-pick="none">Ninguno</button>' +
    '</div>' +
    '<div class="lab-copydays-list">' +
    listHtml +
    '</div>' +
    '<div class="lab-copydays-h">Vista previa</div>' +
    '<textarea id="lab-batch-copy-preview" class="lab-copydays-preview" readonly rows="4" aria-label="Vista previa"></textarea>' +
    '<div class="lab-copydays-foot">' +
    '<span id="lab-batch-copy-count" class="lab-copydays-count" aria-live="polite"></span>' +
    '<button type="button" id="lab-batch-copy-cancel" class="wb-btn wb-btn-secondary">Cancelar</button>' +
    '<button type="button" id="lab-batch-copy-ok" class="wb-btn wb-btn-primary" disabled aria-disabled="true">Copiar al portapapeles</button>' +
    '</div></div>'
  );
}

/** @param {HTMLElement} backdrop @param {{ ordered: unknown[] }} loaded */
function wireBatchCopyModal(backdrop, loaded) {
  function refreshPreview() {
    syncBatchCopyActions(backdrop, loaded.ordered);
  }

  backdrop.querySelectorAll('.lab-batch-copy-cb').forEach(function (cb) {
    cb.addEventListener('change', refreshPreview);
  });
  backdrop.querySelectorAll('.lab-copydays-chip').forEach(function (chip) {
    chip.onclick = function () {
      var pick = chip.getAttribute('data-pick');
      var limit = pick === 'all' ? Infinity : pick === 'none' ? 0 : parseInt(pick, 10);
      backdrop.querySelectorAll('.lab-batch-copy-cb').forEach(function (cb, i) {
        cb.checked = i < limit;
      });
      refreshPreview();
    };
  });
  backdrop.querySelector('#lab-batch-copy-close').onclick = function () {
    closeBatchCopyModal(backdrop);
  };
  backdrop.querySelector('#lab-batch-copy-cancel').onclick = function () {
    closeBatchCopyModal(backdrop);
  };
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeBatchCopyModal(backdrop);
  });
  backdrop.querySelector('#lab-batch-copy-ok').onclick = async function () {
    var keys = selectedDayKeysFromBackdrop(backdrop);
    if (!keys.length) {
      rt.showToast('Selecciona al menos un día', 'error');
      return;
    }
    var payload = labLinesToClipboardPayload(
      buildEstudiosCopyLinesFromLabSets(loaded.ordered, { onlyDayKeys: keys })
    );
    if (!payload.text.trim()) {
      rt.showToast('No hay texto para copiar en los días elegidos', 'error');
      return;
    }
    var ok = await rt.copyToClipboardSafe(payload.text, payload.html);
    rt.showToast(
      ok
        ? 'Copiados ' + keys.length + ' día' + (keys.length === 1 ? '' : 's') + ' al portapapeles ✓'
        : 'Error al copiar al portapapeles',
      ok ? 'success' : 'error'
    );
    if (ok) closeBatchCopyModal(backdrop);
  };

  refreshPreview();
}

/**
 * Modal para elegir varios días del historial y copiar el bloque de estudios al portapapeles.
 */
export function openLabHistoryBatchCopyModal() {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var loaded = loadPatientHistory();
  if (!loaded.groups.length) {
    rt.showToast('No hay laboratorios en el historial de este paciente', 'error');
    return;
  }

  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'lab-batch-copy-backdrop';
  backdrop.innerHTML = buildBatchCopyModalHtml(buildBatchCopyListHtml(loaded.groups));
  document.body.appendChild(backdrop);
  wireBatchCopyModal(backdrop, loaded);
}

export const windowHandlers = {
  openLabHistoryBatchCopyModal,
};
