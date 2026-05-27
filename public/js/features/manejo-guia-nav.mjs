import { navigateGuia } from './manejo-guia-state.mjs';

const MANEJO_SUBTAB_KEY = 'manejoSubtab';

function setManejoTabGuia() {
  try {
    sessionStorage.setItem(MANEJO_SUBTAB_KEY, 'guia');
  } catch (_e) {}
}

/**
 * @param {string} pathologyId
 * @param {{ render?: () => void }} [opts]
 */
export function openGuiaPatologia(pathologyId, opts) {
  opts = opts || {};
  setManejoTabGuia();
  navigateGuia({
    mode: 'patologia',
    view: 'lectura',
    entityId: String(pathologyId || ''),
  });
  if (typeof opts.render === 'function') opts.render();
}

/**
 * @param {string} protocolId
 * @param {string} [fromPathologyId]
 * @param {{ render?: () => void }} [opts]
 */
export function openGuiaInfusion(protocolId, fromPathologyId, opts) {
  opts = opts || {};
  setManejoTabGuia();
  navigateGuia({
    mode: 'infusion',
    view: 'lectura',
    entityId: String(protocolId || ''),
    fromPathologyId: fromPathologyId || '',
  });
  if (typeof opts.render === 'function') opts.render();
}

/**
 * @param {string} drugId
 * @param {string} [fromPathologyId]
 * @param {{ render?: () => void }} [opts]
 */
export function openGuiaAtb(drugId, fromPathologyId, opts) {
  opts = opts || {};
  setManejoTabGuia();
  navigateGuia({
    mode: 'atb',
    view: 'lectura',
    entityId: String(drugId || ''),
    fromPathologyId: fromPathologyId || '',
  });
  if (typeof opts.render === 'function') opts.render();
}
