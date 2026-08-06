/**
 * Cloud-safe clinical-ops event wiring for Nube salas (no LAN panel / bridges).
 * Keeps teams → sala-scoped clinicalOps push without mounting the LAN sync kernel.
 */
import { isCloudSyncActive } from './lan-override.mjs';
import { normalizeCloudSala } from './sala-allowlist.mjs';
import {
  maybeScheduleCloudSyncPush,
} from './mutate-bridge.mjs';

let _cloudClinicalOpsEventsWired = false;

/**
 * @param {{ refreshClinicalSessionTeams?: () => Promise<void> }} [deps]
 */
export function wireCloudClinicalOpsSyncEvents(deps) {
  if (typeof document === 'undefined') return;
  if (_cloudClinicalOpsEventsWired) return;
  _cloudClinicalOpsEventsWired = true;

  document.addEventListener('rpc-clinical-teams-changed', function (ev) {
    if (!isCloudSyncActive()) return;
    // Pull/hydrate already wrote SQLCipher — do not echo-push (would mint a new
    // stamped mutation every poll). Local create/join/admin still push below.
    if (String(ev?.detail?.source || '') === 'cloud-hydrate') return;
    void (async () => {
      const { pushClinicalOpsForSala, pushClinicalOpsForSalas, listLocalTeamSalas } = await import(
        './cloud-clinical-ops-sala.mjs'
      );
      const sala = normalizeCloudSala(ev?.detail?.sala || '');
      if (sala) await pushClinicalOpsForSala(sala);
      else await pushClinicalOpsForSalas(await listLocalTeamSalas());
    })().catch(function () {});
    maybeScheduleCloudSyncPush();
  });

  if (deps && typeof deps.refreshClinicalSessionTeams === 'function') {
    document.addEventListener('rpc-clinical-ops-synced', function () {
      void deps.refreshClinicalSessionTeams();
    });
  }
}
