import {
  canAttemptAutoHostDetect,
  isLanElectronDesktop,
  joinRemoteLanHostAsClient,
  liveSyncRoomLabel,
  recordAutoHostDetectMiss,
  recordAutoHostDetectSuccess,
  resolveLanShareBaseUrl,
  resolveLiveSyncRoomIdFromSala,
  resumeAutoHostDetect
} from "/js/chunks/chunk-5PLYAE4D.js";
import "/js/chunks/chunk-GB75I3YC.js";
import {
  discoverLanHostsOnAllLocalSubnetsViaBeacon,
  normalizeLanHostBase,
  pingLanHostUrl
} from "/js/chunks/chunk-GDIYO6HE.js";
import "/js/chunks/chunk-TNTHAQJD.js";
import "/js/chunks/chunk-P6ZNDBV7.js";
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

// public/js/lan-shift-pin-connect.mjs
var EXCHANGE_TIMEOUT_MS = 8e3;
var EASY_RETRY_COOLDOWN_MS = 12e3;
var _lastEasyConnectAttemptMs = 0;
function showEasyToast(message, kind) {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(message, kind);
  }
}
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
async function resolveOwnLanBaseUrl() {
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
  return ownUrl;
}
async function isCurrentLanHostReachable() {
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  const url = normalizeLanHostBase(cfg.hostUrl);
  const code = String(cfg.teamCode || "").trim();
  if (!url || code.length < 32) return false;
  return pingLanHostUrl(url, code);
}
async function joinHostAfterShiftPinExchange(hostUrl, shiftPin, opts) {
  const data = await exchangeShiftPinOnHost(hostUrl, shiftPin);
  if (!data?.token) return false;
  await persistShiftPinBearer(data);
  const joined = await joinRemoteLanHostAsClient(
    String(data.hostUrl || hostUrl),
    data.token,
    { requireConfirm: false, toastLabel: "" }
  );
  if (!joined) return false;
  const roomId = String(opts.roomId || "").trim() || resolveLiveSyncRoomIdFromSala(opts.sala) || "";
  if (roomId) {
    try {
      const room = await import("/js/chunks/room-HIMXR4OE.js");
      if (typeof room.joinLanRoom === "function") {
        await room.joinLanRoom(roomId, liveSyncRoomLabel(roomId));
      }
    } catch (_eRoom) {
    }
  }
  return true;
}
async function connectLanWithShiftPin(shiftPin, opts = {}) {
  if (!isLanElectronDesktop()) return false;
  const pin = String(shiftPin || "").trim();
  if (!/^\d{6}$/.test(pin)) return false;
  if (typeof storage.saveLanShiftPin === "function") storage.saveLanShiftPin(pin);
  if (!opts.forceRediscover && await isCurrentLanHostReachable()) {
    return true;
  }
  const cfg = typeof storage.getLanConfig === "function" ? storage.getLanConfig() || {} : {};
  const staleHost = normalizeLanHostBase(cfg.hostUrl);
  if (staleHost) {
    const quick = await joinHostAfterShiftPinExchange(staleHost, pin, opts);
    if (quick) return true;
  }
  const loopbackHost = normalizeLanHostBase("http://127.0.0.1:3738");
  if (loopbackHost && loopbackHost !== staleHost) {
    const viaLoopback = await joinHostAfterShiftPinExchange(loopbackHost, pin, opts);
    if (viaLoopback) return true;
  }
  const ownUrl = await resolveOwnLanBaseUrl();
  const hosts = await discoverLanHostsOnAllLocalSubnetsViaBeacon(ownUrl);
  if (!hosts.length) return false;
  for (const hostUrl of hosts) {
    if (staleHost && hostUrl === staleHost) continue;
    const ok = await joinHostAfterShiftPinExchange(hostUrl, pin, opts);
    if (ok) return true;
  }
  return false;
}
async function tryEasyLanShiftPinConnect(opts = {}) {
  if (opts.force) {
    resumeAutoHostDetect();
  }
  if (!opts.force && !canAttemptAutoHostDetect()) {
    return { ok: false, reason: "paused" };
  }
  const now = Date.now();
  if (!opts.force && !opts.skipCooldown && now - _lastEasyConnectAttemptMs < EASY_RETRY_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }
  _lastEasyConnectAttemptMs = now;
  const pin = String(opts.shiftPin || "").trim() || (typeof storage.getLanShiftPin === "function" ? storage.getLanShiftPin() : "");
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false, reason: "no_pin" };
  }
  if (!opts.force && await isCurrentLanHostReachable()) {
    return { ok: true, reason: "already_live" };
  }
  if (!opts.silent) {
    showEasyToast("Buscando anfitri\xF3n del turno\u2026", "info");
  }
  const ok = await connectLanWithShiftPin(pin, { ...opts, forceRediscover: true });
  if (ok) {
    recordAutoHostDetectSuccess();
    if (!opts.silent) {
      showEasyToast("Listo: conectado al turno.", "success");
    }
    return { ok: true, reason: "connected" };
  }
  if (!opts.force && (opts.silent || opts.skipCooldown)) {
    recordAutoHostDetectMiss();
  }
  return { ok: false, reason: "not_found" };
}
async function rediscoverLanHostWithShiftPin(opts = {}) {
  const result = await tryEasyLanShiftPinConnect({ ...opts, force: true, silent: opts.silent });
  return result.ok;
}
export {
  connectLanWithShiftPin,
  rediscoverLanHostWithShiftPin,
  tryEasyLanShiftPinConnect
};
//# sourceMappingURL=/js/chunks/lan-shift-pin-connect-YFEB7TJW.js.map
