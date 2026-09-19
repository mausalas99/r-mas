/**
 * Encabezado del PDF de censo: equipo de guardia (HF es el único servicio,
 * no hay ubicación/sala que elegir).
 */

export const DEFAULT_CENSO_FIMI_LABEL = 'FIMI';
export const DEFAULT_CENSO_FIUX_LABEL = 'FIUX';

/** Etiqueta configurable para ingreso al servicio (antes «medicina interna» fijo). */
export function resolveCensoFimiLabel(settings) {
  return String(settings?.censoFimiLabel || '').trim() || DEFAULT_CENSO_FIMI_LABEL;
}

/** Etiqueta configurable para ingreso a urgencias (antes fija «FIUX»). */
export function resolveCensoFiuxLabel(settings) {
  return String(settings?.censoFiuxLabel || '').trim() || DEFAULT_CENSO_FIUX_LABEL;
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
 * HF es el único servicio — el título del censo ya no varía por sala/ubicación.
 * @param {Record<string, unknown>} _settings
 * @returns {string}
 */
export function formatCensoSalaTitleLine(_settings) {
  return 'Censo';
}

/**
 * Flat equipo member list (no rank labels) + department head name.
 * Falls back to the legacy rank-tagged fields so existing profiles don't
 * lose data silently after the switch away from the R1-R4 ladder.
 * @param {Record<string, unknown>} settings
 * @returns {{ equipo: string[], jefe: string }}
 */
export function resolveCensoEquipoMembers(settings) {
  var st = settings || {};
  var raw = pick(st.censoEquipo);
  var equipo = raw
    ? raw.split('\n').map(pick).filter(Boolean)
    : [];
  if (!equipo.length) {
    var tpl = medTpl(st);
    var legacyR1 = pick(st.residenteR1);
    equipo = [
      pick(st.residenteR2) || pick(tpl.r2),
      pick(st.residenteR1a) || pick(tpl.r1a) || legacyR1,
      pick(st.residenteR1b) || pick(tpl.r1b),
    ].filter(Boolean);
  }
  var jefe = pick(st.censoJefe) || pick(st.profesorName) || pick(medTpl(st).profesor);
  return { equipo: equipo, jefe: jefe };
}

/**
 * @param {Record<string, unknown>} settings
 * @returns {string}
 */
export function formatCensoEquipoLine(settings) {
  var m = resolveCensoEquipoMembers(settings);
  return m.equipo.concat(m.jefe ? [m.jefe] : []).filter(Boolean).join(' · ');
}

/**
 * @param {Record<string, unknown>} settings
 * @returns {{ titleLine: string, equipoLine: string }}
 */
export function buildCensoDocumentHeader(settings) {
  return {
    titleLine: formatCensoSalaTitleLine(settings),
    equipoLine: formatCensoEquipoLine(settings),
  };
}
