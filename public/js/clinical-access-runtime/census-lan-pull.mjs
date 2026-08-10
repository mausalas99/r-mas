import { isDbMode } from '../db-storage-bridge.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { isCloudSyncActive } from '../features/cloud-sync/nube-sync-policy.mjs';
import { patients } from '../app-state.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import {
  countElevatedMissingPatients,
  countTeamMemberMissingPatients,
} from './census-missing-count.mjs';
import {
  clinicalOpsSyncedRefreshTimer,
  refreshClinicalPatientListForScopeInFlight,
  setClinicalOpsSyncedRefreshTimer,
  setRefreshClinicalPatientListForScopeInFlight,
} from './state.mjs';
import { fetchClinicalScopeContextFromDb, fetchClinicalTeamsFromDb } from './scope-db.mjs';
import { getClinicalScopeContextForEvaluate } from './scope-evaluate.mjs';

/** @type {ReturnType<typeof setTimeout>|null} */
let nubePatientReconcileTimer = null;
/** @type {Promise<void>|null} */
let nubePatientReconcileInFlight = null;

/** Pull missing census rows from the Nube sala room after clinicalOps assignments land. */
async function runNubePatientReconcile(_reason) {
  if (!isCloudSyncActive()) return;
  if (nubePatientReconcileInFlight) return nubePatientReconcileInFlight;

  nubePatientReconcileInFlight = (async function () {
    try {
      const { getSharedNubeRuntime } = await import('../features/cloud-sync/panel-conexion-runtime.mjs');
      const { autostartCloudSyncIfConfigured } = await import('../features/cloud-sync/autostart.mjs');
      let runtime = getSharedNubeRuntime();
      if (!runtime) runtime = await autostartCloudSyncIfConfigured();
      if (!runtime || typeof runtime.syncCycle !== 'function') return;
      await runtime.syncCycle();
      await refreshClinicalPatientListForScope({ allowLanPull: false });
    } catch {
      /* Nube optional */
    }
  })().finally(function () {
    nubePatientReconcileInFlight = null;
  });
  return nubePatientReconcileInFlight;
}

/**
 * LAN host reconcile retired — on Nube, debounce a sala-room pull when assignments
 * exist locally but census charts are still missing on this Mac.
 * @param {string} _reason @param {number} [delayMs]
 */
async function scheduleLanPatientReconcile(_reason, delayMs) {
  if (!isCloudSyncActive()) return;
  const wait = Number(delayMs) || 0;
  if (nubePatientReconcileTimer) clearTimeout(nubePatientReconcileTimer);
  if (wait <= 0) {
    await runNubePatientReconcile(_reason);
    return;
  }
  nubePatientReconcileTimer = setTimeout(function () {
    nubePatientReconcileTimer = null;
    void runNubePatientReconcile(_reason);
  }, wait);
}

async function countMissingAssignedPatients(user, teams, assignments, localIds, now) {
  if (hasElevatedTeamPrivileges(user)) {
    return countElevatedMissingPatients(assignments, localIds);
  }
  const teamMissing = await countTeamMemberMissingPatients(user, teams, assignments, localIds, now);
  return teamMissing == null ? 0 : teamMissing;
}

/** Pull host census rows for team assignments missing on this device. */
export async function ensureTeamAssignedPatientsOnDevice(options) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return;
  const ctx = getClinicalScopeContextForEvaluate();
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const now = ctx.now || new Date().toISOString();
  const localIds = new Set((patients || []).map((p) => String(p?.id || '')));
  const missing = await countMissingAssignedPatients(user, teams, assignments, localIds, now);
  if (!missing) return;
  const opts = options || {};
  if (!opts.allowLanPull) return;
  await scheduleLanPatientReconcile('missing-patients', opts.lanPullDelayMs);
}

/**
 * Elevated census: reconcile full ward from LAN host when viewing all teams.
 * @param {{ allowLanPull?: boolean, teamFilterId?: string, lanPullDelayMs?: number }} [options]
 */
export async function ensureElevatedWardCensusOnDevice(options = {}) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id || !hasElevatedTeamPrivileges(user)) return;

  const teamFilterId = options.teamFilterId != null ? String(options.teamFilterId) : '';
  const viewingAllTeams = !teamFilterId;

  await ensureTeamAssignedPatientsOnDevice(options);

  if (!viewingAllTeams || !options.allowLanPull) return;
  await scheduleLanPatientReconcile(
    'full-ward-census',
    options.lanPullDelayMs != null ? options.lanPullDelayMs : 2000
  );
}

/** Reload teams + scope from DB and re-filter the patient sidebar (LAN join / team roster). */
export async function refreshClinicalPatientListForScope(options) {
  if (!clinicalSessionContext.user?.user_id) return;
  if (refreshClinicalPatientListForScopeInFlight) return refreshClinicalPatientListForScopeInFlight;
  const opts = options || {};
  setRefreshClinicalPatientListForScopeInFlight(
    (async function () {
      if (isDbMode()) {
        await fetchClinicalTeamsFromDb();
        await fetchClinicalScopeContextFromDb();
      }
      await ensureTeamAssignedPatientsOnDevice({
        allowLanPull: opts.allowLanPull !== false,
        lanPullDelayMs: opts.lanPullDelayMs,
      });
      if (typeof document === 'undefined') return;
      try {
        const mod = await import('../features/patients.mjs');
        if (typeof mod.renderPatientList === 'function') {
          mod.renderPatientList({ silent: true });
        }
      } catch { /* patients UI optional */ }
    })().finally(function () {
      setRefreshClinicalPatientListForScopeInFlight(null);
    })
  );
  return refreshClinicalPatientListForScopeInFlight;
}

function rosterChangedFromMergeStats(stats) {
  return (
    Number(stats.assignmentsInserted) > 0 ||
    Number(stats.membershipInserted) > 0 ||
    Number(stats.membershipRejoinsApplied) > 0
  );
}

async function scheduleHostReconcileAfterOpsMerge() {
  await scheduleLanPatientReconcile('assignment-merge', 2000);
}

/** One-shot host bundle pull when roster/assignments change visibility (not on every no-op merge). */
async function pullHostPatientsAfterOpsMerge(event) {
  const stats = event?.detail?.mergeStats;
  if (!stats || !rosterChangedFromMergeStats(stats)) return;
  try {
    await scheduleHostReconcileAfterOpsMerge();
  } catch { /* LAN optional */ }
}

export function wireClinicalOpsSyncRefresh() {
  if (typeof document === 'undefined' || document._rpcClinicalOpsSyncedRefreshWired) return;
  document._rpcClinicalOpsSyncedRefreshWired = true;
  document.addEventListener('rpc-clinical-ops-synced', (event) => {
    if (document.body.classList.contains('clinical-lan-directory-open')) return;
    if (clinicalOpsSyncedRefreshTimer) clearTimeout(clinicalOpsSyncedRefreshTimer);
    setClinicalOpsSyncedRefreshTimer(
      setTimeout(function () {
        setClinicalOpsSyncedRefreshTimer(null);
        void refreshClinicalPatientListForScope({ allowLanPull: false });
        void pullHostPatientsAfterOpsMerge(event);
      }, 1500)
    );
  });
}
