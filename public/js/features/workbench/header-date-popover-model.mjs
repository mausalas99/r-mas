/**
 * Pure model for wiring the workbench calendar popover (date-popover.mjs) to
 * the header date. Builds the "Días con labs" quick-nav rows (mockup L262,
 * folded into the same 286px popover per plan) from the active patient's
 * parsed lab history, plus the hasData()/loadedRangeLabel the popover itself
 * expects — all pure functions, no DOM.
 */
import { groupLabHistoryByDay } from '../../lab-history-format.mjs';
import { buildLabsGlanceForDay } from '../patient-dashboard/labs-glance-model.mjs';

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

/**
 * Lab-history day keys are `YYYY-M-D` (no zero-padding, from `dayKeyFromLabSet`).
 * Converts one to the calendar's ISO `YYYY-MM-DD` key. Returns null for the
 * non-dated buckets ('Anterior' / 'unknown').
 * @param {string} dayKey
 */
export function dayKeyToIsoDate(dayKey) {
  const parts = String(dayKey || '').split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (![y, m, d].every(Number.isFinite)) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function shortDayLabel(dayKey) {
  const [y, m, d] = dayKey.split('-').map((p) => parseInt(p, 10));
  return DAY_LABEL_FORMATTER.format(new Date(y, m - 1, d)).replace('.', '');
}

/** Count of altered chips across a day's envíos (same model the Resumen labs card uses). */
function alteredCountForDay(dayKey, sets) {
  const glance = buildLabsGlanceForDay({ todayKey: dayKey, orderedSets: sets });
  return glance.envios.reduce((sum, e) => sum + e.groups.reduce((s, g) => s + g.chips.length, 0), 0);
}

/**
 * @param {{ sets: unknown[], todayIso: string }} params `sets` newest-first
 *   parsed lab history for one patient; `todayIso` today's date as `YYYY-MM-DD`.
 * @returns {{
 *   labDays: Array<{ dayKey: string, isoDate: string|null, label: string, meta: string, rawFecha: string }>,
 *   hasData: (isoKey: string) => boolean,
 *   loadedRangeLabel: string,
 * }}
 */
export function buildLabDaysForCalendar({ sets, todayIso } = {}) {
  const groups = groupLabHistoryByDay(sets || []).filter(
    (g) => g.dayKey !== 'Anterior' && g.dayKey !== 'unknown'
  );
  const isoDates = new Set();
  const labDays = groups.map((g) => {
    const iso = dayKeyToIsoDate(g.dayKey);
    if (iso) isoDates.add(iso);
    const isToday = !!iso && iso === todayIso;
    const shortLabel = shortDayLabel(g.dayKey);
    const alteredCount = alteredCountForDay(g.dayKey, sets);
    return {
      dayKey: g.dayKey,
      isoDate: iso,
      label: isToday ? `Hoy · ${shortLabel}` : shortLabel,
      meta: alteredCount > 0 ? `${alteredCount} alterado${alteredCount === 1 ? '' : 's'}` : 'sin alterados',
      rawFecha: g.sets && g.sets[0] ? g.sets[0].fecha : null,
    };
  });

  const hasData = (isoKey) => isoDates.has(isoKey);

  let loadedRangeLabel = '';
  if (groups.length) {
    const newest = shortDayLabel(groups[0].dayKey);
    const oldest = shortDayLabel(groups[groups.length - 1].dayKey);
    loadedRangeLabel = groups.length === 1 ? newest : `${oldest} – ${newest}`;
  }

  return { labDays, hasData, loadedRangeLabel };
}

/** Local (not UTC) `YYYY-MM-DD` key for a Date — matches the calendar's own day keys. */
export function isoDateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
