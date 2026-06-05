/**
 * Connect to ward LAN host via shared shift PIN (registration / onboarding).
 */
import { liveSyncRoomLabel, resolveLiveSyncRoomIdFromSala } from './lan-join-link.mjs';
import {
  discoverLanHostsOnSubnetViaBeacon,
  normalizeLanHostBase,
} from './lan-host-subnet-discovery.mjs';
import {
  isLanElectronDesktop,
  joinRemoteLanHostAsClient,
  resolveLanShareBaseUrl,
} from './features/lan/transport.mjs';
import { storage } from './storage.js';

const EXCHANGE_TIMEOUT_MS = 8000;

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

/**
 * Scan subnet, exchange shift PIN, connect as client, join sala from profile.
 * @param {string} shiftPin
 * @param {{ sala?: string, roomId?: string }} [opts]
 * @returns {Promise<boolean>}
 */
export async function connectLanWithShiftPin(shiftPin, opts = {}) {
  if (!isLanElectronDesktop()) return false;
  const pin = String(shiftPin || '').trim();
  if (!/^\d{6}$/.test(pin)) return false;

  const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  if (String(cfg.hostUrl || '').trim() && String(cfg.teamCode || '').trim().length >= 32) {
    return true;
  }

  let ownUrl = '';
  if (window.electronAPI?.getLanCandidateBaseUrl) {
    try {
      ownUrl = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
    } catch (_e) {}
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
      { requireConfirm: false, toastLabel: '' }
    );
    if (!joined) continue;

    const roomId =
      String(opts.roomId || '').trim() ||
      resolveLiveSyncRoomIdFromSala(opts.sala) ||
      '';
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
  return false;
}
