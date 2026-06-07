# LiveSync P0 Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate peer-join WS gossip bundles (replace with revision hints) and add HTTP gzip compression on `/api/lan/v1/*` — two isolated changes that produce measurable bandwidth savings with zero risk to the sync protocol.

**Architecture:** Gossip fix: replace one async block in `room.mjs` that broadcasts a full bundle on `livesync:hello` with a call to `emitLiveSyncRevisionHint`. Compression: install `compression` npm package, add one `app.use` line before the LAN router in `server.js`.

**Tech Stack:** Node.js ES modules (`room.mjs`), CommonJS (`server.js`), `compression` npm package, `node --test` test runner.

---

## Scope check

This plan is fully independent of Plan B and Plan C. It produces working, testable software on its own and can be deployed to production before the other plans.

---

## Task 1: Fix peer-join gossip (WS bundle → revision hint)

**Context:** When a new peer joins the WS room and broadcasts `livesync:hello`, every connected Mac calls `buildLiveSyncBundleEnvelope` and sends a full ~100KB bundle over the WS channel — redundant, since the new joiner already does `GET /sync-bundle` via HTTP. The fix replaces this with `emitLiveSyncRevisionHint`, a ~60-byte message that tells the joiner to reconcile.

**Files:**
- Modify: `public/js/features/lan/room.mjs:49-60` (import block)
- Modify: `public/js/features/lan/room.mjs:717-724` (hello handler)
- Modify: `public/js/lan-sync-wiring.test.mjs` (add contract test)

---

- [ ] **Step 1: Add the gossip-fix contract test**

Open `public/js/lan-sync-wiring.test.mjs`. After the existing test that asserts `buildLiveSyncBundleEnvelope` is wired, add:

```js
it('livesync:hello handler sends revision hint, NOT a full WS bundle', () => {
  // Verify the hello handler calls emitLiveSyncRevisionHint
  assert.match(
    lanSyncRoom,
    /livesync:hello[\s\S]{0,300}emitLiveSyncRevisionHint/,
    'hello handler must call emitLiveSyncRevisionHint'
  );
  // Verify it does NOT call buildLiveSyncBundleEnvelope inside the hello block
  // (it may still be defined/imported, but not called in the hello handler)
  const helloBlock = lanSyncRoom.slice(
    lanSyncRoom.indexOf("data.type === 'livesync:hello' && data.clientId !== myId"),
    lanSyncRoom.indexOf("data.type === 'livesync:hello' && data.clientId !== myId") + 400
  );
  assert.doesNotMatch(
    helloBlock,
    /buildLiveSyncBundleEnvelope/,
    'hello handler must not call buildLiveSyncBundleEnvelope'
  );
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /Users/mauriciosalas/R+
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | tail -20
```

Expected: test fails with `'hello handler must call emitLiveSyncRevisionHint'` assertion.

- [ ] **Step 3: Add `emitLiveSyncRevisionHint` to the `push.mjs` import in `room.mjs`**

Open `public/js/features/lan/room.mjs`. Find the import block at lines 49–60:

```js
import {
  registerLanSyncPushBridge,
  pushRoomSyncBundleToHost,
  pushClinicalOpsLanNow,
  reconcileLiveSyncRoom,
  flushLiveSyncOutbox,
  scheduleLiveSyncOutboxFlush,
  scheduleLiveSyncPush,
  scheduleReconcileFromRevisionHint,
  liveSyncBundleHasPayload,
  ensureEffectiveLiveSyncRoomId,
} from './push.mjs';
```

Replace with:

```js
import {
  registerLanSyncPushBridge,
  pushRoomSyncBundleToHost,
  pushClinicalOpsLanNow,
  reconcileLiveSyncRoom,
  flushLiveSyncOutbox,
  scheduleLiveSyncOutboxFlush,
  scheduleLiveSyncPush,
  scheduleReconcileFromRevisionHint,
  emitLiveSyncRevisionHint,
  liveSyncBundleHasPayload,
  ensureEffectiveLiveSyncRoomId,
} from './push.mjs';
```

- [ ] **Step 4: Replace the gossip bundle block with a revision hint**

In `public/js/features/lan/room.mjs`, find lines 717–724:

```js
    if (data.type === 'livesync:hello' && data.clientId !== myId && activeLiveSyncRoomId) {
      scheduleClinicalOpsPullFromHost(activeLiveSyncRoomId);
      void (async function () {
        try {
          lanClient.sendLive(await buildLiveSyncBundleEnvelope(activeLiveSyncRoomId));
        } catch (_eHelloBundle) {}
      })();
    }
```

Replace with:

```js
    if (data.type === 'livesync:hello' && data.clientId !== myId && activeLiveSyncRoomId) {
      scheduleClinicalOpsPullFromHost(activeLiveSyncRoomId);
      const bases = getHostBundleBases(activeLiveSyncRoomId);
      emitLiveSyncRevisionHint(activeLiveSyncRoomId, bases ? bases.revision : 0);
    }
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | tail -20
```

Expected: all tests pass, including the new one.

- [ ] **Step 6: Run the full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: no new failures (the gossip fix is transparent to all existing tests).

- [ ] **Step 7: Commit**

```bash
git add public/js/features/lan/room.mjs public/js/lan-sync-wiring.test.mjs
git commit -m "perf(lan): replace peer-join gossip bundle with revision hint

livesync:hello from a new peer no longer triggers every connected Mac
to send a full WS sync bundle. Each peer now sends a livesync:revision
hint (~60 bytes) instead. The new joiner already reconciles via HTTP
GET /sync-bundle on join — the WS bundles were redundant.

In a 6-Mac room this reduces join traffic from ~600KB to ~360 bytes."
```

---

## Task 2: Add HTTP compression on LAN API

**Context:** LAN sync-bundle responses are JSON, typically 50–300KB. gzip compresses them 4–8×. `compression` is not currently installed; it must be added as a direct dependency. Express 5 is in use — `compression` is compatible.

**Files:**
- Modify: `package.json` (add `compression` dependency)
- Modify: `server.js` (add middleware before LAN router mount)

---

- [ ] **Step 1: Install `compression`**

```bash
cd /Users/mauriciosalas/R+
npm install compression
```

Expected output includes `added 1 package` (or similar) and exits with code 0.

- [ ] **Step 2: Verify the module is available**

```bash
node -e "require('compression'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Add compression middleware in `server.js`**

Open `server.js`. Find the `require` block at the top of the file (around line 1–15). Add:

```js
const compression = require('compression');
```

after the existing `require` statements (e.g., after the `express` require).

Then find the block around lines 312–321:

```js
appExpress.use('/api/lan/v1', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/auth/exchange') {
    return authExchangeLimiter(req, res, next);
  }
  if (req.method === 'POST' && req.path === '/auth/tickets') {
    return authTicketLimiter(req, res, next);
  }
  next();
});
appExpress.use('/api/lan/v1', authRouter);
```

Insert one line **before** this block:

```js
appExpress.use('/api/lan/v1', compression({ threshold: 2048 }));
```

So the block becomes:

```js
appExpress.use('/api/lan/v1', compression({ threshold: 2048 }));
appExpress.use('/api/lan/v1', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/auth/exchange') {
    return authExchangeLimiter(req, res, next);
  }
  if (req.method === 'POST' && req.path === '/auth/tickets') {
    return authTicketLimiter(req, res, next);
  }
  next();
});
appExpress.use('/api/lan/v1', authRouter);
```

The `threshold: 2048` option skips compression for responses smaller than 2KB (ping, revision hints, small typed mutation responses) and compresses larger ones (sync-bundle, clinical-ops). This avoids unnecessary CPU overhead on the fast path.

- [ ] **Step 4: Verify compression is active (manual smoke test)**

Start the server and send a request with `Accept-Encoding: gzip` to the ping endpoint:

```bash
npm start &
sleep 3
curl -s -I -H "Accept-Encoding: gzip" http://localhost:3738/api/lan/v1/ping
```

Expected: response headers include `Content-Encoding: gzip` (or no Content-Encoding if the ping response is below threshold — either is correct). Check the `/rooms` endpoint for a larger response:

```bash
curl -s -I -H "Accept-Encoding: gzip" http://localhost:3738/api/lan/v1/rooms
```

Expected: `Content-Encoding: gzip` present when a room exists.

> Note: The server runs on port 3738 by default. If it doesn't start cleanly, check `main.js` for the server port.

- [ ] **Step 5: Commit**

```bash
git add server.js package.json package-lock.json
git commit -m "perf(lan): add gzip compression on /api/lan/v1 responses

Adds compression middleware before the LAN router. threshold:2048 keeps
small responses (ping, hints, mutations) uncompressed and compresses
sync-bundle and clinical-ops payloads. Ward JSON bundles typically
compress 4-8x, reducing ~200KB sync-bundle to ~30-50KB on the wire."
```

---

## Acceptance verification

Run both checks before declaring done:

```bash
# 1. All tests pass
npm test 2>&1 | grep -E '(pass|fail|ok)' | tail -10

# 2. Gossip test specifically
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | grep -E '(pass|fail|ok)'
```

Expected: all green, no regressions in `lan-sync-wiring.test.mjs`.
