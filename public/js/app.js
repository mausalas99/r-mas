import { storage } from './storage.js';
import {
  extraer,
  extraerConRango,
  marcarSegunRango,
  fmt,
  parseBH_,
  parseQS_,
  parseESC_,
  parsePFH_,
  parseGaso_,
  parsePIE_,
  parsearLCR,
  parseEGO_,
  parseCuantOrina_,
  parseCultivo_,
  procesarLabs,
  buildRefsBySectionFromReport,
  extractLabReportHora,
  looksLikeSomeLabReport,
  reprocessLabResultLines_,
  renderToken,
  renderEntry,
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  formatCultivoCondensedForCopy,
  formatBhExtrasDisplayLine,
  parseBhTrendValuesFromResLab,
  bhTrendDisplayTitle,
  BH_DIFF_DISPLAY_ORDER
} from './labs.js';
import {
  isDuplicateAgainstLatest,
  findDuplicateLabSetIdsToRemove,
  findExactDuplicateLabGroups,
  findNormalizedSourceDuplicateGroups,
  findConflictingSameDateTimeGroups,
  areLabSetsEquivalent,
  compareLabSetIdForDedupe,
  normalizeLabLine,
} from './lab-history-auto-store-core.mjs';
import {
  parseMedicationPaste,
  looksLikeSomeMedicationPaste,
  resolveFechaActualizacion,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  formatMedicationEgresoLine,
  classifyMedicationSoapCategory,
  applyMedCatalogOverlay,
  dosisBeforeSlash,
  incrementMedItemsDiaTratamiento,
} from './med-receta-core.mjs';
import {
  evaluateLabSuggestions,
  filterNewLabSuggestions,
} from './lab-clinical-suggestions.mjs';
import { isModeSala, getDefaultServicio, migrateToV3 } from './mode-features.mjs';
import { parseLanJoinQuery } from './lan-join-link.mjs';
import { isMobileWeb, blockIfMobileDocExport, mobileDocExportToast } from './mobile-web.mjs';
import { resolveQuickOutputAction } from './quick-output.mjs';
import { handleOutputDirFallback } from './output-dir-fallback.mjs';
import {
  dedupeTrendSetsForSeries,
  getSetTrendValueForSeries,
  buildTendChartLabels,
  buildTrendAxisMeta,
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  tendEligibleSectionKey,
} from './tend-core.mjs';
import { createTendGroupModal } from './tend-group-modal.mjs';
import { readTendCardOrder, writeTendCardOrder } from './tend-prefs.mjs';
import { createModalDismissRegistry } from './modal-dismiss.mjs';
import {
  t,
  getUiDensity,
  isPaseMode,
  setUiDensity,
  toggleTheme,
  setThemeMode,
  setFontZoom,
  setHighContrast,
  toggleHighContrast,
  applyI18n,
  applyHighContrast,
  applyUiDensity,
  applyFontZoom,
  syncThemeToggleIcon,
  initChromeAppearance,
  registerChromeRuntime,
  windowHandlers as chromeWindowHandlers,
} from './features/chrome.mjs';
import {
  registerLanRuntime,
  registerLanSaveHooks,
  windowHandlers as lanWindowHandlers,
  emitLiveSyncTodoUpsert,
  emitLiveSyncTodoDelete,
  closeConnectionDropdown,
  openConnectionDropdown,
  configureLanFromMobileJoin,
  syncLanHostTeamCodeSettingsInput,
  syncLanHostFirstTimeHintUi,
  DEFAULT_LAN_TEAM_CODE,
} from './features/lan-sync.mjs';
import {
  registerPatientsRuntime,
  windowHandlers as patientsWindowHandlers,
  renderPatientList,
  selectPatient,
  deletePatient,
  advanceRondaPatient,
  scrollActiveRondaCardIntoView,
  syncRoundExpedienteLayout,
  renderRoundOverviewPanels,
  returnToRoundOverview,
  openFullExpedienteFromRound,
  buildPatientEntry,
  findPatientByRegistro,
  ensureUniquePatientName,
  generatePatientId,
  openAddModal,
  openAddModalFromLab,
  closeModal,
  confirmCloseAddPatientModal,
  savePatient,
  onPatientSearchInput,
  focusPatientSearchInput,
  togglePatientPinned,
  togglePatientArchived,
  togglePatientRoundSeen,
  movePatientByOffset,
  toggleArchivedSection,
  toggleSidebarAutoHide,
  initSidebarAutoHide,
  initPatientModalEnterSave,
  setRoundOverviewMode,
  getRoundOverviewMode,
} from './features/patients.mjs';
import {
  registerLabPanelRuntime,
  windowHandlers as labPanelWindowHandlers,
  renderLabHistoryPanel,
  syncLabHistoryCollapseUI,
  setLabHistoryPanelCollapsed,
  getActiveLab as labPanelGetActiveLab,
  setActiveLab as labPanelSetActiveLab,
  rerenderParsedLabOutputAfterPrefsChange,
  clearLabWorkbenchMinimalDom,
  limpiarReporte,
  enviarLabsANota,
} from './features/lab-panel.mjs';
import {
  registerSoapEstadoRuntime,
  windowHandlers as soapEstadoWindowHandlers,
  mergeSoapMedField,
  openSOAPModalDirect,
  closeSOAPModal,
  copyToClipboardSafe,
  renderEstadoActualBar,
  renderEstadoActualButton,
} from './features/soap-estado.mjs';
import {
  registerProcedureAgendaRuntime,
  windowHandlers as agendaWindowHandlers,
  renderProcedureAgendaPanel,
  navigateProcedureAgendaWeek,
  openProcedureAgendaModal,
  closeProcedureAgendaModal,
  saveProcedureAgendaFromModal,
  deleteProcedureAgendaFromModal,
} from './features/agenda.mjs';
import {
  registerExpedienteRuntime,
  refreshTendenciasOrCultivosPanel,
  renderListadoForm,
  removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels,
  buildCultivoOutputHtmlFragments,
  isResLabChunkPureCultivo,
  extractCultivoTableRowsFromHistory,
  filterCultivoRowsSignificantFlip,
  formatPaseCultivoResistenciasHtml,
  paseCultivoAtbBlockHtml,
  renderPatientDataPane,
  windowHandlers as expedienteWindowHandlers,
} from './features/expediente.mjs';
import {
  extractParsedValues,
  buildParsedBySectionFromResLabs,
  renderDiagramas,
} from './features/diagrams.mjs';
import {
  registerProductivityRuntime,
  productivityWindowHandlers,
  initProductivityKeyboardShortcuts,
  pushUndoSnapshot,
} from './features/productivity.mjs';
import {
  registerSettingsHelpRuntime,
  settingsHelpWindowHandlers,
  onChromeGuidedTourPaseEnter,
  maybeShowReleaseNotesFor,
  resolveAppVersionForTour,
  markGuidedTourVersionDone,
  initGuidedTourGate,
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  syncTeamSyncHeaderButton,
  closeSettingsDropdown,
} from './features/settings-help.mjs';
import {
  registerPlatformRuntime,
  platformWindowHandlers,
  addAuditEntry,
  incrementPendingJobs,
  decrementPendingJobs,
  syncOfflineButtonStates,
  isRpcOffline,
  initRpcServerHealthWatch,
  initIdleLockFeature,
  syncIdleLockSelectUi,
  syncPreimportBackupUi,
  syncUpdateChannelUI,
  syncUpdateTelemetryUI,
  initUpdateChannelAndGate,
  initGoalGFeatures,
  applyImportEntry,
} from './features/platform.mjs';
import {
  registerNotesIndicacionesRuntime,
  applyProfileToNoteIfEmpty,
  renderNoteForm,
  renderIndicaForm,
  windowHandlers as notesIndicacionesWindowHandlers,
} from './features/notes-indicaciones.mjs';
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  listadoProblemas,
  medNotaSelectionByPatient,
  initAppState,
  saveState,
  setPatients,
  setNotes,
  setIndicaciones,
  setLabHistory,
  setMedRecetaByPatient,
} from './app-state.mjs';

initAppState();

var activeId     = null;
var activeInner  = 'todo';
var activeAppTab = 'lab';
/** Una instancia Sortable.js por rejilla de tendencias (por sección de laboratorio). */
var _tendCardSortables = [];
var profileSectionVisible = false;
var settings     = storage.getSettings();
var __v3MigratedThisBoot = migrateToV3(settings);
if (__v3MigratedThisBoot) storage.saveSettings(settings);

var sparkCharts  = {};
var detailChart  = null;
var medOutputTab = 'full';

var TEND_UNITS = {
  Hb:'g/dL',  Hto:'%',    Leu:'K/μL', Plt:'K/μL', VCM:'fL', HCM:'pg',
  RBC:'M/μL', CHCM:'g/dL', RDW:'%', MPV:'fL',
  Neu:'K/μL', Eos:'K/μL', Lin:'K/μL', Mono:'K/μL', Baso:'K/μL',
  NeuPct:'%', LinPct:'%', MonoPct:'%', EosPct:'%', BasoPct:'%',
  Bandas:'%', Mielo:'%', Metamielo:'%', Promielo:'%', Blastos:'%', Atipicos:'%',
  Ret:'%', TP:'s', TTP:'s', INR:'', Fib:'mg/dL', DD:'ng/mL',
  Glu:'mg/dL',Cr:'mg/dL', eTFG:'mL/min/1.73m²', BUN:'mg/dL',PCR:'mg/dL',
  AU:'mg/dL', TGL:'mg/dL',COL:'mg/dL', VSG:'mm/h', CPK:'U/L',
  Na:'mEq/L', K:'mEq/L',  Cl:'mEq/L', HCO3:'mEq/L',Ca:'mg/dL', F:'mg/dL', Mg:'mEq/L',
  AST:'U/L',  ALT:'U/L',  FA:'U/L',   BT:'mg/dL', Alb:'g/dL', BD:'mg/dL', BI:'mg/dL',
  LDH:'U/L', Amil:'U/L',
  Lactato:'mmol/L', Dens:'g/L', Prot:'mg/dL', Vol:'mL', GLU:'mg/dL', Bica:'mEq/L', pH:'', pCO2:'mmHg', pO2:'mmHg',
  iCa:'mmol/L'
};
var TEND_REF = {
  Hb:[12,17.5], Hto:[36,53], Leu:[4,11], Plt:[150,400], VCM:[80,100], HCM:[27,33],
  RBC:[4.2,5.4], CHCM:[31.5,34.5], RDW:[11.5,14.5], MPV:[7.4,10.4],
  Neu:[1.5,8], Eos:[0,0.6], Lin:[0.6,3.4], Mono:[0,0.9], Baso:[0,0.2],
  NeuPct:[37,80], LinPct:[10,50], MonoPct:[0,12], EosPct:[0,7], BasoPct:[0,2.5],
  Bandas:[0,5], Mielo:[0,1], Metamielo:[0,1], Promielo:[0,1], Blastos:[0,1], Atipicos:[0,5],
  Ret:[0.5,2.5], TP:[11,14], TTP:[25,35], INR:[0.8,1.2], Fib:[150,400], DD:[0,500],
  Glu:[70,100], Cr:[0.5,1.3], BUN:[7,20], PCR:[0,0.5],
  AU:[3.5,7], TGL:[0,150], COL:[0,200], CPK:[30,200],
  Na:[136,145], K:[3.5,5.0], Cl:[96,106], HCO3:[22,28], Ca:[8.5,10.5], F:[2.5,4.5], Mg:[1.6,2.6],
  AST:[10,40], ALT:[7,56], FA:[44,147], BT:[0.1,1.2], Alb:[3.5,5.2], BD:[0,0.3], BI:[0.1,1],
  LDH:[120,250], Amil:[30,110],
  LCR_pH:[7.28,7.42], LCR_Leu:[0,5], LCR_Glu:[40,80], LCR_Cl:[118,132], LCR_Prot:[15,45],
  Liq_pH:[7.1,7.6], Liq_Glu:[20,600], Liq_Leu:[0,5000], Liq_LDH:[0,500], Liq_Dens:[1000,1050], Liq_Prot:[10,50]
};
/** Rangos orientativos en gasometría (arterial/capilar; solo tendencias / color). */
var TEND_REF_GASES = {
  pH: [7.35, 7.45],
  pCO2: [35, 45],
  pO2: [83, 100],
  Lactato: [0.5, 2.2],
  Na: [135, 148],
  K: [3.5, 5.3],
  GLU: [70, 110],
  Hto: [34, 50],
  Bica: [22, 28],
  iCa: [1.12, 1.32]
};
var TEND_SECTION_LABELS = {
  BH: 'Biometría hemática',
  QS: 'Química sanguínea',
  ESC: 'Electrolitos séricos',
  PFHs: 'Función hepática',
  GASES: 'Gasometría',
  LCR: 'LCR (citoquímico)',
  Liq: 'Líquidos corporales',
  Prot12h: 'Proteinuria 12 h',
  Prot24h: 'Proteinuria 24 h',
  PIE: 'Prueba de embarazo',
  EGO: 'EGO',
  CUANTORINA: 'Cuantificación urinaria',
  PltCit: 'Plaquetas (citrato)',
  FROTIS: 'Frotis de sangre'
};
var TEND_SECTION_ORDER = [
  'BH', 'PltCit', 'QS', 'ESC', 'PFHs', 'GASES', 'LCR', 'Liq', 'Prot12h', 'Prot24h', 'PIE', 'EGO', 'CUANTORINA', 'FROTIS'
];

/**
 * Series tendibles declaradas (parsearSecciones / resLabs). Pueden añadirse más vía merge dinámico
 * si aparecen pares sección/campo numéricos no listados.
 */
var TEND_SERIES_CATALOG = [
  { sectionKey: 'BH', fieldKey: 'Hb', cardTitle: 'Hb' },
  { sectionKey: 'BH', fieldKey: 'Hto', cardTitle: 'Hto' },
  { sectionKey: 'BH', fieldKey: 'VCM', cardTitle: 'VCM' },
  { sectionKey: 'BH', fieldKey: 'HCM', cardTitle: 'HCM' },
  { sectionKey: 'BH', fieldKey: 'Leu', cardTitle: 'Leucocitos' },
  { sectionKey: 'BH', fieldKey: 'Neu', cardTitle: 'Neutrófilos' },
  { sectionKey: 'BH', fieldKey: 'Eos', cardTitle: 'Eosinófilos' },
  { sectionKey: 'BH', fieldKey: 'Plt', cardTitle: 'Plaquetas' },
  { sectionKey: 'PltCit', fieldKey: 'Plt', cardTitle: 'Plaquetas (citrato)' },
  { sectionKey: 'BH', fieldKey: 'Ret', cardTitle: 'Reticulocitos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'TP', cardTitle: 'TP', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'TTP', cardTitle: 'TTP', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'INR', cardTitle: 'INR', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Fib', cardTitle: 'Fibrinógeno', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'DD', cardTitle: 'Dímero D', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'RBC', cardTitle: 'Eritrocitos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'CHCM', cardTitle: 'CHCM', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'RDW', cardTitle: 'RDW', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Lin', cardTitle: 'Linfocitos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Mono', cardTitle: 'Monocitos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Baso', cardTitle: 'Basófilos', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'MPV', cardTitle: 'VPM', hiddenByDefault: true },
  { sectionKey: 'BH', fieldKey: 'Bandas', cardTitle: bhTrendDisplayTitle('Bandas') },
  { sectionKey: 'BH', fieldKey: 'Mielo', cardTitle: bhTrendDisplayTitle('Mielo') },
  { sectionKey: 'BH', fieldKey: 'Metamielo', cardTitle: bhTrendDisplayTitle('Metamielo') },
  { sectionKey: 'BH', fieldKey: 'Promielo', cardTitle: bhTrendDisplayTitle('Promielo') },
  { sectionKey: 'BH', fieldKey: 'Blastos', cardTitle: bhTrendDisplayTitle('Blastos') },
  { sectionKey: 'BH', fieldKey: 'Atipicos', cardTitle: bhTrendDisplayTitle('Atipicos') },
  { sectionKey: 'BH', fieldKey: 'NeuPct', cardTitle: bhTrendDisplayTitle('NeuPct') },
  { sectionKey: 'BH', fieldKey: 'LinPct', cardTitle: bhTrendDisplayTitle('LinPct') },
  { sectionKey: 'BH', fieldKey: 'MonoPct', cardTitle: bhTrendDisplayTitle('MonoPct') },
  { sectionKey: 'BH', fieldKey: 'EosPct', cardTitle: bhTrendDisplayTitle('EosPct') },
  { sectionKey: 'BH', fieldKey: 'BasoPct', cardTitle: bhTrendDisplayTitle('BasoPct') },
  { sectionKey: 'QS', fieldKey: 'Glu', cardTitle: 'Glucosa' },
  { sectionKey: 'QS', fieldKey: 'Cr', cardTitle: 'Creatinina' },
  { sectionKey: 'QS', fieldKey: 'eTFG', cardTitle: 'eTFG (CKD-EPI 2021)' },
  { sectionKey: 'QS', fieldKey: 'BUN', cardTitle: 'BUN' },
  { sectionKey: 'QS', fieldKey: 'PCR', cardTitle: 'PCR' },
  { sectionKey: 'QS', fieldKey: 'PCT', cardTitle: 'Procalcitonina' },
  { sectionKey: 'QS', fieldKey: 'AU', cardTitle: 'Ácido úrico' },
  { sectionKey: 'QS', fieldKey: 'TGL', cardTitle: 'Triglicéridos' },
  { sectionKey: 'QS', fieldKey: 'COL', cardTitle: 'Colesterol' },
  { sectionKey: 'QS', fieldKey: 'VSG', cardTitle: 'VSG' },
  { sectionKey: 'QS', fieldKey: 'CPK', cardTitle: 'CPK' },
  { sectionKey: 'ESC', fieldKey: 'Na', cardTitle: 'Na' },
  { sectionKey: 'ESC', fieldKey: 'K', cardTitle: 'K' },
  { sectionKey: 'ESC', fieldKey: 'Cl', cardTitle: 'Cl' },
  { sectionKey: 'ESC', fieldKey: 'Ca', cardTitle: 'Ca' },
  { sectionKey: 'ESC', fieldKey: 'F', cardTitle: 'Fósforo' },
  { sectionKey: 'ESC', fieldKey: 'Mg', cardTitle: 'Mg' },
  { sectionKey: 'PFHs', fieldKey: 'Alb', cardTitle: 'Albúmina' },
  { sectionKey: 'PFHs', fieldKey: 'AST', cardTitle: 'AST' },
  { sectionKey: 'PFHs', fieldKey: 'ALT', cardTitle: 'ALT' },
  { sectionKey: 'PFHs', fieldKey: 'FA', cardTitle: 'FA' },
  { sectionKey: 'PFHs', fieldKey: 'BT', cardTitle: 'Bilirrubina total' },
  { sectionKey: 'PFHs', fieldKey: 'BD', cardTitle: 'Bilirrubina directa' },
  { sectionKey: 'PFHs', fieldKey: 'BI', cardTitle: 'Bilirrubina indirecta' },
  { sectionKey: 'PFHs', fieldKey: 'LDH', cardTitle: 'LDH' },
  { sectionKey: 'PFHs', fieldKey: 'Amil', cardTitle: 'Amilasa' },
  { sectionKey: 'GASES', fieldKey: 'pH', cardTitle: 'pH (gas)' },
  { sectionKey: 'GASES', fieldKey: 'pCO2', cardTitle: 'pCO₂ (gas)' },
  { sectionKey: 'GASES', fieldKey: 'pO2', cardTitle: 'pO₂ (gas)' },
  { sectionKey: 'GASES', fieldKey: 'Na', cardTitle: 'Na (gas)' },
  { sectionKey: 'GASES', fieldKey: 'K', cardTitle: 'K (gas)' },
  { sectionKey: 'GASES', fieldKey: 'GLU', cardTitle: 'Glu (gas)' },
  { sectionKey: 'GASES', fieldKey: 'Lactato', cardTitle: 'Lactato (gas)' },
  { sectionKey: 'GASES', fieldKey: 'Bica', cardTitle: 'HCO₃⁻ (gas)' },
  { sectionKey: 'GASES', fieldKey: 'Hto', cardTitle: 'Hto (gas)' },
  { sectionKey: 'GASES', fieldKey: 'iCa', cardTitle: 'Ca²⁺ ionizado (gas)' },
  { sectionKey: 'LCR', fieldKey: 'pH', cardTitle: 'pH (LCR)' },
  { sectionKey: 'LCR', fieldKey: 'Leu', cardTitle: 'Leucocitos (LCR)' },
  { sectionKey: 'LCR', fieldKey: 'Glu', cardTitle: 'Glucosa (LCR)' },
  { sectionKey: 'LCR', fieldKey: 'Prot', cardTitle: 'Proteínas (LCR)' },
  { sectionKey: 'LCR', fieldKey: 'Cl', cardTitle: 'Cl (LCR)' },
  { sectionKey: 'Liq', fieldKey: 'Dens', cardTitle: 'Densidad (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'pH', cardTitle: 'pH (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'Glu', cardTitle: 'Glucosa (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'Prot', cardTitle: 'Proteínas (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'LDH', cardTitle: 'LDH (liq.)' },
  { sectionKey: 'Liq', fieldKey: 'Leu', cardTitle: 'Leucocitos (liq.)' }
];
var TEND_SECTION_EXPANDED_LS = 'rpc-tend-sections-expanded';
var LAB_OUTPUT_PREFS_KEY = 'rpc-lab-output-prefs-v1';
var LAB_BH_EXT_ORDER = [
  'RBC', 'CHCM', 'RDW', 'MPV', 'Ret',
  'TP', 'TTP', 'INR', 'Lin', 'Mono', 'Baso', 'NeuPct', 'LinPct', 'MonoPct', 'EosPct',
  'BasoPct', 'Bandas', 'Mielo', 'Metamielo', 'Promielo', 'Blastos', 'Atipicos',
];

function getLabOutputPrefs() {
  try {
    var raw = localStorage.getItem(LAB_OUTPUT_PREFS_KEY);
    var o = raw ? JSON.parse(raw) : {};
    return {
      showBhExtendedLine: !!o.showBhExtendedLine,
      hideGasoAdvInterp: !!o.hideGasoAdvInterp,
    };
  } catch (_e) {
    return { showBhExtendedLine: false, hideGasoAdvInterp: false };
  }
}

function setLabOutputPrefs(partial) {
  var cur = getLabOutputPrefs();
  if (partial.showBhExtendedLine != null) cur.showBhExtendedLine = !!partial.showBhExtendedLine;
  if (partial.hideGasoAdvInterp != null) cur.hideGasoAdvInterp = !!partial.hideGasoAdvInterp;
  try {
    localStorage.setItem(LAB_OUTPUT_PREFS_KEY, JSON.stringify(cur));
  } catch (_e) {}
  return cur;
}

function isGasoInterpretacionResLabChunk(text) {
  var head = String(text || '').split('\n')[0].trim();
  return /^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(head);
}

function isBhMainResLabChunk(text) {
  if (!text) return false;
  var head = String(text).split('\n')[0].trim();
  return head.indexOf('BH\t') === 0 || /^BH:?\s*$/.test(head) || /^BH\s/.test(head);
}

function formatBhExtendedTabLine(bhExtras, sourceText) {
  return formatBhExtrasDisplayLine(bhExtras, sourceText || '');
}

function _syncLabPrefSwitchAria(el) {
  if (!el || el.getAttribute('role') !== 'switch') return;
  el.setAttribute('aria-checked', el.checked ? 'true' : 'false');
}

function openLabDisplayPrefsModal() {
  var backdrop = document.getElementById('lab-display-prefs-backdrop');
  if (!backdrop) return;
  var p = getLabOutputPrefs();
  var cbBh = document.getElementById('lab-pref-bh-extended');
  var cbGaso = document.getElementById('lab-pref-gaso-extended');
  if (cbBh) {
    cbBh.checked = p.showBhExtendedLine;
    _syncLabPrefSwitchAria(cbBh);
  }
  if (cbGaso) {
    cbGaso.checked = !p.hideGasoAdvInterp;
    _syncLabPrefSwitchAria(cbGaso);
  }
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

function closeLabDisplayPrefsModal() {
  var backdrop = document.getElementById('lab-display-prefs-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
}

function onLabDisplayPrefsChanged() {
  var cbBh = document.getElementById('lab-pref-bh-extended');
  var cbGaso = document.getElementById('lab-pref-gaso-extended');
  setLabOutputPrefs({
    showBhExtendedLine: cbBh ? cbBh.checked : false,
    hideGasoAdvInterp: cbGaso ? !cbGaso.checked : false,
  });
  _syncLabPrefSwitchAria(cbBh);
  _syncLabPrefSwitchAria(cbGaso);
  rerenderParsedLabOutputAfterPrefsChange();
}

function isLikelyLabDataLine(line) {
  if (!line) return false;
  var t = line.trim();
  if (!t) return false;
  if (/^\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?$/.test(t)) return false; // date-only line
  if (t.indexOf('\t') !== -1) return true;
  if (/^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|CULTIVO)\b/i.test(t)) return true;
  // Legacy plain-text rows still include numbers and at least one section token
  return /\d/.test(t) && /[A-Za-z]/.test(t);
}

function extractLabDataLines(lines) {
  return (lines || []).filter(isLikelyLabDataLine);
}

function buildLabSetDateLine(set) {
  if (!set) return '';
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
  var rawHora = normalizeHoraLabHistory(set.hora);
  if (!rawDate) return '';
  return rawHora ? (rawDate + ' ' + rawHora.slice(0, 5)) : rawDate;
}

/** Fecha abreviada DD/MM para el bloque de estudios en la nota (sin hora). */
function buildLabSetDateLineForNota(set) {
  if (!set) return '';
  if (set.fecha === 'Anterior' || set.id === 'migrated-anterior') return 'Anterior';
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
  if (!rawDate) return '';
  if (rawDate.length >= 5 && rawDate.indexOf('/') !== -1) return rawDate.slice(0, 5);
  return rawDate;
}

/** Encabezado de sección de laboratorio tabular (BH, QS, …). */
function isLabSectionHeaderLine(s) {
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS)\b/i.test(String(s).trim());
}

/**
 * Inicio de bloque microbiología / cultivos (no solo líneas CULTIVO\t del parser).
 * Tras activarse, todo va a cultivos hasta el siguiente encabezado BH|QS|…
 */
function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (/^CULTIVO\b/i.test(t)) return true;
  if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(t)) return true;
  if (/^BACTERIOLOGIA\b/i.test(t)) return true;
  if (/^UROCULTIVO\b/i.test(t)) return true;
  if (/^HEMOCULTIVO\b/i.test(t)) return true;
  if (/^FUNGICULTIVO\b/i.test(t)) return true;
  if (/^TINCION\s+DE\s+GRAM/i.test(t)) return true;
  if (/^CATETER\b/i.test(t)) return true;
  if (/^ATB\b/i.test(t)) return true;
  if (/^Cuenta:/i.test(t)) return true;
  if (/^[•\u2022\u00B7]\s*/.test(t)) return true;
  if (/^Cultivos$/i.test(t)) return true;
  if (t.indexOf('\t') === -1 && /^[A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÚÑ]+){1,4}$/.test(t)) {
    var ws = t.split(/\s+/).filter(Boolean);
    if (ws.length < 2 || ws[0].length < 5 || ws[1].length < 3) return false;
    if (/^(INTERCONSULTA|SALA|SERVICIO|UNIDAD|PACIENTE|HOSPITAL|AREA|CONTROL|DEPARTAMENTO)/i.test(ws[0])) return false;
    if (/^(CARDIOLOGIA|CIRUGIA|URGENCIAS|INTERNA|MEDICINA|PEDIATRIA|NEFROLOGIA|HEMATOLOGIA)$/i.test(ws[1])) return false;
    return true;
  }
  return false;
}

/** Parte líneas de un set en laboratorio convencional vs cultivos / bacteriología. */
function splitResLabsByTipo(rows) {
  var labs = [];
  var cultivo = [];
  var inCultivo = false;
  (rows || []).forEach(function (row) {
    var raw = row == null ? '' : row;
    var s = String(raw).trim();
    if (isLabSectionHeaderLine(s)) {
      inCultivo = false;
      labs.push(raw);
      return;
    }
    if (inCultivo) {
      cultivo.push(raw);
      return;
    }
    if (isCultivoBlockStartLine(s)) {
      inCultivo = true;
      cultivo.push(raw);
      return;
    }
    labs.push(raw);
  });
  return { labs: labs, cultivo: cultivo };
}

function dayKeyFromLabSet(set) {
  if (!set || set.fecha === 'Anterior') return 'Anterior';
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof ms === 'number' && isFinite(ms)) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  var n = normalizeFechaLabHistory(set.fecha);
  if (n && n !== 'Anterior') {
    var ms2 = parseFechaLabToMs(n, set.hora);
    if (typeof ms2 === 'number' && isFinite(ms2)) {
      var d2 = new Date(ms2);
      return d2.getFullYear() + '-' + (d2.getMonth() + 1) + '-' + d2.getDate();
    }
  }
  return 'unknown';
}

function dayKeyToSortMs(dk) {
  if (dk === 'Anterior') return Number.NEGATIVE_INFINITY;
  if (dk === 'unknown') return Number.MIN_SAFE_INTEGER;
  var p = dk.split('-').map(function (x) {
    return parseInt(x, 10);
  });
  if (p.length !== 3 || !isFinite(p[0])) return 0;
  return new Date(p[0], p[1] - 1, p[2]).getTime();
}

/** Clasificación del conjunto completo (no mezclar en fusión de historial). */
function primaryTipoForLabSet(resLabs) {
  var sp = splitResLabsByTipo(resLabs || []);
  var hasL = sp.labs.some(function (r) {
    return String(r || '').trim();
  });
  var hasC = sp.cultivo.some(function (r) {
    return String(r || '').trim();
  });
  if (hasC && hasL) return 'mixed';
  if (hasC) return 'cultivo';
  return 'labs';
}

function rebuildEstudiosFromLabHistory(patientId) {
  if (!patientId) return;
  if (!notes[patientId]) notes[patientId] = {};
  var ordered = sortLabHistoryChronological(ensureParsedLabHistory(patientId));
  if (!ordered.length) {
    notes[patientId].estudios = '';
    return;
  }
  var byDay = Object.create(null);
  ordered.forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var dk = dayKeyFromLabSet(set);
    if (!byDay[dk]) byDay[dk] = { sets: [] };
    byDay[dk].sets.push(set);
  });
  var dayKeys = Object.keys(byDay).sort(function (a, b) {
    if (a === 'Anterior') return 1;
    if (b === 'Anterior') return -1;
    return dayKeyToSortMs(b) - dayKeyToSortMs(a);
  });
  var lines = [];
  dayKeys.forEach(function (dk) {
    var sets = byDay[dk].sets.slice().sort(function (a, b) {
      var ta = parseFechaLabToMs(a.fecha, a.hora);
      var tb = parseFechaLabToMs(b.fecha, b.hora);
      if (typeof ta === 'number' && typeof tb === 'number' && isFinite(ta) && isFinite(tb) && ta !== tb) return tb - ta;
      return compareLabSetIdForDedupe(a, b);
    });
    var labsAcc = [];
    var cultAcc = [];
    var seenLab = Object.create(null);
    var seenCul = Object.create(null);
    sets.forEach(function (set) {
      var sp = splitResLabsByTipo(set.resLabs);
      sp.labs.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (!clean) return;
        var norm = normalizeLabLine(clean);
        if (seenLab[norm]) return;
        seenLab[norm] = true;
        labsAcc.push(row);
      });
      sp.cultivo.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (!clean) return;
        var norm = normalizeLabLine(clean);
        if (seenCul[norm]) return;
        seenCul[norm] = true;
        cultAcc.push(row);
      });
    });
    if (!labsAcc.length && !cultAcc.length) return;
    var headerSet = sets[0];
    var dateLine = buildLabSetDateLineForNota(headerSet);
    if (dateLine) lines.push(dateLine);
    if (labsAcc.length) {
      labsAcc.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (clean) lines.push(clean);
      });
    }
    if (cultAcc.length) {
      if (labsAcc.length) lines.push('');
      lines.push('Cultivos');
      cultAcc.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (clean) lines.push(clean);
      });
    }
    lines.push('');
  });
  while (lines.length && !String(lines[lines.length - 1]).trim()) lines.pop();
  notes[patientId].estudios = lines.join('\n');
}

function toTrendAscendingSets(sets) {
  return (sets || []).slice().reverse();
}

function tendSectionExpandedRead() {
  try {
    var raw = localStorage.getItem(TEND_SECTION_EXPANDED_LS);
    if (!raw) return {};
    var o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch (_e) {
    return {};
  }
}

function tendSectionExpandedWrite(map) {
  try {
    localStorage.setItem(TEND_SECTION_EXPANDED_LS, JSON.stringify(map || {}));
  } catch (_e) {}
}

/** @param {string} sectionKey */
function tendSectionIsExpanded(sectionKey) {
  var m = tendSectionExpandedRead();
  if (!Object.prototype.hasOwnProperty.call(m, sectionKey)) return true;
  return m[sectionKey] !== false;
}

function toggleTendSection(ev, sectionKey) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var m = tendSectionExpandedRead();
  var cur = tendSectionIsExpanded(sectionKey);
  m[sectionKey] = !cur;
  tendSectionExpandedWrite(m);
  renderTendencias();
}

/** Título y unidad para tarjeta spark (evita «%» duplicado en título y unidad). */
function tendCardLabelParts(sectionKey, fieldKey) {
  var spec = tendFindSeriesSpec(sectionKey, fieldKey);
  var title = spec && spec.cardTitle ? String(spec.cardTitle) : String(fieldKey);
  var unit = tendUnitForSeries(sectionKey, fieldKey);
  if (unit === '%') {
    title = title.replace(/\s*%+\s*$/u, '').trim();
  }
  return { title: title, unit: unit };
}

function tendUnitForSeries(sectionKey, fieldKey) {
  if (sectionKey === 'GASES') {
    if (fieldKey === 'GLU') return TEND_UNITS.Glu || '';
    if (fieldKey === 'Na') return TEND_UNITS.Na || '';
    if (fieldKey === 'K') return TEND_UNITS.K || '';
    if (fieldKey === 'Hto') return TEND_UNITS.Hto || '';
    if (fieldKey === 'Bica') return TEND_UNITS.HCO3 || '';
    if (fieldKey === 'pCO2' || fieldKey === 'pO2') return 'mmHg';
    if (fieldKey === 'Lactato') return 'mmol/L';
    if (fieldKey === 'pH') return '';
  }
  if (sectionKey === 'LCR') {
    if (fieldKey === 'pH') return '';
    if (fieldKey === 'Leu') return '/μL';
    if (fieldKey === 'Glu') return TEND_UNITS.Glu || '';
    if (fieldKey === 'Prot') return 'mg/dL';
    if (fieldKey === 'Cl') return TEND_UNITS.Cl || '';
  }
  if (sectionKey === 'Liq') {
    if (fieldKey === 'pH') return '';
    if (fieldKey === 'Dens') return 'g/L';
    if (fieldKey === 'Glu') return TEND_UNITS.Glu || '';
    if (fieldKey === 'Prot') return 'mg/dL';
    if (fieldKey === 'LDH') return TEND_UNITS.LDH || '';
    if (fieldKey === 'Leu') return '/μL';
  }
  return TEND_UNITS[fieldKey] || '';
}

/** Rango orientativo fijo (respaldo si el reporte no trae referencia). */
function tendRefOrientative(sectionKey, fieldKey) {
  if (sectionKey === 'GASES') {
    var gg = TEND_REF_GASES[fieldKey];
    if (gg) return gg;
    if (fieldKey === 'Bica') return TEND_REF.HCO3;
    return null;
  }
  if (sectionKey === 'LCR') {
    var lr = {
      pH: TEND_REF.LCR_pH,
      Leu: TEND_REF.LCR_Leu,
      Glu: TEND_REF.LCR_Glu,
      Cl: TEND_REF.LCR_Cl,
      Prot: TEND_REF.LCR_Prot
    };
    return lr[fieldKey] || null;
  }
  if (sectionKey === 'Liq') {
    var lq = {
      pH: TEND_REF.Liq_pH,
      Glu: TEND_REF.Liq_Glu,
      Leu: TEND_REF.Liq_Leu,
      LDH: TEND_REF.Liq_LDH,
      Dens: TEND_REF.Liq_Dens,
      Prot: TEND_REF.Liq_Prot
    };
    return lq[fieldKey] || null;
  }
  return TEND_REF[fieldKey] || null;
}

function tendRefFromLabSet(set, sectionKey, fieldKey) {
  var refs = set && set.refsBySection;
  var row = refs && refs[sectionKey];
  var r = row && row[fieldKey];
  if (r && r.length === 2 && isFinite(r[0]) && isFinite(r[1]) && r[1] > r[0]) return r;
  return null;
}

/** Rango del reporte (set preferido o historial reciente); si no, orientativo. */
function tendRefForSeries(history, sectionKey, fieldKey, preferSet) {
  var fromPrefer = preferSet ? tendRefFromLabSet(preferSet, sectionKey, fieldKey) : null;
  if (fromPrefer) return fromPrefer;
  if (history && history.length) {
    var sorted = sortLabHistoryChronological(history);
    for (var i = sorted.length - 1; i >= 0; i--) {
      var r = tendRefFromLabSet(sorted[i], sectionKey, fieldKey);
      if (r) return r;
    }
  }
  return tendRefOrientative(sectionKey, fieldKey);
}

function tendCatalogSeriesKey(sectionKey, fieldKey) {
  return String(sectionKey) + '|' + String(fieldKey);
}

function orderTrendSeriesBySaved(specs, savedOrder) {
  var rank = Object.create(null);
  if (savedOrder && savedOrder.length) {
    savedOrder.forEach(function (key, i) {
      rank[key] = i;
    });
  }
  var missingBase = (savedOrder && savedOrder.length ? savedOrder.length : specs.length) + 1000;
  return specs.slice().sort(function (a, b) {
    var ka = tendCatalogSeriesKey(a.sectionKey, a.fieldKey);
    var kb = tendCatalogSeriesKey(b.sectionKey, b.fieldKey);
    var ra = Object.prototype.hasOwnProperty.call(rank, ka) ? rank[ka] : missingBase;
    var rb = Object.prototype.hasOwnProperty.call(rank, kb) ? rank[kb] : missingBase;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

function tendHiddenSeriesRead() {
  try {
    var j = localStorage.getItem(TEND_HIDDEN_SERIES_LS);
    if (!j) return [];
    var a = JSON.parse(j);
    return Array.isArray(a) ? a : [];
  } catch (_e) {
    return [];
  }
}

function tendHiddenSeriesWrite(arr) {
  try {
    localStorage.setItem(TEND_HIDDEN_SERIES_LS, JSON.stringify(arr || []));
  } catch (_e) {}
}

function tendSeriesIsUserHidden(sectionKey, fieldKey) {
  return tendHiddenSeriesRead().indexOf(tendCatalogSeriesKey(sectionKey, fieldKey)) !== -1;
}

function tendSeriesSetUserHidden(sectionKey, fieldKey, hidden) {
  var k = tendCatalogSeriesKey(sectionKey, fieldKey);
  var a = tendHiddenSeriesRead().slice();
  var i = a.indexOf(k);
  if (hidden && i === -1) a.push(k);
  if (!hidden && i !== -1) a.splice(i, 1);
  tendHiddenSeriesWrite(a);
}

function seedTendHiddenDefaults() {
  var SEED_KEY = 'rpc-tend-hidden-seeded-v2';
  try {
    if (localStorage.getItem(SEED_KEY) === '1') return;
  } catch (_e) {
    return;
  }
  var current = tendHiddenSeriesRead().slice();
  var seen = {};
  current.forEach(function (k) {
    seen[k] = true;
  });
  var changed = false;
  TEND_SERIES_CATALOG.forEach(function (sp) {
    if (sp && sp.hiddenByDefault) {
      var key = tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
      if (!seen[key]) {
        current.push(key);
        seen[key] = true;
        changed = true;
      }
    }
  });
  try {
    if (changed) tendHiddenSeriesWrite(current);
    localStorage.setItem(SEED_KEY, '1');
  } catch (_e) {
    /* ignore */
  }
}

function tendFindSeriesSpec(sectionKey, fieldKey) {
  for (var i = 0; i < TEND_SERIES_CATALOG.length; i++) {
    if (
      TEND_SERIES_CATALOG[i].sectionKey === sectionKey &&
      TEND_SERIES_CATALOG[i].fieldKey === fieldKey
    ) {
      return TEND_SERIES_CATALOG[i];
    }
  }
  return {
    sectionKey: sectionKey,
    fieldKey: fieldKey,
    cardTitle: fieldKey + ' · ' + sectionKey
  };
}

/** Catálogo estático + pares numéricos presentes en historial y no declarados. */
function buildMergedTrendSeriesCatalog(history) {
  var mapped = Object.create(null);
  var out = [];
  function add(spec) {
    var k = tendCatalogSeriesKey(spec.sectionKey, spec.fieldKey);
    if (mapped[k]) return;
    mapped[k] = true;
    out.push(spec);
  }
  TEND_SERIES_CATALOG.forEach(function (e) {
    add({ sectionKey: e.sectionKey, fieldKey: e.fieldKey, cardTitle: e.cardTitle });
  });
  (history || []).forEach(function (set) {
    var pb = set && set.parsedBySection;
    if (!pb) return;
    Object.keys(pb).forEach(function (sk) {
      if (!tendEligibleSectionKey(sk)) return;
      var row = pb[sk];
      if (!row) return;
      Object.keys(row).forEach(function (fk) {
        var k = tendCatalogSeriesKey(sk, fk);
        if (mapped[k]) return;
        var v = row[fk];
        if (!isFinite(Number(v))) return;
        mapped[k] = true;
        out.push({
          sectionKey: sk,
          fieldKey: fk,
          cardTitle: sk === 'BH' ? bhTrendDisplayTitle(fk) : fk + ' · ' + sk,
          _dynamic: true
        });
      });
    });
  });
  return out;
}

function getTendCatalogSpecsForSection(sectionKey, history) {
  var specs = buildMergedTrendSeriesCatalog(history || []).filter(function (sp) {
    return sp.sectionKey === sectionKey;
  });
  if (sectionKey === 'BH') {
    var rank = Object.create(null);
    BH_DIFF_DISPLAY_ORDER.forEach(function (fk, i) {
      rank[fk] = i;
    });
    specs.sort(function (a, b) {
      var ra = Object.prototype.hasOwnProperty.call(rank, a.fieldKey) ? rank[a.fieldKey] : 999;
      var rb = Object.prototype.hasOwnProperty.call(rank, b.fieldKey) ? rank[b.fieldKey] : 999;
      if (ra !== rb) return ra - rb;
      return String(a.cardTitle).localeCompare(String(b.cardTitle), 'es');
    });
  }
  return specs;
}

function getTendSectionLabel(sectionKey) {
  return TEND_SECTION_LABELS[sectionKey] || sectionKey;
}

function tendEyeVisibilitySvg() {
  return (
    '<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
  );
}

function tendAbnormalOnlyRead() {
  try {
    return localStorage.getItem(TEND_ABNORMAL_ONLY_LS) === '1';
  } catch (_e) {
    return false;
  }
}

function tendAbnormalOnlyWrite(on) {
  try {
    if (on) localStorage.setItem(TEND_ABNORMAL_ONLY_LS, '1');
    else localStorage.removeItem(TEND_ABNORMAL_ONLY_LS);
  } catch (_e) {}
}

function tendSeriesLatestAbnormal(history, sectionKey, fieldKey) {
  var raw = history.filter(function (s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
  });
  var setsDesc = dedupeTrendSetsForSeries(raw, sectionKey, fieldKey);
  if (setsDesc.length < 2) return false;
  var latestSet = setsDesc[0];
  var latest = getSetTrendValueForSeries(latestSet, sectionKey, fieldKey);
  var ref = tendRefForSeries(history, sectionKey, fieldKey, latestSet);
  return !!(ref && latest != null && (latest < ref[0] || latest > ref[1]));
}

function tendHiddenChipDescriptors() {
  var hiddenKeys = tendHiddenSeriesRead();
  var list = [];
  for (var hi = 0; hi < hiddenKeys.length; hi++) {
    var entry = hiddenKeys[hi];
    var pipe = entry.indexOf('|');
    if (pipe < 1) continue;
    var sk = entry.slice(0, pipe);
    var fk = entry.slice(pipe + 1);
    if (!fk) continue;
    list.push({ sectionKey: sk, fieldKey: fk });
  }
  return list;
}

function buildTendHiddenChipsHtml() {
  var desc = tendHiddenChipDescriptors();
  var svg = tendEyeVisibilitySvg();
  var chips = [];
  for (var i = 0; i < desc.length; i++) {
    var sk = desc[i].sectionKey;
    var fk = desc[i].fieldKey;
    var label = esc(tendFindSeriesSpec(sk, fk).cardTitle || fk);
    chips.push(
      '<span class="tend-hidden-chip">' +
      '<span class="tend-hidden-chip-label">' +
      label +
      '</span>' +
      '<button type="button" class="tend-hidden-chip-btn" title="Volver a mostrar" aria-label="Mostrar de nuevo" onclick="tendUnhideSeries(\'' +
      safeAttrJsString(sk) +
      "','" +
      safeAttrJsString(fk) +
      '\')">' +
      svg +
      '</button></span>'
    );
  }
  return chips.join('');
}

function refreshTendHiddenModalContent() {
  var el = document.getElementById('tend-hidden-modal-chips');
  if (!el) return;
  var html = buildTendHiddenChipsHtml();
  el.innerHTML =
    html ||
    '<p style="margin:0;font-size:13px;color:var(--text-muted);">No hay analitos ocultos.</p>';
}

function openTendHiddenModal() {
  var bd = document.getElementById('tend-hidden-modal-backdrop');
  if (!bd) return;
  refreshTendHiddenModalContent();
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
}

function closeTendHiddenModal() {
  var bd = document.getElementById('tend-hidden-modal-backdrop');
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

function buildTendInlineControlsHtml(hiddenCount) {
  var on = tendAbnormalOnlyRead();
  var hint = on
    ? 'Solo analitos con último valor fuera del rango de referencia del laboratorio (si hay referencia).'
    : 'Vista completa: todos los analitos con datos suficientes para tendencia.';
  var toggleLabel = on ? 'Ver todas' : 'Solo fuera de rango';
  var ocultosBtn =
    hiddenCount > 0
      ? '<button type="button" class="tend-toolbar-btn tend-ocultos-trigger" onclick="openTendHiddenModal()">Ocultos (' +
        hiddenCount +
        ')</button>'
      : '';
  return (
    '<div class="tend-inline-controls">' +
    '<button type="button" class="tend-toolbar-toggle' +
    (on ? ' is-active' : '') +
    '" onclick="toggleTendAbnormalOnlyFilter()" aria-pressed="' +
    (on ? 'true' : 'false') +
    '" title="' +
    esc(hint) +
    '">' +
    esc(toggleLabel) +
    '</button>' +
    ocultosBtn +
    '</div>'
  );
}

function toggleTendAbnormalOnlyFilter() {
  tendAbnormalOnlyWrite(!tendAbnormalOnlyRead());
  renderTendencias();
}

function tendHideSeriesFromCard(ev, sectionKey, fieldKey) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  tendSeriesSetUserHidden(sectionKey, fieldKey, true);
  renderTendencias();
}

function tendUnhideSeries(sectionKey, fieldKey) {
  tendSeriesSetUserHidden(sectionKey, fieldKey, false);
  renderTendencias();
}

function tendResetAllHiddenSeries() {
  tendHiddenSeriesWrite([]);
  closeTendHiddenModal();
  renderTendencias();
}

function trendSparkDomId(sectionKey, fieldKey) {
  return (
    'spark-' +
    String(sectionKey).replace(/[^a-zA-Z0-9]+/g, '_') +
    '-' +
    String(fieldKey).replace(/[^a-zA-Z0-9]+/g, '_')
  );
}

function trendSparkChartKey(sectionKey, fieldKey) {
  return sectionKey + '\x01' + fieldKey;
}


function formatDMYDate(d) {
  if (!d || isNaN(d.getTime())) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

/** Fecha aproximada desde id numérico (timestamp al guardar el set). */
function inferFechaLabSetFromId(set) {
  if (!set || set.fecha === 'Anterior') return '';
  var id = String(set.id || '');
  if (!/^\d{10,}$/.test(id)) return '';
  var ms = parseInt(id, 10);
  if (id.length === 10) ms *= 1000;
  return formatDMYDate(new Date(ms));
}

/**
 * Bloque "anterior" de estudios (líneas 0–2): suele traer la fecha en la 1.ª línea
 * o en FECHA/HORA. Si no, se usa la fecha de la nota clínica como último recurso.
 */
function inferAnteriorLabDateFromNote(patientId) {
  var n = notes[patientId];
  if (!n || !n.estudios) return '';
  var lines = n.estudios.split('\n');
  for (var i = 0; i < 3 && i < lines.length; i++) {
    var t = (lines[i] || '').trim();
    if (!t) continue;
    var mFh = t.match(/FECHA[^\d:]*(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i);
    if (mFh) {
      var nf0 = normalizeFechaLabHistory(mFh[1]);
      if (nf0 && nf0 !== 'Anterior' && parseFechaLabToMs(nf0, '') > 0) return nf0;
    }
    var mSub = t.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
    if (mSub) {
      var nf1 = normalizeFechaLabHistory(mSub[1]);
      if (nf1 && nf1 !== 'Anterior' && parseFechaLabToMs(nf1, '') > 0) return nf1;
    }
    var nf2 = normalizeFechaLabHistory(t);
    if (nf2 && nf2 !== 'Anterior' && parseFechaLabToMs(nf2, '') > 0) return nf2;
  }
  if (n.fecha) {
    var nf3 = normalizeFechaLabHistory(n.fecha);
    if (nf3 && nf3 !== 'Anterior' && parseFechaLabToMs(nf3, '') > 0) return nf3;
  }
  return '';
}

// ── Lab History Migration ─────────────────────────────────────────
(function migrateLabHistory() {
  try {
    if (localStorage.getItem('rpc-labHistory')) return;
  } catch (_lsErr) { return; }
  patients.forEach(function(p) {
    try {
      if (!notes[p.id] || !notes[p.id].estudios) return;
      var lines = notes[p.id].estudios.split('\n');
      var anteriorLines = lines.slice(0, 3).filter(function(l){ return l.trim(); });
      var recentLines   = lines.slice(3).filter(function(l){ return l.trim(); });
      var sets = [];
      if (anteriorLines.length) {
        var migratedAnteriorLabs = extractLabDataLines(anteriorLines);
        sets.push({
          id: 'migrated-anterior',
          fecha: 'Anterior',
          hora: '',
          resLabs: migratedAnteriorLabs,
          parsed: extractParsedValues(migratedAnteriorLabs)
        });
      }
      if (recentLines.length) {
        var migratedRecentLabs = extractLabDataLines(recentLines);
        sets.push({
          id: 'migrated-recent',
          fecha: normalizeFechaLabHistory(recentLines[0] || notes[p.id].fecha || ''),
          hora: notes[p.id].hora || '',
          resLabs: migratedRecentLabs,
          parsed: extractParsedValues(migratedRecentLabs)
        });
      }
      if (sets.length) labHistory[p.id] = sets;
    } catch (e) {
      console.error('migrateLabHistory patient error:', p && p.id, e && e.message);
    }
  });
  try { localStorage.setItem('rpc-labHistory', JSON.stringify(labHistory)); }
  catch (e) { console.error('migrateLabHistory write error:', e && e.message); }
}());

registerPlatformRuntime({
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  getSettings: function () {
    return settings;
  },
  showToast: showToast,
  syncTeamSyncHeaderButton: syncTeamSyncHeaderButton,
  pushUndoSnapshot: pushUndoSnapshot,
});

registerSettingsHelpRuntime({
  getSettings: function () {
    return settings;
  },
  getActiveInner: function () {
    return activeInner;
  },
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  switchInnerTab: switchInnerTab,
  renderInnerTabs: renderInnerTabs,
  renderEstadoActualButton: renderEstadoActualButton,
  renderEstadoActualBar: renderEstadoActualBar,
  switchAppTab: switchAppTab,
  showToast: showToast,
  launchConfetti: launchConfetti,
  syncPreimportBackupUi: syncPreimportBackupUi,
  syncSettingsLanHostDiskSection: syncSettingsLanHostDiskSection,
  closeProfileModal: closeProfileModal,
  openProfileModal: openProfileModal,
  renderMedRecetaPanel: renderMedRecetaPanel,
});

registerExpedienteRuntime({
  getActiveId: function () {
    return activeId;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  getActiveInner: function () {
    return activeInner;
  },
  getSettings: function () {
    return settings;
  },
  showToast: showToast,
  renderTendencias: renderTendencias,
  renderPaseBoard: renderPaseBoard,
  splitResLabsByTipo: splitResLabsByTipo,
  buildLabSetDateLine: buildLabSetDateLine,
  ensureParsedLabHistory: ensureParsedLabHistory,
  guardMobileDocExport: guardMobileDocExport,
  isRpcOffline: isRpcOffline,
  incrementPendingJobs: incrementPendingJobs,
  decrementPendingJobs: decrementPendingJobs,
  syncOfflineButtonStates: syncOfflineButtonStates,
  copyToClipboardSafe: copyToClipboardSafe,
  requestDocumentJson: requestDocumentJson,
  handleDocumentGenerateResponse: handleDocumentGenerateResponse,
});

registerNotesIndicacionesRuntime({
  getActiveId: function () {
    return activeId;
  },
  getSettings: function () {
    return settings;
  },
  showToast: showToast,
  renderRoundOverviewPanels: renderRoundOverviewPanels,
  syncOfflineButtonStates: syncOfflineButtonStates,
  guardMobileDocExport: guardMobileDocExport,
  isRpcOffline: isRpcOffline,
  incrementPendingJobs: incrementPendingJobs,
  decrementPendingJobs: decrementPendingJobs,
  requestDocumentJson: requestDocumentJson,
  handleDocumentGenerateResponse: handleDocumentGenerateResponse,
  guidedTourAdvanceAfterNotaGenerated: guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated: guidedTourAdvanceAfterIndicaGenerated,
  addAuditEntry: addAuditEntry,
});

registerProcedureAgendaRuntime({
  getActiveId: function () {
    return activeId;
  },
  showToast: showToast,
  renderPaseBoard: renderPaseBoard,
});

registerSoapEstadoRuntime({
  getActiveId: function () {
    return activeId;
  },
  showToast: showToast,
  getSettings: function () {
    return settings;
  },
});

registerLabPanelRuntime({
  showToast: showToast,
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  selectPatient: selectPatient,
  renderRoundOverviewPanels: renderRoundOverviewPanels,
  refreshTendenciasOrCultivosPanel: refreshTendenciasOrCultivosPanel,
  renderPaseBoard: renderPaseBoard,
  onboardingAdvanceAfterParse: onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend: onboardingAdvanceAfterSend,
  findPatientByRegistro: findPatientByRegistro,
  addAuditEntry: addAuditEntry,
  openPaseSectionInNormal: openPaseSectionInNormal,
  renderDiagramas: renderDiagramas,
  pushUndoSnapshot: pushUndoSnapshot,
  setMedTabAttention: setMedTabAttention,
  switchAppTab: switchAppTab,
  closeSettingsDropdown: closeSettingsDropdown,
  extractParsedValues: extractParsedValues,
  buildParsedBySectionFromResLabs: buildParsedBySectionFromResLabs,
  ensureParsedLabHistory: ensureParsedLabHistory,
  rebuildEstudiosFromLabHistory: rebuildEstudiosFromLabHistory,
  inferFechaLabSetFromId: inferFechaLabSetFromId,
  dayKeyFromLabSet: dayKeyFromLabSet,
  primaryTipoForLabSet: primaryTipoForLabSet,
  refreshAllTodoUIs: refreshAllTodoUIs,
  emitLiveSyncTodoUpsert: emitLiveSyncTodoUpsert,
  removeAtbRisPanelsFromBody: removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels: wireAtbRisHoverPanels,
  getLabOutputPrefs: getLabOutputPrefs,
  isGasoInterpretacionResLabChunk: isGasoInterpretacionResLabChunk,
  formatBhExtendedTabLine: formatBhExtendedTabLine,
  isBhMainResLabChunk: isBhMainResLabChunk,
  isResLabChunkPureCultivo: isResLabChunkPureCultivo,
  buildCultivoOutputHtmlFragments: buildCultivoOutputHtmlFragments,
  buildLabSetDateLine: buildLabSetDateLine,
});

registerProductivityRuntime({
  getActiveId: function () {
    return activeId;
  },
  getSettings: function () {
    return settings;
  },
  selectPatient: selectPatient,
  switchAppTab: switchAppTab,
  switchInnerTab: switchInnerTab,
  saveState: saveState,
  renderIndicaForm: renderIndicaForm,
  closeSettingsDropdown: closeSettingsDropdown,
  openAddModal: openAddModal,
  addAuditEntry: addAuditEntry,
  showToast: showToast,
  advanceRondaPatient: advanceRondaPatient,
});

registerPatientsRuntime({
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  getActiveInner: function () {
    return activeInner;
  },
  setActiveInner: function (v) {
    activeInner = v;
  },
  getSettings: function () {
    return settings;
  },
  getActiveLab: function () {
    return labPanelGetActiveLab();
  },
  consumeActiveLab: function () {
    var x = labPanelGetActiveLab();
    labPanelSetActiveLab(null);
    return x;
  },
  restoreActiveLab: function (x) {
    labPanelSetActiveLab(x);
  },
  clearLabOutputUi: clearLabWorkbenchMinimalDom,
  switchAppTab: switchAppTab,
  showToast: showToast,
  renderInnerTabs: renderInnerTabs,
  renderEstadoActualButton: renderEstadoActualButton,
  renderNoteForm: renderNoteForm,
  renderIndicaForm: renderIndicaForm,
  renderListadoForm: renderListadoForm,
  refreshTendenciasOrCultivosPanel: refreshTendenciasOrCultivosPanel,
  renderLabHistoryPanel: renderLabHistoryPanel,
  renderMedRecetaPanel: renderMedRecetaPanel,
  switchInnerTab: switchInnerTab,
  syncInnerTabVisualOnly: syncInnerTabVisualOnly,
  renderTodoForm: renderTodoForm,
  limpiarReporte: limpiarReporte,
  setLabHistoryPanelCollapsed: setLabHistoryPanelCollapsed,
  syncLabHistoryCollapseUI: syncLabHistoryCollapseUI,
  syncWorkContextChrome: syncWorkContextChrome,
  rpcPrefersReducedMotion: rpcPrefersReducedMotion,
  renderProcedureAgendaPanel: renderProcedureAgendaPanel,
  refreshAllTodoUIs: refreshAllTodoUIs,
  renderPaseBoard: renderPaseBoard,
  pushUndoSnapshot: pushUndoSnapshot,
  addAuditEntry: addAuditEntry,
  applyDefaultsToNewPatient: applyDefaultsToNewPatient,
  applyDefaultsToNewIndicaciones: applyDefaultsToNewIndicaciones,
  enviarLabsANota: enviarLabsANota,
  ensureParsedLabHistory: ensureParsedLabHistory,
  primaryTipoForLabSet: primaryTipoForLabSet,
  normalizeFechaLabHistory: normalizeFechaLabHistory,
});

registerChromeRuntime({
  switchAppTab,
  renderPatientList,
  scrollActiveRondaCardIntoView,
  renderProcedureAgendaPanel,
  getActiveAppTab: function () { return activeAppTab; },
  getActiveId: function () { return activeId; },
  setRoundOverviewMode: setRoundOverviewMode,
  onGuidedTourPaseEnter: onChromeGuidedTourPaseEnter,
});
registerLanRuntime({
  showToast,
  renderPatientList,
  renderNoteForm,
  renderLabHistoryPanel,
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  selectPatient,
  isMobileWeb,
  renderProcedureAgendaPanel,
  refreshAllTodoUIs,
  syncWorkContextChrome,
  findPatientByRegistro,
  ensureUniquePatientName,
  applyImportEntry,
  syncSettingsLanHostDiskSection,
  buildPatientEntry,
  closeSettingsDropdown,
});
initChromeAppearance();
syncLabHistoryCollapseUI();

document.getElementById('today-date').textContent =
  new Date().toLocaleDateString('es-MX', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
renderPatientList();
if (patients.length > 0) selectPatient(patients[0].id);
else renderLabHistoryPanel();
loadSettings();
syncWorkContextChrome();
seedTendHiddenDefaults();
syncMainAppTabA11y(activeAppTab);
renderInnerTabs();
if (__v3MigratedThisBoot) {
  setTimeout(function() {
    try { showToast('R+ 3.0 — Sala activado por defecto. Cambia en Mi Perfil → Aplicación.'); } catch (_e) {}
  }, 800);
}
function _rpcDeferInit(fn) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(function() { try { fn(); } catch (e) { console.error('deferInit error:', e && e.message); } }, { timeout: 1500 });
  } else {
    setTimeout(function() { try { fn(); } catch (e) { console.error('deferInit error:', e && e.message); } }, 200);
  }
}
_rpcDeferInit(initGoalGFeatures);
_rpcDeferInit(initGuidedTourGate);
_rpcDeferInit(initMobileWebBoot);
_rpcDeferInit(initRpcServerHealthWatch);
_rpcDeferInit(initIdleLockFeature);
initUpdateChannelAndGate();

function syncActivePatientContextBar() {
  /* Paciente activo solo en la barra lateral; no repetir en el header */
}

function syncHeaderAppModeChip() {
  var chip = document.getElementById('header-app-mode-chip');
  if (!chip) return;
  var sala = isModeSala(settings);
  chip.textContent = sala ? 'Modo: Sala' : 'Modo: Interconsulta';
  chip.title = sala
    ? 'Pulsa para cambiar a Interconsulta (Nota de evolución, Indicaciones…). Ajustes finos en Mi Perfil.'
    : 'Pulsa para cambiar a Sala (Estado actual, Listado de problemas…). Ajustes finos en Mi Perfil.';
  chip.classList.toggle('mode-sala', sala);
  chip.classList.toggle('mode-inter', !sala);
}

function syncMedPatientGate() {
  var empty = document.getElementById('med-empty-guided');
  var work = document.getElementById('med-work-area');
  if (!empty || !work) return;
  var showEmpty = activeAppTab === 'med' && !activeId;
  empty.style.display = showEmpty ? 'flex' : 'none';
  work.style.display = showEmpty ? 'none' : 'flex';
}

function syncLabComboButtonState() {
  var btn = document.getElementById('btn-procesar-y-expediente');
  var hint = document.getElementById('lab-combo-hint');
  var ok = !!activeId;
  if (btn) btn.disabled = !ok;
  if (hint) hint.style.display = ok ? 'none' : 'block';
}

function setMedTabAttention(on) {
  var tab = document.getElementById('apptab-med');
  if (tab) tab.classList.toggle('app-tab-attention', !!on);
}

function syncWorkContextChrome() {
  syncActivePatientContextBar();
  syncHeaderAppModeChip();
  syncMedPatientGate();
  syncLabComboButtonState();
}

/** Misma fila que Laboratorio (colores BH/QS, valores alterados). */
function buildPaseLabBlockHtml(labChunks) {
  if (!labChunks || !labChunks.length) return '';
  var parts = [];
  labChunks.forEach(function (text) {
    renderEntry(text).forEach(function (htmlLine, idx) {
      parts.push(
        '<div class="pase-lab-line' + (idx === 0 ? ' pase-lab-line--sechead' : '') + '">' + htmlLine + '</div>'
      );
    });
  });
  return '<div class="pase-lab-block" role="text">' + parts.join('') + '</div>';
}


/** Limpia línea de dosis para tarjeta Pase: solo lo aplicable (antes de //), sin *DIA#*, sin calendario colado. */
function cleanPaseMedDosisForCard(dosisRaw) {
  var s = String(dosisBeforeSlash(dosisRaw) || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  // Quitar sufijos tipo "4000 UI LUNES MIERCOLES Y VIERNES" si quedaron sin separador //.
  var día =
    /\b(?:LOS\s+)?(?:LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|VIERNES|SABADO|SÁBADO|DOMINGO)\b/i;
  var m = s.match(día);
  if (m && m.index != null && m.index > 0) {
    s = s
      .slice(0, m.index)
      .replace(/\s*(?:,\s*|\bY\b|\bO\b)\s*$/gi, '')
      .replace(/[,\s]+$/g, '')
      .trim();
  }
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Abrevia cantidades muy grandes en UI/IU para la pastilla Pase (p. ej. 2400000 → 2.4M).
 * Solo valores enteros sencillos tras // para evitar ambigüedad con miles con separadores.
 */
function abbreviatePaseMedDosisCore(core) {
  var t = String(core || '').trim();
  if (!t) return t;
  var m = t.match(/^(\d+)\s*(UI|IU)\s*$/i);
  if (!m) return t;
  var n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1e6) return t;
  var mil = n / 1e6;
  var label =
    mil % 1 === 0
      ? String(mil)
      : String(Math.round(mil * 10) / 10).replace('.', ',');
  return label + 'M ' + m[2].toUpperCase();
}

/**
 * Separa número+unidad (núcleo sin partir) del resto del texto de dosis para chips Pase.
 * Si no reconoce el patrón, devuelve todo en núcleo.
 */
function splitPaseMedDosisForDisplay(dosisClean) {
  var s = String(dosisClean || '').trim();
  if (!s) return { core: '', extra: '', splitOk: false };
  // Fracciones tipo 1600/800 MG; unidades típicicas de receta. No partir número+unidad entre chips.
  var unit =
    '(?:UI\\/ML|IU\\/ML|MCG\\/ML|MG\\/ML|' +
      '\\b(?:UI|IU|MCG|UG|MG|NG|ML|UL)\\b)';
  var re = new RegExp(
    '^((?:\\d+(?:[,\\.]\\d+)?(?:\\s*/\\s*\\d+(?:[,\\.]\\d+)?)?\\s*(?:' +
      unit +
      '))|(?:\\d+(?:[,\\.]\\d+)?\\s*%))(?:\\s+([\\s\\S]*))?$',
    'i'
  );
  var m = s.match(re);
  if (!m || !String(m[1] || '').trim()) return { core: s, extra: '', splitOk: false };
  return {
    core: String(m[1]).trim(),
    extra: String(m[2] || '').trim(),
    splitOk: true
  };
}

/** Vía resumida para tarjetas Pase. */
function abbreviatePaseMedVia(viaRaw) {
  var u = String(viaRaw || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!u.trim()) return '';
  if (/\bINTRAPERITONEAL\b/.test(u)) return 'IP';
  if (/\bINTRAMUSCULAR\b/.test(u)) return 'IM';
  if (/\bINTRAVENOSA\b/.test(u)) return 'IV';
  if (/\bORAL\b/.test(u)) return 'VO';
  var fallback = String(viaRaw || '').trim();
  return fallback.length > 28 ? fallback.slice(0, 26) + '…' : fallback;
}

/** Título corto Pase: principio activo (antes de la dosis numérica); sin (*…). */
function paseMedPrincipioActivoTitle(nombreRaw) {
  var s = String(nombreRaw || '').trim();
  if (!s) return '';
  s = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
  var chunk = s.split(/\s+(?=\d)/)[0] || '';
  chunk = chunk.trim();
  return chunk.slice(0, 120) || s.slice(0, 120);
}

function findPaseLatestLabSend(patientId) {
  if (!patientId) return null;
  var hist = sortLabHistoryChronological(ensureParsedLabHistory(patientId));
  // sortLabHistoryChronological: más reciente primero (índice 0).
  for (var i = 0; i < hist.length; i++) {
    var set = hist[i];
    var tipo = primaryTipoForLabSet(set.resLabs);
    if (tipo === 'cultivo') continue;
    var sp = splitResLabsByTipo(set.resLabs || []);
    var labChunks = sp.labs.filter(function (x) {
      return String(x || '').trim();
    });
    if (!labChunks.length) continue;
    var rawFe =
      set.fecha === 'Anterior'
        ? ''
        : normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
    var fe =
      set.id === 'migrated-anterior'
        ? rawFe
          ? 'Anterior · ' + rawFe
          : 'Anterior'
        : rawFe || (set.fecha === 'Anterior' ? 'Anterior' : '—');
    var ho = set.hora && String(set.hora).trim() ? String(set.hora).trim().slice(0, 8) : '';
    var meta = ho ? fe + ' · ' + ho : fe;
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
  if (!patient) return '';
  var chips = [];
  if (patient.cuarto) chips.push({ label: 'Cto.', value: String(patient.cuarto) });
  if (patient.cama) chips.push({ label: 'Cama', value: String(patient.cama) });
  if (patient.servicio) chips.push({ label: 'Servicio', value: String(patient.servicio) });
  if (patient.registro) chips.push({ label: 'Reg.', value: String(patient.registro), mono: true });
  var chipsHtml = chips
    .map(function (c) {
      return (
        '<span class="pase-patient-chip' +
        (c.mono ? ' pase-patient-chip--mono' : '') +
        '"><span class="pase-patient-chip-label">' +
        esc(c.label) +
        '</span> ' +
        esc(c.value) +
        '</span>'
      );
    })
    .join('');
  return (
    '<section class="pase-section pase-patient-banner" aria-label="Paciente activo">' +
    '<div class="pase-patient-banner-body">' +
    '<div class="pase-patient-name">' +
    esc(patient.nombre || 'Paciente') +
    '</div>' +
    (chipsHtml ? '<div class="pase-patient-meta-row">' + chipsHtml + '</div>' : '') +
    '</div>' +
    '</section>'
  );
}

function renderPaseBoard() {
  var host = document.getElementById('pase-board-scroll');
  if (!host || !isPaseMode()) return;
  removeAtbRisPanelsFromBody();
  if (!host._paseDelegate) {
    host._paseDelegate = true;
    host.addEventListener('click', function (e) {
      var todoBtn = e.target.closest('[data-pase-todo]');
      if (todoBtn && todoBtn.getAttribute('data-pase-todo')) {
        e.preventDefault();
        toggleTodo(todoBtn.getAttribute('data-pase-todo'));
      }
    });
  }
  if (!activeId) {
    host.innerHTML =
      '<div class="pase-empty-screen" role="status">Selecciona un paciente en la lista para ver el resumen.</div>';
    return;
  }
  var pid = activeId;
  var parts = [];
  var patient = patients.find(function (x) {
    return String(x.id) === String(pid);
  });
  parts.push(buildPasePatientHeaderHtml(patient));

  var todos = storage.getTodos(pid).slice().sort(_todoCompareForSort);
  var ag = getPaseAgendaForPatient(pid);

  var todoParts = [];
  if (!todos.length) {
    todoParts.push('<div class="pase-mini-card pase-mini-card--dim">Sin pendientes.</div>');
  } else {
    todos.forEach(function (t) {
      var prio = t.priority === 'alta' ? 'alta' : t.priority === 'baja' ? 'baja' : 'media';
      todoParts.push(
        '<div class="pase-mini-card pase-todo-card todo-prio-' +
          prio +
          (t.completed ? ' pase-mini-card--todo-done' : '') +
          '">' +
          '<button type="button" class="pase-todo-hit" data-pase-todo="' +
          esc(String(t.id)) +
          '" aria-label="' +
          (t.completed ? 'Marcar como pendiente' : 'Marcar como hecho') +
          '">' +
          (t.completed ? '✓' : '○') +
          '</button>' +
          '<span>' +
          esc(String(t.text || '')) +
          '</span></div>'
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
        ? '—'
        : when.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
      agParts.push(
        '<div class="pase-mini-card"><strong>' +
          esc(String(ev.procedure || 'Procedimiento')) +
          '</strong><span class="pase-sub">' +
          esc(whenStr + ' · ' + String(ev.location || '').trim()) +
          '</span></div>'
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
  parts.push(todoParts.join(''));
  parts.push('</div></section>');

  parts.push('<section class="pase-section" aria-label="Agenda">');
  parts.push('<div class="pase-section-head">');
  parts.push(
    '<button type="button" class="pase-section-title" onclick="openPaseSectionInNormal(\'agenda\')">Agenda</button>'
  );
  parts.push('</div><div class="pase-dual-col-grid">');
  parts.push(agParts.join(''));
  parts.push('</div></section>');
  parts.push('</div>');

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
        '</div>' +
        buildPaseLabBlockHtml(labSend.labChunks) +
        '</div>'
    );
  }
  parts.push('</div></section>');

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
      var fd = r.fechaMuestra && r.fechaMuestra !== '—' ? r.fechaMuestra : r.studyDate || '—';
      var atbBlock = paseCultivoAtbBlockHtml(pid, r);
      parts.push(
        '<div class="pase-mini-card pase-cultivo-card' +
          (r.negativo ? ' pase-mini-card--dim' : '') +
          '"><div class="pase-cult-org">' +
          esc(String(r.organismo || '—')) +
          '</div>' +
          atbBlock +
          '<div class="pase-sub">' +
          esc(String(r.tipoLabel || '') + ' · ' + String(r.sitio || '').slice(0, 72)) +
          '<br>' +
          esc(fd) +
          '</div></div>'
      );
    });
  }
  parts.push('</div></section>');

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
      var nombre = paseMedPrincipioActivoTitle(it.nombreRaw || '');
      var viaAbbr = abbreviatePaseMedVia(it.viaRaw || '');
      var freq = String(it.frecuenciaRaw || '').trim();
      var dosis = cleanPaseMedDosisForCard(it.dosisRaw || '');
      var dosisSplit = dosis
        ? splitPaseMedDosisForDisplay(dosis)
        : { core: '', extra: '', splitOk: false };
      var diaBadge =
        it.diaTratamiento != null
          ? '<div class="pase-med-dia-badge" title="Día de tratamiento">Día ' +
            esc(String(it.diaTratamiento)) +
            '</div>'
          : '';
      var metaParts = [];
      if (dosisSplit.core || dosisSplit.extra) {
        if (dosisSplit.splitOk) {
          metaParts.push(
            '<span class="pase-med-chip pase-med-chip--dosis">' +
              (dosisSplit.core
                ? '<span class="pase-med-dosis-core">' +
                  esc(abbreviatePaseMedDosisCore(dosisSplit.core)) +
                  '</span>'
                : '') +
              (dosisSplit.extra
                ? '<span class="pase-med-dosis-rest">' + esc(dosisSplit.extra) + '</span>'
                : '') +
              '</span>'
          );
        } else {
          metaParts.push('<span class="pase-med-chip">' + esc(dosisSplit.core) + '</span>');
        }
      }
      if (viaAbbr) {
        metaParts.push('<span class="pase-med-chip">' + esc(viaAbbr) + '</span>');
      }
      if (freq) {
        metaParts.push('<span class="pase-med-chip">' + esc(freq) + '</span>');
      }
      var metaRow =
        metaParts.length > 0
          ? '<div class="pase-med-meta-row">' + metaParts.join('') + '</div>'
          : '';
      parts.push(
        '<div class="pase-mini-card pase-med-card"><div class="pase-med-card-head">' +
          '<div class="pase-med-name">' +
          esc(nombre) +
          '</div>' +
          diaBadge +
          '</div>' +
          metaRow +
          '</div>'
      );
    });
  }
  parts.push('</div></section>');

  host.innerHTML = parts.join('');
  wireAtbRisHoverPanels(host);
}

function openPaseSectionInNormal(which) {
  var w = String(which || '').toLowerCase();
  if (getUiDensity() !== 'normal') {
    setUiDensity('normal');
  }
  if (w === 'labs' || w === 'lab') {
    switchAppTab('lab');
  } else if (w === 'pendientes' || w === 'todo') {
    switchAppTab('nota');
    switchInnerTab('todo');
  } else if (w === 'agenda') {
    switchAppTab('agenda');
  } else if (w === 'cultivos' || w === 'cult') {
    switchAppTab('nota');
    switchInnerTab('cult');
  } else if (w === 'med' || w === 'medicamentos') {
    switchAppTab('med');
  } else if (w === 'expediente' || w === 'nota') {
    switchAppTab('nota');
    switchInnerTab('notas');
  } else {
    switchAppTab('nota');
    switchInnerTab('notas');
  }
  if (getUiDensity() === 'normal') {
    requestAnimationFrame(function () {
      scrollActiveRondaCardIntoView();
    });
  }
}

function switchAppTab(tab) {
  if (tab === 'lan') tab = 'lab';
  var prevAppTab = activeAppTab;
  activeAppTab = tab;
  if (tab === 'nota' && isPaseMode() && prevAppTab !== 'nota') {
    setRoundOverviewMode(true);
  }
  if (tab === 'nota' && prevAppTab !== 'nota' && !isPaseMode()) {
    switchInnerTab('todo');
  }
  var apptabLab = document.getElementById('apptab-lab');
  var apptabNota = document.getElementById('apptab-nota');
  var apptabMed = document.getElementById('apptab-med');
  var apptabAgenda = document.getElementById('apptab-agenda');
  var appcontentLab = document.getElementById('appcontent-lab');
  var appcontentMed = document.getElementById('appcontent-med');
  var appcontentNota = document.getElementById('appcontent-nota');
  var appcontentAgenda = document.getElementById('appcontent-agenda');
  var unified = isPaseMode();

  if (apptabLab) apptabLab.classList.toggle('active', tab === 'lab');
  if (apptabNota) apptabNota.classList.toggle('active', tab === 'nota');
  if (apptabMed) apptabMed.classList.toggle('active', tab === 'med');
  if (apptabAgenda) apptabAgenda.classList.toggle('active', tab === 'agenda');

  if (unified) {
    var paseRoot = document.getElementById('appcontent-pase');
    [appcontentLab, appcontentMed, appcontentNota, appcontentAgenda].forEach(function (p) {
      if (!p) return;
      p.style.display = 'none';
    });
    if (paseRoot) {
      paseRoot.style.display = 'flex';
      paseRoot.style.flexDirection = 'column';
      paseRoot.style.flex = '1';
      paseRoot.style.minHeight = '0';
      paseRoot.style.overflow = 'hidden';
    }
    renderPaseBoard();
  } else {
    if (document.getElementById('appcontent-pase')) {
      var pr = document.getElementById('appcontent-pase');
      pr.style.display = 'none';
    }
    if (appcontentLab) {
      appcontentLab.style.display = tab === 'lab' ? 'flex' : 'none';
      appcontentLab.style.flex = '1';
      appcontentLab.style.overflow = 'hidden';
    }
    if (appcontentMed) {
      appcontentMed.style.display = tab === 'med' ? 'flex' : 'none';
      appcontentMed.style.flex = '1';
      appcontentMed.style.overflow = 'hidden';
    }
    if (appcontentNota) {
      appcontentNota.style.display = tab === 'nota' ? 'flex' : 'none';
      appcontentNota.style.flex = '1';
      appcontentNota.style.overflow = 'hidden';
    }
    if (appcontentAgenda) {
      appcontentAgenda.style.display = tab === 'agenda' ? 'flex' : 'none';
      appcontentAgenda.style.flex = '1';
      appcontentAgenda.style.overflow = 'hidden';
    }
    if (tab === 'lab') renderLabHistoryPanel();
    if (tab === 'med') renderMedRecetaPanel();
    if (tab === 'agenda') renderProcedureAgendaPanel();
  }

  syncMainAppTabA11y(tab);

  if (tab === 'med') setMedTabAttention(false);

  syncWorkContextChrome();
  if (activeAppTab === 'nota') syncRoundExpedienteLayout();
}

function syncMainAppTabA11y(tab) {
  if (tab === 'lan') tab = 'lab';
  var rows = [
    ['lab', 'apptab-lab', 'appcontent-lab', 'appTab.lab'],
    ['nota', 'apptab-nota', 'appcontent-nota', 'appTab.nota'],
    ['med', 'apptab-med', 'appcontent-med', 'appTab.med'],
    ['agenda', 'apptab-agenda', 'appcontent-agenda', 'appTab.agenda'],
  ];
  var list = document.getElementById('app-main-tablist');
  if (isPaseMode()) {
    if (list) list.setAttribute('aria-hidden', 'true');
    rows.forEach(function (r) {
      var b = document.getElementById(r[1]);
      var p = document.getElementById(r[2]);
      if (b) {
        b.setAttribute('aria-hidden', 'true');
        b.setAttribute('tabindex', '-1');
      }
      if (p) {
        p.setAttribute('role', 'tabpanel');
        p.removeAttribute('aria-label');
        p.setAttribute('aria-labelledby', r[1]);
        p.setAttribute('aria-hidden', 'true');
      }
    });
    var paseRoot = document.getElementById('appcontent-pase');
    if (paseRoot) {
      paseRoot.setAttribute('role', 'region');
      paseRoot.setAttribute('aria-label', 'Vista Pase — resumen del paciente');
      paseRoot.setAttribute('aria-hidden', 'false');
    }
    return;
  }
  var paseRoot2 = document.getElementById('appcontent-pase');
  if (paseRoot2) {
    paseRoot2.removeAttribute('role');
    paseRoot2.removeAttribute('aria-label');
    paseRoot2.setAttribute('aria-hidden', 'true');
  }
  if (list) list.removeAttribute('aria-hidden');
  rows.forEach(function (r) {
    var b = document.getElementById(r[1]);
    var p = document.getElementById(r[2]);
    var sel = tab === r[0];
    if (b) {
      b.removeAttribute('aria-hidden');
      b.setAttribute('aria-selected', sel ? 'true' : 'false');
      b.tabIndex = sel ? 0 : -1;
    }
    if (p) {
      p.setAttribute('role', 'tabpanel');
      p.removeAttribute('aria-label');
      p.setAttribute('aria-labelledby', r[1]);
      p.setAttribute('aria-hidden', sel ? 'false' : 'true');
    }
  });
}

(function setupMainAppTabKeyboard() {
  var list = document.getElementById('app-main-tablist');
  if (!list) return;
  var order = ['lab', 'nota', 'med', 'agenda'];
  list.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'ArrowDown' && k !== 'ArrowUp' && k !== 'Home' && k !== 'End') return;
    var cur = activeAppTab === 'lan' ? 'lab' : activeAppTab;
    var i = order.indexOf(cur);
    if (i < 0) i = 0;
    var next = -1;
    if (k === 'ArrowRight' || k === 'ArrowDown') next = (i + 1) % order.length;
    else if (k === 'ArrowLeft' || k === 'ArrowUp') next = (i - 1 + order.length) % order.length;
    else if (k === 'Home') next = 0;
    else if (k === 'End') next = order.length - 1;
    if (next < 0) return;
    e.preventDefault();
    var t = order[next];
    switchAppTab(t);
    var btn = document.getElementById('apptab-' + t);
    if (btn) btn.focus();
  });
})();


function syncInnerTabVisualOnly() {
  var tab = activeInner || 'todo';
  var ids = ['datos', 'notas', 'indica', 'tend', 'cult', 'listado', 'todo'];
  ids.forEach(function (t) {
    var btn = document.getElementById('itab-' + t);
    var pane = document.getElementById('itab-content-' + t);
    if (btn) btn.classList.toggle('active', tab === t);
    if (pane) pane.classList.toggle('active', tab === t);
  });
}

function switchInnerTab(tab, opts) {
  opts = opts || {};
  if (isPaseMode() && activeAppTab === 'nota' && !opts.preserveRoundOverview) {
    setRoundOverviewMode(false);
  }
  activeInner = tab;
  var ids = ['datos','notas','indica','tend','cult','listado','todo'];
  ids.forEach(function(t) {
    var btn = document.getElementById('itab-'+t);
    var pane = document.getElementById('itab-content-'+t);
    if (btn) btn.classList.toggle('active', tab === t);
    if (pane) pane.classList.toggle('active', tab === t);
  });
  if (tab === 'datos') renderPatientDataPane();
  if (tab === 'tend') renderTendencias();
  if (tab === 'cult') renderCultivosTable();
  if (tab === 'listado') renderListadoForm();
  if (tab === 'todo') renderTodoForm();
  syncRoundExpedienteLayout();
}

function renderInnerTabs() {
  var sala = isModeSala(settings);
  function show(id, visible) {
    var el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  }
  function setOrder(id, order) {
    var el = document.getElementById(id);
    if (el) el.style.order = String(order);
  }
  show('itab-datos', sala);
  show('itab-notas', !sala);
  show('itab-indica', !sala);
  show('itab-tend', true);
  show('itab-cult', true);
  show('itab-listado', sala);
  show('itab-todo', true);

  if (sala) {
    setOrder('itab-datos', 1);
    setOrder('itab-todo', 2);
    setOrder('itab-tend', 3);
    setOrder('itab-cult', 4);
    setOrder('itab-listado', 5);
    setOrder('itab-notas', 99);
    setOrder('itab-indica', 99);
  } else {
    /* Interconsulta: orden clásico de expediente (nota primero). */
    setOrder('itab-notas', 1);
    setOrder('itab-indica', 2);
    setOrder('itab-tend', 3);
    setOrder('itab-cult', 4);
    setOrder('itab-todo', 5);
    setOrder('itab-datos', 99);
    setOrder('itab-listado', 99);
  }

  renderEstadoActualBar();
}

function getActiveInnerTab() {
  return activeInner || null;
}


var _labMaintTimer = null;
var _labMaintRunning = false;
var LAB_MAINT_DEBOUNCE_MS = 550;

/**
 * Tras cada guardado: reprocesa líneas de resultado guardadas (GASES/dedupe interno)
 * y arma un informe de duplicados exactos, mismo sourceText y conflictos fecha/hora.
 * Expone `window.__rpcLabAudit` y escribe en consola si hay algo que revisar.
 * @returns {boolean} true si se modificó algún set (conviene volver a persistir).
 */
function runLabHistoryPostSaveMaintenance() {
  var report = {
    at: new Date().toISOString(),
    reprocessedSetCount: 0,
    patientsReprocessed: [],
    exactDuplicates: [],
    sourceDuplicates: [],
    sameDateTimeConflicts: [],
  };
  var changed = false;
  Object.keys(labHistory || {}).forEach(function (pid) {
    if (pid.indexOf('demo-') === 0) return;
    var sets = labHistory[pid];
    if (!Array.isArray(sets) || !sets.length) return;
    sets.forEach(function (set) {
      if (!set.resLabs || !set.resLabs.length) return;
      var repro = reprocessLabResultLines_(set.resLabs);
      if (!repro || !repro.length) return;
      if (!areLabSetsEquivalent(set.resLabs, repro)) {
        set.resLabs = repro.slice();
        set.parsed = extractParsedValues(repro);
        set.parsedBySection = buildParsedBySectionFromResLabs(repro, set.bhExtras);
        changed = true;
        report.reprocessedSetCount++;
        if (report.patientsReprocessed.indexOf(pid) === -1) report.patientsReprocessed.push(pid);
      }
    });
    var ex = findExactDuplicateLabGroups(sets);
    if (ex.length) {
      report.exactDuplicates.push({ patientId: pid, groups: ex });
    }
    var src = findNormalizedSourceDuplicateGroups(sets);
    if (src.length) {
      report.sourceDuplicates.push({ patientId: pid, groups: src });
    }
    var ct = findConflictingSameDateTimeGroups(sets);
    if (ct.length) {
      report.sameDateTimeConflicts.push({ patientId: pid, groups: ct });
    }
  });
  try {
    window.__rpcLabAudit = report;
  } catch (_e) {}
  var noise =
    report.reprocessedSetCount > 0 ||
    report.exactDuplicates.length > 0 ||
    report.sourceDuplicates.length > 0 ||
    report.sameDateTimeConflicts.length > 0;
  if (noise) {
    console.info('[R+ Laboratorio] Auditoría tras guardado — revisa window.__rpcLabAudit:', report);
  }
  return changed;
}

function scheduleLabHistoryPostSaveMaintenance() {
  clearTimeout(_labMaintTimer);
  _labMaintTimer = setTimeout(function () {
    _labMaintTimer = null;
    if (_labMaintRunning) return;
    _labMaintRunning = true;
    try {
      var changed = runLabHistoryPostSaveMaintenance();
      if (changed) {
        storage.saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient, listadoProblemas);
        if (typeof renderLabHistoryPanel === 'function' && activeId) {
          try {
            renderLabHistoryPanel();
          } catch (_r) {}
        }
        if (typeof refreshTendenciasOrCultivosPanel === 'function') {
          try {
            refreshTendenciasOrCultivosPanel();
          } catch (_t) {}
        }
      }
    } catch (err) {
      console.warn('[R+ Laboratorio] Falló mantenimiento post-guardado:', err);
    } finally {
      _labMaintRunning = false;
    }
  }, LAB_MAINT_DEBOUNCE_MS);
}

registerLanSaveHooks({ scheduleLabHistoryPostSaveMaintenance });

try {
  window.runRpcLabAuditNow = function () {
    var ch = runLabHistoryPostSaveMaintenance();
    if (ch) {
      storage.saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient, listadoProblemas);
      if (typeof renderLabHistoryPanel === 'function' && activeId) {
        try {
          renderLabHistoryPanel();
        } catch (_e) {}
      }
      if (typeof refreshTendenciasOrCultivosPanel === 'function') {
        try {
          refreshTendenciasOrCultivosPanel();
        } catch (_e2) {}
      }
    }
    return window.__rpcLabAudit;
  };
} catch (_eRun) {}

// ── Settings ──────────────────────────────────────────────────────
var _lastLoadSettingsSnapshot = null;
function _buildLoadSettingsSnapshot() {
  if (!settings) return '';
  try {
    return JSON.stringify({
      d: settings.doctorName || '',
      p: settings.profesorName || '',
      g: settings.grado || '',
      di: settings.defaultDieta || '',
      cu: settings.defaultCuidados || '',
      me: settings.defaultMedicamentos || '',
      od: settings.outputDir || '',
      qf: normalizeQuickOutputFormat(settings.quickOutputFormat)
    });
  } catch (_e) {
    return String(Math.random());
  }
}

function loadSettings() {
  if (!settings) settings = {};
  var snapshot = _buildLoadSettingsSnapshot();
  var snapshotUnchanged = _lastLoadSettingsSnapshot !== null && _lastLoadSettingsSnapshot === snapshot;
  _lastLoadSettingsSnapshot = snapshot;
  if (snapshotUnchanged) {
    // DOM-visible settings didn't change; skip re-painting the heavy bits.
    // Still run lightweight, idempotent syncers that reflect orthogonal state
    // (theme/zoom/contrast/density/update-channel) in case callers expected them.
    syncFontZoomButtons();
    syncHighContrastButtons();
    syncUiDensityButtons();
    syncUpdateChannelUI();
    syncUpdateTelemetryUI();
    if (typeof syncSettingsLanHostDiskSection === 'function') syncSettingsLanHostDiskSection();
    syncWorkContextChrome();
    return;
  }
  var docEl = document.getElementById('profile-doctor');
  var proEl = document.getElementById('profile-profesor');
  var grEl  = document.getElementById('profile-grado');
  if (docEl) docEl.value = settings.doctorName || '';
  if (proEl) proEl.value = settings.profesorName || '';
  if (grEl)  grEl.value  = settings.grado || '';
  var modeSala = document.getElementById('app-mode-sala');
  var modeInter = document.getElementById('app-mode-inter');
  if (modeSala && modeInter) {
    if ((settings.appMode || 'sala') === 'sala') modeSala.checked = true;
    else modeInter.checked = true;
  }
  var srvEl = document.getElementById('settings-default-servicio');
  if (srvEl) srvEl.value = settings.defaultServicio || '';
  var medTpl = settings.medicosPlantilla || {};
  ['profesor','r4','r2','r1a','r1b'].forEach(function(k){
    var el = document.getElementById('settings-medico-' + k);
    if (el) el.value = medTpl[k] || '';
  });
  var lbl = document.getElementById('profile-toggle-label');
  if (lbl) {
    if (settings.doctorName || settings.grado) {
      var parts = [];
      if (settings.doctorName) parts.push(settings.doctorName);
      if (settings.grado) parts.push(settings.grado);
      lbl.textContent = parts.join(' · ');
    } else {
      lbl.textContent = 'Mi Perfil';
    }
  }
  var dEl = document.getElementById('profile-preview-dieta-txt');
  var cEl = document.getElementById('profile-preview-cuidados-txt');
  var mEl = document.getElementById('profile-preview-meds-txt');
  function preview(val) { return val ? (val.slice(0,40) + (val.length > 40 ? '…' : '')) : '(vacío)'; }
  if (dEl) dEl.textContent = preview(settings.defaultDieta);
  if (cEl) cEl.textContent = preview(settings.defaultCuidados);
  if (mEl) mEl.textContent = preview(settings.defaultMedicamentos);
  var dirEl = document.getElementById('settings-output-dir');
  if (dirEl) {
    if (settings.outputDir) {
      var pathParts = settings.outputDir.replace(/\\/g, '/').split('/');
      dirEl.textContent = pathParts[pathParts.length - 1] || settings.outputDir;
      dirEl.title = settings.outputDir;
    } else {
      dirEl.textContent = 'Descargas (predeterminado)';
      dirEl.title = '';
    }
  }
  var quickFormatEl = document.getElementById('settings-quick-output-format');
  if (quickFormatEl) quickFormatEl.value = normalizeQuickOutputFormat(settings.quickOutputFormat);
  var verEl = document.getElementById('settings-app-version');
  if (verEl) {
    if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
      window.electronAPI.getAppVersion().then(function(v) {
        verEl.textContent = v || '—';
        var LAST_SEEN_VERSION_KEY = 'rplus-last-seen-app-version';
        var prev = localStorage.getItem(LAST_SEEN_VERSION_KEY);
        if (prev && v && prev !== v) {
          showToast('Actualizado a v' + v + '. Consulta Ajustes o el menú para buscar actualizaciones.', 'success');
          maybeShowReleaseNotesFor(v, prev);
        }
        if (v) localStorage.setItem(LAST_SEEN_VERSION_KEY, v);
      }).catch(function() { verEl.textContent = '—'; });
    } else {
      verEl.textContent = 'Web / desarrollo';
    }
  }
  var hintEl = document.getElementById('settings-updates-hint');
  if (hintEl) hintEl.classList.toggle('is-visible', !!window.electronAPI);
  var udEl = document.getElementById('settings-user-data-path');
  var udHint = document.getElementById('settings-userdata-web-hint');
  var udBtn = document.getElementById('settings-open-userdata-btn');
  if (window.electronAPI && typeof window.electronAPI.getUserDataPath === 'function') {
    if (udHint) udHint.classList.remove('is-visible');
    if (udBtn) udBtn.disabled = false;
    window.electronAPI.getUserDataPath().then(function(p) {
      if (udEl) {
        udEl.textContent = p || '—';
        udEl.title = p || '';
      }
    }).catch(function() { if (udEl) udEl.textContent = '—'; });
  } else {
    if (udEl) udEl.textContent = 'Navegador / modo desarrollo';
    if (udHint) udHint.classList.add('is-visible');
    if (udBtn) udBtn.disabled = true;
  }
  syncFontZoomButtons();
  syncHighContrastButtons();
  syncUiDensityButtons();
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  syncIdleLockSelectUi();
  syncPreimportBackupUi();
  if (typeof syncSettingsLanHostDiskSection === 'function') syncSettingsLanHostDiskSection();
  syncWorkContextChrome();
}

function saveSettings() {
  settings.doctorName   = (document.getElementById('profile-doctor').value   || '').trim();
  settings.profesorName = (document.getElementById('profile-profesor').value || '').trim();
  settings.grado        = (document.getElementById('profile-grado').value    || '').trim();
  settings.quickOutputFormat = normalizeQuickOutputFormat(settings.quickOutputFormat);
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  var backfill = false;
  Object.keys(notes).forEach(function(pid) {
    if (notes[pid] && applyProfileToNoteIfEmpty(notes[pid])) backfill = true;
  });
  if (backfill) saveState();
  loadSettings();
  if (activeId) renderNoteForm();
  showToast('Perfil guardado ✓', 'success');
}

function applyAppModeSwitchEffects() {
  var current = getActiveInnerTab();
  var nowSala = isModeSala(settings);
  if (nowSala && (current === 'notas' || current === 'indica')) switchInnerTab('todo');
  else if (!nowSala && (current === 'listado' || current === 'datos')) switchInnerTab('todo');
  renderInnerTabs();
  renderEstadoActualButton();
  if (activeId) renderNoteForm();
  syncWorkContextChrome();
  if (isPaseMode()) renderRoundOverviewPanels();
  showToast('Modo cambiado a ' + (nowSala ? 'Sala' : 'Interconsulta'), 'success');
}

function onAppModeChange() {
  var sala = document.getElementById('app-mode-sala');
  settings.appMode = sala && sala.checked ? 'sala' : 'interconsulta';
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  applyAppModeSwitchEffects();
}

function toggleHeaderWorkMode() {
  settings.appMode = isModeSala(settings) ? 'interconsulta' : 'sala';
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  var modeSalaEl = document.getElementById('app-mode-sala');
  var modeInterEl = document.getElementById('app-mode-inter');
  if (modeSalaEl && modeInterEl) {
    if (isModeSala(settings)) modeSalaEl.checked = true;
    else modeInterEl.checked = true;
  }
  applyAppModeSwitchEffects();
}

function onDefaultServicioBlur() {
  var el = document.getElementById('settings-default-servicio');
  if (!el) return;
  var v = (el.value || '').trim().toUpperCase();
  el.value = v;
  settings.defaultServicio = v;
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  var w = document.getElementById('default-servicio-warning');
  var looksAbbrev = v.length > 0 && v.length <= 3 && /^[A-Z]+$/.test(v);
  if (w) w.style.display = looksAbbrev ? 'block' : 'none';
}

function onMedicoTemplateBlur() {
  var keys = ['profesor','r4','r2','r1a','r1b'];
  var tpl = {};
  keys.forEach(function(k){
    var el = document.getElementById('settings-medico-' + k);
    tpl[k] = el ? (el.value || '').trim() : '';
  });
  settings.medicosPlantilla = tpl;
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
}


function normalizeQuickOutputFormat(format) {
  var normalized = String(format || '').trim().toLowerCase();
  if (normalized !== 'html' && normalized !== 'txt' && normalized !== 'docx') return 'docx';
  return normalized;
}

function saveQuickOutputFormat(format) {
  settings.quickOutputFormat = normalizeQuickOutputFormat(format);
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  loadSettings();
  showToast('Formato de salida rápida actualizado', 'success');
}

function chooseOutputDir() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
    showToast('Función no disponible en este entorno', 'error');
    return;
  }
  window.electronAPI.selectOutputDir().then(function(dir) {
    if (!dir) return;
    settings.outputDir = dir;
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
    loadSettings();
    showToast('Carpeta actualizada ✓', 'success');
  });
}

function saveOutputDirSelection(dir) {
  if (!dir) return;
  settings.outputDir = dir;
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  loadSettings();
}

function requestDocumentJson(url, payload) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(function(r){ return r.json(); });
}

function getOutputDirSelector() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) return undefined;
  return function() { return window.electronAPI.selectOutputDir(); };
}

function handleDocumentGenerateResponse(opts) {
  return handleOutputDirFallback({
    response: opts.response,
    selectOutputDir: getOutputDirSelector(),
    saveOutputDir: saveOutputDirSelection,
    retry: function(dir) {
      return requestDocumentJson(opts.url, opts.buildPayload(dir));
    },
    onSuccess: opts.onSuccess,
    onError: function(message) {
      showToast('Error: ' + message, 'error');
    },
    onPrompt: function() {
      showToast('Selecciona una carpeta para guardar el documento.', 'error');
    },
    onCancel: function() {
      showToast('No se guardó el documento: no se eligió carpeta.', 'error');
    },
  });
}

function openProfileModal() {
  var modal = document.getElementById('profile-modal');
  if (!modal) return;
  loadSettings();
  modal.classList.add('open');
  setTimeout(function() {
    var first = document.getElementById('profile-doctor');
    if (first) first.focus();
  }, 80);
}

function closeProfileModal() {
  var modal = document.getElementById('profile-modal');
  if (modal) modal.classList.remove('open');
}

  if (modal.classList.contains('open')) closeProfileModal();
  else openProfileModal();
}

function syncProfileSectionVisibility() {
  // No-op desde 3.0: la sección del sidebar es solo el botón disparador y siempre se muestra.
  // Conservada para no romper callers externos que la invocan.
}

function openProfileFromHeader(ev) {
  if (ev) ev.preventDefault();
  openProfileModal();
}

function toggleSettingsSection() {
  toggleSettingsDropdown();
}


function syncSettingsLanHostDiskSection() {
  var acc = document.getElementById('settings-accordion-lan-host-disk');
  if (!acc) return;
  if (bg) bg.classList.remove('open');
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

/** Abre el desplegable de Ajustes y la sección «Respaldos, sync y recuperación» (mismos controles que en ⚙). */
function expandSettingsAccordionBackupSync() {
  var det = document.getElementById('settings-accordion-backup-sync');
  if (det) det.open = true;
}


function syncTeamSyncHeaderButton() {
  var btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  var desktop = !!(window.electronAPI && typeof window.electronAPI.getAppVersion === 'function');
  btn.style.display = desktop || isMobileWeb() ? 'flex' : 'none';
}

function guardMobileDocExport() {
  if (!blockIfMobileDocExport()) return false;
  mobileDocExportToast(showToast);
  return true;
}

async function initMobileWebBoot() {
  if (!isMobileWeb()) return;
  try {
    document.title = 'R+ Móvil';
  } catch (_e) {}
  syncTeamSyncHeaderButton();
  try {
    var v = await resolveAppVersionForTour();
    window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
    markGuidedTourVersionDone();
  } catch (_bootVer) {}
  var intro = document.getElementById('onboarding-intro-backdrop');
  if (intro) {
    intro.classList.remove('open');
    intro.setAttribute('aria-hidden', 'true');
  }
  var parsed = parseLanJoinQuery(location.search, location.origin);
  if (!parsed.teamCode) {
    setTimeout(function () {
      if (typeof openConnectionDropdown === 'function') openConnectionDropdown();
    }, 600);
    return;
  }
  var hostUrl = String(parsed.hostUrl || location.origin || '')
    .trim()
    .replace(/\/+$/, '');
  if (!hostUrl) return;
  configureLanFromMobileJoin(hostUrl, parsed.teamCode, parsed.roomId);
}



function openTemplatesModal() {
  document.getElementById('tmpl-dieta').value    = settings.defaultDieta    || '';
  document.getElementById('tmpl-cuidados').value = settings.defaultCuidados || '';
  document.getElementById('tmpl-meds').value     = settings.defaultMedicamentos || '';
  document.getElementById('templates-modal').style.display = 'flex';
}

function closeTemplatesModal() {
  document.getElementById('templates-modal').style.display = 'none';
}

function saveTemplates() {
  settings.defaultDieta        = document.getElementById('tmpl-dieta').value.trim();
  settings.defaultCuidados     = document.getElementById('tmpl-cuidados').value.trim();
  settings.defaultMedicamentos = document.getElementById('tmpl-meds').value.trim();
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  closeTemplatesModal();
  loadSettings();
  showToast('Plantillas guardadas ✓', 'success');
}


function applyDefaultsToNewPatient(patientId) {
  if (!notes[patientId]) return;
  applyProfileToNoteIfEmpty(notes[patientId]);
}

function applyDefaultsToNewIndicaciones(patientId) {
  if (!indicaciones[patientId]) return;
  if (settings.defaultDieta        && !indicaciones[patientId].dieta)        indicaciones[patientId].dieta        = settings.defaultDieta;
  if (settings.defaultCuidados     && !indicaciones[patientId].cuidados)     indicaciones[patientId].cuidados     = settings.defaultCuidados;
  if (settings.defaultMedicamentos && !indicaciones[patientId].medicamentos) indicaciones[patientId].medicamentos = settings.defaultMedicamentos;
}





function launchConfetti() {
  var colors = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#fb7185'];
  for (var i = 0; i < 40; i++) {
    (function(idx) {
      setTimeout(function() {
        var el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = (Math.random() * 100) + 'vw';
        el.style.top  = '-10px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = (Math.random() * 0.5) + 's';
        el.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
        document.body.appendChild(el);
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
      }, idx * 40);
    })(i);
  }
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg, type) {
  var focused = document.activeElement;
  var t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show' + (type ? ' '+type : '');
  if (focused && focused.tagName !== 'BODY') setTimeout(function(){ focused.focus(); }, 0);
  setTimeout(function(){ t.className = 'toast'; }, 3500);
}

function getMedNotaSelMap(patientId) {
  if (!medNotaSelectionByPatient[patientId]) medNotaSelectionByPatient[patientId] = {};
  return medNotaSelectionByPatient[patientId];
}

function isMedNotaSelected(patientId, itemId) {
  return !!getMedNotaSelMap(patientId)[itemId];
}

function setMedNotaSelected(patientId, itemId, on) {
  var m = getMedNotaSelMap(patientId);
  if (on) m[itemId] = true;
  else delete m[itemId];
}

function renderMedNotaFooter() {
  var foot = document.getElementById('med-nota-footer');
  if (!foot) return;
  foot.style.display = 'block';

  var block = activeId ? medRecetaByPatient[activeId] : null;
  var sel = activeId ? getMedNotaSelMap(activeId) : {};
  var soapItems =
    block && block.items
      ? block.items.filter(function (it) {
          return sel[it.id] && !it.suspendido;
        })
      : [];

  var groups = { analgesia: [], antihta: [], abx: [], vasop: [], otros: [] };
  soapItems.forEach(function (it) {
    var cat = classifyMedicationSoapCategory(it.nombreRaw);
    if (groups[cat]) groups[cat].push(it);
    else groups.otros.push(it);
  });

  function chipsFor(arr) {
    return arr
      .map(function (it) {
        var frag = medInstructionFragmentForSoap(it);
        return (
          '<span class="med-soap-preview-chip" title="' +
          esc((it.nombreRaw || '').slice(0, 220)) +
          '">' +
          esc(frag) +
          '</span>'
        );
      })
      .join('');
  }

  function section(cat, title) {
    if (!groups[cat].length) return '';
    return (
      '<div class="med-soap-preview-sec med-soap-preview-sec--' +
      cat +
      '">' +
      '<div class="med-soap-preview-sec-title">' +
      esc(title) +
      '</div>' +
      '<div class="med-soap-preview-chips">' +
      chipsFor(groups[cat]) +
      '</div></div>'
    );
  }

  var previewHtml = soapItems.length
    ? '<div class="med-soap-preview">' +
      section('analgesia', 'Analgésicos / antieméticos') +
      section('antihta', 'AntiHTA / diuréticos') +
      section('abx', 'Antibióticos / antifúngicos') +
      section('vasop', 'Vasopresores / inotrópicos') +
      section('otros', 'Otros (se copian en Antibióticos — revisar)') +
      '</div>'
    : '<p class="med-soap-preview-empty">Marcá <strong>SOAP</strong> en el listado para ver aquí cómo se repartirán en la plantilla.</p>';

  foot.innerHTML =
    '<div class="med-nota-toolbar">' +
    '<p class="med-nota-hint">Solo los medicamentos con <strong>SOAP</strong> activo aparecen abajo, clasificados según el nombre del fármaco en la receta.</p>' +
    previewHtml +
    '<div class="med-nota-actions">' +
    '<button type="button" class="btn-generate" onclick="mediAnadirATratamiento()">Añadir a Tratamiento</button>' +
    '<button type="button" class="btn-generate" style="background:#065F46;" onclick="mediLlevarASOAP()">Abrir plantilla SOAP</button>' +
    '<button type="button" class="btn-med-secondary" onclick="limpiarSeleccionMedNota()">Limpiar</button>' +
    '</div>' +
    '</div>';
}

function hideMedNotaFooter() {
  var foot = document.getElementById('med-nota-footer');
  if (foot) {
    foot.style.display = 'none';
    foot.innerHTML = '';
  }
}

function renderMedRecetaPanel() {
  var hintEl = document.getElementById('med-hint');
  var fechaEl = document.getElementById('med-fecha-actualizacion');
  var listEl = document.getElementById('med-items-list');
  var outPre = document.getElementById('med-output');
  var outCard = document.getElementById('med-output-section');
  if (!hintEl || !listEl || !outPre) return;
  if (!activeId) {
    hintEl.style.display = 'block';
    hintEl.textContent = 'Selecciona un paciente en la columna izquierda para procesar su receta.';
    if (fechaEl) fechaEl.style.display = 'none';
    listEl.innerHTML = '';
    outPre.textContent = '';
    if (outCard) outCard.style.display = 'none';
    hideMedNotaFooter();
    if (isPaseMode()) renderPaseBoard();
    return;
  }
  var block = medRecetaByPatient[activeId];
  if (!block || !block.items || !block.items.length) {
    hintEl.style.display = 'block';
    hintEl.textContent = 'Pega el listado del hospital arriba y pulsa Receta. Cada día puedes volver a pegar; se guarda la fecha del recorte.';
    if (fechaEl) fechaEl.style.display = 'none';
    listEl.innerHTML = '';
    outPre.textContent = '';
    if (outCard) outCard.style.display = 'none';
    hideMedNotaFooter();
    if (isPaseMode()) renderPaseBoard();
    return;
  }
  hintEl.style.display = 'none';
  if (fechaEl) {
    fechaEl.style.display = 'block';
    fechaEl.textContent = 'Actualizado: ' + (block.fechaActualizacion || '—');
  }
  var rows = block.items.map(function (it) {
    var sid = String(it.id || '');
    var label = esc((it.nombreRaw || '').slice(0, 120));
    var chk = it.suspendido ? ' checked' : '';
    var paraNota = isMedNotaSelected(activeId, sid) ? ' checked' : '';
    var diaCell =
      it.diaTratamiento != null
        ? '<span class="med-receta-dia">Día ' + esc(String(it.diaTratamiento)) + '</span>'
        : '';
    return (
      '<div class="med-receta-row">' +
      '<div class="med-receta-checkcell">' +
      '<input type="checkbox"' +
      chk +
      ' title="Excluir del texto de egreso"' +
      ' onchange="toggleMedRecetaSuspendido(\'' +
      safeAttrJsString(sid) +
      '\', this.checked)"/>' +
      '</div>' +
      '<div class="med-receta-checkcell">' +
      '<input type="checkbox"' +
      paraNota +
      ' title="Incluir en Tratamiento y campos SOAP (Analgesia / ABX / AntiHTA)"' +
      ' onchange="toggleMedRecetaParaNota(\'' +
      safeAttrJsString(sid) +
      '\', this.checked)"/>' +
      '</div>' +
      '<div class="med-receta-name">' +
      label +
      '</div>' +
      diaCell +
      '</div>'
    );
  });
  listEl.innerHTML =
    '<div class="med-receta-wrap">' +
    '<div class="med-receta-head">' +
    '<span>Excl.</span>' +
    '<span>SOAP</span>' +
    '<span>Medicamento</span>' +
    '<span>Día</span>' +
    '</div>' +
    rows.join('') +
    '</div>';
  renderMedNotaFooter();
  var tabFull = document.getElementById('med-tab-full');
  var tabSimple = document.getElementById('med-tab-simple');
  var tabTrack = document.getElementById('med-output-tabs-track');
  if (tabTrack) tabTrack.setAttribute('data-active', medOutputTab === 'simple' ? 'simple' : 'full');
  if (tabFull) {
    tabFull.classList.toggle('active', medOutputTab === 'full');
    tabFull.setAttribute('aria-selected', medOutputTab === 'full' ? 'true' : 'false');
  }
  if (tabSimple) {
    tabSimple.classList.toggle('active', medOutputTab === 'simple');
    tabSimple.setAttribute('aria-selected', medOutputTab === 'simple' ? 'true' : 'false');
  }
  var txtFull = buildMedRecetaCopyText(block.items);
  var txtSimple = buildMedRecetaNameOnlyText(block.items);
  var txt = medOutputTab === 'simple' ? txtSimple : txtFull;
  outPre.textContent = txt;
  if (outCard) outCard.style.display = txt.trim() ? 'block' : 'none';
  if (isPaseMode()) renderPaseBoard();
}

function toggleMedRecetaSuspendido(itemId, suspended) {
  if (!activeId || !medRecetaByPatient[activeId] || !medRecetaByPatient[activeId].items) return;
  var it = medRecetaByPatient[activeId].items.find(function (x) {
    return String(x.id) === String(itemId);
  });
  if (!it) return;
  it.suspendido = !!suspended;
  saveState();
  renderMedRecetaPanel();
}

function toggleMedRecetaParaNota(itemId, selected) {
  if (!activeId) return;
  setMedNotaSelected(activeId, String(itemId), !!selected);
  renderMedRecetaPanel();
}

function limpiarSeleccionMedNota() {
  if (activeId) medNotaSelectionByPatient[activeId] = {};
  renderMedRecetaPanel();
  showToast('Selección limpiada', 'success');
}

function medInstructionFragmentForSoap(it) {
  var full = formatMedicationEgresoLine(it);
  var parts = full.split('||');
  if (parts.length < 2) return full.replace(/\.\s*$/, '').trim();
  return parts[1].replace(/^\s+/, '').replace(/\.\s*$/, '').trim();
}


function mediAnadirATratamiento() {
  if (!activeId) {
    showToast('Selecciona un paciente', 'error');
    return;
  }
  var block = medRecetaByPatient[activeId];
  if (!block || !block.items || !block.items.length) {
    showToast('No hay medicamentos en la receta', 'error');
    return;
  }
  var sel = getMedNotaSelMap(activeId);
  var lines = block.items
    .filter(function (it) {
      return sel[it.id] && !it.suspendido;
    })
    .map(function (it) {
      return formatMedicationEgresoLine(it);
    });
  if (!lines.length) {
    showToast('Marca «SOAP» en al menos un medicamento activo', 'error');
    return;
  }
  if (!notes[activeId]) notes[activeId] = {};
  var tx = notes[activeId].tratamiento;
  if (!Array.isArray(tx) || !tx.length) tx = [''];
  var firstEmpty = tx.length === 1 && !(tx[0] || '').trim();
  if (firstEmpty) {
    notes[activeId].tratamiento = lines.slice();
  } else {
    lines.forEach(function (L) {
      tx.push(L);
    });
    notes[activeId].tratamiento = tx;
  }
  saveState();
  openPaseSectionInNormal('expediente');
  renderNoteForm();
  showToast(lines.length + ' línea(s) añadidas a Tratamiento', 'success');
}

function mediLlevarASOAP() {
  if (!activeId) {
    showToast('Selecciona un paciente', 'error');
    return;
  }
  var block = medRecetaByPatient[activeId];
  var sel = getMedNotaSelMap(activeId);
  var hasReceta =
    block &&
    block.items &&
    block.items.some(function (it) {
      return sel[it.id] && !it.suspendido;
    });
  if (!hasReceta) {
    showToast('Marca «SOAP» en al menos un medicamento de la receta', 'error');
    return;
  }
  var buckets = { analgesia: [], abx: [], antihta: [], vasop: [], otros: [] };
  if (block && block.items) {
    block.items.forEach(function (it) {
      if (!sel[it.id] || it.suspendido) return;
      var cat = classifyMedicationSoapCategory(it.nombreRaw);
      buckets[cat].push(medInstructionFragmentForSoap(it));
    });
  }
  var otrosN = buckets.otros.length;
  buckets.otros.forEach(function (t) {
    buckets.abx.push(t);
  });
  if (!buckets.analgesia.length && !buckets.abx.length && !buckets.antihta.length && !buckets.vasop.length) {
    showToast('No quedó nada que volcar', 'error');
    return;
  }
  buckets.analgesia.forEach(function (t) {
    mergeSoapMedField('soap-analgesia', t);
  });
  buckets.abx.forEach(function (t) {
    mergeSoapMedField('soap-abx', t);
  });
  buckets.antihta.forEach(function (t) {
    mergeSoapMedField('soap-antihta', t);
  });
  buckets.vasop.forEach(function (t) {
    mergeSoapMedField('soap-vasop', t);
  });
  openPaseSectionInNormal('expediente');
  renderNoteForm();
  openSOAPModalDirect();
  var toastMsg = 'Campos SOAP actualizados · completa e Insertar en evolución';
  if (otrosN) toastMsg += ' · Revisa Antibióticos (incluye «Otros»)';
  showToast(toastMsg, 'success');
  renderMedRecetaPanel();
}

function procesarRecetaMed() {
  if (!activeId) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var ta = document.getElementById('med-input');
  var raw = ta ? ta.value : '';
  var parsed = parseMedicationPaste(raw || '');
  if (!parsed.items.length) {
    if (!looksLikeSomeMedicationPaste(raw || '')) {
      showToast(
        'No parece el bloque de SOME. En expediente, copia desde la columna Fecha y hora hasta el final de medicamentos (con tabuladores) y pégalo aquí.',
        'error'
      );
    } else {
      showToast('No se encontraron filas MEDICAMENTOS válidas en el pegado', 'error');
    }
    return;
  }
  var today = new Date();
  var fallback =
    String(today.getDate()).padStart(2, '0') +
    '/' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '/' +
    today.getFullYear();
  var fecha = resolveFechaActualizacion(parsed.fechas, fallback);
  medRecetaByPatient[activeId] = {
    fechaActualizacion: fecha,
    items: parsed.items,
  };
  medNotaSelectionByPatient[activeId] = {};
  saveState();
  renderMedRecetaPanel();
  var msg = 'Receta actualizada (' + parsed.items.length + ' medicamentos)';
  if (parsed.skipped > 0) msg += '. Omitidas ' + parsed.skipped + ' líneas.';
  showToast(msg, 'success');
}

function limpiarRecetaInput() {
  var ta = document.getElementById('med-input');
  if (ta) ta.value = '';
}

function incrementMedDiaTratamiento() {
  if (!activeId) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var block = medRecetaByPatient[activeId];
  if (!block || !block.items || !block.items.length) {
    showToast('No hay medicamentos procesados', 'error');
    return;
  }
  var res = incrementMedItemsDiaTratamiento(block.items);
  if (!res.count) {
    showToast('Ningún medicamento con DIA# activo', 'error');
    return;
  }
  block.items = res.items;
  saveState();
  renderMedRecetaPanel();
  showToast(
    res.count === 1 ? 'Día de tratamiento +1 (1 medicamento)' : 'Día de tratamiento +1 (' + res.count + ' medicamentos)',
    'success'
  );
}

function copiarMedicamentosAlPortapapeles() {
  if (!activeId || !medRecetaByPatient[activeId]) {
    showToast('No hay medicamentos procesados', 'error');
    return;
  }
  var items = medRecetaByPatient[activeId].items || [];
  var text = buildMedRecetaCopyText(items);
  var simple = buildMedRecetaNameOnlyText(items);
  if (medOutputTab === 'simple') {
    text = simple;
  }
  if (!text.trim()) {
    showToast('No hay medicamentos activos para copiar', 'error');
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(function () {
      showToast('Medicamentos copiados al portapapeles ✓', 'success');
    })
    .catch(function () {
      showToast('Error al copiar al portapapeles', 'error');
    });
}

function setMedOutputTab(tab) {
  if (tab !== 'full' && tab !== 'simple') return;
  medOutputTab = tab;
  renderMedRecetaPanel();
}


var modalDismiss = createModalDismissRegistry();

function initModalDismiss() {
  var dynamicBackdropIds = [
    'lab-dedupe-backdrop',
    'soap-confirm-backdrop',
    'dup-confirm-backdrop',
    'lab-conflict-backdrop',
    'exp-advice-backdrop'
  ];

  function el(id) {
    return document.getElementById(id);
  }

  modalDismiss.register({
    isOpen: function () {
      return dynamicBackdropIds.some(function (id) {
        return !!el(id);
      });
    },
    close: function () {
      dynamicBackdropIds.forEach(function (id) {
        var node = el(id);
        if (node) node.remove();
      });
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('update-modal-backdrop'));
    },
    close: hideUpdateModal,
    backdropEl: function () {
      return el('update-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('tend-detail-backdrop'));
    },
    close: closeTendDetail,
    backdropEl: function () {
      return el('tend-detail-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return tendGroupModal.isOpen();
    },
    close: closeTendGroupModal,
    backdropEl: function () {
      return el('tend-group-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('rpc-wipe-modal');
      return m && m.getAttribute('aria-hidden') === 'false';
    },
    close: closeWipeDataModal,
    backdropEl: function () {
      return el('rpc-wipe-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('soap-modal-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeSOAPModal,
    backdropEl: function () {
      return el('soap-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('procedure-agenda-modal');
      return m && m.classList.contains('open');
    },
    close: closeProcedureAgendaModal,
    backdropEl: function () {
      return el('procedure-agenda-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('modal');
      return m && m.classList.contains('open');
    },
    close: closeModal,
    confirmClose: confirmCloseAddPatientModal,
    backdropEl: function () {
      return el('modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('profile-modal');
      return m && m.classList.contains('open');
    },
    close: closeProfileModal,
    backdropEl: function () {
      return el('profile-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('templates-modal'));
    },
    close: closeTemplatesModal,
    backdropEl: function () {
      return el('templates-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('extra-templates-modal'));
    },
    close: closeExtraTemplatesManager,
    backdropEl: function () {
      return el('extra-templates-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('unified-search-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeUnifiedSearch,
    backdropEl: function () {
      return el('unified-search-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('help-quick-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeQuickHelp,
    backdropEl: function () {
      return el('help-quick-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('release-notes-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeReleaseNotes,
    backdropEl: function () {
      return el('release-notes-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('tend-hidden-modal-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeTendHiddenModal,
    backdropEl: function () {
      return el('tend-hidden-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-display-prefs-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeLabDisplayPrefsModal,
    backdropEl: function () {
      return el('lab-display-prefs-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('onboarding-intro-backdrop');
      return b && b.classList.contains('open');
    },
    close: hideTourIntroModal,
    backdropEl: function () {
      return el('onboarding-intro-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var c = el('connection-dropdown');
      return c && c.classList.contains('open');
    },
    close: closeConnectionDropdown,
    backdropEl: function () {
      return el('connection-dropdown-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var s = el('settings-dropdown');
      return s && s.classList.contains('open');
    },
    close: closeSettingsDropdown,
    backdropEl: function () {
      return el('settings-dropdown-backdrop');
    }
  });

  modalDismiss.init();

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('lab-conflict-backdrop')) return;
    if (dynamicBackdropIds.indexOf(t.id) === -1) return;
    t.remove();
  });
}

document.addEventListener('keydown', function(e) {
  var mod = e.metaKey || e.ctrlKey;
  if (mod) {
    var key = e.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
      e.preventDefault();
      if (isPaseMode()) {
        if (key === '1') openPaseSectionInNormal('labs');
        if (key === '2') openPaseSectionInNormal('expediente');
        if (key === '3') openPaseSectionInNormal('med');
        if (key === '5') openPaseSectionInNormal('agenda');
      } else {
        if (key === '1') switchAppTab('lab');
        if (key === '2') switchAppTab('nota');
        if (key === '3') switchAppTab('med');
        if (key === '5') switchAppTab('agenda');
      }
      if (key === '4') {
        var dd = document.getElementById('settings-dropdown');
        if (dd && !dd.classList.contains('open')) toggleSettingsDropdown();
      }
    }
    if (key === 'p' && !e.altKey) {
      e.preventDefault();
      if (e.shiftKey) toggleProfileSection();
      else setUiDensity(getUiDensity() === 'normal' ? 'pase' : 'normal');
    }
    if (e.key === ',' && !e.shiftKey && !e.altKey) {
      if (typeof isTypingContext === 'function' && isTypingContext(e.target)) return;
      e.preventDefault();
      window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
      showToast(
        window.__rpcPreferImportOverwrite
          ? 'Importación: conflictos → sobrescribir (⌘, o Ctrl+, de nuevo para apagar).'
          : 'Importación: se preguntará en cada conflicto.',
        window.__rpcPreferImportOverwrite ? 'success' : 'info'
      );
    }
  }
});


function _todoCompareForSort(a, b) {
  if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
  var prioOrder = { alta: 0, media: 1, baja: 2 };
  var pa = prioOrder[a.priority] != null ? prioOrder[a.priority] : 1;
  var pb = prioOrder[b.priority] != null ? prioOrder[b.priority] : 1;
  if (pa !== pb) return pa - pb;
  if (a.createdAt && b.createdAt) return String(b.createdAt).localeCompare(String(a.createdAt));
  return 0;
}

function refreshAllTodoUIs() {
  var elClassic = document.getElementById('todo-form');
  if (elClassic) renderTodoFormIn(elClassic, '');
  var overview = document.getElementById('patient-ronda-overview');
  var ronda = document.getElementById('patient-ronda-todos-mount');
  if (!ronda) return;
  var showRonda =
    isPaseMode() &&
    overview &&
    overview.style.display !== 'none' &&
    activeId &&
    activeAppTab === 'nota' &&
    getRoundOverviewMode();
  if (showRonda) {
    renderTodoFormIn(ronda, 'ronda-');
  } else {
    while (ronda.firstChild) ronda.removeChild(ronda.firstChild);
  }
  if (isPaseMode()) renderPaseBoard();
}

function renderTodoForm() {
  refreshAllTodoUIs();
}

function renderTodoFormIn(container, idPrefix) {
  if (!container) return;
  idPrefix = idPrefix == null ? '' : String(idPrefix);
  while (container.firstChild) container.removeChild(container.firstChild);

  if (!activeId) {
    var empty = document.createElement('p');
    empty.className = 'todo-empty';
    empty.textContent = 'Selecciona un paciente para ver sus pendientes.';
    container.appendChild(empty);
    return;
  }

  var addRow = document.createElement('div');
  addRow.className = 'todo-add-row';
  var input = document.createElement('input');
  input.type = 'text';
  input.id = idPrefix + 'todo-input';
  input.placeholder = 'Nuevo pendiente...';
  var sel = document.createElement('select');
  sel.id = idPrefix + 'todo-priority';
  [
    { v: 'alta',  t: 'Alta'  },
    { v: 'media', t: 'Media' },
    { v: 'baja',  t: 'Baja'  }
  ].forEach(function (o) {
    var opt = document.createElement('option');
    opt.value = o.v;
    opt.textContent = o.t;
    if (o.v === 'media') opt.selected = true;
    sel.appendChild(opt);
  });
  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = 'Agregar';
  addBtn.addEventListener('click', function () { addTodo(idPrefix); });
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') addTodo(idPrefix);
  });
  addRow.appendChild(input);
  addRow.appendChild(sel);
  addRow.appendChild(addBtn);
  container.appendChild(addRow);

  var todos = storage.getTodos(activeId).slice().sort(_todoCompareForSort);
  if (!todos.length) {
    var none = document.createElement('p');
    none.className = 'todo-empty';
    none.textContent = 'Sin pendientes. Agrega el primero arriba.';
    container.appendChild(none);
    return;
  }

  var list = document.createElement('div');
  todos.forEach(function (t) {
    var prio = t.priority === 'alta' || t.priority === 'baja' ? t.priority : 'media';
    var row = document.createElement('div');
    row.className = 'todo-row prio-' + prio + (t.completed ? ' completed' : '');

    var chip = document.createElement('span');
    chip.className = 'todo-prio ' + prio;
    chip.title = 'Prioridad: ' + (prio === 'alta' ? 'Alta' : prio === 'baja' ? 'Baja' : 'Media');
    row.appendChild(chip);

    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'todo-check';
    chk.setAttribute('aria-label', 'Completado');
    chk.checked = !!t.completed;
    chk.addEventListener('change', function () { toggleTodo(t.id); });
    row.appendChild(chk);

    var txtInput = document.createElement('input');
    txtInput.type = 'text';
    txtInput.className = 'todo-text-input';
    txtInput.value = t.text;
    txtInput.placeholder = 'Descripción del pendiente';
    txtInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        txtInput.blur();
      }
    });
    txtInput.addEventListener('blur', function () {
      var v = String(txtInput.value || '').trim();
      if (!v) {
        txtInput.value = t.text;
        return;
      }
      if (v !== String(t.text || '')) updateTodoText(t.id, v);
    });
    row.appendChild(txtInput);

    var prioSel = document.createElement('select');
    prioSel.className = 'todo-row-select';
    [
      { v: 'alta',  t: 'Alta'  },
      { v: 'media', t: 'Media' },
      { v: 'baja',  t: 'Baja'  }
    ].forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.v;
      opt.textContent = o.t;
      if (o.v === prio) opt.selected = true;
      prioSel.appendChild(opt);
    });
    prioSel.title = 'Cambiar prioridad';
    prioSel.addEventListener('change', function () { setTodoPriority(t.id, prioSel.value); });
    row.appendChild(prioSel);

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'todo-del';
    del.textContent = '×';
    del.title = 'Eliminar';
    del.addEventListener('click', function () { deleteTodo(t.id); });
    row.appendChild(del);

    list.appendChild(row);
  });
  container.appendChild(list);
}

function addTodo(idPrefix) {
  if (idPrefix === undefined || idPrefix === null) idPrefix = '';
  if (typeof idPrefix !== 'string') idPrefix = '';
  if (!activeId) return;
  var input = document.getElementById(idPrefix + 'todo-input');
  var sel   = document.getElementById(idPrefix + 'todo-priority');
  if (!input) return;
  var text = String(input.value || '').trim();
  if (!text) return;
  var priority = sel && (sel.value === 'alta' || sel.value === 'baja' || sel.value === 'media') ? sel.value : 'media';
  var nowIso = new Date().toISOString();
  var todos = storage.getTodos(activeId);
  var row = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
    text: text,
    completed: false,
    priority: priority,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  todos.push(row);
  storage.saveTodos(activeId, todos);
  emitLiveSyncTodoUpsert(activeId, row);
  input.value = '';
  refreshAllTodoUIs();
}

function toggleTodo(id) {
  if (!activeId) return;
  var todos = storage.getTodos(activeId);
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.completed = !found.completed;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(activeId, todos);
  emitLiveSyncTodoUpsert(activeId, found);
  refreshAllTodoUIs();
}

function deleteTodo(id) {
  if (!activeId) return;
  var delAt = new Date().toISOString();
  var todos = storage.getTodos(activeId).filter(function (t) { return t.id !== id; });
  storage.saveTodos(activeId, todos);
  emitLiveSyncTodoDelete(activeId, id, delAt);
  refreshAllTodoUIs();
}

function setTodoPriority(id, priority) {
  if (!activeId) return;
  var valid = priority === 'alta' || priority === 'baja' || priority === 'media' ? priority : 'media';
  var todos = storage.getTodos(activeId);
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.priority = valid;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(activeId, todos);
  emitLiveSyncTodoUpsert(activeId, found);
  refreshAllTodoUIs();
}

function updateTodoText(id, text) {
  if (!activeId) return;
  var trimmed = String(text || '').trim();
  if (!trimmed) return;
  var todos = storage.getTodos(activeId);
  var found = todos.find(function (t) { return t.id === id; });
  if (!found || String(found.text || '') === trimmed) return;
  found.text = trimmed;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(activeId, todos);
  emitLiveSyncTodoUpsert(activeId, found);
  refreshAllTodoUIs();
}

function updatePatient(field, value) {
  if (activeId == null) return;
  var pid = String(activeId);
  var p = patients.find(function (pl) {
    return String(pl.id) === pid;
  });
  if (!p) return;
  var next =
    field === 'nombre' || field === 'area' || field === 'servicio'
      ? String(value || '').toUpperCase()
      : value;
  if (String(p[field] || '') === String(next || '')) return;
  p[field] = next;
  saveState();
  renderPatientList();
  renderPatientDataPane();
  syncWorkContextChrome();
  if (isPaseMode()) {
    renderPaseBoard();
    renderRoundOverviewPanels();
    if (activeAppTab === 'agenda') renderProcedureAgendaPanel();
  }
}

function escHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toLines(value) {
  if (Array.isArray(value)) return value.map(function(v){ return String(v || '').trim(); }).filter(Boolean);
  return String(value || '').split('\n').map(function(v){ return v.trim(); }).filter(Boolean);
}

function slugFilePart(value, fallback) {
  var base = String(value || '').trim().toLowerCase();
  var slug = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}

function getCurrentPatientClinicalData() {
  var patient = patients.find(function(p){ return p.id === activeId; });
  if (!patient) return null;
  return {
    patient: patient,
    note: notes[activeId] || {},
    indicacion: indicaciones[activeId] || {}
  };
}

function buildClinicalTextExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || 'both';
  var blocks = [];
  blocks.push('R+ - SALIDA CLINICA');
  blocks.push('PACIENTE: ' + (patient.nombre || ''));
  blocks.push('REGISTRO: ' + (patient.registro || ''));
  blocks.push('SERVICIO: ' + (patient.servicio || ''));
  blocks.push('CUARTO/CAMA: ' + (patient.cuarto || '') + '/' + (patient.cama || ''));
  blocks.push('');
  if (mode !== 'indica') {
    blocks.push('== NOTA DE EVOLUCION ==');
    blocks.push('FECHA/HORA: ' + (note.fecha || '') + ' ' + (note.hora || ''));
    blocks.push('DIAGNOSTICOS:');
    toLines(note.diagnosticos || []).forEach(function(v, idx){ blocks.push((idx + 1) + '. ' + v); });
    if (!toLines(note.diagnosticos || []).length) blocks.push('(sin contenido)');
  }
  function pushBlock(label, value) {
    blocks.push(label + ':');
    var lines = toLines(value);
    if (!lines.length) blocks.push('(sin contenido)');
    lines.forEach(function(l){ blocks.push('- ' + l); });
  }
  if (mode !== 'indica') {
    pushBlock('INTERROGATORIO', note.interrogatorio);
    pushBlock('EXPLORACION FISICA', note.exploracion);
    pushBlock('ESTUDIOS', note.estudios);
    pushBlock('ANALISIS', note.analisis);
    pushBlock('PLAN', note.plan);
    blocks.push('SIGNOS VITALES: TA ' + (note.ta || '-') + ' | FR ' + (note.fr || '-') + ' | FC ' + (note.fc || '-') + ' | TEMP ' + (note.temp || '-') + ' | PESO ' + (note.peso || '-'));
    pushBlock('TRATAMIENTO E INDICACIONES', note.tratamiento || []);
    blocks.push('MEDICO TRATANTE: ' + (note.medico || ''));
    blocks.push('PROFESOR RESPONSABLE: ' + (note.profesor || ''));
  }
  if (mode === 'both') blocks.push('');
  if (mode !== 'note') {
    blocks.push('== INDICACIONES ==');
    blocks.push('FECHA/HORA: ' + (ind.fecha || '') + ' ' + (ind.hora || ''));
    pushBlock('MEDICOS', ind.medicos);
    pushBlock('DIETA', ind.dieta);
    pushBlock('CUIDADOS', ind.cuidados);
    pushBlock('ESTUDIOS', ind.estudios);
    pushBlock('MEDICAMENTOS', ind.medicamentos);
    pushBlock('INTERCONSULTAS', ind.interconsultas);
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (otros.length) {
      blocks.push('OTROS:');
      otros.forEach(function(item, idx) {
        if (!item || typeof item !== 'object') return;
        blocks.push((idx + 1) + '. ' + (item.titulo || 'Seccion sin titulo'));
        toLines(item.contenido || '').forEach(function(line) { blocks.push('   - ' + line); });
      });
    }
  }
  return blocks.join('\n');
}

function buildClinicalHtmlExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || 'both';
  function renderList(values) {
    var lines = toLines(values);
    if (!lines.length) return '<p><em>Sin contenido</em></p>';
    return '<ul>' + lines.map(function(line){ return '<li>' + escHtml(line) + '</li>'; }).join('') + '</ul>';
  }
  function renderOtherSections() {
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (!otros.length) return '<p><em>Sin secciones adicionales</em></p>';
    return otros.filter(function(item) { return item && typeof item === 'object'; }).map(function(item) {
      return '<article><h4>' + escHtml(item.titulo || 'Seccion sin titulo') + '</h4>' + renderList(item.contenido || '') + '</article>';
    }).join('');
  }
  var noteHtml = '<section><h2>Nota de evolucion</h2>' +
    '<p><strong>Fecha/Hora:</strong> ' + escHtml(note.fecha || '') + ' ' + escHtml(note.hora || '') + '</p>' +
    '<h3>Diagnosticos</h3>' + renderList(note.diagnosticos || []) +
    '<h3>Interrogatorio</h3>' + renderList(note.interrogatorio) +
    '<h3>Exploracion fisica</h3>' + renderList(note.exploracion) +
    '<h3>Estudios</h3>' + renderList(note.estudios) +
    '<h3>Analisis</h3>' + renderList(note.analisis) +
    '<h3>Plan</h3>' + renderList(note.plan) +
    '<h3>Signos vitales</h3><p>TA ' + escHtml(note.ta || '-') + ' | FR ' + escHtml(note.fr || '-') + ' | FC ' + escHtml(note.fc || '-') + ' | TEMP ' + escHtml(note.temp || '-') + ' | PESO ' + escHtml(note.peso || '-') + '</p>' +
    '<h3>Tratamiento e indicaciones medicas</h3>' + renderList(note.tratamiento || []) +
    '</section>';
  var indicaHtml = '<section><h2>Indicaciones</h2>' +
    '<p><strong>Fecha/Hora:</strong> ' + escHtml(ind.fecha || '') + ' ' + escHtml(ind.hora || '') + '</p>' +
    '<h3>Medicos</h3>' + renderList(ind.medicos) +
    '<h3>Dieta</h3>' + renderList(ind.dieta) +
    '<h3>Cuidados</h3>' + renderList(ind.cuidados) +
    '<h3>Estudios</h3>' + renderList(ind.estudios) +
    '<h3>Medicamentos</h3>' + renderList(ind.medicamentos) +
    '<h3>Interconsultas</h3>' + renderList(ind.interconsultas) +
    '<h3>Otros</h3>' + renderOtherSections() +
    '</section>';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;">' +
    '<title>R+ salida clinica</title>' +
    '<style>body{font-family:Arial,sans-serif;line-height:1.45;margin:24px;color:#111}h1,h2{margin-bottom:8px}section{margin:20px 0;padding-top:8px;border-top:1px solid #ddd}h3{margin:14px 0 6px}ul{margin:0 0 8px 20px}p{margin:0 0 8px}</style>' +
    '</head><body>' +
    '<h1>R+ - Salida clinica</h1>' +
    '<p><strong>Paciente:</strong> ' + escHtml(patient.nombre || '') + ' | <strong>Registro:</strong> ' + escHtml(patient.registro || '') + '</p>' +
    '<p><strong>Servicio:</strong> ' + escHtml(patient.servicio || '') + ' | <strong>Cuarto/Cama:</strong> ' + escHtml(patient.cuarto || '') + '/' + escHtml(patient.cama || '') + '</p>' +
    (mode !== 'indica' ? noteHtml : '') +
    (mode !== 'note' ? indicaHtml : '') +
    '</body></html>';
}

function exportCurrentPatientAsText() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = activeInner === 'indica' ? 'indica' : 'note';
  var fileName = 'R-plus-' + slugFilePart(bundle.patient.nombre, 'paciente') + '-clinico-' + formatDateSlug(new Date()) + '.txt';
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalTextExport(bundle), fileName, 'text/plain');
    showToast('Salida .txt descargada', 'success');
  } catch (e) {
    showToast('No se pudo exportar: ' + (e && e.message ? e.message : 'error'), 'error');
  } finally {
    decrementPendingJobs();
  }
}

function exportCurrentPatientAsHtml() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = activeInner === 'indica' ? 'indica' : 'note';
  var fileName = 'R-plus-' + slugFilePart(bundle.patient.nombre, 'paciente') + '-clinico-' + formatDateSlug(new Date()) + '.html';
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalHtmlExport(bundle), fileName, 'text/html');
    showToast('Salida .html descargada', 'success');
  } catch (e) {
    showToast('No se pudo exportar: ' + (e && e.message ? e.message : 'error'), 'error');
  } finally {
    decrementPendingJobs();
  }
}

function quickExportCurrentPatient() {
  if (guardMobileDocExport()) return;
  if (!activeId) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var format = normalizeQuickOutputFormat(settings.quickOutputFormat);
  var action = resolveQuickOutputAction({
    format: format,
    appMode: isModeSala(settings) ? 'sala' : 'interconsulta',
    activeInner: activeInner,
    listado: listadoProblemas[activeId] || null,
  });
  switch (action.kind) {
    case 'html':           exportCurrentPatientAsHtml(); return;
    case 'txt':            exportCurrentPatientAsText(); return;
    case 'listado':        generateListado(); return;
    case 'listado_empty':  showToast(action.message, 'error'); return;
    case 'indicaciones':   generateIndicaciones(); return;
    case 'nota':
    default:               generateWord(); return;
  }
}


function ensureParsedLabHistory(patientId) {
  var history = labHistory[patientId] || [];
  var changed = false;
  var rebuildNota = false;
  var noteLines = (notes[patientId] && notes[patientId].estudios ? notes[patientId].estudios.split('\n') : []);

  history.forEach(function(set) {
    if (!set) return;
    if (!set.resLabs || !set.resLabs.length) {
      if (set.id === 'migrated-anterior') {
        set.resLabs = extractLabDataLines(noteLines.slice(0, 3));
        changed = true;
      } else if (set.id === 'migrated-recent') {
        set.resLabs = extractLabDataLines(noteLines.slice(3));
        changed = true;
      }
    }
    if (!set.bhExtras && set.sourceText) {
      try {
        var reParse = procesarLabs(set.sourceText);
        set.bhExtras = reParse && reParse.bhExtras ? reParse.bhExtras : {};
      } catch (_e) {
        set.bhExtras = {};
      }
      changed = true;
    }
    var needsParse = !set.parsed || !Object.keys(set.parsed).length;
    if (needsParse) {
      if (!set.resLabs || !set.resLabs.length) {
        set.parsed = {};
        changed = true;
      } else {
        set.parsed = extractParsedValues(set.resLabs);
        changed = true;
      }
    }
    if (set.resLabs && set.resLabs.length) {
      var pbNext = buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);
      var pbStr = JSON.stringify(pbNext);
      if (JSON.stringify(set.parsedBySection || null) !== pbStr) {
        set.parsedBySection = pbNext;
        changed = true;
      }
    } else if (set.parsedBySection && Object.keys(set.parsedBySection).length) {
      set.parsedBySection = {};
      changed = true;
    }
    var nf = normalizeFechaLabHistory(set.fecha);
    if (nf && nf !== set.fecha && set.fecha !== 'Anterior') {
      set.fecha = nf;
      changed = true;
    }
    var nh = normalizeHoraLabHistory(set.hora);
    if (nh !== (set.hora || '')) {
      set.hora = nh;
      changed = true;
    }
    if (set.sourceText) {
      if (!set.refsBySection || !Object.keys(set.refsBySection).length) {
        var refsNext = buildRefsBySectionFromReport(set.sourceText);
        if (refsNext && Object.keys(refsNext).length) {
          set.refsBySection = refsNext;
          changed = true;
        }
      }
      var horaFromSrc = extractLabReportHora(set.sourceText);
      if (horaFromSrc && horaFromSrc !== normalizeHoraLabHistory(set.hora)) {
        set.hora = horaFromSrc;
        changed = true;
        rebuildNota = true;
      }
    }
    if ((!set.fecha || !String(set.fecha).trim()) && set.fecha !== 'Anterior') {
      var inferred = inferFechaLabSetFromId(set);
      if (inferred) {
        set.fecha = inferred;
        changed = true;
      }
    }
  });
  if (rebuildNota && patientId && notes[patientId]) {
    rebuildEstudiosFromLabHistory(patientId);
    changed = true;
  }
  if (changed) saveState();
  return history;
}

function rpcPrefersReducedMotion() {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch (_e) {
    return false;
  }
}

function tendFinishRangeVbars(container) {
  if (!container) return;
  var reduced = rpcPrefersReducedMotion();
  var apply = function () {
    var vbars = container.querySelectorAll('.tend-range-vbar');
    for (var i = 0; i < vbars.length; i++) {
      var vb = vbars[i];
      vb.classList.add('tend-vbar-ready');
      var m = vb.querySelector('.tend-range-vbar-marker');
      if (m) {
        var t = m.getAttribute('data-target-bottom');
        if (t !== null && t !== '') {
          m.style.bottom = 'max(2px, calc(' + t + '% - 5px))';
        }
      }
    }
  };
  if (reduced) apply();
  else {
    requestAnimationFrame(function () {
      requestAnimationFrame(apply);
    });
  }
}

/**
 * HTML de la barra de rango (modal de tendencia).
 * Con yBounds (eje Y del gráfico): misma escala que el chart; solo si el rango
 * orientativo intersecta lo visible; si no hay intersección, no se dibuja.
 */
function tendRefVbarMarkup(ref, latest, delayMs, extraClass, yBounds) {
  extraClass = extraClass || '';
  if (!ref || !isFinite(ref[0]) || !isFinite(ref[1]) || ref[1] <= ref[0] || !isFinite(latest)) {
    return '';
  }
  var low = Number(ref[0]);
  var high = Number(ref[1]);
  var latestN = Number(latest);
  var isAb = latestN < low || latestN > high;
  var normBottom;
  var normTop;
  var pos;

  if (yBounds && isFinite(yBounds.min) && isFinite(yBounds.max) && yBounds.max > yBounds.min) {
    var yMin = yBounds.min;
    var yMax = yBounds.max;
    var ySpan = yMax - yMin;
    var visLow = Math.max(low, yMin);
    var visHigh = Math.min(high, yMax);
    if (visHigh <= visLow) return '';
    normBottom = ((visLow - yMin) / ySpan) * 100;
    normTop = ((visHigh - yMin) / ySpan) * 100;
    pos = ((latestN - yMin) / ySpan) * 100;
  } else {
    var span = high - low;
    var fullMin = low - span * 0.5;
    var fullMax = high + span * 0.5;
    if (fullMax <= fullMin) {
      fullMin = low;
      fullMax = high;
    }
    var range = fullMax - fullMin;
    pos = ((latestN - fullMin) / range) * 100;
    normBottom = ((low - fullMin) / range) * 100;
    normTop = ((high - fullMin) / range) * 100;
  }

  if (pos < 0) pos = 0;
  if (pos > 100) pos = 100;
  if (normBottom < 0) normBottom = 0;
  if (normTop > 100) normTop = 100;
  var normH = normTop - normBottom;
  if (normH <= 0) return '';
  var stateClass = isAb ? ' is-abnormal' : ' is-normal';
  var d = delayMs != null ? delayMs : 0;
  return (
    '<div class="tend-range-vbar' +
    extraClass +
    stateClass +
    '" style="--tend-vbar-delay:' +
    d +
    'ms" title="Rango de referencia (' +
    low +
    '–' +
    high +
    ') · último ' +
    latest +
    '">' +
    '<div class="tend-range-vbar-track"></div>' +
    '<div class="tend-range-vbar-norm" style="bottom:' +
    normBottom.toFixed(2) +
    '%;height:' +
    normH.toFixed(2) +
    '%"></div>' +
    '<div class="tend-range-vbar-marker" data-target-bottom="' +
    pos.toFixed(2) +
    '"></div>' +
    '</div>'
  );
}

function tendDetailChartYBounds(chart) {
  if (!chart || !chart.scales || !chart.scales.y) return null;
  var y = chart.scales.y;
  if (!isFinite(y.min) || !isFinite(y.max) || y.max <= y.min) return null;
  return { min: y.min, max: y.max };
}

function syncTendDetailVbar(ref, latest) {
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (!vbarSlot) return;
  var yBounds = tendDetailChartYBounds(detailChart);
  vbarSlot.innerHTML = tendRefVbarMarkup(ref, latest, 0, ' tend-detail-vbar', yBounds);
  vbarSlot.setAttribute('aria-hidden', vbarSlot.innerHTML ? 'false' : 'true');
  tendFinishRangeVbars(vbarSlot);
}

function closeTendGroupModal() {
  var advanceTourAfterChart =
    guidedTourActive && tourStepId === 'sala_tend_chart';
  tendGroupModal.close();
  if (advanceTourAfterChart) guidedTourAdvanceAfter('sala_tend_chart');
}

var tendGroupModal = createTendGroupModal({
  onRequestClose: closeTendGroupModal,
  getActiveId: function () {
    return activeId;
  },
  getHistory: function () {
    return ensureParsedLabHistory(activeId);
  },
  getSectionLabel: getTendSectionLabel,
  getCatalogSpecs: getTendCatalogSpecsForSection,
  buildMergedTrendSeriesCatalog: buildMergedTrendSeriesCatalog,
  tendUnitForSeries: tendUnitForSeries,
  tendRefFromLabSet: tendRefFromLabSet,
  tendRefForSeries: tendRefForSeries,
  buildColHeader: buildLabSetDateLine,
  esc: esc,
  Chart: Chart,
  showToast: showToast
});

function openTendGroupModal(sectionKey) {
  tendGroupModal.open(sectionKey);
}

function setTendGroupTab(name) {
  tendGroupModal.setTab(name);
}

function copyTendGroupTablePng() {
  tendGroupModal.copyTablePng();
}

function copyTendGroupTableText() {
  tendGroupModal.copyTableText();
}

function tendSectionChartSvg() {
  return (
    '<svg class="tend-section-chart-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 17l6-6 4 4 8-10"/>' +
    '<path d="M3 12l5-4 4 3 9-7"/>' +
    '</svg>'
  );
}

function destroyTendCardSortables() {
  _tendCardSortables.forEach(function (s) {
    try {
      if (s && typeof s.destroy === 'function') s.destroy();
    } catch (_e) {}
  });
  _tendCardSortables = [];
}

function syncTendCardOrderFromDom(sectionKey) {
  if (!activeId || !sectionKey) return;
  var zone = null;
  document.querySelectorAll('.tend-sort-zone[data-section-key]').forEach(function (el) {
    if (el.getAttribute('data-section-key') === sectionKey) zone = el;
  });
  if (!zone) return;
  var order = [];
  zone.querySelectorAll('.tend-card[data-series-key]').forEach(function (el) {
    var k = el.getAttribute('data-series-key');
    if (k) order.push(k);
  });
  if (order.length) writeTendCardOrder(activeId, sectionKey, order);
}

var _tendPointerDidDrag = false;
var TEND_CARD_DRAG_THRESHOLD_PX = 5;

function tendCardActivate(ev, sectionKey, fieldKey) {
  if (_tendPointerDidDrag) {
    _tendPointerDidDrag = false;
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    return;
  }
  openTendDetail(sectionKey, fieldKey);
}

/** Arrastre por puntero (clon fixed): evita conflictos Sortable + grid/transform en Electron. */
function mountTendCardPointerSort(zone, sectionKey) {
  var scrollRoot = document.getElementById('tendencias-container');
  var state = null;

  function zoneCards() {
    return Array.prototype.slice.call(zone.children).filter(function (el) {
      return (
        el.classList &&
        el.classList.contains('tend-card') &&
        el.hasAttribute('data-series-key')
      );
    });
  }

  function beginDragVisuals() {
    if (!state || state.ghost) return;
    var card = state.card;
    var rect = card.getBoundingClientRect();
    var ghost = card.cloneNode(true);
    ghost.classList.add('tend-drag-hovercard');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.position = 'fixed';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.margin = '0';
    ghost.style.boxSizing = 'border-box';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '10060';
    ghost.style.transition = 'none';
    ghost.style.opacity = '1';
    document.body.appendChild(ghost);
    card.classList.add('tend-card--sort-source');
    state.ghost = ghost;
    state.offsetX = state.startX - rect.left;
    state.offsetY = state.startY - rect.top;
  }

  function clearState() {
    if (!state) return;
    if (state.ghost && state.ghost.parentNode) state.ghost.parentNode.removeChild(state.ghost);
    state.card.classList.remove('tend-card--sort-source');
    state.card.style.width = '';
    state.card.style.maxWidth = '';
    state = null;
  }

  /** Devuelve el nodo antes del cual insertar (null = al final). Soporta huecos horizontales en la rejilla. */
  function findInsertBefore(clientX, clientY) {
    var cards = zoneCards().filter(function (c) {
      return c !== state.card;
    });
    if (!cards.length) return null;

    var i;
    for (i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        if (clientX < r.left + r.width * 0.5) return cards[i];
        return cards[i + 1] || null;
      }
    }

    for (i = 0; i < cards.length - 1; i++) {
      var ra = cards[i].getBoundingClientRect();
      var rb = cards[i + 1].getBoundingClientRect();
      var sameRow = Math.abs(ra.top - rb.top) < Math.min(ra.height, rb.height) * 0.45;
      if (!sameRow) continue;
      if (
        clientX > ra.right &&
        clientX < rb.left &&
        clientY >= Math.min(ra.top, rb.top) - 10 &&
        clientY <= Math.max(ra.bottom, rb.bottom) + 10
      ) {
        return cards[i + 1];
      }
    }

    for (i = 0; i < cards.length; i++) {
      var rj = cards[i].getBoundingClientRect();
      if (clientY < rj.top + rj.height * 0.5) return cards[i];
    }
    return null;
  }

  function onPointerMove(e) {
    if (!state || e.pointerId !== state.pointerId) return;
    var dx = e.clientX - state.startX;
    var dy = e.clientY - state.startY;
    if (!state.moved) {
      if (dx * dx + dy * dy < TEND_CARD_DRAG_THRESHOLD_PX * TEND_CARD_DRAG_THRESHOLD_PX) return;
      state.moved = true;
      beginDragVisuals();
    }
    if (!state.ghost) return;
    state.ghost.style.left = e.clientX - state.offsetX + 'px';
    state.ghost.style.top = e.clientY - state.offsetY + 'px';
    var before = findInsertBefore(e.clientX, e.clientY);
    if (before) zone.insertBefore(state.card, before);
    else zone.appendChild(state.card);
    if (scrollRoot) {
      var sr = scrollRoot.getBoundingClientRect();
      if (e.clientY < sr.top + 54) scrollRoot.scrollTop -= 9;
      else if (e.clientY > sr.bottom - 54) scrollRoot.scrollTop += 9;
    }
  }

  function onPointerUp(e) {
    if (!state || e.pointerId !== state.pointerId) return;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    if (state.moved) {
      syncTendCardOrderFromDom(sectionKey);
      _tendPointerDidDrag = true;
    }
    clearState();
  }

  function onPointerDown(e) {
    if (state) return;
    if (e.button !== 0) return;
    if (e.target.closest('button, a[href], input, textarea, select')) return;
    var card = e.target.closest('.tend-card');
    if (!card || !zone.contains(card)) return;
    state = {
      card: card,
      ghost: null,
      pointerId: e.pointerId,
      offsetX: 0,
      offsetY: 0,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }

  zone.addEventListener('pointerdown', onPointerDown);
  return {
    destroy: function () {
      zone.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      clearState();
    }
  };
}

function mountTendCardSortables() {
  destroyTendCardSortables();
  if (!activeId) return;
  document.querySelectorAll('.tend-sort-zone[data-section-key]').forEach(function (zone) {
    var sectionKey = zone.getAttribute('data-section-key');
    if (!sectionKey || !zone.querySelector('.tend-card')) return;
    _tendCardSortables.push(mountTendCardPointerSort(zone, sectionKey));
  });
}

function renderTendencias() {
  var container = document.getElementById('tendencias-container');
  if (!container) return;
  destroyTendCardSortables();
  Object.keys(sparkCharts).forEach(function (k) {
    if (sparkCharts[k]) {
      sparkCharts[k].destroy();
      delete sparkCharts[k];
    }
  });
  if (!activeId) {
    closeTendHiddenModal();
    container.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  var history = sortLabHistoryChronological(ensureParsedLabHistory(activeId));
  if (history.length < 2) {
    closeTendHiddenModal();
    container.innerHTML = '<p class="tend-empty">Agrega al menos 2 sets de laboratorio para ver tendencias.</p>';
    return;
  }

  var mergedCatalog = buildMergedTrendSeriesCatalog(history);
  var seriesAvail = [];
  for (var ci = 0; ci < mergedCatalog.length; ci++) {
    var sp = mergedCatalog[ci];
    var sk = sp.sectionKey;
    var fk = sp.fieldKey;
    if (tendSeriesIsUserHidden(sk, fk)) continue;
    var raw = history.filter(function (s) {
      return getSetTrendValueForSeries(s, sk, fk) != null;
    });
    if (dedupeTrendSetsForSeries(raw, sk, fk).length < 2) continue;
    seriesAvail.push(sp);
  }
  var seriesAvailFull = seriesAvail.slice();
  var abnormalOnly = tendAbnormalOnlyRead();
  if (abnormalOnly) {
    seriesAvail = seriesAvail.filter(function (sp) {
      return tendSeriesLatestAbnormal(history, sp.sectionKey, sp.fieldKey);
    });
  }

  var hiddenChipN = tendHiddenChipDescriptors().length;
  var toolbarHtml = buildTendInlineControlsHtml(hiddenChipN);

  if (!seriesAvail.length) {
    var anyData = mergedCatalog.some(function (sp) {
      var r = history.filter(function (s) {
        return getSetTrendValueForSeries(s, sp.sectionKey, sp.fieldKey) != null;
      });
      return dedupeTrendSetsForSeries(r, sp.sectionKey, sp.fieldKey).length >= 2;
    });
    var hiddenAll =
      anyData &&
      !mergedCatalog.some(function (sp) {
        if (tendSeriesIsUserHidden(sp.sectionKey, sp.fieldKey)) return false;
        var r2 = history.filter(function (s) {
          return getSetTrendValueForSeries(s, sp.sectionKey, sp.fieldKey) != null;
        });
        return dedupeTrendSetsForSeries(r2, sp.sectionKey, sp.fieldKey).length >= 2;
      });
    if (abnormalOnly && seriesAvailFull.length) {
      container.innerHTML =
        toolbarHtml +
        '<p class="tend-empty">Ningún analito está fuera de rango de referencia (o no tiene referencia en el reporte). Pulsa <strong>Ver todas</strong> (tooltip en el botón) para volver a la vista completa.</p>';
      syncTendHiddenModalIfOpen();
      return;
    }
    if (hiddenAll) {
      container.innerHTML =
        toolbarHtml +
        '<p class="tend-empty">Los analitos con datos están <strong>ocultos</strong>. Pulsa <strong>Ocultos</strong> y restaura con el ojo o <strong>Mostrar todos</strong>.</p>';
    } else {
      container.innerHTML =
        toolbarHtml +
        '<p class="tend-empty">No hay parámetros con suficientes datos para graficar.</p>';
    }
    syncTendHiddenModalIfOpen();
    return;
  }

  var bySection = Object.create(null);
  seriesAvail.forEach(function (spec) {
    var k = spec.sectionKey;
    if (!bySection[k]) bySection[k] = [];
    bySection[k].push(spec);
  });
  var sectionsOrdered = [];
  for (var oi = 0; oi < TEND_SECTION_ORDER.length; oi++) {
    var sec = TEND_SECTION_ORDER[oi];
    if (bySection[sec] && bySection[sec].length) sectionsOrdered.push(sec);
  }
  Object.keys(bySection).forEach(function (sec) {
    if (sectionsOrdered.indexOf(sec) === -1) sectionsOrdered.push(sec);
  });

  var chartAnim = rpcPrefersReducedMotion()
    ? false
    : { duration: 600, easing: 'easeOutQuart' };
  var htmlParts = [];
  htmlParts.push(buildTendInlineControlsHtml(hiddenChipN));
  for (var si = 0; si < sectionsOrdered.length; si++) {
    var sectionKey = sectionsOrdered[si];
    var expanded = tendSectionIsExpanded(sectionKey);
    var secLabel = TEND_SECTION_LABELS[sectionKey] || sectionKey;
    var list = orderTrendSeriesBySaved(
      bySection[sectionKey],
      readTendCardOrder(activeId, sectionKey)
    );
    var cardParts = [];
    for (var li = 0; li < list.length; li++) {
      var spec = list[li];
      var fk = spec.fieldKey;
      var setsDesc = dedupeTrendSetsForSeries(
        history.filter(function (s) {
          return getSetTrendValueForSeries(s, sectionKey, fk) != null;
        }),
        sectionKey,
        fk
      );
      var latestSet = setsDesc.length ? setsDesc[0] : null;
      var latest = latestSet ? getSetTrendValueForSeries(latestSet, sectionKey, fk) : null;
      var ref = tendRefForSeries(history, sectionKey, fk, latestSet);
      var isAb = ref && latest != null && (latest < ref[0] || latest > ref[1]);
      var domId = trendSparkDomId(sectionKey, fk);
      var labelParts = tendCardLabelParts(sectionKey, fk);
      var titleEsc = esc(labelParts.title);
      var unitHtml = labelParts.unit
        ? '<div class="tend-unit">' + esc(labelParts.unit) + '</div>'
        : '';
      var seriesKey = tendCatalogSeriesKey(sectionKey, fk);
      cardParts.push(
        '<div class="tend-card" role="button" tabindex="0" data-series-key="' +
          esc(seriesKey) +
          '" onclick="tendCardActivate(event,\'' +
          safeAttrJsString(sectionKey) +
          "','" +
          safeAttrJsString(fk) +
          '\')">' +
          '<div class="tend-card-header">' +
          '<span class="tend-param-name">' +
          titleEsc +
          '</span>' +
          '<span class="tend-param-value' +
          (isAb ? ' tend-abnormal' : '') +
          '">' +
          (latest != null ? latest : '—') +
          '</span>' +
          '</div>' +
          unitHtml +
          '<div class="tend-spark-wrap">' +
          '<div class="tend-spark-canvas-cell">' +
          (expanded
            ? '<canvas id="' + domId + '"></canvas>'
            : '<div class="tend-spark-placeholder" aria-hidden="true"></div>') +
          '</div>' +
          '</div>' +
          '</div>'
      );
    }
    htmlParts.push(
      '<section class="tend-section" data-section="' +
        esc(sectionKey) +
        '">' +
        '<div class="tend-section-head">' +
        '<button type="button" class="tend-section-toggle" aria-expanded="' +
        (expanded ? 'true' : 'false') +
        '" onclick="toggleTendSection(event,\'' +
        safeAttrJsString(sectionKey) +
        '\')">' +
        '<span class="tend-section-chevron" aria-hidden="true">' +
        (expanded ? '▼' : '▶') +
        '</span>' +
        '<span class="tend-section-title">' +
        esc(secLabel) +
        '</span></button>' +
        '<span class="tend-section-toggle-end">' +
        '<span class="tend-section-count">' +
        list.length +
        '</span>' +
        (list.length > 0
          ? '<button type="button" class="tend-section-chart-btn" title="Abrir gráfica y tabla del estudio" aria-label="Gráfica del estudio" onclick="openTendGroupModal(\'' +
            safeAttrJsString(sectionKey) +
            '\')">' +
            tendSectionChartSvg() +
            '<span class="tend-section-chart-label">Gráfica</span></button>'
          : '') +
        '</span></div>' +
        '<div class="tend-section-body' +
        (expanded ? '' : ' tend-section-body--collapsed') +
        '">' +
        '<div class="tend-grid tend-sort-zone" data-section-key="' +
        esc(sectionKey) +
        '">' +
        cardParts.join('') +
        '</div></div></section>'
    );
  }
  container.innerHTML = htmlParts.join('');

  for (var cj = 0; cj < seriesAvail.length; cj++) {
    var spec2 = seriesAvail[cj];
    var sk2 = spec2.sectionKey;
    var fk2 = spec2.fieldKey;
    if (!tendSectionIsExpanded(sk2)) continue;
    var setsDesc2 = dedupeTrendSetsForSeries(
      history.filter(function (s) {
        return getSetTrendValueForSeries(s, sk2, fk2) != null;
      }),
      sk2,
      fk2
    );
    var setsAsc2 = toTrendAscendingSets(setsDesc2);
    var labels2 = buildTendChartLabels(setsAsc2);
    var values2 = setsAsc2.map(function (s) {
      return getSetTrendValueForSeries(s, sk2, fk2);
    });
    var canvas2 = document.getElementById(trendSparkDomId(sk2, fk2));
    if (!canvas2) continue;
    var ck = trendSparkChartKey(sk2, fk2);
    var latestSetSpark = setsDesc2.length ? setsDesc2[0] : null;
    var latestSpark = latestSetSpark
      ? getSetTrendValueForSeries(latestSetSpark, sk2, fk2)
      : null;
    var refSpark = tendRefForSeries(history, sk2, fk2, latestSetSpark);
    var isAbSpark =
      refSpark &&
      latestSpark != null &&
      (latestSpark < refSpark[0] || latestSpark > refSpark[1]);
    var lineColor = isAbSpark ? '#f87171' : 'rgba(52,211,153,0.95)';
    var lineW = 2.25;
    var pointR = 2;
    sparkCharts[ck] = new Chart(canvas2, {
      type: 'line',
      data: {
        labels: labels2,
        datasets: [
          {
            data: values2,
            borderColor: lineColor,
            borderWidth: lineW,
            pointRadius: pointR,
            pointBackgroundColor: lineColor,
            tension: 0.3,
            fill: false,
            clip: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: chartAnim,
        layout: { padding: { left: 6, right: 6, top: 8, bottom: 6 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false, grid: { display: false }, offset: true },
          y: { display: false, grid: { display: false }, grace: '12%' }
        }
      }
    });
  }
  mountTendCardSortables();
  syncTendHiddenModalIfOpen();
}

function syncTendHiddenModalIfOpen() {
  var bd = document.getElementById('tend-hidden-modal-backdrop');
  if (bd && bd.classList.contains('open')) {
    refreshTendHiddenModalContent();
  }
}

function openTendDetail(sectionKey, fieldKey) {
  if (!activeId || sectionKey == null || fieldKey == null) return;
  var history = sortLabHistoryChronological(ensureParsedLabHistory(activeId));
  var setsDesc = dedupeTrendSetsForSeries(
    history.filter(function (s) {
      return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
    }),
    sectionKey,
    fieldKey
  );
  if (setsDesc.length < 2) return;
  var setsAsc = toTrendAscendingSets(setsDesc);
  var labels = buildTendChartLabels(setsAsc);
  var values = setsAsc.map(function (s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey);
  });
  var labelParts = tendCardLabelParts(sectionKey, fieldKey);
  var spec = tendFindSeriesSpec(sectionKey, fieldKey);
  var title = labelParts.title;
  var unit = labelParts.unit;
  var latestSet = setsDesc.length ? setsDesc[0] : null;
  var latest = latestSet ? getSetTrendValueForSeries(latestSet, sectionKey, fieldKey) : null;
  var ref = tendRefForSeries(history, sectionKey, fieldKey, latestSet);
  document.getElementById('tend-detail-title').textContent =
    title + (labelParts.unit ? ' (' + labelParts.unit + ')' : '');
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (vbarSlot) {
    vbarSlot.innerHTML = '';
    vbarSlot.setAttribute('aria-hidden', 'true');
  }
  var backdrop = document.getElementById('tend-detail-backdrop');
  backdrop.style.display = 'flex';
  var canvas = document.getElementById('tend-detail-canvas');
  if (detailChart) {
    detailChart.destroy();
    detailChart = null;
  }
  var datasets = [
    {
      label: title,
      data: values,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.08)',
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#10b981',
      tension: 0.3,
      fill: false
    }
  ];
  detailChart = new Chart(canvas, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 12, left: 4, top: 8, bottom: 4 } },
      interaction: { mode: 'index', intersect: false, axis: 'x' },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          position: 'nearest',
          callbacks: {
            label: function (ctx) {
              return ctx.datasetIndex === 0 ? title + ': ' + ctx.parsed.y + ' ' + unit : null;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 12 } }, offset: true },
        y: {
          ticks: { font: { size: 12 } },
          title: { display: !!unit, text: unit, font: { size: 11 } }
        }
      }
    }
  });
  syncTendDetailVbar(ref, latest);
}

function closeTendDetail() {
  document.getElementById('tend-detail-backdrop').style.display = 'none';
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (vbarSlot) {
    vbarSlot.innerHTML = '';
    vbarSlot.setAttribute('aria-hidden', 'true');
  }
  if (detailChart) { detailChart.destroy(); detailChart = null; }
}



_rpcDeferInit(initProductivityKeyboardShortcuts);
_rpcDeferInit(initModalDismiss);
_rpcDeferInit(initSidebarAutoHide);
_rpcDeferInit(initPatientModalEnterSave);
syncProfileSectionVisibility();

Object.assign(window, chromeWindowHandlers, lanWindowHandlers, patientsWindowHandlers, labPanelWindowHandlers, soapEstadoWindowHandlers, agendaWindowHandlers, expedienteWindowHandlers, notesIndicacionesWindowHandlers, productivityWindowHandlers, settingsHelpWindowHandlers, platformWindowHandlers, {
  switchAppTab,
  openPaseSectionInNormal,
  renderPaseBoard,
  switchInnerTab,
  toggleProfileSection,
  openProfileFromHeader,
  openProfileModal,
  closeProfileModal,
  onAppModeChange,
  toggleHeaderWorkMode,
  onDefaultServicioBlur,
  onMedicoTemplateBlur,
  chooseOutputDir,
  saveQuickOutputFormat,
  openTemplatesModal,
  saveSettings,
  openLabDisplayPrefsModal,
  closeLabDisplayPrefsModal,
  onLabDisplayPrefsChanged,
  procesarRecetaMed,
  limpiarRecetaInput,
  copiarMedicamentosAlPortapapeles,
  setMedOutputTab,
  toggleMedRecetaSuspendido,
  toggleMedRecetaParaNota,
  limpiarSeleccionMedNota,
  mediAnadirATratamiento,
  mediLlevarASOAP,
  closeTemplatesModal,
  saveTemplates,
  closeTendDetail,
  openTendGroupModal,
  closeTendGroupModal,
  setTendGroupTab,
  copyTendGroupTablePng,
  copyTendGroupTableText,
  toggleTendSection,
  toggleTendAbnormalOnlyFilter,
  tendHideSeriesFromCard,
  tendUnhideSeries,
  tendResetAllHiddenSeries,
  openTendHiddenModal,
  closeTendHiddenModal,
  updatePatient,
  renderTodoForm,
  addTodo,
  toggleTodo,
  deleteTodo,
  setTodoPriority,
  quickExportCurrentPatient,
  openTendDetail,
  tendCardActivate,
});
