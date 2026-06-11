/**
 * Patients without an explicit team assignment are provisional:
 * warn on registration and purge locally after 24 h (LAN tombstone when connected).
 */

import { patients, saveState } from './app-state.mjs';
import {
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from './clinical-access-runtime.mjs';
import { hasElevatedTeamPrivileges } from './clinical-privileges.mjs';
import { needsTeamOnboarding } from './features/clinical-onboarding.mjs';
import {
  assignableTeamsForUser,
  readPatientRegistrationTeamId,
} from './patient-team-assign-ui.mjs';
import {
  getActiveLiveSyncRoomId,
  purgeLanPatientFromHost,
  rememberPatientDeleteTombstone,
  removePatientLocally,
} from './features/lan-sync.mjs';
import { stagePatientDelete } from './patient-delete-sync.mjs';
import {
  selectExpiredTeamlessPatients,
  TEAMLESS_PATIENT_TTL_MS,
} from '../../lib/patient-teamless-policy.mjs';

export { TEAMLESS_PATIENT_TTL_MS, selectExpiredTeamlessPatients } from '../../lib/patient-teamless-policy.mjs';

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const TEAM_ONBOARDING_PROMPT_KEY = 'rpc-teamless-reg-prompted';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function shouldWarnTeamlessPatientSave() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id || hasElevatedTeamPrivileges(user)) return false;
  if (!assignableTeamsForUser(user).length) return true;
  return !readPatientRegistrationTeamId();
}

function removeTeamlessPatientLocally(patient) {
  const id = String(patient?.id || '').trim();
  if (!id || !removePatientLocally(id)) return false;
  if (getActiveLiveSyncRoomId()) {
    rememberPatientDeleteTombstone(patient);
    void purgeLanPatientFromHost(id);
    stagePatientDelete(id, patient, function () {
      import('./lan-mutation-registry.mjs').then(function (m) {
        m.lanMutationRegistry.dispatchLanMutation('patient-fields', id);
      });
    });
  }
  return true;
}

let cleanupInFlight = null;
let cleanupTimer = null;

/** Purge local charts that stayed without team assignment past the TTL. */
export async function purgeExpiredTeamlessPatients(options) {
  if (cleanupInFlight) return cleanupInFlight;
  const opts = options || {};
  cleanupInFlight = (async function () {
    const ctx = getClinicalScopeContextForEvaluate();
    const expired = selectExpiredTeamlessPatients(patients, {
      assignments: ctx.assignments || [],
      guardias: clinicalSessionContext.guardias || [],
      now: ctx.now,
    });
    if (!expired.length) return { removed: 0 };
    let removed = 0;
    for (const patient of expired) {
      if (removeTeamlessPatientLocally(patient)) removed += 1;
    }
    if (removed > 0) {
      saveState({ immediate: true });
      if (!opts.silent) {
        try {
          const shell = await import('./app-shell.mjs');
          if (typeof shell.showToast === 'function') {
            const label =
              removed === 1
                ? '1 paciente sin equipo eliminado (más de 24 h)'
                : removed + ' pacientes sin equipo eliminados (más de 24 h)';
            shell.showToast(label, 'info');
          }
        } catch (_e) {}
      }
      try {
        const mod = await import('./features/patients.mjs');
        if (typeof mod.renderPatientList === 'function') mod.renderPatientList();
      } catch (_e) {}
    }
    return { removed };
  })().finally(function () {
    cleanupInFlight = null;
  });
  return cleanupInFlight;
}

export function wireTeamlessPatientCleanup() {
  if (typeof document === 'undefined' || document._teamlessPatientCleanupWired) return;
  document._teamlessPatientCleanupWired = true;
  void purgeExpiredTeamlessPatients({ silent: true });
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = setInterval(function () {
    void purgeExpiredTeamlessPatients({ silent: true });
  }, CLEANUP_INTERVAL_MS);
  document.addEventListener('rpc-patient-team-assigned', function () {
    void purgeExpiredTeamlessPatients({ silent: true });
  });
  document.addEventListener('rpc-clinical-ops-synced', function () {
    void purgeExpiredTeamlessPatients({ silent: true });
  });
}

function openBackdropModal(id, html) {
  const prev = document.getElementById(id);
  if (prev) prev.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = id;
  backdrop.innerHTML = html;
  document.body.appendChild(backdrop);
  return backdrop;
}

/** Once per browser session when a teamless user opens patient registration. */
export function maybePromptTeamOnboardingForRegistration() {
  if (typeof document === 'undefined' || typeof sessionStorage === 'undefined') return;
  if (!needsTeamOnboarding()) return;
  if (sessionStorage.getItem(TEAM_ONBOARDING_PROMPT_KEY) === '1') return;
  sessionStorage.setItem(TEAM_ONBOARDING_PROMPT_KEY, '1');
  const backdrop = openBackdropModal(
    'teamless-reg-onboard-backdrop',
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="teamless-reg-onboard-title">' +
      '<h3 id="teamless-reg-onboard-title">Únete a un equipo</h3>' +
      '<p>Para registrar pacientes en la red ⇄ necesitas crear o unirte a un equipo en tu área (Mi rotación).</p>' +
      '<p>Si registras un paciente sin equipo, el expediente se <strong>eliminará automáticamente en 24 horas</strong>.</p>' +
      '<div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;margin-top:16px;">' +
      '<button type="button" class="btn-cancel" id="teamless-reg-onboard-later">Registrar igual</button>' +
      '<button type="button" class="btn-conflict-primary" id="teamless-reg-onboard-join">Ir a Mi rotación</button>' +
      '</div></div>'
  );
  const close = function () {
    backdrop.remove();
  };
  backdrop.querySelector('#teamless-reg-onboard-later').onclick = close;
  backdrop.querySelector('#teamless-reg-onboard-join').onclick = function () {
    close();
    void openMiRotacionFromPolicy();
  };
}

async function openMiRotacionFromPolicy() {
  try {
    const { openClinicalTeamsPanel } = await import('./features/clinical-teams/teams-roster.mjs');
    await openClinicalTeamsPanel({ skipProfileGate: true });
    return;
  } catch (_e) {}
  try {
    const { openMiRotacion } = await import('./clinical-rotation-entry.mjs');
    await openMiRotacion();
  } catch (_e) {}
}

/**
 * Confirm saving a patient without team assignment (non-elevated users).
 * @param {() => void} onConfirm
 */
export function confirmTeamlessPatientSave(onConfirm) {
  if (typeof document === 'undefined') {
    onConfirm();
    return;
  }
  const user = clinicalSessionContext.user;
  const hasTeams = assignableTeamsForUser(user).length > 0;
  const title = hasTeams ? 'Paciente sin equipo' : 'Sin equipo en tu rotación';
  const body = hasTeams
    ? 'No seleccionaste un equipo. El paciente se eliminará automáticamente en <strong>24 horas</strong> si no lo asignas a un equipo.'
    : 'No perteneces a ningún equipo. El paciente se eliminará automáticamente en <strong>24 horas</strong> si no te unes a un equipo y lo asignas.';
  const backdrop = openBackdropModal(
    'teamless-save-backdrop',
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="teamless-save-title">' +
      '<h3 id="teamless-save-title">' +
      esc(title) +
      '</h3>' +
      '<p>' +
      body +
      '</p>' +
      '<div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;margin-top:16px;">' +
      '<button type="button" class="btn-cancel" id="teamless-save-cancel">Cancelar</button>' +
      '<button type="button" class="btn-conflict-primary" id="teamless-save-confirm">Guardar de todas formas</button>' +
      '</div></div>'
  );
  backdrop.querySelector('#teamless-save-cancel').onclick = function () {
    backdrop.remove();
  };
  backdrop.querySelector('#teamless-save-confirm').onclick = function () {
    backdrop.remove();
    onConfirm();
  };
}

/** Sync registration modal hints for team requirement / TTL. */
export function syncPatientRegistrationTeamPolicyUi() {
  if (typeof document === 'undefined') return;
  const banner = document.getElementById('m-team-no-team-banner');
  const hint = document.getElementById('m-team-hint');
  const user = clinicalSessionContext.user;
  const elevated = hasElevatedTeamPrivileges(user);
  const teams = assignableTeamsForUser(user);
  const ttlHint =
    'Los pacientes sin equipo asignado se eliminan automáticamente después de 24 horas.';
  if (banner) {
    banner.style.display = !elevated && !teams.length ? '' : 'none';
  }
  if (hint) {
    hint.textContent = elevated
      ? 'Asigna al equipo que cubrirá el caso en ⇄.'
      : teams.length
        ? ttlHint + ' Asigna al equipo que cubrirá el caso en ⇄.'
        : ttlHint;
  }
}
