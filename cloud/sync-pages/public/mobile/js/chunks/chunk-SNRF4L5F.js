import {
  buildLabRepoBulkText,
  buildLabRepoPreviewBlocks,
  closeLabRepoImportModal,
  confirmLabRepoImport,
  labRepoDefaultDateRange,
  labRepoFetchRangeFromDateInputs,
  labRepoToDateInputValue,
  openLabRepoImportModal,
  patientsVisibleInSidebar,
  registerLabRepoImportRuntime,
  shouldSilentImportLabRepo,
  syncLabRepoDateField
} from "/mobile/js/chunks/chunk-XZECKTNU.js";
import {
  clearLabInputAfterSuccessfulParse,
  closeLabPasteModal,
  closeLabSomeTablesModal,
  consolidateLabHistoryByDayAndTipo,
  copiarLabsAlPortapapeles,
  finalizeBulkLabPaste,
  finalizeLabHistoryImport,
  findDisplayLabHistorySetId,
  insertLabPatientSeparator,
  limpiarReporte,
  openLabHistoryDedupeReview,
  openLabPasteModal,
  openLabPatientPicker,
  openLabSomeTablesModal,
  parseSomeTablesFromSources,
  pushExternalLabHistory,
  registerLabSomeTablesModalRuntime,
  syncLabSomeTablesBtn
} from "/mobile/js/chunks/chunk-5XN44JSR.js";
import {
  openLabBulkPreviewModal,
  shouldOfferBulkPreviewAddPatient
} from "/mobile/js/chunks/chunk-BPF3D2MR.js";
import {
  deleteAllLabHistorySets,
  deleteLabHistorySet,
  deleteSelectedLabHistorySet,
  expandLabHistoryList,
  getActivePatientLabHistory,
  labHistoryPanelIsCollapsed,
  labPanelBridge,
  labSetIdForHistory,
  loadLabHistorySetIntoOutput,
  onLabHistoryDateChange,
  renderLabHistoryPanel,
  replayLabHistorySet,
  reprocessLabHistorySet,
  reprocessSelectedLabHistorySet,
  setLabHistoryPanelCollapsed,
  setLabHistorySelectedSetId,
  stepLabHistoryDay,
  syncLabHistoryCollapseUI,
  syncLabHistoryDateSelect,
  toggleLabHistoryPanel
} from "/mobile/js/chunks/chunk-UYTT63LP.js";
import {
  copyLabMobileSyncDiag,
  forceLabMobileSyncPull,
  toggleLabMobileSyncDiag
} from "/mobile/js/chunks/chunk-4GQSUPME.js";
import {
  registerLabPanelRuntime,
  rt
} from "/mobile/js/chunks/chunk-RMUFSCXL.js";
import {
  commitStubPatientFromLab
} from "/mobile/js/chunks/chunk-KCX5U3HW.js";
import {
  updaterState
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
import {
  buildLabChemistrySkeletonHtml
} from "/mobile/js/chunks/chunk-2GD37PRJ.js";
import {
  LAB_BULK_PATIENT_SEPARATOR,
  buildBulkLabPreview,
  extractLabPatientFromBulkBlock,
  mixedExpedienteWarning,
  shouldShowBulkLabPreview
} from "/mobile/js/chunks/chunk-WF6PJVIL.js";
import {
  LAB_EXTENDED_PANEL_DEFS,
  escTxt,
  isLabSectionHeaderHtml,
  renderEntry,
  sortResLabsByClinicalOrder
} from "/mobile/js/chunks/chunk-7XJNQXQX.js";
import {
  refreshRpcDateFields
} from "/mobile/js/chunks/chunk-QLSLJE42.js";
import {
  persistClinicalState
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import {
  looksLikeSomeLabReport,
  normalizeFechaLabHistory,
  parseFechaLabToMs,
  parseTrendNumeric,
  sortLabHistoryChronological
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  settlePasteSurface
} from "/mobile/js/chunks/chunk-X2R3ZGWP.js";

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

// public/js/features/lab-trend-arrows.mjs
function trendValue(set, sectionKey, fieldKey) {
  if (!set || !set.parsedBySection || !set.parsedBySection[sectionKey]) return null;
  return parseTrendNumeric(set.parsedBySection[sectionKey][fieldKey]);
}
function currentTimestampMs(currentSet) {
  if (!currentSet) return null;
  var ms = parseFechaLabToMs(currentSet.fecha, currentSet.hora);
  return typeof ms === "number" && isFinite(ms) ? ms : null;
}
function dayStartMs(fecha) {
  var ms = parseFechaLabToMs(fecha, null);
  return typeof ms === "number" && isFinite(ms) ? ms : null;
}
function priorSetsForCurrent(historySets, currentSet) {
  var desc = sortLabHistoryChronological(historySets || []);
  var curMs = currentTimestampMs(currentSet);
  if (curMs == null) return desc;
  var curDayMs = dayStartMs(currentSet && currentSet.fecha);
  return desc.filter(function(s) {
    var ms = parseFechaLabToMs(s && s.fecha, s && s.hora);
    if (!(typeof ms === "number" && isFinite(ms) && ms < curMs)) return false;
    if (curDayMs != null) {
      var sDayMs = dayStartMs(s && s.fecha);
      if (sDayMs === curDayMs) return false;
    }
    return true;
  });
}
function buildLabTrendLookup(historySets, currentSet) {
  if (!currentSet || !currentSet.parsedBySection) {
    return function() {
      return null;
    };
  }
  var prior = priorSetsForCurrent(historySets, currentSet);
  return function get(sectionKey, fieldKey) {
    var curVal = trendValue(currentSet, sectionKey, fieldKey);
    if (curVal == null) return null;
    for (var i = 0; i < prior.length; i++) {
      var prevVal = trendValue(prior[i], sectionKey, fieldKey);
      if (prevVal == null) continue;
      if (prevVal === curVal) return null;
      return { trend: curVal > prevVal ? "up" : "down", delta: curVal - prevVal };
    }
    return null;
  };
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
function appendBhExtendedLines(box, text, result, labDisp, rt2) {
  if (!labDisp.showBhExtendedLine || !result.bhExtras || !rt2.isBhMainResLabChunk(text)) return;
  var extTab = rt2.formatBhExtendedTabLine(result.bhExtras, result.sourceText);
  if (!extTab) return;
  renderEntry(extTab).forEach(function(html, idx) {
    var divEx = document.createElement("div");
    divEx.className = (idx === 0 ? "out-line" : "out-indent") + " lab-bh-extended-line";
    divEx.innerHTML = html;
    box.appendChild(divEx);
  });
}
function appendCitoquimInterpretacionChunk(box, text, rt2) {
  var alertDiv = document.createElement("div");
  alertDiv.className = "lab-out-citoquim-interp out-line";
  alertDiv.setAttribute("role", "status");
  alertDiv.textContent = rt2.citoquimInterpretacionBody_ ? rt2.citoquimInterpretacionBody_(text) : rt2.ascitisInterpretacionBody_(text);
  box.appendChild(alertDiv);
}
function appendCultivoChunk(box, text, src, rt2) {
  var wrap = document.createElement("div");
  wrap.className = "lab-out-cultivo-chunk";
  wrap.innerHTML = rt2.buildCultivoOutputHtmlFragments(text, src);
  box.appendChild(wrap);
}
function appendStandardResLabChunk(box, text, trendLookup) {
  renderEntry(text, trendLookup).forEach(function(html, idx) {
    var div = document.createElement("div");
    div.className = idx === 0 || isLabSectionHeaderHtml(html) ? "out-line" : "out-indent";
    div.innerHTML = html;
    box.appendChild(div);
  });
}
function representativeFechaHoraForGroup_(group) {
  var sets = group && group.sets || [];
  var best = null;
  var bestMs = -Infinity;
  sets.forEach(function(s) {
    var ms = parseFechaLabToMs(s && s.fecha, s && s.hora);
    if (typeof ms === "number" && isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = s;
    }
  });
  return best || sets[0] || {};
}
function buildLabOutputTrendLookup_(currentSet) {
  var history = getActivePatientLabHistory();
  if (!history.length) return null;
  return buildLabTrendLookup(history, currentSet);
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
function buildCurrentSetForGroup_(group, buildParsedBySectionFromResLabs) {
  return Object.assign(
    {},
    representativeFechaHoraForGroup_(group),
    { parsedBySection: buildParsedBySectionFromResLabs(group.resLabs, group.bhExtras) }
  );
}
function appendResLabChunksToBox(box, resLabs, src, result, labDisp, rt2, group) {
  var currentSet = group ? buildCurrentSetForGroup_(group, rt2.buildParsedBySectionFromResLabs) : {
    fecha: result && result.patient && result.patient.fecha,
    hora: result && result.patient && result.patient.hora,
    parsedBySection: rt2.buildParsedBySectionFromResLabs(resLabs, result && result.bhExtras)
  };
  var trendLookup = buildLabOutputTrendLookup_(currentSet);
  sortResLabsByClinicalOrder(resLabs || []).forEach(function(text) {
    if (labDisp.hideGasoAdvInterp && rt2.isGasoInterpretacionResLabChunk(text)) return;
    if (rt2.isCitoquimInterpretacionResLabChunk && rt2.isCitoquimInterpretacionResLabChunk(text) || rt2.isAscitisInterpretacionResLabChunk(text)) {
      appendCitoquimInterpretacionChunk(box, text, rt2);
      return;
    }
    if (rt2.isResLabChunkPureCultivo(text)) {
      appendCultivoChunk(box, text, src, rt2);
      return;
    }
    appendStandardResLabChunk(box, text, trendLookup);
    appendBhExtendedLines(box, text, result, labDisp, rt2);
  });
}
function syncLabOutputHistoryAfterRender(opts, result, rt2) {
  if (opts && opts.fromHistory) return;
  var pid = rt2.getActiveId();
  if (!pid) return;
  var preferId = opts && opts.preferHistorySetId || findDisplayLabHistorySetId(pid, result) || "";
  if (!preferId) {
    var hist = getActivePatientLabHistory();
    preferId = hist.length ? labSetIdForHistory(hist[0], 0) : "";
  }
  syncLabHistoryDateSelect({ preferSetId: preferId });
  if (preferId) setLabHistorySelectedSetId(pid, preferId);
}
function prepareLabOutputBox(fechaBanner, rt2) {
  var box = document.getElementById("lab-output-box");
  rt2.removeAtbRisPanelsFromBody();
  box.innerHTML = "";
  if (fechaBanner) {
    var fechaTop = document.createElement("div");
    fechaTop.className = "lab-output-fecha";
    fechaTop.textContent = fechaBanner;
    box.appendChild(fechaTop);
  }
  return box;
}

// public/js/features/lab-results-card.mjs
function pluralAlterados(n) {
  return n === 1 ? "1 alterado" : n + " alterados";
}
function updateLabResultsCardTitle(box) {
  var titleEl = document.getElementById("lab-output-title-text");
  if (!titleEl || !box) return;
  var total = Array.prototype.filter.call(box.querySelectorAll(".lab-row-value"), function(el) {
    return !el.classList.contains("lab-row-value-muted");
  }).length;
  var altered = box.querySelectorAll(".lab-value-altered").length;
  titleEl.textContent = total ? "Resultados \xB7 " + pluralAlterados(altered) + " de " + total : "Resultados";
}
function countAlteredUntilNextGroup(headerEl) {
  var n = 0;
  var el = headerEl.nextElementSibling;
  while (el && !el.classList.contains("lab-hour-group-h")) {
    n += el.querySelectorAll(".lab-value-altered").length;
    el = el.nextElementSibling;
  }
  return n;
}
function splitHourGroupHeaderText(text) {
  var s = String(text == null ? "" : text);
  var sepIdx = s.indexOf(" \xB7 ");
  if (sepIdx < 0) return { hora: /^\d{1,2}:\d{2}$/.test(s.trim()) ? s.trim() : "", label: sepIdx < 0 ? s.trim() : "" };
  var head = s.slice(0, sepIdx).trim();
  var rest = s.slice(sepIdx + 3).trim();
  if (/^\d{1,2}:\d{2}$/.test(head)) return { hora: head, label: rest };
  return { hora: "", label: s.trim() };
}
function restyleLabHourGroupHeaders(box) {
  if (!box) return;
  var headers = box.querySelectorAll(".lab-hour-group-h");
  headers.forEach(function(headerEl) {
    var parts = splitHourGroupHeaderText(headerEl.textContent);
    var n = countAlteredUntilNextGroup(headerEl);
    var labelText = parts.label ? parts.label + (n ? " \xB7 " + pluralAlterados(n) : "") : "";
    var html = "";
    if (parts.hora) html += '<span class="lab-hour-time">' + escTxt(parts.hora) + "</span>";
    if (labelText) html += '<span class="lab-hour-label">' + escTxt(labelText) + "</span>";
    headerEl.innerHTML = html || escTxt(headerEl.textContent);
  });
}
function syncLabResultsCardChrome() {
  var box = document.getElementById("lab-output-box");
  if (!box) return;
  restyleLabHourGroupHeaders(box);
  updateLabResultsCardTitle(box);
}

// public/js/features/lab-panel-parse.mjs
function labOutputSettleEl(wasHidden, opts, outSec, box) {
  if (wasHidden) return outSec || box;
  if (opts && opts.fromHistory) return box || outSec;
  return null;
}
function runFinalizeWithFreshBlocks(text) {
  var admit = autoAdmitStubPatientsFromBulkText(text, rt.findPatientByRegistro, buildBulkLabPreview);
  if (admit.created.length) {
    rt.showToast(
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
    rt.showToast("Pega el texto del reporte primero", "error");
    return;
  }
  var blocks = buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
  if (!blocks.length) {
    rt.showToast("No se detectaron reportes SOME en el texto pegado", "error");
    return;
  }
  var mixedWarning = mixedExpedienteWarning(blocks);
  if (mixedWarning) {
    rt.showToast(mixedWarning, "error");
    return;
  }
  var totalOkReports = blocks.reduce(function(acc, b) {
    return acc + b.okReportCount;
  }, 0);
  if (!totalOkReports) {
    rt.showToast(
      looksLikeSomeLabReport(text) ? "No se encontraron resultados de laboratorio en el texto pegado" : "No parece un reporte de SOME. Copia desde \xABExpediente:\xBB hasta el final del reporte.",
      "error"
    );
    return;
  }
  try {
    if (shouldShowBulkLabPreview(blocks, totalOkReports, {
      quickLabOutput: rt.getLabOutputPrefs().quickLabOutput
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
    rt.showToast("Error al procesar el reporte", "error");
    console.error(e);
  }
}
function renderOutput(result, opts) {
  var patient = result.patient;
  var resLabs = result.resLabs;
  var groups = opts && opts.dayGroups;
  if (groups && groups.length > 1) result.dayGroups = groups;
  labPanelBridge.setActiveLab(result);
  if (!(opts && opts.fromHistory)) rt.onboardingAdvanceAfterParse();
  var fechaBanner = resolveLabOutputFechaBanner(patient);
  updateLabPatientBanner(patient, fechaBanner, rt.findPatientByRegistro);
  var box = prepareLabOutputBox(fechaBanner, rt);
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
        rt.getLabOutputPrefs(),
        rt,
        group
      );
    });
  } else {
    appendResLabChunksToBox(box, resLabs, src, result, rt.getLabOutputPrefs(), rt);
  }
  var outSec = document.getElementById("lab-output-section");
  var wasHidden = !outSec || outSec.style.display === "none";
  if (outSec) outSec.style.display = "block";
  var settleEl = labOutputSettleEl(wasHidden, opts, outSec, box);
  if (settleEl) settlePasteSurface(settleEl);
  var labRoot = document.getElementById("appcontent-lab");
  if (labRoot) labRoot.classList.remove("is-lab-chunk-loading");
  syncLabResultsCardChrome();
  syncLabOutputHistoryAfterRender(opts, result, rt);
  labPanelBridge.syncLabOutputChrome();
  rt.wireAtbRisHoverPanels(box);
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
function previewBlocksFromBulkText(text, rt2) {
  if (typeof rt2.rebuildBulkLabPreviewBlocks === "function") {
    return rt2.rebuildBulkLabPreviewBlocks(text);
  }
  return buildBulkLabPreview(text, { findPatientByRegistro: rt2.findPatientByRegistro });
}
function finalizeJoinedBulkTexts(texts, rt2) {
  var text = joinPatientBulkTexts(texts);
  if (!text) return { importedPatients: 0, totalOk: 0 };
  var blocks = previewBlocksFromBulkText(text, rt2);
  var counts = countBlocksOkAndPatients(blocks);
  if (!counts.totalOk) return { importedPatients: 0, totalOk: 0 };
  finalizeBulkLabPaste(text, blocks, counts.totalOk, { replaceOnMatch: true });
  return { importedPatients: counts.patientCount, totalOk: counts.totalOk };
}
function classifyPatientStudyGroup(g, rt2) {
  if (!g || !g.studies || !g.studies.length) return null;
  var text = buildLabRepoBulkText(g.studies);
  if (!text) return null;
  var blocks = buildLabRepoPreviewBlocks(g.studies, rt2.findPatientByRegistro);
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
function openBatchReviewPreview(reviewTexts, rt2) {
  var reviewText = joinPatientBulkTexts(reviewTexts);
  var reviewBlocks = previewBlocksFromBulkText(reviewText, rt2);
  openLabBulkPreviewModal({
    blocks: reviewBlocks,
    sourceText: reviewText,
    onConfirm: function() {
      finalizeBulkLabPaste(
        reviewText,
        reviewBlocks,
        countBlocksOkAndPatients(reviewBlocks).totalOk,
        { replaceOnMatch: true }
      );
    }
  });
}
function applyBatchStudyGroups(groups, rt2) {
  var silentTexts = [];
  var reviewTexts = [];
  var importedPatients = 0;
  (groups || []).forEach(function(g) {
    var outcome = classifyPatientStudyGroup(g, rt2);
    if (!outcome) return;
    if (outcome.silent) {
      silentTexts.push(outcome.text);
      importedPatients += outcome.patientCount;
      return;
    }
    reviewTexts.push(outcome.text);
  });
  if (silentTexts.length) finalizeJoinedBulkTexts(silentTexts, rt2);
  if (!reviewTexts.length) {
    return { needsReview: false, importedPatients };
  }
  openBatchReviewPreview(reviewTexts, rt2);
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

// public/js/features/lab-repo-batch-mode.mjs
function resolveActivePatientBatchRow(rt2) {
  var p = rt2 && typeof rt2.getActivePatient === "function" ? rt2.getActivePatient() : null;
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
function activePatientMissingRegistroMessage(rt2, teamWithRegistroCount) {
  var p = rt2 && typeof rt2.getActivePatient === "function" ? rt2.getActivePatient() : null;
  if (!p || !p.id) return null;
  if (String(p.registro || "").trim()) return null;
  if (teamWithRegistroCount > 0) return null;
  return "El paciente no tiene registro para consultar el repositorio";
}

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
  if (typeof rt.getLabRepoBatchTeamPatients === "function") {
    return rt.getLabRepoBatchTeamPatients() || [];
  }
  if (typeof rt.getLabRepoBatchCensusPatients === "function") {
    return rt.getLabRepoBatchCensusPatients() || [];
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
function setBatchProgress(_text, visible) {
  var el = document.getElementById("lab-repo-batch-progress");
  if (!el) return;
  el.hidden = !visible;
  el.innerHTML = visible ? buildLabChemistrySkeletonHtml() : "";
}
function renderSidebarQueue() {
  var root = document.getElementById("lab-repo-batch-queue");
  var fill = document.getElementById("lab-repo-batch-queue-fill");
  var meta = document.getElementById("lab-repo-batch-queue-meta");
  var stopBtn = document.getElementById("lab-repo-batch-queue-stop");
  var spinner = document.getElementById("lab-repo-batch-queue-spinner");
  var btnLabel = document.getElementById("lab-repo-batch-queue-btn-label");
  if (!root) return;
  if (!batchJobs.length) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  var total = batchJobs.length;
  var done = batchJobs.filter(function(j) {
    return j.status !== "pending" && j.status !== "running";
  }).length;
  if (fill) {
    fill.style.width = (total ? Math.round(done / total * 100) : 0) + "%";
  }
  if (meta) {
    meta.textContent = done + " de " + total + " \xB7 los que ya llegaron se ven de inmediato";
  }
  if (spinner) {
    spinner.classList.toggle("lab-repo-batch-queue-spinner--active", batchBusy);
  }
  if (btnLabel) {
    btnLabel.textContent = batchBusy ? "Actualizando" : "Listo";
  }
  if (stopBtn) {
    stopBtn.classList.toggle("lab-repo-batch-queue-stop--inactive", !batchBusy);
    stopBtn.disabled = !batchBusy;
  }
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
      rt.showToast("Deteniendo actualizaci\xF3n\u2026", "info");
    });
  }
}
function registerLabRepoBatchImportRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}
function dismissLabRepoBatchQueue() {
  if (batchBusy) {
    rt.showToast("Espera a que termine o pulsa Detener", "info");
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
    rt.showToast("Actualizaci\xF3n masiva solo en la app de escritorio", "warn");
    return;
  }
  requestSilentUpdateCheck();
  if (batchBusy) {
    rt.showToast("Ya hay una actualizaci\xF3n en curso \u2014 mira la cola en la barra lateral", "info");
    return;
  }
  wireBatchModalOnce();
  batchAbort = false;
  var teamRows = buildLabRepoBatchRows(teamPatients(), { defaultSelectWithRegistro: true });
  var teamWithReg = teamRows.filter(function(r) {
    return r && r.hasRegistro;
  }).length;
  var missingReg = activePatientMissingRegistroMessage(rt, teamWithReg);
  if (missingReg) {
    rt.showToast(missingReg, "error");
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
  var mode = resolveBatchOpenMode(teamRows, resolveActivePatientBatchRow(rt));
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
    rt.showToast("Deteniendo actualizaci\xF3n\u2026", "info");
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
  var activeId = typeof rt.getActiveId === "function" ? String(rt.getActiveId() || "") : "";
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
    rt.showToast("Selecciona al menos un paciente con registro", "error");
    return null;
  }
  var range = readBatchDateRange();
  if (!range) {
    rt.showToast("Revisa el rango de fechas (Desde no puede ser posterior a Hasta)", "error");
    return null;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    rt.showToast("Actualizaci\xF3n masiva solo en la app de escritorio", "warn");
    return null;
  }
  return { selected, range };
}
function applyFetchKindToTotals(kind, studies, errors, totals, row) {
  if (kind === "connection") {
    totals.failed += 1;
    rt.showToast("No se pudo conectar al repositorio de laboratorio (revisa red hospital)", "error");
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
      rt.showToast("Error al consultar el repositorio", "error");
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
  rt.showToast(summary, totals.failed || batchAbort ? "warn" : "ok");
}
async function confirmLabRepoBatchImport() {
  var start = validateBatchImportStart();
  if (!start) return;
  clearQueueAutoDismiss();
  batchAbort = false;
  showSidebarQueue(buildLabRepoBatchJobs(start.selected));
  if (batchSinglePatientMode) {
    setBatchProgress("", true);
  } else {
    hideBatchModal();
  }
  setBatchBusy(true);
  try {
    var totals = await runBatchFetches(start.selected, start.range);
    var applied = { needsReview: false, importedPatients: 0 };
    if (totals.groups.length) {
      setBatchProgress("", true);
      applied = applyBatchStudyGroups(totals.groups, rt);
    }
    finishBatchRun(start.selected, totals, applied);
  } finally {
    batchBusy = false;
    batchAbort = false;
    setBatchBusy(false);
    setBatchProgress("", false);
    if (batchSinglePatientMode) hideBatchModal();
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
      f("BUN/CR", "Rel. BUN/CR"),
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
function getActivePatient() {
  return typeof rt.getActivePatient === "function" ? rt.getActivePatient() : null;
}
function getActiveId() {
  return typeof rt.getActiveId === "function" ? rt.getActiveId() : null;
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
  var patient = getActivePatient();
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
  var patient = getActivePatient();
  if (!patientId || !patient) {
    rt.showToast("Selecciona un paciente para agregar labs externos", "error");
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
    rt.showToast("Selecciona un paciente", "error");
    return;
  }
  var sectionKey = selectedSectionKey();
  if (!getManualLabType(sectionKey)) {
    rt.showToast("Elige un tipo de estudio", "error");
    return;
  }
  var fechaEl = document.getElementById("lab-manual-fecha");
  var horaEl = document.getElementById("lab-manual-hora");
  var fecha = fechaFromDateInput(fechaEl && fechaEl.value);
  if (!fecha) {
    rt.showToast("Indica la fecha del estudio", "error");
    return;
  }
  var hora = horaEl ? String(horaEl.value || "").trim() : "";
  var resLabs = synthesizeManualResLabs(sectionKey, readValuesFromGrid());
  if (!resLabs.length) {
    rt.showToast("Llena al menos un valor", "error");
    return;
  }
  if (typeof rt.pushUndoSnapshot === "function") {
    rt.pushUndoSnapshot("Labs externos (" + sectionKey + ")");
  }
  var set = pushExternalLabHistory(patientId, {
    resLabs,
    fecha,
    hora,
    sectionKey
  });
  if (!set) {
    rt.showToast("No se pudo guardar el estudio", "error");
    return;
  }
  finalizeLabHistoryImport(patientId);
  persistClinicalState({ immediate: true });
  setLabHistorySelectedSetId(patientId, set.id);
  loadLabHistorySetIntoOutput(set.id, { silent: true });
  renderLabHistoryPanel();
  if (typeof rt.refreshTendenciasOrCultivosPanel === "function") {
    rt.refreshTendenciasOrCultivosPanel();
  }
  if (typeof rt.ensureParsedLabHistory === "function") {
    rt.ensureParsedLabHistory(patientId);
  }
  closeLabManualEntryModal();
  rt.showToast("Lab externo guardado \xB7 " + sectionKey + " \u2713", "success");
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
  if (typeof rt.getActiveAppTab !== "function") return false;
  var tab = rt.getActiveAppTab();
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
    rt.showToast(msg, kind);
  },
  getParsed: function() {
    return activeLab && activeLab.someTablesParsed ? activeLab.someTablesParsed : null;
  },
  syncLabCopyFab,
  syncLabOutputChrome: function() {
    syncLabOutputChrome();
  }
});
function syncLabOutputChrome() {
  var sec = document.getElementById("lab-output-section");
  var outputVisible = !!(sec && sec.style.display !== "none");
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
  openLabPasteModal,
  closeLabPasteModal,
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
  classifyLabRepoBatchFetch,
  applyBatchStudyGroups,
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
//# sourceMappingURL=/js/chunks/chunk-SNRF4L5F.js.map
