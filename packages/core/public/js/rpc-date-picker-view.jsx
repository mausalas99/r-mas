/**
 * Date picker popover and the calendar icon of the date field. Preact: same DOM and classes the string
 * builders in rpc-date-picker.mjs made. The .mjs keeps the month/selection state, the positioning and the
 * click handlers; it passes them in. `today` comes in as an ISO string so nothing here reads the clock.
 */
import { render } from 'preact';

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

export function isoFromDate(dt) {
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

export function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/** @param {{ year: number, month: number, selectedIso: string, today: string, onNav: (delta: number) => void, onPick: (iso: string) => void, onClear: () => void, onToday: () => void }} p */
export function DatePopover({ year, month, selectedIso, today, onNav, onPick, onClear, onToday }) {
  const startPad = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(<span class="rpc-date-popover__day rpc-date-popover__day--pad" aria-hidden="true"></span>);
  for (let day = 1; day <= days; day++) {
    const iso = isoFromDate(new Date(year, month, day));
    let cls = 'rpc-date-popover__day';
    if (iso === selectedIso) cls += ' is-selected';
    if (iso === today) cls += ' is-today';
    cells.push(<button type="button" class={cls} data-iso={iso} onClick={(e) => { e.preventDefault(); onPick(iso); }}>{day}</button>);
  }
  return (
    <>
      <div class="rpc-date-popover__head">
        <button type="button" class="rpc-date-popover__nav" data-nav="-1" aria-label="Mes anterior" onClick={(e) => { e.preventDefault(); onNav(-1); }}>‹</button>
        <span class="rpc-date-popover__title">{MONTHS_ES[month] + ' ' + year}</span>
        <button type="button" class="rpc-date-popover__nav" data-nav="1" aria-label="Mes siguiente" onClick={(e) => { e.preventDefault(); onNav(1); }}>›</button>
      </div>
      <div class="rpc-date-popover__weekdays">{WEEKDAYS_ES.map((w) => <span>{w}</span>)}</div>
      <div class="rpc-date-popover__grid">{cells}</div>
      <div class="rpc-date-popover__foot">
        <button type="button" class="rpc-date-popover__foot-btn" data-action="clear" onClick={(e) => { e.preventDefault(); onClear(); }}>Borrar</button>
        <button type="button" class="rpc-date-popover__foot-btn rpc-date-popover__foot-btn--primary" data-action="today" onClick={(e) => { e.preventDefault(); onToday(); }}>Hoy</button>
      </div>
    </>
  );
}

export function drawDatePopover(host, props) {
  render(<DatePopover {...props} />, host);
}

export function clearDatePopover(host) {
  render(null, host);
}

export function drawCalendarIcon(host) {
  render(<CalendarIcon />, host);
}
