/**
 * Shared markup shell for first-run onboarding steps (sync mode, profile, session).
 */

/** @param {1|2|3} activeIndex */
export function buildClinicalOnboardingStepperHtml(activeIndex) {
  const labels = ['Modo', 'Perfil', 'Equipo'];
  const dots = labels
    .map((label, i) => {
      const n = i + 1;
      const cls = n === activeIndex ? ' is-active' : '';
      return `<span class="${cls.trim()}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${n}</span>`;
    })
    .join('');
  return `<div class="clinical-onboarding-progress" aria-label="Progreso del registro">${dots}</div>`;
}

/**
 * @param {{ title: string, leadHtml: string, bodyHtml: string, stepperIndex?: number|null }} parts
 */

import { escapeHtml } from '../dom-escape.mjs';
export function buildOnboardingStageHtml({ title, leadHtml, bodyHtml, stepperIndex = null }) {
  const stepper =
    stepperIndex != null ? buildClinicalOnboardingStepperHtml(/** @type {1|2|3} */ (stepperIndex)) : '';
  return `
    <div class="clinical-onboarding-stage">
      <div class="clinical-onboarding-stage-inner">
        ${stepper}
        <h3 class="clinical-onboarding-title">${escapeHtml(title)}</h3>
        <div class="clinical-onboarding-lead">${leadHtml}</div>
        ${bodyHtml}
      </div>
    </div>`;
}

/**
 * @param {{ title?: string, message?: string, stepperIndex?: number|null }} [opts]
 */
export function buildOnboardingBootLoadingHtml(opts = {}) {
  const title = opts.title || 'Preparando R+';
  const message = opts.message || 'Iniciando R+…';
  const stepper =
    opts.stepperIndex != null
      ? buildClinicalOnboardingStepperHtml(/** @type {1|2|3} */ (opts.stepperIndex))
      : '';
  return `
    <div class="clinical-onboarding-stage">
      <div class="clinical-onboarding-stage-inner">
        ${stepper}
        <h3 class="clinical-onboarding-title">${escapeHtml(title)}</h3>
        <div class="clinical-onboard-boot-loader" role="status" aria-live="polite" aria-busy="true">
          <div class="clinical-onboard-boot-loader-row">
            <span class="clinical-onboard-boot-spinner" aria-hidden="true"></span>
            <p class="clinical-onboarding-status clinical-onboard-boot-progress-label">${escapeHtml(message)}</p>
          </div>
          <div class="clinical-onboard-boot-progress-track" aria-hidden="true">
            <div class="clinical-onboard-boot-progress-bar" style="width:3%"></div>
          </div>
        </div>
      </div>
    </div>`;
}

const MODE_NUBE_ICON = `<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;

const MODE_LOCAL_ICON = `<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`;

const MODE_LOGIN_ICON = `<svg class="clinical-onboard-mode-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;

/** HTML for Nube / offline / existing-account choice cards. */
export function buildSyncModeChoiceBodyHtml() {
  return `
        <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">
          <button type="button" class="clinical-onboard-mode-card clinical-onboard-mode-card--primary" data-sync-mode="nube">
            <span class="clinical-onboard-mode-card-head">
              ${MODE_NUBE_ICON}
              <span class="clinical-onboard-mode-card-title">Guardia con R+ Cloud</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Crea tu @usuario, elige rotación y sincroniza censo y equipos por <strong>Nube</strong>.</span>
          </button>
          <button type="button" class="clinical-onboard-mode-card" data-sync-mode="existing">
            <span class="clinical-onboard-mode-card-head">
              ${MODE_LOGIN_ICON}
              <span class="clinical-onboard-mode-card-title">Ya tengo cuenta</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Inicia sesión en Nube, recuerda este dispositivo y restaura tu censo y <strong>Mi rotación</strong>.</span>
          </button>
          <button type="button" class="clinical-onboard-mode-card" data-sync-mode="local">
            <span class="clinical-onboard-mode-card-head">
              ${MODE_LOCAL_ICON}
              <span class="clinical-onboard-mode-card-title">Solo este equipo</span>
            </span>
            <span class="clinical-onboard-mode-card-desc">Sin Nube: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.</span>
          </button>
        </div>`;
}
