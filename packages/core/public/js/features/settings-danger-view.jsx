/**
 * Ajustes → «Zona de peligro» section body. Preact (Phase 3): same DOM, classes and data-* hooks the static
 * partial had. The wipe flow itself (openWipeDataModal, 3 steps) is untouched. settings-dropdown.mjs still turns
 * the <details> into a pinned-bottom panel, so Preact owns only the body's children, drawn once at boot.
 */
import { render } from 'preact';
import { Button } from '../ui-kit/kit.jsx';

export function SettingsDanger() {
  return (
    <>
      <p class="settings-acc-hint settings-acc-hint--danger settings-acc-lead">Estas acciones no se pueden deshacer. Haz un respaldo antes.</p>
      <div class="settings-card-stack">
        <div class="settings-card settings-card--danger">
          <div class="settings-card__copy">
            <p class="settings-card__title">Borrar datos de R+ en este equipo</p>
            <p class="settings-card__desc settings-acc-hint settings-acc-hint--tight">Pacientes, notas, labs y ajustes de esta computadora. Nube no cambia.</p>
          </div>
          <div class="settings-card__action">
            <Button class="wb-btn-danger-outline wb-btn-sm" data-onclick="openWipeDataModal">Borrar…</Button>
          </div>
        </div>
      </div>
      <Button class="wb-btn-secondary wb-btn-sm settings-danger-backup" data-settings-goto="settings-accordion-backup-sync">Ir a Respaldos primero</Button>
    </>
  );
}

/** Draw the section into the empty #settings-danger-body. Call before settings-dropdown.mjs builds the panels. */
export function mountSettingsDanger() {
  const host = document.getElementById('settings-danger-body');
  if (host && !host.firstElementChild) render(<SettingsDanger />, host);
}
