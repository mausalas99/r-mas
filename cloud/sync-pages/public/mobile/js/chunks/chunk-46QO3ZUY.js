import {
  addProblema,
  buildProximaCitaText,
  buildRecetaHuGeneratePayload,
  emptyListado,
  formatRecetaHuFecha,
  nextCensusPatientId,
  normalizeRecetaHuConsultServices,
  normalizeRecetaHuDraft,
  removeProblema
} from "/mobile/js/chunks/chunk-IXAK2IU3.js";
import {
  syncClinicalRotationEntryChrome
} from "/mobile/js/chunks/chunk-AIIT754E.js";
import {
  formatUpdaterReleaseNotesPlain
} from "/mobile/js/chunks/chunk-CXMRZLXS.js";
import {
  SOPORTE_OPTIONS,
  VITAL_KEYS,
  VITAL_LABELS,
  VITAL_UNITS,
  _eaPanelCache,
  buildHistorialRowParts,
  findActivePatient,
  formatHistorialWhen,
  getEaPanelRuntime,
  invalidateEaPanelCache,
  renderSnapshotGluHtml,
  renderSnapshotGluZoneTitle,
  renderSnapshotIoHtml,
  renderSnapshotVitalsHtml
} from "/mobile/js/chunks/chunk-AS6TAICA.js";
import {
  ensureChartsLoaded,
  ensureLabsLoaded,
  hideLabPanelLoadingSkeleton,
  showLabPanelLoadingSkeleton
} from "/mobile/js/chunks/chunk-K45GC3VK.js";
import {
  GUIDED_TOUR_LS_KEY
} from "/mobile/js/chunks/chunk-VOW7QFKJ.js";
import {
  buildEaHistorialChartsRevision,
  renderEaChartsSummarySection
} from "/mobile/js/chunks/chunk-RJIPR6CF.js";
import {
  escTxtSafe
} from "/mobile/js/chunks/chunk-2JKGABV2.js";
import {
  closeSettingsDropdown,
  showSettingsPanel
} from "/mobile/js/chunks/chunk-2VZA33PI.js";
import {
  syncSettingsLanHostDiskSection
} from "/mobile/js/chunks/chunk-EPFF77ND.js";
import {
  EA_MED_FIELD_LABELS,
  renderMedCategoryGrid,
  renderPatientDashboard,
  wireMedCategoryGrid
} from "/mobile/js/chunks/chunk-3RXBEWAZ.js";
import {
  syncHeaderContext
} from "/mobile/js/chunks/chunk-LOGJB72W.js";
import {
  innerAfterLeavingLab,
  syncLabInnerVisibility
} from "/mobile/js/chunks/chunk-44QBSWO4.js";
import {
  buildGroupRowModel
} from "/mobile/js/chunks/chunk-KEFN326O.js";
import {
  RELEASES_LATEST_URL,
  UPDATE_DISMISS_VER_KEY,
  UPDATE_SNOOZE_KEY,
  UPDATE_TELEMETRY_URL,
  applyBatchStudyGroups,
  buildLabRepoBulkText,
  classifyLabRepoBatchFetch,
  getPatientSearchFilter,
  labRepoDefaultDateRange,
  labRepoFetchRangeFromDateInputs,
  labRepoToDateInputValue,
  patientMatchesSearch,
  patientsVisibleInSidebar,
  requestSilentUpdateCheck,
  reselectIfActivePatientHidden,
  safeAttrJsString,
  setPatientSearchFilter,
  shouldSurfaceUpdateCheckError,
  syncClinicalCensusFiltersBar,
  togglePatientCensusFilters,
  updateNotAvailableToastKind,
  updaterState,
  writeLastSelectedPatientId
} from "/mobile/js/chunks/chunk-5DAE7PK3.js";
import {
  resumeLabBulkPreviewModalIfSuspended,
  suspendLabBulkPreviewModal
} from "/mobile/js/chunks/chunk-BGYDWUEW.js";
import {
  formatProgressLine,
  sanitizeUpdaterUserMessage
} from "/mobile/js/chunks/chunk-AIC37VNN.js";
import {
  addTodo,
  deleteTodo,
  renderTodoForm,
  setTodoPriority,
  toggleTodo
} from "/mobile/js/chunks/chunk-AYK2RJF5.js";
import {
  removePatientLocally,
  showConfirmDialog,
  wrapApprovalInConflictModal
} from "/mobile/js/chunks/chunk-7TWBBTNK.js";
import {
  isCloudMobileClient
} from "/mobile/js/chunks/chunk-OXN2ZL25.js";
import {
  buildPatientEntry,
  buildPatientSalaFieldHtml,
  clearPendingAddPatientCallbacks,
  commitPatientFromModal,
  commitStubPatientFromLab,
  ensureUniquePatientName,
  findPatientByRegistro,
  generatePatientId,
  getPendingAddPatientFromBulkPreview,
  getTourDemoAdmitDefaults,
  isTourDemoPatientId,
  patientsBridge,
  rememberPatientDeleteTombstone,
  setPendingAddPatientFromBulkPreview,
  setPendingAddPatientSavedCallback,
  syncPatientRegistrationSalaSelect,
  wirePatientRegistrationSalaControls
} from "/mobile/js/chunks/chunk-M6MLPK4W.js";
import {
  closePatientDatosModal,
  openPatientDatosModal,
  openPatientDatosModalForPatient,
  patientDatosModalWindowHandlers,
  wirePatientDatosModalOnce
} from "/mobile/js/chunks/chunk-4QI24DFU.js";
import {
  applyExpedientePaneLayout,
  consolidatedInnerTabButtonId,
  consolidatedTabForGranular,
  defaultGranularForConsolidatedTab,
  isClinicoCompositeVisible,
  migrateGranularInner,
  resetExpedientePaneLayoutCache,
  resolveConsolidatedTarget,
  shouldShowConsolidatedTab,
  syncConsolidatedPaneVisibility,
  syncConsolidatedSegmentBars
} from "/mobile/js/chunks/chunk-ZVJAFSHG.js";
import {
  registerPatientsRuntime,
  rt as rt2
} from "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import {
  SOAP_EMPTY_MED_FALLBACK,
  VM_MODO_OPTIONS,
  assembleSoapLines,
  assignPatientToTeamClinical,
  buildCensusPayload,
  buildHiTempClause,
  buildNmClause,
  buildPatientTeamAssignSectionHtml,
  buildVentilatorioCalcHints,
  classifyCensoTableLine,
  comparePatientsByBed,
  copyToClipboardSafe,
  formatCamaCellLabel,
  formatCensoMedsFromReceta,
  formatNmDietClause,
  getClinicalScopeContextForEvaluate,
  hasElevatedTeamPrivileges,
  invalidateEventualidadesPanel,
  isClinicalScopeReadyForPatientApply,
  isPatientAssignedToJoinedTeam,
  medsClauseOrEmpty,
  medsListForSoap,
  mergeSoapMedField,
  normalizeSoporteValue,
  openSOAPModalDirect,
  parseCamaCellForCenso,
  partitionAnalgesiaForSoap,
  partitionNmMedsForSoap,
  patientHasInsulinRescatesInReceta,
  patientTeamAssignWindowHandlers,
  readPatientRegistrationTeamId,
  renderEstadoActualBar,
  renderEstadoActualButton,
  renderEventualidadesPanel,
  renderGuardiaBoard,
  renderGuardiaCensusGrid,
  resolveCensoFimiLabel,
  resolveKcalDisplay,
  resolveSoporteClause,
  resolveVentilatorioLabContext,
  shouldEnforceTeamPatientMirror,
  soapLegacyFieldIdForCategory,
  soapMedCategorySegment,
  soporteTier,
  syncGuardiaCensusPanelVisibility,
  syncPatientRegistrationTeamSelect,
  wirePatientTeamAssignRefresh
} from "/mobile/js/chunks/chunk-AVZ5WV63.js";
import {
  syncDbSecuritySectionUi
} from "/mobile/js/chunks/chunk-NPWWQWKW.js";
import {
  isAntidiabeticRecetaItem
} from "/mobile/js/chunks/chunk-3PL7T3ZN.js";
import {
  isVitalAltered
} from "/mobile/js/chunks/chunk-AKP3FGXS.js";
import {
  findCultivoChunkInSet,
  isCultureTableHeaderLine,
  parseCultureBlockFromLineArray,
  splitResLabsByTipo
} from "/mobile/js/chunks/chunk-7FIP2ETS.js";
import {
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  formatCultivoCondensedForCopy,
  isLabSectionHeaderHtml,
  isParsedCultivoHeaderLine,
  parseCuentaFromCultivoChunkLines,
  procesarLabs,
  renderEntry
} from "/mobile/js/chunks/chunk-CZ2M277B.js";
import {
  blockIfMobileDocExport,
  isMobileWeb,
  mobileDocExportToast,
  normalizeMobileAppTab
} from "/mobile/js/chunks/chunk-JBHSWL2Z.js";
import {
  refreshRpcDateFields
} from "/mobile/js/chunks/chunk-BUGU4R5K.js";
import {
  collapseHeaderModeSeg,
  exitPaseModeFromHeader,
  getUiDensity,
  isGuardiaMode,
  isPaseMode,
  markOpenedDetailFromPaseBoard,
  setUiDensity,
  syncFontZoomButtons,
  syncHeaderModeSeg,
  syncHighContrastButtons,
  syncUiDensityButtons,
  t,
  toggleGuardiaMode,
  toggleHeaderModeSegExpand
} from "/mobile/js/chunks/chunk-4SMSHN53.js";
import {
  getDefaultCama,
  getDefaultCuarto,
  getDefaultServicio,
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  enqueueCloudPatientDelete,
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-P7EHNYUF.js";
import {
  cancelDeferredIdleWork,
  getIndicaciones,
  getLabHistory,
  getListadoProblemas,
  getMedNotaSelectionByPatient,
  getMedPharmProfileByPatient,
  getMedRecetaByPatient,
  getNotes,
  getPatients,
  getRecetaHuByPatient,
  getVpoByPatient,
  persistClinicalState,
  replaceAppStateFromBackupData,
  scheduleAfterPaint,
  scheduleIdle,
  scheduleTrailing,
  setIndicaciones,
  setLabHistory,
  setMedPharmProfileByPatient,
  setMedRecetaByPatient,
  setNotes,
  setPatients
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  storage
} from "/mobile/js/chunks/chunk-5RUR3UQW.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-C4OBKXWW.js";
import {
  DIET_PENDING_KEYS,
  INSULIN_PRANDIAL_GROUP_ID,
  INSULIN_RESCATE_GROUP_ID,
  MAX_VITAL_LAYERS_IN_FORM,
  MAX_VITAL_READINGS_PER_DAY,
  MED_FIELD_KEYS,
  SOAP_DESTINATION_KEYS,
  SOAP_DESTINATION_LABELS,
  TREND_REFRESH_DEBOUNCE_MS,
  accesoFechaToDateInputValue,
  advanceAbxMedTextForManejoDate,
  appendMedicion,
  applyDietProposalFromRecetaBlock,
  applyDietaSuplementoPolicy,
  applyMedCatalogOverlay,
  applyPatientDiagnosticosList,
  applyRecetaProposal,
  applySomePasteToProfile,
  applySomePharmCatalogOverlay,
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
  dosisBeforeSlash,
  effectiveDiaTratamiento,
  effectiveSoapCategory,
  ensureMonitoreo,
  ensureMonthOnProfile,
  ensureNoteDxFromPatientForExport,
  ensurePatientAccesos,
  ensurePatientDiagnosticos,
  estadoClinicoForDisplay,
  estadoClinicoForText,
  extractMedBaseName,
  formatDiagnosticosCopy,
  formatFreqShort,
  formatInsulinPumpAlgoritmoLabel,
  formatMedicationEgresoLine,
  formatMedicationSoapShort,
  formatViaShort,
  getDietOptions,
  getLabHistoryRevision,
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
  mergeCensoPatientFields,
  mergePatientMonitoreoFromImported,
  mergePatientRegistrationMeta,
  mergeRecetaIntoMonth,
  migratePatientDiagnosticosFromVpo,
  migratePatientMonitoreo,
  monthHasData,
  monthKeyFromParts,
  normalizeFechaLabHistory,
  parseDiagnosticosText,
  parseFechaLabToMs,
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
  sortLabHistoryChronological,
  splitMonthAt,
  stampCensoFieldsClock,
  syncConfirmedAbxFromReceta,
  syncDietKcalFromWeight,
  syncLegacyAccesoFields,
  syncNoteDxFromPatient,
  syncRecetaProposalsFromSoapSelection,
  toggleNotAdmin,
  unassignedOtrosSoapItems,
  vitalSeriesToLegacyFields
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";
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
  closeModalAnimated,
  prefersReducedMotion,
  prepareModalBackdropOpen,
  setAsyncButtonLoading,
  shakePatientFieldsForError
} from "/mobile/js/chunks/chunk-KZT7D6I2.js";
import {
  rt
} from "/mobile/js/chunks/chunk-3YCJDDNO.js";
import {
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  evaluateClinicalScope
} from "/mobile/js/chunks/chunk-WTVHUFEL.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-75QM3TGW.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/features/estado-actual-panel-bridge.mjs
var eaPanelBridge = {
  renderEstadoActualPanel(_opts) {
  },
  registrarEstadoActualMedicion() {
  }
};

// public/js/features/estado-actual-text-inputs.mjs
function snapshotVitals(snapshot) {
  return snapshot && typeof snapshot === "object" && snapshot.vitals && typeof snapshot.vitals === "object" ? snapshot.vitals : {};
}
function snapshotIo(snapshot) {
  return snapshot && typeof snapshot === "object" && snapshot.io && typeof snapshot.io === "object" ? snapshot.io : {};
}
function snapshotAlteredAt(snapshot) {
  return snapshot && typeof snapshot === "object" && snapshot.alteredAt && typeof snapshot.alteredAt === "object" ? snapshot.alteredAt : {};
}
function snapshotGlu(snapshot) {
  return snapshot && typeof snapshot === "object" && Array.isArray(snapshot.glucometrias) ? snapshot.glucometrias : [];
}
function snapshotBomba(snapshot) {
  return snapshot && typeof snapshot === "object" && Array.isArray(snapshot.bombaInsulina) ? snapshot.bombaInsulina : [];
}
function snapshotTempPeakAt(snapshot) {
  return snapshot && typeof snapshot === "object" && snapshot.tempPeakAt && typeof snapshot.tempPeakAt === "object" ? (
    /** @type {{ recordedAt?: string, time?: string }} */
    snapshot.tempPeakAt
  ) : null;
}
function normalizeEaTextInputs(estadoClinico, snapshot, balances) {
  const ec = estadoClinico && typeof estadoClinico === "object" ? (
    /** @type {Record<string, unknown>} */
    estadoClinico
  ) : {};
  const v = snapshotVitals(snapshot);
  const snapIo = snapshotIo(snapshot);
  const btTurno = balances && typeof balances === "object" ? (
    /** @type {{ balanceTurno?: unknown }} */
    balances.balanceTurno
  ) : void 0;
  const snapAlt = snapshotAlteredAt(snapshot);
  const tempPeakAt = snapshotTempPeakAt(snapshot);
  const glSrc = snapshotGlu(snapshot);
  const bombaSrc = snapshotBomba(snapshot);
  return { ec, v, snapIo, btTurno, snapAlt, tempPeakAt, glSrc, bombaSrc };
}

// public/js/features/estado-actual-text.mjs
function buildEstadoActualText(estadoClinico, snapshot, balances, options) {
  options = options || {};
  var ctx = normalizeEaTextInputs(estadoClinico, snapshot, balances);
  var labCtx = options.patientId ? resolveVentilatorioLabContext(options.patientId, getLabHistory()) : null;
  var soporte = resolveSoporteClause(ctx.ec, {
    fr: ctx.v.fr,
    sat: ctx.v.sat,
    pesoKg: options.patientPeso,
    lab: labCtx
  });
  var hiTemp = buildHiTempClause(ctx.v, ctx.snapAlt, ctx.tempPeakAt, options.now);
  var kcalDisplay = resolveKcalDisplay(ctx.ec, options);
  var rescatesInSome = options.rescatesInSome != null ? !!options.rescatesInSome : patientHasInsulinRescatesInReceta(options.recetaBlock || null);
  var bombaAlgoritmo = options.bombaAlgoritmo != null ? options.bombaAlgoritmo : snapshot && typeof snapshot === "object" && /** @type {any} */
  snapshot.bombaInsulinaAlgoritmo != null ? (
    /** @type {any} */
    snapshot.bombaInsulinaAlgoritmo
  ) : detectInsulinPumpAlgorithmFromRecetaBlock(options.recetaBlock || null);
  var nmClause = buildNmClause(ctx.ec, kcalDisplay, ctx.snapIo, ctx.btTurno, ctx.glSrc, ctx.bombaSrc, {
    rescatesInSome,
    bombaAlgoritmo
  });
  return assembleSoapLines(ctx.ec, ctx.v, soporte, hiTemp, nmClause).join("\n\n");
}

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
function resolveKcalDisplay2(ec, pend, dietPending, dietWeight, dietaParenteral) {
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
  var kcalDisplay = resolveKcalDisplay2(ec, pend, dietPending, dietWeight, dietaParenteral);
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
function restoreEaPanelUiState(mount, state3) {
  if (!mount || !state3) return;
  if (state3.clinicoOpen) {
    var det = mount.querySelector(".ea-estado-clinico");
    if (det) det.open = true;
  }
  if (state3.historialOpen) {
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
  var t2 = (
    /** @type {HTMLElement | null} */
    ev.target
  );
  if (!t2 || !form.contains(t2)) return;
  var spine = getRegistroTabSpineElements(form);
  var onSpine = spine.indexOf(t2) >= 0;
  var onSkip = t2.matches && t2.matches(REGISTRO_TAB_SKIP_SELECTOR);
  if (!onSpine && !onSkip) return;
  ev.preventDefault();
  moveRegistroTabFocus(form, t2, ev.shiftKey ? -1 : 1);
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
    var t2 = g.time != null ? String(g.time) : "";
    if (t2) byTime.set(t2, g);
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

// public/js/features/estado-actual-panel-registro-io.mjs
function syncEaRegistroInsulinRescateFlag(form) {
  if (!form) return;
  var activeId = getEaPanelRuntime().getActiveId();
  var block = activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null;
  var hasRescates = patientHasInsulinRescatesInReceta(block);
  form.classList.toggle("ea-form--no-insulin-rescates", !hasRescates);
}
function syncEaRegistroInsulinPumpFlag(form, monitoreo) {
  if (!form) return;
  var activeId = getEaPanelRuntime().getActiveId();
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
    var t2 = g.time != null ? String(g.time) : "";
    if (t2 && standardSet.has(t2)) standardGlus.push(g);
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

// public/js/features/medications-runtime-state.mjs
var rt3 = {
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
  if (typeof rt3.showToast === "function") rt3.showToast(message, type);
}
function registerMedicationsRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt3, ctx);
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
  const t2 = String(raw || "").trim();
  const m = t2.match(/^(\d{4})-(\d{2})-(\d{2})$/);
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
  var t2 = /* @__PURE__ */ new Date();
  return { year: t2.getFullYear(), monthIndex: t2.getMonth(), day: t2.getDate() };
}
function isToday(year, monthIndex, day) {
  var t2 = todayParts();
  return t2.year === year && t2.monthIndex === monthIndex && t2.day === day;
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
      var t2 = enterCleanupTimers.get(panelEl);
      if (t2) clearTimeout(t2);
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
  function wrapFromTarget(t2) {
    if (!t2 || !t2.closest) return null;
    return t2.closest(".med-pharm-adh-wrap");
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
function deleteMedPharmViewMonth() {
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
  if (!confirm(
    "\xBFEliminar el perfil farmacoterap\xE9utico de " + label + "? Las marcas de no administrado y el pegado SOME de ese mes se perder\xE1n."
  )) {
    return;
  }
  var next = deleteMonthFromProfile(profile, mp.viewYear, mp.viewMonthIndex);
  persistMedPharmProfile(pid, next);
  closeModals();
  persistClinicalState();
  medPharmProfileBridge.renderMedPharmProfilePanel();
  mp.rt.showToast("Mes eliminado del perfil", "success");
}
function deleteMedPharmProfileAll() {
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
  if (!confirm(
    "\xBFBorrar todo el perfil farmacoterap\xE9utico de este paciente? Se eliminar\xE1n todos los meses importados y el borrador de pegado."
  )) {
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

// public/js/patient-data-accesos-ui.mjs
function activePatient(patientId) {
  return getPatients().find(function(p) {
    return String(p.id) === String(patientId);
  });
}
function accesoRows(patient) {
  ensurePatientAccesos(patient);
  var list = (patient.accesosList || []).slice();
  return list.length ? list : [{ via: "", fecha: "" }];
}
function viaSelectHtml(index, via) {
  var v = String(via || "");
  return '<select class="ea-input patient-acceso-via" onchange="onPatientAccesoVia(' + index + ',this.value)" aria-label="V\xEDa de acceso"><option value=""' + (!v ? " selected" : "") + '>\u2014 V\xEDa \u2014</option><option value="periferica"' + (v === "periferica" ? " selected" : "") + '>EV perif\xE9rica</option><option value="cvc"' + (v === "cvc" ? " selected" : "") + '>CVC / cat\xE9ter central</option><option value="picc"' + (v === "picc" ? " selected" : "") + ">PICC</option></select>";
}
function renderAccesosListHtml(patient) {
  var rows = accesoRows(patient);
  return rows.map(function(row, i) {
    var canRemove = rows.length > 1;
    return '<div class="patient-acceso-row list-row"><div class="field-group" style="margin:0;">' + viaSelectHtml(i, row.via) + '</div><div class="field-group" style="margin:0;"><input type="date" class="rpc-date-input patient-acceso-fecha" value="' + esc(accesoFechaToDateInputValue(row.fecha)) + '" oninput="onPatientAccesoFecha(' + i + ',this.value)" aria-label="Fecha acceso"></div><button type="button" class="btn-remove" onclick="removePatientAccesoRow(' + i + ')"' + (canRemove ? "" : ' style="visibility:hidden"') + ' aria-label="Quitar acceso">\xD7</button></div>';
  }).join("");
}
function buildPatientAccesosSectionHtml(patient) {
  ensurePatientAccesos(patient);
  return '<div class="patient-accesos-block"><div class="vpo-toolbar" style="margin-top:2px;"><span class="ea-label" style="flex:1;">Accesos</span><button type="button" class="btn-add-row" onclick="addPatientAccesoRow()">+ Agregar acceso</button></div><div class="patient-accesos-list" id="patient-accesos-list">' + renderAccesosListHtml(patient) + "</div></div>";
}
function refreshAccesosListDom(patientId) {
  var patient = activePatient(patientId);
  var listEl = document.getElementById("patient-accesos-list");
  if (!patient || !listEl) return;
  listEl.innerHTML = renderAccesosListHtml(patient);
  refreshRpcDateFields(listEl);
}
function currentPatientId() {
  var wrap = document.getElementById("patient-data-form");
  return wrap && wrap.dataset.patientId ? wrap.dataset.patientId : null;
}
function touchAccesos(patient, mutator) {
  if (!patient) return;
  ensurePatientAccesos(patient);
  mutator(patient);
  syncLegacyAccesoFields(patient);
  persistClinicalState();
}
function onPatientAccesoVia(index, value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function(p) {
    p.accesosList[index].via = String(value || "").trim();
  });
}
function onPatientAccesoFecha(index, value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function(p) {
    p.accesosList[index].fecha = String(value || "").trim();
  });
}
function addPatientAccesoRow() {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function(p) {
    p.accesosList.push({ via: "", fecha: "" });
  });
  refreshAccesosListDom(pid);
}
function removePatientAccesoRow(index) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient || !Array.isArray(patient.accesosList)) return;
  if (patient.accesosList.length <= 1) return;
  touchAccesos(patient, function(p) {
    p.accesosList.splice(index, 1);
    ensurePatientAccesos(p);
  });
  refreshAccesosListDom(pid);
}
var patientDataAccesosWindowHandlers = {
  onPatientAccesoVia,
  onPatientAccesoFecha,
  addPatientAccesoRow,
  removePatientAccesoRow
};

// public/js/patient-data-censo-ui.mjs
function activePatient2(patientId) {
  return getPatients().find(function(p) {
    return String(p.id) === String(patientId);
  });
}
function dxRows(patient) {
  var list = (patient.diagnosticosList || []).slice();
  return list.length ? list : [""];
}
function renderDxListHtml(patient) {
  var rows = dxRows(patient);
  return rows.map(function(dx, i) {
    var canRemove = rows.length > 1;
    return '<div class="vpo-dx-row list-row"><input type="text" class="ea-input" value="' + esc(dx) + '" placeholder="Diagn\xF3stico ' + (i + 1) + '" oninput="onPatientDxInput(' + i + ', this.value)" style="text-transform:uppercase;"><button type="button" class="btn-remove" onclick="removePatientDxRow(' + i + ')"' + (canRemove ? "" : ' style="visibility:hidden"') + ' aria-label="Eliminar">\xD7</button></div>';
  }).join("");
}
function buildPatientCensoDatosSectionsHtml(patient) {
  migratePatientDiagnosticosFromVpo(patient, getVpoByPatient()[patient.id]);
  ensurePatientDiagnosticos(patient);
  return '<div class="card" style="margin-top:10px;"><div class="card-header">Diagn\xF3sticos (censo)</div><div class="card-body"><div class="vpo-toolbar"><button type="button" class="btn-add-row" onclick="addPatientDxRow()">+ Agregar diagn\xF3stico</button></div><div class="vpo-dx-list" id="patient-dx-list">' + renderDxListHtml(patient) + '</div><div class="vpo-dx-paste" style="margin-top:8px;"><span class="ea-label">Pegar con \xAB + \xBB entre diagn\xF3sticos</span><textarea class="ea-input" id="patient-dx-paste" rows="2" placeholder="DX1 + DX2\u2026"></textarea><button type="button" class="btn-med-secondary" onclick="splitPatientDxPaste()">Separar por +</button></div></div></div><div class="card" style="margin-top:10px;"><div class="card-header">Censo \u2014 ATB / Medicamentos</div><div class="card-body"><div class="vpo-toolbar"><button type="button" class="btn-med-secondary" onclick="censoTomarDeMedicamentos()">Tomar de Medicamentos</button></div><textarea class="ea-input" id="patient-censo-meds" rows="6" placeholder="Texto para columna ATB/Meds del PDF\u2026" oninput="updatePatientCensoMeds(this.value)">' + esc(patient.censoMedsText || "") + "</textarea></div></div>";
}
function refreshDxListDom(patientId) {
  var patient = activePatient2(patientId);
  var listEl = document.getElementById("patient-dx-list");
  if (!patient || !listEl) return;
  listEl.innerHTML = renderDxListHtml(patient);
}
function currentPatientId2() {
  var wrap = document.getElementById("patient-data-form");
  return wrap && wrap.dataset.patientId ? wrap.dataset.patientId : null;
}
function onPatientDxInput(index, value) {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [""];
  patient.diagnosticosList[index] = String(value || "").toUpperCase();
  ensurePatientDiagnosticos(patient);
  stampCensoFieldsClock(patient);
  persistClinicalState();
}
function addPatientDxRow() {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [""];
  patient.diagnosticosList.push("");
  stampCensoFieldsClock(patient);
  persistClinicalState();
  refreshDxListDom(pid);
}
function removePatientDxRow(index) {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient || !Array.isArray(patient.diagnosticosList)) return;
  if (patient.diagnosticosList.length <= 1) return;
  patient.diagnosticosList.splice(index, 1);
  applyPatientDiagnosticosList(patient, patient.diagnosticosList);
  stampCensoFieldsClock(patient);
  persistClinicalState();
  refreshDxListDom(pid);
}
function splitPatientDxPaste() {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  var ta = document.getElementById("patient-dx-paste");
  if (!patient || !ta) return;
  var parsed = parseDiagnosticosText(ta.value);
  if (!parsed.length) return;
  applyPatientDiagnosticosList(patient, parsed.concat([""]));
  stampCensoFieldsClock(patient);
  persistClinicalState();
  refreshDxListDom(pid);
}
function updatePatientCensoMeds(value) {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient) return;
  patient.censoMedsText = String(value || "");
  stampCensoFieldsClock(patient);
  persistClinicalState();
}
function censoTomarDeMedicamentos() {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient) return;
  var text = formatCensoMedsFromReceta(getMedRecetaByPatient()[pid]);
  patient.censoMedsText = text;
  stampCensoFieldsClock(patient);
  var ta = document.getElementById("patient-censo-meds");
  if (ta) ta.value = text;
  persistClinicalState();
}
var patientDataCensoWindowHandlers = {
  onPatientDxInput,
  addPatientDxRow,
  removePatientDxRow,
  splitPatientDxPaste,
  updatePatientCensoMeds,
  censoTomarDeMedicamentos
};

// public/js/features/expediente/expediente-runtime.mjs
var rt4 = {
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
    return (
      /** @type {any} */
      {}
    );
  },
  showToast() {
  },
  renderTendencias() {
  },
  renderPaseBoard() {
  },
  splitResLabsByTipo(rows) {
    void rows;
    return { labs: [], cultivo: [] };
  },
  buildLabSetDateLine(set) {
    void set;
    return "";
  },
  ensureParsedLabHistory(pid) {
    void pid;
    return [];
  },
  isRpcOffline() {
    return false;
  },
  requestDocumentJson() {
    return Promise.resolve(null);
  },
  handleDocumentGenerateResponse() {
    return Promise.resolve(null);
  },
  incrementPendingJobs() {
  },
  decrementPendingJobs() {
  },
  syncOfflineButtonStates() {
  },
  copyToClipboardSafe(_t) {
    return Promise.resolve(false);
  },
  guardMobileDocExport() {
    return false;
  }
};
function registerExpedienteRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt4, ctx);
}
function aid() {
  return rt4.getActiveId();
}

// public/js/features/expediente/expediente-cultivos-atb-ui.mjs
function buildCultivoAntibiogramCellHtmlForPatient(r, patientId) {
  if (!patientId) return '<pre class="cultivos-atb-fallback">\u2014</pre>';
  var sets = getLabHistory()[patientId] || [];
  var set = sets.find(function(s) {
    return String(s.id) === String(r.labSetId);
  });
  var sens = set && set.sourceText ? extractSensCrudasForGermFromSource(set.sourceText, r.organismo) : null;
  var copyBtn = set && r.labSetId != null && String(r.labSetId) !== "" ? `<button type="button" class="cultivos-copy-full-btn" onclick='copyCultivoCondensado(` + JSON.stringify(String(r.labSetId)) + "," + JSON.stringify(String(r.organismo || "")) + ")'>Copiar informe completo</button>" : "";
  if (sens && sens.length) {
    return '<div class="cultivos-atb-wrap"><div class="cultivos-atb-chips" role="list">' + buildAtbRisSummaryHtml(sens) + "</div>" + copyBtn + "</div>";
  }
  return '<div class="cultivos-atb-wrap"><pre class="cultivos-atb-fallback">' + esc(r.resistencias || r.risSummary || "\u2014") + "</pre>" + copyBtn + "</div>";
}
var _atbRisScrollResizeWired = false;
var _atbRisScrollRootsWired = /* @__PURE__ */ new WeakSet();
var _atbRisDelegatedHoverRoots = /* @__PURE__ */ new WeakSet();
var ATB_RIS_HIDE_DELAY_MS = 140;
function ensureAtbRisScrollRepositionOn(el) {
  if (!el || _atbRisScrollRootsWired.has(el)) return;
  _atbRisScrollRootsWired.add(el);
  el.addEventListener("scroll", repositionOpenAtbRisPanel, { passive: true });
}
function cancelHideAtbPanel(panel) {
  if (!panel || !panel._atbHideTid) return;
  clearTimeout(panel._atbHideTid);
  panel._atbHideTid = null;
}
function scheduleHideAtbPanel(panel) {
  if (!panel) return;
  cancelHideAtbPanel(panel);
  panel._atbHideTid = setTimeout(function() {
    panel._atbHideTid = null;
    hideAtbRisHoverPanel(panel);
  }, ATB_RIS_HIDE_DELAY_MS);
}
function panelAtbRisForWrap(wrap) {
  return wrap.querySelector(".atb-ris-hover-panel") || wrap._atbRisPanelEl || null;
}
function hideAtbRisHoverPanel(panel) {
  if (!panel) return;
  cancelHideAtbPanel(panel);
  panel.classList.remove("is-open");
  panel.style.left = "";
  panel.style.top = "";
  panel.style.visibility = "";
  var wrap = panel._atbRisOwnerWrap;
  if (wrap) {
    wrap._atbRisPanelEl = null;
  }
  panel._atbRisOwnerWrap = null;
  if (wrap && wrap.isConnected) {
    wrap.appendChild(panel);
  } else if (panel.parentNode === document.body) {
    panel.remove();
  }
}
function closeAtbRisPanelsExcept(exceptWrap) {
  document.querySelectorAll(".atb-ris-hover-panel.is-open").forEach(function(panel) {
    var w = panel._atbRisOwnerWrap || panel.closest(".cult-atb-ris-chip-wrap");
    if (w !== exceptWrap) hideAtbRisHoverPanel(panel);
  });
}
function repositionOpenAtbRisPanel() {
  var panel = document.querySelector(".atb-ris-hover-panel.is-open");
  if (!panel) return;
  var wrap = panel._atbRisOwnerWrap || panel.closest(".cult-atb-ris-chip-wrap");
  if (wrap) positionAtbRisHoverPanel(wrap);
}
function positionAtbRisHoverPanel(wrap) {
  var panel = panelAtbRisForWrap(wrap);
  var chip = wrap.querySelector(".atb-chip");
  if (!panel || !chip) return;
  closeAtbRisPanelsExcept(wrap);
  cancelHideAtbPanel(panel);
  panel._atbRisOwnerWrap = wrap;
  wrap._atbRisPanelEl = panel;
  if (panel.parentNode !== document.body) {
    document.body.appendChild(panel);
  }
  panel.classList.add("is-open");
  panel.style.visibility = "hidden";
  panel.style.left = "-9999px";
  panel.style.top = "0";
  void panel.offsetWidth;
  var chipRect = chip.getBoundingClientRect();
  var pr = panel.getBoundingClientRect();
  var pw = pr.width;
  var ph = pr.height;
  var margin = 8;
  var gap = 1;
  var vh = window.innerHeight;
  var vw = window.innerWidth;
  var top = chipRect.bottom + gap;
  if (top + ph > vh - margin) {
    var aboveTop = chipRect.top - gap - ph;
    if (aboveTop >= margin) top = aboveTop;
    else top = Math.max(margin, vh - margin - ph);
  }
  var left = chipRect.left;
  if (left + pw > vw - margin) left = vw - margin - pw;
  if (left < margin) left = margin;
  panel.style.left = left + "px";
  panel.style.top = top + "px";
  panel.style.visibility = "";
  panel.style.zIndex = "";
}
function wireAtbRisPanelHoverListeners(panel) {
  if (panel._atbRisPanelHoverListeners) return;
  panel._atbRisPanelHoverListeners = true;
  panel.addEventListener("mouseenter", function() {
    cancelHideAtbPanel(panel);
  });
  panel.addEventListener("mouseleave", function(ev) {
    var w = panel._atbRisOwnerWrap || panel.closest(".cult-atb-ris-chip-wrap");
    var toEl = ev.relatedTarget;
    if (toEl && w && (w.contains(toEl) || panel.contains(toEl))) return;
    scheduleHideAtbPanel(panel);
  });
}
function wireAtbRisHoverPanels(rootEl) {
  if (!rootEl) return;
  if (!_atbRisScrollResizeWired) {
    _atbRisScrollResizeWired = true;
    window.addEventListener("scroll", repositionOpenAtbRisPanel, true);
    window.addEventListener("resize", repositionOpenAtbRisPanel);
  }
  ensureAtbRisScrollRepositionOn(rootEl);
  var tableWrap = rootEl.querySelector && rootEl.querySelector(".cultivos-table-wrap");
  if (tableWrap) ensureAtbRisScrollRepositionOn(tableWrap);
  var cultTab = document.getElementById("itab-content-cult");
  if (cultTab) ensureAtbRisScrollRepositionOn(cultTab);
  if (!_atbRisDelegatedHoverRoots.has(rootEl)) {
    _atbRisDelegatedHoverRoots.add(rootEl);
    rootEl.addEventListener("mouseover", function(ev) {
      var t2 = ev.target;
      if (t2 && t2.nodeType !== 1) t2 = t2.parentElement;
      if (!t2 || !t2.closest) return;
      var wrap = t2.classList.contains("cult-atb-ris-chip-wrap") ? t2 : t2.closest(".cult-atb-ris-chip-wrap");
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
    rootEl.addEventListener("mouseout", function(ev) {
      var t2 = ev.target;
      if (t2 && t2.nodeType !== 1) t2 = t2.parentElement;
      if (!t2 || !t2.closest) return;
      var wrap = t2.classList.contains("cult-atb-ris-chip-wrap") ? t2 : t2.closest(".cult-atb-ris-chip-wrap");
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (!p) return;
      var toEl = ev.relatedTarget;
      if (toEl && (wrap.contains(toEl) || p.contains(toEl))) return;
      scheduleHideAtbPanel(p);
    });
    rootEl.addEventListener("focusin", function(ev) {
      var t2 = ev.target;
      if (t2 && t2.nodeType !== 1) t2 = t2.parentElement;
      if (!t2 || !t2.closest) return;
      var wrap = t2.classList.contains("cult-atb-ris-chip-wrap") ? t2 : t2.closest(".cult-atb-ris-chip-wrap");
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
    rootEl.addEventListener("focusout", function(ev) {
      var t2 = ev.target;
      if (t2 && t2.nodeType !== 1) t2 = t2.parentElement;
      if (!t2 || !t2.closest) return;
      var wrap = t2.classList.contains("cult-atb-ris-chip-wrap") ? t2 : t2.closest(".cult-atb-ris-chip-wrap");
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (!p) return;
      var rel = ev.relatedTarget;
      if (rel && (wrap.contains(rel) || p.contains(rel))) return;
      hideAtbRisHoverPanel(p);
    });
  }
  rootEl.querySelectorAll(".atb-ris-hover-panel").forEach(wireAtbRisPanelHoverListeners);
}
function removeAtbRisPanelsFromBody() {
  document.querySelectorAll("body > .atb-ris-hover-panel").forEach(function(p) {
    hideAtbRisHoverPanel(p);
  });
}

// public/js/features/expediente/expediente-cultivos-parse.mjs
var CULTIVO_TIPO_LABELS = {
  hemo: "Hemocultivo",
  uro: "Urocultivo",
  cateter: "Cultivo de cat\xE9ter",
  gram: "Tinci\xF3n Gram",
  fungi: "Fungicultivo",
  otro: "Otros cultivos"
};
function isCultureTableHeaderLine2(t2) {
  return isParsedCultivoHeaderLine(t2);
}
function classifyCultureTipoKeyFromHeaderLine(rawLine) {
  var s = String(rawLine || "").replace(/\s+/g, " ").trim();
  var beforeColon = (s.split(":")[0] || s).toUpperCase();
  if (/^HEMOCULTIVO\b/.test(beforeColon)) return "hemo";
  if (/^UROCULTIVO\b/.test(beforeColon)) return "uro";
  if (/^FUNGICULTIVO\b/.test(beforeColon)) return "fungi";
  if (/^TINCION(\s+DE)?\s+GRAM\b/.test(beforeColon)) return "gram";
  if (/^CATETER\b/.test(beforeColon)) return "cateter";
  return "otro";
}
function completePartialFechaForCultivo(dm, set) {
  if (!dm) return "";
  var parts = String(dm).trim().split("/");
  if (parts.length === 3) {
    var y3 = parts[2].length === 2 ? "20" + parts[2] : parts[2];
    var joined = parts[0].padStart(2, "0") + "/" + parts[1].padStart(2, "0") + "/" + y3;
    return normalizeFechaLabHistory(joined) || joined;
  }
  if (parts.length !== 2) return dm;
  var y = (/* @__PURE__ */ new Date()).getFullYear();
  if (set && set.fecha && set.fecha !== "Anterior") {
    var fd = normalizeFechaLabHistory(set.fecha) || String(set.fecha);
    var ms = parseFechaLabToMs(fd, "");
    if (typeof ms === "number" && isFinite(ms)) y = new Date(ms).getFullYear();
  }
  return parts[0].padStart(2, "0") + "/" + parts[1].padStart(2, "0") + "/" + y;
}
function cultureBlockLooksNegative(left, right) {
  var L = (left + " " + right).toUpperCase();
  if (!String(right || "").trim()) return true;
  return /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(L);
}
function parseCultureHeaderFields(rawHeader, set) {
  var line = String(rawHeader || "").replace(/\s+/g, " ").trim();
  var colon = line.indexOf(":");
  var left = colon >= 0 ? line.slice(0, colon).trim() : line;
  var right = colon >= 0 ? line.slice(colon + 1).trim() : "";
  var fechaMuestra = "";
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (dm) {
    fechaMuestra = completePartialFechaForCultivo(dm[1], set);
    sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, "").trim();
  }
  return { line, left, right, fechaMuestra, sitio };
}
function resolveCultureOrganismo(left, right) {
  var organismo = right.replace(/\s+/g, " ").trim();
  var negativo = cultureBlockLooksNegative(left, right);
  if (negativo && !organismo) organismo = "Negativo";
  else if (negativo && /^NEGATIVO$/i.test(organismo)) organismo = "Negativo";
  else if (!organismo) organismo = "\u2014";
  return { organismo, negativo };
}
function buildCultureRowObject(set, seq, tipoKey, studyDate, sortMs, header, org, cuenta, resStr) {
  var sortKeyMs = sortMs;
  if (header.fechaMuestra) {
    var fmNorm = normalizeFechaLabHistory(header.fechaMuestra) || header.fechaMuestra;
    var fmParsed = parseFechaLabToMs(fmNorm, "");
    if (typeof fmParsed === "number" && isFinite(fmParsed)) sortKeyMs = fmParsed;
  }
  return {
    row: {
      studyDate,
      fechaMuestra: header.fechaMuestra || "\u2014",
      sitio: header.sitio || "\u2014",
      organismo: org.organismo,
      cuenta: cuenta || "",
      resistencias: resStr || (org.negativo ? "\u2014" : ""),
      negativo: org.negativo,
      sortMs,
      sortKeyMs,
      tipoKey,
      tipoLabel: CULTIVO_TIPO_LABELS[tipoKey] || CULTIVO_TIPO_LABELS.otro,
      labSetId: set && set.id != null ? set.id : "",
      _seq: typeof seq === "number" ? seq : 0
    }
  };
}
function parseCultureBlockFromLineArray2(lines, set, seq) {
  var rawHeader = String(lines[0] || "");
  var tipoKey = classifyCultureTipoKeyFromHeaderLine(rawHeader);
  var studyDate = rt4.buildLabSetDateLine(set) || "\u2014";
  var sortMs = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof sortMs !== "number" || !isFinite(sortMs)) sortMs = 0;
  var header = parseCultureHeaderFields(rawHeader, set);
  var org = resolveCultureOrganismo(header.left, header.right);
  var bodyLines = lines.slice(1);
  var cuenta = parseCuentaFromCultivoChunkLines(bodyLines);
  var resStr = bodyLines.filter(function(ln) {
    var t2 = String(ln || "").trim();
    if (!t2 || /^Cuenta:/i.test(t2)) return false;
    if (/^USER\b/i.test(t2)) return false;
    if (/\bLabo\s*-?\d+/i.test(t2) && /\b(DJEG|UANL|Campo|Feme)\b/i.test(t2)) return false;
    return true;
  }).join("\n").trim();
  return buildCultureRowObject(set, seq, tipoKey, studyDate, sortMs, header, org, cuenta, resStr);
}
function cultivoChunkMatchesQuery(gq, q) {
  if (gq === q || gq.indexOf(q) !== -1 || q.indexOf(gq) !== -1) return true;
  var gTok = gq.split(/\s+/).filter(Boolean)[0] || "";
  var qTok = q.split(/\s+/).filter(Boolean)[0] || "";
  return gTok.length > 3 && qTok.length > 3 && (gTok === qTok || gq.indexOf(qTok) === 0 || q.indexOf(gTok) === 0);
}
function findCultivoChunkInSet2(set, organismoQuery) {
  if (!set || !set.resLabs) return null;
  var q = String(organismoQuery || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (!q || q === "\u2014") return null;
  var cult = rt4.splitResLabsByTipo(set.resLabs).cultivo;
  for (var ei = 0; ei < cult.length; ei++) {
    var chunks = String(cult[ei] || "").split(/\n\n+/).map(function(s) {
      return s.trim();
    }).filter(Boolean);
    for (var ci = 0; ci < chunks.length; ci++) {
      var head = chunks[ci].split(/\n/)[0] || "";
      var gq = germQueryFromCultivoChunkHead(head).replace(/\s+/g, " ").trim().toUpperCase();
      if (!gq) continue;
      if (cultivoChunkMatchesQuery(gq, q)) return chunks[ci];
    }
  }
  return null;
}
function copyCultivoCondensado(setId, organismo) {
  var pid = aid();
  if (!pid) {
    rt4.showToast("Selecciona un paciente", "error");
    return;
  }
  var sets = getLabHistory()[pid] || [];
  var set = sets.find(function(s) {
    return String(s.id) === String(setId);
  });
  if (!set) {
    rt4.showToast("No se encontr\xF3 el env\xEDo en historial", "error");
    return;
  }
  var chunk = findCultivoChunkInSet2(set, organismo);
  if (!chunk) {
    rt4.showToast("No hay resumen de cultivo procesado para copiar", "error");
    return;
  }
  var t2 = formatCultivoCondensedForCopy(chunk, rt4.buildLabSetDateLine(set) || "");
  if (!t2.trim()) {
    rt4.showToast("No hay texto para copiar", "error");
    return;
  }
  var p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t2) : Promise.reject(new Error("no clipboard"));
  p.then(
    function() {
      rt4.showToast("Cultivo condensado copiado", "success");
    },
    function() {
      rt4.showToast("No se pudo copiar al portapapeles", "error");
    }
  );
}
function germHintFromCultivoHeadLine(headLine) {
  var line = String(headLine || "").replace(/\s+/g, " ").trim();
  var colon = line.lastIndexOf(":");
  if (colon >= 0) {
    var right = line.slice(colon + 1).trim();
    if (right) return right;
  }
  return line;
}
function germQueryFromCultivoChunkHead(headLine) {
  var h = germHintFromCultivoHeadLine(headLine);
  var base = h.split(/\s*·\s*/)[0].trim();
  return base || h;
}
function isResLabChunkPureCultivo(text) {
  var sp = rt4.splitResLabsByTipo([text]);
  if (sp.labs.length) return false;
  return sp.cultivo.some(function(r) {
    return String(r || "").trim();
  });
}
function buildCultivoOutputHtmlFragments(text, sourceText) {
  var raw = String(text || "");
  var chunks = raw.split(/\n\n+/).map(function(s) {
    return s.trim();
  }).filter(Boolean);
  if (!chunks.length) return "";
  var parts = [];
  chunks.forEach(function(chunk) {
    var lines = chunk.split(/\n/);
    var germQuery = germQueryFromCultivoChunkHead(lines[0] || "");
    var sens = sourceText ? extractSensCrudasForGermFromSource(sourceText, germQuery) : null;
    lines.forEach(function(lineRaw) {
      var t2 = String(lineRaw || "").trim();
      if (!t2) return;
      if (/^USER\b/i.test(t2)) return;
      if (/\bLabo\s*-?\d+/i.test(t2) && /\b(DJEG|UANL|Campo|Feme)\b/i.test(t2)) return;
      if (/^ATB\b/i.test(t2) && sens && sens.length) {
        parts.push(
          '<div class="out-line cultivos-atb-chips lab-out-atb">' + buildAtbRisSummaryHtml(sens) + "</div>"
        );
        return;
      }
      renderEntry(lineRaw).forEach(function(html, idx) {
        parts.push('<div class="' + (idx === 0 ? "out-line" : "out-indent") + '">' + html + "</div>");
      });
    });
  });
  return parts.join("");
}

// public/js/features/cultivo-queue-model.mjs
function chunkHasAntibiograma(chunkText) {
  var t2 = String(chunkText || "");
  if (!t2.trim()) return false;
  if (/^ATB\b/im.test(t2) && /ATB\s*:.+/i.test(t2)) return true;
  var up = t2.toUpperCase();
  var idx = up.indexOf("ANTIBIOGRAMA");
  if (idx === -1) return false;
  var after = t2.slice(idx + "ANTIBIOGRAMA".length);
  if (!String(after).replace(/[\s*]+/g, "")) return false;
  return /\b(SENSIBLE|RESISTENTE|INTERMED|SUSCEPTIBLE|INDETER)\b/i.test(after) || /\b[SIR]\b/.test(after.toUpperCase()) || /^\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s./-]{2,}\s*$/im.test(after);
}
function cultivoNeedsAtbFollowUp(row, chunkText) {
  if (!row || row.negativo) return false;
  if (chunkHasAntibiograma(chunkText)) return false;
  return true;
}
function sectionLines(sec) {
  return String(sec || "").split(/\r?\n/).map(function(l) {
    return l.replace(/\*+$/g, "").trim();
  }).filter(Boolean);
}
function splitCultivoSections(chunkEntry) {
  return String(chunkEntry || "").split(/\n\n+/).map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function candidateFecha(row, set) {
  if (row.fechaMuestra && row.fechaMuestra !== "\u2014") return row.fechaMuestra;
  return normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim() || "\u2014";
}
function candidateFromSection(set, sec, seq, setById) {
  var lines = sectionLines(sec);
  if (!lines.length || !isCultureTableHeaderLine(lines[0])) return null;
  var parsed = parseCultureBlockFromLineArray(lines, set, seq);
  var row = parsed && parsed.row;
  if (!row || row.negativo) return null;
  var fullSet = setById[String(row.labSetId)] || set;
  var chunk = findCultivoChunkInSet(fullSet, row.organismo) || sec;
  return {
    sitio: String(row.sitio || "\u2014"),
    organismo: String(row.organismo || "\u2014"),
    fecha: candidateFecha(row, set),
    negativo: !!row.negativo,
    sortKeyMs: row.sortKeyMs != null ? row.sortKeyMs : row.sortMs || 0,
    labSetId: String(row.labSetId || ""),
    chunk: String(chunk || "")
  };
}
function extractCultivoFollowUpCandidates(labHistory) {
  var rows = [];
  var seq = 0;
  var setById = /* @__PURE__ */ Object.create(null);
  sortLabHistoryChronological(labHistory || []).forEach(function(set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    if (set.id != null) setById[String(set.id)] = set;
    splitResLabsByTipo(set.resLabs).cultivo.forEach(function(chunkEntry) {
      splitCultivoSections(chunkEntry).forEach(function(sec) {
        var cand = candidateFromSection(set, sec, seq++, setById);
        if (cand) rows.push(cand);
      });
    });
  });
  return rows;
}
function classifyCultivoFollowUps(candidates, _note, _normalizeFecha) {
  var items = [];
  (candidates || []).forEach(function(c) {
    if (!c || c.negativo) return;
    var reasons = [];
    if (cultivoNeedsAtbFollowUp(c, c.chunk)) reasons.push("atb_pendiente");
    if (!reasons.length) return;
    items.push({
      sitio: c.sitio,
      organismo: c.organismo,
      fecha: c.fecha,
      reasons
    });
  });
  items.sort(function(a, b) {
    return String(b.fecha).localeCompare(String(a.fecha), "es");
  });
  return items;
}

// public/js/features/cultivo-queue-refresh.mjs
function cultivoFechaToIsoDay(fechaStr) {
  var ms = parseFechaLabToMs(fechaStr, "");
  if (ms == null || !isFinite(ms)) return null;
  return labRepoToDateInputValue(new Date(ms));
}
function cultureDateRangeFromItems(items) {
  var days = [];
  (items || []).forEach(function(it) {
    var iso = cultivoFechaToIsoDay(it && it.fecha);
    if (iso) days.push(iso);
  });
  if (!days.length) return null;
  days.sort();
  return { desde: days[0], hasta: days[days.length - 1] };
}
function patientById(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid) return null;
  var list = getPatients() || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && String(list[i].id) === pid) return list[i];
  }
  return null;
}
function findPatientByRegistro2(registro) {
  var reg = String(registro || "").trim();
  if (!reg) return null;
  var list = getPatients() || [];
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    if (p && String(p.registro || "").trim() === reg) return p;
  }
  return null;
}
function pendingAtbCultivoItemsForPatient(patientId, historyByPatient) {
  var pid = String(patientId || "").trim();
  if (!pid) return [];
  var map = historyByPatient || getLabHistory();
  var candidates = extractCultivoFollowUpCandidates(map[pid] || []);
  return classifyCultivoFollowUps(candidates, null, normalizeFechaLabHistory);
}
async function refreshPatientCultivoLabsFromRepo(patientId) {
  var items = pendingAtbCultivoItemsForPatient(patientId);
  if (!items.length) return { ok: false, reason: "no-pending" };
  return refreshCultivoLabsForPatient(patientId, items);
}
function resolveCultivoRefreshInputs(patientId, items) {
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    return { reason: "desktop-only" };
  }
  var p = patientById(patientId);
  var registro = p && p.registro ? String(p.registro).trim() : "";
  if (!registro) return { reason: "no-registro" };
  var dayRange = cultureDateRangeFromItems(items);
  if (!dayRange) return { reason: "no-fecha" };
  var range = labRepoFetchRangeFromDateInputs(dayRange.desde, dayRange.hasta);
  if (!range) return { reason: "bad-range" };
  return { registro, range };
}
function outcomeFromLabRepoFetchKind(kind) {
  if (kind === "connection") return { ok: false, kind: "connection" };
  if (kind === "error") return { ok: false, kind: "error" };
  if (kind === "empty") return { ok: true, kind: "empty" };
  return null;
}
async function applyCultivoLabRepoBatch(patientId, registro, studies, errors) {
  await import("/mobile/js/chunks/lazy-feature-routes-SSSCCZIU.js").then(function(routes) {
    return routes.ensureLabsLoaded();
  });
  applyBatchStudyGroups(
    [{ row: { id: String(patientId), registro }, studies, errors }],
    { findPatientByRegistro: findPatientByRegistro2 }
  );
}
async function refreshCultivoLabsForPatient(patientId, items) {
  var inputs = resolveCultivoRefreshInputs(patientId, items);
  if ("reason" in inputs) return { ok: false, reason: inputs.reason };
  var registro = inputs.registro;
  var range = inputs.range;
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString()
    });
    var studies = res && res.studies || [];
    var errors = res && res.errors || [];
    var kind = classifyLabRepoBatchFetch(studies, errors);
    var early = outcomeFromLabRepoFetchKind(kind);
    if (early) return early;
    await applyCultivoLabRepoBatch(patientId, registro, studies, errors);
    return { ok: true, kind: "imported" };
  } catch (_err) {
    void _err;
    return { ok: false, kind: "throw" };
  }
}
function cultivoRefreshOutcomeMessage(outcome) {
  var o = outcome || {};
  if (o.reason === "no-pending") {
    return { toast: "No hay cultivos con ATB pendiente en este paciente", type: "info" };
  }
  if (o.reason === "desktop-only") {
    return { toast: "Actualizar cultivos solo en la app de escritorio", type: "warn" };
  }
  if (o.reason === "no-registro") {
    return { toast: "Paciente sin registro \u2014 no se puede consultar el repositorio", type: "error" };
  }
  if (o.reason === "no-fecha" || o.reason === "bad-range") {
    return { toast: "Sin fecha de cultivo para consultar", type: "error" };
  }
  if (o.kind === "connection") {
    return { toast: "No se pudo conectar al repositorio de laboratorio", type: "error" };
  }
  if (o.kind === "empty") {
    return { toast: "Sin resultados nuevos en esa fecha", type: "info" };
  }
  if (o.kind === "error" || o.kind === "throw" || !o.ok) {
    return { toast: "Error al consultar el repositorio", type: "error" };
  }
  return { toast: "Labs actualizados \u2014 revisa si ya sali\xF3 el antibiograma", type: "ok" };
}

// public/js/features/expediente/expediente-cultivos-table.mjs
var CULTIVO_TIPO_ORDER = ["hemo", "uro", "cateter", "gram", "fungi", "otro"];
var CULTIVO_TIPO_LABELS2 = {
  hemo: "Hemocultivo",
  uro: "Urocultivo",
  cateter: "Cultivo de cat\xE9ter",
  gram: "Tinci\xF3n Gram",
  fungi: "Fungicultivo",
  otro: "Otros cultivos"
};
function cultivoOrganismoCellHtml(r) {
  var html = esc(r.organismo);
  if (r.cuenta && !r.negativo) {
    html += '<div class="cultivos-cuenta">' + esc(r.cuenta) + "</div>";
  }
  return html;
}
function cultivoAntibiogramCellHtml(r) {
  return buildCultivoAntibiogramCellHtmlForPatient(r, aid());
}
function extractCultivoTableRowsFromHistory(patientId) {
  var history = sortLabHistoryChronological(rt4.ensureParsedLabHistory(patientId));
  var rows = [];
  var seq = 0;
  history.forEach(function(set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = rt4.splitResLabsByTipo(set.resLabs).cultivo;
    cult.forEach(function(chunk) {
      var sections = String(chunk || "").split(/\n\n+/).map(function(s) {
        return s.trim();
      }).filter(Boolean);
      sections.forEach(function(sec) {
        var lines = sec.split(/\r?\n/).map(function(l) {
          return l.replace(/\*+$/g, "").trim();
        }).filter(function(l) {
          return l;
        });
        if (!lines.length) return;
        if (!isCultureTableHeaderLine2(lines[0])) return;
        rows.push(parseCultureBlockFromLineArray2(lines, set, seq++).row);
      });
    });
  });
  return rows;
}
function groupCultivoRowsByTipoChronologic(rows) {
  var byKey = /* @__PURE__ */ Object.create(null);
  rows.forEach(function(r) {
    var k = r.tipoKey || "otro";
    if (!byKey[k]) byKey[k] = [];
    byKey[k].push(r);
  });
  CULTIVO_TIPO_ORDER.forEach(function(k) {
    if (!byKey[k]) return;
    byKey[k].sort(function(a, b) {
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return db - da;
      return (b._seq || 0) - (a._seq || 0);
    });
  });
  return CULTIVO_TIPO_ORDER.filter(function(k) {
    return byKey[k] && byKey[k].length;
  }).map(function(k) {
    return {
      key: k,
      label: CULTIVO_TIPO_LABELS2[k] || CULTIVO_TIPO_LABELS2.otro,
      rows: byKey[k]
    };
  });
}
function filterCultivoRowsSignificantFlip(rows) {
  function seriesKey(r) {
    return (r.tipoKey || "otro") + "" + String(r.sitio || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  var bySeries = /* @__PURE__ */ Object.create(null);
  rows.forEach(function(r) {
    var k = seriesKey(r);
    if (!bySeries[k]) bySeries[k] = [];
    bySeries[k].push(r);
  });
  var out = [];
  Object.keys(bySeries).forEach(function(k) {
    var arr = bySeries[k].slice().sort(function(a, b) {
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return da - db;
      return (a._seq || 0) - (b._seq || 0);
    });
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (!r.negativo) {
        out.push(r);
        continue;
      }
      var prev = arr[i - 1];
      var next = arr[i + 1];
      if (prev && !prev.negativo || next && !next.negativo) out.push(r);
    }
  });
  return out;
}
var _cultivosTableCacheKey = "";
var CULTIVOS_CHUNK_ROWS = 40;
var _cultivoRefreshBusy = false;
var _cultivoToolbarWired = false;
function buildCultivosToolbarHtml(patientId) {
  var pending = pendingAtbCultivoItemsForPatient(patientId).length;
  var title = pending > 0 ? "Buscar antibiograma en el repositorio para " + pending + " cultivo" + (pending === 1 ? "" : "s") + " con ATB pendiente" : "Consultar repositorio (no hay cultivos con ATB pendiente)";
  var btnClass = "tend-toolbar-btn cultivo-refresh-repo-btn";
  if (pending === 0) btnClass += " cultivo-refresh-idle";
  return '<div class="cultivos-toolbar"><button type="button" class="' + btnClass + '"' + (_cultivoRefreshBusy ? ' disabled aria-busy="true"' : "") + ' title="' + esc(title) + '">Actualizar</button><p class="cultivos-table-hint">Por categor\xEDa (tipo de estudio), orden cronol\xF3gico de m\xE1s reciente a m\xE1s antiguo.</p></div>';
}
function wireCultivosToolbarOnce() {
  if (_cultivoToolbarWired) return;
  var container = document.getElementById("cultivos-table-container");
  if (!container) return;
  _cultivoToolbarWired = true;
  container.addEventListener("click", function(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest(".cultivo-refresh-repo-btn") : null;
    if (!btn || btn.disabled) return;
    ev.preventDefault();
    void handleCultivoRefreshClick();
  });
}
async function handleCultivoRefreshClick() {
  var pid = aid();
  if (!pid || _cultivoRefreshBusy) return;
  _cultivoRefreshBusy = true;
  invalidateCultivosTableCache();
  renderCultivosTable();
  try {
    var outcome = await refreshPatientCultivoLabsFromRepo(pid);
    var msg = cultivoRefreshOutcomeMessage(outcome);
    rt4.showToast(msg.toast, msg.type);
  } finally {
    _cultivoRefreshBusy = false;
    invalidateCultivosTableCache();
    renderCultivosTable();
  }
}
function invalidateCultivosTableCache() {
  _cultivosTableCacheKey = "";
}
var CULTIVOS_CHUNKED_THRESHOLD = 72;
function renderCultivosTableBodyChunked(container, shellHtml, rowChunks, onDone) {
  container.innerHTML = shellHtml;
  var tbody = container.querySelector(".cultivos-table tbody");
  if (!tbody || !rowChunks.length) {
    onDone();
    return;
  }
  var i = 0;
  function appendChunk() {
    var end = Math.min(i + CULTIVOS_CHUNK_ROWS, rowChunks.length);
    for (; i < end; i += 1) {
      tbody.insertAdjacentHTML("beforeend", rowChunks[i]);
    }
    if (i < rowChunks.length) {
      scheduleIdle(appendChunk, 12);
      return;
    }
    onDone();
  }
  scheduleIdle(appendChunk, 0);
}
function rowFechaDisplay(r) {
  if (r.fechaMuestra && r.fechaMuestra !== "\u2014") return r.fechaMuestra;
  return r.studyDate || "\u2014";
}
function buildCultivosNegStrip(negs) {
  if (!negs.length) return "";
  var chips = negs.map(function(r) {
    var fd = rowFechaDisplay(r);
    var sitio = r.sitio || "\u2014";
    return '<li class="cultivos-neg-chip"><span class="cultivos-neg-chip-tipo">' + esc(r.tipoLabel || "") + "</span> \xB7 " + esc(fd) + " \xB7 " + esc(sitio) + "</li>";
  }).join("");
  return '<div class="cultivos-neg-strip" role="status"><div class="cultivos-neg-header"><strong>Cultivos negativos</strong><span class="cultivos-neg-count">' + negs.length + '</span></div><p class="cultivos-neg-hint">En la tabla, por tipo y fecha</p><ul class="cultivos-neg-chips">' + chips + "</ul></div>";
}
function collectCultivoTableRowChunks(groups, rowFechaDisplayFn) {
  var rowChunks = [];
  var totalRows = 0;
  groups.forEach(function(g) {
    rowChunks.push('<tr class="cultivos-section-row"><td colspan="4">' + esc(g.label) + "</td></tr>");
    g.rows.forEach(function(r) {
      totalRows += 1;
      rowChunks.push(
        '<tr class="' + (r.negativo ? "cultivos-row-neg" : "") + '"><td>' + esc(rowFechaDisplayFn(r)) + "</td><td>" + esc(r.sitio) + '</td><td class="cultivos-cell-org">' + cultivoOrganismoCellHtml(r) + '</td><td class="cultivos-cell-atb">' + cultivoAntibiogramCellHtml(r) + "</td></tr>"
      );
    });
  });
  return { rowChunks, totalRows };
}
function renderCultivosTable() {
  var container = document.getElementById("cultivos-table-container");
  if (!container) return;
  wireCultivosToolbarOnce();
  var pid = aid();
  if (pid) {
    var cultKey = String(pid) + "|L" + getLabHistoryRevision(pid);
    if (_cultivosTableCacheKey === cultKey && container.querySelector(".cultivos-table")) {
      return;
    }
    _cultivosTableCacheKey = cultKey;
  } else {
    _cultivosTableCacheKey = "";
  }
  removeAtbRisPanelsFromBody();
  if (!aid()) {
    container.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    if (isPaseMode()) rt4.renderPaseBoard();
    return;
  }
  var flatRows = extractCultivoTableRowsFromHistory(aid());
  if (!flatRows.length) {
    container.innerHTML = '<p class="tend-empty">No hay cultivos en el historial. Aparecen urocultivos, hemocultivos, tinci\xF3n Gram y cultivos de cat\xE9ter enviados desde Laboratorio.</p>';
    if (isPaseMode()) rt4.renderPaseBoard();
    return;
  }
  var groups = groupCultivoRowsByTipoChronologic(flatRows);
  var negs = flatRows.filter(function(r) {
    return r.negativo;
  }).sort(function(a, b) {
    var oa = CULTIVO_TIPO_ORDER.indexOf(a.tipoKey || "otro");
    var ob = CULTIVO_TIPO_ORDER.indexOf(b.tipoKey || "otro");
    if (oa !== ob) return oa - ob;
    var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
    var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
    if (da !== db) return db - da;
    return (b._seq || 0) - (a._seq || 0);
  });
  var negStrip = buildCultivosNegStrip(negs);
  var toolbar = buildCultivosToolbarHtml(aid());
  var thead = "<thead><tr><th>Fecha</th><th>Sitio / muestra</th><th>Organismo</th><th>Antibiograma</th></tr></thead>";
  var built = collectCultivoTableRowChunks(groups, rowFechaDisplay);
  var finishTable = function() {
    wireAtbRisHoverPanels(container);
    if (isPaseMode()) rt4.renderPaseBoard();
  };
  if (built.totalRows > CULTIVOS_CHUNKED_THRESHOLD) {
    var shellHtml = negStrip + toolbar + '<div class="cultivos-table-wrap"><table class="cultivos-table">' + thead + "<tbody></tbody></table></div>";
    renderCultivosTableBodyChunked(container, shellHtml, built.rowChunks, finishTable);
    return;
  }
  container.innerHTML = negStrip + toolbar + '<div class="cultivos-table-wrap"><table class="cultivos-table">' + thead + "<tbody>" + built.rowChunks.join("") + "</tbody></table></div>";
  finishTable();
}
var _tendRefreshTimer = null;
function refreshTendenciasOrCultivosPanel() {
  if (rt4.getActiveAppTab() !== "nota" && rt4.getActiveAppTab() !== "lab") return;
  if (_tendRefreshTimer) clearTimeout(_tendRefreshTimer);
  _tendRefreshTimer = setTimeout(function() {
    _tendRefreshTimer = null;
    if (rt4.getActiveInner() === "tend") rt4.renderTendencias();
    else if (rt4.getActiveInner() === "cult") renderCultivosTable();
  }, TREND_REFRESH_DEBOUNCE_MS);
}

// public/js/features/expediente/expediente-cultivos-pase.mjs
function formatPaseCultivoResistenciasHtml(raw) {
  var t2 = esc(String(raw || ""));
  t2 = t2.replace(/\bR:/g, '<span class="pase-atb-tag pase-atb-tag--r">R:</span>');
  t2 = t2.replace(/\bI:/g, '<span class="pase-atb-tag pase-atb-tag--i">I:</span>');
  t2 = t2.replace(/\bS:/g, '<span class="pase-atb-tag pase-atb-tag--s">S:</span>');
  return t2;
}
function paseCultivoAtbBlockHtml(patientId, r) {
  var sets = getLabHistory()[patientId] || [];
  var set = sets.find(function(s) {
    return String(s.id) === String(r.labSetId);
  });
  var sens = set && set.sourceText ? extractSensCrudasForGermFromSource(set.sourceText, r.organismo) : null;
  if (sens && sens.length) {
    return '<div class="pase-cult-atb-wrap"><div class="cultivos-atb-chips pase-cult-atb-chips" role="list">' + buildAtbRisSummaryHtml(sens) + "</div></div>";
  }
  var resH = r.resistencias && String(r.resistencias).trim() ? '<div class="pase-cult-atb">' + formatPaseCultivoResistenciasHtml(r.resistencias) + "</div>" : "";
  if (resH) {
    return '<div class="pase-cult-atb-wrap">' + resH + "</div>";
  }
  return "";
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
  const loadSettings2 = deps && deps.loadSettings || docExportRt.loadSettings;
  if (typeof getSettings === "function") {
    getSettings().outputDir = dir;
    localStorage.setItem("rpc-settings", JSON.stringify(getSettings()));
  }
  syncApprovedOutputDir(dir);
  if (typeof loadSettings2 === "function") loadSettings2();
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
  const loadSettings2 = deps && deps.loadSettings || docExportRt.loadSettings;
  return handleOutputDirFallback({
    response: opts.response,
    selectOutputDir: getOutputDirSelector(),
    saveOutputDir: function(dir) {
      saveOutputDirSelection(dir, { getSettings, loadSettings: loadSettings2 });
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
function shouldShowLocalServerOfflineBanner(isRpcOffline2) {
  return !!isRpcOffline2 && !canGenerateDocumentsOffline();
}
function isDocExportBlockedByLocalServer(isRpcOffline2) {
  return shouldShowLocalServerOfflineBanner(isRpcOffline2);
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

// public/js/listado-problemas-ai-prompt.mjs
var LISTADO_PROBLEMAS_AI_PROMPT = `prompt:
LISTADO DE PROBLEMAS
CON BASE EN TODOS LOS DATOS CL\xCDNICOS PROPORCIONADOS, GENERA UN LISTADO DE
PROBLEMAS DIVIDIDO EN ACTIVOS E INACTIVOS. S\xC9 CONCISO. EL OUTPUT COMPLETO
NO DEBE EXCEDER DOS HOJAS.

--- PROBLEMAS ACTIVOS ---
(INCLUYE: DIAGN\xD3STICO PRINCIPAL, ENFERMEDADES DE BASE, COMPLICACIONES ACTIVAS,
CONDICIONES EN CURSO)

PROBLEMA X: [NOMBRE] \u2192 [ESCALA/CLASIFICACI\xD3N/ESTADIO SI APLICA]
A) CL\xCDNICA: [S\xCDNTOMAS RELEVANTES]
B) EXPLORACI\xD3N F\xCDSICA: [HALLAZGOS PERTINENTES]
C) PARACL\xCDNICA: [SOLO RESULTADOS ALTERADOS CON VALOR E INTERPRETACI\xD3N]
D) IMAGEN: [HALLAZGO RELEVANTE]

--- PROBLEMAS INACTIVOS ---
(INCLUYE: ANTECEDENTES RESUELTOS, TABAQUISMO/ALCOHOLISMO SUSPENDIDO,
CIRUG\xCDAS PREVIAS, ENFERMEDADES YA RESUELTAS)

PROBLEMA X: [NOMBRE]
A) [DESCRIPCI\xD3N BREVE DEL ANTECEDENTE]

REGLAS DE FORMATO:

SI UN INCISO NO APLICA O NO HAY DATOS, OMITIRLO COMPLETAMENTE.
EJEMPLO: SI NO HAY IMAGEN, NO PONER D). SI NO HAY PARACL\xCDNICA ALTERADA,
NO PONER C).
SOLO RESULTADOS ALTERADOS EN PARACL\xCDNICA, NUNCA VALORES NORMALES.
EL PROBLEMA 1 ACTIVO SIEMPRE ES EL DIAGN\xD3STICO PRINCIPAL.
SI HAY GASOMETR\xCDA: CALCULAR ANI\xD3N GAP, WINTERS Y ESTADO DE COMPENSACI\xD3N
DENTRO DEL INCISO C) DEL PROBLEMA CORRESPONDIENTE.
AL FINAL INDICAR "DIAGN\xD3STICOS A CONFIRMAR:" SI ALGUNO ES DUDOSO.
SIN TRATAMIENTO, SIN MANEJO, SIN TEXTO INNECESARIO.
TODO EN MAY\xDASCULAS.
REGLAS DE AGRUPACI\xD3N:

NO SEPARAR LO QUE ES PARTE DEL MISMO PROCESO CL\xCDNICO. SI UN HALLAZGO ES
CONSECUENCIA DIRECTA Y ESPERABLE DEL PROBLEMA PRINCIPAL, VA DENTRO DE ESE
PROBLEMA EN EL INCISO CORRESPONDIENTE, NO COMO PROBLEMA APARTE.
EJEMPLO: NEUMON\xCDA CON HIPOXEMIA \u2192 LA HIPOXEMIA VA DENTRO DE LA NEUMON\xCDA.
SOLO SEPARAR COMO PROBLEMA DISTINTO SI TIENE ENTIDAD PROPIA, MANEJO
INDEPENDIENTE O ETIOLOG\xCDA DIFERENTE.
INTENTAR LIGAR CADA PROBLEMA AL PRINCIPAL. SI NO SE PUEDE, LISTARLO COMO
PROBLEMA SEPARADO SIN ETIQUETA ADICIONAL.
REGLAS DE ETIOLOG\xCDA:

CORRELACIONAR SIEMPRE LA ETIOLOG\xCDA CON EL PERFIL DEL PACIENTE: EDAD, SEXO,
ANTECEDENTES Y CONTEXTO CL\xCDNICO.
SI LA ETIOLOG\xCDA NO ENCAJA CON EL PERFIL, NO ASIGNARLA. MARCARLA COMO
"ETIOLOG\xCDA A DETERMINAR" Y LISTAR ALTERNATIVAS DIAGN\xD3STICAS PERTINENTES.
EJEMPLO: BLOQUEO AV TERCER GRADO EN PACIENTE DE 45 A\xD1OS \u2192 NO ASUMIR
DEGENERATIVO. CONSIDERAR: LYME, SARCOIDOSIS, MIOCARDITIS, ISQUEMIA,
F\xC1RMACOS, CHAGAS.
ESTA REGLA APLICA TAMBI\xC9N EN PLANES INICIALES.
PLANES INICIALES
REDACTAR UN P\xC1RRAFO ESTRUCTURADO POR CADA UNO DE LOS SIGUIENTES EJES, TODO EN
MAY\xDASCULAS, SIN INVENTAR DATOS, BAS\xC1NDOSE \xDANICAMENTE EN LO MENCIONADO EN EL
INTERROGATORIO Y EXPEDIENTE. CADA EJE DEBE SER CONSISTENTE CON LOS PROBLEMAS
ACTIVOS E INACTIVOS YA IDENTIFICADOS EN EL LISTADO DE PROBLEMAS, SIN
CONTRADICCIONES NI REPETICIONES INNECESARIAS:

EXPLICAR LA CAUSA DE BASE DE LA ENFERMEDAD
PRINCIPAL Y EL MECANISMO FISIOPATOL\xD3GICO QUE LLEV\xD3 AL CUADRO ACTUAL,
REFERENCIANDO LOS PROBLEMAS ACTIVOS CORRESPONDIENTES.

DESCRIBIR LOS ELEMENTOS CL\xCDNICOS, BIOQU\xCDMICOS, RADIOL\xD3GICOS
Y/O PATOL\xD3GICOS QUE SUSTENTAN EL DIAGN\xD3STICO PRINCIPAL Y LOS DIAGN\xD3STICOS
ASOCIADOS, SIENDO CONSISTENTE CON LA CLASIFICACI\xD3N Y ESTADIO YA ESTABLECIDOS
EN EL LISTADO DE PROBLEMAS.

DETALLAR EL TRATAMIENTO INSTAURADO EN EL SERVICIO, INCLUYENDO PROCEDIMIENTOS REALIZADOS, ESQUEMAS FARMACOL\xD3GICOS Y RESPUESTA CL\xCDNICA DOCUMENTADA.

ESTABLECER EL PRON\xD3STICO PARA LA FUNCI\xD3N DEL \xD3RGANO O SISTEMA AFECTADO PRINCIPAL Y EL PRON\xD3STICO VITAL, VINCUL\xC1NDOLO A LAS CONDICIONES CL\xCDNICAS ACTUALES, COMPLICACIONES POTENCIALES Y PROBLEMAS ACTIVOS IDENTIFICADOS.`;

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

// public/js/features/profile-runtime.mjs
var rt5 = {
  showToast() {
  },
  syncWorkContextChrome() {
  },
  getActiveId() {
    return null;
  }
};
function registerProfileRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt5, ctx);
}
function getProfileRuntime() {
  return rt5;
}
var profileGetSettings = function() {
  return (
    /** @type {Record<string, unknown>} */
    {}
  );
};
function attachProfileSettingsGetter(getter) {
  profileGetSettings = getter;
}
function settingsRef() {
  return profileGetSettings();
}
var _lastLoadSettingsSnapshot = null;
function normalizeQuickOutputFormat(format) {
  var normalized = String(format || "").trim().toLowerCase();
  if (normalized !== "html" && normalized !== "txt" && normalized !== "docx") return "docx";
  return normalized;
}
function buildLoadSettingsSnapshot() {
  var st = settingsRef();
  if (!st) return "";
  try {
    var fields = {
      d: st.doctorName,
      c: st.cedulaProfesional,
      p: st.profesorName,
      r2: st.residenteR2,
      r1: st.residenteR1,
      r1a: st.residenteR1a,
      r1b: st.residenteR1b,
      cs: st.censoSala,
      ct: st.censoTorre,
      g: st.grado,
      di: st.defaultDieta,
      cu: st.defaultCuidados,
      me: st.defaultMedicamentos,
      ne: st.defaultNotaEvolucion,
      ns: st.defaultNotaEstudios,
      od: st.outputDir,
      qf: st.quickOutputFormat,
      am: st.appMode
    };
    var normalized = {};
    Object.keys(fields).forEach(function(key) {
      var val = fields[key];
      normalized[key] = key === "qf" ? normalizeQuickOutputFormat(val) : val || "";
    });
    normalized.am = normalized.am || "sala";
    return JSON.stringify(normalized);
  } catch {
    return String(Math.random());
  }
}
function invalidateLoadSettingsSnapshot() {
  _lastLoadSettingsSnapshot = null;
}
function getLastLoadSettingsSnapshot() {
  return _lastLoadSettingsSnapshot;
}
function setLastLoadSettingsSnapshot(value) {
  _lastLoadSettingsSnapshot = value;
}
function persistSettingsToLocalStorage() {
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(settingsRef()));
  } catch {
    rt5.showToast(
      "No se pudo guardar en el almacenamiento local. El modo puede no persistir al recargar.",
      "error"
    );
  }
}
function syncAppModeRadioControls() {
  var st = settingsRef();
  var modeSala = document.getElementById("app-mode-sala");
  var modeInter = document.getElementById("app-mode-inter");
  if (!modeSala || !modeInter) return;
  if ((st.appMode || "sala") === "sala") modeSala.checked = true;
  else modeInter.checked = true;
}

// public/js/features/profile-load-fields.mjs
function resolveCensoSalaValue(st) {
  var ubic = st.censoSala || "";
  if (!ubic && st.censoTorre) ubic = "torre";
  if (/^torre/i.test(ubic) && ubic !== "torre") ubic = "torre";
  return ubic;
}
function syncProfileToggleLabel(st) {
  var lbl = document.getElementById("profile-toggle-label");
  var profileTitle = "Mi Perfil";
  if (!lbl) return profileTitle;
  if (st.doctorName || st.grado) {
    var parts = [];
    if (st.doctorName) parts.push(st.doctorName);
    if (st.grado) parts.push(st.grado);
    profileTitle = parts.join(" \xB7 ");
  }
  lbl.textContent = profileTitle;
  var profileBtn = document.getElementById("profile-toggle-btn");
  if (profileBtn) {
    profileBtn.setAttribute("title", profileTitle);
    profileBtn.setAttribute("aria-label", profileTitle);
  }
  return profileTitle;
}
function populateProfileIdentityFields(st) {
  var fields = [
    ["profile-doctor", st.doctorName],
    ["profile-cedula", st.cedulaProfesional],
    ["profile-profesor", st.profesorName],
    ["profile-r2", st.residenteR2],
    ["profile-r1a", st.residenteR1a || st.residenteR1],
    ["profile-r1b", st.residenteR1b],
    ["profile-maestro", st.profesorName],
    ["profile-censo-fimi-label", st.censoFimiLabel],
    ["profile-grado", st.grado]
  ];
  fields.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.value = pair[1] || "";
  });
  var censoSalaEl = document.getElementById("profile-censo-sala");
  if (censoSalaEl) censoSalaEl.value = resolveCensoSalaValue(st);
  syncAppModeRadioControls();
  var srvEl = document.getElementById("settings-default-servicio");
  if (srvEl) srvEl.value = st.defaultServicio || "";
  var medTpl = st.medicosPlantilla || {};
  ["profesor", "r4", "r2", "r1a", "r1b"].forEach(function(k) {
    var el = document.getElementById("settings-medico-" + k);
    if (el) el.value = medTpl[k] || "";
  });
  syncProfileToggleLabel(st);
}
function populateProfileOutputFields(st) {
  var dirEl = document.getElementById("settings-output-dir");
  if (dirEl) {
    if (st.outputDir) {
      var pathParts = st.outputDir.replace(/\\/g, "/").split("/");
      dirEl.textContent = pathParts[pathParts.length - 1] || st.outputDir;
      dirEl.title = st.outputDir;
    } else {
      dirEl.textContent = "Descargas (predeterminado)";
      dirEl.title = "";
    }
    syncApprovedOutputDir(st.outputDir || "");
  }
  var quickFormatEl = document.getElementById("settings-quick-output-format");
  if (quickFormatEl) quickFormatEl.value = normalizeQuickOutputFormat(st.quickOutputFormat);
}

// public/js/features/profile-load-platform.mjs
function populateProfileVersionBlock() {
  var verEl = document.getElementById("settings-app-version");
  if (!verEl) return;
  if (!window.electronAPI || typeof window.electronAPI.getAppVersion !== "function") {
    verEl.textContent = "Web / desarrollo";
    return;
  }
  window.electronAPI.getAppVersion().then(async function(v) {
    verEl.textContent = v || "\u2014";
    var LAST_SEEN_VERSION_KEY = "rplus-last-seen-app-version";
    var prev = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    if (prev) window.__RPC_PREV_APP_VERSION__ = prev;
    var versionChanged = !!(prev && v && prev !== v);
    if (versionChanged) {
      getProfileRuntime().showToast(
        "Actualizado a v" + v + ". Consulta Ajustes o el men\xFA para buscar actualizaciones.",
        "success"
      );
    }
    if (versionChanged || window.__RPC_RELEASE_NOTES_DEV__) {
      var notes = await import("/mobile/js/chunks/release-notes-RKLJQXOM.js");
      if (notes.RELEASE_NOTES_DEV_FORCE_SHOW) {
        notes.initReleaseNotesDevPreviewIfEnabled(v);
      } else if (versionChanged) {
        notes.maybeShowReleaseNotesFor(v, prev);
      }
    }
    if (v) localStorage.setItem(LAST_SEEN_VERSION_KEY, v);
  }).catch(function() {
    verEl.textContent = "\u2014";
  });
}
function populateProfileUserDataBlock() {
  var hintEl = document.getElementById("settings-updates-hint");
  if (hintEl) hintEl.classList.toggle("is-visible", !!window.electronAPI);
  var udEl = document.getElementById("settings-user-data-path");
  var udHint = document.getElementById("settings-userdata-web-hint");
  var udBtn = document.getElementById("settings-open-userdata-btn");
  if (window.electronAPI && typeof window.electronAPI.getUserDataPath === "function") {
    if (udHint) udHint.classList.remove("is-visible");
    if (udBtn) udBtn.disabled = false;
    window.electronAPI.getUserDataPath().then(function(p) {
      if (udEl) {
        udEl.textContent = p || "\u2014";
        udEl.title = p || "";
      }
    }).catch(function() {
      if (udEl) udEl.textContent = "\u2014";
    });
    return;
  }
  if (udEl) udEl.textContent = "Navegador / modo desarrollo";
  if (udHint) udHint.classList.add("is-visible");
  if (udBtn) udBtn.disabled = true;
}

// public/js/features/platform/runtime.mjs
var state = {
  rt: {
    getActiveId() {
      return null;
    },
    setActiveId() {
    },
    getSettings() {
      return (
        /** @type {any} */
        {}
      );
    },
    showToast() {
    },
    syncTeamSyncHeaderButton() {
    },
    pushUndoSnapshot() {
    }
  }
};
function registerPlatformRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(state.rt, ctx);
}
function getPlatformRuntime() {
  return state.rt;
}

// public/js/features/platform/updater/channel-settings.mjs
var rt6 = getPlatformRuntime();
function getUpdateChannel() {
  var s = rt6.getSettings();
  var raw = String(s && s.updateChannel || "estable").toLowerCase();
  return raw === "beta" ? "beta" : "estable";
}
function setUpdateChannel(channel) {
  var normalized = String(channel || "").toLowerCase() === "beta" ? "beta" : "estable";
  var previous = getUpdateChannel();
  var s = rt6.getSettings();
  s.updateChannel = normalized;
  localStorage.setItem("rpc-settings", JSON.stringify(s));
  syncUpdateChannelUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === "function") {
    try {
      window.electronAPI.setUpdateChannel(normalized);
    } catch (_e) {
      void _e;
    }
  }
  if (previous !== normalized) {
    rt6.showToast(
      normalized === "beta" ? "Canal pre-releases activado: recibir\xE1s borradores de GitHub." : "Canal estable activado.",
      "success"
    );
    if (window.electronAPI && typeof window.electronAPI.checkForUpdates === "function") {
      setTimeout(function() {
        try {
          window.electronAPI.checkForUpdates();
        } catch (_e) {
          void _e;
        }
      }, 250);
    }
  }
}
function syncUpdateModalChannelPill(isPrerelease) {
  var pill = document.getElementById("update-modal-channel-pill");
  if (pill) pill.style.display = isPrerelease ? "inline-block" : "none";
}
function syncRepairUpdateButtonLabel() {
  var btn = document.getElementById("settings-repair-update-btn");
  if (!btn || !window.electronAPI || typeof window.electronAPI.getAppVersion !== "function") return;
  window.electronAPI.getAppVersion().then(function(v) {
    if (v) btn.textContent = "Reinstalar versi\xF3n actual (v" + v + ")\u2026";
  }).catch(function() {
  });
}
function syncUpdateChannelUI() {
  syncRepairUpdateButtonLabel();
  var sel = document.getElementById("rpc-update-channel");
  if (sel) sel.value = getUpdateChannel();
  syncUpdateModalChannelPill(updaterState.pendingUpdaterIsPrerelease);
  if (typeof syncTeamSyncHeaderButton === "function") rt6.syncTeamSyncHeaderButton();
}
function migrateUpdateChannelToStableDefault() {
  var key = "rpc-update-channel-stable-default-v321";
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");
  if (getUpdateChannel() !== "beta") return;
  var s = rt6.getSettings();
  s.updateChannel = "estable";
  localStorage.setItem("rpc-settings", JSON.stringify(s));
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === "function") {
    try {
      window.electronAPI.setUpdateChannel("estable");
    } catch (_e) {
      void _e;
    }
    if (typeof window.electronAPI.checkForUpdates === "function") {
      setTimeout(function() {
        try {
          window.electronAPI.checkForUpdates();
        } catch (_e) {
          void _e;
        }
      }, 300);
    }
  }
}
function getUpdateTelemetryEnabled() {
  var s = rt6.getSettings();
  return !!(s && s.updateTelemetryEnabled);
}
function setUpdateTelemetryEnabled(enabled) {
  var value = !!enabled;
  var s = rt6.getSettings();
  s.updateTelemetryEnabled = value;
  localStorage.setItem("rpc-settings", JSON.stringify(s));
  syncUpdateTelemetryUI();
  rt6.showToast(value ? "Telemetr\xEDa de actualizaci\xF3n activada." : "Telemetr\xEDa desactivada.", "success");
}
function syncUpdateTelemetryUI() {
  var cb = document.getElementById("rpc-update-telemetry-toggle");
  if (cb) cb.checked = getUpdateTelemetryEnabled();
}
function syncHardwareAccelerationUI() {
  var acc = document.getElementById("settings-accordion-performance");
  var cb = document.getElementById("settings-hardware-acceleration");
  if (!acc || !cb) return;
  var api = window.electronAPI;
  if (!api || typeof api.getPerformancePrefs !== "function") {
    acc.style.display = "none";
    void import("/mobile/js/chunks/settings-dropdown-OHH3ADKS.js").then(function(m) {
      if (typeof m.syncSettingsNavVisibility === "function") m.syncSettingsNavVisibility();
    }).catch(function() {
    });
    return;
  }
  acc.style.display = "";
  void import("/mobile/js/chunks/settings-dropdown-OHH3ADKS.js").then(function(m) {
    if (typeof m.syncSettingsNavVisibility === "function") m.syncSettingsNavVisibility();
  }).catch(function() {
  });
  api.getPerformancePrefs().then(function(prefs) {
    cb.checked = !!(prefs && prefs.hardwareAcceleration);
  }).catch(function() {
    cb.checked = false;
  });
}
function onHardwareAccelerationChange(enabled) {
  var api = window.electronAPI;
  if (!api || typeof api.setHardwareAcceleration !== "function") {
    rt6.showToast("Solo disponible en la aplicaci\xF3n de escritorio.", "error");
    syncHardwareAccelerationUI();
    return;
  }
  api.setHardwareAcceleration(!!enabled).then(function() {
    rt6.showToast("Reinicia R+ para aplicar la aceleraci\xF3n por hardware.", "info");
  }).catch(function() {
    rt6.showToast("No se pudo guardar la preferencia.", "error");
    syncHardwareAccelerationUI();
  });
}
function resolvePlatformForTelemetry() {
  if (window.electronAPI && typeof window.electronAPI.getPlatform === "function") {
    return window.electronAPI.getPlatform().catch(function() {
      return "unknown";
    });
  }
  return Promise.resolve("web");
}
function sendUpdateTelemetry(result, versionHint) {
  if (!getUpdateTelemetryEnabled()) return;
  if (typeof fetch !== "function") return;
  var normalizedResult = result === "success" ? "success" : "fail";
  var versionPromise = versionHint ? Promise.resolve(versionHint) : window.electronAPI && typeof window.electronAPI.getAppVersion === "function" ? window.electronAPI.getAppVersion().catch(function() {
    return "dev";
  }) : Promise.resolve("dev");
  Promise.all([resolvePlatformForTelemetry(), versionPromise]).then(function(vals) {
    var payload = {
      version: String(vals[1] || "unknown"),
      result: normalizedResult,
      platform: String(vals[0] || "unknown")
    };
    try {
      fetch(UPDATE_TELEMETRY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: "no-cors"
      }).catch(function() {
      });
    } catch (_e) {
      void _e;
    }
  }).catch(function() {
  });
}

// public/js/features/platform/updater/modal-ui.mjs
function resetUpdateCheckButtons() {
  ["settings-check-updates-btn", "settings-repair-update-btn", "min-version-check-btn"].forEach(
    function(id) {
      setAsyncButtonLoading(document.getElementById(id), false);
    }
  );
}
function getUpdateSnoozeUntil() {
  var raw = localStorage.getItem(UPDATE_SNOOZE_KEY);
  var n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
function setUpdateSnooze(hours) {
  var h = hours || 24;
  localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + h * 36e5));
}
function isSnoozeActiveForVersion(version) {
  var dismissed = localStorage.getItem(UPDATE_DISMISS_VER_KEY);
  if (dismissed !== version) return false;
  return Date.now() < getUpdateSnoozeUntil();
}
function markDismissedVersion(version) {
  localStorage.setItem(UPDATE_DISMISS_VER_KEY, version || "");
  setUpdateSnooze(24);
}
function showUpdateModal() {
  var el = document.getElementById("update-modal-backdrop");
  if (!el) return;
  el.style.display = "flex";
  el.setAttribute("aria-hidden", "false");
  var modal = document.getElementById("update-modal");
  if (modal) setTimeout(function() {
    try {
      modal.focus();
    } catch (_e) {
      void _e;
    }
  }, 50);
}
function hideUpdateModal() {
  if (updaterState.updateModalMode === "downgrade" && window.electronAPI && window.electronAPI.resetUpdateFeed) {
    try {
      window.electronAPI.resetUpdateFeed();
    } catch (_e) {
      void _e;
    }
  }
  updaterState.updateModalMode = "upgrade";
  updaterState.pendingDowngradeVersion = null;
  var el = document.getElementById("update-modal-backdrop");
  if (!el) return;
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}
function resetUpdateModalPanels() {
  var err = document.getElementById("update-modal-error");
  var wrap = document.getElementById("update-modal-progress-wrap");
  if (err) {
    err.style.display = "none";
    err.textContent = "";
  }
  if (wrap) wrap.style.display = "block";
}
function stripHtmlToPlainText(html) {
  if (html == null || html === "") return "";
  var raw = String(html).trim();
  if (!raw) return "";
  try {
    var doc = new DOMParser().parseFromString(raw, "text/html");
    var t2 = doc.body && doc.body.textContent ? doc.body.textContent : "";
    t2 = t2.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
    if (t2) return t2;
  } catch {
  }
  return raw.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}
function renderUpdateError(msg) {
  resetUpdateModalPanels();
  var box = document.getElementById("update-modal-error");
  var state3 = document.getElementById("update-modal-state");
  var wrap = document.getElementById("update-modal-progress-wrap");
  var label = document.getElementById("update-modal-progress-label");
  var pill = document.getElementById("update-modal-version-pill");
  var notes = document.getElementById("update-modal-notes");
  var safeMsg = sanitizeUpdaterUserMessage(
    msg,
    "No se pudo completar la actualizaci\xF3n. Prueba de nuevo o instala desde GitHub."
  );
  if (box) {
    box.style.display = "block";
    box.textContent = safeMsg;
  }
  if (state3) state3.textContent = "";
  if (wrap) wrap.style.display = "none";
  if (label) label.textContent = "";
  if (pill) pill.style.display = "none";
  if (notes) notes.textContent = "";
  var title = document.getElementById("update-modal-title");
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = "Actualizaciones";
  }
  var actions = document.getElementById("update-modal-actions-primary");
  var sec = document.getElementById("update-modal-actions-secondary");
  if (actions) {
    actions.innerHTML = "";
    var retry = document.createElement("button");
    retry.className = "btn-primary";
    retry.textContent = "Reintentar";
    retry.onclick = function() {
      resetUpdateModalPanels();
      if (window.electronAPI && window.electronAPI.checkForUpdates) window.electronAPI.checkForUpdates();
      hideUpdateModal();
    };
    actions.appendChild(retry);
  }
  if (sec) sec.innerHTML = "";
  showUpdateModal();
}

// public/js/features/platform/updater/check-actions.mjs
var rt7 = getPlatformRuntime();
function checkForRepairUpdate() {
  if (!window.electronAPI || typeof window.electronAPI.reinstallCurrentRelease !== "function") {
    rt7.showToast("Las actualizaciones autom\xE1ticas solo est\xE1n en la app de escritorio.", "error");
    return;
  }
  updaterState.pendingRepairUpdateCheck = true;
  try {
    if (typeof window.electronAPI.resetUpdateFeed === "function") {
      window.electronAPI.resetUpdateFeed();
    }
  } catch (_e) {
    void _e;
  }
  setUpdateChannel("estable");
  syncUpdateChannelUI();
  if (typeof window.electronAPI.setUpdateChannel === "function") {
    try {
      window.electronAPI.setUpdateChannel("estable");
    } catch (_e) {
      void _e;
    }
  }
  setAsyncButtonLoading(document.getElementById("settings-repair-update-btn"), true, {
    loadingText: "Buscando\u2026"
  });
  var versionLabel = "actual";
  if (typeof window.electronAPI.getAppVersion === "function") {
    window.electronAPI.getAppVersion().then(function(v) {
      if (v) versionLabel = "v" + v;
    }).catch(function() {
    });
  }
  rt7.showToast(
    "Reinstalando " + versionLabel + " desde GitHub (canal Estable). No borra tus datos.",
    "info"
  );
  setTimeout(function() {
    try {
      window.electronAPI.reinstallCurrentRelease();
    } catch (_e) {
      void _e;
    }
  }, 150);
}
function checkForAppUpdates() {
  if (!window.electronAPI || typeof window.electronAPI.checkForUpdates !== "function") {
    rt7.showToast("Las actualizaciones autom\xE1ticas solo est\xE1n en la app de escritorio.", "error");
    return;
  }
  if (typeof window.electronAPI.setUpdateChannel === "function") {
    try {
      window.electronAPI.setUpdateChannel(getUpdateChannel());
    } catch (_e) {
      void _e;
    }
  }
  updaterState.checkFeedback = true;
  setAsyncButtonLoading(document.getElementById("settings-check-updates-btn"), true, {
    loadingText: "Buscando\u2026"
  });
  setTimeout(function() {
    try {
      window.electronAPI.checkForUpdates();
    } catch (_e) {
      void _e;
    }
  }, 150);
}
function installUpdate() {
  if (window.electronAPI) window.electronAPI.installUpdate();
}

// public/js/features/platform/updater/downgrade.mjs
function confirmDowngrade(version, entry) {
  var summary = entry && entry.summary ? entry.summary : "";
  var ok = window.confirm(
    "Restaurar R+ a v" + version + "?\n\n" + summary + "\n\nLa app se reiniciar\xE1. Tus pacientes y ajustes locales se conservan."
  );
  if (!ok) return;
  updaterState.pendingDowngradeVersion = version;
  updaterState.updateModalMode = "downgrade";
  resetUpdateModalPanels();
  showUpdateModal();
  var title = document.getElementById("update-modal-title");
  if (title && title.firstChild) title.firstChild.textContent = "Restaurando versi\xF3n estable";
  if (window.electronAPI && window.electronAPI.downgradeToStable) {
    window.electronAPI.downgradeToStable(version);
  }
}
function renderDowngradeFallback(payload) {
  updaterState.updateModalMode = "upgrade";
  updaterState.pendingDowngradeVersion = null;
  resetUpdateCheckButtons();
  var raw = payload && payload.message ? payload.message : "No se pudo descargar la versi\xF3n.";
  var safe = sanitizeUpdaterUserMessage(
    raw,
    "No se pudo descargar esa versi\xF3n. Abre el instalador en GitHub."
  );
  if (safe.indexOf("GitHub") === -1) {
    safe += " Puedes abrir el instalador en GitHub.";
  }
  renderUpdateError(safe);
  var actions = document.getElementById("update-modal-actions-primary");
  if (actions && payload && (payload.manualUrl || payload.version)) {
    var openBtn = document.createElement("button");
    openBtn.className = "btn-primary";
    openBtn.textContent = "Abrir instalador en GitHub";
    openBtn.onclick = function() {
      if (window.electronAPI && window.electronAPI.openDowngradeInstaller) {
        window.electronAPI.openDowngradeInstaller(payload.version);
      } else if (window.electronAPI && window.electronAPI.openExternal && payload.manualUrl) {
        window.electronAPI.openExternal(payload.manualUrl);
      }
    };
    actions.innerHTML = "";
    actions.appendChild(openBtn);
  }
  if (window.electronAPI && window.electronAPI.resetUpdateFeed) {
    window.electronAPI.resetUpdateFeed();
  }
}

// public/js/features/platform/updater/electron-handlers.mjs
var rt8 = getPlatformRuntime();
function updateAvailableTitle(isDowngrade, isRepair) {
  if (isDowngrade) return "Restaurando versi\xF3n estable";
  if (isRepair) return "Actualizaci\xF3n de reparaci\xF3n";
  return "Nueva versi\xF3n";
}
function wireUpdateAvailableActions(version, isDowngrade) {
  var actions = document.getElementById("update-modal-actions-primary");
  if (actions) {
    actions.innerHTML = "";
    if (!isDowngrade) {
      var later = document.createElement("button");
      later.className = "btn-secondary";
      later.textContent = "M\xE1s tarde";
      later.onclick = function() {
        markDismissedVersion(version);
        hideUpdateModal();
      };
      actions.appendChild(later);
    }
  }
  var sec = document.getElementById("update-modal-actions-secondary");
  if (sec) {
    sec.innerHTML = "";
    if (!isDowngrade) {
      var link = document.createElement("button");
      link.type = "button";
      link.className = "btn-link";
      link.textContent = "Ver notas en GitHub";
      link.onclick = function() {
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal("https://github.com/mausalas99/r-mas/releases");
        }
      };
      sec.appendChild(link);
    }
  }
}
function populateUpdateAvailableDom(version, releaseNotes, isDowngrade, isRepair) {
  var title = document.getElementById("update-modal-title");
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = updateAvailableTitle(isDowngrade, isRepair);
  }
  var pill = document.getElementById("update-modal-version-pill");
  if (pill) {
    pill.textContent = "v" + version;
    pill.style.display = "inline-block";
  }
  syncUpdateModalChannelPill(updaterState.pendingUpdaterIsPrerelease);
  var notes = document.getElementById("update-modal-notes");
  if (notes) {
    var clipped = String(releaseNotes || "");
    if (clipped.length > 600) clipped = clipped.slice(0, 599).replace(/\s+\S*$/, "") + "\u2026";
    notes.textContent = clipped;
  }
  var state3 = document.getElementById("update-modal-state");
  if (state3) state3.textContent = "Conectando\u2026 La descarga comenzar\xE1 en breve.";
  var fill = document.getElementById("update-modal-progress-fill");
  if (fill) fill.style.width = "0%";
  var label = document.getElementById("update-modal-progress-label");
  if (label) label.textContent = "";
}
function handleUpdateAvailable(payload) {
  resetUpdateCheckButtons();
  var version = payload && payload.version ? payload.version : String(payload || "");
  var rawNotes = payload && payload.releaseNotes != null ? String(payload.releaseNotes) : "";
  var releaseNotes = formatUpdaterReleaseNotesPlain(version, rawNotes) || stripHtmlToPlainText(rawNotes);
  updaterState.pendingUpdaterTargetVersion = version;
  updaterState.pendingUpdaterIsPrerelease = !!(payload && payload.prerelease);
  var isDowngrade = updaterState.updateModalMode === "downgrade";
  var isRepair = updaterState.pendingRepairUpdateCheck;
  if (isRepair) updaterState.pendingRepairUpdateCheck = false;
  if (!isDowngrade && !isRepair && isSnoozeActiveForVersion(version)) return;
  resetUpdateModalPanels();
  populateUpdateAvailableDom(version, releaseNotes, isDowngrade, isRepair);
  wireUpdateAvailableActions(version, isDowngrade);
  showUpdateModal();
}
function handleUpdateProgress(payload) {
  var pct = typeof payload === "number" ? payload : payload && payload.percent != null ? payload.percent : 0;
  var transferred = payload && payload.transferred;
  var total = payload && payload.total;
  var bps = payload && payload.bytesPerSecond;
  if (updaterState.pendingUpdaterTargetVersion && updaterState.updateModalMode !== "downgrade" && isSnoozeActiveForVersion(updaterState.pendingUpdaterTargetVersion)) return;
  resetUpdateModalPanels();
  syncUpdateModalChannelPill(updaterState.pendingUpdaterIsPrerelease);
  var state3 = document.getElementById("update-modal-state");
  if (state3) state3.textContent = "Descargando\u2026";
  var fill = document.getElementById("update-modal-progress-fill");
  if (fill) fill.style.width = pct + "%";
  var label = document.getElementById("update-modal-progress-label");
  if (label) {
    if (transferred != null && total != null) {
      label.textContent = formatProgressLine({
        transferred,
        total,
        bytesPerSecond: bps
      });
    } else {
      label.textContent = "Progreso: " + pct + "%";
    }
  }
  showUpdateModal();
}
function wireUpdateReadyActions(isDowngrade) {
  var actions = document.getElementById("update-modal-actions-primary");
  if (actions) {
    actions.innerHTML = "";
    var go = document.createElement("button");
    go.className = "btn-primary";
    go.textContent = isDowngrade ? "Restaurar y reiniciar" : "Instalar y reiniciar";
    go.onclick = function() {
      updaterState.updateModalMode = "upgrade";
      updaterState.pendingDowngradeVersion = null;
      installUpdate();
    };
    actions.appendChild(go);
    if (!isDowngrade) {
      var later = document.createElement("button");
      later.className = "btn-secondary";
      later.textContent = "Instalar al cerrar";
      later.onclick = function() {
        hideUpdateModal();
      };
      actions.appendChild(later);
    }
  }
  var sec = document.getElementById("update-modal-actions-secondary");
  if (sec) sec.innerHTML = "";
}
function handleUpdateReady(payload) {
  var version = payload && payload.version ? payload.version : String(payload || "");
  var isDowngrade = updaterState.updateModalMode === "downgrade";
  try {
    sendUpdateTelemetry("success", version);
  } catch (_e) {
    void _e;
  }
  if (!isDowngrade && isSnoozeActiveForVersion(version)) return;
  resetUpdateModalPanels();
  syncUpdateModalChannelPill(updaterState.pendingUpdaterIsPrerelease);
  var state3 = document.getElementById("update-modal-state");
  if (state3) {
    state3.textContent = isDowngrade ? "Listo para restaurar. R+ se reiniciar\xE1 en la versi\xF3n seleccionada." : "Listo para instalar. Tambi\xE9n se instalar\xE1 al cerrar la aplicaci\xF3n si eliges esperar.";
  }
  var fill = document.getElementById("update-modal-progress-fill");
  if (fill) fill.style.width = "100%";
  var label = document.getElementById("update-modal-progress-label");
  if (label) label.textContent = "Descarga completa.";
  wireUpdateReadyActions(isDowngrade);
  showUpdateModal();
}
function handleUpdateNotAvailable(payload) {
  resetUpdateCheckButtons();
  var wasRepair = updaterState.pendingRepairUpdateCheck;
  var toastKind = updateNotAvailableToastKind(updaterState, payload);
  updaterState.pendingRepairUpdateCheck = false;
  updaterState.pendingUpdaterTargetVersion = null;
  updaterState.pendingUpdaterIsPrerelease = false;
  updaterState.checkFeedback = false;
  syncUpdateModalChannelPill(false);
  if (toastKind === "repair-error" || wasRepair || payload && payload.reinstallFailed) {
    var v = payload && payload.version ? String(payload.version) : "";
    var detail = payload && payload.detail ? String(payload.detail) : "";
    var msg = "No se encontr\xF3 en GitHub una build reinstalable" + (v ? " para v" + v : "") + ". Publica o actualiza el release en GitHub (latest-mac.yml / latest.yml e instaladores) y vuelve a intentar.";
    if (detail) msg += " Detalle: " + detail;
    msg += " Tambi\xE9n puedes usar \xABAbrir instalador en GitHub\xBB en Restaurar versi\xF3n estable.";
    rt8.showToast(msg, "error");
  } else if (toastKind === "up-to-date") {
    rt8.showToast("R+ est\xE1 actualizado.", "success");
  }
}
function handleUpdateError(msg) {
  var show = shouldSurfaceUpdateCheckError(updaterState);
  updaterState.checkFeedback = false;
  resetUpdateCheckButtons();
  if (!show) return;
  try {
    sendUpdateTelemetry("fail");
  } catch (_e) {
    void _e;
  }
  renderUpdateError(msg);
}
function handleDowngradeFailed(payload) {
  resetUpdateCheckButtons();
  renderDowngradeFallback(payload);
}

// public/js/features/platform/updater/electron-bridge.mjs
function safeHandler(fn, label) {
  return function wrapped(payload) {
    try {
      fn(payload);
    } catch (e) {
      console.error(label + " callback error:", e && e.message);
    }
  };
}
function registerElectronUpdateListeners() {
  if (typeof window === "undefined" || !window.electronAPI) return;
  window.electronAPI.onUpdateAvailable(safeHandler(handleUpdateAvailable, "onUpdateAvailable"));
  window.electronAPI.onUpdateProgress(safeHandler(handleUpdateProgress, "onUpdateProgress"));
  window.electronAPI.onUpdateReady(safeHandler(handleUpdateReady, "onUpdateReady"));
  window.electronAPI.onUpdateNotAvailable(safeHandler(handleUpdateNotAvailable, "onUpdateNotAvailable"));
  window.electronAPI.onUpdateError(safeHandler(handleUpdateError, "onUpdateError"));
  if (window.electronAPI.onDowngradeFailed) {
    window.electronAPI.onDowngradeFailed(safeHandler(handleDowngradeFailed, "onDowngradeFailed"));
  }
}
registerElectronUpdateListeners();

// public/js/features/platform/updater/version-compare.mjs
function compareSemver(a, b) {
  function parse(v) {
    var m = String(v == null ? "" : v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-.+].*)?$/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }
  var pa = parse(a);
  var pb = parse(b);
  if (!pa || !pb) return 0;
  for (var i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

// lib/update-feed.mjs
var UPDATE_WORKER_URL = "https://rmas-update-feed.rmas-workersdev.workers.dev/";

// public/js/min-version-fetch.mjs
var REMOTE_MIN_VERSION_URL = "https://raw.githubusercontent.com/mausalas99/r-mas/main/min-version.json";
async function fetchMinVersionPayload() {
  if (typeof fetch !== "function") return null;
  const urls = ["/min-version.json", `${UPDATE_WORKER_URL}min-version.json`, REMOTE_MIN_VERSION_URL];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && typeof data === "object" && data.minVersion) {
        return {
          minVersion: String(data.minVersion),
          message: data.message ? String(data.message) : void 0
        };
      }
    } catch {
    }
  }
  return null;
}

// lib/update-downgrade.mjs
var GITHUB_RELEASES_BASE = "https://github.com/mausalas99/r-mas/releases/download";
var STABLE_VERSIONS_RAW_URL = "https://raw.githubusercontent.com/mausalas99/r-mas/main/stable-versions.json";
function parseSemverCore(version) {
  const m = String(version || "").trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-.+].*)?$/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}
function compareSemverCore(a, b) {
  const pa = parseSemverCore(a);
  const pb = parseSemverCore(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}
function isValidDowngradeTargetVersion(target, current) {
  if (!parseSemverCore(target) || !parseSemverCore(current)) return false;
  return compareSemverCore(target, current) < 0;
}
function pickMacArch(arch) {
  return arch === "arm64" ? "arm64" : "x64";
}
function buildManualInstallerUrl(version, platform, arch) {
  const v = String(version || "").replace(/^v/, "");
  if (!parseSemverCore(v)) throw new Error(`Versi\xF3n inv\xE1lida: ${version}`);
  const macArch = pickMacArch(arch);
  let fileName;
  if (platform === "darwin") {
    fileName = `R+-${v}-${macArch}.dmg`;
  } else if (platform === "win32") {
    fileName = `R+-${v}-x64.exe`;
  } else {
    throw new Error(`Plataforma no soportada: ${platform}`);
  }
  return `${GITHUB_RELEASES_BASE}/v${v}/${fileName}`;
}
function filterDowngradeCandidates(entries, currentVersion) {
  const list = Array.isArray(entries) ? entries : [];
  return list.filter((e) => e && isValidDowngradeTargetVersion(e.version, currentVersion)).sort((a, b) => compareSemverCore(b.version, a.version));
}

// public/js/features/platform/updater/min-version.mjs
function resolveDownloadUrl(version, platform, arch) {
  try {
    return buildManualInstallerUrl(version, platform, arch);
  } catch (_e) {
    return RELEASES_LATEST_URL;
  }
}
function downloadLabel(platform, arch) {
  if (platform === "darwin") {
    return pickMacArch(arch) === "arm64" ? "Descargar \u2014 Mac Apple Silicon" : "Descargar \u2014 Mac Intel";
  }
  if (platform === "win32") return "Descargar \u2014 Windows";
  return "Descargar desde GitHub";
}
function openUrl(url) {
  if (window.electronAPI && typeof window.electronAPI.openExternal === "function") {
    window.electronAPI.openExternal(url);
  } else {
    try {
      window.open(url, "_blank");
    } catch (_e) {
      void _e;
    }
  }
}
function showMinVersionBlockingModal(current, minVersion, message, platformInfo) {
  var bd = document.getElementById("min-version-backdrop");
  if (!bd) return;
  var meta = document.getElementById("min-version-meta");
  var msg = document.getElementById("min-version-message");
  if (msg && message) msg.textContent = String(message);
  if (meta) {
    meta.textContent = "Versi\xF3n actual: v" + current + " \xB7 M\xEDnima soportada: v" + minVersion;
  }
  var platform = platformInfo && platformInfo.platform;
  var arch = platformInfo && platformInfo.arch;
  var directUrl = platform ? resolveDownloadUrl(minVersion, platform, arch || "x64") : null;
  var checkBtn = document.getElementById("min-version-check-btn");
  var relBtn = document.getElementById("min-version-releases-btn");
  if (checkBtn) {
    checkBtn.onclick = function() {
      if (window.electronAPI && typeof window.electronAPI.checkForUpdates === "function") {
        setAsyncButtonLoading(checkBtn, true, { loadingText: "Buscando\u2026" });
        try {
          window.electronAPI.checkForUpdates();
        } catch (_e) {
          void _e;
        }
      } else {
        openUrl(directUrl || RELEASES_LATEST_URL);
      }
    };
  }
  if (relBtn) {
    if (directUrl) {
      relBtn.textContent = downloadLabel(platform, arch || "x64");
      relBtn.onclick = function() {
        openUrl(directUrl);
      };
    } else {
      relBtn.onclick = function() {
        openUrl(RELEASES_LATEST_URL);
      };
    }
  }
  var snoozed = document.getElementById("update-modal-backdrop");
  if (snoozed) {
    snoozed.style.display = "none";
    snoozed.setAttribute("aria-hidden", "true");
  }
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  if (!updaterState.minVersionGateKeydownBound) {
    updaterState.minVersionGateKeydownBound = true;
    document.addEventListener("keydown", function(e) {
      var active = document.getElementById("min-version-backdrop");
      if (!active || !active.classList.contains("open")) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }
}
function checkMinVersionGate() {
  if (typeof fetch !== "function") return;
  var api = window.electronAPI || null;
  var currentVersionPromise = api && typeof api.getAppVersion === "function" ? api.getAppVersion().catch(function() {
    return null;
  }) : Promise.resolve(null);
  var platformPromise = api && typeof api.getPlatform === "function" ? api.getPlatform().catch(function() {
    return null;
  }) : Promise.resolve(null);
  var archPromise = api && typeof api.getArch === "function" ? api.getArch().catch(function() {
    return null;
  }) : Promise.resolve(null);
  var payloadPromise = fetchMinVersionPayload().catch(function() {
    return null;
  });
  Promise.all([currentVersionPromise, payloadPromise, platformPromise, archPromise]).then(function(res) {
    var currentVersion = res[0];
    var payload = res[1];
    var platform = res[2];
    var arch = res[3];
    if (!currentVersion || !payload || typeof payload !== "object" || !payload.minVersion) return;
    if (compareSemver(currentVersion, payload.minVersion) < 0) {
      var platformInfo = platform ? { platform, arch: arch || "x64" } : null;
      showMinVersionBlockingModal(currentVersion, payload.minVersion, payload.message, platformInfo);
    }
  }).catch(function() {
  });
}

// public/js/stable-downgrade-ui.mjs
var RELEASES_PAGE = "https://github.com/mausalas99/r-mas/releases";
var GITHUB_RELEASES_API = "https://api.github.com/repos/mausalas99/r-mas/releases?per_page=40";
function filterEntriesWithGitHubReleases(entries, publishedVersions) {
  const list = Array.isArray(entries) ? entries : [];
  if (!publishedVersions || !publishedVersions.length) return list;
  const set = new Set(
    publishedVersions.map(function(v) {
      return String(v || "").replace(/^v/, "");
    })
  );
  return list.filter(function(e) {
    return e && set.has(String(e.version).replace(/^v/, ""));
  });
}
async function fetchGitHubPublishedVersions() {
  if (typeof fetch !== "function") return null;
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map(function(r) {
      return String(r && r.tag_name || "").replace(/^v/, "");
    }).filter(Boolean);
  } catch {
    return null;
  }
}
var EMBEDDED_STABLE_CATALOG = {
  schema: 1,
  entries: [
    {
      version: "6.5.0",
      label: "6.5.0",
      summary: "Historia Cl\xEDnica y expediente Sala (canal Estable en GitHub).",
      recommended: true
    },
    {
      version: "6.4.2",
      label: "6.4.2",
      summary: "Estable anterior si necesitas volver m\xE1s atr\xE1s."
    }
  ]
};
var downgradeUiWired = false;
var downgradeDeps = null;
function pickDefaultDowngradeVersion(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const rec = list.find((e) => e.recommended);
  return rec ? rec.version : list[0] ? list[0].version : "";
}
function isBlockedByMinVersion(target, minVersion) {
  if (!minVersion) return false;
  return compareSemverCore(target, minVersion) < 0;
}
async function getCurrentAppVersion() {
  if (typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.getAppVersion === "function") {
    return window.electronAPI.getAppVersion().catch(function() {
      return "0.0.0";
    });
  }
  return "0.0.0";
}
function resolveDowngradeEntries(raw, current, source) {
  const entries = filterDowngradeCandidates(raw.entries || [], current);
  return { entries, source, updatedAt: raw.updatedAt || "" };
}
async function applyPublishedReleaseFilter(resolved, publishedVersions) {
  const filtered = filterEntriesWithGitHubReleases(resolved.entries, publishedVersions);
  return {
    entries: filtered.length ? filtered : resolved.entries,
    source: resolved.source,
    updatedAt: resolved.updatedAt,
    filteredByGithub: filtered.length > 0 && filtered.length < resolved.entries.length
  };
}
async function fetchStableVersionsCatalog() {
  const current = await getCurrentAppVersion();
  const publishedPromise = fetchGitHubPublishedVersions();
  if (typeof fetch !== "function") {
    const embedded = resolveDowngradeEntries(EMBEDDED_STABLE_CATALOG, current, "embedded");
    const published2 = await publishedPromise;
    return applyPublishedReleaseFilter(embedded, published2);
  }
  let resolved = null;
  const catalogUrls = [`${UPDATE_WORKER_URL}stable-versions.json`, STABLE_VERSIONS_RAW_URL];
  for (const url of catalogUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const raw = await res.json();
      const remote = resolveDowngradeEntries(raw, current, "remote");
      if (remote.entries.length) {
        resolved = remote;
        break;
      }
    } catch {
    }
  }
  if (!resolved) {
    resolved = resolveDowngradeEntries(EMBEDDED_STABLE_CATALOG, current, "embedded");
  }
  const published = await publishedPromise;
  return applyPublishedReleaseFilter(resolved, published);
}
async function fetchMinVersion() {
  const data = await fetchMinVersionPayload();
  return data?.minVersion ? String(data.minVersion) : null;
}
function openExternal(url) {
  if (window.electronAPI && typeof window.electronAPI.openExternal === "function") {
    window.electronAPI.openExternal(url);
  } else {
    try {
      window.open(url, "_blank");
    } catch (_e) {
      void _e;
    }
  }
}
async function openManualInstallerForVersion(version) {
  if (window.electronAPI && typeof window.electronAPI.openDowngradeInstaller === "function") {
    await window.electronAPI.openDowngradeInstaller(version);
    return;
  }
  if (window.electronAPI && typeof window.electronAPI.getPlatform === "function") {
    const platform = await window.electronAPI.getPlatform();
    const arch = platform === "darwin" && typeof process !== "undefined" ? process.arch : "x64";
    openExternal(buildManualInstallerUrl(version, platform, arch));
    return;
  }
  openExternal(RELEASES_PAGE);
}
var SETTINGS_UPDATES_PANEL_EVENT = "rpc-settings-updates-panel-shown";
function populateDowngradeSelect(select, entries) {
  select.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Sin versiones anteriores";
    select.appendChild(empty);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  entries.forEach(function(e) {
    const opt = document.createElement("option");
    opt.value = e.version;
    opt.textContent = e.label + (e.summary ? " \u2014 " + e.summary : "");
    select.appendChild(opt);
  });
  select.value = pickDefaultDowngradeVersion(entries);
}
async function loadDowngradeCatalogBundle() {
  return Promise.race([
    Promise.all([fetchStableVersionsCatalog(), fetchMinVersion(), getCurrentAppVersion()]),
    new Promise(function(_resolve, reject) {
      setTimeout(function() {
        reject(new Error("downgrade catalog timeout"));
      }, 12e3);
    })
  ]);
}
function renderDowngradeLoadError(hint, select, githubBtn) {
  if (hint) {
    hint.textContent = "No se pudo cargar el cat\xE1logo de versiones. Revisa la red o abre el instalador en GitHub.";
  }
  populateDowngradeSelect(select, []);
  if (githubBtn) {
    githubBtn.disabled = false;
    githubBtn.onclick = function() {
      openExternal(RELEASES_PAGE);
    };
  }
}
function wireDowngradeGithubButton(githubBtn, select, entries) {
  if (!githubBtn) return;
  githubBtn.disabled = false;
  githubBtn.onclick = function() {
    const version = select.value || pickDefaultDowngradeVersion(entries);
    if (version) openManualInstallerForVersion(version);
    else openExternal(RELEASES_PAGE);
  };
}
function wireDowngradeStableButton(deps, btn, select, entries, minVersion) {
  btn.disabled = false;
  btn.onclick = function() {
    const version = select.value;
    if (!version) return;
    if (isBlockedByMinVersion(version, minVersion)) {
      deps.showToast(
        "Esa versi\xF3n ya no es compatible con tus datos (m\xEDnimo v" + minVersion + ").",
        "error"
      );
      return;
    }
    const entry = entries.find(function(e) {
      return e.version === version;
    });
    deps.confirmDowngrade(version, entry);
  };
}
function renderDowngradeHint(hint, catalog) {
  if (!hint) return;
  const srcNote = catalog.source === "embedded" ? " (lista integrada \u2014 cat\xE1logo en main a\xFAn no publicado)" : "";
  const ghNote = catalog.filteredByGithub ? " Solo versiones con instalador en GitHub Releases." : "";
  hint.textContent = "Si esta versi\xF3n falla (p. ej. \xABnative binding\xBB), restaura una publicada en GitHub. Tus datos locales no se borran." + ghNote + srcNote;
}
async function refreshStableDowngradeSettings(deps) {
  const section = document.getElementById("settings-downgrade-section");
  const select = document.getElementById("rpc-stable-downgrade-select");
  const btn = document.getElementById("settings-downgrade-stable-btn");
  const githubBtn = document.getElementById("settings-downgrade-github-btn");
  const hint = document.getElementById("settings-downgrade-hint");
  if (!section || !select || !btn) return { entries: [], source: "none" };
  if (typeof window === "undefined" || !window.electronAPI) {
    section.hidden = true;
    return { entries: [], source: "none" };
  }
  section.hidden = false;
  btn.disabled = true;
  select.disabled = true;
  if (hint) {
    hint.textContent = "Cargando versiones estables anteriores\u2026";
  }
  let catalog = { entries: [], source: "none", filteredByGithub: false };
  let minVersion = null;
  let currentVersion = "0.0.0";
  try {
    const results = await loadDowngradeCatalogBundle();
    catalog = results[0];
    minVersion = results[1];
    currentVersion = results[2];
  } catch {
    renderDowngradeLoadError(hint, select, githubBtn);
    return { entries: [], source: "error" };
  }
  const entries = catalog.entries;
  const source = catalog.source;
  if (!entries.length) {
    if (hint) {
      hint.textContent = "No hay versiones anteriores a v" + currentVersion + " en el cat\xE1logo. Abre Releases en GitHub para instalar manualmente.";
    }
    populateDowngradeSelect(select, []);
    btn.disabled = true;
    wireDowngradeGithubButton(githubBtn, select, entries);
    return { entries, source };
  }
  populateDowngradeSelect(select, entries);
  renderDowngradeHint(hint, catalog);
  wireDowngradeStableButton(deps, btn, select, entries, minVersion);
  wireDowngradeGithubButton(githubBtn, select, entries);
  return { entries, source };
}
function wireSettingsDowngradeAccordion(deps) {
  if (downgradeUiWired) return;
  downgradeUiWired = true;
  document.addEventListener(SETTINGS_UPDATES_PANEL_EVENT, function() {
    void refreshStableDowngradeSettings(deps);
  });
}
async function initStableDowngradeSettings(deps) {
  downgradeDeps = deps;
  wireSettingsDowngradeAccordion(deps);
  await refreshStableDowngradeSettings(deps);
}
function openSettingsDowngradeSection() {
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn && typeof settingsBtn.click === "function") settingsBtn.click();
  const acc = document.getElementById("settings-accordion-updates");
  if (acc) {
    showSettingsPanel("settings-accordion-updates");
    if (downgradeDeps) void refreshStableDowngradeSettings(downgradeDeps);
  }
  const section = document.getElementById("settings-downgrade-section");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// public/js/features/platform/updater/native-recovery.mjs
function hideNativeRecoveryChrome() {
  var wrap = document.getElementById("update-modal-progress-wrap");
  if (wrap) wrap.style.display = "none";
  var pill = document.getElementById("update-modal-version-pill");
  if (pill) pill.style.display = "none";
  var err = document.getElementById("update-modal-error");
  if (err) err.style.display = "none";
}
function populateNativeRecoveryContent(msg) {
  var title = document.getElementById("update-modal-title");
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = "Problema de instalaci\xF3n";
  }
  var notes = document.getElementById("update-modal-notes");
  if (notes) notes.textContent = msg;
  var state3 = document.getElementById("update-modal-state");
  if (state3) {
    state3.textContent = "Usa Ajustes \u2192 Reinstalar versi\xF3n actual, Restaurar versi\xF3n estable, o descarga el instalador desde GitHub Releases.";
  }
}
function populateNativeRecoveryActions() {
  var actions = document.getElementById("update-modal-actions-primary");
  var sec = document.getElementById("update-modal-actions-secondary");
  if (actions) {
    actions.innerHTML = "";
    var settingsBtn = document.createElement("button");
    settingsBtn.className = "btn-primary";
    settingsBtn.textContent = "Abrir restaurar versi\xF3n estable\u2026";
    settingsBtn.onclick = function() {
      hideUpdateModal();
      openSettingsDowngradeSection();
    };
    actions.appendChild(settingsBtn);
    var ghBtn = document.createElement("button");
    ghBtn.className = "btn-secondary";
    ghBtn.textContent = "Ver releases en GitHub";
    ghBtn.onclick = function() {
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal("https://github.com/mausalas99/r-mas/releases");
      }
    };
    actions.appendChild(ghBtn);
  }
  if (sec) {
    sec.innerHTML = "";
    var closeBtn = document.createElement("button");
    closeBtn.className = "btn-secondary";
    closeBtn.textContent = "Continuar de todos modos";
    closeBtn.onclick = function() {
      hideUpdateModal();
    };
    sec.appendChild(closeBtn);
  }
}
function showNativeRuntimeRecoveryModal(status) {
  if (updaterState.nativeRecoveryModalShown || !status || status.ok) return;
  updaterState.nativeRecoveryModalShown = true;
  var msg = (status.userMessage || status.message || "R+ no pudo cargar un componente nativo.") + (status.detail ? "\n\n" + status.detail : "");
  resetUpdateModalPanels();
  populateNativeRecoveryContent(msg);
  hideNativeRecoveryChrome();
  populateNativeRecoveryActions();
  showUpdateModal();
}
function checkNativeRuntimeOnBoot() {
  if (!window.electronAPI || typeof window.electronAPI.getNativeRuntimeStatus !== "function") {
    return;
  }
  window.electronAPI.getNativeRuntimeStatus().then(function(status) {
    if (!status || status.ok) return;
    showNativeRuntimeRecoveryModal(status);
  }).catch(function() {
  });
}

// public/js/features/platform/updater/init.mjs
var rt9 = getPlatformRuntime();
function initUpdateChannelAndGate() {
  migrateUpdateChannelToStableDefault();
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === "function") {
    try {
      window.electronAPI.setUpdateChannel(getUpdateChannel());
    } catch (_e) {
      void _e;
    }
  }
  initStableDowngradeSettings({
    showToast: rt9.showToast.bind(rt9),
    confirmDowngrade
  });
  setTimeout(checkNativeRuntimeOnBoot, 800);
  setTimeout(function() {
    checkMinVersionGate();
  }, 1200);
}

// public/js/features/platform/shared.mjs
var AUDIT_LOG_KEY = "rpc-audit-log";
var AUTO_BACKUP_SETTINGS_KEY = "rpc-auto-backup-settings";
var AUTO_BACKUP_INDEX_KEY = "rpc-auto-backup-index";
var AUTO_BACKUP_MAX = 14;
var PREIMPORT_BACKUP_KEY = "rpc-preimport-backup";
var IDLE_LOCK_LS_KEY = "rpc-idle-lock";
var IDLE_LOCK_HASH_LS_KEY = "rpc-idle-lock-hash";
var IDLE_LOCK_DEBOUNCE_MS = 500;
var IDLE_LOCK_VALID_MINUTES = [0, 5, 10, 30];
function formatDateSlug(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function downloadBlob(blob, fileName) {
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
function downloadJsonPayload(payload, fileName) {
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, fileName);
}
function downloadTextPayload(content, fileName, mimeType) {
  var blob = new Blob([content], { type: (mimeType || "text/plain") + ";charset=utf-8" });
  downloadBlob(blob, fileName);
}

// public/js/features/platform/audit.mjs
var rt10 = getPlatformRuntime();
var _dbAuditCache = null;
function forensicEventVisible(eventType) {
  var t2 = String(eventType || "");
  return /^(clinical|auth|system|lan)\./.test(t2);
}
function mapForensicAuditRow(row) {
  return {
    timestamp: row.timestamp,
    action: row.event_type,
    result: "ok",
    count: 0,
    detail: row.client_id || "",
    forensicId: row.id,
    payloadHash: row.payload_hash,
    currentHash: row.current_hash
  };
}
async function fetchDbAuditLog(limit) {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbAuditExport !== "function") {
    return null;
  }
  try {
    var res = await window.electronAPI.dbAuditExport({ limit: limit || 200 });
    if (!res || res.ok === false) return [];
    return (res.entries || []).filter(function(row) {
      return forensicEventVisible(row.event_type);
    }).map(mapForensicAuditRow);
  } catch {
    return [];
  }
}
function getAuditLog() {
  if (isDbMode() && _dbAuditCache) return _dbAuditCache;
  try {
    var raw = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
async function refreshDbAuditCache() {
  if (!isDbMode()) {
    _dbAuditCache = null;
    return getAuditLog();
  }
  _dbAuditCache = await fetchDbAuditLog(200);
  return _dbAuditCache;
}
function addAuditEntry(action, result, count, detail) {
  var list = getAuditLog();
  list.unshift({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    action: action || "unknown",
    result: result || "ok",
    count: Number.isFinite(count) ? count : 0,
    detail: detail || ""
  });
  if (list.length > 200) list = list.slice(0, 200);
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(list));
}
async function exportAuditLog() {
  var log;
  if (isDbMode() && window.electronAPI && typeof window.electronAPI.dbAuditExport === "function") {
    log = await fetchDbAuditLog(5e3);
  } else {
    log = getAuditLog();
  }
  downloadJsonPayload(
    {
      format: isDbMode() ? "r-plus-forensic-audit" : "r-plus-audit-log",
      version: isDbMode() ? 2 : 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      entries: log
    },
    "R-plus-bitacora-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json"
  );
  rt10.showToast("Bit\xE1cora exportada", "success");
}
async function lockClinicalDatabaseNow() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbLock !== "function") {
    rt10.showToast("Solo disponible con la base de datos cifrada en la app de escritorio.", "error");
    return;
  }
  if (!window.confirm(
    "\xBFBloquear la base de datos ahora? R+ la volver\xE1 a abrir autom\xE1ticamente en este equipo al reiniciar o recargar."
  )) {
    return;
  }
  try {
    var res = await window.electronAPI.dbLock();
    if (!res || res.ok === false) {
      rt10.showToast(res && res.error || "No se pudo bloquear la base de datos", "error");
      return;
    }
    rt10.showToast("Base de datos bloqueada", "success");
    location.reload();
  } catch {
    rt10.showToast("No se pudo bloquear la base de datos", "error");
  }
}
async function verifyForensicAuditChain() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbAuditVerify !== "function") {
    rt10.showToast("La verificaci\xF3n forense solo est\xE1 en la app de escritorio con base cifrada.", "error");
    return;
  }
  rt10.showToast("Verificando cadena de integridad\u2026", "info");
  try {
    var res = await window.electronAPI.dbAuditVerify({ mode: "full" });
    if (!res || res.ok === false) {
      rt10.showToast(res && res.error || "No se pudo verificar la bit\xE1cora", "error");
      return;
    }
    if (res.valid) {
      rt10.showToast("Bit\xE1cora forense \xEDntegra (verificaci\xF3n completa).", "success");
    } else {
      rt10.showToast(
        "Cadena comprometida: revisa el registro #" + (res.brokenAtId != null ? res.brokenAtId : "?"),
        "error"
      );
    }
  } catch {
    rt10.showToast("No se pudo verificar la bit\xE1cora", "error");
  }
}
async function exportRecoverCensusRangeJson() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbRecoverCensusRangeExport !== "function") {
    rt10.showToast("Recuperaci\xF3n solo disponible con base cifrada en escritorio.", "error");
    return;
  }
  try {
    var res = await window.electronAPI.dbRecoverCensusRangeExport();
    if (!res || res.ok === false) {
      rt10.showToast(res && res.error || "No se encontraron pacientes para exportar", "error");
      return;
    }
    downloadJsonPayload(
      res.payload,
      "R-plus-recuperacion-censo-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json"
    );
    rt10.showToast(
      "Exportados " + (res.count || 0) + " paciente(s) \u2014 importa con Importar rango\u2026",
      "success"
    );
  } catch {
    rt10.showToast("No se pudo exportar el censo recuperable", "error");
  }
}
async function exportClinicalDbBackupJson() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbBackupExportJson !== "function") {
    rt10.showToast("Exportaci\xF3n solo disponible con base cifrada en escritorio.", "error");
    return;
  }
  if (!window.confirm(
    "El respaldo JSON incluye informaci\xF3n cl\xEDnica identificable en texto plano. \xBFContinuar y guardar en un lugar seguro?"
  )) {
    return;
  }
  try {
    var res = await window.electronAPI.dbBackupExportJson();
    if (!res || res.ok === false) {
      rt10.showToast(res && res.error || "No se pudo exportar el respaldo", "error");
      return;
    }
    var envelope = res.envelope || res;
    downloadJsonPayload(
      envelope,
      "R-plus-respaldo-sqlcipher-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json"
    );
    rt10.showToast("Respaldo JSON exportado", "success");
  } catch {
    rt10.showToast("No se pudo exportar el respaldo", "error");
  }
}
async function exportClinicalDbBackupDb() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbBackupExportDb !== "function") {
    rt10.showToast("Exportaci\xF3n solo disponible con base cifrada en escritorio.", "error");
    return;
  }
  if (!window.confirm(
    "Se copiar\xE1 el archivo .db cifrado. Prot\xE9gelo como datos cl\xEDnicos sensibles. \xBFContinuar?"
  )) {
    return;
  }
  try {
    var res = await window.electronAPI.dbBackupExportDb();
    if (res && res.canceled) return;
    if (!res || res.ok === false) {
      rt10.showToast(res && res.error || "No se pudo exportar la copia .db", "error");
      return;
    }
    rt10.showToast("Copia .db guardada" + (res.path ? ": " + res.path : ""), "success");
  } catch {
    rt10.showToast("No se pudo exportar la copia .db", "error");
  }
}
var MED_CATALOG_MERGE_CAP = 400;
function mergeMedCatalogStored(incoming) {
  var cur = storage.getMedCatalog();
  var incAcc = incoming.accents && typeof incoming.accents === "object" ? incoming.accents : {};
  var accents = Object.assign({}, cur.accents, incAcc);
  function mergeArr(a, b) {
    var seen = /* @__PURE__ */ Object.create(null);
    var out = [];
    function add(list) {
      (list || []).forEach(function(t2) {
        var s = String(t2 || "").trim();
        if (!s) return;
        var k = s.toUpperCase();
        if (seen[k]) return;
        seen[k] = 1;
        out.push(s);
      });
    }
    add(a);
    add(b);
    return out.slice(0, MED_CATALOG_MERGE_CAP);
  }
  var st = cur.soapTokens || {};
  var si = incoming.soapTokens && typeof incoming.soapTokens === "object" ? incoming.soapTokens : {};
  function mergeSomePharm(curSp, incSp) {
    var out = /* @__PURE__ */ Object.create(null);
    var cTok = curSp && curSp.tokens ? curSp.tokens : {};
    var iTok = incSp && incSp.tokens ? incSp.tokens : {};
    var keys = Object.keys(cTok).concat(Object.keys(iTok));
    keys.forEach(function(cat) {
      out[cat] = mergeArr(cTok[cat], iTok[cat]);
    });
    return { tokens: out };
  }
  return {
    v: 1,
    accents,
    soapTokens: {
      vasop: mergeArr(st.vasop, si.vasop),
      abx: mergeArr(st.abx, si.abx),
      analgesia: mergeArr(st.analgesia, si.analgesia),
      antihta: mergeArr(st.antihta, si.antihta)
    },
    somePharm: mergeSomePharm(cur.somePharm, incoming.somePharm)
  };
}
function exportMedCatalogBundle() {
  var data = storage.getMedCatalog();
  downloadJsonPayload(
    {
      format: "r-plus-med-catalog",
      version: 1,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      accents: data.accents || {},
      soapTokens: data.soapTokens || { vasop: [], abx: [], analgesia: [], antihta: [] },
      somePharm: data.somePharm || { tokens: {} }
    },
    "R-plus-catalogo-medicamentos-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json"
  );
  addAuditEntry("med-catalog-export", "ok", Object.keys(data.accents || {}).length, "soap-export");
  rt10.showToast("Cat\xE1logo exportado", "success");
}
function triggerImportMedCatalog() {
  var el = document.getElementById("med-catalog-file-input");
  if (el) el.click();
}
function normalizeMedCatalogImportPayload(payload) {
  var accents = payload.accents;
  var soapTokens = payload.soapTokens;
  var somePharm = payload.somePharm;
  var hasAcc = accents && typeof accents === "object";
  var hasSoap = soapTokens && typeof soapTokens === "object";
  var hasSome = somePharm && typeof somePharm === "object";
  if (!hasAcc && !hasSoap && !hasSome) return null;
  return {
    accents: hasAcc ? accents : {},
    soapTokens: hasSoap ? soapTokens : {},
    somePharm: hasSome ? somePharm : {}
  };
}
function finishMedCatalogImport(merged) {
  storage.saveMedCatalog(merged);
  applyMedCatalogOverlay(merged);
  applySomePharmCatalogOverlay(merged);
  var nAcc = Object.keys(merged.accents || {}).length;
  var nTok = (merged.soapTokens.vasop || []).length + (merged.soapTokens.abx || []).length + (merged.soapTokens.analgesia || []).length + (merged.soapTokens.antihta || []).length;
  addAuditEntry("med-catalog-import", "ok", nTok, "accents:" + nAcc);
  rt10.showToast("Cat\xE1logo importado (fusionado con el tuyo)", "success");
}
function handleMedCatalogFileText(rawText) {
  try {
    var json = JSON.parse(String(rawText || ""));
    var payload = json && typeof json === "object" ? json : {};
    var normalized = normalizeMedCatalogImportPayload(payload);
    if (!normalized) {
      rt10.showToast(
        "El archivo no es un cat\xE1logo v\xE1lido (faltan accents, soapTokens o somePharm).",
        "error"
      );
      return;
    }
    finishMedCatalogImport(mergeMedCatalogStored(normalized));
  } catch {
    rt10.showToast("No se pudo leer el cat\xE1logo", "error");
  }
}
function onMedCatalogFileChosen(ev) {
  var input = ev.target;
  var f = input.files && input.files[0];
  input.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    handleMedCatalogFileText(reader.result);
  };
  reader.readAsText(f);
}

// public/js/features/platform/offline-rpc-health.mjs
var rt11 = getPlatformRuntime();
var pendingJobs = 0;
var rpcOffline = false;
function setRpcOfflineVisible(show) {
  var b = document.getElementById("rpc-offline-banner");
  if (!b) return;
  var visible = shouldShowLocalServerOfflineBanner(show);
  b.classList.toggle("visible", visible);
  if (!visible) {
    b.hidden = true;
    b.setAttribute("aria-hidden", "true");
  } else {
    b.hidden = false;
    b.removeAttribute("aria-hidden");
  }
}
function renderPendingJobsPill() {
  try {
    var pill = document.getElementById("pending-jobs-pill");
    if (!pill) return;
    if (pendingJobs > 0) {
      pill.textContent = "Procesando (" + pendingJobs + ")";
      pill.classList.add("visible");
    } else {
      pill.textContent = "";
      pill.classList.remove("visible");
    }
  } catch (e) {
    console.error("renderPendingJobsPill error:", e && e.message);
  }
}
function incrementPendingJobs() {
  pendingJobs += 1;
  renderPendingJobsPill();
}
function decrementPendingJobs() {
  pendingJobs = Math.max(0, pendingJobs - 1);
  renderPendingJobsPill();
}
function syncDocExportButtonOfflineState(btn) {
  if (!btn) return;
  if (rpcOffline && !canGenerateDocumentsOffline()) {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    btn.dataset.rpcOffline = "1";
    return;
  }
  if (btn.dataset.rpcOffline) delete btn.dataset.rpcOffline;
  if (!btn.classList.contains("loading")) {
    btn.disabled = false;
    btn.removeAttribute("aria-disabled");
  }
}
function syncOfflineButtonStates() {
  try {
    var exportButtons = document.querySelectorAll(".rpc-doc-export, #censo-export-confirm");
    exportButtons.forEach(function(b) {
      syncDocExportButtonOfflineState(b);
    });
  } catch (e) {
    console.error("syncOfflineButtonStates error:", e && e.message);
  }
}
function setRpcOffline(offline) {
  var prev = rpcOffline;
  rpcOffline = !!offline;
  setRpcOfflineVisible(rpcOffline);
  syncOfflineButtonStates();
  if (canGenerateDocumentsOffline()) return;
  if (!prev && rpcOffline) {
    try {
      rt11.showToast("Sin conexi\xF3n con el servidor local. Generaci\xF3n de documentos desactivada.", "error");
    } catch (_e) {
      void _e;
    }
  } else if (prev && !rpcOffline) {
    try {
      rt11.showToast("Servidor local reconectado.", "success");
    } catch (_e) {
      void _e;
    }
  }
}
function isRpcOffline() {
  return rpcOffline;
}
function isCloudMobileSurface() {
  try {
    if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return true;
    if (typeof document !== "undefined" && document.documentElement && (document.documentElement.dataset.cloudMobile === "1" || document.documentElement.classList.contains("rpc-cloud-mobile"))) {
      return true;
    }
  } catch (_e) {
    void _e;
  }
  return false;
}
function checkRpcServerHealth() {
  if (isCloudMobileSurface()) {
    try {
      rpcOffline = false;
      setRpcOfflineVisible(false);
      var offlineBanner = document.getElementById("rpc-offline-banner");
      if (offlineBanner) {
        offlineBanner.hidden = true;
        offlineBanner.classList.remove("visible");
      }
      var lanBanner = document.getElementById("lan-connection-banner");
      if (lanBanner) lanBanner.hidden = true;
    } catch (_e) {
      void _e;
    }
    return;
  }
  if (canGenerateDocumentsOffline()) {
    setRpcOffline(false);
    return;
  }
  try {
    fetch("/health", { method: "GET", cache: "no-store" }).then(function(r) {
      if (r.status === 429) return;
      if (!r.ok) throw new Error("bad status");
      return r.json();
    }).then(function(j) {
      if (j === void 0) return;
      try {
        if (!j || !j.ok) throw new Error("bad payload");
        setRpcOffline(false);
      } catch (e) {
        setRpcOffline(true);
        console.error("health payload error:", e && e.message);
      }
    }).catch(function() {
      try {
        setRpcOffline(true);
      } catch (e) {
        console.error("setRpcOffline error:", e && e.message);
      }
    });
  } catch (e) {
    console.error("checkRpcServerHealth crashed:", e && e.message);
    try {
      setRpcOffline(true);
    } catch (_e) {
      void _e;
    }
  }
}
function initRpcServerHealthWatch() {
  if (isCloudMobileSurface()) {
    checkRpcServerHealth();
    return;
  }
  if (canGenerateDocumentsOffline()) {
    checkRpcServerHealth();
    return;
  }
  checkRpcServerHealth();
  setInterval(checkRpcServerHealth, 15e3);
}

// public/js/features/platform/offline.mjs
var rt12 = getPlatformRuntime();
var idleLockTimerId = null;
var idleLockDebounceId = null;
var idleLockIsActive = false;
var idleLockEnabledMinutes = 0;
function getIdleLockMinutes() {
  var raw = parseInt(localStorage.getItem(IDLE_LOCK_LS_KEY) || "0", 10);
  if (!Number.isFinite(raw)) raw = 0;
  return IDLE_LOCK_VALID_MINUTES.indexOf(raw) !== -1 ? raw : 0;
}
function setIdleLockMinutesStored(mins) {
  var n = IDLE_LOCK_VALID_MINUTES.indexOf(mins) !== -1 ? mins : 0;
  if (n === 0) localStorage.removeItem(IDLE_LOCK_LS_KEY);
  else localStorage.setItem(IDLE_LOCK_LS_KEY, String(n));
}
function getIdleLockPinHash() {
  return localStorage.getItem(IDLE_LOCK_HASH_LS_KEY) || "";
}
function setIdleLockPinHash(hashHex) {
  if (hashHex) localStorage.setItem(IDLE_LOCK_HASH_LS_KEY, hashHex);
  else localStorage.removeItem(IDLE_LOCK_HASH_LS_KEY);
}
function isIdleLockPinFormatValid(pin) {
  return /^\d{4,8}$/.test(String(pin == null ? "" : pin));
}
async function computeSha256Hex(text) {
  if (!window.crypto || !window.crypto.subtle) throw new Error("WebCrypto no disponible");
  var enc = new TextEncoder();
  var buf = await crypto.subtle.digest("SHA-256", enc.encode(String(text)));
  var bytes = new Uint8Array(buf);
  var hex = "";
  for (var i = 0; i < bytes.length; i += 1) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}
async function promptForIdleLockPinSetup(reason) {
  var label = reason === "change" ? "Ingresa un nuevo PIN de 4 a 8 d\xEDgitos para el bloqueo:" : "Elige un PIN de 4 a 8 d\xEDgitos para el bloqueo por inactividad:";
  var p1 = prompt(label, "");
  if (p1 == null) return { ok: false, cancelled: true };
  if (!isIdleLockPinFormatValid(p1)) {
    rt12.showToast("PIN inv\xE1lido (solo 4-8 d\xEDgitos).", "error");
    return { ok: false, cancelled: false };
  }
  var p2 = prompt("Confirma el PIN:", "");
  if (p2 == null) return { ok: false, cancelled: true };
  if (p1 !== p2) {
    rt12.showToast("Los PIN no coinciden.", "error");
    return { ok: false, cancelled: false };
  }
  try {
    var hash = await computeSha256Hex(p1);
    setIdleLockPinHash(hash);
    addAuditEntry("idle-lock-pin-set", "ok", 0, reason === "change" ? "changed" : "created");
    return { ok: true, cancelled: false };
  } catch {
    rt12.showToast("WebCrypto no disponible en este entorno.", "error");
    addAuditEntry("idle-lock-pin-set", "error", 0, "no-webcrypto");
    return { ok: false, cancelled: false };
  }
}
function syncIdleLockSelectUi() {
  var sel = document.getElementById("settings-idle-lock");
  if (sel) sel.value = String(getIdleLockMinutes());
}
async function onIdleLockSelectChange(value) {
  var parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) parsed = 0;
  if (IDLE_LOCK_VALID_MINUTES.indexOf(parsed) === -1) parsed = 0;
  if (parsed === 0) {
    setIdleLockMinutesStored(0);
    addAuditEntry("idle-lock-disable", "ok", 0, "");
    restartIdleLockTimer();
    syncIdleLockSelectUi();
    rt12.showToast("Bloqueo por inactividad desactivado.", "success");
    return;
  }
  if (!getIdleLockPinHash()) {
    var setup = await promptForIdleLockPinSetup("create");
    if (!setup.ok) {
      syncIdleLockSelectUi();
      return;
    }
  }
  setIdleLockMinutesStored(parsed);
  addAuditEntry("idle-lock-enable", "ok", parsed, "");
  restartIdleLockTimer();
  syncIdleLockSelectUi();
  rt12.showToast("Bloqueo activo: " + parsed + " min.", "success");
}
async function changeIdleLockPin() {
  var existing = getIdleLockPinHash();
  if (existing) {
    var current = prompt("Ingresa el PIN actual para continuar:", "");
    if (current == null) return;
    if (!isIdleLockPinFormatValid(current)) {
      rt12.showToast("PIN con formato inv\xE1lido.", "error");
      addAuditEntry("idle-lock-pin-change", "error", 0, "invalid-format");
      return;
    }
    try {
      var hash = await computeSha256Hex(current);
      if (hash !== existing) {
        rt12.showToast("PIN incorrecto.", "error");
        addAuditEntry("idle-lock-pin-change", "error", 0, "wrong-pin");
        return;
      }
    } catch {
      rt12.showToast("WebCrypto no disponible.", "error");
      addAuditEntry("idle-lock-pin-change", "error", 0, "no-webcrypto");
      return;
    }
  }
  var setup = await promptForIdleLockPinSetup("change");
  if (setup.ok) {
    rt12.showToast("PIN actualizado \u2713", "success");
    restartIdleLockTimer();
  }
}
function restartIdleLockTimer() {
  if (idleLockDebounceId) {
    clearTimeout(idleLockDebounceId);
    idleLockDebounceId = null;
  }
  if (idleLockTimerId) {
    clearTimeout(idleLockTimerId);
    idleLockTimerId = null;
  }
  idleLockEnabledMinutes = getIdleLockMinutes();
  if (idleLockEnabledMinutes <= 0 || idleLockIsActive) return;
  idleLockTimerId = setTimeout(triggerIdleLock, idleLockEnabledMinutes * 60 * 1e3);
}
function onIdleActivity() {
  if (idleLockEnabledMinutes <= 0 || idleLockIsActive) return;
  if (idleLockDebounceId) return;
  idleLockDebounceId = setTimeout(function() {
    idleLockDebounceId = null;
    if (idleLockTimerId) clearTimeout(idleLockTimerId);
    idleLockTimerId = setTimeout(triggerIdleLock, idleLockEnabledMinutes * 60 * 1e3);
  }, IDLE_LOCK_DEBOUNCE_MS);
}
function triggerIdleLock() {
  if (idleLockIsActive) return;
  if (!getIdleLockPinHash()) return;
  idleLockIsActive = true;
  if (idleLockTimerId) {
    clearTimeout(idleLockTimerId);
    idleLockTimerId = null;
  }
  if (idleLockDebounceId) {
    clearTimeout(idleLockDebounceId);
    idleLockDebounceId = null;
  }
  showIdleLockOverlay();
  addAuditEntry("idle-lock-lock", "ok", idleLockEnabledMinutes, "inactivity");
}
function showIdleLockOverlay() {
  var overlay = document.getElementById("rpc-idle-lock-overlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  overlay.setAttribute("aria-hidden", "false");
  var err = document.getElementById("rpc-idle-lock-error");
  if (err) {
    err.style.display = "none";
    err.textContent = "";
  }
  var input = document.getElementById("rpc-idle-lock-pin");
  if (input) {
    input.value = "";
    setTimeout(function() {
      try {
        input.focus();
      } catch (_e) {
        void _e;
      }
    }, 60);
  }
}
function hideIdleLockOverlay() {
  var overlay = document.getElementById("rpc-idle-lock-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
}
async function submitIdleLockPin() {
  var input = document.getElementById("rpc-idle-lock-pin");
  var err = document.getElementById("rpc-idle-lock-error");
  var pin = input ? input.value : "";
  if (!isIdleLockPinFormatValid(pin)) {
    if (err) {
      err.style.display = "block";
      err.textContent = "Formato inv\xE1lido (4-8 d\xEDgitos).";
    }
    addAuditEntry("idle-lock-unlock", "error", 0, "invalid-format");
    if (input) {
      input.value = "";
      input.focus();
    }
    return;
  }
  var expected = getIdleLockPinHash();
  if (!expected) {
    idleLockIsActive = false;
    hideIdleLockOverlay();
    addAuditEntry("idle-lock-unlock", "ok", 0, "no-hash-bypass");
    restartIdleLockTimer();
    return;
  }
  try {
    var h = await computeSha256Hex(pin);
    if (h === expected) {
      idleLockIsActive = false;
      hideIdleLockOverlay();
      addAuditEntry("idle-lock-unlock", "ok", 0, "");
      restartIdleLockTimer();
    } else {
      if (err) {
        err.style.display = "block";
        err.textContent = "PIN incorrecto.";
      }
      addAuditEntry("idle-lock-unlock", "error", 0, "bad-pin");
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  } catch {
    if (err) {
      err.style.display = "block";
      err.textContent = "WebCrypto no disponible.";
    }
    addAuditEntry("idle-lock-unlock", "error", 0, "no-webcrypto");
  }
}
function initIdleLockFeature() {
  idleLockEnabledMinutes = getIdleLockMinutes();
  syncIdleLockSelectUi();
  if (idleLockEnabledMinutes > 0 && !getIdleLockPinHash()) {
    setIdleLockMinutesStored(0);
    idleLockEnabledMinutes = 0;
    syncIdleLockSelectUi();
    addAuditEntry("idle-lock-reset", "ok", 0, "missing-hash");
  }
  var onActivity = function() {
    onIdleActivity();
  };
  window.addEventListener("mousemove", onActivity, { passive: true });
  window.addEventListener("keydown", function(e) {
    if (idleLockIsActive) {
      if (e.key === "Enter") {
        var overlay = document.getElementById("rpc-idle-lock-overlay");
        if (overlay && overlay.style.display !== "none") {
          e.preventDefault();
          submitIdleLockPin();
        }
      }
      return;
    }
    onActivity();
  }, true);
  window.addEventListener("click", onActivity, { passive: true });
  restartIdleLockTimer();
}
var wipeModalWired = false;
function showWipeStep(stepId) {
  var steps = ["choose", "cache", "full"];
  steps.forEach(function(id) {
    var node = document.getElementById("rpc-wipe-step-" + id);
    if (!node) return;
    node.hidden = id !== stepId;
  });
  var modal = document.getElementById("rpc-wipe-modal");
  if (!modal) return;
  var titleId = stepId === "cache" ? "rpc-wipe-cache-title" : stepId === "full" ? "rpc-wipe-full-title" : "rpc-wipe-title";
  modal.setAttribute("aria-labelledby", titleId);
}
function resetWipeConfirmUi() {
  showWipeStep("choose");
  var input = document.getElementById("rpc-wipe-full-input");
  if (input) input.value = "";
  var err = document.getElementById("rpc-wipe-full-error");
  if (err) {
    err.textContent = "";
    err.hidden = true;
  }
}
function wireWipeDataModalOnce() {
  if (wipeModalWired) return;
  var panel = document.querySelector("#rpc-wipe-modal .rpc-wipe-panel");
  if (!panel) return;
  wipeModalWired = true;
  panel.addEventListener("click", function(ev) {
    var btn = ev.target.closest("[data-wipe-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-wipe-action");
    if (action === "close") closeWipeDataModal();
    else if (action === "choose") showWipeStep("choose");
    else if (action === "cache-exec") executeWipeCache();
    else if (action === "full-exec") executeWipeAll();
  });
  var input = document.getElementById("rpc-wipe-full-input");
  if (input) {
    input.addEventListener("keydown", function(ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        executeWipeAll();
      }
    });
  }
}
function openWipeDataModal() {
  closeSettingsDropdown();
  wireWipeDataModalOnce();
  var m = document.getElementById("rpc-wipe-modal");
  if (!m) return;
  resetWipeConfirmUi();
  m.style.display = "flex";
  m.setAttribute("aria-hidden", "false");
}
function closeWipeDataModal() {
  var m = document.getElementById("rpc-wipe-modal");
  if (!m) return;
  m.style.display = "none";
  m.setAttribute("aria-hidden", "true");
  resetWipeConfirmUi();
}
function collectCacheWipeKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i += 1) {
    var k = localStorage.key(i);
    if (!k) continue;
    if (k.indexOf("rpc-preimport-") === 0) keys.push(k);
    else if (k === AUDIT_LOG_KEY) keys.push(k);
    else if (k.indexOf("rpc-auto-backup-") === 0) keys.push(k);
    else if (k === IDLE_LOCK_LS_KEY) keys.push(k);
  }
  return keys;
}
function collectFullWipeKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i += 1) {
    var k = localStorage.key(i);
    if (!k) continue;
    if (k.indexOf("rpc-") === 0 || k === "theme" || k === "rplus-last-seen-app-version") {
      keys.push(k);
    }
  }
  return keys;
}
function wipeCacheConfirmed() {
  wireWipeDataModalOnce();
  showWipeStep("cache");
}
function wipeAllConfirmed() {
  wireWipeDataModalOnce();
  showWipeStep("full");
  var input = document.getElementById("rpc-wipe-full-input");
  if (input) setTimeout(function() {
    try {
      input.focus();
    } catch (_e) {
      void _e;
    }
  }, 60);
}
function executeWipeCache() {
  var keys = collectCacheWipeKeys();
  addAuditEntry("data-wipe-cache", "ok", keys.length, "pre-wipe");
  keys.forEach(function(k) {
    try {
      localStorage.removeItem(k);
    } catch (_e) {
      void _e;
    }
  });
  idleLockEnabledMinutes = 0;
  if (idleLockTimerId) {
    clearTimeout(idleLockTimerId);
    idleLockTimerId = null;
  }
  if (idleLockDebounceId) {
    clearTimeout(idleLockDebounceId);
    idleLockDebounceId = null;
  }
  addAuditEntry("data-wipe-cache", "ok", keys.length, "completed");
  closeWipeDataModal();
  syncIdleLockSelectUi();
  rt12.showToast("Se eliminaron " + keys.length + " elementos temporales.", "success");
}
function executeWipeAll() {
  var input = document.getElementById("rpc-wipe-full-input");
  var err = document.getElementById("rpc-wipe-full-error");
  var typed = String(input && input.value != null ? input.value : "").trim().toUpperCase();
  if (typed !== "BORRAR") {
    addAuditEntry("data-wipe-full", "cancelled", 0, "confirmation-failed");
    if (err) {
      err.textContent = "Escribe BORRAR en may\xFAsculas para continuar.";
      err.hidden = false;
    }
    if (input) input.focus();
    return;
  }
  if (err) {
    err.textContent = "";
    err.hidden = true;
  }
  var keys = collectFullWipeKeys();
  addAuditEntry("data-wipe-full", "ok", keys.length, "pre-wipe");
  keys.forEach(function(k) {
    try {
      localStorage.removeItem(k);
    } catch (_e) {
      void _e;
    }
  });
  closeWipeDataModal();
  if (window.electronAPI && typeof window.electronAPI.relaunchApp === "function") {
    try {
      window.electronAPI.relaunchApp();
      return;
    } catch (_e) {
      void _e;
    }
  }
  location.reload();
}
function openUserDataFolderFromSettings() {
  if (!window.electronAPI || !window.electronAPI.openUserDataFolder) {
    rt12.showToast("Solo disponible en la aplicaci\xF3n de escritorio.", "error");
    return;
  }
  window.electronAPI.openUserDataFolder().then(function(res) {
    if (res && res.ok) rt12.showToast("Carpeta abierta", "success");
    else rt12.showToast(res && res.error || "No se pudo abrir la carpeta", "error");
  }).catch(function() {
    rt12.showToast("No se pudo abrir la carpeta", "error");
  });
}
function safeExportSlug(str) {
  var s = (str || "paciente").replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+/g, "_").replace(/^_|_$/g, "");
  return (s || "paciente").slice(0, 48);
}

// public/js/features/platform/import-backup/backup-payload.mjs
var rt13 = getPlatformRuntime();
function buildBackupDataFromMemory() {
  var filteredPatients = getPatients().filter(function(p) {
    return p && !p.isDemo;
  });
  var notesPersist = {};
  Object.keys(getNotes() || {}).forEach(function(k) {
    if (getNotes()[k] && !String(k).startsWith("demo-")) notesPersist[k] = getNotes()[k];
  });
  var indPersist = {};
  Object.keys(getIndicaciones() || {}).forEach(function(k) {
    if (getIndicaciones()[k] && !String(k).startsWith("demo-")) indPersist[k] = getIndicaciones()[k];
  });
  var lhPersist = {};
  Object.keys(getLabHistory() || {}).forEach(function(k) {
    if (!String(k).startsWith("demo-")) lhPersist[k] = getLabHistory()[k];
  });
  var medPersist = {};
  Object.keys(getMedRecetaByPatient() || {}).forEach(function(k) {
    if (!String(k).startsWith("demo-")) medPersist[k] = getMedRecetaByPatient()[k];
  });
  var medPharmPersist = {};
  Object.keys(getMedPharmProfileByPatient() || {}).forEach(function(k) {
    if (!String(k).startsWith("demo-")) medPharmPersist[k] = getMedPharmProfileByPatient()[k];
  });
  var listPersist = {};
  Object.keys(getListadoProblemas() || {}).forEach(function(k) {
    if (getListadoProblemas()[k] && !String(k).startsWith("demo-")) listPersist[k] = getListadoProblemas()[k];
  });
  var settings = rt13.getSettings();
  if (!settings || typeof settings !== "object" || !Object.keys(settings).length) {
    settings = storage.getSettings();
  }
  return {
    patients: filteredPatients,
    notes: notesPersist,
    indicaciones: indPersist,
    labHistory: lhPersist,
    medRecetaByPatient: medPersist,
    medPharmProfileByPatient: medPharmPersist,
    listadoProblemas: listPersist,
    scheduledProcedures: storage.getScheduledProcedures(),
    settings,
    medCatalog: storage.getMedCatalog()
  };
}
function buildFullBackupPayload() {
  return {
    format: "r-plus-backup",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    theme: localStorage.getItem("theme") || "light",
    guidedTourDoneForVersion: localStorage.getItem(GUIDED_TOUR_LS_KEY),
    data: buildBackupDataFromMemory()
  };
}
async function persistFullBackupPayload(payload) {
  if (!payload || !payload.data) throw new Error("invalid-backup");
  replaceAppStateFromBackupData(payload.data);
  try {
    localStorage.setItem(
      "rpc-scheduled-procedures",
      JSON.stringify(
        Array.isArray(payload.data.scheduledProcedures) ? payload.data.scheduledProcedures : []
      )
    );
  } catch (_e) {
    void _e;
  }
  localStorage.setItem("rpc-settings", JSON.stringify(payload.data.settings || {}));
  if (payload.data.medCatalog && typeof payload.data.medCatalog === "object") {
    storage.saveMedCatalog(payload.data.medCatalog);
  }
  if (payload.theme === "dark" || payload.theme === "light") {
    localStorage.setItem("theme", payload.theme);
  }
  if (payload.guidedTourDoneForVersion) {
    localStorage.setItem(GUIDED_TOUR_LS_KEY, payload.guidedTourDoneForVersion);
  } else {
    localStorage.removeItem(GUIDED_TOUR_LS_KEY);
  }
  var result = await persistClinicalState({ immediate: true });
  if (!result || !result.ok) {
    throw new Error(result && result.code || "SAVE_FAILED");
  }
  return result;
}

// public/js/features/platform/import-backup/auto-backup.mjs
var rt14 = getPlatformRuntime();
var autoBackupSchedulerId = null;
function defaultAutoBackupSettings() {
  return { frequency: "off", retention: 7, lastRunAt: 0 };
}
function getAutoBackupSettings() {
  try {
    var saved = JSON.parse(localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY) || "{}");
    var frequency = saved.frequency === "daily" || saved.frequency === "weekly" ? saved.frequency : "off";
    var retention = parseInt(saved.retention, 10);
    if (retention !== 3 && retention !== 7 && retention !== 14) retention = 7;
    var lastRunAt = parseInt(saved.lastRunAt, 10);
    return { frequency, retention, lastRunAt: Number.isFinite(lastRunAt) ? lastRunAt : 0 };
  } catch {
    return defaultAutoBackupSettings();
  }
}
function saveAutoBackupSettings(cfg) {
  localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(cfg));
}
function getAutoBackupIndex() {
  try {
    var list = JSON.parse(localStorage.getItem(AUTO_BACKUP_INDEX_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function saveAutoBackupIndex(list) {
  localStorage.setItem(AUTO_BACKUP_INDEX_KEY, JSON.stringify(list.slice(0, AUTO_BACKUP_MAX)));
}
function syncAutoBackupUi() {
  var cfg = getAutoBackupSettings();
  var freqEl = document.getElementById("auto-backup-frequency");
  var retEl = document.getElementById("auto-backup-retention");
  if (freqEl) freqEl.value = cfg.frequency;
  if (retEl) retEl.value = String(cfg.retention);
}
function updateAutoBackupSettingsFromUi() {
  var cfg = getAutoBackupSettings();
  var freqEl = document.getElementById("auto-backup-frequency");
  var retEl = document.getElementById("auto-backup-retention");
  cfg.frequency = freqEl ? freqEl.value : cfg.frequency;
  cfg.retention = retEl ? parseInt(retEl.value, 10) : cfg.retention;
  if (cfg.retention !== 3 && cfg.retention !== 7 && cfg.retention !== 14) cfg.retention = 7;
  saveAutoBackupSettings(cfg);
  addAuditEntry("auto-backup-config", "ok", cfg.retention, cfg.frequency);
  maybeRunScheduledAutoBackup();
}
function shouldRunScheduledBackup(cfg) {
  if (!cfg || cfg.frequency === "off") return false;
  var now = Date.now();
  var delta = cfg.frequency === "weekly" ? 7 * 24 * 36e5 : 24 * 36e5;
  return !cfg.lastRunAt || now - cfg.lastRunAt >= delta;
}
function maybeRunScheduledAutoBackup() {
  var cfg = getAutoBackupSettings();
  if (!shouldRunScheduledBackup(cfg)) return;
  runAutoBackupNow(true);
}
function restartAutoBackupScheduler() {
  if (autoBackupSchedulerId) clearInterval(autoBackupSchedulerId);
  autoBackupSchedulerId = setInterval(function() {
    maybeRunScheduledAutoBackup();
  }, 30 * 60 * 1e3);
}
async function runAutoBackupNow(isScheduled) {
  await persistClinicalState({ immediate: true });
  var cfg = getAutoBackupSettings();
  var payload = buildFullBackupPayload();
  payload.autoBackup = { scheduled: !!isScheduled };
  var ts = Date.now();
  var fileName = "R-plus-auto-respaldo-" + formatDateSlug(new Date(ts)) + "-" + String(ts).slice(-6) + ".json";
  downloadJsonPayload(payload, fileName);
  var idx = getAutoBackupIndex();
  idx.unshift({ id: ts, fileName, createdAt: new Date(ts).toISOString(), patients: (payload.data.patients || []).length });
  idx = idx.slice(0, cfg.retention);
  saveAutoBackupIndex(idx);
  cfg.lastRunAt = ts;
  saveAutoBackupSettings(cfg);
  addAuditEntry("backup-auto", "ok", (payload.data.patients || []).length, isScheduled ? "scheduled" : "manual");
  rt14.showToast("Auto-respaldo generado", "success");
}

// public/js/features/platform/import-backup/preimport.mjs
var rt15 = getPlatformRuntime();
function syncPreimportBackupUi() {
  var wrap = document.getElementById("settings-preimport-restore-wrap");
  if (!wrap) return;
  var raw = localStorage.getItem(PREIMPORT_BACKUP_KEY);
  var has = false;
  var meta = "";
  try {
    if (raw) {
      var p = JSON.parse(raw);
      if (p && p.format === "r-plus-backup" && p.version === 1 && p.data) {
        has = true;
        var n = (p.data.patients || []).length;
        var when = p.exportedAt ? String(p.exportedAt).slice(0, 19).replace("T", " ") : "";
        meta = (when ? when + " \xB7 " : "") + n + " paciente(s)";
      }
    }
  } catch (_e) {
    void _e;
  }
  wrap.style.display = has ? "block" : "none";
  var el = document.getElementById("settings-preimport-meta");
  if (el) el.textContent = has ? meta : "\u2014";
}
function restorePreimportBackupPrompt() {
  var raw = localStorage.getItem(PREIMPORT_BACKUP_KEY);
  if (!raw) {
    rt15.showToast(
      "No hay copia autom\xE1tica previa a una importaci\xF3n. Revisa Descargas por archivos R-plus-respaldo- o R-plus-auto-respaldo-.",
      "error"
    );
    syncPreimportBackupUi();
    return;
  }
  var payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    rt15.showToast("La copia autom\xE1tica previa est\xE1 da\xF1ada.", "error");
    return;
  }
  if (!payload || payload.format !== "r-plus-backup" || payload.version !== 1 || !payload.data) {
    rt15.showToast("Formato de respaldo no v\xE1lido.", "error");
    return;
  }
  var n = (payload.data.patients || []).length;
  if (!confirm(
    "\xBFRestaurar la copia guardada autom\xE1ticamente antes de la \xFAltima importaci\xF3n completa? (" + n + " pacientes). La aplicaci\xF3n se recargar\xE1."
  )) {
    return;
  }
  if (typeof pushUndoSnapshot === "function") rt15.pushUndoSnapshot("Antes de restaurar copia pre-importaci\xF3n");
  persistFullBackupPayload(payload).then(function() {
    addAuditEntry("preimport-restore", "ok", n, payload.exportedAt || "");
    location.reload();
  }).catch(function() {
    rt15.showToast("No se pudo restaurar la copia autom\xE1tica.", "error");
  });
}

// public/js/features/platform/import-backup/date-utils.mjs
function parseDateDMY(value) {
  var t2 = String(value || "").trim();
  var m = t2.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  var day = parseInt(m[1], 10);
  var month = parseInt(m[2], 10);
  var y = parseInt(m[3], 10);
  if (y < 100) y += 2e3;
  var d = new Date(y, month - 1, day);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() !== y || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}
function parseDateRangePrompt(raw) {
  var txt = String(raw || "").trim();
  var m = txt.match(/^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+-\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})$/);
  if (!m) return null;
  var from = parseDateDMY(m[1]);
  var to = parseDateDMY(m[2]);
  if (!from || !to) return null;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  if (from.getTime() > to.getTime()) return null;
  return { from, to, fromLabel: m[1], toLabel: m[2] };
}
function patientInDateRange(entry, range) {
  var nDate = entry && entry.note ? parseDateDMY(entry.note.fecha) : null;
  var iDate = entry && entry.indicaciones ? parseDateDMY(entry.indicaciones.fecha) : null;
  var nMs = nDate ? nDate.getTime() : null;
  var iMs = iDate ? iDate.getTime() : null;
  var min = range.from.getTime();
  var max = range.to.getTime();
  return nMs !== null && nMs >= min && nMs <= max || iMs !== null && iMs >= min && iMs <= max;
}

// public/js/features/notes-indicaciones.mjs
var rt16 = {
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
  renderRoundOverviewPanels() {
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
  Object.assign(rt16, ctx);
}
function aid2() {
  return rt16.getActiveId();
}
function applyProfileToNoteIfEmpty(note) {
  if (!note) return false;
  var changed = false;
  if ((rt16.getSettings() || {}).doctorName && !String(note.medico || "").trim()) {
    note.medico = (rt16.getSettings() || {}).doctorName;
    changed = true;
  }
  if ((rt16.getSettings() || {}).profesorName && !String(note.profesor || "").trim()) {
    note.profesor = (rt16.getSettings() || {}).profesorName;
    changed = true;
  }
  return changed;
}
function renderNoteForm() {
  if (getFormatsEditMode() === "nota") {
    var st = rt16.getSettings() || {};
    loadDraftFromSettings(st);
    document.getElementById("note-form").innerHTML = buildNoteDefaultsEditorHtml(st);
    return;
  }
  var patient = getPatients().find(function(p) {
    return String(p.id) === String(aid2());
  });
  if (!patient) return;
  if (aid2()) {
    if (!getNotes()[aid2()]) getNotes()[aid2()] = {};
    var changed = applyProfileToNoteIfEmpty(getNotes()[aid2()]);
    if (applyNotaFormatScaffoldIfEmpty(getNotes()[aid2()], rt16.getSettings() || {})) changed = true;
    if (changed) persistClinicalState();
  }
  var note = getNotes()[aid2()] || {};
  var pid = aid2();
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
  rt16.syncOfflineButtonStates();
}
function updateNote(field, value) {
  if (!getNotes()[aid2()]) getNotes()[aid2()] = {};
  getNotes()[aid2()][field] = value;
  persistClinicalState();
  if (field === "estudios") rt16.renderRoundOverviewPanels();
}
function updateDx(i, val) {
  if (!getNotes()[aid2()]) return;
  getNotes()[aid2()].diagnosticos[i] = val.toUpperCase();
  persistClinicalState();
}
function addDx() {
  if (!getNotes()[aid2()]) return;
  getNotes()[aid2()].diagnosticos.push("");
  persistClinicalState();
  renderNoteForm();
}
function removeDx(i) {
  if (!getNotes()[aid2()] || getNotes()[aid2()].diagnosticos.length <= 1) return;
  getNotes()[aid2()].diagnosticos.splice(i, 1);
  persistClinicalState();
  renderNoteForm();
}
function syncNoteDxFromCenso() {
  var pid = aid2();
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
    var ok = window.confirm(
      "\xBFReemplazar los diagn\xF3sticos de la nota con los del censo del paciente?"
    );
    if (!ok) return;
  }
  if (!syncNoteDxFromPatient(note, pat, { mode: "replace" })) {
    rt16.showToast("No hay diagn\xF3sticos en el censo de este paciente.", "info");
    return;
  }
  persistClinicalState();
  renderNoteForm();
  rt16.showToast("Diagn\xF3sticos del censo en la nota \u2713", "success");
}
function updateTx(i, val) {
  if (!getNotes()[aid2()]) return;
  getNotes()[aid2()].tratamiento[i] = val;
  persistClinicalState();
}
function addTx() {
  if (!getNotes()[aid2()]) return;
  getNotes()[aid2()].tratamiento.push("");
  persistClinicalState();
  renderNoteForm();
}
function removeTx(i) {
  if (!getNotes()[aid2()] || getNotes()[aid2()].tratamiento.length <= 1) return;
  getNotes()[aid2()].tratamiento.splice(i, 1);
  persistClinicalState();
  renderNoteForm();
}
function generateWord() {
  if (rt16.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt16.isRpcOffline, showToast: rt16.showToast })) return;
  var patient = getPatients().find(function(p) {
    return p.id === aid2();
  });
  if (!patient) return;
  var note = getNotes()[aid2()];
  if (!note) return;
  if (ensureNoteDxFromPatientForExport(note, patient)) persistClinicalState();
  var btn = document.getElementById("btn-gen");
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Generando\u2026" });
  rt16.incrementPendingJobs();
  function buildPayload() {
    return { patient, note };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) return Promise.resolve(void 0);
    return window.electronAPI.selectOutputDir();
  }
  function saveOutputDir(dir) {
    if (!dir) return;
    var st = rt16.getSettings() || {};
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
      rt16.showToast("Nota guardada: " + name, "success");
      rt16.guidedTourAdvanceAfterNotaGenerated();
    },
    onPrompt: function() {
      rt16.showToast("Selecciona una carpeta para guardar el documento.", "error");
    },
    onCancel: function() {
      rt16.showToast("No se guard\xF3 el documento: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(msg) {
      rt16.showToast("Error: " + msg, "error");
    }
  }).catch(function() {
    rt16.showToast("Error de conexi\xF3n", "error");
    if (typeof rt16.onPitchTourDocFailed === "function") rt16.onPitchTourDocFailed("ic_nota");
  }).finally(function() {
    setAsyncButtonLoading(document.getElementById("btn-gen"), false);
    rt16.decrementPendingJobs();
    rt16.syncOfflineButtonStates();
  });
}
function renderIndicaForm() {
  if (getFormatsEditMode() === "indica") {
    var st = rt16.getSettings() || {};
    loadDraftFromSettings(st);
    document.getElementById("indica-form").innerHTML = buildIndicaDefaultsEditorHtml(st);
    return;
  }
  if (!getPatients().some(function(p) {
    return p.id === aid2();
  })) return;
  if (!getIndicaciones()[aid2()]) {
    var today = /* @__PURE__ */ new Date();
    getIndicaciones()[aid2()] = { fecha: String(today.getDate()).padStart(2, "0") + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + today.getFullYear(), hora: String(today.getHours()).padStart(2, "0") + ":" + String(today.getMinutes()).padStart(2, "0"), medicos: "", dieta: "", cuidados: "", estudios: "", medicamentos: "", interconsultas: "", otros: [] };
    applyIndicacionesFormatScaffoldIfEmpty(getIndicaciones()[aid2()], rt16.getSettings() || {});
    persistClinicalState();
  }
  var ind = getIndicaciones()[aid2()];
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
  rt16.syncOfflineButtonStates();
}
function updateIndica(field, value) {
  if (!getIndicaciones()[aid2()]) return;
  getIndicaciones()[aid2()][field] = value;
  persistClinicalState();
}
function updateOtro(i, field, value) {
  if (!getIndicaciones()[aid2()]) return;
  getIndicaciones()[aid2()].otros[i][field] = value;
  persistClinicalState();
}
function addOtro() {
  if (!getIndicaciones()[aid2()]) return;
  getIndicaciones()[aid2()].otros = getIndicaciones()[aid2()].otros || [];
  getIndicaciones()[aid2()].otros.push({ titulo: "", contenido: "" });
  persistClinicalState();
  renderIndicaForm();
}
function removeOtro(i) {
  if (!getIndicaciones()[aid2()]) return;
  getIndicaciones()[aid2()].otros.splice(i, 1);
  persistClinicalState();
  renderIndicaForm();
}
function buildExtraTemplatesSelectorHtml() {
  var arr = (rt16.getSettings() || {}) && Array.isArray((rt16.getSettings() || {}).extraTemplates) ? (rt16.getSettings() || {}).extraTemplates : [];
  var predBtn = '<button type="button" class="btn-med-secondary" onclick="openIndicaFormatsFromProfile()" title="Editar formatos en blanco de indicaciones">Predeterminados\u2026</button>';
  if (!arr.length) {
    return '<div class="indica-extra-tmpl">' + predBtn + '<span class="iet-hint">Plantillas guardadas: Ajustes \u2192 Plantillas. Formatos en blanco: Predeterminados\u2026</span></div>';
  }
  var opts = '<option value="">\u2014 Aplicar plantilla guardada \u2014</option>' + arr.map(function(t2) {
    return '<option value="' + esc(t2.id) + '">' + esc(t2.label || "(sin nombre)") + "</option>";
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
    rt16.showToast("Elige una plantilla", "error");
    return;
  }
  if (!aid2() || !getIndicaciones()[aid2()]) {
    rt16.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var tmpl = ((rt16.getSettings() || {}).extraTemplates || []).find(function(t2) {
    return t2.id === sel.value;
  });
  if (!tmpl) return;
  var target = getIndicaciones()[aid2()];
  var mode = resolveExtraTemplateMergeMode(indicaHasExistingContent(target));
  if (!mode) return;
  applyIndicaTemplateFields(target, tmpl, mode);
  persistClinicalState();
  renderIndicaForm();
  rt16.addAuditEntry("extra-template-apply", "ok", 1, tmpl.label || "");
  rt16.showToast("Plantilla aplicada: " + (tmpl.label || ""), "success");
}
function generateIndicaciones() {
  if (rt16.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt16.isRpcOffline, showToast: rt16.showToast })) return;
  var patient = getPatients().find(function(p) {
    return p.id === aid2();
  });
  if (!patient) return;
  var ind = getIndicaciones()[aid2()];
  if (!ind) return;
  var btn = document.getElementById("btn-gen-ind");
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Generando\u2026" });
  rt16.incrementPendingJobs();
  function buildPayload() {
    return { patient, indicaciones: ind };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) return Promise.resolve(void 0);
    return window.electronAPI.selectOutputDir();
  }
  function saveOutputDir(dir) {
    if (!dir) return;
    var st = rt16.getSettings() || {};
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
      rt16.showToast("Indicaciones guardadas: " + name, "success");
      rt16.guidedTourAdvanceAfterIndicaGenerated();
    },
    onPrompt: function() {
      rt16.showToast("Selecciona una carpeta para guardar el documento.", "error");
    },
    onCancel: function() {
      rt16.showToast("No se guard\xF3 el documento: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(msg) {
      rt16.showToast("Error: " + msg, "error");
    }
  }).catch(function() {
    rt16.showToast("Error de conexi\xF3n", "error");
    if (typeof rt16.onPitchTourDocFailed === "function") rt16.onPitchTourDocFailed("ic_indica");
  }).finally(function() {
    setAsyncButtonLoading(document.getElementById("btn-gen-ind"), false);
    rt16.decrementPendingJobs();
    rt16.syncOfflineButtonStates();
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

// public/js/features/patients-bulk-select.mjs
var _mode = false;
var _selected = /* @__PURE__ */ new Set();
function isPatientBulkSelectMode() {
  return _mode;
}
function getPatientBulkSelectedIds() {
  return Array.from(_selected);
}
function getPatientBulkSelectedCount() {
  return _selected.size;
}
function isPatientBulkSelected(patientId) {
  return _selected.has(String(patientId || "").trim());
}
function setPatientBulkSelectMode(on) {
  _mode = !!on;
  if (!_mode) _selected.clear();
}
function togglePatientBulkSelectMode() {
  setPatientBulkSelectMode(!_mode);
  return _mode;
}
function togglePatientBulkSelected(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid || pid.indexOf("demo-") === 0) return false;
  if (_selected.has(pid)) _selected.delete(pid);
  else _selected.add(pid);
  return _selected.has(pid);
}
function exitPatientBulkSelectMode() {
  setPatientBulkSelectMode(false);
}

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
function createVirtualScrollApi(state3) {
  const { container, inner, activeNodes, pool, itemHeight, releaseNode } = state3;
  let { currentItems, rafId, range } = state3;
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
      overscan: state3.overscan
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
        renderItem: state3.renderItem,
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
      state3.currentItems = nextItems;
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
var state2 = {
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
  if (state2.resizeObserver) {
    state2.resizeObserver.disconnect();
    state2.resizeObserver = null;
  }
}
function destroyPatientActiveZoneVirtual() {
  detachResizeObserver();
  if (state2.instance) {
    state2.instance.destroy();
    state2.instance = null;
  }
  if (state2.zoneEl) {
    state2.zoneEl.classList.remove("patient-sort-zone--virtual-active");
    state2.zoneEl.style.removeProperty("overflow");
    state2.zoneEl.style.removeProperty("max-height");
    state2.zoneEl.style.removeProperty("min-height");
    state2.zoneEl.removeAttribute("data-active-ids");
    state2.zoneEl = null;
  }
  state2.listEl = null;
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
    state2.resizeObserver = new ResizeObserver(() => {
      syncActiveZoneMaxHeight(listEl, zoneEl);
    });
    state2.resizeObserver.observe(listEl);
    state2.resizeObserver.observe(zoneEl);
  }
  const renderItem = ({ item }) => renderPatientCardElement(item, renderCardHtml, ctx);
  if (state2.instance && state2.zoneEl === zoneEl) {
    state2.listEl = listEl;
    state2.instance.updateItems(items);
    return state2.instance;
  }
  destroyPatientActiveZoneVirtual();
  state2.zoneEl = zoneEl;
  state2.listEl = listEl;
  state2.instance = createVirtualScroll({
    container: zoneEl,
    items,
    estimateItemHeight: PATIENT_ACTIVE_ITEM_STRIDE,
    overscan: 3,
    renderItem
  });
  return state2.instance;
}
function updatePatientActiveZoneVirtual(options) {
  if (!state2.instance || !state2.zoneEl || !state2.listEl) return false;
  const { items, renderCardHtml, ctx } = options;
  state2.zoneEl.setAttribute(
    "data-active-ids",
    items.map((p) => String(p.id || "")).join(",")
  );
  state2.instance.destroy();
  state2.instance = createVirtualScroll({
    container: state2.zoneEl,
    items,
    estimateItemHeight: PATIENT_ACTIVE_ITEM_STRIDE,
    overscan: 3,
    renderItem: ({ item }) => renderPatientCardElement(item, renderCardHtml, ctx)
  });
  syncActiveZoneMaxHeight(state2.listEl, state2.zoneEl);
  return true;
}
function trySilentVirtualPatientListPatch(list, options) {
  if (!list || options.patientSearchFilter) return false;
  if (!shouldVirtualizeActiveZone(options.zones.active.length)) return false;
  if (!list.querySelector('.patient-sort-zone--virtual-active[data-patient-zone="active"]')) return false;
  if (!state2.instance) return false;
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

// public/js/patient-admission-incomplete.mjs
function isPatientAdmissionIncomplete(patient, settings) {
  if (!patient || patient.isDemo) return false;
  var cuarto = String(patient.cuarto || "").trim();
  var cama = String(patient.cama || "").trim();
  var servicio = String(patient.servicio || "").trim();
  var area = String(patient.area || "").trim();
  if (!cuarto || !cama) return true;
  if (!servicio) return true;
  if (!isModeSala(settings) && !area) return true;
  return false;
}

// public/js/patient-validation.mjs
function validatePatientForSave(input) {
  const nombre = String(input?.nombre || "").trim();
  const registro = String(input?.registro || "").trim();
  const edadNum = String(input?.edadNum || "").trim();
  if (!nombre) return { ok: false, error: "Falta el nombre del paciente." };
  if (edadNum) {
    const n = Number(edadNum);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "La edad debe ser un n\xFAmero v\xE1lido." };
    }
  }
  if (!registro) return { ok: true, warning: "missing_expediente" };
  return { ok: true };
}
function buildExpedienteAdvice() {
  return {
    title: "Falta el n\xFAmero de expediente",
    body: 'No capturaste expediente. Para ingresar pacientes en un solo paso, copia el texto desde "Expediente:" hasta el final del reporte y p\xE9galo en la pesta\xF1a Laboratorio: R+ rellena nombre, expediente, edad y sexo autom\xE1ticamente.',
    confirmLabel: "Guardar sin expediente",
    cancelLabel: "Volver y completar"
  };
}

// public/js/patient-registro-parse.mjs
function parseRegistrosFromBulkInput(raw) {
  var parts = String(raw || "").split(/[\s,;]+|\n+/).map(function(s) {
    return String(s || "").trim();
  }).filter(Boolean);
  var seen = /* @__PURE__ */ Object.create(null);
  var out = [];
  parts.forEach(function(reg) {
    var key = reg.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(reg);
  });
  return out;
}

// public/js/patient-registro-modal-ui.mjs
var registroModalRows = [""];
var registroModalMultiMode = false;
function setElementDisplay(el, visible) {
  if (!el) return;
  el.style.display = visible ? "" : "none";
}
function registroRowsForRender() {
  if (registroModalMultiMode) {
    return registroModalRows.length ? registroModalRows.slice() : [""];
  }
  return [registroModalRows[0] || ""];
}
function renderRegistroModalListHtml() {
  var rows = registroRowsForRender();
  return rows.map(function(val, i) {
    var canRemove = registroModalMultiMode && rows.length > 1;
    var placeholder = registroModalMultiMode ? "Registro " + (i + 1) : "0000000-0";
    return '<div class="vpo-dx-row list-row"><input type="text" class="ea-input m-registro-row-input" value="' + esc(val) + '" placeholder="' + esc(placeholder) + '" oninput="onRegistroModalInput(' + i + ', this.value)" onpaste="onRegistroModalRowPaste(event, ' + i + ')"><button type="button" class="btn-remove" onclick="removeRegistroModalRow(' + i + ')"' + (canRemove ? "" : ' style="visibility:hidden"') + ' aria-label="Eliminar">\xD7</button></div>';
  }).join("");
}
function refreshRegistroModalListDom() {
  var listEl = document.getElementById("m-registro-list");
  if (!listEl) return;
  listEl.innerHTML = renderRegistroModalListHtml();
}
function initRegistroModalRows(values) {
  registroModalRows = values && values.length ? values.slice() : [""];
  if (registroModalMultiMode && !registroModalRows.length) registroModalRows = [""];
  var paste = document.getElementById("m-registro-paste");
  if (paste) paste.value = "";
  refreshRegistroModalListDom();
}
function setRegistroModalMultiMode(on) {
  registroModalMultiMode = !!on;
  setElementDisplay(document.getElementById("m-registro-toolbar"), on);
  setElementDisplay(document.getElementById("m-registro-paste-wrap"), on);
  if (!on && registroModalRows.length > 1) {
    registroModalRows = [registroModalRows[0] || ""];
  }
  refreshRegistroModalListDom();
}
function normalizeRegistroModalValues(rows) {
  return parseRegistrosFromBulkInput(
    rows.map(function(r) {
      return String(r || "").trim();
    }).filter(Boolean).join("\n")
  );
}
function expandRegistroRowsFromInput(rows, index, value) {
  var base = Array.isArray(rows) ? rows.slice() : [""];
  var idx = Math.max(0, Number(index) || 0);
  while (base.length <= idx) base.push("");
  var parsed = parseRegistrosFromBulkInput(value);
  if (parsed.length <= 1) {
    base[idx] = String(value || "");
    return base;
  }
  var before = base.slice(0, idx);
  var after = base.slice(idx + 1).filter(function(r) {
    return String(r || "").trim();
  });
  return before.concat(parsed).concat(after).concat([""]);
}
function mergeRegistroPasteIntoRows(rows, pasteRaw) {
  var parsed = parseRegistrosFromBulkInput(pasteRaw);
  if (!parsed.length) return Array.isArray(rows) ? rows.slice() : [""];
  return parsed.concat([""]);
}
function collectRegistroModalRegistros() {
  var inputs = document.querySelectorAll("#m-registro-list .m-registro-row-input");
  var values = [];
  inputs.forEach(function(input) {
    values.push(String(input.value || "").trim());
  });
  var paste = document.getElementById("m-registro-paste");
  if (paste && String(paste.value || "").trim()) {
    values = values.concat(parseRegistrosFromBulkInput(paste.value));
  }
  return normalizeRegistroModalValues(values);
}
function readRegistroModalPrimary() {
  var list = collectRegistroModalRegistros();
  return list[0] || "";
}
function focusRegistroModalFirst() {
  var inputs = document.querySelectorAll("#m-registro-list .m-registro-row-input");
  for (var i = 0; i < inputs.length; i++) {
    if (!String(inputs[i].value || "").trim()) {
      try {
        inputs[i].focus();
      } catch (_e) {
        void _e;
      }
      return;
    }
  }
  if (inputs.length) {
    try {
      inputs[0].focus();
    } catch (_e) {
      void _e;
    }
  }
}
function focusRegistroModalAny() {
  var inputs = document.querySelectorAll("#m-registro-list .m-registro-row-input");
  if (inputs.length) {
    try {
      inputs[0].focus();
    } catch (_e) {
      void _e;
    }
    return;
  }
  var legacy = document.getElementById("m-registro");
  if (legacy) {
    try {
      legacy.focus();
    } catch (_e) {
      void _e;
    }
  }
}
function onRegistroModalInput(index, value) {
  var parsed = parseRegistrosFromBulkInput(value);
  if (!registroModalMultiMode) {
    if (parsed.length > 1) {
      registroModalRows = expandRegistroRowsFromInput([""], 0, value);
      setRegistroModalMultiMode(true);
      return;
    }
    registroModalRows = [String(value || "")];
    return;
  }
  if (!Array.isArray(registroModalRows)) registroModalRows = [""];
  registroModalRows = expandRegistroRowsFromInput(registroModalRows, index, value);
  if (parsed.length > 1) refreshRegistroModalListDom();
}
function onRegistroModalRowPaste(event, index) {
  var clip = event && event.clipboardData && typeof event.clipboardData.getData === "function" ? event.clipboardData.getData("text") : "";
  if (!clip || parseRegistrosFromBulkInput(clip).length <= 1) return;
  if (event && typeof event.preventDefault === "function") event.preventDefault();
  onRegistroModalInput(index, clip);
}
function addRegistroModalRow() {
  if (!registroModalMultiMode) return;
  if (!Array.isArray(registroModalRows)) registroModalRows = [""];
  registroModalRows.push("");
  refreshRegistroModalListDom();
  var inputs = document.querySelectorAll("#m-registro-list .m-registro-row-input");
  var last = inputs[inputs.length - 1];
  if (last) {
    try {
      last.focus();
    } catch (_e) {
      void _e;
    }
  }
}
function removeRegistroModalRow(index) {
  if (!registroModalMultiMode || !Array.isArray(registroModalRows)) return;
  if (registroModalRows.length <= 1) return;
  registroModalRows.splice(index, 1);
  refreshRegistroModalListDom();
}
function splitRegistroModalPaste() {
  var ta = document.getElementById("m-registro-paste");
  if (!ta || !registroModalMultiMode) return;
  if (!parseRegistrosFromBulkInput(ta.value).length) return;
  registroModalRows = mergeRegistroPasteIntoRows(registroModalRows, ta.value);
  ta.value = "";
  refreshRegistroModalListDom();
}
function onRegistroModalPasteAreaInput() {
  var ta = document.getElementById("m-registro-paste");
  if (!ta || !registroModalMultiMode) return;
  var raw = String(ta.value || "");
  if (!raw.trim() || !/[\r\n]/.test(raw)) return;
  if (!parseRegistrosFromBulkInput(raw).length) return;
  splitRegistroModalPaste();
}
var patientRegistroModalWindowHandlers = {
  onRegistroModalInput,
  onRegistroModalRowPaste,
  addRegistroModalRow,
  removeRegistroModalRow,
  splitRegistroModalPaste,
  onRegistroModalPasteAreaInput
};

// public/js/features/patients-modal-dialogs.mjs
function normalizeName(str) {
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function findDuplicatePatient(nombre, registro) {
  var nombreNorm = normalizeName(nombre);
  return getPatients().find(function(p) {
    if (p.isDemo) return false;
    if (registro && p.registro && registro === p.registro) return true;
    return normalizeName(p.nombre) === nombreNorm;
  });
}
function showDuplicateWarning(existing, onConfirm) {
  var fecha = getNotes()[existing.id] ? getNotes()[existing.id].fecha : "";
  var body = "<strong>" + esc(existing.nombre) + "</strong>";
  body += "<br>Cto. " + esc(existing.cuarto || "\u2014") + " Cama " + esc(existing.cama || "\u2014");
  if (existing.registro) body += "<br>Registro: " + esc(existing.registro);
  if (fecha) body += "<br>Ingreso: " + esc(fecha);
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "dup-confirm-backdrop";
  backdrop.innerHTML = '<div class="lab-conflict-modal"><h3>Paciente similar encontrado</h3><p>' + body + `</p><div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button onclick="document.getElementById('dup-confirm-backdrop').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:#1f2937;">Cancelar</button><button id="dup-confirm-btn" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Agregar de todas formas</button></div></div>`;
  document.body.appendChild(backdrop);
  document.getElementById("dup-confirm-btn").onclick = function() {
    document.getElementById("dup-confirm-backdrop").remove();
    onConfirm();
  };
}
function showExpedienteAdvice(onConfirm) {
  var prev = document.getElementById("exp-advice-backdrop");
  if (prev) prev.remove();
  var advice = buildExpedienteAdvice();
  var b = document.createElement("div");
  b.className = "lab-conflict-backdrop";
  b.id = "exp-advice-backdrop";
  b.innerHTML = '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="exp-advice-title"><h3 id="exp-advice-title">' + escTxtSafe(advice.title) + "</h3><p>" + escTxtSafe(advice.body) + '</p><div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;"><button type="button" class="btn-cancel" id="exp-advice-cancel">' + escTxtSafe(advice.cancelLabel) + '</button><button type="button" class="btn-conflict-primary" id="exp-advice-confirm">' + escTxtSafe(advice.confirmLabel) + "</button></div></div>";
  document.body.appendChild(b);
  var close = function() {
    var x = document.getElementById("exp-advice-backdrop");
    if (x) x.remove();
  };
  document.getElementById("exp-advice-cancel").onclick = function() {
    close();
    focusRegistroModalAny();
  };
  document.getElementById("exp-advice-confirm").onclick = function() {
    close();
    onConfirm();
  };
}

// public/js/features/patients-modal-fields.mjs
function readPatientModalFields(isFromLab) {
  if (isFromLab) {
    return {
      nombre: (document.getElementById("m-nombre").value || "").trim().toUpperCase(),
      registro: (document.getElementById("m-registro").value || "").trim(),
      edadNum: (document.getElementById("m-edad-num").value || "").trim(),
      edadUnit: document.getElementById("m-edad-unit").value || "a\xF1os",
      sexo: document.getElementById("m-sexo-ro").value || "F"
    };
  }
  return {
    nombre: (document.getElementById("m-nombre-manual").value || "").trim().toUpperCase(),
    registro: readRegistroModalPrimary(),
    edadNum: (document.getElementById("m-edad-num-manual").value || "").trim(),
    edadUnit: document.getElementById("m-edad-unit-manual").value || "a\xF1os",
    sexo: document.getElementById("m-sexo").value
  };
}
function validatePatientAge(edadNum, isFromLab) {
  if (!edadNum) {
    rt2.showToast("Ingresa la edad", "error");
    shakePatientFieldsForError("Ingresa la edad", isFromLab);
    return null;
  }
  var ageInt = parseInt(edadNum, 10);
  if (isNaN(ageInt) || ageInt < 0 || ageInt > 120) {
    rt2.showToast("Edad inv\xE1lida", "error");
    shakePatientFieldsForError("Edad inv\xE1lida", isFromLab);
    return null;
  }
  return String(ageInt);
}
function readPatientLocationFields(settings) {
  var salaMode = isModeSala(settings);
  var servicio = (document.getElementById("m-servicio").value || "").trim().toUpperCase();
  var area = salaMode ? servicio : (document.getElementById("m-area").value || "").trim().toUpperCase();
  var cuarto = (document.getElementById("m-cuarto").value || "").trim();
  var cama = (document.getElementById("m-cama").value || "").trim();
  return { salaMode, servicio, area, cuarto, cama };
}
function validatePatientLocationFields(loc, isFromLab) {
  if (!loc.servicio) {
    var servicioMsg = loc.salaMode ? "Ingresa \xC1rea / Servicio" : "Ingresa servicio";
    rt2.showToast(servicioMsg, "error");
    shakePatientFieldsForError(servicioMsg, isFromLab);
    return false;
  }
  if (!loc.salaMode && !loc.area) {
    rt2.showToast("Ingresa \xE1rea / departamento", "error");
    shakePatientFieldsForError("Ingresa \xE1rea / departamento", isFromLab);
    return false;
  }
  if (!loc.cuarto || !loc.cama) {
    rt2.showToast("Ingresa cuarto y cama", "error");
    shakePatientFieldsForError("Ingresa cuarto y cama", isFromLab);
    return false;
  }
  return true;
}

// public/js/patient-registro-tunnel.mjs
function defaultFetchRange() {
  var range = labRepoDefaultDateRange();
  return labRepoFetchRangeFromDateInputs(
    labRepoToDateInputValue(range.desde),
    labRepoToDateInputValue(range.hasta)
  );
}
function parseLabPatientFromStudies(studies, registro) {
  var text = buildLabRepoBulkText(studies);
  if (!text) return { expediente: registro, name: "" };
  try {
    var result = procesarLabs(text);
    var p = result && result.patient ? result.patient : {};
    return {
      expediente: String(p.expediente || registro || "").trim(),
      name: String(p.name || "").trim(),
      edad: p.edad,
      sexo: p.sexo
    };
  } catch (_e) {
    return { expediente: registro, name: "" };
  }
}
function removeConfirmBackdrop() {
  var el = document.getElementById("patient-registro-tunnel-backdrop");
  if (el) el.remove();
}
function showRegistroTunnelConfirm(labPatient, studyCount, onConfirm, batch, onOmit, onStopBatch) {
  removeConfirmBackdrop();
  var nombre = String(labPatient.name || "").trim() || "Sin nombre en repositorio";
  var reg = String(labPatient.expediente || "").trim();
  var batchTotal = batch && batch.total > 1 ? batch.total : 0;
  var batchIndex = batch && batch.index ? batch.index : 0;
  var title = batchTotal > 1 ? "\xBFEs este paciente? (" + batchIndex + " de " + batchTotal + ")" : "\xBFEs este paciente?";
  var omitLabel = batchTotal > 1 ? "Omitir" : "Cancelar";
  var stopBtn = batchTotal > 1 ? '<button type="button" class="btn-cancel" id="patient-registro-tunnel-stop">Detener cola</button>' : "";
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "patient-registro-tunnel-backdrop";
  backdrop.innerHTML = '<div class="lab-conflict-modal" role="dialog" aria-modal="true"><h3>' + escHtml(title) + "</h3><p><strong>" + escHtml(nombre) + "</strong><br>Registro: " + escHtml(reg) + (studyCount ? "<br>" + studyCount + " estudio" + (studyCount === 1 ? "" : "s") + " en el rango" : "") + '</p><div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">' + stopBtn + '<button type="button" class="btn-cancel" id="patient-registro-tunnel-cancel">' + escHtml(omitLabel) + '</button><button type="button" class="btn-conflict-primary" id="patient-registro-tunnel-confirm">Agregar al censo</button></div></div>';
  document.body.appendChild(backdrop);
  document.getElementById("patient-registro-tunnel-cancel").onclick = function() {
    removeConfirmBackdrop();
    onOmit();
  };
  var stopEl = document.getElementById("patient-registro-tunnel-stop");
  if (stopEl && onStopBatch) {
    stopEl.onclick = function() {
      removeConfirmBackdrop();
      onStopBatch();
    };
  }
  document.getElementById("patient-registro-tunnel-confirm").onclick = function() {
    removeConfirmBackdrop();
    onConfirm(labPatient);
  };
}
function toastPatientAdmitted(silent) {
  if (silent) return;
  rt2.showToast("Paciente agregado al censo \u2014 completa ubicaci\xF3n", "success");
}
async function admitPatientViaRegistroTunnel(registro, opts) {
  opts = opts || {};
  var reg = String(registro || "").trim();
  if (!reg) {
    rt2.showToast("Indica el registro", "error");
    return null;
  }
  var existing = findPatientByRegistro(reg);
  if (existing) {
    rt2.showToast("Reg. " + reg + " ya est\xE1 en el censo", "info");
    if (typeof opts.onAdmitted === "function") opts.onAdmitted(existing);
    return existing;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    rt2.showToast("Consulta por registro solo en la app de escritorio", "warn");
    return null;
  }
  var range = defaultFetchRange();
  if (!range) {
    rt2.showToast("No se pudo calcular el rango de fechas", "error");
    return null;
  }
  rt2.showToast("Consultando repositorio\u2026", "info");
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro: reg,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString()
    });
    var studies = res && res.studies || [];
    var labPatient = parseLabPatientFromStudies(studies, reg);
    if (!labPatient.expediente) labPatient.expediente = reg;
    return new Promise(function(resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }
      showRegistroTunnelConfirm(
        labPatient,
        studies.length,
        function(confirmedPatient) {
          var patient = commitStubPatientFromLab(confirmedPatient, { teamId: opts.teamId });
          if (patient) {
            toastPatientAdmitted(opts.silentToast);
            if (typeof opts.onAdmitted === "function") opts.onAdmitted(patient);
          }
          finish(patient);
        },
        opts.batch,
        function() {
          if (typeof opts.onCancel === "function") opts.onCancel();
          finish(null);
        },
        function() {
          if (typeof opts.onStopBatch === "function") opts.onStopBatch();
          if (typeof opts.onCancel === "function") opts.onCancel();
          finish(null);
        }
      );
    });
  } catch (e) {
    console.error(e);
    rt2.showToast("Error al consultar el repositorio", "error");
    return null;
  }
}
async function admitPatientsViaRegistroTunnel(rawOrList, opts) {
  opts = opts || {};
  var list = Array.isArray(rawOrList) ? parseRegistrosFromBulkInput(
    rawOrList.map(function(r) {
      return String(r || "").trim();
    }).filter(Boolean).join("\n")
  ) : parseRegistrosFromBulkInput(rawOrList);
  if (!list.length) {
    rt2.showToast("Indica al menos un registro", "error");
    return { admitted: [], omitted: [] };
  }
  if (list.length === 1) {
    var one = await admitPatientViaRegistroTunnel(list[0], opts);
    return {
      admitted: one ? [one] : [],
      omitted: one ? [] : [list[0]]
    };
  }
  var admitted = [];
  var omitted = [];
  var stopped = false;
  for (var i = 0; i < list.length && !stopped; i++) {
    var reg = list[i];
    var patient = await admitPatientViaRegistroTunnel(reg, {
      teamId: opts.teamId,
      batch: { index: i + 1, total: list.length },
      silentToast: true,
      onAdmitted: opts.onAdmitted,
      onStopBatch: function() {
        stopped = true;
      }
    });
    if (patient) admitted.push(patient);
    else omitted.push(reg);
  }
  if (admitted.length) {
    rt2.showToast(
      admitted.length + " paciente" + (admitted.length === 1 ? "" : "s") + " agregado" + (admitted.length === 1 ? "" : "s") + " \u2014 completa ubicaci\xF3n",
      "success"
    );
  } else if (omitted.length) {
    rt2.showToast("No se agregaron pacientes", "info");
  }
  return { admitted, omitted };
}

// public/js/features/patients-modal.mjs
function _prefillServicioForSala() {
  var srv = document.getElementById("m-servicio");
  if (srv && isModeSala(rt2.getSettings()) && !srv.value) srv.value = getDefaultServicio(rt2.getSettings());
}
function _lastAdmissionLocationFromPatients() {
  for (var i = getPatients().length - 1; i >= 0; i--) {
    var p = getPatients()[i];
    if (!p || p.isDemo) continue;
    var cuarto = String(p.cuarto || "").trim();
    var cama = String(p.cama || "").trim();
    if (cuarto && cama) return { cuarto, cama };
  }
  return { cuarto: "", cama: "" };
}
function _resolveAdmissionLocationDefaults(registro) {
  var tour = getTourDemoAdmitDefaults(registro);
  if (tour && tour.cuarto && tour.cama) return tour;
  var st = rt2.getSettings();
  var cuarto = getDefaultCuarto(st);
  var cama = getDefaultCama(st);
  if (cuarto && cama) return { cuarto, cama };
  return _lastAdmissionLocationFromPatients();
}
function _prefillCuartoCamaForSala(registro) {
  if (!isModeSala(rt2.getSettings())) return;
  var loc = _resolveAdmissionLocationDefaults(registro);
  var cuartoEl = document.getElementById("m-cuarto");
  var camaEl = document.getElementById("m-cama");
  if (cuartoEl && !String(cuartoEl.value || "").trim() && loc.cuarto) cuartoEl.value = loc.cuarto;
  if (camaEl && !String(camaEl.value || "").trim() && loc.cama) camaEl.value = loc.cama;
}
function _rememberAdmissionLocation(cuarto, cama) {
  if (!isModeSala(rt2.getSettings())) return;
  var st = rt2.getSettings();
  if (!st) return;
  st.defaultCuarto = cuarto;
  st.defaultCama = cama;
  try {
    storage.saveSettings(st);
  } catch (e) {
    console.error("_rememberAdmissionLocation:", e && e.message);
  }
}
function _focusPatientAdmissionField(isFromLab) {
  if (!isFromLab && modalRegistroTunnelMode) {
    focusRegistroModalFirst();
    return;
  }
  var fieldIds = isFromLab ? ["m-servicio", "m-cuarto", "m-cama"] : ["m-nombre-manual", "m-servicio", "m-cuarto", "m-cama"];
  for (var i = 0; i < fieldIds.length; i++) {
    var el = document.getElementById(fieldIds[i]);
    if (!el) continue;
    if (el.closest && el.closest('[style*="display: none"]')) continue;
    if (!String(el.value || "").trim()) {
      try {
        el.focus();
      } catch (_e) {
        void _e;
      }
      return;
    }
  }
  var cama = document.getElementById("m-cama");
  if (cama) {
    try {
      cama.focus();
    } catch (_e) {
      void _e;
    }
  }
}
function _syncPatientModalModeFields() {
  var sala = isModeSala(rt2.getSettings());
  var areaGroup = document.getElementById("m-area-group");
  var servicioLabel = document.getElementById("m-servicio-label");
  var servicioInput = document.getElementById("m-servicio");
  if (areaGroup) areaGroup.style.display = sala ? "none" : "";
  if (servicioLabel) servicioLabel.textContent = sala ? "\xC1rea / Servicio *" : "Servicio *";
  if (servicioInput) servicioInput.placeholder = "ej. CIRUG\xCDA GENERAL";
}
function setElementDisplay2(el, visible) {
  if (!el) return;
  el.style.display = visible ? "" : "none";
}
function bedLocationGridEl() {
  var cuarto = document.getElementById("m-cuarto");
  if (!cuarto || !cuarto.parentElement) return null;
  return cuarto.parentElement.parentElement || null;
}
function applyRegistroTunnelFieldVisibility(on) {
  var prefilled = document.getElementById("modal-prefilled");
  var manualFull = document.getElementById("modal-manual-full");
  var nombreGroup = document.getElementById("m-nombre-manual");
  if (nombreGroup && nombreGroup.parentElement) {
    setElementDisplay2(nombreGroup.parentElement, !on);
  }
  var edadGrid = document.getElementById("m-edad-num-manual");
  if (edadGrid && edadGrid.parentElement && edadGrid.parentElement.parentElement) {
    setElementDisplay2(edadGrid.parentElement.parentElement, !on);
  }
  var registroWrap = document.getElementById("m-registro-manual-wrap");
  setElementDisplay2(registroWrap, on || !modalCompleteAdmissionPatientId);
  if (prefilled) prefilled.style.display = "none";
  if (manualFull) manualFull.style.display = on || modalCompleteAdmissionPatientId ? "block" : "none";
  ["m-area-group", "m-servicio-group", "m-sala-group"].forEach(function(id) {
    setElementDisplay2(document.getElementById(id), !on && !modalCompleteAdmissionPatientId);
  });
  setElementDisplay2(bedLocationGridEl(), !on && modalCompleteAdmissionPatientId);
}
function applyRegistroTunnelSaveButtonText(on) {
  var saveBtn = document.querySelector("#modal .btn-save");
  if (!saveBtn) return;
  saveBtn.textContent = on ? "Buscar registros" : modalCompleteAdmissionPatientId ? "Guardar" : "Agregar Paciente";
}
function applyRegistroTunnelLabels(on) {
  var regLabel = document.getElementById("m-registro-manual-label");
  var regHint = document.getElementById("m-registro-manual-hint");
  setRegistroModalMultiMode(on);
  if (regLabel) regLabel.textContent = on ? "Registro(s)" : "Registro";
  setElementDisplay2(regHint, on);
}
function setModalRegistroTunnelMode(on) {
  modalRegistroTunnelMode = !!on;
  if (on) modalCompleteAdmissionPatientId = null;
  applyRegistroTunnelFieldVisibility(on);
  applyRegistroTunnelSaveButtonText(on);
  applyRegistroTunnelLabels(on);
  if (!on && !modalCompleteAdmissionPatientId) _syncPatientModalModeFields();
}
var modalCompleteAdmissionPatientId = null;
function hideCompleteAdmissionManualFields() {
  var prefilled = document.getElementById("modal-prefilled");
  var manualFull = document.getElementById("modal-manual-full");
  if (prefilled) prefilled.style.display = "none";
  if (manualFull) manualFull.style.display = "none";
  var nombreGroup = document.getElementById("m-nombre-manual");
  if (nombreGroup && nombreGroup.parentElement) setElementDisplay2(nombreGroup.parentElement, false);
  var edadGrid = document.getElementById("m-edad-num-manual");
  if (edadGrid && edadGrid.parentElement && edadGrid.parentElement.parentElement) {
    setElementDisplay2(edadGrid.parentElement.parentElement, false);
  }
  var registroWrap = document.getElementById("m-registro-manual-wrap");
  setElementDisplay2(registroWrap, false);
}
function applyCompleteAdmissionFieldVisibility(on) {
  ["m-area-group", "m-servicio-group", "m-sala-group"].forEach(function(id) {
    setElementDisplay2(document.getElementById(id), on);
  });
  setElementDisplay2(bedLocationGridEl(), on);
  var saveBtn = document.querySelector("#modal .btn-save");
  if (saveBtn) saveBtn.textContent = on ? "Guardar ubicaci\xF3n" : "Agregar Paciente";
}
function fillCompleteAdmissionLocationInputs(patient) {
  var areaEl = document.getElementById("m-area");
  var servicioEl = document.getElementById("m-servicio");
  var cuartoEl = document.getElementById("m-cuarto");
  var camaEl = document.getElementById("m-cama");
  if (areaEl) areaEl.value = String(patient.area || "");
  if (servicioEl) servicioEl.value = String(patient.servicio || "");
  if (cuartoEl) cuartoEl.value = String(patient.cuarto || "");
  if (camaEl) camaEl.value = String(patient.cama || "");
}
function prefillCompleteAdmissionPatientFields(patient) {
  fillCompleteAdmissionLocationInputs(patient);
  if (!String(patient.servicio || "").trim()) _prefillServicioForSala();
  if (!String(patient.cuarto || "").trim() || !String(patient.cama || "").trim()) {
    _prefillCuartoCamaForSala(patient.registro || "");
  }
}
function setModalCompleteAdmissionMode(on, patient) {
  if (!on) {
    modalCompleteAdmissionPatientId = null;
    return;
  }
  modalCompleteAdmissionPatientId = patient && patient.id ? String(patient.id) : null;
  modalRegistroTunnelMode = false;
  hideCompleteAdmissionManualFields();
  applyCompleteAdmissionFieldVisibility(on);
  if (on) _syncPatientModalModeFields();
  if (on && patient) prefillCompleteAdmissionPatientFields(patient);
}
function openCompleteAdmissionModal(patientId) {
  var patient = getPatients().find(function(p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return;
  document.getElementById("modal-title").textContent = "Completar ingreso";
  setModalCompleteAdmissionMode(true, patient);
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  setElementDisplay2(document.getElementById("m-sala-group"), false);
  prepareModalBackdropOpen(document.getElementById("modal"));
  setTimeout(function() {
    _focusPatientAdmissionField(true);
  }, 120);
}
function openAddModal() {
  document.getElementById("modal-title").textContent = "Agregar por registro";
  ["nombre-manual", "area", "servicio", "cuarto", "cama"].forEach(function(f) {
    var el = document.getElementById("m-" + f);
    if (el) el.value = "";
  });
  initRegistroModalRows([""]);
  var edadNumManual = document.getElementById("m-edad-num-manual");
  var edadUnitManual = document.getElementById("m-edad-unit-manual");
  if (edadNumManual) edadNumManual.value = "";
  if (edadUnitManual) edadUnitManual.value = "a\xF1os";
  document.getElementById("m-sexo").value = "F";
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  setModalRegistroTunnelMode(true);
  prepareModalBackdropOpen(document.getElementById("modal"));
  setTimeout(function() {
    focusRegistroModalFirst();
  }, 120);
}
function openAddModalFullManual() {
  document.getElementById("modal-title").textContent = "Nuevo Paciente";
  modalCompleteAdmissionPatientId = null;
  setModalRegistroTunnelMode(false);
  setModalCompleteAdmissionMode(false, null);
  document.getElementById("modal-prefilled").style.display = "none";
  document.getElementById("modal-manual-full").style.display = "block";
  ["nombre-manual", "area", "servicio", "cuarto", "cama"].forEach(function(f) {
    var el = document.getElementById("m-" + f);
    if (el) el.value = "";
  });
  initRegistroModalRows([""]);
  var edadNumManual = document.getElementById("m-edad-num-manual");
  var edadUnitManual = document.getElementById("m-edad-unit-manual");
  if (edadNumManual) edadNumManual.value = "";
  if (edadUnitManual) edadUnitManual.value = "a\xF1os";
  document.getElementById("m-sexo").value = "F";
  _syncPatientModalModeFields();
  _prefillServicioForSala();
  _prefillCuartoCamaForSala();
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  prepareModalBackdropOpen(document.getElementById("modal"));
  setTimeout(function() {
    _focusPatientAdmissionField(false);
  }, 120);
}
var pendingAddPatientSavedCallback = null;
var pendingAddPatientFromBulkPreview = false;
var modalRegistroTunnelMode = false;
function syncPendingToCommit() {
  setPendingAddPatientSavedCallback(pendingAddPatientSavedCallback);
  setPendingAddPatientFromBulkPreview(pendingAddPatientFromBulkPreview);
}
function syncPendingCallbacksFromModal(opts) {
  pendingAddPatientSavedCallback = opts && typeof opts.onSaved === "function" ? opts.onSaved : null;
  pendingAddPatientFromBulkPreview = !!(opts && opts.fromBulkPreview);
  syncPendingToCommit();
}
function openAddModalFromLabPatientData(p, opts) {
  if (!p) {
    openAddModal();
    return;
  }
  var registro = String(p.expediente || p.registro || "").trim();
  syncPendingCallbacksFromModal(opts);
  suspendLabBulkPreviewModalIfNeeded(opts);
  void admitPatientViaRegistroTunnel(registro, {
    onAdmitted: function(patient) {
      var onSaved = pendingAddPatientSavedCallback;
      pendingAddPatientSavedCallback = null;
      pendingAddPatientFromBulkPreview = false;
      clearPendingAddPatientCallbacks();
      if (onSaved) {
        try {
          onSaved(patient);
        } catch (e) {
          console.error(e);
        }
      }
    },
    onCancel: function() {
      if (getPendingAddPatientFromBulkPreview()) resumeLabBulkPreviewModalIfSuspended();
    }
  });
}
function suspendLabBulkPreviewModalIfNeeded(opts) {
  if (opts && opts.fromBulkPreview) suspendLabBulkPreviewModal();
}
function openAddModalFromLab() {
  var lab = rt2.getActiveLab && rt2.getActiveLab();
  if (!lab) {
    openAddModal();
    return;
  }
  openAddModalFromLabPatientData(lab.patient);
}
function openAddModalFromLabPatient(patient, opts) {
  openAddModalFromLabPatientData(patient, opts);
}
function closeModal() {
  var wasBulkPreview = getPendingAddPatientFromBulkPreview();
  pendingAddPatientSavedCallback = null;
  pendingAddPatientFromBulkPreview = false;
  modalRegistroTunnelMode = false;
  modalCompleteAdmissionPatientId = null;
  clearPendingAddPatientCallbacks();
  closeModalAnimated(document.getElementById("modal"), function() {
    if (wasBulkPreview) resumeLabBulkPreviewModalIfSuspended();
  });
}
function confirmCloseAddPatientModal() {
  var hasData = ["m-area", "m-servicio", "m-cuarto", "m-cama"].some(function(id) {
    var el = document.getElementById(id);
    return el && el.value.trim();
  });
  if (hasData && !confirm("\xBFCerrar sin guardar?")) return false;
  return true;
}
function saveCompleteAdmissionModal() {
  var patientId = modalCompleteAdmissionPatientId;
  if (!patientId) return false;
  var patient = getPatients().find(function(p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return false;
  var loc = readPatientLocationFields(rt2.getSettings());
  if (!validatePatientLocationFields(loc, true)) return false;
  _rememberAdmissionLocation(loc.cuarto, loc.cama);
  patient.area = loc.area;
  patient.servicio = loc.servicio;
  patient.cuarto = loc.cuarto;
  patient.cama = loc.cama;
  patient.lanUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
  persistClinicalState();
  void assignPatientToTeamClinical(patient.id, readPatientRegistrationTeamId()).then(function() {
    patientsBridge.renderPatientList();
    rt2.showToast("Ubicaci\xF3n guardada", "success");
  });
  modalCompleteAdmissionPatientId = null;
  closeModalAnimated(document.getElementById("modal"));
  return true;
}
function savePatient() {
  if (modalCompleteAdmissionPatientId) {
    saveCompleteAdmissionModal();
    return;
  }
  if (modalRegistroTunnelMode) {
    var registros = collectRegistroModalRegistros();
    if (!registros.length) {
      rt2.showToast("Indica el registro", "error");
      return;
    }
    var registrationTeamId = readPatientRegistrationTeamId();
    closeModalAnimated(document.getElementById("modal"));
    modalRegistroTunnelMode = false;
    void admitPatientsViaRegistroTunnel(registros, { teamId: registrationTeamId });
    return;
  }
  var isFromLab = document.getElementById("modal-prefilled").style.display !== "none";
  var fields = readPatientModalFields(isFromLab);
  var v = validatePatientForSave(fields);
  if (!v.ok) {
    rt2.showToast(v.error, "error");
    shakePatientFieldsForError(v.error, isFromLab);
    return;
  }
  var ageStr = validatePatientAge(fields.edadNum, isFromLab);
  if (!ageStr) return;
  var edad = ageStr + (fields.edadUnit && fields.edadUnit !== "a\xF1os" ? " " + fields.edadUnit : "");
  var loc = readPatientLocationFields(rt2.getSettings());
  if (!validatePatientLocationFields(loc, isFromLab)) return;
  _rememberAdmissionLocation(loc.cuarto, loc.cama);
  var commit = function() {
    var dup = findDuplicatePatient(fields.nombre, fields.registro);
    if (dup) {
      showDuplicateWarning(dup, function() {
        commitPatientFromModal(
          fields.nombre,
          fields.registro,
          edad,
          fields.sexo,
          loc.area,
          loc.servicio,
          loc.cuarto,
          loc.cama,
          isFromLab
        );
      });
      return;
    }
    commitPatientFromModal(
      fields.nombre,
      fields.registro,
      edad,
      fields.sexo,
      loc.area,
      loc.servicio,
      loc.cuarto,
      loc.cama,
      isFromLab
    );
  };
  if (v.warning === "missing_expediente" && !isFromLab) {
    showExpedienteAdvice(commit);
    return;
  }
  commit();
}
function initPatientModalEnterSave() {
  var modal = document.getElementById("modal");
  if (!modal) return;
  modal.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "SELECT") savePatient();
  });
}
function focusPatientSearchInput() {
  var el = document.getElementById("patient-search");
  if (!el) return;
  try {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch {
    try {
      el.focus();
    } catch (_e) {
      void _e;
    }
  }
}

// public/js/patient-sidebar-card.mjs
function escSidebarHtml(s) {
  return escHtml(s);
}
function shortenPatientDisplayName(fullName) {
  const name = String(fullName || "").trim();
  if (!name || name.includes(",")) return name;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
function formatPatientBedParts(p) {
  const cuarto = String(p?.cuarto || "").trim();
  const cama = String(p?.cama || "").trim();
  return { cuarto, cama };
}
function formatPatientBedMetaHtml(p) {
  const { cuarto, cama } = formatPatientBedParts(p);
  const parts = [];
  if (cuarto) parts.push(`<span>Cto. ${escSidebarHtml(cuarto)}</span>`);
  if (cama) parts.push(`<span>Cama ${escSidebarHtml(cama)}</span>`);
  return parts;
}
function renderPatientSidebarBodyHtml(p, opts) {
  opts = opts || {};
  const showServicio = opts.showServicio !== false;
  const nombreRaw = String(p?.nombre || "").trim();
  const nombreDisplay = shortenPatientDisplayName(nombreRaw) || "Sin nombre";
  const registro = String(p?.registro || "").trim();
  const servicio = showServicio ? String(p?.servicio || "").trim() : "";
  const nameTitleParts = [nombreRaw !== nombreDisplay ? nombreRaw : "", registro, servicio].filter(Boolean);
  const nameTitleAttr = nameTitleParts.length ? ` title="${escSidebarHtml(nameTitleParts.join(" \xB7 "))}"` : "";
  const metaParts = formatPatientBedMetaHtml(p);
  if (servicio) {
    metaParts.push(`<span class="patient-card-svc">${escSidebarHtml(servicio)}</span>`);
  }
  const metaHtml = metaParts.length ? `<div class="p-meta">${metaParts.join("")}</div>` : "";
  const bodyClass = opts.roundRow ? "patient-card-body patient-card-body--round" : "patient-card-body";
  return `<div class="${bodyClass}"><div class="p-name"${nameTitleAttr}>${escSidebarHtml(nombreDisplay)}</div>` + metaHtml + `</div>`;
}

// public/js/patient-delete-auth.mjs
function canDeletePatientChart(user, patientId, scopeContext) {
  if (!user?.user_id) return false;
  const pid = String(patientId || "").trim();
  if (!pid) return false;
  if (hasElevatedTeamPrivileges(user)) return true;
  return isPatientAssignedToJoinedTeam(pid, scopeContext, user);
}

// public/js/features/patients-card-html.mjs
function renderPatientBulkCheckHtml(p) {
  if (!isPatientBulkSelectMode()) return "";
  var on = isPatientBulkSelected(p.id);
  return '<span class="patient-bulk-check' + (on ? " patient-bulk-check--on" : "") + '" aria-hidden="true">' + (on ? "\u2713" : "") + "</span>";
}
function renderPatientCardToolbarHtml(p, pinOn, archOn) {
  if (isPatientBulkSelectMode()) {
    return '<div class="patient-card-toolbar patient-card-toolbar--bulk">' + renderPatientBulkCheckHtml(p) + "</div>";
  }
  var pinTitle = pinOn ? "Quitar de fijados" : "Fijar paciente";
  var archTitle = archOn ? "Restaurar del archivo" : "Archivar paciente";
  var archiveIcon = archOn ? "\u21A9" : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"></rect><path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"></path><path d="M10 12h4"></path></svg>';
  var canDelete = canDeletePatientChart(
    clinicalSessionContext.user,
    p.id,
    getClinicalScopeContextForEvaluate()
  );
  var deleteBtn = canDelete ? `<button type="button" class="btn-delete-card" onclick="deletePatient(event,'` + p.id + `')" aria-label="Eliminar">\xD7</button>` : "";
  return '<div class="patient-card-toolbar"><div class="patient-card-toolbar-left"><button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon btn-archive-clean" title="' + archTitle + '" aria-label="' + archTitle + `" onclick="togglePatientArchived(event,'` + p.id + `')">` + archiveIcon + '</button><button type="button" class="patient-toolbar-chip btn-pinned-text' + (pinOn ? " patient-toolbar-chip--on" : "") + '" title="' + pinTitle + '" aria-label="' + pinTitle + `" onclick="togglePatientPinned(event,'` + p.id + `')">` + (pinOn ? "Fijado" : "Fijar") + "</button></div>" + deleteBtn + "</div>";
}
function patientSidebarCardOpts(extra) {
  var opts = { showServicio: !isModeSala(rt2.getSettings()) };
  if (extra) {
    for (var k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) opts[k] = extra[k];
    }
  }
  return opts;
}
function renderPatientCardHtml(p) {
  var pinOn = !!p.pinned;
  var archOn = !!p.archived;
  var aid4 = rt2.getActiveId();
  var bulkOn = isPatientBulkSelectMode() && isPatientBulkSelected(p.id);
  var incomplete = isPatientAdmissionIncomplete(p, rt2.getSettings());
  return '<div class="patient-card ' + (p.id === aid4 ? "active" : "") + (pinOn ? " patient-card--pinned" : "") + (archOn ? " patient-card--archived" : "") + (bulkOn ? " patient-card--bulk-selected" : "") + (incomplete ? " patient-card--incomplete" : "") + '" data-patient-id="' + p.id + '" role="button" tabindex="0">' + renderPatientCardToolbarHtml(p, pinOn, archOn) + renderPatientSidebarBodyHtml(p, patientSidebarCardOpts()) + "</div>";
}
function renderPinnedSectionLabelHtml(count) {
  return '<div class="patient-list-section-label patient-list-section-label--pinned" role="group" aria-label="Pacientes fijados"><span class="patient-list-section-label__lead"><svg class="patient-list-pin-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 1 0-6 0v3.76z"/></svg>Fijados</span><span class="patient-list-section-count">' + count + "</span></div>";
}
function renderActiveSectionLabelHtml(count) {
  return '<div class="patient-list-section-label" role="group" aria-label="Lista de pacientes">Pacientes <span class="patient-list-section-count">' + count + "</span></div>";
}
function renderArchivedToggleHtml(collapsed, count) {
  return '<button type="button" class="patient-list-section-toggle" onclick="toggleArchivedSection(event)" aria-expanded="' + (!collapsed ? "true" : "false") + '">Archivados <span>(' + count + ")</span> <span>" + (collapsed ? "\u25B6" : "\u25BC") + "</span></button>";
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
var _roundOverviewMode = true;
var ROUND_SEEN_LS = "rpc-round-seen";
function getRoundOverviewMode() {
  return _roundOverviewMode;
}
function setRoundOverviewMode(v) {
  _roundOverviewMode = !!v;
}
function isRoundOverviewInner(inner) {
  return inner === "resumen" || inner === "todo" || !inner;
}
function setLastRondaNavIds(ids) {
  _lastRondaNavIds = ids;
}
function onPatientSearchInput(val) {
  setPatientSearchFilter(val);
  patientsBridge.renderPatientList();
}
function todayLocalYMD() {
  var d = /* @__PURE__ */ new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function getRoundSeenSet() {
  try {
    var raw = localStorage.getItem(ROUND_SEEN_LS);
    var o = raw ? JSON.parse(raw) : {};
    var today = todayLocalYMD();
    if (o.day !== today) return { day: today, ids: [] };
    return { day: today, ids: Array.isArray(o.ids) ? o.ids.map(String) : [] };
  } catch {
    return { day: todayLocalYMD(), ids: [] };
  }
}
function persistRoundSeenSet(s) {
  try {
    localStorage.setItem(ROUND_SEEN_LS, JSON.stringify(s));
  } catch (_e) {
    void _e;
  }
}
function isPatientRoundSeen(patientId) {
  var s = getRoundSeenSet();
  return s.ids.indexOf(String(patientId)) >= 0;
}
function togglePatientRoundSeen(ev, patientId) {
  if (ev) {
    ev.stopPropagation();
    ev.preventDefault();
  }
  var s = getRoundSeenSet();
  var id = String(patientId);
  var idx = s.ids.indexOf(id);
  if (idx >= 0) s.ids.splice(idx, 1);
  else s.ids.push(id);
  persistRoundSeenSet(s);
  patientsBridge.renderPatientList();
}
function hideRoundOverviewLayout(overview, classic, fullbar) {
  var alreadyClassic = overview.style.display === "none" && classic.style.display === "flex";
  if (alreadyClassic && !(fullbar && fullbar.classList.contains("is-visible"))) {
    return;
  }
  overview.style.display = "none";
  classic.style.display = "flex";
  if (fullbar) {
    fullbar.classList.remove("is-visible");
    fullbar.setAttribute("aria-hidden", "true");
  }
  rt2.syncWorkContextChrome();
}
function showRoundOverviewLayout(overview, classic, fullbar) {
  var showOverview = !!rt2.getActiveId() && rt2.getActiveAppTab() === "nota" && _roundOverviewMode;
  overview.style.display = showOverview ? "flex" : "none";
  classic.style.display = showOverview ? "none" : "flex";
  if (fullbar) {
    var showBar = !!(rt2.getActiveId() && rt2.getActiveAppTab() === "nota" && !showOverview);
    fullbar.classList.toggle("is-visible", showBar);
    fullbar.setAttribute("aria-hidden", showBar ? "false" : "true");
  }
  if (showOverview) renderRoundOverviewPanels();
  rt2.syncWorkContextChrome();
}
function syncRoundExpedienteLayout() {
  var overview = document.getElementById("patient-ronda-overview");
  var classic = document.getElementById("patient-expediente-classic");
  var fullbar = document.getElementById("patient-ronda-fullbar");
  if (!overview || !classic) return;
  if (!isPaseMode()) {
    hideRoundOverviewLayout(overview, classic, fullbar);
    return;
  }
  showRoundOverviewLayout(overview, classic, fullbar);
}
function formatRoundPatientMeta(p) {
  if (!p) return "";
  return "Cto. " + (p.cuarto || "\u2014") + " \xB7 Cama " + (p.cama || "\u2014") + " \xB7 " + (p.servicio || "\u2014") + (p.registro ? " \xB7 Reg. " + String(p.registro) : "");
}
function renderRoundOverviewPanels() {
  if (!isPaseMode() || !_roundOverviewMode || rt2.getActiveAppTab() !== "nota" || !rt2.getActiveId()) return;
  var titleEl = document.getElementById("patient-ronda-patient-label");
  var metaEl = document.getElementById("patient-ronda-patient-meta");
  var aid4 = rt2.getActiveId();
  var p = getPatients().find(function(x) {
    return String(x.id) === String(aid4);
  });
  if (titleEl) titleEl.textContent = p ? p.nombre || "Paciente" : "Paciente";
  if (metaEl) metaEl.textContent = formatRoundPatientMeta(p);
  var host = document.getElementById("patient-ronda-dashboard-host");
  if (host) renderPatientDashboard(host);
}
function returnToRoundOverview() {
  if (!isPaseMode()) return;
  _roundOverviewMode = true;
  syncRoundExpedienteLayout();
}
function openFullExpedienteFromRound(tab) {
  if (!isPaseMode()) return;
  var tname = tab;
  var sala = isModeSala(rt2.getSettings());
  if (sala) {
    if (tname === "notas" || tname === "indica") tname = "tend";
    if (!tname) tname = "tend";
  } else {
    if (!tname) tname = "notas";
  }
  rt2.switchInnerTab(tname);
}
function advanceRondaPatient(delta) {
  if (isPatientBulkSelectMode()) return;
  var next = nextCensusPatientId(_lastRondaNavIds, rt2.getActiveId(), delta);
  if (next == null) return;
  patientsBridge.selectPatient(next);
}
function scrollActiveRondaCardIntoView() {
  if (!rt2.getActiveId()) return;
  var list = document.getElementById("patient-list");
  if (!list) return;
  var cards = list.querySelectorAll(".patient-card[data-patient-id]");
  var want = String(rt2.getActiveId());
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute("data-patient-id") === want) {
      try {
        cards[i].scrollIntoView({
          block: "nearest",
          behavior: rt2.rpcPrefersReducedMotion() ? "auto" : "smooth"
        });
      } catch {
        cards[i].scrollIntoView(true);
      }
      break;
    }
  }
}
function renderPatientRoundRowHtml(p) {
  var pinOn = !!p.pinned;
  var archOn = !!p.archived;
  var seen = isPatientRoundSeen(p.id);
  var seenTitle = typeof t === "function" ? t("roundMode.seenTitle") : "Visto en ronda";
  var aid4 = rt2.getActiveId();
  var bulkSelected = isPatientBulkSelectMode() && isPatientBulkSelected(p.id);
  var incomplete = isPatientAdmissionIncomplete(p, rt2.getSettings());
  return '<div class="patient-card patient-card--roundrow ' + (p.id === aid4 ? "active" : "") + (seen ? " patient-card--roundrow-seen" : "") + (bulkSelected ? " patient-card--bulk-selected" : "") + (incomplete ? " patient-card--incomplete" : "") + '" data-patient-id="' + p.id + '" role="button" tabindex="0">' + renderPatientCardToolbarHtml(p, pinOn, archOn) + '<div class="roundrow-main"><div class="roundrow-text">' + renderPatientSidebarBodyHtml(p, patientSidebarCardOpts({ roundRow: true })) + '</div><button type="button" class="btn-round-seen" title="' + esc(seenTitle) + '" aria-label="' + esc(seenTitle) + '" aria-pressed="' + (seen ? "true" : "false") + `" onclick="togglePatientRoundSeen(event,'` + p.id + `')">` + (seen ? "\u2713" : "\u25CB") + "</button></div></div>";
}

// public/js/features/patients-list-click.mjs
var INTERACTIVE = "button, a[href], input, textarea, select";
function eventStartNode(ev) {
  if (ev && typeof ev.composedPath === "function") {
    var path = ev.composedPath();
    if (path && path[0]) return path[0];
  }
  return ev && ev.target;
}
function elementFromNode(node) {
  if (!node) return null;
  if (node.nodeType === 3) return node.parentElement;
  if (typeof node.closest === "function") return node;
  return node.parentElement || null;
}
function patientCardIdFromEvent(ev) {
  var el = elementFromNode(eventStartNode(ev));
  if (!el) return "";
  if (el.closest(INTERACTIVE)) return "";
  var card = el.closest(".patient-card[data-patient-id]");
  if (!card) return "";
  return card.getAttribute("data-patient-id") || "";
}
function shouldHandleTouchPointerUp(ev) {
  var type = ev && ev.pointerType;
  return type === "touch" || type === "pen";
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
  if (rt2.getActiveAppTab() === "agenda") rt2.renderProcedureAgendaPanel();
  if (!opts.silent) {
    syncGuardiaCensusPanelVisibility(rt2.getSettings());
    renderGuardiaCensusGrid(rt2.getSettings());
  }
}
function buildPatientListRenderBundle(filtered, isRonda) {
  var zones = buildPatientListZones(filtered, { sortByBed: isMobileWeb() });
  var cardHtml = isRonda ? renderPatientRoundRowHtml : renderPatientCardHtml;
  var archivedCollapsed = isArchivedSectionCollapsed();
  var listCtx = {
    activeId: rt2.getActiveId(),
    isRonda,
    isRoundSeen: isPatientRoundSeen,
    showServicioInCard: !isModeSala(rt2.getSettings())
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
function renderPatientListFullHtml(list, bundle, opts) {
  destroyPatientListSortables();
  list.classList.toggle("patient-list--ronda", bundle.listCtx.isRonda);
  var pinned = bundle.zones.pinned;
  var active = bundle.zones.active;
  var archived = bundle.zones.archived;
  var parts = [];
  var rondaNav = [];
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
  mountActiveZoneVirtualIfNeeded(list, active, bundle.cardHtml, bundle.listCtx);
  if (opts.silent && savedScrollTop > 0) list.scrollTop = savedScrollTop;
  if (!isPatientBulkSelectMode()) mountPatientListSortables();
  if (rt2.getActiveAppTab() === "agenda") rt2.renderProcedureAgendaPanel();
  if (!opts.silent) {
    syncGuardiaCensusPanelVisibility(rt2.getSettings());
    renderGuardiaCensusGrid(rt2.getSettings());
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
  var isRonda = isPaseMode();
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
  var bundle = buildPatientListRenderBundle(filtered, isRonda);
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
  if (patient && isPatientAdmissionIncomplete(patient, rt2.getSettings())) {
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
var rt17 = {
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
  if (ctx && typeof ctx === "object") Object.assign(rt17, ctx);
}
function aid3() {
  return rt17.getActiveId();
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
  var pid = aid3();
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
  return normalizeRecetaHuConsultServices(rt17.getSettings().recetaHuConsultServices);
}
function saveConsultServices(list) {
  var st = rt17.getSettings();
  st.recetaHuConsultServices = normalizeRecetaHuConsultServices(list);
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(st));
  } catch (_e) {
    void _e;
  }
}
function activePatient3() {
  var pid = aid3();
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
  if (typeof rt17.switchInnerTab === "function") {
    rt17.switchInnerTab("recetaHu");
    return;
  }
  if (typeof rt17.getActiveAppTab === "function" && rt17.getActiveAppTab() !== "nota" && typeof rt17.switchAppTab === "function") {
    rt17.switchAppTab("nota");
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
  if (!(rt17.isRpcOffline && rt17.isRpcOffline())) {
    btn.disabled = false;
    btn.removeAttribute("aria-disabled");
  }
}

// public/js/features/receta-hu-export.mjs
function validateRecetaHuExport() {
  if (rt17.guardMobileDocExport()) return null;
  if (!recetaHuPanelVisible()) ensureRecetaHuPanelVisible();
  if (guardDocExportBlocked({ isRpcOffline: rt17.isRpcOffline, showToast: rt17.showToast })) return null;
  var pid = aid3();
  if (!pid) {
    rt17.showToast("Selecciona un paciente", "error");
    return null;
  }
  var patient = activePatient3();
  if (!patient) {
    rt17.showToast("Paciente no encontrado", "error");
    return null;
  }
  var st = rt17.getSettings();
  if (!String(st.doctorName || "").trim()) {
    rt17.showToast("Configura el m\xE9dico tratante en Mi Perfil", "error");
    return null;
  }
  if (!String(st.cedulaProfesional || "").trim()) {
    rt17.showToast("Configura la c\xE9dula profesional en Mi Perfil", "error");
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
  rt17.incrementPendingJobs();
  exportWithOutputDirFallback({
    url: "/generate-receta-hu",
    buildPayload: function() {
      return buildRecetaHuExportPayload(body);
    },
    defaultFileName: "receta-hu.pdf",
    selectOutputDir: selectRecetaHuOutputDir,
    saveOutputDir: function(dir) {
      saveOutputDirSelection(dir, {
        getSettings: rt17.getSettings
      });
    },
    onSuccess: function(data) {
      var name = data && (data.fileName || data.path) ? data.fileName || String(data.path).split(/[/\\]/).pop() : "PDF";
      rt17.showToast("Receta HU guardada: " + name, "success");
    },
    onPrompt: function() {
      rt17.showToast("Selecciona una carpeta para guardar el PDF.", "error");
    },
    onCancel: function() {
      rt17.showToast("No se guard\xF3 el PDF: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(message) {
      rt17.showToast("Error: " + message, "error");
    }
  }).catch(function() {
    rt17.showToast("Error de conexi\xF3n al generar el PDF", "error");
  }).finally(function() {
    if (btn && !btn.dataset.uiMotionDefaultLabel) {
      btn.dataset.uiMotionDefaultLabel = "Exportar PDF";
    }
    setAsyncButtonLoading(btn, false);
    rt17.decrementPendingJobs();
    if (typeof rt17.syncOfflineButtonStates === "function") rt17.syncOfflineButtonStates();
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
    rt17.showToast("No se pudo exportar la receta HU", "error");
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
  var pid = aid3();
  if (!pid) return;
  var fields = readMedComposeFields();
  if (medComposeIsEmpty(fields)) {
    rt17.showToast("Escribe al menos un campo del medicamento", "error");
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
  var pid = aid3();
  if (!pid) return;
  var draft2 = readDraftFromDom();
  draft2.meds.splice(idx, 1);
  persistDraft(pid, draft2);
  renderMedList(recetaHuRoot(), draft2.meds);
}
function recetaHuCommitLabFromCompose() {
  var pid = aid3();
  if (!pid) return;
  var inp = document.getElementById("receta-hu-compose-lab");
  var name = inp ? String(inp.value || "").trim() : "";
  if (!name) {
    rt17.showToast("Escribe el nombre del estudio", "error");
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
  var pid = aid3();
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
    rt17.showToast("Elige servicio o escribe el texto de la consulta", "error");
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
  var pid = aid3();
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
  var pid = aid3();
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
  rt17.showToast("Servicio agregado al men\xFA", "success");
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
  var t2 = ev.target;
  if (!t2 || !t2.closest("#receta-hu-container")) return;
  if (isComposeField(t2.id)) return;
  var pid = aid3();
  if (pid) persistDraft(pid, readDraftFromDom());
}
function handleRecetaHuChange(ev) {
  var t2 = ev.target;
  if (t2 && t2.id === "receta-hu-consult-servicio") {
    recetaHuOnConsultServicePick();
    return;
  }
  if (t2 && t2.id === "receta-hu-compose-proxima-plazo") {
    recetaHuOnConsultServicePick();
    return;
  }
  var pid = aid3();
  if (pid) persistDraft(pid, readDraftFromDom());
}
function handleRecetaHuKeydown(ev) {
  if (ev.key !== "Enter") return;
  var t2 = ev.target;
  if (!t2) return;
  if (t2.id === "receta-hu-compose-lab") {
    ev.preventDefault();
    recetaHuCommitLabFromCompose();
    return;
  }
  if (t2.id === "receta-hu-compose-med-n" || t2.id === "receta-hu-compose-med-p" || t2.id === "receta-hu-compose-med-d") {
    ev.preventDefault();
    recetaHuCommitMedFromCompose();
    return;
  }
  if (t2.id === "receta-hu-compose-proxima-texto" || t2.id === "receta-hu-compose-proxima-fecha") {
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
  var pid = aid3();
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
  var pid = aid3();
  if (!pid) {
    root.innerHTML = '<p class="receta-hu-hint">Selecciona un paciente para llenar la receta HU.</p>';
    root.dataset.mounted = "";
    return;
  }
  if (root.dataset.patientId && root.dataset.patientId !== pid) {
    root.dataset.mounted = "";
    root.dataset.eventsBound = "0";
  }
  var patient = activePatient3();
  var draft2 = getDraft(pid);
  var st = rt17.getSettings();
  ensureRecetaHuShell(root);
  bindRecetaHuEvents(root);
  populateRecetaHuPatientMeta(root, patient);
  populateRecetaHuDraftFields(root, draft2);
  populateRecetaHuDoctorFoot(root, st);
  resetExportButtonState();
  if (typeof rt17.syncOfflineButtonStates === "function") rt17.syncOfflineButtonStates();
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
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
  var block = activeId ? getMedRecetaByPatient()[activeId] : null;
  var sel = activeId ? getMedNotaSelMap(activeId) : {};
  var soapItems = block && block.items ? block.items.filter(function(it) {
    return sel[it.id] && !it.suspendido;
  }) : [];
  var allItems = block && block.items ? block.items : [];
  var previewHtml = buildSoapPreviewHtml(soapItems, allItems);
  var soapBtnLabel = isModeSala(rt3.getSettings()) ? "Enviar a Estado Actual" : "Abrir plantilla SOAP";
  foot.innerHTML = '<div class="med-nota-toolbar"><p class="med-nota-hint">Los medicamentos con <strong>SOAP</strong> activo se clasifican por nombre; los marcados como <strong>Otros</strong> requieren elegir destino en la columna <strong>Destino</strong>.</p>' + previewHtml + '<div class="med-nota-actions"><button type="button" class="btn-generate" onclick="mediAnadirATratamiento()">A\xF1adir a Tratamiento</button><button type="button" class="btn-med-secondary" onclick="mediLlevarASOAP()">' + soapBtnLabel + '</button><button type="button" class="btn-med-secondary" onclick="limpiarManejoActual()">Limpiar</button></div></div>';
}
function hideMedNotaFooter() {
  var foot = document.getElementById("med-nota-footer");
  if (foot) {
    foot.hidden = true;
    foot.innerHTML = "";
  }
}

// public/js/features/medications-actions.mjs
function toggleMedRecetaSuspendido(itemId, suspended) {
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
  if (!activeId) return;
  toggleInsulinRescateGroupSelection(activeId, selected);
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(INSULIN_RESCATE_GROUP_ID)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}
function toggleMedRecetaInsulinRescateSuspendido(suspended) {
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
  if (!activeId) return;
  toggleInsulinPrandialGroupSelection(activeId, selected);
  bustMedPanelCache();
  if (!patchMedRecetaRowSoapUi(INSULIN_PRANDIAL_GROUP_ID)) renderMedRecetaPanel();
  else renderMedNotaFooter();
}
function toggleMedRecetaInsulinPrandialSuspendido(suspended) {
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
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
  if (typeof rt3.getActiveAppTab !== "function" || rt3.getActiveAppTab() !== "nota") return;
  var inner = typeof rt3.getActiveInner === "function" ? rt3.getActiveInner() : "";
  if (inner === "estadoActual") {
    renderEstadoActualPanel({ force: true, refreshClinico: true });
  }
}
function limpiarManejoActual() {
  var activeId = rt3.getActiveId();
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
  invalidatePaseBoardCache();
  renderMedRecetaPanel();
  refreshEaAfterMedClear();
  if (isPaseMode()) renderPaseBoard();
  medToast("Manejo actual limpiado", "success");
}
function mediAnadirATratamiento() {
  var activeId = rt3.getActiveId();
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
  openPaseSectionInNormal("expediente");
  renderNoteForm();
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
  if (typeof rt3.navigateToEstadoActualPanel === "function") {
    rt3.navigateToEstadoActualPanel();
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
    parts.forEach(function(t2) {
      mergeSoapMedField(fieldId, t2);
    });
  });
  openPaseSectionInNormal("expediente");
  renderNoteForm();
  openSOAPModalDirect();
  medToast("Campos SOAP actualizados \xB7 completa e Insertar en evoluci\xF3n", "success");
  renderMedRecetaPanel();
}
function mediLlevarASOAP() {
  var activeId = rt3.getActiveId();
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
  if (isModeSala(rt3.getSettings())) {
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
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
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
  var activeId = rt3.getActiveId();
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
function ensureScaleResults(state3) {
  if (!state3) return;
  var defaults = emptyVpoState().scaleResults;
  if (!state3.scaleResults || typeof state3.scaleResults !== "object") {
    state3.scaleResults = Object.assign({}, defaults);
    return;
  }
  Object.keys(defaults).forEach(function(k) {
    if (state3.scaleResults[k] == null) state3.scaleResults[k] = "";
  });
}
function ensureVpoState(map, patientId) {
  if (!patientId) return emptyVpoState();
  if (!map[patientId]) map[patientId] = emptyVpoState();
  ensureDiagnosticosList(map[patientId]);
  ensureScaleResults(map[patientId]);
  return map[patientId];
}
function ensureDiagnosticosList(state3) {
  if (!state3) return;
  if (!Array.isArray(state3.diagnosticosList)) state3.diagnosticosList = [];
  if (!state3.diagnosticosList.length && state3.diagnosticosText) {
    state3.diagnosticosList = parseDiagnosticosText(state3.diagnosticosText);
  }
  if (!state3.diagnosticosList.length) state3.diagnosticosList = [""];
  state3.diagnosticosText = formatDiagnosticosCopy(
    state3.diagnosticosList.filter(function(d) {
      return String(d || "").trim();
    })
  );
}
function setDiagnosticosList(state3, list) {
  var cleaned = (list || []).map(function(d) {
    return String(d || "").trim().toUpperCase();
  }).filter(Boolean);
  state3.diagnosticosList = cleaned.length ? cleaned.concat([""]) : [""];
  state3.diagnosticosText = formatDiagnosticosCopy(cleaned);
  syncAhaFields(state3);
}
function syncAhaFields(state3) {
  if (state3.asaKey) {
    state3.ahaClinico = suggestAhaClinicoFromAsa(state3.asaKey);
  }
  var proc = getProcedureById(state3.procedureId);
  if (proc) state3.ahaQuirurgico = proc.ahaQuirurgico;
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
function ensureDuracionKey(state3) {
  if (state3.duracionCirugiaKey) {
    var h = duracionKeyToHours(state3.duracionCirugiaKey);
    if (h != null) state3.duracionCirugiaHoras = String(h);
    return;
  }
  if (state3.duracionCirugiaHoras) {
    state3.duracionCirugiaKey = duracionHoursToKey(state3.duracionCirugiaHoras);
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
function applyVitalsFromMonitoreo(state3, patient) {
  if (!patient || !patient.monitoreo) return false;
  var v = getVitalsFromMonitoreo(patient.monitoreo);
  var ok = false;
  if (v.fc) {
    state3.fcLpm = v.fc;
    state3.lastFcApplied = v.fc;
    ok = true;
  }
  if (v.sat) {
    state3.spo2 = v.sat;
    ok = true;
  }
  return ok;
}
function mergeFarmacosFromMedReceta(state3, medItems) {
  if (!state3.farmacos) state3.farmacos = [];
  var existing = new Set(state3.farmacos.map((f) => f.sourceMedId).filter(Boolean));
  (medItems || []).forEach(function(it) {
    if (!it || it.suspendido) return;
    if (existing.has(it.id)) return;
    state3.farmacos.push({
      sourceMedId: it.id,
      nombreDisplay: it.nombreRaw || "",
      sugerencia: "",
      notaEditable: "",
      addedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    existing.add(it.id);
  });
}
function importDiagnosticosFromNota(state3, notaDx) {
  var lines = (notaDx || []).map(function(d) {
    return String(d || "").trim().toUpperCase();
  }).filter(Boolean);
  if (!lines.length) return false;
  setDiagnosticosList(state3, lines);
  state3.diagnosticosTouched = true;
  return true;
}
function importDiagnosticosFromPaste(state3, pasteText) {
  var parsed = parseDiagnosticosText(pasteText);
  if (!parsed.length) return false;
  setDiagnosticosList(state3, parsed);
  state3.diagnosticosTouched = true;
  return true;
}
function autofillVitalsFromMonitoreoIfEmpty(state3, patient) {
  if (!patient || !patient.monitoreo) return;
  var v = getVitalsFromMonitoreo(patient.monitoreo);
  if (!String(state3.spo2 || "").trim() && v.sat) state3.spo2 = v.sat;
  if (!String(state3.fcLpm || "").trim() && v.fc) {
    state3.fcLpm = v.fc;
    state3.lastFcApplied = v.fc;
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
function formatVpoScaleResultLines(state3) {
  var sr = state3 && state3.scaleResults || {};
  return VPO_SUGGESTED_SCALES.map(function(s) {
    var val = String(sr[s.key] || "").trim();
    if (!val) return s.label + ": \u2014";
    return s.label + ": " + val;
  });
}
function formatVpoDocumentationLines(state3) {
  return formatVpoScaleResultLines(state3);
}
function renderEkgWithFc(ekgText, fcLpm) {
  var t2 = String(ekgText || "");
  var fc = String(fcLpm || "").trim();
  if (!fc) return t2;
  return t2.replace(/FC\s*___\s*LPM/gi, "FC " + fc + " LPM");
}
function formatRiskLines(_scores, state3) {
  return formatVpoDocumentationLines(state3);
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
function hydrateVpoPatientDefaults(state3, patient) {
  if (!state3.edad && patient && patient.edad) {
    var m = String(patient.edad).match(/(\d+)/);
    if (m) state3.edad = m[1];
  }
  ensureDuracionKey(state3);
  ensureDiagnosticosList(state3);
  if (patient && !state3.diagnosticosTouched) {
    var vpoDxEmpty = !(state3.diagnosticosList || []).some(function(d) {
      return String(d).trim();
    });
    if (vpoDxEmpty) {
      ensurePatientDiagnosticos(patient);
      var fromPat = (patient.diagnosticosList || []).filter(function(d) {
        return String(d).trim();
      });
      if (fromPat.length) setDiagnosticosList(state3, fromPat.concat([""]));
    }
  }
  autofillVitalsFromMonitoreoIfEmpty(state3, patient || null);
}
function buildVpoPanelInnerHtml(state3, esc2, vpoSection2, renderRiskScalesOnlyBody2, renderDiagnosticosSection2, renderFarmacosList2) {
  var riesgoBody = renderRiskScalesOnlyBody2(state3);
  var ekgBody = '<div class="vpo-grid" style="margin-bottom:10px;"><div class="field-group"><label>FC (lpm) para plantilla EKG</label><input class="ea-input" data-vpo-field="fcLpm" type="text" value="' + esc2(state3.fcLpm) + '"></div></div><div class="vpo-toolbar" style="margin-bottom:10px;"><button type="button" class="btn-med-secondary" data-vpo-action="tomar-estado">Tomar FC de Estado actual</button></div><label class="ea-label">EKG</label><textarea class="ea-input" data-vpo-field="ekgText" rows="5">' + esc2(state3.ekgText) + '</textarea><label class="ea-label" style="margin-top:10px;display:block;">Rx t\xF3rax</label><textarea class="ea-input" data-vpo-field="rxText" rows="5">' + esc2(state3.rxText) + "</textarea>";
  return '<div class="vpo-panel vpo-form rpc-form-stack">' + vpoSection2("Riesgo preoperatorio", "amber", true, riesgoBody) + vpoSection2("EKG y Rx t\xF3rax", "indigo", false, ekgBody) + vpoSection2("Diagn\xF3sticos", "rose", true, renderDiagnosticosSection2(state3)) + vpoSection2(
    "F\xE1rmacos perioperatorios",
    "teal",
    false,
    '<p class="overview-hint">Fuente: receta SOME en Medicamentos.</p><div class="vpo-toolbar"><button type="button" class="btn-med-secondary" data-vpo-action="tomar-meds">Tomar de Medicamentos (SOME)</button> <button type="button" class="btn-med-secondary" data-vpo-action="ir-med">Ir a Medicamentos</button></div><div class="vpo-farm-list">' + renderFarmacosList2(state3.farmacos) + "</div>"
  ) + '<div class="vpo-actions"><button type="button" class="manejo-copy-btn primary" data-vpo-action="copy-full">Copiar valoraci\xF3n completa</button><button type="button" class="manejo-copy-btn" data-vpo-action="copy-ekg">Copiar EKG</button><button type="button" class="manejo-copy-btn" data-vpo-action="copy-rx">Copiar Rx</button><button type="button" class="manejo-copy-btn" data-vpo-action="copy-risk">Copiar riesgos</button><button type="button" class="manejo-copy-btn" data-vpo-action="copy-farm">Copiar f\xE1rmacos</button></div></div>';
}
function handleVpoDxDelegationAction(mount, action, state3, deps) {
  if (action === "dx-split-plus") {
    var ta = mount.querySelector("[data-vpo-dx-paste]");
    if (!importDiagnosticosFromPaste(state3, ta ? ta.value : "")) {
      deps.showToast("Pega diagn\xF3sticos separados por +", "error");
      return;
    }
    if (ta) ta.value = "";
    deps.scheduleSave();
    deps.refreshDxListDom(mount, state3);
    deps.showToast("Diagn\xF3sticos separados", "success");
    return;
  }
  if (action === "dx-add-row") {
    if (!state3.diagnosticosList) state3.diagnosticosList = [""];
    if (state3.diagnosticosList[state3.diagnosticosList.length - 1]) {
      state3.diagnosticosList.push("");
    }
    deps.commitDxList(mount, state3);
    var lastInput = mount.querySelector(
      '[data-vpo-dx-idx="' + (state3.diagnosticosList.length - 1) + '"]'
    );
    if (lastInput) lastInput.focus();
  }
}
function handleVpoDxRemoveRow(mount, removeBtn, state3, deps) {
  var idx = parseInt(removeBtn.getAttribute("data-vpo-dx-remove"), 10);
  if (!state3.diagnosticosList || state3.diagnosticosList.length <= 1) return;
  state3.diagnosticosList.splice(idx, 1);
  if (!state3.diagnosticosList.length) state3.diagnosticosList = [""];
  deps.commitDxList(mount, state3);
}

// public/js/features/vpo-panel.mjs
var rt18 = {
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
  if (ctx && typeof ctx === "object") Object.assign(rt18, ctx);
}
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function() {
    _saveTimer = null;
    persistClinicalState();
  }, 400);
}
function copyText(label, text) {
  var t2 = String(text || "").trim();
  if (!t2) {
    rt18.showToast("Nada que copiar en " + label, "error");
    return;
  }
  copyToClipboardSafe(t2).then(function(ok) {
    rt18.showToast(ok ? label + " copiado" : "No se pudo copiar", ok ? "success" : "error");
  });
}
function renderRiskScalesOnlyBody(state3) {
  ensureScaleResults(state3);
  var sr = state3.scaleResults;
  return '<p class="overview-hint">' + esc(VPO_OFFICIAL_CALCULATOR_DISCLAIMER) + '</p><div class="field-group" style="margin-top:10px;"><label class="ea-label">Introducci\xF3n (texto previo a escalas)</label><textarea class="ea-input" data-vpo-field="valoracionIntro" rows="2">' + esc(state3.valoracionIntro) + '</textarea></div><p class="ea-label vpo-scales-grid-title">Resultado por escala (calculadora externa)</p><div class="vpo-scales-results">' + VPO_SUGGESTED_SCALES.map(function(s) {
    return '<label class="vpo-scale-cell" title="' + esc(s.hint) + '"><span class="vpo-scale-label">' + esc(s.label) + '</span><input type="text" class="ea-input" data-vpo-scale="' + esc(s.key) + '" value="' + esc(sr[s.key]) + '" placeholder="Resultado\u2026" autocomplete="off"></label>';
  }).join("") + "</div>";
}
function vpoSection(title, tone, open, body) {
  return '<details class="vpo-section ea-card"' + (open ? " open" : "") + '><summary class="card-header card-header--tone-' + tone + '">' + esc(title) + '</summary><div class="vpo-section-body">' + body + "</div></details>";
}
function wireVpoCopyActions(mount, state3) {
  ["copy-ekg", "copy-rx", "copy-risk", "copy-farm", "copy-full"].forEach(function(action) {
    mount.querySelector('[data-vpo-action="' + action + '"]')?.addEventListener("click", function() {
      if (action === "copy-ekg") {
        copyText("EKG", "ELECTROCARDIOGRAMA:\n\n" + renderEkgWithFc(state3.ekgText, state3.fcLpm));
      } else if (action === "copy-rx") {
        copyText("Rx t\xF3rax", "RADIOGRAF\xCDA DE T\xD3RAX:\n\n" + state3.rxText);
      } else if (action === "copy-risk") {
        var lines = formatRiskLines(null, state3);
        copyText("Riesgos", state3.valoracionIntro + "\n" + lines.join("\n"));
      } else if (action === "copy-farm") {
        copyText("F\xE1rmacos", buildFarmacosCopyText(state3.farmacos));
      } else if (action === "copy-full") {
        var riskBlock = state3.valoracionIntro + "\n" + formatRiskLines(null, state3).join("\n");
        copyText(
          "Valoraci\xF3n completa",
          buildVpoFullCopyText({
            ekgBlock: renderEkgWithFc(state3.ekgText, state3.fcLpm),
            rxBlock: state3.rxText,
            diagnosticosBlock: state3.diagnosticosText,
            valoracionBlock: riskBlock
          })
        );
      }
    });
  });
}
function wireVpoImportActions(mount, state3, patientId) {
  mount.querySelector('[data-vpo-action="tomar-estado"]')?.addEventListener("click", function() {
    var patient = getPatients().find(function(p) {
      return p.id === patientId;
    });
    if (!applyVitalsFromMonitoreo(state3, patient || null)) {
      rt18.showToast("Sin FC o SpO\u2082 en Estado actual", "error");
      return;
    }
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt18.showToast("FC y SpO\u2082 tomados de Estado actual", "success");
  });
  mount.querySelector('[data-vpo-action="tomar-dx"]')?.addEventListener("click", function() {
    var note = getNotes()[patientId] || {};
    if (state3.diagnosticosTouched && (state3.diagnosticosList || []).some(function(d) {
      return String(d).trim();
    })) {
      rt18.showToast("Diagn\xF3sticos ya editados \u2014 no se sobrescriben", "error");
      return;
    }
    if (!importDiagnosticosFromNota(state3, note.diagnosticos || [])) {
      rt18.showToast("Sin diagn\xF3sticos en la nota", "error");
      return;
    }
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt18.showToast("Diagn\xF3sticos importados", "success");
  });
  mount.querySelector('[data-vpo-action="push-dx-datos"]')?.addEventListener("click", function() {
    var patient = getPatients().find(function(p) {
      return p.id === patientId;
    });
    if (!patient) return;
    var list = (state3.diagnosticosList || []).filter(function(d) {
      return String(d).trim();
    });
    if (!list.length) {
      rt18.showToast("Sin diagn\xF3sticos en VPO para enviar", "error");
      return;
    }
    pushDiagnosticosToPatient(patient, list);
    stampCensoFieldsClock(patient);
    persistClinicalState();
    rt18.showToast("Diagn\xF3sticos guardados en Datos del paciente", "success");
  });
  mount.querySelector('[data-vpo-action="tomar-meds"]')?.addEventListener("click", function() {
    var block = getMedRecetaByPatient()[patientId];
    if (!block || !block.items || !block.items.length) {
      rt18.showToast("Procesa la receta en Medicamentos primero", "error");
      return;
    }
    mergeFarmacosFromMedReceta(state3, block.items);
    scheduleSave();
    renderVpoPanel(mount, patientId);
    rt18.showToast("F\xE1rmacos actualizados desde SOME", "success");
  });
  mount.querySelector('[data-vpo-action="ir-med"]')?.addEventListener("click", function() {
    rt18.switchAppTab("med");
  });
}
function wireForm(mount, state3, patientId) {
  var form = mount.querySelector(".vpo-form");
  if (!form || form._vpoWired) return;
  form._vpoWired = true;
  form.addEventListener("input", function(ev) {
    var el = ev.target;
    if (!el) return;
    var scaleKey = el.getAttribute("data-vpo-scale");
    if (scaleKey) {
      ensureScaleResults(state3);
      state3.scaleResults[scaleKey] = el.value;
      scheduleSave();
      return;
    }
    if (!el.getAttribute("data-vpo-field")) return;
    var field = el.getAttribute("data-vpo-field");
    if (field.indexOf(".") >= 0) {
      var parts = field.split(".");
      if (!state3[parts[0]]) state3[parts[0]] = {};
      if (el.type === "checkbox") state3[parts[0]][parts[1]] = el.checked;
      else state3[parts[0]][parts[1]] = el.value;
    } else {
      state3[field] = el.type === "checkbox" ? el.checked : el.value;
    }
    scheduleSave();
  });
  wireVpoImportActions(mount, state3, patientId);
  wireVpoCopyActions(mount, state3);
}
function renderFarmacosList(farmacos) {
  if (!farmacos || !farmacos.length) {
    return '<p class="overview-hint">Sin f\xE1rmacos en VPO. Usa \xABTomar de Medicamentos (SOME)\xBB.</p>';
  }
  return farmacos.map(function(f, idx) {
    return '<div class="vpo-farm-row"><div class="vpo-farm-name">' + esc(f.nombreDisplay) + '</div><textarea class="vpo-farm-nota ea-input" data-vpo-farm-idx="' + idx + '" rows="2">' + esc(f.notaEditable || "") + "</textarea></div>";
  }).join("");
}
function syncDxTextOnly(state3) {
  if (!state3) return;
  var nonEmpty = (state3.diagnosticosList || []).filter(function(d) {
    return String(d || "").trim();
  });
  state3.diagnosticosText = formatDiagnosticosCopy(nonEmpty);
}
function commitDxList(mount, state3) {
  if (!state3) return;
  state3.diagnosticosTouched = true;
  setDiagnosticosList(state3, state3.diagnosticosList);
  scheduleSave();
  refreshDxListDom2(mount, state3);
}
function dxRowsForRender(state3) {
  var list = (state3.diagnosticosList || []).slice();
  return list.length ? list : [""];
}
function renderDxListHtml2(state3) {
  var rows = dxRowsForRender(state3);
  return rows.map(function(dx, i) {
    var canRemove = rows.length > 1;
    return '<div class="vpo-dx-row list-row"><input type="text" class="ea-input" data-vpo-dx-idx="' + i + '" value="' + esc(dx) + '" placeholder="Diagn\xF3stico ' + (i + 1) + '"><button type="button" class="btn-remove" data-vpo-dx-remove="' + i + '"' + (canRemove ? "" : ' style="visibility:hidden"') + ' aria-label="Eliminar">\xD7</button></div>';
  }).join("");
}
function refreshDxListDom2(mount, state3) {
  var listEl = mount.querySelector(".vpo-dx-list");
  if (!listEl) return;
  listEl.innerHTML = renderDxListHtml2(state3);
}
function renderDiagnosticosSection(state3) {
  return '<div class="vpo-toolbar"><button type="button" class="btn-med-secondary" data-vpo-action="tomar-dx">Tomar de la nota</button><button type="button" class="btn-med-secondary" data-vpo-action="push-dx-datos">Enviar a Datos del paciente</button><button type="button" class="btn-add-row" data-vpo-action="dx-add-row">+ Agregar diagn\xF3stico</button></div><div class="vpo-dx-list">' + renderDxListHtml2(state3) + '</div><div class="vpo-dx-paste"><span class="ea-label">Pegar lista con \xAB + \xBB entre diagn\xF3sticos</span><textarea class="ea-input vpo-dx-paste-input" data-vpo-dx-paste placeholder="DX1 + DX2 + DX3\u2026"></textarea><button type="button" class="btn-med-secondary" data-vpo-action="dx-split-plus">Separar por +</button></div>';
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
      rt18.showToast(msg, type);
    },
    scheduleSave,
    refreshDxListDom: refreshDxListDom2,
    commitDxList
  };
  mount.addEventListener("click", function(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("[data-vpo-action]") : null;
    if (!btn || !mount.contains(btn)) return;
    var action = btn.getAttribute("data-vpo-action");
    var state3 = liveVpoState(mount);
    if (!state3) return;
    if (action === "dx-split-plus" || action === "dx-add-row") {
      ev.preventDefault();
      handleVpoDxDelegationAction(mount, action, state3, dxDeps);
      return;
    }
    var removeBtn = ev.target.closest ? ev.target.closest("[data-vpo-dx-remove]") : null;
    if (removeBtn && mount.contains(removeBtn)) {
      ev.preventDefault();
      handleVpoDxRemoveRow(mount, removeBtn, state3, dxDeps);
    }
  });
  mount.addEventListener("input", function(ev) {
    var el = ev.target;
    if (!el || el.getAttribute("data-vpo-dx-idx") == null || !mount.contains(el)) return;
    var state3 = liveVpoState(mount);
    if (!state3) return;
    var idx = parseInt(el.getAttribute("data-vpo-dx-idx"), 10);
    if (!state3.diagnosticosList) state3.diagnosticosList = [""];
    state3.diagnosticosList[idx] = el.value.toUpperCase();
    state3.diagnosticosTouched = true;
    syncDxTextOnly(state3);
    scheduleSave();
  });
  mount.addEventListener("keydown", function(ev) {
    var el = ev.target;
    if (!el || el.getAttribute("data-vpo-dx-idx") == null || !mount.contains(el)) return;
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    var state3 = liveVpoState(mount);
    if (!state3) return;
    var idx = parseInt(el.getAttribute("data-vpo-dx-idx"), 10);
    if (!state3.diagnosticosList) state3.diagnosticosList = [""];
    if (idx >= state3.diagnosticosList.length - 1) {
      state3.diagnosticosList.push("");
    }
    commitDxList(mount, state3);
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
  var state3 = ensureVpoState(getVpoByPatient(), patientId);
  var patient = getPatients().find(function(p) {
    return p.id === patientId;
  });
  hydrateVpoPatientDefaults(state3, patient || null);
  mount._vpoPatientId = patientId;
  mount.innerHTML = buildVpoPanelInnerHtml(
    state3,
    esc,
    vpoSection,
    renderRiskScalesOnlyBody,
    renderDiagnosticosSection,
    renderFarmacosList
  );
  mount.querySelectorAll(".vpo-farm-nota").forEach(function(ta) {
    ta.addEventListener("input", function() {
      var idx = parseInt(ta.getAttribute("data-vpo-farm-idx"), 10);
      if (state3.farmacos[idx]) {
        state3.farmacos[idx].notaEditable = ta.value;
        scheduleSave();
      }
    });
  });
  ensureVpoMountDelegation(mount);
  mount._vpoWired = false;
  var form = mount.querySelector(".vpo-form");
  if (form) form._vpoWired = false;
  wireForm(mount, state3, patientId);
}
function stashVpoForPatient(_patientId) {
  scheduleSave();
}

// public/js/features/vpo.mjs
var rt19 = {
  getActiveId() {
    return null;
  }
};
function registerVpoRuntime(ctx) {
  if (ctx && typeof ctx === "object") {
    Object.assign(rt19, ctx);
    registerVpoPanelRuntime(ctx);
  }
}
function renderVpo() {
  var mount = document.getElementById("vpo-container");
  if (!mount) return;
  renderVpoPanel(mount, rt19.getActiveId());
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
    rt2.showToast(`Disponible el ${when}`, "info");
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
    rt2.setActiveInner("resumen");
    rt2.syncInnerTabVisualOnly();
  } else {
    rt2.switchInnerTab("resumen");
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
  if (isPaseMode() && rt2.getActiveAppTab() === "nota") {
    setRoundOverviewMode(isRoundOverviewInner(inner));
  }
}
function migrateInnerOnPatientChange(inner, settings) {
  var migrated = migrateGranularInner(inner || "resumen", settings);
  if (migrated !== inner) {
    rt2.setActiveInner(migrated);
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
  rt2.limpiarReporte();
  rt2.renderLabHistoryPanel();
  if (isPaseMode()) {
    rt2.syncWorkContextChrome();
    return true;
  }
  rt2.switchAppTab("lab");
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
    if (String(rt2.getActiveId() || "") !== String(id)) return;
    if (inputPending()) {
      scheduleSelectedPatientChart(id, ctx);
      return;
    }
    paintSelectedPatientChart(id, ctx);
  }, 120);
}
function paintSelectedPatientChart(id, ctx) {
  if (String(rt2.getActiveId() || "") !== String(id)) return;
  rt2.refreshExpedienteAfterPatientSelect({ patientChanged: ctx.patientChanged });
  if (ctx.appTab === "lab") rt2.renderLabHistoryPanel();
  if (ctx.appTab === "med") rt2.renderMedRecetaPanel();
  handleLabTabAfterPatientChange(ctx.wasOnLab, ctx.patientChanged);
  syncRoundExpedienteLayout();
  rt2.refreshTendenciasOrCultivosPanel();
  if (isPaseMode()) rt2.renderPaseBoard();
  if (rt2.getActiveId()) {
    requestAnimationFrame(function() {
      if (String(rt2.getActiveId() || "") !== String(id)) return;
      scrollActiveRondaCardIntoView();
    });
  }
  requestSilentUpdateCheck();
  if (ctx.patientChanged && ctx.prevId != null && ctx.prevId !== "") persistClinicalState();
}
function selectPatientCore(id) {
  var prevId = rt2.getActiveId();
  var wasOnLab = rt2.getActiveAppTab() === "lab";
  var appTab = rt2.getActiveAppTab();
  var patientChanged = String(prevId ?? "") !== String(id);
  if (patientChanged) {
    stashPatientDraftsOnChange(prevId);
    rt2.invalidateInnerTabRenderCache();
  }
  rt2.setActiveId(id);
  writeLastSelectedPatientId(id);
  if (!patientChanged || !patchPatientListActiveHighlight(id)) {
    patientsBridge.renderPatientList();
  }
  showPatientViewShell();
  rt2.renderEstadoActualButton();
  syncHeaderContext(rt2);
  var settings = rt2.getSettings();
  var inner = rt2.getActiveInner();
  if (patientChanged) {
    inner = migrateInnerOnPatientChange(inner, settings);
    if (isPaseMode() && rt2.getActiveAppTab() === "nota") {
      setRoundOverviewMode(isRoundOverviewInner(inner));
    }
  } else {
    applyInnerTabOnSamePatient(settings, inner);
  }
  rt2.syncInnerTabVisualOnly();
  scheduleSelectedPatientChart(id, {
    patientChanged,
    prevId,
    wasOnLab,
    appTab
  });
}
function showPatientDeleteConfirm(n) {
  var many = n > 1;
  return showConfirmDialog({
    id: "patients-delete-confirm",
    title: many ? "Eliminar " + n + " pacientes" : "Eliminar paciente",
    question: many ? "Se quitar\xE1n las notas de este turno. No volver\xE1n desde otros equipos." : "Se quitar\xE1n las notas de este turno. No volver\xE1 desde otros equipos.",
    confirmLabel: "Eliminar",
    cancelLabel: "Cancelar"
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
  rt2.syncWorkContextChrome();
}
function afterPatientDeletesCommitted(summary, auditLabel) {
  persistClinicalState({ immediate: true });
  rt2.addAuditEntry("patient-delete", "ok", summary.ok || 0, auditLabel || "");
  patientsBridge.renderPatientList();
  syncPatientBulkBar();
  var msg = formatPatientDeleteSummary(summary);
  if (msg && typeof rt2.showToast === "function") {
    var kind = summary.failed ? "warn" : "success";
    rt2.showToast(msg, kind);
  }
  if (rt2.getActiveId()) patientsBridge.selectPatient(rt2.getActiveId());
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
    if (typeof rt2.showToast === "function") {
      rt2.showToast("Solo puedes eliminar pacientes de tu equipo (Admin/R4: todos).", "warn");
    }
    return;
  }
  if (!await confirmPatientDelete(target)) return;
  var label = "Eliminar " + (target.nombre || "paciente");
  if (typeof rt2.pushUndoSnapshot === "function") rt2.pushUndoSnapshot(label);
  var summary = await commitPatientDeletes([id]);
  afterPatientDeletesCommitted(
    summary,
    target.registro || target.nombre || ""
  );
}
async function confirmBulkDeletePatients() {
  var ids = getPatientBulkSelectedIds();
  if (!ids.length) {
    if (typeof rt2.showToast === "function") rt2.showToast("Selecciona al menos un paciente", "info");
    return;
  }
  var scope = getClinicalScopeContextForEvaluate();
  var user = clinicalSessionContext.user;
  var allowed = ids.filter(function(pid) {
    return canDeletePatientChart(user, pid, scope);
  });
  var skipped = ids.length - allowed.length;
  if (!allowed.length) {
    if (typeof rt2.showToast === "function") {
      rt2.showToast("Solo puedes eliminar pacientes de tu equipo (Admin/R4: todos).", "warn");
    }
    return;
  }
  var n = allowed.length;
  var ok = await showPatientDeleteConfirm(n);
  if (!ok) return;
  if (typeof rt2.pushUndoSnapshot === "function") {
    rt2.pushUndoSnapshot("Eliminar " + n + " pacientes");
  }
  var summary = await commitPatientDeletes(allowed);
  exitPatientBulkSelectMode();
  afterPatientDeletesCommitted(summary, n + " pacientes");
  if (skipped > 0 && typeof rt2.showToast === "function") {
    rt2.showToast(
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
  applyNotaFormatScaffoldIfEmpty(getNotes()[patientId], rt2.getSettings() || {});
}
function applyDefaultsToNewIndicaciones(patientId) {
  if (!getIndicaciones()[patientId]) return;
  var st = rt2.getSettings() || {};
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
var windowHandlers2 = {
  onPatientSearchInput,
  focusPatientSearchInput,
  togglePatientPinned,
  togglePatientArchived,
  togglePatientRoundSeen,
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
  openFullExpedienteFromRound,
  returnToRoundOverview,
  ...patientRegistroModalWindowHandlers
};

// public/js/features/platform/import-backup/import-core.mjs
var rt20 = getPlatformRuntime();
function askConflictAction(label) {
  if (typeof window !== "undefined" && window.__rpcPreferImportOverwrite === true) {
    return "overwrite";
  }
  var answer = prompt('Conflicto detectado para "' + label + '". Escribe: O = sobrescribir, D = duplicar, C = cancelar.', "O");
  var v = String(answer || "").trim().toUpperCase();
  if (v === "O") return "overwrite";
  if (v === "D") return "duplicate";
  return "cancel";
}
function copyImportClinicalData(patientId, entry) {
  getNotes()[patientId] = entry.note || {};
  getIndicaciones()[patientId] = entry.indicaciones || {};
  getLabHistory()[patientId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  if (entry.medReceta) getMedRecetaByPatient()[patientId] = entry.medReceta;
  else delete getMedRecetaByPatient()[patientId];
  if (entry.medPharmProfile) getMedPharmProfileByPatient()[patientId] = entry.medPharmProfile;
  else delete getMedPharmProfileByPatient()[patientId];
}
function applyImportOverwrite(existing, entry) {
  existing.nombre = entry.patient.nombre || existing.nombre;
  existing.edad = entry.patient.edad || existing.edad;
  existing.sexo = entry.patient.sexo || existing.sexo;
  existing.area = entry.patient.area || existing.area;
  existing.servicio = entry.patient.servicio || existing.servicio;
  existing.cuarto = entry.patient.cuarto || existing.cuarto;
  existing.cama = entry.patient.cama || existing.cama;
  if (entry.patient.viaAcceso) existing.viaAcceso = entry.patient.viaAcceso;
  mergeCensoPatientFields(existing, entry.patient);
  mergePatientRegistrationMeta(existing, entry.patient);
  existing.registro = entry.patient.registro || existing.registro;
  mergePatientMonitoreoFromImported(existing, entry.patient);
  copyImportClinicalData(existing.id, entry);
  return existing.id;
}
function applyImportDuplicate(entry) {
  var newId = generatePatientId();
  var newPatient = {
    id: newId,
    nombre: ensureUniquePatientName(entry.patient.nombre || "PACIENTE SIN NOMBRE"),
    area: entry.patient.area || "",
    servicio: entry.patient.servicio || "",
    cuarto: entry.patient.cuarto || "",
    cama: entry.patient.cama || "",
    edad: entry.patient.edad || "",
    sexo: entry.patient.sexo || "F",
    registro: entry.patient.registro || "",
    fromLab: !!entry.patient.fromLab
  };
  mergePatientMonitoreoFromImported(newPatient, entry.patient);
  mergeCensoPatientFields(newPatient, entry.patient);
  mergePatientRegistrationMeta(newPatient, entry.patient);
  getPatients().unshift(newPatient);
  copyImportClinicalData(newId, entry);
  return newId;
}
function applyImportEntry(entry, action, existing) {
  if (action === "overwrite" && existing) return applyImportOverwrite(existing, entry);
  return applyImportDuplicate(entry);
}
function importEntriesWithConflicts(entries, actionLabel) {
  var out = { imported: 0, overwritten: 0, duplicated: 0, cancelled: false };
  var patientsBefore = JSON.parse(JSON.stringify(getPatients()));
  var notesBefore = JSON.parse(JSON.stringify(getNotes()));
  var indicacionesBefore = JSON.parse(JSON.stringify(getIndicaciones()));
  var labHistoryBefore = JSON.parse(JSON.stringify(getLabHistory()));
  var medRecetaBefore = JSON.parse(JSON.stringify(getMedRecetaByPatient()));
  var medPharmBefore = JSON.parse(JSON.stringify(getMedPharmProfileByPatient()));
  for (var i = 0; i < entries.length; i += 1) {
    var entry = entries[i];
    if (!entry || !entry.patient) continue;
    var reg = String(entry.patient.registro || "").trim();
    var exists = findPatientByRegistro(reg);
    if (exists) {
      var action = askConflictAction(entry.patient.nombre || reg || "sin nombre");
      if (action === "cancel") {
        out.cancelled = true;
        break;
      }
      applyImportEntry(entry, action, exists);
      if (action === "overwrite") out.overwritten += 1;
      if (action === "duplicate") out.duplicated += 1;
    } else {
      applyImportEntry(entry, "duplicate", null);
      out.imported += 1;
    }
  }
  if (out.cancelled) {
    setPatients(patientsBefore);
    setNotes(notesBefore);
    setIndicaciones(indicacionesBefore);
    setLabHistory(labHistoryBefore);
    setMedRecetaByPatient(medRecetaBefore);
    setMedPharmProfileByPatient(medPharmBefore);
  } else {
    persistClinicalState();
    renderPatientList();
  }
  addAuditEntry(
    actionLabel,
    out.cancelled ? "cancelled" : "ok",
    out.imported + out.overwritten + out.duplicated,
    "new:" + out.imported + ",overwrite:" + out.overwritten + ",duplicate:" + out.duplicated
  );
  return out;
}
function patientExportPayloadToEntry(payload) {
  return {
    patient: payload.patient,
    note: payload.note || {},
    indicaciones: payload.indicaciones || {},
    labHistory: Array.isArray(payload.labHistory) ? payload.labHistory : [],
    medReceta: payload.medReceta || null,
    medPharmProfile: payload.medPharmProfile || null
  };
}
function applySinglePatientExportPayload(payload) {
  var imported = payload.patient || {};
  var registro = String(imported.registro || "").trim();
  var existsByRegistro = findPatientByRegistro(registro);
  var entry = patientExportPayloadToEntry(payload);
  if (existsByRegistro) {
    applyImportEntry(entry, "overwrite", existsByRegistro);
    rt20.setActiveId(existsByRegistro.id);
    return registro;
  }
  var newId = applyImportEntry(entry, "duplicate", null);
  rt20.setActiveId(newId);
  return registro;
}
function importPatientExportPayloads(payloads, sourceLabel) {
  if (!payloads || !payloads.length) {
    rt20.showToast("No hay pacientes para importar.", "error");
    return false;
  }
  if (payloads.length > 1) {
    var names = payloads.map(function(p) {
      return p.patient && p.patient.nombre || "Sin nombre";
    }).join(", ");
    if (!confirm(
      "Se importar\xE1n " + payloads.length + " pacientes: " + names + ". Si ya existen por registro, se preguntar\xE1 qu\xE9 hacer con cada uno. \xBFContinuar?"
    )) {
      return false;
    }
    if (typeof pushUndoSnapshot === "function") {
      rt20.pushUndoSnapshot("Importar pacientes demo (" + payloads.length + ")");
    }
    var entries = payloads.map(patientExportPayloadToEntry);
    var res = importEntriesWithConflicts(entries, "backup-patient-import");
    if (res.cancelled) {
      rt20.showToast("Importaci\xF3n cancelada", "error");
      return false;
    }
    rt20.showToast(
      "Pacientes importados: " + (res.imported + res.overwritten + res.duplicated),
      "success"
    );
    if (rt20.getActiveId()) selectPatient(rt20.getActiveId());
    return true;
  }
  var payload = payloads[0];
  var imported = payload.patient || {};
  var registro = String(imported.registro || "").trim();
  var existsByRegistro = findPatientByRegistro(registro);
  var msg = existsByRegistro ? "Ya existe un paciente con el registro " + registro + ". Esto sobrescribir\xE1 su nota, indicaciones y labs. \xBFContinuar?" : 'Se importar\xE1 el paciente "' + (imported.nombre || "Sin nombre") + '". \xBFContinuar?';
  if (!confirm(msg)) return false;
  applySinglePatientExportPayload(payload);
  persistClinicalState();
  renderPatientList();
  if (rt20.getActiveId()) selectPatient(rt20.getActiveId());
  addAuditEntry("backup-patient-import", "ok", 1, (sourceLabel || "") + registro);
  rt20.showToast("Paciente importado correctamente.", "success");
  return true;
}

// public/js/features/platform/import-backup/export-backup.mjs
var rt21 = getPlatformRuntime();
async function exportDataBackup() {
  await persistClinicalState({ immediate: true });
  var payload = buildFullBackupPayload();
  var n = (payload.data.patients || []).length;
  downloadJsonPayload(payload, "R-plus-respaldo-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("backup-full-export", "ok", n, "");
  if (n === 0) {
    rt21.showToast(
      "Respaldo descargado sin pacientes. Si esperabas datos, revisa la lista y exporta de nuevo.",
      "error"
    );
  } else {
    rt21.showToast("Respaldo descargado (" + n + " paciente" + (n === 1 ? "" : "s") + ")", "success");
  }
}
function exportActivePatientBackup() {
  var aid4 = rt21.getActiveId();
  if (!aid4) {
    rt21.showToast("Selecciona un paciente en la lista.", "error");
    return;
  }
  if (isTourDemoPatientId(aid4, getPatients())) {
    rt21.showToast("El paciente de demostraci\xF3n no se exporta.", "error");
    return;
  }
  var patient = getPatients().find(function(p) {
    return p.id === aid4;
  });
  if (!patient) return;
  persistClinicalState();
  var payload = {
    format: "r-plus-patient-export",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    patient,
    note: getNotes()[aid4] || null,
    indicaciones: getIndicaciones()[aid4] || null,
    labHistory: getLabHistory()[aid4] || [],
    medReceta: getMedRecetaByPatient()[aid4] || null,
    medPharmProfile: getMedPharmProfileByPatient()[aid4] || null
  };
  downloadJsonPayload(payload, "R-plus-paciente-" + safeExportSlug(patient.nombre) + "-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("backup-patient-export", "ok", 1, String(patient.registro || ""));
  rt21.showToast("Paciente exportado", "success");
}
function exportRangeBackupPrompt() {
  var raw = prompt("Rango de fechas (dd/mm/yyyy - dd/mm/yyyy):", "");
  if (raw == null) return;
  var range = parseDateRangePrompt(raw);
  if (!range) {
    rt21.showToast("Rango inv\xE1lido. Usa dd/mm/yyyy - dd/mm/yyyy", "error");
    return;
  }
  var entries = [];
  getPatients().forEach(function(p) {
    var entry = buildPatientEntry(p.id);
    if (entry && patientInDateRange(entry, range)) entries.push(entry);
  });
  if (!entries.length) {
    rt21.showToast("No hay pacientes en ese rango.", "error");
    return;
  }
  var payload = {
    format: "r-plus-range-export",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    from: range.fromLabel,
    to: range.toLabel,
    entries
  };
  downloadJsonPayload(payload, "R-plus-rango-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("range-export", "ok", entries.length, payload.from + " a " + payload.to);
  rt21.showToast("Rango exportado", "success");
}

// public/js/features/platform/import-backup/export-patients-selection.mjs
function buildPatientsSelectionExportPayload(patientIds) {
  var entries = [];
  for (var i = 0; i < patientIds.length; i += 1) {
    var entry = buildPatientEntry(patientIds[i]);
    if (entry) entries.push(entry);
  }
  var n = entries.length;
  return {
    format: "r-plus-range-export",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    from: "Selecci\xF3n manual",
    to: n + " paciente" + (n === 1 ? "" : "s"),
    entries
  };
}
function sortPatientsForExportPicker(list) {
  return list.slice().sort(function(a, b) {
    var ca = String(a.cuarto || "");
    var cb = String(b.cuarto || "");
    if (ca !== cb) return ca.localeCompare(cb, "es", { numeric: true });
    var ka = String(a.cama || "");
    var kb = String(b.cama || "");
    if (ka !== kb) return ka.localeCompare(kb, "es", { numeric: true });
    return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
  });
}

// public/js/features/platform/import-backup/export-patients-modal.mjs
var rt22 = getPlatformRuntime();
function exportablePatientsForPicker() {
  var visible = patientsVisibleInSidebar();
  var source = visible.length ? visible : getPatients();
  return sortPatientsForExportPicker(
    source.filter(function(p) {
      return p && p.id && !isTourDemoPatientId(p.id, getPatients());
    })
  );
}
function patientPickerLabel(p) {
  var bed = [p.cuarto, p.cama].filter(Boolean).join("-");
  var reg = p.registro ? " \u2022 " + p.registro : "";
  var archived = p.archived ? " (archivado)" : "";
  return (bed ? bed + " \u2014 " : "") + (p.nombre || "Sin nombre") + reg + archived;
}
function selectedPatientIdsFromBackdrop(backdrop) {
  var ids = [];
  backdrop.querySelectorAll(".export-patients-cb:checked").forEach(function(cb) {
    var pid = cb.getAttribute("data-patient-id");
    if (pid) ids.push(pid);
  });
  return ids;
}
function syncExportPatientsActions(backdrop) {
  var countEl = backdrop.querySelector("#export-patients-count");
  var exportBtn = backdrop.querySelector("#export-patients-ok");
  var ids = selectedPatientIdsFromBackdrop(backdrop);
  var n = ids.length;
  if (countEl) {
    countEl.textContent = n === 0 ? "Ning\xFAn paciente seleccionado" : n + " paciente" + (n === 1 ? "" : "s") + " seleccionado" + (n === 1 ? "" : "s");
  }
  if (exportBtn) {
    exportBtn.disabled = n === 0;
    exportBtn.setAttribute("aria-disabled", n === 0 ? "true" : "false");
    exportBtn.style.opacity = n === 0 ? "0.55" : "";
    exportBtn.style.cursor = n === 0 ? "not-allowed" : "pointer";
  }
}
function closeExportPatientsModal(backdrop) {
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}
function buildExportPatientsListHtml(candidates, activeId) {
  return candidates.map(function(p) {
    var checked = p.id === activeId ? " checked" : "";
    return '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="export-patients-cb" data-patient-id="' + esc(p.id) + '"' + checked + ' style="margin-top:3px;flex-shrink:0;" /><span>' + esc(patientPickerLabel(p)) + "</span></label></li>";
  }).join("");
}
function runExportPatientsSelection(patientIds) {
  persistClinicalState();
  var payload = buildPatientsSelectionExportPayload(patientIds);
  if (!payload.entries.length) {
    rt22.showToast("No hay pacientes exportables en la selecci\xF3n.", "error");
    return;
  }
  downloadJsonPayload(payload, "R-plus-pacientes-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("selection-export", "ok", payload.entries.length, payload.to);
  rt22.showToast(
    "Exportados " + payload.entries.length + " paciente" + (payload.entries.length === 1 ? "" : "s"),
    "success"
  );
}
function wireExportPatientsModal(backdrop, candidates) {
  var ordered = candidates;
  backdrop.querySelector("#export-patients-all")?.addEventListener("click", function() {
    backdrop.querySelectorAll(".export-patients-cb").forEach(function(cb) {
      cb.checked = true;
    });
    syncExportPatientsActions(backdrop);
  });
  backdrop.querySelector("#export-patients-none")?.addEventListener("click", function() {
    backdrop.querySelectorAll(".export-patients-cb").forEach(function(cb) {
      cb.checked = false;
    });
    syncExportPatientsActions(backdrop);
  });
  backdrop.querySelector("#export-patients-cancel")?.addEventListener("click", function() {
    closeExportPatientsModal(backdrop);
  });
  backdrop.addEventListener("change", function(ev) {
    if (ev.target && ev.target.classList && ev.target.classList.contains("export-patients-cb")) {
      syncExportPatientsActions(backdrop);
    }
  });
  backdrop.querySelector("#export-patients-ok")?.addEventListener("click", function() {
    var ids = selectedPatientIdsFromBackdrop(backdrop);
    if (!ids.length) return;
    closeExportPatientsModal(backdrop);
    runExportPatientsSelection(ids);
  });
  backdrop.addEventListener("click", function(ev) {
    if (ev.target === backdrop) closeExportPatientsModal(backdrop);
  });
  syncExportPatientsActions(backdrop);
  if (!ordered.length) {
    var exportBtn = backdrop.querySelector("#export-patients-ok");
    if (exportBtn) exportBtn.disabled = true;
  }
}
function openExportPatientsModal() {
  var candidates = exportablePatientsForPicker();
  var listHtml = candidates.length ? buildExportPatientsListHtml(candidates, rt22.getActiveId()) : '<li style="font-size:13px;color:var(--text-muted);">No hay pacientes exportables en el censo visible.</li>';
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;";
  backdrop.innerHTML = '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;"><h3 style="margin:0 0 8px;">Exportar pacientes</h3><p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca los pacientes que quieres incluir. El archivo JSON se puede importar con <strong>Importar paciente\u2026</strong> o <strong>Importar rango\u2026</strong>.</p><div style="overflow-y:auto;flex:0 1 auto;max-height:42vh;padding-right:4px;"><ul style="margin:0;padding-left:0;list-style:none;font-size:13px;">' + listHtml + '</ul></div><p id="export-patients-count" style="font-size:12px;color:var(--text-muted);margin:10px 0 6px;">Ning\xFAn paciente seleccionado</p><div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;"><button type="button" id="export-patients-none" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Quitar todos</button><button type="button" id="export-patients-all" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Seleccionar todos</button><button type="button" id="export-patients-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button><button type="button" id="export-patients-ok" disabled aria-disabled="true" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Exportar JSON\u2026</button></div></div>';
  document.body.appendChild(backdrop);
  wireExportPatientsModal(backdrop, candidates);
}

// public/js/patient-export-payloads.mjs
var RANGE_EXPORT_FORMAT = "r-plus-range-export";
function resolveDemoBundle(root) {
  if (root.format !== DEMO_BUNDLE_FORMAT || Number(root.version) !== PATIENT_EXPORT_VERSION || !Array.isArray(root.patients)) {
    return [];
  }
  return root.patients.flatMap(function(item) {
    return resolvePatientImportPayloadsInner(item);
  });
}
function resolveRangeExport(root) {
  if (root.format !== RANGE_EXPORT_FORMAT || !Array.isArray(root.entries)) return [];
  const payloads = [];
  for (const entry of root.entries) {
    const normalized = entryToPatientExportPayload(
      /** @type {Record<string, unknown>} */
      entry
    );
    if (normalized) payloads.push(normalized);
  }
  return payloads;
}
function resolvePatientImportPayloadsInner(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap(function(item) {
      return resolvePatientImportPayloadsInner(item);
    });
  }
  if (typeof raw !== "object") return [];
  const root = (
    /** @type {Record<string, unknown>} */
    raw
  );
  if (isRPlusPatientExportPayload(root)) return [root];
  if (!root.format && root.patient) {
    const normalized = entryToPatientExportPayload(root);
    return normalized ? [normalized] : [];
  }
  const demo = resolveDemoBundle(root);
  if (demo.length) return demo;
  return resolveRangeExport(root);
}
function resolvePatientImportPayloads(raw) {
  return resolvePatientImportPayloadsInner(raw);
}

// public/js/patient-export-format.mjs
var PATIENT_EXPORT_FORMAT = "r-plus-patient-export";
var PATIENT_EXPORT_VERSION = 1;
var DEMO_BUNDLE_FORMAT = "r-plus-pitch-demo-bundle";
var RANGE_EXPORT_FORMAT2 = "r-plus-range-export";
function stripJsonBom(text) {
  const s = String(text == null ? "" : text);
  if (s.charCodeAt(0) === 65279) return s.slice(1);
  return s;
}
function entryToPatientExportPayload(entry) {
  if (!entry || typeof entry !== "object" || !entry.patient || typeof entry.patient !== "object") {
    return null;
  }
  if (Array.isArray(entry.patient)) return null;
  return {
    format: PATIENT_EXPORT_FORMAT,
    version: PATIENT_EXPORT_VERSION,
    exportedAt: typeof entry.exportedAt === "string" ? entry.exportedAt : (/* @__PURE__ */ new Date()).toISOString(),
    appVersion: entry.appVersion != null ? entry.appVersion : null,
    patient: entry.patient,
    note: entry.note != null ? entry.note : null,
    indicaciones: entry.indicaciones != null ? entry.indicaciones : null,
    labHistory: Array.isArray(entry.labHistory) ? entry.labHistory : [],
    medReceta: entry.medReceta != null ? entry.medReceta : null
  };
}
function isRPlusPatientExportPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const p = (
    /** @type {Record<string, unknown>} */
    payload
  );
  if (p.format !== PATIENT_EXPORT_FORMAT) return false;
  if (Number(p.version) !== PATIENT_EXPORT_VERSION) return false;
  if (!p.patient || typeof p.patient !== "object" || Array.isArray(p.patient)) return false;
  return true;
}
function parsePatientImportJsonText(text) {
  const trimmed = stripJsonBom(text).trim();
  const parsed = JSON.parse(trimmed);
  return { parsed, payloads: resolvePatientImportPayloads(parsed) };
}
function describePatientImportRejection(raw) {
  if (raw == null) {
    return "El archivo est\xE1 vac\xEDo o no es JSON.";
  }
  if (typeof raw !== "object") {
    return "El archivo no contiene un objeto JSON v\xE1lido.";
  }
  if (Array.isArray(raw)) {
    return "Es una lista JSON; usa un solo objeto de exportaci\xF3n o el bundle demo.";
  }
  const root = (
    /** @type {Record<string, unknown>} */
    raw
  );
  const format = String(root.format || "(sin format)");
  if (format === DEMO_BUNDLE_FORMAT) {
    const n = Array.isArray(root.patients) ? root.patients.length : 0;
    if (!n) return 'Bundle demo sin pacientes en el arreglo "patients".';
    return "Bundle demo: actualiza R+ (npm run build:ui) o usa demo-perez.json.";
  }
  if (format === "r-plus-backup") {
    return "Es un respaldo completo. Usa \xABImportar copia de seguridad\u2026\xBB, no \xABImportar paciente\u2026\xBB.";
  }
  if (format === "r-plus-purge-ghosts-backup") {
    return "Es un respaldo de fantasmas (formato anterior). Usa \xABImportar copia de seguridad\u2026\xBB.";
  }
  if (format === RANGE_EXPORT_FORMAT2) {
    return "Es export por rango: tambi\xE9n puedes usar \xABImportar paciente\u2026\xBB (versi\xF3n reciente) o \xABImportar rango\u2026\xBB.";
  }
  if (!root.format && root.patient) {
    return 'Tiene "patient" pero falta format; vuelve a generar con npm run export:demo-patients.';
  }
  return 'Se esperaba format "' + PATIENT_EXPORT_FORMAT + '" v' + PATIENT_EXPORT_VERSION + ' con patient; se encontr\xF3 "' + format + '".';
}

// public/js/features/platform/import-backup/backup-host-merge.mjs
var PURGE_GHOSTS_FORMAT = "r-plus-purge-ghosts-backup";
function collectHostBundleEntries(bundleEntriesByRoom) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const entries of Object.values(bundleEntriesByRoom || {})) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const pid = String(entry?.patient?.id || "").trim();
      if (!pid || pid.indexOf("demo-") === 0 || seen.has(pid)) continue;
      seen.add(pid);
      out.push(entry);
    }
  }
  return out;
}
function patientPresenceIndex(patients) {
  const byId = /* @__PURE__ */ new Set();
  const byRegistro = /* @__PURE__ */ new Set();
  for (const p of patients || []) {
    if (!p?.id) continue;
    byId.add(String(p.id));
    const reg = String(p.registro || "").trim();
    if (reg) byRegistro.add(reg);
  }
  return { byId, byRegistro };
}
function isPatientAlreadyPresent(patient, index) {
  const id = String(patient?.id || "").trim();
  const reg = String(patient?.registro || "").trim();
  if (id && index.byId.has(id)) return true;
  return !!(reg && index.byRegistro.has(reg));
}
function cloneObjectMap(value) {
  return value && typeof value === "object" ? { ...value } : {};
}
function cloneBackupDataMaps(data) {
  return {
    patients: Array.isArray(data.patients) ? data.patients.slice() : [],
    notes: cloneObjectMap(data.notes),
    indicaciones: cloneObjectMap(data.indicaciones),
    labHistory: cloneObjectMap(data.labHistory),
    medRecetaByPatient: cloneObjectMap(data.medRecetaByPatient),
    medPharmProfileByPatient: cloneObjectMap(data.medPharmProfileByPatient),
    listadoProblemas: cloneObjectMap(data.listadoProblemas),
    scheduledProcedures: Array.isArray(data.scheduledProcedures) ? data.scheduledProcedures.slice() : [],
    settings: cloneObjectMap(data.settings),
    medCatalog: cloneObjectMap(data.medCatalog)
  };
}
function mergeHostBundleEntriesIntoBackupData(data, bundleEntriesByRoom) {
  if (!data || typeof data !== "object") return data;
  const merged = cloneBackupDataMaps(data);
  const index = patientPresenceIndex(merged.patients);
  for (const entry of collectHostBundleEntries(bundleEntriesByRoom)) {
    const patient = entry.patient;
    if (!patient?.id || isPatientAlreadyPresent(patient, index)) continue;
    const pid = String(patient.id);
    merged.patients.push(patient);
    index.byId.add(pid);
    const reg = String(patient.registro || "").trim();
    if (reg) index.byRegistro.add(reg);
    if (entry.note) merged.notes[pid] = entry.note;
    if (entry.indicaciones) merged.indicaciones[pid] = entry.indicaciones;
    if (Array.isArray(entry.labHistory)) merged.labHistory[pid] = entry.labHistory;
    if (entry.medReceta) merged.medRecetaByPatient[pid] = entry.medReceta;
    if (entry.medPharmProfile) merged.medPharmProfileByPatient[pid] = entry.medPharmProfile;
    if (entry.listadoProblemas) merged.listadoProblemas[pid] = entry.listadoProblemas;
  }
  return merged;
}
function normalizeFullBackupImportPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.format === "r-plus-backup" && raw.version === 1 && raw.data) {
    return raw;
  }
  if (raw.format !== PURGE_GHOSTS_FORMAT || raw.version !== 1 || !raw.local) {
    return null;
  }
  const local = raw.local;
  if (local.format !== "r-plus-backup" || local.version !== 1 || !local.data) {
    return null;
  }
  const bundles = raw.host?.bundleEntriesByRoom || {};
  return {
    ...local,
    exportedAt: raw.exportedAt || local.exportedAt,
    data: mergeHostBundleEntriesIntoBackupData(local.data, bundles)
  };
}

// public/js/features/platform/import-backup/import-handlers.mjs
var rt23 = getPlatformRuntime();
function triggerImportRangeBackup() {
  var input = document.getElementById("range-backup-file-input");
  if (input) input.click();
}
function onRangeBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var payload = JSON.parse(reader.result);
      if (!payload || payload.format !== "r-plus-range-export" || payload.version !== 1 || !Array.isArray(payload.entries)) {
        rt23.showToast("Archivo de rango inv\xE1lido.", "error");
        return;
      }
      if (typeof pushUndoSnapshot === "function") rt23.pushUndoSnapshot("Importar rango (" + payload.entries.length + ")");
      var res = importEntriesWithConflicts(payload.entries, "range-import");
      if (res.cancelled) {
        rt23.showToast("Importaci\xF3n cancelada", "error");
      } else {
        rt23.showToast("Rango importado: " + (res.imported + res.overwritten + res.duplicated), "success");
      }
    } catch {
      rt23.showToast("No se pudo leer el archivo de rango.", "error");
      addAuditEntry("range-import", "error", 0, "read-error");
    }
  };
  reader.readAsText(f);
}
function triggerImportBackup() {
  document.getElementById("backup-file-input").click();
}
function triggerImportActivePatientBackup() {
  var input = document.getElementById("patient-backup-file-input");
  if (input) input.click();
}
function onPatientBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var result = parsePatientImportJsonText(reader.result);
      var parsed = result.parsed;
      var payloads = result.payloads;
      if (!payloads.length) {
        rt23.showToast(
          "El archivo no es una exportaci\xF3n v\xE1lida de paciente. " + describePatientImportRejection(parsed),
          "error"
        );
        return;
      }
      importPatientExportPayloads(payloads, f.name + ":");
    } catch {
      rt23.showToast("No se pudo leer la exportaci\xF3n de paciente.", "error");
      addAuditEntry("backup-patient-import", "error", 0, "read-error");
    }
  };
  reader.readAsText(f);
}
async function importBundledDemoPatients() {
  var files = ["demo-perez.json"];
  var payloads = [];
  for (var i = 0; i < files.length; i += 1) {
    var name = files[i];
    try {
      var res = await fetch("demo-patients/" + name, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var result = parsePatientImportJsonText(await res.text());
      payloads = payloads.concat(result.payloads);
    } catch {
      rt23.showToast(
        "No se encontr\xF3 " + name + " en la app. Regenera con npm run export:demo-patients y npm run build:ui.",
        "error"
      );
      return;
    }
  }
  if (!payloads.length) {
    rt23.showToast("Los JSON demo no tienen formato de importaci\xF3n v\xE1lido.", "error");
    return;
  }
  importPatientExportPayloads(payloads, "bundled:");
}
function importBundledDemoPerez() {
  importBundledDemoPatients();
}
function buildFullBackupConfirmMsg(n) {
  var confirmMsg = "Esto reemplaza todos los pacientes y datos locales en esta computadora (" + n + " pacientes en el archivo). No se puede deshacer.";
  if (n === 0) {
    confirmMsg += "\n\nEl archivo no trae pacientes (solo ajustes/plantillas). Si esperabas pacientes, pide un respaldo nuevo desde el equipo origen.";
  }
  return confirmMsg + "\n\n\xBFContinuar?";
}
function reportFullBackupImportError(err) {
  var code = err && err.message;
  if (code === "SAVE_FAILED" || code === "QUOTA_EXCEEDED") {
    rt23.showToast(
      "No se pudo guardar el respaldo: almacenamiento local lleno. Libera espacio e intenta de nuevo.",
      "error"
    );
  } else {
    rt23.showToast("No se pudo leer el respaldo", "error");
  }
  addAuditEntry("backup-full-import", "error", 0, code || "read-error");
}
async function processFullBackupFile(rawPayload) {
  const payload = normalizeFullBackupImportPayload(rawPayload);
  if (!payload) {
    rt23.showToast("El archivo no es un respaldo v\xE1lido de R+", "error");
    return;
  }
  var n = (payload.data.patients || []).length;
  if (!confirm(buildFullBackupConfirmMsg(n))) return;
  if (typeof pushUndoSnapshot === "function") rt23.pushUndoSnapshot("Importar respaldo completo");
  await persistClinicalState({ immediate: true });
  try {
    localStorage.setItem("rpc-preimport-backup", JSON.stringify(buildFullBackupPayload()));
  } catch (_e) {
    void _e;
  }
  await persistFullBackupPayload(payload);
  addAuditEntry("backup-full-import", "ok", n, "");
  rt23.showToast(
    "Respaldo importado (" + n + " paciente" + (n === 1 ? "" : "s") + "). Recargando\u2026",
    "success"
  );
  location.reload();
}
function onBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = async function() {
    try {
      await processFullBackupFile(JSON.parse(reader.result));
    } catch (err) {
      reportFullBackupImportError(err);
    }
  };
  reader.readAsText(f);
}

// public/js/features/platform/import-backup/sync-crypto.mjs
var rt24 = getPlatformRuntime();
function bytesToBase64(bytes) {
  var binary = "";
  for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBytes(base64) {
  var binary = atob(base64);
  var out = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
async function encryptSyncPayload(obj, passphrase) {
  if (!window.crypto || !window.crypto.subtle) throw new Error("WebCrypto no disponible");
  var enc = new TextEncoder();
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  var key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 12e4, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  var plain = enc.encode(JSON.stringify(obj));
  var encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    encrypted: true,
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 12e4,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  };
}
async function decryptSyncPayload(payload, passphrase) {
  if (!window.crypto || !window.crypto.subtle) throw new Error("WebCrypto no disponible");
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  var keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  var key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: base64ToBytes(payload.salt), iterations: payload.iterations || 12e4, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  var plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext)
  );
  return JSON.parse(dec.decode(plainBuffer));
}
function collectSyncEntries() {
  var entries = [];
  getPatients().forEach(function(p) {
    var entry = buildPatientEntry(p.id);
    if (entry) entries.push(entry);
  });
  return entries;
}
async function exportSyncBundlePrompt() {
  var entries = collectSyncEntries();
  if (!entries.length) {
    rt24.showToast("No hay datos para sincronizar.", "error");
    return;
  }
  var passphrase = prompt("Passphrase opcional para cifrar (deja vac\xEDo para sin cifrado):", "");
  var base = {
    format: "r-plus-sync-bundle",
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null
  };
  if (passphrase && String(passphrase).trim()) {
    try {
      base.payload = await encryptSyncPayload({ entries }, String(passphrase));
    } catch {
      rt24.showToast("No se pudo cifrar: WebCrypto no disponible.", "error");
      addAuditEntry("sync-export", "error", 0, "crypto-unavailable");
      return;
    }
  } else {
    base.payload = { encrypted: false, entries };
  }
  downloadJsonPayload(base, "R-plus-sync-" + formatDateSlug(/* @__PURE__ */ new Date()) + ".json");
  addAuditEntry("sync-export", "ok", entries.length, base.payload.encrypted ? "encrypted" : "plain");
  rt24.showToast("Paquete sync exportado", "success");
}
function triggerImportSyncBundle() {
  var input = document.getElementById("sync-bundle-file-input");
  if (input) input.click();
}
function onSyncBundleFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!f) return;
  var reader = new FileReader();
  reader.onload = async function() {
    try {
      var bundle = JSON.parse(reader.result);
      if (!bundle || bundle.format !== "r-plus-sync-bundle" || bundle.version !== 1 || !bundle.payload) {
        rt24.showToast("Paquete sync inv\xE1lido.", "error");
        return;
      }
      var data = bundle.payload;
      if (data.encrypted) {
        var passphrase = prompt("Este paquete est\xE1 cifrado. Ingresa la passphrase:", "");
        if (!passphrase) {
          rt24.showToast("Importaci\xF3n cancelada.", "error");
          addAuditEntry("sync-import", "cancelled", 0, "no-passphrase");
          return;
        }
        data = await decryptSyncPayload(data, passphrase);
      }
      if (!data || !Array.isArray(data.entries)) {
        rt24.showToast("Contenido sync inv\xE1lido.", "error");
        addAuditEntry("sync-import", "error", 0, "invalid-content");
        return;
      }
      if (typeof pushUndoSnapshot === "function") rt24.pushUndoSnapshot("Importar paquete sync (" + data.entries.length + ")");
      var res = importEntriesWithConflicts(data.entries, "sync-import");
      if (res.cancelled) rt24.showToast("Sync cancelado", "error");
      else rt24.showToast("Sync importado: " + (res.imported + res.overwritten + res.duplicated), "success");
    } catch {
      rt24.showToast("No se pudo importar el paquete sync.", "error");
      addAuditEntry("sync-import", "error", 0, "read-error");
    }
  };
  reader.readAsText(f);
}

// public/js/features/platform/import-backup/init.mjs
function initGoalGFeatures() {
  syncAutoBackupUi();
  maybeRunScheduledAutoBackup();
  restartAutoBackupScheduler();
  initUpdateChannelAndGate();
}

// public/js/censo-table-columns.mjs
var CENSO_COL_WEIGHTS = [
  { key: "num", title: "#", weight: 20 },
  { key: "cama", title: "Cama", weight: 22 },
  { key: "paciente", title: "Paciente", weight: 70 },
  { key: "dx", title: "Dx", weight: 54 },
  { key: "meds", title: "ATB / Meds", weight: 64 },
  { key: "labs", title: "Labs", weight: 138 },
  { key: "signos", title: "Signos", weight: 88 },
  { key: "io", title: "I / E / B", weight: 72 },
  { key: "accesos", title: "Accesos", weight: 28 },
  { key: "cultivos", title: "Cultivos", weight: 58 },
  { key: "pend", title: "Pend.", weight: 78 }
];
var CENSO_OPTIONAL_COL_KEYS = ["accesos", "cultivos", "pend"];
var OPTIONAL_FREED_WEIGHT_SHARE = {
  paciente: 0.35,
  labs: 0.45,
  signos: 0.12,
  dx: 0.08
};
function censoCellHasContent(value) {
  var s = String(value || "").replace(/\r/g, "").split("\n").map(function(l) {
    return l.trim();
  }).filter(Boolean).join(" ").trim();
  return !!s && s !== "\u2014";
}
function censoRowColumnText(row, key) {
  if (!row) return "";
  if (key === "pend") return String(row.pendientes || "").trim();
  if (key === "paciente") {
    return [row.pacienteNombre, row.pacienteMeta].filter(Boolean).join("\n");
  }
  if (key === "signos") return String(row.signosCol || row.signos || "").trim();
  if (key === "io") return String(row.ioCol || "").trim();
  var direct = row[key];
  if (direct) return String(direct).trim();
  var labelByKey = {
    dx: "Diagn\xF3sticos",
    meds: "ATB / Medicamentos",
    labs: "Laboratorios",
    accesos: "Accesos",
    cultivos: "Cultivos",
    pend: "Pendientes"
  };
  var label = labelByKey[key];
  if (!label) return "";
  var sec = (row.sections || []).find(function(s) {
    return s.label === label;
  });
  return sec ? sec.lines.join("\n").trim() : "";
}
function resolveCensoColWeights(rows) {
  var optionalHidden = {};
  CENSO_OPTIONAL_COL_KEYS.forEach(function(key) {
    optionalHidden[key] = !(rows || []).some(function(row) {
      return censoCellHasContent(censoRowColumnText(row, key));
    });
  });
  var freed = 0;
  var base = CENSO_COL_WEIGHTS.filter(function(col) {
    if (optionalHidden[col.key]) {
      freed += col.weight;
      return false;
    }
    return true;
  });
  if (!freed) return base.slice();
  var recipientSum = Object.keys(OPTIONAL_FREED_WEIGHT_SHARE).reduce(function(s, key) {
    return base.some(function(col) {
      return col.key === key;
    }) ? s + OPTIONAL_FREED_WEIGHT_SHARE[key] : s;
  }, 0);
  return base.map(function(col) {
    var share = OPTIONAL_FREED_WEIGHT_SHARE[col.key];
    if (!share || !recipientSum) return { key: col.key, title: col.title, weight: col.weight };
    var extra = Math.round(freed * share / recipientSum);
    return { key: col.key, title: col.title, weight: col.weight + extra };
  });
}
function censoColumnPercents(weights) {
  var source = weights && weights.length ? weights : CENSO_COL_WEIGHTS;
  var sum = source.reduce(function(s, c) {
    return s + c.weight;
  }, 0);
  var cols = source.map(function(c) {
    return {
      key: c.key,
      title: c.title,
      pct: c.weight / sum * 100
    };
  });
  var total = cols.reduce(function(s, c) {
    return s + c.pct;
  }, 0);
  var drift = 100 - total;
  if (drift !== 0) cols[cols.length - 1].pct += drift;
  return cols;
}
function censoColClass(key) {
  if (key === "paciente") return "pac";
  if (key === "meds") return "med";
  if (key === "labs") return "lab";
  return key;
}
function censoColgroupCssRules(weights) {
  return censoColumnPercents(weights).map(function(c) {
    return "col." + censoColClass(c.key) + "{width:" + c.pct.toFixed(3) + "%}";
  }).join("");
}
function censoColgroupHtml(weights) {
  return censoColumnPercents(weights).map(function(c) {
    return '<col class="' + censoColClass(c.key) + '">';
  }).join("");
}
function censoTheadRowHtml(weights) {
  return censoColumnPercents(weights).map(function(c) {
    var bold = c.key === "dx" || c.key === "cama" ? " censo-bold" : "";
    return '<th class="censo-th' + bold + '">' + c.title + "</th>";
  }).join("");
}

// public/js/censo-preview-html-render.mjs
function censoLineClass(role) {
  if (role === "muted") return "censo-line censo-line--muted";
  if (role === "emphasis") return "censo-line censo-line--emphasis";
  if (role === "lab-date") return "censo-line censo-line--lab-date";
  if (role === "lab-panel") return "censo-line censo-line--lab-panel";
  if (role === "label-led") return "censo-line censo-line--label-led";
  return "censo-line";
}
function renderCensoLines(text, colKey) {
  var raw = String(text || "").trim();
  if (!raw) {
    if (colKey === "accesos" || colKey === "cultivos" || colKey === "pendientes") return "";
    return '<span class="censo-line censo-line--empty">\u2014</span>';
  }
  return raw.split("\n").map(function(l) {
    return l.trim();
  }).filter(Boolean).map(function(l, i) {
    var role = classifyCensoTableLine(l, colKey, i);
    return '<span class="' + censoLineClass(role) + '">' + escHtml(l) + "</span>";
  }).join("");
}
function renderCensoPacienteCell(row) {
  var lines = [String(row.pacienteNombre || "\u2014").trim() || "\u2014"];
  String(row.pacienteMeta || "").split("\n").map(function(l) {
    return l.trim();
  }).filter(Boolean).forEach(function(l) {
    lines.push(l);
  });
  return lines.map(function(l, i) {
    var role = classifyCensoTableLine(l, "paciente", i);
    var cls = censoLineClass(role);
    if (i === 0) cls += " censo-paciente-nombre";
    return '<span class="' + cls + '">' + escHtml(l) + "</span>";
  }).join("");
}
function renderCensoCamaCell(camaText) {
  var label = formatCamaCellLabel(parseCamaCellForCenso(camaText));
  if (label === "\u2014") return "\u2014";
  return '<span class="censo-cama-vline">' + escHtml(label) + "</span>";
}
function renderCensoSectionCell(row, key, fallbackLabel) {
  var v = row[key];
  if (v) return renderCensoLines(v, key);
  var sec = (row.sections || []).find(function(s) {
    return s.label === fallbackLabel;
  });
  if (!sec) {
    if (key === "accesos" || key === "cultivos" || key === "pendientes") return "";
    return '<span class="censo-line censo-line--empty">\u2014</span>';
  }
  return renderCensoLines(sec.lines.join("\n"), key);
}
function renderCensoColMultiline(row, key) {
  var v = String(row[key] || "").trim();
  if (!v) return "";
  return renderCensoLines(v, key);
}
function censoPreviewCellClass(key) {
  if (key === "paciente") return "censo-paciente";
  if (key === "dx") return "censo-dx";
  if (key === "meds") return "censo-meds";
  if (key === "labs") return "censo-labs";
  if (key === "signos") return "censo-signos";
  if (key === "io") return "censo-io";
  if (key === "accesos") return "censo-acc";
  if (key === "cultivos") return "censo-cult";
  if (key === "pend") return "censo-pend";
  if (key === "num") return "censo-num";
  if (key === "cama") return "censo-cama";
  return key;
}
function renderCensoPreviewCell(row, key) {
  if (key === "num") {
    return '<td class="censo-data-cell censo-center censo-bold censo-num"><span class="censo-num-val">' + escHtml(row.num) + "</span></td>";
  }
  if (key === "cama") {
    return '<td class="censo-data-cell censo-center censo-bold censo-cama">' + renderCensoCamaCell(row.cama) + "</td>";
  }
  if (key === "paciente") {
    return '<td class="censo-data-cell censo-center censo-paciente">' + renderCensoPacienteCell(row) + "</td>";
  }
  if (key === "dx") {
    return '<td class="censo-data-cell censo-center censo-dx">' + renderCensoSectionCell(row, "dx", "Diagn\xF3sticos") + "</td>";
  }
  if (key === "meds") {
    return '<td class="censo-data-cell censo-center censo-meds">' + renderCensoSectionCell(row, "meds", "ATB / Medicamentos") + "</td>";
  }
  if (key === "labs") {
    return '<td class="censo-data-cell censo-labs">' + renderCensoSectionCell(row, "labs", "Laboratorios") + "</td>";
  }
  if (key === "signos") {
    return '<td class="censo-data-cell censo-signos">' + renderCensoColMultiline(row, "signosCol") + "</td>";
  }
  if (key === "io") {
    return '<td class="censo-data-cell censo-io">' + renderCensoColMultiline(row, "ioCol") + "</td>";
  }
  if (key === "accesos") {
    return '<td class="censo-data-cell censo-acc">' + renderCensoSectionCell(row, "accesos", "Accesos") + "</td>";
  }
  if (key === "cultivos") {
    return '<td class="censo-data-cell censo-cult">' + renderCensoSectionCell(row, "cultivos", "Cultivos") + "</td>";
  }
  if (key === "pend") {
    return '<td class="censo-data-cell censo-pend">' + renderCensoSectionCell(row, "pendientes", "Pendientes") + "</td>";
  }
  return '<td class="censo-data-cell ' + censoPreviewCellClass(key) + '"></td>';
}
function buildCensoPreviewBodyHtml(rows, weights) {
  var cols = resolveCensoColWeights(rows || []);
  if (weights && weights.length) cols = weights;
  return (rows || []).map(function(row, idx) {
    return '<tr class="' + (idx % 2 ? "alt" : "") + '">' + cols.map(function(col) {
      return renderCensoPreviewCell(row, col.key);
    }).join("") + "</tr>";
  }).join("");
}
var CENSO_PREVIEW_STYLES = '@page{size:legal landscape;margin:10mm}body{font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:10px;line-height:1.35;color:#1a2332;margin:0;padding:12px 14px;background:#fff}h1{margin:0 0 2px;font-size:15px;font-weight:700;letter-spacing:-0.01em}.sub{color:#5c6778;font-size:8.5px;margin-bottom:10px;line-height:1.4}.mes{text-align:center;font-weight:700;color:var(--color-accent);font-size:11px;margin:-24px 0 10px;letter-spacing:0.04em}table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #d4dae3;padding:5px 6px;word-wrap:break-word;overflow-wrap:anywhere}th.censo-th{background:#eef1f6;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-ink-muted);vertical-align:middle;text-align:center;white-space:nowrap;line-height:1.2;padding:6px 4px}th.censo-th.censo-bold{font-weight:800}tbody td.censo-data-cell{vertical-align:middle}tr.alt td{background:#f7f8fb}.censo-line{display:block;line-height:1.28;margin:0}.censo-line + .censo-line{margin-top:1px}.censo-line--empty{color:#9aa3b2;font-weight:400}td.censo-center .censo-line{text-align:center;margin-left:auto;margin-right:auto}.censo-line--muted{color:#5c6778;font-size:8px;font-weight:400}.censo-line--emphasis{font-weight:700;color:#1a2332}.censo-line--lab-date{font-weight:700;color:var(--color-accent);font-size:8px;margin-bottom:2px}.censo-line--lab-panel{font-weight:600;font-size:7.5px;font-family:"IBM Plex Mono",ui-monospace,monospace;letter-spacing:-0.01em}.censo-line--label-led{font-size:8px;font-weight:600}td.censo-labs .censo-line{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:7.5px;line-height:1.28}td.censo-signos,td.censo-io,td.censo-pend,td.censo-acc,td.censo-cult{font-size:8px;text-align:left}td.censo-paciente,td.censo-dx,td.censo-meds{text-align:center}td.censo-paciente{font-size:8.5px}td.censo-dx{font-weight:700;font-size:8px;line-height:1.25}td.censo-meds{font-size:7.5px;line-height:1.28}td.censo-acc,td.censo-cult{font-size:8px}.censo-center{text-align:center;vertical-align:middle}.censo-bold{font-weight:700}td.censo-num,td.censo-cama{padding:4px 2px;text-align:center;vertical-align:middle}td.censo-num .censo-num-val{color:var(--color-accent);font-weight:700}td.censo-cama .censo-cama-vline{display:block;margin:0 auto}.censo-cama-vline{font-weight:700;font-size:9px;color:var(--color-accent);writing-mode:vertical-rl;text-orientation:mixed;line-height:1;white-space:nowrap}.censo-paciente-nombre,.censo-line--emphasis.censo-paciente-nombre{font-weight:700;color:#1a2332}';
function buildCensoPreviewStyles(weights) {
  return CENSO_PREVIEW_STYLES + censoColgroupCssRules(weights);
}
function buildCensoPreviewDocumentHtml(header, bodyHtml, rows) {
  var weights = resolveCensoColWeights(rows || []);
  var titleLine = header.titleLine || "Censo de Sala";
  var equipoLine = header.equipoLine || "";
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Censo ' + escHtml(header.fecha) + "</title><style>" + buildCensoPreviewStyles(weights) + "</style></head><body><h1>" + escHtml(titleLine) + "</h1>" + (header.mes ? '<div class="mes">' + escHtml(header.mes) + "</div>" : "") + '<div class="sub">' + (equipoLine ? escHtml(equipoLine) : "") + (equipoLine && header.fecha ? " \xB7 " : "") + (header.fecha ? escHtml(header.fecha) : "") + "</div><table><colgroup>" + censoColgroupHtml(weights) + "</colgroup><thead><tr>" + censoTheadRowHtml(weights) + "</tr></thead><tbody>" + bodyHtml + "</tbody></table></body></html>";
}

// public/js/censo-preview-html.mjs
function renderCensoPreviewHtml(payload) {
  var header = payload.header || {};
  var rows = payload.rows || [];
  return buildCensoPreviewDocumentHtml(header, buildCensoPreviewBodyHtml(rows), rows);
}
function ensureCensoPreviewModal() {
  var existing = document.getElementById("censo-preview-backdrop");
  if (existing) return existing;
  var backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop censo-preview-backdrop";
  backdrop.id = "censo-preview-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.innerHTML = '<div class="modal censo-preview-modal" role="dialog" aria-modal="true" aria-labelledby="censo-preview-title"><div class="censo-preview-modal-head"><h3 id="censo-preview-title" class="modal-title">Vista previa del censo</h3><p class="profile-hint censo-preview-hint">As\xED se ver\xE1 el PDF. Usa Imprimir para guardar como PDF desde el sistema.</p></div><iframe id="censo-preview-frame" class="censo-preview-frame" title="Vista previa del censo"></iframe><div class="modal-actions"><button type="button" class="btn-med-secondary" id="censo-preview-close">Cerrar</button><button type="button" class="btn-generate" id="censo-preview-print">Imprimir</button></div></div>';
  document.body.appendChild(backdrop);
  if (!ensureCensoPreviewModal._wired) {
    ensureCensoPreviewModal._wired = true;
    backdrop.addEventListener("click", function(e) {
      if (e.target === backdrop) closeCensoPreviewModal();
    });
    document.getElementById("censo-preview-close")?.addEventListener("click", closeCensoPreviewModal);
    document.getElementById("censo-preview-print")?.addEventListener("click", function() {
      var frame = document.getElementById("censo-preview-frame");
      try {
        frame?.contentWindow?.print();
      } catch {
      }
    });
    document.addEventListener("keydown", function(e) {
      if (e.key !== "Escape") return;
      var el = document.getElementById("censo-preview-backdrop");
      if (el?.classList.contains("open")) closeCensoPreviewModal();
    });
  }
  return backdrop;
}
function closeCensoPreviewModal() {
  var backdrop = document.getElementById("censo-preview-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("censo-preview-open");
  var frame = document.getElementById("censo-preview-frame");
  if (frame) frame.removeAttribute("srcdoc");
}
function openCensoPreviewInApp(payload) {
  var html = renderCensoPreviewHtml(payload);
  var backdrop = ensureCensoPreviewModal();
  var frame = document.getElementById("censo-preview-frame");
  if (!frame) return false;
  frame.srcdoc = html;
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("censo-preview-open");
  return true;
}

// public/js/censo-export.mjs
var rt25 = {
  getSettings() {
    return {};
  },
  showToast() {
  },
  requestDocumentJson() {
    return Promise.resolve(null);
  },
  handleDocumentGenerateResponse() {
    return Promise.resolve(null);
  },
  incrementPendingJobs() {
  },
  decrementPendingJobs() {
  },
  syncOfflineButtonStates() {
  },
  guardMobileDocExport() {
    return false;
  },
  isRpcOffline() {
    return false;
  }
};
function registerCensoRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt25, ctx);
}
var CENSO_EXPORT_BUTTON_IDS = [
  "btn-export-censo-header",
  "btn-export-censo-sidebar",
  "btn-export-censo-settings",
  "btn-export-censo"
];
function syncCensoExportButtonVisibility() {
  var show = isModeSala(rt25.getSettings()) && !isMobileWeb();
  CENSO_EXPORT_BUTTON_IDS.forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    if (id === "btn-export-censo-settings") return;
    if (!show) {
      btn.style.display = "none";
      return;
    }
    btn.style.display = id === "btn-export-censo-header" ? "inline-flex" : "";
  });
  var settingsRow = document.getElementById("btn-export-censo-settings-row");
  if (settingsRow) settingsRow.style.display = show ? "" : "none";
  var wrap = document.getElementById("sidebar-censo-export-wrap");
  if (wrap) wrap.style.display = show ? "" : "none";
}
function censoExportLoadingButtons() {
  ensureCensoModal();
  var confirm2 = document.getElementById("censo-export-confirm");
  return confirm2 ? [confirm2] : [];
}
function buildTodosMap() {
  var map = /* @__PURE__ */ Object.create(null);
  getPatients().forEach(function(p) {
    if (!p || !p.id) return;
    map[p.id] = storage.getTodos(p.id);
  });
  return map;
}
function preparePatientsForCensus() {
  getPatients().forEach(function(p) {
    if (!p) return;
    migratePatientDiagnosticosFromVpo(p, getVpoByPatient()[p.id]);
  });
  persistClinicalState();
}
function patientsForCensoExport() {
  if (typeof rt25.getCensusPatients === "function") {
    return rt25.getCensusPatients();
  }
  return getPatients();
}
function ensureCensoModal() {
  var existing = document.getElementById("censo-export-modal");
  if (existing) return existing;
  var backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "censo-export-modal";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="censo-export-title"><h3 id="censo-export-title" class="modal-title">Exportar censo (PDF)</h3><p class="profile-hint" id="censo-export-fecha-label"></p><p class="profile-hint" id="censo-export-mes-label"></p><p class="profile-hint">Diagn\xF3sticos: m\xE1x. 3 primeros \xB7 filas seg\xFAn contenido (labs largos \u2192 m\xE1s altura).</p><label class="profile-radio" style="display:flex;gap:8px;margin:12px 0;"><input type="checkbox" id="censo-export-archived"> Incluir pacientes archivados</label><div class="modal-actions"><button type="button" class="btn-med-secondary" id="censo-export-cancel">Cancelar</button><button type="button" class="btn-med-secondary" id="censo-export-preview">Vista previa</button><button type="button" class="btn-generate" id="censo-export-confirm">Generar PDF</button></div></div>';
  document.body.appendChild(backdrop);
  return backdrop;
}
function openCensoExportDialog() {
  if (!isModeSala(rt25.getSettings())) return;
  if (rt25.guardMobileDocExport()) return;
  var modal = ensureCensoModal();
  var now = /* @__PURE__ */ new Date();
  var fechaEl = document.getElementById("censo-export-fecha-label");
  var mesEl = document.getElementById("censo-export-mes-label");
  if (fechaEl) {
    fechaEl.textContent = "Fecha: " + String(now.getDate()).padStart(2, "0") + "/" + String(now.getMonth() + 1).padStart(2, "0") + "/" + now.getFullYear();
  }
  if (mesEl) {
    mesEl.textContent = "Mes: " + now.toLocaleString("es-MX", { month: "long" }).toUpperCase() + " " + now.getFullYear();
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closeCensoModal() {
  var modal = document.getElementById("censo-export-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}
function exportCensoPdf(includeArchived) {
  if (!isModeSala(rt25.getSettings())) return;
  if (rt25.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt25.isRpcOffline, showToast: rt25.showToast })) return;
  preparePatientsForCensus();
  var censusPatients = patientsForCensoExport();
  var payload = buildCensusPayload({
    settings: rt25.getSettings(),
    patients: censusPatients,
    includeArchived: !!includeArchived,
    labHistoryByPatient: getLabHistory(),
    medRecetaByPatient: getMedRecetaByPatient(),
    todosByPatient: buildTodosMap()
  });
  if (!payload.rows.length) {
    rt25.showToast("Sin pacientes para el censo", "error");
    return;
  }
  var exportBtns = censoExportLoadingButtons();
  exportBtns.forEach(function(btn) {
    setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Exportando\u2026" });
  });
  rt25.incrementPendingJobs();
  function buildBody() {
    return {
      header: payload.header,
      rows: payload.rows,
      servicio: payload.servicio
    };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
      return Promise.resolve(void 0);
    }
    return window.electronAPI.selectOutputDir();
  }
  return exportWithOutputDirFallback({
    url: "/generate-censo",
    buildPayload: buildBody,
    defaultFileName: "Censo.pdf",
    selectOutputDir,
    saveOutputDir: function(dir) {
      saveOutputDirSelection(dir, {
        getSettings: rt25.getSettings,
        loadSettings: rt25.loadSettings
      });
    },
    onSuccess: function(data) {
      var name = data && (data.fileName || data.path) ? data.fileName || String(data.path).split(/[/\\]/).pop() : "PDF";
      rt25.showToast("Censo guardado: " + name, "success");
    },
    onPrompt: function() {
      rt25.showToast("Selecciona una carpeta para guardar el PDF.", "error");
    },
    onCancel: function() {
      rt25.showToast("No se guard\xF3 el PDF: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(message) {
      rt25.showToast("Error: " + message, "error");
    }
  }).catch(function() {
    rt25.showToast("Error de conexi\xF3n al generar el censo", "error");
  }).finally(function() {
    exportBtns.forEach(function(btn) {
      setAsyncButtonLoading(btn, false);
    });
    rt25.decrementPendingJobs();
    if (typeof rt25.syncOfflineButtonStates === "function") rt25.syncOfflineButtonStates();
  });
}
function exportCensoPdfFromHelp() {
  openCensoExportDialog();
}
function previewCenso(includeArchived) {
  if (!isModeSala(rt25.getSettings())) return;
  preparePatientsForCensus();
  var censusPatients = patientsForCensoExport();
  var payload = buildCensusPayload({
    settings: rt25.getSettings(),
    patients: censusPatients,
    includeArchived: !!includeArchived,
    labHistoryByPatient: getLabHistory(),
    medRecetaByPatient: getMedRecetaByPatient(),
    todosByPatient: buildTodosMap()
  });
  if (!payload.rows.length) {
    rt25.showToast("Sin pacientes para el censo", "error");
    return;
  }
  openCensoPreviewInApp(payload);
}
function wireCensoModalOnce() {
  if (wireCensoModalOnce._done) return;
  wireCensoModalOnce._done = true;
  document.addEventListener("click", function(e) {
    if (e.target.id === "censo-export-cancel") {
      closeCensoModal();
      return;
    }
    if (e.target.id === "censo-export-preview") {
      var archivedPreview = !!document.getElementById("censo-export-archived")?.checked;
      previewCenso(archivedPreview);
      return;
    }
    if (e.target.id === "censo-export-confirm") {
      var archived = !!document.getElementById("censo-export-archived")?.checked;
      closeCensoModal();
      exportCensoPdf(archived);
      return;
    }
    var modal = document.getElementById("censo-export-modal");
    if (modal && e.target === modal) closeCensoModal();
  });
}
if (typeof document !== "undefined") {
  wireCensoModalOnce();
}

// public/js/features/profile-prefs.mjs
function syncHideManejoSectionUI() {
  var row = document.getElementById("settings-hide-manejo-section")?.closest("label") || document.getElementById("settings-hide-clinico-tab")?.closest("label");
  if (row) row.style.display = "none";
}
function syncHideClinicoTabUI() {
  syncHideManejoSectionUI();
}
function ensureClinicoTabConsistency() {
  var settings = settingsRef();
  var current = getActiveInnerTab();
  if (!current) return;
  var migrated = migrateGranularInner(current, settings);
  if (migrated !== current) switchInnerTab(migrated);
}
function setHideManejoSection(_enabled) {
  syncHideManejoSectionUI();
}
function setHideClinicoTab(enabled) {
  setHideManejoSection(enabled);
}
function isHideListadoProblemasAiPromptEnabled() {
  var st = settingsRef();
  if (!st || st.hideListadoProblemasAiPrompt === void 0) return true;
  return !!st.hideListadoProblemasAiPrompt;
}
function syncHideListadoProblemasAiPromptUI() {
  var cb = document.getElementById("settings-hide-listado-ai-prompt");
  if (cb) cb.checked = isHideListadoProblemasAiPromptEnabled();
}
function setHideListadoProblemasAiPrompt(enabled) {
  var st = settingsRef();
  st.hideListadoProblemasAiPrompt = !!enabled;
  persistSettingsToLocalStorage();
  syncHideListadoProblemasAiPromptUI();
  renderListadoForm();
  getProfileRuntime().showToast(
    enabled ? "Bot\xF3n \xABCopiar prompt IA\xBB oculto en listado de problemas." : "Bot\xF3n \xABCopiar prompt IA\xBB visible en listado de problemas.",
    "success"
  );
}

// public/js/features/profile-load-sync.mjs
function syncProfileModalLayout() {
  var st = settingsRef();
  var sala = isModeSala(st);
  var salida = document.getElementById("profile-salida-section");
  var bridge = document.getElementById("profile-clinical-bridge");
  var servicioWrap = document.getElementById("profile-default-servicio-wrap");
  if (salida) salida.hidden = !sala;
  if (bridge) bridge.hidden = !isDbMode();
  if (servicioWrap) servicioWrap.hidden = !sala;
}
function syncProfileLoadedSections(full) {
  syncFontZoomButtons();
  syncHighContrastButtons();
  syncUiDensityButtons();
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  syncHideClinicoTabUI();
  syncHideListadoProblemasAiPromptUI();
  ensureClinicoTabConsistency();
  if (typeof syncSettingsLanHostDiskSection === "function") syncSettingsLanHostDiskSection();
  syncAppModeRadioControls();
  syncCensoExportButtonVisibility();
  syncClinicalRotationEntryChrome();
  syncProfileModalLayout();
  if (full) {
    syncHardwareAccelerationUI();
    syncIdleLockSelectUi();
    syncDbSecuritySectionUi();
    syncPreimportBackupUi();
  }
  getProfileRuntime().syncWorkContextChrome();
}

// public/js/features/profile-load.mjs
function loadSettings() {
  var snapshot = buildLoadSettingsSnapshot();
  var snapshotUnchanged = getLastLoadSettingsSnapshot() !== null && getLastLoadSettingsSnapshot() === snapshot;
  setLastLoadSettingsSnapshot(snapshot);
  if (snapshotUnchanged) {
    syncProfileLoadedSections(false);
    return;
  }
  var st = settingsRef();
  populateProfileIdentityFields(st);
  populateProfileOutputFields(st);
  populateProfileVersionBlock();
  populateProfileUserDataBlock();
  syncProfileLoadedSections(true);
}

// public/js/features/profile-modal.mjs
function openProfileModal() {
  if (isMobileWeb()) return;
  var modal = document.getElementById("profile-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  queueMicrotask(function() {
    loadSettings();
    var first = document.getElementById("app-mode-sala") || document.getElementById("profile-doctor");
    if (first) {
      try {
        first.focus({ preventScroll: true });
      } catch {
      }
    }
  });
}
function closeProfileModal() {
  closeModalAnimated(document.getElementById("profile-modal"));
}
function toggleProfileSection() {
  var modal = document.getElementById("profile-modal");
  if (!modal) return;
  if (modal.classList.contains("open")) closeProfileModal();
  else openProfileModal();
}
function syncProfileSectionVisibility() {
}
function openProfileFromHeader(ev) {
  if (ev) ev.preventDefault();
  openProfileModal();
}

// public/js/features/profile-app-mode.mjs
function reconcileActiveInnerForAppMode(nowSala) {
  var settings = settingsRef();
  var current = getActiveInnerTab() || "todo";
  var migrated = migrateGranularInner(current, settings);
  if (migrated !== current) {
    switchInnerTab(migrated, { forceRender: true });
    return;
  }
  if (nowSala && (current === "notas" || current === "indica")) {
    switchInnerTab("estadoActual", { forceRender: true });
  } else if (!nowSala && current === "listado") {
    switchInnerTab("recetaHu", { forceRender: true });
  }
}
function applyAppModeSwitchEffects() {
  var nowSala = isModeSala(settingsRef());
  try {
    reconcileActiveInnerForAppMode(nowSala);
    syncAppModeRadioControls();
    refreshExpedienteForAppModeChange();
    renderEstadoActualButton();
    syncCensoExportButtonVisibility();
    syncHeaderModeSeg();
    var rt26 = getProfileRuntime();
    if (rt26.getActiveId()) {
      if (typeof rt26.rebuildEstudiosFromLabHistory === "function") {
        rt26.rebuildEstudiosFromLabHistory(rt26.getActiveId());
      }
      if (!nowSala) renderNoteForm();
      var inner = getActiveInnerTab();
      if (inner === "datos" || inner === "todo") renderPatientDataPane();
    }
    rt26.syncWorkContextChrome();
    renderPatientList();
    if (isPaseMode()) renderRoundOverviewPanels();
    rt26.showToast("Modo cambiado a " + (nowSala ? "Sala" : "Interconsulta"), "success");
  } catch (err) {
    console.error("[R+] applyAppModeSwitchEffects:", err);
    getProfileRuntime().showToast("No se pudo actualizar la vista al cambiar de modo.", "error");
  }
}
function onAppModeChange() {
  var sala = document.getElementById("app-mode-sala");
  var st = settingsRef();
  st.appMode = sala && sala.checked ? "sala" : "interconsulta";
  invalidateLoadSettingsSnapshot();
  syncProfileModalLayout();
  persistSettingsToLocalStorage();
  applyAppModeSwitchEffects();
}
function toggleHeaderWorkMode() {
  var st = settingsRef();
  st.appMode = isModeSala(st) ? "interconsulta" : "sala";
  invalidateLoadSettingsSnapshot();
  syncAppModeRadioControls();
  applyAppModeSwitchEffects();
  persistSettingsToLocalStorage();
}
function setWorkModeFromHeader(mode) {
  var st = settingsRef();
  var current = isGuardiaMode() ? "guardia" : isPaseMode() ? "pase" : isModeSala(st) ? "sala" : "interconsulta";
  if (mode === current) {
    if (mode === "pase") {
      exitPaseModeFromHeader();
      collapseHeaderModeSeg();
      syncHeaderModeSeg();
      return;
    }
    toggleHeaderModeSegExpand();
    syncHeaderModeSeg();
    return;
  }
  if (mode === "guardia") {
    toggleGuardiaMode();
    collapseHeaderModeSeg();
    syncHeaderModeSeg();
    return;
  }
  if (mode === "pase") {
    if (isGuardiaMode()) toggleGuardiaMode();
    setUiDensity("pase");
    collapseHeaderModeSeg();
    syncHeaderModeSeg();
    return;
  }
  if (isGuardiaMode()) toggleGuardiaMode();
  else if (isPaseMode()) setUiDensity("normal");
  var wantSala = mode === "sala";
  if (wantSala !== isModeSala(st)) {
    st.appMode = wantSala ? "sala" : "interconsulta";
    invalidateLoadSettingsSnapshot();
    syncAppModeRadioControls();
    applyAppModeSwitchEffects();
    persistSettingsToLocalStorage();
  }
  collapseHeaderModeSeg();
  syncHeaderModeSeg();
}

// public/js/features/profile-save.mjs
function readProfileField(id) {
  return (document.getElementById(id)?.value || "").trim();
}
function applyProfileFormToSettings(st) {
  st.doctorName = readProfileField("profile-doctor");
  st.cedulaProfesional = readProfileField("profile-cedula");
  st.profesorName = readProfileField("profile-profesor");
  st.residenteR2 = readProfileField("profile-r2");
  st.residenteR1a = readProfileField("profile-r1a");
  st.residenteR1b = readProfileField("profile-r1b");
  st.residenteR1 = st.residenteR1a;
  st.censoSala = readProfileField("profile-censo-sala");
  st.censoTorre = st.censoSala === "torre" ? "Torre HU" : "";
  st.censoFimiLabel = readProfileField("profile-censo-fimi-label");
  st.profesorName = readProfileField("profile-maestro") || readProfileField("profile-profesor");
  st.grado = readProfileField("profile-grado");
  st.quickOutputFormat = normalizeQuickOutputFormat(st.quickOutputFormat);
}
function saveSettings() {
  var st = settingsRef();
  applyProfileFormToSettings(st);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var backfill = false;
  Object.keys(getNotes()).forEach(function(pid) {
    if (getNotes()[pid] && applyProfileToNoteIfEmpty(getNotes()[pid])) backfill = true;
  });
  if (backfill) persistClinicalState();
  loadSettings();
  if (getProfileRuntime().getActiveId()) renderNoteForm();
  getProfileRuntime().showToast("Perfil guardado \u2713", "success");
}
function saveQuickOutputFormat(format) {
  var st = settingsRef();
  st.quickOutputFormat = normalizeQuickOutputFormat(format);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  getProfileRuntime().showToast("Formato de salida r\xE1pida actualizado", "success");
}

// public/js/features/profile-formats.mjs
function ensureInterconsultaModeForFormats() {
  var st = settingsRef();
  if (!isModeSala(st)) return;
  st.appMode = "interconsulta";
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var modeSalaEl = document.getElementById("app-mode-sala");
  var modeInterEl = document.getElementById("app-mode-inter");
  if (modeInterEl) modeInterEl.checked = true;
  if (modeSalaEl) modeSalaEl.checked = false;
  renderInnerTabs();
  syncHeaderModeSeg();
  getProfileRuntime().syncWorkContextChrome();
}
function syncDraftFromFormatEditorDom() {
  var map = [
    ["fmt-default-nota-evolucion", "notaEvolucion"],
    ["fmt-default-nota-estudios", "notaEstudios"],
    ["fmt-default-ind-dieta", "dieta"],
    ["fmt-default-ind-cuidados", "cuidados"],
    ["fmt-default-ind-medicamentos", "medicamentos"],
    ["fmt-default-ind-estudios", "estudios"],
    ["fmt-default-ind-interconsultas", "interconsultas"]
  ];
  map.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) updateDefaultFormatField(pair[1], el.value);
  });
}
function scrollFormatsEditorIntoView() {
  requestAnimationFrame(function() {
    var root = getFormatsEditMode() === "indica" ? document.getElementById("indica-form") : document.getElementById("note-form");
    if (root) root.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
function openNoteFormatsFromProfile() {
  closeProfileModal();
  var st = settingsRef();
  ensureProfileTemplateDefaults(st);
  ensureInterconsultaModeForFormats();
  loadDraftFromSettings(st);
  setFormatsEditMode("nota");
  switchAppTab("nota");
  switchInnerTab("notas");
  renderNoteForm();
  scrollFormatsEditorIntoView();
}
function openIndicaFormatsFromProfile() {
  closeProfileModal();
  var st = settingsRef();
  ensureProfileTemplateDefaults(st);
  ensureInterconsultaModeForFormats();
  loadDraftFromSettings(st);
  setFormatsEditMode("indica");
  switchAppTab("nota");
  switchInnerTab("indica");
  renderIndicaForm();
  scrollFormatsEditorIntoView();
}
function openTemplatesModal() {
  openNoteFormatsFromProfile();
}
function closeTemplatesModal() {
  var m = document.getElementById("templates-modal");
  if (m) m.style.display = "none";
}
function saveTemplates() {
  saveDefaultFormatsFromEditor();
}
function saveDefaultFormatsFromEditor() {
  syncDraftFromFormatEditorDom();
  var st = settingsRef();
  applyDraftToSettings(st);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  getProfileRuntime().showToast("Formatos guardados \u2713", "success");
}
function exitFormatsEditor() {
  var was = getFormatsEditMode();
  clearFormatsEditMode();
  if (was === "nota") renderNoteForm();
  else if (was === "indica") renderIndicaForm();
}
function resetProfileTemplates() {
  var st = settingsRef();
  resetProfileTemplatesToBlank(st);
  resetDraftToBlank();
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  var mode = getFormatsEditMode();
  if (mode === "nota") renderNoteForm();
  else if (mode === "indica") renderIndicaForm();
  getProfileRuntime().showToast("Formatos restablecidos (plantillas en blanco)", "success");
}

// public/js/features/profile.mjs
function hydrateProfileSettings(st) {
  if (!st || typeof st !== "object") return st;
  ensureProfileTemplateDefaults(st);
  if (st.hideListadoProblemasAiPrompt === void 0) {
    st.hideListadoProblemasAiPrompt = true;
  }
  return st;
}
var profileWindowHandlers = {
  toggleProfileSection,
  openProfileFromHeader,
  openProfileModal,
  closeProfileModal,
  onAppModeChange,
  toggleHeaderWorkMode,
  setWorkModeFromHeader,
  saveQuickOutputFormat,
  setHideManejoSection,
  setHideClinicoTab,
  setHideListadoProblemasAiPrompt,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  openTemplatesModal,
  openNoteFormatsFromProfile,
  openIndicaFormatsFromProfile,
  saveDefaultFormatsFromEditor,
  exitFormatsEditor,
  updateDefaultFormatField,
  resetProfileTemplates,
  saveSettings,
  closeTemplatesModal,
  saveTemplates
};

// public/js/features/expediente/expediente-listado.mjs
var _listadoSortables = [];
function getMedicosForListado(lst) {
  var tpl = (rt4.getSettings() || {}).medicosPlantilla || {};
  var override = lst && lst.medicos || {};
  function pick(k) {
    return override[k] && override[k].trim() ? override[k] : tpl[k] || "";
  }
  return {
    profesor: pick("profesor"),
    r4: pick("r4"),
    r2: pick("r2"),
    r1a: pick("r1a"),
    r1b: pick("r1b")
  };
}
function updateListadoMedico(field, value) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  if (!lst.medicos) lst.medicos = {};
  lst.medicos[field] = value;
  persistClinicalState();
}
function _todayDDMMYYYY() {
  var d = /* @__PURE__ */ new Date();
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}
function _nowHHMM() {
  var d = /* @__PURE__ */ new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function ensureListadoForActive() {
  if (!aid()) return null;
  if (!getListadoProblemas()[aid()]) {
    getListadoProblemas()[aid()] = emptyListado(_todayDDMMYYYY(), _nowHHMM());
  }
  var l = getListadoProblemas()[aid()];
  if (!Array.isArray(l.activos)) l.activos = [];
  if (!Array.isArray(l.inactivos)) l.inactivos = [];
  return l;
}
function _autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 240) + "px";
}
function bindListadoTextareaPointerIsolation(root) {
  var scope = root || document;
  scope.querySelectorAll(".listado-row textarea").forEach(function(ta) {
    if (ta.dataset.listadoPointerBound === "1") return;
    ta.dataset.listadoPointerBound = "1";
    ["mousedown", "touchstart", "pointerdown"].forEach(function(type) {
      ta.addEventListener(type, function(e) {
        e.stopPropagation();
      });
    });
  });
}
function _renderListadoRow(seccion, p, idx) {
  return '<div class="listado-row" data-id="' + esc(p.id) + '" data-seccion="' + seccion + '"><div class="listado-num listado-drag-handle" title="Arrastra para reordenar" aria-label="Arrastrar para reordenar">' + (idx + 1) + '</div><input type="date" class="rpc-date-input" value="' + esc(p.fecha || "") + `" oninput="updateProblemaField('` + seccion + "','" + esc(p.id) + `','fecha',this.value)" aria-label="Fecha del problema"><textarea rows="1" placeholder="Descripci\xF3n del problema" oninput="updateProblemaField('` + seccion + "','" + esc(p.id) + `','descripcion',this.value); _autoGrowTextarea(this)" aria-label="Descripci\xF3n">` + esc(p.descripcion || "") + `</textarea><button class="btn-remove-listado" onclick="removeProblemaUI('` + seccion + "','" + esc(p.id) + `')" aria-label="Quitar problema" title="Quitar">\xD7</button></div>`;
}
function _renderListadoSeccion(seccion, label, lst) {
  var arr = lst[seccion] || [];
  var rows = arr.length ? arr.map(function(p, i) {
    return _renderListadoRow(seccion, p, i);
  }).join("") : '<div class="listado-empty">Sin problemas ' + label.toLowerCase() + ".</div>";
  return '<div class="listado-section"><div class="listado-section-header ' + seccion + '"><span>' + label + " (" + arr.length + ')</span></div><div class="listado-section-body listado-sort-zone" data-seccion-rows="' + seccion + '">' + rows + `</div><div class="listado-section-body" style="padding-top:0;"><button class="listado-add-row" onclick="addProblemaUI('` + seccion + `')">+ Agregar problema ` + label.toLowerCase() + "</button></div></div>";
}
function destroyListadoSortables() {
  _listadoSortables.forEach(function(s) {
    try {
      if (s && typeof s.destroy === "function") s.destroy();
    } catch (_e) {
      void _e;
    }
  });
  _listadoSortables = [];
}
function syncListadoOrderFromDom(seccion) {
  var lst = ensureListadoForActive();
  if (!lst || !seccion) return;
  var zone = document.querySelector(
    '#listado-form [data-seccion-rows="' + seccion + '"]'
  );
  if (!zone) return;
  var arr = (lst[seccion] || []).slice();
  var byId = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < arr.length; i++) byId[arr[i].id] = arr[i];
  var newArr = [];
  zone.querySelectorAll(".listado-row[data-id]").forEach(function(row) {
    var id = row.getAttribute("data-id");
    if (id && byId[id]) newArr.push(byId[id]);
  });
  if (!newArr.length || newArr.length !== arr.length) return;
  getListadoProblemas()[aid()] = Object.assign({}, lst, { [seccion]: newArr });
}
function refreshListadoRowNumbers(seccion) {
  var zone = document.querySelector(
    '#listado-form [data-seccion-rows="' + seccion + '"]'
  );
  if (!zone) return;
  zone.querySelectorAll(".listado-row").forEach(function(row, idx) {
    var num = row.querySelector(".listado-num");
    if (num) num.textContent = String(idx + 1);
  });
}
function mountListadoSortables() {
  destroyListadoSortables();
  var SortableCtor = typeof globalThis !== "undefined" ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== "function") return;
  var scrollRoot = document.getElementById("listado-form");
  document.querySelectorAll("#listado-form [data-seccion-rows]").forEach(function(zone) {
    var seccion = zone.getAttribute("data-seccion-rows");
    if (!seccion || !zone.querySelector(".listado-row")) return;
    var sortable = SortableCtor.create(zone, {
      animation: 200,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      draggable: ".listado-row",
      handle: ".listado-drag-handle",
      filter: "textarea, input, button, a[href], select",
      preventOnFilter: true,
      delay: 0,
      delayOnTouchOnly: true,
      direction: "vertical",
      forceFallback: true,
      fallbackClass: "listado-drag-hovercard",
      fallbackOnBody: true,
      fallbackTolerance: 4,
      swapThreshold: 0.65,
      invertedSwapThreshold: 0.58,
      scroll: scrollRoot || true,
      bubbleScroll: true,
      scrollSensitivity: 54,
      scrollSpeed: 9,
      onEnd: function(evt) {
        if (evt.oldIndex === evt.newIndex && evt.from === evt.to) return;
        syncListadoOrderFromDom(seccion);
        refreshListadoRowNumbers(seccion);
        persistClinicalState();
      }
    });
    _listadoSortables.push(sortable);
  });
}
function renderListadoForm() {
  var c = document.getElementById("listado-form");
  if (!c) return;
  destroyListadoSortables();
  if (!aid()) {
    c.innerHTML = "";
    return;
  }
  var patient = getPatients().find(function(p) {
    return p.id === aid();
  });
  if (!patient) {
    c.innerHTML = "";
    return;
  }
  var lst = ensureListadoForActive();
  c.innerHTML = '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:10px;align-items:end;"><div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" class="field-readonly" readonly></div><div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" class="field-readonly" readonly></div><div class="field-group"><label>Edad/Sexo</label><input type="text" value="' + esc(patient.edad) + " / " + esc(patient.sexo) + '" class="field-readonly" readonly></div><div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" class="field-readonly" readonly></div><div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" class="field-readonly" readonly></div></div></div></div><div class="card"><div class="card-header card-header--tone-slate"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora del Listado</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="field-group"><label>Fecha</label><input type="text" value="' + esc(lst.fecha) + `" placeholder="DD/MM/AAAA" oninput="updateListadoMeta('fecha',this.value)"></div><div class="field-group"><label>Hora</label><input type="text" value="` + esc(lst.hora) + `" placeholder="HH:MM" oninput="updateListadoMeta('hora',this.value)"></div></div></div></div>` + _renderListadoSeccion("activos", "Activos", lst) + _renderListadoSeccion("inactivos", "Inactivos", lst) + _renderListadoMedicosCard(lst) + '<div class="action-bar"><button type="button" class="btn-med-secondary rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-listado"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida r\xE1pida</button>' + (isHideListadoProblemasAiPromptEnabled() ? "" : '<button type="button" class="btn-med-secondary" onclick="copyListadoProblemasAiPrompt()" title="Copia el prompt para usar en un chat de IA"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copiar prompt IA</button>') + '<button type="button" class="btn-generate rpc-doc-export" onclick="generateListado()" id="btn-gen-listado"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Listado de Problemas (.docx)</button></div>';
  refreshRpcDateFields(c);
  c.querySelectorAll(".listado-row textarea").forEach(_autoGrowTextarea);
  bindListadoTextareaPointerIsolation(c);
  mountListadoSortables();
}
function updateListadoMeta(field, value) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  lst[field] = value;
  persistClinicalState();
}
function updateProblemaField(seccion, id, field, value) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  var arr = lst[seccion] || [];
  var p = arr.find(function(x) {
    return x.id === id;
  });
  if (!p) return;
  p[field] = value;
  persistClinicalState();
}
function addProblemaUI(seccion) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  getListadoProblemas()[aid()] = addProblema(lst, seccion, { fecha: "", descripcion: "" });
  persistClinicalState();
  renderListadoForm();
  setTimeout(function() {
    var rows = document.querySelectorAll('[data-seccion-rows="' + seccion + '"] .listado-row textarea');
    if (rows.length) rows[rows.length - 1].focus();
  }, 0);
}
function removeProblemaUI(seccion, id) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  getListadoProblemas()[aid()] = removeProblema(lst, seccion, id);
  persistClinicalState();
  renderListadoForm();
}
function _renderListadoMedicosCard(lst) {
  var meds = getMedicosForListado(lst);
  function row(key, label) {
    return '<div class="field-group"><label>' + label + '</label><input type="text" value="' + esc(meds[key] || "") + `" oninput="updateListadoMedico('` + key + `', this.value)"></div>`;
  }
  return '<div class="card"><div class="card-header card-header--tone-teal-md card-header-row"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>M\xE9dicos (firma)<span class="card-header-subhint">Pre-llena desde Mi Perfil. Edita aqu\xED para este paciente.</span></div><div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + row("profesor", "Profesor") + row("r4", "R4") + row("r2", "R2") + row("r1a", "R1 (1)") + row("r1b", "R1 (2)") + "</div></div>";
}
async function copyListadoProblemasAiPrompt() {
  var ok = await rt4.copyToClipboardSafe(LISTADO_PROBLEMAS_AI_PROMPT);
  rt4.showToast(ok ? "Prompt copiado al portapapeles \u2713" : "No se pudo copiar el prompt", ok ? "success" : "error");
}
function generateListado() {
  if (rt4.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt4.isRpcOffline, showToast: rt4.showToast })) return;
  if (!aid()) {
    rt4.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var patient = getPatients().find(function(p) {
    return p.id === aid();
  });
  if (!patient) return;
  var lst = ensureListadoForActive();
  if (!lst) return;
  var hasProblems = lst.activos && lst.activos.length || lst.inactivos && lst.inactivos.length;
  if (!hasProblems) {
    rt4.showToast("Agrega al menos un problema antes de generar.", "error");
    return;
  }
  var medicos = getMedicosForListado(lst);
  var btn = document.getElementById("btn-gen-listado");
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Generando\u2026" });
  rt4.incrementPendingJobs();
  function buildPayload() {
    return { patient, listado: lst, medicos };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) return Promise.resolve(void 0);
    return window.electronAPI.selectOutputDir();
  }
  function saveOutputDir(dir) {
    if (!dir) return;
    var st = rt4.getSettings() || {};
    st.outputDir = dir;
    localStorage.setItem("rpc-settings", JSON.stringify(st));
    syncApprovedOutputDir(dir);
  }
  exportWithOutputDirFallback({
    url: "/generate-listado",
    buildPayload,
    defaultFileName: "listado.docx",
    selectOutputDir,
    saveOutputDir,
    onSuccess: function(data) {
      var name = data && (data.fileName || data.path) ? data.fileName || String(data.path).split(/[/\\]/).pop() : "listado.docx";
      rt4.showToast("Listado guardado: " + name, "success");
    },
    onPrompt: function() {
      rt4.showToast("Selecciona una carpeta para guardar el documento.", "error");
    },
    onCancel: function() {
      rt4.showToast("No se guard\xF3 el documento: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(msg) {
      rt4.showToast("Error: " + msg, "error");
    }
  }).catch(function() {
    rt4.showToast("Error de conexi\xF3n", "error");
  }).finally(function() {
    setAsyncButtonLoading(document.getElementById("btn-gen-listado"), false);
    rt4.decrementPendingJobs();
    rt4.syncOfflineButtonStates();
  });
}

// public/js/patient-data-ingreso-ui.mjs
function buildPatientIngresoFechasHtml(patient, settings) {
  var fimiLabel = resolveCensoFimiLabel(settings || {});
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="field-group"><label>FIUX (urgencias)</label><input type="date" class="rpc-date-input" value="' + esc(accesoFechaToDateInputValue(patient.fiuxFecha)) + `" oninput="updatePatient('fiuxFecha',this.value)" aria-label="FIUX ingreso urgencias"></div><div class="field-group"><label>` + esc(fimiLabel) + ' (servicio)</label><input type="date" class="rpc-date-input" value="' + esc(accesoFechaToDateInputValue(patient.fimiFecha)) + `" oninput="updatePatient('fimiFecha',this.value)" aria-label="` + esc(fimiLabel) + ' ingreso servicio"></div></div>';
}

// public/js/features/expediente/expediente-datos.mjs
function buildPatientDemographicsFieldsHtml(patient) {
  return '<div style="display:flex;flex-direction:column;gap:10px;">' + buildPatientTeamAssignSectionHtml(patient) + buildPatientSalaFieldHtml(patient) + '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + `" oninput="updatePatient('nombre',this.value)" style="text-transform:uppercase;"></div><div style="display:grid;grid-template-columns:1fr 100px 60px;gap:10px;"><div class="field-group"><label>Registro</label><input type="text" value="` + esc(patient.registro) + `" oninput="updatePatient('registro',this.value)"></div><div class="field-group"><label>Edad</label><input type="text" value="` + esc(patient.edad) + `" oninput="updatePatient('edad',this.value)"></div><div class="field-group"><label>Sexo</label><select onchange="updatePatient('sexo',this.value)"><option value="M"` + (patient.sexo === "M" ? " selected" : "") + '>M</option><option value="F"' + (patient.sexo === "F" ? " selected" : "") + ">F</option></select></div></div>" + buildPatientIngresoFechasHtml(patient, rt4.getSettings()) + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="field-group"><label>Peso (kg)</label><input type="text" inputmode="decimal" value="' + esc(patient.peso || "") + `" placeholder="60" oninput="updatePatient('peso',this.value)"></div><div class="field-group"><label>Talla (m)</label><input type="text" inputmode="decimal" value="` + esc(patient.talla || "") + `" placeholder="1.60" oninput="updatePatient('talla',this.value)"></div></div>` + buildPatientAccesosSectionHtml(patient) + '<div class="field-group"><label>\xC1rea</label><input type="text" value="' + esc(patient.area) + `" oninput="updatePatient('area',this.value)" style="text-transform:uppercase;"></div><div class="field-group"><label>Servicio</label><input type="text" value="` + esc(patient.servicio) + `" oninput="updatePatient('servicio',this.value)" style="text-transform:uppercase;"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="field-group"><label>Cuarto</label><input type="text" value="` + esc(patient.cuarto) + `" oninput="updatePatient('cuarto',this.value)"></div><div class="field-group"><label>Cama</label><input type="text" value="` + esc(patient.cama) + `" oninput="updatePatient('cama',this.value)"></div></div>` + (isModeSala(rt4.getSettings()) ? buildPatientCensoDatosSectionsHtml(patient) : "") + "</div>";
}
function buildPatientDemographicsCardHtml(patient, opts) {
  var fields = buildPatientDemographicsFieldsHtml(patient);
  if (opts && opts.embedded) {
    return '<div class="exp-datos-fields">' + fields + "</div>";
  }
  return '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body">' + fields + "</div></div>";
}
function renderPatientDataPane(patientIdOverride) {
  var wrap = document.getElementById("patient-data-form");
  if (!wrap) return;
  var targetId = patientIdOverride != null && patientIdOverride !== "" ? patientIdOverride : aid();
  if (!targetId) {
    wrap.innerHTML = "";
    return;
  }
  var patient = getPatients().find(function(p) {
    return String(p.id) === String(targetId);
  });
  if (!patient) {
    wrap.innerHTML = "";
    return;
  }
  wrap.dataset.patientId = String(patient.id);
  var datosMount = wrap.closest(".exp-datos-modal-body") || wrap.closest("#exp-datos-modal-mount");
  if (datosMount) datosMount.dataset.patientId = String(patient.id);
  wrap.innerHTML = buildPatientDemographicsCardHtml(patient, { embedded: true });
  refreshRpcDateFields(wrap);
  wirePatientTeamAssignRefresh();
}

// public/js/features/expediente.mjs
var windowHandlers3 = Object.assign(
  {
    copyCultivoCondensado,
    updateListadoMeta,
    updateProblemaField,
    addProblemaUI,
    removeProblemaUI,
    copyListadoProblemasAiPrompt,
    generateListado,
    _autoGrowTextarea,
    renderPatientDataPane,
    updateListadoMedico
  },
  patientDataCensoWindowHandlers,
  patientDataAccesosWindowHandlers,
  patientTeamAssignWindowHandlers,
  patientDatosModalWindowHandlers
);

// public/js/features/todos.mjs
function todoCompareForSort(a, b) {
  if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
  var prioOrder = { alta: 0, media: 1, baja: 2 };
  var pa = prioOrder[a.priority] != null ? prioOrder[a.priority] : 1;
  var pb = prioOrder[b.priority] != null ? prioOrder[b.priority] : 1;
  if (pa !== pb) return pa - pb;
  if (a.createdAt && b.createdAt) return String(b.createdAt).localeCompare(String(a.createdAt));
  return 0;
}
var todosWindowHandlers = {
  renderTodoForm,
  addTodo,
  toggleTodo,
  deleteTodo,
  setTodoPriority
};

// public/js/features/pase-board-cache-keys.mjs
var _paseBoardCacheKey = "";
function invalidatePaseBoardCache() {
  _paseBoardCacheKey = "";
}
function buildPaseBoardCacheKey(pid) {
  var todos = storage.getTodos(pid);
  var done = 0;
  for (var i = 0; i < todos.length; i += 1) {
    if (todos[i].completed) done += 1;
  }
  var med = getMedRecetaByPatient()[pid] && getMedRecetaByPatient()[pid].items || [];
  var ag = getPaseAgendaForPatient(pid);
  return String(pid) + "|L" + getLabHistoryRevision(pid) + "|T" + todos.length + ":" + done + "|M" + med.length + "|A" + ag.length;
}
function getPaseBoardCacheKey() {
  return _paseBoardCacheKey;
}
function setPaseBoardCacheKey(key) {
  _paseBoardCacheKey = key;
}
function getPaseAgendaForPatient(patientId) {
  var cutoff = Date.now() - 36e5;
  return storage.getScheduledProcedures().filter(function(ev) {
    return String(ev.patientId) === String(patientId);
  }).filter(function(ev) {
    var t2 = Date.parse(ev.start);
    return Number.isFinite(t2) && t2 >= cutoff;
  }).sort(function(a, b) {
    return Date.parse(a.start) - Date.parse(b.start);
  }).slice(0, 12);
}

// public/js/features/pase-board-render.mjs
function buildPaseLabBlockHtml(labChunks) {
  if (!labChunks || !labChunks.length) return "";
  var parts = [];
  labChunks.forEach(function(text) {
    renderEntry(text).forEach(function(htmlLine, idx) {
      var isSechead = idx === 0 || isLabSectionHeaderHtml(htmlLine);
      parts.push(
        '<div class="pase-lab-line' + (isSechead ? " pase-lab-line--sechead" : "") + '">' + htmlLine + "</div>"
      );
    });
  });
  return '<div class="pase-lab-block" role="text">' + parts.join("") + "</div>";
}
function cleanPaseMedDosisForCard(dosisRaw) {
  var s = String(dosisBeforeSlash(dosisRaw) || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  var d\u00EDa = /\b(?:LOS\s+)?(?:LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|VIERNES|SABADO|SÁBADO|DOMINGO)\b/i;
  var m = s.match(d\u00EDa);
  if (m && m.index != null && m.index > 0) {
    s = s.slice(0, m.index).replace(/\s*(?:,\s*|\bY\b|\bO\b)\s*$/gi, "").replace(/[,\s]+$/g, "").trim();
  }
  return s.replace(/\s+/g, " ").trim();
}
function abbreviatePaseMedDosisCore(core) {
  var t2 = String(core || "").trim();
  if (!t2) return t2;
  var m = t2.match(/^(\d+)\s*(UI|IU)\s*$/i);
  if (!m) return t2;
  var n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1e6) return t2;
  var mil = n / 1e6;
  var label = mil % 1 === 0 ? String(mil) : String(Math.round(mil * 10) / 10).replace(".", ",");
  return label + "M " + m[2].toUpperCase();
}
function splitPaseMedDosisForDisplay(dosisClean) {
  var s = String(dosisClean || "").trim();
  if (!s) return { core: "", extra: "", splitOk: false };
  var unit = "(?:UI\\/ML|IU\\/ML|MCG\\/ML|MG\\/ML|\\b(?:UI|IU|MCG|UG|MG|NG|ML|UL)\\b)";
  var re = new RegExp(
    "^((?:\\d+(?:[,\\.]\\d+)?(?:\\s*/\\s*\\d+(?:[,\\.]\\d+)?)?\\s*(?:" + unit + "))|(?:\\d+(?:[,\\.]\\d+)?\\s*%))(?:\\s+([\\s\\S]*))?$",
    "i"
  );
  var m = s.match(re);
  if (!m || !String(m[1] || "").trim()) return { core: s, extra: "", splitOk: false };
  return {
    core: String(m[1]).trim(),
    extra: String(m[2] || "").trim(),
    splitOk: true
  };
}
function abbreviatePaseMedVia(viaRaw) {
  var u = String(viaRaw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!u.trim()) return "";
  if (/\bINTRAPERITONEAL\b/.test(u)) return "IP";
  if (/\bINTRAMUSCULAR\b/.test(u)) return "IM";
  if (/\bINTRAVENOSA\b/.test(u)) return "IV";
  if (/\bORAL\b/.test(u)) return "VO";
  var fallback = String(viaRaw || "").trim();
  return fallback.length > 28 ? fallback.slice(0, 26) + "\u2026" : fallback;
}
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
    var labChunks = sp.labs.filter(function(x) {
      return String(x || "").trim();
    });
    if (!labChunks.length) continue;
    var meta = rt.formatLabHistoryListMeta(set);
    return { meta, labChunks };
  }
  return null;
}
function getPaseAgendaForPatient2(patientId) {
  var cutoff = Date.now() - 36e5;
  return storage.getScheduledProcedures().filter(function(ev) {
    return String(ev.patientId) === String(patientId);
  }).filter(function(ev) {
    var t2 = Date.parse(ev.start);
    return Number.isFinite(t2) && t2 >= cutoff;
  }).sort(function(a, b) {
    return Date.parse(a.start) - Date.parse(b.start);
  }).slice(0, 12);
}
function buildPasePatientHeaderHtml(patient) {
  if (!patient) return "";
  var chips = [];
  if (patient.cuarto) chips.push({ label: "Cto.", value: String(patient.cuarto) });
  if (patient.cama) chips.push({ label: "Cama", value: String(patient.cama) });
  if (patient.servicio) chips.push({ label: "Servicio", value: String(patient.servicio) });
  if (patient.registro) chips.push({ label: "Reg.", value: String(patient.registro), mono: true });
  var chipsHtml = chips.map(function(c) {
    return '<span class="pase-patient-chip' + (c.mono ? " pase-patient-chip--mono" : "") + '"><span class="pase-patient-chip-label">' + esc(c.label) + "</span> " + esc(c.value) + "</span>";
  }).join("");
  return '<section class="pase-section pase-patient-banner" aria-label="Paciente activo"><div class="pase-patient-banner-body"><div class="pase-patient-name">' + esc(patient.nombre || "Paciente") + "</div>" + (chipsHtml ? '<div class="pase-patient-meta-row">' + chipsHtml + "</div>" : "") + "</div></section>";
}
function ensurePaseBoardTodoDelegate(host) {
  if (host._paseDelegate) return;
  host._paseDelegate = true;
  host.addEventListener("click", function(e) {
    var todoBtn = e.target.closest("[data-pase-todo]");
    if (todoBtn && todoBtn.getAttribute("data-pase-todo")) {
      e.preventDefault();
      toggleTodo(todoBtn.getAttribute("data-pase-todo"));
    }
  });
}
function shouldSkipPaseBoardRender(host, aid4) {
  if (!aid4) {
    setPaseBoardCacheKey("");
    return false;
  }
  var cacheKey = buildPaseBoardCacheKey(aid4);
  if (getPaseBoardCacheKey() === cacheKey && host.querySelector(".pase-patient-header")) {
    return true;
  }
  setPaseBoardCacheKey(cacheKey);
  return false;
}
function buildPaseTodoCardsHtml(todos) {
  if (!todos.length) {
    return '<div class="pase-mini-card pase-mini-card--dim">Sin pendientes.</div>';
  }
  return todos.map(function(t2) {
    var prio = t2.priority === "alta" ? "alta" : t2.priority === "baja" ? "baja" : "media";
    return '<div class="pase-mini-card pase-todo-card todo-prio-' + prio + (t2.completed ? " pase-mini-card--todo-done" : "") + '"><button type="button" class="pase-todo-hit" data-pase-todo="' + esc(String(t2.id)) + '" aria-label="' + (t2.completed ? "Marcar como pendiente" : "Marcar como hecho") + '">' + (t2.completed ? "\u2713" : "\u25CB") + "</button><span>" + esc(String(t2.text || "")) + "</span></div>";
  }).join("");
}
function buildPaseAgendaCardsHtml(ag) {
  if (!ag.length) {
    return '<div class="pase-mini-card pase-mini-card--dim">Sin procedimientos pr\xF3ximos.</div>';
  }
  return ag.map(function(ev) {
    var when = new Date(ev.start);
    var whenStr = isNaN(when.getTime()) ? "\u2014" : when.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
    return '<div class="pase-mini-card"><strong>' + esc(String(ev.procedure || "Procedimiento")) + '</strong><span class="pase-sub">' + esc(whenStr + " \xB7 " + String(ev.location || "").trim()) + "</span></div>";
  }).join("");
}
function buildPaseTodosAgendaRowHtml(pid) {
  var todos = storage.getTodos(pid).slice().sort(todoCompareForSort);
  var ag = getPaseAgendaForPatient2(pid);
  return `<div class="pase-section-row pase-section-row--split"><section class="pase-section" aria-label="Pendientes"><div class="pase-section-head"><button type="button" class="pase-section-title" onclick="openPaseSectionInNormal('pendientes')">Pendientes</button></div><div class="pase-dual-col-grid">` + buildPaseTodoCardsHtml(todos) + `</div></section><section class="pase-section" aria-label="Agenda"><div class="pase-section-head"><button type="button" class="pase-section-title" onclick="openPaseSectionInNormal('agenda')">Agenda</button></div><div class="pase-dual-col-grid">` + buildPaseAgendaCardsHtml(ag) + "</div></section></div>";
}
function buildPaseLabSectionHtml(pid) {
  var labSend = findPaseLatestLabSend(pid);
  var body = !labSend ? '<div class="pase-mini-card pase-mini-card--dim">Sin env\xEDos de laboratorio convencional en el historial.</div>' : '<div class="pase-mini-card pase-mini-card--wide pase-mini-card--lab"><div class="pase-lab-meta">' + esc(labSend.meta) + "</div>" + buildPaseLabBlockHtml(labSend.labChunks) + "</div>";
  return `<section class="pase-section" aria-label="Laboratorio"><div class="pase-section-head"><button type="button" class="pase-section-title" onclick="openPaseSectionInNormal('labs')" aria-label="Laboratorio">Labs</button></div><div class="pase-card-grid">` + body + "</div></section>";
}
function sortPaseCultivoRows(flatRows) {
  var displayRows = filterCultivoRowsSignificantFlip(flatRows);
  return displayRows.slice().sort(function(a, b) {
    var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
    var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
    if (db !== da) return db - da;
    return (b._seq || 0) - (a._seq || 0);
  });
}
function buildPaseCultivoCardHtml(pid, r) {
  var fd = r.fechaMuestra && r.fechaMuestra !== "\u2014" ? r.fechaMuestra : r.studyDate || "\u2014";
  return '<div class="pase-mini-card pase-cultivo-card' + (r.negativo ? " pase-mini-card--dim" : "") + '"><div class="pase-cult-org">' + esc(String(r.organismo || "\u2014")) + (r.cuenta ? '<div class="pase-cult-cuenta">' + esc(String(r.cuenta)) + "</div>" : "") + "</div>" + paseCultivoAtbBlockHtml(pid, r) + '<div class="pase-sub">' + esc(String(r.tipoLabel || "") + " \xB7 " + String(r.sitio || "").slice(0, 72)) + "<br>" + esc(fd) + "</div></div>";
}
function buildPaseCultivosSectionHtml(pid) {
  var displayRows = sortPaseCultivoRows(extractCultivoTableRowsFromHistory(pid));
  var body = !displayRows.length ? '<div class="pase-mini-card pase-mini-card--dim">Sin cultivos relevantes para la ronda (positivos o negativos con cambio de signo en la misma muestra).</div>' : displayRows.slice(0, 10).map(function(r) {
    return buildPaseCultivoCardHtml(pid, r);
  }).join("");
  return `<section class="pase-section" aria-label="Cultivos"><div class="pase-section-head"><button type="button" class="pase-section-title" onclick="openPaseSectionInNormal('cultivos')">Cultivos</button></div><div class="pase-card-grid">` + body + "</div></section>";
}
function buildPaseMedMetaRowHtml(dosisSplit, viaAbbr, freq) {
  var metaParts = [];
  if (dosisSplit.core || dosisSplit.extra) {
    if (dosisSplit.splitOk) {
      metaParts.push(
        '<span class="pase-med-chip pase-med-chip--dosis">' + (dosisSplit.core ? '<span class="pase-med-dosis-core">' + esc(abbreviatePaseMedDosisCore(dosisSplit.core)) + "</span>" : "") + (dosisSplit.extra ? '<span class="pase-med-dosis-rest">' + esc(dosisSplit.extra) + "</span>" : "") + "</span>"
      );
    } else {
      metaParts.push('<span class="pase-med-chip">' + esc(dosisSplit.core) + "</span>");
    }
  }
  if (viaAbbr) metaParts.push('<span class="pase-med-chip">' + esc(viaAbbr) + "</span>");
  if (freq) metaParts.push('<span class="pase-med-chip">' + esc(freq) + "</span>");
  return metaParts.length ? '<div class="pase-med-meta-row">' + metaParts.join("") + "</div>" : "";
}
function buildPaseMedCardHtml(it, block) {
  var nombre = paseMedPrincipioActivoTitle(it.nombreRaw || "");
  var viaAbbr = abbreviatePaseMedVia(it.viaRaw || "");
  var freq = String(it.frecuenciaRaw || "").trim();
  var dosis = cleanPaseMedDosisForCard(it.dosisRaw || "");
  var dosisSplit = dosis ? splitPaseMedDosisForDisplay(dosis) : { core: "", extra: "", splitOk: false };
  var diaDisplay = it.diaTratamiento != null ? effectiveDiaTratamiento(it.diaTratamiento, block && block.fechaActualizacion) : null;
  var diaBadge = diaDisplay != null ? '<div class="pase-med-dia-badge" title="D\xEDa de tratamiento">D\xEDa ' + esc(String(diaDisplay)) + "</div>" : "";
  return '<div class="pase-mini-card pase-med-card"><div class="pase-med-card-head"><div class="pase-med-name">' + esc(nombre) + "</div>" + diaBadge + "</div>" + buildPaseMedMetaRowHtml(dosisSplit, viaAbbr, freq) + "</div>";
}
function buildPaseMedSectionHtml(pid) {
  var block = getMedRecetaByPatient()[pid];
  var medItems = block && block.items ? block.items.filter(function(it) {
    return !it.suspendido;
  }) : [];
  var body = !medItems.length ? '<div class="pase-mini-card pase-mini-card--dim">Sin medicamentos activos en la receta (o todos excluidos).</div>' : medItems.map(function(it) {
    return buildPaseMedCardHtml(it, block);
  }).join("");
  return `<section class="pase-section" aria-label="Manejo"><div class="pase-section-head"><button type="button" class="pase-section-title" onclick="openPaseSectionInNormal('med')">Manejo</button></div><div class="pase-card-grid">` + body + "</div></section>";
}
function buildPaseBoardBodyHtml(pid, patient) {
  return buildPasePatientHeaderHtml(patient) + buildPaseTodosAgendaRowHtml(pid) + buildPaseLabSectionHtml(pid) + buildPaseCultivosSectionHtml(pid) + buildPaseMedSectionHtml(pid);
}
function renderPaseBoard() {
  var host = document.getElementById("pase-board-scroll");
  if (!host || !isPaseMode()) return;
  var aid4 = rt.getActiveId();
  if (shouldSkipPaseBoardRender(host, aid4)) return;
  removeAtbRisPanelsFromBody();
  ensurePaseBoardTodoDelegate(host);
  if (!aid4) {
    host.innerHTML = '<div class="pase-empty-screen" role="status">Selecciona un paciente en la lista para ver el resumen.</div>';
    return;
  }
  var patient = getPatients().find(function(x) {
    return String(x.id) === String(aid4);
  });
  host.innerHTML = buildPaseBoardBodyHtml(aid4, patient);
  wireAtbRisHoverPanels(host);
}

// public/js/features/pase-board-app-tabs.mjs
var APP_TAB_ROWS = [
  ["lab", "apptab-lab", "appcontent-lab", "appTab.lab"],
  ["nota", "apptab-nota", "appcontent-nota", "appTab.nota"],
  ["med", "apptab-med", "appcontent-med", "appTab.med"],
  ["agenda", "apptab-agenda", "appcontent-agenda", "appTab.agenda"]
];
function refreshExpedienteOnNotaAppTabEnter() {
  scheduleAfterPaint(function() {
    if (rt.getActiveAppTab() !== "nota") return;
    var settings = rt.getSettings();
    var inner = innerAfterLeavingLab(migrateGranularInner(rt.getActiveInner() || "resumen", settings));
    if (inner !== rt.getActiveInner()) rt.setActiveInner(inner);
    syncInnerTabVisualOnly();
    if (granularMountIsEmpty(inner) || !isInnerTabContentFresh(inner, settings)) {
      renderGranularInnerTab(inner, granularMountIsEmpty(inner) ? { force: true } : void 0);
    } else if (inner === "estadoActual") {
      refreshEaCopyFabVisibility();
    }
  });
}
function getAppTabDom() {
  return {
    apptabLab: document.getElementById("apptab-lab"),
    apptabNota: document.getElementById("apptab-nota"),
    apptabMed: document.getElementById("apptab-med"),
    apptabAgenda: document.getElementById("apptab-agenda"),
    appcontentLab: document.getElementById("appcontent-lab"),
    appcontentMed: document.getElementById("appcontent-med"),
    appcontentNota: document.getElementById("appcontent-nota"),
    appcontentAgenda: document.getElementById("appcontent-agenda"),
    paseRoot: document.getElementById("appcontent-pase"),
    guardiaRoot: document.getElementById("appcontent-guardia")
  };
}
function syncAppTabButtonStates(tab, dom) {
  if (dom.apptabLab) dom.apptabLab.classList.toggle("active", tab === "lab");
  if (dom.apptabNota) dom.apptabNota.classList.toggle("active", tab === "nota");
  if (dom.apptabMed) dom.apptabMed.classList.toggle("active", tab === "med");
  if (dom.apptabAgenda) dom.apptabAgenda.classList.toggle("active", tab === "agenda");
  syncAppTabIndicator(tab);
}
function layoutGuardiaAppTab(dom) {
  var standardPanels = [dom.appcontentLab, dom.appcontentMed, dom.appcontentNota, dom.appcontentAgenda];
  standardPanels.forEach(function(p) {
    hideAppTabPanel(p);
  });
  if (dom.paseRoot) hideAppTabPanel(dom.paseRoot);
  if (dom.guardiaRoot) {
    showAppTabPanel(dom.guardiaRoot, false);
    dom.guardiaRoot.style.display = "flex";
    dom.guardiaRoot.style.flexDirection = "column";
    dom.guardiaRoot.style.flex = "1";
    dom.guardiaRoot.style.minHeight = "0";
    dom.guardiaRoot.style.overflow = "hidden";
  }
  renderGuardiaBoard(rt.getSettings());
}
function layoutPaseAppTab(dom, tab, prevAppTab) {
  var standardPanels = [dom.appcontentLab, dom.appcontentMed, dom.appcontentNota, dom.appcontentAgenda];
  standardPanels.forEach(function(p) {
    hideAppTabPanel(p);
  });
  if (dom.guardiaRoot) hideAppTabPanel(dom.guardiaRoot);
  if (dom.paseRoot) {
    var animatePase = prevAppTab !== tab || dom.paseRoot.style.display === "none";
    showAppTabPanel(dom.paseRoot, animatePase);
    dom.paseRoot.style.flexDirection = "column";
  }
  renderPaseBoard();
}
function showStandardPanelForTab(dom, tab) {
  var pairs = [
    ["lab", dom.appcontentLab],
    ["med", dom.appcontentMed],
    ["nota", dom.appcontentNota],
    ["agenda", dom.appcontentAgenda]
  ];
  pairs.forEach(function(pair) {
    var panel = pair[1];
    if (!panel) return;
    if (tab === pair[0]) showAppTabPanel(panel, true);
    else hideAppTabPanel(panel);
  });
}
function enterLabStandardTab() {
  closePatientDatosModal();
  showLabPanelLoadingSkeleton();
  void ensureLabsLoaded().then(function(mod) {
    hideLabPanelLoadingSkeleton();
    if (rt.getActiveAppTab() !== "lab") return;
    scheduleAfterPaint(function() {
      if (rt.getActiveAppTab() === "lab") rt.renderLabHistoryPanel();
    });
    mod.syncLabCopyFab(mod.labOutputHasCopyableContent());
  }).catch(function(err) {
    hideLabPanelLoadingSkeleton();
    console.error("ensureLabsLoaded failed:", err && err.message);
    rt.showToast("No se pudo cargar Laboratorio. Reintenta o reinicia la app.", "error");
  });
}
function scheduleStandardTabSideEffects(tab) {
  if (tab === "lab") enterLabStandardTab();
  if (tab === "med") {
    scheduleAfterPaint(function() {
      if (rt.getActiveAppTab() === "med") rt.renderMedRecetaPanel();
    });
  }
  if (tab === "agenda") {
    scheduleAfterPaint(function() {
      if (rt.getActiveAppTab() === "agenda") rt.renderProcedureAgendaPanel();
    });
  }
  if (tab === "nota" && rt.getActiveInner() === "tend") {
    scheduleAfterPaint(function() {
      if (rt.getActiveAppTab() === "nota" && rt.getActiveInner() === "tend") {
        void ensureChartsLoaded().then(function(mods) {
          mods.tendencias.renderTendencias();
        });
      }
    });
  }
}
function layoutStandardAppTab(dom, tab) {
  if (dom.paseRoot) hideAppTabPanel(dom.paseRoot);
  if (dom.guardiaRoot) hideAppTabPanel(dom.guardiaRoot);
  showStandardPanelForTab(dom, tab);
  scheduleStandardTabSideEffects(tab);
  if (tab === "lab") syncLabInnerVisibility();
}
function syncLabCopyFabVisibility(tab) {
  if (tab === "lab") {
    void ensureLabsLoaded().then(function(mod) {
      if (rt.getActiveAppTab() !== "lab") return;
      mod.syncLabCopyFab(mod.labOutputHasCopyableContent());
    });
    return;
  }
  var labCopyFab = document.getElementById("lab-copy-fab");
  if (labCopyFab) {
    labCopyFab.setAttribute("hidden", "");
    labCopyFab.style.display = "none";
    labCopyFab.setAttribute("aria-hidden", "true");
  }
  document.documentElement.classList.remove("lab-copy-fab-active");
}
function schedulePostAppTabSwitch(tab, prevAppTab) {
  var deferredTab = tab;
  if (tab === "med" || prevAppTab === "med") {
    rt.syncWorkContextChrome();
  }
  scheduleAfterPaint(function() {
    if (rt.getActiveAppTab() !== deferredTab) return;
    syncAppTabIndicator(deferredTab);
    if (deferredTab === "nota") syncRoundExpedienteLayout();
    else if (deferredTab !== "med" && prevAppTab !== "med") rt.syncWorkContextChrome();
    if (deferredTab === "lab") resumeLabBulkPreviewModalIfSuspended();
  });
}
function hideStandardTabA11y(rows) {
  rows.forEach(function(r) {
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
}
function syncSpecialRootA11y(rootId, role, label, visible) {
  var root = document.getElementById(rootId);
  if (!root) return;
  if (role) {
    root.setAttribute("role", role);
    root.setAttribute("aria-label", label);
    root.setAttribute("aria-hidden", visible ? "false" : "true");
    return;
  }
  root.removeAttribute("role");
  root.removeAttribute("aria-label");
  root.setAttribute("aria-hidden", "true");
}
function syncGuardiaTabA11y(list, rows) {
  if (list) list.setAttribute("aria-hidden", "true");
  hideStandardTabA11y(rows);
  syncSpecialRootA11y("appcontent-pase", null, null, false);
  syncSpecialRootA11y(
    "appcontent-guardia",
    "region",
    "Modo Guardia \u2014 censo de pacientes",
    true
  );
}
function syncPaseTabA11y(list, rows) {
  if (list) list.setAttribute("aria-hidden", "true");
  hideStandardTabA11y(rows);
  syncSpecialRootA11y("appcontent-pase", "region", "Vista Pase \u2014 resumen del paciente", true);
  syncSpecialRootA11y("appcontent-guardia", null, null, false);
}
function syncNormalTabA11y(tab, list, rows) {
  syncSpecialRootA11y("appcontent-pase", null, null, false);
  syncSpecialRootA11y("appcontent-guardia", null, null, false);
  if (list) list.removeAttribute("aria-hidden");
  rows.forEach(function(r) {
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
function isAppTabNavKey(key) {
  return key === "ArrowRight" || key === "ArrowLeft" || key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End";
}
function nextAppTabFromKey(curIndex, key, orderLen) {
  if (key === "ArrowRight" || key === "ArrowDown") return (curIndex + 1) % orderLen;
  if (key === "ArrowLeft" || key === "ArrowUp") return (curIndex - 1 + orderLen) % orderLen;
  if (key === "Home") return 0;
  if (key === "End") return orderLen - 1;
  return -1;
}
function switchAppTab(tab) {
  if (tab === "lan") tab = "lab";
  if (isMobileWeb()) tab = normalizeMobileAppTab(tab);
  if (tab !== "med") closeMedRecetaPasteModal();
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  var prevAppTab = rt.getActiveAppTab();
  rt.setActiveAppTab(tab);
  if (tab === "nota" && isPaseMode() && prevAppTab !== "nota") {
    setRoundOverviewMode(true);
  }
  if (tab === "nota" && prevAppTab !== "nota" && !isPaseMode()) {
    refreshExpedienteOnNotaAppTabEnter();
  }
  var dom = getAppTabDom();
  syncMainAppTabA11y(tab);
  syncAppTabButtonStates(tab, dom);
  if (isGuardiaMode()) layoutGuardiaAppTab(dom);
  else if (isPaseMode()) layoutPaseAppTab(dom, tab, prevAppTab);
  else layoutStandardAppTab(dom, tab);
  syncLabCopyFabVisibility(tab);
  refreshEaCopyFabVisibility();
  if (tab === "med") rt.setMedTabAttention(false);
  syncHeaderContext(rt);
  schedulePostAppTabSwitch(tab, prevAppTab);
}
function syncMainAppTabA11y(tab) {
  if (tab === "lan") tab = "lab";
  var list = document.getElementById("app-main-tablist");
  if (isGuardiaMode()) {
    syncGuardiaTabA11y(list, APP_TAB_ROWS);
    return;
  }
  if (isPaseMode()) {
    syncPaseTabA11y(list, APP_TAB_ROWS);
    return;
  }
  syncNormalTabA11y(tab, list, APP_TAB_ROWS);
}
if (typeof document !== "undefined") {
  (function setupMainAppTabKeyboard() {
    var list = document.getElementById("app-main-tablist");
    if (!list) return;
    var order = isMobileWeb() ? ["nota", "lab"] : ["nota", "lab", "med", "agenda"];
    list.addEventListener("keydown", function(e) {
      if (!isAppTabNavKey(e.key)) return;
      var cur = rt.getActiveAppTab() === "lan" ? "lab" : rt.getActiveAppTab();
      var i = order.indexOf(cur);
      if (i < 0) i = 0;
      var next = nextAppTabFromKey(i, e.key, order.length);
      if (next < 0) return;
      e.preventDefault();
      var t2 = order[next];
      switchAppTab(t2);
      var btn = document.getElementById("apptab-" + t2);
      if (btn) btn.focus();
    });
  })();
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
      if (typeof window.switchConsolidatedTab === "function") window.switchConsolidatedTab(group.id);
    });
    pill.appendChild(name);
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

// public/js/features/pase-board-navigation.mjs
var PASE_SECTION_ROUTES = {
  labs: { app: "lab" },
  lab: { app: "lab" },
  pendientes: { app: "nota", inner: "todo" },
  todo: { app: "nota", inner: "todo" },
  agenda: { app: "agenda" },
  cultivos: { app: "lab", inner: "cult" },
  cult: { app: "lab", inner: "cult" },
  tend: { app: "lab", inner: "tend" },
  tendencias: { app: "lab", inner: "tend" },
  med: { app: "med" },
  medicamentos: { app: "med" },
  recetahu: { app: "nota", inner: "recetaHu" },
  "receta-hu": { app: "nota", inner: "recetaHu" },
  receta_hu: { app: "nota", inner: "recetaHu" },
  expediente: { app: "nota", inner: "notas" },
  nota: { app: "nota", inner: "notas" },
  resumen: { app: "nota", inner: "resumen" }
};
function navigatePaseSection(route) {
  switchAppTab(route.app);
  if (route.inner) switchInnerTab(route.inner);
}
function openPaseSectionInNormal(which) {
  var w = String(which || "").toLowerCase();
  var wasPase = isPaseMode();
  if (getUiDensity() !== "normal") {
    setUiDensity("normal");
  }
  if (wasPase) markOpenedDetailFromPaseBoard();
  var route = PASE_SECTION_ROUTES[w] || PASE_SECTION_ROUTES.nota;
  navigatePaseSection(route);
  if (getUiDensity() === "normal") {
    requestAnimationFrame(function() {
      scrollActiveRondaCardIntoView();
    });
  }
}
function refreshExpedienteForAppModeChange() {
  cancelExpedienteWarm();
  cancelDeferredIdleWork();
  invalidatePaseBoardCache();
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
  invalidatePaseBoardCache();
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
function tryPaseRecetaRedirect(tab) {
  if (!isExpedienteInnerTab(tab) || !isPaseMode() || getUiDensity() === "normal") return false;
  if (tab !== "recetaHu") return false;
  openPaseSectionInNormal("recetaHu");
  return true;
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
  if (tryPaseRecetaRedirect(tab)) return;
  ensureAppTabForInner(tab);
  if (isPaseMode() && rt.getActiveAppTab() === "nota" && !opts.preserveRoundOverview) {
    setRoundOverviewMode(false);
  }
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
  syncRoundExpedienteLayout();
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
var windowHandlers4 = {
  switchAppTab,
  openPaseSectionInNormal,
  renderPaseBoard,
  switchInnerTab,
  switchConsolidatedTab,
  initTabBarMotion
};

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

// public/js/features/medications-panel-render.mjs
function getMedPanelDom() {
  return {
    hintEl: document.getElementById("med-hint"),
    fechaEl: document.getElementById("med-fecha-actualizacion"),
    listEl: document.getElementById("med-items-list"),
    outPre: document.getElementById("med-output"),
    outCard: document.getElementById("med-output-section")
  };
}
function renderMedPanelEmptyNoPatient(els) {
  bustMedPanelCache();
  els.hintEl.hidden = false;
  els.hintEl.textContent = "Selecciona un paciente en la columna izquierda para ver su manejo.";
  setMedActiveLeadVisible(false);
  if (els.fechaEl) els.fechaEl.hidden = true;
  els.listEl.innerHTML = "";
  els.outPre.textContent = "";
  if (els.outCard) els.outCard.style.display = "none";
  hideMedNotaFooter();
  if (isPaseMode()) renderPaseBoard();
}
function renderMedPanelEmptyNoContent(activeId, cacheKey, els) {
  setMedPanelCacheKey(cacheKey);
  els.hintEl.hidden = false;
  els.hintEl.textContent = "A\xFAn no hay medicamentos. Pulsa Importar SOME, pega el bloque del hospital y procesa la receta.";
  setMedActiveLeadVisible(false);
  if (els.fechaEl) els.fechaEl.hidden = true;
  els.listEl.innerHTML = "";
  els.outPre.textContent = "";
  if (els.outCard) els.outCard.style.display = "none";
  hideMedNotaFooter();
  if (isPaseMode()) renderPaseBoard();
}
function syncMedOutputTabChrome(outPre, outCard, block) {
  var tabFull = document.getElementById("med-tab-full");
  var tabSimple = document.getElementById("med-tab-simple");
  var tabTrack = document.getElementById("med-output-tabs-track");
  if (tabTrack) tabTrack.setAttribute("data-active", medOutputTab === "simple" ? "simple" : "full");
  if (tabFull) {
    tabFull.classList.toggle("active", medOutputTab === "full");
    tabFull.setAttribute("aria-selected", medOutputTab === "full" ? "true" : "false");
  }
  if (tabSimple) {
    tabSimple.classList.toggle("active", medOutputTab === "simple");
    tabSimple.setAttribute("aria-selected", medOutputTab === "simple" ? "true" : "false");
  }
  var items = block.items || [];
  var diaOpts = manejoDiaOpts(block.fechaActualizacion);
  var txtFull = buildMedRecetaCopyText(items, diaOpts);
  var txtSimple = buildMedRecetaNameOnlyText(items, diaOpts);
  var txt = medOutputTab === "simple" ? txtSimple : txtFull;
  outPre.textContent = txt;
  if (outCard) outCard.style.display = txt.trim() ? "block" : "none";
}
function renderMedPanelRecetaContent(activeId, block, cacheKey, els) {
  setMedPanelCacheKey(cacheKey);
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
  syncMedOutputTabChrome(els.outPre, els.outCard, block);
  if (isPaseMode()) renderPaseBoard();
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
  var activeId = rt3.getActiveId();
  handleMedPanelPatientChange(activeId);
  if (getMedSubview() === "perfil") {
    bustMedPanelCache();
    renderMedPharmProfilePanel();
    return;
  }
  var els = getMedPanelDom();
  if (!els.hintEl || !els.listEl || !els.outPre) return;
  bustMedPanelCacheIfLegacyDestUi(els.listEl);
  var cacheKey = buildMedPanelCacheKey(activeId);
  if (shouldSkipMedPanelCacheHit(activeId, cacheKey, els)) return;
  if (!activeId) {
    renderMedPanelEmptyNoPatient(els);
    return;
  }
  renderMedPanelForActivePatient(activeId, cacheKey, els);
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
  var patient = findActivePatient();
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
var windowHandlers5 = {
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

// public/js/features/pase-board-resumen-cache.mjs
function resumenGlanceCacheSuffix(patient, todos) {
  var ev = patient && patient.eventualidades;
  var evAt = ev && ev.updatedAt ? String(ev.updatedAt) : "";
  var evN = ev && Array.isArray(ev.entries) ? ev.entries.length : 0;
  var open = 0;
  var stamp = "";
  (todos || []).forEach(function(t2) {
    if (!t2 || t2.completed) return;
    open += 1;
    var u = String(t2.updatedAt || t2.id || "");
    if (u > stamp) stamp = u;
  });
  return "|V" + evN + evAt + "|P" + open + stamp;
}

// public/js/features/pase-board-inner-cache.mjs
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
  notas: function(tab) {
    renderNoteForm();
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

export {
  registerDocumentExportRuntime,
  guardMobileDocExport,
  saveOutputDirSelection,
  requestDocumentJson,
  handleDocumentGenerateResponse,
  registerNotesIndicacionesRuntime,
  renderNoteForm,
  generateWord,
  renderIndicaForm,
  generateIndicaciones,
  windowHandlers,
  registerExpedienteRuntime,
  wireAtbRisHoverPanels,
  removeAtbRisPanelsFromBody,
  isResLabChunkPureCultivo,
  buildCultivoOutputHtmlFragments,
  initTabBarMotion,
  applyEstadoActualParsedToForm,
  syncEaRegistroGluMode,
  resetEaRegistroForm,
  registerMedicationsRuntime,
  medOutputTab,
  registerMedPharmProfileRuntime,
  getMedSubview,
  setMedSubview,
  renderMedRecetaPanel,
  ensureEaRegistroModalForm,
  windowHandlers5 as windowHandlers2,
  renderEstadoActualPanel,
  navigateToEstadoActualPanel,
  registerVpoRuntime,
  renderVpo,
  todosWindowHandlers,
  registerRecetaHuRuntime,
  renderRecetaHu,
  recetaHuWindowHandlers,
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
  invalidatePaseBoardCache,
  renderPaseBoard,
  openPaseSectionInNormal,
  refreshExpedienteForAppModeChange,
  refreshExpedienteAfterPatientSelect,
  switchConsolidatedTab,
  switchInnerTab,
  renderInnerTabs,
  getActiveInnerTab,
  windowHandlers4 as windowHandlers3,
  procesarRecetaFromText,
  setMedOutputTab,
  registerCensoRuntime,
  syncCensoExportButtonVisibility,
  exportCensoPdfFromHelp,
  registerPlatformRuntime,
  getPlatformRuntime,
  formatDateSlug,
  downloadBlob,
  downloadJsonPayload,
  downloadTextPayload,
  getAuditLog,
  refreshDbAuditCache,
  addAuditEntry,
  exportAuditLog,
  lockClinicalDatabaseNow,
  verifyForensicAuditChain,
  exportRecoverCensusRangeJson,
  exportClinicalDbBackupJson,
  exportClinicalDbBackupDb,
  mergeMedCatalogStored,
  exportMedCatalogBundle,
  triggerImportMedCatalog,
  onMedCatalogFileChosen,
  incrementPendingJobs,
  decrementPendingJobs,
  syncOfflineButtonStates,
  setRpcOffline,
  isRpcOffline,
  checkRpcServerHealth,
  initRpcServerHealthWatch,
  syncIdleLockSelectUi,
  onIdleLockSelectChange,
  changeIdleLockPin,
  submitIdleLockPin,
  initIdleLockFeature,
  openWipeDataModal,
  closeWipeDataModal,
  wipeCacheConfirmed,
  wipeAllConfirmed,
  openUserDataFolderFromSettings,
  safeExportSlug,
  buildFullBackupPayload,
  defaultAutoBackupSettings,
  getAutoBackupSettings,
  saveAutoBackupSettings,
  getAutoBackupIndex,
  saveAutoBackupIndex,
  syncAutoBackupUi,
  updateAutoBackupSettingsFromUi,
  shouldRunScheduledBackup,
  maybeRunScheduledAutoBackup,
  restartAutoBackupScheduler,
  runAutoBackupNow,
  syncPreimportBackupUi,
  restorePreimportBackupPrompt,
  parseDateDMY,
  parseDateRangePrompt,
  patientInDateRange,
  askConflictAction,
  applyImportEntry,
  importEntriesWithConflicts,
  exportDataBackup,
  exportActivePatientBackup,
  exportRangeBackupPrompt,
  openExportPatientsModal,
  triggerImportRangeBackup,
  onRangeBackupFileChosen,
  triggerImportBackup,
  triggerImportActivePatientBackup,
  onPatientBackupFileChosen,
  importBundledDemoPerez,
  onBackupFileChosen,
  bytesToBase64,
  base64ToBytes,
  encryptSyncPayload,
  decryptSyncPayload,
  collectSyncEntries,
  exportSyncBundlePrompt,
  triggerImportSyncBundle,
  onSyncBundleFileChosen,
  getUpdateChannel,
  setUpdateChannel,
  syncUpdateChannelUI,
  migrateUpdateChannelToStableDefault,
  getUpdateTelemetryEnabled,
  setUpdateTelemetryEnabled,
  syncUpdateTelemetryUI,
  syncHardwareAccelerationUI,
  onHardwareAccelerationChange,
  hideUpdateModal,
  checkForRepairUpdate,
  checkForAppUpdates,
  installUpdate,
  compareSemver,
  checkMinVersionGate,
  initUpdateChannelAndGate,
  initGoalGFeatures,
  invalidateCultivosTableCache,
  refreshTendenciasOrCultivosPanel,
  registerProfileRuntime,
  attachProfileSettingsGetter,
  normalizeQuickOutputFormat,
  loadSettings,
  openProfileModal,
  closeProfileModal,
  toggleProfileSection,
  syncProfileSectionVisibility,
  applyAppModeSwitchEffects,
  setWorkModeFromHeader,
  closeTemplatesModal,
  hydrateProfileSettings,
  profileWindowHandlers,
  renderListadoForm,
  generateListado,
  renderPatientDataPane,
  windowHandlers3 as windowHandlers4,
  openCompleteAdmissionModal,
  openAddModal,
  openAddModalFullManual,
  openAddModalFromLab,
  openAddModalFromLabPatient,
  closeModal,
  confirmCloseAddPatientModal,
  savePatient,
  initPatientModalEnterSave,
  focusPatientSearchInput,
  getRoundOverviewMode,
  setRoundOverviewMode,
  onPatientSearchInput,
  togglePatientRoundSeen,
  syncRoundExpedienteLayout,
  renderRoundOverviewPanels,
  returnToRoundOverview,
  openFullExpedienteFromRound,
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
  windowHandlers2 as windowHandlers5,
  switchAppTab,
  syncMainAppTabA11y
};
//# sourceMappingURL=/js/chunks/chunk-46QO3ZUY.js.map
