/**
 * Direct (non-outbox) cloud pushes — desktop boot / manual "push now" entry points.
 */
import { isCloudSyncActive } from './nube-sync-policy.mjs';
import {
  getCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
  getCloudSyncUrl,
  getCloudSyncToken,
} from './settings.mjs';
import { getPatients } from '../../app-state.mjs';
import { recordCloudSyncError } from './cloud-sync-diagnostics.mjs';
import { countPatientEntryOps, mapPatientEntryToCloudBundleOps } from './mutate-bridge-ops.mjs';
import { buildDirtyLabSidecarOpsForPatient } from './cloud-lab-sidecar-index.mjs';
import {
  isCloudMutateBridgeConfigured,
  resolveCloudActorId,
  ensureLiveCensusClocks,
} from './mutate-bridge.mjs';

/** Direct census seed — bypasses LAN bundle timing; used on desktop boot / ⇄ connect. */
export async function pushCloudCensusNow() {
  if (!isCloudSyncActive() || !isCloudMutateBridgeConfigured()) {
    return { ok: false, reason: 'bridge_inactive' };
  }
  if (!getCloudSyncRoomId()) return { ok: false, reason: 'no_room' };
  if (!getPatients().length) return { ok: false, reason: 'no_local_patients' };

  const meta = {
    actorId: resolveCloudActorId(),
    updatedAt: new Date().toISOString(),
  };
  ensureLiveCensusClocks(meta.updatedAt);

  const { collectPatientEntriesForCloudPush } = await import('./cloud-census-collect.mjs');
  const entries = await collectPatientEntriesForCloudPush();
  /** @type {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} */
  const ops = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    ops.push(...mapPatientEntryToCloudBundleOps(entry, meta));
  }

  const entryOps = countPatientEntryOps(ops);
  if (!entryOps) {
    return {
      ok: false,
      reason: 'no_entry_ops',
      localPatients: getPatients().length,
      collectedEntries: entries.length,
    };
  }

  try {
    const { createCloudSyncApi } = await import('./api-client.mjs');
    const { pushCloudOpsDirect } = await import('./cloud-push-direct.mjs');
    const api = createCloudSyncApi({
      getBaseUrl: getCloudSyncUrl,
      getToken: getCloudSyncToken,
    });
    const pushed = await pushCloudOpsDirect(
      api,
      getCloudSyncRoomId(),
      ops,
      getCloudSyncRevision,
      setCloudSyncRevision
    );
    return { ok: true, entryOps, totalOps: ops.length, pushed };
  } catch (err) {
    const message = err?.message || String(err);
    void import('../cloud-mobile/lab-sync-diagnostics.mjs')
      .then(function (labDiag) {
        labDiag.recordLabPushAttempt({ setCount: ops.length, ok: false, reason: message, totalOps: ops.length });
      })
      .catch(function () {
        /* optional */
      });
    recordCloudSyncError({
      op: 'census',
      code: 'push_failed',
      message,
    });
    return { ok: false, reason: 'push_failed', message };
  }
}

/** Push all lab sidecars now (backfill for R+ Móvil). */
export async function pushCloudLabSidecarsNow() {
  if (!isCloudSyncActive() || !isCloudMutateBridgeConfigured()) {
    return { ok: false, reason: 'bridge_inactive' };
  }
  if (!getCloudSyncRoomId()) return { ok: false, reason: 'no_room' };

  const meta = {
    actorId: resolveCloudActorId(),
    updatedAt: new Date().toISOString(),
  };
  const { collectPatientEntriesForCloudPush } = await import('./cloud-census-collect.mjs');
  const entries = await collectPatientEntriesForCloudPush();
  /** @type {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} */
  const ops = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const patientId = String(entry?.patient?.id || '').trim();
    if (!patientId) continue;
    ops.push(
      ...buildDirtyLabSidecarOpsForPatient(
        patientId,
        Array.isArray(entry.labHistory) ? entry.labHistory : [],
        meta
      )
    );
  }
  if (!ops.length) return { ok: false, reason: 'no_lab_ops' };

  try {
    const { createCloudSyncApi } = await import('./api-client.mjs');
    const { pushCloudOpsDirect } = await import('./cloud-push-direct.mjs');
    const api = createCloudSyncApi({
      getBaseUrl: getCloudSyncUrl,
      getToken: getCloudSyncToken,
    });
    const pushed = await pushCloudOpsDirect(
      api,
      getCloudSyncRoomId(),
      ops,
      getCloudSyncRevision,
      setCloudSyncRevision
    );
    void import('../cloud-mobile/lab-sync-diagnostics.mjs').then(function (labDiag) {
      labDiag.recordLabPushAttempt({
        setCount: ops.length,
        ok: true,
        totalOps: ops.length,
      });
    });
    return { ok: true, labOps: ops.length, totalOps: ops.length, pushed };
  } catch (err) {
    const message = err?.message || String(err);
    void import('../cloud-mobile/lab-sync-diagnostics.mjs').then(function (labDiag) {
      labDiag.recordLabPushAttempt({
        setCount: ops.length,
        ok: false,
        reason: message,
        totalOps: ops.length,
      });
    });
    recordCloudSyncError({
      op: 'labSidecars',
      code: 'push_failed',
      message,
    });
    return { ok: false, reason: 'push_failed', message };
  }
}
