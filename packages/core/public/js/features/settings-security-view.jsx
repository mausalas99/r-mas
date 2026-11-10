/**
 * Ajustes → «Seguridad» section body. Preact (Phase 3): same DOM, ids, classes and data-* hooks the static
 * partial had. UI only: the lock logic stays in platform/offline.mjs (`lockScreenNow`, `onIdleLockSelectChange`,
 * `changeIdleLockPin`) and fires through the same data-onclick / data-onchange hooks. Every control is
 * UNCONTROLLED and drawn once at boot: platform/offline.mjs sets `#settings-idle-lock`, settings-dropdown.mjs
 * (`syncSettingsStatusCards`) fills the status text/icon and un-hides `[data-settings-db-only]`,
 * profile-load-platform.mjs fills the data-folder path, button and web hint. settings-dropdown.mjs still turns
 * the <details> into a panel.
 */
import { render } from 'preact';
import { Button } from '../ui-kit/kit.jsx';

const HINT = 'settings-card__desc settings-acc-hint settings-acc-hint--tight';

function Card({ title, desc, descClass = HINT, descProps, children, ...rest }) {
  return (
    <div class="settings-card" {...rest}>
      <div class="settings-card__copy">
        <p class="settings-card__title">{title}</p>
        <p class={descClass} {...descProps}>{desc}</p>
      </div>
      <div class="settings-card__action">{children}</div>
    </div>
  );
}

export function SettingsSecurity() {
  return (
    <>
      <div class="settings-status-card" data-settings-security-status="">
        <span class="settings-status-icon" data-state="ok" aria-hidden="true"></span>
        <div class="settings-status-text">
          <p class="settings-status-title" data-settings-security-title="">Bloqueo de este equipo</p>
          <p class="settings-status-sub" data-settings-security-sub=""></p>
        </div>
        <Button primary class="wb-btn-sm" data-onclick="lockScreenNow">Bloquear ahora</Button>
      </div>
      <p class="settings-section-label">Bloqueo</p>
      <div class="settings-card-stack">
        <Card title="Bloquear tras" desc="Pide tu PIN tras ese tiempo sin uso.">
          <select id="settings-idle-lock" class="settings-acc-select settings-acc-select--compact" data-onchange="onIdleLockSelectChange" data-onchange-pass="value" aria-label="Bloqueo por inactividad">
            <option value="0">Nunca</option>
            <option value="5">5 minutos</option>
            <option value="10">10 minutos</option>
            <option value="30">30 minutos</option>
          </select>
        </Card>
        <Card title="PIN de bloqueo" desc="Se guarda solo aquí, nunca sale del equipo.">
          <Button class="wb-btn-secondary wb-btn-sm" data-onclick="changeIdleLockPin">Cambiar PIN…</Button>
        </Card>
      </div>
      <p class="settings-section-label">Datos en este equipo</p>
      <div class="settings-card-stack">
        <Card title="Revisar la bitácora" desc="Confirma que nadie la alteró." data-settings-db-only="" hidden>
          <Button class="wb-btn-secondary wb-btn-sm" data-onclick="verifyForensicAuditChain">Verificar</Button>
        </Card>
        <Card title="Carpeta de datos" desc="—" descClass="settings-card__desc settings-acc-path settings-acc-path--sm" descProps={{ id: 'settings-user-data-path', title: '' }}>
          <Button class="wb-btn-secondary wb-btn-sm" id="settings-open-userdata-btn" data-onclick="openUserDataFolderFromSettings">Abrir</Button>
        </Card>
      </div>
      <p id="settings-userdata-web-hint" class="settings-acc-hint settings-acc-hint--tight settings-acc-inline-help">Solo disponible en la aplicación de escritorio.</p>
    </>
  );
}

/** Draw the section into the empty #settings-security-body. Call before settings-dropdown.mjs builds the panels. */
export function mountSettingsSecurity() {
  const host = document.getElementById('settings-security-body');
  if (host && !host.firstElementChild) render(<SettingsSecurity />, host);
}
