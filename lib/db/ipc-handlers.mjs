import fs from 'node:fs';
import path from 'node:path';
import { loadAllBlobs, upsertBlob } from './clinical-blobs.mjs';
import { LS_KEY_TO_BLOB } from './clinical-blob-keys.mjs';
import { clinicalDbPath, clinicalUnlockMetaPath } from './db-path.mjs';
import { readHostState } from './lan-host-persistence.mjs';
import { verifyChainRows } from './forensic-audit.mjs';
import {
  ensureClinicalUser,
  resolveBootstrapClinicalUser,
  fetchActiveGuardias,
  upsertActiveGuardia,
  upsertRotationCycle,
  getActiveRotationCycle,
  archiveRotationAndTeams,
  fetchIncomingAssignments,
  createTeam,
  listActiveTeams,
  listTeamsBySala,
  joinTeam,
  addTeamMember,
  removeTeamMember,
  setTeamGuardiaToday,
  clearTeamGuardiaToday,
  getTeamGuardiaToday,
  listTeamMembers,
  getClinicalProfile,
  upsertClinicalProfile,
  claimUsername,
  attachClinicalIdentityByUsername,
  migrateTeamMemberships,
  getClinicalScopeContext,
  promoteTeamLeader,
  getTeamById,
  findUserTeamForAutoAssign,
  assignPatientToTeam,
} from './clinical-access-db.mjs';
import { signClinicalChange, verifyIncomingPeerChange } from './clinical-crypto.mjs';
import {
  exportClinicalOpsSnapshot,
  mergeClinicalOpsSnapshot,
  stampRotationNuevaAt,
} from './clinical-ops-sync.mjs';
import {
  migrationPending as computeMigrationPending,
  probeMigrationNeeded,
  runLegacyMigrationIfNeeded,
} from './migration-probe.mjs';
import { SCHEMA_VERSION } from './schema.mjs';
import { probeNativeDatabaseLoad } from './native-load.mjs';

const DEFAULT_AUDIT_EXPORT_LIMIT = 200;

function ipcError(err) {
  const cause = err?.cause;
  return {
    ok: false,
    code: err?.code || 'DB_ERROR',
    error: err?.message || String(err),
    cause: cause && (cause.message || String(cause)),
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

  /**
   * @param {Record<string, unknown>} lsSnapshot
   * @param {{ recoveryCodeToShow?: string } | void} unlockResult
   */
  async function finishDbUnlockResponse(lsSnapshot, unlockResult) {
    const result = { ok: true, state: dbManager.getState() };
    if (unlockResult && unlockResult.recoveryCodeToShow) {
      result.recoveryCodeToShow = unlockResult.recoveryCodeToShow;
    }
    try {
      const migration = await runLegacyMigrationIfNeeded({
        dbManager,
        userDataPath: userDataPath(),
        lsSnapshot,
      });
      if (migration.migrated && migration.clearKeys.length) {
        result.clearKeys = migration.clearKeys;
        result.migrated = true;
      }
    } catch (migErr) {
      result.migrationWarning =
        (migErr && migErr.message) || 'No se pudieron migrar los datos locales a la base cifrada.';
    }
    return result;
  }

  ipcMain.handle('db:status', async () => {
    const state = dbManager.getState();
    const db = dbManager.getDb();
    const ud = userDataPath();
    const dbPath = clinicalDbPath(ud);
    let schemaVersion = null;
    if (db) schemaVersion = readSchemaVersion(db);
    let hasKdfSalt = false;
    try {
      const metaPath = clinicalUnlockMetaPath(ud);
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        hasKdfSalt = !!meta.kdf_salt;
      }
    } catch {
      /* unreadable meta */
    }
    const nativeProbe = probeNativeDatabaseLoad();
    return {
      ok: true,
      state,
      schemaVersion,
      targetSchemaVersion: SCHEMA_VERSION,
      migrationPending: computeMigrationPending(ud, db),
      dbFileExists: fs.existsSync(dbPath),
      hasKdfSalt,
      rateLimited: dbManager.isRateLimited(),
      nativeReady: nativeProbe.ok === true,
      nativeError: nativeProbe.ok ? null : nativeProbe.message,
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
    let unlockResult;
    try {
      unlockResult = await dbManager.unlockWithPassphrase(String(payload.passphrase || ''), {
        remember: !!payload.remember,
        setup: !!payload.setup,
      });
    } catch (err) {
      return ipcError(err);
    }

    return finishDbUnlockResponse(lsSnapshot, unlockResult);
  });

  ipcMain.handle('db:auto-unlock', async (_e, payload = {}) => {
    const lsSnapshot =
      payload.lsSnapshot && typeof payload.lsSnapshot === 'object' ? payload.lsSnapshot : {};
    try {
      const unlockResult = await dbManager.ensureUnlocked();
      return finishDbUnlockResponse(lsSnapshot, unlockResult);
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:unlock-recovery', async (_e, payload = {}) => {
    const code = String(payload.code || '');
    try {
      const unlockResult = await dbManager.unlockWithRecoveryCode(code);
      const result = { ok: true, state: dbManager.getState() };
      if (unlockResult && unlockResult.recoveryCodeToShow) {
        result.recoveryCodeToShow = unlockResult.recoveryCodeToShow;
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
      const blobs = await dbManager.withTransaction((db) => {
        const loaded = loadAllBlobs(db);
        loaded.clinicalOps = JSON.stringify(exportClinicalOpsSnapshot(db));
        return loaded;
      });
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
          if (blobKey === 'clinicalOps') continue;
          if (typeof json !== 'string') continue;
          upsertBlob(db, blobKey, json);
        }
        if (typeof blobs.clinicalOps === 'string' && blobs.clinicalOps.trim()) {
          let incoming = null;
          try {
            incoming = JSON.parse(blobs.clinicalOps);
          } catch (_e) {
            incoming = null;
          }
          if (incoming && typeof incoming === 'object') {
            mergeClinicalOpsSnapshot(db, incoming);
          }
        }
        audit(getClientId(), auditMeta.eventType || 'clinical.save_all', {
          changedKeys: Object.keys(blobs),
          ...(auditMeta.meta && typeof auditMeta.meta === 'object' ? auditMeta.meta : {}),
        });
      });
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-ops-export', async () => {
    try {
      const snapshot = await dbManager.withTransaction((db) => exportClinicalOpsSnapshot(db));
      return { ok: true, snapshot };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-ops-merge', async (_e, payload = {}) => {
    const snapshot = payload.snapshot && typeof payload.snapshot === 'object' ? payload.snapshot : null;
    if (!snapshot) {
      return { ok: false, code: 'INVALID_SNAPSHOT', error: 'snapshot required' };
    }
    try {
      await dbManager.withTransaction((db, { audit }) => {
        mergeClinicalOpsSnapshot(db, snapshot);
        audit(getClientId(), 'clinical.ops.merge', {
          exportedAt: snapshot.exportedAt || null,
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

  ipcMain.handle('db:change-passphrase', async (_e, payload = {}) => {
    if (dbManager.getState() !== 'unlocked') {
      return ipcError(Object.assign(new Error('Database locked'), { code: 'DB_LOCKED' }));
    }
    try {
      await dbManager.changePassphrase({
        currentPassphrase: String(payload.currentPassphrase || ''),
        newPassphrase: String(payload.newPassphrase || ''),
        remember: !!payload.remember,
      });
      return { ok: true, state: dbManager.getState() };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-access-bootstrap', async (_e, payload = {}) => {
    try {
      const result = await dbManager.withTransaction((db, { audit }) => {
        const user = resolveBootstrapClinicalUser(db, {
          clientId: String(payload.clientId || getClientId()),
          rank: String(payload.rank || 'R1'),
          preferredUserId: payload.preferredUserId
            ? String(payload.preferredUserId)
            : undefined,
          preferredUsername: payload.preferredUsername
            ? String(payload.preferredUsername)
            : undefined,
        });
        const guardias = fetchActiveGuardias(db, user.userId);
        audit(getClientId(), 'clinical.access.bootstrap', {
          userId: user.userId,
          guardiaCount: guardias.length,
        });
        return { user, guardias };
      });
      return { ok: true, ...result };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-scope-context', async (_e, payload = {}) => {
    try {
      const context = await dbManager.withTransaction((db) =>
        getClinicalScopeContext(db, payload.userId ? String(payload.userId) : undefined)
      );
      return { ok: true, context };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:guardia-census', async (_e, payload = {}) => {
    try {
      const guardias = await dbManager.withTransaction((db) => {
        const userId = payload.userId ? String(payload.userId) : null;
        return fetchActiveGuardias(db, userId || undefined);
      });
      return { ok: true, guardias };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:guardia-upsert', async (_e, payload = {}) => {
    try {
      const guardia = await dbManager.withTransaction((db, { audit }) => {
        const row = upsertActiveGuardia(db, {
          patientId: String(payload.patientId || ''),
          coveringUserId: String(payload.coveringUserId || ''),
          sourceTeamId: String(payload.sourceTeamId || ''),
          guardiaId: payload.guardiaId ? String(payload.guardiaId) : undefined,
          isCritical: payload.isCritical,
          pendientesJson: payload.pendientesJson,
          vitalsFrequency: payload.vitalsFrequency,
          lastVitalsCheck: payload.lastVitalsCheck
            ? String(payload.lastVitalsCheck)
            : undefined,
        });
        audit(getClientId(), 'entrega.assign', {
          patientId: row.patient_id,
          guardiaId: row.guardia_id,
          coveringUserId: row.covering_user_id,
        });
        return row;
      });
      return { ok: true, guardia };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:rotation-cycle-get', async () => {
    try {
      const cycle = await dbManager.withTransaction((db) => getActiveRotationCycle(db));
      return { ok: true, cycle: cycle ?? null };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:rotation-cycle-upsert', async (_e, payload = {}) => {
    try {
      const cycle = await dbManager.withTransaction((db) =>
        upsertRotationCycle(db, {
          monthEndAt: String(payload.monthEndAt || ''),
          effectiveAt: String(payload.effectiveAt || ''),
          previewDays: payload.previewDays ?? 2,
          createdBy: payload.createdBy ? String(payload.createdBy) : undefined,
        })
      );
      return { ok: true, cycle };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:rotation-nueva', async (_e, payload = {}) => {
    try {
      await dbManager.withTransaction((db, { audit }) => {
        const now = new Date().toISOString();
        archiveRotationAndTeams(db);
        stampRotationNuevaAt(db, now);
        if (payload.userId) {
          audit(getClientId(), 'rotation.nueva', { userId: String(payload.userId) });
        }
      });
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:rotation-incoming-assignments', async () => {
    try {
      const assignments = await dbManager.withTransaction((db) =>
        fetchIncomingAssignments(db, new Date().toISOString())
      );
      return { ok: true, assignments };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-list-by-sala', async (_e, payload = {}) => {
    try {
      const teams = await dbManager.withTransaction((db) =>
        listTeamsBySala(db, {
          sala: String(payload.sala || ''),
          forUserId: String(payload.forUserId || ''),
          allSalas: payload.allSalas === true,
        })
      );
      return { ok: true, teams };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-join', async (_e, payload = {}) => {
    try {
      await dbManager.withTransaction((db) =>
        joinTeam(db, String(payload.teamId || ''), String(payload.userId || ''))
      );
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-list', async () => {
    try {
      const teams = await dbManager.withTransaction((db) =>
        listActiveTeams(db).map((team) => ({
          ...team,
          members: listTeamMembers(db, team.team_id),
          guardia_today: getTeamGuardiaToday(db, team.team_id) ?? null,
        }))
      );
      return { ok: true, teams };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-create', async (_e, payload = {}) => {
    try {
      const team = await dbManager.withTransaction((db) =>
        createTeam(db, {
          name: String(payload.name || ''),
          service: String(payload.service || ''),
          onCallDayIndex: Number(payload.onCallDayIndex ?? 0),
          subAreaFraction: payload.subAreaFraction
            ? String(payload.subAreaFraction)
            : undefined,
          sala: payload.sala ? String(payload.sala) : null,
          teamLeaderName: payload.teamLeaderName ? String(payload.teamLeaderName) : null,
          leaderUserId: payload.leaderUserId ? String(payload.leaderUserId) : undefined,
          createdBy: payload.createdBy ? String(payload.createdBy) : undefined,
        })
      );
      return { ok: true, team };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-member-add', async (_e, payload = {}) => {
    try {
      await dbManager.withTransaction((db) => {
        let userId = payload.userId ? String(payload.userId) : '';
        if (!userId && payload.username) {
          const row = db
            .prepare('SELECT user_id FROM users WHERE username = ?')
            .get(String(payload.username).trim());
          userId = row?.user_id ? String(row.user_id) : '';
        }
        if (!userId) {
          throw new Error('Usuario no encontrado');
        }
        addTeamMember(db, String(payload.teamId || ''), userId);
      });
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-member-remove', async (_e, payload = {}) => {
    try {
      await dbManager.withTransaction((db) =>
        removeTeamMember(db, String(payload.teamId || ''), String(payload.userId || ''))
      );
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-guardia-set', async (_e, payload = {}) => {
    try {
      await dbManager.withTransaction((db) =>
        setTeamGuardiaToday(db, String(payload.teamId || ''), String(payload.userId || ''))
      );
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-guardia-clear', async (_e, payload = {}) => {
    try {
      await dbManager.withTransaction((db) =>
        clearTeamGuardiaToday(db, String(payload.teamId || ''))
      );
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-guardia-get', async (_e, payload = {}) => {
    try {
      const guardia = await dbManager.withTransaction((db) =>
        getTeamGuardiaToday(db, String(payload.teamId || ''))
      );
      return { ok: true, guardia: guardia ?? null };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-profile-get', async (_e, payload = {}) => {
    try {
      const profile = await dbManager.withTransaction((db) =>
        getClinicalProfile(db, String(payload.userId || ''))
      );
      return { ok: true, profile };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-membership-migrate', async (_e, payload = {}) => {
    try {
      const moved = await dbManager.withTransaction((db) =>
        migrateTeamMemberships(db, {
          fromUserId: String(payload.fromUserId || ''),
          toUserId: String(payload.toUserId || ''),
        })
      );
      return { ok: true, ...moved };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-identity-resume', async (_e, payload = {}) => {
    try {
      const result = await dbManager.withTransaction((db, { audit }) => {
        const fromUserId = String(payload.fromUserId || '');
        const user = attachClinicalIdentityByUsername(db, String(payload.username || ''));
        let membershipMoved = 0;
        if (fromUserId && fromUserId !== user.userId) {
          membershipMoved = migrateTeamMemberships(db, {
            fromUserId,
            toUserId: user.userId,
          }).moved;
        }
        const guardias = fetchActiveGuardias(db, user.userId);
        audit(getClientId(), 'clinical.identity.resume', {
          userId: user.userId,
          username: user.username,
          membershipMoved,
        });
        return { user, guardias, membershipMoved };
      });
      return { ok: true, ...result };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-username-claim', async (_e, payload = {}) => {
    try {
      const profile = await dbManager.withTransaction((db) =>
        claimUsername(db, {
          userId: String(payload.userId || ''),
          username: String(payload.username || ''),
        })
      );
      return { ok: true, profile };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-profile-upsert', async (_e, payload = {}) => {
    try {
      const profile = await dbManager.withTransaction((db) =>
        upsertClinicalProfile(db, {
          userId: String(payload.userId || ''),
          clinicalName: String(payload.clinicalName || ''),
          rank: String(payload.rank || 'R1'),
          sala: String(payload.sala || ''),
          username: payload.username != null ? String(payload.username) : undefined,
          isProgramAdmin: payload.isProgramAdmin,
        })
      );
      return { ok: true, profile };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-teams-promote-leader', async (_e, payload = {}) => {
    try {
      const team = await dbManager.withTransaction((db) =>
        promoteTeamLeader(db, String(payload.teamId || ''), String(payload.userId || ''))
      );
      return { ok: true, team: team ?? null };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-team-get-by-id', async (_e, payload = {}) => {
    try {
      const team = await dbManager.withTransaction((db) =>
        getTeamById(db, String(payload.teamId || ''))
      );
      return { ok: true, team: team ?? null };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-find-user-team', async (_e, payload = {}) => {
    try {
      const row = await dbManager.withTransaction((db) =>
        findUserTeamForAutoAssign(db, String(payload.userId || ''))
      );
      return { ok: true, teamId: row?.team_id ?? null };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:clinical-assign-patient-to-team', async (_e, payload = {}) => {
    try {
      await dbManager.withTransaction((db) =>
        assignPatientToTeam(db, {
          patientId: String(payload.patientId || ''),
          teamId: String(payload.teamId || ''),
          effectiveAt: String(payload.effectiveAt || new Date().toISOString()),
        })
      );
      return { ok: true };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:sign-clinical-change', async (_e, payload = {}) => {
    try {
      const signed = signClinicalChange({
        userId: String(payload.userId || ''),
        privateKeyPem: String(payload.privateKeyPem || ''),
        patientId: String(payload.patientId || ''),
        actionType: String(payload.actionType || 'clinical.mutation'),
        deltaData: payload.deltaData ?? {},
        lastBlockHash: String(payload.lastBlockHash || 'genesis'),
      });
      return { ok: true, signed };
    } catch (err) {
      return ipcError(err);
    }
  });

  ipcMain.handle('db:verify-clinical-change', async (_e, payload = {}) => {
    try {
      const valid = verifyIncomingPeerChange(
        payload.transactionBody || {},
        String(payload.signature || ''),
        String(payload.publicKeyPem || '')
      );
      return { ok: true, valid };
    } catch (err) {
      return ipcError(err);
    }
  });
}

/** @deprecated internal — exported for tests */
export const __test = {
  migrationPending: computeMigrationPending,
  buildBackupEnvelope,
  probeMigrationNeeded,
};
