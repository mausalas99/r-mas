/** Pure helpers for LAN patient restore entry resolution. */

/**
 * @param {Array<object|null|undefined>|null|undefined} entries
 * @param {string} pid
 */
export function findPatientEntryInBundleEntries(entries, pid) {
  const id = String(pid || '').trim();
  if (!id) return null;
  return (
    (entries || []).find(function (e) {
      return e && e.patient && String(e.patient.id) === id;
    }) || null
  );
}

/**
 * Pure pick order for restore: active room → other rooms → host census row.
 * @param {{ activeEntry?: object|null, otherEntries?: Array<object|null|undefined>, hostRow?: object|null }} parts
 */
export function pickLanPatientRestoreEntry(parts) {
  const active = parts && parts.activeEntry;
  if (active) return { ok: true, entry: active, via: 'active_room' };
  const others = (parts && parts.otherEntries) || [];
  for (let i = 0; i < others.length; i += 1) {
    if (others[i]) return { ok: true, entry: others[i], via: 'other_room' };
  }
  const hostRow = parts && parts.hostRow;
  if (hostRow) return { ok: true, entry: { patient: hostRow }, via: 'host_census' };
  return { ok: false, error: 'patient_not_on_host' };
}
