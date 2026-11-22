import { sortLabHistoryChronological } from '../tend-core.mjs';
import {
  buildEstudiosCopyLinesFromLabSets,
  groupLabHistoryByDay,
} from '../lab-history-set.mjs';
import { labLinesToClipboardPayload, stripLabCalcLines } from '../lab-clipboard.mjs';

/** @type {{
 *   getActiveId(): string|null,
 *   ensureParsedLabHistory(pid: string, opts?: object): unknown[],
 *   ensureParsedLabHistoryCached?(pid: string): unknown[],
 *   showToast(msg: string, type?: string): void,
 *   copyToClipboardSafe(text: string, html?: string): Promise<boolean>,
 * }} */

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
    stripLabCalcLines(buildEstudiosCopyLinesFromLabSets(ordered, { onlyDayKeys: keys }))
  ).text;
}

function closeBatchCopyModal(backdrop) {
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
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
      stripLabCalcLines(buildEstudiosCopyLinesFromLabSets(loaded.ordered, { onlyDayKeys: keys }))
    );
    if (!payload.text.trim()) {
      rt.showToast('No hay texto para copiar en los días elegidos', 'error');
      return;
    }
    var ok = await rt.copyToClipboardSafe(payload.text, payload.html);
    rt.showToast(
      ok
        ? 'Copiados ' + keys.length + ' día' + (keys.length === 1 ? '' : 's') + ' al portapapeles'
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
export async function openLabHistoryBatchCopyModal() {
  if (!rt.getActiveId()) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var loaded = loadPatientHistory();
  if (!loaded.groups.length) {
    rt.showToast('No hay laboratorios en el historial de este paciente', 'error');
    return;
  }

  var { drawBatchCopyModal } = await import('./lab-history-batch-copy-view.jsx');
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'lab-batch-copy-backdrop';
  drawBatchCopyModal(backdrop, loaded.groups);
  document.body.appendChild(backdrop);
  wireBatchCopyModal(backdrop, loaded);
}

export const windowHandlers = {
  openLabHistoryBatchCopyModal,
};
