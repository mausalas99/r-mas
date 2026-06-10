/** Auto-backup scheduler, JSON export/import, sync bundle encrypt/decrypt. */
import { storage } from '../../storage.js';
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  medPharmProfileByPatient,
  listadoProblemas,
  replaceAppStateFromBackupData,
  setMedPharmProfileByPatient,
  saveState,
  setPatients,
  setNotes,
  setIndicaciones,
  setLabHistory,
  setMedRecetaByPatient,
} from '../../app-state.mjs';
import { mergePatientMonitoreoFromImported } from '../estado-actual-data.mjs';
import { mergeCensoPatientFields } from '../../patient-diagnosticos.mjs';
import { mergePatientRegistrationMeta } from '../../patient-registration-meta.mjs';
import {
  describePatientImportRejection,
  parsePatientImportJsonText,
} from '../../patient-export-format.mjs';
import {
  renderPatientList,
  selectPatient,
  findPatientByRegistro,
  generatePatientId,
  ensureUniquePatientName,
  buildPatientEntry,
} from '../patients.mjs';
import { GUIDED_TOUR_LS_KEY } from '../settings-help/tour-state.mjs';
import { isTourDemoPatientId } from '../../tour-demo-patient.mjs';
import {
  AUTO_BACKUP_INDEX_KEY,
  AUTO_BACKUP_MAX,
  AUTO_BACKUP_SETTINGS_KEY,
  PREIMPORT_BACKUP_KEY,
  formatDateSlug,
  downloadJsonPayload,
  downloadBlob,
  downloadTextPayload,
} from './shared.mjs';
import { addAuditEntry } from './audit.mjs';
import { safeExportSlug } from './offline.mjs';
import { getPlatformRuntime } from './runtime.mjs';
import { initUpdateChannelAndGate } from './updater.mjs';

const rt = getPlatformRuntime();
var autoBackupSchedulerId = null;

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

async function persistFullBackupPayload(payload) {
  if (!payload || !payload.data) throw new Error('invalid-backup');
  replaceAppStateFromBackupData(payload.data);
  try {
    localStorage.setItem(
      'rpc-scheduled-procedures',
      JSON.stringify(
        Array.isArray(payload.data.scheduledProcedures) ? payload.data.scheduledProcedures : []
      )
    );
  } catch (_e) {}
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
  var result = await saveState({ immediate: true });
  if (!result || !result.ok) {
    throw new Error((result && result.code) || 'SAVE_FAILED');
  }
  return result;
}

function restorePreimportBackupPrompt() {
  var raw = localStorage.getItem(PREIMPORT_BACKUP_KEY);
  if (!raw) {
    rt.showToast(
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
    rt.showToast('La copia automática previa está dañada.', 'error');
    return;
  }
  if (!payload || payload.format !== 'r-plus-backup' || payload.version !== 1 || !payload.data) {
    rt.showToast('Formato de respaldo no válido.', 'error');
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
  if (typeof pushUndoSnapshot === 'function') rt.pushUndoSnapshot('Antes de restaurar copia pre-importación');
  persistFullBackupPayload(payload)
    .then(function () {
      addAuditEntry('preimport-restore', 'ok', n, payload.exportedAt || '');
      location.reload();
    })
    .catch(function () {
      rt.showToast('No se pudo restaurar la copia automática.', 'error');
    });
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

async function runAutoBackupNow(isScheduled) {
  await saveState({ immediate: true });
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
  rt.showToast('Auto-respaldo generado', 'success');
}

function initGoalGFeatures() {
  syncAutoBackupUi();
  maybeRunScheduledAutoBackup();
  restartAutoBackupScheduler();
  initUpdateChannelAndGate();
}

/** Snapshot for backup export — uses in-memory app state (what is on screen), not stale localStorage. */
function buildBackupDataFromMemory() {
  var filteredPatients = patients.filter(function (p) {
    return p && !p.isDemo;
  });
  var notesPersist = {};
  Object.keys(notes || {}).forEach(function (k) {
    if (notes[k] && !String(k).startsWith('demo-')) notesPersist[k] = notes[k];
  });
  var indPersist = {};
  Object.keys(indicaciones || {}).forEach(function (k) {
    if (indicaciones[k] && !String(k).startsWith('demo-')) indPersist[k] = indicaciones[k];
  });
  var lhPersist = {};
  Object.keys(labHistory || {}).forEach(function (k) {
    if (!String(k).startsWith('demo-')) lhPersist[k] = labHistory[k];
  });
  var medPersist = {};
  Object.keys(medRecetaByPatient || {}).forEach(function (k) {
    if (!String(k).startsWith('demo-')) medPersist[k] = medRecetaByPatient[k];
  });
  var medPharmPersist = {};
  Object.keys(medPharmProfileByPatient || {}).forEach(function (k) {
    if (!String(k).startsWith('demo-')) medPharmPersist[k] = medPharmProfileByPatient[k];
  });
  var listPersist = {};
  Object.keys(listadoProblemas || {}).forEach(function (k) {
    if (listadoProblemas[k] && !String(k).startsWith('demo-')) listPersist[k] = listadoProblemas[k];
  });
  var settings = rt.getSettings();
  if (!settings || typeof settings !== 'object' || !Object.keys(settings).length) {
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
    settings: settings,
    medCatalog: storage.getMedCatalog(),
  };
}

function buildFullBackupPayload() {
  return {
    format: 'r-plus-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    theme: localStorage.getItem('theme') || 'light',
    guidedTourDoneForVersion: localStorage.getItem(GUIDED_TOUR_LS_KEY),
    data: buildBackupDataFromMemory(),
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
  if (typeof window !== 'undefined' && window.__rpcPreferImportOverwrite === true) {
    return 'overwrite';
  }
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
    if (entry.patient.viaAcceso) existing.viaAcceso = entry.patient.viaAcceso;
    mergeCensoPatientFields(existing, entry.patient);
    mergePatientRegistrationMeta(existing, entry.patient);
    existing.registro = entry.patient.registro || existing.registro;
    notes[existing.id] = entry.note || {};
    indicaciones[existing.id] = entry.indicaciones || {};
    labHistory[existing.id] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
    if (entry.medReceta) medRecetaByPatient[existing.id] = entry.medReceta;
    else delete medRecetaByPatient[existing.id];
    if (entry.medPharmProfile) medPharmProfileByPatient[existing.id] = entry.medPharmProfile;
    else delete medPharmProfileByPatient[existing.id];
    mergePatientMonitoreoFromImported(existing, entry.patient);
    return existing.id;
  }
  var newId = generatePatientId();
  var newPatient = {
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
  };
  mergePatientMonitoreoFromImported(newPatient, entry.patient);
  mergeCensoPatientFields(newPatient, entry.patient);
  mergePatientRegistrationMeta(newPatient, entry.patient);
  patients.unshift(newPatient);
  notes[newId] = entry.note || {};
  indicaciones[newId] = entry.indicaciones || {};
  labHistory[newId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  if (entry.medReceta) medRecetaByPatient[newId] = entry.medReceta;
  if (entry.medPharmProfile) medPharmProfileByPatient[newId] = entry.medPharmProfile;
  return newId;
}

function importEntriesWithConflicts(entries, actionLabel) {
  var out = { imported: 0, overwritten: 0, duplicated: 0, cancelled: false };
  var patientsBefore = JSON.parse(JSON.stringify(patients));
  var notesBefore = JSON.parse(JSON.stringify(notes));
  var indicacionesBefore = JSON.parse(JSON.stringify(indicaciones));
  var labHistoryBefore = JSON.parse(JSON.stringify(labHistory));
  var medRecetaBefore = JSON.parse(JSON.stringify(medRecetaByPatient));
  var medPharmBefore = JSON.parse(JSON.stringify(medPharmProfileByPatient));
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
    setPatients(patientsBefore);
    setNotes(notesBefore);
    setIndicaciones(indicacionesBefore);
    setLabHistory(labHistoryBefore);
    setMedRecetaByPatient(medRecetaBefore);
    setMedPharmProfileByPatient(medPharmBefore);
  } else {
    saveState();
    renderPatientList();
  }
  addAuditEntry(actionLabel, out.cancelled ? 'cancelled' : 'ok', out.imported + out.overwritten + out.duplicated,
    'new:' + out.imported + ',overwrite:' + out.overwritten + ',duplicate:' + out.duplicated);
  return out;
}

async function exportDataBackup() {
  await saveState({ immediate: true });
  var payload = buildFullBackupPayload();
  var n = (payload.data.patients || []).length;
  downloadJsonPayload(payload, 'R-plus-respaldo-' + formatDateSlug(new Date()) + '.json');
  addAuditEntry('backup-full-export', 'ok', n, '');
  if (n === 0) {
    rt.showToast(
      'Respaldo descargado sin pacientes. Si esperabas datos, revisa la lista y exporta de nuevo.',
      'error'
    );
  } else {
    rt.showToast('Respaldo descargado (' + n + ' paciente' + (n === 1 ? '' : 's') + ')', 'success');
  }
}

function exportActivePatientBackup() {
  var aid = rt.getActiveId();
  if (!aid) {
    rt.showToast('Selecciona un paciente en la lista.', 'error');
    return;
  }
  if (isTourDemoPatientId(aid, patients)) {
    rt.showToast('El paciente de demostración no se exporta.', 'error');
    return;
  }
  var patient = patients.find(function(p) { return p.id === aid; });
  if (!patient) return;
  saveState();
  var payload = {
    format: 'r-plus-patient-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: window.__RPC_APP_VERSION__ || null,
    patient: patient,
    note: notes[aid] || null,
    indicaciones: indicaciones[aid] || null,
    labHistory: labHistory[aid] || [],
    medReceta: medRecetaByPatient[aid] || null,
    medPharmProfile: medPharmProfileByPatient[aid] || null,
  };
  downloadJsonPayload(payload, 'R-plus-paciente-' + safeExportSlug(patient.nombre) + '-' + formatDateSlug(new Date()) + '.json');
  addAuditEntry('backup-patient-export', 'ok', 1, String(patient.registro || ''));
  rt.showToast('Paciente exportado', 'success');
}

function exportRangeBackupPrompt() {
  var raw = prompt('Rango de fechas (dd/mm/yyyy - dd/mm/yyyy):', '');
  if (raw == null) return;
  var range = parseDateRangePrompt(raw);
  if (!range) {
    rt.showToast('Rango inválido. Usa dd/mm/yyyy - dd/mm/yyyy', 'error');
    return;
  }
  var entries = [];
  patients.forEach(function(p) {
    var entry = buildPatientEntry(p.id);
    if (entry && patientInDateRange(entry, range)) entries.push(entry);
  });
  if (!entries.length) {
    rt.showToast('No hay pacientes en ese rango.', 'error');
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
  rt.showToast('Rango exportado', 'success');
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
        rt.showToast('Archivo de rango inválido.', 'error');
        return;
      }
      if (typeof pushUndoSnapshot === 'function') rt.pushUndoSnapshot('Importar rango (' + payload.entries.length + ')');
      var res = importEntriesWithConflicts(payload.entries, 'range-import');
      if (res.cancelled) {
        rt.showToast('Importación cancelada', 'error');
      } else {
        rt.showToast('Rango importado: ' + (res.imported + res.overwritten + res.duplicated), 'success');
      }
    } catch (_err) {
      rt.showToast('No se pudo leer el archivo de rango.', 'error');
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

function patientExportPayloadToEntry(payload) {
  return {
    patient: payload.patient,
    note: payload.note || {},
    indicaciones: payload.indicaciones || {},
    labHistory: Array.isArray(payload.labHistory) ? payload.labHistory : [],
    medReceta: payload.medReceta || null,
    medPharmProfile: payload.medPharmProfile || null,
  };
}

function applySinglePatientExportPayload(payload) {
  var imported = payload.patient || {};
  var registro = String(imported.registro || '').trim();
  var existsByRegistro = findPatientByRegistro(registro);
  var entry = patientExportPayloadToEntry(payload);

  if (existsByRegistro) {
    applyImportEntry(entry, 'overwrite', existsByRegistro);
    rt.setActiveId(existsByRegistro.id);
    return registro;
  }

  var newId = applyImportEntry(entry, 'duplicate', null);
  rt.setActiveId(newId);
  return registro;
}

function importPatientExportPayloads(payloads, sourceLabel) {
  if (!payloads || !payloads.length) {
    rt.showToast('No hay pacientes para importar.', 'error');
    return false;
  }

  if (payloads.length > 1) {
        var names = payloads
          .map(function (p) {
            return (p.patient && p.patient.nombre) || 'Sin nombre';
          })
          .join(', ');
        if (
          !confirm(
            'Se importarán ' +
              payloads.length +
              ' pacientes: ' +
              names +
              '. Si ya existen por registro, se preguntará qué hacer con cada uno. ¿Continuar?'
          )
        ) {
          return false;
        }
        if (typeof pushUndoSnapshot === 'function') {
          rt.pushUndoSnapshot('Importar pacientes demo (' + payloads.length + ')');
        }
        var entries = payloads.map(patientExportPayloadToEntry);
        var res = importEntriesWithConflicts(entries, 'backup-patient-import');
        if (res.cancelled) {
          rt.showToast('Importación cancelada', 'error');
          return false;
        }
        rt.showToast(
          'Pacientes importados: ' + (res.imported + res.overwritten + res.duplicated),
          'success'
        );
        if (rt.getActiveId()) selectPatient(rt.getActiveId());
        return true;
      }

  var payload = payloads[0];
  var imported = payload.patient || {};
  var registro = String(imported.registro || '').trim();
  var existsByRegistro = findPatientByRegistro(registro);
  var msg = existsByRegistro
    ? ('Ya existe un paciente con el registro ' + registro + '. Esto sobrescribirá su nota, indicaciones y labs. ¿Continuar?')
    : ('Se importará el paciente "' + (imported.nombre || 'Sin nombre') + '". ¿Continuar?');
  if (!confirm(msg)) return false;

  applySinglePatientExportPayload(payload);
  saveState();
  renderPatientList();
  if (rt.getActiveId()) selectPatient(rt.getActiveId());
  addAuditEntry('backup-patient-import', 'ok', 1, (sourceLabel || '') + registro);
  rt.showToast('Paciente importado correctamente.', 'success');
  return true;
}

function onPatientBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var result = parsePatientImportJsonText(reader.result);
      var parsed = result.parsed;
      var payloads = result.payloads;
      if (!payloads.length) {
        rt.showToast(
          'El archivo no es una exportación válida de paciente. ' + describePatientImportRejection(parsed),
          'error'
        );
        return;
      }
      importPatientExportPayloads(payloads, f.name + ':');
    } catch (_err) {
      rt.showToast('No se pudo leer la exportación de paciente.', 'error');
      addAuditEntry('backup-patient-import', 'error', 0, 'read-error');
    }
  };
  reader.readAsText(f);
}

async function importBundledDemoPatients() {
  var files = ['demo-perez.json'];
  var payloads = [];
  for (var i = 0; i < files.length; i += 1) {
    var name = files[i];
    try {
      var res = await fetch('demo-patients/' + name, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var result = parsePatientImportJsonText(await res.text());
      payloads = payloads.concat(result.payloads);
    } catch (_fetchErr) {
      rt.showToast(
        'No se encontró ' +
          name +
          ' en la app. Regenera con npm run export:demo-patients y npm run build:ui.',
        'error'
      );
      return;
    }
  }
  if (!payloads.length) {
    rt.showToast('Los JSON demo no tienen formato de importación válido.', 'error');
    return;
  }
  importPatientExportPayloads(payloads, 'bundled:');
}

function importBundledDemoPerez() {
  importBundledDemoPatients();
}

function onBackupFileChosen(ev) {
  var f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  var reader = new FileReader();
  reader.onload = async function() {
    try {
      var payload = JSON.parse(reader.result);
      if (!payload || payload.format !== 'r-plus-backup' || payload.version !== 1 || !payload.data) {
        rt.showToast('El archivo no es un respaldo válido de R+', 'error');
        return;
      }
      var n = (payload.data.patients || []).length;
      var confirmMsg =
        'Esto reemplaza todos los pacientes y datos locales en esta computadora (' +
        n +
        ' pacientes en el archivo). No se puede deshacer.';
      if (n === 0) {
        confirmMsg +=
          '\n\nEl archivo no trae pacientes (solo ajustes/plantillas). Si esperabas pacientes, pide un respaldo nuevo desde el equipo origen.';
      }
      if (!confirm(confirmMsg + '\n\n¿Continuar?')) {
        return;
      }
      if (typeof pushUndoSnapshot === 'function') rt.pushUndoSnapshot('Importar respaldo completo');
      await saveState({ immediate: true });
      try {
        localStorage.setItem('rpc-preimport-backup', JSON.stringify(buildFullBackupPayload()));
      } catch (_pre) {}
      await persistFullBackupPayload(payload);
      addAuditEntry('backup-full-import', 'ok', n, '');
      rt.showToast(
        'Respaldo importado (' + n + ' paciente' + (n === 1 ? '' : 's') + '). Recargando…',
        'success'
      );
      location.reload();
    } catch (err) {
      var code = err && err.message;
      if (code === 'SAVE_FAILED' || code === 'QUOTA_EXCEEDED') {
        rt.showToast(
          'No se pudo guardar el respaldo: almacenamiento local lleno. Libera espacio e intenta de nuevo.',
          'error'
        );
      } else {
        rt.showToast('No se pudo leer el respaldo', 'error');
      }
      addAuditEntry('backup-full-import', 'error', 0, code || 'read-error');
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
    rt.showToast('No hay datos para sincronizar.', 'error');
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
      rt.showToast('No se pudo cifrar: WebCrypto no disponible.', 'error');
      addAuditEntry('sync-export', 'error', 0, 'crypto-unavailable');
      return;
    }
  } else {
    base.payload = { encrypted: false, entries: entries };
  }
  downloadJsonPayload(base, 'R-plus-sync-' + formatDateSlug(new Date()) + '.json');
  addAuditEntry('sync-export', 'ok', entries.length, base.payload.encrypted ? 'encrypted' : 'plain');
  rt.showToast('Paquete sync exportado', 'success');
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
        rt.showToast('Paquete sync inválido.', 'error');
        return;
      }
      var data = bundle.payload;
      if (data.encrypted) {
        var passphrase = prompt('Este paquete está cifrado. Ingresa la passphrase:', '');
        if (!passphrase) {
          rt.showToast('Importación cancelada.', 'error');
          addAuditEntry('sync-import', 'cancelled', 0, 'no-passphrase');
          return;
        }
        data = await decryptSyncPayload(data, passphrase);
      }
      if (!data || !Array.isArray(data.entries)) {
        rt.showToast('Contenido sync inválido.', 'error');
        addAuditEntry('sync-import', 'error', 0, 'invalid-content');
        return;
      }
      if (typeof pushUndoSnapshot === 'function') rt.pushUndoSnapshot('Importar paquete sync (' + data.entries.length + ')');
      var res = importEntriesWithConflicts(data.entries, 'sync-import');
      if (res.cancelled) rt.showToast('Sync cancelado', 'error');
      else rt.showToast('Sync importado: ' + (res.imported + res.overwritten + res.duplicated), 'success');
    } catch (_err) {
      rt.showToast('No se pudo importar el paquete sync.', 'error');
      addAuditEntry('sync-import', 'error', 0, 'read-error');
    }
  };
  reader.readAsText(f);
}

export {
  syncPreimportBackupUi,
  restorePreimportBackupPrompt,
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
  initGoalGFeatures,
  buildFullBackupPayload,
  parseDateDMY,
  parseDateRangePrompt,
  patientInDateRange,
  askConflictAction,
  applyImportEntry,
  importEntriesWithConflicts,
  exportDataBackup,
  exportActivePatientBackup,
  exportRangeBackupPrompt,
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
};
