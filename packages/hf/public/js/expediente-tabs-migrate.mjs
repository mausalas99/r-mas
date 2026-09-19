/** Expediente tab migration helpers (extracted for complexity budget). */
import { isModeSala as isModeSalaSetting } from './mode-features.mjs';
import { isMobileWeb } from './mobile-web.mjs';
import { activePatientModeSala } from './features/active-patient-area.mjs';

function isModeSala(settings) {
  var perPatient = activePatientModeSala();
  return perPatient === null ? isModeSalaSetting(settings) : perPatient;
}

function migrateGranularMobile(granularTab, settings) {
  if (!isMobileWeb()) return null;
  if (granularTab === 'listado' || granularTab === 'recetaHu') {
    return isModeSala(settings) ? 'estadoActual' : 'resumen';
  }
  return null;
}

function migrateGranularSala(granularTab, settings) {
  if (granularTab === 'historia') return 'estadoActual';
  if (isModeSala(settings) && (granularTab === 'notas' || granularTab === 'indica')) {
    return 'estadoActual';
  }
  if (!isModeSala(settings) && granularTab === 'listado') return 'resumen';
  return null;
}

/** @param {string} granularTab @param {object} settings @param {Record<string, {tab:string, section?:string|null}>} granularMap */
export function migrateGranularInner(granularTab, settings, granularMap) {
  if (!granularTab) return 'resumen';
  // Datos lives in a modal — never persist as active inner tab.
  if (granularTab === 'datos') return 'resumen';
  if (granularTab === 'manejo') return isModeSala(settings) ? 'todo' : 'notas';
  // estadoActual and consultaIC each belong to only one mode's Clínico
  // section list (see granularToConsolidatedMap) but 'estadoActual' stays
  // keyed in the map for every mode, so on its own the map-presence check
  // below wouldn't catch a stale estadoActual/consultaIC tab surviving a
  // patient switch into the other mode — check explicitly before it.
  if (isModeSala(settings) && granularTab === 'consultaIC') return 'estadoActual';
  if (!isModeSala(settings) && granularTab === 'estadoActual') return 'consultaIC';
  if (!granularMap[granularTab]) return 'resumen';
  const mobile = migrateGranularMobile(granularTab, settings);
  if (mobile) return mobile;
  const sala = migrateGranularSala(granularTab, settings);
  if (sala) return sala;
  return granularTab;
}
