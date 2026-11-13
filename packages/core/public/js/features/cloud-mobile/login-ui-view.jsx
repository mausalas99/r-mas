/**
 * R+ Móvil · Nube sign-in gate: the dialog's head and body (Entrar / Crear cuenta, Unirse al turno, and the
 * «Buscando tu sala» wait). Preact: same DOM, classes and data-* hooks the old HTML strings had. UI only:
 * clicks are wired in login-ui.mjs by the data-cloud-action hooks, tab switching by wireCloudAuthTabs.
 * Every draw replaces the section's contents, as innerHTML did.
 */
import { render } from 'preact';

/** The hint texts of clinical-settings.mjs (CLINICAL_LAN_*_HINT_HTML), as nodes. */
const UsernameHint = () => (
  <>
    <strong>Usuario (@usuario)</strong>
    {' — identificador único en minúsculas, sin espacios ni tildes: apellido + inicio del nombre, p. ej. '}
    <code>drmendoza</code>{' o '}<code>garcia</code>{'. No escribas «Dr. …» aquí.'}
  </>
);
const DisplayNameHint = () => (
  <>
    <strong>Nombre en guardia</strong>
    {' — cómo te ven en el censo y las entregas: p. ej. '}
    <code>Dr. Mendoza</code>{' o '}<code>R1 García</code>{'.'}
  </>
);

function AuthBody({ prefilled }) {
  const user = prefilled || undefined;
  return (
    <>
      <div class="cloud-sync-tabs" role="tablist" aria-label="Cuenta nube">
        <button type="button" class="cloud-sync-tab is-active" role="tab" aria-selected="true" data-cloud-tab="login">Entrar</button>
        <button type="button" class="cloud-sync-tab" role="tab" aria-selected="false" data-cloud-tab="register">Crear cuenta</button>
      </div>
      <div class="cloud-sync-tab-panels">
        <div class="cloud-sync-tab-panel" data-cloud-tab-panel="login" role="tabpanel">
          <div class="cloud-sync-field"><label>Usuario (@usuario)</label>
            <input type="text" class="profile-input" data-cloud-login-user="" autocomplete="username" placeholder="ej. drmendoza" spellcheck={false} value={user} /></div>
          <div class="cloud-sync-field"><label>Contraseña</label>
            <input type="password" class="profile-input" data-cloud-login-pass="" autocomplete="current-password" /></div>
          <button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="login">Entrar</button>
        </div>
        <div class="cloud-sync-tab-panel" data-cloud-tab-panel="register" role="tabpanel" hidden>
          <div class="cloud-sync-field"><label>Usuario (@usuario)</label>
            <input type="text" class="profile-input" data-cloud-reg-user="" autocomplete="username" placeholder="ej. drmendoza" spellcheck={false} value={user} />
            <p class="cloud-sync-hint"><UsernameHint /></p></div>
          <div class="cloud-sync-field"><label>Nombre en guardia</label>
            <input type="text" class="profile-input" data-cloud-reg-display="" autocomplete="name" placeholder="ej. Dr. Mendoza" />
            <p class="cloud-sync-hint"><DisplayNameHint /></p></div>
          <div class="cloud-sync-field"><label>Contraseña</label>
            <input type="password" class="profile-input" data-cloud-reg-pass="" autocomplete="new-password" /></div>
          <button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="register">Crear cuenta</button>
        </div>
      </div>
    </>
  );
}

const JoinBody = ({ prefilled }) => (
  <>
    <p class="cloud-sync-lead">Ingresa el código que compartió el equipo en escritorio.</p>
    <div class="cloud-sync-field"><label>Código de sala</label>
      <input type="text" class="profile-input" data-cloud-join-code="" placeholder="ABC123" value={prefilled || undefined} /></div>
    <button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="join-room">Unirse al turno</button>
  </>
);

/** @param {{ mode: 'auth' | 'join', prefilled?: string }} p */
export function LoginShell({ mode, prefilled }) {
  const join = mode === 'join';
  return (
    <>
      <div class="rpc-cloud-mobile-modal__head">
        <h4 id="rpc-cloud-mobile-modal-title" class="rpc-cloud-mobile-modal__title">{join ? 'Unirse al turno' : 'R+ Móvil · Nube'}</h4>
        <p class="rpc-cloud-mobile-modal__sub">{join ? 'Sesión iniciada — une tu iPad al turno.' : 'Inicia sesión para sincronizar el censo.'}</p>
      </div>
      <div class="rpc-cloud-mobile-modal__body">{join ? <JoinBody prefilled={prefilled} /> : <AuthBody prefilled={prefilled} />}</div>
    </>
  );
}

export const LoadingShell = () => (
  <>
    <div class="rpc-cloud-mobile-modal__head">
      <h4 class="rpc-cloud-mobile-modal__title">R+ Móvil</h4>
      <p class="rpc-cloud-mobile-modal__sub">Buscando tu sala nube…</p>
    </div>
    <div class="rpc-cloud-mobile-modal__body rpc-cloud-mobile-modal__body--center">
      <span class="rpc-cloud-mobile-spinner" aria-hidden="true"></span>
    </div>
  </>
);

/** Drop what Preact drew before and anything written by hand, then draw `vnode` into `section`. */
function mount(section, vnode) {
  render(null, section);
  section.textContent = '';
  render(vnode, section);
}

export const drawLoginShell = (section, mode, prefilled) => mount(section, <LoginShell mode={mode} prefilled={prefilled} />);
export const drawLoadingShell = (section) => mount(section, <LoadingShell />);
