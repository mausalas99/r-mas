/** Expediente tab migration helpers (extracted for complexity budget). */
import { isModeSala } from './mode-features.mjs';
import { isMobileWeb } from './mobile-web.mjs';

function migrateGranularMobile(granularTab, settings) {
  if (!isMobileWeb()) return null;
  if (granularTab === 'listado' || granularTab === 'recetaHu') {
    return isModeSala(settings) ? 'estadoActual' : 'todo';
  }
  if (isModeSala(settings) && granularTab === 'vpo') return 'estadoActual';
  return null;
}

function migrateGranularSala(granularTab, settings) {
  if (granularTab === 'historia') return 'estadoActual';
  if (isModeSala(settings) && (granularTab === 'notas' || granularTab === 'indica')) {
    return 'estadoActual';
  }
  if (!isModeSala(settings) && granularTab === 'listado') return 'todo';
  return null;
}

/** @param {string} granularTab @param {object} settings @param {Record<string, {tab:string, section?:string|null}>} granularMap */
export function migrateGranularInner(granularTab, settings, granularMap) {
  if (!granularTab) return 'todo';
  // Datos lives in a modal — never persist as active inner tab.
  if (granularTab === 'datos') return 'todo';
  if (granularTab === 'manejo') return isModeSala(settings) ? 'todo' : 'notas';
  if (!granularMap[granularTab]) return 'todo';
  const mobile = migrateGranularMobile(granularTab, settings);
  if (mobile) return mobile;
  const sala = migrateGranularSala(granularTab, settings);
  if (sala) return sala;
  return granularTab;
}
