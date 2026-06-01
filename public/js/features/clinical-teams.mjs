/**
 * Mi rotación — self-serve teams, membership, and Guardia on-call flags.
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
} from '../clinical-access-runtime.mjs';
import { scheduleLiveSyncPush } from './lan-sync.mjs';
import { getCycleConfig } from '../clinico-access.mjs';

export const CLINICAL_TEAM_SERVICES = [
  'Sala',
  'Interconsulta',
  'Eme',
  'Torre HU',
  'UX',
  'Área A',
];

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

/** @param {object[]} teams @param {string} userId */
export function filterJoinedTeams(teams, userId) {
  const uid = String(userId || '');
  if (!uid) return [];
  return (teams || []).filter((team) =>
    (team.members || []).some((m) => String(m.user_id) === uid)
  );
}

function teamsModalEl() {
  return document.getElementById('clinical-teams-backdrop');
}

export async function openClinicalTeamsPanel() {
  const bd = teamsModalEl();
  if (!bd) return;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
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
  const rank = clinicalSessionContext.user?.rank || 'R1';
  const defaultCycle = getCycleConfig(CLINICAL_TEAM_SERVICES[0], rank);
  const letterOptions = defaultCycle.letters.map(
    (letter, idx) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`
  ).join('');

  return `
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Crear equipo</h4>
      <form id="clinical-team-create-form" class="clinical-teams-create-form">
        <div class="field-group" id="clinical-team-sala-group" style="display:none">
          <label for="clinical-team-create-sala">Sala</label>
          <select id="clinical-team-create-sala" class="profile-input">
            <option value="">— Seleccionar Sala —</option>
            <option value="Sala 1">Sala 1</option>
            <option value="Sala 2">Sala 2</option>
            <option value="Sala E">Sala E</option>
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
function renderJoinedTeamCard(team, userId) {
  const teamId = String(team.team_id || '');
  const guardia = team.guardia_today || null;
  const isGuardia = guardia && String(guardia.user_id) === userId;
  const members = Array.isArray(team.members) ? team.members : [];
  const memberList = members.length
    ? members
        .map((m) => {
          const handle = escapeHtml(m.username || m.user_id);
          const name = String(m.clinical_name || '').trim();
          const rank = escapeHtml(m.rank || '');
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
    `día ${Number(team.on_call_day_index ?? 0)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const guardiaLabel =
    guardia && !isGuardia
      ? ` (declarado: ${escapeHtml(members.find((m) => String(m.user_id) === String(guardia.user_id))?.username || guardia.user_id)})`
      : '';

  return `
    <article class="clinical-teams-card" data-team-id="${escapeAttr(teamId)}">
      <header class="clinical-teams-card-head">
        <div>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || 'Equipo')}</h5>
          <p class="clinical-teams-card-meta">${meta}</p>
        </div>
        <label class="clinical-teams-guardia-label">
          <input type="checkbox" class="clinical-teams-guardia-check" data-team-id="${escapeAttr(teamId)}" ${isGuardia ? 'checked' : ''}>
          <span>Guardia hoy${guardiaLabel}</span>
        </label>
      </header>
      <ul class="clinical-teams-member-list">${memberList}</ul>
      <form class="clinical-teams-add-member-form" data-team-id="${escapeAttr(teamId)}">
        <input type="text" class="profile-input clinical-teams-add-member-input" placeholder="Usuario LAN / username" required aria-label="Agregar miembro por username">
        <button type="submit" class="btn-med-secondary">Agregar</button>
      </form>
    </article>`;
}

export async function renderClinicalTeamsPanel() {
  const host = document.getElementById('clinical-teams-panel-body');
  if (!host) return;

  const userId = currentUserId();
  if (!userId) {
    host.innerHTML =
      '<p class="clinical-teams-lead">Activa la sesión clínica para gestionar equipos.</p>';
    return;
  }

  await fetchClinicalTeamsFromDb();
  const joined = filterJoinedTeams(clinicalSessionContext.teams, userId);

  const joinedHtml = joined.length
    ? joined.map((team) => renderJoinedTeamCard(team, userId)).join('')
    : '<p class="clinical-teams-empty">Aún no perteneces a ningún equipo.</p>';

  const user = clinicalSessionContext.user || {};
  const rank = user.rank || 'R1';
  const sala = String(user.sala || '').trim();
  const username = escapeHtml(user.username || '');
  const clinicalName = escapeHtml(user.clinical_name || '');

  const { isLegacyMachineUsername } = await import('../clinical-username.mjs');
  let clientId = '';
  try {
    clientId = String(JSON.parse(localStorage.getItem('rpc-settings') || '{}').clientId || '');
  } catch (_e) {}

  const legacyBanner = isLegacyMachineUsername(user.username, clientId)
    ? '<p class="clinical-teams-legacy-banner">Elige tu usuario LAN para aparecer en equipos y entregas.</p>'
    : '';

  const profileSection = `
    <section class="clinical-teams-section clinical-teams-rank-section">
      <h4 class="clinical-teams-section-title">Mi perfil</h4>
      ${legacyBanner}
      <form id="clinical-profile-form" class="clinical-teams-create-form">
        <div class="field-group">
          <label>Usuario LAN</label>
          <p class="clinical-teams-handle-display"><strong>@${username}</strong></p>
        </div>
        <div class="field-group">
          <label for="clinical-profile-name">Nombre en guardia</label>
          <input id="clinical-profile-name" type="text" class="profile-input" value="${clinicalName}" required>
        </div>
        <div class="field-group">
          <label for="clinical-profile-rank">Rango</label>
          <select id="clinical-profile-rank" class="profile-input">
            ${['R1', 'R2', 'R3', 'R4', 'Admin']
              .map(
                (r) =>
                  `<option value="${r}" ${r === rank ? 'selected' : ''}>${r}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="field-group">
          <label for="clinical-profile-sala">Sala</label>
          <select id="clinical-profile-sala" class="profile-input" required>
            <option value="">— Seleccionar —</option>
            <option value="Sala 1" ${sala === 'Sala 1' ? 'selected' : ''}>Sala 1</option>
            <option value="Sala 2" ${sala === 'Sala 2' ? 'selected' : ''}>Sala 2</option>
            <option value="Sala E" ${sala === 'Sala E' ? 'selected' : ''}>Sala E</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Guardar perfil</button>
        </div>
      </form>
    </section>`;

  let directorySection = '';
  if (sala) {
    const api = dbApi();
    let directory = [];
    if (api && typeof api.dbClinicalTeamsListBySala === 'function') {
      const res = await api.dbClinicalTeamsListBySala({ sala, forUserId: userId });
      if (res?.ok && Array.isArray(res.teams)) directory = res.teams;
    }
    const otherTeams = directory.filter((t) => !t.isMember);
    if (otherTeams.length) {
      const cards = otherTeams
        .map((team) => {
          const teamId = String(team.team_id || '');
          const members = (team.members || [])
            .map((m) => {
              const handle = escapeHtml(m.username || m.user_id);
              const name = String(m.clinical_name || '').trim();
              const r = escapeHtml(m.rank || '');
              return `<li>${handle}${name ? ` · ${escapeHtml(name)}` : ''} <span class="clinical-teams-member-rank">(${r})</span></li>`;
            })
            .join('');
          const joinBtn = team.joinEligible
            ? `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr(teamId)}">Unirme</button>`
            : team.joinReason
              ? `<span class="clinical-teams-join-hint">${escapeHtml(team.joinReason)}</span>`
              : '';
          return `<article class="clinical-teams-card"><header class="clinical-teams-card-head"><div><h5 class="clinical-teams-card-title">${escapeHtml(team.name || '')}</h5></div>${joinBtn}</header><ul class="clinical-teams-member-list">${members}</ul></article>`;
        })
        .join('');
      directorySection = `
        <section class="clinical-teams-section">
          <h4 class="clinical-teams-section-title">Otros equipos en ${escapeHtml(sala)}</h4>
          <div class="clinical-teams-list">${cards}</div>
        </section>`;
    }
  }

  host.innerHTML = `
    <p class="clinical-teams-lead">Administra equipos y declara <strong>Guardia hoy</strong> por equipo.</p>
    ${profileSection}
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Mis equipos</h4>
      <div class="clinical-teams-list">${joinedHtml}</div>
    </section>
    ${directorySection}
    ${renderCreateTeamForm()}`;

  wireClinicalTeamsPanelInteractions();
  wireJoinButtons();
}

async function handleProfileFormSubmit(ev) {
  ev.preventDefault();
  const rank = String(document.getElementById('clinical-profile-rank')?.value || 'R1');
  const sala = String(document.getElementById('clinical-profile-sala')?.value || '');
  const clinicalName = String(document.getElementById('clinical-profile-name')?.value || '').trim();
  const ok = await persistProfileFromPanel({ rank, sala, clinicalName });
  if (!ok) return;
  toast('Perfil guardado.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await renderClinicalTeamsPanel();
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

async function persistProfileFromPanel({ rank, sala, clinicalName }) {
  const userId = currentUserId();
  const api = dbApi();
  if (!userId || !api || typeof api.dbClinicalProfileUpsert !== 'function') {
    toast('Base de datos no disponible.', 'error');
    return false;
  }
  const res = await api.dbClinicalProfileUpsert({
    userId,
    clinicalName: clinicalName || clinicalSessionContext.user?.clinical_name || '',
    rank: rank || clinicalSessionContext.user?.rank || 'R1',
    sala: sala ?? clinicalSessionContext.user?.sala ?? null,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se guardó el perfil.', 'error');
    return false;
  }
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {}
  if (rank) settings.clinicalRank = rank;
  if (sala != null) settings.clinicalSala = sala;
  if (clinicalName) settings.clinicalDisplayName = clinicalName;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) {}
  if (clinicalSessionContext.user) {
    if (rank) clinicalSessionContext.user.rank = rank;
    if (sala != null) clinicalSessionContext.user.sala = sala;
    if (clinicalName) clinicalSessionContext.user.clinical_name = clinicalName;
    if (res.profile?.username) clinicalSessionContext.user.username = res.profile.username;
  }
  return true;
}

export function wireClinicalTeamsPanelInteractions() {
  const profileForm = document.getElementById('clinical-profile-form');
  if (profileForm && !profileForm._rpcProfileWired) {
    profileForm._rpcProfileWired = true;
    profileForm.addEventListener('submit', (ev) => void handleProfileFormSubmit(ev));
  }

  const createForm = document.getElementById('clinical-team-create-form');
  if (createForm && !createForm._rpcTeamsCreateWired) {
    createForm._rpcTeamsCreateWired = true;
    createForm.addEventListener('submit', (ev) => void handleCreateTeamSubmit(ev));
  }

  const serviceSelect = document.getElementById('clinical-team-create-service');
  if (serviceSelect && !serviceSelect._rpcServiceWired) {
    serviceSelect._rpcServiceWired = true;
    serviceSelect.addEventListener('change', () => {
      const daySelect = document.getElementById('clinical-team-create-day');
      if (!daySelect) return;
      const rank = clinicalSessionContext.user?.rank || 'R1';
      const cfg = getCycleConfig(serviceSelect.value, rank);
      daySelect.innerHTML = cfg.letters.map(
        (letter, idx) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`
      ).join('');
      const salaGroup = document.getElementById('clinical-team-sala-group');
      if (salaGroup) {
        const isSala = serviceSelect.value.toLowerCase().includes('sala');
        salaGroup.style.display = isSala ? '' : 'none';
      }
    });
  }

  document.querySelectorAll('.clinical-teams-guardia-check').forEach((input) => {
    if (!(input instanceof HTMLInputElement) || input._rpcGuardiaWired) return;
    input._rpcGuardiaWired = true;
    input.addEventListener('change', () => void handleGuardiaCheck(input));
  });

  document.querySelectorAll('.clinical-teams-add-member-form').forEach((form) => {
    if (!(form instanceof HTMLFormElement) || form._rpcAddMemberWired) return;
    form._rpcAddMemberWired = true;
    form.addEventListener('submit', (ev) => void handleAddMemberSubmit(ev, form));
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
  const service = String(document.getElementById('clinical-team-create-service')?.value || '').trim();
  const sala = String(document.getElementById('clinical-team-create-sala')?.value || '').trim();
  const cycleLetter = String(document.getElementById('clinical-team-create-day')?.value || 'A').trim();
  const userId = currentUserId();

  if (!name || !service) {
    toast('Indica nombre y servicio.', 'error');
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

/** @param {HTMLInputElement} input */
async function handleGuardiaCheck(input) {
  if (!input.checked) {
    input.checked = true;
    toast('Para retirar Guardia, otro miembro debe declararse on-call.', 'info');
    return;
  }

  const teamId = String(input.dataset.teamId || '');
  const userId = currentUserId();
  const api = dbApi();
  if (!teamId || !userId || !api || typeof api.dbClinicalTeamsGuardiaSet !== 'function') {
    input.checked = false;
    toast('No se pudo declarar Guardia.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsGuardiaSet({ teamId, userId });
  if (!res || res.ok === false) {
    input.checked = false;
    toast(res?.error || 'No se guardó Guardia.', 'error');
    return;
  }

  toast('Guardia declarada para hoy.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  scheduleLiveSyncPush();
  await renderClinicalTeamsPanel();
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

export function wireClinicalTeamsControls() {
  if (teamsControlsWired) return;
  teamsControlsWired = true;

  const openBtn = document.getElementById('btn-guardia-mi-rotacion');
  if (openBtn) openBtn.addEventListener('click', () => openClinicalTeamsPanel());

  const bd = teamsModalEl();
  if (bd) {
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) closeClinicalTeamsPanel();
    });
  }

  const closeBtn = document.getElementById('btn-clinical-teams-close');
  if (closeBtn) closeBtn.addEventListener('click', () => closeClinicalTeamsPanel());

  document.addEventListener('rpc-clinical-teams-changed', () => {
    void fetchClinicalTeamsFromDb();
  });
}
