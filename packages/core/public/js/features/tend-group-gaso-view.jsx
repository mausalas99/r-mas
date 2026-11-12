/**
 * Tendencias group, extended gasometry: the dialog frame and the slot's empty / error note.
 * Preact: same DOM and classes the string code in tend-group-gaso-dialog.mjs and
 * tend-group-gaso-slot.mjs made. The metric chips, steps and summary stay DOM-built in the .mjs.
 */
import { render } from 'preact';

export function GasoExtDialog() {
  return (
    <div id="tend-gaso-ext-dialog" class="tend-gaso-ext-dialog" role="dialog" aria-modal="true" aria-labelledby="tend-gaso-ext-title">
      <div class="tend-gaso-ext-header">
        <div class="tend-gaso-ext-header-text">
          <h2 id="tend-gaso-ext-title">Gasometría extendida</h2>
          <p class="tend-gaso-ext-subtitle">Último estudio · interpretación ácido-base</p>
        </div>
        <div class="tend-gaso-ext-header-actions">
          <div class="tend-gaso-fio2-chip" role="group" aria-label="Fracción inspirada de oxígeno">
            <span class="tend-gaso-fio2-chip-label">FiO₂</span>
            <input type="number" class="tend-gaso-fio2-input" step="0.01" min="0.08" max="100" inputmode="decimal" aria-label="FiO₂ (0.21 o 21)" title="Fracción 0.21 o porcentaje 21" />
            <span class="tend-gaso-fio2-chip-hint">0.21 · 21%</span>
          </div>
        </div>
      </div>
      <div class="tend-gaso-extended-inner"></div>
    </div>
  );
}

export function GasoEmpty({ message, isError }) {
  const color = isError ? 'var(--error)' : 'var(--text-muted)';
  return <p class="tend-empty" style={'font-size:13px;color:' + color + ';'}>{message}</p>;
}

/** Unmount first, then wipe: the slot is also filled with plain DOM, so it may hold nodes Preact does not know. */
export function clearGasoSlot(slot) {
  render(null, slot);
  slot.replaceChildren();
}

export function drawGasoEmpty(slot, message, isError) {
  clearGasoSlot(slot);
  render(<GasoEmpty message={message} isError={isError} />, slot);
}

export function drawGasoDialog(backdrop) {
  render(<GasoExtDialog />, backdrop);
}
