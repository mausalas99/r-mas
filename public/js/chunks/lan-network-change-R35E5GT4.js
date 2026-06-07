import {
  isLanElectronDesktop,
  isLanRemoteJoinMode,
  lanClient,
  lanNetworkProfile,
  resumeAutoHostDetect
} from "/js/chunks/chunk-Q33X722Y.js";
import "/js/chunks/chunk-KZCXUBUQ.js";
import {
  clearPinnedHostUrl,
  getPinnedHostUrl,
  isHostOnCurrentSubnets,
  isPinnedHostLocal,
  normalizeLanHostBase
} from "/js/chunks/chunk-WD7VCIKP.js";
import "/js/chunks/chunk-TNTHAQJD.js";
import "/js/chunks/chunk-QN7Q4ZRJ.js";
import {
  storage
} from "/js/chunks/chunk-2TZHN5MF.js";
import "/js/chunks/chunk-K6QXHWFW.js";
import "/js/chunks/chunk-MSBFOYVD.js";
import "/js/chunks/chunk-2VRIL4MF.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-QKS27SZP.js";
import "/js/chunks/chunk-FWKRNT2R.js";
import "/js/chunks/chunk-BCNABZWJ.js";

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

// public/js/lan-network-change.mjs
async function restartLanDiscoveryAfterNetworkChange() {
  resumeAutoHostDetect();
  lanNetworkProfile.resetProfile();
  const room = await import("/js/chunks/room-ERKAVEZC.js");
  if (typeof room.resumeAutoHostDetectAndReconnect === "function") {
    room.resumeAutoHostDetectAndReconnect();
  }
  const panel = await import("/js/chunks/panel-PEAWVAWF.js");
  if (typeof panel.stopLanAutoDiscovery === "function") panel.stopLanAutoDiscovery();
  if (typeof panel.startLanAutoDiscovery === "function") panel.startLanAutoDiscovery();
  if (typeof panel.renderLanPanel === "function") panel.renderLanPanel();
  const transport = await import("/js/chunks/transport-S2DB7VYL.js");
  if (typeof transport.initLanHostPlugAndPlay === "function") {
    await transport.initLanHostPlugAndPlay();
  }
  if (isLanRemoteJoinMode()) {
    const pin = await import("/js/chunks/lan-shift-pin-connect-WQAWHVNW.js");
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
  applyLanNetworkRoaming(payload || {});
  await restartLanDiscoveryAfterNetworkChange();
}
export {
  handleLanNetworkChanged
};
//# sourceMappingURL=/js/chunks/lan-network-change-R35E5GT4.js.map
