/**
 * Insulin rescue (rescate) helpers for glucometrías in Estado Actual.
 */

/**
 * @param {unknown} n
 * @returns {string}
 */
function num(n) {
  if (n == null || n === '') return '___';
  return String(n);
}

/**
 * @param {Array<{ value?: unknown, time?: string, rescueUnits?: unknown, postRescueValue?: unknown }> | null | undefined} glucometrias
 * @returns {string} Empty when no glucometrías in snapshot.
 */
export function formatInsulinRescatesClause(glucometrias) {
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

  return 'RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE';
}
