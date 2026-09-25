/**
 * clinicalOps is a whole-doc room field. Join/profile pushes must not wipe
 * peer patient_team_assignment / membership that the sender has not pulled yet.
 */

function rowKey(row, fields) {
  if (!row || typeof row !== 'object') return '';
  const parts = [];
  for (let i = 0; i < fields.length; i += 1) {
    const part = String(row[fields[i]] || '').trim();
    if (!part) return '';
    parts.push(part);
  }
  return parts.join('\0');
}

function unionRows(localRows, incomingRows, keyFields) {
  const map = new Map();
  for (const row of localRows || []) {
    const key = rowKey(row, keyFields);
    if (key) map.set(key, { ...row });
  }
  for (const row of incomingRows || []) {
    const key = rowKey(row, keyFields);
    if (key && !map.has(key)) map.set(key, { ...row });
  }
  return [...map.values()];
}

/**
 * Membership rows: union, but an incoming row replaces the stored one when its
 * cycle letter is newer (cycle_set_at). Keep in sync with the desktop's
 * mergeTeamMembership (lib/db/clinical-ops-sync-merge-membership.mjs) and the
 * renderer pull fold (public/js/features/cloud-sync/pull-apply-state.mjs).
 */
function cycleIsNewer(stored, incoming) {
  if (!incoming?.sub_area_fraction) return false;
  if (!stored?.sub_area_fraction) return true;
  return String(incoming.cycle_set_at || '') > String(stored.cycle_set_at || '');
}

function mergeMembershipRows(localRows, incomingRows) {
  const map = new Map();
  for (const row of localRows || []) {
    const key = rowKey(row, ['team_id', 'user_id']);
    if (key) map.set(key, { ...row });
  }
  for (const row of incomingRows || []) {
    const key = rowKey(row, ['team_id', 'user_id']);
    if (key && (!map.has(key) || cycleIsNewer(map.get(key), row))) map.set(key, { ...row });
  }
  return [...map.values()];
}

function mergeById(localRows, incomingRows, idField) {
  const map = new Map();
  for (const row of localRows || []) {
    const id = String(row?.[idField] || '').trim();
    if (id) map.set(id, { ...row });
  }
  for (const row of incomingRows || []) {
    const id = String(row?.[idField] || '').trim();
    if (id) map.set(id, { ...row });
  }
  return [...map.values()];
}

/**
 * @param {unknown} prev
 * @param {unknown} incoming
 */
export function mergeClinicalOpsLww(prev, incoming) {
  if (!incoming || typeof incoming !== 'object') {
    return prev && typeof prev === 'object' ? prev : null;
  }
  if (!prev || typeof prev !== 'object') return incoming;
  const local = /** @type {Record<string, unknown>} */ (prev);
  const next = /** @type {Record<string, unknown>} */ (incoming);
  return {
    ...local,
    ...next,
    teams: mergeById(local.teams, next.teams, 'team_id'),
    clinical_users: mergeById(local.clinical_users, next.clinical_users, 'user_id'),
    patient_team_assignment: unionRows(
      local.patient_team_assignment,
      next.patient_team_assignment,
      ['patient_id', 'team_id']
    ),
    team_membership: mergeMembershipRows(local.team_membership, next.team_membership),
    team_membership_removals: unionRows(
      local.team_membership_removals,
      next.team_membership_removals,
      ['team_id', 'user_id']
    ),
    team_membership_rejoins: unionRows(
      local.team_membership_rejoins,
      next.team_membership_rejoins,
      ['team_id', 'user_id']
    ),
  };
}
