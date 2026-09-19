/**
 * Peer confirm before applying a remote (admin/other) patient wipe from Nube.
 * Own deletes echo back silently; declined wipes are remembered per deletedAt.
 */
import { getPatients, persistClinicalState } from '../../app-state.mjs';
import { removePatientLocally } from '../sync-apply/patient-delete.mjs';
import { showConfirmDialog } from '../../ui-approval-card.mjs';

const DECLINED_LS = 'rpc.declinedRemotePatientDeletes';

/** @returns {Record<string, string>} */
export function readDeclinedRemoteDeletes(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(DECLINED_LS);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} map @param {Storage|undefined} storage */
export function writeDeclinedRemoteDeletes(map, storage = globalThis.localStorage) {
  try {
    storage?.setItem(DECLINED_LS, JSON.stringify(map || {}));
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   patientId: string,
 *   localActorId?: string,
 *   tombstoneActorId?: string,
 *   deletedAt?: string,
 *   patientExistsLocally?: boolean,
 *   declinedMap?: Record<string, string>,
 * }} opts
 */
export function shouldConfirmRemotePatientDelete(opts) {
  const pid = String(opts?.patientId || '').trim();
  if (!pid) return false;
  if (!opts.patientExistsLocally) return false;
  const localActor = String(opts.localActorId || '').trim();
  const remoteActor = String(opts.tombstoneActorId || '').trim();
  if (localActor && remoteActor && localActor === remoteActor) return false;
  const deletedAt = String(opts.deletedAt || '').trim();
  const declined = opts.declinedMap || {};
  if (deletedAt && String(declined[pid] || '') === deletedAt) return false;
  return true;
}

/**
 * @param {string} patientId
 * @param {unknown} tombstoneMeta
 * @param {Record<string, { actorId?: string }>|null|undefined} entityVersions
 */
export function resolveTombstoneActorId(patientId, tombstoneMeta, entityVersions) {
  const meta =
    tombstoneMeta && typeof tombstoneMeta === 'object'
      ? /** @type {{ actorId?: string }} */ (tombstoneMeta)
      : {};
  const fromMeta = String(meta.actorId || '').trim();
  if (fromMeta) return fromMeta;
  const ver = entityVersions && entityVersions[`tombstones/${patientId}`];
  return String(ver?.actorId || '').trim();
}

/**
 * @param {string} patientId
 * @param {unknown} tombstoneMeta
 */
export function resolveTombstoneDeletedAt(patientId, tombstoneMeta) {
  const meta =
    tombstoneMeta && typeof tombstoneMeta === 'object'
      ? /** @type {{ deletedAt?: string, updatedAt?: string }} */ (tombstoneMeta)
      : {};
  return String(meta.deletedAt || meta.updatedAt || '').trim();
}

function patientExistsLocally(patientId) {
  const pid = String(patientId || '').trim();
  return getPatients().some((p) => p && String(p.id) === pid);
}

function patientLabel(patientId) {
  const p = getPatients().find((row) => row && String(row.id) === String(patientId));
  if (!p) return String(patientId);
  const name = String(p.nombre || 'Paciente').trim() || 'Paciente';
  const reg = String(p.registro || '').trim();
  return reg ? `${name} · ${reg}` : name;
}

/**
 * @param {Array<{ patientId: string, deletedAt: string }>} pending
 */
export function buildRemoteDeleteConfirmOpts(pending) {
  const n = pending.length;
  const items = pending.slice(0, 8).map((row) => patientLabel(row.patientId));
  if (n > 8) items.push('… y ' + (n - 8) + ' más');
  if (n === 1) {
    return {
      title: 'Quitar de esta Mac',
      question:
        'Un admin (u otro equipo) lo eliminó en Nube. Si confirmas, desaparece de este censo.',
      items,
      confirmLabel: 'Eliminar aquí',
      cancelLabel: 'Conservar aquí',
    };
  }
  return {
    title: 'Quitar ' + n + ' pacientes de esta Mac',
    question:
      'Un admin (u otro equipo) los eliminó en Nube. Si confirmas, desaparecen de este censo.',
    items,
    confirmLabel: 'Eliminar aquí',
    cancelLabel: 'Conservar aquí',
  };
}

/** @type {Promise<void>|null} */
let confirmQueue = null;

/**
 * @param {Array<{ patientId: string, deletedAt: string }>} pending
 */
export async function promptAndApplyRemotePatientDeletes(pending) {
  const rows = Array.isArray(pending) ? pending.filter((r) => r && r.patientId) : [];
  if (!rows.length) return { removed: false, declined: 0 };

  const ok = await showConfirmDialog({
    id: 'remote-patient-delete-confirm',
    ...buildRemoteDeleteConfirmOpts(rows),
  });
  if (ok) {
    let removed = false;
    for (const row of rows) {
      if (removePatientLocally(row.patientId)) removed = true;
    }
    if (removed) {
      persistClinicalState({ immediate: true });
      try {
        const { renderPatientList } = await import('../patients.mjs');
        renderPatientList({ silent: true });
      } catch {
        /* optional */
      }
    }
    return { removed, declined: 0 };
  }

  const declined = readDeclinedRemoteDeletes();
  for (const row of rows) {
    const at = String(row.deletedAt || '').trim() || 'declined';
    declined[String(row.patientId)] = at;
  }
  writeDeclinedRemoteDeletes(declined);
  return { removed: false, declined: rows.length };
}

/**
 * Serialize confirm prompts so concurrent pulls do not stack dialogs.
 * @param {Array<{ patientId: string, deletedAt: string }>} pending
 */
export function scheduleRemotePatientDeleteConfirm(pending) {
  const rows = Array.isArray(pending) ? pending.slice() : [];
  if (!rows.length) return;
  confirmQueue = (confirmQueue || Promise.resolve())
    .then(() => promptAndApplyRemotePatientDeletes(rows))
    .catch(() => {})
    .then(() => {
      confirmQueue = null;
    });
}

/**
 * Partition tombstones into silent removes vs confirm-needed.
 * @param {Record<string, unknown>} tombstones
 * @param {{
 *   localActorId?: string,
 *   entityVersions?: Record<string, { actorId?: string }>,
 *   shouldApply?: (patientId: string, meta: unknown) => boolean,
 * }} [opts]
 */
export function partitionCloudTombstonesForConfirm(tombstones, opts = {}) {
  /** @type {string[]} */
  const silentIds = [];
  /** @type {Array<{ patientId: string, deletedAt: string }>} */
  const pendingConfirm = [];
  const declinedMap = readDeclinedRemoteDeletes();
  const localActorId = String(opts.localActorId || '').trim();
  const entityVersions = opts.entityVersions || {};
  const shouldApply =
    typeof opts.shouldApply === 'function' ? opts.shouldApply : () => true;

  for (const patientId of Object.keys(tombstones || {})) {
    const meta = tombstones[patientId];
    if (!shouldApply(patientId, meta)) continue;
    const exists = patientExistsLocally(patientId);
    if (!exists) continue;
    const tombstoneActorId = resolveTombstoneActorId(patientId, meta, entityVersions);
    const deletedAt = resolveTombstoneDeletedAt(patientId, meta);
    if (
      shouldConfirmRemotePatientDelete({
        patientId,
        localActorId,
        tombstoneActorId,
        deletedAt,
        patientExistsLocally: true,
        declinedMap,
      })
    ) {
      pendingConfirm.push({ patientId, deletedAt });
    } else {
      silentIds.push(patientId);
    }
  }
  return { silentIds, pendingConfirm };
}
