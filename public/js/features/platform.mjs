/** Pending jobs, RPC offline/health, idle lock, privacy wipe, backups/sync JSON, auto-updater UI. */
import { storage } from '../storage.js';
import { isDbMode } from '../db-storage-bridge.mjs';
import {
  syncDbSecuritySectionUi,
} from './db-unlock.mjs';
import { formatProgressLine } from '../update-helpers.mjs';
import {
  initStableDowngradeSettings,
  openSettingsDowngradeSection,
} from '../stable-downgrade-ui.mjs';
import { fetchMinVersionPayload } from '../min-version-fetch.mjs';
import { setAsyncButtonLoading } from '../ui-motion.mjs';
import { applyMedCatalogOverlay } from '../med-receta-core.mjs';
import { applySomePharmCatalogOverlay } from '../med-pharm-some-catalog.mjs';
import {
  GUIDED_TOUR_LS_KEY,
  closeSettingsDropdown,
  isTourDemoPatientId,
  formatCuratedReleaseNotesPlain,
} from './settings-help.mjs';
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
} from '../app-state.mjs';
import { mergePatientMonitoreoFromImported } from './estado-actual-data.mjs';
import { mergeCensoPatientFields } from '../patient-diagnosticos.mjs';
import {
  resolvePatientImportPayloads,
  describePatientImportRejection,
  parsePatientImportJsonText,
} from '../patient-export-format.mjs';
import {
  renderPatientList,
  selectPatient,
  findPatientByRegistro,
  generatePatientId,
  ensureUniquePatientName,
  buildPatientEntry,
} from './patients.mjs';

let rt = {
  getActiveId() {
    return null;
  },
  setActiveId() {},
  getSettings() {
    return /** @type {any} */ ({});
  },
  showToast() {},
  syncTeamSyncHeaderButton() {},
  pushUndoSnapshot() {},
};

export function registerPlatformRuntime(partial) {
  if (!partial || typeof partial !== 'object') return;
  Object.assign(rt, partial);
}

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

function resetUpdateCheckButtons() {
  ['settings-check-updates-btn', 'settings-repair-update-btn', 'min-version-check-btn'].forEach(
    function (id) {
      setAsyncButtonLoading(document.getElementById(id), false);
    }
  );
}

/**
 * Re-descarga e instala la build publicada del tag de la versión instalada (mismo número en GitHub).
 * Útil tras subir un fix sin bump: reemplaza el binario sin borrar userData.
 */
function checkForRepairUpdate() {
  if (
    !window.electronAPI ||
    typeof window.electronAPI.reinstallCurrentRelease !== 'function'
  ) {
    rt.showToast('Las actualizaciones automáticas solo están en la app de escritorio.', 'error');
    return;
  }
  pendingRepairUpdateCheck = true;
  try {
    if (typeof window.electronAPI.resetUpdateFeed === 'function') {
      window.electronAPI.resetUpdateFeed();
    }
  } catch (_e) {}
  setUpdateChannel('estable');
  syncUpdateChannelUI();
  if (typeof window.electronAPI.setUpdateChannel === 'function') {
    try {
      window.electronAPI.setUpdateChannel('estable');
    } catch (_e) {}
  }
  setAsyncButtonLoading(document.getElementById('settings-repair-update-btn'), true, {
    loadingText: 'Buscando…',
  });
  var versionLabel = 'actual';
  if (typeof window.electronAPI.getAppVersion === 'function') {
    window.electronAPI.getAppVersion().then(function (v) {
      if (v) versionLabel = 'v' + v;
    }).catch(function () {});
  }
  rt.showToast(
    'Reinstalando ' + versionLabel + ' desde GitHub (canal Estable). No borra tus datos.',
    'info'
  );
  setTimeout(function () {
    try {
      window.electronAPI.reinstallCurrentRelease();
    } catch (_e) {}
  }, 150);
}

function syncRepairUpdateButtonLabel() {
  var btn = document.getElementById('settings-repair-update-btn');
  if (!btn || !window.electronAPI || typeof window.electronAPI.getAppVersion !== 'function') return;
  window.electronAPI.getAppVersion().then(function (v) {
    if (v) btn.textContent = 'Reinstalar versión actual (v' + v + ')…';
  }).catch(function () {});
}

function checkForAppUpdates() {
  if (!window.electronAPI || typeof window.electronAPI.checkForUpdates !== 'function') {
    rt.showToast('Las actualizaciones automáticas solo están en la app de escritorio.', 'error');
    return;
  }
  if (typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel(getUpdateChannel()); } catch (_e) {}
  }
  setAsyncButtonLoading(document.getElementById('settings-check-updates-btn'), true, {
    loadingText: 'Buscando…',
  });
  setTimeout(function () {
    try { window.electronAPI.checkForUpdates(); } catch (_e) {}
  }, 150);
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
      } else {
        if (b.dataset.rpcOffline) delete b.dataset.rpcOffline;
        if (!b.classList.contains('loading')) {
          b.disabled = false;
          b.removeAttribute('aria-disabled');
        }
      }
    });
    var recetaBtn = document.getElementById('btn-receta-hu-export');
    if (recetaBtn) {
      delete recetaBtn.dataset.rpcOffline;
      if (!recetaBtn.classList.contains('loading')) {
        recetaBtn.disabled = false;
        recetaBtn.removeAttribute('aria-disabled');
      }
    }
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
    try { rt.showToast('Sin conexión con el servidor local. Generación de documentos desactivada.', 'error'); } catch (_e) {}
  } else if (prev && !rpcOffline) {
    try { rt.showToast('Servidor local reconectado.', 'success'); } catch (_e) {}
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
    rt.showToast('PIN inválido (solo 4-8 dígitos).', 'error');
    return { ok: false, cancelled: false };
  }
  var p2 = prompt('Confirma el PIN:', '');
  if (p2 == null) return { ok: false, cancelled: true };
  if (p1 !== p2) {
    rt.showToast('Los PIN no coinciden.', 'error');
    return { ok: false, cancelled: false };
  }
  try {
    var hash = await computeSha256Hex(p1);
    setIdleLockPinHash(hash);
    addAuditEntry('idle-lock-pin-set', 'ok', 0, reason === 'change' ? 'changed' : 'created');
    return { ok: true, cancelled: false };
  } catch (_err) {
    rt.showToast('WebCrypto no disponible en este entorno.', 'error');
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
    rt.showToast('Bloqueo por inactividad desactivado.', 'success');
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
  rt.showToast('Bloqueo activo: ' + parsed + ' min.', 'success');
}

async function changeIdleLockPin() {
  var existing = getIdleLockPinHash();
  if (existing) {
    var current = prompt('Ingresa el PIN actual para continuar:', '');
    if (current == null) return;
    if (!isIdleLockPinFormatValid(current)) {
      rt.showToast('PIN con formato inválido.', 'error');
      addAuditEntry('idle-lock-pin-change', 'error', 0, 'invalid-format');
      return;
    }
    try {
      var hash = await computeSha256Hex(current);
      if (hash !== existing) {
        rt.showToast('PIN incorrecto.', 'error');
        addAuditEntry('idle-lock-pin-change', 'error', 0, 'wrong-pin');
        return;
      }
    } catch (_err) {
      rt.showToast('WebCrypto no disponible.', 'error');
      addAuditEntry('idle-lock-pin-change', 'error', 0, 'no-webcrypto');
      return;
    }
  }
  var setup = await promptForIdleLockPinSetup('change');
  if (setup.ok) {
    rt.showToast('PIN actualizado ✓', 'success');
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
  rt.showToast('Se eliminaron ' + keys.length + ' elementos temporales.', 'success');
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
    rt.showToast('Borrado cancelado.', 'error');
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
    rt.showToast('Solo disponible en la aplicación de escritorio.', 'error');
    return;
  }
  window.electronAPI.openUserDataFolder().then(function(res) {
    if (res && res.ok) rt.showToast('Carpeta abierta', 'success');
    else rt.showToast((res && res.error) || 'No se pudo abrir la carpeta', 'error');
  }).catch(function() {
    rt.showToast('No se pudo abrir la carpeta', 'error');
  });
}

function safeExportSlug(str) {
  var s = (str || 'paciente').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]+/g, '_').replace(/^_|_$/g, '');
  return (s || 'paciente').slice(0, 48);
}

// ── Respaldo local (exportar / importar JSON) ─────────────────────
var _dbAuditCache = null;

function forensicEventVisible(eventType) {
  var t = String(eventType || '');
  return /^(clinical|auth|system|lan)\./.test(t);
}

function mapForensicAuditRow(row) {
  return {
    timestamp: row.timestamp,
    action: row.event_type,
    result: 'ok',
    count: 0,
    detail: row.client_id || '',
    forensicId: row.id,
    payloadHash: row.payload_hash,
    currentHash: row.current_hash,
  };
}

async function fetchDbAuditLog(limit) {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbAuditExport !== 'function') {
    return null;
  }
  try {
    var res = await window.electronAPI.dbAuditExport({ limit: limit || 200 });
    if (!res || res.ok === false) return [];
    return (res.entries || []).filter(function (row) {
      return forensicEventVisible(row.event_type);
    }).map(mapForensicAuditRow);
  } catch (_e) {
    return [];
  }
}

function getAuditLog() {
  if (isDbMode() && _dbAuditCache) return _dbAuditCache;
  try {
    var raw = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_err) {
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
    timestamp: new Date().toISOString(),
    action: action || 'unknown',
    result: result || 'ok',
    count: Number.isFinite(count) ? count : 0,
    detail: detail || ''
  });
  if (list.length > 200) list = list.slice(0, 200);
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(list));
}

async function exportAuditLog() {
  var log;
  if (isDbMode() && window.electronAPI && typeof window.electronAPI.dbAuditExport === 'function') {
    log = await fetchDbAuditLog(5000);
  } else {
    log = getAuditLog();
  }
  downloadJsonPayload(
    {
      format: isDbMode() ? 'r-plus-forensic-audit' : 'r-plus-audit-log',
      version: isDbMode() ? 2 : 1,
      exportedAt: new Date().toISOString(),
      entries: log,
    },
    'R-plus-bitacora-' + formatDateSlug(new Date()) + '.json'
  );
  rt.showToast('Bitácora exportada', 'success');
}

async function lockClinicalDatabaseNow() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbLock !== 'function') {
    rt.showToast('Solo disponible con la base de datos cifrada en la app de escritorio.', 'error');
    return;
  }
  if (
    !window.confirm(
      '¿Bloquear la base de datos ahora? R+ la volverá a abrir automáticamente en este equipo al reiniciar o recargar.'
    )
  ) {
    return;
  }
  try {
    var res = await window.electronAPI.dbLock();
    if (!res || res.ok === false) {
      rt.showToast((res && res.error) || 'No se pudo bloquear la base de datos', 'error');
      return;
    }
    rt.showToast('Base de datos bloqueada', 'success');
    location.reload();
  } catch (_e) {
    rt.showToast('No se pudo bloquear la base de datos', 'error');
  }
}

async function verifyForensicAuditChain() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbAuditVerify !== 'function') {
    rt.showToast('La verificación forense solo está en la app de escritorio con base cifrada.', 'error');
    return;
  }
  rt.showToast('Verificando cadena de integridad…', 'info');
  try {
    var res = await window.electronAPI.dbAuditVerify({ mode: 'full' });
    if (!res || res.ok === false) {
      rt.showToast((res && res.error) || 'No se pudo verificar la bitácora', 'error');
      return;
    }
    if (res.valid) {
      rt.showToast('Bitácora forense íntegra (verificación completa).', 'success');
    } else {
      rt.showToast(
        'Cadena comprometida: revisa el registro #' + (res.brokenAtId != null ? res.brokenAtId : '?'),
        'error'
      );
    }
  } catch (_e) {
    rt.showToast('No se pudo verificar la bitácora', 'error');
  }
}

async function exportClinicalDbBackupJson() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbBackupExportJson !== 'function') {
    rt.showToast('Exportación solo disponible con base cifrada en escritorio.', 'error');
    return;
  }
  if (
    !window.confirm(
      'El respaldo JSON incluye información clínica identificable en texto plano. ¿Continuar y guardar en un lugar seguro?'
    )
  ) {
    return;
  }
  try {
    var res = await window.electronAPI.dbBackupExportJson();
    if (!res || res.ok === false) {
      rt.showToast((res && res.error) || 'No se pudo exportar el respaldo', 'error');
      return;
    }
    var envelope = res.envelope || res;
    downloadJsonPayload(
      envelope,
      'R-plus-respaldo-sqlcipher-' + formatDateSlug(new Date()) + '.json'
    );
    rt.showToast('Respaldo JSON exportado', 'success');
  } catch (_e) {
    rt.showToast('No se pudo exportar el respaldo', 'error');
  }
}

async function exportClinicalDbBackupDb() {
  if (!isDbMode() || !window.electronAPI || typeof window.electronAPI.dbBackupExportDb !== 'function') {
    rt.showToast('Exportación solo disponible con base cifrada en escritorio.', 'error');
    return;
  }
  if (
    !window.confirm(
      'Se copiará el archivo .db cifrado. Protégelo como datos clínicos sensibles. ¿Continuar?'
    )
  ) {
    return;
  }
  try {
    var res = await window.electronAPI.dbBackupExportDb();
    if (res && res.canceled) return;
    if (!res || res.ok === false) {
      rt.showToast((res && res.error) || 'No se pudo exportar la copia .db', 'error');
      return;
    }
    rt.showToast('Copia .db guardada' + (res.path ? ': ' + res.path : ''), 'success');
  } catch (_e) {
    rt.showToast('No se pudo exportar la copia .db', 'error');
  }
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
  function mergeSomePharm(curSp, incSp) {
    var out = Object.create(null);
    var cTok = curSp && curSp.tokens ? curSp.tokens : {};
    var iTok = incSp && incSp.tokens ? incSp.tokens : {};
    var keys = Object.keys(cTok).concat(Object.keys(iTok));
    keys.forEach(function (cat) {
      out[cat] = mergeArr(cTok[cat], iTok[cat]);
    });
    return { tokens: out };
  }
  return {
    v: 1,
    accents: accents,
    soapTokens: {
      vasop: mergeArr(st.vasop, si.vasop),
      abx: mergeArr(st.abx, si.abx),
      analgesia: mergeArr(st.analgesia, si.analgesia),
      antihta: mergeArr(st.antihta, si.antihta),
    },
    somePharm: mergeSomePharm(cur.somePharm, incoming.somePharm),
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
      somePharm: data.somePharm || { tokens: {} },
    },
    'R-plus-catalogo-medicamentos-' + formatDateSlug(new Date()) + '.json'
  );
  addAuditEntry('med-catalog-export', 'ok', Object.keys(data.accents || {}).length, 'soap-export');
  rt.showToast('Catálogo exportado', 'success');
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
      var somePharm = payload.somePharm;
      var hasSome = somePharm && typeof somePharm === 'object';
      if (!hasAcc && !hasSoap && !hasSome) {
        rt.showToast(
          'El archivo no es un catálogo válido (faltan accents, soapTokens o somePharm).',
          'error'
        );
        return;
      }
      var merged = mergeMedCatalogStored({
        accents: hasAcc ? accents : {},
        soapTokens: hasSoap ? soapTokens : {},
        somePharm: hasSome ? somePharm : {},
      });
      storage.saveMedCatalog(merged);
      applyMedCatalogOverlay(merged);
      applySomePharmCatalogOverlay(merged);
      var nAcc = Object.keys(merged.accents || {}).length;
      var nTok =
        (merged.soapTokens.vasop || []).length +
        (merged.soapTokens.abx || []).length +
        (merged.soapTokens.analgesia || []).length +
        (merged.soapTokens.antihta || []).length;
      addAuditEntry('med-catalog-import', 'ok', nTok, 'accents:' + nAcc);
      rt.showToast('Catálogo importado (fusionado con el tuyo)', 'success');
    } catch (_err) {
      rt.showToast('No se pudo leer el catálogo', 'error');
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

// ── Auto-updater UI (modal) ───────────────────────────────────────
var UPDATE_SNOOZE_KEY = 'rplus-update-snooze-until';
var UPDATE_DISMISS_VER_KEY = 'rplus-update-dismiss-version';
var UPDATE_TELEMETRY_URL = 'https://example.invalid/r-plus-update';
var RELEASES_LATEST_URL = 'https://github.com/mausalas99/r-mas/releases/latest';
var pendingUpdaterTargetVersion = null;
var pendingUpdaterIsPrerelease = false;
var pendingDowngradeVersion = null;
var pendingRepairUpdateCheck = false;
/** @type {'upgrade' | 'downgrade'} */
var updateModalMode = 'upgrade';
var minVersionGateKeydownBound = false;

function getUpdateChannel() {
  var s = rt.getSettings();
  var raw = String((s && s.updateChannel) || 'estable').toLowerCase();
  return raw === 'beta' ? 'beta' : 'estable';
}

function setUpdateChannel(channel) {
  var normalized = String(channel || '').toLowerCase() === 'beta' ? 'beta' : 'estable';
  var previous = getUpdateChannel();
  var s = rt.getSettings();
  s.updateChannel = normalized;
  localStorage.setItem('rpc-settings', JSON.stringify(s));
  syncUpdateChannelUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel(normalized); } catch (_e) {}
  }
  if (previous !== normalized) {
    rt.showToast(
      normalized === 'beta'
        ? 'Canal pre-releases activado: recibirás borradores de GitHub.'
        : 'Canal estable activado.',
      'success'
    );
    if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
      setTimeout(function () {
        try { window.electronAPI.checkForUpdates(); } catch (_e) {}
      }, 250);
    }
  }
}

function syncUpdateModalChannelPill(isPrerelease) {
  var pill = document.getElementById('update-modal-channel-pill');
  if (pill) pill.style.display = isPrerelease ? 'inline-block' : 'none';
}

function syncUpdateChannelUI() {
  syncRepairUpdateButtonLabel();
  var sel = document.getElementById('rpc-update-channel');
  if (sel) sel.value = getUpdateChannel();
  syncUpdateModalChannelPill(pendingUpdaterIsPrerelease);
  if (typeof syncTeamSyncHeaderButton === 'function') rt.syncTeamSyncHeaderButton();
}

/** Tras 3.2.1 estable: quien tenía canal pre-releases vuelve a Estable (una sola vez). */
function migrateUpdateChannelToStableDefault() {
  var key = 'rpc-update-channel-stable-default-v321';
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  if (getUpdateChannel() !== 'beta') return;
  var s = rt.getSettings();
  s.updateChannel = 'estable';
  localStorage.setItem('rpc-settings', JSON.stringify(s));
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel('estable'); } catch (_e) {}
    if (typeof window.electronAPI.checkForUpdates === 'function') {
      setTimeout(function () {
        try { window.electronAPI.checkForUpdates(); } catch (_e) {}
      }, 300);
    }
  }
}

function getUpdateTelemetryEnabled() {
  var s = rt.getSettings();
  return !!(s && s.updateTelemetryEnabled);
}

function setUpdateTelemetryEnabled(enabled) {
  var value = !!enabled;
  var s = rt.getSettings();
  s.updateTelemetryEnabled = value;
  localStorage.setItem('rpc-settings', JSON.stringify(s));
  syncUpdateTelemetryUI();
  rt.showToast(value ? 'Telemetría de actualización activada.' : 'Telemetría desactivada.', 'success');
}

function syncUpdateTelemetryUI() {
  var cb = document.getElementById('rpc-update-telemetry-toggle');
  if (cb) cb.checked = getUpdateTelemetryEnabled();
}

function syncHardwareAccelerationUI() {
  var acc = document.getElementById('settings-accordion-performance');
  var cb = document.getElementById('settings-hardware-acceleration');
  if (!acc || !cb) return;
  var api = window.electronAPI;
  if (!api || typeof api.getPerformancePrefs !== 'function') {
    acc.style.display = 'none';
    return;
  }
  acc.style.display = '';
  api
    .getPerformancePrefs()
    .then(function (prefs) {
      cb.checked = !!(prefs && prefs.hardwareAcceleration);
    })
    .catch(function () {
      cb.checked = false;
    });
}

function onHardwareAccelerationChange(enabled) {
  var api = window.electronAPI;
  if (!api || typeof api.setHardwareAcceleration !== 'function') {
    rt.showToast('Solo disponible en la aplicación de escritorio.', 'error');
    syncHardwareAccelerationUI();
    return;
  }
  api
    .setHardwareAcceleration(!!enabled)
    .then(function () {
      rt.showToast('Reinicia R+ para aplicar la aceleración por hardware.', 'info');
    })
    .catch(function () {
      rt.showToast('No se pudo guardar la preferencia.', 'error');
      syncHardwareAccelerationUI();
    });
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
        setAsyncButtonLoading(checkBtn, true, { loadingText: 'Buscando…' });
        try { window.electronAPI.checkForUpdates(); } catch (_e) {}
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
  var payloadPromise = fetchMinVersionPayload().catch(function () {
    return null;
  });
  Promise.all([currentVersionPromise, payloadPromise]).then(function (res) {
    var currentVersion = res[0];
    var payload = res[1];
    if (!currentVersion || !payload || typeof payload !== 'object' || !payload.minVersion) return;
    if (compareSemver(currentVersion, payload.minVersion) < 0) {
      showMinVersionBlockingModal(currentVersion, payload.minVersion, payload.message);
    }
  }).catch(function () {});
}

var nativeRecoveryModalShown = false;

function showNativeRuntimeRecoveryModal(status) {
  if (nativeRecoveryModalShown || !status || status.ok) return;
  nativeRecoveryModalShown = true;
  var msg =
    (status.userMessage || status.message || 'R+ no pudo cargar un componente nativo.') +
    (status.detail ? '\n\n' + status.detail : '');
  resetUpdateModalPanels();
  var title = document.getElementById('update-modal-title');
  if (title && title.firstChild && title.firstChild.nodeType === 3) {
    title.firstChild.textContent = 'Problema de instalación';
  }
  var notes = document.getElementById('update-modal-notes');
  if (notes) notes.textContent = msg;
  var state = document.getElementById('update-modal-state');
  if (state) {
    state.textContent =
      'Usa Ajustes → Reinstalar versión actual, Restaurar versión estable, o descarga el instalador desde GitHub Releases.';
  }
  var wrap = document.getElementById('update-modal-progress-wrap');
  if (wrap) wrap.style.display = 'none';
  var pill = document.getElementById('update-modal-version-pill');
  if (pill) pill.style.display = 'none';
  var err = document.getElementById('update-modal-error');
  if (err) err.style.display = 'none';
  var actions = document.getElementById('update-modal-actions-primary');
  var sec = document.getElementById('update-modal-actions-secondary');
  if (actions) {
    actions.innerHTML = '';
    var settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn-primary';
    settingsBtn.textContent = 'Abrir restaurar versión estable…';
    settingsBtn.onclick = function () {
      hideUpdateModal();
      openSettingsDowngradeSection();
    };
    actions.appendChild(settingsBtn);
    var ghBtn = document.createElement('button');
    ghBtn.className = 'btn-secondary';
    ghBtn.textContent = 'Ver releases en GitHub';
    ghBtn.onclick = function () {
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal('https://github.com/mausalas99/r-mas/releases');
      }
    };
    actions.appendChild(ghBtn);
  }
  if (sec) {
    sec.innerHTML = '';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.textContent = 'Continuar de todos modos';
    closeBtn.onclick = function () { hideUpdateModal(); };
    sec.appendChild(closeBtn);
  }
  showUpdateModal();
}

function checkNativeRuntimeOnBoot() {
  if (!window.electronAPI || typeof window.electronAPI.getNativeRuntimeStatus !== 'function') {
    return;
  }
  window.electronAPI
    .getNativeRuntimeStatus()
    .then(function (status) {
      if (!status || status.ok) return;
      showNativeRuntimeRecoveryModal(status);
    })
    .catch(function () {});
}

function initUpdateChannelAndGate() {
  migrateUpdateChannelToStableDefault();
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  if (window.electronAPI && typeof window.electronAPI.setUpdateChannel === 'function') {
    try { window.electronAPI.setUpdateChannel(getUpdateChannel()); } catch (_e) {}
  }
  initStableDowngradeSettings({
    showToast: rt.showToast.bind(rt),
    confirmDowngrade: confirmDowngrade,
  });
  setTimeout(checkNativeRuntimeOnBoot, 800);
  // Min-version gate: pequeño retraso para no estorbar el render inicial.
  setTimeout(function () { checkMinVersionGate(); }, 1200);
}

function confirmDowngrade(version, entry) {
  var summary = entry && entry.summary ? entry.summary : '';
  var ok = window.confirm(
    'Restaurar R+ a v' + version + '?\n\n' + summary +
      '\n\nLa app se reiniciará. Tus pacientes y ajustes locales se conservan.'
  );
  if (!ok) return;
  pendingDowngradeVersion = version;
  updateModalMode = 'downgrade';
  resetUpdateModalPanels();
  showUpdateModal();
  var title = document.getElementById('update-modal-title');
  if (title && title.firstChild) title.firstChild.textContent = 'Restaurando versión estable';
  if (window.electronAPI && window.electronAPI.downgradeToStable) {
    window.electronAPI.downgradeToStable(version);
  }
}

function renderDowngradeFallback(payload) {
  updateModalMode = 'upgrade';
  pendingDowngradeVersion = null;
  resetUpdateCheckButtons();
  renderUpdateError(
    (payload && payload.message ? payload.message : 'No se pudo descargar la versión.') +
      ' Puedes abrir el instalador en GitHub.'
  );
  var actions = document.getElementById('update-modal-actions-primary');
  if (actions && payload && (payload.manualUrl || payload.version)) {
    var openBtn = document.createElement('button');
    openBtn.className = 'btn-primary';
    openBtn.textContent = 'Abrir instalador en GitHub';
    openBtn.onclick = function () {
      if (window.electronAPI && window.electronAPI.openDowngradeInstaller) {
        window.electronAPI.openDowngradeInstaller(payload.version);
      } else if (window.electronAPI && window.electronAPI.openExternal && payload.manualUrl) {
        window.electronAPI.openExternal(payload.manualUrl);
      }
    };
    actions.innerHTML = '';
    actions.appendChild(openBtn);
  }
  if (window.electronAPI && window.electronAPI.resetUpdateFeed) {
    window.electronAPI.resetUpdateFeed();
  }
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

export function hideUpdateModal() {
  if (updateModalMode === 'downgrade' && window.electronAPI && window.electronAPI.resetUpdateFeed) {
    try { window.electronAPI.resetUpdateFeed(); } catch (_e) {}
  }
  updateModalMode = 'upgrade';
  pendingDowngradeVersion = null;
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
  }
  if (sec) sec.innerHTML = '';
  showUpdateModal();
}

function installUpdate() {
  if (window.electronAPI) window.electronAPI.installUpdate();
}

if (typeof window !== 'undefined' && window.electronAPI) {
  window.electronAPI.onUpdateAvailable(function(payload) {
    try {
      resetUpdateCheckButtons();
      var version = (payload && payload.version) ? payload.version : String(payload || '');
      var rawNotes = (payload && payload.releaseNotes != null) ? String(payload.releaseNotes) : '';
      var releaseNotes = formatCuratedReleaseNotesPlain(version);
      if (!releaseNotes) releaseNotes = stripHtmlToPlainText(rawNotes);
      pendingUpdaterTargetVersion = version;
      pendingUpdaterIsPrerelease = !!(payload && payload.prerelease);
      var isDowngrade = updateModalMode === 'downgrade';
      var isRepair = pendingRepairUpdateCheck;
      if (isRepair) pendingRepairUpdateCheck = false;
      if (!isDowngrade && !isRepair && isSnoozeActiveForVersion(version)) return;
      resetUpdateModalPanels();
      var title = document.getElementById('update-modal-title');
      if (title && title.firstChild && title.firstChild.nodeType === 3) {
        title.firstChild.textContent = isDowngrade
          ? 'Restaurando versión estable'
          : isRepair
            ? 'Actualización de reparación'
            : 'Nueva versión';
      }
      var pill = document.getElementById('update-modal-version-pill');
      if (pill) {
        pill.textContent = 'v' + version;
        pill.style.display = 'inline-block';
      }
      syncUpdateModalChannelPill(pendingUpdaterIsPrerelease);
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
        if (!isDowngrade) {
          var later = document.createElement('button');
          later.className = 'btn-secondary';
          later.textContent = 'Más tarde';
          later.onclick = function() {
            markDismissedVersion(version);
            hideUpdateModal();
          };
          actions.appendChild(later);
        }
      }
      var sec = document.getElementById('update-modal-actions-secondary');
      if (sec) {
        sec.innerHTML = '';
        if (!isDowngrade) {
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
      if (pendingUpdaterTargetVersion && updateModalMode !== 'downgrade' &&
          isSnoozeActiveForVersion(pendingUpdaterTargetVersion)) return;
      resetUpdateModalPanels();
      syncUpdateModalChannelPill(pendingUpdaterIsPrerelease);
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
      var isDowngrade = updateModalMode === 'downgrade';
      try { sendUpdateTelemetry('success', version); } catch (_te) {}
      if (!isDowngrade && isSnoozeActiveForVersion(version)) return;
      resetUpdateModalPanels();
      syncUpdateModalChannelPill(pendingUpdaterIsPrerelease);
      var state = document.getElementById('update-modal-state');
      if (state) {
        state.textContent = isDowngrade
          ? 'Listo para restaurar. R+ se reiniciará en la versión seleccionada.'
          : 'Listo para instalar. También se instalará al cerrar la aplicación si eliges esperar.';
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
        go.textContent = isDowngrade ? 'Restaurar y reiniciar' : 'Instalar y reiniciar';
        go.onclick = function() {
          updateModalMode = 'upgrade';
          pendingDowngradeVersion = null;
          installUpdate();
        };
        actions.appendChild(go);
        if (!isDowngrade) {
          var later = document.createElement('button');
          later.className = 'btn-secondary';
          later.textContent = 'Instalar al cerrar';
          later.onclick = function() { hideUpdateModal(); };
          actions.appendChild(later);
        }
      }
      var sec = document.getElementById('update-modal-actions-secondary');
      if (sec) sec.innerHTML = '';
      showUpdateModal();
    } catch (e) {
      console.error('onUpdateReady callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateNotAvailable(function(payload) {
    try {
      resetUpdateCheckButtons();
      var wasRepair = pendingRepairUpdateCheck;
      pendingRepairUpdateCheck = false;
      pendingUpdaterTargetVersion = null;
      pendingUpdaterIsPrerelease = false;
      syncUpdateModalChannelPill(false);
      if (wasRepair || (payload && payload.reinstallFailed)) {
        var v = payload && payload.version ? String(payload.version) : '';
        var detail = payload && payload.detail ? String(payload.detail) : '';
        var msg =
          'No se encontró en GitHub una build reinstalable' +
          (v ? ' para v' + v : '') +
          '. Publica o actualiza el release en GitHub (latest-mac.yml / latest.yml e instaladores) y vuelve a intentar.';
        if (detail) msg += ' Detalle: ' + detail;
        msg += ' También puedes usar «Abrir instalador en GitHub» en Restaurar versión estable.';
        rt.showToast(msg, 'error');
      } else {
        rt.showToast('R+ está actualizado.', 'success');
      }
    } catch (e) {
      console.error('onUpdateNotAvailable callback error:', e && e.message);
    }
  });

  window.electronAPI.onUpdateError(function(msg) {
    try {
      resetUpdateCheckButtons();
      try { sendUpdateTelemetry('fail'); } catch (_te) {}
      renderUpdateError(msg);
    } catch (e) {
      console.error('onUpdateError callback error:', e && e.message);
    }
  });

  if (window.electronAPI.onDowngradeFailed) {
    window.electronAPI.onDowngradeFailed(function(payload) {
      try {
        resetUpdateCheckButtons();
        renderDowngradeFallback(payload);
      } catch (e) {
        console.error('onDowngradeFailed callback error:', e && e.message);
      }
    });
  }
}

export const platformWindowHandlers = {
  lockClinicalDatabaseNow,
  verifyForensicAuditChain,
  exportClinicalDbBackupJson,
  exportClinicalDbBackupDb,
  openUserDataFolderFromSettings,
  onHardwareAccelerationChange,
  onIdleLockSelectChange,
  changeIdleLockPin,
  submitIdleLockPin,
  openWipeDataModal,
  closeWipeDataModal,
  wipeCacheConfirmed,
  wipeAllConfirmed,
  checkForAppUpdates,
  checkForRepairUpdate,
  setUpdateChannel,
  setUpdateTelemetryEnabled,
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
  importBundledDemoPerez,
  onBackupFileChosen,
  restorePreimportBackupPrompt,
  syncPreimportBackupUi,
  installUpdate,
  hideUpdateModal,
};

export {
  getAuditLog,
  refreshDbAuditCache,
  syncDbSecuritySectionUi,
  lockClinicalDatabaseNow,
  verifyForensicAuditChain,
  exportClinicalDbBackupJson,
  exportClinicalDbBackupDb,
  addAuditEntry,
  incrementPendingJobs,
  decrementPendingJobs,
  syncOfflineButtonStates,
  isRpcOffline,
  setRpcOffline,
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
  mergeMedCatalogStored,
  exportMedCatalogBundle,
  triggerImportMedCatalog,
  onMedCatalogFileChosen,
  syncPreimportBackupUi,
  restorePreimportBackupPrompt,
  formatDateSlug,
  downloadJsonPayload,
  downloadBlob,
  downloadTextPayload,
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
  safeExportSlug,
  exportAuditLog,
  getUpdateChannel,
  setUpdateChannel,
  syncUpdateChannelUI,
  syncUpdateTelemetryUI,
  syncHardwareAccelerationUI,
  onHardwareAccelerationChange,
  initUpdateChannelAndGate,
  getUpdateTelemetryEnabled,
  setUpdateTelemetryEnabled,
  installUpdate,
  checkForAppUpdates,
  checkForRepairUpdate,
  compareSemver,
  checkMinVersionGate,
  migrateUpdateChannelToStableDefault,
};
