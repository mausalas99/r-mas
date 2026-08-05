import {
  isModeSala
} from "/mobile/js/chunks/chunk-AUDHCP7J.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-WOP35WT6.js";

// public/js/patient-datos-modal.mjs
var dismissWired = false;
function getBackdrop() {
  return document.getElementById("exp-datos-modal-backdrop");
}
function getMount() {
  return document.getElementById("exp-datos-modal-mount");
}
function getPanesHost() {
  return document.getElementById("expediente-panes-host");
}
function ensureDatosPaneInModal() {
  var pane = document.getElementById("itab-content-datos");
  var mount = getMount();
  if (!pane || !mount) return;
  if (pane.parentElement !== mount) {
    mount.appendChild(pane);
    pane.classList.remove("tab-content");
    pane.classList.add("exp-segment-panel", "active");
  }
  pane.hidden = false;
}
function returnDatosPaneToHost() {
  var pane = document.getElementById("itab-content-datos");
  var host = getPanesHost();
  if (!pane || !host || pane.parentElement === host) return;
  host.appendChild(pane);
  pane.classList.add("tab-content");
  pane.classList.remove("exp-segment-panel", "active");
  pane.hidden = true;
}
function closePatientDatosModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  returnDatosPaneToHost();
}
function openPatientDatosModal(patientId) {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  ensureDatosPaneInModal();
  if (typeof window !== "undefined" && typeof window.renderPatientDataPane === "function") {
    window.renderPatientDataPane(patientId);
  }
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  var closeBtn = backdrop.querySelector(".exp-datos-modal-close");
  if (closeBtn instanceof HTMLElement) closeBtn.focus();
}
function openPatientDatosModalForPatient(patientId) {
  openPatientDatosModal(patientId);
}
function wirePatientDatosModal() {
  if (dismissWired) return;
  dismissWired = true;
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.addEventListener("click", function(ev) {
    if (!backdrop.classList.contains("open")) return;
    if (ev.target !== backdrop) return;
    closePatientDatosModal();
  });
  document.addEventListener("keydown", function(ev) {
    if (ev.key !== "Escape" && ev.key !== "Esc") return;
    var bd = getBackdrop();
    if (!bd || !bd.classList.contains("open")) return;
    closePatientDatosModal();
  });
}
function wirePatientDatosModalOnce() {
  wirePatientDatosModal();
  var pane = document.getElementById("itab-content-datos");
  if (pane && !pane.closest("#exp-datos-modal-mount")) {
    pane.hidden = true;
    pane.classList.remove("active");
  }
}
var patientDatosModalWindowHandlers = {
  openPatientDatosModal,
  openPatientDatosModalForPatient,
  closePatientDatosModal
};

// public/js/expediente-tabs-migrate.mjs
function migrateGranularMobile(granularTab, settings) {
  if (!isMobileWeb()) return null;
  if (granularTab === "listado" || granularTab === "recetaHu") {
    return isModeSala(settings) ? "estadoActual" : "todo";
  }
  if (isModeSala(settings) && granularTab === "vpo") return "estadoActual";
  return null;
}
function migrateGranularSala(granularTab, settings) {
  if (isModeSala(settings) && (granularTab === "notas" || granularTab === "indica")) {
    return "estadoActual";
  }
  if (!isModeSala(settings) && granularTab === "listado") return "todo";
  return null;
}
function migrateGranularInner(granularTab, settings, granularMap) {
  if (!granularTab) return "todo";
  if (granularTab === "estadoActual" && !isModeSala(settings)) return "todo";
  if (granularTab === "manejo") return isModeSala(settings) ? "todo" : "notas";
  if (!granularMap[granularTab]) return "todo";
  const mobile = migrateGranularMobile(granularTab, settings);
  if (mobile) return mobile;
  const sala = migrateGranularSala(granularTab, settings);
  if (sala) return sala;
  return granularTab;
}

// public/js/expediente-tabs.mjs
var CONSOLIDATED_TABS_SALA = ["paciente", "clinico", "resultados", "salida"];
var CONSOLIDATED_TABS_INTER = ["paciente", "clinico", "resultados", "salida"];
var CLINICO_GRANULAR_TABS = [
  "notas",
  "indica",
  "historia",
  "estadoActual",
  "eventualidades",
  "vpo"
];
var COMPOSITE_PANE_IDS = ["paciente", "clinico", "resultados", "salida"];
function isClinicoCompositeVisible(settings) {
  if (!isModeSala(settings)) return true;
  return true;
}
function getConsolidatedTabs(settings) {
  var tabs = isModeSala(settings) ? CONSOLIDATED_TABS_SALA.slice() : CONSOLIDATED_TABS_INTER.slice();
  if (!isClinicoCompositeVisible(settings)) {
    tabs = tabs.filter(function(tab) {
      return tab !== "clinico";
    });
  }
  if (isMobileWeb()) {
    tabs = tabs.filter(function(tab) {
      return tab !== "salida";
    });
  }
  return tabs;
}
var RESULTADOS_SECTIONS = ["tend", "cult"];
var SALIDA_SECTIONS_SALA = ["listado", "vpo", "recetaHu"];
var GRANULAR_PANE_ORDER = [
  "datos",
  "notas",
  "indica",
  "historia",
  "tend",
  "cult",
  "listado",
  "todo",
  "vpo",
  "estadoActual",
  "eventualidades",
  "recetaHu"
];
var layoutMode = null;
function granularToConsolidatedMap(settings) {
  var sala = isModeSala(settings);
  var map = {
    datos: { tab: "paciente", section: null },
    todo: { tab: "paciente", section: null },
    notas: { tab: "clinico", section: "notas" },
    indica: { tab: "clinico", section: "indica" },
    historia: { tab: "clinico", section: "historia" },
    tend: { tab: "resultados", section: "tend" },
    cult: { tab: "resultados", section: "cult" },
    recetaHu: { tab: "salida", section: sala ? "recetaHu" : null },
    listado: { tab: sala ? "salida" : "paciente", section: sala ? "listado" : null },
    vpo: sala ? { tab: "salida", section: "vpo" } : { tab: "clinico", section: "vpo" }
  };
  if (sala) {
    map.estadoActual = { tab: "clinico", section: "estadoActual" };
    map.eventualidades = { tab: "clinico", section: "eventualidades" };
  }
  return map;
}
function paneMountSpec(granularTab, settings) {
  var sala = isModeSala(settings);
  if (granularTab === "vpo") {
    return sala ? { composite: "salida", selector: ".exp-segment-body--salida" } : { composite: "clinico", selector: ".exp-segment-body--clinico" };
  }
  var map = {
    datos: { composite: null, selector: null },
    todo: { composite: "paciente", selector: ".exp-pendientes-mount" },
    notas: { composite: "clinico", selector: ".exp-segment-body--clinico" },
    indica: { composite: "clinico", selector: ".exp-segment-body--clinico" },
    historia: { composite: "clinico", selector: ".exp-segment-body--clinico" },
    tend: { composite: "resultados", selector: ".exp-segment-body--resultados" },
    cult: { composite: "resultados", selector: ".exp-segment-body--resultados" },
    listado: sala ? { composite: "salida", selector: ".exp-segment-body--salida" } : { composite: null, selector: null },
    recetaHu: { composite: "salida", selector: ".exp-segment-body--salida" },
    estadoActual: sala ? { composite: "clinico", selector: ".exp-segment-body--clinico" } : { composite: null, selector: null },
    eventualidades: sala ? { composite: "clinico", selector: ".exp-segment-body--clinico" } : { composite: null, selector: null }
  };
  return map[granularTab] || null;
}
function getClinicoSections(settings) {
  if (isModeSala(settings)) {
    return ["estadoActual", "eventualidades"];
  }
  return ["notas", "indica", "vpo"];
}
function getSalidaSections(settings) {
  if (isMobileWeb()) return [];
  return isModeSala(settings) ? SALIDA_SECTIONS_SALA : [];
}
function resolveConsolidatedTarget(granularTab, settings) {
  if (granularTab === "manejo") {
    return isModeSala(settings) ? { tab: "paciente", section: null } : { tab: "clinico", section: "notas" };
  }
  var map = granularToConsolidatedMap(settings || {});
  var target = map[granularTab] || { tab: "paciente", section: null };
  if (isMobileWeb() && target.tab === "salida") {
    if (!isModeSala(settings) && granularTab === "vpo") {
      return { tab: "clinico", section: "vpo" };
    }
    return isModeSala(settings) ? { tab: "clinico", section: "estadoActual" } : { tab: "paciente", section: null };
  }
  return target;
}
function consolidatedTabForGranular(granularTab, settings) {
  if (granularTab === "manejo") {
    return isModeSala(settings) ? "paciente" : "clinico";
  }
  return resolveConsolidatedTarget(granularTab, settings).tab;
}
function migrateGranularInner2(granularTab, settings) {
  return migrateGranularInner(granularTab, settings, granularToConsolidatedMap(settings || {}));
}
function defaultGranularForConsolidatedTab(compositeTab, settings) {
  var sala = isModeSala(settings);
  var clinicoDefault = "notas";
  if (sala) clinicoDefault = "estadoActual";
  var defaults = {
    paciente: "todo",
    clinico: clinicoDefault,
    resultados: "tend",
    salida: isMobileWeb() ? sala ? "estadoActual" : "todo" : sala ? "listado" : "recetaHu"
  };
  return defaults[compositeTab] || "todo";
}
function consolidatedInnerTabButtonId(tab, settings) {
  var tabs = getConsolidatedTabs(settings || {});
  if (tabs.includes(tab)) return "itab-" + tab;
  return "itab-" + consolidatedTabForGranular(tab, settings);
}
function paneEl(granularTab) {
  return document.getElementById("itab-content-" + granularTab);
}
function compositeEl(name) {
  return document.getElementById("itab-content-" + name);
}
function mountPaneInComposite(granularTab, settings) {
  var pane = paneEl(granularTab);
  var spec = paneMountSpec(granularTab, settings);
  if (!pane || !spec || !spec.composite) return;
  var composite = compositeEl(spec.composite);
  if (!composite) return;
  var mount = composite.querySelector(spec.selector);
  if (mount && pane.parentElement !== mount) mount.appendChild(pane);
  pane.classList.remove("tab-content");
  pane.classList.add("exp-segment-panel");
}
function mountConsolidatedNested(settings) {
  GRANULAR_PANE_ORDER.forEach(function(tab) {
    mountPaneInComposite(tab, settings);
  });
  getConsolidatedTabs(settings || {}).forEach(function(tab) {
    var composite = compositeEl(tab);
    if (composite) composite.classList.add("tab-content", "exp-composite-pane");
  });
}
function syncConsolidatedSegmentBarVisibility(settings) {
  var sala = isModeSala(settings);
  var clinicoBar = document.getElementById("exp-segment-clinico");
  if (clinicoBar) {
    clinicoBar.style.display = !isClinicoCompositeVisible(settings) ? "none" : "";
    ["notas", "indica", "historia", "estadoActual", "eventualidades", "vpo"].forEach(
      function(section) {
        var btn = clinicoBar.querySelector('[data-exp-segment="' + section + '"]');
        if (!btn) return;
        if (section === "historia") {
          btn.style.display = "none";
        } else if (section === "estadoActual" || section === "eventualidades") {
          btn.style.display = sala ? "" : "none";
        } else if (section === "vpo") {
          btn.style.display = sala ? "none" : "";
        } else {
          btn.style.display = sala ? "none" : "";
        }
      }
    );
  }
  var salidaBar = document.getElementById("exp-segment-salida");
  if (salidaBar) {
    salidaBar.style.display = sala && getSalidaSections(settings).length ? "" : "none";
    var vpoSalidaBtn = salidaBar.querySelector('[data-exp-segment="vpo"]');
    if (vpoSalidaBtn) vpoSalidaBtn.style.display = sala ? "" : "none";
  }
  var estadoActualTab = document.getElementById("itab-estadoActual");
  if (estadoActualTab) estadoActualTab.style.display = "none";
}
function applyExpedientePaneLayout(settings) {
  var sala = isModeSala(settings);
  syncConsolidatedSegmentBarVisibility(settings || {});
  var next = sala ? "consolidated-sala" : "consolidated-inter";
  if (layoutMode === next) return;
  layoutMode = next;
  mountConsolidatedNested(settings || {});
  syncConsolidatedSegmentBarVisibility(settings || {});
}
function resetExpedientePaneLayoutCache() {
  layoutMode = null;
}
function syncConsolidatedSegmentBars(granularTab, settings) {
  var target = resolveConsolidatedTarget(granularTab, settings);
  var sections = getClinicoSections(settings);
  function syncBar(barEl, sectionIds, compositeTab) {
    if (!barEl) return;
    sectionIds.forEach(function(section) {
      var btn = barEl.querySelector('[data-exp-segment="' + section + '"]');
      if (!btn) return;
      var on = target.tab === compositeTab && target.section === section;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
  }
  syncBar(document.getElementById("exp-segment-clinico"), sections, "clinico");
  syncBar(document.getElementById("exp-segment-resultados"), RESULTADOS_SECTIONS, "resultados");
  syncBar(document.getElementById("exp-segment-salida"), getSalidaSections(settings), "salida");
}
function getConsolidatedCompositeState(granularTab, settings) {
  var target = resolveConsolidatedTarget(granularTab, settings);
  var visibleTabs = getConsolidatedTabs(settings || {});
  var state = {};
  COMPOSITE_PANE_IDS.forEach(function(tab) {
    var visible = visibleTabs.indexOf(tab) >= 0;
    state[tab] = { visible, active: visible && tab === target.tab };
  });
  return state;
}
function syncConsolidatedPaneVisibility(granularTab, settings, opts) {
  opts = opts || {};
  var target = resolveConsolidatedTarget(granularTab, settings);
  var compositeState = getConsolidatedCompositeState(granularTab, settings);
  COMPOSITE_PANE_IDS.forEach(function(tab) {
    var composite = compositeEl(tab);
    if (!composite) return;
    var pane = compositeState[tab];
    composite.hidden = !pane.visible;
    composite.classList.toggle("active", pane.active);
  });
  var datosActions = document.getElementById("exp-paciente-datos-actions");
  if (datosActions) {
    datosActions.hidden = !(compositeState.paciente && compositeState.paciente.active);
  }
  var driveActions = document.getElementById("exp-clinico-drive-actions");
  if (driveActions) {
    driveActions.hidden = !(isModeSala(settings) && compositeState.clinico && compositeState.clinico.active);
  }
  CLINICO_GRANULAR_TABS.forEach(function(section) {
    var pane = paneEl(section);
    if (!pane) return;
    var onClinico = target.tab === "clinico" && target.section === section;
    var onSalida = target.tab === "salida" && target.section === section && section === "vpo";
    pane.classList.toggle("active", onClinico || onSalida);
  });
  RESULTADOS_SECTIONS.forEach(function(section) {
    var pane = paneEl(section);
    if (pane) {
      pane.classList.toggle("active", target.tab === "resultados" && target.section === section);
    }
  });
  var datosPane = paneEl("datos");
  var todoPane = paneEl("todo");
  var salidaSections = getSalidaSections(settings);
  if (salidaSections.length) {
    salidaSections.forEach(function(section) {
      var pane = paneEl(section);
      if (pane) pane.classList.toggle("active", target.tab === "salida" && target.section === section);
    });
  } else {
    var recetaPane = paneEl("recetaHu");
    if (recetaPane) recetaPane.classList.toggle("active", target.tab === "salida" && granularTab === "recetaHu");
  }
  if (datosPane) {
    var datosInModal = !!datosPane.closest("#exp-datos-modal-mount");
    datosPane.classList.toggle("active", datosInModal);
    datosPane.hidden = !datosInModal;
  }
  if (todoPane) todoPane.classList.toggle("active", target.tab === "paciente");
  if (granularTab === "datos") {
    if (opts.datosPatientId != null && opts.datosPatientId !== "") {
      openPatientDatosModalForPatient(opts.datosPatientId);
    } else {
      openPatientDatosModal();
    }
  }
}

export {
  closePatientDatosModal,
  wirePatientDatosModalOnce,
  patientDatosModalWindowHandlers,
  isClinicoCompositeVisible,
  getConsolidatedTabs,
  RESULTADOS_SECTIONS,
  getClinicoSections,
  getSalidaSections,
  resolveConsolidatedTarget,
  consolidatedTabForGranular,
  migrateGranularInner2 as migrateGranularInner,
  defaultGranularForConsolidatedTab,
  consolidatedInnerTabButtonId,
  applyExpedientePaneLayout,
  resetExpedientePaneLayoutCache,
  syncConsolidatedSegmentBars,
  syncConsolidatedPaneVisibility
};
//# sourceMappingURL=/js/chunks/chunk-C6TP3H7V.js.map
