/**
 * Keeps censo filter state in sync with the guardia board toggle.
 */
import { clinicalSessionContext } from './clinical-access-runtime.mjs';

const GUARDIA_MODE_LABEL_OFF = 'Censo completo';
const GUARDIA_MODE_LABEL_ON = 'Solo mis entregas';
const GUARDIA_MODE_TOGGLE_TITLE =
  'Filtra el censo: todos los pacientes de tu alcance o solo tus entregas recibidas.';

/**
 * @param {boolean} active
 * @param {{ rerenderBoard?: boolean, settings?: Record<string, unknown>|null, renderGuardiaBoard?: (settings: Record<string, unknown>|null|undefined) => void }} [opts]
 */
export function setGuardiaMode(active, opts = {}) {
  clinicalSessionContext.guardiaMode = !!active;
  syncGuardiaModeUI(opts);
}

/**
 * @param {{ rerenderBoard?: boolean, settings?: Record<string, unknown>|null, renderGuardiaBoard?: (settings: Record<string, unknown>|null|undefined) => void }} [opts]
 */
export function syncGuardiaModeUI(opts = {}) {
  const active = !!clinicalSessionContext.guardiaMode;

  if (typeof document !== 'undefined') {
    const boardBtn = document.getElementById('btn-guardia-mode-toggle');
    if (boardBtn) {
      boardBtn.setAttribute('aria-pressed', String(active));
      boardBtn.setAttribute('title', GUARDIA_MODE_TOGGLE_TITLE);
      boardBtn.classList.toggle('is-active', active);
      const label = boardBtn.querySelector('.guardia-mode-label');
      if (label) label.textContent = active ? GUARDIA_MODE_LABEL_ON : GUARDIA_MODE_LABEL_OFF;
    }
  }

  if (opts.rerenderBoard) {
    const render = opts.renderGuardiaBoard;
    if (typeof render === 'function') {
      render(opts.settings);
      return;
    }
    if (typeof globalThis.renderGuardiaBoard === 'function') {
      let settings = opts.settings;
      if (!settings) {
        try {
          settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
        } catch (_e) {
          settings = {};
        }
      }
      globalThis.renderGuardiaBoard(settings);
    }
  }
}

export function toggleGuardiaMode(opts = {}) {
  setGuardiaMode(!clinicalSessionContext.guardiaMode, { ...opts, rerenderBoard: true });
}
