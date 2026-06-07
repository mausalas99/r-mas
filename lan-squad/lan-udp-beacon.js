'use strict';
const dgram = require('node:dgram');

const MULTICAST_GROUP = '239.255.42.1';
const DEFAULT_BEACON_PORT = 3739;
const DISCOVER_MSG = JSON.stringify({ type: 'rplus-discover' });

/**
 * @param {{ clientId: string, startedAt: number, rank: string, teamHash: string, port?: number }} opts
 */
function createUdpBeacon({ clientId, startedAt, rank, teamHash, port = DEFAULT_BEACON_PORT }) {
  /** @type {dgram.Socket | null} */
  let listenSocket = null;
  let listenPort = 0;

  const beaconMsg = JSON.stringify({
    type: 'rplus-beacon',
    port: 3738,
    clientId,
    startedAt,
    rank,
    teamHash,
  });

  /** Start the multicast listen side. Returns Promise<number> with assigned port. */
  function startListening() {
    return new Promise((resolve, reject) => {
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      listenSocket = sock;

      sock.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data && data.type === 'rplus-discover') {
            const buf = Buffer.from(beaconMsg);
            sock.send(buf, rinfo.port, rinfo.address, () => {});
          }
        } catch (_e) {}
      });

      sock.on('error', (err) => {
        reject(err);
      });

      const bindPort = Number(port) || 0;
      sock.bind(bindPort, () => {
        try {
          if (bindPort !== 0) {
            sock.addMembership(MULTICAST_GROUP);
          }
        } catch (_e) {
          // Multicast join may fail in CI/test environments without multicast — non-fatal
        }
        listenPort = sock.address().port;
        resolve(listenPort);
      });
    });
  }

  /**
   * Send a discovery datagram and collect unicast replies for timeoutMs.
   * @param {number} targetPort — port to send to
   * @param {number} [timeoutMs=500]
   * @returns {Promise<Array<{url: string, clientId: string, startedAt: number, rank: string, teamHash: string, _fromUdp: boolean}>>}
   */
  function discoverOnPort(targetPort, timeoutMs = 500) {
    return new Promise((resolve) => {
      const results = [];
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      sock.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data && data.type === 'rplus-beacon' && data.clientId) {
            results.push({
              url: `http://127.0.0.1:${data.port || 3738}`,
              clientId: String(data.clientId),
              startedAt: Number(data.startedAt) || 0,
              rank: String(data.rank || ''),
              teamHash: String(data.teamHash || ''),
              _fromUdp: true,
            });
          }
        } catch (_e) {}
      });

      sock.bind(0, () => {
        try {
          sock.setBroadcast(true);
        } catch (_e) {}
        const buf = Buffer.from(DISCOVER_MSG);
        const dest = targetPort || listenPort || Number(port) || DEFAULT_BEACON_PORT;
        sock.send(buf, dest, '127.0.0.1', () => {});
        setTimeout(() => {
          try { sock.close(); } catch (_e) {}
          resolve(results);
        }, timeoutMs);
      });
    });
  }

  /**
   * Production discover: sends to MULTICAST_GROUP on the configured beacon port.
   * @param {number} [timeoutMs=500]
   */
  function discover(timeoutMs = 500) {
    return new Promise((resolve) => {
      const results = [];
      const seen = new Set();
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      sock.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data && data.type === 'rplus-beacon' && data.clientId && data.clientId !== clientId) {
            const url = `http://${rinfo.address}:${data.port || 3738}`;
            if (!seen.has(url)) {
              seen.add(url);
              results.push({
                url,
                clientId: data.clientId,
                startedAt: data.startedAt,
                rank: data.rank,
                teamHash: data.teamHash,
                _fromUdp: true,
              });
            }
          }
        } catch (_e) {}
      });

      sock.bind(0, () => {
        try { sock.setBroadcast(true); } catch (_e) {}
        try { sock.setMulticastTTL(4); } catch (_e) {}
        const buf = Buffer.from(DISCOVER_MSG);
        const destPort = Number(port) || DEFAULT_BEACON_PORT;
        sock.send(buf, destPort, MULTICAST_GROUP, () => {});
        setTimeout(() => {
          try { sock.close(); } catch (_e) {}
          resolve(results);
        }, timeoutMs);
      });
    });
  }

  function stop() {
    if (listenSocket) {
      try { listenSocket.close(); } catch (_e) {}
      listenSocket = null;
    }
  }

  return { startListening, discoverOnPort, discover, stop };
}

module.exports = { createUdpBeacon, MULTICAST_GROUP };
