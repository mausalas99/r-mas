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
import { syncRotationConfigButton } from './clinical-rotation.mjs';
import { persistClinicalUserBinding, readRpcSettings } from '../clinical-settings.mjs';
import { resumeClinicalIdentityByUsername } from '../clinical-access-runtime.mjs';
import {
  ensureClinicalPanelSession,
  safeRenderClinicalTeamsPanel,
  setClinicalTeamsPanelError,
  setClinicalTeamsPanelLoading,
} from './clinical-panel-host.mjs';

export const CLINICAL_TEAM_SERVICES = [
  'Sala',
  'Interconsulta',
  'Eme',
  'Torre HU',
  'UX',
  'Área A',
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

export async function openClinicalTeamsPanel() {
  const bd = teamsModalEl();
  if (!bd) return;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  setClinicalTeamsPanelLoading();

  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    setClinicalTeamsPanelError(
      'Activa la sesión clínica (desbloquea la base de datos) para usar Mi rotación.'
    );
    return;
  }

  try {
    const { needsClinicalOnboarding, renderOnboardingPanel } = await import(
      './clinical-onboarding.mjs'
    );
    if (needsClinicalOnboarding()) {
      await renderOnboardingPanel();
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
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Crear equipo</h4>
      <form id="clinical-team-create-form" class="clinical-teams-create-form">
        <div class="field-group" id="clinical-team-sala-group">
          <label for="clinical-team-create-sala">Sala</label>
          <select id="clinical-team-create-sala" class="profile-input">
            <option value="">— Seleccionar Sala —</option>
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
        <div class="modal-actions">
          <button type="submit" class="btn-save">Crear equipo</button>
        </div>
      </form>
    </section>`;
}

/**
 * @param {object} team
 * @param {string} userId
 */
function renderJoinedTeamCard(team) {
  const teamId = String(team.team_id || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const memberList = members.length
    ? members
        .map((m) => {
          const handle = escapeHtml(m.username || m.user_id);
          const name = String(m.clinical_name || '').trim();
          const rank = escapeHtml(effectiveClinicalRank({ rank: m.rank }));
          const label = name
            ? `${handle} · ${escapeHtml(name)} <span class="clinical-teams-member-rank">(${rank})</span>`
            : `${handle} <span class="clinical-teams-member-rank">${rank}</span>`;
          return `<li><span class="clinical-teams-member-name">${label}</span></li>`;
        })
        .join('')
    : '<li class="clinical-teams-empty">Sin miembros</li>';

  const meta = [
    escapeHtml(team.service || ''),
    team.sub_area_fraction ? escapeHtml(team.sub_area_fraction) : null,
    team.sala ? escapeHtml(team.sala) : null,
    `día ${Number(team.on_call_day_index ?? 0)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return `
    <article class="clinical-teams-card" data-team-id="${escapeAttr(teamId)}">
      <header class="clinical-teams-card-head">
        <div>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || 'Equipo')}</h5>
          <p class="clinical-teams-card-meta">${meta}</p>
        </div>
      </header>
      <ul class="clinical-teams-member-list">${memberList}</ul>
      <form class="clinical-teams-add-member-form" data-team-id="${escapeAttr(teamId)}">
        <input type="text" class="profile-input clinical-teams-add-member-input" placeholder="Usuario LAN / username" required aria-label="Agregar miembro por username">
        <button type="submit" class="btn-med-secondary">Agregar</button>
      </form>
    </article>`;
}

export async function renderClinicalTeamsPanel() {
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
  const joined = filterJoinedTeams(clinicalSessionContext.teams, clinicalSessionContext.user);

  const joinedHtml = joined.length
    ? joined.map((team) => renderJoinedTeamCard(team)).join('')
    : '<p class="clinical-teams-empty">Aún no perteneces a ningún equipo.</p>';

  const user = clinicalSessionContext.user || {};
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
    <section class="clinical-teams-section clinical-teams-rank-section">
      <h4 class="clinical-teams-section-title">Mi perfil</h4>
      ${legacyBanner}
      <form id="clinical-profile-form" class="clinical-teams-create-form">
        <div class="field-group">
          <label for="clinical-profile-username">Usuario LAN *</label>
          <input id="clinical-profile-username" type="text" class="profile-input"
            value="${escapeAttr(usernameForInput)}"
            placeholder="mgarcia" autocomplete="username"
            pattern="[a-z][a-z0-9_]{2,31}" required>
          <p class="clinical-registration-lead" style="margin:0.35rem 0 0;">Minúsculas, 3–32 caracteres (a-z, 0-9, _). Lo usan tus compañeros para agregarte a equipos.</p>
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
          <p class="clinical-registration-lead" style="margin:0.35rem 0 0;">Usado en equipos, entregas y alcance clínico.</p>
        </div>
        <div class="field-group">
          <label class="clinical-teams-guardia-label">
            <input type="checkbox" id="clinical-profile-admin" ${programAdmin ? 'checked' : ''}>
            <span>Privilegios de administración</span>
          </label>
          <p class="clinical-registration-lead" style="margin:0.35rem 0 0;">Configuración de rotación y acceso amplio (lead dev / R4 de programa).</p>
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
          ${programAdmin ? '<p class="clinical-registration-lead" style="margin:0.35rem 0 0;">Tu equipo R1 y entregas usan esta sala. Abajo puedes explorar otras.</p>' : ''}
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Guardar perfil</button>
        </div>
      </form>
    </section>`;

  const browseSala = resolveBrowseSala(elevated, sala);
  const directorySection = await renderDirectorySectionHtml({
    userId,
    elevated,
    browseSala,
    homeSala: sala,
  });

  host.innerHTML = `
    <p class="clinical-teams-lead">Administra tus equipos y membresía en la sala.</p>
    ${profileSection}
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Mis equipos</h4>
      <div class="clinical-teams-list">${joinedHtml}</div>
    </section>
    ${directorySection}
    ${renderCreateTeamForm()}`;

  wireClinicalTeamsPanelInteractions();
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
  if (!elevated) {
    directory = directory.filter((t) => !t.isMember);
  }
  if (!directory.length) {
    const label =
      browseSala === '__all__' ? 'ninguna sala' : escapeHtml(String(browseSala || homeSala));
    return `<section class="clinical-teams-section"><p class="clinical-teams-empty">No hay equipos en ${label}.</p></section>`;
  }

  const browseControl = elevated
    ? `<div class="field-group">
        <label for="clinical-browse-sala">Explorar equipos en</label>
        <select id="clinical-browse-sala" class="profile-input">
          ${CLINICAL_SALAS.map(
            (s) =>
              `<option value="${escapeAttr(s)}" ${browseSala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
          ).join('')}
          <option value="__all__" ${browseSala === '__all__' ? 'selected' : ''}>Todas las salas</option>
        </select>
      </div>`
    : '';

  const cards = directory
    .map((team) => {
      const teamId = String(team.team_id || '');
      const salaTag = team.sala ? `<span class="clinical-teams-card-meta">${escapeHtml(team.sala)}</span>` : '';
      const members = (team.members || [])
        .map((m) => {
          const handle = escapeHtml(m.username || m.user_id);
          const name = String(m.clinical_name || '').trim();
          const r = escapeHtml(effectiveClinicalRank({ rank: m.rank }));
          return `<li>${handle}${name ? ` · ${escapeHtml(name)}` : ''} <span class="clinical-teams-member-rank">(${r})</span></li>`;
        })
        .join('');
      let action = '';
      if (team.isMember) {
        action = '<span class="clinical-teams-joined-badge">Tu equipo</span>';
      } else if (team.joinEligible) {
        action = `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr(teamId)}">Unirme</button>`;
      } else if (team.joinReason) {
        action = `<span class="clinical-teams-join-hint">${escapeHtml(team.joinReason)}</span>`;
      }
      return `<article class="clinical-teams-card">
        <header class="clinical-teams-card-head">
          <div>
            <h5 class="clinical-teams-card-title">${escapeHtml(team.name || '')}</h5>
            ${salaTag}
          </div>
          ${action}
        </header>
        <ul class="clinical-teams-member-list">${members || '<li class="clinical-teams-empty">Sin miembros</li>'}</ul>
      </article>`;
    })
    .join('');

  const title =
    browseSala === '__all__'
      ? 'Equipos (todas las salas)'
      : elevated
        ? `Equipos en ${escapeHtml(browseSala)}`
        : `Otros equipos en ${escapeHtml(browseSala || homeSala)}`;

  return `
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">${title}</h4>
      ${browseControl}
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
    void renderClinicalTeamsPanel();
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
  await fetchClinicalTeamsFromDb();
  const msg = isProgramAdmin
    ? 'Perfil guardado. Privilegios de administración activos.'
    : 'Perfil guardado.';
  toast(msg, 'success');
  syncRotationConfigButton();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await fetchClinicalTeamsFromDb();
  await renderClinicalTeamsPanel();
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
      await renderClinicalTeamsPanel();
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

  if (service.toLowerCase().includes('sala') && !sala) {
    sala = String(clinicalSessionContext.user?.sala || '').trim();
  }
  if (service.toLowerCase().includes('sala') && !sala) {
    toast('Selecciona la Sala para el equipo.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsCreate({
    name,
    service,
    subAreaFraction: cycleLetter,
    onCallDayIndex: 0,
    sala: sala || undefined,
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
  await fetchClinicalTeamsFromDb();
  const { needsClinicalOnboarding, renderOnboardingPanel } = await import(
    './clinical-onboarding.mjs'
  );
  if (needsClinicalOnboarding()) await renderOnboardingPanel();
  else await renderClinicalTeamsPanel();
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

  const res = await api.dbClinicalTeamsMemberAdd({ teamId, username });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se agregó el miembro.', 'error');
    return;
  }

  toast('Miembro agregado.', 'success');
  if (usernameInput instanceof HTMLInputElement) usernameInput.value = '';
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await renderClinicalTeamsPanel();
}

let teamsControlsWired = false;

function syncSalaFieldVisibility() {
  const serviceSelect = document.getElementById('clinical-team-create-service');
  const salaGroup = document.getElementById('clinical-team-sala-group');
  if (!serviceSelect || !salaGroup) return;
  const isSala = String(serviceSelect.value || '').toLowerCase().includes('sala');
  salaGroup.style.display = isSala ? '' : 'none';
}

export function wireClinicalTeamsControls() {
  if (teamsControlsWired) return;
  teamsControlsWired = true;

  const openBtn = document.getElementById('btn-guardia-mi-rotacion');
  if (openBtn) openBtn.addEventListener('click', () => void openClinicalTeamsPanel());

  const bd = teamsModalEl();
  if (bd) {
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) closeClinicalTeamsPanel();
    });
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
  if (closeBtn) closeBtn.addEventListener('click', () => closeClinicalTeamsPanel());

  document.addEventListener('rpc-clinical-teams-changed', () => {
    void fetchClinicalTeamsFromDb();
  });
}
