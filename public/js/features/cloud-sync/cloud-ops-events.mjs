/**
 * Cloud-safe clinical-ops event wiring for Nube salas (no LAN panel / bridges).
 * Keeps teams → pushCloudClinicalOpsNow without mounting the LAN sync kernel.
 */
import { isCloudSyncActive } from './lan-override.mjs';
import {
  pushCloudClinicalOpsNow,
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

  document.addEventListener('rpc-clinical-teams-changed', function () {
    if (!isCloudSyncActive()) return;
    void pushCloudClinicalOpsNow().catch(function () {});
    maybeScheduleCloudSyncPush();
  });

  if (deps && typeof deps.refreshClinicalSessionTeams === 'function') {
    document.addEventListener('rpc-clinical-ops-synced', function () {
      void deps.refreshClinicalSessionTeams();
    });
  }
}
