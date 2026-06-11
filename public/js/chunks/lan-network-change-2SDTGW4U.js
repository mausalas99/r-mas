import {
  resetShiftPinBackoff
} from "/js/chunks/chunk-GVZDRB4Z.js";
import {
  isLanElectronDesktop,
  isLanRemoteJoinMode,
  lanClient
} from "/js/chunks/chunk-ZNC2V5DJ.js";
import {
  clearPinnedHostUrl,
  getPinnedHostUrl,
  isPinnedHostLocal
} from "/js/chunks/chunk-GMVJRWWR.js";
import "/js/chunks/chunk-IGD7UR6Y.js";
import "/js/chunks/chunk-BCNABZWJ.js";
import {
  lanNetworkProfile,
  resumeAutoHostDetect
} from "/js/chunks/chunk-GPPD4VPS.js";
import {
  recordWardHostUrl,
  syncWardHostUrlToMainFile
} from "/js/chunks/chunk-AOR2DWAW.js";
import {
  isHostOnCurrentSubnets,
  normalizeLanHostBase,
  pingLanHostUrl
} from "/js/chunks/chunk-EXMEBP6A.js";
import "/js/chunks/chunk-TNTHAQJD.js";
import "/js/chunks/chunk-65OUADXU.js";
import {
  storage
} from "/js/chunks/chunk-BEXIRDT4.js";
import "/js/chunks/chunk-LTWF3GAB.js";
import "/js/chunks/chunk-IYRQG3WP.js";
import "/js/chunks/chunk-CRJYUJ23.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-7JSEAPOX.js";
import "/js/chunks/chunk-FWKRNT2R.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/js/chunks/chunk-K2BMYY6G.js";
import {
  findByFingerprint,
  getPinnedFingerprint
} from "/js/chunks/chunk-VQ3KZLKM.js";

// public/js/lan-network-roam.mjs
function applyLanNetworkRoaming(payload = {}) {
  const prefixes = Array.isArray(payload.prefixes) ? payload.prefixes : [];
  const candidateBaseUrl = normalizeLanHostBase(payload.candidateBaseUrl || "");
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  const teamCode = String(cfg.teamCode || "").trim();
  const uiRole = typeof storage.getLanUiRole === "function" ? storage.getLanUiRole() : "client";
  const pinned = getPinnedHostUrl();
  if (pinned && !isHostOnCurrentSubnets(pinned, prefixes) && !isPinnedHostLocal(candidateBaseUrl)) {
    clearPinnedHostUrl();
  }
  if (uiRole === "host" && candidateBaseUrl && teamCode) {
    const current = normalizeLanHostBase(cfg.hostUrl || "");
    if (current !== candidateBaseUrl) {
      storage.saveLanConfig({ hostUrl: candidateBaseUrl, teamCode });
      lanClient.configure({ hostUrl: candidateBaseUrl, teamCode });
      try {
        lanClient.disconnect();
        lanClient.connectSyncChannel();
      } catch (_e) {
      }
    }
    return { role: "host", candidateBaseUrl };
  }
  const savedHost = normalizeLanHostBase(cfg.hostUrl || "");
  if (savedHost && prefixes.length && !isHostOnCurrentSubnets(savedHost, prefixes)) {
    storage.saveLanConfig(teamCode ? { hostUrl: "", teamCode } : null);
    try {
      lanClient.disconnect();
    } catch (_e2) {
    }
    return { role: "client", clearedStaleHost: true };
  }
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
  const room = await import("/js/chunks/room-VZEO4FJC.js");
  if (typeof room.resumeAutoHostDetectAndReconnect === "function") {
    room.resumeAutoHostDetectAndReconnect();
  }
  const panel = await import("/js/chunks/panel-Z2JD3UPQ.js");
  if (typeof panel.stopLanAutoDiscovery === "function") panel.stopLanAutoDiscovery();
  if (typeof panel.startLanAutoDiscovery === "function") panel.startLanAutoDiscovery();
  const transport = await import("/js/chunks/transport-HGSSKVV5.js");
  if (typeof transport.initLanHostPlugAndPlay === "function") {
    await transport.initLanHostPlugAndPlay();
  }
  if (isLanRemoteJoinMode()) {
    const pin = await import("/js/chunks/lan-shift-pin-connect-Y5K2A6S2.js");
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
    const transport = await import("/js/chunks/transport-HGSSKVV5.js");
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
//# sourceMappingURL=/js/chunks/lan-network-change-2SDTGW4U.js.map
