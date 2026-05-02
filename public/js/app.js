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
  escTxt,
  renderToken,
  renderEntry
} from './labs.js';
import { formatProgressLine } from './update-helpers.mjs';
import { isDuplicateAgainstLatest } from './lab-history-auto-store-core.mjs';


// ════════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════════
var patients     = storage.getPatients();
var notes        = storage.getNotes();
var indicaciones = storage.getIndicaciones();
var labHistory   = storage.getLabHistory();
var medRecetaByPatient = storage.getMedRecetaByPatient();
var activeId     = null;
var activeInner  = 'notas';
var activeAppTab = 'lab';
var patientSearchFilter = '';
var activeLab    = null;
var settings     = storage.getSettings();
var sparkCharts  = {};
var detailChart  = null;
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
  Hb:'g/dL',  Hto:'%',    Leu:'K/μL', Plt:'K/μL',
  Glu:'mg/dL',Cr:'mg/dL', BUN:'mg/dL',PCR:'mg/dL',
  AU:'mg/dL', TGL:'mg/dL',COL:'mg/dL',
  Na:'mEq/L', K:'mEq/L',  Cl:'mEq/L', HCO3:'mEq/L',Ca:'mg/dL',
  AST:'U/L',  ALT:'U/L',  FA:'U/L',   BT:'mg/dL'
};
var TEND_PARAMS = ['Hb','Hto','Leu','Plt','Glu','Cr','BUN','PCR','Na','K','Cl','HCO3','Ca','AST','ALT','FA','BT'];
var TEND_REF = {
  Hb:[12,17.5], Hto:[36,53], Leu:[4,11], Plt:[150,400],
  Glu:[70,100], Cr:[0.5,1.3], BUN:[7,20], PCR:[0,0.5],
  Na:[136,145], K:[3.5,5.0], Cl:[96,106], HCO3:[22,28], Ca:[8.5,10.5],
  AST:[10,40], ALT:[7,56], FA:[44,147], BT:[0.1,1.2]
};
var TOUR_STEP_IDLE = 0;
var TOUR_STEP_MAP = 1;
var TOUR_STEP_LAB_PARSE = 2;
var TOUR_STEP_LAB_VIEW = 3;
var TOUR_STEP_LAB_SEND = 4;
var TOUR_STEP_NOTA_GEN = 5;
var TOUR_STEP_INDICA_GEN = 6;
var TOUR_STEP_TEND = 7;
var TOUR_STEP_PROFILE = 8;
var TOUR_STEP_WRAP = 9;
var guidedTourActive = false;
var tourStep = TOUR_STEP_IDLE;
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

function rebuildEstudiosFromLabHistory(patientId) {
  if (!patientId) return;
  if (!notes[patientId]) notes[patientId] = {};
  var ordered = sortLabHistoryChronological(ensureParsedLabHistory(patientId));
  if (!ordered.length) {
    notes[patientId].estudios = '';
    return;
  }
  var lines = [];
  ordered.forEach(function(set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var dateLine = buildLabSetDateLine(set);
    if (dateLine) lines.push(dateLine);
    set.resLabs.forEach(function(row) {
      var clean = String(row == null ? '' : row).trim();
      if (clean) lines.push(clean);
    });
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
  document.getElementById('appcontent-lab').style.display  = tab === 'lab'  ? 'flex' : 'none';
  document.getElementById('appcontent-nota').style.display = tab === 'nota' ? 'flex' : 'none';
  if (tab === 'lab') renderLabHistoryPanel();
}

function switchInnerTab(tab) {
  activeInner = tab;
  document.getElementById('itab-notas').classList.toggle('active', tab === 'notas');
  document.getElementById('itab-indica').classList.toggle('active', tab === 'indica');
  document.getElementById('itab-tend').classList.toggle('active', tab === 'tend');
  document.getElementById('itab-content-notas').classList.toggle('active', tab === 'notas');
  document.getElementById('itab-content-indica').classList.toggle('active', tab === 'indica');
  document.getElementById('itab-content-tend').classList.toggle('active', tab === 'tend');
  if (tab === 'tend') renderTendencias();
}

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

function renderPatientList() {
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
  list.innerHTML = filtered.map(function(p) { return (
    '<div class="patient-card ' + (p.id===activeId?'active':'') + '" onclick="selectPatient(\'' + p.id + '\')">' +
    '<div class="p-name">' + esc(p.nombre||'Sin nombre') + '</div>' +
    '<div class="p-meta"><span>Cto. ' + esc(p.cuarto||'-') + '</span><span>Cama ' + esc(p.cama||'-') + '</span><span>' + esc(p.servicio||'-') + '</span>' +
    (p.fromLab ? '<span class="lab-chip">LAB</span>' : '') + '</div>' +
    '<button class="btn-delete-card" onclick="deletePatient(event,\'' + p.id + '\')" aria-label="Eliminar">×</button></div>'
  ); }).join('');
}

function selectPatient(id) {
  activeId = id;
  renderPatientList();
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('patient-view').style.display = 'flex';
  renderNoteForm();
  renderIndicaForm();
  if (activeInner === 'tend') renderTendencias();
  renderLabHistoryPanel();
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
  saveState();
  addAuditEntry('patient-delete', 'ok', 1, target ? (target.registro || target.nombre || '') : '');
  if (activeId === id) activeId = patients.length ? patients[0].id : null;
  renderPatientList();
  if (activeId) selectPatient(activeId);
  else { document.getElementById('patient-view').style.display='none'; document.getElementById('empty-state').style.display='flex'; }
}

function saveState() {
  storage.saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient);
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

function toggleProfileSection() {
  var body  = document.getElementById('profile-body');
  var arrow = document.getElementById('profile-toggle-arrow');
  var open  = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'flex';
  arrow.textContent  = open ? '▾' : '▴';
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
  document.getElementById('intro-modal-title').textContent =
    ver ? ('R+ · versión ' + ver) : 'Bienvenido a R+';
  document.getElementById('intro-modal-body').innerHTML =
    'Cada versión nueva ofrece este recorrido para repasar <strong>Laboratorio</strong>, <strong>Expediente</strong> (nota, indicaciones y tendencias), <strong>Mi Perfil</strong> y <strong>Ajustes</strong>. Usaremos un paciente de ejemplo que <strong>no se guarda</strong> en tus datos.';
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

function guidedTourIntroStart() {
  hideTourIntroModal();
  startOnboarding();
}

function showTourDock() {
  document.getElementById('tour-dock').classList.add('tour-dock-visible');
}

function hideTourDock() {
  document.getElementById('tour-dock').classList.remove('tour-dock-visible');
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
  var body = document.getElementById('profile-body');
  if (!body) return;
  if (body.style.display === 'none') toggleProfileSection();
}

function ensureSettingsExpandedForTour() {
  var dd = document.getElementById('settings-dropdown');
  if (!dd) return;
  if (!dd.classList.contains('open')) toggleSettingsDropdown();
}

function renderTourStep() {
  if (!guidedTourActive) return;
  var badge = document.getElementById('tour-step-badge');
  var bodyEl = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var total = TOUR_STEP_WRAP;
  function badgeText(n, label) {
    badge.textContent = 'Paso ' + n + ' de ' + total + (label ? ' · ' + label : '');
  }
  nextBtn.style.display = '';
  nextBtn.disabled = false;
  switch (tourStep) {
    case TOUR_STEP_MAP:
      badgeText(1, 'vista general');
      bodyEl.innerHTML = 'A la <strong>izquierda</strong> está la lista de pacientes (el demo <strong>DEMO PÉREZ</strong> no se guarda). Arriba alterna <strong>Laboratorio</strong> (reportes y gráficas) y <strong>Expediente</strong> (nota clínica, indicaciones y tendencias). Si agregas un paciente con nombre o registro similar a uno existente, la app te avisará.';
      nextBtn.textContent = 'Siguiente';
      break;
    case TOUR_STEP_LAB_PARSE:
      badgeText(2, 'laboratorio');
      bodyEl.innerHTML = 'Pulsa <strong>Procesar</strong> para leer el reporte de ejemplo y generar diagramas.';
      nextBtn.style.display = 'none';
      break;
    case TOUR_STEP_LAB_VIEW:
      badgeText(3, 'resultados');
      bodyEl.innerHTML = 'Revisa <strong>Diagramas</strong> y la tabla de <strong>Resultados</strong>. Después podrás usar <strong>Enviar a nota</strong> (arriba a la derecha en resultados).';
      nextBtn.textContent = 'Siguiente';
      break;
    case TOUR_STEP_LAB_SEND:
      badgeText(4, 'enviar a nota');
      bodyEl.innerHTML = 'Pulsa <strong>Enviar a nota</strong> para volcar estos labs al expediente.';
      nextBtn.style.display = 'none';
      break;
    case TOUR_STEP_NOTA_GEN:
      badgeText(5, 'nota');
      bodyEl.innerHTML = 'En <strong>Nota de Evolución</strong>, completa lo que quieras y genera el Word con <strong>Generar Nota (.docx)</strong>. El archivo va a <strong>Descargas</strong>.';
      nextBtn.style.display = 'none';
      break;
    case TOUR_STEP_INDICA_GEN:
      badgeText(6, 'indicaciones');
      bodyEl.innerHTML = 'En <strong>Indicaciones</strong> arma la hoja por secciones y usa <strong>Generar Indicaciones (.docx)</strong>.';
      nextBtn.style.display = 'none';
      break;
    case TOUR_STEP_TEND:
      badgeText(7, 'tendencias');
      bodyEl.innerHTML = 'Con varios labs en el tiempo aparecen mini-gráficas. Este demo ya incluye dos fechas de ejemplo además de los que agregues.';
      nextBtn.textContent = 'Siguiente';
      break;
    case TOUR_STEP_PROFILE:
      badgeText(8, 'perfil y ajustes');
      bodyEl.innerHTML = 'En <strong>Mi Perfil</strong> defines médico, grado y plantillas por defecto. En <strong>Ajustes</strong> (debajo) están la carpeta de documentos, respaldos JSON, tema claro/oscuro, versión y búsqueda de actualizaciones.';
      nextBtn.textContent = 'Siguiente';
      break;
    case TOUR_STEP_WRAP:
      badgeText(9, 'listo');
      bodyEl.innerHTML = 'El <strong>tema</strong> también está en <strong>Ajustes</strong> o en el ícono junto a la fecha. Las <strong>actualizaciones</strong> se anuncian arriba. Puedes repetir el tutorial desde <strong>Mi Perfil</strong>.';
      nextBtn.textContent = 'Finalizar';
      break;
    default:
      hideTourDock();
  }
}

function guidedTourClickNext() {
  if (miniTourActive) { miniTourNext(); return; }
  if (!guidedTourActive) return;
  if (tourStep === TOUR_STEP_WRAP) {
    completeGuidedTourWithCelebration();
    return;
  }
  if (tourStep === TOUR_STEP_MAP) {
    tourStep = TOUR_STEP_LAB_PARSE;
    switchAppTab('lab');
    renderTourStep();
    return;
  }
  if (tourStep === TOUR_STEP_LAB_VIEW) {
    tourStep = TOUR_STEP_LAB_SEND;
    renderTourStep();
    return;
  }
  if (tourStep === TOUR_STEP_TEND) {
    tourStep = TOUR_STEP_PROFILE;
    switchAppTab('nota');
    switchInnerTab('notas');
    ensureProfileExpandedForTour();
    ensureSettingsExpandedForTour();
    renderTourStep();
    return;
  }
  if (tourStep === TOUR_STEP_PROFILE) {
    tourStep = TOUR_STEP_WRAP;
    renderTourStep();
    return;
  }
}

function guidedTourAdvanceAfterNotaGenerated() {
  if (!guidedTourActive || tourStep !== TOUR_STEP_NOTA_GEN) return;
  tourStep = TOUR_STEP_INDICA_GEN;
  switchAppTab('nota');
  switchInnerTab('indica');
  renderIndicaForm();
  renderTourStep();
}

function guidedTourAdvanceAfterIndicaGenerated() {
  if (!guidedTourActive || tourStep !== TOUR_STEP_INDICA_GEN) return;
  tourStep = TOUR_STEP_TEND;
  switchAppTab('nota');
  switchInnerTab('tend');
  renderTendencias();
  renderTourStep();
}

function completeGuidedTourWithCelebration() {
  markGuidedTourVersionDone();
  guidedTourActive = false;
  tourStep = TOUR_STEP_IDLE;
  hideTourDock();
  launchConfetti();
  destroyDemoAndClose();
  showToast('Tutorial completado', 'success');
}

function skipGuidedTour() {
  if (miniTourActive) { endMiniTour(); return; }
  markGuidedTourVersionDone();
  guidedTourActive = false;
  tourStep = TOUR_STEP_IDLE;
  hideTourDock();
  destroyDemoAndClose();
}

function startOnboarding() {
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
  patients = patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID; });
  patients.unshift(demoPatient);
  guidedTourActive = true;
  tourStep = TOUR_STEP_MAP;
  renderPatientList();
  selectPatient(DEMO_PATIENT_ID);
  switchAppTab('lab');
  document.getElementById('lab-input').value = DEMO_LAB_REPORT;
  showTourDock();
  renderTourStep();
}

function onboardingAdvanceAfterParse() {
  if (!guidedTourActive || tourStep !== TOUR_STEP_LAB_PARSE) return;
  tourStep = TOUR_STEP_LAB_VIEW;
  renderTourStep();
}

function onboardingAdvanceAfterSend() {
  if (!guidedTourActive) return;
  // Permitir envío en paso 3 (vista resultados) o 4 (enviar): evita softlock si el usuario
  // pulsa "Enviar a nota" antes de "Siguiente".
  if (tourStep === TOUR_STEP_LAB_VIEW || tourStep === TOUR_STEP_LAB_SEND) {
    tourStep = TOUR_STEP_NOTA_GEN;
    renderTourStep();
  }
}

function destroyDemoAndClose() {
  patients = patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID; });
  delete notes[DEMO_PATIENT_ID];
  delete indicaciones[DEMO_PATIENT_ID];
  delete labHistory[DEMO_PATIENT_ID];
  guidedTourActive = false;
  tourStep = TOUR_STEP_IDLE;
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
  localStorage.removeItem(GUIDED_TOUR_LS_KEY);
  patients = patients.filter(function(p){ return p.id !== DEMO_PATIENT_ID; });
  delete notes[DEMO_PATIENT_ID];
  delete indicaciones[DEMO_PATIENT_ID];
  delete labHistory[DEMO_PATIENT_ID];
  guidedTourActive = false;
  tourStep = TOUR_STEP_IDLE;
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
    keywords: 'nota evolucion docx generar expediente soap vitales diagnosticos',
    html:
      '<p>En <strong>Expediente → Notas</strong> completa fecha, hora, signos vitales, interrogatorio, evolución, estudios, diagnósticos y tratamiento.</p>' +
      '<ul>' +
      '<li>La plantilla <strong>SOAP</strong> genera un bloque estructurado listo para insertar en evolución.</li>' +
      '<li><strong>Generar Nota (.docx)</strong> crea un archivo con el formato clínico; la carpeta de destino se configura en Ajustes.</li>' +
      '<li>Los datos se guardan por paciente y persisten al cerrar R+.</li>' +
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

var RELEASE_NOTES_HIGHLIGHTS = {};

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
      var span = document.createElement('span');
      span.textContent = n.body;
      li.appendChild(strong);
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
    body: 'Desde <strong>Aplicación</strong> accedes a este <strong>centro de ayuda</strong>, ves la versión instalada y puedes <strong>buscar actualizaciones</strong> manualmente.',
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
    before: function(){ switchAppTab('lab'); }
  },
  {
    badge: 'Laboratorio · tendencias',
    body: 'Cada laboratorio enviado se guarda con su fecha. Con dos o más labs aparecen mini-gráficas en <strong>Expediente → Tendencias</strong>.',
    before: function(){ switchAppTab('lab'); }
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
      settings: storage.getSettings()
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
    labHistory: Array.isArray(labHistory[patientId]) ? labHistory[patientId] : []
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
  return newId;
}

function importEntriesWithConflicts(entries, actionLabel) {
  var out = { imported: 0, overwritten: 0, duplicated: 0, cancelled: false };
  var patientsBefore = JSON.parse(JSON.stringify(patients));
  var notesBefore = JSON.parse(JSON.stringify(notes));
  var indicacionesBefore = JSON.parse(JSON.stringify(indicaciones));
  var labHistoryBefore = JSON.parse(JSON.stringify(labHistory));
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
      localStorage.setItem('rpc-settings', JSON.stringify(payload.data.settings || {}));
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

function deleteLabHistorySet(setId) {
  if (!activeId || !labHistory[activeId]) return;
  if (!confirm('¿Eliminar este conjunto del historial? Las tendencias se recalcularán.')) return;
  labHistory[activeId] = (labHistory[activeId] || []).filter(function(s) { return String(s.id) !== String(setId); });
  if (!labHistory[activeId].length) delete labHistory[activeId];
  saveState();
  addAuditEntry('lab-history-delete', 'ok', 1, String(setId));
  renderLabHistoryPanel();
  if (activeInner === 'tend') renderTendencias();
  showToast('Eliminado del historial', 'success');
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
  if (activeLab.patient && activeLab.patient.fecha) {
    var fechaRaw = activeLab.patient.fecha;
    var mesesMap = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12',jan:'01',apr:'04',aug:'08',dec:'12'};
    var mFechaLab = fechaRaw.trim().match(/([A-Za-z]{3})\s+(\d{1,2})\s+\d{4}/);
    var monNum = mFechaLab && mesesMap[mFechaLab[1].toLowerCase()];
    var todayFb = new Date();
    var fbStr = String(todayFb.getDate()).padStart(2,'0')+'/'+String(todayFb.getMonth()+1).padStart(2,'0');
    lines.push(monNum ? mFechaLab[2].padStart(2,'0') + '/' + monNum : fbStr);
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

function pushLabHistory(patientId, resLabs, fecha, hora) {
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
    parsed: extractParsedValues(resLabs)
  };
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

function autoStoreProcessedLabResult(result) {
  if (!activeId) return;
  if (!result || !result.resLabs || !result.resLabs.length) return;
  var fecha = (result.patient && result.patient.fecha) ? result.patient.fecha : '';
  var hora = '';
  if (isDuplicateLatestLabSet(activeId, result.resLabs, fecha, hora)) {
    showToast('Resultado ya registrado en historial', 'success');
    return;
  }
  pushLabHistory(activeId, result.resLabs, fecha, hora);
  saveState();
  renderLabHistoryPanel();
  if (activeInner === 'tend' && activeAppTab === 'nota') renderTendencias();
}

function insertLabsAsRecent(lines) {
  if (!notes[activeId]) notes[activeId] = {};
  pushLabHistory(activeId, activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '');
  rebuildEstudiosFromLabHistory(activeId);
  saveState();
  if (activeInner === 'tend' && activeAppTab === 'nota') renderTendencias();
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
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '');
  rebuildEstudiosFromLabHistory(activeId);
  saveState();
  if (activeInner === 'tend' && activeAppTab === 'nota') renderTendencias();
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
      activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '');
    rebuildEstudiosFromLabHistory(activeId);
    saveState();
    if (activeInner === 'tend' && activeAppTab === 'nota') renderTendencias();
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
    renderOutput(result);
    renderDiagramas(result.resLabs);
    autoStoreProcessedLabResult(result);
    if (!result.resLabs.length) showToast('No se encontraron resultados de laboratorio','error');
  } catch(e) { showToast('Error al procesar el reporte','error'); console.error(e); }
}

function renderOutput(result) {
  var patient = result.patient, resLabs = result.resLabs;
  activeLab = result;
  onboardingAdvanceAfterParse();
  if (patient.name) {
    document.getElementById('lab-patient-name').textContent = patient.name;
    document.getElementById('lab-patient-meta').textContent = [
      patient.expediente ? 'Exp: '+patient.expediente : '',
      patient.sexo, patient.edad || '', patient.fecha
    ].filter(Boolean).join('  |  ');
    document.getElementById('lab-banner').style.display = 'block';
  }
  var box = document.getElementById('lab-output-box');
  box.innerHTML = '';
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
function openAddModal() {
  document.getElementById('modal-title').textContent = 'Nuevo Paciente';
  document.getElementById('modal-prefilled').style.display = 'none';
  document.getElementById('modal-manual-full').style.display = 'block';
  ['nombre-manual','registro-manual','area','servicio','cuarto','cama'].forEach(function(f){
    var el = document.getElementById('m-'+f); if(el) el.value='';
  });
  document.getElementById('m-edad-manual-num').value = '';
  document.getElementById('m-edad-manual-unit').value = 'años';
  document.getElementById('m-sexo').value = 'F';
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
  // Populate edad: split "52 años" → num=52, unit=años
  var edadParts = (p.edad||'').split(' ');
  document.getElementById('m-edad-num').value  = edadParts[0] || '';
  document.getElementById('m-edad-unit').value = edadParts[1] || 'años';
  // Populate sexo dropdown
  document.getElementById('m-sexo-ro').value = (p.sexo==='M') ? 'M' : 'F';
  ['area','servicio','cuarto','cama'].forEach(function(f){ document.getElementById('m-'+f).value=''; });
  document.getElementById('modal').classList.add('open');
  setTimeout(function(){ document.getElementById('m-area').focus(); }, 120);
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target !== document.getElementById('modal')) return;
  var hasData = ['m-area','m-servicio','m-cuarto','m-cama'].some(function(id){ return document.getElementById(id).value.trim(); });
  if (hasData && !confirm('¿Cerrar sin guardar?')) return;
  closeModal();
});

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
  var mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
    e.preventDefault();
    if (e.key === '1') switchAppTab('lab');
    if (e.key === '2') switchAppTab('nota');
    if (e.key === '3') {
      var pb = document.getElementById('profile-body');
      if (pb && pb.style.display === 'none') toggleProfileSection();
    }
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
  var nombre, registro, edad, sexo;
  if (isFromLab) {
    nombre   = (document.getElementById('m-nombre').value||'').trim().toUpperCase();
    registro = (document.getElementById('m-registro').value||'').trim();
    var edNum = (document.getElementById('m-edad-num').value||'').trim();
    var edUnit = document.getElementById('m-edad-unit').value || 'años';
    edad = edNum ? (edNum + ' ' + edUnit) : '';
    sexo = document.getElementById('m-sexo-ro').value || 'F';
  } else {
    nombre   = (document.getElementById('m-nombre-manual').value||'').trim().toUpperCase();
    registro = (document.getElementById('m-registro-manual').value||'').trim();
    var edNumM = (document.getElementById('m-edad-manual-num').value||'').trim();
    var edUnitM = document.getElementById('m-edad-manual-unit').value || 'años';
    edad = edNumM ? (edNumM + ' ' + edUnitM) : '';
    sexo     = document.getElementById('m-sexo').value;
  }
  if (!nombre) { showToast('Ingresa el nombre del paciente','error'); return; }
  var area     = (document.getElementById('m-area').value||'').trim().toUpperCase();
  var servicio = (document.getElementById('m-servicio').value||'').trim().toUpperCase();
  var cuarto   = (document.getElementById('m-cuarto').value||'').trim();
  var cama     = (document.getElementById('m-cama').value||'').trim();
  if (!cuarto || !cama) { showToast('Ingresa cuarto y cama','error'); return; }

  var dup = findDuplicatePatient(nombre, registro);
  if (dup) {
    showDuplicateWarning(dup, function() {
      commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
    });
    return;
  }
  commitPatient(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
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
function renderNoteForm() {
  var patient = patients.find(function(p){ return p.id===activeId; });
  if (!patient) return;
  if (activeId) {
    if (!notes[activeId]) notes[activeId] = {};
    if (applyProfileToNoteIfEmpty(notes[activeId])) saveState();
  }
  var note = notes[activeId] || {};
  document.getElementById('note-form').innerHTML = (
    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:flex;flex-direction:column;gap:10px;">' +
    '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" oninput="updatePatient(\'nombre\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 80px 60px;gap:10px;">' +
    '<div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" oninput="updatePatient(\'registro\',this.value)"></div>' +
    '<div class="field-group"><label>Edad</label><input type="text" value="' + esc(patient.edad) + '" oninput="updatePatient(\'edad\',this.value)"></div>' +
    '<div class="field-group"><label>Sexo</label><select onchange="updatePatient(\'sexo\',this.value)"><option value="M"' + (patient.sexo==='M'?' selected':'') + '>M</option><option value="F"' + (patient.sexo==='F'?' selected':'') + '>F</option></select></div></div>' +
    '<div class="field-group"><label>Área</label><input type="text" value="' + esc(patient.area) + '" oninput="updatePatient(\'area\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div class="field-group"><label>Servicio</label><input type="text" value="' + esc(patient.servicio) + '" oninput="updatePatient(\'servicio\',this.value)" style="text-transform:uppercase;"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
    '<div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" oninput="updatePatient(\'cuarto\',this.value)"></div>' +
    '<div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" oninput="updatePatient(\'cama\',this.value)"></div></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#374151;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group"><label>Fecha</label><input type="text" value="' + esc(note.fecha) + '" oninput="updateNote(\'fecha\',this.value)" placeholder="DD/MM/AAAA"></div>' +
    '<div class="field-group"><label>Hora</label><input type="text" value="' + esc(note.hora) + '" oninput="updateNote(\'hora\',this.value)" placeholder="HH:MM"></div>' +
    '</div></div></div>' +

    '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Resumen de Interrogatorio, Exploración Física y Estado Mental</div><div class="card-body"><div class="field-group"><textarea rows="5" placeholder="Ingresa el resumen de interrogatorio, exploración física y estado mental..." oninput="updateNote(\'interrogatorio\',this.value)">' + esc(note.interrogatorio) + '</textarea></div></div></div>' +

    '<div class="card"><div class="card-header" style="background:#065f46;display:flex;align-items:center;justify-content:space-between;"><span style="display:flex;align-items:center;gap:8px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Evolución y Actualización del Cuadro Clínico</span><button onclick="openSOAPModal()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:white;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.25)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.15)\'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>Plantilla SOAP</button></div><div class="card-body"><div class="field-group"><textarea rows="7" placeholder="N: [Neurológico]&#10;V: [Ventilatorio]&#10;HD: [Hemodinámico]&#10;HI: [Infeccioso]&#10;NM: [Nutricional/Metabólico]" oninput="updateNote(\'evolucion\',this.value)">' + esc(note.evolucion) + '</textarea></div></div></div>' +

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
  if (format === 'html') {
    exportCurrentPatientAsHtml();
    return;
  }
  if (format === 'txt') {
    exportCurrentPatientAsText();
    return;
  }
  if (activeInner === 'indica') {
    generateIndicaciones();
  } else {
    generateWord();
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
  fetch('/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient:patient,note:note,outputDir:settings.outputDir||''})})
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (d.ok) {
      showToast('Nota guardada: '+d.fileName,'success');
      guidedTourAdvanceAfterNotaGenerated();
    } else showToast('Error: '+d.error,'error');
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

function renderTendencias() {
  var container = document.getElementById('tendencias-container');
  if (!container) return;
  Object.keys(sparkCharts).forEach(function(k) {
    if (sparkCharts[k]) { sparkCharts[k].destroy(); delete sparkCharts[k]; }
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
  var available = TEND_PARAMS.filter(function(p) {
    return history.filter(function(s){ return s.parsed && s.parsed[p] !== null && s.parsed[p] !== undefined; }).length >= 2;
  });
  if (!available.length) {
    container.innerHTML = '<p class="tend-empty">No hay parámetros con suficientes datos para graficar.</p>';
    return;
  }
  container.innerHTML = '<div class="tend-grid">' + available.map(function(param) {
    var setsDesc = history.filter(function(s){ return s.parsed && s.parsed[param] !== null && s.parsed[param] !== undefined; });
    var latest = setsDesc.length ? setsDesc[0].parsed[param] : null;
    var ref = TEND_REF[param];
    var isAb = ref && (latest < ref[0] || latest > ref[1]);
    return '<div class="tend-card" onclick="openTendDetail(\'' + param + '\')" data-param="' + param + '">'
      + '<div class="tend-card-header">'
      + '<span class="tend-param-name">' + param + '</span>'
      + '<span class="tend-param-value' + (isAb ? ' tend-abnormal' : '') + '">' + latest + '</span>'
      + '</div>'
      + '<div class="tend-unit">' + (TEND_UNITS[param] || '') + '</div>'
      + '<div class="tend-spark-wrap"><canvas id="spark-' + param + '"></canvas></div>'
      + '</div>';
  }).join('') + '</div>';
  available.forEach(function(param) {
    var setsDesc = history.filter(function(s){ return s.parsed && s.parsed[param] !== null && s.parsed[param] !== undefined; });
    var setsAsc = toTrendAscendingSets(setsDesc);
    var labels = buildTendChartLabels(setsAsc);
    var values = setsAsc.map(function(s){ return s.parsed[param]; });
    var canvas = document.getElementById('spark-' + param);
    if (!canvas) return;
    sparkCharts[param] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{ data: values, borderColor: '#10b981', borderWidth: 2,
          pointRadius: 2, pointBackgroundColor: '#10b981', tension: 0.3, fill: false,
          clip: false }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { left: 6, right: 6, top: 8, bottom: 6 } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false, grid: { display: false }, offset: true },
          y: { display: false, grid: { display: false }, grace: '12%' }
        }
      }
    });
  });
}

function openTendDetail(param) {
  if (!activeId) return;
  var history = sortLabHistoryChronological(ensureParsedLabHistory(activeId));
  var setsDesc = history.filter(function(s){ return s.parsed && s.parsed[param] !== null && s.parsed[param] !== undefined; });
  if (setsDesc.length < 2) return;
  var setsAsc = toTrendAscendingSets(setsDesc);
  var labels = buildTendChartLabels(setsAsc);
  var values = setsAsc.map(function(s){ return s.parsed[param]; });
  var ref = TEND_REF[param];
  var unit = TEND_UNITS[param] || '';
  document.getElementById('tend-detail-title').textContent = param + (unit ? ' (' + unit + ')' : '');
  var backdrop = document.getElementById('tend-detail-backdrop');
  backdrop.style.display = 'flex';
  var canvas = document.getElementById('tend-detail-canvas');
  if (detailChart) { detailChart.destroy(); detailChart = null; }
  var datasets = [{
    label: param,
    data: values,
    borderColor: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 2.5,
    pointRadius: 5,
    pointBackgroundColor: '#10b981',
    tension: 0.3,
    fill: false
  }];
  if (ref) {
    datasets.push({
      label: 'Ref min', data: Array(values.length).fill(ref[0]),
      borderColor: 'rgba(0,0,0,0.12)', borderWidth: 1, borderDash: [4,4],
      pointRadius: 0, fill: false
    });
    datasets.push({
      label: 'Ref max', data: Array(values.length).fill(ref[1]),
      borderColor: 'rgba(0,0,0,0.12)', borderWidth: 1, borderDash: [4,4],
      pointRadius: 0, fill: '-1',
      backgroundColor: 'rgba(0,0,0,0.04)'
    });
  }
  detailChart = new Chart(canvas, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return ctx.datasetIndex === 0 ? param + ': ' + ctx.parsed.y + ' ' + unit : null;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 12 } } },
        y: { ticks: { font: { size: 12 } }, title: { display: true, text: unit, font: { size: 11 } } }
      }
    }
  });
}

function closeTendDetail() {
  document.getElementById('tend-detail-backdrop').style.display = 'none';
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
  fetch('/generate-indicaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient:patient,indicaciones:ind,outputDir:settings.outputDir||''})})
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (d.ok) {
      showToast('Indicaciones guardadas: '+d.fileName,'success');
      guidedTourAdvanceAfterIndicaGenerated();
    } else showToast('Error: '+d.error,'error');
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
      var releaseNotes = '';
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

function buildUndoSnapshotPayload(label) {
  return {
    label: label || 'operación',
    at: new Date().toISOString(),
    theme: localStorage.getItem('theme') || 'light',
    activeId: activeId,
    data: {
      patients: JSON.parse(localStorage.getItem('rpc-patients') || '[]'),
      notes: JSON.parse(localStorage.getItem('rpc-notes') || '{}'),
      indicaciones: JSON.parse(localStorage.getItem('rpc-indicaciones') || '{}'),
      labHistory: JSON.parse(localStorage.getItem('rpc-labHistory') || '{}'),
      settings: JSON.parse(localStorage.getItem('rpc-settings') || '{}')
    }
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
  try {
    saveState();
  } catch (_e) { /* continue */ }
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
  localStorage.setItem('rpc-settings', JSON.stringify(snap.data.settings || {}));
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
  guidedTourIntroStart,
  guidedTourIntroSkip,
  skipGuidedTour,
  guidedTourClickNext,
  openAddModal,
  onPatientSearchInput,
  toggleProfileSection,
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
  deleteLabHistorySet,
  toggleLabHistoryPanel,
  openAddModalFromLab,
  copiarLabsAlPortapapeles,
  enviarLabsANota,
  closeModal,
  savePatient,
  closeTemplatesModal,
  saveTemplates,
  closeSOAPModal,
  insertSOAPText,
  updateSOAPBalance,
  closeTendDetail,
  selectPatient,
  deletePatient,
  openSOAPModal,
  updatePatient,
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
  applyExtraTemplateFromIndica
});
