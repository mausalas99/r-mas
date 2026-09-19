/**
 * Balance hídrico acumulado from EA historial (lib-side; mirrors estado-actual-data).
 */

/** @param {unknown} iso */
function recordedAtToLocalYmd(iso) {
  if (!iso) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {unknown} ing
 * @param {unknown} io
 * @returns {number}
 */
function balanceFromIo(ing, io) {
  if (!io || typeof io !== 'object') return NaN;
  /** @type {any} */
  const row = io;
  const ingN = Number(ing != null ? ing : row.ing);
  if (!Number.isFinite(ingN)) return NaN;
  let egrTotal = null;
  if (row.egr != null && Number.isFinite(Number(row.egr))) {
    egrTotal = Number(row.egr);
  } else if (Array.isArray(row.egrParts)) {
    let sum = 0;
    let any = false;
    for (const part of row.egrParts) {
      if (!part || typeof part !== 'object') continue;
      const v = Number(/** @type {any} */ (part).value);
      if (!Number.isFinite(v)) continue;
      sum += v;
      any = true;
    }
    if (any) egrTotal = sum;
  }
  if (egrTotal == null || !Number.isFinite(egrTotal)) return NaN;
  return ingN - egrTotal;
}

/**
 * @param {unknown} monitoreoLike
 * @returns {{ historial: unknown[] } | null}
 */
function resolveMonitoreo(monitoreoLike) {
  if (monitoreoLike && typeof monitoreoLike === 'object' && Array.isArray(monitoreoLike.historial)) {
    return /** @type {{ historial: unknown[] }} */ (monitoreoLike);
  }
  if (
    monitoreoLike &&
    typeof monitoreoLike === 'object' &&
    monitoreoLike.monitoreo &&
    typeof monitoreoLike.monitoreo === 'object' &&
    Array.isArray(monitoreoLike.monitoreo.historial)
  ) {
    return /** @type {{ historial: unknown[] }} */ (monitoreoLike.monitoreo);
  }
  return null;
}

/**
 * Sum of per-entry balances across the full EA historial.
 * @param {unknown} monitoreoLike
 * @returns {number}
 */
export function sumBalanceAcumuladoMl(monitoreoLike) {
  const m = resolveMonitoreo(monitoreoLike);
  if (!m) return 0;
  let sum = 0;
  let any = false;
  for (const row of m.historial) {
    if (!row || typeof row !== 'object') continue;
    /** @type {any} */
    const r = row;
    const bal = balanceFromIo(r.io && r.io.ing, r.io || {});
    if (!Number.isFinite(bal)) continue;
    sum += bal;
    any = true;
  }
  return any ? sum : 0;
}

/**
 * Running balance acumulado by calendar day (local).
 * @param {unknown} monitoreoLike
 * @returns {Map<string, number>}
 */
export function balanceAcumuladoByDay(monitoreoLike) {
  /** @type {Map<string, number>} */
  const byDay = new Map();
  const m = resolveMonitoreo(monitoreoLike);
  if (!m) return byDay;
  const sorted = m.historial
    .filter((row) => row && typeof row === 'object')
    .slice()
    .sort((a, b) => {
      const ay = recordedAtToLocalYmd(/** @type {any} */ (a).recordedAt);
      const by = recordedAtToLocalYmd(/** @type {any} */ (b).recordedAt);
      return ay.localeCompare(by);
    });
  let running = 0;
  /** @type {string | null} */
  let lastDay = null;
  for (const row of sorted) {
    /** @type {any} */
    const r = row;
    const day = recordedAtToLocalYmd(r.recordedAt);
    if (!day) continue;
    const bal = balanceFromIo(r.io && r.io.ing, r.io || {});
    if (!Number.isFinite(bal)) continue;
    if (day !== lastDay) {
      running += bal;
      byDay.set(day, running);
      lastDay = day;
    } else {
      running += bal;
      byDay.set(day, running);
    }
  }
  return byDay;
}
