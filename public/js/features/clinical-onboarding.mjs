/**
 * Clinical onboarding wizard (username claim → create/join team).
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
} from '../clinical-access-runtime.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../clinical-username.mjs';

/** @param {object[]} teams @param {string} userId */
function filterJoinedTeams(teams, userId) {
  const uid = String(userId || '');
  if (!uid) return [];
  return (teams || []).filter((team) =>
    (team.members || []).some((m) => String(m.user_id) === uid)
  );
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

function getClientId() {
  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    return String(settings.clientId || '');
  } catch (_e) {
    return '';
  }
}

export function needsUsernameClaim() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return true;
  return isLegacyMachineUsername(user.username, getClientId());
}

export function needsTeamOnboarding() {
  const userId = String(clinicalSessionContext.user?.user_id || '');
  if (!userId) return true;
  const teams = clinicalSessionContext.teams || [];
  return filterJoinedTeams(teams, userId).length === 0;
}

export function needsClinicalOnboarding() {
  return needsUsernameClaim() || needsTeamOnboarding();
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

function memberLabel(m) {
  const handle = escapeHtml(m.username || m.user_id);
  const name = String(m.clinical_name || '').trim();
  const rank = escapeHtml(m.rank || '');
  if (name) return `${handle} <span class="clinical-teams-member-rank">· ${escapeHtml(name)} (${rank})</span>`;
  return `${handle} <span class="clinical-teams-member-rank">${rank}</span>`;
}

function renderDirectoryCard(team, userId) {
  const teamId = String(team.team_id || '');
  const members = Array.isArray(team.members) ? team.members : [];
  const memberList = members.length
    ? members.map((m) => `<li>${memberLabel(m)}</li>`).join('')
    : '<li class="clinical-teams-empty">Sin miembros</li>';
  const meta = [
    escapeHtml(team.service || ''),
    team.sub_area_fraction ? escapeHtml(team.sub_area_fraction) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  let action = '';
  if (team.isMember) {
    action = '<span class="clinical-teams-joined-badge">Ya eres miembro</span>';
  } else if (team.joinEligible) {
    action = `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr(teamId)}">Unirme</button>`;
  } else if (team.joinReason) {
    action = `<span class="clinical-teams-join-hint">${escapeHtml(team.joinReason)}</span>`;
  }

  return `
    <article class="clinical-teams-card clinical-teams-card--directory" data-team-id="${escapeAttr(teamId)}">
      <header class="clinical-teams-card-head">
        <div>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || 'Equipo')}</h5>
          <p class="clinical-teams-card-meta">${meta}</p>
        </div>
        ${action}
      </header>
      <ul class="clinical-teams-member-list">${memberList}</ul>
    </article>`;
}

async function loadSalaDirectory(sala, userId) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsListBySala !== 'function') return [];
  const res = await api.dbClinicalTeamsListBySala({ sala, forUserId: userId });
  if (!res || res.ok === false) return [];
  return Array.isArray(res.teams) ? res.teams : [];
}

async function handleUsernameStepSubmit(ev) {
  ev.preventDefault();
  const username = normalizeUsername(
    String(document.getElementById('onboard-username')?.value || '')
  );
  const name = String(document.getElementById('onboard-clinical-name')?.value || '').trim();
  const rank = String(document.getElementById('onboard-rank')?.value || 'R1');
  const sala = String(document.getElementById('onboard-sala')?.value || '').trim();
  const errEl = document.getElementById('onboard-error');

  if (!isValidUsernameFormat(username)) {
    if (errEl) {
      errEl.textContent = 'Usuario inválido (3–32 caracteres, minúsculas).';
      errEl.hidden = false;
    }
    return;
  }
  if (!name) {
    if (errEl) {
      errEl.textContent = 'Escribe tu nombre en guardia.';
      errEl.hidden = false;
    }
    return;
  }

  const userId = String(clinicalSessionContext.user?.user_id || '');
  const api = dbApi();
  if (!userId || !api) {
    toast('Sesión clínica no disponible.', 'error');
    return;
  }

  if (typeof api.dbClinicalUsernameClaim === 'function') {
    const claimRes = await api.dbClinicalUsernameClaim({ userId, username });
    if (!claimRes?.ok) {
      if (errEl) {
        errEl.textContent = claimRes?.error || 'No se pudo registrar el usuario.';
        errEl.hidden = false;
      }
      return;
    }
    if (clinicalSessionContext.user) {
      clinicalSessionContext.user.username = username;
    }
  }

  if (typeof api.dbClinicalProfileUpsert === 'function') {
    const profileRes = await api.dbClinicalProfileUpsert({
      userId,
      clinicalName: name,
      rank,
      sala: sala || null,
    });
    if (!profileRes?.ok) {
      if (errEl) {
        errEl.textContent = profileRes?.error || 'No se guardó el perfil.';
        errEl.hidden = false;
      }
      return;
    }
    if (clinicalSessionContext.user) {
      clinicalSessionContext.user.rank = rank;
      clinicalSessionContext.user.clinical_name = name;
      clinicalSessionContext.user.sala = sala || null;
    }
  }

  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {}
  settings.clinicalRegistered = true;
  settings.clinicalUsername = username;
  settings.clinicalDisplayName = name;
  settings.clinicalRank = rank;
  if (sala) settings.clinicalSala = sala;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) {}

  if (errEl) errEl.hidden = true;
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await renderOnboardingPanel();
}

async function handleJoinTeam(teamId) {
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const api = dbApi();
  if (!teamId || !userId || !api || typeof api.dbClinicalTeamsJoin !== 'function') {
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
  await fetchClinicalTeamsFromDb();
  if (!needsClinicalOnboarding()) {
    const { renderClinicalTeamsPanel } = await import('./clinical-teams.mjs');
    await renderClinicalTeamsPanel();
    return;
  }
  await renderOnboardingPanel();
}

async function wireOnboardingInteractions() {
  const form = document.getElementById('clinical-onboard-username-form');
  if (form && !form._rpcOnboardWired) {
    form._rpcOnboardWired = true;
    form.addEventListener('submit', (ev) => void handleUsernameStepSubmit(ev));
  }

  document.querySelectorAll('.clinical-teams-join-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcJoinWired) return;
    btn._rpcJoinWired = true;
    btn.addEventListener('click', () => {
      void handleJoinTeam(String(btn.dataset.teamId || ''));
    });
  });

  const teamsMod = await import('./clinical-teams.mjs');
  teamsMod.wireClinicalTeamsPanelInteractions();
}

export async function renderOnboardingPanel() {
  const host = document.getElementById('clinical-teams-panel-body');
  if (!host) return;

  const userId = String(clinicalSessionContext.user?.user_id || '');
  if (!userId) {
    host.innerHTML =
      '<p class="clinical-teams-lead">Activa la sesión clínica para continuar.</p>';
    return;
  }

  await fetchClinicalTeamsFromDb();

  if (needsUsernameClaim()) {
    const rank = clinicalSessionContext.user?.rank || 'R1';
    host.innerHTML = `
      <div class="clinical-onboarding-progress" aria-hidden="true"><span class="is-active">1</span><span>2</span></div>
      <h4 class="clinical-teams-section-title">Paso 1 — Tu usuario</h4>
      <p class="clinical-teams-lead">Elige tu usuario LAN. Tus compañeros lo usarán para equipos y entregas.</p>
      <form id="clinical-onboard-username-form" class="clinical-teams-create-form">
        <div class="field-group">
          <label for="onboard-username">Usuario LAN *</label>
          <input id="onboard-username" type="text" class="profile-input" placeholder="mgarcia" required>
        </div>
        <div class="field-group">
          <label for="onboard-clinical-name">Nombre en guardia *</label>
          <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="Dr. Pérez" required>
        </div>
        <div class="field-group">
          <label for="onboard-rank">Rango</label>
          <select id="onboard-rank" class="profile-input">
            <option value="R1" ${rank === 'R1' ? 'selected' : ''}>R1</option>
            <option value="R2" ${rank === 'R2' ? 'selected' : ''}>R2</option>
            <option value="R3" ${rank === 'R3' ? 'selected' : ''}>R3</option>
            <option value="R4" ${rank === 'R4' ? 'selected' : ''}>R4</option>
            <option value="Admin" ${rank === 'Admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div class="field-group">
          <label for="onboard-sala">Sala *</label>
          <select id="onboard-sala" class="profile-input" required>
            <option value="">— Seleccionar —</option>
            <option value="Sala 1">Sala 1</option>
            <option value="Sala 2">Sala 2</option>
            <option value="Sala E">Sala E</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Continuar</button>
        </div>
      </form>`;
    await wireOnboardingInteractions();
    return;
  }

  if (needsTeamOnboarding()) {
    const sala =
      String(clinicalSessionContext.user?.sala || '').trim() ||
      (() => {
        try {
          return String(JSON.parse(localStorage.getItem('rpc-settings') || '{}').clinicalSala || '');
        } catch (_e) {
          return '';
        }
      })();

    if (!sala) {
      host.innerHTML =
        '<p class="clinical-teams-lead">Indica tu Sala en el paso anterior o en Mi perfil.</p>';
      return;
    }

    const directory = await loadSalaDirectory(sala, userId);
    const directoryHtml = directory.length
      ? directory.map((t) => renderDirectoryCard(t, userId)).join('')
      : '<p class="clinical-teams-empty">No hay equipos en tu sala todavía. Crea uno abajo.</p>';

    const teamsMod = await import('./clinical-teams.mjs');
    const createFormHtml = teamsMod.renderCreateTeamForm();

    host.innerHTML = `
      <div class="clinical-onboarding-progress" aria-hidden="true"><span>1</span><span class="is-active">2</span></div>
      <h4 class="clinical-teams-section-title">Paso 2 — Tu equipo</h4>
      <p class="clinical-teams-lead">Equipos en <strong>${escapeHtml(sala)}</strong>. Únete a uno o crea el tuyo.</p>
      <section class="clinical-teams-section">
        <h5 class="clinical-teams-section-title">Equipos en tu sala</h5>
        <div class="clinical-teams-list">${directoryHtml}</div>
      </section>
      ${createFormHtml}`;

    await wireOnboardingInteractions();
    return;
  }

  const { renderClinicalTeamsPanel } = await import('./clinical-teams.mjs');
  await renderClinicalTeamsPanel();
}
