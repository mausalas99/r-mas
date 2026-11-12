/**
 * Lab results card pieces: the hour-group header (hora + etiqueta) and the «Alterados» chips row.
 * Preact: same DOM the string builders in lab-results-card.mjs made. That file keeps the rules and
 * passes plain models. Every draw unmounts and empties the host first, so the DOM is rebuilt from
 * scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

export function LabHourHeader({ hora, label }) {
  return (
    <>
      {hora && <span class="lab-hour-time">{hora}</span>}
      {label && <span class="lab-hour-label">{label}</span>}
    </>
  );
}

/** `chips`: [{ label, value, critical, trend }]. */
export function LabAlteredChips({ chips }) {
  return (
    <>
      <span class="lab-altered-chips-lbl">Alterados</span>
      {chips.map((c) => (
        <span class={'lab-altered-chip' + (c.critical ? ' lab-altered-chip--critical' : '')} data-fit-chip=""
          title={c.critical ? 'Valor crítico' : undefined}>
          {c.label} <strong>{c.value + (c.trend ? ' ' + c.trend : '')}</strong>
        </span>
      ))}
      <span class="lab-altered-chip lab-altered-chip--more" data-fit-chip-more="" hidden />
    </>
  );
}

function redraw(host, vnode) {
  render(null, host);
  host.textContent = '';
  if (vnode) render(vnode, host);
}

export const drawLabHourHeader = (host, hora, label) => redraw(host, <LabHourHeader hora={hora} label={label} />);
export const drawLabAlteredChips = (host, chips) => redraw(host, chips.length ? <LabAlteredChips chips={chips} /> : null);
