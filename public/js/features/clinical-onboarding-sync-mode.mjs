/**
 * Onboarding: LAN vs solo este equipo + minimal local profile.
 */
import { clinicalSessionContext, refreshClinicalUserProfile } from '../clinical-access-runtime.mjs';
import {
  isClinicalLocalOnlyMode,
  persistClinicalUserBinding,
  readRpcSettings,
  setClinicalSyncModeLocalOnly,
} from '../clinical-settings.mjs';
import { normalizeUsername } from '../clinical-username.mjs';

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

/** @param {string} userId */
export function localOnlyUsernameForUserId(userId) {
  const tail =
    String(userId || '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()
      .slice(-10) || 'device';
  return `local_${tail}`.slice(0, 32);
}

export function renderSyncModeChoicePanel(host) {
  host.innerHTML = `
      <h3 class="clinical-onboarding-title">¿Cómo usarás R+?</h3>
      <p class="clinical-teams-lead">Elige antes de configurar tu perfil. La elección queda guardada en este equipo.</p>
      <div class="clinical-onboard-mode-grid" role="group" aria-label="Modo de uso">
        <button type="button" class="clinical-onboard-mode-card" data-sync-mode="lan">
          <span class="clinical-onboard-mode-card-title">Guardia en red (LAN)</span>
          <span class="clinical-onboard-mode-card-desc">Usuario @usuario, sala, sincronización en vivo con el equipo y <strong>Mi rotación</strong>.</span>
        </button>
        <button type="button" class="clinical-onboard-mode-card clinical-onboard-mode-card--muted" data-sync-mode="local">
          <span class="clinical-onboard-mode-card-title">Solo este equipo</span>
          <span class="clinical-onboard-mode-card-desc">Sin LAN ni LiveSync: expedientes y notas solo en esta Mac. Sin rotaciones ni sala compartida.</span>
        </button>
      </div>`;
}

/** @param {Record<string, unknown>} settings */
export function renderLocalOnlyProfilePanel(host, settings) {
  const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || 'R1');
  const prefilledName = String(
    settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ''
  );
  host.innerHTML = `
      <h3 class="clinical-onboarding-title">Perfil local</h3>
      <p class="clinical-teams-lead">R+ no usará red de guardia. Solo necesitamos cómo firmar notas y documentos en esta Mac.</p>
      <form id="clinical-onboard-local-form" class="clinical-teams-create-form clinical-onboard-form clinical-onboard-form--local">
        <div class="field-group">
          <label for="onboard-local-name">Tu nombre en notas *</label>
          <input id="onboard-local-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
            value="${escapeAttr(prefilledName)}" required autocomplete="name">
        </div>
        <div class="field-group">
          <label for="onboard-local-rank">Rango (opcional)</label>
          <select id="onboard-local-rank" class="profile-input">
            <option value="R1" ${rank === 'R1' ? 'selected' : ''}>R1</option>
            <option value="R2" ${rank === 'R2' ? 'selected' : ''}>R2</option>
            <option value="R3" ${rank === 'R3' ? 'selected' : ''}>R3</option>
            <option value="R4" ${rank === 'R4' ? 'selected' : ''}>R4</option>
          </select>
        </div>
        <p id="onboard-error" class="clinical-registration-error" hidden></p>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Continuar sin LAN</button>
          <button type="button" id="clinical-onboard-back-mode" class="btn-med-secondary">Cambiar modo</button>
        </div>
      </form>`;
}

async function refreshOnboardingHost() {
  const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
  await refreshMainClinicalOnboardingIfNeeded();
}

export async function handleSyncModeChoice(mode) {
  if (mode === 'local') setClinicalSyncModeLocalOnly(true);
  else if (mode === 'lan') setClinicalSyncModeLocalOnly(false);
  else return;
  await refreshOnboardingHost();
}

export async function handleSyncModeBack() {
  const settings = readRpcSettings();
  delete settings.clinicalLocalOnly;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) {}
  await refreshOnboardingHost();
}

export async function handleLocalOnlyProfileSubmit(ev) {
  ev.preventDefault();
  const name = String(document.getElementById('onboard-local-name')?.value || '').trim();
  const rank = String(document.getElementById('onboard-local-rank')?.value || 'R1');
  const errEl = document.getElementById('onboard-error');

  if (!name) {
    if (errEl) {
      errEl.textContent = 'Escribe cómo quieres aparecer en notas y documentos.';
      errEl.hidden = false;
    }
    return;
  }

  const api = dbApi();
  const sessionUserId = String(clinicalSessionContext.user?.user_id || '');
  if (!sessionUserId || !api) {
    toast('Sesión clínica no disponible.', 'error');
    return;
  }

  const localHandle = localOnlyUsernameForUserId(sessionUserId);
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || '');
  if (currentHandle !== localHandle && typeof api.dbClinicalUsernameClaim === 'function') {
    const claimRes = await api.dbClinicalUsernameClaim({
      userId: sessionUserId,
      username: localHandle,
    });
    if (!claimRes?.ok && !/ya está en uso/i.test(String(claimRes?.error || ''))) {
      if (errEl) {
        errEl.textContent = claimRes?.error || 'No se pudo guardar el perfil local.';
        errEl.hidden = false;
      }
      return;
    }
    if (claimRes?.ok && clinicalSessionContext.user) {
      clinicalSessionContext.user.username = localHandle;
    }
  }

  if (typeof api.dbClinicalProfileUpsert === 'function') {
    const profileRes = await api.dbClinicalProfileUpsert({
      userId: sessionUserId,
      clinicalName: name,
      rank,
      sala: null,
      isProgramAdmin: false,
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
      clinicalSessionContext.user.sala = null;
      clinicalSessionContext.user.is_program_admin = 0;
    }
  }

  persistClinicalUserBinding({
    userId: sessionUserId,
    username: localHandle,
    displayName: name,
    rank,
    sala: '',
    registered: true,
    lanProfileGateComplete: true,
    isProgramAdmin: false,
  });
  setClinicalSyncModeLocalOnly(true);

  if (errEl) errEl.hidden = true;
  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  toast('Listo. R+ queda solo en este equipo, sin sincronización LAN.', 'success');
  await refreshOnboardingHost();
}

export function wireSyncModeOnboardingInteractions() {
  const modeHost = document.querySelector('.clinical-onboard-mode-grid');
  if (modeHost && !modeHost._rpcModeWired) {
    modeHost._rpcModeWired = true;
    modeHost.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-sync-mode]');
      if (!btn) return;
      void handleSyncModeChoice(String(btn.getAttribute('data-sync-mode') || ''));
    });
  }

  const localForm = document.getElementById('clinical-onboard-local-form');
  if (localForm && !localForm._rpcLocalWired) {
    localForm._rpcLocalWired = true;
    localForm.addEventListener('submit', (ev) => void handleLocalOnlyProfileSubmit(ev));
  }

  const backModeBtn = document.getElementById('clinical-onboard-back-mode');
  if (backModeBtn && !backModeBtn._rpcBackModeWired) {
    backModeBtn._rpcBackModeWired = true;
    backModeBtn.addEventListener('click', () => void handleSyncModeBack());
  }
}
