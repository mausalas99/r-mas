/**
 * Conexión (Nube) panel shell: header or status hero + chain, then the signed-out account card or the
 * signed-in status sheet and its hidden sub-views. Preact: same DOM, classes, ids and data-* hooks the
 * string builders in panel-conexion-html.mjs / -views.mjs / panel-steps-html.mjs made. Those files keep
 * the data (room, status, identity, flags); this one only draws. The panel edits the DOM in place after a
 * draw (view switching, mounted Equipo/Admin hosts), so each draw unmounts first and repaints from scratch.
 */
import { render } from 'preact';

const SVG = { width: '26', height: '26', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };

const HERO_ICON = {
  ok: <path d="m5 12 5 5 9-10" />,
  info: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" /></>,
  warn: <><path d="M12 9v4" /><path d="M12 16.5h.01" /><path d="M10.3 4.5 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.5a2 2 0 0 0-3.4 0Z" /></>,
  error: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.5h.01" /></>,
};

const CHAIN_ICON = {
  Internet: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  Sesión: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.3-9.3M17 6l3 3" /></>,
  Sala: <><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" /><path d="M2 21h20" /><path d="M14 12h.01" /></>,
  'En vivo': <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
};

/** @typedef {{ label: string, state: string, detail: string }} ChainStep */
/** @typedef {{ signedOut: true } | { signedOut?: false, iconState: string, title: string, subline: string }} HeroState */

/** @param {{ steps: ChainStep[] }} p 4-step chain: a link into a step is dashed when either end is not ok. */
function Chain({ steps }) {
  if (!steps.length) return null;
  return (
    <div class="cloud-sync-chain" data-cloud-chain="" aria-label="Estado de conexión">
      {steps.map((step, i) => [
        i > 0 ? <span class={`cloud-sync-chain-link${step.state !== 'ok' || steps[i - 1].state !== 'ok' ? ' is-broken' : ''}${step.state === 'off' ? ' is-waiting' : ''}`}></span> : null,
        <div class="cloud-sync-chain-step" data-state={step.state}>
          <div class="cloud-sync-chain-bubble">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{CHAIN_ICON[step.label] || CHAIN_ICON.Internet}</svg>
          </div>
          <div class="cloud-sync-chain-label">{step.label}</div>
          <div class="cloud-sync-chain-detail">{step.detail}</div>
        </div>,
      ])}
    </div>
  );
}

/** @param {{ hero: HeroState, steps: ChainStep[] }} p Status hero + chain, wrapped for in-place refresh. */
export function HeroBlock({ hero, steps }) {
  return (
    <div class="cloud-sync-hero-block" data-cloud-hero-block="">
      {hero.signedOut ? (
        <div class="cloud-sync-hero" data-cloud-hero="" data-signed-out="">
          <div class="cloud-sync-hero-icon" data-state="warn"><svg {...SVG}>{HERO_ICON.warn}</svg></div>
          <div class="cloud-sync-hero-text">
            <p class="cloud-sync-hero-title">Sin sesión</p>
            <p class="cloud-sync-hero-sub">Tus cambios se guardan en este equipo, pero no llegan a tu sala.</p>
          </div>
        </div>
      ) : (
        <div class="cloud-sync-hero" data-cloud-hero="" data-state={hero.iconState}>
          <p class="cloud-sync-hero-title">{hero.title}</p>
          {hero.subline ? <p class="cloud-sync-hero-sub">{hero.subline}</p> : null}
          <button type="button" class="cloud-sync-btn cloud-sync-hero-sync" data-cloud-action="sync-now">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{HERO_ICON.info}</svg>
            Sincronizar ahora
          </button>
        </div>
      )}
      <Chain steps={steps} />
    </div>
  );
}

// ── Signed out ──────────────────────────────────────────────────────────────────────────────────────

function RememberSwitch({ attr, checked }) {
  const id = `cloud-sync-${attr}`;
  const hook = { [`data-cloud-${attr}`]: '' };
  return (
    <div class="cloud-sync-auth-remember">
      <label class="rpc-switch">
        <input type="checkbox" id={id} class="rpc-switch-input" role="switch" {...hook} checked={checked} aria-labelledby={`${id}-lbl`} />
        <span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span>
      </label>
      <span id={`${id}-lbl`}>Recuérdame en este dispositivo <span class="cloud-sync-auth-hint">· no en una Mac compartida</span></span>
    </div>
  );
}

function AuthField({ id, label, hint, type = 'text', ...attrs }) {
  const hook = { [`data-cloud-${id}`]: '' };
  return (
    <div class="cloud-sync-field">
      <label for={`cloud-sync-${id}`}>{label}</label>
      <input id={`cloud-sync-${id}`} type={type} class="profile-input" {...hook} {...attrs} />
      {hint ? <p class="cloud-sync-auth-hint">{hint}</p> : null}
    </div>
  );
}

function AuthHead({ title, back }) {
  return (
    <div class="cloud-sync-auth-head">
      <span class="cloud-sync-avatar cloud-sync-avatar--empty" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
      </span>
      <h4 class="cloud-sync-auth-title">{title}</h4>
      {back ? <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-auth-back" data-cloud-tab="login">‹ Entrar</button> : null}
    </div>
  );
}

const USER = { autocomplete: 'username', placeholder: 'drdemo', spellcheck: 'false' };

/** @param {{ url: string, sala: string, remember: boolean }} p Signed-out Nube home: the account card is the sign-in form. */
export function SignedOutBody({ url, sala, remember }) {
  return (
    <div class="cloud-sync-status-sheet cloud-sync-signed-out" data-cloud-signed-out="">
      <div class="cloud-sync-inset-group cloud-sync-auth-card" aria-label="Cuenta nube">
        <div class="cloud-sync-tab-panel" data-cloud-tab-panel="login" role="tabpanel">
          <AuthHead title="Entra a tu cuenta" back={false} />
          <div class="cloud-sync-auth-grid">
            <AuthField id="login-user" label="Usuario" {...USER} />
            <AuthField id="login-pass" label="Contraseña" type="password" autocomplete="current-password" />
          </div>
          <div class="cloud-sync-auth-foot">
            <RememberSwitch attr="login-remember" checked={remember} />
            <button type="button" class="cloud-sync-btn cloud-sync-btn--primary ui-pressable" data-cloud-action="login">Entrar</button>
          </div>
          <div class="cloud-sync-auth-links">
            <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-tab="register">Crear cuenta</button>
            <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-tab="recover">¿Olvidaste tu contraseña?</button>
          </div>
        </div>
        <div class="cloud-sync-tab-panel" data-cloud-tab-panel="register" role="tabpanel" hidden>
          <AuthHead title="Crea tu cuenta" back />
          <div class="cloud-sync-auth-grid">
            <AuthField id="reg-user" label="Usuario" hint="Minúsculas, sin espacios ni acentos. Sin «Dr.»." {...USER} />
            <AuthField id="reg-display" label="Nombre en guardia" hint="Así te ven en el censo y las entregas." autocomplete="name" placeholder="Dr. Demo" />
          </div>
          <AuthField id="reg-pass" label="Contraseña" type="password" autocomplete="new-password" />
          <RememberSwitch attr="reg-remember" checked={remember} />
          <div class="cloud-sync-auth-foot">
            <span class="cloud-sync-auth-hint">Luego te damos un código de recuperación. Guárdalo.</span>
            <button type="button" class="cloud-sync-btn cloud-sync-btn--primary ui-pressable" data-cloud-action="register">Crear cuenta</button>
          </div>
        </div>
        <div class="cloud-sync-tab-panel" data-cloud-tab-panel="recover" role="tabpanel" hidden>
          <AuthHead title="Recupera tu cuenta" back />
          <div class="cloud-sync-auth-grid">
            <AuthField id="recover-user" label="Usuario" {...USER} />
            <AuthField id="recover-code" label="Código de recuperación" autocomplete="off" placeholder="R+XXXX-XXXX-XXXX" spellcheck="false" />
            <AuthField id="recover-pass" label="Nueva contraseña" type="password" autocomplete="new-password" />
            <AuthField id="recover-pass2" label="Confírmala" type="password" autocomplete="new-password" />
          </div>
          <div class="cloud-sync-auth-foot">
            <span class="cloud-sync-auth-hint">Te damos un código nuevo; el anterior deja de servir.</span>
            <button type="button" class="cloud-sync-btn cloud-sync-btn--primary ui-pressable" data-cloud-action="recover">Recuperar cuenta</button>
          </div>
        </div>
      </div>
      {sala ? (
        <div class="cloud-sync-room cloud-sync-room--waiting">
          <p class="cloud-sync-options-label">Tu sala</p>
          <div class="cloud-sync-inset-group">
            <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-inset-row--identity">
              <span class="cloud-sync-options-entry-text">
                <span class="cloud-sync-room-name">{sala}</span>
                <span class="cloud-sync-status-display">Se conecta al entrar</span>
              </span>
            </div>
          </div>
        </div>
      ) : null}
      <details class="cloud-sync-inset-group cloud-sync-advanced cloud-sync-advanced--row">
        <summary>
          <span class="cloud-sync-options-entry-text">
            <span class="cloud-sync-options-entry-title">Avanzado</span>
            <span class="cloud-sync-options-entry-meta">URL del servicio</span>
          </span>
        </summary>
        <div class="cloud-sync-field">
          <label for="cloud-sync-url">URL del servicio</label>
          <input id="cloud-sync-url" type="url" class="profile-input" data-cloud-sync-url="" value={url} placeholder="https://…workers.dev" />
        </div>
      </details>
    </div>
  );
}

// ── Signed in ───────────────────────────────────────────────────────────────────────────────────────

/** @param {{ name: string, meta: string, code: string }} p «Tu sala» card: sala, month · members, invite code, leave. */
export function RoomConnected({ name, meta, code }) {
  return (
    <div class="cloud-sync-room cloud-sync-room--connected">
      <p class="cloud-sync-options-label">Tu sala</p>
      <div class="cloud-sync-inset-group" role="group" aria-label="Sala nube">
        <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-inset-row--identity">
          <span class="cloud-sync-options-entry-text">
            <span class="cloud-sync-room-name">{name}</span>
            {meta ? <span class="cloud-sync-status-display">{meta}</span> : null}
          </span>
        </div>
        <dl class="cloud-sync-inset-row cloud-sync-inset-row--kv">
          <dt>Código para invitar{code ? null : <span class="cloud-sync-room-code-missing" data-cloud-room-code-missing="">Se descarga al conectar con la Nube.</span>}</dt>
          <dd>
            <span class="cloud-sync-room-code-group">
              <code class="cloud-sync-room-code" data-cloud-room-code="">{code || '—'}</code>
              <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-room-copy" data-cloud-action="copy-room-code" disabled={!code}>Copiar</button>
            </span>
          </dd>
        </dl>
        <button type="button" class="cloud-sync-inset-row cloud-sync-inset-row--action cloud-sync-inset-row--danger" data-cloud-action="leave-room">Salir de la sala</button>
      </div>
    </div>
  );
}

/** @param {{ sala: string }} p Signed in but no room yet. */
export function RoomActions({ sala }) {
  return (
    <div class="cloud-sync-room cloud-sync-room--actions">
      <p class="cloud-sync-room-title">Unirse a una sala del turno</p>
      <div class="cloud-sync-field"><label>Nombre de la sala (opcional)</label><input type="text" class="profile-input" data-cloud-room-name="" placeholder={`Turno ${sala}`} /></div>
      <button type="button" class="cloud-sync-btn" data-cloud-action="create-room">Crear sala</button>
      <div class="cloud-sync-field"><label>Código de sala</label><input type="text" class="profile-input" data-cloud-join-code="" placeholder="ABC123" /></div>
      <button type="button" class="cloud-sync-btn" data-cloud-action="join-room">Unirse con código</button>
    </div>
  );
}

function OptionsRow({ title, meta, view, action = 'nav-view' }) {
  const tech = view === 'nube' ? { 'data-cloud-tech-summary': '' } : {};
  return (
    <button type="button" class="cloud-sync-options-row" data-cloud-action={action} data-cloud-view={view}>
      <span class="cloud-sync-options-row-text">
        <span class="cloud-sync-options-row-title">{title}</span>
        <span class="cloud-sync-options-row-meta" {...tech}>{meta}</span>
      </span>
      <span class="cloud-sync-options-row-chevron" aria-hidden="true">›</span>
    </button>
  );
}

function OptionsGroup({ label, children }) {
  return (
    <section class="cloud-sync-options-group">
      <h5 class="cloud-sync-options-label">{label}</h5>
      <div class="cloud-sync-options-card">{children}</div>
    </section>
  );
}

function ViewBlock({ id, title, hidden = true, children }) {
  return (
    <div class="cloud-sync-view" data-cloud-view={id} data-cloud-view-title={title} hidden={hidden}>
      <div class="cloud-sync-view-body">{children}</div>
    </div>
  );
}

/** @typedef {{ display: string, handle: string, initials: string }} Identity */

/**
 * @param {{ identity: Identity, room: { name: string, meta: string, code: string } | null, salaForActions: string,
 *   showAdmin: boolean, showInternoQr: boolean, url: string, techSummary: string }} p
 */
export function ConnectedBody({ identity, room, salaForActions, showAdmin, showInternoQr, url, techSummary }) {
  const { display, handle, initials } = identity;
  return (
    <div class="cloud-sync-views" data-cloud-views="">
      <ViewBlock id="status" title="Conexión" hidden={false}>
        <div class="cloud-sync-status-sheet">
          <div class="cloud-sync-inset-group cloud-sync-status-identity" aria-label="Cuenta">
            <div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-account-row">
              <span class="cloud-sync-avatar" aria-hidden="true">{initials}</span>
              <span class="cloud-sync-options-entry-text">
                {display ? <span class="cloud-sync-account-name">{display}</span> : null}
                <span class="cloud-sync-status-handle">@{handle || '—'}</span>
              </span>
              <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--danger" data-cloud-action="logout">Cerrar sesión</button>
            </div>
          </div>
          {room ? <RoomConnected {...room} /> : <RoomActions sala={salaForActions} />}
          <div class="cloud-sync-options-card">
            <OptionsRow title={showAdmin ? 'Equipo y administración' : 'Equipo y cuenta'} meta={showAdmin ? 'Equipo, cuenta y administración' : 'Equipo, cuenta e iPad'} view="options" action="nav-options" />
            <OptionsRow title="Detalles técnicos" meta={techSummary || '—'} view="nube" />
          </div>
        </div>
      </ViewBlock>
      <ViewBlock id="options" title="Opciones">
        <div class="cloud-sync-options-list">
          <OptionsGroup label="Guardia">
            <OptionsRow title="iPad / R+ Móvil" meta="QR y enlace permanente" view="mobile" />
            <OptionsRow title="Equipo" meta="@usuario, equipos y sala" view="equipo" />
            {showInternoQr ? <OptionsRow title="QR internos" meta="Vitales desde el celular por sala" view="interno-qr" /> : null}
          </OptionsGroup>
          <OptionsGroup label="Cuenta">
            <OptionsRow title="Cuenta" meta="Recuperación y sesión" view="cuenta" />
            {showAdmin ? <OptionsRow title="Administración" meta="Usuarios, salas y clave admin" view="admin" /> : null}
          </OptionsGroup>
          <OptionsGroup label="Sistema">
            <OptionsRow title="Diagnóstico nube" meta="Dashboard de estado y alertas" view="nube" />
            <OptionsRow title="Avanzado" meta="URL del servicio" view="advanced" />
          </OptionsGroup>
        </div>
      </ViewBlock>
      <ViewBlock id="equipo" title="Equipo">
        <div class="cloud-sync-equipo-embed" data-cloud-equipo-host=""><div class="clinical-teams-panel-body clinical-teams-panel-body--embed"></div></div>
      </ViewBlock>
      <ViewBlock id="mobile" title="iPad / R+ Móvil">
        <div class="cloud-sync-mobile-invite-host" data-cloud-mobile-invite-host=""></div>
      </ViewBlock>
      {showInternoQr ? (
        <ViewBlock id="interno-qr" title="QR internos">
          <div class="cloud-sync-interno-qr-host" data-cloud-interno-qr-host=""></div>
        </ViewBlock>
      ) : null}
      <ViewBlock id="cuenta" title="Cuenta">
        <div class="cloud-sync-cuenta">
          <p class="cloud-sync-status-handle">@{handle || '—'}</p>
          {display ? <p class="cloud-sync-status-display">{display}</p> : null}
          <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost ui-pressable" data-cloud-action="regenerate-recovery">Código de recuperación</button>
          <button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-action="logout">Cerrar sesión Nube</button>
        </div>
      </ViewBlock>
      {showAdmin ? (
        <ViewBlock id="admin" title="Administración">
          <div class="cloud-sync-admin-host" data-cloud-admin-host=""></div>
        </ViewBlock>
      ) : null}
      <ViewBlock id="nube" title="Diagnóstico nube">
        <div class="cloud-sync-nube-diagnostics-host" data-cloud-nube-diagnostics-host=""></div>
      </ViewBlock>
      <ViewBlock id="advanced" title="Avanzado">
        <div class="cloud-sync-field">
          <label for="cloud-sync-url-connected">URL del servicio</label>
          <input id="cloud-sync-url-connected" type="url" class="profile-input" data-cloud-sync-url="" value={url} placeholder="https://…workers.dev" />
        </div>
        <button type="button" class="cloud-sync-btn" data-cloud-action="save-url">Guardar</button>
      </ViewBlock>
    </div>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ displaySala: string, status: string, statusLabel: string, chipClass: string, detail: string,
 *   hero: { hero: HeroState, steps: ChainStep[] } | null,
 *   body: ({ kind: 'signedOut' } & Parameters<typeof SignedOutBody>[0]) | ({ kind: 'connected' } & Parameters<typeof ConnectedBody>[0]) }} p
 */
export function ConexionShell({ displaySala, status, statusLabel, chipClass, detail, hero, body }) {
  const detailText = String(detail || '').trim();
  const showDetail = status === 'error' && !!detailText && !hero;
  return (
    <>
      <header class="cloud-sync-conexion-head">
        {hero ? <HeroBlock {...hero} /> : (
          <>
            <div class="cloud-sync-conexion-head-text">
              <h4 class="cloud-sync-conexion-title">Conexión</h4>
              <p class="cloud-sync-conexion-sub">{displaySala}</p>
            </div>
            <span class={`cloud-sync-status-chip ${chipClass}`} data-cloud-status-chip="" data-status={status}>{statusLabel}</span>
          </>
        )}
      </header>
      <p class="cloud-sync-status-detail" data-cloud-status-detail="" hidden={!showDetail}>{detailText}</p>
      {body.kind === 'signedOut' ? <SignedOutBody {...body} /> : <ConnectedBody {...body} />}
    </>
  );
}

/** Repaint `section` from scratch. */
export function drawConexionShell(section, props) {
  render(null, section);
  section.replaceChildren();
  render(<ConexionShell {...props} />, section);
}

/** Swap the hero block inside `section` for a fresh draw, in place. */
export function replaceHeroBlock(block, props) {
  const tmp = document.createElement('div');
  render(<HeroBlock {...props} />, tmp);
  block.replaceWith(...tmp.childNodes);
}
