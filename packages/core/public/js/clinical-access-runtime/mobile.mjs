import { shouldEnforceTeamPatientMirror } from '../clinical-privileges.mjs';
import { prunePatientsOutsideVisibleScope } from './patient-scope-prune.mjs';

/** Replace in-memory census with team-scoped rows only (web/iPad). */
export function pruneMobilePatientsOutsideTeamScope() {
  if (!shouldEnforceTeamPatientMirror()) return 0;
  return prunePatientsOutsideVisibleScope();
}

/** Refresh sidebar after cloud/LAN scope settles on desktop (Nube ghost census cleanup). */
export async function refreshDesktopPatientListAfterScopePrune() {
  if (typeof document === 'undefined') return;
  try {
    const mod = await import('../features/patients.mjs');
    if (typeof mod.ensureActivePatientInSidebarScope === 'function') {
      mod.ensureActivePatientInSidebarScope();
    }
    if (typeof mod.renderPatientList === 'function') {
      mod.renderPatientList({ silent: true });
    }
  } catch {
    /* patients UI optional */
  }
  try {
    const { renderGuardiaCensusGrid } = await import('./guardia-grid.mjs');
    const { rt } = await import('../features/patients-runtime-state.mjs');
    renderGuardiaCensusGrid(rt.getSettings());
  } catch {
    /* guardia optional */
  }
}

/** Prune + one sidebar refresh after LAN scope/patients settle (avoids 3↔11 flash). */
export async function finalizeMobileLanPatientCensus() {
  if (!shouldEnforceTeamPatientMirror()) return { pruned: 0 };
  const pruned = pruneMobilePatientsOutsideTeamScope();
  if (typeof document === 'undefined') return { pruned };
  try {
    const mod = await import('../features/patients.mjs');
    if (typeof mod.invalidateMobileSidebarPatientCache === 'function') {
      mod.invalidateMobileSidebarPatientCache();
    }
    if (typeof mod.ensureActivePatientInSidebarScope === 'function') {
      mod.ensureActivePatientInSidebarScope();
    }
    if (typeof mod.renderPatientList === 'function') {
      mod.renderPatientList({ silent: true });
    }
  } catch {
    /* patients UI optional */
  }
  return { pruned };
}
