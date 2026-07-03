/**
 * Insulin rescue (rescate) helpers for glucometrías in Estado Actual.
 */

/** @typedef {{ minMgDl: number, maxMgDl: number, units: number }} InsulinRescateTier */

var RESCATE_TIER_RE =
  /\b(\d{2,3})\s*[-–—]\s*(\d{2,3})\b(?:\s*(?:MG\/DL|MG\s*\/\s*DL|MGDL|DESTROX(?:IAS)?|GLUCOSA)?)?\s*[:\s,;]*(\d+(?:[.,]\d+)?)\s*(?:UI|U\.?I\.?|UNIDADES?)\b/gi;

/**
 * @param {unknown} n
 * @returns {string}
 */
function num(n) {
  if (n == null || n === '') return '___';
  return String(n);
}

/**
 * Criterio SOME típico: rango de glucosa + dosis (p. ej. "180-220 4UI", "221-250 MG/DL 6 UI").
 * @param {unknown} text
 * @returns {InsulinRescateTier[]}
 */
export function parseInsulinRescateCriteria(text) {
  var s = String(text || '');
  if (!s.trim()) return [];
  /** @type {InsulinRescateTier[]} */
  var tiers = [];
  var re = new RegExp(RESCATE_TIER_RE.source, 'gi');
  var m;
  while ((m = re.exec(s)) !== null) {
    var minMgDl = Number(m[1]);
    var maxMgDl = Number(m[2]);
    var units = Number(String(m[3]).replace(',', '.'));
    if (!Number.isFinite(minMgDl) || !Number.isFinite(maxMgDl) || !Number.isFinite(units)) continue;
    if (minMgDl >= maxMgDl || units <= 0) continue;
    tiers.push({ minMgDl: minMgDl, maxMgDl: maxMgDl, units: units });
  }
  return tiers;
}

/**
 * @param {{ pasteRaw?: unknown, items?: unknown[] } | null | undefined} block
 * @returns {string}
 */
function collectRecetaBlockText(block) {
  if (!block) return '';
  var parts = [String(block.pasteRaw || '')];
  if (Array.isArray(block.items)) {
    block.items.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      /** @type {any} */
      var it = item;
      parts.push(String(it.nombreRaw || ''));
      parts.push(String(it.dosisRaw || ''));
      parts.push(String(it.frecuenciaRaw || ''));
      parts.push(String(it.viaRaw || ''));
    });
  }
  return parts.join('\n');
}

/**
 * @param {{ pasteRaw?: unknown, items?: unknown[] } | null | undefined} block
 * @returns {InsulinRescateTier[]}
 */
export function insulinRescateCriteriaFromRecetaBlock(block) {
  return parseInsulinRescateCriteria(collectRecetaBlockText(block));
}

/**
 * SOME incluye escala de rescate (rango glucosa + UI), p. ej. en CUIDADOS o dosis de insulina.
 * @param {{ pasteRaw?: unknown, items?: unknown[] } | null | undefined} block
 * @returns {boolean}
 */
export function patientHasInsulinRescatesInReceta(block) {
  return insulinRescateCriteriaFromRecetaBlock(block).length > 0;
}

/**
 * @param {Array<{ value?: unknown, time?: string, rescueUnits?: unknown, postRescueValue?: unknown }> | null | undefined} glucometrias
 * @param {{ rescatesInSome?: boolean } | null | undefined} [opts]
 * @returns {string} Empty when no glucometrías in snapshot or no rescates in SOME (unless applied).
 */
export function formatInsulinRescatesClause(glucometrias, opts) {
  const glus = Array.isArray(glucometrias) ? glucometrias : [];
  const hasGlu = glus.some(function (g) {
    return g && g.value != null && g.value !== '';
  });
  if (!hasGlu) return '';

  const applied = glus.filter(function (g) {
    if (!g || typeof g !== 'object') return false;
    const u = Number(/** @type {{ rescueUnits?: unknown }} */ (g).rescueUnits);
    return Number.isFinite(u) && u > 0;
  });

  if (applied.length) {
    const parts = applied.map(function (g) {
      const u = num(/** @type {{ rescueUnits?: unknown }} */ (g).rescueUnits);
      const t =
        /** @type {{ time?: string }} */ (g).time != null && String(/** @type {{ time?: string }} */ (g).time).length
          ? ' @ ' + String(/** @type {{ time?: string }} */ (g).time)
          : '';
      const post = Number(/** @type {{ postRescueValue?: unknown }} */ (g).postRescueValue);
      const postSeg =
        Number.isFinite(post) && post > 0 ? ', DXT POST-RESCATE ' + post + ' MG/DL' : '';
      return u + ' U DE INSULINA RÁPIDA' + t + postSeg;
    });
    return 'RESCATES DE INSULINA APLICADOS (' + parts.join(', ') + ')';
  }

  opts = opts || {};
  if (opts.rescatesInSome === false) return '';
  return 'RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE';
}
