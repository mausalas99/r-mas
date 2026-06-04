# LAN Single-Host Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge local disk-backed host rank + cloud subnet/UX work, then add automatic host consolidation so a ward converges on one LAN server (data via bundle push, clients via `livesync:host-handoff`).

**Architecture:** Disk `lan-host-clinical-meta.json` is the host identity source (`startedAt` tiebreak). Pure election in `lan-host-rank.mjs`; consolidation orchestration in `lan-host-consolidation.mjs` (DI, `node --test`-friendly); browser wiring in `features/lan/transport.mjs` and scan/UX in `panel.mjs`. Cloud `POST /host-advertise` and `lan-host-discovery.mjs` are removed/folded — not ported.

**Tech Stack:** Node `node:test`, Express LAN router (`lan-squad/`), Electron IPC (`main.js` / `preload.js`), renderer ESM (`public/js/**/*.mjs`).

**Spec:** [`docs/superpowers/specs/2026-06-04-lan-single-host-consolidation-design.md`](../specs/2026-06-04-lan-single-host-consolidation-design.md)

**Cloud reference (read-only):** `origin/cursor/lan-single-host-discovery-bd80` (`c554e66`) — port UX + probing patterns, **not** in-memory advertise.

**Working tree baseline (already present):** `lan-squad/host-clinical-meta.js`, `lan-host-rank*.mjs`, `lan-host-subnet-discovery.mjs`, IPC `lan-sync-host-clinical-meta`, `GET /host-rank` via `getHostClinicalMeta`, `tryAutoJoinPreferredLanHost` / `initLanHostPlugAndPlay`.

---

## Module refinement (vs spec §3.1)

| Spec name | Actual module | Why |
|-----------|---------------|-----|
| `consolidateIntoHost` in `transport.mjs` | Core: `lan-host-consolidation.mjs`; export from `transport.mjs` | `transport.mjs` pulls browser/LAN client; pure core keeps push-before-handoff testable and Tier-1 file size down |
| `pushBundleToHostUrl` | Same split | Direct `fetch` PUT to winner URL without switching `lanClient` base first |

---

## File map

| File | Action |
|------|--------|
| `lan-squad/host-clinical-meta.js` | **Modify** — `startedAt` stamp once per server lifecycle |
| `lan-squad/host-clinical-meta.test.js` | **Modify** |
| `lan-squad/host-router.js` | **Modify** — expose `startedAt` on `GET /host-rank` |
| `lan-squad/host-router.test.js` | **Modify** — `startedAt`; `POST /host-advertise` → 404 |
| `main.js` | **Modify** — stamp `startedAt` when LAN server starts (if not in meta write) |
| `public/js/lan-host-rank.mjs` | **Modify** — `resolveHostElection`, `startedAt` in `fetchLanHostRank`, peer pick uses election |
| `public/js/lan-host-rank.test.mjs` | **Modify** |
| `public/js/lan-host-subnet-discovery.mjs` | **Modify** — cloud probing + loopback/same-machine exclusion |
| `public/js/lan-host-subnet-discovery.test.mjs` | **Modify** |
| `public/js/lan-host-consolidation.mjs` | **Create** — pure orchestration + `pushBundleToHostUrl` |
| `public/js/lan-host-consolidation.test.mjs` | **Create** |
| `public/js/features/lan/transport.mjs` | **Modify** — election matrix, thin consolidation wiring, promote guard |
| `public/js/features/lan/panel.mjs` | **Modify** — `lanHubStatusCopy`, 5s/25s scan, split-brain UX |
| `package.json` | **Modify** — register new/updated tests |
| `.cursor/rules/project-context.mdc` | **Modify** — changelog on commit |
| `docs/superpowers/specs/2026-06-04-lan-single-host-consolidation-design.md` | **Done** — module split noted |

**Do not create:** `public/js/lan-host-discovery.mjs` (fold into subnet discovery).

---

### Task 1: `startedAt` on disk meta

**Files:**
- Modify: `lan-squad/host-clinical-meta.js`
- Modify: `lan-squad/host-clinical-meta.test.js`
- Modify: `main.js` (optional: ensure stamp on `ensureLanServerReady` if renderer sync alone is insufficient)

- [ ] **Step 1: Extend failing meta test**

```javascript
test('startedAt is stamped once and stable across writes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-meta-started-'));
  const first = writeHostClinicalMeta(dir, { rank: 'R4', isProgramAdmin: false });
  assert.ok(first.startedAt > 0);
  const second = writeHostClinicalMeta(dir, { rank: 'R3', isProgramAdmin: true });
  assert.equal(second.startedAt, first.startedAt);
  const read = readHostClinicalMeta(dir);
  assert.equal(read.startedAt, first.startedAt);
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test lan-squad/host-clinical-meta.test.js
```

- [ ] **Step 3: Implement `startedAt` in meta module**

```javascript
function readHostClinicalMeta(userDataPath) {
  const fallback = { rank: 'R1', isProgramAdmin: false, startedAt: 0, updatedAt: '' };
  // ... parse o.startedAt as Number(o.startedAt) || 0
}

function writeHostClinicalMeta(userDataPath, payload) {
  const prev = readHostClinicalMeta(userDataPath);
  const now = Date.now();
  const body = {
    rank: String(payload?.rank || 'R1').trim() || 'R1',
    isProgramAdmin: !!(payload?.isProgramAdmin || payload?.is_program_admin),
    startedAt: prev.startedAt > 0 ? prev.startedAt : now,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(metaFilePath(userDataPath), JSON.stringify(body), 'utf8');
  return body;
}

/** Call when LAN server process starts — ensures startedAt even if renderer never synced. */
function ensureHostStartedAt(userDataPath) {
  return writeHostClinicalMeta(userDataPath, readHostClinicalMeta(userDataPath));
}
```

Export `ensureHostStartedAt`. In `main.js` inside `lan-ensure-server-ready` (after `startLanServer`), call `ensureHostStartedAt(app.getPath('userData'))`.

- [ ] **Step 4: Run test — expect PASS**

```bash
node --test lan-squad/host-clinical-meta.test.js
```

- [ ] **Step 5: Commit**

```bash
git add lan-squad/host-clinical-meta.js lan-squad/host-clinical-meta.test.js main.js
git commit -m "feat(lan): persist host startedAt in clinical meta file"
```

---

### Task 2: `GET /host-rank` includes `startedAt`

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`

- [ ] **Step 1: Extend host-rank test**

```javascript
test('LAN GET /host-rank returns startedAt from getHostClinicalMeta', async () => {
  const app = mountLanRouter(store, () => {}, () => ({
    rank: 'R4',
    isProgramAdmin: false,
    startedAt: 1717500000123,
  }));
  // ... fetch /host-rank
  assert.strictEqual(body.startedAt, 1717500000123);
});

test('LAN POST /host-advertise is not mounted (404)', async () => {
  // POST /api/lan/v1/host-advertise with bearer → 404
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
node --test lan-squad/host-router.test.js
```

- [ ] **Step 3: Add `startedAt` to JSON response**

```javascript
r.get('/host-rank', (_req, res) => {
  const meta =
    typeof getHostClinicalMeta === 'function'
      ? getHostClinicalMeta()
      : { rank: 'R1', isProgramAdmin: false, startedAt: 0 };
  res.json({
    rank: String(meta.rank || 'R1').trim() || 'R1',
    isProgramAdmin: !!meta.isProgramAdmin,
    startedAt: Number(meta.startedAt) || 0,
  });
});
```

Ensure `server.js` `getHostClinicalMeta: () => readHostClinicalMeta(userData)` returns full meta including `startedAt`.

- [ ] **Step 4: Run — expect PASS**

```bash
node --test lan-squad/host-router.test.js
```

- [ ] **Step 5: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js
git commit -m "feat(lan): expose startedAt on host-rank endpoint"
```

---

### Task 3: `resolveHostElection` (pure)

**Files:**
- Modify: `public/js/lan-host-rank.mjs`
- Modify: `public/js/lan-host-rank.test.mjs`

- [ ] **Step 1: Add failing tests**

```javascript
import { resolveHostElection } from './lan-host-rank.mjs';

const self = { rank: 'R4', isProgramAdmin: false, startedAt: 200 };
const peer = { rank: 'R4', isProgramAdmin: false, startedAt: 100 };

it('resolveHostElection: higher rank wins', () => {
  assert.equal(
    resolveHostElection(
      { rank: 'R2', isProgramAdmin: false, startedAt: 1 },
      { rank: 'R4', isProgramAdmin: false, startedAt: 2 },
      { selfUrl: 'http://10.0.0.2:3738', peerUrl: 'http://10.0.0.3:3738' }
    ),
    'peer'
  );
});

it('admin outranks R4', () => {
  assert.equal(
    resolveHostElection(
      { rank: 'R4', isProgramAdmin: false, startedAt: 1 },
      { rank: 'R1', isProgramAdmin: true, startedAt: 9 },
      { selfUrl: 'http://10.0.0.2:3738', peerUrl: 'http://10.0.0.3:3738' }
    ),
    'peer'
  );
});

it('equal priority: earlier startedAt wins', () => {
  assert.equal(resolveHostElection(self, peer, urls), 'peer');
  assert.equal(resolveHostElection(peer, self, urls), 'self');
});

it('missing startedAt treated as later', () => {
  assert.equal(
    resolveHostElection(
      { rank: 'R4', isProgramAdmin: false, startedAt: 0 },
      { rank: 'R4', isProgramAdmin: false, startedAt: 50 },
      urls
    ),
    'peer'
  );
});

it('URL lexicographic tiebreak', () => {
  const a = { rank: 'R4', isProgramAdmin: false, startedAt: 1 };
  assert.equal(
    resolveHostElection(a, a, {
      selfUrl: 'http://10.0.0.10:3738',
      peerUrl: 'http://10.0.0.2:3738',
    }),
    'tie-peer'
  );
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
node --test public/js/lan-host-rank.test.mjs
```

- [ ] **Step 3: Implement**

```javascript
/** @returns {'self'|'peer'|'tie-self'|'tie-peer'} */
export function resolveHostElection(selfMeta, peerMeta, urls = {}) {
  const selfPri = lanHostPriority(selfMeta);
  const peerPri = lanHostPriority(peerMeta);
  if (peerPri > selfPri) return 'peer';
  if (selfPri > peerPri) return 'self';

  const selfStarted = Number(selfMeta?.startedAt) || 0;
  const peerStarted = Number(peerMeta?.startedAt) || 0;
  const selfMissing = selfStarted <= 0;
  const peerMissing = peerStarted <= 0;
  if (!selfMissing && peerMissing) return 'self';
  if (selfMissing && !peerMissing) return 'peer';
  if (selfStarted < peerStarted) return 'peer';
  if (peerStarted < selfStarted) return 'self';

  const selfUrl = String(urls.selfUrl || '').trim();
  const peerUrl = String(urls.peerUrl || '').trim();
  if (peerUrl && selfUrl && peerUrl < selfUrl) return 'tie-peer';
  if (peerUrl && selfUrl && selfUrl < peerUrl) return 'tie-self';
  return 'tie-self';
}
```

Extend `fetchLanHostRank` return type:

```javascript
return {
  rank: ...,
  isProgramAdmin: ...,
  startedAt: Number(data?.startedAt) || 0,
};
```

- [ ] **Step 4: Run — expect PASS**

```bash
node --test public/js/lan-host-rank.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add public/js/lan-host-rank.mjs public/js/lan-host-rank.test.mjs
git commit -m "feat(lan): resolveHostElection with startedAt and URL tiebreak"
```

---

### Task 4: Subnet discovery merge (cloud probing)

**Files:**
- Modify: `public/js/lan-host-subnet-discovery.mjs`
- Modify: `public/js/lan-host-subnet-discovery.test.mjs`

Port from cloud `lan-host-discovery.mjs` (branch `c554e66`):
- `normalizeLanHostBase`, `hostIpv4FromBase`, `lanHostBasesSameMachine`
- `probeLanHostBase` (ping + `GET /api/lan/v1/ping` with Bearer)
- Batch probe with `PROBE_BATCH = 32`, `PROBE_TIMEOUT_MS = 500`

Change `discoverLanHostsOnSubnet(teamCode, ownBaseUrl)` to:
1. Return `[]` when no team code / non-private IP (existing tests).
2. Exclude `ownBaseUrl` and same-machine bases (`lanHostBasesSameMachine`).
3. Return **sorted** unique bases (deterministic order), cap `MAX_FOUND = 4`.

- [ ] **Step 1: Add tests for same-machine exclusion**

```javascript
import { lanHostBasesSameMachine } from './lan-host-subnet-discovery.mjs';

it('lanHostBasesSameMachine detects matching host IPv4', () => {
  assert.equal(
    lanHostBasesSameMachine('http://127.0.0.1:3738', 'http://127.0.0.1:3738'),
    true
  );
});
```

(Mock network in discovery tests only if needed; keep unit tests on pure helpers.)

- [ ] **Step 2–4: Implement, run, commit**

```bash
node --test public/js/lan-host-subnet-discovery.test.mjs
git commit -m "feat(lan): richer subnet host discovery with loopback guards"
```

---

### Task 5: Pure consolidation core (`lan-host-consolidation.mjs`)

**Files:**
- Create: `public/js/lan-host-consolidation.mjs`
- Create: `public/js/lan-host-consolidation.test.mjs`

- [ ] **Step 1: Write failing tests (ordering + abort)**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pushBundleToHostUrl,
  runConsolidateIntoHost,
} from './lan-host-consolidation.mjs';

describe('pushBundleToHostUrl', () => {
  it('PUTs to winner base URL with bearer, returns false on non-2xx', async () => {
    let called = '';
    global.fetch = async (url, init) => {
      called = url;
      assert.match(url, /\/api\/lan\/v1\/rooms\/room-1\/sync-bundle$/);
      assert.equal(init.method, 'PUT');
      return { ok: false, status: 503 };
    };
    const ok = await pushBundleToHostUrl(
      'http://10.0.0.5:3738',
      'team-code-32-chars-minimum-xxxx',
      'room-1',
      { patients: [], revision: 1 }
    );
    assert.equal(ok, false);
    assert.match(called, /^http:\/\/10\.0\.0\.5:3738\//);
  });
});

describe('runConsolidateIntoHost', () => {
  it('push succeeds before handoff and role switch', async () => {
    const order = [];
    const deps = {
      buildBundle: async () => ({ revision: 2 }),
      pushBundle: async () => {
        order.push('push');
        return true;
      },
      broadcastHandoff: async () => {
        order.push('handoff');
      },
      switchToClient: async () => {
        order.push('switch');
      },
      confirmYield: async () => true,
      showToast: () => {},
      getRoomId: () => 'room-1',
    };
    const ok = await runConsolidateIntoHost(
      { winnerUrl: 'http://10.0.0.5:3738', teamCode: 'tok' },
      deps
    );
    assert.equal(ok, true);
    assert.deepEqual(order, ['push', 'handoff', 'switch']);
  });

  it('push failure aborts — no handoff or switch', async () => {
    const order = [];
    const deps = {
      buildBundle: async () => ({}),
      pushBundle: async () => {
        order.push('push');
        return false;
      },
      broadcastHandoff: async () => order.push('handoff'),
      switchToClient: async () => order.push('switch'),
      confirmYield: async () => true,
      showToast: () => {},
      getRoomId: () => 'room-1',
    };
    const ok = await runConsolidateIntoHost(
      { winnerUrl: 'http://10.0.0.5:3738', teamCode: 'tok' },
      deps
    );
    assert.equal(ok, false);
    assert.deepEqual(order, ['push']);
  });

  it('declined confirm keeps host', async () => {
    const deps = {
      buildBundle: async () => ({}),
      pushBundle: async () => true,
      broadcastHandoff: async () => {},
      switchToClient: async () => {},
      confirmYield: async () => false,
      showToast: () => {},
      getRoomId: () => 'room-1',
    };
    const ok = await runConsolidateIntoHost(
      { winnerUrl: 'http://10.0.0.5:3738', teamCode: 'tok', requireConfirm: true },
      deps
    );
    assert.equal(ok, false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
node --test public/js/lan-host-consolidation.test.mjs
```

- [ ] **Step 3: Implement module**

```javascript
import { hostBundleBodyFromEnvelope } from './features/lan/push.mjs';

export async function pushBundleToHostUrl(hostUrl, teamCode, roomId, envelope) {
  const base = String(hostUrl || '').trim().replace(/\/+$/, '');
  const code = String(teamCode || '').trim();
  const rid = String(roomId || '').trim();
  if (!base || !code || !rid || !envelope) return false;
  const url =
    base +
    '/api/lan/v1/rooms/' +
    encodeURIComponent(rid) +
    '/sync-bundle';
  try {
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + code,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bundle: hostBundleBodyFromEnvelope(envelope, rid) }),
      signal: AbortSignal.timeout(15000),
    });
    return !!(resp && resp.ok);
  } catch (_e) {
    return false;
  }
}

let _consolidating = false;

export async function runConsolidateIntoHost(opts, deps) {
  if (_consolidating) return false;
  const winnerUrl = String(opts?.winnerUrl || '').trim().replace(/\/+$/, '');
  const teamCode = String(opts?.teamCode || '').trim();
  if (!winnerUrl || !teamCode) return false;
  if (opts?.requireConfirm && typeof deps.confirmYield === 'function') {
    if (!(await deps.confirmYield())) return false;
  }
  const roomId = typeof deps.getRoomId === 'function' ? deps.getRoomId() : '';
  if (!roomId) return false;

  _consolidating = true;
  try {
    const envelope = await deps.buildBundle(roomId);
    const pushed = await deps.pushBundle(winnerUrl, teamCode, roomId, envelope);
    if (!pushed) {
      deps.showToast?.(
        'No se pudo combinar con el anfitrión; sigues como servidor.',
        'error'
      );
      return false;
    }
    await deps.broadcastHandoff(winnerUrl, teamCode, roomId);
    await deps.switchToClient(winnerUrl, teamCode);
    deps.showToast?.('Servidores combinados — ahora conectado al anfitrión del turno.', 'success');
    return true;
  } finally {
    _consolidating = false;
  }
}
```

**Debt note:** If importing `push.mjs` pulls too many browser deps into tests, extract `hostBundleBodyFromEnvelope` to `host-bundle-bases.mjs` or duplicate the 5-line body mapper in this module (prefer extract if import graph fails tests).

- [ ] **Step 4: Run — expect PASS**

```bash
node --test public/js/lan-host-consolidation.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add public/js/lan-host-consolidation.mjs public/js/lan-host-consolidation.test.mjs
git commit -m "feat(lan): testable consolidation orchestration core"
```

---

### Task 6: Wire consolidation in `transport.mjs`

**Files:**
- Modify: `public/js/features/lan/transport.mjs`

- [ ] **Step 1: Add thin wrappers**

```javascript
import {
  runConsolidateIntoHost,
  pushBundleToHostUrl as pushBundleToHostUrlCore,
} from '../../lan-host-consolidation.mjs';
import {
  resolveHostElection,
  fetchLanHostRank,
  prefersLanHosting,
  shouldAutoJoinPeerAsClient,
} from '../../lan-host-rank.mjs';

export async function pushBundleToHostUrl(winnerUrl, teamCode, roomId, envelope) {
  return pushBundleToHostUrlCore(winnerUrl, teamCode, roomId, envelope);
}

export async function consolidateIntoHost(winnerUrl, teamCode, opts = {}) {
  const { buildLiveSyncBundleEnvelope, getActiveLiveSyncRoomId } = await import('./room.mjs');
  const { enrichLiveSyncHelloPayload, buildLiveSyncHelloPayload } = await import('./room.mjs');
  const roomId = getActiveLiveSyncRoomId?.() || '';
  return runConsolidateIntoHost(
    { winnerUrl, teamCode, requireConfirm: !!opts.requireConfirm },
    {
      getRoomId: () => roomId,
      buildBundle: (rid) => buildLiveSyncBundleEnvelope(rid),
      pushBundle: (url, code, rid, env) => pushBundleToHostUrl(url, code, rid, env),
      broadcastHandoff: async (url) => {
        const handoff = await enrichLiveSyncHelloPayload(buildLiveSyncHelloPayload(roomId));
        handoff.type = 'livesync:host-handoff';
        handoff.newHostUrl = url;
        handoff.reason = 'consolidate-rank';
        lanClient.sendLive(handoff);
      },
      switchToClient: async (url, code) => {
        applyLanHostUrlSwitch(url, code, { skipRememberPrimary: false });
        storage.saveLanUiRole('client');
        persistLanClientConfig(url, code);
        rememberPrimaryHostUrl(url);
        await import('./room.mjs').then((m) => m.tryReconnectLanToHostUrl?.(url, code));
      },
      confirmYield: () =>
        typeof confirm === 'function'
          ? confirm(
              opts.confirmMessage ||
                'Un anfitrión de mayor rango ya está activo. ¿Combinar y conectar como cliente?'
            )
          : true,
      showToast: (msg, kind) => runtime().showToast(msg, kind),
    }
  );
}
```

- [ ] **Step 2: Add `evaluatePeerHostAction` helper (same file or `lan-host-rank-policy.mjs`)**

```javascript
/** @returns {'silent-join'|'confirm-consolidate'|'stay-warn'|'noop'} */
export function evaluatePeerHostAction(selfMeta, peerMeta, election) {
  if (election === 'self' || election === 'tie-self') {
    if (prefersLanHosting(peerMeta) && prefersLanHosting(selfMeta)) return 'stay-warn';
    return 'noop';
  }
  if (shouldAutoJoinPeerAsClient(peerMeta, selfMeta)) return 'silent-join';
  if (prefersLanHosting(selfMeta) && (election === 'peer' || election === 'tie-peer')) {
    return 'confirm-consolidate';
  }
  return 'noop';
}
```

- [ ] **Step 3: Rewrite `tryAutoJoinPreferredLanHost`**

For each discovered peer URL (WS list + subnet list):
1. `fetchLanHostRank(url, teamCode)` → full meta.
2. `resolveHostElection(getLocalLanHostMeta(), peer, { selfUrl: own, peerUrl: url })`.
3. `evaluatePeerHostAction` → first `silent-join` target wins; do **not** auto-consolidate without confirm path.

Keep pinned host: if `getPinnedHostUrl()` set, return false early (warn only from panel).

- [ ] **Step 4: `promoteThisMacToLanHost` preflight**

Before `ensureLanElectronHostReady`, unless `opts.skipOtherHostCheck`:
- Subnet scan + if peer hosting → `confirm('Ya hay un servidor R+ activo en …')`.

- [ ] **Step 5: Manual smoke** (Electron): two Macs → higher rank triggers confirm + single host.

- [ ] **Step 6: Commit**

```bash
git add public/js/features/lan/transport.mjs
git commit -m "feat(lan): wire consolidateIntoHost and election-aware auto-join"
```

---

### Task 7: Panel scan loop + UX (cloud port)

**Files:**
- Modify: `public/js/features/lan/panel.mjs`

Port from cloud `panel.mjs` (`c554e66`):
- `lanHubStatusCopy()` — use in hub card render path (~line 640 area).
- `SUBNET_LAN_SCAN_MIN_MS = 25000`, `_lastSubnetLanScanAt`.
- Replace simplistic `scanLanHosts` with:
  - **5s:** WS peers via `listLivePeerHostUrls` → ping → `handleDiscoveredPeer`.
  - **25s:** always run subnet sweep (merge into peer set), even when WS peers exist.
- `handleDiscoveredPeer`: call new transport helper `reactToDiscoveredLanHost(peerUrl, teamCode)` that applies matrix (silent join / confirm consolidate / split-brain toast).
- Split-brain: one-time session toast + diagnostics hint when `wsLive && subnet peer && no WS peer host`.
- Promote button: uses updated `promoteThisMacToLanHost` confirm.
- Default-open "Unirme al anfitrión de otra Mac" section if not already.

**Re-entrancy / cooldown:** module-level `Set` for declined confirm URLs + 10 min cooldown per peer URL.

- [ ] **Step 1–3: Implement, run renderer-related tests**

```bash
node --test public/js/lan-host-rank.test.mjs public/js/lan-host-consolidation.test.mjs
npm run build:ui
```

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lan/panel.mjs
git commit -m "feat(lan): hub status copy and 5s/25s host election scan loop"
```

---

### Task 8: Update `pickPreferredLanPeerHost` for election

**Files:**
- Modify: `public/js/lan-host-rank.mjs`
- Modify: `public/js/lan-host-rank-policy.mjs`

Replace rank-only loop with: among peers where `resolveHostElection` is not `'self'|'tie-self'`, pick peer with highest `lanHostPriority`, then earliest `startedAt`, then URL — return `{ url, peer, election }`.

- [ ] **Step 1: Add test in `lan-host-rank.test.mjs` with mocked `fetchLanHostRank` injection** (or export internal `pickBestPeerFromMetas` pure helper and test that).

- [ ] **Step 2: Commit**

```bash
git add public/js/lan-host-rank.mjs public/js/lan-host-rank-policy.mjs public/js/lan-host-rank.test.mjs
git commit -m "feat(lan): pick preferred peer using full host election"
```

---

### Task 9: Register tests + project context

**Files:**
- Modify: `package.json` (`scripts.test` list)
- Modify: `.cursor/rules/project-context.mdc`

Add to `npm test`:

```
public/js/lan-host-rank.test.mjs
public/js/lan-host-subnet-discovery.test.mjs
public/js/lan-host-consolidation.test.mjs
lan-squad/host-clinical-meta.test.js
```

( `lan-squad/host-router.test.js` already listed.)

- [ ] **Step 1: Run targeted LAN tests**

```bash
node --test lan-squad/host-clinical-meta.test.js lan-squad/host-router.test.js \
  public/js/lan-host-rank.test.mjs public/js/lan-host-subnet-discovery.test.mjs \
  public/js/lan-host-consolidation.test.mjs
```

- [ ] **Step 2: Run metrics gate on touched files**

```bash
npm run metrics:check
```

- [ ] **Step 3: Update project-context changelog** (same commit as final feature commit or docs commit)

- [ ] **Step 4: Final commit**

```bash
git add package.json .cursor/rules/project-context.mdc
git commit -m "chore(test): register LAN single-host consolidation tests"
```

---

## Self-review (spec coverage)

| Spec § | Task |
|--------|------|
| Disk meta + IPC | 1, existing IPC |
| `GET /host-rank` + drop advertise | 2 |
| `resolveHostElection` | 3 |
| Subnet discovery merge | 4 |
| `consolidateIntoHost` ordering | 5–6 |
| Boot `initLanHostPlugAndPlay` | 6 |
| Scan 5s / 25s | 7 |
| Promote confirm | 6–7 |
| UX copy / split-brain | 7 |
| Pin never auto-yield | 6–7 |
| Tests §7 | 1–5, 8–9 |
| Debt §8 | module split; metrics in 9 |

---

## Verification (before merge)

```bash
node --test lan-squad/host-clinical-meta.test.js lan-squad/host-router.test.js \
  public/js/lan-host-rank.test.mjs public/js/lan-host-subnet-discovery.test.mjs \
  public/js/lan-host-consolidation.test.mjs
npm run build:ui
npm run metrics:check
```

Manual: two Electron hosts same subnet, R4+admin vs R4, confirm consolidation, clients follow handoff, pinned host does not yield.
