import {
  resetShiftPinBackoff
} from "/js/chunks/chunk-22KRUX2Y.js";
import {
  isLanElectronDesktop,
  isLanRemoteJoinMode,
  lanClient
} from "/js/chunks/chunk-DXJBHLTD.js";
import "/js/chunks/chunk-AIDSY62P.js";
import {
  clearPinnedHostUrl,
  getPinnedHostUrl,
  isPinnedHostLocal
} from "/js/chunks/chunk-QOWDHS6Z.js";
import "/js/chunks/chunk-BCNABZWJ.js";
import {
  lanNetworkProfile,
  resumeAutoHostDetect
} from "/js/chunks/chunk-QSBWAKTB.js";
import {
  isHostOnCurrentSubnets,
  normalizeLanHostBase,
  pingLanHostUrl
} from "/js/chunks/chunk-FII6Y5F2.js";
import "/js/chunks/chunk-TNTHAQJD.js";
import "/js/chunks/chunk-PVRUBDE5.js";
import {
  storage
} from "/js/chunks/chunk-2TZHN5MF.js";
import "/js/chunks/chunk-K6QXHWFW.js";
import "/js/chunks/chunk-WM442OFV.js";
import "/js/chunks/chunk-CRJYUJ23.js";
import "/js/chunks/chunk-2VRIL4MF.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-QKS27SZP.js";
import "/js/chunks/chunk-FWKRNT2R.js";
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
async function restartLanDiscoveryAfterNetworkChange() {
  resumeAutoHostDetect();
  lanNetworkProfile.resetProfile();
  const room = await import("/js/chunks/room-FTCEWXGZ.js");
  if (typeof room.resumeAutoHostDetectAndReconnect === "function") {
    room.resumeAutoHostDetectAndReconnect();
  }
  const panel = await import("/js/chunks/panel-PSEW4E22.js");
  if (typeof panel.stopLanAutoDiscovery === "function") panel.stopLanAutoDiscovery();
  if (typeof panel.startLanAutoDiscovery === "function") panel.startLanAutoDiscovery();
  if (typeof panel.renderLanPanel === "function") panel.renderLanPanel();
  const transport = await import("/js/chunks/transport-ZXXNUTRU.js");
  if (typeof transport.initLanHostPlugAndPlay === "function") {
    await transport.initLanHostPlugAndPlay();
  }
  if (isLanRemoteJoinMode()) {
    const pin = await import("/js/chunks/lan-shift-pin-connect-ABKWS4UN.js");
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
async function handleLanNetworkChanged(payload) {
  if (!isLanElectronDesktop()) return;
  resetShiftPinBackoff();
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  const roamResult = await applyLanNetworkRoamingWithFingerprint(payload || {}, {
    savedHostUrl: cfg.hostUrl,
    teamCode: cfg.teamCode
  });
  if (roamResult.shortcut) {
    const transport = await import("/js/chunks/transport-ZXXNUTRU.js");
    if (typeof transport.persistLanClientConfig === "function") {
      transport.persistLanClientConfig(roamResult.newUrl, cfg.teamCode);
    }
    return;
  }
  applyLanNetworkRoaming(payload || {});
  await restartLanDiscoveryAfterNetworkChange();
}
export {
  handleLanNetworkChanged
};
//# sourceMappingURL=/js/chunks/lan-network-change-RXCKRPKJ.js.map
