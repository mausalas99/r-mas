/**
 * Demo IC patients on the real app: while active, the interconsulta board
 * shows demo teams/patients only (real teams hidden, same isolation feel as
 * "Modo presentación"); real patients are never touched and demo rows are
 * never persisted (SQLCipher) or pushed to Nube (app-state.mjs's
 * patientsForPersistence + getSyncablePatients).
 * ⌥⌘⇧I toggles it.
 */
import {
  getPatients,
  setPatients,
  setPersistPatientsResolver,
  persistClinicalState,
} from '../app-state.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import {
  buildInterconsultaDemoTeams,
  buildInterconsultaDemoPatients,
  buildInterconsultaDemoAssignments,
  isInterconsultaDemoTeamId,
} from '../../../lib/clinical-scope/interconsulta-demo-seed.mjs';
import { getInterconsultaTeamRoles } from '../../../lib/clinical-scope/interconsulta-team-roles.mjs';
import { showToast } from '../ui-toast.mjs';
import { isInterconsultaDemoActive, setInterconsultaDemoActive } from './interconsulta-demo-state.mjs';
import { renderInterconsultaBoardView } from './interconsulta-mode-chrome.mjs';

export { isInterconsultaDemoActive };

function ensureScopeContext() {
  if (!clinicalSessionContext.scopeContext || typeof clinicalSessionContext.scopeContext !== 'object') {
    clinicalSessionContext.scopeContext = { teams: clinicalSessionContext.teams.slice(), assignments: [] };
  }
  if (!Array.isArray(clinicalSessionContext.scopeContext.teams)) clinicalSessionContext.scopeContext.teams = [];
  if (!Array.isArray(clinicalSessionContext.scopeContext.assignments)) clinicalSessionContext.scopeContext.assignments = [];
  return clinicalSessionContext.scopeContext;
}

// clinicalSessionContext.scopeContext/.teams get REPLACED wholesale by any real
// scope refresh (Nube pull, LAN reconcile, guardia grid poll — all fetch from DB
// and don't know demo teams exist). Since those refreshes can land at any time,
// independent of anything the demo toggle does, this module keeps its own durable
// copy of what it seeded and re-injects it — see ensureInterconsultaDemoInScope().
let demoTeamsSeeded = null;
let demoAssignmentsSeeded = null;

/** Merges 12 demo patients + 4 demo teams into the real app. Returns the seeded count. */
export function seedInterconsultaDemoOnMainApp(now) {
  const nowDate = now instanceof Date ? now : new Date();
  const teams = buildInterconsultaDemoTeams();
  const roles = getInterconsultaTeamRoles(teams, nowDate.toISOString());
  const demoPatients = buildInterconsultaDemoPatients(roles, nowDate);
  const assignments = buildInterconsultaDemoAssignments(demoPatients, nowDate);

  demoTeamsSeeded = teams;
  demoAssignmentsSeeded = assignments;
  setPatients(getPatients().concat(demoPatients));
  setInterconsultaDemoActive(true);
  ensureInterconsultaDemoInScope();

  // Any resolver activates patientsForPersistence()'s isDemo filter (app-state.mjs);
  // it does not need to supply its own list since the real patients are still merged in-memory.
  setPersistPatientsResolver(function () {
    return [];
  });
  return demoPatients.length;
}

/** Records a drag/drop or consult-band team change for a demo patient onto the
 * durable snapshot (not just the disposable scopeContext) so it survives a
 * background scope refresh. See the comment above `demoTeamsSeeded`. */
export function recordInterconsultaDemoPatientAssignment(patientId, teamId, nowIso) {
  if (!demoAssignmentsSeeded) return;
  demoAssignmentsSeeded = demoAssignmentsSeeded.filter((a) => String(a.patient_id) !== String(patientId));
  if (teamId) {
    demoAssignmentsSeeded = demoAssignmentsSeeded.concat([
      { patient_id: patientId, team_id: teamId, effective_at: nowIso, created_at: nowIso },
    ]);
  }
  ensureInterconsultaDemoInScope();
}

/** Re-injects the durable demo teams/assignments into whatever the current
 * scopeContext is — call before reading scope for the interconsulta board, since
 * a real scope refresh may have replaced it since the last render. Idempotent. */
export function ensureInterconsultaDemoInScope() {
  if (!isInterconsultaDemoActive() || !demoTeamsSeeded) return;
  const scope = ensureScopeContext();
  if (!scope.teams.some((t) => isInterconsultaDemoTeamId(t && t.team_id))) {
    scope.teams = scope.teams.concat(demoTeamsSeeded);
  }
  if (!clinicalSessionContext.teams.some((t) => isInterconsultaDemoTeamId(t && t.team_id))) {
    clinicalSessionContext.teams = clinicalSessionContext.teams.concat(demoTeamsSeeded);
  }
  const demoPatientIds = new Set(demoAssignmentsSeeded.map((a) => a.patient_id));
  scope.assignments = scope.assignments
    .filter((a) => !demoPatientIds.has(a && a.patient_id))
    .concat(demoAssignmentsSeeded);
}

/** Removes demo patients/teams/assignments, restores normal persistence. */
export function clearInterconsultaDemoFromMainApp() {
  setPatients(getPatients().filter((p) => !p.isDemo));
  clinicalSessionContext.teams = clinicalSessionContext.teams.filter((t) => !isInterconsultaDemoTeamId(t?.team_id));
  const scope = clinicalSessionContext.scopeContext;
  if (scope && typeof scope === 'object') {
    if (Array.isArray(scope.teams)) scope.teams = scope.teams.filter((t) => !isInterconsultaDemoTeamId(t?.team_id));
    if (Array.isArray(scope.assignments))
      scope.assignments = scope.assignments.filter((a) => !isInterconsultaDemoTeamId(a?.team_id));
  }
  setPersistPatientsResolver(null);
  setInterconsultaDemoActive(false);
  demoTeamsSeeded = null;
  demoAssignmentsSeeded = null;
}

export function toggleInterconsultaDemo() {
  if (isInterconsultaDemoActive()) {
    clearInterconsultaDemoFromMainApp();
    showToast('Demo de interconsultas: fuera del tablero', 'info');
  } else {
    const count = seedInterconsultaDemoOnMainApp(new Date());
    showToast('Demo de interconsultas: ' + count + ' pacientes en el tablero', 'info');
  }
  persistClinicalState();
  renderInterconsultaBoardView();
}

/** ⌥⌘⇧I — alternar demo de interconsultas. */
export function isInterconsultaDemoShortcut(e) {
  if (!e || !e.altKey || !e.shiftKey) return false;
  if (!(e.metaKey || e.ctrlKey)) return false;
  if (e.code === 'KeyI') return true;
  return String(e.key || '').toLowerCase() === 'i';
}

export function initInterconsultaDemoShortcut() {
  if (initInterconsultaDemoShortcut._bound) return;
  initInterconsultaDemoShortcut._bound = true;
  if (typeof window !== 'undefined') window.toggleInterconsultaDemo = toggleInterconsultaDemo;
  document.addEventListener(
    'keydown',
    function (e) {
      if (!isInterconsultaDemoShortcut(e)) return;
      const tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target && e.target.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      toggleInterconsultaDemo();
    },
    true
  );
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInterconsultaDemoShortcut);
  } else {
    initInterconsultaDemoShortcut();
  }
}
