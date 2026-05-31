import fs from 'node:fs';
import path from 'node:path';
import { loadAllBlobs, upsertBlob } from './clinical-blobs.mjs';
import { LS_KEY_TO_BLOB } from './clinical-blob-keys.mjs';
import { clinicalDbPath } from './db-path.mjs';
import { readHostState } from './lan-host-persistence.mjs';
import { verifyChainRows } from './forensic-audit.mjs';
import {
  migrationPending as computeMigrationPending,
  probeMigrationNeeded,
  runLegacyMigrationIfNeeded,
} from './migration-probe.mjs';
import { SCHEMA_VERSION } from './schema.mjs';

const DEFAULT_AUDIT_EXPORT_LIMIT = 200;

function ipcError(err) {
  return {
    ok: false,
    code: err?.code || 'DB_ERROR',
    error: err?.message || String(err),
  };
}

function readSchemaVersion(db) {
  const row = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
  if (!row?.value) return null;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : null;
}

function parseBlobValue(json, fallback) {
  if (json == null || json === '') return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function buildBackupEnvelope({ blobs, hostState, appVersion }) {
  const data = {};
  for (const blobKey of Object.values(LS_KEY_TO_BLOB)) {
    const raw = blobs[blobKey];
    if (raw == null) continue;
    const defaults =
      blobKey === 'patients' || blobKey === 'scheduledProcedures' || blobKey === 'todos'
        ? []
        : blobKey === 'medCatalog'
          ? null
          : {};
    data[blobKey] = parseBlobValue(raw, defaults);
  }
  if (hostState) {
    data.lanHost = {
      version: hostState.version,
      teamCodeHash: hostState.teamCodeHash,
      patients: hostState.patients ?? [],
      rooms: hostState.rooms ?? [],
      roomSyncBundles: hostState.roomSyncBundles ?? {},
    };
  }
  return {
    format: 'r-plus-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: appVersion ?? null,
    phiWarning:
      'Este archivo contiene información clínica identificable en texto plano. Guárdelo solo en medios cifrados y autorizados.',
    data,
  };
}

function fetchAuditRows(db, mode) {
  if (mode === 'quick') {
    const last = db
      .prepare(
        `SELECT id, timestamp, client_id, event_type, payload_hash, previous_hash, current_hash
         FROM forensic_audit_chain ORDER BY id DESC LIMIT 2`
      )
      .all()
      .reverse();
    return last;
  }
  return db
    .prepare(
      `SELECT id, timestamp, client_id, event_type, payload_hash, previous_hash, current_hash
       FROM forensic_audit_chain ORDER BY id ASC`
    )
    .all();
}

/**
 * @param {{
 *   ipcMain: import('electron').IpcMain,
 *   dbManager: ReturnType<import('./db-manager.mjs').createDbManager>,
 *   app: import('electron').App,
 *   dialog: import('electron').Dialog,
 *   safeStorage: import('electron').SafeStorage,
 *   getClientId: () => string,
 * }} opts
 */
export function registerDbIpcHandlers({
  ipcMain,
  dbManager,
  app,
  dialog,
  safeStorage: _safeStorage,
  getClientId,
}) {
  const userDataPath = () => app.getPath('userData');

  ipcMain.handle('db:status', async () => {
    const state = dbManager.getState();
    const db = dbManager.getDb();
    const ud = userDataPath();
    const dbPath = clinicalDbPath(ud);
    let schemaVersion = null;
    if (db) schemaVersion = readSchemaVersion(db);
    return {
      ok: true,
      state,
      schemaVersion,
      targetSchemaVersion: SCHEMA_VERSION,
      migrationPending: computeMigrationPending(ud, db),
      dbFileExists: fs.existsSync(dbPath),
      rateLimited: dbManager.isRateLimited(),
    };
  });

  ipcMain.handle('db:migration-probe', async (_e, payload = {}) => {
    const lsSnapshot =
      payload.lsSnapshot && typeof payload.lsSnapshot === 'object' ? payload.lsSnapshot : {};
    const probe = probeMigrationNeeded({ userDataPath: userDataPath(), lsSnapshot });
    return { ok: true, ...probe };
  });

  ipcMain.handle('db:unlock', async (_e, payload = {}) => {
    const lsSnapshot =
      payload.lsSnapshot && typeof payload.lsSnapshot === 'object' ? payload.lsSnapshot : {};
    try {
      await dbManager.unlockWithPassphrase(String(payload.passphrase || ''), {
        remember: !!payload.remember,
      });
      const migration = await runLegacyMigrationIfNeeded({
        dbManager,
        userDataPath: userDataPath(),
        lsSnapshot,
      });
      const result = { ok: true, state: dbManager.getState() };
      if (migration.migrated && migration.clearKeys.length) {
        result.clearKeys = migration.clearKeys;
        result.migrated = true;
      }
      return result;
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:lock', async () => {
    dbManager.lock();
    return { ok: true, state: dbManager.getState() };
  });

  ipcMain.handle('db:clinical-load-all', async () => {
    try {
      const blobs = await dbManager.withTransaction((db) => loadAllBlobs(db));
      return { ok: true, blobs };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-save-all', async (_e, payload = {}) => {
    const blobs = payload.blobs && typeof payload.blobs === 'object' ? payload.blobs : {};
    const auditMeta = payload.auditMeta && typeof payload.auditMeta === 'object' ? payload.auditMeta : {};
    try {
      await dbManager.withTransaction((db, { audit }) => {
        for (const [blobKey, json] of Object.entries(blobs)) {
          if (typeof json !== 'string') continue;
          upsertBlob(db, blobKey, json);
        }
        audit(getClientId(), auditMeta.eventType || 'clinical.save_all', {
          blobKeys: Object.keys(blobs),
          ...(auditMeta.meta && typeof auditMeta.meta === 'object' ? auditMeta.meta : {}),
        });
      });
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:audit-verify', async (_e, payload = {}) => {
    const mode = payload.mode === 'quick' ? 'quick' : 'full';
    try {
      const brokenAtId = await dbManager.withTransaction((db) => {
        const rows = fetchAuditRows(db, mode);
        return verifyChainRows(rows);
      });
      return {
        ok: true,
        valid: brokenAtId == null,
        brokenAtId: brokenAtId ?? null,
        mode,
      };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:audit-export', async (_e, payload = {}) => {
    const limit = Math.min(
      Math.max(Number(payload.limit) || DEFAULT_AUDIT_EXPORT_LIMIT, 1),
      5000
    );
    try {
      const entries = await dbManager.withTransaction((db) =>
        db
          .prepare(
            `SELECT id, timestamp, client_id, event_type, payload_hash, previous_hash, current_hash
             FROM forensic_audit_chain ORDER BY id DESC LIMIT ?`
          )
          .all(limit)
          .reverse()
      );
      return { ok: true, entries };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:backup-export-json', async () => {
    try {
      const result = await dbManager.withTransaction((db, { audit }) => {
        const blobs = loadAllBlobs(db);
        const hostState = readHostState(db);
        audit(getClientId(), 'clinical.backup.export', {
          format: 'json',
          blobCount: Object.keys(blobs).length,
        });
        return buildBackupEnvelope({
          blobs,
          hostState,
          appVersion: app.getVersion(),
        });
      });
      return { ok: true, envelope: result };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:backup-export-db', async () => {
    const dbPath = clinicalDbPath(userDataPath());
    if (!fs.existsSync(dbPath)) {
      return { ok: false, code: 'DB_NOT_FOUND', error: 'Clinical database file not found' };
    }
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exportar copia cifrada de la base de datos',
      defaultPath: path.join(
        app.getPath('downloads'),
        `rplus-clinical-${new Date().toISOString().slice(0, 10)}.db`
      ),
      filters: [{ name: 'SQLCipher database', extensions: ['db'] }],
    });
    if (canceled || !filePath) {
      return { ok: false, canceled: true };
    }
    try {
      await dbManager.withTransaction((db, { audit }) => {
        const escaped = filePath.replace(/'/g, "''");
        try {
          db.exec(`VACUUM INTO '${escaped}'`);
        } catch {
          fs.copyFileSync(dbPath, filePath);
        }
        audit(getClientId(), 'clinical.backup.export', { format: 'db', path: path.basename(filePath) });
      });
      return { ok: true, path: filePath };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:change-passphrase', async () => ({
    ok: false,
    code: 'NOT_IMPLEMENTED',
    error: 'Passphrase change (rekey) is not implemented yet',
  }));
}

/** @deprecated internal — exported for tests */
export const __test = {
  migrationPending: computeMigrationPending,
  buildBackupEnvelope,
  probeMigrationNeeded,
};
