/**
 * After joining / creating a team (esp. LAN → Nube): offer to assign local
 * patients that would otherwise disappear from the Nube team-scoped census.
 *
 * On Nube, charts need an assignment to a joined team (or be unassigned +
 * structural). Stale LAN team_ids leave patients invisible after update+join.
 *
 * HARD BOUNDARY — census assignment only. Never read/write `active_guardias`
 * or Modo Entrega. Active pendientes must not block heredar/traer or leave
 * team (leave resolves coverings in clinical-access-teams-membership).
 */
import { patients } from '../../app-state.mjs';
import {
  clinicalSessionContext,
  fetchClinicalScopeContextFromDb,
} from '../../clinical-access-runtime.mjs';
import { joinedTeamIdsForUser } from '../../mobile-team-patient-scope.mjs';
import {
  activePatientTeamId,
  assignPatientToTeamClinical,
} from '../../patient-team-assign-ui.mjs';
import { toast } from './shared.mjs';

/**
 * Local census rows that should be offered for reassignment to `teamId`.
 * Includes unassigned, archived/unknown team ids, and assignments to teams the
 * user is not a member of (typical after LAN → Nube team recreate).
 * @param {string} teamId
 * @param {Array<object>} [localPatients]
 */
export function listBringableLocalPatients(teamId, localPatients = patients) {
  const tid = String(teamId || '').trim();
  if (!tid) return [];
  const user = clinicalSessionContext.user;
  const myJoinedIds = joinedTeamIdsForUser(clinicalSessionContext.teams || [], user);
  // Join just succeeded — count target even if membership context is one tick late.
  myJoinedIds.add(tid);

  const rows = Array.isArray(localPatients) ? localPatients : [];
  return rows.filter((p) => {
    const pid = String(p?.id || '').trim();
    if (!pid) return false;
    const current = activePatientTeamId(pid);
    if (!current) return true;
    if (current === tid) return false;
    // Already on another of my joined teams — leave alone.
    if (myJoinedIds.has(current)) return false;
    // Stale LAN assignment, archived rotation, or foreign id → bring to Nube team.
    return true;
  });
}

/**
 * @param {Array<{ id?: string, nombre?: string, registro?: string }>} list
 * @param {string} teamName
 */
export function buildBringPatientsConfirmMessage(list, teamName) {
  const n = list.length;
  const label = String(teamName || 'tu equipo').trim() || 'tu equipo';
  const preview = list
    .slice(0, 8)
    .map((p) => `• ${String(p.nombre || 'Sin nombre').trim()} · ${String(p.registro || 's/reg').trim()}`)
    .join('\n');
  const more = n > 8 ? `\n… y ${n - 8} más` : '';
  const noun = n === 1 ? 'paciente local' : 'pacientes locales';
  return (
    `Tienes ${n} ${noun} que en Nube no quedan ligados a tu equipo ` +
    `(pasa al cambiar de LAN a Nube o con equipos nuevos).\n\n` +
    `¿Asignarlos a «${label}» para que no desaparezcan del censo?\n\n` +
    preview +
    more +
    '\n\nCancelar = unirte sin mover pacientes.'
  );
}

/**
 * @param {string[]} patientIds
 * @param {string} teamId
 * @param {{ assign?: Function }} [deps]
 */
export async function assignBringablePatientsToTeam(patientIds, teamId, deps = {}) {
  const tid = String(teamId || '').trim();
  const assign = typeof deps.assign === 'function' ? deps.assign : assignPatientToTeamClinical;
  let claimed = 0;
  const errors = [];
  if (!tid) return { claimed: 0, errors: ['Sin equipo'] };

  for (const rawId of patientIds || []) {
    const pid = String(rawId || '').trim();
    if (!pid) continue;
    try {
      const res = await assign(pid, tid);
      if (res && res.ok === false) errors.push(pid);
      else if (res === false) errors.push(pid);
      else claimed += 1;
    } catch (err) {
      errors.push(pid + ': ' + (err?.message || 'error'));
    }
  }
  return { claimed, errors };
}

async function fetchScopeForBringPatients(skipFetch) {
  if (skipFetch || typeof fetchClinicalScopeContextFromDb !== 'function') return;
  try {
    await fetchClinicalScopeContextFromDb();
  } catch {
    /* scope optional for listing */
  }
}

function shouldUseInheritModal(deps) {
  return deps.useModal !== false && typeof deps.confirm !== 'function' && typeof document !== 'undefined';
}

async function tryOpenInheritPatientsModal(tid, teamName) {
  const { openInheritPatientsModal, wireInheritPatientsModal } = await import(
    './teams-roster-inherit-patients-modal.mjs'
  );
  wireInheritPatientsModal();
  return openInheritPatientsModal({ teamId: tid, teamName });
}

function toastBringPatientsResult(claimed, errors) {
  if (typeof document === 'undefined') return;
  if (claimed > 0) {
    toast(
      claimed === 1
        ? '1 paciente heredado a tu equipo.'
        : `${claimed} pacientes heredados a tu equipo.`,
      'success'
    );
  }
  if (errors.length) {
    toast(`No se pudieron heredar ${errors.length} paciente(s).`, 'warn');
  }
}

function resolveBringPatientsConfirm(deps) {
  if (typeof deps.confirm === 'function') return deps.confirm;
  return (msg) => (typeof window !== 'undefined' ? window.confirm(msg) : false);
}

async function confirmAndAssignBringablePatients(tid, teamName, list, deps) {
  const confirmFn = resolveBringPatientsConfirm(deps);
  const ok = confirmFn(buildBringPatientsConfirmMessage(list, teamName));
  if (!ok) return { offered: true, claimed: 0, skipped: true };

  const ids = list.map((p) => String(p.id));
  const { claimed, errors } = await assignBringablePatientsToTeam(ids, tid, {
    assign: deps.assign,
  });
  toastBringPatientsResult(claimed, errors);
  return { offered: true, claimed, errors };
}

/**
 * @param {string} teamId
 * @param {string} [teamName]
 * @param {{ confirm?: (msg: string) => boolean, assign?: Function, skipFetch?: boolean, useModal?: boolean }} [deps]
 */
export async function offerBringPatientsAfterTeamJoin(teamId, teamName, deps = {}) {
  const tid = String(teamId || '').trim();
  if (!tid) return { offered: false, claimed: 0 };

  await fetchScopeForBringPatients(deps.skipFetch);

  const list = listBringableLocalPatients(tid);
  if (!list.length) return { offered: false, claimed: 0 };

  if (shouldUseInheritModal(deps)) {
    try {
      return await tryOpenInheritPatientsModal(tid, teamName);
    } catch {
      /* fall through to confirm */
    }
  }

  return confirmAndAssignBringablePatients(tid, teamName, list, deps);
}
