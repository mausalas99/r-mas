/**
 * Contexto `ui` para la guía clínica y navegación desde Manejo.
 */
import { setAtbSelectedId } from './manejo-atb-ui.mjs';
import { setPathologySelectedId } from './manejo-patologias.mjs';
import { navigateGuia } from './manejo-guia-state.mjs';

const MANEJO_SUBTAB_KEY = 'manejoSubtab';

/**
 * @param {Record<string, unknown>} api
 * @returns {Record<string, unknown>}
 */
export function createManejoGuiaContext(api) {
  return api && typeof api === 'object' ? api : {};
}

/**
 * @param {string} pathologyId
 * @param {{ renderManejo?: () => void }} deps
 */
export function openManejoPathology(pathologyId, deps) {
  deps = deps || {};
  setPathologySelectedId(pathologyId || '');
  try {
    sessionStorage.setItem(MANEJO_SUBTAB_KEY, 'guia');
  } catch (_ePath) {}
  navigateGuia({
    mode: 'patologia',
    view: 'lectura',
    entityId: String(pathologyId || ''),
  });
  if (typeof deps.renderManejo === 'function') deps.renderManejo();
}

/**
 * @param {string} drugId
 * @param {{ renderManejo?: () => void }} deps
 */
export function openManejoAtbDrug(drugId, deps) {
  deps = deps || {};
  setAtbSelectedId(drugId || '');
  try {
    sessionStorage.setItem(MANEJO_SUBTAB_KEY, 'guia');
  } catch (_eAtb) {}
  navigateGuia({ mode: 'atb', view: 'lectura', entityId: String(drugId || '') });
  if (typeof deps.renderManejo === 'function') deps.renderManejo();
}
