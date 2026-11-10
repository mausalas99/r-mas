/**
 * Ajustes → «Aplicación» section body. Preact (Phase 3): same DOM, ids, classes and data-* hooks the static
 * partial had. UI only: update logic stays in its owners (`checkForAppUpdates`, `setUpdateChannel`,
 * `setUpdateTelemetryEnabled`, `checkForRepairUpdate`; the downgrade select and buttons are wired by id).
 * Every control is UNCONTROLLED and drawn once at boot; other modules fill version, status text, channel,
 * telemetry checkbox and the downgrade list, and un-hide `#settings-downgrade-section`.
 * settings-dropdown.mjs still turns the <details> into a panel.
 */
import { render } from 'preact';
import { Button } from '../ui-kit/kit.jsx';

const HINT = 'settings-card__desc settings-acc-hint settings-acc-hint--tight';

function Card({ title, desc, cls = '', children }) {
  return (
    <div class={`settings-card${cls}`}>
      <div class="settings-card__copy">
        <p class="settings-card__title">{title}</p>
        {desc && <p class={HINT}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const Action = ({ children }) => <div class="settings-card__action">{children}</div>;

export function SettingsApp() {
  return (
    <>
      <div class="settings-status-card" data-settings-app-status="">
        <span class="settings-status-icon" data-state="ok" aria-hidden="true"></span>
        <div class="settings-status-text">
          <p class="settings-status-title">R+ <span class="settings-acc-version" id="settings-app-version">—</span></p>
          <p class="settings-status-sub" data-settings-app-sub=""></p>
        </div>
        <Button primary class="wb-btn-sm" id="settings-check-updates-btn" data-onclick="checkForAppUpdates" data-i18n="settings.checkUpdates">Buscar actualizaciones…</Button>
      </div>
      <p class="settings-section-label">Actualizaciones</p>
      <div class="settings-card-stack">
        <Card title="Canal de actualizaciones" desc={<><strong>Pre-releases</strong> incluye borradores de GitHub; <strong>Estable</strong> solo versiones oficiales.</>}>
          <Action>
            <select id="rpc-update-channel" aria-label="Canal de actualizaciones" class="settings-acc-select settings-acc-select--compact" data-onchange="setUpdateChannel" data-onchange-pass="value">
              <option value="estable">Estable</option>
              <option value="beta">Pre-releases</option>
            </select>
          </Action>
        </Card>
        <Card cls=" settings-card--toggle" title="Enviar telemetría anónima de actualización" desc={<>Solo versión, resultado y plataforma. <strong>No</strong> incluye datos clínicos. Activado por defecto.</>}>
          <label class="settings-card__action settings-card__toggle-label" for="rpc-update-telemetry-toggle">
            <input type="checkbox" class="settings-card__toggle" id="rpc-update-telemetry-toggle" aria-label="Enviar telemetría anónima de actualización" data-onchange="setUpdateTelemetryEnabled" data-onchange-pass="checked" />
          </label>
        </Card>
      </div>
      <p class="settings-section-label">Si algo falla</p>
      <div class="settings-card-stack">
        <Card title="Reinstalar esta versión" desc="Vuelve a bajar el instalador. Tus datos se quedan.">
          <Action>
            <Button class="wb-btn-secondary wb-btn-sm" id="settings-repair-update-btn" data-onclick="checkForRepairUpdate">Reinstalar…</Button>
          </Action>
        </Card>
      </div>
      <div id="settings-downgrade-section" class="settings-downgrade-section" hidden>
        <p class="settings-section-label">Restaurar versión estable</p>
        <p id="settings-downgrade-hint" class="settings-acc-hint settings-acc-hint--tight settings-acc-lead">Si la versión actual falla, restaura una estable anterior. Tus datos locales no se borran.</p>
        <div class="settings-card-stack">
          <Card title="Versión estable">
            <Action>
              <select id="rpc-stable-downgrade-select" aria-label="Versión estable" class="settings-acc-select settings-acc-select--compact"></select>
            </Action>
          </Card>
          <Card title="Restaurar versión seleccionada">
            <Action>
              <Button class="wb-btn-secondary wb-btn-sm" id="settings-downgrade-stable-btn">Restaurar versión seleccionada…</Button>
            </Action>
          </Card>
          <Card title="Abrir instalador en GitHub">
            <Action>
              <Button class="wb-btn-secondary wb-btn-sm" id="settings-downgrade-github-btn">Abrir instalador en GitHub…</Button>
            </Action>
          </Card>
        </div>
      </div>
      <p id="settings-updates-hint" class="settings-acc-hint settings-acc-hint--tight settings-acc-inline-help">También en el menú de la aplicación (Mac: R+, Windows: Aplicación).</p>
    </>
  );
}

/** Draw the section into the empty #settings-app-body. Call before settings-dropdown.mjs builds the panels. */
export function mountSettingsApp() {
  const host = document.getElementById('settings-app-body');
  if (host && !host.firstElementChild) render(<SettingsApp />, host);
}
