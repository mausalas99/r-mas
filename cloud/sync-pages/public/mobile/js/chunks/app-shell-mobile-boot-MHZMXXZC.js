import {
  shellSyncTeamSyncHeaderButton
} from "/mobile/js/chunks/chunk-D657HEDI.js";
import {
  prefillRegistrationFromUrlParams
} from "/mobile/js/chunks/chunk-BUYTZU7E.js";
import {
  closeConnectionDropdown,
  configureLanFromMobileJoin,
  isCloudMobileClient,
  tryMountClinicalTeamInviteBrowserGate
} from "/mobile/js/chunks/chunk-V7RKRU36.js";
import "/mobile/js/chunks/chunk-I7TKUVLA.js";
import "/mobile/js/chunks/chunk-OZWIHN57.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-RI6AP5AE.js";
import "/mobile/js/chunks/chunk-WWZFTPFJ.js";
import "/mobile/js/chunks/chunk-L2AHBXEQ.js";
import "/mobile/js/chunks/chunk-YAV7LD7W.js";
import "/mobile/js/chunks/chunk-FQRMD6ZB.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-MI3IWYVD.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-DVAK5LQO.js";
import {
  clearWebSessionClinicalMemory
} from "/mobile/js/chunks/chunk-NFDNC4E2.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-DYX4ICUP.js";
import {
  isMobileWeb,
  syncMobileBarebonesChrome
} from "/mobile/js/chunks/chunk-IVC2VWFL.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-7V3KAWVG.js";
import "/mobile/js/chunks/chunk-VQEQYC4S.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-5X65DZ36.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-SI7XDBY4.js";
import {
  storage
} from "/mobile/js/chunks/chunk-MWVG4DXC.js";
import "/mobile/js/chunks/chunk-I4NFL7CB.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-CR432C3M.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-JSBTNZIE.js";
import "/mobile/js/chunks/chunk-IIOGZLID.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-R6TRWWWV.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-73TLMPZ4.js";
import {
  parseLanJoinQuery
} from "/mobile/js/chunks/chunk-W6RRSTLS.js";
import "/mobile/js/chunks/chunk-6WZSBH4P.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import "/mobile/js/chunks/chunk-AETSFPDT.js";
import "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-GZVXFENQ.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/app-shell-mobile-boot.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-ZCXKOWSO.js");
}
function setMobileBootBanner(visible, text) {
  if (!isMobileWeb()) return;
  var el = document.getElementById("rpc-mobile-boot-banner");
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.toggle("is-visible", !!visible);
}
async function loadMobileBootModules() {
  const mods = await Promise.all([
    import("/mobile/js/chunks/session-clinical-wipe-HI7TVIUR.js"),
    import("/mobile/js/chunks/mobile-lan-query-persist-4YFCYN3O.js"),
    import("/mobile/js/chunks/mobile-lan-boot-6OQT3QEN.js"),
    import("/mobile/js/chunks/mobile-sharer-sync-FPOLTCUE.js"),
    importLazyRoutes()
  ]);
  return {
    wipeSessionClinicalStorage: mods[0].wipeSessionClinicalStorage,
    persistMobilePairingFromSearch: mods[1].persistMobilePairingFromSearch,
    restoreMobilePairingFromStorage: mods[1].restoreMobilePairingFromStorage,
    resolveStoredMobileRoomId: mods[1].resolveStoredMobileRoomId,
    scheduleMobileLanWork: mods[2].scheduleMobileLanWork,
    applyMobileSharerContextFromUrl: mods[3].applyMobileSharerContextFromUrl,
    hydrateMobileSharerSessionFromSettings: mods[3].hydrateMobileSharerSessionFromSettings,
    ensureSettingsHelpLoaded: mods[4].ensureSettingsHelpLoaded
  };
}
function wireMobileLanSettledListener() {
  if (window._rpcMobileLanSettledWired) return;
  window._rpcMobileLanSettledWired = true;
  document.addEventListener("rpc-mobile-lan-sync-settled", function() {
    setMobileBootBanner(false);
    void (async function() {
      try {
        const access = await import("/mobile/js/chunks/clinical-access-runtime-AE6KBGJD.js");
        if (typeof access.finalizeMobileLanPatientCensus === "function") {
          await access.finalizeMobileLanPatientCensus();
        }
      } catch (_ePrune) {
        void _ePrune;
      }
    })();
  });
}
function scheduleMobileLanJoin(mobile, parsed, roomId) {
  mobile.scheduleMobileLanWork(function() {
    setMobileBootBanner(true, "Sincronizando con el anfitri\xF3n\u2026");
    if (!parsed.teamCode) {
      var savedCfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() : null;
      if (savedCfg && savedCfg.teamCode && savedCfg.hostUrl) {
        configureLanFromMobileJoin(savedCfg.hostUrl, savedCfg.teamCode, roomId);
      } else {
        setMobileBootBanner(false);
      }
      return;
    }
    var hostUrl = String(parsed.hostUrl || location.origin || "").trim().replace(/\/+$/, "");
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
async function initMobileWebBoot() {
  if (isCloudMobileClient()) {
    const { initCloudMobileBoot } = await import("/mobile/js/chunks/boot-AMIS6KN4.js");
    await initCloudMobileBoot();
    return;
  }
  tryMountClinicalTeamInviteBrowserGate();
  if (!isMobileWeb()) return;
  const mobile = await loadMobileBootModules();
  try {
    mobile.wipeSessionClinicalStorage({ includeLanSession: false });
    clearWebSessionClinicalMemory();
  } catch (_wipeBoot) {
    void _wipeBoot;
  }
  setMobileBootBanner(true, "Cargando R+ M\xF3vil\u2026");
  mobile.persistMobilePairingFromSearch(location.search, location.origin);
  mobile.restoreMobilePairingFromStorage();
  prefillRegistrationFromUrlParams();
  mobile.applyMobileSharerContextFromUrl();
  mobile.hydrateMobileSharerSessionFromSettings();
  closeConnectionDropdown();
  syncMobileBarebonesChrome();
  try {
    document.title = "R+ M\xF3vil";
  } catch (_e) {
    void _e;
  }
  shellSyncTeamSyncHeaderButton();
  await applyMobileBootSettings(mobile);
  var intro = document.getElementById("onboarding-intro-backdrop");
  if (intro) {
    intro.classList.remove("open");
    intro.setAttribute("aria-hidden", "true");
  }
  var parsed = parseLanJoinQuery(location.search, location.origin);
  var storedRoomId = mobile.resolveStoredMobileRoomId();
  var roomId = String(parsed.roomId || storedRoomId || "").trim();
  wireMobileLanSettledListener();
  setMobileBootBanner(false);
  scheduleMobileLanJoin(mobile, parsed, roomId);
}
export {
  initMobileWebBoot,
  setMobileBootBanner
};
//# sourceMappingURL=/js/chunks/app-shell-mobile-boot-MHZMXXZC.js.map
