import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { isDirectoryPendingUsername, isValidUsernameFormat, normalizeUsername } from '../clinical-username.mjs';
import { electronApi } from '../clinical-access-runtime/electron-api.mjs';

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
  asked = true;
  // Lazy: the modal and its helpers stay out of the eager boot chunks.
  const { showAdminPromptModal } = await import('./cloud-sync/admin-prompt-modal.mjs');
  await askAndClaim(api, user, current, showAdminPromptModal);
}
