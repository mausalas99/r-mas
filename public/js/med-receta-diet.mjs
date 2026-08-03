import { trimStr } from './med-receta-util.mjs';

function normalizeNutrientText(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * SOME a veces cataloga nutrición enteral/suplemento bajo MEDICAMENTOS.
 * @param {{ nombreRaw?: unknown, viaRaw?: unknown, suspendido?: boolean }|null|undefined} item
 * @returns {boolean}
 */
export function isNutritionMedicationItem(item) {
  if (!item || item.suspendido) return false;
  var nombre = normalizeNutrientText(item.nombreRaw);
  if (!nombre) return false;
  if (/\bALIMENTACION\b/.test(nombre)) return true;
  if (/\bSUPLEMENTO\b/.test(nombre) && /\d+\s*ML\b/.test(nombre)) return true;
  var via = normalizeNutrientText(item.viaRaw);
  if (/\bSUPLEMENTO\b/.test(nombre) && /\b(?:GASTROSTOMIA|NASOGASTR|ENTER)/.test(via)) {
    return true;
  }
  return false;
}

/**
 * @param {{ nombreRaw?: unknown, viaRaw?: unknown, dosisRaw?: unknown, frecuenciaRaw?: unknown, suspendido?: boolean }} item
 * @param {number} [lineIndex]
 * @returns {{ id: string, descripcionRaw: string, detalleRaw: string, kcal: null, proteinG: null, suspendido: boolean }}
 */
export function nutritionMedItemToDieta(item, lineIndex) {
  var nombre = normalizeNutrientText(item && item.nombreRaw);
  var desc = /\bSUPLEMENTO\b/.test(nombre) ? 'SUPLEMENTO' : trimStr(item && item.nombreRaw);
  var detalle = [item && item.viaRaw, item && item.dosisRaw, item && item.frecuenciaRaw]
    .map(trimStr)
    .filter(Boolean)
    .join(' · ');
  return {
    id: 'dieta-nutri-' + Date.now().toString(36) + '-' + (lineIndex == null ? 0 : lineIndex),
    descripcionRaw: desc,
    detalleRaw: detalle,
    kcal: null,
    proteinG: null,
    suspendido: !!(item && item.suspendido),
  };
}

function parseProteinGrams(t) {
  var unit = '(?:GRS?|GRAMOS?|G)';
  var patterns = [
    new RegExp('(\\d+)\\s*' + unit + '\\s*(?:DE\\s+)?PROTEINAS?\\b'),
    new RegExp('PROTEINAS?\\s*(?:DE\\s+)?(\\d+)\\s*' + unit + '\\b'),
    new RegExp('(\\d+)\\s*' + unit + '\\s*(?:DE\\s+)?PROT\\b'),
  ];
  for (var i = 0; i < patterns.length; i += 1) {
    var m = t.match(patterns[i]);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export function extractDietNutrients(detalleRaw) {
  var t = normalizeNutrientText(trimStr(detalleRaw));
  var kcalM = t.match(/(\d+)\s*KCAL\b/);
  return {
    kcal: kcalM ? parseInt(kcalM[1], 10) : null,
    proteinG: parseProteinGrams(t),
  };
}

function isDietNutrientCell(s) {
  var t = normalizeNutrientText(trimStr(s));
  if (!t) return false;
  return /\d+\s*KCAL\b/.test(t) || /\bPROTEIN/.test(t) || /\d+\s*(?:GRS?|GRAMOS?|G)\s*(?:DE\s+)?PROT\b/.test(t);
}

/** SOME a veces colapsa la columna VIA vacía: kcal/prot quedan en cols[3]. */
export function normalizeDietaCols(cols) {
  var c = cols.slice();
  while (c.length < 7) c.push('');
  var via = trimStr(c[3]);
  var next = trimStr(c[4]);
  if (isDietNutrientCell(via) && !isDietNutrientCell(next)) {
    var tail = next;
    var freq = '';
    var nw = trimStr(c[5]);
    if (/^NW$/i.test(tail)) nw = tail;
    else if (tail) freq = tail;
    return [c[0], c[1], c[2], '', via, freq, nw];
  }
  return c;
}

/** Texto combinado de columnas SOME donde suelen ir kcal/proteína en filas DIETAS. */
export function dietNutrientBlobFromCols(cols) {
  var norm = normalizeDietaCols(cols);
  return [norm[2], norm[4], norm[5]].map(trimStr).filter(Boolean).join(' ');
}

/**
 * Descripción SOME cuando la columna tipo/dieta viene vacía o desplazada.
 * @param {string[]} cols
 * @param {string[]} norm
 */
export function resolveDietaDescripcionRaw(cols, norm) {
  var primary = trimStr(cols[2]);
  if (primary && !isDietNutrientCell(primary)) return primary;
  var candidates = [trimStr(norm[2]), trimStr(norm[3])];
  for (var i = 0; i < candidates.length; i += 1) {
    var c = candidates[i];
    if (c && !isDietNutrientCell(c)) return c;
  }
  return primary;
}

/**
 * Huella estable para comparar dieta SOME vs estado clínico confirmado.
 * @param {{ descripcion?: unknown, kcal?: unknown, proteinG?: unknown }} merged
 */
export function dietProposalFingerprint(merged) {
  return (
    String(merged && merged.descripcion != null ? merged.descripcion : '')
      .trim()
      .toUpperCase() +
    '|' +
    (merged && merged.kcal != null ? String(merged.kcal) : '') +
    '|' +
    (merged && merged.proteinG != null ? String(merged.proteinG) : '')
  );
}

export function mergeDietaItems(dietas) {
  var list = Array.isArray(dietas) ? dietas : [];
  var parts = [];
  var kcal = null;
  var proteinG = null;
  for (var i = 0; i < list.length; i += 1) {
    var d = list[i];
    if (!d) continue;
    var desc = trimStr(d.descripcionRaw);
    if (!desc) {
      var det = trimStr(d.detalleRaw);
      if (det && !isDietNutrientCell(det)) desc = det;
    }
    if (desc) parts.push(desc);
    if (d.kcal != null) kcal = d.kcal;
    if (d.proteinG != null) proteinG = d.proteinG;
  }
  return { descripcion: parts.join(' · '), kcal: kcal, proteinG: proteinG };
}

/**
 * Dietas SOME + nutrición mal catalogada como MEDICAMENTOS.
 * @param {{ dietas?: unknown[], items?: unknown[] }|null|undefined} block
 * @returns {unknown[]}
 */
export function collectDietasFromRecetaBlock(block) {
  var dietas = Array.isArray(block && block.dietas) ? block.dietas.slice() : [];
  var items = Array.isArray(block && block.items) ? block.items : [];
  for (var i = 0; i < items.length; i += 1) {
    if (isNutritionMedicationItem(items[i])) {
      dietas.push(nutritionMedItemToDieta(items[i], i));
    }
  }
  return dietas;
}

export function buildDietProposalText(merged) {
  var base = trimStr(merged && merged.descripcion);
  var bits = [];
  if (merged && merged.kcal != null) bits.push(String(merged.kcal) + ' kcal');
  if (merged && merged.proteinG != null) bits.push(String(merged.proteinG) + ' g prot');
  if (!bits.length) return base;
  if (!base) return bits.join(', ');
  return base + ' (' + bits.join(', ') + ')';
}
