import {
  resetShiftPinBackoff
} from "/mobile/js/chunks/chunk-H7J46SWN.js";
import {
  isLanElectronDesktop,
  isLanRemoteJoinMode
} from "/mobile/js/chunks/chunk-GQ4IO4LN.js";
import "/mobile/js/chunks/chunk-OWLZMO5A.js";
import "/mobile/js/chunks/chunk-N7COVD6D.js";
import {
  clearPinnedHostUrl,
  getPinnedHostUrl,
  isPinnedHostLocal
} from "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-URSGTGGU.js";
import "/mobile/js/chunks/chunk-N73GQSRB.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-4FTQ7XEU.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-34AJGDKI.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-XAKSV4LG.js";
import "/mobile/js/chunks/chunk-CLJUGM4X.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-RQRXI24X.js";
import "/mobile/js/chunks/chunk-64JY3O3H.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-2NLWSG7O.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-DIWJYISZ.js";
import "/mobile/js/chunks/chunk-IBKESWFJ.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import {
  pingLanHostUrl,
  resumeAutoHostDetect
} from "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  storage
} from "/mobile/js/chunks/chunk-JFY46RJV.js";
import {
  findByFingerprint,
  getPinnedFingerprint
} from "/mobile/js/chunks/chunk-TY4AHNM4.js";
import {
  recordWardHostUrl,
  seedBundledWardConnectionPoints,
  syncWardHostUrlToMainFile
} from "/mobile/js/chunks/chunk-YAGCGSLT.js";
import {
  isHostOnCurrentSubnets,
  normalizeLanHostBase
} from "/mobile/js/chunks/chunk-WONKP6NU.js";
import {
  lanClient
} from "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import {
  lanNetworkProfile
} from "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-UW56GTLS.js";
import "/mobile/js/chunks/chunk-PXDCZYH3.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-IRC74J3Z.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-TYH5ME2D.js";
import "/mobile/js/chunks/chunk-TSLGFHIE.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";

// public/js/lan-network-roam-handlers.mjs
function clearStalePinnedHostIfNeeded(pinned, prefixes, candidateBaseUrl) {
  if (pinned && !isHostOnCurrentSubnets(pinned, prefixes) && !isPinnedHostLocal(candidateBaseUrl)) {
    clearPinnedHostUrl();
  }
}
function applyHostRoleNetworkRoaming(candidateBaseUrl, teamCode, cfg) {
  const current = normalizeLanHostBase(cfg.hostUrl || "");
  if (current === candidateBaseUrl) return { role: "host", candidateBaseUrl };
  storage.saveLanConfig({ hostUrl: candidateBaseUrl, teamCode });
  lanClient.configure({ hostUrl: candidateBaseUrl, teamCode });
  try {
    lanClient.disconnect();
    lanClient.connectSyncChannel();
  } catch (_e) {
    void _e;
  }
  return { role: "host", candidateBaseUrl };
}
function clearStaleClientHostIfNeeded(savedHost, prefixes, teamCode) {
  if (!savedHost || !prefixes.length || isHostOnCurrentSubnets(savedHost, prefixes)) {
    return null;
  }
  storage.saveLanConfig(teamCode ? { hostUrl: "", teamCode } : null);
  try {
    lanClient.disconnect();
  } catch (_e) {
    void _e;
  }
  return { role: "client", clearedStaleHost: true };
}

// public/js/lan-network-roam.mjs
function applyLanNetworkRoaming(payload = {}) {
  const prefixes = Array.isArray(payload.prefixes) ? payload.prefixes : [];
  const candidateBaseUrl = normalizeLanHostBase(payload.candidateBaseUrl || "");
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  const teamCode = String(cfg.teamCode || "").trim();
  const uiRole = typeof storage.getLanUiRole === "function" ? storage.getLanUiRole() : "client";
  const pinned = getPinnedHostUrl();
  clearStalePinnedHostIfNeeded(pinned, prefixes, candidateBaseUrl);
  if (uiRole === "host" && candidateBaseUrl && teamCode) {
    return applyHostRoleNetworkRoaming(candidateBaseUrl, teamCode, cfg);
  }
  const savedHost = normalizeLanHostBase(cfg.hostUrl || "");
  const cleared = clearStaleClientHostIfNeeded(savedHost, prefixes, teamCode);
  if (cleared) return cleared;
  return { role: uiRole, clearedStaleHost: false };
}
async function applyLanNetworkRoamingWithFingerprint(payload, opts = {}) {
  const pinnedFp = getPinnedFingerprint();
  if (!pinnedFp) return { shortcut: false };
  const record = findByFingerprint(pinnedFp);
  if (!record) return { shortcut: false };
  const savedHost = normalizeLanHostBase(String(opts.savedHostUrl || ""));
  const registryUrl = normalizeLanHostBase(record.currentUrl);
  if (!registryUrl || registryUrl === savedHost) return { shortcut: false };
  const pingFn = typeof opts.pingFn === "function" ? opts.pingFn : (url) => pingLanHostUrl(url, String(opts.teamCode || ""));
  const ok = await pingFn(registryUrl);
  if (!ok) return { shortcut: false };
  return { shortcut: true, newUrl: registryUrl };
}

// public/js/lan-network-change.mjs
var _networkChangeDebounceTimer = null;
var _networkChangePending = null;
async function restartLanDiscoveryAfterNetworkChange() {
  resumeAutoHostDetect();
  lanNetworkProfile.resetProfile();
  seedBundledWardConnectionPoints();
  const room = await import("/mobile/js/chunks/room-3Y6CTDKF.js");
  if (typeof room.resumeAutoHostDetectAndReconnect === "function") {
    room.resumeAutoHostDetectAndReconnect();
  }
  const panel = await import("/mobile/js/chunks/panel-VVOMO6IX.js");
  if (typeof panel.stopLanAutoDiscovery === "function") panel.stopLanAutoDiscovery();
  if (typeof panel.startLanAutoDiscovery === "function") panel.startLanAutoDiscovery();
  const transport = await import("/mobile/js/chunks/transport-MTWX4U7G.js");
  const pin = await import("/mobile/js/chunks/lan-shift-pin-connect-IC6DCXRK.js");
  if (typeof transport.isLanSessionConfiguredForRest === "function" && !transport.isLanSessionConfiguredForRest() && typeof pin.tryEasyLanShiftPinConnect === "function") {
    const easy = await pin.tryEasyLanShiftPinConnect({
      silent: true,
      force: true,
      skipCooldown: true
    });
    if (easy.ok) return;
  }
  if (typeof transport.initLanHostPlugAndPlay === "function") {
    await transport.initLanHostPlugAndPlay();
  }
  if (isLanRemoteJoinMode()) {
    if (typeof pin.tryEasyLanShiftPinConnect === "function") {
      await pin.tryEasyLanShiftPinConnect({ silent: true, force: true, skipCooldown: true });
    }
  } else {
    if (typeof transport.tryAutoJoinPreferredLanHost === "function") {
      await transport.tryAutoJoinPreferredLanHost({ quiet: true });
    }
    if (typeof transport.ensureLanElectronHostReady === "function") {
      await transport.ensureLanElectronHostReady();
    }
  }
}
async function handleLanNetworkChangedNow(payload) {
  if (!isLanElectronDesktop()) return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;
  resetShiftPinBackoff();
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  const roamResult = await applyLanNetworkRoamingWithFingerprint(payload || {}, {
    savedHostUrl: cfg.hostUrl,
    teamCode: cfg.teamCode
  });
  if (roamResult.shortcut) {
    const transport = await import("/mobile/js/chunks/transport-MTWX4U7G.js");
    if (typeof transport.persistLanClientConfig === "function") {
      transport.persistLanClientConfig(roamResult.newUrl, cfg.teamCode);
    }
    return;
  }
  applyLanNetworkRoaming(payload || {});
  if (!isLanRemoteJoinMode()) {
    const candidate = String(payload?.candidateBaseUrl || "").trim();
    if (candidate) {
      recordWardHostUrl(candidate, { source: "host" });
      syncWardHostUrlToMainFile(candidate, { source: "host" });
    }
  }
  await restartLanDiscoveryAfterNetworkChange();
}
function handleLanNetworkChanged(payload) {
  if (!isLanElectronDesktop()) return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;
  _networkChangePending = payload || {};
  if (_networkChangeDebounceTimer) return;
  _networkChangeDebounceTimer = setTimeout(function() {
    _networkChangeDebounceTimer = null;
    const pending = _networkChangePending;
    _networkChangePending = null;
    void handleLanNetworkChangedNow(pending || {});
  }, 3e3);
}
export {
  handleLanNetworkChanged
};
//# sourceMappingURL=/js/chunks/lan-network-change-FSDIVP5S.js.map
