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
  reprocessLabResultLines_,
  escTxt,
  renderToken,
  renderEntry
} from './labs.js';
import { formatProgressLine } from './update-helpers.mjs';
import {
  isDuplicateAgainstLatest,
  findDuplicateLabSetIdsToRemove,
  findExactDuplicateLabGroups,
  compareLabSetIdForDedupe,
  normalizeLabLine,
} from './lab-history-auto-store-core.mjs';
import {
  parseMedicationPaste,
  resolveFechaActualizacion,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  formatMedicationEgresoLine,
  classifyMedicationSoapCategory,
  applyMedCatalogOverlay,
} from './med-receta-core.mjs';
import { isModeSala, getDefaultServicio, migrateToV3 } from './mode-features.mjs';
import {
  emptyListado,
  addProblema as listadoAddProblema,
  removeProblema as listadoRemoveProblema,
  reorderProblema as listadoReorderProblema,
} from './listado-problemas-core.mjs';
import { validatePatientForSave, buildExpedienteAdvice } from './patient-validation.mjs';
import {
  getTourSteps,
  getTourTarget,
  stepRequiresUserAction,
} from './tour-targets.mjs';
import { resolveQuickOutputAction } from './quick-output.mjs';
import { handleOutputDirFallback } from './output-dir-fallback.mjs';


// ════════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════════
var patients     = storage.getPatients();
var notes        = storage.getNotes();
var indicaciones = storage.getIndicaciones();
var labHistory   = storage.getLabHistory();
var medRecetaByPatient = storage.getMedRecetaByPatient();
var listadoProblemas = storage.getListadoProblemas();
applyMedCatalogOverlay(storage.getMedCatalog());
var medNotaSelectionByPatient = {};
var activeId     = null;
var activeInner  = 'notas';
var activeAppTab = 'lab';
var patientSearchFilter = '';
var ARCHIVED_SECTION_COLLAPSED_LS = 'rpc-archived-section-collapsed';
var dragPatientId = null;
var profileSectionVisible = false;
var activeLab    = null;
var settings     = storage.getSettings();
var __v3MigratedThisBoot = migrateToV3(settings);
if (__v3MigratedThisBoot) storage.saveSettings(settings);
var sparkCharts  = {};
var detailChart  = null;
var medOutputTab = 'full';
var autoBackupSchedulerId = null;
var AUDIT_LOG_KEY = 'rpc-audit-log';
var AUTO_BACKUP_SETTINGS_KEY = 'rpc-auto-backup-settings';
var AUTO_BACKUP_INDEX_KEY = 'rpc-auto-backup-index';
var AUTO_BACKUP_MAX = 14;
var IDLE_LOCK_LS_KEY = 'rpc-idle-lock';
var IDLE_LOCK_HASH_LS_KEY = 'rpc-idle-lock-hash';
var IDLE_LOCK_DEBOUNCE_MS = 500;
var IDLE_LOCK_VALID_MINUTES = [0, 5, 10, 30];
var idleLockTimerId = null;
var idleLockDebounceId = null;
var idleLockIsActive = false;
var idleLockEnabledMinutes = 0;

var TEND_UNITS = {
  Hb:'g/dL',  Hto:'%',    Leu:'K/μL', Plt:'K/μL', VCM:'fL', HCM:'pg',
  Neu:'K/μL', Eos:'K/μL', Ret:'%', TP:'s', TTP:'s', INR:'',
  Glu:'mg/dL',Cr:'mg/dL', BUN:'mg/dL',PCR:'mg/dL',
  AU:'mg/dL', TGL:'mg/dL',COL:'mg/dL', VSG:'mm/h', CPK:'U/L',
  Na:'mEq/L', K:'mEq/L',  Cl:'mEq/L', HCO3:'mEq/L',Ca:'mg/dL', F:'mg/dL', Mg:'mEq/L',
  AST:'U/L',  ALT:'U/L',  FA:'U/L',   BT:'mg/dL', Alb:'g/dL', BD:'mg/dL', BI:'mg/dL',
  LDH:'U/L', Amil:'U/L',
  Lactato:'mmol/L', Dens:'g/L', Prot:'mg/dL', Vol:'mL', GLU:'mg/dL', Bica:'mEq/L', pH:'', pCO2:'mmHg', pO2:'mmHg',
  iCa:'mmol/L'
};
var TEND_REF = {
  Hb:[12,17.5], Hto:[36,53], Leu:[4,11], Plt:[150,400], VCM:[80,100], HCM:[27,33],
  Neu:[1.5,8], Eos:[0,0.6], Ret:[0.5,2.5], TP:[11,14], TTP:[25,35], INR:[0.8,1.2],
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
  CUANTORINA: 'Cuantificación urinaria'
};
var TEND_SECTION_ORDER = [
  'BH', 'QS', 'ESC', 'PFHs', 'GASES', 'LCR', 'Liq', 'Prot12h', 'Prot24h', 'PIE', 'EGO', 'CUANTORINA'
];

/** Solo paneles de laboratorio convencional; excluye cultivos/micro (UROCULTIVO, HEMOCULTIVO, SONDA, …). */
function tendEligibleSectionKey(sec) {
  var u = String(sec == null ? '' : sec)
    .trim()
    .replace(/:+$/, '')
    .toUpperCase();
  if (!u) return false;
  return /^(BH|QS|ESC|PFHS|GASES|LCR|LIQ|PROT12H|PROT24H|PIE|EGO|CUANTORINA)$/.test(u);
}
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
  { sectionKey: 'BH', fieldKey: 'Ret', cardTitle: 'Reticulocitos' },
  { sectionKey: 'BH', fieldKey: 'TP', cardTitle: 'TP' },
  { sectionKey: 'BH', fieldKey: 'TTP', cardTitle: 'TTP' },
  { sectionKey: 'BH', fieldKey: 'INR', cardTitle: 'INR' },
  { sectionKey: 'QS', fieldKey: 'Glu', cardTitle: 'Glucosa' },
  { sectionKey: 'QS', fieldKey: 'Cr', cardTitle: 'Creatinina' },
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
var TEND_HIDDEN_SERIES_LS = 'rpc-tend-hidden-series';
var TEND_HIDDEN_BAR_COLLAPSED_LS = 'rpc-tend-hidden-bar-collapsed';
var guidedTourActive = false;
/** @type {'sala'|'interconsulta'|null} */
var guidedTourBranch = null;
/** @type {string|null} paso actual del tour guiado (null = inactivo) */
var tourStepId = null;
var DEMO_PATIENT_ID = 'demo-onboarding';
var DEMO_LAB_REPORT = 'LABORATORIO CLÍNICO — Hospital General\n' +
  'Paciente: DEMO PÉREZ Juan\nFecha: Apr 11 2026\n\n' +
  'BIOMETRÍA HEMÁTICA\n' +
  'Hemoglobina: 11.4 g/dL\nHematocrito: 34.8%\nVCM: 86 fL\nHCM: 28.2 pg\n' +
  'Leucocitos: 4.92 x10³/µL\nNeutrófilos: 2.76 x10³/µL\nEosinófilos: 0.275 x10³/µL\nPlaquetas: 198 x10³/µL\n\n' +
  'QUÍMICA SANGUÍNEA\n' +
  'Glucosa: 190 mg/dL\nCreatinina: 1.8 mg/dL\nBUN: 28 mg/dL\nPCR: 0.3 mg/dL\n' +
  'Ácido Úrico: 6.2 mg/dL\nTriglicéridos: 153 mg/dL\nColesterol Total: 166 mg/dL\n\n' +
  'ELECTROLITOS SÉRICOS\n' +
  'Sodio: 139.8 mEq/L\nCloro: 105 mEq/L\nPotasio: 3.2 mEq/L\nCalcio: 7.9 mg/dL\nFósforo: 3.4 mg/dL\n\n' +
  'PERFIL DE FUNCIÓN HEPÁTICA\n' +
  'Albúmina: 2.5 g/dL\nAST: 11 U/L\nALT: 6 U/L\nFosfatasa Alcalina: 103 U/L\n' +
  'Bilirrubina Total: 0.3 mg/dL\nBilirrubina Directa: 0.1 mg/dL\nBilirrubina Indirecta: 0.2 mg/dL\n' +
  'LDH: 120 U/L\nAmilasa: 25 U/L';

var OLDER_DEMO_LAB_REPORT = 'LABORATORIO CLÍNICO — Hospital General\n' +
  'Paciente: DEMO PÉREZ Juan\nFecha: Mar 05 2026\n\n' +
  'BIOMETRÍA HEMÁTICA\n' +
  'Hemoglobina: 9.8 g/dL\nHematocrito: 30.1%\nVCM: 86 fL\nHCM: 28.2 pg\n' +
  'Leucocitos: 5.1 x10³/µL\nNeutrófilos: 2.9 x10³/µL\nEosinófilos: 0.2 x10³/µL\nPlaquetas: 165 x10³/µL\n\n' +
  'QUÍMICA SANGUÍNEA\n' +
  'Glucosa: 225 mg/dL\nCreatinina: 2.1 mg/dL\nBUN: 32 mg/dL\nPCR: 0.6 mg/dL\n' +
  'Triglicéridos: 180 mg/dL\nColesterol Total: 172 mg/dL\n\n' +
  'ELECTROLITOS SÉRICOS\n' +
  'Sodio: 138.0 mEq/L\nCloro: 104 mEq/L\nPotasio: 3.0 mEq/L\nCalcio: 7.6 mg/dL\nFósforo: 3.6 mg/dL\n\n' +
  'PERFIL DE FUNCIÓN HEPÁTICA\n' +
  'Albúmina: 2.3 g/dL\nAST: 14 U/L\nALT: 8 U/L\nFosfatasa Alcalina: 110 U/L\n' +
  'Bilirrubina Total: 0.4 mg/dL\nBilirrubina Directa: 0.15 mg/dL\nBilirrubina Indirecta: 0.25 mg/dL\n' +
  'LDH: 125 U/L\nAmilasa: 28 U/L';

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

// ── Tendencias: fechas y orden cronológico ────────────────────────
var TEND_MESES_MAP = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12',jan:'01',apr:'04',aug:'08',dec:'12'};

function normalizeFechaLabHistory(fechaRaw) {
  if (fechaRaw == null || fechaRaw === '') return '';
  if (String(fechaRaw).trim() === 'Anterior') return 'Anterior';
  var t = String(fechaRaw).trim();
  var mEn = t.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (mEn) {
    var mon = TEND_MESES_MAP[mEn[1].toLowerCase().slice(0, 3)];
    if (mon) return mEn[2].padStart(2, '0') + '/' + mon + '/' + mEn[3];
  }
  var mNum = t.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (mNum) {
    var y = mNum[3] ? String(mNum[3]) : String(new Date().getFullYear());
    if (y.length === 2) y = '20' + y;
    return mNum[1].padStart(2, '0') + '/' + mNum[2].padStart(2, '0') + '/' + y;
  }
  return t;
}

function applyHoraToMs(ms, horaStr) {
  if (horaStr == null || !/^\d{1,2}:\d{2}/.test(String(horaStr).trim())) return ms;
  var h = String(horaStr).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!h) return ms;
  return ms + (parseInt(h[1], 10) * 3600 + parseInt(h[2], 10) * 60) * 1000;
}

function normalizeHoraLabHistory(horaRaw) {
  if (horaRaw == null) return '';
  var t = String(horaRaw).trim();
  if (!t) return '';
  var m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return '';
  var hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  var mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  var ss = m[3] == null ? null : Math.max(0, Math.min(59, parseInt(m[3], 10)));
  var out = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  if (ss != null) out += ':' + String(ss).padStart(2, '0');
  return out;
}

function parseFechaLabToMs(fechaStr, horaStr) {
  if (!fechaStr) return null;
  var t = String(fechaStr).trim();
  if (t === 'Anterior') return null;
  var mEn = t.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (mEn) {
    var monStr = TEND_MESES_MAP[mEn[1].toLowerCase().slice(0, 3)];
    if (monStr) {
      var mo = parseInt(monStr, 10) - 1;
      var ms = new Date(parseInt(mEn[3], 10), mo, parseInt(mEn[2], 10)).getTime();
      return applyHoraToMs(ms, horaStr);
    }
  }
  var mNum = t.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (mNum) {
    var y = mNum[3] ? parseInt(mNum[3], 10) : new Date().getFullYear();
    if (y < 100) y += 2000;
    var ms2 = new Date(y, parseInt(mNum[2], 10) - 1, parseInt(mNum[1], 10)).getTime();
    return applyHoraToMs(ms2, horaStr);
  }
  return null;
}

function sortLabHistoryChronological(hist) {
  return (hist || []).slice().sort(function(a, b) {
    var aAnterior = !!(a && (a.fecha === 'Anterior' || a.id === 'migrated-anterior'));
    var bAnterior = !!(b && (b.fecha === 'Anterior' || b.id === 'migrated-anterior'));
    if (aAnterior !== bAnterior) return aAnterior ? 1 : -1; // "Anterior" siempre al fondo

    var ta = parseFechaLabToMs(a.fecha, a.hora);
    var tb = parseFechaLabToMs(b.fecha, b.hora);

    var aValid = typeof ta === 'number' && isFinite(ta);
    var bValid = typeof tb === 'number' && isFinite(tb);
    if (aValid !== bValid) return aValid ? -1 : 1; // no parseables al final
    if (aValid && bValid && ta !== tb) return tb - ta; // más reciente primero

    var ha = normalizeHoraLabHistory(a && a.hora);
    var hb = normalizeHoraLabHistory(b && b.hora);
    if (ha && hb && ha !== hb) return hb.localeCompare(ha); // empate de fecha -> hora desc

    // Empate final estable por captura (no altera orden relativo original).
    return 0;
  });
}

function buildLabSetDateLine(set) {
  if (!set) return '';
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
  var rawHora = normalizeHoraLabHistory(set.hora);
  if (!rawDate) return '';
  return rawHora ? (rawDate + ' ' + rawHora.slice(0, 5)) : rawDate;
}

/** Encabezado de sección de laboratorio tabular (BH, QS, …). */
function isLabSectionHeaderLine(s) {
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA)\b/i.test(String(s).trim());
}

/**
 * Inicio de bloque microbiología / cultivos (no solo líneas CULTIVO\t del parser).
 * Tras activarse, todo va a cultivos hasta el siguiente encabezado BH|QS|…
 */
function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (/^CULTIVO\b/i.test(t)) return true;
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
    var dateLine = buildLabSetDateLine(headerSet);
    if (dateLine) lines.push(dateLine);
    if (labsAcc.length) {
      lines.push('Laboratorio');
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

function buildTendChartLabels(sets) {
  var byDay = {};
  return sets.map(function(s) {
    if (s.fecha === 'Anterior') return 'Ant.';
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    var d = new Date(ms);
    if (isNaN(d.getTime())) return String(s.fecha).slice(0, 12);
    var dayKey = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;
    var dd = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    if (byDay[dayKey] > 1 && s.hora && /^\d{1,2}:\d{2}/.test(String(s.hora)))
      return dd + ' ' + String(s.hora).trim().slice(0, 5);
    if (byDay[dayKey] > 1) return dd + ' #' + byDay[dayKey];
    return dd;
  });
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

function getSetTrendValueForSeries(set, sectionKey, fieldKey) {
  var pb = set && set.parsedBySection;
  if (!pb || !pb[sectionKey]) return null;
  var raw = pb[sectionKey][fieldKey];
  if (raw == null || raw === '') return null;
  var v = Number(raw);
  if (!isFinite(v)) return null;
  return v;
}

function dedupeTrendSetsForSeries(setsDesc, sectionKey, fieldKey) {
  var seen = Object.create(null);
  var out = [];
  for (var i = 0; i < (setsDesc || []).length; i++) {
    var s = setsDesc[i];
    var v = getSetTrendValueForSeries(s, sectionKey, fieldKey);
    if (v == null || !isFinite(v)) continue;
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    var key;
    if (typeof ms === 'number' && isFinite(ms)) key = 't:' + ms + '|v:' + v;
    else key = 'f:' + String(s.fecha) + '|h:' + normalizeHoraLabHistory(s.hora) + '|v:' + v;
    key += '|' + sectionKey + '|' + fieldKey;
    if (seen[key]) continue;
    seen[key] = true;
    out.push(s);
  }
  return out;
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

function tendRefForSeries(sectionKey, fieldKey) {
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

function tendCatalogSeriesKey(sectionKey, fieldKey) {
  return String(sectionKey) + '|' + String(fieldKey);
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
          cardTitle: fk + ' · ' + sk,
          _dynamic: true
        });
      });
    });
  });
  return out;
}

function tendEyeVisibilitySvg() {
  return (
    '<svg class="tend-eye-svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
  );
}

function tendHiddenBarIsCollapsed() {
  try {
    return localStorage.getItem(TEND_HIDDEN_BAR_COLLAPSED_LS) === '1';
  } catch (_e) {
    return false;
  }
}

function tendHiddenBarSetCollapsed(collapsed) {
  try {
    localStorage.setItem(TEND_HIDDEN_BAR_COLLAPSED_LS, collapsed ? '1' : '0');
  } catch (_e) {}
}

function toggleTendHiddenBar(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  tendHiddenBarSetCollapsed(!tendHiddenBarIsCollapsed());
  renderTendencias();
}

function buildTendHiddenBarHtml() {
  var hiddenKeys = tendHiddenSeriesRead();
  if (!hiddenKeys.length) return '';
  var svg = tendEyeVisibilitySvg();
  var chips = [];
  for (var hi = 0; hi < hiddenKeys.length; hi++) {
    var entry = hiddenKeys[hi];
    var pipe = entry.indexOf('|');
    if (pipe < 1) continue;
    var sk = entry.slice(0, pipe);
    var fk = entry.slice(pipe + 1);
    if (!fk) continue;
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
  if (!chips.length) return '';
  var n = chips.length;
  var collapsed = tendHiddenBarIsCollapsed();
  return (
    '<div class="tend-hidden-bar' +
    (collapsed ? ' tend-hidden-bar--collapsed' : '') +
    '">' +
    '<div class="tend-hidden-bar-top">' +
    '<button type="button" class="tend-hidden-bar-toggle" aria-expanded="' +
    (collapsed ? 'false' : 'true') +
    '" onclick="toggleTendHiddenBar(event)">' +
    '<span class="tend-hidden-bar-chevron" aria-hidden="true">' +
    (collapsed ? '▶' : '▼') +
    '</span>' +
    '<span class="tend-hidden-bar-summary">Ocultos (' +
    n +
    ')</span>' +
    '</button>' +
    '<button type="button" class="tend-toolbar-btn tend-hidden-bar-all" onclick="event.stopPropagation();tendResetAllHiddenSeries()">Mostrar todos</button>' +
    '</div>' +
    '<div class="tend-hidden-bar-body">' +
    '<div class="tend-hidden-chips">' +
    chips.join('') +
    '</div>' +
    '</div>' +
    '</div>'
  );
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

// ── Expediente: pestaña Cultivos (tabla desde historial) ───────────
var CULTIVO_TIPO_ORDER = ['hemo', 'uro', 'cateter', 'gram', 'fungi', 'otro'];
var CULTIVO_TIPO_LABELS = {
  hemo: 'Hemocultivo',
  uro: 'Urocultivo',
  cateter: 'Cultivo de catéter',
  gram: 'Tinción Gram',
  fungi: 'Fungicultivo',
  otro: 'Otros cultivos',
};

function isCultureTableHeaderLine(t) {
  var s = String(t || '').trim();
  return (
    /^(UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO)\b/i.test(s) ||
    /^TINCION\s+DE\s+GRAM/i.test(s) ||
    /^CATETER\b/i.test(s)
  );
}

/** Clave estable desde la línea cabecera del bloque (UROCULTIVO / HEMOCULTIVO / …). */
function classifyCultureTipoKeyFromHeaderLine(rawLine) {
  var s = String(rawLine || '').replace(/\s+/g, ' ').trim();
  var beforeColon = (s.split(':')[0] || s).toUpperCase();
  if (/^HEMOCULTIVO\b/.test(beforeColon)) return 'hemo';
  if (/^UROCULTIVO\b/.test(beforeColon)) return 'uro';
  if (/^FUNGICULTIVO\b/.test(beforeColon)) return 'fungi';
  if (/^TINCION(\s+DE)?\s+GRAM\b/.test(beforeColon)) return 'gram';
  if (/^CATETER\b/.test(beforeColon)) return 'cateter';
  return 'otro';
}

function completePartialFechaForCultivo(dm, set) {
  if (!dm) return '';
  var parts = String(dm).trim().split('/');
  if (parts.length === 3) {
    var y3 = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    var joined = parts[0].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + y3;
    return normalizeFechaLabHistory(joined) || joined;
  }
  if (parts.length !== 2) return dm;
  var y = new Date().getFullYear();
  if (set && set.fecha && set.fecha !== 'Anterior') {
    var fd = normalizeFechaLabHistory(set.fecha) || String(set.fecha);
    var ms = parseFechaLabToMs(fd, '');
    if (typeof ms === 'number' && isFinite(ms)) y = new Date(ms).getFullYear();
  }
  return parts[0].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + y;
}

function cultureBlockLooksNegative(left, right) {
  var L = (left + ' ' + right).toUpperCase();
  if (!String(right || '').trim()) return true;
  return (
    /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(L)
  );
}

/**
 * @returns {{ row: object, nextIdx: number }}
 */
function parseCultureBlockFromCultivoLines(cultLines, startIdx, set, seq) {
  var rawHeader = String(cultLines[startIdx] || '');
  var line = rawHeader.replace(/\s+/g, ' ').trim();
  var tipoKey = classifyCultureTipoKeyFromHeaderLine(rawHeader);
  var studyDate = buildLabSetDateLine(set) || '—';
  var sortMs = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof sortMs !== 'number' || !isFinite(sortMs)) sortMs = 0;

  var colon = line.indexOf(':');
  var left = colon >= 0 ? line.slice(0, colon).trim() : line;
  var right = colon >= 0 ? line.slice(colon + 1).trim() : '';

  var fechaMuestra = '';
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (dm) {
    fechaMuestra = completePartialFechaForCultivo(dm[1], set);
    sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, '').trim();
  }

  var organismo = right.replace(/\s+/g, ' ').trim();
  var negativo = cultureBlockLooksNegative(left, right);
  if (negativo && !organismo) organismo = 'Negativo';
  else if (negativo && /^NEGATIVO$/i.test(organismo)) organismo = 'Negativo';
  else if (!organismo) organismo = '—';

  var resistencias = [];
  var i = startIdx + 1;
  while (i < cultLines.length) {
    var L2 = String(cultLines[i] || '').trim();
    if (!L2) {
      i++;
      continue;
    }
    if (isCultureTableHeaderLine(L2)) break;
    if (/^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA)\b/i.test(L2)) break;
    if (/^CULTIVO\b|^BACTERIOLOGIA\b/i.test(L2)) break;
    resistencias.push(L2);
    i++;
  }

  var resStr = resistencias.join('\n').trim();

  var sortKeyMs = sortMs;
  if (fechaMuestra) {
    var fmNorm = normalizeFechaLabHistory(fechaMuestra) || fechaMuestra;
    var fmParsed = parseFechaLabToMs(fmNorm, '');
    if (typeof fmParsed === 'number' && isFinite(fmParsed)) sortKeyMs = fmParsed;
  }

  return {
    row: {
      studyDate: studyDate,
      fechaMuestra: fechaMuestra || '—',
      sitio: sitio || '—',
      organismo: organismo,
      resistencias: resStr || (negativo ? '—' : ''),
      negativo: negativo,
      sortMs: sortMs,
      sortKeyMs: sortKeyMs,
      tipoKey: tipoKey,
      tipoLabel: CULTIVO_TIPO_LABELS[tipoKey] || CULTIVO_TIPO_LABELS.otro,
      _seq: typeof seq === 'number' ? seq : 0,
    },
    nextIdx: i,
  };
}

function extractCultivoTableRowsFromHistory(patientId) {
  var history = sortLabHistoryChronological(ensureParsedLabHistory(patientId));
  var rows = [];
  var seq = 0;
  history.forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = splitResLabsByTipo(set.resLabs).cultivo;
    var i = 0;
    while (i < cult.length) {
      var t = String(cult[i] || '').trim();
      if (!t) {
        i++;
        continue;
      }
      if (!isCultureTableHeaderLine(t)) {
        i++;
        continue;
      }
      var parsed = parseCultureBlockFromCultivoLines(cult, i, set, seq++);
      rows.push(parsed.row);
      i = parsed.nextIdx;
    }
  });
  return rows;
}

/** Agrupa por tipo de cultivo y ordena del más reciente al más antiguo. */
function groupCultivoRowsByTipoChronologic(rows) {
  var byKey = Object.create(null);
  rows.forEach(function (r) {
    var k = r.tipoKey || 'otro';
    if (!byKey[k]) byKey[k] = [];
    byKey[k].push(r);
  });
  CULTIVO_TIPO_ORDER.forEach(function (k) {
    if (!byKey[k]) return;
    byKey[k].sort(function (a, b) {
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return db - da;
      return (b._seq || 0) - (a._seq || 0);
    });
  });
  return CULTIVO_TIPO_ORDER.filter(function (k) {
    return byKey[k] && byKey[k].length;
  }).map(function (k) {
    return {
      key: k,
      label: CULTIVO_TIPO_LABELS[k] || CULTIVO_TIPO_LABELS.otro,
      rows: byKey[k],
    };
  });
}

function renderCultivosTable() {
  var container = document.getElementById('cultivos-table-container');
  if (!container) return;
  if (!activeId) {
    container.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  var flatRows = extractCultivoTableRowsFromHistory(activeId);
  if (!flatRows.length) {
    container.innerHTML =
      '<p class="tend-empty">No hay cultivos en el historial. Aparecen urocultivos, hemocultivos, tinción Gram y cultivos de catéter enviados desde Laboratorio.</p>';
    return;
  }
  var groups = groupCultivoRowsByTipoChronologic(flatRows);
  function rowFechaDisplay(r) {
    if (r.fechaMuestra && r.fechaMuestra !== '—') return r.fechaMuestra;
    return r.studyDate || '—';
  }
  var negs = flatRows.filter(function (r) {
    return r.negativo;
  });
  negs.sort(function (a, b) {
    var oa = CULTIVO_TIPO_ORDER.indexOf(a.tipoKey || 'otro');
    var ob = CULTIVO_TIPO_ORDER.indexOf(b.tipoKey || 'otro');
    if (oa !== ob) return oa - ob;
    var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
    var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
    if (da !== db) return db - da;
    return (b._seq || 0) - (a._seq || 0);
  });
  var negStrip = '';
  if (negs.length) {
    var parts = negs.map(function (r) {
      var fd = rowFechaDisplay(r);
      var lab = r.tipoLabel || '';
      return lab + ' · ' + fd + ' · ' + (r.sitio.length > 36 ? r.sitio.slice(0, 34) + '…' : r.sitio);
    });
    negStrip =
      '<div class="cultivos-neg-strip" role="status"><strong>Cultivos negativos</strong> (en la tabla, por tipo y fecha) · ' +
      parts.map(function (p) {
        return '<span>' + esc(p) + '</span>';
      }).join(' <span class="cultivos-neg-sep">|</span> ') +
      '</div>';
  }
  var thead =
    '<thead><tr>' +
    '<th>Fecha</th>' +
    '<th>Sitio / muestra</th>' +
    '<th>Organismo</th>' +
    '<th>Resistencias</th>' +
    '</tr></thead>';
  var tbody = groups
    .map(function (g) {
      var section =
        '<tr class="cultivos-section-row"><td colspan="4">' + esc(g.label) + '</td></tr>';
      var body = g.rows
        .map(function (r) {
          return (
            '<tr class="' +
            (r.negativo ? 'cultivos-row-neg' : '') +
            '">' +
            '<td>' +
            esc(rowFechaDisplay(r)) +
            '</td>' +
            '<td>' +
            esc(r.sitio) +
            '</td>' +
            '<td>' +
            esc(r.organismo) +
            '</td>' +
            '<td class="cultivos-cell-atb"><pre>' +
            esc(r.resistencias || '—') +
            '</pre></td>' +
            '</tr>'
          );
        })
        .join('');
      return section + body;
    })
    .join('');
  container.innerHTML =
    negStrip +
    '<p class="cultivos-table-hint">Por categoría (tipo de estudio), orden cronológico de más reciente a más antiguo.</p>' +
    '<div class="cultivos-table-wrap">' +
    '<table class="cultivos-table">' +
    thead +
    '<tbody>' +
    tbody +
    '</tbody></table></div>';
}

function refreshTendenciasOrCultivosPanel() {
  if (activeAppTab !== 'nota') return;
  if (activeInner === 'tend') renderTendencias();
  else if (activeInner === 'cult') renderCultivosTable();
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

var LAB_HISTORY_COLLAPSED_LS = 'rpc-ui-labHistoryCollapsed';

function labHistoryPanelIsCollapsed() {
  try { return localStorage.getItem(LAB_HISTORY_COLLAPSED_LS) === '1'; } catch (_e) { return false; }
}

function setLabHistoryPanelCollapsed(collapsed) {
  try {
    if (collapsed) localStorage.setItem(LAB_HISTORY_COLLAPSED_LS, '1');
    else localStorage.removeItem(LAB_HISTORY_COLLAPSED_LS);
  } catch (_e) {}
}

function syncLabHistoryCollapseUI() {
  var card = document.getElementById('lab-history-card');
  var btn = document.getElementById('btn-lab-history-toggle');
  if (!card) return;
  var collapsed = labHistoryPanelIsCollapsed();
  card.classList.toggle('is-collapsed', collapsed);
  if (btn) btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function toggleLabHistoryPanel(ev) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  setLabHistoryPanelCollapsed(!labHistoryPanelIsCollapsed());
  syncLabHistoryCollapseUI();
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

// ── Theme ──────────────────────────────────────────────────────────
(function() {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

function syncThemeSettingsButtons() {
  var isDark = document.documentElement.classList.contains('dark');
  var lightBtn = document.getElementById('settings-theme-light');
  var darkBtn = document.getElementById('settings-theme-dark');
  if (lightBtn) lightBtn.classList.toggle('active', !isDark);
  if (darkBtn) darkBtn.classList.toggle('active', isDark);
}

function setThemeMode(mode) {
  var isDark = mode === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.textContent = isDark ? '🌙' : '☀️';
  syncThemeSettingsButtons();
}

var FONT_ZOOM_LS = 'rpc-font-zoom';

function applyFontZoom() {
  var p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || '100', 10);
  if (!Number.isFinite(p)) p = 100;
  if (p < 90) p = 90;
  if (p > 140) p = 140;
  document.documentElement.style.zoom = String(p / 100);
}

function syncFontZoomButtons() {
  var p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || '100', 10);
  if (p !== 100 && p !== 110 && p !== 125) p = 100;
  ['100', '110', '125'].forEach(function(v) {
    var btn = document.getElementById('settings-font-' + v);
    if (btn) btn.classList.toggle('active', p === parseInt(v, 10));
  });
}

function setFontZoom(pct) {
  localStorage.setItem(FONT_ZOOM_LS, String(pct));
  applyFontZoom();
  syncFontZoomButtons();
}

function toggleTheme() {
  setThemeMode(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
}

// ── Alto contraste ────────────────────────────────────────────────
var HIGH_CONTRAST_LS = 'rpc-high-contrast';

function isHighContrast() {
  return localStorage.getItem(HIGH_CONTRAST_LS) === '1';
}

function applyHighContrast() {
  document.documentElement.classList.toggle('high-contrast', isHighContrast());
}

function syncHighContrastButtons() {
  var on = isHighContrast();
  var onBtn = document.getElementById('settings-hc-on');
  var offBtn = document.getElementById('settings-hc-off');
  if (onBtn) {
    onBtn.classList.toggle('active', on);
    onBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (offBtn) {
    offBtn.classList.toggle('active', !on);
    offBtn.setAttribute('aria-pressed', !on ? 'true' : 'false');
  }
}

function setHighContrast(on) {
  localStorage.setItem(HIGH_CONTRAST_LS, on ? '1' : '0');
  applyHighContrast();
  syncHighContrastButtons();
}

function toggleHighContrast() {
  setHighContrast(!isHighContrast());
}

// ── i18n (etiquetas de Apariencia / ajustes rápidos) ───────────────
var I18N_ES = {
  'settings.appearance':      'Apariencia',
  'settings.themeGroup':      'Tema de la aplicación',
  'settings.themeLight':      'Claro',
  'settings.themeDark':       'Oscuro',
  'settings.fontSize':        'Tamaño de texto',
  'settings.fontSizeHint':    'Escala toda la interfaz (útil en pantallas pequeñas).',
  'settings.fontNormal':      'Normal',
  'settings.fontLarge':       'Grande',
  'settings.fontXLarge':      'Más grande',
  'settings.highContrast':    'Alto contraste',
  'settings.highContrastHint':'Aumenta el contraste de texto y bordes para mejor legibilidad.',
  'settings.hcOff':           'Desactivado',
  'settings.hcOn':            'Activado',
  'settings.docsFolder':      'Carpeta de documentos',
  'settings.docsFolderHint':  'Los .docx generados se guardan aquí (si no eliges carpeta, se usa Descargas).',
  'settings.backup':          'Respaldo local',
  'settings.backupHint':      'Exporta o restaura pacientes, notas e indicaciones (JSON).',
  'settings.application':     'Aplicación',
  'settings.quickHelp':       'Centro de ayuda · atajos y tours',
  'settings.version':         'Versión',
  'settings.checkUpdates':    'Buscar actualizaciones…',
  'settings.open':            'Abrir ajustes',
  'settings.openTitle':       'Ajustes',
  'theme.toggle':             'Cambiar tema claro u oscuro',
  'theme.toggleTitle':        'Cambiar tema'
};

function t(key) {
  if (I18N_ES && Object.prototype.hasOwnProperty.call(I18N_ES, key)) return I18N_ES[key];
  return key;
}

function applyI18n() {
  var htmlEl = document.documentElement;
  if (htmlEl && htmlEl.getAttribute('lang') !== 'es') htmlEl.setAttribute('lang', 'es');
  var textNodes = document.querySelectorAll('[data-i18n]');
  textNodes.forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    if (!key) return;
    var val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.type === 'button' || el.type === 'submit' || el.type === 'reset') {
        el.value = val;
      } else {
        el.setAttribute('placeholder', val);
      }
    } else {
      el.textContent = val;
    }
  });
  var ariaNodes = document.querySelectorAll('[data-i18n-aria-label]');
  ariaNodes.forEach(function(el) {
    var key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key));
  });
  var titleNodes = document.querySelectorAll('[data-i18n-title]');
  titleNodes.forEach(function(el) {
    var key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });
  var placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderNodes.forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
}

// Set correct icon on load
(function() {
  if (document.documentElement.classList.contains('dark')) {
    document.getElementById('theme-toggle').textContent = '🌙';
  }
})();

applyHighContrast();
applyI18n();
syncLabHistoryCollapseUI();

document.getElementById('today-date').textContent =
  new Date().toLocaleDateString('es-MX', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
renderPatientList();
if (patients.length > 0) selectPatient(patients[0].id);
else renderLabHistoryPanel();
applyFontZoom();
loadSettings();
syncThemeSettingsButtons();
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
_rpcDeferInit(initRpcServerHealthWatch);
_rpcDeferInit(initIdleLockFeature);
initUpdateChannelAndGate();

function switchAppTab(tab) {
  activeAppTab = tab;
  document.getElementById('apptab-lab').classList.toggle('active', tab === 'lab');
  document.getElementById('apptab-nota').classList.toggle('active', tab === 'nota');
  document.getElementById('apptab-med').classList.toggle('active', tab === 'med');
  document.getElementById('appcontent-lab').style.display  = tab === 'lab'  ? 'flex' : 'none';
  document.getElementById('appcontent-med').style.display  = tab === 'med'  ? 'flex' : 'none';
  document.getElementById('appcontent-nota').style.display = tab === 'nota' ? 'flex' : 'none';
  if (tab === 'lab') renderLabHistoryPanel();
  if (tab === 'med') renderMedRecetaPanel();
}

function switchInnerTab(tab) {
  activeInner = tab;
  var ids = ['datos','notas','indica','tend','cult','listado'];
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
}

function renderInnerTabs() {
  var sala = isModeSala(settings);
  function show(id, visible) {
    var el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  }
  show('itab-datos', sala);
  show('itab-notas', !sala);
  show('itab-indica', !sala);
  show('itab-tend', true);
  show('itab-cult', true);
  show('itab-listado', sala);
  renderEstadoActualBar();
}

function getActiveInnerTab() {
  return activeInner || null;
}

// Listado de Problemas (Task 8) — UI completa con drag-and-drop y autosave.
function _todayDDMMYYYY() {
  var d = new Date();
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
}
function _nowHHMM() {
  var d = new Date();
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function ensureListadoForActive() {
  if (!activeId) return null;
  if (!listadoProblemas[activeId]) {
    listadoProblemas[activeId] = emptyListado(_todayDDMMYYYY(), _nowHHMM());
  }
  // Defensive: ensure arrays exist (en caso de datos corruptos).
  var l = listadoProblemas[activeId];
  if (!Array.isArray(l.activos)) l.activos = [];
  if (!Array.isArray(l.inactivos)) l.inactivos = [];
  return l;
}
function _autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 240) + 'px';
}
function _renderListadoRow(seccion, p, idx) {
  return (
    '<div class="listado-row" draggable="true" data-id="' + esc(p.id) + '" data-seccion="' + seccion + '">' +
      '<div class="listado-num" title="Arrastra para reordenar">' + (idx + 1) + '</div>' +
      '<input type="date" value="' + esc(p.fecha || '') + '" oninput="updateProblemaField(\'' + seccion + '\',\'' + esc(p.id) + '\',\'fecha\',this.value)" aria-label="Fecha del problema">' +
      '<textarea rows="1" placeholder="Descripción del problema" oninput="updateProblemaField(\'' + seccion + '\',\'' + esc(p.id) + '\',\'descripcion\',this.value); _autoGrowTextarea(this)" aria-label="Descripción">' + esc(p.descripcion || '') + '</textarea>' +
      '<button class="btn-remove-listado" onclick="removeProblemaUI(\'' + seccion + '\',\'' + esc(p.id) + '\')" aria-label="Quitar problema" title="Quitar">×</button>' +
    '</div>'
  );
}
function _renderListadoSeccion(seccion, label, lst) {
  var arr = lst[seccion] || [];
  var rows = arr.length
    ? arr.map(function(p, i){ return _renderListadoRow(seccion, p, i); }).join('')
    : '<div class="listado-empty">Sin problemas ' + label.toLowerCase() + '.</div>';
  return (
    '<div class="listado-section">' +
      '<div class="listado-section-header ' + seccion + '">' +
        '<span>' + label + ' (' + arr.length + ')</span>' +
      '</div>' +
      '<div class="listado-section-body" data-seccion-rows="' + seccion + '">' +
        rows +
      '</div>' +
      '<div class="listado-section-body" style="padding-top:0;">' +
        '<button class="listado-add-row" onclick="addProblemaUI(\'' + seccion + '\')">+ Agregar problema ' + label.toLowerCase() + '</button>' +
      '</div>' +
    '</div>'
  );
}
function renderListadoForm() {
  var c = document.getElementById('listado-form');
  if (!c) return;
  if (!activeId) { c.innerHTML = ''; return; }
  var patient = patients.find(function(p){ return p.id === activeId; });
  if (!patient) { c.innerHTML = ''; return; }
  var lst = ensureListadoForActive();
  c.innerHTML = (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:10px;align-items:end;">' +
      '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" class="field-readonly" readonly></div>' +
      '<div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" class="field-readonly" readonly></div>' +
      '<div class="field-group"><label>Edad/Sexo</label><input type="text" value="' + esc(patient.edad) + ' / ' + esc(patient.sexo) + '" class="field-readonly" readonly></div>' +
      '<div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" class="field-readonly" readonly></div>' +
      '<div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" class="field-readonly" readonly></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#374151;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora del Listado</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div class="field-group"><label>Fecha</label><input type="text" value="' + esc(lst.fecha) + '" placeholder="DD/MM/AAAA" oninput="updateListadoMeta(\'fecha\',this.value)"></div>' +
      '<div class="field-group"><label>Hora</label><input type="text" value="' + esc(lst.hora) + '" placeholder="HH:MM" oninput="updateListadoMeta(\'hora\',this.value)"></div>' +
    '</div></div></div>' +

    _renderListadoSeccion('activos', 'Activos', lst) +
    _renderListadoSeccion('inactivos', 'Inactivos', lst) +

    _renderListadoMedicosCard(lst) +

    '<div class="action-bar"><button class="btn-generate" onclick="quickExportCurrentPatient()" id="btn-quick-export-listado" style="background:#475569;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida rápida</button><button class="btn-generate" onclick="generateListado()" id="btn-gen-listado"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Listado de Problemas (.docx)</button></div>'
  );
  // auto-grow existing textareas
  c.querySelectorAll('.listado-row textarea').forEach(_autoGrowTextarea);
  // wire drag-and-drop
  setupListadoDragDrop();
}
function updateListadoMeta(field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  lst[field] = value;
  saveState();
}
function updateProblemaField(seccion, id, field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  var arr = lst[seccion] || [];
  var p = arr.find(function(x){ return x.id === id; });
  if (!p) return;
  p[field] = value;
  saveState();
}
function addProblemaUI(seccion) {
  var lst = ensureListadoForActive(); if (!lst) return;
  listadoProblemas[activeId] = listadoAddProblema(lst, seccion, { fecha: '', descripcion: '' });
  saveState();
  renderListadoForm();
  setTimeout(function(){
    var rows = document.querySelectorAll('[data-seccion-rows="' + seccion + '"] .listado-row textarea');
    if (rows.length) rows[rows.length - 1].focus();
  }, 0);
}
function removeProblemaUI(seccion, id) {
  var lst = ensureListadoForActive(); if (!lst) return;
  listadoProblemas[activeId] = listadoRemoveProblema(lst, seccion, id);
  saveState();
  renderListadoForm();
}
function setupListadoDragDrop() {
  var rows = document.querySelectorAll('#listado-form .listado-row');
  rows.forEach(function(row) {
    row.addEventListener('dragstart', function(e) {
      row.classList.add('dragging');
      try {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: row.dataset.id, seccion: row.dataset.seccion }));
        e.dataTransfer.effectAllowed = 'move';
      } catch (_e) {}
    });
    row.addEventListener('dragend', function() {
      row.classList.remove('dragging');
      document.querySelectorAll('#listado-form .listado-row.drag-over').forEach(function(r){ r.classList.remove('drag-over'); });
    });
    row.addEventListener('dragover', function(e) {
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (_e) {}
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', function() { row.classList.remove('drag-over'); });
    row.addEventListener('drop', function(e) {
      e.preventDefault();
      row.classList.remove('drag-over');
      var data;
      try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (_e) { return; }
      if (!data || data.seccion !== row.dataset.seccion) return; // sólo dentro de la misma sección
      if (data.id === row.dataset.id) return;
      var lst = ensureListadoForActive(); if (!lst) return;
      var arr = lst[data.seccion] || [];
      var fromIdx = arr.findIndex(function(p){ return p.id === data.id; });
      var toIdx   = arr.findIndex(function(p){ return p.id === row.dataset.id; });
      if (fromIdx === -1 || toIdx === -1) return;
      listadoProblemas[activeId] = listadoReorderProblema(lst, data.seccion, fromIdx, toIdx);
      saveState();
      renderListadoForm();
    });
  });
}
function _renderListadoMedicosCard(lst) {
  var meds = getMedicosForListado(lst);
  function row(key, label) {
    return (
      '<div class="field-group"><label>' + label + '</label>' +
      '<input type="text" value="' + esc(meds[key] || '') + '" oninput="updateListadoMedico(\'' + key + '\', this.value)">' +
      '</div>'
    );
  }
  return (
    '<div class="card"><div class="card-header" style="background:#0f766e;">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
      'Médicos (firma)' +
      '<span style="margin-left:auto;font-size:11px;font-weight:500;color:rgba(255,255,255,0.85);">Pre-llena desde Mi Perfil. Edita aquí para este paciente.</span>' +
    '</div><div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      row('profesor', 'Profesor') +
      row('r4',       'R4') +
      row('r2',       'R2') +
      row('r1a',      'R1 (1)') +
      row('r1b',      'R1 (2)') +
    '</div></div>'
  );
}

function generateListado() {
  if (typeof isRpcOffline === 'function' && isRpcOffline()) {
    showToast('Sin conexión con el servidor local. Reinicia R+ para generar documentos.', 'error');
    return;
  }
  if (!activeId) { showToast('Selecciona un paciente primero', 'error'); return; }
  var patient = patients.find(function(p){ return p.id === activeId; });
  if (!patient) return;
  var lst = ensureListadoForActive(); if (!lst) return;
  var hasProblems = (lst.activos && lst.activos.length) || (lst.inactivos && lst.inactivos.length);
  if (!hasProblems) {
    showToast('Agrega al menos un problema antes de generar.', 'error');
    return;
  }
  var medicos = getMedicosForListado(lst);
  var btn = document.getElementById('btn-gen-listado');
  if (btn) { btn.classList.add('loading'); btn.disabled = true; }
  if (typeof incrementPendingJobs === 'function') incrementPendingJobs();
  function buildPayload(outputDir) {
    return {
      patient: patient,
      listado: lst,
      medicos: medicos,
      outputDir: outputDir || '',
    };
  }
  requestDocumentJson('/generate-listado', buildPayload(settings.outputDir || ''))
  .then(function(d){
    return handleDocumentGenerateResponse({
      response: d,
      url: '/generate-listado',
      buildPayload: buildPayload,
      onSuccess: function(data) {
        showToast('Listado guardado: ' + data.fileName, 'success');
      },
    });
  })
  .catch(function(){ showToast('Error de conexión', 'error'); })
  .finally(function(){
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    if (typeof decrementPendingJobs === 'function') decrementPendingJobs();
    if (typeof syncOfflineButtonStates === 'function') syncOfflineButtonStates();
  });
}
function renderEstadoActualButton() { /* Task 9 */ }

function onPatientSearchInput(val) {
  patientSearchFilter = (val || '').trim().toLowerCase();
  renderPatientList();
}

function patientMatchesSearch(p) {
  if (!patientSearchFilter) return true;
  var q = patientSearchFilter;
  return (String(p.nombre || '').toLowerCase().indexOf(q) !== -1) ||
    (String(p.registro || '').toLowerCase().indexOf(q) !== -1) ||
    (String(p.cuarto || '').toLowerCase().indexOf(q) !== -1) ||
    (String(p.cama || '').toLowerCase().indexOf(q) !== -1) ||
    (String(p.servicio || '').toLowerCase().indexOf(q) !== -1) ||
    (String(p.area || '').toLowerCase().indexOf(q) !== -1);
}

function ensurePatientUiState() {
  var changed = false;
  for (var i = 0; i < patients.length; i++) {
    var p = patients[i];
    if (!p) continue;
    if (typeof p.archived !== 'boolean') {
      p.archived = false;
      changed = true;
    }
    if (typeof p.pinned !== 'boolean') {
      p.pinned = false;
      changed = true;
    }
  }
  if (changed) saveState();
}

function isArchivedSectionCollapsed() {
  try { return localStorage.getItem(ARCHIVED_SECTION_COLLAPSED_LS) === '1'; } catch (_e) { return false; }
}
function setArchivedSectionCollapsed(v) {
  try { localStorage.setItem(ARCHIVED_SECTION_COLLAPSED_LS, v ? '1' : '0'); } catch (_e) {}
}
function toggleArchivedSection(ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  setArchivedSectionCollapsed(!isArchivedSectionCollapsed());
  renderPatientList();
}

function patientSectionKey(p) {
  if (p && p.archived) return 'archived';
  if (p && p.pinned) return 'pinned';
  return 'active';
}

function movePatientBefore(targetId, beforeId) {
  if (!targetId || !beforeId || targetId === beforeId) return;
  var from = patients.findIndex(function (p) { return p.id === targetId; });
  var to = patients.findIndex(function (p) { return p.id === beforeId; });
  if (from < 0 || to < 0 || from === to) return;
  var moved = patients.splice(from, 1)[0];
  if (from < to) to -= 1;
  patients.splice(to, 0, moved);
}

function movePatientByOffset(ev, id, dir) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = patients.find(function (x) { return x.id === id; });
  if (!p) return;
  var sec = patientSectionKey(p);
  var ids = patients
    .filter(function (x) { return patientSectionKey(x) === sec; })
    .map(function (x) { return x.id; });
  var idx = ids.indexOf(id);
  if (idx < 0) return;
  var next = idx + dir;
  if (next < 0 || next >= ids.length) return;
  movePatientBefore(id, ids[next]);
  saveState();
  renderPatientList();
}

function togglePatientPinned(ev, id) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = patients.find(function (x) { return x.id === id; });
  if (!p) return;
  p.pinned = !p.pinned;
  if (p.pinned) p.archived = false;
  saveState();
  renderPatientList();
}

function togglePatientArchived(ev, id) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = patients.find(function (x) { return x.id === id; });
  if (!p) return;
  p.archived = !p.archived;
  if (p.archived) p.pinned = false;
  if (!p.archived) setArchivedSectionCollapsed(false);
  saveState();
  renderPatientList();
}

function onPatientDragStart(ev, id) {
  if (patientSearchFilter) {
    if (ev) ev.preventDefault();
    showToast('Quita el filtro de búsqueda para reordenar.', 'error');
    return;
  }
  dragPatientId = id;
  var card = ev && ev.currentTarget ? ev.currentTarget : null;
  if (card && card.classList) card.classList.add('is-dragging');
  if (!ev || !ev.dataTransfer) return;
  ev.dataTransfer.effectAllowed = 'move';
  try { ev.dataTransfer.setData('text/plain', id); } catch (_e) {}
}
function onPatientDragOver(ev, id) {
  if (!dragPatientId || !id || dragPatientId === id) return;
  var dragP = patients.find(function (x) { return x.id === dragPatientId; });
  var overP = patients.find(function (x) { return x.id === id; });
  if (!dragP || !overP || patientSectionKey(dragP) !== patientSectionKey(overP)) return;
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  var overEl = ev.currentTarget;
  var list = document.getElementById('patient-list');
  if (!overEl || !list) return;
  var dragEl = list.querySelector('.patient-card.is-dragging');
  if (!dragEl || dragEl === overEl) return;
  var cardsBefore = list.querySelectorAll('.patient-card[data-patient-id]');
  var beforeRects = Object.create(null);
  for (var i = 0; i < cardsBefore.length; i++) {
    var bid = cardsBefore[i].getAttribute('data-patient-id');
    if (!bid || cardsBefore[i] === dragEl) continue;
    beforeRects[bid] = cardsBefore[i].getBoundingClientRect();
  }
  var rect = overEl.getBoundingClientRect();
  var after = ev.clientY > rect.top + rect.height / 2;
  if (after) {
    if (overEl.nextSibling !== dragEl) list.insertBefore(dragEl, overEl.nextSibling);
  } else if (overEl !== dragEl.nextSibling) {
    list.insertBefore(dragEl, overEl);
  }
  animatePatientListReflow(list, beforeRects);
}
function onPatientDrop(ev, id) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if (!dragPatientId) return;
  syncPatientsOrderFromDom();
  dragPatientId = null;
  saveState();
  renderPatientList();
}
function onPatientDragEnd(ev) {
  dragPatientId = null;
  var card = ev && ev.currentTarget ? ev.currentTarget : null;
  if (card && card.classList) card.classList.remove('is-dragging');
  var list = document.getElementById('patient-list');
  if (!list) return;
}

function syncPatientsOrderFromDom() {
  var list = document.getElementById('patient-list');
  if (!list) return;
  var cards = list.querySelectorAll('.patient-card[data-patient-id]');
  if (!cards || !cards.length) return;
  var order = [];
  for (var i = 0; i < cards.length; i++) {
    var pid = cards[i].getAttribute('data-patient-id');
    if (pid) order.push(pid);
  }
  if (!order.length) return;
  var rank = Object.create(null);
  for (var j = 0; j < order.length; j++) rank[order[j]] = j;
  var missingBase = order.length + 1000;
  patients.sort(function (a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a.id) ? rank[a.id] : missingBase;
    var rb = Object.prototype.hasOwnProperty.call(rank, b.id) ? rank[b.id] : missingBase;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

function animatePatientListReflow(list, beforeRects) {
  if (!list || !beforeRects) return;
  var cards = list.querySelectorAll('.patient-card[data-patient-id]');
  for (var i = 0; i < cards.length; i++) {
    var el = cards[i];
    if (!el || el.classList.contains('is-dragging')) continue;
    var id = el.getAttribute('data-patient-id');
    var prev = beforeRects[id];
    if (!id || !prev) continue;
    var now = el.getBoundingClientRect();
    var dy = prev.top - now.top;
    if (!dy) continue;
    el.style.transition = 'none';
    el.style.transform = 'translateY(' + dy + 'px)';
    el.style.willChange = 'transform';
    requestAnimationFrame(function (node) {
      return function () {
        node.style.transition = 'transform 340ms cubic-bezier(0.18, 1.25, 0.35, 1)';
        node.style.transform = '';
        window.setTimeout(function () {
          if (!node.classList.contains('is-dragging')) {
            node.style.transition = '';
            node.style.willChange = '';
          }
        }, 360);
      };
    }(el));
  }
}

function renderPatientCardHtml(p) {
  var pinOn = !!p.pinned;
  var archOn = !!p.archived;
  var pinTitle = pinOn ? 'Quitar de Pinned' : 'Mover a Pinned';
  var archTitle = archOn ? 'Restaurar del archivo' : 'Archivar paciente';
  var archiveIcon = archOn
    ? '↩'
    : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"></rect><path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"></path><path d="M10 12h4"></path></svg>';
  return (
    '<div class="patient-card ' + (p.id===activeId?'active':'') + '" data-patient-id="' + p.id + '" draggable="true" ' +
    'ondragstart="onPatientDragStart(event,\'' + p.id + '\')" ' +
    'ondragover="onPatientDragOver(event,\'' + p.id + '\')" ' +
    'ondrop="onPatientDrop(event,\'' + p.id + '\')" ' +
    'ondragend="onPatientDragEnd(event)" ' +
    'onclick="selectPatient(\'' + p.id + '\')">' +
    '<div class="patient-card-toolbar">' +
    '<div class="patient-card-toolbar-left">' +
    '<button class="btn-patient-action btn-archive-clean" title="' + archTitle + '" aria-label="' + archTitle + '" onclick="togglePatientArchived(event,\'' + p.id + '\')">' + archiveIcon + '</button>' +
    '<button class="btn-patient-action btn-pinned-text" title="' + pinTitle + '" aria-label="' + pinTitle + '" onclick="togglePatientPinned(event,\'' + p.id + '\')">Pinned</button>' +
    '</div>' +
    '<button class="btn-delete-card" onclick="deletePatient(event,\'' + p.id + '\')" aria-label="Eliminar">×</button>' +
    '</div>' +
    '<div class="p-name">' + esc(p.nombre||'Sin nombre') + '</div>' +
    '<div class="p-meta"><span>Cto. ' + esc(p.cuarto||'-') + '</span><span>Cama ' + esc(p.cama||'-') + '</span><span>' + esc(p.servicio||'-') + '</span>' +
    (p.fromLab ? '<span class="lab-chip">LAB</span>' : '') +
    (pinOn ? '<span class="patient-flag-chip">Pinned</span>' : '') +
    (archOn ? '<span class="patient-flag-chip">Archivado</span>' : '') +
    '</div></div>'
  );
}

function renderPatientList() {
  ensurePatientUiState();
  var list = document.getElementById('patient-list');
  if (!patients.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Sin pacientes aún</div>';
    return;
  }
  var filtered = patients.filter(patientMatchesSearch);
  if (!filtered.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">Ningún paciente coincide con la búsqueda</div>';
    return;
  }
  var pinned = filtered.filter(function (p) { return p.pinned && !p.archived; });
  var active = filtered.filter(function (p) { return !p.pinned && !p.archived; });
  var archived = filtered.filter(function (p) { return !!p.archived; });
  var parts = [];
  if (pinned.length) {
    parts.push('<div class="patient-list-section-label">Pinned · Fijados <span>' + pinned.length + '</span></div>');
    parts.push(pinned.map(renderPatientCardHtml).join(''));
  }
  if (active.length) {
    parts.push('<div class="patient-list-section-label">Pacientes <span>' + active.length + '</span></div>');
    parts.push(active.map(renderPatientCardHtml).join(''));
  }
  if (archived.length) {
    var collapsed = isArchivedSectionCollapsed();
    parts.push('<button class="patient-list-section-toggle" onclick="toggleArchivedSection(event)" aria-expanded="' + (!collapsed ? 'true' : 'false') + '">Archivados <span>(' + archived.length + ')</span> <span>' + (collapsed ? '▶' : '▼') + '</span></button>');
    if (!collapsed) parts.push(archived.map(renderPatientCardHtml).join(''));
  }
  list.innerHTML = parts.join('');
}

function selectPatient(id) {
  var prevId = activeId;
  var wasOnLab = activeAppTab === 'lab';
  var patientChanged = prevId != null && String(prevId) !== String(id);
  activeId = id;
  renderPatientList();
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('patient-view').style.display = 'flex';
  renderInnerTabs();
  renderEstadoActualButton();
  renderNoteForm();
  renderIndicaForm();
  renderListadoForm();
  refreshTendenciasOrCultivosPanel();
  renderLabHistoryPanel();
  renderMedRecetaPanel();
  if (isModeSala(settings) && (activeInner === 'notas' || activeInner === 'indica' || !activeInner)) {
    switchInnerTab('tend');
  } else if (!isModeSala(settings) && activeInner === 'listado') {
    switchInnerTab('notas');
  }
  // En Laboratorio: al elegir otro paciente, pantalla coherente con su historial
  // (resultados previos eran del paciente anterior; historial visible y expandido).
  if (wasOnLab && patientChanged) {
    switchAppTab('lab');
    limpiarReporte();
    setLabHistoryPanelCollapsed(false);
    syncLabHistoryCollapseUI();
    renderLabHistoryPanel();
    var labHistCard = document.getElementById('lab-history-card');
    if (labHistCard) {
      window.setTimeout(function () {
        try {
          labHistCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (_e) {
          labHistCard.scrollIntoView(true);
        }
      }, 0);
    }
  }
}

function deletePatient(e, id) {
  e.stopPropagation();
  if (!confirm('¿Eliminar este paciente y sus notas?')) return;
  var target = patients.find(function(p){ return p.id === id; });
  var label = target ? ('Eliminar ' + (target.nombre || 'paciente')) : 'Eliminar paciente';
  if (typeof pushUndoSnapshot === 'function') pushUndoSnapshot(label);
  patients = patients.filter(function(p){ return p.id !== id; });
  delete notes[id]; delete indicaciones[id];
  if (labHistory && labHistory[id]) delete labHistory[id];
  if (medRecetaByPatient && medRecetaByPatient[id]) delete medRecetaByPatient[id];
  if (medNotaSelectionByPatient && medNotaSelectionByPatient[id]) delete medNotaSelectionByPatient[id];
  if (listadoProblemas && listadoProblemas[id]) delete listadoProblemas[id];
  saveState();
  addAuditEntry('patient-delete', 'ok', 1, target ? (target.registro || target.nombre || '') : '');
  if (activeId === id) activeId = patients.length ? patients[0].id : null;
  renderPatientList();
  if (activeId) selectPatient(activeId);
  else { document.getElementById('patient-view').style.display='none'; document.getElementById('empty-state').style.display='flex'; }
}

function saveState() {
  storage.saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient, listadoProblemas);
}

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
    // (theme/zoom/contrast/update-channel) in case callers expected them.
    syncFontZoomButtons();
    syncHighContrastButtons();
    if (typeof syncUpdateChannelUI === 'function') syncUpdateChannelUI();
    if (typeof syncUpdateTelemetryUI === 'function') syncUpdateTelemetryUI();
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
  if (hintEl) hintEl.style.display = window.electronAPI ? 'block' : 'none';
  var udEl = document.getElementById('settings-user-data-path');
  var udHint = document.getElementById('settings-userdata-web-hint');
  var udBtn = document.getElementById('settings-open-userdata-btn');
  if (window.electronAPI && typeof window.electronAPI.getUserDataPath === 'function') {
    if (udHint) udHint.style.display = 'none';
    if (udBtn) udBtn.disabled = false;
    window.electronAPI.getUserDataPath().then(function(p) {
      if (udEl) {
        udEl.textContent = p || '—';
        udEl.title = p || '';
      }
    }).catch(function() { if (udEl) udEl.textContent = '—'; });
  } else {
    if (udEl) udEl.textContent = 'Navegador / modo desarrollo';
    if (udHint) udHint.style.display = 'block';
    if (udBtn) udBtn.disabled = true;
  }
  syncFontZoomButtons();
  syncHighContrastButtons();
  if (typeof syncUpdateChannelUI === 'function') syncUpdateChannelUI();
  if (typeof syncUpdateTelemetryUI === 'function') syncUpdateTelemetryUI();
  syncIdleLockSelectUi();
  syncPreimportBackupUi();
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

function onAppModeChange() {
  var sala = document.getElementById('app-mode-sala');
  settings.appMode = (sala && sala.checked) ? 'sala' : 'interconsulta';
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  var current = getActiveInnerTab();
  var nowSala = isModeSala(settings);
  if (nowSala && (current === 'notas' || current === 'indica')) switchInnerTab('tend');
  else if (!nowSala && (current === 'listado' || current === 'datos')) switchInnerTab('notas');
  renderInnerTabs();
  renderEstadoActualButton();
  if (activeId) renderNoteForm();
  showToast('Modo cambiado a ' + (nowSala ? 'Sala' : 'Interconsulta'), 'success');
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

function getMedicosForListado(lst) {
  var tpl = settings.medicosPlantilla || {};
  var override = (lst && lst.medicos) || {};
  function pick(k) { return (override[k] && override[k].trim()) ? override[k] : (tpl[k] || ''); }
  return {
    profesor: pick('profesor'),
    r4:       pick('r4'),
    r2:       pick('r2'),
    r1a:      pick('r1a'),
    r1b:      pick('r1b'),
  };
}

function updateListadoMedico(field, value) {
  var lst = ensureListadoForActive(); if (!lst) return;
  if (!lst.medicos) lst.medicos = {};
  lst.medicos[field] = value;
  saveState();
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

// Backwards-compatible wrappers (the sidebar button used to call these directly).
function toggleProfileSection() {
  var modal = document.getElementById('profile-modal');
  if (!modal) return;
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
function toggleSettingsDropdown() {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (!dd) return;
  var open = dd.classList.contains('open');
  dd.classList.toggle('open', !open);
  if (bg) bg.classList.toggle('open', !open);
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', !open ? 'true' : 'false');
  if (!open && typeof syncPreimportBackupUi === 'function') syncPreimportBackupUi();
}
function closeSettingsDropdown() {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (dd) dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function checkForAppUpdates() {
  if (!window.electronAPI || typeof window.electronAPI.checkForUpdates !== 'function') {
    showToast('Las actualizaciones automáticas solo están en la app de escritorio.', 'error');
    return;
  }
  window.electronAPI.checkForUpdates();
  showToast('Buscando actualizaciones…', 'success');
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

function applyProfileToNoteIfEmpty(note) {
  if (!note) return false;
  var changed = false;
  if (settings.doctorName && !String(note.medico || '').trim()) {
    note.medico = settings.doctorName;
    changed = true;
  }
  if (settings.profesorName && !String(note.profesor || '').trim()) {
    note.profesor = settings.profesorName;
    changed = true;
  }
  return changed;
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

// ── Tour guiado (modal intro + panel por pasos) ───────────────────
var GUIDED_TOUR_LS_KEY = 'rpc-guided-tour-done-for-version';

function resolveAppVersionForTour() {
  if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
    return window.electronAPI.getAppVersion().catch(function() { return 'dev'; });
  }
  return Promise.resolve('dev');
}

function initGuidedTourGate() {
  resolveAppVersionForTour().then(function(v) {
    window.__RPC_APP_VERSION__ = v;
    var done = localStorage.getItem(GUIDED_TOUR_LS_KEY);
    if (done !== v) setTimeout(showTourIntroModal, 80);
  });
}

function showTourIntroModal() {
  var el = document.getElementById('onboarding-intro-backdrop');
  var ver = window.__RPC_APP_VERSION__ || '';
  var h2 = document.getElementById('intro-modal-title');
  if (h2) h2.textContent = ver ? ('R+ · versión ' + ver) : 'Bienvenido a R+';
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
}

function hideTourIntroModal() {
  var el = document.getElementById('onboarding-intro-backdrop');
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

function markGuidedTourVersionDone() {
  localStorage.setItem(GUIDED_TOUR_LS_KEY, window.__RPC_APP_VERSION__ || 'dev');
}

function guidedTourIntroSkip() {
  markGuidedTourVersionDone();
  hideTourIntroModal();
}

function guidedTourIntroChooseSala() {
  hideTourIntroModal();
  startOnboarding('sala');
}

function guidedTourIntroChooseInterconsulta() {
  hideTourIntroModal();
  startOnboarding('interconsulta');
}

function showTourDock() {
  document.getElementById('tour-dock').classList.add('tour-dock-visible');
}

function hideTourDock() {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  d.classList.remove('tour-dock-visible');
  d.classList.remove('tour-dock-collapsed');
  d.classList.remove('tour-dock-pos-left');
  var btn = document.getElementById('btn-tour-collapse');
  if (btn) { btn.textContent = '–'; btn.setAttribute('aria-label', 'Minimizar tutorial'); }
}

// Colapsa el dock a sólo el encabezado (badge + acciones) para que el
// tour deje de bloquear el contenido. Se reexpande con el mismo botón.
function toggleTourDockCollapsed() {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  setTourDockCollapsed(!d.classList.contains('tour-dock-collapsed'));
}

function setTourDockCollapsed(collapsed) {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  if (collapsed) d.classList.add('tour-dock-collapsed');
  else d.classList.remove('tour-dock-collapsed');
  var btn = document.getElementById('btn-tour-collapse');
  if (btn) {
    btn.textContent = collapsed ? '+' : '–';
    btn.setAttribute('aria-label', collapsed ? 'Expandir tutorial' : 'Minimizar tutorial');
  }
}

// Click en cualquier parte del dock colapsado lo expande (excepto en
// los botones del encabezado, que ya tienen su propio handler).
function onTourDockClick(ev) {
  var d = document.getElementById('tour-dock');
  if (!d || !d.classList.contains('tour-dock-collapsed')) return;
  var t = ev && ev.target;
  if (t && t.closest && t.closest('.btn-tour-skip, .btn-tour-collapse, .btn-tour-next')) return;
  setTourDockCollapsed(false);
  ev.stopPropagation();
}

function seedDemoTrendHistory() {
  try {
    var older = procesarLabs(OLDER_DEMO_LAB_REPORT).resLabs;
    var newer = procesarLabs(DEMO_LAB_REPORT).resLabs;
    labHistory[DEMO_PATIENT_ID] = [
      { id: 'tour-trend-1', fecha: '05/03/2026', hora: '', resLabs: older, parsed: extractParsedValues(older) },
      { id: 'tour-trend-2', fecha: '11/04/2026', hora: '', resLabs: newer, parsed: extractParsedValues(newer) }
    ];
  } catch (e) {
    delete labHistory[DEMO_PATIENT_ID];
  }
}

function ensureProfileExpandedForTour() {
  // Desde 3.0 el perfil vive en un modal centrado; lo abrimos directamente.
  openProfileModal();
}

function ensureSettingsExpandedForTour() {
  var dd = document.getElementById('settings-dropdown');
  if (!dd) return;
  if (!dd.classList.contains('open')) toggleSettingsDropdown();
}

function clearTourSoapButtonHighlight() {
  var b = document.getElementById('btn-soap-template');
  if (b) b.classList.remove('tour-spotlight-soap');
}

function syncTourSoapButtonHighlight() {
  clearTourSoapButtonHighlight();
  if (!guidedTourActive || tourStepId !== 'sala_soap') return;
  setTimeout(function () {
    var btn = document.getElementById('btn-soap-template');
    if (btn && guidedTourActive && tourStepId === 'sala_soap') {
      btn.classList.add('tour-spotlight-soap');
    }
  }, 120);
}

function getGuidedTourSteps() {
  return getTourSteps(guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala');
}

function guidedTourStepIndex() {
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourStepId);
  return i < 0 ? 0 : i;
}

// Quita cualquier resaltado del paso anterior antes de pintar el siguiente.
function clearAllTourSpotlights() {
  var cls = ['tour-spotlight-soap', 'tour-spotlight-action'];
  cls.forEach(function (c) {
    document.querySelectorAll('.' + c).forEach(function (el) { el.classList.remove(c); });
  });
}

// Pasos donde el botón resaltado suele estar arriba a la derecha: dock abajo-derecha lo tapa.
var TOUR_DOCK_LEFT_STEPS = { lab_send: 1, ic_nota: 1, ic_indica: 1, estado_actual: 1 };

function syncTourDockPlacement() {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  var useLeft = false;
  if (guidedTourActive && tourStepId && TOUR_DOCK_LEFT_STEPS[tourStepId]) useLeft = true;
  if (miniTourActive && miniTourSteps && miniTourSteps[miniTourIdx] && miniTourSteps[miniTourIdx].dockLeft) {
    useLeft = true;
  }
  if (useLeft) d.classList.add('tour-dock-pos-left');
  else d.classList.remove('tour-dock-pos-left');
}

// Lleva al usuario al elemento del paso actual: cambia tab/tab interno,
// abre Mi Perfil/Ajustes si aplica, hace scroll y aplica spotlight para
// que la zona de avance sea inequívoca.
function applyTourTargetForStep(id) {
  var t = getTourTarget(id, guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala');
  if (!t) return;

  if (t.appTab) switchAppTab(t.appTab);
  if (t.innerTab) {
    switchInnerTab(t.innerTab);
    if (t.appTab === 'nota') {
      if (t.innerTab === 'notas') renderNoteForm();
      else if (t.innerTab === 'indica') renderIndicaForm();
    }
  }
  // Si el paso anterior abrió Mi Perfil o Ajustes y el siguiente no los
  // necesita, ciérralos para que no queden flotando encima del nuevo
  // objetivo (p. ej. servicio_default → lab_parse).
  if (t.openProfile) ensureProfileExpandedForTour();
  else if (typeof closeProfileModal === 'function') closeProfileModal();
  if (t.openSettings) ensureSettingsExpandedForTour();
  else if (typeof closeSettingsDropdown === 'function') closeSettingsDropdown();
  if (id === 'sala_med') renderMedRecetaPanel();

  // Pre-pega el reporte demo cuando el siguiente click esperado es
  // "Procesar"; sin texto el botón no hace nada y bloquearía el tour.
  if (id === 'lab_parse' || id === 'map') {
    var li = document.getElementById('lab-input');
    if (li && !li.value) li.value = DEMO_LAB_REPORT;
  }

  clearAllTourSpotlights();
  if (!t.selector) return;
  setTimeout(function () {
    if (!guidedTourActive || tourStepId !== id) return;
    var el = document.querySelector(t.selector);
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    var spotlightCls = t.spotlightClass || (stepRequiresUserAction(id) ? 'tour-spotlight-soap' : null);
    if (spotlightCls) el.classList.add(spotlightCls);
    if (t.focus && typeof el.focus === 'function') {
      try { el.focus({ preventScroll: true }); } catch (e2) { try { el.focus(); } catch (e3) {} }
    }
  }, 140);
}

// Compatibilidad hacia atrás (otras partes pueden invocar este nombre).
function applyTourNavigationForStep(id) { applyTourTargetForStep(id); }

function renderTourStep() {
  if (!guidedTourActive) return;
  var badge = document.getElementById('tour-step-badge');
  var bodyEl = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var steps = getGuidedTourSteps();
  var total = steps.length;
  var idx = guidedTourStepIndex() + 1;
  var branchLabel = guidedTourBranch === 'interconsulta' ? 'Interconsulta' : 'Sala';
  function setBadge(sub) {
    badge.textContent = 'Paso ' + idx + ' de ' + total + ' · ' + branchLabel + (sub ? ' · ' + sub : '');
  }
  nextBtn.style.display = '';
  nextBtn.disabled = false;

  switch (tourStepId) {
    case 'map':
      setBadge('mapa de la app');
      if (guidedTourBranch === 'interconsulta') {
        bodyEl.innerHTML =
          '<p style="margin:0 0 10px 0;">Recorrido <strong>completo</strong> (laboratorio, tendencias, SOAP, medicamentos). La diferencia es el <strong>énfasis al final</strong>: exportar <strong>Nota de evolución</strong> e <strong>Indicaciones</strong> a <strong>Word (.docx)</strong>, carpeta de salida y Salida rápida.</p>' +
          '<ul style="margin:0;padding-left:1.15rem;line-height:1.5;">' +
          '<li><strong>Izquierda:</strong> lista de pacientes. El demo <strong>DEMO PÉREZ</strong> no se guarda en tu historial real.</li>' +
          '<li>La barra lateral ya permite <strong>Pinned · Fijados</strong>, <strong>archivar</strong> y <strong>reordenar</strong> (arrastrar o con flechas).</li>' +
          '<li><strong>Arriba:</strong> <strong>Laboratorio</strong>, <strong>Expediente</strong> (nota, indicaciones, tendencias, cultivos) y <strong>Medicamentos</strong>.</li>' +
          '<li>En <strong>Laboratorio</strong>, el historial del paciente tiene <strong>Sincronizar</strong> (quita duplicados con checklist) y <strong>Consolidar</strong> (fusiona conjuntos del mismo día: solo labs entre sí o solo cultivos entre sí).</li>' +
          '<li>R+ avisa si creas un paciente duplicado por nombre o registro.</li>' +
          '</ul>';
      } else {
        bodyEl.innerHTML =
          '<p style="margin:0 0 10px 0;">Recorrido <strong>sala / hospitalización</strong>: laboratorio, tendencias, <strong>plantilla SOAP</strong> para la evolución y <strong>Medicamentos</strong> (receta → nota / SOAP).</p>' +
          '<ul style="margin:0;padding-left:1.15rem;line-height:1.5;">' +
          '<li><strong>Laboratorio</strong> interpreta el reporte pegado y arma diagramas.</li>' +
          '<li>En la barra lateral puedes usar <strong>Pinned · Fijados</strong>, <strong>archivar</strong> y <strong>reordenar</strong> pacientes (drag & drop o flechas).</li>' +
          '<li>Tras enviar labs, en el <strong>historial de laboratorio</strong> del paciente usa <strong>Sincronizar</strong> para limpiar duplicados y <strong>Consolidar</strong> para unir conjuntos del mismo día (homogéneos).</li>' +
          '<li><strong>Tendencias</strong> comparan varios labs en el tiempo; <strong>Cultivos</strong> resume uro/hemo/Gram/catéter por tipo y fecha.</li>' +
          '<li><strong>SOAP</strong> rellena analgesia, antibióticos, antiHTA, vasopresores, etc., para pegar en la evolución.</li>' +
          '<li><strong>Medicamentos</strong> clasifica lo que marques y lo manda a la plantilla SOAP o al tratamiento.</li>' +
          '</ul>';
      }
      nextBtn.textContent = 'Siguiente';
      break;
    case 'lab_parse':
      setBadge('laboratorio · procesar');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;">Ya tienes un reporte de ejemplo pegado. Pulsa <strong>Procesar</strong> para que R+ lea biometría, química, electrolitos, función hepática y más.</p>' +
        '<p style="margin:0;font-size:13px;color:var(--text-muted);">Se generan diagramas (Gamble, BH, etc.) y una tabla con alteraciones en rojo. Cada diagrama tiene <strong>Copiar</strong> por si lo quieres en otro sistema.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'lab_view':
      setBadge('laboratorio · revisar');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;">Revisa <strong>Diagramas</strong> y la tarjeta de <strong>Resultados</strong>. Cuando quieras volcar todo al expediente, usa <strong>Enviar a nota</strong> (arriba a la derecha en resultados).</p>' +
        '<p style="margin:0 0 8px 0;">En la tarjeta <strong>Historial de laboratorio</strong> (misma pestaña), cuando tengas varias entradas: <strong>Sincronizar</strong> abre un checklist para quitar duplicados (misma fecha/hora y mismos resultados; se conserva la más antigua). <strong>Consolidar</strong> fusiona conjuntos del <strong>mismo día calendario</strong> si son del mismo tipo (solo laboratorio con laboratorio, o solo cultivos con cultivos; los mixtos no se tocan).</p>' +
        '<p style="margin:0;font-size:13px;color:var(--text-muted);">Eso alimenta el bloque de estudios, el historial de labs, tendencias y la pestaña Cultivos.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'lab_send':
      setBadge('laboratorio · enviar');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;">Pulsa <strong>Enviar a nota</strong> para guardar este conjunto en el paciente demo y seguir el flujo.</p>' +
        '<p style="margin:0;font-size:13px;color:var(--text-muted);">Después, si acumulas más envíos, repasa <strong>Sincronizar</strong> y <strong>Consolidar</strong> en el historial para mantener orden y evitar líneas repetidas en la nota.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'ic_nota':
      setBadge('énfasis · Nota .docx');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;"><strong>Enfoque interconsulta:</strong> dejar la <strong>Nota de evolución</strong> lista y generar el <strong>.docx</strong> para informe, archivo o envío. Ya repasaste laboratorio, tendencias, SOAP y medicamentos.</p>' +
        '<ul style="margin:0;padding-left:1.15rem;line-height:1.5;">' +
        '<li><strong>Generar Nota (.docx)</strong>: documento con membrete y bloques clínicos; ruta en <strong>Ajustes → Carpeta de documentos</strong> (o Descargas por defecto).</li>' +
        '<li><strong>Salida rápida</strong> (gris): un clic según formato docx / html / txt configurado en Ajustes.</li>' +
        '<li>Si falta texto, usa de nuevo la <strong>plantilla SOAP</strong> o edita interrogatorio y evolución antes de generar.</li>' +
        '</ul>' +
        '<p style="margin:10px 0 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Generar Nota (.docx)</strong> para avanzar (si el servidor local no responde, <strong>Omitir tutorial</strong>).</p>';
      nextBtn.style.display = 'none';
      break;
    case 'ic_indica':
      setBadge('énfasis · Indicaciones .docx');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;"><strong>Enfoque interconsulta:</strong> la hoja de <strong>Indicaciones</strong> en .docx es lo que suele imprimirse o entregarse al paciente / servicio.</p>' +
        '<ul style="margin:0;padding-left:1.15rem;line-height:1.5;">' +
        '<li><strong>Generar Indicaciones (.docx)</strong>: mismas reglas de carpeta que la nota.</li>' +
        '<li><strong>Plantillas por defecto</strong> (Mi Perfil) agilizan dieta, cuidados y medicamentos en cada paciente nuevo.</li>' +
        '<li><strong>Salida rápida</strong> desde esta pestaña respeta el mismo formato global del paciente activo.</li>' +
        '</ul>' +
        '<p style="margin:10px 0 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Generar Indicaciones (.docx)</strong> para continuar.</p>';
      nextBtn.style.display = 'none';
      break;
    case 'ic_exports':
      setBadge('exportación y carpeta');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;">Abre <strong>Ajustes</strong> (icono ⚙ arriba a la derecha). Ahí defines:</p>' +
        '<ul style="margin:0;padding-left:1.15rem;line-height:1.5;">' +
        '<li><strong>Carpeta de documentos</strong>: donde caen los .docx de <strong>Generar Nota</strong> y <strong>Generar Indicaciones</strong>.</li>' +
        '<li><strong>Salida rápida</strong>: formato docx, html o txt para el botón gris del expediente.</li>' +
        '<li><strong>Copias de seguridad</strong> JSON, exportar paciente o rango, auto-respaldo y <strong>Paquete sync</strong> entre equipos.</li>' +
        '<li>En <strong>Ajustes → Laboratorio</strong> puedes <strong>revisar duplicados en el historial de todos los pacientes</strong> (equivalente al checklist de <strong>Sincronizar</strong> del paciente activo en la pestaña Laboratorio).</li>' +
        '</ul>' +
        '<p style="margin:10px 0 0 0;font-size:13px;color:var(--text-muted);">En interconsulta conviene dejar la carpeta lista antes de atender.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_tend':
      setBadge('tendencias');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;">En <strong>Expediente → Tendencias</strong> ves mini-gráficas cuando hay varios laboratorios en el tiempo. Los puntos duplicados (misma fecha/hora y mismo valor) se muestran una sola vez.</p>' +
        '<p style="margin:0 0 8px 0;font-size:13px;color:var(--text-muted);">Si la gráfica se ve “sucia” por entradas repetidas en el historial, vuelve a <strong>Laboratorio</strong> y usa <strong>Sincronizar</strong> o <strong>Consolidar</strong> en la tarjeta de historial.</p>' +
        '<p style="margin:0;font-size:13px;color:var(--text-muted);">Este demo ya trae <strong>dos fechas</strong> de ejemplo; el envío que acabas de hacer suma otro punto en la serie. Así comparas creatinina, hemoglobina, leucocitos, etc.' +
        (guidedTourBranch === 'interconsulta'
          ? ' En interconsulta suele ser el contexto numérico antes de redactar y exportar la nota.'
          : '') +
        '</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_soap':
      setBadge('plantilla SOAP');
      bodyEl.innerHTML =
        '<p><strong>Dónde está el botón:</strong> en <strong>Expediente → Nota de evolución</strong>, mira la tarjeta verde titulada <strong>«Evolución y Actualización del Cuadro Clínico»</strong>. El botón <strong>Plantilla SOAP</strong> (icono de documento) está en la <strong>esquina derecha de esa misma franja verde</strong>, alineado con el título — no está abajo junto al cuadro de texto gris.</p>' +
        '<p class="tour-dock-hint">Mientras dure este paso, el botón lleva un <strong>resaltado animado</strong> para que lo ubiques al instante.</p>' +
        '<ul>' +
        '<li>Al abrirlo verás campos de <strong>S / O</strong>, <strong>FOUR / esferas</strong>, analgesia, FR/Sat/soporte, TA/FC, antiHTA, vasopresores, temperatura, antibióticos, dieta, balance y glucometrías.</li>' +
        '<li><strong>Insertar en evolución</strong> pega el texto en el área grande debajo del encabezado verde.</li>' +
        '<li>' +
        (guidedTourBranch === 'interconsulta'
          ? 'En interconsulta este párrafo suele preparar la parte objetiva antes de <strong>Generar Nota (.docx)</strong>.'
          : 'En sala suele bastar con SOAP + tendencias; Word es opcional.') +
        '</li>' +
        '</ul>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'sala_med':
      setBadge('medicamentos');
      bodyEl.innerHTML =
        '<p>En la pestaña <strong>Medicamentos</strong> pegas el bloque en formato TSV (tabuladores) del hospital y pulsas <strong>Receta</strong>.</p>' +
        '<p><strong>SOME y el bloque de indicaciones:</strong> si en <strong>SOME</strong> debes replicar el listado de medicamentos tal como en el expediente electrónico, allí copia <strong>desde la columna «Fecha y hora»</strong> (primera columna del cuadro de medicamentos) <strong>hasta el final de esa sección</strong> (última fila del bloque). Pega ese mismo rango en R+ y procesa con <strong>Receta</strong>.</p>' +
        '<ul>' +
        '<li><strong>Excl.</strong> quita el fármaco del texto de egreso; <strong>SOAP</strong> elige qué filas van a la plantilla SOAP o al tratamiento.</li>' +
        '<li>La vista previa agrupa por tipo (analgésicos, ABX, antiHTA, vasopresores, otros).</li>' +
        '<li><strong>Añadir a Tratamiento</strong> envía líneas al apartado de tratamiento de la nota.</li>' +
        '<li><strong>Abrir plantilla SOAP</strong> rellena analgesia / ABX / antiHTA / vasopresores según el nombre del medicamento.</li>' +
        '</ul>' +
        '<p class="tour-dock-hint">El demo trae dos fármacos ya marcados para SOAP.' +
        (guidedTourBranch === 'interconsulta' ? ' Después verás el bloque dedicado a exportar nota e indicaciones en Word.' : '') +
        '</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'profile':
      setBadge('perfil y respaldo');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;"><strong>Mi Perfil</strong> se abre tocando <strong>R+</strong> en el encabezado: médico tratante, profesor, grado, plantillas por defecto y edición de plantillas SOAP / nota.</p>' +
        '<p style="margin:0 0 8px 0;"><strong>Ajustes</strong>: carpeta de documentos, tema, respaldos, sync, ayuda y actualizaciones.</p>' +
        '<p style="margin:0;font-size:13px;color:var(--text-muted);">Todo queda en local en este equipo; revisa privacidad en la política de la app.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'servicio_default':
      setBadge('servicio default · Sala');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;">Antes de empezar, define tu <strong>Servicio default</strong> en <strong>Mi Perfil → Servicio (Sala)</strong>. Ese texto se pre-llenará automáticamente al agregar pacientes en Sala.</p>' +
        '<p style="margin:0 0 4px 0;font-size:13px;color:var(--text-muted);">Sugerencia sin abreviaturas: <strong>MEDICINA INTERNA</strong>. Pulsa <strong>Tab</strong> o sal del campo para guardar.</p>' +
        '<p style="margin:0;font-size:13px;color:var(--text-muted);">Cuando termines, pulsa <strong>Siguiente</strong> abajo.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'estado_actual':
      setBadge('Estado Actual');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;">En Sala, el botón verde <strong>Estado Actual</strong> (arriba del expediente) abre la plantilla SOAP <em>sin la sección Subjetivo</em>. Sirve para anotar rápido el estado del paciente y copiarlo al portapapeles.</p>' +
        '<ul style="margin:0;padding-left:1.15rem;line-height:1.5;">' +
        '<li><strong>Solo copiar</strong>: pasa el texto al portapapeles sin guardarlo en el expediente.</li>' +
        '<li><strong>Guardar y copiar</strong>: guarda el estado con timestamp en el paciente y lo copia.</li>' +
        '</ul>' +
        '<p style="margin:8px 0 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Estado Actual</strong> para verlo, o <strong>Siguiente</strong> para continuar.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'listado_problemas':
      setBadge('Listado de Problemas');
      bodyEl.innerHTML =
        '<p style="margin:0 0 8px 0;">Pestaña <strong>Listado</strong> (sólo en Sala) maneja problemas activos e inactivos del paciente. Cada problema acepta título en negritas y subitems con <code>a) b) c)</code>.</p>' +
        '<ul style="margin:0;padding-left:1.15rem;line-height:1.5;">' +
        '<li><strong>+ Problema</strong> agrega filas; arrastra para reordenar.</li>' +
        '<li><strong>Médicos (firma)</strong> usa los defaults de Mi Perfil y se puede sobrescribir por paciente.</li>' +
        '<li><strong>Generar Listado de Problemas (.docx)</strong> exporta el documento con membrete.</li>' +
        '</ul>' +
        '<p style="margin:8px 0 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para terminar.</p>';
      nextBtn.textContent = 'Siguiente';
      break;
    case 'wrap':
      setBadge('listo');
      if (guidedTourBranch === 'interconsulta') {
        bodyEl.innerHTML =
          '<p style="margin:0 0 8px 0;">Resumen <strong>interconsulta</strong>: recorrido completo (labs → historial con <strong>Sincronizar</strong>/<strong>Consolidar</strong> → tendencias → <strong>SOAP</strong> → medicamentos) y al final el <strong>énfasis</strong> en <strong>Generar Nota (.docx)</strong>, <strong>Generar Indicaciones (.docx)</strong>, carpeta de documentos y <strong>Salida rápida</strong>.</p>' +
          '<p style="margin:0;font-size:13px;color:var(--text-muted);">Repite el tutorial desde <strong>Mi Perfil → Ver tutorial</strong>. Tema claro/oscuro: Ajustes o icono junto a la fecha.</p>';
      } else {
        bodyEl.innerHTML =
          '<p style="margin:0 0 8px 0;">Resumen <strong>sala</strong>: servicio default → laboratorio → mantén historial con <strong>Sincronizar</strong>/<strong>Consolidar</strong> → <strong>Tendencias</strong> → <strong>Estado Actual</strong> / <strong>SOAP</strong> → <strong>Medicamentos</strong> → <strong>Listado de Problemas</strong>.</p>' +
          '<p style="margin:0;font-size:13px;color:var(--text-muted);">Puedes repetir el recorrido cuando quieras desde Mi Perfil → Ver tutorial.</p>';
      }
      nextBtn.textContent = 'Finalizar';
      break;
    default:
      hideTourDock();
  }
  // Si el paso requiere acción del usuario en un botón concreto,
  // ocultamos "Siguiente" para que el avance venga del propio botón.
  if (stepRequiresUserAction(tourStepId)
      && tourStepId !== 'servicio_default'
      && tourStepId !== 'estado_actual'
      && tourStepId !== 'listado_problemas') {
    nextBtn.style.display = 'none';
  }
  syncTourDockPlacement();
  syncTourSoapButtonHighlight();
}

function guidedTourClickNext() {
  if (miniTourActive) { miniTourNext(); return; }
  if (!guidedTourActive) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(tourStepId);
  if (i < 0) return;
  if (tourStepId === 'wrap') {
    completeGuidedTourWithCelebration();
    return;
  }
  clearAllTourSpotlights();
  tourStepId = steps[i + 1];
  applyTourTargetForStep(tourStepId);
  renderTourStep();
}

// Avance automático cuando el usuario ejecuta una acción real
// (Procesar, Enviar a nota, Generar Nota/Indicaciones, etc.).
function guidedTourAdvanceAfter(actionStep) {
  if (!guidedTourActive || tourStepId !== actionStep) return;
  var steps = getGuidedTourSteps();
  var i = steps.indexOf(actionStep);
  if (i < 0 || i + 1 >= steps.length) return;
  clearAllTourSpotlights();
  tourStepId = steps[i + 1];
  applyTourTargetForStep(tourStepId);
  renderTourStep();
}

function guidedTourAdvanceAfterNotaGenerated() { guidedTourAdvanceAfter('ic_nota'); }
function guidedTourAdvanceAfterIndicaGenerated() { guidedTourAdvanceAfter('ic_indica'); }

function completeGuidedTourWithCelebration() {
  clearTourSoapButtonHighlight();
  markGuidedTourVersionDone();
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  hideTourDock();
  launchConfetti();
  destroyDemoAndClose();
  showToast('Tutorial completado', 'success');
}

function skipGuidedTour() {
  if (miniTourActive) { endMiniTour(); return; }
  clearTourSoapButtonHighlight();
  markGuidedTourVersionDone();
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  hideTourDock();
  destroyDemoAndClose();
}

function startOnboarding(branch) {
  guidedTourBranch = branch === 'interconsulta' ? 'interconsulta' : 'sala';
  // Alinear el modo de la app con la rama del tutorial. Si el usuario
  // elige "Interconsulta" pero la app está en Sala, los pasos de
  // ic_nota / ic_indica apuntarían a una pestaña oculta. Cambiamos el
  // modo y refrescamos la UI; el usuario puede volver a Sala desde Mi
  // Perfil cuando termine.
  var prevMode = settings.appMode;
  settings.appMode = guidedTourBranch === 'interconsulta' ? 'interconsulta' : 'sala';
  if (settings.appMode !== prevMode) {
    try { localStorage.setItem('rpc-settings', JSON.stringify(settings)); } catch (e) {}
    var sala = isModeSala(settings);
    if (sala && (activeInner === 'notas' || activeInner === 'indica')) {
      switchInnerTab('tend');
    } else if (!sala && (activeInner === 'listado' || activeInner === 'datos')) {
      switchInnerTab('notas');
    }
    renderInnerTabs();
    if (typeof renderEstadoActualButton === 'function') renderEstadoActualButton();
    if (typeof renderEstadoActualBar === 'function') renderEstadoActualBar();
    var modeRadioSala = document.getElementById('app-mode-sala');
    var modeRadioInter = document.getElementById('app-mode-inter');
    if (modeRadioSala)  modeRadioSala.checked  = sala;
    if (modeRadioInter) modeRadioInter.checked = !sala;
  }
  var today = new Date();
  var fecha = String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
  var hora  = String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  var demoPatient = {
    id: DEMO_PATIENT_ID, nombre: 'DEMO PÉREZ', registro: '0000001',
    edad: '67 años', sexo: 'M', area: 'MEDICINA INTERNA',
    servicio: 'MEDICINA INTERNA', cuarto: '101', cama: '1',
    fromLab: false, isDemo: true
  };
  notes[DEMO_PATIENT_ID] = {
    fecha:fecha, hora:hora, interrogatorio:'', evolucion:'', estudios:'',
    diagnosticos:['DM2, IRC estadio 3, HAS'], tratamiento:[''],
    ta:'', fr:'', fc:'', temp:'', peso:'', medico:'', profesor:''
  };
  indicaciones[DEMO_PATIENT_ID] = {
    fecha:fecha, hora:hora, medicos:'', dieta:'', cuidados:'',
    estudios:'', medicamentos:'', interconsultas:'', otros:[]
  };
  seedDemoTrendHistory();
  delete medRecetaByPatient[DEMO_PATIENT_ID];
  if (medNotaSelectionByPatient[DEMO_PATIENT_ID]) delete medNotaSelectionByPatient[DEMO_PATIENT_ID];
  medRecetaByPatient[DEMO_PATIENT_ID] = {
    fechaActualizacion: fecha,
    items: [
      {
        id: 'tour-med-1',
        nombreRaw: 'PARACETAMOL 1 G SOL INY (*)',
        viaRaw: 'VIA INTRAVENOSA',
        dosisRaw: '1 G //',
        frecuenciaRaw: 'CADA 8 HORAS',
        suspendido: false,
        diaTratamiento: null,
      },
      {
        id: 'tour-med-2',
        nombreRaw: 'CEFTRIAXONA 1 G SOL INY (*)',
        viaRaw: 'VIA INTRAVENOSA',
        dosisRaw: '1 G // *DIA# 2*',
        frecuenciaRaw: 'CADA 24 HORAS',
        suspendido: false,
        diaTratamiento: 2,
      },
    ],
  };
  medNotaSelectionByPatient[DEMO_PATIENT_ID] = { 'tour-med-1': true, 'tour-med-2': true };
  patients = patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID; });
  patients.unshift(demoPatient);
  guidedTourActive = true;
  tourStepId = 'map';
  renderPatientList();
  selectPatient(DEMO_PATIENT_ID);
  applyTourNavigationForStep('map');
  showTourDock();
  renderTourStep();
}

function onboardingAdvanceAfterParse() {
  if (!guidedTourActive || tourStepId !== 'lab_parse') return;
  clearAllTourSpotlights();
  tourStepId = 'lab_view';
  applyTourTargetForStep(tourStepId);
  renderTourStep();
}

function onboardingAdvanceAfterSend() {
  if (!guidedTourActive) return;
  if (tourStepId === 'lab_view' || tourStepId === 'lab_send') {
    clearAllTourSpotlights();
    tourStepId = 'sala_tend';
    applyTourTargetForStep(tourStepId);
    renderTourStep();
  }
}

function destroyDemoAndClose() {
  clearTourSoapButtonHighlight();
  patients = patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID; });
  delete notes[DEMO_PATIENT_ID];
  delete indicaciones[DEMO_PATIENT_ID];
  delete labHistory[DEMO_PATIENT_ID];
  delete medRecetaByPatient[DEMO_PATIENT_ID];
  if (medNotaSelectionByPatient[DEMO_PATIENT_ID]) delete medNotaSelectionByPatient[DEMO_PATIENT_ID];
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  hideTourDock();
  if (activeId === DEMO_PATIENT_ID) {
    activeId = patients.length ? patients[0].id : null;
  }
  limpiarReporte();
  renderPatientList();
  if (activeId) selectPatient(activeId);
  else { document.getElementById('patient-view').style.display = 'none'; document.getElementById('empty-state').style.display = 'flex'; }
}

function resetAndStartOnboarding() {
  // El botón vive dentro del modal Mi Perfil; ciérralo antes de mostrar
  // el tour para que no se quede flotando encima.
  closeProfileModal();
  if (typeof closeSettingsDropdown === 'function') closeSettingsDropdown();
  localStorage.removeItem(GUIDED_TOUR_LS_KEY);
  patients = patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID; });
  delete notes[DEMO_PATIENT_ID];
  delete indicaciones[DEMO_PATIENT_ID];
  delete labHistory[DEMO_PATIENT_ID];
  delete medRecetaByPatient[DEMO_PATIENT_ID];
  if (medNotaSelectionByPatient[DEMO_PATIENT_ID]) delete medNotaSelectionByPatient[DEMO_PATIENT_ID];
  guidedTourActive = false;
  tourStepId = null;
  guidedTourBranch = null;
  hideTourDock();
  hideTourIntroModal();
  limpiarReporte();
  if (activeId === DEMO_PATIENT_ID) {
    activeId = patients.length ? patients[0].id : null;
  }
  renderPatientList();
  if (activeId) selectPatient(activeId);
  else {
    document.getElementById('patient-view').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
  }
  showTourIntroModal();
}

function setRpcOfflineVisible(show) {
  var b = document.getElementById('rpc-offline-banner');
  if (!b) return;
  b.classList.toggle('visible', !!show);
}

// ── Cola de tareas en curso (pendingJobs) ─────────────────────────
var pendingJobs = 0;
function renderPendingJobsPill() {
  try {
    var pill = document.getElementById('pending-jobs-pill');
    if (!pill) return;
    if (pendingJobs > 0) {
      pill.textContent = 'Procesando (' + pendingJobs + ')';
      pill.classList.add('visible');
    } else {
      pill.textContent = '';
      pill.classList.remove('visible');
    }
  } catch (e) {
    console.error('renderPendingJobsPill error:', e && e.message);
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

// ── Modo offline explícito ────────────────────────────────────────
var rpcOffline = false;
function syncOfflineButtonStates() {
  try {
    ['btn-gen', 'btn-gen-ind'].forEach(function(id) {
      var b = document.getElementById(id);
      if (!b) return;
      if (rpcOffline) {
        b.disabled = true;
        b.setAttribute('aria-disabled', 'true');
        b.dataset.rpcOffline = '1';
      } else if (b.dataset.rpcOffline) {
        b.disabled = false;
        b.removeAttribute('aria-disabled');
        delete b.dataset.rpcOffline;
      }
    });
  } catch (e) {
    console.error('syncOfflineButtonStates error:', e && e.message);
  }
}
function setRpcOffline(offline) {
  var prev = rpcOffline;
  rpcOffline = !!offline;
  setRpcOfflineVisible(rpcOffline);
  syncOfflineButtonStates();
  if (!prev && rpcOffline) {
    try { showToast('Sin conexión con el servidor local. Generación de documentos desactivada.', 'error'); } catch (_e) {}
  } else if (prev && !rpcOffline) {
    try { showToast('Servidor local reconectado.', 'success'); } catch (_e) {}
  }
}
function isRpcOffline() { return rpcOffline; }

function checkRpcServerHealth() {
  try {
    fetch('/health', { method: 'GET', cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) throw new Error('bad status');
        return r.json();
      })
      .then(function(j) {
        try {
          if (!j || !j.ok) throw new Error('bad payload');
          setRpcOffline(false);
        } catch (e) {
          setRpcOffline(true);
          console.error('health payload error:', e && e.message);
        }
      })
      .catch(function() {
        try { setRpcOffline(true); } catch (e) { console.error('setRpcOffline error:', e && e.message); }
      });
  } catch (e) {
    console.error('checkRpcServerHealth crashed:', e && e.message);
    try { setRpcOffline(true); } catch (_e) {}
  }
}

function initRpcServerHealthWatch() {
  checkRpcServerHealth();
  setInterval(checkRpcServerHealth, 15000);
}

// ── Bloqueo por inactividad (Idle lock) ───────────────────────────
function getIdleLockMinutes() {
  var raw = parseInt(localStorage.getItem(IDLE_LOCK_LS_KEY) || '0', 10);
  if (!Number.isFinite(raw)) raw = 0;
  return IDLE_LOCK_VALID_MINUTES.indexOf(raw) !== -1 ? raw : 0;
}

function setIdleLockMinutesStored(mins) {
  var n = IDLE_LOCK_VALID_MINUTES.indexOf(mins) !== -1 ? mins : 0;
  if (n === 0) localStorage.removeItem(IDLE_LOCK_LS_KEY);
  else localStorage.setItem(IDLE_LOCK_LS_KEY, String(n));
}

function getIdleLockPinHash() {
  return localStorage.getItem(IDLE_LOCK_HASH_LS_KEY) || '';
}

function setIdleLockPinHash(hashHex) {
  if (hashHex) localStorage.setItem(IDLE_LOCK_HASH_LS_KEY, hashHex);
  else localStorage.removeItem(IDLE_LOCK_HASH_LS_KEY);
}

function isIdleLockPinFormatValid(pin) {
  return /^\d{4,8}$/.test(String(pin == null ? '' : pin));
}

async function computeSha256Hex(text) {
  if (!window.crypto || !window.crypto.subtle) throw new Error('WebCrypto no disponible');
  var enc = new TextEncoder();
  var buf = await crypto.subtle.digest('SHA-256', enc.encode(String(text)));
  var bytes = new Uint8Array(buf);
  var hex = '';
  for (var i = 0; i < bytes.length; i += 1) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

async function promptForIdleLockPinSetup(reason) {
  var label = reason === 'change'
    ? 'Ingresa un nuevo PIN de 4 a 8 dígitos para el bloqueo:'
    : 'Elige un PIN de 4 a 8 dígitos para el bloqueo por inactividad:';
  var p1 = prompt(label, '');
  if (p1 == null) return { ok: false, cancelled: true };
  if (!isIdleLockPinFormatValid(p1)) {
    showToast('PIN inválido (solo 4-8 dígitos).', 'error');
    return { ok: false, cancelled: false };
  }
  var p2 = prompt('Confirma el PIN:', '');
  if (p2 == null) return { ok: false, cancelled: true };
  if (p1 !== p2) {
    showToast('Los PIN no coinciden.', 'error');
    return { ok: false, cancelled: false };
  }
  try {
    var hash = await computeSha256Hex(p1);
    setIdleLockPinHash(hash);
    addAuditEntry('idle-lock-pin-set', 'ok', 0, reason === 'change' ? 'changed' : 'created');
    return { ok: true, cancelled: false };
  } catch (_err) {
    showToast('WebCrypto no disponible en este entorno.', 'error');
    addAuditEntry('idle-lock-pin-set', 'error', 0, 'no-webcrypto');
    return { ok: false, cancelled: false };
  }
}

function syncIdleLockSelectUi() {
  var sel = document.getElementById('settings-idle-lock');
  if (sel) sel.value = String(getIdleLockMinutes());
}

async function onIdleLockSelectChange(value) {
  var parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) parsed = 0;
  if (IDLE_LOCK_VALID_MINUTES.indexOf(parsed) === -1) parsed = 0;
  if (parsed === 0) {
    setIdleLockMinutesStored(0);
    addAuditEntry('idle-lock-disable', 'ok', 0, '');
    restartIdleLockTimer();
    syncIdleLockSelectUi();
    showToast('Bloqueo por inactividad desactivado.', 'success');
    return;
  }
  if (!getIdleLockPinHash()) {
    var setup = await promptForIdleLockPinSetup('create');
    if (!setup.ok) {
      syncIdleLockSelectUi();
      return;
    }
  }
  setIdleLockMinutesStored(parsed);
  addAuditEntry('idle-lock-enable', 'ok', parsed, '');
  restartIdleLockTimer();
  syncIdleLockSelectUi();
  showToast('Bloqueo activo: ' + parsed + ' min.', 'success');
}

async function changeIdleLockPin() {
  var existing = getIdleLockPinHash();
  if (existing) {
    var current = prompt('Ingresa el PIN actual para continuar:', '');
    if (current == null) return;
    if (!isIdleLockPinFormatValid(current)) {
      showToast('PIN con formato inválido.', 'error');
      addAuditEntry('idle-lock-pin-change', 'error', 0, 'invalid-format');
      return;
    }
    try {
      var hash = await computeSha256Hex(current);
      if (hash !== existing) {
        showToast('PIN incorrecto.', 'error');
        addAuditEntry('idle-lock-pin-change', 'error', 0, 'wrong-pin');
        return;
      }
    } catch (_err) {
      showToast('WebCrypto no disponible.', 'error');
      addAuditEntry('idle-lock-pin-change', 'error', 0, 'no-webcrypto');
      return;
    }
  }
  var setup = await promptForIdleLockPinSetup('change');
  if (setup.ok) {
    showToast('PIN actualizado ✓', 'success');
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
  idleLockTimerId = setTimeout(triggerIdleLock, idleLockEnabledMinutes * 60 * 1000);
}

function onIdleActivity() {
  if (idleLockEnabledMinutes <= 0 || idleLockIsActive) return;
  if (idleLockDebounceId) return;
  idleLockDebounceId = setTimeout(function() {
    idleLockDebounceId = null;
    if (idleLockTimerId) clearTimeout(idleLockTimerId);
    idleLockTimerId = setTimeout(triggerIdleLock, idleLockEnabledMinutes * 60 * 1000);
  }, IDLE_LOCK_DEBOUNCE_MS);
}

function triggerIdleLock() {
  if (idleLockIsActive) return;
  if (!getIdleLockPinHash()) return;
  idleLockIsActive = true;
  if (idleLockTimerId) { clearTimeout(idleLockTimerId); idleLockTimerId = null; }
  if (idleLockDebounceId) { clearTimeout(idleLockDebounceId); idleLockDebounceId = null; }
  showIdleLockOverlay();
  addAuditEntry('idle-lock-lock', 'ok', idleLockEnabledMinutes, 'inactivity');
}

function showIdleLockOverlay() {
  var overlay = document.getElementById('rpc-idle-lock-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  var err = document.getElementById('rpc-idle-lock-error');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
  var input = document.getElementById('rpc-idle-lock-pin');
  if (input) { input.value = ''; setTimeout(function() { try { input.focus(); } catch (_e) {} }, 60); }
}

function hideIdleLockOverlay() {
  var overlay = document.getElementById('rpc-idle-lock-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

async function submitIdleLockPin() {
  var input = document.getElementById('rpc-idle-lock-pin');
  var err = document.getElementById('rpc-idle-lock-error');
  var pin = input ? input.value : '';
  if (!isIdleLockPinFormatValid(pin)) {
    if (err) { err.style.display = 'block'; err.textContent = 'Formato inválido (4-8 dígitos).'; }
    addAuditEntry('idle-lock-unlock', 'error', 0, 'invalid-format');
    if (input) { input.value = ''; input.focus(); }
    return;
  }
  var expected = getIdleLockPinHash();
  if (!expected) {
    idleLockIsActive = false;
    hideIdleLockOverlay();
    addAuditEntry('idle-lock-unlock', 'ok', 0, 'no-hash-bypass');
    restartIdleLockTimer();
    return;
  }
  try {
    var h = await computeSha256Hex(pin);
    if (h === expected) {
      idleLockIsActive = false;
      hideIdleLockOverlay();
      addAuditEntry('idle-lock-unlock', 'ok', 0, '');
      restartIdleLockTimer();
    } else {
      if (err) { err.style.display = 'block'; err.textContent = 'PIN incorrecto.'; }
      addAuditEntry('idle-lock-unlock', 'error', 0, 'bad-pin');
      if (input) { input.value = ''; input.focus(); }
    }
  } catch (_err) {
    if (err) { err.style.display = 'block'; err.textContent = 'WebCrypto no disponible.'; }
    addAuditEntry('idle-lock-unlock', 'error', 0, 'no-webcrypto');
  }
}

function initIdleLockFeature() {
  idleLockEnabledMinutes = getIdleLockMinutes();
  syncIdleLockSelectUi();
  if (idleLockEnabledMinutes > 0 && !getIdleLockPinHash()) {
    // Recover from an inconsistent state: timer configured but PIN missing.
    setIdleLockMinutesStored(0);
    idleLockEnabledMinutes = 0;
    syncIdleLockSelectUi();
    addAuditEntry('idle-lock-reset', 'ok', 0, 'missing-hash');
  }
  var onActivity = function() { onIdleActivity(); };
  window.addEventListener('mousemove', onActivity, { passive: true });
  window.addEventListener('keydown', function(e) {
    if (idleLockIsActive) {
      if (e.key === 'Enter') {
        var overlay = document.getElementById('rpc-idle-lock-overlay');
        if (overlay && overlay.style.display !== 'none') {
          e.preventDefault();
          submitIdleLockPin();
        }
      }
      return;
    }
    onActivity();
  }, true);
  window.addEventListener('click', onActivity, { passive: true });
  restartIdleLockTimer();
}

// ── Borrado de datos (privacidad) ─────────────────────────────────
function openWipeDataModal() {
  closeSettingsDropdown();
  var m = document.getElementById('rpc-wipe-modal');
  if (!m) return;
  m.style.display = 'flex';
  m.setAttribute('aria-hidden', 'false');
}

function closeWipeDataModal() {
  var m = document.getElementById('rpc-wipe-modal');
  if (!m) return;
  m.style.display = 'none';
  m.setAttribute('aria-hidden', 'true');
}

function collectCacheWipeKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i += 1) {
    var k = localStorage.key(i);
    if (!k) continue;
    if (k.indexOf('rpc-preimport-') === 0) keys.push(k);
    else if (k === AUDIT_LOG_KEY) keys.push(k);
    else if (k.indexOf('rpc-auto-backup-') === 0) keys.push(k);
    else if (k === IDLE_LOCK_LS_KEY) keys.push(k);
  }
  return keys;
}

function collectFullWipeKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i += 1) {
    var k = localStorage.key(i);
    if (!k) continue;
    if (k.indexOf('rpc-') === 0 || k === 'theme' || k === 'rplus-last-seen-app-version') {
      keys.push(k);
    }
  }
  return keys;
}

function wipeCacheConfirmed() {
  var confirmMsg = 'Se eliminarán caché y temporales: respaldo pre-importación, bitácora, auto-respaldos y el recordatorio de tiempo de bloqueo. No se puede deshacer. ¿Continuar?';
  if (!confirm(confirmMsg)) {
    addAuditEntry('data-wipe-cache', 'cancelled', 0, 'user-cancelled');
    return;
  }
  var keys = collectCacheWipeKeys();
  addAuditEntry('data-wipe-cache', 'ok', keys.length, 'pre-wipe');
  keys.forEach(function(k) {
    try { localStorage.removeItem(k); } catch (_e) {}
  });
  idleLockEnabledMinutes = 0;
  if (idleLockTimerId) { clearTimeout(idleLockTimerId); idleLockTimerId = null; }
  if (idleLockDebounceId) { clearTimeout(idleLockDebounceId); idleLockDebounceId = null; }
  addAuditEntry('data-wipe-cache', 'ok', keys.length, 'completed');
  closeWipeDataModal();
  syncIdleLockSelectUi();
  showToast('Se eliminaron ' + keys.length + ' elementos temporales.', 'success');
}

function wipeAllConfirmed() {
  var firstOk = confirm('Esto BORRARÁ todos los pacientes, notas, indicaciones, historial de labs, ajustes y PIN de bloqueo de esta computadora. No se puede deshacer. ¿Continuar?');
  if (!firstOk) {
    addAuditEntry('data-wipe-full', 'cancelled', 0, 'first-cancel');
    return;
  }
  var typed = prompt('Escribe BORRAR en mayúsculas para confirmar el borrado completo:', '');
  if (String(typed == null ? '' : typed).trim().toUpperCase() !== 'BORRAR') {
    addAuditEntry('data-wipe-full', 'cancelled', 0, 'confirmation-failed');
    showToast('Borrado cancelado.', 'error');
    return;
  }
  var keys = collectFullWipeKeys();
  addAuditEntry('data-wipe-full', 'ok', keys.length, 'pre-wipe');
  keys.forEach(function(k) {
    try { localStorage.removeItem(k); } catch (_e) {}
  });
  closeWipeDataModal();
  if (window.electronAPI && typeof window.electronAPI.relaunchApp === 'function') {
    try { window.electronAPI.relaunchApp(); return; } catch (_e) {}
  }
  location.reload();
}

function openUserDataFolderFromSettings() {
  if (!window.electronAPI || !window.electronAPI.openUserDataFolder) {
    showToast('Solo disponible en la aplicación de escritorio.', 'error');
    return;
  }
  window.electronAPI.openUserDataFolder().then(function(res) {
    if (res && res.ok) showToast('Carpeta abierta', 'success');
    else showToast((res && res.error) || 'No se pudo abrir la carpeta', 'error');
  }).catch(function() {
    showToast('No se pudo abrir la carpeta', 'error');
  });
}

// ── Bloque L · Centro de ayuda embebido ────────────────────────────
var HELP_ARTICLES = [
  {
    id: 'primer-paciente',
    title: 'Tu primer paciente',
    keywords: 'agregar paciente nuevo registro edad sexo cuarto cama duplicado',
    html:
      '<p>Agrega un paciente desde la barra lateral con <strong>+ Agregar</strong> o directamente desde un reporte de laboratorio procesado (<strong>Agregar paciente del lab</strong>).</p>' +
      '<ul>' +
      '<li>Puedes capturar nombre, registro, edad, sexo, área / servicio, cuarto y cama.</li>' +
      '<li>R+ avisa si detecta un paciente con el mismo nombre o registro para evitar duplicados.</li>' +
      '<li>El paciente queda guardado solo en esta computadora; no se sube a la nube.</li>' +
      '</ul>'
  },
  {
    id: 'laboratorio',
    title: 'Laboratorio: procesar y enviar',
    keywords: 'lab laboratorio procesar reporte diagrama gamble bh quimica enviar nota copiar',
    html:
      '<p>Pega el reporte del laboratorio en el cuadro de texto de la pestaña <strong>Laboratorio</strong> y pulsa <strong>Procesar</strong>. R+ reconoce biometría, química, electrolitos, gasometría, pruebas hepáticas y más.</p>' +
      '<ul>' +
      '<li>Cada diagrama tiene un botón <strong>Copiar</strong> para pegarlo como texto en otro sistema.</li>' +
      '<li>Los valores fuera de rango se resaltan en rojo.</li>' +
      '<li><strong>Enviar a nota</strong> vuelca el bloque al expediente del paciente activo y alimenta <strong>Tendencias</strong>.</li>' +
      '<li>En <strong>Historial de labs</strong> ves cada envío guardado; puedes <strong>Ver en Laboratorio</strong> para recuperar diagramas o <strong>Eliminar</strong> un conjunto si fue un error.</li>' +
      '</ul>'
  },
  {
    id: 'nota-evolucion',
    title: 'Nota de evolución',
    keywords: 'nota evolucion docx generar expediente soap vitales diagnosticos plantilla',
    html:
      '<p>En <strong>Expediente → Notas</strong> completa fecha, hora, signos vitales, interrogatorio, evolución, estudios, diagnósticos y tratamiento.</p>' +
      '<ul>' +
      '<li>La <strong>plantilla SOAP</strong> (modal) concentra subjetivo/objetivo breve, GCS, analgesia, antibióticos, antiHTA, vasopresores, temperatura, dieta, balance hídrico y glucometrías. <strong>Insertar en evolución</strong> pega el párrafo en el cuadro de texto.</li>' +
      '<li>Desde <strong>Medicamentos</strong> puedes marcar fármacos para SOAP y abrir el modal ya relleno en analgesia / ABX / antiHTA / vasopresores.</li>' +
      '<li><strong>Generar Nota (.docx)</strong> crea el documento con membrete; la carpeta de salida está en <strong>Ajustes</strong>.</li>' +
      '<li><strong>Salida rápida</strong> exporta el paciente activo en docx, html o txt según el formato elegido.</li>' +
      '<li>Los datos se guardan por paciente en este equipo.</li>' +
      '</ul>'
  },
  {
    id: 'indicaciones',
    title: 'Indicaciones médicas',
    keywords: 'indicaciones dieta cuidados medicamentos estudios interconsultas otros docx',
    html:
      '<p>En <strong>Expediente → Indicaciones</strong> arma la hoja por secciones (dieta, cuidados, medicamentos, estudios, interconsultas y otros).</p>' +
      '<ul>' +
      '<li>Define <strong>plantillas por defecto</strong> en Mi Perfil para prellenar dieta, cuidados y medicamentos.</li>' +
      '<li><strong>Generar Indicaciones (.docx)</strong> produce la hoja final con el membrete del hospital.</li>' +
      '<li>La <strong>Salida rápida</strong> (Ajustes) exporta el paciente activo en docx, html o txt de un solo clic.</li>' +
      '</ul>'
  },
  {
    id: 'medicamentos-receta',
    title: 'Medicamentos (receta hospitalaria)',
    keywords: 'medicamentos receta tsv hospital soap tratamiento analgesia abx antihta vasopresores copiar',
    html:
      '<p>En la pestaña <strong>Medicamentos</strong> pegas el listado copiado del sistema hospitalario (columnas separadas por tabulador) y pulsas <strong>Receta</strong>.</p>' +
      '<p>En <strong>SOME</strong>, para reutilizar el mismo bloque, copia normalmente <strong>desde la columna Fecha y hora</strong> hasta el <strong>final de la sección</strong> de medicamentos y pégalo en R+.</p>' +
      '<ul>' +
      '<li><strong>Excl.</strong> excluye el fármaco del texto de egreso; <strong>SOAP</strong> marca qué filas se volcarán a la plantilla SOAP o al tratamiento.</li>' +
      '<li>La vista previa inferior agrupa por categoría (analgésicos, antiHTA, antibióticos, vasopresores, otros).</li>' +
      '<li><strong>Añadir a Tratamiento</strong> inserta líneas en la nota; <strong>Abrir plantilla SOAP</strong> rellena los campos del modal según esa clasificación.</li>' +
      '<li><strong>Copiar</strong> en la tarjeta inferior genera texto tipo nota de egreso.</li>' +
      '</ul>'
  },
  {
    id: 'respaldo',
    title: 'Respaldo y portabilidad',
    keywords: 'respaldo backup copia seguridad exportar importar paciente rango sync pasarela equipos auditoria',
    html:
      '<p>R+ ofrece varias vías para mover o resguardar datos desde <strong>Ajustes</strong>:</p>' +
      '<ul>' +
      '<li><strong>Copia de seguridad</strong>: JSON completo de pacientes, notas, indicaciones y labs.</li>' +
      '<li><strong>Exportar paciente actual</strong> o por <strong>rango de fechas</strong> para mover casos específicos.</li>' +
      '<li><strong>Copia automática</strong> guarda hasta 14 snapshots locales rotativos.</li>' +
      '<li><strong>Paquete sync</strong> cifrado con passphrase para combinar datos entre equipos sin pisar los del otro lado.</li>' +
      '<li><strong>Registro de auditoría</strong>: descarga un JSON con exportaciones e importaciones relevantes.</li>' +
      '</ul>'
  },
  {
    id: 'actualizacion',
    title: 'Actualizar R+',
    keywords: 'actualizacion actualizar update instalar reiniciar rollback version',
    html:
      '<p>R+ busca nuevas versiones al iniciar. Cuando hay una disponible, la app muestra un modal con el progreso de descarga.</p>' +
      '<ul>' +
      '<li>Puedes buscar manualmente desde <strong>Ajustes → Buscar actualizaciones…</strong> o el menú nativo (Mac: R+; Windows: Aplicación).</li>' +
      '<li>Al detectar una versión nueva instalada, R+ muestra una ventana de <strong>Novedades</strong> con los cambios relevantes.</li>' +
      '<li>Para volver a una versión anterior, descarga el instalador correspondiente desde la página de Releases.</li>' +
      '</ul>'
  },
  {
    id: 'atajos',
    title: 'Atajos de teclado',
    keywords: 'atajos shortcuts teclado ctrl cmd escape tab',
    html:
      '<p>Ahorra tiempo con estos atajos:</p>' +
      '<ul>' +
      '<li><strong>Ctrl/⌘ + 1</strong> — Laboratorio</li>' +
      '<li><strong>Ctrl/⌘ + 2</strong> — Expediente</li>' +
      '<li><strong>Ctrl/⌘ + 3</strong> — Abrir Mi Perfil (barra lateral)</li>' +
      '<li><strong>Ctrl/⌘ + 4</strong> — Abrir Ajustes</li>' +
      '<li><strong>Esc</strong> — Cerrar modal o el centro de ayuda</li>' +
      '<li>Dentro del centro de ayuda: <strong>↓</strong> desde el buscador enfoca la lista; <strong>↑ / ↓</strong> navegan artículos.</li>' +
      '</ul>'
  },
  {
    id: 'privacidad',
    title: 'Privacidad de datos',
    keywords: 'privacidad datos locales electron userdata carpeta no subir nube sensibles',
    html:
      '<p>R+ guarda toda la información en el <strong>almacenamiento local</strong> de Electron en esta computadora. No envía pacientes ni notas a ningún servidor externo.</p>' +
      '<ul>' +
      '<li>En Ajustes, <strong>Abrir carpeta…</strong> muestra la ruta exacta del perfil de la app.</li>' +
      '<li>No compartas esa carpeta ni los archivos JSON exportados si contienen información sensible sin cifrado.</li>' +
      '<li>Los paquetes <strong>sync</strong> y las exportaciones pueden cifrarse con una passphrase para intercambio seguro entre equipos.</li>' +
      '</ul>'
  }
];

var helpCurrentArticleId = null;

function openQuickHelp() {
  var el = document.getElementById('help-quick-backdrop');
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  closeSettingsDropdown();
  var input = document.getElementById('help-search-input');
  if (input) input.value = '';
  renderHelpArticles('');
  if (!helpCurrentArticleId || !HELP_ARTICLES.some(function(a){ return a.id === helpCurrentArticleId; })) {
    selectHelpArticle(HELP_ARTICLES[0].id);
  } else {
    selectHelpArticle(helpCurrentArticleId);
  }
  setTimeout(function(){ if (input) input.focus(); }, 40);
}

function closeQuickHelp() {
  var el = document.getElementById('help-quick-backdrop');
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

function onHelpSearchInput(value) {
  renderHelpArticles(value);
}

function onHelpSearchKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    var list = document.getElementById('help-articles-list');
    var first = list && list.querySelector('.help-article-item');
    if (first) first.focus();
  } else if (e.key === 'Enter') {
    var list2 = document.getElementById('help-articles-list');
    var first2 = list2 && list2.querySelector('.help-article-item');
    if (first2) {
      e.preventDefault();
      selectHelpArticle(first2.getAttribute('data-article-id'));
      first2.focus();
    }
  }
}

function onHelpListKeydown(e) {
  var target = e.target;
  if (!target || !target.classList || !target.classList.contains('help-article-item')) return;
  var items = Array.prototype.slice.call(document.querySelectorAll('#help-articles-list .help-article-item'));
  var idx = items.indexOf(target);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    var next = items[Math.min(items.length - 1, idx + 1)];
    if (next) { next.focus(); selectHelpArticle(next.getAttribute('data-article-id')); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (idx <= 0) {
      var input = document.getElementById('help-search-input');
      if (input) input.focus();
    } else {
      items[idx - 1].focus();
      selectHelpArticle(items[idx - 1].getAttribute('data-article-id'));
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectHelpArticle(target.getAttribute('data-article-id'));
  } else if (e.key === 'Home') {
    e.preventDefault();
    if (items[0]) { items[0].focus(); selectHelpArticle(items[0].getAttribute('data-article-id')); }
  } else if (e.key === 'End') {
    e.preventDefault();
    var last = items[items.length - 1];
    if (last) { last.focus(); selectHelpArticle(last.getAttribute('data-article-id')); }
  }
}

function renderHelpArticles(query) {
  var list = document.getElementById('help-articles-list');
  if (!list) return;
  var q = String(query || '').toLowerCase().trim();
  var filtered = HELP_ARTICLES.filter(function(a) {
    if (!q) return true;
    var haystack = (a.title + ' ' + a.keywords + ' ' + a.html.replace(/<[^>]+>/g, ' ')).toLowerCase();
    return haystack.indexOf(q) !== -1;
  });
  list.innerHTML = '';
  if (filtered.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'help-empty';
    empty.textContent = 'Sin resultados para “' + q + '”.';
    list.appendChild(empty);
    return;
  }
  filtered.forEach(function(a) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'help-article-item';
    btn.setAttribute('data-article-id', a.id);
    btn.setAttribute('role', 'option');
    btn.tabIndex = 0;
    btn.textContent = a.title;
    btn.addEventListener('click', function() { selectHelpArticle(a.id); btn.focus(); });
    if (a.id === helpCurrentArticleId) btn.classList.add('active');
    list.appendChild(btn);
  });
  if (helpCurrentArticleId && !filtered.some(function(a){ return a.id === helpCurrentArticleId; })) {
    selectHelpArticle(filtered[0].id);
  }
}

function selectHelpArticle(id) {
  var article = HELP_ARTICLES.find(function(a){ return a.id === id; });
  if (!article) return;
  helpCurrentArticleId = id;
  var contentEl = document.getElementById('help-article-content');
  if (contentEl) {
    contentEl.innerHTML = '<h4>' + esc(article.title) + '</h4>' + article.html;
  }
  var list = document.getElementById('help-articles-list');
  if (list) {
    Array.prototype.forEach.call(list.querySelectorAll('.help-article-item'), function(btn) {
      if (btn.getAttribute('data-article-id') === id) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }
}

// ── Bloque L · Novedades in-app (release notes) ────────────────────
var RELEASE_NOTES_SEEN_PREFIX = 'rpc-release-notes-seen-';
var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = [
  {
    title: 'Copia automática programada',
    body: 'R+ puede generar snapshots locales (hasta 14 rotativos) y restaurarlos desde Ajustes → Copias de seguridad.'
  },
  {
    title: 'Exportar por paciente o por rango de fechas',
    body: 'Respalda solo al paciente activo, o selecciona un rango de fechas (ingreso / última nota) para mover casos acotados entre equipos.'
  },
  {
    title: 'Paquete sync cifrado con passphrase',
    body: 'Intercambia datos entre equipos sin pisar los del otro lado: el paquete combina cambios y se cifra con una frase que tú eliges.'
  },
  {
    title: 'Registro de auditoría ligero',
    body: 'Exporta un JSON con exportaciones, importaciones y borrados recientes desde Ajustes, útil para rastrear movimientos.'
  },
  {
    title: 'Salida rápida en varios formatos',
    body: 'Elige docx, html o txt como formato de la Salida rápida para exportar el contenido clínico del paciente activo de un solo clic.'
  }
];

var RELEASE_NOTES_HIGHLIGHTS = {
  '3.0.2': [
    {
      title: 'Gasometría e historial',
      body:
        'Delta-delta e interpretación clínica cuando hay datos. Reprocesar desde el historial usando el texto guardado y deduplicación al consolidar entradas muy similares.',
    },
    {
      title: 'Laboratorio al cambiar de paciente',
      body:
        'Se limpian los resultados del paciente anterior, el historial se expande y la vista hace scroll a la tarjeta del paciente seleccionado.',
    },
    {
      title: 'Listado de Problemas (.docx)',
      body:
        'Cada problema va en su propia tabla para evitar cortes entre páginas; el texto largo en a) b) c) se parte en párrafos más cortos con cortes en frases.',
    },
    {
      title: 'Tutorial y Mac',
      body:
        'El panel del tour queda por encima del contenido resaltado en el paso del listado. En Apple Silicon, si no hay Python embebido, se prioriza Homebrew en /opt/homebrew.',
    },
  ],
  '3.0.1': [
    {
      title: 'Procalcitonina (PCT)',
      body:
        'El bloque de Estudios Especiales se procesa: la procalcitonina aparece en QS junto a PCR y se marca cuando excede el límite de adulto (por defecto 0.05 ng/mL). Disponible también como serie en Tendencias.',
    },
    {
      title: 'Listado de Problemas en 8 pt',
      body:
        'El texto dinámico del .docx (fecha, número, descripción) ahora sale en 8 pt para que entren más problemas por hoja sin romper el template.',
    },
  ],
  '3.0.0': [
    {
      title: 'Modos Sala / Interconsulta',
      body:
        'El expediente cambia según tu rol. En Mi Perfil eliges Sala o Interconsulta. Sala oculta Nota e Indicaciones, expone Estado Actual y Listado de Problemas, y usa Servicio (con default configurable) en lugar de Área. Los datos del paciente (nombre, registro, edad, sexo, área, servicio, cuarto, cama) se editan en la pestaña <strong>Datos</strong> del expediente.',
    },
    {
      title: 'Estado Actual',
      body:
        'Botón rápido en el expediente que abre la Plantilla de Evolución sin Subjetivo. Guarda el snapshot por paciente con timestamp y lo copia al portapapeles.',
    },
    {
      title: 'Listado de Problemas',
      body:
        'Pestaña nueva con Activos e Inactivos sin límite, drag-and-drop, fechas por problema y generador .docx con numeración a) b) c) de Word, títulos en negritas y firma editable (médicos por defecto se configuran en Mi Perfil).',
    },
    {
      title: 'Anion gap en gasometría',
      body:
        'AG (Na − (Cl + HCO3)) se calcula desde Na y Cl de Química Sanguínea o Electrolitos Séricos; si no hay química, no se muestra. Se marca cuando cae fuera de 8–12 mEq/L.',
    },
    {
      title: 'Calcio ionizado',
      body:
        'El bloque de gases extrae Ca++ ionizado desde Observaciones y lo marca según rango.',
    },
    {
      title: 'Tutorial más actionable',
      body:
        'El tour navega a la zona correcta, resalta el control y espera tu acción antes de avanzar. Dock pequeño y semitransparente en la esquina; clic en la barra colapsada para expandirlo. Aviso preventivo si guardas un paciente sin expediente.',
    },
    {
      title: 'Salida rápida ramificada',
      body:
        'En Sala exporta Listado de Problemas (.docx) si hay datos. En Interconsulta exporta Nota igual que antes.',
    },
  ],
  '2.4.1': [
    {
      title: 'Medicamentos (nombre + día) en formato compacto',
      body:
        'La salida resumida ahora usa formato corto: medicamento, dosis, vía abreviada, frecuencia abreviada y día de uso (por ejemplo: MEROPENEM 2G IV C/8H DIA 2).',
    },
    {
      title: 'Tendencias: hover del último punto',
      body:
        'En la mini-gráfica ampliada ya aparece el tooltip con la fecha y el valor cuando pasas el cursor sobre el último punto de la serie.',
    },
  ],
  '2.4.0': [
    {
      title: 'Sidebar de pacientes renovado',
      body:
        'Nueva organización del listado con Pinned/Fijados, archivado de pacientes y reordenamiento por arrastrar y soltar con animación más fluida.',
    },
    {
      title: 'Interacción y limpieza visual',
      body:
        'Mi Perfil se abre tocando R+ en el encabezado. Se simplificaron acciones de cada tarjeta para un layout más limpio y se ajustaron scrollbars translúcidos sin barras horizontales innecesarias en el sidebar.',
    },
    {
      title: 'Nuevos parsers de laboratorio',
      body:
        'R+ ahora procesa Fisicoquímico de heces y Frotis de sangre periférica para que esos resultados se integren al flujo clínico.',
    },
  ],
  '2.3.1': [
    {
      title: 'Tendencias y cultivos',
      body:
        'El panel de tendencias solo incluye analitos de laboratorio convencional (biometría, química, electrolitos, etc.). Los bloques de urocultivo, hemocultivo y similares dejan de aparecer como gráficas; siguen en la pestaña Cultivos del expediente.',
    },
  ],
  '2.3.0': [
    {
      title: 'Tendencias por tipo de estudio',
      body:
        'Las gráficas se agrupan por sección (biometría, química, gases, LCR, etc.) y puedes colapsar cada bloque. El mismo analito no se mezcla entre paneles distintos (por ejemplo hematocrito de biometría frente al de gasometría).',
    },
    {
      title: 'Catálogo amplio y series ocultas',
      body:
        'Más analitos en tendencias; puedes ocultar cada gráfica con el ícono del ojo. Los ocultos aparecen en una barra con chips, «Mostrar todos» y la barra se puede colapsar (se recuerda tu preferencia).',
    },
    {
      title: 'Gasometría',
      body:
        'Si el bloque de gases incluye hematocrito, también se extrae para tendencias en esa sección.',
    },
  ],
  '2.2.1': [
    {
      title: 'Tutorial y ayuda al día',
      body:
        'El recorrido Sala / Interconsulta y el modal inicial explican Sincronizar y Consolidar en el historial, la pestaña Cultivos, tendencias y la revisión de duplicados en Ajustes → Laboratorio. El mini-tour de Laboratorio incluye un paso sobre el historial.',
    },
    {
      title: 'Consolidar, más claro',
      body:
        'El mensaje de confirmación y el tooltip del botón Consolidar describen en lenguaje sencillo cuándo se fusionan envíos del mismo día (solo laboratorio o solo cultivos) y qué pasa con los conjuntos mixtos.',
    },
  ],
  '2.2.0': [
    {
      title: 'Pestaña Cultivos en el expediente',
      body:
        'Tabla con hemocultivo, urocultivo, catéter, Gram y fungicultivo: agrupada por tipo y ordenada del más reciente al más antiguo; arriba un resumen de cultivos negativos.',
    },
    {
      title: 'Historial y tendencias',
      body:
        'Consolidar estudios del mismo día (solo labs o solo cultivos), mejor clasificación de bloques de cultivo, tendencias sin puntos duplicados y fechas al copiar labs.',
    },
  ],
  '2.1.2': [
    {
      title: 'Duplicados en historial de labs',
      body:
        'Sincronizar desde Laboratorio o revisar todos los pacientes en Ajustes → Laboratorio; se quitan entradas repetidas y se mantiene la copia más antigua.',
    },
    {
      title: 'Expediente al pegar el reporte',
      body:
        'Si el texto trae un registro que coincide con otro paciente, R+ cambia a ese paciente. Si el registro no está en la lista, no se guarda el lab en el historial del activo por error.',
    },
  ],
  '2.1.1': [
    {
      title: 'Cultivos polimicrobianos',
      body:
        'Cuando el informe lista varios microorganismos (urocultivo u otros), cada aislamiento se resume con su antibiograma y su cuenta UFC.',
    },
  ],
  '2.1.0': [
    {
      title: 'Cultivos y antibiograma',
      body:
        'Tipo de cultivo y muestra en el resumen; marcas de resistencia (BLEE, carbapenemasas, etc.); antibiograma compacto solo con R, I y ESBL.',
    },
    {
      title: 'Citoquímico de líquidos',
      body:
        'Se procesa el bloque de líquidos corporales (Liq:) sin mezclar esos valores con la química de suero.',
    },
    {
      title: 'Barra lateral',
      body:
        'La lista de pacientes hace scroll por dentro; Mi Perfil y Guardar perfil siguen al alcance.',
    },
  ],
  '2.0.1': [
    {
      title: 'Modal de actualización',
      body:
        'Las notas de la nueva versión se muestran como texto legible dentro de la app, sin etiquetas HTML visibles.',
    },
  ],
  '2.0.0': [
    {
      title: 'Medicamentos y plantilla SOAP',
      body:
        'Nueva pestaña Medicamentos: importa la receta en TSV, copia desde SOME, vuelca a tratamiento o a la plantilla SOAP. Catálogo de clasificación exportable e importable desde Ajustes.',
    },
    {
      title: 'Ajustes y recuperación de datos',
      body:
        'Panel en secciones plegables, centro de ayuda arriba, scroll corregido. Deshacer usa copia en memoria fiable; respaldo automático antes de importar todo, restaurable desde Respaldos.',
    },
    {
      title: 'Laboratorio y tutorial',
      body:
        'Mejoras en historial de laboratorio y recorridos Sala e Interconsulta, con guías más claras en el centro de ayuda.',
    },
  ],
};

function getCuratedReleaseNotes(v) {
  if (v && RELEASE_NOTES_HIGHLIGHTS[v]) return RELEASE_NOTES_HIGHLIGHTS[v];
  return RELEASE_NOTES_HIGHLIGHTS_DEFAULT;
}

function maybeShowReleaseNotesFor(version, prevVersion) {
  if (!version || !prevVersion || prevVersion === version) return;
  try {
    if (localStorage.getItem(RELEASE_NOTES_SEEN_PREFIX + version)) return;
  } catch (_err) {
    return;
  }
  setTimeout(function(){ showReleaseNotesModal(version); }, 150);
}

function showReleaseNotesModal(version) {
  var el = document.getElementById('release-notes-backdrop');
  if (!el) return;
  var title = document.getElementById('release-notes-title');
  if (title) title.textContent = 'Novedades de R+ v' + version;
  var list = document.getElementById('release-notes-list');
  if (list) {
    var notes = getCuratedReleaseNotes(version);
    list.innerHTML = '';
    notes.forEach(function(n) {
      var li = document.createElement('li');
      var strong = document.createElement('strong');
      strong.textContent = n.title;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(' — '));
      var span = document.createElement('span');
      span.textContent = n.body || '';
      li.appendChild(span);
      list.appendChild(li);
    });
  }
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  el.setAttribute('data-version', version);
  setTimeout(function(){
    var btn = document.getElementById('release-notes-close-btn');
    if (btn) btn.focus();
  }, 50);
}

function closeReleaseNotes() {
  var el = document.getElementById('release-notes-backdrop');
  if (!el) return;
  var v = el.getAttribute('data-version');
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  if (v) {
    try { localStorage.setItem(RELEASE_NOTES_SEEN_PREFIX + v, '1'); } catch (_err) {}
  }
}

// ── Bloque L · Tours contextuales (mini tours) ─────────────────────
var miniTourActive = false;
var miniTourSteps = null;
var miniTourIdx = 0;

var SETTINGS_MINI_TOUR_STEPS = [
  {
    badge: 'Ajustes · panel',
    body: 'Abrimos el panel de <strong>Ajustes</strong> (icono ⚙ arriba a la derecha). Desde aquí defines la <strong>carpeta de documentos</strong> y el <strong>formato de Salida rápida</strong> (docx / html / txt) para el paciente activo.',
    before: function(){ ensureSettingsDropdownOpen(); }
  },
  {
    badge: 'Ajustes · respaldo',
    body: '<strong>Copias de seguridad</strong>: exporta todo, solo al paciente activo, un rango de fechas, o activa la <strong>copia automática</strong> (hasta 14 snapshots locales rotativos).',
    before: function(){ ensureSettingsDropdownOpen(); }
  },
  {
    badge: 'Ajustes · sync',
    body: 'Si usas R+ en más de un equipo, el <strong>Paquete sync</strong> intercambia JSON cifrados con passphrase y combina cambios sin pisar lo que ya tenías.',
    before: function(){ ensureSettingsDropdownOpen(); }
  },
  {
    badge: 'Ajustes · datos',
    body: 'En <strong>Datos en esta computadora</strong> puedes abrir la carpeta del perfil donde Electron guarda pacientes y notas. No compartas esa carpeta si contiene información sensible.',
    before: function(){ ensureSettingsDropdownOpen(); }
  },
  {
    badge: 'Ajustes · aplicación',
    body: 'Arriba del panel está el acceso directo al <strong>centro de ayuda</strong>. En <strong>Aplicación</strong> (sección inferior) ves la versión y puedes <strong>buscar actualizaciones</strong>.',
    before: function(){ ensureSettingsDropdownOpen(); }
  }
];

var LAB_MINI_TOUR_STEPS = [
  {
    badge: 'Laboratorio · pegar',
    body: 'Estás en la pestaña <strong>Laboratorio</strong>. Pega el reporte del laboratorio en el cuadro de texto. R+ reconoce biometría, química, electrolitos, gasometría, pruebas hepáticas y más.',
    before: function(){ switchAppTab('lab'); }
  },
  {
    badge: 'Laboratorio · procesar',
    body: 'Pulsa <strong>Procesar</strong>: R+ genera diagramas automáticos (Gamble, BH, Química, Coagulación…) y una tabla de resultados con los valores alterados resaltados en rojo.',
    before: function(){ switchAppTab('lab'); }
  },
  {
    badge: 'Laboratorio · enviar',
    body: 'Cada diagrama tiene un botón <strong>Copiar</strong> para pegarlo como texto en otro sistema. <strong>Enviar a nota</strong> vuelca el bloque completo al expediente del paciente activo.',
    before: function(){ switchAppTab('lab'); },
    dockLeft: true,
  },
  {
    badge: 'Laboratorio · tendencias',
    body: 'Cada laboratorio enviado se guarda con su fecha. Con dos o más labs aparecen mini-gráficas en <strong>Expediente → Tendencias</strong>.',
    before: function(){ switchAppTab('lab'); }
  },
  {
    badge: 'Laboratorio · historial',
    body: 'En la tarjeta <strong>Historial de laboratorio</strong>, <strong>Sincronizar</strong> abre el checklist para eliminar duplicados (misma fecha/hora y mismos valores). <strong>Consolidar</strong> fusiona conjuntos del mismo día si son homogéneos (solo labs o solo cultivos). Así las tendencias y la nota no arrastran repeticiones.',
    before: function(){ switchAppTab('lab'); }
  },
  {
    badge: 'Evolución · SOAP y medicamentos',
    body: 'En <strong>Expediente → Notas</strong> usa la <strong>plantilla SOAP</strong> para párrafos estructurados. La pestaña <strong>Medicamentos</strong> importa la receta del hospital y puede mandar dosis a SOAP o al tratamiento.',
    before: function(){ switchAppTab('nota'); }
  }
];

function ensureSettingsDropdownOpen() {
  var dd = document.getElementById('settings-dropdown');
  if (dd && !dd.classList.contains('open')) toggleSettingsDropdown();
}

function startMiniTour(kind) {
  if (guidedTourActive) {
    showToast('Finaliza el tutorial actual antes de iniciar un recorrido breve.', 'error');
    return;
  }
  var steps = null;
  if (kind === 'ajustes') steps = SETTINGS_MINI_TOUR_STEPS;
  else if (kind === 'lab') steps = LAB_MINI_TOUR_STEPS;
  if (!steps || !steps.length) return;
  closeQuickHelp();
  miniTourActive = true;
  miniTourSteps = steps;
  miniTourIdx = 0;
  showTourDock();
  renderMiniTourStep();
}

function renderMiniTourStep() {
  if (!miniTourActive || !miniTourSteps) return;
  var step = miniTourSteps[miniTourIdx];
  if (!step) { endMiniTour(); return; }
  if (typeof step.before === 'function') {
    try { step.before(); } catch (_err) {}
  }
  var badge = document.getElementById('tour-step-badge');
  var body = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var skipBtn = document.querySelector('#tour-dock .btn-tour-skip');
  if (badge) {
    badge.textContent = step.badge + ' · ' + (miniTourIdx + 1) + ' / ' + miniTourSteps.length;
  }
  if (body) body.innerHTML = step.body;
  if (nextBtn) {
    nextBtn.style.display = '';
    nextBtn.disabled = false;
    nextBtn.textContent = miniTourIdx === miniTourSteps.length - 1 ? 'Finalizar' : 'Siguiente';
  }
  if (skipBtn) skipBtn.textContent = 'Cerrar recorrido';
  syncTourDockPlacement();
}

function miniTourNext() {
  if (!miniTourActive) return;
  if (miniTourIdx >= (miniTourSteps ? miniTourSteps.length : 0) - 1) {
    endMiniTour();
    return;
  }
  miniTourIdx++;
  renderMiniTourStep();
}

function endMiniTour() {
  miniTourActive = false;
  miniTourSteps = null;
  miniTourIdx = 0;
  hideTourDock();
  var skipBtn = document.querySelector('#tour-dock .btn-tour-skip');
  if (skipBtn) skipBtn.textContent = 'Omitir tutorial';
}

function startHelpTourMain() {
  if (miniTourActive) endMiniTour();
  closeQuickHelp();
  resetAndStartOnboarding();
}

function safeExportSlug(str) {
  var s = (str || 'paciente').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+/g, '_').replace(/^_|_$/g, '');
  return (s || 'paciente').slice(0, 48);
}

// ── Respaldo local (exportar / importar JSON) ─────────────────────
function getAuditLog() {
  try {
    var raw = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_err) {
    return [];
  }
}

function addAuditEntry(action, result, count, detail) {
  var list = getAuditLog();
  list.unshift({
    timestamp: new Date().toISOString(),
    action: action || 'unknown',
    result: result || 'ok',
    count: Number.isFinite(count) ? count : 0,
    detail: detail || ''
  });
  if (list.length > 200) list = list.slice(0, 200);
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(list));
}

function exportAuditLog() {
  var log = getAuditLog();
  downloadJsonPayload({
    format: 'r-plus-audit-log',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: log
  }, 'R-plus-bitacora-' + formatDateSlug(new Date()) + '.json');
  showToast('Bitácora exportada', 'success');
}

var MED_CATALOG_MERGE_CAP = 400;

function mergeMedCatalogStored(incoming) {
  var cur = storage.getMedCatalog();
  var incAcc = incoming.accents && typeof incoming.accents === 'object' ? incoming.accents : {};
  var accents = Object.assign({}, cur.accents, incAcc);
  function mergeArr(a, b) {
    var seen = Object.create(null);
    var out = [];
    function add(list) {
      (list || []).forEach(function (t) {
        var s = String(t || '').trim();
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
  var si = incoming.soapTokens && typeof incoming.soapTokens === 'object' ? incoming.soapTokens : {};
  return {
    v: 1,
    accents: accents,
    soapTokens: {
      vasop: mergeArr(st.vasop, si.vasop),
      abx: mergeArr(st.abx, si.abx),
      analgesia: mergeArr(st.analgesia, si.analgesia),
      antihta: mergeArr(st.antihta, si.antihta),
    },
  };
}

function exportMedCatalogBundle() {
  var data = storage.getMedCatalog();
  downloadJsonPayload(
    {
      format: 'r-plus-med-catalog',
      version: 1,
      exportedAt: new Date().toISOString(),
      accents: data.accents || {},
      soapTokens: data.soapTokens || { vasop: [], abx: [], analgesia: [], antihta: [] },
    },
    'R-plus-catalogo-medicamentos-' + formatDateSlug(new Date()) + '.json'
  );
  addAuditEntry('med-catalog-export', 'ok', Object.keys(data.accents || {}).length, 'soap-export');
  showToast('Catálogo exportado', 'success');
}

function triggerImportMedCatalog() {
  var el = document.getElementById('med-catalog-file-input');
  if (el) el.click();
}

function onMedCatalogFileChosen(ev) {
  var input = ev.target;
  var f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var json = JSON.parse(String(reader.result || ''));
      var payload = json && typeof json === 'object' ? json : {};
      var accents = payload.accents;
      var soapTokens = payload.soapTokens;
      var hasAcc = accents && typeof accents === 'object';
      var hasSoap = soapTokens && typeof soapTokens === 'object';
      if (!hasAcc && !hasSoap) {
        showToast('El archivo no es un catálogo válido (faltan accents o soapTokens).', 'error');
        return;
      }
      var merged = mergeMedCatalogStored({
        accents: hasAcc ? accents : {},
        soapTokens: hasSoap ? soapTokens : {},
      });
      storage.saveMedCatalog(merged);
      applyMedCatalogOverlay(merged);
      var nAcc = Object.keys(merged.accents || {}).length;
      var nTok =
        (merged.soapTokens.vasop || []).length +
        (merged.soapTokens.abx || []).length +
        (merged.soapTokens.analgesia || []).length +
        (merged.soapTokens.antihta || []).length;
      addAuditEntry('med-catalog-import', 'ok', nTok, 'accents:' + nAcc);
      showToast('Catálogo importado (fusionado con el tuyo)', 'success');
    } catch (_err) {
      showToast('No se pudo leer el catálogo', 'error');
    }
  };
  reader.readAsText(f);
}

var PREIMPORT_BACKUP_KEY = 'rpc-preimport-backup';

function syncPreimportBackupUi() {
  var wrap = document.getElementById('settings-preimport-restore-wrap');
  if (!wrap) return;
  var raw = localStorage.getItem(PREIMPORT_BACKUP_KEY);
  var has = false;
  var meta = '';
  try {
    if (raw) {
      var p = JSON.parse(raw);
      if (p && p.format === 'r-plus-backup' && p.version === 1 && p.data) {
        has = true;
        var n = (p.data.patients || []).length;
        var when = p.exportedAt ? String(p.exportedAt).slice(0, 19).replace('T', ' ') : '';
        meta = (when ? when + ' · ' : '') + n + ' paciente(s)';
      }
    }
  } catch (_e) {}
  wrap.style.display = has ? 'block' : 'none';
  var el = document.getElementById('settings-preimport-meta');
  if (el) el.textContent = has ? meta : '—';
}

function restorePreimportBackupPrompt() {
  var raw = localStorage.getItem(PREIMPORT_BACKUP_KEY);
  if (!raw) {
    showToast(
      'No hay copia automática previa a una importación. Revisa Descargas por archivos R-plus-respaldo- o R-plus-auto-respaldo-.',
      'error'
    );
    syncPreimportBackupUi();
    return;
  }
  var payload;
  try {
    payload = JSON.parse(raw);
  } catch (_e) {
    showToast('La copia automática previa está dañada.', 'error');
    return;
  }
  if (!payload || payload.format !== 'r-plus-backup' || payload.version !== 1 || !payload.data) {
    showToast('Formato de respaldo no válido.', 'error');
    return;
  }
  var n = (payload.data.patients || []).length;
  if (
    !confirm(
      '¿Restaurar la copia guardada automáticamente antes de la última importación completa? (' +
        n +
        ' pacientes). La aplicación se recargará.'
    )
  ) {
    return;
  }
  if (typeof pushUndoSnapshot === 'function') pushUndoSnapshot('Antes de restaurar copia pre-importación');
  localStorage.setItem('rpc-patients', JSON.stringify(payload.data.patients || []));
  localStorage.setItem('rpc-notes', JSON.stringify(payload.data.notes || {}));
  localStorage.setItem('rpc-indicaciones', JSON.stringify(payload.data.indicaciones || {}));
  localStorage.setItem('rpc-labHistory', JSON.stringify(payload.data.labHistory || {}));
  localStorage.setItem('rpc-medRecetaByPatient', JSON.stringify(payload.data.medRecetaByPatient || {}));
  localStorage.setItem('rpc-listado-problemas', JSON.stringify(payload.data.listadoProblemas || {}));
  localStorage.setItem('rpc-settings', JSON.stringify(payload.data.settings || {}));
  if (payload.data.medCatalog && typeof payload.data.medCatalog === 'object') {
    storage.saveMedCatalog(payload.data.medCatalog);
  }
  if (payload.theme === 'dark' || payload.theme === 'light') {
    localStorage.setItem('theme', payload.theme);
  }
  if (payload.guidedTourDoneForVersion) {
    localStorage.setItem(GUIDED_TOUR_LS_KEY, payload.guidedTourDoneForVersion);
  } else {
    localStorage.removeItem(GUIDED_TOUR_LS_KEY);
  }
  addAuditEntry('preimport-restore', 'ok', n, payload.exportedAt || '');
  location.reload();
}

function formatDateSlug(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function downloadJsonPayload(payload, fileName) {
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, fileName);
}

function downloadBlob(blob, fileName) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function downloadTextPayload(content, fileName, mimeType) {
  var blob = new Blob([content], { type: (mimeType || 'text/plain') + ';charset=utf-8' });
  downloadBlob(blob, fileName);
}

function defaultAutoBackupSettings() {
  return { frequency: 'off', retention: 7, lastRunAt: 0 };
}

function getAutoBackupSettings() {
  try {
    var saved = JSON.parse(localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY) || '{}');
    var base = defaultAutoBackupSettings();
    var frequency = saved.frequency === 'daily' || saved.frequency === 'weekly' ? saved.frequency : 'off';
    var retention = parseInt(saved.retention, 10);
    if (retention !== 3 && retention !== 7 && retention !== 14) retention = 7;
    var lastRunAt = parseInt(saved.lastRunAt, 10);
    return { frequency: frequency, retention: retention, lastRunAt: Number.isFinite(lastRunAt) ? lastRunAt : 0 };
  } catch (_err) {
    return defaultAutoBackupSettings();
  }
}

function saveAutoBackupSettings(cfg) {
  localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(cfg));
}

function getAutoBackupIndex() {
  try {
    var list = JSON.parse(localStorage.getItem(AUTO_BACKUP_INDEX_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (_err) {
    return [];
  }
}

function saveAutoBackupIndex(list) {
  localStorage.setItem(AUTO_BACKUP_INDEX_KEY, JSON.stringify(list.slice(0, AUTO_BACKUP_MAX)));
}

function syncAutoBackupUi() {
  var cfg = getAutoBackupSettings();
  var freqEl = document.getElementById('auto-backup-frequency');
  var retEl = document.getElementById('auto-backup-retention');
  if (freqEl) freqEl.value = cfg.frequency;
  if (retEl) retEl.value = String(cfg.retention);
}

function updateAutoBackupSettingsFromUi() {
  var cfg = getAutoBackupSettings();
  var freqEl = document.getElementById('auto-backup-frequency');
  var retEl = document.getElementById('auto-backup-retention');
  cfg.frequency = freqEl ? freqEl.value : cfg.frequency;
  cfg.retention = retEl ? parseInt(retEl.value, 10) : cfg.retention;
  if (cfg.retention !== 3 && cfg.retention !== 7 && cfg.retention !== 14) cfg.retention = 7;
  saveAutoBackupSettings(cfg);
  addAuditEntry('auto-backup-config', 'ok', cfg.retention, cfg.frequency);
  maybeRunScheduledAutoBackup();
}

function shouldRunScheduledBackup(cfg) {
  if (!cfg || cfg.frequency === 'off') return false;
  var now = Date.now();
  var delta = cfg.frequency === 'weekly' ? 7 * 24 * 3600000 : 24 * 3600000;
  return !cfg.lastRunAt || (now - cfg.lastRunAt) >= delta;
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
  }, 30 * 60 * 1000);
}

function runAutoBackupNow(isScheduled) {
  saveState();
  var cfg = getAutoBackupSettings();
  var payload = buildFullBackupPayload();
  payload.autoBackup = { scheduled: !!isScheduled };
  var ts = Date.now();
  var fileName = 'R-plus-auto-respaldo-' + formatDateSlug(new Date(ts)) + '-' + String(ts).slice(-6) + '.json';
  downloadJsonPayload(payload, fileName);
  var idx = getAutoBackupIndex();
  idx.unshift({ id: ts, fileName: fileName, createdAt: new Date(ts).toISOString(), patients: (payload.data.patients || []).length });
  idx = idx.slice(0, cfg.retention);
  saveAutoBackupIndex(idx);
  cfg.lastRunAt = ts;
  saveAutoBackupSettings(cfg);
  addAuditEntry('backup-auto', 'ok', (payload.data.patients || []).length, isScheduled ? 'scheduled' : 'manual');
  showToast('Auto-respaldo generado', 'success');
}

function initGoalGFeatures() {
  syncAutoBackupUi();
  maybeRunScheduledAutoBackup();
  restartAutoBackupScheduler();
}

function buildFullBackupPayload() {
  return {
    format: 'r-plus-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    theme: localStorage.getItem('theme') || 'light',
    guidedTourDoneForVersion: localStorage.getItem(GUIDED_TOUR_LS_KEY),
    data: {
      patients: storage.getPatients(),
      notes: storage.getNotes(),
      indicaciones: storage.getIndicaciones(),
      labHistory: storage.getLabHistory(),
      medRecetaByPatient: storage.getMedRecetaByPatient(),
      listadoProblemas: storage.getListadoProblemas(),
      settings: storage.getSettings(),
      medCatalog: storage.getMedCatalog(),
    }
  };
}

function parseDateDMY(value) {
  var t = String(value || '').trim();
  var m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  var day = parseInt(m[1], 10);
  var month = parseInt(m[2], 10);
  var y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  var d = new Date(y, month - 1, day);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() !== y || d.getMonth() !== (month - 1) || d.getDate() !== day) return null;
  return d;
}

function parseDateRangePrompt(raw) {
  var txt = String(raw || '').trim();
  var m = txt.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+-\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})$/);
  if (!m) return null;
  var from = parseDateDMY(m[1]);
  var to = parseDateDMY(m[2]);
  if (!from || !to) return null;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  if (from.getTime() > to.getTime()) return null;
  return { from: from, to: to, fromLabel: m[1], toLabel: m[2] };
}

function buildPatientEntry(patientId) {
  var patient = patients.find(function(p) { return p.id === patientId; });
  if (!patient || patient.id === DEMO_PATIENT_ID) return null;
  return {
    patient: patient,
    note: notes[patientId] || {},
    indicaciones: indicaciones[patientId] || {},
    labHistory: Array.isArray(labHistory[patientId]) ? labHistory[patientId] : [],
    medReceta: medRecetaByPatient[patientId] || null
  };
}

function patientInDateRange(entry, range) {
  var nDate = entry && entry.note ? parseDateDMY(entry.note.fecha) : null;
  var iDate = entry && entry.indicaciones ? parseDateDMY(entry.indicaciones.fecha) : null;
  var nMs = nDate ? nDate.getTime() : null;
  var iMs = iDate ? iDate.getTime() : null;
  var min = range.from.getTime();
  var max = range.to.getTime();
  return (nMs !== null && nMs >= min && nMs <= max) || (iMs !== null && iMs >= min && iMs <= max);
}

function askConflictAction(label) {
  var answer = prompt('Conflicto detectado para "' + label + '". Escribe: O = sobrescribir, D = duplicar, C = cancelar.', 'O');
  var v = String(answer || '').trim().toUpperCase();
  if (v === 'O') return 'overwrite';
  if (v === 'D') return 'duplicate';
  return 'cancel';
}

function applyImportEntry(entry, action, existing) {
  if (action === 'overwrite' && existing) {
    existing.nombre = entry.patient.nombre || existing.nombre;
    existing.edad = entry.patient.edad || existing.edad;
    existing.sexo = entry.patient.sexo || existing.sexo;
    existing.area = entry.patient.area || existing.area;
    existing.servicio = entry.patient.servicio || existing.servicio;
    existing.cuarto = entry.patient.cuarto || existing.cuarto;
    existing.cama = entry.patient.cama || existing.cama;
    existing.registro = entry.patient.registro || existing.registro;
    notes[existing.id] = entry.note || {};
    indicaciones[existing.id] = entry.indicaciones || {};
    labHistory[existing.id] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
    if (entry.medReceta) medRecetaByPatient[existing.id] = entry.medReceta;
    else delete medRecetaByPatient[existing.id];
    return existing.id;
  }
  var newId = generatePatientId();
  patients.unshift({
    id: newId,
    nombre: ensureUniquePatientName(entry.patient.nombre || 'PACIENTE SIN NOMBRE'),
    area: entry.patient.area || '',
    servicio: entry.patient.servicio || '',
    cuarto: entry.patient.cuarto || '',
    cama: entry.patient.cama || '',
    edad: entry.patient.edad || '',
    sexo: entry.patient.sexo || 'F',
    registro: entry.patient.registro || '',
    fromLab: !!entry.patient.fromLab,
  });
  notes[newId] = entry.note || {};
  indicaciones[newId] = entry.indicaciones || {};
  labHistory[newId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  if (entry.medReceta) medRecetaByPatient[newId] = entry.medReceta;
  return newId;
}

function importEntriesWithConflicts(entries, actionLabel) {
  var out = { imported: 0, overwritten: 0, duplicated: 0, cancelled: false };
  var patientsBefore = JSON.parse(JSON.stringify(patients));
  var notesBefore = JSON.parse(JSON.stringify(notes));
  var indicacionesBefore = JSON.parse(JSON.stringify(indicaciones));
  var labHistoryBefore = JSON.parse(JSON.stringify(labHistory));
  var medRecetaBefore = JSON.parse(JSON.stringify(medRecetaByPatient));
  for (var i = 0; i < entries.length; i += 1) {
    var entry = entries[i];
    if (!entry || !entry.patient) continue;
    var reg = String(entry.patient.registro || '').trim();
    var exists = findPatientByRegistro(reg);
    if (exists) {
      var action = askConflictAction(entry.patient.nombre || reg || 'sin nombre');
      if (action === 'cancel') {
        out.cancelled = true;
        break;
      }
      applyImportEntry(entry, action, exists);
      if (action === 'overwrite') out.overwritten += 1;
      if (action === 'duplicate') out.duplicated += 1;
    } else {
      applyImportEntry(entry, 'duplicate', null);
      out.imported += 1;
    }
  }
  if (out.cancelled) {
    patients = patientsBefore;
    notes = notesBefore;
    indicaciones = indicacionesBefore;
    labHistory = labHistoryBefore;
    medRecetaByPatient = medRecetaBefore;
  } else {
    saveState();
    renderPatientList();
  }
  addAuditEntry(actionLabel, out.cancelled ? 'cancelled' : 'ok', out.imported + out.overwritten + out.duplicated,
    'new:' + out.imported + ',overwrite:' + out.overwritten + ',duplicate:' + out.duplicated);
  return out;
}

function exportDataBackup() {
  saveState();
  var payload = buildFullBackupPayload();
  downloadJsonPayload(payload, 'R-plus-respaldo-' + formatDateSlug(new Date()) + '.json');
  addAuditEntry('backup-full-export', 'ok', (payload.data.patients || []).length, '');
  showToast('Respaldo descargado', 'success');
}

function exportActivePatientBackup() {
  if (!activeId) {
    showToast('Selecciona un paciente en la lista.', 'error');
    return;
  }
  if (activeId === DEMO_PATIENT_ID) {
    showToast('El paciente de demostración no se exporta.', 'error');
    return;
  }
  var patient = patients.find(function(p) { return p.id === activeId; });
  if (!patient) return;
  saveState();
  var payload = {
    format: 'r-plus-patient-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    patient: patient,
    note: notes[activeId] || null,
    indicaciones: indicaciones[activeId] || null,
    labHistory: labHistory[activeId] || [],
    medReceta: medRecetaByPatient[activeId] || null,
  };
  downloadJsonPayload(payload, 'R-plus-paciente-' + safeExportSlug(patient.nombre) + '-' + formatDateSlug(new Date()) + '.json');
  addAuditEntry('backup-patient-export', 'ok', 1, String(patient.registro || ''));
  showToast('Paciente exportado', 'success');
}

function exportRangeBackupPrompt() {
  var raw = prompt('Rango de fechas (dd/mm/yyyy - dd/mm/yyyy):', '');
  if (raw == null) return;
  var range = parseDateRangePrompt(raw);
  if (!range) {
    showToast('Rango inválido. Usa dd/mm/yyyy - dd/mm/yyyy', 'error');
    return;
  }
  var entries = [];
  patients.forEach(function(p) {
    var entry = buildPatientEntry(p.id);
    if (entry && patientInDateRange(entry, range)) entries.push(entry);
  });
  if (!entries.length) {
    showToast('No hay pacientes en ese rango.', 'error');
    return;
  }
  var payload = {
    format: 'r-plus-range-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    from: range.fromLabel,
    to: range.toLabel,
    entries: entries
  };
  downloadJsonPayload(payload, 'R-plus-rango-' + formatDateSlug(new Date()) + '.json');
  addAuditEntry('range-export', 'ok', entries.length, payload.from + ' a ' + payload.to);
  showToast('Rango exportado', 'success');
}

function triggerImportRangeBackup() {
  var input = document.getElementById('range-backup-file-input');
  if (input) input.click();
}

function onRangeBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var payload = JSON.parse(reader.result);
      if (!payload || payload.format !== 'r-plus-range-export' || payload.version !== 1 || !Array.isArray(payload.entries)) {
        showToast('Archivo de rango inválido.', 'error');
        return;
      }
      if (typeof pushUndoSnapshot === 'function') pushUndoSnapshot('Importar rango (' + payload.entries.length + ')');
      var res = importEntriesWithConflicts(payload.entries, 'range-import');
      if (res.cancelled) {
        showToast('Importación cancelada', 'error');
      } else {
        showToast('Rango importado: ' + (res.imported + res.overwritten + res.duplicated), 'success');
      }
    } catch (_err) {
      showToast('No se pudo leer el archivo de rango.', 'error');
      addAuditEntry('range-import', 'error', 0, 'read-error');
    }
  };
  reader.readAsText(f);
}

function triggerImportBackup() {
  document.getElementById('backup-file-input').click();
}

function triggerImportActivePatientBackup() {
  var input = document.getElementById('patient-backup-file-input');
  if (input) input.click();
}

function generatePatientId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function findPatientByRegistro(registro) {
  var r = String(registro || '').trim();
  if (!r) return null;
  return patients.find(function(p) {
    return String(p.registro || '').trim() === r;
  }) || null;
}

function ensureUniquePatientName(base) {
  var desired = String(base || '').trim() || 'PACIENTE SIN NOMBRE';
  var normalized = desired.toUpperCase();
  var has = patients.some(function(p) {
    return String(p.nombre || '').trim().toUpperCase() === normalized;
  });
  if (!has) return desired;
  var i = 2;
  while (i < 9999) {
    var candidate = desired + ' (' + i + ')';
    var exists = patients.some(function(p) {
      return String(p.nombre || '').trim().toUpperCase() === candidate.toUpperCase();
    });
    if (!exists) return candidate;
    i += 1;
  }
  return desired + ' (COPIA)';
}

function onPatientBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var payload = JSON.parse(reader.result);
      if (!payload || payload.format !== 'r-plus-patient-export' || payload.version !== 1 || !payload.patient) {
        showToast('El archivo no es una exportación válida de paciente.', 'error');
        return;
      }
      var imported = payload.patient || {};
      var registro = String(imported.registro || '').trim();
      var existsByRegistro = findPatientByRegistro(registro);
      var msg = existsByRegistro
        ? ('Ya existe un paciente con el registro ' + registro + '. Esto sobrescribirá su nota, indicaciones y labs. ¿Continuar?')
        : ('Se importará el paciente "' + (imported.nombre || 'Sin nombre') + '". ¿Continuar?');
      if (!confirm(msg)) return;

      if (existsByRegistro) {
        var targetId = existsByRegistro.id;
        existsByRegistro.nombre = imported.nombre || existsByRegistro.nombre;
        existsByRegistro.edad = imported.edad || existsByRegistro.edad;
        existsByRegistro.sexo = imported.sexo || existsByRegistro.sexo;
        existsByRegistro.area = imported.area || existsByRegistro.area;
        existsByRegistro.servicio = imported.servicio || existsByRegistro.servicio;
        existsByRegistro.cuarto = imported.cuarto || existsByRegistro.cuarto;
        existsByRegistro.cama = imported.cama || existsByRegistro.cama;
        existsByRegistro.registro = imported.registro || existsByRegistro.registro;
        notes[targetId] = payload.note || notes[targetId] || {};
        indicaciones[targetId] = payload.indicaciones || indicaciones[targetId] || {};
        labHistory[targetId] = Array.isArray(payload.labHistory) ? payload.labHistory : [];
        if (payload.medReceta) medRecetaByPatient[targetId] = payload.medReceta;
        else delete medRecetaByPatient[targetId];
        activeId = targetId;
      } else {
        var newId = generatePatientId();
        var newPatient = {
          id: newId,
          nombre: ensureUniquePatientName(imported.nombre || 'PACIENTE SIN NOMBRE'),
          area: imported.area || '',
          servicio: imported.servicio || '',
          cuarto: imported.cuarto || '',
          cama: imported.cama || '',
          edad: imported.edad || '',
          sexo: imported.sexo || 'F',
          registro: imported.registro || '',
          fromLab: !!imported.fromLab,
        };
        patients.unshift(newPatient);
        notes[newId] = payload.note || {};
        indicaciones[newId] = payload.indicaciones || {};
        labHistory[newId] = Array.isArray(payload.labHistory) ? payload.labHistory : [];
        if (payload.medReceta) medRecetaByPatient[newId] = payload.medReceta;
        activeId = newId;
      }

      saveState();
      renderPatientList();
      if (activeId) selectPatient(activeId);
      addAuditEntry('backup-patient-import', 'ok', 1, registro || '');
      showToast('Paciente importado correctamente.', 'success');
    } catch (_err) {
      showToast('No se pudo leer la exportación de paciente.', 'error');
      addAuditEntry('backup-patient-import', 'error', 0, 'read-error');
    }
  };
  reader.readAsText(f);
}

function onBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var payload = JSON.parse(reader.result);
      if (!payload || payload.format !== 'r-plus-backup' || payload.version !== 1 || !payload.data) {
        showToast('El archivo no es un respaldo válido de R+', 'error');
        return;
      }
      var n = (payload.data.patients || []).length;
      if (!confirm('Esto reemplaza todos los pacientes y datos locales en esta computadora (' + n + ' pacientes en el archivo). No se puede deshacer. ¿Continuar?')) {
        return;
      }
      if (typeof pushUndoSnapshot === 'function') pushUndoSnapshot('Importar respaldo completo');
      localStorage.setItem('rpc-preimport-backup', JSON.stringify(buildFullBackupPayload()));
      localStorage.setItem('rpc-patients', JSON.stringify(payload.data.patients || []));
      localStorage.setItem('rpc-notes', JSON.stringify(payload.data.notes || {}));
      localStorage.setItem('rpc-indicaciones', JSON.stringify(payload.data.indicaciones || {}));
      localStorage.setItem('rpc-labHistory', JSON.stringify(payload.data.labHistory || {}));
      localStorage.setItem('rpc-medRecetaByPatient', JSON.stringify(payload.data.medRecetaByPatient || {}));
      localStorage.setItem('rpc-listado-problemas', JSON.stringify(payload.data.listadoProblemas || {}));
      localStorage.setItem('rpc-settings', JSON.stringify(payload.data.settings || {}));
      if (payload.data.medCatalog && typeof payload.data.medCatalog === 'object') {
        storage.saveMedCatalog(payload.data.medCatalog);
      }
      if (payload.theme === 'dark' || payload.theme === 'light') {
        localStorage.setItem('theme', payload.theme);
      }
      if (payload.guidedTourDoneForVersion) {
        localStorage.setItem(GUIDED_TOUR_LS_KEY, payload.guidedTourDoneForVersion);
      } else {
        localStorage.removeItem(GUIDED_TOUR_LS_KEY);
      }
      addAuditEntry('backup-full-import', 'ok', n, '');
      location.reload();
    } catch (err) {
      showToast('No se pudo leer el respaldo', 'error');
      addAuditEntry('backup-full-import', 'error', 0, 'read-error');
    }
  };
  reader.readAsText(f);
}

function bytesToBase64(bytes) {
  var binary = '';
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
  if (!window.crypto || !window.crypto.subtle) throw new Error('WebCrypto no disponible');
  var enc = new TextEncoder();
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  var key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  var plain = enc.encode(JSON.stringify(obj));
  var encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain);
  return {
    encrypted: true,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 120000,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  };
}

async function decryptSyncPayload(payload, passphrase) {
  if (!window.crypto || !window.crypto.subtle) throw new Error('WebCrypto no disponible');
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  var key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: base64ToBytes(payload.salt), iterations: payload.iterations || 120000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  var plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext)
  );
  return JSON.parse(dec.decode(plainBuffer));
}

function collectSyncEntries() {
  var entries = [];
  patients.forEach(function(p) {
    var entry = buildPatientEntry(p.id);
    if (entry) entries.push(entry);
  });
  return entries;
}

async function exportSyncBundlePrompt() {
  var entries = collectSyncEntries();
  if (!entries.length) {
    showToast('No hay datos para sincronizar.', 'error');
    return;
  }
  var passphrase = prompt('Passphrase opcional para cifrar (deja vacío para sin cifrado):', '');
  var base = {
    format: 'r-plus-sync-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null
  };
  if (passphrase && String(passphrase).trim()) {
    try {
      base.payload = await encryptSyncPayload({ entries: entries }, String(passphrase));
    } catch (_err) {
      showToast('No se pudo cifrar: WebCrypto no disponible.', 'error');
      addAuditEntry('sync-export', 'error', 0, 'crypto-unavailable');
      return;
    }
  } else {
    base.payload = { encrypted: false, entries: entries };
  }
  downloadJsonPayload(base, 'R-plus-sync-' + formatDateSlug(new Date()) + '.json');
  addAuditEntry('sync-export', 'ok', entries.length, base.payload.encrypted ? 'encrypted' : 'plain');
  showToast('Paquete sync exportado', 'success');
}

function triggerImportSyncBundle() {
  var input = document.getElementById('sync-bundle-file-input');
  if (input) input.click();
}

function onSyncBundleFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  var reader = new FileReader();
  reader.onload = async function() {
    try {
      var bundle = JSON.parse(reader.result);
      if (!bundle || bundle.format !== 'r-plus-sync-bundle' || bundle.version !== 1 || !bundle.payload) {
        showToast('Paquete sync inválido.', 'error');
        return;
      }
      var data = bundle.payload;
      if (data.encrypted) {
        var passphrase = prompt('Este paquete está cifrado. Ingresa la passphrase:', '');
        if (!passphrase) {
          showToast('Importación cancelada.', 'error');
          addAuditEntry('sync-import', 'cancelled', 0, 'no-passphrase');
          return;
        }
        data = await decryptSyncPayload(data, passphrase);
      }
      if (!data || !Array.isArray(data.entries)) {
        showToast('Contenido sync inválido.', 'error');
        addAuditEntry('sync-import', 'error', 0, 'invalid-content');
        return;
      }
      if (typeof pushUndoSnapshot === 'function') pushUndoSnapshot('Importar paquete sync (' + data.entries.length + ')');
      var res = importEntriesWithConflicts(data.entries, 'sync-import');
      if (res.cancelled) showToast('Sync cancelado', 'error');
      else showToast('Sync importado: ' + (res.imported + res.overwritten + res.duplicated), 'success');
    } catch (_err) {
      showToast('No se pudo importar el paquete sync.', 'error');
      addAuditEntry('sync-import', 'error', 0, 'read-error');
    }
  };
  reader.readAsText(f);
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

function safeAttrJsString(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function labRowSectionKey(row) {
  var s = String(row == null ? '' : row).trim();
  if (!s) return '';
  var tabIdx = s.indexOf('\t');
  if (tabIdx >= 0) return s.substring(0, tabIdx).trim().toUpperCase();
  var colonIdx = s.indexOf(':');
  if (colonIdx > 0) return s.substring(0, colonIdx + 1).trim().toUpperCase();
  var m = s.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b/);
  return m ? m[1].toUpperCase() : s.toUpperCase();
}

function labRowRichnessScore(row) {
  var s = normalizeLabLine(String(row == null ? '' : row));
  if (!s) return 0;
  var score = s.length;
  score += (s.match(/\b(?:AG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  if (/INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A/i.test(s)) score += 20;
  return score;
}

function dedupeConsolidatedRowsBySection(rows, tipo) {
  var normalized = [];
  var seenExact = Object.create(null);
  (rows || []).forEach(function (row) {
    var norm = normalizeLabLine(String(row == null ? '' : row));
    if (!norm) return;
    if (seenExact[norm]) return;
    seenExact[norm] = true;
    normalized.push(String(row));
  });
  if (tipo !== 'labs') return normalized;

  var bestBySection = Object.create(null);
  normalized.forEach(function (row, idx) {
    var key = labRowSectionKey(row);
    if (!key) return;
    var cand = { row: row, idx: idx, score: labRowRichnessScore(row) };
    var prev = bestBySection[key];
    if (!prev || cand.score > prev.score || (cand.score === prev.score && cand.idx > prev.idx)) {
      bestBySection[key] = cand;
    }
  });
  var has = Object.create(null);
  Object.keys(bestBySection).forEach(function (k) {
    has[bestBySection[k].idx] = true;
  });
  return normalized.filter(function (_row, idx) {
    return !!has[idx];
  });
}

function renderLabHistoryPanel() {
  var card = document.getElementById('lab-history-card');
  var listEl = document.getElementById('lab-history-list');
  var hintEl = document.getElementById('lab-history-hint');
  if (!card || !listEl || !hintEl) return;
  if (!activeId) {
    hintEl.style.display = 'block';
    hintEl.textContent = 'Selecciona un paciente en la columna izquierda para ver los estudios que hayas enviado a su nota.';
    listEl.innerHTML = '';
    syncLabHistoryCollapseUI();
    return;
  }
  var hist = sortLabHistoryChronological(ensureParsedLabHistory(activeId));
  if (!hist.length) {
    hintEl.style.display = 'block';
    hintEl.textContent = 'Cuando envíes un reporte a la nota con «Enviar a nota», cada conjunto queda guardado aquí (sirve para Tendencias y para volver a ver diagramas).';
    listEl.innerHTML = '';
    syncLabHistoryCollapseUI();
    return;
  }
  hintEl.style.display = 'none';
  listEl.innerHTML = hist.map(function(set) {
    var n = (set.resLabs && set.resLabs.length) ? set.resLabs.length : 0;
    var rawFe = set.fecha === 'Anterior' ? '' : (normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '');
    var fe;
    if (set.id === 'migrated-anterior') {
      fe = rawFe ? ('Anterior · ' + rawFe) : 'Anterior (sin fecha en bloque)';
    } else {
      fe = rawFe || (set.fecha === 'Anterior' ? 'Anterior' : '—');
    }
    var ho = (set.hora && String(set.hora).trim()) ? String(set.hora).trim().slice(0, 8) : '';
    var parts = [fe];
    if (ho) parts.push(ho);
    parts.push(n + ' bloque' + (n === 1 ? '' : 's'));
    var meta = parts.join(' · ');
    var sid = safeAttrJsString(set.id);
    return (
      '<div class="lab-history-row" role="listitem">' +
      '<div class="lab-history-meta">' + esc(meta) + '</div>' +
      '<div class="lab-history-actions">' +
      '<button type="button" class="btn-lab-history" onclick="replayLabHistorySet(\'' + sid + '\')">Ver en Laboratorio</button>' +
      '<button type="button" class="btn-lab-history" onclick="reprocessLabHistorySet(\'' + sid + '\')">Reprocesar</button>' +
      '<button type="button" class="btn-lab-history btn-lab-history-del" onclick="deleteLabHistorySet(\'' + sid + '\')">Eliminar</button>' +
      '</div></div>'
    );
  }).join('');
  syncLabHistoryCollapseUI();
}

function replayLabHistorySet(setId) {
  if (!activeId) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var sets = labHistory[activeId] || [];
  var set = sets.find(function(s) { return String(s.id) === String(setId); });
  if (!set || !set.resLabs || !set.resLabs.length) {
    showToast('No se encontró ese estudio', 'error');
    return;
  }
  var patient = patients.find(function(p) { return p.id === activeId; });
  var name = patient ? (patient.nombre || '') : '';
  var reg = patient ? (patient.registro || '') : '';
  var result = {
    patient: { name: name, expediente: reg, sexo: '', edad: '', fecha: set.fecha || '' },
    resLabs: set.resLabs
  };
  activeLab = result;
  renderOutput(result);
  renderDiagramas(result.resLabs);
  addAuditEntry('lab-history-replay', 'ok', 1, String(setId));
  showToast('Estudio cargado en Laboratorio', 'success');
  switchAppTab('lab');
  var diag = document.getElementById('lab-diagrams-section');
  if (diag && diag.style.display !== 'none') {
    try { diag.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_e) { diag.scrollIntoView(true); }
  }
}

function reprocessLabHistorySet(setId) {
  if (!activeId) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var sets = labHistory[activeId] || [];
  var set = sets.find(function (s) { return String(s.id) === String(setId); });
  if (!set) {
    showToast('No se encontró ese estudio', 'error');
    return;
  }
  if (!set.resLabs || !set.resLabs.length) {
    showToast('Este estudio no tiene resultados para reprocesar', 'error');
    return;
  }
  try {
    var repro = reprocessLabResultLines_(set.resLabs);
    if (!repro || !repro.length) {
      showToast('No se pudieron regenerar resultados desde el bloque guardado', 'error');
      return;
    }
    set.resLabs = repro.slice();
    set.parsed = extractParsedValues(set.resLabs);
    set.parsedBySection = buildParsedBySectionFromResLabs(set.resLabs);
    rebuildEstudiosFromLabHistory(activeId);
    saveState();
    renderLabHistoryPanel();
    refreshTendenciasOrCultivosPanel();
    replayLabHistorySet(setId);
    addAuditEntry('lab-history-reprocess', 'ok', 1, String(setId));
    showToast('Estudio reprocesado desde resultados ✓', 'success');
  } catch (_e) {
    showToast('Error al reprocesar este estudio', 'error');
  }
}

function deleteLabHistorySet(setId) {
  if (!activeId || !labHistory[activeId]) return;
  if (!confirm('¿Eliminar este conjunto del historial? Las tendencias se recalcularán.')) return;
  labHistory[activeId] = (labHistory[activeId] || []).filter(function(s) { return String(s.id) !== String(setId); });
  if (!labHistory[activeId].length) delete labHistory[activeId];
  saveState();
  addAuditEntry('lab-history-delete', 'ok', 1, String(setId));
  renderLabHistoryPanel();
  refreshTendenciasOrCultivosPanel();
  showToast('Eliminado del historial', 'success');
}

function removeDuplicateLabSetsForPatient(patientId) {
  if (!patientId || !labHistory[patientId] || !labHistory[patientId].length) return 0;
  var sets = ensureParsedLabHistory(patientId);
  var ids = findDuplicateLabSetIdsToRemove(sets);
  if (!ids.length) return 0;
  var idSet = new Set(ids);
  var before = labHistory[patientId].length;
  labHistory[patientId] = labHistory[patientId].filter(function (s) {
    return !idSet.has(String(s.id));
  });
  if (!labHistory[patientId].length) delete labHistory[patientId];
  rebuildEstudiosFromLabHistory(patientId);
  return before - (labHistory[patientId] ? labHistory[patientId].length : 0);
}

function labDedupeSummaryLine(set) {
  if (!set) return '—';
  var rawFe =
    set.fecha === 'Anterior'
      ? ''
      : normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
  var fe = set.id === 'migrated-anterior' ? (rawFe ? 'Anterior · ' + rawFe : 'Anterior (sin fecha en bloque)') : rawFe || (set.fecha === 'Anterior' ? 'Anterior' : '—');
  var ho = set.hora && String(set.hora).trim() ? String(set.hora).trim().slice(0, 8) : '';
  var n = set.resLabs && set.resLabs.length ? set.resLabs.length : 0;
  var parts = [fe];
  if (ho) parts.push(ho);
  parts.push(n + ' línea' + (n === 1 ? '' : 's'));
  parts.push('id ' + String(set.id).slice(-12));
  return parts.join(' · ');
}

function labParsedFingerprintForDedupe(set) {
  var p = set && set.parsed;
  if (!p || !Object.keys(p).length) p = extractParsedValues(set.resLabs || []);
  var keys = Object.keys(p).filter(function (k) {
    var v = p[k];
    return v != null && isFinite(Number(v));
  }).sort();
  if (!keys.length) return '';
  return keys.map(function (k) {
    return k + ':' + Number(p[k]);
  }).join('|');
}

function labLooseDupeKey(set) {
  if (!set) return '';
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  var timePart =
    typeof ms === 'number' && isFinite(ms)
      ? 't:' + ms
      : 'f:' + normalizeFechaLabHistory(set.fecha) + '|h:' + normalizeHoraLabHistory(set.hora);
  var fp = labParsedFingerprintForDedupe(set);
  if (!fp) return '';
  return timePart + '||' + fp;
}

function buildLabDedupeChecklistSections(patientId) {
  var sets = ensureParsedLabHistory(patientId);
  var byId = {};
  sets.forEach(function (s) {
    if (s && s.id != null) byId[String(s.id)] = s;
  });
  var rows = [];
  var exactRemoveIds = new Set();

  findExactDuplicateLabGroups(sets).forEach(function (g) {
    g.removeIds.forEach(function (id) {
      exactRemoveIds.add(id);
      var s = byId[id];
      if (!s) return;
      rows.push({
        patientId: patientId,
        id: id,
        kind: 'exact',
        checked: true,
        summary: labDedupeSummaryLine(s),
      });
    });
  });

  var looseByKey = Object.create(null);
  sets.forEach(function (s) {
    if (!s || s.id == null) return;
    var k = labLooseDupeKey(s);
    if (!k) return;
    if (!looseByKey[k]) looseByKey[k] = [];
    looseByKey[k].push(s);
  });
  Object.keys(looseByKey).forEach(function (k) {
    var arr = looseByKey[k];
    if (arr.length < 2) return;
    arr.sort(compareLabSetIdForDedupe);
    arr.slice(1).forEach(function (s) {
      var sid = String(s.id);
      if (exactRemoveIds.has(sid)) return;
      rows.push({
        patientId: patientId,
        id: sid,
        kind: 'loose',
        checked: true,
        summary: labDedupeSummaryLine(s),
      });
    });
  });

  return rows;
}

function applyLabDedupeFromChecklist(mapByPatient) {
  var removedTotal = 0;
  Object.keys(mapByPatient).forEach(function (pid) {
    var ids = mapByPatient[pid];
    if (!ids || !ids.length || !labHistory[pid]) return;
    var idSet = new Set(ids.map(String));
    var before = labHistory[pid].length;
    labHistory[pid] = labHistory[pid].filter(function (s) {
      return !idSet.has(String(s.id));
    });
    if (!labHistory[pid].length) delete labHistory[pid];
    rebuildEstudiosFromLabHistory(pid);
    removedTotal += before - (labHistory[pid] ? labHistory[pid].length : 0);
  });
  return removedTotal;
}

function showLabDedupeChecklistModal(sections) {
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'lab-dedupe-backdrop';
  var blocks = sections
    .map(function (sec) {
      var exact = sec.rows.filter(function (r) {
        return r.kind === 'exact';
      });
      var loose = sec.rows.filter(function (r) {
        return r.kind === 'loose';
      });
      var head =
        '<h4 style="margin:12px 0 8px;font-size:14px;font-weight:700;color:var(--text);">' +
        esc(sec.nombre || '—') +
        (sec.registro ? ' <span style="opacity:0.85;font-weight:500">· ' + esc(sec.registro) + '</span>' : '') +
        '</h4>';
      var part = '<div class="lab-dedupe-patient-block">' + head;
      if (exact.length) {
        part +=
          '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">Duplicados exactos (misma fecha, hora y texto del reporte)</p><ul style="margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;">';
        exact.forEach(function (r) {
          part +=
            '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="lab-dedupe-cb" data-pid="' +
            esc(r.patientId) +
            '" data-sid="' +
            esc(r.id) +
            '" checked style="margin-top:3px;flex-shrink:0;" /> <span>' +
            esc(r.summary) +
            '</span></label></li>';
        });
        part += '</ul>';
      }
      if (loose.length) {
        part +=
          '<p style="margin:0 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">Posibles duplicados (misma fecha/hora y mismos valores numéricos parseados; el texto del reporte puede diferir)</p><ul style="margin:0 0 14px;padding-left:0;list-style:none;max-height:220px;overflow-y:auto;font-size:13px;">';
        loose.forEach(function (r) {
          part +=
            '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="lab-dedupe-cb" data-pid="' +
            esc(r.patientId) +
            '" data-sid="' +
            esc(r.id) +
            '" checked style="margin-top:3px;flex-shrink:0;" /> <span>' +
            esc(r.summary) +
            '</span></label></li>';
        });
        part += '</ul>';
      }
      return part + '</div>';
    })
    .join('');
  var defaultCount = sections.reduce(function (acc, s) {
    return acc + s.rows.length;
  }, 0);
  backdrop.innerHTML =
    '<div class="lab-conflict-modal" style="max-width:520px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">' +
    '<h3 style="margin:0 0 8px;">Sincronizar historial de laboratorio</h3>' +
    '<p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca las entradas a eliminar. Por defecto se seleccionan las copias redundantes y se conserva el conjunto con id más antiguo en cada grupo.</p>' +
    '<div style="overflow-y:auto;flex:1;min-height:0;padding-right:4px;">' +
    blocks +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:14px;justify-content:space-between;flex-wrap:wrap;align-items:center;">' +
    '<span style="font-size:12px;color:var(--text-muted);" id="lab-dedupe-count">' +
    defaultCount +
    ' seleccionada' +
    (defaultCount === 1 ? '' : 's') +
    '</span>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
    '<button type="button" id="lab-dedupe-none" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Quitar todas</button>' +
    '<button type="button" id="lab-dedupe-all" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Seleccionar todas</button>' +
    '<button type="button" id="lab-dedupe-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button>' +
    '<button type="button" id="lab-dedupe-ok" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Eliminar seleccionadas</button>' +
    '</div></div></div>';
  document.body.appendChild(backdrop);

  function updateCount() {
    var n = backdrop.querySelectorAll('.lab-dedupe-cb:checked').length;
    var el = document.getElementById('lab-dedupe-count');
    if (el) {
      el.textContent = n + ' seleccionada' + (n === 1 ? '' : 's');
    }
  }
  backdrop.querySelectorAll('.lab-dedupe-cb').forEach(function (cb) {
    cb.addEventListener('change', updateCount);
  });
  document.getElementById('lab-dedupe-none').onclick = function () {
    backdrop.querySelectorAll('.lab-dedupe-cb').forEach(function (cb) {
      cb.checked = false;
    });
    updateCount();
  };
  document.getElementById('lab-dedupe-all').onclick = function () {
    backdrop.querySelectorAll('.lab-dedupe-cb').forEach(function (cb) {
      cb.checked = true;
    });
    updateCount();
  };
  document.getElementById('lab-dedupe-cancel').onclick = function () {
    backdrop.remove();
  };
  document.getElementById('lab-dedupe-ok').onclick = function () {
    var mapByPatient = {};
    backdrop.querySelectorAll('.lab-dedupe-cb:checked').forEach(function (cb) {
      var pid = cb.getAttribute('data-pid');
      var sid = cb.getAttribute('data-sid');
      if (!pid || !sid) return;
      if (!mapByPatient[pid]) mapByPatient[pid] = [];
      mapByPatient[pid].push(sid);
    });
    backdrop.remove();
    var nSel = Object.keys(mapByPatient).reduce(function (a, pid) {
      return a + mapByPatient[pid].length;
    }, 0);
    if (!nSel) {
      showToast('No seleccionaste entradas para eliminar', 'error');
      return;
    }
    if (typeof pushUndoSnapshot === 'function') pushUndoSnapshot('Eliminar duplicados de historial de labs (' + nSel + ')');
    var removedTotal = applyLabDedupeFromChecklist(mapByPatient);
    saveState();
    renderLabHistoryPanel();
    refreshTendenciasOrCultivosPanel();
    var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el && activeId && notes[activeId]) el.value = notes[activeId].estudios || '';
    addAuditEntry('lab-history-dedupe', 'ok', removedTotal, Object.keys(mapByPatient).length + ' pacientes');
    showToast('Eliminadas ' + removedTotal + ' entrada' + (removedTotal === 1 ? '' : 's') + ' ✓', 'success');
  };
}

function openLabHistoryDedupeReview(scope) {
  scope = scope || 'active';
  if (scope === 'active') {
    if (!activeId) {
      showToast('Selecciona un paciente primero', 'error');
      return;
    }
    var rows = buildLabDedupeChecklistSections(activeId);
    if (!rows.length) {
      showToast('No hay duplicados ni coincidencias por fecha/valores en este paciente', 'success');
      return;
    }
    var p = patients.find(function (x) {
      return x.id === activeId;
    });
    showLabDedupeChecklistModal([
      {
        patientId: activeId,
        nombre: p ? p.nombre : '',
        registro: p ? p.registro : '',
        rows: rows,
      },
    ]);
    return;
  }
  if (scope === 'all') {
    var sections = [];
    patients.forEach(function (p) {
      if (p.isDemo) return;
      var r = buildLabDedupeChecklistSections(p.id);
      if (r.length) {
        sections.push({
          patientId: p.id,
          nombre: p.nombre || '—',
          registro: p.registro || '',
          rows: r,
        });
      }
    });
    if (!sections.length) {
      showToast('No se encontraron duplicados ni coincidencias por fecha/valores', 'success');
      closeSettingsDropdown();
      return;
    }
    showLabDedupeChecklistModal(sections);
    closeSettingsDropdown();
  }
}

/**
 * Fusiona entradas de labHistory del mismo día calendario y mismo tipo homogéneo (solo labs o solo cultivo).
 * Los conjuntos mixtos (laboratorio + cultivo en un mismo set) no se fusionan ni se agrupan con otros.
 */
function consolidateLabHistoryByDayAndTipo() {
  if (!activeId) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var list = labHistory[activeId];
  if (!list || list.length < 2) {
    showToast('Se necesitan al menos 2 conjuntos en el historial', 'error');
    return;
  }
  if (
    !confirm(
      '¿Consolidar el historial por día?\n\n' +
        'R+ agrupa entradas que comparten la misma fecha (día calendario) solo si son del mismo tipo:\n\n' +
        '1) Varios envíos que traen únicamente laboratorio (sin bloque de cultivos) ese día → se unen en una sola entrada.\n\n' +
        '2) Varios envíos que traen únicamente cultivos ese día → se unen en una sola entrada.\n\n' +
        '3) Si un envío mezcla laboratorio y cultivos en el mismo conjunto, no se fusiona con otros ni se modifica.\n\n' +
        'En cada grupo se conserva la entrada más antigua (id más viejo), se combinan todos los renglones y las líneas de texto idénticas se guardan una sola vez.'
    )
  ) {
    return;
  }
  ensureParsedLabHistory(activeId);
  var sets = labHistory[activeId].slice();
  var groups = Object.create(null);
  sets.forEach(function (set) {
    if (!set || set.fecha === 'Anterior') return;
    var dk = dayKeyFromLabSet(set);
    if (dk === 'unknown') return;
    var tipo = primaryTipoForLabSet(set.resLabs);
    if (tipo === 'mixed') return;
    var gk = dk + '\x01' + tipo;
    if (!groups[gk]) groups[gk] = [];
    groups[gk].push(set);
  });
  var todo = [];
  Object.keys(groups).forEach(function (gk) {
    var arr = groups[gk];
    if (arr.length < 2) return;
    var tipoGrupo = gk.split('\x01')[1] || 'labs';
    arr.sort(compareLabSetIdForDedupe);
    var keeper = arr[0];
    var merged = (keeper.resLabs || []).slice();
    var sourceParts = [];
    if (keeper.sourceText && String(keeper.sourceText).trim()) sourceParts.push(String(keeper.sourceText).trim());
    for (var i = 1; i < arr.length; i++) {
      var other = arr[i].resLabs || [];
      if (merged.length && other.length) merged.push('');
      merged = merged.concat(other);
      if (arr[i].sourceText && String(arr[i].sourceText).trim()) sourceParts.push(String(arr[i].sourceText).trim());
    }
    var deduped = dedupeConsolidatedRowsBySection(merged, tipoGrupo);
    keeper.resLabs = deduped;
    keeper.parsed = extractParsedValues(deduped);
    keeper.parsedBySection = buildParsedBySectionFromResLabs(deduped);
    if (sourceParts.length) keeper.sourceText = sourceParts.join('\n\n---\n\n');
    var newest = arr[arr.length - 1];
    if (newest.hora) keeper.hora = newest.hora;
    for (var j = 1; j < arr.length; j++) {
      todo.push(String(arr[j].id));
    }
  });
  if (!todo.length) {
    showToast('No hay grupos del mismo día y tipo homogéneo para fusionar', 'success');
    return;
  }
  if (typeof pushUndoSnapshot === 'function') pushUndoSnapshot('Consolidar historial de labs por día y tipo');
  var idRemove = new Set(todo);
  labHistory[activeId] = labHistory[activeId].filter(function (s) {
    return !idRemove.has(String(s.id));
  });
  if (!labHistory[activeId].length) delete labHistory[activeId];
  rebuildEstudiosFromLabHistory(activeId);
  saveState();
  renderLabHistoryPanel();
  refreshTendenciasOrCultivosPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el && notes[activeId]) el.value = notes[activeId].estudios || '';
  addAuditEntry('lab-history-consolidate', 'ok', todo.length, String(activeId));
  showToast('Fusionados ' + todo.length + ' conjunto(s) ✓', 'success');
}

// ── Lab ───────────────────────────────────────────────────────────
function limpiarReporte() {
  document.getElementById('lab-input').value = '';
  document.getElementById('lab-banner').style.display = 'none';
  document.getElementById('lab-diagrams-section').style.display = 'none';
  document.getElementById('diagrams-grid').innerHTML = '';
  document.getElementById('lab-output-section').style.display = 'none';
  document.getElementById('lab-output-box').innerHTML = '';
  activeLab = null;
}

function openLabPatientPicker() {
  var overlay = document.createElement('div');
  overlay.id = 'lab-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#1f2937;border-radius:10px;padding:20px;min-width:260px;max-width:360px;width:90%;';
  var title = document.createElement('div');
  title.textContent = '¿A qué paciente enviar los labs?';
  title.style.cssText = 'color:#f9fafb;font-size:14px;font-weight:600;margin-bottom:14px;';
  box.appendChild(title);
  patients.forEach(function(p) {
    var btn = document.createElement('button');
    btn.textContent = p.nombre + (p.registro ? '  •  ' + p.registro : '');
    btn.style.cssText = 'display:block;width:100%;text-align:left;background:#374151;color:#f3f4f6;border:none;border-radius:6px;padding:10px 12px;margin-bottom:8px;cursor:pointer;font-size:13px;';
    btn.onmouseenter = function(){ this.style.background='#4b5563'; };
    btn.onmouseleave = function(){ this.style.background='#374151'; };
    btn.onclick = function() {
      document.body.removeChild(overlay);
      selectPatient(p.id);
      enviarLabsANota();
    };
    box.appendChild(btn);
  });
  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.cssText = 'display:block;width:100%;background:transparent;color:#9ca3af;border:1px solid #374151;border-radius:6px;padding:8px;cursor:pointer;font-size:13px;margin-top:4px;';
  cancelBtn.onclick = function() { document.body.removeChild(overlay); };
  box.appendChild(cancelBtn);
  overlay.appendChild(box);
  overlay.onclick = function(e){ if(e.target===overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
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

function mergeSoapMedField(fieldId, fragment) {
  var el = document.getElementById(fieldId);
  if (!el || !fragment) return;
  var f = String(fragment).trim();
  if (!f) return;
  var cur = el.value.trim();
  el.value = cur ? cur + ' | ' + f : f;
}

function openSOAPModalDirect() {
  var bd = document.getElementById('soap-modal-backdrop');
  if (bd) bd.classList.add('open');
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
  switchAppTab('nota');
  switchInnerTab('notas');
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
  switchAppTab('nota');
  switchInnerTab('notas');
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
    showToast('No se encontraron medicamentos válidos', 'error');
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

function copiarLabsAlPortapapeles() {
  if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
    showToast('No hay resultados procesados', 'error'); return;
  }
  var text = buildLabLines().join('\n');
  navigator.clipboard.writeText(text)
    .then(function() { showToast('Labs copiados al portapapeles ✓', 'success'); })
    .catch(function() { showToast('Error al copiar al portapapeles', 'error'); });
}

function enviarLabsANota() {
  if (!activeLab || !activeLab.resLabs || !activeLab.resLabs.length) {
    showToast('No hay resultados procesados', 'error'); return;
  }
  if (!activeId) {
    if (!patients.length) { showToast('Agrega un paciente primero', 'error'); return; }
    if (patients.length === 1) { selectPatient(patients[0].id); }
    else { openLabPatientPicker(); return; }
  }
  checkStudiosAndInsertLabs();
}

// ── Multilab ──────────────────────────────────────────────────────
function buildLabLines() {
  var lines = [];
  if (activeLab && activeLab.patient) {
    var raw = activeLab.patient.fecha || '';
    var fechaDm = normalizeFechaLabHistory(raw) || String(raw).trim();
    if (fechaDm === 'Anterior') fechaDm = '';
    if (!fechaDm && raw) {
      var mesesMap = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12',jan:'01',apr:'04',aug:'08',dec:'12'};
      var mFechaLab = raw.trim().match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
      var monNum = mFechaLab && mesesMap[mFechaLab[1].toLowerCase().slice(0, 3)];
      if (monNum) fechaDm = mFechaLab[2].padStart(2, '0') + '/' + monNum + '/' + mFechaLab[3];
    }
    if (fechaDm) lines.push(fechaDm);
  }
  activeLab.resLabs.forEach(function(entry) {
    var cleaned = entry.replace(/\t/g, ' ').replace(/\*+/g, '').replace(/  +/g, ' ').trim();
    lines.push(cleaned);
  });
  return lines;
}

// ── SOAP Modal ────────────────────────────────────────
function openSOAPModal() {
  if (!activeId) { showToast('Selecciona un paciente primero', 'error'); return; }
  var existing = notes[activeId] && notes[activeId].evolucion ? notes[activeId].evolucion.trim() : '';
  if (existing) {
    var backdrop = document.createElement('div');
    backdrop.className = 'lab-conflict-backdrop';
    backdrop.id = 'soap-confirm-backdrop';
    backdrop.innerHTML =
      '<div class="lab-conflict-modal">' +
      '<h3>¿Reemplazar evolución?</h3>' +
      '<p>La evolución ya tiene contenido. ¿Reemplazarlo con la plantilla?</p>' +
      '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
      '<button onclick="document.getElementById(\'soap-confirm-backdrop\').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Cancelar</button>' +
      '<button onclick="document.getElementById(\'soap-confirm-backdrop\').remove();document.getElementById(\'soap-modal-backdrop\').classList.add(\'open\')" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Reemplazar</button>' +
      '</div></div>';
    document.body.appendChild(backdrop);
  } else {
    document.getElementById('soap-modal-backdrop').classList.add('open');
  }
}

function closeSOAPModal() {
  document.getElementById('soap-modal-backdrop').classList.remove('open');
  ['soap-s','soap-four','soap-esferas','soap-analgesia','soap-fr','soap-sat',
   'soap-tas','soap-tad','soap-fc','soap-antihta','soap-vasop','soap-temp','soap-abx',
   'soap-dieta','soap-kcalkg','soap-kcal','soap-peso','soap-ing','soap-egr',
   'soap-balance','soap-glu1','soap-glu2','soap-glu3'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var sel = document.getElementById('soap-soporte');
  if (sel) sel.selectedIndex = 0;
  document.body.removeAttribute('data-estado-actual-mode');
  var title = document.getElementById('soap-modal-title-text');
  if (title) title.textContent = 'Plantilla de Evolución';
}

// ── Estado Actual (Sala v3.0) ─────────────────────────────────
function openEstadoActualModal() {
  if (!activeId) { showToast('Selecciona un paciente primero', 'error'); return; }
  document.body.setAttribute('data-estado-actual-mode', 'true');
  var title = document.getElementById('soap-modal-title-text');
  if (title) title.textContent = 'Estado Actual';
  var s = document.getElementById('soap-s');
  if (s) s.value = '';
  document.getElementById('soap-modal-backdrop').classList.add('open');
}
function _estadoActualText() {
  var s = document.getElementById('soap-s');
  if (s) s.value = '';
  return buildSOAPText().replace(/^\s*\n+/, '');
}
async function _copyToClipboardSafe(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_e) {}
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_e) { return false; }
}
async function estadoActualOnlyCopy() {
  if (!activeId) return;
  var text = _estadoActualText();
  var ok = await _copyToClipboardSafe(text);
  showToast(ok ? 'Estado Actual copiado al portapapeles ✓' : 'No se pudo copiar', ok ? 'success' : 'error');
  closeSOAPModal();
}
async function estadoActualSaveAndCopy() {
  if (!activeId) return;
  var patient = patients.find(function(p){ return p.id === activeId; });
  if (!patient) return;
  var text = _estadoActualText();
  patient.estadoActual = { text: text, savedAt: new Date().toISOString() };
  saveState();
  renderEstadoActualBar();
  var ok = await _copyToClipboardSafe(text);
  showToast(ok ? 'Estado Actual guardado y copiado ✓' : 'Guardado, pero no se pudo copiar', ok ? 'success' : 'error');
  closeSOAPModal();
}
function renderEstadoActualBar() {
  var bar = document.getElementById('estado-actual-bar');
  var meta = document.getElementById('estado-actual-meta');
  if (!bar) return;
  var sala = isModeSala(settings);
  if (!sala || !activeId) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  if (!meta) return;
  var patient = patients.find(function(p){ return p.id === activeId; });
  if (patient && patient.estadoActual && patient.estadoActual.savedAt) {
    var d = new Date(patient.estadoActual.savedAt);
    if (!isNaN(d.getTime())) {
      var label = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() + ' · ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      meta.textContent = 'Último guardado: ' + label;
      return;
    }
  }
  meta.textContent = 'Sin estado actual registrado';
}

function updateSOAPBalance() {
  var ing = parseFloat(document.getElementById('soap-ing').value);
  var egr = parseFloat(document.getElementById('soap-egr').value);
  var bal = document.getElementById('soap-balance');
  if (!isNaN(ing) && !isNaN(egr)) {
    var diff = ing - egr;
    bal.value = (diff > 0 ? '+' : '') + diff;
  } else {
    bal.value = '';
  }
}

function buildSOAPText() {
  function g(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function val(v) { return v ? v.toUpperCase() : '___'; }
  function num(v) { return v !== '' ? v : '___'; }

  var soporteMap = {
    'Aire ambiente':    'AL AIRE AMBIENTE',
    'Puntillas nasales':'POR PUNTILLAS NASALES',
    'Alto flujo':       'POR ALTO FLUJO',
    'VM no invasiva':   'CON VENTILACIÓN MECÁNICA NO INVASIVA'
  };
  var soporte = soporteMap[g('soap-soporte')] || 'AL AIRE AMBIENTE';

  var ing = g('soap-ing');
  var egr = g('soap-egr');
  var balance = (ing && egr) ?
    (function(){ var d = parseFloat(ing) - parseFloat(egr); return (d > 0 ? '+' : '') + d; }()) :
    '___';

  var lines = [];
  var subj = g('soap-s');
  if (subj) { lines.push('S: ' + subj); lines.push(''); }

  lines.push('N: FOUR ' + num(g('soap-four')) + '/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN ' + num(g('soap-esferas')) + ' ESFERAS, ALERTA || ANALGESIA CON ' + val(g('soap-analgesia')));
  lines.push('V: FR ' + num(g('soap-fr')) + ' RPM, SATO2 ' + num(g('soap-sat')) + '% ' + soporte + ' | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS');
  lines.push('HD: ESTABLE, TA ' + num(g('soap-tas')) + '/' + num(g('soap-tad')) + ' MMHG, FC ' + num(g('soap-fc')) + ' LPM || ANTIHIPERTENSIVOS: ' + val(g('soap-antihta') || 'NINGUNO') + ' || VASOPRESORES: ' + val(g('soap-vasop') || 'NINGUNO'));
  lines.push('HI: AFEBRIL, TEMPERATURA ' + num(g('soap-temp')) + ' °C || ANTIBIÓTICOS: ' + val(g('soap-abx') || 'NINGUNO'));
  lines.push('NM: DIETA ' + val(g('soap-dieta')) + ' CALCULADA A ' + num(g('soap-kcalkg')) + ' KCAL/KG (' + num(g('soap-kcal')) + ' KCAL) PARA PESO DE ' + num(g('soap-peso')) + ' KG || INGRESOS ' + num(ing) + ' CC, EGRESOS ' + num(egr) + ' CC, BALANCE ' + balance + ' CC || GLUCOMETRÍAS CAPILARES (' + num(g('soap-glu1')) + ', ' + num(g('soap-glu2')) + ', ' + num(g('soap-glu3')) + ' MG/DL) || RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE');

  return lines.join('\n');
}

function insertSOAPText() {
  var text = buildSOAPText();
  if (!notes[activeId]) notes[activeId] = {};
  notes[activeId].evolucion = text;
  saveState();
  var el = document.querySelector('#note-form textarea[oninput*="evolucion"]');
  if (el) el.value = text;
  closeSOAPModal();
  showToast('Plantilla insertada ✓', 'success');
}

function checkStudiosAndInsertLabs() {
  var lines = buildLabLines();
  var history = sortLabHistoryChronological(ensureParsedLabHistory(activeId));
  var recentDate = history.length ? buildLabSetDateLine(history[0]) : '';
  if (!history.length) {
    insertLabsAsRecent(lines);
  } else {
    showLabConflictModal(lines, recentDate);
  }
}

function pushLabHistory(patientId, resLabs, fecha, hora, sourceText) {
  if (!patientId || !resLabs || !resLabs.length) return;
  if (!labHistory[patientId]) labHistory[patientId] = [];
  var fechaNorm = normalizeFechaLabHistory(fecha) || String(fecha || '').trim();
  if (!fechaNorm && notes[patientId] && notes[patientId].fecha) {
    fechaNorm = normalizeFechaLabHistory(notes[patientId].fecha) || '';
  }
  if (!fechaNorm) {
    var nd = new Date();
    fechaNorm = String(nd.getDate()).padStart(2, '0') + '/' + String(nd.getMonth() + 1).padStart(2, '0') + '/' + nd.getFullYear();
  }
  var horaNorm = normalizeHoraLabHistory(hora);
  if (!horaNorm && notes[patientId] && notes[patientId].hora) {
    horaNorm = normalizeHoraLabHistory(notes[patientId].hora);
  }
  var set = {
    id: Date.now().toString(),
    fecha: fechaNorm,
    hora: horaNorm,
    resLabs: resLabs,
    parsed: extractParsedValues(resLabs),
    parsedBySection: buildParsedBySectionFromResLabs(resLabs)
  };
  var raw = String(sourceText || '').trim();
  if (raw) set.sourceText = raw;
  labHistory[patientId].push(set);
}

function isDuplicateLatestLabSet(patientId, resLabs, fecha, hora) {
  if (!patientId) return false;
  var list = labHistory[patientId] || [];
  if (!list.length) return false;
  var latest = list[list.length - 1];
  var incoming = {
    fecha: normalizeFechaLabHistory(fecha) || String(fecha || '').trim(),
    hora: normalizeHoraLabHistory(hora),
    resLabs: resLabs || []
  };
  var latestNormalized = {
    fecha: normalizeFechaLabHistory(latest && latest.fecha) || String((latest && latest.fecha) || '').trim(),
    hora: normalizeHoraLabHistory(latest && latest.hora),
    resLabs: (latest && latest.resLabs) || []
  };
  return isDuplicateAgainstLatest(latestNormalized, incoming);
}

/**
 * Alinea el paciente activo con el expediente del reporte pegado.
 * @see docs/superpowers/specs/2026-05-03-lab-auto-switch-active-patient-design.md
 * @returns {{ shouldAutoStore: boolean }}
 */
function applyLabPastePatientResolution(result) {
  if (!result || !result.patient) return { shouldAutoStore: true };
  var reg = String(result.patient.expediente || '').trim();
  if (!reg) return { shouldAutoStore: true };
  var match = findPatientByRegistro(reg);
  if (!match) {
    showToast(
      'Registro ' + reg + ' no está en la lista. No se guardó en el historial.',
      'error'
    );
    return { shouldAutoStore: false };
  }
  if (match.id !== activeId) {
    selectPatient(match.id);
    showToast('Paciente: ' + (match.nombre || 'Sin nombre') + ' · Exp ' + reg, 'success');
    addAuditEntry('lab-patient-auto-switch', 'ok', 1, reg);
  }
  return { shouldAutoStore: true };
}

function autoStoreProcessedLabResult(result) {
  if (!activeId) return;
  if (!result || !result.resLabs || !result.resLabs.length) return;
  var fecha = (result.patient && result.patient.fecha) ? result.patient.fecha : '';
  var hora = '';
  if (isDuplicateLatestLabSet(activeId, result.resLabs, fecha, hora)) {
    showToast('Resultado ya registrado en historial', 'success');
    return;
  }
  pushLabHistory(activeId, result.resLabs, fecha, hora, result.sourceText || '');
  saveState();
  renderLabHistoryPanel();
  refreshTendenciasOrCultivosPanel();
}

function insertLabsAsRecent(lines) {
  if (!notes[activeId]) notes[activeId] = {};
  pushLabHistory(activeId, activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '', activeLab.sourceText || '');
  rebuildEstudiosFromLabHistory(activeId);
  saveState();
  refreshTendenciasOrCultivosPanel();
  renderLabHistoryPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el) el.value = notes[activeId].estudios;
  onboardingAdvanceAfterSend();
  showToast('Labs enviados a la nota ✓', 'success');
  switchAppTab('nota');
}

function insertLabsAsAnteriorThenRecent(newLines) {
  if (!notes[activeId]) notes[activeId] = {};
  pushLabHistory(activeId, activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '', activeLab.sourceText || '');
  rebuildEstudiosFromLabHistory(activeId);
  saveState();
  refreshTendenciasOrCultivosPanel();
  renderLabHistoryPanel();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el) el.value = notes[activeId].estudios;
  onboardingAdvanceAfterSend();
  showToast('Fecha anterior guardada + nuevos labs agregados ✓', 'success');
  switchAppTab('nota');
}

function showLabConflictModal(newLines, existingDate) {
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'lab-conflict-backdrop';
  backdrop.innerHTML = (
    '<div class="lab-conflict-modal">' +
    '<h3>Los estudios ya tienen datos</h3>' +
    '<p>El bloque reciente ya tiene labs del <strong>' + esc(existingDate) + '</strong>. ¿Qué hago con los nuevos labs?</p>' +
    '<div class="lab-conflict-actions">' +
    '<button class="btn-conflict-primary" id="btn-conflict-move">📋 Mover anterior + agregar reciente<br><span style="font-size:11px;font-weight:400;opacity:0.8;">Los labs actuales pasan al bloque anterior y los nuevos quedan como recientes</span></button>' +
    '<button class="btn-conflict-secondary" id="btn-conflict-replace">🔄 Reemplazar fecha reciente<br><span style="font-size:11px;font-weight:400;opacity:0.7;">Los labs actuales se borran, se escriben los nuevos</span></button>' +
    '<button class="btn-conflict-cancel" id="btn-conflict-cancel">Cancelar</button>' +
    '</div></div>'
  );
  document.body.appendChild(backdrop);
  document.getElementById('btn-conflict-move').onclick = function() {
    document.body.removeChild(backdrop);
    insertLabsAsAnteriorThenRecent(newLines);
  };
  document.getElementById('btn-conflict-replace').onclick = function() {
    document.body.removeChild(backdrop);
    if (!notes[activeId]) notes[activeId] = {};
    pushLabHistory(activeId, activeLab.resLabs,
      activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '', activeLab.sourceText || '');
    rebuildEstudiosFromLabHistory(activeId);
    saveState();
    refreshTendenciasOrCultivosPanel();
    renderLabHistoryPanel();
    var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
    if (el) el.value = notes[activeId].estudios;
    onboardingAdvanceAfterSend();
    showToast('Fecha reciente reemplazada ✓', 'success');
    switchAppTab('nota');
  };
  document.getElementById('btn-conflict-cancel').onclick = function() {
    document.body.removeChild(backdrop);
  };
}

function procesarReporte() {
  var text = document.getElementById('lab-input').value.trim();
  if (!text) { showToast('Pega el texto del reporte primero','error'); return; }
  try {
    var result = procesarLabs(text);
    result.sourceText = text;
    var resStore = applyLabPastePatientResolution(result);
    renderOutput(result);
    renderDiagramas(result.resLabs);
    if (resStore.shouldAutoStore) autoStoreProcessedLabResult(result);
    if (!result.resLabs.length) showToast('No se encontraron resultados de laboratorio','error');
  } catch(e) { showToast('Error al procesar el reporte','error'); console.error(e); }
}

function renderOutput(result) {
  var patient = result.patient, resLabs = result.resLabs;
  activeLab = result;
  onboardingAdvanceAfterParse();
  var fechaBanner = '';
  if (patient.fecha) {
    fechaBanner = normalizeFechaLabHistory(patient.fecha) || String(patient.fecha).trim();
    if (fechaBanner === 'Anterior') fechaBanner = '';
  }
  if (patient.name) {
    document.getElementById('lab-patient-name').textContent = patient.name;
    document.getElementById('lab-patient-meta').textContent = [
      patient.expediente ? 'Exp: '+patient.expediente : '',
      patient.sexo, patient.edad || '', fechaBanner || patient.fecha
    ].filter(Boolean).join('  |  ');
    document.getElementById('lab-banner').style.display = 'block';
  }
  var box = document.getElementById('lab-output-box');
  box.innerHTML = '';
  if (fechaBanner) {
    var fechaTop = document.createElement('div');
    fechaTop.className = 'lab-output-fecha';
    fechaTop.textContent = fechaBanner;
    box.appendChild(fechaTop);
  }
  resLabs.forEach(function(text) {
    renderEntry(text).forEach(function(html, idx) {
      var div = document.createElement('div');
      div.className = idx===0 ? 'out-line' : 'out-indent';
      div.innerHTML = html; box.appendChild(div);
    });
  });
  document.getElementById('lab-output-section').style.display = 'block';
}

// ── Modal ─────────────────────────────────────────────────────────
function _prefillServicioForSala() {
  var srv = document.getElementById('m-servicio');
  if (srv && isModeSala(settings) && !srv.value) srv.value = getDefaultServicio(settings);
}

function _syncPatientModalModeFields() {
  var sala = isModeSala(settings);
  var areaGroup = document.getElementById('m-area-group');
  var servicioLabel = document.getElementById('m-servicio-label');
  var servicioInput = document.getElementById('m-servicio');
  if (areaGroup) areaGroup.style.display = sala ? 'none' : '';
  if (servicioLabel) servicioLabel.textContent = sala ? 'Área / Servicio *' : 'Servicio *';
  if (servicioInput) servicioInput.placeholder = sala ? 'ej. MEDICINA INTERNA' : 'ej. MEDICINA INTERNA';
}

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Nuevo Paciente';
  document.getElementById('modal-prefilled').style.display = 'none';
  document.getElementById('modal-manual-full').style.display = 'block';
  ['nombre-manual','registro-manual','area','servicio','cuarto','cama'].forEach(function(f){
    var el = document.getElementById('m-'+f); if(el) el.value='';
  });
  var edadNumManual = document.getElementById('m-edad-num-manual');
  var edadUnitManual = document.getElementById('m-edad-unit-manual');
  if (edadNumManual) edadNumManual.value = '';
  if (edadUnitManual) edadUnitManual.value = 'años';
  document.getElementById('m-sexo').value = 'F';
  _syncPatientModalModeFields();
  _prefillServicioForSala();
  document.getElementById('modal').classList.add('open');
  setTimeout(function(){ document.getElementById('m-nombre-manual').focus(); }, 120);
}

function openAddModalFromLab() {
  if (!activeLab) { openAddModal(); return; }
  var p = activeLab.patient;
  document.getElementById('modal-title').textContent = 'Agregar Paciente del Lab';
  document.getElementById('modal-prefilled').style.display = 'block';
  document.getElementById('modal-manual-full').style.display = 'none';
  document.getElementById('m-nombre').value   = p.name || '';
  document.getElementById('m-registro').value = p.expediente || '';
  var edadNum = document.getElementById('m-edad-num');
  var edadUnit = document.getElementById('m-edad-unit');
  if (edadNum) {
    var ageNum = parseInt(p.edad, 10);
    edadNum.value = isNaN(ageNum) ? '' : String(ageNum);
  }
  if (edadUnit) edadUnit.value = 'años';
  document.getElementById('m-sexo-ro').value = (p.sexo==='M') ? 'M' : 'F';
  ['area','servicio','cuarto','cama'].forEach(function(f){ document.getElementById('m-'+f).value=''; });
  _syncPatientModalModeFields();
  _prefillServicioForSala();
  document.getElementById('modal').classList.add('open');
  setTimeout(function(){
    var first = document.getElementById('m-edad-num');
    if (first) first.focus();
  }, 120);
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target !== document.getElementById('modal')) return;
  var hasData = ['m-area','m-servicio','m-cuarto','m-cama'].some(function(id){ return document.getElementById(id).value.trim(); });
  if (hasData && !confirm('¿Cerrar sin guardar?')) return;
  closeModal();
});

(function() {
  var pm = document.getElementById('profile-modal');
  if (!pm) return;
  pm.addEventListener('click', function(e) {
    if (e.target === pm) closeProfileModal();
  });
})();

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var rn = document.getElementById('release-notes-backdrop');
    if (rn && rn.classList.contains('open')) {
      closeReleaseNotes();
      return;
    }
    var hq = document.getElementById('help-quick-backdrop');
    if (hq && hq.classList.contains('open')) {
      closeQuickHelp();
      return;
    }
  }
  if (e.key === 'Escape' && document.getElementById('modal').classList.contains('open')) closeModal();
  if (e.key === 'Escape') {
    var pm = document.getElementById('profile-modal');
    if (pm && pm.classList.contains('open')) { closeProfileModal(); return; }
  }
  var mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
    e.preventDefault();
    if (e.key === '1') switchAppTab('lab');
    if (e.key === '2') switchAppTab('nota');
    if (e.key === '3') openProfileModal();
    if (e.key === '4') {
      var dd = document.getElementById('settings-dropdown');
      if (dd && !dd.classList.contains('open')) toggleSettingsDropdown();
    }
  }
});

document.getElementById('modal').addEventListener('keydown', function(e) {
  if (e.key==='Enter' && e.target.tagName!=='TEXTAREA' && e.target.tagName!=='SELECT') savePatient();
});

function normalizeName(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicatePatient(nombre, registro) {
  var nombreNorm = normalizeName(nombre);
  return patients.find(function(p) {
    if (p.isDemo) return false;
    if (registro && p.registro && registro === p.registro) return true;
    return normalizeName(p.nombre) === nombreNorm;
  });
}

function showDuplicateWarning(existing, onConfirm) {
  var fecha = notes[existing.id] ? notes[existing.id].fecha : '';
  var body = '<strong>' + esc(existing.nombre) + '</strong>';
  body += '<br>Cto. ' + esc(existing.cuarto || '—') + ' Cama ' + esc(existing.cama || '—');
  if (existing.registro) body += '<br>Registro: ' + esc(existing.registro);
  if (fecha) body += '<br>Ingreso: ' + esc(fecha);
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'dup-confirm-backdrop';
  backdrop.innerHTML =
    '<div class="lab-conflict-modal">' +
    '<h3>Paciente similar encontrado</h3>' +
    '<p>' + body + '</p>' +
    '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
    '<button onclick="document.getElementById(\'dup-confirm-backdrop\').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:#1f2937;">Cancelar</button>' +
    '<button id="dup-confirm-btn" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Agregar de todas formas</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  document.getElementById('dup-confirm-btn').onclick = function() {
    document.getElementById('dup-confirm-backdrop').remove();
    onConfirm();
  };
}

function savePatient() {
  var isFromLab = document.getElementById('modal-prefilled').style.display !== 'none';
  var nombre, registro, edadNum, edadUnit, sexo;
  if (isFromLab) {
    nombre   = (document.getElementById('m-nombre').value||'').trim().toUpperCase();
    registro = (document.getElementById('m-registro').value||'').trim();
    edadNum  = (document.getElementById('m-edad-num').value||'').trim();
    edadUnit = document.getElementById('m-edad-unit').value || 'años';
    sexo     = document.getElementById('m-sexo-ro').value || 'F';
  } else {
    nombre   = (document.getElementById('m-nombre-manual').value||'').trim().toUpperCase();
    registro = (document.getElementById('m-registro-manual').value||'').trim();
    edadNum  = (document.getElementById('m-edad-num-manual').value||'').trim();
    edadUnit = document.getElementById('m-edad-unit-manual').value || 'años';
    sexo     = document.getElementById('m-sexo').value;
  }

  // Validación pura y reutilizable.
  var v = validatePatientForSave({ nombre: nombre, registro: registro, edadNum: edadNum, edadUnit: edadUnit });
  if (!v.ok) { showToast(v.error, 'error'); return; }

  if (!edadNum) { showToast('Ingresa la edad', 'error'); return; }
  var ageInt = parseInt(edadNum, 10);
  if (isNaN(ageInt) || ageInt < 0 || ageInt > 120) {
    showToast('Edad inválida', 'error'); return;
  }
  var edad = String(ageInt) + (edadUnit && edadUnit !== 'años' ? ' ' + edadUnit : '');
  var salaMode = isModeSala(settings);
  var servicio = (document.getElementById('m-servicio').value||'').trim().toUpperCase();
  var area     = salaMode ? servicio : (document.getElementById('m-area').value||'').trim().toUpperCase();
  var cuarto   = (document.getElementById('m-cuarto').value||'').trim();
  var cama     = (document.getElementById('m-cama').value||'').trim();
  if (!servicio) { showToast(salaMode ? 'Ingresa Área / Servicio' : 'Ingresa servicio','error'); return; }
  if (!salaMode && !area) { showToast('Ingresa área / departamento','error'); return; }
  if (!cuarto || !cama) { showToast('Ingresa cuarto y cama','error'); return; }

  var commit = function () {
    var dup = findDuplicatePatient(nombre, registro);
    if (dup) {
      showDuplicateWarning(dup, function () {
        commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
      });
      return;
    }
    commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
  };

  // Si el usuario está intentando guardar sin expediente, le mostramos
  // el "atajo de paste" antes de continuar. La idea: enseñar el flujo
  // recomendado (Laboratorio → pegar desde "Expediente:") sin bloquear
  // el alta manual cuando realmente lo necesite.
  if (v.warning === 'missing_expediente' && !isFromLab) {
    showExpedienteAdvice(commit);
    return;
  }
  commit();
}

// Modal de confirmación que enseña a copiar desde "Expediente:" para
// alta automática y permite continuar sin expediente si el usuario lo
// decide.
function showExpedienteAdvice(onConfirm) {
  var prev = document.getElementById('exp-advice-backdrop');
  if (prev) prev.remove();
  var advice = buildExpedienteAdvice();
  var b = document.createElement('div');
  b.className = 'lab-conflict-backdrop';
  b.id = 'exp-advice-backdrop';
  b.innerHTML =
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="exp-advice-title">' +
      '<h3 id="exp-advice-title">' + escTxtSafe(advice.title) + '</h3>' +
      '<p>' + escTxtSafe(advice.body) + '</p>' +
      '<div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">' +
        '<button type="button" class="btn-cancel" id="exp-advice-cancel">' + escTxtSafe(advice.cancelLabel) + '</button>' +
        '<button type="button" class="btn-conflict-primary" id="exp-advice-confirm">' + escTxtSafe(advice.confirmLabel) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(b);
  var close = function () { var x = document.getElementById('exp-advice-backdrop'); if (x) x.remove(); };
  document.getElementById('exp-advice-cancel').onclick = function () {
    close();
    var input = document.getElementById('m-registro-manual') || document.getElementById('m-registro');
    if (input) { try { input.focus(); } catch (e) {} }
  };
  document.getElementById('exp-advice-confirm').onclick = function () { close(); onConfirm(); };
}

function escTxtSafe(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab) {
  var today = new Date();
  var fecha = String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
  var hora  = String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  var patient = { id:Date.now().toString(36)+Math.random().toString(36).slice(2), nombre:nombre, registro:registro, edad:edad, sexo:sexo, area:area, servicio:servicio, cuarto:cuarto, cama:cama, fromLab:isFromLab };
  notes[patient.id] = { fecha:fecha, hora:hora, interrogatorio:'', evolucion:'', estudios:'', diagnosticos:[''], tratamiento:[''], ta:'', fr:'', fc:'', temp:'', peso:'', medico:'', profesor:'' };
  indicaciones[patient.id] = { fecha:fecha, hora:hora, medicos:'', dieta:'', cuidados:'', estudios:'', medicamentos:'', interconsultas:'', otros:[] };
  applyDefaultsToNewPatient(patient.id);
  applyDefaultsToNewIndicaciones(patient.id);
  patients.push(patient);
  saveState(); closeModal();
  var pendingLab = null;
  if (isFromLab) {
    pendingLab = activeLab;
    activeLab = null;
    document.getElementById('lab-banner').style.display = 'none';
    document.getElementById('lab-output-section').style.display = 'none';
    document.getElementById('lab-output-box').innerHTML = '';
    document.getElementById('lab-input').value = '';
    switchAppTab('nota');
  }
  renderPatientList(); selectPatient(patient.id); showToast('Paciente agregado','success');
  if (pendingLab) {
    activeLab = pendingLab;
    enviarLabsANota();
    activeLab = null;
  }
}

// ── Note Form ─────────────────────────────────────────────────────
function buildPatientDemographicsCardHtml(patient) {
  return (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:flex;flex-direction:column;gap:10px;">' +
    '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" oninput="updatePatient(\'nombre\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 100px 60px;gap:10px;">' +
    '<div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" oninput="updatePatient(\'registro\',this.value)"></div>' +
    '<div class="field-group"><label>Edad</label><input type="text" value="' + esc(patient.edad) + '" oninput="updatePatient(\'edad\',this.value)"></div>' +
    '<div class="field-group"><label>Sexo</label><select onchange="updatePatient(\'sexo\',this.value)"><option value="M"' + (patient.sexo==='M'?' selected':'') + '>M</option><option value="F"' + (patient.sexo==='F'?' selected':'') + '>F</option></select></div></div>' +
    '<div class="field-group"><label>Área</label><input type="text" value="' + esc(patient.area) + '" oninput="updatePatient(\'area\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div class="field-group"><label>Servicio</label><input type="text" value="' + esc(patient.servicio) + '" oninput="updatePatient(\'servicio\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
    '<div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" oninput="updatePatient(\'cuarto\',this.value)"></div>' +
    '<div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" oninput="updatePatient(\'cama\',this.value)"></div></div>' +
    '</div></div></div>'
  );
}

/** En modo Sala la pestaña Nota está oculta: los mismos campos van en #patient-data-form. */
function renderPatientDataPane() {
  var wrap = document.getElementById('patient-data-form');
  if (!wrap) return;
  if (!isModeSala(settings)) {
    wrap.innerHTML = '';
    return;
  }
  var patient = patients.find(function (p) { return p.id === activeId; });
  if (!patient) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = buildPatientDemographicsCardHtml(patient);
}

function renderNoteForm() {
  var patient = patients.find(function(p){ return p.id===activeId; });
  if (!patient) return;
  if (activeId) {
    if (!notes[activeId]) notes[activeId] = {};
    if (applyProfileToNoteIfEmpty(notes[activeId])) saveState();
  }
  var note = notes[activeId] || {};
  var salaMode = isModeSala(settings);
  var demoCard = salaMode ? '' : buildPatientDemographicsCardHtml(patient);
  document.getElementById('note-form').innerHTML = (
    demoCard +

    '<div class="card"><div class="card-header" style="background:#374151;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group"><label>Fecha</label><input type="text" value="' + esc(note.fecha) + '" oninput="updateNote(\'fecha\',this.value)" placeholder="DD/MM/AAAA"></div>' +
    '<div class="field-group"><label>Hora</label><input type="text" value="' + esc(note.hora) + '" oninput="updateNote(\'hora\',this.value)" placeholder="HH:MM"></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Resumen de Interrogatorio, Exploración Física y Estado Mental</div><div class="card-body"><div class="field-group"><textarea rows="5" placeholder="Ingresa el resumen de interrogatorio, exploración física y estado mental..." oninput="updateNote(\'interrogatorio\',this.value)">' + esc(note.interrogatorio) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#065f46;display:flex;align-items:center;justify-content:space-between;"><span style="display:flex;align-items:center;gap:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Evolución y Actualización del Cuadro Clínico</span><button type="button" id="btn-soap-template" onclick="openSOAPModal()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:white;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.25)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.15)\'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>Plantilla SOAP</button></div><div class="card-body"><div class="field-group"><textarea rows="7" placeholder="N: [Neurológico]&#10;V: [Ventilatorio]&#10;HD: [Hemodinámico]&#10;HI: [Infeccioso]&#10;NM: [Nutricional/Metabólico]" oninput="updateNote(\'evolucion\',this.value)">' + esc(note.evolucion) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#3730a3;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>Resultados de Estudios Auxiliares</div><div class="card-body"><div class="field-group"><textarea rows="9" placeholder="Una línea por renglón del documento:&#10;FECHA (ej. 09.04.26)&#10;QS Glu Cr BUN..." oninput="updateNote(\'estudios\',this.value)">' + esc(note.estudios) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#881337;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>Diagnóstico(s)</div><div class="card-body">' +
    '<div class="list-rows" id="dx-list">' +
    (note.diagnosticos||['']).map(function(dx,i){ return '<div class="list-row"><input type="text" value="' + esc(dx) + '" placeholder="Diagnóstico ' + (i+1) + '" oninput="updateDx(' + i + ',this.value)" style="text-transform:uppercase;"><button class="btn-remove" onclick="removeDx(' + i + ')"' + ((note.diagnosticos||['']).length<=1?' style="visibility:hidden"':'') + ' aria-label="Eliminar">×</button></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addDx()">+ Agregar diagnóstico</button></div></div>' +

    '<div class="card"><div class="card-header" style="background:#78350f;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Signos Vitales</div><div class="card-body"><div class="vitals-grid">' +
    '<div class="vital-box"><div class="vital-label">T.A.</div><input type="text" value="' + esc(note.ta) + '" placeholder="120/80" oninput="updateNote(\'ta\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">F.R.</div><input type="text" value="' + esc(note.fr) + '" placeholder="16" oninput="updateNote(\'fr\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">F.C.</div><input type="text" value="' + esc(note.fc) + '" placeholder="72" oninput="updateNote(\'fc\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">Temperatura</div><input type="text" value="' + esc(note.temp) + '" placeholder="36.6" oninput="updateNote(\'temp\',this.value)"></div>' +
    '<div class="vital-box"><div class="vital-label">Peso (kg)</div><input type="text" value="' + esc(note.peso) + '" placeholder="70.0" oninput="updateNote(\'peso\',this.value)"></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#134e4a;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>Tratamiento e Indicaciones Médicas</div><div class="card-body">' +
    '<div class="list-rows" id="tx-list">' +
    (note.tratamiento||['']).map(function(tx,i){ return '<div class="list-row"><span class="list-num">' + (i+1) + '.</span><input type="text" value="' + esc(tx) + '" placeholder="Indicación, dosis, vía y periodicidad" oninput="updateTx(' + i + ',this.value)"><button class="btn-remove" onclick="removeTx(' + i + ')"' + ((note.tratamiento||['']).length<=1?' style="visibility:hidden"':'') + ' aria-label="Eliminar">×</button></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addTx()">+ Agregar indicación</button></div></div>' +

    '<div class="card"><div class="card-header" style="background:#4a1d96;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Médico y Profesor</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group"><label>Médico Tratante</label><input type="text" value="' + esc(note.medico) + '" placeholder="Nombre completo" oninput="updateNote(\'medico\',this.value)"></div>' +
    '<div class="field-group"><label>Profesor Responsable</label><input type="text" value="' + esc(note.profesor) + '" placeholder="Nombre completo" oninput="updateNote(\'profesor\',this.value)"></div>' +
    '</div></div></div>' +

    '<div class="action-bar"><button class="btn-generate" onclick="quickExportCurrentPatient()" id="btn-quick-export-note" style="background:#475569;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida rápida</button><button class="btn-generate" onclick="generateWord()" id="btn-gen"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Nota (.docx)</button></div>'
  );
  renderPatientDataPane();
  syncOfflineButtonStates();
}

function updatePatient(field, value) {
  var p = patients.find(function(p){ return p.id===activeId; });
  if (p) { p[field] = (field==='nombre'||field==='area'||field==='servicio') ? value.toUpperCase() : value; saveState(); renderPatientList(); }
}
function updateNote(field, value) { if (!notes[activeId]) notes[activeId]={}; notes[activeId][field]=value; saveState(); }
function updateDx(i, val) { if (!notes[activeId]) return; notes[activeId].diagnosticos[i]=val.toUpperCase(); saveState(); }
function addDx() { if (!notes[activeId]) return; notes[activeId].diagnosticos.push(''); saveState(); renderNoteForm(); }
function removeDx(i) { if (!notes[activeId]||notes[activeId].diagnosticos.length<=1) return; notes[activeId].diagnosticos.splice(i,1); saveState(); renderNoteForm(); }
function updateTx(i, val) { if (!notes[activeId]) return; notes[activeId].tratamiento[i]=val; saveState(); }
function addTx() { if (!notes[activeId]) return; notes[activeId].tratamiento.push(''); saveState(); renderNoteForm(); }
function removeTx(i) { if (!notes[activeId]||notes[activeId].tratamiento.length<=1) return; notes[activeId].tratamiento.splice(i,1); saveState(); renderNoteForm(); }

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

function generateWord() {
  if (isRpcOffline()) {
    showToast('Sin conexión con el servidor local. Reinicia R+ para generar documentos.', 'error');
    return;
  }
  var patient = patients.find(function(p){ return p.id===activeId; }); if (!patient) return;
  var note = notes[activeId]; if (!note) return;
  var btn = document.getElementById('btn-gen'); if (btn) { btn.classList.add('loading'); btn.disabled=true; }
  incrementPendingJobs();
  function buildPayload(outputDir) {
    return { patient: patient, note: note, outputDir: outputDir || '' };
  }
  requestDocumentJson('/generate', buildPayload(settings.outputDir || ''))
  .then(function(d){
    return handleDocumentGenerateResponse({
      response: d,
      url: '/generate',
      buildPayload: buildPayload,
      onSuccess: function(data) {
        showToast('Nota guardada: '+data.fileName,'success');
        guidedTourAdvanceAfterNotaGenerated();
      },
    });
  })
  .catch(function(){ showToast('Error de conexión','error'); })
  .finally(function(){
    if (btn) { btn.classList.remove('loading'); btn.disabled=false; }
    decrementPendingJobs();
    syncOfflineButtonStates();
  });
}

// ── Indicaciones Form ─────────────────────────────────────────────
function renderIndicaForm() {
  var patient = patients.find(function(p){ return p.id===activeId; }); if (!patient) return;
  if (!indicaciones[activeId]) {
    var today = new Date();
    indicaciones[activeId] = { fecha:String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear(), hora:String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0'), medicos:'',dieta:'',cuidados:'',estudios:'',medicamentos:'',interconsultas:'',otros:[] };
  }
  var ind = indicaciones[activeId];
  var SECTIONS = [
    {key:'dieta',label:'Dieta',placeholder:'DIETA NORMAL DIABÉTICA ALTA EN FIBRA...'},
    {key:'cuidados',label:'Cuidados',placeholder:'COLOCAR SONDA FOLEY.\nCUANTIFICACIÓN ESTRICTA DE INGRESOS Y EGRESOS...'},
    {key:'estudios',label:'Estudios',placeholder:'BH, QS, EGO...'},
    {key:'medicamentos',label:'Medicamentos',placeholder:'PARACETAMOL 1G VO CADA 8 HORAS PRN...'},
    {key:'interconsultas',label:'Interconsultas',placeholder:'CONTINUAR INDICACIONES DE INFECTOLOGÍA...'},
  ];
  document.getElementById('indica-form').innerHTML = (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:10px;align-items:end;">' +
    '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" class="field-readonly" readonly></div>' +
    '<div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" class="field-readonly" readonly></div>' +
    '<div class="field-group"><label>Edad/Sexo</label><input type="text" value="' + esc(patient.edad)+' / '+esc(patient.sexo) + '" class="field-readonly" readonly></div>' +
    '<div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" class="field-readonly" readonly></div>' +
    '<div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" class="field-readonly" readonly></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#374151;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha, Hora y Médicos</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px;">' +
    '<div class="field-group"><label>Fecha</label><input type="text" value="' + esc(ind.fecha) + '" placeholder="DD/MM/AAAA" oninput="updateIndica(\'fecha\',this.value)"></div>' +
    '<div class="field-group"><label>Hora</label><input type="text" value="' + esc(ind.hora) + '" placeholder="HH:MM" oninput="updateIndica(\'hora\',this.value)"></div>' +
    '<div class="field-group"><label>Médicos (uno por línea)</label><textarea rows="3" placeholder="R3 NOMBRE APELLIDO" oninput="updateIndica(\'medicos\',this.value)">' + esc(ind.medicos) + '</textarea></div>' +
    '</div></div></div>' +

    buildExtraTemplatesSelectorHtml() +

    SECTIONS.map(function(s){ return '<div class="indica-section"><div class="indica-section-header">'+s.label+'</div><div class="indica-section-body"><textarea rows="3" placeholder="'+s.placeholder+'" oninput="updateIndica(\''+s.key+'\',this.value)">'+esc(ind[s.key])+'</textarea></div></div>'; }).join('') +

    '<div class="card"><div class="card-header" style="background:#4a1d96;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>Otros</div><div class="card-body" style="display:flex;flex-direction:column;gap:10px;"><div id="otros-list">' +
    (ind.otros||[]).map(function(o,i){ return '<div class="otros-item"><button class="btn-remove-otro" onclick="removeOtro('+i+')">×</button><input type="text" placeholder="TÍTULO DE LA SECCIÓN" value="'+esc(o.titulo)+'" oninput="updateOtro('+i+',\'titulo\',this.value)"><textarea rows="2" placeholder="Indicaciones..." oninput="updateOtro('+i+',\'contenido\',this.value)">'+esc(o.contenido)+'</textarea></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addOtro()">+ Agregar sección</button></div></div>' +

    '<div class="action-bar"><button class="btn-generate" onclick="quickExportCurrentPatient()" id="btn-quick-export-indica" style="background:#475569;"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida rápida</button><button class="btn-generate" onclick="generateIndicaciones()" id="btn-gen-ind"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Indicaciones (.docx)</button></div>'
  );
  syncOfflineButtonStates();
}

function updateIndica(field, value) { if (!indicaciones[activeId]) return; indicaciones[activeId][field]=value; saveState(); }

function updateOtro(i, field, value) { if (!indicaciones[activeId]) return; indicaciones[activeId].otros[i][field]=value; saveState(); }

function addOtro() {
  if (!indicaciones[activeId]) return;
  indicaciones[activeId].otros = indicaciones[activeId].otros || [];
  indicaciones[activeId].otros.push({ titulo:'', contenido:'' });
  saveState();
  renderIndicaForm();
}

function removeOtro(i) {
  if (!indicaciones[activeId]) return;
  indicaciones[activeId].otros.splice(i, 1);
  saveState();
  renderIndicaForm();
}

// ── Diagrams (ported from Laboratoriazo) ─────────────────────────
function parsearSecciones(resLabs){
  var secs={};
  resLabs.forEach(function(linea){
    var primera=linea.split('\n')[0].trim().replace('\t',' ');
    var tokens=primera.split(' ');
    var key=tokens[0].replace(':','');
    var vals={};
    var i=1;
    while(i<tokens.length){
      var tok=tokens[i];
      if(!tok||tok==='-'){i++;continue;}
      var next=tokens[i+1];
      if(next!==undefined && !isNaN(parseFloat(next.replace('*','')))){
        vals[tok]={val:next.replace('*',''), ab:next.endsWith('*')};
        i+=2;
      } else { i++; }
    }
    secs[key]=vals;
  });
  return secs;
}

function extractParsedValues(resLabs) {
  var secs = parsearSecciones(resLabs);
  function num(sec, key) {
    var v = g(secs, sec, key);
    return v ? parseFloat(v.val) : null;
  }
  return {
    Hb:  num('BH','Hb'),   Hto: num('BH','Hto'),
    Leu: num('BH','Leu'),  Plt: num('BH','Plt'),
    Glu: num('QS','Glu'),  Cr:  num('QS','Cr'),
    BUN: num('QS','BUN'),  PCR: num('QS','PCR'),
    AU:  num('QS','AU'),   TGL: num('QS','TGL'),  COL: num('QS','COL'),
    Na:  num('ESC','Na'),  K:   num('ESC','K'),
    Cl:  num('ESC','Cl'),  HCO3:num('ESC','HCO3'), Ca: num('ESC','Ca'),
    AST: num('PFHs','AST'),ALT: num('PFHs','ALT'),
    FA:  num('PFHs','FA'), BT:  num('PFHs','BT')
  };
}

/** Mapa sectionKey → fieldKey → número (tendencias por estudio). */
function buildParsedBySectionFromResLabs(resLabs) {
  var secs = parsearSecciones(resLabs || []);
  var out = {};
  Object.keys(secs).forEach(function (sec) {
    if (!tendEligibleSectionKey(sec)) return;
    var row = {};
    var tbl = secs[sec];
    Object.keys(tbl).forEach(function (k) {
      var cell = tbl[k];
      if (!cell || cell.val == null || cell.val === '---') return;
      var n = parseFloat(String(cell.val).replace(/\*/g, '').replace(',', '.'));
      if (!isFinite(n)) return;
      row[k] = n;
    });
    if (Object.keys(row).length) out[sec] = row;
  });
  return out;
}

function ensureParsedLabHistory(patientId) {
  var history = labHistory[patientId] || [];
  var changed = false;
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
      var pbNext = buildParsedBySectionFromResLabs(set.resLabs);
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
    if ((!set.fecha || !String(set.fecha).trim()) && set.fecha !== 'Anterior') {
      var inferred = inferFechaLabSetFromId(set);
      if (inferred) {
        set.fecha = inferred;
        changed = true;
      }
    }
  });
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

/** HTML de la barra de rango (modal de tendencia); vacío si no hay ref válido. */
function tendRefVbarMarkup(ref, latest, delayMs, extraClass) {
  extraClass = extraClass || '';
  if (!ref || !isFinite(ref[0]) || !isFinite(ref[1]) || ref[1] <= ref[0] || !isFinite(latest)) return '';
  var low = Number(ref[0]);
  var high = Number(ref[1]);
  var isAb = latest < low || latest > high;
  var span = high - low;
  var fullMin = low - span * 0.5;
  var fullMax = high + span * 0.5;
  if (fullMax <= fullMin) {
    fullMin = low;
    fullMax = high;
  }
  var range = fullMax - fullMin;
  var pos = ((Number(latest) - fullMin) / range) * 100;
  if (pos < 0) pos = 0;
  if (pos > 100) pos = 100;
  var normBottom = ((low - fullMin) / range) * 100;
  var normTop = ((high - fullMin) / range) * 100;
  if (normBottom < 0) normBottom = 0;
  if (normTop > 100) normTop = 100;
  var normH = normTop - normBottom;
  var stateClass = isAb ? ' is-abnormal' : ' is-normal';
  var d = delayMs != null ? delayMs : 0;
  return (
    '<div class="tend-range-vbar' +
    extraClass +
    stateClass +
    '" style="--tend-vbar-delay:' +
    d +
    'ms" title="Rango normal (' +
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

function renderTendencias() {
  var container = document.getElementById('tendencias-container');
  if (!container) return;
  Object.keys(sparkCharts).forEach(function (k) {
    if (sparkCharts[k]) {
      sparkCharts[k].destroy();
      delete sparkCharts[k];
    }
  });
  if (!activeId) {
    container.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  var history = sortLabHistoryChronological(ensureParsedLabHistory(activeId));
  if (history.length < 2) {
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
    var hb = buildTendHiddenBarHtml();
    if (hiddenAll) {
      container.innerHTML =
        hb +
        '<p class="tend-empty">Los analitos con datos están <strong>ocultos</strong>. Pulsa el ojo en la barra o <strong>Mostrar todos</strong>.</p>';
    } else {
      container.innerHTML =
        hb +
        '<p class="tend-empty">No hay parámetros con suficientes datos para graficar.</p>';
    }
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
  htmlParts.push(buildTendHiddenBarHtml());
  var eyeBtnSvg = tendEyeVisibilitySvg();
  for (var si = 0; si < sectionsOrdered.length; si++) {
    var sectionKey = sectionsOrdered[si];
    var expanded = tendSectionIsExpanded(sectionKey);
    var secLabel = TEND_SECTION_LABELS[sectionKey] || sectionKey;
    var list = bySection[sectionKey];
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
      var latest = setsDesc.length ? getSetTrendValueForSeries(setsDesc[0], sectionKey, fk) : null;
      var ref = tendRefForSeries(sectionKey, fk);
      var isAb = ref && latest != null && (latest < ref[0] || latest > ref[1]);
      var domId = trendSparkDomId(sectionKey, fk);
      var disp = tendFindSeriesSpec(sectionKey, fk).cardTitle || fk;
      var titleEsc = esc(disp);
      cardParts.push(
        '<div class="tend-card" role="button" tabindex="0" onclick="openTendDetail(\'' +
          safeAttrJsString(sectionKey) +
          "','" +
          safeAttrJsString(fk) +
          '\')">' +
          '<button type="button" class="tend-card-eye" title="Ocultar este analito" aria-label="Ocultar de tendencias" onclick="tendHideSeriesFromCard(event,\'' +
          safeAttrJsString(sectionKey) +
          "','" +
          safeAttrJsString(fk) +
          '\')">' +
          eyeBtnSvg +
          '</button>' +
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
          '<div class="tend-unit">' +
          esc(tendUnitForSeries(sectionKey, fk)) +
          '</div>' +
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
        '</span>' +
        '<span class="tend-section-count">' +
        list.length +
        '</span>' +
        '</button>' +
        '<div class="tend-section-body' +
        (expanded ? '' : ' tend-section-body--collapsed') +
        '">' +
        '<div class="tend-grid">' +
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
    sparkCharts[ck] = new Chart(canvas2, {
      type: 'line',
      data: {
        labels: labels2,
        datasets: [
          {
            data: values2,
            borderColor: '#10b981',
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: '#10b981',
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
  var spec = tendFindSeriesSpec(sectionKey, fieldKey);
  var title = spec && spec.cardTitle ? spec.cardTitle : String(fieldKey);
  var unit = tendUnitForSeries(sectionKey, fieldKey);
  var latest = setsDesc.length ? getSetTrendValueForSeries(setsDesc[0], sectionKey, fieldKey) : null;
  var ref = tendRefForSeries(sectionKey, fieldKey);
  document.getElementById('tend-detail-title').textContent = title + (unit ? ' (' + unit + ')' : '');
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (vbarSlot) {
    vbarSlot.innerHTML = tendRefVbarMarkup(ref, latest, 0, ' tend-detail-vbar');
    tendFinishRangeVbars(vbarSlot);
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
}

function closeTendDetail() {
  document.getElementById('tend-detail-backdrop').style.display = 'none';
  var vbarSlot = document.getElementById('tend-detail-vbar-slot');
  if (vbarSlot) vbarSlot.innerHTML = '';
  if (detailChart) { detailChart.destroy(); detailChart = null; }
}

function g(secs,sec,key){
  var s=secs[sec]; if(!s)return null;
  var v=s[key]; if(!v||v.val==='---')return null;
  return v;
}

var LINE='stroke="var(--diagram-line)" stroke-width="1.5"';

/** Etiqueta + valor centrados en (x, cy); anchor = start|middle|end */
function spBlock(x, cy, lbl, obj, anchor) {
  anchor = anchor || 'middle';
  var ax = anchor === 'start' ? 'start' : (anchor === 'end' ? 'end' : 'middle');
  var isAb = obj && obj.ab;
  var vc = isAb ? 'var(--error)' : 'var(--diagram-value)';
  var vt = obj ? escTxt(obj.val) : '—';
  var dec = isAb ? ' text-decoration="underline"' : '';
  return (
    '<g transform="translate('+x+','+cy+')">' +
    '<text x="0" y="-9" text-anchor="'+ax+'" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' +
    lbl + '</text>' +
    '<text x="0" y="10" text-anchor="'+ax+'" dominant-baseline="middle" font-size="13" fill="'+vc+'" font-weight="bold" font-family="Arial,sans-serif"'+dec+'>'+vt+'</text>' +
    '</g>'
  );
}

function svgBH(secs){
  var hb =g(secs,'BH','Hb'),  hto=g(secs,'BH','Hto');
  var leu=g(secs,'BH','Leu'), neu=g(secs,'BH','Neu');
  var plt=g(secs,'BH','Plt');
  if(!hb)return null;
  return '<svg viewBox="0 0 300 192" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">'
    +'<line x1="50"  y1="18"  x2="250" y2="182" '+LINE+'/>'
    +'<line x1="250" y1="18"  x2="50"  y2="182" '+LINE+'/>'
    +spBlock(150, 46, 'HB',   hb,  'middle')
    +spBlock(150, 155, 'HCTO', hto, 'middle')
    +spBlock(212, 100, 'PLT',  plt, 'start')
    +spBlock(76, 62, 'LEU',  leu, 'end')
    +'<line x1="26" y1="87" x2="86" y2="87" '+LINE+'/>'
    +spBlock(76, 112, 'NEU',  neu, 'end')
    +'</svg>';
}

function svgGamble(secs){
  var na  =g(secs,'ESC','Na'),  k   =g(secs,'ESC','K');
  var cl  =g(secs,'ESC','Cl'),  hco3=g(secs,'GASES','Bica')||g(secs,'ESC','HCO3');
  var f   =g(secs,'ESC','F'),   ca  =g(secs,'ESC','Ca');
  var bun =g(secs,'QS','BUN'),  cr  =g(secs,'QS','Cr');
  var glu =g(secs,'QS','Glu'),  mg  =g(secs,'ESC','Mg');
  if(!na&&!k&&!cl&&!bun&&!cr&&!glu)return null;

  var sy=65, dT=12, dB=118;
  var d1=104, d2=192, d3=280, forkX=365;
  var c1=61, c2=148, c3=236, c4=323;

  function cell(x, lbl, obj, isTop){
    var cy = isTop ? 40 : 92;
    var vc = obj&&obj.ab ? 'var(--error)' : 'var(--diagram-value)';
    var vt = obj ? escTxt(obj.val) : '—';
    var dec = obj&&obj.ab ? ' text-decoration="underline"' : '';
    return (
      '<g transform="translate('+x+','+cy+')">' +
      '<text x="0" y="-10" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' +
      lbl + '</text>' +
      '<text x="0" y="11" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="'+vc+'" font-weight="bold" font-family="Arial,sans-serif"'+dec+'>'+vt+'</text>' +
      '</g>'
    );
  }

  return '<svg viewBox="0 0 470 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">'
    +'<line x1="18"    y1="'+sy+'" x2="'+forkX+'" y2="'+sy+'" '+LINE+'/>'
    +'<line x1="'+d1+'" y1="'+dT+'" x2="'+d1+'" y2="'+dB+'" '+LINE+'/>'
    +'<line x1="'+d2+'" y1="'+dT+'" x2="'+d2+'" y2="'+dB+'" '+LINE+'/>'
    +'<line x1="'+d3+'" y1="'+dT+'" x2="'+d3+'" y2="'+dB+'" '+LINE+'/>'
    +'<line x1="'+forkX+'" y1="'+sy+'" x2="448" y2="18"  '+LINE+'/>'
    +'<line x1="'+forkX+'" y1="'+sy+'" x2="448" y2="112" '+LINE+'/>'
    +cell(c1,'Na', na, true)+cell(c2,'Cl',  cl,   true)
    +cell(c3,'P',  f,  true)+cell(c4,'BUN', bun,  true)
    +cell(c1,'K',    k,    false)+cell(c2,'HCO3', hco3, false)
    +cell(c3,'Ca',   ca,   false)+cell(c4,'Cr',   cr,   false)
    +spBlock(418, 65, 'Glu', glu, 'middle')
    +'</svg>';
}

function svgPFH(secs){
  var ca  = g(secs,'ESC','Ca');
  var ast = g(secs,'PFHs','AST');
  var ldh = g(secs,'PFHs','LDH');
  var pcr = g(secs,'QS','PCR');
  var alt = g(secs,'PFHs','ALT');
  var alb = g(secs,'PFHs','Alb');
  var fa  = g(secs,'PFHs','FA');
  var bt  = g(secs,'PFHs','BT');
  var bd  = g(secs,'PFHs','BD');
  var bi  = g(secs,'PFHs','BI');
  if(!ast&&!alt&&!fa&&!bt&&!alb)return null;

  var cx=135, lx=67, rx=202;

  function gcell(x, lbl, obj, y_lbl){
    var cy = y_lbl + 7.5;
    var vc = obj&&obj.ab ? 'var(--error)' : 'var(--diagram-value)';
    var vt = obj ? escTxt(obj.val) : '—';
    var dec = obj&&obj.ab ? ' text-decoration="underline"' : '';
    return (
      '<g transform="translate('+x+','+cy+')">' +
      '<text x="0" y="-10" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' +
      lbl + '</text>' +
      '<text x="0" y="11" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="'+vc+'" font-weight="bold" font-family="Arial,sans-serif"'+dec+'>'+vt+'</text>' +
      '</g>'
    );
  }

  var midLeft = pcr || ldh;
  var midLbl  = pcr ? 'Prot' : 'LDH';

  return '<svg viewBox="0 0 270 230" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">'
    +'<line x1="'+cx+'" y1="10"  x2="'+cx+'" y2="145" '+LINE+'/>'
    +'<line x1="22"    y1="52"   x2="248"   y2="52"   '+LINE+'/>'
    +'<line x1="22"    y1="104"  x2="248"   y2="104"  '+LINE+'/>'
    +'<line x1="22"    y1="145"  x2="248"   y2="145"  '+LINE+'/>'
    +'<line x1="'+cx+'" y1="145" x2="45"  y2="210" '+LINE+'/>'
    +'<line x1="'+cx+'" y1="145" x2="225" y2="210" '+LINE+'/>'
    +gcell(lx, 'Ca',  ca,  20)
    +gcell(rx, 'AST', ast, 20)
    +(midLeft ? gcell(lx, midLbl, midLeft, 65) : '')
    +gcell(rx, 'ALT', alt, 65)
    +gcell(lx, 'Alb', alb, 117)
    +gcell(rx, 'FA',  fa,  117)
    +gcell(cx,       'BT', bt,  165)
    +gcell(cx - 35,  'BD', bd,  195)
    +gcell(cx + 35,  'BI', bi,  195)
    +'</svg>';
}

function svgGases(secs){
  var ph   = g(secs,'GASES','pH');
  var pco2 = g(secs,'GASES','pCO2');
  var po2  = g(secs,'GASES','pO2');
  var lac  = g(secs,'GASES','Lactato');
  var bica = g(secs,'GASES','Bica');
  if(!ph)return null;

  var cx=135, lx=67, rx=202;
  var jY=65;

  function gcell(x, lbl, obj, y_lbl){
    var cy = y_lbl + 7.5;
    var vc = obj&&obj.ab ? 'var(--error)' : 'var(--diagram-value)';
    var vt = obj ? escTxt(obj.val) : '—';
    var dec = obj&&obj.ab ? ' text-decoration="underline"' : '';
    return (
      '<g transform="translate('+x+','+cy+')">' +
      '<text x="0" y="-10" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' +
      lbl + '</text>' +
      '<text x="0" y="11" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="'+vc+'" font-weight="bold" font-family="Arial,sans-serif"'+dec+'>'+vt+'</text>' +
      '</g>'
    );
  }

  return '<svg viewBox="0 0 270 162" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">'
    +'<line x1="'+cx+'" y1="'+jY+'" x2="22"  y2="10" '+LINE+'/>'
    +'<line x1="'+cx+'" y1="'+jY+'" x2="248" y2="10" '+LINE+'/>'
    +'<line x1="'+cx+'" y1="'+jY+'" x2="'+cx+'" y2="158" '+LINE+'/>'
    +'<line x1="22" y1="'+jY+'"  x2="248" y2="'+jY+'"  '+LINE+'/>'
    +'<line x1="22" y1="118" x2="248" y2="118" '+LINE+'/>'
    +gcell(cx,  'pH',   ph,   20)
    +gcell(lx,  'pCO2', pco2, 76)
    +gcell(rx,  'pO2',  po2,  76)
    +gcell(lx,  'Lact', lac,  126)
    +gcell(rx,  'HCO3', bica, 126)
    +'</svg>';
}

function svgCoag(secs){
  var tp  = g(secs,'BH','TP');
  var ttp = g(secs,'BH','TTP');
  var inr = g(secs,'BH','INR');
  if(!tp&&!ttp&&!inr)return null;
  var cx = 135, jY = 86, R = 50;
  var k = 0.8660254037844386;
  var tx = cx, ty = jY - R;
  var lx = cx - R * k, ly = jY + R * 0.5;
  var rx = cx + R * k, ry = jY + R * 0.5;
  var Jx = cx, Jy = jY;
  var uTx = 0, uTy = -1;
  var uLx = -k, uLy = 0.5;
  var uRx = k, uRy = 0.5;
  var nL = Math.sqrt((uTx + uLx) * (uTx + uLx) + (uTy + uLy) * (uTy + uLy));
  var bLx = (uTx + uLx) / nL, bLy = (uTy + uLy) / nL;
  var nR = Math.sqrt((uTx + uRx) * (uTx + uRx) + (uTy + uRy) * (uTy + uRy));
  var bRx = (uTx + uRx) / nR, bRy = (uTy + uRy) / nR;
  var rLbl = R * 0.82;
  var tpCx = Jx + rLbl * bLx, tpCy = Jy + rLbl * bLy;
  var ttpCx = Jx + rLbl * bRx, ttpCy = Jy + rLbl * bRy;
  var inrCx = cx;
  var inrCy = ly + 16;
  return '<svg viewBox="0 0 270 172" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">'
    +'<line x1="'+Jx+'" y1="'+Jy+'" x2="'+tx+'" y2="'+ty+'" '+LINE+'/>'
    +'<line x1="'+Jx+'" y1="'+Jy+'" x2="'+lx+'" y2="'+ly+'" '+LINE+'/>'
    +'<line x1="'+Jx+'" y1="'+Jy+'" x2="'+rx+'" y2="'+ry+'" '+LINE+'/>'
    +spBlock(tpCx, tpCy, 'TP', tp, 'middle')
    +spBlock(ttpCx, ttpCy, 'TTP', ttp, 'middle')
    +spBlock(inrCx, inrCy, 'INR', inr, 'middle')
    +'</svg>';
}

function copiarDiagrama(svgStr, vw, vh, title, btn) {
  var SCALE = 2; // retina
  var TITLE_H = 18, MARGIN = 12;
  var cw = vw + MARGIN*2, ch = vh + TITLE_H + MARGIN*2;
  var canvas = document.createElement('canvas');
  canvas.width = cw * SCALE; canvas.height = ch * SCALE;
  var ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch);

  // Fix viewBox dimensions so image renders at correct size
  var fixedSvg = svgStr.replace(/style="width:100%;display:block;"/, 'width="'+vw+'" height="'+vh+'"');
  var blob = new Blob([fixedSvg], {type:'image/svg+xml;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var img = new Image();
  img.onload = function() {
    ctx.font = 'bold 9px Arial,sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'left';
    ctx.fillText(title.toUpperCase(), MARGIN, MARGIN + 9);
    ctx.drawImage(img, MARGIN, MARGIN + TITLE_H, vw, vh);
    URL.revokeObjectURL(url);
    canvas.toBlob(function(pngBlob) {
      if (!pngBlob) return;
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({'image/png': pngBlob})])
          .then(function() {
            btn.textContent = 'Copiado ✓'; btn.classList.add('copied');
            setTimeout(function(){ btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 2000);
          })
          .catch(function() {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(pngBlob);
            a.download = title.replace(/\s+/g,'-').toLowerCase()+'.png'; a.click();
          });
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(pngBlob);
        a.download = title.replace(/\s+/g,'-').toLowerCase()+'.png'; a.click();
      }
    }, 'image/png');
  };
  img.onerror = function() { URL.revokeObjectURL(url); };
  img.src = url;
}

function renderDiagramas(resLabs){
  var secs = parsearSecciones(resLabs);
  var grid = document.getElementById('diagrams-grid');
  grid.innerHTML = '';
  var cards = [
    { title:'Biometría Hemática', svg:svgBH(secs),     w:260, vw:300, vh:192 },
    { title:'Coagulación',        svg:svgCoag(secs),   w:240, vw:270, vh:172 },
    { title:'Electrolitos / QS',  svg:svgGamble(secs), w:480, vw:470, vh:130 },
    { title:'Función Hepática',   svg:svgPFH(secs),    w:220, vw:270, vh:230 },
    { title:'Gasometría',         svg:svgGases(secs),  w:240, vw:270, vh:162 },
  ];
  var any = false;
  cards.forEach(function(c){
    if (!c.svg) return;
    any = true;
    var div = document.createElement('div');
    div.className = 'dcard';
    div.style.width = c.w + 'px';
    var btn = document.createElement('button');
    btn.className = 'dcard-copy'; btn.textContent = 'Copiar';
    var svgStr = c.svg, vw = c.vw, vh = c.vh, title = c.title;
    btn.onclick = function() { copiarDiagrama(svgStr, vw, vh, title, btn); };
    div.innerHTML = '<div class="dcard-title">'+c.title+'</div>'+c.svg;
    div.appendChild(btn);
    grid.appendChild(div);
  });
  document.getElementById('lab-diagrams-section').style.display = any ? 'block' : 'none';
}

function generateIndicaciones() {
  if (isRpcOffline()) {
    showToast('Sin conexión con el servidor local. Reinicia R+ para generar documentos.', 'error');
    return;
  }
  var patient = patients.find(function(p){ return p.id===activeId; }); if (!patient) return;
  var ind = indicaciones[activeId]; if (!ind) return;
  var btn = document.getElementById('btn-gen-ind'); if (btn) { btn.classList.add('loading'); btn.disabled=true; }
  incrementPendingJobs();
  function buildPayload(outputDir) {
    return { patient: patient, indicaciones: ind, outputDir: outputDir || '' };
  }
  requestDocumentJson('/generate-indicaciones', buildPayload(settings.outputDir || ''))
  .then(function(d){
    return handleDocumentGenerateResponse({
      response: d,
      url: '/generate-indicaciones',
      buildPayload: buildPayload,
      onSuccess: function(data) {
        showToast('Indicaciones guardadas: '+data.fileName,'success');
        guidedTourAdvanceAfterIndicaGenerated();
      },
    });
  })
  .catch(function(){ showToast('Error de conexión','error'); })
  .finally(function(){
    if (btn) { btn.classList.remove('loading'); btn.disabled=false; }
    decrementPendingJobs();
    syncOfflineButtonStates();
  });
}

// ── Auto-updater UI (modal) ───────────────────────────────────────
var UPDATE_SNOOZE_KEY = 'rplus-update-snooze-until';
var UPDATE_DISMISS_VER_KEY = 'rplus-update-dismiss-version';
var MIN_VERSION_URL = 'https://raw.githubusercontent.com/mausalas99/r-mas/main/min-version.json';
var UPDATE_TELEMETRY_URL = 'https://example.invalid/r-plus-update';
var RELEASES_LATEST_URL = 'https://github.com/mausalas99/r-mas/releases/latest';
var pendingUpdaterTargetVersion = null;
var minVersionGateKeydownBound = false;

function getUpdateChannel() {
  var raw = String((settings && settings.updateChannel) || 'estable').toLowerCase();
  return raw === 'beta' ? 'beta' : 'estable';
}

function setUpdateChannel(channel) {
  var normalized = String(channel || '').toLowerCase() === 'beta' ? 'beta' : 'estable';
  var previous = getUpdateChannel();
  settings.updateChannel = normalized;
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  syncUpdateChannelUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel(normalized); } catch (_e) {}
  }
  if (previous !== normalized) {
    showToast(
      normalized === 'beta'
        ? 'Canal beta activado: recibirás pre-releases.'
        : 'Canal estable activado.',
      'success'
    );
  }
}

function syncUpdateChannelUI() {
  var sel = document.getElementById('rpc-update-channel');
  if (sel) sel.value = getUpdateChannel();
  var pill = document.getElementById('update-modal-channel-pill');
  if (pill) pill.style.display = getUpdateChannel() === 'beta' ? 'inline-block' : 'none';
}

function getUpdateTelemetryEnabled() {
  return !!(settings && settings.updateTelemetryEnabled);
}

function setUpdateTelemetryEnabled(enabled) {
  var value = !!enabled;
  settings.updateTelemetryEnabled = value;
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  syncUpdateTelemetryUI();
  showToast(value ? 'Telemetría de actualización activada.' : 'Telemetría desactivada.', 'success');
}

function syncUpdateTelemetryUI() {
  var cb = document.getElementById('rpc-update-telemetry-toggle');
  if (cb) cb.checked = getUpdateTelemetryEnabled();
}

function resolvePlatformForTelemetry() {
  if (window.electronAPI && typeof window.electronAPI.getPlatform === 'function') {
    return window.electronAPI.getPlatform().catch(function () { return 'unknown'; });
  }
  return Promise.resolve('web');
}

function sendUpdateTelemetry(result, versionHint) {
  if (!getUpdateTelemetryEnabled()) return;
  if (typeof fetch !== 'function') return;
  var normalizedResult = result === 'success' ? 'success' : 'fail';
  var versionPromise = versionHint
    ? Promise.resolve(versionHint)
    : (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function'
        ? window.electronAPI.getAppVersion().catch(function () { return 'dev'; })
        : Promise.resolve('dev'));
  Promise.all([resolvePlatformForTelemetry(), versionPromise]).then(function (vals) {
    var payload = {
      version: String(vals[1] || 'unknown'),
      result: normalizedResult,
      platform: String(vals[0] || 'unknown'),
    };
    try {
      fetch(UPDATE_TELEMETRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: 'no-cors',
      }).catch(function () {});
    } catch (_e) {}
  }).catch(function () {});
}

function compareSemver(a, b) {
  function parse(v) {
    var m = String(v == null ? '' : v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-.+].*)?$/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }
  var pa = parse(a); var pb = parse(b);
  if (!pa || !pb) return 0;
  for (var i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function showMinVersionBlockingModal(current, minVersion, message) {
  var bd = document.getElementById('min-version-backdrop');
  if (!bd) return;
  var meta = document.getElementById('min-version-meta');
  var msg = document.getElementById('min-version-message');
  if (msg && message) msg.textContent = String(message);
  if (meta) {
    meta.textContent = 'Versión actual: v' + current + ' · Mínima soportada: v' + minVersion;
  }
  var checkBtn = document.getElementById('min-version-check-btn');
  var relBtn = document.getElementById('min-version-releases-btn');
  if (checkBtn) {
    checkBtn.onclick = function () {
      if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
        try { window.electronAPI.checkForUpdates(); } catch (_e) {}
        showToast('Buscando actualizaciones…', 'success');
      } else if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
        window.electronAPI.openExternal(RELEASES_LATEST_URL);
      }
    };
  }
  if (relBtn) {
    relBtn.onclick = function () {
      if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
        window.electronAPI.openExternal(RELEASES_LATEST_URL);
      } else {
        try { window.open(RELEASES_LATEST_URL, '_blank'); } catch (_e) {}
      }
    };
  }
  // Cierra otros modales para evitar interferencia; este gate es bloqueante.
  var snoozed = document.getElementById('update-modal-backdrop');
  if (snoozed) { snoozed.style.display = 'none'; snoozed.setAttribute('aria-hidden', 'true'); }
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  if (!minVersionGateKeydownBound) {
    minVersionGateKeydownBound = true;
    document.addEventListener('keydown', function (e) {
      var active = document.getElementById('min-version-backdrop');
      if (!active || !active.classList.contains('open')) return;
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }
}

function checkMinVersionGate() {
  if (typeof fetch !== 'function') return;
  var currentVersionPromise = (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function')
    ? window.electronAPI.getAppVersion().catch(function () { return null; })
    : Promise.resolve(null);
  var payloadPromise;
  try {
    payloadPromise = fetch(MIN_VERSION_URL, { cache: 'no-store' }).then(function (r) {
      if (!r || !r.ok) throw new Error('bad response');
      return r.json();
    }).catch(function () { return null; });
  } catch (_e) {
    payloadPromise = Promise.resolve(null);
  }
  Promise.all([currentVersionPromise, payloadPromise]).then(function (res) {
    var currentVersion = res[0];
    var payload = res[1];
    if (!currentVersion || !payload || typeof payload !== 'object' || !payload.minVersion) return;
    if (compareSemver(currentVersion, payload.minVersion) < 0) {
      showMinVersionBlockingModal(currentVersion, payload.minVersion, payload.message);
    }
  }).catch(function () {});
}

function initUpdateChannelAndGate() {
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel(getUpdateChannel()); } catch (_e) {}
  }
  // Min-version gate: pequeño retraso para no estorbar el render inicial.
  setTimeout(function () { checkMinVersionGate(); }, 1200);
}

function getUpdateSnoozeUntil() {
  var raw = localStorage.getItem(UPDATE_SNOOZE_KEY);
  var n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function setUpdateSnooze(hours) {
  var h = hours || 24;
  localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + h * 3600000));
}

function isSnoozeActiveForVersion(version) {
  var dismissed = localStorage.getItem(UPDATE_DISMISS_VER_KEY);
  if (dismissed !== version) return false;
  return Date.now() < getUpdateSnoozeUntil();
}

function markDismissedVersion(version) {
  localStorage.setItem(UPDATE_DISMISS_VER_KEY, version || '');
  setUpdateSnooze(24);
}

function showUpdateModal() {
  var el = document.getElementById('update-modal-backdrop');
  if (!el) return;
  el.style.display = 'flex';
  el.setAttribute('aria-hidden', 'false');
  var modal = document.getElementById('update-modal');
  if (modal) setTimeout(function() { try { modal.focus(); } catch (_e) {} }, 50);
}

function hideUpdateModal() {
  var el = document.getElementById('update-modal-backdrop');
  if (!el) return;
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

function resetUpdateModalPanels() {
  var err = document.getElementById('update-modal-error');
  var wrap = document.getElementById('update-modal-progress-wrap');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
  if (wrap) wrap.style.display = 'block';
}

/** Convierte notas de release (HTML o texto) a texto plano para el modal; evita mostrar etiquetas crudas. */
function stripHtmlToPlainText(html) {
  if (html == null || html === '') return '';
  var raw = String(html).trim();
  if (!raw) return '';
  try {
    var doc = new DOMParser().parseFromString(raw, 'text/html');
    var t = (doc.body && doc.body.textContent) ? doc.body.textContent : '';
    t = t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
    if (t) return t;
  } catch (_e) { /* fallback below */ }
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderUpdateError(msg) {
  resetUpdateModalPanels();
  var box = document.getElementById('update-modal-error');
  var state = document.getElementById('update-modal-state');
  var wrap = document.getElementById('update-modal-progress-wrap');
  var label = document.getElementById('update-modal-progress-label');
  var pill = document.getElementById('update-modal-version-pill');
  var notes = document.getElementById('update-modal-notes');
  if (box) { box.style.display = 'block'; box.textContent = msg || 'Error desconocido'; }
  if (state) state.textContent = '';
  if (wrap) wrap.style.display = 'none';
  if (label) label.textContent = '';
  if (pill) pill.style.display = 'none';
  if (notes) notes.textContent = '';
  var title = document.getElementById('update-modal-title');
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = 'Actualizaciones';
  }
  var actions = document.getElementById('update-modal-actions-primary');
  var sec = document.getElementById('update-modal-actions-secondary');
  if (actions) {
    actions.innerHTML = '';
    var retry = document.createElement('button');
    retry.className = 'btn-primary';
    retry.textContent = 'Reintentar';
    retry.onclick = function() {
      resetUpdateModalPanels();
      if (window.electronAPI && window.electronAPI.checkForUpdates) window.electronAPI.checkForUpdates();
      hideUpdateModal();
    };
    actions.appendChild(retry);
    var close = document.createElement('button');
    close.className = 'btn-secondary';
    close.textContent = 'Cerrar';
    close.onclick = function() { hideUpdateModal(); };
    actions.appendChild(close);
  }
  if (sec) sec.innerHTML = '';
  showUpdateModal();
}

function installUpdate() {
  if (window.electronAPI) window.electronAPI.installUpdate();
}

if (window.electronAPI) {
  window.electronAPI.onUpdateAvailable(function(payload) {
    try {
      var version = (payload && payload.version) ? payload.version : String(payload || '');
      var rawNotes = (payload && payload.releaseNotes != null) ? String(payload.releaseNotes) : '';
      var releaseNotes = stripHtmlToPlainText(rawNotes);
      pendingUpdaterTargetVersion = version;
      if (isSnoozeActiveForVersion(version)) return;
      resetUpdateModalPanels();
      var title = document.getElementById('update-modal-title');
      if (title && title.firstChild && title.firstChild.nodeType === 3) {
        title.firstChild.textContent = 'Nueva versión';
      }
      var pill = document.getElementById('update-modal-version-pill');
      if (pill) {
        pill.textContent = 'v' + version;
        pill.style.display = 'inline-block';
      }
      var channelPill = document.getElementById('update-modal-channel-pill');
      if (channelPill) channelPill.style.display = getUpdateChannel() === 'beta' ? 'inline-block' : 'none';
      var notes = document.getElementById('update-modal-notes');
      if (notes) notes.textContent = releaseNotes;
      var state = document.getElementById('update-modal-state');
      if (state) state.textContent = 'Conectando… La descarga comenzará en breve.';
      var fill = document.getElementById('update-modal-progress-fill');
      if (fill) fill.style.width = '0%';
      var label = document.getElementById('update-modal-progress-label');
      if (label) label.textContent = '';
      var actions = document.getElementById('update-modal-actions-primary');
      if (actions) {
        actions.innerHTML = '';
        var later = document.createElement('button');
        later.className = 'btn-secondary';
        later.textContent = 'Más tarde';
        later.onclick = function() {
          markDismissedVersion(version);
          hideUpdateModal();
        };
        actions.appendChild(later);
      }
      var sec = document.getElementById('update-modal-actions-secondary');
      if (sec) {
        sec.innerHTML = '';
        var link = document.createElement('button');
        link.type = 'button';
        link.className = 'btn-link';
        link.textContent = 'Ver notas en GitHub';
        link.onclick = function() {
          if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal('https://github.com/mausalas99/r-mas/releases');
          }
        };
        sec.appendChild(link);
      }
      showUpdateModal();
    } catch (e) {
      console.error('onUpdateAvailable callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateProgress(function(payload) {
    try {
      var pct = typeof payload === 'number' ? payload : (payload && payload.percent != null ? payload.percent : 0);
      var transferred = payload && payload.transferred;
      var total = payload && payload.total;
      var bps = payload && payload.bytesPerSecond;
      if (pendingUpdaterTargetVersion && isSnoozeActiveForVersion(pendingUpdaterTargetVersion)) return;
      resetUpdateModalPanels();
      var state = document.getElementById('update-modal-state');
      if (state) state.textContent = 'Descargando…';
      var fill = document.getElementById('update-modal-progress-fill');
      if (fill) fill.style.width = pct + '%';
      var label = document.getElementById('update-modal-progress-label');
      if (label) {
        if (transferred != null && total != null) {
          label.textContent = formatProgressLine({
            transferred: transferred,
            total: total,
            bytesPerSecond: bps,
          });
        } else {
          label.textContent = 'Progreso: ' + pct + '%';
        }
      }
      showUpdateModal();
    } catch (e) {
      console.error('onUpdateProgress callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateReady(function(payload) {
    try {
      var version = (payload && payload.version) ? payload.version : String(payload || '');
      try { sendUpdateTelemetry('success', version); } catch (_te) {}
      if (isSnoozeActiveForVersion(version)) return;
      resetUpdateModalPanels();
      var state = document.getElementById('update-modal-state');
      if (state) {
        state.textContent =
          'Listo para instalar. También se instalará al cerrar la aplicación si eliges esperar.';
      }
      var fill = document.getElementById('update-modal-progress-fill');
      if (fill) fill.style.width = '100%';
      var label = document.getElementById('update-modal-progress-label');
      if (label) label.textContent = 'Descarga completa.';
      var actions = document.getElementById('update-modal-actions-primary');
      if (actions) {
        actions.innerHTML = '';
        var go = document.createElement('button');
        go.className = 'btn-primary';
        go.textContent = 'Instalar y reiniciar';
        go.onclick = function() { installUpdate(); };
        actions.appendChild(go);
        var later = document.createElement('button');
        later.className = 'btn-secondary';
        later.textContent = 'Instalar al cerrar';
        later.onclick = function() { hideUpdateModal(); };
        actions.appendChild(later);
      }
      var sec = document.getElementById('update-modal-actions-secondary');
      if (sec) sec.innerHTML = '';
      showUpdateModal();
    } catch (e) {
      console.error('onUpdateReady callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateNotAvailable(function() {
    try {
      pendingUpdaterTargetVersion = null;
      showToast('R+ está actualizado.', 'success');
    } catch (e) {
      console.error('onUpdateNotAvailable callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateError(function(msg) {
    try {
      try { sendUpdateTelemetry('fail'); } catch (_te) {}
      renderUpdateError(msg);
    } catch (e) {
      console.error('onUpdateError callback error:', e && e.message);
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// Bloque F — Undo, Focus Mode, Unified Search, Shortcuts, Extra Templates
// ════════════════════════════════════════════════════════════════════
var UNDO_STACK_KEY = 'rpc-undo-stack';
var FOCUS_MODE_KEY = 'rpc-focus-mode';
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
    label: label || 'operación',
    at: new Date().toISOString(),
    theme: localStorage.getItem('theme') || 'light',
    activeId: activeId,
    data: {
      patients: cloneForUndo(patients) || [],
      notes: cloneForUndo(notes) || {},
      indicaciones: cloneForUndo(indicaciones) || {},
      labHistory: cloneForUndo(labHistory) || {},
      medRecetaByPatient: cloneForUndo(medRecetaByPatient) || {},
      settings: cloneForUndo(settings) || {},
      medCatalog: cloneForUndo(storage.getMedCatalog()) || storage.getMedCatalog(),
    },
  };
}

function getUndoStack() {
  try {
    var arr = JSON.parse(localStorage.getItem(UNDO_STACK_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_e) { return []; }
}

function saveUndoStack(stack) {
  try {
    localStorage.setItem(UNDO_STACK_KEY, JSON.stringify((stack || []).slice(0, UNDO_STACK_MAX)));
  } catch (_e) {
    // best-effort; storage may be full
  }
}

function pushUndoSnapshot(label) {
  var snap = buildUndoSnapshotPayload(label);
  var stack = getUndoStack();
  stack.unshift(snap);
  saveUndoStack(stack);
  refreshUndoButtonState();
  addAuditEntry('undo-snapshot', 'ok', 0, snap.label);
}

function refreshUndoButtonState() {
  var btn = document.getElementById('btn-undo-op');
  if (!btn) return;
  var stack = getUndoStack();
  btn.disabled = stack.length === 0;
  if (stack.length > 0) {
    btn.textContent = 'Deshacer: ' + (stack[0].label || 'última operación');
  } else {
    btn.textContent = 'Deshacer última operación';
  }
}

function undoLastOperation() {
  var stack = getUndoStack();
  if (!stack.length) {
    showToast('No hay operaciones para deshacer.', 'error');
    return;
  }
  var snap = stack[0];
  if (!confirm('¿Revertir "' + (snap.label || 'última operación') + '"? La aplicación se recargará.')) return;
  var rest = stack.slice(1);
  saveUndoStack(rest);
  localStorage.setItem('rpc-patients', JSON.stringify(snap.data.patients || []));
  localStorage.setItem('rpc-notes', JSON.stringify(snap.data.notes || {}));
  localStorage.setItem('rpc-indicaciones', JSON.stringify(snap.data.indicaciones || {}));
  localStorage.setItem('rpc-labHistory', JSON.stringify(snap.data.labHistory || {}));
  localStorage.setItem('rpc-medRecetaByPatient', JSON.stringify(snap.data.medRecetaByPatient || {}));
  localStorage.setItem('rpc-listado-problemas', JSON.stringify(snap.data.listadoProblemas || {}));
  localStorage.setItem('rpc-settings', JSON.stringify(snap.data.settings || {}));
  if (snap.data.medCatalog && typeof snap.data.medCatalog === 'object') {
    storage.saveMedCatalog(snap.data.medCatalog);
  }
  if (snap.theme === 'dark' || snap.theme === 'light') localStorage.setItem('theme', snap.theme);
  addAuditEntry('undo-restore', 'ok', 0, snap.label || '');
  location.reload();
}

// ── Focus mode ────────────────────────────────────────────────────
function applyFocusModeFromStorage() {
  var on = localStorage.getItem(FOCUS_MODE_KEY) === '1';
  document.body.classList.toggle('focus-mode', on);
  var btn = document.getElementById('btn-toggle-focus-mode');
  if (btn) btn.textContent = on ? 'Desactivar modo enfoque' : 'Activar modo enfoque';
}

function toggleFocusMode() {
  var on = document.body.classList.toggle('focus-mode');
  localStorage.setItem(FOCUS_MODE_KEY, on ? '1' : '0');
  var btn = document.getElementById('btn-toggle-focus-mode');
  if (btn) btn.textContent = on ? 'Desactivar modo enfoque' : 'Activar modo enfoque';
  if (on) closeSettingsDropdown();
  showToast(on ? 'Modo enfoque activado · F6 para salir' : 'Modo enfoque desactivado', 'success');
  addAuditEntry('focus-mode', 'ok', 0, on ? 'on' : 'off');
}

// ── Unified search ────────────────────────────────────────────────
var _unifiedSearchCurrent = [];

function openUnifiedSearch() {
  var bd = document.getElementById('unified-search-backdrop');
  if (!bd) return;
  bd.classList.add('open');
  var input = document.getElementById('unified-search-input');
  if (input) {
    input.value = '';
    setTimeout(function(){ input.focus(); }, 30);
  }
  updateUnifiedSearchResults();
}

function closeUnifiedSearch() {
  var bd = document.getElementById('unified-search-backdrop');
  if (bd) bd.classList.remove('open');
}

function snippetAround(text, q, maxLen) {
  var src = String(text || '');
  var lc = src.toLowerCase();
  var idx = lc.indexOf(q);
  if (idx < 0) return '';
  var half = Math.max(20, Math.floor((maxLen || 140) / 2));
  var start = Math.max(0, idx - half);
  var end = Math.min(src.length, idx + q.length + half);
  var out = src.slice(start, end);
  if (start > 0) out = '… ' + out;
  if (end < src.length) out = out + ' …';
  return out;
}

function escapeRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightSnippet(snippet, q) {
  var safe = esc(snippet);
  if (!q) return safe;
  var qEsc = escapeRegExp(q);
  try {
    return safe.replace(new RegExp(qEsc, 'ig'), function(m){ return '<mark>' + m + '</mark>'; });
  } catch (_e) {
    return safe;
  }
}

function collectNoteHaystack(note) {
  if (!note) return '';
  var parts = [note.interrogatorio, note.evolucion, note.estudios, note.medico, note.profesor];
  if (Array.isArray(note.diagnosticos)) parts = parts.concat(note.diagnosticos);
  if (Array.isArray(note.tratamiento)) parts = parts.concat(note.tratamiento);
  return parts.filter(Boolean).join('\n');
}

function collectIndicaHaystack(ind) {
  if (!ind) return '';
  var parts = [ind.dieta, ind.cuidados, ind.estudios, ind.medicamentos, ind.interconsultas, ind.medicos];
  if (Array.isArray(ind.otros)) {
    ind.otros.forEach(function(o){ if (o && (o.titulo || o.contenido)) parts.push((o.titulo || '') + '\n' + (o.contenido || '')); });
  }
  return parts.filter(Boolean).join('\n');
}

function updateUnifiedSearchResults() {
  var box = document.getElementById('unified-search-results');
  var inp = document.getElementById('unified-search-input');
  if (!box || !inp) return;
  var q = String(inp.value || '').trim().toLowerCase();
  if (!q) {
    box.innerHTML = '<div class="unified-search-empty">Escribe para buscar pacientes, notas o indicaciones.</div>';
    _unifiedSearchCurrent = [];
    return;
  }
  var out = [];
  var MAX = 40;
  for (var i = 0; i < patients.length && out.length < MAX; i += 1) {
    var p = patients[i];
    if (p.isDemo) continue;
    var meta = [p.nombre, p.registro, p.cuarto, p.cama, p.servicio, p.area].filter(Boolean).join(' · ');
    var metaLc = meta.toLowerCase();
    var metaStr = 'Cto. ' + (p.cuarto || '-') + ' · Cama ' + (p.cama || '-') + (p.registro ? ' · ' + p.registro : '');
    if (metaLc.indexOf(q) !== -1) {
      out.push({ id: p.id, tab: 'nota', inner: 'notas', tag: 'paciente',
        title: p.nombre || 'Sin nombre', meta: metaStr, snippet: '' });
      if (out.length >= MAX) break;
    }
    var nh = collectNoteHaystack(notes[p.id]);
    if (nh && nh.toLowerCase().indexOf(q) !== -1) {
      out.push({ id: p.id, tab: 'nota', inner: 'notas', tag: 'nota',
        title: p.nombre || 'Sin nombre', meta: metaStr, snippet: snippetAround(nh, q, 140) });
      if (out.length >= MAX) break;
    }
    var ih = collectIndicaHaystack(indicaciones[p.id]);
    if (ih && ih.toLowerCase().indexOf(q) !== -1) {
      out.push({ id: p.id, tab: 'nota', inner: 'indica', tag: 'indicaciones',
        title: p.nombre || 'Sin nombre', meta: metaStr, snippet: snippetAround(ih, q, 140) });
      if (out.length >= MAX) break;
    }
  }
  _unifiedSearchCurrent = out;
  if (!out.length) {
    box.innerHTML = '<div class="unified-search-empty">Sin coincidencias.</div>';
    return;
  }
  box.innerHTML = out.map(function(r, idx) {
    return '<div class="unified-search-result" onclick="selectUnifiedSearchResult(' + idx + ')">' +
      '<div class="usr-title"><span>' + esc(r.title) + '</span><span class="usr-tag">' + esc(r.tag) + '</span></div>' +
      '<div class="usr-meta">' + esc(r.meta) + '</div>' +
      (r.snippet ? '<div class="usr-snippet">' + highlightSnippet(r.snippet, q) + '</div>' : '') +
      '</div>';
  }).join('');
}

function selectUnifiedSearchResult(idx) {
  var r = _unifiedSearchCurrent[idx];
  if (!r) return;
  selectPatient(r.id);
  switchAppTab(r.tab);
  if (r.inner) switchInnerTab(r.inner);
  closeUnifiedSearch();
}

// ── Extra templates (reusable indicaciones) ───────────────────────
var _extraTemplateEditing = null;

function ensureExtraTemplatesArray() {
  if (!Array.isArray(settings.extraTemplates)) settings.extraTemplates = [];
  return settings.extraTemplates;
}

function persistSettings() {
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
}

function openExtraTemplatesManager() {
  var m = document.getElementById('extra-templates-modal');
  if (!m) return;
  ensureExtraTemplatesArray();
  m.style.display = 'flex';
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
}

function closeExtraTemplatesManager() {
  var m = document.getElementById('extra-templates-modal');
  if (m) m.style.display = 'none';
  cancelExtraTemplateEdit();
}

function renderExtraTemplatesList() {
  var list = document.getElementById('extra-templates-list');
  if (!list) return;
  var arr = ensureExtraTemplatesArray();
  if (!arr.length) {
    list.innerHTML = '<div class="unified-search-empty">Aún no tienes plantillas guardadas.</div>';
    return;
  }
  list.innerHTML = arr.map(function(tmpl) {
    var id = esc(tmpl.id || '');
    return '<div class="extra-tmpl-row">' +
      '<span class="etr-label" title="' + esc(tmpl.label || '') + '">' + esc(tmpl.label || '(sin nombre)') + '</span>' +
      '<div class="etr-actions">' +
      '<button type="button" onclick="editExtraTemplate(\'' + id + '\')">Editar</button>' +
      '<button type="button" class="etr-del" onclick="deleteExtraTemplate(\'' + id + '\')">Eliminar</button>' +
      '</div></div>';
  }).join('');
}

function startNewExtraTemplate() {
  _extraTemplateEditing = '';
  var ed = document.getElementById('extra-template-editor');
  if (ed) ed.style.display = 'flex';
  var elLabel = document.getElementById('extra-tmpl-label');
  var elDieta = document.getElementById('extra-tmpl-dieta');
  var elCui = document.getElementById('extra-tmpl-cuidados');
  var elMed = document.getElementById('extra-tmpl-meds');
  if (elLabel) elLabel.value = '';
  if (elDieta) elDieta.value = '';
  if (elCui) elCui.value = '';
  if (elMed) elMed.value = '';
  setTimeout(function(){ if (elLabel) elLabel.focus(); }, 30);
}

function editExtraTemplate(id) {
  var arr = ensureExtraTemplatesArray();
  var tmpl = arr.find(function(t){ return t.id === id; });
  if (!tmpl) return;
  _extraTemplateEditing = id;
  var ed = document.getElementById('extra-template-editor');
  if (ed) ed.style.display = 'flex';
  document.getElementById('extra-tmpl-label').value = tmpl.label || '';
  document.getElementById('extra-tmpl-dieta').value = tmpl.dieta || '';
  document.getElementById('extra-tmpl-cuidados').value = tmpl.cuidados || '';
  document.getElementById('extra-tmpl-meds').value = tmpl.medicamentos || '';
}

function cancelExtraTemplateEdit() {
  _extraTemplateEditing = null;
  var ed = document.getElementById('extra-template-editor');
  if (ed) ed.style.display = 'none';
}

function saveExtraTemplateFromEditor() {
  var label = (document.getElementById('extra-tmpl-label').value || '').trim();
  if (!label) { showToast('Ingresa un nombre para la plantilla', 'error'); return; }
  var dieta = (document.getElementById('extra-tmpl-dieta').value || '').trim();
  var cuidados = (document.getElementById('extra-tmpl-cuidados').value || '').trim();
  var meds = (document.getElementById('extra-tmpl-meds').value || '').trim();
  var arr = ensureExtraTemplatesArray();
  if (_extraTemplateEditing) {
    var tmpl = arr.find(function(t){ return t.id === _extraTemplateEditing; });
    if (tmpl) {
      tmpl.label = label;
      tmpl.dieta = dieta;
      tmpl.cuidados = cuidados;
      tmpl.medicamentos = meds;
    }
  } else {
    arr.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: label, dieta: dieta, cuidados: cuidados, medicamentos: meds
    });
  }
  persistSettings();
  addAuditEntry('extra-template-save', 'ok', arr.length, label);
  showToast('Plantilla guardada', 'success');
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
  if (activeId) renderIndicaForm();
}

function deleteExtraTemplate(id) {
  var arr = ensureExtraTemplatesArray();
  var tmpl = arr.find(function(t){ return t.id === id; });
  if (!tmpl) return;
  if (!confirm('¿Eliminar la plantilla "' + (tmpl.label || '') + '"?')) return;
  settings.extraTemplates = arr.filter(function(t){ return t.id !== id; });
  persistSettings();
  addAuditEntry('extra-template-delete', 'ok', settings.extraTemplates.length, tmpl.label || '');
  renderExtraTemplatesList();
  cancelExtraTemplateEdit();
  if (activeId) renderIndicaForm();
}

function buildExtraTemplatesSelectorHtml() {
  var arr = (settings && Array.isArray(settings.extraTemplates)) ? settings.extraTemplates : [];
  if (!arr.length) {
    return '<div class="indica-extra-tmpl"><span class="iet-hint">Guarda combinaciones reutilizables en Ajustes → Plantillas guardadas.</span></div>';
  }
  var opts = '<option value="">— Aplicar plantilla guardada —</option>' +
    arr.map(function(t){ return '<option value="' + esc(t.id) + '">' + esc(t.label || '(sin nombre)') + '</option>'; }).join('');
  return '<div class="indica-extra-tmpl">' +
    '<select id="indica-extra-tmpl-select" aria-label="Seleccionar plantilla guardada">' + opts + '</select>' +
    '<button type="button" onclick="applyExtraTemplateFromIndica()">Aplicar</button>' +
    '</div>';
}

function applyExtraTemplateFromIndica() {
  var sel = document.getElementById('indica-extra-tmpl-select');
  if (!sel || !sel.value) { showToast('Elige una plantilla', 'error'); return; }
  if (!activeId || !indicaciones[activeId]) { showToast('Selecciona un paciente primero', 'error'); return; }
  var tmpl = (settings.extraTemplates || []).find(function(t){ return t.id === sel.value; });
  if (!tmpl) return;
  var target = indicaciones[activeId];
  var hasExisting = (target.dieta && target.dieta.trim()) ||
    (target.cuidados && target.cuidados.trim()) ||
    (target.medicamentos && target.medicamentos.trim());
  var mode = 'replace';
  if (hasExisting) {
    var ans = prompt('Ya hay contenido en las indicaciones.\nEscribe R = reemplazar, A = agregar al final, C = cancelar.', 'A');
    var v = String(ans || '').trim().toUpperCase();
    if (v === 'C' || v === '') return;
    mode = (v === 'R') ? 'replace' : 'append';
  }
  function merge(current, addition) {
    if (!addition) return current || '';
    if (mode === 'replace') return addition;
    if (!current) return addition;
    return current.replace(/\s+$/, '') + '\n' + addition;
  }
  target.dieta = merge(target.dieta || '', tmpl.dieta || '');
  target.cuidados = merge(target.cuidados || '', tmpl.cuidados || '');
  target.medicamentos = merge(target.medicamentos || '', tmpl.medicamentos || '');
  saveState();
  renderIndicaForm();
  addAuditEntry('extra-template-apply', 'ok', 1, tmpl.label || '');
  showToast('Plantilla aplicada: ' + (tmpl.label || ''), 'success');
}

// ── Shortcuts / init ──────────────────────────────────────────────
function isTypingContext(target) {
  if (!target) return false;
  var tag = (target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function initBlockFShortcuts() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F6') {
      e.preventDefault();
      toggleFocusMode();
      return;
    }
    if (e.key === 'Escape') {
      var bd = document.getElementById('unified-search-backdrop');
      if (bd && bd.classList.contains('open')) {
        e.preventDefault();
        closeUnifiedSearch();
        return;
      }
      var em = document.getElementById('extra-templates-modal');
      if (em && em.style.display === 'flex') {
        e.preventDefault();
        closeExtraTemplatesManager();
        return;
      }
    }
    var mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.altKey || e.shiftKey) return;
    var k = (e.key || '').toLowerCase();
    if (k === 'k') {
      e.preventDefault();
      var bd2 = document.getElementById('unified-search-backdrop');
      if (bd2 && bd2.classList.contains('open')) closeUnifiedSearch();
      else openUnifiedSearch();
    } else if (k === 'n') {
      e.preventDefault();
      openAddModal();
    } else if (k === 's') {
      e.preventDefault();
      if (!activeId) { showToast('Selecciona un paciente primero', 'error'); return; }
      saveState();
      addAuditEntry('quick-save', 'ok', 1, String(activeId));
      showToast('Estado guardado ✓', 'success');
    }
  });
  applyFocusModeFromStorage();
  refreshUndoButtonState();
}

_rpcDeferInit(initBlockFShortcuts);
syncProfileSectionVisibility();

Object.assign(window, {
  installUpdate,
  toggleTheme,
  setThemeMode,
  setFontZoom,
  setHighContrast,
  toggleHighContrast,
  t,
  openUserDataFolderFromSettings,
  openQuickHelp,
  closeQuickHelp,
  onHelpSearchInput,
  onHelpSearchKeydown,
  onHelpListKeydown,
  closeReleaseNotes,
  startMiniTour,
  startHelpTourMain,
  onIdleLockSelectChange,
  changeIdleLockPin,
  submitIdleLockPin,
  openWipeDataModal,
  closeWipeDataModal,
  wipeCacheConfirmed,
  wipeAllConfirmed,
  switchAppTab,
  switchInnerTab,
  guidedTourIntroChooseSala,
  guidedTourIntroChooseInterconsulta,
  guidedTourIntroSkip,
  skipGuidedTour,
  toggleTourDockCollapsed,
  onTourDockClick,
  guidedTourClickNext,
  openAddModal,
  onPatientSearchInput,
  toggleProfileSection,
  openProfileFromHeader,
  openProfileModal,
  closeProfileModal,
  onAppModeChange,
  onDefaultServicioBlur,
  onMedicoTemplateBlur,
  updateListadoMedico,
  updateListadoMeta,
  updateProblemaField,
  addProblemaUI,
  removeProblemaUI,
  generateListado,
  _autoGrowTextarea,
  openEstadoActualModal,
  estadoActualOnlyCopy,
  estadoActualSaveAndCopy,
  togglePatientPinned,
  togglePatientArchived,
  movePatientByOffset,
  onPatientDragStart,
  onPatientDragOver,
  onPatientDrop,
  onPatientDragEnd,
  toggleArchivedSection,
  toggleSettingsSection,
  toggleSettingsDropdown,
  closeSettingsDropdown,
  checkForAppUpdates,
  setUpdateChannel,
  setUpdateTelemetryEnabled,
  chooseOutputDir,
  saveQuickOutputFormat,
  openTemplatesModal,
  saveSettings,
  resetAndStartOnboarding,
  exportDataBackup,
  exportActivePatientBackup,
  exportRangeBackupPrompt,
  triggerImportRangeBackup,
  onRangeBackupFileChosen,
  updateAutoBackupSettingsFromUi,
  runAutoBackupNow,
  exportAuditLog,
  exportMedCatalogBundle,
  triggerImportMedCatalog,
  onMedCatalogFileChosen,
  exportSyncBundlePrompt,
  triggerImportSyncBundle,
  onSyncBundleFileChosen,
  triggerImportActivePatientBackup,
  triggerImportBackup,
  onPatientBackupFileChosen,
  onBackupFileChosen,
  procesarReporte,
  limpiarReporte,
  replayLabHistorySet,
  reprocessLabHistorySet,
  deleteLabHistorySet,
  toggleLabHistoryPanel,
  openAddModalFromLab,
  copiarLabsAlPortapapeles,
  procesarRecetaMed,
  limpiarRecetaInput,
  copiarMedicamentosAlPortapapeles,
  setMedOutputTab,
  toggleMedRecetaSuspendido,
  toggleMedRecetaParaNota,
  limpiarSeleccionMedNota,
  mediAnadirATratamiento,
  mediLlevarASOAP,
  enviarLabsANota,
  closeModal,
  savePatient,
  closeTemplatesModal,
  saveTemplates,
  closeSOAPModal,
  insertSOAPText,
  updateSOAPBalance,
  closeTendDetail,
  toggleTendSection,
  tendHideSeriesFromCard,
  tendUnhideSeries,
  tendResetAllHiddenSeries,
  toggleTendHiddenBar,
  selectPatient,
  deletePatient,
  openSOAPModal,
  updatePatient,
  renderPatientDataPane,
  updateNote,
  updateDx,
  removeDx,
  addDx,
  updateTx,
  removeTx,
  addTx,
  quickExportCurrentPatient,
  generateWord,
  updateIndica,
  removeOtro,
  addOtro,
  generateIndicaciones,
  openTendDetail,
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
  cancelExtraTemplateEdit,
  applyExtraTemplateFromIndica,
  restorePreimportBackupPrompt,
  syncPreimportBackupUi,
  openLabHistoryDedupeReview,
  consolidateLabHistoryByDayAndTipo
});
