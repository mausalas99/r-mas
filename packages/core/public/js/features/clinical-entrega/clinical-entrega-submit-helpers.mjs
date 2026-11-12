// Entrega form payload assembly helpers
import {
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from '../../clinical-access-runtime.mjs';
import {
  buildEntregaPatientCensus,
  serializePendientesJson,
} from '../../../../lib/entrega/entrega-pendientes.mjs';
import { vitalsFrequencyForDb } from '../../../../lib/entrega/entrega-vitals-plan.mjs';
import { resolveEntregaPatientRow } from './clinical-entrega-util.mjs';
import { resolveEntregaSourceTeamId } from './clinical-entrega-team.mjs';

/**
 * @param {string} patientId
 * @param {string|undefined} guardiaId
 * @param {object|null|undefined} existing
 * @param {{ coveringUserId: string, sourceTeamId: string, isCritical: boolean, handoffContext: object, vitalsPlan: object, items: object[] }} draft
 *   what the modal view holds right now (`draftRef.current()`)
 */
export function buildEntregaSubmitPayload(patientId, guardiaId, existing, draft) {
  // No phase covering — the entrega-phase lock was removed 2026-09-24.
  const coveringUserId = String(draft.coveringUserId || existing?.covering_user_id || '');
  const scopeCtx = getClinicalScopeContextForEvaluate();
  const sourceTeamId =
    String(draft.sourceTeamId || '') ||
    resolveEntregaSourceTeamId(
      patientId,
      resolveEntregaPatientRow(patientId),
      clinicalSessionContext.teams || scopeCtx.teams || [],
      scopeCtx.assignments || [],
      existing,
      String(clinicalSessionContext.user?.user_id || '')
    );
  const patientCensus = buildEntregaPatientCensus(resolveEntregaPatientRow(patientId));
  const pendientesJson = serializePendientesJson({
    version: 2,
    vitalsPlan: draft.vitalsPlan,
    handoffContext: draft.handoffContext,
    ...(patientCensus ? { patientCensus } : {}),
    items: draft.items.slice(),
  });

  return {
    patientId,
    guardiaId,
    coveringUserId,
    sourceTeamId,
    isCritical: !!draft.isCritical,
    pendientesJson,
    vitalsFrequency: vitalsFrequencyForDb(draft.vitalsPlan.frequency),
  };
}
