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
} from '../clinical-privileges.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../clinical-username.mjs';
import { syncRotationConfigButton, wireNuevaRotacionControl } from './clinical-rotation.mjs';
import { persistClinicalUserBinding, readRpcSettings } from '../clinical-settings.mjs';
import { resumeClinicalIdentityByUsername } from '../clinical-access-runtime.mjs';
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

/**
 * @param {object} team
 */
function renderJoinedTeamCard(team) {
  const teamId = String(team.team_id || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const user = clinicalSessionContext.user || {};

  return `
    <article class="clinical-teams-card clinical-teams-card--mine" data-team-id="${escapeAttr(teamId)}">
      <div class="clinical-teams-card-top">
        <p class="clinical-teams-card-eyebrow">Residente líder</p>
        <h5 class="clinical-teams-card-title">${escapeHtml(team.name || 'Equipo')}</h5>
        ${renderTeamMetaLine(team)}
      </div>
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
 * @param {{ actionHtml?: string }} [opts]
 */
function renderDirectoryTeamCard(team, opts = {}) {
  const teamId = String(team.team_id || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const action = opts.actionHtml || '';

  return `
    <article class="clinical-teams-card clinical-teams-card--directory">
      <div class="clinical-teams-card-top clinical-teams-card-top--directory">
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Equipo en sala</p>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || '')}</h5>
          ${renderTeamMetaLine(team)}
        </div>
        ${action ? `<div class="clinical-teams-card-actions">${action}</div>` : ''}
      </div>
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

  const savedHandle = normalizeUsername(user.username || '');
  const handleHint = savedHandle
    ? `<p class="clinical-teams-lead clinical-teams-handle-hint">Tu usuario LAN: <strong>@${escapeHtml(savedHandle)}</strong> — compártelo para que te agreguen a un equipo.</p>`
    : '';

  const joinedHtml = joined.length
    ? joined.map((team) => renderJoinedTeamCard(team)).join('')
    : `<p class="clinical-teams-empty clinical-teams-empty--section">Aún no perteneces a ningún equipo. ${savedHandle ? 'Pide que te agreguen con tu @usuario o ' : ''}explora equipos en tu sala abajo.</p>`;
  const rank = effectiveClinicalRank(user);
  const programAdmin = hasProgramAdminPrivileges(user);
  const elevated = hasElevatedTeamPrivileges(user);
  const sala = String(user.sala || '').trim();
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
  const clinicalName = escapeHtml(user.clinical_name || '');

  const legacyBanner = legacyUsername
    ? '<p class="clinical-teams-legacy-banner">Registra tu usuario LAN (obligatorio). Sin esto no apareces en equipos ni entregas.</p>'
    : '';

  const profileSection = `
    <div class="clinical-teams-profile-panel clinical-teams-rank-section">
      <h5 class="clinical-teams-subsection-title">Mi perfil y rango</h5>
      ${legacyBanner}
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
          ${hintHtml('Rotación del programa y acceso amplio.')}
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
  if (!directory.length) {
    const label =
      browseSala === '__all__' ? 'ninguna sala' : escapeHtml(String(browseSala || homeSala));
    const emptyMsg = elevated
      ? `No hay otros equipos en ${label}. Los tuyos aparecen arriba.`
      : `No hay otros equipos disponibles en ${label}.`;
    return `<section class="clinical-teams-section clinical-teams-section--directory">
      <div class="clinical-teams-section-intro">
        <h4 class="clinical-teams-section-title">${elevated ? 'Explorar sala' : `Otros equipos · ${escapeHtml(browseSala || homeSala)}`}</h4>
        <p class="clinical-teams-section-desc">Equipos de la sala a los que puedes unirte.</p>
      </div>
      <p class="clinical-teams-empty">${emptyMsg}</p>
    </section>`;
  }

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

  const cards = directory
    .map((team) => {
      const teamId = String(team.team_id || '');
      let action = '';
      if (team.joinEligible) {
        action = `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr(teamId)}">Unirme</button>`;
      } else if (team.joinReason) {
        action = `<span class="clinical-teams-join-hint">${escapeHtml(team.joinReason)}</span>`;
      }
      return renderDirectoryTeamCard(team, { actionHtml: action });
    })
    .join('');

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

async function handleProfileFormSubmit(ev) {
  ev.preventDefault();
  const username = normalizeUsername(
    String(document.getElementById('clinical-profile-username')?.value || '')
  );
  let rank = String(document.getElementById('clinical-profile-rank')?.value || 'R1');
  const sala = String(document.getElementById('clinical-profile-sala')?.value || '');
  const clinicalName = String(document.getElementById('clinical-profile-name')?.value || '').trim();
  let isProgramAdmin = !!document.getElementById('clinical-profile-admin')?.checked;
  if (rank === 'Admin') {
    rank = 'R1';
    isProgramAdmin = true;
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
  if (username !== currentUsername) {
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

  const ok = await persistProfileFromPanel({ rank, sala, clinicalName, isProgramAdmin, username });
  if (!ok) return;
  await refreshClinicalUserProfile();
  const msg = isProgramAdmin
    ? 'Perfil guardado. Privilegios de administración activos.'
    : 'Perfil guardado.';
  toast(msg, 'success');
  syncRotationConfigButton();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
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

async function persistProfileFromPanel({ rank, sala, clinicalName, isProgramAdmin, username }) {
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

/** @param {Event} ev */
async function handleCreateTeamSubmit(ev) {
  ev.preventDefault();
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsCreate !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return;
  }

  const name = String(document.getElementById('clinical-team-create-name')?.value || '').trim();
  const service = String(document.getElementById('clinical-team-create-service')?.value || '').trim();
  let sala = String(document.getElementById('clinical-team-create-sala')?.value || '').trim();
  const cycleLetter = String(document.getElementById('clinical-team-create-day')?.value || 'A').trim();
  const userId = currentUserId();

  if (!name || !service) {
    toast('Indica nombre y servicio.', 'error');
    return;
  }

  if (!sala) {
    sala = String(clinicalSessionContext.user?.sala || '').trim();
  }
  if (!sala) {
    toast('Configura tu Sala en el perfil (o selecciónala al crear) para que el equipo aparezca en la sala.', 'error');
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
      const bd = teamsModalEl();
      if (bd?.classList.contains('open')) closeClinicalTeamsPanel();
    });
  }
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
    });
  }
}
