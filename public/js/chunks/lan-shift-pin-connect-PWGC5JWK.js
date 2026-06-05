import {
  discoverLanHostsOnSubnetViaBeacon,
  isLanElectronDesktop,
  joinRemoteLanHostAsClient,
  liveSyncRoomLabel,
  normalizeLanHostBase,
  resolveLanShareBaseUrl,
  resolveLiveSyncRoomIdFromSala
} from "/js/chunks/chunk-P2TATS3Q.js";
import "/js/chunks/chunk-EVUS5NDR.js";
import {
  storage
} from "/js/chunks/chunk-GA7RYJH6.js";
import "/js/chunks/chunk-K6QXHWFW.js";
import "/js/chunks/chunk-2VGC7OB3.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-OPJSETWU.js";

// public/js/lan-shift-pin-connect.mjs
var EXCHANGE_TIMEOUT_MS = 8e3;
async function exchangeShiftPinOnHost(hostUrl, shiftPin) {
  const base = normalizeLanHostBase(hostUrl);
  const pin = String(shiftPin || "").trim();
  if (!base || !/^\d{6}$/.test(pin)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EXCHANGE_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/api/lan/v1/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftPin: pin }),
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function persistShiftPinBearer(data) {
  if (!data?.token) return;
  if (window.electronAPI && typeof window.electronAPI.lanGuestWriteBearer === "function") {
    try {
      await window.electronAPI.lanGuestWriteBearer({ token: String(data.token).trim() });
    } catch (_e) {
    }
  }
}
async function connectLanWithShiftPin(shiftPin, opts = {}) {
  if (!isLanElectronDesktop()) return false;
  const pin = String(shiftPin || "").trim();
  if (!/^\d{6}$/.test(pin)) return false;
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  if (String(cfg.hostUrl || "").trim() && String(cfg.teamCode || "").trim().length >= 32) {
    return true;
  }
  let ownUrl = "";
  if (window.electronAPI?.getLanCandidateBaseUrl) {
    try {
      ownUrl = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
    } catch (_e) {
    }
  }
  if (!ownUrl) {
    ownUrl = normalizeLanHostBase(await resolveLanShareBaseUrl());
  }
  const hosts = await discoverLanHostsOnSubnetViaBeacon(ownUrl);
  if (!hosts.length) return false;
  for (const hostUrl of hosts) {
    const data = await exchangeShiftPinOnHost(hostUrl, pin);
    if (!data?.token) continue;
    await persistShiftPinBearer(data);
    const joined = await joinRemoteLanHostAsClient(
      String(data.hostUrl || hostUrl),
      data.token,
      { requireConfirm: false, toastLabel: "" }
    );
    if (!joined) continue;
    const roomId = String(opts.roomId || "").trim() || resolveLiveSyncRoomIdFromSala(opts.sala) || "";
    if (roomId) {
      try {
        const room = await import("/js/chunks/room-W5BB6CPO.js");
        if (typeof room.joinLanRoom === "function") {
          await room.joinLanRoom(roomId, liveSyncRoomLabel(roomId));
        }
      } catch (_eRoom) {
      }
    }
    return true;
  }
  return false;
}
export {
  connectLanWithShiftPin
};
//# sourceMappingURL=/js/chunks/lan-shift-pin-connect-PWGC5JWK.js.map
