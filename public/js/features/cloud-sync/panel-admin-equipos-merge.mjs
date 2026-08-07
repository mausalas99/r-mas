import { normalizeUsername } from '../../clinical-username.mjs';

/** @param {object | undefined} clinical */
function equiposActivityFields(clinical) {
  return {
    last_activity_at: clinical?.last_activity_at ? String(clinical.last_activity_at) : '',
    created_at: clinical?.created_at ? String(clinical.created_at) : '',
    activity_history: Array.isArray(clinical?.activity_history) ? clinical.activity_history : [],
  };
}

/** @param {object | undefined} clinical @param {string} displayNameFallback */
function equiposClinicalFields(clinical, displayNameFallback) {
  return {
    clinical_name: String(clinical?.clinical_name || displayNameFallback || '').trim(),
    rank: String(clinical?.rank || 'R1'),
    sala: String(clinical?.sala || '').trim(),
    ...equiposActivityFields(clinical),
  };
}

/** @param {Array<{ username?: string, user_id?: string }>} clinicalUsers */
export function clinicalByUsername(clinicalUsers) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const u of clinicalUsers || []) {
    const h = normalizeUsername(u?.username || '');
    if (h) map.set(h, u);
  }
  return map;
}

/**
 * @param {{ id?: string, username?: string, display_name?: string }} cloud
 * @param {object | undefined} clinical
 */
export function buildEquiposRowFromCloud(cloud, clinical) {
  const handle = normalizeUsername(cloud.username || '');
  return {
    user_id: clinical?.user_id ? String(clinical.user_id) : '',
    username: handle,
    ...equiposClinicalFields(clinical, cloud.display_name),
    cloudId: String(cloud.id || ''),
    hasLocalProfile: Boolean(clinical?.user_id),
    clinicalOnly: false,
  };
}

/** @param {object} clinical */
export function buildEquiposRowFromClinicalOnly(clinical) {
  const handle = normalizeUsername(clinical?.username || '');
  return {
    user_id: String(clinical?.user_id || '').trim(),
    username: handle,
    ...equiposClinicalFields(clinical, ''),
    cloudId: '',
    hasLocalProfile: true,
    clinicalOnly: true,
  };
}

/** @param {object[]} cloudUsers @param {Map<string, object>} byHandle @param {Set<string>} seen */
function collectCloudEquiposRows(cloudUsers, byHandle, seen) {
  /** @type {object[]} */
  const rows = [];
  for (const cloud of cloudUsers || []) {
    if (!cloud || cloud.disabled) continue;
    const handle = normalizeUsername(cloud.username || '');
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    rows.push(buildEquiposRowFromCloud(cloud, byHandle.get(handle)));
  }
  return rows;
}

/** @param {object[]} clinicalUsers @param {Set<string>} seen */
function collectClinicalOnlyEquiposRows(clinicalUsers, seen) {
  /** @type {object[]} */
  const rows = [];
  for (const clinical of clinicalUsers || []) {
    const handle = normalizeUsername(clinical?.username || '');
    if (!handle || seen.has(handle)) continue;
    if (!String(clinical?.user_id || '').trim()) continue;
    seen.add(handle);
    rows.push(buildEquiposRowFromClinicalOnly(clinical));
  }
  return rows;
}

/**
 * Cloud accounts + clinical-only roster users (test / LAN peers without Nube login).
 * @param {Array<{ id?: string, username?: string, display_name?: string, disabled?: boolean }>} cloudUsers
 * @param {object[]} clinicalUsers
 */
export function mergeCloudUsersForEquipos(cloudUsers, clinicalUsers) {
  const byHandle = clinicalByUsername(clinicalUsers);
  const seen = new Set();
  const rows = [
    ...collectCloudEquiposRows(cloudUsers, byHandle, seen),
    ...collectClinicalOnlyEquiposRows(clinicalUsers, seen),
  ];
  return rows.sort((a, b) => a.username.localeCompare(b.username, 'es'));
}
