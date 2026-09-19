/** Pre-import automatic backup UI and restore prompt. */
import { PREIMPORT_BACKUP_KEY } from '../shared.mjs';
import { addAuditEntry } from '../audit.mjs';
import { getPlatformRuntime } from '../runtime.mjs';
import { persistFullBackupPayload } from './backup-payload.mjs';
import { openConfirm } from '../../workbench/confirm.mjs';
import { openKvDb, idbGet, idbPut } from '../../../idb-kv.mjs';

const rt = getPlatformRuntime();

// Full-census snapshot, same size class as the undo stack — shares its
// IndexedDB database (localStorage's ~5-10MB quota is shared with cloud
// sync and the audit log, and this payload alone can be many MB).
const IDB_DB_NAME = 'rplus-undo';
const IDB_STORE = 'stack';
const IDB_KEY = 'preimport';
let _legacyPreimportMigrated = false;

// One-time move of a leftover backup from the old localStorage key — this is
// itself the thing that was filling up storage, so clearing it is the fix.
async function migrateLegacyPreimportBackupOnce(db) {
  if (_legacyPreimportMigrated) return;
  _legacyPreimportMigrated = true;
  var raw = null;
  try {
    raw = localStorage.getItem(PREIMPORT_BACKUP_KEY);
  } catch (_e) { void _e; }
  if (!raw) return;
  try {
    localStorage.removeItem(PREIMPORT_BACKUP_KEY);
  } catch (_e) { void _e; }
  try {
    var payload = JSON.parse(raw);
    if (payload) await idbPut(db, IDB_STORE, IDB_KEY, payload);
  } catch (_e) { void _e; }
}

async function readPreimportBackup() {
  try {
    var db = await openKvDb(IDB_DB_NAME, IDB_STORE);
    await migrateLegacyPreimportBackupOnce(db);
    return (await idbGet(db, IDB_STORE, IDB_KEY)) || null;
  } catch {
    return null;
  }
}

export async function writePreimportBackup(payload) {
  try {
    var db = await openKvDb(IDB_DB_NAME, IDB_STORE);
    await idbPut(db, IDB_STORE, IDB_KEY, payload);
  } catch (e) {
    console.warn('[preimport] failed to write pre-import backup to IndexedDB', e);
  }
}

async function syncPreimportBackupUi() {
  var wrap = document.getElementById('settings-preimport-restore-wrap');
  if (!wrap) return;
  var payload = await readPreimportBackup();
  var has = !!(payload && payload.format === 'r-plus-backup' && payload.version === 1 && payload.data);
  var meta = '';
  if (has) {
    var n = (payload.data.patients || []).length;
    var when = payload.exportedAt ? String(payload.exportedAt).slice(0, 19).replace('T', ' ') : '';
    meta = (when ? when + ' · ' : '') + n + ' paciente(s)';
  }
  wrap.style.display = has ? 'block' : 'none';
  var el = document.getElementById('settings-preimport-meta');
  if (el) el.textContent = has ? meta : '—';
}

async function restorePreimportBackupPrompt() {
  var payload = await readPreimportBackup();
  if (!payload) {
    rt.showToast(
      'No hay copia automática previa a una importación. Revisa Descargas por archivos R-plus-respaldo- o R-plus-auto-respaldo-.',
      'error'
    );
    syncPreimportBackupUi();
    return;
  }
  if (payload.format !== 'r-plus-backup' || payload.version !== 1 || !payload.data) {
    rt.showToast('Formato de respaldo no válido.', 'error');
    return;
  }
  var n = (payload.data.patients || []).length;
  var result = await openConfirm({
    weight: 'destructive',
    title:
      '¿Restaurar la copia guardada automáticamente antes de la última importación completa? (' +
      n +
      ' pacientes). La aplicación se recargará.',
    confirmLabel: 'Restaurar',
  });
  if (result !== 'confirm') {
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

export { syncPreimportBackupUi, restorePreimportBackupPrompt };
