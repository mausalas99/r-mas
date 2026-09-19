import { ClientSessionInactivityLocker } from '../features/session-manager.mjs';
import { installUpdateIfIdleReady } from '../features/platform/updater/check-actions.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { markClinicalAccessBootReady } from './boot-ready.mjs';
import { bootstrapClinicalAccess } from './bootstrap.mjs';
import { wireClinicalOpsSyncRefresh } from './census-nube-pull.mjs';
import { resetClinicalSessionContext, sessionLocker, setSessionLocker } from './state.mjs';
import { unlockClinicalSessionOverlay } from './session-user.mjs';

export async function initClinicalAccessRuntime(settings, clientId) {
  const ok = await bootstrapClinicalAccess(settings, clientId);
  markClinicalAccessBootReady();
  if (!ok) return;
  wireClinicalOpsSyncRefresh();

  if (sessionLocker) sessionLocker.stop();
  const nextSessionLocker = new ClientSessionInactivityLocker(
    10,
    'rpc-clinical-session-lock',
    installUpdateIfIdleReady
  );
  setSessionLocker(nextSessionLocker);
  nextSessionLocker.start(clinicalSessionContext);
}

export function stopClinicalAccessRuntime() {
  if (vitalsLoop) {
    vitalsLoop.stop();
    setVitalsLoop(null);
  }
  if (sessionLocker) {
    sessionLocker.stop();
    setSessionLocker(null);
  }
  resetClinicalSessionContext();
}

/** @param {Record<string, unknown>|null|undefined} settings @param {string} clientId */
export async function resumeClinicalSession(settings, clientId) {
  await bootstrapClinicalAccess(settings, clientId);
  unlockClinicalSessionOverlay();
  if (sessionLocker) {
    sessionLocker.stop();
    const nextSessionLocker = new ClientSessionInactivityLocker(
    10,
    'rpc-clinical-session-lock',
    installUpdateIfIdleReady
  );
    setSessionLocker(nextSessionLocker);
    nextSessionLocker.start(clinicalSessionContext);
  }
}
