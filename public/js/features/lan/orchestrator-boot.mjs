/** LAN orchestrator cold-start boot (IM-11). */
import { upsertHost, evictStale } from '../../lan-host-registry.mjs';
import { isClinicalLocalOnlyMode, readRpcSettings } from '../../clinical-settings.mjs';
import {
  isLanElectronDesktop,
  initLanClientFromStorage,
} from './transport.mjs';
import {
  wireClinicalOpsLanSyncEvents,
  wireLanPanelDelegation,
  startLanAutoDiscovery,
} from './panel.mjs';
import { wireLanSyncBridges } from './orchestrator-wire.mjs';
import { getLanRuntime, scheduleTierALanServerWarm } from './orchestrator-runtime.mjs';
import { configureLanSyncDomainModules } from './orchestrator-wire-config.mjs';
import {
  shouldShowNubePanel,
  shouldUseNubeNotLan,
  isCloudSyncActive,
} from '../cloud-sync/lan-override.mjs';
import { wireCloudClinicalOpsSyncEvents } from '../cloud-sync/cloud-ops-events.mjs';
import { getUserSala } from './panel-clinical-context.mjs';

let _lanRuntimeStarted = false;
let _lanRegistryEvictionStarted = false;
let _recordBootMountsForTest = false;
const _bootMountsForTest = [];

/** @internal test-only */
export function _resetLanBootForTest() {
  _lanRuntimeStarted = false;
  _lanRegistryEvictionStarted = false;
  _recordBootMountsForTest = false;
  _bootMountsForTest.length = 0;
}

/** @internal test-only */
export function _enableBootMountRecordingForTest() {
  _recordBootMountsForTest = true;
  _bootMountsForTest.length = 0;
}

/** @internal test-only */
export function _getBootMountsForTest() {
  return _bootMountsForTest.slice();
}

function recordBootMount(name) {
  if (_recordBootMountsForTest) _bootMountsForTest.push(name);
}

function wireLanHostRegistryDiscovery() {
  if (typeof window === 'undefined') return;
  if (window.electronAPI?.onLanMdnsPeers) {
    window.electronAPI.onLanMdnsPeers((peers) => {
      if (!Array.isArray(peers)) return;
      peers.forEach((peer) => {
        if (!peer?.clientId || !peer?.startedAt) return;
        upsertHost({
          fingerprint: `${peer.clientId}:${peer.startedAt}`,
          clientId: peer.clientId,
          startedAt: peer.startedAt,
          currentUrl: peer.url,
          rank: peer.rank || '',
          dbUnlocked: false,
          shiftPinActive: false,
          rttMs: 0,
          lastSeenAt: Date.now(),
          source: 'mdns',
        });
      });
    });
  }
  if (!_lanRegistryEvictionStarted) {
    _lanRegistryEvictionStarted = true;
    setInterval(() => evictStale(90_000), 30_000);
  }
}

function isCloudSalaBootPath() {
  if (isCloudSyncActive()) return true;
  const sala = getUserSala();
  return shouldShowNubePanel(sala) || shouldUseNubeNotLan(sala);
}

export function ensureLanSyncRuntimeStarted() {
  if (typeof document === 'undefined') return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;
  if (_lanRuntimeStarted) return;
  _lanRuntimeStarted = true;

  // Nube salas: clinical-ops + patient apply deps — never mount LAN bridges / discovery / client.
  if (isCloudSalaBootPath()) {
    recordBootMount('cloud-path');
    wireCloudClinicalOpsSyncEvents();
    configureLanSyncDomainModules(getLanRuntime());
    return;
  }

  recordBootMount('wireLanSyncBridges');
  wireLanSyncBridges();
  recordBootMount('wireClinicalOpsLanSyncEvents');
  wireClinicalOpsLanSyncEvents();
  recordBootMount('wireLanPanelDelegation');
  wireLanPanelDelegation();
  recordBootMount('initLanClientFromStorage');
  initLanClientFromStorage();
  recordBootMount('wireLanHostRegistryDiscovery');
  wireLanHostRegistryDiscovery();
  if (isLanElectronDesktop()) {
    recordBootMount('scheduleTierALanServerWarm');
    scheduleTierALanServerWarm();
    recordBootMount('startLanAutoDiscovery');
    startLanAutoDiscovery();
  }
}
