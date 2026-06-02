/**
 * Prominent Mi rotación entry points (sidebar + Mi Perfil).
 */
import { isDbMode } from '../db-storage-bridge.mjs';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { normalizeUsername } from '../clinical-username.mjs';
import { filterJoinedTeams } from './clinical-teams.mjs';
import { needsClinicalOnboarding } from './clinical-onboarding.mjs';

let entryControlsWired = false;

export async function openMiRotacion() {
  if (!isDbMode()) {
    if (typeof window.showToast === 'function') {
      window.showToast('Mi rotación requiere la base de datos clínica.', 'info');
    }
    return;
  }
  if (needsClinicalOnboarding()) {
    const mainMod = await import('./clinical-onboarding-main.mjs');
    if (!mainMod.focusMainClinicalOnboarding()) await mainMod.showMainClinicalOnboarding();
    return;
  }
  const { openClinicalTeamsPanel } = await import('./clinical-teams.mjs');
  await openClinicalTeamsPanel();
}

/**
 * @returns {{ primary: string, sub: string, pending: boolean, ctaLabel: string }}
 */
function buildEntryStatus() {
  if (needsClinicalOnboarding()) {
    return {
      primary: 'Configura tu rotación',
      sub: 'Usuario LAN, sala y equipo — obligatorio para guardia',
      pending: true,
      ctaLabel: 'Continuar configuración',
    };
  }

  const user = clinicalSessionContext.user;
  if (!user?.user_id) {
    return {
      primary: 'Mi rotación',
      sub: 'Desbloquea la base de datos para continuar',
      pending: true,
      ctaLabel: 'Abrir Mi rotación',
    };
  }

  const handle = normalizeUsername(user.username || '');
  const rank = String(user.rank || '').trim();
  const sala = String(user.sala || '').trim();
  const name = String(user.clinical_name || '').trim();
  const teams = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  const parts = [];
  if (handle) parts.push(`@${handle}`);
  if (rank) parts.push(rank);
  if (sala) parts.push(sala);
  const primary = parts.length ? parts.join(' · ') : 'Mi rotación';
  let sub = name || 'Equipos, entregas y perfil clínico';
  if (teams.length === 1) sub = `Equipo: ${String(teams[0].name || '—')}`;
  else if (teams.length > 1) sub = `${teams.length} equipos`;
  return { primary, sub, pending: false, ctaLabel: 'Abrir Mi rotación' };
}

export function syncClinicalRotationEntryChrome() {
  const sidebarSection = document.getElementById('clinical-rotation-section');
  const profileBlock = document.getElementById('profile-clinical-rotation-block');
  const show = isDbMode();

  if (sidebarSection) sidebarSection.hidden = !show;
  if (profileBlock) profileBlock.hidden = !show;
  if (!show) return;

  const status = buildEntryStatus();

  const sidebarBtn = document.getElementById('btn-sidebar-mi-rotacion');
  const sidebarPrimary = document.getElementById('clinical-rotation-entry-primary');
  const sidebarSub = document.getElementById('clinical-rotation-entry-sub');
  if (sidebarBtn) {
    sidebarBtn.classList.toggle('is-pending', status.pending);
    sidebarBtn.setAttribute(
      'title',
      status.pending ? 'Completa usuario y equipo' : 'Usuario LAN, equipos y entregas'
    );
  }
  if (sidebarPrimary) sidebarPrimary.textContent = status.primary;
  if (sidebarSub) sidebarSub.textContent = status.sub;

  const profileCta = document.getElementById('btn-profile-mi-rotacion');
  const profileStatus = document.getElementById('profile-clinical-rotation-status');
  if (profileCta) profileCta.textContent = status.ctaLabel;
  if (profileStatus) profileStatus.textContent = `${status.primary} — ${status.sub}`;
  if (profileBlock) profileBlock.classList.toggle('is-pending', status.pending);
}

export function wireClinicalRotationEntryControls() {
  if (entryControlsWired) return;
  entryControlsWired = true;

  const bind = (id) => {
    const el = document.getElementById(id);
    if (!el || el._rpcMiRotacionWired) return;
    el._rpcMiRotacionWired = true;
    el.addEventListener('click', () => void openMiRotacion());
  };

  bind('btn-sidebar-mi-rotacion');
  bind('btn-profile-mi-rotacion');

  if (typeof document !== 'undefined') {
    document.addEventListener('rpc-clinical-teams-changed', () => {
      syncClinicalRotationEntryChrome();
    });
  }
}

export const windowHandlers = {
  openMiRotacion,
};
