/**
 * Workbench kit — calendar popover.
 * README 11b: 286px popover, 14px radius, modal shadow. 7-column day grid;
 * selected day teal fill, today gets a ring; days with no data are `ink-3`
 * and unclickable. Quick-filter chips: Hoy / Ayer / Último pase / 7 días.
 * The currently loaded date range is stated in mono below the grid.
 * Opens anchored to a header date element, closes on Esc, click-outside,
 * or day selection.
 */
import { escHtml } from '../../dom-escape.mjs';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('es', { month: 'long' });

/** @type {{ el: HTMLElement, onKeydown: (ev: KeyboardEvent) => void, onDocClick: (ev: MouseEvent) => void }|null} */
let activePopover = null;

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

/**
 * Lab-history day keys come as `YYYY-M-D` (no zero-padding); the calendar's
 * own keys are ISO `YYYY-MM-DD`. Normalize both to the same comparable form
 * so a lab day row can be marked active against the selected calendar date.
 * @param {string} key
 */
function normalizeDayKeyForCompare(key) {
  return String(key)
    .split('-')
    .map((part) => String(parseInt(part, 10)))
    .join('-');
}

/**
 * README 11b calls out only the calendar itself; the "Días con labs" quick-nav
 * (mockup L262, right-hand panel) is folded into the same 286px popover per
 * plan instruction, one row per day with lab data for the active patient.
 * @param {Array<{ dayKey: string, label: string, meta?: string, disabled?: boolean }>} labDays
 * @param {string|null} activeKey day key (matching `dayKey`) to highlight, if any
 */
function buildDatePopoverLabDaysHtml(labDays, activeKey) {
  if (!labDays || !labDays.length) return '';
  const normalizedActiveKey = activeKey ? normalizeDayKeyForCompare(activeKey) : null;
  const rows = labDays
    .map((d) => {
      const classes = ['wb-date-popover-labday'];
      if (d.disabled) classes.push('wb-date-popover-labday--nodata');
      if (!d.disabled && normalizedActiveKey && normalizeDayKeyForCompare(d.dayKey) === normalizedActiveKey) {
        classes.push('wb-date-popover-labday--active');
      }
      return (
        `<button type="button" class="${classes.join(' ')}"` +
        (d.disabled ? ' disabled' : ` data-wb-date-labday="${escHtml(d.dayKey)}"`) +
        '>' +
        `<span class="wb-date-popover-labday-label">${escHtml(d.label)}</span>` +
        `<span class="wb-date-popover-labday-meta">${escHtml(d.meta || '')}</span>` +
        '</button>'
      );
    })
    .join('');
  return (
    '<div class="wb-date-popover-labdays">' +
    '<div class="wb-date-popover-labdays-head">Días con labs</div>' +
    '<div class="wb-date-popover-labdays-list">' +
    rows +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {{
 *   monthDate: Date,
 *   selectedDate?: Date|null,
 *   today?: Date,
 *   hasData?: (dateKey: string) => boolean,
 *   loadedRangeLabel?: string,
 *   quickFilters?: Array<{ id: string, label: string, disabled?: boolean }>,
 *   activeQuickFilterId?: string|null,
 *   labDays?: Array<{ dayKey: string, label: string, meta?: string, disabled?: boolean }>,
 * }} state
 */
export function buildDatePopoverHtml(state) {
  const {
    monthDate,
    selectedDate = null,
    today = new Date(),
    hasData = () => true,
    loadedRangeLabel = '',
    quickFilters = [],
    activeQuickFilterId = null,
    labDays = [],
  } = state;

  const todayKey = toDateKey(today);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  const headerHtml =
    '<div class="wb-date-popover-header">' +
    `<span class="wb-date-popover-month">${escHtml(capitalize(MONTH_FORMATTER.format(monthDate)) + ' ' + monthDate.getFullYear())}</span>` +
    '<div class="wb-date-popover-nav">' +
    '<button type="button" class="wb-date-popover-nav-btn" data-wb-date-prev aria-label="Mes anterior">‹</button>' +
    '<button type="button" class="wb-date-popover-nav-btn" data-wb-date-next aria-label="Mes siguiente">›</button>' +
    '</div>' +
    '</div>';

  const weekdaysHtml =
    '<div class="wb-date-popover-weekdays">' +
    WEEKDAY_LABELS.map((w) => `<span>${w}</span>`).join('') +
    '</div>';

  const days = buildCalendarGridDays(monthDate);
  const gridHtml =
    '<div class="wb-date-popover-grid">' +
    days
      .map(({ date, inMonth }) => {
        const key = toDateKey(date);
        const dayHasData = inMonth && hasData(key);
        const isToday = key === todayKey;
        const isSelected = key === selectedKey;
        const classes = ['wb-date-popover-day'];
        if (!inMonth || !dayHasData) classes.push('wb-date-popover-day--nodata');
        if (isToday) classes.push('wb-date-popover-day--today');
        if (isSelected) classes.push('wb-date-popover-day--selected');
        const clickable = inMonth && dayHasData;
        return (
          `<button type="button" class="${classes.join(' ')}"` +
          (clickable ? ` data-wb-date-day="${key}"` : ' disabled') +
          `>${date.getDate()}</button>`
        );
      })
      .join('') +
    '</div>';

  const chipsHtml = quickFilters.length
    ? '<div class="wb-date-popover-chips">' +
      quickFilters
        .map(
          (f) =>
            `<button type="button" class="wb-date-popover-chip${f.id === activeQuickFilterId ? ' wb-date-popover-chip--active' : ''}"` +
            (f.disabled ? ' disabled' : '') +
            ` data-wb-date-quick="${f.id}">${escHtml(f.label)}</button>`
        )
        .join('') +
      '</div>'
    : '';

  const labDaysHtml = buildDatePopoverLabDaysHtml(labDays, selectedKey);

  const footerHtml = loadedRangeLabel
    ? `<div class="wb-date-popover-footer"><span class="wb-date-popover-range">${escHtml(loadedRangeLabel)}</span></div>`
    : '';

  return (
    '<div class="wb-date-popover" role="dialog" aria-label="Calendario">' +
    headerHtml +
    weekdaysHtml +
    gridHtml +
    chipsHtml +
    labDaysHtml +
    footerHtml +
    '</div>'
  );
}

/** @param {string} s */
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Force-close the active popover, if any. */
export function closeDatePopover() {
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
export function openDatePopover(anchorEl, opts = {}) {
  if (!anchorEl || typeof document === 'undefined') return undefined;
  closeDatePopover();

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
    wrap.innerHTML = buildDatePopoverHtml(state);
    positionPopover();
    wireInteractions();
  }

  function positionPopover() {
    const rect = anchorEl.getBoundingClientRect();
    wrap.style.position = 'fixed';
    wrap.style.top = `${rect.bottom + 6}px`;
    wrap.style.left = `${rect.left}px`;
    wrap.style.zIndex = '1000';
  }

  function wireInteractions() {
    wrap.querySelector('[data-wb-date-prev]')?.addEventListener('click', () => {
      state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() - 1, 1);
      render();
    });
    wrap.querySelector('[data-wb-date-next]')?.addEventListener('click', () => {
      state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + 1, 1);
      render();
    });
    wrap.querySelectorAll('[data-wb-date-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-wb-date-day');
        if (typeof opts.onSelectDay === 'function') opts.onSelectDay(key);
        closeDatePopover();
      });
    });
    wrap.querySelectorAll('[data-wb-date-quick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-wb-date-quick');
        const filter = state.quickFilters.find((f) => f.id === id);
        const resolved = filter && typeof filter.resolve === 'function' ? filter.resolve(today) : null;
        if (typeof opts.onQuickFilter === 'function') opts.onQuickFilter(id, resolved);
        closeDatePopover();
      });
    });
    wrap.querySelectorAll('[data-wb-date-labday]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-wb-date-labday');
        if (typeof opts.onSelectLabDay === 'function') opts.onSelectLabDay(key);
        closeDatePopover();
      });
    });
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
