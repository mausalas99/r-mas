/**
 * Code-gate to edit a locked (past-date) clinical entry. Same normalize/match
 * pattern as clinico-access-unlock.mjs, deliberately a separate phrase — that
 * gate unlocks a different thing (the Manejo section). Unlock is in-memory
 * only (never persisted): re-picking the date, or leaving the screen, re-locks.
 */
import { askTextPrompt } from './text-prompt-modal.mjs';

var DIACRITICS_RE = new RegExp('[\u0300-\u036f]', 'g');

export const HISTORY_EDIT_UNLOCK_PHRASE = 'entiendo, esto modifica un registro pasado';

/** @param {unknown} text */
export function normalizeHistoryEditCode(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .replace(/\s+/g, ' ');
}

/** @param {unknown} text */
export function matchesHistoryEditCode(text) {
  return normalizeHistoryEditCode(text) === normalizeHistoryEditCode(HISTORY_EDIT_UNLOCK_PHRASE);
}

/**
 * Shows the unlock-code modal and resolves with whether it matched.
 * @returns {Promise<boolean>}
 */
export async function promptHistoryEditUnlock() {
  var input = await askTextPrompt({
    title: 'Registro bloqueado',
    message: 'Este registro es de una fecha pasada. Escribe el código para editarlo.',
    confirmLabel: 'Desbloquear',
  });
  if (input == null) return false;
  return matchesHistoryEditCode(input);
}
