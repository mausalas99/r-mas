/**
 * Mi rotación — self-serve teams and membership.
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  refreshClinicalUserProfile,
} from '../clinical-access-runtime.mjs';
import { getCycleConfig } from '../clinico-access.mjs';
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

export function renderCreateTeamForm() {
  const serviceOptions = CLINICAL_TEAM_SERVICES.map(
    (svc) => `<option value="${escapeAttr(svc)}">${escapeHtml(svc)}</option>`
  ).join('');
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const defaultCycle = getCycleConfig(CLINICAL_TEAM_SERVICES[0], rank);
  const letterOptions = defaultCycle.letters.map(
    (letter, idx) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`
  ).join('');

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
          <div class="field-group">
            <label for="clinical-team-create-day">Posición en ciclo</label>
            <select id="clinical-team-create-day" class="profile-input" required>${letterOptions}</select>
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
  const cycle = team.sub_area_fraction ? String(team.sub_area_fraction).trim() : '';
  if (sala) parts.push(sala);
  if (service && service.toLowerCase() !== 'sala') parts.push(service);
  if (cycle) parts.push(`Ciclo ${cycle}`);
  if (!parts.length) return '';
  return `<p class="clinical-teams-card-meta">${parts.map((p) => escapeHtml(p)).join(' · ')}</p>`;
}

/** @param {object} m */
function renderMemberRow(m) {
  const handle = escapeHtml(m.username || m.user_id);
  const name = String(m.clinical_name || '').trim();
  const rank = escapeHtml(effectiveClinicalRank({ rank: m.rank }));
  const displayName = name ? escapeHtml(name) : handle;
  const meta = name ? `@${handle} · ${rank}` : rank;
  return `<li class="clinical-teams-member-row">
    <span class="clinical-teams-member-row-name">${displayName}</span>
    <span class="clinical-teams-member-row-meta">${meta}</span>
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
 */
function renderJoinedTeamCard(team) {
  const teamId = String(team.team_id || '');
  const members = Array.isArray(team.members) ? team.members : [];

  return `
    <article class="clinical-teams-card clinical-teams-card--mine" data-team-id="${escapeAttr(teamId)}">
      <div class="clinical-teams-card-top">
        <p class="clinical-teams-card-eyebrow">Residente líder</p>
        <h5 class="clinical-teams-card-title">${escapeHtml(team.name || 'Equipo')}</h5>
        ${renderTeamMetaLine(team)}
      </div>
      ${renderMembersBlock(members)}
      <div class="clinical-teams-invite-box">
        <form class="clinical-teams-add-member-form" data-team-id="${escapeAttr(teamId)}">
          <label class="clinical-teams-add-member-label" for="clinical-add-member-${escapeAttr(teamId)}">Agregar integrante</label>
          <div class="clinical-teams-invite-row">
            <input id="clinical-add-member-${escapeAttr(teamId)}" type="text" class="profile-input clinical-teams-add-member-input" placeholder="Usuario LAN" required aria-describedby="clinical-add-hint-${escapeAttr(teamId)}">
            <button type="submit" class="btn-save clinical-teams-btn-add">Agregar</button>
          </div>
          <p class="clinical-teams-invite-hint" id="clinical-add-hint-${escapeAttr(teamId)}">Ejemplo: mgarcia</p>
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
  wireBrowseSalaControl(elevated);
}

function resolveBrowseSala(elevated, homeSala) {
  if (!elevated) return homeSala;
  try {
    const stored = localStorage.getItem(BROWSE_SALA_LS);
    if (stored === '__all__') return '__all__';
    if (stored && CLINICAL_SALAS.includes(stored)) return stored;
  } catch (_e) {}
  return homeSala || CLINICAL_SALAS[0];
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
      const res = await api.dbClinicalTeamsJoin({ teamId, userId });
      if (!res || res.ok === false) {
        toast(res?.error || 'No se pudo unir al equipo.', 'error');
        return;
      }
      toast('Te uniste al equipo.', 'success');
      document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
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
      const daySelect = document.getElementById('clinical-team-create-day');
      if (!daySelect) return;
      const rank = effectiveClinicalRank(clinicalSessionContext.user);
      const cfg = getCycleConfig(serviceSelect.value, rank);
      daySelect.innerHTML = cfg.letters.map(
        (letter) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`
      ).join('');
      syncSalaFieldVisibility();
    });
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
    const addRes = await api.dbClinicalTeamsMemberAdd({ teamId, userId });
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

  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    username: normalizeUsername(username),
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se agregó el miembro.', 'error');
    return;
  }

  toast('Miembro agregado.', 'success');
  if (usernameInput instanceof HTMLInputElement) usernameInput.value = '';
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
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
}
