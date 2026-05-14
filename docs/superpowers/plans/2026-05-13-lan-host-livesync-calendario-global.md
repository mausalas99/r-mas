# LAN host, LiveSync (salas conocidas) y calendario global — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el diseño en [`docs/superpowers/specs/2026-05-13-lan-host-livesync-calendario-global-design.md`](../specs/2026-05-13-lan-host-livesync-calendario-global-design.md): servidor LAN en la máquina host (REST + WebSocket), lista de salas compartida, relay de mensajes para sesiones N≥2, calendario global con checkbox de material, código de equipo, alta atómica paciente+evento desde cliente, mapeo de ids en cliente, pestaña Calendario independiente con el mismo canal de actualización que otras vistas conectadas, y banner de desconexión con solo lectura remota en v1.

**Architecture:** Extender el `http.Server` existente en `server.js` (puerto 3738) con rutas bajo `/api/lan/v1/*`, CORS para orígenes `http://localhost:3738` y `http://127.0.0.1:3738`, y `WebSocketServer` en el mismo puerto para eventos (`calendar`, `rooms`) y relay de sala LiveSync. Persistencia canónica del host en un JSON atómico bajo `userData/lan-squad-host-state.json` (v1; migración a SQLite opcional después). Renderer: nuevo módulo `public/js/lan-client.mjs` (fetch + WebSocket + `EventTarget` para suscriptores), helpers en `storage.js` para `rpc-lan-config` y `rpc-lan-host-patient-map`, UI en `index.html` + handlers en `app.js`. `main.js` define `process.env.R_PLUS_USER_DATA` antes de `require('./server')`.

**Tech Stack:** Electron 41, Express 5, `ws` (nueva dependencia), Node `crypto` / `fs`, vanilla JS ESM en renderer, `node --test`.

**Spec reference:** cubrir secciones Arquitectura, modelo de datos, cliente mapeo, conflictos, flujos 1–5, errores §4, pruebas §5.

---

## File structure (responsabilidades)

| Ruta | Rol |
|------|-----|
| `package.json` | Añadir dependencia `"ws": "^8.18.0"` (o versión actual al ejecutar `npm install ws`). |
| `main.js` | Antes de `require('./server')`, asignar `process.env.R_PLUS_USER_DATA = app.getPath('userData')`. |
| `server.js` | Crear `http.Server` con Express; montar router LAN; CORS; `WebSocketServer`; exportar misma Promise de cierre. |
| `lan-squad/team-code.js` | Hash SHA-256 del código de equipo + comparación en tiempo constante. |
| `lan-squad/host-store.js` | Lectura/escritura atómica del estado; CRUD pacientes/salas/eventos; `createPatientAndCalendarEvent` transaccional en memoria + un solo `save`. |
| `lan-squad/host-router.js` | `express.Router()` con middleware de código de equipo y rutas REST. |
| `lan-squad/ws-hub.js` | Adjuntar `WebSocketServer`; autenticar query `?code=`; rooms `calendar`, `rooms`, `live:{roomId}`; broadcast JSON. |
| `lan-squad/host-store.test.js` | Tests Node del store (tmp dir). |
| `public/js/lan-client.mjs` | URL base, headers, reconexión WS, `addEventListener('lan-patch', ...)`. |
| `public/js/storage.js` | `getLanConfig`, `saveLanConfig`, `getHostPatientMap`, `saveHostPatientMap`. |
| `public/js/lan-client.test.mjs` | Tests de parseo de mensajes WS (sin red). |
| `public/index.html` | Pestañas `apptab-lan`, `apptab-calendario`; contenedores; banner `#lan-connection-banner`. |
| `public/js/app.js` | `switchAppTab` extendido; render calendario; conectar `lan-client`; deshabilitar mutaciones remotas si `!connected`. |
| `preload.js` | Si hace falta exponer lectura de envío seguro a LAN, preferir solo fetch desde renderer a URL configurada (misma red); evitar nuevas superficies IPC salvo necesidad. |

---

### Task 1: Dependencia `ws` y variable de entorno `R_PLUS_USER_DATA`

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `main.js` (inside `app.whenReady`, antes de `require('./server')`)

- [ ] **Step 1: Añadir `ws` en package.json**

En `package.json`, dentro de `"dependencies"`, añadir:

```json
"ws": "^8.18.0"
```

- [ ] **Step 2: Instalar**

Run:

```bash
cd /Users/mauriciosalas/R+ && npm install
```

Expected: `package-lock.json` actualizado; carpeta `node_modules/ws` presente.

- [ ] **Step 3: Establecer `R_PLUS_USER_DATA` en main.js**

Localizar el bloque:

```javascript
app.whenReady().then(async () => {
  try {
    server = await require('./server');
```

Sustituir por:

```javascript
app.whenReady().then(async () => {
  try {
    process.env.R_PLUS_USER_DATA = app.getPath('userData');
    server = await require('./server');
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json main.js
git commit -m "chore: ws dependency and R_PLUS_USER_DATA for LAN host"
```

---

### Task 2: Módulo `lan-squad/team-code.js` (hash y verificación)

**Files:**
- Create: `lan-squad/team-code.js`
- Create: `lan-squad/team-code.test.js`

- [ ] **Step 1: Escribir test que falla**

Create `lan-squad/team-code.test.js`:

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { hashTeamCode, verifyTeamCode } = require('./team-code.js');

describe('team-code', () => {
  it('verifyTeamCode acepta el mismo código', () => {
    const stored = hashTeamCode('mi-equipo-2026');
    assert.strictEqual(verifyTeamCode('mi-equipo-2026', stored), true);
    assert.strictEqual(verifyTeamCode('otro', stored), false);
  });
});
```

Run:

```bash
node --test lan-squad/team-code.test.js
```

Expected: FAIL (`Cannot find module` o export faltante).

- [ ] **Step 2: Implementar `lan-squad/team-code.js`**

```javascript
'use strict';
const crypto = require('node:crypto');

const PREFIX = 'lan-squad-v1';

function hashTeamCode(plain) {
  return crypto.createHash('sha256').update(PREFIX + String(plain || ''), 'utf8').digest('hex');
}

function verifyTeamCode(plain, storedHash) {
  const a = hashTeamCode(plain);
  const b = String(storedHash || '');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

module.exports = { hashTeamCode, verifyTeamCode };
```

- [ ] **Step 3: Ejecutar test**

Run:

```bash
node --test lan-squad/team-code.test.js
```

Expected: PASS.

- [ ] **Step 4: Añadir test al script npm (opcional pero recomendado)**

En `package.json`, en el script `test`, concatenar:

```
lan-squad/team-code.test.js lan-squad/host-store.test.js
```

(después de crear Task 3 el archivo `host-store.test.js`; si aún no existe, añadir solo `team-code.test.js` en este commit y ampliar en Task 3).

- [ ] **Step 5: Commit**

```bash
git add lan-squad/team-code.js lan-squad/team-code.test.js package.json
git commit -m "feat(lan): team code hash and timing-safe verify"
```

---

### Task 3: `lan-squad/host-store.js` y tests de persistencia atómica

**Files:**
- Create: `lan-squad/host-store.js`
- Create: `lan-squad/host-store.test.js`

- [ ] **Step 1: Test — estado inicial y paciente+evento atómico**

Create `lan-squad/host-store.test.js`:

```javascript
'use strict';
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHostStore } = require('./host-store.js');

describe('host-store', () => {
  let dir;
  let filePath;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-host-'));
    filePath = path.join(dir, 'state.json');
  });

  it('createHostStore inicializa teamCodeHash y listas vacías', () => {
    const { hashTeamCode } = require('./team-code.js');
    const store = createHostStore({ filePath, teamCodePlain: 'abc' });
    const st = store.getState();
    assert.strictEqual(st.patients.length, 0);
    assert.strictEqual(st.rooms.length, 0);
    assert.strictEqual(st.calendarEvents.length, 0);
    assert.strictEqual(st.teamCodeHash, hashTeamCode('abc'));
  });

  it('createPatientAndCalendarEvent persiste ambos o ninguno', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'x' });
    const patient = {
      id: 'client-local-1',
      nombre: 'Test',
      registro: 'R1',
      edad: '40',
      sexo: 'M',
      area: '',
      servicio: '',
      cuarto: '',
      cama: '',
      fromLab: false,
    };
    const ev = {
      start: '2026-05-13T10:00:00.000Z',
      end: '2026-05-13T11:00:00.000Z',
      procedure: 'Cateterismo',
      location: 'Hemodinamia',
      materialReady: false,
    };
    const out = store.createPatientAndCalendarEvent({ patient, event: ev, clientPatientId: 'client-local-1' });
    assert.ok(out.hostPatientId && out.hostPatientId !== 'client-local-1');
    assert.ok(out.event.id);
    const st = store.getState();
    assert.strictEqual(st.patients.length, 1);
    assert.strictEqual(st.calendarEvents.length, 1);
    assert.strictEqual(st.calendarEvents[0].patientId, out.hostPatientId);
  });
});
```

Run:

```bash
node --test lan-squad/host-store.test.js
```

Expected: FAIL.

- [ ] **Step 2: Implementar `lan-squad/host-store.js`**

```javascript
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { hashTeamCode } = require('./team-code.js');

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 0), 'utf8');
  fs.renameSync(tmp, filePath);
}

function readState(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') throw new Error('bad shape');
    return o;
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function defaultState(teamCodeHash) {
  return {
    version: 1,
    teamCodeHash,
    patients: [],
    rooms: [],
    calendarEvents: [],
  };
}

function createHostStore({ filePath, teamCodePlain }) {
  const teamCodeHash = hashTeamCode(teamCodePlain);
  if (!fs.existsSync(filePath)) {
    atomicWriteJson(filePath, defaultState(teamCodeHash));
  }

  function load() {
    const s = readState(filePath);
    if (!s) {
      atomicWriteJson(filePath, defaultState(teamCodeHash));
      return defaultState(teamCodeHash);
    }
    if (s.teamCodeHash !== teamCodeHash) {
      throw new Error('team code mismatch for existing host file');
    }
    s.patients = Array.isArray(s.patients) ? s.patients : [];
    s.rooms = Array.isArray(s.rooms) ? s.rooms : [];
    s.calendarEvents = Array.isArray(s.calendarEvents) ? s.calendarEvents : [];
    return s;
  }

  function save(state) {
    atomicWriteJson(filePath, state);
  }

  function getState() {
    return load();
  }

  function createPatientAndCalendarEvent({ patient, event, clientPatientId }) {
    const state = load();
    const hostPatientId = newId('hp');
    const t = nowIso();
    const p = {
      ...patient,
      id: hostPatientId,
      clientOriginId: String(clientPatientId || ''),
      version: 1,
      updatedAt: t,
    };
    const evId = newId('ev');
    const cal = {
      id: evId,
      patientId: hostPatientId,
      start: String(event.start || ''),
      end: String(event.end || ''),
      procedure: String(event.procedure || ''),
      location: String(event.location || ''),
      materialReady: !!event.materialReady,
      createdAt: t,
      updatedAt: t,
      version: 1,
    };
    if (!cal.start || !cal.procedure) {
      throw new Error('invalid event: start and procedure required');
    }
    state.patients.push(p);
    state.calendarEvents.push(cal);
    save(state);
    return { hostPatientId, event: cal };
  }

  function upsertPatient(patient, expectedVersion) {
    const state = load();
    const idx = state.patients.findIndex((p) => p.id === patient.id);
    const t = nowIso();
    if (idx === -1) {
      const p = { ...patient, version: 1, updatedAt: t };
      state.patients.push(p);
      save(state);
      return p;
    }
    const cur = state.patients[idx];
    if (expectedVersion != null && Number(cur.version) !== Number(expectedVersion)) {
      const err = new Error('conflict');
      err.code = 'CONFLICT';
      err.serverPatient = cur;
      throw err;
    }
    const next = { ...cur, ...patient, version: Number(cur.version || 1) + 1, updatedAt: t };
    state.patients[idx] = next;
    save(state);
    return next;
  }

  function listCalendarEvents() {
    return load().calendarEvents.slice();
  }

  function patchCalendarEvent(id, patch, expectedVersion) {
    const state = load();
    const idx = state.calendarEvents.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('not found');
    const cur = state.calendarEvents[idx];
    if (expectedVersion != null && Number(cur.version) !== Number(expectedVersion)) {
      const err = new Error('conflict');
      err.code = 'CONFLICT';
      err.serverEvent = cur;
      throw err;
    }
    const t = nowIso();
    const next = { ...cur, ...patch, version: Number(cur.version || 1) + 1, updatedAt: t };
    state.calendarEvents[idx] = next;
    save(state);
    return next;
  }

  function listRooms() {
    return load().rooms.slice();
  }

  function createRoom(displayName) {
    const state = load();
    const r = { id: newId('room'), displayName: String(displayName || 'Sala'), createdAt: nowIso() };
    state.rooms.push(r);
    save(state);
    return r;
  }

  function renameRoom(id, displayName) {
    const state = load();
    const r = state.rooms.find((x) => x.id === id);
    if (!r) throw new Error('room not found');
    r.displayName = String(displayName || r.displayName);
    save(state);
    return r;
  }

  function deleteRoom(id) {
    const state = load();
    state.rooms = state.rooms.filter((x) => x.id !== id);
    save(state);
  }

  return {
    getState,
    createPatientAndCalendarEvent,
    upsertPatient,
    listCalendarEvents,
    patchCalendarEvent,
    listRooms,
    createRoom,
    renameRoom,
    deleteRoom,
  };
}

module.exports = { createHostStore, atomicWriteJson };
```

- [ ] **Step 3: Ejecutar tests**

Run:

```bash
node --test lan-squad/host-store.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lan-squad/host-store.js lan-squad/host-store.test.js package.json
git commit -m "feat(lan): host JSON store with atomic patient+calendar create"
```

---

### Task 4: `lan-squad/host-router.js` (REST + middleware de código)

**Files:**
- Create: `lan-squad/host-router.js`

- [ ] **Step 1: Implementar router**

```javascript
'use strict';
const express = require('express');
const { verifyTeamCode } = require('./team-code.js');

function teamCodeMiddleware(getState) {
  return (req, res, next) => {
    const code = req.get('x-lan-team-code') || req.query.code || '';
    const st = getState();
    if (!verifyTeamCode(code, st.teamCodeHash)) {
      return res.status(401).json({ error: 'invalid team code' });
    }
    next();
  };
}

function createLanRouter({ store, broadcast }) {
  const r = express.Router();
  const getState = () => store.getState();

  r.get('/ping', (_req, res) => {
    res.json({ ok: true, lan: true });
  });

  r.use(teamCodeMiddleware(getState));

  r.get('/patients', (_req, res) => {
    res.json({ patients: store.getState().patients });
  });

  r.put('/patients/:id', express.json({ limit: '2mb' }), (req, res) => {
    try {
      const expected = req.body && req.body.expectedVersion != null ? Number(req.body.expectedVersion) : null;
      const body = { ...req.body };
      delete body.expectedVersion;
      body.id = req.params.id;
      const out = store.upsertPatient(body, expected);
      broadcast('calendar', { type: 'patients-updated' });
      res.json({ patient: out });
    } catch (e) {
      if (e.code === 'CONFLICT') return res.status(409).json({ error: 'conflict', patient: e.serverPatient });
      res.status(400).json({ error: e.message });
    }
  });

  r.post('/patients-with-event', express.json({ limit: '2mb' }), (req, res) => {
    try {
      const { patient, event, clientPatientId } = req.body || {};
      const out = store.createPatientAndCalendarEvent({ patient, event, clientPatientId });
      broadcast('calendar', { type: 'calendar-changed' });
      res.status(201).json(out);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.get('/calendar-events', (_req, res) => {
    res.json({ events: store.listCalendarEvents() });
  });

  r.patch('/calendar-events/:id', express.json({ limit: '512kb' }), (req, res) => {
    try {
      const expected = req.body && req.body.expectedVersion != null ? Number(req.body.expectedVersion) : null;
      const patch = { ...req.body };
      delete patch.expectedVersion;
      const out = store.patchCalendarEvent(req.params.id, patch, expected);
      broadcast('calendar', { type: 'calendar-changed', eventId: out.id });
      res.json({ event: out });
    } catch (e) {
      if (e.code === 'CONFLICT') return res.status(409).json({ error: 'conflict', event: e.serverEvent });
      res.status(400).json({ error: e.message });
    }
  });

  r.get('/rooms', (_req, res) => {
    res.json({ rooms: store.listRooms() });
  });

  r.post('/rooms', express.json(), (req, res) => {
    const row = store.createRoom(req.body && req.body.displayName);
    broadcast('rooms', { type: 'rooms-changed' });
    res.status(201).json({ room: row });
  });

  r.patch('/rooms/:id', express.json(), (req, res) => {
    const row = store.renameRoom(req.params.id, req.body && req.body.displayName);
    broadcast('rooms', { type: 'rooms-changed' });
    res.json({ room: row });
  });

  r.delete('/rooms/:id', (req, res) => {
    store.deleteRoom(req.params.id);
    broadcast('rooms', { type: 'rooms-changed' });
    res.json({ ok: true });
  });

  return r;
}

module.exports = { createLanRouter, teamCodeMiddleware };
```

- [ ] **Step 2: Commit**

```bash
git add lan-squad/host-router.js
git commit -m "feat(lan): REST router for patients, calendar, rooms"
```

---

### Task 5: `lan-squad/ws-hub.js` y cableado en `server.js`

**Files:**
- Create: `lan-squad/ws-hub.js`
- Modify: `server.js`

- [ ] **Step 1: Crear `lan-squad/ws-hub.js`**

```javascript
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
```

- [ ] **Step 2: Modificar `server.js` — http.Server, CORS, LAN**

Al inicio, después de `const express = require('express');`, añadir:

```javascript
const http = require('node:http');
const path = require('path');
const fs = require('fs');
const { createHostStore } = require('./lan-squad/host-store.js');
const { createLanRouter } = require('./lan-squad/host-router.js');
const { attachWsHub } = require('./lan-squad/ws-hub.js');
```

CORS (antes de `appExpress.use(express.static(...))`):

```javascript
appExpress.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && (/^http:\/\/localhost:3738\/?$/i.test(o) || /^http:\/\/127\.0\.0\.1:3738\/?$/i.test(o))) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Lan-Team-Code');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
```

Sustituir el final `appExpress.listen` por lógica equivalente a:

```javascript
const PORT = 3738;
const userData = process.env.R_PLUS_USER_DATA || require('node:os').tmpdir();
const lanStatePath = path.join(userData, 'lan-squad-host-state.json');
const LAN_TEAM_CODE = process.env.R_PLUS_LAN_TEAM_CODE || 'change-me-in-profile';
const lanStore = createHostStore({ filePath: lanStatePath, teamCodePlain: LAN_TEAM_CODE });

const httpServer = http.createServer(appExpress);
const { broadcast } = attachWsHub(httpServer, { getState: () => lanStore.getState() });
appExpress.use('/api/lan/v1', createLanRouter({ store: lanStore, broadcast }));

const server = httpServer.listen(PORT, () => {
  console.log(`R+ → http://localhost:${PORT}`);
});
```

Eliminar la línea previa `const server = appExpress.listen(PORT, ...)`.

Mantener `module.exports = new Promise(...)` apuntando a `server` del `httpServer`.

**Nota:** `LAN_TEAM_CODE` debe leerse en implementación real desde preferencias guardadas (IPC / archivo); el plan fija env `R_PLUS_LAN_TEAM_CODE` para desarrollo hasta conectar UI de “Mi perfil” o modal de host.

- [ ] **Step 3: Arranque manual**

Run:

```bash
R_PLUS_LAN_TEAM_CODE=testteam npm start
```

Abrir `http://localhost:3738/api/lan/v1/ping` en navegador → `{"ok":true,"lan":true}` (sin código).

Probar con header (curl):

```bash
curl -s -H "X-Lan-Team-Code: testteam" http://localhost:3738/api/lan/v1/rooms
```

Expected: JSON `{"rooms":[]}` o lista.

- [ ] **Step 4: Commit**

```bash
git add lan-squad/ws-hub.js server.js
git commit -m "feat(lan): http server, CORS, LAN REST and WebSocket hub"
```

---

### Task 6: `public/js/storage.js` — config y mapa de ids

**Files:**
- Modify: `public/js/storage.js`
- Modify: `public/js/storage.test.mjs`

- [ ] **Step 1: Test fallando para `getLanConfig` / `saveLanConfig`**

En `public/js/storage.test.mjs`, añadir un `describe('lan config', ...)` que llame `storage.saveLanConfig({ hostUrl: 'http://192.168.1.10:3738', teamCode: 'x' })` y lea con `getLanConfig` igual. Expected inicialmente FAIL si métodos no existen.

- [ ] **Step 2: Implementar métodos**

Añadir a `export const storage`:

```javascript
  getLanConfig() {
    return safeParse(localStorage.getItem('rpc-lan-config'), null) || null;
  },
  saveLanConfig(cfg) {
    if (!cfg) {
      localStorage.removeItem('rpc-lan-config');
      return;
    }
    localStorage.setItem('rpc-lan-config', JSON.stringify(cfg));
  },
  getHostPatientMap() {
    return safeParseObject(localStorage.getItem('rpc-lan-host-patient-map'));
  },
  saveHostPatientMap(map) {
    localStorage.setItem('rpc-lan-host-patient-map', JSON.stringify(map || {}));
  },
```

- [ ] **Step 3: `npm test`**

Expected: todos los tests pasan incluyendo el nuevo bloque.

- [ ] **Step 4: Commit**

```bash
git add public/js/storage.js public/js/storage.test.mjs
git commit -m "feat(lan): storage for LAN config and host patient map"
```

---

### Task 7: `public/js/lan-client.mjs` (fetch + WebSocket + eventos)

**Files:**
- Create: `public/js/lan-client.mjs`
- Create: `public/js/lan-client.test.mjs`

- [ ] **Step 1: Test de función pura `parseWsPayload`**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseWsPayload } from './lan-client.mjs';

describe('lan-client parseWsPayload', () => {
  it('parses valid json', () => {
    assert.deepStrictEqual(parseWsPayload('{"a":1}'), { a: 1 });
  });
  it('returns null on bad', () => {
    assert.strictEqual(parseWsPayload('not-json'), null);
  });
});
```

Exportar en `lan-client.mjs`:

```javascript
export function parseWsPayload(s) {
  try {
    return JSON.parse(String(s));
  } catch {
    return null;
  }
}
```

Run:

```bash
node --test public/js/lan-client.test.mjs
```

Añadir archivo al script `test` en `package.json`.

- [ ] **Step 2: Clase `LanClient`**

En el mismo `lan-client.mjs`, implementar:

```javascript
export class LanClient extends EventTarget {
  constructor() {
    super();
    this._ws = null;
    this._cfg = null;
    this._connected = false;
  }

  get connected() {
    return this._connected;
  }

  configure(cfg) {
    this._cfg = cfg;
  }

  baseUrl() {
    const c = this._cfg;
    if (!c || !c.hostUrl) return '';
    return String(c.hostUrl).replace(/\/$/, '');
  }

  async fetch(path, opts = {}) {
    const url = `${this.baseUrl()}${path}`;
    const headers = { ...(opts.headers || {}), 'X-Lan-Team-Code': this._cfg.teamCode };
    const r = await fetch(url, { ...opts, headers });
    return r;
  }

  connectCalendarChannel() {
    this._openWs('calendar');
  }

  connectLiveChannel(roomId) {
    this._openWs(`live:${encodeURIComponent(roomId)}`);
  }

  _openWs(channel) {
    if (this._ws) {
      try { this._ws.close(); } catch (_e) { /* ignore */ }
    }
    const base = this.baseUrl().replace(/^http/, 'ws');
    const code = encodeURIComponent(this._cfg.teamCode || '');
    const u = `${base}/api/lan/v1/ws?code=${code}&channel=${encodeURIComponent(channel)}`;
    this._ws = new WebSocket(u);
    this._ws.onopen = () => {
      this._connected = true;
      this.dispatchEvent(new CustomEvent('lan-status', { detail: { connected: true } }));
    };
    this._ws.onclose = () => {
      this._connected = false;
      this.dispatchEvent(new CustomEvent('lan-status', { detail: { connected: false } }));
    };
    this._ws.onmessage = (ev) => {
      const data = parseWsPayload(ev.data);
      if (data) this.dispatchEvent(new CustomEvent('lan-patch', { detail: data }));
    };
  }

  disconnect() {
    if (this._ws) {
      try { this._ws.close(); } catch (_e) { /* ignore */ }
      this._ws = null;
    }
    this._connected = false;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add public/js/lan-client.mjs public/js/lan-client.test.mjs package.json
git commit -m "feat(lan): renderer LanClient with WS and fetch"
```

---

### Task 8: UI — pestañas LiveSync y Calendario + banner en `index.html`

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Banner bajo cabecera**

Después del elemento que contiene `#app-brand` o al inicio del área principal, añadir:

```html
<div id="lan-connection-banner" role="status" aria-live="polite" style="display:none;padding:8px 16px;background:#7c2d12;color:#fff;font-size:13px;"></div>
```

- [ ] **Step 2: Pestañas en `.app-tabs`**

Tras el último `<button class="app-tab" ...>`, añadir dos botones siguiendo el mismo patrón `onclick="switchAppTab('lan')"` y `switchAppTab('calendario')`, con `id="apptab-lan"` y `id="apptab-calendario"`.

- [ ] **Step 3: Contenedores `tab-content`**

Añadir al mismo nivel que otros `id="tab-content-..."`:

```html
<div id="tab-content-lan" class="tab-content" style="display:none;">
  <div id="lan-panel-root"></div>
</div>
<div id="tab-content-calendario" class="tab-content" style="display:none;">
  <div id="calendario-panel-root"></div>
</div>
```

Ajustar visibilidad según el patrón existente de `switchAppTab` (clase `active` y `display`).

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat(lan): app tabs and banner for LAN and calendar"
```

---

### Task 9: `app.js` — `switchAppTab`, render mínimo, conexión `LanClient`

**Files:**
- Modify: `public/js/app.js`

- [ ] **Step 1: Import**

```javascript
import { LanClient } from './lan-client.mjs';
```

- [ ] **Step 2: Instancia global y arranque**

```javascript
var lanClient = new LanClient();
if (typeof storage.getLanConfig === 'function') {
  var _lc = storage.getLanConfig();
  if (_lc && _lc.hostUrl) {
    lanClient.configure(_lc);
    try {
      lanClient.connectCalendarChannel();
    } catch (_e) { /* ignore */ }
  }
}
lanClient.addEventListener('lan-status', function (ev) {
  var el = document.getElementById('lan-connection-banner');
  if (!el) return;
  if (ev.detail && ev.detail.connected) {
    el.style.display = 'none';
    el.textContent = '';
  } else {
    el.style.display = 'block';
    el.textContent = 'Sin conexión al servidor de sala (LAN). Calendario remoto en solo lectura.';
  }
});
lanClient.addEventListener('lan-patch', function () {
  if (typeof renderCalendarioPanel === 'function') renderCalendarioPanel();
});
```

- [ ] **Step 3: Extender `switchAppTab`**

En la función existente, añadir ramas `'lan'` y `'calendario'` que activen `#tab-content-lan` / `#tab-content-calendario` y botones `apptab-lan` / `apptab-calendario`, y llamen `renderLanPanel()` / `renderCalendarioPanel()` (definir si no existen).

- [ ] **Step 4: `renderLanPanel`** — lista de salas desde host

Implementar `async function renderLanPanel()` que si `!lanClient.baseUrl()` muestre formulario “URL del host”, “Código de equipo”, botón Guardar que hace `storage.saveLanConfig`, `lanClient.configure`, `lanClient.connectCalendarChannel()`. Si hay URL, `GET /api/lan/v1/rooms` con `lanClient.fetch` y renderice lista con botones unirse (guarda `lastRoomId` en localStorage opcional) y crear sala (`POST`).

- [ ] **Step 5: `renderCalendarioPanel`**

`GET /api/lan/v1/calendar-events` y tabla: procedimiento, lugar, material (checkbox solo si `lanClient.connected`), paciente (mostrar `patientId` hasta resolver nombre vía mapa o segunda petición `GET /patients`).

Al cambiar checkbox: `PATCH /api/lan/v1/calendar-events/:id` con `expectedVersion` y `materialReady`.

Si `!lanClient.connected`, no enviar PATCH; mostrar estado deshabilitado.

- [ ] **Step 6: Flujo cliente “nuevo paciente + procedimiento”**

Botón en panel calendario que abre flujo reutilizando validación `validatePatientForSave` de `patient-validation.mjs` y luego `POST /api/lan/v1/patients-with-event` con cuerpo `{ patient, event, clientPatientId }`. En éxito: `storage.saveHostPatientMap` merge `{ [clientPatientId]: hostPatientId }` y opcionalmente insertar/actualizar paciente local en `patients` con id del host si la política de producto es reemplazar copia local (definir en código: **recomendación** — actualizar entrada local con `id = hostPatientId` y fusionar campos recibidos).

- [ ] **Step 7: Commit**

```bash
git add public/js/app.js
git commit -m "feat(lan): wire LanClient, LAN and calendar panels"
```

---

### Task 10: LiveSync N≥2 — relay de mensajes en canal `live:{roomId}`

**Files:**
- Modify: `lan-squad/ws-hub.js` (si hace falta eco a remitente; por defecto el broadcast a todos en sala incluye emisor — aceptable para signaling)
- Modify: `public/js/app.js`

- [ ] **Step 1: En `renderLanPanel`, al unirse a sala**

Llamar `lanClient.connectLiveChannel(room.id)` y mostrar consola o área de texto mínima “conectado a sala X”; enviar mensajes de prueba `ws.send(JSON.stringify({ type: 'ping', from: 'me' }))` desde input de depuración opcional (solo si `process.env.NODE_ENV` no aplica en renderer — usar flag oculto `localStorage`).

- [ ] **Step 2: Integración futura**

Documentar en comentario en `app.js` que los mensajes `live:{roomId}` son el canal donde el motor LiveSync existente (rama `beta/live-sync`) debe colgar signaling/CRDT; v1 solo garantiza broadcast JSON entre pares en la misma sala.

- [ ] **Step 3: Commit**

```bash
git add public/js/app.js lan-squad/ws-hub.js
git commit -m "feat(lan): live room WebSocket channel for multi-peer"
```

---

### Task 11: Exponer configuración del código de equipo del **host** en UI

**Files:**
- Modify: `public/js/app.js` y/o modal de perfil en `index.html`

Hoy el servidor usa `R_PLUS_LAN_TEAM_CODE`. Implementar lectura de `rpc-lan-host-settings` en `localStorage` solo en la máquina host no basta porque el servidor Node no lee localStorage. **Opción mínima del plan:** archivo `lan-team-code.txt` en `userData` leído por `server.js` al arranque con `fs.readFileSync` opcional; si existe, sustituye `LAN_TEAM_CODE`. Paso IPC desde renderer: `ipcMain.handle('lan-host-write-team-code', ...)` en `main.js` que escribe ese archivo y el usuario reinicia R+ **o** hot-reload del store (más trabajo). **Recomendación v1:** IPC `lan-host-set-team-code` que escribe `path.join(userData, 'lan-team-code.txt')` y muestra toast “Reinicia R+ para aplicar en el servidor”.

- [ ] **Step 1: `main.js` — handler IPC**

```javascript
const fs = require('fs');
const path = require('path');
ipcMain.handle('lan-host-write-team-code', (_e, plain) => {
  const dir = app.getPath('userData');
  fs.writeFileSync(path.join(dir, 'lan-team-code.txt'), String(plain || ''), 'utf8');
  return { ok: true };
});
```

- [ ] **Step 2: `server.js` — leer archivo si existe**

Antes de `createHostStore`:

```javascript
let LAN_TEAM_CODE = process.env.R_PLUS_LAN_TEAM_CODE || 'change-me-in-profile';
try {
  const p = path.join(userData, 'lan-team-code.txt');
  if (fs.existsSync(p)) {
    const t = fs.readFileSync(p, 'utf8').trim();
    if (t) LAN_TEAM_CODE = t;
  }
} catch (_e) { /* keep default */ }
```

- [ ] **Step 3: `preload.js` + UI mínima en panel LAN en host**

Exponer `writeLanTeamCode` solo si se desea; alternativamente formulario en panel LAN que en máquina local use `fetch` a endpoint `POST /api/lan/v1/bootstrap-team-code` **no** incluido por seguridad. **Mejor:** solo IPC + toast reinicio (sin nuevo endpoint público).

- [ ] **Step 4: Commit**

```bash
git add main.js preload.js public/js/app.js
git commit -m "feat(lan): persist host team code via userData file and IPC"
```

(Ajustar `preload.js` solo si realmente se expone la API.)

---

### Task 12: Documentación operativa corta y checklist manual

**Files:**
- Create: `docs/LAN-SQUAD.md` (opcional; si el usuario prefiere no nuevos markdown, pegar checklist al final del spec — **preferencia usuario: no docs extra** → omitir archivo nuevo y añadir sección “Operación” al final del **spec** existente en un commit aparte, o solo comentario en PR; para cumplir verificación sin markdown nuevo, añadir comentario de 10 líneas en `server.js` encima de LAN con instrucciones firewall.)

- [ ] **Step 1: Comentario en `server.js`**

Bloque comentario: puerto 3738, abrir en firewall; URL clientes `http://<IP-LAN>:3738`; variable `R_PLUS_LAN_TEAM_CODE`.

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "docs(lan): inline operator notes for LAN squad"
```

---

## Self-review (plan vs spec)

| Requisito spec | Tarea |
|------------------|--------|
| Host LAN único | Tasks 5, 11 |
| Lista salas compartida + CRUD cualquier miembro | Tasks 3, 4, 9 |
| Primera vez link / luego elegir sala | Task 9 UI |
| N > 2 mismo flujo | Task 10 WS `live:{roomId}` |
| Pestaña Calendario independiente + mismo refresh WS | Tasks 8, 7, 9 |
| Evento con procedimiento, lugar, material checkbox | Tasks 3, 4, 9 |
| Código de equipo | Tasks 2, 4, 5, 11 |
| Cliente alta paciente completo + evento atómico | Task 3 + ruta `POST /patients-with-event` Task 4 |
| Mapeo local ↔ host | Task 6 + Task 9 |
| Host caído solo lectura remota | Task 7 status + Task 9 PATCH guard |
| Conflictos 409 paciente | Tasks 3–4 |
| Conflictos eventos LWW/version | Task 3 `patchCalendarEvent` + Task 9 |
| Pruebas unitarias | Tasks 2, 3, 7 |
| Regresión modo sin LAN | Sin `rpc-lan-config`, pestañas muestran formulario vacío; no romper flujos existentes |

**Placeholder scan:** ningún `TBD` intencional; `LAN_TEAM_CODE` documentado como env + archivo + reinicio.

**Consistencia:** headers `X-Lan-Team-Code` en REST; query `code` en WebSocket; mismo valor que usuario guarda en `rpc-lan-config.teamCode`.

---

## Execution handoff

**Plan completo guardado en** `docs/superpowers/plans/2026-05-13-lan-host-livesync-calendario-global.md`.

**Dos opciones de ejecución:**

1. **Subagent-Driven (recomendado)** — Un subagente fresco por task, revisión entre tasks, iteración rápida.  
2. **Inline Execution** — Ejecutar tasks en esta sesión con executing-plans y checkpoints de revisión.

**¿Cuál prefieres?**
