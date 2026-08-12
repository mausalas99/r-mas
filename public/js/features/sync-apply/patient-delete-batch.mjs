/**
 * Nube-native patient delete: local remove + local tombstone + cloud wipe.
 * Used by sidebar × and bulk selection.
 */
import { getPatients } from '../../app-state.mjs';
import { removePatientLocally } from './patient-delete.mjs';
import { rememberPatientDeleteTombstone } from './entity-versions-stub.mjs';
import { enqueueCloudPatientDelete } from '../cloud-sync/mutate-bridge.mjs';

function snapForId(patientId, list) {
  var pid = String(patientId || '').trim();
  var found = (list || getPatients()).find(function (p) {
    return p && String(p.id) === pid;
  });
  return found || { id: pid, registro: '' };
}

/**
 * @param {object} [partial]
 * @returns {{
 *   removeLocal: (id: string) => boolean,
 *   rememberTombstone: (snap: object) => void,
 *   enqueueCloudDelete: (snap: object) => void,
 *   patientsList: object[],
 * }}
 */
function resolveDeps(partial) {
  var deps = partial || {};
  return {
    removeLocal: deps.removeLocal || removePatientLocally,
    rememberTombstone: deps.rememberTombstone || rememberPatientDeleteTombstone,
    enqueueCloudDelete: deps.enqueueCloudDelete || enqueueCloudPatientDelete,
    patientsList: deps.patientsList || getPatients(),
  };
}

/**
 * @param {string} patientId
 * @param {{ deps?: object }} [opts]
 */
export async function commitOnePatientDelete(patientId, opts) {
  opts = opts || {};
  var deps = resolveDeps(opts.deps || {});

  var pid = String(patientId || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) {
    return { id: pid, status: 'skippedDemo' };
  }

  var snap = snapForId(pid, deps.patientsList);
  var registro = String(snap.registro || '').trim();
  var cloudSnap = { id: pid, registro: registro };

  deps.removeLocal(pid);
  deps.rememberTombstone(cloudSnap);
  deps.enqueueCloudDelete(cloudSnap);

  return { id: pid, status: 'ok' };
}

/**
 * @param {string[]} ids
 * @param {{ deps?: object }} [opts]
 * @returns {Promise<{ ok: number, skippedDemo: number, failed: number, results: object[] }>}
 */
export async function commitPatientDeletes(ids, opts) {
  opts = opts || {};
  var results = [];
  var ok = 0;
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
    else if (row.status === 'skippedDemo') skippedDemo += 1;
    else failed += 1;
  }
  return { ok: ok, skippedDemo: skippedDemo, failed: failed, results: results };
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
  if (summary.failed > 0) {
    parts.push(summary.failed === 1 ? '1 fallo al sync' : summary.failed + ' fallos al sync');
  }
  return parts.join(' · ') || 'Nada que eliminar';
}
