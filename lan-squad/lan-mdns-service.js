'use strict';
const { Bonjour } = require('bonjour-service');
const crypto = require('node:crypto');
const { pickLanCandidateBaseUrl } = require('./lan-candidate-url.js');

const SERVICE_TYPE = 'rplus';
const SERVICE_PROTOCOL = 'tcp';
const DEFAULT_PORT = 3738;

/** Multicast send/bind failures when Wi‑Fi is down or interfaces are in flux. */
const RECOVERABLE_MDNS_CODES = new Set([
  'EADDRNOTAVAIL',
  'ENETUNREACH',
  'ENETDOWN',
  'EHOSTUNREACH',
  'EACCES',
]);

/**
 * @param {NodeJS.ErrnoException | null | undefined} err
 * @returns {boolean}
 */
function isRecoverableMdnsError(err) {
  if (!err) return false;
  return RECOVERABLE_MDNS_CODES.has(String(err.code || ''));
}

/**
 * True when this Mac has a non-loopback IPv4 LAN address for mDNS.
 * @param {string} [hostBaseUrl]
 * @returns {boolean}
 */
function hasLanInterfaceForMdns(hostBaseUrl) {
  const explicit = String(hostBaseUrl || '').trim();
  if (explicit) return true;
  return !!pickLanCandidateBaseUrl();
}

/**
 * @param {NodeJS.ErrnoException | null | undefined} err
 * @param {() => void} stopFn
 */
function handleMdnsFault(err, stopFn) {
  if (!err) return;
  if (!isRecoverableMdnsError(err)) {
    console.warn('[lan-mdns]', err.message || String(err));
  }
  try {
    stopFn();
  } catch (_e) {}
}

/**
 * @param {{ clientId: string, startedAt: number, rank: string, teamHash: string, port?: number }} opts
 * @param {(peers: Array<{url: string, clientId: string, startedAt: number, rank: string, teamHash: string}>) => void} onPeers
 */
function createLanMdnsService({ clientId, startedAt, rank, teamHash, port = DEFAULT_PORT }, onPeers) {
  let bonjour = null;
  let browser = null;
  let advertised = null;
  /** @type {import('node:events').EventEmitter | null} */
  let mdnsEmitter = null;

  function onMdnsSocketEvent(err) {
    handleMdnsFault(err, stop);
  }

  function attachMdnsListeners(mdns) {
    if (!mdns || typeof mdns.on !== 'function') return;
    mdnsEmitter = mdns;
    mdns.on('warning', onMdnsSocketEvent);
    mdns.on('error', onMdnsSocketEvent);
  }

  function detachMdnsListeners() {
    if (!mdnsEmitter) return;
    try {
      mdnsEmitter.removeListener('warning', onMdnsSocketEvent);
      mdnsEmitter.removeListener('error', onMdnsSocketEvent);
    } catch (_e) {}
    mdnsEmitter = null;
  }

  function start(hostBaseUrl) {
    stop();
    if (!hasLanInterfaceForMdns(hostBaseUrl)) return;

    bonjour = new Bonjour({}, (err) => {
      handleMdnsFault(err, stop);
    });
    attachMdnsListeners(bonjour.server && bonjour.server.mdns);

    advertised = bonjour.publish({
      name: `R+ ${rank} ${String(clientId).slice(-6)}`,
      type: `${SERVICE_TYPE}.${SERVICE_PROTOCOL}`,
      port,
      txt: { clientId, startedAt: String(startedAt), rank, teamHash },
    });

    browser = bonjour.find({ type: `${SERVICE_TYPE}.${SERVICE_PROTOCOL}` }, (service) => {
      try {
        const txt = service.txt || {};
        const peerClientId = String(txt.clientId || '').trim();
        const peerStartedAt = Number(txt.startedAt) || 0;
        const peerRank = String(txt.rank || '').trim();
        const peerTeamHash = String(txt.teamHash || '').trim();
        if (!peerClientId || !peerStartedAt) return;
        if (peerClientId === clientId) return;
        const addresses = Array.isArray(service.addresses) ? service.addresses : [];
        const ipv4 = addresses.find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a)) || '';
        if (!ipv4) return;
        const url = `http://${ipv4}:${service.port || port}`;
        if (typeof onPeers === 'function') {
          onPeers([{ url, clientId: peerClientId, startedAt: peerStartedAt, rank: peerRank, teamHash: peerTeamHash }]);
        }
      } catch (_e) {}
    });
  }

  function stop() {
    detachMdnsListeners();
    try {
      if (browser) {
        browser.stop();
        browser = null;
      }
    } catch (_e) {}
    try {
      if (advertised) {
        advertised.stop();
        advertised = null;
      }
    } catch (_e) {}
    try {
      if (bonjour) {
        bonjour.destroy();
        bonjour = null;
      }
    } catch (_e) {}
  }

  function restart(newHostBaseUrl) {
    stop();
    setTimeout(() => start(newHostBaseUrl), 300);
  }

  return { start, stop, restart };
}

function buildTeamHashSync(teamCode) {
  return crypto.createHash('sha256').update(String(teamCode || '')).digest('hex').slice(0, 8);
}

module.exports = {
  createLanMdnsService,
  buildTeamHashSync,
  isRecoverableMdnsError,
  hasLanInterfaceForMdns,
};
