/**
 * Lab history bar pieces. Preact: same DOM the string builders in lab-panel-history.mjs and
 * lab-history-day-view.mjs made. The day <select> options and the mobile "Estudios recientes" hint.
 * The select value, the hint's class and every handler stay in lab-panel-history.mjs. Every draw
 * unmounts and empties the host first, so the DOM is rebuilt from scratch like the old `innerHTML`
 * swap (a stale `selected` on a reused <option> would otherwise survive).
 */
import { render } from 'preact';
import { daySelectValue } from '../lab-history-day-view.mjs';

export function LabHistoryDayOptions({ days, selectedDayKey }) {
  return (
    <>
      {(days || []).map((day) => {
        const key = day && day.dayKey != null ? String(day.dayKey) : '';
        return <option value={daySelectValue(key)} selected={key === selectedDayKey}>{key || 'Anterior'}</option>;
      })}
    </>
  );
}

export function LabMobileEmptyHint({ message }) {
  return (
    <>
      <span class="lab-mobile-reference-empty-title">Estudios recientes</span>
      <span class="lab-mobile-reference-empty-lead">{message}</span>
    </>
  );
}

function redraw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawLabHistoryDayOptions = (selectEl, days, selectedDayKey) =>
  redraw(selectEl, <LabHistoryDayOptions days={days} selectedDayKey={selectedDayKey} />);

export const drawLabMobileEmptyHint = (hintEl, message) => redraw(hintEl, <LabMobileEmptyHint message={message} />);
