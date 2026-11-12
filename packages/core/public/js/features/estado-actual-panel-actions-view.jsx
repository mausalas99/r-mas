/** Estado actual "¿Reemplazar evolución?" confirm card (Preact). Loaded lazily from estado-actual-panel-actions.mjs. */
import { render } from 'preact';

const METER_OFF = 'var(--color-border-strong, var(--color-border))';

function Meter({ signal, tone }) {
  const s = Math.max(0, Math.min(3, Number(signal) || 0));
  return (
    <span class="ui-rec-meter" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span class="ui-rec-meter-bar" style={'background:' + (i < s ? tone : METER_OFF)}></span>
      ))}
    </span>
  );
}

/** Conflict-modal wrapper + recommendation card (ui-recommendation.mjs markup) for a static message. */
export function ReplaceEvolucionCard({ altsOpen }) {
  const tone = 'var(--color-accent)';
  return (
    <div class="lab-conflict-modal ui-approval-modal">
      <div class="ui-rec-card">
        <div class="ui-rec-pad">
          <p class="ui-rec-title">¿Reemplazar evolución?</p>
          <div class="ui-rec-body">
            <p>La evolución ya tiene contenido. ¿Reemplazarlo con el estado actual?</p>
          </div>
        </div>
        <div class="ui-rec-drawer" style={'grid-template-rows:' + (altsOpen ? '1fr' : '0fr') + ';opacity:' + (altsOpen ? '1' : '0')}>
          <div class="ui-rec-drawer-inner">
            <p class="ui-rec-drawer-lead">Otras opciones</p>
            <button type="button" class="ui-rec-alt" data-rec-alt="keep">
              <Meter signal={1} tone="var(--color-ink-muted)" />
              <span class="ui-rec-alt-short">Conservar la evolución actual</span>
              <span class="ui-rec-alt-label">Sin cambios</span>
            </button>
          </div>
        </div>
        <div class="ui-rec-footer">
          <span class="ui-rec-confidence">
            <Meter signal={2} tone={tone} />
            <span class="ui-rec-confidence-label">Revisión humana</span>
          </span>
          <span class="ui-rec-actions">
            <button type="button" class="ui-rec-alts-btn" data-rec-alts="" aria-expanded={altsOpen ? 'true' : 'false'}>Alternativas</button>
            <button type="button" class="ui-rec-primary" data-rec-accept="">Reemplazar</button>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Repaint the backdrop's contents (it is a Preact root only while this card is open). */
export function paintReplaceEvolucionCard(backdrop, altsOpen) {
  render(<ReplaceEvolucionCard altsOpen={altsOpen} />, backdrop);
}
