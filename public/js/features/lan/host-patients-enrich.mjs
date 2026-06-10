/**
 * Enrich LAN host census rows with team, registrar, and timestamps.
 * Pure module — no transport/orchestrator imports.
 */

import { resolvePatientTeamIdFromAssignments } from '../../clinico-access.mjs';

/** @param {object|null|undefined} clinicalOps */
export function buildClinicalOpsLookups(clinicalOps) {
  const usersById = new Map();
  for (const row of clinicalOps?.clinical_users || []) {
    const id = String(row?.user_id || '').trim();
    if (id) usersById.set(id, row);
  }
  const teamsById = new Map();
  for (const row of clinicalOps?.teams || []) {
    const id = String(row?.team_id || '').trim();
    if (id) teamsById.set(id, row);
  }
  const guardiaByTeamId = new Map();
  for (const row of clinicalOps?.team_guardia_today || []) {
    const tid = String(row?.team_id || '').trim();
    if (tid) guardiaByTeamId.set(tid, row);
  }
  const guardiaByPatientId = new Map();
  for (const row of clinicalOps?.active_guardias || []) {
    const pid = String(row?.patient_id || '').trim();
    if (pid) guardiaByPatientId.set(pid, row);
  }
  return {
    usersById,
    teamsById,
    assignments: clinicalOps?.patient_team_assignment || [],
    guardiaByTeamId,
    guardiaByPatientId,
  };
}

/** @param {object|null|undefined} user */
export function formatClinicalUserLabel(user) {
  if (!user) return '';
  const handleRaw = String(user.username || '').trim().replace(/^@/, '');
  const handle = handleRaw ? '@' + handleRaw : '';
  const name = String(user.clinical_name || user.display_name || '').trim();
  const rank = String(user.rank || '').trim();
  const rankPrefix = rank ? rank + ' ' : '';
  if (name && handle) return rankPrefix + name + ' · ' + handle;
  if (name) return rankPrefix + name;
  return handle ? rankPrefix + handle : '';
}

/**
 * @param {string} iso
 * @returns {string}
 */
export function formatLanHostTimestamp(iso) {
  const raw = String(iso || '').trim();
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * @param {string} iso
 * @returns {number}
 */
export function timestampMillis(iso) {
  const ms = new Date(String(iso || '')).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** @param {object} row */
export function resolvePatientUpdatedAt(row) {
  return String(row?.updatedAt || row?.lanUpdatedAt || '').trim();
}

/** @param {object} row @param {object} lookups @param {{ localClientId?: string, localUser?: object|null }} [opts] */
export function resolvePatientRegistrarUserId(row, lookups, opts) {
  const explicit = String(row?.registeredByUserId || '').trim();
  if (explicit) return explicit;

  const pid = String(row?.id || '').trim();
  const audit = Array.isArray(row?.audit_log) ? row.audit_log : [];
  const createEntry =
    audit.find(function (e) {
      return e && e.action === 'patient.create';
    }) || audit[0];
  const createClientId = String(createEntry?.clientId || '').trim();
  const localClientId = String(opts?.localClientId || '').trim();
  const localUser = opts?.localUser || null;
  if (createClientId && localClientId && createClientId === localClientId && localUser?.user_id) {
    return String(localUser.user_id);
  }

  const active = lookups.guardiaByPatientId.get(pid);
  if (active?.covering_user_id) return String(active.covering_user_id);

  const teamId = resolvePatientTeamIdFromAssignments(pid, lookups.assignments);
  if (teamId) {
    const onCall = lookups.guardiaByTeamId.get(teamId);
    if (onCall?.user_id) return String(onCall.user_id);
    const team = lookups.teamsById.get(teamId);
    if (team?.leader_user_id) return String(team.leader_user_id);
    if (team?.created_by) return String(team.created_by);
  }

  return '';
}

/** @param {object} row @param {object} lookups @param {{ localClientId?: string, localUser?: object|null }} [opts] */
export function resolvePatientRegistrarLabel(row, lookups, opts) {
  const uid = resolvePatientRegistrarUserId(row, lookups, opts);
  if (uid) {
    const label = formatClinicalUserLabel(lookups.usersById.get(uid));
    if (label) return label;
  }
  const audit = Array.isArray(row?.audit_log) ? row.audit_log : [];
  const createEntry =
    audit.find(function (e) {
      return e && e.action === 'patient.create';
    }) || null;
  const createClientId = String(createEntry?.clientId || '').trim();
  if (createClientId && createClientId !== 'host') {
    return 'Dispositivo ···' + createClientId.slice(-6);
  }
  return '—';
}

/** @param {object} row @param {object} lookups */
export function resolvePatientTeamId(row, lookups) {
  return resolvePatientTeamIdFromAssignments(String(row?.id || ''), lookups.assignments);
}

/** @param {object} row @param {object} lookups */
export function resolvePatientTeamLabel(row, lookups) {
  const teamId = resolvePatientTeamId(row, lookups);
  if (!teamId) return 'Sin equipo';
  const team = lookups.teamsById.get(teamId);
  if (!team) return 'Equipo ' + teamId.slice(0, 8);
  const name = String(team.name || '').trim() || 'Equipo';
  const service = String(team.service || '').trim();
  const fraction = String(team.sub_area_fraction || '').trim();
  const bits = [name];
  if (service) bits.push(service);
  if (fraction) bits.push(fraction);
  return bits.join(' · ');
}

/**
 * @param {Array<{ row: object, local: object|null, status: string }>} annotated
 * @param {object|null|undefined} clinicalOps
 * @param {{ localClientId?: string, localUser?: object|null }} [opts]
 */
export function enrichLanHostPatientRows(annotated, clinicalOps, opts) {
  const lookups = buildClinicalOpsLookups(clinicalOps);
  return (annotated || []).map(function (item) {
    const updatedAt = resolvePatientUpdatedAt(item.row);
    const teamId = resolvePatientTeamId(item.row, lookups);
    return {
      ...item,
      teamId: teamId,
      teamLabel: resolvePatientTeamLabel(item.row, lookups),
      registrarLabel: resolvePatientRegistrarLabel(item.row, lookups, opts),
      updatedAt: updatedAt,
      updatedAtMs: timestampMillis(updatedAt),
      registrarUserId: resolvePatientRegistrarUserId(item.row, lookups, opts),
    };
  });
}
