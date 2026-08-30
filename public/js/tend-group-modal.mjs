import { closeOverlayAnimated } from './ui-motion.mjs';
import { mountRpcDateInput } from './rpc-date-picker.mjs';
import { createTendGroupTableApi } from './tend-group-table.mjs';
import { createTendGroupChartsApi } from './tend-group-charts.mjs';
import { createTendGroupGasoApi } from './tend-group-gaso.mjs';
import {
  prepareTendGroupOpen,
  showTendGroupBackdrop,
  renderTendGroupPanels,
  copyTendGroupTablePng,
  copyTendGroupTableText,
  setTendGroupTab,
  applyTendGroupDateRange,
} from './tend-group-modal-open.mjs';

export function createTendGroupModal(deps) {
  var state = {
    sectionKey: null,
    patientId: null,
    charts: [],
    tableModel: null,
    activeTab: 'charts',
    tableHiddenBarCollapsed: false,
    historyDescFull: [],
    rangeFrom: '',
    rangeTo: '',
    historyDesc: [],
    historyAsc: [],
    visibleFields: [],
    specsByField: Object.create(null),
    gasoExtendedFio2: 0.21,
  };

  var tableApi = createTendGroupTableApi(deps, state);
  var chartsApi = createTendGroupChartsApi(deps, state, tableApi);
  var gasoApi = createTendGroupGasoApi(deps, state);
  var renderCharts = chartsApi.renderCharts;
  var renderTable = tableApi.renderTable;
  var destroyCharts = chartsApi.destroyCharts;
  var destroyPanelSortable = chartsApi.destroyPanelSortable;
  var closeGasoExtended = gasoApi.closeGasoExtended;
  var openGasoExtended = gasoApi.openGasoExtended;

  function backdropEl() {
    return document.getElementById('tend-group-backdrop');
  }

  function isOpen() {
    var bd = backdropEl();
    return !!(bd && bd.getAttribute('aria-hidden') === 'false');
  }

  function closeModal() {
    destroyPanelSortable();
    state.sectionKey = null;
    document.body.classList.remove('tend-group-modal-open');
    var bd = backdropEl();
    closeOverlayAnimated(bd, function () {
      if (bd) bd.style.display = 'none';
      destroyCharts();
      var chartsPanel = document.getElementById('tend-group-panel-charts');
      if (chartsPanel) chartsPanel.innerHTML = '';
      var wrap = document.getElementById('tend-group-table-wrap');
      if (wrap) wrap.innerHTML = '';
    });
  }

  function setTab(name) {
    setTendGroupTab(state, name);
  }

  var _rangeWired = false;
  function wireRangeRow() {
    if (_rangeWired) return;
    var fromInput = document.getElementById('tend-group-range-from');
    var toInput = document.getElementById('tend-group-range-to');
    var clearBtn = document.getElementById('tend-group-range-clear');
    if (!fromInput || !toInput || !clearBtn) return;
    _rangeWired = true;
    mountRpcDateInput(fromInput);
    mountRpcDateInput(toInput);
    function reapply() {
      applyTendGroupDateRange(state, fromInput.value, toInput.value);
      clearBtn.hidden = !(state.rangeFrom || state.rangeTo);
      renderTendGroupPanels(state.sectionKey, renderCharts, renderTable);
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
    var fromInput = document.getElementById('tend-group-range-from');
    var toInput = document.getElementById('tend-group-range-to');
    var clearBtn = document.getElementById('tend-group-range-clear');
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

  function openModal(sectionKey) {
    if (!prepareTendGroupOpen(deps, state, sectionKey)) return;
    var shown = showTendGroupBackdrop(deps, state, state.activeTab || 'charts');
    if (!shown) return;
    setTab(shown.activeTab);
    wireRangeRow();
    resetRangeRow();
    renderTendGroupPanels(sectionKey, renderCharts, renderTable);
  }

  return {
    open: openModal,
    close: closeModal,
    isOpen: isOpen,
    setTab: setTab,
    copyTablePng: function () {
      copyTendGroupTablePng(deps, state);
    },
    copyTableText: function () {
      copyTendGroupTableText(deps, state);
    },
    openGasoExtended: openGasoExtended,
    closeGasoExtended: closeGasoExtended,
  };
}
