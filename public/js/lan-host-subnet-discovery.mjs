/**
 * Discover other R+ LAN hosts on the same /24 subnet (split-brain guard).
 */
import {
  isLoopbackHostname,
  isPrivateIpv4,
  orderedSubnetHosts,
  subnetPrefixFromIpv4,
} from '../interno/host-discovery.mjs';
import { pingLanHostUrl } from './lan-surrogate-host.mjs';

const LAN_PING_PATH = '/api/lan/v1/ping';
const PROBE_TIMEOUT_MS = 500;
const PROBE_BATCH = 32;
const MAX_FOUND = 4;
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
  return loop(ha) && loop(hb);
}

/**
 * @param {string} base
 * @param {string} teamCode
 * @param {AbortSignal} [signal]
 */
export async function probeLanHostBase(base, teamCode, signal) {
  const normalized = normalizeLanHostBase(base);
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
    const code = String(teamCode || '').trim();
    if (!normalized || !code) return null;
    const ok = await pingLanHostUrl(normalized, code);
    if (!ok) return null;
    const res = await fetch(`${normalized}${LAN_PING_PATH}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${code}` },
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.lan !== true) return null;
    return normalized;
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/**
 * @param {string} teamCode
 * @param {string} ownBaseUrl
 * @returns {Promise<string[]>}
 */
export async function discoverLanHostsOnSubnet(teamCode, ownBaseUrl) {
  const own = normalizeLanHostBase(ownBaseUrl);
  const code = String(teamCode || '').trim();
  if (!code) return [];

  let seedHost = hostIpv4FromBase(own);
  if ((!seedHost || isLoopbackHostname(seedHost)) && typeof window !== 'undefined') {
    if (window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === 'function') {
      try {
        const fromElectron = normalizeLanHostBase(await window.electronAPI.getLanCandidateBaseUrl());
        const h = hostIpv4FromBase(fromElectron);
        if (h && !isLoopbackHostname(h)) seedHost = h;
      } catch (_e) {}
    }
  }
  if (!seedHost && own) seedHost = hostIpv4FromBase(own);

  const prefix = subnetPrefixFromIpv4(seedHost);
  if (!prefix || !isPrivateIpv4(seedHost)) return [];

  const skip = isLoopbackHostname(seedHost) ? '' : seedHost;
  const hosts = orderedSubnetHosts(prefix, skip);
  /** @type {Set<string>} */
  const found = new Set();

  for (let i = 0; i < hosts.length && found.size < MAX_FOUND; i += PROBE_BATCH) {
    const batch = hosts.slice(i, i + PROBE_BATCH);
    const bases = batch.map((host) => `http://${host}:${DEFAULT_PORT}`);
    const probes = await Promise.all(bases.map((base) => probeLanHostBase(base, code)));
    for (const url of probes) {
      if (!url || (own && (url === own || lanHostBasesSameMachine(url, own)))) continue;
      found.add(url);
      if (found.size >= MAX_FOUND) break;
    }
  }

  return [...found].sort();
}
