import {
  renderPatientDashboard
} from "/mobile/js/chunks/chunk-4OFZ7HCA.js";
import {
  renderCultivosTable,
  renderListadoForm,
  renderPatientDataPane
} from "/mobile/js/chunks/chunk-IJRAT5KF.js";
import {
  renderEstadoActualPanel,
  renderIndicaForm,
  renderNotaEvolucionPrimaryTab,
  renderRecetaHu,
  renderVpo,
  syncInnerTabIndicator
} from "/mobile/js/chunks/chunk-YRTBWCMP.js";
import {
  ensureChartsLoaded
} from "/mobile/js/chunks/chunk-OZM7LIV7.js";
import {
  buildGroupRowModel
} from "/mobile/js/chunks/chunk-DUGSQ4MG.js";
import {
  addTodo,
  deleteTodo,
  renderTodoForm,
  setTodoPriority,
  toggleTodo,
  updateExpPendientesTabBadge
} from "/mobile/js/chunks/chunk-7U4MNJJJ.js";
import {
  consolidatedInnerTabButtonId,
  consolidatedTabForGranular,
  defaultGranularForConsolidatedTab,
  migrateGranularInner,
  syncConsolidatedPaneVisibility,
  syncConsolidatedSegmentBars
} from "/mobile/js/chunks/chunk-DKVIOEBN.js";
import {
  renderEventualidadesPanel
} from "/mobile/js/chunks/chunk-6J2G5HNR.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  getMedRecetaByPatient,
  getPatients,
  scheduleIdle
} from "/mobile/js/chunks/chunk-2LHILGVA.js";
import {
  storage
} from "/mobile/js/chunks/chunk-SJBIJKX4.js";
import {
  buildEaMonitoreoRevision,
  getLabHistoryRevision
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  rt
} from "/mobile/js/chunks/chunk-HDEGXLWA.js";

// public/js/features/todos.mjs
var todosWindowHandlers = {
  renderTodoForm,
  addTodo,
  toggleTodo,
  deleteTodo,
  setTodoPriority
};

// public/js/features/resumen-glance-cache.mjs
function resumenGlanceCacheSuffix(patient, todos) {
  var ev = patient && patient.eventualidades;
  var evAt = ev && ev.updatedAt ? String(ev.updatedAt) : "";
  var evN = ev && Array.isArray(ev.entries) ? ev.entries.length : 0;
  var open = 0;
  var stamp = "";
  (todos || []).forEach(function(t) {
    if (!t || t.completed) return;
    open += 1;
    var u = String(t.updatedAt || t.id || "");
    if (u > stamp) stamp = u;
  });
  return "|V" + evN + evAt + "|P" + open + stamp;
}

// public/js/features/expediente-group-row-ui.mjs
var lastPointerType = "mouse";
var touchExpandedGroup = null;
var resyncWired = false;
function rowEl() {
  return document.getElementById("exp-group-row");
}
function renderExpedienteGroupRow(activeGranular, settings) {
  var row = rowEl();
  if (!row) return;
  if (!row._pointerWired) {
    row._pointerWired = true;
    row.addEventListener("pointerdown", function(ev) {
      lastPointerType = ev.pointerType || "mouse";
    });
    row.addEventListener("keydown", function(ev) {
      if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
      var names = Array.prototype.slice.call(row.querySelectorAll(".exp-group-name"));
      var idx = names.indexOf(document.activeElement);
      if (idx === -1) return;
      ev.preventDefault();
      var next = names[(idx + (ev.key === "ArrowRight" ? 1 : names.length - 1)) % names.length];
      if (next) next.focus();
    });
  }
  var model = buildGroupRowModel(activeGranular || "todo", settings || {});
  row.textContent = "";
  model.forEach(function(group) {
    var pill = document.createElement("div");
    pill.className = "exp-group-pill" + (group.active ? " is-active" : "") + (group.leaf ? " exp-group-pill--leaf" : "");
    if (!group.active && touchExpandedGroup === group.id) pill.classList.add("is-touch-expanded");
    pill.dataset.group = group.id;
    if (group.active && !group.leaf) pill.setAttribute("aria-label", group.label);
    var name = document.createElement("button");
    name.type = "button";
    name.className = "exp-group-name";
    name.setAttribute("aria-expanded", group.leaf ? "false" : group.active || touchExpandedGroup === group.id ? "true" : "false");
    name.setAttribute("aria-current", group.active ? "true" : "false");
    name.textContent = group.label;
    name.addEventListener("click", function() {
      if (lastPointerType === "touch" && !group.active && touchExpandedGroup !== group.id) {
        touchExpandedGroup = group.id;
        renderExpedienteGroupRow(activeGranular, settings);
        return;
      }
      touchExpandedGroup = null;
      if (group.granularTarget) {
        if (typeof window.switchInnerTab === "function") window.switchInnerTab(group.granularTarget);
      } else if (typeof window.switchConsolidatedTab === "function") {
        window.switchConsolidatedTab(group.id);
      }
    });
    pill.appendChild(name);
    if (group.granularTarget === "todo") {
      var badge = document.createElement("span");
      badge.className = "wb-pendientes-tab-badge exp-group-pendientes-badge";
      badge.id = "exp-pendientes-badge";
      badge.hidden = true;
      pill.appendChild(badge);
    }
    var sections = document.createElement("div");
    sections.className = "exp-group-sections";
    var inner = document.createElement("div");
    inner.className = "exp-group-sections-inner";
    group.sections.forEach(function(section) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "exp-group-section" + (section.active ? " is-active" : "");
      btn.dataset.section = section.id;
      btn.setAttribute("aria-pressed", section.active ? "true" : "false");
      btn.textContent = section.label;
      btn.addEventListener("click", function() {
        touchExpandedGroup = null;
        if (typeof window.switchInnerTab === "function") window.switchInnerTab(section.id);
      });
      inner.appendChild(btn);
    });
    sections.appendChild(inner);
    pill.appendChild(sections);
    row.appendChild(pill);
  });
  updateExpPendientesTabBadge();
}
function wireGroupRowBreakpointResync(syncFn) {
  if (resyncWired || typeof window.matchMedia !== "function") return;
  resyncWired = true;
  var mq = window.matchMedia("(min-width: 1100px)");
  var handler = function() {
    if (typeof syncFn === "function") syncFn();
  };
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", handler);
  else if (typeof mq.addListener === "function") mq.addListener(handler);
  if (typeof document !== "undefined" && document.documentElement.classList.contains("rpc-mobile-web")) {
    handler();
  }
}

// public/js/features/expediente-inner-cache.mjs
var innerTabRenderCache = /* @__PURE__ */ Object.create(null);
var expedientePreloadTimer = null;
var expedientePreloadTab = null;
var expedienteTabPreloadWired = false;
function invalidateInnerTabRenderCache(tab) {
  if (tab) {
    delete innerTabRenderCache[tab];
    return;
  }
  innerTabRenderCache = /* @__PURE__ */ Object.create(null);
}
function granularMountIsEmpty(tab) {
  if (tab === "estadoActual") {
    var ea = document.getElementById("exp-pane-estado-actual");
    return !!ea && !ea.querySelector(".estado-actual-panel");
  }
  if (tab === "eventualidades") {
    var ev = document.getElementById("exp-pane-eventualidades");
    return !!ev && !ev.querySelector(".ev-panel");
  }
  if (tab === "tend") {
    var tend = document.getElementById("tendencias-container");
    if (!tend) return true;
    return !tend.querySelector(".tend-grid, .tend-toolbar, .tend-empty");
  }
  if (tab === "resumen") {
    var dash = document.getElementById("patient-dashboard-mount");
    if (!dash) return true;
    return !dash.querySelector(".dash");
  }
  if (tab === "todo") {
    var tf = document.getElementById("todo-form");
    if (!tf) return true;
    return !tf.querySelector(".todo-add-row") && !tf.querySelector(".todo-list");
  }
  if (tab === "datos") {
    var pdf = document.getElementById("patient-data-form");
    if (!pdf) return true;
    return !String(pdf.innerHTML || "").trim();
  }
  return false;
}
function estadoActualCacheSuffix(patientId) {
  var p = getPatients().find(function(x) {
    return String(x.id) === String(patientId);
  });
  if (!p || !p.monitoreo) return "0";
  return buildEaMonitoreoRevision(p.monitoreo, patientId, getMedRecetaByPatient());
}
function innerTabRenderCacheKey(tab) {
  var pid = String(rt.getActiveId() || "");
  var settings = rt.getSettings();
  var key = String(tab || "") + "|" + pid + "|M" + (settings && settings.appMode ? settings.appMode : "sala");
  if (tab === "tend" || tab === "cult" || tab === "resumen") {
    key += "|L" + getLabHistoryRevision(pid);
  }
  if (tab === "estadoActual" || tab === "resumen") {
    key += "|E" + estadoActualCacheSuffix(pid);
  }
  if (tab === "resumen") {
    var patient = getPatients().find(function(x) {
      return String(x.id) === pid;
    });
    var todos = [];
    try {
      todos = storage.getTodos(pid) || [];
    } catch {
      todos = [];
    }
    key += resumenGlanceCacheSuffix(patient, todos);
  }
  return key;
}
function isInnerTabContentFresh(tab, settings) {
  tab = migrateGranularInner(tab, settings);
  return innerTabRenderCache[tab] === innerTabRenderCacheKey(tab);
}
function markInnerTabRendered(tab) {
  innerTabRenderCache[tab] = innerTabRenderCacheKey(tab);
}
var _expedienteWarmQueued = false;
var _expedienteWarmGen = 0;
function cancelExpedienteWarm() {
  _expedienteWarmGen += 1;
  _expedienteWarmQueued = false;
  if (expedientePreloadTimer) {
    clearTimeout(expedientePreloadTimer);
    expedientePreloadTimer = null;
    expedientePreloadTab = null;
  }
}
function expedienteCompositeTab(granularTab, settings) {
  return consolidatedTabForGranular(granularTab, settings);
}
function warmExpedienteHeavyTabs() {
  if (_expedienteWarmQueued || typeof document === "undefined") return;
  if (!isModeSala(rt.getSettings())) return;
  if (!rt.getActiveId() || rt.getActiveAppTab() !== "nota") return;
  _expedienteWarmQueued = true;
  var warmGen = _expedienteWarmGen;
  scheduleIdle(function() {
    _expedienteWarmQueued = false;
    if (warmGen !== _expedienteWarmGen) return;
    if (!rt.getActiveId() || rt.getActiveAppTab() !== "nota") return;
    var settings = rt.getSettings();
    var active = migrateGranularInner(rt.getActiveInner() || "resumen", settings);
    var rest = ["estadoActual", "tend"].filter(function(tab) {
      return tab !== active && !isInnerTabContentFresh(tab, settings);
    });
    function warmNext() {
      if (warmGen !== _expedienteWarmGen) return;
      var tab = rest.shift();
      if (!tab) return;
      renderGranularInnerTab(tab);
      if (rest.length) scheduleIdle(warmNext, 8e3);
    }
    warmNext();
  }, 8e3);
}
function resolvePreloadGranularTab(el) {
  if (!el || !el.id) return null;
  var settings = rt.getSettings();
  if (el.classList.contains("exp-consolidated-tab")) {
    var composite = el.id.replace(/^itab-/, "");
    return defaultGranularForConsolidatedTab(composite, settings);
  }
  if (el.classList.contains("exp-segment-btn")) {
    var section = el.getAttribute("data-exp-segment");
    if (section) return migrateGranularInner(section, settings);
  }
  return null;
}
function scheduleExpedienteTabPreload(granularTab) {
  if (!granularTab) return;
  if (innerTabRenderCache[granularTab] === innerTabRenderCacheKey(granularTab)) return;
  if (expedientePreloadTab === granularTab && expedientePreloadTimer) return;
  if (expedientePreloadTimer) clearTimeout(expedientePreloadTimer);
  expedientePreloadTab = granularTab;
  expedientePreloadTimer = setTimeout(function() {
    expedientePreloadTimer = null;
    expedientePreloadTab = null;
    if (innerTabRenderCache[granularTab] === innerTabRenderCacheKey(granularTab)) return;
    renderGranularInnerTab(granularTab);
  }, 70);
}
function initExpedienteTabPreload() {
  if (expedienteTabPreloadWired || typeof document === "undefined") return;
  expedienteTabPreloadWired = true;
  document.addEventListener(
    "pointerenter",
    function(ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== "function") return;
      var btn = target.closest(".exp-consolidated-tab, .exp-segment-btn");
      if (!btn) return;
      scheduleExpedienteTabPreload(resolvePreloadGranularTab(btn));
    },
    true
  );
}
function renderHeavyInnerTab(tab, run, opts) {
  if (opts && opts.force) {
    run(function() {
    });
    return;
  }
  run(markInnerTabRendered.bind(null, tab));
}
function syncConsolidatedInnerTabButtons(granularTab, settings) {
  var composite = consolidatedInnerTabButtonId(granularTab, settings).replace(/^itab-/, "");
  document.querySelectorAll(".exp-consolidated-tab").forEach(function(btn) {
    var id = btn.id || "";
    var name = id.replace(/^itab-/, "");
    btn.classList.toggle("active", name === composite);
  });
}
function renderEstadoActualInnerTab(tab, opts) {
  renderHeavyInnerTab(tab, function(done) {
    renderEstadoActualPanel({ onReady: done, syncHeavy: !!opts.force });
  }, opts);
}
function renderTendInnerTab(tab, opts) {
  renderHeavyInnerTab(tab, function(done) {
    void ensureChartsLoaded().then(function(mods) {
      mods.tendencias.renderTendencias({ onReady: done, syncHeavy: !!opts.force });
    });
  }, opts);
}
function renderLightGranularTab(tab) {
  if (tab === "datos" || tab === "todo") renderPatientDataPane();
  if (tab === "cult") renderCultivosTable();
  if (tab === "listado") renderListadoForm();
  if (tab === "todo") renderTodoForm();
  if (tab === "recetaHu") renderRecetaHu();
  markInnerTabRendered(tab);
}
function renderResumenInnerTab(tab, opts) {
  renderPatientDashboard(null, { deferLabs: !!(opts && opts.deferLabs) });
  markInnerTabRendered(tab);
}
var GRANULAR_TAB_RENDERERS = {
  resumen: renderResumenInnerTab,
  estadoActual: renderEstadoActualInnerTab,
  vpo: function(tab) {
    renderVpo();
    markInnerTabRendered(tab);
  },
  tend: renderTendInnerTab,
  // Screen 9a (Nota de evolución) is the primary content of this tab in
  // both Sala and Interconsulta — `renderNotaEvolucionPrimaryTab` owns the
  // toggle back to the legacy free-text template ("Plantilla clásica")
  // itself. Before 2026-08-19 this pointed straight at the legacy
  // `renderNoteForm()`, so clicking this tab silently clobbered the S/O/A/P
  // screen any time it had been rendered by the Interconsulta mode-switch
  // side effect (`applyAppModeSwitchEffects` in profile-app-mode.mjs) —
  // reachable only by accident, never by clicking the tab itself.
  notas: function(tab) {
    renderNotaEvolucionPrimaryTab();
    markInnerTabRendered(tab);
  },
  indica: function(tab) {
    renderIndicaForm();
    markInnerTabRendered(tab);
  },
  eventualidades: function(tab) {
    renderEventualidadesPanel(document.getElementById("exp-pane-eventualidades"));
    markInnerTabRendered(tab);
  }
};
function renderGranularInnerTab(tab, opts) {
  opts = opts || {};
  if (!opts.force && innerTabRenderCache[tab] === innerTabRenderCacheKey(tab)) return;
  var renderer = GRANULAR_TAB_RENDERERS[tab];
  if (renderer) {
    renderer(tab, opts);
    return;
  }
  renderLightGranularTab(tab);
}
function syncInnerTabVisualOnly() {
  var settings = rt.getSettings();
  var tab = migrateGranularInner(rt.getActiveInner() || "resumen", settings);
  syncConsolidatedInnerTabButtons(tab, settings);
  syncConsolidatedPaneVisibility(tab, settings);
  syncConsolidatedSegmentBars(tab, settings);
  renderExpedienteGroupRow(tab, settings);
  syncInnerTabIndicator(tab, { consolidated: true, settings });
}
var windowHandlers = {
  invalidateInnerTabRenderCache
};

export {
  todosWindowHandlers,
  renderExpedienteGroupRow,
  wireGroupRowBreakpointResync,
  invalidateInnerTabRenderCache,
  granularMountIsEmpty,
  isInnerTabContentFresh,
  cancelExpedienteWarm,
  expedienteCompositeTab,
  warmExpedienteHeavyTabs,
  initExpedienteTabPreload,
  syncConsolidatedInnerTabButtons,
  renderGranularInnerTab,
  syncInnerTabVisualOnly,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-KPYQMO2I.js.map
