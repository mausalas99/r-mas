/**
 * Mi perfil «Sala de guardia» chips and «Mi cuenta» cards. Preact: same DOM, ids and data-* hooks the
 * string builders in teams-roster-panel-build.mjs made. The .mjs decides `open`, `hint` and `ranks`
 * (reads the clock and localStorage); these components only draw.
 */
import { render } from 'preact';

/** @param {{ sala: string, salas: string[], collapseKey: string, open: boolean, hint: '' | 'pick' | 'newMonth' }} p */
export function PerfilSala({ sala, salas, collapseKey, open, hint }) {
  return (
    <details class="settings-perfil-sala" data-collapse-key={collapseKey} open={open}>
      <summary>
        <span class="settings-perfil-sala-title">Sala de guardia</span>
        <span class="settings-perfil-sala-note">Al cambiar de sala se guarda tu perfil y pasas a la sala en Nube.</span>
        <span class="settings-perfil-sala-current">{sala || 'Sin sala'}</span>
      </summary>
      {hint === 'pick' && (
        <p class="settings-acc-hint settings-acc-hint--tight" data-perfil-sala-hint="" role="status"><b>Elige la sala de tu nueva rotación.</b></p>
      )}
      {hint === 'newMonth' && (
        <p class="settings-acc-hint settings-acc-hint--tight" data-perfil-sala-hint="" role="status">Hoy empieza el mes. Confirma tu sala de rotación.</p>
      )}
      <div class="settings-perfil-chips" role="group" aria-label="Sala de guardia">
        {salas.map((s) => (
          <button type="button" class="settings-perfil-chip" data-perfil-sala={s} aria-pressed={String(sala === s)}>{s}</button>
        ))}
      </div>
      <input type="hidden" id="clinical-profile-sala" form="clinical-profile-form" value={sala} />
    </details>
  );
}

function Card({ title, desc, labelFor, children }) {
  return (
    <div class="settings-card">
      <div class="settings-card__copy">
        <label class="settings-card__title" for={labelFor}>{title}</label>
        {desc && <p class="settings-card__desc settings-acc-hint settings-acc-hint--tight">{desc}</p>}
      </div>
      <div class="settings-card__action">{children}</div>
    </div>
  );
}

/**
 * @param {{ legacyUsername: boolean, usernameForInput: string, clinicalName: string, rank: string,
 *   ranks: string[], programAdmin: boolean, directoryNote: boolean }} p
 */
export function PerfilAccount({ legacyUsername, usernameForInput, clinicalName, rank, ranks, programAdmin, directoryNote }) {
  return (
    <form id="clinical-profile-form" class="settings-perfil-account" noValidate>
      {legacyUsername && (
        <p class="clinical-teams-legacy-banner">Registra tu @usuario (obligatorio). Sin esto no apareces en equipos ni entregas.</p>
      )}
      <p class="settings-section-label">Mi cuenta</p>
      <div class="settings-card-stack">
        <Card title="Usuario" desc="@usuario en minúsculas, sin espacios." labelFor="clinical-profile-username">
          <input id="clinical-profile-username" type="text" class="profile-input" value={usernameForInput} placeholder="drmendoza"
            autocomplete="off" spellcheck="false" pattern="[a-z][a-z0-9_]{2,31}" required />
        </Card>
        <Card title="Nombre en guardia" labelFor="clinical-profile-name">
          <input id="clinical-profile-name" type="text" class="profile-input" value={clinicalName} required />
        </Card>
        <Card title="Rango clínico" desc="Equipos, entregas y alcance." labelFor="clinical-profile-rank">
          <select id="clinical-profile-rank" class="profile-input">
            {ranks.map((r) => <option value={r} selected={r === rank}>{r}</option>)}
          </select>
        </Card>
        <Card title="Privilegios de administración" desc="Requiere tu código. Rotación, censo global y directorio." labelFor="clinical-profile-admin">
          <input type="checkbox" id="clinical-profile-admin" checked={programAdmin} />
          {programAdmin && <button type="button" class="wb-btn wb-btn-ghost wb-btn-sm" id="btn-clinical-admin-code-change">Cambiar código</button>}
        </Card>
      </div>
      {directoryNote && (
        <p class="settings-acc-hint settings-acc-hint--tight">El directorio completo lo abren R4, Admin o quien tenga privilegios de administración.</p>
      )}
    </form>
  );
}

/** Repaint both hosts; null props empties the host. Fresh nodes each time, as the innerHTML writes made. */
export function drawPerfilClinical(salaHost, accountHost, sala, account) {
  for (const [host, Comp, props] of [[salaHost, PerfilSala, sala], [accountHost, PerfilAccount, account]]) {
    render(null, host);
    host.replaceChildren();
    if (props) render(<Comp {...props} />, host);
  }
}
