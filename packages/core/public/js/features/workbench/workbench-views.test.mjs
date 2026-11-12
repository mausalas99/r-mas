import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { escHtml } from '../../dom-escape.mjs';
import { buildCalendarGridDays } from './date-popover.mjs';

// Old string builders (what undo-toast.mjs, confirm.mjs and date-popover.mjs wrote before the port).
const DEFAULT_UNDO_LABEL = 'Deshacer';
function buildUndoToastHtml({ message = '', undoLabel = DEFAULT_UNDO_LABEL } = {}) {
  return (
    '<div class="wb-undo-toast om-rise" role="status">' +
    `<span class="wb-undo-toast-message">${escHtml(message)}</span>` +
    (undoLabel
      ? `<button type="button" class="wb-undo-toast-btn" data-wb-undo>${escHtml(undoLabel)}</button>`
      : '') +
    '<button type="button" class="wb-undo-toast-close" data-wb-undo-close aria-label="Cerrar aviso">×</button>' +
    '</div>'
  );
}


function confirmButtonClass(weight) {
  return weight === 'destructive' ? 'wb-btn wb-btn-danger' : 'wb-btn wb-btn-primary';
}

function buildConsequenceHtml(weight, consequenceLabel, consequenceText) {
  if (weight !== 'consequence' || !consequenceText) return '';
  const labelHtml = consequenceLabel
    ? `<span class="wb-confirm-consequence-label">${escHtml(consequenceLabel)}</span>`
    : '';
  return (
    '<div class="wb-confirm-consequence">' +
    labelHtml +
    `<span class="wb-confirm-consequence-text">${escHtml(consequenceText)}</span>` +
    '</div>'
  );
}

function buildSecondaryHtml(secondaryLabel) {
  return secondaryLabel
    ? `<button type="button" class="wb-btn wb-btn-ghost" data-wb-confirm-secondary>${escHtml(secondaryLabel)}</button>`
    : '';
}

function footerClassForWeight(weight) {
  return weight === 'consequence' ? 'wb-confirm-footer wb-confirm-footer--rail' : 'wb-confirm-footer';
}

function buildConfirmModalHtml(opts = {}) {
  const {
    weight,
    title = '',
    message = '',
    consequenceLabel = '',
    consequenceText = '',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    secondaryLabel = '',
    inputLabel = '',
    inputValue = '',
    inputType = 'text',
  } = opts;

  const confirmClass = confirmButtonClass(weight);
  const consequenceHtml = buildConsequenceHtml(weight, consequenceLabel, consequenceText);
  const secondaryHtml = buildSecondaryHtml(secondaryLabel);
  const footerClass = footerClassForWeight(weight);

  return (
    '<div class="wb-scrim" data-wb-confirm-backdrop>' +
    `<div class="wb-confirm-modal wb-confirm-modal--${weight}" role="dialog" aria-modal="true">` +
    '<div class="wb-confirm-body">' +
    `<span class="wb-confirm-title">${escHtml(title)}</span>` +
    consequenceHtml +
    (message ? `<span class="wb-confirm-message">${escHtml(message)}</span>` : '') +
    (inputLabel
      ? `<input type="${inputType === 'password' ? 'password' : 'text'}" class="wb-confirm-input" data-wb-confirm-input autocomplete="off" aria-label="${escHtml(inputLabel)}" value="${escHtml(inputValue)}">`
      : '') +
    '</div>' +
    `<div class="${footerClass}">` +
    secondaryHtml +
    '<div class="wb-confirm-footer-actions">' +
    `<button type="button" class="wb-btn wb-btn-secondary" data-wb-confirm-cancel>${escHtml(cancelLabel)}</button>` +
    `<button type="button" class="${confirmClass}" data-wb-confirm-ok>${escHtml(confirmLabel)}</button>` +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}


const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('es', { month: 'long' });
const toDateKey = (d) => d.toISOString().slice(0, 10);
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
function buildDatePopoverHtml(state) {
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


// Preact prints a bare data attribute as `data-x="true"` and leaves `>` raw in text; the old strings
// printed `data-x` and `&gt;`. Same DOM.
const norm = (h) => h.replace(/\/>/g, '>').replace(/&gt;/g, '>').replace(/(data-[\w-]+)="(?:true)?"/g, '$1');

const view = (name) => loadJsx(import.meta.url, `import { ${name} } from './${name === 'UndoToast' ? 'undo-toast' : name === 'ConfirmModal' ? 'confirm' : 'date-popover'}-view.jsx';
  export const html = (p) => renderToString(<${name} {...p} />);`);

test('UndoToast matches the old markup', async () => {
  const { html } = await view('UndoToast');
  for (const o of [{ message: 'Metformina oculto' }, { message: 'A & <b> "x"', undoLabel: 'Volver' }, { message: 'Sin botón', undoLabel: '' }]) {
    assert.equal(norm(html(o)), norm(buildUndoToastHtml(o)));
  }
});

test('ConfirmModal matches the old markup for every weight', async () => {
  const { html } = await view('ConfirmModal');
  const cases = [
    { weight: 'destructive', title: '¿Borrar "paciente"?', message: 'No se puede deshacer & <ya>' },
    { weight: 'consequence', title: 'Cerrar', consequenceLabel: 'Efecto', consequenceText: 'Se cierra el turno', confirmLabel: 'Sí', cancelLabel: 'No', secondaryLabel: 'Otra' },
    { weight: 'consequence', title: 'Sin etiqueta', consequenceText: 'Solo texto' },
    { weight: 'consequence', title: 'Clave', inputLabel: 'Clave "x"', inputValue: 'a&b', inputType: 'password' },
    { weight: 'destructive', title: 'Vacío' },
  ];
  for (const o of cases) assert.equal(norm(html(o)), norm(buildConfirmModalHtml(o)));
});

test('DatePopover matches the old markup', async () => {
  const { html } = await view('DatePopover');
  const today = new Date(2026, 10, 12, 12);
  const state = {
    monthDate: new Date(2026, 10, 1), selectedDate: new Date(2026, 10, 10, 12), today,
    hasData: (k) => k !== '2026-11-15', loadedRangeLabel: '1 nov – 12 nov & más',
    quickFilters: [{ id: 'hoy', label: 'Hoy' }, { id: 'ultimo-pase', label: 'Último pase', disabled: true }, { id: '7-dias', label: '7 días' }],
    activeQuickFilterId: 'hoy',
    labDays: [{ dayKey: '2026-11-10', label: '10 nov', meta: '3 labs' }, { dayKey: '2026-11-9', label: '9 nov & x', disabled: true }, { dayKey: '2026-11-8', label: '8 nov' }],
  };
  assert.equal(norm(html({ state })), norm(buildDatePopoverHtml(state)));
  const bare = { monthDate: new Date(2026, 1, 1), today };
  assert.equal(norm(html({ state: bare })), norm(buildDatePopoverHtml(bare)));
});
