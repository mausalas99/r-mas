/**
 * Onboarding step 3 — unirse a un equipo de guardia (autoservicio vía Nube).
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { normalizeUsername } from '../clinical-username.mjs';
import { buildOnboardingStageHtml } from './clinical-onboarding-shell.mjs';
import { escapeHtml } from '../dom-escape.mjs';
import { getCloudSyncToken } from './cloud-sync/settings.mjs';
import { isCloudSala } from './cloud-sync/sala-allowlist.mjs';

function buildTeamOnboardLeadHtml() {
  const rank = String(clinicalSessionContext.user?.rank || 'R1').trim();
  const sala = String(clinicalSessionContext.user?.sala || '').trim();
  const handle = normalizeUsername(clinicalSessionContext.user?.username || '');
  const who = [handle ? '@' + handle : '', rank, sala].filter(Boolean).join(' · ');
  const intro = who
    ? `<p>Tu perfil y Nube están listos (<strong>${escapeHtml(who)}</strong>). Elige tu equipo de guardia.</p>`
    : '<p>Tu perfil y Nube están listos. Elige tu equipo de guardia.</p>';
  const nubeLine = isCloudSala(sala)
    ? '<li>En <strong>Mi rotación → Explorar</strong> verás equipos de tu sala sincronizados por Nube; pulsa <strong>Unirme</strong>.</li>' +
      '<li>Si no hay ninguno, <strong>Crear nuevo equipo</strong> (queda publicado a la sala).</li>' +
      '<li>O pega el <strong>código de invitación</strong> de tu R2.</li>'
    : '<li>En <strong>Mi rotación</strong> explora equipos de tu sala o pide código a tu R2.</li>';
  return (
    intro +
    '<ul class="clinical-onboard-team-hints">' +
    nubeLine +
    '</ul>'
  );
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
export function renderTeamOnboardingInto(host, opts = {}) {
  host.innerHTML = buildOnboardingStageHtml({
    title: 'Únete a un equipo',
    leadHtml: buildTeamOnboardLeadHtml(),
    stepperIndex: 3,
    bodyHtml:
      '<p class="clinical-onboarding-status" id="clinical-onboard-team-status">' +
      (opts.skipCloudSync
        ? 'Listo — abre Mi rotación para unirte o crear equipo.'
        : 'Buscando equipos en tu sala…') +
      '</p>' +
      '<div class="clinical-onboard-team-actions">' +
      '<button type="button" class="btn-save" data-team-onboard-open>Abrir Mi rotación</button>' +
      '</div>',
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
