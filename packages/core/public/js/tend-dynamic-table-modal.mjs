import { sortLabHistoryChronological } from './tend-core.mjs';
import { toAscendingHistory } from './tend-group-chart-helpers.mjs';
import {
  filterHistoryByDateRange,
  applyTendGroupDateRange,
  resolveExtraSpecs,
  copyTendGroupTablePng,
  copyTendGroupTableText,
} from './tend-group-modal-open.mjs';
import { readGroupExtraFields } from './tend-prefs.mjs';
import { renderGroupTable } from './tend-group-table-render.mjs';
import { mountRpcDateInput } from './rpc-date-picker.mjs';
import { closeOverlayAnimated, cancelOverlayClose } from './ui-motion.mjs';

/** Clave de sección reservada: no coincide con ningún código real (tendEligibleSectionKey), así que
 *  las funciones de tend-prefs.mjs (que ya guardan por patientId+sectionKey) persisten esta tabla
 *  sin chocar con ninguna sección de laboratorio real. */
export var DYNAMIC_TABLE_SECTION_KEY = '__DYNAMIC__';

export function createTendDynamicTableModal(deps) {
  var state = {
    sectionKey: DYNAMIC_TABLE_SECTION_KEY,
    patientId: null,
    dynamicMode: true,
    tableModel: null,
    historyDescFull: [],
    rangeFrom: '',
    rangeTo: '',
    historyDesc: [],
    historyAsc: [],
    specsByField: Object.create(null),
    tableExtraSpecs: [],
  };

  function renderTable() {
    renderGroupTable(deps, state, DYNAMIC_TABLE_SECTION_KEY, renderTable, {
      wrapId: 'tend-dynamic-table-wrap',
    });
  }

  function backdropEl() {
    return document.getElementById('tend-dynamic-table-backdrop');
  }

  function isOpen() {
    var bd = backdropEl();
    return !!(bd && bd.getAttribute('aria-hidden') === 'false');
  }

  function closeModal() {
    var bd = backdropEl();
    closeOverlayAnimated(bd, function () {
      if (bd) bd.style.display = 'none';
      var wrap = document.getElementById('tend-dynamic-table-wrap');
      if (wrap) wrap.innerHTML = '';
    });
  }

  var _rangeWired = false;
  function wireRangeRow() {
    if (_rangeWired) return;
    var fromInput = document.getElementById('tend-dynamic-table-range-from');
    var toInput = document.getElementById('tend-dynamic-table-range-to');
    var clearBtn = document.getElementById('tend-dynamic-table-range-clear');
    if (!fromInput || !toInput || !clearBtn) return;
    _rangeWired = true;
    mountRpcDateInput(fromInput);
    mountRpcDateInput(toInput);
    function reapply() {
      applyTendGroupDateRange(state, fromInput.value, toInput.value);
      clearBtn.hidden = !(state.rangeFrom || state.rangeTo);
      renderTable();
    }
    fromInput.addEventListener('change', reapply);
    toInput.addEventListener('change', reapply);
    clearBtn.addEventListener('click', function () {
      fromInput.value = '';
      toInput.value = '';
      fromInput.dispatchEvent(new Event('rpc-date-refresh'));
      toInput.dispatchEvent(new Event('rpc-date-refresh'));
      reapply();
    });
  }

  function resetRangeRow() {
    var fromInput = document.getElementById('tend-dynamic-table-range-from');
    var toInput = document.getElementById('tend-dynamic-table-range-to');
    var clearBtn = document.getElementById('tend-dynamic-table-range-clear');
    if (fromInput) {
      fromInput.value = '';
      fromInput.dispatchEvent(new Event('rpc-date-refresh'));
    }
    if (toInput) {
      toInput.value = '';
      toInput.dispatchEvent(new Event('rpc-date-refresh'));
    }
    if (clearBtn) clearBtn.hidden = true;
  }

  function openModal() {
    var patientId = deps.getActiveId();
    if (!patientId) return;
    var historyDesc = sortLabHistoryChronological(deps.getHistory() || []);
    state.patientId = patientId;
    state.historyDescFull = historyDesc;
    state.rangeFrom = '';
    state.rangeTo = '';
    state.historyDesc = historyDesc;
    state.historyAsc = toAscendingHistory(historyDesc);
    state.specsByField = Object.create(null);
    state.tableExtraSpecs = resolveExtraSpecs(
      deps,
      historyDesc,
      readGroupExtraFields(patientId, DYNAMIC_TABLE_SECTION_KEY)
    );

    var bd = backdropEl();
    if (!bd) return;
    cancelOverlayClose(bd);
    bd.style.display = 'flex';
    bd.setAttribute('aria-hidden', 'false');
    wireRangeRow();
    resetRangeRow();
    renderTable();
  }

  return {
    open: openModal,
    close: closeModal,
    isOpen: isOpen,
    copyTablePng: function () {
      copyTendGroupTablePng(deps, state, {
        titleElId: 'tend-dynamic-table-title',
        fallbackTitle: 'Tabla dinámica',
      });
    },
    copyTableText: function () {
      copyTendGroupTableText(deps, state);
    },
  };
}
