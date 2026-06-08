/**
 * Mi rotación entry (barra superior clínica).
 */
import { isDbMode } from '../db-storage-bridge.mjs';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { normalizeUsername } from '../clinical-username.mjs';
import { filterJoinedTeams } from './clinical-teams/shared.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { readRpcSettings, isClinicalLocalOnlyMode } from '../clinical-settings.mjs';
import { needsClinicalOnboarding, needsTeamOnboarding } from './clinical-onboarding.mjs';
import { syncClinicalContextBarVisibility } from './clinical-context-bar.mjs';
import { syncGuardiaRotationToolbar } from './clinical-rotation.mjs';
import { isGuardiaMode } from './chrome.mjs';
import { storage } from '../storage.js';
import { subscribeRoomSyncPhase } from '../lan-sync-state.mjs';

let entryControlsWired = false;

async function openLanConnectPanelForPin() {
  try {
    const { openConnectionDropdown, focusLanShiftPinInput } = await import('./lan-sync.mjs');
    if (typeof openConnectionDropdown === 'function') openConnectionDropdown();
    if (typeof focusLanShiftPinInput === 'function') {
      window.setTimeout(() => focusLanShiftPinInput(), 80);
    }
  } catch (_e) {
    if (typeof window.showToast === 'function') {
      window.showToast('Abre ⇄ (Wi‑Fi) arriba e ingresa el PIN del turno.', 'info');
    }
  }
}

async function handleLanConnectCtaClick() {
  const savedPin = typeof storage.getLanShiftPin === 'function' ? storage.getLanShiftPin() : '';
  if (/^\d{6}$/.test(savedPin)) {
    try {
      const { tryEasyLanShiftPinConnect } = await import('../lan-shift-pin-connect.mjs');
      const result = await tryEasyLanShiftPinConnect({ force: true });
      if (result.ok) {
        syncClinicalRotationEntryChrome();
        return;
      }
    } catch (_e) {}
  }
  await openLanConnectPanelForPin();
}

/** @returns {boolean} */
function needsLanConnectCta() {
  if (isClinicalLocalOnlyMode(readRpcSettings())) return false;
  if (needsClinicalOnboarding()) return false;
  return true;
}

async function isLanConnectCtaVisible() {
  if (!needsLanConnectCta()) return false;
  try {
    const lan = await import('./lan-sync.mjs');
    if (!lan.isLanSessionConfiguredForRest?.()) return true;
    const { getRoomSyncPhase, RoomSyncPhase } = await import('../lan-sync-state.mjs');
    const roomId =
      typeof lan.getActiveLiveSyncRoomId === 'function' ? lan.getActiveLiveSyncRoomId() : '';
    if (!roomId) return true;
    return getRoomSyncPhase(roomId) !== RoomSyncPhase.live;
  } catch (_e) {
    return true;
  }
}

function syncLanConnectCta(show) {
  const section = document.getElementById('clinical-rotation-section');
  if (!section) return;

  let btn = document.getElementById('btn-clinical-lan-connect');
  if (!show) {
    if (btn) btn.remove();
    return;
  }

  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-clinical-lan-connect';
    btn.type = 'button';
    btn.className = 'app-bar-lan-connect-cta';
    btn.textContent = 'Conectar al turno';
    btn.title = 'Usa el PIN de 6 dígitos del anfitrión (⇄)';
    btn.addEventListener('click', () => void handleLanConnectCtaClick());
    section.appendChild(btn);
  }
}

export async function openMiRotacion() {
  if (!isDbMode()) {
    if (typeof window.showToast === 'function') {
      window.showToast('Mi rotación requiere la base de datos clínica.', 'info');
    }
    return;
  }
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    if (typeof window.showToast === 'function') {
      window.showToast(
        'Mi rotación y equipos LAN no están disponibles en modo solo este equipo.',
        'info'
      );
    }
    return;
  }

  const { ensureClinicalPanelSession } = await import('./clinical-panel-host.mjs');
  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    const mainMod = await import('./clinical-onboarding-main.mjs');
    const msg = await mainMod.describeOnboardingSessionBlock();
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'error');
    }
    if (!mainMod.focusMainClinicalOnboarding()) await mainMod.showMainClinicalOnboarding();
    syncClinicalRotationEntryChrome();
    return;
  }

  if (needsClinicalOnboarding()) {
    const mainMod = await import('./clinical-onboarding-main.mjs');
    await mainMod.showMainClinicalOnboarding();
    mainMod.focusMainClinicalOnboarding();
    return;
  }

  const { wireClinicalTeamsModalChrome } = await import(
    './clinical-teams/teams-roster-modal-chrome.mjs'
  );
  wireClinicalTeamsModalChrome();
  const { openClinicalTeamsPanel } = await import('./clinical-teams/teams-roster.mjs');
  await openClinicalTeamsPanel();
}

/**
 * @returns {{ primary: string, sub: string, pending: boolean }}
 */
function buildEntryStatus() {
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    return {
      primary: 'Solo este equipo',
      sub: 'Sin LAN ni Mi rotación',
      pending: false,
    };
  }
  if (needsClinicalOnboarding()) {
    return {
      primary: 'Configura tu rotación',
      sub: 'Usuario LAN, rango y sala — equipos después en Mi rotación',
      pending: true,
    };
  }

  const user = clinicalSessionContext.user;
  if (!user?.user_id) {
    return {
      primary: 'Mi rotación',
      sub: 'Completa la configuración inicial abajo',
      pending: true,
    };
  }

  const handle = normalizeUsername(user.username || '');
  const rank = String(user.rank || '').trim();
  const sala = String(user.sala || '').trim();
  const name = String(user.clinical_name || '').trim();
  const teams = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  const parts = [];
  if (handle) parts.push(`@${handle}`);
  if (rank) parts.push(rank);
  if (sala) parts.push(sala);
  const primary = parts.length ? parts.join(' · ') : 'Mi rotación';
  let sub = name || 'Equipos, entregas y perfil clínico';
  if (hasElevatedTeamPrivileges(user)) {
    sub = name || 'Supervisión de rotaciones — sin equipo requerido';
  } else if (teams.length === 1) sub = `Equipo: ${String(teams[0].name || '—')}`;
  else if (teams.length > 1) sub = `${teams.length} equipos`;
  else if (needsTeamOnboarding()) sub = 'Sin equipo — abre para buscar en tu sala o unirte';
  return { primary, sub, pending: false };
}

export function syncClinicalRotationEntryChrome() {
  const rotationSection = document.getElementById('clinical-rotation-section');
  const show =
    isDbMode() && !isClinicalLocalOnlyMode(readRpcSettings()) && !isGuardiaMode();

  if (rotationSection) rotationSection.hidden = !show;
  if (!show) {
    syncLanConnectCta(false);
    syncGuardiaRotationToolbar();
    syncClinicalContextBarVisibility();
    return;
  }

  const status = buildEntryStatus();

  const entryBtn = document.getElementById('btn-sidebar-mi-rotacion');
  const entryPrimary = document.getElementById('clinical-rotation-entry-primary');
  const entrySub = document.getElementById('clinical-rotation-entry-sub');
  if (entryBtn) {
    entryBtn.classList.toggle('is-pending', status.pending);
    const base = status.pending
      ? 'Completa rango y rotación (sala)'
      : 'Usuario LAN, equipos y entregas';
    entryBtn.setAttribute('title', `${base} — ${status.primary}: ${status.sub}`);
  }
  if (entryPrimary) entryPrimary.textContent = status.primary;
  if (entrySub) entrySub.textContent = status.sub;

  void isLanConnectCtaVisible().then((visible) => syncLanConnectCta(visible));
  syncGuardiaRotationToolbar();
  syncClinicalContextBarVisibility();
}

export function wireClinicalRotationEntryControls() {
  if (entryControlsWired) return;
  entryControlsWired = true;

  const bind = (id) => {
    const el = document.getElementById(id);
    if (!el || el._rpcMiRotacionWired) return;
    el._rpcMiRotacionWired = true;
    el.addEventListener('click', () => void openMiRotacion());
  };

  bind('btn-sidebar-mi-rotacion');

  if (typeof document !== 'undefined') {
    document.addEventListener('rpc-clinical-teams-changed', () => {
      syncClinicalRotationEntryChrome();
    });
    document.addEventListener('rpc-clinical-ops-synced', () => {
      syncClinicalRotationEntryChrome();
    });
    subscribeRoomSyncPhase(() => {
      syncClinicalRotationEntryChrome();
    });
  }
}

export const windowHandlers = {
  openMiRotacion,
};
