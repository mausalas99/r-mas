/**
 * Encabezado del PDF de censo: ubicación (sala o torre) y equipo de guardia.
 */

export const CENSO_UBICACION_TORRE = 'torre';
export const CENSO_TORRE_HU_LABEL = 'Torre HU';
export const DEFAULT_CENSO_FIMI_LABEL = 'FIMI';

/** Etiqueta configurable para ingreso al servicio (antes «medicina interna» fijo). */
export function resolveCensoFimiLabel(settings) {
  return String(settings?.censoFimiLabel || '').trim() || DEFAULT_CENSO_FIMI_LABEL;
}

/** @param {Record<string, unknown>} settings */
function medTpl(settings) {
  var tpl = settings && settings.medicosPlantilla;
  return tpl && typeof tpl === 'object' ? /** @type {Record<string, string>} */ (tpl) : {};
}

/** @param {string} v */
function pick(v) {
  return String(v || '').trim();
}

/**
 * Normaliza valor guardado (incluye migración de censoTorre suelto).
 * @param {Record<string, unknown>} settings
 * @returns {string}
 */
export function normalizeCensoUbicacionValue(settings) {
  var st = settings || {};
  // Mi perfil sala is the real room; the Documentos pick only fills in when it is not a Sala/Torre.
  var mine = pick(st.clinicalSala);
  if (/^torre/i.test(mine)) return CENSO_UBICACION_TORRE;
  var m = /^sala\s+(.+)$/i.exec(mine);
  if (m) return m[1];
  var sala = pick(st.censoSala);
  if (sala) {
    if (/^torre/i.test(sala) || sala === CENSO_UBICACION_TORRE) return CENSO_UBICACION_TORRE;
    return sala;
  }
  if (pick(st.censoTorre)) return CENSO_UBICACION_TORRE;
  return '';
}

/**
 * @param {Record<string, unknown>} settings
 * @returns {string}
 */
export function formatCensoSalaTitleLine(settings) {
  var ubic = normalizeCensoUbicacionValue(settings);
  if (ubic === CENSO_UBICACION_TORRE) return 'Censo de ' + CENSO_TORRE_HU_LABEL;
  if (ubic) return 'Censo de Sala ' + ubic;
  return 'Censo de Sala';
}

/**
 * Saved slot wins even when empty (cleared on purpose); legacy only for never-saved profiles.
 * @param {Record<string, string>} tpl
 * @param {string} key
 * @param {unknown} legacy
 */
export function censoSlot(tpl, key, legacy) {
  return key in tpl ? pick(tpl[key]) : pick(legacy);
}

/**
 * @param {Record<string, unknown>} settings
 * @returns {{ r4: string, r2: string, r1a: string, r1b: string, maestro: string }}
 */
export function resolveCensoEquipoMembers(settings) {
  var st = settings || {};
  var tpl = medTpl(st);
  return {
    r4: censoSlot(tpl, 'r4', ''),
    r2: censoSlot(tpl, 'r2', st.residenteR2),
    r1a: censoSlot(tpl, 'r1a', st.residenteR1a || st.residenteR1),
    r1b: censoSlot(tpl, 'r1b', st.residenteR1b),
    maestro: censoSlot(tpl, 'profesor', st.profesorName),
  };
}

/**
 * @param {Record<string, unknown>} settings
 * @returns {string}
 */
export function formatCensoEquipoLine(settings) {
  var m = resolveCensoEquipoMembers(settings);
  return [m.maestro, m.r4, m.r2, m.r1a, m.r1b].filter(Boolean).join(' · ');
}

/**
 * @param {Record<string, unknown>} settings
 * @returns {{ titleLine: string, equipoLine: string, sala: string, torre: string, ubicacion: string }}
 */
export function buildCensoDocumentHeader(settings) {
  var ubic = normalizeCensoUbicacionValue(settings);
  var isTorre = ubic === CENSO_UBICACION_TORRE;
  return {
    titleLine: formatCensoSalaTitleLine(settings),
    equipoLine: formatCensoEquipoLine(settings),
    ubicacion: isTorre ? CENSO_TORRE_HU_LABEL : ubic,
    sala: isTorre ? '' : ubic,
    torre: isTorre ? CENSO_TORRE_HU_LABEL : '',
  };
}
