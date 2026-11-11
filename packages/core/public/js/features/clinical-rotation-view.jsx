/**
 * Incoming strip (guardia board, preview window before a rotation takes effect). Preact: same DOM and
 * classes the template in clinical-rotation.mjs made. That file keeps the lock rule (`locked`, passed in),
 * the toast and the click handlers it attaches to each chip after a draw.
 */
import { render } from 'preact';

/** @param {{ id: string, effectiveAt: string, bed: string, dx: string, locked: boolean }} p */
function Chip({ id, effectiveAt, bed, dx, locked }) {
  return (
    <button type="button" class="guardia-incoming-chip" data-patient-id={id} data-effective-at={effectiveAt}
      aria-label={`Paciente entrante ${bed}, ${dx}${locked ? ', bloqueado hasta vigencia' : ''}`}>
      <span class="guardia-incoming-chip-bed">{bed}</span>
      <span class="guardia-incoming-chip-dx">{dx}</span>
    </button>
  );
}

/** @param {{ chips: Parameters<typeof Chip>[0][] }} p */
export function IncomingStrip({ chips }) {
  return (
    <details class="guardia-incoming-details" open>
      <summary class="guardia-incoming-summary">Incoming <span class="guardia-incoming-count">{chips.length}</span></summary>
      <p class="guardia-incoming-hint">Vista previa de entregas — el expediente se abre al llegar la fecha de vigencia.</p>
      <div class="guardia-incoming-chips" role="list">{chips.map((c) => <Chip {...c} />)}</div>
    </details>
  );
}

/** Repaint `host` with the strip, or empty it when there are no chips. Chips are rebuilt every time. */
export function drawIncomingStrip(host, chips) {
  render(null, host);
  host.replaceChildren();
  if (chips.length) render(<IncomingStrip chips={chips} />, host);
}
