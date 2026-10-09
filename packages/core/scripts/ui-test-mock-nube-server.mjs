#!/usr/bin/env node
/**
 * Mock of the real Cloudflare Worker's API surface (cloud/sync-worker/src/*.js)
 * for the isolated UI test mode (R_PLUS_UI_TEST_MODE=1). stdlib `http` only —
 * no new dependency, in-memory state, reset on every restart.
 *
 * Covers: /ping, /meta, /auth/{register,login,logout,me}, /rooms (create,
 * join, ensure-turn, list, active, get, leave), /rooms/:id/dek (get/put/rotate),
 * /rooms/:id/pull, /rooms/:id/mutations, /rooms/:id/live (WebSocket) — the
 * endpoints public/js/features/cloud-sync/api-client.mjs and
 * room-sync-ws-internals.mjs actually call for the account/room/sync screens.
 * Admin (/admin) is out of scope for click-through UI
 * coverage and return 501 not_implemented.
 *
 * The /live WebSocket handshake and frames are hand-rolled (crypto.createHash
 * for Sec-WebSocket-Accept, manual frame read/write) instead of pulling in
 * the `ws` package, to keep this file's own no-new-dependency rule — the
 * client only needs a `hello` on connect and a `pong` reply to its heartbeat
 * `ping`, see room-sync-hub.js (the real Worker's DO) for the protocol.
 *
 * Fault-injection scenario config: see scripts/ui-test-fault-scenarios.json
 * for the shape. Loaded once at launch from --scenarios=<file> or
 * R_PLUS_UI_TEST_SCENARIOS, defaulting to that checked-in file.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_PREFIX = '/api/sync/v1';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ERROR_STATUS = {
  conflict: 409,
  revision_stale: 409,
  quota_exceeded: 409,
  invalid_credentials: 401,
  unauthorized: 401,
  invalid_token: 403,
  auth_required: 403,
  forbidden: 403,
  not_member: 403,
  not_found: 404,
  invalid_request: 400,
  not_implemented: 501,
  rate_limited: 429,
  error: 500,
};

/** @param {string} scenarioPath */
export function loadScenarios(scenarioPath) {
  const defaults = {
    syncTimeoutMs: 0,
    stuckNoKeyRoomCodes: new Set(),
    staleRevisionRoomCodes: new Set(),
    rateLimitedLoginUsernames: new Set(),
  };
  try {
    const json = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
    return {
      syncTimeoutMs: Number(json.syncTimeoutMs) || 0,
      stuckNoKeyRoomCodes: new Set(json.stuckNoKeyRoomCodes || []),
      staleRevisionRoomCodes: new Set(json.staleRevisionRoomCodes || []),
      rateLimitedLoginUsernames: new Set(json.rateLimitedLoginUsernames || []),
    };
  } catch {
    return defaults;
  }
}

function randomCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return s;
}

function roomPayload(room, role) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    sala: room.sala,
    ownerUserId: room.ownerUserId,
    revision: room.revision,
    storageBytes: JSON.stringify(room.state).length,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    ...(role ? { role } : {}),
    ...(room.turnKey ? { turnKey: room.turnKey } : {}),
  };
}

export function createMockNubeState() {
  return {
    usersByUsername: new Map(),
    sessionsByToken: new Map(),
    activeRoomIdByUserId: new Map(),
    rooms: new Map(),
  };
}

function createUser(state, username, password, displayName) {
  const user = { id: crypto.randomUUID(), username, password, displayName: displayName || username };
  state.usersByUsername.set(username.toLowerCase(), user);
  return user;
}

function createRoom(state, ownerUserId, { name = '', sala = 'Sala', turnKey } = {}) {
  const now = new Date().toISOString();
  const room = {
    id: crypto.randomUUID(),
    code: randomCode(),
    name,
    sala,
    turnKey: turnKey || null,
    ownerUserId,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    membersByUserId: new Map([[ownerUserId, 'owner']]),
    state: {},
    ops: [],
    dek: null,
    adminDek: null,
  };
  state.rooms.set(room.id, room);
  return room;
}

/** Two fake teams/rooms so cloud-sync screens have something to show on first boot. */
function seedFakeTeamsAndRooms(state) {
  const alice = createUser(state, 'ui-test-alice', 'ui-test-pass', 'Dra. Alice Demo');
  const bob = createUser(state, 'ui-test-bob', 'ui-test-pass', 'Dr. Bob Demo');
  const roomA = createRoom(state, alice.id, { name: 'Sala Demo A', sala: 'Sala' });
  roomA.membersByUserId.set(bob.id, 'member');
  createRoom(state, bob.id, { name: 'Torre HU Demo', sala: 'Torre HU' });
}

function findRoomByCode(state, code) {
  const upper = String(code || '').toUpperCase();
  for (const room of state.rooms.values()) {
    if (room.code === upper) return room;
  }
  return null;
}

/** Same default as the real Worker's ensure-turn: current calendar month. */
function defaultTurnKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function findRoomBySalaTurn(state, sala, turnKey) {
  for (const room of state.rooms.values()) {
    if (room.sala === sala && room.turnKey === turnKey) return room;
  }
  return null;
}

function userFromAuthHeader(state, req) {
  const auth = String(req.headers['authorization'] || '');
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return null;
  const userId = state.sessionsByToken.get(m[1]);
  if (!userId) return null;
  for (const u of state.usersByUsername.values()) {
    if (u.id === userId) return u;
  }
  return null;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

function sendError(res, code, message) {
  sendJson(res, ERROR_STATUS[code] || 400, { error: code, message: message || code });
}

function delayIfConfigured(scenarios) {
  if (!scenarios.syncTimeoutMs) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, scenarios.syncTimeoutMs));
}

const WS_HANDSHAKE_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** @returns {boolean} true if the 101 response was sent. */
function acceptWsUpgrade(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) return false;
  const accept = crypto.createHash('sha1').update(key + WS_HANDSHAKE_MAGIC).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  return true;
}

/** Writes one unmasked text frame (server→client frames are never masked). */
function sendWsText(socket, text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  try {
    socket.write(Buffer.concat([header, payload]));
  } catch {
    /* socket already closed */
  }
}

/** Reads client frames (always masked) off the raw socket and hands text payloads to onText. */
function readWsMessages(socket, onText) {
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.length < 2) return;
      const opcode = buffer[0] & 0x0f;
      const masked = !!(buffer[1] & 0x80);
      let len = buffer[1] & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buffer.length < 4) return;
        len = buffer.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buffer.length < 10) return;
        len = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }
      let maskKey = null;
      if (masked) {
        if (buffer.length < offset + 4) return;
        maskKey = buffer.subarray(offset, offset + 4);
        offset += 4;
      }
      if (buffer.length < offset + len) return;
      let payload = buffer.subarray(offset, offset + len);
      if (maskKey) payload = Buffer.from(payload.map((b, i) => b ^ maskKey[i % 4]));
      buffer = buffer.subarray(offset + len);
      if (opcode === 0x8) {
        socket.end();
        return;
      }
      if (opcode === 0x1) onText(payload.toString('utf8'));
    }
  });
}

/**
 * @param {{ syncTimeoutMs: number, stuckNoKeyRoomCodes: Set<string>, staleRevisionRoomCodes: Set<string>, rateLimitedLoginUsernames: Set<string> }} scenarios
 * @param {ReturnType<typeof createMockNubeState>} state
 */
export function createRequestHandler(scenarios, state) {
  return async function handleRequest(req, res) {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return sendError(res, 'invalid_request', 'bad url');
    }
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    if (!pathname.startsWith(API_PREFIX)) return sendError(res, 'not_found', 'not found');
    const sub = pathname.slice(API_PREFIX.length) || '/';

    try {
      if (sub === '/ping' && req.method === 'GET') {
        return sendJson(res, 200, { ok: true, service: 'rplus-sync-mock' });
      }
      if (sub === '/meta' && req.method === 'GET') {
        return sendJson(res, 200, {
          ok: true,
          service: 'rplus-sync-mock',
          salas: ['Sala', 'Torre HU', 'Eme', 'UX', 'Área A/Pensionistas'],
          features: { revisionWs: true },
        });
      }

      if (sub === '/auth/register' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const username = String(body.username || '').trim().toLowerCase();
        if (!username || !body.password) return sendError(res, 'invalid_request', 'username/password requeridos');
        if (state.usersByUsername.has(username)) return sendError(res, 'conflict', 'Ese usuario ya existe.');
        const user = createUser(state, username, String(body.password), String(body.displayName || '').trim());
        const token = crypto.randomUUID();
        state.sessionsByToken.set(token, user.id);
        return sendJson(res, 200, {
          token,
          expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
          user: { id: user.id, username: user.username, displayName: user.displayName },
          recoveryCode: 'MOCK-RECOVERY-CODE',
        });
      }

      if (sub === '/auth/login' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const username = String(body.username || '').trim().toLowerCase();
        if (scenarios.rateLimitedLoginUsernames.has(username)) {
          const status = ERROR_STATUS.rate_limited;
          res.writeHead(status, { 'Content-Type': 'application/json', 'Retry-After': '30' });
          return res.end(JSON.stringify({ error: 'rate_limited', message: 'Demasiados intentos. Espera antes de reintentar.' }));
        }
        const user = state.usersByUsername.get(username);
        if (!user || user.password !== String(body.password || '')) {
          return sendError(res, 'invalid_credentials', 'Usuario o contraseña incorrectos.');
        }
        const token = crypto.randomUUID();
        state.sessionsByToken.set(token, user.id);
        return sendJson(res, 200, {
          token,
          expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
          user: { id: user.id, username: user.username, displayName: user.displayName },
        });
      }

      if (sub === '/auth/logout' && req.method === 'POST') {
        const auth = String(req.headers['authorization'] || '');
        const m = /^Bearer\s+(.+)$/i.exec(auth);
        if (m) state.sessionsByToken.delete(m[1]);
        return sendJson(res, 200, { ok: true });
      }

      if (sub === '/auth/me' && req.method === 'GET') {
        const user = userFromAuthHeader(state, req);
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        return sendJson(res, 200, { user: { id: user.id, username: user.username, displayName: user.displayName } });
      }

      // Everything below requires a session.
      const user = userFromAuthHeader(state, req);

      if (sub === '/rooms' && req.method === 'POST') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const body = await readJsonBody(req);
        const room = createRoom(state, user.id, { name: String(body.name || ''), sala: String(body.sala || 'Sala') });
        state.activeRoomIdByUserId.set(user.id, room.id);
        return sendJson(res, 200, { room: roomPayload(room, 'owner') });
      }

      if (sub === '/rooms' && req.method === 'GET') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const rooms = [...state.rooms.values()]
          .filter((r) => r.membersByUserId.has(user.id))
          .map((r) => roomPayload(r, r.membersByUserId.get(user.id)));
        return sendJson(res, 200, { rooms });
      }

      if (sub === '/rooms/ensure-turn' && req.method === 'POST') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const body = await readJsonBody(req);
        const sala = String(body.sala || 'Sala');
        const turnKey = String(body.turnKey || '').trim() || defaultTurnKey();
        let room = findRoomBySalaTurn(state, sala, turnKey);
        let role;
        if (room) {
          role = room.membersByUserId.get(user.id);
          if (!role) {
            role = 'member';
            room.membersByUserId.set(user.id, role);
          }
        } else {
          room = createRoom(state, user.id, { name: `${sala} ${turnKey}`, sala, turnKey });
          role = 'owner';
        }
        state.activeRoomIdByUserId.set(user.id, room.id);
        return sendJson(res, 200, { room: roomPayload(room, role) });
      }

      if (sub === '/rooms/join' && req.method === 'POST') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const body = await readJsonBody(req);
        const room = findRoomByCode(state, body.code);
        if (!room) return sendError(res, 'not_found', 'Sala no encontrada.');
        const already = room.membersByUserId.has(user.id);
        if (!already) room.membersByUserId.set(user.id, 'member');
        state.activeRoomIdByUserId.set(user.id, room.id);
        return sendJson(res, 200, { room: roomPayload(room, room.membersByUserId.get(user.id)), alreadyMember: already });
      }

      if (sub === '/rooms/active' && req.method === 'GET') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const roomId = state.activeRoomIdByUserId.get(user.id);
        const room = roomId ? state.rooms.get(roomId) : null;
        if (!room) return sendError(res, 'not_found', 'No tienes una sala nube activa.');
        return sendJson(res, 200, { room: roomPayload(room, room.membersByUserId.get(user.id)) });
      }

      const dekMatch = /^\/rooms\/([^/]+)\/dek(\/admin)?(\/rotate)?$/.exec(sub);
      if (dekMatch) {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const room = state.rooms.get(dekMatch[1]);
        if (!room || !room.membersByUserId.has(user.id)) return sendError(res, 'not_member', 'No eres miembro de esta sala.');
        const isAdmin = !!dekMatch[2];
        const field = isAdmin ? 'adminDek' : 'dek';
        if (req.method === 'GET') {
          if (!isAdmin && scenarios.stuckNoKeyRoomCodes.has(room.code)) return sendJson(res, 200, { dek: null });
          return sendJson(res, 200, { dek: room[field] });
        }
        if (req.method === 'PUT') {
          const body = await readJsonBody(req);
          room[field] = { ct: body.ct, iv: body.iv, salt: body.salt };
          return sendJson(res, 200, { ok: true });
        }
      }

      const roomIdMatch = /^\/rooms\/([^/]+)$/.exec(sub);
      if (roomIdMatch && req.method === 'GET') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const room = state.rooms.get(roomIdMatch[1]);
        if (!room || !room.membersByUserId.has(user.id)) return sendError(res, 'not_member', 'No eres miembro de esta sala.');
        return sendJson(res, 200, { room: roomPayload(room, room.membersByUserId.get(user.id)) });
      }

      const leaveMatch = /^\/rooms\/([^/]+)\/leave$/.exec(sub);
      if (leaveMatch && req.method === 'POST') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const room = state.rooms.get(leaveMatch[1]);
        if (!room || !room.membersByUserId.has(user.id)) return sendError(res, 'not_member', 'No eres miembro de esta sala.');
        room.membersByUserId.delete(user.id);
        return sendJson(res, 200, { ok: true });
      }

      const pullMatch = /^\/rooms\/([^/]+)\/pull$/.exec(sub);
      if (pullMatch && req.method === 'GET') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const room = state.rooms.get(pullMatch[1]);
        if (!room || !room.membersByUserId.has(user.id)) return sendError(res, 'not_member', 'No eres miembro de esta sala.');
        await delayIfConfigured(scenarios);
        const since = Number(url.searchParams.get('since') || 0);
        if (since >= room.revision) return sendJson(res, 200, { revision: room.revision, ops: [] });
        const ops = room.ops.filter((op) => op.revision > since).flatMap((op) => op.ops);
        return sendJson(res, 200, { revision: room.revision, ops });
      }

      const mutationsMatch = /^\/rooms\/([^/]+)\/mutations$/.exec(sub);
      if (mutationsMatch && req.method === 'POST') {
        if (!user) return sendError(res, 'auth_required', 'Sesión inválida o expirada.');
        const room = state.rooms.get(mutationsMatch[1]);
        if (!room || !room.membersByUserId.has(user.id)) return sendError(res, 'not_member', 'No eres miembro de esta sala.');
        await delayIfConfigured(scenarios);
        if (scenarios.staleRevisionRoomCodes.has(room.code)) {
          return sendError(res, 'revision_stale', 'Otro dispositivo actualizó la sala al mismo tiempo. Reintenta tras sincronizar.');
        }
        const body = await readJsonBody(req);
        const baseRevision = Number(body.baseRevision || 0);
        const ops = Array.isArray(body.ops) ? body.ops : [];
        room.revision += 1;
        room.updatedAt = new Date().toISOString();
        room.ops.push({ revision: room.revision, ops });
        return sendJson(res, 200, { revision: room.revision, applied: ops, rejected: [], needPull: baseRevision < room.revision - 1 });
      }

      if (sub.startsWith('/admin')) {
        return sendError(res, 'not_implemented', 'Fuera del alcance del modo de pruebas de UI.');
      }

      return sendError(res, 'not_found', 'Ruta no encontrada.');
    } catch (err) {
      return sendError(res, 'error', err && err.message ? err.message : 'mock server error');
    }
  };
}

export function createMockNubeServer({ scenarios, state } = {}) {
  const s = state || createMockNubeState();
  seedFakeTeamsAndRooms(s);
  const server = http.createServer(createRequestHandler(scenarios || loadScenarios(defaultScenarioPath()), s));

  server.on('upgrade', (req, socket) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }
    const m = /^\/api\/sync\/v1\/rooms\/([^/]+)\/live$/.exec(url.pathname);
    const room = m && s.rooms.get(m[1]);
    if (!room || !acceptWsUpgrade(req, socket)) {
      socket.destroy();
      return;
    }
    sendWsText(socket, JSON.stringify({ type: 'hello', revision: room.revision || 0 }));
    readWsMessages(socket, (text) => {
      try {
        const msg = JSON.parse(text);
        if (msg?.type === 'ping') sendWsText(socket, JSON.stringify({ type: 'pong' }));
      } catch {
        /* ignore */
      }
    });
    socket.on('error', () => {});
  });

  return server;
}

function defaultScenarioPath() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'ui-test-fault-scenarios.json');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const portArg = process.argv.find((a) => a.startsWith('--port='));
  const scenariosArg = process.argv.find((a) => a.startsWith('--scenarios='));
  const port = Number(portArg ? portArg.split('=')[1] : process.env.R_PLUS_UI_TEST_MOCK_PORT || 8787);
  const scenarioPath = scenariosArg
    ? scenariosArg.split('=')[1]
    : process.env.R_PLUS_UI_TEST_SCENARIOS || defaultScenarioPath();
  const scenarios = loadScenarios(scenarioPath);
  const server = createMockNubeServer({ scenarios });
  server.listen(port, () => {
    console.log(`Mock Nube listening on http://localhost:${port} (scenarios: ${scenarioPath})`);
  });
}
