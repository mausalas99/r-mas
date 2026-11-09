/**
 * Mi rotación entry — opens ⇄ Conexión → Opciones → Equipo (barra superior retirada).
 */
import { notify } from '../toast-notify.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { readRpcSettings, isClinicalLocalOnlyMode } from '../clinical-settings.mjs';
import { syncClinicalContextBarVisibility } from './clinical-context-bar.mjs';
import { syncGuardiaRotationToolbar } from './clinical-rotation.mjs';

let entryControlsWired = false;

export async function openMiRotacion() {
  if (!isDbMode()) {
    notify('Mi rotación requiere la base de datos clínica.', 'info');
    return;
  }
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    notify(
      'Mi rotación no está disponible en modo solo este equipo (ajeno a medicina interna).',
      'info'
    );
    return;
  }

  const { openConexionEquipoPanel } = await import('./cloud-sync/panel-equipo-nav.mjs');
  await openConexionEquipoPanel({
    toast: notify,
  });
  syncClinicalRotationEntryChrome();
}

/** Barra superior Mi rotación retirada — solo mantiene visibilidad del context bar por filtros. */
export function syncClinicalRotationEntryChrome() {
  const rotationSection = document.getElementById('clinical-rotation-section');
  if (rotationSection) rotationSection.hidden = true;

  syncGuardiaRotationToolbar();
  syncClinicalContextBarVisibility();
}

export function wireClinicalRotationEntryControls() {
  if (entryControlsWired) return;
  entryControlsWired = true;

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
