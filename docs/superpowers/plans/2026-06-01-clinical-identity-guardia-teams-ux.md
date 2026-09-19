# Clinical Identity, Guardia UX & Team Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship human LAN usernames (separate from `clientId`), wizard onboarding (username → create/join team), sala-scoped team directory with visible members, DB-backed profile/rank, and disambiguated Modo Guardia controls.

**Architecture:** Add pure helpers + DB functions in `lib/db/clinical-access-db.mjs`, new IPC channels in `ipc-handlers.mjs` / `preload.js`, new renderer module `clinical-onboarding.mjs` for the wizard, refactor `clinical-registration.mjs` + `clinical-teams.mjs`, and small chrome/rotation tweaks. Rebuild renderer bundle after JS changes (`npm run bundle:renderer`).

**Tech Stack:** better-sqlite3-multiple-ciphers, Node `node:test`, Vanilla JS renderer, Electron IPC.

**Spec:** [docs/superpowers/specs/2026-06-01-clinical-identity-guardia-teams-ux-design.md](../specs/2026-06-01-clinical-identity-guardia-teams-ux-design.md)

---

## File map (create / modify)

| File | Role |
|------|------|
| `lib/db/clinical-username.mjs` | **Create** — format validation, legacy detection, claim + uniqueness |
| `lib/db/clinical-username.test.mjs` | **Create** — unit tests |
| `lib/db/clinical-access-db.mjs` | **Modify** — `listTeamsBySala`, `joinTeam`, `claimUsername`, extend `upsertClinicalProfile` |
| `lib/db/clinical-access-db.test.mjs` | **Modify** — sala list, join errors, username claim |
| `lib/db/ipc-handlers.mjs` | **Modify** — new handlers |
| `preload.js` | **Modify** — expose IPC |
| `public/js/clinical-username.mjs` | **Create** — mirror validation for renderer (or import shared constants via duplicate small module) |
| `public/js/clinical-username.test.mjs` | **Create** |
| `public/js/features/clinical-onboarding.mjs` | **Create** — wizard Paso 1/2, gate `openClinicalTeamsPanel` |
| `public/js/features/clinical-onboarding.test.mjs` | **Create** — step gating helpers |
| `public/js/features/clinical-registration.mjs` | **Modify** — username field; delegate to onboarding where appropriate |
| `public/js/features/clinical-teams.mjs` | **Modify** — steady-state directory, profile form, remove `prompt()` |
| `public/js/features/clinical-teams.test.mjs` | **Modify** — fix imports; add directory/join helper tests |
| `public/js/features/clinical-rotation.mjs` | **Modify** — disable config btn for non-R4 |
| `public/js/features/chrome.mjs` | **Modify** — header chip label “Vista guardia” |
| `public/js/features/guardia-board.mjs` | **Modify** — board toggle labels |
| `public/js/features/clinical-entrega.mjs` | **Modify** — display `username · clinical_name` in options if available |
| `public/js/clinical-access-runtime.mjs` | **Modify** — after profile save, refresh user rank/username in session |
| `public/partials/modals/root.html` | **Modify** — wizard markup, registration username field |
| `public/index.html` | **Modify** — keep in sync if not using partials-only build |
| `public/styles/pase-board.css` | **Modify** — wizard + directory styles |
| `package.json` | **Modify** — add new `*.test.mjs` to `"test"` script |
| `scripts/bundle-renderer.mjs` | **Verify** — new modules imported from `app.js` or `guardia-board.mjs` |

---

## PR 1 — Username claim API + DB persistence

### Task 1: Username validation helpers

**Files:**
- Create: `lib/db/clinical-username.mjs`
- Create: `lib/db/clinical-username.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `lib/db/clinical-username.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidUsernameFormat,
  isLegacyMachineUsername,
  normalizeUsername,
} from './clinical-username.mjs';

describe('clinical-username', () => {
  it('accepts valid handles', () => {
    assert.equal(isValidUsernameFormat('mgarcia'), true);
    assert.equal(isValidUsernameFormat('r2_garcia'), true);
  });

  it('rejects invalid handles', () => {
    assert.equal(isValidUsernameFormat('MG'), false);
    assert.equal(isValidUsernameFormat('ab'), false);
    assert.equal(isValidUsernameFormat(''), false);
  });

  it('detects legacy clientId usernames', () => {
    assert.equal(isLegacyMachineUsername('lc_abc123_xyz', 'lc_abc123_xyz'), true);
    assert.equal(isLegacyMachineUsername('mgarcia', 'lc_abc'), false);
  });

  it('normalizes to lowercase trim', () => {
    assert.equal(normalizeUsername('  MGarcia '), 'mgarcia');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test lib/db/clinical-username.test.mjs
```

Expected: cannot find module `./clinical-username.mjs`.

- [ ] **Step 3: Implement**

Create `lib/db/clinical-username.mjs`:

```javascript
const USERNAME_RE = /^[a-z][a-z0-9_]{2,31}$/;

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function isValidUsernameFormat(raw) {
  return USERNAME_RE.test(normalizeUsername(raw));
}

/** @param {string} username @param {string} clientId */
export function isLegacyMachineUsername(username, clientId) {
  const u = String(username || '');
  const c = String(clientId || '');
  if (!u) return true;
  if (c && u === c) return true;
  return /^lc_[a-z0-9_]+$/i.test(u);
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
node --test lib/db/clinical-username.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/clinical-username.mjs lib/db/clinical-username.test.mjs
git commit -m "feat(db): add clinical username validation helpers"
```

---

### Task 2: `claimUsername` + extend profile upsert

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`
- Modify: `lib/db/clinical-access-db.test.mjs`

- [ ] **Step 1: Failing DB test for claim**

Add to `lib/db/clinical-access-db.test.mjs` (use existing in-memory DB setup pattern from that file):

```javascript
import { claimUsername } from './clinical-access-db.mjs';
import { isValidUsernameFormat } from './clinical-username.mjs';

it('claimUsername updates row and rejects duplicate', () => {
  // ... open migrated db, ensureClinicalUser with clientId 'device-a'
  claimUsername(db, { userId, username: 'mgarcia' });
  const row = db.prepare('SELECT username FROM users WHERE user_id = ?').get(userId);
  assert.equal(row.username, 'mgarcia');
  assert.throws(() => claimUsername(db, { userId: userId2, username: 'mgarcia' }));
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
node --test lib/db/clinical-access-db.test.mjs
```

- [ ] **Step 3: Implement in `clinical-access-db.mjs`**

```javascript
import { isValidUsernameFormat, normalizeUsername } from './clinical-username.mjs';

export function claimUsername(db, { userId, username }) {
  const handle = normalizeUsername(username);
  if (!isValidUsernameFormat(handle)) {
    throw new Error('Usuario inválido. Usa 3–32 caracteres: a-z, 0-9, _.');
  }
  const taken = db.prepare('SELECT user_id FROM users WHERE username = ? AND user_id != ?').get(handle, userId);
  if (taken) throw new Error('Ese usuario ya está en uso.');
  db.prepare('UPDATE users SET username = ? WHERE user_id = ?').run(handle, userId);
  return getClinicalProfile(db, userId);
}
```

Ensure `upsertClinicalProfile` updates `rank`, `clinical_name`, `sala` and does **not** overwrite `username` unless explicitly passed.

- [ ] **Step 4: Run DB tests — expect PASS**

```bash
node --test lib/db/clinical-access-db.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/clinical-access-db.mjs lib/db/clinical-access-db.test.mjs
git commit -m "feat(db): claim LAN username with uniqueness check"
```

---

### Task 3: IPC + preload for claim and profile

**Files:**
- Modify: `lib/db/ipc-handlers.mjs`
- Modify: `preload.js`

- [ ] **Step 1: Add handler**

In `ipc-handlers.mjs`:

```javascript
ipcMain.handle('db:clinical-username-claim', async (_e, payload = {}) => {
  try {
    const profile = await dbManager.withTransaction((db) =>
      claimUsername(db, {
        userId: String(payload.userId || ''),
        username: String(payload.username || ''),
      })
    );
    return { ok: true, profile };
  } catch (err) {
    return ipcError(err);
  }
});
```

Extend `db:clinical-profile-upsert` payload to accept optional `username` (calls `claimUsername` when provided).

- [ ] **Step 2: Preload**

```javascript
dbClinicalUsernameClaim: (opts) => ipcRenderer.invoke('db:clinical-username-claim', opts),
```

- [ ] **Step 3: Manual smoke** — unlock DB in app; in DevTools:

```javascript
await window.rplusDb.dbClinicalUsernameClaim({ userId: '...', username: 'testuser1' });
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/ipc-handlers.mjs preload.js
git commit -m "feat(ipc): expose clinical username claim"
```

---

### Task 4: Registration form — username field + DB save

**Files:**
- Modify: `public/partials/modals/root.html`
- Modify: `public/index.html` (if build-ui copies from partials, run `npm run build:ui`)
- Modify: `public/js/features/clinical-registration.mjs`

- [ ] **Step 1: Add HTML field** (after title, before nombre):

```html
<div class="field-group">
  <label for="clinical-reg-username">Usuario LAN *</label>
  <input id="clinical-reg-username" type="text" class="profile-input"
    placeholder="mgarcia" autocomplete="username" required
    pattern="[a-z][a-z0-9_]{2,31}" />
  <p class="clinical-registration-hint">Minúsculas, 3–32 caracteres. Lo usan tus compañeros para equipos y entregas.</p>
</div>
```

- [ ] **Step 2: On submit** — after bootstrap `userId` known:

```javascript
const username = String(document.getElementById('clinical-reg-username')?.value || '').trim();
// ...
if (api?.dbClinicalUsernameClaim) {
  const claimRes = await api.dbClinicalUsernameClaim({ userId: resUserId, username });
  if (!claimRes?.ok) { /* show err */ return; }
}
await api.dbClinicalProfileUpsert({ userId: resUserId, clinicalName: name, rank, sala });
```

Wire `prefillRegistrationFromUrlParams` for `?user=`.

- [ ] **Step 3: Fix rank persist in Mi rotación** (preview for PR 1):

In `clinical-teams.mjs` `handleChangeRank`, replace `prompt()` with call to `dbClinicalProfileUpsert` + `dbClinicalUsernameClaim` skip; refresh session:

```javascript
const res = await api.dbClinicalProfileUpsert({
  userId: clinicalSessionContext.user.user_id,
  clinicalName: clinicalSessionContext.user.clinical_name || '',
  rank,
  sala: clinicalSessionContext.user.sala || '',
});
```

- [ ] **Step 4: Bundle + test**

```bash
npm run bundle:renderer
npm test
```

- [ ] **Step 5: Commit**

```bash
git add public/partials/modals/root.html public/index.html public/js/features/clinical-registration.mjs public/js/features/clinical-teams.mjs
git commit -m "feat(ui): username on clinical registration and DB rank save"
```

---

## PR 2 — Sala team list + join IPC

### Task 5: `listTeamsBySala` + join eligibility

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`
- Modify: `lib/db/clinical-access-db.test.mjs`

- [ ] **Step 1: Failing test**

```javascript
it('listTeamsBySala returns members and joinEligible', () => {
  const rows = listTeamsBySala(db, { sala: 'Sala 1', forUserId: r1UserId });
  assert.ok(rows.length >= 1);
  assert.ok('members' in rows[0]);
  assert.equal(typeof rows[0].joinEligible, 'boolean');
});
```

- [ ] **Step 2: Implement `listTeamsBySala`**

Filter `listActiveTeams` where `sala = ?`. Map each team:

- `members` from `listTeamMembers`
- `guardia_today` from `getTeamGuardiaToday`
- `joinEligible`: run `validateSalaTeamMembership` errors empty **and** user not already member
- `joinReason`: first validation error string if not eligible

- [ ] **Step 3: `joinTeam` wrapper**

```javascript
export function joinTeam(db, teamId, userId) {
  addTeamMember(db, teamId, userId);
}
```

(already throws on validation)

- [ ] **Step 4: IPC**

- `db:clinical-teams-list-by-sala` → `{ sala, forUserId }`
- `db:clinical-teams-join` → `{ teamId, userId }`

Preload: `dbClinicalTeamsListBySala`, `dbClinicalTeamsJoin`.

- [ ] **Step 5: Tests + commit**

```bash
node --test lib/db/clinical-access-db.test.mjs
git add lib/db/clinical-access-db.mjs lib/db/clinical-access-db.test.mjs lib/db/ipc-handlers.mjs preload.js
git commit -m "feat(db): list teams by sala with join eligibility"
```

---

## PR 3 — Onboarding wizard + Mi rotación directory

### Task 6: `clinical-onboarding.mjs` wizard shell

**Files:**
- Create: `public/js/features/clinical-onboarding.mjs`
- Create: `public/js/features/clinical-onboarding.test.mjs`
- Modify: `public/partials/modals/root.html`
- Modify: `public/js/features/clinical-teams.mjs`
- Modify: `public/js/app.js` (import wire) or `guardia-board.mjs`

- [ ] **Step 1: Export gating helpers (test first)**

`clinical-onboarding.test.mjs`:

```javascript
import { needsUsernameClaim, needsTeamOnboarding } from './clinical-onboarding.mjs';

it('needsUsernameClaim when legacy username', () => {
  assert.equal(needsUsernameClaim({ username: 'lc_x', clientId: 'lc_x' }), true);
  assert.equal(needsUsernameClaim({ username: 'mgarcia', clientId: 'lc_x' }), false);
});
```

- [ ] **Step 2: Implement wizard state machine**

```javascript
export function needsUsernameClaim(user, clientId) {
  return isLegacyMachineUsername(user?.username, clientId);
}

export function needsTeamOnboarding(userId, teams) {
  return !filterJoinedTeams(teams, userId).length;
}

export async function openClinicalOnboarding(opts) {
  // show #clinical-onboarding-backdrop
  // step 1 | 2 from needs*
}

export function openClinicalTeamsPanel() {
  // if needsUsernameClaim || needsTeamOnboarding → openClinicalOnboarding
  // else open existing teams modal steady state
}
```

Move `openClinicalTeamsPanel` export orchestration here or re-export from `clinical-teams.mjs` calling onboarding.

- [ ] **Step 3: HTML wizard** in `root.html`:

```html
<div id="clinical-onboarding-backdrop" class="modal-backdrop" aria-hidden="true">
  <div class="modal clinical-onboarding-modal" role="dialog">
    <div class="clinical-onboarding-progress"><span data-step="1">1</span><span data-step="2">2</span></div>
    <div id="clinical-onboarding-body"></div>
  </div>
</div>
```

- [ ] **Step 4: Paso 2 — directory UI**

Render cards from `dbClinicalTeamsListBySala({ sala: user.sala, forUserId })`:

- Section **Mis equipos** (joined)
- Section **Equipos en tu sala** (others, read-only members)
- **Unirme** button calls `dbClinicalTeamsJoin`
- **Crear equipo** tab/segment reuses `handleCreateTeamSubmit`

- [ ] **Step 5: Legacy banner** in steady-state if claim skipped

- [ ] **Step 6: Bundle**

```bash
npm run bundle:renderer
npm run build:ui
```

- [ ] **Step 7: Commit**

```bash
git add public/js/features/clinical-onboarding.mjs public/js/features/clinical-onboarding.test.mjs public/js/features/clinical-teams.mjs public/partials/modals/root.html public/styles/pase-board.css
git commit -m "feat(ui): clinical onboarding wizard and sala team directory"
```

---

### Task 7: Steady-state Mi rotación layout

**Files:**
- Modify: `public/js/features/clinical-teams.mjs`
- Modify: `public/styles/pase-board.css`

- [ ] **Step 1: Profile card** — inline rank `<select>`, sala `<select>`, Guardar → `dbClinicalProfileUpsert` + refresh session.

- [ ] **Step 2: Demote invite** — move “Agregar por usuario” under team card kebab / collapsible **Invitar**, not primary.

- [ ] **Step 3: Hide `clientId` in member list** — render `username` + rank; optional `clinical_name` subtitle from member row if IPC includes it (extend `listTeamMembers` SELECT).

- [ ] **Step 4: Commit**

```bash
git add public/js/features/clinical-teams.mjs public/styles/pase-board.css
git commit -m "feat(ui): Mi rotación profile card and invite secondary"
```

---

## PR 4 — Modo Guardia labels + Config rotación UX

### Task 8: Disambiguate Modo Guardia controls

**Files:**
- Modify: `public/js/features/chrome.mjs`
- Modify: `public/partials/chrome/header.html`
- Modify: `public/js/features/guardia-board.mjs`
- Modify: `public/index.html` (header chip text)

- [ ] **Step 1: Header chip text**

Change visible label to **Vista guardia** (keep `id="header-guardia-mode-chip"`).

- [ ] **Step 2: Board toggle labels** in `guardia-board.mjs` / `guardia-mode-sync.mjs`:

```javascript
if (label) label.textContent = active ? 'Solo mis entregas' : 'Censo completo';
```

Update `aria-label` on `btn-guardia-mode-toggle`.

- [ ] **Step 3: Team checkbox label** in `clinical-teams.mjs`:

```html
<span>Guardia hoy</span>
```

- [ ] **Step 4: Commit**

```bash
git add public/js/features/chrome.mjs public/js/features/guardia-board.mjs public/js/guardia-mode-sync.mjs public/js/features/clinical-teams.mjs public/partials/chrome/header.html
git commit -m "fix(ui): disambiguate Vista guardia vs census filter toggle"
```

---

### Task 9: Disable Configuración rotación for non-R4

**Files:**
- Modify: `public/js/features/clinical-rotation.mjs`
- Modify: `public/js/features/guardia-board.mjs` (call sync on board render)

- [ ] **Step 1: Add `syncRotationConfigButton()`**

```javascript
export function syncRotationConfigButton() {
  const btn = document.getElementById('btn-guardia-rotation-config');
  if (!btn) return;
  const allowed = canConfigureRotation();
  btn.disabled = !allowed;
  btn.title = allowed ? '' : 'Solo R4 o Admin pueden configurar la rotación.';
  btn.classList.toggle('btn-med-secondary--muted', !allowed);
}
```

Call from `wireGuardiaRotationControls` and `renderGuardiaBoard`.

- [ ] **Step 2: Keep `openRotationConfigModal` guard** (toast fallback if somehow clicked).

- [ ] **Step 3: Commit**

```bash
git add public/js/features/clinical-rotation.mjs public/js/features/guardia-board.mjs
git commit -m "fix(ui): disable rotation config for non-R4 Admin"
```

---

## PR 5 — Tests, Entrega labels, package.json

### Task 10: Entrega dropdown display names

**Files:**
- Modify: `public/js/features/clinical-entrega.mjs`
- Modify: `lib/db/clinical-access-db.mjs` (`listClinicalUsers` already has `clinical_name`)

- [ ] **Step 1: Option label helper**

```javascript
function userOptionLabel(u) {
  const name = String(u.clinical_name || '').trim();
  const handle = String(u.username || u.user_id);
  const rank = String(u.rank || '');
  return name ? `${handle} · ${name} (${rank})` : `${handle} (${rank})`;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/features/clinical-entrega.mjs
git commit -m "feat(ui): show username and clinical name in Entrega picker"
```

---

### Task 11: Register tests + full suite

**Files:**
- Modify: `package.json` — append to `"test"` script:

```
lib/db/clinical-username.test.mjs public/js/clinical-username.test.mjs public/js/features/clinical-onboarding.test.mjs
```

- [ ] **Step 1: Add renderer username mirror test** (optional duplicate of format rules).

- [ ] **Step 2: Fix `clinical-teams.test.mjs`** if `ON_CALL_DAY_LABELS` import fails — import only existing exports.

- [ ] **Step 3: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json public/js/features/clinical-teams.test.mjs
git commit -m "chore(test): register clinical identity onboarding tests"
```

---

## Manual test checklist (post-PR 5)

1. Fresh DB unlock → Registro shows **Usuario LAN** → claim → Paso 2 directory for your Sala.
2. **Unirme** on second team card (R1) → validation toast if already in sala team.
3. **Crear equipo** as R2 → auto-join; directory shows 4-team sala cap.
4. **Cambiar rango** in Mi rotación → restart app → rank still correct in Entrega targets.
5. R1 clicks **Configuración rotación** → disabled, no modal.
6. R4 → modal opens.
7. Header **Vista guardia** vs board **Solo mis entregas** — independent behavior.
8. LAN peer sees updated `username` after sync merge.

---

## Plan self-review (spec coverage)

| Spec requirement | Task |
|------------------|------|
| Username vs clientId split | Tasks 1–4, 6 |
| Claim at registration + legacy banner | Tasks 4, 6 |
| Username editable with confirm | Task 7 (profile card) |
| Wizard Paso 1 → 2 | Task 6 |
| Sala directory only user.sala | Tasks 5–6 |
| Unirme primary, invite secondary | Tasks 6–7 |
| Modo Guardia rename | Task 8 |
| Config rotación disabled | Task 9 |
| DB rank source of truth | Tasks 3–4, 7 |
| Entrega labels | Task 10 |

No TBD placeholders remain in task steps above.

---

## Execution handoff

**Plan saved to:** `docs/superpowers/plans/2026-06-01-clinical-identity-guardia-teams-ux.md`

**Two execution options:**

1. **Subagent-driven (recommended)** — one fresh subagent per task, review between tasks  
2. **Inline** — execute in this session with executing-plans checkpoints  

Which approach do you want?
