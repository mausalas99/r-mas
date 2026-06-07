/**
 * React to Electron main-process LAN network changes (Wi‑Fi / VLAN roam).
 */
import { lanNetworkProfile } from './lan-network-profile.mjs';
import { resumeAutoHostDetect } from './lan-host-detect-guard.mjs';
import { resetShiftPinBackoff } from './lan-shift-pin-connect.mjs';
import { storage } from './storage.js';
import { applyLanNetworkRoaming, applyLanNetworkRoamingWithFingerprint } from './lan-network-roam.mjs';
import { isLanElectronDesktop, isLanRemoteJoinMode } from './features/lan/transport.mjs';

async function restartLanDiscoveryAfterNetworkChange() {
  resumeAutoHostDetect();
  lanNetworkProfile.resetProfile();

  const room = await import('./features/lan/room.mjs');
  if (typeof room.resumeAutoHostDetectAndReconnect === 'function') {
    room.resumeAutoHostDetectAndReconnect();
  }

  const panel = await import('./features/lan/panel.mjs');
  if (typeof panel.stopLanAutoDiscovery === 'function') panel.stopLanAutoDiscovery();
  if (typeof panel.startLanAutoDiscovery === 'function') panel.startLanAutoDiscovery();
  if (typeof panel.renderLanPanel === 'function') panel.renderLanPanel();

  const transport = await import('./features/lan/transport.mjs');
  if (typeof transport.initLanHostPlugAndPlay === 'function') {
    await transport.initLanHostPlugAndPlay();
  }
  if (isLanRemoteJoinMode()) {
    const pin = await import('./lan-shift-pin-connect.mjs');
    if (typeof pin.tryEasyLanShiftPinConnect === 'function') {
      await pin.tryEasyLanShiftPinConnect({ silent: true, force: true, skipCooldown: true });
    }
  } else {
    if (typeof transport.tryAutoJoinPreferredLanHost === 'function') {
      await transport.tryAutoJoinPreferredLanHost({ quiet: true });
    }
    if (typeof transport.ensureLanElectronHostReady === 'function') {
      await transport.ensureLanElectronHostReady();
    }
  }
}

/** @param {{ prefixes?: string[], candidateBaseUrl?: string }} payload */
export async function handleLanNetworkChanged(payload) {
  if (!isLanElectronDesktop()) return;
  resetShiftPinBackoff();

  const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  const roamResult = await applyLanNetworkRoamingWithFingerprint(payload || {}, {
    savedHostUrl: cfg.hostUrl,
    teamCode: cfg.teamCode,
  });

  if (roamResult.shortcut) {
    const transport = await import('./features/lan/transport.mjs');
    if (typeof transport.persistLanClientConfig === 'function') {
      transport.persistLanClientConfig(roamResult.newUrl, cfg.teamCode);
    }
    return;
  }

  applyLanNetworkRoaming(payload || {});
  await restartLanDiscoveryAfterNetworkChange();
}
