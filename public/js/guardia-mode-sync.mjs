/**
 * Keeps Modo Guardia state in sync between the LAN hub checkbox and the guardia board toggle.
 */
import { clinicalSessionContext } from './clinical-access-runtime.mjs';

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
    const hubCheck = document.getElementById('lan-hub-guardia-toggle');
    if (hubCheck) hubCheck.checked = active;

    const boardBtn = document.getElementById('btn-guardia-mode-toggle');
    if (boardBtn) {
      boardBtn.setAttribute('aria-pressed', String(active));
      boardBtn.classList.toggle('is-active', active);
      const label = boardBtn.querySelector('.guardia-mode-label');
      if (label) label.textContent = active ? 'Solo mis entregas' : 'Censo completo';
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
