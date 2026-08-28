import {
  switchAppTab
} from "/mobile/js/chunks/chunk-KLIRLDTK.js";
import {
  cancelExpedienteWarm,
  expedienteCompositeTab,
  granularMountIsEmpty,
  initExpedienteTabPreload,
  invalidateInnerTabRenderCache,
  isInnerTabContentFresh,
  renderExpedienteGroupRow,
  renderGranularInnerTab,
  syncConsolidatedInnerTabButtons,
  syncInnerTabVisualOnly,
  warmExpedienteHeavyTabs,
  wireGroupRowBreakpointResync
} from "/mobile/js/chunks/chunk-ADCCUMNS.js";
import {
  syncLabInnerVisibility
} from "/mobile/js/chunks/chunk-54IZJJ7T.js";
import {
  animateTabPanelEnter,
  initTabBarMotion,
  refreshEaCopyFabVisibility,
  syncAllSubTabIndicators,
  syncExpedienteSegmentIndicators,
  syncInnerTabIndicator
} from "/mobile/js/chunks/chunk-LWJYIL7E.js";
import {
  syncHeaderContext
} from "/mobile/js/chunks/chunk-KETQVDCA.js";
import {
  invalidateEaPanelCache
} from "/mobile/js/chunks/chunk-JM4V2UL6.js";
import {
  openPatientDatosModal,
  openPatientDatosModalForPatient,
  wirePatientDatosModalOnce
} from "/mobile/js/chunks/chunk-GXFOOQYK.js";
import {
  applyExpedientePaneLayout,
  consolidatedInnerTabButtonId,
  defaultGranularForConsolidatedTab,
  isClinicoCompositeVisible,
  migrateGranularInner,
  resetExpedientePaneLayoutCache,
  shouldShowConsolidatedTab,
  syncConsolidatedPaneVisibility,
  syncConsolidatedSegmentBars
} from "/mobile/js/chunks/chunk-2MXQFCGD.js";
import {
  invalidateEventualidadesPanel,
  renderEstadoActualBar
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  cancelDeferredIdleWork,
  scheduleAfterPaint
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import {
  rt
} from "/mobile/js/chunks/chunk-HDEGXLWA.js";

// public/js/features/expediente-navigation.mjs
function refreshExpedienteForAppModeChange() {
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  invalidateEaPanelCache();
  invalidateEventualidadesPanel();
  invalidateInnerTabRenderCache();
  var settings = rt.getSettings();
  var tab = migrateGranularInner(rt.getActiveInner() || "resumen", settings);
  if (tab !== rt.getActiveInner()) rt.setActiveInner(tab);
  resetExpedientePaneLayoutCache();
  renderInnerTabs();
  syncInnerTabVisualOnly();
}
function refreshExpedienteAfterPatientSelect(opts) {
  opts = opts || {};
  cancelExpedienteWarm();
  invalidateEaPanelCache();
  var settings = rt.getSettings();
  var tab = migrateGranularInner(rt.getActiveInner() || "resumen", settings);
  var forceRender = !!opts.patientChanged || granularMountIsEmpty(tab);
  if (forceRender || !isInnerTabContentFresh(tab, settings)) {
    renderGranularInnerTab(
      tab,
      forceRender ? { force: true, deferLabs: !!opts.patientChanged } : void 0
    );
  }
}
function switchConsolidatedTab(compositeTab) {
  var settings = rt.getSettings();
  if (compositeTab === "clinico" && !isClinicoCompositeVisible(settings)) {
    compositeTab = "paciente";
  }
  var current = migrateGranularInner(rt.getActiveInner() || "resumen", settings);
  var currentComposite = consolidatedInnerTabButtonId(current, settings).replace(/^itab-/, "");
  var targetGranular = defaultGranularForConsolidatedTab(compositeTab, settings);
  if (currentComposite === compositeTab) {
    if (compositeTab === "clinico" && current !== targetGranular) {
      switchInnerTab(targetGranular);
      return;
    }
    syncConsolidatedInnerTabButtons(current, settings);
    syncConsolidatedPaneVisibility(current, settings);
    syncConsolidatedSegmentBars(current, settings);
    renderExpedienteGroupRow(current, settings);
    syncInnerTabIndicator(current, { consolidated: true, settings });
    if (granularMountIsEmpty(current)) {
      renderGranularInnerTab(current, { force: true });
    }
    return;
  }
  switchInnerTab(targetGranular);
}
var EXPEDIENTE_INNER_TABS = {
  datos: 1,
  resumen: 1,
  notas: 1,
  indica: 1,
  tend: 1,
  cult: 1,
  listado: 1,
  todo: 1,
  historia: 1,
  estadoActual: 1,
  eventualidades: 1,
  recetaHu: 1
};
function isExpedienteInnerTab(tab) {
  return !!EXPEDIENTE_INNER_TABS[tab];
}
function ensureAppTabForInner(tab) {
  if (tab === "tend" || tab === "cult") {
    if (rt.getActiveAppTab() !== "lab") switchAppTab("lab");
    return;
  }
  if (isExpedienteInnerTab(tab) && rt.getActiveAppTab() !== "nota") {
    switchAppTab("nota");
  }
}
function scheduleInnerTabPaint(tab, settings, opts, prevInner, prevComposite, nextComposite) {
  var mountNeedsRender = granularMountIsEmpty(tab);
  var needsContentRender = mountNeedsRender || (prevInner !== tab || opts.forceRender) && (opts.forceRender || !isInnerTabContentFresh(tab, settings));
  if (needsContentRender) {
    var targetTab = tab;
    var forceRender = !!opts.forceRender || mountNeedsRender;
    if (prevInner !== tab && prevComposite !== nextComposite) {
      var panelEl = document.getElementById(
        "itab-content-" + consolidatedInnerTabButtonId(tab, settings).replace(/^itab-/, "")
      );
      animateTabPanelEnter(panelEl);
    }
    if (prevInner !== tab) {
      syncExpedienteSegmentIndicators(settings, tab);
    }
    scheduleAfterPaint(function() {
      if (migrateGranularInner(rt.getActiveInner() || "resumen", settings) !== targetTab) return;
      renderGranularInnerTab(targetTab, forceRender ? { force: true } : void 0);
      syncExpedienteSegmentIndicators(settings, targetTab);
      syncInnerTabIndicator(targetTab, { consolidated: true, settings });
    });
    return;
  }
  if (prevInner !== tab) {
    syncExpedienteSegmentIndicators(settings, tab);
    if (tab === "estadoActual") refreshEaCopyFabVisibility();
    if (!mountNeedsRender) return;
  } else if (!mountNeedsRender) {
    return;
  }
  invalidateInnerTabRenderCache(tab);
  scheduleAfterPaint(function() {
    if (migrateGranularInner(rt.getActiveInner() || "resumen", settings) !== tab) return;
    renderGranularInnerTab(tab, { force: true });
    syncExpedienteSegmentIndicators(settings, tab);
  });
}
function openDatosModalFromNavigation(opts) {
  if (opts.datosPatientId != null && opts.datosPatientId !== "") {
    openPatientDatosModalForPatient(opts.datosPatientId);
  } else {
    openPatientDatosModal();
  }
}
function switchInnerTab(tab, opts) {
  opts = opts || {};
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  var settings = rt.getSettings();
  if (tab === "datos") {
    openDatosModalFromNavigation(opts);
    return;
  }
  tab = migrateGranularInner(tab, settings);
  var prevInner = migrateGranularInner(rt.getActiveInner() || "resumen", settings);
  var prevComposite = expedienteCompositeTab(prevInner, settings);
  var nextComposite = expedienteCompositeTab(tab, settings);
  ensureAppTabForInner(tab);
  rt.setActiveInner(tab);
  syncLabInnerVisibility();
  syncConsolidatedInnerTabButtons(tab, settings);
  syncConsolidatedPaneVisibility(tab, settings, opts);
  syncConsolidatedSegmentBars(tab, settings);
  renderExpedienteGroupRow(tab, settings);
  syncHeaderContext(rt);
  if (granularMountIsEmpty(tab)) {
    opts.forceRender = true;
    invalidateInnerTabRenderCache(tab);
  }
  scheduleInnerTabPaint(tab, settings, opts, prevInner, prevComposite, nextComposite);
  if (prevInner !== tab && isModeSala(settings) && (tab === "estadoActual" || tab === "tend")) {
    warmExpedienteHeavyTabs();
  }
  syncInnerTabIndicator(tab, { consolidated: true, settings });
  refreshEaCopyFabVisibility();
}
function renderInnerTabs() {
  var settings = rt.getSettings();
  function setOrder(id, order2) {
    var el = document.getElementById(id);
    if (el) el.style.order = String(order2);
  }
  resetExpedientePaneLayoutCache();
  document.querySelectorAll(".exp-consolidated-tab").forEach(function(el) {
    el.style.display = shouldShowConsolidatedTab(el.id, settings) ? "" : "none";
  });
  applyExpedientePaneLayout(settings);
  var showClinico = shouldShowConsolidatedTab("itab-clinico", settings);
  var clinicoPane = document.getElementById("itab-content-clinico");
  if (clinicoPane) clinicoPane.hidden = !showClinico;
  var order = 1;
  setOrder("itab-paciente", order++);
  if (showClinico) setOrder("itab-clinico", order++);
  if (shouldShowConsolidatedTab("itab-salida", settings)) setOrder("itab-salida", order++);
  wirePatientDatosModalOnce();
  wireGroupRowBreakpointResync(syncInnerTabVisualOnly);
  var activeInner = migrateGranularInner(rt.getActiveInner() || "resumen", settings);
  if (activeInner !== rt.getActiveInner()) rt.setActiveInner(activeInner);
  syncInnerTabVisualOnly();
  invalidateInnerTabRenderCache();
  renderGranularInnerTab(activeInner, { force: true });
  renderEstadoActualBar();
  var active = migrateGranularInner(rt.getActiveInner() || "resumen", settings);
  syncInnerTabIndicator(active, { consolidated: true, settings });
  syncAllSubTabIndicators();
  initExpedienteTabPreload();
}
function getActiveInnerTab() {
  var v = rt.getActiveInner();
  return v || null;
}
var windowHandlers = {
  switchAppTab,
  switchInnerTab,
  switchConsolidatedTab,
  initTabBarMotion,
  renderInnerTabs,
  getActiveInnerTab,
  refreshExpedienteForAppModeChange
};

export {
  refreshExpedienteAfterPatientSelect,
  switchConsolidatedTab,
  switchInnerTab,
  renderInnerTabs,
  getActiveInnerTab,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-ARU5EGXY.js.map
