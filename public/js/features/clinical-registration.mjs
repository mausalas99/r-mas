/**
 * First-run clinical identity registration (username, rank, display name, sala) after DB unlock.
 */
import { persistLanClientConfig } from './lan-sync.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../clinical-username.mjs';
import { persistClinicalUserBinding } from '../clinical-settings.mjs';

const RANKS = ['R1', 'R2', 'R3', 'R4', 'Admin'];

/** @param {Record<string, unknown>|null|undefined} settings */
export function needsClinicalRegistration(settings) {
  if (!isDbMode()) return false;
  return !settings || settings.clinicalRegistered !== true;
}

/** @type {((ok: boolean) => void)|null} */
let pendingResolve = null;

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/**
 * Pre-fill registration form from URL query params (mobile pairing link).
 */
export function prefillRegistrationFromUrlParams() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const user = params.get('user') || '';
  const name = params.get('name') || '';
  const rank = params.get('rank') || '';
  const sala = params.get('sala') || '';
  if (!user && !name && !rank && !sala) return;

  const pairs = [
    ['clinical-reg-username', 'onboard-username', user],
    ['clinical-reg-name', 'onboard-clinical-name', name],
    ['clinical-reg-rank', 'onboard-rank', rank],
    ['clinical-reg-sala', 'onboard-sala', sala],
  ];
  for (const [regId, onboardId, value] of pairs) {
    if (!value) continue;
    const regEl = document.getElementById(regId);
    const onboardEl = document.getElementById(onboardId);
    if (regEl) regEl.value = value;
    if (onboardEl) onboardEl.value = value;
  }
}

function backdropEl() {
  return document.getElementById('clinical-registration-backdrop');
}

export function openClinicalRegistrationModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  const usernameInput = document.getElementById('clinical-reg-username');
  if (usernameInput) usernameInput.focus();
}

export function closeClinicalRegistrationModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

function wireRegistrationFormOnce() {
  const form = document.getElementById('clinical-registration-form');
  if (!form || form._rpcClinicalRegWired) return;
  form._rpcClinicalRegWired = true;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errEl = document.getElementById('clinical-reg-error');
    const usernameRaw = String(document.getElementById('clinical-reg-username')?.value || '').trim();
    const username = normalizeUsername(usernameRaw);
    const name = String(document.getElementById('clinical-reg-name')?.value || '').trim();
    const rank = String(document.getElementById('clinical-reg-rank')?.value || 'R1');
    const sala = String(document.getElementById('clinical-reg-sala')?.value || '').trim();

    if (!isValidUsernameFormat(username)) {
      if (errEl) {
        errEl.textContent =
          'Usuario inválido. Usa 3–32 caracteres en minúsculas: letras, números y _.';
        errEl.hidden = false;
      }
      return;
    }
    if (!name) {
      if (errEl) {
        errEl.textContent = 'Escribe tu nombre en guardia.';
        errEl.hidden = false;
      }
      return;
    }

    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    } catch (_e) {}
    const clientId = String(settings.clientId || '').trim();
    if (!clientId) {
      if (errEl) {
        errEl.textContent = 'No se encontró el identificador del dispositivo. Reinicia R+.';
        errEl.hidden = false;
      }
      return;
    }

    const safeRank = RANKS.includes(rank) ? rank : 'R1';
    let savedUserId = String(settings.clinicalUserId || '');
    const api = dbApi();
    if (api && typeof api.dbClinicalAccessBootstrap === 'function') {
      try {
        const boot = await api.dbClinicalAccessBootstrap({
          clientId,
          rank: safeRank,
          preferredUserId: String(settings.clinicalUserId || ''),
          preferredUsername: username,
        });
        let userId = String(boot?.user?.userId || '');
        if (!userId || boot?.ok === false) {
          throw new Error(boot?.error || 'No se pudo iniciar la sesión clínica.');
        }
        const bootHandle = normalizeUsername(boot?.user?.username || '');
        if (bootHandle !== username && typeof api.dbClinicalUsernameClaim === 'function') {
          const claimRes = await api.dbClinicalUsernameClaim({ userId, username });
          if (!claimRes?.ok) {
            const errMsg = String(claimRes?.error || '');
            if (/ya está en uso/i.test(errMsg)) {
              const retry = await api.dbClinicalAccessBootstrap({
                clientId,
                rank: safeRank,
                preferredUsername: username,
                preferredUserId: String(settings.clinicalUserId || ''),
              });
              userId = String(retry?.user?.userId || '');
              if (!retry?.ok || normalizeUsername(retry?.user?.username || '') !== username) {
                throw new Error(errMsg);
              }
            } else {
              throw new Error(errMsg || 'No se pudo registrar el usuario LAN.');
            }
          }
        }
        savedUserId = userId;
        if (typeof api.dbClinicalProfileUpsert === 'function') {
          const profileRes = await api.dbClinicalProfileUpsert({
            userId,
            clinicalName: name,
            rank: safeRank,
            sala: sala || null,
          });
          if (!profileRes?.ok) {
            throw new Error(profileRes?.error || 'No se guardó el perfil clínico.');
          }
        }
      } catch (err) {
        if (errEl) {
          errEl.textContent = err?.message || 'Error al guardar el registro.';
          errEl.hidden = false;
        }
        return;
      }
    }

    persistClinicalUserBinding({
      userId: savedUserId,
      username,
      displayName: name,
      rank: safeRank,
      sala: sala || '',
      registered: true,
    });

    if (errEl) errEl.hidden = true;
    closeClinicalRegistrationModal();
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host') || '';
    const code = params.get('code') || '';
    if (host && code) {
      try {
        persistLanClientConfig(host, code);
      } catch (_e) {}
    }
    if (pendingResolve) {
      const done = pendingResolve;
      pendingResolve = null;
      done(true);
    }
  });
}

/**
 * @param {Record<string, unknown>} settings
 * @returns {Promise<boolean>}
 */
export function promptClinicalRegistrationIfNeeded(settings) {
  if (!needsClinicalRegistration(settings)) return Promise.resolve(false);
  return import('./clinical-onboarding-main.mjs').then((mod) =>
    mod.showMainClinicalOnboarding().then(() => true)
  );
}

export const windowHandlers = {
  openClinicalRegistrationModal,
  closeClinicalRegistrationModal,
  submitClinicalRegistration(ev) {
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    const form = document.getElementById('clinical-registration-form');
    if (form) form.requestSubmit();
  },
};
