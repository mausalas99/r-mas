'use strict';
const { WebSocketServer } = require('ws');
const { verifyTeamCode } = require('./team-code.js');

function attachWsHub(httpServer, { getState, pathName = '/api/lan/v1/ws' }) {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map();

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

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const u = new URL(req.url || '', 'http://localhost');
      if (u.pathname !== pathName) return;
      const code = u.searchParams.get('code') || '';
      const st = getState();
      if (!verifyTeamCode(code, st.teamCodeHash)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } catch (_e) {
      try {
        socket.destroy();
      } catch (_inner) { /* ignore */ }
    }
  });

  wss.on('connection', (ws, req) => {
    const u = new URL(req.url || '', 'http://localhost');
    const channel = u.searchParams.get('channel') || 'calendar';
    joinRoom(ws, channel);

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch (_e) {
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

module.exports = { attachWsHub };
