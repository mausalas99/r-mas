/**
 * Ajustes: switch solo-equipo ↔ guardia LAN / Nube.
 */
import { isDbMode } from '../db-storage-bridge.mjs';
import {
  isClinicalLocalOnlyMode,
  readRpcSettings,
  setClinicalSyncModeLocalOnly,
} from '../clinical-settings.mjs';
import { shouldShowNubePanel } from './cloud-sync/lan-override.mjs';

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

function settingsSala() {
  const s = readRpcSettings();
  return String((s && s.clinicalSala) || '').trim();
}

async function refreshChromeAfterLocalOnlyExit() {
  try {
    const { closeSettingsDropdown, syncTeamSyncHeaderButton } = await import(
      './settings-help/settings-dropdown.mjs'
    );
    closeSettingsDropdown();
    syncTeamSyncHeaderButton();
  } catch (_e) { void _e; }

  try {
    const main = await import('./clinical-onboarding-main.mjs');
    await main.refreshMainClinicalOnboardingIfNeeded();
  } catch (_e) { void _e; }

  try {
    const rot = await import('./clinical-rotation-entry.mjs');
    if (typeof rot.syncClinicalRotationEntryChrome === 'function') {
      rot.syncClinicalRotationEntryChrome();
    }
  } catch (_e) { void _e; }

  syncClinicalSyncModeSettingsUi();
}

export function syncClinicalSyncModeSettingsUi() {
  const wrap = document.getElementById('settings-clinical-sync-mode');
  if (!wrap) return;
  const show = isDbMode() && isClinicalLocalOnlyMode(readRpcSettings());
  wrap.hidden = !show;
}

export async function enableClinicalLanFromSettings() {
  if (!isDbMode()) {
    toast('La base clínica no está activa.', 'error');
    return;
  }
  if (!isClinicalLocalOnlyMode(readRpcSettings())) {
    toast(
      shouldShowNubePanel(settingsSala())
        ? 'Ya usas sincronización por Nube (⇄ Conexión).'
        : 'Ya usas guardia en red (LAN).',
      'info'
    );
    return;
  }

  // Cloud salas: exit local-only → Nube onboarding, never start LAN runtime.
  if (shouldShowNubePanel(settingsSala())) {
    const okNube = window.confirm(
      '¿Activar sincronización del turno?\n\n' +
        'Tu sala usa Nube (⇄ Conexión), no LAN. ' +
        'Los expedientes en esta Mac se conservan.'
    );
    if (!okNube) return;
    setClinicalSyncModeLocalOnly(false);
    await refreshChromeAfterLocalOnlyExit();
    toast('Sincronización por Nube. Abre ⇄ Conexión para unirte a la sala del turno.', 'success');
    return;
  }

  const ok = window.confirm(
    '¿Activar guardia en red (LAN)?\n\n' +
      'Configurarás usuario @usuario, sala y podrás usar Mi rotación y ⇄ LiveSync. ' +
      'Los expedientes en esta Mac se conservan.'
  );
  if (!ok) return;

  setClinicalSyncModeLocalOnly(false);

  try {
    const lan = await import('./cloud-sync/mutate-bridge.mjs');
    if (typeof lan.ensureLanSyncRuntimeStarted === 'function') {
      lan.ensureLanSyncRuntimeStarted();
    }
  } catch (err) {
    console.warn('[R+] LAN runtime after local-only exit:', err && err.message);
  }

  await refreshChromeAfterLocalOnlyExit();
  toast('Modo LAN activado. Completa tu perfil de guardia si R+ te lo pide.', 'success');
}

export const windowHandlers = {
  enableClinicalLanFromSettings,
  syncClinicalSyncModeSettingsUi,
};
