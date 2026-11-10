/**
 * Ajustes → «Laboratorio» section body. Preact (Phase 3): same DOM, ids, classes and data-* hooks the static
 * partial had. The input is NOT controlled: profile-load-fields.mjs sets its value, onLabPortalUrlBlur (app-shell.mjs)
 * validates and saves it on blur, and lab-repo-portal-prompt.mjs / feature-hints.mjs find it by id. So it is drawn
 * once at boot and never re-rendered. settings-dropdown.mjs still turns the <details> into a panel.
 */
import { render } from 'preact';

export function SettingsLab() {
  return (
    <div class="settings-card-stack">
      <div class="settings-card">
        <div class="settings-card__copy">
          <p class="settings-card__title">Dirección del portal de laboratorio</p>
          <p class="settings-card__desc settings-acc-hint settings-acc-hint--tight">Se guarda solo en esta computadora. Necesaria para «Actualizar labs», la actualización masiva de equipo y el alta por registro.</p>
        </div>
        <div class="settings-card__action">
          <input id="settings-lab-portal-url" class="profile-input settings-acc-select" type="url" autocomplete="off" placeholder="https://…/index.aspx" aria-label="Dirección del portal de laboratorio" data-onblur="onLabPortalUrlBlur" />
        </div>
      </div>
    </div>
  );
}

/** Draw the section into the empty #settings-lab-body. Call before settings-dropdown.mjs builds the panels. */
export function mountSettingsLab() {
  const host = document.getElementById('settings-lab-body');
  if (host && !host.firstElementChild) render(<SettingsLab />, host);
}
