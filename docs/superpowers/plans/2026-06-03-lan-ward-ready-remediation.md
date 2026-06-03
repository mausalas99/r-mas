# LAN Ward-Ready Remediation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make guardia LAN fully ward-ready on 6.6.1+ by decoupling team/directorio (`clinical-ops`) from heavy `sync-bundle`, fixing outbox drain, host revision broadcast, and conflict/phase UX — without rewriting hub-and-spoke LAN.

**Architecture:** Fix in place (~200–400 LOC P0). Keep `lan-squad/` host, `ConflictResolver`, modular `lan-sync-*`. Land existing uncommitted ward fixes, then IM-OPS-1/2/3 and IM-HOST-1 from spec.

**Tech Stack:** Node `node:test`, Express `host-router.js`, ESM renderer, SQLCipher outbox (`lib/db/lan-sync-outbox.mjs`), `npm run build:ui`.

**Spec:** [`docs/superpowers/specs/2026-06-03-lan-ward-ready-remediation-design.md`](../specs/2026-06-03-lan-ward-ready-remediation-design.md)

**Debt gate:** `npm test` green; `npm run metrics` if available — no baseline regression.

---

## File map

| Task | Files |
|------|--------|
| 0 | Uncommitted: `clinical-teams.mjs`, `lan-sync-push.mjs`, `host-router.js`, `draft-conflict-store.mjs`, `lan-sync-bundle-push.mjs`, tests |
| 1–3 | `public/js/lan-sync-push.mjs` |
| 4 | `lan-squad/host-router.js`, `lan-squad/host-router.test.js` |
| 5 | `public/js/features/clinical-teams.mjs`, `clinical-teams.test.mjs` |
| 6 | `public/js/features/lan-sync-clinical-ops.test.mjs` |
| 7 | `public/js/live-sync-outbox.test.mjs` (optional contract) |
| 8 | `npm run build:ui`, bundles, manual QA |

---

## Task 0: Land ward fixes already in the working tree

**Files:** All modified LAN/teams files from pilot (see `git status`).

- [ ] **Step 1: Review diff** — ensure leave team, reconcile `finally`, `broadcastLiveRevision`, conflict drafts, `pauseBundlePush` are present.

- [ ] **Step 2: Run tests**

```bash
cd /Users/mauriciosalas/R+ && npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 3: Stage new modules**

```bash
git add public/js/lan-sync-bundle-push.mjs public/js/lan-sync-bundle-push.test.mjs
git add lan-squad/host-router.js lan-squad/host-router.test.js
git add public/js/lan-sync-push.mjs public/js/lan-sync-room.mjs
git add public/js/features/clinical-teams.mjs public/js/features/clinical-teams.test.mjs
git add public/js/features/lan-sync.mjs public/js/lan-sync-panel.mjs
git add public/js/draft-conflict-store.mjs public/js/draft-conflict-store.test.mjs
git add public/js/clinical-team-invite.mjs public/js/features/lan-sync-clinical-ops.test.mjs
# plus any other LAN-related files from git status
```

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(lan): ward pilot — teams publish, phase reconcile, conflict UX

Leave team, clinical-ops revision broadcast, conflict drafts panel,
bundle push pause, membership-aware reconcile hints.
EOF
)"
```

---

## Task 1: IM-OPS-1 — Stop clinical-ops → sync-bundle fallback

**Files:**
- Modify: `public/js/lan-sync-push.mjs` (`pushClinicalOpsLanNow`)
- Modify: `public/js/features/lan-sync-clinical-ops.test.mjs`

- [ ] **Step 1: Add failing contract test**

Add to `lan-sync-clinical-ops.test.mjs` inside existing `describe`:

```javascript
  it('pushClinicalOpsLanNow does not fall back to pushRoomSyncBundleToHost', () => {
    const start = lanSyncPushSrc.indexOf('export async function pushClinicalOpsLanNow');
    assert.ok(start >= 0);
    const end = lanSyncPushSrc.indexOf('export async function reconcileLiveSyncRoom', start);
    const body = lanSyncPushSrc.slice(start, end);
    assert.doesNotMatch(body, /pushRoomSyncBundleToHost/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test public/js/features/lan-sync-clinical-ops.test.mjs 2>&1 | tail -15
```

Expected: FAIL (body still contains `pushRoomSyncBundleToHost`).

- [ ] **Step 3: Remove bundle fallback in `pushClinicalOpsLanNow`**

Replace the `else if (!opsResp || !opsResp.ok)` and `catch (_opsErr)` branches that call `pushRoomSyncBundleToHost` with no-op `okHttp = false`.

Before (remove):

```javascript
    } else if (!opsResp || !opsResp.ok) {
      okHttp = await pushRoomSyncBundleToHost(roomId, envelope);
    }
  } catch (_opsErr) {
    if (!isBundlePushPaused(roomId)) {
      okHttp = await pushRoomSyncBundleToHost(roomId, envelope);
    }
  }
```

After:

```javascript
    } else {
      okHttp = false;
    }
  } catch (_opsErr) {
    okHttp = false;
  }
```

Keep `sendLiveBundleIfOpen` at the end only for optional WS hint (not required for ops success).

- [ ] **Step 4: Run test — PASS**

```bash
node --test public/js/features/lan-sync-clinical-ops.test.mjs 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add public/js/lan-sync-push.mjs public/js/features/lan-sync-clinical-ops.test.mjs
git commit -m "fix(lan): clinical-ops push never escalates to sync-bundle"
```

---

## Task 2: IM-OPS-2 — `clinical_ops` outbox enqueue + drain

**Files:**
- Modify: `public/js/lan-sync-push.mjs`
- Modify: `public/js/features/lan-sync-clinical-ops.test.mjs`
- Modify: `public/js/live-sync-outbox.test.mjs` (optional)

- [ ] **Step 1: Add helper `pushClinicalOpsPayloadToHost` in `lan-sync-push.mjs`**

Place before `pushClinicalOpsLanNow`:

```javascript
/**
 * @param {string} roomId
 * @param {{ snapshot: object, baseRevision?: number, clientId?: string }} payload
 */
function pushClinicalOpsPayloadToHost(roomId, payload) {
  var rid = String(roomId || '').trim();
  var snap = payload && payload.snapshot;
  if (!rid || !snap) return Promise.resolve(false);
  var b = bridge();
  if (typeof b.isLanSessionConfiguredForRest !== 'function' || !b.isLanSessionConfiguredForRest()) {
    return Promise.resolve(false);
  }
  var bases = getHostBundleBases(rid);
  return lanClient
    .fetch('/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/clinical-ops', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshot: snap,
        baseRevision:
          payload.baseRevision != null
            ? payload.baseRevision
            : bases && bases.revision != null
              ? bases.revision
              : 0,
        clientId: payload.clientId || getLanClientId(),
      }),
    })
    .then(function (resp) {
      if (!resp || !resp.ok) return false;
      return resp.json().then(function (body) {
        if (body && body.revision != null) {
          var prev = bases || {};
          setHostBundleBases(rid, {
            revision: body.revision,
            entityVersions: prev.entityVersions || {},
          });
          emitLiveSyncRevisionHint(rid, body.revision);
        }
        return true;
      });
    })
    .catch(function () {
      return false;
    });
}
```

- [ ] **Step 2: On `pushClinicalOpsLanNow` failure, enqueue `clinical_ops` not `bundle`**

Change final failure block from:

```javascript
  void enqueueOutbox(roomId, { kind: 'bundle', payload: envelope });
```

To:

```javascript
  void enqueueOutbox(roomId, {
    kind: 'clinical_ops',
    payload: {
      snapshot: snap,
      baseRevision: bases && bases.revision != null ? bases.revision : 0,
      clientId: getLanClientId(),
    },
  });
```

(`snap` and `bases` already in scope in `pushClinicalOpsLanNow`.)

- [ ] **Step 3: Extend `flushLiveSyncOutbox`**

Replace the `items.forEach` body with sorted processing — ops first:

```javascript
  return drainOutbox(rid).then(function (items) {
    if (!items || !items.length) return;
    var sorted = items.slice().sort(function (a, b) {
      var score = function (k) {
        return k === 'clinical_ops' ? 0 : 1;
      };
      return score(a && a.kind) - score(b && b.kind);
    });
    var chain = Promise.resolve();
    sorted.forEach(function (item) {
      chain = chain.then(function () {
        if (!item || !item.payload) return;
        if (item.kind === 'clinical_ops') {
          return pushClinicalOpsPayloadToHost(rid, item.payload).then(function (ok) {
            if (!ok) return enqueueOutbox(rid, item);
          });
        }
        if (item.kind === 'bundle') {
          return pushRoomSyncBundleToHost(rid, item.payload).then(function (ok) {
            if (!ok) return enqueueOutbox(rid, item);
          });
        }
      });
    });
    return chain;
  });
```

- [ ] **Step 4: Contract test for flush**

In `lan-sync-clinical-ops.test.mjs`:

```javascript
  it('flushLiveSyncOutbox drains clinical_ops kind', () => {
    assert.match(lanSyncPushSrc, /item\.kind === 'clinical_ops'/);
    assert.match(lanSyncPushSrc, /pushClinicalOpsPayloadToHost/);
  });
```

In `live-sync-outbox.test.mjs`:

```javascript
test('enqueue clinical_ops kind round-trip', async () => {
  mockLocalStorage();
  await enqueueOutbox('room1', {
    kind: 'clinical_ops',
    payload: { snapshot: { teams: [] }, baseRevision: 0 },
  });
  const items = await drainOutbox('room1');
  assert.equal(items[0].kind, 'clinical_ops');
});
```

- [ ] **Step 5: Run tests**

```bash
node --test public/js/features/lan-sync-clinical-ops.test.mjs public/js/live-sync-outbox.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add public/js/lan-sync-push.mjs public/js/features/lan-sync-clinical-ops.test.mjs public/js/live-sync-outbox.test.mjs
git commit -m "fix(lan): clinical_ops outbox enqueue and drain before bundles"
```

---

## Task 3: IM-OPS-3 — clinical-ops 409 returns success + toasts

**Files:**
- Modify: `public/js/lan-sync-push.mjs`
- Modify: `public/js/features/clinical-teams.mjs` (`toastTeamLanPublishResult`)
- Modify: `public/js/features/clinical-teams.test.mjs` (optional string match)

- [ ] **Step 1: Change 409 return in `pushClinicalOpsLanNow`**

Replace:

```javascript
      return lanPushResult(false, 'CLINICAL_OPS_CONFLICT', { http: false, live: false });
```

With:

```javascript
      return lanPushResult(true, 'CONFLICT_RESOLVED', { http: true });
```

(Only after `acceptServerClinicalOpsConflict` runs.)

- [ ] **Step 2: Extend `toastTeamLanPublishResult`**

```javascript
function toastTeamLanPublishResult(lanPush, localOkMessage) {
  if (!lanPush) {
    toast(localOkMessage, 'success');
    return;
  }
  if (lanPush.ok) {
    if (lanPush.code === 'CONFLICT_RESOLVED') {
      toast(`${localOkMessage} Directorio alineado con el servidor.`, 'success');
      return;
    }
    if (lanPush.channels && lanPush.channels.http) {
      toast(`${localOkMessage} Publicado en sala ⇄.`, 'success');
      return;
    }
    if (lanPush.channels && lanPush.channels.outbox) {
      toast(
        `${localOkMessage} Se publicará a la sala cuando vuelva la red (cola ⇄).`,
        'info'
      );
      return;
    }
    toast(localOkMessage, 'success');
    return;
  }
  // ... existing benign / outbox / warn branches unchanged
}
```

Ensure `pushClinicalOpsLanNow` sets `channels: { outbox: true }` on enqueue failure path:

```javascript
  return lanPushResult(false, 'PUSH_FAILED', { outbox: true });
```

- [ ] **Step 3: Contract test**

```javascript
  it('clinical-ops 409 path reports CONFLICT_RESOLVED success', () => {
    assert.match(lanSyncPushSrc, /CONFLICT_RESOLVED/);
    assert.match(
      lanSyncPushSrc,
      /acceptServerClinicalOpsConflict[\s\S]*lanPushResult\(true,\s*'CONFLICT_RESOLVED'/
    );
  });
```

- [ ] **Step 4: Run tests + commit**

```bash
node --test public/js/features/lan-sync-clinical-ops.test.mjs public/js/features/clinical-teams.test.mjs
git add public/js/lan-sync-push.mjs public/js/features/clinical-teams.mjs public/js/features/lan-sync-clinical-ops.test.mjs
git commit -m "fix(lan): clinical-ops 409 is success UX; clearer team publish toasts"
```

---

## Task 4: IM-HOST-1 — Always broadcast revision on sync-bundle PUT

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`

- [ ] **Step 1: Add failing test**

```javascript
test('PUT /rooms/:id/sync-bundle broadcasts livesync:revision without clinicalOps in body', async () => {
  // setup room + bundle with agenda only, no clinicalOps
  // mount router with broadcast spy (mirror clinical-ops broadcast test)
  // PUT sync-bundle with valid baseRevision
  // assert broadcast received livesync:revision
});
```

Copy structure from existing test `PUT /rooms/:id/clinical-ops broadcasts livesync:revision on live room channel`.

- [ ] **Step 2: Simplify host-router handler**

Replace:

```javascript
      if (out && (out.clinicalOps || body.clinicalOps)) {
        broadcastLiveRevision(
```

With:

```javascript
      if (out) {
        broadcastLiveRevision(
```

- [ ] **Step 3: Run host-router tests**

```bash
node --test lan-squad/host-router.test.js
```

- [ ] **Step 4: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js
git commit -m "fix(lan-host): broadcast revision on every successful sync-bundle PUT"
```

---

## Task 5: Reconcile ops-only path when bundle GET fails (P2)

**Files:**
- Modify: `public/js/lan-sync-push.mjs` (`reconcileLiveSyncRoom`)

- [ ] **Step 1: After failed bundle GET, try clinical-ops GET**

In `reconcileLiveSyncRoom`, inside `try` after `catch (_eBundle)`:

```javascript
    if (isClinicalOpsLanAvailable() && typeof b.fetchAndApplyClinicalOpsFromHost === 'function') {
      await b.fetchAndApplyClinicalOpsFromHost(rid);
    }
```

Ensure `registerLanSyncPushBridge` / facade exposes `fetchAndApplyClinicalOpsFromHost` on bridge (wire from `lan-sync.mjs` if missing).

- [ ] **Step 2: Run tests + commit**

```bash
npm test
git commit -m "fix(lan): reconcile applies clinical-ops when bundle GET fails"
```

---

## Task 6: Build, full test, metrics

- [ ] **Step 1: Bundle renderer**

```bash
npm run build:ui
```

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -25
```

Expected: all pass.

- [ ] **Step 3: Metrics (if script exists)**

```bash
npm run metrics 2>&1 | tail -15
```

Expected: `totalScore` ≤ baseline.

- [ ] **Step 4: Commit bundle artifacts** (if your workflow commits `app.bundle.*`)

```bash
git add public/js/app.bundle.mjs public/js/app.bundle.meta.json
git commit -m "chore: bundle renderer after LAN ward-ready fixes"
```

---

## Task 7: Manual ward checklist (sign-off)

Use spec §4.2 — record results in PR or release notes.

- [ ] Homogeneous 6.6.1+ both Macs + host unlocked
- [ ] Team create → partner Mi rotación without rejoin
- [ ] Diagnostics: `phase: live`, `outboxCount: 0` after team create (no `sync-bundle` in `lastErrors`)
- [ ] Leave team propagates
- [ ] Bulk conflict clear does not freeze UI

---

## Spec coverage self-review

| Spec item | Task |
|-----------|------|
| IM-OPS-1 no bundle fallback | 1 |
| IM-OPS-2 clinical_ops outbox | 2 |
| IM-OPS-3 409 success | 3 |
| IM-HOST-1 broadcast always | 4 |
| Team toasts / leave team | 0, 3 |
| Reconcile ops when bundle fails | 5 |
| Conflict pause / drafts | 0 |
| Tests + QA | 6, 7 |
| Build vs rewrite | Spec § — fix in place, no rewrite task |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-03-lan-ward-ready-remediation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — one subagent per task, review between tasks  
2. **Inline Execution** — implement in this session with executing-plans checkpoints

Which approach do you want?
