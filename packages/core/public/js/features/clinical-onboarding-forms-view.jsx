/**
 * First-run onboarding forms (Perfil step): the LAN/Nube profile form and the «Ya tengo cuenta» login.
 * Preact: same DOM, classes and ids the string builders in clinical-onboarding-render.mjs /
 * -existing-login.mjs made. Those files keep the gates, the settings reads and every handler;
 * this one only draws. Inputs rebuilt over the same form keep their typed value and focus.
 */
import { render } from 'preact';
import { Stage } from './clinical-onboarding-view.jsx';
import { PILL_LABELS, ROTACION_PENDING, SALA_OPTION_VALUES, hintText, isRotacion, setSalaPickerValue } from './sala-picker.mjs';

/** Sala <option>s; same markup as salaPickerOptionsHtml. */
export function SalaOptions({ prefilled }) {
  const rot = isRotacion(prefilled);
  return (
    <>
      {SALA_OPTION_VALUES.map((s) => (
        <option value={s} selected={prefilled === s}>{s}</option>
      ))}
      <option value={rot ? prefilled : ROTACION_PENDING} data-rotacion="" selected={rot}>Otra rotación (fuera de MI)</option>
    </>
  );
}

/** Pill row after the sala select; same markup as salaPickerRotacionHtml. */
export function SalaRotacionPick({ prefilled }) {
  return (
    <fieldset class="sala-rotacion-pick" data-rotacion-pick="" hidden={!isRotacion(prefilled)}>
      <legend>¿En qué servicio? *</legend>
      <div class="settings-perfil-chips" role="group">
        {Object.entries(PILL_LABELS).map(([sala, label]) => (
          <button type="button" class="settings-perfil-chip" data-rotacion-sala={sala} aria-pressed={String(prefilled === sala)}>{label}</button>
        ))}
      </div>
      <p class="clinical-teams-hint" data-rotacion-hint="" aria-live="polite">{hintText(prefilled)}</p>
    </fieldset>
  );
}

function NubePasswordField({ show, upgrade, cloudUrl }) {
  return (
    <div class="field-group clinical-onboard-nube-field" id="onboard-nube-field" hidden={!show}>
      <label for="onboard-nube-password">Contraseña Nube *</label>
      <input id="onboard-nube-password" type="password" class="profile-input" autocomplete="new-password" minlength="10" required={show} placeholder="mín. 10 caracteres" />
      <p class="clinical-teams-hint">
        {upgrade
          ? 'Tu rotación ahora es Sala/Torre: crea tu cuenta Nube con esta contraseña (misma @usuario).'
          : <>Obligatoria en <strong>Sala</strong> / <strong>Torre HU</strong>. URL: {cloudUrl}</>}
      </p>
      <p id="onboard-nube-status" class="clinical-teams-hint" aria-live="polite"></p>
    </div>
  );
}

const LEADS = {
  gate: () => (
    <p class="clinical-onboard-gate-lead">
      Confirma tu <strong>@usuario</strong> de R+ Cloud y tu <strong>nombre en guardia</strong>.{' '}
      <strong>Pacientes y labs se conservan</strong>.{' '}
      En salas clínicas también registras tu <strong>contraseña de Nube</strong> aquí — no copies el nombre en guardia en el campo de usuario.
    </p>
  ),
  upgrade: () => (
    <p class="clinical-onboard-gate-lead">
      Pasaste a <strong>Sala</strong> o <strong>Torre HU</strong>.{' '}
      Completa el perfil y registra tu <strong>contraseña de Nube</strong> para sincronizar el turno.
    </p>
  ),
  default: () => (
    <p>
      Confirma tu @usuario de R+ Cloud, nombre en guardia, rango y rotación.{' '}
      Para equipos, abre <strong>Mi rotación</strong> después.
    </p>
  ),
};

/**
 * @param {{ title: string, leadKind: 'gate'|'upgrade'|'default', username: string, name: string, rank: string,
 *   sala: string, nubeShow: boolean, upgrade: boolean, cloudUrl: string }} p
 */
export function LanProfileStage({ title, leadKind, username, name, rank, sala, nubeShow, upgrade, cloudUrl }) {
  const Lead = LEADS[leadKind] || LEADS.default;
  return (
    <Stage title={title} stepperIndex={2} lead={<Lead />}>
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          <fieldset class="clinical-onboard-substep" data-substep="">
            <legend class="clinical-onboard-question">Elige tu @usuario</legend>
            <div class="field-group">
              <label for="onboard-username">Usuario *</label>
              <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza" value={username} required autocomplete="off" spellcheck="false" />
              <p class="clinical-teams-hint">
                <strong>Usuario (@usuario)</strong>: identificador único en minúsculas, sin espacios ni tildes: apellido + inicio del nombre, p. ej. <code>drmendoza</code> o <code>garcia</code>. No escribas «Dr. …» aquí.
              </p>
            </div>
          </fieldset>
          <fieldset class="clinical-onboard-substep" data-substep="" hidden>
            <legend class="clinical-onboard-question">¿Cómo te llaman en guardia?</legend>
            <div class="field-group">
              <label for="onboard-clinical-name">Nombre en guardia *</label>
              <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza" value={name} required autocomplete="name" />
              <p class="clinical-teams-hint">
                <strong>Nombre en guardia</strong>: cómo te ven en el censo y las entregas: p. ej. <code>Dr. Mendoza</code> o <code>R1 García</code>.
              </p>
            </div>
          </fieldset>
          <fieldset class="clinical-onboard-substep" data-substep="" hidden>
            <legend class="clinical-onboard-question">¿Dónde rotas?</legend>
            <div class="field-group">
              <label for="onboard-rank">Rango</label>
              <select id="onboard-rank" class="profile-input">
                {['R1', 'R2', 'R3', 'R4'].map((r) => <option value={r} selected={rank === r}>{r}</option>)}
              </select>
            </div>
            <div class="field-group">
              <label for="onboard-sala">Rotación *</label>
              <select id="onboard-sala" class="profile-input" required>
                <option value="">— Seleccionar —</option>
                <SalaOptions prefilled={sala} />
              </select>
              <SalaRotacionPick prefilled={sala} />
            </div>
            <NubePasswordField show={nubeShow} upgrade={upgrade} cloudUrl={cloudUrl} />
          </fieldset>
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="button" class="wb-btn wb-btn-secondary" data-substep-back="" hidden>Atrás</button>
            <button type="submit" class="wb-btn wb-btn-primary wb-btn-lg">Guardar perfil</button>
          </div>
        </form>
        <div class="clinical-onboard-alt-actions">
          <button type="button" id="clinical-onboard-switch-existing-btn" class="wb-btn wb-btn-ghost">Ya tengo cuenta Nube</button>
          <button type="button" id="clinical-onboard-resume-btn" class="wb-btn wb-btn-ghost">Recuperar mi usuario</button>
          <button type="button" id="clinical-onboard-mode-back-btn" class="wb-btn wb-btn-ghost">Cambiar modo</button>
        </div>
      </div>
    </Stage>
  );
}

/** @param {{ username: string, sala: string, remember: boolean, cloudUrl: string }} p */
export function ExistingLoginStage({ username, sala, remember, cloudUrl }) {
  return (
    <Stage title="Inicia sesión en Nube" stepperIndex={2} lead={<p>Entra con tu @usuario y contraseña de R+ Cloud. Sincronizaremos equipos y censo del turno en este equipo.</p>}>
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-existing-login-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          <div class="field-group">
            <label for="onboard-existing-username">Usuario (@usuario) *</label>
            <input id="onboard-existing-username" type="text" class="profile-input" placeholder="ej. drmendoza" value={username} required autocomplete="username" spellcheck="false" />
          </div>
          <div class="field-group">
            <label for="onboard-existing-password">Contraseña Nube *</label>
            <input id="onboard-existing-password" type="password" class="profile-input" required autocomplete="current-password" minlength="10" />
          </div>
          <label class="cloud-sync-remember clinical-onboard-remember">
            <input type="checkbox" id="onboard-existing-remember" data-onboard-existing-remember="" checked={remember} />
            Recuérdame en este dispositivo
          </label>
          <p class="clinical-teams-hint">Mantiene la sesión Nube al reiniciar R+. No uses esto en una Mac compartida.</p>
          <div class="field-group">
            <label for="onboard-existing-sala">Rotación *</label>
            <select id="onboard-existing-sala" class="profile-input" required>
              <option value="">— Seleccionar —</option>
              <SalaOptions prefilled={sala} />
            </select>
            <SalaRotacionPick prefilled={sala} />
            <p class="clinical-teams-hint">Necesaria para unirte a la sala de turno en Nube ({cloudUrl}).</p>
          </div>
          <p id="onboard-existing-status" class="clinical-teams-hint" aria-live="polite"></p>
          <p id="onboard-existing-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="wb-btn wb-btn-primary wb-btn-lg">Entrar y sincronizar</button>
            <button type="button" id="clinical-onboard-existing-back-btn" class="wb-btn wb-btn-secondary">Cambiar modo</button>
          </div>
        </form>
      </div>
    </Stage>
  );
}

/** Typed values and focus of the form already in `host`, keyed by element id. Null when `formId` is not there. */
function snapshot(host, formId) {
  if (!host.querySelector(`#${formId}`)) return null;
  const values = new Map();
  for (const el of host.querySelectorAll('input[id], select[id]')) {
    values.set(el.id, el.type === 'checkbox' ? el.checked : el.value);
  }
  const active = document.activeElement;
  const focus = active && host.contains(active) && active.id ? { id: active.id, start: active.selectionStart, end: active.selectionEnd } : null;
  return { values, focus };
}

function restore(host, snap) {
  for (const [id, value] of snap.values) {
    const el = host.querySelector(`#${id}`);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = value;
    else if (el.tagName === 'SELECT') setSalaPickerValue(el, value);
    else el.value = value;
  }
  const f = snap.focus && host.querySelector(`#${snap.focus.id}`);
  if (!f) return;
  f.focus();
  try {
    if (snap.focus.start != null) f.setSelectionRange(snap.focus.start, snap.focus.end);
  } catch { /* type without a caret */ }
}

/** Repaint `host` from scratch (edited in place after a draw, so never diffed), keeping what was typed. */
function paint(host, formId, vnode) {
  const snap = snapshot(host, formId);
  render(null, host);
  host.replaceChildren();
  render(vnode, host);
  if (snap) restore(host, snap);
}

export const drawLanProfileStage = (host, props) => paint(host, 'clinical-onboard-username-form', <LanProfileStage {...props} />);
export const drawExistingLoginStage = (host, props) => paint(host, 'clinical-onboard-existing-login-form', <ExistingLoginStage {...props} />);
