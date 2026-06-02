/**
 * Clinical onboarding wizard (username claim → create/join team).
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername,
} from '../clinical-access-runtime.mjs';
import { persistClinicalUserBinding, readRpcSettings } from '../clinical-settings.mjs';
import { safeRenderClinicalTeamsPanel } from './clinical-panel-host.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../clinical-username.mjs';

import { filterJoinedTeams } from './clinical-teams.mjs';

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
  if (isLegacyMachineUsername(user.username, getClientId())) return true;
  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    const cached = String(settings.clinicalUsername || '').trim();
    if (cached && !isValidUsernameFormat(normalizeUsername(cached))) return true;
    if (cached && isLegacyMachineUsername(user.username, getClientId())) return true;
  } catch (_e) {}
  const handle = normalizeUsername(user.username || '');
  return !isValidUsernameFormat(handle);
}

export function needsTeamOnboarding() {
  if (!clinicalSessionContext.user?.user_id) return true;
  const teams = clinicalSessionContext.teams || [];
  return filterJoinedTeams(teams, clinicalSessionContext.user).length === 0;
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
  let rank = String(document.getElementById('onboard-rank')?.value || 'R1');
  const isProgramAdmin = rank === 'Admin';
  if (isProgramAdmin) rank = 'R1';
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

  let settings = readRpcSettings();
  let sessionUserId = String(clinicalSessionContext.user?.user_id || '');
  const api = dbApi();
  if (!sessionUserId || !api) {
    toast('Sesión clínica no disponible.', 'error');
    return;
  }

  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || '');
  const needsClaim = currentHandle !== username;

  if (needsClaim && typeof api.dbClinicalUsernameClaim === 'function') {
    const claimRes = await api.dbClinicalUsernameClaim({ userId: sessionUserId, username });
    if (!claimRes?.ok) {
      const errMsg = String(claimRes?.error || '');
      if (/ya está en uso/i.test(errMsg)) {
        const cached = normalizeUsername(String(settings.clinicalUsername || ''));
        const autoResume = cached === username;
        const resume =
          autoResume ||
          window.confirm(
            `El usuario @${username} ya está registrado en esta base de datos.\n\n¿Recuperar tu cuenta en este dispositivo?`
          );
        if (resume) {
          const resumeRes = await resumeClinicalIdentityByUsername(
            username,
            settings,
            getClientId()
          );
          if (!resumeRes.ok) {
            if (errEl) {
              errEl.textContent = resumeRes.error || errMsg;
              errEl.hidden = false;
            }
            return;
          }
          sessionUserId = String(clinicalSessionContext.user?.user_id || '');
          settings = readRpcSettings();
        } else {
          if (errEl) {
            errEl.textContent = errMsg;
            errEl.hidden = false;
          }
          return;
        }
      } else {
        if (errEl) {
          errEl.textContent = errMsg || 'No se pudo registrar el usuario.';
          errEl.hidden = false;
        }
        return;
      }
    } else if (clinicalSessionContext.user) {
      clinicalSessionContext.user.username = username;
    }
  }

  if (typeof api.dbClinicalProfileUpsert === 'function') {
    const profileRes = await api.dbClinicalProfileUpsert({
      userId: sessionUserId,
      clinicalName: name,
      rank,
      sala: sala || null,
      isProgramAdmin,
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
      clinicalSessionContext.user.is_program_admin = isProgramAdmin ? 1 : 0;
    }
  }

  persistClinicalUserBinding({
    userId: sessionUserId,
    username,
    displayName: name,
    rank,
    sala: sala || '',
    registered: true,
    isProgramAdmin,
  });

  if (errEl) errEl.hidden = true;
  await refreshClinicalUserProfile();
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

async function handleResumeIdentityClick() {
  const username = normalizeUsername(
    String(document.getElementById('onboard-username')?.value || '')
  );
  const errEl = document.getElementById('onboard-error');
  const resumeBtn = document.getElementById('clinical-onboard-resume-btn');
  if (!isValidUsernameFormat(username)) {
    if (errEl) {
      errEl.textContent = 'Escribe tu usuario LAN para recuperarlo.';
      errEl.hidden = false;
    }
    return;
  }
  if (resumeBtn instanceof HTMLButtonElement) {
    resumeBtn.disabled = true;
    resumeBtn.textContent = 'Recuperando…';
  }
  const settings = readRpcSettings();
  try {
    const resumeRes = await resumeClinicalIdentityByUsername(
      username,
      settings,
      getClientId()
    );
    if (!resumeRes.ok) {
      if (errEl) {
        errEl.textContent = resumeRes.error || 'No se pudo recuperar la cuenta.';
        errEl.hidden = false;
      }
      return;
    }
    if (errEl) errEl.hidden = true;
    toast('Cuenta recuperada.', 'success');
    await refreshClinicalUserProfile();
    if (!needsUsernameClaim()) {
      await renderOnboardingPanel();
      return;
    }
    toast('Completa tu perfil y pulsa Continuar.', 'info');
    await renderOnboardingPanel();
  } finally {
    if (resumeBtn instanceof HTMLButtonElement) {
      resumeBtn.disabled = false;
      resumeBtn.textContent = 'Recuperar mi usuario';
    }
  }
}

async function wireOnboardingInteractions() {
  const form = document.getElementById('clinical-onboard-username-form');
  if (form && !form._rpcOnboardWired) {
    form._rpcOnboardWired = true;
    form.addEventListener('submit', (ev) => void handleUsernameStepSubmit(ev));
  }

  const resumeBtn = document.getElementById('clinical-onboard-resume-btn');
  if (resumeBtn && !resumeBtn._rpcResumeWired) {
    resumeBtn._rpcResumeWired = true;
    resumeBtn.addEventListener('click', () => void handleResumeIdentityClick());
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
  await safeRenderClinicalTeamsPanel(async (host) => {
    await renderOnboardingPanelInto(host);
  });
}

async function renderOnboardingPanelInto(host) {
  const userId = String(clinicalSessionContext.user?.user_id || '');
  if (!userId) {
    host.innerHTML =
      '<p class="clinical-teams-lead">Activa la sesión clínica para continuar.</p>';
    return;
  }

  await fetchClinicalTeamsFromDb();

  let settings = readRpcSettings();
  const cachedUsername = normalizeUsername(String(settings.clinicalUsername || ''));
  if (needsUsernameClaim() && cachedUsername && isValidUsernameFormat(cachedUsername)) {
    try {
      await resumeClinicalIdentityByUsername(cachedUsername, settings, getClientId());
      await refreshClinicalUserProfile();
      settings = readRpcSettings();
    } catch (_e) {
      /* fall through to manual step 1 */
    }
  }

  if (!needsUsernameClaim() && !needsTeamOnboarding()) {
    const { renderClinicalTeamsPanel } = await import('./clinical-teams.mjs');
    await renderClinicalTeamsPanel();
    return;
  }

  if (needsUsernameClaim()) {
    const rank =
      String(settings.clinicalRank || clinicalSessionContext.user?.rank || 'R1');
    const prefilledName = String(
      settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ''
    );
    const prefilledSala = String(
      settings.clinicalSala || clinicalSessionContext.user?.sala || ''
    );
    host.innerHTML = `
      <div class="clinical-onboarding-progress" aria-hidden="true"><span class="is-active">1</span><span>2</span></div>
      <h4 class="clinical-teams-section-title">Paso 1 — Tu usuario</h4>
      <p class="clinical-teams-lead">Elige tu usuario LAN. Tus compañeros lo usarán para equipos y entregas.</p>
      <form id="clinical-onboard-username-form" class="clinical-teams-create-form">
        <div class="field-group">
          <label for="onboard-username">Usuario LAN *</label>
          <input id="onboard-username" type="text" class="profile-input" placeholder="mgarcia"
            value="${escapeAttr(cachedUsername || '')}" required>
        </div>
        <div class="field-group">
          <label for="onboard-clinical-name">Nombre en guardia *</label>
          <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="Dr. Pérez"
            value="${escapeAttr(prefilledName)}" required>
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
            <option value="Sala 1" ${prefilledSala === 'Sala 1' ? 'selected' : ''}>Sala 1</option>
            <option value="Sala 2" ${prefilledSala === 'Sala 2' ? 'selected' : ''}>Sala 2</option>
            <option value="Sala E" ${prefilledSala === 'Sala E' ? 'selected' : ''}>Sala E</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Continuar</button>
          <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
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

  host.innerHTML =
    '<p class="clinical-teams-lead">Perfil listo. Cierra y vuelve a abrir Mi rotación.</p>';
}
