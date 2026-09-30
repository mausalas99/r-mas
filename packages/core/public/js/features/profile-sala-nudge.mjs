/**
 * Pulses the top-bar «Mi Perfil» button while the sala needs a pick: no sala
 * saved (stays until one is set), or day 1 of the month (until the button is
 * clicked that day). The Sala section inside Mi perfil carries the wording.
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { readRpcSettings } from '../clinical-settings.mjs';

const SEEN_KEY = 'rpc-sala-nudge-seen';
const today = () => new Date().toISOString().slice(0, 10);

function seenToday() {
  try {
    return localStorage.getItem(SEEN_KEY) === today();
  } catch {
    return false;
  }
}

export function syncProfileSalaNudge() {
  const btn = document.getElementById('profile-toggle-btn');
  const user = clinicalSessionContext.user;
  if (!btn || !user) return;
  const sala = String(user.sala || readRpcSettings().clinicalSala || '').trim();
  const newMonth = new Date().getDate() === 1 && !seenToday();
  btn.classList.toggle('profile-sala-nudge', !sala || newMonth);
  if (!btn._rpcSalaNudgeWired) {
    btn._rpcSalaNudgeWired = true;
    btn.addEventListener('click', () => {
      try {
        localStorage.setItem(SEEN_KEY, today());
      } catch {
        /* per-day dismiss is optional */
      }
      syncProfileSalaNudge();
    });
  }
}
