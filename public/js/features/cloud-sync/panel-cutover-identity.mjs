import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import { bridgeCloudIdentityToLocal } from './identity-bridge.mjs';

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/**
 * @param {HTMLElement} root
 * @param {(msg: string, kind?: string) => void} toast
 * @returns {Promise<object|null>}
 */
export async function applyIdentityFromForm(root, toast) {
  const username = normalizeUsername(String(root.querySelector('[data-cutover-user]')?.value || ''));
  const displayName = String(root.querySelector('[data-cutover-display]')?.value || '').trim();
  const rank = String(root.querySelector('[data-cutover-rank]')?.value || 'R1').trim() || 'R1';
  const sala = String(root.querySelector('[data-cutover-sala]')?.value || '').trim();
  if (!isValidUsernameFormat(username)) {
    toast('Usuario inválido.', 'error');
    return null;
  }
  if (!displayName) {
    toast('Ingresa nombre en guardia.', 'error');
    return null;
  }
  const chosenUser = { username, displayName, rank, sala };
  await bridgeCloudIdentityToLocal({ username, displayName });
  await upsertProfile(chosenUser);
  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.rank = rank;
    if (sala) clinicalSessionContext.user.sala = sala;
  }
  return chosenUser;
}

async function upsertProfile(chosenUser) {
  const apiDb = dbApi();
  const sessionUserId = clinicalSessionContext.user?.user_id || clinicalSessionContext.user?.id;
  if (!apiDb?.dbClinicalProfileUpsert || !sessionUserId) return;
  await apiDb.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: chosenUser.displayName,
    rank: chosenUser.rank,
    sala: chosenUser.sala || null,
    isProgramAdmin: false,
  });
}
