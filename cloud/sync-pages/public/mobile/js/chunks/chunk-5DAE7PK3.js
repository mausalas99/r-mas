import {
  getPatientsForDisplay
} from "/mobile/js/chunks/chunk-6A62XDR6.js";
import {
  syncClinicalContextBarVisibility
} from "/mobile/js/chunks/chunk-MOSUQW6R.js";
import {
  openLabBulkPreviewModal,
  shouldOfferBulkPreviewAddPatient
} from "/mobile/js/chunks/chunk-BGYDWUEW.js";
import {
  clearLabInputAfterSuccessfulParse,
  closeLabSomeTablesModal,
  consolidateLabHistoryByDayAndTipo,
  copiarLabsAlPortapapeles,
  deleteAllLabHistorySets,
  deleteLabHistorySet,
  deleteSelectedLabHistorySet,
  expandLabHistoryList,
  finalizeBulkLabPaste,
  finalizeLabHistoryImport,
  findDisplayLabHistorySetId,
  getActivePatientLabHistory,
  insertLabPatientSeparator,
  labHistoryPanelIsCollapsed,
  labPanelBridge,
  labSetIdForHistory,
  limpiarReporte,
  loadLabHistorySetIntoOutput,
  onLabHistoryDateChange,
  openLabHistoryDedupeReview,
  openLabPatientPicker,
  openLabSomeTablesModal,
  parseSomeTablesFromSources,
  pushExternalLabHistory,
  registerLabSomeTablesModalRuntime,
  renderLabHistoryPanel,
  replayLabHistorySet,
  reprocessLabHistorySet,
  reprocessSelectedLabHistorySet,
  setLabHistoryPanelCollapsed,
  setLabHistorySelectedSetId,
  stepLabHistoryDay,
  syncLabHistoryCollapseUI,
  syncLabHistoryDateSelect,
  syncLabSomeTablesBtn,
  toggleLabHistoryPanel
} from "/mobile/js/chunks/chunk-7EPXWU6A.js";
import {
  LAB_BULK_PATIENT_SEPARATOR,
  buildBulkLabPreview,
  extractLabPatientFromBulkBlock,
  shouldShowBulkLabPreview
} from "/mobile/js/chunks/chunk-JIKZNXZR.js";
import {
  copyLabMobileSyncDiag,
  forceLabMobileSyncPull,
  toggleLabMobileSyncDiag
} from "/mobile/js/chunks/chunk-TR2JMMVG.js";
import {
  registerLabPanelRuntime,
  rt as rt2
} from "/mobile/js/chunks/chunk-23D7ZB6I.js";
import {
  commitStubPatientFromLab,
  patientsBridge
} from "/mobile/js/chunks/chunk-M6MLPK4W.js";
import {
  rt
} from "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import {
  CENSUS_TEAM_FILTER_UNASSIGNED,
  buildTeamSelectOptions,
  censusFiltersAreActive,
  censusFiltersUseFullTeamCatalog,
  censusTeamCatalogForFilters,
  elevatedPatientFilters,
  ensureTeamAssignedPatientsOnDevice,
  filterPatientsForGuardiaCensus,
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForPatientApply,
  readCensusFiltersCollapsed,
  reconcileCensusTeamFilterForSala,
  renderGuardiaCensusGrid,
  resolveCensusSalaFilterId,
  resolveCensusTeamFilterId,
  shouldEnforceTeamPatientMirror,
  shouldShowClinicalCensusFilters,
  writeCensusFiltersCollapsed,
  writeCensusSalaFilterPreference,
  writeElevatedTeamFilterPreference
} from "/mobile/js/chunks/chunk-AVZ5WV63.js";
import {
  LAB_EXTENDED_PANEL_DEFS,
  isLabSectionHeaderHtml,
  renderEntry,
  sortResLabsByClinicalOrder
} from "/mobile/js/chunks/chunk-CZ2M277B.js";
import {
  refreshRpcDateFields
} from "/mobile/js/chunks/chunk-BUGU4R5K.js";
import {
  isGuardiaMode,
  isPaseMode
} from "/mobile/js/chunks/chunk-4SMSHN53.js";
import {
  getPatients,
  persistClinicalState
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  looksLikeSomeLabReport,
  normalizeFechaLabHistory
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  prefersReducedMotion,
  settlePasteSurface
} from "/mobile/js/chunks/chunk-KZT7D6I2.js";
import {
  CLINICAL_SALA_VALUES
} from "/mobile/js/chunks/chunk-WTVHUFEL.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/features/lab-bulk-stub-admit.mjs
function autoAdmitStubPatientsFromBulkBlocks(blocks) {
  var admitted = [];
  (blocks || []).forEach(function(block) {
    if (!shouldOfferBulkPreviewAddPatient(block)) return;
    var labPatient = extractLabPatientFromBulkBlock(block);
    if (!labPatient) return;
    var patient = commitStubPatientFromLab(labPatient);
    if (patient) admitted.push(patient);
  });
  return admitted;
}
function autoAdmitStubPatientsFromBulkText(text, findPatientByRegistro, buildPreview) {
  var initial = buildPreview(text, { findPatientByRegistro });
  var created = autoAdmitStubPatientsFromBulkBlocks(initial);
  if (!created.length) return { created: [], blocks: initial };
  var rebuilt = buildPreview(text, { findPatientByRegistro });
  return { created, blocks: rebuilt };
}

// public/js/features/lab-panel-output-helpers.mjs
function resolveLabOutputFechaBanner(patient) {
  if (!patient || !patient.fecha) return "";
  var fechaBanner = normalizeFechaLabHistory(patient.fecha) || String(patient.fecha).trim();
  return fechaBanner === "Anterior" ? "" : fechaBanner;
}
function updateLabPatientBanner(patient, fechaBanner, findPatientByRegistro) {
  var banner = document.getElementById("lab-banner");
  if (!banner) return;
  if (!patient || !patient.name) {
    banner.style.display = "none";
    return;
  }
  var reg = String(patient.expediente || "").trim();
  var inCensus = reg && findPatientByRegistro(reg);
  if (inCensus) {
    banner.style.display = "none";
    return;
  }
  document.getElementById("lab-patient-name").textContent = patient.name;
  document.getElementById("lab-patient-meta").textContent = [
    patient.expediente ? "Exp: " + patient.expediente : "",
    patient.sexo,
    patient.edad || "",
    fechaBanner || patient.fecha
  ].filter(Boolean).join("  |  ");
  banner.style.display = "block";
}
function attachSomeTablesParsed(result, src, extraSources) {
  var list = [src];
  if (Array.isArray(extraSources)) list = list.concat(extraSources);
  result.someTablesParsed = parseSomeTablesFromSources(list);
}
function appendBhExtendedLines(box, text, result, labDisp, rt3) {
  if (!labDisp.showBhExtendedLine || !result.bhExtras || !rt3.isBhMainResLabChunk(text)) return;
  var extTab = rt3.formatBhExtendedTabLine(result.bhExtras, result.sourceText);
  if (!extTab) return;
  renderEntry(extTab).forEach(function(html, idx) {
    var divEx = document.createElement("div");
    divEx.className = (idx === 0 ? "out-line" : "out-indent") + " lab-bh-extended-line";
    divEx.innerHTML = html;
    box.appendChild(divEx);
  });
}
function appendCitoquimInterpretacionChunk(box, text, rt3) {
  var alertDiv = document.createElement("div");
  alertDiv.className = "lab-out-citoquim-interp out-line";
  alertDiv.setAttribute("role", "status");
  alertDiv.textContent = rt3.citoquimInterpretacionBody_ ? rt3.citoquimInterpretacionBody_(text) : rt3.ascitisInterpretacionBody_(text);
  box.appendChild(alertDiv);
}
function appendCultivoChunk(box, text, src, rt3) {
  var wrap = document.createElement("div");
  wrap.className = "lab-out-cultivo-chunk";
  wrap.innerHTML = rt3.buildCultivoOutputHtmlFragments(text, src);
  box.appendChild(wrap);
}
function appendStandardResLabChunk(box, text) {
  renderEntry(text).forEach(function(html, idx) {
    var div = document.createElement("div");
    div.className = idx === 0 || isLabSectionHeaderHtml(html) ? "out-line" : "out-indent";
    div.innerHTML = html;
    box.appendChild(div);
  });
}
function appendLabHourGroupHeader(box, group) {
  if (!box || !group) return;
  var head = box.ownerDocument.createElement("div");
  head.className = "lab-hour-group-h";
  var hora = String(group.hora || "").trim();
  var tipo = String(group.tipoLabel || "").trim();
  head.textContent = [hora, tipo].filter(Boolean).join(" \xB7 ") || "Env\xEDo";
  box.appendChild(head);
}
function appendResLabChunksToBox(box, resLabs, src, result, labDisp, rt3) {
  sortResLabsByClinicalOrder(resLabs || []).forEach(function(text) {
    if (labDisp.hideGasoAdvInterp && rt3.isGasoInterpretacionResLabChunk(text)) return;
    if (rt3.isCitoquimInterpretacionResLabChunk && rt3.isCitoquimInterpretacionResLabChunk(text) || rt3.isAscitisInterpretacionResLabChunk(text)) {
      appendCitoquimInterpretacionChunk(box, text, rt3);
      return;
    }
    if (rt3.isResLabChunkPureCultivo(text)) {
      appendCultivoChunk(box, text, src, rt3);
      return;
    }
    appendStandardResLabChunk(box, text);
    appendBhExtendedLines(box, text, result, labDisp, rt3);
  });
}
function syncLabOutputHistoryAfterRender(opts, result, rt3) {
  if (opts && opts.fromHistory) return;
  var pid = rt3.getActiveId();
  if (!pid) return;
  var preferId = opts && opts.preferHistorySetId || findDisplayLabHistorySetId(pid, result) || "";
  if (!preferId) {
    var hist = getActivePatientLabHistory();
    preferId = hist.length ? labSetIdForHistory(hist[0], 0) : "";
  }
  syncLabHistoryDateSelect({ preferSetId: preferId });
  if (preferId) setLabHistorySelectedSetId(pid, preferId);
}
function prepareLabOutputBox(fechaBanner, rt3) {
  var box = document.getElementById("lab-output-box");
  rt3.removeAtbRisPanelsFromBody();
  box.innerHTML = "";
  if (fechaBanner) {
    var fechaTop = document.createElement("div");
    fechaTop.className = "lab-output-fecha";
    fechaTop.textContent = fechaBanner;
    box.appendChild(fechaTop);
  }
  return box;
}

// public/js/features/lab-panel-parse.mjs
function labOutputSettleEl(wasHidden, opts, outSec, box) {
  if (wasHidden) return outSec || box;
  if (opts && opts.fromHistory) return box || outSec;
  return null;
}
function runFinalizeWithFreshBlocks(text) {
  var admit = autoAdmitStubPatientsFromBulkText(text, rt2.findPatientByRegistro, buildBulkLabPreview);
  if (admit.created.length) {
    rt2.showToast(
      admit.created.length + " paciente" + (admit.created.length === 1 ? "" : "s") + " agregado" + (admit.created.length === 1 ? "" : "s") + " al censo \u2014 completa ubicaci\xF3n",
      "success"
    );
  }
  var freshBlocks = admit.blocks;
  var freshTotal = freshBlocks.reduce(function(acc, b) {
    return acc + b.okReportCount;
  }, 0);
  finalizeBulkLabPaste(text, freshBlocks, freshTotal);
}
function tryOfferAddPatientThenProcess(text, blocks) {
  if (!blocks || blocks.length !== 1) return false;
  var block = blocks[0];
  if (!shouldOfferBulkPreviewAddPatient(block)) return false;
  runFinalizeWithFreshBlocks(text);
  return true;
}
function procesarReporte() {
  var text = document.getElementById("lab-input").value.trim();
  if (!text) {
    rt2.showToast("Pega el texto del reporte primero", "error");
    return;
  }
  var blocks = buildBulkLabPreview(text, { findPatientByRegistro: rt2.findPatientByRegistro });
  if (!blocks.length) {
    rt2.showToast("No se detectaron reportes SOME en el texto pegado", "error");
    return;
  }
  var totalOkReports = blocks.reduce(function(acc, b) {
    return acc + b.okReportCount;
  }, 0);
  if (!totalOkReports) {
    rt2.showToast(
      looksLikeSomeLabReport(text) ? "No se encontraron resultados de laboratorio en el texto pegado" : "No parece un reporte de SOME. Copia desde \xABExpediente:\xBB hasta el final del reporte.",
      "error"
    );
    return;
  }
  try {
    if (shouldShowBulkLabPreview(blocks, totalOkReports, {
      quickLabOutput: rt2.getLabOutputPrefs().quickLabOutput
    })) {
      openLabBulkPreviewModal({
        blocks,
        sourceText: text,
        onConfirm: function() {
          runFinalizeWithFreshBlocks(text);
        }
      });
      return;
    }
    if (tryOfferAddPatientThenProcess(text, blocks)) return;
    finalizeBulkLabPaste(text, blocks, totalOkReports);
  } catch (e) {
    rt2.showToast("Error al procesar el reporte", "error");
    console.error(e);
  }
}
function renderOutput(result, opts) {
  var patient = result.patient;
  var resLabs = result.resLabs;
  var groups = opts && opts.dayGroups;
  if (groups && groups.length > 1) result.dayGroups = groups;
  labPanelBridge.setActiveLab(result);
  if (!(opts && opts.fromHistory)) rt2.onboardingAdvanceAfterParse();
  var fechaBanner = resolveLabOutputFechaBanner(patient);
  updateLabPatientBanner(patient, fechaBanner, rt2.findPatientByRegistro);
  var box = prepareLabOutputBox(fechaBanner, rt2);
  var src = String(result.sourceText || "").trim();
  var extras = [];
  if (groups && groups.length) {
    groups.forEach(function(group) {
      extras.push(group.sourceText);
    });
  }
  attachSomeTablesParsed(result, src, extras);
  if (groups && groups.length) {
    groups.forEach(function(group) {
      if (groups.length > 1) appendLabHourGroupHeader(box, group);
      appendResLabChunksToBox(
        box,
        group.resLabs,
        group.sourceText || src,
        result,
        rt2.getLabOutputPrefs(),
        rt2
      );
    });
  } else {
    appendResLabChunksToBox(box, resLabs, src, result, rt2.getLabOutputPrefs(), rt2);
  }
  var outSec = document.getElementById("lab-output-section");
  var wasHidden = !outSec || outSec.style.display === "none";
  if (outSec) outSec.style.display = "block";
  var settleEl = labOutputSettleEl(wasHidden, opts, outSec, box);
  if (settleEl) settlePasteSurface(settleEl);
  var labRoot = document.getElementById("appcontent-lab");
  if (labRoot) labRoot.classList.remove("is-lab-chunk-loading");
  syncLabOutputHistoryAfterRender(opts, result, rt2);
  labPanelBridge.syncLabOutputChrome();
  rt2.wireAtbRisHoverPanels(box);
}

// public/js/features/lab-repo-import-gate.mjs
function buildLabRepoBulkText(studies) {
  return (studies || []).map(function(s) {
    return String(s.text || "").trim();
  }).filter(Boolean).join("\n\n");
}
function shouldSilentImportLabRepo(ctx) {
  if (ctx.fetchErrors && ctx.fetchErrors.length) {
    return { silent: false, reason: "fetch-errors" };
  }
  if (!ctx.blocks.length) {
    return { silent: false, reason: "no-blocks" };
  }
  var bad = ctx.blocks.filter(function(b) {
    return b.status !== "ok" || !b.canProcess || !b.okReportCount;
  });
  if (bad.length) {
    return { silent: false, reason: "block-issues" };
  }
  if (ctx.activePatientId && ctx.activePatientRegistro && ctx.requestedRegistro && ctx.activePatientRegistro.trim() !== ctx.requestedRegistro.trim()) {
    return { silent: false, reason: "registro-mismatch" };
  }
  return { silent: true, reason: "ok" };
}
function buildLabRepoPreviewBlocks(studies, findPatientByRegistro) {
  var text = buildLabRepoBulkText(studies);
  return buildBulkLabPreview(text, { findPatientByRegistro });
}
function isLabRepoConnectionError(message) {
  return /lab-repo-http-|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(
    String(message || "")
  );
}
function resolveLabRepoFetchUserMessage(studies, errors) {
  if (studies && studies.length) return null;
  var list = errors || [];
  if (!list.length) {
    return {
      toast: "Sin estudios en el rango seleccionado",
      type: "info"
    };
  }
  var first = list[0] || {};
  var code = String(first.message || "");
  if (isLabRepoConnectionError(code)) {
    return {
      toast: "No se pudo conectar al repositorio de laboratorio (revisa red hospital)",
      type: "error"
    };
  }
  if (code === "no-search-results") {
    return {
      toast: "No hay estudios para ese registro en el portal",
      type: "info"
    };
  }
  if (code === "no-rows-in-range") {
    var total = first.totalRows;
    if (typeof total === "number" && total > 0) {
      return {
        toast: "Hay " + total + " estudio" + (total === 1 ? "" : "s") + " para ese registro pero ninguno en el rango de fechas. Ampl\xEDa Desde/Hasta.",
        type: "info"
      };
    }
    return {
      toast: "Sin estudios en el rango seleccionado",
      type: "info"
    };
  }
  if (list.every(function(e) {
    return e.folio;
  })) {
    return {
      toast: "No se pudieron descargar los reportes (" + list.length + " fallos)",
      type: "error"
    };
  }
  return {
    toast: "Error al consultar el repositorio: " + code,
    type: "error"
  };
}

// public/js/features/lab-repo-import.mjs
function labRepoDefaultDateRange() {
  var hasta = /* @__PURE__ */ new Date();
  hasta.setHours(0, 0, 0, 0);
  var desde = new Date(hasta);
  desde.setDate(desde.getDate() - 2);
  return { desde, hasta };
}
function labRepoToDateInputValue(d) {
  var pad = function(n) {
    return String(n).padStart(2, "0");
  };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function syncLabRepoDateField(input) {
  if (!input) return;
  input.dispatchEvent(new Event("rpc-date-refresh"));
}
function parseDateInputDay(isoDay) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDay || "").trim());
  if (!m) return null;
  var y = Number(m[1]);
  var mo = Number(m[2]) - 1;
  var day = Number(m[3]);
  var dt = new Date(y, mo, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== day) return null;
  return dt;
}
function labRepoFetchRangeFromDateInputs(desdeDay, hastaDay) {
  var desde = parseDateInputDay(desdeDay);
  var hasta = parseDateInputDay(hastaDay);
  if (!desde || !hasta) return null;
  desde.setHours(0, 0, 0, 0);
  hasta.setHours(23, 59, 59, 999);
  if (desde.getTime() > hasta.getTime()) return null;
  return { desde, hasta };
}
function getActivePatient() {
  return typeof rt2.getActivePatient === "function" ? rt2.getActivePatient() : null;
}
function readLabRepoImportFields() {
  var registroEl = document.getElementById("lab-repo-registro");
  var desdeEl = document.getElementById("lab-repo-desde");
  var hastaEl = document.getElementById("lab-repo-hasta");
  if (!registroEl || !desdeEl || !hastaEl) return null;
  return {
    registro: String(registroEl.value || "").trim(),
    desde: String(desdeEl.value || "").trim(),
    hasta: String(hastaEl.value || "").trim()
  };
}
function validateLabRepoImportFields(fields) {
  if (!fields) return false;
  if (!fields.registro) {
    rt2.showToast("Indica el registro", "error");
    return false;
  }
  if (!fields.desde || !fields.hasta) {
    rt2.showToast("Indica el rango de fechas", "error");
    return false;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    rt2.showToast("Importaci\xF3n del repositorio solo en la app de escritorio", "warn");
    return false;
  }
  return true;
}
function setLabRepoImportBusy(busy) {
  var btnImport = document.getElementById("lab-repo-import-confirm");
  if (!btnImport) return;
  btnImport.disabled = busy;
  btnImport.setAttribute("aria-disabled", busy ? "true" : "false");
}
function toastLabRepoFetchOutcome(studies, errors) {
  var msg = resolveLabRepoFetchUserMessage(studies, errors);
  if (!msg) return true;
  rt2.showToast(msg.toast, msg.type);
  return false;
}
function finishLabRepoImport(studies, registro, errors) {
  var blocks = buildLabRepoPreviewBlocks(studies, rt2.findPatientByRegistro);
  var active = getActivePatient();
  var gate = shouldSilentImportLabRepo({
    blocks,
    fetchErrors: errors || [],
    requestedRegistro: registro,
    activePatientRegistro: active && active.registro ? String(active.registro) : "",
    activePatientId: rt2.getActiveId ? rt2.getActiveId() : null
  });
  var text = buildLabRepoBulkText(studies);
  var totalOk = blocks.reduce(function(n, b) {
    return n + (b.okReportCount || 0);
  }, 0);
  closeLabRepoImportModal();
  if (gate.silent) {
    finalizeBulkLabPaste(text, blocks, totalOk);
    return;
  }
  openLabBulkPreviewModal({
    blocks,
    sourceText: text,
    onConfirm: function() {
      finalizeBulkLabPaste(text, blocks, totalOk);
    }
  });
}
function registerLabRepoImportRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}
function openLabRepoImportModal() {
  if (typeof window !== "undefined" && typeof window.openLabRepoBatchModal === "function") {
    window.openLabRepoBatchModal();
    return;
  }
  rt2.showToast("Usa Actualizar labs en Laboratorio", "info");
}
function closeLabRepoImportModal() {
  var modal = document.getElementById("lab-repo-import-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modal.hidden = true;
}
async function confirmLabRepoImport() {
  var fields = readLabRepoImportFields();
  if (!validateLabRepoImportFields(fields)) return;
  var range = labRepoFetchRangeFromDateInputs(fields.desde, fields.hasta);
  if (!range) {
    rt2.showToast("Revisa el rango de fechas (Desde no puede ser posterior a Hasta)", "error");
    return;
  }
  setLabRepoImportBusy(true);
  rt2.showToast("Consultando repositorio\u2026", "info");
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro: fields.registro,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString()
    });
    var studies = res && res.studies || [];
    var errors = res && res.errors || [];
    if (!toastLabRepoFetchOutcome(studies, errors)) return;
    finishLabRepoImport(studies, fields.registro, errors);
  } catch (_unused) {
    void _unused;
    rt2.showToast("Error al consultar el repositorio", "error");
  } finally {
    setLabRepoImportBusy(false);
  }
}

// public/js/features/patients-default-id.mjs
var LAST_PATIENT_LS = "rpc-last-patient-id";
function readLastSelectedPatientId() {
  try {
    return String(localStorage.getItem(LAST_PATIENT_LS) || "").trim();
  } catch {
    return "";
  }
}
function writeLastSelectedPatientId(id) {
  var pid = id == null ? "" : String(id).trim();
  try {
    if (!pid || pid.indexOf("demo-") === 0) {
      localStorage.removeItem(LAST_PATIENT_LS);
      return;
    }
    localStorage.setItem(LAST_PATIENT_LS, pid);
  } catch (_e) {
    void _e;
  }
}
function pickDefaultPatientId(visible, activeId, lastId) {
  if (!Array.isArray(visible) || !visible.length) return null;
  if (idInVisible(visible, activeId)) return activeId;
  if (lastId && idInVisible(visible, lastId)) return lastId;
  var pinned = visible.find(function(p) {
    return p && p.pinned && !p.archived;
  });
  if (pinned) return pinned.id;
  var live = visible.find(function(p) {
    return p && !p.archived;
  });
  return (live || visible[0]).id;
}
function idInVisible(visible, id) {
  if (id == null || id === "") return false;
  var want = String(id);
  return visible.some(function(p) {
    return p && String(p.id) === want;
  });
}

// public/js/features/patients-scope-filters-bar.mjs
var FILTERS_MOUNT_HOME_SELECTOR = "#patient-sidebar .sidebar-header";
var patientFiltersChromeWired = false;
function censusFiltersBarEl() {
  return document.getElementById("clinical-census-filters");
}
function filtersMountHomeEl() {
  return document.querySelector(FILTERS_MOUNT_HOME_SELECTOR);
}
function densitySpacePx() {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--density-space");
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}
function positionFiltersPopover(mount) {
  const home = filtersMountHomeEl();
  if (!home || !mount) return;
  const search = document.querySelector("#patient-sidebar .patient-search-wrap");
  const anchor = search || home;
  const rect = anchor.getBoundingClientRect();
  const pad = 16 * densitySpacePx();
  mount.style.position = "fixed";
  mount.style.top = `${Math.round(rect.bottom + 4)}px`;
  mount.style.left = `${Math.round(rect.left + pad)}px`;
  mount.style.width = `${Math.max(0, Math.round(rect.width - pad * 2))}px`;
  mount.style.right = "auto";
  mount.style.zIndex = "520";
}
function clearFiltersPopoverPosition(mount) {
  if (!mount) return;
  mount.style.position = "";
  mount.style.top = "";
  mount.style.left = "";
  mount.style.width = "";
  mount.style.right = "";
  mount.style.zIndex = "";
}
function attachFiltersMount(mount, open) {
  const home = filtersMountHomeEl();
  if (!mount || !home) return;
  if (open) {
    if (mount.parentElement !== document.body) document.body.appendChild(mount);
    positionFiltersPopover(mount);
    mount.classList.add("clinical-census-filters-mount--floating");
    return;
  }
  mount.classList.remove("clinical-census-filters-mount--floating");
  clearFiltersPopoverPosition(mount);
  if (mount.parentElement !== home) home.appendChild(mount);
}
function applyCensusFiltersCollapsed(collapsed) {
  const bar = censusFiltersBarEl();
  if (!bar) return;
  writeCensusFiltersCollapsed(collapsed);
  syncPatientFiltersTriggerUi(bar, collapsed);
}
function togglePatientCensusFiltersCollapsed() {
  const bar = censusFiltersBarEl();
  if (!bar) return false;
  const willOpen = bar.classList.contains("is-collapsed");
  applyCensusFiltersCollapsed(!willOpen);
  return !willOpen;
}
function initPatientFiltersChrome() {
  if (patientFiltersChromeWired) return;
  patientFiltersChromeWired = true;
  document.addEventListener("click", (event) => {
    const target = (
      /** @type {Element|null} */
      event.target
    );
    if (target?.closest?.("#btn-patient-filters")) return;
    const bar = censusFiltersBarEl();
    if (!bar || bar.classList.contains("is-collapsed")) return;
    const anchor = document.getElementById("patient-filters-anchor");
    const mount = document.getElementById("clinical-census-filters-sidebar-mount");
    if (!target) return;
    if (anchor?.contains(target) || mount?.contains(target) || bar.contains(target)) return;
    applyCensusFiltersCollapsed(true);
  });
  document.addEventListener("keydown", (event) => {
    const bar = censusFiltersBarEl();
    if (event.key === "Escape" && bar && !bar.classList.contains("is-collapsed")) {
      applyCensusFiltersCollapsed(true);
    }
  });
}
function buildCensusFiltersBodyHtml(user, mobileSidebar) {
  const showSalaFilter = !mobileSidebar || censusFiltersUseFullTeamCatalog(user);
  const salaBlock = showSalaFilter ? '<label class="clinical-census-filter"><span>Sala</span><select id="clinical-filter-sala" class="profile-input"><option value="__all__">Todas</option>' + CLINICAL_SALA_VALUES.map((s) => `<option value="${s}">${s}</option>`).join("") + "</select></label>" : "";
  return '<div id="clinical-census-filters-body" class="clinical-census-filters-body">' + salaBlock + '<label class="clinical-census-filter"><span>Equipo</span><select id="clinical-filter-team" class="profile-input"><option value="">Todos los equipos</option><option value="__unassigned__">Sin equipo asignado</option></select></label><label class="clinical-census-filter"><span>Servicio</span><input type="search" id="clinical-filter-service" class="profile-input" placeholder="Filtrar\u2026" autocomplete="off"></label></div>';
}
function syncPatientFiltersTriggerUi(bar, collapsed) {
  const triggerBtn = document.getElementById("btn-patient-filters");
  const mount = document.getElementById("clinical-census-filters-sidebar-mount");
  const body = document.getElementById("clinical-census-filters-body");
  if (!triggerBtn || !mount || !body) return;
  triggerBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  triggerBtn.classList.toggle("btn-patient-filters--open", !collapsed);
  triggerBtn.classList.toggle("btn-patient-filters--active", censusFiltersAreActive());
  mount.hidden = collapsed;
  mount.setAttribute("aria-hidden", collapsed ? "true" : "false");
  body.hidden = collapsed;
  bar.classList.toggle("is-collapsed", collapsed);
  attachFiltersMount(mount, !collapsed);
  const badge = document.getElementById("btn-patient-filters-badge");
  if (badge) badge.hidden = !censusFiltersAreActive();
}
function wirePatientFiltersPopover() {
  initPatientFiltersChrome();
  applyCensusFiltersCollapsed(readCensusFiltersCollapsed());
}
function detachPatientFiltersPopover() {
  const mount = document.getElementById("clinical-census-filters-sidebar-mount");
  if (!mount) return;
  attachFiltersMount(mount, false);
  mount.hidden = true;
  mount.setAttribute("aria-hidden", "true");
}
function wireCensusFilterInputs(bar, refreshCensusViews) {
  wirePatientFiltersPopover();
  const salaSel = bar.querySelector("#clinical-filter-sala");
  const teamSel = bar.querySelector("#clinical-filter-team");
  const serviceInp = bar.querySelector("#clinical-filter-service");
  const onFilterChange = () => {
    const currentBar = censusFiltersBarEl();
    if (currentBar) {
      syncPatientFiltersTriggerUi(currentBar, currentBar.classList.contains("is-collapsed"));
    }
    refreshCensusViews();
  };
  if (salaSel) {
    salaSel.addEventListener("change", () => {
      elevatedPatientFilters.sala = String(salaSel.value || "__all__");
      writeCensusSalaFilterPreference(elevatedPatientFilters.sala);
      syncCensusTeamFilterSelect(clinicalSessionContext.user);
      onFilterChange();
    });
  }
  if (teamSel) {
    teamSel.addEventListener("change", () => {
      elevatedPatientFilters.teamId = String(teamSel.value || "");
      writeElevatedTeamFilterPreference(elevatedPatientFilters.teamId);
      onFilterChange();
    });
  }
  if (serviceInp) {
    serviceInp.addEventListener("input", () => {
      elevatedPatientFilters.service = String(serviceInp.value || "").trim();
      onFilterChange();
    });
  }
}
function createCensusFiltersBar(user, filtersMount, mobileSidebar) {
  const bar = document.createElement("div");
  bar.id = "clinical-census-filters";
  bar.className = "clinical-census-filters clinical-census-filters--popover" + (mobileSidebar ? " clinical-census-filters--mobile-sidebar" : "");
  bar.innerHTML = buildCensusFiltersBodyHtml(user, mobileSidebar);
  if (bar.parentElement && bar.parentElement !== filtersMount) {
    bar.remove();
  }
  filtersMount.appendChild(bar);
  const collapsed = readCensusFiltersCollapsed();
  bar.classList.toggle("is-collapsed", collapsed);
  filtersMount.hidden = collapsed;
  filtersMount.setAttribute("aria-hidden", collapsed ? "true" : "false");
  return bar;
}
function syncCensusTeamFilterSelect(user) {
  const teamSel = document.getElementById("clinical-filter-team");
  if (!teamSel) return;
  const teams = clinicalSessionContext.teams || [];
  const salaFilter = String(elevatedPatientFilters.sala || "__all__");
  const teamsForCatalog = censusTeamCatalogForFilters(user, teams, salaFilter);
  const priorTeamId = String(elevatedPatientFilters.teamId ?? "");
  let teamFilterId = resolveCensusTeamFilterId(user, teamsForCatalog, priorTeamId);
  teamFilterId = reconcileCensusTeamFilterForSala(teamFilterId, teamsForCatalog);
  if (teamFilterId !== priorTeamId) {
    writeElevatedTeamFilterPreference(teamFilterId);
  }
  elevatedPatientFilters.teamId = teamFilterId;
  const unassignedOpt = censusFiltersUseFullTeamCatalog(user) ? `<option value="${CENSUS_TEAM_FILTER_UNASSIGNED}">Sin equipo asignado</option>` : "";
  const groupBySala = censusFiltersUseFullTeamCatalog(user) && (!salaFilter || salaFilter === "__all__");
  teamSel.innerHTML = '<option value="">Todos los equipos</option>' + unassignedOpt + buildTeamSelectOptions(teamsForCatalog, teamFilterId, { groupBySala });
  teamSel.value = teamFilterId;
}
function syncCensusScalarFilterInputs(user) {
  const salaSel = document.getElementById("clinical-filter-sala");
  const serviceInp = document.getElementById("clinical-filter-service");
  const salaFilterId = resolveCensusSalaFilterId(user);
  if (elevatedPatientFilters.sala !== salaFilterId) {
    elevatedPatientFilters.sala = salaFilterId;
  }
  if (salaSel && salaSel.value !== elevatedPatientFilters.sala) {
    salaSel.value = elevatedPatientFilters.sala;
  }
  syncCensusTeamFilterSelect(user);
  if (serviceInp && serviceInp.value !== elevatedPatientFilters.service) {
    serviceInp.value = elevatedPatientFilters.service;
  }
  const bar = document.getElementById("clinical-census-filters");
  if (bar) {
    syncPatientFiltersTriggerUi(bar, bar.classList.contains("is-collapsed"));
  }
}

// public/js/features/patients-scope.mjs
var patientSearchFilter = "";
function getPatientSearchFilter() {
  return patientSearchFilter;
}
function setPatientSearchFilter(val) {
  patientSearchFilter = (val || "").trim().toLowerCase();
}
function patientMatchesSearch(p) {
  if (!patientSearchFilter) return true;
  var q = patientSearchFilter;
  return String(p.nombre || "").toLowerCase().indexOf(q) !== -1 || String(p.registro || "").toLowerCase().indexOf(q) !== -1 || String(p.cuarto || "").toLowerCase().indexOf(q) !== -1 || String(p.cama || "").toLowerCase().indexOf(q) !== -1 || String(p.servicio || "").toLowerCase().indexOf(q) !== -1 || String(p.area || "").toLowerCase().indexOf(q) !== -1;
}
function patientsVisibleInSidebar() {
  const base = getPatientsForDisplay(() => getPatients());
  if (shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForPatientApply()) {
    return [];
  }
  return filterPatientsForGuardiaCensus2(base);
}
function pickDefaultVisiblePatientId() {
  return pickDefaultPatientId(
    patientsVisibleInSidebar(),
    rt.getActiveId(),
    readLastSelectedPatientId()
  );
}
function patientViewIsOpen() {
  var pv = document.getElementById("patient-view");
  if (!pv) return false;
  return pv.style.display !== "none";
}
function ensureActivePatientInSidebarScope() {
  const nextId = pickDefaultVisiblePatientId();
  if (nextId != null) {
    var already = String(rt.getActiveId()) === String(nextId) && patientViewIsOpen();
    if (!already) patientsBridge.selectPatient(nextId);
    return true;
  }
  if (rt.getActiveId() == null) return false;
  rt.setActiveId(null);
  const pv = document.getElementById("patient-view");
  const es = document.getElementById("empty-state");
  if (pv) pv.style.display = "none";
  if (es) es.style.display = "flex";
  rt.syncWorkContextChrome();
  return false;
}
function reselectIfActivePatientHidden(visiblePatients) {
  const activeId = rt.getActiveId();
  if (activeId == null) return false;
  const stillVisible = visiblePatients.some(function(p) {
    return String(p.id) === String(activeId);
  });
  if (stillVisible) return false;
  ensureActivePatientInSidebarScope();
  return true;
}
function filterPatientsForGuardiaCensus2(basePatients) {
  return filterPatientsForGuardiaCensus(
    basePatients,
    clinicalSessionContext.user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap,
    elevatedPatientFilters
  );
}
function syncClinicalCensusFiltersChrome() {
  syncClinicalCensusFiltersBar();
}
function togglePatientCensusFilters(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  syncClinicalCensusFiltersBar();
  togglePatientCensusFiltersCollapsed();
}
function refreshCensusViewsAfterFilterChange() {
  const user = clinicalSessionContext.user;
  if (user) syncCensusScalarFilterInputs(user);
  patientsBridge.renderPatientList({ force: true });
  if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
  if (shouldEnforceTeamPatientMirror()) return;
  void ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 5e3 }).then(() => {
    patientsBridge.renderPatientList({ silent: true });
    if (isGuardiaMode()) renderGuardiaCensusGrid(rt.getSettings());
  });
}
function censusFiltersMountEl() {
  return document.getElementById("clinical-census-filters-sidebar-mount");
}
function syncPatientFiltersButton(show) {
  const btn = document.getElementById("btn-patient-filters");
  const badge = document.getElementById("btn-patient-filters-badge");
  if (!btn) return;
  btn.hidden = !show;
  btn.setAttribute("aria-hidden", show ? "false" : "true");
  if (!show) {
    btn.classList.remove("btn-patient-filters--open", "btn-patient-filters--active");
    btn.setAttribute("aria-expanded", "false");
    if (badge) badge.hidden = true;
    return;
  }
  const active = censusFiltersAreActive();
  btn.classList.toggle("btn-patient-filters--active", active);
  if (badge) badge.hidden = !active;
}
function hideCensusFiltersMounts() {
  ["clinical-census-filters-mount", "clinical-census-filters-sidebar-mount"].forEach(function(id) {
    const mount = document.getElementById(id);
    if (!mount) return;
    mount.hidden = true;
    mount.setAttribute("aria-hidden", "true");
  });
}
function syncClinicalCensusFiltersBar() {
  const user = clinicalSessionContext.user;
  const showFilters = user && shouldShowClinicalCensusFilters(user);
  const filtersMount = censusFiltersMountEl();
  let bar = document.getElementById("clinical-census-filters");
  if (!showFilters || shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForPatientApply()) {
    if (bar) bar.remove();
    detachPatientFiltersPopover();
    hideCensusFiltersMounts();
    syncPatientFiltersButton(false);
    syncClinicalContextBarVisibility();
    return;
  }
  if (!filtersMount) return;
  try {
    const storedSala = localStorage.getItem("clinical.censusFilterSala");
    if (storedSala) {
      elevatedPatientFilters.sala = storedSala;
      localStorage.removeItem("clinical.censusFilterSala");
    } else {
      elevatedPatientFilters.sala = resolveCensusSalaFilterId(user);
    }
  } catch (_e) {
    void _e;
  }
  if (!bar) {
    bar = createCensusFiltersBar(user, filtersMount, true);
    wireCensusFilterInputs(bar, refreshCensusViewsAfterFilterChange);
  } else {
    initPatientFiltersChrome();
  }
  syncCensusScalarFilterInputs(user);
  syncPatientFiltersButton(true);
  syncClinicalContextBarVisibility();
}

// public/js/features/lab-repo-batch-bulk-apply.mjs
function countBlocksOkAndPatients(blocks) {
  var totalOk = 0;
  var patientIds = /* @__PURE__ */ new Set();
  (blocks || []).forEach(function(b) {
    totalOk += b && b.okReportCount ? b.okReportCount : 0;
    if (b && b.canProcess && b.patient && b.patient.id) {
      patientIds.add(String(b.patient.id));
    }
  });
  return { totalOk, patientCount: patientIds.size };
}
function joinPatientBulkTexts(texts) {
  return (texts || []).map(function(t) {
    return String(t || "").trim();
  }).filter(Boolean).join("\n\n" + LAB_BULK_PATIENT_SEPARATOR + "\n\n");
}
function previewBlocksFromBulkText(text, rt3) {
  if (typeof rt3.rebuildBulkLabPreviewBlocks === "function") {
    return rt3.rebuildBulkLabPreviewBlocks(text);
  }
  return buildBulkLabPreview(text, { findPatientByRegistro: rt3.findPatientByRegistro });
}
function finalizeJoinedBulkTexts(texts, rt3) {
  var text = joinPatientBulkTexts(texts);
  if (!text) return { importedPatients: 0, totalOk: 0 };
  var blocks = previewBlocksFromBulkText(text, rt3);
  var counts = countBlocksOkAndPatients(blocks);
  if (!counts.totalOk) return { importedPatients: 0, totalOk: 0 };
  finalizeBulkLabPaste(text, blocks, counts.totalOk);
  return { importedPatients: counts.patientCount, totalOk: counts.totalOk };
}
function classifyPatientStudyGroup(g, rt3) {
  if (!g || !g.studies || !g.studies.length) return null;
  var text = buildLabRepoBulkText(g.studies);
  if (!text) return null;
  var blocks = buildLabRepoPreviewBlocks(g.studies, rt3.findPatientByRegistro);
  var counts = countBlocksOkAndPatients(blocks);
  if (!counts.totalOk) return { text, silent: false, patientCount: 0 };
  var registro = g.row && g.row.registro ? String(g.row.registro) : "";
  var gate = shouldSilentImportLabRepo({
    blocks,
    // Folio/PDF noise must not force review when usable labs already exist.
    fetchErrors: [],
    requestedRegistro: registro,
    activePatientRegistro: registro,
    activePatientId: g.row && g.row.id ? String(g.row.id) : null
  });
  return {
    text,
    silent: !!gate.silent,
    patientCount: counts.patientCount || 1
  };
}
function openBatchReviewPreview(reviewTexts, rt3) {
  var reviewText = joinPatientBulkTexts(reviewTexts);
  var reviewBlocks = previewBlocksFromBulkText(reviewText, rt3);
  openLabBulkPreviewModal({
    blocks: reviewBlocks,
    sourceText: reviewText,
    onConfirm: function() {
      finalizeBulkLabPaste(
        reviewText,
        reviewBlocks,
        countBlocksOkAndPatients(reviewBlocks).totalOk
      );
    }
  });
}
function applyBatchStudyGroups(groups, rt3) {
  var silentTexts = [];
  var reviewTexts = [];
  var importedPatients = 0;
  (groups || []).forEach(function(g) {
    var outcome = classifyPatientStudyGroup(g, rt3);
    if (!outcome) return;
    if (outcome.silent) {
      silentTexts.push(outcome.text);
      importedPatients += outcome.patientCount;
      return;
    }
    reviewTexts.push(outcome.text);
  });
  if (silentTexts.length) finalizeJoinedBulkTexts(silentTexts, rt3);
  if (!reviewTexts.length) {
    return { needsReview: false, importedPatients };
  }
  openBatchReviewPreview(reviewTexts, rt3);
  return { needsReview: true, importedPatients };
}

// public/js/features/lab-repo-batch-model.mjs
function buildLabRepoBatchRows(patients, opts) {
  var selectedIds = normalizeIdSet(opts && opts.selectedIds);
  var defaultSelect = !(opts && opts.defaultSelectWithRegistro === false);
  var useExplicit = !!(opts && opts.selectedIds != null);
  return (patients || []).filter(function(p) {
    return p && p.id != null && String(p.id);
  }).map(function(p) {
    var id = String(p.id);
    var registro = String(p.registro || "").trim();
    var hasRegistro = !!registro;
    var selected = hasRegistro ? useExplicit ? selectedIds.has(id) : defaultSelect : false;
    return {
      id,
      nombre: String(p.nombre || "").trim() || "Sin nombre",
      registro,
      hint: bedHint(p),
      hasRegistro,
      selected
    };
  });
}
function selectedLabRepoBatchRows(rows) {
  return (rows || []).filter(function(r) {
    return r && r.selected && r.hasRegistro && r.registro;
  });
}
function setAllSelectableLabRepoBatchRows(rows, selected) {
  return (rows || []).map(function(r) {
    if (!r || !r.hasRegistro) return Object.assign({}, r, { selected: false });
    return Object.assign({}, r, { selected: !!selected });
  });
}
function selectOnlyActiveLabRepoBatchRows(rows, activePatientId) {
  var id = String(activePatientId || "");
  return (rows || []).map(function(r) {
    if (!r || !r.hasRegistro) return Object.assign({}, r, { selected: false });
    return Object.assign({}, r, { selected: id !== "" && String(r.id) === id });
  });
}
function setLabRepoBatchRowSelected(rows, patientId, selected) {
  var id = String(patientId || "");
  return (rows || []).map(function(r) {
    if (!r || String(r.id) !== id) return r;
    if (!r.hasRegistro) return Object.assign({}, r, { selected: false });
    return Object.assign({}, r, { selected: !!selected });
  });
}
function buildLabRepoBatchJobs(selectedRows) {
  return (selectedRows || []).map(function(r) {
    return {
      id: String(r.id),
      nombre: String(r.nombre || "Sin nombre"),
      registro: String(r.registro || ""),
      status: "pending"
    };
  });
}
function setLabRepoBatchJobStatus(jobs, patientId, status) {
  var id = String(patientId || "");
  return (jobs || []).map(function(j) {
    if (!j || String(j.id) !== id) return j;
    return Object.assign({}, j, { status });
  });
}
function abortPendingLabRepoBatchJobs(jobs) {
  return (jobs || []).map(function(j) {
    if (!j) return j;
    if (j.status === "pending" || j.status === "running") {
      return Object.assign({}, j, { status: "aborted" });
    }
    return j;
  });
}
function labRepoBatchJobStatusLabel(status) {
  if (status === "running") return "Consultando\u2026";
  if (status === "ok") return "Actualizado";
  if (status === "empty") return "Sin estudios";
  if (status === "error") return "Error";
  if (status === "aborted") return "Detenido";
  return "En cola";
}
function jobStatusFromFetchKind(kind) {
  if (kind === "ok") return "ok";
  if (kind === "empty") return "empty";
  if (kind === "aborted") return "aborted";
  return "error";
}
function formatLabRepoBatchSummaryToast(summary) {
  var s = summary || {};
  var parts = [];
  if (s.importedPatients) {
    parts.push(
      s.importedPatients + " paciente" + (s.importedPatients === 1 ? "" : "s") + " actualizado" + (s.importedPatients === 1 ? "" : "s")
    );
  }
  if (s.empty) {
    parts.push(s.empty + " sin estudios en el rango");
  }
  if (s.skippedNoRegistro) {
    parts.push(s.skippedNoRegistro + " sin registro");
  }
  if (s.failed) {
    parts.push(s.failed + " con error");
  }
  if (s.needsReview) {
    parts.push(s.needsReview + " para revisar");
  }
  if (s.aborted) {
    parts.push("detenido");
  }
  if (!parts.length) {
    return s.attempted ? "Sin cambios en " + s.attempted + " paciente" + (s.attempted === 1 ? "" : "s") : "Ning\xFAn paciente seleccionado";
  }
  return parts.join(" \xB7 ");
}
function classifyLabRepoBatchFetch(studies, errors) {
  if (studies && studies.length) return "ok";
  var list = errors || [];
  if (!list.length) return "empty";
  var first = String(list[0] && list[0].message || "");
  if (isConnectionError(first)) return "connection";
  if (first === "no-search-results" || first === "no-rows-in-range") return "empty";
  return "error";
}
function isConnectionError(message) {
  return /lab-repo-http-|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(
    String(message || "")
  );
}
function bedHint(p) {
  var cuarto = String(p && p.cuarto || "").trim();
  var cama = String(p && p.cama || "").trim();
  if (cuarto && cama) return cuarto + " \xB7 " + cama;
  return cuarto || cama || "";
}
function normalizeIdSet(ids) {
  var out = /* @__PURE__ */ new Set();
  if (!ids) return out;
  if (typeof ids.has === "function") {
    ids.forEach(function(id) {
      out.add(String(id));
    });
    return out;
  }
  (ids || []).forEach(function(id) {
    out.add(String(id));
  });
  return out;
}

// public/js/ui-loading-state.mjs
var CHEVRON = (function() {
  var out = [];
  for (var i = 0; i < 9; i += 1) {
    var r = Math.floor(i / 3);
    var c = i % 3;
    out.push((c + Math.abs(r - 1)) * 90);
  }
  return out;
})();
var ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
var ORBIT = (function() {
  var out = [];
  for (var i = 0; i < 9; i += 1) {
    var k = ORBIT_ORDER.indexOf(i);
    out.push(k === -1 ? null : k * 110);
  }
  return out;
})();
var PATTERNS = {
  Drive: { delays: CHEVRON, dur: 650, round: false },
  Dots: { delays: CHEVRON, dur: 650, round: true },
  Orbit: { delays: ORBIT, dur: 950, round: false }
};
function formatElapsedSeconds(totalSeconds) {
  var total = Number(totalSeconds);
  if (!Number.isFinite(total) || total < 0) total = 0;
  if (total < 60) return total.toFixed(1) + "s";
  var m = Math.floor(total / 60);
  var s = total % 60;
  return m + "m " + s.toFixed(1) + "s";
}
function resolveLoadingVariant(requested) {
  var v = requested || "Dots";
  if (v === "Drive" || v === "Orbit" || v === "Dots") return v;
  return "Dots";
}
function esc2(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildLoadingStateHtml(opts) {
  opts = opts || {};
  var label = opts.label != null ? String(opts.label) : "Procesando\u2026";
  var variant = resolveLoadingVariant(opts.variant);
  var pattern = PATTERNS[variant] || PATTERNS.Dots;
  var reduced = opts.reducedMotion === true;
  var elapsed = opts.elapsedText != null ? String(opts.elapsedText) : "0.0s";
  var cells = pattern.delays.map(function(d) {
    var round = pattern.round ? " ui-loading-cell--round" : "";
    var style = d === null || reduced ? "opacity:0.07;animation:none" : "opacity:0.15;animation:ui-pixel-on " + pattern.dur + "ms ease-in-out " + d + "ms infinite";
    return '<span class="ui-loading-cell' + round + '" style="' + style + '" aria-hidden="true"></span>';
  }).join("");
  return '<span class="ui-loading-state" data-variant="' + esc2(variant) + '" role="status" aria-live="polite"><span class="ui-loading-grid" aria-hidden="true">' + cells + '</span><span class="ui-loading-label' + (reduced ? "" : " ui-loading-label--shimmer") + '">' + esc2(label) + '</span><span class="ui-loading-elapsed">' + esc2(elapsed) + "</span></span>";
}
function mountLoadingState(host, opts) {
  if (!host) return null;
  opts = opts || {};
  var startedAt = opts.startedAt || Date.now();
  var reduced = opts.reducedMotion != null ? !!opts.reducedMotion : prefersReducedMotion();
  var state = {
    host,
    label: opts.label || "Procesando\u2026",
    variant: resolveLoadingVariant(opts.variant),
    startedAt,
    reducedMotion: reduced,
    timer: null
  };
  function paint() {
    var sec = (Date.now() - state.startedAt) / 1e3;
    host.innerHTML = buildLoadingStateHtml({
      label: state.label,
      variant: state.variant,
      reducedMotion: state.reducedMotion,
      elapsedText: formatElapsedSeconds(sec)
    });
  }
  paint();
  state.timer = setInterval(paint, 100);
  return state;
}
function destroyLoadingState(state) {
  if (!state) return;
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  if (state.host) state.host.innerHTML = "";
}

// public/js/features/lab-repo-batch-mode.mjs
function resolveActivePatientBatchRow(rt3) {
  var p = rt3 && typeof rt3.getActivePatient === "function" ? rt3.getActivePatient() : null;
  if (!p || !p.id) return null;
  var reg = String(p.registro || "").trim();
  if (!reg) return null;
  return {
    id: String(p.id),
    nombre: String(p.nombre || "Sin nombre"),
    registro: reg,
    hasRegistro: true,
    selected: true,
    hint: ""
  };
}
function resolveBatchOpenMode(teamRows, activeRow) {
  var team = Array.isArray(teamRows) ? teamRows : [];
  var withReg = team.filter(function(r) {
    return r && r.hasRegistro;
  });
  if (withReg.length >= 2) {
    return { singlePatientMode: false, rows: team };
  }
  if (activeRow && activeRow.registro) {
    return { singlePatientMode: true, rows: [activeRow] };
  }
  if (withReg.length === 1) {
    return { singlePatientMode: true, rows: [withReg[0]] };
  }
  return { singlePatientMode: false, rows: team };
}
function syncBatchModalModeUi(singlePatientMode, row) {
  var title = document.getElementById("lab-repo-batch-title");
  var hint = document.getElementById("lab-repo-batch-hint");
  var teamBlock = document.getElementById("lab-repo-batch-team-block");
  if (singlePatientMode && row) {
    if (title) title.textContent = "Actualizar labs";
    if (hint) {
      hint.textContent = (row.nombre || "Paciente") + " \xB7 Reg. " + row.registro + " \xB7 elige el rango";
    }
    if (teamBlock) teamBlock.hidden = true;
    return;
  }
  if (title) title.textContent = "Actualizar labs";
  if (hint) hint.textContent = "Mi equipo \xB7 mismo rango para todos \xB7 progreso en la barra lateral";
  if (teamBlock) teamBlock.hidden = false;
}
function activePatientMissingRegistroMessage(rt3, teamWithRegistroCount) {
  var p = rt3 && typeof rt3.getActivePatient === "function" ? rt3.getActivePatient() : null;
  if (!p || !p.id) return null;
  if (String(p.registro || "").trim()) return null;
  if (teamWithRegistroCount > 0) return null;
  return "El paciente no tiene registro para consultar el repositorio";
}

// public/js/features/platform/updater/state.mjs
var UPDATE_SNOOZE_KEY = "rplus-update-snooze-until";
var UPDATE_DISMISS_VER_KEY = "rplus-update-dismiss-version";
var UPDATE_TELEMETRY_URL = "https://example.invalid/r-plus-update";
var RELEASES_LATEST_URL = "https://github.com/mausalas99/r-mas/releases/latest";
var updaterState = {
  pendingUpdaterTargetVersion: null,
  pendingUpdaterIsPrerelease: false,
  pendingDowngradeVersion: null,
  pendingRepairUpdateCheck: false,
  /** True only after Ajustes → Buscar actualizaciones (toast if already current). */
  checkFeedback: false,
  /** @type {'upgrade' | 'downgrade'} */
  updateModalMode: "upgrade",
  minVersionGateKeydownBound: false,
  nativeRecoveryModalShown: false
};

// public/js/features/platform/updater/silent-check.mjs
var SILENT_UPDATE_CHECK_MIN_MS = 30 * 60 * 1e3;
var lastSilentCheckAt = 0;
function shouldRunSilentUpdateCheck(now, lastAt, minMs) {
  var min = minMs == null ? SILENT_UPDATE_CHECK_MIN_MS : minMs;
  if (!lastAt) return true;
  return now - lastAt >= min;
}
function updateNotAvailableToastKind(state, payload) {
  if (state && state.pendingRepairUpdateCheck || payload && payload.reinstallFailed) {
    return "repair-error";
  }
  if (state && state.checkFeedback) return "up-to-date";
  return null;
}
function shouldSurfaceUpdateCheckError(state) {
  if (!state) return false;
  if (state.checkFeedback) return true;
  if (state.pendingRepairUpdateCheck) return true;
  return state.updateModalMode === "downgrade";
}
function requestSilentUpdateCheck() {
  if (typeof window === "undefined" || !window.electronAPI) return false;
  if (typeof window.electronAPI.checkForUpdates !== "function") return false;
  var now = Date.now();
  if (!shouldRunSilentUpdateCheck(now, lastSilentCheckAt)) return false;
  lastSilentCheckAt = now;
  updaterState.checkFeedback = false;
  try {
    window.electronAPI.checkForUpdates();
    return true;
  } catch {
    return false;
  }
}

// public/js/features/lab-repo-batch-import.mjs
var batchRows = [];
var batchJobs = [];
var batchLoadingHost = null;
var batchBusy = false;
var batchAbort = false;
var batchSinglePatientMode = false;
var queueAutoDismissTimer = null;
var QUEUE_AUTO_DISMISS_MS = 1600;
function clearQueueAutoDismiss() {
  if (queueAutoDismissTimer == null) return;
  clearTimeout(queueAutoDismissTimer);
  queueAutoDismissTimer = null;
}
function scheduleQueueAutoDismiss() {
  clearQueueAutoDismiss();
  queueAutoDismissTimer = setTimeout(function() {
    queueAutoDismissTimer = null;
    if (batchBusy) return;
    batchJobs = [];
    renderSidebarQueue();
  }, QUEUE_AUTO_DISMISS_MS);
}
function teamPatients() {
  if (typeof rt2.getLabRepoBatchTeamPatients === "function") {
    return rt2.getLabRepoBatchTeamPatients() || [];
  }
  if (typeof rt2.getLabRepoBatchCensusPatients === "function") {
    return rt2.getLabRepoBatchCensusPatients() || [];
  }
  return patientsVisibleInSidebar() || [];
}
function batchConfirmLabel(selectedCount) {
  if (batchBusy) return "Actualizando\u2026";
  if (batchSinglePatientMode) return "Actualizar";
  if (selectedCount > 0) return "Actualizar \xB7 " + selectedCount;
  return "Actualizar";
}
function syncConfirmButtonLabel() {
  var btn = document.getElementById("lab-repo-batch-confirm");
  if (!btn || batchBusy) return;
  var selected = selectedLabRepoBatchRows(batchRows).length;
  btn.textContent = batchConfirmLabel(selected);
}
function renderBatchList() {
  var list = document.getElementById("lab-repo-batch-list");
  if (!list) return;
  if (!batchRows.length) {
    list.innerHTML = '<p class="lab-repo-batch-empty">No hay pacientes en tu equipo (o a\xFAn no hay asignaciones).</p>';
    return;
  }
  list.innerHTML = batchRows.map(function(r) {
    var disabled = !r.hasRegistro || batchBusy;
    var metaHtml;
    if (r.hasRegistro) {
      metaHtml = '<span class="lab-repo-batch-row-reg">Reg. ' + esc(r.registro) + "</span>" + (r.hint ? '<span class="lab-repo-batch-row-loc">' + esc(r.hint) + "</span>" : "");
    } else {
      metaHtml = '<span class="lab-repo-batch-row-warn">Sin registro \u2014 se omite</span>';
    }
    return '<label class="lab-repo-batch-row' + (r.hasRegistro ? "" : " lab-repo-batch-row--disabled") + '"><input type="checkbox" class="lab-repo-batch-check" data-patient-id="' + esc(r.id) + '"' + (r.selected ? " checked" : "") + (disabled ? " disabled" : "") + ' /><span class="lab-repo-batch-row-text"><span class="lab-repo-batch-row-name">' + esc(r.nombre) + '</span><span class="lab-repo-batch-row-meta">' + metaHtml + "</span></span></label>";
  }).join("");
}
function syncBatchCount() {
  var el = document.getElementById("lab-repo-batch-count");
  var selected = selectedLabRepoBatchRows(batchRows).length;
  var noReg = batchRows.filter(function(r) {
    return r && !r.hasRegistro;
  }).length;
  if (el) {
    var parts = [selected + " seleccionado" + (selected === 1 ? "" : "s")];
    if (noReg) parts.push(noReg + " sin registro");
    el.textContent = parts.join(" \xB7 ");
  }
  syncConfirmButtonLabel();
}
function setBatchProgress(text, visible) {
  var el = document.getElementById("lab-repo-batch-progress");
  if (!el) return;
  el.hidden = !visible;
  if (!visible) {
    destroyLoadingState(batchLoadingHost);
    batchLoadingHost = null;
    el.textContent = "";
    return;
  }
  if (!batchLoadingHost) {
    el.textContent = "";
    batchLoadingHost = mountLoadingState(el, { label: text || "Importando\u2026", variant: "Dots" });
  } else if (text) {
    batchLoadingHost.label = text;
  }
}
function jobStatusClass(status) {
  if (status === "ok") return "lab-repo-batch-job--ok";
  if (status === "empty") return "lab-repo-batch-job--empty";
  if (status === "error") return "lab-repo-batch-job--error";
  if (status === "running") return "lab-repo-batch-job--running";
  if (status === "aborted") return "lab-repo-batch-job--aborted";
  return "lab-repo-batch-job--pending";
}
function renderSidebarQueue() {
  var root = document.getElementById("lab-repo-batch-queue");
  var list = document.getElementById("lab-repo-batch-queue-list");
  var meta = document.getElementById("lab-repo-batch-queue-meta");
  var stopBtn = document.getElementById("lab-repo-batch-queue-stop");
  if (!root || !list) return;
  if (!batchJobs.length) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  var done = batchJobs.filter(function(j) {
    return j.status !== "pending" && j.status !== "running";
  }).length;
  if (meta) {
    meta.textContent = done + "/" + batchJobs.length;
  }
  if (stopBtn) {
    stopBtn.hidden = !batchBusy;
    stopBtn.disabled = !batchBusy;
  }
  list.innerHTML = batchJobs.map(function(j) {
    return '<li class="lab-repo-batch-job ' + jobStatusClass(j.status) + '"><span class="lab-repo-batch-job-name">' + esc(j.nombre) + '</span><span class="lab-repo-batch-job-status">' + esc(labRepoBatchJobStatusLabel(j.status)) + "</span></li>";
  }).join("");
}
function showSidebarQueue(jobs) {
  batchJobs = jobs || [];
  renderSidebarQueue();
}
function updateJobStatus(patientId, status) {
  batchJobs = setLabRepoBatchJobStatus(batchJobs, patientId, status);
  renderSidebarQueue();
}
function setBatchBusy(busy) {
  batchBusy = !!busy;
  var btn = document.getElementById("lab-repo-batch-confirm");
  var cancel = document.getElementById("lab-repo-batch-cancel");
  var selectAll = document.getElementById("lab-repo-batch-select-all");
  var selectActive = document.getElementById("lab-repo-batch-select-active");
  var selectNone = document.getElementById("lab-repo-batch-select-none");
  if (btn) {
    btn.disabled = busy;
    btn.setAttribute("aria-disabled", busy ? "true" : "false");
    btn.textContent = batchConfirmLabel(selectedLabRepoBatchRows(batchRows).length);
  }
  if (cancel) {
    cancel.textContent = busy ? "Detener" : "Cancelar";
  }
  if (selectAll) selectAll.disabled = busy;
  if (selectActive) selectActive.disabled = busy;
  if (selectNone) selectNone.disabled = busy;
  renderBatchList();
  renderSidebarQueue();
}
function onBatchListClick(e) {
  var t = e.target;
  if (!t || !t.classList || !t.classList.contains("lab-repo-batch-check")) return;
  if (batchBusy) return;
  var id = t.getAttribute("data-patient-id");
  batchRows = setLabRepoBatchRowSelected(batchRows, id, !!t.checked);
  syncBatchCount();
}
function wireBatchModalOnce() {
  var list = document.getElementById("lab-repo-batch-list");
  if (list && !list.dataset.wired) {
    list.dataset.wired = "1";
    list.addEventListener("change", onBatchListClick);
  }
  var dismiss = document.getElementById("lab-repo-batch-queue-dismiss");
  if (dismiss && !dismiss.dataset.wired) {
    dismiss.dataset.wired = "1";
    dismiss.addEventListener("click", dismissLabRepoBatchQueue);
  }
  var stopBtn = document.getElementById("lab-repo-batch-queue-stop");
  if (stopBtn && !stopBtn.dataset.wired) {
    stopBtn.dataset.wired = "1";
    stopBtn.addEventListener("click", function() {
      if (!batchBusy) return;
      batchAbort = true;
      rt2.showToast("Deteniendo actualizaci\xF3n\u2026", "info");
    });
  }
}
function registerLabRepoBatchImportRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}
function dismissLabRepoBatchQueue() {
  if (batchBusy) {
    rt2.showToast("Espera a que termine o pulsa Detener", "info");
    return;
  }
  clearQueueAutoDismiss();
  batchJobs = [];
  renderSidebarQueue();
}
function openLabRepoBatchModal() {
  var modal = document.getElementById("lab-repo-batch-modal");
  if (!modal) return;
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    rt2.showToast("Actualizaci\xF3n masiva solo en la app de escritorio", "warn");
    return;
  }
  requestSilentUpdateCheck();
  if (batchBusy) {
    rt2.showToast("Ya hay una actualizaci\xF3n en curso \u2014 mira la cola en la barra lateral", "info");
    return;
  }
  wireBatchModalOnce();
  batchAbort = false;
  var teamRows = buildLabRepoBatchRows(teamPatients(), { defaultSelectWithRegistro: true });
  var teamWithReg = teamRows.filter(function(r) {
    return r && r.hasRegistro;
  }).length;
  var missingReg = activePatientMissingRegistroMessage(rt2, teamWithReg);
  if (missingReg) {
    rt2.showToast(missingReg, "error");
    return;
  }
  var range = labRepoDefaultDateRange();
  var desdeEl = document.getElementById("lab-repo-batch-desde");
  var hastaEl = document.getElementById("lab-repo-batch-hasta");
  refreshRpcDateFields(modal);
  if (desdeEl && hastaEl) {
    desdeEl.value = labRepoToDateInputValue(range.desde);
    hastaEl.value = labRepoToDateInputValue(range.hasta);
    syncLabRepoDateField(desdeEl);
    syncLabRepoDateField(hastaEl);
  }
  var mode = resolveBatchOpenMode(teamRows, resolveActivePatientBatchRow(rt2));
  batchSinglePatientMode = mode.singlePatientMode;
  batchRows = mode.rows;
  setBatchProgress("", false);
  setBatchBusy(false);
  syncBatchModalModeUi(batchSinglePatientMode, batchRows[0]);
  if (!batchSinglePatientMode) {
    renderBatchList();
    syncBatchCount();
  }
  modal.hidden = false;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closeLabRepoBatchModal() {
  if (batchBusy) {
    batchAbort = true;
    rt2.showToast("Deteniendo actualizaci\xF3n\u2026", "info");
    return;
  }
  hideBatchModal();
}
function hideBatchModal() {
  var modal = document.getElementById("lab-repo-batch-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modal.hidden = true;
  setBatchProgress("", false);
}
function labRepoBatchSelectAll() {
  if (batchBusy) return;
  batchRows = setAllSelectableLabRepoBatchRows(batchRows, true);
  renderBatchList();
  syncBatchCount();
}
function labRepoBatchSelectActive() {
  if (batchBusy) return;
  var activeId = typeof rt2.getActiveId === "function" ? String(rt2.getActiveId() || "") : "";
  batchRows = selectOnlyActiveLabRepoBatchRows(batchRows, activeId);
  renderBatchList();
  syncBatchCount();
}
function labRepoBatchSelectNone() {
  if (batchBusy) return;
  batchRows = setAllSelectableLabRepoBatchRows(batchRows, false);
  renderBatchList();
  syncBatchCount();
}
function readBatchDateRange() {
  var desdeEl = document.getElementById("lab-repo-batch-desde");
  var hastaEl = document.getElementById("lab-repo-batch-hasta");
  if (!desdeEl || !hastaEl) return null;
  return labRepoFetchRangeFromDateInputs(desdeEl.value, hastaEl.value);
}
function validateBatchImportStart() {
  if (batchBusy) return null;
  var selected = selectedLabRepoBatchRows(batchRows);
  if (!selected.length) {
    rt2.showToast("Selecciona al menos un paciente con registro", "error");
    return null;
  }
  var range = readBatchDateRange();
  if (!range) {
    rt2.showToast("Revisa el rango de fechas (Desde no puede ser posterior a Hasta)", "error");
    return null;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    rt2.showToast("Actualizaci\xF3n masiva solo en la app de escritorio", "warn");
    return null;
  }
  return { selected, range };
}
function applyFetchKindToTotals(kind, studies, errors, totals, row) {
  if (kind === "connection") {
    totals.failed += 1;
    rt2.showToast("No se pudo conectar al repositorio de laboratorio (revisa red hospital)", "error");
    batchAbort = true;
    return;
  }
  if (kind === "empty") {
    totals.empty += 1;
    return;
  }
  if (kind === "error") {
    totals.failed += 1;
    return;
  }
  totals.groups.push({ row, studies: studies || [], errors: errors || [] });
}
async function fetchOneBatchPatient(row, range) {
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro: row.registro,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString()
    });
    var studies = res && res.studies || [];
    var errors = res && res.errors || [];
    return {
      kind: classifyLabRepoBatchFetch(studies, errors),
      studies,
      errors
    };
  } catch (_unused) {
    void _unused;
    return { kind: "throw", studies: [], errors: [] };
  }
}
async function runBatchFetches(selected, range) {
  var totals = { groups: [], empty: 0, failed: 0 };
  for (var i = 0; i < selected.length; i++) {
    if (batchAbort) break;
    var row = selected[i];
    updateJobStatus(row.id, "running");
    setBatchProgress(
      "Consultando " + row.nombre + " (" + (i + 1) + "/" + selected.length + ")\u2026",
      true
    );
    var one = await fetchOneBatchPatient(row, range);
    if (one.kind === "throw") {
      totals.failed += 1;
      updateJobStatus(row.id, "error");
      rt2.showToast("Error al consultar el repositorio", "error");
      batchAbort = true;
      break;
    }
    updateJobStatus(row.id, jobStatusFromFetchKind(one.kind));
    applyFetchKindToTotals(one.kind, one.studies, one.errors, totals, row);
  }
  if (batchAbort) {
    batchJobs = abortPendingLabRepoBatchJobs(batchJobs);
    renderSidebarQueue();
  }
  return totals;
}
function finishBatchRun(selected, totals, applied) {
  var skippedNoRegistro = batchRows.filter(function(r) {
    return r && !r.hasRegistro;
  }).length;
  var summary = formatLabRepoBatchSummaryToast({
    attempted: selected.length,
    importedPatients: applied.importedPatients,
    empty: totals.empty,
    skippedNoRegistro,
    failed: totals.failed,
    needsReview: applied.needsReview ? 1 : 0,
    aborted: batchAbort
  });
  rt2.showToast(summary, totals.failed || batchAbort ? "warn" : "ok");
}
async function confirmLabRepoBatchImport() {
  var start = validateBatchImportStart();
  if (!start) return;
  clearQueueAutoDismiss();
  batchAbort = false;
  showSidebarQueue(buildLabRepoBatchJobs(start.selected));
  hideBatchModal();
  setBatchBusy(true);
  try {
    var totals = await runBatchFetches(start.selected, start.range);
    var applied = { needsReview: false, importedPatients: 0 };
    if (totals.groups.length) {
      setBatchProgress("Procesando resultados\u2026", true);
      applied = applyBatchStudyGroups(totals.groups, rt2);
    }
    finishBatchRun(start.selected, totals, applied);
  } finally {
    batchBusy = false;
    batchAbort = false;
    setBatchBusy(false);
    setBatchProgress("", false);
    renderSidebarQueue();
    scheduleQueueAutoDismiss();
  }
}

// public/js/labs-manual-catalog.mjs
function f(key, label, mode) {
  return { key, label, mode: mode || "num" };
}
var CORE_MANUAL_TYPES = [
  {
    sectionKey: "BH",
    label: "Biometr\xEDa (BH)",
    fields: [
      f("Hb", "Hb"),
      f("Hto", "Hto"),
      f("RBC", "RBC"),
      f("VCM", "VCM"),
      f("HCM", "HCM"),
      f("CHCM", "CHCM"),
      f("RDW", "RDW"),
      f("Leu", "Leu"),
      f("Neu", "Neu"),
      f("NeuPct", "Neu %"),
      f("Lin", "Lin"),
      f("LinPct", "Lin %"),
      f("Mono", "Mono"),
      f("MonoPct", "Mono %"),
      f("Eos", "Eos"),
      f("EosPct", "Eos %"),
      f("Baso", "Baso"),
      f("BasoPct", "Baso %"),
      f("Plt", "Plt"),
      f("MPV", "MPV"),
      f("Ret", "Ret"),
      f("Bandas", "Bandas"),
      f("Blastos", "Blastos")
    ]
  },
  {
    sectionKey: "QS",
    label: "Qu\xEDmica (QS)",
    fields: [
      f("Glu", "Glu"),
      f("BUN", "BUN"),
      f("Cr", "Cr"),
      f("eTFG", "eTFG"),
      f("AU", "AU"),
      f("PCR", "PCR"),
      f("PCT", "PCT"),
      f("COL", "COL"),
      f("HDL", "HDL"),
      f("LDL", "LDL"),
      f("VLDL", "VLDL"),
      f("TGL", "TGL"),
      f("VSG", "VSG"),
      f("CPK", "CPK")
    ]
  },
  {
    sectionKey: "ESC",
    label: "Electrolitos (ESC)",
    fields: [f("Na", "Na"), f("Cl", "Cl"), f("K", "K"), f("Ca", "Ca"), f("F", "F\xF3sforo"), f("Mg", "Mg")]
  },
  {
    sectionKey: "PFHs",
    label: "PFH",
    fields: [
      f("Alb", "Alb"),
      f("AST", "AST"),
      f("ALT", "ALT"),
      f("FA", "FA"),
      f("GGT", "GGT"),
      f("Prot", "Prot"),
      f("BT", "BT"),
      f("BD", "BD"),
      f("BI", "BI"),
      f("LDH", "LDH"),
      f("Amil", "Amilasa")
    ]
  },
  {
    sectionKey: "GASES",
    label: "Gasometr\xEDa",
    fields: [
      f("pH", "pH"),
      f("pCO2", "pCO\u2082"),
      f("pO2", "pO\u2082"),
      f("Bica", "HCO\u2083"),
      f("Lactato", "Lactato"),
      f("Na", "Na"),
      f("K", "K"),
      f("GLU", "Glu"),
      f("Hto", "Hto"),
      f("iCa", "iCa")
    ]
  },
  {
    sectionKey: "COAG",
    label: "Coagulaci\xF3n",
    fields: [f("TP", "TP"), f("TTP", "TTP"), f("INR", "INR"), f("Fib", "Fibrin\xF3geno"), f("DD", "D\xEDmero D")]
  },
  {
    sectionKey: "EGO",
    label: "EGO",
    fields: [
      f("pH", "pH"),
      f("Dens", "Densidad"),
      f("Prot", "Prot"),
      f("Glu", "Glu"),
      f("Cet", "Cetonas", "qual"),
      f("Bili", "Bilirrubina", "qual"),
      f("Nitr", "Nitritos", "qual"),
      f("EstLeu", "Est. leucocitaria", "qual"),
      f("Leu", "Leu"),
      f("Eri", "Eri"),
      f("Color", "Color", "qual"),
      f("Asp", "Aspecto", "qual")
    ]
  },
  {
    sectionKey: "TROP",
    label: "Troponina",
    fields: [f("Trop", "Troponina"), f("TropHs", "Troponina hs")]
  },
  {
    sectionKey: "LIPASA",
    label: "Lipasa",
    fields: [f("Lip", "Lipasa")]
  }
];
var EXTENDED_LABELS = {
  TIR: "Tiroides",
  ENDO: "Endocrino",
  CARD: "Card\xEDaco",
  FE: "Hierro",
  INFL: "Inflamatorio",
  INM: "Inmunidad",
  META: "Metab\xF3lico",
  NEF: "Nefro",
  NIVEL: "Niveles f\xE1rmaco",
  TM: "Marcadores tumorales",
  NUT: "Nutricional",
  GI: "GI",
  TOX: "Toxicolog\xEDa",
  HEPB: "Hepatitis B",
  VIRAL: "Serolog\xEDa viral",
  FEB: "Febriles",
  MICRO: "Micro / Ag r\xE1pidos"
};
function fieldsFromPanelDef(def) {
  var mode = def.mode === "qual" ? "qual" : "num";
  return (def.fields || []).map(function(fld) {
    return f(fld.key, fld.key, mode);
  });
}
function buildExtendedManualTypes() {
  var byKey = /* @__PURE__ */ Object.create(null);
  LAB_EXTENDED_PANEL_DEFS.forEach(function(def) {
    var key = def.sectionKey;
    if (!byKey[key]) {
      byKey[key] = {
        sectionKey: key,
        label: EXTENDED_LABELS[key] || key,
        fields: []
      };
    }
    var existing = /* @__PURE__ */ Object.create(null);
    byKey[key].fields.forEach(function(x) {
      existing[x.key] = 1;
    });
    fieldsFromPanelDef(def).forEach(function(fld) {
      if (existing[fld.key]) return;
      existing[fld.key] = 1;
      byKey[key].fields.push(fld);
    });
  });
  return Object.keys(byKey).map(function(k) {
    return byKey[k];
  });
}
var _cachedTypes = null;
function listManualLabTypes() {
  if (!_cachedTypes) {
    _cachedTypes = CORE_MANUAL_TYPES.concat(buildExtendedManualTypes());
  }
  return _cachedTypes;
}
function getManualLabType(sectionKey) {
  var key = String(sectionKey || "").trim();
  if (!key) return null;
  var types = listManualLabTypes();
  for (var i = 0; i < types.length; i++) {
    if (types[i].sectionKey === key) return types[i];
  }
  var upper = key.toUpperCase();
  for (var j = 0; j < types.length; j++) {
    if (types[j].sectionKey.toUpperCase() === upper) return types[j];
  }
  return null;
}
function fieldsForManualLabType(sectionKey) {
  var t = getManualLabType(sectionKey);
  return t ? t.fields.slice() : [];
}

// public/js/labs-manual-synthesize.mjs
function normalizeManualLabValue(raw, mode) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return "";
  if (mode === "qual") {
    return s.replace(/\s+/g, "_");
  }
  var n = s.replace(",", ".");
  var star = n.endsWith("*");
  var body = star ? n.slice(0, -1).trim() : n;
  if (/^-?\d+(?:\.\d+)?%?$/.test(body)) {
    return star ? body + "*" : body;
  }
  return s;
}
function synthesizeManualResLab(sectionKey, valuesByKey) {
  var type = getManualLabType(sectionKey);
  if (!type) return "";
  var fields = fieldsForManualLabType(sectionKey);
  var parts = [];
  var vals = valuesByKey && typeof valuesByKey === "object" ? valuesByKey : {};
  for (var i = 0; i < fields.length; i++) {
    var fld = fields[i];
    var norm = normalizeManualLabValue(vals[fld.key], fld.mode);
    if (!norm) continue;
    parts.push(fld.key, norm);
  }
  if (!parts.length) return "";
  return type.sectionKey + "	" + parts.join(" ");
}
function synthesizeManualResLabs(sectionKey, valuesByKey) {
  var chunk = synthesizeManualResLab(sectionKey, valuesByKey);
  return chunk ? [chunk] : [];
}

// public/js/features/lab-manual-entry.mjs
function toDateInputValue(d) {
  var pad = function(n) {
    return String(n).padStart(2, "0");
  };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function fechaFromDateInput(isoDay) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDay || "").trim());
  if (!m) return "";
  return m[3] + "/" + m[2] + "/" + m[1];
}
function getActivePatient2() {
  return typeof rt2.getActivePatient === "function" ? rt2.getActivePatient() : null;
}
function getActiveId() {
  return typeof rt2.getActiveId === "function" ? rt2.getActiveId() : null;
}
function selectedSectionKey() {
  var sel = document.getElementById("lab-manual-type");
  return sel ? String(sel.value || "").trim() : "";
}
function fillTypeSelect() {
  var sel = document.getElementById("lab-manual-type");
  if (!sel) return;
  var types = listManualLabTypes();
  var prev = sel.value;
  sel.innerHTML = types.map(function(t) {
    var label = String(t.label || t.sectionKey);
    var key = String(t.sectionKey || "");
    if (key && label.indexOf("(" + key + ")") === -1) {
      label = label + " (" + key + ")";
    }
    return '<option value="' + esc(t.sectionKey) + '">' + esc(label) + "</option>";
  }).join("");
  if (prev && getManualLabType(prev)) sel.value = prev;
  else if (types.length) sel.value = types[0].sectionKey;
}
function renderFieldGrid() {
  var host = document.getElementById("lab-manual-fields");
  if (!host) return;
  var key = selectedSectionKey();
  var fields = fieldsForManualLabType(key);
  if (!fields.length) {
    host.innerHTML = '<p class="lab-manual-empty">Sin campos para este tipo.</p>';
    return;
  }
  host.innerHTML = fields.map(function(fld) {
    var inputType = fld.mode === "qual" ? "text" : "text";
    var inputMode = fld.mode === "num" ? " decimal" : "";
    return '<label class="lab-manual-field"><span class="lab-manual-field-label">' + esc(fld.label) + '</span><input type="' + inputType + '" class="profile-input lab-manual-field-input" data-field-key="' + esc(fld.key) + '" data-field-mode="' + esc(fld.mode) + '" autocomplete="off" spellcheck="false"' + (inputMode ? ' inputmode="decimal"' : "") + " /></label>";
  }).join("");
}
function readValuesFromGrid() {
  var host = document.getElementById("lab-manual-fields");
  var out = /* @__PURE__ */ Object.create(null);
  if (!host) return out;
  host.querySelectorAll(".lab-manual-field-input").forEach(function(el) {
    if (!(el instanceof HTMLInputElement)) return;
    var k = el.getAttribute("data-field-key");
    if (!k) return;
    out[k] = el.value;
  });
  return out;
}
function syncModalChrome() {
  var patient = getActivePatient2();
  var meta = document.getElementById("lab-manual-patient-meta");
  if (meta) {
    meta.textContent = patient ? String(patient.nombre || "Sin nombre") + (patient.registro ? " \xB7 Reg. " + String(patient.registro) : "") : "";
  }
}
function registerLabManualEntryRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}
function openLabManualEntryModal() {
  var modal = document.getElementById("lab-manual-entry-modal");
  if (!modal) return;
  var patientId = getActiveId();
  var patient = getActivePatient2();
  if (!patientId || !patient) {
    rt2.showToast("Selecciona un paciente para agregar labs externos", "error");
    return;
  }
  fillTypeSelect();
  renderFieldGrid();
  syncModalChrome();
  var fechaEl = document.getElementById("lab-manual-fecha");
  var horaEl = document.getElementById("lab-manual-hora");
  refreshRpcDateFields(modal);
  if (fechaEl) {
    fechaEl.value = toDateInputValue(/* @__PURE__ */ new Date());
    fechaEl.dispatchEvent(new Event("rpc-date-refresh"));
  }
  if (horaEl) horaEl.value = "";
  var typeSel = document.getElementById("lab-manual-type");
  if (typeSel && !typeSel.dataset.wired) {
    typeSel.dataset.wired = "1";
    typeSel.addEventListener("change", renderFieldGrid);
  }
  modal.hidden = false;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  if (typeSel) typeSel.focus();
}
function closeLabManualEntryModal() {
  var modal = document.getElementById("lab-manual-entry-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modal.hidden = true;
}
function confirmLabManualEntry() {
  var patientId = getActiveId();
  if (!patientId) {
    rt2.showToast("Selecciona un paciente", "error");
    return;
  }
  var sectionKey = selectedSectionKey();
  if (!getManualLabType(sectionKey)) {
    rt2.showToast("Elige un tipo de estudio", "error");
    return;
  }
  var fechaEl = document.getElementById("lab-manual-fecha");
  var horaEl = document.getElementById("lab-manual-hora");
  var fecha = fechaFromDateInput(fechaEl && fechaEl.value);
  if (!fecha) {
    rt2.showToast("Indica la fecha del estudio", "error");
    return;
  }
  var hora = horaEl ? String(horaEl.value || "").trim() : "";
  var resLabs = synthesizeManualResLabs(sectionKey, readValuesFromGrid());
  if (!resLabs.length) {
    rt2.showToast("Llena al menos un valor", "error");
    return;
  }
  if (typeof rt2.pushUndoSnapshot === "function") {
    rt2.pushUndoSnapshot("Labs externos (" + sectionKey + ")");
  }
  var set = pushExternalLabHistory(patientId, {
    resLabs,
    fecha,
    hora,
    sectionKey
  });
  if (!set) {
    rt2.showToast("No se pudo guardar el estudio", "error");
    return;
  }
  finalizeLabHistoryImport(patientId);
  persistClinicalState({ immediate: true });
  setLabHistorySelectedSetId(patientId, set.id);
  loadLabHistorySetIntoOutput(set.id, { silent: true });
  renderLabHistoryPanel();
  if (typeof rt2.refreshTendenciasOrCultivosPanel === "function") {
    rt2.refreshTendenciasOrCultivosPanel();
  }
  if (typeof rt2.ensureParsedLabHistory === "function") {
    rt2.ensureParsedLabHistory(patientId);
  }
  closeLabManualEntryModal();
  rt2.showToast("Lab externo guardado \xB7 " + sectionKey + " \u2713", "success");
}

// public/js/features/lab-panel.mjs
var activeLab = null;
labPanelBridge.getActiveLab = function() {
  return activeLab;
};
labPanelBridge.setActiveLab = function(next) {
  activeLab = next;
};
labPanelBridge.renderOutput = renderOutput;
labPanelBridge.syncLabOutputChrome = syncLabOutputChrome;
labPanelBridge.renderLabHistoryPanel = renderLabHistoryPanel;
function registerLabPanelRuntime2(ctx) {
  registerLabPanelRuntime(ctx);
  registerLabRepoImportRuntime(ctx);
  registerLabRepoBatchImportRuntime(ctx);
  registerLabManualEntryRuntime(ctx);
}
function getActiveLab() {
  return activeLab;
}
function setActiveLab(next) {
  activeLab = next;
}
function rerenderParsedLabOutputAfterPrefsChange() {
  if (activeLab && activeLab.resLabs && activeLab.resLabs.length) renderOutput(activeLab);
}
function safeAttrJsString(s) {
  return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
var labCopyFabBound = false;
function isLabAppTabActive() {
  if (typeof rt2.getActiveAppTab !== "function") return false;
  var tab = rt2.getActiveAppTab();
  return tab === "lab" || tab === "lan";
}
function hideEaCopyFabDom() {
  var fab = document.getElementById("ea-copy-fab");
  if (!fab) return;
  fab.setAttribute("hidden", "");
  fab.style.display = "none";
  fab.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("ea-copy-fab-active");
}
function ensureLabCopyFabController() {
  var fab = document.getElementById("lab-copy-fab");
  if (!fab || labCopyFabBound) return;
  labCopyFabBound = true;
  if (fab.parentElement !== document.body) document.body.appendChild(fab);
  fab.removeAttribute("onclick");
  fab.addEventListener(
    "mousedown",
    function(e) {
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
  fab.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (fab.hidden) return;
    copiarLabsAlPortapapeles();
  });
}
function syncLabCopyFab(show) {
  ensureLabCopyFabController();
  var visible = !!show && isLabAppTabActive();
  if (visible) hideEaCopyFabDom();
  var fab = document.getElementById("lab-copy-fab");
  if (fab) {
    if (visible) {
      fab.removeAttribute("hidden");
      fab.style.display = "flex";
      fab.setAttribute("aria-hidden", "false");
    } else {
      fab.setAttribute("hidden", "");
      fab.style.display = "none";
      fab.setAttribute("aria-hidden", "true");
    }
  }
  document.documentElement.classList.toggle("lab-copy-fab-active", visible);
}
function labOutputHasCopyableContent() {
  var sec = document.getElementById("lab-output-section");
  return !!(sec && sec.style.display !== "none" && activeLab && activeLab.resLabs && activeLab.resLabs.length);
}
registerLabSomeTablesModalRuntime({
  showToast: function(msg, kind) {
    rt2.showToast(msg, kind);
  },
  getParsed: function() {
    return activeLab && activeLab.someTablesParsed ? activeLab.someTablesParsed : null;
  },
  isPaseMode,
  syncLabCopyFab,
  syncLabOutputChrome: function() {
    syncLabOutputChrome();
  }
});
function syncLabOutputChrome() {
  var sec = document.getElementById("lab-output-section");
  var outputVisible = !!(sec && sec.style.display !== "none");
  if (isPaseMode()) {
    syncLabCopyFab(false);
    syncLabSomeTablesBtn(false);
    closeLabSomeTablesModal();
    return;
  }
  var show = outputVisible && isLabAppTabActive();
  syncLabCopyFab(show);
  syncLabSomeTablesBtn(show);
}
function closeLabHistoryMoreMenu() {
  document.querySelectorAll(".lab-history-more[open], .lab-output-more[open]").forEach(function(d) {
    d.removeAttribute("open");
  });
}
function clearLabWorkbenchMinimalDom() {
  var b = document.getElementById("lab-banner");
  if (b) b.style.display = "none";
  var sec = document.getElementById("lab-output-section");
  if (sec) sec.style.display = "none";
  var box = document.getElementById("lab-output-box");
  if (box) box.innerHTML = "";
  var ta = document.getElementById("lab-input");
  if (ta) ta.value = "";
  syncLabOutputChrome();
}
var windowHandlers = {
  procesarReporte,
  clearLabInputAfterSuccessfulParse,
  limpiarReporte,
  replayLabHistorySet,
  reprocessLabHistorySet,
  deleteLabHistorySet,
  deleteAllLabHistorySets,
  toggleLabHistoryPanel,
  syncLabHistoryCollapseUI,
  setLabHistoryPanelCollapsed,
  labHistoryPanelIsCollapsed,
  copiarLabsAlPortapapeles,
  openLabSomeTablesModal,
  closeLabSomeTablesModal,
  closeLabHistoryMoreMenu,
  openLabPatientPicker,
  openLabHistoryDedupeReview,
  expandLabHistoryList,
  consolidateLabHistoryByDayAndTipo,
  insertLabPatientSeparator,
  onLabHistoryDateChange,
  stepLabHistoryDay,
  reprocessSelectedLabHistorySet,
  deleteSelectedLabHistorySet,
  openLabRepoImportModal,
  closeLabRepoImportModal,
  confirmLabRepoImport,
  openLabRepoBatchModal,
  closeLabRepoBatchModal,
  confirmLabRepoBatchImport,
  labRepoBatchSelectAll,
  labRepoBatchSelectActive,
  labRepoBatchSelectNone,
  dismissLabRepoBatchQueue,
  openLabManualEntryModal,
  closeLabManualEntryModal,
  confirmLabManualEntry,
  toggleLabMobileSyncDiag,
  copyLabMobileSyncDiag,
  forceLabMobileSyncPull
};

export {
  writeLastSelectedPatientId,
  getPatientSearchFilter,
  setPatientSearchFilter,
  patientMatchesSearch,
  patientsVisibleInSidebar,
  pickDefaultVisiblePatientId,
  ensureActivePatientInSidebarScope,
  reselectIfActivePatientHidden,
  filterPatientsForGuardiaCensus2 as filterPatientsForGuardiaCensus,
  syncClinicalCensusFiltersChrome,
  togglePatientCensusFilters,
  syncClinicalCensusFiltersBar,
  buildLabRepoBulkText,
  labRepoDefaultDateRange,
  labRepoToDateInputValue,
  labRepoFetchRangeFromDateInputs,
  closeLabRepoImportModal,
  classifyLabRepoBatchFetch,
  applyBatchStudyGroups,
  UPDATE_SNOOZE_KEY,
  UPDATE_DISMISS_VER_KEY,
  UPDATE_TELEMETRY_URL,
  RELEASES_LATEST_URL,
  updaterState,
  updateNotAvailableToastKind,
  shouldSurfaceUpdateCheckError,
  requestSilentUpdateCheck,
  registerLabPanelRuntime2 as registerLabPanelRuntime,
  getActiveLab,
  setActiveLab,
  rerenderParsedLabOutputAfterPrefsChange,
  safeAttrJsString,
  syncLabCopyFab,
  labOutputHasCopyableContent,
  syncLabOutputChrome,
  closeLabHistoryMoreMenu,
  clearLabWorkbenchMinimalDom,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-5DAE7PK3.js.map
