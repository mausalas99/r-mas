/**
 * SOAP buckets for the estado clínico glance: EA fields + receta activa.
 */
import { parseMedFieldItems } from '../estado-actual-med-ui.mjs';
import { MED_FIELD_KEYS } from '../estado-actual-data-constants.mjs';
import { bucketsFromRecetaItems } from '../estado-actual-meds-receta-buckets.mjs';
import { classifyMedicationSoapCategory } from '../../med-receta-soap.mjs';
import { rewriteAbxDisplayText } from '../../med-receta-dates.mjs';
import { glanceMedName } from './ea-glance-model.mjs';

function allActiveSelMap(items) {
  const map = {};
  (Array.isArray(items) ? items : []).forEach((it) => {
    if (it && it.id && !it.suspendido) map[it.id] = true;
  });
  return map;
}

function recetaBucketLines(recetaItems) {
  const items = Array.isArray(recetaItems) ? recetaItems : [];
  if (!items.length) return {};
  const joined = bucketsFromRecetaItems(
    items,
    allActiveSelMap(items),
    classifyMedicationSoapCategory,
  );
  const out = {};
  for (const key of MED_FIELD_KEYS) {
    const list = parseMedFieldItems(joined[key]);
    if (list.length) out[key] = list;
  }
  return out;
}

function dedupeMedLines(lines) {
  const seen = new Set();
  const out = [];
  (lines || []).forEach((line) => {
    const name = glanceMedName(line);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    seen.add(key);
    out.push(line);
  });
  return out;
}

function advanceAbxLines(lines, fechaActualizacion, recetaItems, refDate) {
  const fecha = fechaActualizacion != null ? String(fechaActualizacion).trim() : '';
  if (!lines || !lines.length) return lines;
  return lines.map((line) => rewriteAbxDisplayText(line, fecha, recetaItems, refDate));
}

/**
 * @param {{
 *   estadoClinico?: Record<string, unknown>,
 *   pendienteReceta?: Record<string, unknown>,
 *   recetaItems?: unknown[],
 *   fechaActualizacion?: string,
 *   refDate?: Date,
 * }} input
 * @returns {Record<string, string[]>}
 */
export function collectEaGlanceSoap(input) {
  const ec = (input && input.estadoClinico) || {};
  const pend = (input && input.pendienteReceta) || {};
  const fromReceta = recetaBucketLines(input && input.recetaItems);
  const soap = {};
  MED_FIELD_KEYS.forEach((key) => {
    const lines = dedupeMedLines([
      ...parseMedFieldItems(ec[key]),
      ...parseMedFieldItems(pend[key]),
      ...(fromReceta[key] || []),
    ]);
    if (lines.length) soap[key] = lines;
  });
  if (soap.abx) {
    soap.abx = advanceAbxLines(
      soap.abx,
      input && input.fechaActualizacion,
      input && input.recetaItems,
      input && input.refDate,
    );
  }
  return soap;
}
