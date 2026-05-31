/**
 * Partial clinical dates: year only, year-month, or full day.
 * @typedef {{ precision: 'year'|'month'|'day', year: number, month?: number, day?: number }} FlexibleDate
 */

export function formatFlexibleDate(d) {
  if (!d || d.year == null || !Number.isFinite(Number(d.year))) return '';
  const y = Number(d.year);
  const p = d.precision || 'year';
  if (p === 'year') return String(y);
  const m = Number(d.month);
  if (p === 'month' && m >= 1 && m <= 12) {
    return String(m).padStart(2, '0') + '/' + y;
  }
  const day = Number(d.day);
  if (p === 'day' && m >= 1 && m <= 12 && day >= 1 && day <= 31) {
    return (
      String(day).padStart(2, '0') +
      '/' +
      String(m).padStart(2, '0') +
      '/' +
      y
    );
  }
  return String(y);
}

/**
 * @param {Partial<FlexibleDate>} raw
 * @returns {FlexibleDate|null}
 */
export function normalizeFlexibleDate(raw) {
  if (!raw || raw.year == null) return null;
  const year = Number(raw.year);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  const precision =
    raw.precision === 'day' || raw.precision === 'month' || raw.precision === 'year'
      ? raw.precision
      : 'year';
  const out = { precision, year };
  if (precision === 'month' || precision === 'day') {
    const month = Number(raw.month);
    if (Number.isFinite(month) && month >= 1 && month <= 12) out.month = month;
    else if (precision !== 'year') return { precision: 'year', year };
  }
  if (precision === 'day') {
    const day = Number(raw.day);
    if (Number.isFinite(day) && day >= 1 && day <= 31) out.day = day;
    else return { precision: 'month', year: out.year, month: out.month };
  }
  return out;
}

export function defaultFlexibleDate() {
  return { precision: 'year', year: new Date().getFullYear() };
}
