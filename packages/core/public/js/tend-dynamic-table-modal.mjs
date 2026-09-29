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
import { renderGroupTable, tableLegendLabelForSpec } from './tend-group-table-render.mjs';
import { renderGroupCharts, destroyGroupCharts } from './tend-group-charts-render.mjs';
import { renderAnalytePickerBar } from './tend-group-analyte-picker.mjs';
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

  // Sub-tab ('tabla' | 'charts') survives close/open for the session.
  var dynTab = 'tabla';
  // One chart view per real section: the chart engine is single-section, so each view
  // inherits the shared state (history, range, patient) and owns charts + specs of its section.
  var chartViews = Object.create(null);

  function chartsWrap() {
    return document.getElementById('tend-dynamic-charts-wrap');
  }

  function destroyDynCharts() {
    Object.keys(chartViews).forEach(function (sk) {
      destroyGroupCharts(chartViews[sk].view, chartViews[sk].sortRef);
    });
    chartViews = Object.create(null);
  }

  function renderDynCharts() {
    var wrap = chartsWrap();
    if (!wrap) return;
    destroyDynCharts();
    wrap.innerHTML = '<div id="tend-group-analyte-picker-slot"></div><div id="tend-dynamic-charts-body"></div>';
    renderAnalytePickerBar({
      slot: wrap.querySelector('#tend-group-analyte-picker-slot'),
      deps: deps,
      state: state,
      sectionKey: DYNAMIC_TABLE_SECTION_KEY,
      renderTable: renderTable,
    });
    var body = wrap.querySelector('#tend-dynamic-charts-body');
    if (!state.tableExtraSpecs.length) {
      body.innerHTML = '<p class="tend-pivot-hint">Aún no hay analitos. Marca uno en la lista de la izquierda.</p>';
      return;
    }
    var bySection = Object.create(null);
    state.tableExtraSpecs.forEach(function (sp) {
      (bySection[sp.sectionKey] = bySection[sp.sectionKey] || []).push(sp);
    });
    Object.keys(bySection).forEach(function (sk) {
      var view = Object.create(state);
      view.sectionKey = sk;
      view.charts = [];
      view.specsByField = Object.create(null);
      bySection[sk].forEach(function (sp) {
        view.specsByField[sp.fieldKey] = sp;
      });
      var sortRef = { current: null };
      chartViews[sk] = { view: view, sortRef: sortRef };
      var sec = document.createElement('div');
      sec.className = 'tend-dynamic-charts-section';
      body.appendChild(sec);
      renderGroupCharts(
        deps,
        view,
        sk,
        function (sectionKey, spec) {
          return tableLegendLabelForSpec(deps, sectionKey, spec);
        },
        sortRef,
        renderDynCharts,
        sec
      );
    });
  }

  function applyDynTab() {
    var isCharts = dynTab === 'charts';
    var tw = document.getElementById('tend-dynamic-table-wrap');
    var cw = chartsWrap();
    var actions = document.getElementById('tend-dynamic-table-actions');
    var slot = document.getElementById('tend-dynamic-table-daymode-slot');
    if (tw) tw.hidden = isCharts;
    if (cw) cw.hidden = !isCharts;
    if (actions) actions.hidden = isCharts;
    if (slot) slot.hidden = isCharts;
    var nav = document.getElementById('tend-dynamic-tabs');
    if (nav) {
      nav.setAttribute('data-active', dynTab);
      nav.querySelectorAll('[data-dyn-tab]').forEach(function (b) {
        var on = b.getAttribute('data-dyn-tab') === dynTab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
  }

  var _tabsWired = false;
  function wireTabs() {
    if (_tabsWired) return;
    var nav = document.getElementById('tend-dynamic-tabs');
    if (!nav) return;
    _tabsWired = true;
    nav.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-dyn-tab]') : null;
      if (!b) return;
      dynTab = b.getAttribute('data-dyn-tab');
      applyDynTab();
      renderTable();
    });
  }

  function renderTable() {
    if (dynTab === 'charts') {
      renderDynCharts();
    } else {
      renderGroupTable(deps, state, DYNAMIC_TABLE_SECTION_KEY, renderTable, {
        wrapId: 'tend-dynamic-table-wrap',
        daymodeSlotId: 'tend-dynamic-table-daymode-slot',
      });
    }
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
      destroyDynCharts();
      var cw = chartsWrap();
      if (cw) cw.innerHTML = '';
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
    wireTabs();
    applyDynTab();
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
