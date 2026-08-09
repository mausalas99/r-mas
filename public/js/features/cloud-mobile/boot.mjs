import { isCloudMobileClient } from './origin.mjs';
import { syncMobileBarebonesChrome } from '../../mobile-web.mjs';
import {
  wipeSessionClinicalStorage,
  installSessionClinicalWipeOnExit,
} from '../../session-clinical-wipe.mjs';
import { clearWebSessionClinicalMemory } from '../../app-state.mjs';
import { setCloudSyncUrl } from '../cloud-sync/settings.mjs';
import {
  mountCloudMobileLoginShell,
  rewriteCloudMobileBookmarkUrl,
  dismissCloudMobileGate,
} from './login-ui.mjs';
import { startCloudMobileRuntime } from './runtime.mjs';
import { hydrateCloudMobileIdentity } from './hydrate-identity.mjs';
import { resolveCloudMobileActiveRoom, notifyIfCloudMobileCensusEmpty, showCloudMobileEmptyCensusBanner } from './resolve-active-room.mjs';
import { showToast } from '../../ui-toast.mjs';
import {
  CLOUD_MOBILE_ROOM_RESOLVE_TIMEOUT_MS,
  withCloudMobileBootTimeout,
} from './boot-timeout.mjs';
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

function closeConnectionDropdown() {
  try {
    document.getElementById('connection-dropdown-backdrop')?.classList.remove('open');
    document.getElementById('connection-dropdown')?.classList.remove('open');
    document.body.classList.remove('connection-dropdown-open');
  } catch {
    /* ignore */
  }
}

function ensureCloudMobileGate() {
  const gate = document.getElementById('rpc-cloud-mobile-gate') || document.createElement('div');
  gate.id = 'rpc-cloud-mobile-gate';
  gate.className = 'rpc-cloud-mobile-gate ui-overlay-scrim';
  gate.setAttribute('aria-live', 'polite');
  if (!gate.parentElement) document.body.appendChild(gate);
  return gate;
}

function createCloudMobileToast() {
  return (msg, kind) => {
    try {
      showToast(msg, kind);
    } catch {
      /* ignore */
    }
  };
}

/** @param {HTMLElement} gateEl @param {(msg: string, kind?: string) => void} toast */
async function runCloudMobilePostConnect(gateEl, toast) {
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
    try {
      const sala = String(getCloudSyncRoomSnapshot()?.sala || '').trim();
      if (sala) {
        const { pullClinicalOpsForSala } = await import('../cloud-sync/cloud-clinical-ops-sala.mjs');
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
      const { refreshMobileLabReferencePanel } = await import('../../mobile-web.mjs');
      refreshMobileLabReferencePanel();
    } catch {
      /* optional */
    }
  } catch {
    toast('No se pudo sincronizar con la nube. Revisa la red e intenta de nuevo.', 'error');
  }
  document.dispatchEvent(new CustomEvent('rpc-cloud-mobile-ready'));
}

export function isCloudMobileBoot() {
  return isCloudMobileClient();
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
  closeConnectionDropdown();
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

  const gate = ensureCloudMobileGate();
  const toast = createCloudMobileToast();
  const onConnected = () => {
    void runCloudMobilePostConnect(gate, toast);
  };

  try {
    // Bundle loaded — release the inline HTML gate; reconnect must not block the UI.
    dismissCloudMobileGate(gate);
    try {
      if (typeof globalThis !== 'undefined') globalThis.__RPC_CLOUD_MOBILE_BUNDLE_BOOTED__ = true;
    } catch {
      /* ignore */
    }

    if (getCloudSyncToken()) {
      let room = null;
      try {
        room = await withCloudMobileBootTimeout(
          resolveCloudMobileActiveRoom(),
          CLOUD_MOBILE_ROOM_RESOLVE_TIMEOUT_MS,
          'room_resolve_timeout'
        );
      } catch {
        toast('No se pudo contactar la nube. Revisa la red e intenta de nuevo.', 'error');
        mountCloudMobileLoginShell(gate, { onConnected });
        return;
      }
      if (room?.id) {
        void runCloudMobilePostConnect(gate, toast);
        return;
      }
    }
    mountCloudMobileLoginShell(gate, { onConnected });
  } catch (err) {
    console.error('[R+ Móvil] boot error:', err);
    dismissCloudMobileGate(gate);
    toast('No se pudo iniciar R+ Móvil. Recarga la página.', 'error');
    mountCloudMobileLoginShell(gate, { onConnected });
  }
}
