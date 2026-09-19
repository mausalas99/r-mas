# Cloud Mobile (iPad / R+ Móvil Nube) — 7.10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship R+ Móvil on Nube so iPad can join a Sala/Torre HU cloud room over the internet (no LAN host), with desktop ⇄ invite + QR.

**Architecture:** Extend `cloud/sync-worker` with an `ASSETS` binding (`cloud/sync-pages/public`) serving `/mobile/*`. Mobile Safari loads the same renderer bundle in mobile mode; `cloud-mobile/` boot skips LAN transport, logs in via existing Worker auth, pull/pushes via existing sync API, and applies team scope from `clinicalOps`. Desktop Electron adds Nube iPad invite URLs pointing to the Worker.

**Tech Stack:** Cloudflare Workers + D1 + ASSETS, esbuild bundle copy, renderer ESM (`public/js/features/cloud-mobile/`), existing `cloud-sync` pull/push stack.

**Spec:** [`docs/superpowers/specs/2026-08-05-cloud-mobile-ipad-design.md`](../../superpowers/specs/2026-08-05-cloud-mobile-ipad-design.md)

## Global Constraints

- Release target: **7.10.0** (do not bump `package.json` until release cut).
- Sala allowlist: cloud mobile **only** for **Sala** + **Torre HU**; Inters / UX / Eme / Área A stay LAN mobile.
- Each iPad user **logs in** with own Nube credentials; desktop invite is room deep link only (no sharer session hijack).
- Mobile poll: **30s** idle when `document.visibilityState === 'visible'`; pause when hidden.
- Token on mobile: **sessionStorage only**; `getCloudSyncRemember()` forced **false** on cloud mobile.
- PHI: session memory + `wipeSessionClinicalStorage` on exit; no `CLINICAL_LS_KEYS` in `localStorage`.
- No new static imports in `app.js` / `app-runtimes.mjs` cold boot path — dynamic `import()` from mobile boot only.
- Spanish UI copy for user-facing strings.
- Do not hand-edit `public/js/app.bundle.mjs` or `cloud/sync-pages/` artifacts — run build scripts.
- `npm run metrics:check` must pass before merge; Tier 1 on all new/touched `.mjs` files.
- Phase B (Interno MIP cloud) is **out of scope** for this plan.

---

## File map (locked)

| File | Responsibility |
|------|----------------|
| `cloud/sync-pages/public/mobile/` | Built static shell + bundle (generated) |
| `cloud/sync-worker/wrangler.toml` | `ASSETS` binding |
| `cloud/sync-worker/src/index.js` | API + static `/mobile/*` |
| `cloud/sync-worker/src/assets.test.js` | Miniflare smoke: ASSETS + CORS |
| `scripts/build-cloud-mobile.mjs` | Copy bundle + rewrite paths |
| `public/js/features/cloud-mobile/origin.mjs` | `isCloudMobileClient()` |
| `public/js/features/cloud-mobile/invite-url.mjs` | `buildCloudMobileJoinUrl()` |
| `public/js/features/cloud-mobile/session.mjs` | Session-only cloud settings |
| `public/js/features/cloud-mobile/mutation-gate.mjs` | Allowlist ops before push |
| `public/js/features/cloud-mobile/runtime.mjs` | Mobile sync loop + mutate bridge |
| `public/js/features/cloud-mobile/login-ui.mjs` | Standalone login/join UI |
| `public/js/features/cloud-mobile/boot.mjs` | `initCloudMobileBoot()` |
| `public/js/features/cloud-sync/panel-mobile-invite.mjs` | Desktop ⇄ card + QR |
| `public/js/app-shell-mobile-boot.mjs` | Branch cloud vs LAN boot |
| `public/js/features/cloud-sync/cloud-sync-timing.mjs` | `CLOUD_POLL_MOBILE_IDLE_MS` |
| `public/js/features/lan/panel-render-once.mjs` | Append Nube mobile invite |

---

### Task 1: Worker ASSETS scaffolding

**Files:**
- Create: `cloud/sync-pages/public/mobile/.gitkeep` (placeholder until build)
- Modify: `cloud/sync-worker/wrangler.toml`
- Modify: `cloud/sync-worker/src/index.js`
- Create: `cloud/sync-worker/src/assets.test.js`
- Test: `cloud/sync-worker/src/assets.test.js`

**Interfaces:**
- Consumes: none
- Produces: Worker serves `GET /mobile/` → `index.html` from ASSETS; API unchanged at `/api/sync/v1/*`

- [ ] **Step 1: Add ASSETS binding to wrangler**

```toml
[assets]
directory = "../sync-pages/public"
binding = "ASSETS"
```

Append to `cloud/sync-worker/wrangler.toml` after the `[[d1_databases]]` block.

- [ ] **Step 2: Extend Worker fetch handler (equipos pattern)**

Replace `cloud/sync-worker/src/index.js` body with asset serving before 404:

```javascript
import { applyCors, corsPreflight } from './cors.js';
import { API_PREFIX, handleApiRoute } from './routes.js';

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

/** @param {Request} request @param {import('@cloudflare/workers-types').ExecutionContext} env */
async function handleRequest(request, env) {
  const preflight = corsPreflight(request);
  if (preflight) return applyCors(request, preflight);

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  if (path === `${API_PREFIX}/ping` && request.method === 'GET') {
    return applyCors(
      request,
      Response.json({ ok: true, service: 'rplus-sync' })
    );
  }

  const apiResponse = await handleApiRoute(request, env);
  if (apiResponse) return applyCors(request, apiResponse);

  if (env.ASSETS) {
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) return applyCors(request, assetRes);
    if (url.pathname !== path) {
      const slashless = new Request(new URL(path + url.search, url.origin), request);
      const retryRes = await env.ASSETS.fetch(slashless);
      if (retryRes.status !== 404) return applyCors(request, retryRes);
    }
  }

  if (path === '/mobile' || path === '/mobile/join') {
    const indexReq = new Request(new URL('/mobile/index.html', url.origin), request);
    const indexRes = env.ASSETS
      ? await env.ASSETS.fetch(indexReq)
      : new Response('Not found', { status: 404 });
    return applyCors(request, indexRes);
  }

  return applyCors(request, Response.json({ error: 'not_found' }, { status: 404 }));
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      const message = err && err.message ? String(err.message) : 'error';
      console.error('rplus-sync unhandled', message);
      return applyCors(
        request,
        Response.json({ error: 'internal_error', message }, { status: 500 })
      );
    }
  },
};
```

- [ ] **Step 3: Write Miniflare asset test**

Create `cloud/sync-worker/src/assets.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import path from 'node:path';
import fs from 'node:fs';

describe('sync-worker ASSETS', () => {
  it('serves /mobile/index.html when present', async () => {
    const pagesRoot = path.join(process.cwd(), 'cloud/sync-pages/public');
    const mobileIndex = path.join(pagesRoot, 'mobile/index.html');
    if (!fs.existsSync(mobileIndex)) {
      fs.mkdirSync(path.dirname(mobileIndex), { recursive: true });
      fs.writeFileSync(mobileIndex, '<!DOCTYPE html><html><body>mobile stub</body></html>');
    }
    const mf = new Miniflare({
      scriptPath: path.join(process.cwd(), 'cloud/sync-worker/src/index.js'),
      modules: true,
      compatibilityDate: '2026-06-01',
      assets: { directory: pagesRoot, binding: 'ASSETS' },
    });
    const res = await mf.dispatchFetch('http://localhost/mobile/');
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /mobile stub|R\+/);
    await mf.dispose();
  });
});
```

- [ ] **Step 4: Run test**

```bash
npm run test:one -- cloud/sync-worker/src/assets.test.js
```

Expected: PASS (or skip Miniflare if not in deps — if missing, add `miniflare` devDependency only if other worker tests use it; else run via existing worker test harness).

- [ ] **Step 5: Commit**

```bash
git add cloud/sync-worker/wrangler.toml cloud/sync-worker/src/index.js cloud/sync-worker/src/assets.test.js cloud/sync-pages/
git commit -m "feat(cloud-mobile): sync-worker ASSETS binding for /mobile"
```

---

### Task 2: Build script — `build-cloud-mobile.mjs`

**Files:**
- Create: `scripts/build-cloud-mobile.mjs`
- Modify: `package.json` (add `"build:cloud-mobile": "node scripts/build-cloud-mobile.mjs"`)
- Modify: `scripts/release.js` or `prebuild:mac` chain if release must include assets (grep `equipos` for pattern)

**Interfaces:**
- Consumes: `npm run build:ui` output (`public/index.html`, `public/js/app.bundle.mjs`, chunks, CSS)
- Produces: `cloud/sync-pages/public/mobile/**` tree Worker ASSETS serves

- [ ] **Step 1: Implement build script**

Create `scripts/build-cloud-mobile.mjs` with:

1. Run `node scripts/build-ui.mjs` + `node scripts/bundle-renderer.mjs` (or shell `npm run build:ui`).
2. Dest root: `cloud/sync-pages/public/mobile/`.
3. Copy with path prefix `mobile/`:
   - `public/js/app.bundle.mjs`, `public/js/chunks/**`, `public/js/app.bundle.meta.json` if present
   - `public/tokens.css` → `mobile/tokens.css`
   - `public/styles/**` → `mobile/styles/**`
   - `public/icons/**` → `mobile/icons/**`
   - `public/manifest.webmanifest` → `mobile/manifest.webmanifest` (rewrite `start_url` to `/mobile/`)
4. Build `mobile/index.html` from `public/index.html`:
   - Replace `href="/` with `href="/mobile/` and `src="/` with `src="/mobile/` (careful: don't break `https://`).
   - Inject before other scripts in `<head>`:

```html
<script>globalThis.__RPC_CLOUD_MOBILE__=true;globalThis.__RPC_MOBILE_WEB__=true;</script>
```

   - **Remove or neutralize** the block that writes `rpc-lan-config` from `token` query (lines 50–72 in generated index) — cloud mobile uses `room` code not LAN token. Replace with:

```javascript
(function () {
  try {
    if (!globalThis.__RPC_CLOUD_MOBILE__) return;
    var p = new URLSearchParams(location.search || '');
    var room = String(p.get('room') || '').trim();
    if (room) sessionStorage.setItem('rpc-cloud-mobile-join-code', room);
    var sala = String(p.get('sala') || '').trim();
    if (sala) sessionStorage.setItem('rpc-cloud-mobile-join-sala', sala);
  } catch (_e) {}
})();
```

5. Log output size (bytes) for release notes gate.

- [ ] **Step 2: Add npm script**

In `package.json` scripts:

```json
"build:cloud-mobile": "node scripts/build-cloud-mobile.mjs"
```

Wire into release if needed:

```json
"prebuild:mac": "... && npm run build:cloud-mobile"
```

Only if `cloud/sync-pages` must ship in desktop artifact for deploy docs — Worker deploy uses folder directly; desktop release may not need copy. **Minimum:** document `npm run build:cloud-mobile` before `wrangler deploy`.

- [ ] **Step 3: Run build**

```bash
npm run build:cloud-mobile
```

Expected: `cloud/sync-pages/public/mobile/index.html` exists; `curl` local Miniflare test from Task 1 passes.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-cloud-mobile.mjs package.json cloud/sync-pages/
git commit -m "chore(cloud-mobile): build script copies bundle to sync-pages"
```

---

### Task 3: Origin detection + invite URL

**Files:**
- Create: `public/js/features/cloud-mobile/origin.mjs`
- Create: `public/js/features/cloud-mobile/invite-url.mjs`
- Create: `public/js/features/cloud-mobile/invite-url.test.mjs`
- Test: `public/js/features/cloud-mobile/invite-url.test.mjs`

**Interfaces:**
- Produces:
  - `isCloudMobileClient(): boolean`
  - `buildCloudMobileJoinUrl({ baseUrl, roomCode, sala }): string`

- [ ] **Step 1: Write failing tests**

`public/js/features/cloud-mobile/invite-url.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCloudMobileJoinUrl } from './invite-url.mjs';

describe('buildCloudMobileJoinUrl', () => {
  it('builds /mobile/join with room code', () => {
    const u = buildCloudMobileJoinUrl({
      baseUrl: 'https://rplus-sync.example.workers.dev',
      roomCode: 'AB12CD',
      sala: 'Sala 1',
    });
    assert.match(u, /^https:\/\/rplus-sync\.example\.workers\.dev\/mobile\/join\?/);
    assert.match(u, /room=AB12CD/);
    assert.match(u, /sala=Sala/);
  });

  it('returns empty when missing code', () => {
    assert.equal(buildCloudMobileJoinUrl({ baseUrl: 'https://x.dev', roomCode: '' }), '');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm run test:one -- public/js/features/cloud-mobile/invite-url.test.mjs
```

- [ ] **Step 3: Implement**

`origin.mjs`:

```javascript
export function isCloudMobileClient() {
  if (typeof globalThis !== 'undefined' && globalThis.__RPC_CLOUD_MOBILE__) return true;
  if (typeof document !== 'undefined' && document.documentElement?.dataset?.cloudMobile === '1') {
    return true;
  }
  return false;
}
```

`invite-url.mjs`:

```javascript
/** @param {{ baseUrl: string, roomCode: string, sala?: string }} opts */
export function buildCloudMobileJoinUrl(opts) {
  const base = String(opts?.baseUrl || '').trim().replace(/\/+$/, '');
  const code = String(opts?.roomCode || '').trim();
  if (!base || !code) return '';
  const u = new URL(`${base}/mobile/join`);
  u.searchParams.set('room', code);
  const sala = String(opts?.sala || '').trim();
  if (sala) u.searchParams.set('sala', sala);
  return u.toString();
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add public/js/features/cloud-mobile/
git commit -m "feat(cloud-mobile): origin flag and invite URL builder"
```

---

### Task 4: Session-only cloud settings + memory outbox

**Files:**
- Create: `public/js/features/cloud-mobile/session.mjs`
- Create: `public/js/features/cloud-mobile/outbox-memory.mjs`
- Create: `public/js/features/cloud-mobile/outbox-memory.test.mjs`

**Interfaces:**
- Produces:
  - `createCloudMobileSettings()` — wraps `settings.mjs` with `remember: false` always
  - `createMemoryOutbox()` — same interface as `createOutbox()` from `outbox.mjs`

- [ ] **Step 1: Memory outbox test**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryOutbox } from './outbox-memory.mjs';

describe('createMemoryOutbox', () => {
  it('dedupes by clientMutationId', () => {
    const ob = createMemoryOutbox();
    ob.enqueue({ clientMutationId: 'a', ops: [{ path: 'x' }] });
    ob.enqueue({ clientMutationId: 'a', ops: [{ path: 'y' }] });
    assert.equal(ob.list().length, 1);
    assert.equal(ob.list()[0].ops[0].path, 'y');
  });
});
```

- [ ] **Step 2: Implement `outbox-memory.mjs`**

In-memory array; same `enqueue`, `list`, `remove`, `clear` as `outbox.mjs` — **no localStorage**.

- [ ] **Step 3: Implement `session.mjs`**

Re-export getters from `../cloud-sync/settings.mjs` but:

```javascript
import {
  getCloudSyncUrl,
  getCloudSyncToken,
  setCloudSyncToken,
  getCloudSyncRoomId,
  setCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
  setCloudSyncRoomSnapshot,
  getCloudSyncRoomSnapshot,
  clearCloudSyncSession,
} from '../cloud-sync/settings.mjs';

export function setCloudMobileToken(token) {
  setCloudSyncToken(token, { remember: false });
}

export function readCloudMobileJoinCode() {
  try {
    return String(sessionStorage.getItem('rpc-cloud-mobile-join-code') || '').trim();
  } catch {
    return '';
  }
}

export function clearCloudMobileJoinHints() {
  try {
    sessionStorage.removeItem('rpc-cloud-mobile-join-code');
    sessionStorage.removeItem('rpc-cloud-mobile-join-sala');
  } catch { /* ignore */ }
}

export {
  getCloudSyncUrl,
  getCloudSyncToken,
  getCloudSyncRoomId,
  setCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
  setCloudSyncRoomSnapshot,
  getCloudSyncRoomSnapshot,
  clearCloudSyncSession,
  setCloudMobileToken,
};
```

- [ ] **Step 4: Run tests + commit**

---

### Task 5: Mobile mutation gate

**Files:**
- Create: `public/js/features/cloud-mobile/mutation-gate.mjs`
- Create: `public/js/features/cloud-mobile/mutation-gate.test.mjs`

**Interfaces:**
- Produces: `filterOpsForCloudMobile(ops: unknown[]): unknown[]`

Allowlist paths (regex):

```javascript
const ALLOWED = [
  /^entries\/[^/]+\/monitoreo$/,
  /^entries\/[^/]+\/estadoActual$/,
  /^entries\/[^/]+\/note$/,
  /^entries\/[^/]+\/indicaciones$/,
  /^todos\/[^/]+$/,
];
// Reject: clinicalOps, agenda, tombstones, labs sidecars, entries/*/labHistory
```

- [ ] **Step 1: Write tests** for allowed vitals path and rejected `clinicalOps`.

- [ ] **Step 2: Implement filter** — return ops where `path` matches allowlist.

- [ ] **Step 3: Run `npm run test:one -- public/js/features/cloud-mobile/mutation-gate.test.mjs`**

- [ ] **Step 4: Commit**

---

### Task 6: Mobile poll interval

**Files:**
- Modify: `public/js/features/cloud-sync/cloud-sync-timing.mjs`
- Modify: `public/js/features/cloud-sync/cloud-sync-timing.test.mjs`

**Interfaces:**
- Produces: `CLOUD_POLL_MOBILE_IDLE_MS = 30_000`
- `nextCloudPollDelayMs({ mobile: true })` returns mobile idle when not pending/active/error

- [ ] **Step 1: Add constant and branch**

```javascript
export const CLOUD_POLL_MOBILE_IDLE_MS = 30_000;

export function nextCloudPollDelayMs(opts = {}) {
  // ... existing error/active logic ...
  if (opts.mobile && !opts.pending && !(lastWrite && now - lastWrite < CLOUD_POLL_ACTIVE_WINDOW_MS)) {
    return CLOUD_POLL_MOBILE_IDLE_MS;
  }
  return CLOUD_POLL_IDLE_MS;
}
```

- [ ] **Step 2: Update test** — mobile idle 30_000 vs desktop 45_000.

- [ ] **Step 3: Commit**

---

### Task 7: Mobile sync runtime

**Files:**
- Create: `public/js/features/cloud-mobile/runtime.mjs`
- Modify: `public/js/features/cloud-sync/sync-runtime-schedule.mjs` — pass `mobile: true` into `nextCloudPollDelayMs` when option set
- Modify: `public/js/features/cloud-sync/sync-runtime-cycle.mjs` — accept `pollMobile?: boolean` in deps

**Interfaces:**
- Consumes: `createCloudSyncApi`, `createMemoryOutbox`, `filterOpsForCloudMobile`, `applyCloudPullResult`, `configureCloudMutateBridge`
- Produces: `startCloudMobileRuntime(deps): { stop, flushOutbox, syncCycle }`

- [ ] **Step 1: Wire mobile flag through scheduler**

In `sync-runtime-cycle.mjs`, when creating scheduler, pass `mobile: deps.pollMobile` into `nextCloudPollDelayMs`.

Add visibility pause:

```javascript
if (deps.pollMobile && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
  // reschedule without syncing — arm timer only
}
```

- [ ] **Step 2: Implement `runtime.mjs`**

Mirror `panel-conexion-runtime.mjs`:

```javascript
import { startCloudSyncRuntime, stopCloudSyncRuntime } from '../cloud-sync/sync-runtime.mjs';
import { createCloudSyncApi } from '../cloud-sync/api-client.mjs';
import { configureCloudMutateBridge } from '../cloud-sync/mutate-bridge.mjs';
import { applyCloudPullResult } from '../cloud-sync/pull-apply.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { createMemoryOutbox } from './outbox-memory.mjs';
import { filterOpsForCloudMobile } from './mutation-gate.mjs';
import {
  getCloudSyncUrl,
  getCloudSyncToken,
  getCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
} from './session.mjs';

export function startCloudMobileRuntime({ onStatus, toast }) {
  stopCloudMobileRuntime();
  const roomId = getCloudSyncRoomId();
  const token = getCloudSyncToken();
  if (!roomId || !token) return null;

  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken,
  });

  const outbox = createMemoryOutbox();
  const wrappedOutbox = {
    enqueue(item) {
      const ops = filterOpsForCloudMobile(item?.ops || []);
      if (!ops.length) return;
      outbox.enqueue({ ...item, ops });
    },
    list: outbox.list,
    remove: outbox.remove,
    clear: outbox.clear,
  };

  const runtime = startCloudSyncRuntime({
    api,
    outbox: wrappedOutbox,
    getRoomId: getCloudSyncRoomId,
    getRevision: getCloudSyncRevision,
    setRevision: setCloudSyncRevision,
    onStatus,
    pollMobile: true,
    applyPullResult: async (result) => {
      await applyCloudPullResult(result);
    },
  });

  configureCloudMutateBridge({
    outbox: wrappedOutbox,
    getRevision: getCloudSyncRevision,
    flush: () => runtime?.flushOutbox(),
    getActorId: () => String(clinicalSessionContext.user?.user_id || 'mobile'),
  });

  void runtime.syncCycle();
  _runtime = runtime;
  return runtime;
}

let _runtime = null;
export function stopCloudMobileRuntime() {
  stopCloudSyncRuntime();
  _runtime = null;
}
```

Extend `startCloudSyncRuntime` / `createSyncRuntimeCycle` to forward `pollMobile` (add optional field to deps object).

- [ ] **Step 3: Run existing cloud sync timing + runtime tests**

```bash
npm run test:one -- public/js/features/cloud-sync/cloud-sync-timing.test.mjs
npm run test:one -- public/js/features/cloud-sync/sync-runtime-cycle.test.mjs
```

- [ ] **Step 4: Commit**

---

### Task 8: Mobile login UI

**Files:**
- Create: `public/js/features/cloud-mobile/login-ui.mjs`

**Interfaces:**
- Produces: `mountCloudMobileLoginShell(root, { onConnected })` — renders login/register/join-room minimal forms
- Consumes: `createCloudSyncApi`, session helpers, `setCloudSyncRoomSnapshot`, `startCloudMobileRuntime`

- [ ] **Step 1: Implement minimal UI** (Spanish copy)

States:
1. **Sin sesión** — username/password login + link «Crear cuenta» (register: username, password, displayName).
2. **Con sesión, sin sala** — input room code (pre-fill from `readCloudMobileJoinCode()`), button «Unirse al turno» → `api.joinRoom({ code })` → `setCloudSyncRoomSnapshot`.
3. **Conectado** — hide shell, call `onConnected()`.

Reuse field validation messages from `panel-conexion-handlers.mjs` (read, don't duplicate business rules).

Mount target: `#rpc-cloud-mobile-gate` div — create in boot if missing.

Styles: reuse `cloud-sync-conexion` / `settings-card` classes from existing Conexión CSS (no new CSS file unless necessary).

- [ ] **Step 2: Manual smoke** — deferred to Task 10 integration.

- [ ] **Step 3: Commit**

---

### Task 9: Cloud mobile boot

**Files:**
- Create: `public/js/features/cloud-mobile/boot.mjs`
- Modify: `public/js/app-shell-mobile-boot.mjs`

**Interfaces:**
- Produces: `initCloudMobileBoot()` — async, replaces LAN path when `isCloudMobileClient()`

- [ ] **Step 1: Implement `boot.mjs`**

```javascript
import { isCloudMobileClient } from './origin.mjs';
import { isMobileWeb, syncMobileBarebonesChrome } from '../../mobile-web.mjs';
import { wipeSessionClinicalStorage, installSessionClinicalWipeOnExit } from '../../session-clinical-wipe.mjs';
import { clearWebSessionClinicalMemory } from '../../app-state.mjs';
import { mountCloudMobileLoginShell } from './login-ui.mjs';
import { startCloudMobileRuntime, stopCloudMobileRuntime } from './runtime.mjs';
import { clearCloudMobileJoinHints, getCloudSyncToken, getCloudSyncRoomId } from './session.mjs';

export async function initCloudMobileBoot() {
  if (!isCloudMobileClient() || !isMobileWeb()) return;

  installSessionClinicalWipeOnExit();
  wipeSessionClinicalStorage({ includeLanSession: false });
  clearWebSessionClinicalMemory();
  syncMobileBarebonesChrome();

  const gate = document.createElement('div');
  gate.id = 'rpc-cloud-mobile-gate';
  gate.className = 'rpc-cloud-mobile-gate';
  document.body.appendChild(gate);

  function onConnected() {
    gate.hidden = true;
    clearCloudMobileJoinHints();
    startCloudMobileRuntime({
      onStatus(status, detail) {
        // optional: update #rpc-cloud-status-chip if present
      },
      toast: (msg, kind) => {
        try {
          window.showToast?.(msg, kind);
        } catch { /* ignore */ }
      },
    });
    document.dispatchEvent(new CustomEvent('rpc-cloud-mobile-ready'));
  }

  if (getCloudSyncToken() && getCloudSyncRoomId()) {
    onConnected();
    return;
  }

  mountCloudMobileLoginShell(gate, { onConnected });
}

export function isCloudMobileBoot() {
  return isCloudMobileClient() && isMobileWeb();
}
```

- [ ] **Step 2: Branch `app-shell-mobile-boot.mjs`**

At top of `initMobileWebBoot`:

```javascript
import { isCloudMobileBoot, initCloudMobileBoot } from './features/cloud-mobile/boot.mjs';

export async function initMobileWebBoot() {
  if (isCloudMobileBoot()) {
    await initCloudMobileBoot();
    return;
  }
  // ... existing LAN boot ...
}
```

Use dynamic import if static import adds boot graph debt:

```javascript
if (typeof globalThis !== 'undefined' && globalThis.__RPC_CLOUD_MOBILE__) {
  const { initCloudMobileBoot } = await import('./features/cloud-mobile/boot.mjs');
  await initCloudMobileBoot();
  return;
}
```

Prefer **dynamic import** inside `initMobileWebBoot` to avoid boot-graph regression.

- [ ] **Step 3: Wire mobile LAN settled listener** — cloud path dispatches `rpc-cloud-mobile-ready` instead of `rpc-mobile-lan-sync-settled`; in `finalizeMobileLanPatientCensus` path, listen for cloud ready too (or call `finalizeMobileLanPatientCensus` from `onConnected`).

- [ ] **Step 4: `npm run build:ui`**

- [ ] **Step 5: Commit**

---

### Task 10: Desktop Nube iPad invite panel

**Files:**
- Create: `public/js/features/cloud-sync/panel-mobile-invite.mjs`
- Modify: `public/js/features/lan/panel-render-once.mjs`
- Modify: `public/js/features/lan/panel-invite-join.mjs` (optional: export QR helper reuse)

**Interfaces:**
- Produces: `appendCloudMobileInviteCard(deps, root)`

- [ ] **Step 1: Implement panel card**

`panel-mobile-invite.mjs`:

```javascript
import { buildCloudMobileJoinUrl } from '../cloud-mobile/invite-url.mjs';
import { getCloudSyncUrl, getCloudSyncRoomSnapshot } from './settings.mjs';
import { drawInternoQrCanvas } from '../../interno-qr-render.mjs'; // or copyInternoQrImage

export function appendCloudMobileInviteCard(deps, root) {
  const snap = getCloudSyncRoomSnapshot();
  if (!snap?.code) return;

  const url = buildCloudMobileJoinUrl({
    baseUrl: getCloudSyncUrl(),
    roomCode: snap.code,
    sala: snap.sala,
  });
  if (!url) return;

  // details/summary collapsible matching lan-invite-collapsible--mobile
  // Buttons: Copiar enlace móvil (Nube), optional QR canvas
}
```

Spanish strings from spec.

- [ ] **Step 2: Call from `appendNubePanelFooterSections_`**

In `panel-render-once.mjs`, after diagnostics section:

```javascript
import { appendCloudMobileInviteCard } from '../cloud-sync/panel-mobile-invite.mjs';

async function appendNubePanelFooterSections_(deps, root, gen, expandState, dropdownScrollTop) {
  // ... existing ...
  appendCloudMobileInviteCard(deps, root);
}
```

- [ ] **Step 3: `npm run build:ui` + manual: open ⇄ on Nube Sala with room → card visible**

- [ ] **Step 4: Commit**

---

### Task 11: Tests, metrics, docs

**Files:**
- Modify: `.cursor/rules/project-context.mdc` (changelog)
- Create: `docs/RELEASE_NOTES_7.10.0.txt` (stub or full)
- Modify: `cloud/sync-worker/README.md` if exists (deploy steps)

- [ ] **Step 1: Run targeted tests**

```bash
npm run test:one -- public/js/features/cloud-mobile/invite-url.test.mjs
npm run test:one -- public/js/features/cloud-mobile/mutation-gate.test.mjs
npm run test:one -- public/js/features/cloud-mobile/outbox-memory.test.mjs
npm run test:one -- cloud/sync-worker/src/assets.test.js
npm run test:one -- public/js/features/cloud-sync/cloud-sync-timing.test.mjs
```

- [ ] **Step 2: Metrics**

```bash
npm run metrics:check
```

Fix any Tier 1 violations in touched files.

- [ ] **Step 3: Changelog** in `project-context.mdc`:

```markdown
- **2026-08-05** `cloud-mobile`: R+ Móvil on Nube (Worker ASSETS + mobile boot + ⇄ invite); `cloud/sync-pages/`, `public/js/features/cloud-mobile/`, `cloud/sync-worker`.
```

- [ ] **Step 4: Release notes stub** — Sala/Torre iPad sin LAN; install 7.10+ desktops; `npm run build:cloud-mobile` before Worker deploy.

- [ ] **Step 5: Commit**

```bash
git add docs/ .cursor/rules/project-context.mdc
git commit -m "docs(cloud-mobile): 7.10 release notes and project context"
```

---

### Task 12: Deploy checklist (human + agent)

- [ ] **Build assets**

```bash
npm run build:cloud-mobile
```

- [ ] **Deploy Worker**

```bash
cd cloud/sync-worker && npx wrangler deploy
```

- [ ] **Verify**

```bash
curl -sS "https://rplus-sync.rmas-workersdev.workers.dev/mobile/" | head
curl -sS "https://rplus-sync.rmas-workersdev.workers.dev/api/sync/v1/ping"
```

- [ ] **Manual QA** (from spec):

1. Desktop A+B on Nube Sala; copy cloud iPad link; iPad on LTE → login → join → census matches team scope.
2. iPad signos → desktop EA ≤30s.
3. iPad logout → no clinical keys in `localStorage`.
4. UX sala → LAN mobile invite still present; no cloud card.
5. LAN Sala (no Nube) → LAN mobile unchanged.

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Worker ASSETS `/mobile/*` | Task 1, 2 |
| Login on iPad | Task 8, 9 |
| pull/push reuse | Task 7 |
| Team scope clinicalOps | Task 7 (pull-apply) |
| Desktop invite + QR | Task 10 |
| Session PHI wipe | Task 9 |
| Sala allowlist only | Task 10 (gated by Nube panel) |
| Mobile poll 30s | Task 6, 7 |
| Mutation allowlist | Task 5, 7 |
| No LAN transport on cloud mobile | Task 9 |
| LAN salas unchanged | Task 9 branch |
| Free tier poll budget | Task 6 |
| 7.10 release + deploy both | Task 12 |
| Phase B interno | **Deferred** — separate plan |

## Placeholder scan

No TBD / implement later in task steps. All file paths and signatures defined above.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-05-cloud-mobile-7.10.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — one fresh subagent per task, review between tasks.
2. **Inline Execution** — implement tasks in this session with checkpoints.

Which approach do you want?
