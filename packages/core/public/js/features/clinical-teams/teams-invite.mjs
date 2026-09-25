/**
 * Join-by-code, invite copy, URL consume (Mi rotación).
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
} from '../../clinical-access-runtime.mjs';
import {
  diagnoseInviteCodeFailure,
  inviteCodeFailureMessage,
  isClinicalTeamJoinDesktopApp,
  parseClinicalTeamJoinQuery,
  tryMountClinicalTeamInviteBrowserGate,
  normalizeTeamInviteCode,
  resolveTeamIdFromInviteCode,
} from '../../clinical-team-invite.mjs';
import { isLanSalaInvitePaste } from '../../mobile-join-link.mjs';
import { effectiveClinicalRank } from '../../clinical-privileges.mjs';
import { inferMembershipCycleForJoin } from '../../clinico-access.mjs';
import { ensureClinicalPanelSession } from '../clinical-panel-host.mjs';
import { dbApi, toast, currentUserId, filterJoinedTeams } from './shared.mjs';
import { publishClinicalTeamsAfterChange } from './teams-guardia-bridge.mjs';
import { markClinicalEverJoinedTeam } from '../clinical-rotation-rejoin-modal.mjs';

/** @param {string} raw */
function resolveTeamIdFromLocalTeams(raw) {
  if (raw.includes('-') && raw.length > 20) return raw;
  return resolveTeamIdFromInviteCode(raw, clinicalSessionContext.teams || []);
}

async function resolveTeamIdFromDirectory(raw) {
  try {
    const { pullClinicalOpsFromCloudRoom } = await import('./teams-guardia-bridge.mjs');
    await pullClinicalOpsFromCloudRoom({ timeoutMs: 8000, force: true });
    const { fetchClinicalTeamsFromDb: fetchTeams } = await import('../../clinical-access-runtime.mjs');
    await fetchTeams();
    return resolveTeamIdFromInviteCode(raw, clinicalSessionContext.teams || []);
  } catch {
    return '';
  }
}

/** @param {string} raw */
async function resolveTeamIdFromDbCode(raw) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamResolveCode !== 'function') return '';
  const res = await api.dbClinicalTeamResolveCode({ code: normalizeTeamInviteCode(raw) });
  if (!res?.ok || !res.team?.team_id) return '';
  await fetchClinicalTeamsFromDb();
  return String(res.team.team_id);
}

/** @param {string} codeOrId */
export async function resolveTeamIdForInviteInput(codeOrId) {
  const raw = String(codeOrId || '').trim();
  if (!raw) return '';
  await fetchClinicalTeamsFromDb();
  let teamId = resolveTeamIdFromLocalTeams(raw);
  if (!teamId) teamId = await resolveTeamIdFromDirectory(raw);
  if (!teamId) teamId = await resolveTeamIdFromDbCode(raw);
  return teamId;
}

function findTeamForJoin(teamId) {
  return (clinicalSessionContext.teams || []).find((t) => String(t.team_id) === teamId);
}

function isAlreadyJoinedTeam(teamId) {
  return filterJoinedTeams(clinicalSessionContext.teams, clinicalSessionContext.user).some(
    (t) => String(t.team_id) === teamId
  );
}

async function openTeamsPanelAfterAlreadyJoined() {
  toast('Ya perteneces a este equipo.', 'info');
  const { openClinicalTeamsPanel } = await import('./teams-roster.mjs');
  await openClinicalTeamsPanel();
}

async function finalizeSuccessfulTeamJoin(team, teamId, cycle) {
  toast(`Te uniste al equipo ${team.name || ''} (ciclo ${cycle}).`, 'success');
  markClinicalEverJoinedTeam();
  const sala = String(team?.sala || clinicalSessionContext.user?.sala || '').trim();
  const { closeClinicalTeamsPanel, refreshTeamsUiAfterChange } = await import('./teams-roster-shell.mjs');
  await fetchClinicalTeamsFromDb();
  closeClinicalTeamsPanel();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed', { detail: { sala } }));
  await publishClinicalTeamsAfterChange({ sala });
  void import('../cloud-sync/ensure-turn-room.mjs').then(({ ensureTurnRoomAfterTeamJoin }) =>
    ensureTurnRoomAfterTeamJoin(toast)
  );
  await refreshTeamsUiAfterChange();
}

export async function joinTeamById(teamId, subAreaFraction) {
  const userId = currentUserId();
  if (!userId || !teamId) return false;

  await fetchClinicalTeamsFromDb();
  const team = findTeamForJoin(teamId);
  if (!team) {
    toast('Equipo no encontrado en esta base de datos.', 'error');
    return false;
  }

  if (isAlreadyJoinedTeam(teamId)) {
    await openTeamsPanelAfterAlreadyJoined();
    return true;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsJoin !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return false;
  }

  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const cycle = subAreaFraction || inferMembershipCycleForJoin(team, rank);
  const res = await api.dbClinicalTeamsJoin({ teamId, userId, subAreaFraction: cycle });
  if (!res?.ok) {
    toast(res?.error || 'No se pudo unir al equipo.', 'error');
    return false;
  }

  await finalizeSuccessfulTeamJoin(team, teamId, cycle);
  return true;
}

/** Mi rotación team code field received a ⇄ sala link — hand off to Conexión guardia. */
export async function redirectLanInviteFromTeamJoinField(raw) {
  const text = String(raw || '').trim();
  if (!text) return false;

  const { openConnectionDropdown } = await import('../cloud-sync/panel-chrome.mjs');
  if (typeof openConnectionDropdown === 'function') openConnectionDropdown();
  toast('LiveSync LAN retirado — usa Nube en ⇄ Conexión.', 'info');
  return true;
}

/** @param {Event} ev */
export async function handleJoinWithCodeSubmit(ev) {
  ev.preventDefault();
  const input = document.getElementById('clinical-team-join-code-input');
  const cycleEl = document.getElementById('clinical-team-join-code-cycle');
  const code = input instanceof HTMLInputElement ? input.value : '';
  const subAreaFraction =
    cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || '').trim() : '';

  if (isLanSalaInvitePaste(code)) {
    await redirectLanInviteFromTeamJoinField(code);
    return;
  }

  const teamId = await resolveTeamIdForInviteInput(code);
  if (!teamId) {
    await fetchClinicalTeamsFromDb();
    const diag = diagnoseInviteCodeFailure(code, clinicalSessionContext.teams || []);
    toast(inviteCodeFailureMessage(diag), 'error');
    return;
  }
  await joinTeamById(teamId, subAreaFraction);
}

function clearClinicalTeamJoinQueryParams() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('joinTeam');
    url.searchParams.delete('joinCode');
    url.searchParams.delete('clinicalTeam');
    url.searchParams.delete('teamCode');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch (_e) { void _e; }
}

/**
 * Desktop only: prefill join from ?joinCode= or legacy ?joinTeam=.
 */
export async function consumeClinicalTeamJoinFromUrl() {
  if (typeof window === 'undefined' || !isClinicalTeamJoinDesktopApp()) {
    tryMountClinicalTeamInviteBrowserGate();
    return;
  }

  const parsed = parseClinicalTeamJoinQuery(window.location.search);
  if (!parsed.teamId && !parsed.inviteCode) return;

  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) return;

  const { openClinicalTeamsPanel } = await import('./teams-roster.mjs');
  await openClinicalTeamsPanel();

  const input = document.getElementById('clinical-team-join-code-input');
  if (input instanceof HTMLInputElement && parsed.inviteCode) {
    input.value = parsed.inviteCode;
  }

  const teamId =
    parsed.teamId || (await resolveTeamIdForInviteInput(parsed.inviteCode));
  if (!teamId) {
    toast('Pega el código en Mi rotación y pulsa Unirme.', 'info');
    clearClinicalTeamJoinQueryParams();
    return;
  }

  const cycleEl = document.getElementById('clinical-team-join-code-cycle');
  const subAreaFraction =
    cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || '').trim() : '';
  await joinTeamById(teamId, subAreaFraction);
  clearClinicalTeamJoinQueryParams();
}
