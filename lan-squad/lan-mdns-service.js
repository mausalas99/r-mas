'use strict';
const { Bonjour } = require('bonjour-service');
const crypto = require('node:crypto');

const SERVICE_TYPE = 'rplus';
const SERVICE_PROTOCOL = 'tcp';
const DEFAULT_PORT = 3738;

/**
 * @param {{ clientId: string, startedAt: number, rank: string, teamHash: string, port?: number }} opts
 * @param {(peers: Array<{url: string, clientId: string, startedAt: number, rank: string, teamHash: string}>) => void} onPeers
 */
function createLanMdnsService({ clientId, startedAt, rank, teamHash, port = DEFAULT_PORT }, onPeers) {
  let bonjour = null;
  let browser = null;
  let advertised = null;

  function start(_hostIp) {
    stop();
    bonjour = new Bonjour();

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
    try { if (browser) { browser.stop(); browser = null; } } catch (_e) {}
    try { if (advertised) { advertised.stop(); advertised = null; } } catch (_e) {}
    try { if (bonjour) { bonjour.destroy(); bonjour = null; } } catch (_e) {}
  }

  function restart(newHostIp) {
    stop();
    setTimeout(() => start(newHostIp), 300);
  }

  return { start, stop, restart };
}

function buildTeamHashSync(teamCode) {
  return crypto.createHash('sha256').update(String(teamCode || '')).digest('hex').slice(0, 8);
}

module.exports = { createLanMdnsService, buildTeamHashSync };
