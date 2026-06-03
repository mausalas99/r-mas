/**
 * Mi rotación — self-serve teams and membership.
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  refreshClinicalUserProfile,
} from '../clinical-access-runtime.mjs';
import {
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  formatMemberCycleLabel,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
} from '../clinico-access.mjs';
import {
  buildClinicalTeamInviteMessage,
  isClinicalTeamJoinDesktopApp,
  normalizeTeamInviteCode,
  parseClinicalTeamJoinQuery,
  resolveTeamIdFromInviteCode,
  teamInviteCode,
  tryMountClinicalTeamInviteBrowserGate,
} from '../clinical-team-invite.mjs';
import { copyToClipboardSafe } from './soap-estado.mjs';
import {
  effectiveClinicalRank,
  hasElevatedTeamPrivileges,
  hasProgramAdminPrivileges,
  canViewLanUserDirectory,
  canManageTeamRoster,
  canDeleteLanDirectoryUser,
} from '../clinical-privileges.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../clinical-username.mjs';
import { syncRotationConfigButton, wireNuevaRotacionControl } from './clinical-rotation.mjs';
import { persistClinicalUserBinding, readRpcSettings } from '../clinical-settings.mjs';
import { resumeClinicalIdentityByUsername } from '../clinical-access-runtime.mjs';
import { verifyAdminAccessCode } from '../../../lib/admin-access-code.mjs';
import {
  ensureClinicalPanelSession,
  getClinicalTeamsPanelHost,
  safeRenderClinicalTeamsPanel,
  setClinicalTeamsPanelError,
} from './clinical-panel-host.mjs';

export const CLINICAL_TEAM_SERVICES = [
  'Sala',
  'Interconsultas',
  'Eme',
  'Torre HU',
  'UX',
  'Área A/Pensionistas',
];

export const CLINICAL_SALAS = ['Sala 1', 'Sala 2', 'Sala E'];

const BROWSE_SALA_LS = 'clinical.browseSala';

/** @type {boolean} */
let adminAccessGrantedThisSession = false;
/** @type {string|null} */
let verifiedAdminAccessCode = null;
/** @type {((value: string|null) => void)|null} */
let adminCodePromptResolve = null;

function adminCodeModalBackdropEl() {
  return document.getElementById('clinical-admin-code-backdrop');
}

function closeAdminCodeModal() {
  const bd = adminCodeModalBackdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

function promptAdminAccessCode() {
  const bd = adminCodeModalBackdropEl();
  const input = document.getElementById('clinical-admin-code-input');
  const err = document.getElementById('clinical-admin-code-error');
  if (!bd || !(input instanceof HTMLInputElement)) return Promise.resolve(null);

  input.value = '';
  if (err) {
    err.hidden = true;
    err.textContent = '';
  }
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  input.focus();

  return new Promise((resolve) => {
    adminCodePromptResolve = resolve;
  });
}

function finishAdminCodePrompt(code) {
  closeAdminCodeModal();
  const resolve = adminCodePromptResolve;
  adminCodePromptResolve = null;
  resolve?.(code);
}

function submitAdminCodeModal() {
  const input = document.getElementById('clinical-admin-code-input');
  const err = document.getElementById('clinical-admin-code-error');
  const code = input instanceof HTMLInputElement ? input.value : '';
  if (!verifyAdminAccessCode(code)) {
    if (err) {
      err.textContent = 'Código incorrecto.';
      err.hidden = false;
    }
    if (input instanceof HTMLInputElement) input.focus();
    return;
  }
  finishAdminCodePrompt(String(code).trim());
}

function cancelAdminCodeModal() {
  finishAdminCodePrompt(null);
}

function wireAdminCodeModalControls() {
  const bd = adminCodeModalBackdropEl();
  if (bd && !bd._rpcAdminCodeBackdropWired) {
    bd._rpcAdminCodeBackdropWired = true;
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) cancelAdminCodeModal();
    });
  }

  const form = document.getElementById('clinical-admin-code-form');
  if (form && !form._rpcAdminCodeFormWired) {
    form._rpcAdminCodeFormWired = true;
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      submitAdminCodeModal();
    });
  }

  const cancelBtn = document.getElementById('btn-clinical-admin-code-cancel');
  if (cancelBtn && !cancelBtn._rpcAdminCodeCancelWired) {
    cancelBtn._rpcAdminCodeCancelWired = true;
    cancelBtn.addEventListener('click', () => cancelAdminCodeModal());
  }

  const closeBtn = document.getElementById('btn-clinical-admin-code-close');
  if (closeBtn && !closeBtn._rpcAdminCodeCloseWired) {
    closeBtn._rpcAdminCodeCloseWired = true;
    closeBtn.addEventListener('click', () => cancelAdminCodeModal());
  }
}

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function hintHtml(text) {
  return `<p class="clinical-teams-hint">${escapeHtml(text)}</p>`;
}

function currentUserId() {
  return String(clinicalSessionContext.user?.user_id || '');
}

/**
 * Teams where the current clinical user is a member (by user id or LAN username).
 *
 * @param {object[]} teams
 * @param {string|{ user_id?: string, username?: string }} userOrUserId
 * @param {string} [usernameHint]
 */
export function filterJoinedTeams(teams, userOrUserId, usernameHint) {
  let uid = '';
  let handle = '';
  if (userOrUserId && typeof userOrUserId === 'object') {
    uid = String(userOrUserId.user_id || '');
    handle = normalizeUsername(userOrUserId.username || '');
  } else {
    uid = String(userOrUserId || '');
    handle = normalizeUsername(usernameHint || '');
  }
  if (!uid && !handle) return [];
  return (teams || []).filter((team) =>
    (team.members || []).some((m) => {
      if (uid && String(m.user_id) === uid) return true;
      if (handle && normalizeUsername(m.username || '') === handle) return true;
      return false;
    })
  );
}

/** @param {object} team @param {{ user_id?: string, username?: string }} user */
export function isUserTeamMember(team, user) {
  const uid = String(user?.user_id || '');
  const handle = normalizeUsername(user?.username || '');
  return (team.members || []).some((m) => {
    if (uid && String(m.user_id) === uid) return true;
    if (handle && normalizeUsername(m.username || '') === handle) return true;
    return false;
  });
}

function teamsModalEl() {
  return document.getElementById('clinical-teams-backdrop');
}

function isClinicalTeamsPanelOpen() {
  const bd = teamsModalEl();
  return !!(bd && bd.classList.contains('open'));
}

/** Tras cambios de equipos: actualiza caché y panel si está abierto (sin «Cargando…»). */
async function refreshTeamsUiAfterChange() {
  await fetchClinicalTeamsFromDb();
  import('./clinical-rotation-entry.mjs').then((m) => m.syncClinicalRotationEntryChrome());
  if (isClinicalTeamsPanelOpen()) {
    await renderClinicalTeamsPanel({ silent: true });
  }
}

export async function openClinicalTeamsPanel() {
  wireClinicalTeamsModalChrome();
  const bd = teamsModalEl();
  if (!bd) return;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  document.body.classList.add('clinical-teams-modal-open');

  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    setClinicalTeamsPanelError(
      'Activa la sesión clínica (desbloquea la base de datos) para usar Mi rotación.'
    );
    return;
  }

  try {
    const { needsClinicalOnboarding } = await import('./clinical-onboarding.mjs');
    if (needsClinicalOnboarding()) {
      closeClinicalTeamsPanel();
      const { openMiRotacion } = await import('./clinical-rotation-entry.mjs');
      await openMiRotacion();
      return;
    }
    await renderClinicalTeamsPanel();
    const nameInput = document.getElementById('clinical-team-create-name');
    if (nameInput) nameInput.focus();
  } catch (err) {
    console.error('[Mi rotación]', err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : 'No se pudo abrir Mi rotación.'
    );
  }
}

export function closeClinicalTeamsPanel() {
  const bd = teamsModalEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('clinical-teams-modal-open');
}

function syncCreateTeamCycleField() {
  const service = String(document.getElementById('clinical-team-create-service')?.value || 'Sala');
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const r1Line = Number(document.getElementById('clinical-team-create-r1-line')?.value || 0);
  const meta = getCycleFieldMetaForTeamCreate(service, rank, r1Line === 1 ? 1 : 0);
  const label = document.getElementById('clinical-team-create-day-label');
  const hint = document.getElementById('clinical-team-create-day-hint');
  const daySelect = document.getElementById('clinical-team-create-day');
  const r1LineGroup = document.getElementById('clinical-team-r1-line-group');
  const svcKey = service.trim().toLowerCase();
  const showR1Line = rank === 'R1' && svcKey.includes('sala');
  if (r1LineGroup) r1LineGroup.hidden = !showR1Line;
  if (label) label.textContent = meta.label;
  if (hint) hint.textContent = meta.hint;
  if (!daySelect) return;
  const prev = String(daySelect.value || '');
  const letters = getCycleLettersForTeamCreate(service, rank, r1Line === 1 ? 1 : 0);
  daySelect.innerHTML = letters
    .map((letter) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`)
    .join('');
  if (prev && letters.includes(prev)) daySelect.value = prev;
}

export function renderCreateTeamForm() {
  const user = clinicalSessionContext.user || {};
  if (canManageTeamRoster(user)) {
    return renderCreateTeamFormElevated(user);
  }
  return renderCreateTeamFormStandard();
}

function renderCreateTeamFormElevated(user) {
  const homeSala = String(user?.sala || '').trim();
  return `
    <details class="clinical-teams-details" open>
      <summary>Crear equipo vacío</summary>
      <div class="clinical-teams-details-body">
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
          </div>
        </form>
      </div>
    </details>`;
}

function renderCreateTeamFormStandard() {
  const serviceOptions = CLINICAL_TEAM_SERVICES.map(
    (svc) => `<option value="${escapeAttr(svc)}">${escapeHtml(svc)}</option>`
  ).join('');
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const defaultService = CLINICAL_TEAM_SERVICES[0];
  const defaultLetters = getCycleLettersForTeamCreate(defaultService, rank, 0);
  const defaultMeta = getCycleFieldMetaForTeamCreate(defaultService, rank, 0);
  const letterOptions = defaultLetters
    .map((letter) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`)
    .join('');
  const svcKey = defaultService.trim().toLowerCase();
  const showR1Line = rank === 'R1' && svcKey.includes('sala');

  return `
    <details class="clinical-teams-details">
      <summary>Crear nuevo equipo</summary>
      <div class="clinical-teams-details-body">
        <form id="clinical-team-create-form" class="clinical-teams-create-form">
          <div class="field-group" id="clinical-team-sala-group">
            <label for="clinical-team-create-sala">Sala</label>
            <select id="clinical-team-create-sala" class="profile-input">
              <option value="">— Seleccionar sala —</option>
              ${CLINICAL_SALAS.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label for="clinical-team-create-name">Nombre del equipo (residente líder)</label>
            <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Dr. Gutiérrez" required>
          </div>
          <div class="field-group">
            <label for="clinical-team-create-service">Servicio</label>
            <select id="clinical-team-create-service" class="profile-input" required>${serviceOptions}</select>
          </div>
          <div class="field-group" id="clinical-team-r1-line-group" ${showR1Line ? '' : 'hidden'}>
            <label for="clinical-team-create-r1-line">Línea R1 en el equipo</label>
            <select id="clinical-team-create-r1-line" class="profile-input">
              <option value="0">Primera línea · A1–D1</option>
              <option value="1">Segunda línea · A2–D2</option>
            </select>
          </div>
          <div class="field-group">
            <label id="clinical-team-create-day-label" for="clinical-team-create-day">${escapeHtml(defaultMeta.label)}</label>
            <select id="clinical-team-create-day" class="profile-input" required>${letterOptions}</select>
            <p id="clinical-team-create-day-hint" class="clinical-teams-hint">${escapeHtml(defaultMeta.hint)}</p>
          </div>
          <div class="modal-actions" style="margin-top: 8px;">
            <button type="submit" class="btn-save">Crear equipo</button>
          </div>
        </form>
      </div>
    </details>`;
}

/** Una línea de contexto sin repetir sala/servicio. @param {object} team */
function renderTeamMetaLine(team) {
  const parts = [];
  const sala = String(team.sala || '').trim();
  const service = String(team.service || '').trim();
  if (sala) parts.push(sala);
  if (service && service.toLowerCase() !== 'sala') parts.push(service);
  if (!parts.length) return '';
  return `<p class="clinical-teams-card-meta">${parts.map((p) => escapeHtml(p)).join(' · ')}</p>`;
}

/**
 * @param {object} team
 * @param {string} rank
 * @param {string} [current]
 * @param {string} selectId
 */
function renderCycleSelectForRank(team, rank, current, selectId) {
  const service = String(team.service || 'Sala');
  const isSala = service.toLowerCase().includes('sala');
  const id = selectId || 'clinical-cycle-select';
  const cur = String(current || '').trim();
  let letters = [];
  if (isSala && rank === 'R2') {
    letters = getCycleLettersForTeamCreate('Sala', 'R2');
  } else if (isSala && rank === 'R1') {
    letters = [
      ...getCycleLettersForTeamCreate('Sala', 'R1', 0),
      ...getCycleLettersForTeamCreate('Sala', 'R1', 1),
    ];
  } else {
    letters = getCycleLettersForTeamCreate(service, rank);
  }
  const opts = letters
    .map(
      (l) =>
        `<option value="${escapeAttr(l)}" ${l === cur ? 'selected' : ''}>${escapeHtml(l)}</option>`
    )
    .join('');
  return `<select id="${escapeAttr(id)}" class="profile-input clinical-teams-cycle-select" required>${opts}</select>`;
}

/** @param {object} team */
function renderAddMemberCycleSelect(team) {
  const teamId = String(team.team_id || '');
  const service = String(team.service || 'Sala');
  const isSala = service.toLowerCase().includes('sala');
  const id = `clinical-add-cycle-${teamId}`;
  if (!isSala) {
    const letters = getCycleLettersForTeamCreate(service, 'R2');
    return `<select id="${escapeAttr(id)}" class="profile-input clinical-teams-add-member-cycle" required>
      ${letters.map((l) => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join('')}
    </select>`;
  }
  const r2 = getCycleLettersForTeamCreate('Sala', 'R2');
  const r1a = getCycleLettersForTeamCreate('Sala', 'R1', 0);
  const r1b = getCycleLettersForTeamCreate('Sala', 'R1', 1);
  return `<select id="${escapeAttr(id)}" class="profile-input clinical-teams-add-member-cycle" required>
    <optgroup label="R2 · A–F">${r2.map((l) => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join('')}</optgroup>
    <optgroup label="R1 · primera línea">${r1a.map((l) => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join('')}</optgroup>
    <optgroup label="R1 · segunda línea">${r1b.map((l) => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join('')}</optgroup>
  </select>`;
}

/** @param {object} m */
function renderMemberRow(m) {
  const handle = escapeHtml(m.username || m.user_id);
  const name = String(m.clinical_name || '').trim();
  const rank = escapeHtml(effectiveClinicalRank({ rank: m.rank }));
  const displayName = name ? escapeHtml(name) : handle;
  const cycle = formatMemberCycleLabel(m);
  const meta = name ? `@${handle} · ${rank}` : rank;
  const cycleHtml = cycle
    ? `<span class="clinical-teams-member-cycle">${escapeHtml(cycle)}</span>`
    : '';
  return `<li class="clinical-teams-member-row">
    <span class="clinical-teams-member-row-name">${displayName}</span>
    <span class="clinical-teams-member-row-meta">${meta}${cycleHtml ? ` · ${cycleHtml}` : ''}</span>
  </li>`;
}

/** @param {object[]} members */
function renderMembersBlock(members, { compact = false } = {}) {
  const list = Array.isArray(members) ? members : [];
  const count = list.length;
  const rows = count
    ? list.map((m) => renderMemberRow(m)).join('')
    : '<li class="clinical-teams-empty clinical-teams-empty--inline">Sin integrantes</li>';
  const heading = count === 1 ? 'Integrantes (1)' : `Integrantes (${count})`;
  return `
    <div class="clinical-teams-card-members${compact ? ' clinical-teams-card-members--compact' : ''}">
      <h6 class="clinical-teams-members-heading">${heading}</h6>
      <ul class="clinical-teams-member-rows">${rows}</ul>
    </div>`;
}

/**
 * @param {object} team
 * @param {{ user_id?: string, username?: string }} user
 */
function renderMyCycleEditBlock(team, user) {
  const teamId = String(team.team_id || '');
  const userId = String(user?.user_id || '');
  const handle = normalizeUsername(user?.username || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const me = members.find((m) => {
    if (userId && String(m.user_id) === userId) return true;
    if (handle && normalizeUsername(m.username || '') === handle) return true;
    return false;
  });
  if (!me) return '';

  const rank = effectiveClinicalRank({ rank: me.rank });
  const current = String(me.sub_area_fraction || '').trim();
  const selectId = `clinical-my-cycle-${teamId}`;
  const hint =
    rank === 'R2'
      ? 'Tu letra A–F en el ciclo de sala.'
      : rank === 'R1'
        ? 'Tu subciclo (A1–D1 o A2–D2), independiente del resto del equipo.'
        : 'Letra de rotación para este servicio.';

  return `
    <div class="clinical-teams-my-cycle-box">
      <form class="clinical-teams-my-cycle-form" data-team-id="${escapeAttr(teamId)}">
        <h6 class="clinical-teams-my-cycle-title">Mi ciclo en este equipo</h6>
        <p class="clinical-teams-hint">${escapeHtml(hint)}</p>
        <div class="clinical-teams-my-cycle-row">
          <label class="visually-hidden" for="${escapeAttr(selectId)}">Mi ciclo</label>
          ${renderCycleSelectForRank(team, rank, current, selectId)}
          <button type="submit" class="btn-save">Guardar</button>
        </div>
      </form>
    </div>`;
}

/** @param {object} team */
function renderTeamManageActionsHtml(team) {
  const teamId = escapeAttr(String(team.team_id || ''));
  const teamNameAttr = escapeAttr(String(team.name || 'Equipo'));
  return `
    <div class="clinical-teams-manage-actions">
      <button type="button" class="btn-med-secondary clinical-teams-edit-btn" data-team-id="${teamId}">Editar</button>
      <button type="button" class="btn-med-secondary clinical-teams-delete-btn" data-team-id="${teamId}" data-team-name="${teamNameAttr}">Eliminar</button>
    </div>`;
}

/** @param {object} team */
function renderTeamEditPanelHtml(team) {
  const teamId = escapeAttr(String(team.team_id || ''));
  const name = escapeHtml(String(team.name || ''));
  const sala = String(team.sala || '').trim();
  return `
    <div class="clinical-teams-edit-panel" hidden data-team-id="${teamId}">
      <form class="clinical-teams-edit-form" data-team-id="${teamId}">
        <div class="field-group">
          <label for="clinical-edit-name-${teamId}">Nombre del equipo</label>
          <input id="clinical-edit-name-${teamId}" type="text" class="profile-input clinical-teams-edit-name" value="${name}" required>
        </div>
        <div class="field-group">
          <label for="clinical-edit-sala-${teamId}">Sala</label>
          <select id="clinical-edit-sala-${teamId}" class="profile-input clinical-teams-edit-sala" required>
            ${CLINICAL_SALAS.map(
              (s) =>
                `<option value="${escapeAttr(s)}" ${sala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="clinical-teams-edit-form-actions">
          <button type="submit" class="btn-save">Guardar cambios</button>
          <button type="button" class="btn-med-secondary clinical-teams-edit-cancel">Cancelar</button>
        </div>
      </form>
    </div>`;
}

/** @param {object} team */
function renderTeamManageBlock(team) {
  const user = clinicalSessionContext.user || {};
  if (!canManageTeamRoster(user)) return { actionsHtml: '', editPanelHtml: '' };
  return {
    actionsHtml: renderTeamManageActionsHtml(team),
    editPanelHtml: renderTeamEditPanelHtml(team),
  };
}

/**
 * @param {object} team
 */
function renderJoinedTeamCard(team) {
  const user = clinicalSessionContext.user || {};
  const teamId = String(team.team_id || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const manage = renderTeamManageBlock(team);

  return `
    <article class="clinical-teams-card clinical-teams-card--mine" data-team-id="${escapeAttr(teamId)}">
      <div class="clinical-teams-card-top${manage.actionsHtml ? ' clinical-teams-card-top--directory' : ''}">
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Residente líder</p>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || 'Equipo')}</h5>
          ${renderTeamMetaLine(team)}
        </div>
        ${manage.actionsHtml ? `<div class="clinical-teams-card-actions">${manage.actionsHtml}</div>` : ''}
      </div>
      ${manage.editPanelHtml}
      ${renderMembersBlock(members)}
      ${renderMyCycleEditBlock(team, user)}
      <div class="clinical-teams-invite-box">
        <p class="clinical-teams-invite-code-line">Código para invitar: <code class="clinical-teams-invite-code">${escapeHtml(teamInviteCode(teamId))}</code></p>
        <div class="clinical-teams-invite-link-row">
          <button type="button" class="btn-med-secondary clinical-teams-copy-invite-btn" data-team-id="${escapeAttr(teamId)}">Copiar invitación</button>
          <p class="clinical-teams-invite-hint">Incluye el código e instrucciones para <strong>Mi rotación</strong> en la app R+ del Mac (no Safari).</p>
        </div>
        <form class="clinical-teams-add-member-form" data-team-id="${escapeAttr(teamId)}" data-team-service="${escapeAttr(team.service || '')}">
          <p class="clinical-teams-add-member-label">Agregar integrante</p>
          <div class="clinical-teams-add-member-fields">
            <div class="field-group clinical-teams-add-member-user">
              <label for="clinical-add-member-${escapeAttr(teamId)}">Usuario LAN</label>
              <input id="clinical-add-member-${escapeAttr(teamId)}" type="text" class="profile-input clinical-teams-add-member-input" placeholder="sin @" required aria-describedby="clinical-add-hint-${escapeAttr(teamId)}">
            </div>
            <div class="field-group clinical-teams-add-cycle-group">
              <label for="clinical-add-cycle-${escapeAttr(teamId)}">Ciclo del integrante</label>
              ${renderAddMemberCycleSelect(team)}
            </div>
            <button type="submit" class="btn-save clinical-teams-btn-add">Agregar</button>
          </div>
          <p class="clinical-teams-invite-hint" id="clinical-add-hint-${escapeAttr(teamId)}">Debe existir en Mi rotación (usuario LAN, sin @). Cada R1/R2 lleva su propio ciclo (D1, D2, A–F).</p>
        </form>
      </div>
    </article>`;
}

/**
 * @param {object} team
 * @param {{ actionHtml?: string, manageHtml?: string, editPanelHtml?: string }} [opts]
 */
function renderDirectoryTeamCard(team, opts = {}) {
  const teamId = String(team.team_id || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const action = opts.actionHtml || '';
  const manage = opts.manageHtml || '';
  const editPanel = opts.editPanelHtml || '';
  const sideActions = [action, manage].filter(Boolean).join('');

  return `
    <article class="clinical-teams-card clinical-teams-card--directory" data-team-id="${escapeAttr(teamId)}">
      <div class="clinical-teams-card-top clinical-teams-card-top--directory">
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Equipo en sala</p>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || '')}</h5>
          ${renderTeamMetaLine(team)}
        </div>
        ${sideActions ? `<div class="clinical-teams-card-actions">${sideActions}</div>` : ''}
      </div>
      ${editPanel}
      ${renderMembersBlock(members, { compact: true })}
    </article>`;
}

/**
 * @param {{ silent?: boolean }} [opts] — silent: sin pantalla «Cargando…» (actualización en caliente)
 */
export async function renderClinicalTeamsPanel(opts = {}) {
  const silent = !!opts.silent;
  if (silent) {
    const host = getClinicalTeamsPanelHost();
    if (!host) return;
    try {
      await renderClinicalTeamsPanelInto(host);
    } catch (err) {
      console.error('[Mi rotación]', err);
      setClinicalTeamsPanelError(
        err instanceof Error ? err.message : 'Error al cargar Mi rotación.'
      );
    }
    return;
  }
  await safeRenderClinicalTeamsPanel(async (host) => {
    await renderClinicalTeamsPanelInto(host);
  });
}

async function tryReconcileTeamMemberships() {
  const userId = currentUserId();
  const user = clinicalSessionContext.user;
  if (!userId || !user) return false;
  let joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  if (joined.length) return false;

  const api = dbApi();
  if (!api || typeof api.dbClinicalMembershipMigrate !== 'function') return false;

  const settings = readRpcSettings();
  const fromUserId = String(settings.clinicalStaleDeviceUserId || '');
  if (!fromUserId || fromUserId === userId) return false;

  const res = await api.dbClinicalMembershipMigrate({ fromUserId, toUserId: userId });
  if (!res?.ok) return false;
  await fetchClinicalTeamsFromDb();
  joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  return joined.length > 0;
}

function resolveDisplayLanHandle(user, usernameForInput) {
  const saved = normalizeUsername(user?.username || '');
  if (saved && isValidUsernameFormat(saved)) return saved;
  const draft = normalizeUsername(usernameForInput || '');
  if (draft && isValidUsernameFormat(draft)) return draft;
  return '';
}

async function renderClinicalTeamsPanelInto(host) {
  const userId = currentUserId();
  if (!userId) {
    host.innerHTML =
      '<p class="clinical-teams-lead">Activa la sesión clínica para gestionar equipos.</p>';
    return;
  }

  await fetchClinicalTeamsFromDb();
  await tryReconcileTeamMemberships();
  const user = clinicalSessionContext.user || {};
  const joined = filterJoinedTeams(clinicalSessionContext.teams, user);

  let clientId = '';
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    clientId = String(settings.clientId || '');
  } catch (_e) {}

  const rawUsername = String(user.username || '');
  const legacyUsername = isLegacyMachineUsername(rawUsername, clientId);
  const usernameForInput = legacyUsername
    ? String(settings.clinicalUsername || '').trim()
    : rawUsername;
  const displayHandle = resolveDisplayLanHandle(user, usernameForInput);
  const savedHandle = normalizeUsername(user.username || '');
  const handleHint = displayHandle
    ? `<p class="clinical-teams-lead clinical-teams-handle-hint">Tu usuario LAN: <strong>@${escapeHtml(displayHandle)}</strong> — compártelo para que te agreguen a un equipo.${savedHandle !== displayHandle ? ' Pulsa <strong>Guardar perfil</strong> para registrarlo en la red.' : ''}</p>`
    : '';

  const joinedHtml = joined.length
    ? joined.map((team) => renderJoinedTeamCard(team)).join('')
    : `<p class="clinical-teams-empty clinical-teams-empty--section">Aún no perteneces a ningún equipo. ${displayHandle ? 'Pide que te agreguen con tu @usuario o ' : ''}explora equipos en tu sala abajo.</p>`;
  const rank = effectiveClinicalRank(user);
  const programAdmin = hasProgramAdminPrivileges(user);
  const elevated = hasElevatedTeamPrivileges(user);
  const canViewLanUsers = canViewLanUserDirectory(user);
  const sala = String(user.sala || '').trim();

  const clinicalName = escapeHtml(user.clinical_name || '');

  const legacyBanner = legacyUsername
    ? '<p class="clinical-teams-legacy-banner">Registra tu usuario LAN (obligatorio). Sin esto no apareces en equipos ni entregas.</p>'
    : '';

  const lanDirectoryNote = canViewLanUsers
    ? ''
    : `<p class="clinical-teams-lan-directory-note">El directorio completo de usuarios LAN lo abren <strong>R4</strong>, <strong>Admin</strong> o quien tenga <strong>privilegios de administración</strong>. Al registrar <strong>@usuario</strong> debes tener la sala <strong>⇄</strong> activa (o haberte unido con invitación); R+ publica tu perfil al guardar.</p>`;

  const profileHandleBanner = displayHandle
    ? `<p class="clinical-teams-profile-handle">Visible en la red como <strong>@${escapeHtml(displayHandle)}</strong></p>`
    : '';

  const profileSection = `
    <div class="clinical-teams-profile-panel clinical-teams-rank-section">
      <h5 class="clinical-teams-subsection-title">Mi perfil y rango</h5>
      ${legacyBanner}
      ${profileHandleBanner}
      ${lanDirectoryNote}
      <form id="clinical-profile-form" class="clinical-teams-create-form">
        <div class="field-group">
          <label for="clinical-profile-username">Usuario LAN *</label>
          <input id="clinical-profile-username" type="text" class="profile-input"
            value="${escapeAttr(usernameForInput)}"
            placeholder="mgarcia" autocomplete="username"
            pattern="[a-z][a-z0-9_]{2,31}" required>
          ${hintHtml('Minúsculas, 3–32 caracteres. Tus compañeros lo usan para agregarte a equipos.')}
        </div>
        <div class="field-group">
          <label for="clinical-profile-name">Nombre en guardia</label>
          <input id="clinical-profile-name" type="text" class="profile-input" value="${clinicalName}" required>
        </div>
        <div class="field-group">
          <label for="clinical-profile-rank">Rango clínico</label>
          <select id="clinical-profile-rank" class="profile-input">
            ${['R1', 'R2', 'R3', 'R4']
              .map(
                (r) =>
                  `<option value="${r}" ${r === rank ? 'selected' : ''}>${r}</option>`
              )
              .join('')}
          </select>
          ${hintHtml('Equipos, entregas y alcance clínico.')}
        </div>
        <div class="field-group">
          <label class="clinical-teams-guardia-label">
            <input type="checkbox" id="clinical-profile-admin" ${programAdmin ? 'checked' : ''}>
            <span>Privilegios de administración</span>
          </label>
          ${hintHtml('Requiere tu código al activar. Acceso total al programa: rotación, censo global y directorio LAN.')}
        </div>
        <div class="field-group">
          <label for="clinical-profile-sala">${programAdmin ? 'Mi sala (rango clínico)' : 'Sala'}</label>
          <select id="clinical-profile-sala" class="profile-input" required>
            <option value="">— Seleccionar —</option>
            ${CLINICAL_SALAS.map(
              (s) =>
                `<option value="${escapeAttr(s)}" ${sala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
            ).join('')}
          </select>
          ${programAdmin ? hintHtml('Tu equipo y entregas usan esta sala; abajo puedes explorar otras.') : ''}
        </div>
        <div class="modal-actions clinical-teams-profile-save">
          <button type="submit" class="btn-save">Guardar perfil</button>
        </div>
      </form>
    </div>`;

  const browseSala = resolveBrowseSala(elevated, sala);
  const joinCodeSection = renderJoinWithCodeSectionHtml();
  const lanUsersEntry = renderLanUsersDirectoryEntryHtml(user);
  const directorySection = await renderDirectorySectionHtml({
    userId,
    elevated,
    browseSala,
    homeSala: sala,
  });

  host.innerHTML = `
    ${handleHint}
    <section class="clinical-teams-section clinical-teams-section--joined">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Mis equipos</h4>
        <p class="clinical-teams-section-desc">Equipos donde ya eres integrante.</p>
      </div>
      <div class="clinical-teams-list">${joinedHtml}</div>
    </section>
    ${directorySection}
    ${lanUsersEntry}
    ${joinCodeSection}
    <section class="clinical-teams-section clinical-teams-section--more">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Configuración</h4>
        <p class="clinical-teams-section-desc">Perfil clínico y equipos nuevos.</p>
      </div>
      ${profileSection}
      ${renderCreateTeamForm()}
      <details class="clinical-teams-advanced-rotation">
        <summary class="clinical-teams-advanced-rotation-summary">Zona avanzada · rotación del programa</summary>
        <div class="clinical-teams-advanced-rotation-body">
          <p class="clinical-teams-advanced-rotation-hint">Solo al cerrar un ciclo de rotación en el hospital. Archiva equipos, memberships y guardias del día; los residentes deben volver a crear equipos.</p>
          <button type="button" id="btn-nueva-rotacion" class="btn-med-secondary clinical-teams-nueva-rotacion-btn">Iniciar nueva rotación…</button>
        </div>
      </details>
    </section>`;

  wireClinicalTeamsPanelInteractions();
  wireLanUsersDirectoryControls();
  wireNuevaRotacionControl(host);
  wireJoinButtons();
  wireCopyInviteButtons();
  wireBrowseSalaControl(elevated);
}

function renderJoinWithCodeSectionHtml() {
  return `
    <section class="clinical-teams-section clinical-teams-section--join-code">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Unirte con código de equipo</h4>
        <p class="clinical-teams-section-desc">Pega el código que te envió tu R2 (8 caracteres). Úsalo en la app R+ del Mac, no en Safari.</p>
      </div>
      <form id="clinical-team-join-code-form" class="clinical-teams-join-code-form">
        <div class="clinical-teams-invite-row clinical-teams-join-code-code-row">
          <label class="visually-hidden" for="clinical-team-join-code-input">Código de equipo</label>
          <input id="clinical-team-join-code-input" type="text" class="profile-input" placeholder="ej. 2017936e" maxlength="36" autocomplete="off" required>
        </div>
        <div class="field-group clinical-teams-add-cycle-group">
          <label for="clinical-team-join-code-cycle">Tu ciclo al unirte</label>
          ${renderCycleSelectForRank({ service: 'Sala', team_id: 'join' }, effectiveClinicalRank(clinicalSessionContext.user), '', 'clinical-team-join-code-cycle')}
        </div>
        <div class="clinical-teams-join-submit-wrap">
          <button type="submit" class="btn-save">Unirme</button>
        </div>
      </form>
    </section>`;
}

function resolveBrowseSala(elevated, homeSala) {
  if (!elevated) return homeSala;
  try {
    const stored = localStorage.getItem(BROWSE_SALA_LS);
    if (stored === '__all__') return '__all__';
    if (stored && CLINICAL_SALAS.includes(stored)) return stored;
  } catch (_e) {}
  if (!homeSala) return '__all__';
  return homeSala;
}

/**
 * Compact entry point — full directory opens in a separate modal.
 * @param {object} user
 */
function renderLanUsersDirectoryEntryHtml(user) {
  if (!canViewLanUserDirectory(user)) return '';
  return `
    <div class="clinical-teams-lan-users-entry">
      <button type="button" class="btn-med-secondary clinical-teams-open-lan-users-btn" id="btn-open-lan-users-directory">
        Abrir directorio de usuarios LAN
      </button>
      <p class="clinical-teams-section-desc">Crea equipos vacíos y asigna integrantes desde aquí (ventana aparte).</p>
    </div>`;
}

function lanUsersModalBackdropEl() {
  return document.getElementById('clinical-lan-users-backdrop');
}

function lanUsersModalBodyEl() {
  return document.getElementById('clinical-lan-users-panel-body');
}

/** @type {object[]} */
let _lanUsersModalTeams = [];

function cycleLettersForAssign(team, userRank) {
  const service = String(team?.service || 'Sala');
  const rank = String(userRank || 'R1');
  const svcKey = service.trim().toLowerCase();
  if (svcKey.includes('sala') && rank === 'R2') {
    return getCycleLettersForTeamCreate('Sala', 'R2');
  }
  if (svcKey.includes('sala') && rank === 'R1') {
    return [
      ...getCycleLettersForTeamCreate('Sala', 'R1', 0),
      ...getCycleLettersForTeamCreate('Sala', 'R1', 1),
    ];
  }
  return getCycleLettersForTeamCreate(service, rank);
}

function renderLanAssignTeamOptionsHtml(teams, selectedTeamId) {
  const list = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || '').trim();
  if (!list.length) {
    return '<option value="">— Sin equipos —</option>';
  }
  return (
    '<option value="">— Equipo —</option>' +
    list
      .map((team) => {
        const id = escapeAttr(String(team.team_id || ''));
        const label = escapeHtml(
          `${String(team.name || 'Equipo').trim()} · ${String(team.sala || '').trim() || 'Sala'}`
        );
        const members = Array.isArray(team.members) ? team.members.length : 0;
        const isSelected = selected && id === selected ? ' selected' : '';
        return `<option value="${id}"${isSelected}>${label} (${members})</option>`;
      })
      .join('')
  );
}

/** @param {string} userId @param {object[]} teams */
function resolveLanUserPlacement(userId, teams) {
  const uid = String(userId || '').trim();
  if (!uid) return null;
  for (const team of teams || []) {
    const member = (team.members || []).find((m) => String(m.user_id || '') === uid);
    if (!member) continue;
    return {
      teamId: String(team.team_id || ''),
      teamName: String(team.name || 'Equipo').trim(),
      teamSala: String(team.sala || '').trim(),
      cycle: String(member.sub_area_fraction || '').trim(),
      rank: String(member.rank || ''),
    };
  }
  return null;
}

/** @param {ReturnType<typeof resolveLanUserPlacement>} placement @param {string} userRank */
function formatLanUserPlacementLabel(placement, userRank) {
  if (!placement?.teamId) return 'Sin equipo asignado';
  const parts = [placement.teamName || 'Equipo'];
  if (placement.teamSala) parts.push(placement.teamSala);
  if (placement.cycle) {
    parts.push(formatLanCycleOptionLabel(placement.cycle, userRank || placement.rank));
  }
  return parts.join(' · ');
}

const LAN_USER_RANK_ORDER = ['R1', 'R2', 'R3', 'R4', 'Admin'];

/** @param {object[]} users */
function groupLanUsersByRank(users) {
  /** @type {Map<string, object[]>} */
  const groups = new Map(LAN_USER_RANK_ORDER.map((rank) => [rank, []]));
  /** @type {object[]} */
  const other = [];
  for (const user of users) {
    const rank = String(user?.rank || 'R1');
    if (groups.has(rank)) groups.get(rank).push(user);
    else other.push(user);
  }
  return { groups, other };
}

/** @param {string} letter @param {string} userRank */
function formatLanCycleOptionLabel(letter, userRank) {
  const frac = String(letter || '').trim();
  if (!frac) return '— Ciclo —';
  const rank = String(userRank || 'R1');
  if (rank === 'R2' || /^[A-F]$/i.test(frac)) return `Ciclo R2 · ${frac}`;
  if (rank === 'R1' || /[12]$/i.test(frac)) return `Subciclo R1 · ${frac}`;
  return `Ciclo · ${frac}`;
}

/** @param {object} u @param {object[]} teamList @param {{ canDelete?: boolean, callerUserId?: string }} [opts] */
function renderLanUserRowHtml(u, teamList, opts = {}) {
  const userId = escapeAttr(String(u.user_id || ''));
  const rawUserId = String(u.user_id || '').trim();
  const canDelete =
    !!opts.canDelete &&
    rawUserId &&
    rawUserId !== String(opts.callerUserId || '').trim();
  const rawHandle = normalizeUsername(u.username || '');
  const handleValid = isValidUsernameFormat(rawHandle) && !u.lanDirectoryPending;
  const handleCell = handleValid
    ? `<span class="clinical-lan-users-handle">@${escapeHtml(rawHandle)}</span>`
    : `<span class="clinical-lan-users-handle clinical-lan-users-handle--pending" title="Falta registrar @usuario en Mi rotación">sin @usuario</span>`;
  const name = escapeHtml(String(u.clinical_name || '').trim() || 'Sin nombre');
  const rankRaw = escapeAttr(String(u.rank || 'R1'));
  const salaLabel = escapeHtml(String(u.sala || '').trim() || '—');
  const placement = resolveLanUserPlacement(u.user_id, teamList);
  const placementLabel = escapeHtml(formatLanUserPlacementLabel(placement, String(u.rank || 'R1')));
  const teamOptions = renderLanAssignTeamOptionsHtml(teamList, placement?.teamId);
  const cycleOptions = placement?.cycle
    ? `<option value="${escapeAttr(placement.cycle)}" selected>${escapeHtml(formatLanCycleOptionLabel(placement.cycle, String(u.rank || 'R1')))}</option>`
    : '<option value="">— Ciclo —</option>';

  return `<tr class="clinical-lan-user-row" data-user-id="${userId}" data-user-rank="${rankRaw}" data-preferred-cycle="${escapeAttr(placement?.cycle || '')}">
    <td class="clinical-lan-users-col-handle">
      ${handleCell}
    </td>
    <td class="clinical-lan-users-col-name">
      <span class="clinical-lan-users-name" title="${name}">${name}</span>
    </td>
    <td class="clinical-lan-users-col-placement">
      <span class="clinical-lan-users-placement" title="${placementLabel}">${placementLabel}</span>
    </td>
    <td class="clinical-lan-users-col-sala">${salaLabel}</td>
    <td class="clinical-lan-users-col-team">
      <label class="visually-hidden" for="clinical-lan-team-${userId}">Equipo</label>
      <select id="clinical-lan-team-${userId}" class="profile-input clinical-lan-assign-team">${teamOptions}</select>
    </td>
    <td class="clinical-lan-users-col-cycle">
      <label class="visually-hidden" for="clinical-lan-cycle-${userId}">Ciclo</label>
      <select id="clinical-lan-cycle-${userId}" class="profile-input clinical-lan-assign-cycle" ${placement?.teamId ? '' : 'disabled'}>
        ${cycleOptions}
      </select>
    </td>
    <td class="clinical-lan-users-col-action">
      <div class="clinical-lan-users-action-row">
        <button type="button" class="btn-save clinical-lan-assign-btn" data-user-id="${userId}">Asignar</button>
        ${
          canDelete
            ? `<button type="button" class="btn-med-secondary clinical-lan-delete-user-btn" data-user-id="${userId}" data-user-label="${escapeAttr(String(u.clinical_name || rawHandle || rawUserId))}" title="Quitar de la base clínica en esta Mac y sincronizar en ⇄">Eliminar</button>`
            : ''
        }
      </div>
    </td>
  </tr>`;
}

/** @param {object[]} users @param {object[]} teams @param {{ canDelete?: boolean, callerUserId?: string }} [opts] */
function renderLanUsersModalBodyHtml(users, teams, opts = {}) {
  const list = Array.isArray(users) ? users : [];
  const teamList = Array.isArray(teams) ? teams : [];
  const rowOpts = {
    canDelete: !!opts.canDelete,
    callerUserId: String(opts.callerUserId || ''),
  };

  if (!list.length) {
    return `<p class="clinical-teams-empty">Aún no hay otros usuarios en esta Mac. Pide a tus compañeros que guarden <strong>Mi rotación → Guardar perfil</strong> con su @usuario y que estén en la misma sala <strong>⇄</strong> (sincronización en vivo).</p>`;
  }

  const { groups, other } = groupLanUsersByRank(list);
  const tableHead = `<thead><tr>
    <th scope="col">@usuario</th>
    <th scope="col">Nombre</th>
    <th scope="col">Ubicación actual</th>
    <th scope="col">Sala</th>
    <th scope="col">Asignar equipo</th>
    <th scope="col">Ciclo</th>
    <th scope="col"><span class="visually-hidden">Acción</span></th>
  </tr></thead>`;

  const rankSections = LAN_USER_RANK_ORDER.map((rank) => {
    const usersInRank = groups.get(rank) || [];
    if (!usersInRank.length) return '';
    return `<details class="clinical-lan-rank-group" open>
      <summary class="clinical-lan-rank-group-summary">
        <span class="clinical-lan-rank-group-title">${escapeHtml(rank)}</span>
        <span class="clinical-lan-rank-group-count">${usersInRank.length}</span>
      </summary>
      <div class="clinical-lan-users-table-wrap">
        <table class="clinical-lan-users-table clinical-lan-users-table--assign">
          ${tableHead}
          <tbody>${usersInRank.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join('')}</tbody>
        </table>
      </div>
    </details>`;
  }).join('');

  const otherSection = other.length
    ? `<details class="clinical-lan-rank-group" open>
        <summary class="clinical-lan-rank-group-summary">
          <span class="clinical-lan-rank-group-title">Otros</span>
          <span class="clinical-lan-rank-group-count">${other.length}</span>
        </summary>
        <div class="clinical-lan-users-table-wrap">
          <table class="clinical-lan-users-table clinical-lan-users-table--assign">
            ${tableHead}
            <tbody>${other.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join('')}</tbody>
          </table>
        </div>
      </details>`
    : '';

  const teamsHint = teamList.length
    ? ''
    : '<p class="clinical-teams-empty">Crea un equipo vacío en Mi rotación para poder asignar residentes.</p>';

  return `
    <p class="clinical-lan-users-modal-lead">${list.length} usuario${list.length === 1 ? '' : 's'} · <strong>todas las salas</strong> en esta Mac (no filtra por tu sala). Asigna a cualquier equipo activo.</p>
    ${teamsHint}
    <div class="clinical-lan-rank-groups">${rankSections}${otherSection}</div>`;
}

function syncLanAssignCycleSelect(teamSelect, preferredCycle = '') {
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const row = teamSelect.closest('.clinical-lan-user-row');
  const cycleSelect = row?.querySelector('.clinical-lan-assign-cycle');
  if (!(cycleSelect instanceof HTMLSelectElement)) return;

  const teamId = String(teamSelect.value || '').trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">— Ciclo —</option>';
    cycleSelect.disabled = true;
    return;
  }

  const team = _lanUsersModalTeams.find((t) => String(t.team_id) === teamId);
  const userId = String(row?.dataset.userId || '').trim();
  const userRank = String(row?.dataset.userRank || 'R1');
  const letters = team ? cycleLettersForAssign(team, userRank) : [];
  const rowPreferred = String(preferredCycle || row?.dataset.preferredCycle || '').trim();
  let defaultCycle = team ? resolveMembershipCycleForUser(team, userId, userRank) : letters[0] || 'A';
  if (rowPreferred && letters.includes(rowPreferred)) {
    defaultCycle = rowPreferred;
  }

  cycleSelect.innerHTML = letters
    .map((letter) => {
      const label = formatLanCycleOptionLabel(letter, userRank);
      return `<option value="${escapeAttr(letter)}" ${letter === defaultCycle ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  cycleSelect.disabled = letters.length === 0;
  cycleSelect.value = defaultCycle;
}

/** @param {Element} row */
function initLanUserRowAssignState(row) {
  const teamSelect = row.querySelector('.clinical-lan-assign-team');
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const preferred = String(row.dataset.preferredCycle || '').trim();
  syncLanAssignCycleSelect(teamSelect, preferred);
}

async function handleLanAssignUserToTeam(userId, teamId, subAreaFraction) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('No se pudo asignar.', 'error');
    return false;
  }
  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se asignó al equipo.', 'error');
    return false;
  }
  return true;
}

async function handleLanDeleteDirectoryUserClick(btn) {
  const userId = String(btn.dataset.userId || '').trim();
  if (!userId) return;
  const label = String(btn.dataset.userLabel || '').trim() || userId;
  const api = dbApi();
  if (!api || typeof api.dbClinicalUserDelete !== 'function') {
    toast('Eliminar usuarios requiere R+ de escritorio con base clínica desbloqueada.', 'error');
    return;
  }
  const confirmed = window.confirm(
    `¿Eliminar a «${label}» de la base clínica en esta Mac?\n\nDesaparecerá del directorio LAN. Las demás R+ en la misma sala ⇄ lo quitarán al sincronizar.`
  );
  if (!confirmed) return;

  btn.disabled = true;
  const res = await api.dbClinicalUserDelete({
    targetUserId: userId,
    callerUserId: currentUserId(),
  });
  btn.disabled = false;
  if (!res?.ok) {
    toast(res?.error || 'No se pudo eliminar el usuario.', 'error');
    return;
  }

  toast('Usuario eliminado de esta Mac.', 'success');
  const { flushClinicalProfileToLan } = await import('../clinical-profile-lan-sync.mjs');
  const lanPush = await flushClinicalProfileToLan();
  if (!lanPush.ok && lanPush.code !== 'NO_LAN') {
    toast(
      'Usuario eliminado aquí, pero no se pudo publicar el cambio a la sala ⇄. Revisa la conexión.',
      'warning'
    );
  }
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await openLanUsersDirectoryModal();
}

async function handleLanAssignButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  const row = btn.closest('.clinical-lan-user-row');
  if (!row) return;

  const userId = String(btn.dataset.userId || row.dataset.userId || '').trim();
  const teamSelect = row.querySelector('.clinical-lan-assign-team');
  const cycleSelect = row.querySelector('.clinical-lan-assign-cycle');
  const teamId =
    teamSelect instanceof HTMLSelectElement ? String(teamSelect.value || '').trim() : '';
  let subAreaFraction =
    cycleSelect instanceof HTMLSelectElement ? String(cycleSelect.value || '').trim() : '';

  if (!userId || !teamId) {
    toast('Elige un equipo.', 'error');
    return;
  }

  const team = _lanUsersModalTeams.find((t) => String(t.team_id) === teamId);
  const userRank = String(row.dataset.userRank || 'R1');
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, userRank);
  }
  if (!subAreaFraction) {
    toast('Elige el ciclo del integrante.', 'error');
    return;
  }

  const wasMember = Boolean(
    team?.members?.some((m) => String(m.user_id || '') === userId)
  );

  btn.disabled = true;
  const ok = await handleLanAssignUserToTeam(userId, teamId, subAreaFraction);
  btn.disabled = false;
  if (!ok) return;

  toast(wasMember ? 'Ciclo actualizado.' : 'Integrante asignado al equipo.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await fetchClinicalTeamsFromDb();
  await openLanUsersDirectoryModal();
}

/** @param {HTMLElement} host */
async function loadLanUsersDirectoryIntoHost(host) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalUsersList !== 'function') {
    host.innerHTML =
      '<p class="clinical-teams-empty">Directorio solo en la app de escritorio R+ (base clínica desbloqueada). En iPad/móvil usa el censo LAN; Mi rotación con directorio requiere Mac.</p>';
    return;
  }

  const callerUserId = currentUserId();
  const [usersRes, teamsRes] = await Promise.all([
    api.dbClinicalUsersList({ callerUserId }),
    typeof api.dbClinicalTeamsList === 'function' ? api.dbClinicalTeamsList() : Promise.resolve(null),
  ]);

  if (!usersRes?.ok) {
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(usersRes?.error || 'No se pudo cargar el directorio.')}</p>`;
    return;
  }

  _lanUsersModalTeams =
    teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [];

  const sessionUser = clinicalSessionContext.user || {};
  host.innerHTML = renderLanUsersModalBodyHtml(usersRes.users, _lanUsersModalTeams, {
    canDelete: canDeleteLanDirectoryUser(sessionUser),
    callerUserId: currentUserId(),
  });
  host.querySelectorAll('.clinical-lan-user-row').forEach((row) => initLanUserRowAssignState(row));

  const title = document.getElementById('clinical-lan-users-title');
  if (title) {
    const n = Array.isArray(usersRes.users) ? usersRes.users.length : 0;
    title.textContent = `Directorio de usuarios LAN (${n})`;
  }
}

function backgroundRefreshLanUsersDirectory() {
  void import('./lan-sync.mjs')
    .then((lanMod) => {
      if (typeof lanMod.refreshLanClinicalDirectoryFromRoom !== 'function') return false;
      return lanMod.refreshLanClinicalDirectoryFromRoom({ timeoutMs: 5000 });
    })
    .then((refreshed) => {
      if (!refreshed) return;
      const host = lanUsersModalBodyEl();
      const bd = lanUsersModalBackdropEl();
      if (!host || !bd?.classList.contains('open')) return;
      return loadLanUsersDirectoryIntoHost(host);
    })
    .catch(() => {});
}

export async function openLanUsersDirectoryModal() {
  const user = clinicalSessionContext.user || {};
  if (!canViewLanUserDirectory(user)) return;

  const bd = lanUsersModalBackdropEl();
  const host = lanUsersModalBodyEl();
  if (!bd || !host) return;

  host.innerHTML = '<p class="clinical-teams-empty">Cargando directorio…</p>';
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');

  try {
    await loadLanUsersDirectoryIntoHost(host);
  } catch (err) {
    console.error('[Directorio LAN]', err);
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(
      err instanceof Error ? err.message : 'No se pudo cargar el directorio.'
    )}</p>`;
  }

  backgroundRefreshLanUsersDirectory();
}

export function closeLanUsersDirectoryModal() {
  const bd = lanUsersModalBackdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

function wireLanUsersDirectoryControls() {
  if (typeof document !== 'undefined' && !document._rpcLanUsersOpsSyncedWired) {
    document._rpcLanUsersOpsSyncedWired = true;
    document.addEventListener('rpc-clinical-ops-synced', () => {
      const bd = lanUsersModalBackdropEl();
      const host = lanUsersModalBodyEl();
      if (!bd?.classList.contains('open') || !host) return;
      void loadLanUsersDirectoryIntoHost(host);
    });
  }

  const openBtn = document.getElementById('btn-open-lan-users-directory');
  if (openBtn) {
    openBtn.onclick = () => void openLanUsersDirectoryModal();
  }

  const bd = lanUsersModalBackdropEl();
  if (bd && !bd._rpcLanUsersBackdropWired) {
    bd._rpcLanUsersBackdropWired = true;
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) closeLanUsersDirectoryModal();
    });
  }

  const closeBtn = document.getElementById('btn-clinical-lan-users-close');
  if (closeBtn && !closeBtn._rpcLanUsersCloseWired) {
    closeBtn._rpcLanUsersCloseWired = true;
    closeBtn.addEventListener('click', () => closeLanUsersDirectoryModal());
  }

  const host = lanUsersModalBodyEl();
  if (host && !host._rpcLanUsersAssignWired) {
    host._rpcLanUsersAssignWired = true;
    host.addEventListener('change', (ev) => {
      const teamSelect = ev.target instanceof Element ? ev.target.closest('.clinical-lan-assign-team') : null;
      if (teamSelect) syncLanAssignCycleSelect(teamSelect);
    });
    host.addEventListener('click', (ev) => {
      const delBtn =
        ev.target instanceof Element ? ev.target.closest('.clinical-lan-delete-user-btn') : null;
      if (delBtn) {
        void handleLanDeleteDirectoryUserClick(delBtn);
        return;
      }
      const btn = ev.target instanceof Element ? ev.target.closest('.clinical-lan-assign-btn') : null;
      if (btn) void handleLanAssignButtonClick(btn);
    });
  }
}

/**
 * @param {{ userId: string, elevated: boolean, browseSala: string, homeSala: string }} opts
 */
async function renderDirectorySectionHtml(opts) {
  const { userId, elevated, browseSala, homeSala } = opts;
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsListBySala !== 'function') return '';

  const listOpts =
    elevated && browseSala === '__all__'
      ? { sala: '', forUserId: userId, allSalas: true }
      : { sala: browseSala || homeSala, forUserId: userId };

  const res = await api.dbClinicalTeamsListBySala(listOpts);
  let directory = res?.ok && Array.isArray(res.teams) ? res.teams : [];
  directory = directory.filter((t) => !t.isMember);

  const browseControl = elevated
    ? `<label class="clinical-teams-browse-label" for="clinical-browse-sala">Sala</label>
        <select id="clinical-browse-sala" class="profile-input clinical-teams-browse-select" aria-label="Explorar equipos por sala">
          ${CLINICAL_SALAS.map(
            (s) =>
              `<option value="${escapeAttr(s)}" ${browseSala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
          ).join('')}
          <option value="__all__" ${browseSala === '__all__' ? 'selected' : ''}>Todas las salas</option>
        </select>`
    : '';

  const sectionTitle = elevated
    ? browseSala === '__all__'
      ? 'Explorar · todas las salas'
      : `Explorar · ${escapeHtml(browseSala)}`
    : `Otros equipos · ${escapeHtml(browseSala || homeSala)}`;

  const headRow = browseControl
    ? `<div class="clinical-teams-section-head-row">
        <div class="clinical-teams-section-intro">
          <h4 class="clinical-teams-section-title">${sectionTitle}</h4>
          <p class="clinical-teams-section-desc">Equipos de la sala a los que puedes unirte.</p>
        </div>
        ${browseControl}
      </div>`
    : `<div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">${sectionTitle}</h4>
        <p class="clinical-teams-section-desc">Equipos de la sala a los que puedes unirte.</p>
      </div>`;

  if (!directory.length) {
    const label =
      browseSala === '__all__' ? 'ninguna sala' : escapeHtml(String(browseSala || homeSala));
    const emptyMsg = elevated
      ? `No hay otros equipos en ${label}. Los tuyos aparecen arriba.`
      : `No hay otros equipos disponibles en ${label}.`;
    return `<section class="clinical-teams-section clinical-teams-section--directory">
      ${headRow}
      <p class="clinical-teams-empty">${emptyMsg}</p>
    </section>`;
  }

  const cards = directory
    .map((team) => {
      const teamId = String(team.team_id || '');
      let action = '';
      if (team.joinEligible) {
        action = `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr(teamId)}">Unirme</button>`;
      } else if (team.joinReason) {
        action = `<span class="clinical-teams-join-hint">${escapeHtml(team.joinReason)}</span>`;
      }
      const manage = elevated ? renderTeamManageBlock(team) : { actionsHtml: '', editPanelHtml: '' };
      return renderDirectoryTeamCard(team, {
        actionHtml: action,
        manageHtml: manage.actionsHtml,
        editPanelHtml: manage.editPanelHtml,
      });
    })
    .join('');

  return `
    <section class="clinical-teams-section clinical-teams-section--directory">
      ${headRow}
      <div class="clinical-teams-list">${cards}</div>
    </section>`;
}

function wireBrowseSalaControl(elevated) {
  if (!elevated) return;
  const select = document.getElementById('clinical-browse-sala');
  if (!select || select._rpcBrowseWired) return;
  select._rpcBrowseWired = true;
  select.addEventListener('change', () => {
    try {
      localStorage.setItem(BROWSE_SALA_LS, String(select.value || ''));
    } catch (_e) {}
    void renderClinicalTeamsPanel({ silent: true });
  });
}

function closeTeamEditPanels(exceptPanel) {
  document.querySelectorAll('.clinical-teams-edit-panel').forEach((panel) => {
    if (exceptPanel && panel === exceptPanel) return;
    panel.hidden = true;
  });
}

function teamManageDelegationRoot() {
  return (
    document.getElementById('clinical-teams-panel-body') ||
    teamsModalEl()?.querySelector('.clinical-teams-modal') ||
    null
  );
}

function wireTeamManageModalDelegation() {
  const root = teamManageDelegationRoot();
  if (!root || root._rpcTeamManageDelegated) return;
  root._rpcTeamManageDelegated = true;

  root.addEventListener('click', (ev) => {
    if (!canManageTeamRoster(clinicalSessionContext.user)) return;
    const target = ev.target instanceof Element ? ev.target : null;
    if (!target) return;

    const editBtn = target.closest('.clinical-teams-edit-btn');
    if (editBtn) {
      const card = editBtn.closest('.clinical-teams-card');
      const panel = card?.querySelector('.clinical-teams-edit-panel');
      if (panel instanceof HTMLElement) {
        closeTeamEditPanels(panel);
        panel.hidden = !panel.hidden;
      }
      return;
    }

    const cancelBtn = target.closest('.clinical-teams-edit-cancel');
    if (cancelBtn) {
      const panel = cancelBtn.closest('.clinical-teams-edit-panel');
      if (panel instanceof HTMLElement) panel.hidden = true;
      return;
    }

    const deleteBtn = target.closest('.clinical-teams-delete-btn');
    if (deleteBtn instanceof HTMLButtonElement) {
      void handleDeleteTeamClick(deleteBtn);
    }
  });
}

/** @param {HTMLButtonElement} btn */
async function handleDeleteTeamClick(btn) {
  const teamId = String(btn.dataset.teamId || '').trim();
  const teamName = String(btn.dataset.teamName || 'este equipo').trim();
  if (!teamId) return;

  const ok = window.confirm(
    `¿Eliminar el equipo «${teamName}»?\n\nSe quitarán sus integrantes. Esta acción no se puede deshacer.`
  );
  if (!ok) return;

  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api || typeof api.dbClinicalTeamsArchive !== 'function') {
    toast('No se pudo eliminar el equipo.', 'error');
    return;
  }

  btn.disabled = true;
  const res = await api.dbClinicalTeamsArchive({ teamId, callerUserId: userId });
  btn.disabled = false;

  if (!res || res.ok === false) {
    toast(res?.error || 'No se eliminó el equipo.', 'error');
    return;
  }

  toast('Equipo eliminado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
}

/** @param {Event} ev @param {HTMLFormElement} form */
async function handleEditTeamSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || '').trim();
  const nameInput = form.querySelector('.clinical-teams-edit-name');
  const salaSelect = form.querySelector('.clinical-teams-edit-sala');
  const name =
    nameInput instanceof HTMLInputElement ? String(nameInput.value || '').trim() : '';
  const sala =
    salaSelect instanceof HTMLSelectElement ? String(salaSelect.value || '').trim() : '';

  if (!teamId || !name || !sala) {
    toast('Indica nombre y sala.', 'error');
    return;
  }

  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api || typeof api.dbClinicalTeamsUpdate !== 'function') {
    toast('No se pudo guardar el equipo.', 'error');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  const res = await api.dbClinicalTeamsUpdate({
    teamId,
    name,
    sala,
    callerUserId: userId,
  });
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;

  if (!res || res.ok === false) {
    toast(res?.error || 'No se guardó el equipo.', 'error');
    return;
  }

  toast('Equipo actualizado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
}

async function handleProfileFormSubmit(ev) {
  ev.preventDefault();
  const username = normalizeUsername(
    String(document.getElementById('clinical-profile-username')?.value || '')
  );
  let rank = String(document.getElementById('clinical-profile-rank')?.value || 'R1');
  const sala = String(document.getElementById('clinical-profile-sala')?.value || '');
  const clinicalName = String(document.getElementById('clinical-profile-name')?.value || '').trim();
  const adminCb = document.getElementById('clinical-profile-admin');
  const wantsProgramAdmin = adminCb instanceof HTMLInputElement ? adminCb.checked : false;
  const wasProgramAdmin = hasProgramAdminPrivileges(clinicalSessionContext.user);

  /** @type {boolean|undefined} */
  let isProgramAdmin;
  /** @type {string|null} */
  let adminAccessCode = null;

  if (wantsProgramAdmin !== wasProgramAdmin) {
    isProgramAdmin = wantsProgramAdmin;
    if (wantsProgramAdmin) {
      if (!adminAccessGrantedThisSession) {
        const code = await promptAdminAccessCode();
        if (!code || !verifyAdminAccessCode(code)) {
          if (adminCb instanceof HTMLInputElement) adminCb.checked = wasProgramAdmin;
          if (code != null) toast('Código incorrecto.', 'error');
          return;
        }
        adminAccessGrantedThisSession = true;
        verifiedAdminAccessCode = code;
      }
      adminAccessCode = verifiedAdminAccessCode;
    }
  }

  if (!isValidUsernameFormat(username)) {
    toast('Usuario inválido. Usa 3–32 caracteres en minúsculas: letras, números y _.', 'error');
    return;
  }
  if (!clinicalName) {
    toast('Escribe tu nombre en guardia.', 'error');
    return;
  }

  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api) {
    toast('Sesión clínica no disponible. Desbloquea la base de datos.', 'error');
    return;
  }

  const currentUsername = normalizeUsername(clinicalSessionContext.user?.username || '');
  const usernameWillChange = username !== currentUsername;
  if (usernameWillChange) {
    const { applyPendingLanInviteFromPage, assertLanRoomForUsernameRegister, LAN_USERNAME_REGISTER_REQUIRES_ROOM_MSG } =
      await import('../clinical-profile-lan-sync.mjs');
    await applyPendingLanInviteFromPage();
    const lanGate = await assertLanRoomForUsernameRegister();
    if (!lanGate.allowed) {
      toast(LAN_USERNAME_REGISTER_REQUIRES_ROOM_MSG, 'error');
      return;
    }
    if (currentUsername && !isLegacyMachineUsername(currentUsername, clientIdFromSettings())) {
      const ok = window.confirm(
        `¿Cambiar tu usuario de @${currentUsername} a @${username}? Los equipos verán el nuevo nombre.`
      );
      if (!ok) return;
    }
    if (typeof api.dbClinicalUsernameClaim !== 'function') {
      toast('No se pudo guardar el usuario LAN.', 'error');
      return;
    }
    const claimRes = await api.dbClinicalUsernameClaim({ userId, username });
    if (!claimRes?.ok) {
      const errMsg = String(claimRes?.error || '');
      if (/ya está en uso/i.test(errMsg)) {
        let settings = {};
        try {
          settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
        } catch (_e) {}
        const resume =
          window.confirm(
            `El usuario @${username} ya existe.\n\n¿Recuperar tu cuenta en este dispositivo?`
          );
        if (!resume) {
          toast(errMsg, 'error');
          return;
        }
        const resumeRes = await resumeClinicalIdentityByUsername(
          username,
          settings,
          clientIdFromSettings()
        );
        if (!resumeRes.ok) {
          toast(resumeRes.error || errMsg, 'error');
          return;
        }
      } else {
        toast(errMsg || 'No se pudo guardar el usuario.', 'error');
        return;
      }
    }
    if (clinicalSessionContext.user) {
      clinicalSessionContext.user.username = username;
    }
  }

  const ok = await persistProfileFromPanel({
    rank,
    sala,
    clinicalName,
    isProgramAdmin,
    username,
    adminAccessCode,
  });
  if (!ok) return;
  await refreshClinicalUserProfile();
  const msg =
    wantsProgramAdmin && (isProgramAdmin === true || wasProgramAdmin)
      ? 'Perfil guardado. Privilegios de administración activos.'
      : 'Perfil guardado.';
  const { flushClinicalProfileToLan, LAN_PROFILE_PUSH_FAILED_MSG } = await import(
    '../clinical-profile-lan-sync.mjs'
  );
  const lanPush = await flushClinicalProfileToLan();
  if (!lanPush.ok && lanPush.code !== 'NO_LAN') {
    toast(LAN_PROFILE_PUSH_FAILED_MSG, 'warning');
  } else if (usernameWillChange && lanPush.ok) {
    toast(`${msg} @usuario publicado en la sala ⇄.`, 'success');
  } else {
    toast(msg, 'success');
  }
  syncRotationConfigButton();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  void import('./lan-sync.mjs')
    .then((mod) => {
      if (typeof mod.scheduleLiveSyncPush === 'function') mod.scheduleLiveSyncPush();
    })
    .catch(() => {});
  void import('./patients.mjs')
    .then((m) => m.renderPatientList())
    .catch(() => {});
}

function clientIdFromSettings() {
  try {
    return String(JSON.parse(localStorage.getItem('rpc-settings') || '{}').clientId || '');
  } catch (_e) {
    return '';
  }
}

function wireJoinButtons() {
  document.querySelectorAll('.clinical-teams-join-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcJoinWired) return;
    btn._rpcJoinWired = true;
    btn.addEventListener('click', async () => {
      const teamId = String(btn.dataset.teamId || '');
      const userId = currentUserId();
      const api = dbApi();
      if (!api || typeof api.dbClinicalTeamsJoin !== 'function') {
        toast('No se pudo unir al equipo.', 'error');
        return;
      }
      const team = (clinicalSessionContext.teams || []).find(
        (t) => String(t.team_id) === teamId
      );
      const rank = effectiveClinicalRank(clinicalSessionContext.user);
      const cycle = inferMembershipCycleForJoin(team || {}, rank);
      const res = await api.dbClinicalTeamsJoin({
        teamId,
        userId,
        subAreaFraction: cycle,
      });
      if (!res || res.ok === false) {
        toast(res?.error || 'No se pudo unir al equipo.', 'error');
        return;
      }
      toast('Te uniste al equipo.', 'success');
      document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    });
  });
}

function wireCopyInviteButtons() {
  document.querySelectorAll('.clinical-teams-copy-invite-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcInviteWired) return;
    btn._rpcInviteWired = true;
    btn.addEventListener('click', () => {
      const teamId = String(btn.dataset.teamId || '');
      const team = (clinicalSessionContext.teams || []).find(
        (t) => String(t.team_id) === teamId
      );
      if (!team) {
        toast('Equipo no encontrado.', 'error');
        return;
      }
      const text = buildClinicalTeamInviteMessage(team);
      void copyToClipboardSafe(text).then((ok) => {
        toast(
          ok ? 'Invitación copiada. Pégala en WhatsApp o correo.' : 'No se pudo copiar.',
          ok ? 'success' : 'error'
        );
      });
    });
  });
}

async function persistProfileFromPanel({
  rank,
  sala,
  clinicalName,
  isProgramAdmin,
  username,
  adminAccessCode,
}) {
  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api || typeof api.dbClinicalProfileUpsert !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return false;
  }
  const res = await api.dbClinicalProfileUpsert({
    userId,
    clinicalName: clinicalName || clinicalSessionContext.user?.clinical_name || '',
    rank: rank || effectiveClinicalRank(clinicalSessionContext.user),
    sala: sala ?? clinicalSessionContext.user?.sala ?? null,
    isProgramAdmin,
    adminAccessCode: adminAccessCode ?? undefined,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se guardó el perfil.', 'error');
    return false;
  }
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {}
  persistClinicalUserBinding({
    userId,
    username: username || settings.clinicalUsername,
    displayName: clinicalName || settings.clinicalDisplayName,
    rank: rank || settings.clinicalRank,
    sala: sala ?? settings.clinicalSala,
    isProgramAdmin,
  });
  if (clinicalSessionContext.user) {
    const savedRank = String(res.profile?.rank || rank || '');
    clinicalSessionContext.user.rank =
      savedRank === 'Admin' ? 'R1' : savedRank || clinicalSessionContext.user.rank;
    if (sala != null) clinicalSessionContext.user.sala = sala;
    if (clinicalName) clinicalSessionContext.user.clinical_name = clinicalName;
    if (res.profile?.username) clinicalSessionContext.user.username = res.profile.username;
    if (isProgramAdmin !== undefined) {
      clinicalSessionContext.user.is_program_admin = isProgramAdmin ? 1 : 0;
    } else if (res.profile?.is_program_admin != null) {
      clinicalSessionContext.user.is_program_admin = res.profile.is_program_admin === 1 ? 1 : 0;
    }
    if (String(res.profile?.rank || '') === 'Admin') {
      clinicalSessionContext.user.is_program_admin = 1;
    }
  }
  return true;
}

export function wireClinicalTeamsPanelInteractions() {
  syncSalaFieldVisibility();
  wireAdminCheckboxGate();

  const serviceSelect = document.getElementById('clinical-team-create-service');
  if (serviceSelect && !serviceSelect._rpcServiceWired) {
    serviceSelect._rpcServiceWired = true;
    serviceSelect.addEventListener('change', () => {
      syncCreateTeamCycleField();
      syncSalaFieldVisibility();
    });
  }

  const r1LineSelect = document.getElementById('clinical-team-create-r1-line');
  if (r1LineSelect && !r1LineSelect._rpcR1LineWired) {
    r1LineSelect._rpcR1LineWired = true;
    r1LineSelect.addEventListener('change', () => syncCreateTeamCycleField());
  }
}

function wireAdminCheckboxGate() {
  const cb = document.getElementById('clinical-profile-admin');
  if (!(cb instanceof HTMLInputElement) || cb._rpcAdminGateWired) return;
  cb._rpcAdminGateWired = true;

  const hadAdminOnLoad =
    cb.checked || hasProgramAdminPrivileges(clinicalSessionContext.user);
  if (hadAdminOnLoad) {
    adminAccessGrantedThisSession = true;
  }

  cb.addEventListener('click', (ev) => {
    if (cb.checked) {
      adminAccessGrantedThisSession = false;
      verifiedAdminAccessCode = null;
      return;
    }
    if (adminAccessGrantedThisSession) return;

    ev.preventDefault();
    void promptAdminAccessCode().then((code) => {
      if (code && verifyAdminAccessCode(code)) {
        cb.checked = true;
        adminAccessGrantedThisSession = true;
        verifiedAdminAccessCode = code;
        return;
      }
      cb.checked = false;
      if (code != null) toast('Código incorrecto.', 'error');
    });
  });
}

/** @param {Event} ev */
async function handleCreateTeamSubmit(ev) {
  ev.preventDefault();
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsCreate !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const name = String(document.getElementById('clinical-team-create-name')?.value || '').trim();
  const userId = currentUserId();
  const elevated = canManageTeamRoster(clinicalSessionContext.user);

  if (!name) {
    toast('Indica el nombre del equipo.', 'error');
    return;
  }

  let sala = String(document.getElementById('clinical-team-create-sala')?.value || '').trim();
  if (!sala) {
    sala = String(clinicalSessionContext.user?.sala || '').trim();
  }
  if (!sala) {
    toast('Selecciona la sala del equipo.', 'error');
    return;
  }

  if (elevated) {
    const res = await api.dbClinicalTeamsCreate({
      name,
      service: 'Sala',
      onCallDayIndex: 0,
      sala,
      teamLeaderName: name,
      createdBy: userId,
    });
    if (!res || res.ok === false) {
      toast(res?.error || 'No se creó el equipo.', 'error');
      return;
    }
    toast('Equipo vacío creado. Asigna integrantes desde el directorio LAN.', 'success');
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    return;
  }

  const service = String(document.getElementById('clinical-team-create-service')?.value || '').trim();
  const cycleLetter = String(document.getElementById('clinical-team-create-day')?.value || 'A').trim();

  if (!service) {
    toast('Indica nombre y servicio.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsCreate({
    name,
    service,
    subAreaFraction: cycleLetter,
    onCallDayIndex: 0,
    sala,
    teamLeaderName: name,
    createdBy: userId,
  });

  if (!res || res.ok === false) {
    toast(res?.error || 'No se creó el equipo.', 'error');
    return;
  }

  const teamId = String(res.team?.team_id || '');
  if (teamId && typeof api.dbClinicalTeamsMemberAdd === 'function') {
    const addRes = await api.dbClinicalTeamsMemberAdd({
      teamId,
      userId,
      subAreaFraction: cycleLetter,
    });
    if (!addRes || addRes.ok === false) {
      toast(addRes?.error || 'Equipo creado pero no se pudo unir automáticamente.', 'error');
    }
  }

  toast('Equipo creado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
}

/**
 * @param {Event} ev
 * @param {HTMLFormElement} form
 */
async function handleAddMemberSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || '');
  const usernameInput = form.querySelector('.clinical-teams-add-member-input');
  const username =
    usernameInput instanceof HTMLInputElement
      ? String(usernameInput.value || '').trim()
      : '';
  if (!teamId || !username) {
    toast('Escribe el username del residente.', 'error');
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const handle = normalizeUsername(username);
  if (!isValidUsernameFormat(handle)) {
    toast('Usuario inválido. Usa 3–32 caracteres: letras minúsculas, números y _ (sin @).', 'error');
    return;
  }

  const cycleEl = form.querySelector('.clinical-teams-add-member-cycle');
  const subAreaFraction =
    cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || '').trim() : '';
  if (!subAreaFraction) {
    toast('Elige el ciclo del integrante.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    username: handle,
    subAreaFraction,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se agregó el miembro.', 'error');
    return;
  }

  toast('Miembro agregado.', 'success');
  if (usernameInput instanceof HTMLInputElement) usernameInput.value = '';
  await refreshTeamsUiAfterChange();
}

/**
 * @param {Event} ev
 * @param {HTMLFormElement} form
 */
async function handleMyCycleSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || '');
  const userId = currentUserId();
  const select = form.querySelector('.clinical-teams-cycle-select');
  const subAreaFraction =
    select instanceof HTMLSelectElement ? String(select.value || '').trim() : '';
  if (!teamId || !userId || !subAreaFraction) {
    toast('Elige tu ciclo.', 'error');
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se guardó el ciclo.', 'error');
    return;
  }

  toast('Ciclo actualizado.', 'success');
  await refreshTeamsUiAfterChange();
}

async function resolveTeamIdForInviteInput(codeOrId) {
  const raw = String(codeOrId || '').trim();
  if (!raw) return '';

  await fetchClinicalTeamsFromDb();
  let teamId = raw.includes('-') && raw.length > 20 ? raw : '';
  if (!teamId) {
    teamId = resolveTeamIdFromInviteCode(raw, clinicalSessionContext.teams || []);
  }

  const api = dbApi();
  if (!teamId && api && typeof api.dbClinicalTeamResolveCode === 'function') {
    const res = await api.dbClinicalTeamResolveCode({ code: normalizeTeamInviteCode(raw) });
    if (res?.ok && res.team?.team_id) {
      teamId = String(res.team.team_id);
      await fetchClinicalTeamsFromDb();
    }
  }
  return teamId;
}

async function joinTeamById(teamId, subAreaFraction) {
  const userId = currentUserId();
  if (!userId || !teamId) return false;

  await fetchClinicalTeamsFromDb();
  const team = (clinicalSessionContext.teams || []).find(
    (t) => String(t.team_id) === teamId
  );
  if (!team) {
    toast('Equipo no encontrado en esta base de datos.', 'error');
    return false;
  }

  if (filterJoinedTeams(clinicalSessionContext.teams, clinicalSessionContext.user).some(
    (t) => String(t.team_id) === teamId
  )) {
    toast('Ya perteneces a este equipo.', 'info');
    await openClinicalTeamsPanel();
    return true;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsJoin !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return false;
  }

  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const cycle =
    subAreaFraction || inferMembershipCycleForJoin(team, rank);
  const res = await api.dbClinicalTeamsJoin({ teamId, userId, subAreaFraction: cycle });
  if (!res?.ok) {
    toast(res?.error || 'No se pudo unir al equipo.', 'error');
    return false;
  }
  toast(`Te uniste al equipo ${team.name || ''} (ciclo ${cycle}).`, 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await refreshTeamsUiAfterChange();
  return true;
}

/** @param {Event} ev */
async function handleJoinWithCodeSubmit(ev) {
  ev.preventDefault();
  const input = document.getElementById('clinical-team-join-code-input');
  const cycleEl = document.getElementById('clinical-team-join-code-cycle');
  const code = input instanceof HTMLInputElement ? input.value : '';
  const subAreaFraction =
    cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || '').trim() : '';

  const teamId = await resolveTeamIdForInviteInput(code);
  if (!teamId) {
    toast('Código no válido o equipo no está en esta base. Pide al R2 que confirme el código.', 'error');
    return;
  }
  await joinTeamById(teamId, subAreaFraction);
}

function clearClinicalTeamJoinQueryParams() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('joinTeam');
    url.searchParams.delete('joinCode');
    url.searchParams.delete('clinicalTeam');
    url.searchParams.delete('teamCode');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch (_e) {}
}

/**
 * Desktop only: prefill join from ?joinCode= or legacy ?joinTeam=.
 */
export async function consumeClinicalTeamJoinFromUrl() {
  if (typeof window === 'undefined' || !isClinicalTeamJoinDesktopApp()) {
    tryMountClinicalTeamInviteBrowserGate();
    return;
  }

  const parsed = parseClinicalTeamJoinQuery(window.location.search);
  if (!parsed.teamId && !parsed.inviteCode) return;

  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) return;

  await openClinicalTeamsPanel();

  const input = document.getElementById('clinical-team-join-code-input');
  if (input instanceof HTMLInputElement && parsed.inviteCode) {
    input.value = parsed.inviteCode;
  }

  const teamId =
    parsed.teamId || (await resolveTeamIdForInviteInput(parsed.inviteCode));
  if (!teamId) {
    toast('Pega el código en Mi rotación y pulsa Unirme.', 'info');
    clearClinicalTeamJoinQueryParams();
    return;
  }

  const cycleEl = document.getElementById('clinical-team-join-code-cycle');
  const subAreaFraction =
    cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || '').trim() : '';
  await joinTeamById(teamId, subAreaFraction);
  clearClinicalTeamJoinQueryParams();
}


let teamsControlsWired = false;

/** Close button, backdrop click, and form submit delegation — always safe to call. */
export function wireClinicalTeamsModalChrome() {
  const bd = teamsModalEl();
  if (bd) {
    if (!bd._rpcTeamsBackdropClick) {
      bd._rpcTeamsBackdropClick = true;
      bd.addEventListener('click', (ev) => {
        if (ev.target === bd) closeClinicalTeamsPanel();
      });
    }
    if (!bd._rpcTeamsSubmitDelegated) {
      bd._rpcTeamsSubmitDelegated = true;
      bd.addEventListener('submit', (ev) => {
        const form = ev.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.id === 'clinical-profile-form') {
          ev.preventDefault();
          void handleProfileFormSubmit(ev);
        } else if (form.id === 'clinical-team-create-form') {
          ev.preventDefault();
          void handleCreateTeamSubmit(ev);
        } else if (form.classList.contains('clinical-teams-add-member-form')) {
          ev.preventDefault();
          void handleAddMemberSubmit(ev, form);
        } else if (form.classList.contains('clinical-teams-my-cycle-form')) {
          ev.preventDefault();
          void handleMyCycleSubmit(ev, form);
        } else if (form.id === 'clinical-team-join-code-form') {
          ev.preventDefault();
          void handleJoinWithCodeSubmit(ev);
        } else if (form.classList.contains('clinical-teams-edit-form')) {
          ev.preventDefault();
          void handleEditTeamSubmit(ev, form);
        }
      });
    }
  }

  const closeBtn = document.getElementById('btn-clinical-teams-close');
  if (closeBtn && !closeBtn._rpcCloseWired) {
    closeBtn._rpcCloseWired = true;
    closeBtn.addEventListener('click', () => closeClinicalTeamsPanel());
  }

  if (!document._rpcClinicalTeamsEscapeWired) {
    document._rpcClinicalTeamsEscapeWired = true;
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      const lanBd = lanUsersModalBackdropEl();
      if (lanBd?.classList.contains('open')) {
        closeLanUsersDirectoryModal();
        return;
      }
      const adminBd = adminCodeModalBackdropEl();
      if (adminBd?.classList.contains('open')) {
        cancelAdminCodeModal();
        return;
      }
      const bd = teamsModalEl();
      if (bd?.classList.contains('open')) closeClinicalTeamsPanel();
    });
  }

  wireLanUsersDirectoryControls();
  wireAdminCodeModalControls();
  wireTeamManageModalDelegation();
}

function syncSalaFieldVisibility() {
  const salaSelect = document.getElementById('clinical-team-create-sala');
  const userSala = String(clinicalSessionContext.user?.sala || '').trim();
  if (salaSelect && userSala && !String(salaSelect.value || '').trim()) {
    salaSelect.value = userSala;
  }
}

export function wireClinicalTeamsControls() {
  wireClinicalTeamsModalChrome();
  if (teamsControlsWired) return;
  teamsControlsWired = true;

  import('./clinical-rotation-entry.mjs').then((mod) => {
    mod.wireClinicalRotationEntryControls();
    mod.syncClinicalRotationEntryChrome();
  });

  const openBtn = document.getElementById('btn-guardia-mi-rotacion');
  if (openBtn && !openBtn._rpcTeamsOpenWired) {
    openBtn._rpcTeamsOpenWired = true;
    openBtn.addEventListener('click', () => void openClinicalTeamsPanel());
  }

  if (!document._rpcClinicalTeamsChangedWired) {
    document._rpcClinicalTeamsChangedWired = true;
    document.addEventListener('rpc-clinical-teams-changed', () => {
      void refreshTeamsUiAfterChange();
    });
  }

  if (!document._rpcClinicalOpsSyncedTeamsWired) {
    document._rpcClinicalOpsSyncedTeamsWired = true;
    document.addEventListener('rpc-clinical-ops-synced', () => {
      void refreshTeamsUiAfterChange();
      const lanBd = lanUsersModalBackdropEl();
      const host = lanUsersModalBodyEl();
      if (lanBd?.classList.contains('open') && host) void loadLanUsersDirectoryIntoHost(host);
    });
  }
}
