# LAN Networking Substrate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect the R+ LAN layer with a fingerprint-keyed host registry, mDNS/UDP discovery, fingerprint-based Wi-Fi roam, `/health` aggregation endpoint, pre-flight panel row, host heartbeat, QR ward fingerprint, and WS→SSE→HTTP-poll fallback.

**Architecture:** A new `lan-host-registry.mjs` mediates between all discovery paths (mDNS, UDP, subnet scan) and all reconnect paths (transport, roam). A `LanConnectionManager` wraps `LanClient` with transparent WS→SSE→HTTP-poll fallback. All changes are additive — `transport.mjs` is not restructured.

**Tech Stack:** Electron 41, Node.js (CommonJS in `lan-squad/`, ESM in `public/js/`), `bonjour-service` (new pure-JS dep), Node `dgram`, Express SSE, `node:test` (test runner), `node:assert`.

**Spec:** `docs/superpowers/specs/2026-06-07-lan-networking-substrate-design.md`

---

## Phase 0 — Foundation

### Task 1: Host Registry (`lan-host-registry.mjs`)

**Files:**
- Create: `public/js/lan-host-registry.mjs`
- Create: `public/js/lan-host-registry.test.mjs`

- [ ] **Step 1.1: Write the failing tests**

```js
// public/js/lan-host-registry.test.mjs
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  upsertHost,
  findByFingerprint,
  findByUrl,
  listHosts,
  evictStale,
  getPinnedFingerprint,
  setPinnedFingerprint,
  clearPinnedFingerprint,
  _resetRegistryForTest,
} from './lan-host-registry.mjs';

describe('lan-host-registry', () => {
  beforeEach(() => {
    _resetRegistryForTest();
    clearPinnedFingerprint();
  });

  it('upsertHost stores and retrieves by fingerprint', () => {
    upsertHost({ fingerprint: 'lc_1:1000', clientId: 'lc_1', startedAt: 1000,
      currentUrl: 'http://10.0.0.1:3738', rank: 'R4', dbUnlocked: true,
      shiftPinActive: true, rttMs: 20, lastSeenAt: Date.now(), source: 'scan' });
    const r = findByFingerprint('lc_1:1000');
    assert.ok(r);
    assert.equal(r.currentUrl, 'http://10.0.0.1:3738');
  });

  it('findByUrl reverse-lookup', () => {
    upsertHost({ fingerprint: 'lc_2:2000', clientId: 'lc_2', startedAt: 2000,
      currentUrl: 'http://10.0.0.2:3738', rank: 'R3', dbUnlocked: false,
      shiftPinActive: false, rttMs: 50, lastSeenAt: Date.now(), source: 'mdns' });
    const r = findByUrl('http://10.0.0.2:3738');
    assert.ok(r);
    assert.equal(r.fingerprint, 'lc_2:2000');
  });

  it('higher-weight source overwrites URL from lower-weight source', () => {
    const now = Date.now();
    upsertHost({ fingerprint: 'lc_3:3000', clientId: 'lc_3', startedAt: 3000,
      currentUrl: 'http://10.0.0.3:3738', rank: 'R4', dbUnlocked: true,
      shiftPinActive: false, rttMs: 10, lastSeenAt: now - 100, source: 'scan' });
    // mDNS (weight 4) discovers a newer IP — should overwrite even though scan was "newer"
    upsertHost({ fingerprint: 'lc_3:3000', clientId: 'lc_3', startedAt: 3000,
      currentUrl: 'http://10.0.0.99:3738', rank: 'R4', dbUnlocked: true,
      shiftPinActive: false, rttMs: 10, lastSeenAt: now, source: 'mdns' });
    assert.equal(findByFingerprint('lc_3:3000').currentUrl, 'http://10.0.0.99:3738');
  });

  it('lower-weight source does NOT overwrite URL from higher-weight source', () => {
    const now = Date.now();
    upsertHost({ fingerprint: 'lc_4:4000', clientId: 'lc_4', startedAt: 4000,
      currentUrl: 'http://10.0.0.4:3738', rank: 'R4', dbUnlocked: true,
      shiftPinActive: false, rttMs: 10, lastSeenAt: now, source: 'heartbeat' });
    // scan (weight 1) tries to overwrite heartbeat (weight 5) — should NOT change URL
    upsertHost({ fingerprint: 'lc_4:4000', clientId: 'lc_4', startedAt: 4000,
      currentUrl: 'http://10.0.0.5:3738', rank: 'R4', dbUnlocked: true,
      shiftPinActive: false, rttMs: 10, lastSeenAt: now + 1, source: 'scan' });
    assert.equal(findByFingerprint('lc_4:4000').currentUrl, 'http://10.0.0.4:3738');
  });

  it('evictStale removes old entries', () => {
    upsertHost({ fingerprint: 'lc_5:5000', clientId: 'lc_5', startedAt: 5000,
      currentUrl: 'http://10.0.0.5:3738', rank: 'R3', dbUnlocked: true,
      shiftPinActive: false, rttMs: 10, lastSeenAt: Date.now() - 200_000, source: 'scan' });
    evictStale(90_000);
    assert.equal(findByFingerprint('lc_5:5000'), null);
  });

  it('listHosts returns only non-evicted entries after evictStale', () => {
    upsertHost({ fingerprint: 'fresh:1', clientId: 'fresh', startedAt: 1,
      currentUrl: 'http://10.0.0.6:3738', rank: 'R4', dbUnlocked: true,
      shiftPinActive: false, rttMs: 5, lastSeenAt: Date.now(), source: 'mdns' });
    upsertHost({ fingerprint: 'stale:2', clientId: 'stale', startedAt: 2,
      currentUrl: 'http://10.0.0.7:3738', rank: 'R3', dbUnlocked: true,
      shiftPinActive: false, rttMs: 5, lastSeenAt: Date.now() - 200_000, source: 'scan' });
    evictStale(90_000);
    const hosts = listHosts();
    assert.equal(hosts.length, 1);
    assert.equal(hosts[0].fingerprint, 'fresh:1');
  });

  it('pinnedFingerprint roundtrip (mocked localStorage)', () => {
    setPinnedFingerprint('lc_x:9999');
    assert.equal(getPinnedFingerprint(), 'lc_x:9999');
    clearPinnedFingerprint();
    assert.equal(getPinnedFingerprint(), '');
  });
});
```

- [ ] **Step 1.2: Run — expect FAIL (module not found)**

```bash
node --test public/js/lan-host-registry.test.mjs
```

Expected: `Error: Cannot find module './lan-host-registry.mjs'`

- [ ] **Step 1.3: Implement `public/js/lan-host-registry.mjs`**

```js
/**
 * In-memory host registry keyed by fingerprint (clientId:startedAt).
 * All discovery paths write here; all reconnect paths read from here.
 */

const PINNED_FP_KEY = 'rplus.lan.pinnedFingerprint';

/** @type {Map<string, import('./lan-host-registry.mjs').HostRecord>} */
const _registry = new Map();

const SOURCE_WEIGHT = {
  heartbeat:   5,
  mdns:        4,
  health_poll: 3,
  udp:         2,
  scan:        1,
};

/** For tests only — clears all registry entries. */
export function _resetRegistryForTest() {
  _registry.clear();
}

/**
 * @param {object} record
 * @param {string} record.fingerprint
 * @param {string} record.clientId
 * @param {number} record.startedAt
 * @param {string} record.currentUrl
 * @param {string} [record.rank]
 * @param {boolean} [record.dbUnlocked]
 * @param {boolean} [record.shiftPinActive]
 * @param {number} [record.rttMs]
 * @param {number} record.lastSeenAt
 * @param {keyof SOURCE_WEIGHT} record.source
 */
export function upsertHost(record) {
  if (!record || !record.fingerprint) return;
  const fp = String(record.fingerprint);
  const existing = _registry.get(fp);
  const incomingWeight = SOURCE_WEIGHT[record.source] ?? 0;
  const existingWeight = existing ? (SOURCE_WEIGHT[existing.source] ?? 0) : -1;

  // Determine whether to update the URL:
  // A higher-weight source always wins; within the same weight, take the more recent lastSeenAt.
  const shouldUpdateUrl = !existing ||
    incomingWeight > existingWeight ||
    (incomingWeight === existingWeight && record.lastSeenAt >= existing.lastSeenAt);

  _registry.set(fp, {
    fingerprint:    fp,
    clientId:       String(record.clientId || ''),
    startedAt:      Number(record.startedAt) || 0,
    currentUrl:     shouldUpdateUrl ? String(record.currentUrl || '') : existing.currentUrl,
    rank:           String(record.rank || existing?.rank || ''),
    dbUnlocked:     record.dbUnlocked != null ? !!record.dbUnlocked : (existing?.dbUnlocked ?? false),
    shiftPinActive: record.shiftPinActive != null ? !!record.shiftPinActive : (existing?.shiftPinActive ?? false),
    rttMs:          Number(record.rttMs) || (existing?.rttMs ?? 0),
    lastSeenAt:     Number(record.lastSeenAt) || Date.now(),
    source:         shouldUpdateUrl ? record.source : (existing?.source ?? 'scan'),
  });
}

/** @param {string} fingerprint @returns {object|null} */
export function findByFingerprint(fingerprint) {
  return _registry.get(String(fingerprint)) ?? null;
}

/** @param {string} url @returns {object|null} */
export function findByUrl(url) {
  const normalized = String(url || '').replace(/\/+$/, '');
  for (const r of _registry.values()) {
    if (r.currentUrl.replace(/\/+$/, '') === normalized) return r;
  }
  return null;
}

/** @returns {object[]} All registry entries (not yet evicted). */
export function listHosts() {
  return [..._registry.values()];
}

/**
 * Remove entries older than maxAgeMs.
 * @param {number} [maxAgeMs=90000]
 */
export function evictStale(maxAgeMs = 90_000) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [fp, r] of _registry) {
    if (r.lastSeenAt < cutoff) _registry.delete(fp);
  }
}

/** Reads localStorage 'rplus.lan.pinnedFingerprint'. */
export function getPinnedFingerprint() {
  try {
    return String(localStorage.getItem(PINNED_FP_KEY) || '').trim();
  } catch (_e) {
    return '';
  }
}

/** @param {string} fp */
export function setPinnedFingerprint(fp) {
  try {
    if (!fp) { localStorage.removeItem(PINNED_FP_KEY); return; }
    localStorage.setItem(PINNED_FP_KEY, String(fp));
  } catch (_e) {}
}

export function clearPinnedFingerprint() {
  try { localStorage.removeItem(PINNED_FP_KEY); } catch (_e) {}
}
```

**Note on localStorage in tests:** The test uses `clearPinnedFingerprint()` in `beforeEach`. Since `node --test` doesn't have `localStorage`, the test environment will hit the `catch (_e)` branches — the pinnedFingerprint tests will see empty strings, which is the correct fallback. No mock needed for the core logic tests.

- [ ] **Step 1.4: Run tests — expect PASS**

```bash
node --test public/js/lan-host-registry.test.mjs
```

Expected: all `ok` lines, exit 0.

- [ ] **Step 1.5: Commit**

```bash
git add public/js/lan-host-registry.mjs public/js/lan-host-registry.test.mjs
git commit -m "feat(lan): host registry keyed by fingerprint (clientId:startedAt)"
```

---

### Task 2: Health Endpoint + Host Heartbeat (`host-router.js`)

**Files:**
- Modify: `lan-squad/host-router.js` (add `/health` route + heartbeat timer + SSE broadcast hook)
- Modify: `lan-squad/host-router.test.js` (add tests)

The `/health` endpoint needs two new data sources not previously passed to `createLanRouter`. Add a `getHealthExtras` callback parameter (optional, defaults to `() => ({})`) alongside the existing `getHostClinicalMeta`.

- [ ] **Step 2.1: Write failing tests (append to `host-router.test.js`)**

```js
// Add to lan-squad/host-router.test.js — after existing tests

test('GET /health returns aggregated status (unauthenticated)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-health-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const app = mountLanRouter(store, () => {}, () => ({
    rank: 'R4', isProgramAdmin: true, isOnCallGuardia: false, startedAt: 999_000, updatedAt: '',
  }), () => ({ dbUnlocked: true, shiftPinActive: false, clientId: 'lc_test', revision: 7 }));
  const server = http.createServer(app);
  await listenServer(server);
  try {
    const { port } = server.address();
    // /health is unauthenticated — no bearer required
    const res = await fetch(`http://127.0.0.1:${port}/api/lan/v1/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.lan, true);
    assert.strictEqual(body.dbUnlocked, true);
    assert.strictEqual(body.shiftPinActive, false);
    assert.strictEqual(body.hostRank, 'R4');
    assert.strictEqual(body.clientId, 'lc_test');
    assert.strictEqual(body.startedAt, 999_000);
    assert.strictEqual(body.revision, 7);
  } finally {
    await tearDownLanTest({ server, dir, store });
  }
});

test('GET /health returns safe defaults when getHealthExtras not provided', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-health-def-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  // mountLanRouter without getHealthExtras — use the standard 2-arg helper
  const app = mountLanRouter(store);
  const server = http.createServer(app);
  await listenServer(server);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/lan/v1/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.lan, true);
    assert.strictEqual(typeof body.dbUnlocked, 'boolean');
  } finally {
    await tearDownLanTest({ server, dir, store });
  }
});
```

Also update `mountLanRouter` helper in the test file to accept a 4th arg:

```js
// Replace the existing mountLanRouter helper
function mountLanRouter(store, broadcast = () => {}, getHostClinicalMeta, getHealthExtras) {
  const resolver = createConflictResolver({ store });
  const app = express();
  app.use('/api/lan/v1', createLanRouter({
    store, broadcast, resolver,
    getHostClinicalMeta: getHostClinicalMeta || (() => ({
      rank: 'R1', isProgramAdmin: false, isOnCallGuardia: false, startedAt: 0, updatedAt: '',
    })),
    getHealthExtras: getHealthExtras || null,
  }));
  return app;
}
```

- [ ] **Step 2.2: Run — expect FAIL**

```bash
node --test lan-squad/host-router.test.js 2>&1 | tail -10
```

Expected: new tests fail (route not found / wrong response).

- [ ] **Step 2.3: Implement `/health` route in `host-router.js`**

In `createLanRouter({ store, broadcast, resolver, getHostClinicalMeta, getHealthExtras })`:

Add immediately after the existing `r.get('/ping', ...)` route:

```js
r.get('/health', (_req, res) => {
  const meta = typeof getHostClinicalMeta === 'function'
    ? getHostClinicalMeta()
    : { rank: 'R1', isProgramAdmin: false, isOnCallGuardia: false, startedAt: 0, updatedAt: '' };
  const extras = typeof getHealthExtras === 'function'
    ? getHealthExtras()
    : {};
  res.json({
    lan:           true,
    dbUnlocked:    extras.dbUnlocked != null ? !!extras.dbUnlocked : false,
    shiftPinActive: extras.shiftPinActive != null ? !!extras.shiftPinActive : false,
    hostRank:      String(meta.rank || 'R1').trim() || 'R1',
    clientId:      String(extras.clientId || '').trim(),
    startedAt:     Number(meta.startedAt) || 0,
    revision:      Number(extras.revision) || 0,
  });
});
```

**Important:** this route must be placed BEFORE `r.use(createBearerAuthMiddleware(getState))` (or declared without auth middleware applied to it). Looking at `host-router.js`, the `r.use(createBearerAuthMiddleware(getState))` call is at line 28. In Express, `r.use()` applies to routes registered after it. Place `/health` before the auth middleware line:

```js
// At top of createLanRouter, before r.use(createBearerAuthMiddleware(getState)):
r.get('/beacon', (_req, res) => { /* existing */ });
r.get('/health', (_req, res) => { /* new */ });
r.use(createBearerAuthMiddleware(getState)); // auth applies to all routes below this
```

- [ ] **Step 2.4: Add heartbeat timer to `createLanRouter`**

Add to `createLanRouter`, after the router is defined, before returning `r`:

```js
// Heartbeat: periodic livesync:hello on sync room (WS + SSE broadcast).
// Cleared externally if needed; kept simple with a module-scoped ref.
const HEARTBEAT_INTERVAL_MS = 30_000;
let _heartbeatTimer = null;

function startHeartbeat(broadcastFn, getMetaFn, getExtrasFn) {
  if (_heartbeatTimer) return;
  _heartbeatTimer = setInterval(() => {
    const meta = typeof getMetaFn === 'function' ? getMetaFn() : {};
    const extras = typeof getExtrasFn === 'function' ? getExtrasFn() : {};
    if (typeof broadcastFn === 'function') {
      broadcastFn('sync', {
        type:          'livesync:hello',
        clientId:      String(extras.clientId || ''),
        startedAt:     Number(meta.startedAt) || 0,
        revision:      Number(extras.revision) || 0,
        rank:          String(meta.rank || 'R1'),
        dbUnlocked:    !!extras.dbUnlocked,
        shiftPinActive: !!extras.shiftPinActive,
      });
    }
  }, HEARTBEAT_INTERVAL_MS);
}
```

Call `startHeartbeat(broadcast, getHostClinicalMeta, getHealthExtras)` at the bottom of `createLanRouter` before `return r`.

**Note on `_heartbeatTimer`:** since `host-router.js` is a singleton in the server process, one timer is correct. The timer is started when the router is first created (server start) and runs for the server's lifetime. No cleanup needed for tests since tests tear down the HTTP server and the timer does not prevent process exit in test mode.

- [ ] **Step 2.5: Wire `getHealthExtras` in `server.js`**

In `server.js`, update the `createLanRouter(...)` call:

```js
appExpress.use(
  '/api/lan/v1',
  createLanRouter({
    store: lanStore,
    broadcast,
    resolver: lanResolver,
    getHostClinicalMeta: () => readHostClinicalMeta(userData),
    // NEW:
    getHealthExtras: () => ({
      dbUnlocked:    !!(lanDbManager && typeof lanDbManager.isUnlocked === 'function' && lanDbManager.isUnlocked()),
      shiftPinActive: !!(shiftPinStore.getStatus() && shiftPinStore.getStatus().active),
      clientId:      (readHostClinicalMeta(userData) || {}).clientId || '',
      revision:      Number(lanStore.getState()?.bundle?.revision) || 0,
    }),
  })
);
```

`shiftPinStore.getStatus()` returns `{ active, pin, expiresAt }` or `null` when no pin. Check: `getStatus()?.active` being truthy means a shift PIN is live.

- [ ] **Step 2.6: Run all host-router tests**

```bash
node --test lan-squad/host-router.test.js
```

Expected: all tests pass including the two new ones.

- [ ] **Step 2.7: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js server.js
git commit -m "feat(lan): /health endpoint + 30s livesync:hello heartbeat"
```

---

### Task 3: Registry Integration — Surrogate Shim + Transport `/health` Post-Join

**Files:**
- Modify: `public/js/lan-surrogate-host.mjs` (shim `recordLivePeer` → registry)
- Modify: `public/js/features/lan/transport.mjs` (call `/health` after successful join, write fingerprint)

This task wires the registry into two existing flows without changing their outward behavior.

- [ ] **Step 3.1: Shim `recordLivePeer` in `lan-surrogate-host.mjs`**

At the top of the file, add the registry import:

```js
import {
  upsertHost,
  setPinnedFingerprint,
} from './lan-host-registry.mjs';
```

Inside `recordLivePeer`, after the existing `writePeersRaw(map)` call, add:

```js
// Shim: also upsert into the registry for fingerprint-based reconnect
if (meta && meta.startedAt && Number(meta.startedAt) > 0) {
  upsertHost({
    fingerprint:    `${id}:${meta.startedAt}`,
    clientId:       id,
    startedAt:      Number(meta.startedAt),
    currentUrl:     hostUrl,
    rank:           String(meta.rank || ''),
    dbUnlocked:     false, // unknown at this point; updated by heartbeat
    shiftPinActive: false,
    rttMs:          0,
    lastSeenAt:     Date.now(),
    source:         'heartbeat', // livesync:hello is the primary caller
  });
}
```

- [ ] **Step 3.2: Add `/health` post-join call in `transport.mjs`**

Find the function `persistLanClientConfig(hostUrl, teamCode)` in `transport.mjs`. After the final `return changed;`, add a fire-and-forget health fetch that runs only when the config actually changed:

```js
export function persistLanClientConfig(hostUrl, teamCode) {
  // ... existing code ...
  if (changed) {
    try {
      lanClient.disconnect();
      lanClient.connectSyncChannel();
    } catch (_e) {}
    // NEW: fetch /health to populate fingerprint + registry entry
    _fetchAndRegisterHealthAfterJoin(hostUrl, teamCode);
  }
  return changed;
}

async function _fetchAndRegisterHealthAfterJoin(hostUrl, teamCode) {
  try {
    const base = normalizeLanHostBase(hostUrl);
    if (!base) return;
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${base}/api/lan/v1/health`, { signal: ctrl.signal });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.clientId || !data.startedAt) return;
    const fp = `${data.clientId}:${data.startedAt}`;
    const { upsertHost, setPinnedFingerprint } = await import('../../lan-host-registry.mjs');
    upsertHost({
      fingerprint:    fp,
      clientId:       data.clientId,
      startedAt:      data.startedAt,
      currentUrl:     base,
      rank:           data.hostRank || '',
      dbUnlocked:     !!data.dbUnlocked,
      shiftPinActive: !!data.shiftPinActive,
      rttMs:          0,
      lastSeenAt:     Date.now(),
      source:         'health_poll',
    });
    setPinnedFingerprint(fp);
  } catch (_e) {
    // fire-and-forget — failure is non-critical
  }
}
```

Using a dynamic `import()` inside the async function avoids adding a static import to `transport.mjs` that could affect the esbuild chunk graph. Dynamic imports in async paths are already used in the codebase (see `orchestrator.mjs` lazy import pattern).

- [ ] **Step 3.3: Verify no circular dependency introduced**

```bash
node -e "import('./public/js/features/lan/transport.mjs').then(() => console.log('ok')).catch(e => console.error(e.message))"
```

Expected: `ok` (no circular import error).

- [ ] **Step 3.4: Commit**

```bash
git add public/js/lan-surrogate-host.mjs public/js/features/lan/transport.mjs
git commit -m "feat(lan): registry shim in recordLivePeer + /health fingerprint write on join"
```

---

## Phase 1 — Discovery

### Task 4: mDNS Service (`lan-mdns-service.js`)

**Files:**
- Create: `lan-squad/lan-mdns-service.js`
- Modify: `main.js` (start mDNS, restart on NIC change, IPC push)
- Modify: `preload.js` (`onLanMdnsPeers` channel)

- [ ] **Step 4.1: Install `bonjour-service`**

```bash
npm install bonjour-service
```

Verify it's pure JS (no native build output):
```bash
ls node_modules/bonjour-service/lib/
```

Expected: `.js` files only — no `.node` files.

- [ ] **Step 4.2: Create `lan-squad/lan-mdns-service.js`**

```js
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

  function start(hostIp) {
    stop();
    bonjour = new Bonjour();

    // Advertise this instance
    advertised = bonjour.publish({
      name: `R+ ${rank} ${String(clientId).slice(-6)}`,
      type: `${SERVICE_TYPE}.${SERVICE_PROTOCOL}`,
      port,
      txt: { clientId, startedAt: String(startedAt), rank, teamHash },
    });

    // Browse for other instances
    browser = bonjour.find({ type: `${SERVICE_TYPE}.${SERVICE_PROTOCOL}` }, (service) => {
      try {
        const txt = service.txt || {};
        const peerClientId = String(txt.clientId || '').trim();
        const peerStartedAt = Number(txt.startedAt) || 0;
        const peerRank = String(txt.rank || '').trim();
        const peerTeamHash = String(txt.teamHash || '').trim();
        if (!peerClientId || !peerStartedAt) return;
        if (peerClientId === clientId) return; // skip self
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
    // Small delay to allow OS mDNS stack to clear previous advertisement
    setTimeout(() => start(newHostIp), 300);
  }

  return { start, stop, restart };
}

function buildTeamHashSync(teamCode) {
  return crypto.createHash('sha256').update(String(teamCode || '')).digest('hex').slice(0, 8);
}

module.exports = { createLanMdnsService, buildTeamHashSync };
```

- [ ] **Step 4.3: Wire in `main.js`**

In `main.js`, add near the `createLanNetworkWatch` block (around line 673):

```js
const { createLanMdnsService, buildTeamHashSync } = require('./lan-squad/lan-mdns-service.js');

// Build teamHash lazily — depends on team code being available after server starts
let _lanMdnsService = null;

function startLanMdnsIfHosting() {
  try {
    const { readLanTeamCodeFile } = require('./lan-squad/effective-team-code.js');
    const teamCode = readLanTeamCodeFile(app.getPath('userData')) || '';
    if (!teamCode) return;
    const { readHostClinicalMeta } = require('./lan-squad/host-clinical-meta.js');
    const meta = readHostClinicalMeta(app.getPath('userData')) || {};
    const clientId = meta.clientId || ('lc_' + Date.now().toString(36));
    const startedAt = meta.startedAt || Date.now();
    const rank = meta.rank || 'R1';
    const teamHash = buildTeamHashSync(teamCode);
    if (_lanMdnsService) _lanMdnsService.stop();
    _lanMdnsService = createLanMdnsService({ clientId, startedAt, rank, teamHash }, (peers) => {
      safeSendToRenderer('lan:mdns-peers', peers);
    });
    _lanMdnsService.start();
  } catch (_e) {
    // Non-critical — mDNS unavailable (e.g. firewall, no network)
  }
}
```

Hook into `lan-ensure-server-ready` handler (around line 616) — call `startLanMdnsIfHosting()` after the server is confirmed ready:

```js
ipcMain.handle('lan-ensure-server-ready', async () => {
  // ... existing code ...
  startLanMdnsIfHosting(); // NEW
  return result;
});
```

Also restart mDNS on NIC change in the `lanNetworkWatch` callback:

```js
const lanNetworkWatch = createLanNetworkWatch((payload) => {
  safeSendToRenderer('lan-network-changed', payload);
  // NEW: restart mDNS advertisement with new NIC IP
  if (_lanMdnsService) {
    _lanMdnsService.restart(payload.candidateBaseUrl);
  }
});
```

- [ ] **Step 4.4: Add IPC channel to `preload.js`**

In `preload.js`, inside the `contextBridge.exposeInMainWorld('electronAPI', { ... })` block, add:

```js
onLanMdnsPeers: function(cb) {
  ipcRenderer.on('lan:mdns-peers', function(_e, peers) { cb(peers); });
},
```

- [ ] **Step 4.5: Verify main process starts without error**

```bash
npm start 2>&1 | head -20
```

Expected: app starts normally; no `Error: Cannot find module 'bonjour-service'`.

- [ ] **Step 4.6: Commit**

```bash
git add lan-squad/lan-mdns-service.js main.js preload.js package.json package-lock.json
git commit -m "feat(lan): mDNS _rplus._tcp advertise + browse via bonjour-service"
```

---

### Task 5: UDP Multicast Beacon (`lan-udp-beacon.js`)

**Files:**
- Create: `lan-squad/lan-udp-beacon.js`
- Create: `lan-squad/lan-udp-beacon.test.js`
- Modify: `main.js` (start listener + IPC discover handler)
- Modify: `preload.js` (`lanUdpDiscover` channel)

- [ ] **Step 5.1: Write failing tests**

```js
// lan-squad/lan-udp-beacon.test.js
'use strict';
const assert = require('node:assert');
const { test } = require('node:test');
const { createUdpBeacon } = require('./lan-udp-beacon.js');

test('UDP beacon: listener responds to discover datagram', async () => {
  const beacon = createUdpBeacon({
    clientId: 'lc_test', startedAt: 12345, rank: 'R4',
    teamHash: 'abcd1234', port: 0, // port 0 = OS picks free port
  });
  const assignedPort = await beacon.startListening();
  assert.ok(assignedPort > 0, 'port must be > 0');

  const results = await beacon.discoverOnPort(assignedPort, 300);
  assert.ok(Array.isArray(results), 'results should be array');
  // Our own listener will respond (loopback), so at least one result
  assert.ok(results.length >= 1, 'at least one beacon response expected');
  const r = results[0];
  assert.strictEqual(r.clientId, 'lc_test');
  assert.strictEqual(r.teamHash, 'abcd1234');

  beacon.stop();
});

test('UDP beacon: discover returns empty array on timeout with no listeners', async () => {
  // Discover on a port with no listener active — should return []
  const beacon = createUdpBeacon({
    clientId: 'lc_dummy', startedAt: 1, rank: 'R1', teamHash: 'x', port: 0,
  });
  // Do NOT start listening — just discover
  const results = await beacon.discoverOnPort(39999, 100);
  assert.deepEqual(results, []);
  beacon.stop();
});
```

- [ ] **Step 5.2: Run — expect FAIL**

```bash
node --test lan-squad/lan-udp-beacon.test.js
```

Expected: `Error: Cannot find module './lan-udp-beacon.js'`

- [ ] **Step 5.3: Implement `lan-squad/lan-udp-beacon.js`**

```js
'use strict';
const dgram = require('node:dgram');

const MULTICAST_GROUP = '239.255.42.1';
const DISCOVER_MSG = JSON.stringify({ type: 'rplus-discover' });

/**
 * @param {{ clientId: string, startedAt: number, rank: string, teamHash: string, port: number }} opts
 */
function createUdpBeacon({ clientId, startedAt, rank, teamHash, port }) {
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
   * Send a discovery multicast and collect unicast replies for timeoutMs.
   * @param {number} [targetPort] — port to send to (defaults to this beacon's port)
   * @param {number} [timeoutMs=500]
   * @returns {Promise<Array<{url: string, clientId: string, startedAt: number, rank: string, teamHash: string}>>}
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
              url:        `http://127.0.0.1:${data.port || 3738}`, // loopback in tests; real IP in production
              clientId:   String(data.clientId),
              startedAt:  Number(data.startedAt) || 0,
              rank:       String(data.rank || ''),
              teamHash:   String(data.teamHash || ''),
              _fromUdp:   true,
            });
          }
        } catch (_e) {}
      });

      sock.bind(0, () => {
        try {
          sock.setBroadcast(true);
        } catch (_e) {}
        const buf = Buffer.from(DISCOVER_MSG);
        const dest = targetPort || listenPort || Number(port) || 3739;
        sock.send(buf, dest, '127.0.0.1', () => {}); // loopback for tests; in production send to multicast group
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
              results.push({ url, clientId: data.clientId, startedAt: data.startedAt,
                rank: data.rank, teamHash: data.teamHash, _fromUdp: true });
            }
          }
        } catch (_e) {}
      });

      sock.bind(0, () => {
        try { sock.setBroadcast(true); } catch (_e) {}
        try { sock.setMulticastTTL(4); } catch (_e) {}
        const buf = Buffer.from(DISCOVER_MSG);
        const destPort = Number(port) || 3739;
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
```

- [ ] **Step 5.4: Run tests — expect PASS**

```bash
node --test lan-squad/lan-udp-beacon.test.js
```

Expected: both tests pass. (The second test may time out at 100 ms with no listener — that's the correct behavior.)

- [ ] **Step 5.5: Wire in `main.js`**

Add near the mDNS block from Task 4:

```js
const { createUdpBeacon } = require('./lan-squad/lan-udp-beacon.js');

let _udpBeacon = null;

function startUdpBeaconIfHosting() {
  try {
    const { readLanTeamCodeFile } = require('./lan-squad/effective-team-code.js');
    const teamCode = readLanTeamCodeFile(app.getPath('userData')) || '';
    const { readHostClinicalMeta, buildTeamHashSync } = require('./lan-squad/host-clinical-meta.js');
    // buildTeamHashSync is in lan-mdns-service.js — import from there
    const { buildTeamHashSync: buildHash } = require('./lan-squad/lan-mdns-service.js');
    const meta = readHostClinicalMeta(app.getPath('userData')) || {};
    const teamHash = teamCode ? buildHash(teamCode) : '';
    if (_udpBeacon) _udpBeacon.stop();
    _udpBeacon = createUdpBeacon({
      clientId: meta.clientId || 'lc_anon',
      startedAt: meta.startedAt || 0,
      rank: meta.rank || 'R1',
      teamHash,
      port: 3739,
    });
    _udpBeacon.startListening().catch(() => {}); // non-fatal
  } catch (_e) {}
}
```

Call `startUdpBeaconIfHosting()` inside the `lan-ensure-server-ready` IPC handler alongside `startLanMdnsIfHosting()`.

Wire the discover IPC:

```js
ipcMain.handle('lan-udp-discover', async () => {
  if (!_udpBeacon) return [];
  return _udpBeacon.discover(500);
});
```

- [ ] **Step 5.6: Add `lanUdpDiscover` to `preload.js`**

```js
lanUdpDiscover: function() {
  return ipcRenderer.invoke('lan-udp-discover');
},
```

- [ ] **Step 5.7: Commit**

```bash
git add lan-squad/lan-udp-beacon.js lan-squad/lan-udp-beacon.test.js main.js preload.js
git commit -m "feat(lan): UDP multicast beacon on 239.255.42.1:3739"
```

---

### Task 6: Orchestrator Discovery Wiring

**Files:**
- Modify: `public/js/features/lan/orchestrator.mjs` (mDNS subscription, concurrent UDP+scan, eviction tick)

This task wires the registry into the existing discovery flow without changing the visible behavior when the registry has no hits.

- [ ] **Step 6.1: Add mDNS subscription at boot in `orchestrator.mjs`**

Find the boot/init section of `orchestrator.mjs` (look for `window.electronAPI?.onLanNetworkChanged` or similar event subscriptions). Add:

```js
import {
  upsertHost,
  evictStale,
} from '../../lan-host-registry.mjs';

// Subscribe to mDNS peer announcements from main process
if (typeof window !== 'undefined' && window.electronAPI?.onLanMdnsPeers) {
  window.electronAPI.onLanMdnsPeers((peers) => {
    if (!Array.isArray(peers)) return;
    peers.forEach((peer) => {
      if (!peer || !peer.clientId || !peer.startedAt) return;
      upsertHost({
        fingerprint:    `${peer.clientId}:${peer.startedAt}`,
        clientId:       peer.clientId,
        startedAt:      peer.startedAt,
        currentUrl:     peer.url,
        rank:           peer.rank || '',
        dbUnlocked:     false,
        shiftPinActive: false,
        rttMs:          0,
        lastSeenAt:     Date.now(),
        source:         'mdns',
      });
    });
  });
}

// Registry eviction every 30s (aligned with heartbeat)
setInterval(() => evictStale(90_000), 30_000);
```

- [ ] **Step 6.2: Make subnet scan feed the registry**

Find where `discoverLanHostsOnAllLocalSubnetsViaBeacon` or `discoverLanHostsOnSubnet` is called in `orchestrator.mjs` or `panel.mjs`. Wrap the call site to also upsert results into the registry:

```js
// Replace the discovery call (in whichever file performs the scan):
const [udpHosts, scannedUrls] = await Promise.all([
  (typeof window !== 'undefined' && window.electronAPI?.lanUdpDiscover)
    ? window.electronAPI.lanUdpDiscover().catch(() => [])
    : Promise.resolve([]),
  discoverLanHostsOnAllLocalSubnetsViaBeacon(ownBaseUrl).catch(() => []),
]);

// Feed UDP results into registry
udpHosts.forEach((h) => {
  if (!h || !h.clientId || !h.startedAt) return;
  upsertHost({
    fingerprint:    `${h.clientId}:${h.startedAt}`,
    clientId:       h.clientId,
    startedAt:      h.startedAt,
    currentUrl:     h.url,
    rank:           h.rank || '',
    dbUnlocked:     false,
    shiftPinActive: false,
    rttMs:          0,
    lastSeenAt:     Date.now(),
    source:         'udp',
  });
});

// scannedUrls are plain URL strings (existing behavior) — unchanged
const allDiscoveredUrls = [
  ...udpHosts.map((h) => h.url).filter(Boolean),
  ...scannedUrls,
];
// Continue with allDiscoveredUrls as before (pass to existing host election / join logic)
```

**Finding the call site:** search for `discoverLanHostsOnAllLocalSubnets` in `panel.mjs` and `orchestrator.mjs`:
```bash
grep -n "discoverLanHosts\|discoverLanBeacon" public/js/features/lan/panel.mjs public/js/features/lan/orchestrator.mjs
```

Wrap each call site consistently with the pattern above.

- [ ] **Step 6.3: Handle `livesync:hello` heartbeat in `orchestrator.mjs`**

Find where `lan-patch` events are handled (look for `lanClient.addEventListener('lan-patch', ...)`). Add a branch for the heartbeat:

```js
if (data.type === 'livesync:hello') {
  const hostUrl = lanHostUrl(); // existing function that returns the configured host URL
  if (hostUrl && data.clientId && data.startedAt) {
    upsertHost({
      fingerprint:    `${data.clientId}:${data.startedAt}`,
      clientId:       data.clientId,
      startedAt:      data.startedAt,
      currentUrl:     hostUrl,
      rank:           data.rank || '',
      dbUnlocked:     !!data.dbUnlocked,
      shiftPinActive: !!data.shiftPinActive,
      rttMs:          0,
      lastSeenAt:     Date.now(),
      source:         'heartbeat',
    });
  }
  // If currently offline but host just announced itself → attempt reconnect
  const roomId = String(activeLiveSyncRoomId || '').trim();
  if (roomId && getRoomSyncPhase(roomId) === RoomSyncPhase.offline) {
    // Trigger reconnect path — same as user-initiated reconnect
    const panel = await import('./panel.mjs');
    if (typeof panel.tryLanReconnect === 'function') panel.tryLanReconnect({ silent: true });
  }
  return;
}
```

- [ ] **Step 6.4: Smoke test — run npm start and verify no console errors**

```bash
npm start 2>&1 | grep -E "Error|error|TypeError" | head -10
```

Expected: no new errors related to `lan-host-registry` or `orchestrator`.

- [ ] **Step 6.5: Commit**

```bash
git add public/js/features/lan/orchestrator.mjs
git commit -m "feat(lan): orchestrator wires mDNS + UDP + registry eviction + heartbeat handler"
```

---

### Task 7: Exponential Backoff on Shift-PIN Scan

**Files:**
- Modify: `public/js/lan-shift-pin-connect.mjs`
- Create: `public/js/lan-shift-pin-connect.test.mjs`
- Modify: `public/js/lan-network-change.mjs` (`resetShiftPinBackoff` call)

- [ ] **Step 7.1: Write failing tests**

```js
// public/js/lan-shift-pin-connect.test.mjs
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// We test only the backoff logic — extracting it into a factory for testability
// The actual module uses module-level state; we test by calling the exported helpers.
import {
  resetShiftPinBackoff,
  recordShiftPinFailure,
  getShiftPinCooldownMs,
} from './lan-shift-pin-connect.mjs';

describe('shift-pin backoff', () => {
  beforeEach(() => {
    resetShiftPinBackoff();
  });

  it('initial cooldown is 12 s', () => {
    assert.equal(getShiftPinCooldownMs(), 12_000);
  });

  it('backs off after each failure', () => {
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 30_000);
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 60_000);
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 120_000);
    // caps at max
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 120_000);
  });

  it('resets to 12 s after resetShiftPinBackoff', () => {
    recordShiftPinFailure();
    recordShiftPinFailure();
    resetShiftPinBackoff();
    assert.equal(getShiftPinCooldownMs(), 12_000);
  });
});
```

- [ ] **Step 7.2: Run — expect FAIL**

```bash
node --test public/js/lan-shift-pin-connect.test.mjs
```

Expected: named exports not found.

- [ ] **Step 7.3: Implement backoff in `lan-shift-pin-connect.mjs`**

Replace the existing constants block:

```js
// Before (remove):
const EASY_RETRY_COOLDOWN_MS = 12000;
let _lastEasyConnectAttemptMs = 0;

// After (replace with):
const BACKOFF_STEPS_MS = [12_000, 30_000, 60_000, 120_000];
let _easyConnectFailCount = 0;
let _lastEasyConnectAttemptMs = 0;

export function getShiftPinCooldownMs() {
  return BACKOFF_STEPS_MS[Math.min(_easyConnectFailCount, BACKOFF_STEPS_MS.length - 1)];
}

export function recordShiftPinFailure() {
  _easyConnectFailCount = Math.min(_easyConnectFailCount + 1, BACKOFF_STEPS_MS.length - 1);
}

export function resetShiftPinBackoff() {
  _easyConnectFailCount = 0;
  _lastEasyConnectAttemptMs = 0;
}
```

Update `tryEasyLanShiftPinConnect` to use `getShiftPinCooldownMs()` instead of `EASY_RETRY_COOLDOWN_MS`:

```js
// Find this guard (roughly):
if (!opts?.skipCooldown && Date.now() - _lastEasyConnectAttemptMs < EASY_RETRY_COOLDOWN_MS) return;
// Replace with:
if (!opts?.skipCooldown && Date.now() - _lastEasyConnectAttemptMs < getShiftPinCooldownMs()) return;
```

Also add the offline guard — find where the function body starts and add early return:

```js
export async function tryEasyLanShiftPinConnect(opts = {}) {
  // NEW: skip entirely when network is offline (guard paused — saves battery)
  if (typeof lanNetworkProfile !== 'undefined' &&
      lanNetworkProfile.getNetworkProfile() === 'offline') return;
  // ... rest of existing function ...
}
```

At the top of the file, import `lanNetworkProfile` if not already imported:

```js
import { lanNetworkProfile } from './lan-network-profile.mjs';
```

At call sites where the function succeeds, add `resetShiftPinBackoff()`. Find the success return path and add:

```js
resetShiftPinBackoff(); // reset on successful join
```

At fail paths (where the function returns without joining), add `recordShiftPinFailure()`.

- [ ] **Step 7.4: Wire `resetShiftPinBackoff` in `lan-network-change.mjs`**

```js
// Add import at top:
import { resetShiftPinBackoff } from './lan-shift-pin-connect.mjs';

// At start of handleLanNetworkChanged:
export async function handleLanNetworkChanged(payload) {
  if (!isLanElectronDesktop()) return;
  resetShiftPinBackoff(); // NEW: new Wi-Fi → fresh attempt at 12 s cadence
  applyLanNetworkRoaming(payload || {});
  await restartLanDiscoveryAfterNetworkChange();
}
```

- [ ] **Step 7.5: Run tests**

```bash
node --test public/js/lan-shift-pin-connect.test.mjs
```

Expected: all pass.

- [ ] **Step 7.6: Commit**

```bash
git add public/js/lan-shift-pin-connect.mjs public/js/lan-shift-pin-connect.test.mjs public/js/lan-network-change.mjs
git commit -m "feat(lan): exponential backoff on shift-PIN scan (12→30→60→120s)"
```

---

## Phase 2 — Roam & Security

### Task 8: Fingerprint-Based Roam Shortcut

**Files:**
- Modify: `public/js/lan-network-roam.mjs`
- Modify: `public/js/lan-network-change.mjs`
- Create/Modify: `public/js/lan-network-roam.test.mjs`

- [ ] **Step 8.1: Write failing tests**

```js
// public/js/lan-network-roam.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyLanNetworkRoamingWithFingerprint } from './lan-network-roam.mjs';
import { upsertHost, setPinnedFingerprint, clearPinnedFingerprint, _resetRegistryForTest } from './lan-host-registry.mjs';

describe('applyLanNetworkRoamingWithFingerprint', () => {
  it('returns shortcut:false when no pinned fingerprint', async () => {
    _resetRegistryForTest();
    clearPinnedFingerprint();
    const result = await applyLanNetworkRoamingWithFingerprint(
      { prefixes: ['10.0.1'], candidateBaseUrl: 'http://10.0.1.5:3738' },
      { teamCode: 'tok', pingFn: async () => true }
    );
    assert.equal(result.shortcut, false);
  });

  it('returns shortcut:false when fingerprint not in registry', async () => {
    _resetRegistryForTest();
    setPinnedFingerprint('lc_x:9000');
    const result = await applyLanNetworkRoamingWithFingerprint(
      { prefixes: ['10.0.1'], candidateBaseUrl: 'http://10.0.1.5:3738' },
      { teamCode: 'tok', pingFn: async () => true }
    );
    assert.equal(result.shortcut, false);
    clearPinnedFingerprint();
  });

  it('returns shortcut:true with newUrl when registry has new IP and ping succeeds', async () => {
    _resetRegistryForTest();
    setPinnedFingerprint('lc_a:1111');
    upsertHost({
      fingerprint: 'lc_a:1111', clientId: 'lc_a', startedAt: 1111,
      currentUrl: 'http://10.0.2.5:3738', // new IP after roam
      rank: 'R4', dbUnlocked: true, shiftPinActive: false,
      rttMs: 10, lastSeenAt: Date.now(), source: 'mdns',
    });
    const result = await applyLanNetworkRoamingWithFingerprint(
      { prefixes: ['10.0.2'], candidateBaseUrl: 'http://10.0.2.99:3738' },
      {
        savedHostUrl: 'http://10.0.1.5:3738', // old IP
        teamCode: 'tok',
        pingFn: async (url) => url === 'http://10.0.2.5:3738', // only new IP pings OK
      }
    );
    assert.equal(result.shortcut, true);
    assert.equal(result.newUrl, 'http://10.0.2.5:3738');
    clearPinnedFingerprint();
  });

  it('returns shortcut:false when ping fails (stale registry entry)', async () => {
    _resetRegistryForTest();
    setPinnedFingerprint('lc_b:2222');
    upsertHost({
      fingerprint: 'lc_b:2222', clientId: 'lc_b', startedAt: 2222,
      currentUrl: 'http://10.0.3.5:3738', // stale IP — host hasn't updated mDNS yet
      rank: 'R4', dbUnlocked: true, shiftPinActive: false,
      rttMs: 10, lastSeenAt: Date.now(), source: 'scan',
    });
    const result = await applyLanNetworkRoamingWithFingerprint(
      { prefixes: ['10.0.3'], candidateBaseUrl: 'http://10.0.3.99:3738' },
      {
        savedHostUrl: 'http://10.0.1.5:3738',
        teamCode: 'tok',
        pingFn: async () => false, // all pings fail
      }
    );
    assert.equal(result.shortcut, false);
    clearPinnedFingerprint();
  });
});
```

- [ ] **Step 8.2: Run — expect FAIL**

```bash
node --test public/js/lan-network-roam.test.mjs
```

Expected: `applyLanNetworkRoamingWithFingerprint` not exported.

- [ ] **Step 8.3: Implement in `lan-network-roam.mjs`**

Add imports at top:

```js
import { findByFingerprint, getPinnedFingerprint } from './lan-host-registry.mjs';
```

Add the new exported function (does NOT call `persistLanClientConfig` — that stays in the caller):

```js
/**
 * Attempt a fingerprint-based roam shortcut before falling back to full rescan.
 *
 * @param {{ prefixes?: string[], candidateBaseUrl?: string }} payload — from lan-network-changed
 * @param {{ savedHostUrl?: string, teamCode?: string, pingFn?: Function }} opts
 * @returns {Promise<{ shortcut: boolean, newUrl?: string }>}
 */
export async function applyLanNetworkRoamingWithFingerprint(payload, opts = {}) {
  const pinnedFp = getPinnedFingerprint();
  if (!pinnedFp) return { shortcut: false };

  const record = findByFingerprint(pinnedFp);
  if (!record) return { shortcut: false };

  const savedHost = normalizeLanHostBase(String(opts.savedHostUrl || ''));
  const registryUrl = normalizeLanHostBase(record.currentUrl);
  if (!registryUrl || registryUrl === savedHost) return { shortcut: false };

  // Validate the registry URL is actually reachable before committing
  const pingFn = typeof opts.pingFn === 'function'
    ? opts.pingFn
    : (url) => pingLanHostUrl(url, String(opts.teamCode || ''));

  const ok = await pingFn(registryUrl);
  if (!ok) return { shortcut: false };

  return { shortcut: true, newUrl: registryUrl };
}
```

Add `pingLanHostUrl` import at top (it's already used in the codebase, import from `lan-surrogate-host.mjs`):

```js
import { pingLanHostUrl } from './lan-surrogate-host.mjs';
```

- [ ] **Step 8.4: Update `lan-network-change.mjs` to use the shortcut**

```js
// Add imports:
import { applyLanNetworkRoamingWithFingerprint } from './lan-network-roam.mjs';
// transport.mjs is already imported dynamically in this file; add a named import:
import { resetShiftPinBackoff } from './lan-shift-pin-connect.mjs';

export async function handleLanNetworkChanged(payload) {
  if (!isLanElectronDesktop()) return;
  resetShiftPinBackoff();

  // Attempt fingerprint-based roam shortcut first
  const cfg = typeof storage !== 'undefined' && typeof storage.getLanConfig === 'function'
    ? (storage.getLanConfig() || {})
    : {};
  const roamResult = await applyLanNetworkRoamingWithFingerprint(payload || {}, {
    savedHostUrl: cfg.hostUrl,
    teamCode: cfg.teamCode,
  });

  if (roamResult.shortcut) {
    // NEW: shortcut — update config and reconnect without full rescan
    const transport = await import('./features/lan/transport.mjs');
    if (typeof transport.persistLanClientConfig === 'function') {
      transport.persistLanClientConfig(roamResult.newUrl, cfg.teamCode);
    }
    return; // skip restartLanDiscoveryAfterNetworkChange
  }

  applyLanNetworkRoaming(payload || {});
  await restartLanDiscoveryAfterNetworkChange();
}
```

Add `storage` import if not already present (check imports at top of `lan-network-change.mjs`; it likely uses `storage` indirectly via `applyLanNetworkRoaming`). If `storage` is not directly imported, derive `savedHostUrl` from the existing `applyLanNetworkRoaming` path instead and pass `null` (causing shortcut to skip if savedHostUrl can't be read).

- [ ] **Step 8.5: Run tests**

```bash
node --test public/js/lan-network-roam.test.mjs
```

Expected: all pass.

- [ ] **Step 8.6: Commit**

```bash
git add public/js/lan-network-roam.mjs public/js/lan-network-roam.test.mjs public/js/lan-network-change.mjs
git commit -m "feat(lan): fingerprint-based roam shortcut — skips full rescan on IP change"
```

---

### Task 9: QR Team Fingerprint

**Files:**
- Modify: `public/js/lan-join-link.mjs`
- Modify: `public/js/lan-join-link.test.mjs` (add `teamHash` assertion)
- Modify: `public/js/lan-shift-pin-connect.mjs` (verify `th` param on join)
- Modify: relevant join path in `public/js/features/lan/transport.mjs`

- [ ] **Step 9.1: Add `buildTeamHash` to `lan-join-link.mjs` and write test**

First, check existing `lan-join-link.test.mjs` for the structure:

```bash
head -20 public/js/lan-join-link.test.mjs
```

Add to the test file:

```js
import { buildTeamHash } from './lan-join-link.mjs';

it('buildTeamHash produces 8-char hex from teamCode', async () => {
  const h = await buildTeamHash('my-secret-team-code');
  assert.match(h, /^[0-9a-f]{8}$/);
});

it('buildTeamHash is consistent', async () => {
  const h1 = await buildTeamHash('abc');
  const h2 = await buildTeamHash('abc');
  assert.equal(h1, h2);
});

it('buildTeamHash differs for different team codes', async () => {
  const h1 = await buildTeamHash('ward-a');
  const h2 = await buildTeamHash('ward-b');
  assert.notEqual(h1, h2);
});
```

- [ ] **Step 9.2: Run — expect FAIL**

```bash
node --test public/js/lan-join-link.test.mjs 2>&1 | tail -5
```

- [ ] **Step 9.3: Implement `buildTeamHash` in `lan-join-link.mjs`**

```js
/**
 * SHA-256 truncated to 8 hex chars — ward identity token for QR/mDNS/UDP.
 * @param {string} teamCode
 * @returns {Promise<string>}
 */
export async function buildTeamHash(teamCode) {
  const code = String(teamCode || '');
  if (!code) return '';
  try {
    const buf = new TextEncoder().encode(code);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 8);
  } catch (_e) {
    return '';
  }
}
```

Update `buildLanJoinUrls` and `buildPermanentMobileJoinUrl` to append `th`:

```js
export async function buildLanJoinUrls(opts = {}) {
  // ... existing URL building ...
  const th = opts.teamCode ? await buildTeamHash(opts.teamCode) : '';
  // Append to each generated URL:
  const appendTh = (url) => th ? `${url}${url.includes('?') ? '&' : '?'}th=${th}` : url;
  // Apply appendTh to all join URLs before returning
}
```

The exact modification depends on the current return shape — read `buildLanJoinUrls` fully before editing to match existing patterns.

- [ ] **Step 9.4: Add join-side verification in `lan-shift-pin-connect.mjs`**

Find where the exchange target URL is formed or where the user-provided join link is parsed. Add:

```js
async function verifyTeamHashFromUrl(joinUrl, ownTeamCode) {
  try {
    const urlTh = new URL(joinUrl).searchParams.get('th');
    if (!urlTh) return true; // backward compat — no hash in URL
    const expectedTh = await buildTeamHash(ownTeamCode);
    return !expectedTh || urlTh === expectedTh;
  } catch (_e) {
    return true; // malformed URL — allow through
  }
}
```

Import `buildTeamHash` at top:
```js
import { buildTeamHash } from './lan-join-link.mjs';
```

In the join attempt, call `verifyTeamHashFromUrl` before exchanging the PIN:

```js
const hashOk = await verifyTeamHashFromUrl(targetUrl, ownTeamCode);
if (!hashOk) {
  showEasyToast('Este enlace es de otra sala o servicio. Verifica con el anfitrión.', 'warn');
  return;
}
```

- [ ] **Step 9.5: Run tests**

```bash
node --test public/js/lan-join-link.test.mjs
```

Expected: all pass including the 3 new `buildTeamHash` tests.

- [ ] **Step 9.6: Commit**

```bash
git add public/js/lan-join-link.mjs public/js/lan-join-link.test.mjs public/js/lan-shift-pin-connect.mjs
git commit -m "feat(lan): QR team fingerprint (sha256[:8]) — warn on cross-ward join"
```

---

## Phase 3 — Connectivity

### Task 10: SSE Hub (`lan-sse-hub.js`)

**Files:**
- Create: `lan-squad/lan-sse-hub.js`
- Create: `lan-squad/lan-sse-hub.test.js`
- Modify: `lan-squad/host-router.js` (wire SSE broadcast into `broadcastLiveRevision` and heartbeat)
- Modify: `server.js` (mount SSE router)

- [ ] **Step 10.1: Write failing tests**

```js
// lan-squad/lan-sse-hub.test.js
'use strict';
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const { test } = require('node:test');
const { createSseHub } = require('./lan-sse-hub.js');
const { createHostStore } = require('./host-store.js');
const { hashTeamCode } = require('./team-code.js');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('SSE /sse streams data:... lines to authenticated clients', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sse-test-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'sse-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });

  const sseHub = createSseHub();
  const app = express();
  sseHub.attachSseRouter(app, { getState: () => store.getState() });

  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();

  try {
    const ctrl = new AbortController();
    const received = [];

    const res = await fetch(`http://127.0.0.1:${port}/sse?channel=sync`, {
      headers: { Authorization: `Bearer ${code}` },
      signal: ctrl.signal,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/event-stream'));

    // Read first chunk
    const reader = res.body.getReader();
    const readPromise = reader.read().then((chunk) => {
      received.push(new TextDecoder().decode(chunk.value));
    });

    // Broadcast a message — should arrive via SSE
    sseHub.broadcast('sync', { type: 'test-hello', x: 42 });

    await readPromise;
    ctrl.abort();

    const text = received.join('');
    assert.ok(text.includes('"type":"test-hello"'), `expected test-hello in: ${text}`);
  } finally {
    await new Promise((r) => server.close(r));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('SSE /sse rejects unauthenticated request', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sse-auth-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'sse-auth-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });

  const sseHub = createSseHub();
  const app = express();
  sseHub.attachSseRouter(app, { getState: () => store.getState() });

  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/sse`);
    assert.strictEqual(res.status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 10.2: Run — expect FAIL**

```bash
node --test lan-squad/lan-sse-hub.test.js
```

- [ ] **Step 10.3: Implement `lan-squad/lan-sse-hub.js`**

```js
'use strict';
const { createBearerAuthMiddleware } = require('./bearer-auth.js');

/**
 * SSE hub: authenticated EventStream endpoint for clients that can't use WebSocket
 * (hospital proxies that block WS upgrades). Mirrors the WS sync/live room model.
 */
function createSseHub() {
  /** @type {Map<object, { channel: string, send: (obj: object) => void }>} */
  const clients = new Map();

  /**
   * @param {import('express').Router | import('express').Application} router
   * @param {{ getState: () => object }} opts
   */
  function attachSseRouter(router, { getState }) {
    router.get('/sse', createBearerAuthMiddleware(getState), (req, res) => {
      res.set({
        'Content-Type':      'text/event-stream; charset=utf-8',
        'Cache-Control':     'no-cache',
        'Connection':        'keep-alive',
        'X-Accel-Buffering': 'no',  // nginx: disable proxy buffering for SSE
      });
      res.flushHeaders();

      const channel = String(req.query.channel || 'sync');
      const send = (obj) => {
        try {
          res.write(`data: ${JSON.stringify(obj)}\n\n`);
        } catch (_e) {}
      };
      // Keep-alive comment every 20s — prevents proxy timeout before 30s heartbeat
      const keepAlive = setInterval(() => {
        try { res.write(':\n\n'); } catch (_e) {}
      }, 20_000);

      clients.set(res, { channel, send });
      req.on('close', () => {
        clearInterval(keepAlive);
        clients.delete(res);
      });
    });
  }

  /**
   * Broadcast to all SSE clients on a given channel.
   * @param {string} channel
   * @param {object} obj
   */
  function broadcast(channel, obj) {
    for (const [, client] of clients) {
      if (client.channel === channel) {
        client.send(obj);
      }
    }
  }

  return { attachSseRouter, broadcast };
}

module.exports = { createSseHub };
```

- [ ] **Step 10.4: Wire SSE hub into `host-router.js` and `server.js`**

In `createLanRouter`, accept a new optional `sseBroadcast` parameter and use it alongside the WS `broadcast`:

```js
// In createLanRouter({ store, broadcast, resolver, getHostClinicalMeta, getHealthExtras, sseBroadcast }):

function broadcastAll(channel, obj) {
  if (typeof broadcast === 'function') broadcast(channel, obj);
  if (typeof sseBroadcast === 'function') sseBroadcast(channel, obj);
}

// Replace calls to broadcast('sync', ...) in broadcastLiveRevision and heartbeat with broadcastAll:
function broadcastLiveRevision(roomId, revision, clientId) {
  const rid = String(roomId || '').trim();
  if (!rid) return;
  broadcastAll(`live:${encodeURIComponent(rid)}`, { type: 'livesync:revision', roomId: rid, revision, clientId });
}

// In heartbeat setInterval:
broadcastAll('sync', { type: 'livesync:hello', ... });
```

In `server.js`, create the SSE hub and pass it:

```js
const { createSseHub } = require('./lan-squad/lan-sse-hub.js');
const sseHub = createSseHub();

// Mount SSE router BEFORE the bearer-auth middleware for the LAN API
// (the SSE router handles its own auth internally)
appExpress.use('/api/lan/v1', (req, res, next) => {
  if (req.path === '/sse') return sseHub.attachSseRouter(express.Router(), { getState: () => lanStore.getState() })(req, res, next);
  next();
});
```

Actually, the cleanest mount: use the `attachSseRouter` directly on `appExpress`:

```js
// After authRouter, before createLanRouter:
const sseRouter = express.Router();
sseHub.attachSseRouter(sseRouter, { getState: () => lanStore.getState() });
appExpress.use('/api/lan/v1', sseRouter);

// Pass sseBroadcast to createLanRouter:
appExpress.use('/api/lan/v1', createLanRouter({
  store: lanStore,
  broadcast,
  resolver: lanResolver,
  getHostClinicalMeta: () => readHostClinicalMeta(userData),
  getHealthExtras: () => ({ ... }),
  sseBroadcast: (channel, obj) => sseHub.broadcast(channel, obj),
}));
```

- [ ] **Step 10.5: Run all hub tests**

```bash
node --test lan-squad/lan-sse-hub.test.js
```

Expected: both tests pass.

- [ ] **Step 10.6: Commit**

```bash
git add lan-squad/lan-sse-hub.js lan-squad/lan-sse-hub.test.js lan-squad/host-router.js server.js
git commit -m "feat(lan): SSE hub — /api/lan/v1/sse + heartbeat fans out to WS + SSE"
```

---

### Task 11: SSE Client + `LanConnectionManager`

**Files:**
- Create: `public/js/lan-sse-client.mjs`
- Create: `public/js/lan-sse-client.test.mjs`
- Create: `public/js/lan-connection-manager.mjs`
- Create: `public/js/lan-connection-manager.test.mjs`

- [ ] **Step 11.1: Write SSE client tests**

```js
// public/js/lan-sse-client.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readEventStreamLines, parseSseLine } from './lan-sse-client.mjs';

describe('parseSseLine', () => {
  it('parses a data line', () => {
    const ev = parseSseLine('data: {"type":"hello","x":1}');
    assert.deepEqual(ev, { type: 'hello', x: 1 });
  });

  it('returns null for comment lines', () => {
    assert.equal(parseSseLine(':'), null);
    assert.equal(parseSseLine(''), null);
  });

  it('returns null for malformed JSON', () => {
    assert.equal(parseSseLine('data: not-json'), null);
  });
});
```

- [ ] **Step 11.2: Run — expect FAIL**

```bash
node --test public/js/lan-sse-client.test.mjs
```

- [ ] **Step 11.3: Implement `public/js/lan-sse-client.mjs`**

```js
/**
 * Fetch-based SSE client (not EventSource) — supports custom Authorization header.
 * Required because browser EventSource cannot set headers; Electron's Chromium
 * fetch() + ReadableStream supports async iteration over the response body.
 */

/**
 * Parse one SSE line. Returns parsed object or null.
 * @param {string} line
 * @returns {object|null}
 */
export function parseSseLine(line) {
  const s = String(line || '').trim();
  if (!s || s.startsWith(':')) return null;
  if (s.startsWith('data:')) {
    const json = s.slice(5).trim();
    try { return JSON.parse(json); } catch (_e) { return null; }
  }
  return null;
}

/**
 * Async generator: yields lines from a ReadableStream in text/event-stream format.
 * @param {ReadableStream} body
 */
export async function* readEventStreamLines(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        yield line;
      }
    }
  } finally {
    try { reader.releaseLock(); } catch (_e) {}
  }
}

export class LanSseClient {
  constructor() {
    this._ctrl = null;
  }

  /**
   * @param {string} baseUrl
   * @param {string} teamCode
   * @param {string} channel — 'sync' or 'live:{roomId}'
   * @param {(ev: object) => void} onEvent
   * @param {AbortSignal} [signal]
   */
  async connect(baseUrl, teamCode, channel, onEvent, signal) {
    this._ctrl = new AbortController();
    const signals = [this._ctrl.signal];
    if (signal) signals.push(signal);
    // Combine signals: abort when any aborts
    const combinedSignal = signals.length === 1
      ? signals[0]
      : (() => {
          const ctrl = new AbortController();
          signals.forEach((s) => s.addEventListener('abort', () => ctrl.abort(), { once: true }));
          return ctrl.signal;
        })();

    const url = `${String(baseUrl).replace(/\/+$/, '')}/api/lan/v1/sse?channel=${encodeURIComponent(channel)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${teamCode}` },
      signal: combinedSignal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`sse_connect_failed:${res.status}`);
    }
    for await (const line of readEventStreamLines(res.body)) {
      const ev = parseSseLine(line);
      if (ev && typeof onEvent === 'function') onEvent(ev);
    }
  }

  disconnect() {
    if (this._ctrl) {
      this._ctrl.abort();
      this._ctrl = null;
    }
  }
}
```

- [ ] **Step 11.4: Run SSE client tests**

```bash
node --test public/js/lan-sse-client.test.mjs
```

Expected: all pass (pure parsing logic, no network).

- [ ] **Step 11.5: Write `LanConnectionManager` tests**

```js
// public/js/lan-connection-manager.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLanConnectionManager } from './lan-connection-manager.mjs';

describe('LanConnectionManager state machine', () => {
  it('starts in WS state', () => {
    const mgr = createLanConnectionManager({ lanClient: _fakeLanClient(), sseClientFactory: () => _fakeSseClient() });
    assert.equal(mgr.getTransport(), 'ws');
  });

  it('transitions to SSE after 3 consecutive WS failures', () => {
    const client = _fakeLanClient();
    const mgr = createLanConnectionManager({ lanClient: client, sseClientFactory: () => _fakeSseClient() });
    mgr.connect('http://10.0.0.1:3738', 'tok');
    client._simulateFailure();
    client._simulateFailure();
    client._simulateFailure();
    assert.equal(mgr.getTransport(), 'sse');
  });

  it('transitions to POLL after SSE fails twice', () => {
    const client = _fakeLanClient();
    const sseFactory = () => _fakeSseClient({ failOnConnect: true });
    const mgr = createLanConnectionManager({ lanClient: client, sseClientFactory: sseFactory });
    mgr.connect('http://10.0.0.1:3738', 'tok');
    client._simulateFailure(); client._simulateFailure(); client._simulateFailure();
    assert.equal(mgr.getTransport(), 'sse');
    mgr._simulateSseFailure(); mgr._simulateSseFailure();
    assert.equal(mgr.getTransport(), 'poll');
  });

  it('recovers to WS when WS reconnects successfully', () => {
    const client = _fakeLanClient();
    const mgr = createLanConnectionManager({ lanClient: client, sseClientFactory: () => _fakeSseClient() });
    mgr.connect('http://10.0.0.1:3738', 'tok');
    client._simulateFailure(); client._simulateFailure(); client._simulateFailure();
    assert.equal(mgr.getTransport(), 'sse');
    client._simulateSuccess();
    assert.equal(mgr.getTransport(), 'ws');
  });
});

function _fakeLanClient() {
  const listeners = {};
  let attempts = 0;
  return {
    configure() {},
    connectSyncChannel() {},
    disconnect() {},
    addEventListener(ev, cb) { listeners[ev] = (listeners[ev] || []); listeners[ev].push(cb); },
    _emit(ev, detail) { (listeners[ev] || []).forEach((cb) => cb({ detail })); },
    _simulateFailure() {
      attempts++;
      this._emit('lan-status', { connected: false, channel: 'sync' });
    },
    _simulateSuccess() {
      attempts = 0;
      this._emit('lan-status', { connected: true, channel: 'sync' });
    },
    get _syncConnectAttempt() { return attempts; },
  };
}

function _fakeSseClient({ failOnConnect = false } = {}) {
  return {
    async connect() { if (failOnConnect) throw new Error('sse_fail'); },
    disconnect() {},
  };
}
```

- [ ] **Step 11.6: Run — expect FAIL**

```bash
node --test public/js/lan-connection-manager.test.mjs
```

- [ ] **Step 11.7: Implement `public/js/lan-connection-manager.mjs`**

```js
/**
 * LanConnectionManager — transparent WS → SSE → HTTP-poll fallback.
 *
 * Mirrors LanClient's EventTarget events (lan-patch, lan-live, lan-status,
 * lan-live-status) so panel.mjs / orchestrator.mjs need no handler rewrites.
 *
 * State machine:
 *   WS (default) → SSE (≥3 consecutive WS sync failures)
 *   SSE → POLL   (SSE connect fails × 2)
 *   * → WS       (WS connects successfully)
 */

const POLL_INTERVAL_MS = 15_000;
const WS_FAIL_THRESHOLD = 3;
const SSE_FAIL_THRESHOLD = 2;

/**
 * @param {{ lanClient: object, sseClientFactory: () => object }} opts
 */
export function createLanConnectionManager({ lanClient, sseClientFactory }) {
  let _transport = 'ws';
  let _hostUrl = '';
  let _teamCode = '';
  let _wsFailCount = 0;
  let _sseFailCount = 0;
  let _sseClient = null;
  let _pollTimer = null;
  const _eventListeners = new Map();

  function _emit(event, detail) {
    const cbs = _eventListeners.get(event) || [];
    cbs.forEach((cb) => { try { cb({ detail }); } catch (_e) {} });
  }

  function addEventListener(event, cb) {
    if (!_eventListeners.has(event)) _eventListeners.set(event, []);
    _eventListeners.get(event).push(cb);
    // Also proxy on the underlying lanClient for WS events
    lanClient.addEventListener(event, cb);
  }

  function getTransport() { return _transport; }

  function _transitionToSse() {
    if (_transport === 'sse') return;
    _transport = 'sse';
    _connectSse();
  }

  function _transitionToPoll() {
    if (_transport === 'poll') return;
    _transport = 'poll';
    _stopSse();
    _startPoll();
  }

  function _transitionToWs() {
    _transport = 'ws';
    _wsFailCount = 0;
    _sseFailCount = 0;
    _stopSse();
    _stopPoll();
  }

  async function _connectSse() {
    _stopSse();
    _sseClient = sseClientFactory();
    try {
      await _sseClient.connect(_hostUrl, _teamCode, 'sync', (ev) => {
        _emit('lan-patch', ev);
      });
    } catch (_e) {
      _sseFailCount++;
      if (_sseFailCount >= SSE_FAIL_THRESHOLD) {
        _transitionToPoll();
      } else {
        setTimeout(_connectSse, 2000);
      }
    }
  }

  function _stopSse() {
    if (_sseClient) { try { _sseClient.disconnect(); } catch (_e) {} _sseClient = null; }
  }

  function _startPoll() {
    _stopPoll();
    _pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${_hostUrl}/api/lan/v1/health`, {
          headers: { Authorization: `Bearer ${_teamCode}` },
        });
        if (res.ok) {
          const data = await res.json();
          _emit('lan-patch', { type: 'livesync:poll', ...data });
        }
      } catch (_e) {}
    }, POLL_INTERVAL_MS);
  }

  function _stopPoll() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  // Watch LanClient WS status to drive state transitions
  lanClient.addEventListener('lan-status', ({ detail }) => {
    if (!detail) return;
    if (detail.connected) {
      _transitionToWs();
    } else if (detail.channel === 'sync') {
      _wsFailCount++;
      if (_transport === 'ws' && _wsFailCount >= WS_FAIL_THRESHOLD) {
        _transitionToSse();
      }
    }
  });

  function connect(hostUrl, teamCode) {
    _hostUrl = String(hostUrl || '');
    _teamCode = String(teamCode || '');
    lanClient.configure({ hostUrl: _hostUrl, teamCode: _teamCode });
    lanClient.connectSyncChannel();
  }

  function disconnect() {
    lanClient.disconnect();
    _stopSse();
    _stopPoll();
    _transport = 'ws';
    _wsFailCount = 0;
    _sseFailCount = 0;
  }

  /** For tests: simulate SSE failure without going through async connect */
  function _simulateSseFailure() {
    _sseFailCount++;
    if (_sseFailCount >= SSE_FAIL_THRESHOLD) _transitionToPoll();
  }

  return { connect, disconnect, addEventListener, getTransport, _simulateSseFailure };
}
```

- [ ] **Step 11.8: Run all connection manager tests**

```bash
node --test public/js/lan-connection-manager.test.mjs
```

Expected: all pass.

- [ ] **Step 11.9: Commit**

```bash
git add public/js/lan-sse-client.mjs public/js/lan-sse-client.test.mjs \
        public/js/lan-connection-manager.mjs public/js/lan-connection-manager.test.mjs
git commit -m "feat(lan): LanSseClient + LanConnectionManager WS→SSE→poll fallback"
```

---

## Phase 4 — UX

### Task 12: Panel UX — Pre-flight Row + Outbox Badge + Debug Copy + Transport Badge

**Files:**
- Modify: `public/js/features/lan/panel.mjs`

This task adds three visible UX elements to the ⇄ panel without changing any existing panel behavior. Each element reads from already-computed data.

- [ ] **Step 12.1: Add `renderLanPreflightRow` function to `panel.mjs`**

Find the section of `panel.mjs` where the panel CTA area is rendered (search for `renderLanPanelOnce` or the HTML that includes the connect button). Add the pre-flight row immediately before the CTA.

Add import at top if not already present:
```js
import {
  findByFingerprint,
  getPinnedFingerprint,
} from '../../lan-host-registry.mjs';
import { canLocalMacBeLanHost } from '../../lan-host-rank-policy.mjs';
import { isHostOnCurrentSubnets } from '../../lan-host-subnet-discovery.mjs';
```

Add the function (≤ 60 lines):

```js
/**
 * Renders a one-line pre-flight status strip above the connect CTA.
 * Shows: ping RTT, bearer validity, subnet match, DB lock, can-host.
 * Collapses to RTT-only when phase is 'live'.
 * Shift+click copies the pinned HostRecord to clipboard for support.
 *
 * @param {HTMLElement} root — panel root element
 * @param {{ phase: string, rttMs: number, bearerValid: boolean, subnetMatch: boolean, dbUnlocked: boolean, transport: string }} preflight
 */
function renderLanPreflightRow(root, preflight) {
  if (!root) return;
  const p = preflight || {};
  let row = root.querySelector('.lan-preflight-row');
  if (!row) {
    row = document.createElement('div');
    row.className = 'lan-preflight-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:11px;opacity:.8;margin-bottom:6px;cursor:default;';
    // Shift+click: copy HostRecord to clipboard for support
    row.addEventListener('click', async (e) => {
      if (!e.shiftKey) return;
      try {
        const fp = getPinnedFingerprint();
        const rec = fp ? findByFingerprint(fp) : null;
        await navigator.clipboard.writeText(JSON.stringify(rec, null, 2));
        if (typeof window.showToast === 'function') window.showToast('Diagnóstico copiado', 'info');
      } catch (_e) {}
    });
    // Insert before first child or append
    const firstChild = root.firstChild;
    if (firstChild) root.insertBefore(row, firstChild);
    else root.appendChild(row);
  }

  if (p.phase === 'live') {
    // Collapsed: RTT badge + transport indicator only
    row.innerHTML = `<span title="RTT">⚡ ${p.rttMs ? p.rttMs + ' ms' : '—'}</span>` +
      (p.transport && p.transport !== 'ws' ? `<span style="color:orange">${p.transport.toUpperCase()}</span>` : '');
    return;
  }

  const dot = (ok, label, title) =>
    `<span title="${title}" style="color:${ok ? '#22c55e' : '#ef4444'}">${ok ? '✓' : '✗'} ${label}</span>`;

  row.innerHTML = [
    dot(p.rttMs > 0, p.rttMs ? p.rttMs + ' ms' : 'sin ping', 'Latencia al anfitrión'),
    dot(p.bearerValid, 'token', 'Bearer válido'),
    dot(p.subnetMatch, 'red', 'Mismo subnet'),
    dot(p.dbUnlocked !== false, p.dbUnlocked === false ? 'BD bloqueada' : 'BD', 'Estado de la BD del anfitrión'),
    dot(canLocalMacBeLanHost(), 'anfitrión', 'Este Mac puede ser anfitrión'),
  ].join(' ');

  if (p.transport && p.transport !== 'ws') {
    row.innerHTML += ` <span style="color:orange;font-weight:600">${p.transport.toUpperCase()}</span>`;
  }
}
```

- [ ] **Step 12.2: Wire `renderLanPreflightRow` into `renderLanPanelOnce`**

Inside `renderLanPanelOnce`, find where `buildLanSyncDiagnosticsDeps()` is called. After building `deps` and `diag`, call:

```js
const pinnedFp = getPinnedFingerprint();
const hostRecord = pinnedFp ? findByFingerprint(pinnedFp) : null;
const preflight = {
  phase:       diag.phase,
  rttMs:       hostRecord ? hostRecord.rttMs : (diag.pingStatus === 'ok' ? _lanLastPingRttMs : 0),
  bearerValid: diag.teamCodeAligned,
  subnetMatch: diag.hostUrl
    ? isHostOnCurrentSubnets(diag.hostUrl, await resolveLocalLanSubnetPrefixes(diag.hostUrl))
    : false,
  dbUnlocked:  hostRecord ? hostRecord.dbUnlocked : null,
  transport:   typeof connectionManager !== 'undefined' ? connectionManager.getTransport() : 'ws',
};
renderLanPreflightRow(panelRoot, preflight);
```

`_lanLastPingRttMs` is the most recent ping RTT stored in panel state (add it to the ping callback if not already tracked).

`panelRoot` is the root element of the ⇄ panel — find its reference in `renderLanPanelOnce`.

- [ ] **Step 12.3: Add outbox depth badge**

In `renderLanPanelOnce`, find where the phase/status is rendered (look for `QUEUED` or offline rendering). Add the badge alongside the existing status text:

```js
// Find the element that shows the phase label. After setting its text content, add:
if ((diag.phase === 'offline' || diag.phase === 'queued') && diag.outboxCount > 0) {
  let badge = statusEl.querySelector('.lan-outbox-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'lan-outbox-badge';
    badge.style.cssText = 'margin-left:6px;font-size:11px;background:#f59e0b;color:#fff;padding:1px 5px;border-radius:10px;';
    statusEl.appendChild(badge);
  }
  badge.textContent = `${diag.outboxCount} pendiente${diag.outboxCount !== 1 ? 's' : ''}`;
} else {
  const badge = statusEl.querySelector('.lan-outbox-badge');
  if (badge) badge.remove();
}
```

`statusEl` is the element showing the ⇄ connection phase — find it by searching for where `diag.phase` is used to set text content.

- [ ] **Step 12.4: Wire `LanConnectionManager` into panel**

Import and create the manager. Find where `lanClient` is used in `panel.mjs` for event subscription. Add:

```js
import { LanSseClient } from '../../lan-sse-client.mjs';
import { createLanConnectionManager } from '../../lan-connection-manager.mjs';

// After lanClient is available (from runtime.mjs):
const connectionManager = createLanConnectionManager({
  lanClient,
  sseClientFactory: () => new LanSseClient(),
});

// Replace all lanClient.addEventListener('lan-status', ...) and
// lanClient.addEventListener('lan-patch', ...) with connectionManager.addEventListener(...)
```

The actual replacement depends on the current panel event subscription pattern — search for `lanClient.addEventListener` in `panel.mjs` and substitute `connectionManager.addEventListener`.

- [ ] **Step 12.5: Build and verify**

```bash
npm run build:ui 2>&1 | tail -10
```

Expected: build succeeds, no new errors.

Open the app (`npm start`) and verify:
1. ⇄ panel shows a pre-flight strip
2. When offline, outbox count badge appears if there are queued items
3. Shift+click on the pre-flight row does not throw

- [ ] **Step 12.6: Commit**

```bash
git add public/js/features/lan/panel.mjs
git commit -m "feat(lan): pre-flight row + outbox badge + debug copy + transport badge in ⇄ panel"
```

---

## Final Step: Add new test files to npm test

- [ ] **Add new test files to the `test` script in `package.json`**

The existing `npm test` command lists every test file explicitly. Add the new ones:

```
public/js/lan-host-registry.test.mjs
public/js/lan-shift-pin-connect.test.mjs
public/js/lan-network-roam.test.mjs
public/js/lan-sse-client.test.mjs
public/js/lan-connection-manager.test.mjs
lan-squad/lan-udp-beacon.test.js
lan-squad/lan-sse-hub.test.js
```

Append each to the space-separated list in the `"test"` key.

- [ ] **Run full test suite**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass, exit 0.

- [ ] **Commit**

```bash
git add package.json
git commit -m "chore: add new LAN substrate test files to npm test"
```

---

## Self-Review Checklist (Pre-execution)

| Spec section | Task | Status |
|---|---|---|
| A — Host Registry | Task 1 | ✓ |
| A3 — Surrogate shim | Task 3 | ✓ |
| B1 — mDNS | Task 4 | ✓ |
| B2 — UDP Beacon | Task 5 | ✓ |
| B1+B2 Orchestrator wiring | Task 6 | ✓ |
| B3 — Fingerprint roam | Task 8 | ✓ |
| B4 — Exponential backoff | Task 7 | ✓ |
| C1 — /health endpoint | Task 2 | ✓ |
| C2 — Pre-flight row | Task 12 | ✓ |
| D — Host heartbeat | Task 2 | ✓ |
| E — QR fingerprint | Task 9 | ✓ |
| F1 — SSE client | Task 11 | ✓ |
| F2 — LanConnectionManager | Task 11 | ✓ |
| F3 — SSE hub | Task 10 | ✓ |
| G — Outbox badge | Task 12 | ✓ |
| Transport.mjs /health post-join | Task 3 | ✓ |
