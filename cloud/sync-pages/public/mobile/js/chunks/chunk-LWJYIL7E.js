import {
  buildProximaCitaText,
  buildRecetaHuGeneratePayload,
  formatRecetaHuFecha,
  nextCensusPatientId,
  normalizeRecetaHuConsultServices,
  normalizeRecetaHuDraft
} from "/mobile/js/chunks/chunk-XWG2LQDN.js";
import {
  syncHeaderContext
} from "/mobile/js/chunks/chunk-KETQVDCA.js";
import {
  SOPORTE_OPTIONS,
  VITAL_KEYS,
  VITAL_LABELS,
  VITAL_UNITS,
  buildHistorialRowParts,
  formatHistorialWhen,
  renderSnapshotGluHtml,
  renderSnapshotGluZoneTitle,
  renderSnapshotIoHtml,
  renderSnapshotVitalsHtml
} from "/mobile/js/chunks/chunk-PWDSP7QN.js";
import {
  buildEstadoActualText
} from "/mobile/js/chunks/chunk-HU5IKSXZ.js";
import {
  ensureNotaEvolucionLoaded
} from "/mobile/js/chunks/chunk-4QNCYUEY.js";
import {
  canDeletePatientChart,
  closeModal,
  exitPatientBulkSelectMode,
  focusPatientSearchInput,
  getPatientBulkSelectedCount,
  getPatientBulkSelectedIds,
  isPatientBulkSelectMode,
  openAddModal,
  openAddModalFromLab,
  openCompleteAdmissionModal,
  patientCardIdFromEvent,
  patientRegistroModalWindowHandlers,
  renderActiveSectionLabelHtml,
  renderArchivedToggleHtml,
  renderPatientCardHtml,
  renderPinnedSectionLabelHtml,
  savePatient,
  shouldHandleTouchPointerUp,
  togglePatientBulkSelectMode,
  togglePatientBulkSelected
} from "/mobile/js/chunks/chunk-4VMY6FV6.js";
import {
  EA_MED_FIELD_LABELS,
  renderMedCategoryGrid,
  wireMedCategoryGrid
} from "/mobile/js/chunks/chunk-CT2YJYKC.js";
import {
  buildEaHistorialChartsRevision,
  renderEaChartsSummarySection
} from "/mobile/js/chunks/chunk-DKL3XNPH.js";
import {
  requestSilentUpdateCheck,
  safeAttrJsString
} from "/mobile/js/chunks/chunk-SNRF4L5F.js";
import {
  getPatientSearchFilter,
  patientMatchesSearch,
  patientsVisibleInSidebar,
  reselectIfActivePatientHidden,
  setPatientSearchFilter,
  syncClinicalCensusFiltersBar,
  togglePatientCensusFilters,
  writeLastSelectedPatientId
} from "/mobile/js/chunks/chunk-XZECKTNU.js";
import {
  _eaPanelCache,
  findActivePatient,
  findPatientById,
  getEaFormOpenPatientId,
  getEaPanelRuntime,
  invalidateEaPanelCache,
  setEaFormOpenPatientId
} from "/mobile/js/chunks/chunk-JM4V2UL6.js";
import {
  removePatientLocally
} from "/mobile/js/chunks/chunk-CHHF37KW.js";
import {
  wrapApprovalInConflictModal
} from "/mobile/js/chunks/chunk-CBI7THZ4.js";
import {
  rememberPatientDeleteTombstone
} from "/mobile/js/chunks/chunk-KCX5U3HW.js";
import {
  consolidatedInnerTabButtonId,
  migrateGranularInner,
  resolveConsolidatedTarget
} from "/mobile/js/chunks/chunk-2MXQFCGD.js";
import {
  isCloudMobileClient
} from "/mobile/js/chunks/chunk-OXN2ZL25.js";
import {
  registerPatientsRuntime,
  rt
} from "/mobile/js/chunks/chunk-SOQEY2U2.js";
import {
  patientsBridge
} from "/mobile/js/chunks/chunk-IUWKNPSX.js";
import {
  SOAP_EMPTY_MED_FALLBACK,
  VM_MODO_OPTIONS,
  buildVentilatorioCalcHints,
  comparePatientsByBed,
  copyToClipboardSafe,
  formatNmDietClause,
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForPatientApply,
  isPatientAdmissionIncomplete,
  medsClauseOrEmpty,
  medsListForSoap,
  mergeSoapMedField,
  normalizeSoporteValue,
  openSOAPModalDirect,
  partitionAnalgesiaForSoap,
  partitionNmMedsForSoap,
  patientHasInsulinRescatesInReceta,
  renderEstadoActualBar,
  renderGuardiaCensusGrid,
  resolveGlobalFn,
  resolveVentilatorioLabContext,
  shouldEnforceTeamPatientMirror,
  soapLegacyFieldIdForCategory,
  soapMedCategorySegment,
  soporteTier,
  syncGuardiaCensusPanelVisibility
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
import {
  getUiDensity
} from "/mobile/js/chunks/chunk-G2QTTDSA.js";
import {
  isAntidiabeticRecetaItem
} from "/mobile/js/chunks/chunk-5CRK7XGO.js";
import {
  isVitalAltered
} from "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  blockIfMobileDocExport,
  isMobileWeb,
  mobileDocExportToast
} from "/mobile/js/chunks/chunk-4V75H66Y.js";
import {
  refreshRpcDateFields
} from "/mobile/js/chunks/chunk-QLSLJE42.js";
import {
  openConfirm
} from "/mobile/js/chunks/chunk-EASTAY6S.js";
import {
  enqueueCloudPatientDelete,
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-VH7DMNPL.js";
import {
  cancelDeferredIdleWork,
  getIndicaciones,
  getLabHistory,
  getMedNotaSelectionByPatient,
  getMedPharmProfileByPatient,
  getMedRecetaByPatient,
  getNotes,
  getPatients,
  getRecetaHuByPatient,
  getVpoByPatient,
  persistClinicalState,
  scheduleTrailing
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-FLCMQPNP.js";
import {
  DIET_PENDING_KEYS,
  INSULIN_PRANDIAL_GROUP_ID,
  INSULIN_RESCATE_GROUP_ID,
  MAX_VITAL_LAYERS_IN_FORM,
  MAX_VITAL_READINGS_PER_DAY,
  MED_FIELD_KEYS,
  SOAP_DESTINATION_KEYS,
  SOAP_DESTINATION_LABELS,
  advanceAbxMedTextForManejoDate,
  apoyoKindLabel,
  appendMedicion,
  applyDietProposalFromRecetaBlock,
  applyDietaSuplementoPolicy,
  applyIvToOralForEgreso,
  applyNombreAccents,
  applyRecetaProposal,
  applySomePasteToProfile,
  assignSomePharmCategories,
  assignSomePharmCategory,
  backfillDietPendingMacrosFromReceta,
  balanceGlobalHistorico,
  balanceTurno,
  bucketsFromRecetaItems,
  buildDietProposalText,
  buildEaMonitoreoRevision,
  buildMedPharmMedGroupKey,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  classifyApoyoKind,
  classifyMedicationSoapCategory,
  clearRecetaProposalDismissed,
  clearRecetaProposalDismissedKey,
  collectDietasFromRecetaBlock,
  collectVitalReadingsInRegistroWindow,
  computeDietKcalKgFromTotal,
  computeDietKcalTotal,
  confirmAllMedProposals,
  confirmDietProposal,
  confirmMedField,
  dayValueInMap,
  deleteMonthFromProfile,
  deriveSnapshot,
  detectInsulinPumpAlgorithmFromRecetaBlock,
  detectInsulinPumpAlgorithmFromRecetaItems,
  discardDietProposal,
  discardMedProposal,
  effectiveDiaTratamiento,
  effectiveSoapCategory,
  ensureMonitoreo,
  ensureMonthOnProfile,
  ensureNoteDxFromPatientForExport,
  ensurePatientDiagnosticos,
  estadoClinicoForDisplay,
  estadoClinicoForText,
  expandNombrePresentacion,
  extractMedBaseName,
  formatDiagnosticosCopy,
  formatFreqShort,
  formatInsulinPumpAlgoritmoLabel,
  formatMedicationEgresoLine,
  formatMedicationSoapShort,
  formatViaShort,
  getDietOptions,
  getMonthFromProfile,
  getVitalExtraStorageKey,
  hasActiveDietProposal,
  hasPendingEaProposals,
  insulinPrandialItemsFromList,
  insulinPrandialMedLabelHtml,
  insulinPumpAlgorithmForMedicationItem,
  insulinPumpMedLabelHtml,
  insulinRescateItemsFromList,
  insulinRescateMedLabelHtml,
  isDietaParenteral,
  isDietaSuplemento,
  isInsulinIvMedicationItem,
  isInsulinPrandialGroupSoapSelected,
  isInsulinPrandialGroupSuspended,
  isInsulinPrandialMedicationItem,
  isInsulinPumpCarrierMedicationItem,
  isInsulinRescateGroupSoapSelected,
  isInsulinRescateGroupSuspended,
  isInsulinRescateMedicationItem,
  isMedPharmRowHidden,
  isNutritionMedicationItem,
  isSomePharmCategoryLabel,
  listDietCandidates,
  listSomePharmFilterLabels,
  looksLikeSomeIndicacionesPaste,
  looksLikeSomePharmMonthPaste,
  markDietAsManuallyConfirmed,
  medInstructionFragmentForSoap,
  mergeDietaItems,
  mergeRecetaIntoMonth,
  migratePatientMonitoreo,
  monthHasData,
  monthKeyFromParts,
  parseDiagnosticosText,
  parseIndicacionesPaste,
  parseSomePharmMonthPaste,
  patientHasInsulinPumpInReceta,
  preloadNoteDxFromPatient,
  profileHasMonthData,
  pruneEstadoClinicoMedsFromReceta,
  pushDiagnosticosToPatient,
  pushVitalReading,
  removeMedicion,
  resolveDietWeightKg,
  resolveEaAbxFechaActualizacion,
  resolveFechaActualizacion,
  rowSomePharmCategory,
  selectDietOption,
  shouldAutoSelectSoap,
  shouldIncludeMedicationInSoap,
  skipRecetaItemForInsulinPumpCarrier,
  soapDestinationSelectOptionsHtml,
  soapDestinationUiValue,
  splitMonthAt,
  stampCensoFieldsClock,
  syncConfirmedAbxFromReceta,
  syncDietKcalFromWeight,
  syncNoteDxFromPatient,
  syncRecetaProposalsFromSoapSelection,
  toggleNotAdmin,
  trimStr,
  unassignedOtrosSoapItems,
  vitalSeriesToLegacyFields
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  STANDARD_GLUCOMETRIA_TIMES,
  datetimeLocalToIso,
  diuresisValueFromParts,
  escAttrNumeric,
  formatEaSavedLabel,
  formatIoBalanceDisplay,
  getDefaultRegistroRecordedAt,
  isTurnCloseHm,
  isoToHHmm,
  parseIoEgresoLine,
  parseIoEvacField,
  parseIoIngresoField,
  parseNumOrNull,
  serializeEgrPartsToFormText,
  toDatetimeLocalValue
} from "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  esc,
  escAttr,
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  isDemoPatientId
} from "/mobile/js/chunks/chunk-WAILSXBQ.js";
import {
  prefersReducedMotion,
  setAsyncButtonLoading
} from "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import {
  evaluateClinicalScope
} from "/mobile/js/chunks/chunk-K5SBVD6P.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/profile-templates.mjs
var BLANK_NOTA_EVOLUCION = "N: [Neurol\xF3gico]\nV: [Ventilatorio]\nHD: [Hemodin\xE1mico]\nHI: [Infeccioso]\nNM: [Nutricional / Metab\xF3lico]";
var BLANK_NOTA_ESTUDIOS = "FECHA (DD/MM/AA)\nQS\nBH\nEGO\n\nFECHA (DD/MM/AA)\nQS\nBH";
var PROFILE_TEMPLATE_DEFAULTS = {
  defaultNotaEvolucion: BLANK_NOTA_EVOLUCION,
  defaultNotaEstudios: BLANK_NOTA_ESTUDIOS,
  defaultDieta: "",
  defaultCuidados: "",
  defaultMedicamentos: "",
  defaultIndicacionesEstudios: "",
  defaultIndicacionesInterconsultas: ""
};
function ensureProfileTemplateDefaults(st) {
  if (!st || typeof st !== "object") return;
  Object.keys(PROFILE_TEMPLATE_DEFAULTS).forEach(function(key) {
    if (st[key] == null || st[key] === "") {
      st[key] = PROFILE_TEMPLATE_DEFAULTS[key];
    }
  });
}
function resetProfileTemplatesToBlank(st) {
  if (!st || typeof st !== "object") return;
  Object.assign(st, PROFILE_TEMPLATE_DEFAULTS);
}
function applyNotaFormatScaffoldIfEmpty(note, settings) {
  if (!note) return false;
  var st = settings || {};
  var changed = false;
  if (!String(note.evolucion || "").trim() && st.defaultNotaEvolucion) {
    note.evolucion = String(st.defaultNotaEvolucion);
    changed = true;
  }
  if (!String(note.estudios || "").trim() && st.defaultNotaEstudios) {
    note.estudios = String(st.defaultNotaEstudios);
    changed = true;
  }
  return changed;
}
function applyIndicacionesFormatScaffoldIfEmpty(ind, settings) {
  if (!ind) return false;
  var st = settings || {};
  var changed = false;
  var map = [
    ["dieta", "defaultDieta"],
    ["cuidados", "defaultCuidados"],
    ["medicamentos", "defaultMedicamentos"],
    ["estudios", "defaultIndicacionesEstudios"],
    ["interconsultas", "defaultIndicacionesInterconsultas"]
  ];
  map.forEach(function(pair) {
    var field = pair[0];
    var key = pair[1];
    if (!String(ind[field] || "").trim() && st[key]) {
      ind[field] = String(st[key]);
      changed = true;
    }
  });
  return changed;
}

// public/js/profile-formats-editor.mjs
var formatsEditMode = null;
function getFormatsEditMode() {
  return formatsEditMode;
}
function setFormatsEditMode(mode) {
  formatsEditMode = mode;
}
function clearFormatsEditMode() {
  formatsEditMode = null;
}
function editorBanner(title, subtitle) {
  return '<div class="formats-defaults-editor-banner" role="status"><div class="formats-defaults-editor-banner-text"><strong>' + esc(title) + "</strong><p>" + esc(subtitle) + '</p></div><div class="formats-defaults-editor-actions"><button type="button" class="btn-cancel" onclick="exitFormatsEditor()">Volver al expediente</button></div></div>';
}
function editorFooter() {
  return '<div class="formats-defaults-editor-footer"><button type="button" class="btn-save formats-defaults-save-btn" onclick="saveDefaultFormatsFromEditor()">Guardar</button></div>';
}
function buildNoteDefaultsEditorHtml(st) {
  ensureProfileTemplateDefaults(st);
  return '<div class="formats-defaults-editor">' + editorBanner(
    "Formatos por defecto \xB7 Nota de evoluci\xF3n",
    "Misma vista que en el expediente. Estos textos se copian a pacientes nuevos o a secciones vac\xEDas."
  ) + `<div class="card"><div class="card-header card-header--tone-green card-header-row"><span>Evoluci\xF3n y actualizaci\xF3n del cuadro cl\xEDnico</span></div><div class="card-body"><div class="field-group"><textarea id="fmt-default-nota-evolucion" rows="7" placeholder="N: [Neurol\xF3gico]&#10;V: [Ventilatorio]\u2026" oninput="updateDefaultFormatField('notaEvolucion',this.value)">` + esc(st.defaultNotaEvolucion) + `</textarea></div></div></div><div class="card"><div class="card-header card-header--tone-indigo"><span>Resultados de estudios auxiliares</span></div><div class="card-body"><div class="field-group"><textarea id="fmt-default-nota-estudios" rows="9" placeholder="FECHA (DD/MM/AA)&#10;QS&#10;BH\u2026" oninput="updateDefaultFormatField('notaEstudios',this.value)">` + esc(st.defaultNotaEstudios) + "</textarea></div></div></div>" + editorFooter() + "</div>";
}
function buildIndicaDefaultsEditorHtml(st) {
  ensureProfileTemplateDefaults(st);
  var sections = [
    { key: "dieta", label: "Dieta", ph: "Escriba la dieta\u2026", val: st.defaultDieta },
    { key: "cuidados", label: "Cuidados", ph: "Signos vitales, balance\u2026", val: st.defaultCuidados },
    {
      key: "medicamentos",
      label: "Medicamentos",
      ph: "F\xE1rmaco, dosis, v\xEDa\u2026",
      val: st.defaultMedicamentos
    },
    { key: "estudios", label: "Estudios", ph: "BH, QS, EGO\u2026", val: st.defaultIndicacionesEstudios },
    {
      key: "interconsultas",
      label: "Interconsultas",
      ph: "Servicio y motivo\u2026",
      val: st.defaultIndicacionesInterconsultas
    }
  ];
  var body = sections.map(function(s) {
    return '<div class="indica-section formats-defaults-indica-section"><div class="indica-section-header">' + esc(s.label) + '</div><div class="indica-section-body"><textarea id="fmt-default-ind-' + s.key + '" rows="3" placeholder="' + esc(s.ph) + `" oninput="updateDefaultFormatField('` + s.key + `',this.value)">` + esc(s.val) + "</textarea></div></div>";
  }).join("");
  return '<div class="formats-defaults-editor">' + editorBanner(
    "Formatos por defecto \xB7 Indicaciones",
    "Misma vista que en el expediente. Se aplican al abrir indicaciones vac\xEDas de un paciente nuevo."
  ) + body + editorFooter() + "</div>";
}
var draft = {};
function loadDraftFromSettings(st) {
  ensureProfileTemplateDefaults(st);
  draft = {
    notaEvolucion: String(st.defaultNotaEvolucion || ""),
    notaEstudios: String(st.defaultNotaEstudios || ""),
    dieta: String(st.defaultDieta || ""),
    cuidados: String(st.defaultCuidados || ""),
    medicamentos: String(st.defaultMedicamentos || ""),
    estudios: String(st.defaultIndicacionesEstudios || ""),
    interconsultas: String(st.defaultIndicacionesInterconsultas || "")
  };
}
function applyDraftToSettings(st) {
  st.defaultNotaEvolucion = draft.notaEvolucion.trim();
  st.defaultNotaEstudios = draft.notaEstudios.trim();
  st.defaultDieta = draft.dieta.trim();
  st.defaultCuidados = draft.cuidados.trim();
  st.defaultMedicamentos = draft.medicamentos.trim();
  st.defaultIndicacionesEstudios = draft.estudios.trim();
  st.defaultIndicacionesInterconsultas = draft.interconsultas.trim();
}
function updateDefaultFormatField(field, value) {
  if (Object.prototype.hasOwnProperty.call(draft, field)) {
    draft[field] = value;
  }
}
function resetDraftToBlank() {
  draft = {
    notaEvolucion: "",
    notaEstudios: "",
    dieta: "",
    cuidados: "",
    medicamentos: "",
    estudios: "",
    interconsultas: ""
  };
}

// public/js/output-dir-fallback-retry.mjs
async function retryOutputDirFallback(opts) {
  if (typeof opts.onPrompt === "function") opts.onPrompt(opts.error);
  const dir = await opts.selectOutputDir();
  if (!dir) {
    if (typeof opts.onCancel === "function") opts.onCancel(opts.error);
    return { status: "cancelled" };
  }
  if (typeof opts.saveOutputDir === "function") opts.saveOutputDir(dir);
  const retryResponse = await opts.retry(dir);
  if (retryResponse && retryResponse.ok) {
    if (typeof opts.onSuccess === "function") opts.onSuccess(retryResponse);
    return { status: "retried" };
  }
  const retryError = retryResponse && retryResponse.error ? retryResponse.error : opts.error;
  if (typeof opts.onError === "function") opts.onError(retryError);
  return { status: "retry_error" };
}
async function handleOutputDirErrorPath(opts) {
  if (!isOutputDirError(opts.error) || typeof opts.selectOutputDir !== "function") {
    if (typeof opts.onError === "function") opts.onError(opts.error);
    return { status: "error" };
  }
  return retryOutputDirFallback(opts);
}
async function handleOutputDirFallback(opts) {
  var response = opts && opts.response;
  if (response && response.ok) {
    if (typeof opts.onSuccess === "function") opts.onSuccess(response);
    return { status: "ok" };
  }
  var error = response && response.error ? response.error : "No se pudo generar el documento.";
  return handleOutputDirErrorPath({ ...opts, error });
}

// public/js/output-dir-fallback.mjs
function isOutputDirError(message) {
  var text = String(message || "").toLowerCase();
  return text.indexOf("carpeta seleccionada") !== -1 || text.indexOf("no se puede escribir") !== -1 || text.indexOf("ruta de exportaci\xF3n") !== -1 || text.indexOf("eacces") !== -1 || text.indexOf("enoent") !== -1;
}

// public/js/document-export-client.mjs
var DOC_EXPORT_URL_KIND = {
  "/generate": "note",
  "/generate-indicaciones": "indicaciones",
  "/generate-listado": "listado",
  "/generate-censo": "censo",
  "/generate-receta-hu": "receta-hu"
};
function canUseDesktopDocumentIpc() {
  return !!(window.electronAPI && window.electronAPI.generateDocument);
}
function documentKindForUrl(url) {
  return DOC_EXPORT_URL_KIND[String(url || "").split("?")[0]] || null;
}
async function invokeDesktopDocumentExport(kind, payload) {
  const result = await window.electronAPI.generateDocument({ kind, payload });
  if (!result || result.ok === false) {
    const err = new Error(result && result.error || "No se pudo generar el documento.");
    if (result && result.code) err.code = result.code;
    throw err;
  }
  return result;
}
var docExportRt = {
  showToast() {
  },
  getSettings() {
    return {};
  },
  loadSettings() {
  }
};
function registerDocumentExportRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(docExportRt, ctx);
}
function createGuardMobileDocExport(deps) {
  const showToast = deps && deps.showToast;
  return function guardMobileDocExport2() {
    if (!blockIfMobileDocExport()) return false;
    const toast = typeof showToast === "function" ? showToast : docExportRt.showToast;
    if (typeof toast === "function") mobileDocExportToast(toast);
    return true;
  };
}
function guardMobileDocExport(showToast) {
  if (typeof showToast === "function") {
    return createGuardMobileDocExport({ showToast })();
  }
  return createGuardMobileDocExport({ showToast: docExportRt.showToast })();
}
function saveOutputDirSelection(dir, deps) {
  if (!dir) return;
  const getSettings = deps && deps.getSettings || docExportRt.getSettings;
  const loadSettings = deps && deps.loadSettings || docExportRt.loadSettings;
  if (typeof getSettings === "function") {
    getSettings().outputDir = dir;
    localStorage.setItem("rpc-settings", JSON.stringify(getSettings()));
  }
  syncApprovedOutputDir(dir);
  if (typeof loadSettings === "function") loadSettings();
}
function requestDocumentJson(url, payload) {
  const kind = documentKindForUrl(url);
  if (canUseDesktopDocumentIpc() && kind) {
    return invokeDesktopDocumentExport(kind, payload);
  }
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(function(r) {
    return r.json();
  });
}
function getOutputDirSelector() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) return void 0;
  return function() {
    return window.electronAPI.selectOutputDir();
  };
}
function handleDocumentGenerateResponse(opts, deps) {
  const showToast = deps && deps.showToast || docExportRt.showToast;
  const getSettings = deps && deps.getSettings || docExportRt.getSettings;
  const loadSettings = deps && deps.loadSettings || docExportRt.loadSettings;
  return handleOutputDirFallback({
    response: opts.response,
    selectOutputDir: getOutputDirSelector(),
    saveOutputDir: function(dir) {
      saveOutputDirSelection(dir, { getSettings, loadSettings });
    },
    retry: function(dir) {
      return requestDocumentJson(opts.url, opts.buildPayload(dir));
    },
    onSuccess: opts.onSuccess,
    onError: function(message) {
      if (typeof showToast === "function") showToast("Error: " + message, "error");
    },
    onPrompt: function() {
      if (typeof showToast === "function") {
        showToast("Selecciona una carpeta para guardar el documento.", "error");
      }
    },
    onCancel: function() {
      if (typeof showToast === "function") {
        showToast("No se guard\xF3 el documento: no se eligi\xF3 carpeta.", "error");
      }
    }
  });
}
function parseContentDispositionFilename(header) {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return m ? m[1].replace(/"/g, "").trim() : null;
}
async function exportGeneratedDocument({ url, buildPayload, defaultFileName }) {
  const payload = buildPayload();
  const kind = documentKindForUrl(url);
  if (canUseDesktopDocumentIpc() && kind) {
    const result = await invokeDesktopDocumentExport(kind, payload);
    const fileName2 = result.fileName || defaultFileName;
    if (window.electronAPI?.saveExportedDocument) {
      return window.electronAPI.saveExportedDocument({ fileName: fileName2, buffer: result.buffer });
    }
    return { success: true, fileName: fileName2 };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "No se pudo generar el documento.");
  }
  const blob = await res.blob();
  const fileName = parseContentDispositionFilename(res.headers.get("Content-Disposition")) || defaultFileName;
  if (window.electronAPI?.saveExportedDocument) {
    const arrayBuffer = await blob.arrayBuffer();
    return window.electronAPI.saveExportedDocument({ fileName, buffer: arrayBuffer });
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  return { success: true, fileName };
}
async function persistSelectedOutputDir(dir, opts) {
  if (typeof opts.saveOutputDir === "function") opts.saveOutputDir(dir);
  if (window.electronAPI?.setApprovedOutputDir) {
    await window.electronAPI.setApprovedOutputDir(dir);
  }
}
async function retryExportAfterOutputDirPrompt(opts, message) {
  if (typeof opts.onPrompt === "function") opts.onPrompt(message);
  const dir = await opts.selectOutputDir();
  if (!dir) {
    if (typeof opts.onCancel === "function") opts.onCancel(message);
    return { status: "cancelled" };
  }
  await persistSelectedOutputDir(dir, opts);
  return exportWithOutputDirFallback(opts);
}
async function exportWithOutputDirFallback(opts) {
  try {
    const result = await exportGeneratedDocument(opts);
    if (typeof opts.onSuccess === "function") opts.onSuccess(result);
    return result;
  } catch (e) {
    const message = e && e.message ? e.message : String(e);
    if (typeof opts.selectOutputDir === "function" && isOutputDirError(message)) {
      return retryExportAfterOutputDirPrompt(opts, message);
    }
    if (typeof opts.onError === "function") opts.onError(message);
    throw e;
  }
}
function canGenerateDocumentsOffline() {
  return canUseDesktopDocumentIpc();
}
function shouldShowLocalServerOfflineBanner(isRpcOffline) {
  return !!isRpcOffline && !canGenerateDocumentsOffline();
}
function isDocExportBlockedByLocalServer(isRpcOffline) {
  return shouldShowLocalServerOfflineBanner(isRpcOffline);
}
function guardDocExportBlocked(deps) {
  const offlineFn = deps && deps.isRpcOffline;
  const isOffline = typeof offlineFn === "function" ? offlineFn() : false;
  if (!isDocExportBlockedByLocalServer(isOffline)) return false;
  const toast = deps && deps.showToast || docExportRt.showToast;
  if (typeof toast === "function") {
    toast("Sin conexi\xF3n con el servidor local. Reinicia R+ para generar documentos.", "error");
  }
  return true;
}
function syncApprovedOutputDir(dir) {
  if (window.electronAPI?.setApprovedOutputDir) {
    return window.electronAPI.setApprovedOutputDir(dir || "");
  }
  return Promise.resolve({ ok: false });
}

// public/js/features/notes-indicaciones.mjs
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
  showToast() {
  },
  syncOfflineButtonStates() {
  },
  guardMobileDocExport() {
    return false;
  },
  isRpcOffline() {
    return false;
  },
  incrementPendingJobs() {
  },
  decrementPendingJobs() {
  },
  requestDocumentJson() {
    return Promise.resolve(null);
  },
  handleDocumentGenerateResponse() {
    return Promise.resolve(null);
  },
  guidedTourAdvanceAfterNotaGenerated() {
  },
  guidedTourAdvanceAfterIndicaGenerated() {
  },
  onPitchTourDocFailed() {
  },
  addAuditEntry() {
  }
};
function registerNotesIndicacionesRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt2, ctx);
}
function aid() {
  return rt2.getActiveId();
}
function applyProfileToNoteIfEmpty(note) {
  if (!note) return false;
  var changed = false;
  if ((rt2.getSettings() || {}).doctorName && !String(note.medico || "").trim()) {
    note.medico = (rt2.getSettings() || {}).doctorName;
    changed = true;
  }
  if ((rt2.getSettings() || {}).profesorName && !String(note.profesor || "").trim()) {
    note.profesor = (rt2.getSettings() || {}).profesorName;
    changed = true;
  }
  return changed;
}
function renderNoteForm() {
  if (getFormatsEditMode() === "nota") {
    var st = rt2.getSettings() || {};
    loadDraftFromSettings(st);
    document.getElementById("note-form").innerHTML = buildNoteDefaultsEditorHtml(st);
    return;
  }
  var patient = getPatients().find(function(p) {
    return String(p.id) === String(aid());
  });
  if (!patient) return;
  if (aid()) {
    if (!getNotes()[aid()]) getNotes()[aid()] = {};
    var changed = applyProfileToNoteIfEmpty(getNotes()[aid()]);
    if (applyNotaFormatScaffoldIfEmpty(getNotes()[aid()], rt2.getSettings() || {})) changed = true;
    if (changed) persistClinicalState();
  }
  var note = getNotes()[aid()] || {};
  var pid = aid();
  if (pid) {
    var pat = getPatients().find(function(p) {
      return String(p.id) === String(pid);
    });
    if (pat && preloadNoteDxFromPatient(note, pat)) persistClinicalState();
  }
  document.getElementById("note-form").innerHTML = '<div class="card"><div class="card-header card-header--tone-slate"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="field-group"><label>Fecha</label><input type="text" value="' + esc(note.fecha) + `" oninput="updateNote('fecha',this.value)" placeholder="DD/MM/AAAA"></div><div class="field-group"><label>Hora</label><input type="text" value="` + esc(note.hora) + `" oninput="updateNote('hora',this.value)" placeholder="HH:MM"></div></div></div></div><div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Resumen de Interrogatorio, Exploraci\xF3n F\xEDsica y Estado Mental</div><div class="card-body"><div class="field-group"><textarea rows="5" placeholder="Ingresa el resumen de interrogatorio, exploraci\xF3n f\xEDsica y estado mental..." oninput="updateNote('interrogatorio',this.value)">` + esc(note.interrogatorio) + `</textarea></div></div></div><div class="card"><div class="card-header card-header--tone-green"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Evoluci\xF3n y Actualizaci\xF3n del Cuadro Cl\xEDnico</div><div class="card-body"><div class="field-group"><textarea rows="7" placeholder="Estructura N / V / HD / HI / NM. Edita los formatos en Mi Perfil." oninput="updateNote('evolucion',this.value)">` + esc(note.evolucion) + `</textarea></div></div></div><div class="card"><div class="card-header card-header--tone-indigo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>Resultados de Estudios Auxiliares</div><div class="card-body"><div class="field-group"><textarea rows="9" placeholder="FECHA (DD/MM/AA)&#10;QS&#10;BH&#10;EGO&#10;(una l\xEDnea por rengl\xF3n; sin valores de ejemplo)" oninput="updateNote('estudios',this.value)">` + esc(note.estudios) + '</textarea></div></div></div><div class="card"><div class="card-header card-header--tone-rose card-header-row"><span style="display:flex;align-items:center;gap:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>Diagn\xF3stico(s)</span><button type="button" class="card-header-ghost-btn" onclick="syncNoteDxFromCenso()" title="Traer diagn\xF3sticos del censo del paciente a la nota">Desde censo</button></div><div class="card-body"><div class="list-rows" id="dx-list">' + (note.diagnosticos || [""]).map(function(dx, i) {
    return '<div class="list-row"><input type="text" value="' + esc(dx) + '" placeholder="Diagn\xF3stico ' + (i + 1) + '" oninput="updateDx(' + i + ',this.value)" style="text-transform:uppercase;"><button class="btn-remove" onclick="removeDx(' + i + ')"' + ((note.diagnosticos || [""]).length <= 1 ? ' style="visibility:hidden"' : "") + ' aria-label="Eliminar">\xD7</button></div>';
  }).join("") + '</div><button class="btn-add-row" onclick="addDx()">+ Agregar diagn\xF3stico</button></div></div><div class="card"><div class="card-header card-header--tone-amber"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Signos Vitales</div><div class="card-body"><div class="vitals-grid"><div class="vital-box"><div class="vital-label">T.A.</div><input type="text" value="' + esc(note.ta) + `" placeholder="120/80" oninput="updateNote('ta',this.value)"></div><div class="vital-box"><div class="vital-label">F.R.</div><input type="text" value="` + esc(note.fr) + `" placeholder="16" oninput="updateNote('fr',this.value)"></div><div class="vital-box"><div class="vital-label">F.C.</div><input type="text" value="` + esc(note.fc) + `" placeholder="72" oninput="updateNote('fc',this.value)"></div><div class="vital-box"><div class="vital-label">Temperatura</div><input type="text" value="` + esc(note.temp) + `" placeholder="36.6" oninput="updateNote('temp',this.value)"></div><div class="vital-box"><div class="vital-label">Peso (kg)</div><input type="text" value="` + esc(note.peso) + `" placeholder="70.0" oninput="updateNote('peso',this.value)"></div></div></div></div><div class="card"><div class="card-header card-header--tone-teal"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>Tratamiento e Indicaciones M\xE9dicas</div><div class="card-body"><div class="list-rows" id="tx-list">` + (note.tratamiento || [""]).map(function(tx, i) {
    return '<div class="list-row"><span class="list-num">' + (i + 1) + '.</span><input type="text" value="' + esc(tx) + '" placeholder="Indicaci\xF3n, dosis, v\xEDa y periodicidad" oninput="updateTx(' + i + ',this.value)"><button class="btn-remove" onclick="removeTx(' + i + ')"' + ((note.tratamiento || [""]).length <= 1 ? ' style="visibility:hidden"' : "") + ' aria-label="Eliminar">\xD7</button></div>';
  }).join("") + '</div><button class="btn-add-row" onclick="addTx()">+ Agregar indicaci\xF3n</button></div></div><div class="card"><div class="card-header card-header--tone-violet"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>M\xE9dico y Profesor</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="field-group"><label>M\xE9dico Tratante</label><input type="text" value="' + esc(note.medico) + `" placeholder="Nombre completo" oninput="updateNote('medico',this.value)"></div><div class="field-group"><label>Profesor Responsable</label><input type="text" value="` + esc(note.profesor) + `" placeholder="Nombre completo" oninput="updateNote('profesor',this.value)"></div></div></div></div><div class="action-bar"><button type="button" class="btn-med-secondary rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-note"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida r\xE1pida</button><button type="button" class="btn-generate rpc-doc-export" onclick="generateWord()" id="btn-gen"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Nota (.docx)</button></div>`;
  rt2.syncOfflineButtonStates();
}
function updateNote(field, value) {
  if (!getNotes()[aid()]) getNotes()[aid()] = {};
  getNotes()[aid()][field] = value;
  persistClinicalState();
}
function updateDx(i, val) {
  if (!getNotes()[aid()]) return;
  getNotes()[aid()].diagnosticos[i] = val.toUpperCase();
  persistClinicalState();
}
function addDx() {
  if (!getNotes()[aid()]) return;
  getNotes()[aid()].diagnosticos.push("");
  persistClinicalState();
  renderNoteForm();
}
function removeDx(i) {
  if (!getNotes()[aid()] || getNotes()[aid()].diagnosticos.length <= 1) return;
  getNotes()[aid()].diagnosticos.splice(i, 1);
  persistClinicalState();
  renderNoteForm();
}
async function syncNoteDxFromCenso() {
  var pid = aid();
  if (!pid || !getNotes()[pid]) return;
  var pat = getPatients().find(function(p) {
    return String(p.id) === String(pid);
  });
  if (!pat) return;
  var note = getNotes()[pid];
  var hasNoteDx = (note.diagnosticos || []).some(function(d) {
    return String(d).trim();
  });
  if (hasNoteDx) {
    var result = await openConfirm({
      weight: "consequence",
      title: "\xBFReemplazar los diagn\xF3sticos de la nota con los del censo del paciente?",
      confirmLabel: "Reemplazar"
    });
    if (result !== "confirm") return;
  }
  if (!syncNoteDxFromPatient(note, pat, { mode: "replace" })) {
    rt2.showToast("No hay diagn\xF3sticos en el censo de este paciente.", "info");
    return;
  }
  persistClinicalState();
  renderNoteForm();
  rt2.showToast("Diagn\xF3sticos del censo en la nota \u2713", "success");
}
function updateTx(i, val) {
  if (!getNotes()[aid()]) return;
  getNotes()[aid()].tratamiento[i] = val;
  persistClinicalState();
}
function addTx() {
  if (!getNotes()[aid()]) return;
  getNotes()[aid()].tratamiento.push("");
  persistClinicalState();
  renderNoteForm();
}
function removeTx(i) {
  if (!getNotes()[aid()] || getNotes()[aid()].tratamiento.length <= 1) return;
  getNotes()[aid()].tratamiento.splice(i, 1);
  persistClinicalState();
  renderNoteForm();
}
function generateWord() {
  if (rt2.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt2.isRpcOffline, showToast: rt2.showToast })) return;
  var patient = getPatients().find(function(p) {
    return p.id === aid();
  });
  if (!patient) return;
  var note = getNotes()[aid()];
  if (!note) return;
  if (ensureNoteDxFromPatientForExport(note, patient)) persistClinicalState();
  var btn = document.getElementById("btn-gen");
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Generando\u2026" });
  rt2.incrementPendingJobs();
  function buildPayload() {
    return { patient, note };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) return Promise.resolve(void 0);
    return window.electronAPI.selectOutputDir();
  }
  function saveOutputDir(dir) {
    if (!dir) return;
    var st = rt2.getSettings() || {};
    st.outputDir = dir;
    localStorage.setItem("rpc-settings", JSON.stringify(st));
    syncApprovedOutputDir(dir);
  }
  exportWithOutputDirFallback({
    url: "/generate",
    buildPayload,
    defaultFileName: "nota.docx",
    selectOutputDir,
    saveOutputDir,
    onSuccess: function(data) {
      var name = data && (data.fileName || data.path) ? data.fileName || String(data.path).split(/[/\\]/).pop() : "nota.docx";
      rt2.showToast("Nota guardada: " + name, "success");
      rt2.guidedTourAdvanceAfterNotaGenerated();
    },
    onPrompt: function() {
      rt2.showToast("Selecciona una carpeta para guardar el documento.", "error");
    },
    onCancel: function() {
      rt2.showToast("No se guard\xF3 el documento: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(msg) {
      rt2.showToast("Error: " + msg, "error");
    }
  }).catch(function() {
    rt2.showToast("Error de conexi\xF3n", "error");
    if (typeof rt2.onPitchTourDocFailed === "function") rt2.onPitchTourDocFailed("ic_nota");
  }).finally(function() {
    setAsyncButtonLoading(document.getElementById("btn-gen"), false);
    rt2.decrementPendingJobs();
    rt2.syncOfflineButtonStates();
  });
}
function renderIndicaForm() {
  if (getFormatsEditMode() === "indica") {
    var st = rt2.getSettings() || {};
    loadDraftFromSettings(st);
    document.getElementById("indica-form").innerHTML = buildIndicaDefaultsEditorHtml(st);
    return;
  }
  if (!getPatients().some(function(p) {
    return p.id === aid();
  })) return;
  if (!getIndicaciones()[aid()]) {
    var today = /* @__PURE__ */ new Date();
    getIndicaciones()[aid()] = { fecha: String(today.getDate()).padStart(2, "0") + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + today.getFullYear(), hora: String(today.getHours()).padStart(2, "0") + ":" + String(today.getMinutes()).padStart(2, "0"), medicos: "", dieta: "", cuidados: "", estudios: "", medicamentos: "", interconsultas: "", otros: [] };
    applyIndicacionesFormatScaffoldIfEmpty(getIndicaciones()[aid()], rt2.getSettings() || {});
    persistClinicalState();
  }
  var ind = getIndicaciones()[aid()];
  var SECTIONS = [
    { key: "dieta", label: "Dieta", placeholder: "Escriba la dieta (una indicaci\xF3n por l\xEDnea si aplica)\u2026" },
    { key: "cuidados", label: "Cuidados", placeholder: "Signos vitales, balance, dispositivos, etc.\u2026" },
    { key: "estudios", label: "Estudios", placeholder: "BH, QS, EGO, im\xE1genes\u2026" },
    { key: "medicamentos", label: "Medicamentos", placeholder: "F\xE1rmaco, dosis, v\xEDa y horario\u2026" },
    { key: "interconsultas", label: "Interconsultas", placeholder: "Servicio y motivo de interconsulta\u2026" }
  ];
  document.getElementById("indica-form").innerHTML = '<div class="indica-meta-bar" role="group" aria-label="Fecha, hora y m\xE9dicos"><div class="field-group indica-meta-field"><label>Fecha</label><input type="text" value="' + esc(ind.fecha) + `" placeholder="DD/MM/AAAA" oninput="updateIndica('fecha',this.value)"></div><div class="field-group indica-meta-field"><label>Hora</label><input type="text" value="` + esc(ind.hora) + `" placeholder="HH:MM" oninput="updateIndica('hora',this.value)"></div><div class="field-group indica-meta-field indica-meta-field--medicos"><label>M\xE9dicos</label><textarea rows="2" placeholder="R3 NOMBRE APELLIDO" oninput="updateIndica('medicos',this.value)">` + esc(ind.medicos) + "</textarea></div></div>" + buildExtraTemplatesSelectorHtml() + SECTIONS.map(function(s) {
    return '<div class="indica-section"><div class="indica-section-header">' + s.label + '</div><div class="indica-section-body"><textarea rows="3" placeholder="' + s.placeholder + `" oninput="updateIndica('` + s.key + `',this.value)">` + esc(ind[s.key]) + "</textarea></div></div>";
  }).join("") + '<div class="card"><div class="card-header card-header--tone-violet"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>Otros</div><div class="card-body" style="display:flex;flex-direction:column;gap:10px;"><div id="otros-list">' + (ind.otros || []).map(function(o, i) {
    return '<div class="otros-item"><button class="btn-remove-otro" onclick="removeOtro(' + i + ')">\xD7</button><input type="text" placeholder="T\xCDTULO DE LA SECCI\xD3N" value="' + esc(o.titulo) + '" oninput="updateOtro(' + i + `,'titulo',this.value)"><textarea rows="2" placeholder="Indicaciones..." oninput="updateOtro(` + i + `,'contenido',this.value)">` + esc(o.contenido) + "</textarea></div>";
  }).join("") + '</div><button class="btn-add-row" onclick="addOtro()">+ Agregar secci\xF3n</button></div></div><div class="action-bar"><button type="button" class="btn-med-secondary rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-indica"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida r\xE1pida</button><button type="button" class="btn-generate rpc-doc-export" onclick="generateIndicaciones()" id="btn-gen-ind"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Indicaciones (.docx)</button></div>';
  rt2.syncOfflineButtonStates();
}
function updateIndica(field, value) {
  if (!getIndicaciones()[aid()]) return;
  getIndicaciones()[aid()][field] = value;
  persistClinicalState();
}
function updateOtro(i, field, value) {
  if (!getIndicaciones()[aid()]) return;
  getIndicaciones()[aid()].otros[i][field] = value;
  persistClinicalState();
}
function addOtro() {
  if (!getIndicaciones()[aid()]) return;
  getIndicaciones()[aid()].otros = getIndicaciones()[aid()].otros || [];
  getIndicaciones()[aid()].otros.push({ titulo: "", contenido: "" });
  persistClinicalState();
  renderIndicaForm();
}
function removeOtro(i) {
  if (!getIndicaciones()[aid()]) return;
  getIndicaciones()[aid()].otros.splice(i, 1);
  persistClinicalState();
  renderIndicaForm();
}
function buildExtraTemplatesSelectorHtml() {
  var arr = (rt2.getSettings() || {}) && Array.isArray((rt2.getSettings() || {}).extraTemplates) ? (rt2.getSettings() || {}).extraTemplates : [];
  var predBtn = '<button type="button" class="btn-med-secondary" onclick="openIndicaFormatsFromProfile()" title="Editar formatos en blanco de indicaciones">Predeterminados\u2026</button>';
  if (!arr.length) {
    return '<div class="indica-extra-tmpl">' + predBtn + '<span class="iet-hint">Plantillas guardadas: Ajustes \u2192 Plantillas. Formatos en blanco: Predeterminados\u2026</span></div>';
  }
  var opts = '<option value="">\u2014 Aplicar plantilla guardada \u2014</option>' + arr.map(function(t) {
    return '<option value="' + esc(t.id) + '">' + esc(t.label || "(sin nombre)") + "</option>";
  }).join("");
  return '<div class="indica-extra-tmpl">' + predBtn + '<select id="indica-extra-tmpl-select" aria-label="Seleccionar plantilla guardada">' + opts + '</select><button type="button" onclick="applyExtraTemplateFromIndica()">Aplicar</button></div>';
}
function indicaHasExistingContent(target) {
  return target.dieta && target.dieta.trim() || target.cuidados && target.cuidados.trim() || target.medicamentos && target.medicamentos.trim();
}
function resolveExtraTemplateMergeMode(hasExisting) {
  if (!hasExisting) return "replace";
  var ans = prompt(
    "Ya hay contenido en las indicaciones.\nEscribe R = reemplazar, A = agregar al final, C = cancelar.",
    "A"
  );
  var v = String(ans || "").trim().toUpperCase();
  if (v === "C" || v === "") return null;
  return v === "R" ? "replace" : "append";
}
function mergeIndicaField(current, addition, mode) {
  if (!addition) return current || "";
  if (mode === "replace") return addition;
  if (!current) return addition;
  return current.replace(/\s+$/, "") + "\n" + addition;
}
function applyIndicaTemplateFields(target, tmpl, mode) {
  target.dieta = mergeIndicaField(target.dieta || "", tmpl.dieta || "", mode);
  target.cuidados = mergeIndicaField(target.cuidados || "", tmpl.cuidados || "", mode);
  target.medicamentos = mergeIndicaField(target.medicamentos || "", tmpl.medicamentos || "", mode);
}
function applyExtraTemplateFromIndica() {
  var sel = document.getElementById("indica-extra-tmpl-select");
  if (!sel || !sel.value) {
    rt2.showToast("Elige una plantilla", "error");
    return;
  }
  if (!aid() || !getIndicaciones()[aid()]) {
    rt2.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var tmpl = ((rt2.getSettings() || {}).extraTemplates || []).find(function(t) {
    return t.id === sel.value;
  });
  if (!tmpl) return;
  var target = getIndicaciones()[aid()];
  var mode = resolveExtraTemplateMergeMode(indicaHasExistingContent(target));
  if (!mode) return;
  applyIndicaTemplateFields(target, tmpl, mode);
  persistClinicalState();
  renderIndicaForm();
  rt2.addAuditEntry("extra-template-apply", "ok", 1, tmpl.label || "");
  rt2.showToast("Plantilla aplicada: " + (tmpl.label || ""), "success");
}
function generateIndicaciones() {
  if (rt2.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt2.isRpcOffline, showToast: rt2.showToast })) return;
  var patient = getPatients().find(function(p) {
    return p.id === aid();
  });
  if (!patient) return;
  var ind = getIndicaciones()[aid()];
  if (!ind) return;
  var btn = document.getElementById("btn-gen-ind");
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Generando\u2026" });
  rt2.incrementPendingJobs();
  function buildPayload() {
    return { patient, indicaciones: ind };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) return Promise.resolve(void 0);
    return window.electronAPI.selectOutputDir();
  }
  function saveOutputDir(dir) {
    if (!dir) return;
    var st = rt2.getSettings() || {};
    st.outputDir = dir;
    localStorage.setItem("rpc-settings", JSON.stringify(st));
    syncApprovedOutputDir(dir);
  }
  exportWithOutputDirFallback({
    url: "/generate-indicaciones",
    buildPayload,
    defaultFileName: "indicaciones.docx",
    selectOutputDir,
    saveOutputDir,
    onSuccess: function(data) {
      var name = data && (data.fileName || data.path) ? data.fileName || String(data.path).split(/[/\\]/).pop() : "indicaciones.docx";
      rt2.showToast("Indicaciones guardadas: " + name, "success");
      rt2.guidedTourAdvanceAfterIndicaGenerated();
    },
    onPrompt: function() {
      rt2.showToast("Selecciona una carpeta para guardar el documento.", "error");
    },
    onCancel: function() {
      rt2.showToast("No se guard\xF3 el documento: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(msg) {
      rt2.showToast("Error: " + msg, "error");
    }
  }).catch(function() {
    rt2.showToast("Error de conexi\xF3n", "error");
    if (typeof rt2.onPitchTourDocFailed === "function") rt2.onPitchTourDocFailed("ic_indica");
  }).finally(function() {
    setAsyncButtonLoading(document.getElementById("btn-gen-ind"), false);
    rt2.decrementPendingJobs();
    rt2.syncOfflineButtonStates();
  });
}
var windowHandlers = {
  updateNote,
  updateDx,
  addDx,
  removeDx,
  updateTx,
  addTx,
  removeTx,
  syncNoteDxFromCenso,
  generateWord,
  renderIndicaForm,
  updateIndica,
  updateOtro,
  addOtro,
  removeOtro,
  generateIndicaciones,
  applyExtraTemplateFromIndica
};

// public/js/patient-list-display-key.mjs
function roundSeenBit(p, ctx) {
  if (!ctx.isRonda || typeof ctx.isRoundSeen !== "function") return 0;
  return ctx.isRoundSeen(String(p.id || "")) ? 1 : 0;
}
function activeBit(p, ctx) {
  return String(ctx.activeId || "") === String(p.id || "") ? 1 : 0;
}
function servicioCardBit(p, ctx) {
  if (!ctx.showServicioInCard) return "";
  return String(p.servicio || "");
}
function patientCardDisplayKey(p, ctx = {}) {
  return [
    String(p.id || ""),
    String(p.nombre || ""),
    String(p.cuarto || ""),
    String(p.cama || ""),
    servicioCardBit(p, ctx),
    ctx.showServicioInCard ? 1 : 0,
    p.pinned ? 1 : 0,
    p.archived ? 1 : 0,
    roundSeenBit(p, ctx),
    activeBit(p, ctx)
  ].join("");
}

// public/js/patient-list-incremental.mjs
function sortZoneByBed(rows) {
  return rows.slice().sort(comparePatientsByBed);
}
function buildPatientListZones(filtered, options) {
  const opts = options && typeof options === "object" ? options : {};
  const zones = {
    pinned: filtered.filter((p) => p.pinned && !p.archived),
    active: filtered.filter((p) => !p.pinned && !p.archived),
    archived: filtered.filter((p) => !!p.archived)
  };
  if (opts.sortByBed) {
    zones.pinned = sortZoneByBed(zones.pinned);
    zones.active = sortZoneByBed(zones.active);
    zones.archived = sortZoneByBed(zones.archived);
  }
  return zones;
}
function buildRondaNavIds(zones) {
  const out = [];
  zones.pinned.forEach((p) => out.push(String(p.id)));
  zones.active.forEach((p) => out.push(String(p.id)));
  zones.archived.forEach((p) => out.push(String(p.id)));
  return out;
}
function structureSignature(zones, archivedCollapsed) {
  const parts = [];
  if (zones.pinned.length) parts.push(`p:${zoneIds(zones.pinned)}`);
  if (zones.active.length) parts.push(`a:${zoneIds(zones.active)}`);
  if (zones.archived.length) parts.push(`at:${archivedCollapsed ? 1 : 0}:${zoneIds(zones.archived)}`);
  return parts.join("|");
}
function zoneIds(rows) {
  return rows.map((p) => String(p.id || "")).join(",");
}
function cardIds(zoneEl) {
  return Array.from(zoneEl.querySelectorAll(".patient-card[data-patient-id]")).map(
    (el) => String(el.getAttribute("data-patient-id") || "")
  );
}
function readVirtualPatientListStructure(list, _archivedCollapsed) {
  const parts = [];
  const pinned = list.querySelector('.patient-sort-zone[data-patient-zone="pinned"]');
  if (pinned) parts.push(`p:${cardIds(pinned).join(",")}`);
  const active = list.querySelector('.patient-sort-zone--virtual-active[data-patient-zone="active"]');
  if (active) parts.push(`a:${active.getAttribute("data-active-ids") || ""}`);
  const archived = list.querySelector('.patient-sort-zone[data-patient-zone="archived"]');
  const toggle = list.querySelector(".patient-list-section-toggle");
  if (toggle || archived) {
    const collapsed = toggle && !archived ? 1 : 0;
    parts.push(`at:${collapsed}:${archived ? cardIds(archived).join(",") : ""}`);
  }
  return parts.join("|");
}
function readStructureSignature(list) {
  const parts = [];
  const pinned = list.querySelector('.patient-sort-zone[data-patient-zone="pinned"]');
  if (pinned) parts.push(`p:${cardIds(pinned).join(",")}`);
  const active = list.querySelector('.patient-sort-zone[data-patient-zone="active"]');
  if (active) parts.push(`a:${cardIds(active).join(",")}`);
  const archived = list.querySelector('.patient-sort-zone[data-patient-zone="archived"]');
  const toggle = list.querySelector(".patient-list-section-toggle");
  if (toggle || archived) {
    const collapsed = toggle && !archived ? 1 : 0;
    parts.push(`at:${collapsed}:${archived ? cardIds(archived).join(",") : ""}`);
  }
  return parts.join("|");
}
function htmlToElement(html) {
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  return wrap.firstElementChild;
}
function virtualPatientListStructureSignature(zones, archivedCollapsed) {
  return structureSignature(zones, archivedCollapsed);
}
function syncZoneCards(zoneEl, rows, renderCard, ctx) {
  const existing = /* @__PURE__ */ new Map();
  zoneEl.querySelectorAll(".patient-card[data-patient-id]").forEach((el) => {
    existing.set(String(el.getAttribute("data-patient-id") || ""), el);
  });
  const frag = document.createDocumentFragment();
  rows.forEach((p) => {
    const id = String(p.id || "");
    const key = patientCardDisplayKey(p, ctx);
    let el = existing.get(id);
    if (el && el.getAttribute("data-display-key") === key) {
      existing.delete(id);
      frag.appendChild(el);
      return;
    }
    if (el) el.remove();
    const next = htmlToElement(renderCard(p));
    if (!next) return;
    next.setAttribute("data-display-key", key);
    frag.appendChild(next);
  });
  zoneEl.replaceChildren(frag);
}
function syncSectionCounts(list, zones) {
  const pinnedCount = list.querySelector(
    ".patient-list-section-label--pinned .patient-list-section-count"
  );
  if (pinnedCount) pinnedCount.textContent = String(zones.pinned.length);
  const activeLabel = list.querySelector(
    ".patient-list-section-label:not(.patient-list-section-label--pinned) .patient-list-section-count"
  );
  if (activeLabel) activeLabel.textContent = String(zones.active.length);
  const archivedToggle = list.querySelector(".patient-list-section-toggle");
  if (archivedToggle && zones.archived.length) {
    archivedToggle.innerHTML = `Archivados <span>(${zones.archived.length})</span> <span>${archivedToggle.getAttribute("aria-expanded") === "true" ? "\u25BC" : "\u25B6"}</span>`;
  }
}
function trySilentPatientListPatch(list, options) {
  if (!list || options.patientSearchFilter) return false;
  if (!list.querySelector(".patient-card[data-patient-id]")) return false;
  const zones = options.zones;
  const desired = structureSignature(zones, options.archivedCollapsed);
  const current = readStructureSignature(list);
  if (desired !== current) return false;
  syncSectionCounts(list, zones);
  const ctx = options.ctx || {};
  for (const zoneName of ["pinned", "active", "archived"]) {
    const zoneEl = list.querySelector(`.patient-sort-zone[data-patient-zone="${zoneName}"]`);
    if (!zoneEl || !zones[zoneName].length) continue;
    syncZoneCards(zoneEl, zones[zoneName], options.renderCard, ctx);
  }
  if (typeof options.onRondaNav === "function") options.onRondaNav(zones);
  return true;
}
function removeNonStructuralPatientListNodes(list) {
  list.querySelectorAll(":scope > *").forEach((node) => {
    if (node instanceof HTMLElement && (node.classList.contains("patient-list-section-label") || node.classList.contains("patient-sort-zone") || node.classList.contains("patient-list-section-toggle"))) {
      return;
    }
    node.remove();
  });
}
function appendPatientZoneSection(frag, labelHtml, zoneName, zoneClass) {
  frag.appendChild(htmlToElement(labelHtml));
  const zone = document.createElement("div");
  zone.className = zoneClass || "patient-sort-zone";
  zone.setAttribute("data-patient-zone", zoneName);
  frag.appendChild(zone);
}
function buildIncrementalPatientListFragment(zones, options) {
  const frag = document.createDocumentFragment();
  if (zones.pinned.length) {
    appendPatientZoneSection(frag, options.renderPinnedLabel(), "pinned");
  }
  if (zones.active.length) {
    const zoneClass = options.virtualizeActive ? "patient-sort-zone patient-sort-zone--virtual-active" : "patient-sort-zone";
    appendPatientZoneSection(frag, options.renderActiveLabel(), "active", zoneClass);
  }
  if (zones.archived.length) {
    frag.appendChild(
      htmlToElement(options.renderArchivedToggle(options.archivedCollapsed, zones.archived.length))
    );
    if (!options.archivedCollapsed) {
      appendPatientZoneSection(frag, "", "archived");
    }
  }
  return frag;
}
function updatePatientListDomIncremental(list, options) {
  if (!list) return false;
  const zones = options.zones;
  const hasPatients = zones.pinned.length || zones.active.length || zones.archived.length;
  if (!hasPatients) return false;
  removeNonStructuralPatientListNodes(list);
  const ctx = options.ctx || {};
  const frag = buildIncrementalPatientListFragment(zones, options);
  const keep = Array.from(
    list.querySelectorAll(
      ".patient-list-section-label, .patient-sort-zone, .patient-list-section-toggle"
    )
  );
  keep.forEach((el) => el.remove());
  list.appendChild(frag);
  for (const zoneName of ["pinned", "active", "archived"]) {
    const zoneEl = list.querySelector(`.patient-sort-zone[data-patient-zone="${zoneName}"]`);
    if (!zoneEl || !zones[zoneName].length) continue;
    if (zoneName === "active" && options.virtualizeActive) continue;
    syncZoneCards(zoneEl, zones[zoneName], options.renderCard, ctx);
  }
  list.classList.toggle("patient-list--ronda", !!options.isRonda);
  if (typeof options.onRondaNav === "function") options.onRondaNav(zones);
  return true;
}

// public/js/virtual-scroll-pool.mjs
function releaseVirtualNode(el, pool) {
  el.replaceChildren();
  el.removeAttribute("data-virtual-index");
  el.remove();
  pool.push(el);
}
function copyRenderedNode(target, source) {
  target.replaceChildren(...source.childNodes);
  target.className = source.className;
  for (const attr of source.attributes) {
    target.setAttribute(attr.name, attr.value);
  }
  source.remove();
  return target;
}
function mountVirtualNode({
  index,
  itemHeight,
  currentItems,
  renderItem,
  pool,
  inner,
  activeNodes
}) {
  const top = index * itemHeight;
  const rendered = renderItem({ item: currentItems[index], index, top });
  const pooled = pool.pop();
  const el = pooled ? copyRenderedNode(pooled, rendered) : rendered;
  el.style.position = "absolute";
  el.style.top = `${top}px`;
  el.style.left = "0";
  el.style.right = "0";
  el.style.boxSizing = "border-box";
  el.dataset.virtualIndex = String(index);
  inner.appendChild(el);
  activeNodes.set(index, el);
  return el;
}
function pruneVirtualNodes(activeNodes, next, releaseNode) {
  for (const [index, el] of activeNodes) {
    if (index < next.startIndex || index > next.endIndex) {
      activeNodes.delete(index);
      releaseNode(el);
    }
  }
}
function updateVisibleVirtualNodes({
  next,
  itemHeight,
  currentItems: _currentItems,
  activeNodes,
  mountNode
}) {
  for (let i = next.startIndex; i <= next.endIndex; i += 1) {
    const top = i * itemHeight;
    const existing = activeNodes.get(i);
    if (existing) {
      existing.style.top = `${top}px`;
      continue;
    }
    mountNode(i);
  }
}

// public/js/virtual-scroll-range.mjs
function computeVisibleRange({
  scrollTop,
  itemCount,
  itemHeight,
  viewportHeight,
  overscan
}) {
  if (itemCount <= 0 || itemHeight <= 0) {
    return { startIndex: 0, endIndex: -1, offsetTop: 0, totalHeight: 0 };
  }
  const totalHeight = itemCount * itemHeight;
  const maxScroll = Math.max(0, totalHeight - Math.max(0, viewportHeight));
  const safeScroll = Math.max(0, Math.min(scrollTop, maxScroll));
  const firstVisible = Math.min(itemCount - 1, Math.floor(safeScroll / itemHeight));
  const lastVisible = Math.min(
    itemCount - 1,
    Math.floor((safeScroll + Math.max(0, viewportHeight) - 1) / itemHeight)
  );
  const startIndex = Math.max(0, firstVisible - overscan);
  const endIndex = Math.min(itemCount - 1, lastVisible + overscan);
  const offsetTop = startIndex * itemHeight;
  return { startIndex, endIndex, offsetTop, totalHeight };
}

// public/js/virtual-scroll-controller.mjs
function createVirtualScrollApi(state2) {
  const { container, inner, activeNodes, pool, itemHeight, releaseNode } = state2;
  let { currentItems, rafId, range } = state2;
  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      renderRange();
    });
  }
  function renderRange() {
    const next = computeVisibleRange({
      scrollTop: container.scrollTop,
      itemCount: currentItems.length,
      itemHeight,
      viewportHeight: container.clientHeight,
      overscan: state2.overscan
    });
    inner.style.height = `${next.totalHeight}px`;
    range = next;
    if (next.endIndex < next.startIndex) {
      for (const el of activeNodes.values()) releaseNode(el);
      activeNodes.clear();
      return;
    }
    pruneVirtualNodes(activeNodes, next, releaseNode);
    updateVisibleVirtualNodes({
      next,
      itemHeight,
      currentItems,
      activeNodes,
      mountNode: (index) => mountVirtualNode({
        index,
        itemHeight,
        currentItems,
        renderItem: state2.renderItem,
        pool,
        inner,
        activeNodes
      })
    });
  }
  function onScroll() {
    scheduleRender();
  }
  container.addEventListener("scroll", onScroll, { passive: true });
  renderRange();
  return {
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener("scroll", onScroll);
      for (const el of activeNodes.values()) releaseNode(el);
      activeNodes.clear();
      inner.remove();
    },
    updateItems(nextItems) {
      currentItems = nextItems;
      state2.currentItems = nextItems;
      for (const el of activeNodes.values()) releaseNode(el);
      activeNodes.clear();
      scheduleRender();
    },
    scrollToIndex(index, behavior = "auto") {
      const clamped = Math.max(0, Math.min(index, currentItems.length - 1));
      container.scrollTo({ top: clamped * itemHeight, behavior });
    },
    getVisibleRange() {
      return { ...range };
    }
  };
}
function createVirtualScrollController({
  container,
  items,
  estimateItemHeight,
  renderItem,
  overscan = 3
}) {
  const itemHeight = estimateItemHeight;
  const activeNodes = /* @__PURE__ */ new Map();
  const pool = [];
  const inner = document.createElement("div");
  inner.className = "virtual-scroll-inner";
  inner.style.position = "relative";
  inner.style.width = "100%";
  if (!container.style.overflow) container.style.overflow = "auto";
  container.replaceChildren(inner);
  function releaseNode(el) {
    releaseVirtualNode(el, pool);
  }
  return createVirtualScrollApi({
    container,
    inner,
    activeNodes,
    pool,
    itemHeight,
    releaseNode,
    currentItems: items,
    renderItem,
    overscan,
    rafId: 0,
    range: { startIndex: 0, endIndex: -1, offsetTop: 0, totalHeight: 0 }
  });
}

// public/js/virtual-scroll.mjs
function createVirtualScroll(opts) {
  return createVirtualScrollController(opts);
}

// public/js/patient-list-virtual.mjs
var PATIENT_ACTIVE_VIRTUAL_THRESHOLD = 30;
var PATIENT_ACTIVE_ITEM_STRIDE = 70;
function shouldVirtualizeActiveZone(activeCount) {
  return activeCount > PATIENT_ACTIVE_VIRTUAL_THRESHOLD;
}
function htmlToElement2(html) {
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  return wrap.firstElementChild;
}
function renderPatientCardElement(p, renderCardHtml, ctx) {
  const el = htmlToElement2(renderCardHtml(p));
  if (!el) {
    const fallback = document.createElement("div");
    fallback.className = "patient-card";
    fallback.dataset.patientId = String(p.id || "");
    return fallback;
  }
  el.setAttribute("data-display-key", patientCardDisplayKey(p, ctx));
  return el;
}
var state = {
  instance: null,
  zoneEl: null,
  listEl: null,
  resizeObserver: null
};
function syncActiveZoneMaxHeight(listEl, zoneEl) {
  if (!listEl || !zoneEl) return;
  const listRect = listEl.getBoundingClientRect();
  const zoneRect = zoneEl.getBoundingClientRect();
  const bottomPad = 12;
  const maxH = Math.max(140, Math.floor(listRect.bottom - zoneRect.top - bottomPad));
  zoneEl.style.maxHeight = `${maxH}px`;
}
function detachResizeObserver() {
  if (state.resizeObserver) {
    state.resizeObserver.disconnect();
    state.resizeObserver = null;
  }
}
function destroyPatientActiveZoneVirtual() {
  detachResizeObserver();
  if (state.instance) {
    state.instance.destroy();
    state.instance = null;
  }
  if (state.zoneEl) {
    state.zoneEl.classList.remove("patient-sort-zone--virtual-active");
    state.zoneEl.style.removeProperty("overflow");
    state.zoneEl.style.removeProperty("max-height");
    state.zoneEl.style.removeProperty("min-height");
    state.zoneEl.removeAttribute("data-active-ids");
    state.zoneEl = null;
  }
  state.listEl = null;
}
function mountPatientActiveZoneVirtual(options) {
  const { zoneEl, listEl, items, renderCardHtml, ctx } = options;
  if (!zoneEl || !listEl || !items.length) return null;
  zoneEl.classList.add("patient-sort-zone--virtual-active");
  zoneEl.style.overflow = "auto";
  zoneEl.style.minHeight = "0";
  zoneEl.setAttribute(
    "data-active-ids",
    items.map((p) => String(p.id || "")).join(",")
  );
  syncActiveZoneMaxHeight(listEl, zoneEl);
  if (typeof ResizeObserver !== "undefined") {
    detachResizeObserver();
    state.resizeObserver = new ResizeObserver(() => {
      syncActiveZoneMaxHeight(listEl, zoneEl);
    });
    state.resizeObserver.observe(listEl);
    state.resizeObserver.observe(zoneEl);
  }
  const renderItem = ({ item }) => renderPatientCardElement(item, renderCardHtml, ctx);
  if (state.instance && state.zoneEl === zoneEl) {
    state.listEl = listEl;
    state.instance.updateItems(items);
    return state.instance;
  }
  destroyPatientActiveZoneVirtual();
  state.zoneEl = zoneEl;
  state.listEl = listEl;
  state.instance = createVirtualScroll({
    container: zoneEl,
    items,
    estimateItemHeight: PATIENT_ACTIVE_ITEM_STRIDE,
    overscan: 3,
    renderItem
  });
  return state.instance;
}
function updatePatientActiveZoneVirtual(options) {
  if (!state.instance || !state.zoneEl || !state.listEl) return false;
  const { items, renderCardHtml, ctx } = options;
  state.zoneEl.setAttribute(
    "data-active-ids",
    items.map((p) => String(p.id || "")).join(",")
  );
  state.instance.destroy();
  state.instance = createVirtualScroll({
    container: state.zoneEl,
    items,
    estimateItemHeight: PATIENT_ACTIVE_ITEM_STRIDE,
    overscan: 3,
    renderItem: ({ item }) => renderPatientCardElement(item, renderCardHtml, ctx)
  });
  syncActiveZoneMaxHeight(state.listEl, state.zoneEl);
  return true;
}
function trySilentVirtualPatientListPatch(list, options) {
  if (!list || options.patientSearchFilter) return false;
  if (!shouldVirtualizeActiveZone(options.zones.active.length)) return false;
  if (!list.querySelector('.patient-sort-zone--virtual-active[data-patient-zone="active"]')) return false;
  if (!state.instance) return false;
  const desired = virtualPatientListStructureSignature(options.zones, options.archivedCollapsed);
  const current = readVirtualPatientListStructure(list, options.archivedCollapsed);
  if (desired !== current) return false;
  syncSectionCounts(list, options.zones);
  const ctx = options.ctx || {};
  const pinned = list.querySelector('.patient-sort-zone[data-patient-zone="pinned"]');
  if (options.zones.pinned.length && pinned) {
    syncZoneCards(pinned, options.zones.pinned, options.renderCard, ctx);
  }
  const archived = list.querySelector('.patient-sort-zone[data-patient-zone="archived"]');
  if (options.zones.archived.length && archived && !options.archivedCollapsed) {
    syncZoneCards(archived, options.zones.archived, options.renderCard, ctx);
  }
  updatePatientActiveZoneVirtual({
    items: options.zones.active,
    renderCardHtml: options.renderCard,
    ctx
  });
  if (typeof options.onRondaNav === "function") options.onRondaNav(options.zones);
  return true;
}

// public/js/patient-list-indicator.mjs
function ensurePatientListIndicator(listEl) {
  if (!listEl) return null;
  var pill = listEl.querySelector(":scope > .patient-list-indicator");
  if (pill) pill.remove();
  listEl.classList.remove("patient-list--has-indicator");
  return null;
}
function syncPatientListIndicator(listEl) {
  ensurePatientListIndicator(listEl);
}

// public/js/features/patients-round.mjs
var _lastRondaNavIds = [];
function setLastRondaNavIds(ids) {
  _lastRondaNavIds = ids;
}
function onPatientSearchInput(val) {
  setPatientSearchFilter(val);
  patientsBridge.renderPatientList();
}
function advanceRondaPatient(delta) {
  if (isPatientBulkSelectMode()) return;
  var next = nextCensusPatientId(_lastRondaNavIds, rt.getActiveId(), delta);
  if (next == null) return;
  patientsBridge.selectPatient(next);
}
function scrollActiveRondaCardIntoView() {
  if (!rt.getActiveId()) return;
  var list = document.getElementById("patient-list");
  if (!list) return;
  var cards = list.querySelectorAll(".patient-card[data-patient-id]");
  var want = String(rt.getActiveId());
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute("data-patient-id") === want) {
      try {
        cards[i].scrollIntoView({
          block: "nearest",
          behavior: rt.rpcPrefersReducedMotion() ? "auto" : "smooth"
        });
      } catch {
        cards[i].scrollIntoView(true);
      }
      break;
    }
  }
}

// public/js/features/patients-list.mjs
var ARCHIVED_SECTION_COLLAPSED_LS = "rpc-archived-section-collapsed";
var _patientListSortables = [];
function ensurePatientUiState() {
  for (var i = 0; i < getPatients().length; i++) {
    var p = getPatients()[i];
    if (!p) continue;
    if (typeof p.archived !== "boolean") p.archived = false;
    if (typeof p.pinned !== "boolean") p.pinned = false;
  }
}
function isArchivedSectionCollapsed() {
  try {
    return localStorage.getItem(ARCHIVED_SECTION_COLLAPSED_LS) === "1";
  } catch {
    return false;
  }
}
function setArchivedSectionCollapsed(v) {
  try {
    localStorage.setItem(ARCHIVED_SECTION_COLLAPSED_LS, v ? "1" : "0");
  } catch (_e) {
    void _e;
  }
}
function destroyPatientListSortables() {
  _patientListSortables.forEach(function(s) {
    try {
      if (s && typeof s.destroy === "function") s.destroy();
    } catch (_e) {
      void _e;
    }
  });
  _patientListSortables = [];
}
function handlePatientSortZoneEnd(evt) {
  if (evt.oldIndex === evt.newIndex || evt.from !== evt.to) return;
  syncPatientsOrderFromDom();
  persistClinicalState();
  var filtered = patientsVisibleInSidebar().filter(patientMatchesSearch);
  var zones = buildPatientListZones(filtered, { sortByBed: isMobileWeb() });
  setLastRondaNavIds(buildRondaNavIds(zones));
}
function mountPatientListSortables() {
  destroyPatientListSortables();
  if (isMobileWeb()) return;
  var SortableCtor = typeof globalThis !== "undefined" ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== "function") return;
  var listRoot = document.getElementById("patient-list");
  if (!listRoot || getPatientSearchFilter()) return;
  listRoot.querySelectorAll(".patient-sort-zone").forEach(function(zone) {
    if (zone.classList.contains("patient-sort-zone--virtual-active")) return;
    var sortable = SortableCtor.create(zone, {
      animation: 200,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      draggable: ".patient-card",
      filter: "button, a[href], input, textarea, select",
      preventOnFilter: true,
      delay: 0,
      delayOnTouchOnly: true,
      direction: "vertical",
      forceFallback: true,
      fallbackClass: "patient-drag-hovercard",
      fallbackOnBody: true,
      fallbackTolerance: 4,
      swapThreshold: 0.65,
      invertedSwapThreshold: 0.58,
      scroll: listRoot,
      bubbleScroll: true,
      scrollSensitivity: 54,
      scrollSpeed: 9,
      onEnd: handlePatientSortZoneEnd
    });
    _patientListSortables.push(sortable);
  });
}
function syncPatientsOrderFromDom() {
  var list = document.getElementById("patient-list");
  if (!list) return;
  var cards = list.querySelectorAll(".patient-card[data-patient-id]");
  if (!cards || !cards.length) return;
  var order = [];
  for (var i = 0; i < cards.length; i++) {
    var pid = cards[i].getAttribute("data-patient-id");
    if (pid) order.push(pid);
  }
  if (!order.length) return;
  var rank = /* @__PURE__ */ Object.create(null);
  for (var j = 0; j < order.length; j++) rank[order[j]] = j;
  var missingBase = order.length + 1e3;
  getPatients().sort(function(a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a.id) ? rank[a.id] : missingBase;
    var rb = Object.prototype.hasOwnProperty.call(rank, b.id) ? rank[b.id] : missingBase;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}
function mountActiveZoneVirtualIfNeeded(list, active, cardHtml, listCtx) {
  if (!shouldVirtualizeActiveZone(active.length)) {
    destroyPatientActiveZoneVirtual();
    list.removeAttribute("data-patient-list-virtual");
    return;
  }
  var activeZone = list.querySelector('.patient-sort-zone[data-patient-zone="active"]');
  if (!activeZone) return;
  mountPatientActiveZoneVirtual({
    zoneEl: activeZone,
    listEl: list,
    items: active,
    renderCardHtml: cardHtml,
    ctx: listCtx
  });
}
var _patientListRenderQueued = false;
var _patientListSilentTimer = null;
var _censusFiltersBarSyncQueued = false;
var PATIENT_LIST_SILENT_DEBOUNCE_MS = 220;
function scheduleCensusFiltersBarSync() {
  if (_censusFiltersBarSyncQueued) return;
  _censusFiltersBarSyncQueued = true;
  var run = function() {
    _censusFiltersBarSyncQueued = false;
    syncClinicalCensusFiltersBar();
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 0);
  }
}
function normalizePatientListRenderOpts(opts) {
  return opts && typeof opts === "object" ? opts : {};
}
function patchPatientListActiveHighlight(nextId) {
  var list = document.getElementById("patient-list");
  if (!list) return false;
  var cards = list.querySelectorAll(".patient-card[data-patient-id]");
  if (!cards.length) return false;
  if (list.querySelector('.patient-sort-zone--virtual-active[data-patient-zone="active"]')) {
    cards.forEach(function(el) {
      var pid = el.getAttribute("data-patient-id");
      el.classList.toggle("active", String(pid) === String(nextId));
    });
    syncPatientListIndicator(list, nextId);
    return true;
  }
  var filtered = patientsVisibleInSidebar().filter(patientMatchesSearch);
  if (filtered.length !== cards.length) return false;
  cards.forEach(function(el) {
    var pid = el.getAttribute("data-patient-id");
    el.classList.toggle("active", String(pid) === String(nextId));
  });
  syncPatientListIndicator(list, nextId);
  return true;
}
function renderPatientList(opts) {
  opts = normalizePatientListRenderOpts(opts);
  if (opts.silent && !opts.force) {
    if (_patientListSilentTimer) clearTimeout(_patientListSilentTimer);
    _patientListSilentTimer = setTimeout(function() {
      _patientListSilentTimer = null;
      renderPatientListNow({ silent: true });
    }, PATIENT_LIST_SILENT_DEBOUNCE_MS);
    return;
  }
  if (_patientListSilentTimer) {
    clearTimeout(_patientListSilentTimer);
    _patientListSilentTimer = null;
  }
  if (opts.force) {
    _patientListRenderQueued = false;
    renderPatientListNow({ silent: !!opts.silent });
    return;
  }
  if (_patientListRenderQueued) return;
  _patientListRenderQueued = true;
  requestAnimationFrame(function() {
    _patientListRenderQueued = false;
    renderPatientListNow();
  });
}
function renderPatientListMessage(list, msg, opts) {
  destroyPatientListSortables();
  destroyPatientActiveZoneVirtual();
  var scrollTop = opts.silent ? list.scrollTop : 0;
  list.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">' + msg + "</div>";
  if (opts.silent && scrollTop > 0) list.scrollTop = scrollTop;
  setLastRondaNavIds([]);
  if (rt.getActiveAppTab() === "agenda") rt.renderProcedureAgendaPanel();
  if (!opts.silent) {
    syncGuardiaCensusPanelVisibility(rt.getSettings());
    renderGuardiaCensusGrid(rt.getSettings());
  }
}
function buildPatientListRenderBundle(filtered) {
  var zones = buildPatientListZones(filtered, { sortByBed: isMobileWeb() });
  var cardHtml = renderPatientCardHtml;
  var archivedCollapsed = isArchivedSectionCollapsed();
  var listCtx = {
    activeId: rt.getActiveId(),
    isRonda: false,
    showServicioInCard: !isModeSala(rt.getSettings())
  };
  var onRondaNav = function(z) {
    setLastRondaNavIds(buildRondaNavIds(z));
  };
  return {
    zones,
    cardHtml,
    archivedCollapsed,
    listCtx,
    onRondaNav,
    virtualizeActive: shouldVirtualizeActiveZone(zones.active.length)
  };
}
function trySilentPatientListUpdate(list, bundle, opts) {
  if (!opts.silent) return false;
  var incrementalOpts = {
    zones: bundle.zones,
    archivedCollapsed: bundle.archivedCollapsed,
    patientSearchFilter: getPatientSearchFilter(),
    renderCard: bundle.cardHtml,
    ctx: bundle.listCtx,
    onRondaNav: bundle.onRondaNav
  };
  var incrementalDomOpts = {
    zones: bundle.zones,
    archivedCollapsed: bundle.archivedCollapsed,
    isRonda: bundle.listCtx.isRonda,
    virtualizeActive: bundle.virtualizeActive,
    renderCard: bundle.cardHtml,
    ctx: bundle.listCtx,
    renderPinnedLabel: function() {
      return renderPinnedSectionLabelHtml(bundle.zones.pinned.length);
    },
    renderActiveLabel: function() {
      return renderActiveSectionLabelHtml(bundle.zones.active.length);
    },
    renderArchivedToggle: function(collapsed, count) {
      return renderArchivedToggleHtml(collapsed, count);
    },
    onRondaNav: bundle.onRondaNav
  };
  var silentScrollTop = list.scrollTop;
  var silentOk = bundle.virtualizeActive && trySilentVirtualPatientListPatch(list, incrementalOpts) || !bundle.virtualizeActive && trySilentPatientListPatch(list, incrementalOpts) || updatePatientListDomIncremental(list, incrementalDomOpts);
  if (!silentOk) return false;
  if (bundle.virtualizeActive) {
    mountActiveZoneVirtualIfNeeded(list, bundle.zones.active, bundle.cardHtml, bundle.listCtx);
  }
  list.classList.toggle("patient-list--ronda", bundle.listCtx.isRonda);
  if (silentScrollTop > 0) list.scrollTop = silentScrollTop;
  return true;
}
function buildDefaultZonePartsHtml(bundle, rondaNav) {
  var pinned = bundle.zones.pinned;
  var active = bundle.zones.active;
  var archived = bundle.zones.archived;
  var parts = [];
  if (pinned.length) {
    parts.push(renderPinnedSectionLabelHtml(pinned.length));
    parts.push('<div class="patient-sort-zone" data-patient-zone="pinned">');
    pinned.forEach(function(p) {
      rondaNav.push(String(p.id));
    });
    parts.push(pinned.map(bundle.cardHtml).join(""));
    parts.push("</div>");
  }
  if (active.length) {
    parts.push(renderActiveSectionLabelHtml(active.length));
    parts.push(
      '<div class="' + (bundle.virtualizeActive ? "patient-sort-zone patient-sort-zone--virtual-active" : "patient-sort-zone") + '" data-patient-zone="active">'
    );
    active.forEach(function(p) {
      rondaNav.push(String(p.id));
    });
    if (!bundle.virtualizeActive) parts.push(active.map(bundle.cardHtml).join(""));
    parts.push("</div>");
  }
  return parts;
}
function renderPatientListFullHtml(list, bundle, opts) {
  destroyPatientListSortables();
  list.classList.toggle("patient-list--ronda", bundle.listCtx.isRonda);
  var archived = bundle.zones.archived;
  var rondaNav = [];
  var parts = buildDefaultZonePartsHtml(bundle, rondaNav);
  if (archived.length) {
    parts.push(
      renderArchivedToggleHtml(bundle.archivedCollapsed, archived.length)
    );
    if (!bundle.archivedCollapsed) {
      parts.push('<div class="patient-sort-zone" data-patient-zone="archived">');
      archived.forEach(function(p) {
        rondaNav.push(String(p.id));
      });
      parts.push(archived.map(bundle.cardHtml).join(""));
      parts.push("</div>");
    }
  }
  setLastRondaNavIds(rondaNav);
  var savedScrollTop = opts.silent ? list.scrollTop : 0;
  list.innerHTML = parts.join("");
  mountActiveZoneVirtualIfNeeded(list, bundle.zones.active, bundle.cardHtml, bundle.listCtx);
  if (opts.silent && savedScrollTop > 0) list.scrollTop = savedScrollTop;
  if (!isPatientBulkSelectMode()) mountPatientListSortables();
  if (rt.getActiveAppTab() === "agenda") rt.renderProcedureAgendaPanel();
  if (!opts.silent) {
    syncGuardiaCensusPanelVisibility(rt.getSettings());
    renderGuardiaCensusGrid(rt.getSettings());
  }
}
function renderPatientListNow(opts) {
  opts = normalizePatientListRenderOpts(opts);
  if (shouldEnforceTeamPatientMirror() && !isClinicalScopeReadyForPatientApply()) {
    var listBoot = document.getElementById("patient-list");
    if (listBoot) {
      const cloudMsg = isCloudMobileClient() ? "Censo vac\xEDo en la nube. Deja R+ abierto en el Mac del turno unos segundos y recarga." : "Sincronizando equipo\u2026";
      listBoot.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">' + cloudMsg + "</div>";
    }
    if (opts.silent) return;
    return;
  }
  ensurePatientUiState();
  ensurePatientListClickDelegation();
  if (opts.silent) scheduleCensusFiltersBarSync();
  else syncClinicalCensusFiltersBar();
  var list = document.getElementById("patient-list");
  if (!list) return;
  var visiblePatients = patientsVisibleInSidebar();
  if (!visiblePatients.length) {
    if (isCloudMobileClient()) {
      renderPatientListMessage(
        list,
        "Sin pacientes en la nube. En el Mac del turno deja R+ abierto ~20 s y recarga esta p\xE1gina.",
        opts
      );
    } else {
      renderPatientListMessage(list, "Sin pacientes a\xFAn", opts);
    }
    reselectIfActivePatientHidden(visiblePatients);
    return;
  }
  var filtered = visiblePatients.filter(patientMatchesSearch);
  if (!filtered.length) {
    renderPatientListMessage(list, "Ning\xFAn paciente coincide con la b\xFAsqueda", opts);
    reselectIfActivePatientHidden(visiblePatients);
    return;
  }
  var bundle = buildPatientListRenderBundle(filtered);
  if (!trySilentPatientListUpdate(list, bundle, opts)) {
    renderPatientListFullHtml(list, bundle, opts);
  }
  reselectIfActivePatientHidden(visiblePatients);
}
var _patientListClickWired = false;
var _lastPatientListSelect = { pid: "", at: 0 };
function selectPatientFromListEvent(ev) {
  var pid = patientCardIdFromEvent(ev);
  if (!pid) return;
  var now = Date.now();
  if (pid === _lastPatientListSelect.pid && now - _lastPatientListSelect.at < 400) return;
  _lastPatientListSelect = { pid, at: now };
  var patient = getPatients().find(function(p) {
    return p && String(p.id) === String(pid);
  });
  patientsBridge.selectPatient(pid);
  if (patient && isPatientAdmissionIncomplete(patient, rt.getSettings())) {
    window.setTimeout(function() {
      openCompleteAdmissionModal(pid);
    }, 0);
  }
}
function ensurePatientListClickDelegation() {
  if (_patientListClickWired) return;
  var root = document.getElementById("patient-list");
  if (!root) return;
  _patientListClickWired = true;
  root.addEventListener("click", selectPatientFromListEvent);
  root.addEventListener("pointerup", function(ev) {
    if (!shouldHandleTouchPointerUp(ev)) return;
    selectPatientFromListEvent(ev);
  });
}

// public/js/features/receta-hu-shared.mjs
var rt3 = {
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
  },
  switchAppTab() {
  },
  switchInnerTab() {
  },
  requestDocumentJson() {
    return Promise.resolve(null);
  },
  handleDocumentGenerateResponse(opts) {
    return Promise.resolve(opts && opts.response);
  },
  showToast() {
  },
  guardMobileDocExport() {
    return false;
  },
  isRpcOffline() {
    return false;
  },
  incrementPendingJobs() {
  },
  decrementPendingJobs() {
  },
  syncOfflineButtonStates() {
  }
};
function registerRecetaHuRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt3, ctx);
}
function aid2() {
  return rt3.getActiveId();
}
function getDraft(pid) {
  if (!pid) return normalizeRecetaHuDraft(null);
  if (!getRecetaHuByPatient()[pid]) {
    getRecetaHuByPatient()[pid] = normalizeRecetaHuDraft({
      fecha: formatRecetaHuFecha(/* @__PURE__ */ new Date()),
      meds: [],
      labs: []
    });
  }
  return normalizeRecetaHuDraft(getRecetaHuByPatient()[pid]);
}
function persistDraft(pid, draft2) {
  if (!pid || pid.indexOf("demo-") === 0) return;
  getRecetaHuByPatient()[pid] = normalizeRecetaHuDraft(draft2);
  persistClinicalState();
}
function readStaticFieldsFromDom(draft2) {
  var fechaEl = document.getElementById("receta-hu-fecha");
  if (fechaEl) draft2.fecha = fechaEl.value;
  var cuidadosEl = document.getElementById("receta-hu-cuidados");
  if (cuidadosEl) draft2.cuidados = cuidadosEl.value;
  return draft2;
}
function readDraftFromDom() {
  var pid = aid2();
  var draft2 = getDraft(pid);
  readStaticFieldsFromDom(draft2);
  return draft2;
}
function flushRecetaHuDraftIfMountedFor(patientId) {
  if (!patientId || String(patientId).indexOf("demo-") === 0) return;
  var root = document.getElementById("receta-hu-container");
  if (!root || root.dataset.mounted !== "1") return;
  if (String(root.dataset.patientId || "") !== String(patientId)) return;
  var draft2 = getDraft(patientId);
  readStaticFieldsFromDom(draft2);
  persistDraft(patientId, draft2);
}
function consultServices() {
  return normalizeRecetaHuConsultServices(rt3.getSettings().recetaHuConsultServices);
}
function saveConsultServices(list) {
  var st = rt3.getSettings();
  st.recetaHuConsultServices = normalizeRecetaHuConsultServices(list);
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(st));
  } catch (_e) {
    void _e;
  }
}
function activePatient() {
  var pid = aid2();
  if (!pid) return null;
  return getPatients().find(function(p) {
    return p.id === pid;
  }) || null;
}
function recetaHuPanelVisible() {
  var root = document.getElementById("receta-hu-container");
  if (!root) return false;
  var r = root.getBoundingClientRect();
  return r.width > 4 && r.height > 4;
}
function ensureRecetaHuPanelVisible() {
  if (recetaHuPanelVisible()) return;
  if (typeof rt3.switchInnerTab === "function") {
    rt3.switchInnerTab("recetaHu");
    return;
  }
  if (typeof rt3.getActiveAppTab === "function" && rt3.getActiveAppTab() !== "nota" && typeof rt3.switchAppTab === "function") {
    rt3.switchAppTab("nota");
  }
}

// public/js/features/receta-hu-button-state.mjs
function resetExportButtonState() {
  var btn = document.getElementById("btn-receta-hu-export");
  if (!btn) return;
  if (!btn.dataset.uiMotionDefaultLabel) {
    btn.dataset.uiMotionDefaultLabel = "Exportar PDF";
  }
  delete btn.dataset.rpcOffline;
  setAsyncButtonLoading(btn, false);
  if (!(rt3.isRpcOffline && rt3.isRpcOffline())) {
    btn.disabled = false;
    btn.removeAttribute("aria-disabled");
  }
}

// public/js/features/receta-hu-export.mjs
function validateRecetaHuExport() {
  if (rt3.guardMobileDocExport()) return null;
  if (!recetaHuPanelVisible()) ensureRecetaHuPanelVisible();
  if (guardDocExportBlocked({ isRpcOffline: rt3.isRpcOffline, showToast: rt3.showToast })) return null;
  var pid = aid2();
  if (!pid) {
    rt3.showToast("Selecciona un paciente", "error");
    return null;
  }
  var patient = activePatient();
  if (!patient) {
    rt3.showToast("Paciente no encontrado", "error");
    return null;
  }
  var st = rt3.getSettings();
  if (!String(st.doctorName || "").trim()) {
    rt3.showToast("Configura el m\xE9dico tratante en Mi Perfil", "error");
    return null;
  }
  if (!String(st.cedulaProfesional || "").trim()) {
    rt3.showToast("Configura la c\xE9dula profesional en Mi Perfil", "error");
    return null;
  }
  var draft2 = readDraftFromDom();
  persistDraft(pid, draft2);
  return {
    patient,
    draft: draft2,
    doctorName: st.doctorName,
    cedulaProfesional: st.cedulaProfesional
  };
}
function buildRecetaHuExportPayload(body) {
  return {
    patient: body.patient,
    receta: {
      fecha: body.fecha,
      meds: body.meds,
      labs: body.labs,
      cuidados: body.cuidados,
      proximaCita: body.proximaCita,
      proximaCitaFecha: body.proximaCitaFecha
    },
    doctorName: body.doctorName,
    cedulaProfesional: body.cedulaProfesional
  };
}
function selectRecetaHuOutputDir() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
    return Promise.resolve(void 0);
  }
  return window.electronAPI.selectOutputDir();
}
function runRecetaHuPdfExport(body) {
  var btn = document.getElementById("btn-receta-hu-export");
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Exportando\u2026" });
  rt3.incrementPendingJobs();
  exportWithOutputDirFallback({
    url: "/generate-receta-hu",
    buildPayload: function() {
      return buildRecetaHuExportPayload(body);
    },
    defaultFileName: "receta-hu.pdf",
    selectOutputDir: selectRecetaHuOutputDir,
    saveOutputDir: function(dir) {
      saveOutputDirSelection(dir, {
        getSettings: rt3.getSettings
      });
    },
    onSuccess: function(data) {
      var name = data && (data.fileName || data.path) ? data.fileName || String(data.path).split(/[/\\]/).pop() : "PDF";
      rt3.showToast("Receta HU guardada: " + name, "success");
    },
    onPrompt: function() {
      rt3.showToast("Selecciona una carpeta para guardar el PDF.", "error");
    },
    onCancel: function() {
      rt3.showToast("No se guard\xF3 el PDF: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(message) {
      rt3.showToast("Error: " + message, "error");
    }
  }).catch(function() {
    rt3.showToast("Error de conexi\xF3n al generar el PDF", "error");
  }).finally(function() {
    if (btn && !btn.dataset.uiMotionDefaultLabel) {
      btn.dataset.uiMotionDefaultLabel = "Exportar PDF";
    }
    setAsyncButtonLoading(btn, false);
    rt3.decrementPendingJobs();
    if (typeof rt3.syncOfflineButtonStates === "function") rt3.syncOfflineButtonStates();
  });
}
function exportRecetaHuPdf() {
  try {
    var ctx = validateRecetaHuExport();
    if (!ctx) return;
    var body = buildRecetaHuGeneratePayload({
      patient: ctx.patient,
      draft: ctx.draft,
      doctorName: ctx.doctorName,
      cedulaProfesional: ctx.cedulaProfesional
    });
    runRecetaHuPdfExport(body);
  } catch (err) {
    console.error("[R+] exportRecetaHuPdf:", err && err.message ? err.message : err);
    resetExportButtonState();
    rt3.showToast("No se pudo exportar la receta HU", "error");
  }
}

// public/js/features/receta-hu-list-render.mjs
function renderMedList(root, meds) {
  var list = root.querySelector("#receta-hu-meds-list");
  if (!list) return;
  if (!meds.length) {
    list.innerHTML = '<p class="receta-hu-list-empty">Sin medicamentos a\xFAn.</p>';
    return;
  }
  list.innerHTML = meds.map(function(row, idx) {
    return '<div class="receta-hu-item" data-med-idx="' + idx + '"><div class="receta-hu-item-body"><strong>' + esc(row.medicamento || "\u2014") + "</strong>" + (row.presentacion ? "<span>" + esc(row.presentacion) + "</span>" : "") + (row.dosis ? '<span class="receta-hu-item-dose">' + esc(row.dosis) + "</span>" : "") + '</div><button type="button" class="btn-icon-quiet" title="Quitar" aria-label="Quitar medicamento" data-receta-hu-action="remove-med" data-med-idx="' + idx + '">\xD7</button></div>';
  }).join("");
}
function renderLabList(root, labs) {
  var list = root.querySelector("#receta-hu-labs-added");
  if (!list) return;
  var items = labs.filter(function(x) {
    return String(x || "").trim();
  });
  if (!items.length) {
    list.innerHTML = '<p class="receta-hu-list-empty">Sin estudios a\xFAn.</p>';
    return;
  }
  list.innerHTML = items.map(function(name, idx) {
    return '<div class="receta-hu-item receta-hu-item-lab" data-lab-idx="' + idx + '"><span class="receta-hu-item-body">' + esc(name) + '</span><button type="button" class="btn-icon-quiet" title="Quitar" aria-label="Quitar estudio" data-receta-hu-action="remove-lab" data-lab-idx="' + idx + '">\xD7</button></div>';
  }).join("");
}
function renderProximaCitaList(root, proximasCitas) {
  var list = root.querySelector("#receta-hu-proximas-list");
  if (!list) return;
  var items = (proximasCitas || []).filter(function(row) {
    return row && (row.texto || row.servicio || row.fecha);
  });
  if (!items.length) {
    list.innerHTML = '<p class="receta-hu-list-empty">Sin consultas de seguimiento a\xFAn.</p>';
    return;
  }
  list.innerHTML = items.map(function(row, idx) {
    var meta = [];
    if (row.fecha) meta.push("Fecha: " + row.fecha);
    if (row.servicio && !row.texto) meta.push(row.servicio);
    return '<div class="receta-hu-item receta-hu-item-proxima" data-proxima-idx="' + idx + '"><div class="receta-hu-item-body"><strong>' + esc(row.texto || buildProximaCitaText(row.plazo, row.servicio) || "\u2014") + "</strong>" + (meta.length ? '<span class="receta-hu-item-dose">' + esc(meta.join(" \xB7 ")) + "</span>" : "") + '</div><button type="button" class="btn-icon-quiet" title="Quitar" aria-label="Quitar consulta" data-receta-hu-action="remove-proxima" data-proxima-idx="' + idx + '">\xD7</button></div>';
  }).join("");
}
function renderConsultServiceSelect(root, draft2) {
  var sel = root.querySelector("#receta-hu-consult-servicio");
  if (!sel) return;
  var services = consultServices();
  var prev = sel.value;
  sel.innerHTML = '<option value="">\u2014 Servicio \u2014</option>';
  services.forEach(function(s) {
    var opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
  if (prev && services.indexOf(prev) >= 0) sel.value = prev;
  var plazo = root.querySelector("#receta-hu-compose-proxima-plazo");
  if (plazo && draft2.proximaPlazo) plazo.value = draft2.proximaPlazo;
}

// public/js/features/receta-hu-actions.mjs
function recetaHuRoot() {
  return document.getElementById("receta-hu-container");
}
function readMedComposeFields() {
  var nEl = document.getElementById("receta-hu-compose-med-n");
  var pEl = document.getElementById("receta-hu-compose-med-p");
  var dEl = document.getElementById("receta-hu-compose-med-d");
  return {
    nEl,
    pEl,
    dEl,
    medicamento: nEl ? String(nEl.value || "").trim() : "",
    presentacion: pEl ? String(pEl.value || "").trim() : "",
    dosis: dEl ? String(dEl.value || "").trim() : ""
  };
}
function medComposeIsEmpty(fields) {
  return !fields.medicamento && !fields.presentacion && !fields.dosis;
}
function clearMedComposeFields(fields) {
  if (fields.nEl) fields.nEl.value = "";
  if (fields.pEl) fields.pEl.value = "";
  if (fields.dEl) fields.dEl.value = "";
}
function recetaHuCommitMedFromCompose() {
  var pid = aid2();
  if (!pid) return;
  var fields = readMedComposeFields();
  if (medComposeIsEmpty(fields)) {
    rt3.showToast("Escribe al menos un campo del medicamento", "error");
    if (fields.nEl) fields.nEl.focus();
    return;
  }
  var draft2 = readDraftFromDom();
  draft2.meds.push({
    medicamento: fields.medicamento,
    presentacion: fields.presentacion,
    dosis: fields.dosis
  });
  persistDraft(pid, draft2);
  clearMedComposeFields(fields);
  renderMedList(recetaHuRoot(), draft2.meds);
  if (fields.nEl) fields.nEl.focus();
}
function recetaHuRemoveMedRow(idx) {
  var pid = aid2();
  if (!pid) return;
  var draft2 = readDraftFromDom();
  draft2.meds.splice(idx, 1);
  persistDraft(pid, draft2);
  renderMedList(recetaHuRoot(), draft2.meds);
}
function recetaHuCommitLabFromCompose() {
  var pid = aid2();
  if (!pid) return;
  var inp = document.getElementById("receta-hu-compose-lab");
  var name = inp ? String(inp.value || "").trim() : "";
  if (!name) {
    rt3.showToast("Escribe el nombre del estudio", "error");
    if (inp) inp.focus();
    return;
  }
  var draft2 = readDraftFromDom();
  draft2.labs.push(name);
  persistDraft(pid, draft2);
  if (inp) inp.value = "";
  renderLabList(recetaHuRoot(), draft2.labs);
  if (inp) inp.focus();
}
function recetaHuRemoveLabRow(idx) {
  var pid = aid2();
  if (!pid) return;
  var draft2 = readDraftFromDom();
  var items = draft2.labs.filter(function(x) {
    return String(x || "").trim();
  });
  items.splice(idx, 1);
  draft2.labs = items;
  persistDraft(pid, draft2);
  renderLabList(recetaHuRoot(), draft2.labs);
}
function recetaHuOnConsultServicePick() {
  var sel = document.getElementById("receta-hu-consult-servicio");
  var plazoEl = document.getElementById("receta-hu-compose-proxima-plazo");
  var textoEl = document.getElementById("receta-hu-compose-proxima-texto");
  if (!sel || !textoEl) return;
  var text = buildProximaCitaText(plazoEl ? plazoEl.value : "", sel.value);
  if (text) textoEl.value = text;
}
function readProximaComposeFields() {
  var plazoEl = document.getElementById("receta-hu-compose-proxima-plazo");
  var sel = document.getElementById("receta-hu-consult-servicio");
  var textoEl = document.getElementById("receta-hu-compose-proxima-texto");
  var fechaEl = document.getElementById("receta-hu-compose-proxima-fecha");
  return {
    plazoEl,
    sel,
    textoEl,
    fechaEl,
    plazo: plazoEl ? String(plazoEl.value || "").trim() : "",
    servicio: sel ? String(sel.value || "").trim() : "",
    texto: textoEl ? String(textoEl.value || "").trim() : "",
    fecha: fechaEl ? String(fechaEl.value || "").trim() : ""
  };
}
function resolveProximaTexto(fields, draft2) {
  var texto = fields.texto;
  if (!texto && fields.servicio) {
    texto = buildProximaCitaText(fields.plazo || "2 semanas", fields.servicio);
  }
  if (!texto && !fields.fecha) {
    rt3.showToast("Elige servicio o escribe el texto de la consulta", "error");
    if (fields.sel) fields.sel.focus();
    return null;
  }
  var plazo = fields.plazo || draft2.proximaPlazo || "2 semanas";
  return { texto, plazo };
}
function clearProximaComposeFields(fields) {
  if (fields.textoEl) fields.textoEl.value = "";
  if (fields.fechaEl) fields.fechaEl.value = "";
  if (fields.sel) fields.sel.value = "";
}
function recetaHuCommitProximaFromCompose() {
  var pid = aid2();
  if (!pid) return;
  var fields = readProximaComposeFields();
  var draft2 = readDraftFromDom();
  var resolved = resolveProximaTexto(fields, draft2);
  if (!resolved) return;
  draft2.proximaPlazo = resolved.plazo;
  draft2.proximasCitas.push({
    plazo: resolved.plazo,
    servicio: fields.servicio,
    texto: resolved.texto,
    fecha: fields.fecha
  });
  persistDraft(pid, draft2);
  clearProximaComposeFields(fields);
  renderProximaCitaList(recetaHuRoot(), draft2.proximasCitas);
  if (fields.plazoEl) fields.plazoEl.focus();
}
function recetaHuRemoveProximaRow(idx) {
  var pid = aid2();
  if (!pid) return;
  var draft2 = readDraftFromDom();
  draft2.proximasCitas.splice(idx, 1);
  persistDraft(pid, draft2);
  renderProximaCitaList(recetaHuRoot(), draft2.proximasCitas);
}
function recetaHuAddConsultService() {
  var sel = document.getElementById("receta-hu-consult-servicio");
  if (!sel) return;
  var name = window.prompt("Nombre del servicio para el men\xFA (ej. Nefrolog\xEDa):", sel.value || "");
  if (!name) return;
  var trimmed = String(name).trim();
  if (!trimmed) return;
  var list = consultServices();
  if (list.indexOf(trimmed) < 0) {
    list.push(trimmed);
    saveConsultServices(list);
  }
  var root = recetaHuRoot();
  var draft2 = readDraftFromDom();
  renderConsultServiceSelect(root, draft2);
  var sel2 = document.getElementById("receta-hu-consult-servicio");
  if (sel2) {
    sel2.value = trimmed;
    recetaHuOnConsultServicePick();
  }
  rt3.showToast("Servicio agregado al men\xFA", "success");
}

// public/js/features/receta-hu-events.mjs
function dispatchRecetaHuAction(action, actionBtn) {
  if (action === "export") {
    exportRecetaHuPdf();
    return true;
  }
  if (action === "add-med") {
    recetaHuCommitMedFromCompose();
    return true;
  }
  if (action === "add-lab") {
    recetaHuCommitLabFromCompose();
    return true;
  }
  if (action === "add-proxima") {
    recetaHuCommitProximaFromCompose();
    return true;
  }
  if (action === "add-service") {
    recetaHuAddConsultService();
    return true;
  }
  if (action === "remove-med") {
    var medIdx = parseInt(actionBtn.getAttribute("data-med-idx"), 10);
    if (!isNaN(medIdx)) recetaHuRemoveMedRow(medIdx);
    return true;
  }
  if (action === "remove-lab") {
    var labIdx = parseInt(actionBtn.getAttribute("data-lab-idx"), 10);
    if (!isNaN(labIdx)) recetaHuRemoveLabRow(labIdx);
    return true;
  }
  if (action === "remove-proxima") {
    var proxIdx = parseInt(actionBtn.getAttribute("data-proxima-idx"), 10);
    if (!isNaN(proxIdx)) recetaHuRemoveProximaRow(proxIdx);
    return true;
  }
  if (action === "open-profile") {
    if (typeof window.openProfileModal === "function") window.openProfileModal();
    return true;
  }
  return false;
}
function handleRecetaHuClick(ev, root) {
  var actionBtn = ev.target && ev.target.closest ? ev.target.closest("[data-receta-hu-action]") : null;
  if (!actionBtn || !root.contains(actionBtn)) return;
  var action = actionBtn.getAttribute("data-receta-hu-action");
  if (!action) return;
  if (action !== "open-profile") ev.preventDefault();
  dispatchRecetaHuAction(action, actionBtn);
}
function isComposeField(id) {
  return id === "receta-hu-compose-med-n" || id === "receta-hu-compose-med-p" || id === "receta-hu-compose-med-d" || id === "receta-hu-compose-lab" || id === "receta-hu-compose-proxima-plazo" || id === "receta-hu-compose-proxima-texto" || id === "receta-hu-compose-proxima-fecha";
}
function handleRecetaHuInput(ev) {
  var t = ev.target;
  if (!t || !t.closest("#receta-hu-container")) return;
  if (isComposeField(t.id)) return;
  var pid = aid2();
  if (pid) persistDraft(pid, readDraftFromDom());
}
function handleRecetaHuChange(ev) {
  var t = ev.target;
  if (t && t.id === "receta-hu-consult-servicio") {
    recetaHuOnConsultServicePick();
    return;
  }
  if (t && t.id === "receta-hu-compose-proxima-plazo") {
    recetaHuOnConsultServicePick();
    return;
  }
  var pid = aid2();
  if (pid) persistDraft(pid, readDraftFromDom());
}
function handleRecetaHuKeydown(ev) {
  if (ev.key !== "Enter") return;
  var t = ev.target;
  if (!t) return;
  if (t.id === "receta-hu-compose-lab") {
    ev.preventDefault();
    recetaHuCommitLabFromCompose();
    return;
  }
  if (t.id === "receta-hu-compose-med-n" || t.id === "receta-hu-compose-med-p" || t.id === "receta-hu-compose-med-d") {
    ev.preventDefault();
    recetaHuCommitMedFromCompose();
    return;
  }
  if (t.id === "receta-hu-compose-proxima-texto" || t.id === "receta-hu-compose-proxima-fecha") {
    ev.preventDefault();
    recetaHuCommitProximaFromCompose();
  }
}
function bindRecetaHuEvents(root) {
  if (root.dataset.eventsBound === "1") return;
  root.dataset.eventsBound = "1";
  root.addEventListener("click", function(ev) {
    handleRecetaHuClick(ev, root);
  });
  root.addEventListener("input", handleRecetaHuInput);
  root.addEventListener("change", handleRecetaHuChange);
  root.addEventListener("keydown", handleRecetaHuKeydown);
}

// public/js/features/receta-hu-render.mjs
function ensureRecetaHuShell(root) {
  var pid = aid2();
  if (root.dataset.mounted === "1" && root.dataset.patientId === pid) return;
  root.innerHTML = '<div class="receta-hu-root"><div class="receta-hu-sheet"><div class="receta-hu-head"><div><h3 class="receta-hu-title">Receta m\xE9dica HU</h3><p class="receta-hu-sub">Formato oficial <strong>000-061-R-06-12</strong>. Firma a mano al imprimir.</p></div><button type="button" class="btn-generate rpc-doc-export" id="btn-receta-hu-export" data-receta-hu-action="export">Exportar PDF</button></div><section class="receta-hu-section"><h4 class="receta-hu-section-title">Paciente</h4><div class="receta-hu-meta" id="receta-hu-patient-meta"></div><label class="receta-hu-field"><span>Fecha</span><input type="text" class="receta-hu-input" id="receta-hu-fecha" placeholder="dd/mm/aaaa"></label></section><section class="receta-hu-section"><h4 class="receta-hu-section-title">Medicamentos</h4><div class="receta-hu-compose receta-hu-compose-med"><input type="text" class="receta-hu-input" id="receta-hu-compose-med-n" placeholder="Medicamento" aria-label="Medicamento"><input type="text" class="receta-hu-input" id="receta-hu-compose-med-p" placeholder="Presentaci\xF3n" aria-label="Presentaci\xF3n"><input type="text" class="receta-hu-input" id="receta-hu-compose-med-d" placeholder="Dosis" aria-label="Dosis"><button type="button" class="btn-add-inline" data-receta-hu-action="add-med">Agregar</button></div><div id="receta-hu-meds-list" class="receta-hu-added-list"></div></section><section class="receta-hu-section"><h4 class="receta-hu-section-title">Ex\xE1menes de laboratorio y/o gabinete</h4><p class="receta-hu-hint-inline">Solo el nombre del estudio \u2014 para que el paciente acuda a tomarlos.</p><div class="receta-hu-compose receta-hu-compose-lab"><input type="text" class="receta-hu-input" id="receta-hu-compose-lab" placeholder="Nombre del estudio" aria-label="Estudio de laboratorio"><button type="button" class="btn-add-inline" data-receta-hu-action="add-lab">Agregar</button></div><div id="receta-hu-labs-added" class="receta-hu-added-list"></div></section><section class="receta-hu-section"><h4 class="receta-hu-section-title">Cuidados higi\xE9nicos diet\xE9ticos</h4><textarea class="receta-hu-textarea" id="receta-hu-cuidados" rows="4" placeholder="Texto libre\u2026"></textarea></section><section class="receta-hu-section"><h4 class="receta-hu-section-title">Consultas de seguimiento</h4><p class="receta-hu-hint-inline">Puedes agregar varias consultas; en el PDF aparecen una debajo de otra.</p><div class="receta-hu-proxima-grid receta-hu-compose-proxima"><label class="receta-hu-field"><span>Plazo</span><input type="text" class="receta-hu-input" id="receta-hu-compose-proxima-plazo" placeholder="2 semanas"></label><label class="receta-hu-field"><span>Consulta de</span><select class="receta-hu-input" id="receta-hu-consult-servicio"></select></label><button type="button" class="btn-add-inline btn-add-inline-muted" data-receta-hu-action="add-service">+ Servicio</button></div><label class="receta-hu-field"><span>Texto en receta</span><input type="text" class="receta-hu-input" id="receta-hu-compose-proxima-texto" placeholder="Acudir en 2 semanas a consulta de Nefrolog\xEDa"></label><div class="receta-hu-compose receta-hu-compose-proxima-fecha"><label class="receta-hu-field receta-hu-field-grow"><span>Fecha (opcional, campo derecho del PDF)</span><input type="text" class="receta-hu-input" id="receta-hu-compose-proxima-fecha" placeholder="dd/mm/aaaa"></label><button type="button" class="btn-add-inline" data-receta-hu-action="add-proxima">Agregar consulta</button></div><div id="receta-hu-proximas-list" class="receta-hu-added-list"></div></section><p class="receta-hu-foot">M\xE9dico y c\xE9dula se toman de <strong>Mi Perfil</strong>.</p></div></div>';
  root.dataset.mounted = "1";
  root.dataset.patientId = pid || "";
  root.dataset.eventsBound = "0";
  bindRecetaHuEvents(root);
}
function populateRecetaHuPatientMeta(root, patient) {
  var meta = root.querySelector("#receta-hu-patient-meta");
  if (!meta || !patient) return;
  meta.innerHTML = "<span><strong>" + esc(patient.nombre) + "</strong></span>" + (patient.registro ? "<span>Reg. " + esc(patient.registro) + "</span>" : "") + (patient.servicio ? "<span>Serv. " + esc(patient.servicio) + "</span>" : "");
}
function populateRecetaHuDraftFields(root, draft2) {
  var fechaEl = root.querySelector("#receta-hu-fecha");
  if (fechaEl) fechaEl.value = draft2.fecha || formatRecetaHuFecha(/* @__PURE__ */ new Date());
  var cuidadosEl = root.querySelector("#receta-hu-cuidados");
  if (cuidadosEl) cuidadosEl.value = draft2.cuidados;
  renderMedList(root, draft2.meds);
  renderLabList(root, draft2.labs);
  renderProximaCitaList(root, draft2.proximasCitas);
  renderConsultServiceSelect(root, draft2);
}
function populateRecetaHuDoctorFoot(root, st) {
  var docHint = root.querySelector(".receta-hu-foot");
  if (!docHint) return;
  docHint.innerHTML = "M\xE9dico: <strong>" + esc(st.doctorName || "\u2014") + "</strong> \xB7 C\xE9dula: <strong>" + esc(st.cedulaProfesional || "\u2014") + '</strong> (<a href="#" data-receta-hu-action="open-profile">Mi Perfil</a>)';
}
function renderRecetaHu() {
  var root = document.getElementById("receta-hu-container");
  if (!root) return;
  var pid = aid2();
  if (!pid) {
    root.innerHTML = '<p class="receta-hu-hint">Selecciona un paciente para llenar la receta HU.</p>';
    root.dataset.mounted = "";
    return;
  }
  if (root.dataset.patientId && root.dataset.patientId !== pid) {
    root.dataset.mounted = "";
    root.dataset.eventsBound = "0";
  }
  var patient = activePatient();
  var draft2 = getDraft(pid);
  var st = rt3.getSettings();
  ensureRecetaHuShell(root);
  bindRecetaHuEvents(root);
  populateRecetaHuPatientMeta(root, patient);
  populateRecetaHuDraftFields(root, draft2);
  populateRecetaHuDoctorFoot(root, st);
  resetExportButtonState();
  if (typeof rt3.syncOfflineButtonStates === "function") rt3.syncOfflineButtonStates();
}

// public/js/features/receta-hu.mjs
var recetaHuWindowHandlers = {
  recetaHuCommitMedFromCompose,
  recetaHuRemoveMedRow,
  recetaHuCommitLabFromCompose,
  recetaHuRemoveLabRow,
  recetaHuCommitProximaFromCompose,
  recetaHuRemoveProximaRow,
  recetaHuOnConsultServicePick,
  recetaHuAddConsultService,
  exportRecetaHuPdf
};

// public/js/features/medications-runtime-state.mjs
var rt4 = {
  getActiveId() {
    return null;
  },
  showToast() {
  },
  getSettings() {
    return {};
  }
};
function medToast(message, type) {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(message, type);
    return;
  }
  if (typeof rt4.showToast === "function") rt4.showToast(message, type);
}
function registerMedicationsRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt4, ctx);
}
var medOutputTab = "full";
function setMedOutputTabState(tab) {
  if (tab === "full" || tab === "simple") medOutputTab = tab;
}
var lastMedPanelPatientId = null;
var medPanelCacheKey = "";
function getLastMedPanelPatientId() {
  return lastMedPanelPatientId;
}
function setLastMedPanelPatientId(id) {
  lastMedPanelPatientId = id;
}
function getMedPanelCacheKey() {
  return medPanelCacheKey;
}
function setMedPanelCacheKey(key) {
  medPanelCacheKey = key;
}
function bustMedPanelCache() {
  medPanelCacheKey = "";
}
var medRecetaPasteModalWired = false;
function markMedRecetaPasteModalWired() {
  medRecetaPasteModalWired = true;
}

// public/js/features/medications-utils.mjs
function manejoDiaOpts(fechaActualizacion) {
  var fecha = String(fechaActualizacion || "").trim();
  return fecha ? { fechaActualizacion: fecha } : void 0;
}
function getMedNotaSelMap(patientId) {
  if (!getMedNotaSelectionByPatient()[patientId]) getMedNotaSelectionByPatient()[patientId] = {};
  return getMedNotaSelectionByPatient()[patientId];
}
function isMedNotaSelected(patientId, itemId) {
  return !!getMedNotaSelMap(patientId)[String(itemId || "")];
}
function setMedActiveLeadVisible(visible) {
  var lead = document.getElementById("med-active-lead");
  if (lead) lead.hidden = !visible;
}

// public/js/features/medications-input.mjs
function stashMedInputForPatient(patientId) {
  if (!patientId || isDemoPatientId(patientId)) return;
  var ta = document.getElementById("med-input");
  if (!ta) return;
  var raw = ta.value || "";
  var block = getMedRecetaByPatient()[patientId];
  if (!raw) {
    if (block) {
      delete block.pasteRaw;
      if (!block.items || !block.items.length) delete getMedRecetaByPatient()[patientId];
      else persistClinicalState();
    }
    return;
  }
  if (!block) getMedRecetaByPatient()[patientId] = { pasteRaw: raw };
  else block.pasteRaw = raw;
  persistClinicalState();
}
function restoreMedInputForPatient(patientId) {
  var ta = document.getElementById("med-input");
  if (!ta) return;
  var block = patientId ? getMedRecetaByPatient()[patientId] : null;
  ta.value = block && block.pasteRaw ? block.pasteRaw : "";
}

// public/js/med-pharm-view-window.mjs
var OVERLAP_CUTOFF_DAY = 14;
var MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];
var MONTH_ABBR = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic"
];
function parseFimiFecha(raw) {
  const t = String(raw || "").trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: +m[1], monthIndex: +m[2] - 1, day: +m[3] };
}
function daysInCalendarMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
function makeColumn(year, monthIndex, day) {
  return { year, monthIndex, day, monthKey: monthKeyFromParts(year, monthIndex) };
}
function monthCompare(y1, m1, y2, m2) {
  if (y1 !== y2) return y1 < y2 ? -1 : 1;
  if (m1 !== m2) return m1 < m2 ? -1 : 1;
  return 0;
}
function isCurrentViewMonth(viewYear, viewMonthIndex, today) {
  return viewYear === today.year && viewMonthIndex === today.monthIndex;
}
function isPastViewMonth(viewYear, viewMonthIndex, today) {
  return monthCompare(viewYear, viewMonthIndex, today.year, today.monthIndex) < 0;
}
function isFutureViewMonth(viewYear, viewMonthIndex, today) {
  return monthCompare(viewYear, viewMonthIndex, today.year, today.monthIndex) > 0;
}
function getMonthFromProfile2(profile, year, monthIndex) {
  if (!profile || !profile.months) return null;
  return profile.months[monthKeyFromParts(year, monthIndex)] || null;
}
function collectIndicatedDays(month, rowKey) {
  const days = [];
  if (!month || !month.rows) return days;
  for (let i = 0; i < month.rows.length; i += 1) {
    const row = month.rows[i];
    if (rowKey && row.rowKey !== rowKey) continue;
    const dmap = row.days || {};
    const keys = Object.keys(dmap);
    for (let j = 0; j < keys.length; j += 1) {
      const d = Number(keys[j]);
      if (dayValueInMap(dmap, d) > 0) days.push(d);
    }
  }
  return days;
}
function rowHasIndicationInRange(month, rowKey, fromDay, toDay) {
  if (!month || !month.rows) return false;
  for (let i = 0; i < month.rows.length; i += 1) {
    const row = month.rows[i];
    if (row.rowKey !== rowKey) continue;
    for (let d = fromDay; d <= toDay; d += 1) {
      if (dayValueInMap(row.days, d) > 0) return true;
    }
  }
  return false;
}
function rowKeysContinuingAcrossMonths(profile, prevYear, prevMonthIndex, curYear, curMonthIndex, curEndDay) {
  const prevMonth = getMonthFromProfile2(profile, prevYear, prevMonthIndex);
  const curMonth = getMonthFromProfile2(profile, curYear, curMonthIndex);
  if (!prevMonth || !curMonth) return [];
  const keys = [];
  const seen = /* @__PURE__ */ Object.create(null);
  const prevRows = prevMonth.rows || [];
  for (let i = 0; i < prevRows.length; i += 1) {
    const rowKey = prevRows[i].rowKey;
    if (seen[rowKey]) continue;
    seen[rowKey] = true;
    const prevDim = prevMonth.daysInMonth || daysInCalendarMonth(prevYear, prevMonthIndex);
    if (!rowHasIndicationInRange(prevMonth, rowKey, 1, prevDim)) continue;
    if (!rowHasIndicationInRange(curMonth, rowKey, 1, curEndDay)) continue;
    keys.push(rowKey);
  }
  return keys;
}
function minIndicatedDayAmongRows(month, rowKeys) {
  let min = Infinity;
  for (let i = 0; i < rowKeys.length; i += 1) {
    const days = collectIndicatedDays(month, rowKeys[i]);
    for (let j = 0; j < days.length; j += 1) {
      if (days[j] < min) min = days[j];
    }
  }
  return min === Infinity ? 0 : min;
}
function rangeColumns(year, monthIndex, fromDay, toDay) {
  const cols = [];
  const dim = daysInCalendarMonth(year, monthIndex);
  const start = Math.max(1, fromDay);
  const end = Math.min(dim, toDay);
  for (let d = start; d <= end; d += 1) {
    cols.push(makeColumn(year, monthIndex, d));
  }
  return cols;
}
function buildCurrentMonthWindow(profile, viewYear, viewMonthIndex, today, fimiFecha) {
  const endDay = today.day;
  const columns = [];
  if (today.day >= OVERLAP_CUTOFF_DAY) {
    return rangeColumns(viewYear, viewMonthIndex, 1, endDay);
  }
  const prevMonthIndex = viewMonthIndex === 0 ? 11 : viewMonthIndex - 1;
  const prevYear = viewMonthIndex === 0 ? viewYear - 1 : viewYear;
  const continuingKeys = rowKeysContinuingAcrossMonths(
    profile,
    prevYear,
    prevMonthIndex,
    viewYear,
    viewMonthIndex,
    endDay
  );
  if (!continuingKeys.length) {
    return rangeColumns(viewYear, viewMonthIndex, 1, endDay);
  }
  const prevMonth = getMonthFromProfile2(profile, prevYear, prevMonthIndex);
  let prevStart = minIndicatedDayAmongRows(prevMonth, continuingKeys);
  const fimi = parseFimiFecha(fimiFecha);
  if (fimi && fimi.year === prevYear && fimi.monthIndex === prevMonthIndex && fimi.day > prevStart) {
    prevStart = fimi.day;
  }
  const prevDim = daysInCalendarMonth(prevYear, prevMonthIndex);
  columns.push(...rangeColumns(prevYear, prevMonthIndex, prevStart, prevDim));
  columns.push(...rangeColumns(viewYear, viewMonthIndex, 1, endDay));
  return columns;
}
function buildPastMonthWindow(profile, viewYear, viewMonthIndex, fimiFecha) {
  const fimi = parseFimiFecha(fimiFecha);
  if (fimi && monthCompare(fimi.year, fimi.monthIndex, viewYear, viewMonthIndex) > 0) {
    return [];
  }
  const month = getMonthFromProfile2(profile, viewYear, viewMonthIndex);
  const indicated = collectIndicatedDays(month);
  if (!indicated.length) return [];
  let first = Math.min(...indicated);
  let last = Math.max(...indicated);
  if (fimi && fimi.year === viewYear && fimi.monthIndex === viewMonthIndex) {
    first = Math.max(first, fimi.day);
  }
  if (first > last) return [];
  return rangeColumns(viewYear, viewMonthIndex, first, last);
}
function buildWindowLabel(columns, viewYear, viewMonthIndex) {
  if (!columns.length) {
    return MONTH_NAMES[viewMonthIndex] + " " + viewYear;
  }
  const monthKeys = [];
  const seen = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < columns.length; i += 1) {
    const mk = columns[i].monthKey;
    if (!seen[mk]) {
      seen[mk] = true;
      monthKeys.push(mk);
    }
  }
  if (monthKeys.length === 1) {
    return MONTH_NAMES[viewMonthIndex] + " " + viewYear;
  }
  const first = columns[0];
  const last = columns[columns.length - 1];
  const year = last.year;
  return first.day + " " + MONTH_ABBR[first.monthIndex] + " \u2013 " + last.day + " " + MONTH_ABBR[last.monthIndex] + " " + year;
}
function buildPharmViewWindow(opts) {
  const profile = opts.profile || { months: {} };
  const viewYear = opts.viewYear;
  const viewMonthIndex = opts.viewMonthIndex;
  const today = opts.today;
  const fimiFecha = opts.fimiFecha || "";
  let columns = [];
  const isCurrentMonth = isCurrentViewMonth(viewYear, viewMonthIndex, today);
  if (isFutureViewMonth(viewYear, viewMonthIndex, today)) {
    columns = [];
  } else if (isCurrentMonth) {
    columns = buildCurrentMonthWindow(profile, viewYear, viewMonthIndex, today, fimiFecha);
  } else if (isPastViewMonth(viewYear, viewMonthIndex, today)) {
    columns = buildPastMonthWindow(profile, viewYear, viewMonthIndex, fimiFecha);
  }
  return {
    columns,
    splitAt: splitMonthAt(columns.length),
    viewYear,
    viewMonthIndex,
    isCurrentMonth,
    label: buildWindowLabel(columns, viewYear, viewMonthIndex)
  };
}
function findRowInMonth(profile, monthKey, rowKey) {
  const month = profile && profile.months ? profile.months[monthKey] : null;
  if (!month || !month.rows) return null;
  for (let i = 0; i < month.rows.length; i += 1) {
    if (month.rows[i].rowKey === rowKey) return month.rows[i];
  }
  return null;
}
function findRowWithDayInMonth(profile, monthKey, rowKey, day) {
  const month = profile && profile.months ? profile.months[monthKey] : null;
  if (!month || !month.rows) return null;
  for (let i = 0; i < month.rows.length; i += 1) {
    const row = month.rows[i];
    if (row.rowKey !== rowKey) continue;
    if (dayValueInMap(row.days, day) > 0) return row;
  }
  return findRowInMonth(profile, monthKey, rowKey);
}
function primaryMonthKeyFromColumns(columns) {
  if (!columns.length) return "";
  return columns[columns.length - 1].monthKey;
}
function unifyRowsForWindow(profile, columns) {
  if (!columns.length) return [];
  const monthKeys = [];
  const seenMk = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < columns.length; i += 1) {
    const mk = columns[i].monthKey;
    if (!seenMk[mk]) {
      seenMk[mk] = true;
      monthKeys.push(mk);
    }
  }
  const primaryKey = primaryMonthKeyFromColumns(columns);
  const rowKeys = [];
  const seenRow = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < monthKeys.length; i += 1) {
    const month = profile.months ? profile.months[monthKeys[i]] : null;
    if (!month || !month.rows) continue;
    for (let j = 0; j < month.rows.length; j += 1) {
      const rk = month.rows[j].rowKey;
      if (seenRow[rk]) continue;
      seenRow[rk] = true;
      rowKeys.push(rk);
    }
  }
  const unified = rowKeys.map(function(rowKey) {
    const primary = findRowInMonth(profile, primaryKey, rowKey);
    let fallback = null;
    for (let i = 0; i < monthKeys.length; i += 1) {
      if (monthKeys[i] === primaryKey) continue;
      fallback = findRowInMonth(profile, monthKeys[i], rowKey);
      if (fallback) break;
    }
    const src = primary || fallback;
    if (!src) return null;
    return {
      rowKey: src.rowKey,
      med: src.med,
      dosis: src.dosis,
      freq: src.freq,
      via: src.via,
      cat: src.cat,
      catOverride: src.catOverride,
      hidden: src.hidden
    };
  }).filter(Boolean);
  unified.sort(function(a, b) {
    const medCmp = String(a.med || "").localeCompare(String(b.med || ""), "es");
    if (medCmp !== 0) return medCmp;
    return String(a.rowKey).localeCompare(String(b.rowKey), "es");
  });
  return unified;
}
function cellValueAtColumn(profile, rowKey, column) {
  const month = profile && profile.months ? profile.months[column.monthKey] : null;
  if (!month || !month.rows) return 0;
  let best = 0;
  for (let i = 0; i < month.rows.length; i += 1) {
    const row = month.rows[i];
    if (row.rowKey !== rowKey) continue;
    const v = dayValueInMap(row.days, column.day);
    if (v > best) best = v;
  }
  return best;
}
function toggleNotAdminAtColumn(profile, rowKey, column) {
  const base = profile && profile.months ? profile : { months: {} };
  const monthKey = column.monthKey;
  const month = base.months[monthKey];
  if (!month) return base;
  const row = findRowWithDayInMonth(base, monthKey, rowKey, column.day);
  if (!row) return base;
  const nextNotAdmin = toggleNotAdmin(row.days, row.notAdmin, column.day);
  const rows = (month.rows || []).map(function(r) {
    if (r.rowKey !== rowKey) return r;
    return Object.assign({}, r, { notAdmin: nextNotAdmin });
  });
  const months = Object.assign({}, base.months);
  months[monthKey] = Object.assign({}, month, { rows });
  return { months };
}
function notAdminAtColumn(profile, rowKey, column) {
  const month = profile && profile.months ? profile.months[column.monthKey] : null;
  if (!month || !month.rows) return false;
  for (let i = 0; i < month.rows.length; i += 1) {
    const row = month.rows[i];
    if (row.rowKey !== rowKey) continue;
    if (!(dayValueInMap(row.days, column.day) > 0)) continue;
    const na = row.notAdmin || {};
    if (na[column.day] || na[String(column.day)]) return true;
  }
  return false;
}
function latestVariantInWindow(profile, columns, variants) {
  if (!variants.length) return null;
  for (let i = columns.length - 1; i >= 0; i -= 1) {
    const col = columns[i];
    for (let v = 0; v < variants.length; v += 1) {
      if (cellValueAtColumn(profile, variants[v].rowKey, col) > 0) {
        return variants[v];
      }
    }
  }
  return variants[0];
}
function adherenceStatsForRowKeys(profile, rowKeys, columns) {
  let indicated = 0;
  let missed = 0;
  const missedDays = [];
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i];
    let dayIndicated = false;
    let dayMissed = false;
    for (let k = 0; k < rowKeys.length; k += 1) {
      const rk = rowKeys[k];
      if (!(cellValueAtColumn(profile, rk, col) > 0)) continue;
      dayIndicated = true;
      if (notAdminAtColumn(profile, rk, col)) dayMissed = true;
    }
    if (!dayIndicated) continue;
    indicated += 1;
    if (dayMissed) {
      missed += 1;
      missedDays.push(col.day);
    }
  }
  return {
    indicated,
    effective: indicated - missed,
    missed,
    missedDays
  };
}
function groupUnifiedRowsByMed(unified, profile, columns) {
  if (!unified.length) return [];
  const byMed = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < unified.length; i += 1) {
    const row = unified[i];
    const gk = buildMedPharmMedGroupKey(row.med);
    if (!byMed[gk]) byMed[gk] = [];
    byMed[gk].push(row);
  }
  const groups = Object.keys(byMed).map(function(gk) {
    const variants = byMed[gk].slice();
    variants.sort(function(a, b) {
      return String(a.rowKey).localeCompare(String(b.rowKey), "es");
    });
    const currentVariant = latestVariantInWindow(profile, columns, variants) || variants[0];
    return {
      medGroupKey: gk,
      med: extractMedBaseName(currentVariant.med) || currentVariant.med,
      variants,
      rowKeys: variants.map(function(v) {
        return v.rowKey;
      }),
      currentVariant
    };
  });
  groups.sort(function(a, b) {
    return String(a.med || "").localeCompare(String(b.med || ""), "es");
  });
  return groups;
}
function rowsForMedGroup(unified, medGroupKey) {
  return unified.filter(function(r) {
    return buildMedPharmMedGroupKey(r.med) === medGroupKey;
  });
}

// public/js/features/med-pharm-profile-state.mjs
var MONTH_NAMES2 = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];
var MONTH_ABBR2 = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic"
];
var mp = {
  rt: {
    getActiveId() {
      return null;
    },
    showToast() {
    },
    refreshMedPanel() {
    }
  },
  medSubview: "receta",
  viewYear: (/* @__PURE__ */ new Date()).getFullYear(),
  viewMonthIndex: (/* @__PURE__ */ new Date()).getMonth(),
  listFilter: "TODOS",
  showHiddenMedRows: false,
  openMedGroupKey: null,
  uiWired: false,
  dismissWired: false,
  lastPharmPanelPatientId: null
};
function registerMedPharmProfileRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(mp.rt, ctx);
}
function getMedSubview() {
  return mp.medSubview;
}
function monthLabel(year, monthIndex) {
  return MONTH_NAMES2[monthIndex] + " " + year;
}
function todayParts() {
  var t = /* @__PURE__ */ new Date();
  return { year: t.getFullYear(), monthIndex: t.getMonth(), day: t.getDate() };
}
function isToday(year, monthIndex, day) {
  var t = todayParts();
  return t.year === year && t.monthIndex === monthIndex && t.day === day;
}
function getProfile(pid) {
  return getMedPharmProfileByPatient()[pid] || null;
}
function getViewMonth(pid) {
  var profile = getProfile(pid);
  if (!profile) return null;
  return getMonthFromProfile(profile, mp.viewYear, mp.viewMonthIndex);
}
function getFimiFechaForPatient(patientId) {
  var patient = getPatients().find(function(p) {
    return p.id === patientId;
  });
  return patient ? patient.fimiFecha : "";
}
function getViewWindow(pid) {
  var profile = getProfile(pid);
  return buildPharmViewWindow({
    profile: profile || { months: {} },
    viewYear: mp.viewYear,
    viewMonthIndex: mp.viewMonthIndex,
    today: todayParts(),
    fimiFecha: getFimiFechaForPatient(pid)
  });
}
function monthRowForColumn(profile, rowKey, column) {
  var month = profile && profile.months ? profile.months[column.monthKey] : null;
  if (!month || !month.rows) return null;
  for (var i = 0; i < month.rows.length; i += 1) {
    if (month.rows[i].rowKey === rowKey) return month.rows[i];
  }
  return null;
}
function notAdminAtColumn2(profile, rowKey, column) {
  var row = monthRowForColumn(profile, rowKey, column);
  if (!row || !row.notAdmin) return false;
  return !!(row.notAdmin[column.day] || row.notAdmin[String(column.day)]);
}
function windowHasMultipleMonths(columns) {
  if (!columns || columns.length < 2) return false;
  var mk = columns[0].monthKey;
  for (var i = 1; i < columns.length; i += 1) {
    if (columns[i].monthKey !== mk) return true;
  }
  return false;
}
function needsSomePharmReclassify(row) {
  if (!row || row.catOverride) return false;
  var c = String(row.cat || "").toUpperCase();
  if (!c) return true;
  if (!isSomePharmCategoryLabel(c)) return true;
  var legacy = ["ABX", "ANALGESIA", "VASOP", "ANTIHTA"];
  return legacy.indexOf(c) >= 0;
}
function reclassifyMonthIfLegacy(pid, month) {
  if (!month || !month.rows) return month;
  var changed = false;
  month.rows.forEach(function(row) {
    if (!needsSomePharmReclassify(row)) return;
    var next = assignSomePharmCategory(row);
    row.cat = next.cat;
    changed = true;
  });
  if (changed) persistClinicalState();
  return month;
}
function formatViaListAbbrev(raw) {
  var v = formatViaShort(raw).toUpperCase();
  if (!v || v === "\u2014") return "\u2014";
  if (v.indexOf("INTRAVEN") >= 0) return "IV";
  if (v === "IV") return "IV";
  if (v.indexOf("ORAL") >= 0) return "VO";
  if (v.indexOf("SUBCUT") >= 0) return "SC";
  if (v.indexOf("INTRAMUS") >= 0) return "IM";
  if (v.indexOf("INHAL") >= 0) return "INH";
  if (v.indexOf("TOPIC") >= 0) return "TOP";
  if (v.length > 5) return v.slice(0, 4);
  return v;
}
function medGroupListTooltip(group) {
  var lines = [];
  group.variants.forEach(function(v) {
    var head = v.med || group.med || "";
    var part = [v.dosis, formatFreqShort(v.freq), formatViaShort(v.via)].filter(Boolean).join(" \xB7 ");
    lines.push(part ? head + " \u2014 " + part : head);
  });
  return lines.join("\n");
}
function rowsMatchingCategoryFilter(rows) {
  if (!rows || !rows.length) return [];
  if (mp.listFilter === "TODOS") return rows;
  return rows.filter(function(r) {
    return rowSomePharmCategory(r) === mp.listFilter;
  });
}
function countHiddenInCategoryFilter(rows) {
  return rowsMatchingCategoryFilter(rows).filter(isMedPharmRowHidden).length;
}
function isMedPharmGroupHidden(group) {
  if (!group || !group.variants || !group.variants.length) return false;
  for (var i = 0; i < group.variants.length; i += 1) {
    if (!isMedPharmRowHidden(group.variants[i])) return false;
  }
  return true;
}
function groupMatchesCategoryFilter(group) {
  if (mp.listFilter === "TODOS") return true;
  for (var i = 0; i < group.variants.length; i += 1) {
    if (rowSomePharmCategory(group.variants[i]) === mp.listFilter) return true;
  }
  return false;
}
function displayRowsForWindow(profile, window2) {
  var unified = unifyRowsForWindow(profile || { months: {} }, window2.columns);
  var rows = rowsMatchingCategoryFilter(unified);
  if (mp.showHiddenMedRows) return rows;
  return rows.filter(function(r) {
    return !isMedPharmRowHidden(r);
  });
}
function displayGroupsForWindow(profile, window2) {
  var unified = unifyRowsForWindow(profile || { months: {} }, window2.columns);
  var groups = groupUnifiedRowsByMed(unified, profile, window2.columns);
  groups = groups.filter(groupMatchesCategoryFilter);
  if (!mp.showHiddenMedRows) {
    groups = groups.filter(function(g) {
      return !isMedPharmGroupHidden(g);
    });
  }
  return groups;
}
function countHiddenGroups(groups) {
  var n = 0;
  for (var i = 0; i < groups.length; i += 1) {
    if (isMedPharmGroupHidden(groups[i])) n += 1;
  }
  return n;
}
function renderFilterSelect(filtro) {
  if (!filtro) return;
  var labels = listSomePharmFilterLabels();
  var html = labels.map(function(lab) {
    var sel = lab === mp.listFilter ? " selected" : "";
    return '<option value="' + esc(lab) + '"' + sel + ">" + esc(lab) + "</option>";
  }).join("");
  if (filtro.innerHTML !== html) filtro.innerHTML = html;
  filtro.value = mp.listFilter;
}
function persistMedPharmProfile(pid, profile) {
  if (!profile || !profileHasMonthData(profile) && !profile.draftPaste) {
    delete getMedPharmProfileByPatient()[pid];
  } else {
    getMedPharmProfileByPatient()[pid] = profile;
  }
}
function closeMedPharmMoreMenu() {
  var d = document.querySelector(".med-pharm-output-more[open]");
  if (d) d.removeAttribute("open");
}

// public/js/ui-tab-motion-ids.mjs
var CONSOLIDATED_TAB_MAP = {
  recetaHu: "itab-salida",
  datos: "itab-paciente",
  todo: "itab-paciente",
  notas: "itab-clinico",
  indica: "itab-clinico",
  manejo: "itab-clinico",
  tend: "itab-resultados",
  cult: "itab-resultados",
  paciente: "itab-paciente",
  clinico: "itab-clinico",
  estadoActual: "itab-estadoActual",
  resultados: "itab-resultados",
  salida: "itab-salida"
};
function consolidatedInnerTabButtonId2(tab) {
  if (CONSOLIDATED_TAB_MAP[tab]) return CONSOLIDATED_TAB_MAP[tab];
  return "itab-paciente";
}
function granularInnerTabButtonId(tab) {
  if (tab === "recetaHu") return "itab-receta-hu";
  return "itab-" + tab;
}

// public/js/ui-tab-motion.mjs
var resizeTimer = null;
var indicatorsReady = false;
function isTabVisible(tabEl) {
  if (!tabEl) return false;
  if (tabEl.offsetParent !== null) return true;
  var style = window.getComputedStyle(tabEl);
  return style.display !== "none" && style.visibility !== "hidden";
}
function ensureTabBarIndicator(barEl) {
  if (!barEl) return null;
  var pill = barEl.querySelector(":scope > .tab-bar-indicator");
  if (pill) return pill;
  pill = document.createElement("span");
  pill.className = "tab-bar-indicator";
  pill.setAttribute("aria-hidden", "true");
  barEl.insertBefore(pill, barEl.firstChild);
  return pill;
}
var TAB_INDICATOR_BASE_PX = 80;
function tabIndicatorTransform(offsetPx, widthPx, basePx) {
  var base = basePx > 0 ? basePx : TAB_INDICATOR_BASE_PX;
  var x = Math.max(0, Number(offsetPx) || 0);
  var w = Math.max(0, Number(widthPx) || 0);
  return "translateX(" + x + "px) scaleX(" + w / base + ")";
}
function syncTabBarIndicator(barEl, tabEl) {
  if (!barEl || !tabEl || !isTabVisible(tabEl)) {
    var pillHide = barEl && barEl.querySelector(":scope > .tab-bar-indicator");
    if (pillHide) pillHide.style.opacity = "0";
    return;
  }
  var pill = ensureTabBarIndicator(barEl);
  if (!pill) return;
  var barRect = barEl.getBoundingClientRect();
  var tabRect = tabEl.getBoundingClientRect();
  pill.style.transform = tabIndicatorTransform(tabRect.left - barRect.left, tabRect.width);
  pill.style.opacity = "1";
}
function syncAppTabIndicator(tab) {
  if (tab === "lan") tab = "lab";
  var bar = document.getElementById("app-main-tablist");
  var btn = document.getElementById("apptab-" + tab);
  syncTabBarIndicator(bar, btn);
}
function innerTabButtonId(tab, opts) {
  opts = opts || {};
  if (opts.consolidated) return consolidatedInnerTabButtonId2(tab);
  return granularInnerTabButtonId(tab);
}
function getExpedienteInnerTabBar() {
  return document.querySelector(".patient-expediente-classic > .exp-expediente-nav > .inner-tab-bar");
}
function syncMedSubviewTabIndicator() {
  var bar = document.getElementById("med-subview-tabs-bar");
  if (!bar) return;
  var active = bar.querySelector(".inner-tab.active");
  syncTabBarIndicator(bar, active);
}
function syncInnerTabIndicator(tab, opts) {
  opts = opts || {};
  var bar = getExpedienteInnerTabBar();
  var btnId = opts.consolidated && opts.settings ? consolidatedInnerTabButtonId(tab, opts.settings) : innerTabButtonId(tab, opts);
  var btn = document.getElementById(btnId);
  syncTabBarIndicator(bar, btn);
}
var TAB_PANEL_ENTER_FALLBACK_MS = 450;
var enterCleanupTimers = typeof WeakMap === "function" ? /* @__PURE__ */ new WeakMap() : null;
function runTabPanelEnterAnimation(panelEl, enterClass) {
  if (!panelEl || !enterClass) return;
  if (prefersReducedMotion()) return;
  if (document.documentElement.classList.contains("motion-sobrio")) return;
  if (enterCleanupTimers && enterCleanupTimers.has(panelEl)) {
    clearTimeout(enterCleanupTimers.get(panelEl));
    enterCleanupTimers.delete(panelEl);
  }
  panelEl.classList.remove("tab-panel-enter", "app-tab-panel-enter");
  void panelEl.offsetWidth;
  panelEl.classList.add(enterClass);
  var done = false;
  function cleanup() {
    if (done) return;
    done = true;
    panelEl.removeEventListener("animationend", onEnd);
    if (enterCleanupTimers) {
      var t = enterCleanupTimers.get(panelEl);
      if (t) clearTimeout(t);
      enterCleanupTimers.delete(panelEl);
    }
    panelEl.classList.remove("tab-panel-enter", "app-tab-panel-enter");
  }
  function onEnd(ev) {
    if (ev && ev.target !== panelEl) return;
    cleanup();
  }
  panelEl.addEventListener("animationend", onEnd);
  var timer = setTimeout(cleanup, TAB_PANEL_ENTER_FALLBACK_MS);
  if (enterCleanupTimers) enterCleanupTimers.set(panelEl, timer);
}
function animateTabPanelEnter(panelEl) {
  runTabPanelEnterAnimation(panelEl, "tab-panel-enter");
}
var APP_TAB_PANEL_HIDDEN_CLASS = "app-tab-panel-hidden";
function shouldAnimateAppTabPanel() {
  if (prefersReducedMotion()) return false;
  return !document.documentElement.classList.contains("motion-sobrio");
}
function showAppTabPanel(panelEl, animate) {
  if (!panelEl) return;
  panelEl.classList.remove(APP_TAB_PANEL_HIDDEN_CLASS);
  panelEl.style.display = "flex";
  panelEl.style.flex = "1";
  panelEl.style.overflow = "hidden";
  panelEl.style.minHeight = "0";
  if (!animate || !shouldAnimateAppTabPanel()) return;
  var id = panelEl.id ? String(panelEl.id) : "";
  var enterClass = id.startsWith("appcontent-") ? "app-tab-panel-enter" : "tab-panel-enter";
  runTabPanelEnterAnimation(panelEl, enterClass);
}
function hideAppTabPanel(panelEl) {
  if (!panelEl) return;
  if (enterCleanupTimers && enterCleanupTimers.has(panelEl)) {
    clearTimeout(enterCleanupTimers.get(panelEl));
    enterCleanupTimers.delete(panelEl);
  }
  panelEl.classList.add(APP_TAB_PANEL_HIDDEN_CLASS);
  panelEl.classList.remove("tab-panel-enter", "app-tab-panel-enter");
}
function syncSubTabBarIndicator(barEl) {
  if (!barEl) return;
  var active = barEl.querySelector(".exp-segment-btn.active") || barEl.querySelector(".manejo-subtab.manejo-subtab--active") || barEl.querySelector(".manejo-subtab.active") || barEl.querySelector('[aria-selected="true"]');
  syncTabBarIndicator(barEl, active);
}
function syncAllSubTabIndicators() {
  document.querySelectorAll(".exp-segment-bar, .manejo-subtabs, .rpc-subtab-bar").forEach(function(bar) {
    if (bar.offsetParent === null && window.getComputedStyle(bar).display === "none") return;
    syncSubTabBarIndicator(bar);
  });
}
function syncExpedienteSegmentIndicators(settings, granularTab) {
  var target = resolveConsolidatedTarget(granularTab, settings || {});
  if (target.tab === "clinico") {
    syncSubTabBarIndicator(document.getElementById("exp-segment-clinico"));
    if (target.section === "manejo") {
      syncSubTabBarIndicator(document.querySelector(".manejo-subtabs"));
    }
  } else if (target.tab === "resultados") {
    syncSubTabBarIndicator(document.getElementById("exp-segment-resultados"));
  } else if (target.tab === "salida") {
    syncSubTabBarIndicator(document.getElementById("exp-segment-salida"));
  }
}
function scheduleIndicatorSync() {
  var appTab = getActiveAppTabFromDom();
  syncAppTabIndicator(appTab);
  if (appTab === "med") {
    syncMedSubviewTabIndicator();
    return;
  }
  if (isConsolidatedExpedienteTabsVisible()) {
    var bar = getExpedienteInnerTabBar();
    var conTabs = document.querySelectorAll(".exp-consolidated-tab");
    for (var i = 0; i < conTabs.length; i++) {
      if (conTabs[i].classList.contains("active")) {
        syncTabBarIndicator(bar, conTabs[i]);
        syncAllSubTabIndicators();
        return;
      }
    }
  }
  syncInnerTabIndicator(getActiveInnerTabFromDom());
  syncAllSubTabIndicators();
}
function getActiveAppTabFromDom() {
  var tabs = ["lab", "nota", "med", "agenda"];
  for (var i = 0; i < tabs.length; i++) {
    var btn = document.getElementById("apptab-" + tabs[i]);
    if (btn && btn.classList.contains("active")) return tabs[i];
  }
  return "lab";
}
function isConsolidatedExpedienteTabsVisible() {
  var first = document.querySelector(".exp-consolidated-tab");
  return !!(first && first.style.display !== "none");
}
function getActiveInnerTabFromDom() {
  if (isConsolidatedExpedienteTabsVisible()) {
    var conTabs = document.querySelectorAll(".exp-consolidated-tab");
    for (var c = 0; c < conTabs.length; c++) {
      if (conTabs[c].classList.contains("active")) return conTabs[c].id.replace(/^itab-/, "");
    }
  }
  var ids = ["datos", "notas", "indica", "tend", "cult", "listado", "todo", "manejo", "recetaHu"];
  for (var i = 0; i < ids.length; i++) {
    var btn = document.getElementById(innerTabButtonId(ids[i]));
    if (btn && btn.classList.contains("active")) return ids[i];
  }
  return "todo";
}
function initTabBarMotion() {
  if (indicatorsReady) {
    scheduleIndicatorSync();
    return;
  }
  ensureTabBarIndicator(document.getElementById("app-main-tablist"));
  ensureTabBarIndicator(getExpedienteInnerTabBar());
  ensureTabBarIndicator(document.getElementById("med-subview-tabs-bar"));
  document.querySelectorAll(".exp-segment-bar, .manejo-subtabs, .rpc-subtab-bar").forEach(function(bar) {
    ensureTabBarIndicator(bar);
  });
  document.documentElement.classList.add("tab-bar-indicators-ready");
  indicatorsReady = true;
  window.addEventListener("resize", function() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scheduleIndicatorSync, 100);
  });
  requestAnimationFrame(function() {
    requestAnimationFrame(scheduleIndicatorSync);
  });
}

// public/js/features/med-pharm-profile-subview.mjs
function syncSubviewVisibility() {
  var receta = document.getElementById("med-subview-receta");
  var perfil = document.getElementById("med-subview-perfil");
  if (receta) receta.style.display = mp.medSubview === "receta" ? "" : "none";
  if (perfil) perfil.style.display = mp.medSubview === "perfil" ? "" : "none";
  var recetaTab = document.getElementById("med-itab-receta");
  var perfilTab = document.getElementById("med-itab-perfil");
  if (recetaTab) {
    var onReceta = mp.medSubview === "receta";
    recetaTab.classList.toggle("active", onReceta);
    recetaTab.setAttribute("aria-selected", onReceta ? "true" : "false");
  }
  if (perfilTab) {
    var onPerfil = mp.medSubview === "perfil";
    perfilTab.classList.toggle("active", onPerfil);
    perfilTab.setAttribute("aria-selected", onPerfil ? "true" : "false");
  }
  var bar = document.getElementById("med-subview-tabs-bar");
  var activeTab = mp.medSubview === "perfil" ? perfilTab : recetaTab;
  syncTabBarIndicator(bar, activeTab);
}
function setMedSubview(mode) {
  if (mode !== "receta" && mode !== "perfil") return;
  mp.medSubview = mode;
  syncSubviewVisibility();
  mp.rt.refreshMedPanel();
}
function initMedPharmSubviewUiShell(wireUiOnce2) {
  wireUiOnce2();
  syncSubviewVisibility();
}

// public/js/features/med-pharm-profile-bridge.mjs
var medPharmProfileBridge = {
  renderMedPharmProfilePanel() {
  },
  openMedPharmFullModal() {
  },
  openMedPharmMedGroupModal(_medGroupKey) {
  },
  openMedPharmPasteModal() {
  },
  importMedPharmMonthPaste() {
  }
};

// public/js/features/med-pharm-profile-adh.mjs
function formatAdhDayList(columns, multiMonth) {
  if (!columns.length) return "\u2014";
  return columns.map(function(col) {
    var dd = String(col.day).padStart(2, "0");
    return multiMonth ? dd + " " + MONTH_ABBR2[col.monthIndex] : dd;
  }).join(", ");
}
function adherenceDayDetail(row, columns, profile) {
  return adherenceDayDetailForRowKeys(profile, [row.rowKey], columns);
}
function adherenceDayDetailForRowKeys(profile, rowKeys, columns) {
  var indicated = [];
  var missed = [];
  for (var i = 0; i < columns.length; i += 1) {
    var col = columns[i];
    var dayIndicated = false;
    var dayMissed = false;
    for (var k = 0; k < rowKeys.length; k += 1) {
      if (!(cellValueAtColumn(profile, rowKeys[k], col) > 0)) continue;
      dayIndicated = true;
      if (notAdminAtColumn2(profile, rowKeys[k], col)) dayMissed = true;
    }
    if (!dayIndicated) continue;
    indicated.push(col);
    if (dayMissed) missed.push(col);
  }
  var administered = indicated.filter(function(col2) {
    return missed.indexOf(col2) < 0;
  });
  return { indicated, missed, administered };
}
function adherenceStatsForWindow(profile, rowKey, columns) {
  var indicated = 0;
  var missed = 0;
  var missedDays = [];
  for (var i = 0; i < columns.length; i += 1) {
    var col = columns[i];
    if (!(cellValueAtColumn(profile, rowKey, col) > 0)) continue;
    indicated += 1;
    if (notAdminAtColumn2(profile, rowKey, col)) {
      missed += 1;
      missedDays.push(col.day);
    }
  }
  return {
    indicated,
    effective: indicated - missed,
    missed,
    missedDays
  };
}
function buildAdhPanelHtmlForGroup(group, columns, profile, windowLabel) {
  var detail = adherenceDayDetailForRowKeys(profile, group.rowKeys, columns);
  var multiMonth = windowHasMultipleMonths(columns);
  var monthTitle = windowLabel || monthLabel(mp.viewYear, mp.viewMonthIndex);
  var regimenNote = group.variants.length > 1 ? '<p class="med-pharm-adh-panel-regimens">' + esc(String(group.variants.length)) + " reg\xEDmenes (dosis distintas) en esta ventana</p>" : "";
  return regimenNote + '<p class="med-pharm-adh-panel-head">' + esc(monthTitle) + '</p><div class="med-pharm-adh-panel-section"><span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--ok">Administrados (por defecto)</span><p class="med-pharm-adh-panel-days">' + esc(formatAdhDayList(detail.administered, multiMonth)) + '</p></div><div class="med-pharm-adh-panel-section"><span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--miss">No administrados</span><p class="med-pharm-adh-panel-days">' + esc(formatAdhDayList(detail.missed, multiMonth)) + '</p></div><p class="med-pharm-adh-panel-foot">' + esc(String(detail.administered.length)) + " administrados \xB7 " + esc(String(detail.missed.length)) + " no \xB7 " + esc(String(detail.indicated.length)) + " indicados</p>";
}
function buildAdhPanelHtml(row, columns, profile, windowLabel) {
  var detail = adherenceDayDetail(row, columns, profile);
  var multiMonth = windowHasMultipleMonths(columns);
  var monthTitle = windowLabel || monthLabel(mp.viewYear, mp.viewMonthIndex);
  return '<p class="med-pharm-adh-panel-head">' + esc(monthTitle) + '</p><div class="med-pharm-adh-panel-section"><span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--ok">Administrados (por defecto)</span><p class="med-pharm-adh-panel-days">' + esc(formatAdhDayList(detail.administered, multiMonth)) + '</p></div><div class="med-pharm-adh-panel-section"><span class="med-pharm-adh-panel-label med-pharm-adh-panel-label--miss">No administrados</span><p class="med-pharm-adh-panel-days">' + esc(formatAdhDayList(detail.missed, multiMonth)) + '</p></div><p class="med-pharm-adh-panel-foot">' + esc(String(detail.administered.length)) + " administrados \xB7 " + esc(String(detail.missed.length)) + " no \xB7 " + esc(String(detail.indicated.length)) + " indicados</p>";
}
function buildAdhTriggerHtml(row, stats, columns, profile, windowLabel) {
  if (!stats.indicated) {
    return '<span class="med-pharm-adh-trigger med-pharm-adh-trigger--empty">\u2014</span>';
  }
  var label = stats.missed > 0 ? stats.effective + " efect. \xB7 " + stats.missed + " no" : stats.effective + " d efectivos";
  return '<span class="med-pharm-adh-wrap"><button type="button" class="med-pharm-adh-trigger' + (stats.missed > 0 ? " med-pharm-adh-trigger--miss" : "") + '" data-row-key="' + esc(row.rowKey) + '" aria-haspopup="dialog">' + esc(label) + '</button><div class="med-pharm-adh-panel" role="dialog" aria-hidden="true">' + buildAdhPanelHtml(row, columns, profile, windowLabel) + "</div></span>";
}
function buildAdhTriggerHtmlForGroup(group, stats, columns, profile, windowLabel) {
  if (!stats.indicated) {
    return '<span class="med-pharm-adh-trigger med-pharm-adh-trigger--empty">\u2014</span>';
  }
  var label = stats.missed > 0 ? stats.effective + " efect. \xB7 " + stats.missed + " no" : stats.effective + " d efectivos";
  return '<span class="med-pharm-adh-wrap"><button type="button" class="med-pharm-adh-trigger' + (stats.missed > 0 ? " med-pharm-adh-trigger--miss" : "") + '" data-med-group-key="' + esc(group.medGroupKey) + '" aria-haspopup="dialog">' + esc(label) + '</button><div class="med-pharm-adh-panel" role="dialog" aria-hidden="true">' + buildAdhPanelHtmlForGroup(group, columns, profile, windowLabel) + "</div></span>";
}
function buildMedCellInner(row, stats, columns, profile, windowLabel) {
  return '<div class="med-cell-name">' + esc(row.med) + '</div><div class="med-cell-adh">' + buildAdhTriggerHtml(row, stats, columns, profile, windowLabel) + "</div>";
}
var _medPharmAdhHoverWired = false;
var _medPharmAdhHideDelayMs = 140;
function medPharmAdhPanelForWrap(wrap) {
  return wrap.querySelector(".med-pharm-adh-panel") || wrap._medPharmAdhPanelEl || null;
}
function hideMedPharmAdhPanel(panel) {
  if (!panel) return;
  if (panel._medPharmAdhHideTid) {
    clearTimeout(panel._medPharmAdhHideTid);
    panel._medPharmAdhHideTid = null;
  }
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  panel.style.left = "";
  panel.style.top = "";
  panel.style.visibility = "";
  var wrap = panel._medPharmAdhOwnerWrap;
  if (wrap) wrap._medPharmAdhPanelEl = null;
  panel._medPharmAdhOwnerWrap = null;
  if (wrap && wrap.isConnected) {
    wrap.appendChild(panel);
  } else if (panel.parentNode === document.body) {
    panel.remove();
  }
}
function scheduleHideMedPharmAdhPanel(panel) {
  if (!panel) return;
  if (panel._medPharmAdhHideTid) clearTimeout(panel._medPharmAdhHideTid);
  panel._medPharmAdhHideTid = setTimeout(function() {
    panel._medPharmAdhHideTid = null;
    hideMedPharmAdhPanel(panel);
  }, _medPharmAdhHideDelayMs);
}
function positionMedPharmAdhPanel(wrap) {
  var panel = medPharmAdhPanelForWrap(wrap);
  var trigger = wrap.querySelector(".med-pharm-adh-trigger");
  if (!panel || !trigger) return;
  document.querySelectorAll(".med-pharm-adh-panel.is-open").forEach(function(p) {
    var w = p._medPharmAdhOwnerWrap;
    if (w !== wrap) hideMedPharmAdhPanel(p);
  });
  if (panel._medPharmAdhHideTid) {
    clearTimeout(panel._medPharmAdhHideTid);
    panel._medPharmAdhHideTid = null;
  }
  panel._medPharmAdhOwnerWrap = wrap;
  wrap._medPharmAdhPanelEl = panel;
  if (panel.parentNode !== document.body) document.body.appendChild(panel);
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  panel.style.visibility = "hidden";
  panel.style.left = "-9999px";
  panel.style.top = "0";
  void panel.offsetWidth;
  var anchor = trigger.getBoundingClientRect();
  var pr = panel.getBoundingClientRect();
  var margin = 8;
  var gap = 4;
  var top = anchor.bottom + gap;
  var left = anchor.left;
  if (top + pr.height > window.innerHeight - margin) {
    top = Math.max(margin, anchor.top - pr.height - gap);
  }
  if (left + pr.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - pr.width - margin);
  }
  if (left < margin) left = margin;
  panel.style.left = Math.round(left) + "px";
  panel.style.top = Math.round(top) + "px";
  panel.style.visibility = "";
}
function wireMedPharmAdhHoverPanels(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll(".med-pharm-adh-panel").forEach(function(panel) {
    if (panel._medPharmAdhPanelHoverListeners) return;
    panel._medPharmAdhPanelHoverListeners = true;
    panel.addEventListener("mouseenter", function() {
      if (panel._medPharmAdhHideTid) {
        clearTimeout(panel._medPharmAdhHideTid);
        panel._medPharmAdhHideTid = null;
      }
    });
    panel.addEventListener("mouseleave", function(ev) {
      var w = panel._medPharmAdhOwnerWrap || panel.closest(".med-pharm-adh-wrap");
      var toEl = ev.relatedTarget;
      if (toEl && w && (w.contains(toEl) || panel.contains(toEl))) return;
      scheduleHideMedPharmAdhPanel(panel);
    });
  });
}
function wireMedPharmAdhHoverOnce() {
  if (_medPharmAdhHoverWired) return;
  _medPharmAdhHoverWired = true;
  function wrapFromTarget(t) {
    if (!t || !t.closest) return null;
    return t.closest(".med-pharm-adh-wrap");
  }
  document.addEventListener("mouseover", function(ev) {
    var wrap = wrapFromTarget(ev.target);
    if (!wrap) return;
    positionMedPharmAdhPanel(wrap);
  });
  document.addEventListener("mouseout", function(ev) {
    var wrap = wrapFromTarget(ev.target);
    if (!wrap) return;
    var panel = medPharmAdhPanelForWrap(wrap);
    if (!panel) return;
    var toEl = ev.relatedTarget;
    if (toEl && (wrap.contains(toEl) || panel.contains(toEl))) return;
    scheduleHideMedPharmAdhPanel(panel);
  });
  document.addEventListener("focusin", function(ev) {
    var wrap = wrapFromTarget(ev.target);
    if (!wrap) return;
    positionMedPharmAdhPanel(wrap);
  });
  document.addEventListener("focusout", function(ev) {
    var wrap = wrapFromTarget(ev.target);
    if (!wrap) return;
    var panel = medPharmAdhPanelForWrap(wrap);
    if (!panel) return;
    var rel = ev.relatedTarget;
    if (rel && (wrap.contains(rel) || panel.contains(rel))) return;
    hideMedPharmAdhPanel(panel);
  });
  window.addEventListener(
    "scroll",
    function() {
      document.querySelectorAll(".med-pharm-adh-panel.is-open").forEach(hideMedPharmAdhPanel);
    },
    true
  );
}

// public/js/features/med-pharm-profile-grid.mjs
function padDayCells(tr, count, target, tag, padClass) {
  while (count < target) {
    var cell = document.createElement(tag);
    cell.className = padClass;
    if (tag === "th") cell.innerHTML = "&nbsp;";
    tr.appendChild(cell);
    count += 1;
  }
}
function appendDayHeader(tr, columns, from, to) {
  var prevMonthKey = from > 0 ? columns[from - 1].monthKey : "";
  for (var i = from; i < to; i += 1) {
    var col = columns[i];
    var th = document.createElement("th");
    th.className = "day-hdr" + (isToday(col.year, col.monthIndex, col.day) ? " today-col" : "");
    if (col.monthKey !== prevMonthKey) {
      th.classList.add("day-hdr-month");
      if (i > 0) th.classList.add("day-hdr-month-boundary");
      var abbr = document.createElement("span");
      abbr.className = "day-hdr-month-label";
      abbr.textContent = MONTH_ABBR2[col.monthIndex];
      th.appendChild(abbr);
      prevMonthKey = col.monthKey;
    }
    th.appendChild(document.createTextNode(String(col.day).padStart(2, "0")));
    tr.appendChild(th);
  }
}
function appendDayCell(tr, profile, row, column, monthBoundary) {
  var td = document.createElement("td");
  td.className = "day-pad" + (isToday(column.year, column.monthIndex, column.day) ? " today-col" : "");
  if (monthBoundary) td.classList.add("day-pad-month-boundary");
  var v = cellValueAtColumn(profile, row.rowKey, column);
  if (!(v > 0)) {
    tr.appendChild(td);
    return;
  }
  td.classList.add("indicated");
  if (notAdminAtColumn2(profile, row.rowKey, column)) {
    td.classList.add("not-admin");
  }
  if (v > 1) {
    var span = document.createElement("span");
    span.className = "x2";
    span.textContent = "\xD72";
    td.appendChild(span);
  }
  td.dataset.rowKey = row.rowKey;
  td.dataset.year = String(column.year);
  td.dataset.month = String(column.monthIndex);
  td.dataset.day = String(column.day);
  td.title = "D\xEDa " + column.day + " " + MONTH_ABBR2[column.monthIndex] + " \u2014 clic para marcar no administrado";
  tr.appendChild(td);
}
function wireGridDayClicks(root) {
  if (!root || root._medPharmDayClickWired) return;
  root._medPharmDayClickWired = true;
  root.addEventListener("click", function(e) {
    var dayCell = e.target.closest("td.day-pad.indicated[data-row-key]");
    if (!dayCell || !root.contains(dayCell)) return;
    e.preventDefault();
    e.stopPropagation();
    onGridDayClick(
      dayCell.dataset.rowKey,
      parseInt(dayCell.dataset.year, 10),
      parseInt(dayCell.dataset.month, 10),
      parseInt(dayCell.dataset.day, 10)
    );
  });
}
function onGridDayClick(rowKey, year, monthIndex, day) {
  var pid = mp.rt.getActiveId();
  if (!pid) return;
  var col = makeColumn(year, monthIndex, day);
  var profile = getProfile(pid) || { months: {} };
  profile = toggleNotAdminAtColumn(profile, rowKey, col);
  getMedPharmProfileByPatient()[pid] = profile;
  persistClinicalState();
  refreshOpenMedPharmGrids();
  medPharmProfileBridge.renderMedPharmProfilePanel();
}
function refreshOpenMedPharmGrids() {
  var pid = mp.rt.getActiveId();
  if (!pid) return;
  var profile = getProfile(pid) || { months: {} };
  var window2 = getViewWindow(pid);
  if (!window2.columns.length) return;
  var fullEl = document.getElementById("med-pharm-modal-full");
  if (fullEl && fullEl.classList.contains("open")) {
    var fullBody = document.getElementById("med-pharm-modal-full-body");
    mountSomeGrid(window2, displayRowsForWindow(profile, window2), profile, fullBody);
  }
  var oneEl = document.getElementById("med-pharm-modal-one");
  if (oneEl && oneEl.classList.contains("open") && mp.openMedGroupKey) {
    var unified = unifyRowsForWindow(profile, window2.columns);
    var variantRows = rowsForMedGroup(unified, mp.openMedGroupKey);
    if (variantRows.length) {
      var oneBody = document.getElementById("med-pharm-modal-one-body");
      var sub = document.getElementById("med-pharm-modal-one-sub");
      mountSomeGrid(window2, variantRows, profile, oneBody);
      if (sub) {
        sub.textContent = buildMedGroupModalSubtitle(profile, window2, variantRows);
      }
    }
  }
}
function mountSomeGrid(window2, rows, profile, container) {
  if (!container) return;
  container.innerHTML = "";
  var wrap = document.createElement("div");
  wrap.className = "med-pharm-grid-scope some-grid-wrap med-pharm-scroll";
  wrap.appendChild(buildSomeGridTable(window2, rows, profile));
  container.appendChild(wrap);
  wireGridDayClicks(wrap);
  wireMedPharmAdhHoverPanels(wrap);
}
function appendDayCellsForSlice(tr, profile, row, columns, from, to) {
  var prevMonthKey = from > 0 ? columns[from - 1].monthKey : "";
  for (var i = from; i < to; i += 1) {
    var col = columns[i];
    var boundary = col.monthKey !== prevMonthKey && i > 0;
    appendDayCell(tr, profile, row, col, boundary);
    prevMonthKey = col.monthKey;
  }
}
function appendSomeGridMetaCols(cg) {
  ["col-med", "col-dosis", "col-freq", "col-via"].forEach(function(cls) {
    var col = document.createElement("col");
    col.className = cls;
    cg.appendChild(col);
  });
}
function buildSomeGridTable(window2, rows, profile) {
  var columns = window2.columns;
  var total = columns.length;
  var splitAt = window2.splitAt;
  var table = document.createElement("table");
  table.className = "some-grid-unified";
  var cg = document.createElement("colgroup");
  appendSomeGridMetaCols(cg);
  for (var ci = 0; ci < splitAt; ci += 1) {
    var dayCol = document.createElement("col");
    dayCol.className = "col-day";
    cg.appendChild(dayCol);
  }
  table.appendChild(cg);
  var thead = document.createElement("thead");
  var hdr1 = document.createElement("tr");
  hdr1.className = "hdr-row-1";
  ["Medicamento", "Dosis", "Freq", "V\xEDa"].forEach(function(label, i) {
    var th = document.createElement("th");
    th.className = "col-meta-hdr col-" + ["med", "dosis", "freq", "via"][i];
    th.rowSpan = 2;
    th.textContent = label;
    hdr1.appendChild(th);
  });
  appendDayHeader(hdr1, columns, 0, Math.min(splitAt, total));
  padDayCells(hdr1, hdr1.querySelectorAll("th.day-hdr").length, splitAt, "th", "day-hdr day-hdr-empty");
  thead.appendChild(hdr1);
  var hdr2 = document.createElement("tr");
  hdr2.className = "hdr-row-2";
  if (total > splitAt) {
    appendDayHeader(hdr2, columns, splitAt, total);
  }
  padDayCells(hdr2, hdr2.querySelectorAll("th.day-hdr").length, splitAt, "th", "day-hdr day-hdr-empty");
  thead.appendChild(hdr2);
  table.appendChild(thead);
  var tbody = document.createElement("tbody");
  rows.forEach(function(row, rowIndex) {
    var stats = adherenceStatsForWindow(profile, row.rowKey, columns);
    var missCls = stats.missed > 0 ? " has-misses" : "";
    var blockStartCls = rowIndex > 0 ? " med-row-block-start" : "";
    var blockToneCls = rowIndex % 2 === 1 ? " med-block-b" : " med-block-a";
    var tr1 = document.createElement("tr");
    tr1.className = "day-band" + missCls + blockStartCls + blockToneCls;
    var medTd = document.createElement("td");
    medTd.rowSpan = 2;
    medTd.className = "col-med";
    medTd.innerHTML = buildMedCellInner(row, stats, columns, profile, window2.label);
    tr1.appendChild(medTd);
    var dosisTd = document.createElement("td");
    dosisTd.rowSpan = 2;
    dosisTd.className = "col-dosis";
    dosisTd.textContent = row.dosis || "";
    tr1.appendChild(dosisTd);
    var freqTd = document.createElement("td");
    freqTd.rowSpan = 2;
    freqTd.className = "col-freq";
    freqTd.textContent = formatFreqShort(row.freq);
    tr1.appendChild(freqTd);
    var viaTd = document.createElement("td");
    viaTd.rowSpan = 2;
    viaTd.className = "col-via";
    viaTd.textContent = formatViaShort(row.via);
    tr1.appendChild(viaTd);
    appendDayCellsForSlice(tr1, profile, row, columns, 0, Math.min(splitAt, total));
    padDayCells(tr1, tr1.querySelectorAll("td.day-pad").length, splitAt, "td", "day-pad day-pad-empty");
    tbody.appendChild(tr1);
    var tr2 = document.createElement("tr");
    tr2.className = "day-band med-row-block-end" + missCls + blockToneCls;
    if (total > splitAt) {
      appendDayCellsForSlice(tr2, profile, row, columns, splitAt, total);
    }
    padDayCells(tr2, tr2.querySelectorAll("td.day-pad").length, splitAt, "td", "day-pad day-pad-empty");
    tbody.appendChild(tr2);
  });
  table.appendChild(tbody);
  return table;
}
function buildMedGroupModalSubtitle(profile, window2, variantRows) {
  var rowKeys = variantRows.map(function(r) {
    return r.rowKey;
  });
  var stats = adherenceStatsForRowKeys(profile, rowKeys, window2.columns);
  var parts = [window2.label];
  if (variantRows.length > 1) {
    parts.push(variantRows.length + " reg\xEDmenes (dosis distintas)");
  } else {
    var row = variantRows[0];
    if (row.dosis) parts.push(row.dosis);
    parts.push(formatFreqShort(row.freq) + " \xB7 " + formatViaShort(row.via));
  }
  parts.push(stats.effective + " d efectivos");
  return parts.join(" \xB7 ");
}

// public/js/features/med-pharm-profile-modals.mjs
var MED_PHARM_MODAL_IDS = ["med-pharm-paste-modal", "med-pharm-modal-one", "med-pharm-modal-full"];
function closeModals() {
  MED_PHARM_MODAL_IDS.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.remove("open");
      el.setAttribute("hidden", "");
      el.setAttribute("aria-hidden", "true");
    }
  });
  document.body.classList.remove("rpc-med-pharm-modal-open");
  mp.openMedGroupKey = null;
}
function openMedPharmModal(id) {
  closeModals();
  var el = document.getElementById(id);
  if (!el) return;
  el.removeAttribute("hidden");
  el.setAttribute("aria-hidden", "false");
  el.classList.add("open");
  document.body.classList.add("rpc-med-pharm-modal-open");
}
function closeMedPharmModals() {
  closeModals();
}
function wireMedPharmModalDismiss() {
  if (mp.dismissWired) return;
  mp.dismissWired = true;
  document.addEventListener(
    "keydown",
    function(ev) {
      if (ev.key !== "Escape") return;
      var open = false;
      MED_PHARM_MODAL_IDS.forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.classList.contains("open")) open = true;
      });
      if (!open) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeModals();
    },
    true
  );
  MED_PHARM_MODAL_IDS.forEach(function(id) {
    var bd = document.getElementById(id);
    if (!bd) return;
    bd.addEventListener("click", function(ev) {
      if (!bd.classList.contains("open")) return;
      if (ev.target === bd) closeModals();
    });
  });
}
function onActivePatientChangedForPharm(pid) {
  if (pid === mp.lastPharmPanelPatientId) return;
  mp.lastPharmPanelPatientId = pid;
  closeModals();
}
function openMedPharmPasteModal() {
  var pid = mp.rt.getActiveId();
  if (!pid) {
    mp.rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var ta = document.getElementById("med-pharm-paste");
  openMedPharmModal("med-pharm-paste-modal");
  if (ta) {
    var profile = getProfile(pid);
    ta.value = profile && profile.draftPaste ? profile.draftPaste : "";
    requestAnimationFrame(function() {
      ta.focus();
    });
  }
}
async function deleteMedPharmViewMonth() {
  closeMedPharmMoreMenu();
  var pid = mp.rt.getActiveId();
  if (!pid) {
    mp.rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var profile = getProfile(pid);
  if (!monthHasData(profile, mp.viewYear, mp.viewMonthIndex)) {
    mp.rt.showToast("No hay datos de este mes para eliminar", "error");
    return;
  }
  var label = monthLabel(mp.viewYear, mp.viewMonthIndex);
  var result = await openConfirm({
    weight: "destructive",
    title: "\xBFEliminar el perfil farmacoterap\xE9utico de " + label + "? Las marcas de no administrado y el pegado SOME de ese mes se perder\xE1n.",
    confirmLabel: "Eliminar"
  });
  if (result !== "confirm") {
    return;
  }
  var next = deleteMonthFromProfile(profile, mp.viewYear, mp.viewMonthIndex);
  persistMedPharmProfile(pid, next);
  closeModals();
  persistClinicalState();
  medPharmProfileBridge.renderMedPharmProfilePanel();
  mp.rt.showToast("Mes eliminado del perfil", "success");
}
async function deleteMedPharmProfileAll() {
  closeMedPharmMoreMenu();
  var pid = mp.rt.getActiveId();
  if (!pid) {
    mp.rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var profile = getProfile(pid);
  if (!profile || !profileHasMonthData(profile) && !profile.draftPaste) {
    mp.rt.showToast("No hay perfil farmacoterap\xE9utico para borrar", "error");
    return;
  }
  var result = await openConfirm({
    weight: "destructive",
    title: "\xBFBorrar todo el perfil farmacoterap\xE9utico de este paciente? Se eliminar\xE1n todos los meses importados y el borrador de pegado.",
    confirmLabel: "Borrar"
  });
  if (result !== "confirm") {
    return;
  }
  delete getMedPharmProfileByPatient()[pid];
  closeModals();
  persistClinicalState();
  medPharmProfileBridge.renderMedPharmProfilePanel();
  mp.rt.showToast("Perfil farmacoterap\xE9utico borrado", "success");
}
function openMedPharmMedGroupModal(medGroupKey) {
  var pid = mp.rt.getActiveId();
  if (!pid) return;
  var profile = getProfile(pid) || { months: {} };
  var window2 = getViewWindow(pid);
  if (!window2.columns.length) return;
  var unified = unifyRowsForWindow(profile, window2.columns);
  var variantRows = rowsForMedGroup(unified, medGroupKey);
  if (!variantRows.length) return;
  var body = document.getElementById("med-pharm-modal-one-body");
  var title = document.getElementById("med-pharm-modal-one-title");
  var sub = document.getElementById("med-pharm-modal-one-sub");
  if (!body) return;
  if (title) title.textContent = variantRows[0].med || "Medicamento";
  if (sub) sub.textContent = buildMedGroupModalSubtitle(profile, window2, variantRows);
  mountSomeGrid(window2, variantRows, profile, body);
  openMedPharmModal("med-pharm-modal-one");
  mp.openMedGroupKey = medGroupKey;
}
function openMedPharmFullModal() {
  var pid = mp.rt.getActiveId();
  if (!pid) {
    mp.rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var profile = getProfile(pid) || { months: {} };
  var window2 = getViewWindow(pid);
  if (!window2.columns.length) {
    mp.rt.showToast("No hay datos del mes para mostrar", "error");
    return;
  }
  var unified = unifyRowsForWindow(profile, window2.columns);
  var rows = displayRowsForWindow(profile, window2);
  if (!rows.length) {
    var hiddenN = countHiddenInCategoryFilter(unified);
    mp.rt.showToast(
      hiddenN > 0 ? "Solo hay medicamentos ocultos. Activa \xABMostrar ocultos\xBB para ver el calendario." : "No hay medicamentos en el filtro actual",
      "error"
    );
    return;
  }
  var body = document.getElementById("med-pharm-modal-full-body");
  var title = document.getElementById("med-pharm-modal-full-title");
  var sub = document.getElementById("med-pharm-modal-full-sub");
  if (!body) return;
  if (title) {
    title.textContent = "Calendario farmacoterap\xE9utico \u2014 " + window2.label;
  }
  if (sub) {
    var filtLabel = mp.listFilter === "TODOS" ? "Todos los medicamentos" : "Filtro: " + mp.listFilter;
    sub.textContent = filtLabel + " \xB7 " + rows.length + " filas \xB7 formato matriz SOME";
    sub.hidden = false;
  }
  openMedPharmModal("med-pharm-modal-full");
  mountSomeGrid(window2, rows, profile, body);
}
function importMedPharmMonthPaste() {
  var pid = mp.rt.getActiveId();
  if (!pid) {
    mp.rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var ta = document.getElementById("med-pharm-paste");
  var raw = ta ? ta.value : "";
  if (!looksLikeSomePharmMonthPaste(raw)) {
    mp.rt.showToast("No parece un pegado SOME mensual (cabecera con d\xEDas 01, 02\u2026)", "error");
    return;
  }
  var parsed = parseSomePharmMonthPaste(raw, { year: mp.viewYear, monthIndex: mp.viewMonthIndex });
  if (!parsed.rows.length) {
    mp.rt.showToast("No se encontraron filas de medicamento en el pegado", "error");
    return;
  }
  var profile = getProfile(pid) || { months: {} };
  getMedPharmProfileByPatient()[pid] = applySomePasteToProfile(profile, parsed);
  if (getMedPharmProfileByPatient()[pid].draftPaste) delete getMedPharmProfileByPatient()[pid].draftPaste;
  persistClinicalState();
  if (ta) ta.value = "";
  closeModals();
  medPharmProfileBridge.renderMedPharmProfilePanel();
  var msg = "Mes importado (" + parsed.rows.length + " medicamentos)";
  if (parsed.skipped > 0) msg += ". Omitidas " + parsed.skipped + " l\xEDneas.";
  mp.rt.showToast(msg, "success");
}

// public/js/features/med-pharm-profile-render-helpers.mjs
function updateMedPharmLastPasteEl(lastPasteEl, month) {
  if (!lastPasteEl) return;
  var pasted = month && month.lastSomePasteAt;
  if (!pasted) {
    lastPasteEl.hidden = true;
    return;
  }
  var d = new Date(pasted);
  lastPasteEl.textContent = "\xDAltimo pegado: " + String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  lastPasteEl.hidden = false;
}
function renderMedPharmNoPatientState(hint, list) {
  if (hint) {
    hint.style.display = "block";
    hint.textContent = "Selecciona un paciente para ver el perfil farmacoterap\xE9utico.";
  }
  list.innerHTML = "";
}
function renderMedPharmEmptyColumns(list, window2, card, listHead) {
  if (card) card.classList.remove("med-pharm-has-grid");
  if (listHead) listHead.style.display = "";
  list.className = "med-pharm-list-body";
  list.innerHTML = '<div class="med-pharm-empty"><p class="med-pharm-empty-title">Sin datos para ' + esc(window2.label) + '</p><p class="med-pharm-empty-lead">Importa la matriz SOME del hospital o procesa <strong>Receta</strong> en la pesta\xF1a Manejo actual.</p><button type="button" class="btn-generate" data-med-pharm-open-paste>Importar mes SOME</button></div>';
  list.querySelector("[data-med-pharm-open-paste]").addEventListener("click", openMedPharmPasteModal);
}
function renderMedPharmEmptyFilter(list, hiddenCount, card, listHead, showHiddenMedRows) {
  if (card) card.classList.remove("med-pharm-has-grid");
  if (listHead) listHead.style.display = hiddenCount > 0 && showHiddenMedRows ? "" : "none";
  list.className = "med-pharm-list-body";
  list.innerHTML = '<div class="med-pharm-empty med-pharm-empty--filter"><p class="med-pharm-empty-title">Ning\xFAn medicamento visible</p><p class="med-pharm-empty-lead">' + (hiddenCount > 0 ? "Hay " + hiddenCount + " oculto(s) con este filtro. Activa <strong>Mostrar ocultos</strong> para verlos o restaurarlos." : "Prueba otro filtro de categor\xEDa.") + "</p></div>";
}
function medPharmRowKeysAttr(group) {
  return group.rowKeys.join("	");
}
function buildMedPharmNameRow(group, current, stats, columns, profile, windowLabel) {
  var multiRegimen = group.variants.length > 1;
  var nameRow = document.createElement("div");
  nameRow.className = "med-pharm-name-row";
  var nameEl = document.createElement("div");
  nameEl.className = "med-pharm-name";
  nameEl.textContent = group.med || "";
  nameRow.appendChild(nameEl);
  var catEl = document.createElement("span");
  catEl.className = "med-pharm-cat-badge";
  catEl.textContent = rowSomePharmCategory(current);
  nameRow.appendChild(catEl);
  if (multiRegimen) {
    var regEl = document.createElement("span");
    regEl.className = "med-pharm-regimen-badge";
    regEl.textContent = "\xD7" + group.variants.length;
    regEl.title = group.variants.length + " reg\xEDmenes \u2014 ver en D\xEDas";
    nameRow.appendChild(regEl);
  }
  var adhEl = document.createElement("div");
  adhEl.className = "med-cell-adh";
  adhEl.innerHTML = buildAdhTriggerHtmlForGroup(group, stats, columns, profile, windowLabel);
  nameRow.appendChild(adhEl);
  return { nameRow, multiRegimen };
}
function buildMedPharmRowActions(group, isHidden, multiRegimen) {
  var actions = document.createElement("div");
  actions.className = "med-pharm-row-actions";
  var btnDays = document.createElement("button");
  btnDays.type = "button";
  btnDays.className = "med-pharm-btn-dias";
  btnDays.textContent = "D\xEDas";
  btnDays.title = multiRegimen ? "Ver calendario con todas las dosis de este medicamento" : "Ver calendario del medicamento";
  btnDays.addEventListener("click", function(e) {
    e.stopPropagation();
    openMedPharmMedGroupModal(group.medGroupKey);
  });
  actions.appendChild(btnDays);
  var btnVis = document.createElement("button");
  btnVis.type = "button";
  btnVis.className = "med-pharm-btn-visibility";
  var rowKeys = medPharmRowKeysAttr(group);
  if (isHidden) {
    btnVis.textContent = "\u21A9";
    btnVis.setAttribute("aria-label", "Mostrar en la lista");
    btnVis.title = "Volver a mostrar en la lista y calendario";
    btnVis.dataset.medPharmUnhideGroup = rowKeys;
  } else {
    btnVis.textContent = "\xD7";
    btnVis.setAttribute("aria-label", "Ocultar de la lista");
    btnVis.title = "Ocultar de la vista (se conserva en el mes importado)";
    btnVis.dataset.medPharmHideGroup = rowKeys;
    btnVis.classList.add("med-pharm-btn-visibility--icon");
  }
  actions.appendChild(btnVis);
  return actions;
}
function buildMedPharmSummaryRow(group, columns, profile, windowLabel) {
  var current = group.currentVariant;
  var stats = adherenceStatsForRowKeys(profile, group.rowKeys, columns);
  var missCls = stats.missed > 0 ? " has-misses" : "";
  var isHidden = isMedPharmGroupHidden(group);
  var wrap = document.createElement("div");
  wrap.className = "med-pharm-row" + (isHidden ? " med-pharm-row--hidden" : "");
  var summary = document.createElement("div");
  summary.className = "med-pharm-row-summary" + missCls;
  summary.title = medGroupListTooltip(group);
  var main = document.createElement("div");
  main.className = "med-pharm-main med-pharm-main--compact";
  var nameParts = buildMedPharmNameRow(group, current, stats, columns, profile, windowLabel);
  main.appendChild(nameParts.nameRow);
  summary.appendChild(main);
  summary.appendChild(buildMedPharmRowActions(group, isHidden, nameParts.multiRegimen));
  var freqEl = document.createElement("span");
  freqEl.className = "med-pharm-freq-cell";
  freqEl.textContent = formatFreqShort(current.freq);
  summary.appendChild(freqEl);
  var viaEl = document.createElement("span");
  viaEl.className = "med-pharm-via-cell";
  viaEl.textContent = formatViaListAbbrev(current.via);
  viaEl.title = formatViaShort(current.via);
  summary.appendChild(viaEl);
  wrap.appendChild(summary);
  return wrap;
}
function renderMedPharmSummaryList(listEl, groups, window2, profile) {
  var columns = window2.columns;
  listEl.innerHTML = "";
  groups.forEach(function(group) {
    listEl.appendChild(buildMedPharmSummaryRow(group, columns, profile, window2.label));
  });
  wireMedPharmAdhHoverPanels(listEl);
}

// public/js/features/med-pharm-profile-render.mjs
function setMedPharmMedGroupHidden(pid, rowKeys, hidden) {
  var profile = getProfile(pid);
  if (!profile || !profile.months || !rowKeys || !rowKeys.length) return;
  var keySet = /* @__PURE__ */ Object.create(null);
  rowKeys.forEach(function(rk) {
    keySet[rk] = true;
  });
  Object.keys(profile.months).forEach(function(mk) {
    var month = profile.months[mk];
    if (!month || !month.rows) return;
    month.rows.forEach(function(row) {
      if (!keySet[row.rowKey]) return;
      if (hidden) row.hidden = true;
      else delete row.hidden;
    });
  });
  persistClinicalState();
  renderMedPharmProfilePanel();
  var fullEl = document.getElementById("med-pharm-modal-full");
  if (fullEl && fullEl.classList.contains("open")) openMedPharmFullModal();
}
function updateMedPharmDeleteToolbar(profile) {
  var more = document.getElementById("med-pharm-output-more");
  var btnMonth = document.getElementById("med-pharm-delete-month-btn");
  var btnAll = document.getElementById("med-pharm-delete-all-btn");
  var hasProfile = !!(profile && (profileHasMonthData(profile) || profile.draftPaste));
  if (more) more.hidden = !hasProfile;
  if (btnMonth) btnMonth.disabled = !monthHasData(profile, mp.viewYear, mp.viewMonthIndex);
  if (btnAll) btnAll.disabled = !hasProfile;
}
function wireUiOnce() {
  wireMedPharmModalDismiss();
  wireMedPharmAdhHoverOnce();
  if (mp.uiWired) return;
  mp.uiWired = true;
  var pasteOpen = document.getElementById("med-pharm-paste-open-btn");
  if (pasteOpen) pasteOpen.addEventListener("click", openMedPharmPasteModal);
  var imp = document.getElementById("med-pharm-import-btn");
  if (imp) imp.addEventListener("click", importMedPharmMonthPaste);
  var full = document.getElementById("med-pharm-full-btn");
  if (full) full.addEventListener("click", openMedPharmFullModal);
  var prev = document.getElementById("med-pharm-month-prev");
  var next = document.getElementById("med-pharm-month-next");
  if (prev) {
    prev.addEventListener("click", function() {
      shiftViewMonth(-1);
    });
  }
  if (next) {
    next.addEventListener("click", function() {
      shiftViewMonth(1);
    });
  }
  var filtro = document.getElementById("med-pharm-filtro");
  if (filtro) {
    filtro.addEventListener("change", function() {
      mp.listFilter = filtro.value;
      renderMedPharmProfilePanel();
    });
  }
  var showHidden = document.getElementById("med-pharm-show-hidden");
  if (showHidden) {
    showHidden.addEventListener("change", function() {
      mp.showHiddenMedRows = !!showHidden.checked;
      renderMedPharmProfilePanel();
    });
  }
  document.addEventListener("click", function(e) {
    if (e.target.closest("[data-med-pharm-close]")) return;
    var hideBtn = e.target.closest("[data-med-pharm-hide-group]");
    if (hideBtn && hideBtn.dataset.medPharmHideGroup) {
      var pidHide = mp.rt.getActiveId();
      if (pidHide) {
        setMedPharmMedGroupHidden(pidHide, hideBtn.dataset.medPharmHideGroup.split("	"), true);
      }
      return;
    }
    var unhideBtn = e.target.closest("[data-med-pharm-unhide-group]");
    if (unhideBtn && unhideBtn.dataset.medPharmUnhideGroup) {
      var pidShow = mp.rt.getActiveId();
      if (pidShow) {
        setMedPharmMedGroupHidden(pidShow, unhideBtn.dataset.medPharmUnhideGroup.split("	"), false);
      }
      return;
    }
  });
}
function initMedPharmSubviewUi() {
  initMedPharmSubviewUiShell(wireUiOnce);
}
function shiftViewMonth(delta) {
  mp.viewMonthIndex += delta;
  if (mp.viewMonthIndex < 0) {
    mp.viewMonthIndex = 11;
    mp.viewYear -= 1;
  }
  if (mp.viewMonthIndex > 11) {
    mp.viewMonthIndex = 0;
    mp.viewYear += 1;
  }
  renderMedPharmProfilePanel();
}
function renderMedPharmProfilePanel() {
  initMedPharmSubviewUi();
  if (mp.medSubview !== "perfil") return;
  var pid = mp.rt.getActiveId();
  onActivePatientChangedForPharm(pid);
  var hint = document.getElementById("med-pharm-hint");
  var list = document.getElementById("med-pharm-list");
  var label = document.getElementById("med-pharm-month-label");
  if (!list) return;
  if (!pid) {
    renderMedPharmNoPatientState(hint, list);
    updateMedPharmDeleteToolbar(null);
    return;
  }
  if (hint) hint.style.display = "none";
  var profile = getProfile(pid) || { months: {} };
  var window2 = getViewWindow(pid);
  if (label) label.textContent = window2.label;
  updateMedPharmLastPasteEl(
    document.getElementById("med-pharm-last-paste"),
    reclassifyMonthIfLegacy(pid, getViewMonth(pid))
  );
  var unifiedRows = unifyRowsForWindow(profile, window2.columns);
  var allGroups = groupUnifiedRowsByMed(unifiedRows, profile, window2.columns);
  var groups = displayGroupsForWindow(profile, window2);
  var hiddenCount = countHiddenGroups(allGroups.filter(groupMatchesCategoryFilter));
  renderFilterSelect(document.getElementById("med-pharm-filtro"));
  updateMedPharmHiddenToolbar(hiddenCount);
  updateMedPharmDeleteToolbar(profile);
  var card = document.querySelector(".med-pharm-profile-card");
  var listHead = document.querySelector(".med-pharm-list-head");
  if (!window2.columns.length) {
    renderMedPharmEmptyColumns(list, window2, card, listHead);
    return;
  }
  if (!groups.length) {
    renderMedPharmEmptyFilter(list, hiddenCount, card, listHead, mp.showHiddenMedRows);
    return;
  }
  if (card) card.classList.remove("med-pharm-has-grid");
  if (listHead) listHead.style.display = "";
  list.className = "med-pharm-list-body";
  renderMedPharmSummaryList(list, groups, window2, profile);
}
function updateMedPharmHiddenToolbar(hiddenCount) {
  var wrap = document.getElementById("med-pharm-show-hidden-wrap");
  var cb = document.getElementById("med-pharm-show-hidden");
  var countEl = document.getElementById("med-pharm-hidden-count");
  if (countEl) countEl.textContent = String(hiddenCount);
  if (wrap) wrap.hidden = hiddenCount < 1;
  if (cb) {
    cb.checked = mp.showHiddenMedRows;
    cb.disabled = hiddenCount < 1;
  }
}
function onRecetaMergedToProfile(patientId, recetaBlock) {
  if (!patientId || !recetaBlock || !recetaBlock.items || !recetaBlock.items.length) return;
  var fecha = recetaBlock.fechaActualizacion;
  if (!fecha) return;
  var parts = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!parts) return;
  var year = parseInt(parts[3], 10);
  var monthIndex = parseInt(parts[2], 10) - 1;
  var profile = getProfile(patientId) || { months: {} };
  var withMonth = ensureMonthOnProfile(profile, year, monthIndex);
  var key = monthKeyFromParts(year, monthIndex);
  var month = withMonth.months[key];
  month = mergeRecetaIntoMonth(month, recetaBlock.items, fecha);
  month.rows = assignSomePharmCategories(month.rows);
  withMonth.months[key] = month;
  getMedPharmProfileByPatient()[patientId] = withMonth;
  persistClinicalState();
  if (mp.medSubview === "perfil" && mp.viewYear === year && mp.viewMonthIndex === monthIndex) {
    renderMedPharmProfilePanel();
  }
}
medPharmProfileBridge.renderMedPharmProfilePanel = renderMedPharmProfilePanel;
medPharmProfileBridge.openMedPharmFullModal = openMedPharmFullModal;
medPharmProfileBridge.openMedPharmMedGroupModal = openMedPharmMedGroupModal;
medPharmProfileBridge.openMedPharmPasteModal = openMedPharmPasteModal;
medPharmProfileBridge.importMedPharmMonthPaste = importMedPharmMonthPaste;

// public/js/features/med-pharm-profile-stash.mjs
function stashMedPharmPasteForPatient(patientId) {
  if (!patientId || isDemoPatientId(patientId)) return;
  var ta = document.getElementById("med-pharm-paste");
  if (!ta) return;
  var raw = (ta.value || "").trim();
  var profile = getProfile(patientId);
  if (!raw) {
    if (profile && profile.draftPaste) {
      delete profile.draftPaste;
      if (!profileHasMonthData(profile)) delete getMedPharmProfileByPatient()[patientId];
      else persistClinicalState();
    }
    return;
  }
  if (!profile) profile = { months: {} };
  profile.draftPaste = raw;
  getMedPharmProfileByPatient()[patientId] = profile;
  persistClinicalState();
}

// public/js/features/med-pharm-profile-panel.mjs
var medPharmProfileWindowHandlers = {
  setMedSubview,
  importMedPharmMonthPaste,
  openMedPharmPasteModal,
  openMedPharmFullModal,
  closeMedPharmModals,
  closeMedPharmMoreMenu,
  deleteMedPharmViewMonth,
  deleteMedPharmProfileAll
};

// public/js/features/medications-paste-modal.mjs
function isMedRecetaPasteModalOpen() {
  var el = document.getElementById("med-receta-paste-modal");
  return !!(el && el.classList.contains("open"));
}
function wireMedRecetaPasteModalOnce() {
  if (medRecetaPasteModalWired) return;
  var bd = document.getElementById("med-receta-paste-modal");
  if (!bd) return;
  markMedRecetaPasteModalWired();
  bd.addEventListener("click", function(ev) {
    if (!bd.classList.contains("open")) return;
    if (ev.target === bd) closeMedRecetaPasteModal();
  });
  document.addEventListener(
    "keydown",
    function(ev) {
      if (ev.key !== "Escape" || !isMedRecetaPasteModalOpen()) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeMedRecetaPasteModal();
    },
    true
  );
}
function openMedRecetaPasteModal() {
  var activeId = rt4.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente primero", "error");
    return;
  }
  wireMedRecetaPasteModalOnce();
  closeMedPharmModals();
  restoreMedInputForPatient(activeId);
  var bd = document.getElementById("med-receta-paste-modal");
  if (!bd) return;
  bd.removeAttribute("hidden");
  bd.setAttribute("aria-hidden", "false");
  bd.classList.add("open");
  document.body.classList.add("rpc-med-receta-paste-open");
  var ta = document.getElementById("med-input");
  if (ta) {
    requestAnimationFrame(function() {
      ta.focus();
    });
  }
}
function closeMedRecetaPasteModal() {
  if (typeof document === "undefined") return;
  var activeId = rt4.getActiveId();
  if (activeId) stashMedInputForPatient(activeId);
  var bd = document.getElementById("med-receta-paste-modal");
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("hidden", "");
  bd.setAttribute("aria-hidden", "true");
  document.body.classList.remove("rpc-med-receta-paste-open");
}

// public/js/features/medications-panel-cache.mjs
function medRecetaItemById(activeId, itemId) {
  var block = activeId ? getMedRecetaByPatient()[activeId] : null;
  if (!block || !block.items) return null;
  var sid = String(itemId || "");
  return block.items.find(function(x) {
    return String(x.id) === sid;
  }) || null;
}
function buildMedPanelCacheKey(activeId) {
  if (!activeId) return "";
  var block = getMedRecetaByPatient()[activeId];
  if (!block || (!block.items || !block.items.length) && (!block.dietas || !block.dietas.length)) {
    return String(activeId) + "|empty|" + medOutputTab;
  }
  var selMap = getMedNotaSelMap(activeId);
  var medItems = block.items || [];
  var suspendIds = [];
  var selIds = [];
  var overrideSig = [];
  medItems.forEach(function(it) {
    var id = String(it.id || "");
    if (!id) return;
    if (it.suspendido) suspendIds.push(id);
    if (selMap[id]) selIds.push(id);
    if (it.soapCatOverride) overrideSig.push(id + ":" + it.soapCatOverride);
  });
  suspendIds.sort();
  selIds.sort();
  overrideSig.sort();
  return String(activeId) + "|N" + medItems.length + "|F" + (block.fechaActualizacion || "") + "|S" + suspendIds.join(",") + "|P" + selIds.join(",") + "|O" + overrideSig.join(",") + "|T" + medOutputTab + "|D" + (block.dietas ? block.dietas.length : 0) + "|V" + getMedSubview() + "|destUi4|cal" + (function() {
    var n = /* @__PURE__ */ new Date();
    return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
  })();
}
function findMedRecetaRow(listEl, itemId) {
  var sid = String(itemId || "");
  var escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sid) : sid;
  return listEl.querySelector('[data-med-item-id="' + escaped + '"]');
}
function syncRowSoapCheckbox(row, activeId, itemId) {
  var soapChk = row.querySelector("[data-med-soap-chk]");
  if (!soapChk) return;
  soapChk.checked = !!getMedNotaSelMap(activeId)[String(itemId || "")];
}
function patchInsulinRescateRowSoapUi(activeId, listEl) {
  var block = getMedRecetaByPatient()[activeId];
  var items = block && block.items ? block.items : [];
  var row = listEl.querySelector('[data-med-item-id="' + INSULIN_RESCATE_GROUP_ID + '"]');
  if (!row) return false;
  var soapChk = row.querySelector("[data-med-soap-chk]");
  if (soapChk) {
    soapChk.checked = isInsulinRescateGroupSoapSelected(activeId, items, function(pid, id) {
      return !!getMedNotaSelMap(pid)[id];
    });
  }
  return true;
}
function patchInsulinPrandialRowSoapUi(activeId, listEl) {
  var block = getMedRecetaByPatient()[activeId];
  var items = block && block.items ? block.items : [];
  var row = listEl.querySelector('[data-med-item-id="' + INSULIN_PRANDIAL_GROUP_ID + '"]');
  if (!row) return false;
  var soapChk = row.querySelector("[data-med-soap-chk]");
  if (soapChk) {
    soapChk.checked = isInsulinPrandialGroupSoapSelected(activeId, items, function(pid, id) {
      return !!getMedNotaSelMap(pid)[id];
    });
  }
  return true;
}
function patchRegularMedRecetaRowSoapUi(activeId, itemId, it, listEl) {
  var sid = String(itemId || "");
  var row = findMedRecetaRow(listEl, sid);
  if (!row) return false;
  syncRowSoapCheckbox(row, activeId, sid);
  var autoCat = classifyMedicationSoapCategory(it.nombreRaw, it.dosisRaw);
  row.classList.toggle(
    "med-receta-row--needs-dest",
    autoCat === "otros" && !!getMedNotaSelMap(activeId)[sid] && !it.soapCatOverride
  );
  var destSelect = row.querySelector(".med-receta-dest");
  if (destSelect) {
    var destVal = soapDestinationUiValue(it, classifyMedicationSoapCategory);
    destSelect.value = destVal;
    var labelEl = row.querySelector(".med-receta-dest-label");
    if (labelEl) {
      labelEl.textContent = destVal ? SOAP_DESTINATION_LABELS[destVal] || destVal : "Elegir destino\u2026";
    }
  }
  return true;
}
function patchMedRecetaRowSoapUi(itemId) {
  var activeId = rt4.getActiveId();
  if (!activeId) return false;
  var listEl = document.getElementById("med-items-list");
  if (!listEl) return false;
  if (String(itemId || "") === INSULIN_RESCATE_GROUP_ID) {
    return patchInsulinRescateRowSoapUi(activeId, listEl);
  }
  if (String(itemId || "") === INSULIN_PRANDIAL_GROUP_ID) {
    return patchInsulinPrandialRowSoapUi(activeId, listEl);
  }
  var it = medRecetaItemById(activeId, itemId);
  if (!it) return false;
  return patchRegularMedRecetaRowSoapUi(activeId, itemId, it, listEl);
}

// public/js/features/medications-panel-rows.mjs
function buildMedDietHtml(dietas) {
  if (!dietas || !dietas.length) return "";
  var candidates = listDietCandidates(dietas);
  if (!candidates.length) return "";
  if (candidates.length === 1) {
    var mergedDiet = candidates[0];
    return '<div class="med-receta-diet-card" style="margin-bottom:12px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2, rgba(0,0,0,.02));"><div style="font-weight:600;font-size:12px;margin-bottom:6px;">Dieta detectada</div><div>' + esc(mergedDiet.descripcion || "\u2014") + "</div>" + (mergedDiet.kcal != null ? '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">' + esc(String(mergedDiet.kcal)) + " kcal</div>" : "") + (mergedDiet.proteinG != null ? '<div style="font-size:12px;color:var(--text-muted);">' + esc(String(mergedDiet.proteinG)) + " g prote\xEDna</div>" : "") + "</div>";
  }
  return '<div class="med-receta-diet-card" style="margin-bottom:12px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2, rgba(0,0,0,.02));"><div style="font-weight:600;font-size:12px;margin-bottom:6px;">Dietas detectadas (' + candidates.length + ")</div>" + candidates.map(function(opt) {
    return '<div style="margin-top:6px;font-size:13px;">' + esc(opt.label || buildDietProposalText(opt)) + (opt.source === "medicamentos" ? ' <span style="font-size:11px;color:var(--text-muted);">(medicamentos)</span>' : "") + "</div>";
  }).join("") + '<div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Elige cu\xE1l aplicar en Estado Actual.</div></div>';
}
function medRecetaDestPickerLabel(categoryKey) {
  return categoryKey ? SOAP_DESTINATION_LABELS[categoryKey] || categoryKey : "Elegir destino\u2026";
}
function buildMedRecetaDestCell(it, sid, soapEligible) {
  if (!soapEligible) return "";
  var current = soapDestinationUiValue(it, classifyMedicationSoapCategory);
  var opts = soapDestinationSelectOptionsHtml(esc, { current });
  return '<label class="med-receta-dest-picker"><span class="med-receta-dest-label">' + esc(medRecetaDestPickerLabel(current)) + `</span><select class="med-receta-dest" title="Destino en Estado Actual / SOAP (corrige auto-clasificaci\xF3n)" onchange="setMedRecetaSoapCategory('` + safeAttrJsString(sid) + `', this.value)">` + opts + "</select></label>";
}
function buildInsulinRescateGroupRowHtml(activeId, items) {
  var paraNota = isInsulinRescateGroupSoapSelected(activeId, items, isMedNotaSelected) ? " checked" : "";
  var chk = isInsulinRescateGroupSuspended(items, function(id) {
    var it = items.find(function(x) {
      return String(x.id) === String(id);
    });
    return !!(it && it.suspendido);
  }) ? " checked" : "";
  return '<div class="med-receta-row med-receta-row--insulin-rescate" data-med-item-id="' + esc(INSULIN_RESCATE_GROUP_ID) + '"><div class="med-receta-checkcell"><input type="checkbox"' + chk + ' title="Excluir rescates de insulina del texto de egreso" onchange="toggleMedRecetaInsulinRescateSuspendido(this.checked)"/></div><div class="med-receta-checkcell"><input type="checkbox" data-med-soap-chk="1"' + paraNota + ' title="Incluir rescates de insulina en Estado Actual / SOAP" onchange="toggleMedRecetaInsulinRescateParaNota(this.checked)"/></div><div class="med-receta-name">' + insulinRescateMedLabelHtml(esc) + '</div><div class="med-receta-destcell"></div><div class="med-receta-diacell"></div></div>';
}
function buildInsulinPrandialGroupRowHtml(activeId, items) {
  var paraNota = isInsulinPrandialGroupSoapSelected(activeId, items, isMedNotaSelected) ? " checked" : "";
  var chk = isInsulinPrandialGroupSuspended(items, function(id) {
    var it = items.find(function(x) {
      return String(x.id) === String(id);
    });
    return !!(it && it.suspendido);
  }) ? " checked" : "";
  return '<div class="med-receta-row med-receta-row--insulin-prandial" data-med-item-id="' + esc(INSULIN_PRANDIAL_GROUP_ID) + '"><div class="med-receta-checkcell"><input type="checkbox"' + chk + ' title="Excluir insulina preprandial del texto de egreso" onchange="toggleMedRecetaInsulinPrandialSuspendido(this.checked)"/></div><div class="med-receta-checkcell"><input type="checkbox" data-med-soap-chk="1"' + paraNota + ' title="Incluir insulina preprandial en Estado Actual / SOAP" onchange="toggleMedRecetaInsulinPrandialParaNota(this.checked)"/></div><div class="med-receta-name">' + insulinPrandialMedLabelHtml(items, esc) + '</div><div class="med-receta-destcell"></div><div class="med-receta-diacell"></div></div>';
}
function buildMedRecetaRowHtml(activeId, it, fechaActualizacion, allItems) {
  var sid = String(it.id || "");
  var diaOpts = fechaActualizacion ? { fechaActualizacion } : void 0;
  var pumpAlg = insulinPumpAlgorithmForMedicationItem(allItems || [], it);
  var label;
  if (pumpAlg != null) {
    label = insulinPumpMedLabelHtml(pumpAlg, esc);
  } else {
    var listLabel = formatMedicationSoapShort(it, diaOpts);
    if (it.diaTratamiento != null) listLabel = listLabel.replace(/\s+DIA\s+\d+\s*$/i, "");
    label = esc(listLabel.slice(0, 160));
  }
  var chk = it.suspendido ? " checked" : "";
  var soapEligible = shouldIncludeMedicationInSoap(it, classifyMedicationSoapCategory);
  var paraNota = soapEligible && isMedNotaSelected(activeId, sid) ? " checked" : "";
  var autoCat = classifyMedicationSoapCategory(it.nombreRaw, it.dosisRaw);
  var destCell = buildMedRecetaDestCell(it, sid, soapEligible);
  var soapCell = soapEligible ? '<div class="med-receta-checkcell"><input type="checkbox" data-med-soap-chk="1"' + paraNota + ` title="Incluir en Tratamiento y campos SOAP (Analgesia / ABX / AntiHTA)" onchange="toggleMedRecetaParaNota('` + safeAttrJsString(sid) + `', this.checked)"/></div>` : '<div class="med-receta-checkcell" title="PRN / rescate: no se documenta en SOAP (excepto analgesia)"><span class="med-receta-soap-na" aria-hidden="true">\u2014</span></div>';
  var diaDisplay = it.diaTratamiento != null ? effectiveDiaTratamiento(it.diaTratamiento, fechaActualizacion) : null;
  var diaCell = diaDisplay != null ? '<span class="med-receta-dia">D\xEDa ' + esc(String(diaDisplay)) + "</span>" : "";
  return '<div class="med-receta-row' + (autoCat === "otros" && paraNota && !it.soapCatOverride ? " med-receta-row--needs-dest" : "") + '" data-med-item-id="' + esc(sid) + '"><div class="med-receta-checkcell"><input type="checkbox"' + chk + ` title="Excluir del texto de egreso" onchange="toggleMedRecetaSuspendido('` + safeAttrJsString(sid) + `', this.checked)"/></div>` + soapCell + '<div class="med-receta-name">' + label + '</div><div class="med-receta-destcell">' + destCell + '</div><div class="med-receta-diacell">' + diaCell + "</div></div>";
}
function buildMedRecetaListHtml(activeId, block) {
  var items = block.items || [];
  var rows = [];
  var rescateShown = false;
  var prandialShown = false;
  items.forEach(function(it) {
    if (isNutritionMedicationItem(it)) return;
    if (isInsulinRescateMedicationItem(it)) {
      if (!rescateShown) {
        rows.push(buildInsulinRescateGroupRowHtml(activeId, items));
        rescateShown = true;
      }
      return;
    }
    if (isInsulinPrandialMedicationItem(it)) {
      if (!prandialShown) {
        rows.push(buildInsulinPrandialGroupRowHtml(activeId, items));
        prandialShown = true;
      }
      return;
    }
    if (skipRecetaItemForInsulinPumpCarrier(it, items)) return;
    rows.push(buildMedRecetaRowHtml(activeId, it, block.fechaActualizacion, items));
  });
  if (!rows.length) return "";
  return '<div class="med-receta-wrap"><div class="med-receta-head"><span title="Excluir del texto de egreso">Excl.</span><span title="Incluir en Estado Actual / SOAP">SOAP</span><span>Medicamento</span><span title="Destino SOAP / Estado Actual (editable)">Destino</span><span title="D\xEDa de tratamiento (DIA#)">D\xEDa</span></div>' + rows.join("") + "</div>";
}
function countMedTurnoItems(items) {
  var list = Array.isArray(items) ? items : [];
  var medCount = 0;
  var apoyoCount = 0;
  var apoyoKindSeen = {};
  var apoyoKinds = [];
  var rescateShown = false;
  var prandialShown = false;
  list.forEach(function(it) {
    if (isNutritionMedicationItem(it)) return;
    if (isInsulinRescateMedicationItem(it)) {
      if (!rescateShown) {
        medCount += 1;
        rescateShown = true;
      }
      return;
    }
    if (isInsulinPrandialMedicationItem(it)) {
      if (!prandialShown) {
        medCount += 1;
        prandialShown = true;
      }
      return;
    }
    if (skipRecetaItemForInsulinPumpCarrier(it, list)) return;
    var apoyoKind = classifyApoyoKind(it && it.nombreRaw);
    if (apoyoKind) {
      apoyoCount += 1;
      if (!apoyoKindSeen[apoyoKind]) {
        apoyoKindSeen[apoyoKind] = true;
        apoyoKinds.push(apoyoKind);
      }
      return;
    }
    medCount += 1;
  });
  return { medCount, apoyoCount, apoyoKinds };
}
function buildMedTurnoHeaderText(counts) {
  var medCount = counts && typeof counts.medCount === "number" ? counts.medCount : 0;
  var apoyoCount = counts && typeof counts.apoyoCount === "number" ? counts.apoyoCount : 0;
  var apoyoKinds = counts && counts.apoyoKinds || [];
  var title = "Medicamentos del turno \xB7 " + medCount;
  if (!apoyoCount) return { title, secondary: "" };
  var labels = apoyoKinds.map(apoyoKindLabel).filter(Boolean);
  var suffix = labels.length ? " (" + labels.join(", ") + ")" : "";
  var noun = apoyoCount === 1 ? "apoyo" : "apoyos";
  return { title, secondary: "m\xE1s " + apoyoCount + " " + noun + suffix };
}

// public/js/features/medications-soap-footer.mjs
function pushSpecialNmSoapChip(it, allItems, pumpAlg, flags, groups) {
  if (pumpAlg != null && isInsulinIvMedicationItem(it)) {
    if (!flags.pump) {
      groups.nmAntidiabeticos.push({ _insulinPumpChip: true, _algorithm: pumpAlg });
      flags.pump = true;
    }
    return true;
  }
  if (isInsulinRescateMedicationItem(it)) {
    if (!flags.rescate) {
      groups.nmAntidiabeticos.push({ _insulinRescateChip: true });
      flags.rescate = true;
    }
    return true;
  }
  if (isInsulinPrandialMedicationItem(it)) {
    if (!flags.prandial) {
      groups.nmAntidiabeticos.push({ _insulinPrandialChip: true, _allItems: allItems });
      flags.prandial = true;
    }
    return true;
  }
  return false;
}
function groupSoapPreviewItems(soapItems, allItems) {
  var groups = {
    analgesia: [],
    antiemeticos: [],
    sedacion: [],
    antiepilepticos: [],
    antiparkinsonianos: [],
    antidotos: [],
    viaAerea: [],
    antihta: [],
    diuretico: [],
    antitromboticos: [],
    anticoagulacion: [],
    antiarritmicos: [],
    estatinas: [],
    abx: [],
    transfusiones: [],
    vasop: [],
    nm: [],
    nmAntidiabeticos: [],
    otros: []
  };
  var pumpAlg = detectInsulinPumpAlgorithmFromRecetaItems(allItems || []);
  var flags = { pump: false, rescate: false, prandial: false };
  soapItems.forEach(function(it) {
    if (skipRecetaItemForInsulinPumpCarrier(it, allItems || [])) return;
    if (!shouldIncludeMedicationInSoap(it, classifyMedicationSoapCategory)) return;
    if (pushSpecialNmSoapChip(it, allItems || [], pumpAlg, flags, groups)) return;
    var cat = effectiveSoapCategory(it, classifyMedicationSoapCategory);
    if (cat === "nm" && isAntidiabeticRecetaItem(it)) {
      groups.nmAntidiabeticos.push(it);
      return;
    }
    if (cat === "otros") groups.otros.push(it);
    else if (groups[cat]) groups[cat].push(it);
    else groups.otros.push(it);
  });
  return groups;
}
function chipsForSoapItems(arr) {
  return arr.map(function(it) {
    if (it && it._insulinPumpChip) {
      return '<span class="med-soap-preview-chip med-soap-preview-chip--insulin-pump" title="Bomba de insulina IV (SOME)">' + insulinPumpMedLabelHtml(it._algorithm, esc) + "</span>";
    }
    if (it && it._insulinRescateChip) {
      return '<span class="med-soap-preview-chip med-soap-preview-chip--insulin-rescate" title="Rescates de insulina PRN (SOME)">' + insulinRescateMedLabelHtml(esc) + "</span>";
    }
    if (it && it._insulinPrandialChip) {
      return '<span class="med-soap-preview-chip med-soap-preview-chip--insulin-prandial" title="Insulina preprandial SC (SOME)">' + insulinPrandialMedLabelHtml(it._allItems || [], esc) + "</span>";
    }
    var frag = medInstructionFragmentForSoap(it);
    return '<span class="med-soap-preview-chip" title="' + esc((it.nombreRaw || "").slice(0, 220)) + '">' + esc(frag) + "</span>";
  }).join("");
}
function soapPreviewSection(cat, title, groups) {
  if (!groups[cat].length) return "";
  return '<div class="med-soap-preview-sec med-soap-preview-sec--' + cat + '"><div class="med-soap-preview-sec-title">' + esc(title) + '</div><div class="med-soap-preview-chips">' + chipsForSoapItems(groups[cat]) + "</div></div>";
}
function buildSoapPreviewHtml(soapItems, allItems) {
  if (!soapItems.length) {
    return '<p class="med-soap-preview-empty">Marc\xE1 <strong>SOAP</strong> en el listado para ver aqu\xED c\xF3mo se repartir\xE1n en la plantilla.</p>';
  }
  var groups = groupSoapPreviewItems(soapItems, allItems);
  return '<div class="med-soap-preview">' + soapPreviewSection("analgesia", "Analg\xE9sicos / antipir\xE9ticos", groups) + soapPreviewSection("antiemeticos", "Antiem\xE9ticos", groups) + soapPreviewSection("sedacion", "Sedaci\xF3n / delirium", groups) + soapPreviewSection("antiepilepticos", "Antiepil\xE9pticos", groups) + soapPreviewSection("antiparkinsonianos", "Antiparkinsonianos", groups) + soapPreviewSection("antidotos", "Ant\xEDdotos", groups) + soapPreviewSection("viaAerea", "V\xEDa a\xE9rea", groups) + soapPreviewSection("antihta", "Antihipertensivos", groups) + soapPreviewSection("diuretico", "Diur\xE9ticos", groups) + soapPreviewSection("antitromboticos", "Tromboprofilaxis", groups) + soapPreviewSection("anticoagulacion", "Anticoagulaci\xF3n", groups) + soapPreviewSection("antiarritmicos", "Antiarr\xEDtmicos", groups) + soapPreviewSection("estatinas", "Estatinas", groups) + soapPreviewSection("abx", "Antibi\xF3ticos / antif\xFAngicos", groups) + soapPreviewSection("transfusiones", "Transfusiones", groups) + soapPreviewSection("vasop", "Vasopresores / inotr\xF3picos", groups) + soapPreviewSection("nmAntidiabeticos", "Antidiab\xE9ticos", groups) + soapPreviewSection("nm", "NM (soporte, cr\xF3nicos, etc.)", groups) + soapPreviewSection("otros", "Otros \u2014 eleg\xED destino en el listado", groups) + "</div>";
}
function renderMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (!foot) return;
  foot.hidden = false;
  var activeId = rt4.getActiveId();
  var block = activeId ? getMedRecetaByPatient()[activeId] : null;
  var sel = activeId ? getMedNotaSelMap(activeId) : {};
  var soapItems = block && block.items ? block.items.filter(function(it) {
    return sel[it.id] && !it.suspendido;
  }) : [];
  var allItems = block && block.items ? block.items : [];
  var previewHtml = buildSoapPreviewHtml(soapItems, allItems);
  var soapBtnLabel = isModeSala(rt4.getSettings()) ? "Enviar a Estado Actual" : "Abrir plantilla SOAP";
  foot.innerHTML = '<div class="med-nota-toolbar"><p class="med-nota-hint">Los medicamentos con <strong>SOAP</strong> activo se clasifican por nombre; los marcados como <strong>Otros</strong> requieren elegir destino en la columna <strong>Destino</strong>.</p>' + previewHtml + '<div class="med-nota-actions"><button type="button" class="btn-generate" onclick="mediAnadirATratamiento()">A\xF1adir a Tratamiento</button><button type="button" class="btn-med-secondary" onclick="mediLlevarASOAP()">' + soapBtnLabel + '</button><button type="button" class="btn-med-secondary" onclick="limpiarManejoActual()">Limpiar</button></div></div>';
}
function hideMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (foot) {
    foot.hidden = true;
    foot.innerHTML = "";
  }
}

// public/js/features/medications-egreso-text.mjs
function formatMedEgresoFullLine(item, opts) {
  return formatMedicationEgresoLine(item, opts).replace(" || ", ": ");
}
function formatMedEgresoNameDiaLine(item, opts) {
  var resolved = applyIvToOralForEgreso(item, opts) || item || {};
  var nombre = applyNombreAccents(expandNombrePresentacion(resolved.nombreRaw));
  var dia = resolved.diaTratamiento != null ? effectiveDiaTratamiento(resolved.diaTratamiento, opts && opts.fechaActualizacion, opts && opts.refDate) : null;
  return dia != null ? nombre + " (d\xEDa " + dia + ")" : nombre;
}
function buildMedEgresoListLines(items, opts, mode) {
  var all = Array.isArray(items) ? items : [];
  var list = all.filter(function(it) {
    return it && !it.suspendido && !isInsulinPumpCarrierMedicationItem(it, all);
  });
  return list.map(function(it) {
    var alg = insulinPumpAlgorithmForMedicationItem(all, it);
    if (alg != null) return formatInsulinPumpAlgoritmoLabel(alg);
    return mode === "simple" ? formatMedEgresoNameDiaLine(it, opts) : formatMedEgresoFullLine(it, opts);
  });
}
function buildMedEgresoDietSummaryLine(block) {
  var merged = mergeDietaItems(collectDietasFromRecetaBlock(block));
  var desc = trimStr(merged.descripcion);
  var bits = [];
  if (merged.kcal != null) bits.push(merged.kcal + " kcal");
  if (merged.proteinG != null) bits.push(merged.proteinG + " g prote\xEDna");
  if (!desc && !bits.length) return "";
  if (!bits.length) return desc;
  return desc ? desc + " " + bits.join(" \xB7 ") : bits.join(" \xB7 ");
}
function buildMedEgresoPreviewLine(block) {
  var items = block && Array.isArray(block.items) ? block.items : [];
  var counts = countMedTurnoItems(items);
  var parts = [counts.medCount + (counts.medCount === 1 ? " medicamento" : " medicamentos")];
  var dietDesc = trimStr(mergeDietaItems(collectDietasFromRecetaBlock(block)).descripcion);
  if (dietDesc) parts.push(dietDesc);
  var apoyoLabels = (counts.apoyoKinds || []).map(apoyoKindLabel).filter(Boolean);
  if (apoyoLabels.length) parts.push(apoyoLabels.join(", "));
  return parts.join(" \xB7 ");
}

// public/js/features/medications-panel-render.mjs
function getMedPanelDom() {
  return {
    hintEl: document.getElementById("med-hint"),
    fechaEl: document.getElementById("med-fecha-actualizacion"),
    listEl: document.getElementById("med-items-list"),
    previewEl: document.getElementById("med-egreso-preview"),
    outCard: document.getElementById("med-output-section"),
    turnoTitleEl: document.getElementById("med-turno-title-text"),
    turnoApoyoEl: document.getElementById("med-turno-apoyo")
  };
}
var MED_TURNO_TITLE_DEFAULT = "Medicamentos del turno";
function resetMedTurnoHeader(els) {
  if (els.turnoTitleEl) els.turnoTitleEl.textContent = MED_TURNO_TITLE_DEFAULT;
  if (els.turnoApoyoEl) {
    els.turnoApoyoEl.hidden = true;
    els.turnoApoyoEl.textContent = "";
  }
}
function syncMedTurnoHeader(els, items) {
  if (!els.turnoTitleEl) return;
  var header = buildMedTurnoHeaderText(countMedTurnoItems(items));
  els.turnoTitleEl.textContent = header.title;
  if (els.turnoApoyoEl) {
    if (header.secondary) {
      els.turnoApoyoEl.textContent = header.secondary;
      els.turnoApoyoEl.hidden = false;
    } else {
      els.turnoApoyoEl.textContent = "";
      els.turnoApoyoEl.hidden = true;
    }
  }
}
function renderMedPanelEmptyNoPatient(els) {
  bustMedPanelCache();
  resetMedTurnoHeader(els);
  els.hintEl.hidden = false;
  els.hintEl.textContent = "Selecciona un paciente en la columna izquierda para ver su manejo.";
  setMedActiveLeadVisible(false);
  if (els.fechaEl) els.fechaEl.hidden = true;
  els.listEl.innerHTML = "";
  if (els.previewEl) els.previewEl.textContent = "";
  if (els.outCard) els.outCard.style.display = "none";
  hideMedNotaFooter();
}
function renderMedPanelEmptyNoContent(activeId, cacheKey, els) {
  setMedPanelCacheKey(cacheKey);
  resetMedTurnoHeader(els);
  els.hintEl.hidden = false;
  els.hintEl.textContent = "A\xFAn no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta.";
  setMedActiveLeadVisible(false);
  if (els.fechaEl) els.fechaEl.hidden = true;
  els.listEl.innerHTML = "";
  if (els.previewEl) els.previewEl.textContent = "";
  if (els.outCard) els.outCard.style.display = "none";
  hideMedNotaFooter();
}
function syncMedEgresoTeaser(previewEl, outCard, block) {
  var preview = buildMedEgresoPreviewLine(block);
  if (previewEl) previewEl.textContent = preview;
  if (outCard) outCard.style.display = preview.trim() ? "flex" : "none";
}
function renderMedPanelRecetaContent(activeId, block, cacheKey, els) {
  setMedPanelCacheKey(cacheKey);
  syncMedTurnoHeader(els, block.items);
  els.hintEl.hidden = true;
  setMedActiveLeadVisible(true);
  if (els.fechaEl) {
    els.fechaEl.hidden = false;
    var fechaTxt = block.fechaActualizacion || "\u2014";
    els.fechaEl.textContent = fechaTxt;
    els.fechaEl.title = "\xDAltima importaci\xF3n SOME: " + fechaTxt;
  }
  els.listEl.innerHTML = buildMedDietHtml(collectDietasFromRecetaBlock(block)) + buildMedRecetaListHtml(activeId, block);
  renderMedNotaFooter();
  syncMedEgresoTeaser(els.previewEl, els.outCard, block);
}
function handleMedPanelPatientChange(activeId) {
  if (activeId === getLastMedPanelPatientId()) return;
  setLastMedPanelPatientId(activeId);
  bustMedPanelCache();
  closeMedPharmModals();
  closeMedRecetaPasteModal();
}
function medListNeedsDestDropdownRefresh(listEl, block) {
  if (!listEl || !listEl.querySelector(".med-receta-wrap")) return false;
  var items = block && Array.isArray(block.items) ? block.items : [];
  var rows = listEl.querySelectorAll(".med-receta-row[data-med-item-id]");
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row.classList.contains("med-receta-row--insulin-rescate") || row.classList.contains("med-receta-row--insulin-prandial")) {
      continue;
    }
    var id = row.getAttribute("data-med-item-id");
    var it = items.find(function(x) {
      return String(x.id) === String(id);
    });
    if (!it || !shouldIncludeMedicationInSoap(it, classifyMedicationSoapCategory)) continue;
    if (!row.querySelector(".med-receta-dest-picker")) return true;
  }
  return false;
}
function shouldSkipMedPanelCacheHit(activeId, cacheKey, els) {
  if (!activeId || getMedPanelCacheKey() !== cacheKey) return false;
  var cachedBlock = getMedRecetaByPatient()[activeId];
  if (medListNeedsDestDropdownRefresh(els.listEl, cachedBlock)) return false;
  if (els.listEl.querySelector(".med-receta-wrap")) return true;
  return (!cachedBlock || !cachedBlock.items || !cachedBlock.items.length) && !els.hintEl.hidden;
}
function renderMedPanelForActivePatient(activeId, cacheKey, els) {
  restoreMedInputForPatient(activeId);
  var block = getMedRecetaByPatient()[activeId];
  var hasRecetaContent = block && (block.items && block.items.length || block.dietas && block.dietas.length);
  if (!hasRecetaContent) {
    renderMedPanelEmptyNoContent(activeId, cacheKey, els);
    return;
  }
  if (getMedPanelCacheKey() === cacheKey && els.listEl.querySelector(".med-receta-wrap") && !medListNeedsDestDropdownRefresh(els.listEl, block)) {
    return;
  }
  renderMedPanelRecetaContent(activeId, block, cacheKey, els);
}
function bustMedPanelCacheIfLegacyDestUi(listEl) {
  if (!listEl || !listEl.querySelector(".med-receta-wrap")) return;
  if (listEl.querySelector(".med-receta-dest-picker")) return;
  if (listEl.querySelector(".med-receta-destcell")) bustMedPanelCache();
}
function renderMedRecetaPanel() {
  initMedPharmSubviewUi();
  wireMedRecetaPasteModalOnce();
  var activeId = rt4.getActiveId();
  handleMedPanelPatientChange(activeId);
  if (getMedSubview() === "perfil") {
    bustMedPanelCache();
    renderMedPharmProfilePanel();
    return;
  }
  var els = getMedPanelDom();
  if (!els.hintEl || !els.listEl) return;
  bustMedPanelCacheIfLegacyDestUi(els.listEl);
  var cacheKey = buildMedPanelCacheKey(activeId);
  if (shouldSkipMedPanelCacheHit(activeId, cacheKey, els)) return;
  if (!activeId) {
    renderMedPanelEmptyNoPatient(els);
    return;
  }
  renderMedPanelForActivePatient(activeId, cacheKey, els);
}

// public/js/features/estado-actual-insulin-pump.mjs
function syncMonitoreoInsulinPumpFromReceta(monitoreo, recetaBlock) {
  if (!monitoreo || typeof monitoreo !== "object") return false;
  var next = detectInsulinPumpAlgorithmFromRecetaBlock(recetaBlock);
  var prev = monitoreo.bombaInsulinaAlgoritmo != null ? Number(monitoreo.bombaInsulinaAlgoritmo) : null;
  if (prev === next || prev == null && next == null) return false;
  if (next == null) delete monitoreo.bombaInsulinaAlgoritmo;
  else monitoreo.bombaInsulinaAlgoritmo = next;
  return true;
}
function insulinPumpAlgorithmFromMonitoreo(monitoreo) {
  if (!monitoreo || monitoreo.bombaInsulinaAlgoritmo == null) return null;
  var n = Number(monitoreo.bombaInsulinaAlgoritmo);
  if (!Number.isFinite(n) || n < 1 || n > 4) return null;
  return n;
}

// public/js/features/nota-evolucion/nota-evolucion-primary-tab.mjs
var MOUNT_ID = "note-form";
var INNER_MOUNT_ID = "ne-primary-mount";
var viewMode = "nueva";
function toolbarHtml(mode) {
  const label = mode === "nueva" ? "Plantilla cl\xE1sica" : "Nota de evoluci\xF3n";
  const target = mode === "nueva" ? "classic" : "nueva";
  return `<div class="ne-primary-toolbar"><button type="button" class="ne-primary-toolbar-link" data-ne-view="${target}">` + (mode === "nueva" ? escHtml(label) : `\u2190 ${escHtml(label)}`) + "</button></div>";
}
function wireToolbar(host) {
  const btn = host.querySelector("[data-ne-view]");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = btn.getAttribute("data-ne-view");
    viewMode = next === "classic" ? "classic" : "nueva";
    renderNotaEvolucionPrimaryTab();
  });
}
function renderClassicView() {
  renderNoteForm();
  const host = typeof document !== "undefined" ? document.getElementById(MOUNT_ID) : null;
  if (!host) return;
  host.insertAdjacentHTML("afterbegin", toolbarHtml("classic"));
  wireToolbar(host);
}
function renderNuevaView() {
  const host = typeof document !== "undefined" ? document.getElementById(MOUNT_ID) : null;
  if (!host) return;
  host.innerHTML = toolbarHtml("nueva") + `<div id="${INNER_MOUNT_ID}" class="ne-primary-mount"><div class="ne-empty-hint">Cargando\u2026</div></div>`;
  wireToolbar(host);
  void ensureNotaEvolucionLoaded().then((mod) => {
    if (viewMode !== "nueva") return;
    const target = typeof document !== "undefined" ? document.getElementById(INNER_MOUNT_ID) : null;
    if (target) mod.mountNotaEvolucionPanel(target);
  });
}
function renderNotaEvolucionPrimaryTab() {
  if (typeof document === "undefined" || !document.getElementById(MOUNT_ID)) return;
  if (viewMode === "classic") {
    renderClassicView();
  } else {
    renderNuevaView();
  }
}
function showNotaEvolucionClassicView() {
  viewMode = "classic";
  renderNotaEvolucionPrimaryTab();
}
var windowHandlers2 = {
  renderNotaEvolucionPrimaryTab
};

// public/js/features/estado-actual-panel-bridge.mjs
var eaPanelBridge = {
  renderEstadoActualPanel(_opts) {
  },
  registrarEstadoActualMedicion() {
  }
};

// public/js/features/estado-actual-panel-diet.mjs
function renderDietCaloricFieldsHtml(ec, kcalDisplay, escAttr2) {
  return '<label class="ea-field"><span class="ea-label">Kcal/kg</span><input type="number" class="ea-input" data-ea-ec="kcalKg" step="any" value="' + escAttr2(ec.kcalKg) + '"></label><label class="ea-field"><span class="ea-label">Kcal total</span><input type="number" class="ea-input" data-ea-ec="kcal" step="any" min="0" value="' + escAttr2(kcalDisplay) + '" placeholder="Total"></label><label class="ea-field"><span class="ea-label">Prote\xEDna (g/d\xEDa)</span><input type="number" class="ea-input" data-ea-ec="proteinG" step="any" min="0" value="' + escAttr2(ec.proteinG) + '" placeholder="Gramos"></label>';
}
function renderDietWeightHintHtml(dietWeightHint, escHtml2) {
  return '<p class="ea-diet-weight-hint">' + escHtml2(dietWeightHint) + "</p>";
}

// public/js/features/estado-actual-panel-soporte-html.mjs
function renderVmModoOptions(ec) {
  return VM_MODO_OPTIONS.map(function(opt) {
    var sel = ec.vmModo === opt.value ? " selected" : "";
    return '<option value="' + escAttr(opt.value) + '"' + sel + ">" + escHtml(opt.label) + "</option>";
  }).join("");
}
function tierStyle(tier, show) {
  return show ? "" : ' style="display:none"';
}
function renderSoporteParamsHtml(ec, tier) {
  var litros = tier === "litros";
  var hfnc = tier === "hfnc";
  var vmni = tier === "vmni";
  var vm = tier === "vm";
  var tqt = tier === "tqt";
  var needsFio2 = hfnc || vmni || vm || tqt;
  return '<div class="ea-soporte-params" data-ea-soporte-params><div class="ea-soporte-params-grid"><label class="ea-field ea-soporte-tier-litros"' + tierStyle("litros", litros) + '><span class="ea-label">Litros O\u2082</span><input type="number" class="ea-input" data-ea-ec="soporteLitros" min="0" step="any" value="' + escAttrNumeric(ec.soporteLitros) + '" placeholder="L/min"></label><label class="ea-field ea-soporte-tier-hfnc"' + tierStyle("hfnc", hfnc) + '><span class="ea-label">Flujo (L/min)</span><input type="number" class="ea-input" data-ea-ec="soporteFlujoLmin" min="0" step="any" value="' + escAttrNumeric(ec.soporteFlujoLmin) + '" placeholder="60"></label><label class="ea-field ea-soporte-tier-vmni ea-soporte-tier-vm"' + tierStyle("vmni", vmni || vm) + '><span class="ea-label">PEEP / EPAP</span><input type="number" class="ea-input" data-ea-ec="vmPeep" min="0" step="any" value="' + escAttrNumeric(ec.vmPeep) + '" placeholder="cmH\u2082O"></label><label class="ea-field ea-soporte-tier-vmni"' + tierStyle("vmni", vmni) + '><span class="ea-label">PS (cmH\u2082O)</span><input type="number" class="ea-input" data-ea-ec="vmPsoporte" min="0" step="any" value="' + escAttrNumeric(ec.vmPsoporte) + '" placeholder="Sobre EPAP"></label><label class="ea-field ea-soporte-tier-vm"' + tierStyle("vm", vm) + '><span class="ea-label">Modo</span><select class="ea-input" data-ea-ec="vmModo">' + renderVmModoOptions(ec) + '</select></label><label class="ea-field ea-soporte-tier-vm"' + tierStyle("vm", vm) + '><span class="ea-label">VT (mL)</span><input type="number" class="ea-input" data-ea-ec="vmVt" min="0" step="any" value="' + escAttrNumeric(ec.vmVt) + '" placeholder="420"></label><label class="ea-field ea-soporte-tier-vm"' + tierStyle("vm", vm) + '><span class="ea-label">Flujo insp.</span><input type="number" class="ea-input" data-ea-ec="vmFlujo" min="0" step="any" value="' + escAttrNumeric(ec.vmFlujo) + '" placeholder="L/min"></label><label class="ea-field ea-soporte-tier-vm"' + tierStyle("vm", vm) + '><span class="ea-label">P meseta</span><input type="number" class="ea-input" data-ea-ec="vmPmeseta" min="0" step="any" value="' + escAttrNumeric(ec.vmPmeseta) + '" placeholder="cmH\u2082O"></label><label class="ea-field ea-soporte-tier-fio2"' + tierStyle("fio2", needsFio2) + '><span class="ea-label">FiO\u2082 (%)</span><input type="number" class="ea-input" data-ea-ec="soporteFio2" min="21" max="100" step="any" value="' + escAttrNumeric(ec.soporteFio2) + '" placeholder="%"></label></div></div>';
}
function renderSoporteLabFeedHtml(labCtx) {
  if (!labCtx || !labCtx.sourceLabel) {
    return '<div class="ea-soporte-lab-feed ea-soporte-lab-feed--empty"><div class="ea-soporte-lab-feed-label">Expediente</div><div class="ea-soporte-lab-feed-text">Sin gasometr\xEDa reciente \u2014 PaFi usa SpO\u2082 del pulsiox\xEDmetro si hay FiO\u2082.</div></div>';
  }
  var values = [];
  if (labCtx.pO2 != null) values.push("pO\u2082 " + labCtx.pO2);
  if (labCtx.pCO2 != null) values.push("pCO\u2082 " + labCtx.pCO2);
  var valuesHtml = values.length ? '<div class="ea-soporte-lab-feed-values">' + escHtml(values.join(" \xB7 ")) + "</div>" : "";
  return '<div class="ea-soporte-lab-feed"><div class="ea-soporte-lab-feed-label">Expediente</div><div class="ea-soporte-lab-feed-body"><div class="ea-soporte-lab-feed-text">' + escHtml(labCtx.sourceLabel) + "</div>" + valuesHtml + "</div></div>";
}
function renderSoporteCalcHintsHtml(ec, vitalsCtx) {
  var tier = soporteTier(ec.soporte != null ? String(ec.soporte) : "");
  if (!tier) return "";
  var hints = buildVentilatorioCalcHints(ec, vitalsCtx || {});
  if (!hints.length) return "";
  return '<ul class="ea-soporte-calc-list" data-ea-soporte-calc>' + hints.map(function(h) {
    return '<li class="ea-soporte-calc-item">' + escHtml(h) + "</li>";
  }).join("") + "</ul>";
}
function renderSoporteVentilatorioBlockHtml(ec, vitalsCtx) {
  var tier = soporteTier(ec.soporte != null ? String(ec.soporte) : "");
  if (!tier) return "";
  var labCtx = vitalsCtx && vitalsCtx.lab ? vitalsCtx.lab : null;
  var showInsights = tier === "hfnc" || tier === "vmni" || tier === "vm" || tier === "tqt";
  var params = renderSoporteParamsHtml(ec, tier);
  if (!showInsights) return params;
  var insights = '<div class="ea-soporte-insights">' + renderSoporteLabFeedHtml(labCtx) + renderSoporteCalcHintsHtml(ec, vitalsCtx) + "</div>";
  return params + insights;
}
function resolveSoporteTierFlags(tier) {
  var litros = tier === "litros";
  var hfnc = tier === "hfnc";
  var vmni = tier === "vmni";
  var vm = tier === "vm";
  var tqt = tier === "tqt";
  return {
    litros,
    hfnc,
    vmni,
    vm,
    tqt,
    needsFio2: hfnc || vmni || vm || tqt,
    showInsights: hfnc || vmni || vm || tqt
  };
}
function syncSoporteTierBlockVisibility(block, flags) {
  block.querySelectorAll(".ea-soporte-tier-litros").forEach(function(el) {
    el.style.display = flags.litros ? "" : "none";
  });
  block.querySelectorAll(".ea-soporte-tier-hfnc").forEach(function(el) {
    el.style.display = flags.hfnc ? "" : "none";
  });
  block.querySelectorAll(".ea-soporte-tier-vmni").forEach(function(el) {
    var isPeep = el.querySelector('[data-ea-ec="vmPeep"]');
    if (isPeep) el.style.display = flags.vmni || flags.vm ? "" : "none";
    else el.style.display = flags.vmni ? "" : "none";
  });
  block.querySelectorAll(".ea-soporte-tier-vm").forEach(function(el) {
    el.style.display = flags.vm ? "" : "none";
  });
  block.querySelectorAll(".ea-soporte-tier-fio2").forEach(function(el) {
    el.style.display = flags.needsFio2 ? "" : "none";
  });
}
function syncSoporteCalcAndInsightsVisibility(mount, tier, showInsights) {
  var calc = mount.querySelector("[data-ea-soporte-calc]");
  if (calc) calc.style.display = tier ? "" : "none";
  var insights = mount.querySelector(".ea-soporte-insights");
  if (insights) insights.style.display = showInsights ? "" : "none";
  var wrap = mount.querySelector(".ea-soporte-vent-block");
  if (wrap) wrap.style.display = tier ? "" : "none";
}
function syncSoporteParamsVisibility(mount, soporte) {
  if (!mount) return;
  var block = mount.querySelector("[data-ea-soporte-params]");
  if (!block) return;
  var tier = soporteTier(soporte != null ? String(soporte) : "");
  var flags = resolveSoporteTierFlags(tier);
  syncSoporteTierBlockVisibility(block, flags);
  syncSoporteCalcAndInsightsVisibility(mount, tier, flags.showInsights);
}

// public/js/features/estado-actual-panel-clinico-html.mjs
function renderSoporteOptions(ec) {
  var current = normalizeSoporteValue(ec.soporte);
  return SOPORTE_OPTIONS.map(function(opt) {
    var sel = current === opt ? " selected" : "";
    return '<option value="' + escAttr(opt) + '"' + sel + ">" + escHtml(opt) + "</option>";
  }).join("");
}
function renderVitalsRowHtml(ec, vitalsCtx) {
  var soporteBlock = renderSoporteVentilatorioBlockHtml(ec, vitalsCtx);
  return '<div class="ea-clinico-vitals-row"><label class="ea-field"><span class="ea-label">FOUR (/16)</span><input type="number" class="ea-input" data-ea-ec="four" min="0" max="16" step="1" value="' + escAttrNumeric(ec.four) + '"></label><label class="ea-field"><span class="ea-label">Esferas</span><input type="number" class="ea-input" data-ea-ec="esferas" min="0" step="1" value="' + escAttrNumeric(ec.esferas) + '"></label><label class="ea-field ea-field--soporte"><span class="ea-label">Soporte respiratorio</span><select class="ea-input" data-ea-ec="soporte">' + renderSoporteOptions(ec) + "</select></label></div>" + (soporteBlock ? '<div class="ea-soporte-vent-block" data-ea-soporte-wrap>' + soporteBlock + "</div>" : "");
}
function renderNutritionRowHtml(ec, dietPending, dietaSuplemento, kcalDisplay, dietaParenteral) {
  var caloricHtml = "";
  if (!dietaSuplemento) {
    if (dietaParenteral) {
      caloricHtml = '<label class="ea-field"><span class="ea-label">Kcal total</span><input type="number" class="ea-input" data-ea-ec="kcal" step="any" min="0" value="' + escAttr(kcalDisplay) + '" placeholder="Total"></label><label class="ea-field"><span class="ea-label">Prote\xEDna (g/d\xEDa)</span><input type="number" class="ea-input" data-ea-ec="proteinG" step="any" min="0" value="' + escAttr(ec.proteinG) + '" placeholder="Gramos"></label>';
    } else {
      caloricHtml = renderDietCaloricFieldsHtml(ec, kcalDisplay, escAttr);
    }
  }
  return '<div class="ea-clinico-nutrition-row"><label class="ea-field ea-field--dieta"><span class="ea-label">Dieta' + (dietPending ? ' <span class="ea-pendiente-badge">Propuesta</span>' : "") + '</span><input type="text" class="ea-input" data-ea-ec="dieta" value="' + escAttr(ec.dieta) + '"></label>' + caloricHtml + "</div>";
}
function renderDietProposalBarHtml(dietOptions, selectedIndex) {
  var optionsHtml = "";
  if (Array.isArray(dietOptions) && dietOptions.length > 1) {
    optionsHtml = '<div class="ea-diet-options" role="radiogroup" aria-label="Opciones de dieta desde SOME"><span class="ea-diet-options-lead">Varias dietas detectadas \u2014 elige cu\xE1l aplicar:</span>' + dietOptions.map(function(opt, idx) {
      var checked = idx === selectedIndex ? " checked" : "";
      return '<label class="ea-diet-option"><input type="radio" name="ea-diet-option" value="' + String(idx) + '"' + checked + ' onchange="selectEaDietOption(' + String(idx) + ')"><span>' + escHtml(opt.label || opt.descripcion || "Opci\xF3n " + (idx + 1)) + "</span></label>";
    }).join("") + "</div>";
  }
  return '<div class="ea-diet-proposal-bar">' + optionsHtml + '<span class="ea-diet-proposal-lead">Dieta importada desde SOME \u2014 revisa los valores y confirma o descarta.</span><div class="ea-diet-proposal-actions"><button type="button" class="ea-btn ea-btn--success" onclick="confirmEaDietProposal()">Confirmar dieta</button><button type="button" class="ea-btn" onclick="discardEaDietProposal()">Descartar</button></div></div>';
}
function renderEstadoClinicoBodyHtml(ec, dietPending, dietaSuplemento, kcalDisplay, dietWeightHint, medFieldsHtml, anyPending, dietOptions, dietOptionSelected, dietaParenteral, vitalsCtx) {
  return '<div class="ea-clinico-body"><div class="ea-clinico-grid">' + renderVitalsRowHtml(ec, vitalsCtx) + renderNutritionRowHtml(ec, dietPending, dietaSuplemento, kcalDisplay, dietaParenteral) + (dietPending ? renderDietProposalBarHtml(dietOptions, dietOptionSelected == null ? 0 : dietOptionSelected) : "") + "</div>" + (dietaSuplemento || dietaParenteral ? "" : renderDietWeightHintHtml(dietWeightHint, escHtml)) + medFieldsHtml + (anyPending ? '<div class="ea-clinico-actions"><button type="button" class="ea-btn ea-btn--success" onclick="confirmAllEaMedProposals()">Confirmar todas las propuestas</button></div>' : "") + "</div>";
}

// public/js/features/estado-actual-panel-clinico-fields.mjs
function touchPatientLanUpdatedAt(patientId) {
  const p = getPatients().find(function(row) {
    return String(row.id) === String(patientId);
  });
  if (p) p.lanUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
function hasDietProposal(pendienteReceta) {
  return DIET_PENDING_KEYS.some(function(k) {
    return pendienteReceta && pendienteReceta[k] && String(pendienteReceta[k]).trim();
  });
}
function syncDietPendingField(monitoreo, key, val) {
  if (!hasDietProposal(monitoreo.pendienteReceta) || DIET_PENDING_KEYS.indexOf(key) < 0) return;
  if (!monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") {
    monitoreo.pendienteReceta = {};
  }
  monitoreo.pendienteReceta[key] = val;
}
function syncDomInput(panel, selector, value) {
  var input = panel && panel.querySelector(selector);
  if (input && "value" in input) input.value = value;
}
function applyKcalKgFieldChange(monitoreo, patient) {
  var w = resolveDietWeightKg({
    patientPeso: patient.peso,
    pesoRef: monitoreo.estadoClinico.pesoRef
  });
  if (!syncDietKcalFromWeight(monitoreo.estadoClinico, w)) return;
  var kcalVal = String(monitoreo.estadoClinico.kcal || "");
  syncDomInput(document.getElementById("exp-pane-estado-actual"), '[data-ea-ec="kcal"]', kcalVal);
  syncDietPendingField(monitoreo, "kcal", kcalVal);
}
function applyKcalFieldChange(monitoreo, patient) {
  var w = resolveDietWeightKg({
    patientPeso: patient.peso,
    pesoRef: monitoreo.estadoClinico.pesoRef
  });
  var kg = computeDietKcalKgFromTotal(monitoreo.estadoClinico.kcal, w);
  if (kg == null) return;
  monitoreo.estadoClinico.kcalKg = String(kg);
  syncDomInput(document.getElementById("exp-pane-estado-actual"), '[data-ea-ec="kcalKg"]', String(kg));
  syncDietPendingField(monitoreo, "kcalKg", String(kg));
}
function applyEstadoClinicoFieldChange(el, patient) {
  if (!patient || !patient.monitoreo || !patient.monitoreo.estadoClinico) return;
  var monitoreo = patient.monitoreo;
  var key = el.getAttribute("data-ea-ec");
  if (!key) return;
  var val = "value" in el ? String(el.value) : "";
  if (key === "soporte") val = normalizeSoporteValue(val);
  if (String(monitoreo.estadoClinico[key] || "") === val) return;
  monitoreo.estadoClinico[key] = val;
  monitoreo.estadoClinicoUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (key === "dieta") applyDietaSuplementoPolicy(monitoreo.estadoClinico, monitoreo.pendienteReceta);
  if (DIET_PENDING_KEYS.indexOf(key) >= 0) {
    markDietAsManuallyConfirmed(monitoreo);
  } else {
    syncDietPendingField(monitoreo, key, val);
  }
  if (key === "kcalKg") applyKcalKgFieldChange(monitoreo, patient);
  else if (key === "kcal") applyKcalFieldChange(monitoreo, patient);
  if (patient.id) touchPatientLanUpdatedAt(String(patient.id));
  persistClinicalState();
  scheduleCloudSyncPush();
}

// public/js/features/estado-actual-panel-clinico.mjs
function eaManejoFechaOpts(activeId, monitoreo) {
  var medRecetaByPatient = getMedRecetaByPatient();
  var fechaActualizacion = resolveEaAbxFechaActualizacion(activeId, medRecetaByPatient, monitoreo);
  return fechaActualizacion ? { fechaActualizacion, activeId, medRecetaByPatient } : { activeId, medRecetaByPatient };
}
function resolveKcalDisplay(ec, pend, dietPending, dietWeight, dietaParenteral) {
  if (dietPending && String(pend.kcal || "").trim() || dietWeight == null || dietaParenteral) {
    return ec.kcal;
  }
  var kcalComputed = computeDietKcalTotal(ec.kcalKg, dietWeight);
  return kcalComputed != null ? String(kcalComputed) : ec.kcal;
}
function buildDietWeightHint(dietWeight) {
  return dietWeight != null ? "Peso para c\xE1lculo: " + dietWeight + " kg (datos del paciente)" : "Peso para c\xE1lculo: \u2014 (captura peso en Datos del paciente)";
}
function resolveDietOptionSelected(monitoreo) {
  return monitoreo && monitoreo.dietOptionSelected != null ? Number(monitoreo.dietOptionSelected) : 0;
}
function buildVitalsCtx(monitoreo, activeId, patient) {
  var snap = deriveSnapshot(monitoreo);
  return {
    fr: snap && snap.vitals ? snap.vitals.fr : "",
    sat: snap && snap.vitals ? snap.vitals.sat : "",
    pesoKg: patient && patient.peso,
    lab: resolveVentilatorioLabContext(activeId, getLabHistory())
  };
}
function renderEstadoClinicoSection(monitoreo, activeId, patient) {
  var pend = monitoreo.pendienteReceta || {};
  var dietPending = hasDietProposal(pend);
  var ec = estadoClinicoForDisplay(monitoreo, eaManejoFechaOpts(activeId, monitoreo));
  var dietaSuplemento = isDietaSuplemento(ec.dieta);
  var dietaParenteral = isDietaParenteral(ec.dieta);
  var dietWeight = resolveDietWeightKg({ patientPeso: patient && patient.peso, pesoRef: ec.pesoRef });
  var kcalDisplay = resolveKcalDisplay(ec, pend, dietPending, dietWeight, dietaParenteral);
  var dietWeightHint = buildDietWeightHint(dietWeight);
  var medFieldsHtml = renderMedCategoryGrid(monitoreo, activeId, getMedRecetaByPatient());
  var anyPending = hasPendingEaProposals(pend);
  var dietOptions = getDietOptions(monitoreo);
  var dietOptionSelected = resolveDietOptionSelected(monitoreo);
  var vitalsCtx = buildVitalsCtx(monitoreo, activeId, patient);
  return '<details class="ea-estado-clinico"' + (anyPending ? " open" : "") + "><summary>Estado cl\xEDnico general</summary>" + renderEstadoClinicoBodyHtml(
    ec,
    dietPending,
    dietaSuplemento,
    kcalDisplay,
    dietWeightHint,
    medFieldsHtml,
    anyPending,
    dietOptions,
    dietOptionSelected,
    dietaParenteral,
    vitalsCtx
  ) + "</details>";
}
function getEstadoActualTextForPatient(patient) {
  if (!patient || !patient.monitoreo) return "";
  return generateEstadoActualText(patient.monitoreo, patient);
}
function flushEaEstadoClinicoFieldsFromDom(patient, root) {
  var p = patient;
  if (!p) {
    var activeId = getEaPanelRuntime().getActiveId();
    if (!activeId) return false;
    p = getPatients().find(function(x) {
      return x && x.id === activeId;
    }) || null;
  }
  if (!p) return false;
  ensureMonitoreo(p);
  var mon = p.monitoreo;
  if (!mon || !mon.estadoClinico) return false;
  var mount = root && typeof root.querySelector === "function" ? root : typeof document !== "undefined" ? document.getElementById("exp-pane-estado-actual") : null;
  if (!mount) return false;
  var conf = mon.confirmado && typeof mon.confirmado === "object" ? mon.confirmado : {};
  var dietProposalActive = hasDietProposal(mon.pendienteReceta) && !conf.dieta;
  var changed = false;
  mount.querySelectorAll("[data-ea-ec]").forEach(function(el) {
    var key = el.getAttribute("data-ea-ec");
    if (!key) return;
    var val = "value" in el ? String(el.value) : "";
    if (String(mon.estadoClinico[key] || "") !== val) {
      mon.estadoClinico[key] = val;
      changed = true;
    }
    if (dietProposalActive && DIET_PENDING_KEYS.indexOf(key) >= 0) {
      if (!mon.pendienteReceta || typeof mon.pendienteReceta !== "object") mon.pendienteReceta = {};
      if (String(mon.pendienteReceta[key] || "") !== val) {
        mon.pendienteReceta[key] = val;
        changed = true;
      }
    }
  });
  if (changed) mon.estadoClinicoUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return changed;
}
function persistEstadoClinicoAndRefresh(monitoreo, toastMsg, patient) {
  flushEaEstadoClinicoFieldsFromDom(patient);
  persistClinicalState();
  scheduleCloudSyncPush();
  eaPanelBridge.renderEstadoActualPanel({ dataOnly: true, refreshClinico: true, skipChartsSummary: true });
  if (toastMsg) getEaPanelRuntime().showToast(toastMsg, "success");
}
function persistEstadoClinicoLight(_monitoreo, patient) {
  flushEaEstadoClinicoFieldsFromDom(patient);
  persistClinicalState();
  scheduleCloudSyncPush();
}
function captureEaPanelUiState(mount) {
  if (!mount) return { clinicoOpen: false, historialOpen: false };
  var det = mount.querySelector(".ea-estado-clinico");
  var hist = mount.querySelector(".ea-historial");
  return { clinicoOpen: !!(det && det.open), historialOpen: !!(hist && hist.open) };
}
function restoreEaPanelUiState(mount, state2) {
  if (!mount || !state2) return;
  if (state2.clinicoOpen) {
    var det = mount.querySelector(".ea-estado-clinico");
    if (det) det.open = true;
  }
  if (state2.historialOpen) {
    var hist = mount.querySelector(".ea-historial");
    if (hist) hist.open = true;
  }
}
function wireEstadoClinicoInteractions(mount, patient) {
  if (!mount || !patient) return;
  mount.querySelectorAll("[data-ea-ec]").forEach(function(el) {
    var tag = (el.tagName || "").toUpperCase();
    var handler = function() {
      applyEstadoClinicoFieldChange(el, patient);
      if (el.getAttribute("data-ea-ec") === "soporte") {
        syncSoporteParamsVisibility(mount, el.value);
        eaPanelBridge.renderEstadoActualPanel({
          dataOnly: true,
          refreshClinico: true,
          skipChartsSummary: true
        });
      }
    };
    if (tag === "SELECT") el.addEventListener("change", handler);
    else el.addEventListener("input", handler);
  });
  var soporteSel = mount.querySelector('[data-ea-ec="soporte"]');
  if (soporteSel && "value" in soporteSel) {
    syncSoporteParamsVisibility(mount, soporteSel.value);
  }
  wireMedCategoryGrid(mount, {
    patient,
    medRecetaByPatient: getMedRecetaByPatient(),
    getActiveId: function() {
      return getEaPanelRuntime().getActiveId();
    },
    persistClinicalState,
    syncTextarea: function() {
    }
  });
}
function generateEstadoActualText(monitoreo, patient, activeId) {
  var snapshot = deriveSnapshot(monitoreo);
  var weightKg = resolveDietWeightKg({
    patientPeso: patient && patient.peso,
    pesoRef: monitoreo.estadoClinico && monitoreo.estadoClinico.pesoRef
  });
  if (monitoreo.estadoClinico) syncDietKcalFromWeight(monitoreo.estadoClinico, weightKg);
  var id = activeId != null ? activeId : getEaPanelRuntime().getActiveId();
  var recetaBlock = id && getMedRecetaByPatient() ? getMedRecetaByPatient()[id] : null;
  return buildEstadoActualText(
    estadoClinicoForText(monitoreo, eaManejoFechaOpts(id, monitoreo)),
    snapshot,
    { balanceTurno: balanceTurno(monitoreo) },
    {
      patientId: patient && patient.id,
      patientPeso: patient && patient.peso,
      recetaBlock,
      bombaAlgoritmo: monitoreo.bombaInsulinaAlgoritmo ?? null
    }
  );
}

// public/js/features/estado-actual-panel-glu-rescue-html.mjs
function gluRescueFieldsHtml() {
  return '<label class="ea-glu-altered-toggle"><input type="checkbox" class="ea-glu-altered-input" data-ea-glu-altered aria-label="Glucometr\xEDa alterada"><span>Alterada</span></label><div class="ea-glu-rescue-wrap ea-glu-rescue-wrap--hidden" data-ea-glu-rescue-wrap hidden><div class="ea-glu-rescue-box"><span class="ea-glu-rescue-box-title">Rescate</span><div class="ea-glu-rescue-box-fields"><label class="ea-glu-rescue-field"><span class="ea-label">Unidades</span><span class="ea-input-affix"><input type="number" class="ea-input ea-glu-rescue-input" data-ea-glu-rescue-units min="0" step="0.5" placeholder="0" inputmode="decimal" aria-label="Unidades de rescate"><span class="ea-input-affix-suffix" aria-hidden="true">U</span></span></label><label class="ea-glu-rescue-field"><span class="ea-label">DXT post-rescate</span><span class="ea-input-affix"><input type="number" class="ea-input ea-glu-post-rescue-input" data-ea-glu-post-rescue-value min="0" step="1" placeholder="0" inputmode="numeric" aria-label="Destrox\xEDa post-rescate"><span class="ea-input-affix-suffix" aria-hidden="true">mg/dL</span></span></label></div></div></div>';
}

// public/js/features/estado-actual-panel-glu-row.mjs
function buildStandardGluRowHtml(standardTime) {
  return '<span class="ea-glu-time-badge">' + standardTime + '</span><input type="number" class="ea-input ea-glu-value-input" data-ea-glu-value min="0" step="1" placeholder="mg/dL" inputmode="numeric" aria-label="Glucometr\xEDa ' + standardTime + '"><input type="hidden" data-ea-glu-time value="' + standardTime + '"><div class="ea-glu-row-meta">' + gluRescueFieldsHtml() + "</div>";
}
function buildExtraGluRowHtml() {
  return '<input type="time" class="ea-input ea-input--time ea-glu-time-input" data-ea-glu-time aria-label="Hora de glucometr\xEDa"><input type="number" class="ea-input ea-glu-value-input" data-ea-glu-value min="0" step="1" placeholder="mg/dL" inputmode="numeric" aria-label="Glucometr\xEDa"><button type="button" class="ea-btn ea-btn--ghost ea-btn--icon ea-glu-remove-btn" data-ea-glu-remove title="Quitar fila" aria-label="Quitar glucometr\xEDa">\xD7</button><div class="ea-glu-row-meta">' + gluRescueFieldsHtml() + "</div>";
}
function applyGluRescueFields(row, data) {
  var alteredEl = (
    /** @type {HTMLInputElement | null} */
    row.querySelector("[data-ea-glu-altered]")
  );
  var rescueEl = (
    /** @type {HTMLInputElement | null} */
    row.querySelector("[data-ea-glu-rescue-units]")
  );
  var postRescueEl = (
    /** @type {HTMLInputElement | null} */
    row.querySelector("[data-ea-glu-post-rescue-value]")
  );
  if (alteredEl && data.altered) alteredEl.checked = true;
  if (rescueEl && data.rescueUnits != null && data.rescueUnits !== "") rescueEl.value = String(data.rescueUnits);
  if (postRescueEl && data.postRescueValue != null && data.postRescueValue !== "") {
    postRescueEl.value = String(data.postRescueValue);
  }
}
function fillGluRowData(row, data, isStandard) {
  if (!data) return;
  var val = row.querySelector("[data-ea-glu-value]");
  var time = row.querySelector("[data-ea-glu-time]");
  if (val && data.value != null && "value" in val) val.value = String(data.value);
  if (!isStandard && time && data.time && "value" in time) time.value = String(data.time);
  applyGluRescueFields(row, data);
}
function focusNextStandardGluOrIo(list, row) {
  var standardRows = list.querySelectorAll(".ea-glu-row--standard");
  for (var si = 0; si < standardRows.length; si++) {
    if (standardRows[si] !== row) continue;
    if (si < standardRows.length - 1) {
      var nextStd = standardRows[si + 1].querySelector("[data-ea-glu-value]");
      if (nextStd && "focus" in nextStd) {
        nextStd.focus();
        return true;
      }
    }
    break;
  }
  return false;
}
function focusSiblingGluOrIo(row) {
  var next = row.nextElementSibling;
  var nextFocus = next && next.querySelector("[data-ea-glu-value]");
  if (nextFocus && "focus" in nextFocus) {
    nextFocus.focus();
    return true;
  }
  var ioIng = document.getElementById("ea-io-ing");
  if (ioIng && "focus" in ioIng) ioIng.focus();
  return true;
}

// public/js/features/estado-actual-panel-registro-tab.mjs
var REGISTRO_TAB_SKIP_SELECTOR = [
  "[data-ea-vital-add]",
  "[data-ea-altered]",
  "[data-ea-glu-altered]",
  "[data-ea-glu-rescue-units]",
  "[data-ea-glu-post-rescue-value]",
  "[data-ea-glu-remove]",
  "#ea-add-glu",
  "#ea-add-bomba",
  "#ea-bomba-enabled",
  "[data-ea-io-nc]",
  ".ea-registro-paste-btn"
].join(",");
function applyRegistroTabSkipAttributes(form) {
  if (!form) return;
  form.querySelectorAll(REGISTRO_TAB_SKIP_SELECTOR).forEach(function(el) {
    el.setAttribute("tabindex", "-1");
  });
}
function getRegistroTabSpineElements(form) {
  var out = [];
  var recorded = form.querySelector("#ea-recorded-at");
  if (recorded) out.push(
    /** @type {HTMLElement} */
    recorded
  );
  VITAL_KEYS.forEach(function(key) {
    var stack = form.querySelector('[data-ea-vital-stack="' + key + '"]');
    if (!stack) return;
    var count = Math.max(1, Number(stack.getAttribute("data-ea-layer-count") || "1"));
    var input = stack.querySelector(
      '[data-ea-vital="' + key + '"][data-ea-layer-idx="' + (count - 1) + '"]'
    );
    if (input && isFocusableVisible_(input)) out.push(
      /** @type {HTMLElement} */
      input
    );
  });
  var bombaOn = form.querySelector("#ea-bomba-enabled");
  var useBomba = bombaOn && /** @type {HTMLInputElement} */
  bombaOn.checked;
  var list = form.querySelector(useBomba ? "#ea-bomba-list" : "#ea-glu-list");
  if (list) {
    list.querySelectorAll(".ea-glu-row").forEach(function(row) {
      var time = row.querySelector('[data-ea-glu-time]:not([type="hidden"])');
      var val = row.querySelector("[data-ea-glu-value]");
      if (time && isFocusableVisible_(time)) out.push(
        /** @type {HTMLElement} */
        time
      );
      if (val && isFocusableVisible_(val)) out.push(
        /** @type {HTMLElement} */
        val
      );
    });
  }
  ["ea-io-ing", "ea-io-evac", "ea-io-egr"].forEach(function(id) {
    var el = form.querySelector("#" + id);
    if (el && isFocusableVisible_(el)) out.push(
      /** @type {HTMLElement} */
      el
    );
  });
  return out;
}
function isFocusableVisible_(el) {
  if (!el || typeof el.getAttribute !== "function") return false;
  if (el.closest && el.closest("[hidden]")) return false;
  var style = typeof getComputedStyle === "function" ? getComputedStyle(el) : null;
  if (style && (style.display === "none" || style.visibility === "hidden")) return false;
  return true;
}
function moveRegistroTabFocus(form, current, dir) {
  var spine = getRegistroTabSpineElements(form);
  var idx = spine.indexOf(current);
  if (idx < 0) {
    idx = dir === 1 ? -1 : spine.length;
  }
  var next = spine[idx + dir];
  if (!next) return null;
  if (typeof next.focus === "function") next.focus();
  return next;
}
function handleRegistroTabKeydown(form, ev) {
  if (ev.key !== "Tab") return;
  var t = (
    /** @type {HTMLElement | null} */
    ev.target
  );
  if (!t || !form.contains(t)) return;
  var spine = getRegistroTabSpineElements(form);
  var onSpine = spine.indexOf(t) >= 0;
  var onSkip = t.matches && t.matches(REGISTRO_TAB_SKIP_SELECTOR);
  if (!onSpine && !onSkip) return;
  ev.preventDefault();
  moveRegistroTabFocus(form, t, ev.shiftKey ? -1 : 1);
}

// public/js/features/estado-actual-panel-glu.mjs
function syncGluRowAltered(row) {
  var alteredEl = (
    /** @type {HTMLInputElement | null} */
    row.querySelector("[data-ea-glu-altered]")
  );
  var wrap = row.querySelector("[data-ea-glu-rescue-wrap]");
  var valueEl = (
    /** @type {HTMLInputElement | null} */
    row.querySelector("[data-ea-glu-value]")
  );
  if (!alteredEl || !wrap) return;
  var altered = !!alteredEl.checked;
  var hasValue = !!(valueEl && String(valueEl.value).trim() !== "");
  var showRescue = altered && hasValue;
  wrap.classList.toggle("ea-glu-rescue-wrap--hidden", !showRescue);
  wrap.hidden = !showRescue;
  row.classList.toggle("ea-glu-row--altered", showRescue);
}
function wireGluRowAltered(row) {
  var alteredEl = row.querySelector("[data-ea-glu-altered]");
  var valueEl = row.querySelector("[data-ea-glu-value]");
  if (alteredEl) alteredEl.addEventListener("change", function() {
    syncGluRowAltered(row);
  });
  if (valueEl) valueEl.addEventListener("input", function() {
    syncGluRowAltered(row);
  });
  syncGluRowAltered(row);
}
function focusNextGluValueOrIo(row) {
  var list = row.parentElement;
  if (!list) return;
  if (row.classList.contains("ea-glu-row--standard")) {
    if (focusNextStandardGluOrIo(list, row)) return;
  } else if (focusSiblingGluOrIo(row)) {
    return;
  }
}
function wireGluRowKeyboard(row, buildRowFn) {
  var valueEl = row.querySelector("[data-ea-glu-value]");
  if (!valueEl) return;
  valueEl.addEventListener("keydown", function(ev) {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    if (row.classList.contains("ea-glu-row--extra")) {
      var list = row.parentElement;
      var extraRows = list ? list.querySelectorAll(".ea-glu-row--extra") : [];
      if (row === extraRows[extraRows.length - 1]) {
        var newRow = buildRowFn();
        if (list) {
          list.appendChild(newRow);
          applyRegistroTabSkipAttributes(
            /** @type {HTMLElement | null} */
            list.closest("form")
          );
        }
        var focusEl = newRow.querySelector("[data-ea-glu-value]");
        if (focusEl && "focus" in focusEl) focusEl.focus();
        return;
      }
    }
    focusNextGluValueOrIo(row);
  });
  var timeEl = row.querySelector('[data-ea-glu-time]:not([type="hidden"])');
  if (timeEl) {
    timeEl.addEventListener("keydown", function(ev) {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      if (valueEl && "focus" in valueEl) valueEl.focus();
    });
  }
}
function buildGluRow(data, opts) {
  opts = opts || {};
  var standardTime = opts.standardTime ? String(opts.standardTime) : "";
  var isStandard = !!standardTime;
  var row = document.createElement("div");
  row.className = "ea-glu-row" + (isStandard ? " ea-glu-row--standard" : " ea-glu-row--extra");
  if (isStandard) row.setAttribute("data-ea-glu-standard", standardTime);
  row.innerHTML = isStandard ? buildStandardGluRowHtml(standardTime) : buildExtraGluRowHtml();
  fillGluRowData(row, data, isStandard);
  var removeBtn = row.querySelector("[data-ea-glu-remove]");
  if (removeBtn) removeBtn.addEventListener("click", function() {
    row.remove();
  });
  wireGluRowAltered(row);
  wireGluRowKeyboard(row, function() {
    return buildGluRow();
  });
  return row;
}
function fillStandardGluList(gluList, prefill) {
  if (!gluList) return;
  var byTime = /* @__PURE__ */ new Map();
  (prefill || []).forEach(function(g) {
    var t = g.time != null ? String(g.time) : "";
    if (t) byTime.set(t, g);
  });
  gluList.innerHTML = "";
  gluList.classList.add("ea-glu-list--slots");
  STANDARD_GLUCOMETRIA_TIMES.forEach(function(slotTime) {
    gluList.appendChild(buildGluRow(byTime.get(slotTime), { standardTime: slotTime }));
  });
}
function syncEaGluMode(form) {
  if (!form) return;
  var toggle = form.querySelector("#ea-bomba-enabled");
  var normalBlock = form.querySelector("#ea-glu-normal-block");
  var bombaBlock = form.querySelector("#ea-bomba-block");
  if (!toggle || !normalBlock || !bombaBlock) return;
  var bombaOn = (
    /** @type {HTMLInputElement} */
    toggle.checked
  );
  normalBlock.hidden = bombaOn;
  bombaBlock.hidden = !bombaOn;
  normalBlock.classList.toggle("ea-glu-pane--off", bombaOn);
  bombaBlock.classList.toggle("ea-glu-pane--off", !bombaOn);
  if (bombaOn) {
    var bombaList = form.querySelector("#ea-bomba-list");
    if (bombaList && !bombaList.querySelector(".ea-bomba-row")) bombaList.appendChild(buildBombaRow());
  } else {
    var gluList = form.querySelector("#ea-glu-list");
    if (gluList && !gluList.querySelector(".ea-glu-row")) fillStandardGluList(gluList);
  }
}
function buildBombaRow(data) {
  var row = document.createElement("div");
  row.className = "ea-bomba-row";
  row.innerHTML = '<label class="ea-field ea-field--inline"><span class="ea-label">Glu</span><input type="number" class="ea-input" data-ea-bomba-value min="0" step="1" placeholder="mg/dL"></label><label class="ea-field ea-field--inline"><span class="ea-label">Unidades</span><input type="number" class="ea-input" data-ea-bomba-units min="0" step="0.1" placeholder="U"></label><label class="ea-field ea-field--inline"><span class="ea-label">Hora</span><input type="time" class="ea-input ea-input--time" data-ea-bomba-time></label><button type="button" class="ea-btn ea-btn--ghost ea-btn--icon" data-ea-bomba-remove title="Quitar" aria-label="Quitar registro bomba">\xD7</button>';
  if (data) {
    var val = row.querySelector("[data-ea-bomba-value]");
    var units = row.querySelector("[data-ea-bomba-units]");
    var time = row.querySelector("[data-ea-bomba-time]");
    if (val && data.value != null && "value" in val) val.value = String(data.value);
    if (units && data.units != null && "value" in units) units.value = String(data.units);
    if (time && data.time && "value" in time) time.value = String(data.time);
  }
  var removeBtn = row.querySelector("[data-ea-bomba-remove]");
  if (removeBtn) {
    removeBtn.addEventListener("click", function() {
      var list = row.parentElement;
      if (!list) return;
      if (list.querySelectorAll(".ea-bomba-row").length <= 1) {
        ["[data-ea-bomba-value]", "[data-ea-bomba-units]", "[data-ea-bomba-time]"].forEach(function(sel) {
          var el = row.querySelector(sel);
          if (el) el.value = "";
        });
        return;
      }
      row.remove();
    });
  }
  return row;
}

// public/js/features/estado-actual-panel-vitals.mjs
function vitalLayerBoxKey(baseKey, layerIdx) {
  return baseKey + "__L" + layerIdx;
}
function buildVitalChipHtml(baseKey, labelOverride, opts) {
  opts = opts || {};
  var label = labelOverride || VITAL_LABELS[baseKey] || baseKey;
  var layerIdx = opts.layerIdx != null ? opts.layerIdx : 0;
  var boxKey = vitalLayerBoxKey(baseKey, layerIdx);
  var unit = VITAL_UNITS[baseKey] || "";
  var labelHtml = '<div class="vital-label"><span class="ea-vital-name">' + label + '</span><span class="ea-vital-unit">' + unit + "</span></div>";
  return '<div class="vital-box ea-vital-box ea-vital-chip" data-ea-vital-box="' + boxKey + '">' + labelHtml + '<div class="ea-vital-value-wrap"><input type="number" class="ea-vital-input" data-ea-vital="' + baseKey + '" data-ea-layer-idx="' + layerIdx + '" step="any" inputmode="decimal" placeholder="\u2014" aria-label="' + label + '"></div><div class="ea-altered-slot ea-altered-slot--hidden" data-ea-altered-wrap="' + boxKey + '" hidden><span class="ea-altered-label">Alterado</span><input type="time" class="ea-altered-time-input" data-ea-altered="' + boxKey + '" aria-label="Hora ' + label + ' alterado"></div></div>';
}
function buildVitalStackHtml(vitalKey) {
  var label = VITAL_LABELS[vitalKey] || vitalKey;
  var slots = "";
  for (var li = 0; li < MAX_VITAL_LAYERS_IN_FORM; li++) {
    slots += '<div class="ea-vital-slot" data-ea-layer="' + li + '"' + (li > 0 ? " hidden" : "") + ">" + buildVitalChipHtml(vitalKey, label, { layerIdx: li }) + "</div>";
  }
  return '<div class="ea-vital-stack" data-ea-vital-stack="' + vitalKey + '" data-ea-layer-count="1">' + slots + '<button type="button" class="ea-vital-add-btn ea-temp-add-btn" data-ea-vital-add="' + vitalKey + '" hidden title="Otra lectura de ' + label + " (m\xE1x. " + MAX_VITAL_READINGS_PER_DAY + '/d\xEDa)">+1</button><div class="ea-vital-prev-badge" data-ea-vital-prev-view hidden><span class="ea-vital-prev-summary" data-ea-vital-prev-summary></span></div></div>';
}
function getVitalStackLayerCount(stack) {
  return Math.min(
    MAX_VITAL_LAYERS_IN_FORM,
    Math.max(1, Number(stack.getAttribute("data-ea-layer-count") || "1"))
  );
}
function setVitalStackLayerCount(stack, count) {
  stack.setAttribute("data-ea-layer-count", String(count));
  stack.classList.toggle("ea-vital-stack--multi", count > 1);
  stack.classList.toggle("ea-vital-stack--dual", count > 1);
}
function updateVitalStackLayerVisibility(form, vitalKey) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var count = getVitalStackLayerCount(stack);
  var active = count - 1;
  for (var li = 0; li < MAX_VITAL_LAYERS_IN_FORM; li++) {
    var slot = stack.querySelector('[data-ea-layer="' + li + '"]');
    if (!slot) continue;
    var on = li === active;
    slot.hidden = !on;
    slot.style.visibility = "";
    slot.style.pointerEvents = "";
    slot.style.zIndex = "";
  }
  var prevBadge = stack.querySelector("[data-ea-vital-prev-view]");
  if (prevBadge) prevBadge.hidden = count <= 1;
}
function syncVitalPrevSummary(form, vitalKey) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var summary = stack.querySelector("[data-ea-vital-prev-summary]");
  if (!summary) return;
  var count = getVitalStackLayerCount(stack);
  var unit = VITAL_UNITS[vitalKey] || "";
  var parts = [];
  for (var li = 0; li < count - 1; li++) {
    var input = stack.querySelector(
      '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + li + '"]'
    );
    var boxKey = vitalLayerBoxKey(vitalKey, li);
    var timeEl = stack.querySelector('[data-ea-altered="' + boxKey + '"]');
    var val = input && "value" in input ? String(input.value).trim() : "";
    if (!val) continue;
    var time = timeEl && "value" in timeEl && timeEl.value ? String(timeEl.value) : "";
    parts.push(val + (unit ? " " + unit : "") + (time ? " @ " + time : ""));
  }
  summary.textContent = parts.length ? parts.join(" \xB7 ") : "\u2014";
}
function syncVitalAddButtonVisibility(form, vitalKey) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var addBtn = stack.querySelector('[data-ea-vital-add="' + vitalKey + '"]');
  if (!addBtn) return;
  var count = getVitalStackLayerCount(stack);
  var active = count - 1;
  var activeInput = stack.querySelector(
    '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + active + '"]'
  );
  var hasVal = activeInput && "value" in activeInput && String(activeInput.value).trim() !== "";
  var atFormMax = count >= MAX_VITAL_LAYERS_IN_FORM;
  addBtn.hidden = !hasVal || atFormMax;
  if (atFormMax) {
    addBtn.title = "M\xE1ximo " + MAX_VITAL_LAYERS_IN_FORM + " lecturas en este registro";
  }
}
function syncAllVitalAddButtonVisibility(form) {
  VITAL_KEYS.forEach(function(key) {
    syncVitalAddButtonVisibility(form, key);
  });
}
function validateVitalSeriesTurnLimits(historial, vitalSeries, now) {
  var hist = Array.isArray(historial) ? historial : [];
  for (var ki = 0; ki < VITAL_KEYS.length; ki++) {
    var key = VITAL_KEYS[ki];
    var newList = vitalSeries && vitalSeries[key] ? vitalSeries[key] : [];
    if (!newList.length) continue;
    var merged = collectVitalReadingsInRegistroWindow(hist, key, now).slice();
    for (var ni = 0; ni < newList.length; ni++) {
      pushVitalReading(merged, newList[ni]);
    }
    if (merged.length > MAX_VITAL_READINGS_PER_DAY) {
      return { ok: false, key, label: VITAL_LABELS[key] || key };
    }
  }
  return { ok: true };
}
function expandVitalNextLayer(form, vitalKey) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var count = getVitalStackLayerCount(stack);
  if (count >= MAX_VITAL_LAYERS_IN_FORM) {
    getEaPanelRuntime().showToast("M\xE1ximo " + MAX_VITAL_LAYERS_IN_FORM + " lecturas por signo en este registro", "error");
    return;
  }
  var active = count - 1;
  var activeInput = stack.querySelector(
    '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + active + '"]'
  );
  if (!activeInput || !("value" in activeInput) || !String(activeInput.value).trim()) {
    getEaPanelRuntime().showToast("Captura el valor actual antes de agregar otra lectura", "error");
    return;
  }
  setVitalStackLayerCount(stack, count + 1);
  updateVitalStackLayerVisibility(form, vitalKey);
  syncVitalPrevSummary(form, vitalKey);
  syncVitalAddButtonVisibility(form, vitalKey);
  var nextInput = stack.querySelector(
    '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + count + '"]'
  );
  if (nextInput && "focus" in nextInput) nextInput.focus();
  applyRegistroTabSkipAttributes(form);
}
function setVitalStackFromSeries(form, vitalKey, readings, layerCount) {
  if (!form) return;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return;
  var list = Array.isArray(readings) ? readings.slice(0, MAX_VITAL_LAYERS_IN_FORM) : [];
  var count = layerCount != null ? layerCount : Math.max(1, list.length);
  count = Math.min(MAX_VITAL_LAYERS_IN_FORM, count);
  setVitalStackLayerCount(stack, count);
  for (var li = 0; li < MAX_VITAL_LAYERS_IN_FORM; li++) {
    var input = stack.querySelector(
      '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + li + '"]'
    );
    var boxKey = vitalLayerBoxKey(vitalKey, li);
    var timeEl = stack.querySelector('[data-ea-altered="' + boxKey + '"]');
    var rd = list[li];
    if (input && "value" in input) input.value = rd && rd.value != null ? String(rd.value) : "";
    if (timeEl && "value" in timeEl) timeEl.value = rd && rd.time ? String(rd.time) : "";
  }
  updateVitalStackLayerVisibility(form, vitalKey);
  syncVitalPrevSummary(form, vitalKey);
  syncVitalAddButtonVisibility(form, vitalKey);
}
function collapseVitalStack(form, vitalKey) {
  setVitalStackFromSeries(form, vitalKey, [], 1);
}
function collapseAllVitalStacks(form) {
  VITAL_KEYS.forEach(function(key) {
    collapseVitalStack(form, key);
  });
}
function readVitalSeriesFromStack(form, vitalKey) {
  var out = [];
  if (!form) return out;
  var stack = form.querySelector('[data-ea-vital-stack="' + vitalKey + '"]');
  if (!stack) return out;
  var count = getVitalStackLayerCount(stack);
  for (var li = 0; li < count; li++) {
    var input = stack.querySelector(
      '[data-ea-vital="' + vitalKey + '"][data-ea-layer-idx="' + li + '"]'
    );
    var boxKey = vitalLayerBoxKey(vitalKey, li);
    var timeEl = stack.querySelector('[data-ea-altered="' + boxKey + '"]');
    if (!input || !("value" in input)) continue;
    var raw = String(input.value).trim();
    if (!raw) continue;
    var n = Number(raw);
    if (!Number.isFinite(n)) continue;
    var time = timeEl && "value" in timeEl && timeEl.value ? String(timeEl.value) : void 0;
    out.push({ value: n, time });
  }
  return out;
}

// public/js/features/estado-actual-panel-registro-io.mjs
function syncEaRegistroInsulinRescateFlag(form) {
  if (!form) return;
  var activeId = getEaFormOpenPatientId();
  if (activeId == null) activeId = getEaPanelRuntime().getActiveId();
  var block = activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null;
  var hasRescates = patientHasInsulinRescatesInReceta(block);
  form.classList.toggle("ea-form--no-insulin-rescates", !hasRescates);
}
function syncEaRegistroInsulinPumpFlag(form, monitoreo) {
  if (!form) return;
  var activeId = getEaFormOpenPatientId();
  if (activeId == null) activeId = getEaPanelRuntime().getActiveId();
  var block = activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null;
  var alg = insulinPumpAlgorithmFromMonitoreo(monitoreo);
  var hasPump = alg != null || patientHasInsulinPumpInReceta(block);
  form.classList.toggle("ea-form--insulin-pump-some", hasPump);
  var algEl = form.querySelector("#ea-bomba-algoritmo-hint");
  if (algEl) {
    algEl.textContent = alg != null ? "BOMBA DE INSULINA EN ALGORITMO " + alg : "";
    algEl.hidden = alg == null;
  }
}
function applyIoNcMode(form) {
  if (!form) return;
  var ingEl = form.querySelector("#ea-io-ing");
  var egrEl = form.querySelector("#ea-io-egr");
  if (ingEl && "value" in ingEl) ingEl.value = "NC";
  if (egrEl && "value" in egrEl) egrEl.value = "DIURESIS NC";
  syncIoBalanceFromForm(form);
}
function syncIoBalanceFromForm(form) {
  if (!form) return;
  var ingEl = form.querySelector("#ea-io-ing");
  var egrEl = form.querySelector("#ea-io-egr");
  var out = form.querySelector("#ea-balance-turno-live");
  if (!ingEl || !egrEl || !out) return;
  var ing = parseIoIngresoField(ingEl.value);
  if (ing === "NC" && String(egrEl.value || "").trim().toUpperCase() !== "DIURESIS NC") {
    egrEl.value = "DIURESIS NC";
  }
  var egrParts = parseIoEgresoLine(egrEl.value);
  var label = formatIoBalanceDisplay(ing, {
    ing,
    egrParts,
    egr: diuresisValueFromParts(egrParts)
  });
  out.textContent = label;
  out.classList.remove("ea-balance-live--pos", "ea-balance-live--neg");
  if (/^\+\d/.test(String(label))) out.classList.add("ea-balance-live--pos");
  else if (/^-\d/.test(String(label))) out.classList.add("ea-balance-live--neg");
}
function fillEgrField(egrEl, io) {
  if (!egrEl || !("value" in egrEl)) return;
  if (io.egrParts && io.egrParts.length) {
    egrEl.value = serializeEgrPartsToFormText(io.egrParts);
  } else if (io.egr != null && io.egr !== "") {
    egrEl.value = typeof io.egr === "number" ? String(io.egr) : String(io.egr);
  }
}
function fillEvacField(evacEl, evac) {
  if (!evacEl || evac == null || evac === "" || !("value" in evacEl)) return;
  evacEl.value = typeof evac === "number" ? String(evac) : String(evac);
}
function fillIoFields(form, io) {
  io = io || {};
  var ingEl = form.querySelector("#ea-io-ing");
  var egrEl = form.querySelector("#ea-io-egr");
  var evacEl = form.querySelector("#ea-io-evac");
  if (ingEl && io.ing != null && io.ing !== "" && "value" in ingEl) ingEl.value = String(io.ing);
  fillEgrField(egrEl, io);
  fillEvacField(evacEl, io.evac);
}
function clearIoFields(form) {
  var ing = form.querySelector("#ea-io-ing");
  var egr = form.querySelector("#ea-io-egr");
  var evac = form.querySelector("#ea-io-evac");
  if (ing && "value" in ing) ing.value = "";
  if (egr && "value" in egr) egr.value = "";
  if (evac && "value" in evac) evac.value = "";
}

// public/js/features/estado-actual-panel-registro-wire.mjs
function defaultAlteredTimeFromForm(form) {
  var recEl = form.querySelector("#ea-recorded-at");
  if (!recEl || !("value" in recEl) || !recEl.value) return "";
  var match = String(recEl.value).match(/T(\d{2}):(\d{2})/);
  if (!match) return "";
  return match[1] + ":" + match[2];
}
function syncAlteredFields(form) {
  var defaultTime = defaultAlteredTimeFromForm(form);
  function syncLayer(baseKey, layerIdx) {
    var boxKey = vitalLayerBoxKey(baseKey, layerIdx);
    var input = form.querySelector('[data-ea-vital="' + baseKey + '"][data-ea-layer-idx="' + layerIdx + '"]');
    var wrap = form.querySelector('[data-ea-altered-wrap="' + boxKey + '"]');
    var box = form.querySelector('[data-ea-vital-box="' + boxKey + '"]');
    var timeEl = form.querySelector('[data-ea-altered="' + boxKey + '"]');
    if (!input || !wrap) return;
    var val = input.value;
    var altered = String(val).trim() !== "" && isVitalAltered(baseKey, val);
    wrap.classList.toggle("ea-altered-slot--hidden", !altered);
    wrap.hidden = !altered;
    if (box) box.classList.toggle("ea-vital-box--altered", altered);
    if (altered && timeEl && "value" in timeEl && !String(timeEl.value).trim() && defaultTime && !isTurnCloseHm(defaultTime)) {
      timeEl.value = defaultTime;
    }
  }
  form.querySelectorAll("[data-ea-vital][data-ea-layer-idx]").forEach(function(input) {
    syncLayer(input.getAttribute("data-ea-vital") || "", input.getAttribute("data-ea-layer-idx") || "0");
  });
  syncAllVitalAddButtonVisibility(form);
}
function handleFormClick(form, ev) {
  var target = (
    /** @type {HTMLElement | null} */
    ev.target
  );
  if (!target || !form.contains(target)) return;
  if (target.matches("[data-ea-io-nc]") || target.closest("[data-ea-io-nc]")) {
    applyIoNcMode(form);
    return;
  }
  var addBtn = target.closest("[data-ea-vital-add]");
  if (addBtn) {
    var vitalKey = addBtn.getAttribute("data-ea-vital-add");
    if (!vitalKey) return;
    expandVitalNextLayer(form, vitalKey);
    syncAlteredFields(form);
    return;
  }
  if (target.id === "ea-add-glu" || target.closest("#ea-add-glu")) {
    var gluList = form.querySelector("#ea-glu-list");
    if (gluList) {
      gluList.appendChild(buildGluRow());
      applyRegistroTabSkipAttributes(form);
    }
    return;
  }
  if (target.id === "ea-add-bomba" || target.closest("#ea-add-bomba")) {
    var bombaList = form.querySelector("#ea-bomba-list");
    if (bombaList) bombaList.appendChild(buildBombaRow());
  }
}
function handleFormChange(form, ev) {
  var target = (
    /** @type {HTMLElement | null} */
    ev.target
  );
  if (!target) return;
  if (target.id === "ea-bomba-enabled") {
    syncEaGluMode(form);
    return;
  }
  if (target.matches("[data-ea-glu-altered]")) {
    var gluRow = target.closest(".ea-glu-row");
    if (gluRow) syncGluRowAltered(
      /** @type {HTMLElement} */
      gluRow
    );
  }
}
function handleFormInput(form, ev) {
  var target = (
    /** @type {HTMLElement | null} */
    ev.target
  );
  if (!target) return;
  if (target.matches("[data-ea-vital][data-ea-layer-idx]")) syncAlteredFields(form);
  else if (target.id === "ea-recorded-at") syncAlteredFields(form);
  else if (target.matches("[data-ea-glu-value], [data-ea-glu-rescue-units], [data-ea-glu-post-rescue-value]")) {
    var gluRow = target.closest(".ea-glu-row");
    if (gluRow) syncGluRowAltered(
      /** @type {HTMLElement} */
      gluRow
    );
  } else if (target.id === "ea-io-ing" || target.id === "ea-io-egr" || target.id === "ea-io-evac") {
    syncIoBalanceFromForm(form);
  }
}
function wireFormInteractions(form) {
  if (!form) return;
  if (!form.dataset.eaRegistroFormWired) {
    form.dataset.eaRegistroFormWired = "1";
    form.addEventListener("click", function(ev) {
      handleFormClick(form, ev);
    });
    form.addEventListener("change", function(ev) {
      handleFormChange(form, ev);
    });
    form.addEventListener("input", function(ev) {
      handleFormInput(form, ev);
    });
    form.addEventListener("keydown", function(ev) {
      handleRegistroTabKeydown(form, ev);
    });
  }
  applyRegistroTabSkipAttributes(form);
  syncAlteredFields(form);
  syncIoBalanceFromForm(form);
}

// public/js/features/estado-actual-panel-registro-apply.mjs
function applyParsedVitals(form, vitals, alteredAt) {
  VITAL_KEYS.forEach(function(key) {
    var readings = [];
    if (vitals[key] != null && vitals[key] !== "") {
      readings.push({ value: Number(vitals[key]), time: alteredAt[key] ? String(alteredAt[key]) : void 0 });
    }
    var extraKey = getVitalExtraStorageKey(key);
    if (vitals[extraKey] != null && vitals[extraKey] !== "") {
      readings.push({
        value: Number(vitals[extraKey]),
        time: alteredAt[extraKey] ? String(alteredAt[extraKey]) : void 0
      });
    }
    setVitalStackFromSeries(form, key, readings.slice(0, MAX_VITAL_LAYERS_IN_FORM));
  });
}
function applyParsedGlus(form, glucometrias) {
  var gluList = form.querySelector("#ea-glu-list");
  if (!gluList || !glucometrias.length) return;
  var standardSet = new Set(STANDARD_GLUCOMETRIA_TIMES);
  var standardGlus = [];
  var extraGlus = [];
  glucometrias.forEach(function(g) {
    var t = g.time != null ? String(g.time) : "";
    if (t && standardSet.has(t)) standardGlus.push(g);
    else extraGlus.push(g);
  });
  fillStandardGluList(gluList, standardGlus);
  extraGlus.forEach(function(g) {
    gluList.appendChild(buildGluRow(g));
  });
}
function applyParsedSoporte(soporteHint) {
  if (!soporteHint) return;
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  if (!patient.monitoreo.estadoClinico) patient.monitoreo.estadoClinico = {};
  patient.monitoreo.estadoClinico.soporte = soporteHint;
  var soporteSel = document.querySelector('[data-ea-ec="soporte"]');
  if (soporteSel && "value" in soporteSel) soporteSel.value = soporteHint;
  persistEstadoClinicoLight(patient.monitoreo, patient);
}
function applyEstadoActualParsedToForm(parsed) {
  var form = document.getElementById("ea-form");
  if (!form || !parsed || !parsed.ok) return;
  applyParsedVitals(form, parsed.vitals, parsed.alteredAt);
  applyParsedGlus(form, parsed.glucometrias);
  fillIoFields(form, parsed.io);
  syncIoBalanceFromForm(form);
  applyParsedSoporte(parsed.soporteHint);
}

// public/js/features/estado-actual-panel-registro.mjs
function buildRegistroVitalsSectionHtml(vitalFields) {
  return '<section class="ea-registro-section" aria-labelledby="ea-vitals-section-lbl"><div class="ea-registro-section-head"><h4 id="ea-vitals-section-lbl" class="ea-registro-section-label">Signos vitales</h4><span class="ea-registro-section-hint">+1 lectura previa</span></div><div class="vitals-grid ea-vitals-grid">' + vitalFields + "</div></section>";
}
function buildRegistroGluSectionHtml() {
  return '<section class="ea-registro-section ea-glu-section" aria-labelledby="ea-glu-section-lbl"><div class="ea-glu-mode-row lab-pref-row ea-registro-section-head"><h4 class="ea-registro-section-label lab-pref-row-label" id="ea-glu-section-lbl">Glucometr\xEDas</h4><div class="ea-glu-mode-switch"><span class="ea-glu-mode-switch-label" id="ea-bomba-enabled-lbl">Bomba</span><label class="rpc-switch"><input type="checkbox" id="ea-bomba-enabled" class="rpc-switch-input" role="switch" aria-labelledby="ea-bomba-enabled-lbl"><span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label><button type="button" class="ea-btn ea-btn--ghost ea-glu-add-inline" id="ea-add-glu">+ Extra</button></div></div><div id="ea-glu-normal-block" class="ea-glu-pane ea-glu-block"><div id="ea-glu-list" class="ea-glu-list"></div></div><div id="ea-bomba-block" class="ea-glu-pane ea-glu-block ea-bomba-block ea-glu-pane--off" hidden><p id="ea-bomba-algoritmo-hint" class="ea-bomba-algoritmo-hint ea-muted" hidden></p><div class="ea-glu-head"><button type="button" class="ea-btn ea-btn--ghost" id="ea-add-bomba">+ Agregar</button></div><div id="ea-bomba-list" class="ea-glu-list"></div></div></section>';
}
function buildRegistroIoSectionHtml() {
  return '<section class="ea-registro-section" aria-labelledby="ea-io-section-lbl"><div class="ea-registro-section-head"><h4 id="ea-io-section-lbl" class="ea-registro-section-label">Ingresos / egresos</h4></div><div class="ea-io-grid"><label class="ea-field"><span class="ea-label ea-label--with-action">Ingresos (cc)<button type="button" class="ea-btn ea-btn--ghost ea-io-nc-btn" data-ea-io-nc title="Marcar ingresos, egresos y balance como NC">NC</button></span><input type="text" class="ea-input" id="ea-io-ing" inputmode="text" autocomplete="off" placeholder="cc o NC"></label><label class="ea-field"><span class="ea-label">Evacuaciones</span><input type="text" class="ea-input" id="ea-io-evac" inputmode="text" autocomplete="off" placeholder="NC, cc o texto"></label><div class="ea-field ea-io-balance"><span class="ea-label">Balance</span><span id="ea-balance-turno-live" class="ea-balance-live">\u2014</span></div><label class="ea-field ea-field--full"><span class="ea-label">Egresos (diuresis, drenajes, nefrostom\xEDas\u2026)</span><input type="text" class="ea-input" id="ea-io-egr" inputmode="text" autocomplete="off" placeholder="DIURESIS NC, DRENAJE 50 CC, NEFRO IZQ 20 CC"></label></div></section>';
}
function buildRegistroFooterHtml() {
  return '<footer class="ea-registro-modal-foot"><button type="button" class="ea-btn ea-btn--ghost ea-registro-paste-btn" onclick="openEstadoActualPasteModal({ skipRegistro: true })">Pegar monitoreo</button><div class="ea-registro-modal-actions"><button type="button" class="ea-btn ea-btn--ghost" onclick="closeEstadoActualRegistroModal()">Cancelar</button><button type="button" class="ea-btn ea-btn--success" onclick="registrarEstadoActualMedicion()">Registrar</button></div></footer>';
}
function buildRegistroFormMarkup() {
  var vitalFields = VITAL_KEYS.map(function(key) {
    return buildVitalStackHtml(key);
  }).join("");
  return '<div class="ea-registro-shell"><div class="ea-registro-form-scroll"><form id="ea-form" class="ea-form ea-form--registro" onsubmit="return false;"><div class="ea-registro-lead"><p class="ea-registro-hint">Basta un dato para registrar \xB7 <span class="ea-registro-kbd-hint">\u2318\u21B5</span></p></div><label class="ea-field ea-field--datetime"><span class="ea-label">Fecha y hora</span><input type="datetime-local" class="ea-input rpc-datetime-input" id="ea-recorded-at" value="' + toDatetimeLocalValue(getDefaultRegistroRecordedAt()) + '"></label>' + buildRegistroVitalsSectionHtml(vitalFields) + buildRegistroGluSectionHtml() + buildRegistroIoSectionHtml() + "</form></div>" + buildRegistroFooterHtml() + "</div>";
}
function wireEaRegistroForm(monitoreo) {
  var form = document.getElementById("ea-form");
  wireFormInteractions(form);
  refreshRpcDateFields(form);
  syncEaRegistroInsulinRescateFlag(form);
  syncEaRegistroInsulinPumpFlag(form, monitoreo);
  var gluList = document.getElementById("ea-glu-list");
  if (gluList && !gluList.querySelector(".ea-glu-row")) fillStandardGluList(gluList);
  var bombaList = document.getElementById("ea-bomba-list");
  if (bombaList && !bombaList.querySelector(".ea-bomba-row")) bombaList.appendChild(buildBombaRow());
  syncEaGluMode(form);
}
function syncEaRegistroGluMode() {
  syncEaGluMode(document.getElementById("ea-form"));
}
function clearVitalFormFields(form) {
  form.querySelectorAll("[data-ea-vital]").forEach(function(el) {
    if ("value" in el) el.value = "";
  });
  form.querySelectorAll("[data-ea-altered]").forEach(function(el) {
    if ("value" in el) el.value = "";
  });
  form.querySelectorAll(".ea-altered-slot").forEach(function(el) {
    el.classList.add("ea-altered-slot--hidden");
    el.hidden = true;
  });
  form.querySelectorAll(".ea-vital-box").forEach(function(el) {
    el.classList.remove("ea-vital-box--altered");
  });
  collapseAllVitalStacks(form);
}
function resetGluAndBombaFields() {
  var gluList = document.getElementById("ea-glu-list");
  if (gluList) fillStandardGluList(gluList);
  var bombaToggle = document.getElementById("ea-bomba-enabled");
  var bombaList = document.getElementById("ea-bomba-list");
  if (bombaToggle && "checked" in bombaToggle) bombaToggle.checked = false;
  if (bombaList) {
    bombaList.innerHTML = "";
    bombaList.appendChild(buildBombaRow());
  }
}
function resetEaRegistroForm(_patient) {
  var form = document.getElementById("ea-form");
  if (!form) return;
  clearVitalFormFields(form);
  var recorded = document.getElementById("ea-recorded-at");
  if (recorded && "value" in recorded) recorded.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
  clearIoFields(form);
  resetGluAndBombaFields();
  syncEaRegistroInsulinPumpFlag(form, _patient && _patient.monitoreo ? _patient.monitoreo : null);
  syncEaGluMode(form);
  syncIoBalanceFromForm(form);
  syncAllVitalAddButtonVisibility(form);
}

// public/js/features/estado-actual-panel-parse-form.mjs
function parseVitalsFromForm(form, defaultTime) {
  var vitalSeries = {};
  VITAL_KEYS.forEach(function(key) {
    vitalSeries[key] = readVitalSeriesFromStack(form, key);
  });
  var legacy = vitalSeriesToLegacyFields(vitalSeries);
  var vitals = legacy.vitals;
  var alteredAt = legacy.alteredAt;
  VITAL_KEYS.forEach(function(key) {
    var list = vitalSeries[key] || [];
    for (var li = 0; li < list.length; li++) {
      var rd = list[li];
      if (rd.time) {
        if (li === list.length - 1) alteredAt[key] = rd.time;
        else if (li === list.length - 2 && key === "temp") alteredAt.tempPeak = rd.time;
        else if (li === list.length - 2) alteredAt[getVitalExtraStorageKey(key)] = rd.time;
      } else if (li === list.length - 1 && isVitalAltered(key, rd.value) && !isTurnCloseHm(defaultTime)) {
        alteredAt[key] = defaultTime;
      }
    }
  });
  return { vitals, vitalSeries, alteredAt };
}
function applyAlteredGluExtras(entry, row) {
  var alteredEl = (
    /** @type {HTMLInputElement | null} */
    row.querySelector("[data-ea-glu-altered]")
  );
  if (!alteredEl || !alteredEl.checked) return entry;
  entry.altered = true;
  var rescueEl = row.querySelector("[data-ea-glu-rescue-units]");
  var postRescueEl = row.querySelector("[data-ea-glu-post-rescue-value]");
  var rescueUnits = parseNumOrNull(rescueEl && "value" in rescueEl ? rescueEl.value : "");
  if (rescueUnits != null && rescueUnits > 0) entry.rescueUnits = rescueUnits;
  var postRescueValue = parseNumOrNull(postRescueEl && "value" in postRescueEl ? postRescueEl.value : "");
  if (postRescueValue != null) entry.postRescueValue = postRescueValue;
  return entry;
}
function parseGluRow(row, defaultTime) {
  var valEl = row.querySelector("[data-ea-glu-value]");
  var timeEl = row.querySelector("[data-ea-glu-time]");
  var value = parseNumOrNull(valEl && "value" in valEl ? valEl.value : "");
  if (value == null) return null;
  var slotTime = row.getAttribute("data-ea-glu-standard");
  var time = slotTime || (timeEl && "value" in timeEl && timeEl.value ? String(timeEl.value) : defaultTime);
  return applyAlteredGluExtras({ value, time }, row);
}
function parseGlucometriasFromForm(form, defaultTime) {
  var glucometrias = [];
  form.querySelectorAll(".ea-glu-row").forEach(function(row) {
    var entry = parseGluRow(row, defaultTime);
    if (entry) glucometrias.push(entry);
  });
  return glucometrias;
}
function parseBombaRow(row, defaultTime) {
  var valEl = row.querySelector("[data-ea-bomba-value]");
  var unitsEl = row.querySelector("[data-ea-bomba-units]");
  var timeEl = row.querySelector("[data-ea-bomba-time]");
  var value = parseNumOrNull(valEl && "value" in valEl ? valEl.value : "");
  if (value == null) return null;
  var units = parseNumOrNull(unitsEl && "value" in unitsEl ? unitsEl.value : "");
  var time = timeEl && "value" in timeEl && timeEl.value ? String(timeEl.value) : defaultTime;
  return { value, units: units != null ? units : 0, time };
}
function parseBombaFromForm(form, defaultTime) {
  var bombaInsulina = [];
  form.querySelectorAll(".ea-bomba-row").forEach(function(row) {
    var entry = parseBombaRow(row, defaultTime);
    if (entry) bombaInsulina.push(entry);
  });
  return bombaInsulina;
}

// public/js/features/estado-actual-med-reclassify.mjs
function bucketKeyMatches(fieldKey, soapCat) {
  if (fieldKey === soapCat) return true;
  return fieldKey === "diureticos" && soapCat === "diuretico";
}
function fieldKeyToSoapOverrideKey(fieldKey) {
  return fieldKey === "diureticos" ? "diuretico" : fieldKey;
}
function applySoapCategoryOverride(item, targetFieldKey, classifyFn) {
  if (!item) return;
  var cat = fieldKeyToSoapOverrideKey(String(targetFieldKey || "").trim());
  var autoCat = classifyFn(item.nombreRaw, item.dosisRaw, item.frecuenciaRaw, item.viaRaw);
  if (!cat || SOAP_DESTINATION_KEYS.indexOf(cat) < 0 || cat === autoCat) delete item.soapCatOverride;
  else item.soapCatOverride = cat;
}
function isSelected(sel, item) {
  if (!item || !sel) return false;
  if (sel[item.id]) return true;
  return !!sel[String(item.id)];
}
function markSelected(sel, item) {
  if (!sel || !item || item.id == null) return;
  sel[item.id] = true;
  sel[String(item.id)] = true;
}
function pendingLines(monitoreo, fromKey) {
  if (!monitoreo || !monitoreo.pendienteReceta || typeof monitoreo.pendienteReceta !== "object") {
    return [];
  }
  return String(monitoreo.pendienteReceta[fromKey] || "").split(" | ").map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function itemMatchesPendingLine(it, line) {
  if (!it || !line) return false;
  var frag = String(formatMedicationSoapShort(it) || "").trim();
  if (frag && frag === line) return true;
  var nombre = String(it.nombreRaw || "").trim().toUpperCase();
  var upper = line.toUpperCase();
  return !!(nombre && upper.indexOf(nombre) === 0);
}
function collectItemsToReclassify(items, sel, fromKey, classifyFn, lines) {
  var selected = [];
  var unselected = [];
  items.forEach(function(it) {
    if (!it || it.suspendido) return;
    var cat = effectiveSoapCategory(it, classifyFn);
    var inBucket = bucketKeyMatches(fromKey, cat);
    var inPending = !inBucket && lines.some(function(line) {
      return itemMatchesPendingLine(it, line);
    });
    if (!inBucket && !inPending) return;
    if (isSelected(sel, it)) selected.push(it);
    else unselected.push(it);
  });
  return selected.length ? selected : unselected;
}
function isValidFieldKeyPair(fromKey, toKey) {
  if (!fromKey || !toKey || fromKey === toKey) return false;
  if (MED_FIELD_KEYS.indexOf(
    /** @type {typeof MED_FIELD_KEYS[number]} */
    fromKey
  ) < 0) return false;
  if (MED_FIELD_KEYS.indexOf(
    /** @type {typeof MED_FIELD_KEYS[number]} */
    toKey
  ) < 0) return false;
  return true;
}
function recetaItemsForPatient(medRecetaByPatient, patientId) {
  var block = patientId && medRecetaByPatient ? medRecetaByPatient[patientId] : null;
  return block && Array.isArray(block.items) ? block.items : [];
}
function resolveSelectionBucket(medNotaSelectionByPatient, patientId) {
  if (!medNotaSelectionByPatient[patientId] || typeof medNotaSelectionByPatient[patientId] !== "object") {
    medNotaSelectionByPatient[patientId] = {};
  }
  return medNotaSelectionByPatient[patientId];
}
function reclassifyEaMedProposal(ctx) {
  var fromKey = String(ctx.fromKey || "").trim();
  var toKey = String(ctx.toKey || "").trim();
  if (!isValidFieldKeyPair(fromKey, toKey)) return false;
  var patientId = ctx.patientId;
  if (!patientId || !ctx.medNotaSelectionByPatient) return false;
  var items = recetaItemsForPatient(ctx.medRecetaByPatient, patientId);
  var sel = resolveSelectionBucket(ctx.medNotaSelectionByPatient, patientId);
  var classifyFn = classifyMedicationSoapCategory;
  var lines = pendingLines(ctx.monitoreo, fromKey);
  var targets = collectItemsToReclassify(items, sel, fromKey, classifyFn, lines);
  if (!targets.length) return false;
  targets.forEach(function(it) {
    applySoapCategoryOverride(it, toKey, classifyFn);
    markSelected(sel, it);
  });
  clearRecetaProposalDismissedKey(ctx.monitoreo, fromKey);
  clearRecetaProposalDismissedKey(ctx.monitoreo, toKey);
  syncRecetaProposalsFromSoapSelection(
    patientId,
    ctx.monitoreo,
    ctx.medRecetaByPatient,
    ctx.medNotaSelectionByPatient,
    classifyFn
  );
  return true;
}

// public/js/features/ea-indicaciones-clipboard.mjs
function pickConfirmedEstadoClinico(monitoreo) {
  if (!monitoreo || typeof monitoreo !== "object") return {};
  var ec = monitoreo.estadoClinico && typeof monitoreo.estadoClinico === "object" ? Object.assign(
    {},
    /** @type {Record<string, unknown>} */
    monitoreo.estadoClinico
  ) : {};
  var pend = monitoreo.pendienteReceta && typeof monitoreo.pendienteReceta === "object" ? (
    /** @type {Record<string, unknown>} */
    monitoreo.pendienteReceta
  ) : {};
  var conf = monitoreo.confirmado && typeof monitoreo.confirmado === "object" ? (
    /** @type {Record<string, unknown>} */
    monitoreo.confirmado
  ) : {};
  MED_FIELD_KEYS.forEach(function(key) {
    if (conf[key]) return;
    var pending = pend[key];
    if (pending == null || !String(pending).trim()) return;
    if (String(ec[key] || "").trim() === String(pending).trim()) {
      delete ec[key];
    }
  });
  if (hasActiveDietProposal(pend) && !conf.dieta) {
    delete ec.dieta;
    delete ec.kcal;
    delete ec.kcalKg;
    delete ec.proteinG;
  }
  return ec;
}
function buildEaIndicacionesClipboardLines(ec, bombaAlgoritmo) {
  var e = ec && typeof ec === "object" ? ec : {};
  var analgesiaSplit = partitionAnalgesiaForSoap(e.analgesia);
  var nmPartition = partitionNmMedsForSoap(e.nm);
  var hasDieta = e.dieta != null && String(e.dieta).trim() !== "";
  var dietaClause = hasDieta ? formatNmDietClause(e, e.kcal != null ? String(e.kcal) : "", { includeProtein: true }) : "";
  var nmOther = medsListForSoap(nmPartition.other, " || ");
  var nmInsulin = medsListForSoap(nmPartition.insulin, ", ");
  var bombaLabel = formatInsulinPumpAlgoritmoLabel(bombaAlgoritmo);
  var nmParts = [];
  if (dietaClause) nmParts.push(dietaClause);
  if (nmOther) nmParts.push(nmOther);
  if (nmPartition.rescatesDisponibles) nmParts.push("RESCATES DE INSULINA DISPONIBLES");
  if (bombaLabel) nmParts.push(bombaLabel);
  if (nmInsulin) nmParts.push("INSULINA: " + nmInsulin);
  var lines = [
    soapMedCategorySegment("ANALGESIA", medsClauseOrEmpty(analgesiaSplit.analgesia)),
    soapMedCategorySegment("ANALGESIA / ANTIPIRETICOS", medsClauseOrEmpty(analgesiaSplit.antipireticos)),
    soapMedCategorySegment(
      "ANTIEMETICOS",
      medsClauseOrEmpty(e.antiemeticos || analgesiaSplit.antiemeticos)
    ),
    soapMedCategorySegment("SEDACION", medsClauseOrEmpty(e.sedacion)),
    soapMedCategorySegment("ANTIEPILEPTICOS", medsClauseOrEmpty(e.antiepilepticos)),
    soapMedCategorySegment("ANTIPARKINSONIANOS", medsClauseOrEmpty(e.antiparkinsonianos)),
    soapMedCategorySegment("ANTIDOTOS", medsClauseOrEmpty(e.antidotos)),
    soapMedCategorySegment("VIA AEREA", medsClauseOrEmpty(e.viaAerea)),
    soapMedCategorySegment("VASOPRESORES", medsClauseOrEmpty(e.vasop), { always: true }),
    soapMedCategorySegment("ANTIHIPERTENSIVOS", medsClauseOrEmpty(e.antihta), { always: true }),
    soapMedCategorySegment("TROMBOPROFILAXIS", medsClauseOrEmpty(e.antitromboticos), {
      always: true
    }),
    soapMedCategorySegment("ANTICOAGULACION", medsClauseOrEmpty(e.anticoagulacion)),
    soapMedCategorySegment("ANTIARRITMICOS", medsClauseOrEmpty(e.antiarritmicos)),
    soapMedCategorySegment("DIURETICOS", medsClauseOrEmpty(e.diureticos)),
    soapMedCategorySegment("ESTATINAS", medsClauseOrEmpty(e.estatinas)),
    soapMedCategorySegment("ANTIBIOTICOTERAPIA", medsClauseOrEmpty(e.abx), { always: true }),
    soapMedCategorySegment("TRANSFUSIONES", medsClauseOrEmpty(e.transfusiones)),
    nmParts.length ? "NM: " + nmParts.join(" || ") : ""
  ].filter(Boolean);
  return lines;
}
function pruneEmptyIndicacionesLines(lines) {
  return (lines || []).filter(function(line) {
    var s = String(line || "");
    var colon = s.indexOf(":");
    if (colon === -1) return !!s.trim();
    return !!s.slice(colon + 1).trim();
  });
}
function buildEaIndicacionesClipboardText(monitoreo, opts) {
  var ec = pickConfirmedEstadoClinico(monitoreo);
  var fecha = resolveEaAbxFechaActualizacion(
    opts && opts.activeId,
    opts && opts.medRecetaByPatient,
    monitoreo
  );
  if (fecha && ec.abx && String(ec.abx).trim()) {
    ec = Object.assign({}, ec, {
      abx: advanceAbxMedTextForManejoDate(String(ec.abx), fecha, opts && opts.refDate)
    });
  }
  var bomba = insulinPumpAlgorithmFromMonitoreo(monitoreo);
  return pruneEmptyIndicacionesLines(buildEaIndicacionesClipboardLines(ec, bomba)).join("\n");
}
function hasEaIndicacionesClipboardContent(monitoreo, opts) {
  var text = buildEaIndicacionesClipboardText(monitoreo, opts);
  if (!text.trim()) return false;
  var fallback = SOAP_EMPTY_MED_FALLBACK.toLowerCase();
  return text.split("\n").some(function(line) {
    var colon = line.indexOf(":");
    if (colon === -1) return !!line.trim();
    var val = line.slice(colon + 1).trim().toLowerCase();
    return !!val && val !== fallback;
  });
}

// public/js/features/note-from-estado-actual.mjs
var VITAL_NOTE_KEYS = ["ta", "fr", "fc", "temp", "peso"];
function fmtVital(value) {
  if (value == null || value === "") return "";
  var n = Number(value);
  if (Number.isFinite(n)) {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  }
  return String(value).trim();
}
function extractVitalsFromPatient(patient) {
  var empty = { ta: "", fr: "", fc: "", temp: "", peso: "" };
  if (!patient || typeof patient !== "object") return empty;
  var mon = patient.monitoreo;
  var snap = mon ? deriveSnapshot(mon) : { vitals: {} };
  var v = snap && snap.vitals && typeof snap.vitals === "object" ? snap.vitals : {};
  var ta = "";
  if (v.tas != null && v.tad != null) ta = fmtVital(v.tas) + "/" + fmtVital(v.tad);
  else if (v.tas != null) ta = fmtVital(v.tas);
  var peso = "";
  if (patient.peso != null && String(patient.peso).trim()) peso = fmtVital(patient.peso);
  return {
    ta,
    fr: fmtVital(v.fr),
    fc: fmtVital(v.fc),
    temp: fmtVital(v.temp),
    peso
  };
}
function buildNotePatchFromEstadoActual(patient, options) {
  var vitals = extractVitalsFromPatient(patient);
  if (!patient || typeof patient !== "object") {
    return { evolucion: "", vitals };
  }
  var getText = options && typeof options.getEstadoActualText === "function" ? options.getEstadoActualText : null;
  var evolucion = "";
  if (getText) {
    evolucion = String(getText(patient) || "").trim();
  } else if (patient.monitoreo) {
    var mon = (
      /** @type {any} */
      patient.monitoreo
    );
    var ec = mon.estadoClinico && typeof mon.estadoClinico === "object" ? mon.estadoClinico : {};
    evolucion = String(
      buildEstadoActualText(ec, deriveSnapshot(mon), {}, { patientPeso: patient.peso }) || ""
    ).trim();
  }
  return { evolucion, vitals };
}
function noteEvolucionHasContent(note) {
  return !!(note && String(note.evolucion || "").trim());
}
function applyEvolucionToNote(note, evol, replace) {
  if (!evol) return false;
  var cur = String(note.evolucion || "").trim();
  if (!replace && cur) return false;
  if (String(note.evolucion || "") === evol) return false;
  note.evolucion = evol;
  return true;
}
function applyEmptyVitalsToNote(note, vitals) {
  if (!vitals || typeof vitals !== "object") return false;
  var changed = false;
  for (var i = 0; i < VITAL_NOTE_KEYS.length; i++) {
    var key = VITAL_NOTE_KEYS[i];
    var next = String(vitals[key] || "").trim();
    if (!next || String(note[key] || "").trim()) continue;
    note[key] = next;
    changed = true;
  }
  return changed;
}
function applyEstadoActualToNote(note, patch, options) {
  if (!note || !patch) return false;
  var evolChanged = applyEvolucionToNote(
    note,
    String(patch.evolucion || "").trim(),
    !!(options && options.replaceEvolucion)
  );
  var vitalsChanged = applyEmptyVitalsToNote(note, patch.vitals);
  return evolChanged || vitalsChanged;
}

// public/js/features/estado-actual-send-note.mjs
function resolveEaNoteSend(patient, note, options) {
  options = options || {};
  var patch = buildNotePatchFromEstadoActual(patient, {
    getEstadoActualText: options.getEstadoActualText
  });
  if (!String(patch.evolucion || "").trim()) {
    return { status: "empty" };
  }
  if (!options.replaceEvolucion && noteEvolucionHasContent(note)) {
    return { status: "confirm" };
  }
  var changed = applyEstadoActualToNote(note, patch, {
    replaceEvolucion: !!options.replaceEvolucion
  });
  return { status: "applied", changed };
}

// public/js/ui-recommendation.mjs
function buildConfidenceMeterHtml(signal, toneCssVar) {
  var s = Math.max(0, Math.min(3, Number(signal) || 0));
  var tone = toneCssVar || "var(--color-accent)";
  var bars = "";
  for (var i = 0; i < 3; i += 1) {
    bars += '<span class="ui-rec-meter-bar" style="background:' + (i < s ? tone : "var(--color-border-strong, var(--color-border))") + '"></span>';
  }
  return '<span class="ui-rec-meter" aria-hidden="true">' + bars + "</span>";
}
function buildRecAltRowHtml_(a) {
  return '<button type="button" class="ui-rec-alt" data-rec-alt="' + escHtml(a.key) + '">' + buildConfidenceMeterHtml(a.signal != null ? a.signal : 1, a.tone || "var(--color-ink-muted)") + '<span class="ui-rec-alt-short">' + escHtml(a.short) + '</span><span class="ui-rec-alt-label">' + escHtml(a.label || "") + "</span></button>";
}
function buildRecDrawerHtml_(open, alts) {
  var altRows = alts.map(buildRecAltRowHtml_).join("");
  return '<div class="ui-rec-drawer" style="grid-template-rows:' + (open ? "1fr" : "0fr") + ";opacity:" + (open ? "1" : "0") + '"><div class="ui-rec-drawer-inner"><p class="ui-rec-drawer-lead">Otras opciones</p>' + altRows + "</div></div>";
}
function buildRecFooterHtml_(opts, signal, tone, open, accepted) {
  return '<div class="ui-rec-footer"><span class="ui-rec-confidence">' + buildConfidenceMeterHtml(signal, tone) + '<span class="ui-rec-confidence-label">' + escHtml(opts.confidenceLabel || "") + '</span></span><span class="ui-rec-actions"><button type="button" class="ui-rec-alts-btn" data-rec-alts aria-expanded="' + (open ? "true" : "false") + '">' + escHtml(opts.alternativesLabel || "Alternativas") + '</button><button type="button" class="ui-rec-primary' + (accepted ? " is-accepted" : "") + '" data-rec-accept>' + escHtml(accepted ? opts.acceptedLabel || "Aceptado" : opts.primaryLabel || "Aceptar") + "</button></span></div>";
}
function buildRecommendationCardHtml(opts) {
  opts = opts || {};
  var signal = opts.signal != null ? opts.signal : 2;
  var tone = opts.tone || "var(--color-accent)";
  var alts = opts.alternatives || [];
  var open = !!opts.alternativesOpen;
  var accepted = !!opts.accepted;
  return '<div class="ui-rec-card"><div class="ui-rec-pad"><p class="ui-rec-title">' + escHtml(opts.title || "") + '</p><div class="ui-rec-body">' + (opts.bodyHtml || "") + "</div></div>" + buildRecDrawerHtml_(open, alts) + buildRecFooterHtml_(opts, signal, tone, open, accepted) + "</div>";
}

// public/js/features/estado-actual-panel-actions.mjs
function parseFormMedicion() {
  var form = document.getElementById("ea-form");
  if (!form) return null;
  var recordedLocal = (
    /** @type {HTMLInputElement | null} */
    document.getElementById("ea-recorded-at")
  );
  var recordedAt = datetimeLocalToIso(recordedLocal ? recordedLocal.value : "");
  var defaultTime = isoToHHmm(recordedAt);
  var vitalBlock = parseVitalsFromForm(form, defaultTime);
  var bombaToggle = (
    /** @type {HTMLInputElement | null} */
    document.getElementById("ea-bomba-enabled")
  );
  var bombaOn = !!(bombaToggle && bombaToggle.checked);
  var glucometrias = bombaOn ? [] : parseGlucometriasFromForm(form, defaultTime);
  var bombaInsulina = bombaOn ? parseBombaFromForm(form, defaultTime) : [];
  var ingEl = document.getElementById("ea-io-ing");
  var egrEl = document.getElementById("ea-io-egr");
  var evacEl = document.getElementById("ea-io-evac");
  var egrParts = parseIoEgresoLine(egrEl && "value" in egrEl ? String(egrEl.value) : "");
  return {
    id: Date.now().toString() + "-ea",
    recordedAt,
    // Real save-time clock for cloud LWW — recordedAt is user-editable clinical
    // time and can tie across rapid entries; see patient-merge.mjs.
    savedAt: (/* @__PURE__ */ new Date()).toISOString(),
    vitals: vitalBlock.vitals,
    vitalSeries: vitalBlock.vitalSeries,
    alteredAt: vitalBlock.alteredAt,
    glucometrias,
    bombaInsulina,
    io: {
      ing: parseIoIngresoField(ingEl && "value" in ingEl ? ingEl.value : ""),
      egr: diuresisValueFromParts(egrParts),
      egrParts,
      evac: parseIoEvacField(evacEl && "value" in evacEl ? evacEl.value : "")
    }
  };
}
function registrarEstadoActualMedicion() {
  var capturedId = getEaFormOpenPatientId();
  var patient = capturedId != null ? findPatientById(capturedId) : findActivePatient();
  if (!patient) {
    getEaPanelRuntime().showToast("Selecciona un paciente primero", "error");
    return;
  }
  ensureMonitoreo(patient);
  var medicion = parseFormMedicion();
  if (!medicion) {
    getEaPanelRuntime().showToast("Formulario no disponible", "error");
    return;
  }
  var vitalLimit = validateVitalSeriesTurnLimits(patient.monitoreo.historial, medicion.vitalSeries || {});
  if (!vitalLimit.ok) {
    getEaPanelRuntime().showToast(
      "M\xE1ximo " + MAX_VITAL_READINGS_PER_DAY + " lecturas de " + vitalLimit.label + " en el turno",
      "error"
    );
    return;
  }
  var result = appendMedicion(patient.monitoreo, medicion);
  if (!result.ok) {
    getEaPanelRuntime().showToast("No se pudo registrar la medici\xF3n", "error");
    return;
  }
  syncDietKcalFromWeight(
    patient.monitoreo.estadoClinico,
    resolveDietWeightKg({
      patientPeso: patient.peso,
      pesoRef: patient.monitoreo.estadoClinico && patient.monitoreo.estadoClinico.pesoRef
    })
  );
  persistClinicalState();
  scheduleCloudSyncPush();
  resetEaRegistroForm(null);
  if (getEaPanelRuntime().invalidateInnerTabRenderCache) getEaPanelRuntime().invalidateInnerTabRenderCache("estadoActual");
  if (typeof window.closeEstadoActualRegistroModal === "function") window.closeEstadoActualRegistroModal();
  eaPanelBridge.renderEstadoActualPanel({ syncHeavy: true, dataOnly: true });
  getEaPanelRuntime().showToast("Medici\xF3n registrada \u2713", "success");
  if (typeof getEaPanelRuntime().onMedicionRegistered === "function") getEaPanelRuntime().onMedicionRegistered();
}
function ensureEaRegistroModalForm() {
  var body = document.getElementById("ea-registro-modal-body");
  if (!body) return;
  if (!body.querySelector("#ea-form") || !body.querySelector(".ea-registro-shell") || !body.querySelector('[data-ea-vital-stack="tas"]') || !body.querySelector("#ea-add-glu.ea-glu-add-inline")) {
    body.innerHTML = buildRegistroFormMarkup();
  }
  var patient = findActivePatient();
  setEaFormOpenPatientId(patient ? patient.id : null);
  wireEaRegistroForm(patient && patient.monitoreo ? patient.monitoreo : null);
}
function eliminarEstadoActualMedicion(id) {
  var patient = findActivePatient();
  if (!patient || !id) return;
  ensureMonitoreo(patient);
  removeMedicion(patient.monitoreo, id);
  persistClinicalState();
  scheduleCloudSyncPush();
  eaPanelBridge.renderEstadoActualPanel({ syncHeavy: true });
  getEaPanelRuntime().showToast("Medici\xF3n eliminada", "success");
}
function persistEstadoActualTexto(patient, text) {
  if (!patient || !patient.monitoreo) return;
  patient.monitoreo.textoGuardado = {
    text,
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  persistClinicalState();
  scheduleCloudSyncPush();
  renderEstadoActualBar();
  var meta = document.getElementById("ea-meta-guardado");
  if (meta && patient.monitoreo.textoGuardado.savedAt) {
    meta.textContent = formatEaSavedLabel(patient.monitoreo.textoGuardado.savedAt);
  }
}
function estadoActualGuardar() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  flushEaEstadoClinicoFieldsFromDom(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    getEaPanelRuntime().showToast("No hay texto para guardar", "error");
    return;
  }
  persistEstadoActualTexto(patient, text);
  getEaPanelRuntime().showToast("Estado Actual guardado \u2713", "success");
}
async function estadoActualGuardarCopiar() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  flushEaEstadoClinicoFieldsFromDom(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    getEaPanelRuntime().showToast("No hay texto para guardar", "error");
    return;
  }
  persistEstadoActualTexto(patient, text);
  var ok = await getEaPanelRuntime().copyToClipboardSafe(text);
  getEaPanelRuntime().showToast(
    ok ? "Estado Actual guardado y copiado \u2713" : "Guardado, pero no se pudo copiar",
    ok ? "success" : "error"
  );
}
function navigateToNotasAfterEaSend() {
  var runtime = getEaPanelRuntime();
  if (typeof runtime.switchInnerTab === "function") {
    runtime.switchInnerTab("notas");
    return;
  }
  if (typeof runtime.switchConsolidatedTab === "function") {
    runtime.switchConsolidatedTab("clinico");
  }
}
function showEaReplaceEvolucionConfirm(onReplace) {
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "ea-note-confirm-backdrop";
  var altsOpen = false;
  function paint() {
    var card = buildRecommendationCardHtml({
      title: "\xBFReemplazar evoluci\xF3n?",
      bodyHtml: "<p>La evoluci\xF3n ya tiene contenido. \xBFReemplazarlo con el estado actual?</p>",
      signal: 2,
      tone: "var(--color-accent)",
      confidenceLabel: "Revisi\xF3n humana",
      primaryLabel: "Reemplazar",
      alternativesLabel: "Alternativas",
      alternativesOpen: altsOpen,
      alternatives: [
        { key: "keep", short: "Conservar la evoluci\xF3n actual", label: "Sin cambios", signal: 1 }
      ]
    });
    backdrop.innerHTML = wrapApprovalInConflictModal(card);
    var dismiss = function() {
      backdrop.remove();
    };
    var accept = backdrop.querySelector("[data-rec-accept]");
    var altsBtn = backdrop.querySelector("[data-rec-alts]");
    if (accept) {
      accept.addEventListener("click", function() {
        backdrop.remove();
        onReplace();
      });
    }
    if (altsBtn) {
      altsBtn.addEventListener("click", function() {
        altsOpen = !altsOpen;
        paint();
      });
    }
    var keep = backdrop.querySelector('[data-rec-alt="keep"]');
    if (keep) keep.addEventListener("click", dismiss);
    backdrop.addEventListener("click", function(ev) {
      if (ev.target === backdrop) dismiss();
    });
  }
  paint();
  document.body.appendChild(backdrop);
}
function commitEstadoActualToNote(patient, replaceEvolucion) {
  var activeId = getEaPanelRuntime().getActiveId();
  if (!activeId) return;
  ensureMonitoreo(patient);
  flushEaEstadoClinicoFieldsFromDom(patient);
  if (!getNotes()[activeId]) getNotes()[activeId] = {};
  var note = getNotes()[activeId];
  var result = resolveEaNoteSend(patient, note, {
    replaceEvolucion,
    getEstadoActualText: getEstadoActualTextForPatient
  });
  if (result.status === "empty") {
    getEaPanelRuntime().showToast("No hay texto para enviar a la nota", "error");
    return;
  }
  if (result.status === "confirm") {
    showEaReplaceEvolucionConfirm(function() {
      commitEstadoActualToNote(patient, true);
    });
    return;
  }
  persistClinicalState();
  scheduleCloudSyncPush();
  navigateToNotasAfterEaSend();
  if (typeof getEaPanelRuntime().renderNoteForm === "function") {
    getEaPanelRuntime().renderNoteForm();
  }
  getEaPanelRuntime().showToast("Estado actual enviado a la nota \u2713", "success");
}
function estadoActualEnviarANota() {
  if (isModeSala(getEaPanelRuntime().getSettings())) return;
  var patient = findActivePatient();
  if (!patient) {
    getEaPanelRuntime().showToast("Selecciona un paciente primero", "error");
    return;
  }
  commitEstadoActualToNote(patient, false);
}
var eaCopyFabBound = false;
function eaCopyFabContextActive() {
  var runtime = getEaPanelRuntime();
  if (typeof runtime.getActiveAppTab === "function" && runtime.getActiveAppTab() !== "nota") return false;
  if (typeof runtime.getActiveInner !== "function" || typeof runtime.getSettings !== "function") return true;
  var inner = migrateGranularInner(runtime.getActiveInner() || "todo", runtime.getSettings());
  return inner === "estadoActual";
}
function hideLabCopyFabDom() {
  var fab = document.getElementById("lab-copy-fab");
  if (!fab) return;
  fab.setAttribute("hidden", "");
  fab.style.display = "none";
  fab.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("lab-copy-fab-active");
}
function ensureEaCopyFabController() {
  var fab = document.getElementById("ea-copy-fab");
  if (!fab || eaCopyFabBound) return;
  eaCopyFabBound = true;
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
    void copiarEstadoActualTexto();
  });
}
function syncEaCopyFab(show) {
  ensureEaCopyFabController();
  var visible = !!show && eaCopyFabContextActive();
  if (visible) hideLabCopyFabDom();
  var fab = document.getElementById("ea-copy-fab");
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
  document.documentElement.classList.toggle("ea-copy-fab-active", visible);
}
function refreshEaCopyFabVisibility() {
  syncEaCopyFab(!!findActivePatient());
}
async function copiarEstadoActualTexto() {
  var patient = findActivePatient();
  if (!patient) {
    getEaPanelRuntime().showToast("Selecciona un paciente primero", "error");
    return;
  }
  ensureMonitoreo(patient);
  var text = getEstadoActualTextForPatient(patient);
  if (!text.trim()) {
    getEaPanelRuntime().showToast("No hay texto para copiar", "error");
    return;
  }
  var ok = await getEaPanelRuntime().copyToClipboardSafe(text);
  getEaPanelRuntime().showToast(ok ? "Texto copiado al portapapeles \u2713" : "No se pudo copiar", ok ? "success" : "error");
}
async function copiarEaIndicacionesClipboard() {
  var patient = findActivePatient();
  if (!patient) {
    getEaPanelRuntime().showToast("Selecciona un paciente primero", "error");
    return;
  }
  ensureMonitoreo(patient);
  flushEaEstadoClinicoFieldsFromDom(patient);
  if (!hasEaIndicacionesClipboardContent(patient.monitoreo, {
    activeId: patient.id,
    medRecetaByPatient: getMedRecetaByPatient()
  })) {
    getEaPanelRuntime().showToast("No hay indicaciones confirmadas para copiar", "error");
    return;
  }
  var text = buildEaIndicacionesClipboardText(patient.monitoreo, {
    activeId: patient.id,
    medRecetaByPatient: getMedRecetaByPatient()
  });
  var ok = await getEaPanelRuntime().copyToClipboardSafe(text);
  getEaPanelRuntime().showToast(
    ok ? "Indicaciones copiadas al portapapeles \u2713" : "No se pudo copiar",
    ok ? "success" : "error"
  );
}
function confirmEaMedField(key) {
  var patient = findActivePatient();
  if (!patient || !key) return;
  ensureMonitoreo(patient);
  confirmMedField(patient.monitoreo, key, {
    patientId: patient.id,
    medRecetaByPatient: getMedRecetaByPatient()
  });
  persistEstadoClinicoAndRefresh(patient.monitoreo, "Propuesta confirmada", patient);
}
function discardEaMedProposal(key) {
  var patient = findActivePatient();
  if (!patient || !key) return;
  ensureMonitoreo(patient);
  discardMedProposal(patient.monitoreo, key);
  persistEstadoClinicoAndRefresh(patient.monitoreo, "Propuesta descartada", patient);
}
function confirmEaDietProposal() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  var activeId = getEaPanelRuntime().getActiveId();
  var recetaBlock = activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null;
  backfillDietPendingMacrosFromReceta(patient.monitoreo, recetaBlock);
  confirmDietProposal(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, "Dieta confirmada", patient);
}
function discardEaDietProposal() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  discardDietProposal(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, "Propuesta de dieta descartada", patient);
}
function selectEaDietOption(index) {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  if (!selectDietOption(patient.monitoreo, index)) return;
  persistEstadoClinicoAndRefresh(patient.monitoreo, null, patient);
}
function confirmAllEaMedProposals() {
  var patient = findActivePatient();
  if (!patient) return;
  ensureMonitoreo(patient);
  confirmAllMedProposals(patient.monitoreo);
  persistEstadoClinicoAndRefresh(patient.monitoreo, "Propuestas confirmadas", patient);
}
function toggleEaEstadoClinico() {
  var details = document.querySelector(".ea-estado-clinico");
  if (details && "open" in details) details.open = !details.open;
}
function eaMedReclassifyPanelEl(key) {
  if (!key || typeof document === "undefined") return null;
  var escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(String(key)) : String(key);
  return document.querySelector('[data-ea-med-reclassify-panel="' + escaped + '"]');
}
function eaMedReclassifySelectEl(key) {
  if (!key || typeof document === "undefined") return null;
  var escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(String(key)) : String(key);
  return document.querySelector('[data-ea-med-reclassify-select="' + escaped + '"]');
}
function toggleEaMedReclassifyPanel(key) {
  var panel = eaMedReclassifyPanelEl(key);
  if (!panel) return;
  panel.hidden = !panel.hidden;
}
function applyEaMedReclassification(fromKey) {
  var patient = findActivePatient();
  if (!patient || !fromKey) return;
  var select = eaMedReclassifySelectEl(fromKey);
  var toKey = select && "value" in select ? String(select.value).trim() : "";
  if (!toKey) {
    getEaPanelRuntime().showToast("Selecciona una categor\xEDa destino", "warn");
    return;
  }
  ensureMonitoreo(patient);
  var activeId = getEaPanelRuntime().getActiveId() || patient.id || null;
  var ok = reclassifyEaMedProposal({
    patientId: activeId,
    fromKey,
    toKey,
    monitoreo: patient.monitoreo,
    medRecetaByPatient: getMedRecetaByPatient(),
    medNotaSelectionByPatient: getMedNotaSelectionByPatient()
  });
  if (!ok) {
    getEaPanelRuntime().showToast("No se pudo reclasificar la propuesta", "error");
    return;
  }
  persistClinicalState();
  scheduleCloudSyncPush();
  bustMedPanelCache();
  renderMedRecetaPanel();
  var label = EA_MED_FIELD_LABELS[toKey] || toKey;
  persistEstadoClinicoAndRefresh(patient.monitoreo, "Categor\xEDa reclasificada: " + label, patient);
}
var windowHandlers3 = {
  registrarEstadoActualMedicion,
  eliminarEstadoActualMedicion,
  estadoActualGuardar,
  estadoActualGuardarCopiar,
  estadoActualEnviarANota,
  copiarEstadoActualTexto,
  copiarEaIndicacionesClipboard,
  confirmEaMedField,
  discardEaMedProposal,
  toggleEaMedReclassifyPanel,
  applyEaMedReclassification,
  confirmEaDietProposal,
  discardEaDietProposal,
  selectEaDietOption,
  confirmAllEaMedProposals,
  toggleEaEstadoClinico,
  applyEstadoActualParsedToForm
};

// public/js/features/estado-actual-panel-snapshot.mjs
function renderSnapshotSection(snapshot, balTurno, balGlobal) {
  return '<section class="ea-section ea-card ea-snapshot-strip ea-snapshot-strip--primary" id="ea-snapshot"><div class="ea-snapshot-strip-body"><div class="ea-snapshot-zone ea-snapshot-zone--vitals"><h4 class="ea-snapshot-zone-title">Signos vitales</h4><div class="ea-snapshot-vitals">' + renderSnapshotVitalsHtml(snapshot) + '</div></div><div class="ea-snapshot-zone"><h4 class="ea-snapshot-zone-title">' + renderSnapshotGluZoneTitle(snapshot) + '</h4><div class="ea-snapshot-glu">' + renderSnapshotGluHtml(snapshot) + '</div></div><div class="ea-snapshot-zone"><h4 class="ea-snapshot-zone-title">Balance h\xEDdrico</h4>' + renderSnapshotIoHtml(snapshot, balGlobal) + "</div></div></section>";
}
function renderHistorialSection(historial) {
  var sorted = historial.slice().sort(function(a, b) {
    return String(b.recordedAt || "").localeCompare(String(a.recordedAt || ""));
  });
  var recent = sorted.slice(0, 8);
  if (!recent.length) {
    return '<details class="ea-section ea-card ea-historial" id="ea-historial"><summary class="ea-historial-summary">Historial reciente</summary><p class="ea-muted ea-historial-empty">Sin mediciones registradas.</p></details>';
  }
  var rows = recent.map(function(row) {
    var when = formatHistorialWhen(row.recordedAt);
    var parts = buildHistorialRowParts(row);
    var summary = parts.length ? parts.join(" \xB7 ") : "Registro vac\xEDo";
    return '<li class="ea-historial-row"><div class="ea-historial-main"><span class="ea-historial-when">' + when + '</span><span class="ea-historial-summary">' + summary + `</span></div><button type="button" class="ea-btn ea-btn--ghost ea-btn--danger" onclick="eliminarEstadoActualMedicion('` + String(row.id || "").replace(/'/g, "\\'") + `')">Eliminar</button></li>`;
  }).join("");
  return '<details class="ea-section ea-card ea-historial" id="ea-historial"><summary class="ea-historial-summary">Historial reciente<span class="ea-historial-count">' + recent.length + '</span></summary><ul class="ea-historial-list">' + rows + "</ul></details>";
}

// public/js/features/estado-actual-panel-action-bar.mjs
function buildEaActionBarButtons(settings) {
  var html = '<button type="button" class="ea-btn" onclick="openEstadoActualRegistroModal()">Registro manual</button>';
  if (!isModeSala(settings)) {
    html += '<button type="button" class="ea-btn ea-btn--success" onclick="estadoActualEnviarANota()">Enviar a nota</button>';
  }
  return html;
}

// public/js/features/estado-actual-panel-render-paths.mjs
function buildEaShellKey(activeId, monitoreo) {
  return String(activeId || "") + "|" + buildEaMonitoreoRevision(monitoreo, activeId, getMedRecetaByPatient());
}
function buildEaDataKey(monitoreo, activeId) {
  return buildEaMonitoreoRevision(monitoreo, activeId, getMedRecetaByPatient());
}
function renderEaEmptyPanel(mount, onReady) {
  syncEaCopyFab(false);
  invalidateEaPanelCache();
  mount.innerHTML = '<div class="estado-actual-panel ea-empty"><div class="empty-state empty-state--compact" role="status"><h3 class="empty-state-title">Selecciona un paciente para monitoreo</h3><p class="empty-state-lead">Elige uno en el censo de la izquierda. Ah\xED podr\xE1s registrar signos, balance h\xEDdrico y dieta.</p></div></div>';
  if (onReady) onReady();
}
function syncEaRecetaProposals(patient, activeId, monitoreo) {
  var changed = false;
  if (applyDietProposalFromRecetaBlock(
    monitoreo,
    activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null
  )) {
    changed = true;
  }
  if (syncRecetaProposalsFromSoapSelection(
    activeId,
    monitoreo,
    getMedRecetaByPatient(),
    getMedNotaSelectionByPatient(),
    classifyMedicationSoapCategory
  )) {
    changed = true;
  }
  if (syncMonitoreoInsulinPumpFromReceta(
    monitoreo,
    activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null
  )) {
    changed = true;
  }
  if (changed) persistClinicalState();
}
function patchEaPanelDynamicSections(mount, patient, monitoreo, patchOpts) {
  patchOpts = patchOpts || {};
  var snapshot = deriveSnapshot(monitoreo);
  var balTurno = balanceTurno(monitoreo);
  var balGlobal = balanceGlobalHistorico(monitoreo);
  var savedLabel = formatEaSavedLabel(monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt);
  if (patchOpts.refreshClinico) {
    var clinicoDet = mount.querySelector(".ea-estado-clinico");
    if (clinicoDet) {
      clinicoDet.outerHTML = renderEstadoClinicoSection(monitoreo, getEaPanelRuntime().getActiveId(), patient);
      wireEstadoClinicoInteractions(mount, patient);
    }
  }
  var snapEl = mount.querySelector("#ea-snapshot");
  if (snapEl) snapEl.outerHTML = renderSnapshotSection(snapshot, balTurno, balGlobal);
  var histEl = mount.querySelector("#ea-historial");
  if (histEl) {
    var histWasOpen = histEl.open;
    histEl.outerHTML = renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []);
    if (histWasOpen) {
      var newHist = mount.querySelector("#ea-historial");
      if (newHist) newHist.open = true;
    }
  }
  var meta = mount.querySelector("#ea-meta-guardado");
  if (meta) meta.textContent = savedLabel;
  if (!patchOpts.skipChartsSummary) {
    var chartsSummary = mount.querySelector("#ea-charts-summary");
    if (chartsSummary) {
      var chartsRev = buildEaHistorialChartsRevision(monitoreo);
      if (mount._eaChartsSummaryRev !== chartsRev) {
        mount._eaChartsSummaryRev = chartsRev;
        chartsSummary.outerHTML = renderEaChartsSummarySection(monitoreo);
      }
    }
  }
}
function renderEaFullPanelShell(mount, patient, monitoreo, activeId, savedLabel) {
  var eaUiState = captureEaPanelUiState(mount);
  var snapshot = deriveSnapshot(monitoreo);
  var balTurno = balanceTurno(monitoreo);
  var balGlobal = balanceGlobalHistorico(monitoreo);
  mount.innerHTML = '<div class="estado-actual-panel"><div class="ea-action-bar"><div class="ea-action-bar__cluster" role="group" aria-label="Acciones de monitoreo">' + buildEaActionBarButtons(getEaPanelRuntime().getSettings()) + '</div><span id="ea-meta-guardado" class="ea-meta-guardado">' + savedLabel + "</span></div>" + renderSnapshotSection(snapshot, balTurno, balGlobal) + renderEstadoClinicoSection(monitoreo, activeId, patient) + renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []) + renderEaChartsSummarySection(monitoreo) + "</div>";
  restoreEaPanelUiState(mount, eaUiState);
  wireEstadoClinicoInteractions(mount, patient);
}

// public/js/features/estado-actual-panel-render-decisions.mjs
function shouldSkipEaPanelRender(mount, shellKey, dataKey, opts) {
  opts = opts || {};
  return !!(mount.querySelector(".estado-actual-panel") && _eaPanelCache.shellKey === shellKey && _eaPanelCache.dataKey === dataKey && !opts.force);
}
function tryPatchEaPanel(mount, patient, monitoreo, shellKey, dataKey, opts, onReady) {
  opts = opts || {};
  if (!mount.querySelector(".estado-actual-panel") || _eaPanelCache.shellKey !== shellKey || !(opts.dataOnly || _eaPanelCache.dataKey !== dataKey)) {
    return false;
  }
  if (_eaPanelCache.dataKey === dataKey && !opts.dataOnly) {
    syncEaCopyFab(true);
    if (onReady) onReady();
    return true;
  }
  patchEaPanelDynamicSections(mount, patient, monitoreo, {
    refreshClinico: !!opts.refreshClinico,
    skipChartsSummary: !!opts.skipChartsSummary
  });
  _eaPanelCache.dataKey = dataKey;
  syncEaCopyFab(true);
  if (onReady) onReady();
  return true;
}

// public/js/features/estado-actual-panel-render.mjs
function renderEstadoActualPanel(opts) {
  opts = opts || {};
  var onReady = typeof opts.onReady === "function" ? opts.onReady : null;
  var mount = document.getElementById("exp-pane-estado-actual");
  if (!mount) {
    if (onReady) onReady();
    return;
  }
  var patient = findActivePatient();
  if (!patient) {
    renderEaEmptyPanel(mount, onReady);
    return;
  }
  migratePatientMonitoreo(patient);
  ensureMonitoreo(patient);
  var monitoreo = patient.monitoreo;
  var activeId = getEaPanelRuntime().getActiveId();
  syncEaRecetaProposals(patient, activeId, monitoreo);
  var savedLabel = formatEaSavedLabel(monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt);
  var shellKey = buildEaShellKey(activeId, monitoreo);
  var dataKey = buildEaDataKey(monitoreo, activeId);
  if (tryPatchEaPanel(mount, patient, monitoreo, shellKey, dataKey, opts, onReady)) return;
  if (shouldSkipEaPanelRender(mount, shellKey, dataKey, opts)) {
    syncEaCopyFab(true);
    if (onReady) onReady();
    return;
  }
  renderEaFullPanelShell(mount, patient, monitoreo, activeId, savedLabel);
  _eaPanelCache.shellKey = shellKey;
  _eaPanelCache.dataKey = dataKey;
  syncEaCopyFab(true);
  if (onReady) onReady();
}
function navigateToEstadoActualPanel() {
  if (typeof getEaPanelRuntime().switchInnerTab === "function") {
    getEaPanelRuntime().switchInnerTab("estadoActual");
    return;
  }
  getEaPanelRuntime().switchConsolidatedTab("clinico");
}

// public/js/features/estado-actual-panel.mjs
eaPanelBridge.renderEstadoActualPanel = renderEstadoActualPanel;
eaPanelBridge.registrarEstadoActualMedicion = registrarEstadoActualMedicion;
try {
  if (typeof window !== "undefined") window.eaPanelBridge = eaPanelBridge;
} catch (_eaBridge) {
  void _eaBridge;
}
if (typeof document !== "undefined" && !document._rpcInternoVitalsEaWired) {
  document._rpcInternoVitalsEaWired = true;
  document.addEventListener("rpc-interno-vitals-synced", function(ev) {
    var pid = String(ev.detail?.patientId || "").trim();
    var activeId = getEaPanelRuntime().getActiveId();
    if (!pid || !activeId || String(activeId) !== pid) return;
    invalidateEaPanelCache();
    renderEstadoActualPanel({ force: true, syncHeavy: true });
  });
}

// public/js/features/medications-actions.mjs
function switchInnerTab(tab, opts) {
  var fn = resolveGlobalFn("switchInnerTab");
  if (fn) fn(tab, opts);
}
function invalidateInnerTabRenderCache(tab) {
  var fn = resolveGlobalFn("invalidateInnerTabRenderCache");
  if (fn) fn(tab);
}
function toggleMedRecetaSuspendido(itemId, suspended) {
  var activeId = rt4.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  var it = getMedRecetaByPatient()[activeId].items.find(function(x) {
    return String(x.id) === String(itemId);
  });
  if (!it) return;
  it.suspendido = !!suspended;
  persistClinicalState();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}
function toggleMedRecetaParaNota(itemId, selected) {
  var activeId = rt4.getActiveId();
  if (!activeId) return;
  var sid = String(itemId || "");
  var m = getMedNotaSelMap(activeId);
  if (selected) m[sid] = true;
  else delete m[sid];
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(sid)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}
function toggleInsulinRescateGroupSelection(activeId, selected) {
  var block = getMedRecetaByPatient()[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var m = getMedNotaSelMap(activeId);
  insulinRescateItemsFromList(items).forEach(function(it) {
    var id = String(it.id || "");
    if (!id) return;
    if (selected) m[id] = true;
    else delete m[id];
  });
}
function toggleInsulinPrandialGroupSelection(activeId, selected) {
  var block = getMedRecetaByPatient()[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var m = getMedNotaSelMap(activeId);
  insulinPrandialItemsFromList(items).forEach(function(it) {
    var id = String(it.id || "");
    if (!id) return;
    if (selected) m[id] = true;
    else delete m[id];
  });
}
function toggleMedRecetaInsulinRescateParaNota(selected) {
  var activeId = rt4.getActiveId();
  if (!activeId) return;
  toggleInsulinRescateGroupSelection(activeId, selected);
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(INSULIN_RESCATE_GROUP_ID)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}
function toggleMedRecetaInsulinRescateSuspendido(suspended) {
  var activeId = rt4.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  insulinRescateItemsFromList(getMedRecetaByPatient()[activeId].items).forEach(function(it) {
    it.suspendido = !!suspended;
  });
  persistClinicalState();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}
function toggleMedRecetaInsulinPrandialParaNota(selected) {
  var activeId = rt4.getActiveId();
  if (!activeId) return;
  toggleInsulinPrandialGroupSelection(activeId, selected);
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(INSULIN_PRANDIAL_GROUP_ID)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}
function toggleMedRecetaInsulinPrandialSuspendido(suspended) {
  var activeId = rt4.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  insulinPrandialItemsFromList(getMedRecetaByPatient()[activeId].items).forEach(function(it) {
    it.suspendido = !!suspended;
  });
  persistClinicalState();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}
function setMedRecetaSoapCategory(itemId, category) {
  var activeId = rt4.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId] || !getMedRecetaByPatient()[activeId].items) return;
  var it = getMedRecetaByPatient()[activeId].items.find(function(x) {
    return String(x.id) === String(itemId);
  });
  if (!it) return;
  var cat = String(category || "").trim();
  var autoCat = classifyMedicationSoapCategory(it.nombreRaw, it.dosisRaw);
  if (!cat || SOAP_DESTINATION_KEYS.indexOf(cat) < 0 || cat === autoCat) delete it.soapCatOverride;
  else it.soapCatOverride = cat;
  persistClinicalState();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(itemId)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}
function hasMedRecetaContent(block) {
  return block && (block.items && block.items.length || block.dietas && block.dietas.length || String(block.pasteRaw || "").trim());
}
function discardMedMonitoreoProposals(patient) {
  if (!patient) return;
  ensureMonitoreo(patient);
  discardDietProposal(patient.monitoreo);
  MED_FIELD_KEYS.forEach(function(k) {
    discardMedProposal(patient.monitoreo, k);
  });
}
function refreshEaAfterMedClear() {
  if (typeof rt4.getActiveAppTab !== "function" || rt4.getActiveAppTab() !== "nota") return;
  var inner = typeof rt4.getActiveInner === "function" ? rt4.getActiveInner() : "";
  if (inner === "estadoActual") {
    renderEstadoActualPanel({ force: true, refreshClinico: true });
  }
}
function limpiarManejoActual() {
  var activeId = rt4.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  if (!hasMedRecetaContent(block)) {
    medToast("No hay manejo importado", "error");
    return;
  }
  delete getMedRecetaByPatient()[activeId];
  getMedNotaSelectionByPatient()[activeId] = {};
  var ta = document.getElementById("med-input");
  if (ta) ta.value = "";
  discardMedMonitoreoProposals(
    getPatients().find(function(p) {
      return String(p.id) === String(activeId);
    })
  );
  persistClinicalState();
  bustMedPanelCache();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
  refreshEaAfterMedClear();
  medToast("Manejo actual limpiado", "success");
}
function mediAnadirATratamiento() {
  var activeId = rt4.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  if (!block || !block.items || !block.items.length) {
    medToast("No hay medicamentos en la receta", "error");
    return;
  }
  var sel = getMedNotaSelMap(activeId);
  var lines = block.items.filter(function(it) {
    return sel[it.id] && !it.suspendido && !skipRecetaItemForInsulinPumpCarrier(it, block.items);
  }).map(function(it) {
    var recBlock = getMedRecetaByPatient()[activeId];
    return formatMedicationEgresoLine(it, manejoDiaOpts(recBlock && recBlock.fechaActualizacion));
  });
  if (!lines.length) {
    medToast("Marca \xABSOAP\xBB en al menos un medicamento activo", "error");
    return;
  }
  if (!getNotes()[activeId]) getNotes()[activeId] = {};
  var tx = getNotes()[activeId].tratamiento;
  if (!Array.isArray(tx) || !tx.length) tx = [""];
  var firstEmpty = tx.length === 1 && !(tx[0] || "").trim();
  if (firstEmpty) {
    getNotes()[activeId].tratamiento = lines.slice();
  } else {
    lines.forEach(function(L) {
      tx.push(L);
    });
    getNotes()[activeId].tratamiento = tx;
  }
  persistClinicalState();
  switchInnerTab("notas");
  showNotaEvolucionClassicView();
  medToast(lines.length + " l\xEDnea(s) a\xF1adidas a Tratamiento", "success");
}
function mediLlevarASOAPToEstadoActual(activeId, buckets) {
  var patient = getPatients().find(function(p) {
    return p.id === activeId;
  });
  if (!patient) {
    medToast("Paciente no encontrado", "error");
    return;
  }
  ensureMonitoreo(patient);
  MED_FIELD_KEYS.forEach(function(k) {
    if (buckets[k] && String(buckets[k]).trim()) {
      clearRecetaProposalDismissedKey(patient.monitoreo, k);
    }
  });
  applyRecetaProposal(patient.monitoreo, buckets);
  persistClinicalState();
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  if (typeof rt4.navigateToEstadoActualPanel === "function") {
    rt4.navigateToEstadoActualPanel();
  }
  renderEstadoActualPanel({ force: true, refreshClinico: true, syncHeavy: true });
  medToast("Propuesta en Estado Actual \u2014 confirma en Estado cl\xEDnico general", "success");
  renderMedRecetaPanel();
}
function mediLlevarASOAPToTemplate(buckets) {
  MED_FIELD_KEYS.forEach(function(cat) {
    var parts = String(buckets[cat] || "").split(" | ").filter(Boolean);
    var fieldId = soapLegacyFieldIdForCategory(cat === "diureticos" ? "diuretico" : cat);
    if (!fieldId) return;
    parts.forEach(function(t) {
      mergeSoapMedField(fieldId, t);
    });
  });
  switchInnerTab("notas");
  showNotaEvolucionClassicView();
  openSOAPModalDirect();
  medToast("Campos SOAP actualizados \xB7 completa e Insertar en evoluci\xF3n", "success");
  renderMedRecetaPanel();
}
function mediLlevarASOAP() {
  var activeId = rt4.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  var sel = getMedNotaSelMap(activeId);
  var hasReceta = block && block.items && block.items.some(function(it) {
    return sel[it.id] && !it.suspendido;
  });
  if (!hasReceta) {
    medToast("Marca \xABSOAP\xBB en al menos un medicamento de la receta", "error");
    return;
  }
  var pendingOtros = unassignedOtrosSoapItems(block ? block.items : [], sel, classifyMedicationSoapCategory);
  if (pendingOtros.length) {
    medToast(
      "Elige destino para " + pendingOtros.length + " medicamento(s) \xABOtros\xBB antes de enviar a Estado Actual",
      "error"
    );
    return;
  }
  var buckets = bucketsFromRecetaItems(block ? block.items : [], sel, classifyMedicationSoapCategory);
  var hasBuckets = MED_FIELD_KEYS.some(function(k) {
    return buckets[k] && String(buckets[k]).trim();
  });
  if (!hasBuckets) {
    medToast("No qued\xF3 nada que volcar", "error");
    return;
  }
  if (isModeSala(rt4.getSettings())) {
    mediLlevarASOAPToEstadoActual(activeId, buckets);
    return;
  }
  mediLlevarASOAPToTemplate(buckets);
}
function toastParseRecetaFailure(raw, parsed) {
  if (parsed.items.length || parsed.dietas.length) return false;
  if (!looksLikeSomeIndicacionesPaste(raw || "")) {
    medToast(
      "No parece el bloque de SOME. Copia desde Fecha/hora con tabuladores (medicamentos, dietas\u2026) y p\xE9galo aqu\xED.",
      "error"
    );
  } else {
    medToast("No se encontraron filas MEDICAMENTOS ni DIETAS v\xE1lidas", "error");
  }
  return true;
}
function buildRecetaProcessToast(parsed) {
  var parts = [];
  if (parsed.items.length) parts.push(parsed.items.length + " medicamento(s)");
  if (parsed.dietas.length) parts.push(parsed.dietas.length + " dieta(s)");
  var msg = "Manejo actualizado (" + parts.join(" \xB7 ") + ")";
  if (parsed.skipped <= 0) return msg;
  var sum = parsed.skippedSummary || {};
  var omit = [];
  if (sum.cuidados) omit.push(sum.cuidados + " cuidados");
  if (sum.estudios) omit.push(sum.estudios + " estudios");
  if (sum.other) omit.push(sum.other + " otras");
  return msg + ". Omitidas " + parsed.skipped + " l\xEDneas" + (omit.length ? " (" + omit.join(", ") + ")" : "");
}
function applyDietFromParsedReceta(activeId) {
  var block = getMedRecetaByPatient()[activeId];
  if (!block || !block.dietas || !block.dietas.length) return;
  var patient = getPatients().find(function(p) {
    return String(p.id) === String(activeId);
  });
  if (!patient) return;
  ensureMonitoreo(patient);
  applyDietProposalFromRecetaBlock(patient.monitoreo, block, { force: true });
}
function syncEaMedsFromProcessedReceta(activeId) {
  var patient = getPatients().find(function(p) {
    return String(p.id) === String(activeId);
  });
  if (!patient) return;
  ensureMonitoreo(patient);
  clearRecetaProposalDismissed(patient.monitoreo);
  var block = getMedRecetaByPatient()[activeId];
  var items = block && Array.isArray(block.items) ? block.items : [];
  var fecha = block && block.fechaActualizacion ? String(block.fechaActualizacion).trim() : "";
  var monitoreo = patient.monitoreo;
  pruneEstadoClinicoMedsFromReceta(monitoreo, items, classifyMedicationSoapCategory, fecha);
  var sel = getMedNotaSelectionByPatient()[activeId] || {};
  var buckets = bucketsFromRecetaItems(items, sel, classifyMedicationSoapCategory);
  applyRecetaProposal(monitoreo, buckets);
  syncConfirmedAbxFromReceta(monitoreo, buckets);
  syncMonitoreoInsulinPumpFromReceta(monitoreo, block);
}
function commitProcessedReceta(activeId, raw, parsed) {
  var today = /* @__PURE__ */ new Date();
  var fallback = String(today.getDate()).padStart(2, "0") + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + today.getFullYear();
  var fecha = resolveFechaActualizacion(parsed.fechas, fallback);
  getMedRecetaByPatient()[activeId] = {
    fechaActualizacion: fecha,
    items: parsed.items,
    dietas: parsed.dietas,
    pasteRaw: raw
  };
  var sel = {};
  parsed.items.forEach(function(it) {
    if (shouldAutoSelectSoap(it)) sel[it.id] = true;
  });
  getMedNotaSelectionByPatient()[activeId] = sel;
  applyDietFromParsedReceta(activeId);
  syncEaMedsFromProcessedReceta(activeId);
  persistClinicalState();
  onRecetaMergedToProfile(activeId, getMedRecetaByPatient()[activeId]);
  invalidateEaPanelCache();
  invalidateInnerTabRenderCache("estadoActual");
  renderMedRecetaPanel();
}
function getMedRecetaPasteRaw() {
  var ta = document.querySelector("#med-receta-paste-modal #med-input") || document.getElementById("med-input");
  return ta ? String(ta.value || "") : "";
}
function procesarRecetaMed() {
  var activeId = rt4.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente primero", "error");
    return;
  }
  var raw = getMedRecetaPasteRaw();
  try {
    var parsed = parseIndicacionesPaste(raw || "");
    if (toastParseRecetaFailure(raw, parsed)) return;
    commitProcessedReceta(activeId, raw, parsed);
    medToast(buildRecetaProcessToast(parsed), "success");
    closeMedRecetaPasteModal();
  } catch (err) {
    console.error("[R+] procesarRecetaMed:", err);
    medToast(
      "No se pudo procesar la receta. Si persiste, reinicia la app (\u2318R) y vuelve a pegar desde SOME.",
      "error"
    );
  }
}
function procesarRecetaFromText(raw) {
  var activeId = rt4.getActiveId();
  if (!activeId) {
    medToast("Selecciona un paciente primero", "error");
    return false;
  }
  try {
    var parsed = parseIndicacionesPaste(raw || "");
    if (toastParseRecetaFailure(raw, parsed)) return false;
    commitProcessedReceta(activeId, raw, parsed);
    medToast(buildRecetaProcessToast(parsed), "success");
    return true;
  } catch (err) {
    console.error("[R+] procesarRecetaFromText:", err);
    medToast(
      "No se pudo procesar la receta. Si persiste, reinicia la app (\u2318R) y vuelve a pegar desde SOME.",
      "error"
    );
    return false;
  }
}
function limpiarRecetaInput() {
  var ta = document.getElementById("med-input");
  if (ta) ta.value = "";
}
function copiarMedicamentosAlPortapapeles() {
  var activeId = rt4.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId]) {
    medToast("No hay medicamentos procesados", "error");
    return;
  }
  var block = getMedRecetaByPatient()[activeId];
  var items = block.items || [];
  var diaOpts = manejoDiaOpts(block.fechaActualizacion);
  var text = buildMedRecetaCopyText(items, diaOpts);
  var simple = buildMedRecetaNameOnlyText(items, diaOpts);
  if (medOutputTab === "simple") {
    text = simple;
  }
  if (!text.trim()) {
    medToast("No hay medicamentos activos para copiar", "error");
    return;
  }
  navigator.clipboard.writeText(text).then(
    function() {
      medToast("Medicamentos copiados al portapapeles \u2713", "success");
    },
    function() {
      medToast("Error al copiar al portapapeles", "error");
    }
  );
}
function setMedOutputTab(tab) {
  if (tab !== "full" && tab !== "simple") return;
  setMedOutputTabState(tab);
  renderMedRecetaPanel();
}

// public/js/features/medications-egreso-modal.mjs
var MODAL_BACKDROP_ID = "med-egreso-modal-backdrop";
function closeMedEgresoModal() {
  var backdrop = document.getElementById(MODAL_BACKDROP_ID);
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}
function buildEgresoListHtml(lines) {
  if (!lines.length) {
    return '<p class="med-empty-hint" style="margin:0;">No hay medicamentos activos para mostrar.</p>';
  }
  return '<ol id="med-egreso-modal-list" style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px;">' + lines.map(function(line) {
    return "<li>" + esc(line) + "</li>";
  }).join("") + "</ol>";
}
function buildSummaryHtml(dietLine) {
  if (!dietLine) return "";
  return '<p id="med-egreso-modal-summary" style="margin:12px 0 0;">' + esc(dietLine) + "</p>";
}
function buildEgresoModalHtml(lines, dietLine, mode) {
  return '<div class="lab-conflict-modal" style="max-width:620px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;padding:0;gap:0;"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0;"><span style="font-size:14px;font-weight:700;color:var(--text);">Texto de egreso</span><div style="display:flex;align-items:center;gap:8px;"><span class="med-output-tabs" id="med-egreso-modal-tabs-track" role="tablist" aria-label="Vista de texto de medicamentos" data-active="' + (mode === "simple" ? "simple" : "full") + '"><span class="med-output-tab-pill" aria-hidden="true"></span><button id="med-egreso-modal-tab-full" type="button" role="tab" aria-selected="' + (mode === "full" ? "true" : "false") + '" class="med-output-tab' + (mode === "full" ? " active" : "") + `" onclick="setMedEgresoModalTab('full')">Completa</button><button id="med-egreso-modal-tab-simple" type="button" role="tab" aria-selected="` + (mode === "simple" ? "true" : "false") + '" class="med-output-tab' + (mode === "simple" ? " active" : "") + `" onclick="setMedEgresoModalTab('simple')">Nombre + D\xEDa</button></span><button type="button" class="btn-generate" style="padding:7px 14px;font-size:12.5px;min-height:0;" onclick="copiarMedEgresoModalTexto()">Copiar</button><button type="button" title="Cerrar" aria-label="Cerrar" style="width:30px;height:30px;border:none;background:transparent;color:var(--text-muted);border-radius:8px;font-size:18px;line-height:1;cursor:pointer;" onclick="closeMedEgresoModal()">\xD7</button></div></div><div style="flex:1;min-height:0;overflow-y:auto;padding:16px 18px 20px;font-family:var(--font-mono);font-size:12.5px;line-height:1.85;color:var(--text);">` + buildEgresoListHtml(lines) + buildSummaryHtml(dietLine) + "</div></div>";
}
function renderMedEgresoModalContent() {
  var backdrop = document.getElementById(MODAL_BACKDROP_ID);
  if (!backdrop) return;
  var activeId = rt4.getActiveId();
  var block = activeId ? getMedRecetaByPatient()[activeId] : null;
  var items = block && block.items ? block.items : [];
  var diaOpts = manejoDiaOpts(block && block.fechaActualizacion);
  var mode = medOutputTab === "simple" ? "simple" : "full";
  var lines = buildMedEgresoListLines(items, diaOpts, mode);
  var dietLine = buildMedEgresoDietSummaryLine(block);
  backdrop.innerHTML = buildEgresoModalHtml(lines, dietLine, mode);
}
function setMedEgresoModalTab(tab) {
  if (tab !== "full" && tab !== "simple") return;
  setMedOutputTabState(tab);
  renderMedEgresoModalContent();
}
function copiarMedEgresoModalTexto() {
  var activeId = rt4.getActiveId();
  var block = activeId ? getMedRecetaByPatient()[activeId] : null;
  if (!block || !block.items || !block.items.length) {
    medToast("No hay medicamentos procesados", "error");
    return;
  }
  var diaOpts = manejoDiaOpts(block.fechaActualizacion);
  var text = medOutputTab === "simple" ? buildMedRecetaNameOnlyText(block.items, diaOpts) : buildMedRecetaCopyText(block.items, diaOpts);
  if (!text.trim()) {
    medToast("No hay medicamentos activos para copiar", "error");
    return;
  }
  copyToClipboardSafe(text).then(function(ok) {
    medToast(ok ? "Medicamentos copiados al portapapeles \u2713" : "Error al copiar al portapapeles", ok ? "success" : "error");
  });
}
function openMedEgresoModal() {
  var activeId = rt4.getActiveId();
  if (!activeId || !getMedRecetaByPatient()[activeId]) {
    medToast("No hay medicamentos procesados", "error");
    return;
  }
  closeMedEgresoModal();
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = MODAL_BACKDROP_ID;
  document.body.appendChild(backdrop);
  renderMedEgresoModalContent();
  backdrop.addEventListener("click", function(e) {
    if (e.target === backdrop) closeMedEgresoModal();
  });
}

// public/js/features/medications.mjs
var medicationsWindowHandlers = {
  procesarRecetaMed,
  openMedRecetaPasteModal,
  closeMedRecetaPasteModal,
  limpiarRecetaInput,
  copiarMedicamentosAlPortapapeles,
  setMedOutputTab,
  toggleMedRecetaSuspendido,
  toggleMedRecetaParaNota,
  toggleMedRecetaInsulinRescateParaNota,
  toggleMedRecetaInsulinRescateSuspendido,
  toggleMedRecetaInsulinPrandialParaNota,
  toggleMedRecetaInsulinPrandialSuspendido,
  setMedRecetaSoapCategory,
  limpiarManejoActual,
  mediAnadirATratamiento,
  mediLlevarASOAP,
  openMedEgresoModal,
  closeMedEgresoModal,
  setMedEgresoModalTab,
  copiarMedEgresoModalTexto,
  ...medPharmProfileWindowHandlers
};

// public/js/vpo-lookups.mjs
var ASA_OPTIONS = [
  { key: "asa-i", labelEn: "Healthy / no systemic disease", asaClass: "I", guptaCoef: -5.17 },
  { key: "asa-ii", labelEn: "Mild controlled systemic disease", asaClass: "II", guptaCoef: -3.29 },
  { key: "asa-iii", labelEn: "Severe systemic disease", asaClass: "III", guptaCoef: -1.92 },
  { key: "asa-iv", labelEn: "Severe systemic disease, constant threat to life", asaClass: "IV", guptaCoef: -0.95 },
  { key: "asa-v", labelEn: "Moribund, not expected to survive without surgery", asaClass: "V", guptaCoef: 0 }
];
var PROCEDURES = [
  { id: "gupta-anorectal", labelEn: "Anorectal", guptaCoef: -0.16, ahaQuirurgico: "Bajo", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  { id: "gupta-aortic", labelEn: "Aortic", guptaCoef: 1.6, ahaQuirurgico: "Alto", rcriHighRisk: true, ariscatIncisionKey: "intrathoracic" },
  { id: "gupta-bariatric", labelEn: "Bariatric", guptaCoef: -0.25, ahaQuirurgico: "Intermedio", rcriHighRisk: true, ariscatIncisionKey: "upperAbdominal" },
  { id: "gupta-brain", labelEn: "Brain", guptaCoef: 1.4, ahaQuirurgico: "Alto", rcriHighRisk: true, ariscatIncisionKey: "intrathoracic" },
  { id: "gupta-breast", labelEn: "Breast", guptaCoef: -1.61, ahaQuirurgico: "Bajo", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  { id: "gupta-cardiac", labelEn: "Cardiac", guptaCoef: 1.01, ahaQuirurgico: "Alto", rcriHighRisk: true, ariscatIncisionKey: "intrathoracic" },
  { id: "gupta-ent", labelEn: "ENT (except thyroid/parathyroid)", guptaCoef: 0.71, ahaQuirurgico: "Intermedio", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  {
    id: "gupta-foregut-hpb",
    labelEn: "Foregut / hepato-pancreatobiliary (except isolated cholecystectomy)",
    guptaCoef: 1.39,
    ahaQuirurgico: "Alto",
    rcriHighRisk: true,
    ariscatIncisionKey: "upperAbdominal"
  },
  {
    id: "gupta-gallbladder-appendix",
    labelEn: "Gallbladder / appendix / adrenals / spleen",
    guptaCoef: 0.59,
    ahaQuirurgico: "Intermedio",
    rcriHighRisk: false,
    ariscatIncisionKey: "upperAbdominal"
  },
  { id: "gupta-hernia", labelEn: "Hernia", guptaCoef: 0, ahaQuirurgico: "Bajo", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  { id: "gupta-intestinal", labelEn: "Intestinal below duodenum", guptaCoef: 1.14, ahaQuirurgico: "Alto", rcriHighRisk: true, ariscatIncisionKey: "upperAbdominal" },
  { id: "gupta-neck-thyroid", labelEn: "Neck incl. thyroid/parathyroid", guptaCoef: 0.18, ahaQuirurgico: "Intermedio", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  { id: "gupta-ob-gyn", labelEn: "Obstetric / gynecologic", guptaCoef: 0.76, ahaQuirurgico: "Intermedio", rcriHighRisk: true, ariscatIncisionKey: "upperAbdominal" },
  { id: "gupta-orthopedic", labelEn: "Orthopedic", guptaCoef: 0.8, ahaQuirurgico: "Intermedio", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  { id: "gupta-abdomen-other", labelEn: "Abdomen - other", guptaCoef: 1.13, ahaQuirurgico: "Alto", rcriHighRisk: true, ariscatIncisionKey: "upperAbdominal" },
  { id: "gupta-peripheral-vascular", labelEn: "Peripheral vascular", guptaCoef: 0.86, ahaQuirurgico: "Alto", rcriHighRisk: true, ariscatIncisionKey: "peripheral" },
  { id: "gupta-skin", labelEn: "Skin", guptaCoef: 0.54, ahaQuirurgico: "Bajo", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  { id: "gupta-spine", labelEn: "Spine", guptaCoef: 0.21, ahaQuirurgico: "Intermedio", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  { id: "gupta-thoracic", labelEn: "Thoracic non-esophageal", guptaCoef: 0.4, ahaQuirurgico: "Alto", rcriHighRisk: true, ariscatIncisionKey: "intrathoracic" },
  { id: "gupta-vein", labelEn: "Vein", guptaCoef: -1.09, ahaQuirurgico: "Bajo", rcriHighRisk: false, ariscatIncisionKey: "peripheral" },
  { id: "gupta-urology", labelEn: "Urology", guptaCoef: -0.26, ahaQuirurgico: "Intermedio", rcriHighRisk: false, ariscatIncisionKey: "peripheral" }
];
function getProcedureById(id) {
  return PROCEDURES.find((p) => p.id === id) || null;
}
function getAsaByKey(key) {
  return ASA_OPTIONS.find((a) => a.key === key) || null;
}
function suggestAhaClinicoFromAsa(asaKey) {
  var a = getAsaByKey(asaKey);
  if (!a) return "";
  if (a.asaClass === "I" || a.asaClass === "II") return "Bajo";
  if (a.asaClass === "III") return "Intermedio";
  return "Alto";
}

// public/js/vpo-data.mjs
var DURACION_OPCIONES = [
  { key: "le2", label: "\u2264 2 horas", hours: 2 },
  { key: "2to3", label: "2\u20133 horas", hours: 2.5 },
  { key: "gt3", label: "> 3 horas", hours: 4 }
];
var DEFAULT_EKG_TEXT = "ELECTROCARDIOGRAMA DE 12 DERIVACIONES, RITMO SINUSAL, EJE EL\xC9CTRICO NORMAL (ENTRE 0 Y 90 GRADOS), FC ___ LPM, ONDA P PRESENTE Y DE MORFOLOG\xCDA NORMAL, INTERVALO PR CONSERVADO (120-200 MS), COMPLEJO QRS DE DURACI\xD3N NORMAL (<120 MS), SIN SUPRA O INFRA DESNIVELES DEL SEGMENTO ST, ONDAS T SIM\xC9TRICAS SIN INVERSIONES, INTERVALO QTC DENTRO DE PAR\xC1METROS NORMALES. SIN DATOS DE BLOQUEO, HIPERTROFIA, ISQUEMIA O NECROSIS.";
var DEFAULT_RX_TEXT = "RADIOGRAF\xCDA DE T\xD3RAX AP, SIN ROTACI\xD3N, ADECUADA PENETRACI\xD3N, TEJIDOS BLANDOS SIN ALTERACIONES, MARCO \xD3SEO \xCDNTEGRO, CAMPOS PULMONARES SIN REDISTRIBUCI\xD3N DE FLUJO, \xC1NGULOS CARDIOFR\xC9NICOS Y COSTODIAFRAGM\xC1TICOS LIBRES, \xCDNDICE CARDIOTOR\xC1CICO <50% SIN CARDIOMEGALIA, SILUETA MEDIASTINAL NORMAL, TR\xC1QUEA CENTRAL. SIN INFILTRADOS, DERRAME PLEURAL, CONSOLIDACIONES NI MASAS.";
function emptyVpoState() {
  return {
    edad: "",
    creatinina: "",
    hemoglobina: "",
    spo2: "",
    duracionCirugiaHoras: "",
    duracionCirugiaKey: "",
    asaKey: "",
    functionalKey: "independent",
    procedureId: "",
    ahaClinico: "",
    ahaQuirurgico: "",
    ekgText: DEFAULT_EKG_TEXT,
    rxText: DEFAULT_RX_TEXT,
    diagnosticosText: "",
    diagnosticosList: (
      /** @type {string[]} */
      []
    ),
    diagnosticosTouched: false,
    valoracionIntro: "SE REALIZA VALORACI\xD3N PREOPERATORIA. SE OTORGA RIESGO QUIR\xDARGICO:",
    scaleResults: {
      asa: "",
      rcri: "",
      gupta: "",
      ariscat: "",
      caprini: ""
    },
    farmacos: [],
    fcLpm: "",
    lastLabApplied: null,
    lastFcApplied: ""
  };
}
function ensureScaleResults(state2) {
  if (!state2) return;
  var defaults = emptyVpoState().scaleResults;
  if (!state2.scaleResults || typeof state2.scaleResults !== "object") {
    state2.scaleResults = Object.assign({}, defaults);
    return;
  }
  Object.keys(defaults).forEach(function(k) {
    if (state2.scaleResults[k] == null) state2.scaleResults[k] = "";
  });
}
function ensureVpoState(map, patientId) {
  if (!patientId) return emptyVpoState();
  if (!map[patientId]) map[patientId] = emptyVpoState();
  ensureDiagnosticosList(map[patientId]);
  ensureScaleResults(map[patientId]);
  return map[patientId];
}
function ensureDiagnosticosList(state2) {
  if (!state2) return;
  if (!Array.isArray(state2.diagnosticosList)) state2.diagnosticosList = [];
  if (!state2.diagnosticosList.length && state2.diagnosticosText) {
    state2.diagnosticosList = parseDiagnosticosText(state2.diagnosticosText);
  }
  if (!state2.diagnosticosList.length) state2.diagnosticosList = [""];
  state2.diagnosticosText = formatDiagnosticosCopy(
    state2.diagnosticosList.filter(function(d) {
      return String(d || "").trim();
    })
  );
}
function setDiagnosticosList(state2, list) {
  var cleaned = (list || []).map(function(d) {
    return String(d || "").trim().toUpperCase();
  }).filter(Boolean);
  state2.diagnosticosList = cleaned.length ? cleaned.concat([""]) : [""];
  state2.diagnosticosText = formatDiagnosticosCopy(cleaned);
  syncAhaFields(state2);
}
function syncAhaFields(state2) {
  if (state2.asaKey) {
    state2.ahaClinico = suggestAhaClinicoFromAsa(state2.asaKey);
  }
  var proc = getProcedureById(state2.procedureId);
  if (proc) state2.ahaQuirurgico = proc.ahaQuirurgico;
}
function duracionKeyToHours(key) {
  var o = DURACION_OPCIONES.find(function(d) {
    return d.key === key;
  });
  return o ? o.hours : null;
}
function duracionHoursToKey(hours) {
  var h = typeof hours === "number" ? hours : parseFloat(String(hours || "").replace(",", "."));
  if (!Number.isFinite(h)) return "";
  if (h <= 2) return "le2";
  if (h <= 3) return "2to3";
  return "gt3";
}
function ensureDuracionKey(state2) {
  if (state2.duracionCirugiaKey) {
    var h = duracionKeyToHours(state2.duracionCirugiaKey);
    if (h != null) state2.duracionCirugiaHoras = String(h);
    return;
  }
  if (state2.duracionCirugiaHoras) {
    state2.duracionCirugiaKey = duracionHoursToKey(state2.duracionCirugiaHoras);
  }
}
function getVitalsFromMonitoreo(monitoreoLike) {
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial.slice() : [];
  hist.sort(function(a, b) {
    var ra = a && typeof a === "object" && "recordedAt" in a ? String(
      /** @type {any} */
      a.recordedAt
    ) : "";
    var rb = b && typeof b === "object" && "recordedAt" in b ? String(
      /** @type {any} */
      b.recordedAt
    ) : "";
    return rb.localeCompare(ra);
  });
  function pick(key) {
    for (var i = 0; i < hist.length; i++) {
      var row = hist[i];
      if (!row || typeof row !== "object") continue;
      var rv = (
        /** @type {any} */
        row.vitals && typeof /** @type {any} */
        row.vitals === "object" ? (
          /** @type {any} */
          row.vitals
        ) : {}
      );
      var val = rv[key];
      if (val != null && val !== "") return String(val).trim();
    }
    return "";
  }
  return { fc: pick("fc"), sat: pick("sat") };
}
function applyVitalsFromMonitoreo(state2, patient) {
  if (!patient || !patient.monitoreo) return false;
  var v = getVitalsFromMonitoreo(patient.monitoreo);
  var ok = false;
  if (v.fc) {
    state2.fcLpm = v.fc;
    state2.lastFcApplied = v.fc;
    ok = true;
  }
  if (v.sat) {
    state2.spo2 = v.sat;
    ok = true;
  }
  return ok;
}
function mergeFarmacosFromMedReceta(state2, medItems) {
  if (!state2.farmacos) state2.farmacos = [];
  var existing = new Set(state2.farmacos.map((f) => f.sourceMedId).filter(Boolean));
  (medItems || []).forEach(function(it) {
    if (!it || it.suspendido) return;
    if (existing.has(it.id)) return;
    state2.farmacos.push({
      sourceMedId: it.id,
      nombreDisplay: it.nombreRaw || "",
      sugerencia: "",
      notaEditable: "",
      addedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    existing.add(it.id);
  });
}
function importDiagnosticosFromNota(state2, notaDx) {
  var lines = (notaDx || []).map(function(d) {
    return String(d || "").trim().toUpperCase();
  }).filter(Boolean);
  if (!lines.length) return false;
  setDiagnosticosList(state2, lines);
  state2.diagnosticosTouched = true;
  return true;
}
function importDiagnosticosFromPaste(state2, pasteText) {
  var parsed = parseDiagnosticosText(pasteText);
  if (!parsed.length) return false;
  setDiagnosticosList(state2, parsed);
  state2.diagnosticosTouched = true;
  return true;
}
function autofillVitalsFromMonitoreoIfEmpty(state2, patient) {
  if (!patient || !patient.monitoreo) return;
  var v = getVitalsFromMonitoreo(patient.monitoreo);
  if (!String(state2.spo2 || "").trim() && v.sat) state2.spo2 = v.sat;
  if (!String(state2.fcLpm || "").trim() && v.fc) {
    state2.fcLpm = v.fc;
    state2.lastFcApplied = v.fc;
  }
}

// public/js/vpo-text.mjs
var VPO_OFFICIAL_CALCULATOR_DISCLAIMER = "R+ no calcula puntajes ni porcentajes de riesgo preoperatorio. Usa calculadoras m\xE9dicas oficiales validadas (institucional o publicadas) para RCRI (Lee), Gupta MICA, ARISCAT, Caprini y clasificaci\xF3n ASA antes de documentar riesgo en la nota.";
var VPO_SUGGESTED_SCALES = [
  { key: "asa", label: "ASA", hint: "Clasificaci\xF3n del estado f\xEDsico (I\u2013V)." },
  { key: "rcri", label: "RCRI (\xEDndice de Lee)", hint: "Puntos y/o clase seg\xFAn calculadora validada." },
  { key: "gupta", label: "Gupta MICA", hint: "% riesgo de IAM perioperatorio (herramienta validada)." },
  { key: "ariscat", label: "ARISCAT", hint: "Puntos y categor\xEDa de riesgo pulmonar postoperatorio." },
  { key: "caprini", label: "Caprini", hint: "Puntos y categor\xEDa de riesgo tromboemb\xF3lico." }
];
function formatVpoScaleResultLines(state2) {
  var sr = state2 && state2.scaleResults || {};
  return VPO_SUGGESTED_SCALES.map(function(s) {
    var val = String(sr[s.key] || "").trim();
    if (!val) return s.label + ": \u2014";
    return s.label + ": " + val;
  });
}
function formatVpoDocumentationLines(state2) {
  return formatVpoScaleResultLines(state2);
}
function renderEkgWithFc(ekgText, fcLpm) {
  var t = String(ekgText || "");
  var fc = String(fcLpm || "").trim();
  if (!fc) return t;
  return t.replace(/FC\s*___\s*LPM/gi, "FC " + fc + " LPM");
}
function formatRiskLines(_scores, state2) {
  return formatVpoDocumentationLines(state2);
}
function buildVpoFullCopyText(parts) {
  var blocks = [];
  if (parts.ekgBlock) {
    blocks.push("ELECTROCARDIOGRAMA:");
    blocks.push("");
    blocks.push(parts.ekgBlock);
    blocks.push("");
  }
  if (parts.rxBlock) {
    blocks.push("RADIOGRAF\xCDA DE T\xD3RAX:");
    blocks.push("");
    blocks.push(parts.rxBlock);
    blocks.push("");
  }
  if (parts.diagnosticosBlock) {
    blocks.push("DIAGN\xD3STICOS:");
    blocks.push("");
    blocks.push(parts.diagnosticosBlock);
    blocks.push("");
  }
  if (parts.valoracionBlock) {
    blocks.push("VALORACI\xD3N PREOPERATORIA:");
    blocks.push("");
    blocks.push(parts.valoracionBlock);
  }
  return blocks.join("\n").trim();
}
function buildFarmacosCopyText(farmacos) {
  return (farmacos || []).map(function(f) {
    return "- " + (f.nombreDisplay || "") + ": " + (f.notaEditable || f.sugerencia || "");
  }).join("\n");
}

// public/js/features/vpo-panel-helpers.mjs
function hydrateVpoPatientDefaults(state2, patient) {
  if (!state2.edad && patient && patient.edad) {
    var m = String(patient.edad).match(/(\d+)/);
    if (m) state2.edad = m[1];
  }
  ensureDuracionKey(state2);
  ensureDiagnosticosList(state2);
  if (patient && !state2.diagnosticosTouched) {
    var vpoDxEmpty = !(state2.diagnosticosList || []).some(function(d) {
      return String(d).trim();
    });
    if (vpoDxEmpty) {
      ensurePatientDiagnosticos(patient);
      var fromPat = (patient.diagnosticosList || []).filter(function(d) {
        return String(d).trim();
      });
      if (fromPat.length) setDiagnosticosList(state2, fromPat.concat([""]));
    }
  }
  autofillVitalsFromMonitoreoIfEmpty(state2, patient || null);
}
function buildVpoPanelInnerHtml(state2, esc2, vpoSection2, renderRiskScalesOnlyBody2, renderDiagnosticosSection2, renderFarmacosList2) {
  var riesgoBody = renderRiskScalesOnlyBody2(state2);
  var ekgBody = '<div class="vpo-grid" style="margin-bottom:10px;"><div class="field-group"><label>FC (lpm) para plantilla EKG</label><input class="ea-input" data-vpo-field="fcLpm" type="text" value="' + esc2(state2.fcLpm) + '"></div></div><div class="vpo-toolbar" style="margin-bottom:10px;"><button type="button" class="btn-med-secondary" data-vpo-action="tomar-estado">Tomar FC de Estado actual</button></div><label class="ea-label">EKG</label><textarea class="ea-input" data-vpo-field="ekgText" rows="5">' + esc2(state2.ekgText) + '</textarea><label class="ea-label" style="margin-top:10px;display:block;">Rx t\xF3rax</label><textarea class="ea-input" data-vpo-field="rxText" rows="5">' + esc2(state2.rxText) + "</textarea>";
  return '<div class="vpo-panel vpo-form rpc-form-stack">' + vpoSection2("Riesgo preoperatorio", "amber", true, riesgoBody) + vpoSection2("EKG y Rx t\xF3rax", "indigo", false, ekgBody) + vpoSection2("Diagn\xF3sticos", "rose", true, renderDiagnosticosSection2(state2)) + vpoSection2(
    "F\xE1rmacos perioperatorios",
    "teal",
    false,
    '<p class="overview-hint">Fuente: receta SOME en Medicamentos.</p><div class="vpo-toolbar"><button type="button" class="btn-med-secondary" data-vpo-action="tomar-meds">Tomar de Medicamentos (SOME)</button> <button type="button" class="btn-med-secondary" data-vpo-action="ir-med">Ir a Medicamentos</button></div><div class="vpo-farm-list">' + renderFarmacosList2(state2.farmacos) + "</div>"
  ) + '<div class="vpo-actions"><button type="button" class="manejo-copy-btn primary" data-vpo-action="copy-full">Copiar valoraci\xF3n completa</button><button type="button" class="manejo-copy-btn" data-vpo-action="copy-ekg">Copiar EKG</button><button type="button" class="manejo-copy-btn" data-vpo-action="copy-rx">Copiar Rx</button><button type="button" class="manejo-copy-btn" data-vpo-action="copy-risk">Copiar riesgos</button><button type="button" class="manejo-copy-btn" data-vpo-action="copy-farm">Copiar f\xE1rmacos</button></div></div>';
}
function handleVpoDxDelegationAction(mount, action, state2, deps) {
  if (action === "dx-split-plus") {
    var ta = mount.querySelector("[data-vpo-dx-paste]");
    if (!importDiagnosticosFromPaste(state2, ta ? ta.value : "")) {
      deps.showToast("Pega diagn\xF3sticos separados por +", "error");
      return;
    }
    if (ta) ta.value = "";
    deps.scheduleSave();
    deps.refreshDxListDom(mount, state2);
    deps.showToast("Diagn\xF3sticos separados", "success");
    return;
  }
  if (action === "dx-add-row") {
    if (!state2.diagnosticosList) state2.diagnosticosList = [""];
    if (state2.diagnosticosList[state2.diagnosticosList.length - 1]) {
      state2.diagnosticosList.push("");
    }
    deps.commitDxList(mount, state2);
    var lastInput = mount.querySelector(
      '[data-vpo-dx-idx="' + (state2.diagnosticosList.length - 1) + '"]'
    );
    if (lastInput) lastInput.focus();
  }
}
function handleVpoDxRemoveRow(mount, removeBtn, state2, deps) {
  var idx = parseInt(removeBtn.getAttribute("data-vpo-dx-remove"), 10);
  if (!state2.diagnosticosList || state2.diagnosticosList.length <= 1) return;
  state2.diagnosticosList.splice(idx, 1);
  if (!state2.diagnosticosList.length) state2.diagnosticosList = [""];
  deps.commitDxList(mount, state2);
}

// public/js/features/vpo-panel.mjs
var rt5 = {
  getActiveId() {
    return null;
  },
  showToast() {
  },
  switchAppTab() {
  }
};
var _saveTimer = null;
function registerVpoPanelRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt5, ctx);
}
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
    _saveTimer = null;
    persistClinicalState();
  }, 400);
}
function copyText(label, text) {
  var t = String(text || "").trim();
  if (!t) {
    rt5.showToast("Nada que copiar en " + label, "error");
    return;
  }
  copyToClipboardSafe(t).then(function(ok) {
    rt5.showToast(ok ? label + " copiado" : "No se pudo copiar", ok ? "success" : "error");
  });
}
function renderRiskScalesOnlyBody(state2) {
  ensureScaleResults(state2);
  var sr = state2.scaleResults;
  return '<p class="overview-hint">' + esc(VPO_OFFICIAL_CALCULATOR_DISCLAIMER) + '</p><div class="field-group" style="margin-top:10px;"><label class="ea-label">Introducci\xF3n (texto previo a escalas)</label><textarea class="ea-input" data-vpo-field="valoracionIntro" rows="2">' + esc(state2.valoracionIntro) + '</textarea></div><p class="ea-label vpo-scales-grid-title">Resultado por escala (calculadora externa)</p><div class="vpo-scales-results">' + VPO_SUGGESTED_SCALES.map(function(s) {
    return '<label class="vpo-scale-cell" title="' + esc(s.hint) + '"><span class="vpo-scale-label">' + esc(s.label) + '</span><input type="text" class="ea-input" data-vpo-scale="' + esc(s.key) + '" value="' + esc(sr[s.key]) + '" placeholder="Resultado\u2026" autocomplete="off"></label>';
  }).join("") + "</div>";
}
function vpoSection(title, tone, open, body) {
  return '<details class="vpo-section ea-card"' + (open ? " open" : "") + '><summary class="card-header card-header--tone-' + tone + '">' + esc(title) + '</summary><div class="vpo-section-body">' + body + "</div></details>";
}
function wireVpoCopyActions(mount, state2) {
  ["copy-ekg", "copy-rx", "copy-risk", "copy-farm", "copy-full"].forEach(function(action) {
    mount.querySelector('[data-vpo-action="' + action + '"]')?.addEventListener("click", function() {
      if (action === "copy-ekg") {
        copyText("EKG", "ELECTROCARDIOGRAMA:\n\n" + renderEkgWithFc(state2.ekgText, state2.fcLpm));
      } else if (action === "copy-rx") {
        copyText("Rx t\xF3rax", "RADIOGRAF\xCDA DE T\xD3RAX:\n\n" + state2.rxText);
      } else if (action === "copy-risk") {
        var lines = formatRiskLines(null, state2);
        copyText("Riesgos", state2.valoracionIntro + "\n" + lines.join("\n"));
      } else if (action === "copy-farm") {
        copyText("F\xE1rmacos", buildFarmacosCopyText(state2.farmacos));
      } else if (action === "copy-full") {
        var riskBlock = state2.valoracionIntro + "\n" + formatRiskLines(null, state2).join("\n");
        copyText(
          "Valoraci\xF3n completa",
          buildVpoFullCopyText({
            ekgBlock: renderEkgWithFc(state2.ekgText, state2.fcLpm),
            rxBlock: state2.rxText,
            diagnosticosBlock: state2.diagnosticosText,
            valoracionBlock: riskBlock
          })
        );
      }
    });
  });
}
function wireVpoImportActions(mount, state2, patientId) {
  mount.querySelector('[data-vpo-action="tomar-estado"]')?.addEventListener("click", function() {
    var patient = getPatients().find(function(p) {
      return p.id === patientId;
    });
    if (!applyVitalsFromMonitoreo(state2, patient || null)) {
      rt5.showToast("Sin FC o SpO\u2082 en Estado actual", "error");
      return;
    }
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt5.showToast("FC y SpO\u2082 tomados de Estado actual", "success");
  });
  mount.querySelector('[data-vpo-action="tomar-dx"]')?.addEventListener("click", function() {
    var note = getNotes()[patientId] || {};
    if (state2.diagnosticosTouched && (state2.diagnosticosList || []).some(function(d) {
      return String(d).trim();
    })) {
      rt5.showToast("Diagn\xF3sticos ya editados \u2014 no se sobrescriben", "error");
      return;
    }
    if (!importDiagnosticosFromNota(state2, note.diagnosticos || [])) {
      rt5.showToast("Sin diagn\xF3sticos en la nota", "error");
      return;
    }
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt5.showToast("Diagn\xF3sticos importados", "success");
  });
  mount.querySelector('[data-vpo-action="push-dx-datos"]')?.addEventListener("click", function() {
    var patient = getPatients().find(function(p) {
      return p.id === patientId;
    });
    if (!patient) return;
    var list = (state2.diagnosticosList || []).filter(function(d) {
      return String(d).trim();
    });
    if (!list.length) {
      rt5.showToast("Sin diagn\xF3sticos en VPO para enviar", "error");
      return;
    }
    pushDiagnosticosToPatient(patient, list);
    stampCensoFieldsClock(patient);
    persistClinicalState();
    rt5.showToast("Diagn\xF3sticos guardados en Datos del paciente", "success");
  });
  mount.querySelector('[data-vpo-action="tomar-meds"]')?.addEventListener("click", function() {
    var block = getMedRecetaByPatient()[patientId];
    if (!block || !block.items || !block.items.length) {
      rt5.showToast("Procesa la receta en Medicamentos primero", "error");
      return;
    }
    mergeFarmacosFromMedReceta(state2, block.items);
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt5.showToast("F\xE1rmacos actualizados desde SOME", "success");
  });
  mount.querySelector('[data-vpo-action="ir-med"]')?.addEventListener("click", function() {
    rt5.switchAppTab("med");
  });
}
function wireForm(mount, state2, patientId) {
  var form = mount.querySelector(".vpo-form");
  if (!form || form._vpoWired) return;
  form._vpoWired = true;
  form.addEventListener("input", function(ev) {
    var el = ev.target;
    if (!el) return;
    var scaleKey = el.getAttribute("data-vpo-scale");
    if (scaleKey) {
      ensureScaleResults(state2);
      state2.scaleResults[scaleKey] = el.value;
      scheduleSave();
      return;
    }
    if (!el.getAttribute("data-vpo-field")) return;
    var field = el.getAttribute("data-vpo-field");
    if (field.indexOf(".") >= 0) {
      var parts = field.split(".");
      if (!state2[parts[0]]) state2[parts[0]] = {};
      if (el.type === "checkbox") state2[parts[0]][parts[1]] = el.checked;
      else state2[parts[0]][parts[1]] = el.value;
    } else {
      state2[field] = el.type === "checkbox" ? el.checked : el.value;
    }
    scheduleSave();
  });
  wireVpoImportActions(mount, state2, patientId);
  wireVpoCopyActions(mount, state2);
}
function renderFarmacosList(farmacos) {
  if (!farmacos || !farmacos.length) {
    return '<p class="overview-hint">Sin f\xE1rmacos en VPO. Usa \xABTomar de Medicamentos (SOME)\xBB.</p>';
  }
  return farmacos.map(function(f, idx) {
    return '<div class="vpo-farm-row"><div class="vpo-farm-name">' + esc(f.nombreDisplay) + '</div><textarea class="vpo-farm-nota ea-input" data-vpo-farm-idx="' + idx + '" rows="2">' + esc(f.notaEditable || "") + "</textarea></div>";
  }).join("");
}
function syncDxTextOnly(state2) {
  if (!state2) return;
  var nonEmpty = (state2.diagnosticosList || []).filter(function(d) {
    return String(d || "").trim();
  });
  state2.diagnosticosText = formatDiagnosticosCopy(nonEmpty);
}
function commitDxList(mount, state2) {
  if (!state2) return;
  state2.diagnosticosTouched = true;
  setDiagnosticosList(state2, state2.diagnosticosList);
  scheduleSave();
  refreshDxListDom(mount, state2);
}
function dxRowsForRender(state2) {
  var list = (state2.diagnosticosList || []).slice();
  return list.length ? list : [""];
}
function renderDxListHtml(state2) {
  var rows = dxRowsForRender(state2);
  return rows.map(function(dx, i) {
    var canRemove = rows.length > 1;
    return '<div class="vpo-dx-row list-row"><input type="text" class="ea-input" data-vpo-dx-idx="' + i + '" value="' + esc(dx) + '" placeholder="Diagn\xF3stico ' + (i + 1) + '"><button type="button" class="btn-remove" data-vpo-dx-remove="' + i + '"' + (canRemove ? "" : ' style="visibility:hidden"') + ' aria-label="Eliminar">\xD7</button></div>';
  }).join("");
}
function refreshDxListDom(mount, state2) {
  var listEl = mount.querySelector(".vpo-dx-list");
  if (!listEl) return;
  listEl.innerHTML = renderDxListHtml(state2);
}
function renderDiagnosticosSection(state2) {
  return '<div class="vpo-toolbar"><button type="button" class="btn-med-secondary" data-vpo-action="tomar-dx">Tomar de la nota</button><button type="button" class="btn-med-secondary" data-vpo-action="push-dx-datos">Enviar a Datos del paciente</button><button type="button" class="btn-add-row" data-vpo-action="dx-add-row">+ Agregar diagn\xF3stico</button></div><div class="vpo-dx-list">' + renderDxListHtml(state2) + '</div><div class="vpo-dx-paste"><span class="ea-label">Pegar lista con \xAB + \xBB entre diagn\xF3sticos</span><textarea class="ea-input vpo-dx-paste-input" data-vpo-dx-paste placeholder="DX1 + DX2 + DX3\u2026"></textarea><button type="button" class="btn-med-secondary" data-vpo-action="dx-split-plus">Separar por +</button></div>';
}
function liveVpoState(mount) {
  var pid = mount._vpoPatientId;
  if (!pid) return null;
  return ensureVpoState(getVpoByPatient(), pid);
}
function ensureVpoMountDelegation(mount) {
  if (mount._vpoDelegationWired) return;
  mount._vpoDelegationWired = true;
  var dxDeps = {
    showToast: function(msg, type) {
      rt5.showToast(msg, type);
    },
    scheduleSave,
    refreshDxListDom,
    commitDxList
  };
  mount.addEventListener("click", function(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("[data-vpo-action]") : null;
    if (!btn || !mount.contains(btn)) return;
    var action = btn.getAttribute("data-vpo-action");
    var state2 = liveVpoState(mount);
    if (!state2) return;
    if (action === "dx-split-plus" || action === "dx-add-row") {
      ev.preventDefault();
      handleVpoDxDelegationAction(mount, action, state2, dxDeps);
      return;
    }
    var removeBtn = ev.target.closest ? ev.target.closest("[data-vpo-dx-remove]") : null;
    if (removeBtn && mount.contains(removeBtn)) {
      ev.preventDefault();
      handleVpoDxRemoveRow(mount, removeBtn, state2, dxDeps);
    }
  });
  mount.addEventListener("input", function(ev) {
    var el = ev.target;
    if (!el || el.getAttribute("data-vpo-dx-idx") == null || !mount.contains(el)) return;
    var state2 = liveVpoState(mount);
    if (!state2) return;
    var idx = parseInt(el.getAttribute("data-vpo-dx-idx"), 10);
    if (!state2.diagnosticosList) state2.diagnosticosList = [""];
    state2.diagnosticosList[idx] = el.value.toUpperCase();
    state2.diagnosticosTouched = true;
    syncDxTextOnly(state2);
    scheduleSave();
  });
  mount.addEventListener("keydown", function(ev) {
    var el = ev.target;
    if (!el || el.getAttribute("data-vpo-dx-idx") == null || !mount.contains(el)) return;
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    var state2 = liveVpoState(mount);
    if (!state2) return;
    var idx = parseInt(el.getAttribute("data-vpo-dx-idx"), 10);
    if (!state2.diagnosticosList) state2.diagnosticosList = [""];
    if (idx >= state2.diagnosticosList.length - 1) {
      state2.diagnosticosList.push("");
    }
    commitDxList(mount, state2);
    var next = mount.querySelector('[data-vpo-dx-idx="' + (idx + 1) + '"]');
    if (next) next.focus();
  });
}
function renderVpoPanel(mount, patientId) {
  if (!mount) return;
  if (!patientId) {
    mount.innerHTML = '<p class="overview-hint vpo-panel">Selecciona un paciente para valoraci\xF3n preoperatoria.</p>';
    return;
  }
  var state2 = ensureVpoState(getVpoByPatient(), patientId);
  var patient = getPatients().find(function(p) {
    return p.id === patientId;
  });
  hydrateVpoPatientDefaults(state2, patient || null);
  mount._vpoPatientId = patientId;
  mount.innerHTML = buildVpoPanelInnerHtml(
    state2,
    esc,
    vpoSection,
    renderRiskScalesOnlyBody,
    renderDiagnosticosSection,
    renderFarmacosList
  );
  mount.querySelectorAll(".vpo-farm-nota").forEach(function(ta) {
    ta.addEventListener("input", function() {
      var idx = parseInt(ta.getAttribute("data-vpo-farm-idx"), 10);
      if (state2.farmacos[idx]) {
        state2.farmacos[idx].notaEditable = ta.value;
        scheduleSave();
      }
    });
  });
  ensureVpoMountDelegation(mount);
  mount._vpoWired = false;
  var form = mount.querySelector(".vpo-form");
  if (form) form._vpoWired = false;
  wireForm(mount, state2, patientId);
}
function stashVpoForPatient(_patientId) {
  scheduleSave();
}

// public/js/features/vpo.mjs
var rt6 = {
  getActiveId() {
    return null;
  }
};
function registerVpoRuntime(ctx) {
  if (ctx && typeof ctx === "object") {
    Object.assign(rt6, ctx);
    registerVpoPanelRuntime(ctx);
  }
}
function renderVpo() {
  var mount = document.getElementById("vpo-container");
  if (!mount) return;
  renderVpoPanel(mount, rt6.getActiveId());
}

// public/js/features/sync-apply/patient-delete-batch.mjs
function snapForId(patientId, list) {
  var pid = String(patientId || "").trim();
  var found = (list || getPatients()).find(function(p) {
    return p && String(p.id) === pid;
  });
  return found || { id: pid, registro: "" };
}
function resolveDeps(partial) {
  var deps = partial || {};
  return {
    removeLocal: deps.removeLocal || removePatientLocally,
    rememberTombstone: deps.rememberTombstone || rememberPatientDeleteTombstone,
    enqueueCloudDelete: deps.enqueueCloudDelete || enqueueCloudPatientDelete,
    patientsList: deps.patientsList || getPatients()
  };
}
async function commitOnePatientDelete(patientId, opts) {
  opts = opts || {};
  var deps = resolveDeps(opts.deps || {});
  var pid = String(patientId || "").trim();
  if (!pid || pid.indexOf("demo-") === 0) {
    return { id: pid, status: "skippedDemo" };
  }
  var snap = snapForId(pid, deps.patientsList);
  var registro = String(snap.registro || "").trim();
  var cloudSnap = { id: pid, registro };
  deps.removeLocal(pid);
  deps.rememberTombstone(cloudSnap);
  deps.enqueueCloudDelete(cloudSnap);
  return { id: pid, status: "ok" };
}
async function commitPatientDeletes(ids, opts) {
  opts = opts || {};
  var results = [];
  var ok = 0;
  var skippedDemo = 0;
  var failed = 0;
  var seen = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < (ids || []).length; i += 1) {
    var pid = String(ids[i] || "").trim();
    if (!pid || seen[pid]) continue;
    seen[pid] = true;
    var row = await commitOnePatientDelete(pid, opts);
    results.push(row);
    if (row.status === "ok") ok += 1;
    else if (row.status === "skippedDemo") skippedDemo += 1;
    else failed += 1;
  }
  return { ok, skippedDemo, failed, results };
}
function formatPatientDeleteSummary(summary) {
  if (!summary) return "";
  var parts = [];
  if (summary.ok > 0) {
    parts.push(
      summary.ok === 1 ? "1 paciente eliminado" : summary.ok + " pacientes eliminados"
    );
  }
  if (summary.failed > 0) {
    parts.push(summary.failed === 1 ? "1 fallo al sync" : summary.failed + " fallos al sync");
  }
  return parts.join(" \xB7 ") || "Nada que eliminar";
}

// public/js/features/patients-bulk-bar.mjs
function syncPatientBulkBar() {
  var bar = document.getElementById("patient-bulk-bar");
  var countEl = document.getElementById("patient-bulk-bar-count");
  var toggleBtn = document.getElementById("btn-patient-bulk-select");
  var on = isPatientBulkSelectMode();
  var n = getPatientBulkSelectedCount();
  if (bar) bar.hidden = !on;
  if (countEl) {
    countEl.textContent = n === 1 ? "1 seleccionado" : n + " seleccionados";
  }
  if (toggleBtn) {
    var label = on ? "Terminar selecci\xF3n" : "Seleccionar varios pacientes";
    toggleBtn.setAttribute("aria-pressed", on ? "true" : "false");
    toggleBtn.setAttribute("aria-label", label);
    toggleBtn.setAttribute("title", label);
    toggleBtn.classList.toggle("btn-patient-bulk-select--on", on);
  }
  document.documentElement.classList.toggle("patient-bulk-select-mode", on);
}
function togglePatientBulkSelect() {
  togglePatientBulkSelectMode();
  patientsBridge.renderPatientList();
  syncPatientBulkBar();
}
function cancelPatientBulkSelect() {
  exitPatientBulkSelectMode();
  patientsBridge.renderPatientList();
  syncPatientBulkBar();
}

// public/js/features/patients-select.mjs
function formatIncomingEffectiveLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || "");
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function blockIncomingPreviewChartOpen(id) {
  if (!clinicalSessionContext.user) return false;
  const patient = getPatients().find((p) => p && String(p.id) === String(id));
  const mapped = patient ? {
    id: String(patient.id),
    service: String(patient.servicio || patient.area || ""),
    sub_area: String(patient.area || ""),
    interconsult_type: patient.interconsult_type
  } : { id: String(id) };
  const guardia = clinicalSessionContext.guardiasMap.get(String(id)) || null;
  const scope = evaluateClinicalScope(
    clinicalSessionContext.user,
    mapped,
    guardia,
    getClinicalScopeContextForEvaluate()
  );
  if (!scope.writable && scope.incomingPreview) {
    const assignment = (getClinicalScopeContextForEvaluate().assignments || []).find(
      (a) => String(a.patient_id) === String(id)
    );
    const when = formatIncomingEffectiveLabel(
      String(assignment?.effective_at || "")
    );
    rt.showToast(`Disponible el ${when}`, "info");
    return true;
  }
  return false;
}
function selectPatient(id, opts) {
  if (id == null || id === "") return;
  opts = opts || {};
  if (isPatientBulkSelectMode()) {
    togglePatientBulkSelected(id);
    patientsBridge.renderPatientList();
    syncPatientBulkBar();
    return;
  }
  try {
    if (!opts.bypassIncomingBlock && blockIncomingPreviewChartOpen(id)) return;
    selectPatientCore(id);
  } catch (err) {
    console.error("[R+] selectPatient:", err && err.message ? err.message : err);
  }
}
function stashPatientDraftsOnChange(prevId) {
  if (prevId == null || prevId === "") return;
  flushRecetaHuDraftIfMountedFor(prevId);
  stashMedInputForPatient(prevId);
  stashMedPharmPasteForPatient(prevId);
  stashVpoForPatient(prevId);
}
function showPatientViewShell() {
  var emptyState = document.getElementById("empty-state");
  var patientView = document.getElementById("patient-view");
  if (emptyState) emptyState.style.display = "none";
  if (patientView) patientView.style.display = "flex";
}
function switchInnerToResumen() {
  if (getUiDensity() === "normal") {
    rt.setActiveInner("resumen");
    rt.syncInnerTabVisualOnly();
  } else {
    rt.switchInnerTab("resumen");
  }
}
function applyInnerTabOnSamePatient(settings, inner) {
  if (isModeSala(settings) && (inner === "notas" || inner === "indica" || !inner)) {
    switchInnerToResumen();
    inner = "resumen";
  } else if (!isModeSala(settings) && inner === "listado") {
    switchInnerToResumen();
    inner = "resumen";
  }
}
function migrateInnerOnPatientChange(inner, settings) {
  var migrated = migrateGranularInner(inner || "resumen", settings);
  if (migrated !== inner) {
    rt.setActiveInner(migrated);
    return migrated;
  }
  return inner;
}
function scrollLabOutputIntoView() {
  var labOutput = document.getElementById("lab-output-section");
  if (!labOutput || labOutput.style.display === "none") return;
  window.setTimeout(function() {
    try {
      labOutput.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch {
      labOutput.scrollIntoView(true);
    }
  }, 0);
}
function handleLabTabAfterPatientChange(wasOnLab, patientChanged) {
  if (!wasOnLab || !patientChanged) return false;
  rt.limpiarReporte();
  rt.renderLabHistoryPanel();
  rt.switchAppTab("lab");
  scrollLabOutputIntoView();
  return true;
}
function inputPending() {
  var sched = typeof navigator !== "undefined" ? navigator.scheduling : null;
  return !!(sched && typeof sched.isInputPending === "function" && sched.isInputPending());
}
function scheduleSelectedPatientChart(id, ctx) {
  cancelDeferredIdleWork();
  scheduleTrailing(function() {
    if (String(rt.getActiveId() || "") !== String(id)) return;
    if (inputPending()) {
      scheduleSelectedPatientChart(id, ctx);
      return;
    }
    paintSelectedPatientChart(id, ctx);
  }, 120);
}
function paintSelectedPatientChart(id, ctx) {
  if (String(rt.getActiveId() || "") !== String(id)) return;
  rt.refreshExpedienteAfterPatientSelect({ patientChanged: ctx.patientChanged });
  if (ctx.appTab === "lab") rt.renderLabHistoryPanel();
  if (ctx.appTab === "med") rt.renderMedRecetaPanel();
  handleLabTabAfterPatientChange(ctx.wasOnLab, ctx.patientChanged);
  rt.refreshTendenciasOrCultivosPanel();
  if (rt.getActiveId()) {
    requestAnimationFrame(function() {
      if (String(rt.getActiveId() || "") !== String(id)) return;
      scrollActiveRondaCardIntoView();
    });
  }
  requestSilentUpdateCheck();
  if (ctx.patientChanged && ctx.prevId != null && ctx.prevId !== "") persistClinicalState();
}
function selectPatientCore(id) {
  var prevId = rt.getActiveId();
  var wasOnLab = rt.getActiveAppTab() === "lab";
  var appTab = rt.getActiveAppTab();
  var patientChanged = String(prevId ?? "") !== String(id);
  if (patientChanged) {
    stashPatientDraftsOnChange(prevId);
    rt.invalidateInnerTabRenderCache();
  }
  rt.setActiveId(id);
  writeLastSelectedPatientId(id);
  if (!patientChanged || !patchPatientListActiveHighlight(id)) {
    patientsBridge.renderPatientList();
  }
  showPatientViewShell();
  rt.renderEstadoActualButton();
  syncHeaderContext(rt);
  var settings = rt.getSettings();
  var inner = rt.getActiveInner();
  if (patientChanged) {
    inner = migrateInnerOnPatientChange(inner, settings);
  } else {
    applyInnerTabOnSamePatient(settings, inner);
  }
  rt.syncInnerTabVisualOnly();
  scheduleSelectedPatientChart(id, {
    patientChanged,
    prevId,
    wasOnLab,
    appTab
  });
}
function showPatientDeleteConfirm(n) {
  var many = n > 1;
  return openConfirm({
    weight: "destructive",
    title: many ? "Eliminar " + n + " pacientes" : "Eliminar paciente",
    message: many ? "Se quitar\xE1n las notas de este turno. No volver\xE1n desde otros equipos." : "Se quitar\xE1n las notas de este turno. No volver\xE1 desde otros equipos.",
    confirmLabel: "Eliminar",
    cancelLabel: "Cancelar"
  }).then(function(result) {
    return result === "confirm";
  });
}
function confirmPatientDelete(target) {
  if (target && target.archived) return Promise.resolve(true);
  return showPatientDeleteConfirm(1);
}
function showEmptyPatientShell() {
  var pv = document.getElementById("patient-view");
  var es = document.getElementById("empty-state");
  if (pv) pv.style.display = "none";
  if (es) es.style.display = "flex";
  rt.syncWorkContextChrome();
}
function afterPatientDeletesCommitted(summary, auditLabel) {
  persistClinicalState({ immediate: true });
  rt.addAuditEntry("patient-delete", "ok", summary.ok || 0, auditLabel || "");
  patientsBridge.renderPatientList();
  syncPatientBulkBar();
  var msg = formatPatientDeleteSummary(summary);
  if (msg && typeof rt.showToast === "function") {
    var kind = summary.failed ? "warn" : "success";
    rt.showToast(msg, kind);
  }
  if (rt.getActiveId()) patientsBridge.selectPatient(rt.getActiveId());
  else showEmptyPatientShell();
}
async function deletePatient(e, id) {
  e.stopPropagation();
  if (isPatientBulkSelectMode()) {
    togglePatientBulkSelected(id);
    patientsBridge.renderPatientList();
    syncPatientBulkBar();
    return;
  }
  var target = getPatients().find(function(p) {
    return p.id === id;
  });
  if (!target) return;
  if (!canDeletePatientChart(
    clinicalSessionContext.user,
    id,
    getClinicalScopeContextForEvaluate()
  )) {
    if (typeof rt.showToast === "function") {
      rt.showToast("Solo puedes eliminar pacientes de tu equipo (Admin/R4: todos).", "warn");
    }
    return;
  }
  if (!await confirmPatientDelete(target)) return;
  var label = "Eliminar " + (target.nombre || "paciente");
  if (typeof rt.pushUndoSnapshot === "function") rt.pushUndoSnapshot(label);
  var summary = await commitPatientDeletes([id]);
  afterPatientDeletesCommitted(
    summary,
    target.registro || target.nombre || ""
  );
}
async function confirmBulkDeletePatients() {
  var ids = getPatientBulkSelectedIds();
  if (!ids.length) {
    if (typeof rt.showToast === "function") rt.showToast("Selecciona al menos un paciente", "info");
    return;
  }
  var scope = getClinicalScopeContextForEvaluate();
  var user = clinicalSessionContext.user;
  var allowed = ids.filter(function(pid) {
    return canDeletePatientChart(user, pid, scope);
  });
  var skipped = ids.length - allowed.length;
  if (!allowed.length) {
    if (typeof rt.showToast === "function") {
      rt.showToast("Solo puedes eliminar pacientes de tu equipo (Admin/R4: todos).", "warn");
    }
    return;
  }
  var n = allowed.length;
  var ok = await showPatientDeleteConfirm(n);
  if (!ok) return;
  if (typeof rt.pushUndoSnapshot === "function") {
    rt.pushUndoSnapshot("Eliminar " + n + " pacientes");
  }
  var summary = await commitPatientDeletes(allowed);
  exitPatientBulkSelectMode();
  afterPatientDeletesCommitted(summary, n + " pacientes");
  if (skipped > 0 && typeof rt.showToast === "function") {
    rt.showToast(
      skipped === 1 ? "1 paciente de otro equipo no se elimin\xF3." : skipped + " pacientes de otro equipo no se eliminaron.",
      "warn"
    );
  }
}

// public/js/features/patients.mjs
patientsBridge.renderPatientList = renderPatientList;
patientsBridge.selectPatient = selectPatient;
function invalidateMobileSidebarPatientCache() {
}
function registerPatientsRuntime2(ctx) {
  registerPatientsRuntime(ctx);
}
function applyDefaultsToNewPatient(patientId) {
  if (!getNotes()[patientId]) return;
  applyProfileToNoteIfEmpty(getNotes()[patientId]);
  applyNotaFormatScaffoldIfEmpty(getNotes()[patientId], rt.getSettings() || {});
}
function applyDefaultsToNewIndicaciones(patientId) {
  if (!getIndicaciones()[patientId]) return;
  var st = rt.getSettings() || {};
  if (st.defaultDieta && !getIndicaciones()[patientId].dieta) getIndicaciones()[patientId].dieta = st.defaultDieta;
  if (st.defaultCuidados && !getIndicaciones()[patientId].cuidados) {
    getIndicaciones()[patientId].cuidados = st.defaultCuidados;
  }
  if (st.defaultMedicamentos && !getIndicaciones()[patientId].medicamentos) {
    getIndicaciones()[patientId].medicamentos = st.defaultMedicamentos;
  }
  if (st.defaultIndicacionesEstudios && !getIndicaciones()[patientId].estudios) {
    getIndicaciones()[patientId].estudios = st.defaultIndicacionesEstudios;
  }
  if (st.defaultIndicacionesInterconsultas && !getIndicaciones()[patientId].interconsultas) {
    getIndicaciones()[patientId].interconsultas = st.defaultIndicacionesInterconsultas;
  }
}
var ARCHIVED_SECTION_COLLAPSED_LS2 = "rpc-archived-section-collapsed";
var SIDEBAR_AUTO_HIDE_LS = "rpc-sidebar-auto-hide";
function patientSectionKey(p) {
  if (p && p.archived) return "archived";
  if (p && p.pinned) return "pinned";
  return "active";
}
function movePatientBefore(targetId, beforeId) {
  if (!targetId || !beforeId || targetId === beforeId) return;
  var from = getPatients().findIndex(function(p) {
    return p.id === targetId;
  });
  var to = getPatients().findIndex(function(p) {
    return p.id === beforeId;
  });
  if (from < 0 || to < 0 || from === to) return;
  var moved = getPatients().splice(from, 1)[0];
  if (from < to) to -= 1;
  getPatients().splice(to, 0, moved);
}
function toggleArchivedSection(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  try {
    var collapsed = localStorage.getItem(ARCHIVED_SECTION_COLLAPSED_LS2) === "1";
    setArchivedSectionCollapsed(!collapsed);
  } catch {
    setArchivedSectionCollapsed(false);
  }
  patientsBridge.renderPatientList();
}
function movePatientByOffset(ev, id, dir) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = getPatients().find(function(x) {
    return x.id === id;
  });
  if (!p) return;
  var sec = patientSectionKey(p);
  var ids = getPatients().filter(function(x) {
    return patientSectionKey(x) === sec;
  }).map(function(x) {
    return x.id;
  });
  var idx = ids.indexOf(id);
  if (idx < 0) return;
  var next = idx + dir;
  if (next < 0 || next >= ids.length) return;
  movePatientBefore(id, ids[next]);
  persistClinicalState();
  patientsBridge.renderPatientList();
}
function togglePatientPinned(ev, id) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = getPatients().find(function(x) {
    return x.id === id;
  });
  if (!p) return;
  p.pinned = !p.pinned;
  if (p.pinned) p.archived = false;
  persistClinicalState();
  patientsBridge.renderPatientList();
}
function togglePatientArchived(ev, id) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = getPatients().find(function(x) {
    return x.id === id;
  });
  if (!p) return;
  p.archived = !p.archived;
  if (p.archived) p.pinned = false;
  if (!p.archived) setArchivedSectionCollapsed(false);
  persistClinicalState();
  patientsBridge.renderPatientList();
  if (isCloudSyncActive()) {
    scheduleCloudSyncPush();
  }
}
function readSidebarAutoHide() {
  try {
    return localStorage.getItem(SIDEBAR_AUTO_HIDE_LS) === "1";
  } catch {
    return false;
  }
}
function writeSidebarAutoHide(on) {
  try {
    localStorage.setItem(SIDEBAR_AUTO_HIDE_LS, on ? "1" : "0");
  } catch (_e) {
    void _e;
  }
}
function applySidebarAutoHideUi() {
  var on = readSidebarAutoHide();
  document.documentElement.classList.toggle("sidebar-auto-hide", on);
  document.documentElement.classList.remove("sidebar-reveal");
  var btn = document.getElementById("btn-sidebar-auto-hide");
  if (btn) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.title = on ? "Mostrar barra de pacientes fija" : "Ocultar barra de pacientes (reaparece al acercar el mouse)";
  }
}
function toggleSidebarAutoHide() {
  writeSidebarAutoHide(!readSidebarAutoHide());
  applySidebarAutoHideUi();
}
function shouldRevealSidebarAt(clientX, appLeft) {
  var x = Number(clientX);
  var left = Number(appLeft) || 0;
  return x <= 36 || x <= left + 36;
}
function shouldKeepSidebarRevealed(clientX, appLeft, sidebarWidth) {
  var x = Number(clientX);
  var left = Number(appLeft) || 0;
  var w = Number(sidebarWidth);
  if (!(w > 40)) w = 260;
  return shouldRevealSidebarAt(x, left) || x <= left + w + 12;
}
function initSidebarAutoHide() {
  var strip = document.getElementById("sidebar-hover-strip");
  var aside = document.getElementById("patient-sidebar");
  if (typeof document !== "undefined" && document.documentElement.classList.contains("rpc-mobile-web")) {
    writeSidebarAutoHide(false);
  }
  applySidebarAutoHideUi();
  if (!strip || !aside) return;
  function reveal() {
    if (readSidebarAutoHide()) document.documentElement.classList.add("sidebar-reveal");
  }
  function hide() {
    document.documentElement.classList.remove("sidebar-reveal");
  }
  function appLeft() {
    var app = document.querySelector(".app");
    return app ? app.getBoundingClientRect().left : 0;
  }
  function asideWidth() {
    var w = aside.getBoundingClientRect().width;
    return w > 40 ? w : 260;
  }
  function pointerOverAside(node) {
    return !!(aside && node && (aside === node || aside.contains(node)));
  }
  strip.addEventListener("mouseenter", reveal);
  aside.addEventListener("mouseenter", reveal);
  document.addEventListener("mousemove", function(e) {
    if (!readSidebarAutoHide()) return;
    var left = appLeft();
    var revealed = document.documentElement.classList.contains("sidebar-reveal");
    if (shouldRevealSidebarAt(e.clientX, left) || pointerOverAside(e.target)) {
      reveal();
      return;
    }
    if (revealed && shouldKeepSidebarRevealed(e.clientX, left, asideWidth())) return;
    hide();
  });
}
var windowHandlers4 = {
  onPatientSearchInput,
  focusPatientSearchInput,
  togglePatientPinned,
  togglePatientArchived,
  movePatientByOffset,
  toggleArchivedSection,
  toggleSidebarAutoHide,
  openAddModal,
  openAddModalFromLab,
  openCompleteAdmissionModal,
  closeModal,
  savePatient,
  selectPatient,
  deletePatient,
  togglePatientBulkSelect,
  cancelPatientBulkSelect,
  confirmBulkDeletePatients,
  togglePatientCensusFilters,
  ...patientRegistroModalWindowHandlers
};

export {
  ensureProfileTemplateDefaults,
  resetProfileTemplatesToBlank,
  getFormatsEditMode,
  setFormatsEditMode,
  clearFormatsEditMode,
  loadDraftFromSettings,
  applyDraftToSettings,
  updateDefaultFormatField,
  resetDraftToBlank,
  registerDocumentExportRuntime,
  guardMobileDocExport,
  saveOutputDirSelection,
  requestDocumentJson,
  handleDocumentGenerateResponse,
  exportWithOutputDirFallback,
  canGenerateDocumentsOffline,
  shouldShowLocalServerOfflineBanner,
  guardDocExportBlocked,
  syncApprovedOutputDir,
  registerNotesIndicacionesRuntime,
  applyProfileToNoteIfEmpty,
  renderNoteForm,
  generateWord,
  renderIndicaForm,
  generateIndicaciones,
  windowHandlers,
  renderNotaEvolucionPrimaryTab,
  showNotaEvolucionClassicView,
  windowHandlers2,
  getEstadoActualTextForPatient,
  applyEstadoActualParsedToForm,
  syncEaRegistroGluMode,
  resetEaRegistroForm,
  registerMedicationsRuntime,
  medOutputTab,
  registerMedPharmProfileRuntime,
  getMedSubview,
  syncAppTabIndicator,
  syncInnerTabIndicator,
  animateTabPanelEnter,
  showAppTabPanel,
  hideAppTabPanel,
  syncAllSubTabIndicators,
  syncExpedienteSegmentIndicators,
  initTabBarMotion,
  setMedSubview,
  closeMedRecetaPasteModal,
  renderMedRecetaPanel,
  ensureEaRegistroModalForm,
  refreshEaCopyFabVisibility,
  windowHandlers3,
  renderEstadoActualPanel,
  navigateToEstadoActualPanel,
  procesarRecetaFromText,
  setMedOutputTab,
  registerVpoRuntime,
  renderVpo,
  registerRecetaHuRuntime,
  renderRecetaHu,
  recetaHuWindowHandlers,
  onPatientSearchInput,
  advanceRondaPatient,
  scrollActiveRondaCardIntoView,
  renderPatientList,
  medicationsWindowHandlers,
  selectPatient,
  deletePatient,
  invalidateMobileSidebarPatientCache,
  registerPatientsRuntime2 as registerPatientsRuntime,
  applyDefaultsToNewPatient,
  applyDefaultsToNewIndicaciones,
  toggleArchivedSection,
  movePatientByOffset,
  togglePatientPinned,
  togglePatientArchived,
  toggleSidebarAutoHide,
  shouldRevealSidebarAt,
  shouldKeepSidebarRevealed,
  initSidebarAutoHide,
  windowHandlers4
};
//# sourceMappingURL=/js/chunks/chunk-LWJYIL7E.js.map
