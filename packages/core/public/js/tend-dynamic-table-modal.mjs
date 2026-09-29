import { sortLabHistoryChronological } from './tend-core.mjs';
import { toAscendingHistory } from './tend-group-chart-helpers.mjs';
import {
  filterHistoryByDateRange,
  applyTendGroupDateRange,
  resolveExtraSpecs,
  copyTendGroupTablePng,
  copyTendGroupTableText,
} from './tend-group-modal-open.mjs';
import { readGroupExtraFields, writeGroupExtraFields, seriesColorKey, toggleSpecInList } from './tend-prefs.mjs';
import { renderGroupTable } from './tend-group-table-render.mjs';
import { mountRpcDateInput } from './rpc-date-picker.mjs';
import { closeOverlayAnimated, cancelOverlayClose } from './ui-motion.mjs';
import { showTendPane, hideTendPane } from './tend-pane.mjs';

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

  var listeners = [];

  function renderTable() {
    renderGroupTable(deps, state, DYNAMIC_TABLE_SECTION_KEY, renderTable, {
      wrapId: 'tend-dynamic-table-wrap',
      daymodeSlotId: 'tend-dynamic-table-daymode-slot',
    });
    listeners.forEach(function (cb) {
      cb();
    });
  }

  // Selection = state.tableExtraSpecs (chips, picker and list ticks all read/write it).
  function getSelectedKeys() {
    return state.tableExtraSpecs.map(function (sp) {
      return seriesColorKey(sp.sectionKey, sp.fieldKey);
    });
  }

  function specForKey(key) {
    var p = key.indexOf('|');
    if (p <= 0) return null;
    var sk = key.slice(0, p);
    var fk = key.slice(p + 1);
    var found = (deps.getCatalogSpecs(sk, state.historyDescFull) || []).filter(function (sp) {
      return sp.fieldKey === fk;
    })[0];
    return found ? Object.assign({}, found, { sectionKey: sk }) : null;
  }

  function applySelection(list) {
    state.tableExtraSpecs = list;
    writeGroupExtraFields(
      state.patientId,
      DYNAMIC_TABLE_SECTION_KEY,
      list.map(function (sp) {
        return { sectionKey: sp.sectionKey, fieldKey: sp.fieldKey };
      })
    );
    renderTable();
  }

  function toggleSeries(key) {
    var selected = getSelectedKeys().indexOf(key) >= 0;
    var spec = specForKey(key);
    if (spec) applySelection(toggleSpecInList(state.tableExtraSpecs, spec));
    return !selected && !!spec;
  }

  function addSeries(key) {
    if (getSelectedKeys().indexOf(key) < 0) toggleSeries(key);
  }

  function backdropEl() {
    return document.getElementById('tend-dynamic-table-backdrop');
  }

  function isOpen() {
    var bd = backdropEl();
    return !!(bd && bd.getAttribute('aria-hidden') === 'false');
  }

  function closeModal() {
    hideTendPane('pivot');
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
    showTendPane('pivot');
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
    getSelectedKeys: getSelectedKeys,
    toggleSeries: toggleSeries,
    addSeries: addSeries,
    onSelectionChange: function (cb) {
      listeners.push(cb);
    },
  };
}
