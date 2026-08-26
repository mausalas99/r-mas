/**
 * Peer confirm before applying a remote (admin/other) patient wipe from Nube.
 * Own deletes echo back silently; declined wipes are remembered per deletedAt.
 */
import { getSyncablePatients, persistClinicalState } from '../../app-state.mjs';
import { removePatientLocally } from '../sync-apply/patient-delete.mjs';
import { showConfirmDialog } from '../../ui-approval-card.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { esc } from '../../dom-escape.mjs';

const DECLINED_LS = 'rpc.declinedRemotePatientDeletes';
const DECLINED_ACTORS_LS = 'rpc.declinedRemotePatientDeleteActors';

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

/** @returns {Record<string, string>} */
export function readDeclinedRemoteDeleteActors(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(DECLINED_ACTORS_LS);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} map @param {Storage|undefined} storage */
export function writeDeclinedRemoteDeleteActors(map, storage = globalThis.localStorage) {
  try {
    storage?.setItem(DECLINED_ACTORS_LS, JSON.stringify(map || {}));
  } catch {
    /* ignore */
  }
}

/**
 * Best-effort actorId -> human label, using the in-session team roster.
 * Falls back to a truncated id when the actor isn't a known team member.
 * @param {string} actorId
 */
export function resolveActorDisplayName(actorId) {
  const id = String(actorId || '').trim();
  if (!id || id === 'local') return 'otro equipo';
  const teams = clinicalSessionContext.teams || [];
  for (const team of teams) {
    const members = team?.members || [];
    for (const m of members) {
      if (m && String(m.user_id) === id) {
        const label = String(m.clinical_name || m.username || '').trim();
        if (label) return label;
      }
    }
  }
  return 'un dispositivo (' + id.slice(0, 8) + '…)';
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
  return getSyncablePatients().some((p) => p && String(p.id) === pid);
}

function patientLabel(patientId) {
  const p = getSyncablePatients().find((row) => row && String(row.id) === String(patientId));
  if (!p) return String(patientId);
  const name = String(p.nombre || 'Paciente').trim() || 'Paciente';
  const reg = String(p.registro || '').trim();
  return reg ? `${name} · ${reg}` : name;
}

/**
 * @param {Array<{ patientId: string, deletedAt: string, actorId?: string }>} pending
 */
function resolveConfirmActorLabel(pending) {
  const names = new Set(pending.map((row) => resolveActorDisplayName(row.actorId)));
  if (names.size === 1) return { label: [...names][0], plural: false };
  return { label: 'varios usuarios', plural: true };
}

/**
 * @param {Array<{ patientId: string, deletedAt: string, actorId?: string }>} pending
 */
export function buildRemoteDeleteConfirmOpts(pending) {
  const n = pending.length;
  const items = pending.slice(0, 8).map((row) => patientLabel(row.patientId));
  if (n > 8) items.push('… y ' + (n - 8) + ' más');
  const { label: actor, plural } = resolveConfirmActorLabel(pending);
  if (n === 1) {
    return {
      title: 'Quitar de esta Mac',
      question:
        actor + (plural ? ' lo eliminaron' : ' lo eliminó') + ' en Nube. Si confirmas, desaparece de este censo.',
      items,
      confirmLabel: 'Eliminar aquí',
      cancelLabel: 'Conservar aquí',
    };
  }
  return {
    title: 'Quitar ' + n + ' pacientes de esta Mac',
    question:
      actor + (plural ? ' los eliminaron' : ' los eliminó') + ' en Nube. Si confirmas, desaparecen de este censo.',
    items,
    confirmLabel: 'Eliminar aquí',
    cancelLabel: 'Conservar aquí',
  };
}

/** @type {Promise<void>|null} */
let confirmQueue = null;

/**
 * @param {Array<{ patientId: string, deletedAt: string, actorId?: string }>} pending
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
    const declined = readDeclinedRemoteDeletes();
    const declinedActors = readDeclinedRemoteDeleteActors();
    for (const row of rows) {
      if (removePatientLocally(row.patientId)) removed = true;
      delete declined[String(row.patientId)];
      delete declinedActors[String(row.patientId)];
    }
    writeDeclinedRemoteDeletes(declined);
    writeDeclinedRemoteDeleteActors(declinedActors);
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
  const declinedActors = readDeclinedRemoteDeleteActors();
  for (const row of rows) {
    const at = String(row.deletedAt || '').trim() || 'declined';
    declined[String(row.patientId)] = at;
    if (row.actorId) declinedActors[String(row.patientId)] = String(row.actorId);
  }
  writeDeclinedRemoteDeletes(declined);
  writeDeclinedRemoteDeleteActors(declinedActors);
  return { removed: false, declined: rows.length };
}

/**
 * Patients this Mac kept after declining a remote delete, for admin review.
 * @returns {Array<{ patientId: string, label: string, deletedAt: string, actorName: string }>}
 */
export function listPendingRemoteDeletes() {
  const declined = readDeclinedRemoteDeletes();
  const declinedActors = readDeclinedRemoteDeleteActors();
  return Object.keys(declined)
    .filter((patientId) => patientExistsLocally(patientId))
    .map((patientId) => ({
      patientId,
      label: patientLabel(patientId),
      deletedAt: String(declined[patientId] || ''),
      actorName: resolveActorDisplayName(declinedActors[patientId]),
    }));
}

/**
 * @param {Array<{ patientId: string, label: string, deletedAt: string, actorName: string }>} rows
 */
export function pendingRemoteDeletesHtml(rows) {
  if (!rows.length) {
    return '<p class="cloud-sync-hint">No hay pacientes con eliminación remota pendiente.</p>';
  }
  const items = rows
    .map(
      (row) =>
        '<li class="cloud-sync-pending-delete-row">' +
        '<span class="cloud-sync-pending-delete-label">' +
        esc(row.label) +
        '</span>' +
        '<span class="cloud-sync-pending-delete-meta">' +
        esc(row.actorName) +
        (row.deletedAt ? ' · ' + esc(row.deletedAt) : '') +
        '</span>' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" ' +
        'data-cloud-action="review-remote-delete" data-patient-id="' +
        esc(row.patientId) +
        '" data-deleted-at="' +
        esc(row.deletedAt) +
        '">Revisar</button></li>'
    )
    .join('');
  return (
    '<p class="cloud-sync-hint">Se mantuvieron en esta Mac después de rechazar una eliminación remota.</p>' +
    '<ul class="cloud-sync-pending-delete-list">' +
    items +
    '</ul>'
  );
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
    // Own delete echoing back: apply silently, no confirm needed.
    if (localActorId && tombstoneActorId && localActorId === tombstoneActorId) {
      silentIds.push(patientId);
      continue;
    }
    // Already declined this exact delete: keep the patient, do not re-delete or re-ask.
    if (deletedAt && String(declinedMap[patientId] || '') === deletedAt) {
      continue;
    }
    pendingConfirm.push({ patientId, deletedAt, actorId: tombstoneActorId });
  }
  return { silentIds, pendingConfirm };
}
