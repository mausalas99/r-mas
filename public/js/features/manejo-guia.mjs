/**
 * Guía clínica — shell (modos + índice / lectura).
 */
import {
  ensureManejoSubtabMigrated,
  getGuiaMode,
  getGuiaView,
  GUIA_MODES,
  setGuiaMode,
} from './manejo-guia-state.mjs';
import { renderGuiaPatologiaIndex, renderGuiaPatologiaReading } from './manejo-guia-patologia.mjs';
import { renderGuiaInfusionIndex, renderGuiaInfusionReading } from './manejo-guia-infusion.mjs';
import { renderGuiaAtbIndex, renderGuiaAtbReading } from './manejo-guia-atb.mjs';

var MODE_LABELS = {
  patologia: 'Patología',
  infusion: 'Infusión',
  atb: 'Antibiótico',
};

/**
 * @param {HTMLElement} panel
 * @param {object} ctx
 */
export function renderManejoGuia(panel, ctx) {
  ctx = ctx || {};
  if (!ctx.ui) {
    var err = document.createElement('p');
    err.className = 'manejo-hint';
    err.textContent = 'No se pudo cargar la guía clínica (contexto inválido).';
    panel.appendChild(err);
    return;
  }
  ensureManejoSubtabMigrated();
  while (panel.firstChild) panel.removeChild(panel.firstChild);

  var root = document.createElement('div');
  root.className = 'manejo-guia-root manejo-root';

  var modeBar = document.createElement('div');
  modeBar.className = 'manejo-guia-mode-bar';
  modeBar.setAttribute('role', 'tablist');
  modeBar.setAttribute('aria-label', 'Modo de guía clínica');

  var activeMode = getGuiaMode();
  GUIA_MODES.forEach(function (mode) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'manejo-guia-mode-btn' + (mode === activeMode ? ' manejo-guia-mode-btn--active' : '');
    btn.textContent = MODE_LABELS[mode] || mode;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', mode === activeMode ? 'true' : 'false');
    btn.addEventListener('click', function () {
      if (getGuiaMode() === mode) return;
      setGuiaMode(mode);
      (ctx.rerender || ctx.ui.renderManejo)();
    });
    modeBar.appendChild(btn);
  });
  root.appendChild(modeBar);

  var host = document.createElement('div');
  host.className = 'manejo-guia-host';
  root.appendChild(host);

  var view = getGuiaView();
  if (activeMode === 'patologia') {
    if (view === 'lectura') renderGuiaPatologiaReading(host, ctx);
    else renderGuiaPatologiaIndex(host, ctx);
  } else if (activeMode === 'infusion') {
    if (view === 'lectura') renderGuiaInfusionReading(host, ctx);
    else renderGuiaInfusionIndex(host, ctx);
  } else if (activeMode === 'atb') {
    if (view === 'lectura') renderGuiaAtbReading(host, ctx);
    else renderGuiaAtbIndex(host, ctx);
  }

  panel.appendChild(root);
}
