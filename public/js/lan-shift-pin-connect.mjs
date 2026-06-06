/**
 * Connect to ward LAN host via shared shift PIN (registration / onboarding / Wi‑Fi roam).
 */
import { liveSyncRoomLabel, resolveLiveSyncRoomIdFromSala } from './lan-join-link.mjs';
import {
  discoverLanHostsOnAllLocalSubnetsViaBeacon,
  normalizeLanHostBase,
} from './lan-host-subnet-discovery.mjs';
import { pingLanHostUrl } from './lan-surrogate-host.mjs';
import {
  isLanElectronDesktop,
  joinRemoteLanHostAsClient,
  resolveLanShareBaseUrl,
} from './features/lan/transport.mjs';
import { storage } from './storage.js';

const EXCHANGE_TIMEOUT_MS = 8000;
const EASY_RETRY_COOLDOWN_MS = 12000;

let _lastEasyConnectAttemptMs = 0;

function showEasyToast(message, kind) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(message, kind);
  }
}

/** @param {string} hostUrl @param {string} shiftPin */
async function exchangeShiftPinOnHost(hostUrl, shiftPin) {
  const base = normalizeLanHostBase(hostUrl);
  const pin = String(shiftPin || '').trim();
  if (!base || !/^\d{6}$/.test(pin)) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EXCHANGE_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/api/lan/v1/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftPin: pin }),
      signal: ctrl.signal,
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
  if (window.electronAPI && typeof window.electronAPI.lanGuestWriteBearer === 'function') {
    try {
      await window.electronAPI.lanGuestWriteBearer({ token: String(data.token).trim() });
    } catch (_e) {}
  }
}

async function resolveOwnLanBaseUrl() {
  let ownUrl = '';
  if (window.electronAPI?.getLanCandidateBaseUrl) {
    try {
      ownUrl = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
    } catch (_e) {}
  }
  if (!ownUrl) {
    ownUrl = normalizeLanHostBase(await resolveLanShareBaseUrl());
  }
  return ownUrl;
}

/** @returns {Promise<boolean>} */
async function isCurrentLanHostReachable() {
  const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  const url = normalizeLanHostBase(cfg.hostUrl);
  const code = String(cfg.teamCode || '').trim();
  if (!url || code.length < 32) return false;
  return pingLanHostUrl(url, code);
}

/**
 * @param {string} hostUrl
 * @param {string} shiftPin
 * @param {{ sala?: string, roomId?: string }} opts
 * @returns {Promise<boolean>}
 */
async function joinHostAfterShiftPinExchange(hostUrl, shiftPin, opts) {
  const data = await exchangeShiftPinOnHost(hostUrl, shiftPin);
  if (!data?.token) return false;

  await persistShiftPinBearer(data);
  const joined = await joinRemoteLanHostAsClient(
    String(data.hostUrl || hostUrl),
    data.token,
    { requireConfirm: false, toastLabel: '' }
  );
  if (!joined) return false;

  const roomId =
    String(opts.roomId || '').trim() || resolveLiveSyncRoomIdFromSala(opts.sala) || '';
  if (roomId) {
    try {
      const room = await import('./features/lan/room.mjs');
      if (typeof room.joinLanRoom === 'function') {
        await room.joinLanRoom(roomId, liveSyncRoomLabel(roomId));
      }
    } catch (_eRoom) {}
  }
  return true;
}

/**
 * Scan local subnets, exchange shift PIN, connect as client, join sala from profile.
 * @param {string} shiftPin
 * @param {{ sala?: string, roomId?: string, forceRediscover?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function connectLanWithShiftPin(shiftPin, opts = {}) {
  if (!isLanElectronDesktop()) return false;
  const pin = String(shiftPin || '').trim();
  if (!/^\d{6}$/.test(pin)) return false;

  if (typeof storage.saveLanShiftPin === 'function') storage.saveLanShiftPin(pin);

  if (!opts.forceRediscover && (await isCurrentLanHostReachable())) {
    return true;
  }

  const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  const staleHost = normalizeLanHostBase(cfg.hostUrl);
  if (staleHost) {
    const quick = await joinHostAfterShiftPinExchange(staleHost, pin, opts);
    if (quick) return true;
  }

  // Same-Mac dev peer (npm run dev:lan-peer-app): subnet scan skips this machine; try loopback first.
  const loopbackHost = normalizeLanHostBase('http://127.0.0.1:3738');
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

/**
 * One-tap / automatic connect: saved PIN, plain language, no technical steps.
 * @param {{ shiftPin?: string, sala?: string, roomId?: string, silent?: boolean, force?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, reason: string }>}
 */
export async function tryEasyLanShiftPinConnect(opts = {}) {
  const now = Date.now();
  if (!opts.force && now - _lastEasyConnectAttemptMs < EASY_RETRY_COOLDOWN_MS) {
    return { ok: false, reason: 'cooldown' };
  }
  _lastEasyConnectAttemptMs = now;

  const pin =
    String(opts.shiftPin || '').trim() ||
    (typeof storage.getLanShiftPin === 'function' ? storage.getLanShiftPin() : '');
  if (!/^\d{6}$/.test(pin)) {
    return { ok: false, reason: 'no_pin' };
  }

  if (!opts.force && (await isCurrentLanHostReachable())) {
    return { ok: true, reason: 'already_live' };
  }

  if (!opts.silent) {
    showEasyToast('Buscando anfitrión del turno…', 'info');
  }

  const ok = await connectLanWithShiftPin(pin, { ...opts, forceRediscover: true });
  if (ok && !opts.silent) {
    showEasyToast('Listo: conectado al turno.', 'success');
  }
  return { ok, reason: ok ? 'connected' : 'not_found' };
}

/**
 * Re-find ward host after Wi‑Fi/VLAN change using saved shift PIN.
 * @param {{ shiftPin?: string, sala?: string, roomId?: string, silent?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function rediscoverLanHostWithShiftPin(opts = {}) {
  const result = await tryEasyLanShiftPinConnect({ ...opts, force: true, silent: opts.silent });
  return result.ok;
}
