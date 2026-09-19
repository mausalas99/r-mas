/** Mi rotación — create/join team form HTML. */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { canManageTeamRoster } from '../../clinical-privileges.mjs';
import {
  escapeHtml,
  escapeAttr,
  hintHtml,
  CLINICAL_SALAS,
  renderClinicalTeamsCollapsible,
} from './shared.mjs';
import { renderDirectoryUsersTopButtonHtml } from './teams-roster-users.mjs';

/** Default the Sala select to the user's own sala once the create panel opens. */
export function syncCreateTeamSalaDefault() {
  const salaSelect = document.getElementById('clinical-team-create-sala');
  const userSala = String(clinicalSessionContext.user?.sala || '').trim();
  if (salaSelect && userSala && !String(salaSelect.value || '').trim()) {
    salaSelect.value = userSala;
  }
}

export function renderCreateTeamForm() {
  const user = clinicalSessionContext.user || {};
  if (canManageTeamRoster(user)) {
    return renderCreateTeamFormElevated(user);
  }
  return renderCreateTeamFormStandard();
}

export function renderCreateTeamFormElevated(user) {
  const homeSala = String(user?.sala || '').trim();
  return `
    <form id="clinical-team-create-form" class="clinical-teams-create-form clinical-teams-create-form--elevated">
      <div class="field-group">
        <label for="clinical-team-create-name">Nombre del equipo</label>
        <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Equipo A · Dr. Gutiérrez" required>
        ${hintHtml('Solo el nombre; sin integrantes todavía.')}
      </div>
      <div class="field-group">
        <label for="clinical-team-create-sala">Sala</label>
        <select id="clinical-team-create-sala" class="profile-input" required>
          <option value="">— Seleccionar sala —</option>
          ${CLINICAL_SALAS.map(
            (s) =>
              `<option value="${escapeAttr(s)}" ${homeSala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
          ).join('')}
        </select>
      </div>
      <p class="clinical-teams-hint clinical-teams-create-elevated-hint">Asigna residentes después desde <strong>Directorio de usuarios LAN</strong>.</p>
      <div class="modal-actions clinical-teams-create-submit-wrap">
        <button type="submit" class="btn-save">Crear equipo vacío</button>
        <button type="button" class="btn-med-secondary clinical-teams-create-cancel">Cancelar</button>
      </div>
    </form>`;
}

export function renderCreateTeamFormStandard() {
  const userSala = String(clinicalSessionContext.user?.sala || '').trim();

  return `
    <form id="clinical-team-create-form" class="clinical-teams-create-form">
      <div class="field-group" id="clinical-team-sala-group">
        <label for="clinical-team-create-sala">Sala</label>
        <select id="clinical-team-create-sala" class="profile-input">
          <option value="">— Seleccionar sala —</option>
          ${CLINICAL_SALAS.map(
            (s) =>
              `<option value="${escapeAttr(s)}" ${s === userSala ? 'selected' : ''}>${escapeHtml(s)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="field-group">
        <label for="clinical-team-create-name">Nombre del equipo (residente líder)</label>
        <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Dr. Gutiérrez" required>
      </div>
      <div class="modal-actions clinical-teams-create-submit-wrap">
        <button type="submit" class="btn-save">Crear equipo</button>
        <button type="button" class="btn-med-secondary clinical-teams-create-cancel">Cancelar</button>
      </div>
    </form>`;
}

export function renderCreateTeamSectionHtml() {
  const user = clinicalSessionContext.user || {};
  const elevatedCreate = canManageTeamRoster(user);
  const openLabel = elevatedCreate ? 'Crear equipo vacío' : 'Crear nuevo equipo';
  const lanDirBtn = renderDirectoryUsersTopButtonHtml(user);
  const actionsClass = lanDirBtn
    ? 'clinical-teams-top-actions clinical-teams-top-actions--split'
    : 'clinical-teams-top-actions';
  return `
    <section class="clinical-teams-section clinical-teams-section--create">
      <div class="${actionsClass}">
        <button type="button" id="btn-clinical-team-create-open" class="btn-save clinical-teams-create-open-btn">${escapeHtml(openLabel)}</button>
        ${lanDirBtn}
      </div>
      <div id="clinical-team-create-panel" class="clinical-teams-create-panel" hidden>
        ${renderCreateTeamForm()}
      </div>
    </section>`;
}

export function renderJoinWithCodeSectionHtml() {
  const joinForm = `
      <form id="clinical-team-join-code-form" class="clinical-teams-join-code-form">
        <div class="clinical-teams-invite-row clinical-teams-join-code-code-row">
          <label class="visually-hidden" for="clinical-team-join-code-input">Código de equipo</label>
          <input id="clinical-team-join-code-input" type="text" class="profile-input" placeholder="ej. 2017936e" maxlength="36" autocomplete="off" required>
        </div>
        <div class="clinical-teams-join-submit-wrap">
          <button type="submit" class="btn-save">Unirme</button>
        </div>
      </form>`;
  return `
    <section class="clinical-teams-section clinical-teams-section--join-code">
      ${renderClinicalTeamsCollapsible({
        collapseKey: 'section.joinCode',
        defaultOpen: false,
        className: 'clinical-teams-collapse--section',
        summaryHtml: `
          <h4 class="clinical-teams-section-title">Unirte con código de equipo</h4>
          <p class="clinical-teams-section-desc">Pega el código que te envió tu R2 (8 caracteres). <strong>No</strong> pegues aquí el enlace ⇄ de sala (<code>http://…/join/req_…</code>) — ese va en <strong>Wi‑Fi → Conexión guardia</strong>.</p>`,
        bodyHtml: joinForm,
      })}
    </section>`;
}
