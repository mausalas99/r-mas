'use strict';
const { WebSocketServer } = require('ws');
const { verifyTeamCode } = require('./team-code.js');
const { createDeltaResolver } = require('./delta-resolver.js');

const AUTH_TIMEOUT_MS = 3000;

function attachWsHub(httpServer, { getState, resolver, pathName = '/api/lan/v1/ws' }) {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map();
  const deltaResolver =
    resolver && resolver.store ? createDeltaResolver({ store: resolver.store }) : null;

  function joinRoom(ws, name) {
    if (!rooms.has(name)) rooms.set(name, new Set());
    rooms.get(name).add(ws);
    ws.__rooms = ws.__rooms || new Set();
    ws.__rooms.add(name);
  }

  function leaveAll(ws) {
    if (!ws.__rooms) return;
    for (const name of ws.__rooms) {
      const set = rooms.get(name);
      if (set) {
        set.delete(ws);
        if (set.size === 0) rooms.delete(name);
      }
    }
    ws.__rooms.clear();
  }

  function broadcast(name, obj) {
    const set = rooms.get(name);
    if (!set) return;
    const payload = JSON.stringify(obj);
    for (const ws of set) {
      if (ws.readyState === 1) ws.send(payload);
    }
  }

  function terminateUnauthenticated(ws) {
    try {
      clearTimeout(ws.__authTimer);
    } catch (_e) {
      /* ignore */
    }
    try {
      ws.terminate();
    } catch (_inner) {
      /* ignore */
    }
  }

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const u = new URL(req.url || '', 'http://localhost');
      if (u.pathname !== pathName) return;
      if (u.searchParams.get('code') || u.searchParams.get('token')) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }
      const channel = u.searchParams.get('channel') || 'sync';
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.__authenticated = false;
        ws.__channel = channel;
        ws.__authTimer = setTimeout(() => terminateUnauthenticated(ws), AUTH_TIMEOUT_MS);
        wss.emit('connection', ws, req);
      });
    } catch (_e) {
      try {
        socket.destroy();
      } catch (_inner) {
        /* ignore */
      }
    }
  });

  wss.on('connection', (ws, req) => {
    const channel = ws.__channel || 'sync';

    ws.on('message', (raw) => {
      if (!ws.__authenticated) {
        let msg;
        try {
          msg = JSON.parse(String(raw));
        } catch (_e) {
          terminateUnauthenticated(ws);
          return;
        }
        if (!msg || msg.type !== 'auth' || !msg.token) {
          terminateUnauthenticated(ws);
          return;
        }
        let st;
        try {
          st = getState();
        } catch (_e) {
          terminateUnauthenticated(ws);
          return;
        }
        if (!verifyTeamCode(msg.token, st.teamCodeHash)) {
          terminateUnauthenticated(ws);
          return;
        }
        clearTimeout(ws.__authTimer);
        ws.__authTimer = null;
        ws.__authenticated = true;
        joinRoom(ws, channel);
        return;
      }

      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch (_e) {
        return;
      }

      if (msg.clientId && !ws.__clientId) ws.__clientId = msg.clientId;

      if (msg.capabilities && typeof msg.capabilities === 'object') {
        ws.__capabilities = msg.capabilities;
      }

      if (msg.type === 'livesync:delta' && msg.delta && deltaResolver) {
        try {
          const out = deltaResolver.applyDelta({
            ...msg.delta,
            roomId: msg.roomId,
            clientId: msg.clientId || msg.delta.clientId,
          });
          const applied = {
            type: 'livesync:delta:applied',
            ...out,
          };
          broadcast(channel, applied);
          if (out.ok) {
            broadcast(channel, {
              type: 'livesync:revision',
              roomId: msg.roomId,
              revision: out.revision || 0,
              clientId: msg.clientId || 'host',
            });
          }
        } catch (_e) {
          ws.close();
        }
        return;
      }

      if (msg.type === 'livesync:patch' && msg.mutation && resolver) {
        try {
          const out = resolver.applyMutation({
            ...msg.mutation,
            clientId: msg.clientId,
            roomId: msg.roomId,
          });
          const applied = {
            type: 'livesync:applied',
            roomId: msg.roomId,
            entityType: out.entityType,
            entityId: out.entityId,
            version: out.version,
            data: out.data,
            autoMerged: out.autoMerged,
            patientId: msg.mutation.patientId,
          };
          if (out.lwwApplied) applied.lwwApplied = true;
          if (Array.isArray(out.overwrittenKeys) && out.overwrittenKeys.length) {
            applied.overwrittenKeys = out.overwrittenKeys;
          }
          broadcast(channel, applied);
        } catch (e) {
          if (e.code === 'CONFLICT') {
            ws.send(
              JSON.stringify({
                type: 'livesync:conflict',
                roomId: msg.roomId,
                entityType: msg.mutation.entityType,
                entityId: msg.mutation.entityId,
                patientId: msg.mutation.patientId,
                conflictingKeys: e.conflictingKeys,
                server: { version: e.serverVersion, data: e.serverData },
                client: {
                  version: e.expectedVersion,
                  data: e.clientData,
                  op: msg.mutation.op,
                },
                expectedVersion: e.expectedVersion,
              })
            );
            return;
          }
          ws.close();
        }
        return;
      }

      if (channel.startsWith('live:')) {
        broadcast(channel, msg);
      }
    });

    ws.on('close', () => leaveAll(ws));
  });

  return { broadcast };
}

module.exports = { attachWsHub, AUTH_TIMEOUT_MS };
