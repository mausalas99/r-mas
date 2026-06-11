/**
 * LAN host patient delete transport — explicit step list (bundle-only vs census row).
 * Policy (ownership, tombstone, live-sync) stays in orchestrator.mjs.
 */
import { lanFetchAuthed } from './transport.mjs';
import { createMutationBuilder, wrapLiveSyncPatch } from '../../versioned-mutation.mjs';
import { resolveLanPatientDeleteSteps } from './lan-patient-delete-policy.mjs';

export { resolveLanPatientDeleteSteps } from './lan-patient-delete-policy.mjs';

/**
 * @param {string} patientId
 * @param {object | null | undefined} hostRow
 * @param {string} registroFallback
 * @param {string} roomId
 */
export function buildPatientDeleteMutation(patientId, hostRow, registroFallback, roomId) {
  var pid = String(patientId || '').trim();
  var base =
    hostRow && typeof hostRow === 'object'
      ? Object.assign({}, hostRow, {
          id: pid,
          version: Number(hostRow.version || 1),
        })
      : {
          id: pid,
          registro: String(registroFallback || '').trim(),
          version: 0,
        };
  return createMutationBuilder('patient', pid).captureBase(base).build({
    roomId: roomId,
    op: 'delete',
  });
}

/**
 * @param {string} patientId
 * @param {string} [registro]
 */
export async function deleteHostPatientCensus(patientId, registro) {
  var pid = String(patientId || '').trim();
  if (!pid) return { ok: false, error: 'invalid_id' };
  var reg = String(registro || '').trim();
  var qs = reg ? '?registro=' + encodeURIComponent(reg) : '';
  var resp = await lanFetchAuthed('/api/lan/v1/patients/' + encodeURIComponent(pid) + qs, {
    method: 'DELETE',
  });
  if (resp.ok || resp.status === 404) return { ok: true, status: resp.status };
  return { ok: false, status: resp.status };
}

/**
 * @param {string} patientId
 * @param {object | null | undefined} hostRow
 * @param {string} registroFallback
 * @param {{
 *   roomId: string,
 *   getClientId: () => string,
 *   pushVersioned: (pid: string, mutation: object) => Promise<{ ok?: boolean, status?: number }>,
 *   enqueueOutbox: (rid: string, item: object) => Promise<void>,
 *   flushOutbox: (rid: string) => Promise<void>,
 * }} ctx
 */
export async function pushPatientDeleteToHost(patientId, hostRow, registroFallback, ctx) {
  var pid = String(patientId || '').trim();
  var reg = String(registroFallback || (hostRow && hostRow.registro) || '').trim();
  var rid = String(ctx.roomId || '').trim();
  if (!rid) return { ok: false, error: 'not_configured' };

  var steps = resolveLanPatientDeleteSteps(!!hostRow);
  /** @type {{ ok: false, error: string, status?: number }} */
  var lastFail = { ok: false, error: 'purge_failed' };
  var mutation = null;

  for (var i = 0; i < steps.length; i += 1) {
    var step = steps[i];
    if (step === 'census_delete') {
      var census = await deleteHostPatientCensus(pid, reg);
      if (census.ok) {
        return { ok: true, via: hostRow ? 'delete_census' : 'delete_bundle' };
      }
      lastFail = {
        ok: false,
        error: census.status ? 'host_reject_' + census.status : 'purge_failed',
        status: census.status,
      };
      continue;
    }
    if (step === 'versioned_delete') {
      mutation = buildPatientDeleteMutation(pid, hostRow, reg, rid);
      var httpResult = await ctx.pushVersioned(pid, mutation);
      if (httpResult?.ok) return httpResult;
      lastFail = {
        ok: false,
        error: httpResult?.status ? 'host_reject_' + httpResult.status : 'purge_failed',
        status: httpResult?.status,
      };
      continue;
    }
    if (step === 'outbox_delete') {
      if (!mutation) mutation = buildPatientDeleteMutation(pid, hostRow, reg, rid);
      await ctx.enqueueOutbox(rid, {
        kind: 'patch',
        payload: wrapLiveSyncPatch(rid, ctx.getClientId(), mutation),
      });
      await ctx.flushOutbox(rid);
      return lastFail;
    }
  }

  return lastFail;
}
