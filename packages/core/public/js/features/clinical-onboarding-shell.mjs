/**
 * Shared markup shell for first-run onboarding steps (sync mode, profile, session).
 */

const STEP_LABELS = ['Modo', 'Perfil', 'Equipo'];

/** "Paso 2 de 3 · Perfil" + segmented bar. Keep in sync with clinical-onboarding-early-boot.js. */
/** @param {1|2|3} activeIndex */
export function buildClinicalOnboardingStepperHtml(activeIndex) {
  const total = STEP_LABELS.length;
  const bars = STEP_LABELS.map((_, i) => {
    const n = i + 1;
    const cls = n < activeIndex ? 'is-done' : n === activeIndex ? 'is-active' : '';
    return `<span class="${cls}"></span>`;
  }).join('');
  return `<div class="clinical-onboarding-progress" role="progressbar" aria-label="Progreso del registro" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${activeIndex}">
          <span class="clinical-onboarding-progress-label">Paso ${activeIndex} de ${total} · ${escapeHtml(STEP_LABELS[activeIndex - 1])}</span>
          <span class="clinical-onboarding-progress-track">${bars}</span>
        </div>`;
}

/**
 * One question per screen: shows one `[data-substep]` fieldset of `form` at a time.
 * Enter / Siguiente advance; the form's own submit listeners run only on the last substep,
 * so call this before wiring them.
 * @param {HTMLFormElement} form
 * @param {(index: number) => string} [validate] error message for a substep, '' when ok
 */
export function wireOnboardingSubsteps(form, validate = () => '') {
  const steps = [...form.querySelectorAll('[data-substep]')];
  if (!steps.length || form._rpcSubstepsWired) return;
  form._rpcSubstepsWired = true;
  const submitBtn = form.querySelector('[type="submit"]');
  const backBtn = form.querySelector('[data-substep-back]');
  const errEl = form.querySelector('.clinical-registration-error');
  const progress = form
    .closest('.clinical-onboarding-stage')
    ?.querySelector('.clinical-onboarding-progress');
  const finalLabel = submitBtn?.textContent || '';
  let current = 0;
  const show = (i) => {
    current = i;
    steps.forEach((s, n) => {
      s.hidden = n !== i;
    });
    if (submitBtn) submitBtn.textContent = i === steps.length - 1 ? finalLabel : 'Siguiente';
    if (backBtn) backBtn.hidden = i === 0;
    progress?.style.setProperty('--substep-fill', String((i + 1) / steps.length));
    if (errEl) errEl.hidden = true;
    steps[i].querySelector('input, select')?.focus();
  };
  form.addEventListener('submit', (ev) => {
    if (current === steps.length - 1) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const msg = validate(current);
    if (msg && errEl) {
      errEl.textContent = msg;
      errEl.hidden = false;
      return;
    }
    show(current + 1);
  });
  backBtn?.addEventListener('click', () => show(Math.max(0, current - 1)));
  show(0);
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

const MODE_CHEVRON = `<svg class="clinical-onboard-mode-card-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

/** Keep in sync with buildSyncModeBodyHtml in clinical-onboarding-early-boot.js. */
function buildModeCardHtml(mode, icon, title, descHtml, primary = false) {
  return `
          <button type="button" class="clinical-onboard-mode-card${primary ? ' clinical-onboard-mode-card--primary' : ''}" data-sync-mode="${mode}">
            <span class="clinical-onboard-mode-card-icon-wrap">${icon}</span>
            <span class="clinical-onboard-mode-card-head">
              <span class="clinical-onboard-mode-card-title">${title}</span>
              <span class="clinical-onboard-mode-card-desc">${descHtml}</span>
            </span>
            ${MODE_CHEVRON}
          </button>`;
}

/** HTML for Nube / offline / existing-account choice cards. */
export function buildSyncModeChoiceBodyHtml() {
  return `
        <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">${
          buildModeCardHtml('nube', MODE_NUBE_ICON, 'Guardia con R+ Cloud',
            'Crea tu @usuario, elige rotación y sincroniza censo y equipos por <strong>Nube</strong>.', true) +
          buildModeCardHtml('existing', MODE_LOGIN_ICON, 'Ya tengo cuenta',
            'Inicia sesión en Nube, recuerda este dispositivo y restaura tu censo y <strong>Mi rotación</strong>.') +
          buildModeCardHtml('local', MODE_LOCAL_ICON, 'Solo este equipo',
            'Sin Nube: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.')
        }
        </div>`;
}
