import { closeOverlayAnimated } from './ui-motion.mjs';
import { mountRpcDateInput } from './rpc-date-picker.mjs';
import {
  renderGroupTable,
  createTableExportModel,
  formatCellValue,
  tableColumnHeader,
  tableLegendLabelForSpec,
} from './tend-group-table-render.mjs';
import { renderGroupCharts, destroyGroupCharts } from './tend-group-charts-render.mjs';
import { sortLabHistoryChronological } from './tend-core.mjs';
import { refillGasoExtendedSlot, serieNumFromLabSet } from './tend-group-gaso-slot.mjs';
import {
  ensureGasoExtendedDialog,
  closeGasoExtendedBackdrop,
  showGasoExtendedBackdrop,
  parseFio2Input,
  wireGasoExtendedDialog,
} from './tend-group-gaso-dialog.mjs';
import {
  prepareTendGroupOpen,
  showTendGroupBackdrop,
  renderTendGroupPanels,
  copyTendGroupTablePng,
  copyTendGroupTableText,
  setTendGroupTab,
  applyTendGroupDateRange,
} from './tend-group-modal-open.mjs';

function createTendGroupTableApi(deps, state) {
  function renderTable(sectionKey) {
    renderGroupTable(deps, state, sectionKey, renderTable);
  }

  function buildTableExportModel(sectionKey, rawModel, hidden) {
    return createTableExportModel(deps, state, sectionKey, rawModel, hidden);
  }

  function columnHeader(set, columns) {
    return tableColumnHeader(set, columns);
  }

  function legendLabelForSpec(sectionKey, spec) {
    return tableLegendLabelForSpec(deps, sectionKey, spec);
  }

  return { renderTable, buildTableExportModel, formatCellValue, columnHeader, legendLabelForSpec };
}

function createTendGroupChartsApi(deps, state, tableApi) {
  var legendLabelForSpec = tableApi.legendLabelForSpec;
  var panelSortableRef = { current: null };

  function renderCharts(sectionKey) {
    renderGroupCharts(deps, state, sectionKey, legendLabelForSpec, panelSortableRef, renderCharts);
  }

  function destroyCharts() {
    destroyGroupCharts(state, panelSortableRef);
  }

  function destroyPanelSortable() {
    if (panelSortableRef.current) {
      try {
        if (typeof panelSortableRef.current.destroy === 'function') panelSortableRef.current.destroy();
      } catch (_e) { void _e; }
      panelSortableRef.current = null;
    }
  }

  return { renderCharts, destroyCharts, destroyPanelSortable };
}

function isAbgAnalysisHidden() {
  return true;
}

function defaultEsc(t) {
  return String(t == null ? '' : t);
}

function createTendGroupGasoApi(deps, state) {
  function escHtml(t) {
    return (deps.esc || defaultEsc)(t);
  }

  function closeGasoExtended() {
    closeGasoExtendedBackdrop();
  }

  function rerunGasoSlot(bd) {
    var inp = bd.querySelector('.tend-gaso-fio2-input');
    state.gasoExtendedFio2 = parseFio2Input(inp && inp.value, state.gasoExtendedFio2);
    refillGasoExtendedSlot(
      bd.querySelector('.tend-gaso-extended-inner'),
      state.historyDesc[0],
      state.gasoExtendedFio2,
      escHtml
    );
  }

  function openGasoExtended() {
    if (isAbgAnalysisHidden()) {
      if (deps.showToast) deps.showToast('El análisis de gasometría no está disponible en R+.', 'info');
      return;
    }
    var patientId = deps.getActiveId();
    if (!patientId) return;

    var historyDesc = sortLabHistoryChronological(deps.getHistory() || []);
    if (!historyDesc.length) {
      if (deps.showToast) deps.showToast('Sin laboratorio reciente para gasometría.', 'warn');
      return;
    }

    state.patientId = patientId;
    state.historyDesc = historyDesc;

    var latest = historyDesc[0];
    var hasGaso =
      latest &&
      latest.parsedBySection &&
      latest.parsedBySection.GASES &&
      serieNumFromLabSet(latest, 'GASES', 'pH') != null;
    if (!hasGaso) {
      if (deps.showToast) deps.showToast('No hay gasometría en el último estudio.', 'warn');
      return;
    }

    var bd = ensureGasoExtendedDialog(escHtml, closeGasoExtended);
    wireGasoExtendedDialog(bd, state, function () {
      rerunGasoSlot(bd);
    });
    refillGasoExtendedSlot(
      bd.querySelector('.tend-gaso-extended-inner'),
      latest,
      state.gasoExtendedFio2,
      escHtml
    );
    showGasoExtendedBackdrop(bd);
  }

  return { openGasoExtended, closeGasoExtended };
}

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
