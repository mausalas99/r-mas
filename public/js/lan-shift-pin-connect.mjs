/**
 * Connect to ward LAN host via shared shift PIN (registration / onboarding / Wi‑Fi roam).
 */
import { buildTeamHash, liveSyncRoomLabel, resolveLiveSyncRoomIdFromSala } from './lan-join-link.mjs';
import {
  discoverLanHostsOnAllLocalSubnetsViaBeacon,
  normalizeLanHostBase,
} from './lan-host-subnet-discovery.mjs';
import { pingLanHostUrl } from './lan-surrogate-host.mjs';
import { storage } from './storage.js';
import {
  canAttemptAutoHostDetect,
  recordAutoHostDetectMiss,
  recordAutoHostDetectSuccess,
  resumeAutoHostDetect,
} from './lan-host-detect-guard.mjs';
import { lanNetworkProfile } from './lan-network-profile.mjs';

const EXCHANGE_TIMEOUT_MS = 8000;
const BACKOFF_STEPS_MS = [12_000, 30_000, 60_000, 120_000];
let _easyConnectFailCount = 0;
let _lastEasyConnectAttemptMs = 0;

export function getShiftPinCooldownMs() {
  return BACKOFF_STEPS_MS[Math.min(_easyConnectFailCount, BACKOFF_STEPS_MS.length - 1)];
}
export function recordShiftPinFailure() {
  _easyConnectFailCount = Math.min(_easyConnectFailCount + 1, BACKOFF_STEPS_MS.length - 1);
}
export function resetShiftPinBackoff() {
  _easyConnectFailCount = 0;
  _lastEasyConnectAttemptMs = 0;
}

function loadLanTransport() {
  return import('./features/lan/transport.mjs');
}

function showEasyToast(message, kind) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(message, kind);
  }
}

async function verifyTeamHashFromUrl(joinUrl, ownTeamCode) {
  try {
    const urlTh = new URL(joinUrl).searchParams.get('th');
    if (!urlTh) return true;
    const expectedTh = await buildTeamHash(ownTeamCode);
    return !expectedTh || urlTh === expectedTh;
  } catch (_e) {
    return true;
  }
}

function getOwnTeamCode() {
  const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  return String(cfg.teamCode || '').trim();
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
    const transport = await loadLanTransport();
    ownUrl = normalizeLanHostBase(await transport.resolveLanShareBaseUrl());
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
  const transport = await loadLanTransport();
  const joined = await transport.joinRemoteLanHostAsClient(
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
  const transport = await loadLanTransport();
  if (!transport.isLanElectronDesktop()) return false;
  const pin = String(shiftPin || '').trim();
  if (!/^\d{6}$/.test(pin)) return false;

  const joinUrl = String(opts.joinUrl || '').trim();
  if (joinUrl) {
    const hashOk = await verifyTeamHashFromUrl(joinUrl, getOwnTeamCode());
    if (!hashOk) {
      showEasyToast('Este enlace es de otra sala o servicio. Verifica con el anfitrión.', 'warn');
      return false;
    }
  }

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
  if (opts.force) {
    resumeAutoHostDetect();
  }
  if (!opts.force && !canAttemptAutoHostDetect()) {
    return { ok: false, reason: 'paused' };
  }
  if (lanNetworkProfile.getNetworkProfile() === 'offline') {
    return { ok: false, reason: 'offline' };
  }
  const now = Date.now();
  if (!opts.force && !opts.skipCooldown && now - _lastEasyConnectAttemptMs < getShiftPinCooldownMs()) {
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
    resetShiftPinBackoff();
    return { ok: true, reason: 'already_live' };
  }

  if (!opts.silent) {
    showEasyToast('Buscando anfitrión del turno…', 'info');
  }

  const ok = await connectLanWithShiftPin(pin, { ...opts, forceRediscover: true });
  if (ok) {
    resetShiftPinBackoff();
    recordAutoHostDetectSuccess();
    if (!opts.silent) {
      showEasyToast('Listo: conectado al turno.', 'success');
    }
    return { ok: true, reason: 'connected' };
  }
  recordShiftPinFailure();
  if (!opts.force && (opts.silent || opts.skipCooldown)) {
    recordAutoHostDetectMiss();
  }
  return { ok: false, reason: 'not_found' };
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
