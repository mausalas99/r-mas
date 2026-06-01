/**
 * Mi rotación — self-serve teams, membership, and Guardia on-call flags.
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
} from '../clinical-access-runtime.mjs';
import { scheduleLiveSyncPush } from './lan-sync.mjs';

export const CLINICAL_TEAM_SERVICES = [
  'Sala',
  'Interconsulta',
  'Eme',
  'Torre HU',
  'UX',
  'Área A',
];

export const ON_CALL_DAY_LABELS = [
  'Domingo (0)',
  'Lunes (1)',
  'Martes (2)',
  'Miércoles (3)',
  'Jueves (4)',
  'Viernes (5)',
  'Sábado (6)',
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

export function openClinicalTeamsPanel() {
  const bd = teamsModalEl();
  if (!bd) return;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  void renderClinicalTeamsPanel();
  const nameInput = document.getElementById('clinical-team-create-name');
  if (nameInput) nameInput.focus();
}

export function closeClinicalTeamsPanel() {
  const bd = teamsModalEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

function renderCreateTeamForm() {
  const serviceOptions = CLINICAL_TEAM_SERVICES.map(
    (svc) => `<option value="${escapeAttr(svc)}">${escapeHtml(svc)}</option>`
  ).join('');
  const dayOptions = ON_CALL_DAY_LABELS.map(
    (label, idx) => `<option value="${idx}">${escapeHtml(label)}</option>`
  ).join('');

  return `
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Crear equipo</h4>
      <form id="clinical-team-create-form" class="clinical-teams-create-form">
        <div class="field-group">
          <label for="clinical-team-create-name">Nombre</label>
          <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Sala A · Equipo noche" required>
        </div>
        <div class="field-group">
          <label for="clinical-team-create-service">Servicio</label>
          <select id="clinical-team-create-service" class="profile-input" required>${serviceOptions}</select>
        </div>
        <div class="field-group">
          <label for="clinical-team-create-fraction">Fracción de sub-área (opcional)</label>
          <input id="clinical-team-create-fraction" type="text" class="profile-input" placeholder="A1, A2…" maxlength="16">
        </div>
        <div class="field-group">
          <label for="clinical-team-create-day">Día de guardia (0–6)</label>
          <select id="clinical-team-create-day" class="profile-input" required>${dayOptions}</select>
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
        .map(
          (m) =>
            `<li><span class="clinical-teams-member-name">${escapeHtml(m.username || m.user_id)}</span> <span class="clinical-teams-member-rank">${escapeHtml(m.rank || '')}</span></li>`
        )
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
          <span>Guardia${guardiaLabel}</span>
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
    : '<p class="clinical-teams-empty">Aún no perteneces a ningún equipo. Crea uno abajo.</p>';

  host.innerHTML = `
    <p class="clinical-teams-lead">Administra tus equipos de rotación y declara <strong>Guardia</strong> (on-call hoy) por equipo. Distinto del bloque Equipo del perfil (solo PDF).</p>
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Mis equipos</h4>
      <div class="clinical-teams-list">${joinedHtml}</div>
    </section>
    ${renderCreateTeamForm()}`;

  wireClinicalTeamsPanelInteractions();
}

function wireClinicalTeamsPanelInteractions() {
  const createForm = document.getElementById('clinical-team-create-form');
  if (createForm && !createForm._rpcTeamsCreateWired) {
    createForm._rpcTeamsCreateWired = true;
    createForm.addEventListener('submit', (ev) => void handleCreateTeamSubmit(ev));
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
  const subAreaFraction = String(
    document.getElementById('clinical-team-create-fraction')?.value || ''
  ).trim();
  const onCallDayIndex = Number(document.getElementById('clinical-team-create-day')?.value ?? 0);
  const userId = currentUserId();

  if (!name || !service) {
    toast('Indica nombre y servicio.', 'error');
    return;
  }

  const res = await api.dbClinicalTeamsCreate({
    name,
    service,
    subAreaFraction: subAreaFraction || undefined,
    onCallDayIndex,
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
  await renderClinicalTeamsPanel();
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
