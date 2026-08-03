/**
 * Unified patient delete: local remove + tombstone + host/Nube purge.
 * Used by sidebar × and bulk selection.
 */
import { patients } from '../../app-state.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';

function isProgramAdmin() {
  return !!(clinicalSessionContext.user && clinicalSessionContext.user.is_program_admin === 1);
}

function snapForId(patientId, list) {
  var pid = String(patientId || '').trim();
  var found = (list || patients).find(function (p) {
    return p && p.id === pid;
  });
  return found || { id: pid, registro: '' };
}

/** @param {object} partial */
async function resolveDeps(partial) {
  var deps = partial || {};
  if (
    deps.removeLocal &&
    deps.purgeHost &&
    deps.emitDelete &&
    deps.rememberTombstone &&
    deps.getRoomId
  ) {
    return {
      removeLocal: deps.removeLocal,
      rememberTombstone: deps.rememberTombstone,
      purgeHost: deps.purgeHost,
      emitDelete: deps.emitDelete,
      getRoomId: deps.getRoomId,
      patientsList: deps.patientsList || patients,
    };
  }
  var [patientDelete, emitMod, entityMod, runtimeMod] = await Promise.all([
    import('./patient-delete.mjs'),
    import('./live-sync-emit.mjs'),
    import('./entity-versions.mjs'),
    import('./runtime.mjs'),
  ]);
  return {
    removeLocal: deps.removeLocal || patientDelete.removePatientLocally,
    rememberTombstone: deps.rememberTombstone || entityMod.rememberPatientDeleteTombstone,
    purgeHost: deps.purgeHost || patientDelete.purgeLanPatientFromHost,
    emitDelete: deps.emitDelete || emitMod.emitLiveSyncPatientDelete,
    getRoomId: deps.getRoomId || runtimeMod.getActiveLiveSyncRoomId,
    patientsList: deps.patientsList || patients,
  };
}

/**
 * @param {object} res
 * @param {{ emitDelete?: Function, rememberTombstone: Function }} deps
 * @param {{ id: string, registro?: string }} snap
 */
function finishAfterPurgeMiss(res, deps, snap) {
  deps.rememberTombstone(snap);
  var err = res && res.error;
  if (err === 'owned_by_other_client') {
    return { status: 'skippedOwned' };
  }
  if (err === 'not_configured' || err === 'invalid_id') {
    if (typeof deps.emitDelete === 'function') deps.emitDelete(snap);
    return err === 'invalid_id' ? { status: 'failed', error: err } : { status: 'ok' };
  }
  if (typeof deps.emitDelete === 'function') deps.emitDelete(snap);
  return { status: 'failed', error: err || 'purge_failed' };
}

/**
 * @param {string} patientId
 * @param {{ force?: boolean, deps?: object }} [opts]
 */
export async function commitOnePatientDelete(patientId, opts) {
  opts = opts || {};
  var deps = await resolveDeps(opts.deps || {});

  var pid = String(patientId || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) {
    return { id: pid, status: 'skippedDemo' };
  }

  var snap = snapForId(pid, deps.patientsList);
  deps.removeLocal(pid);

  var roomId = String((typeof deps.getRoomId === 'function' ? deps.getRoomId() : '') || '').trim();
  if (!roomId) {
    deps.rememberTombstone(snap);
    return { id: pid, status: 'ok' };
  }

  var force = opts.force != null ? !!opts.force : isProgramAdmin();
  var res = await deps.purgeHost(pid, {
    registro: String(snap.registro || '').trim(),
    force: force,
  });
  if (res && res.ok) return { id: pid, status: 'ok' };

  var miss = finishAfterPurgeMiss(res, deps, snap);
  return { id: pid, status: miss.status, error: miss.error };
}

/**
 * @param {string[]} ids
 * @param {{ force?: boolean, deps?: object }} [opts]
 * @returns {Promise<{ ok: number, skippedOwned: number, skippedDemo: number, failed: number, results: object[] }>}
 */
export async function commitPatientDeletes(ids, opts) {
  opts = opts || {};
  var results = [];
  var ok = 0;
  var skippedOwned = 0;
  var skippedDemo = 0;
  var failed = 0;
  var seen = Object.create(null);
  for (var i = 0; i < (ids || []).length; i += 1) {
    var pid = String(ids[i] || '').trim();
    if (!pid || seen[pid]) continue;
    seen[pid] = true;
    var row = await commitOnePatientDelete(pid, opts);
    results.push(row);
    if (row.status === 'ok') ok += 1;
    else if (row.status === 'skippedOwned') skippedOwned += 1;
    else if (row.status === 'skippedDemo') skippedDemo += 1;
    else failed += 1;
  }
  return { ok: ok, skippedOwned: skippedOwned, skippedDemo: skippedDemo, failed: failed, results: results };
}

/** Spanish toast summary for batch/single delete. */
export function formatPatientDeleteSummary(summary) {
  if (!summary) return '';
  var parts = [];
  if (summary.ok > 0) {
    parts.push(
      summary.ok === 1 ? '1 paciente eliminado' : summary.ok + ' pacientes eliminados'
    );
  }
  if (summary.skippedOwned > 0) {
    parts.push(
      summary.skippedOwned +
        (summary.skippedOwned === 1
          ? ' de otro Mac (sin permiso)'
          : ' de otros Mac (sin permiso)')
    );
  }
  if (summary.failed > 0) {
    parts.push(summary.failed === 1 ? '1 fallo al sync' : summary.failed + ' fallos al sync');
  }
  return parts.join(' · ') || 'Nada que eliminar';
}
