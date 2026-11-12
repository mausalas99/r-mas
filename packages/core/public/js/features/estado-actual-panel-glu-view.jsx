/**
 * Glucometría row contents (Preact). Same markup as the string builders it replaced; the row element
 * itself and its wiring stay in estado-actual-panel-glu.mjs. Loaded lazily from there.
 */
import { render } from 'preact';
import { EXTRA_GLUCOMETRIA_TIMES } from './estado-actual-registro-defaults.mjs';

function RescueFields() {
  return (
    <>
      <label class="ea-glu-altered-toggle">
        <input type="checkbox" class="ea-glu-altered-input" data-ea-glu-altered="" aria-label="Glucometría alterada" />
        <span>Alterada</span>
      </label>
      <div class="ea-glu-rescue-wrap ea-glu-rescue-wrap--hidden" data-ea-glu-rescue-wrap="" hidden>
        <div class="ea-glu-rescue-box">
          <span class="ea-glu-rescue-box-title">Rescate</span>
          <div class="ea-glu-rescue-box-fields">
            <label class="ea-glu-rescue-field">
              <span class="ea-label">Unidades</span>
              <span class="ea-input-affix">
                <input type="number" class="ea-input ea-glu-rescue-input" data-ea-glu-rescue-units="" min="0" step="0.5" placeholder="0" inputmode="decimal" aria-label="Unidades de rescate" />
                <span class="ea-input-affix-suffix" aria-hidden="true">U</span>
              </span>
            </label>
            <label class="ea-glu-rescue-field">
              <span class="ea-label">DXT post-rescate</span>
              <span class="ea-input-affix">
                <input type="number" class="ea-input ea-glu-post-rescue-input" data-ea-glu-post-rescue-value="" min="0" step="1" placeholder="0" inputmode="numeric" aria-label="Destroxía post-rescate" />
                <span class="ea-input-affix-suffix" aria-hidden="true">mg/dL</span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

export function StandardGluRow({ standardTime }) {
  return (
    <>
      <span class="ea-glu-time-badge">{standardTime}</span>
      <input type="number" class="ea-input ea-glu-value-input" data-ea-glu-value="" min="0" step="1" placeholder="mg/dL" inputmode="numeric" aria-label={'Glucometría ' + standardTime} />
      <input type="hidden" data-ea-glu-time="" value={standardTime} />
      <div class="ea-glu-row-meta"><RescueFields /></div>
    </>
  );
}

export function ExtraGluRow() {
  return (
    <>
      <select class="ea-input ea-input--time ea-glu-time-input" data-ea-glu-time="" aria-label="Hora de glucometría">
        <option value=""></option>
        {EXTRA_GLUCOMETRIA_TIMES.map((t) => (
          <option value={t}>{t}</option>
        ))}
      </select>
      <input type="number" class="ea-input ea-glu-value-input" data-ea-glu-value="" min="0" step="1" placeholder="mg/dL" inputmode="numeric" aria-label="Glucometría" />
      <button type="button" class="ea-btn ea-btn--ghost ea-btn--icon ea-glu-remove-btn" data-ea-glu-remove="" title="Quitar fila" aria-label="Quitar glucometría">×</button>
      <div class="ea-glu-row-meta"><RescueFields /></div>
    </>
  );
}

/** Fill an empty row element (synchronous: Preact renders into a fresh container at once). */
export function renderGluRowContent(row, standardTime) {
  render(standardTime ? <StandardGluRow standardTime={standardTime} /> : <ExtraGluRow />, row);
}

/** Pump readings fall on the hour: pick 00:00–23:00, or type «14». One header above, so no per-field labels. */
const BOMBA_HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00');

export function BombaRow() {
  return (
    <>
      <select class="ea-input" data-ea-bomba-time="" aria-label="Hora">
        <option value="">—</option>
        {BOMBA_HOURS.map((t) => (
          <option value={t}>{t}</option>
        ))}
      </select>
      <input type="text" class="ea-input" data-ea-bomba-value="" inputmode="numeric" autocomplete="off" aria-label="Glucosa mg/dL" />
      <input type="text" class="ea-input" data-ea-bomba-units="" inputmode="decimal" autocomplete="off" aria-label="Unidades de insulina" />
      <button type="button" class="ea-io-remove" data-ea-bomba-remove="" title="Quitar" aria-label="Quitar lectura">×</button>
    </>
  );
}

export function renderBombaRowContent(row) {
  render(<BombaRow />, row);
}
