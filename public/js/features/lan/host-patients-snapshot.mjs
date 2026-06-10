/**
 * Fetch LAN host patient census + clinical-ops context.
 */

import { isLanSessionConfiguredForRest, lanFetchAuthed } from './transport.mjs';
import { activeLiveSyncRoomId } from './runtime.mjs';
import {
  mergeBundleEntriesIntoCensus,
  upsertHostCensusPatient,
} from './host-patients-snapshot-merge.mjs';

export { mergeBundleEntriesIntoCensus, upsertHostCensusPatient } from './host-patients-snapshot-merge.mjs';

/** @param {string} [preferredRoomId] */
async function listLanHostRoomIds(preferredRoomId) {
  const ids = new Set();
  const preferred = String(preferredRoomId || '').trim();
  if (preferred) ids.add(preferred);
  try {
    const resp = await lanFetchAuthed('/api/lan/v1/rooms');
    if (resp.ok) {
      const body = await resp.json().catch(function () {
        return {};
      });
      for (const room of body.rooms || []) {
        const id = String(room?.id || '').trim();
        if (id) ids.add(id);
      }
    }
  } catch (_roomsErr) {}
  return Array.from(ids);
}

/** @param {string} roomId */
async function fetchRoomBundleEntries(roomId) {
  const rid = String(roomId || '').trim();
  if (!rid) return [];
  try {
    const bundleResp = await lanFetchAuthed(
      '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/sync-bundle',
      { cache: 'no-store' }
    );
    if (!bundleResp.ok) return [];
    const bundleBody = await bundleResp.json().catch(function () {
      return {};
    });
    const entries = bundleBody?.bundle?.entries;
    return Array.isArray(entries) ? entries : [];
  } catch (_bundleErr) {
    return [];
  }
}

/** @param {string} roomId */
async function fetchRoomClinicalOps(roomId) {
  const rid = String(roomId || '').trim();
  if (!rid) return null;
  try {
    const opsResp = await lanFetchAuthed(
      '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/clinical-ops',
      { cache: 'no-store' }
    );
    if (!opsResp.ok) return null;
    const opsBody = await opsResp.json().catch(function () {
      return {};
    });
    if (opsBody?.snapshot && typeof opsBody.snapshot === 'object') {
      return opsBody.snapshot;
    }
  } catch (_opsErr) {}
  return null;
}

/** @param {string} [roomId] */
export async function fetchLanHostCensusSnapshot(roomId) {
  if (!isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  const byId = new Map();
  try {
    const resp = await lanFetchAuthed('/api/lan/v1/patients');
    if (!resp.ok) return { ok: false, error: 'patients_fetch_failed', status: resp.status };
    const body = await resp.json().catch(function () {
      return {};
    });
    const hostRows = Array.isArray(body.patients) ? body.patients : [];
    for (const row of hostRows) {
      if (!row?.id || row._deleted) continue;
      upsertHostCensusPatient(byId, row, { bundleOnly: false });
    }
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'patients_fetch_failed' };
  }

  const preferredRoomId = String(roomId || activeLiveSyncRoomId || '').trim();
  const roomIds = await listLanHostRoomIds(preferredRoomId);
  let clinicalOps = preferredRoomId ? await fetchRoomClinicalOps(preferredRoomId) : null;

  for (const rid of roomIds) {
    const entries = await fetchRoomBundleEntries(rid);
    mergeBundleEntriesIntoCensus(byId, entries);
    if (!clinicalOps) {
      clinicalOps = await fetchRoomClinicalOps(rid);
    }
  }

  return { ok: true, patients: Array.from(byId.values()), clinicalOps };
}
