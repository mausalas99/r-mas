import {
  closeLabBulkPreviewModal,
  closeLabBulkTourHintModal,
  closeLabDisplayPrefsModal,
  closeLabSomeTablesModal,
  closeModal,
  closeProfileModal,
  closeReleaseNotes,
  closeSesionIngresoSendModal,
  closeSesionIngresoTrendsSendModal,
  closeTemplatesModal,
  closeTendDetail,
  closeTendGroupModal,
  closeTendHiddenModal,
  closeWipeDataModal,
  confirmCloseAddPatientModal,
  decrementPendingJobs,
  downloadTextPayload,
  formatDateSlug,
  generateIndicaciones,
  generateListado,
  generateWord,
  guardMobileDocExport,
  hideTourIntroModal,
  hideUpdateModal,
  incrementPendingJobs,
  initGoalGFeatures,
  initGuidedTourGate,
  initIdleLockFeature,
  initRpcServerHealthWatch,
  isTendGroupModalOpen,
  loadSettings,
  markGuidedTourVersionDone,
  normalizeQuickOutputFormat,
  normalizeTourVersionLabel,
  openPaseSectionInNormal,
  registerDocumentExportRuntime,
  renderPaseBoard,
  renderPatientList,
  renderRoundOverviewPanels,
  resolveAppVersionForTour,
  saveOutputDirSelection,
  switchAppTab,
  syncHeaderAppModeChip,
  toggleProfileSection
} from "/js/chunks/chunk-7MAO7CDX.js";
import {
  prefillRegistrationFromUrlParams
} from "/js/chunks/chunk-UJIBAODH.js";
import {
  closeQuickHelp
} from "/js/chunks/chunk-TY6UJC5H.js";
import {
  closeSettingsDropdown,
  syncTeamSyncHeaderButton,
  toggleSettingsDropdown
} from "/js/chunks/chunk-APPLEYBA.js";
import {
  applyMobileSharerContextFromUrl,
  closeConnectionDropdown,
  closeRpcDatePopover,
  closeSOAPModal,
  configureLanFromMobileJoin,
  dateInputValueToAccesoFecha,
  emitLiveSyncAgendaDelete,
  emitLiveSyncAgendaUpsert,
  ensurePatientAccesos,
  filterPatientsForPitchTour,
  getProcedureAgendaRowPx,
  getUiDensity,
  hydrateMobileSharerSessionFromSettings,
  isGuardiaMode,
  isMobileWeb,
  isModeSala,
  isPaseMode,
  isPitchPatientIsolationActive,
  isRpcDatePopoverOpen,
  mountRpcDatetimeInput,
  openEntregaModal,
  persistMobilePairingFromSearch,
  renderGuardiaBoard,
  renderGuardiaCensusGrid,
  resolveStoredMobileRoomId,
  restoreMobilePairingFromStorage,
  setUiDensity,
  syncGuardiaCensusPanelVisibility,
  syncGuardiaModeButtonVisibility,
  syncLegacyAccesoFields,
  syncMobileBarebonesChrome,
  syncPaseReturnHeaderBtn,
  toggleGuardiaMode,
  tryMountClinicalTeamInviteBrowserGate
} from "/js/chunks/chunk-PM4FDK42.js";
import {
  parseLanJoinQuery
} from "/js/chunks/chunk-QSBWAKTB.js";
import {
  indicaciones,
  labHistory,
  listadoProblemas,
  medRecetaByPatient,
  notes,
  patients,
  replaceAppStateFromBackupData,
  saveState
} from "/js/chunks/chunk-PVRUBDE5.js";
import {
  storage
} from "/js/chunks/chunk-2TZHN5MF.js";
import {
  closeClinicoUnlockModal
} from "/js/chunks/chunk-WM442OFV.js";

// public/js/mobile-lan-boot.mjs
function scheduleMobileLanWork(fn) {
  if (!isMobileWeb()) {
    void Promise.resolve().then(fn);
    return;
  }
  const run = () => {
    try {
      void Promise.resolve(fn());
    } catch (e) {
      console.warn("[R+] mobile LAN boot:", e && e.message);
    }
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(run, { timeout: 800 });
      } else {
        setTimeout(run, 50);
      }
    });
  } else {
    setTimeout(run, 50);
  }
}

// public/js/quick-output.mjs
function listadoHasProblems(listado) {
  if (!listado || typeof listado !== "object") return false;
  const has = (arr) => Array.isArray(arr) && arr.some((p) => p && typeof p.descripcion === "string" && p.descripcion.trim().length > 0);
  return has(listado.activos) || has(listado.inactivos);
}
function resolveQuickOutputAction(opts) {
  const format = String(opts && opts.format || "docx").toLowerCase();
  if (format === "html") return { kind: "html" };
  if (format === "txt") return { kind: "txt" };
  const sala = opts && opts.appMode === "sala";
  if (sala) {
    if (listadoHasProblems(opts.listado)) return { kind: "listado" };
    return {
      kind: "listado_empty",
      message: "Agrega un problema al Listado para usar Salida r\xE1pida en Sala."
    };
  }
  if (opts && opts.activeInner === "indica") return { kind: "indicaciones" };
  return { kind: "nota" };
}

// public/js/clinical-quick-export.mjs
var quickExportRt = {
  getActiveId() {
    return null;
  },
  getActiveInner() {
    return "todo";
  },
  getSettings() {
    return {};
  },
  showToast() {
  }
};
function registerClinicalQuickExportRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(quickExportRt, ctx);
}
function escHtml(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function toLines(value) {
  if (Array.isArray(value)) {
    return value.map(function(v) {
      return String(v || "").trim();
    }).filter(Boolean);
  }
  return String(value || "").split("\n").map(function(v) {
    return v.trim();
  }).filter(Boolean);
}
function slugFilePart(value, fallback) {
  var base = String(value || "").trim().toLowerCase();
  var slug = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || fallback;
}
function getCurrentPatientClinicalData() {
  var patient = patients.find(function(p) {
    return p.id === quickExportRt.getActiveId();
  });
  if (!patient) return null;
  return {
    patient,
    note: notes[quickExportRt.getActiveId()] || {},
    indicacion: indicaciones[quickExportRt.getActiveId()] || {}
  };
}
function buildClinicalTextExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || "both";
  var blocks = [];
  blocks.push("R+ - SALIDA CLINICA");
  blocks.push("PACIENTE: " + (patient.nombre || ""));
  blocks.push("REGISTRO: " + (patient.registro || ""));
  blocks.push("SERVICIO: " + (patient.servicio || ""));
  blocks.push("CUARTO/CAMA: " + (patient.cuarto || "") + "/" + (patient.cama || ""));
  blocks.push("");
  if (mode !== "indica") {
    blocks.push("== NOTA DE EVOLUCION ==");
    blocks.push("FECHA/HORA: " + (note.fecha || "") + " " + (note.hora || ""));
    blocks.push("DIAGNOSTICOS:");
    toLines(note.diagnosticos || []).forEach(function(v, idx) {
      blocks.push(idx + 1 + ". " + v);
    });
    if (!toLines(note.diagnosticos || []).length) blocks.push("(sin contenido)");
  }
  function pushBlock(label, value) {
    blocks.push(label + ":");
    var lines = toLines(value);
    if (!lines.length) blocks.push("(sin contenido)");
    lines.forEach(function(l) {
      blocks.push("- " + l);
    });
  }
  if (mode !== "indica") {
    pushBlock("INTERROGATORIO", note.interrogatorio);
    pushBlock("EXPLORACION FISICA", note.exploracion);
    pushBlock("ESTUDIOS", note.estudios);
    pushBlock("ANALISIS", note.analisis);
    pushBlock("PLAN", note.plan);
    blocks.push(
      "SIGNOS VITALES: TA " + (note.ta || "-") + " | FR " + (note.fr || "-") + " | FC " + (note.fc || "-") + " | TEMP " + (note.temp || "-") + " | PESO " + (note.peso || "-")
    );
    pushBlock("TRATAMIENTO E INDICACIONES", note.tratamiento || []);
    blocks.push("MEDICO TRATANTE: " + (note.medico || ""));
    blocks.push("PROFESOR RESPONSABLE: " + (note.profesor || ""));
  }
  if (mode === "both") blocks.push("");
  if (mode !== "note") {
    blocks.push("== INDICACIONES ==");
    blocks.push("FECHA/HORA: " + (ind.fecha || "") + " " + (ind.hora || ""));
    pushBlock("MEDICOS", ind.medicos);
    pushBlock("DIETA", ind.dieta);
    pushBlock("CUIDADOS", ind.cuidados);
    pushBlock("ESTUDIOS", ind.estudios);
    pushBlock("MEDICAMENTOS", ind.medicamentos);
    pushBlock("INTERCONSULTAS", ind.interconsultas);
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (otros.length) {
      blocks.push("OTROS:");
      otros.forEach(function(item, idx) {
        if (!item || typeof item !== "object") return;
        blocks.push(idx + 1 + ". " + (item.titulo || "Seccion sin titulo"));
        toLines(item.contenido || "").forEach(function(line) {
          blocks.push("   - " + line);
        });
      });
    }
  }
  return blocks.join("\n");
}
function buildClinicalHtmlExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || "both";
  function renderList(values) {
    var lines = toLines(values);
    if (!lines.length) return "<p><em>Sin contenido</em></p>";
    return "<ul>" + lines.map(function(line) {
      return "<li>" + escHtml(line) + "</li>";
    }).join("") + "</ul>";
  }
  function renderOtherSections() {
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (!otros.length) return "<p><em>Sin secciones adicionales</em></p>";
    return otros.filter(function(item) {
      return item && typeof item === "object";
    }).map(function(item) {
      return "<article><h4>" + escHtml(item.titulo || "Seccion sin titulo") + "</h4>" + renderList(item.contenido || "") + "</article>";
    }).join("");
  }
  var noteHtml = "<section><h2>Nota de evolucion</h2><p><strong>Fecha/Hora:</strong> " + escHtml(note.fecha || "") + " " + escHtml(note.hora || "") + "</p><h3>Diagnosticos</h3>" + renderList(note.diagnosticos || []) + "<h3>Interrogatorio</h3>" + renderList(note.interrogatorio) + "<h3>Exploracion fisica</h3>" + renderList(note.exploracion) + "<h3>Estudios</h3>" + renderList(note.estudios) + "<h3>Analisis</h3>" + renderList(note.analisis) + "<h3>Plan</h3>" + renderList(note.plan) + "<h3>Signos vitales</h3><p>TA " + escHtml(note.ta || "-") + " | FR " + escHtml(note.fr || "-") + " | FC " + escHtml(note.fc || "-") + " | TEMP " + escHtml(note.temp || "-") + " | PESO " + escHtml(note.peso || "-") + "</p><h3>Tratamiento e indicaciones medicas</h3>" + renderList(note.tratamiento || []) + "</section>";
  var indicaHtml = "<section><h2>Indicaciones</h2><p><strong>Fecha/Hora:</strong> " + escHtml(ind.fecha || "") + " " + escHtml(ind.hora || "") + "</p><h3>Medicos</h3>" + renderList(ind.medicos) + "<h3>Dieta</h3>" + renderList(ind.dieta) + "<h3>Cuidados</h3>" + renderList(ind.cuidados) + "<h3>Estudios</h3>" + renderList(ind.estudios) + "<h3>Medicamentos</h3>" + renderList(ind.medicamentos) + "<h3>Interconsultas</h3>" + renderList(ind.interconsultas) + "<h3>Otros</h3>" + renderOtherSections() + "</section>";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;"><title>R+ salida clinica</title><style>body{font-family:Arial,sans-serif;line-height:1.45;margin:24px;color:#111}h1,h2{margin-bottom:8px}section{margin:20px 0;padding-top:8px;border-top:1px solid #ddd}h3{margin:14px 0 6px}ul{margin:0 0 8px 20px}p{margin:0 0 8px}</style></head><body><h1>R+ - Salida clinica</h1><p><strong>Paciente:</strong> ` + escHtml(patient.nombre || "") + " | <strong>Registro:</strong> " + escHtml(patient.registro || "") + "</p><p><strong>Servicio:</strong> " + escHtml(patient.servicio || "") + " | <strong>Cuarto/Cama:</strong> " + escHtml(patient.cuarto || "") + "/" + escHtml(patient.cama || "") + "</p>" + (mode !== "indica" ? noteHtml : "") + (mode !== "note" ? indicaHtml : "") + "</body></html>";
}
function exportCurrentPatientAsText() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = quickExportRt.getActiveInner() === "indica" ? "indica" : "note";
  var fileName = "R-plus-" + slugFilePart(bundle.patient.nombre, "paciente") + "-clinico-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".txt";
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalTextExport(bundle), fileName, "text/plain");
    quickExportRt.showToast("Salida .txt descargada", "success");
  } catch (e) {
    quickExportRt.showToast(
      "No se pudo exportar: " + (e && e.message ? e.message : "error"),
      "error"
    );
  } finally {
    decrementPendingJobs();
  }
}
function exportCurrentPatientAsHtml() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = quickExportRt.getActiveInner() === "indica" ? "indica" : "note";
  var fileName = "R-plus-" + slugFilePart(bundle.patient.nombre, "paciente") + "-clinico-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".html";
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalHtmlExport(bundle), fileName, "text/html");
    quickExportRt.showToast("Salida .html descargada", "success");
  } catch (e) {
    quickExportRt.showToast(
      "No se pudo exportar: " + (e && e.message ? e.message : "error"),
      "error"
    );
  } finally {
    decrementPendingJobs();
  }
}
function quickExportCurrentPatient() {
  if (guardMobileDocExport()) return;
  if (!quickExportRt.getActiveId()) {
    quickExportRt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var format = normalizeQuickOutputFormat(quickExportRt.getSettings().quickOutputFormat);
  var action = resolveQuickOutputAction({
    format,
    appMode: isModeSala(quickExportRt.getSettings()) ? "sala" : "interconsulta",
    activeInner: quickExportRt.getActiveInner(),
    listado: listadoProblemas[quickExportRt.getActiveId()] || null
  });
  switch (action.kind) {
    case "html":
      exportCurrentPatientAsHtml();
      return;
    case "txt":
      exportCurrentPatientAsText();
      return;
    case "listado":
      generateListado();
      return;
    case "listado_empty":
      quickExportRt.showToast(action.message, "error");
      return;
    case "indicaciones":
      generateIndicaciones();
      return;
    case "nota":
    default:
      generateWord();
      return;
  }
}

// public/js/modal-dismiss.mjs
function isRpcOverlayVisible(el) {
  if (!el || !el.isConnected) return false;
  var cs = window.getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  var op = parseFloat(cs.opacity);
  if (!Number.isNaN(op) && op <= 0) return false;
  return true;
}
function getOverlayZIndex(el) {
  if (!el || !isRpcOverlayVisible(el)) return -1;
  var z = parseInt(window.getComputedStyle(el).zIndex, 10);
  return Number.isNaN(z) ? 0 : z;
}
function bindBackdropDismiss(backdropEl, requestClose, panelSelector) {
  if (!backdropEl || backdropEl.dataset.rpcBackdropDismiss === "2") return;
  backdropEl.dataset.rpcBackdropDismiss = "2";
  var selector = panelSelector || '.modal, [role="dialog"]';
  backdropEl.addEventListener("click", function(ev) {
    var panel = backdropEl.querySelector(selector);
    if (panel && panel.contains(ev.target)) return;
    requestClose();
  });
}
function createModalDismissRegistry() {
  var layers = [];
  var globalWired = false;
  function register(layer) {
    layers.push(layer);
  }
  function tryCloseLayer(layer, ev) {
    if (!layer.isOpen()) return false;
    if (layer.confirmClose && layer.confirmClose() === false) return true;
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    layer.close();
    return true;
  }
  function closeTopmost(ev) {
    for (var i = layers.length - 1; i >= 0; i--) {
      if (tryCloseLayer(layers[i], ev)) return true;
    }
    return false;
  }
  function onKeydown(ev) {
    if (ev.key !== "Escape" && ev.key !== "Esc") return;
    closeTopmost(ev);
  }
  function init() {
    if (globalWired) return;
    globalWired = true;
    document.addEventListener("keydown", onKeydown, true);
    layers.forEach(function(layer) {
      if (!layer.backdropEl) return;
      var el = layer.backdropEl();
      if (!el) return;
      bindBackdropDismiss(el, function() {
        tryCloseLayer(layer, null);
      }, layer.panelSelector);
    });
  }
  return { register, init, closeTopmost, bindBackdropDismiss };
}

// public/js/procedure-agenda-week.mjs
var AGENDA_DISPLAY_FIRST_HOUR = 6;
var AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE = 22;
var VISUAL_DURATION_MS = 2 * 60 * 60 * 1e3;
function mondayStartLocal(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();
  const delta = wd === 0 ? -6 : 1 - wd;
  x.setDate(x.getDate() + delta);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDaysLocal(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}
function weekBoundsFromMonday(monday) {
  const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 7);
  return { start, endExclusive: end };
}
function clipEventToDayColumn(evtStartMs, columnMidnightMs) {
  const col = new Date(columnMidnightMs);
  const dayEnd = new Date(col.getFullYear(), col.getMonth(), col.getDate() + 1, 0, 0, 0, 0).getTime();
  const evtEndMs = evtStartMs + VISUAL_DURATION_MS;
  if (evtEndMs <= col.getTime() || evtStartMs >= dayEnd) return null;
  const visStartMs = new Date(
    col.getFullYear(),
    col.getMonth(),
    col.getDate(),
    AGENDA_DISPLAY_FIRST_HOUR,
    0,
    0,
    0
  ).getTime();
  const visEndMs = new Date(
    col.getFullYear(),
    col.getMonth(),
    col.getDate(),
    AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE,
    0,
    0,
    0
  ).getTime();
  const topMs = Math.max(evtStartMs, col.getTime(), visStartMs);
  const botMs = Math.min(evtEndMs, dayEnd, visEndMs);
  if (botMs <= topMs) return null;
  return { topMs, botMs, visStartMs };
}
function assignLanesByInterval(items) {
  const sorted = items.slice().sort(function(a, b) {
    if (a.topMs !== b.topMs) return a.topMs - b.topMs;
    return String(a.id).localeCompare(String(b.id));
  });
  const laneEnds = [];
  const laneById = /* @__PURE__ */ new Map();
  sorted.forEach(function(it) {
    var lane = -1;
    for (var L = 0; L < laneEnds.length; L += 1) {
      if (laneEnds[L] <= it.topMs) {
        lane = L;
        break;
      }
    }
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(it.botMs);
    } else {
      laneEnds[lane] = it.botMs;
    }
    laneById.set(it.id, lane);
  });
  return laneById;
}

// public/js/features/agenda.mjs
var rt = {
  getActiveId() {
    return null;
  },
  showToast() {
  },
  renderPaseBoard() {
  }
};
function registerProcedureAgendaRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}
var procedureAgendaWeekOffset = 0;
function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function agendaEligiblePatients() {
  return patients.filter(function(p) {
    if (!p) return false;
    if (p.isDemo) return false;
    if (String(p.id).indexOf("demo-") === 0) return false;
    return true;
  });
}
function paIsoToDatetimeLocalValue(isoStr) {
  var d = new Date(String(isoStr || "").trim());
  if (isNaN(d.getTime())) return "";
  var pad = function(x) {
    return String(x).padStart(2, "0");
  };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function paParseDatetimeLocalValue(s) {
  var v = String(s || "").trim();
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function getProcedureAgendaMondayAnchor() {
  var base = mondayStartLocal(/* @__PURE__ */ new Date());
  var dt = addDaysLocal(base, procedureAgendaWeekOffset * 7);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function formatProcedureAgendaRangeLabel(monday) {
  try {
    var sun = addDaysLocal(monday, 6);
    var oDay = { day: "numeric" };
    var oWd = { weekday: "short" };
    var oMon = { month: "short" };
    var a = monday.toLocaleDateString("es", oWd).replace(".", "") + " " + monday.toLocaleDateString("es", oDay) + " " + monday.toLocaleDateString("es", oMon);
    var b = sun.toLocaleDateString("es", oWd).replace(".", "") + " " + sun.toLocaleDateString("es", oDay) + " " + sun.toLocaleDateString("es", oMon) + " " + sun.getFullYear();
    return a.charAt(0).toUpperCase() + a.slice(1) + " \u2014 " + b;
  } catch (_e) {
    return "";
  }
}
function syncProcedureAgendaNavButtons() {
  var prevBtn = document.getElementById("procedure-agenda-prev");
  var nextBtn = document.getElementById("procedure-agenda-next");
  if (prevBtn) prevBtn.disabled = procedureAgendaWeekOffset <= -1;
  if (nextBtn) nextBtn.disabled = procedureAgendaWeekOffset >= 1;
}
function navigateProcedureAgendaWeek(delta) {
  procedureAgendaWeekOffset = Math.max(-1, Math.min(1, procedureAgendaWeekOffset + delta));
  renderProcedureAgendaPanel();
}
function renderProcedureAgendaPanel() {
  var mount = document.getElementById("procedure-agenda-grid-mount");
  var rangeEl = document.getElementById("procedure-agenda-range");
  if (!mount || !rangeEl) return;
  syncProcedureAgendaNavButtons();
  var monday = getProcedureAgendaMondayAnchor();
  rangeEl.textContent = formatProcedureAgendaRangeLabel(monday);
  var week = weekBoundsFromMonday(monday);
  var nh = AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE - AGENDA_DISPLAY_FIRST_HOUR;
  var agendaRowPx = getProcedureAgendaRowPx();
  var elig = agendaEligiblePatients();
  var pmap = {};
  elig.forEach(function(p) {
    pmap[String(p.id)] = String(p.nombre || "").trim();
  });
  var newBtn = document.getElementById("procedure-agenda-new");
  if (newBtn) newBtn.disabled = elig.length === 0;
  var board = document.createElement("div");
  var head = document.createElement("div");
  head.className = "rpc-proc-agenda-board-head";
  var headSpacer = document.createElement("div");
  headSpacer.className = "rpc-proc-agenda-head-spacer";
  head.appendChild(headSpacer);
  var iDay;
  var colDate;
  for (iDay = 0; iDay < 7; iDay += 1) {
    colDate = addDaysLocal(monday, iDay);
    var hc = document.createElement("div");
    hc.className = "rpc-proc-agenda-head-cell";
    var wd = String(colDate.toLocaleDateString("es", { weekday: "short" })).replace(/\.$/, "");
    var dm = String(colDate.toLocaleDateString("es", { day: "numeric", month: "short" })).replace(
      ".",
      ""
    );
    wd = wd.charAt(0).toUpperCase() + wd.slice(1);
    dm = dm.charAt(0).toUpperCase() + dm.slice(1);
    hc.innerHTML = "<span>" + esc(wd) + "</span><strong>" + esc(dm) + "</strong>";
    head.appendChild(hc);
  }
  board.appendChild(head);
  var bodyRow = document.createElement("div");
  bodyRow.className = "rpc-proc-agenda-board-body";
  var timesCol = document.createElement("div");
  timesCol.className = "rpc-proc-agenda-times-col";
  for (var h = AGENDA_DISPLAY_FIRST_HOUR; h < AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE; h += 1) {
    var tsl = document.createElement("div");
    tsl.className = "rpc-proc-agenda-time-slot";
    tsl.style.height = agendaRowPx + "px";
    tsl.textContent = String(h).padStart(2, "0") + ":00";
    timesCol.appendChild(tsl);
  }
  bodyRow.appendChild(timesCol);
  var clipsByDay = [[], [], [], [], [], [], []];
  storage.getScheduledProcedures().forEach(function(ev) {
    var evtMs = Date.parse(ev.start);
    if (!Number.isFinite(evtMs)) return;
    if (evtMs >= week.endExclusive.getTime()) return;
    var evEndMs = evtMs + VISUAL_DURATION_MS;
    if (evEndMs <= week.start.getTime()) return;
    if (String(ev.patientId).indexOf("demo-") === 0) return;
    var patientLabel = pmap[ev.patientId] ? pmap[ev.patientId] : "Paciente desconocido";
    for (iDay = 0; iDay < 7; iDay += 1) {
      colDate = addDaysLocal(monday, iDay);
      colDate.setHours(0, 0, 0, 0);
      var clip = clipEventToDayColumn(evtMs, colDate.getTime());
      if (!clip) continue;
      clipsByDay[iDay].push({
        ev,
        clip,
        patientLabel
      });
    }
  });
  for (iDay = 0; iDay < 7; iDay += 1) {
    colDate = addDaysLocal(monday, iDay);
    colDate.setHours(0, 0, 0, 0);
    var dayCol = document.createElement("div");
    dayCol.className = "rpc-proc-agenda-day-col-wrap";
    dayCol.style.height = nh * agendaRowPx + "px";
    var hl;
    for (h = AGENDA_DISPLAY_FIRST_HOUR; h < AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE; h += 1) {
      hl = document.createElement("div");
      hl.className = "rpc-proc-agenda-hour-line";
      hl.style.height = agendaRowPx + "px";
      dayCol.appendChild(hl);
    }
    var intervals = clipsByDay[iDay].map(function(x) {
      return { id: x.ev.id, topMs: x.clip.topMs, botMs: x.clip.botMs };
    });
    var laneById = intervals.length === 0 ? /* @__PURE__ */ new Map() : assignLanesByInterval(intervals.slice());
    var laneCount = 1;
    if (laneById.size > 0) {
      laneById.forEach(function(ln) {
        laneCount = Math.max(laneCount, ln + 1);
      });
    }
    clipsByDay[iDay].forEach(function(cell) {
      var clip = cell.clip;
      var ev = cell.ev;
      var visStartMs = clip.visStartMs;
      var blockTopPx = (clip.topMs - visStartMs) / (60 * 60 * 1e3) * agendaRowPx;
      var blockHtPx = Math.max((clip.botMs - clip.topMs) / (60 * 60 * 1e3) * agendaRowPx, 18);
      var lane = laneById.get(ev.id) || 0;
      var lcLane = laneCount < 1 ? 1 : laneCount;
      var pctEach = 100 / lcLane;
      var startClock = String(
        new Date(ev.start).toLocaleTimeString("es", {
          hour: "2-digit",
          minute: "2-digit"
        })
      ).replace(".", "");
      var blk = document.createElement("button");
      blk.type = "button";
      blk.className = "rpc-proc-agenda-block";
      blk.style.top = Math.max(0, blockTopPx) + "px";
      blk.style.height = blockHtPx + "px";
      if (lcLane <= 1) {
        blk.style.left = "3px";
        blk.style.width = "calc(100% - 6px)";
      } else {
        blk.style.left = "calc(" + lane * pctEach + "% + 3px)";
        blk.style.width = "calc(" + pctEach + "% - 10px)";
      }
      blk.setAttribute(
        "title",
        (ev.procedure || "") + " \xB7 " + (ev.location || "") + " \xB7 " + cell.patientLabel
      );
      blk.setAttribute("aria-label", "Editar procedimiento para " + cell.patientLabel);
      if (!(ev.materialApproved && ev.anesthesiaScheduled)) blk.classList.add("rpc-proc-flag");
      blk.innerHTML = '<div class="rpc-proc-name">' + esc(String(ev.procedure || "")) + '</div><div class="rpc-proc-sub">' + esc(String(startClock + " \xB7 " + (ev.location || ""))) + '</div><div class="rpc-proc-pat">' + esc(String(cell.patientLabel)) + "</div>";
      blk.addEventListener("click", function(e) {
        e.preventDefault();
        openProcedureAgendaModal(ev.id);
      });
      dayCol.appendChild(blk);
    });
    bodyRow.appendChild(dayCol);
  }
  board.appendChild(bodyRow);
  mount.innerHTML = "";
  mount.appendChild(board);
  if (isPaseMode()) rt.renderPaseBoard();
}
function openProcedureAgendaModal(editEventId) {
  var bd = document.getElementById("procedure-agenda-modal");
  if (!bd) return;
  var errEl = document.getElementById("pa-modal-error");
  var delBtn = document.getElementById("pa-btn-delete");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }
  document.getElementById("pa-edit-id").value = editEventId || "";
  var elig = agendaEligiblePatients();
  var sel = document.getElementById("pa-patient");
  if (sel) {
    sel.innerHTML = "";
    elig.forEach(function(p) {
      var opt = document.createElement("option");
      opt.value = String(p.id);
      opt.textContent = String(p.nombre || p.id);
      sel.appendChild(opt);
    });
  }
  if (delBtn) delBtn.style.display = editEventId ? "inline-flex" : "none";
  var found;
  if (editEventId) {
    found = storage.getScheduledProcedures().filter(function(e) {
      return e.id === editEventId;
    })[0];
    if (found && sel) {
      sel.value = String(found.patientId);
      if (sel.value !== String(found.patientId))
        sel.appendChild(new Option(found.patientId, found.patientId));
      sel.value = String(found.patientId);
    }
    if (found) {
      document.getElementById("pa-procedure").value = found.procedure || "";
      document.getElementById("pa-location").value = found.location || "";
      document.getElementById("pa-start").value = paIsoToDatetimeLocalValue(found.start);
      document.getElementById("pa-material").checked = !!found.materialApproved;
      document.getElementById("pa-anesthesia").checked = !!found.anesthesiaScheduled;
    }
  } else {
    var aid = rt.getActiveId();
    if (sel && elig.length && aid && elig.some(function(p) {
      return p.id === aid;
    })) {
      sel.value = String(aid);
    } else if (sel && elig[0]) sel.value = elig[0].id;
    document.getElementById("pa-procedure").value = "";
    document.getElementById("pa-location").value = "";
    var now = /* @__PURE__ */ new Date();
    document.getElementById("pa-start").value = paIsoToDatetimeLocalValue(now.toISOString());
    document.getElementById("pa-material").checked = false;
    document.getElementById("pa-anesthesia").checked = false;
  }
  var paStart = document.getElementById("pa-start");
  if (paStart) {
    mountRpcDatetimeInput(paStart);
    paStart.dispatchEvent(new CustomEvent("rpc-datetime-sync"));
  }
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
}
function closeProcedureAgendaModal() {
  var bd = document.getElementById("procedure-agenda-modal");
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}
function saveProcedureAgendaFromModal() {
  var errEl = document.getElementById("pa-modal-error");
  function showPaErr(msg) {
    errEl.style.display = "block";
    errEl.textContent = msg;
    rt.showToast(msg, "error");
  }
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }
  var editId = (document.getElementById("pa-edit-id").value || "").trim();
  var patientId = String(document.getElementById("pa-patient").value || "").trim();
  var procedure = String(document.getElementById("pa-procedure").value || "").trim();
  var location2 = String(document.getElementById("pa-location").value || "").trim();
  var sd = paParseDatetimeLocalValue(document.getElementById("pa-start").value);
  var elig = agendaEligiblePatients();
  if (!elig.length) {
    showPaErr("No hay pacientes reales para agendar (agrega un paciente desde la barra lateral).");
    return;
  }
  if (!patientId || !elig.some(function(p) {
    return String(p.id) === patientId;
  })) {
    showPaErr("Elige un paciente v\xE1lido de la lista.");
    return;
  }
  if (!procedure) {
    showPaErr("Indica el procedimiento.");
    return;
  }
  if (!location2) {
    showPaErr("Indica el lugar.");
    return;
  }
  if (!sd) {
    showPaErr("Fecha u hora de inicio inv\xE1lidas.");
    return;
  }
  var nowIso = (/* @__PURE__ */ new Date()).toISOString();
  var arr = storage.getScheduledProcedures();
  var prev = editId ? arr.filter(function(e) {
    return e.id === editId;
  })[0] : null;
  var eventObj = {
    id: editId || "proc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9),
    patientId,
    procedure,
    location: location2,
    materialApproved: !!document.getElementById("pa-material").checked,
    anesthesiaScheduled: !!document.getElementById("pa-anesthesia").checked,
    start: sd.toISOString(),
    createdAt: prev && prev.createdAt ? prev.createdAt : nowIso,
    updatedAt: nowIso
  };
  var next;
  if (editId) {
    next = arr.map(function(e) {
      return e.id === editId ? eventObj : e;
    });
    if (!next.some(function(e) {
      return e.id === editId;
    })) next.push(eventObj);
  } else {
    next = arr.concat([eventObj]);
  }
  storage.saveScheduledProcedures(next);
  emitLiveSyncAgendaUpsert(eventObj);
  closeProcedureAgendaModal();
  rt.showToast("Procedimiento guardado", "success");
  renderProcedureAgendaPanel();
}
function deleteProcedureAgendaFromModal() {
  var editId = (document.getElementById("pa-edit-id").value || "").trim();
  if (!editId) return;
  if (!confirm(
    "\xBFEliminar este procedimiento de la agenda? No se puede deshacer desde aqu\xED."
  ))
    return;
  var delAt = (/* @__PURE__ */ new Date()).toISOString();
  var arr = storage.getScheduledProcedures().filter(function(e) {
    return e.id !== editId;
  });
  storage.saveScheduledProcedures(arr);
  emitLiveSyncAgendaDelete(editId, delAt);
  closeProcedureAgendaModal();
  rt.showToast("Eliminado de la agenda", "success");
  renderProcedureAgendaPanel();
}
var windowHandlers = {
  navigateProcedureAgendaWeek,
  openProcedureAgendaModal,
  closeProcedureAgendaModal,
  saveProcedureAgendaFromModal,
  deleteProcedureAgendaFromModal
};

// public/js/features/productivity.mjs
var rt2 = {
  getActiveId() {
    return null;
  },
  getSettings() {
    return (
      /** @type {any} */
      {}
    );
  },
  selectPatient(_id) {
    void _id;
  },
  switchAppTab(_t) {
    void _t;
  },
  switchInnerTab(_t) {
    void _t;
  },
  saveState() {
  },
  renderIndicaForm() {
  },
  closeSettingsDropdown() {
  },
  openAddModal() {
  },
  addAuditEntry() {
  },
  showToast() {
  },
  advanceRondaPatient(_dir) {
    void _dir;
  }
};
function registerProductivityRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt2, ctx);
}
function esc2(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var UNDO_STACK_KEY = "rpc-undo-stack";
var FOCUS_MODE_KEY = "rpc-focus-mode";
var UNDO_STACK_MAX = 5;
function cloneForUndo(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_e) {
    return null;
  }
}
function buildUndoSnapshotPayload(label) {
  return {
    label: label || "operaci\xF3n",
    at: (/* @__PURE__ */ new Date()).toISOString(),
    theme: localStorage.getItem("theme") || "light",
    activeId: rt2.getActiveId(),
    data: {
      patients: cloneForUndo(patients) || [],
      notes: cloneForUndo(notes) || {},
      indicaciones: cloneForUndo(indicaciones) || {},
      labHistory: cloneForUndo(labHistory) || {},
      medRecetaByPatient: cloneForUndo(medRecetaByPatient) || [],
      scheduledProcedures: cloneForUndo(storage.getScheduledProcedures()) || [],
      settings: cloneForUndo(rt2.getSettings()) || {},
      medCatalog: cloneForUndo(storage.getMedCatalog()) || storage.getMedCatalog()
    }
  };
}
function getUndoStack() {
  try {
    var arr = JSON.parse(localStorage.getItem(UNDO_STACK_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (_e) {
    return [];
  }
}
function saveUndoStack(stack) {
  try {
    localStorage.setItem(UNDO_STACK_KEY, JSON.stringify((stack || []).slice(0, UNDO_STACK_MAX)));
  } catch (_e) {
  }
}
function pushUndoSnapshot(label) {
  var snap = buildUndoSnapshotPayload(label);
  var stack = getUndoStack();
  stack.unshift(snap);
  saveUndoStack(stack);
  refreshUndoButtonState();
  rt2.addAuditEntry("undo-snapshot", "ok", 0, snap.label);
}
function refreshUndoButtonState() {
  var btn = document.getElementById("btn-undo-op");
  if (!btn) return;
  var stack = getUndoStack();
  btn.disabled = stack.length === 0;
  if (stack.length > 0) {
    btn.textContent = "Deshacer: " + (stack[0].label || "\xFAltima operaci\xF3n");
  } else {
    btn.textContent = "Deshacer \xFAltima operaci\xF3n";
  }
}
async function undoLastOperation() {
  var stack = getUndoStack();
  if (!stack.length) {
    rt2.showToast("No hay operaciones para deshacer.", "error");
    return;
  }
  var snap = stack[0];
  if (!confirm('\xBFRevertir "' + (snap.label || "\xFAltima operaci\xF3n") + '"? La aplicaci\xF3n se recargar\xE1.')) return;
  var rest = stack.slice(1);
  saveUndoStack(rest);
  replaceAppStateFromBackupData(snap.data || {});
  try {
    localStorage.setItem(
      "rpc-scheduled-procedures",
      JSON.stringify(snap.data.scheduledProcedures || [])
    );
  } catch (_e) {
  }
  localStorage.setItem("rpc-settings", JSON.stringify(snap.data.settings || {}));
  if (snap.data.medCatalog && typeof snap.data.medCatalog === "object") {
    storage.saveMedCatalog(snap.data.medCatalog);
  }
  if (snap.theme === "dark" || snap.theme === "light") localStorage.setItem("theme", snap.theme);
  await saveState({ immediate: true });
  rt2.addAuditEntry("undo-restore", "ok", 0, snap.label || "");
  location.reload();
}
function applyFocusModeFromStorage() {
  var on = localStorage.getItem(FOCUS_MODE_KEY) === "1";
  document.body.classList.toggle("focus-mode", on);
  var btn = document.getElementById("btn-toggle-focus-mode");
  if (btn) btn.textContent = on ? "Desactivar modo enfoque" : "Activar modo enfoque";
}
function toggleFocusMode() {
  var on = document.body.classList.toggle("focus-mode");
  localStorage.setItem(FOCUS_MODE_KEY, on ? "1" : "0");
  var btn = document.getElementById("btn-toggle-focus-mode");
  if (btn) btn.textContent = on ? "Desactivar modo enfoque" : "Activar modo enfoque";
  if (on) rt2.closeSettingsDropdown();
  rt2.showToast(on ? "Modo enfoque activado \xB7 F6 para salir" : "Modo enfoque desactivado", "success");
  rt2.addAuditEntry("focus-mode", "ok", 0, on ? "on" : "off");
}
var _unifiedSearchCurrent = [];
function openUnifiedSearch() {
  var bd = document.getElementById("unified-search-backdrop");
  if (!bd) return;
  bd.classList.add("open");
  var input = document.getElementById("unified-search-input");
  if (input) {
    input.value = "";
    setTimeout(function() {
      input.focus();
    }, 30);
  }
  updateUnifiedSearchResults();
}
function closeUnifiedSearch() {
  var bd = document.getElementById("unified-search-backdrop");
  if (bd) bd.classList.remove("open");
}
function snippetAround(text, q, maxLen) {
  var src = String(text || "");
  var lc = src.toLowerCase();
  var idx = lc.indexOf(q);
  if (idx < 0) return "";
  var half = Math.max(20, Math.floor((maxLen || 140) / 2));
  var start = Math.max(0, idx - half);
  var end = Math.min(src.length, idx + q.length + half);
  var out = src.slice(start, end);
  if (start > 0) out = "\u2026 " + out;
  if (end < src.length) out = out + " \u2026";
  return out;
}
function escapeRegExp(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function highlightSnippet(snippet, q) {
  var safe = esc2(snippet);
  if (!q) return safe;
  var qEsc = escapeRegExp(q);
  try {
    return safe.replace(new RegExp(qEsc, "ig"), function(m) {
      return "<mark>" + m + "</mark>";
    });
  } catch (_e) {
    return safe;
  }
}
function collectNoteHaystack(note) {
  if (!note) return "";
  var parts = [note.interrogatorio, note.evolucion, note.estudios, note.medico, note.profesor];
  if (Array.isArray(note.diagnosticos)) parts = parts.concat(note.diagnosticos);
  if (Array.isArray(note.tratamiento)) parts = parts.concat(note.tratamiento);
  return parts.filter(Boolean).join("\n");
}
function collectIndicaHaystack(ind) {
  if (!ind) return "";
  var parts = [ind.dieta, ind.cuidados, ind.estudios, ind.medicamentos, ind.interconsultas, ind.medicos];
  if (Array.isArray(ind.otros)) {
    ind.otros.forEach(function(o) {
      if (o && (o.titulo || o.contenido)) parts.push((o.titulo || "") + "\n" + (o.contenido || ""));
    });
  }
  return parts.filter(Boolean).join("\n");
}
function updateUnifiedSearchResults() {
  var box = document.getElementById("unified-search-results");
  var inp = document.getElementById("unified-search-input");
  if (!box || !inp) return;
  var q = String(inp.value || "").trim().toLowerCase();
  if (!q) {
    box.innerHTML = '<div class="unified-search-empty">Escribe para buscar pacientes, notas o indicaciones.</div>';
    _unifiedSearchCurrent = [];
    return;
  }
  var out = [];
  var MAX = 40;
  var searchPatients = filterPatientsForPitchTour(patients);
  for (var i = 0; i < searchPatients.length && out.length < MAX; i += 1) {
    var p = searchPatients[i];
    if (p.isDemo && !isPitchPatientIsolationActive()) continue;
    var meta = [p.nombre, p.registro, p.cuarto, p.cama, p.servicio, p.area].filter(Boolean).join(" \xB7 ");
    var metaLc = meta.toLowerCase();
    var metaStr = "Cto. " + (p.cuarto || "-") + " \xB7 Cama " + (p.cama || "-") + (p.registro ? " \xB7 " + p.registro : "");
    if (metaLc.indexOf(q) !== -1) {
      out.push({
        id: p.id,
        tab: "nota",
        inner: "notas",
        tag: "paciente",
        title: p.nombre || "Sin nombre",
        meta: metaStr,
        snippet: ""
      });
      if (out.length >= MAX) break;
    }
    var nh = collectNoteHaystack(notes[p.id]);
    if (nh && nh.toLowerCase().indexOf(q) !== -1) {
      out.push({
        id: p.id,
        tab: "nota",
        inner: "notas",
        tag: "nota",
        title: p.nombre || "Sin nombre",
        meta: metaStr,
        snippet: snippetAround(nh, q, 140)
      });
      if (out.length >= MAX) break;
    }
    var ih = collectIndicaHaystack(indicaciones[p.id]);
    if (ih && ih.toLowerCase().indexOf(q) !== -1) {
      out.push({
        id: p.id,
        tab: "nota",
        inner: "indica",
        tag: "indicaciones",
        title: p.nombre || "Sin nombre",
        meta: metaStr,
        snippet: snippetAround(ih, q, 140)
      });
      if (out.length >= MAX) break;
    }
  }
  _unifiedSearchCurrent = out;
  if (!out.length) {
    box.innerHTML = '<div class="unified-search-empty">Sin coincidencias.</div>';
    return;
  }
  box.innerHTML = out.map(function(r, idx) {
    return '<div class="unified-search-result" onclick="selectUnifiedSearchResult(' + idx + ')"><div class="usr-title"><span>' + esc2(r.title) + '</span><span class="usr-tag">' + esc2(r.tag) + '</span></div><div class="usr-meta">' + esc2(r.meta) + "</div>" + (r.snippet ? '<div class="usr-snippet">' + highlightSnippet(r.snippet, q) + "</div>" : "") + "</div>";
  }).join("");
}
function selectUnifiedSearchResult(idx) {
  var r = _unifiedSearchCurrent[idx];
  if (!r) return;
  rt2.selectPatient(r.id);
  rt2.switchAppTab(r.tab);
  if (r.inner) rt2.switchInnerTab(r.inner);
  closeUnifiedSearch();
}
var _extraTemplateEditing = null;
function ensureExtraTemplatesArray() {
  var settings = rt2.getSettings();
  if (!Array.isArray(settings.extraTemplates)) settings.extraTemplates = [];
  return settings.extraTemplates;
}
function persistSettings() {
  localStorage.setItem("rpc-settings", JSON.stringify(rt2.getSettings()));
}
function openExtraTemplatesManager() {
  var m = document.getElementById("extra-templates-modal");
  if (!m) return;
  ensureExtraTemplatesArray();
  m.style.display = "flex";
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
}
function closeExtraTemplatesManager() {
  var m = document.getElementById("extra-templates-modal");
  if (m) m.style.display = "none";
  cancelExtraTemplateEdit();
}
function renderExtraTemplatesList() {
  var list = document.getElementById("extra-templates-list");
  if (!list) return;
  var arr = ensureExtraTemplatesArray();
  if (!arr.length) {
    list.innerHTML = '<div class="unified-search-empty">A\xFAn no tienes plantillas guardadas.</div>';
    return;
  }
  list.innerHTML = arr.map(function(tmpl) {
    var id = esc2(tmpl.id || "");
    return '<div class="extra-tmpl-row"><span class="etr-label" title="' + esc2(tmpl.label || "") + '">' + esc2(tmpl.label || "(sin nombre)") + `</span><div class="etr-actions"><button type="button" onclick="editExtraTemplate('` + id + `')">Editar</button><button type="button" class="etr-del" onclick="deleteExtraTemplate('` + id + `')">Eliminar</button></div></div>`;
  }).join("");
}
function startNewExtraTemplate() {
  _extraTemplateEditing = "";
  var ed = document.getElementById("extra-template-editor");
  if (ed) ed.style.display = "flex";
  var elLabel = document.getElementById("extra-tmpl-label");
  var elDieta = document.getElementById("extra-tmpl-dieta");
  var elCui = document.getElementById("extra-tmpl-cuidados");
  var elMed = document.getElementById("extra-tmpl-meds");
  if (elLabel) elLabel.value = "";
  if (elDieta) elDieta.value = "";
  if (elCui) elCui.value = "";
  if (elMed) elMed.value = "";
  setTimeout(function() {
    if (elLabel) elLabel.focus();
  }, 30);
}
function editExtraTemplate(id) {
  var arr = ensureExtraTemplatesArray();
  var tmpl = arr.find(function(t) {
    return t.id === id;
  });
  if (!tmpl) return;
  _extraTemplateEditing = id;
  var ed = document.getElementById("extra-template-editor");
  if (ed) ed.style.display = "flex";
  document.getElementById("extra-tmpl-label").value = tmpl.label || "";
  document.getElementById("extra-tmpl-dieta").value = tmpl.dieta || "";
  document.getElementById("extra-tmpl-cuidados").value = tmpl.cuidados || "";
  document.getElementById("extra-tmpl-meds").value = tmpl.medicamentos || "";
}
function cancelExtraTemplateEdit() {
  _extraTemplateEditing = null;
  var ed = document.getElementById("extra-template-editor");
  if (ed) ed.style.display = "none";
}
function saveExtraTemplateFromEditor() {
  var label = (document.getElementById("extra-tmpl-label").value || "").trim();
  if (!label) {
    rt2.showToast("Ingresa un nombre para la plantilla", "error");
    return;
  }
  var dieta = (document.getElementById("extra-tmpl-dieta").value || "").trim();
  var cuidados = (document.getElementById("extra-tmpl-cuidados").value || "").trim();
  var meds = (document.getElementById("extra-tmpl-meds").value || "").trim();
  var arr = ensureExtraTemplatesArray();
  if (_extraTemplateEditing) {
    var tmpl = arr.find(function(t) {
      return t.id === _extraTemplateEditing;
    });
    if (tmpl) {
      tmpl.label = label;
      tmpl.dieta = dieta;
      tmpl.cuidados = cuidados;
      tmpl.medicamentos = meds;
    }
  } else {
    arr.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label,
      dieta,
      cuidados,
      medicamentos: meds
    });
  }
  persistSettings();
  rt2.addAuditEntry("extra-template-save", "ok", arr.length, label);
  rt2.showToast("Plantilla guardada", "success");
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
  if (rt2.getActiveId()) rt2.renderIndicaForm();
}
function deleteExtraTemplate(id) {
  var arr = ensureExtraTemplatesArray();
  var tmpl = arr.find(function(t) {
    return t.id === id;
  });
  if (!tmpl) return;
  if (!confirm('\xBFEliminar la plantilla "' + (tmpl.label || "") + '"?')) return;
  var settings = rt2.getSettings();
  settings.extraTemplates = arr.filter(function(t) {
    return t.id !== id;
  });
  persistSettings();
  rt2.addAuditEntry(
    "extra-template-delete",
    "ok",
    settings.extraTemplates.length,
    tmpl.label || ""
  );
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
  if (rt2.getActiveId()) rt2.renderIndicaForm();
}
function isTypingContext(target) {
  if (!target) return false;
  var tag = (target.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}
function initProductivityKeyboardShortcuts() {
  document.addEventListener("keydown", function(e) {
    if (e.key === "F6") {
      e.preventDefault();
      toggleFocusMode();
      return;
    }
    if (isPaseMode() && document.body && !document.body.classList.contains("focus-mode")) {
      if (!isTypingContext(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        var roundKey = (e.key || "").toLowerCase();
        if (roundKey === "j" || roundKey === "k") {
          e.preventDefault();
          rt2.advanceRondaPatient(roundKey === "j" ? 1 : -1);
          return;
        }
      }
    }
    var mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.altKey || e.shiftKey) return;
    var k = (e.key || "").toLowerCase();
    if (k === "k") {
      e.preventDefault();
      var bd2 = document.getElementById("unified-search-backdrop");
      if (bd2 && bd2.classList.contains("open")) closeUnifiedSearch();
      else openUnifiedSearch();
    } else if (k === "n") {
      e.preventDefault();
      rt2.openAddModal();
    } else if (k === "s") {
      e.preventDefault();
      if (!rt2.getActiveId()) {
        rt2.showToast("Selecciona un paciente primero", "error");
        return;
      }
      rt2.saveState();
      rt2.addAuditEntry("quick-save", "ok", 1, String(rt2.getActiveId()));
      rt2.showToast("Estado guardado \u2713", "success");
    }
  });
  applyFocusModeFromStorage();
  refreshUndoButtonState();
}
var productivityWindowHandlers = {
  toggleFocusMode,
  openUnifiedSearch,
  closeUnifiedSearch,
  updateUnifiedSearchResults,
  selectUnifiedSearchResult,
  undoLastOperation,
  openExtraTemplatesManager,
  closeExtraTemplatesManager,
  startNewExtraTemplate,
  editExtraTemplate,
  deleteExtraTemplate,
  saveExtraTemplateFromEditor,
  cancelExtraTemplateEdit
};

// public/js/app-shell.mjs
var shellCtx = {
  getActiveId() {
    return null;
  },
  getActiveAppTab() {
    return "lab";
  },
  getActiveInner() {
    return "todo";
  },
  getSettings() {
    return {};
  }
};
function registerAppShellContext(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(shellCtx, ctx);
  wireShellExportRuntimes();
}
function wireShellExportRuntimes() {
  registerDocumentExportRuntime({
    showToast,
    getSettings: function() {
      return shellCtx.getSettings();
    },
    loadSettings
  });
  registerClinicalQuickExportRuntime({
    getActiveId: function() {
      return shellCtx.getActiveId();
    },
    getActiveInner: function() {
      return shellCtx.getActiveInner();
    },
    getSettings: function() {
      return shellCtx.getSettings();
    },
    showToast
  });
}
function syncActivePatientContextBar() {
}
function syncMedPatientGate() {
  var empty = document.getElementById("med-empty-guided");
  var shell = document.getElementById("med-active-shell");
  if (!empty || !shell) return;
  var showEmpty = shellCtx.getActiveAppTab() === "med" && !shellCtx.getActiveId();
  empty.style.display = showEmpty ? "flex" : "none";
  shell.style.display = showEmpty ? "none" : "flex";
}
function setMedTabAttention(on) {
  var tab = document.getElementById("apptab-med");
  if (tab) tab.classList.toggle("app-tab-attention", !!on);
}
function syncWorkContextChrome() {
  syncActivePatientContextBar();
  syncHeaderAppModeChip();
  syncMedPatientGate();
  syncPaseReturnHeaderBtn();
  syncGuardiaModeButtonVisibility();
  syncGuardiaCensusPanelVisibility(shellCtx.getSettings());
  renderGuardiaCensusGrid(shellCtx.getSettings());
  if (isGuardiaMode()) renderGuardiaBoard(shellCtx.getSettings());
}
function chooseOutputDir() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
    showToast("Funci\xF3n no disponible en este entorno", "error");
    return;
  }
  window.electronAPI.selectOutputDir().then(function(dir) {
    if (!dir) return;
    saveOutputDirSelection(dir);
    showToast("Carpeta actualizada \u2713", "success");
  });
}
function setMobileBootBanner(visible, text) {
  if (!isMobileWeb()) return;
  var el = document.getElementById("rpc-mobile-boot-banner");
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.toggle("is-visible", !!visible);
}
async function initMobileWebBoot() {
  tryMountClinicalTeamInviteBrowserGate();
  if (!isMobileWeb()) return;
  setMobileBootBanner(true, "Cargando R+ M\xF3vil\u2026");
  persistMobilePairingFromSearch(location.search, location.origin);
  restoreMobilePairingFromStorage();
  prefillRegistrationFromUrlParams();
  applyMobileSharerContextFromUrl();
  hydrateMobileSharerSessionFromSettings();
  closeConnectionDropdown();
  syncMobileBarebonesChrome();
  try {
    document.title = "R+ M\xF3vil";
  } catch (_e) {
  }
  syncTeamSyncHeaderButton();
  try {
    var v = await resolveAppVersionForTour();
    window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
    markGuidedTourVersionDone();
  } catch (_bootVer) {
  }
  var intro = document.getElementById("onboarding-intro-backdrop");
  if (intro) {
    intro.classList.remove("open");
    intro.setAttribute("aria-hidden", "true");
  }
  var parsed = parseLanJoinQuery(location.search, location.origin);
  var storedRoomId = resolveStoredMobileRoomId();
  var roomId = String(parsed.roomId || storedRoomId || "").trim();
  if (!window._rpcMobileLanSettledWired) {
    window._rpcMobileLanSettledWired = true;
    document.addEventListener("rpc-mobile-lan-sync-settled", function() {
      setMobileBootBanner(false);
    });
  }
  setMobileBootBanner(false);
  scheduleMobileLanWork(function() {
    setMobileBootBanner(true, "Sincronizando con el anfitri\xF3n\u2026");
    if (!parsed.teamCode) {
      var savedCfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() : null;
      if (savedCfg && savedCfg.teamCode && savedCfg.hostUrl) {
        configureLanFromMobileJoin(savedCfg.hostUrl, savedCfg.teamCode, roomId);
      } else {
        setMobileBootBanner(false);
      }
      return;
    }
    var hostUrl = String(parsed.hostUrl || location.origin || "").trim().replace(/\/+$/, "");
    if (!hostUrl) {
      setMobileBootBanner(false);
      return;
    }
    configureLanFromMobileJoin(hostUrl, parsed.teamCode, roomId);
  });
}
function showToast(msg, type) {
  var focused = document.activeElement;
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (type ? " " + type : "");
  if (focused && focused.tagName !== "BODY") setTimeout(function() {
    focused.focus();
  }, 0);
  setTimeout(function() {
    t.className = "toast";
  }, 3500);
}
function onDefaultServicioBlur() {
  var el = document.getElementById("settings-default-servicio");
  if (!el) return;
  var v = (el.value || "").trim().toUpperCase();
  el.value = v;
  shellCtx.getSettings().defaultServicio = v;
  localStorage.setItem("rpc-settings", JSON.stringify(shellCtx.getSettings()));
  var w = document.getElementById("default-servicio-warning");
  var looksAbbrev = v.length > 0 && v.length <= 3 && /^[A-Z]+$/.test(v);
  if (w) w.style.display = looksAbbrev ? "block" : "none";
}
function onMedicoTemplateBlur() {
  var keys = ["profesor", "r4", "r2", "r1a", "r1b"];
  var tpl = {};
  keys.forEach(function(k) {
    var inp = document.getElementById("settings-medico-" + k);
    tpl[k] = inp ? (inp.value || "").trim() : "";
  });
  shellCtx.getSettings().medicosPlantilla = tpl;
  localStorage.setItem("rpc-settings", JSON.stringify(shellCtx.getSettings()));
}
var modalDismiss = createModalDismissRegistry();
var modalDismissInited = false;
function initModalDismiss() {
  if (modalDismissInited) return;
  var dynamicBackdropIds = [
    "lab-dedupe-backdrop",
    "soap-confirm-backdrop",
    "dup-confirm-backdrop",
    "lab-conflict-backdrop",
    "exp-advice-backdrop",
    "tend-gaso-ext-backdrop"
  ];
  function el(id) {
    return document.getElementById(id);
  }
  modalDismiss.register({
    isOpen: function() {
      return isRpcOverlayVisible(el("update-modal-backdrop"));
    },
    close: hideUpdateModal,
    backdropEl: function() {
      return el("update-modal-backdrop");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      return isRpcOverlayVisible(el("tend-detail-backdrop"));
    },
    close: closeTendDetail,
    backdropEl: function() {
      return el("tend-detail-backdrop");
    },
    panelSelector: "#tend-detail-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var bd = el("tend-group-backdrop");
      if (bd && bd.getAttribute("aria-hidden") === "false") return true;
      return isTendGroupModalOpen();
    },
    close: closeTendGroupModal,
    backdropEl: function() {
      return el("tend-group-backdrop");
    },
    panelSelector: "#tend-group-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var m = el("rpc-wipe-modal");
      return m && m.getAttribute("aria-hidden") === "false";
    },
    close: closeWipeDataModal,
    backdropEl: function() {
      return el("rpc-wipe-modal");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("soap-modal-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeSOAPModal,
    backdropEl: function() {
      return el("soap-modal-backdrop");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var m = el("procedure-agenda-modal");
      return m && m.classList.contains("open");
    },
    close: closeProcedureAgendaModal,
    backdropEl: function() {
      return el("procedure-agenda-modal");
    },
    panelSelector: ".modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var m = el("modal");
      return m && m.classList.contains("open");
    },
    close: closeModal,
    confirmClose: confirmCloseAddPatientModal,
    backdropEl: function() {
      return el("modal");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var m = el("profile-modal");
      return m && m.classList.contains("open");
    },
    close: closeProfileModal,
    backdropEl: function() {
      return el("profile-modal");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      return isRpcOverlayVisible(el("templates-modal"));
    },
    close: closeTemplatesModal,
    backdropEl: function() {
      return el("templates-modal");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      return isRpcOverlayVisible(el("extra-templates-modal"));
    },
    close: closeExtraTemplatesManager,
    backdropEl: function() {
      return el("extra-templates-modal");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("unified-search-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeUnifiedSearch,
    backdropEl: function() {
      return el("unified-search-backdrop");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("help-quick-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeQuickHelp,
    backdropEl: function() {
      return el("help-quick-backdrop");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("release-notes-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeReleaseNotes,
    backdropEl: function() {
      return el("release-notes-backdrop");
    },
    panelSelector: ".release-notes-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("tend-hidden-modal-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeTendHiddenModal,
    backdropEl: function() {
      return el("tend-hidden-modal-backdrop");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("lab-display-prefs-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeLabDisplayPrefsModal,
    backdropEl: function() {
      return el("lab-display-prefs-backdrop");
    },
    panelSelector: ".lab-display-prefs-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("lab-bulk-preview-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeLabBulkPreviewModal,
    backdropEl: function() {
      return el("lab-bulk-preview-backdrop");
    },
    panelSelector: ".lab-bulk-preview-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("lab-bulk-tour-hint-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeLabBulkTourHintModal,
    backdropEl: function() {
      return el("lab-bulk-tour-hint-backdrop");
    },
    panelSelector: ".lab-bulk-tour-hint-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("clinico-unlock-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeClinicoUnlockModal,
    backdropEl: function() {
      return el("clinico-unlock-backdrop");
    },
    panelSelector: ".clinico-unlock-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("lab-some-tables-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeLabSomeTablesModal,
    backdropEl: function() {
      return el("lab-some-tables-backdrop");
    },
    panelSelector: ".lab-some-tables-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("sesion-ingreso-send-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeSesionIngresoSendModal,
    backdropEl: function() {
      return el("sesion-ingreso-send-backdrop");
    },
    panelSelector: ".sesion-ingreso-send-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("sesion-ingreso-trends-send-backdrop");
      return b && b.classList.contains("open");
    },
    close: closeSesionIngresoTrendsSendModal,
    backdropEl: function() {
      return el("sesion-ingreso-trends-send-backdrop");
    },
    panelSelector: ".sesion-ingreso-send-modal"
  });
  modalDismiss.register({
    isOpen: function() {
      var b = el("onboarding-intro-backdrop");
      return b && b.classList.contains("open");
    },
    close: hideTourIntroModal,
    backdropEl: function() {
      return el("onboarding-intro-backdrop");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var c = el("connection-dropdown");
      return c && c.classList.contains("open");
    },
    close: closeConnectionDropdown,
    backdropEl: function() {
      return el("connection-dropdown-backdrop");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      var s = el("settings-dropdown");
      return s && s.classList.contains("open");
    },
    close: closeSettingsDropdown,
    backdropEl: function() {
      return el("settings-dropdown-backdrop");
    }
  });
  modalDismiss.register({
    isOpen: function() {
      return dynamicBackdropIds.some(function(id) {
        var node = el(id);
        return isRpcOverlayVisible(node);
      });
    },
    close: function() {
      var top = null;
      var bestZ = -1;
      dynamicBackdropIds.forEach(function(id) {
        var node = el(id);
        var z = getOverlayZIndex(node);
        if (z > bestZ) {
          bestZ = z;
          top = node;
        }
      });
      if (!top) return;
      if (top.id === "tend-gaso-ext-backdrop") {
        top.style.display = "none";
        top.setAttribute("aria-hidden", "true");
        document.body.classList.remove("tend-gaso-ext-open");
        return;
      }
      top.remove();
    },
    backdropEl: function() {
      var best = null;
      var bestZ = -1;
      dynamicBackdropIds.forEach(function(id) {
        var node = el(id);
        var z = getOverlayZIndex(node);
        if (z > bestZ) {
          bestZ = z;
          best = node;
        }
      });
      return best;
    },
    panelSelector: '.lab-conflict-modal, .tend-gaso-ext-dialog, [role="dialog"]'
  });
  modalDismiss.register({
    isOpen: isRpcDatePopoverOpen,
    close: closeRpcDatePopover
  });
  modalDismiss.init();
  modalDismissInited = true;
  document.addEventListener("click", function(ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains("lab-conflict-backdrop")) return;
    if (dynamicBackdropIds.indexOf(t.id) === -1) return;
    t.remove();
  });
}
document.addEventListener("keydown", function(e) {
  var mod = e.metaKey || e.ctrlKey;
  if (mod) {
    var key = e.key.toLowerCase();
    if (key === "1" || key === "2" || key === "3" || key === "4" || key === "5") {
      e.preventDefault();
      if (isPaseMode()) {
        if (key === "1") openPaseSectionInNormal("labs");
        if (key === "2") openPaseSectionInNormal("expediente");
        if (key === "3") openPaseSectionInNormal("med");
        if (key === "4" || key === "5") openPaseSectionInNormal("agenda");
      } else {
        if (key === "1") switchAppTab("lab");
        if (key === "2") switchAppTab("nota");
        if (key === "3") switchAppTab("med");
        if (key === "4" || key === "5") switchAppTab("agenda");
      }
    }
    if (key === "p" && !e.altKey) {
      e.preventDefault();
      if (e.shiftKey) toggleProfileSection();
      else if (isGuardiaMode()) setUiDensity("normal");
      else setUiDensity(getUiDensity() === "normal" ? "pase" : "normal");
    }
    if (key === "g" && e.shiftKey && !e.altKey) {
      e.preventDefault();
      toggleGuardiaMode();
    }
    if (e.key === "," && !e.shiftKey && !e.altKey) {
      var tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target && e.target.isContentEditable) return;
      e.preventDefault();
      var dd = document.getElementById("settings-dropdown");
      if (dd && dd.classList.contains("open")) closeSettingsDropdown();
      else toggleSettingsDropdown();
    }
    if (e.key === "," && e.shiftKey && !e.altKey) {
      var tag2 = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
      if (tag2 === "INPUT" || tag2 === "TEXTAREA" || tag2 === "SELECT" || e.target && e.target.isContentEditable) return;
      e.preventDefault();
      window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
      showToast(
        window.__rpcPreferImportOverwrite ? "Importaci\xF3n: conflictos \u2192 sobrescribir (\u2318\u21E7, o Ctrl+Shift+, de nuevo para apagar)." : "Importaci\xF3n: se preguntar\xE1 en cada conflicto.",
        window.__rpcPreferImportOverwrite ? "success" : "info"
      );
    }
  }
}, true);
function updatePatient(field, value) {
  if (shellCtx.getActiveId() == null) return;
  var pid = String(shellCtx.getActiveId());
  var p = patients.find(function(pl) {
    return String(pl.id) === pid;
  });
  if (!p) return;
  var next = field === "nombre" || field === "area" || field === "servicio" ? String(value || "").toUpperCase() : value;
  if (String(p[field] || "") === String(next || "")) return;
  p[field] = next;
  if (field === "fiuxFecha" || field === "fimiFecha") {
    next = dateInputValueToAccesoFecha(value) || String(value || "").trim();
  }
  if (field === "viaAcceso" || field === "accesoFecha") {
    ensurePatientAccesos(p);
    var accRow = p.accesosList.find(function(a) {
      return String(a && a.via || "").trim();
    }) || p.accesosList[0];
    if (field === "viaAcceso") accRow.via = String(next || "").trim();
    else accRow.fecha = String(next || "").trim();
    syncLegacyAccesoFields(p);
  }
  saveState();
  renderPatientList();
  syncWorkContextChrome();
  if (isPaseMode()) {
    renderPaseBoard();
    renderRoundOverviewPanels();
    if (shellCtx.getActiveAppTab() === "agenda") renderProcedureAgendaPanel();
  }
}
function rpcPrefersReducedMotion() {
  try {
    return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_e) {
    return false;
  }
}
var appShellWindowHandlers = {
  onDefaultServicioBlur,
  onMedicoTemplateBlur,
  chooseOutputDir,
  updatePatient,
  quickExportCurrentPatient
};
function installClinicalAppShell() {
  if (typeof window === "undefined") return;
  window.appShell = window.appShell || {};
  window.appShell.openEntregaModal = openEntregaModal;
}
function _rpcDeferInit(fn) {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(
      function() {
        try {
          fn();
        } catch (e) {
          console.error("deferInit error:", e && e.message);
        }
      },
      { timeout: 1500 }
    );
  } else {
    setTimeout(function() {
      try {
        fn();
      } catch (e) {
        console.error("deferInit error:", e && e.message);
      }
    }, 200);
  }
}
function scheduleDeferredShellInits() {
  _rpcDeferInit(installClinicalAppShell);
  _rpcDeferInit(initGoalGFeatures);
  _rpcDeferInit(initGuidedTourGate);
  if (isMobileWeb()) {
    void initMobileWebBoot();
  } else {
    _rpcDeferInit(initMobileWebBoot);
  }
  _rpcDeferInit(initRpcServerHealthWatch);
  _rpcDeferInit(initIdleLockFeature);
}
function scheduleDeferredUiInits() {
  _rpcDeferInit(initProductivityKeyboardShortcuts);
}
wireShellExportRuntimes();

export {
  registerProcedureAgendaRuntime,
  renderProcedureAgendaPanel,
  windowHandlers,
  registerProductivityRuntime,
  pushUndoSnapshot,
  productivityWindowHandlers,
  registerAppShellContext,
  setMedTabAttention,
  syncWorkContextChrome,
  showToast,
  initModalDismiss,
  rpcPrefersReducedMotion,
  appShellWindowHandlers,
  installClinicalAppShell,
  scheduleDeferredShellInits,
  scheduleDeferredUiInits
};
//# sourceMappingURL=/js/chunks/chunk-B34F6JEY.js.map
