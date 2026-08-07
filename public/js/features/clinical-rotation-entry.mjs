/**
 * Mi rotación entry (barra superior clínica).
 */
import { isDbMode } from '../db-storage-bridge.mjs';
import { readRpcSettings, isClinicalLocalOnlyMode } from '../clinical-settings.mjs';
import { syncClinicalContextBarVisibility } from './clinical-context-bar.mjs';
import { syncGuardiaRotationToolbar } from './clinical-rotation.mjs';
import { isGuardiaMode } from './chrome.mjs';
import { buildClinicalRotationEntryStatus } from './clinical-rotation-entry-status.mjs';

let entryControlsWired = false;

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
        'Mi rotación no está disponible en modo solo este equipo (ajeno a medicina interna).',
        'info'
      );
    }
    return;
  }

  const { openClinicalTeamsPanel } = await import('./clinical-teams/teams-roster.mjs');
  await openClinicalTeamsPanel();
  syncClinicalRotationEntryChrome();
}

/**
 * @returns {{ primary: string, sub: string, pending: boolean }}
 */
function buildEntryStatus() {
  return buildClinicalRotationEntryStatus();
}

export function syncClinicalRotationEntryChrome() {
  const rotationSection = document.getElementById('clinical-rotation-section');
  const show =
    isDbMode() && !isClinicalLocalOnlyMode(readRpcSettings()) && !isGuardiaMode();

  if (rotationSection) rotationSection.hidden = !show;
  if (!show) {
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
      : '@usuario, equipos y entregas';
    entryBtn.setAttribute('title', `${base} — ${status.primary}: ${status.sub}`);
  }
  if (entryPrimary) entryPrimary.textContent = status.primary;
  if (entrySub) entrySub.textContent = status.sub;

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
  }
}

export const windowHandlers = {
  openMiRotacion,
};
