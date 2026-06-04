/**
 * Discover R+ LAN hosts on the local subnet (guardia Wi‑Fi).
 * Complements live-peer discovery (livesync:hello) when teams have not joined the same room yet.
 */

import {
  isLoopbackHostname,
  isPrivateIpv4,
  subnetPrefixFromIpv4,
  orderedSubnetHosts,
} from '../interno/host-discovery.mjs';
import { pingLanHostUrl } from './lan-surrogate-host.mjs';

const LAN_PING_PATH = '/api/lan/v1/ping';
const PROBE_TIMEOUT_MS = 500;
const PROBE_BATCH = 32;
const DEFAULT_PORT = '3738';

/** @param {string} raw */
export function normalizeLanHostBase(raw) {
  const s = String(raw || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `http://${s}`;
}

/** @param {string} base */
export function hostIpv4FromBase(base) {
  try {
    return new URL(normalizeLanHostBase(base)).hostname;
  } catch (_e) {
    return '';
  }
}

/** @param {string} a @param {string} b */
export function lanHostBasesSameMachine(a, b) {
  const ha = hostIpv4FromBase(a);
  const hb = hostIpv4FromBase(b);
  if (!ha || !hb) return false;
  if (ha === hb) return true;
  const loop = (h) => isLoopbackHostname(h);
  return (loop(ha) && loop(hb)) || false;
}

/**
 * @param {string} base
 * @param {string} teamCode
 * @param {AbortSignal} [signal]
 */
export async function probeLanHostBase(base, teamCode, signal) {
  const url = `${normalizeLanHostBase(base)}${LAN_PING_PATH}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    const ok = await pingLanHostUrl(normalizeLanHostBase(base), teamCode);
    if (!ok) return null;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${String(teamCode || '').trim()}` },
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.lan !== true) return null;
    return normalizeLanHostBase(base);
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/**
 * @param {string[]} bases
 * @param {string} teamCode
 * @param {AbortSignal} [signal]
 */
async function probeBatch(bases, teamCode, signal) {
  const results = await Promise.all(
    bases.map((base) => probeLanHostBase(base, teamCode, signal))
  );
  return results.find(Boolean) || null;
}

/**
 * @param {string} protocol
 * @param {string} port
 * @param {string[]} hosts
 * @param {string} teamCode
 * @param {AbortSignal} [signal]
 */
async function probeHosts(protocol, port, hosts, teamCode, signal) {
  const bases = hosts.map((host) => `${protocol}//${host}:${port}`);
  for (let i = 0; i < bases.length; i += PROBE_BATCH) {
    if (signal?.aborted) return null;
    const hit = await probeBatch(bases.slice(i, i + PROBE_BATCH), teamCode, signal);
    if (hit) return hit;
  }
  return null;
}

/**
 * Find another LAN host on the ward subnet (not this machine).
 * @param {{ teamCode: string, localBaseUrl?: string, signal?: AbortSignal }} opts
 * @returns {Promise<string|null>}
 */
export async function discoverOtherLanHostOnSubnet(opts = {}) {
  const teamCode = String(opts.teamCode || '').trim();
  if (!teamCode) return null;

  const localBase = normalizeLanHostBase(opts.localBaseUrl || '');
  const signal = opts.signal;

  let seedHost = '';
  if (localBase) {
    seedHost = hostIpv4FromBase(localBase);
  }
  if ((!seedHost || isLoopbackHostname(seedHost)) && typeof window !== 'undefined') {
    if (window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === 'function') {
      try {
        const fromElectron = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
        const h = hostIpv4FromBase(fromElectron);
        if (h && !isLoopbackHostname(h)) seedHost = h;
      } catch (_e) {}
    }
  }

  const prefix = subnetPrefixFromIpv4(seedHost);
  if (!prefix || !isPrivateIpv4(seedHost)) return null;

  const skip = isLoopbackHostname(seedHost) ? '' : seedHost;
  const hosts = orderedSubnetHosts(prefix, skip);
  const hit = await probeHosts('http:', DEFAULT_PORT, hosts, teamCode, signal);
  if (!hit) return null;
  if (localBase && lanHostBasesSameMachine(hit, localBase)) return null;
  return hit;
}
