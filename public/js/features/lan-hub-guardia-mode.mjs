/**
 * Guardia LAN hub UI: Modo Guardia toggle card (extracted from lan-sync.mjs).
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { setGuardiaMode } from '../guardia-mode-sync.mjs';

/**
 * @param {HTMLElement} root
 * @param {{ onModeChange?: () => void }} [opts]
 */
export function appendLanHubGuardiaModeCard(root, opts = {}) {
  const modoCard = document.createElement('div');
  modoCard.className = 'lan-connect-card lan-hub-modo-card';

  const modoLabel = document.createElement('label');
  modoLabel.className = 'lan-hub-modo-label';
  modoLabel.setAttribute('for', 'lan-hub-guardia-toggle');

  const modoCheck = document.createElement('input');
  modoCheck.type = 'checkbox';
  modoCheck.id = 'lan-hub-guardia-toggle';
  modoCheck.className = 'lan-hub-guardia-check';
  modoCheck.checked = !!clinicalSessionContext.guardiaMode;
  modoCheck.onchange = function () {
    setGuardiaMode(modoCheck.checked, { rerenderBoard: true });
    if (typeof opts.onModeChange === 'function') opts.onModeChange();
  };

  modoLabel.appendChild(modoCheck);
  modoLabel.appendChild(document.createTextNode(' Modo Guardia'));
  modoCard.appendChild(modoLabel);
  root.appendChild(modoCard);
}
