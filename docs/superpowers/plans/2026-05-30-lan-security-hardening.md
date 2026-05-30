# LAN Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the LAN squad host (port 3738) with secure token bootstrap (zero clinical data loss), ticket/PIN pairing, Bearer-only HTTP, WebSocket first-frame auth, tiered rate limiting, and log/error redaction.

**Architecture:** Server-side foundation first (`redact-secrets` → `bootstrapLanTeamCode` / `rehashLanHostState` → `ticket-store` / `auth-router` → Bearer middleware → WS quarantine → `server.js` wiring), then renderer/Electron client updates. No permanent secrets in URLs.

**Tech Stack:** Node.js 20+, Express 5, `ws`, `express-rate-limit`, native `node:test`, Electron renderer bundles.

**Spec:** `docs/superpowers/specs/2026-05-30-lan-security-hardening-design.md`

---

## File map (create / modify)

| File | Action | Responsibility |
|------|--------|----------------|
| `lan-squad/redact-secrets.js` | Create | Redact Bearer, pin, ticket, URL secrets for logs/errors |
| `lan-squad/redact-secrets.test.js` | Create | Unit tests for redaction |
| `lan-squad/effective-team-code.js` | Modify | `bootstrapLanTeamCode`, `rehashLanHostState`, `isWeakLanToken`; remove `1234` |
| `lan-squad/effective-team-code.test.js` | Modify | Rewrite tests for secure bootstrap |
| `lan-squad/host-store.js` | Modify | Throw on hash mismatch instead of wipe |
| `lan-squad/host-store.test.js` | Modify | Assert throw preserves file |
| `lan-squad/bearer-auth.js` | Create | `getBearerToken`, `createBearerAuthMiddleware` |
| `lan-squad/ticket-store.js` | Create | In-memory TTL tickets + PIN index |
| `lan-squad/ticket-store.test.js` | Create | TTL, burn-after-read, PIN collision |
| `lan-squad/auth-router.js` | Create | `/auth/tickets`, `/auth/exchange`, `/host-status` |
| `lan-squad/auth-router.test.js` | Create | Exchange + mint integration tests |
| `lan-squad/host-router.js` | Modify | Bearer-only; export middleware from bearer-auth |
| `lan-squad/host-router.test.js` | Modify | Bearer header; `?code=` ignored → 401 |
| `lan-squad/ws-hub.js` | Modify | Quarantine + 3s first-frame auth |
| `lan-squad/ws-hub.test.js` | Create | Auth timeout + success paths |
| `server.js` | Modify | Bootstrap, limiters, CORS, `/join/:ticketId`, redaction, 500 audit |
| `package.json` | Modify | `express-rate-limit`; extend `npm test` file list |
| `public/js/lan-client.mjs` | Modify | Bearer fetch + WS auth frame |
| `public/js/lan-join-link.mjs` | Modify | Ticket path URLs; legacy parse message |
| `public/js/lan-join-link.test.mjs` | Modify | Ticket URLs + legacy UX |
| `public/js/lan-join-boot.mjs` | Create | Mobile `/join/:ticket` exchange + replaceState |
| `public/js/features/lan-sync.mjs` | Modify | Remove `1234`; mint UI; migration modal |
| `public/js/storage.js` | Modify | `rplus.lan.bearer` helpers (optional thin wrapper) |
| `main.js` | Modify | `lan-guest-write-bearer`; safe team-code IPC |
| `public/mobile/index.html` | Modify | Delegate to join boot when path matches (or server-only route) |

**localStorage keys (locked):**

- `rplus.lan.bearer` — permanent 64-hex Bearer (mobile)
- Existing `saveLanConfig({ hostUrl, teamCode })` — `teamCode` holds Bearer on desktop after exchange

---

### Task 1: Secret redaction module

**Files:**
- Create: `lan-squad/redact-secrets.js`
- Create: `lan-squad/redact-secrets.test.js`
- Modify: `package.json` (add test file to `scripts.test`)

- [ ] **Step 1: Write failing tests**

```javascript
// lan-squad/redact-secrets.test.js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  redactBearerHeader,
  redactAuthBody,
  redactUrlSecrets,
  redactForLog,
} = require('./redact-secrets.js');

test('redactBearerHeader masks token', () => {
  const h = 'Bearer abcdef0123456789';
  assert.strictEqual(redactBearerHeader(h), 'Bearer [REDACTED]');
});

test('redactAuthBody masks pin and ticket', () => {
  const out = redactAuthBody({ pin: '482917', ticket: 'req_abc', ok: true });
  assert.strictEqual(out.pin, '[REDACTED]');
  assert.strictEqual(out.ticket, '[REDACTED]');
  assert.strictEqual(out.ok, true);
});

test('redactUrlSecrets masks code and token query params', () => {
  const u = redactUrlSecrets('/api/lan/v1/ws?code=secret&channel=sync');
  assert.ok(!u.includes('secret'));
  assert.ok(u.includes('code=[REDACTED]') || u.includes('code=%5BREDACTED%5D'));
});

test('redactForLog redacts nested authorization', () => {
  const s = redactForLog({ headers: { authorization: 'Bearer xyz' } });
  assert.ok(!s.includes('xyz'));
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `node --test lan-squad/redact-secrets.test.js`  
Expected: FAIL — `Cannot find module './redact-secrets.js'`

- [ ] **Step 3: Implement `lan-squad/redact-secrets.js`**

```javascript
'use strict';

const SENSITIVE_BODY_KEYS = new Set(['pin', 'ticket', 'token', 'code']);
const BEARER_RE = /^Bearer\s+\S+/i;

function redactBearerHeader(value) {
  const s = String(value || '');
  if (!BEARER_RE.test(s)) return s;
  return s.replace(BEARER_RE, 'Bearer [REDACTED]');
}

function redactAuthorizationHeaders(headers) {
  const out = { ...(headers || {}) };
  for (const k of Object.keys(out)) {
    if (k.toLowerCase() === 'authorization') out[k] = redactBearerHeader(out[k]);
  }
  return out;
}

function redactAuthBody(body) {
  if (!body || typeof body !== 'object') return body;
  const out = { ...body };
  for (const key of Object.keys(out)) {
    if (SENSITIVE_BODY_KEYS.has(key)) out[key] = '[REDACTED]';
  }
  return out;
}

function redactUrlSecrets(url) {
  return String(url || '').replace(
    /([?&](?:code|token)=)[^&]*/gi,
    '$1[REDACTED]'
  );
}

function redactForLog(value, depth = 0) {
  if (depth > 6) return '[MaxDepth]';
  if (value == null) return value;
  if (typeof value === 'string') return redactBearerHeader(redactUrlSecrets(value));
  if (Array.isArray(value)) return value.map((v) => redactForLog(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_BODY_KEYS.has(k) || k.toLowerCase() === 'authorization') {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactForLog(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

module.exports = {
  redactBearerHeader,
  redactAuthorizationHeaders,
  redactAuthBody,
  redactUrlSecrets,
  redactForLog,
};
```

- [ ] **Step 4: Run tests**

Run: `node --test lan-squad/redact-secrets.test.js`  
Expected: PASS (4 tests)

- [ ] **Step 5: Add to `package.json` `scripts.test`**

Append: `lan-squad/redact-secrets.test.js`

- [ ] **Step 6: Commit**

```bash
git add lan-squad/redact-secrets.js lan-squad/redact-secrets.test.js package.json
git commit -m "sec(lan): add secret redaction helpers for logs and errors"
```

---

### Task 2: Secure token bootstrap and host-state rehash

**Files:**
- Modify: `lan-squad/effective-team-code.js`
- Modify: `lan-squad/effective-team-code.test.js`
- Modify: `package.json` (tests already list effective-team-code)

- [ ] **Step 1: Replace tests — weak token rotation preserves patients**

```javascript
// Add to effective-team-code.test.js (replace 1234/migrate tests)
const { hashTeamCode } = require('./team-code.js');
const {
  bootstrapLanTeamCode,
  rehashLanHostState,
  isWeakLanToken,
} = require('./effective-team-code.js');

test('isWeakLanToken flags 1234 and 32-hex legacy', () => {
  assert.strictEqual(isWeakLanToken('1234'), true);
  assert.strictEqual(isWeakLanToken('a'.repeat(32)), true);
  assert.strictEqual(isWeakLanToken('x'.repeat(64)), false);
});

test('bootstrapLanTeamCode rotates 1234 and rehashes host state without data loss', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-bootstrap-'));
  const hostPath = path.join(dir, 'lan-squad-host-state.json');
  const plainWeak = '1234';
  fs.writeFileSync(path.join(dir, 'lan-team-code.txt'), plainWeak + '\n', 'utf8');
  fs.writeFileSync(
    hostPath,
    JSON.stringify({
      version: 1,
      teamCodeHash: hashTeamCode(plainWeak),
      patients: [{ id: 'p1', nombre: 'Ana', version: 1 }],
      rooms: [{ id: 'r1', displayName: 'UCI' }],
      roomSyncBundles: {},
    }),
    'utf8'
  );
  delete process.env.R_PLUS_LAN_TEAM_CODE;
  const boot = bootstrapLanTeamCode({ userDataPath: dir, hostStatePath: hostPath });
  assert.strictEqual(boot.requiresMigrationNotice, true);
  assert.strictEqual(boot.token.length, 64);
  assert.notStrictEqual(boot.token, '1234');
  const st = JSON.parse(fs.readFileSync(hostPath, 'utf8'));
  assert.strictEqual(st.patients.length, 1);
  assert.strictEqual(st.rooms.length, 1);
  assert.strictEqual(st.teamCodeHash, hashTeamCode(boot.token));
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node --test lan-squad/effective-team-code.test.js`  
Expected: FAIL — missing exports

- [ ] **Step 3: Implement bootstrap in `effective-team-code.js`**

Key exports:

```javascript
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { hashTeamCode } = require('./team-code.js');

const WEAK_EXACT = new Set(['1234']);
const LEGACY_RANDOM_TEAM_CODE_RE = /^[a-f0-9]{32}$/i;
const MIN_TOKEN_LEN = 32;

function generateSecureLanToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isWeakLanToken(token) {
  const t = String(token || '').trim();
  if (!t || t.length < MIN_TOKEN_LEN) return true;
  if (WEAK_EXACT.has(t)) return true;
  if (LEGACY_RANDOM_TEAM_CODE_RE.test(t)) return true;
  return false;
}

function atomicWriteTeamCode(filePath, token) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, token + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

function rehashLanHostState(hostStatePath, plainToken) {
  if (!hostStatePath || !fs.existsSync(hostStatePath)) return { updated: false };
  const raw = fs.readFileSync(hostStatePath, 'utf8');
  const state = JSON.parse(raw);
  state.teamCodeHash = hashTeamCode(plainToken);
  const dir = path.dirname(hostStatePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${hostStatePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
  fs.renameSync(tmp, hostStatePath);
  return { updated: true };
}

function bootstrapLanTeamCode({ userDataPath, hostStatePath }) {
  const filePath = path.join(userDataPath, 'lan-team-code.txt');
  let token = '';
  let source = 'file';
  let requiresMigrationNotice = false;
  let rotated = false;

  if (process.env.R_PLUS_LAN_TEAM_CODE) {
    token = String(process.env.R_PLUS_LAN_TEAM_CODE).trim();
    if (isWeakLanToken(token)) {
      const err = new Error(
        'R_PLUS_LAN_TEAM_CODE is too weak (min 32 chars, not 1234/legacy 32-hex). Refusing to start.'
      );
      err.code = 'LAN_WEAK_ENV_TOKEN';
      throw err;
    }
    source = 'env';
  } else if (fs.existsSync(filePath)) {
    token = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 1)[0].trim();
    if (isWeakLanToken(token)) {
      const prev = token;
      token = generateSecureLanToken();
      atomicWriteTeamCode(filePath, token);
      requiresMigrationNotice = true;
      rotated = true;
    }
  } else {
    token = generateSecureLanToken();
    atomicWriteTeamCode(filePath, token);
    source = 'created';
  }

  if (!token) {
    const err = new Error('Could not establish secure LAN team token');
    err.code = 'LAN_NO_TOKEN';
    throw err;
  }

  if (rotated) rehashLanHostState(hostStatePath, token);

  return { token, source, requiresMigrationNotice };
}

module.exports = {
  bootstrapLanTeamCode,
  rehashLanHostState,
  isWeakLanToken,
  generateSecureLanToken,
  LEGACY_RANDOM_TEAM_CODE_RE,
};
```

Remove: `DEFAULT_LAN_TEAM_CODE`, `migratePlugAndPlayTeamCode`, `ensureLanTeamCodeFile`, `readEffectiveLanTeamCode` (or keep thin `readLanTeamCodeFile` for IPC that reads file only — no default).

- [ ] **Step 4: Run tests**

Run: `node --test lan-squad/effective-team-code.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lan-squad/effective-team-code.js lan-squad/effective-team-code.test.js
git commit -m "sec(lan): secure bootstrap with zero-loss host state rehash"
```

---

### Task 3: Host store — no silent wipe on hash mismatch

**Files:**
- Modify: `lan-squad/host-store.js`
- Modify: `lan-squad/host-store.test.js`

- [ ] **Step 1: Add failing test**

```javascript
test('load throws LAN_HOST_STATE_HASH_MISMATCH instead of wiping patients', () => {
  const { hashTeamCode } = require('./team-code.js');
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      version: 1,
      teamCodeHash: hashTeamCode('old-code'),
      patients: [{ id: 'p1', nombre: 'X', version: 1 }],
      rooms: [],
      roomSyncBundles: {},
    }),
    'utf8'
  );
  const store = createHostStore({ filePath, teamCodePlain: 'new-code-64-hexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' });
  assert.throws(() => store.getState(), (e) => e.code === 'LAN_HOST_STATE_HASH_MISMATCH');
  const preserved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.strictEqual(preserved.patients.length, 1);
});
```

- [ ] **Step 2: Run test — FAIL**

Run: `node --test lan-squad/host-store.test.js`  
Expected: FAIL (patients wiped or no throw)

- [ ] **Step 3: Change `load()` mismatch branch**

```javascript
if (s.teamCodeHash !== teamCodeHash) {
  const err = new Error(
    'LAN host state teamCodeHash does not match lan-team-code.txt. Run bootstrap or rehashLanHostState.'
  );
  err.code = 'LAN_HOST_STATE_HASH_MISMATCH';
  throw err;
}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add lan-squad/host-store.js lan-squad/host-store.test.js
git commit -m "sec(lan): fail on host state hash mismatch instead of wiping"
```

---

### Task 4: Bearer auth helper

**Files:**
- Create: `lan-squad/bearer-auth.js`

- [ ] **Step 1: Implement**

```javascript
'use strict';
const { verifyTeamCode } = require('./team-code.js');

function getBearerToken(req) {
  const h = req.get('authorization') || '';
  const m = /^Bearer\s+(\S+)\s*$/i.exec(h);
  return m ? m[1] : '';
}

function createBearerAuthMiddleware(getState) {
  return (req, res, next) => {
    const token = getBearerToken(req);
    let st;
    try {
      st = getState();
    } catch (e) {
      return res.status(500).json({ error: 'host_store_error' });
    }
    if (!verifyTeamCode(token, st.teamCodeHash)) {
      return res.status(401).json({ error: 'invalid_token' });
    }
    next();
  };
}

module.exports = { getBearerToken, createBearerAuthMiddleware };
```

- [ ] **Step 2: Commit**

```bash
git add lan-squad/bearer-auth.js
git commit -m "sec(lan): add Bearer token extraction and middleware"
```

---

### Task 5: In-memory ticket store

**Files:**
- Create: `lan-squad/ticket-store.js`
- Create: `lan-squad/ticket-store.test.js`
- Modify: `package.json` test script

- [ ] **Step 1: Write failing tests** (mint, exchange by ticket, exchange by pin, burn-after-read, expired)

```javascript
test('exchange by pin burns ticket', () => {
  const store = createTicketStore();
  const { ticketId, pin } = store.mint();
  const a = store.exchange({ pin });
  assert.ok(a.token);
  assert.strictEqual(store.exchange({ pin }), null);
  assert.strictEqual(store.exchange({ ticket: ticketId }), null);
});
```

- [ ] **Step 2: Implement `ticket-store.js`**

- `mint()` → `{ ticketId: 'req_' + randomBytes(6).toString('hex'), pin, expiresAt }`
- `exchange({ ticket?, pin? })` → `{ token }` or `null`; mark used + delete from maps
- TTL 5 minutes; `sweep()` optional

Host token passed to store constructor: `createTicketStore({ getHostToken: () => boot.token })` — exchange returns `getHostToken()`.

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add lan-squad/ticket-store.js lan-squad/ticket-store.test.js package.json
git commit -m "sec(lan): in-memory single-use ticket and PIN store"
```

---

### Task 6: Auth router (tickets, exchange, host-status)

**Files:**
- Create: `lan-squad/auth-router.js`
- Create: `lan-squad/auth-router.test.js`
- Modify: `package.json` test script

- [ ] **Step 1: Write integration test with express + supertest pattern (native http)**

Use `node:http` + `fetch` like `host-router.test.js`:

```javascript
test('POST /auth/exchange returns bearer and burns ticket', async () => {
  // setup app with ticketStore, boot.token, mount router
  const mintRes = await fetch(`${base}/auth/tickets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  const { ticketId } = await mintRes.json();
  const ex = await fetch(`${base}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket: ticketId }),
  });
  assert.strictEqual(ex.status, 200);
  const body = await ex.json();
  assert.strictEqual(body.token, hostToken);
  assert.strictEqual(body.persist, true);
});
```

- [ ] **Step 2: Implement `createAuthRouter({ ticketStore, getHostToken, getHostUrl, getRequiresMigrationNotice })`**

Routes:

- `POST /auth/tickets` — behind `createBearerAuthMiddleware`
- `POST /auth/exchange` — public; validate exactly one of `pin`/`ticket`; use `redactAuthBody` in any error logs
- `GET /host-status` — Bearer; `{ ok: true, requiresMigrationNotice, lan: true }`

Exchange response per spec; never log `req.body` raw.

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add lan-squad/auth-router.js lan-squad/auth-router.test.js package.json
git commit -m "sec(lan): auth router for ticket mint and exchange"
```

---

### Task 7: Host router — Bearer only

**Files:**
- Modify: `lan-squad/host-router.js`
- Modify: `lan-squad/host-router.test.js`

- [ ] **Step 1: Update test — reject query code**

```javascript
const withQuery = await fetch(`${base}?code=${code}`, { headers: {} });
assert.strictEqual(withQuery.status, 401);
const ok = await fetch(base, { headers: { Authorization: `Bearer ${code}` } });
```

- [ ] **Step 2: Replace `teamCodeMiddleware` with `createBearerAuthMiddleware` from `bearer-auth.js`**

Remove `req.get('x-lan-team-code')` and `req.query.code`.

- [ ] **Step 3: Run `node --test lan-squad/host-router.test.js` — PASS**

- [ ] **Step 4: Commit**

```bash
git add lan-squad/host-router.js lan-squad/host-router.test.js
git commit -m "sec(lan): require Authorization Bearer on LAN REST routes"
```

---

### Task 8: WebSocket first-frame authentication

**Files:**
- Modify: `lan-squad/ws-hub.js`
- Create: `lan-squad/ws-hub.test.js`
- Modify: `package.json` test script

- [ ] **Step 1: Write test using `ws` client**

- Connect without auth → send non-auth message → socket closed
- Connect → send `{ type: 'auth', token: valid }` within 3s → message broadcast works

- [ ] **Step 2: Refactor `attachWsHub`**

- Remove `searchParams.get('code')` on upgrade
- On `connection`: start 3s timer; only after valid auth call `joinRoom(ws, channel)`
- Use `redactAuthBody` if logging parse errors
- Reject URL containing `code=` or `token=` query keys on upgrade (optional hardening)

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add lan-squad/ws-hub.js lan-squad/ws-hub.test.js package.json
git commit -m "sec(lan): WebSocket quarantine and first-frame auth"
```

---

### Task 9: Server integration (bootstrap, rate limits, CORS, join route, redaction audit)

**Files:**
- Modify: `server.js`
- Modify: `package.json` (`express-rate-limit` dependency)

- [ ] **Step 1: Install dependency**

```bash
npm install express-rate-limit@^7.5.0
```

- [ ] **Step 2: Wire bootstrap before `createHostStore`**

Replace:

```javascript
migratePlugAndPlayTeamCode(...);
ensureLanTeamCodeFile(...);
const { code: LAN_TEAM_CODE } = readEffectiveLanTeamCode(...);
```

With:

```javascript
let boot;
try {
  boot = bootstrapLanTeamCode({ userDataPath: userData, hostStatePath: lanStatePath });
} catch (e) {
  console.error('[lan]', redactForLog({ message: e.message, code: e.code }));
  process.exit(1);
}
appExpress.locals.lanRequiresMigrationNotice = boot.requiresMigrationNotice;
const LAN_TEAM_CODE = boot.token;
```

- [ ] **Step 3: Rate limiters**

```javascript
const rateLimit = require('express-rate-limit');
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'rate_limit_exceeded' }),
});
appExpress.use(globalLimiter);

const generateLimiter = rateLimit({ windowMs: 60 * 1000, max: 8, /* same handler */ });
['/generate', '/generate-indicaciones', '/generate-listado', '/generate-censo', '/generate-receta-hu']
  .forEach((p) => appExpress.post(p, generateLimiter));
```

Mount `authExchangeLimiter` / `authTicketLimiter` on auth routes when mounting router.

- [ ] **Step 4: CORS**

Change allowed headers to `'Content-Type, Authorization'` only.

- [ ] **Step 5: Join route (before `express.static`)**

```javascript
appExpress.get('/join/:ticketId', (req, res) => {
  if (!/^req_[a-f0-9]{12}$/i.test(req.params.ticketId || '')) {
    return res.status(404).send('Invalid join link');
  }
  res.sendFile(path.join(__dirname, 'public', 'mobile', 'join.html'));
});
```

Create `public/mobile/join.html` with script tag `type="module"` importing `lan-join-boot.mjs` (or inline minimal exchange script).

Deprecate redirect that copies `?code=`:

```javascript
appExpress.get('/join', (_req, res) => {
  res.redirect(302, '/mobile/');
});
```

- [ ] **Step 6: Redaction middleware + terminal error handler**

Early:

```javascript
const { redactUrlSecrets, redactForLog } = require('./lan-squad/redact-secrets.js');
appExpress.use((req, _res, next) => {
  req.__safeForLog = {
    method: req.method,
    path: redactUrlSecrets(req.originalUrl),
  };
  next();
});
```

Last:

```javascript
appExpress.use((err, req, res, _next) => {
  console.error('[express]', redactForLog({
    message: err && err.message,
    code: err && err.code,
    ...req.__safeForLog,
  }));
  res.status(500).json({ error: 'internal_error' });
});
```

- [ ] **Step 7: Audit `/generate*` catch blocks**

Replace `res.status(500).json({ error: e.message })` with:

```javascript
res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
```

Log with `redactForLog({ message: e.message })` only.

- [ ] **Step 8: Mount auth router**

```javascript
const ticketStore = createTicketStore({ getHostToken: () => LAN_TEAM_CODE });
appExpress.use('/api/lan/v1', createAuthRouter({ ... }));
appExpress.use('/api/lan/v1', createLanRouter({ store: lanStore, broadcast }));
```

- [ ] **Step 9: Manual smoke**

Run: `R_PLUS_USER_DATA=/tmp/rplus-lan-test node server.js` (or Electron start)  
Expected: listens on 3738; weak env exits 1

- [ ] **Step 10: Commit**

```bash
git add server.js package.json package-lock.json public/mobile/join.html
git commit -m "sec(lan): server bootstrap, rate limits, join route, error redaction"
```

---

### Task 10: Renderer — `lan-client` and `lan-join-link`

**Files:**
- Modify: `public/js/lan-client.mjs`
- Modify: `public/js/lan-join-link.mjs`
- Modify: `public/js/lan-join-link.test.mjs`
- Modify: `public/js/lan-client.test.mjs`

- [ ] **Step 1: Update `lan-client.test.mjs`** — assert fetch uses `Authorization` header (mock fetch)

- [ ] **Step 2: `lan-client.mjs`**

```javascript
async fetch(path, opts = {}) {
  const token = this._cfg?.teamCode || localStorage.getItem('rplus.lan.bearer') || '';
  const headers = {
    ...(opts.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  return fetch(url, { ...opts, headers });
}

_openChannelWs(channel, prop, kind) {
  const u = `${base}/api/lan/v1/ws?channel=${encodeURIComponent(channel)}`;
  const ws = new WebSocket(u);
  const token = this._cfg?.teamCode || localStorage.getItem('rplus.lan.bearer') || '';
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'auth', token }));
  };
  // ... rest unchanged
}
```

- [ ] **Step 3: `lan-join-link.mjs`**

```javascript
export function buildLanJoinUrls(hostUrl, ticketId) {
  const base = String(hostUrl || '').trim().replace(/\/+$/, '');
  const id = encodeURIComponent(String(ticketId || '').trim());
  return {
    joinUrl: `${base}/join/${id}`,
    mobileUrl: `${base}/join/${id}`,
  };
}
```

Update `parseLanInviteInput` to detect `/join/req_` paths; if legacy `?code=` found, set `legacyInvite: true` for UI message (do not return code as valid token).

- [ ] **Step 4: Run tests**

Run: `node --test public/js/lan-join-link.test.mjs public/js/lan-client.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/lan-client.mjs public/js/lan-join-link.mjs public/js/lan-join-link.test.mjs public/js/lan-client.test.mjs
git commit -m "sec(lan): client Bearer HTTP and WS first-frame auth"
```

---

### Task 11: Mobile join boot + `lan-sync` host UX

**Files:**
- Create: `public/js/lan-join-boot.mjs`
- Create: `public/mobile/join.html`
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: `lan-join-boot.mjs`**

```javascript
export async function runJoinTicketExchange(ticketId) {
  const res = await fetch('/api/lan/v1/auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket: ticketId }),
  });
  if (!res.ok) throw new Error('join_failed');
  const data = await res.json();
  localStorage.setItem('rplus.lan.bearer', data.token);
  if (data.hostUrl) localStorage.setItem('rplus.lan.hostUrl', data.hostUrl);
  history.replaceState({}, '', '/mobile');
  location.replace('/mobile/?rpc-mobile=1');
}
```

Parse `location.pathname` `/join/req_…` on load.

- [ ] **Step 2: Remove `DEFAULT_LAN_TEAM_CODE` and all `1234` fallbacks from `lan-sync.mjs`**

- Host: button “Generar enlace / PIN” → `POST /auth/tickets` with Bearer from host file/IPC
- On load: `GET /host-status` → if `requiresMigrationNotice`, show modal once (use `sessionStorage` flag `rplus.lan.migrationNoticeShown`)

- [ ] **Step 3: Legacy invite paste**

If `parseLanInviteInput` returns `legacyInvite`, toast: *“Este enlace ya no es válido. Pide al anfitrión un nuevo enlace o PIN.”*

- [ ] **Step 4: Commit**

```bash
git add public/js/lan-join-boot.mjs public/mobile/join.html public/js/features/lan-sync.mjs
git commit -m "feat(lan): ticket join boot and host pairing UI"
```

---

### Task 12: Electron IPC and main process

**Files:**
- Modify: `main.js`

- [ ] **Step 1: Add `lan-guest-write-bearer`**

```javascript
ipcMain.handle('lan-guest-write-bearer', (_e, payload) => {
  const token = String(payload?.token || '').trim();
  if (!token || token.length < 32) return { ok: false, error: 'invalid_token' };
  const filePath = path.join(app.getPath('userData'), 'lan-team-code.txt');
  fs.writeFileSync(filePath, token + '\n', 'utf8');
  return { ok: true };
});
```

- [ ] **Step 2: Update `lan-get-effective-team-code`**

Read first line of `lan-team-code.txt` only; if missing/weak return `{ ok: false, error: 'no_secure_token' }` — never return `1234`.

- [ ] **Step 3: Guest exchange handler in renderer**

After successful `auth/exchange`, if `storageTarget === 'userData'` call `window.electronAPI.lanGuestWriteBearer({ token })`.

- [ ] **Step 4: Commit**

```bash
git add main.js
git commit -m "sec(lan): Electron guest bearer persistence IPC"
```

---

### Task 13: Bundle renderer and full verification

**Files:**
- Modify: `public/js/app.bundle.mjs` (via build script)
- Modify: `package.json` test list (all new `lan-squad/*.test.js`)

- [ ] **Step 1: Ensure `package.json` `scripts.test` includes**

`lan-squad/redact-secrets.test.js lan-squad/ticket-store.test.js lan-squad/ws-hub.test.js lan-squad/auth-router.test.js`

- [ ] **Step 2: Run full LAN-related tests**

```bash
node --test lan-squad/redact-secrets.test.js lan-squad/effective-team-code.test.js lan-squad/host-store.test.js lan-squad/host-router.test.js lan-squad/ticket-store.test.js lan-squad/ws-hub.test.js lan-squad/auth-router.test.js public/js/lan-join-link.test.mjs public/js/lan-client.test.mjs
```

Expected: all PASS

- [ ] **Step 3: Bundle**

```bash
npm run bundle:renderer
```

- [ ] **Step 4: Commit**

```bash
git add package.json public/js/app.bundle.mjs public/js/app.bundle.mjs.map public/js/app.bundle.meta.json
git commit -m "chore: bundle renderer after LAN security client updates"
```

---

## Spec coverage checklist (self-review)

| Spec section | Task(s) |
|--------------|---------|
| §1 Token bootstrap / rehash / no 1234 | Task 2, 3, 9 |
| §2 Ticket pairing | Task 5, 6, 9, 11 |
| §3 Bearer HTTP | Task 4, 7, 10 |
| §4 WS first-frame | Task 8, 10 |
| §5 Rate limiting | Task 9 |
| §6 Frontend / tests | Task 10–13 |
| §7 Logging redaction | Task 1, 6, 8, 9 |

**Open items resolved in plan:**

1. `localStorage` keys: `rplus.lan.bearer` + `saveLanConfig.teamCode`
2. QR: optional follow-up in host UI (display `joinUrl` as QR if library exists; else copy link + PIN)
3. `/join/:ticketId` registered **before** `express.static`
4. IPC reads file only; no weak fallback

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-30-lan-security-hardening.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — run tasks in this session using **executing-plans**, batched with checkpoints  

Which approach do you want?
