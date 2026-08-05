import {
  shellSyncTeamSyncHeaderButton
} from "/mobile/js/chunks/chunk-IFWA7UBL.js";
import {
  prefillRegistrationFromUrlParams
} from "/mobile/js/chunks/chunk-SCSVSR4P.js";
import {
  closeConnectionDropdown,
  configureLanFromMobileJoin,
  isCloudMobileClient,
  tryMountClinicalTeamInviteBrowserGate
} from "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import "/mobile/js/chunks/chunk-YREK4H2V.js";
import "/mobile/js/chunks/chunk-HVHVRFSH.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-K7TUQM3L.js";
import "/mobile/js/chunks/chunk-NW6K73WP.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-F55OGCCZ.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-C6TP3H7V.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-OJF7SMWI.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-GJUAH75C.js";
import {
  isMobileWeb,
  syncMobileBarebonesChrome
} from "/mobile/js/chunks/chunk-WOP35WT6.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-ALW2M5BA.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-MBEH6ZUQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import {
  clearWebSessionClinicalMemory
} from "/mobile/js/chunks/chunk-JZ2SPQIK.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-IAZG4W3U.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  storage
} from "/mobile/js/chunks/chunk-76D6GOCM.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-XO7Z5S3R.js";
import {
  parseLanJoinQuery
} from "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-6VYBWSQE.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-OEEP3MSI.js";
import "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/app-shell-mobile-boot.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-D4435ZDH.js");
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
    import("/mobile/js/chunks/session-clinical-wipe-QZWGJBTK.js"),
    import("/mobile/js/chunks/mobile-lan-query-persist-FG72O3Q4.js"),
    import("/mobile/js/chunks/mobile-lan-boot-XWCCZN2N.js"),
    import("/mobile/js/chunks/mobile-sharer-sync-Y6R57MGH.js"),
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
        const access = await import("/mobile/js/chunks/clinical-access-runtime-D353YS2C.js");
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
    const { initCloudMobileBoot } = await import("/mobile/js/chunks/boot-X7B2NK7T.js");
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
//# sourceMappingURL=/js/chunks/app-shell-mobile-boot-GFTFZ5UM.js.map
