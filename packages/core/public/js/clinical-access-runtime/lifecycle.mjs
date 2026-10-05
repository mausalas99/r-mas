import { getPatients } from '../app-state.mjs';
import { effectiveClinicalRank } from '../clinical-privileges.mjs';
import { userIsOnGuardiaCallToday } from '../clinico-access.mjs';
import { isGuardiaMode } from '../features/chrome.mjs';
import { BackgroundVitalsMonitorLoop } from '../features/session-manager.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { isDirectoryPendingUsername, isValidUsernameFormat, normalizeUsername } from '../clinical-username.mjs';
import { markClinicalAccessBootReady } from './boot-ready.mjs';
import { bootstrapClinicalAccess } from './bootstrap.mjs';
import { wireClinicalOpsSyncRefresh } from './census-nube-pull.mjs';
import { electronApi } from './electron-api.mjs';
import { renderGuardiaCensusGrid, syncGuardiaCensusPanelVisibility } from './guardia-grid.mjs';
import { resetClinicalSessionContext, setVitalsLoop, vitalsLoop } from './state.mjs';

let asked = false;

const isRealHandle = (h) => isValidUsernameFormat(h) && !isDirectoryPendingUsername(h);

/** Ask until the claim works or the user cancels. */
async function askAndClaim(api, user, current, showAdminPromptModal) {
  let message =
    'Tu usuario actual es ' + current + '. Es un nombre temporal. Tus compañeros no te encuentran con él. Elige un @usuario real (letras, números y _; mínimo 3).';
  for (;;) {
    const raw = await showAdminPromptModal({
      title: 'Elige tu @usuario',
      message,
      placeholder: '@usuario',
      confirmLabel: 'Guardar usuario',
    });
    if (raw == null) return;
    const next = normalizeUsername(raw);
    if (!isRealHandle(next)) {
      message = 'Ese usuario no es válido. Usa letras, números y _. Mínimo 3, y no empieces con peer_ o lc_.';
      continue;
    }
    const res = await api.dbClinicalUsernameClaim({ userId: user.user_id, username: next });
    if (res?.ok) {
      user.username = next;
      return;
    }
    message = String(res?.error || 'No se pudo guardar el usuario.') + ' Prueba otro.';
  }
}

// Session user has a temporary peer_ or lc_ handle: ask for a real @usuario (once per launch).
export async function promptRealUsernameIfPending() {
  const user = clinicalSessionContext.user;
  const api = electronApi();
  const current = normalizeUsername(user?.username || '');
  if (asked || !user?.user_id || !current || isRealHandle(current)) return;
  if (typeof api?.dbClinicalUsernameClaim !== 'function') return;
  // First-run screen is open: its buttons would sit under the modal. Ask next launch.
  if (document.querySelector('.clinical-onboarding-stage')) return;
  asked = true;
  // Lazy: the modal and its helpers stay out of the eager boot chunks.
  const { showAdminPromptModal } = await import('../features/cloud-sync/admin-prompt-modal.mjs');
  await askAndClaim(api, user, current, showAdminPromptModal);
}

export async function initClinicalAccessRuntime(settings, clientId) {
  const ok = await bootstrapClinicalAccess(settings, clientId);
  markClinicalAccessBootReady();
  if (!ok) return;
  wireClinicalOpsSyncRefresh();
  void promptRealUsernameIfPending();

  if (vitalsLoop) vitalsLoop.stop();
  const nextVitalsLoop = new BackgroundVitalsMonitorLoop(
    {
      all: async (sql, params) => {
        void sql;
        void params;
        const api = electronApi();
        if (!api || typeof api.dbGuardiaCensus !== 'function') return [];
        const census = await api.dbGuardiaCensus({ userId: clinicalSessionContext.user?.user_id });
        if (!census || census.ok === false) return [];
        return Array.isArray(census.guardias) ? census.guardias : [];
      },
    },
    String(clinicalSessionContext.user?.user_id || clientId),
    {
      shouldMonitorVitals: () => {
        const uid = String(clinicalSessionContext.user?.user_id || '');
        if (!uid) return false;
        const rank = effectiveClinicalRank(clinicalSessionContext.user);
        const teams = clinicalSessionContext.teams || [];
        const salaGuardiaToday =
          clinicalSessionContext.salaGuardiaToday ||
          clinicalSessionContext.scopeContext?.salaGuardiaToday ||
          [];
        return userIsOnGuardiaCallToday(uid, rank, teams, new Date(), salaGuardiaToday);
      },
      resolvePatientLabel: (patientId) => {
        const p = getPatients().find((row) => String(row.id) === String(patientId));
        if (!p) return '';
        const name = String(p.nombre || '').trim();
        const bed = [p.cuarto, p.cama].filter(Boolean).join('-');
        if (name && bed) return `${name} (${bed})`;
        return name || bed || '';
      },
    }
  );
  setVitalsLoop(nextVitalsLoop);
  nextVitalsLoop.start();

  syncGuardiaCensusPanelVisibility(settings);
  if (isGuardiaMode()) renderGuardiaCensusGrid(settings);
}

export function stopClinicalAccessRuntime() {
  if (vitalsLoop) {
    vitalsLoop.stop();
    setVitalsLoop(null);
  }
  resetClinicalSessionContext();
}

/** @param {Record<string, unknown>|null|undefined} settings @param {string} clientId */
export async function resumeClinicalSession(settings, clientId) {
  await bootstrapClinicalAccess(settings, clientId);
}
