/**
 * Workbench calendar popover, Preact. Same markup date-popover.mjs used to write as a string.
 */
import { render } from 'preact';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('es', { month: 'long' });

const toDateKey = (d) => d.toISOString().slice(0, 10);
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Lab-history keys are `YYYY-M-D`, calendar keys `YYYY-MM-DD`: compare them unpadded. */
const normalizeDayKeyForCompare = (key) => String(key).split('-').map((p) => String(parseInt(p, 10))).join('-');

function LabDays({ labDays, activeKey, onLabDay }) {
  if (!labDays || !labDays.length) return null;
  const active = activeKey ? normalizeDayKeyForCompare(activeKey) : null;
  return (
    <div class="wb-date-popover-labdays">
      <div class="wb-date-popover-labdays-head">Días con labs</div>
      <div class="wb-date-popover-labdays-list">
        {labDays.map((d) => {
          const classes = ['wb-date-popover-labday'];
          if (d.disabled) classes.push('wb-date-popover-labday--nodata');
          if (!d.disabled && active && normalizeDayKeyForCompare(d.dayKey) === active) classes.push('wb-date-popover-labday--active');
          return d.disabled ? (
            <button type="button" class={classes.join(' ')} disabled>
              <span class="wb-date-popover-labday-label">{d.label}</span>
              <span class="wb-date-popover-labday-meta">{d.meta || ''}</span>
            </button>
          ) : (
            <button type="button" class={classes.join(' ')} data-wb-date-labday={d.dayKey} onClick={() => onLabDay(d.dayKey)}>
              <span class="wb-date-popover-labday-label">{d.label}</span>
              <span class="wb-date-popover-labday-meta">{d.meta || ''}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @param {{ state: Record<string, any>, days: Array<{ date: Date, inMonth: boolean }>, onPrev?: () => void, onNext?: () => void,
 *   onDay?: (key: string) => void, onQuick?: (id: string) => void, onLabDay?: (key: string) => void }} p
 */
export function DatePopover({ state, days, onPrev, onNext, onDay, onQuick, onLabDay }) {
  const {
    monthDate, selectedDate = null, today = new Date(), hasData = () => true,
    loadedRangeLabel = '', quickFilters = [], activeQuickFilterId = null, labDays = [],
  } = state;
  const todayKey = toDateKey(today);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  return (
    <div class="wb-date-popover" role="dialog" aria-label="Calendario">
      <div class="wb-date-popover-header">
        <span class="wb-date-popover-month">{capitalize(MONTH_FORMATTER.format(monthDate)) + ' ' + monthDate.getFullYear()}</span>
        <div class="wb-date-popover-nav">
          <button type="button" class="wb-date-popover-nav-btn" data-wb-date-prev aria-label="Mes anterior" onClick={onPrev}>‹</button>
          <button type="button" class="wb-date-popover-nav-btn" data-wb-date-next aria-label="Mes siguiente" onClick={onNext}>›</button>
        </div>
      </div>
      <div class="wb-date-popover-weekdays">
        {WEEKDAY_LABELS.map((w) => <span>{w}</span>)}
      </div>
      <div class="wb-date-popover-grid">
        {days.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const dayHasData = inMonth && hasData(key);
          const classes = ['wb-date-popover-day'];
          if (!inMonth || !dayHasData) classes.push('wb-date-popover-day--nodata');
          if (key === todayKey) classes.push('wb-date-popover-day--today');
          if (key === selectedKey) classes.push('wb-date-popover-day--selected');
          return inMonth && dayHasData ? (
            <button type="button" class={classes.join(' ')} data-wb-date-day={key} onClick={() => onDay(key)}>{date.getDate()}</button>
          ) : (
            <button type="button" class={classes.join(' ')} disabled>{date.getDate()}</button>
          );
        })}
      </div>
      {quickFilters.length ? (
        <div class="wb-date-popover-chips">
          {quickFilters.map((f) => (
            <button type="button" class={`wb-date-popover-chip${f.id === activeQuickFilterId ? ' wb-date-popover-chip--active' : ''}`}
              disabled={f.disabled ? true : undefined} data-wb-date-quick={f.id} onClick={() => onQuick(f.id)}>{f.label}</button>
          ))}
        </div>
      ) : null}
      <LabDays labDays={labDays} activeKey={selectedKey} onLabDay={onLabDay} />
      {loadedRangeLabel ? <div class="wb-date-popover-footer"><span class="wb-date-popover-range">{loadedRangeLabel}</span></div> : null}
    </div>
  );
}

/** Draw (or redraw) the popover into `host`. */
export function drawDatePopover(host, props) {
  render(<DatePopover {...props} />, host);
}
