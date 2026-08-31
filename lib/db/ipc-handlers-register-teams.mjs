import {
  listTeamsBySala,
  joinTeam,
  listTeamsForRenderer,
  listRotationVisibleTeams,
  createTeam,
  updateTeam,
  archiveTeam,
  resolveTeamByInviteCode,
  resolveClinicalUserByUsername,
  provisionClinicalUserFromCloudIdentity,
  setClinicalUserProfileFromAdmin,
  listDirectoryUsers,
  deleteDirectoryUser,
  addTeamMember,
  removeTeamMember,
  setTeamGuardiaToday,
  clearTeamGuardiaToday,
  getTeamGuardiaToday,
  listTeamMembers,
  buildActivePatientCountByTeam,
  buildLanAssignmentCountByTeam,
  withEffectiveTeamSala,
  getSalaTeamCountWarning,
  getClinicalProfile,
} from './clinical-access-db.mjs';
import { canViewUserDirectory } from './clinical-privileges.mjs';
import { bindIpcHandler } from './ipc-handlers-bind.mjs';
import { wipeClinicalUsersFor79Cutover } from './clinical-79-cutover.mjs';

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbTeamsListHandlers(ctx) {
  const { ipcMain, dbManager } = ctx;

  bindIpcHandler(ipcMain, 'db:clinical-teams-list-by-sala', async (payload) => {
    const teams = await dbManager.withTransaction((db) =>
      listTeamsBySala(db, {
        sala: String(payload.sala || ''),
        forUserId: String(payload.forUserId || ''),
        allSalas: payload.allSalas === true,
      })
    );
    return { ok: true, teams };
  });

  bindIpcHandler(ipcMain, 'db:clinical-teams-join', async (payload) => {
    const result = await dbManager.withTransaction((db) => {
      const userId = String(payload.userId || '');
      // Do not stamp last_activity_at — join can be admin-driven for another user.
      return joinTeam(db, String(payload.teamId || ''), userId, {
        subAreaFraction: payload.subAreaFraction ? String(payload.subAreaFraction) : undefined,
      });
    });
    return { ok: true, warnings: result?.warnings || [] };
  });

  bindIpcHandler(ipcMain, 'db:clinical-teams-list', async (payload) => {
    const forUserId = String(payload?.userId || '');
    const teams = await dbManager.withTransaction((db) => {
      const patientCounts = buildActivePatientCountByTeam(db);
      const lanAssignmentCounts = buildLanAssignmentCountByTeam(db);
      return listTeamsForRenderer(db, forUserId).map((team) => ({
        ...withEffectiveTeamSala(db, team),
        members: listTeamMembers(db, team.team_id),
        guardia_today: getTeamGuardiaToday(db, team.team_id) ?? null,
        patientCount: patientCounts.get(team.team_id) || 0,
        lanAssignmentCount: lanAssignmentCounts.get(team.team_id) || 0,
      }));
    });
    return { ok: true, teams };
  });
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbTeamsCrudHandlers(ctx) {
  const { ipcMain, dbManager } = ctx;

  bindIpcHandler(ipcMain, 'db:clinical-teams-create', async (payload) => {
    const sala = payload.sala ? String(payload.sala) : null;
    const result = await dbManager.withTransaction((db) => {
      const team = createTeam(db, {
        name: String(payload.name || ''),
        service: String(payload.service || ''),
        onCallDayIndex: Number(payload.onCallDayIndex ?? 0),
        subAreaFraction: payload.subAreaFraction ? String(payload.subAreaFraction) : undefined,
        sala,
        teamLeaderName: payload.teamLeaderName ? String(payload.teamLeaderName) : null,
        leaderUserId: payload.leaderUserId ? String(payload.leaderUserId) : undefined,
        createdBy: payload.createdBy ? String(payload.createdBy) : undefined,
      });
      const warning = sala ? getSalaTeamCountWarning(db, sala) : null;
      return { team, warnings: warning ? [warning] : [] };
    });
    return { ok: true, team: result.team, warnings: result.warnings };
  });

  bindIpcHandler(ipcMain, 'db:clinical-teams-update', async (payload) => {
    const result = await dbManager.withTransaction((db) =>
      updateTeam(db, String(payload.teamId || ''), {
        name: payload.name != null ? String(payload.name) : undefined,
        sala: payload.sala != null ? String(payload.sala) : undefined,
        succeedsTeamId: payload.succeedsTeamId !== undefined ? String(payload.succeedsTeamId || '') : undefined,
        callerUserId: String(payload.callerUserId || ''),
      })
    );
    return { ok: true, team: result, warnings: result.warnings || [] };
  });

  bindIpcHandler(ipcMain, 'db:clinical-teams-archive', async (payload) => {
    const result = await dbManager.withTransaction((db) =>
      archiveTeam(db, String(payload.teamId || ''), String(payload.callerUserId || ''))
    );
    return { ok: true, ...result };
  });

  bindIpcHandler(ipcMain, 'db:clinical-team-resolve-code', async (payload) => {
    const team = await dbManager.withTransaction((db) =>
      resolveTeamByInviteCode(db, String(payload.code || ''))
    );
    return { ok: true, team: team ?? null };
  });
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} callerUserId
 * @param {string} deniedMessage
 */
function requireDirectoryAccess(db, callerUserId, deniedMessage) {
  const caller = callerUserId ? getClinicalProfile(db, callerUserId) : null;
  if (!canViewUserDirectory(caller)) {
    throw new Error(deniedMessage);
  }
  return caller;
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbClinicalUserHandlers(ctx) {
  const { ipcMain, dbManager, getClientId } = ctx;

  bindIpcHandler(ipcMain, 'db:clinical-user-lookup', async (payload) => {
    const user = await dbManager.withTransaction((db) =>
      resolveClinicalUserByUsername(db, { username: String(payload.username || '') })
    );
    return { ok: true, user: user ?? null };
  });

  bindIpcHandler(ipcMain, 'db:clinical-user-provision-cloud', async (payload) => {
    const callerUserId = String(payload.callerUserId || '');
    const user = await dbManager.withTransaction((db) => {
      requireDirectoryAccess(
        db,
        callerUserId,
        'Solo R4, Admin o usuarios con privilegios de administración pueden aprovisionar usuarios.'
      );
      return provisionClinicalUserFromCloudIdentity(db, {
        username: String(payload.username || ''),
        displayName: payload.displayName != null ? String(payload.displayName) : undefined,
        rank: payload.rank != null ? String(payload.rank) : undefined,
        sala: payload.sala != null ? String(payload.sala) : undefined,
      });
    });
    return { ok: true, user };
  });

  bindIpcHandler(ipcMain, 'db:clinical-user-admin-profile', async (payload) => {
    const callerUserId = String(payload.callerUserId || '');
    const user = await dbManager.withTransaction((db) => {
      requireDirectoryAccess(
        db,
        callerUserId,
        'Solo R4, Admin o usuarios con privilegios de administración pueden editar perfiles.'
      );
      return setClinicalUserProfileFromAdmin(db, {
        username: String(payload.username || ''),
        rank: payload.rank != null ? String(payload.rank) : undefined,
        displayName: payload.displayName != null ? String(payload.displayName) : undefined,
        sala: payload.sala != null ? String(payload.sala) : undefined,
      });
    });
    return { ok: true, user };
  });

  bindIpcHandler(ipcMain, 'db:clinical-users-list', async (payload) => {
    const callerUserId = String(payload.callerUserId || '');
    const users = await dbManager.withTransaction((db) => {
      requireDirectoryAccess(
        db,
        callerUserId,
        'Solo R4, Admin o usuarios con privilegios de administración pueden ver el directorio LAN.'
      );
      return listDirectoryUsers(db);
    });
    return { ok: true, users };
  });

  bindIpcHandler(ipcMain, 'db:clinical-user-delete', async (payload) => {
    const result = await dbManager.withTransaction((db, { audit }) => {
      const out = deleteDirectoryUser(db, {
        targetUserId: String(payload.targetUserId || ''),
        callerUserId: String(payload.callerUserId || ''),
      });
      audit(getClientId(), 'clinical.user.delete', {
        targetUserId: out.userId,
        callerUserId: String(payload.callerUserId || ''),
      });
      return out;
    });
    return { ok: true, ...result };
  });

  bindIpcHandler(ipcMain, 'db:clinical-79-cutover-wipe', async () => {
    const result = await dbManager.withTransaction((db, { audit }) => {
      const out = wipeClinicalUsersFor79Cutover(db);
      audit(getClientId(), 'clinical.79.cutover.wipe', { count: out.count });
      return out;
    });
    return { ok: true, ...result };
  });
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbTeamsMembershipHandlers(ctx) {
  const { ipcMain, dbManager } = ctx;

  bindIpcHandler(ipcMain, 'db:clinical-teams-member-add', async (payload) => {
    const result = await dbManager.withTransaction((db) => {
      let userId = payload.userId ? String(payload.userId) : '';
      if (!userId && payload.username) {
        const resolved = resolveClinicalUserByUsername(db, {
          username: String(payload.username || ''),
        });
        userId = resolved?.user_id ? String(resolved.user_id) : '';
      }
      if (!userId) {
        throw new Error(
          'Usuario no encontrado. Debe registrar su usuario LAN en Mi rotación (sin @, minúsculas).'
        );
      }
      // Do not touch last_activity_at on admin assign — stamps fake "Activo".
      return addTeamMember(db, String(payload.teamId || ''), userId, {
        subAreaFraction: payload.subAreaFraction ? String(payload.subAreaFraction) : undefined,
        // Default move-off-others; pass exclusive:false only to allow multi-team (rare).
        exclusive: payload.exclusive !== false,
      });
    });
    return { ok: true, warnings: result?.warnings || [], movedFrom: result?.movedFrom || 0 };
  });

  bindIpcHandler(ipcMain, 'db:clinical-teams-member-remove', async (payload) => {
    await dbManager.withTransaction((db) =>
      removeTeamMember(db, String(payload.teamId || ''), String(payload.userId || ''))
    );
    return { ok: true };
  });
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbTeamsMemberHandlers(ctx) {
  registerDbClinicalUserHandlers(ctx);
  registerDbTeamsMembershipHandlers(ctx);
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbTeamsGuardiaHandlers(ctx) {
  const { ipcMain, dbManager } = ctx;

  bindIpcHandler(ipcMain, 'db:clinical-teams-guardia-set', async (payload) => {
    await dbManager.withTransaction((db) => {
      const userId = String(payload.userId || '');
      // Admin can set another user's guardia — must not fake their last_activity_at.
      setTeamGuardiaToday(db, String(payload.teamId || ''), userId);
    });
    return { ok: true };
  });

  bindIpcHandler(ipcMain, 'db:clinical-teams-guardia-clear', async (payload) => {
    await dbManager.withTransaction((db) =>
      clearTeamGuardiaToday(db, String(payload.teamId || ''))
    );
    return { ok: true };
  });

  bindIpcHandler(ipcMain, 'db:clinical-teams-guardia-get', async (payload) => {
    const guardia = await dbManager.withTransaction((db) =>
      getTeamGuardiaToday(db, String(payload.teamId || ''))
    );
    return { ok: true, guardia: guardia ?? null };
  });
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
export function registerDbTeamsHandlers(ctx) {
  registerDbTeamsListHandlers(ctx);
  registerDbTeamsCrudHandlers(ctx);
  registerDbTeamsMemberHandlers(ctx);
  registerDbTeamsGuardiaHandlers(ctx);
}