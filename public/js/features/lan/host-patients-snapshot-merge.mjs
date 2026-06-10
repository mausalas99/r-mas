import { extractPatientFromBundleEntry } from './host-patients-bundle-entry.mjs';

/**
 * @param {Map<string, object>} byId
 * @param {object} row
 * @param {{ bundleOnly?: boolean }} [meta]
 */
export function upsertHostCensusPatient(byId, row, meta) {
  if (!row?.id) return;
  const id = String(row.id);
  if (id.indexOf('demo-') === 0) return;
  const existing = byId.get(id);
  if (!existing) {
    byId.set(id, meta?.bundleOnly ? Object.assign({ _bundleOnly: true }, row) : { ...row });
    return;
  }
  const merged = Object.assign({}, existing, row);
  if (!meta?.bundleOnly) {
    delete merged._bundleOnly;
  }
  byId.set(id, merged);
}

/**
 * @param {Map<string, object>} byId
 * @param {object[]} entries
 */
export function mergeBundleEntriesIntoCensus(byId, entries) {
  for (const entry of entries || []) {
    const p = extractPatientFromBundleEntry(entry);
    if (!p) continue;
    upsertHostCensusPatient(byId, p, { bundleOnly: true });
  }
}
