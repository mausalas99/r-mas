# Nube Recovery + Conexión Panel UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Nube password recovery (self-service code + admin reset) and reorganize Conexión guardia into clear steps so logged-out Sala/Torre users only see Connect.

**Architecture:** Store hashed recovery codes in D1 (`003-recovery.sql`); extend `cloud/sync-worker` auth/admin endpoints; renderer shows one-shot recovery modal + stepped panel HTML; gate `panel-render-once` footer/R4 sections on cloud session token.

**Tech Stack:** Cloudflare Worker + D1, Web Crypto PBKDF2 (existing `password.js`), Electron renderer ESM under `public/js/features/cloud-sync/`, `node --test` via `npm run test:one`.

**Spec:** [`../specs/2026-08-02-nube-recovery-panel-ux-design.md`](../specs/2026-08-02-nube-recovery-panel-ux-design.md)

---

## File map

| Path | Role |
|------|------|
| `cloud/sync-worker/schema/003-recovery.sql` | D1 columns for recovery hash |
| `cloud/sync-worker/src/recovery-code.js` | Generate / normalize / hash helpers |
| `cloud/sync-worker/src/recovery-code.test.js` | Unit tests for code format |
| `cloud/sync-worker/src/auth-recovery.js` | recover + regenerate + persist helpers (keep `auth.js` thin) |
| `cloud/sync-worker/src/auth-recovery.test.js` | Fake-D1 recover/regenerate/lazy-mint tests |
| `cloud/sync-worker/src/auth.js` | Wire routes; mint on register/login |
| `cloud/sync-worker/src/admin.js` | `POST …/reset-password` |
| `public/js/features/cloud-sync/api-client.mjs` | `recover`, `regenerateRecovery`, `adminResetPassword` |
| `public/js/features/cloud-sync/recovery-modal.mjs` | One-shot “guardá este código” modal |
| `public/js/features/cloud-sync/panel-steps-html.mjs` | Stepped shell HTML (auth tabs / sala / equipo / más) |
| `public/js/features/cloud-sync/panel-conexion-html.mjs` | Delegate auth forms to steps; status labels |
| `public/js/features/cloud-sync/panel-conexion-handlers.mjs` | recover / regenerate handlers |
| `public/js/features/cloud-sync/panel-conexion-bootstrap.mjs` | Wire new `data-cloud-action`s |
| `public/js/features/cloud-sync/panel-admin-html.mjs` | Reset password button |
| `public/js/features/cloud-sync/panel-admin-actions.mjs` | Reset password action |
| `public/js/features/lan/panel-render-once.mjs` | Hide footer/R4 when no cloud token |
| `public/js/features/cloud-sync/panel-steps.test.mjs` | DOM gating tests |
| `public/styles/cloud-sync.css` (or existing cloud panel CSS) | Tabs + step chrome |
| `cloud/sync-worker/README.md` | Auth recovery docs |
| `.cursor/rules/project-context.mdc` | Changelog on architectural commit |
| `data/release-notes-highlights.mjs` | User-facing highlight |

---

### Task 1: Recovery code module + unit tests

**Files:**
- Create: `cloud/sync-worker/src/recovery-code.js`
- Create: `cloud/sync-worker/src/recovery-code.test.js`

- [ ] **Step 1: Write the failing test**

```js
// cloud/sync-worker/src/recovery-code.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateRecoveryCode, normalizeRecoveryCode } from './recovery-code.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

describe('generateRecoveryCode', () => {
  it('matches R+XXXX-XXXX-XXXX with unambiguous alphabet', () => {
    for (let i = 0; i < 30; i++) {
      const code = generateRecoveryCode();
      assert.match(code, /^R\+[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      const body = code.slice(2).replace(/-/g, '');
      for (const ch of body) assert.ok(ALPHABET.includes(ch), ch);
    }
  });
});

describe('normalizeRecoveryCode', () => {
  it('uppercases and strips spaces', () => {
    assert.equal(normalizeRecoveryCode('  r+ab3k-7nmp-q2wx  '), 'R+AB3K-7NMP-Q2WX');
  });

  it('returns empty for garbage', () => {
    assert.equal(normalizeRecoveryCode('nope'), '');
    assert.equal(normalizeRecoveryCode(''), '');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:one -- cloud/sync-worker/src/recovery-code.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `recovery-code.js`**

```js
// cloud/sync-worker/src/recovery-code.js
import { hashPassword, verifyPassword } from './password.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^R\+[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

function randomChars(n) {
  const out = [];
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  for (let i = 0; i < n; i++) out.push(ALPHABET[bytes[i] % ALPHABET.length]);
  return out.join('');
}

/** @returns {string} e.g. R+AB3K-7NMP-Q2WX */
export function generateRecoveryCode() {
  return `R+${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`;
}

/** @param {unknown} raw */
export function normalizeRecoveryCode(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  return CODE_RE.test(s) ? s : '';
}

export async function hashRecoveryCode(code) {
  return hashPassword(normalizeRecoveryCode(code) || code);
}

export async function verifyRecoveryCode(code, saltHex, hashHex) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized || !saltHex || !hashHex) return false;
  return verifyPassword(normalized, saltHex, hashHex);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:one -- cloud/sync-worker/src/recovery-code.test.js
```

- [ ] **Step 5: Commit**

```bash
git add cloud/sync-worker/src/recovery-code.js cloud/sync-worker/src/recovery-code.test.js
git commit -m "$(cat <<'EOF'
feat(sync-worker): recovery code generate/normalize helpers

EOF
)"
```

---

### Task 2: D1 migration `003-recovery.sql`

**Files:**
- Create: `cloud/sync-worker/schema/003-recovery.sql`

- [ ] **Step 1: Add migration**

```sql
-- cloud/sync-worker/schema/003-recovery.sql
ALTER TABLE users ADD COLUMN recovery_salt BLOB;
ALTER TABLE users ADD COLUMN recovery_hash BLOB;
ALTER TABLE users ADD COLUMN recovery_updated_at TEXT;
```

- [ ] **Step 2: Apply locally**

```bash
cd cloud/sync-worker && npm run db:migrate:local
```

Expected: migration applied (or already-applied notice). If Wrangler not logged in for remote, local only is enough for this task.

- [ ] **Step 3: Commit**

```bash
git add cloud/sync-worker/schema/003-recovery.sql
git commit -m "$(cat <<'EOF'
feat(sync-worker): D1 migration for recovery code columns

EOF
)"
```

---

### Task 3: Auth recovery helpers + Fake-D1 tests

**Files:**
- Create: `cloud/sync-worker/src/auth-recovery.js`
- Create: `cloud/sync-worker/src/auth-recovery.test.js`
- Modify: `cloud/sync-worker/src/auth.js` (wire routes + register/login mint — Task 4 can finish wiring if split)

- [ ] **Step 1: Write Fake-D1 recover tests**

Create `auth-recovery.test.js` that:

1. Builds an in-memory user row with password + recovery hashes via `hashPassword` / `hashRecoveryCode`.
2. Calls `persistRecovery(db, userId, code)` and `verifyUserRecovery(row, code)`.
3. Calls `rotateRecoveryForUser(db, userId)` and asserts old code fails / new code returned.
4. Calls `setPasswordAndRotateRecovery(db, userId, newPassword)` and asserts sessions cleared when fake `DELETE FROM sessions` is invoked.

Minimal FakeD1 pattern:

```js
function createFakeDb(users, sessions = []) {
  return {
    prepare(sql) {
      const s = String(sql);
      return {
        bind(...args) {
          return {
            async first() { /* match SELECT users / sessions by inspecting s + args */ },
            async run() { /* mutate users/sessions arrays */ },
            async all() { return { results: [] }; },
          };
        },
      };
    },
    async batch(stmts) { for (const st of stmts) await st; },
  };
}
```

Implement enough branches for the SQL strings used in `auth-recovery.js` only (keep SQL templates stable).

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test:one -- cloud/sync-worker/src/auth-recovery.test.js
```

- [ ] **Step 3: Implement `auth-recovery.js`**

Export at least:

```js
export async function mintRecoveryForUser(db, userId) {
  const code = generateRecoveryCode();
  const { salt, hash } = await hashRecoveryCode(code);
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE users SET recovery_salt = ?, recovery_hash = ?, recovery_updated_at = ?, updated_at = ? WHERE id = ?`
    )
    .bind(salt, hash, now, now, userId)
    .run();
  return code;
}

export async function userNeedsRecoveryMint(row) {
  return !row?.recovery_hash;
}

export async function handleRecover(db, request, ip, deps) {
  // deps: { checkRateLimit, recordFailure, clearFailures, clientIp helpers OR pass rlKey }
  // 1) parse body username, recoveryCode, newPassword
  // 2) rlKey = `recover:${username}|${ip}`
  // 3) load user; generic invalid_credentials on miss/disabled/bad code
  // 4) validatePassword(newPassword)
  // 5) hashPassword → UPDATE password_*; DELETE sessions; mintRecoveryForUser; createSession
  // 6) return Response.json({ ok: true, token, expiresAt, user, recoveryCode })
}

export async function handleRegenerateRecovery(db, request) {
  // userFromAuthHeader → mintRecoveryForUser → { ok, recoveryCode }
}
```

Use `SyncError` messages from the spec. Do not log plaintext codes.

- [ ] **Step 4: Tests PASS**

```bash
npm run test:one -- cloud/sync-worker/src/auth-recovery.test.js
```

- [ ] **Step 5: Commit**

```bash
git add cloud/sync-worker/src/auth-recovery.js cloud/sync-worker/src/auth-recovery.test.js
git commit -m "$(cat <<'EOF'
feat(sync-worker): recover + regenerate recovery helpers

EOF
)"
```

---

### Task 4: Wire auth.js register / login / routes

**Files:**
- Modify: `cloud/sync-worker/src/auth.js`

- [ ] **Step 1: Extend register INSERT + response**

After successful INSERT (and before/after `createSession`):

```js
const recoveryCode = await mintRecoveryForUser(db, id);
// Response.json({ token, expiresAt, user, recoveryCode })
```

Update INSERT only if columns matter at insert time — mint via UPDATE is fine (already in helper).

- [ ] **Step 2: Lazy mint on login**

In `handleLogin`, after password OK:

```js
let recoveryCode;
const full = await db
  .prepare(
    `SELECT id, username, display_name, recovery_hash, disabled FROM users WHERE id = ?`
  )
  .bind(row.id)
  .first();
if (await userNeedsRecoveryMint(full)) {
  recoveryCode = await mintRecoveryForUser(db, row.id);
}
const payload = { token: session.token, expiresAt: session.expiresAt, user: userPayload(row) };
if (recoveryCode) payload.recoveryCode = recoveryCode;
return Response.json(payload);
```

(Alternatively SELECT recovery_hash in the existing login query — prefer extending that SELECT to avoid a second round-trip.)

- [ ] **Step 3: Route recover + regenerate**

In `handleAuth`:

```js
if (subpath === '/recover' && method === 'POST') {
  return handleRecover(db, request, ip);
}
if (subpath === '/regenerate-recovery' && method === 'POST') {
  return handleRegenerateRecovery(db, request);
}
```

- [ ] **Step 4: Smoke with existing auth unit tests**

```bash
npm run test:one -- cloud/sync-worker/src/auth.test.js
npm run test:one -- cloud/sync-worker/src/auth-recovery.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cloud/sync-worker/src/auth.js
git commit -m "$(cat <<'EOF'
feat(sync-worker): register/login mint recovery; recover routes

EOF
)"
```

---

### Task 5: Admin reset-password

**Files:**
- Modify: `cloud/sync-worker/src/admin.js`
- Modify: `cloud/sync-worker/src/admin.test.js` (route dispatch unit if practical; otherwise document manual curl in README task)

- [ ] **Step 1: Add handler**

```js
async function handleResetPassword(db, userId, request) {
  const body = await request.json().catch(() => ({}));
  const temporaryPassword = body?.temporaryPassword ?? '';
  validatePassword(temporaryPassword); // import from auth.js
  const row = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!row) throw new SyncError('not_found', 'Usuario no encontrado.');
  const { salt, hash } = await hashPassword(temporaryPassword);
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      `UPDATE users SET password_salt = ?, password_hash = ?, updated_at = ? WHERE id = ?`
    ).bind(salt, hash, now, userId),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
  ]);
  const out = { ok: true };
  if (body?.rotateRecovery) {
    out.recoveryCode = await mintRecoveryForUser(db, userId);
  }
  return Response.json(out);
}
```

- [ ] **Step 2: Wire in `handleAdmin`**

```js
const resetMatch = /^\/users\/([^/]+)\/reset-password$/.exec(subpath);
if (resetMatch && method === 'POST') {
  await requireAdminUser(db, request, env);
  return handleResetPassword(db, resetMatch[1], request);
}
```

- [ ] **Step 3: Commit**

```bash
git add cloud/sync-worker/src/admin.js cloud/sync-worker/src/admin.test.js
git commit -m "$(cat <<'EOF'
feat(sync-worker): admin reset-password endpoint

EOF
)"
```

---

### Task 6: API client methods

**Files:**
- Modify: `public/js/features/cloud-sync/api-client.mjs`

- [ ] **Step 1: Add methods on returned API object**

```js
recover: (body) => req('/auth/recover', { method: 'POST', body }),
regenerateRecovery: () =>
  req('/auth/regenerate-recovery', { method: 'POST', body: {} }),
adminResetPassword: (userId, body) =>
  req(`/admin/users/${userId}/reset-password`, { method: 'POST', body }),
```

- [ ] **Step 2: Commit**

```bash
git add public/js/features/cloud-sync/api-client.mjs
git commit -m "$(cat <<'EOF'
feat(cloud-sync): API client recover / regenerate / admin reset

EOF
)"
```

---

### Task 7: Recovery reveal modal

**Files:**
- Create: `public/js/features/cloud-sync/recovery-modal.mjs`
- Create: `public/js/features/cloud-sync/recovery-modal.test.mjs`

- [ ] **Step 1: Failing test — modal renders code + copy**

```js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { showRecoveryCodeModal } from './recovery-modal.mjs';

describe('showRecoveryCodeModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows code and resolves after confirm', async () => {
    const p = showRecoveryCodeModal({ code: 'R+AB3K-7NMP-Q2WX' });
    const el = document.querySelector('[data-recovery-code-modal]');
    assert.ok(el);
    assert.match(el.textContent, /R\+AB3K-7NMP-Q2WX/);
    el.querySelector('[data-recovery-confirm]').checked = true;
    el.querySelector('[data-recovery-continue]').click();
    await p;
    assert.equal(document.querySelector('[data-recovery-code-modal]'), null);
  });
});
```

(If the suite lacks `document`, follow the same jsdom/bootstrap pattern used by other `public/js/**/*.test.mjs` in this repo — copy the smallest existing harness.)

- [ ] **Step 2: Implement modal**

`showRecoveryCodeModal({ code, title? })` → Promise:

- Overlay with Spanish copy: “Guardá este código de recuperación…”
- `<code data-recovery-code>` + Copiar button (`navigator.clipboard.writeText`)
- Checkbox `data-recovery-confirm` “Lo guardé en un lugar seguro”
- Continue enabled always; if unchecked, `confirm()` warn once then continue
- Remove DOM on resolve

Keep file ≤ 600 lines / functions ≤ 80.

- [ ] **Step 3: Tests PASS + commit**

```bash
npm run test:one -- public/js/features/cloud-sync/recovery-modal.test.mjs
git add public/js/features/cloud-sync/recovery-modal.mjs public/js/features/cloud-sync/recovery-modal.test.mjs
git commit -m "$(cat <<'EOF'
feat(cloud-sync): one-shot recovery code modal

EOF
)"
```

---

### Task 8: Stepped panel HTML (Connect / Sala / Equipo / Más)

**Files:**
- Create: `public/js/features/cloud-sync/panel-steps-html.mjs`
- Modify: `public/js/features/cloud-sync/panel-conexion-html.mjs`
- Modify: existing cloud-sync CSS file (grep `cloud-sync-conexion` for the stylesheet path under `public/styles/` or `public/css/`)

- [ ] **Step 1: Implement `authFormsHtml` replacement with tabs**

In `panel-steps-html.mjs`:

```js
export function connectStepHtml(url) {
  return (
    '<div class="cloud-sync-step" data-cloud-step="1">' +
    '<div class="cloud-sync-step-head"><strong>1 · Conectar a Nube</strong>' +
    '<span class="cloud-sync-status-chip is-pending">Modo Nube · Sin sesión</span></div>' +
    '<p class="cloud-sync-lead">Conectate para sincronizar el censo del turno. No hace falta host LAN.</p>' +
    '<div class="cloud-sync-tabs" role="tablist">' +
    '<button type="button" class="cloud-sync-tab is-active" data-cloud-tab="login">Entrar</button>' +
    '<button type="button" class="cloud-sync-tab" data-cloud-tab="register">Crear</button>' +
    '<button type="button" class="cloud-sync-tab" data-cloud-tab="recover">Recuperar</button></div>' +
    // panels: login / register / recover forms with data-cloud-* attrs
    // recover: user, recovery code, new password, confirm, data-cloud-action="recover"
    advancedUrlHtml(url) +
    '</div>'
  );
}

export function connectedStepsHtml({ cloudUser, roomHtml, equipoHtml, masBodyHtml }) {
  // account summary
  // step 2 sala (roomHtml — reuse roomConnectedHtml / roomActionsHtml)
  // step 3 equipo (open-rotation + placeholder for equipos del mes note)
  // step 4 <details class="cloud-sync-mas" open=false> Más … regenerar + admin mount point + masBodyHtml
}
```

- [ ] **Step 2: Point `authFormsHtml` / connected renderers at new helpers**

Keep exports so `panel-conexion-ui.mjs` keeps working; swap internals.

- [ ] **Step 3: Tab switching JS**

In bootstrap click handler or small `wireCloudAuthTabs(section)`:

```js
section.querySelectorAll('[data-cloud-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-cloud-tab');
    section.querySelectorAll('[data-cloud-tab]').forEach((b) => b.classList.toggle('is-active', b === btn));
    section.querySelectorAll('[data-cloud-tab-panel]').forEach((p) => {
      p.hidden = p.getAttribute('data-cloud-tab-panel') !== tab;
    });
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add public/js/features/cloud-sync/panel-steps-html.mjs \
  public/js/features/cloud-sync/panel-conexion-html.mjs \
  public/styles/*cloud*  # actual path from grep
git commit -m "$(cat <<'EOF'
feat(cloud-sync): stepped Conexión HTML with recover tab

EOF
)"
```

---

### Task 9: Handlers — recover, regenerate, show modal after auth

**Files:**
- Modify: `public/js/features/cloud-sync/panel-conexion-handlers.mjs`
- Modify: `public/js/features/cloud-sync/panel-conexion-bootstrap.mjs`
- Modify: `public/js/features/cloud-sync/register-during-onboarding.mjs` (show modal if `recoveryCode` present)

- [ ] **Step 1: `handleRecover`**

Mirror `handleLogin`: read recover fields → `api.recover` → persist session/token like login → `showRecoveryCodeModal({ code: data.recoveryCode })` → re-render connected.

- [ ] **Step 2: After register/login success**

If `data.recoveryCode`, await `showRecoveryCodeModal` before continuing ensure-turn / render.

- [ ] **Step 3: `handleRegenerateRecovery`**

`confirm('¿Regenerar código? El anterior deja de funcionar.')` → API → modal.

Wire `data-cloud-action="recover"` and `"regenerate-recovery"` in bootstrap action map.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/cloud-sync/panel-conexion-handlers.mjs \
  public/js/features/cloud-sync/panel-conexion-bootstrap.mjs \
  public/js/features/cloud-sync/register-during-onboarding.mjs
git commit -m "$(cat <<'EOF'
feat(cloud-sync): recover/regenerate handlers + reveal modal hooks

EOF
)"
```

---

### Task 10: Gate panel chrome without Nube session

**Files:**
- Modify: `public/js/features/lan/panel-render-once.mjs`
- Create: `public/js/features/cloud-sync/panel-steps.test.mjs` (or lan panel test if easier)

**Behavior (spec):** Without cloud token, Conexión shows only step 1. Hide: Crear equipos del mes / censo global / sync footer / QR / waitlist.

- [ ] **Step 1: Gate `renderNubeMainStack_`**

```js
async function renderNubeMainStack_(deps, root, gen, userSala, isElevated, expandState, dropdownScrollTop) {
  const showNubePanel = shouldShowNubePanel(userSala);
  if (showNubePanel && typeof deps.mountCloudNubeSection === 'function') {
    await deps.mountCloudNubeSection(root);
    if (deps.isRenderStale(gen)) return;
  }
  const hasCloudSession = Boolean(
    typeof deps.getCloudSyncToken === 'function' && deps.getCloudSyncToken()
  );
  if (!hasCloudSession) {
    // Only Nube connect section remains — do not append R4 / footer / LWW row.
    return;
  }
  const mainStack = appendLanConnectionStack(root);
  // Move team-create into step 3 via nube section when possible; until then:
  if (showNubePanel && isElevated) deps.buildR4Section(mainStack);
  await appendPanelFooterSections_(deps, mainStack, gen, expandState, dropdownScrollTop);
  appendLanLwwToastRow(mainStack);
  wireLanLwwToastPref();
  syncLanLwwOverwriteToastPrefUi();
}
```

Ensure `getCloudSyncToken` is passed from `panel-nube-mount` / panel deps (add to deps object if missing).

- [ ] **Step 2: Prefer embedding “Crear equipos del mes” inside step 3 HTML** when session exists (call existing `openR4TeamCreationModal` via `data-cloud-action="create-month-teams"`), so R4 card is not a free-floating mystery — optional polish if `buildR4Section` already works under the gate.

- [ ] **Step 3: Test — without token, no `.lan-hub-team-create-card` / no sync footer**

Write a focused test that calls a small pure helper if extraction is cleaner:

```js
export function shouldShowNubePostAuthChrome(token) {
  return Boolean(token && String(token).trim());
}
```

Test that helper; keep render wiring thin.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lan/panel-render-once.mjs \
  public/js/features/lan/panel-nube-mount.mjs \
  public/js/features/cloud-sync/panel-steps.test.mjs
git commit -m "$(cat <<'EOF'
feat(lan): hide Conexión chrome until Nube session exists

EOF
)"
```

---

### Task 11: Admin UI — reset password

**Files:**
- Modify: `public/js/features/cloud-sync/panel-admin-html.mjs`
- Modify: `public/js/features/cloud-sync/panel-admin-actions.mjs`
- Modify: `public/js/features/cloud-sync/panel-admin-data.mjs` if row wiring needs it

- [ ] **Step 1: Add button in `userActionsHtml`**

```html
<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost"
  data-admin-action="reset-password" data-user-id="…" data-user-handle="…">
  Restablecer contraseña
</button>
```

- [ ] **Step 2: Handler**

Prompt for temporary password (≥ 10) → optional confirm rotate recovery → `api.adminResetPassword(userId, { temporaryPassword, rotateRecovery })` → toast success; if `recoveryCode`, `showRecoveryCodeModal`.

- [ ] **Step 3: Commit**

```bash
git add public/js/features/cloud-sync/panel-admin-html.mjs \
  public/js/features/cloud-sync/panel-admin-actions.mjs
git commit -m "$(cat <<'EOF'
feat(cloud-sync): admin restablecer contraseña UI

EOF
)"
```

---

### Task 12: Docs, release notes, context, build

**Files:**
- Modify: `cloud/sync-worker/README.md` (Auth note: recover / regenerate / admin reset + migrate `003`)
- Modify: `data/release-notes-highlights.mjs` (7.9.x entry)
- Modify: `.cursor/rules/project-context.mdc` changelog
- Modify: `docs/superpowers/specs/2026-08-02-nube-recovery-panel-ux-design.md` status → Implemented / ready for QA after ship
- Run: `npm run build:ui`

- [ ] **Step 1: README curl examples**

```bash
# Recover
curl -s -X POST "$BASE/api/sync/v1/auth/recover" \
  -H 'content-type: application/json' \
  -d '{"username":"r1demo","recoveryCode":"R+….","newPassword":"new-password-1"}'

# Regenerate
curl -s -X POST "$BASE/api/sync/v1/auth/regenerate-recovery" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{}'
```

- [ ] **Step 2: `npm run build:ui`**

Expected: success.

- [ ] **Step 3: Targeted tests**

```bash
npm run test:one -- cloud/sync-worker/src/recovery-code.test.js
npm run test:one -- cloud/sync-worker/src/auth-recovery.test.js
npm run test:one -- public/js/features/cloud-sync/recovery-modal.test.mjs
npm run test:one -- public/js/features/cloud-sync/panel-steps.test.mjs
```

- [ ] **Step 4: Deploy migration (human / when ready)**

```bash
cd cloud/sync-worker && npm run db:migrate:remote
```

- [ ] **Step 5: Final commit**

```bash
git add -f docs/superpowers/plans/2026-08-02-nube-recovery-panel-ux.md \
  docs/superpowers/specs/2026-08-02-nube-recovery-panel-ux-design.md \
  cloud/sync-worker/README.md data/release-notes-highlights.mjs \
  .cursor/rules/project-context.mdc
git commit -m "$(cat <<'EOF'
docs(context): Nube recovery + stepped Conexión panel

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| recovery columns + hash | 1–2 |
| register returns code | 4 |
| POST /auth/recover + rotate | 3–4 |
| regenerate while logged in | 3–4, 9 |
| admin reset-password | 5, 11 |
| lazy mint on login | 4 |
| recover rate limit prefix | 3 |
| panel steps + tabs | 8 |
| logged-out only Connect | 10 |
| recovery modal | 7, 9 |
| status chip Modo Nube | 8 |
| tests worker + renderer | 1, 3, 7, 10, 12 |
| README / release notes / context | 12 |

No email/magic-link tasks (non-goal). No LAN-sala recovery tasks (non-goal).
