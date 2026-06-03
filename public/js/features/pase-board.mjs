/**
 * Vista Pase (resumen) y navegación de pestañas principales / internas.
 */
import { renderEntry } from "../labs.js";
import { storage } from "../storage.js";
import { sortLabHistoryChronological, normalizeFechaLabHistory } from "../tend-core.mjs";
import { dosisBeforeSlash } from "../med-receta-core.mjs";
import { patients, medRecetaByPatient } from "../app-state.mjs";
import {
  isPaseMode,
  isGuardiaMode,
  getUiDensity,
  setUiDensity,
  markOpenedDetailFromPaseBoard,
} from "./chrome.mjs";
import { renderGuardiaBoard } from "./guardia-board.mjs";
import { isModeSala } from "../mode-features.mjs";
import {
  extractCultivoTableRowsFromHistory,
  filterCultivoRowsSignificantFlip,
  paseCultivoAtbBlockHtml,
  removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels,
  renderPatientDataPane,
  renderCultivosTable,
  renderListadoForm,
} from "./expediente.mjs";
import { inferFechaLabSetFromId, renderTendencias } from "./tendencias.mjs";
import { renderTodoForm, todoCompareForSort, toggleTodo } from "./todos.mjs";
import { renderNoteForm, renderIndicaForm } from "./notes-indicaciones.mjs";
import { invalidateManejoShell, renderManejo } from "./manejo.mjs";
import {
  renderHistoriaClinicaPanel,
  invalidateHistoriaClinicaPanel,
} from "./historia-clinica-panel.mjs";
import {
  renderEventualidadesPanel,
  invalidateEventualidadesPanel,
} from "./eventualidades-panel.mjs";
import { renderVpo } from "./vpo.mjs";
import { invalidateEaPanelCache, renderEstadoActualPanel } from "./estado-actual-panel.mjs";
import { renderRecetaHu } from "./receta-hu.mjs";
import { scrollActiveRondaCardIntoView, setRoundOverviewMode, syncRoundExpedienteLayout } from "./patients.mjs";
import { renderEstadoActualBar } from "./soap-estado.mjs";
import {
  animateTabPanelEnter,
  hideAppTabPanel,
  initTabBarMotion,
  innerTabButtonId,
  showAppTabPanel,
  syncAppTabIndicator,
  syncInnerTabIndicator,
  syncExpedienteSegmentIndicators,
  syncAllSubTabIndicators,
} from "../ui-tab-motion.mjs";
import {
  applyExpedientePaneLayout,
  consolidatedTabForGranular,
  consolidatedInnerTabButtonId,
  defaultGranularForConsolidatedTab,
  GRANULAR_TABS,
  isClinicoCompositeVisible,
  migrateGranularInner,
  resetExpedientePaneLayoutCache,
  syncConsolidatedPaneVisibility,
  syncConsolidatedSegmentBars,
  syncPacienteDatosLayoutMode,
  useConsolidatedExpedienteTabs,
} from "../expediente-tabs.mjs";
import { isManejoTabGloballyHidden } from "../clinical-product-policy.mjs";
import { getLabHistoryRevision } from "../lab-history-cache.mjs";
import { cancelDeferredIdleWork, scheduleAfterPaint, scheduleIdle } from "../deferred-work.mjs";

export { initTabBarMotion } from "../ui-tab-motion.mjs";

/** Evita re-render completo al volver a una pestaña ya pintada (mismo paciente). */
var innerTabRenderCache = Object.create(null);
var expedientePreloadTimer = null;
var expedientePreloadTab = null;
var expedienteTabPreloadWired = false;

export function invalidateInnerTabRenderCache(tab) {
  if (tab) {
    delete innerTabRenderCache[tab];
    return;
  }
  innerTabRenderCache = Object.create(null);
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
  var p = patients.find(function (x) {
    return String(x.id) === String(patientId);
  });
  if (!p || !p.monitoreo) return "0";
  var m = p.monitoreo;
  var h = Array.isArray(m.historial) ? m.historial.length : 0;
  var s =
    m.textoGuardado && m.textoGuardado.savedAt != null ? String(m.textoGuardado.savedAt) : "";
  return String(h) + ":" + s;
}

function innerTabRenderCacheKey(tab) {
  var pid = String(rt.getActiveId() || "");
  var settings = rt.getSettings();
  var key =
    String(tab || "") +
    "|" +
    pid +
    "|M" +
    (settings && settings.appMode ? settings.appMode : "sala");
  if (tab === "tend" || tab === "cult") {
    key += "|L" + getLabHistoryRevision(pid);
  }
  if (tab === "estadoActual") {
    key += "|E" + estadoActualCacheSuffix(pid);
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
var _paseBoardCacheKey = "";

export function cancelExpedienteWarm() {
  _expedienteWarmGen += 1;
  _expedienteWarmQueued = false;
  if (expedientePreloadTimer) {
    clearTimeout(expedientePreloadTimer);
    expedientePreloadTimer = null;
    expedientePreloadTab = null;
  }
}

function expedienteCompositeTab(granularTab, settings) {
  if (!useConsolidatedExpedienteTabs(settings)) return granularTab;
  return consolidatedTabForGranular(granularTab, settings);
}

function buildPaseBoardCacheKey(pid) {
  var todos = storage.getTodos(pid);
  var done = 0;
  for (var i = 0; i < todos.length; i += 1) {
    if (todos[i].completed) done += 1;
  }
  var med = (medRecetaByPatient[pid] && medRecetaByPatient[pid].items) || [];
  var ag = getPaseAgendaForPatient(pid);
  return (
    String(pid) +
    "|L" +
    getLabHistoryRevision(pid) +
    "|T" +
    todos.length +
    ":" +
    done +
    "|M" +
    med.length +
    "|A" +
    ag.length
  );
}

/** Precalienta Estado actual + Tendencias en idle (Sala). */
export function warmExpedienteHeavyTabs() {
  if (_expedienteWarmQueued || typeof document === "undefined") return;
  if (!isModeSala(rt.getSettings())) return;
  if (!rt.getActiveId() || rt.getActiveAppTab() !== "nota") return;
  _expedienteWarmQueued = true;
  var warmGen = _expedienteWarmGen;
  scheduleIdle(function () {
    _expedienteWarmQueued = false;
    if (warmGen !== _expedienteWarmGen) return;
    if (!rt.getActiveId() || rt.getActiveAppTab() !== "nota") return;
    var settings = rt.getSettings();
    var active = migrateGranularInner(rt.getActiveInner() || "todo", settings);
    ["estadoActual", "tend"].forEach(function (tab) {
      if (tab === active) return;
      if (isInnerTabContentFresh(tab, settings)) return;
      renderGranularInnerTab(tab);
    });
  }, 1200);
}

function resolvePreloadGranularTab(el) {
  if (!el || !el.id) return null;
  var settings = rt.getSettings();
  if (el.classList.contains('exp-consolidated-tab')) {
    var composite = el.id.replace(/^itab-/, '');
    return defaultGranularForConsolidatedTab(composite, settings);
  }
  if (el.classList.contains('exp-segment-btn')) {
    var section = el.getAttribute('data-exp-segment');
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
  expedientePreloadTimer = setTimeout(function () {
    expedientePreloadTimer = null;
    expedientePreloadTab = null;
    if (innerTabRenderCache[granularTab] === innerTabRenderCacheKey(granularTab)) return;
    renderGranularInnerTab(granularTab);
  }, 70);
}

export function initExpedienteTabPreload() {
  if (expedienteTabPreloadWired || typeof document === 'undefined') return;
  expedienteTabPreloadWired = true;
  document.addEventListener(
    'pointerenter',
    function (ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== 'function') return;
      var btn = target.closest('.exp-consolidated-tab, .exp-segment-btn');
      if (!btn) return;
      scheduleExpedienteTabPreload(resolvePreloadGranularTab(btn));
    },
    true
  );
}

function renderHeavyInnerTab(tab, run, opts) {
  if (opts && opts.force) {
    run(function () {});
    return;
  }
  run(markInnerTabRendered.bind(null, tab));
}

/** @type {{
 *   getActiveAppTab(): string,
 *   setActiveAppTab(tab: string): void,
 *   getActiveInner(): string,
 *   setActiveInner(tab: string): void,
 *   getActiveId(): string|null,
 *   renderMedRecetaPanel(): void,
 *   renderLabHistoryPanel(): void,
 *   renderProcedureAgendaPanel(): void,
 *   setMedTabAttention(on?: boolean): void,
 *   syncWorkContextChrome(): void,
 *   ensureParsedLabHistory(pid: string): unknown[],
 *   splitResLabsByTipo(rows: unknown[]): { labs: unknown[], cultivo: unknown[] },
 *   primaryTipoForLabSet(resLabs: unknown[]): string,
 *   getSettings(): { appMode?: string },
 * }} */
var rt = {
  getActiveAppTab() {
    return "lab";
  },
  setActiveAppTab() {},
  getActiveInner() {
    return "todo";
  },
  setActiveInner() {},
  getActiveId() {
    return null;
  },
  renderMedRecetaPanel() {},
  renderLabHistoryPanel() {},
  renderProcedureAgendaPanel() {},
  setMedTabAttention() {},
  syncWorkContextChrome() {},
  ensureParsedLabHistory() {
    return [];
  },
  splitResLabsByTipo(rows) {
    void rows;
    return { labs: [], cultivo: [] };
  },
  primaryTipoForLabSet(resLabs) {
    void resLabs;
    return "labs";
  },
  getSettings() {
    return { appMode: "sala" };
  },
};

export function registerPaseBoardRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Misma fila que Laboratorio (colores BH/QS, valores alterados). */
function buildPaseLabBlockHtml(labChunks) {
  if (!labChunks || !labChunks.length) return "";
  var parts = [];
  labChunks.forEach(function (text) {
    renderEntry(text).forEach(function (htmlLine, idx) {
      parts.push(
        '<div class="pase-lab-line' + (idx === 0 ? " pase-lab-line--sechead" : "") + '">' + htmlLine + "</div>"
      );
    });
  });
  return '<div class="pase-lab-block" role="text">' + parts.join("") + "</div>";
}

/** Limpia línea de dosis para tarjeta Pase: solo lo aplicable (antes de //), sin *DIA#*, sin calendario colado. */
function cleanPaseMedDosisForCard(dosisRaw) {
  var s = String(dosisBeforeSlash(dosisRaw) || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  var día =
    /\b(?:LOS\s+)?(?:LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|VIERNES|SABADO|SÁBADO|DOMINGO)\b/i;
  var m = s.match(día);
  if (m && m.index != null && m.index > 0) {
    s = s
      .slice(0, m.index)
      .replace(/\s*(?:,\s*|\bY\b|\bO\b)\s*$/gi, "")
      .replace(/[,\s]+$/g, "")
      .trim();
  }
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Abrevia cantidades muy grandes en UI/IU para la pastilla Pase (p. ej. 2400000 → 2.4M).
 * Solo valores enteros sencillos tras // para evitar ambigüedad con miles con separadores.
 */
function abbreviatePaseMedDosisCore(core) {
  var t = String(core || "").trim();
  if (!t) return t;
  var m = t.match(/^(\d+)\s*(UI|IU)\s*$/i);
  if (!m) return t;
  var n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1e6) return t;
  var mil = n / 1e6;
  var label = mil % 1 === 0 ? String(mil) : String(Math.round(mil * 10) / 10).replace(".", ",");
  return label + "M " + m[2].toUpperCase();
}

/**
 * Separa número+unidad (núcleo sin partir) del resto del texto de dosis para chips Pase.
 */
function splitPaseMedDosisForDisplay(dosisClean) {
  var s = String(dosisClean || "").trim();
  if (!s) return { core: "", extra: "", splitOk: false };
  var unit =
    "(?:UI\\/ML|IU\\/ML|MCG\\/ML|MG\\/ML|" +
    "\\b(?:UI|IU|MCG|UG|MG|NG|ML|UL)\\b)";
  var re = new RegExp(
    "^((?:\\d+(?:[,\\.]\\d+)?(?:\\s*/\\s*\\d+(?:[,\\.]\\d+)?)?\\s*(?:" +
      unit +
      "))|(?:\\d+(?:[,\\.]\\d+)?\\s*%))(?:\\s+([\\s\\S]*))?$",
    "i"
  );
  var m = s.match(re);
  if (!m || !String(m[1] || "").trim()) return { core: s, extra: "", splitOk: false };
  return {
    core: String(m[1]).trim(),
    extra: String(m[2] || "").trim(),
    splitOk: true,
  };
}

/** Vía resumida para tarjetas Pase. */
function abbreviatePaseMedVia(viaRaw) {
  var u = String(viaRaw || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!u.trim()) return "";
  if (/\bINTRAPERITONEAL\b/.test(u)) return "IP";
  if (/\bINTRAMUSCULAR\b/.test(u)) return "IM";
  if (/\bINTRAVENOSA\b/.test(u)) return "IV";
  if (/\bORAL\b/.test(u)) return "VO";
  var fallback = String(viaRaw || "").trim();
  return fallback.length > 28 ? fallback.slice(0, 26) + "…" : fallback;
}

/** Título corto Pase: principio activo (antes de la dosis numérica); sin (*…). */
function paseMedPrincipioActivoTitle(nombreRaw) {
  var s = String(nombreRaw || "").trim();
  if (!s) return "";
  s = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  var chunk = s.split(/\s+(?=\d)/)[0] || "";
  chunk = chunk.trim();
  return chunk.slice(0, 120) || s.slice(0, 120);
}

function findPaseLatestLabSend(patientId) {
  if (!patientId) return null;
  var hist = sortLabHistoryChronological(rt.ensureParsedLabHistory(patientId));
  for (var i = 0; i < hist.length; i++) {
    var set = hist[i];
    var tipo = rt.primaryTipoForLabSet(set.resLabs);
    if (tipo === "cultivo") continue;
    var sp = rt.splitResLabsByTipo(set.resLabs || []);
    var labChunks = sp.labs.filter(function (x) {
      return String(x || "").trim();
    });
    if (!labChunks.length) continue;
    var meta = rt.formatLabHistoryListMeta(set);
    return { meta: meta, labChunks: labChunks };
  }
  return null;
}

function getPaseAgendaForPatient(patientId) {
  var cutoff = Date.now() - 3600000;
  return storage
    .getScheduledProcedures()
    .filter(function (ev) {
      return String(ev.patientId) === String(patientId);
    })
    .filter(function (ev) {
      var t = Date.parse(ev.start);
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort(function (a, b) {
      return Date.parse(a.start) - Date.parse(b.start);
    })
    .slice(0, 12);
}

function buildPasePatientHeaderHtml(patient) {
  if (!patient) return "";
  var chips = [];
  if (patient.cuarto) chips.push({ label: "Cto.", value: String(patient.cuarto) });
  if (patient.cama) chips.push({ label: "Cama", value: String(patient.cama) });
  if (patient.servicio) chips.push({ label: "Servicio", value: String(patient.servicio) });
  if (patient.registro) chips.push({ label: "Reg.", value: String(patient.registro), mono: true });
  var chipsHtml = chips
    .map(function (c) {
      return (
        '<span class="pase-patient-chip' +
        (c.mono ? " pase-patient-chip--mono" : "") +
        '"><span class="pase-patient-chip-label">' +
        esc(c.label) +
        "</span> " +
        esc(c.value) +
        "</span>"
      );
    })
    .join("");
  return (
    '<section class="pase-section pase-patient-banner" aria-label="Paciente activo">' +
    '<div class="pase-patient-banner-body">' +
    '<div class="pase-patient-name">' +
    esc(patient.nombre || "Paciente") +
    "</div>" +
    (chipsHtml ? '<div class="pase-patient-meta-row">' + chipsHtml + "</div>" : "") +
    "</div>" +
    "</section>"
  );
}

export function renderPaseBoard() {
  var host = document.getElementById("pase-board-scroll");
  if (!host || !isPaseMode()) return;
  var aid = rt.getActiveId();
  if (aid) {
    var cacheKey = buildPaseBoardCacheKey(aid);
    if (_paseBoardCacheKey === cacheKey && host.querySelector(".pase-patient-header")) {
      return;
    }
    _paseBoardCacheKey = cacheKey;
  } else {
    _paseBoardCacheKey = "";
  }
  removeAtbRisPanelsFromBody();
  if (!host._paseDelegate) {
    host._paseDelegate = true;
    host.addEventListener("click", function (e) {
      var todoBtn = e.target.closest("[data-pase-todo]");
      if (todoBtn && todoBtn.getAttribute("data-pase-todo")) {
        e.preventDefault();
        toggleTodo(todoBtn.getAttribute("data-pase-todo"));
      }
    });
  }
  if (!aid) {
    host.innerHTML =
      '<div class="pase-empty-screen" role="status">Selecciona un paciente en la lista para ver el resumen.</div>';
    return;
  }
  var pid = aid;
  var parts = [];
  var patient = patients.find(function (x) {
    return String(x.id) === String(pid);
  });
  parts.push(buildPasePatientHeaderHtml(patient));

  var todos = storage.getTodos(pid).slice().sort(todoCompareForSort);
  var ag = getPaseAgendaForPatient(pid);

  var todoParts = [];
  if (!todos.length) {
    todoParts.push('<div class="pase-mini-card pase-mini-card--dim">Sin pendientes.</div>');
  } else {
    todos.forEach(function (t) {
      var prio = t.priority === "alta" ? "alta" : t.priority === "baja" ? "baja" : "media";
      todoParts.push(
        '<div class="pase-mini-card pase-todo-card todo-prio-' +
          prio +
          (t.completed ? " pase-mini-card--todo-done" : "") +
          '">' +
          '<button type="button" class="pase-todo-hit" data-pase-todo="' +
          esc(String(t.id)) +
          '" aria-label="' +
          (t.completed ? "Marcar como pendiente" : "Marcar como hecho") +
          '">' +
          (t.completed ? "✓" : "○") +
          "</button>" +
          "<span>" +
          esc(String(t.text || "")) +
          "</span></div>"
      );
    });
  }
  var agParts = [];
  if (!ag.length) {
    agParts.push('<div class="pase-mini-card pase-mini-card--dim">Sin procedimientos próximos.</div>');
  } else {
    ag.forEach(function (ev) {
      var when = new Date(ev.start);
      var whenStr = isNaN(when.getTime())
        ? "—"
        : when.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
      agParts.push(
        '<div class="pase-mini-card"><strong>' +
          esc(String(ev.procedure || "Procedimiento")) +
          '</strong><span class="pase-sub">' +
          esc(whenStr + " · " + String(ev.location || "").trim()) +
          "</span></div>"
      );
    });
  }

  parts.push('<div class="pase-section-row pase-section-row--split">');
  parts.push('<section class="pase-section" aria-label="Pendientes">');
  parts.push('<div class="pase-section-head">');
  parts.push(
    '<button type="button" class="pase-section-title" onclick="openPaseSectionInNormal(\'pendientes\')">Pendientes</button>'
  );
  parts.push('</div><div class="pase-dual-col-grid">');
  parts.push(todoParts.join(""));
  parts.push("</div></section>");

  parts.push('<section class="pase-section" aria-label="Agenda">');
  parts.push('<div class="pase-section-head">');
  parts.push(
    '<button type="button" class="pase-section-title" onclick="openPaseSectionInNormal(\'agenda\')">Agenda</button>'
  );
  parts.push('</div><div class="pase-dual-col-grid">');
  parts.push(agParts.join(""));
  parts.push("</div></section>");
  parts.push("</div>");

  var labSend = findPaseLatestLabSend(pid);
  parts.push('<section class="pase-section" aria-label="Laboratorio">');
  parts.push('<div class="pase-section-head">');
  parts.push(
    '<button type="button" class="pase-section-title" onclick="openPaseSectionInNormal(\'labs\')" aria-label="Laboratorio">Labs</button>'
  );
  parts.push('</div><div class="pase-card-grid">');
  if (!labSend) {
    parts.push(
      '<div class="pase-mini-card pase-mini-card--dim">Sin envíos de laboratorio convencional en el historial.</div>'
    );
  } else {
    parts.push(
      '<div class="pase-mini-card pase-mini-card--wide pase-mini-card--lab">' +
        '<div class="pase-lab-meta">' +
        esc(labSend.meta) +
        "</div>" +
        buildPaseLabBlockHtml(labSend.labChunks) +
        "</div>"
    );
  }
  parts.push("</div></section>");

  var flatRows = extractCultivoTableRowsFromHistory(pid);
  var displayRows = filterCultivoRowsSignificantFlip(flatRows);
  displayRows = displayRows.slice().sort(function (a, b) {
    var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
    var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
    if (db !== da) return db - da;
    return (b._seq || 0) - (a._seq || 0);
  });
  parts.push('<section class="pase-section" aria-label="Cultivos">');
  parts.push('<div class="pase-section-head">');
  parts.push(
    '<button type="button" class="pase-section-title" onclick="openPaseSectionInNormal(\'cultivos\')">Cultivos</button>'
  );
  parts.push('</div><div class="pase-card-grid">');
  if (!displayRows.length) {
    parts.push(
      '<div class="pase-mini-card pase-mini-card--dim">Sin cultivos relevantes para la ronda (positivos o negativos con cambio de signo en la misma muestra).</div>'
    );
  } else {
    displayRows.slice(0, 10).forEach(function (r) {
      var fd = r.fechaMuestra && r.fechaMuestra !== "—" ? r.fechaMuestra : r.studyDate || "—";
      var atbBlock = paseCultivoAtbBlockHtml(pid, r);
      parts.push(
        '<div class="pase-mini-card pase-cultivo-card' +
          (r.negativo ? " pase-mini-card--dim" : "") +
          '"><div class="pase-cult-org">' +
          esc(String(r.organismo || "—")) +
          (r.cuenta
            ? '<div class="pase-cult-cuenta">' + esc(String(r.cuenta)) + "</div>"
            : "") +
          "</div>" +
          atbBlock +
          '<div class="pase-sub">' +
          esc(String(r.tipoLabel || "") + " · " + String(r.sitio || "").slice(0, 72)) +
          "<br>" +
          esc(fd) +
          "</div></div>"
      );
    });
  }
  parts.push("</div></section>");

  var block = medRecetaByPatient[pid];
  var medItems =
    block && block.items
      ? block.items.filter(function (it) {
          return !it.suspendido;
        })
      : [];
  parts.push('<section class="pase-section" aria-label="Medicamentos">');
  parts.push('<div class="pase-section-head">');
  parts.push(
    '<button type="button" class="pase-section-title" onclick="openPaseSectionInNormal(\'med\')">Medicamentos</button>'
  );
  parts.push('</div><div class="pase-card-grid">');
  if (!medItems.length) {
    parts.push(
      '<div class="pase-mini-card pase-mini-card--dim">Sin medicamentos activos en la receta (o todos excluidos).</div>'
    );
  } else {
    medItems.forEach(function (it) {
      var nombre = paseMedPrincipioActivoTitle(it.nombreRaw || "");
      var viaAbbr = abbreviatePaseMedVia(it.viaRaw || "");
      var freq = String(it.frecuenciaRaw || "").trim();
      var dosis = cleanPaseMedDosisForCard(it.dosisRaw || "");
      var dosisSplit = dosis ? splitPaseMedDosisForDisplay(dosis) : { core: "", extra: "", splitOk: false };
      var diaBadge =
        it.diaTratamiento != null
          ? '<div class="pase-med-dia-badge" title="Día de tratamiento">Día ' +
            esc(String(it.diaTratamiento)) +
            "</div>"
          : "";
      var metaParts = [];
      if (dosisSplit.core || dosisSplit.extra) {
        if (dosisSplit.splitOk) {
          metaParts.push(
            '<span class="pase-med-chip pase-med-chip--dosis">' +
              (dosisSplit.core
                ? '<span class="pase-med-dosis-core">' +
                  esc(abbreviatePaseMedDosisCore(dosisSplit.core)) +
                  "</span>"
                : "") +
              (dosisSplit.extra ? '<span class="pase-med-dosis-rest">' + esc(dosisSplit.extra) + "</span>" : "") +
              "</span>"
          );
        } else {
          metaParts.push('<span class="pase-med-chip">' + esc(dosisSplit.core) + "</span>");
        }
      }
      if (viaAbbr) {
        metaParts.push('<span class="pase-med-chip">' + esc(viaAbbr) + "</span>");
      }
      if (freq) {
        metaParts.push('<span class="pase-med-chip">' + esc(freq) + "</span>");
      }
      var metaRow =
        metaParts.length > 0 ? '<div class="pase-med-meta-row">' + metaParts.join("") + "</div>" : "";
      parts.push(
        '<div class="pase-mini-card pase-med-card"><div class="pase-med-card-head">' +
          '<div class="pase-med-name">' +
          esc(nombre) +
          "</div>" +
          diaBadge +
          "</div>" +
          metaRow +
          "</div>"
      );
    });
  }
  parts.push("</div></section>");

  host.innerHTML = parts.join("");
  wireAtbRisHoverPanels(host);
}

export function openPaseSectionInNormal(which) {
  var w = String(which || "").toLowerCase();
  var wasPase = isPaseMode();
  if (getUiDensity() !== "normal") {
    setUiDensity("normal");
  }
  if (wasPase) markOpenedDetailFromPaseBoard();
  if (w === "labs" || w === "lab") {
    switchAppTab("lab");
  } else if (w === "pendientes" || w === "todo") {
    switchAppTab("nota");
    switchInnerTab("todo");
  } else if (w === "agenda") {
    switchAppTab("agenda");
  } else if (w === "cultivos" || w === "cult") {
    switchAppTab("nota");
    switchInnerTab("cult");
  } else if (w === "tend" || w === "tendencias") {
    switchAppTab("nota");
    switchInnerTab("tend");
  } else if (w === "med" || w === "medicamentos") {
    switchAppTab("med");
  } else if (w === "manejo") {
    switchAppTab("nota");
    switchInnerTab(isManejoTabGloballyHidden() ? (isModeSala(rt.getSettings()) ? "historia" : "notas") : "manejo");
  } else if (w === "recetahu" || w === "receta-hu" || w === "receta_hu") {
    switchAppTab("nota");
    switchInnerTab("recetaHu");
  } else if (w === "expediente" || w === "nota") {
    switchAppTab("nota");
    switchInnerTab("notas");
  } else {
    switchAppTab("nota");
    switchInnerTab("notas");
  }
  if (getUiDensity() === "normal") {
    requestAnimationFrame(function () {
      scrollActiveRondaCardIntoView();
    });
  }
}

export function switchAppTab(tab) {
  if (tab === "lan") tab = "lab";
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  var prevAppTab = rt.getActiveAppTab();
  rt.setActiveAppTab(tab);
  if (tab === "nota" && isPaseMode() && prevAppTab !== "nota") {
    setRoundOverviewMode(true);
  }
  if (tab === "nota" && prevAppTab !== "nota" && !isPaseMode()) {
    switchInnerTab("todo");
  }
  var apptabLab = document.getElementById("apptab-lab");
  var apptabNota = document.getElementById("apptab-nota");
  var apptabMed = document.getElementById("apptab-med");
  var apptabAgenda = document.getElementById("apptab-agenda");
  var appcontentLab = document.getElementById("appcontent-lab");
  var appcontentMed = document.getElementById("appcontent-med");
  var appcontentNota = document.getElementById("appcontent-nota");
  var appcontentAgenda = document.getElementById("appcontent-agenda");
  var guardia = isGuardiaMode();
  var unified = isPaseMode();

  if (apptabLab) apptabLab.classList.toggle("active", tab === "lab");
  if (apptabNota) apptabNota.classList.toggle("active", tab === "nota");
  if (apptabMed) apptabMed.classList.toggle("active", tab === "med");
  if (apptabAgenda) apptabAgenda.classList.toggle("active", tab === "agenda");

  var paseRoot = document.getElementById("appcontent-pase");
  var guardiaRoot = document.getElementById("appcontent-guardia");
  var standardPanels = [appcontentLab, appcontentMed, appcontentNota, appcontentAgenda];

  if (guardia) {
    standardPanels.forEach(function (p) {
      hideAppTabPanel(p);
    });
    if (paseRoot) hideAppTabPanel(paseRoot);
    if (guardiaRoot) {
      showAppTabPanel(guardiaRoot, false);
      guardiaRoot.style.display = "flex";
      guardiaRoot.style.flexDirection = "column";
      guardiaRoot.style.flex = "1";
      guardiaRoot.style.minHeight = "0";
      guardiaRoot.style.overflow = "hidden";
    }
    renderGuardiaBoard(rt.getSettings());
  } else if (unified) {
    standardPanels.forEach(function (p) {
      hideAppTabPanel(p);
    });
    if (guardiaRoot) hideAppTabPanel(guardiaRoot);
    if (paseRoot) {
      var animatePase = prevAppTab !== tab || paseRoot.style.display === "none";
      showAppTabPanel(paseRoot, animatePase);
      paseRoot.style.flexDirection = "column";
    }
    renderPaseBoard();
  } else {
    if (paseRoot) hideAppTabPanel(paseRoot);
    if (guardiaRoot) hideAppTabPanel(guardiaRoot);
    var animatePanels = prevAppTab !== tab;
    if (appcontentLab) {
      if (tab === "lab") showAppTabPanel(appcontentLab, animatePanels);
      else hideAppTabPanel(appcontentLab);
    }
    if (appcontentMed) {
      if (tab === "med") showAppTabPanel(appcontentMed, animatePanels);
      else hideAppTabPanel(appcontentMed);
    }
    if (appcontentNota) {
      if (tab === "nota") showAppTabPanel(appcontentNota, animatePanels);
      else hideAppTabPanel(appcontentNota);
    }
    if (appcontentAgenda) {
      if (tab === "agenda") showAppTabPanel(appcontentAgenda, animatePanels);
      else hideAppTabPanel(appcontentAgenda);
    }
    if (tab === "lab") rt.renderLabHistoryPanel();
    if (tab === "med") rt.renderMedRecetaPanel();
    if (tab === "agenda") rt.renderProcedureAgendaPanel();
    if (tab === "nota" && rt.getActiveInner() === "tend") renderTendencias();
  }

  syncMainAppTabA11y(tab);

  if (tab === "med") rt.setMedTabAttention(false);

  syncAppTabIndicator(tab);
  rt.syncWorkContextChrome();
  if (rt.getActiveAppTab() === "nota") syncRoundExpedienteLayout();
}

export function syncMainAppTabA11y(tab) {
  if (tab === "lan") tab = "lab";
  var rows = [
    ["lab", "apptab-lab", "appcontent-lab", "appTab.lab"],
    ["nota", "apptab-nota", "appcontent-nota", "appTab.nota"],
    ["med", "apptab-med", "appcontent-med", "appTab.med"],
    ["agenda", "apptab-agenda", "appcontent-agenda", "appTab.agenda"],
  ];
  var list = document.getElementById("app-main-tablist");
  if (isGuardiaMode()) {
    if (list) list.setAttribute("aria-hidden", "true");
    rows.forEach(function (r) {
      var b = document.getElementById(r[1]);
      var p = document.getElementById(r[2]);
      if (b) {
        b.setAttribute("aria-hidden", "true");
        b.setAttribute("tabindex", "-1");
      }
      if (p) {
        p.setAttribute("role", "tabpanel");
        p.removeAttribute("aria-label");
        p.setAttribute("aria-labelledby", r[1]);
        p.setAttribute("aria-hidden", "true");
      }
    });
    var paseRootG = document.getElementById("appcontent-pase");
    if (paseRootG) paseRootG.setAttribute("aria-hidden", "true");
    var guardiaRoot = document.getElementById("appcontent-guardia");
    if (guardiaRoot) {
      guardiaRoot.setAttribute("role", "region");
      guardiaRoot.setAttribute("aria-label", "Modo Guardia — censo de pacientes");
      guardiaRoot.setAttribute("aria-hidden", "false");
    }
    return;
  }
  if (isPaseMode()) {
    if (list) list.setAttribute("aria-hidden", "true");
    rows.forEach(function (r) {
      var b = document.getElementById(r[1]);
      var p = document.getElementById(r[2]);
      if (b) {
        b.setAttribute("aria-hidden", "true");
        b.setAttribute("tabindex", "-1");
      }
      if (p) {
        p.setAttribute("role", "tabpanel");
        p.removeAttribute("aria-label");
        p.setAttribute("aria-labelledby", r[1]);
        p.setAttribute("aria-hidden", "true");
      }
    });
    var paseRoot = document.getElementById("appcontent-pase");
    if (paseRoot) {
      paseRoot.setAttribute("role", "region");
      paseRoot.setAttribute("aria-label", "Vista Pase — resumen del paciente");
      paseRoot.setAttribute("aria-hidden", "false");
    }
    var guardiaRootPase = document.getElementById("appcontent-guardia");
    if (guardiaRootPase) guardiaRootPase.setAttribute("aria-hidden", "true");
    return;
  }
  var paseRoot2 = document.getElementById("appcontent-pase");
  if (paseRoot2) {
    paseRoot2.removeAttribute("role");
    paseRoot2.removeAttribute("aria-label");
    paseRoot2.setAttribute("aria-hidden", "true");
  }
  var guardiaRoot2 = document.getElementById("appcontent-guardia");
  if (guardiaRoot2) {
    guardiaRoot2.removeAttribute("role");
    guardiaRoot2.removeAttribute("aria-label");
    guardiaRoot2.setAttribute("aria-hidden", "true");
  }
  if (list) list.removeAttribute("aria-hidden");
  rows.forEach(function (r) {
    var b = document.getElementById(r[1]);
    var p = document.getElementById(r[2]);
    var sel = tab === r[0];
    if (b) {
      b.removeAttribute("aria-hidden");
      b.setAttribute("aria-selected", sel ? "true" : "false");
      b.tabIndex = sel ? 0 : -1;
    }
    if (p) {
      p.setAttribute("role", "tabpanel");
      p.removeAttribute("aria-label");
      p.setAttribute("aria-labelledby", r[1]);
      p.setAttribute("aria-hidden", sel ? "false" : "true");
    }
  });
}

if (typeof document !== "undefined") {
(function setupMainAppTabKeyboard() {
  var list = document.getElementById("app-main-tablist");
  if (!list) return;
  var order = ["lab", "nota", "med", "agenda"];
  list.addEventListener("keydown", function (e) {
    var k = e.key;
    if (
      k !== "ArrowRight" &&
      k !== "ArrowLeft" &&
      k !== "ArrowDown" &&
      k !== "ArrowUp" &&
      k !== "Home" &&
      k !== "End"
    )
      return;
    var cur = rt.getActiveAppTab() === "lan" ? "lab" : rt.getActiveAppTab();
    var i = order.indexOf(cur);
    if (i < 0) i = 0;
    var next = -1;
    if (k === "ArrowRight" || k === "ArrowDown") next = (i + 1) % order.length;
    else if (k === "ArrowLeft" || k === "ArrowUp") next = (i - 1 + order.length) % order.length;
    else if (k === "Home") next = 0;
    else if (k === "End") next = order.length - 1;
    if (next < 0) return;
    e.preventDefault();
    var t = order[next];
    switchAppTab(t);
    var btn = document.getElementById("apptab-" + t);
    if (btn) btn.focus();
  });
})();
}

function wireExpedienteDatosCollapseRender() {
  var el = document.getElementById("exp-datos-collapse");
  if (!el || el._expDatosRenderWired) return;
  el._expDatosRenderWired = true;
  el.addEventListener("toggle", function () {
    syncPacienteDatosLayoutMode();
    if (el.open) renderPatientDataPane();
  });
}

export function syncInnerTabVisualOnly() {
  var settings = rt.getSettings();
  var tab = migrateGranularInner(rt.getActiveInner() || "todo", settings);
  var consolidated = useConsolidatedExpedienteTabs(settings);
  if (consolidated) {
    syncConsolidatedInnerTabButtons(tab, settings);
    syncConsolidatedPaneVisibility(tab, settings);
    syncConsolidatedSegmentBars(tab, settings);
    syncInnerTabIndicator(tab, { consolidated: true, settings: settings });
    return;
  }
  GRANULAR_TABS.forEach(function (t) {
    var btn = document.getElementById(innerTabButtonId(t));
    var pane = document.getElementById("itab-content-" + t);
    if (btn) btn.classList.toggle("active", tab === t);
    if (pane) pane.classList.toggle("active", tab === t);
  });
  syncInnerTabIndicator(tab);
}

function syncConsolidatedInnerTabButtons(granularTab, settings) {
  var composite = consolidatedInnerTabButtonId(granularTab, settings).replace(/^itab-/, "");
  document.querySelectorAll(".exp-consolidated-tab").forEach(function (btn) {
    var id = btn.id || "";
    var name = id.replace(/^itab-/, "");
    btn.classList.toggle("active", name === composite);
  });
}

function renderGranularInnerTab(tab, opts) {
  opts = opts || {};
  if (!opts.force) {
    if (innerTabRenderCache[tab] === innerTabRenderCacheKey(tab)) return;
  }

  if (tab === 'estadoActual') {
    renderHeavyInnerTab(tab, function (done) {
      renderEstadoActualPanel({ onReady: done, syncHeavy: !!opts.force });
    }, opts);
    return;
  }
  if (tab === 'manejo') {
    renderHeavyInnerTab(tab, function (done) {
      renderManejo({ onReady: done, syncHeavy: !!opts.force });
    }, opts);
    return;
  }
  if (tab === 'vpo') {
    renderVpo();
    markInnerTabRendered(tab);
    return;
  }
  if (tab === 'tend') {
    renderHeavyInnerTab(tab, function (done) {
      renderTendencias({ onReady: done, syncHeavy: !!opts.force });
    }, opts);
    return;
  }

  if (tab === 'notas') {
    renderNoteForm();
    markInnerTabRendered(tab);
    return;
  }
  if (tab === 'indica') {
    renderIndicaForm();
    markInnerTabRendered(tab);
    return;
  }
  if (tab === 'historia') {
    renderHeavyInnerTab(tab, function (done) {
      renderHistoriaClinicaPanel({ onReady: done });
    }, opts);
    return;
  }
  if (tab === 'eventualidades') {
    renderEventualidadesPanel(document.getElementById('exp-pane-eventualidades'));
    markInnerTabRendered(tab);
    return;
  }
  if (tab === 'datos' || tab === 'todo') renderPatientDataPane();
  if (tab === 'cult') renderCultivosTable();
  if (tab === 'listado') renderListadoForm();
  if (tab === 'todo') renderTodoForm();
  if (tab === 'recetaHu') renderRecetaHu();
  markInnerTabRendered(tab);
}

export function invalidatePaseBoardCache() {
  _paseBoardCacheKey = "";
}

/** Tras cambiar Sala ↔ Interconsulta: remonta pestañas del expediente y repinta contenido. */
export function refreshExpedienteForAppModeChange() {
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  invalidatePaseBoardCache();
  invalidateEaPanelCache();
  invalidateManejoShell();
  invalidateHistoriaClinicaPanel();
  invalidateEventualidadesPanel();
  invalidateInnerTabRenderCache();
  var settings = rt.getSettings();
  var tab = migrateGranularInner(rt.getActiveInner() || "todo", settings);
  if (tab !== rt.getActiveInner()) rt.setActiveInner(tab);
  resetExpedientePaneLayoutCache();
  renderInnerTabs();
  syncInnerTabVisualOnly();
}

/** Tras cambiar de paciente: repinta solo la pestaña interna activa (sin reset de layout). */
export function refreshExpedienteAfterPatientSelect(opts) {
  opts = opts || {};
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  invalidatePaseBoardCache();
  invalidateEaPanelCache();
  invalidateManejoShell();
  invalidateHistoriaClinicaPanel();
  var settings = rt.getSettings();
  var tab = migrateGranularInner(rt.getActiveInner() || "todo", settings);
  if (opts.patientChanged || !isInnerTabContentFresh(tab, settings)) {
    renderGranularInnerTab(tab, opts.patientChanged ? { force: true } : undefined);
  }
  warmExpedienteHeavyTabs();
}

export function switchConsolidatedTab(compositeTab) {
  var settings = rt.getSettings();
  if (compositeTab === "clinico" && !isClinicoCompositeVisible(settings)) {
    compositeTab = "paciente";
  }
  var current = migrateGranularInner(rt.getActiveInner() || "todo", settings);
  var currentComposite = consolidatedInnerTabButtonId(current, settings).replace(/^itab-/, "");
  if (currentComposite === compositeTab) {
    syncConsolidatedInnerTabButtons(current, settings);
    syncConsolidatedPaneVisibility(current, settings);
    syncConsolidatedSegmentBars(current, settings);
    syncInnerTabIndicator(current, { consolidated: true, settings: settings });
    if (granularMountIsEmpty(current)) {
      renderGranularInnerTab(current, { force: true });
    }
    return;
  }
  switchInnerTab(defaultGranularForConsolidatedTab(compositeTab, settings));
}

export function switchInnerTab(tab, opts) {
  opts = opts || {};
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  var settings = rt.getSettings();
  tab = migrateGranularInner(tab, settings);
  var prevInner = migrateGranularInner(rt.getActiveInner() || "todo", settings);
  var consolidated = useConsolidatedExpedienteTabs(settings);
  var prevComposite = expedienteCompositeTab(prevInner, settings);
  var nextComposite = expedienteCompositeTab(tab, settings);
  var expedienteTabs = {
    datos: 1,
    notas: 1,
    indica: 1,
    tend: 1,
    cult: 1,
    listado: 1,
    todo: 1,
    manejo: 1,
    historia: 1,
    estadoActual: 1,
    eventualidades: 1,
    recetaHu: 1,
  };
  if (expedienteTabs[tab] && isPaseMode() && getUiDensity() !== "normal") {
    if (tab === "recetaHu") {
      openPaseSectionInNormal("recetaHu");
      return;
    }
    if (tab === "manejo") {
      openPaseSectionInNormal("manejo");
      return;
    }
  }
  if (expedienteTabs[tab] && rt.getActiveAppTab() !== "nota") {
    switchAppTab("nota");
  }
  if (isPaseMode() && rt.getActiveAppTab() === "nota" && !opts.preserveRoundOverview) {
    setRoundOverviewMode(false);
  }
  rt.setActiveInner(tab);
  if (consolidated) {
    syncConsolidatedInnerTabButtons(tab, settings);
    syncConsolidatedPaneVisibility(tab, settings);
    syncConsolidatedSegmentBars(tab, settings);
  } else {
    GRANULAR_TABS.forEach(function (t) {
      var btn = document.getElementById(innerTabButtonId(t));
      var pane = document.getElementById("itab-content-" + t);
      if (btn) btn.classList.toggle("active", tab === t);
      if (pane) pane.classList.toggle("active", tab === t);
    });
  }
  if (granularMountIsEmpty(tab)) {
    opts.forceRender = true;
    invalidateInnerTabRenderCache(tab);
  }
  var needsContentRender =
    (prevInner !== tab || opts.forceRender) &&
    (opts.forceRender || !isInnerTabContentFresh(tab, settings));
  if (needsContentRender) {
    var targetTab = tab;
    var forceRender = !!opts.forceRender;
    if (prevInner !== tab && prevComposite !== nextComposite) {
      var panelEl = consolidated
        ? document.getElementById(
            "itab-content-" + consolidatedInnerTabButtonId(tab, settings).replace(/^itab-/, "")
          )
        : document.getElementById("itab-content-" + tab);
      animateTabPanelEnter(panelEl);
    }
    scheduleAfterPaint(function () {
      if (migrateGranularInner(rt.getActiveInner() || "todo", settings) !== targetTab) return;
      renderGranularInnerTab(targetTab, forceRender ? { force: true } : undefined);
      if (consolidated) syncExpedienteSegmentIndicators(settings, targetTab);
    });
  } else if (prevInner !== tab && consolidated) {
    syncExpedienteSegmentIndicators(settings, tab);
  } else if (granularMountIsEmpty(tab)) {
    scheduleAfterPaint(function () {
      if (migrateGranularInner(rt.getActiveInner() || "todo", settings) !== tab) return;
      invalidateInnerTabRenderCache(tab);
      renderGranularInnerTab(tab, { force: true });
      if (consolidated) syncExpedienteSegmentIndicators(settings, tab);
    });
  }
  if (prevInner !== tab && isModeSala(settings) && (tab === "estadoActual" || tab === "tend")) {
    warmExpedienteHeavyTabs();
  }
  syncRoundExpedienteLayout();
  rt.syncWorkContextChrome();
  syncInnerTabIndicator(tab, consolidated ? { consolidated: true, settings: settings } : undefined);
}

export function renderInnerTabs() {
  var settings = rt.getSettings();
  var sala = isModeSala(settings);
  var consolidated = useConsolidatedExpedienteTabs(settings);
  function show(id, visible) {
    var el = document.getElementById(id);
    if (el) el.style.display = visible ? "" : "none";
  }
  function setOrder(id, order) {
    var el = document.getElementById(id);
    if (el) el.style.order = String(order);
  }
  resetExpedientePaneLayoutCache();
  document.querySelectorAll(".exp-granular-tab").forEach(function (el) {
    el.style.display = consolidated ? "none" : "";
  });
  document.querySelectorAll(".exp-consolidated-tab").forEach(function (el) {
    el.style.display = consolidated ? "" : "none";
  });
  applyExpedientePaneLayout(consolidated, settings);

  if (consolidated) {
    var showClinico = isClinicoCompositeVisible(settings);
    show("itab-clinico", showClinico);
    var clinicoPane = document.getElementById("itab-content-clinico");
    if (clinicoPane) clinicoPane.hidden = !showClinico;
    var order = 1;
    setOrder("itab-paciente", order++);
    if (showClinico) setOrder("itab-clinico", order++);
    if (sala) {
      setOrder("itab-resultados", order++);
      setOrder("itab-salida", order++);
    } else {
      setOrder("itab-resultados", order++);
      setOrder("itab-salida", order++);
    }
    wireExpedienteDatosCollapseRender();
    var activeInner = migrateGranularInner(rt.getActiveInner() || "todo", settings);
    if (activeInner !== rt.getActiveInner()) rt.setActiveInner(activeInner);
    syncInnerTabVisualOnly();
    invalidateInnerTabRenderCache();
    renderGranularInnerTab(activeInner, { force: true });
  } else if (sala) {
    show("itab-datos", true);
    show("itab-notas", false);
    show("itab-indica", false);
    show("itab-tend", true);
    show("itab-cult", true);
    show("itab-listado", true);
    show("itab-todo", true);
    show("itab-manejo", !isManejoTabGloballyHidden());
    show("itab-receta-hu", false);
    setOrder("itab-datos", 1);
    setOrder("itab-todo", 2);
    setOrder("itab-manejo", 3);
    setOrder("itab-tend", 4);
    setOrder("itab-cult", 5);
    setOrder("itab-listado", 6);
    setOrder("itab-notas", 99);
    setOrder("itab-indica", 99);
    setOrder("itab-receta-hu", 99);
  } else {
    show("itab-datos", true);
    show("itab-notas", true);
    show("itab-indica", true);
    show("itab-tend", true);
    show("itab-cult", true);
    show("itab-listado", false);
    show("itab-todo", true);
    show("itab-manejo", !isManejoTabGloballyHidden());
    show("itab-receta-hu", true);
    setOrder("itab-datos", 1);
    setOrder("itab-todo", 2);
    setOrder("itab-notas", 3);
    setOrder("itab-indica", 4);
    setOrder("itab-tend", 5);
    setOrder("itab-cult", 6);
    setOrder("itab-manejo", 7);
    setOrder("itab-receta-hu", 8);
    setOrder("itab-listado", 99);
  }

  renderEstadoActualBar();
  var active = migrateGranularInner(rt.getActiveInner() || "todo", settings);
  syncInnerTabIndicator(active, consolidated ? { consolidated: true, settings: settings } : undefined);
  syncAllSubTabIndicators();
  initExpedienteTabPreload();
}

export function getActiveInnerTab() {
  var v = rt.getActiveInner();
  return v || null;
}

export const windowHandlers = {
  switchAppTab,
  openPaseSectionInNormal,
  renderPaseBoard,
  switchInnerTab,
  switchConsolidatedTab,
  initTabBarMotion,
};
