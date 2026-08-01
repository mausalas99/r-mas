/**
 * Mobile web boot: pairing, LAN sync banner, join-link prefill.
 */
import { storage } from './storage.js';
import { parseLanJoinQuery } from './lan-join-link.mjs';
import { clearWebSessionClinicalMemory } from './app-state.mjs';
import { tryMountClinicalTeamInviteBrowserGate } from './clinical-team-invite.mjs';
import { prefillRegistrationFromUrlParams } from './features/clinical-registration.mjs';
import { isMobileWeb, syncMobileBarebonesChrome } from './mobile-web.mjs';
import {
  configureLanFromMobileJoin,
  closeConnectionDropdown,
} from './features/lan-sync.mjs';
import { shellSyncTeamSyncHeaderButton } from './app-shell-lazy-panels.mjs';

function importLazyRoutes() {
  return import('./lazy-feature-routes.mjs');
}

export function setMobileBootBanner(visible, text) {
  if (!isMobileWeb()) return;
  var el = document.getElementById('rpc-mobile-boot-banner');
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.toggle('is-visible', !!visible);
}

async function loadMobileBootModules() {
  const mods = await Promise.all([
    import('./session-clinical-wipe.mjs'),
    import('./mobile-lan-query-persist.mjs'),
    import('./mobile-lan-boot.mjs'),
    import('./mobile-sharer-sync.mjs'),
    importLazyRoutes(),
  ]);
  return {
    wipeSessionClinicalStorage: mods[0].wipeSessionClinicalStorage,
    persistMobilePairingFromSearch: mods[1].persistMobilePairingFromSearch,
    restoreMobilePairingFromStorage: mods[1].restoreMobilePairingFromStorage,
    resolveStoredMobileRoomId: mods[1].resolveStoredMobileRoomId,
    scheduleMobileLanWork: mods[2].scheduleMobileLanWork,
    applyMobileSharerContextFromUrl: mods[3].applyMobileSharerContextFromUrl,
    hydrateMobileSharerSessionFromSettings: mods[3].hydrateMobileSharerSessionFromSettings,
    ensureSettingsHelpLoaded: mods[4].ensureSettingsHelpLoaded,
  };
}

function wireMobileLanSettledListener() {
  if (window._rpcMobileLanSettledWired) return;
  window._rpcMobileLanSettledWired = true;
  document.addEventListener('rpc-mobile-lan-sync-settled', function () {
    setMobileBootBanner(false);
    void (async function () {
      try {
        const access = await import('./clinical-access-runtime.mjs');
        if (typeof access.finalizeMobileLanPatientCensus === 'function') {
          await access.finalizeMobileLanPatientCensus();
        }
      } catch (_ePrune) {
        void _ePrune;
      }
    })();
  });
}

function scheduleMobileLanJoin(mobile, parsed, roomId) {
  mobile.scheduleMobileLanWork(function () {
    setMobileBootBanner(true, 'Sincronizando con el anfitrión…');
    if (!parsed.teamCode) {
      var savedCfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() : null;
      if (savedCfg && savedCfg.teamCode && savedCfg.hostUrl) {
        configureLanFromMobileJoin(savedCfg.hostUrl, savedCfg.teamCode, roomId);
      } else {
        setMobileBootBanner(false);
      }
      return;
    }
    var hostUrl = String(parsed.hostUrl || location.origin || '')
      .trim()
      .replace(/\/+$/, '');
    if (!hostUrl) {
      setMobileBootBanner(false);
      return;
    }
    configureLanFromMobileJoin(hostUrl, parsed.teamCode, roomId);
  });
}

async function applyMobileBootSettings(mobile) {
  try {
    var settingsMod = await mobile.ensureSettingsHelpLoaded();
    var v = await settingsMod.resolveAppVersionForTour();
    window.__RPC_APP_VERSION__ = settingsMod.normalizeTourVersionLabel(v);
    settingsMod.markGuidedTourVersionDone();
  } catch (_bootVer) {
    void _bootVer;
  }
}

export async function initMobileWebBoot() {
  tryMountClinicalTeamInviteBrowserGate();
  if (!isMobileWeb()) return;
  const mobile = await loadMobileBootModules();
  try {
    mobile.wipeSessionClinicalStorage({ includeLanSession: false });
    clearWebSessionClinicalMemory();
  } catch (_wipeBoot) {
    void _wipeBoot;
  }
  setMobileBootBanner(true, 'Cargando R+ Móvil…');
  mobile.persistMobilePairingFromSearch(location.search, location.origin);
  mobile.restoreMobilePairingFromStorage();
  prefillRegistrationFromUrlParams();
  mobile.applyMobileSharerContextFromUrl();
  mobile.hydrateMobileSharerSessionFromSettings();
  closeConnectionDropdown();
  syncMobileBarebonesChrome();
  try {
    document.title = 'R+ Móvil';
  } catch (_e) {
    void _e;
  }
  shellSyncTeamSyncHeaderButton();
  await applyMobileBootSettings(mobile);
  var intro = document.getElementById('onboarding-intro-backdrop');
  if (intro) {
    intro.classList.remove('open');
    intro.setAttribute('aria-hidden', 'true');
  }
  var parsed = parseLanJoinQuery(location.search, location.origin);
  var storedRoomId = mobile.resolveStoredMobileRoomId();
  var roomId = String(parsed.roomId || storedRoomId || '').trim();
  wireMobileLanSettledListener();
  setMobileBootBanner(false);
  scheduleMobileLanJoin(mobile, parsed, roomId);
}
