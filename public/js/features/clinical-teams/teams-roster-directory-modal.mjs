/** LAN directorio modal open/close. */
import { clinicalSessionContext, touchClinicalSessionActivity } from '../../clinical-access-runtime.mjs';
import { canViewUserDirectory } from '../../clinical-privileges.mjs';
import { flushPendingClinicalOpsSnapshot } from '../../clinical-ops-sync.mjs';
import { toast, escapeHtml } from './shared.mjs';
import { directoryRt } from './teams-roster-directory-state.mjs';
import {
  directoryUsersModalBackdropEl,
  directoryUsersModalBodyEl,
} from './teams-roster-directory-dom.mjs';
import { ensureDirectoryFilterDelegation } from './teams-roster-directory-filters.mjs';
import {
  loadDirectoryUsersIntoHost,
  pullDirectoryFromHostIfDue,
} from './teams-roster-directory-load.mjs';

export async function openDirectoryUsersModal() {
  const user = clinicalSessionContext.user || {};
  if (!canViewUserDirectory(user)) {
    toast(
      'Solo R4, Admin o quien tenga privilegios de administración puede abrir el directorio de usuarios.',
      'warn'
    );
    return;
  }

  const bd = directoryUsersModalBackdropEl();
  const host = directoryUsersModalBodyEl();
  if (!bd || !host) {
    console.error('[Directorio LAN] Falta #clinical-directory-users-backdrop o #clinical-directory-users-panel-body');
    toast(
      'No se pudo abrir el directorio (falta el diálogo en la UI). Ejecuta npm run build:ui y reinicia R+.',
      'error'
    );
    return;
  }

  host.innerHTML = '<p class="clinical-teams-empty">Cargando directorio…</p>';
  document.body.classList.add('clinical-directory-open');
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');

  directoryRt.lastFingerprint = '';
  directoryRt.freezeAutoRefresh = true;
  ensureDirectoryFilterDelegation();
  touchClinicalSessionActivity({ force: true });

  try {
    await pullDirectoryFromHostIfDue({ force: true });
    await loadDirectoryUsersIntoHost(host, { forceRender: true, forceIpc: true });
    const pendingSnap = await flushPendingClinicalOpsSnapshot();
    if (pendingSnap?.changed) {
      await loadDirectoryUsersIntoHost(host, { forceRender: true, forceIpc: true });
    }
  } catch (err) {
    console.error('[Directorio LAN]', err);
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(
      err instanceof Error ? err.message : 'No se pudo cargar el directorio.'
    )}</p>`;
  }

}

export function closeDirectoryUsersModal() {
  directoryRt.freezeAutoRefresh = false;
  directoryRt.lastFingerprint = '';
  const bd = directoryUsersModalBackdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('clinical-directory-open');
}
