# LiveSync P2 Network Intelligence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic RTT-based network profiling (FAST / SLOW / OFFLINE) that adapts sync parameters to hospital Wi-Fi conditions and stops all background network activity when the host is unreachable, requiring user-initiated reconnection.

**Architecture:** New module `lan-network-profile.mjs` implements a 3-state machine with hysteresis. It exposes `recordPingSuccess`, `recordPingFailure`, `recordRttSample`, `getNetworkProfile`, and `userInitiatedReconnect`. Profile changes are broadcast via a simple subscriber list. `panel.mjs` subscribes and shows the OFFLINE banner + "Reconectar" button. `push.mjs` consults the profile for adaptive debounce and scan intervals. `panel.mjs` wires `startLanAutoDiscovery` / `stopLanAutoDiscovery` to profile state.

**Tech Stack:** ES modules (`public/js/`), `node --test` runner.

---

## Dependency

Plan B (P1 Core) must be merged first. Plan C can be applied to a branch that has both Plan A and Plan B.

---

## Task 1: `lan-network-profile.mjs` — 3-state RTT machine

**Files:**
- Create: `public/js/lan-network-profile.mjs`
- Create: `public/js/lan-network-profile.test.mjs`

---

- [ ] **Step 1: Create the failing tests**

Create `public/js/lan-network-profile.test.mjs`:

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Helper: import a fresh module instance for each test by appending a query param.
// This works for node:test because each dynamic import with a unique specifier
// gets its own module graph.
async function freshProfile() {
  const { createNetworkProfile } = await import('./lan-network-profile.mjs');
  return createNetworkProfile();
}

describe('createNetworkProfile', () => {
  it('starts in fast state', async () => {
    const p = await freshProfile();
    assert.equal(p.getNetworkProfile(), 'fast');
  });

  it('transitions FAST → SLOW after 3 consecutive slow pings', async () => {
    const p = await freshProfile();
    p.recordPingSuccess(600); // RTT > 500ms
    p.recordPingSuccess(600);
    assert.equal(p.getNetworkProfile(), 'fast', 'still fast after 2 slow readings');
    p.recordPingSuccess(600);
    assert.equal(p.getNetworkProfile(), 'slow', 'slow after 3 consecutive slow readings');
  });

  it('transitions SLOW → FAST after 5 consecutive fast pings', async () => {
    const p = await freshProfile();
    // Get to SLOW first
    p.recordPingSuccess(600);
    p.recordPingSuccess(600);
    p.recordPingSuccess(600);
    assert.equal(p.getNetworkProfile(), 'slow');
    // Now recover
    p.recordPingSuccess(100);
    p.recordPingSuccess(100);
    p.recordPingSuccess(100);
    p.recordPingSuccess(100);
    assert.equal(p.getNetworkProfile(), 'slow', 'still slow after 4 fast readings');
    p.recordPingSuccess(100);
    assert.equal(p.getNetworkProfile(), 'fast', 'fast after 5 consecutive fast readings');
  });

  it('transitions FAST → OFFLINE after 5 consecutive ping failures', async () => {
    const p = await freshProfile();
    for (let i = 0; i < 4; i++) p.recordPingFailure();
    assert.equal(p.getNetworkProfile(), 'fast', 'still fast after 4 failures');
    p.recordPingFailure();
    assert.equal(p.getNetworkProfile(), 'offline');
  });

  it('transitions SLOW → OFFLINE after 3 consecutive ping failures', async () => {
    const p = await freshProfile();
    p.recordPingSuccess(600); p.recordPingSuccess(600); p.recordPingSuccess(600);
    assert.equal(p.getNetworkProfile(), 'slow');
    p.recordPingFailure(); p.recordPingFailure();
    assert.equal(p.getNetworkProfile(), 'slow', 'still slow after 2 failures');
    p.recordPingFailure();
    assert.equal(p.getNetworkProfile(), 'offline');
  });

  it('a single fast ping does not reset SLOW→FAST counter', async () => {
    const p = await freshProfile();
    p.recordPingSuccess(600); p.recordPingSuccess(600); p.recordPingSuccess(600);
    p.recordPingSuccess(100); p.recordPingSuccess(100); p.recordPingSuccess(100); p.recordPingSuccess(100);
    p.recordPingSuccess(600); // one slow ping resets counter
    p.recordPingSuccess(100); p.recordPingSuccess(100); p.recordPingSuccess(100); p.recordPingSuccess(100); p.recordPingSuccess(100);
    // After the reset + 5 fast, should be fast now
    assert.equal(p.getNetworkProfile(), 'fast');
  });

  it('userInitiatedReconnect resolves to fast when ping succeeds with low RTT', async () => {
    const p = await freshProfile();
    // Force offline
    for (let i = 0; i < 5; i++) p.recordPingFailure();
    assert.equal(p.getNetworkProfile(), 'offline');
    // Simulate reconnect: inject a successful ping result
    const promise = p.userInitiatedReconnect();
    p._simulatePingResult(true, 80);
    const result = await promise;
    assert.ok(['fast', 'slow'].includes(result), 'must resolve to fast or slow');
    assert.equal(p.getNetworkProfile(), result);
  });

  it('userInitiatedReconnect stays offline when ping fails', async () => {
    const p = await freshProfile();
    for (let i = 0; i < 5; i++) p.recordPingFailure();
    const promise = p.userInitiatedReconnect();
    p._simulatePingResult(false, 0);
    const result = await promise;
    assert.equal(result, 'offline');
    assert.equal(p.getNetworkProfile(), 'offline');
  });

  it('subscribeNetworkProfile calls callback on transition', async () => {
    const p = await freshProfile();
    const transitions = [];
    const unsub = p.subscribeNetworkProfile((profile) => transitions.push(profile));
    p.recordPingSuccess(600); p.recordPingSuccess(600); p.recordPingSuccess(600);
    assert.deepEqual(transitions, ['slow']);
    for (let i = 0; i < 3; i++) p.recordPingFailure();
    assert.deepEqual(transitions, ['slow', 'offline']);
    unsub();
    for (let i = 0; i < 5; i++) p.recordPingSuccess(100); // would be fast, but unsub
    assert.deepEqual(transitions, ['slow', 'offline'], 'no callback after unsubscribe');
  });

  it('resetProfile returns to fast', async () => {
    const p = await freshProfile();
    for (let i = 0; i < 5; i++) p.recordPingFailure();
    assert.equal(p.getNetworkProfile(), 'offline');
    p.resetProfile();
    assert.equal(p.getNetworkProfile(), 'fast');
  });

  it('getLastRttMs returns the most recent ping RTT', async () => {
    const p = await freshProfile();
    assert.equal(p.getLastRttMs(), 0);
    p.recordPingSuccess(123);
    assert.equal(p.getLastRttMs(), 123);
    p.recordPingSuccess(200);
    assert.equal(p.getLastRttMs(), 200);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd /Users/mauriciosalas/R+
node --test public/js/lan-network-profile.test.mjs 2>&1 | tail -10
```

Expected: module-not-found errors.

- [ ] **Step 3: Implement `lan-network-profile.mjs`**

Create `public/js/lan-network-profile.mjs`:

```js
/**
 * LAN network profile — 3-state RTT machine (fast / slow / offline).
 *
 * Thresholds and hysteresis:
 *   FAST → SLOW  : RTT > 500ms for 3 consecutive pings
 *   SLOW → FAST  : RTT < 200ms for 5 consecutive pings  (resets on any slow ping)
 *   FAST → OFFLINE: ping failure × 5 consecutive
 *   SLOW → OFFLINE: ping failure × 3 consecutive
 *   OFFLINE → * : only via userInitiatedReconnect()
 */

const RTT_SLOW_THRESHOLD_MS = 500;
const RTT_FAST_THRESHOLD_MS = 200;
const FAST_TO_SLOW_COUNT = 3;
const SLOW_TO_FAST_COUNT = 5;
const FAST_TO_OFFLINE_FAIL_COUNT = 5;
const SLOW_TO_OFFLINE_FAIL_COUNT = 3;

export function createNetworkProfile() {
  let profile = 'fast';
  let consecutiveSlowCount = 0;
  let consecutiveFastCount = 0;
  let consecutiveFailCount = 0;
  let lastRttMs = 0;
  const subscribers = new Set();
  let reconnectResolve = null;

  function notify(newProfile) {
    for (const cb of subscribers) {
      try { cb(newProfile); } catch (_) {}
    }
  }

  function transition(newProfile) {
    if (newProfile === profile) return;
    profile = newProfile;
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    consecutiveFailCount = 0;
    notify(profile);
  }

  function recordPingSuccess(rttMs) {
    if (profile === 'offline') return;
    lastRttMs = Number(rttMs) || 0;
    consecutiveFailCount = 0;

    if (rttMs > RTT_SLOW_THRESHOLD_MS) {
      consecutiveSlowCount++;
      consecutiveFastCount = 0; // reset fast counter on any slow ping
      if (profile === 'fast' && consecutiveSlowCount >= FAST_TO_SLOW_COUNT) {
        transition('slow');
      }
    } else if (rttMs < RTT_FAST_THRESHOLD_MS) {
      consecutiveFastCount++;
      consecutiveSlowCount = 0;
      if (profile === 'slow' && consecutiveFastCount >= SLOW_TO_FAST_COUNT) {
        transition('fast');
      }
    } else {
      // In the middle range (200-500ms): don't change counters for either transition
      consecutiveFastCount = 0;
      consecutiveSlowCount = 0;
    }
  }

  function recordPingFailure() {
    if (profile === 'offline') return;
    consecutiveFailCount++;
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    const threshold = profile === 'slow' ? SLOW_TO_OFFLINE_FAIL_COUNT : FAST_TO_OFFLINE_FAIL_COUNT;
    if (consecutiveFailCount >= threshold) {
      transition('offline');
    }
  }

  function recordRttSample(rttMs) {
    // RTT from non-ping sources (bundle PUT, reconcile GET) — use same logic as ping
    recordPingSuccess(rttMs);
  }

  function getNetworkProfile() {
    return profile;
  }

  function getLastRttMs() {
    return lastRttMs;
  }

  function subscribeNetworkProfile(cb) {
    subscribers.add(cb);
    return function unsubscribe() { subscribers.delete(cb); };
  }

  function resetProfile() {
    profile = 'fast';
    consecutiveSlowCount = 0;
    consecutiveFastCount = 0;
    consecutiveFailCount = 0;
    lastRttMs = 0;
    if (reconnectResolve) {
      reconnectResolve('fast');
      reconnectResolve = null;
    }
  }

  /**
   * User-initiated reconnect: the caller does one ping and reports result.
   * Returns a Promise that resolves to the new profile ('fast' | 'slow' | 'offline').
   *
   * In production, panel.mjs calls this, then passes the ping result via
   * _simulatePingResult (or directly by calling recordPingSuccess/Failure).
   * The promise resolves on the next profile update (or stays offline on failure).
   */
  function userInitiatedReconnect() {
    return new Promise(function (resolve) {
      if (profile !== 'offline') {
        resolve(profile);
        return;
      }
      reconnectResolve = resolve;
    });
  }

  /**
   * For tests and panel integration: report the ping result for an in-flight
   * userInitiatedReconnect(). Also calls recordPingSuccess/Failure.
   *
   * @param {boolean} ok
   * @param {number} rttMs
   */
  function _simulatePingResult(ok, rttMs) {
    if (ok) {
      // Temporarily lift from offline to evaluate the ping
      profile = rttMs <= RTT_SLOW_THRESHOLD_MS ? 'fast' : 'slow';
      lastRttMs = Number(rttMs) || 0;
      consecutiveFailCount = 0;
      const newProfile = profile;
      notify(newProfile);
      if (reconnectResolve) {
        reconnectResolve(newProfile);
        reconnectResolve = null;
      }
    } else {
      if (reconnectResolve) {
        reconnectResolve('offline');
        reconnectResolve = null;
      }
    }
  }

  return {
    recordPingSuccess,
    recordPingFailure,
    recordRttSample,
    getNetworkProfile,
    getLastRttMs,
    subscribeNetworkProfile,
    userInitiatedReconnect,
    resetProfile,
    _simulatePingResult,
  };
}

/** Production singleton. Wired in orchestrator.mjs / panel.mjs at boot. */
export const lanNetworkProfile = createNetworkProfile();
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
node --test public/js/lan-network-profile.test.mjs 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/js/lan-network-profile.mjs public/js/lan-network-profile.test.mjs
git commit -m "feat(lan): network profile state machine (fast/slow/offline)

3-state RTT machine with hysteresis: FAST→SLOW on 3× slow pings
(RTT>500ms), SLOW→FAST on 5× fast pings (RTT<200ms), both states
→OFFLINE on consecutive ping failures (5 from fast, 3 from slow).
OFFLINE exit is user-initiated only (userInitiatedReconnect()).
Singleton lanNetworkProfile exported; createNetworkProfile() for tests."
```

---

## Task 2: Wire network profile into ping loop and sync parameters

**What it does:** Reports ping results to `lanNetworkProfile`, uses adaptive parameters (debounce, scan interval, reconcile cooldown) based on the current profile, and stops scanning entirely in OFFLINE mode.

**Files:**
- Modify: `public/js/features/lan/panel.mjs` (report ping results; stop scan on OFFLINE; adaptive scan interval)
- Modify: `public/js/features/lan/push.mjs` (adaptive bundle debounce and reconcile cooldown)
- Modify: `public/js/features/lan/runtime.mjs` (export profile-aware constants via getters)

---

- [ ] **Step 1: Add profile-aware parameter getters to `runtime.mjs`**

Open `public/js/features/lan/runtime.mjs`. After `export const LIVE_SYNC_OUTBOX_FLUSH_MS = 60000;`, add:

```js
/**
 * Profile-aware sync parameters. Imported by push.mjs at runtime.
 * Using getter functions (not constants) so they read the current profile
 * without circular imports.
 */

/** @returns {number} Debounce for typed mutation HTTP calls (ms) */
export function getLiveSyncPushDebounceMs() {
  try {
    const { lanNetworkProfile } = require('./lan-network-profile.mjs'); // CJS compat
    return lanNetworkProfile.getNetworkProfile() === 'slow' ? 4000 : 900;
  } catch {
    return 900;
  }
}
```

> Note: `runtime.mjs` uses ES modules. Use a dynamic import pattern instead of `require`. The simplest approach: import `lanNetworkProfile` at the top of `runtime.mjs` and export a getter:

```js
import { lanNetworkProfile } from '../lan-network-profile.mjs';

export function getLiveSyncPushDebounceMs() {
  return lanNetworkProfile.getNetworkProfile() === 'slow' ? 4000 : 900;
}

export function getReconcileCooldownMs() {
  return lanNetworkProfile.getNetworkProfile() === 'slow' ? 30000 : 10000;
}

export function getLanScanIntervalMs() {
  return lanNetworkProfile.getNetworkProfile() === 'slow' ? 60000 : 5000;
}
```

- [ ] **Step 2: Report ping timing in `panel.mjs` to the profile**

Open `public/js/features/lan/panel.mjs`. Add import at the top:

```js
import { lanNetworkProfile } from '../../lan-network-profile.mjs';
```

Find the ping block (around lines 2456–2480, inside the function that pings the host during the ⇄ panel flow). It reads:

```js
  try {
    var r = await lanClient.fetch('/api/lan/v1/ping');
    pingStatus = r && r.status ? r.status : 0;
    pingOk = !!(r && r.ok);
```

Wrap the fetch in timing:

```js
  try {
    var _pingStart = Date.now();
    var r = await lanClient.fetch('/api/lan/v1/ping');
    var _pingRtt = Date.now() - _pingStart;
    pingStatus = r && r.status ? r.status : 0;
    pingOk = !!(r && r.ok);
    if (pingOk) {
      lanNetworkProfile.recordPingSuccess(_pingRtt);
    } else {
      lanNetworkProfile.recordPingFailure();
    }
```

And in the catch block (a few lines below):

```js
  } catch (pingErr) {
    lanNetworkProfile.recordPingFailure();
    // ...existing error recording...
```

- [ ] **Step 3: Subscribe to profile changes to stop/start auto-scan**

Open `public/js/features/lan/panel.mjs`. Find `startLanAutoDiscovery` (around line 2024). Add a one-time subscription setup at module level (after the existing module-level variable declarations):

```js
// Stop auto-discovery when network goes OFFLINE; restart when it recovers.
lanNetworkProfile.subscribeNetworkProfile(function (newProfile) {
  if (newProfile === 'offline') {
    stopLanAutoDiscovery();
  } else if (newProfile === 'fast' || newProfile === 'slow') {
    // Profile recovered from offline — don't auto-restart scan;
    // let userInitiatedReconnect flow handle it via panel UI.
  }
});
```

- [ ] **Step 4: Use adaptive scan interval**

Open `public/js/features/lan/panel.mjs`. Find:

```js
var LAN_SCAN_INTERVAL_MS = 5000;
```

Replace with:

```js
// Scan interval adapts to network profile — do not use as a constant.
// Call getLanScanIntervalMs() where the interval is set.
```

Import `getLanScanIntervalMs` from `runtime.mjs`:

```js
import {
  // ...existing imports from runtime.mjs...
  getLanScanIntervalMs,
} from './runtime.mjs';
```

In `startLanAutoDiscovery`, replace:

```js
  _lanScanTimer = setInterval(function () {
    void scanLanHosts();
  }, LAN_SCAN_INTERVAL_MS);
```

With:

```js
  _lanScanTimer = setInterval(function () {
    void scanLanHosts();
  }, getLanScanIntervalMs());
```

> Note: the interval is set once when `startLanAutoDiscovery` is called. For the profile change to take effect, `stopLanAutoDiscovery` + `startLanAutoDiscovery` need to be called. The subscription in Step 3 calls `stopLanAutoDiscovery` on OFFLINE; `startLanAutoDiscovery` is already called via the reconnect flow.

- [ ] **Step 5: Use adaptive push debounce in `push.mjs`**

Open `public/js/features/lan/push.mjs`. Add `getLiveSyncPushDebounceMs` and `getReconcileCooldownMs` to the `runtime.mjs` import.

Find the current `LIVE_SYNC_PUSH_DEBOUNCE_MS` constant usage in `scheduleLiveSyncPush` (around line 698):

```js
    }, LIVE_SYNC_PUSH_DEBOUNCE_MS)
```

Replace with:

```js
    }, getLiveSyncPushDebounceMs())
```

Find `RECONCILE_COOLDOWN_MS` (may be a constant defined in this file or imported). Replace the usage with `getReconcileCooldownMs()`.

- [ ] **Step 6: Run the full test suite**

```bash
npm test 2>&1 | tail -30
npm run build:ui 2>&1 | tail -10
```

Expected: all tests pass, bundle builds cleanly.

- [ ] **Step 7: Commit**

```bash
git add public/js/features/lan/panel.mjs public/js/features/lan/push.mjs public/js/features/lan/runtime.mjs
git commit -m "feat(lan): wire network profile into ping loop and sync parameters

panel.mjs reports ping RTT/failure to lanNetworkProfile; subscribes to
profile changes to stop auto-discovery on OFFLINE. push.mjs uses
getLiveSyncPushDebounceMs() and getReconcileCooldownMs() for adaptive
parameters (FAST: 900ms/10s, SLOW: 4s/30s)."
```

---

## Task 3: OFFLINE mode UI — banner and "Reconectar" button

**What it does:** When the profile transitions to OFFLINE, the ⇄ panel shows a red banner ("Sin conexión al anfitrión · LiveSync en pausa") with a "Reconectar" button. Tapping it calls `userInitiatedReconnect()`, attempts a single ping, and shows inline feedback. On success, the reconnect flow (flush outbox → GET /sync-bundle → open WS) is triggered.

**Files:**
- Modify: `public/js/features/lan/panel.mjs` (renderLanPanelOnce: add OFFLINE banner section; add `reconnectFromOfflineUi` handler)

---

- [ ] **Step 1: Write the contract test**

Open `public/js/lan-sync-wiring.test.mjs`. Add:

```js
it('panel.mjs references reconnectFromOfflineUi or similar offline reconnect handler', () => {
  assert.match(
    lanSyncPanel,
    /reconnectFromOffline|userInitiatedReconnect|Sin conexi/,
    'panel.mjs must reference the offline reconnect flow'
  );
});

it('panel.mjs references lanNetworkProfile', () => {
  assert.match(lanSyncPanel, /lanNetworkProfile/);
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | grep -E '(fail|pass)' | tail -10
```

Expected: both new tests fail.

- [ ] **Step 3: Add the OFFLINE banner to `renderLanPanelOnce`**

Open `public/js/features/lan/panel.mjs`. Find the section inside `renderLanPanelOnce` where the connection status is rendered (look for the area that builds the HTML for the current connection state, around lines 1000–1100).

Add an OFFLINE check near the top of the rendered content, before the normal connected/disconnected states:

```js
  // OFFLINE mode banner
  if (lanNetworkProfile.getNetworkProfile() === 'offline') {
    var offlineBanner = document.createElement('div');
    offlineBanner.className = 'lan-offline-banner';
    offlineBanner.innerHTML = [
      '<div class="lan-offline-banner__text">',
      '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span>',
      ' Sin conexión al anfitrión · LiveSync en pausa',
      '</div>',
      '<div class="lan-offline-banner__hint">',
      'Los cambios se guardan localmente y se sincronizarán al reconectar.',
      '</div>',
      '<button class="lan-offline-banner__btn" data-action="reconnect-from-offline">',
      'Reconectar',
      '</button>',
    ].join('');
    root.appendChild(offlineBanner);
  }
```

> `root` is the container element that `renderLanPanelOnce` populates. Check the actual variable name used in the function — it may be `panelRoot`, `el`, or similar. Use whatever name is already in scope.

- [ ] **Step 4: Add the `reconnectFromOfflineUi` handler**

In `panel.mjs`, add after `export function dismissLanHostFirstTimeHint()`:

```js
/**
 * Called when the user taps "Reconectar" in the OFFLINE banner.
 * Does a single ping; on success, flushes outbox and reconciles.
 */
export async function reconnectFromOfflineUi() {
  var btn = document.querySelector('[data-action="reconnect-from-offline"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Buscando…';
  }

  var pingOk = false;
  var rttMs = 0;
  try {
    var start = Date.now();
    var r = await lanClient.fetch('/api/lan/v1/ping');
    rttMs = Date.now() - start;
    pingOk = !!(r && r.ok);
  } catch (_e) {
    pingOk = false;
  }

  lanNetworkProfile._simulatePingResult(pingOk, rttMs);
  const newProfile = lanNetworkProfile.getNetworkProfile();

  if (!pingOk || newProfile === 'offline') {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Reconectar';
    }
    // Show inline error (no toast to avoid jitter)
    var errEl = document.querySelector('.lan-offline-banner__error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'lan-offline-banner__error';
      if (btn && btn.parentNode) btn.parentNode.insertBefore(errEl, btn);
    }
    errEl.textContent = 'No se encontró el anfitrión.';
    return;
  }

  // Success — flush outbox then full reconcile then re-open WS
  try {
    var rid = activeLiveSyncRoomId || storage.getLastLanRoomId?.() || '';
    if (rid) {
      await import('./push.mjs').then(async (m) => {
        await m.flushLiveSyncOutbox(rid);
        await m.reconcileLiveSyncRoom(rid, { force: true, reason: 'reconnect' });
      });
    }
  } catch (_eReconnect) {}

  resumeAutoHostDetect();
  startLanAutoDiscovery();
  renderLanPanel({ force: true });
}
```

- [ ] **Step 5: Wire the button click in `wireLanPanelDelegation`**

Open `panel.mjs`. Find `wireLanPanelDelegation` (around line 420). It handles `data-action` clicks via event delegation. Add:

```js
      if (action === 'reconnect-from-offline') {
        void reconnectFromOfflineUi();
        return;
      }
```

- [ ] **Step 6: Run the contract tests**

```bash
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | tail -20
```

Expected: all tests pass including the two new ones.

- [ ] **Step 7: Run the full test suite and rebuild**

```bash
npm test 2>&1 | tail -30
npm run build:ui 2>&1 | tail -10
```

Expected: all green, bundle builds cleanly.

- [ ] **Step 8: Commit**

```bash
git add public/js/features/lan/panel.mjs public/js/lan-sync-wiring.test.mjs
git commit -m "feat(lan): OFFLINE mode UI — banner and Reconectar button

When lanNetworkProfile is 'offline', the ⇄ panel shows a red banner
with 'Sin conexión al anfitrión · LiveSync en pausa' and a Reconectar
button. Tapping it does a single ping: success triggers outbox flush +
full reconcile + WS reopen; failure shows inline 'No se encontró el
anfitrión.' message. No background scan or auto-retry while offline."
```

---

## Final verification

```bash
# All tests
npm test 2>&1 | tail -30

# Network profile unit tests
node --test public/js/lan-network-profile.test.mjs 2>&1 | grep -E '(pass|fail|ok)'

# Wiring contracts
node --test public/js/lan-sync-wiring.test.mjs 2>&1 | grep -E '(pass|fail|ok)'

# Bundle compiles
npm run build:ui 2>&1 | tail -5
```

All must be green before marking Plan C complete.
