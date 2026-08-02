/**
 * Build / persist 7.9 migration snapshot (survives user wipe).
 * Stored in localStorage (Chromium profile under Electron userData).
 */

export const SNAPSHOT_STORAGE_KEY = 'rpc-cloud-sync-79-snapshot';

/**
 * @param {{
 *   ops?: object | null,
 *   patients?: object[],
 * }} sources
 */
export function buildCutoverSnapshot(sources) {
  const ops = sources?.ops && typeof sources.ops === 'object' ? sources.ops : {};
  const patients = Array.isArray(sources?.patients) ? sources.patients : [];
  const userById = indexClinicalUsers(ops.clinical_users);
  const membersByTeam = indexMembership(ops.team_membership, userById);
  const teamRows = buildTeamRows(ops.teams, membersByTeam);
  const latestAssign = latestPatientAssignments(ops.patient_team_assignment);
  const patientRows = buildPatientRows(patients, latestAssign, teamRows);
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    users: [...userById.values()].filter((u) => u.username),
    teams: teamRows,
    patients: patientRows,
  };
}

function indexClinicalUsers(clinicalUsers) {
  const list = Array.isArray(clinicalUsers) ? clinicalUsers : [];
  const userById = new Map();
  for (const u of list) {
    const id = String(u.user_id || u.id || '').trim();
    if (!id) continue;
    userById.set(id, {
      username: String(u.username || '').trim().toLowerCase(),
      displayName: String(u.clinical_name || u.displayName || '').trim(),
      rank: String(u.rank || 'R1').trim() || 'R1',
      sala: String(u.sala || '').trim(),
      userId: id,
    });
  }
  return userById;
}

function indexMembership(membership, userById) {
  const list = Array.isArray(membership) ? membership : [];
  const membersByTeam = new Map();
  for (const m of list) {
    const tid = String(m.team_id || '').trim();
    const uid = String(m.user_id || '').trim();
    if (!tid || !uid) continue;
    if (!membersByTeam.has(tid)) membersByTeam.set(tid, []);
    const u = userById.get(uid);
    if (u?.username) membersByTeam.get(tid).push(u.username);
  }
  return membersByTeam;
}

function buildTeamRows(teams, membersByTeam) {
  const list = Array.isArray(teams) ? teams : [];
  return list
    .filter((t) => t && !t.archived_at)
    .map((t) => {
      const teamId = String(t.team_id || '').trim();
      return {
        teamId,
        name: String(t.name || '').trim() || teamId,
        sala: String(t.sala || t.service || '').trim(),
        memberUsernames: [...new Set(membersByTeam.get(teamId) || [])],
      };
    })
    .filter((t) => t.teamId);
}

function latestPatientAssignments(assignments) {
  const list = Array.isArray(assignments) ? assignments : [];
  const latestAssign = new Map();
  for (const a of list) {
    const pid = String(a.patient_id || '').trim();
    const tid = String(a.team_id || '').trim();
    const at = String(a.effective_at || a.created_at || '');
    if (!pid || !tid) continue;
    const prev = latestAssign.get(pid);
    if (!prev || at >= prev.at) latestAssign.set(pid, { teamId: tid, at });
  }
  return latestAssign;
}

function buildPatientRows(patients, latestAssign, teamRows) {
  const teamIdToMembers = new Map(teamRows.map((t) => [t.teamId, t.memberUsernames]));
  return patients
    .map((p) => {
      const id = String(p.id || p.patientId || '').trim();
      const teamId =
        latestAssign.get(id)?.teamId || String(p.teamId || p.team_id || '').trim();
      const members = teamIdToMembers.get(teamId) || [];
      return {
        id,
        registro: String(p.registro || '').trim(),
        nombre: String(p.nombre || p.name || '').trim(),
        sala: String(p.sala || p.clinicalSala || '').trim(),
        teamId,
        ownerUsername: members[0] || '',
      };
    })
    .filter((p) => p.id);
}

/** @param {object} snapshot */
export function saveCutoverSnapshot(snapshot) {
  if (typeof localStorage === 'undefined') return false;
  localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  return true;
}

/** @returns {object | null} */
export function loadCutoverSnapshot() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCutoverSnapshot() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
}
