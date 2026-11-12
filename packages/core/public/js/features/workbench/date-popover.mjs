/**
 * Workbench kit — calendar popover.
 * README 11b: 286px popover, 14px radius, modal shadow. 7-column day grid;
 * selected day teal fill, today gets a ring; days with no data are `ink-3`
 * and unclickable. Quick-filter chips: Hoy / Ayer / Último pase / 7 días.
 * The currently loaded date range is stated in mono below the grid.
 * Opens anchored to a header date element, closes on Esc, click-outside,
 * or day selection.
 */

/** @type {{ el: HTMLElement, onKeydown: (ev: KeyboardEvent) => void, onDocClick: (ev: MouseEvent) => void }|null} */
let activePopover = null;
/** Bumped on every close, so an open that is still loading its view knows it was cancelled. */
let openToken = 0;

/** @param {Date} d */
function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

/** @param {Date} d @param {number} n */
function addDays(d, n) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** @param {Date} d */
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Monday-first day-of-week index (0 = Monday .. 6 = Sunday). @param {Date} d */
function mondayIndex(d) {
  return (d.getDay() + 6) % 7;
}

/**
 * Builds the 42-cell (6-week) grid of dates covering `monthDate`'s month,
 * including the leading/trailing days from adjacent months.
 * @param {Date} monthDate any date within the target month
 */
export function buildCalendarGridDays(monthDate) {
  const first = startOfMonth(monthDate);
  const gridStart = addDays(first, -mondayIndex(first));
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    days.push({ date: d, inMonth: d.getMonth() === monthDate.getMonth() });
  }
  return days;
}

/**
 * Quick-filter definitions per README 11b. `resolve(today)` returns the
 * anchor Date for that filter; `lastPaseDate` is supplied by the caller
 * since "Último pase" depends on app state, not the calendar itself.
 * @param {{ lastPaseDate?: Date|null }} [ctx]
 */
export function buildDatePopoverQuickFilters(ctx = {}) {
  return [
    { id: 'hoy', label: 'Hoy', resolve: (today) => today },
    { id: 'ayer', label: 'Ayer', resolve: (today) => addDays(today, -1) },
    {
      id: 'ultimo-pase',
      label: 'Último pase',
      resolve: () => ctx.lastPaseDate || null,
      disabled: !ctx.lastPaseDate,
    },
    { id: '7-dias', label: '7 días', resolve: (today) => addDays(today, -7), isRange: true },
  ];
}

/** Force-close the active popover, if any. */
export function closeDatePopover() {
  openToken++;
  if (!activePopover) return;
  const { el, onKeydown, onDocClick } = activePopover;
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('mousedown', onDocClick);
  if (el.parentNode) el.parentNode.removeChild(el);
  activePopover = null;
}

/**
 * @param {HTMLElement} anchorEl the header date element to anchor to (left edge)
 * @param {{
 *   selectedDate?: Date|null,
 *   today?: Date,
 *   hasData?: (dateKey: string) => boolean,
 *   loadedRangeLabel?: string,
 *   quickFilters?: Array<{ id: string, label: string, disabled?: boolean, resolve?: (today: Date) => Date|null, isRange?: boolean }>,
 *   labDays?: Array<{ dayKey: string, label: string, meta?: string, disabled?: boolean }>,
 *   onSelectDay?: (dateKey: string) => void,
 *   onQuickFilter?: (id: string, resolvedDate: Date|null) => void,
 *   onSelectLabDay?: (dateKey: string) => void,
 * }} opts
 */
export async function openDatePopover(anchorEl, opts = {}) {
  if (!anchorEl || typeof document === 'undefined') return undefined;
  closeDatePopover();
  const token = openToken;
  const view = await import('./date-popover-view.jsx');
  if (token !== openToken) return undefined;

  const today = opts.today || new Date();
  const state = {
    monthDate: opts.selectedDate || today,
    selectedDate: opts.selectedDate || null,
    today,
    hasData: opts.hasData,
    loadedRangeLabel: opts.loadedRangeLabel,
    quickFilters: opts.quickFilters || [],
    activeQuickFilterId: null,
    labDays: opts.labDays || [],
  };

  const wrap = document.createElement('div');
  wrap.className = 'wb-date-popover-host';
  document.body.appendChild(wrap);

  function render() {
    view.drawDatePopover(wrap, {
      state,
      // The view takes the grid from here: importing date-popover.mjs would split it into its own boot chunk.
      days: buildCalendarGridDays(state.monthDate),
      onPrev: () => {
        state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() - 1, 1);
        render();
      },
      onNext: () => {
        state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + 1, 1);
        render();
      },
      onDay: (key) => {
        if (typeof opts.onSelectDay === 'function') opts.onSelectDay(key);
        closeDatePopover();
      },
      onQuick: (id) => {
        const filter = state.quickFilters.find((f) => f.id === id);
        const resolved = filter && typeof filter.resolve === 'function' ? filter.resolve(today) : null;
        if (typeof opts.onQuickFilter === 'function') opts.onQuickFilter(id, resolved);
        closeDatePopover();
      },
      onLabDay: (key) => {
        if (typeof opts.onSelectLabDay === 'function') opts.onSelectLabDay(key);
        closeDatePopover();
      },
    });
    positionPopover();
  }

  function positionPopover() {
    const rect = anchorEl.getBoundingClientRect();
    wrap.style.position = 'fixed';
    wrap.style.top = `${rect.bottom + 6}px`;
    wrap.style.left = `${rect.left}px`;
    wrap.style.zIndex = '1000';
  }

  render();

  const onKeydown = (ev) => {
    if (ev.key === 'Escape') closeDatePopover();
  };
  const onDocClick = (ev) => {
    if (!wrap.contains(ev.target) && ev.target !== anchorEl && !anchorEl.contains(ev.target)) {
      closeDatePopover();
    }
  };
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('mousedown', onDocClick);

  activePopover = { el: wrap, onKeydown, onDocClick };
  return wrap;
}
