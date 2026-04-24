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


// ════════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════════
var patients     = storage.getPatients();
var notes        = storage.getNotes();
var indicaciones = storage.getIndicaciones();
var labHistory   = storage.getLabHistory();
var activeId     = null;
var activeInner  = 'notas';
var activeAppTab = 'lab';
var patientSearchFilter = '';
var activeLab    = null;
var settings     = storage.getSettings();
var sparkCharts  = {};
var detailChart  = null;

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

function parseFechaLabToMs(fechaStr, horaStr) {
  if (!fechaStr) return 0;
  var t = String(fechaStr).trim();
  if (t === 'Anterior') return -864e8;
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
  return 0;
}

function sortLabHistoryChronological(hist) {
  return (hist || []).slice().sort(function(a, b) {
    var ta = parseFechaLabToMs(a.fecha, a.hora);
    var tb = parseFechaLabToMs(b.fecha, b.hora);
    if (ta !== tb) return ta - tb;
    var na = parseInt(a.id, 10) || 0;
    var nb = parseInt(b.id, 10) || 0;
    return na - nb;
  });
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

// ── Lab History Migration ─────────────────────────────────────────
(function migrateLabHistory() {
  if (localStorage.getItem('rpc-labHistory')) return;
  patients.forEach(function(p) {
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
  });
  localStorage.setItem('rpc-labHistory', JSON.stringify(labHistory));
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

// Set correct icon on load
(function() {
  if (document.documentElement.classList.contains('dark')) {
    document.getElementById('theme-toggle').textContent = '🌙';
  }
})();

document.getElementById('today-date').textContent =
  new Date().toLocaleDateString('es-MX', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
renderPatientList();
if (patients.length > 0) selectPatient(patients[0].id);
applyFontZoom();
loadSettings();
syncThemeSettingsButtons();
initGuidedTourGate();
initRpcServerHealthWatch();

function switchAppTab(tab) {
  activeAppTab = tab;
  document.getElementById('apptab-lab').classList.toggle('active', tab === 'lab');
  document.getElementById('apptab-nota').classList.toggle('active', tab === 'nota');
  document.getElementById('appcontent-lab').style.display  = tab === 'lab'  ? 'flex' : 'none';
  document.getElementById('appcontent-nota').style.display = tab === 'nota' ? 'flex' : 'none';
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
}

function deletePatient(e, id) {
  e.stopPropagation();
  if (!confirm('¿Eliminar este paciente y sus notas?')) return;
  patients = patients.filter(function(p){ return p.id !== id; });
  delete notes[id]; delete indicaciones[id];
  saveState();
  if (activeId === id) activeId = patients.length ? patients[0].id : null;
  renderPatientList();
  if (activeId) selectPatient(activeId);
  else { document.getElementById('patient-view').style.display='none'; document.getElementById('empty-state').style.display='flex'; }
}

function saveState() {
  storage.saveAll(patients, notes, indicaciones, labHistory);
}

// ── Settings ──────────────────────────────────────────────────────
function loadSettings() {
  if (!settings) settings = {};
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
  var verEl = document.getElementById('settings-app-version');
  if (verEl) {
    if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
      window.electronAPI.getAppVersion().then(function(v) {
        verEl.textContent = v || '—';
        var LAST_SEEN_VERSION_KEY = 'rplus-last-seen-app-version';
        var prev = localStorage.getItem(LAST_SEEN_VERSION_KEY);
        if (prev && v && prev !== v) {
          showToast('Actualizado a v' + v + '. Consulta Ajustes o el menú para buscar actualizaciones.', 'success');
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
}

function saveSettings() {
  settings.doctorName   = (document.getElementById('profile-doctor').value   || '').trim();
  settings.profesorName = (document.getElementById('profile-profesor').value || '').trim();
  settings.grado        = (document.getElementById('profile-grado').value    || '').trim();
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
}
function closeSettingsDropdown() {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (dd) dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
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

function checkRpcServerHealth() {
  fetch('/health', { method: 'GET', cache: 'no-store' })
    .then(function(r) {
      if (!r.ok) throw new Error('bad status');
      return r.json();
    })
    .then(function(j) {
      if (!j || !j.ok) throw new Error('bad payload');
      setRpcOfflineVisible(false);
    })
    .catch(function() {
      setRpcOfflineVisible(true);
    });
}

function initRpcServerHealthWatch() {
  checkRpcServerHealth();
  setInterval(checkRpcServerHealth, 15000);
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

function openQuickHelp() {
  var el = document.getElementById('help-quick-backdrop');
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  closeSettingsDropdown();
}

function closeQuickHelp() {
  var el = document.getElementById('help-quick-backdrop');
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

function safeExportSlug(str) {
  var s = (str || 'paciente').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+/g, '_').replace(/^_|_$/g, '');
  return (s || 'paciente').slice(0, 48);
}

// ── Respaldo local (exportar / importar JSON) ─────────────────────
function exportDataBackup() {
  saveState();
  var payload = {
    format: 'r-plus-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    theme: localStorage.getItem('theme') || 'light',
    guidedTourDoneForVersion: localStorage.getItem(GUIDED_TOUR_LS_KEY),
    data: {
      patients: JSON.parse(localStorage.getItem('rpc-patients') || '[]'),
      notes: JSON.parse(localStorage.getItem('rpc-notes') || '{}'),
      indicaciones: JSON.parse(localStorage.getItem('rpc-indicaciones') || '{}'),
      labHistory: JSON.parse(localStorage.getItem('rpc-labHistory') || '{}'),
      settings: JSON.parse(localStorage.getItem('rpc-settings') || '{}')
    }
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  var d = new Date();
  var ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  a.download = 'R-plus-respaldo-' + ds + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
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
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  var d = new Date();
  var ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  a.download = 'R-plus-paciente-' + safeExportSlug(patient.nombre) + '-' + ds + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast('Paciente exportado', 'success');
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
      showToast('Paciente importado correctamente.', 'success');
    } catch (_err) {
      showToast('No se pudo leer la exportación de paciente.', 'error');
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
      location.reload();
    } catch (err) {
      showToast('No se pudo leer el respaldo', 'error');
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
  var existing = (notes[activeId] && notes[activeId].estudios) ? notes[activeId].estudios : '';
  var existingLines = existing.split('\n');
  var recentDate = existingLines[3] ? existingLines[3].trim() : '';
  if (!recentDate) {
    insertLabsAsRecent(lines);
  } else {
    showLabConflictModal(lines, recentDate);
  }
}

function pushLabHistory(patientId, resLabs, fecha, hora) {
  if (!patientId || !resLabs || !resLabs.length) return;
  if (!labHistory[patientId]) labHistory[patientId] = [];
  var fechaNorm = normalizeFechaLabHistory(fecha) || (fecha || '');
  var set = {
    id: Date.now().toString(),
    fecha: fechaNorm,
    hora: hora || '',
    resLabs: resLabs,
    parsed: extractParsedValues(resLabs)
  };
  labHistory[patientId].push(set);
}

function insertLabsAsRecent(lines) {
  if (!notes[activeId]) notes[activeId] = {};
  var existing = (notes[activeId].estudios || '').split('\n');
  var anterior = existing.slice(0, 3);
  while (anterior.length < 3) anterior.push('');
  notes[activeId].estudios = anterior.concat(lines).join('\n');
  pushLabHistory(activeId, activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '');
  saveState();
  if (activeInner === 'tend' && activeAppTab === 'nota') renderTendencias();
  var el = document.querySelector('#note-form textarea[oninput*="estudios"]');
  if (el) el.value = notes[activeId].estudios;
  onboardingAdvanceAfterSend();
  showToast('Labs enviados a la nota ✓', 'success');
  switchAppTab('nota');
}

function insertLabsAsAnteriorThenRecent(newLines) {
  if (!notes[activeId]) notes[activeId] = {};
  var existing = (notes[activeId].estudios || '').split('\n');
  // Move slots 3,5,6 from current recent to anterior: date/QS/ESC
  var anteriorDate = existing[3] || '';
  var anteriorQS   = existing[5] || '';
  var anteriorESC  = existing[6] || '';
  var anteriorBlock = [anteriorDate, anteriorQS, anteriorESC];
  notes[activeId].estudios = anteriorBlock.concat(newLines).join('\n');
  pushLabHistory(activeId, activeLab.resLabs,
    activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '');
  saveState();
  if (activeInner === 'tend' && activeAppTab === 'nota') renderTendencias();
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
    var existing = (notes[activeId].estudios || '').split('\n');
    var anterior = existing.slice(0, 3);
    while (anterior.length < 3) anterior.push('');
    notes[activeId].estudios = anterior.concat(newLines).join('\n');
    pushLabHistory(activeId, activeLab.resLabs,
      activeLab.patient && activeLab.patient.fecha ? activeLab.patient.fecha : '', '');
    saveState();
    if (activeInner === 'tend' && activeAppTab === 'nota') renderTendencias();
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

    '<div class="action-bar"><button class="btn-generate" onclick="generateWord()" id="btn-gen"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Nota (.docx)</button></div>'
  );
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

function generateWord() {
  var patient = patients.find(function(p){ return p.id===activeId; }); if (!patient) return;
  var note = notes[activeId]; if (!note) return;
  var btn = document.getElementById('btn-gen'); btn.classList.add('loading'); btn.disabled=true;
  fetch('/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient:patient,note:note,outputDir:settings.outputDir||''})})
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (d.ok) {
      showToast('Nota guardada: '+d.fileName,'success');
      guidedTourAdvanceAfterNotaGenerated();
    } else showToast('Error: '+d.error,'error');
  })
  .catch(function(){ showToast('Error de conexión','error'); })
  .finally(function(){ btn.classList.remove('loading'); btn.disabled=false; });
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

    SECTIONS.map(function(s){ return '<div class="indica-section"><div class="indica-section-header">'+s.label+'</div><div class="indica-section-body"><textarea rows="3" placeholder="'+s.placeholder+'" oninput="updateIndica(\''+s.key+'\',this.value)">'+esc(ind[s.key])+'</textarea></div></div>'; }).join('') +

    '<div class="card"><div class="card-header" style="background:#4a1d96;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 4v16m8-8H4"/></svg>Otros</div><div class="card-body" style="display:flex;flex-direction:column;gap:10px;"><div id="otros-list">' +
    (ind.otros||[]).map(function(o,i){ return '<div class="otros-item"><button class="btn-remove-otro" onclick="removeOtro('+i+')">×</button><input type="text" placeholder="TÍTULO DE LA SECCIÓN" value="'+esc(o.titulo)+'" oninput="updateOtro('+i+',\'titulo\',this.value)"><textarea rows="2" placeholder="Indicaciones..." oninput="updateOtro('+i+',\'contenido\',this.value)">'+esc(o.contenido)+'</textarea></div>'; }).join('') +
    '</div><button class="btn-add-row" onclick="addOtro()">+ Agregar sección</button></div></div>' +

    '<div class="action-bar"><button class="btn-generate" onclick="generateIndicaciones()" id="btn-gen-ind"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Indicaciones (.docx)</button></div>'
  );
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
    var sets = history.filter(function(s){ return s.parsed && s.parsed[param] !== null && s.parsed[param] !== undefined; });
    var latest = sets.length ? sets[sets.length - 1].parsed[param] : null;
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
    var sets = history.filter(function(s){ return s.parsed && s.parsed[param] !== null && s.parsed[param] !== undefined; });
    var labels = buildTendChartLabels(sets);
    var values = sets.map(function(s){ return s.parsed[param]; });
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
  var sets = history.filter(function(s){ return s.parsed && s.parsed[param] !== null && s.parsed[param] !== undefined; });
  if (sets.length < 2) return;
  var labels = buildTendChartLabels(sets);
  var values = sets.map(function(s){ return s.parsed[param]; });
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

var LINE='stroke="#555" stroke-width="1.5"';

function sp(x,y,lbl,obj,anchor){
  anchor=anchor||'middle';
  var isAb=obj&&obj.ab;
  var vc=isAb?'#cc0000':'#111111';
  var vt=obj?escTxt(obj.val):'—';
  var dec=isAb?' text-decoration="underline"':'';
  return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="10" fill="#888" font-family="Arial,sans-serif">'+lbl+'</text>'
        +'<text x="'+x+'" y="'+(y+15)+'" text-anchor="'+anchor+'" font-size="13" fill="'+vc+'" font-weight="bold" font-family="Arial,sans-serif"'+dec+'>'+vt+'</text>';
}

function svgBH(secs){
  var hb =g(secs,'BH','Hb'),  hto=g(secs,'BH','Hto');
  var leu=g(secs,'BH','Leu'), neu=g(secs,'BH','Neu');
  var plt=g(secs,'BH','Plt');
  if(!hb)return null;
  return '<svg viewBox="0 0 300 192" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">'
    +'<line x1="50"  y1="18"  x2="250" y2="182" '+LINE+'/>'
    +'<line x1="250" y1="18"  x2="50"  y2="182" '+LINE+'/>'
    +'<line x1="28"  y1="79"  x2="78"  y2="79"  '+LINE+'/>'
    +sp(150, 33, 'HB',   hb,  'middle')
    +sp(150,122, 'HCTO', hto, 'middle')
    +sp(204, 75, 'PLT',  plt, 'start')
    +sp(75,  55, 'LEU',  leu, 'end')
    +sp(75,  94, 'NEU',  neu, 'end')
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
    var vc = obj&&obj.ab ? '#cc0000' : '#111';
    var vt = obj ? escTxt(obj.val) : '—';
    var dec = obj&&obj.ab ? ' text-decoration="underline"' : '';
    var ly = isTop ? 27 : 78;
    var vy = isTop ? 42 : 96;
    return '<text x="'+x+'" y="'+ly+'" text-anchor="middle" font-size="10" fill="#888" font-family="Arial,sans-serif">'+lbl+'</text>'
          +'<text x="'+x+'" y="'+vy+'" text-anchor="middle" font-size="14" fill="'+vc+'" font-weight="bold" font-family="Arial,sans-serif"'+dec+'>'+vt+'</text>';
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
    +sp(406, 53, 'Glu', glu, 'middle')
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
    var vc = obj&&obj.ab ? '#cc0000' : '#111';
    var vt = obj ? escTxt(obj.val) : '—';
    var dec = obj&&obj.ab ? ' text-decoration="underline"' : '';
    return '<text x="'+x+'" y="'+y_lbl+'" text-anchor="middle" font-size="10" fill="#888" font-family="Arial,sans-serif">'+lbl+'</text>'
          +'<text x="'+x+'" y="'+(y_lbl+15)+'" text-anchor="middle" font-size="14" fill="'+vc+'" font-weight="bold" font-family="Arial,sans-serif"'+dec+'>'+vt+'</text>';
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
    var vc = obj&&obj.ab ? '#cc0000' : '#111';
    var vt = obj ? escTxt(obj.val) : '—';
    var dec = obj&&obj.ab ? ' text-decoration="underline"' : '';
    return '<text x="'+x+'" y="'+y_lbl+'" text-anchor="middle" font-size="10" fill="#888" font-family="Arial,sans-serif">'+lbl+'</text>'
          +'<text x="'+x+'" y="'+(y_lbl+15)+'" text-anchor="middle" font-size="14" fill="'+vc+'" font-weight="bold" font-family="Arial,sans-serif"'+dec+'>'+vt+'</text>';
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
  var cx=135, jY=68;
  return '<svg viewBox="0 0 270 172" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">'
    +'<line x1="'+cx+'" y1="10"  x2="'+cx+'" y2="'+jY+'" '+LINE+'/>'
    +'<line x1="'+cx+'" y1="'+jY+'" x2="28"  y2="148" '+LINE+'/>'
    +'<line x1="'+cx+'" y1="'+jY+'" x2="242" y2="148" '+LINE+'/>'
    +sp(cx-52, 30, 'TP',  tp,  'middle')
    +sp(cx+52, 30, 'TTP', ttp, 'middle')
    +sp(cx,   148, 'INR', inr, 'middle')
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
  var patient = patients.find(function(p){ return p.id===activeId; }); if (!patient) return;
  var ind = indicaciones[activeId]; if (!ind) return;
  var btn = document.getElementById('btn-gen-ind'); btn.classList.add('loading'); btn.disabled=true;
  fetch('/generate-indicaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patient:patient,indicaciones:ind,outputDir:settings.outputDir||''})})
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (d.ok) {
      showToast('Indicaciones guardadas: '+d.fileName,'success');
      guidedTourAdvanceAfterIndicaGenerated();
    } else showToast('Error: '+d.error,'error');
  })
  .catch(function(){ showToast('Error de conexión','error'); })
  .finally(function(){ btn.classList.remove('loading'); btn.disabled=false; });
}

// ── Auto-updater UI (modal) ───────────────────────────────────────
var UPDATE_SNOOZE_KEY = 'rplus-update-snooze-until';
var UPDATE_DISMISS_VER_KEY = 'rplus-update-dismiss-version';
var pendingUpdaterTargetVersion = null;

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
    var version = (payload && payload.version) ? payload.version : String(payload || '');
    var releaseNotes = (payload && payload.releaseNotes) ? String(payload.releaseNotes) : '';
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
  });

  window.electronAPI.onUpdateProgress(function(payload) {
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
  });

  window.electronAPI.onUpdateReady(function(payload) {
    var version = (payload && payload.version) ? payload.version : String(payload || '');
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
  });

  window.electronAPI.onUpdateNotAvailable(function() {
    pendingUpdaterTargetVersion = null;
    showToast('R+ está actualizado.', 'success');
  });

  window.electronAPI.onUpdateError(function(msg) {
    renderUpdateError(msg);
  });
}

Object.assign(window, {
  installUpdate,
  toggleTheme,
  setThemeMode,
  setFontZoom,
  openUserDataFolderFromSettings,
  openQuickHelp,
  closeQuickHelp,
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
  chooseOutputDir,
  openTemplatesModal,
  saveSettings,
  resetAndStartOnboarding,
  exportDataBackup,
  exportActivePatientBackup,
  triggerImportActivePatientBackup,
  triggerImportBackup,
  onPatientBackupFileChosen,
  onBackupFileChosen,
  procesarReporte,
  limpiarReporte,
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
  generateWord,
  updateIndica,
  removeOtro,
  addOtro,
  generateIndicaciones,
  openTendDetail
});
