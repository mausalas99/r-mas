/**
 * Onboarding step 3 — unirse a un equipo de guardia (autoservicio vía Nube).
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { normalizeUsername } from '../clinical-username.mjs';
import { getCloudSyncToken } from './cloud-sync/settings.mjs';
import { isCloudSala } from './cloud-sync/sala-allowlist.mjs';

function teamOnboardWho() {
  const rank = String(clinicalSessionContext.user?.rank || 'R1').trim();
  const sala = String(clinicalSessionContext.user?.sala || '').trim();
  const handle = normalizeUsername(clinicalSessionContext.user?.username || '');
  return [handle ? '@' + handle : '', rank, sala].filter(Boolean).join(' · ');
}

async function syncTeamsBeforeTeamStep() {
  if (!getCloudSyncToken() || !isCloudSala(clinicalSessionContext.user?.sala)) return;
  try {
    const { refreshClinicalOpsDirectory } = await import('./clinical-teams/teams-guardia-bridge.mjs');
    await refreshClinicalOpsDirectory({ force: true });
    const { needsTeamOnboardingStep } = await import('./clinical-onboarding-gates.mjs');
    if (!needsTeamOnboardingStep()) {
      const { hideMainClinicalOnboarding } = await import('./clinical-onboarding-main.mjs');
      hideMainClinicalOnboarding();
      return;
    }
    const status = document.getElementById('clinical-onboard-team-status');
    if (status) status.textContent = 'Listo — abre Mi rotación para unirte o crear equipo.';
  } catch {
    const status = document.getElementById('clinical-onboard-team-status');
    if (status) status.textContent = 'Listo — abre Mi rotación para unirte o crear equipo.';
  }
}

/** @param {HTMLElement} host @param {{ skipCloudSync?: boolean }} [opts] */
export async function renderTeamOnboardingInto(host, opts = {}) {
  const { drawTeamStep } = await import('./clinical-onboarding-view.jsx');
  drawTeamStep(host, {
    who: teamOnboardWho(),
    cloudSala: isCloudSala(String(clinicalSessionContext.user?.sala || '').trim()),
    skipCloudSync: !!opts.skipCloudSync,
  });
  if (opts.skipCloudSync || host._rpcTeamOnboardSyncDone) return;
  host._rpcTeamOnboardSyncDone = true;
  void syncTeamsBeforeTeamStep();
}

async function openMiRotacionFromTeamOnboard() {
  const { openClinicalTeamsPanel } = await import('./clinical-teams/teams-roster.mjs');
  await openClinicalTeamsPanel();
}

/** @param {HTMLElement} host */
export function wireTeamOnboardingInteractions(host) {
  if (!host || host._rpcTeamOnboardWired) return;
  host._rpcTeamOnboardWired = true;
  host.addEventListener('click', (ev) => {
    const openBtn = ev.target instanceof Element ? ev.target.closest('[data-team-onboard-open]') : null;
    if (openBtn) void openMiRotacionFromTeamOnboard();
  });
}
