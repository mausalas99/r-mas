import { isCloudMobileClient } from './origin.mjs';
import { isMobileWeb, syncMobileBarebonesChrome } from '../../mobile-web.mjs';
import {
  wipeSessionClinicalStorage,
  installSessionClinicalWipeOnExit,
} from '../../session-clinical-wipe.mjs';
import { clearWebSessionClinicalMemory } from '../../app-state.mjs';
import { setCloudSyncUrl } from '../cloud-sync/settings.mjs';
import {
  mountCloudMobileLoginShell,
  rewriteCloudMobileBookmarkUrl,
  showCloudMobileConnecting,
  dismissCloudMobileGate,
} from './login-ui.mjs';
import { startCloudMobileRuntime } from './runtime.mjs';
import { hydrateCloudMobileIdentity } from './hydrate-identity.mjs';
import { resolveCloudMobileActiveRoom, notifyIfCloudMobileCensusEmpty, showCloudMobileEmptyCensusBanner } from './resolve-active-room.mjs';
import { showToast } from '../../ui-toast.mjs';
import {
  applyCloudMobileInviteSearch,
  clearCloudMobileJoinHints,
  getCloudSyncToken,
  getCloudSyncRoomSnapshot,
  readCloudMobileJoinUser,
  restoreCloudMobilePairingFromStorage,
  setCloudSyncRevision,
} from './session.mjs';

let _cloudMobileBootStarted = false;

export function isCloudMobileBoot() {
  return isCloudMobileClient() && isMobileWeb();
}

/** Hide LAN / local-server alerts — Nube mobile never uses :3738. */
export function suppressCloudMobileLocalServerAlerts() {
  try {
    document.documentElement.dataset.cloudMobile = '1';
    document.documentElement.classList.add('rpc-cloud-mobile');
  } catch {
    /* ignore */
  }
  try {
    const offline = document.getElementById('rpc-offline-banner');
    if (offline) {
      offline.classList.remove('visible');
      offline.hidden = true;
      offline.setAttribute('aria-hidden', 'true');
    }
    const lan = document.getElementById('lan-connection-banner');
    if (lan) {
      lan.hidden = true;
      lan.setAttribute('aria-hidden', 'true');
    }
  } catch {
    /* ignore */
  }
}

export async function initCloudMobileBoot() {
  if (_cloudMobileBootStarted) return;
  if (!isCloudMobileBoot()) return;
  _cloudMobileBootStarted = true;

  if (typeof location !== 'undefined' && location.origin) {
    setCloudSyncUrl(location.origin);
  }

  suppressCloudMobileLocalServerAlerts();
  try {
    document.getElementById('connection-dropdown-backdrop')?.classList.remove('open');
    document.getElementById('connection-dropdown')?.classList.remove('open');
    document.body.classList.remove('connection-dropdown-open');
  } catch {
    /* ignore */
  }
  applyCloudMobileInviteSearch(typeof location !== 'undefined' ? location.search : '');
  restoreCloudMobilePairingFromStorage();

  installSessionClinicalWipeOnExit();
  wipeSessionClinicalStorage({ includeLanSession: false });
  clearWebSessionClinicalMemory();
  setCloudSyncRevision(0);
  syncMobileBarebonesChrome();

  try {
    document.title = 'R+ Móvil';
  } catch {
    /* ignore */
  }

  const gate = document.getElementById('rpc-cloud-mobile-gate') || document.createElement('div');
  gate.id = 'rpc-cloud-mobile-gate';
  gate.className = 'rpc-cloud-mobile-gate ui-overlay-scrim';
  gate.setAttribute('aria-live', 'polite');
  if (!gate.parentElement) document.body.appendChild(gate);

  const toast = (msg, kind) => {
    try {
      showToast(msg, kind);
    } catch {
      /* ignore */
    }
  };

  /** @param {HTMLElement} gateEl */
  async function onConnected(gateEl) {
    dismissCloudMobileGate(gateEl);
    rewriteCloudMobileBookmarkUrl(readCloudMobileJoinUser());
    clearCloudMobileJoinHints();
    try {
      await hydrateCloudMobileIdentity();
    } catch {
      /* pull still runs; clinicalOps may resolve user later */
    }
    setCloudSyncRevision(0);
    const runtime = startCloudMobileRuntime({
      onStatus(_status, _detail) {
        /* optional status chip */
      },
      toast,
    });
    try {
      await runtime?.syncCycle?.();
      // Teams/assignments may live only on the sala clinicalOps doc — pull after census
      // so the team mirror can show assigned charts (census push no longer stamps clinicalOps).
      try {
        const sala = String(getCloudSyncRoomSnapshot()?.sala || '').trim();
        if (sala) {
          const { pullClinicalOpsForSala } = await import('../cloud-sync/cloud-clinical-ops-sala.mjs');
          // since:0 — cached sala revision is already at head after ensureTurn, so
          // incremental pull returns ops:[] with no state.clinicalOps.
          await pullClinicalOpsForSala(sala, { since: 0 });
        }
      } catch {
        /* clinicalOps directory optional */
      }
      try {
        const access = await import('../../clinical-access-runtime.mjs');
        if (typeof access.finalizeMobileLanPatientCensus === 'function') {
          await access.finalizeMobileLanPatientCensus();
        }
      } catch {
        /* scope finalize optional */
      }
      await notifyIfCloudMobileCensusEmpty(toast);
      showCloudMobileEmptyCensusBanner();
      try {
        const patientsMod = await import('../patients.mjs');
        patientsMod.renderPatientList();
      } catch {
        /* optional */
      }
    } catch {
      toast('No se pudo sincronizar con la nube. Revisa la red e intenta de nuevo.', 'error');
    }
    document.dispatchEvent(new CustomEvent('rpc-cloud-mobile-ready'));
  }

  if (getCloudSyncToken()) {
    showCloudMobileConnecting(gate);
    const room = await resolveCloudMobileActiveRoom();
    if (room?.id) {
      await onConnected(gate);
      return;
    }
  }

  mountCloudMobileLoginShell(gate, {
    onConnected: () => {
      void onConnected(gate);
    },
  });
}
