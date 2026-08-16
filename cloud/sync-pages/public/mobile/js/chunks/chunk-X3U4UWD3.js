import {
  hideMainClinicalOnboarding
} from "/mobile/js/chunks/chunk-WG3CB4AY.js";
import {
  hideTourIntroModal,
  markGuidedTourVersionDone,
  openTutorialIntroFromSettings,
  syncLearnHubContinueVisibility
} from "/mobile/js/chunks/chunk-7ZSK7DM3.js";
import {
  clearTourProgress,
  loadTourProgress,
  saveTourProgress
} from "/mobile/js/chunks/chunk-RHYAMGLZ.js";
import {
  loadChartJs
} from "/mobile/js/chunks/chunk-MST23B4T.js";
import {
  settingsHelpBridge
} from "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import {
  getChapterForStep,
  getChapterProgressLabel,
  getGuardiaV7TourSteps,
  getInterconsultaTourSteps,
  getQuickRouteTourSteps,
  getSalaTourSteps,
  getTourStepsForChapter
} from "/mobile/js/chunks/chunk-LRXTQEKU.js";
import {
  closeEstadoActualRegistroModal,
  openEstadoActualRegistroModal
} from "/mobile/js/chunks/chunk-CLUUFMVT.js";
import {
  DEMO_GARCIA_LAB_REPORT,
  DEMO_SOME_LAB_REPORT,
  OLDER_DEMO_SOME_LAB_REPORT,
  buildTourDemoListadoProblemas,
  extractParsedValues
} from "/mobile/js/chunks/chunk-E2PTZLNF.js";
import {
  applyAppModeSwitchEffects,
  applyEstadoActualParsedToForm,
  closeModal,
  openAddModalFullManual,
  renderEstadoActualPanel,
  renderIndicaForm,
  renderNoteForm,
  renderPatientList,
  selectPatient
} from "/mobile/js/chunks/chunk-46QO3ZUY.js";
import {
  invalidateEaPanelCache
} from "/mobile/js/chunks/chunk-AS6TAICA.js";
import {
  GUIDED_TOUR_LS_KEY,
  publishTourGuardContext,
  tourState
} from "/mobile/js/chunks/chunk-VOW7QFKJ.js";
import {
  closeSettingsDropdown,
  isSettingsDropdownOpen,
  toggleSettingsDropdown
} from "/mobile/js/chunks/chunk-2VZA33PI.js";
import {
  closeConnectionDropdown,
  openConnectionDropdown
} from "/mobile/js/chunks/chunk-EPFF77ND.js";
import {
  getSettingsHelpRuntime
} from "/mobile/js/chunks/chunk-UTZ3BFGA.js";
import {
  switchLabInner
} from "/mobile/js/chunks/chunk-44QBSWO4.js";
import {
  buildTableTsv,
  closeLabSomeTablesModal,
  copyTableModelAsPng,
  copyTableText,
  limpiarReporte
} from "/mobile/js/chunks/chunk-7EPXWU6A.js";
import {
  LAB_BULK_PATIENT_SEPARATOR,
  buildBulkLabPreview,
  extractLabPatientFromBulkBlock
} from "/mobile/js/chunks/chunk-JIKZNXZR.js";
import {
  DEMO_PATIENT_ID,
  DEMO_PATIENT_ID_2,
  DEMO_REGISTRO,
  DEMO_REGISTRO_2,
  findTourDemoPatientByRegistro,
  isTourDemoPatientId,
  tourDemoLabCompleteForTour,
  tourDemoPatientsBothInCensus
} from "/mobile/js/chunks/chunk-M6MLPK4W.js";
import {
  closeSOAPModal,
  refillGasoExtendedSlot,
  savePatientEventualidad,
  serieNumFromLabSet,
  tendenciasBridge
} from "/mobile/js/chunks/chunk-AVZ5WV63.js";
import {
  buildTextSkeletonPanel
} from "/mobile/js/chunks/chunk-PAAJVTB4.js";
import {
  procesarLabs
} from "/mobile/js/chunks/chunk-CZ2M277B.js";
import {
  refreshRpcDateFields
} from "/mobile/js/chunks/chunk-BUGU4R5K.js";
import {
  getUiDensity,
  isGuardiaMode,
  setUiDensity
} from "/mobile/js/chunks/chunk-4SMSHN53.js";
import {
  isClinicalSyncModeChosen,
  readRpcSettings,
  setClinicalSyncModeLocalOnly
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  EVENTUALIDAD_KINDS,
  EVENTUALIDAD_KIND_LABELS,
  TRANSFUSION_PRODUCTS,
  TRANSFUSION_PRODUCT_LABELS,
  appendEventualidad,
  buildEventualidadComposeText,
  dayKeyFromIso,
  eventualidadDateToIso,
  getIndicaciones,
  getLabHistory,
  getListadoProblemas,
  getMedNotaSelectionByPatient,
  getMedRecetaByPatient,
  getNotes,
  getPatients,
  normalizeEventualidadKind,
  persistClinicalState,
  pickHigherPriorityKind,
  resolveEventualidadKind,
  scheduleAfterPaint,
  scheduleIdle,
  setPatients,
  toEventualidadDateValue
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  BH_PANEL_FAMILIES,
  TREND_DETAIL_DOWNSAMPLE,
  TREND_SPARK_WINDOW,
  bhTrendDisplayTitle,
  buildSectionTableModel,
  buildTendChartLabels,
  buildTrendAxisMeta,
  buildTrendSeriesIndexCached,
  classifyTendPanelFamily,
  colKeyForTrendSet,
  columnSetsForFields,
  dedupeTrendSetsForSeries,
  familyOrderForSection,
  formatBhExtrasDisplayLine,
  formatTendSeriesLabel,
  formatTrendColumnHeader,
  getLabHistoryRevision,
  getSetTrendValueForSeries,
  getTrendRenderWindow,
  isPercentPanelFamily,
  migratePanelFamilyKey,
  parseFechaLabToMs,
  sortLabHistoryChronological,
  sortTrendSpecsBySomeOrder,
  tendEligibleSectionKey,
  trendCatalogSeriesKey
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";
import {
  getGlucometriaRegistroWindow,
  toDatetimeLocalValue
} from "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  cancelOverlayClose,
  closeOverlayAnimated
} from "/mobile/js/chunks/chunk-KZT7D6I2.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/features/tendencias-runtime-state.mjs
var rt = {
  getActiveId() {
    return null;
  },
  ensureParsedLabHistory() {
    return [];
  },
  ensureParsedLabHistoryCached() {
    return [];
  },
  rerenderParsedLabOutputAfterPrefsChange() {
  },
  rpcPrefersReducedMotion() {
    return false;
  },
  showToast() {
  },
  buildLabSetDateLine() {
    return "";
  }
};

// public/js/features/tendencias-state.mjs
function aid() {
  return rt.getActiveId();
}
function trendSparkDomId(sectionKey, fieldKey) {
  return "spark-" + String(sectionKey).replace(/[^a-zA-Z0-9]+/g, "_") + "-" + String(fieldKey).replace(/[^a-zA-Z0-9]+/g, "_");
}
function trendSparkChartKey(sectionKey, fieldKey) {
  return sectionKey + "" + fieldKey;
}
var tendStore = {
  _tendCardSortables: [],
  sparkCharts: {},
  /** Bumped on full remount so stale rAF/idle spark batches bail out. */
  sparkMountGen: 0,
  detailChart: null,
  detailContext: null,
  detailSelectedIndex: null,
  _tendRenderState: {
    key: null,
    seriesKeys: [],
    seriesIndex: null,
    seriesAvail: null
  }
};

// public/js/features/tendencias-constants.mjs
var TEND_UNITS = {
  Hb: "g/dL",
  Hto: "%",
  Leu: "K/\u03BCL",
  Plt: "K/\u03BCL",
  VCM: "fL",
  HCM: "pg",
  RBC: "M/\u03BCL",
  CHCM: "g/dL",
  RDW: "%",
  MPV: "fL",
  Neu: "K/\u03BCL",
  Eos: "K/\u03BCL",
  Lin: "K/\u03BCL",
  Mono: "K/\u03BCL",
  Baso: "K/\u03BCL",
  NeuPct: "%",
  LinPct: "%",
  MonoPct: "%",
  EosPct: "%",
  BasoPct: "%",
  Bandas: "%",
  Mielo: "%",
  Metamielo: "%",
  Promielo: "%",
  Blastos: "%",
  Atipicos: "%",
  Ret: "%",
  TP: "s",
  TTP: "s",
  INR: "",
  Fib: "mg/dL",
  DD: "ng/mL",
  Glu: "mg/dL",
  Cr: "mg/dL",
  eTFG: "",
  BUN: "mg/dL",
  PCR: "mg/dL",
  AU: "mg/dL",
  TGL: "mg/dL",
  COL: "mg/dL",
  HDL: "mg/dL",
  LDL: "mg/dL",
  VLDL: "mg/dL",
  IA: "",
  CTHDL: "",
  VSG: "mm/h",
  CPK: "U/L",
  Na: "mEq/L",
  K: "mEq/L",
  Cl: "mEq/L",
  HCO3: "mEq/L",
  Ca: "mg/dL",
  F: "mg/dL",
  Mg: "mEq/L",
  AST: "U/L",
  ALT: "U/L",
  FA: "U/L",
  GGT: "U/L",
  Prot: "g/dL",
  BT: "mg/dL",
  Alb: "g/dL",
  BD: "mg/dL",
  BI: "mg/dL",
  LDH: "U/L",
  Amil: "U/L",
  Lip: "U/L",
  TnI1: "ng/L",
  TnI2: "ng/L",
  Lactato: "mmol/L",
  Dens: "g/L",
  Vol: "mL",
  GLU: "mg/dL",
  Bica: "mEq/L",
  pH: "",
  pCO2: "mmHg",
  pO2: "mmHg",
  iCa: "mmol/L",
  TSH: "uUI/mL",
  T4L: "ng/dL",
  T3L: "pg/mL",
  HbA1c: "%",
  Cortisol: "ug/dL",
  PTH: "pg/mL",
  VitD: "ng/mL",
  NTproBNP: "pg/mL",
  CKMB: "ng/mL",
  Fe: "ug/dL",
  TIBC: "ug/dL",
  Sat: "%",
  Ferr: "ng/mL",
  FR: "UI/mL",
  C3: "mg/dL",
  C4: "mg/dL",
  NH3: "umol/L",
  Osm: "mOsm/kg",
  CysC: "mg/L",
  AlbCr: "mg/g",
  Vanco: "ug/mL",
  Dig: "ng/mL",
  AFP: "ng/mL",
  CEA: "ng/mL",
  CA125: "U/mL",
  PSA: "ng/mL",
  B12: "pg/mL",
  Fol: "ng/mL",
  Calpro: "ug/g",
  EtOH: "mg/dL"
};
var TEND_REF = {
  Hb: [12, 17.5],
  Hto: [36, 53],
  Leu: [4, 11],
  Plt: [150, 400],
  VCM: [80, 100],
  HCM: [27, 33],
  RBC: [4.2, 5.4],
  CHCM: [31.5, 34.5],
  RDW: [11.5, 14.5],
  MPV: [7.4, 10.4],
  Neu: [1.5, 8],
  Eos: [0, 0.6],
  Lin: [0.6, 3.4],
  Mono: [0, 0.9],
  Baso: [0, 0.2],
  NeuPct: [37, 80],
  LinPct: [10, 50],
  MonoPct: [0, 12],
  EosPct: [0, 7],
  BasoPct: [0, 2.5],
  Bandas: [0, 5],
  Mielo: [0, 1],
  Metamielo: [0, 1],
  Promielo: [0, 1],
  Blastos: [0, 1],
  Atipicos: [0, 5],
  Ret: [0.5, 2.5],
  TP: [11, 14],
  TTP: [25, 35],
  INR: [0.8, 1.2],
  Fib: [150, 400],
  DD: [0, 500],
  Glu: [70, 100],
  Cr: [0.5, 1.3],
  BUN: [7, 20],
  PCR: [0, 0.5],
  AU: [3.5, 7],
  TGL: [0, 150],
  COL: [0, 200],
  HDL: [40, 60],
  LDL: [0, 130],
  VLDL: [2, 40],
  IA: [0, 3.22],
  CTHDL: [0, 3.1],
  CPK: [30, 200],
  Na: [136, 145],
  K: [3.5, 5],
  Cl: [96, 106],
  HCO3: [22, 28],
  Ca: [8.5, 10.5],
  F: [2.5, 4.5],
  Mg: [1.6, 2.6],
  AST: [10, 40],
  ALT: [7, 56],
  FA: [44, 147],
  GGT: [0, 55],
  Prot: [6, 8.3],
  BT: [0.1, 1.2],
  Alb: [3.5, 5.2],
  BD: [0, 0.3],
  BI: [0.1, 1],
  LDH: [120, 250],
  Amil: [30, 110],
  Lip: [8, 57],
  TnI1: [0, 34],
  TnI2: [0, 34],
  TSH: [0.4, 4],
  T4L: [0.8, 1.8],
  HbA1c: [4, 5.6],
  NTproBNP: [0, 125],
  Fe: [50, 170],
  Ferr: [30, 400],
  CysC: [0.5, 1],
  Vanco: [10, 20],
  B12: [200, 900],
  LCR_pH: [7.28, 7.42],
  LCR_Leu: [0, 5],
  LCR_Glu: [40, 80],
  LCR_Cl: [118, 132],
  LCR_Prot: [15, 45],
  Liq_pH: [7.1, 7.6],
  Liq_Glu: [20, 600],
  Liq_Leu: [0, 5e3],
  Liq_LDH: [0, 500],
  Liq_Dens: [1e3, 1050],
  Liq_Prot: [10, 50]
};
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
  BH: "Biometr\xEDa hem\xE1tica",
  QS: "Qu\xEDmica sangu\xEDnea",
  ESC: "Electrolitos s\xE9ricos",
  PFHs: "Funci\xF3n hep\xE1tica",
  GASES: "Gasometr\xEDa",
  LCR: "LCR (citoqu\xEDmico)",
  Liq: "L\xEDquidos corporales",
  Prot12h: "Proteinuria 12 h",
  Prot24h: "Proteinuria 24 h",
  PIE: "Prueba de embarazo",
  EGO: "EGO",
  CUANTORINA: "Cuantificaci\xF3n urinaria",
  PltCit: "Plaquetas (citrato)",
  FROTIS: "Frotis de sangre",
  LIPASA: "Lipasa",
  TROP: "Troponina I (hs)",
  TIR: "Tiroides",
  ENDO: "Endocrino",
  CARD: "Cardiolog\xEDa",
  FE: "Hierro / ferritina",
  INFL: "Inflamaci\xF3n",
  INM: "Inmunolog\xEDa",
  META: "Metabolismo",
  NEF: "Nefrolog\xEDa",
  NIVEL: "Niveles terap\xE9uticos",
  TM: "Marcadores tumorales",
  NUT: "Nutrici\xF3n",
  GI: "GI / heces",
  TOX: "Toxicolog\xEDa",
  HEPB: "Hepatitis B",
  VIRAL: "Serolog\xEDa viral",
  FEB: "Febriles",
  MICRO: "Ant\xEDgenos / micro"
};
var TEND_SECTION_ORDER = [
  "BH",
  "PltCit",
  "QS",
  "ESC",
  "PFHs",
  "LIPASA",
  "TROP",
  "CARD",
  "TIR",
  "ENDO",
  "FE",
  "INFL",
  "INM",
  "META",
  "NEF",
  "NIVEL",
  "TM",
  "NUT",
  "GI",
  "TOX",
  "HEPB",
  "VIRAL",
  "FEB",
  "MICRO",
  "GASES",
  "LCR",
  "Liq",
  "Prot12h",
  "Prot24h",
  "PIE",
  "EGO",
  "CUANTORINA",
  "FROTIS"
];
var TEND_SERIES_CATALOG = [
  { sectionKey: "BH", fieldKey: "RBC", cardTitle: "Eritrocitos", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "Hb", cardTitle: "Hb" },
  { sectionKey: "BH", fieldKey: "Hto", cardTitle: "Hto" },
  { sectionKey: "BH", fieldKey: "VCM", cardTitle: "VCM" },
  { sectionKey: "BH", fieldKey: "HCM", cardTitle: "HCM" },
  { sectionKey: "BH", fieldKey: "CHCM", cardTitle: "CHCM", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "RDW", cardTitle: "RDW", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "Leu", cardTitle: "Leucocitos" },
  { sectionKey: "BH", fieldKey: "Neu", cardTitle: "Neutr\xF3filos" },
  { sectionKey: "BH", fieldKey: "NeuPct", cardTitle: bhTrendDisplayTitle("NeuPct") },
  { sectionKey: "BH", fieldKey: "Lin", cardTitle: "Linfocitos", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "LinPct", cardTitle: bhTrendDisplayTitle("LinPct") },
  { sectionKey: "BH", fieldKey: "Mono", cardTitle: "Monocitos", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "MonoPct", cardTitle: bhTrendDisplayTitle("MonoPct") },
  { sectionKey: "BH", fieldKey: "Eos", cardTitle: "Eosin\xF3filos" },
  { sectionKey: "BH", fieldKey: "EosPct", cardTitle: bhTrendDisplayTitle("EosPct") },
  { sectionKey: "BH", fieldKey: "Baso", cardTitle: "Bas\xF3filos", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "BasoPct", cardTitle: bhTrendDisplayTitle("BasoPct") },
  { sectionKey: "BH", fieldKey: "Plt", cardTitle: "Plaquetas" },
  { sectionKey: "BH", fieldKey: "MPV", cardTitle: "VPM", hiddenByDefault: true },
  { sectionKey: "PltCit", fieldKey: "Plt", cardTitle: "Plaquetas (citrato)" },
  { sectionKey: "BH", fieldKey: "Ret", cardTitle: "Reticulocitos", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "TP", cardTitle: "TP", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "TTP", cardTitle: "TTP", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "INR", cardTitle: "INR", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "Fib", cardTitle: "Fibrin\xF3geno", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "DD", cardTitle: "D\xEDmero D", hiddenByDefault: true },
  { sectionKey: "BH", fieldKey: "Bandas", cardTitle: bhTrendDisplayTitle("Bandas") },
  { sectionKey: "BH", fieldKey: "Mielo", cardTitle: bhTrendDisplayTitle("Mielo") },
  { sectionKey: "BH", fieldKey: "Metamielo", cardTitle: bhTrendDisplayTitle("Metamielo") },
  { sectionKey: "BH", fieldKey: "Promielo", cardTitle: bhTrendDisplayTitle("Promielo") },
  { sectionKey: "BH", fieldKey: "Blastos", cardTitle: bhTrendDisplayTitle("Blastos") },
  { sectionKey: "BH", fieldKey: "Atipicos", cardTitle: bhTrendDisplayTitle("Atipicos") },
  { sectionKey: "QS", fieldKey: "Glu", cardTitle: "Glucosa" },
  { sectionKey: "QS", fieldKey: "BUN", cardTitle: "BUN" },
  { sectionKey: "QS", fieldKey: "Cr", cardTitle: "Creatinina" },
  { sectionKey: "QS", fieldKey: "eTFG", cardTitle: "eTFG" },
  { sectionKey: "QS", fieldKey: "AU", cardTitle: "\xC1cido \xFArico" },
  { sectionKey: "QS", fieldKey: "PCR", cardTitle: "PCR" },
  { sectionKey: "QS", fieldKey: "PCT", cardTitle: "Procalcitonina" },
  { sectionKey: "QS", fieldKey: "COL", cardTitle: "Colesterol" },
  { sectionKey: "QS", fieldKey: "HDL", cardTitle: "HDL" },
  { sectionKey: "QS", fieldKey: "LDL", cardTitle: "LDL" },
  { sectionKey: "QS", fieldKey: "VLDL", cardTitle: "VLDL" },
  { sectionKey: "QS", fieldKey: "TGL", cardTitle: "Triglic\xE9ridos" },
  { sectionKey: "QS", fieldKey: "IA", cardTitle: "\xCDndice aterog\xE9nico" },
  { sectionKey: "QS", fieldKey: "CTHDL", cardTitle: "Cociente CT/HDL" },
  { sectionKey: "QS", fieldKey: "VSG", cardTitle: "VSG" },
  { sectionKey: "QS", fieldKey: "CPK", cardTitle: "CPK" },
  { sectionKey: "ESC", fieldKey: "Na", cardTitle: "Na" },
  { sectionKey: "ESC", fieldKey: "K", cardTitle: "K" },
  { sectionKey: "ESC", fieldKey: "Cl", cardTitle: "Cl" },
  { sectionKey: "ESC", fieldKey: "Ca", cardTitle: "Ca" },
  { sectionKey: "ESC", fieldKey: "F", cardTitle: "F\xF3sforo" },
  { sectionKey: "ESC", fieldKey: "Mg", cardTitle: "Mg" },
  { sectionKey: "PFHs", fieldKey: "Alb", cardTitle: "Alb\xFAmina" },
  { sectionKey: "PFHs", fieldKey: "AST", cardTitle: "AST" },
  { sectionKey: "PFHs", fieldKey: "ALT", cardTitle: "ALT" },
  { sectionKey: "PFHs", fieldKey: "FA", cardTitle: "FA" },
  { sectionKey: "PFHs", fieldKey: "GGT", cardTitle: "GGT" },
  { sectionKey: "PFHs", fieldKey: "Prot", cardTitle: "Prote\xEDnas totales" },
  { sectionKey: "PFHs", fieldKey: "BT", cardTitle: "Bilirrubina total" },
  { sectionKey: "PFHs", fieldKey: "BD", cardTitle: "Bilirrubina directa" },
  { sectionKey: "PFHs", fieldKey: "BI", cardTitle: "Bilirrubina indirecta" },
  { sectionKey: "PFHs", fieldKey: "LDH", cardTitle: "LDH" },
  { sectionKey: "PFHs", fieldKey: "Amil", cardTitle: "Amilasa" },
  { sectionKey: "LIPASA", fieldKey: "Lip", cardTitle: "Lipasa" },
  { sectionKey: "TROP", fieldKey: "TnI1", cardTitle: "Troponina I \u2014 1\xAA" },
  { sectionKey: "TROP", fieldKey: "TnI2", cardTitle: "Troponina I \u2014 2\xAA" },
  { sectionKey: "GASES", fieldKey: "pH", cardTitle: "pH (gas)" },
  { sectionKey: "GASES", fieldKey: "pCO2", cardTitle: "pCO\u2082 (gas)" },
  { sectionKey: "GASES", fieldKey: "pO2", cardTitle: "pO\u2082 (gas)" },
  { sectionKey: "GASES", fieldKey: "Na", cardTitle: "Na (gas)" },
  { sectionKey: "GASES", fieldKey: "K", cardTitle: "K (gas)" },
  { sectionKey: "GASES", fieldKey: "GLU", cardTitle: "Glu (gas)" },
  { sectionKey: "GASES", fieldKey: "Lactato", cardTitle: "Lactato (gas)" },
  { sectionKey: "GASES", fieldKey: "Bica", cardTitle: "HCO\u2083\u207B (gas)" },
  { sectionKey: "GASES", fieldKey: "Hto", cardTitle: "Hto (gas)" },
  { sectionKey: "GASES", fieldKey: "iCa", cardTitle: "Ca\xB2\u207A ionizado (gas)" },
  { sectionKey: "LCR", fieldKey: "pH", cardTitle: "pH (LCR)" },
  { sectionKey: "LCR", fieldKey: "Leu", cardTitle: "Leucocitos (LCR)" },
  { sectionKey: "LCR", fieldKey: "Glu", cardTitle: "Glucosa (LCR)" },
  { sectionKey: "LCR", fieldKey: "Prot", cardTitle: "Prote\xEDnas (LCR)" },
  { sectionKey: "LCR", fieldKey: "Cl", cardTitle: "Cl (LCR)" },
  { sectionKey: "Liq", fieldKey: "Dens", cardTitle: "Densidad (liq.)" },
  { sectionKey: "Liq", fieldKey: "pH", cardTitle: "pH (liq.)" },
  { sectionKey: "Liq", fieldKey: "Glu", cardTitle: "Glucosa (liq.)" },
  { sectionKey: "Liq", fieldKey: "Prot", cardTitle: "Prote\xEDnas (liq.)" },
  { sectionKey: "Liq", fieldKey: "LDH", cardTitle: "LDH (liq.)" },
  { sectionKey: "Liq", fieldKey: "Leu", cardTitle: "Leucocitos (liq.)" },
  { sectionKey: "TIR", fieldKey: "TSH", cardTitle: "TSH" },
  { sectionKey: "TIR", fieldKey: "T4L", cardTitle: "T4 libre" },
  { sectionKey: "TIR", fieldKey: "T3L", cardTitle: "T3 libre" },
  { sectionKey: "ENDO", fieldKey: "HbA1c", cardTitle: "HbA1c" },
  { sectionKey: "ENDO", fieldKey: "Cortisol", cardTitle: "Cortisol" },
  { sectionKey: "ENDO", fieldKey: "PTH", cardTitle: "PTH" },
  { sectionKey: "ENDO", fieldKey: "VitD", cardTitle: "Vitamina D" },
  { sectionKey: "CARD", fieldKey: "NTproBNP", cardTitle: "NT-proBNP" },
  { sectionKey: "CARD", fieldKey: "CKMB", cardTitle: "CK-MB" },
  { sectionKey: "FE", fieldKey: "Fe", cardTitle: "Hierro" },
  { sectionKey: "FE", fieldKey: "Ferr", cardTitle: "Ferritina" },
  { sectionKey: "FE", fieldKey: "Sat", cardTitle: "% saturaci\xF3n" },
  { sectionKey: "INFL", fieldKey: "FR", cardTitle: "Factor reumatoide" },
  { sectionKey: "INM", fieldKey: "C3", cardTitle: "C3" },
  { sectionKey: "INM", fieldKey: "C4", cardTitle: "C4" },
  { sectionKey: "META", fieldKey: "NH3", cardTitle: "Amonio" },
  { sectionKey: "META", fieldKey: "Osm", cardTitle: "Osmolaridad" },
  { sectionKey: "NEF", fieldKey: "CysC", cardTitle: "Cistatina C" },
  { sectionKey: "NEF", fieldKey: "AlbCr", cardTitle: "Alb/Cr" },
  { sectionKey: "NIVEL", fieldKey: "Vanco", cardTitle: "Vancomicina" },
  { sectionKey: "NIVEL", fieldKey: "Dig", cardTitle: "Digoxina" },
  { sectionKey: "TM", fieldKey: "AFP", cardTitle: "AFP" },
  { sectionKey: "TM", fieldKey: "CEA", cardTitle: "CEA" },
  { sectionKey: "TM", fieldKey: "PSA", cardTitle: "PSA" },
  { sectionKey: "NUT", fieldKey: "B12", cardTitle: "Vitamina B12" },
  { sectionKey: "NUT", fieldKey: "Fol", cardTitle: "Folato" },
  { sectionKey: "GI", fieldKey: "Calpro", cardTitle: "Calprotectina" },
  { sectionKey: "TOX", fieldKey: "EtOH", cardTitle: "Etanol" }
];
function getTendSectionLabel(sectionKey) {
  if (sectionKey == null || sectionKey === "") return "";
  return TEND_SECTION_LABELS[sectionKey] || String(sectionKey);
}

// public/js/features/tendencias-catalog.mjs
function toTrendAscendingSets(sets) {
  return (sets || []).slice().reverse();
}
function tendCardLabelParts(sectionKey, fieldKey) {
  var spec = tendFindSeriesSpec(sectionKey, fieldKey);
  var title = spec && spec.cardTitle ? String(spec.cardTitle) : String(fieldKey);
  var unit = tendUnitForSeries(sectionKey, fieldKey);
  if (unit === "%") {
    title = title.replace(/\s*%+\s*$/u, "").trim();
  }
  return { title, unit };
}
var TEND_SECTION_UNIT_MAPS = {
  GASES: {
    GLU: TEND_UNITS.Glu || "",
    Na: TEND_UNITS.Na || "",
    K: TEND_UNITS.K || "",
    Hto: TEND_UNITS.Hto || "",
    Bica: TEND_UNITS.HCO3 || "",
    pCO2: "mmHg",
    pO2: "mmHg",
    Lactato: "mmol/L",
    pH: ""
  },
  LCR: {
    pH: "",
    Leu: "/\u03BCL",
    Glu: TEND_UNITS.Glu || "",
    Prot: "mg/dL",
    Cl: TEND_UNITS.Cl || ""
  },
  Liq: {
    pH: "",
    Dens: "g/L",
    Glu: TEND_UNITS.Glu || "",
    Prot: "mg/dL",
    LDH: TEND_UNITS.LDH || "",
    Leu: "/\u03BCL"
  }
};
function tendUnitForSeries(sectionKey, fieldKey) {
  var sectionMap = TEND_SECTION_UNIT_MAPS[sectionKey];
  if (sectionMap && fieldKey in sectionMap) return sectionMap[fieldKey];
  return TEND_UNITS[fieldKey] || "";
}
function tendRefOrientative(sectionKey, fieldKey) {
  if (sectionKey === "GASES") {
    var gg = TEND_REF_GASES[fieldKey];
    if (gg) return gg;
    if (fieldKey === "Bica") return TEND_REF.HCO3;
    return null;
  }
  if (sectionKey === "LCR") {
    var lr = {
      pH: TEND_REF.LCR_pH,
      Leu: TEND_REF.LCR_Leu,
      Glu: TEND_REF.LCR_Glu,
      Cl: TEND_REF.LCR_Cl,
      Prot: TEND_REF.LCR_Prot
    };
    return lr[fieldKey] || null;
  }
  if (sectionKey === "Liq") {
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
function tendParsedHistoryDesc(patientId) {
  if (rt.ensureParsedLabHistoryCached) {
    return sortLabHistoryChronological(rt.ensureParsedLabHistoryCached(patientId));
  }
  return sortLabHistoryChronological(rt.ensureParsedLabHistory(patientId));
}
function tendCatalogSeriesKey(sectionKey, fieldKey) {
  return trendCatalogSeriesKey(sectionKey, fieldKey);
}
function orderTrendSeriesBySaved(specs, savedOrder) {
  var rank = /* @__PURE__ */ Object.create(null);
  if (savedOrder && savedOrder.length) {
    savedOrder.forEach(function(key, i) {
      rank[key] = i;
    });
  }
  var missingBase = (savedOrder && savedOrder.length ? savedOrder.length : specs.length) + 1e3;
  return specs.slice().sort(function(a, b) {
    var ka = tendCatalogSeriesKey(a.sectionKey, a.fieldKey);
    var kb = tendCatalogSeriesKey(b.sectionKey, b.fieldKey);
    var ra = Object.prototype.hasOwnProperty.call(rank, ka) ? rank[ka] : missingBase;
    var rb = Object.prototype.hasOwnProperty.call(rank, kb) ? rank[kb] : missingBase;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}
function tendFindSeriesSpec(sectionKey, fieldKey) {
  for (var i = 0; i < TEND_SERIES_CATALOG.length; i++) {
    if (TEND_SERIES_CATALOG[i].sectionKey === sectionKey && TEND_SERIES_CATALOG[i].fieldKey === fieldKey) {
      return TEND_SERIES_CATALOG[i];
    }
  }
  return {
    sectionKey,
    fieldKey,
    cardTitle: fieldKey + " \xB7 " + sectionKey
  };
}
function buildMergedTrendSeriesCatalog(history) {
  var mapped = /* @__PURE__ */ Object.create(null);
  var out = [];
  function add(spec) {
    var k = tendCatalogSeriesKey(spec.sectionKey, spec.fieldKey);
    if (mapped[k]) return;
    mapped[k] = true;
    out.push(spec);
  }
  TEND_SERIES_CATALOG.forEach(function(e) {
    add({ sectionKey: e.sectionKey, fieldKey: e.fieldKey, cardTitle: e.cardTitle });
  });
  (history || []).forEach(function(set) {
    var pb = set && set.parsedBySection;
    if (!pb) return;
    Object.keys(pb).forEach(function(sk) {
      if (!tendEligibleSectionKey(sk)) return;
      var row = pb[sk];
      if (!row) return;
      Object.keys(row).forEach(function(fk) {
        var k = tendCatalogSeriesKey(sk, fk);
        if (mapped[k]) return;
        var v = row[fk];
        if (!isFinite(Number(v))) return;
        mapped[k] = true;
        out.push({
          sectionKey: sk,
          fieldKey: fk,
          cardTitle: sk === "BH" ? bhTrendDisplayTitle(fk) : fk + " \xB7 " + sk,
          _dynamic: true
        });
      });
    });
  });
  return out;
}
function getTendCatalogSpecsForSection(sectionKey, history) {
  var specs = buildMergedTrendSeriesCatalog(history || []).filter(function(sp) {
    return sp.sectionKey === sectionKey;
  });
  if (sectionKey === "BH" || sectionKey === "QS") {
    return sortTrendSpecsBySomeOrder(sectionKey, specs);
  }
  return specs;
}
function tendEyeVisibilitySvg() {
  return '<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}
function tendEyeHideSvg() {
  return '<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
}

// public/js/features/tendencias-insight.mjs
function formatTendDelta(latest, previous) {
  if (latest == null || previous == null) return null;
  var a = Number(latest);
  var b = Number(previous);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  var d = a - b;
  var abs = Math.abs(d);
  var text = (d > 0 ? "+" : d < 0 ? "\u2212" : "") + (d === 0 ? "0" : String(Number(abs.toPrecision(4))));
  var direction = d > 0 ? "up" : d < 0 ? "down" : "flat";
  var pct = null;
  if (b !== 0) pct = d / Math.abs(b) * 100;
  return { delta: d, text, direction, pct };
}
function isTendJump(latest, previous, opts) {
  opts = opts || {};
  var info = formatTendDelta(latest, previous);
  if (!info) return false;
  var absMin = opts.absMin != null ? opts.absMin : null;
  var pctMin = opts.pctMin != null ? opts.pctMin : 15;
  if (absMin != null && Math.abs(info.delta) >= absMin) return true;
  if (info.pct != null && Math.abs(info.pct) >= pctMin) return true;
  return false;
}
function previousValueFromSetsDesc(setsDesc, sectionKey, fieldKey, getValue) {
  if (!setsDesc || setsDesc.length < 2 || typeof getValue !== "function") return null;
  return getValue(setsDesc[1], sectionKey, fieldKey);
}
function distanceOutsideRef(value, ref) {
  if (value == null || !ref || ref.length < 2) return null;
  var v = Number(value);
  var lo = Number(ref[0]);
  var hi = Number(ref[1]);
  if (!Number.isFinite(v) || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (lo > hi) {
    var swap = lo;
    lo = hi;
    hi = swap;
  }
  if (v < lo) return lo - v;
  if (v > hi) return v - hi;
  return 0;
}
function classifyTendDeltaTone(latest, previous, ref) {
  var info = formatTendDelta(latest, previous);
  if (!info || info.delta === 0) return "neutral";
  var dPrev = distanceOutsideRef(previous, ref);
  var dLatest = distanceOutsideRef(latest, ref);
  if (dPrev == null || dLatest == null) return "neutral";
  if (dPrev === 0 && dLatest === 0) return "neutral";
  if (dLatest < dPrev) return "good";
  if (dLatest > dPrev) return "bad";
  return "neutral";
}
function buildTendInsightHtml(esc2, latest, previous, isAbnormal2, ref) {
  void isAbnormal2;
  var info = formatTendDelta(latest, previous);
  if (!info || info.delta === 0) return "";
  if (info.pct == null || !Number.isFinite(info.pct)) return "";
  var pctRounded = Math.round(info.pct);
  if (pctRounded === 0) return "";
  var jump = isTendJump(latest, previous);
  var tone = classifyTendDeltaTone(latest, previous, ref);
  var deltaText = (pctRounded > 0 ? "+" : "\u2212") + String(Math.abs(pctRounded)) + "%";
  var cls = "tend-insight-delta tend-insight-delta--" + info.direction + " tend-insight-delta--" + tone + (jump ? " tend-insight-delta--jump" : "");
  return '<div class="tend-insight"><span class="' + cls + '">' + esc2(deltaText) + "</span></div>";
}
function alignSeriesToLabels(primaryLabels, compareLabels, compareValues) {
  var map = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < (compareLabels || []).length; i += 1) {
    map[String(compareLabels[i])] = compareValues[i];
  }
  return (primaryLabels || []).map(function(lab) {
    var v = map[String(lab)];
    return v == null ? null : v;
  });
}
function formatTendTooltipDelta(values, dataIndex) {
  if (!values || dataIndex == null || dataIndex < 1) return null;
  var cur = values[dataIndex];
  var prev = values[dataIndex - 1];
  var info = formatTendDelta(cur, prev);
  if (!info) return null;
  return "\u0394 " + info.text;
}

// public/js/features/tendencias-spark.mjs
function tendSeriesKeySelector(seriesKey) {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return '.tend-card[data-series-key="' + CSS.escape(seriesKey) + '"]';
  }
  return '.tend-card[data-series-key="' + String(seriesKey).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"]';
}
function patchTendCardsFromIndex(seriesIndex, seriesAvail) {
  var patched = 0;
  for (var i = 0; i < seriesAvail.length; i += 1) {
    var sp = seriesAvail[i];
    var key = tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
    var idx = seriesIndex[key];
    if (!idx) return false;
    var card = document.querySelector(tendSeriesKeySelector(key));
    if (!card) return false;
    var valEl = card.querySelector(".tend-param-value");
    if (valEl) {
      valEl.textContent = idx.latest != null ? String(idx.latest) : "\u2014";
      valEl.classList.toggle("tend-abnormal", !!idx.isAbnormal);
    }
    var prev = previousValueFromSetsDesc(
      idx.setsDescFull || idx.setsDesc,
      sp.sectionKey,
      sp.fieldKey,
      getSetTrendValueForSeries
    );
    var insight = buildTendInsightHtml(
      function(s) {
        return String(s == null ? "" : s);
      },
      idx.latest,
      prev,
      !!idx.isAbnormal,
      idx.ref
    );
    var insightEl = card.querySelector(".tend-insight");
    var reading = card.querySelector(".tend-card-reading");
    if (insight) {
      if (insightEl) insightEl.outerHTML = insight;
      else if (reading) reading.insertAdjacentHTML("beforeend", insight);
      else if (valEl && valEl.parentElement) {
        valEl.insertAdjacentHTML("afterend", insight);
      }
    } else if (insightEl) {
      insightEl.remove();
    }
    card.setAttribute("data-abnormal", idx.isAbnormal ? "1" : "0");
    patched += 1;
  }
  return patched > 0;
}
function destroySparkChartEntry(ck) {
  var chart = tendStore.sparkCharts[ck];
  if (chart && typeof chart.destroy === "function") {
    try {
      chart.destroy();
    } catch (_) {
    }
  }
  delete tendStore.sparkCharts[ck];
}
function releaseSparkCanvas(ck, canvas, Chart) {
  destroySparkChartEntry(ck);
  if (!canvas || !Chart || typeof Chart.getChart !== "function") return;
  var orphan = Chart.getChart(canvas);
  if (orphan && typeof orphan.destroy === "function") {
    try {
      orphan.destroy();
    } catch (_) {
    }
  }
}
function sparkLineColorForJob(job, history) {
  var sk2 = job.sk2;
  var fk2 = job.fk2;
  var latestSetSpark = job.setsDesc2.length ? job.setsDesc2[0] : null;
  var latestSpark = latestSetSpark ? getSetTrendValueForSeries(latestSetSpark, sk2, fk2) : null;
  var refSpark = tendRefForSeries(history, sk2, fk2, latestSetSpark);
  var isAbSpark = refSpark && latestSpark != null && (latestSpark < refSpark[0] || latestSpark > refSpark[1]);
  return isAbSpark ? "#f87171" : "rgba(52,211,153,0.95)";
}
function sparkChartAnim(duration) {
  return rt.rpcPrefersReducedMotion() ? false : { duration, easing: "easeOutQuart" };
}
function updateSparkChartsFromJobs(sparkJobs, history) {
  for (var i = 0; i < sparkJobs.length; i += 1) {
    var job = sparkJobs[i];
    var ck = trendSparkChartKey(job.sk2, job.fk2);
    var chart = tendStore.sparkCharts[ck];
    if (chart && chart.data && chart.data.datasets && chart.data.datasets[0]) {
      chart.data.labels = job.labels2;
      chart.data.datasets[0].data = job.values2;
      var lineColor = sparkLineColorForJob(job, history);
      chart.data.datasets[0].borderColor = lineColor;
      chart.data.datasets[0].pointBackgroundColor = lineColor;
      chart.update("none");
    } else {
      destroySparkChartEntry(ck);
      mountOneTrendSparkChartAsync(job, history, sparkChartAnim(400));
    }
  }
}
function mountOneTrendSparkChart(job, history, chartAnim, Chart, mountGen) {
  if (mountGen != null && mountGen !== tendStore.sparkMountGen) return;
  var sk2 = job.sk2;
  var fk2 = job.fk2;
  var canvas2 = document.getElementById(trendSparkDomId(sk2, fk2));
  if (!canvas2 || !Chart) return;
  var ck = trendSparkChartKey(sk2, fk2);
  releaseSparkCanvas(ck, canvas2, Chart);
  if (mountGen != null && mountGen !== tendStore.sparkMountGen) return;
  var lineColor = sparkLineColorForJob(job, history);
  tendStore.sparkCharts[ck] = new Chart(canvas2, {
    type: "line",
    data: {
      labels: job.labels2,
      datasets: [
        {
          data: job.values2,
          borderColor: lineColor,
          borderWidth: 2.25,
          pointRadius: 2,
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
      layout: { padding: { left: 4, right: 4, top: 6, bottom: 4 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false, grid: { display: false }, offset: true },
        y: { display: false, grid: { display: false }, grace: "12%" }
      }
    }
  });
}
function mountOneTrendSparkChartAsync(job, history, chartAnim) {
  var mountGen = tendStore.sparkMountGen;
  void loadChartJs().then(function(Chart) {
    mountOneTrendSparkChart(job, history, chartAnim, Chart, mountGen);
  }).catch(function(err) {
    console.error("[R+ Tendencias] spark chart", err);
  });
}
function buildSparkJobsFromIndex(seriesAvail, seriesIndex, history, chartAnim) {
  tendStore.sparkMountGen += 1;
  var mountGen = tendStore.sparkMountGen;
  var sparkJobs = [];
  for (var cj = 0; cj < seriesAvail.length; cj += 1) {
    var spec2 = seriesAvail[cj];
    var sk2 = spec2.sectionKey;
    var fk2 = spec2.fieldKey;
    if (!tendSectionIsExpanded(sk2)) continue;
    var idx = seriesIndex[tendCatalogSeriesKey(sk2, fk2)];
    if (!idx || !idx.setsDesc.length) continue;
    var sparkDesc = idx.setsDesc.slice(0, TREND_SPARK_WINDOW);
    var setsAsc2 = toTrendAscendingSets(sparkDesc);
    sparkJobs.push({
      sk2,
      fk2,
      setsDesc2: sparkDesc,
      labels2: buildTendChartLabels(setsAsc2),
      values2: setsAsc2.map(function(s) {
        return getSetTrendValueForSeries(s, sk2, fk2);
      }),
      ref: idx.ref || null
    });
  }
  function runSparkBatches(Chart) {
    if (mountGen !== tendStore.sparkMountGen) return;
    var jobIndex = 0;
    var SPARK_BATCH = 8;
    function runSparkBatch() {
      if (mountGen !== tendStore.sparkMountGen) return;
      var end = Math.min(jobIndex + SPARK_BATCH, sparkJobs.length);
      for (; jobIndex < end; jobIndex += 1) {
        mountOneTrendSparkChart(sparkJobs[jobIndex], history, chartAnim, Chart, mountGen);
      }
      if (jobIndex < sparkJobs.length) {
        requestAnimationFrame(runSparkBatch);
        return;
      }
      if (mountGen !== tendStore.sparkMountGen) return;
      tendenciasBridge.mountTendCardSortables();
      tendenciasBridge.syncTendHiddenModalIfOpen();
    }
    if (sparkJobs.length) runSparkBatch();
    else {
      tendenciasBridge.mountTendCardSortables();
      tendenciasBridge.syncTendHiddenModalIfOpen();
    }
  }
  if (!sparkJobs.length) {
    tendenciasBridge.mountTendCardSortables();
    tendenciasBridge.syncTendHiddenModalIfOpen();
    return sparkJobs;
  }
  void loadChartJs().then(runSparkBatches).catch(function(err) {
    console.error("[R+ Tendencias] Chart.js for sparks", err);
    tendenciasBridge.mountTendCardSortables();
    tendenciasBridge.syncTendHiddenModalIfOpen();
  });
  return sparkJobs;
}

// public/js/features/tendencias-sections.mjs
var TEND_SECTION_EXPANDED_LS = "rpc-tend-sections-expanded";
function tendSectionExpandedRead() {
  try {
    var raw = localStorage.getItem(TEND_SECTION_EXPANDED_LS);
    if (!raw) return {};
    var o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
function tendSectionExpandedWrite(map) {
  try {
    localStorage.setItem(TEND_SECTION_EXPANDED_LS, JSON.stringify(map || {}));
  } catch (_e) {
    void _e;
  }
}
function tendSectionIsExpanded(sectionKey) {
  var m = tendSectionExpandedRead();
  if (!Object.prototype.hasOwnProperty.call(m, sectionKey)) return true;
  return m[sectionKey] !== false;
}
function destroySparkChartsForSection(sectionKey) {
  var prefix = String(sectionKey) + "";
  Object.keys(tendStore.sparkCharts).forEach(function(ck) {
    if (!ck.startsWith(prefix)) return;
    destroySparkChartEntry(ck);
  });
}
function mountSectionSparkCharts(sectionKey, history, chartAnim) {
  var seriesIndex = tendStore._tendRenderState.seriesIndex;
  var seriesAvail = tendStore._tendRenderState.seriesAvail;
  if (!seriesIndex || !seriesAvail) return;
  var jobs = [];
  for (var i = 0; i < seriesAvail.length; i += 1) {
    var spec = seriesAvail[i];
    if (spec.sectionKey !== sectionKey) continue;
    var sk2 = spec.sectionKey;
    var fk2 = spec.fieldKey;
    var idx = seriesIndex[tendCatalogSeriesKey(sk2, fk2)];
    if (!idx || !idx.setsDesc.length) continue;
    var sparkDesc = idx.setsDesc.slice(0, TREND_SPARK_WINDOW);
    var setsAsc2 = toTrendAscendingSets(sparkDesc);
    jobs.push({
      sk2,
      fk2,
      setsDesc2: sparkDesc,
      labels2: buildTendChartLabels(setsAsc2),
      values2: setsAsc2.map(function(s) {
        return getSetTrendValueForSeries(s, sk2, fk2);
      }),
      ref: idx.ref || null
    });
  }
  if (!jobs.length) return;
  var mountGen = tendStore.sparkMountGen;
  void loadChartJs().then(function(Chart) {
    if (mountGen !== tendStore.sparkMountGen) return;
    var jobIndex = 0;
    var SPARK_BATCH = 8;
    function runBatch() {
      if (mountGen !== tendStore.sparkMountGen) return;
      var end = Math.min(jobIndex + SPARK_BATCH, jobs.length);
      for (; jobIndex < end; jobIndex += 1) {
        mountOneTrendSparkChart(jobs[jobIndex], history, chartAnim, Chart, mountGen);
      }
      if (jobIndex < jobs.length) scheduleIdle(runBatch, 24);
    }
    runBatch();
  });
}
function applyTendSectionExpandedState(sectionEl, sectionKey, expanded) {
  var btn = sectionEl.querySelector(".tend-section-toggle");
  var body = sectionEl.querySelector(".tend-section-body");
  var chevron = sectionEl.querySelector(".tend-section-chevron");
  if (btn) btn.setAttribute("aria-expanded", expanded ? "true" : "false");
  if (chevron) chevron.textContent = expanded ? "\u25BC" : "\u25B6";
  if (body) body.classList.toggle("tend-section-body--collapsed", !expanded);
  if (!expanded) {
    destroySparkChartsForSection(sectionKey);
    sectionEl.querySelectorAll(".tend-spark-canvas-cell").forEach(function(cell) {
      if (cell.querySelector("canvas")) {
        cell.innerHTML = '<div class="tend-spark-placeholder" aria-hidden="true"></div>';
      }
    });
    return;
  }
  sectionEl.querySelectorAll(".tend-card").forEach(function(card) {
    var seriesKey = card.getAttribute("data-series-key");
    if (!seriesKey) return;
    var pipe = seriesKey.indexOf("|");
    if (pipe < 0) return;
    var sk = seriesKey.slice(0, pipe);
    var fk = seriesKey.slice(pipe + 1);
    var cell = card.querySelector(".tend-spark-canvas-cell");
    if (!cell || cell.querySelector("canvas")) return;
    cell.innerHTML = '<canvas id="' + trendSparkDomId(sk, fk) + '"></canvas>';
  });
  mountSectionSparkCharts(sectionKey, null, sparkChartAnim(400));
}
function toggleTendSection(ev, sectionKey) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var m = tendSectionExpandedRead();
  var cur = tendSectionIsExpanded(sectionKey);
  var next = !cur;
  m[sectionKey] = next;
  tendSectionExpandedWrite(m);
  var container = document.getElementById("tendencias-container");
  var sectionEl = container && container.querySelector('.tend-section[data-section="' + String(sectionKey).replace(/"/g, '\\"') + '"]');
  if (sectionEl && container.querySelector(".tend-grid") && tendStore._tendRenderState.seriesIndex) {
    applyTendSectionExpandedState(sectionEl, sectionKey, next);
    return;
  }
  tendenciasBridge.renderTendencias();
}

// public/js/features/tendencias-lab-prefs.mjs
var LAB_OUTPUT_PREFS_KEY = "rpc-lab-output-prefs-v1";
function isAbgAnalysisHidden() {
  return true;
}
function getLabOutputPrefs() {
  try {
    var raw = localStorage.getItem(LAB_OUTPUT_PREFS_KEY);
    var o = raw ? JSON.parse(raw) : {};
    var prefs = {
      showBhExtendedLine: !!o.showBhExtendedLine,
      hideGasoAdvInterp: !!o.hideGasoAdvInterp,
      quickLabOutput: !!o.quickLabOutput
    };
    if (isAbgAnalysisHidden()) prefs.hideGasoAdvInterp = true;
    return prefs;
  } catch {
    return {
      showBhExtendedLine: false,
      hideGasoAdvInterp: isAbgAnalysisHidden(),
      quickLabOutput: false
    };
  }
}
function syncAbgLabPrefRowVisibility() {
  var row = document.getElementById("lab-pref-gaso-extended")?.closest("label") || document.getElementById("lab-pref-gaso-extended-lbl")?.closest(".lab-pref-row");
  if (row) row.style.display = isAbgAnalysisHidden() ? "none" : "";
}
function setLabOutputPrefs(partial) {
  var cur = getLabOutputPrefs();
  if (partial.showBhExtendedLine != null) cur.showBhExtendedLine = !!partial.showBhExtendedLine;
  if (partial.hideGasoAdvInterp != null) cur.hideGasoAdvInterp = !!partial.hideGasoAdvInterp;
  if (partial.quickLabOutput != null) cur.quickLabOutput = !!partial.quickLabOutput;
  try {
    localStorage.setItem(LAB_OUTPUT_PREFS_KEY, JSON.stringify(cur));
  } catch (_e) {
    void _e;
  }
  return cur;
}
function isGasoInterpretacionResLabChunk(text) {
  var head = String(text || "").split("\n")[0].trim();
  return /^INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A\s*:/i.test(head);
}
function isAscitisInterpretacionResLabChunk(text) {
  var head = String(text || "").split("\n")[0].trim();
  return /^INTERPRETACI[ÓO]N\s+ASCITIS\s*:/i.test(head);
}
function isCitoquimInterpretacionResLabChunk(text) {
  var head = String(text || "").split("\n")[0].trim();
  return /^INTERPRETACI[ÓO]N\s+CITOQU[IÍ]MICO\s*:/i.test(head) || /^INTERPRETACI[ÓO]N\s+ASCITIS\s*:/i.test(head) || /^INTERPRETACI[ÓO]N\s+PLEURAL\s*:/i.test(head);
}
function citoquimInterpretacionBody_(text) {
  return String(text || "").replace(/^INTERPRETACI[ÓO]N\s+(?:CITOQU[IÍ]MICO|ASCITIS|PLEURAL)\s*:\t?/i, "").trim();
}
function ascitisInterpretacionBody_(text) {
  return citoquimInterpretacionBody_(text);
}
function isBhMainResLabChunk(text) {
  if (!text) return false;
  var head = String(text).split("\n")[0].trim();
  return head.indexOf("BH	") === 0 || /^BH:?\s*$/.test(head) || /^BH\s/.test(head);
}
function formatBhExtendedTabLine(bhExtras, sourceText) {
  return formatBhExtrasDisplayLine(bhExtras, sourceText || "");
}
function _syncLabPrefSwitchAria(el) {
  if (!el || el.getAttribute("role") !== "switch") return;
  el.setAttribute("aria-checked", el.checked ? "true" : "false");
}
function openLabDisplayPrefsModal() {
  var backdrop = document.getElementById("lab-display-prefs-backdrop");
  if (!backdrop) return;
  syncAbgLabPrefRowVisibility();
  var p = getLabOutputPrefs();
  var cbBh = document.getElementById("lab-pref-bh-extended");
  var cbGaso = document.getElementById("lab-pref-gaso-extended");
  var cbQuick = document.getElementById("lab-pref-quick-output");
  if (cbBh) {
    cbBh.checked = p.showBhExtendedLine;
    _syncLabPrefSwitchAria(cbBh);
  }
  if (cbGaso) {
    cbGaso.checked = !p.hideGasoAdvInterp;
    _syncLabPrefSwitchAria(cbGaso);
  }
  if (cbQuick) {
    cbQuick.checked = p.quickLabOutput;
    _syncLabPrefSwitchAria(cbQuick);
  }
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
}
function closeLabDisplayPrefsModal() {
  var backdrop = document.getElementById("lab-display-prefs-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
}
function onLabDisplayPrefsChanged() {
  var cbBh = document.getElementById("lab-pref-bh-extended");
  var cbGaso = document.getElementById("lab-pref-gaso-extended");
  var cbQuick = document.getElementById("lab-pref-quick-output");
  setLabOutputPrefs({
    showBhExtendedLine: cbBh ? cbBh.checked : false,
    hideGasoAdvInterp: isAbgAnalysisHidden() ? true : cbGaso ? !cbGaso.checked : false,
    quickLabOutput: cbQuick ? cbQuick.checked : false
  });
  _syncLabPrefSwitchAria(cbBh);
  _syncLabPrefSwitchAria(cbGaso);
  _syncLabPrefSwitchAria(cbQuick);
  rt.rerenderParsedLabOutputAfterPrefsChange();
}

// public/js/features/tendencias-hidden.mjs
var TEND_HIDDEN_SERIES_LS = "rpc-tend-hidden-series";
var TEND_ABNORMAL_ONLY_LS = "rpc-tend-abnormal-only";
function tendHiddenSeriesRead() {
  try {
    var j = localStorage.getItem(TEND_HIDDEN_SERIES_LS);
    if (!j) return [];
    var a = JSON.parse(j);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
function tendHiddenSeriesWrite(arr) {
  try {
    localStorage.setItem(TEND_HIDDEN_SERIES_LS, JSON.stringify(arr || []));
  } catch (_e) {
    void _e;
  }
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
  var SEED_KEY = "rpc-tend-hidden-seeded-v2";
  try {
    if (localStorage.getItem(SEED_KEY) === "1") return;
  } catch {
    return;
  }
  var current = tendHiddenSeriesRead().slice();
  var seen = {};
  current.forEach(function(k) {
    seen[k] = true;
  });
  var changed = false;
  TEND_SERIES_CATALOG.forEach(function(sp) {
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
    localStorage.setItem(SEED_KEY, "1");
  } catch (_e) {
    void _e;
  }
}
function tendAbnormalOnlyRead() {
  try {
    return localStorage.getItem(TEND_ABNORMAL_ONLY_LS) === "1";
  } catch {
    return false;
  }
}
function tendAbnormalOnlyWrite(on) {
  try {
    if (on) localStorage.setItem(TEND_ABNORMAL_ONLY_LS, "1");
    else localStorage.removeItem(TEND_ABNORMAL_ONLY_LS);
  } catch (_e) {
    void _e;
  }
}
function tendHiddenChipDescriptors() {
  var hiddenKeys = tendHiddenSeriesRead();
  var list = [];
  for (var hi = 0; hi < hiddenKeys.length; hi++) {
    var entry = hiddenKeys[hi];
    var pipe = entry.indexOf("|");
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
      '<button type="button" class="tend-hidden-chip" data-series-key="' + esc(tendCatalogSeriesKey(sk, fk)) + '" title="Volver a mostrar ' + label + '" aria-label="Mostrar de nuevo ' + label + '"><span class="tend-hidden-chip-label">' + label + '</span><span class="tend-hidden-chip-eye" aria-hidden="true">' + svg + "</span></button>"
    );
  }
  return chips.join("");
}
function refreshTendHiddenModalContent() {
  var el = document.getElementById("tend-hidden-modal-chips");
  if (!el) return;
  var html = buildTendHiddenChipsHtml();
  el.innerHTML = html || '<p style="margin:0;font-size:13px;color:var(--text-muted);">No hay analitos ocultos.</p>';
}
function openTendHiddenModal() {
  var bd = document.getElementById("tend-hidden-modal-backdrop");
  if (!bd) return;
  refreshTendHiddenModalContent();
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
}
function closeTendHiddenModal() {
  var bd = document.getElementById("tend-hidden-modal-backdrop");
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}
function buildTendInlineControlsHtml(hiddenCount, opts) {
  opts = opts || {};
  var on = tendAbnormalOnlyRead();
  var hint = on ? "Solo analitos con \xFAltimo valor fuera del rango de referencia del laboratorio (si hay referencia)." : "Vista completa: todos los analitos con datos suficientes para tendencia.";
  var toggleLabel = on ? "Ver todas" : "Solo fuera de rango";
  var ocultosBtn = hiddenCount > 0 ? '<button type="button" class="tend-toolbar-btn tend-ocultos-trigger">Ocultos (' + hiddenCount + ")</button>" : "";
  var gasoBtn = opts.showGasoExtended ? '<button type="button" class="tend-toolbar-btn tend-gaso-ext-trigger" data-tend-action="gaso-extended">Gasometr\xEDa extendida</button>' : "";
  return '<div class="tend-inline-controls"><button type="button" class="tend-toolbar-toggle' + (on ? " is-active" : "") + '" aria-pressed="' + (on ? "true" : "false") + '" title="' + esc(hint) + '">' + esc(toggleLabel) + "</button>" + ocultosBtn + gasoBtn + "</div>";
}
function historyHasGasoForExtended(historyDesc) {
  var latest = historyDesc && historyDesc[0];
  if (!latest || !latest.parsedBySection || !latest.parsedBySection.GASES) return false;
  return getSetTrendValueForSeries(latest, "GASES", "pH") != null;
}
function toggleTendAbnormalOnlyFilter() {
  tendAbnormalOnlyWrite(!tendAbnormalOnlyRead());
  tendenciasBridge.renderTendencias();
}
function tendHideSeriesFromCard(ev, sectionKey, fieldKey) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  tendSeriesSetUserHidden(sectionKey, fieldKey, true);
  tendenciasBridge.renderTendencias();
}
function tendUnhideSeries(sectionKey, fieldKey) {
  tendSeriesSetUserHidden(sectionKey, fieldKey, false);
  tendenciasBridge.renderTendencias();
}
function tendResetAllHiddenSeries() {
  tendHiddenSeriesWrite([]);
  closeTendHiddenModal();
  tendenciasBridge.renderTendencias();
}

// public/js/features/tendencias-event-context.mjs
var EVENT_MARKER_COLORS = {
  transfusion: "rgba(248, 113, 113, 0.9)",
  biopsia: "rgba(251, 191, 36, 0.95)",
  procedimiento: "rgba(96, 165, 250, 0.95)",
  otro: "rgba(148, 163, 184, 0.9)"
};
function dayKeyFromLabSet(set) {
  if (!set || set.fecha === "Anterior") return null;
  const ms = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof ms !== "number" || !isFinite(ms)) return null;
  return dayKeyFromIso(new Date(ms).toISOString());
}
function collectEventMarkersForPatient(patientId) {
  const map = /* @__PURE__ */ new Map();
  const pid = String(patientId || "").trim();
  if (!pid) return map;
  const patient = getPatients().find(function(row) {
    return String(row.id) === pid;
  });
  const store = patient && patient.eventualidades;
  const deleted = store && store.deletedIds || {};
  (store && Array.isArray(store.entries) ? store.entries : []).forEach(function(entry) {
    if (!entry || deleted[entry.id]) return;
    const dayKey = dayKeyFromIso(entry.at);
    if (dayKey === "unknown") return;
    if (!map.has(dayKey)) {
      map.set(dayKey, { kind: "otro", entries: [] });
    }
    const bucket = map.get(dayKey);
    bucket.entries.push(entry);
    bucket.kind = pickHigherPriorityKind(bucket.kind, resolveEventualidadKind(entry));
  });
  return map;
}
function mapEventMarkersToChartIndices(axisMeta, markersByDay) {
  const indices = [];
  const byIndex = /* @__PURE__ */ new Map();
  const seenDays = /* @__PURE__ */ new Set();
  (axisMeta && axisMeta.points ? axisMeta.points : []).forEach(function(point, index) {
    const dayKey = dayKeyFromLabSet(point.set);
    if (!dayKey || !markersByDay.has(dayKey) || seenDays.has(dayKey)) return;
    seenDays.add(dayKey);
    indices.push(index);
    byIndex.set(index, markersByDay.get(dayKey));
  });
  return { indices, byIndex };
}
function buildEventMarkerMapForSets(setsAsc, patientId) {
  const axisMeta = buildTrendAxisMeta(setsAsc);
  const markers = collectEventMarkersForPatient(patientId);
  return mapEventMarkersToChartIndices(axisMeta, markers);
}
function createTendEventMarkerPlugin(markerMap, opts) {
  const compact = !!(opts && opts.compact);
  return {
    id: "tendEventMarkers" + (compact ? "Compact" : "Detail"),
    afterDatasetsDraw: function(chart) {
      if (!markerMap || !markerMap.indices || !markerMap.indices.length) return;
      const ctx = chart.ctx;
      const yScale = chart.scales.y;
      const dataMeta = chart.getDatasetMeta(0);
      if (!ctx || !yScale || !dataMeta || !dataMeta.data) return;
      markerMap.indices.forEach(function(idx) {
        const pt = dataMeta.data[idx];
        if (!pt) return;
        const bucket = markerMap.byIndex.get(idx);
        const kind = bucket && bucket.kind ? bucket.kind : "otro";
        const color = EVENT_MARKER_COLORS[kind] || EVENT_MARKER_COLORS.otro;
        const x = pt.x;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = compact ? 1 : 1.5;
        ctx.setLineDash(compact ? [2, 3] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, yScale.top + (compact ? 4 : 0));
        ctx.lineTo(x, yScale.bottom);
        ctx.stroke();
        if (compact) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, yScale.bottom - 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }
  };
}
function buildTendDetailEventsLegendHtml(markerMap, labels) {
  if (!markerMap || !markerMap.indices.length) return "";
  const parts = markerMap.indices.map(function(idx) {
    const bucket = markerMap.byIndex.get(idx);
    const label = labels && labels[idx] != null ? labels[idx] : "";
    const kind = bucket && bucket.kind ? bucket.kind : "otro";
    const kindLabel = EVENTUALIDAD_KIND_LABELS[kind] || "Otro";
    const texts = (bucket && bucket.entries ? bucket.entries : []).map(function(entry) {
      const entryKind = EVENTUALIDAD_KIND_LABELS[resolveEventualidadKind(entry)] || "Otro";
      const snippet = String(entry.text || "").trim().slice(0, 60);
      return entryKind + (snippet ? ": " + snippet : "");
    }).join(" \xB7 ");
    return '<div class="tend-event-legend-item" data-kind="' + esc(kind) + '"><span class="tend-event-legend-date">' + esc(label) + '</span> <span class="tend-event-legend-kind">' + esc(kindLabel) + "</span>" + (texts ? '<span class="tend-event-legend-text">' + esc(texts) + "</span>" : "") + "</div>";
  });
  return '<div class="tend-event-legend" role="list">' + parts.join("") + "</div>";
}
function dayValueFromTrendChartIndex(index, setsAsc) {
  if (index == null || !setsAsc || !setsAsc[index]) return "";
  const dayKey = dayKeyFromLabSet(setsAsc[index]);
  return dayKey && dayKey !== "unknown" ? dayKey : "";
}
function eventTooltipLinesForChartIndex(markerMap, dataIndex) {
  if (!markerMap || !markerMap.byIndex.has(dataIndex)) return [];
  const bucket = markerMap.byIndex.get(dataIndex);
  return (bucket && bucket.entries ? bucket.entries : []).map(function(entry) {
    const kindLabel = EVENTUALIDAD_KIND_LABELS[resolveEventualidadKind(entry)] || "Otro";
    return kindLabel + ": " + String(entry.text || "").trim();
  });
}

// public/js/features/tendencias-event-compose.mjs
function findActivePatient() {
  const pid = rt.getActiveId();
  if (!pid) return null;
  return getPatients().find(function(row) {
    return String(row.id) === String(pid);
  }) || null;
}
function buildTransfusionProductPillsHtml() {
  return TRANSFUSION_PRODUCTS.map(function(product, idx) {
    const active = idx === 0 ? " is-active" : "";
    return '<button type="button" class="tend-event-kind-pill tend-event-product-pill' + active + '" data-product="' + esc(product) + '" aria-pressed="' + (idx === 0 ? "true" : "false") + '">' + esc(TRANSFUSION_PRODUCT_LABELS[product]) + "</button>";
  }).join("");
}
function buildKindFieldsHtml() {
  return '<div class="tend-event-compose-kind-fields" data-kind-fields="transfusion"><span class="tend-event-compose-label">Producto</span><div class="tend-event-kind-pills tend-event-transfusion-pills" role="group" aria-label="Producto transfundido">' + buildTransfusionProductPillsHtml() + '</div><label class="tend-event-compose-label" for="tend-event-compose-transfusion-detail">Detalle (opcional)</label><input type="text" id="tend-event-compose-transfusion-detail" class="tend-event-compose-input" placeholder="Ej. 2 U, pool\u2026" /></div><div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="biopsia" hidden><label class="tend-event-compose-label" for="tend-event-compose-biopsia-site">De d\xF3nde</label><input type="text" id="tend-event-compose-biopsia-site" class="tend-event-compose-input" placeholder="Ej. Ri\xF1\xF3n, m\xE9dula \xF3sea, piel\u2026" /></div><div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="procedimiento" hidden><label class="tend-event-compose-label" for="tend-event-compose-procedimiento-text">Procedimiento</label><textarea id="tend-event-compose-procedimiento-text" class="tend-event-compose-text" rows="3" placeholder="Describe el procedimiento\u2026"></textarea></div><div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="otro" hidden><label class="tend-event-compose-label" for="tend-event-compose-otro-text">Detalle (opcional)</label><textarea id="tend-event-compose-otro-text" class="tend-event-compose-text" rows="3" placeholder="Describe lo ocurrido\u2026"></textarea></div>';
}
function composePayloadRequirementReason(kind, dateValue, transfusionProduct, detail) {
  if (!kind) return "kind";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return "date";
  if (kind === "transfusion" && !transfusionProduct) return "transfusionProduct";
  if (kind === "biopsia" && !detail) return "biopsiaSite";
  if (kind === "procedimiento" && !detail) return "procedimientoText";
  return "";
}
function validateTendEventComposePayload(payload) {
  const kind = normalizeEventualidadKind(payload && payload.kind);
  const dateValue = String(payload && payload.dateValue || "").trim();
  const detail = String(payload && payload.detail || "").trim();
  const transfusionProduct = String(payload && payload.transfusionProduct || "").trim();
  const reason = composePayloadRequirementReason(kind, dateValue, transfusionProduct, detail);
  if (reason) return { ok: false, reason };
  const text = buildEventualidadComposeText({
    kind,
    transfusionProduct,
    detail
  });
  if (!text) return { ok: false, reason: "text" };
  return {
    ok: true,
    kind,
    dateValue,
    text,
    transfusionProduct: kind === "transfusion" ? transfusionProduct : void 0
  };
}
function buildTendEventComposeHtml(opts) {
  const defaultDate = opts && opts.defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(opts.defaultDate) ? opts.defaultDate : toEventualidadDateValue(/* @__PURE__ */ new Date());
  const pills = EVENTUALIDAD_KINDS.map(function(kind, idx) {
    const active = idx === 0 ? " is-active" : "";
    return '<button type="button" class="tend-event-kind-pill' + active + '" data-kind="' + esc(kind) + '" aria-pressed="' + (idx === 0 ? "true" : "false") + '">' + esc(EVENTUALIDAD_KIND_LABELS[kind]) + "</button>";
  }).join("");
  return '<div id="tend-event-compose-backdrop" class="tend-event-compose-backdrop" aria-hidden="false"><div id="tend-event-compose-modal" class="tend-event-compose-modal" role="dialog" aria-modal="true" aria-labelledby="tend-event-compose-title"><h3 id="tend-event-compose-title" class="tend-event-compose-title">Nueva eventualidad</h3><p class="tend-event-compose-hint">Se mostrar\xE1 como contexto en las gr\xE1ficas de tendencia del mismo d\xEDa.</p><div class="tend-event-compose-field"><span class="tend-event-compose-label">Categor\xEDa</span><div class="tend-event-kind-pills" role="group" aria-label="Categor\xEDa">' + pills + '</div></div><div class="tend-event-compose-field"><label class="tend-event-compose-label" for="tend-event-compose-date">Fecha</label><input type="date" id="tend-event-compose-date" class="rpc-date-input tend-event-compose-date" value="' + esc(defaultDate) + '" aria-label="Fecha de la eventualidad" /></div><div id="tend-event-compose-kind-fields-wrap">' + buildKindFieldsHtml() + '</div><div class="tend-event-compose-actions"><button type="button" class="ea-btn ea-btn--ghost" id="tend-event-compose-cancel">Cancelar</button><button type="button" class="ea-btn ea-btn--primary" id="tend-event-compose-save">Guardar</button></div></div></div>';
}
function syncTendEventComposeKindFields(backdrop) {
  const activePill = backdrop.querySelector(".tend-event-kind-pill.is-active[data-kind]");
  const kind = activePill ? activePill.getAttribute("data-kind") : "transfusion";
  backdrop.querySelectorAll(".tend-event-compose-kind-fields").forEach(function(panel) {
    const panelKind = panel.getAttribute("data-kind-fields");
    const show = panelKind === kind;
    panel.classList.toggle("is-hidden", !show);
    panel.hidden = !show;
  });
}
function readComposeDetailForKind(backdrop, kind) {
  if (kind === "transfusion") {
    return String(
      /** @type {HTMLInputElement|null} */
      backdrop.querySelector("#tend-event-compose-transfusion-detail")?.value || ""
    ).trim();
  }
  if (kind === "biopsia") {
    return String(
      /** @type {HTMLInputElement|null} */
      backdrop.querySelector("#tend-event-compose-biopsia-site")?.value || ""
    ).trim();
  }
  if (kind === "procedimiento") {
    return String(
      /** @type {HTMLTextAreaElement|null} */
      backdrop.querySelector("#tend-event-compose-procedimiento-text")?.value || ""
    ).trim();
  }
  return String(
    /** @type {HTMLTextAreaElement|null} */
    backdrop.querySelector("#tend-event-compose-otro-text")?.value || ""
  ).trim();
}
function readComposeForm(backdrop) {
  const activePill = backdrop.querySelector(".tend-event-kind-pill.is-active[data-kind]");
  const kind = activePill ? activePill.getAttribute("data-kind") : "";
  const activeProduct = backdrop.querySelector(".tend-event-product-pill.is-active");
  return validateTendEventComposePayload({
    kind,
    dateValue: (
      /** @type {HTMLInputElement|null} */
      backdrop.querySelector("#tend-event-compose-date")?.value
    ),
    transfusionProduct: activeProduct ? activeProduct.getAttribute("data-product") : "",
    detail: readComposeDetailForKind(backdrop, kind || "")
  });
}
function composeValidationToast(reason) {
  if (reason === "transfusionProduct") return "Selecciona el producto transfundido.";
  if (reason === "biopsiaSite") return "Indica de d\xF3nde fue la biopsia.";
  if (reason === "procedimientoText") return "Describe el procedimiento.";
  return "Completa categor\xEDa y fecha.";
}
function closeComposeModal() {
  const backdrop = document.getElementById("tend-event-compose-backdrop");
  if (!backdrop) return;
  closeOverlayAnimated(backdrop, function() {
    backdrop.remove();
  });
}
async function submitComposeForm(backdrop) {
  const payload = readComposeForm(backdrop);
  if (!payload.ok) {
    rt.showToast(composeValidationToast(payload.reason), "warning");
    return;
  }
  const patient = findActivePatient();
  if (!patient) {
    rt.showToast("Selecciona un paciente.", "warning");
    return;
  }
  const atIso = eventualidadDateToIso(payload.dateValue);
  const result = await savePatientEventualidad(
    patient,
    payload.text,
    atIso,
    payload.kind,
    payload.transfusionProduct
  );
  if (!result.ok) {
    rt.showToast("No se pudo guardar la eventualidad.", "error");
    return;
  }
  closeComposeModal();
  rt.showToast("Eventualidad guardada.", "success");
  if (typeof tendenciasBridge.renderTendencias === "function") {
    tendenciasBridge.renderTendencias();
  }
}
function focusComposeFieldForKind(backdrop, kind) {
  const selector = kind === "transfusion" ? ".tend-event-product-pill.is-active, #tend-event-compose-transfusion-detail" : kind === "biopsia" ? "#tend-event-compose-biopsia-site" : kind === "procedimiento" ? "#tend-event-compose-procedimiento-text" : "#tend-event-compose-otro-text";
  const el = backdrop.querySelector(selector);
  if (el && typeof el.focus === "function") {
    try {
      el.focus();
    } catch {
    }
  }
}
function wireComposeBackdrop(backdrop) {
  if (!backdrop || backdrop.dataset.wired === "1") return;
  backdrop.dataset.wired = "1";
  backdrop.addEventListener("click", function(ev) {
    if (ev.target === backdrop) closeComposeModal();
  });
  backdrop.querySelector("#tend-event-compose-cancel")?.addEventListener("click", closeComposeModal);
  backdrop.querySelector("#tend-event-compose-save")?.addEventListener("click", function() {
    void submitComposeForm(backdrop);
  });
  backdrop.querySelectorAll(".tend-event-kind-pill[data-kind]").forEach(function(pill) {
    pill.addEventListener("click", function() {
      backdrop.querySelectorAll(".tend-event-kind-pill[data-kind]").forEach(function(other) {
        other.classList.remove("is-active");
        other.setAttribute("aria-pressed", "false");
      });
      pill.classList.add("is-active");
      pill.setAttribute("aria-pressed", "true");
      syncTendEventComposeKindFields(backdrop);
      focusComposeFieldForKind(backdrop, pill.getAttribute("data-kind") || "transfusion");
    });
  });
  backdrop.querySelectorAll(".tend-event-product-pill").forEach(function(pill) {
    pill.addEventListener("click", function() {
      backdrop.querySelectorAll(".tend-event-product-pill").forEach(function(other) {
        other.classList.remove("is-active");
        other.setAttribute("aria-pressed", "false");
      });
      pill.classList.add("is-active");
      pill.setAttribute("aria-pressed", "true");
    });
  });
  syncTendEventComposeKindFields(backdrop);
}
function openTendEventComposeModal(opts) {
  if (typeof document === "undefined") return;
  const defaultDate = opts && opts.defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(opts.defaultDate) ? opts.defaultDate : toEventualidadDateValue(/* @__PURE__ */ new Date());
  const existing = document.getElementById("tend-event-compose-backdrop");
  if (existing) existing.remove();
  const wrap = document.createElement("div");
  wrap.innerHTML = buildTendEventComposeHtml({ defaultDate });
  const backdrop = (
    /** @type {HTMLElement|null} */
    wrap.firstElementChild
  );
  if (!backdrop) return;
  document.body.appendChild(backdrop);
  wireComposeBackdrop(backdrop);
  cancelOverlayClose(backdrop);
  refreshRpcDateFields(backdrop);
  focusComposeFieldForKind(backdrop, "transfusion");
}

// public/js/features/tendencias-ref-band.mjs
function normalizeTendRef(ref) {
  if (!ref || ref.length < 2) return null;
  var lo = Number(ref[0]);
  var hi = Number(ref[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (lo === hi) return null;
  if (lo > hi) {
    var t = lo;
    lo = hi;
    hi = t;
  }
  return { lo, hi };
}
function yScaleBoundsForRef(values, ref) {
  var nums = [];
  for (var i = 0; i < (values || []).length; i += 1) {
    var n = Number(values[i]);
    if (Number.isFinite(n)) nums.push(n);
  }
  var norm = normalizeTendRef(ref);
  if (norm) {
    nums.push(norm.lo, norm.hi);
  }
  if (!nums.length) return null;
  var min = Math.min.apply(null, nums);
  var max = Math.max.apply(null, nums);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  var pad = (max - min) * 0.1;
  return { min: min - pad, max: max + pad };
}
function tendRefBandOptions(ref, compact) {
  var norm = normalizeTendRef(ref);
  if (!norm) return { display: false };
  return {
    display: true,
    lo: norm.lo,
    hi: norm.hi,
    compact: !!compact
  };
}
function resolveTendRefBandGeometry_(chart, cfg) {
  var lo = Number(cfg.lo);
  var hi = Number(cfg.hi);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;
  var yScale = chart.scales && chart.scales.y;
  var xScale = chart.scales && chart.scales.x;
  if (!yScale || !xScale) return null;
  var top = yScale.getPixelForValue(hi);
  var bottom = yScale.getPixelForValue(lo);
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  if (bottom < top) {
    var swap = top;
    top = bottom;
    bottom = swap;
  }
  var h = bottom - top;
  if (h < 1) return null;
  return { top, bottom, left: xScale.left, right: xScale.right, h };
}
function drawTendRefBandFill_(ctx, geo, compact) {
  ctx.beginPath();
  ctx.rect(geo.left, geo.top, geo.right - geo.left, geo.h);
  ctx.fillStyle = compact ? "rgba(52, 211, 153, 0.10)" : "rgba(52, 211, 153, 0.14)";
  ctx.fill();
}
function drawTendRefBandLines_(ctx, geo) {
  ctx.strokeStyle = "rgba(52, 211, 153, 0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(geo.left, geo.top);
  ctx.lineTo(geo.right, geo.top);
  ctx.moveTo(geo.left, geo.bottom);
  ctx.lineTo(geo.right, geo.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
}
function createTendRefBandPlugin() {
  return {
    id: "tendRefBand",
    beforeDatasetsDraw: function(chart) {
      var cfg = chart.options && chart.options.plugins && chart.options.plugins.tendRefBand;
      if (!cfg || cfg.display === false) return;
      var geo = resolveTendRefBandGeometry_(chart, cfg);
      if (!geo) return;
      var ctx = chart.ctx;
      var compact = !!cfg.compact;
      ctx.save();
      drawTendRefBandFill_(ctx, geo, compact);
      if (!compact) drawTendRefBandLines_(ctx, geo);
      ctx.restore();
    }
  };
}

// public/js/features/tendencias-ui-detail.mjs
var _tendDetailControlsWired = false;
function ensureTendDetailControlsWired() {
  if (_tendDetailControlsWired || typeof document === "undefined") return;
  var btn = document.getElementById("tend-detail-add-event");
  if (!btn) return;
  _tendDetailControlsWired = true;
  btn.addEventListener("click", function(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    var ctx = tendStore.detailContext;
    var defaultDate = "";
    if (ctx && ctx.setsAsc && tendStore.detailSelectedIndex != null) {
      defaultDate = dayValueFromTrendChartIndex(tendStore.detailSelectedIndex, ctx.setsAsc);
    }
    if (!defaultDate && ctx && ctx.setsAsc && ctx.setsAsc.length) {
      defaultDate = dayValueFromTrendChartIndex(ctx.setsAsc.length - 1, ctx.setsAsc);
    }
    openTendEventComposeModal(defaultDate ? { defaultDate } : void 0);
  });
}
function syncTendDetailEventsLegend(markerMap, labels) {
  var slot = document.getElementById("tend-detail-events-slot");
  if (!slot) return;
  var html = buildTendDetailEventsLegendHtml(markerMap, labels);
  slot.innerHTML = html;
  slot.setAttribute("aria-hidden", html ? "false" : "true");
}
function tendDetailChartOptions(title, unit, markerMap, primaryValues, ref) {
  var yBounds = yScaleBoundsForRef(primaryValues, ref);
  var yScale = {
    ticks: { font: { size: 12 } },
    title: { display: !!unit, text: unit, font: { size: 11 } },
    grace: "5%"
  };
  if (yBounds) {
    yScale.min = yBounds.min;
    yScale.max = yBounds.max;
  }
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    transitions: {
      active: { animation: { duration: 0 } }
    },
    layout: { padding: { right: 12, left: 4, top: 8, bottom: 4 } },
    interaction: { mode: "index", intersect: false, axis: "x" },
    onClick: function(_evt, elements) {
      if (elements && elements.length) {
        tendStore.detailSelectedIndex = elements[0].index;
      }
    },
    plugins: {
      legend: { display: false, position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
      tendRefBand: tendRefBandOptions(ref, false),
      tooltip: {
        enabled: true,
        mode: "index",
        intersect: false,
        position: "nearest",
        callbacks: {
          label: function(ctx) {
            var lab = ctx.dataset && ctx.dataset.label || title;
            var u = ctx.datasetIndex === 0 ? unit : ctx.dataset && ctx.dataset.unit || "";
            var line = lab + ": " + ctx.parsed.y + (u ? " " + u : "");
            if (ctx.datasetIndex === 0) {
              var dlt = formatTendTooltipDelta(primaryValues || ctx.dataset.data, ctx.dataIndex);
              if (dlt) line += " (" + dlt + ")";
            }
            return line;
          },
          afterBody: function(items) {
            if (!items || !items.length || !markerMap) return [];
            return eventTooltipLinesForChartIndex(markerMap, items[0].dataIndex);
          }
        }
      }
    },
    scales: {
      x: { ticks: { font: { size: 12 } }, offset: true },
      y: yScale
    }
  };
}
function updateTendDetailChartInPlace(labels, values, title, ref, latest, unit, markerMap) {
  if (!tendStore.detailChart || !tendStore.detailChart.data || !tendStore.detailChart.data.datasets[0]) return false;
  tendStore.detailChart.data.labels = labels;
  tendStore.detailChart.data.datasets[0].label = title;
  tendStore.detailChart.data.datasets[0].data = values;
  tendStore.detailChart.options = tendDetailChartOptions(title, unit, markerMap, values, ref);
  tendStore.detailChart.update("none");
  syncTendDetailVbar(ref, latest);
  syncTendDetailEventsLegend(markerMap, labels);
  return true;
}
function syncTendDetailVbar(ref, latest) {
  void ref;
  void latest;
  var vbarSlot = document.getElementById("tend-detail-vbar-slot");
  if (!vbarSlot) return;
  vbarSlot.innerHTML = "";
  vbarSlot.setAttribute("aria-hidden", "true");
}
function downsampleTrendChartSeries(labels, values, maxPoints) {
  var slots = maxPoints == null ? TREND_DETAIL_DOWNSAMPLE : maxPoints;
  if (!labels || !labels.length || labels.length <= slots) {
    return { labels: labels || [], values: values || [] };
  }
  var outL = [];
  var outV = [];
  var n = labels.length;
  for (var i = 0; i < slots; i += 1) {
    var idx = Math.round(i * (n - 1) / (slots - 1));
    outL.push(labels[idx]);
    outV.push(values[idx]);
  }
  return { labels: outL, values: outV };
}
function siblingFieldKeys(sectionKey, fieldKey, history) {
  var keys = {};
  (history || []).forEach(function(set) {
    var sec = set && set[sectionKey];
    if (!sec || typeof sec !== "object") return;
    Object.keys(sec).forEach(function(k) {
      if (k !== fieldKey) keys[k] = true;
    });
  });
  return Object.keys(keys).sort();
}
function ensureTendDetailCompareSlot(sectionKey, fieldKey, history, labels, values, title, unit, ref, latest, markerMap) {
  var modal = document.getElementById("tend-detail-modal");
  if (!modal) return;
  var slot = document.getElementById("tend-detail-compare-slot");
  if (!slot) {
    slot = document.createElement("div");
    slot.id = "tend-detail-compare-slot";
    slot.className = "tend-detail-compare-slot";
    var titleEl = document.getElementById("tend-detail-title");
    if (titleEl && titleEl.parentNode) {
      titleEl.parentNode.insertBefore(slot, titleEl.nextSibling);
    }
  }
  var siblings = siblingFieldKeys(sectionKey, fieldKey, history);
  if (!siblings.length) {
    slot.innerHTML = "";
    slot.hidden = true;
    tendStore.detailCompareFieldKey = null;
    return;
  }
  slot.hidden = false;
  var current = tendStore.detailCompareFieldKey;
  if (current && siblings.indexOf(current) < 0) current = null;
  var opts = '<option value="">Sin comparar</option>' + siblings.map(function(k) {
    return '<option value="' + k.replace(/"/g, "&quot;") + '"' + (k === current ? " selected" : "") + ">" + k + "</option>";
  }).join("");
  slot.innerHTML = '<span class="tend-detail-compare-label">Comparar con</span><select class="tend-detail-compare-select" id="tend-detail-compare-select" aria-label="Comparar con otro analito">' + opts + "</select>";
  var sel = document.getElementById("tend-detail-compare-select");
  if (!sel) return;
  sel.onchange = function() {
    tendStore.detailCompareFieldKey = sel.value || null;
    applyTendDetailCompare(sectionKey, fieldKey, history, labels, values, title, unit, ref, latest, markerMap);
  };
  applyTendDetailCompare(sectionKey, fieldKey, history, labels, values, title, unit, ref, latest, markerMap);
}
function applyTendDetailCompare(sectionKey, fieldKey, history, labels, values, title, unit, ref, latest, markerMap) {
  if (!tendStore.detailChart || !tendStore.detailChart.data) return;
  var compareKey = tendStore.detailCompareFieldKey;
  var datasets = [
    {
      label: title,
      data: values,
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.08)",
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: "#10b981",
      tension: 0.3,
      fill: false,
      unit
    }
  ];
  if (compareKey) {
    var setsDesc = dedupeTrendSetsForSeries(
      history.filter(function(s) {
        return getSetTrendValueForSeries(s, sectionKey, compareKey) != null;
      }),
      sectionKey,
      compareKey
    );
    var setsAsc = toTrendAscendingSets(setsDesc);
    var cLabels = buildTendChartLabels(setsAsc);
    var cValues = setsAsc.map(function(s) {
      return getSetTrendValueForSeries(s, sectionKey, compareKey);
    });
    var aligned = alignSeriesToLabels(labels, cLabels, cValues);
    var cParts = tendCardLabelParts(sectionKey, compareKey);
    datasets.push({
      label: cParts.title || compareKey,
      data: aligned,
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.08)",
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: "#3b82f6",
      tension: 0.3,
      fill: false,
      unit: cParts.unit || "",
      spanGaps: true
    });
  }
  tendStore.detailChart.data.datasets = datasets;
  tendStore.detailChart.options = tendDetailChartOptions(title, unit, markerMap, values, ref);
  tendStore.detailChart.options.plugins.legend.display = datasets.length > 1;
  tendStore.detailChart.update("none");
  syncTendDetailVbar(ref, latest);
}
function openTendDetail(sectionKey, fieldKey) {
  void openTendDetailAsync(sectionKey, fieldKey);
}
function openTendDetailAsync(sectionKey, fieldKey) {
  if (!aid() || sectionKey == null || fieldKey == null) return Promise.resolve();
  var history = tendParsedHistoryDesc(aid());
  var setsDesc = dedupeTrendSetsForSeries(
    history.filter(function(s) {
      return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
    }),
    sectionKey,
    fieldKey
  );
  if (setsDesc.length < 2) return Promise.resolve();
  var setsAsc = toTrendAscendingSets(setsDesc);
  var labels = buildTendChartLabels(setsAsc);
  var values = setsAsc.map(function(s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey);
  });
  var sampled = labels.length > TREND_DETAIL_DOWNSAMPLE ? downsampleTrendChartSeries(labels, values, TREND_DETAIL_DOWNSAMPLE) : { labels, values };
  labels = sampled.labels;
  values = sampled.values;
  var labelParts = tendCardLabelParts(sectionKey, fieldKey);
  var title = labelParts.title;
  var unit = labelParts.unit;
  var latestSet = setsDesc.length ? setsDesc[0] : null;
  var latest = latestSet ? getSetTrendValueForSeries(latestSet, sectionKey, fieldKey) : null;
  var ref = tendRefForSeries(history, sectionKey, fieldKey, latestSet);
  var markerMap = buildEventMarkerMapForSets(setsAsc, aid());
  tendStore.detailContext = { setsAsc, markerMap, labels };
  tendStore.detailSelectedIndex = labels.length ? labels.length - 1 : null;
  ensureTendDetailControlsWired();
  document.getElementById("tend-detail-title").textContent = title + (labelParts.unit ? " (" + labelParts.unit + ")" : "");
  ensureTendDetailCompareSlot(sectionKey, fieldKey, history, labels, values, title, unit, ref, latest, markerMap);
  var vbarSlot = document.getElementById("tend-detail-vbar-slot");
  if (vbarSlot) {
    vbarSlot.innerHTML = "";
    vbarSlot.setAttribute("aria-hidden", "true");
  }
  syncTendDetailEventsLegend(markerMap, labels);
  var backdrop = document.getElementById("tend-detail-backdrop");
  if (!backdrop) return;
  cancelOverlayClose(backdrop);
  backdrop.style.display = "flex";
  var canvas = document.getElementById("tend-detail-canvas");
  if (!canvas) {
    backdrop.style.display = "none";
    return Promise.resolve();
  }
  return loadChartJs().then(function(Chart) {
    try {
      if (tendStore.detailChart && tendStore.detailChart.canvas === canvas && updateTendDetailChartInPlace(labels, values, title, ref, latest, unit, markerMap)) {
        return;
      }
      if (tendStore.detailChart) {
        tendStore.detailChart.destroy();
        tendStore.detailChart = null;
      }
      mountTendDetailChart(Chart, canvas, labels, values, title, ref, latest, unit, markerMap);
    } catch (mountErr) {
      console.error("[R+ Tendencias] detail chart mount", mountErr);
      rt.showToast("Gr\xE1fica no disponible (error al dibujar). Recarga la app.", "error");
      backdrop.style.display = "none";
    }
  }).catch(function(err) {
    console.error("[R+ Tendencias] detail chart load", err);
    rt.showToast("Gr\xE1fica no disponible (Chart.js no carg\xF3). Recarga la app.", "error");
    backdrop.style.display = "none";
  });
}
function mountTendDetailChart(Chart, canvas, labels, values, title, ref, latest, unit, markerMap) {
  var datasets = [
    {
      label: title,
      data: values,
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.08)",
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: "#10b981",
      tension: 0.3,
      fill: false
    }
  ];
  var eventPlugin = createTendEventMarkerPlugin(markerMap, { compact: false });
  var refPlugin = createTendRefBandPlugin();
  tendStore.detailChart = new Chart(canvas, {
    type: "line",
    plugins: [refPlugin, eventPlugin],
    data: { labels, datasets },
    options: tendDetailChartOptions(title, unit, markerMap, values, ref)
  });
  syncTendDetailVbar(ref, latest);
  syncTendDetailEventsLegend(markerMap, labels);
}
function closeTendDetail() {
  var backdrop = document.getElementById("tend-detail-backdrop");
  closeOverlayAnimated(backdrop, function() {
    if (backdrop) backdrop.style.display = "none";
    var vbarSlot = document.getElementById("tend-detail-vbar-slot");
    if (vbarSlot) {
      vbarSlot.innerHTML = "";
      vbarSlot.setAttribute("aria-hidden", "true");
    }
    var eventsSlot = document.getElementById("tend-detail-events-slot");
    if (eventsSlot) {
      eventsSlot.innerHTML = "";
      eventsSlot.setAttribute("aria-hidden", "true");
    }
    tendStore.detailContext = null;
    tendStore.detailSelectedIndex = null;
    if (tendStore.detailChart) {
      tendStore.detailChart.destroy();
      tendStore.detailChart = null;
    }
  });
}

// public/js/tend-prefs.mjs
var LS_SERIES_COLORS = "rpc-tend-series-colors";
var LS_GROUP_VISIBLE = "rpc-tend-group-visible";
var LS_GROUP_TABLE_HIDDEN = "rpc-tend-group-table-hidden";
var LS_GROUP_PANEL_ORDER = "rpc-tend-group-panel-order";
var LS_TEND_CARD_ORDER = "rpc-tend-card-order";
var LS_GROUP_PANEL_HIDDEN = "rpc-tend-group-panel-hidden";
var LS_GROUP_PANEL_TITLES = "rpc-tend-group-panel-titles";
var DEFAULT_PANEL_LABELS = {
  gases: "Gasometr\xEDa",
  "percent-diff": "F\xF3rmula leucocitaria (%)",
  "percent-rbc": "\xCDndices eritrocitarios (%)",
  absolute: "Valores absolutos",
  "bh-absolute": "Conteos absolutos celulares",
  "bh-quality": "Calidad eritrocitaria (\xEDndices)",
  "bh-diff": "Diferencial manual",
  "bh-diff-manual": "Diferencial manual",
  "bh-coag": "Coagulaci\xF3n"
};
var DEFAULT_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16"
];
function readJson(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    var o = JSON.parse(raw);
    return o && typeof o === "object" ? o : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_e) {
    void _e;
  }
}
function seriesColorKey(sectionKey, fieldKey) {
  return String(sectionKey) + "|" + String(fieldKey);
}
function readSeriesColor(sectionKey, fieldKey) {
  var map = readJson(LS_SERIES_COLORS, {});
  return map[seriesColorKey(sectionKey, fieldKey)] || null;
}
function writeSeriesColor(sectionKey, fieldKey, hex) {
  var map = readJson(LS_SERIES_COLORS, {});
  map[seriesColorKey(sectionKey, fieldKey)] = String(hex);
  writeJson(LS_SERIES_COLORS, map);
}
function groupKey(patientId, sectionKey) {
  return String(patientId) + "|" + String(sectionKey);
}
function readGroupVisibleFields(patientId, sectionKey) {
  var map = readJson(LS_GROUP_VISIBLE, {});
  var arr = map[groupKey(patientId, sectionKey)];
  return Array.isArray(arr) ? arr.slice() : null;
}
function writeGroupVisibleFields(patientId, sectionKey, fieldKeys) {
  var map = readJson(LS_GROUP_VISIBLE, {});
  map[groupKey(patientId, sectionKey)] = (fieldKeys || []).slice();
  writeJson(LS_GROUP_VISIBLE, map);
}
function readGroupTableHidden(patientId, sectionKey) {
  var map = readJson(LS_GROUP_TABLE_HIDDEN, {});
  var entry = map[groupKey(patientId, sectionKey)];
  if (!entry || typeof entry !== "object") return { rows: [], cols: [] };
  return {
    rows: Array.isArray(entry.rows) ? entry.rows.slice() : [],
    cols: Array.isArray(entry.cols) ? entry.cols.slice() : []
  };
}
function writeGroupTableHidden(patientId, sectionKey, hidden) {
  var map = readJson(LS_GROUP_TABLE_HIDDEN, {});
  map[groupKey(patientId, sectionKey)] = {
    rows: Array.isArray(hidden && hidden.rows) ? hidden.rows.slice() : [],
    cols: Array.isArray(hidden && hidden.cols) ? hidden.cols.slice() : []
  };
  writeJson(LS_GROUP_TABLE_HIDDEN, map);
}
function readGroupPanelOrder(patientId, sectionKey) {
  var map = readJson(LS_GROUP_PANEL_ORDER, {});
  var arr = map[groupKey(patientId, sectionKey)];
  return Array.isArray(arr) ? arr.slice() : null;
}
function writeGroupPanelOrder(patientId, sectionKey, familyKeys) {
  var map = readJson(LS_GROUP_PANEL_ORDER, {});
  map[groupKey(patientId, sectionKey)] = (familyKeys || []).slice();
  writeJson(LS_GROUP_PANEL_ORDER, map);
}
function readTendCardOrder(patientId, sectionKey) {
  var map = readJson(LS_TEND_CARD_ORDER, {});
  var arr = map[groupKey(patientId, sectionKey)];
  return Array.isArray(arr) ? arr.slice() : null;
}
function writeTendCardOrder(patientId, sectionKey, seriesKeys) {
  var map = readJson(LS_TEND_CARD_ORDER, {});
  map[groupKey(patientId, sectionKey)] = (seriesKeys || []).slice();
  writeJson(LS_TEND_CARD_ORDER, map);
}
function readGroupPanelHidden(patientId, sectionKey) {
  var map = readJson(LS_GROUP_PANEL_HIDDEN, {});
  var arr = map[groupKey(patientId, sectionKey)];
  return Array.isArray(arr) ? arr.slice() : [];
}
function readGroupPanelHiddenMigrated(patientId, sectionKey, migrateFn) {
  var raw = readGroupPanelHidden(patientId, sectionKey);
  if (!migrateFn || sectionKey !== "BH") return raw;
  var out = [];
  var seen = /* @__PURE__ */ Object.create(null);
  raw.forEach(function(fam) {
    var m = migrateFn(sectionKey, fam);
    if (!m || seen[m]) return;
    seen[m] = true;
    out.push(m);
  });
  return out;
}
function writeGroupPanelHidden(patientId, sectionKey, familyKeys) {
  var map = readJson(LS_GROUP_PANEL_HIDDEN, {});
  map[groupKey(patientId, sectionKey)] = (familyKeys || []).slice();
  writeJson(LS_GROUP_PANEL_HIDDEN, map);
}
function defaultPanelLabel(familyKey) {
  var fam = String(familyKey || "");
  return DEFAULT_PANEL_LABELS[fam] || fam;
}
function readGroupPanelTitles(patientId, sectionKey) {
  var map = readJson(LS_GROUP_PANEL_TITLES, {});
  var entry = map[groupKey(patientId, sectionKey)];
  if (!entry || typeof entry !== "object") return {};
  return Object.assign({}, entry);
}
function writeGroupPanelTitle(patientId, sectionKey, familyKey, title) {
  var fam = String(familyKey || "");
  var trimmed = String(title || "").trim();
  var map = readJson(LS_GROUP_PANEL_TITLES, {});
  var gk = groupKey(patientId, sectionKey);
  var entry = map[gk] && typeof map[gk] === "object" ? Object.assign({}, map[gk]) : {};
  if (!trimmed || trimmed === defaultPanelLabel(fam)) {
    delete entry[fam];
    if (!Object.keys(entry).length) delete map[gk];
    else map[gk] = entry;
  } else {
    entry[fam] = trimmed;
    map[gk] = entry;
  }
  writeJson(LS_GROUP_PANEL_TITLES, map);
}
function resolvePanelTitle(patientId, sectionKey, familyKey) {
  var fam = String(familyKey || "");
  var custom = readGroupPanelTitles(patientId, sectionKey)[fam];
  if (custom && String(custom).trim()) return String(custom).trim();
  return defaultPanelLabel(fam);
}
function defaultSeriesColor(index) {
  var i = Number(index);
  if (!isFinite(i) || i < 0) i = 0;
  return DEFAULT_COLORS[i % DEFAULT_COLORS.length];
}

// public/js/tend-group-chart-helpers.mjs
var GENERIC_FAMILY_ORDER = ["gases", "percent-diff", "percent-rbc", "absolute"];
function roundAxisBound(n, direction) {
  if (!isFinite(n)) return n;
  var abs = Math.abs(n);
  var step = abs <= 2 ? 0.5 : abs <= 20 ? 1 : abs <= 100 ? 5 : 10;
  if (direction === "up") return Math.ceil(n / step) * step;
  return Math.floor(n / step) * step;
}
function formatAxisTickValue(v) {
  if (!isFinite(v)) return "";
  var r = Math.round(v * 1e3) / 1e3;
  if (Math.abs(r - Math.round(r)) < 1e-6) return String(Math.round(r));
  if (Math.abs(r * 10 - Math.round(r * 10)) < 1e-6) return String(Math.round(r * 10) / 10);
  return String(r);
}
function yScaleBoundsForDatasets(datasets, family) {
  var min = Infinity;
  var max = -Infinity;
  (datasets || []).forEach(function(ds) {
    (ds.data || []).forEach(function(y) {
      if (y != null && isFinite(y)) {
        if (y < min) min = y;
        if (y > max) max = y;
      }
    });
  });
  if (!isFinite(min)) return {};
  var pad = Math.max((max - min) * 0.12, 0.35);
  if (family === "percent-diff" || family === "bh-diff" || family === "bh-diff-manual") {
    return { min: 0, max: Math.min(100, roundAxisBound(max + pad, "up")) };
  }
  if (family === "percent-rbc" || family === "bh-quality") {
    return { min: 0, max: Math.min(60, roundAxisBound(max + pad, "up")) };
  }
  if (min === max) {
    var padEq = Math.abs(min) * 0.12 || 1;
    return {
      min: roundAxisBound(min - padEq, "down"),
      max: roundAxisBound(max + padEq, "up")
    };
  }
  return {
    min: roundAxisBound(min - pad, "down"),
    max: roundAxisBound(max + pad, "up")
  };
}
function visibleDatasetsForChart(chart) {
  if (!chart || !chart.data || !chart.data.datasets) return [];
  return chart.data.datasets.filter(function(_ds, i) {
    return chart.isDatasetVisible(i);
  });
}
function applyChartYScale(chart, family) {
  if (!chart || !chart.options || !chart.options.scales || !chart.options.scales.y) return;
  var visible = visibleDatasetsForChart(chart);
  var y = chart.options.scales.y;
  if (!visible.length) {
    delete y.min;
    delete y.max;
    y.grace = "5%";
    return;
  }
  var bounds = yScaleBoundsForDatasets(visible, family);
  if (bounds.min != null && bounds.max != null) {
    y.min = bounds.min;
    y.max = bounds.max;
    delete y.grace;
  } else {
    delete y.min;
    delete y.max;
    y.grace = "5%";
  }
}
function tendPanelEyeSvg() {
  return '<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}
function orderPanelFamilies(activeFamilies, savedOrder, sectionKey) {
  var baseOrder = familyOrderForSection(sectionKey);
  var rank = /* @__PURE__ */ Object.create(null);
  if (savedOrder && savedOrder.length) {
    savedOrder.forEach(function(fam, i) {
      var migrated = migratePanelFamilyKey(sectionKey, fam);
      rank[migrated] = i;
    });
  }
  var missingBase = (savedOrder && savedOrder.length ? savedOrder.length : baseOrder.length) + 100;
  return activeFamilies.slice().sort(function(a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a) ? rank[a] : missingBase + baseOrder.indexOf(a);
    var rb = Object.prototype.hasOwnProperty.call(rank, b) ? rank[b] : missingBase + baseOrder.indexOf(b);
    if (ra !== rb) return ra - rb;
    var ia = baseOrder.indexOf(a);
    var ib = baseOrder.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
}
function formatTrendDisplayValue(val) {
  if (val == null || !isFinite(val)) return "\u2014";
  if (val !== 0 && Math.abs(val) < 0.1) return val.toFixed(2);
  if (Math.abs(val) < 10 && Math.floor(val) !== val) {
    return String(Math.round(val * 100) / 100);
  }
  return String(val);
}
function colKeyForSet(set) {
  return colKeyForTrendSet(set);
}
function toAscendingHistory(historyDesc) {
  return (historyDesc || []).slice().reverse();
}
function hexToRgba(hex, alpha) {
  var h = String(hex || "").replace("#", "");
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6) return "rgba(16,185,129," + alpha + ")";
  var r = parseInt(h.slice(0, 2), 16);
  var g = parseInt(h.slice(2, 4), 16);
  var b = parseInt(h.slice(4, 6), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

// public/js/tend-group-table-render.mjs
function isAbnormal(deps, set, sectionKey, fieldKey, val, historyDesc) {
  if (val == null || !isFinite(val)) return false;
  var ref = deps.tendRefFromLabSet(set, sectionKey, fieldKey) || deps.tendRefForSeries(historyDesc, sectionKey, fieldKey, set);
  if (!ref) return false;
  return val < ref[0] || val > ref[1];
}
function formatCellValue(val, abnormal) {
  var t = formatTrendDisplayValue(val);
  return abnormal && t !== "\u2014" ? t + "*" : t;
}
function columnHeader(set, columns) {
  return formatTrendColumnHeader(set, columns);
}
function legendLabelForSpec(deps, sectionKey, spec) {
  var unit = deps.tendUnitForSeries(sectionKey, spec.fieldKey);
  return formatTendSeriesLabel(spec.cardTitle || spec.fieldKey, spec.fieldKey, unit).name;
}
function hiddenColLabel(raw, ck) {
  for (var i = 0; i < raw.columns.length; i++) {
    if (colKeyForSet(raw.columns[i]) === ck) {
      return columnHeader(raw.columns[i], raw.columns);
    }
  }
  return ck;
}
function buildHiddenChips(deps, sectionKey, state, hidden, raw) {
  var esc2 = deps.esc;
  var chips = [];
  hidden.cols.forEach(function(ck) {
    chips.push(
      '<button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-col="' + esc2(ck) + '">' + esc2(hiddenColLabel(raw, ck)) + ' <span aria-hidden="true">\xD7</span></button>'
    );
  });
  hidden.rows.forEach(function(fk) {
    var sp = state.specsByField[fk];
    var lab = sp ? legendLabelForSpec(deps, sectionKey, sp) : fk;
    chips.push(
      '<button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-row="' + esc2(fk) + '">' + esc2(lab) + ' <span aria-hidden="true">\xD7</span></button>'
    );
  });
  return chips;
}
function wireHiddenBarActions(bar, ctx) {
  bar.querySelector(".tend-group-hidden-bar-toggle").onclick = function() {
    ctx.state.tableHiddenBarCollapsed = !ctx.state.tableHiddenBarCollapsed;
    renderTableHiddenBar(ctx);
  };
  bar.querySelector(".tend-group-show-all-btn").onclick = function() {
    writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, { rows: [], cols: [] });
    ctx.state.tableHiddenBarCollapsed = false;
    ctx.renderTable(ctx.sectionKey);
  };
  bar.querySelectorAll("[data-restore-col]").forEach(function(btn) {
    btn.onclick = function() {
      var ck = btn.getAttribute("data-restore-col");
      var h = readGroupTableHidden(ctx.state.patientId, ctx.sectionKey);
      h.cols = h.cols.filter(function(c) {
        return c !== ck;
      });
      writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, h);
      ctx.renderTable(ctx.sectionKey);
    };
  });
  bar.querySelectorAll("[data-restore-row]").forEach(function(btn) {
    btn.onclick = function() {
      var fk = btn.getAttribute("data-restore-row");
      var h = readGroupTableHidden(ctx.state.patientId, ctx.sectionKey);
      h.rows = h.rows.filter(function(r) {
        return r !== fk;
      });
      writeGroupTableHidden(ctx.state.patientId, ctx.sectionKey, h);
      ctx.renderTable(ctx.sectionKey);
    };
  });
}
function renderTableHiddenBar(ctx) {
  var wrap = ctx.wrap;
  var sectionKey = ctx.sectionKey;
  var hidden = ctx.hidden;
  var raw = ctx.raw;
  var bar = wrap.querySelector("#tend-group-table-hidden-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "tend-group-table-hidden-bar";
    bar.className = "tend-group-table-hidden-bar";
    wrap.insertBefore(bar, wrap.firstChild);
  }
  var chips = buildHiddenChips(ctx.deps, sectionKey, ctx.state, hidden, raw);
  if (!chips.length) {
    bar.style.display = "none";
    bar.innerHTML = "";
    return;
  }
  var count = hidden.cols.length + hidden.rows.length;
  var collapsed = !!ctx.state.tableHiddenBarCollapsed;
  bar.style.display = "";
  bar.className = "tend-group-table-hidden-bar" + (collapsed ? " is-collapsed" : "");
  bar.innerHTML = '<div class="tend-group-hidden-bar-head"><button type="button" class="tend-group-hidden-bar-toggle" aria-expanded="' + (collapsed ? "false" : "true") + '"><span class="tend-section-chevron" aria-hidden="true">' + (collapsed ? "\u25B6" : "\u25BC") + '</span><span class="tend-group-hidden-label">Ocultos en copia (' + count + ')</span></button><button type="button" class="tend-toolbar-btn tend-group-show-all-btn">Mostrar todo</button></div><div class="tend-group-hidden-bar-body' + (collapsed ? " tend-section-body--collapsed" : "") + '">' + chips.join("") + "</div>";
  wireHiddenBarActions(bar, ctx);
}
function buildTableExportModel(deps, state, sectionKey, rawModel, hidden) {
  var hiddenRows = /* @__PURE__ */ Object.create(null);
  (hidden.rows || []).forEach(function(fk) {
    hiddenRows[fk] = true;
  });
  var hiddenCols = /* @__PURE__ */ Object.create(null);
  (hidden.cols || []).forEach(function(ck) {
    hiddenCols[ck] = true;
  });
  var columns = rawModel.columns.map(function(set) {
    var ck = colKeyForSet(set);
    return {
      header: columnHeader(set, rawModel.columns),
      colKey: ck,
      hidden: !!hiddenCols[ck]
    };
  });
  var rows = rawModel.rows.map(function(row) {
    var cells = rawModel.columns.map(function(set, ci) {
      var val = row.values[ci];
      var ab = isAbnormal(deps, set, sectionKey, row.fieldKey, val, state.historyDesc);
      return { text: formatCellValue(val, ab), abnormal: ab };
    });
    return {
      label: row.label,
      fieldKey: row.fieldKey,
      hidden: !!hiddenRows[row.fieldKey],
      cells
    };
  });
  return { columns, rows };
}
function rowDisplayLabel(deps, sectionKey, state, row) {
  var spRow = state.specsByField[row.fieldKey];
  var rowUnit = deps.tendUnitForSeries(sectionKey, row.fieldKey);
  var rowDisp = spRow ? formatTendSeriesLabel(spRow.cardTitle || row.fieldKey, row.fieldKey, rowUnit) : formatTendSeriesLabel(row.label, row.fieldKey, row.unit || rowUnit);
  return rowDisp.unit && rowDisp.unit !== "%" ? rowDisp.name + " (" + rowDisp.unit + ")" : rowDisp.name;
}
function buildTableHeadHtml(esc2, raw, hidden) {
  var html = ["<thead><tr><th>Analito</th>"];
  raw.columns.forEach(function(set) {
    var ck = colKeyForSet(set);
    var colHidden = hidden.cols.indexOf(ck) >= 0;
    var colLabel = columnHeader(set, raw.columns);
    html.push(
      '<th class="' + (colHidden ? "is-hidden" : "") + '"><label class="tend-group-col-toggle"><input type="checkbox" data-col-key="' + esc2(ck) + '"' + (colHidden ? " checked" : "") + ' aria-label="Ocultar columna"> ' + esc2(colLabel) + "</label></th>"
    );
  });
  html.push("</tr></thead>");
  return html;
}
function buildTableBodyHtml(deps, esc2, sectionKey, state, raw, hidden) {
  var html = ["<tbody>"];
  raw.rows.forEach(function(row) {
    var rowHidden = hidden.rows.indexOf(row.fieldKey) >= 0;
    var rowLabel = rowDisplayLabel(deps, sectionKey, state, row);
    html.push(
      '<tr data-field="' + esc2(row.fieldKey) + '" class="' + (rowHidden ? " tend-group-row--data-hidden" : "") + '"><td><label class="tend-group-row-toggle"><input type="checkbox" data-field-key="' + esc2(row.fieldKey) + '"' + (rowHidden ? " checked" : "") + ' aria-label="Ocultar valores de fila (la fila sigue visible)"> ' + esc2(rowLabel) + "</label></td>"
    );
    raw.columns.forEach(function(set, ci) {
      var ck = colKeyForSet(set);
      var colHidden = hidden.cols.indexOf(ck) >= 0;
      var val = row.values[ci];
      var ab = isAbnormal(deps, set, sectionKey, row.fieldKey, val, state.historyDesc);
      html.push(
        '<td class="' + (colHidden ? "is-hidden" : "") + (ab ? " tend-abnormal" : "") + '">' + esc2(formatCellValue(val, ab)) + "</td>"
      );
    });
    html.push("</tr>");
  });
  html.push("</tbody>");
  return html;
}
function toggleHiddenList(list, key, checked) {
  var idx = list.indexOf(key);
  if (checked) {
    if (idx < 0) list.push(key);
  } else if (idx >= 0) {
    list.splice(idx, 1);
  }
}
function wireTableToggles(wrap, deps, state, sectionKey, renderTable) {
  wrap.querySelectorAll("input[data-col-key]").forEach(function(inp) {
    inp.addEventListener("change", function() {
      var h = readGroupTableHidden(state.patientId, sectionKey);
      toggleHiddenList(h.cols, inp.getAttribute("data-col-key"), inp.checked);
      writeGroupTableHidden(state.patientId, sectionKey, h);
      renderTable(sectionKey);
    });
  });
  wrap.querySelectorAll("input[data-field-key]").forEach(function(inp) {
    inp.addEventListener("change", function() {
      var h = readGroupTableHidden(state.patientId, sectionKey);
      toggleHiddenList(h.rows, inp.getAttribute("data-field-key"), inp.checked);
      writeGroupTableHidden(state.patientId, sectionKey, h);
      renderTable(sectionKey);
    });
  });
}
function renderGroupTable(deps, state, sectionKey, renderTable) {
  var wrap = document.getElementById("tend-group-table-wrap");
  if (!wrap) return;
  var hidden = readGroupTableHidden(state.patientId, sectionKey);
  var allSpecs = Object.keys(state.specsByField).map(function(fk) {
    return state.specsByField[fk];
  });
  var raw = buildSectionTableModel(state.historyAsc, sectionKey, allSpecs, function(set, fieldKey) {
    return getSetTrendValueForSeries(set, sectionKey, fieldKey);
  });
  state.tableModel = buildTableExportModel(deps, state, sectionKey, raw, hidden);
  var esc2 = deps.esc;
  var html = [
    '<div class="cultivos-table-wrap"><table id="tend-group-table" class="cultivos-table tend-group-table">'
  ];
  html = html.concat(buildTableHeadHtml(esc2, raw, hidden));
  html = html.concat(buildTableBodyHtml(deps, esc2, sectionKey, state, raw, hidden));
  html.push("</table></div>");
  wrap.innerHTML = html.join("");
  renderTableHiddenBar({
    wrap,
    sectionKey,
    hidden,
    raw,
    deps,
    state,
    renderTable
  });
  wireTableToggles(wrap, deps, state, sectionKey, renderTable);
}
function createTableExportModel(deps, state, sectionKey, rawModel, hidden) {
  return buildTableExportModel(deps, state, sectionKey, rawModel, hidden);
}
function tableColumnHeader(set, columns) {
  return columnHeader(set, columns);
}
function tableLegendLabelForSpec(deps, sectionKey, spec) {
  return legendLabelForSpec(deps, sectionKey, spec);
}

// public/js/tend-group-table.mjs
function createTendGroupTableApi(deps, state) {
  function renderTable(sectionKey) {
    renderGroupTable(deps, state, sectionKey, renderTable);
  }
  function buildTableExportModel2(sectionKey, rawModel, hidden) {
    return createTableExportModel(deps, state, sectionKey, rawModel, hidden);
  }
  function columnHeader2(set, columns) {
    return tableColumnHeader(set, columns);
  }
  function legendLabelForSpec2(sectionKey, spec) {
    return tableLegendLabelForSpec(deps, sectionKey, spec);
  }
  return { renderTable, buildTableExportModel: buildTableExportModel2, formatCellValue, columnHeader: columnHeader2, legendLabelForSpec: legendLabelForSpec2 };
}

// public/js/tend-group-charts-render.mjs
function destroyCharts(state) {
  state.charts.forEach(function(ch) {
    if (ch) ch.destroy();
  });
  state.charts = [];
}
function syncPanelOrderFromDom(state, sectionKey) {
  var zone = document.getElementById("tend-group-panels-sortable");
  if (!zone) return;
  var order = [];
  zone.querySelectorAll(".tend-group-panel-card[data-panel-family]").forEach(function(el) {
    var fam = el.getAttribute("data-panel-family");
    if (fam) order.push(fam);
  });
  if (order.length) writeGroupPanelOrder(state.patientId, sectionKey, order);
}
function mountPanelSortable(state, sectionKey, panelSortableRef) {
  if (panelSortableRef.current) {
    try {
      if (typeof panelSortableRef.current.destroy === "function") panelSortableRef.current.destroy();
    } catch (_e) {
      void _e;
    }
    panelSortableRef.current = null;
  }
  var SortableCtor = typeof globalThis !== "undefined" ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== "function") return;
  var zone = document.getElementById("tend-group-panels-sortable");
  var panelRoot = document.getElementById("tend-group-panel-charts");
  if (!zone || !panelRoot) return;
  panelSortableRef.current = SortableCtor.create(zone, {
    animation: 200,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    draggable: ".tend-group-panel-card",
    handle: ".tend-group-panel-drag-hint",
    filter: "button, a[href], input, textarea, select, label, canvas, .tend-group-chart-wrap, .tend-group-legend, [contenteditable]",
    preventOnFilter: true,
    delay: 280,
    delayOnTouchOnly: false,
    direction: "vertical",
    forceFallback: true,
    fallbackClass: "tend-group-drag-hovercard",
    fallbackOnBody: true,
    fallbackTolerance: 4,
    swapThreshold: 0.65,
    invertedSwapThreshold: 0.58,
    scroll: panelRoot,
    bubbleScroll: true,
    scrollSensitivity: 54,
    scrollSpeed: 9,
    onEnd: function(evt) {
      if (evt.oldIndex === evt.newIndex && evt.from === evt.to) return;
      syncPanelOrderFromDom(state, sectionKey);
    }
  });
}
function renderPanelsHiddenBar(panelEl, deps, state, sectionKey, hiddenFams, renderCharts) {
  var bar = panelEl.querySelector("#tend-group-panels-hidden-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "tend-group-panels-hidden-bar";
    bar.className = "tend-group-table-hidden-bar tend-group-panels-hidden-bar";
    panelEl.insertBefore(bar, panelEl.firstChild);
  }
  var esc2 = deps.esc;
  if (!hiddenFams.length) {
    bar.style.display = "none";
    bar.innerHTML = "";
    return;
  }
  var chips = hiddenFams.map(function(fam) {
    return '<button type="button" class="tend-hidden-chip tend-group-restore-chip" data-restore-panel="' + esc2(fam) + '">' + esc2(resolvePanelTitle(state.patientId, sectionKey, fam)) + ' <span aria-hidden="true">\xD7</span></button>';
  });
  bar.style.display = "";
  bar.innerHTML = '<span class="tend-group-hidden-label">Paneles ocultos:</span>' + chips.join("") + '<button type="button" class="tend-toolbar-btn tend-group-show-all-btn tend-group-panels-show-all">Mostrar todo</button>';
  bar.querySelector(".tend-group-panels-show-all").onclick = function() {
    writeGroupPanelHidden(state.patientId, sectionKey, []);
    renderCharts(sectionKey);
  };
  bar.querySelectorAll("[data-restore-panel]").forEach(function(btn) {
    btn.onclick = function() {
      var fam = btn.getAttribute("data-restore-panel");
      var h = readGroupPanelHidden(state.patientId, sectionKey).filter(function(f) {
        return f !== fam;
      });
      writeGroupPanelHidden(state.patientId, sectionKey, h);
      renderCharts(sectionKey);
    };
  });
}
function persistLegendVisible(state, sectionKey) {
  var vis = [];
  document.querySelectorAll("#tend-group-backdrop .tend-group-legend-check:checked").forEach(function(cb) {
    var fk = cb.getAttribute("data-field");
    if (fk && vis.indexOf(fk) < 0) vis.push(fk);
  });
  if (vis.length) {
    writeGroupVisibleFields(state.patientId, sectionKey, vis);
    state.visibleFields = vis.slice();
  }
}
function seriesColor(sectionKey, fieldKey, index) {
  return readSeriesColor(sectionKey, fieldKey) || defaultSeriesColor(index);
}
function formatTooltipLine(deps, sectionKey, spec, value) {
  var unit = deps.tendUnitForSeries(sectionKey, spec.fieldKey);
  var parts = formatTendSeriesLabel(spec.cardTitle || spec.fieldKey, spec.fieldKey, unit);
  var valStr = formatTrendDisplayValue(value);
  if (parts.unit === "%") return parts.name + " \xB7 " + valStr + (valStr !== "\u2014" ? " %" : "");
  if (parts.unit) return parts.name + " \xB7 " + valStr + (valStr !== "\u2014" ? " " + parts.unit : "");
  return parts.name + " \xB7 " + valStr;
}
function specHasTrendPoints(state, sectionKey, fieldKey) {
  var raw = state.historyDesc.filter(function(s) {
    return getSetTrendValueForSeries(s, sectionKey, fieldKey) != null;
  });
  return dedupeTrendSetsForSeries(raw, sectionKey, fieldKey).length >= 2;
}
function catalogSpecsForCharts(deps, state, sectionKey) {
  if (sectionKey === "BH") return deps.getCatalogSpecs(sectionKey, state.historyDesc) || [];
  return Object.keys(state.specsByField).map(function(fk) {
    return state.specsByField[fk];
  });
}
function isLegendFieldVisible(state, fieldKey) {
  var saved = readGroupVisibleFields(state.patientId, state.sectionKey);
  if (!saved || !saved.length) return true;
  return saved.indexOf(fieldKey) >= 0;
}
function buildFamiliesMap(deps, state, sectionKey, catalogSpecs) {
  var families = /* @__PURE__ */ Object.create(null);
  catalogSpecs.forEach(function(sp, idx) {
    if (!sp) return;
    var fk = sp.fieldKey;
    var unit = deps.tendUnitForSeries(sectionKey, fk);
    var fam = classifyTendPanelFamily(sectionKey, fk, unit);
    if (!families[fam]) families[fam] = [];
    families[fam].push({ spec: sp, index: idx });
  });
  return families;
}
function resolveActiveFamilies(sectionKey, families) {
  if (sectionKey === "BH") return BH_PANEL_FAMILIES.slice();
  var familyOrder = familyOrderForSection(sectionKey);
  var activeFams = familyOrder.filter(function(fam) {
    return families[fam] && families[fam].length;
  });
  GENERIC_FAMILY_ORDER.forEach(function(fam) {
    if (activeFams.indexOf(fam) >= 0) return;
    if (families[fam] && families[fam].length) activeFams.push(fam);
  });
  return activeFams;
}
function appendEmptyChartsMessage(panelEl) {
  var emptyP = document.createElement("p");
  emptyP.className = "tend-empty";
  emptyP.style.margin = "12px 0";
  emptyP.style.fontSize = "13px";
  emptyP.style.color = "var(--text-muted)";
  emptyP.textContent = "Sin datos para graficar en este estudio.";
  panelEl.appendChild(emptyP);
}
function buildPanelToolbar() {
  var toolbar = document.createElement("div");
  toolbar.className = "patient-card-toolbar tend-group-panel-toolbar";
  toolbar.innerHTML = '<div class="patient-card-toolbar-left"><button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon tend-group-panel-eye" title="Ocultar panel" aria-label="Ocultar panel">' + tendPanelEyeSvg() + '</button></div><span class="tend-group-panel-drag-hint" aria-hidden="true" title="Arrastrar para reordenar">\u22EE\u22EE</span>';
  return toolbar;
}
function wirePanelTitle(titleEl, ctx) {
  var titleDraft = titleEl.textContent;
  titleEl.addEventListener("focus", function() {
    titleDraft = titleEl.textContent;
  });
  titleEl.addEventListener("keydown", function(ev) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      titleEl.blur();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      titleEl.textContent = titleDraft;
      titleEl.blur();
    }
  });
  titleEl.addEventListener("blur", function() {
    var next = (titleEl.textContent || "").replace(/\s+/g, " ").trim();
    if (!next) {
      titleEl.textContent = titleDraft;
      return;
    }
    writeGroupPanelTitle(ctx.state.patientId, ctx.sectionKey, ctx.fam, next);
    titleEl.textContent = resolvePanelTitle(ctx.state.patientId, ctx.sectionKey, ctx.fam);
    titleDraft = titleEl.textContent;
    var hiddenNow = readGroupPanelHiddenMigrated(
      ctx.state.patientId,
      ctx.sectionKey,
      migratePanelFamilyKey
    ).filter(function(f) {
      return ctx.activeFams.indexOf(f) >= 0;
    });
    renderPanelsHiddenBar(ctx.panelEl, ctx.deps, ctx.state, ctx.sectionKey, hiddenNow, ctx.renderCharts);
  });
}
function hidePanelFamily(ctx) {
  var h = readGroupPanelHiddenMigrated(ctx.state.patientId, ctx.sectionKey, migratePanelFamilyKey).slice();
  if (h.indexOf(ctx.fam) < 0) h.push(ctx.fam);
  writeGroupPanelHidden(ctx.state.patientId, ctx.sectionKey, h);
  ctx.renderCharts(ctx.sectionKey);
}
function buildChartYScale(fam, datasets) {
  var yBounds = yScaleBoundsForDatasets(datasets, fam);
  var yScale = {
    ticks: {
      font: { size: 11 },
      callback: function(v) {
        var t = formatAxisTickValue(v);
        if (isPercentPanelFamily(fam)) return t ? t + " %" : "";
        return t;
      }
    }
  };
  if (yBounds.min != null && yBounds.max != null) {
    yScale.min = yBounds.min;
    yScale.max = yBounds.max;
  } else {
    yScale.grace = "5%";
  }
  return yScale;
}
function wireLegendControls(legend, chart, fam, ctx) {
  legend.querySelectorAll(".tend-group-legend-check").forEach(function(inp) {
    inp.addEventListener("change", function() {
      var fk = inp.getAttribute("data-field");
      var dsIdx = chart.data.datasets.findIndex(function(d) {
        return d.fieldKey === fk;
      });
      if (dsIdx < 0) return;
      chart.setDatasetVisibility(dsIdx, inp.checked);
      applyChartYScale(chart, fam);
      chart.update();
      persistLegendVisible(ctx.state, ctx.sectionKey);
    });
  });
  legend.querySelectorAll(".tend-group-legend-color").forEach(function(inp) {
    inp.addEventListener("input", function() {
      var fk = inp.getAttribute("data-field");
      writeSeriesColor(ctx.sectionKey, fk, inp.value);
      var dsIdx = chart.data.datasets.findIndex(function(d) {
        return d.fieldKey === fk;
      });
      if (dsIdx < 0) return;
      chart.data.datasets[dsIdx].borderColor = inp.value;
      chart.data.datasets[dsIdx].pointBackgroundColor = inp.value;
      chart.update("none");
    });
  });
}
function buildPanelDatasets(ctx, items, axisMeta) {
  var datasets = [];
  var legend = document.createElement("div");
  legend.className = "tend-group-legend";
  items.forEach(function(item) {
    var fk = item.spec.fieldKey;
    var label = ctx.legendLabelForSpec(ctx.sectionKey, item.spec);
    var color = seriesColor(ctx.sectionKey, fk, item.index);
    var data = axisMeta.points.map(function(p) {
      var v = getSetTrendValueForSeries(p.set, ctx.sectionKey, fk);
      return v != null && isFinite(v) ? v : null;
    });
    datasets.push({
      label,
      data,
      borderColor: color,
      backgroundColor: hexToRgba(color, 0.12),
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 5,
      pointBackgroundColor: color,
      tension: 0.3,
      fill: false,
      spanGaps: true,
      fieldKey: fk
    });
    var legItem = document.createElement("label");
    legItem.className = "tend-group-legend-item";
    legItem.innerHTML = '<input type="checkbox" class="tend-group-legend-check" data-field="' + fk + '"' + (isLegendFieldVisible(ctx.state, fk) ? " checked" : "") + '> <input type="color" class="tend-group-legend-color" data-field="' + fk + '" value="' + color + '"> <span>' + label + "</span>";
    legend.appendChild(legItem);
  });
  return { datasets, legend };
}
function createPanelChart(canvas, chartLabels, datasets, fam, ctx, markerMap) {
  var yScale = buildChartYScale(fam, datasets);
  var eventPlugin = createTendEventMarkerPlugin(markerMap, { compact: false });
  return new ctx.deps.Chart(canvas, {
    type: "line",
    plugins: [eventPlugin],
    data: { labels: chartLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            title: function(tipItems) {
              var i = tipItems[0] && tipItems[0].dataIndex;
              return i != null && chartLabels[i] != null ? chartLabels[i] : "";
            },
            label: function(tipCtx) {
              var ds = tipCtx.dataset;
              var spec = ctx.state.specsByField[ds.fieldKey];
              if (!spec) return ds.label || "";
              return formatTooltipLine(ctx.deps, ctx.sectionKey, spec, tipCtx.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: { size: 11 },
            autoSkip: true,
            maxTicksLimit: 12
          }
        },
        y: yScale
      }
    }
  });
}
function appendPanelEmptyMessage(block, items) {
  var emptyP = document.createElement("p");
  emptyP.className = "tend-empty";
  emptyP.style.margin = "8px 0 0";
  emptyP.style.fontSize = "13px";
  emptyP.style.color = "var(--text-muted)";
  emptyP.textContent = items.length ? "Sin puntos temporales para este panel." : "Ning\xFAn analito de este panel tiene 2 o m\xE1s laboratorios. Procesa otro BH o activa BH extendida en Resultados.";
  block.appendChild(emptyP);
}
function renderPanelFamilyCard(fam, ctx) {
  var block = document.createElement("section");
  block.className = "tend-group-panel-card tend-group-panel-family patient-card";
  block.setAttribute("data-panel-family", fam);
  var toolbar = buildPanelToolbar();
  block.appendChild(toolbar);
  var titleEl = document.createElement("h3");
  titleEl.className = "tend-group-family-title tend-group-family-title--editable";
  titleEl.setAttribute("contenteditable", "true");
  titleEl.setAttribute("spellcheck", "false");
  titleEl.setAttribute("role", "textbox");
  titleEl.setAttribute(
    "aria-label",
    "T\xEDtulo del panel, editable. Enter para guardar, Esc para cancelar."
  );
  titleEl.textContent = resolvePanelTitle(ctx.state.patientId, ctx.sectionKey, fam);
  var panelCtx = Object.assign({ fam }, ctx);
  wirePanelTitle(titleEl, panelCtx);
  block.appendChild(titleEl);
  toolbar.querySelector(".tend-group-panel-eye").onclick = function(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    hidePanelFamily(panelCtx);
  };
  var chartWrap = document.createElement("div");
  chartWrap.className = "tend-group-chart-wrap";
  var canvas = document.createElement("canvas");
  chartWrap.appendChild(canvas);
  block.appendChild(chartWrap);
  var items = (ctx.families[fam] || []).filter(function(item) {
    return specHasTrendPoints(ctx.state, ctx.sectionKey, item.spec.fieldKey);
  });
  var famFieldKeys = items.map(function(item) {
    return item.spec.fieldKey;
  });
  var colSets = columnSetsForFields(ctx.state.historyAsc, ctx.sectionKey, famFieldKeys);
  if (!colSets.length || !items.length) {
    appendPanelEmptyMessage(block, items);
    ctx.sortZone.appendChild(block);
    return;
  }
  var axisMeta = buildTrendAxisMeta(colSets);
  var chartLabels = axisMeta.labels;
  var markerMap = buildEventMarkerMapForSets(colSets, ctx.state.patientId);
  var built = buildPanelDatasets(ctx, items, axisMeta);
  block.appendChild(built.legend);
  ctx.sortZone.appendChild(block);
  try {
    var chart = createPanelChart(canvas, chartLabels, built.datasets, fam, ctx, markerMap);
    chart._tendFamily = fam;
    chart.data.datasets.forEach(function(ds, dsIdx) {
      chart.setDatasetVisibility(dsIdx, isLegendFieldVisible(ctx.state, ds.fieldKey));
    });
    applyChartYScale(chart, fam);
    chart.update();
    ctx.state.charts.push(chart);
    wireLegendControls(built.legend, chart, fam, ctx);
  } catch (chartErr) {
    console.error("tend-group chart", fam, chartErr);
    chartWrap.innerHTML = '<p class="tend-empty" style="margin:12px 0;font-size:13px;color:var(--error);">No se pudo dibujar este panel.</p>';
  }
}
function renderGroupCharts(deps, state, sectionKey, legendLabelForSpec2, panelSortableRef, renderCharts) {
  var panelEl = document.getElementById("tend-group-panel-charts");
  if (!panelEl) return;
  destroyCharts(state);
  if (panelSortableRef.current) {
    try {
      if (typeof panelSortableRef.current.destroy === "function") panelSortableRef.current.destroy();
    } catch (_e) {
      void _e;
    }
    panelSortableRef.current = null;
  }
  panelEl.innerHTML = "";
  var catalogSpecs = catalogSpecsForCharts(deps, state, sectionKey);
  var families = buildFamiliesMap(deps, state, sectionKey, catalogSpecs);
  var activeFams = resolveActiveFamilies(sectionKey, families);
  if (!activeFams.length) {
    appendEmptyChartsMessage(panelEl);
    renderPanelsHiddenBar(panelEl, deps, state, sectionKey, [], renderCharts);
    return;
  }
  var hiddenFams = readGroupPanelHiddenMigrated(state.patientId, sectionKey, migratePanelFamilyKey).filter(
    function(fam) {
      return activeFams.indexOf(fam) >= 0;
    }
  );
  var orderedFams = orderPanelFamilies(activeFams, readGroupPanelOrder(state.patientId, sectionKey), sectionKey);
  var visibleFams = orderedFams.filter(function(fam) {
    return hiddenFams.indexOf(fam) < 0;
  });
  renderPanelsHiddenBar(panelEl, deps, state, sectionKey, hiddenFams, renderCharts);
  var sortZone = document.createElement("div");
  sortZone.id = "tend-group-panels-sortable";
  sortZone.className = "tend-group-sort-zone patient-sort-zone";
  panelEl.appendChild(sortZone);
  var cardCtx = {
    deps,
    state,
    sectionKey,
    legendLabelForSpec: legendLabelForSpec2,
    panelEl,
    activeFams,
    families,
    sortZone,
    renderCharts
  };
  visibleFams.forEach(function(fam) {
    renderPanelFamilyCard(fam, cardCtx);
  });
  mountPanelSortable(state, sectionKey, panelSortableRef);
}
function destroyGroupCharts(state, panelSortableRef) {
  destroyCharts(state);
  if (panelSortableRef.current) {
    try {
      if (typeof panelSortableRef.current.destroy === "function") panelSortableRef.current.destroy();
    } catch (_e) {
      void _e;
    }
    panelSortableRef.current = null;
  }
}

// public/js/tend-group-charts.mjs
function createTendGroupChartsApi(deps, state, tableApi) {
  var legendLabelForSpec2 = tableApi.legendLabelForSpec;
  var panelSortableRef = { current: null };
  function renderCharts(sectionKey) {
    renderGroupCharts(deps, state, sectionKey, legendLabelForSpec2, panelSortableRef, renderCharts);
  }
  function destroyCharts2() {
    destroyGroupCharts(state, panelSortableRef);
  }
  function destroyPanelSortable() {
    if (panelSortableRef.current) {
      try {
        if (typeof panelSortableRef.current.destroy === "function") panelSortableRef.current.destroy();
      } catch (_e) {
        void _e;
      }
      panelSortableRef.current = null;
    }
  }
  return { renderCharts, destroyCharts: destroyCharts2, destroyPanelSortable };
}

// public/js/tend-group-gaso-dialog.mjs
function ensureGasoExtendedDialog(escHtml, onBackdropClick) {
  var bd = document.getElementById("tend-gaso-ext-backdrop");
  if (bd) return bd;
  bd = document.createElement("div");
  bd.id = "tend-gaso-ext-backdrop";
  bd.className = "tend-gaso-ext-backdrop";
  bd.setAttribute("aria-hidden", "true");
  bd.style.display = "none";
  bd.innerHTML = '<div id="tend-gaso-ext-dialog" class="tend-gaso-ext-dialog" role="dialog" aria-modal="true" aria-labelledby="tend-gaso-ext-title"><div class="tend-gaso-ext-header"><div class="tend-gaso-ext-header-text"><h2 id="tend-gaso-ext-title">' + escHtml("Gasometr\xEDa extendida") + '</h2><p class="tend-gaso-ext-subtitle">' + escHtml("\xDAltimo estudio \xB7 interpretaci\xF3n \xE1cido-base") + '</p></div><div class="tend-gaso-ext-header-actions"><div class="tend-gaso-fio2-chip" role="group" aria-label="Fracci\xF3n inspirada de ox\xEDgeno"><span class="tend-gaso-fio2-chip-label">FiO\u2082</span><input type="number" class="tend-gaso-fio2-input" step="0.01" min="0.08" max="100" inputmode="decimal" aria-label="FiO\u2082 (0.21 o 21)" title="Fracci\xF3n 0.21 o porcentaje 21" /><span class="tend-gaso-fio2-chip-hint">0.21 \xB7 21%</span></div></div></div><div class="tend-gaso-extended-inner"></div></div>';
  bd.addEventListener("click", function(ev) {
    if (ev.target === bd) onBackdropClick();
  });
  document.body.appendChild(bd);
  return bd;
}
function closeGasoExtendedBackdrop() {
  var bd = document.getElementById("tend-gaso-ext-backdrop");
  if (!bd) return;
  document.body.classList.remove("tend-gaso-ext-open");
  closeOverlayAnimated(bd, function() {
    bd.style.display = "none";
  });
}
function showGasoExtendedBackdrop(bd) {
  cancelOverlayClose(bd);
  bd.style.display = "flex";
  bd.setAttribute("aria-hidden", "false");
  document.body.classList.add("tend-gaso-ext-open");
}
function parseFio2Input(raw, fallback) {
  var n = parseFloat(String(raw == null ? "" : raw).replace(",", "."));
  if (!isFinite(n)) return fallback;
  if (n > 3) return Math.min(Math.max(n / 100, 0.08), 1);
  return Math.min(Math.max(n, 0.08), 1);
}
function formatFio2Display(fio2) {
  var asPercent = Math.abs(fio2 * 100 - Math.round(fio2 * 100)) < 1e-6 && fio2 <= 1;
  return asPercent ? String(fio2.toFixed(2)) : String(fio2);
}
function wireGasoExtendedDialog(bd, state, onRerun) {
  var inp = bd.querySelector(".tend-gaso-fio2-input");
  if (!inp || inp._gasoWired) return;
  inp._gasoWired = true;
  inp.value = formatFio2Display(state.gasoExtendedFio2);
  inp.addEventListener("change", onRerun);
  inp.addEventListener("input", onRerun);
}

// public/js/tend-group-gaso.mjs
function isAbgAnalysisHidden2() {
  return true;
}
function defaultEsc(t) {
  return String(t == null ? "" : t);
}
function createTendGroupGasoApi(deps, state) {
  function escHtml(t) {
    return (deps.esc || defaultEsc)(t);
  }
  function closeGasoExtended() {
    closeGasoExtendedBackdrop();
  }
  function rerunGasoSlot(bd) {
    var inp = bd.querySelector(".tend-gaso-fio2-input");
    state.gasoExtendedFio2 = parseFio2Input(inp && inp.value, state.gasoExtendedFio2);
    refillGasoExtendedSlot(
      bd.querySelector(".tend-gaso-extended-inner"),
      state.historyDesc[0],
      state.gasoExtendedFio2,
      escHtml
    );
  }
  function openGasoExtended() {
    if (isAbgAnalysisHidden2()) {
      if (deps.showToast) deps.showToast("El an\xE1lisis de gasometr\xEDa no est\xE1 disponible en R+.", "info");
      return;
    }
    var patientId = deps.getActiveId();
    if (!patientId) return;
    var historyDesc = sortLabHistoryChronological(deps.getHistory() || []);
    if (!historyDesc.length) {
      if (deps.showToast) deps.showToast("Sin laboratorio reciente para gasometr\xEDa.", "warn");
      return;
    }
    state.patientId = patientId;
    state.historyDesc = historyDesc;
    var latest = historyDesc[0];
    var hasGaso = latest && latest.parsedBySection && latest.parsedBySection.GASES && serieNumFromLabSet(latest, "GASES", "pH") != null;
    if (!hasGaso) {
      if (deps.showToast) deps.showToast("No hay gasometr\xEDa en el \xFAltimo estudio.", "warn");
      return;
    }
    var bd = ensureGasoExtendedDialog(escHtml, closeGasoExtended);
    wireGasoExtendedDialog(bd, state, function() {
      rerunGasoSlot(bd);
    });
    refillGasoExtendedSlot(
      bd.querySelector(".tend-gaso-extended-inner"),
      latest,
      state.gasoExtendedFio2,
      escHtml
    );
    showGasoExtendedBackdrop(bd);
  }
  return { openGasoExtended, closeGasoExtended };
}

// public/js/tend-group-modal-open.mjs
function eligibleSpecs(deps, sectionKey, historyDesc) {
  var catalog = deps.getCatalogSpecs(sectionKey, historyDesc) || [];
  return catalog.filter(function(sp) {
    var raw = historyDesc.filter(function(s) {
      return getSetTrendValueForSeries(s, sectionKey, sp.fieldKey) != null;
    });
    return dedupeTrendSetsForSeries(raw, sectionKey, sp.fieldKey).length >= 2;
  });
}
function resolveVisibleFields(patientId, sectionKey, eligible) {
  var saved = readGroupVisibleFields(patientId, sectionKey);
  if (saved && saved.length) {
    var allowed = /* @__PURE__ */ Object.create(null);
    eligible.forEach(function(sp) {
      allowed[sp.fieldKey] = true;
    });
    var filtered = saved.filter(function(fk) {
      return allowed[fk];
    });
    if (filtered.length) return filtered;
  }
  return eligible.map(function(sp) {
    return sp.fieldKey;
  });
}
function hasBhSectionData(historyDesc) {
  return historyDesc.some(function(s) {
    return s.parsedBySection && s.parsedBySection.BH && Object.keys(s.parsedBySection.BH).length;
  });
}
function canOpenTendGroupModal(sectionKey, historyDesc, eligible) {
  if (historyDesc.length < 2) return false;
  if (sectionKey === "BH") {
    return hasBhSectionData(historyDesc) || eligible.length > 0;
  }
  return eligible.length > 0;
}
function prepareTendGroupOpen(deps, state, sectionKey) {
  var patientId = deps.getActiveId();
  if (!patientId || !sectionKey) return null;
  var historyDesc = sortLabHistoryChronological(deps.getHistory() || []);
  var eligible = eligibleSpecs(deps, sectionKey, historyDesc);
  if (!canOpenTendGroupModal(sectionKey, historyDesc, eligible)) return null;
  if (sectionKey === "GASES") state.gasoExtendedFio2 = 0.21;
  state.sectionKey = sectionKey;
  state.patientId = patientId;
  state.historyDesc = historyDesc;
  state.historyAsc = toAscendingHistory(historyDesc);
  state.specsByField = /* @__PURE__ */ Object.create(null);
  var specsForModal = sectionKey === "BH" ? deps.getCatalogSpecs(sectionKey, historyDesc) || [] : eligible;
  specsForModal.forEach(function(sp) {
    state.specsByField[sp.fieldKey] = sp;
  });
  state.visibleFields = resolveVisibleFields(
    patientId,
    sectionKey,
    eligible.length ? eligible : specsForModal
  );
  return { sectionKey, specsForModal };
}
function setTendGroupTab(state, name) {
  state.activeTab = name === "table" ? "table" : "charts";
  var chartsPanel = document.getElementById("tend-group-panel-charts");
  var tablePanel = document.getElementById("tend-group-panel-table");
  var tabs = document.querySelectorAll("#tend-group-backdrop .tend-group-tab");
  tabs.forEach(function(btn) {
    var on = btn.getAttribute("data-tab") === state.activeTab;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  if (chartsPanel) chartsPanel.hidden = state.activeTab !== "charts";
  if (tablePanel) tablePanel.hidden = state.activeTab !== "table";
  var track = document.getElementById("tend-group-tabs-track");
  if (track) track.setAttribute("data-active", state.activeTab);
}
function showTendGroupBackdrop(deps, state, activeTab) {
  var titleEl = document.getElementById("tend-group-title");
  if (titleEl) {
    titleEl.textContent = (deps.getSectionLabel(state.sectionKey) || state.sectionKey) + " \u2014 Gr\xE1fica del estudio";
  }
  var bd = document.getElementById("tend-group-backdrop");
  if (!bd) return null;
  cancelOverlayClose(bd);
  bd.style.display = "flex";
  bd.setAttribute("aria-hidden", "false");
  document.body.classList.add("tend-group-modal-open");
  return { backdrop: bd, activeTab: activeTab || "charts" };
}
function renderTendGroupPanels(sectionKey, renderCharts, renderTable) {
  try {
    renderCharts(sectionKey);
  } catch (e) {
    console.error("tend-group renderCharts", e);
    var panelErr = document.getElementById("tend-group-panel-charts");
    if (panelErr) {
      panelErr.innerHTML = '<p class="tend-empty">No se pudieron cargar las gr\xE1ficas. Recarga la app e intenta de nuevo.</p>';
    }
  }
  try {
    renderTable(sectionKey);
  } catch (e) {
    console.error("tend-group renderTable", e);
  }
}
function copyTendGroupTablePng(deps, state) {
  if (!state.tableModel) {
    if (deps.showToast) deps.showToast("No hay tabla para copiar", "error");
    return;
  }
  var visibleCols = state.tableModel.columns.filter(function(c) {
    return !c.hidden;
  });
  var visibleRows = state.tableModel.rows.filter(function(r) {
    return !r.hidden;
  });
  if (!visibleCols.length || !visibleRows.length) {
    if (deps.showToast) deps.showToast("Muestra al menos una fila y una columna", "error");
    return;
  }
  var title = (deps.getSectionLabel(state.sectionKey) || state.sectionKey || "Tabla") + " \u2014 Tendencias";
  copyTableModelAsPng(state.tableModel, title, function(ok) {
    if (deps.showToast) {
      deps.showToast(ok ? "Tabla copiada como imagen \u2713" : "No se pudo copiar la imagen", ok ? "success" : "error");
    }
  });
}
function copyTendGroupTableText(deps, state) {
  if (!state.tableModel) return;
  copyTableText(buildTableTsv(state.tableModel), function(ok) {
    if (deps.showToast) {
      deps.showToast(ok ? "Tabla copiada al portapapeles" : "No se pudo copiar el texto", ok ? "success" : "error");
    }
  });
}

// public/js/tend-group-modal.mjs
function createTendGroupModal(deps) {
  var state = {
    sectionKey: null,
    patientId: null,
    charts: [],
    tableModel: null,
    activeTab: "charts",
    tableHiddenBarCollapsed: false,
    historyDesc: [],
    historyAsc: [],
    visibleFields: [],
    specsByField: /* @__PURE__ */ Object.create(null),
    gasoExtendedFio2: 0.21
  };
  var tableApi = createTendGroupTableApi(deps, state);
  var chartsApi = createTendGroupChartsApi(deps, state, tableApi);
  var gasoApi = createTendGroupGasoApi(deps, state);
  var renderCharts = chartsApi.renderCharts;
  var renderTable = tableApi.renderTable;
  var destroyCharts2 = chartsApi.destroyCharts;
  var destroyPanelSortable = chartsApi.destroyPanelSortable;
  var closeGasoExtended = gasoApi.closeGasoExtended;
  var openGasoExtended = gasoApi.openGasoExtended;
  function backdropEl() {
    return document.getElementById("tend-group-backdrop");
  }
  function isOpen() {
    var bd = backdropEl();
    return !!(bd && bd.getAttribute("aria-hidden") === "false");
  }
  function closeModal2() {
    destroyPanelSortable();
    state.sectionKey = null;
    document.body.classList.remove("tend-group-modal-open");
    var bd = backdropEl();
    closeOverlayAnimated(bd, function() {
      if (bd) bd.style.display = "none";
      destroyCharts2();
      var chartsPanel = document.getElementById("tend-group-panel-charts");
      if (chartsPanel) chartsPanel.innerHTML = "";
      var wrap = document.getElementById("tend-group-table-wrap");
      if (wrap) wrap.innerHTML = "";
    });
  }
  function setTab(name) {
    setTendGroupTab(state, name);
  }
  function openModal(sectionKey) {
    if (!prepareTendGroupOpen(deps, state, sectionKey)) return;
    var shown = showTendGroupBackdrop(deps, state, state.activeTab || "charts");
    if (!shown) return;
    setTab(shown.activeTab);
    renderTendGroupPanels(sectionKey, renderCharts, renderTable);
  }
  return {
    open: openModal,
    close: closeModal2,
    isOpen,
    setTab,
    copyTablePng: function() {
      copyTendGroupTablePng(deps, state);
    },
    copyTableText: function() {
      copyTendGroupTableText(deps, state);
    },
    openGasoExtended,
    closeGasoExtended
  };
}

// public/js/tour-targets.mjs
var ACTION_STEPS = /* @__PURE__ */ new Set([
  "lab_parse",
  "ic_nota",
  "ic_indica",
  "estado_actual_registro",
  "servicio_default",
  "gv7_guardia_toggle",
  "gv7_lan_wifi",
  "gv7_mobile_link",
  "livesync_desktop"
]);
var TARGETS = {
  map_sidebar: {
    appTab: null,
    selector: "aside",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  map_tabs: {
    appTab: null,
    selector: "#app-main-tablist",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  map_add_patient: {
    appTab: null,
    selector: "aside .btn-add",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  map_incomplete: {
    appTab: null,
    selector: "#m-cuarto, #m-cama, #m-servicio",
    focus: false,
    spotlightClass: "tour-spotlight-action",
    openAddModalFullManual: true
  },
  map_lab_teaser: {
    appTab: "lab",
    selector: "#lab-input",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  lab_bulk_separator: {
    appTab: "lab",
    selector: "#btn-lab-patient-separator, #lab-input",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  servicio_default: {
    appTab: null,
    selector: "#settings-default-servicio",
    focus: true,
    openProfile: true
  },
  lab_parse: { appTab: "lab", selector: "#btn-procesar, #lab-input", focus: false },
  lab_view: { appTab: "lab", selector: "#lab-output-section", focus: false },
  ic_expediente_tabs: {
    appTab: "nota",
    selector: ".inner-tab-bar",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  sala_expediente_tabs: {
    appTab: "nota",
    selector: ".inner-tab-bar",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  eventualidades: {
    appTab: "nota",
    innerTab: "eventualidades",
    selector: "#exp-segment-eventualidades, #itab-content-eventualidades",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  sala_tend: { appTab: "lab", labInner: "tend", selector: "#lab-inner-tend-mount, #tendencias-container", focus: false },
  sala_tend_chart: {
    appTab: "lab",
    labInner: "tend",
    selector: "#tendencias-container .tend-section-chart-btn",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  estado_actual: {
    appTab: "nota",
    innerTab: "estadoActual",
    selector: "#ea-snapshot, #ea-charts-summary, #ea-historial",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  estado_actual_registro: {
    appTab: "nota",
    innerTab: "estadoActual",
    selector: "#ea-registro-backdrop.open .ea-vitals-grid, #ea-registro-backdrop.open .ea-glu-section, #ea-registro-backdrop.open .ea-io-grid",
    focus: false,
    spotlightClass: "tour-spotlight-action",
    openEaRegistro: true
  },
  estado_actual_review: {
    appTab: "nota",
    innerTab: "estadoActual",
    selector: "#ea-snapshot, #ea-charts-summary, #ea-historial, .ea-estado-clinico",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  sala_med: { appTab: "med", selector: "#med-import-open-btn", focus: false },
  listado_problemas: {
    appTab: "nota",
    innerTab: "listado",
    selector: "#listado-form, #exp-segment-listado, #btn-gen-listado",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  sala_vpo: {
    appTab: "nota",
    innerTab: "vpo",
    selector: "#exp-segment-vpo-salida, #vpo-container, .vpo-panel",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  sala_receta_hu: {
    appTab: "nota",
    innerTab: "recetaHu",
    selector: "#exp-segment-recetaHu, #receta-hu-container, #btn-receta-hu-export",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  sala_agenda: {
    appTab: "agenda",
    selector: "#apptab-agenda, #appcontent-agenda .rpc-proc-agenda-root",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  ic_nota: {
    appTab: "nota",
    innerTab: "notas",
    selector: "#btn-gen",
    focus: false,
    spotlightClass: "tour-spotlight-soap"
  },
  ic_indica: {
    appTab: "nota",
    innerTab: "indica",
    selector: "#btn-gen-ind",
    focus: false,
    spotlightClass: "tour-spotlight-soap"
  },
  ic_exports: {
    appTab: null,
    selector: "#settings-dropdown",
    focus: false,
    openSettings: true
  },
  profile: {
    appTab: null,
    selector: "#profile-modal .modal",
    focus: false,
    openProfile: true
  },
  wrap: { appTab: null, selector: "aside .sidebar-header", focus: false },
  quick_wrap: { appTab: null, selector: "#btn-open-learn, aside .sidebar-header", focus: false },
  livesync_desktop: {
    appTab: null,
    selector: "#btn-header-team-sync, #connection-dropdown",
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  livesync_mobile: { appTab: null, selector: "#connection-dropdown", focus: false, openConnection: true },
  gv7_guardia_chip: {
    appTab: null,
    selector: "#header-mode-seg",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_guardia_tab: {
    appTab: null,
    selector: "#appcontent-guardia",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_guardia_scope: {
    appTab: null,
    selector: "#guardia-census-scope, #clinical-context-bar",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_trust_strip: {
    appTab: null,
    selector: "#guardia-trust-strip",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_guardia_toggle: {
    appTab: null,
    selector: "#btn-guardia-mode-toggle",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_guardia_exit: {
    appTab: null,
    selector: "#header-mode-seg",
    focus: false,
    exitGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_entrega_phase: {
    appTab: null,
    selector: "#btn-guardia-entrega-phase",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_entrega_patient: {
    appTab: null,
    selector: "#guardia-census-grid, #guardia-incoming-strip",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_entrega_roster: {
    appTab: null,
    selector: "#entrega-roster-panel",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_entrega_pendientes: {
    appTab: null,
    selector: "#entrega-modal, #entrega-handoff-panel",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_fin_turno: {
    appTab: null,
    selector: "#guardia-phase-bar, #guardia-btn-finalizar-turno",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_lan_wifi: {
    appTab: null,
    selector: "#btn-header-team-sync, #connection-dropdown",
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_lan_directorio: {
    appTab: null,
    selector: '[data-cloud-view="equipo"] .clinical-teams-section--directory, #connection-dropdown',
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_lan_rotacion: {
    appTab: null,
    selector: '[data-cloud-view="equipo"] .cloud-sync-equipo-embed, [data-cloud-equipo-host], #connection-dropdown',
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_rotacion_rejoin: {
    appTab: null,
    selector: '[data-cloud-view="equipo"] .clinical-teams-section--rotation, #connection-dropdown',
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_inherit_patients: {
    appTab: null,
    selector: '[data-cloud-view="equipo"] .clinical-teams-inherit-btn, #connection-dropdown',
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_mobile_link: {
    appTab: null,
    selector: '[data-cloud-view="mobile"] .cloud-mobile-invite-host, .cloud-mobile-invite-qr-host, [data-cloud-mobile-invite-host]',
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_mobile_scope: {
    appTab: null,
    selector: '[data-cloud-view="mobile"] .cloud-mobile-invite-qr-host, .cloud-sync-mobile-invite-host, .lan-invite-collapsible--mobile',
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_mobile_vs_sala: {
    appTab: null,
    selector: '[data-cloud-view="mobile"] .cloud-mobile-invite-host, [data-cloud-mobile-invite-host], #connection-dropdown',
    focus: false,
    openConnection: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_censo_r1: {
    appTab: null,
    selector: "#patient-sidebar, #patient-list",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_censo_r4: {
    appTab: null,
    selector: ".r4-section-divider, #guardia-census-head",
    focus: false,
    openGuardiaDensity: true,
    spotlightClass: "tour-spotlight-action"
  },
  gv7_censo_sync: {
    appTab: null,
    selector: "#btn-header-team-sync, #lan-connection-banner",
    focus: false,
    spotlightClass: "tour-spotlight-action"
  }
};
function getSalaTourSteps2() {
  return getSalaTourSteps();
}
function getInterconsultaTourSteps2() {
  return getInterconsultaTourSteps();
}
function getGuardiaV7TourSteps2() {
  return getGuardiaV7TourSteps();
}
function getQuickRouteTourSteps2() {
  return getQuickRouteTourSteps();
}
function getTourSteps(branch) {
  if (branch === "interconsulta") return getInterconsultaTourSteps2();
  if (branch === "guardia-v7") return getGuardiaV7TourSteps2();
  if (branch === "quick-route") return getQuickRouteTourSteps2();
  return getSalaTourSteps2();
}
function stepRequiresUserAction(stepId) {
  return ACTION_STEPS.has(stepId);
}
function getTourTarget(stepId, _branch) {
  const t = TARGETS[stepId];
  if (!t) return { appTab: null, selector: null, focus: false };
  return Object.assign({}, t);
}

// public/js/features/settings-help/tour-flow-guardia-copy.mjs
var rt2 = getSettingsHelpRuntime();
var MOBILE_SCOPE_COPY = "La app m\xF3vil (iPad/Safari) muestra tablero de guardia y expediente esencial; no incluye Ajustes, exportaciones Word ni todas las pesta\xF1as de escritorio.";
var LIVESYNC_BTN_COPY = "<strong>R+ Cloud</strong> (icono <strong>\u21C4</strong> / Wi\u2011Fi junto a Ajustes)";
function getClinicalRankForTour() {
  try {
    const st = rt2.getSettings();
    return String(st?.clinicalRank || "R1").trim().toUpperCase();
  } catch {
    return "R1";
  }
}
var GV7_HELP_ARTICLE = {
  gv7_guardia_chip: "modo-guardia",
  gv7_guardia_tab: "modo-guardia",
  gv7_guardia_scope: "modo-guardia",
  gv7_trust_strip: "modo-guardia",
  gv7_guardia_toggle: "modo-guardia",
  gv7_guardia_exit: "modo-guardia",
  gv7_censo_r1: "modo-guardia",
  gv7_censo_r4: "modo-guardia",
  gv7_censo_sync: "modo-guardia",
  gv7_entrega_phase: "modo-entrega",
  gv7_entrega_patient: "modo-entrega",
  gv7_entrega_roster: "modo-entrega",
  gv7_entrega_pendientes: "modo-entrega",
  gv7_fin_turno: "modo-entrega",
  gv7_lan_wifi: "nube-conexion-turno",
  gv7_lan_directorio: "nube-conexion-turno",
  gv7_lan_rotacion: "rotacion-equipos",
  gv7_rotacion_rejoin: "rotacion-equipos",
  gv7_inherit_patients: "rotacion-equipos",
  gv7_mobile_link: "nube-conexion-turno",
  gv7_mobile_scope: "nube-conexion-turno",
  gv7_mobile_vs_sala: "nube-conexion-turno"
};
var GV7_ACTION_HINT = {
  gv7_guardia_toggle: '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el bot\xF3n resaltado; aparece <strong>Siguiente</strong> al activar el filtro.</p>',
  gv7_lan_wifi: '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el icono <strong>\u21C4</strong> de Conexi\xF3n / R+ Cloud para continuar.</p>',
  gv7_mobile_link: '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El tutorial abre <strong>iPad / R+ M\xF3vil</strong> en Conexi\xF3n. Copia el enlace o escanea el QR.</p>'
};
function buildGv7CensoR1Copy(rank) {
  if (rank === "R4") {
    return '<p style="margin:0;line-height:1.5;">Como <strong>R4</strong>, el censo lateral puede mostrar toda la sala. En el siguiente paso ver\xE1s la grilla agrupada por equipo.</p>';
  }
  if (rank === "R1") {
    return '<p style="margin:0;line-height:1.5;">Como <strong>R1</strong>, el censo lateral lista pacientes de <strong>tu equipo</strong>. En guardia, <strong>Censo: solo entregados</strong> puede acotar a\xFAn m\xE1s.</p>';
  }
  return '<p style="margin:0;line-height:1.5;">Seg\xFAn tu rango (<strong>' + escapeTourHtml(rank) + "</strong>), el censo lateral muestra tu equipo o un subconjunto de la sala.</p>";
}
function buildGv7CensoR4Copy(rank) {
  if (rank === "R4") {
    return '<p style="margin:0;line-height:1.5;">En la grilla de guardia, los <strong>divisores por equipo</strong> organizan el censo de la sala. Los <strong>Filtros censo</strong> (arriba) acotan por sala.</p>';
  }
  return '<p style="margin:0;line-height:1.5;">En rangos <strong>R1\u2013R3</strong> la grilla se acota a tu equipo. Los divisores por equipo en la grilla son propios de <strong>R4</strong>.</p>';
}
function getGuardiaV7StepBody(stepId) {
  const rank = getClinicalRankForTour();
  const bodies = {
    gv7_guardia_chip: '<p style="margin:0;line-height:1.5;">El bot\xF3n <strong>Guardia</strong> en la barra superior abre el tablero de turno: censo, entrega y monitoreo. No bloquea el resto de R+.</p>',
    gv7_guardia_tab: '<p style="margin:0;line-height:1.5;">En <strong>Modo Guardia</strong> el centro muestra el panel de guardia: fases del turno, m\xE9tricas y grilla de pacientes.</p>',
    gv7_guardia_scope: '<p style="margin:0;line-height:1.5;">La <strong>barra de contexto</strong> resume sala y fase del turno. Qui\xE9n ves en el censo depende de tu rango \u2014 lo revisamos en el m\xF3dulo <strong>Censo y alcance</strong>.</p>',
    gv7_trust_strip: '<p style="margin:0;line-height:1.5;">La franja <strong>Nube \xB7 sala \xB7 equipo</strong> confirma de un vistazo que est\xE1s sincronizado y en el equipo correcto. Si dice <strong>Sin Nube</strong>, abre \u21C4 Conexi\xF3n antes de confiar en el censo compartido.</p>',
    gv7_guardia_toggle: '<p style="margin:0;line-height:1.5;"><strong>Censo: solo entregados</strong> filtra la grilla a pacientes que te entregaron en este turno, sin cambiar el modo Entrega.</p>',
    gv7_guardia_exit: '<p style="margin:0;line-height:1.5;">Pulsa de nuevo <strong>Guardia</strong> para volver a la vista Normal (Paciente, Laboratorio, etc.).</p>',
    gv7_entrega_phase: '<p style="margin:0;line-height:1.5;">Pulsa <strong>Entrega</strong> en la barra del censo para abrir el listado de handoff por paciente antes del turno activo.</p>',
    gv7_entrega_patient: '<p style="margin:0;line-height:1.5;">En cada paciente, <strong>Entrega</strong> documenta handoff, equipo entrante y pendientes. La grilla resalta cr\xEDticos y entrantes.</p>',
    gv7_entrega_roster: '<p style="margin:0;line-height:1.5;">El <strong>roster de entrega</strong> lista pacientes pendientes de documentar antes de pasar al turno activo.</p>',
    gv7_entrega_pendientes: '<p style="margin:0;line-height:1.5;"><strong>Pendientes de entrega</strong>: plantillas por servicio, handoff estructurado y seguimiento entre turnos.</p>',
    gv7_fin_turno: '<p style="margin:0;line-height:1.5;">Al <strong>finalizar turno</strong>, R+ agrupa pendientes abiertos por equipo de origen para enviar handoff diurno y liberar cobertura. No borra pendientes si cierras sin enviar.</p>',
    gv7_lan_wifi: '<p style="margin:0;line-height:1.5;">' + LIVESYNC_BTN_COPY + ": cuenta, sala y sincronizaci\xF3n del turno por Nube (sin Mac anfitri\xF3n ni escaneo de red local).</p>",
    gv7_lan_directorio: '<p style="margin:0;line-height:1.5;">El <strong>directorio de usuarios</strong> en <strong>\u21C4 Conexi\xF3n \u2192 Opciones \u2192 Equipo</strong> muestra qui\xE9n est\xE1 en la sala. Los cambios de equipos se sincronizan por R+ Cloud.</p>',
    gv7_lan_rotacion: '<p style="margin:0;line-height:1.5;"><strong>Equipo</strong> en \u21C4 Conexi\xF3n (<strong>Opciones \u2192 Equipo</strong>): @usuario, equipos persistentes, sala y entregas. Distinto del censo del sidebar.</p>',
    gv7_rotacion_rejoin: '<p style="margin:0;line-height:1.5;">Cada mes, R+ puede mostrar <strong>Nueva rotaci\xF3n</strong>: confirma tu sala y vuelve a unirte a tu equipo en <strong>\u21C4 \u2192 Opciones \u2192 Equipo</strong>. Los equipos anteriores se archivan; el censo se actualiza por Nube.</p>',
    gv7_inherit_patients: '<p style="margin:0;line-height:1.5;">Al unirte a un equipo nuevo, el asistente <strong>Heredar pacientes</strong> te deja traer casos de tu equipo anterior (misma sala/ciclo) sin reasignar uno por uno.</p>',
    gv7_mobile_link: '<p style="margin:0;line-height:1.5;">Copia el <strong>enlace o QR de R+ M\xF3vil</strong> desde <strong>\u21C4 Conexi\xF3n \u2192 Opciones \u2192 iPad / R+ M\xF3vil</strong>. \xC1brelo en Safari e inicia sesi\xF3n con tu cuenta Nube.</p>',
    gv7_mobile_scope: '<p style="margin:0;line-height:1.5;">' + MOBILE_SCOPE_COPY + "</p>",
    gv7_mobile_vs_sala: '<p style="margin:0;line-height:1.5;">En R+ Cloud, <strong>iPad/m\xF3vil</strong> (sesi\xF3n Nube) y el <strong>escritorio</strong> comparten la misma sala; el enlace o QR de \u21C4 Conexi\xF3n basta para unirse.</p>',
    gv7_censo_r1: buildGv7CensoR1Copy(rank),
    gv7_censo_r4: buildGv7CensoR4Copy(rank),
    gv7_censo_sync: '<p style="margin:0;line-height:1.5;">La sincronizaci\xF3n por R+ Cloud es discreta: avisos en el encabezado; equipos y censo se actualizan en segundo plano. Si el censo est\xE1 vac\xEDo, revisa la franja Nube/sala/equipo o abre <strong>\u21C4 \u2192 Opciones \u2192 Equipo</strong> tras rotar.</p>'
  };
  return bodies[stepId] || '<p style="margin:0;line-height:1.5;">Sigue el resaltado en pantalla.</p>';
}
function getGuardiaV7StepHtml(stepId) {
  let base = getGuardiaV7StepBody(stepId);
  if (GV7_ACTION_HINT[stepId] && stepRequiresUserAction(stepId)) {
    base += GV7_ACTION_HINT[stepId];
  }
  const articleId = GV7_HELP_ARTICLE[stepId];
  if (!articleId) return base;
  return base + `<p style="margin:10px 0 0;"><button type="button" class="help-tour-btn" onclick="openQuickHelp('` + articleId + `')">M\xE1s en ayuda</button></p>`;
}
function escapeTourHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// public/js/tour-demo-monitoreo-historial.mjs
function buildTourMonitoreoHistorialEntries(now) {
  const dayMs = 24 * 60 * 60 * 1e3;
  const historial = [];
  function pushEntry(d, payload) {
    historial.push({
      id: "tour-ea-" + historial.length,
      recordedAt: d.toISOString(),
      vitals: payload.vitals || {},
      glucometrias: payload.glucometrias || [],
      io: payload.io || {}
    });
  }
  function atDayOffset(dayOff, hour, minute, payload) {
    const d = new Date(now.getTime() - dayOff * dayMs);
    d.setHours(hour, minute, 0, 0);
    pushEntry(d, payload);
  }
  function atToday(hour, minute, payload) {
    atDayOffset(0, hour, minute, payload);
  }
  atToday(8, 0, {
    vitals: { tas: 130, tad: 80, fc: 94, fr: 22, temp: 37, sat: 96 },
    glucometrias: [{ value: 144, time: "08:00" }],
    io: { ing: 1010, egr: 100, evac: "NO" }
  });
  atToday(16, 0, {
    vitals: { tas: 130, tad: 70, fc: 126, fr: 19, temp: 37.8, sat: 95 },
    glucometrias: [{ value: 176, time: "16:00" }],
    io: { ing: 410, egr: 2e3, evac: "NO" }
  });
  atToday(23, 45, {
    vitals: { tas: 130, tad: 80, fc: 125, fr: 17, temp: 38.4, sat: 94 },
    glucometrias: [{ value: 159, time: "23:45" }],
    io: { ing: 769, egr: 1600, evac: "NO" }
  });
  const win = getGlucometriaRegistroWindow(now);
  atDayOffset(1, 9, 5, {
    vitals: { tas: 126, tad: 76, fc: 90, fr: 19, temp: 36.9, sat: 95 },
    glucometrias: [
      { value: 138, time: "09:05" },
      { value: 142, time: "09:12" }
    ],
    io: { ing: 200, egr: 140 }
  });
  atDayOffset(1, 14, 30, {
    vitals: { tas: 120, tad: 70, fc: 86, fr: 18, temp: 36.7, sat: 96 },
    glucometrias: [{ value: 152, time: "14:30" }],
    io: { ing: 300, egr: 220 }
  });
  atDayOffset(2, 7, 0, {
    vitals: { tas: 132, tad: 80, fc: 94, fr: 21, temp: 37.2, sat: 93 },
    io: { ing: 190, egr: 130 }
  });
  atDayOffset(2, 15, 0, {
    vitals: { tas: 126, tad: 76, fc: 88, fr: 19, temp: 36.9, sat: 95 },
    io: { ing: 250, egr: 180 }
  });
  if (win && win.end) {
    const anchor = new Date(win.end.getTime());
    if (anchor.getTime() <= now.getTime()) {
      pushEntry(anchor, {
        vitals: { tas: 118, tad: 72, fc: 88, fr: 18, temp: 36.8, sat: 96 },
        glucometrias: [{ value: 155, time: "00:00" }],
        io: { ing: 180, egr: 120 }
      });
    }
  }
  return historial;
}
function buildTourMonitoreoEstadoClinico(now) {
  const fechaLabel = String(now.getDate()).padStart(2, "0") + "/" + String(now.getMonth() + 1).padStart(2, "0") + "/" + now.getFullYear();
  return {
    estadoClinico: {
      four: "4",
      esferas: "3",
      analgesia: "Paracetamol 1 g IV c/8h",
      abx: "Cefepime 1 g IV c/8h (d\xEDa 2)",
      antihta: "Losart\xE1n 50 mg VO",
      vasop: "No",
      soporte: "O2 nasal 2 L/min",
      tempContext: "Febr\xEDcula en turno de noche",
      dieta: "Dieta renal",
      kcalKg: "25",
      kcal: "1750",
      pesoRef: "70"
    },
    confirmado: { analgesia: true, abx: true, antihta: false, vasop: false },
    pendienteReceta: {
      four: "",
      esferas: "",
      analgesia: "",
      abx: "",
      antihta: "",
      vasop: "",
      soporte: "",
      tempContext: "",
      dieta: "",
      kcalKg: "",
      kcal: "",
      pesoRef: ""
    },
    textoGuardado: {
      text: "Monitoreo del " + fechaLabel + ": glucometr\xEDas 144\u2192176\u2192159 mg/dL; pico febril 38.4 \xB0C con taquicardia; balance h\xEDdrico con diuresis aumentada en TV/TN (ver gr\xE1ficas).",
      savedAt: now.toISOString()
    }
  };
}

// public/js/tour-demo-monitoreo.mjs
function buildTourMonitoreoHistorial(ref) {
  const now = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const shell = buildTourMonitoreoEstadoClinico(now);
  return {
    ...shell,
    historial: buildTourMonitoreoHistorialEntries(now)
  };
}
function getTourRegistroFormSample() {
  return {
    ok: true,
    vitals: { tas: 130, tad: 80, fc: 94, fr: 22, temp: 37, sat: 96 },
    alteredAt: {},
    glucometrias: [{ value: 144, time: "08:00" }],
    io: { ing: 200, egr: 100, evac: "NO" }
  };
}

// public/js/tour-demo-dates.mjs
var SOME_MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
var FECHA_REGISTRO_RE = /Fecha Registro:\t[^\n]+/;
function addTourDays(d, days) {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + days);
  return out;
}
function formatTourFechaSlash(d) {
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}
function formatTourHora(d) {
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function formatTourIsoDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function formatSomeFechaRegistroEn(d, hour24, minute) {
  const h = hour24 % 12 || 12;
  const ampm = hour24 < 12 ? "AM" : "PM";
  const minStr = String(minute).padStart(2, "0");
  return SOME_MONTHS_EN[d.getMonth()] + " " + d.getDate() + " " + d.getFullYear() + " " + h + ":" + minStr + ampm;
}
function patchSomeLabFechaRegistro(report, date, opts) {
  const hour = opts && opts.hour != null ? opts.hour : 9;
  const minute = opts && opts.minute != null ? opts.minute : 0;
  const line = "Fecha Registro:	" + formatSomeFechaRegistroEn(date, hour, minute);
  return String(report || "").replace(FECHA_REGISTRO_RE, line);
}
function buildTourDemoDates(ref) {
  const now = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const fiuxDate = addTourDays(now, -2);
  const fimiDate = addTourDays(now, -1);
  const labOlderDate = addTourDays(now, -8);
  const labNewerDate = addTourDays(now, -1);
  const demoSomeLabReport = patchSomeLabFechaRegistro(DEMO_SOME_LAB_REPORT, labNewerDate, {
    hour: 9,
    minute: 42
  });
  const olderDemoSomeLabReport = patchSomeLabFechaRegistro(OLDER_DEMO_SOME_LAB_REPORT, labOlderDate, {
    hour: 7,
    minute: 18
  });
  const demoGarciaLabReport = patchSomeLabFechaRegistro(DEMO_GARCIA_LAB_REPORT, now, {
    hour: 11,
    minute: 5
  });
  return {
    fecha: formatTourFechaSlash(now),
    hora: formatTourHora(now),
    fiuxFecha: formatTourIsoDate(fiuxDate),
    fimiFecha: formatTourIsoDate(fimiDate),
    labFechaOlder: formatTourFechaSlash(labOlderDate),
    labFechaNewer: formatTourFechaSlash(labNewerDate),
    demoSomeLabReport,
    olderDemoSomeLabReport,
    demoGarciaLabReport,
    demoTourLabPaste: demoSomeLabReport + "\n\n" + olderDemoSomeLabReport
  };
}
function applyTourDemoIngresoDates(patient, bundle) {
  if (!patient || !bundle) return;
  patient.fiuxFecha = bundle.fiuxFecha;
  patient.fimiFecha = bundle.fimiFecha;
}
function buildTourDemoLabPasteBoth(ref) {
  const bundle = buildTourDemoDates(ref);
  return bundle.demoTourLabPaste + "\n" + LAB_BULK_PATIENT_SEPARATOR + "\n" + bundle.demoGarciaLabReport;
}

// public/js/tour-demo-todos.mjs
var TODOS_LS_KEY = "rpc-todos";
function readTodosMap() {
  try {
    const raw = localStorage.getItem(TODOS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeTodosMap(map) {
  try {
    localStorage.setItem(TODOS_LS_KEY, JSON.stringify(map || {}));
  } catch (_e) {
    void _e;
  }
}
function todoEntry(id, text, priority, completed) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id,
    text,
    priority,
    completed: !!completed,
    createdAt: now,
    updatedAt: now
  };
}
function buildTourDemoTodosForPatient(patientId) {
  if (patientId !== DEMO_PATIENT_ID) return [];
  return [
    todoEntry("tour-todo-bh", "BH y QS de control ma\xF1ana (IRC / anemia)", "alta", false),
    todoEntry(
      "tour-todo-glu",
      "Repetir glucometr\xEDa si >180 mg/dL en pr\xF3ximo turno",
      "media",
      false
    ),
    todoEntry(
      "tour-todo-atb",
      "Ajustar ATB seg\xFAn antibiograma cuando est\xE9 disponible",
      "alta",
      false
    ),
    todoEntry(
      "tour-todo-infecto",
      "Interconsulta Infectolog\xEDa \u2014 documentar en nota",
      "media",
      false
    ),
    todoEntry("tour-todo-io", "Balance h\xEDdrico estricto \u2014 registrar I/O en turno", "baja", false),
    todoEntry("tour-todo-eco", "Valorar ecograf\xEDa abdominal seg\xFAn evoluci\xF3n", "media", false)
  ];
}
function seedTourDemoTodos(patientId) {
  const pid = patientId || DEMO_PATIENT_ID;
  const todos = buildTourDemoTodosForPatient(pid);
  if (!todos.length) return;
  const map = readTodosMap();
  map[pid] = todos;
  writeTodosMap(map);
}
function clearTourDemoTodos() {
  const map = readTodosMap();
  let changed = false;
  if (map[DEMO_PATIENT_ID]) {
    delete map[DEMO_PATIENT_ID];
    changed = true;
  }
  if (changed) writeTodosMap(map);
}

// public/js/tour-demo-eventualidades.mjs
function buildTourDemoEventualidades(ref) {
  const now = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const days = [
    {
      offset: -2,
      text: "Ingreso por cuadro abdominal. Refiere molestia leve y n\xE1usea ocasional. Se inici\xF3 sueroterapia, monitorizaci\xF3n y BH/QS de ingreso (anemia, funci\xF3n renal estable). Se document\xF3 en nota de ingreso."
    },
    {
      offset: -1,
      text: "Evoluci\xF3n subjetiva favorable: mejor tolerancia oral l\xEDquida, sin dolor en reposo. Se ajust\xF3 esquema ATB emp\xEDrico y se tomaron cultivos. Diuresis conservada en turno. Familia informada."
    },
    {
      offset: 0,
      text: "Hoy refiere menos n\xE1usea y buen descanso. Se registraron SV y glucometr\xEDa en turno; pendiente antibiograma e interconsulta de Infectolog\xEDa. Se reforz\xF3 educaci\xF3n sobre signos de alarma."
    }
  ];
  let store = { entries: [] };
  days.forEach(function(row, idx) {
    const d = addTourDays(now, row.offset);
    const atIso = eventualidadDateToIso(formatTourIsoDate(d));
    store = appendEventualidad(store, row.text, "tour-ev-" + idx, atIso);
  });
  return store;
}

// public/js/features/settings-help/tour-demo-seed.mjs
var rt3 = getSettingsHelpRuntime();
function purgeTourDemoPatientsFromState() {
  var removedIds = [];
  setPatients(
    getPatients().filter(function(p) {
      if (!p) return false;
      var reg = String(p.registro || "").trim();
      var isTourDemo = p.id === DEMO_PATIENT_ID || p.id === DEMO_PATIENT_ID_2 || !!p.isDemo || reg === DEMO_REGISTRO || reg === DEMO_REGISTRO_2;
      if (isTourDemo) {
        if (p.id) removedIds.push(p.id);
        return false;
      }
      return true;
    })
  );
  removedIds.push(DEMO_PATIENT_ID, DEMO_PATIENT_ID_2);
  removedIds.forEach(function(id) {
    if (!id) return;
    delete getNotes()[id];
    delete getIndicaciones()[id];
    delete getLabHistory()[id];
    delete getMedRecetaByPatient()[id];
    delete getListadoProblemas()[id];
    if (getMedNotaSelectionByPatient()[id]) delete getMedNotaSelectionByPatient()[id];
  });
  clearTourDemoTodos();
}
var TOUR_STEPS_USE_DEMO_PEREZ = {
  servicio_default: true,
  sala_expediente_tabs: true,
  estado_actual: true,
  estado_actual_registro: true,
  estado_actual_review: true,
  eventualidades: true,
  listado_problemas: true,
  sala_med: true,
  sala_tend: true,
  sala_tend_chart: true,
  sala_vpo: true,
  sala_receta_hu: true
};
function findTourDemoPerezPatient() {
  return getPatients().find(function(x) {
    return x && x.id === DEMO_PATIENT_ID;
  }) || findTourDemoPatientByRegistro(getPatients(), DEMO_REGISTRO);
}
function seedTourDemoPerezClinicalData() {
  var p = findTourDemoPerezPatient();
  if (!p) return false;
  var pid = p.id;
  var today = /* @__PURE__ */ new Date();
  var tourDates = getTourDemoDateBundle(today);
  var fecha = tourDates.fecha;
  var hora = tourDates.hora;
  applyTourDemoIngresoDates(p, tourDates);
  var hist = p.monitoreo && Array.isArray(p.monitoreo.historial) ? p.monitoreo.historial : [];
  if (!hist.length) {
    p.monitoreo = buildTourMonitoreoHistorial(today);
  }
  var ev = p.eventualidades && Array.isArray(p.eventualidades.entries) ? p.eventualidades.entries : [];
  if (!ev.length) {
    p.eventualidades = buildTourDemoEventualidades(today);
  }
  if (!getNotes()[pid] || !String((getNotes()[pid].diagnosticos || [])[0] || "").trim()) {
    getNotes()[pid] = {
      fecha,
      hora,
      interrogatorio: "",
      evolucion: "",
      estudios: "",
      diagnosticos: ["DM2, IRC estadio 3, HAS"],
      tratamiento: [""],
      ta: "",
      fr: "",
      fc: "",
      temp: "",
      peso: "",
      medico: "",
      profesor: ""
    };
  }
  if (!getIndicaciones()[pid]) {
    getIndicaciones()[pid] = {
      fecha,
      hora,
      medicos: "",
      dieta: "",
      cuidados: "",
      estudios: "",
      medicamentos: "",
      interconsultas: "",
      otros: []
    };
  }
  if (!getMedRecetaByPatient()[pid]) {
    getMedRecetaByPatient()[pid] = {
      fechaActualizacion: fecha,
      items: [
        {
          id: "tour-med-1",
          nombreRaw: "PARACETAMOL 1 G SOL INY (*)",
          viaRaw: "VIA INTRAVENOSA",
          dosisRaw: "1 G //",
          frecuenciaRaw: "CADA 8 HORAS",
          suspendido: false,
          diaTratamiento: null
        },
        {
          id: "tour-med-2",
          nombreRaw: "CEFTRIAXONA 1 G SOL INY (*)",
          viaRaw: "VIA INTRAVENOSA",
          dosisRaw: "1 G // *DIA# 2*",
          frecuenciaRaw: "CADA 24 HORAS",
          suspendido: false,
          diaTratamiento: 2
        }
      ]
    };
    getMedNotaSelectionByPatient()[pid] = { "tour-med-1": true, "tour-med-2": true };
  }
  seedTourDemoTodos(DEMO_PATIENT_ID);
  persistClinicalState();
  if (typeof rt3.refreshAllTodoUIs === "function") rt3.refreshAllTodoUIs();
  return true;
}
function ensureTourPrimaryDemoPatientActive() {
  if (!tourState.guidedTourActive || tourState.guidedTourBranch === "interconsulta") return false;
  var p = findTourDemoPerezPatient();
  if (!p) return false;
  var changed = rt3.getActiveId() !== p.id;
  if (changed) {
    selectPatient(p.id);
  }
  seedTourDemoPerezClinicalData();
  if (changed && typeof rt3.refreshExpedienteAfterPatientSelect === "function") {
    rt3.refreshExpedienteAfterPatientSelect();
  }
  return true;
}
function applyTourDemoPatientBundle(patientId, registro) {
  var reg = String(registro || "").trim();
  var today = /* @__PURE__ */ new Date();
  var tourDates = getTourDemoDateBundle(today);
  var fecha = tourDates.fecha;
  var hora = tourDates.hora;
  var p = getPatients().find(function(x) {
    return x && x.id === patientId;
  });
  if (p) {
    applyTourDemoIngresoDates(p, tourDates);
    if (patientId === DEMO_PATIENT_ID) {
      p.monitoreo = buildTourMonitoreoHistorial(today);
    }
  }
  if (patientId === DEMO_PATIENT_ID) {
    seedTourDemoPerezClinicalData();
  } else if (patientId === DEMO_PATIENT_ID_2 || reg === DEMO_REGISTRO_2) {
    getNotes()[patientId] = {
      fecha,
      hora,
      interrogatorio: "",
      evolucion: "",
      estudios: "",
      diagnosticos: ["DM2 descompensada"],
      tratamiento: [""],
      ta: "",
      fr: "",
      fc: "",
      temp: "",
      peso: "",
      medico: "",
      profesor: ""
    };
    getIndicaciones()[patientId] = {
      fecha,
      hora,
      medicos: "",
      dieta: "",
      cuidados: "",
      estudios: "",
      medicamentos: "",
      interconsultas: "",
      otros: []
    };
  }
  persistClinicalState();
}
function getTourDemoDateBundle(ref) {
  return buildTourDemoDates(ref || /* @__PURE__ */ new Date());
}
function getDemoTourLabPaste(ref) {
  return buildTourDemoLabPasteBoth(ref);
}
function tourDemoLabPasteHasBoth(text) {
  var v = String(text || "");
  return v.indexOf(DEMO_REGISTRO) !== -1 && v.indexOf(DEMO_REGISTRO_2) !== -1 && v.indexOf(LAB_BULK_PATIENT_SEPARATOR) !== -1;
}
function ensureTourDemoLabInputBoth() {
  if (!tourState.guidedTourActive) return false;
  var li = document.getElementById("lab-input");
  if (!li) return false;
  if (!tourDemoLabPasteHasBoth(li.value)) {
    li.value = getDemoTourLabPaste();
  }
  return true;
}

// public/js/features/settings-help/tour-lab-hint.mjs
var rt4 = getSettingsHelpRuntime();
function openLabBulkTourHintModal() {
  ensureTourDemoLabInputBoth();
  var backdrop = document.getElementById("lab-bulk-tour-hint-backdrop");
  var sample = document.getElementById("lab-bulk-tour-hint-sample");
  var leads = backdrop ? backdrop.querySelectorAll(".lab-bulk-tour-hint-lead") : [];
  var insertBtn = backdrop ? backdrop.querySelector('button[onclick*="insertLabTourSecondPatientExample"]') : null;
  if (sample) {
    sample.textContent = LAB_BULK_PATIENT_SEPARATOR + "\n\n" + getTourDemoDateBundle().demoGarciaLabReport.trim();
  }
  if (leads[0]) {
    leads[0].innerHTML = "En el cuadro <strong>ya est\xE1n cargados</strong> dos d\xEDas de <strong>DEMO P\xC9REZ</strong> y, tras el separador, el reporte de <strong>DEMO GARC\xCDA</strong>. R+ los distingue por paciente y por fecha al procesar.";
  }
  if (leads[1]) {
    leads[1].textContent = "En el siguiente paso pulsa Procesar: ver\xE1s la tabla multi-paciente. Si pegas m\xE1s reportes, usa el separador (bot\xF3n gris) entre pacientes distintos.";
  }
  if (insertBtn) {
    insertBtn.style.display = tourDemoLabPasteHasBoth(
      document.getElementById("lab-input") && document.getElementById("lab-input").value
    ) ? "none" : "";
  }
  if (!backdrop) return;
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
}
function closeLabBulkTourHintModal() {
  var backdrop = document.getElementById("lab-bulk-tour-hint-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
}
function insertLabTourSecondPatientExample() {
  if (ensureTourDemoLabInputBoth()) {
    rt4.showToast("Ejemplo completo (P\xC9REZ + GARC\xCDA) ya est\xE1 en el cuadro", "info");
    closeLabBulkTourHintModal();
    return;
  }
  var ta = document.getElementById("lab-input");
  if (!ta) return;
  ta.value = getDemoTourLabPaste();
  closeLabBulkTourHintModal();
  rt4.showToast("Ejemplo de laboratorio insertado \u2713", "success");
}

// public/js/features/settings-help/tour-step-actions.mjs
var rt5 = getSettingsHelpRuntime();
function resolveTourBranch() {
  if (tourState.guidedTourBranch === "interconsulta") return "interconsulta";
  if (tourState.guidedTourBranch === "guardia-v7") return "guardia-v7";
  if (tourState.guidedTourBranch === "quick-route") return "quick-route";
  return "sala";
}
function persistTourProgressDebounced() {
  if (!tourState.guidedTourActive || !tourState.tourStepId) return;
  if (tourState.persistTourProgressTimer) clearTimeout(tourState.persistTourProgressTimer);
  tourState.persistTourProgressTimer = setTimeout(function() {
    tourState.persistTourProgressTimer = null;
    var branch = resolveTourBranch();
    var ch = getChapterForStep(tourState.tourStepId, branch);
    saveTourProgress({
      branch,
      track: branch,
      stepId: tourState.tourStepId,
      chapterId: ch.id,
      mode: tourState.guidedTourMode
    });
    syncLearnHubContinueVisibility();
  }, 300);
}
function resetTourUiBeforeResume() {
  clearAllTourSpotlights();
  if (typeof closeSettingsDropdown === "function") closeSettingsDropdown();
  if (typeof closeConnectionDropdown === "function") closeConnectionDropdown();
  rt5.closeProfileModal();
  closeLabSomeTablesModal();
  closeLabBulkTourHintModal();
  closeTendGroupModal();
  closeSOAPModal();
  hideTourIntroModal();
  settingsHelpBridge.closeQuickHelp();
}
function showTourDock() {
  document.getElementById("tour-dock").classList.add("tour-dock-visible");
}
function hideTourDock() {
  clearTourActionPoll();
  var d = document.getElementById("tour-dock");
  if (!d) return;
  d.classList.remove("tour-dock-visible");
  d.classList.remove("tour-dock-collapsed");
  d.classList.remove("tour-dock-pos-left");
  d.classList.remove("tour-dock--guardia");
  d.classList.remove("tour-dock--fundamentos");
  d.classList.remove("tour-dock--quick-route");
  var btn = document.getElementById("btn-tour-collapse");
  if (btn) {
    btn.textContent = "\u2013";
    btn.setAttribute("aria-label", "Minimizar tutorial");
  }
}
function toggleTourDockCollapsed() {
  var d = document.getElementById("tour-dock");
  if (!d) return;
  setTourDockCollapsed(!d.classList.contains("tour-dock-collapsed"));
}
function setTourDockCollapsed(collapsed) {
  var d = document.getElementById("tour-dock");
  if (!d) return;
  if (collapsed) d.classList.add("tour-dock-collapsed");
  else d.classList.remove("tour-dock-collapsed");
  var btn = document.getElementById("btn-tour-collapse");
  if (btn) {
    btn.textContent = collapsed ? "+" : "\u2013";
    btn.setAttribute("aria-label", collapsed ? "Expandir tutorial" : "Minimizar tutorial");
  }
}
function onTourDockClick(ev) {
  var d = document.getElementById("tour-dock");
  if (!d || !d.classList.contains("tour-dock-collapsed")) return;
  var t = ev && ev.target;
  if (t && t.closest && t.closest(".btn-tour-skip, .btn-tour-collapse, .btn-tour-next, .btn-tour-prev, .btn-tour-pause")) return;
  setTourDockCollapsed(false);
  ev.stopPropagation();
}
function seedDemoTrendHistory(ref) {
  try {
    var bundle = getTourDemoDateBundle(ref);
    var older = procesarLabs(bundle.olderDemoSomeLabReport).resLabs;
    var newer = procesarLabs(bundle.demoSomeLabReport).resLabs;
    getLabHistory()[DEMO_PATIENT_ID] = [
      {
        id: "tour-trend-1",
        fecha: bundle.labFechaOlder,
        hora: "",
        resLabs: older,
        parsed: extractParsedValues(older)
      },
      {
        id: "tour-trend-2",
        fecha: bundle.labFechaNewer,
        hora: "",
        resLabs: newer,
        parsed: extractParsedValues(newer)
      }
    ];
  } catch (_err) {
    void _err;
    delete getLabHistory()[DEMO_PATIENT_ID];
  }
}
function seedDemoMonitoreoOnActivePatient() {
  ensureTourPrimaryDemoPatientActive();
}
function seedDemoListadoProblemas() {
  if (!tourState.guidedTourActive) return;
  if (!ensureTourPrimaryDemoPatientActive()) return;
  var perez = findTourDemoPerezPatient();
  if (!perez) return;
  var demoId = perez.id;
  var today = /* @__PURE__ */ new Date();
  var fecha = String(today.getDate()).padStart(2, "0") + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + today.getFullYear();
  var hora = String(today.getHours()).padStart(2, "0") + ":" + String(today.getMinutes()).padStart(2, "0");
  getListadoProblemas()[demoId] = buildTourDemoListadoProblemas(fecha, hora);
  persistClinicalState();
}
function ensureProfileExpandedForTour() {
  rt5.openProfileModal();
}
function ensureSettingsExpandedForTour() {
  if (!isSettingsDropdownOpen()) toggleSettingsDropdown();
}
function ensureConnectionExpandedForTour(_stepId) {
  if (typeof closeSettingsDropdown === "function") closeSettingsDropdown();
  var dd = document.getElementById("connection-dropdown");
  if (!dd) return;
  if (!dd.classList.contains("open") && typeof openConnectionDropdown === "function") {
    openConnectionDropdown();
    return;
  }
  void import("/mobile/js/chunks/panel-conexion-tour-ERBJFOY2.js").then(function(m) {
    void m.afterConnectionPanelOpened();
  });
}
function clearTourSoapButtonHighlight() {
}
function syncTourSoapButtonHighlight() {
}
function getGuidedTourSteps() {
  const branch = resolveTourBranch();
  if (tourState.guidedTourModuleOnly && tourState.guidedTourChapterScope) {
    const scoped = getTourStepsForChapter(tourState.guidedTourChapterScope, branch);
    if (scoped.length) return scoped;
  }
  return getTourSteps(branch);
}
function demoLabAlreadyProcessedForTour() {
  if (tourState.tourDemoLabSessionProcessed) return true;
  if (!tourState.guidedTourActive) return false;
  return tourDemoLabCompleteForTour(getPatients(), getLabHistory());
}
function seedDemoEventualidadesOnActivePatient() {
  ensureTourPrimaryDemoPatientActive();
}
function openTourEstadoActualRegistroDemo() {
  var now = /* @__PURE__ */ new Date();
  var atShift = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
  openEstadoActualRegistroModal();
  applyEstadoActualParsedToForm(getTourRegistroFormSample());
  var recorded = document.getElementById("ea-recorded-at");
  if (recorded && "value" in recorded) {
    recorded.value = toDatetimeLocalValue(atShift);
  }
}
function isEstadoActualPostRegistroTourStep(id) {
  return id === "estado_actual_review";
}
function prepareEstadoActualPanelForTour(onPanelReady) {
  ensureTourPrimaryDemoPatientActive();
  closeEstadoActualRegistroModal();
  invalidateEaPanelCache();
  try {
    renderEstadoActualPanel({
      onReady: function() {
        if (typeof onPanelReady === "function") onPanelReady();
      }
    });
  } catch (err) {
    console.error("prepareEstadoActualPanelForTour:", err && err.message);
    if (typeof onPanelReady === "function") onPanelReady();
  }
}
function isConnectionDropdownOpenForTour() {
  var dd = document.getElementById("connection-dropdown");
  if (dd && dd.classList.contains("open")) return true;
  var syncBtn = document.getElementById("btn-header-team-sync");
  return !!(syncBtn && syncBtn.getAttribute("aria-expanded") === "true");
}
function isMobileInviteExpandedForTour() {
  var details = document.querySelector(".lan-invite-collapsible--mobile");
  if (details && details.open) return true;
  var qrHost = document.querySelector(".cloud-mobile-invite-qr-host");
  return !!(qrHost && qrHost.querySelector("canvas"));
}
function isGuardiaEntregasFilterActiveForTour() {
  if (clinicalSessionContext && clinicalSessionContext.guardiaMode) return true;
  var boardBtn = document.getElementById("btn-guardia-mode-toggle");
  return !!(boardBtn && (boardBtn.getAttribute("aria-pressed") === "true" || boardBtn.classList.contains("is-active")));
}
function clearTourActionPoll() {
  if (tourState.tourActionPollTimer) {
    clearInterval(tourState.tourActionPollTimer);
    tourState.tourActionPollTimer = null;
  }
  if (tourState.tourActionClickHandler) {
    document.removeEventListener("click", tourState.tourActionClickHandler, true);
    document.removeEventListener("toggle", tourState.tourActionClickHandler, true);
    tourState.tourActionClickHandler = null;
  }
}
function armTourActionPoll() {
  clearTourActionPoll();
  if (!tourState.guidedTourActive || !stepRequiresUserAction(tourState.tourStepId)) return;
  tourState.tourActionPollTimer = setInterval(syncTourActionNextButton, 300);
  tourState.tourActionClickHandler = function() {
    syncTourActionNextButton();
  };
  document.addEventListener("click", tourState.tourActionClickHandler, true);
  document.addEventListener("toggle", tourState.tourActionClickHandler, true);
}
function enableTourNextButton(nextBtn) {
  nextBtn.style.display = "";
  nextBtn.disabled = false;
  nextBtn.textContent = "Siguiente";
}
function syncLabParseTourNext(nextBtn, stepId) {
  if (stepId === "lab_parse" && demoLabAlreadyProcessedForTour()) enableTourNextButton(nextBtn);
}
function syncServicioDefaultTourNext(nextBtn, stepId) {
  if (stepId !== "servicio_default") return;
  var st = rt5.getSettings();
  if (st && String(st.defaultServicio || "").trim()) {
    nextBtn.style.display = "";
    nextBtn.textContent = "Siguiente";
  }
}
function syncConnectionTourNext(nextBtn, stepId) {
  if (stepId !== "gv7_lan_wifi" && stepId !== "livesync_desktop") return;
  if (!isConnectionDropdownOpenForTour()) return;
  enableTourNextButton(nextBtn);
}
function syncMobileInviteTourNext(nextBtn, stepId) {
  if (stepId !== "gv7_mobile_link" || !isMobileInviteExpandedForTour()) return;
  enableTourNextButton(nextBtn);
}
function syncGuardiaToggleTourNext(nextBtn, stepId) {
  if (stepId !== "gv7_guardia_toggle" || !isGuardiaEntregasFilterActiveForTour()) return;
  enableTourNextButton(nextBtn);
}
function syncTourActionNextButton() {
  var nextBtn = document.getElementById("tour-btn-next");
  if (!nextBtn || !tourState.guidedTourActive) return;
  var stepId = tourState.tourStepId;
  syncLabParseTourNext(nextBtn, stepId);
  syncServicioDefaultTourNext(nextBtn, stepId);
  syncConnectionTourNext(nextBtn, stepId);
  syncMobileInviteTourNext(nextBtn, stepId);
  syncGuardiaToggleTourNext(nextBtn, stepId);
}
function guidedTourStepIndex() {
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourState.tourStepId);
  return i < 0 ? 0 : i;
}
function clearAllTourSpotlights() {
  var cls = ["tour-spotlight-soap", "tour-spotlight-action"];
  cls.forEach(function(c) {
    document.querySelectorAll("." + c).forEach(function(el) {
      el.classList.remove(c);
    });
  });
}
var TOUR_DOCK_LEFT_STEPS = {
  ic_nota: 1,
  ic_indica: 1,
  estado_actual_registro: 1,
  listado_problemas: 1,
  livesync_desktop: 1,
  livesync_mobile: 1,
  gv7_lan_wifi: 1,
  gv7_mobile_link: 1,
  gv7_mobile_scope: 1,
  gv7_mobile_vs_sala: 1
};
function syncTourDockPlacement() {
  var d = document.getElementById("tour-dock");
  if (!d) return;
  var useLeft = false;
  if (tourState.guidedTourActive && tourState.tourStepId && TOUR_DOCK_LEFT_STEPS[tourState.tourStepId]) useLeft = true;
  if (tourState.miniTourActive && tourState.miniTourSteps && tourState.miniTourSteps[tourState.miniTourIdx] && tourState.miniTourSteps[tourState.miniTourIdx].dockLeft) {
    useLeft = true;
  }
  if (useLeft) d.classList.add("tour-dock-pos-left");
  else d.classList.remove("tour-dock-pos-left");
}
function tourApplySpotlightForStep(id, t, scrollDelayMs) {
  if (!t || !t.selector) return;
  var scrollDelay = scrollDelayMs != null ? scrollDelayMs : 140;
  setTimeout(function() {
    if (!tourState.guidedTourActive || tourState.tourStepId !== id) return;
    if (id === "listado_problemas") rt5.renderListadoForm();
    var el = document.querySelector(t.selector);
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_scrollErr) {
      void _scrollErr;
    }
    var spotlightCls = t.spotlightClass || (stepRequiresUserAction(id) ? "tour-spotlight-soap" : null);
    if (spotlightCls) el.classList.add(spotlightCls);
    if (t.focus && typeof el.focus === "function") {
      try {
        el.focus({ preventScroll: true });
      } catch {
        try {
          el.focus();
        } catch (_focusFallback) {
          void _focusFallback;
        }
      }
    }
  }, scrollDelay);
}
function applyGuardiaTourLayoutForStep(stepId) {
  void import("/mobile/js/chunks/tour-guards-BTBYLE5G.js").then((guards) => {
    if (!guards.isGuidedTourRunning()) return;
    if (guards.shouldShowGuardiaBoardWithoutEntrega(stepId)) {
      void Promise.all([
        import("/mobile/js/chunks/clinical-entrega-77FSKVXI.js"),
        import("/mobile/js/chunks/entrega-roster-panel-MESQTOTU.js")
      ]).then(([entrega, roster]) => {
        entrega.endEntregaPhase();
        roster.closeEntregaRosterPanel();
        if (stepId === "gv7_fin_turno") {
          roster.activateTurnoActivo();
          window.dispatchEvent(new CustomEvent("guardia:turno-activo"));
        } else {
          roster.deactivateTurnoActivo();
        }
        document.documentElement.classList.remove("guardia-entrega-roster-open");
        if (typeof rt5.renderGuardiaBoard === "function") {
          rt5.renderGuardiaBoard(rt5.getSettings());
        }
      });
      return;
    }
    if (guards.shouldOpenEntregaRosterForTour(stepId)) {
      void import("/mobile/js/chunks/clinical-entrega-77FSKVXI.js").then((entrega) => {
        if (!entrega.isEntregaPhaseActive()) {
          void entrega.beginEntregaPhaseFlow({
            settings: rt5.getSettings(),
            renderGuardiaBoard: rt5.renderGuardiaBoard
          });
          return;
        }
        void import("/mobile/js/chunks/entrega-roster-panel-MESQTOTU.js").then((roster) => {
          if (!roster.isEntregaRosterOpen()) {
            roster.openEntregaRosterPanel(rt5.getSettings());
            rt5.renderGuardiaBoard?.(rt5.getSettings());
          }
        });
      });
    }
  });
}
function applyTourDensityForStep(id, t) {
  if (tourState.guidedTourActive && !t?.openGuardiaDensity) setUiDensity("normal");
  if (!t) return false;
  if (t.openGuardiaDensity) {
    if (!isGuardiaMode()) {
      setUiDensity("guardia");
      if (typeof rt5.renderGuardiaBoard === "function") rt5.renderGuardiaBoard(rt5.getSettings());
    }
    applyGuardiaTourLayoutForStep(id);
  }
  if (t.exitGuardiaDensity && isGuardiaMode()) setUiDensity("normal");
  return true;
}
function seedTourDemosForStep(id) {
  if (TOUR_STEPS_USE_DEMO_PEREZ[id]) ensureTourPrimaryDemoPatientActive();
  if (id === "listado_problemas") seedDemoListadoProblemas();
  if (id === "estado_actual" || id === "estado_actual_registro" || isEstadoActualPostRegistroTourStep(id)) {
    seedDemoMonitoreoOnActivePatient();
  }
  if (id === "eventualidades") seedDemoEventualidadesOnActivePatient();
}
function applyTourTabsForStep(id, t) {
  if (t.appTab) rt5.switchAppTab(t.appTab);
  if (t.labInner) {
    switchLabInner(t.labInner);
    return;
  }
  if (!t.innerTab) return;
  if (id === "listado_problemas") {
    rt5.switchInnerTab("listado", { forceRender: true });
    rt5.renderListadoForm();
  } else {
    rt5.switchInnerTab(t.innerTab);
  }
  if (t.appTab !== "nota") return;
  if (t.innerTab === "notas") renderNoteForm();
  else if (t.innerTab === "indica") renderIndicaForm();
}
function applyTourOverlayChromeForStep(id, t) {
  if (t.openProfile) ensureProfileExpandedForTour();
  else rt5.closeProfileModal();
  if (t.openAddModalFullManual) openAddModalFullManual();
  else if (id !== "lab_parse") closeModal();
  if (t.openConnection) ensureConnectionExpandedForTour(id);
  else if (t.openSettings) ensureSettingsExpandedForTour();
  else {
    if (typeof closeSettingsDropdown === "function") closeSettingsDropdown();
    if (typeof closeConnectionDropdown === "function") closeConnectionDropdown();
  }
  if (id === "sala_med") rt5.renderMedRecetaPanel();
}
function scheduleEstadoActualTourPrep(id, t) {
  if (tourState.guidedTourBranch === "interconsulta") return false;
  if (id === "estado_actual") {
    setTimeout(function() {
      if (!tourState.guidedTourActive || tourState.tourStepId !== "estado_actual") return;
      prepareEstadoActualPanelForTour();
    }, 160);
    return false;
  }
  if (id === "estado_actual_registro") {
    setTimeout(function() {
      if (!tourState.guidedTourActive || tourState.tourStepId !== "estado_actual_registro") return;
      prepareEstadoActualPanelForTour(function() {
        if (!tourState.guidedTourActive || tourState.tourStepId !== "estado_actual_registro") return;
        openTourEstadoActualRegistroDemo();
      });
    }, 160);
    return false;
  }
  if (!isEstadoActualPostRegistroTourStep(id)) return false;
  clearAllTourSpotlights();
  if (!t.selector) return true;
  var postRegStepId = id;
  var spotlightDelay = 400;
  setTimeout(function() {
    if (!tourState.guidedTourActive || tourState.tourStepId !== postRegStepId) return;
    prepareEstadoActualPanelForTour(function() {
      tourApplySpotlightForStep(postRegStepId, t, spotlightDelay);
    });
  }, 160);
  return true;
}
function closeStaleModalsForTourStep(id) {
  if (id === "sala_med" || id === "listado_problemas") closeSOAPModal();
}
function applyTourTargetForStep(id) {
  var t = getTourTarget(id, resolveTourBranch());
  if (!applyTourDensityForStep(id, t)) return;
  seedTourDemosForStep(id);
  applyTourTabsForStep(id, t);
  applyTourOverlayChromeForStep(id, t);
  if (scheduleEstadoActualTourPrep(id, t)) return;
  if (id === "map_lab_teaser" || id === "lab_parse") ensureTourDemoLabInputBoth();
  closeStaleModalsForTourStep(id);
  clearAllTourSpotlights();
  if (id === "gv7_trust_strip") {
    void import("/mobile/js/chunks/guardia-trust-strip-EDOKU5CP.js").then((m) => {
      if (typeof m.syncGuardiaTrustStrip === "function") m.syncGuardiaTrustStrip();
    });
  }
  if (!t.selector) return;
  var spotlightDelay = id === "listado_problemas" || id === "map_incomplete" ? 280 : 140;
  tourApplySpotlightForStep(id, t, spotlightDelay);
}

// public/js/features/settings-help/tour-flow-fundamentos-steps.mjs
function showNext(nextBtn, label) {
  nextBtn.style.display = "";
  nextBtn.textContent = label || "Siguiente";
}
function hideNext(nextBtn) {
  nextBtn.style.display = "none";
}
function finishNext(nextBtn) {
  showNext(nextBtn, "Finalizar");
  nextBtn.setAttribute("onclick", "guidedTourFinish()");
}
function getMapTabsCopy() {
  var mod = getWrapPaseShortcutKey();
  if (getUiDensity() !== "normal") {
    return '<p style="margin:0;line-height:1.5;">En <strong>Pase</strong> el centro es un <strong>resumen</strong> del paciente. Pulsa un bloque o usa <strong>' + mod + "+1\u20264</strong> para abrir el detalle en vista <strong>Normal</strong> (repite el n\xFAmero para ciclar subvistas).</p>";
  }
  return '<p style="margin:0;line-height:1.5;">Arriba: <strong>Paciente</strong>, <strong>Laboratorio</strong>, <strong>Manejo</strong> y <strong>Agenda</strong>. <strong>' + mod + "+1\u20264</strong> cambia de pesta\xF1a. <strong>Repite " + mod + "+1</strong> cicla Resumen \u2192 Cl\xEDnico \u2192 Salida; <strong>repite " + mod + "+2</strong> cicla Labs \u2192 Tendencias \u2192 Cultivos.</p>";
}
function getMapLabTeaserCopy() {
  if (tourState.guidedTourBranch === "interconsulta") {
    return '<p style="margin:0;line-height:1.5;">El cuadro ya trae <strong>DEMO P\xC9REZ</strong> (dos d\xEDas) y <strong>DEMO GARC\xCDA</strong> con el separador <strong>--- PACIENTE ---</strong>. Revisa el texto detr\xE1s y pulsa <strong>Siguiente</strong>.</p>';
  }
  return '<p style="margin:0;line-height:1.5;">El cuadro ya trae <strong>DEMO P\xC9REZ</strong> (dos d\xEDas) y <strong>DEMO GARC\xCDA</strong>. En el siguiente paso pulsa <strong>Procesar</strong>: ver\xE1s la <strong>vista previa multi-paciente</strong> y podr\xE1s dar de alta a cada uno en el censo.</p>';
}
function getIcExportsDesktopLine() {
  if (!window.electronAPI || typeof window.electronAPI.getAppVersion !== "function") return "";
  return '<p style="margin:10px 0 0;font-size:12px;color:var(--text-muted);">Escritorio: <strong>\u21C4</strong> junto a Ajustes abre R+ Cloud; respaldos locales en <strong>Respaldos, sync y recuperaci\xF3n</strong>.</p>';
}
function getWrapPaseShortcutKey() {
  return navigator.platform && /Mac/i.test(navigator.platform) ? "\u2318" : "Ctrl";
}
function renderMapSidebar(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">La <strong>columna izquierda</strong> es tu censo del turno: eliges al paciente activo aqu\xED. En este tour <strong>no hay pacientes precargados</strong>; los dar\xE1s de alta en los siguientes pasos.</p>';
  showNext(nextBtn);
}
function renderMapAddPatient(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;"><strong>+ Agregar</strong> da de alta al censo. Tambi\xE9n puedes agregar desde un laboratorio procesado. Nombre y registro bastan para empezar; cuarto, cama y servicio cierran el censo.</p>';
  showNext(nextBtn);
}
function renderMapIncomplete(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Sin <strong>cuarto</strong>, <strong>cama</strong> o <strong>servicio</strong> la tarjeta queda <strong>incompleta</strong>. Completa esos campos aqu\xED (o al tocar la tarjeta marcada). Con <strong>R+ Cloud</strong> el alta se comparte con el equipo.</p>';
  showNext(nextBtn);
}
function renderMapTabs(bodyEl, nextBtn) {
  bodyEl.innerHTML = getMapTabsCopy();
  showNext(nextBtn);
}
function renderMapLabTeaser(bodyEl, nextBtn) {
  bodyEl.innerHTML = getMapLabTeaserCopy();
  showNext(nextBtn);
}
function renderLabParse(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Pulsa <strong>Procesar</strong>: ver\xE1s la tabla con <strong>dos pacientes</strong> (P\xC9REZ y GARC\xCDA). En cada fila sin registrar usa <strong>Agregar paciente</strong>; el modal trae <strong>servicio</strong> y, en el tour, <strong>cuarto y cama</strong> sugeridos (revisa y ajusta si hace falta).</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">No hay <strong>Siguiente</strong> hasta que ambos tengan laboratorio en historial.</p>';
  hideNext(nextBtn);
}
function renderLabView(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Revisa diagramas y tabla. En <strong>Laboratorio \u2192 Labs</strong>, el men\xFA <strong>\u22EF</strong> incluye <strong>Consolidar</strong> para juntar env\xEDos del mismo d\xEDa (mismo tipo de dato).</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para continuar el tour.</p>';
  showNext(nextBtn);
}
function renderIcExpedienteTabs(bodyEl, nextBtn) {
  var mod = getWrapPaseShortcutKey();
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">En <strong>Interconsulta</strong>, <strong>Paciente</strong> abre en <strong>Resumen</strong>. Grupos: <strong>Resumen</strong>, <strong>Cl\xEDnico</strong> (Nota, Indicaciones) y <strong>Salida</strong> (Receta HU en PDF). Labs, tendencias y cultivos viven en <strong>Laboratorio</strong>.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Receta HU</strong> exporta el PDF oficial 000-061-R-06-12. Atajos: <strong>' + mod + "+1</strong> cicla grupos \xB7 <strong>E/T/D</strong> saltan a EA, tendencias o datos.</p>";
  showNext(nextBtn);
}
function renderSalaExpedienteTabs(bodyEl, nextBtn) {
  var mod = getWrapPaseShortcutKey();
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">En <strong>Sala</strong>, <strong>Paciente</strong> abre en <strong>Resumen</strong>. Grupos: <strong>Resumen</strong>, <strong>Cl\xEDnico</strong> y <strong>Salida</strong>. Labs, tendencias y cultivos viven en <strong>Laboratorio</strong>.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Cl\xEDnico</strong>: <strong>Estado actual</strong> \u2192 Eventualidades. Atajos: <strong>' + mod + "+1</strong> cicla grupos \xB7 <strong>E</strong> EA/Eventualidades \xB7 <strong>T</strong> tendencias/cultivos.</p>";
  showNext(nextBtn);
}
function renderIcNota(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Genera la <strong>Nota (.docx)</strong> desde el bot\xF3n correspondiente (motor nativo en Node; no requiere Python). Si el servidor local falla, puedes <strong>Omitir</strong> el tutorial.</p>';
  hideNext(nextBtn);
}
function renderIcIndica(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Exporta las <strong>Indicaciones (.docx)</strong> para entrega o impresi\xF3n (mismo generador nativo que la Nota).</p>';
  hideNext(nextBtn);
}
function renderIcExports(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">En <strong>Ajustes (\u2699)</strong>: carpeta de documentos, formato de <strong>salida r\xE1pida</strong>, respaldos y sync. En <strong>Laboratorio \u2192 duplicados</strong> puedes revisar todos los pacientes.</p>' + getIcExportsDesktopLine();
  showNext(nextBtn);
}
function renderSalaTend(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">En <strong>Laboratorio \u2192 Tendencias</strong> ves mini-gr\xE1ficas cuando hay varios laboratorios en el tiempo.</p>';
  showNext(nextBtn);
}
function renderSalaTendChart(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Pulsa <strong>Gr\xE1fica</strong> en un estudio (p. ej. biometr\xEDa) para ver tendencias agrupadas y una tabla copiable.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Cierra con clic fuera de la ventana o <strong>Esc</strong>. Es opcional en el demo: <strong>Siguiente</strong> para continuar.</p>';
  showNext(nextBtn);
}
function renderSalaMed(bodyEl, nextBtn) {
  var mod = getWrapPaseShortcutKey();
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Pulsa <strong>Importar SOME</strong>, pega el bloque TSV del hospital y procesa la receta. Marca filas para <strong>SOAP</strong> o <strong>Tratamiento</strong>; el demo ya trae dos f\xE1rmacos de ejemplo.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Atajos: <strong>' + mod + "+3</strong> cicla Manejo \u2194 Perfil \xB7 <strong>" + mod + "+Shift+3</strong> alterna texto Completo / Nombre+D\xEDa.</p>";
  showNext(nextBtn);
}
function renderProfile(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;"><strong>Mi Perfil</strong> (nombre arriba): m\xE9dico, plantillas y valores por defecto. <strong>Ajustes</strong>: carpeta, tema, respaldos y ayuda. <strong>Siguiente</strong>: sincronizaci\xF3n en equipo (\u21C4) y versi\xF3n m\xF3vil.</p>';
  showNext(nextBtn);
}
function renderServicioDefault(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Escribe tu <strong>Servicio (Sala)</strong> en Mi Perfil (nombre completo, sin abreviaturas) y sal del campo para guardar. Luego <strong>Siguiente</strong>.</p>';
  showNext(nextBtn);
}
function renderEstadoActual(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">En <strong>Cl\xEDnico \u2192 Estado actual</strong> el <strong>snapshot</strong> resume el turno (SV, glu, I/O, medicamentos). Abajo, las <strong>gr\xE1ficas</strong> muestran tendencias por familia (hemodin\xE1mico, respiratorio, metab\xF3lico) con puntos alterados resaltados.</p><p style="margin:10px 0 0;line-height:1.5;">El historial de mediciones y el texto compilado para la nota est\xE1n en esta misma pesta\xF1a. El demo trae tomas de <strong>hoy</strong> (TM, TV, TN).</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para practicar un <strong>registro manual</strong>.</p>';
  showNext(nextBtn);
}
function renderEstadoActualRegistro(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Modal <strong>Registrar medici\xF3n</strong>: <strong>signos vitales</strong> (varias capas por turno), <strong>glucometr\xEDas</strong> y bomba de insulina, <strong>I/O</strong> y evacuaciones, m\xE1s campos de soporte y dieta.</p><p style="margin:10px 0 0;line-height:1.5;">El ejemplo trae turno matutino precargado. Revisa y pulsa <strong>Registrar</strong>; el tour te guiar\xE1 por el panel actualizado.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Sin <strong>Siguiente</strong> hasta registrar.</p>';
  hideNext(nextBtn);
}
function renderEstadoActualReview(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Tras registrar, revisa tres zonas en esta pesta\xF1a: el <strong>snapshot</strong> (resumen del turno), las <strong>gr\xE1ficas</strong> por familia con alertas, y el <strong>historial</strong> con texto compilado para la nota.</p><p style="margin:10px 0 0;line-height:1.5;">En <strong>Sala</strong>, copia ese texto al expediente con el bot\xF3n flotante o desde el historial. En <strong>Interconsulta</strong> ver\xE1s <strong>Enviar a nota</strong> en la barra de acciones.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Despl\xE1zate si hace falta. <strong>Siguiente</strong>: <strong>Eventualidades</strong>.</p>';
  showNext(nextBtn);
}
function renderEventualidades(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;"><strong>Eventualidades</strong> es la l\xEDnea de tiempo del ingreso: evoluci\xF3n subjetiva y procedimientos por d\xEDa. El demo trae <strong>tres d\xEDas</strong> de notas breves.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Puedes editar, agregar o borrar entradas. Pulsa <strong>Siguiente</strong>.</p>';
  showNext(nextBtn);
}
function renderListadoProblemas(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;"><strong>Paciente \u2192 Salida \u2192 Listado</strong>: exporta problemas activos e inactivos a Word (t\xEDtulo + incisos <strong>A) CL\xCDNICA</strong>, <strong>B) EXPLORACI\xD3N</strong>, etc.).</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">El demo trae un ejemplo. Pulsa <strong>Generar Listado</strong> (resaltado) o <strong>Siguiente</strong>.</p>';
  showNext(nextBtn);
}
function renderSalaVpo(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;"><strong>Paciente \u2192 Salida \u2192 VPO</strong>: documenta escalas de riesgo (ASA, RCRI, Gupta, ARISCAT, Caprini) con el resultado que obtengas en tu calculadora; EKG/Rx editables y texto copiable. Solo en <strong>Sala</strong>.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Completa o revisa los campos resaltados y pulsa <strong>Siguiente</strong>.</p>';
  showNext(nextBtn);
}
function renderSalaRecetaHu(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;"><strong>Paciente \u2192 Salida \u2192 Receta HU</strong>: receta m\xE9dica en formato oficial <strong>000-061-R-06-12</strong> (PDF). Medicamentos, estudios y cuidados; bot\xF3n <strong>Exportar PDF</strong> cuando est\xE9 listo.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">En el tutorial no hace falta exportar; <strong>Siguiente</strong> para la <strong>Agenda</strong>.</p>';
  showNext(nextBtn);
}
function renderSalaAgenda(bodyEl, nextBtn) {
  var mod = getWrapPaseShortcutKey();
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">La pesta\xF1a <strong>Agenda</strong> (arriba) concentra <strong>procedimientos programados</strong> del servicio: cirug\xEDas, estudios y pendientes del turno, enlazados al paciente cuando aplica.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Atajos: <strong>' + mod + "+4</strong> abre Agenda (repite para semana actual) \xB7 <strong>" + mod + "+[ / ]</strong> semana anterior/siguiente. Con <strong>R+ Cloud</strong> se comparte en la sala.</p>";
  showNext(nextBtn);
}
function renderLivesyncDesktop(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">' + LIVESYNC_BTN_COPY + ' abre <strong>Conexi\xF3n</strong>: inicia sesi\xF3n en Nube y elige la <strong>sala</strong> de tu equipo. En iPad usa el enlace o QR en <strong>Opciones \u2192 iPad / R+ M\xF3vil</strong>.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el icono \u21C4 / Wi\u2011Fi para abrir el panel; aparece <strong>Siguiente</strong> cuando est\xE9 visible.</p>';
  if (stepRequiresUserAction("livesync_desktop")) hideNext(nextBtn);
}
function renderLivesyncMobile(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">En <strong>\u21C4 Conexi\xF3n \u2192 Opciones \u2192 iPad / R+ M\xF3vil</strong> copia el enlace o escanea el QR. ' + MOBILE_SCOPE_COPY + '</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Inicia sesi\xF3n con la <strong>misma cuenta R+ Cloud</strong> y la misma sala que en el escritorio.</p>';
  showNext(nextBtn);
}
function renderWrap(bodyEl, nextBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Listo. Repite el tutorial desde <strong>Mi Perfil</strong> o <strong>Ajustes</strong>. Para el equipo en vivo usa <strong>R+ Cloud</strong> en \u21C4 y, si hace falta, el enlace m\xF3vil.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Modo Pase</strong> (resumen de ronda): prueba el atajo <strong>' + getWrapPaseShortcutKey() + "+P</strong> o <strong>Ajustes \u2192 Modo de vista \u2192 Pase</strong> cuando quieras ver pendientes, labs y meds en una sola columna.</p>";
  finishNext(nextBtn);
}
var FUNDAMENTOS_STEP_HANDLERS = {
  map_sidebar: renderMapSidebar,
  map_tabs: renderMapTabs,
  map_add_patient: renderMapAddPatient,
  map_incomplete: renderMapIncomplete,
  map_lab_teaser: renderMapLabTeaser,
  lab_parse: renderLabParse,
  lab_view: renderLabView,
  ic_expediente_tabs: renderIcExpedienteTabs,
  sala_expediente_tabs: renderSalaExpedienteTabs,
  ic_nota: renderIcNota,
  ic_indica: renderIcIndica,
  ic_exports: renderIcExports,
  sala_tend: renderSalaTend,
  sala_tend_chart: renderSalaTendChart,
  sala_med: renderSalaMed,
  profile: renderProfile,
  servicio_default: renderServicioDefault,
  estado_actual: renderEstadoActual,
  estado_actual_registro: renderEstadoActualRegistro,
  estado_actual_review: renderEstadoActualReview,
  eventualidades: renderEventualidades,
  listado_problemas: renderListadoProblemas,
  sala_vpo: renderSalaVpo,
  sala_receta_hu: renderSalaRecetaHu,
  sala_agenda: renderSalaAgenda,
  livesync_desktop: renderLivesyncDesktop,
  livesync_mobile: renderLivesyncMobile,
  wrap: renderWrap
};
function renderFundamentosStep(stepId, bodyEl, nextBtn) {
  var handler = FUNDAMENTOS_STEP_HANDLERS[stepId];
  if (!handler) {
    hideTourDock();
    return;
  }
  handler(bodyEl, nextBtn);
}

// public/js/features/settings-help/tour-flow-render.mjs
function syncTourDockBranchClass(branch) {
  var d = document.getElementById("tour-dock");
  if (!d) return;
  d.classList.toggle("tour-dock--guardia", branch === "guardia-v7");
  d.classList.toggle("tour-dock--fundamentos", branch === "sala" || branch === "interconsulta");
  d.classList.toggle("tour-dock--quick-route", branch === "quick-route");
}
function resetTourNextButton(nextBtn) {
  nextBtn.style.display = "";
  nextBtn.disabled = false;
  nextBtn.setAttribute("onclick", "guidedTourClickNext()");
}
function renderQuickRouteStepCopy(bodyEl, nextBtn) {
  var id = tourState.tourStepId;
  if (id === "map_tabs") {
    bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Ruta r\xE1pida: arriba est\xE1n <strong>Paciente</strong>, <strong>Laboratorio</strong>, <strong>Manejo</strong> y <strong>Agenda</strong>. Luego das de alta y procesas labs.</p>';
    nextBtn.textContent = "Siguiente";
    return true;
  }
  if (id === "map_add_patient") {
    bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;"><strong>+ Agregar</strong> da de alta. Completa cuarto, cama y servicio para que la tarjeta no quede incompleta. En el siguiente paso procesas labs demo.</p>';
    nextBtn.textContent = "Siguiente";
    return true;
  }
  if (id === "lab_parse") {
    bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Pulsa <strong>Procesar</strong> y agrega ambos pacientes demo al censo.</p><p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Sin <strong>Siguiente</strong> hasta que ambos tengan laboratorio en historial.</p>';
    nextBtn.style.display = "none";
    return true;
  }
  if (id.indexOf("gv7_") === 0) {
    bodyEl.innerHTML = getGuardiaV7StepHtml(id);
    nextBtn.textContent = "Siguiente";
    return true;
  }
  return false;
}
function renderTourDockBadge(tourBranch, prog, idx, total) {
  var badge = document.getElementById("tour-step-badge");
  if (!badge) return;
  if (tourBranch === "quick-route") {
    badge.innerHTML = '<span class="tour-dock-badge-line tour-dock-badge-kicker">Ruta r\xE1pida</span><span class="tour-dock-badge-line tour-dock-badge-step">Paso ' + prog.stepInChapter + " de " + prog.chapterSteps + "</span>";
    return;
  }
  if (tourBranch === "guardia-v7") {
    badge.innerHTML = '<span class="tour-dock-badge-line tour-dock-badge-kicker">Guardia</span><span class="tour-dock-badge-line tour-dock-badge-module">M\xF3dulo ' + prog.chapterIndex + "/5 \xB7 " + escapeTourHtml(prog.chapterTitle) + '</span><span class="tour-dock-badge-line tour-dock-badge-step">Paso ' + prog.stepInChapter + " de " + prog.chapterSteps + "</span>";
    return;
  }
  var branchLabel = tourBranch === "interconsulta" ? "Interconsulta" : "Sala";
  var sub = "Cap. " + prog.chapterIndex + "/" + prog.chapterCount + " \xB7 " + prog.chapterTitle + " \xB7 paso " + prog.stepInChapter + "/" + prog.chapterSteps;
  badge.innerHTML = '<span class="tour-dock-badge-line tour-dock-badge-module">Paso ' + idx + " de " + total + " \xB7 " + escapeTourHtml(branchLabel) + '</span><span class="tour-dock-badge-line tour-dock-badge-step">' + escapeTourHtml(sub) + "</span>";
}
function finalizeTourStepRender(prevBtn) {
  syncTourDockPlacement();
  syncTourSoapButtonHighlight();
  syncTourActionNextButton();
  armTourActionPoll();
  if (prevBtn) prevBtn.disabled = guidedTourStepIndex() <= 0;
}
function applyTourStepUserActionGate(nextBtn) {
  if (stepRequiresUserAction(tourState.tourStepId) && tourState.tourStepId !== "servicio_default") {
    nextBtn.style.display = "none";
  }
}
function renderQuickRouteWrap(bodyEl, nextBtn, prevBtn) {
  bodyEl.innerHTML = '<p style="margin:0;line-height:1.5;">Listo. Explora m\xE1s en <strong>Aprender R+</strong>: m\xF3dulos de guardia o el tutorial completo en <strong>Fundamentos</strong>.</p>';
  nextBtn.textContent = "Finalizar";
  nextBtn.style.display = "";
  nextBtn.setAttribute("onclick", "guidedTourFinish()");
  finalizeTourStepRender(prevBtn);
}
function renderQuickRouteBranch(bodyEl, nextBtn, prevBtn) {
  var quickHandled = renderQuickRouteStepCopy(bodyEl, nextBtn);
  if (!quickHandled) return false;
  if (stepRequiresUserAction(tourState.tourStepId)) {
    nextBtn.style.display = "none";
  }
  finalizeTourStepRender(prevBtn);
  return true;
}
function renderGuardiaV7Branch(bodyEl, nextBtn, prevBtn) {
  bodyEl.innerHTML = getGuardiaV7StepHtml(tourState.tourStepId);
  var gv7Steps = getGuidedTourSteps();
  var gv7Idx = gv7Steps.indexOf(tourState.tourStepId);
  nextBtn.textContent = gv7Idx >= 0 && gv7Idx >= gv7Steps.length - 1 ? "Finalizar m\xF3dulo" : "Siguiente";
  if (stepRequiresUserAction(tourState.tourStepId)) {
    nextBtn.style.display = "none";
  }
  finalizeTourStepRender(prevBtn);
}
function renderGuardiaOrQuickRouteStep(bodyEl, nextBtn, prevBtn, tourBranch) {
  if (tourBranch !== "guardia-v7" && tourBranch !== "quick-route") return false;
  if (tourBranch === "quick-route" && tourState.tourStepId === "quick_wrap") {
    renderQuickRouteWrap(bodyEl, nextBtn, prevBtn);
    return true;
  }
  if (tourBranch === "quick-route" && renderQuickRouteBranch(bodyEl, nextBtn, prevBtn)) {
    return true;
  }
  renderGuardiaV7Branch(bodyEl, nextBtn, prevBtn);
  return true;
}
function renderTourStep() {
  if (!tourState.guidedTourActive) return;
  var bodyEl = document.getElementById("tour-dock-body");
  var nextBtn = document.getElementById("tour-btn-next");
  var prevBtn = document.getElementById("tour-btn-prev");
  var steps = getGuidedTourSteps();
  var total = steps.length;
  var idx = guidedTourStepIndex() + 1;
  var tourBranch = resolveTourBranch();
  syncTourDockBranchClass(tourBranch);
  var prog = getChapterProgressLabel(tourState.tourStepId, tourBranch);
  renderTourDockBadge(tourBranch, prog, idx, total);
  resetTourNextButton(nextBtn);
  if (renderGuardiaOrQuickRouteStep(bodyEl, nextBtn, prevBtn, tourBranch)) {
    return;
  }
  renderFundamentosStep(tourState.tourStepId, bodyEl, nextBtn);
  applyTourStepUserActionGate(nextBtn);
  finalizeTourStepRender(prevBtn);
}

// public/js/features/settings-help/tour-flow-chapter.mjs
var rt6 = getSettingsHelpRuntime();
function clearGuidedTourModuleScope() {
  tourState.guidedTourChapterScope = null;
  tourState.guidedTourModuleOnly = false;
}
function maybeMarkFundamentosChapterComplete(stepId) {
  const branch = tourState.guidedTourBranch;
  if (branch !== "sala" && branch !== "interconsulta") return;
  const tourBranch = branch === "interconsulta" ? "interconsulta" : "sala";
  const chapter = getChapterForStep(stepId, tourBranch);
  if (!chapter?.id || chapter.id === "unknown") return;
  const stepsInChapter = getChapterProgressLabel(stepId, tourBranch);
  if (stepsInChapter.stepInChapter !== stepsInChapter.chapterSteps) return;
  void import("/mobile/js/chunks/fundamentos-progress-ACKCGFNQ.js").then((m) => {
    if (!m.isFundamentosChapterId(chapter.id)) return;
    const result = m.markFundamentosChapterComplete(chapter.id);
    if (!result.wasNew) return;
    if (chapter.id === "ch-map") {
      rt6.showToast("Ya sabes d\xF3nde est\xE1 cada cosa y c\xF3mo dar de alta.", "success");
    } else if (chapter.id === "ch-patient-lab") {
      rt6.showToast("Listo: DEMO P\xC9REZ ya tiene laboratorio en R+.", "success");
    } else {
      rt6.showToast(`M\xF3dulo completado: ${chapter.title}`, "success");
    }
  });
}
function maybeMarkGuardiaV7ChapterComplete(stepId) {
  if (tourState.guidedTourBranch !== "guardia-v7") return;
  const branch = "guardia-v7";
  const chapter = getChapterForStep(stepId, branch);
  if (!chapter || !chapter.id || chapter.id === "unknown") return;
  const stepsInChapter = getChapterProgressLabel(stepId, branch);
  if (stepsInChapter.stepInChapter !== stepsInChapter.chapterSteps) return;
  void import("/mobile/js/chunks/guardia-v7-progress-VWRW4Z5U.js").then((m) => {
    const result = m.markGuardiaV7ChapterComplete(chapter.id);
    if (!result.wasNew) return;
    rt6.launchConfetti();
    rt6.showToast(`M\xF3dulo completado: ${chapter.title}`, "success");
    syncLearnHubContinueVisibility();
    if (m.isGuardiaV7TrackComplete()) {
      void import("/mobile/js/chunks/guardia-board-chrome-Z4FEWOVV.js").then((chrome) => {
        chrome.syncGuardiaLearnNudgeChrome?.();
      });
      window.setTimeout(() => {
        rt6.showToast("\xA1Gu\xEDa de guardia completada!", "success");
      }, 500);
    }
  });
}

// public/js/features/settings-help/tour-flow-demo-cleanup.mjs
var rt7 = getSettingsHelpRuntime();
function destroyDemoAndClose() {
  closeLabBulkTourHintModal();
  purgeTourDemoPatientsFromState();
  tourState.guidedTourActive = false;
  tourState.tourStepId = null;
  tourState.guidedTourBranch = null;
  publishTourGuardContext();
  hideTourDock();
  if (isTourDemoPatientId(rt7.getActiveId(), getPatients())) {
    rt7.setActiveId(getPatients().length ? getPatients()[0].id : null);
  }
  limpiarReporte();
  persistClinicalState();
  renderPatientList();
  if (rt7.getActiveId()) selectPatient(rt7.getActiveId());
  else {
    var pv = document.getElementById("patient-view");
    var es = document.getElementById("empty-state");
    if (pv) pv.style.display = "none";
    if (es) es.style.display = "flex";
  }
}

// public/js/features/settings-help/tour-bridge.mjs
var tourBridge = {
  miniTourNext() {
  },
  endMiniTour() {
  }
};

// public/js/features/settings-help/tour-flow-lifecycle.mjs
var rt8 = getSettingsHelpRuntime();
var postTourResumeBranch = null;
function prepareSalaGuidedTourExitSync() {
  if (!isClinicalSyncModeChosen(readRpcSettings())) {
    setClinicalSyncModeLocalOnly(false);
  }
  hideMainClinicalOnboarding();
}
async function handlePostGuidedTourOnboardingResume() {
  const branch = postTourResumeBranch;
  postTourResumeBranch = null;
  if (branch === "sala") {
    prepareSalaGuidedTourExitSync();
    await promptMiRotacionAfterSalaTourIfNeeded("sala");
    return;
  }
  const main = await import("/mobile/js/chunks/clinical-onboarding-main-H75X5GZK.js");
  if (main && typeof main.refreshMainClinicalOnboardingIfNeeded === "function") {
    await main.refreshMainClinicalOnboardingIfNeeded();
  }
}
async function promptMiRotacionAfterSalaTourIfNeeded(branch) {
  if (branch !== "sala") return;
  const { isClinicalLocalOnlyMode, readRpcSettings: readRpcSettings2 } = await import("/mobile/js/chunks/clinical-settings-7XQJIPLW.js");
  if (isClinicalLocalOnlyMode(readRpcSettings2())) return;
  const { needsTeamOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-5SWDFJP6.js");
  if (!needsTeamOnboarding()) return;
  rt8.showToast(
    "\xDAnete a un equipo en \u21C4 Conexi\xF3n \u2192 Opciones \u2192 Equipo. Si acabas de rotar, confirma sala y revisa si debes heredar pacientes de tu equipo anterior.",
    "info"
  );
  const { ensureClinicalPanelSession } = await import("/mobile/js/chunks/clinical-panel-host-W7VFSHKH.js");
  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    rt8.showToast("Cuando la sesi\xF3n est\xE9 lista, abre \u21C4 Conexi\xF3n \u2192 Opciones \u2192 Equipo.", "warning");
    return;
  }
  try {
    const { wireClinicalTeamsModalChrome } = await import("/mobile/js/chunks/teams-roster-modal-chrome-KNKEM7IH.js");
    wireClinicalTeamsModalChrome();
    const { openClinicalTeamsPanel } = await import("/mobile/js/chunks/teams-roster-EPQZ33ZN.js");
    await openClinicalTeamsPanel({ skipProfileGate: true });
  } catch (err) {
    console.warn("[R+] Mi rotaci\xF3n tras tutorial Sala:", err && err.message);
    const { openMiRotacion } = await import("/mobile/js/chunks/clinical-rotation-entry-KWXHGOOS.js");
    await openMiRotacion();
  }
}
function completeGuidedTourWithCelebration() {
  const completedBranch = tourState.guidedTourBranch;
  if (tourState.tourStepId) {
    if (completedBranch === "guardia-v7") maybeMarkGuardiaV7ChapterComplete(tourState.tourStepId);
    if (completedBranch === "sala" || completedBranch === "interconsulta") {
      maybeMarkFundamentosChapterComplete(tourState.tourStepId);
    }
  }
  clearTourProgress();
  markGuidedTourVersionDone();
  tourState.guidedTourActive = false;
  tourState.tourStepId = null;
  postTourResumeBranch = completedBranch;
  tourState.guidedTourBranch = null;
  tourState.guidedTourMode = "base";
  clearGuidedTourModuleScope();
  if (completedBranch === "sala") prepareSalaGuidedTourExitSync();
  publishTourGuardContext();
  hideTourDock();
  if (completedBranch !== "guardia-v7") {
    rt8.launchConfetti();
    rt8.showToast("Tutorial completado", "success");
  }
  if (completedBranch !== "guardia-v7") safeDestroyDemoAndClose();
  syncLearnHubContinueVisibility();
}
function safeDestroyDemoAndClose() {
  try {
    destroyDemoAndClose();
  } catch (err) {
    console.error("[R+] destroyDemoAndClose:", err && err.message);
    tourState.guidedTourActive = false;
    tourState.tourStepId = null;
    tourState.guidedTourBranch = null;
    publishTourGuardContext();
    hideTourDock();
  }
}
function finishGuidedTour() {
  if (tourState.miniTourActive) {
    tourBridge.endMiniTour();
    return;
  }
  if (!tourState.guidedTourActive) return;
  try {
    completeGuidedTourWithCelebration();
  } catch (err) {
    console.error("[R+] finishGuidedTour:", err && err.message);
    clearTourProgress();
    markGuidedTourVersionDone();
    tourState.guidedTourActive = false;
    tourState.tourStepId = null;
    tourState.guidedTourBranch = null;
    tourState.guidedTourMode = "base";
    clearGuidedTourModuleScope();
    publishTourGuardContext();
    hideTourDock();
    safeDestroyDemoAndClose();
    rt8.showToast("Tutorial finalizado", "success");
    syncLearnHubContinueVisibility();
  }
}
function skipGuidedTour() {
  if (tourState.miniTourActive) {
    tourBridge.endMiniTour();
    return;
  }
  const skippedBranch = tourState.guidedTourBranch;
  clearTourProgress();
  markGuidedTourVersionDone();
  tourState.guidedTourActive = false;
  tourState.tourStepId = null;
  postTourResumeBranch = skippedBranch;
  tourState.guidedTourBranch = null;
  tourState.guidedTourMode = "base";
  clearGuidedTourModuleScope();
  if (skippedBranch === "sala") prepareSalaGuidedTourExitSync();
  publishTourGuardContext();
  hideTourDock();
  safeDestroyDemoAndClose();
  syncLearnHubContinueVisibility();
}

// public/js/features/settings-help/tour-flow-navigation.mjs
var rt9 = getSettingsHelpRuntime();
function guidedTourClickPrev() {
  if (!tourState.guidedTourActive || tourState.miniTourActive) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourState.tourStepId);
  if (i <= 0) return;
  clearAllTourSpotlights();
  tourState.tourStepId = steps[i - 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
}
function guidedTourPause() {
  if (!tourState.guidedTourActive) return;
  var branch = resolveTourBranch();
  var ch = getChapterForStep(tourState.tourStepId, branch);
  saveTourProgress({
    branch,
    track: branch,
    stepId: tourState.tourStepId,
    chapterId: ch.id,
    moduleOnly: tourState.guidedTourModuleOnly,
    mode: tourState.guidedTourMode
  });
  tourState.guidedTourActive = false;
  publishTourGuardContext();
  hideTourDock();
  rt9.showToast("Tutorial pausado. Contin\xFAa desde Aprender R+.", "info");
  syncLearnHubContinueVisibility();
}
function guidedTourClickNext() {
  if (tourState.miniTourActive) {
    tourBridge.miniTourNext();
    return;
  }
  if (!tourState.guidedTourActive) return;
  if (tourState.tourStepId === "wrap" || tourState.tourStepId === "quick_wrap") {
    finishGuidedTour();
    return;
  }
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourState.tourStepId);
  if (i < 0) return;
  if (tourState.tourStepId === "lab_bulk_separator") {
    closeLabBulkTourHintModal();
  }
  if (tourState.tourStepId === "estado_actual" || tourState.tourStepId === "estado_actual_registro") {
    closeSOAPModal();
  }
  maybeMarkFundamentosChapterComplete(tourState.tourStepId);
  maybeMarkGuardiaV7ChapterComplete(tourState.tourStepId);
  if (i + 1 >= steps.length) {
    finishGuidedTour();
    return;
  }
  clearAllTourSpotlights();
  tourState.tourStepId = steps[i + 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
}
function getGuidedTourContext() {
  return { active: tourState.guidedTourActive, stepId: tourState.tourStepId };
}
function guidedTourAdvanceAfter(actionStep) {
  if (!tourState.guidedTourActive || tourState.tourStepId !== actionStep) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(actionStep);
  if (i < 0 || i + 1 >= steps.length) return;
  clearAllTourSpotlights();
  tourState.tourStepId = steps[i + 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
  publishTourGuardContext();
  persistTourProgressDebounced();
  if (actionStep === "lab_parse") syncTourActionNextButton();
}
function guidedTourAdvanceAfterNotaGenerated() {
  guidedTourAdvanceAfter("ic_nota");
}
function guidedTourAdvanceAfterIndicaGenerated() {
  guidedTourAdvanceAfter("ic_indica");
}

// public/js/features/settings-help/tour-flow-onboarding.mjs
var rt10 = getSettingsHelpRuntime();
function resolveTourBranch2(branch) {
  if (branch === "interconsulta") return "interconsulta";
  if (branch === "guardia-v7") return "guardia-v7";
  if (branch === "quick-route") return "quick-route";
  return "sala";
}
function setupNonGuardiaTourMode() {
  setUiDensity("normal");
  var st = rt10.getSettings();
  var prevMode = st.appMode;
  st.appMode = tourState.guidedTourBranch === "interconsulta" ? "interconsulta" : "sala";
  if (st.appMode !== prevMode) {
    try {
      localStorage.setItem("rpc-settings", JSON.stringify(st));
    } catch (_e) {
      void _e;
    }
    applyAppModeSwitchEffects();
    rt10.renderEstadoActualBar();
  }
  tourState.tourDemoLabSessionProcessed = false;
  purgeTourDemoPatientsFromState();
}
function resetTourDemoPatientSelection() {
  if (!isTourDemoPatientId(rt10.getActiveId(), getPatients())) return;
  rt10.setActiveId(getPatients().length ? getPatients()[0].id : null);
  if (rt10.getActiveId()) {
    selectPatient(rt10.getActiveId());
    return;
  }
  var pv0 = document.getElementById("patient-view");
  var es0 = document.getElementById("empty-state");
  if (pv0) pv0.style.display = "none";
  if (es0) es0.style.display = "flex";
}
function resolveTourStartStep(opts) {
  var steps = getGuidedTourSteps();
  var resumeId = opts.resumeStepId;
  if (resumeId && steps.indexOf(resumeId) >= 0) return resumeId;
  return steps[0] || "map_sidebar";
}
function startOnboarding(branch, opts) {
  opts = opts || {};
  if (opts.resumeStepId) resetTourUiBeforeResume();
  tourState.guidedTourBranch = resolveTourBranch2(branch);
  var isGuardiaV7 = tourState.guidedTourBranch === "guardia-v7";
  if (!opts.resumeStepId) {
    tourState.guidedTourChapterScope = null;
    tourState.guidedTourModuleOnly = false;
  }
  if (!isGuardiaV7) setupNonGuardiaTourMode();
  tourState.guidedTourActive = true;
  tourState.tourStepId = resolveTourStartStep(opts);
  renderPatientList();
  resetTourDemoPatientSelection();
  function finishTourStart() {
    applyTourTargetForStep(tourState.tourStepId);
    showTourDock();
    renderTourStep();
    publishTourGuardContext();
    if (opts.resumeStepId) persistTourProgressDebounced();
  }
  if (opts.resumeStepId) {
    setTimeout(finishTourStart, 0);
  } else {
    finishTourStart();
  }
}
function findTourDemoBlockForRegistro(blocks, registro) {
  var reg = String(registro || "").trim();
  if (!reg || !blocks) return null;
  if (findTourDemoPatientByRegistro(getPatients(), reg)) return null;
  return blocks.find(function(b) {
    if (!b || !b.okReportCount) return false;
    if (String(b.primaryExpediente || "").trim() !== reg) return false;
    return b.status === "no-patient" || !b.patient;
  }) || null;
}
var tourLabRegistrationTimer = null;
function getTourLabPasteTextForRegistration() {
  var ta = document.getElementById("lab-input");
  var text = ta ? String(ta.value || "").trim() : "";
  if (text) return text;
  if (typeof rt10.getBulkLabPreviewSourceText === "function") {
    return String(rt10.getBulkLabPreviewSourceText() || "").trim();
  }
  return "";
}
function runTourDemoPatientRegistrationFromLab() {
  if (!tourState.guidedTourActive || tourState.tourStepId !== "lab_parse") return;
  if (tourDemoPatientsBothInCensus(getPatients())) return;
  if (typeof rt10.openAddModalFromLabPatient !== "function") return;
  var text = getTourLabPasteTextForRegistration();
  if (!text) return;
  var blocks = buildBulkLabPreview(text, { findPatientByRegistro: rt10.findPatientByRegistro });
  openNextTourDemoPatientFromBlocks(blocks);
}
function scheduleTourDemoPatientRegistrationFromLab() {
  if (tourLabRegistrationTimer) clearTimeout(tourLabRegistrationTimer);
  tourLabRegistrationTimer = setTimeout(function() {
    tourLabRegistrationTimer = null;
    runTourDemoPatientRegistrationFromLab();
  }, 280);
}
function openNextTourDemoPatientFromBlocks(blocks) {
  var regs = [DEMO_REGISTRO, DEMO_REGISTRO_2];
  for (var i = 0; i < regs.length; i++) {
    var reg = regs[i];
    if (findTourDemoPatientByRegistro(getPatients(), reg)) continue;
    var block = findTourDemoBlockForRegistro(blocks, reg);
    if (!block) continue;
    var labPatient = extractLabPatientFromBulkBlock(block);
    if (!labPatient) continue;
    rt10.openAddModalFromLabPatient(labPatient, {
      onSaved: function() {
        scheduleTourDemoPatientRegistrationFromLab();
      }
    });
    return;
  }
}
function onboardingAdvanceAfterParse() {
  if (!tourState.guidedTourActive || tourState.tourStepId !== "lab_parse") return;
  if (!tourDemoLabCompleteForTour(getPatients(), getLabHistory())) {
    syncTourActionNextButton();
    return;
  }
  tourState.tourDemoLabSessionProcessed = true;
  ensureTourPrimaryDemoPatientActive();
  clearAllTourSpotlights();
  tourState.tourStepId = "lab_view";
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
  persistTourProgressDebounced();
  syncTourActionNextButton();
}
function onboardingAdvanceAfterSend() {
  if (!tourState.guidedTourActive) return;
  if (tourState.tourStepId !== "lab_view") return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf("lab_view");
  if (i < 0 || i + 1 >= steps.length) return;
  clearAllTourSpotlights();
  tourState.tourStepId = steps[i + 1];
  publishTourGuardContext();
  applyTourTargetForStep(tourState.tourStepId);
  renderTourStep();
}
function tourAfterBulkLabParse(_blocks) {
  if (!tourState.guidedTourActive || tourState.tourStepId !== "lab_parse") return;
  if (!tourDemoPatientsBothInCensus(getPatients())) {
    if (typeof rt10.isBulkLabPreviewModalOpen === "function" && rt10.isBulkLabPreviewModalOpen()) {
      return;
    }
    scheduleTourDemoPatientRegistrationFromLab();
    return;
  }
  onboardingAdvanceAfterParse();
  syncTourActionNextButton();
}
function tourOnBulkPreviewPatientSaved() {
  if (!tourState.guidedTourActive || tourState.tourStepId !== "lab_parse") return;
  if (tourDemoPatientsBothInCensus(getPatients())) {
    rt10.showToast("Pacientes demo listos. Pulsa Procesar todo en la vista previa.", "success");
    return;
  }
  rt10.showToast("Registra al otro paciente con Agregar paciente en la tabla.", "info");
}
function resetAndStartOnboarding() {
  rt10.closeProfileModal();
  closeSettingsDropdown();
  try {
    localStorage.removeItem(GUIDED_TOUR_LS_KEY);
  } catch (_e) {
    void _e;
  }
  try {
    purgeTourDemoPatientsFromState();
    tourState.guidedTourActive = false;
    tourState.tourStepId = null;
    tourState.guidedTourBranch = null;
    publishTourGuardContext();
    hideTourDock();
    hideTourIntroModal();
    limpiarReporte();
    persistClinicalState();
    if (isTourDemoPatientId(rt10.getActiveId(), getPatients())) {
      rt10.setActiveId(getPatients().length ? getPatients()[0].id : null);
    }
    renderPatientList();
    if (rt10.getActiveId()) selectPatient(rt10.getActiveId());
    else {
      var pv = document.getElementById("patient-view");
      var es = document.getElementById("empty-state");
      if (pv) pv.style.display = "none";
      if (es) es.style.display = "flex";
    }
  } catch (err) {
    console.error("resetAndStartOnboarding cleanup:", err && err.message);
  }
  void openTutorialIntroFromSettings();
}

// public/js/features/settings-help/tour-flow-resume.mjs
function resumeGuidedTourFromProgress() {
  var p = loadTourProgress();
  if (!p) return false;
  tourState.guidedTourBranch = p.branch === "interconsulta" ? "interconsulta" : p.branch === "guardia-v7" ? "guardia-v7" : p.branch === "quick-route" ? "quick-route" : "sala";
  tourState.guidedTourMode = "base";
  tourState.guidedTourModuleOnly = !!p.moduleOnly;
  tourState.guidedTourChapterScope = p.moduleOnly ? p.chapterId || null : null;
  resetTourUiBeforeResume();
  startOnboarding(tourState.guidedTourBranch, { resumeStepId: p.stepId, skipIntro: true });
  return true;
}

// public/js/features/tendencias-ui-shell.mjs
var tendGroupModal = null;
function closeTendGroupModal() {
  var ctx = getGuidedTourContext();
  var advanceTourAfterChart = ctx.active && ctx.stepId === "sala_tend_chart";
  if (tendGroupModal) tendGroupModal.close();
  if (advanceTourAfterChart) guidedTourAdvanceAfter("sala_tend_chart");
}
var tendGroupModalInitPromise = null;
function initTendGroupModal() {
  if (tendGroupModal) return Promise.resolve(tendGroupModal);
  if (tendGroupModalInitPromise) return tendGroupModalInitPromise;
  tendGroupModalInitPromise = loadChartJs().then(function(Chart) {
    if (tendGroupModal) return tendGroupModal;
    tendGroupModal = createTendGroupModal({
      onRequestClose: closeTendGroupModal,
      getActiveId: function() {
        return aid();
      },
      getHistory: function() {
        var pid = aid();
        return pid ? tendParsedHistoryDesc(pid) : [];
      },
      getSectionLabel: getTendSectionLabel,
      getCatalogSpecs: getTendCatalogSpecsForSection,
      buildMergedTrendSeriesCatalog,
      tendUnitForSeries,
      tendRefFromLabSet,
      tendRefForSeries,
      buildColHeader: function(set) {
        return rt.buildLabSetDateLine(set);
      },
      esc,
      Chart,
      showToast: function(a, b) {
        rt.showToast(a, b);
      }
    });
    return tendGroupModal;
  }).catch(function(err) {
    tendGroupModalInitPromise = null;
    console.error("[R+ Tendencias] tend-group Chart.js", err);
    rt.showToast("Gr\xE1fica no disponible (Chart.js no carg\xF3). Recarga la app.", "error");
    throw err;
  });
  return tendGroupModalInitPromise;
}
function openTendGroupModal(sectionKey) {
  void initTendGroupModal().then(function(modal) {
    if (modal) modal.open(sectionKey);
  }).catch(function() {
  });
}
function openTendGasoExtendedModal() {
  if (isAbgAnalysisHidden()) {
    rt.showToast("El an\xE1lisis de gasometr\xEDa no est\xE1 disponible en R+.", "info");
    return;
  }
  void initTendGroupModal().then(function(modal) {
    if (modal) modal.openGasoExtended();
  });
}
function setTendGroupTab2(name) {
  initTendGroupModal();
  tendGroupModal.setTab(name);
}
function copyTendGroupTablePng2() {
  initTendGroupModal();
  tendGroupModal.copyTablePng();
}
function copyTendGroupTableText2() {
  initTendGroupModal();
  tendGroupModal.copyTableText();
}
function tendSectionChartSvg() {
  return '<svg class="tend-section-chart-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-10"/><path d="M3 12l5-4 4 3 9-7"/></svg>';
}
function destroyTendCardSortables() {
  tendStore._tendCardSortables.forEach(function(s) {
    try {
      if (s && typeof s.destroy === "function") s.destroy();
    } catch (_e) {
      void _e;
    }
  });
  tendStore._tendCardSortables = [];
}
function syncTendCardOrderFromDom(sectionKey) {
  if (!aid() || !sectionKey) return;
  var zone = null;
  document.querySelectorAll(".tend-sort-zone[data-section-key]").forEach(function(el) {
    if (el.getAttribute("data-section-key") === sectionKey) zone = el;
  });
  if (!zone) return;
  var order = [];
  zone.querySelectorAll(".tend-card[data-series-key]").forEach(function(el) {
    var k = el.getAttribute("data-series-key");
    if (k) order.push(k);
  });
  if (order.length) writeTendCardOrder(aid(), sectionKey, order);
}
var _tendPointerDidDrag = false;
var TEND_CARD_DRAG_THRESHOLD_PX = 5;
var _tendenciasClickDelegationWired = false;
var _tendHiddenModalWired = false;
function ensureTendHiddenModalDelegation() {
  if (_tendHiddenModalWired) return;
  var hiddenBackdrop = document.getElementById("tend-hidden-modal-backdrop");
  if (!hiddenBackdrop) {
    if (typeof document !== "undefined" && document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ensureTendHiddenModalDelegation, {
        once: true
      });
    }
    return;
  }
  _tendHiddenModalWired = true;
  hiddenBackdrop.addEventListener("click", onTendHiddenBackdropClick);
  var panel = hiddenBackdrop.querySelector(".tend-hidden-modal");
  if (panel) panel.addEventListener("click", onTendHiddenModalPanelClick);
  var resetBtn = hiddenBackdrop.querySelector('[data-tend-action="reset-hidden"]');
  if (!resetBtn) {
    resetBtn = hiddenBackdrop.querySelector(".modal-actions .btn-save");
    if (resetBtn) resetBtn.setAttribute("data-tend-action", "reset-hidden");
  }
}
function onTendHiddenBackdropClick(ev) {
  if (ev.target === ev.currentTarget) closeTendHiddenModal();
}
function onTendHiddenModalPanelClick(ev) {
  var t = ev.target;
  if (!t || !t.closest) return;
  var resetBtn = t.closest('[data-tend-action="reset-hidden"]');
  if (resetBtn) {
    ev.preventDefault();
    tendResetAllHiddenSeries();
    return;
  }
  var chip = t.closest(".tend-hidden-chip");
  if (chip) {
    var seriesKey = chip.getAttribute("data-series-key");
    if (seriesKey) {
      var pipe = seriesKey.indexOf("|");
      if (pipe > 0) {
        ev.preventDefault();
        tendUnhideSeries(seriesKey.slice(0, pipe), seriesKey.slice(pipe + 1));
      }
    }
  }
}
function ensureTendenciasClickDelegation() {
  if (_tendenciasClickDelegationWired) return;
  var root = document.getElementById("tendencias-container");
  if (!root) {
    if (typeof document !== "undefined" && document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ensureTendenciasClickDelegation, {
        once: true
      });
    }
    return;
  }
  _tendenciasClickDelegationWired = true;
  root.addEventListener("click", onTendenciasContainerClick);
}
function handleTendenciasToolbarClick(t, ev) {
  if (t.closest(".tend-toolbar-toggle")) {
    ev.preventDefault();
    toggleTendAbnormalOnlyFilter();
    return true;
  }
  if (t.closest(".tend-ocultos-trigger")) {
    ev.preventDefault();
    openTendHiddenModal();
    return true;
  }
  if (t.closest('[data-tend-action="gaso-extended"]')) {
    ev.preventDefault();
    openTendGasoExtendedModal();
    return true;
  }
  return false;
}
function handleTendenciasSectionClick(t, ev) {
  var sectionToggle = t.closest(".tend-section-toggle");
  if (sectionToggle) {
    var sectionEl = sectionToggle.closest(".tend-section");
    var sk = sectionEl && sectionEl.getAttribute("data-section");
    if (sk) toggleTendSection(ev, sk);
    return true;
  }
  var chartBtn = t.closest(".tend-section-chart-btn");
  if (chartBtn) {
    var sectionEl2 = chartBtn.closest(".tend-section");
    var sk2 = sectionEl2 && sectionEl2.getAttribute("data-section");
    if (sk2) openTendGroupModal(sk2);
    return true;
  }
  return false;
}
function handleTendenciasCardClick(t, ev) {
  var hideCardBtn = t.closest(".tend-card-hide-btn");
  if (hideCardBtn) {
    var hideCard = hideCardBtn.closest(".tend-card");
    var hideKey = hideCard && hideCard.getAttribute("data-series-key");
    if (hideKey) {
      var hidePipe = hideKey.indexOf("|");
      if (hidePipe > 0) {
        ev.preventDefault();
        ev.stopPropagation();
        tendHideSeriesFromCard(ev, hideKey.slice(0, hidePipe), hideKey.slice(hidePipe + 1));
      }
    }
    return true;
  }
  var card = t.closest(".tend-card");
  if (!card) return false;
  var key = card.getAttribute("data-series-key");
  if (!key) return false;
  var p = key.indexOf("|");
  if (p > 0) tendCardActivate(ev, key.slice(0, p), key.slice(p + 1));
  return true;
}
function onTendenciasContainerClick(ev) {
  var t = ev.target;
  if (!t || !t.closest) return;
  if (handleTendenciasToolbarClick(t, ev)) return;
  if (handleTendenciasSectionClick(t, ev)) return;
  handleTendenciasCardClick(t, ev);
}
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
function findInsertInCardBounds(cards, clientX, clientY) {
  for (var i = 0; i < cards.length; i++) {
    var r = cards[i].getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue;
    if (clientX < r.left + r.width * 0.5) return cards[i];
    return cards[i + 1] || null;
  }
  return void 0;
}
function findInsertInRowGap(cards, clientX, clientY) {
  for (var i = 0; i < cards.length - 1; i++) {
    var ra = cards[i].getBoundingClientRect();
    var rb = cards[i + 1].getBoundingClientRect();
    var sameRow = Math.abs(ra.top - rb.top) < Math.min(ra.height, rb.height) * 0.45;
    if (!sameRow) continue;
    if (clientX > ra.right && clientX < rb.left && clientY >= Math.min(ra.top, rb.top) - 10 && clientY <= Math.max(ra.bottom, rb.bottom) + 10) {
      return cards[i + 1];
    }
  }
  return void 0;
}
function findTendInsertBeforeCard(cards, clientX, clientY) {
  var inBounds = findInsertInCardBounds(cards, clientX, clientY);
  if (inBounds !== void 0) return inBounds;
  var inGap = findInsertInRowGap(cards, clientX, clientY);
  if (inGap !== void 0) return inGap;
  for (var i = 0; i < cards.length; i++) {
    var rj = cards[i].getBoundingClientRect();
    if (clientY < rj.top + rj.height * 0.5) return cards[i];
  }
  return null;
}
function tendDragBeginVisuals(state) {
  if (!state || state.ghost) return;
  var card = state.card;
  var rect = card.getBoundingClientRect();
  var ghost = card.cloneNode(true);
  ghost.classList.add("tend-drag-hovercard");
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.cssText = "position:fixed;left:" + rect.left + "px;top:" + rect.top + "px;width:" + rect.width + "px;height:" + rect.height + "px;margin:0;box-sizing:border-box;pointer-events:none;z-index:10060;transition:none;opacity:1";
  document.body.appendChild(ghost);
  card.classList.add("tend-card--sort-source");
  state.ghost = ghost;
  state.offsetX = state.startX - rect.left;
  state.offsetY = state.startY - rect.top;
}
function tendDragClearState(state) {
  if (!state) return;
  if (state.ghost && state.ghost.parentNode) state.ghost.parentNode.removeChild(state.ghost);
  state.card.classList.remove("tend-card--sort-source");
  state.card.style.width = "";
  state.card.style.maxWidth = "";
}
function tendDragHandleMove(state, zone, scrollRoot, zoneCards, e) {
  if (!state || e.pointerId !== state.pointerId) return;
  var dx = e.clientX - state.startX;
  var dy = e.clientY - state.startY;
  if (!state.moved) {
    if (dx * dx + dy * dy < TEND_CARD_DRAG_THRESHOLD_PX * TEND_CARD_DRAG_THRESHOLD_PX) return;
    state.moved = true;
    tendDragBeginVisuals(state);
  }
  if (!state.ghost) return;
  state.ghost.style.left = e.clientX - state.offsetX + "px";
  state.ghost.style.top = e.clientY - state.offsetY + "px";
  var cards = zoneCards().filter(function(c) {
    return c !== state.card;
  });
  var before = cards.length ? findTendInsertBeforeCard(cards, e.clientX, e.clientY) : null;
  if (before) zone.insertBefore(state.card, before);
  else zone.appendChild(state.card);
  if (!scrollRoot) return;
  var sr = scrollRoot.getBoundingClientRect();
  if (e.clientY < sr.top + 54) scrollRoot.scrollTop -= 9;
  else if (e.clientY > sr.bottom - 54) scrollRoot.scrollTop += 9;
}
function tendDragHandleUp(state, zone, sectionKey, e, cleanup) {
  if (!state || e.pointerId !== state.pointerId) return;
  cleanup();
  if (state.moved) {
    syncTendCardOrderFromDom(sectionKey);
    _tendPointerDidDrag = true;
  }
  tendDragClearState(state);
}
function createTendCardDragState(zone, scrollRoot, sectionKey) {
  var state = null;
  function zoneCards() {
    return Array.prototype.slice.call(zone.children).filter(function(el) {
      return el.classList && el.classList.contains("tend-card") && el.hasAttribute("data-series-key");
    });
  }
  function cleanupListeners() {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
  }
  function onPointerMove(e) {
    tendDragHandleMove(state, zone, scrollRoot, zoneCards, e);
  }
  function onPointerUp(e) {
    tendDragHandleUp(state, zone, sectionKey, e, cleanupListeners);
    state = null;
  }
  function onPointerDown(e) {
    if (state || e.button !== 0) return;
    if (e.target.closest("button, a[href], input, textarea, select")) return;
    var card = e.target.closest(".tend-card");
    if (!card || !zone.contains(card)) return;
    state = {
      card,
      ghost: null,
      pointerId: e.pointerId,
      offsetX: 0,
      offsetY: 0,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  }
  zone.addEventListener("pointerdown", onPointerDown);
  return {
    destroy: function() {
      zone.removeEventListener("pointerdown", onPointerDown);
      cleanupListeners();
      if (state) tendDragClearState(state);
      state = null;
    }
  };
}
function mountTendCardPointerSort(zone, sectionKey) {
  var scrollRoot = document.getElementById("tendencias-container");
  return createTendCardDragState(zone, scrollRoot, sectionKey);
}
function mountTendCardSortables() {
  destroyTendCardSortables();
  if (!aid()) return;
  document.querySelectorAll(".tend-sort-zone[data-section-key]").forEach(function(zone) {
    var sectionKey = zone.getAttribute("data-section-key");
    if (!sectionKey || !zone.querySelector(".tend-card")) return;
    tendStore._tendCardSortables.push(mountTendCardPointerSort(zone, sectionKey));
  });
}
function syncTendHiddenModalIfOpen() {
  var bd = document.getElementById("tend-hidden-modal-backdrop");
  if (bd && bd.classList.contains("open")) {
    refreshTendHiddenModalContent();
  }
}
function isTendGroupModalOpen() {
  return !!(tendGroupModal && tendGroupModal.isOpen());
}

// public/js/features/tendencias-render-body.mjs
function buildTendRenderKey(patientId, revision, prefsHash, sectionsExpanded) {
  return [patientId, revision, prefsHash, sectionsExpanded].join("::");
}
function tendPrefsHash() {
  return String(tendAbnormalOnlyRead()) + "|" + String(tendHiddenSeriesRead().join(","));
}
function tendExpandedSectionsKey() {
  return TEND_SECTION_ORDER.filter(function(sk) {
    return tendSectionIsExpanded(sk);
  }).join(",");
}
function resetTendRenderEmpty(container, message) {
  tendStore._tendRenderState.key = null;
  tendStore._tendRenderState.seriesKeys = [];
  closeTendHiddenModal();
  container.innerHTML = '<p class="tend-empty">' + message + "</p>";
}
function collectSeriesAvailability(mergedCatalog, seriesIndex, abnormalOnly) {
  var seriesAvail = [];
  for (var ci = 0; ci < mergedCatalog.length; ci++) {
    var sp = mergedCatalog[ci];
    if (tendSeriesIsUserHidden(sp.sectionKey, sp.fieldKey)) continue;
    var idxAvail = seriesIndex[tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
    if (!idxAvail || idxAvail.setsDesc.length < 2) continue;
    seriesAvail.push(sp);
  }
  var full = seriesAvail.slice();
  if (abnormalOnly) {
    seriesAvail = seriesAvail.filter(function(sp2) {
      var idxAb = seriesIndex[tendCatalogSeriesKey(sp2.sectionKey, sp2.fieldKey)];
      return idxAb && idxAb.isAbnormal;
    });
  }
  return { seriesAvail, seriesAvailFull: full };
}
function renderTendenciasEmptyState(container, toolbarHtml, mergedCatalog, seriesIndex, abnormalOnly, seriesAvailFull) {
  var anyData = mergedCatalog.some(function(sp) {
    var idxAny = seriesIndex[tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
    return idxAny && idxAny.setsDesc.length >= 2;
  });
  var hiddenAll = anyData && !mergedCatalog.some(function(sp) {
    if (tendSeriesIsUserHidden(sp.sectionKey, sp.fieldKey)) return false;
    var idxVis = seriesIndex[tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey)];
    return idxVis && idxVis.setsDesc.length >= 2;
  });
  if (abnormalOnly && seriesAvailFull.length) {
    container.innerHTML = toolbarHtml + '<p class="tend-empty">Ning\xFAn analito est\xE1 fuera de rango de referencia (o no tiene referencia en el reporte). Pulsa <strong>Ver todas</strong> (tooltip en el bot\xF3n) para volver a la vista completa.</p>';
  } else if (hiddenAll) {
    container.innerHTML = toolbarHtml + '<p class="tend-empty">Los analitos con datos est\xE1n <strong>ocultos</strong>. Pulsa <strong>Ocultos</strong> y restaura con el ojo o <strong>Mostrar todos</strong>.</p>';
  } else {
    container.innerHTML = toolbarHtml + '<p class="tend-empty">No hay par\xE1metros con suficientes datos para graficar.</p>';
  }
  syncTendHiddenModalIfOpen();
}
function orderTendSections(bySection) {
  var sectionsOrdered = [];
  for (var oi = 0; oi < TEND_SECTION_ORDER.length; oi++) {
    var sec = TEND_SECTION_ORDER[oi];
    if (bySection[sec] && bySection[sec].length) sectionsOrdered.push(sec);
  }
  Object.keys(bySection).forEach(function(sec2) {
    if (sectionsOrdered.indexOf(sec2) === -1) sectionsOrdered.push(sec2);
  });
  return sectionsOrdered;
}
function buildTendPatchJobs(seriesAvail, seriesIndex) {
  var patchJobs = [];
  for (var pj = 0; pj < seriesAvail.length; pj += 1) {
    var spP = seriesAvail[pj];
    var skP = spP.sectionKey;
    var fkP = spP.fieldKey;
    if (!tendSectionIsExpanded(skP)) continue;
    var idxP = seriesIndex[tendCatalogSeriesKey(skP, fkP)];
    if (!idxP || !idxP.setsDesc.length) continue;
    var sparkDescP = idxP.setsDesc.slice(0, TREND_SPARK_WINDOW);
    var setsAscP = toTrendAscendingSets(sparkDescP);
    patchJobs.push({
      sk2: skP,
      fk2: fkP,
      setsDesc2: sparkDescP,
      labels2: buildTendChartLabels(setsAscP),
      values2: setsAscP.map(function(s) {
        return getSetTrendValueForSeries(s, skP, fkP);
      }),
      ref: idxP.ref || null
    });
  }
  return patchJobs;
}
function tryPatchTendenciasDom(container, seriesAvail, seriesIndex, historyDesc, renderKey, nextSeriesKeys) {
  var canPatch = tendStore._tendRenderState.key === renderKey && tendStore._tendRenderState.seriesKeys.length === nextSeriesKeys.length && tendStore._tendRenderState.seriesKeys.every(function(k, i) {
    return k === nextSeriesKeys[i];
  }) && container.querySelector(".tend-grid");
  if (!canPatch || !patchTendCardsFromIndex(seriesIndex, seriesAvail)) return false;
  updateSparkChartsFromJobs(buildTendPatchJobs(seriesAvail, seriesIndex), historyDesc);
  syncTendHiddenModalIfOpen();
  return true;
}
function buildTendenciaCardHtml(sectionKey, spec, seriesIndex, expanded) {
  var specFk = spec.fieldKey;
  var idxCard = seriesIndex[tendCatalogSeriesKey(sectionKey, specFk)];
  var latest = idxCard ? idxCard.latest : null;
  var isAb = idxCard ? idxCard.isAbnormal : false;
  var domId = trendSparkDomId(sectionKey, specFk);
  var labelParts = tendCardLabelParts(sectionKey, specFk);
  var unitHtml = labelParts.unit ? '<span class="tend-unit">' + esc(labelParts.unit) + "</span>" : "";
  var seriesKey = tendCatalogSeriesKey(sectionKey, specFk);
  var prev = idxCard ? previousValueFromSetsDesc(idxCard.setsDescFull || idxCard.setsDesc, sectionKey, specFk, getSetTrendValueForSeries) : null;
  var insightHtml = buildTendInsightHtml(esc, latest, prev, isAb, idxCard ? idxCard.ref : null);
  return '<div class="tend-card" role="button" tabindex="0" data-series-key="' + esc(seriesKey) + '" data-abnormal="' + (isAb ? "1" : "0") + '"><div class="tend-card-header"><span class="tend-card-title"><span class="tend-param-name">' + esc(labelParts.title) + "</span>" + unitHtml + '</span><span class="tend-card-header-end"><button type="button" class="tend-card-hide-btn" title="Ocultar analito" aria-label="Ocultar analito">' + tendEyeHideSvg() + '</button><span class="tend-card-reading"><span class="tend-param-value' + (isAb ? " tend-abnormal" : "") + '">' + (latest != null ? latest : "\u2014") + "</span>" + insightHtml + '</span></span></div><div class="tend-spark-wrap"><div class="tend-spark-canvas-cell">' + (expanded ? '<canvas id="' + domId + '"></canvas>' : '<div class="tend-spark-placeholder" aria-hidden="true"></div>') + "</div></div></div>";
}
function buildTendenciaSectionHtml(sectionKey, list, seriesIndex) {
  var expanded = tendSectionIsExpanded(sectionKey);
  var secLabel = getTendSectionLabel(sectionKey);
  var cardParts = list.map(function(spec) {
    return buildTendenciaCardHtml(sectionKey, spec, seriesIndex, expanded);
  });
  return '<section class="tend-section" data-section="' + esc(sectionKey) + '"><div class="tend-section-head"><button type="button" class="tend-section-toggle" aria-expanded="' + (expanded ? "true" : "false") + '"><span class="tend-section-chevron" aria-hidden="true">' + (expanded ? "\u25BC" : "\u25B6") + '</span><span class="tend-section-title">' + esc(secLabel) + '</span></button><span class="tend-section-toggle-end"><span class="tend-section-count">' + list.length + "</span>" + (list.length > 0 ? '<button type="button" class="tend-section-chart-btn" title="Abrir gr\xE1fica y tabla del estudio" aria-label="Gr\xE1fica del estudio">' + tendSectionChartSvg() + '<span class="tend-section-chart-label">Gr\xE1fica</span></button>' : "") + '</span></div><div class="tend-section-body' + (expanded ? "" : " tend-section-body--collapsed") + '"><div class="tend-grid tend-sort-zone" data-section-key="' + esc(sectionKey) + '">' + cardParts.join("") + "</div></div></section>";
}
function paintTendenciasGrid(container, toolbarHtml, sectionsOrdered, bySection, seriesIndex, seriesAvail, historyDesc) {
  var htmlParts = [toolbarHtml];
  for (var si = 0; si < sectionsOrdered.length; si++) {
    var sectionKey = sectionsOrdered[si];
    var list = orderTrendSeriesBySaved(bySection[sectionKey], readTendCardOrder(aid(), sectionKey));
    htmlParts.push(buildTendenciaSectionHtml(sectionKey, list, seriesIndex));
  }
  container.innerHTML = htmlParts.join("");
  buildSparkJobsFromIndex(seriesAvail, seriesIndex, historyDesc, sparkChartAnim(600));
}
function renderTendenciasBody(container) {
  destroyTendCardSortables();
  tendStore.sparkMountGen += 1;
  Object.keys(tendStore.sparkCharts).forEach(function(k) {
    destroySparkChartEntry(k);
  });
  if (!aid()) {
    resetTendRenderEmpty(container, "Selecciona un paciente.");
    return;
  }
  var historyDesc = tendParsedHistoryDesc(aid());
  if (historyDesc.length < 2) {
    resetTendRenderEmpty(container, "Agrega al menos 2 sets de laboratorio para ver tendencias.");
    return;
  }
  var historyAsc = historyDesc.slice().reverse();
  var catalogAsc = getTrendRenderWindow(historyAsc, "catalog");
  var mergedCatalog = buildMergedTrendSeriesCatalog(historyDesc);
  var indexCacheKey = String(aid()) + "|" + getLabHistoryRevision(aid()) + "|" + mergedCatalog.length + "|" + historyDesc.length;
  var seriesIndex = buildTrendSeriesIndexCached(indexCacheKey, {
    catalogSpecs: mergedCatalog,
    historyFullDesc: historyDesc,
    windowHistoryAsc: catalogAsc,
    tendRefForSeries
  });
  tendStore._tendRenderState.seriesIndex = seriesIndex;
  var abnormalOnly = tendAbnormalOnlyRead();
  var avail = collectSeriesAvailability(mergedCatalog, seriesIndex, abnormalOnly);
  tendStore._tendRenderState.seriesAvail = avail.seriesAvail;
  var hiddenChipN = tendHiddenChipDescriptors().length;
  var toolbarOpts = {
    showGasoExtended: !isAbgAnalysisHidden() && historyHasGasoForExtended(historyDesc)
  };
  var toolbarHtml = buildTendInlineControlsHtml(hiddenChipN, toolbarOpts);
  if (!avail.seriesAvail.length) {
    renderTendenciasEmptyState(
      container,
      toolbarHtml,
      mergedCatalog,
      seriesIndex,
      abnormalOnly,
      avail.seriesAvailFull
    );
    return;
  }
  var bySection = /* @__PURE__ */ Object.create(null);
  avail.seriesAvail.forEach(function(spec) {
    var k = spec.sectionKey;
    if (!bySection[k]) bySection[k] = [];
    bySection[k].push(spec);
  });
  var sectionsOrdered = orderTendSections(bySection);
  var renderKey = buildTendRenderKey(
    aid(),
    getLabHistoryRevision(aid()),
    tendPrefsHash(),
    tendExpandedSectionsKey()
  );
  var nextSeriesKeys = avail.seriesAvail.map(function(sp) {
    return tendCatalogSeriesKey(sp.sectionKey, sp.fieldKey);
  });
  if (tryPatchTendenciasDom(container, avail.seriesAvail, seriesIndex, historyDesc, renderKey, nextSeriesKeys)) {
    return;
  }
  tendStore._tendRenderState.key = renderKey;
  tendStore._tendRenderState.seriesKeys = nextSeriesKeys;
  paintTendenciasGrid(container, toolbarHtml, sectionsOrdered, bySection, seriesIndex, avail.seriesAvail, historyDesc);
}

// public/js/features/tendencias-render.mjs
function renderTendencias(opts) {
  opts = opts || {};
  var onReady = typeof opts.onReady === "function" ? opts.onReady : null;
  syncAbgLabPrefRowVisibility();
  var container = document.getElementById("tendencias-container");
  if (!container) {
    if (onReady) onReady();
    return;
  }
  ensureTendenciasClickDelegation();
  var paint = function() {
    try {
      renderTendenciasBody(container);
    } catch (err) {
      console.error("[R+ Tendencias] Error al renderizar:", err);
      container.innerHTML = '<p class="tend-empty">No se pudieron cargar las tendencias. Revisa la consola (F12) o recarga la app.</p>';
    }
    if (onReady) onReady();
  };
  if (opts.syncHeavy) {
    paint();
    return;
  }
  if (!container.querySelector(".tend-grid, .tend-toolbar, .tend-empty")) {
    container.innerHTML = buildTextSkeletonPanel("tend-skeleton skel-panel", 4);
  }
  scheduleAfterPaint(paint);
}

// public/js/features/tendencias.mjs
tendenciasBridge.renderTendencias = renderTendencias;
tendenciasBridge.mountTendCardSortables = mountTendCardSortables;
tendenciasBridge.syncTendHiddenModalIfOpen = syncTendHiddenModalIfOpen;
function registerTendenciasRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
  initTendGroupModal();
  ensureTendHiddenModalDelegation();
  ensureTendenciasClickDelegation();
}
var tendenciasWindowHandlers = {
  closeTendDetail,
  openTendGroupModal,
  openTendGasoExtendedModal,
  closeTendGroupModal,
  setTendGroupTab: setTendGroupTab2,
  copyTendGroupTablePng: copyTendGroupTablePng2,
  copyTendGroupTableText: copyTendGroupTableText2,
  toggleTendSection,
  toggleTendAbnormalOnlyFilter,
  tendHideSeriesFromCard,
  tendUnhideSeries,
  tendResetAllHiddenSeries,
  openTendHiddenModal,
  closeTendHiddenModal,
  openTendDetail,
  tendCardActivate,
  openLabDisplayPrefsModal,
  closeLabDisplayPrefsModal,
  onLabDisplayPrefsChanged
};

export {
  toggleTendSection,
  getLabOutputPrefs,
  setLabOutputPrefs,
  isGasoInterpretacionResLabChunk,
  isAscitisInterpretacionResLabChunk,
  isCitoquimInterpretacionResLabChunk,
  citoquimInterpretacionBody_,
  ascitisInterpretacionBody_,
  isBhMainResLabChunk,
  formatBhExtendedTabLine,
  openLabDisplayPrefsModal,
  closeLabDisplayPrefsModal,
  onLabDisplayPrefsChanged,
  seedTendHiddenDefaults,
  openTendHiddenModal,
  closeTendHiddenModal,
  toggleTendAbnormalOnlyFilter,
  tendHideSeriesFromCard,
  tendUnhideSeries,
  tendResetAllHiddenSeries,
  openTendDetail,
  closeTendDetail,
  closeTendGroupModal,
  openTendGroupModal,
  openTendGasoExtendedModal,
  setTendGroupTab2 as setTendGroupTab,
  copyTendGroupTablePng2 as copyTendGroupTablePng,
  copyTendGroupTableText2 as copyTendGroupTableText,
  tendCardActivate,
  isTendGroupModalOpen,
  renderTendencias,
  registerTendenciasRuntime,
  tendenciasWindowHandlers,
  applyTourDemoIngresoDates,
  applyTourDemoPatientBundle,
  openLabBulkTourHintModal,
  closeLabBulkTourHintModal,
  insertLabTourSecondPatientExample,
  resolveTourBranch,
  persistTourProgressDebounced,
  resetTourUiBeforeResume,
  showTourDock,
  hideTourDock,
  toggleTourDockCollapsed,
  onTourDockClick,
  seedDemoTrendHistory,
  seedDemoMonitoreoOnActivePatient,
  seedDemoListadoProblemas,
  ensureProfileExpandedForTour,
  ensureSettingsExpandedForTour,
  ensureConnectionExpandedForTour,
  clearTourSoapButtonHighlight,
  syncTourSoapButtonHighlight,
  getGuidedTourSteps,
  demoLabAlreadyProcessedForTour,
  seedDemoEventualidadesOnActivePatient,
  openTourEstadoActualRegistroDemo,
  isEstadoActualPostRegistroTourStep,
  prepareEstadoActualPanelForTour,
  clearTourActionPoll,
  armTourActionPoll,
  syncTourActionNextButton,
  guidedTourStepIndex,
  clearAllTourSpotlights,
  syncTourDockPlacement,
  tourApplySpotlightForStep,
  applyTourTargetForStep,
  tourBridge,
  MOBILE_SCOPE_COPY,
  LIVESYNC_BTN_COPY,
  getGuardiaV7StepHtml,
  escapeTourHtml,
  renderTourStep,
  clearGuidedTourModuleScope,
  maybeMarkFundamentosChapterComplete,
  maybeMarkGuardiaV7ChapterComplete,
  destroyDemoAndClose,
  handlePostGuidedTourOnboardingResume,
  finishGuidedTour,
  skipGuidedTour,
  guidedTourClickPrev,
  guidedTourPause,
  guidedTourClickNext,
  getGuidedTourContext,
  guidedTourAdvanceAfter,
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated,
  startOnboarding,
  scheduleTourDemoPatientRegistrationFromLab,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved,
  resetAndStartOnboarding,
  resumeGuidedTourFromProgress
};
//# sourceMappingURL=/js/chunks/chunk-X3U4UWD3.js.map
