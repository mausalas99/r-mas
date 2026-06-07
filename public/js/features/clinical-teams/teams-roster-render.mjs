/** Mi rotación submodule. */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  getClinicalScopeContextForEvaluate,
  refreshClinicalUserProfile,
} from '../../clinical-access-runtime.mjs';
import { patients } from '../../app-state.mjs';
import { resolvePatientTeamIdFromAssignments } from '../../clinico-access.mjs';
import {
  isBenignLanPushSkipCode,
  LAN_PROFILE_PUSH_FAILED_MSG,
} from '../../clinical-profile-lan-sync.mjs';
import {
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  getCycleLetterOptionsForRank,
  isSalaWardService,
  usesSalaR1LinePicker,
  formatMemberCycleLabel,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
} from '../../clinico-access.mjs';
import { clinicalServiceForSala } from '../../../../lib/clinical-salas.mjs';
import {
  getTeamCompositionLimits,
  serviceUsesStructuredComposition,
} from '../../../../lib/clinical-team-composition.mjs';
import {
  buildClinicalTeamInviteMessage,
  teamInviteCode,
} from '../../clinical-team-invite.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import {
  effectiveClinicalRank,
  hasElevatedTeamPrivileges,
  hasProgramAdminPrivileges,
  canViewLanUserDirectory,
  canManageTeamRoster,
  canDeleteLanDirectoryUser,
} from '../../clinical-privileges.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../../clinical-username.mjs';
import {
  syncRotationConfigButton,
  wireNuevaRotacionControl,
  wireRotationConfigOpenControl,
} from '../clinical-rotation.mjs';
import { persistClinicalUserBinding, readRpcSettings } from '../../clinical-settings.mjs';
import { resumeClinicalIdentityByUsername } from '../../clinical-access-runtime.mjs';
import { verifyAdminAccessCode } from '../../../../lib/admin-access-code.mjs';
import {
  ensureClinicalPanelSession,
  getClinicalTeamsPanelHost,
  safeRenderClinicalTeamsPanel,
  setClinicalTeamsPanelError,
} from '../clinical-panel-host.mjs';
import {
  dbApi,
  toast,
  escapeHtml,
  escapeAttr,
  hintHtml,
  currentUserId,
  filterJoinedTeams,
  CLINICAL_TEAM_SERVICES,
  CLINICAL_SALAS,
  BROWSE_SALA_LS,
  promptAdminAccessCode,
} from './shared.mjs';
import {
  publishClinicalTeamsToLan,
  toastTeamLanPublishResult,
  pullClinicalOpsFromLanRoom,
  resolveLocalUserIdByLanHandle,
} from './teams-guardia-bridge.mjs';

import {
  renderLanUsersDirectoryEntryHtml,
  wireLanUsersDirectoryControls,
} from './teams-roster-lan.mjs';
export function syncCreateTeamServiceFromSala() {
  const salaSelect = document.getElementById('clinical-team-create-sala');
  const serviceSelect = document.getElementById('clinical-team-create-service');
  const userSala = String(clinicalSessionContext.user?.sala || '').trim();
  if (salaSelect && userSala && !String(salaSelect.value || '').trim()) {
    salaSelect.value = userSala;
  }
  const sala = String(salaSelect?.value || userSala || '').trim();
  const mapped = clinicalServiceForSala(sala);
  if (serviceSelect && mapped) {
    serviceSelect.value = mapped;
  }
  syncCreateTeamCycleField();
}

function compositionHintForService(service) {
  if (!serviceUsesStructuredComposition(service)) return '';
  const limits = getTeamCompositionLimits(service);
  if (!limits) return '';
  const parts = [];
  if (limits.r1) parts.push(`${limits.r1} R1`);
  if (limits.r2) parts.push(`${limits.r2} R2`);
  if (limits.r3) parts.push(`${limits.r3} R3`);
  return parts.length
    ? `<p class="clinical-teams-hint clinical-teams-composition-hint">Composición: ${parts.join(', ')}.</p>`
    : '';
}

function setR1LineGroupVisible(visible) {
  const r1LineGroup = document.getElementById('clinical-team-r1-line-group');
  if (!r1LineGroup) return;
  r1LineGroup.hidden = !visible;
  r1LineGroup.style.display = visible ? '' : 'none';
}

export function syncCreateTeamCycleField() {
  const sala = String(
    document.getElementById('clinical-team-create-sala')?.value ||
      clinicalSessionContext.user?.sala ||
      ''
  ).trim();
  const service = String(document.getElementById('clinical-team-create-service')?.value || 'Sala');
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const r1Line = Number(document.getElementById('clinical-team-create-r1-line')?.value || 0);
  const showR1Line = rank === 'R1' && usesSalaR1LinePicker(service, sala);
  const meta = getCycleFieldMetaForTeamCreate(service, rank, showR1Line && r1Line === 1 ? 1 : 0);
  const label = document.getElementById('clinical-team-create-day-label');
  const hint = document.getElementById('clinical-team-create-day-hint');
  const daySelect = document.getElementById('clinical-team-create-day');
  setR1LineGroupVisible(showR1Line);
  if (label) label.textContent = meta.label;
  if (hint) hint.textContent = meta.hint;
  const compositionHint = document.getElementById('clinical-team-composition-hint');
  if (compositionHint) compositionHint.innerHTML = compositionHintForService(service);
  if (!daySelect) return;
  const prev = String(daySelect.value || '');
  const letters =
    showR1Line && rank === 'R1'
      ? getCycleLettersForTeamCreate(service, rank, r1Line === 1 ? 1 : 0)
      : getCycleLetterOptionsForRank(service, rank);
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
  const defaultService = clinicalServiceForSala(userSala) || CLINICAL_TEAM_SERVICES[0];
  const serviceOptions = CLINICAL_TEAM_SERVICES.map(
    (svc) =>
      `<option value="${escapeAttr(svc)}" ${svc === defaultService ? 'selected' : ''}>${escapeHtml(svc)}</option>`
  ).join('');
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const defaultLetters = getCycleLetterOptionsForRank(defaultService, rank);
  const defaultMeta = getCycleFieldMetaForTeamCreate(defaultService, rank, 0);
  const letterOptions = defaultLetters
    .map((letter) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`)
    .join('');
  const showR1Line = rank === 'R1' && usesSalaR1LinePicker(defaultService, userSala);

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
      <div class="field-group" id="clinical-team-r1-line-group" ${showR1Line ? '' : 'hidden style="display:none"'}>
        <label for="clinical-team-create-r1-line">Línea R1 en el equipo</label>
        <select id="clinical-team-create-r1-line" class="profile-input">
          <option value="0">Primera línea · A1–D1</option>
          <option value="1">Segunda línea · A2–D2</option>
        </select>
      </div>
      <div class="clinical-teams-create-service-row">
        <div class="field-group">
          <label for="clinical-team-create-service">Servicio</label>
          <select id="clinical-team-create-service" class="profile-input" required>${serviceOptions}</select>
        </div>
        <div class="field-group">
          <label id="clinical-team-create-day-label" for="clinical-team-create-day">${escapeHtml(defaultMeta.label)}</label>
          <select id="clinical-team-create-day" class="profile-input" required>${letterOptions}</select>
        </div>
      </div>
      <p id="clinical-team-create-day-hint" class="clinical-teams-hint clinical-teams-create-cycle-hint">${escapeHtml(defaultMeta.hint)}</p>
      <div id="clinical-team-composition-hint">${compositionHintForService(defaultService)}</div>
      <div class="modal-actions clinical-teams-create-submit-wrap">
        <button type="submit" class="btn-save">Crear equipo</button>
        <button type="button" class="btn-med-secondary clinical-teams-create-cancel">Cancelar</button>
      </div>
    </form>`;
}

/** Una línea de contexto sin repetir sala/servicio. @param {object} team */
export function renderTeamMetaLine(team) {
  const parts = [];
  const sala = String(team.sala || '').trim();
  const service = String(team.service || '').trim();
  if (sala) parts.push(sala);
  if (service && service.toLowerCase() !== 'sala') parts.push(service);
  if (!parts.length) return '';
  return `<p class="clinical-teams-card-meta">${parts.map((p) => escapeHtml(p)).join(' · ')}</p>`;
}

/** @param {string} teamId @param {object[]} assignments @param {string|Date} now */
export function countLocalCensusPatientsForTeam(teamId, assignments, now) {
  const tid = String(teamId || '');
  if (!tid) return 0;
  let count = 0;
  for (const p of patients || []) {
    if (!p?.id) continue;
    if (resolvePatientTeamIdFromAssignments(String(p.id), assignments, now) === tid) count += 1;
  }
  return count;
}

/** @param {object} team */
export function renderTeamPatientCountLine(team) {
  const teamId = String(team?.team_id || '');
  const ctx = getClinicalScopeContextForEvaluate();
  const assignments = Array.isArray(ctx?.assignments) ? ctx.assignments : [];
  const now = ctx?.now || new Date().toISOString();
  const onDevice = countLocalCensusPatientsForTeam(teamId, assignments, now);
  const assignedLan = Math.max(
    Number(team?.lanAssignmentCount) || 0,
    Number(team?.patientCount) || 0
  );

  if (onDevice <= 0 && assignedLan <= 0) return '';

  if (onDevice <= 0 && assignedLan > 0) {
    const waiting =
      assignedLan === 1
        ? '1 asignado en la red — sincronizando expediente…'
        : `${assignedLan} asignados en la red — sincronizando expedientes…`;
    return `<p class="clinical-teams-card-meta clinical-teams-card-patients">${escapeHtml(waiting)}</p>`;
  }

  if (assignedLan > onDevice && assignedLan > 0) {
    const pending = assignedLan - onDevice;
    const visible =
      onDevice === 1 ? '1 paciente en censo' : `${onDevice} pacientes en censo`;
    const waiting =
      pending === 1
        ? '1 asignado en la red sin expediente aquí'
        : `${pending} asignados en la red sin expediente aquí`;
    return `<p class="clinical-teams-card-meta clinical-teams-card-patients">${escapeHtml(visible)} · ${escapeHtml(waiting)}</p>`;
  }

  const label = onDevice === 1 ? '1 paciente en censo' : `${onDevice} pacientes en censo`;
  return `<p class="clinical-teams-card-meta clinical-teams-card-patients">${escapeHtml(label)}</p>`;
}

/**
 * @param {object} team
 * @param {string} rank
 * @param {string} [current]
 * @param {string} selectId
 */
export function renderCycleSelectForRank(team, rank, current, selectId) {
  const service = String(team.service || 'Sala');
  const id = selectId || 'clinical-cycle-select';
  const cur = String(current || '').trim();
  const letters = getCycleLetterOptionsForRank(service, rank);
  const opts = letters
    .map(
      (l) =>
        `<option value="${escapeAttr(l)}" ${l === cur ? 'selected' : ''}>${escapeHtml(l)}</option>`
    )
    .join('');
  return `<select id="${escapeAttr(id)}" class="profile-input clinical-teams-cycle-select" required>${opts}</select>`;
}

/** @param {object} team */
export function renderAddMemberCycleSelect(team) {
  const teamId = String(team.team_id || '');
  const service = String(team.service || 'Sala');
  const id = `clinical-add-cycle-${teamId}`;
  if (!isSalaWardService(service)) {
    const letters = getCycleLetterOptionsForRank(service, 'R2');
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
export function renderMemberRow(m) {
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
export function renderMembersBlock(members, { compact = false } = {}) {
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
export function renderMyCycleEditBlock(team, user) {
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
  const service = String(team.service || 'Sala');
  const hint = isSalaWardService(service)
    ? rank === 'R2'
      ? 'Tu letra A–F en el ciclo de sala.'
      : rank === 'R1'
        ? 'Tu subciclo (A1–D1 o A2–D2), independiente del resto del equipo.'
        : 'Letra de rotación para este servicio.'
    : 'Letra de rotación A–D (misma para todos los rangos en este servicio).';

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
export function renderLeaveTeamBox(team) {
  const teamId = escapeAttr(String(team.team_id || ''));
  const teamName = escapeAttr(String(team.name || 'este equipo'));
  return `
    <div class="clinical-teams-leave-box">
      <button type="button" class="btn-med-secondary clinical-teams-leave-btn" data-team-id="${teamId}" data-team-name="${teamName}">
        Salir del equipo
      </button>
    </div>`;
}

/** @param {object} team */
export function renderTeamManageActionsHtml(team) {
  const teamId = escapeAttr(String(team.team_id || ''));
  const teamNameAttr = escapeAttr(String(team.name || 'Equipo'));
  return `
    <div class="clinical-teams-manage-actions">
      <button type="button" class="btn-med-secondary clinical-teams-edit-btn" data-team-id="${teamId}">Editar</button>
      <button type="button" class="btn-med-secondary clinical-teams-delete-btn" data-team-id="${teamId}" data-team-name="${teamNameAttr}">Eliminar</button>
    </div>`;
}

/** @param {object} team */
export function renderTeamEditPanelHtml(team) {
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
export function renderTeamManageBlock(team) {
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
export function renderJoinedTeamCard(team) {
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
          ${renderTeamPatientCountLine(team)}
        </div>
        ${manage.actionsHtml ? `<div class="clinical-teams-card-actions">${manage.actionsHtml}</div>` : ''}
      </div>
      ${manage.editPanelHtml}
      ${renderMembersBlock(members)}
      ${renderMyCycleEditBlock(team, user)}
      ${renderLeaveTeamBox(team)}
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
 * @param {{ joinBtnHtml?: string, joinHintHtml?: string, manageHtml?: string, editPanelHtml?: string }} [opts]
 */
export function renderDirectoryTeamCard(team, opts = {}) {
  const teamId = String(team.team_id || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const joinBtn = opts.joinBtnHtml || '';
  const joinHint = opts.joinHintHtml || '';
  const manage = opts.manageHtml || '';
  const editPanel = opts.editPanelHtml || '';
  const actionButtons = [joinBtn, manage].filter(Boolean).join('');

  return `
    <article class="clinical-teams-card clinical-teams-card--directory" data-team-id="${escapeAttr(teamId)}">
      <div class="clinical-teams-card-top clinical-teams-card-top--directory">
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Equipo en sala</p>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || '')}</h5>
          ${renderTeamMetaLine(team)}
          ${renderTeamPatientCountLine(team)}
        </div>
        ${actionButtons ? `<div class="clinical-teams-card-actions">${actionButtons}</div>` : ''}
      </div>
      ${joinHint ? `<p class="clinical-teams-card-join-reason">${escapeHtml(joinHint)}</p>` : ''}
      ${editPanel}
      ${renderMembersBlock(members, { compact: true })}
    </article>`;
}

/**
 * @param {{ silent?: boolean, skipLanPull?: boolean }} [opts]
 * — silent: sin pantalla «Cargando…» (actualización en caliente)
 * — skipLanPull: no GET al host (evita bucle con rpc-clinical-ops-synced)
 */
export async function renderClinicalTeamsPanel(opts = {}) {
  const silent = !!opts.silent;
  const skipLanPull = !!opts.skipLanPull || silent;
  if (silent) {
    const host = getClinicalTeamsPanelHost();
    if (!host) return;
    try {
      await renderClinicalTeamsPanelInto(host, { skipLanPull });
    } catch (err) {
      console.error('[Mi rotación]', err);
      setClinicalTeamsPanelError(
        err instanceof Error ? err.message : 'Error al cargar Mi rotación.'
      );
    }
    return;
  }
  await safeRenderClinicalTeamsPanel(async (host) => {
    await renderClinicalTeamsPanelInto(host, { skipLanPull: false });
  });
}

export async function tryReconcileTeamMemberships() {
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

export function resolveDisplayLanHandle(user, usernameForInput) {
  const saved = normalizeUsername(user?.username || '');
  if (saved && isValidUsernameFormat(saved)) return saved;
  const draft = normalizeUsername(usernameForInput || '');
  if (draft && isValidUsernameFormat(draft)) return draft;
  return '';
}

export async function renderClinicalTeamsPanelInto(host, opts = {}) {
  const userId = currentUserId();
  if (!userId) {
    host.innerHTML =
      '<p class="clinical-teams-lead">Activa la sesión clínica para gestionar equipos.</p>';
    return;
  }

  if (!opts.skipLanPull) {
    const panelPullMs = 3500;
    const pulled = await Promise.race([
      pullClinicalOpsFromLanRoom({ timeoutMs: panelPullMs }),
      new Promise((resolve) => setTimeout(() => resolve(false), panelPullMs)),
    ]);
    if (!pulled) {
      void pullClinicalOpsFromLanRoom({ timeoutMs: 12000 }).then((ok) => {
        const bd = document.getElementById('clinical-teams-backdrop');
        if (!ok || !bd?.classList.contains('open')) return;
        void renderClinicalTeamsPanel({ silent: true, skipLanPull: true });
      });
    }
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
  const { needsClinicalLanProfileGate, ensureLanProfileGateDeviceReset } = await import(
    '../../clinical-settings.mjs'
  );
  settings = ensureLanProfileGateDeviceReset(settings);
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const usernameForInput = profileGatePending
    ? ''
    : legacyUsername
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

  const clinicalName = profileGatePending ? '' : escapeHtml(user.clinical_name || '');

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
      <form id="clinical-profile-form" class="clinical-teams-create-form" novalidate>
        <div class="field-group">
          <label for="clinical-profile-username">Usuario LAN *</label>
          <input id="clinical-profile-username" type="text" class="profile-input"
            value="${escapeAttr(usernameForInput)}"
            placeholder="ej. drmendoza" autocomplete="off" spellcheck="false"
            pattern="[a-z][a-z0-9_]{2,31}" required>
          ${hintHtml('Usuario LAN (@usuario): minúsculas, sin espacios — p. ej. drmendoza. No es tu nombre en guardia.')}
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
  const lanMemberHint = await resolveLanTeamMemberHintHtml(joined);
  const directorySection = await renderDirectorySectionHtml({
    userId,
    elevated,
    browseSala,
    homeSala: sala,
  });

  host.innerHTML = `
    ${handleHint}
    ${renderCreateTeamSectionHtml()}
    <section class="clinical-teams-section clinical-teams-section--joined">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Mis equipos</h4>
        <p class="clinical-teams-section-desc">Equipos donde ya eres integrante.</p>
        ${lanMemberHint}
      </div>
      <div class="clinical-teams-list">${joinedHtml}</div>
    </section>
    ${directorySection}
    ${lanUsersEntry}
    ${joinCodeSection}
    <section class="clinical-teams-section clinical-teams-section--more">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Configuración</h4>
        <p class="clinical-teams-section-desc">Perfil clínico y rango.</p>
      </div>
      ${profileSection}
      <details class="clinical-teams-advanced-rotation">
        <summary class="clinical-teams-advanced-rotation-summary">Zona avanzada · rotación del programa</summary>
        <div class="clinical-teams-advanced-rotation-body">
          <p class="clinical-teams-advanced-rotation-hint">Solo R4/Admin. Configura el calendario del ciclo o inicia una rotación nueva (archiva equipos y guardias del día).</p>
          <div class="clinical-teams-advanced-rotation-actions">
            <button type="button" id="btn-rotation-config-open" class="btn-med-secondary" hidden>Configuración rotación…</button>
            <button type="button" id="btn-nueva-rotacion" class="btn-med-secondary clinical-teams-nueva-rotacion-btn">Iniciar nueva rotación…</button>
          </div>
        </div>
      </details>
    </section>`;

  wireLanUsersDirectoryControls();
  syncRotationConfigButton();
  wireRotationConfigOpenControl(host);
  wireNuevaRotacionControl(host);
  const { wireRenderedClinicalTeamsPanel } = await import('./teams-roster-interactions.mjs');
  wireRenderedClinicalTeamsPanel(elevated);
}

export function renderCreateTeamSectionHtml() {
  const user = clinicalSessionContext.user || {};
  const elevatedCreate = canManageTeamRoster(user);
  const openLabel = elevatedCreate ? 'Crear equipo vacío' : 'Crear nuevo equipo';
  return `
    <section class="clinical-teams-section clinical-teams-section--create">
      <button type="button" id="btn-clinical-team-create-open" class="btn-save clinical-teams-create-open-btn">${escapeHtml(openLabel)}</button>
      <div id="clinical-team-create-panel" class="clinical-teams-create-panel" hidden>
        ${renderCreateTeamForm()}
      </div>
    </section>`;
}

export function renderJoinWithCodeSectionHtml() {
  return `
    <section class="clinical-teams-section clinical-teams-section--join-code">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">Unirte con código de equipo</h4>
        <p class="clinical-teams-section-desc">Pega el código que te envió tu R2 (8 caracteres). <strong>No</strong> pegues aquí el enlace ⇄ de sala (<code>http://…/join/req_…</code>) — ese va en <strong>Wi‑Fi → Conexión guardia</strong>.</p>
      </div>
      <form id="clinical-team-join-code-form" class="clinical-teams-join-code-form">
        <div class="clinical-teams-invite-row clinical-teams-join-code-code-row">
          <label class="visually-hidden" for="clinical-team-join-code-input">Código de equipo</label>
          <input id="clinical-team-join-code-input" type="text" class="profile-input" placeholder="ej. 2017936e" maxlength="36" autocomplete="off" required>
        </div>
        <div class="field-group clinical-teams-add-cycle-group">
          <label for="clinical-team-join-code-cycle">Tu ciclo al unirte</label>
          ${renderCycleSelectForRank(
            {
              service:
                clinicalServiceForSala(clinicalSessionContext.user?.sala) || 'Sala',
              team_id: 'join',
            },
            effectiveClinicalRank(clinicalSessionContext.user),
            '',
            'clinical-team-join-code-cycle'
          )}
        </div>
        <div class="clinical-teams-join-submit-wrap">
          <button type="submit" class="btn-save">Unirme</button>
        </div>
      </form>
    </section>`;
}

/** Hint when ⇄ is live but roster still shows only you (not rotación nueva). */
export async function resolveLanTeamMemberHintHtml(joinedTeams) {
  const teams = Array.isArray(joinedTeams) ? joinedTeams : [];
  if (!teams.length) return '';
  const soloTeams = teams.every((team) => {
    const members = Array.isArray(team?.members) ? team.members : [];
    return members.length <= 1;
  });
  if (!soloTeams) return '';
  try {
    const lan = await import('../lan-sync.mjs');
    if (typeof lan.isLanSessionConfiguredForRest !== 'function' || !lan.isLanSessionConfiguredForRest()) {
      return '';
    }
    const roomId =
      typeof lan.getActiveLiveSyncRoomId === 'function' ? String(lan.getActiveLiveSyncRoomId() || '').trim() : '';
    if (!roomId) {
      return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">Abre ⇄ y pulsa <strong>Unirse</strong> en la sala de guardia. Los residentes deben conectarse a tu LAN, unirse a la misma sala y registrar <strong>@usuario</strong> antes de que puedas asignarlos a un equipo.</p>`;
    }
    const canDir = canViewLanUserDirectory(clinicalSessionContext.user || {});
    if (canDir) {
      return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">Estás en sala ⇄ pero el directorio aún no lista a otros. Cada Mac debe usar tu enlace/código LAN, <strong>Unirse</strong> en la misma sala y <strong>Guardar perfil</strong> con @usuario; después aparecen aquí y tú los asignas al equipo (no al revés).</p>`;
    }
    return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">En <strong>Integrantes</strong> verás compañeros cuando el admin te asigne a un equipo desde el directorio LAN. Mientras tanto: ⇄ → misma sala, @usuario guardado.</p>`;
  } catch (_e) {
    return '';
  }
}

export function resolveBrowseSala(elevated, homeSala) {
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

/**
 * @param {{ userId: string, elevated: boolean, browseSala: string, homeSala: string }} opts
 */
export async function renderDirectorySectionHtml(opts) {
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
      let joinBtn = '';
      let joinHint = '';
      if (team.joinEligible) {
        joinBtn = `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr(teamId)}">Unirme</button>`;
        if (team.joinWarning) {
          joinHint = String(team.joinWarning);
        }
      } else if (team.joinReason) {
        joinHint = String(team.joinReason);
      }
      const manage = elevated ? renderTeamManageBlock(team) : { actionsHtml: '', editPanelHtml: '' };
      return renderDirectoryTeamCard(team, {
        joinBtnHtml: joinBtn,
        joinHintHtml: joinHint,
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