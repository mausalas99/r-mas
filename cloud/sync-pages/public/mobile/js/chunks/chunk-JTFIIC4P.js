import {
  rt
} from "/mobile/js/chunks/chunk-RMUFSCXL.js";
import {
  shouldApplyMobileLabHistoryWindow
} from "/mobile/js/chunks/chunk-YVT3SP6T.js";
import {
  filterLabHistorySetsForMobileReference
} from "/mobile/js/chunks/chunk-N3UTXQGG.js";
import {
  buildDayOutputPayload,
  buildLabHistoryDayOptionsHtml,
  daySelectValue,
  filterOutDaySets,
  findDayForHistoryRef,
  resolveSelectedDayKey
} from "/mobile/js/chunks/chunk-PLO52CII.js";
import {
  dedupeConsolidatedLabRows
} from "/mobile/js/chunks/chunk-WEOKZTSW.js";
import {
  procesarLabs,
  refreshCitoquimicoInterpretacionInResLabs_,
  resLabsHasCitoquimFluid_,
  sanitizeResLabsChunks
} from "/mobile/js/chunks/chunk-7XJNQXQX.js";
import {
  isMobileWeb,
  syncMobileLabReferenceChrome
} from "/mobile/js/chunks/chunk-VAFCBXBV.js";
import {
  openConfirm
} from "/mobile/js/chunks/chunk-EASTAY6S.js";
import {
  getLabHistory,
  getPatients,
  persistClinicalState
} from "/mobile/js/chunks/chunk-MLLRKYO6.js";
import {
  normalizeLabHistoryPatientSets
} from "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import {
  bumpLabHistoryRevision,
  collectPriorRefsFromHistory,
  getLabHistoryRevision,
  mergeGasRefs_,
  reprocessLabResultLines_,
  sortLabHistoryChronological,
  stripDuplicateLabSets
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/lab-history-exact-prune.mjs
function applyExactLabHistoryDedupe(patientId) {
  if (!patientId) return [];
  var hist = getLabHistory();
  var sets = hist[patientId];
  if (!sets || sets.length < 2) return [];
  var result = stripDuplicateLabSets(sets);
  if (!result.removedIds.length) return [];
  if (result.sets.length) hist[patientId] = result.sets;
  else delete hist[patientId];
  bumpLabHistoryRevision(patientId);
  return result.removedIds;
}

// public/js/features/lab-panel-bridge.mjs
var labPanelBridge = {
  getActiveLab() {
    return null;
  },
  setActiveLab(_next) {
  },
  renderOutput(_result, _opts) {
  },
  syncLabOutputChrome() {
  },
  renderLabHistoryPanel() {
  }
};

// public/js/features/lab-panel-history-same-day.mjs
function buildSameDaySerumContext(patientId, targetSet) {
  if (!patientId || !targetSet) return {};
  var dk = rt.dayKeyFromLabSet(targetSet);
  if (!dk || dk === "unknown" || dk === "Anterior") return {};
  var sets = getLabHistory()[patientId] || [];
  var extraSourceTexts = [];
  var extraResLabs = [];
  sets.forEach(function(other) {
    if (!other || String(other.id) === String(targetSet.id)) return;
    if (rt.dayKeyFromLabSet(other) !== dk) return;
    if (rt.primaryTipoForLabSet(other.resLabs || []) === "cultivo") return;
    var src = String(other.sourceText || "").trim();
    if (src) extraSourceTexts.push(src);
    if (other.resLabs && other.resLabs.length) extraResLabs.push(other.resLabs);
  });
  return { extraSourceTexts, extraResLabs };
}
function refreshSameDayAscitisForPatient(patientId, triggerSetId) {
  if (!patientId) return false;
  var sets = getLabHistory()[patientId];
  if (!Array.isArray(sets) || !sets.length) return false;
  var trigger = triggerSetId != null ? sets.find(function(s) {
    return s && String(s.id) === String(triggerSetId);
  }) : null;
  var dayKeys = /* @__PURE__ */ Object.create(null);
  if (trigger) {
    var tdk = rt.dayKeyFromLabSet(trigger);
    if (tdk && tdk !== "unknown" && tdk !== "Anterior") dayKeys[tdk] = true;
  } else {
    sets.forEach(function(s) {
      var dk = rt.dayKeyFromLabSet(s);
      if (dk && dk !== "unknown" && dk !== "Anterior") dayKeys[dk] = true;
    });
  }
  var changed = false;
  Object.keys(dayKeys).forEach(function(dk) {
    sets.forEach(function(set) {
      if (!set || rt.dayKeyFromLabSet(set) !== dk) return;
      var src = String(set.sourceText || "").trim();
      var hasCitoquim = resLabsHasCitoquimFluid_(set.resLabs) || src && /\bCITOQUIMICO\b/i.test(src);
      if (!hasCitoquim) return;
      var ctx = buildSameDaySerumContext(patientId, set);
      var next = refreshCitoquimicoInterpretacionInResLabs_(set.resLabs || [], src, ctx);
      var prevStr = "";
      var nextStr = "";
      try {
        prevStr = JSON.stringify(set.resLabs || []);
        nextStr = JSON.stringify(next);
      } catch {
        set.resLabs = next;
        changed = true;
        return;
      }
      if (prevStr !== nextStr) {
        set.resLabs = next;
        set.parsed = rt.extractParsedValues(next);
        set.parsedBySection = rt.buildParsedBySectionFromResLabs(next, set.bhExtras);
        delete set._parseFingerprint;
        changed = true;
      }
    });
  });
  return changed;
}

// public/js/lab-history-day-nav.mjs
function groupLabHistoryByDay(hist) {
  var days = [];
  var byKey = /* @__PURE__ */ Object.create(null);
  (hist || []).forEach(function(set, idx) {
    var key = String(set && set.fecha || "Anterior");
    if (!byKey[key]) {
      byKey[key] = { dayKey: key, rows: [] };
      days.push(byKey[key]);
    }
    byKey[key].rows.push({ set, idx });
  });
  return days;
}
function findLabHistoryDayIndexForSet(days, idFn, setId) {
  for (var i = 0; i < days.length; i++) {
    var found = days[i].rows.some(function(row) {
      return idFn(row.set, row.idx) === setId;
    });
    if (found) return i;
  }
  return days.length ? days.length - 1 : -1;
}
function labHistoryDayArrowDelta(key) {
  if (key === "ArrowLeft") return 1;
  if (key === "ArrowRight") return -1;
  return 0;
}
function canHandleLabHistoryDayArrow(opts) {
  var o = opts || {};
  if (o.modifier || o.typing || !o.labTabVisible || !o.hasDayPicker) return false;
  return labHistoryDayArrowDelta(o.key) !== 0;
}
function stepLabHistoryDayIndex(days, currentIndex, delta) {
  if (!days || !days.length) return -1;
  var next = currentIndex + delta;
  if (next < 0) return 0;
  if (next > days.length - 1) return days.length - 1;
  return next;
}
function latestSetIdInLabHistoryDay(day, idFn) {
  if (!day || !day.rows.length) return "";
  return idFn(day.rows[0].set, day.rows[0].idx);
}

// public/js/features/lab-panel-history.mjs
function setLabHistoryPanelCollapsed() {
}
function syncLabHistoryCollapseUI() {
}
function labHistoryPanelIsCollapsed() {
  return false;
}
function toggleLabHistoryPanel() {
}
function findLabHistorySetByRef(sets, setId) {
  var sid = String(setId == null ? "" : setId);
  if (sid.indexOf("__idx_") === 0) {
    var idx = parseInt(sid.slice(6), 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < sets.length) return sets[idx];
    return null;
  }
  return sets.find(function(s) {
    return String(s.id) === sid;
  }) || null;
}
function dedupeConsolidatedRowsBySection(rows, tipo) {
  return dedupeConsolidatedLabRows(rows, tipo);
}
var _labHistorySelectedSetId = /* @__PURE__ */ Object.create(null);
var _labHistoryDateSelectCacheKey = "";
function expandLabHistoryList() {
}
function labSetIdForHistory(set, idx) {
  return set.id != null && String(set.id).trim() !== "" ? String(set.id) : "__idx_" + idx;
}
function getActivePatientLabHistory() {
  var pid = rt.getActiveId();
  if (!pid) return [];
  if (applyExactLabHistoryDedupe(pid).length) persistClinicalState();
  var hist = sortLabHistoryChronological(
    rt.ensureParsedLabHistoryCached ? rt.ensureParsedLabHistoryCached(pid) : rt.ensureParsedLabHistory(pid, { readOnly: true })
  );
  if (shouldApplyMobileLabHistoryWindow()) {
    return filterLabHistorySetsForMobileReference(hist);
  }
  return hist;
}
function mobileLabReferenceMode() {
  return isMobileWeb();
}
function setLabOutputHistoryHint(hintEl, message, opts) {
  if (!hintEl) return;
  var mobile = opts && opts.mobileReference;
  hintEl.style.display = "block";
  if (mobile) {
    hintEl.className = "lab-history-hint lab-mobile-reference-empty";
    hintEl.innerHTML = '<span class="lab-mobile-reference-empty-title">Estudios recientes</span><span class="lab-mobile-reference-empty-lead">' + esc(message) + "</span>";
    return;
  }
  hintEl.className = "lab-history-hint";
  hintEl.textContent = message;
}
function ensureMobileLabOutputShellVisible() {
  if (!mobileLabReferenceMode()) return;
  syncMobileLabReferenceChrome();
}
function syncLabHistoryDayNavButtons(hist, selectedId) {
  var prevBtn = document.getElementById("lab-history-day-prev");
  var nextBtn = document.getElementById("lab-history-day-next");
  if (!prevBtn && !nextBtn) return;
  var days = groupLabHistoryByDay(hist);
  var idx = days.length ? findLabHistoryDayIndexForSet(days, labSetIdForHistory, selectedId) : -1;
  if (prevBtn) prevBtn.disabled = idx < 0 || idx >= days.length - 1;
  if (nextBtn) nextBtn.disabled = idx <= 0;
}
function handleLabHistoryNoPatientSelect_(selectEl, hintEl, moreMenu) {
  _labHistoryDateSelectCacheKey = "";
  selectEl.hidden = true;
  selectEl.innerHTML = "";
  if (hintEl) {
    setLabOutputHistoryHint(
      hintEl,
      "Selecciona un paciente en la columna izquierda para ver los estudios guardados.",
      { mobileReference: mobileLabReferenceMode() }
    );
  }
  if (moreMenu) moreMenu.hidden = true;
  syncLabHistoryDayNavButtons([], "");
  if (mobileLabReferenceMode()) syncMobileLabReferenceChrome();
  return "";
}
function handleLabHistoryEmptySelect_(selectEl, hintEl, moreMenu, cacheKey) {
  _labHistoryDateSelectCacheKey = cacheKey;
  selectEl.hidden = true;
  selectEl.innerHTML = "";
  if (hintEl) {
    setLabOutputHistoryHint(
      hintEl,
      shouldApplyMobileLabHistoryWindow() ? "Sin estudios en los \xFAltimos 3 d\xEDas. En escritorio se procesan labs y sincronizan aqu\xED para referencia r\xE1pida." : "Al procesar un reporte con paciente activo, cada conjunto queda guardado aqu\xED (sirve para Tendencias y diagramas).",
      { mobileReference: mobileLabReferenceMode() && shouldApplyMobileLabHistoryWindow() }
    );
  }
  if (moreMenu) moreMenu.hidden = true;
  syncLabHistoryDayNavButtons([], "");
  ensureMobileLabOutputShellVisible();
  if (mobileLabReferenceMode()) syncMobileLabReferenceChrome();
  return "";
}
function populateLabHistoryDateSelect_(selectEl, hist, pid, cacheKey, opts) {
  var days = groupLabHistoryByDay(hist);
  var selectedDayKey = resolveSelectedDayKey(
    days,
    opts && opts.preferSetId || _labHistorySelectedSetId[pid],
    labSetIdForHistory
  );
  var selectedValue = daySelectValue(selectedDayKey);
  _labHistorySelectedSetId[pid] = selectedValue;
  if (_labHistoryDateSelectCacheKey !== cacheKey) {
    selectEl.innerHTML = buildLabHistoryDayOptionsHtml(days, selectedDayKey);
    _labHistoryDateSelectCacheKey = cacheKey;
  } else if (selectEl.value !== selectedValue) {
    selectEl.value = selectedValue;
  }
  selectEl.hidden = false;
  var navSetId = latestSetIdInLabHistoryDay(
    days.find(function(d) {
      return d.dayKey === selectedDayKey;
    }) || days[0],
    labSetIdForHistory
  );
  syncLabHistoryDayNavButtons(hist, navSetId);
  if (mobileLabReferenceMode()) syncMobileLabReferenceChrome();
  return selectedValue;
}
function syncLabHistoryDateSelect(opts) {
  ensureMobileLabOutputShellVisible();
  var selectEl = document.getElementById("lab-history-date-select");
  var hintEl = document.getElementById("lab-output-history-hint");
  var moreMenu = document.querySelector(".lab-output-more");
  if (!selectEl) return "";
  var pid = rt.getActiveId();
  if (!pid) return handleLabHistoryNoPatientSelect_(selectEl, hintEl, moreMenu);
  var hist = getActivePatientLabHistory();
  var cacheKey = String(pid) + "|L" + getLabHistoryRevision(pid) + "|N" + hist.length;
  if (!hist.length) return handleLabHistoryEmptySelect_(selectEl, hintEl, moreMenu, cacheKey);
  if (hintEl) hintEl.style.display = "none";
  if (moreMenu) moreMenu.hidden = mobileLabReferenceMode() ? true : false;
  return populateLabHistoryDateSelect_(selectEl, hist, pid, cacheKey, opts);
}
function stepLabHistoryDay(delta) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var hist = getActivePatientLabHistory();
  if (!hist.length) return;
  var days = groupLabHistoryByDay(hist);
  var currentDayKey = resolveSelectedDayKey(days, _labHistorySelectedSetId[pid], labSetIdForHistory);
  var currentDayIdx = days.findIndex(function(d) {
    return d.dayKey === currentDayKey;
  });
  if (currentDayIdx < 0) currentDayIdx = 0;
  var nextDayIdx = stepLabHistoryDayIndex(days, currentDayIdx, delta);
  if (nextDayIdx < 0 || nextDayIdx === currentDayIdx) return;
  var nextValue = daySelectValue(days[nextDayIdx].dayKey);
  onLabHistoryDateChange(nextValue);
  syncLabHistoryDateSelect({ preferSetId: nextValue });
}
function labHistoryDayArrowContext(ev) {
  var tag = ev.target && ev.target.tagName ? ev.target.tagName.toUpperCase() : "";
  var lab = document.getElementById("appcontent-lab");
  var picker = document.getElementById("lab-history-date-select");
  return {
    key: ev.key,
    modifier: !!(ev.metaKey || ev.ctrlKey || ev.altKey),
    typing: tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(ev.target && ev.target.isContentEditable),
    labTabVisible: !!(lab && lab.style.display !== "none" && !lab.hidden),
    hasDayPicker: !!(picker && !picker.hidden)
  };
}
var labHistoryDayKeysWired = false;
function wireLabHistoryDayKeys() {
  if (labHistoryDayKeysWired) return;
  labHistoryDayKeysWired = true;
  document.addEventListener("keydown", function(ev) {
    if (!canHandleLabHistoryDayArrow(labHistoryDayArrowContext(ev))) return;
    ev.preventDefault();
    stepLabHistoryDay(labHistoryDayArrowDelta(ev.key));
  });
}
function buildLabHistoryReplayResult_(set) {
  const patient = getPatients().find(function(p) {
    return p.id === rt.getActiveId();
  });
  const name = patient ? patient.nombre || "" : "";
  const reg = patient ? patient.registro || "" : "";
  return {
    patient: { name, expediente: reg, sexo: "", edad: "", fecha: set.fecha || "" },
    resLabs: set.resLabs,
    sourceText: set.sourceText || "",
    bhExtras: set.bhExtras,
    refsBySection: set.refsBySection
  };
}
function announceLabHistoryReplay_(setId) {
  rt.addAuditEntry("lab-history-replay", "ok", 1, String(setId));
  rt.showToast("Estudio cargado en Laboratorio", "success");
  const outSec = document.getElementById("lab-output-section");
  if (!outSec || outSec.style.display === "none") return;
  try {
    outSec.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch {
    outSec.scrollIntoView(true);
  }
}
function loadLabHistorySetIntoOutput(setId, opts) {
  if (!rt.getActiveId()) return false;
  const hist = getActivePatientLabHistory();
  const day = findDayForHistoryRef(groupLabHistoryByDay(hist), setId, labSetIdForHistory);
  var payload = buildDayOutputPayload(day);
  if (!payload) return false;
  labPanelBridge.renderOutput(buildLabHistoryReplayResult_(payload.result), {
    fromHistory: true,
    silent: !!(opts && opts.silent),
    dayGroups: payload.view.groups
  });
  if (!mobileLabReferenceMode()) {
    rt.renderDiagramas((payload.labwork || payload.newest).resLabs);
  }
  if (!(opts && opts.silent)) announceLabHistoryReplay_(setId);
  return true;
}
function maybeShowLabHistoryForActivePatient(opts) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var selectedId = syncLabHistoryDateSelect(opts);
  if (!selectedId) {
    if (!labPanelBridge.getActiveLab()) {
      var sec = document.getElementById("lab-output-section");
      if (sec && !mobileLabReferenceMode()) sec.style.display = "none";
      else ensureMobileLabOutputShellVisible();
      labPanelBridge.syncLabOutputChrome();
    }
    return;
  }
  if (labPanelBridge.getActiveLab() && !(opts && opts.forceReload)) return;
  loadLabHistorySetIntoOutput(selectedId, { silent: true });
}
function renderLabHistoryPanel() {
  wireLabHistoryDayKeys();
  ensureMobileLabOutputShellVisible();
  var selectedId = syncLabHistoryDateSelect();
  if (selectedId && !labPanelBridge.getActiveLab()) {
    loadLabHistorySetIntoOutput(selectedId, { silent: true });
  } else if (!selectedId && !labPanelBridge.getActiveLab()) {
    var sec = document.getElementById("lab-output-section");
    if (sec && !mobileLabReferenceMode()) sec.style.display = "none";
    else ensureMobileLabOutputShellVisible();
    labPanelBridge.syncLabOutputChrome();
  }
}
function onLabHistoryDateChange(setId) {
  var pid = rt.getActiveId();
  if (pid && setId) _labHistorySelectedSetId[pid] = setId;
  loadLabHistorySetIntoOutput(setId, { silent: true });
}
function selectedDaySetIds() {
  var selectEl = document.getElementById("lab-history-date-select");
  if (!selectEl || selectEl.hidden || !selectEl.value) return [];
  var day = findDayForHistoryRef(
    groupLabHistoryByDay(getActivePatientLabHistory()),
    selectEl.value,
    labSetIdForHistory
  );
  if (!day) return [];
  return day.rows.map(function(row) {
    return labSetIdForHistory(row.set, row.idx);
  });
}
function reprocessSelectedLabHistorySet() {
  var ids = selectedDaySetIds();
  if (!ids.length) {
    rt.showToast("No hay estudio seleccionado", "error");
    return;
  }
  reprocessLabHistorySet(ids[0]);
}
async function deleteSelectedLabHistorySet() {
  var selectEl = document.getElementById("lab-history-date-select");
  if (!selectEl || selectEl.hidden || !selectEl.value) {
    rt.showToast("No hay estudio seleccionado", "error");
    return;
  }
  var hist = getActivePatientLabHistory();
  var day = findDayForHistoryRef(groupLabHistoryByDay(hist), selectEl.value, labSetIdForHistory);
  if (!day || !day.rows.length) {
    rt.showToast("No hay estudio seleccionado", "error");
    return;
  }
  if (day.rows.length === 1) {
    await deleteLabHistorySet(labSetIdForHistory(day.rows[0].set, day.rows[0].idx));
    return;
  }
  await deleteLabHistoryDay_(day);
}
async function deleteAllLabHistorySets() {
  var pid = rt.getActiveId();
  if (!pid) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var sets = normalizeLabHistoryPatientSets(getLabHistory()[pid]);
  if (!sets.length) {
    rt.showToast("No hay estudios en el historial", "info");
    return;
  }
  var result = await openConfirm({
    weight: "destructive",
    title: "\xBFEliminar todos los estudios de laboratorio de este paciente?",
    message: "Se borrar\xE1n " + sets.length + " conjunto" + (sets.length === 1 ? "" : "s") + " del historial. Las tendencias y diagramas se recalcular\xE1n.",
    confirmLabel: "Eliminar"
  });
  if (result !== "confirm") {
    return;
  }
  delete getLabHistory()[pid];
  bumpLabHistoryRevision(pid);
  persistClinicalState({ immediate: true });
  rt.addAuditEntry("lab-history-delete-all", "ok", sets.length, String(pid));
  labPanelBridge.setActiveLab(null);
  clearLabHistoryDateSelectCache();
  _labHistorySelectedSetId[pid] = "";
  rt.rebuildEstudiosFromLabHistory(pid);
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  rt.showToast("Historial de laboratorio borrado", "success");
}
function replayLabHistorySet(setId) {
  if (!rt.getActiveId()) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  _labHistorySelectedSetId[rt.getActiveId()] = String(setId || "");
  if (!loadLabHistorySetIntoOutput(setId)) {
    rt.showToast("No se encontr\xF3 ese estudio", "error");
    return;
  }
  syncLabHistoryDateSelect({ preferSetId: setId });
  rt.switchAppTab("lab");
}
function collectReprocessSourceParts_(set, ctx) {
  const srcParts = [];
  if (set.sourceText && String(set.sourceText).trim()) srcParts.push(String(set.sourceText).trim());
  (ctx.extraSourceTexts || []).forEach(function(t) {
    if (t && srcParts.indexOf(t) === -1) srcParts.push(t);
  });
  return srcParts;
}
function chartPatientForActiveId_() {
  const patientId = rt.getActiveId();
  if (!patientId) return null;
  return getPatients().find(function(p) {
    return String(p.id) === String(patientId);
  }) || null;
}
function priorRefsForActivePatient_(excludeSetId) {
  const pid = rt.getActiveId();
  if (!pid) return /* @__PURE__ */ Object.create(null);
  const others = sortLabHistoryChronological(getLabHistory()[pid] || []).filter(function(s) {
    return !excludeSetId || String(s.id) !== String(excludeSetId);
  });
  return collectPriorRefsFromHistory(others);
}
function reprocessLabSetResLabs_(set, ctx) {
  const srcParts = collectReprocessSourceParts_(set, ctx);
  const priorRefs = priorRefsForActivePatient_(set && set.id);
  const priorGas = priorRefs.GASES || /* @__PURE__ */ Object.create(null);
  let repro;
  if (srcParts.length) {
    const mergedSrc = srcParts.join("\n\n---\n\n");
    const chartPatient = chartPatientForActiveId_();
    const parsed = procesarLabs(mergedSrc, {
      patient: chartPatient || void 0,
      priorRefsBySection: priorRefs
    });
    repro = reprocessLabResultLines_(parsed.resLabs || [], {
      gasRefs: mergeGasRefs_(priorGas, parsed.refsBySection && parsed.refsBySection.GASES)
    });
    if (parsed.bhExtras && typeof parsed.bhExtras === "object") {
      set.bhExtras = Object.assign({}, set.bhExtras || {}, parsed.bhExtras);
    }
  } else {
    repro = reprocessLabResultLines_(set.resLabs, {
      gasRefs: mergeGasRefs_(priorGas, set.refsBySection && set.refsBySection.GASES)
    });
  }
  return repro;
}
function finalizeReprocessedLabSet_(set, repro, setId) {
  set.resLabs = sanitizeResLabsChunks(repro);
  refreshSameDayAscitisForPatient(rt.getActiveId(), set.id);
  set.parsed = rt.extractParsedValues(set.resLabs);
  set.parsedBySection = rt.buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);
  delete set._parseFingerprint;
  bumpLabHistoryRevision(rt.getActiveId());
  rt.rebuildEstudiosFromLabHistory(rt.getActiveId());
  persistClinicalState({ immediate: true });
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  replayLabHistorySet(setId);
  rt.addAuditEntry("lab-history-reprocess", "ok", 1, String(setId));
  rt.showToast("Estudio reprocesado desde resultados \u2713", "success");
}
function reprocessLabHistorySet(setId) {
  if (!rt.getActiveId()) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  const sets = normalizeLabHistoryPatientSets(getLabHistory()[rt.getActiveId()]);
  const set = findLabHistorySetByRef(sets, setId);
  if (!set) {
    rt.showToast("No se encontr\xF3 ese estudio", "error");
    return;
  }
  if (!set.resLabs || !set.resLabs.length) {
    rt.showToast("Este estudio no tiene resultados para reprocesar", "error");
    return;
  }
  try {
    const ctx = buildSameDaySerumContext(rt.getActiveId(), set);
    const rawRepro = reprocessLabSetResLabs_(set, ctx);
    if (!rawRepro || !rawRepro.length) {
      rt.showToast("No se pudieron regenerar resultados desde el bloque guardado", "error");
      return;
    }
    const repro = refreshCitoquimicoInterpretacionInResLabs_(rawRepro, set.sourceText || "", ctx);
    finalizeReprocessedLabSet_(set, repro, setId);
  } catch {
    rt.showToast("Error al reprocesar este estudio", "error");
  }
}
async function deleteLabHistorySet(setId) {
  var pid = rt.getActiveId();
  if (!pid) return;
  var sets = normalizeLabHistoryPatientSets(getLabHistory()[pid]);
  if (!sets.length) return;
  var result = await openConfirm({
    weight: "destructive",
    title: "\xBFEliminar este conjunto del historial? Las tendencias se recalcular\xE1n.",
    confirmLabel: "Eliminar"
  });
  if (result !== "confirm") return;
  var sid = String(setId == null ? "" : setId);
  if (sid.indexOf("__idx_") === 0) {
    var idx = parseInt(sid.slice(6), 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < sets.length) sets.splice(idx, 1);
  } else {
    sets = sets.filter(function(s) {
      return String(s.id) !== sid;
    });
  }
  if (sets.length) getLabHistory()[pid] = sets;
  else delete getLabHistory()[pid];
  bumpLabHistoryRevision(pid);
  persistClinicalState({ immediate: true });
  rt.addAuditEntry("lab-history-delete", "ok", 1, String(setId));
  labPanelBridge.setActiveLab(null);
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  rt.showToast("Eliminado del historial", "success");
}
async function deleteLabHistoryDay_(day) {
  var pid = rt.getActiveId();
  if (!pid || !day || !day.rows.length) return;
  var n = day.rows.length;
  var result = await openConfirm({
    weight: "destructive",
    title: "\xBFEliminar los " + n + " conjuntos de este d\xEDa?",
    message: "Las tendencias se recalcular\xE1n.",
    confirmLabel: "Eliminar"
  });
  if (result !== "confirm") {
    return;
  }
  var sets = filterOutDaySets(normalizeLabHistoryPatientSets(getLabHistory()[pid]), day);
  if (sets.length) getLabHistory()[pid] = sets;
  else delete getLabHistory()[pid];
  bumpLabHistoryRevision(pid);
  persistClinicalState({ immediate: true });
  rt.addAuditEntry("lab-history-delete-day", "ok", n, String(day.dayKey || ""));
  labPanelBridge.setActiveLab(null);
  clearLabHistoryDateSelectCache();
  _labHistorySelectedSetId[pid] = "";
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  rt.showToast("D\xEDa eliminado del historial", "success");
}
function clearLabHistoryDateSelectCache() {
  _labHistoryDateSelectCacheKey = "";
}
function setLabHistorySelectedSetId(pid, setId) {
  if (pid && setId) _labHistorySelectedSetId[pid] = setId;
}

export {
  labPanelBridge,
  buildSameDaySerumContext,
  refreshSameDayAscitisForPatient,
  setLabHistoryPanelCollapsed,
  syncLabHistoryCollapseUI,
  labHistoryPanelIsCollapsed,
  toggleLabHistoryPanel,
  dedupeConsolidatedRowsBySection,
  expandLabHistoryList,
  labSetIdForHistory,
  getActivePatientLabHistory,
  syncLabHistoryDateSelect,
  stepLabHistoryDay,
  loadLabHistorySetIntoOutput,
  maybeShowLabHistoryForActivePatient,
  renderLabHistoryPanel,
  onLabHistoryDateChange,
  reprocessSelectedLabHistorySet,
  deleteSelectedLabHistorySet,
  deleteAllLabHistorySets,
  replayLabHistorySet,
  reprocessLabHistorySet,
  deleteLabHistorySet,
  clearLabHistoryDateSelectCache,
  setLabHistorySelectedSetId
};
//# sourceMappingURL=/js/chunks/chunk-JTFIIC4P.js.map
