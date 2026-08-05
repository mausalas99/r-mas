/**
 * Host patient row HTTP (fetch, versioned PUT, restore from sync-bundle).
 */
import { activeLiveSyncRoomId, lanClient } from './runtime.mjs';
import { isLanSessionConfiguredForRest, lanFetchAuthed } from './transport.mjs';
import { fetchHostPatientsList } from './host-patients-snapshot.mjs';
import { listLanHostRoomIds, fetchRoomBundleEntries } from './host-patients-snapshot-rooms.mjs';
import {
  fetchClinicalScopeContextFromDb,
  refreshClinicalPatientListForScope,
} from '../../clinical-access-runtime.mjs';
import { notifyLwwOverwrite } from '../../lan-lww-toast.mjs';
import {
  rememberLiveSyncEntity,
  syncHostBundleEntityFromApplied,
} from './entity-versions.mjs';
import { applyLanPatientEntries } from './patient-entries.mjs';
import {
  findPatientEntryInBundleEntries,
  pickLanPatientRestoreEntry,
} from './host-patient-restore-pick.mjs';

export { findPatientEntryInBundleEntries, pickLanPatientRestoreEntry };

/** @type {{ runtime?: { showToast?: (msg: string, type?: string) => void } }} */
let hostPatientDeps = {};

export function configureLanHostPatientHttp(deps) {
  if (deps && typeof deps === 'object') Object.assign(hostPatientDeps, deps);
}

export async function lanFetchHostPatientRow(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid || !isLanSessionConfiguredForRest()) return null;
  var list = await fetchHostPatientsList();
  if (!list) return null;
  return (
    list.find(function (row) {
      return row && String(row.id) === pid && !row._deleted;
    }) || null
  );
}

export async function lanPushPatientVersioned(patientId, mutation) {
  var pid = String(patientId || '').trim();
  if (!pid || !mutation) return { ok: false, error: 'invalid_args' };
  var resp = await lanFetchAuthed('/api/lan/v1/patients/' + encodeURIComponent(pid), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mutation),
  });
  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }
  var out = {};
  try {
    out = await resp.json();
  } catch { /* ignored */ }
  if (out && out.version != null && out.data) {
    rememberLiveSyncEntity('patient', pid, null, out.version, out.data);
    syncHostBundleEntityFromApplied({
      roomId: activeLiveSyncRoomId,
      entityType: 'patient',
      entityId: pid,
      version: out.version,
      data: out.data,
    });
  }
  if (out && out.lwwApplied && hostPatientDeps.runtime?.showToast) {
    notifyLwwOverwrite(hostPatientDeps.runtime, {
      entityType: 'patient',
      entityId: pid,
      overwrittenKeys: out.overwrittenKeys || [],
    });
  }
  return { ok: true, body: out, version: out.version, data: out.data };
}

async function fetchHostBundlePatientEntry(pid, rid) {
  var resp = await lanClient.fetch(
    '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/sync-bundle',
    { cache: 'no-store' }
  );
  if (!resp || !resp.ok) {
    return { ok: false, error: 'bundle_fetch_failed', status: resp && resp.status };
  }
  var j = await resp.json();
  var bundle = j && j.bundle;
  var entries = bundle && Array.isArray(bundle.entries) ? bundle.entries : [];
  var entry = findPatientEntryInBundleEntries(entries, pid);
  if (!entry) return { ok: false, error: 'patient_not_on_host' };
  return { ok: true, entry: entry };
}

/**
 * Resolve a restore entry: active room → other rooms → host /patients census.
 * @param {string} pid
 * @param {string} preferredRoomId
 */
export async function resolveLanPatientRestoreEntry(pid, preferredRoomId) {
  var preferred = String(preferredRoomId || '').trim();
  var activeEntry = null;
  if (preferred) {
    var primary = await fetchHostBundlePatientEntry(pid, preferred);
    if (primary.ok) activeEntry = primary.entry;
  }
  var otherEntries = [];
  if (!activeEntry) {
    var roomIds = await listLanHostRoomIds(preferred);
    for (var i = 0; i < roomIds.length; i += 1) {
      var rid = roomIds[i];
      if (rid === preferred) continue;
      otherEntries.push(findPatientEntryInBundleEntries(await fetchRoomBundleEntries(rid), pid));
    }
  }
  var hostRow = activeEntry ? null : await lanFetchHostPatientRow(pid);
  return pickLanPatientRestoreEntry({
    activeEntry: activeEntry,
    otherEntries: otherEntries,
    hostRow: hostRow,
  });
}

/** Pull one patient from host (bundle or census) into the local census. */
export async function restoreLanPatientFromHost(patientId) {
  var pid = String(patientId || '').trim();
  var rid = String(activeLiveSyncRoomId || '').trim();
  if (!pid || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  try {
    var fetched = await resolveLanPatientRestoreEntry(pid, rid);
    if (!fetched.ok) return fetched;
    await fetchClinicalScopeContextFromDb();
    var result = applyLanPatientEntries([fetched.entry], { skipTeamScopeFilter: true });
    if (result.added || result.updated) {
      await refreshClinicalPatientListForScope({ allowLanPull: false });
    }
    return {
      ok: true,
      added: result.added,
      updated: result.updated,
      via: fetched.via,
    };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'restore_failed' };
  }
}
