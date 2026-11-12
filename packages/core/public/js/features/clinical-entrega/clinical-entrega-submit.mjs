// Persist entrega assignment + form payload
import {
  clinicalSessionContext,
  refreshGuardiaCensusFromDb,
  signOutgoingLiveSyncMutation,
} from '../../clinical-access-runtime.mjs';
import { scheduleCloudSyncPush } from '../cloud-sync/mutate-bridge.mjs';
import { pushCloudClinicalOpsNow } from '../cloud-sync/mutate-bridge-clinical-ops.mjs';
import { dbApi, toast } from './clinical-entrega-util.mjs';
import { buildEntregaSubmitPayload } from './clinical-entrega-submit-helpers.mjs';

async function syncEntregaLanAfterSave_(_patientId) {
  try {
    await pushCloudClinicalOpsNow();
    scheduleCloudSyncPush();
  } catch {
    /* optional */
  }
}

export async function submitEntregaAssignment(payload) {
  const api = dbApi();
  if (!api || typeof api.dbGuardiaUpsert !== 'function') {
    throw new Error('Base clínica no disponible');
  }

  const patientId = String(payload.patientId || '');
  const deltaData = {
    coveringUserId: payload.coveringUserId,
    sourceTeamId: payload.sourceTeamId,
    isCritical: !!payload.isCritical,
    pendientesJson: payload.pendientesJson || '[]',
    vitalsFrequency: payload.vitalsFrequency || 'None',
  };

  await signOutgoingLiveSyncMutation(
    { patientId, entityId: patientId, data: deltaData, op: 'entrega.assign' },
    'entrega.assign'
  );

  const res = await api.dbGuardiaUpsert({
    patientId,
    coveringUserId: payload.coveringUserId,
    sourceTeamId: payload.sourceTeamId,
    guardiaId: payload.guardiaId,
    isCritical: payload.isCritical ? 1 : 0,
    pendientesJson: payload.pendientesJson || '[]',
    vitalsFrequency: payload.vitalsFrequency || 'None',
  });

  if (!res || res.ok === false) {
    throw new Error(res?.error || 'No se guardó la entrega');
  }

  await syncEntregaLanAfterSave_(patientId);

  return res.guardia;
}

/**
 * @param {{ patientId: string, guardiaId?: string }|null|undefined} session the open modal's patient
 * @param {object|null|undefined} draft the view's current fields (see buildEntregaSubmitPayload)
 * @returns {{ ok: true, payload: object } | { ok: false, error: string }}
 */
export function collectEntregaFormPayload(session, draft) {
  if (!session || !draft) return { ok: false, error: 'Formulario de entrega no disponible' };
  const patientId = String(session.patientId || '');
  if (!patientId) return { ok: false, error: 'Paciente no seleccionado' };

  const guardiaId = session.guardiaId ? String(session.guardiaId) : undefined;
  const existingGuardia = guardiaId
    ? clinicalSessionContext.guardias.find((g) => String(g.guardia_id) === guardiaId)
    : clinicalSessionContext.guardiasMap.get(patientId);
  const payload = buildEntregaSubmitPayload(patientId, guardiaId, existingGuardia, draft);

  if (!payload.coveringUserId || !payload.sourceTeamId) {
    return { ok: false, error: 'Selecciona R1 de guardia y equipo del paciente.' };
  }

  return { ok: true, payload };
}

/**
 * Saves the draft; on success `session.guardiaId` becomes the saved row's id.
 * @param {{ patientId: string, guardiaId?: string }|null|undefined} session
 * @param {object|null|undefined} draft
 * @param {{ silent?: boolean }} [opts]
 */
export async function persistEntregaFormState(session, draft, opts = {}) {
  const collected = collectEntregaFormPayload(session, draft);
  if (!collected.ok) return collected;

  try {
    const guardia = await submitEntregaAssignment(collected.payload);
    if (guardia?.guardia_id && session) session.guardiaId = String(guardia.guardia_id);
    await refreshGuardiaCensusFromDb(null);
    if (!opts.silent) toast('Entrega registrada.', 'success');
    return { ok: true, guardia };
  } catch (err) {
    const error = err?.message || 'Error al registrar entrega';
    if (!opts.silent) toast(error, 'error');
    return { ok: false, error };
  }
}
