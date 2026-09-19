# Sala Guardia V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect Sala teams, handoff, and Modo Guardia for 3 Salas (1, 2, E) × 4 teams each, with progressive patient-level handoff and cycle-based on-call assignments.

**Architecture:** Schema V3 adds `clinical_name` and `sala` to users, `sala` and `team_leader_name` to teams. `evaluateClinicalScope` V3 enforces team-based visibility in normal mode, progressive handoff via `active_guardias`, and expanded Sala scope in Modo Guardia. The R1 cycle is ABCDx2 (8 days, 1 on-call R1 per Sala per day) and R2 cycle is ABCDEF (6 days, 2 on-call R2s across all 12 teams per day).

**Tech Stack:** Electron + vanilla JS + SQLCipher (SCHEMA_VERSION=3), existing `active_guardias` for handoff, existing `team_guardia_today` for guardia declarations, existing `guardia-board.mjs` summary tiles.

---

## File Structure

| File | Role |
|------|------|
| `lib/db/schema.mjs` | SCHEMA_VERSION bump, V3 migrations (users/teams columns) |
| `lib/db/clinical-access-db.mjs` | IPC handlers for profile CRUD, validations |
| `public/js/clinico-access.mjs` | evaluateClinicalScope V3, Sala cycle functions |
| `public/js/clinico-access.test.mjs` | Scope tests |
| `public/js/features/clinical-registration.mjs` | Clinical profile form (name + rank + sala) |
| `public/js/features/clinical-teams.mjs` | Team creation & joining for Sala |
| `public/js/features/clinical-entrega.mjs` | Double handoff for R2 |
| `public/js/features/guardia-board.mjs` | Modo Guardia toggle, summary tiles (existing) |
| `public/styles/modals.css` | New styles for Sala selector, Modo Guardia toggle |

---

### Task 1: Schema V3 — Add `clinical_name`, `sala`, `team_leader_name`

**Files:**
- Modify: `lib/db/schema.mjs`
- Modify: `lib/db/clinical-access-db.mjs`

- [ ] **Step 1: Bump `SCHEMA_VERSION` to 3**

Replace `export const SCHEMA_VERSION = 2;` with:
```js
export const SCHEMA_VERSION = 3;
```

- [ ] **Step 2: Write `migrateToV3` function in `schema.mjs`**

Add before `applyMigrations`:

```js
/** @param {import('better-sqlite3').Database} db */
function migrateToV3(db) {
  // Add clinical_name to users
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userCols.includes('clinical_name')) {
    db.exec("ALTER TABLE users ADD COLUMN clinical_name TEXT");
  }
  if (!userCols.includes('sala')) {
    db.exec("ALTER TABLE users ADD COLUMN sala TEXT CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E') OR sala IS NULL)");
  }

  // Add sala and team_leader_name to teams
  const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  if (!teamCols.includes('sala')) {
    db.exec("ALTER TABLE teams ADD COLUMN sala TEXT CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E') OR sala IS NULL)");
  }
  if (!teamCols.includes('team_leader_name')) {
    db.exec("ALTER TABLE teams ADD COLUMN team_leader_name TEXT");
  }

  // Update created_by FK — teams.created_by may reference a user not yet created.
  // The existing FK allows NULL. Leave as-is.

  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '3');
}
```

- [ ] **Step 3: Wire `migrateToV3` in `applyMigrations`**

Add after the `if (version < 2)` block:

```js
if (version < 3) {
  migrateToV3(db);
}
```

- [ ] **Step 4: Update `ensureClinicalUser` in `clinical-access-db.mjs`**

Read the current `ensureClinicalUser` function. It currently inserts `(user_id, username, password_hash, rank, public_key, encrypted_private_key)`. Add `clinical_name` and `sala`:

Add optional parameters `clinicalName` and `sala`:

```js
export function ensureClinicalUser(db, { userId, username, passwordHash, rank, publicKey, encryptedPrivateKey, clinicalName, sala }) {
  const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId);
  if (existing) {
    const sets = [];
    const params = {};
    if (clinicalName != null) { sets.push('clinical_name = @clinicalName'); params.clinicalName = clinicalName; }
    if (sala != null) { sets.push('sala = @sala'); params.sala = sala; }
    if (sets.length) {
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE user_id = @userId`).run({ ...params, userId });
    }
    return existing;
  }
  db.prepare(`
    INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
    VALUES (@userId, @username, @passwordHash, @rank, @publicKey, @encryptedPrivateKey, @clinicalName, @sala)
  `).run({
    userId, username, passwordHash, rank, publicKey, encryptedPrivateKey,
    clinicalName: clinicalName || null,
    sala: sala || null,
  });
  return { user_id: userId, username, rank };
}
```

- [ ] **Step 5: Run tests to confirm migration works**

```bash
npm test -- --test-name-pattern="schema|migration|ensureClinical"
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.mjs lib/db/clinical-access-db.mjs
git commit -m "feat(db): V3 schema — clinical_name, sala, team_leader_name"
```

---

### Task 2: Clinical profile IPC — read/write profile from DB

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`
- Modify: `lib/db/ipc-handlers.mjs`

- [ ] **Step 1: Add `dbClinicalProfileGet` function to `clinical-access-db.mjs`**

```js
export function getClinicalProfile(db, userId) {
  return db.prepare(
    'SELECT user_id, username, rank, clinical_name, sala FROM users WHERE user_id = ?'
  ).get(userId) || null;
}
```

- [ ] **Step 2: Add `dbClinicalProfileUpsert` function**

```js
export function upsertClinicalProfile(db, { userId, clinicalName, rank, sala }) {
  const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId);
  if (existing) {
    db.prepare(`
      UPDATE users SET clinical_name = @clinicalName, rank = @rank, sala = @sala
      WHERE user_id = @userId
    `).run({ userId, clinicalName: clinicalName || null, rank, sala: sala || null });
  } else {
    // Register with minimal data — the full user record will be completed on keygen
    db.prepare(`
      INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
      VALUES (@userId, @username, '', @rank, '', '', @clinicalName, @sala)
    `).run({ userId, username: userId, rank, clinicalName: clinicalName || null, sala: sala || null });
  }
  return getClinicalProfile(db, userId);
}
```

- [ ] **Step 3: Wire IPC handlers in `ipc-handlers.mjs`**

Add to the IPC channel registrations:

```js
ipcMain.handle('db:clinical-profile-get', (_event, payload) => {
  return getClinicalProfile(getDb(), String(payload?.userId || ''));
});

ipcMain.handle('db:clinical-profile-upsert', (_event, payload) => {
  return upsertClinicalProfile(getDb(), {
    userId: String(payload?.userId || ''),
    clinicalName: String(payload?.clinicalName || ''),
    rank: String(payload?.rank || 'R1'),
    sala: String(payload?.sala || ''),
  });
});
```

Export `getClinicalProfile` and `upsertClinicalProfile` in `clinical-access-db.mjs` index.

- [ ] **Step 4: Run tests**

```bash
npm test -- --test-name-pattern="profile|clinicalProfile"
```

Expected: PASS or skip (tests may not exist yet — Task 3 adds them).

- [ ] **Step 5: Commit**

```bash
git add lib/db/clinical-access-db.mjs lib/db/ipc-handlers.mjs
git commit -m "feat(db): clinical profile read/write IPC"
```

---

### Task 3: Clinical registration — name, rank, sala

**Files:**
- Modify: `public/js/features/clinical-registration.mjs`
- Modify: `public/styles/modals.css`

- [ ] **Step 1: Read the current `clinical-registration.mjs` HTML partial**

Open `public/partials/modals/root.html` and find the registration form (`clinical-registration-form`). Add a `sala` selector if one doesn't exist:

```html
<div id="clinical-registration-backdrop" class="modal-backdrop" aria-hidden="true">
  <div class="modal-panel" style="max-width:420px">
    <h3>Perfil Clínico</h3>
    <form id="clinical-registration-form">
      <div class="field-group">
        <label for="clinical-reg-name">Nombre clínico</label>
        <input id="clinical-reg-name" type="text" class="profile-input" placeholder="Nombre Apellido" required>
      </div>
      <div class="field-group">
        <label for="clinical-reg-rank">Rango</label>
        <select id="clinical-reg-rank" class="profile-input">
          <option value="R1">R1</option>
          <option value="R2">R2</option>
          <option value="R3">R3</option>
          <option value="R4">R4</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
      <div class="field-group">
        <label for="clinical-reg-sala">Sala</label>
        <select id="clinical-reg-sala" class="profile-input">
          <option value="">— Sin sala —</option>
          <option value="Sala 1">Sala 1</option>
          <option value="Sala 2">Sala 2</option>
          <option value="Sala E">Sala E</option>
        </select>
      </div>
      <div id="clinical-reg-error" class="field-error" hidden></div>
      <div class="modal-actions">
        <button type="submit" class="btn-save">Guardar perfil</button>
      </div>
    </form>
  </div>
</div>
```

- [ ] **Step 2: Update `promptClinicalRegistrationIfNeeded` to also read sala**

Modify the pre-fill block:

```js
const salaSelect = document.getElementById('clinical-reg-sala');
if (nameInput && settings.clinicalDisplayName) nameInput.value = String(settings.clinicalDisplayName);
if (rankSelect && settings.clinicalRank) rankSelect.value = String(settings.clinicalRank);
if (salaSelect && settings.clinicalSala) salaSelect.value = String(settings.clinicalSala);
```

- [ ] **Step 3: Update `wireRegistrationFormOnce` to save sala and persist to DB**

Replace the form submit handler:

```js
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const errEl = document.getElementById('clinical-reg-error');
  const name = String(document.getElementById('clinical-reg-name')?.value || '').trim();
  const rank = String(document.getElementById('clinical-reg-rank')?.value || 'R1');
  const sala = String(document.getElementById('clinical-reg-sala')?.value || '').trim();
  if (!name) {
    if (errEl) {
      errEl.textContent = 'Escribe tu nombre clínico.';
      errEl.hidden = false;
    }
    return;
  }
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {}
  settings.clinicalRegistered = true;
  settings.clinicalDisplayName = name;
  settings.clinicalRank = RANKS.includes(rank) ? rank : 'R1';
  if (sala) settings.clinicalSala = sala;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) {}

  // Persist to DB
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  if (api && typeof api.dbClinicalProfileUpsert === 'function') {
    try {
      await api.dbClinicalProfileUpsert({
        userId: settings.clientId || '',
        clinicalName: name,
        rank: settings.clinicalRank,
        sala: sala || null,
      });
    } catch (_e) {
      // non-fatal — profile saved to localStorage; DB will sync later
    }
  }

  closeClinicalRegistrationModal();
  if (pendingResolve) {
    const done = pendingResolve;
    pendingResolve = null;
    done(true);
  }
});
```

- [ ] **Step 4: Preload `dbClinicalProfileUpsert` in preload.js**

Add to the IPC method list in `preload.js`:
```js
dbClinicalProfileUpsert: (...args) => ipcRenderer.invoke('db:clinical-profile-upsert', ...args),
dbClinicalProfileGet: (...args) => ipcRenderer.invoke('db:clinical-profile-get', ...args),
```

- [ ] **Step 5: Add CSS for sala selector**

In `modals.css`, the `.profile-input` class already styles inputs and selects. No new CSS needed if the existing classes are used.

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: no regressions.

- [ ] **Step 7: Commit**

```bash
git add public/js/features/clinical-registration.mjs public/partials/modals/root.html preload.js
git commit -m "feat(profile): clinical registration with name, rank, and sala"
```

---

### Task 4: Sala team creation — form & validations

**Files:**
- Modify: `public/js/features/clinical-teams.mjs`
- Read: `lib/db/clinical-access-db.mjs` (for `dbClinicalTeamsCreate`)

- [ ] **Step 1: Read `dbClinicalTeamsCreate` to understand current behavior**

The team creation handler saves `(team_id, name, service, sub_area_fraction, on_call_day_index, created_by)`. The V3 version needs to also save `sala` and `team_leader_name`.

- [ ] **Step 2: Update `renderCreateTeamForm` in `clinical-teams.mjs`**

Add a sala selector when service is "Sala" (only for Sala teams):

Replace `renderCreateTeamForm`:

```js
function renderCreateTeamForm() {
  const serviceOptions = CLINICAL_TEAM_SERVICES.map(
    (svc) => `<option value="${escapeAttr(svc)}">${escapeHtml(svc)}</option>`
  ).join('');
  const rank = clinicalSessionContext.user?.rank || 'R1';
  const defaultCycle = getCycleConfig(CLINICAL_TEAM_SERVICES[0], rank);
  const letterOptions = defaultCycle.letters.map(
    (letter) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`
  ).join('');

  return `
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Crear equipo</h4>
      <form id="clinical-team-create-form" class="clinical-teams-create-form">
        <div class="field-group" id="clinical-team-sala-group" style="display:none">
          <label for="clinical-team-create-sala">Sala</label>
          <select id="clinical-team-create-sala" class="profile-input">
            <option value="Sala 1">Sala 1</option>
            <option value="Sala 2">Sala 2</option>
            <option value="Sala E">Sala E</option>
          </select>
        </div>
        <div class="field-group">
          <label for="clinical-team-create-name">Nombre del equipo (residente líder)</label>
          <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Dr. Gutiérrez" required>
        </div>
        <div class="field-group">
          <label for="clinical-team-create-service">Servicio</label>
          <select id="clinical-team-create-service" class="profile-input" required>${serviceOptions}</select>
        </div>
        <div class="field-group">
          <label for="clinical-team-create-day">Posición en ciclo</label>
          <select id="clinical-team-create-day" class="profile-input" required>${letterOptions}</select>
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Crear equipo</button>
        </div>
      </form>
    </section>`;
}
```

- [ ] **Step 3: Add service change handler to show/hide sala selector**

In `wireClinicalTeamsPanelInteractions`, add to the existing `serviceSelect` change handler:

```js
serviceSelect.addEventListener('change', () => {
  const daySelect = document.getElementById('clinical-team-create-day');
  if (!daySelect) return;
  const rank = clinicalSessionContext.user?.rank || 'R1';
  const cfg = getCycleConfig(serviceSelect.value, rank);
  daySelect.innerHTML = cfg.letters.map(
    (letter) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`
  ).join('');

  // Show/hide sala selector for Sala service
  const salaGroup = document.getElementById('clinical-team-sala-group');
  if (salaGroup) {
    const isSala = normalizeServiceKey(serviceSelect.value).includes('sala');
    salaGroup.style.display = isSala ? '' : 'none';
  }
});
```

Add the `normalizeServiceKey` import or inline the check:

```js
// Inline: serviceSelect.value.toLowerCase().includes('sala')
```

- [ ] **Step 4: Update `handleCreateTeamSubmit` to include sala**

Replace the create call:

```js
const sala = String(document.getElementById('clinical-team-create-sala')?.value || '').trim();
const cycleLetter = String(document.getElementById('clinical-team-create-day')?.value || 'A').trim();

const res = await api.dbClinicalTeamsCreate({
  name,
  service,
  subAreaFraction: cycleLetter,
  onCallDayIndex: 0,
  sala: sala || undefined,
  teamLeaderName: name,
  createdBy: userId,
});
```

- [ ] **Step 5: Update `dbClinicalTeamsCreate` in `clinical-access-db.mjs`**

Read the function and add `sala` and `teamLeaderName` to the INSERT:

```js
export function createTeam(db, { name, service, subAreaFraction, onCallDayIndex, sala, teamLeaderName, createdBy }) {
  const teamId = crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID();
  db.prepare(`
    INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, sala, team_leader_name, created_by)
    VALUES (@teamId, @name, @service, @subAreaFraction, @onCallDayIndex, @sala, @teamLeaderName, @createdBy)
  `).run({
    teamId, name, service,
    subAreaFraction: subAreaFraction || null,
    onCallDayIndex: onCallDayIndex ?? 0,
    sala: sala || null,
    teamLeaderName: teamLeaderName || null,
    createdBy: createdBy || null,
  });
  return { ok: true, team: { team_id: teamId, name, service } };
}
```

- [ ] **Step 6: Run tests**

```bash
npm test -- --test-name-pattern="team|createTeam"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/js/features/clinical-teams.mjs lib/db/clinical-access-db.mjs
git commit -m "feat(teams): sala team creation with sala selector and leader name"
```

---

### Task 5: Sala membership validations

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`
- Modify: `public/js/features/clinical-teams.mjs`

- [ ] **Step 1: Add validation queries to `clinical-access-db.mjs`**

```js
export function validateSalaTeamMembership(db, { userId, teamId, teamSala }) {
  const errors = [];

  // R1: only 1 Sala team
  const r1Teams = db.prepare(`
    SELECT COUNT(*) as cnt FROM team_membership tm
    JOIN teams t ON t.team_id = tm.team_id
    JOIN users u ON u.user_id = tm.user_id
    WHERE tm.user_id = ? AND u.rank = 'R1' AND t.sala IS NOT NULL AND t.sala = ?
  `).get(userId, teamSala);
  if (r1Teams.cnt >= 1) {
    errors.push('R1 ya pertenece a un equipo en esta Sala.');
  }

  // R2: only 1 team total (they lead a team)
  const r2Teams = db.prepare(`
    SELECT COUNT(*) as cnt FROM team_membership tm
    JOIN users u ON u.user_id = tm.user_id
    WHERE tm.user_id = ? AND u.rank = 'R2'
  `).get(userId);
  if (r2Teams.cnt >= 1) {
    errors.push('R2 ya lidera un equipo.');
  }

  // Max 4 teams per Sala
  const salaCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM teams WHERE sala = ?
  `).get(teamSala);
  if (salaCount.cnt >= 4) {
    errors.push('Ya hay 4 equipos en esta Sala (máximo).');
  }

  // Max 2 R1s per team
  const r1Count = db.prepare(`
    SELECT COUNT(*) as cnt FROM team_membership tm
    JOIN users u ON u.user_id = tm.user_id
    WHERE tm.team_id = ? AND u.rank = 'R1'
  `).get(teamId);
  if (r1Count.cnt >= 2) {
    errors.push('El equipo ya tiene 2 R1s (máximo).');
  }

  return errors;
}
```

- [ ] **Step 2: Call validations in `addTeamMember`**

In the existing `addTeamMember` / `dbClinicalTeamsMemberAdd` function, add before inserting:

```js
const team = db.prepare('SELECT sala FROM teams WHERE team_id = ?').get(teamId);
const errors = validateSalaTeamMembership(db, { userId, teamId, teamSala: team?.sala });
if (errors.length) return { ok: false, error: errors.join(' ') };
```

- [ ] **Step 3: Surface validation errors in the UI**

In `clinical-teams.mjs` `handleAddMemberSubmit`, the `toast` call already shows `res?.error`. The backend validation errors will be returned in `res.error`.

- [ ] **Step 4: Run tests**

```bash
npm test -- --test-name-pattern="member|validation|sala"
```

- [ ] **Step 5: Commit**

```bash
git add lib/db/clinical-access-db.mjs
git commit -m "feat(teams): sala membership validations"
```

---

### Task 6: Sala cycle — R1 ABCDx2, R2 ABCDEF with Guardia declarations

**Files:**
- Modify: `public/js/clinico-access.mjs`
- Modify: `public/js/clinico-access.test.mjs`

The existing `CYCLE_CONFIGS`, `isOnCallToday`, and `getCycleConfig` already handle R1 ABCDx2 (8 days) and R2 ABCDEF (6 days) for Sala. The missing piece: **compute which R1/R2 is on-call for a given Sala today**, including guardia swaps (any team member can override via `team_guardia_today`).

- [ ] **Step 1: Add `salaOnCallR1` function**

```js
/**
 * Returns the R1(s) on call for a given Sala today.
 * @param {object[]} teams — all teams
 * @param {string} sala — "Sala 1" | "Sala 2" | "Sala E"
 * @param {Date|string} now
 * @returns {{ team_id: string, user_id: string }[]} — on-call R1s (declared or cycle default)
 */
export function salaOnCallR1(teams, sala, now) {
  const d = now instanceof Date ? now : new Date(String(now));
  return (teams || [])
    .filter((t) => t.sala === sala)
    .filter((t) => isOnCallToday(t, 'R1', d))
    .flatMap((t) =>
      (t.members || [])
        .filter((m) => m.rank === 'R1')
        .map((m) => ({ team_id: t.team_id, user_id: m.user_id }))
    );
}
```

- [ ] **Step 2: Add `salaOnCallR2` function**

```js
/**
 * Returns the R2(s) on call across all Salas today.
 * Each Sala's 4 teams cycle A-F: (salaIndex * 4 + teamIndex) → total 12 positions.
 * 2 R2s on call per day.
 * @param {object[]} teams
 * @param {Date|string} now
 * @returns {{ team_id: string, user_id: string }[]}
 */
export function salaOnCallR2(teams, now) {
  const d = now instanceof Date ? now : new Date(String(now));
  const r2Teams = (teams || []).filter((t) => isOnCallToday(t, 'R2', d));
  return r2Teams.flatMap((t) =>
    (t.members || [])
      .filter((m) => m.rank === 'R2')
      .map((m) => ({ team_id: t.team_id, user_id: m.user_id }))
  );
}
```

- [ ] **Step 3: Add `salaGuardiaOverride` — checks team_guardia_today for swaps**

```js
/**
 * Returns the actual on-call user for a team, respecting guardia overrides.
 * @param {object} team — with guardia_today field
 * @returns {string|null} — user_id of the declared guardia, or null
 */
export function teamGuardiaOverride(team) {
  return team?.guardia_today?.user_id || null;
}
```

- [ ] **Step 4: Write tests**

In `clinico-access.test.mjs`:

```js
import { salaOnCallR1, salaOnCallR2 } from './clinico-access.mjs';

test('salaOnCallR1 returns R1 on call for Sala 1 on day 1', () => {
  const now = new Date('2026-06-01T12:00:00Z'); // day 1 → position 0 = A1
  const teams = [
    { team_id: 't-a', sala: 'Sala 1', sub_area_fraction: 'A1', members: [
      { user_id: 'r1-a1', rank: 'R1' }
    ]},
    { team_id: 't-b', sala: 'Sala 1', sub_area_fraction: 'B1', members: [
      { user_id: 'r1-b1', rank: 'R1' }
    ]},
    { team_id: 't-c', sala: 'Sala 2', sub_area_fraction: 'A1', members: [
      { user_id: 'r1-s2', rank: 'R1' }
    ]},
  ];
  const result = salaOnCallR1(teams, 'Sala 1', now);
  assert.equal(result.length, 1);
  assert.equal(result[0].user_id, 'r1-a1');
});

test('salaOnCallR1 empty when no team is on-call', () => {
  const now = new Date('2026-06-02T12:00:00Z'); // day 2 → position 1 = B1
  const teams = [
    { team_id: 't-a', sala: 'Sala 1', sub_area_fraction: 'A1', members: [] },
  ];
  const result = salaOnCallR1(teams, 'Sala 1', now);
  assert.equal(result.length, 0);
});

test('salaOnCallR2 returns R2s on call across all Salas', () => {
  const now = new Date('2026-06-01T12:00:00Z'); // day 1 → position 0 = A
  const teams = [
    { team_id: 't1', sala: 'Sala 1', sub_area_fraction: 'A', members: [
      { user_id: 'r2-a', rank: 'R2' }
    ]},
    { team_id: 't2', sala: 'Sala 1', sub_area_fraction: 'B', members: [
      { user_id: 'r2-b', rank: 'R2' }
    ]},
  ];
  const result = salaOnCallR2(teams, now);
  const ids = result.map((r) => r.user_id);
  assert.ok(ids.includes('r2-a'));
  assert.equal(ids.includes('r2-b'), false);
});
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --test-name-pattern="salaOnCallR1|salaOnCallR2|isOnCallToday"
```

- [ ] **Step 6: Commit**

```bash
git add public/js/clinico-access.mjs public/js/clinico-access.test.mjs
git commit -m "feat(guardia): salaOnCallR1 and salaOnCallR2 cycle functions"
```

---

### Task 7: `evaluateClinicalScope` V3 — team-based visibility + handoff + guardia mode

**Files:**
- Modify: `public/js/clinico-access.mjs`
- Modify: `public/js/clinico-access.test.mjs`

This is the core scope engine. Current V2 uses rank-based rules (R1 writes if `sub_area_fraction` matches, R2 sees Sala, etc.). V3 replaces this with:

1. **Normal mode**: visibility is purely team-based (you see patients in `patient_team_assignment` for teams you belong to, OR patients assigned via `active_guardias`)
2. **Handoff mode**: progressive per-patient visibility via `active_guardias.covering_user_id`
3. **Guardia mode**: R1 guardia sees all patients in their Sala; R2 guardia sees handed-off patients; R4 de guardia sees all

The context now includes:
- `guardiaMode: boolean` — whether the current user has Modo Guardia active
- `patientAssignments: object[]` — from `patient_team_assignment` table

- [ ] **Step 1: Add `patientAssignedToTeam` helper**

```js
/**
 * Checks if a patient is assigned to any of the user's teams.
 * @param {string} patientId
 * @param {object[]} assignments — from patient_team_assignment
 * @param {Set<string>} joinedTeamIds
 */
export function patientAssignedToTeam(patientId, assignments, joinedTeamIds) {
  const pid = String(patientId || '');
  return (assignments || []).some(
    (a) => String(a.patient_id) === pid && joinedTeamIds.has(String(a.team_id))
  );
}
```

- [ ] **Step 2: Add `patientCoveredByGuardia` helper**

```js
/**
 * Checks if the patient was handed off to this user via active_guardias.
 * @param {string} patientId
 * @param {string} userId
 * @param {object[]} guardias
 */
export function patientCoveredByGuardia(patientId, userId, guardias) {
  const uid = String(userId || '');
  return (guardias || []).some(
    (g) => String(g.patient_id) === String(patientId) && String(g.covering_user_id) === uid
  );
}
```

- [ ] **Step 3: Rewrite `evaluateClinicalScope` core logic**

Replace the rank-based sections (R1, R2, R3, R4) with the V3 logic. Keep Admin, incoming preview, and active guardia coverage unchanged.

```js
export function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null, context = null) {
  const ctx = context && typeof context === 'object' ? context : {};
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const salaGuardiaToday = Array.isArray(ctx.salaGuardiaToday) ? ctx.salaGuardiaToday : [];
  const guardias = Array.isArray(ctx.guardias) ? ctx.guardias : [];
  const cycle = ctx.cycle ?? null;
  const guardiaMode = !!ctx.guardiaMode;
  const now = ctx.now != null ? (ctx.now instanceof Date ? ctx.now : new Date(String(ctx.now))) : new Date();
  const userId = String(currentUser?.user_id || '');
  const rank = String(currentUser?.rank || '');
  const patientId = String(targetPatient?.id || '');
  const userSala = String(currentUser?.sala || '');

  const deny = (reasoning, extra = {}) => ({ readable: false, writable: false, reasoning, audit: { userId, rank, patientId, timestamp: now.toISOString() }, ...extra });
  const allow = (reasoning, readable = true, writable = true, extra = {}) => ({ readable, writable, reasoning, audit: { userId, rank, patientId, timestamp: now.toISOString() }, ...extra });

  if (!currentUser?.user_id || !targetPatient?.id) return deny('Usuario o paciente no identificado');
  if (rank === 'Admin') return allow('Admin: acceso completo');

  // Active guardia coverage (handoff recipient)
  if (activeGuardia && String(activeGuardia.covering_user_id || '') === userId) {
    return allow('Guardia activa: cobertura asignada');
  }

  // Incoming preview
  if (isIncomingPreviewWindow(cycle, now)) {
    const incoming = assignments.find((a) => String(a.patient_id) === patientId);
    if (incoming) {
      const effectiveMs = toMillis(incoming.effective_at);
      const nowMs = toMillis(now);
      if (Number.isFinite(effectiveMs) && Number.isFinite(nowMs) && nowMs < effectiveMs) {
        return allow('Vista previa Incoming', true, false, { incomingPreview: true });
      }
    }
  }

  const joinedTeams = getJoinedTeams(teams, userId);
  const joinedTeamIds = new Set(joinedTeams.map((t) => String(t.team_id)));

  // ── Guardia Mode ──
  if (guardiaMode) {
    if (rank === 'R1') {
      // R1 guardia sees all patients in their Sala
      const patientSala = targetPatient?.sala || '';
      if (patientSala && patientSala === userSala) {
        return allow('Modo Guardia R1: visibilidad de Sala completa', true, false);
      }
      return deny('Modo Guardia R1: fuera de mi Sala');
    }

    if (rank === 'R2') {
      // R2 guardia sees patients handed off to them
      if (patientCoveredByGuardia(patientId, userId, guardias)) {
        return allow('Modo Guardia R2: paciente entregado', true, false);
      }
      return deny('Modo Guardia R2: sin entrega recibida');
    }

    if (rank === 'R4') {
      // R4 de guardia sees all Sala + Torre patients
      const svc = normalizeServiceKey(targetPatient?.service);
      if (svc.includes('sala') || svc.includes('torre')) {
        return allow('Modo Guardia R4: cobertura Sala + Torre', true, false);
      }
      return deny('Modo Guardia R4: fuera de dominio');
    }

    return deny('Modo Guardia: rango sin cobertura');
  }

  // ── Normal Mode ──
  // Check if patient is assigned to one of the user's teams
  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds)) {
    return allow('Paciente del equipo');
  }

  // Check progressive handoff (via active_guardias)
  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow('Paciente entregado (handoff)');
  }

  return deny('Fuera de alcance — sin equipo ni handoff');
}
```

- [ ] **Step 4: Update the test file**

Replace all rank-specific tests (R1, R2, R3, R4, Sala ABCDEF) with V3 tests:

```js
test('normal mode: patient assigned to team is visible', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1' },
    { id: 'p1' },
    null,
    {
      teams: [{ team_id: 't1', members: [{ user_id: 'r1' }] }],
      assignments: [{ patient_id: 'p1', team_id: 't1' }],
      guardias: [],
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
});

test('normal mode: patient not assigned is denied', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1' },
    { id: 'p2' },
    null,
    {
      teams: [{ team_id: 't1', members: [{ user_id: 'r1' }] }],
      assignments: [{ patient_id: 'p1', team_id: 't1' }],
      guardias: [],
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, false);
});

test('handoff: patient covered by guardia is visible', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1x', rank: 'R1' },
    { id: 'p1' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [{ patient_id: 'p1', covering_user_id: 'r1x' }],
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
});

test('guardia mode R1: sees all in same Sala', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1', sala: 'Sala 1' },
    { id: 'p1', sala: 'Sala 1' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [],
      guardiaMode: true,
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, false); // guardia mode is read-only
});

test('guardia mode R1: denied for different Sala', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1', sala: 'Sala 1' },
    { id: 'p1', sala: 'Sala 2' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [],
      guardiaMode: true,
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, false);
});

test('guardia mode R2: sees handed-off patients', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2' },
    { id: 'p1' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [{ patient_id: 'p1', covering_user_id: 'r2' }],
      guardiaMode: true,
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
});

test('guardia mode R4: sees Sala and Torre', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r4', rank: 'R4' },
    { id: 'p1', service: 'Sala' },
    null,
    { teams: [], assignments: [], guardias: [], guardiaMode: true, now: '2026-06-01T12:00:00Z' }
  );
  assert.equal(scope.readable, true);
});

test('active guardia covering user has full access', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1' },
    { id: 'p1' },
    { covering_user_id: 'r1' },
    { teams: [], assignments: [], guardias: [], now: '2026-06-01T12:00:00Z' }
  );
  assert.equal(scope.writable, true);
});
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --test-name-pattern="evaluateClinicalScope|patientAssigned|patientCovered|guardia mode"
```

Expected: new tests PASS. May have pre-existing test failures from old rank tests that now need updating.

- [ ] **Step 6: Commit**

```bash
git add public/js/clinico-access.mjs public/js/clinico-access.test.mjs
git commit -m "feat(scope): evaluateClinicalScope V3 — teams, handoff, guardia mode"
```

---

### Task 8: Modo Guardia toggle + remove "Siguiente entrega" tile

**Files:**
- Modify: `public/js/features/guardia-board.mjs`
- Modify: `public/js/clinical-access-runtime.mjs`

The guardia board already has a "Modo Guardia" mode (the entire guardia board IS the mode). What's new: a toggle within the guardia board that switches between "Normal" (team scope) and "Guardia" (expanded scope) views. Also remove the useless "Siguiente entrega" tile that just shows the next hour.

- [ ] **Step 0: Remove "Siguiente entrega" tile**

In `guardia-board.mjs`, `computeGuardiaSummary` currently returns `{ critical, pending, nextHandoff }` and `renderGuardiaSummaryTiles` renders 3 tiles. Remove both.

Change `computeGuardiaSummary`:
```js
function computeGuardiaSummary(census) {
  let critical = 0;
  let pending = 0;
  (census || []).forEach((p) => {
    if (p.isCritical) critical += 1;
    pending += p.pendingCount || 0;
  });
  return { critical, pending };
}
```

Change `renderGuardiaSummaryTiles`:
```js
function renderGuardiaSummaryTiles(summary) {
  const host = document.getElementById('guardia-summary');
  if (!host) return;
  host.innerHTML = `
    <div class="guardia-summary-tile guardia-summary-tile--critical">
      <div>
        <div class="guardia-summary-label">Pacientes críticos</div>
        <div class="guardia-summary-value guardia-summary-value--critical">${summary.critical}</div>
      </div>
      <span class="guardia-summary-icon" aria-hidden="true">⚠️</span>
    </div>
    <div class="guardia-summary-tile">
      <div>
        <div class="guardia-summary-label">Pendientes totales</div>
        <div class="guardia-summary-value">${summary.pending}</div>
      </div>
      <span class="guardia-summary-icon" aria-hidden="true">📋</span>
    </div>`;
}
```

- [ ] **Step 1: Add guardia mode toggle state to `clinicalSessionContext`**

In `clinical-access-runtime.mjs`:

```js
export const clinicalSessionContext = {
  user: null,
  guardias: [],
  guardiasMap: new Map(),
  teams: [],
  scopeContext: null,
  decryptedPrivateKeyPem: null,
  lastBlockHashByPatient: new Map(),
  guardiaMode: false,  // NEW
};
```

- [ ] **Step 2: Add toggle button in the guardia board header**

In the HTML partial for the guardia board, add a toggle button. Find `guardia-summary` in `partials/` and add after the summary tiles:

```html
<div class="guardia-mode-toggle-row">
  <button type="button" id="btn-guardia-mode-toggle" class="btn-guardia-mode" aria-pressed="false">
    <span class="guardia-mode-label">Modo Normal</span>
    <span class="guardia-mode-switch"></span>
  </button>
</div>
```

- [ ] **Step 3: Wire toggle in `guardia-board.mjs`**

Add a `wireGuardiaModeToggle` function:

```js
function wireGuardiaModeToggle() {
  const btn = document.getElementById('btn-guardia-mode-toggle');
  if (!btn || btn._rpcGuardiaModeWired) return;
  btn._rpcGuardiaModeWired = true;

  const syncUI = (active) => {
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('is-active', active);
    const label = btn.querySelector('.guardia-mode-label');
    if (label) label.textContent = active ? 'Modo Guardia' : 'Modo Normal';
  };

  syncUI(clinicalSessionContext.guardiaMode);

  btn.addEventListener('click', () => {
    clinicalSessionContext.guardiaMode = !clinicalSessionContext.guardiaMode;
    syncUI(clinicalSessionContext.guardiaMode);
    renderGuardiaBoard(settings);
  });
}
```

Call `wireGuardiaModeToggle()` in `renderGuardiaBoard`.

- [ ] **Step 4: Pass `guardiaMode` to scope context**

In `renderGuardiaBoard`, when building `scopeContext` for `evaluateClinicalScope`, include:

```js
clinicalSessionContext.scopeContext = {
  teams: clinicalSessionContext.teams,
  guardias: clinicalSessionContext.guardias,
  assignments: clinicalSessionContext.assignments || [],
  salaGuardiaToday: clinicalSessionContext.salaGuardiaToday || [],
  guardiaMode: clinicalSessionContext.guardiaMode,
  now: new Date(),
};
```

- [ ] **Step 5: Update `renderGuardiaBoard` to filter by scope**

When `guardiaMode` is OFF, patients should be filtered to only those visible via `evaluateClinicalScope` (team + handoff). When ON, the guardia-mode scope applies (wider).

```js
if (!clinicalSessionContext.guardiaMode && gridViewContext === 'GUARDIA') {
  // Normal mode: only show patients in scope
  censusPatients = censusPatients.filter((p) => {
    const scope = evaluateClinicalScope(
      clinicalSessionContext.user,
      { id: p.id, service: p.service, sala: p.sala },
      clinicalSessionContext.guardiasMap.get(p.id),
      clinicalSessionContext.scopeContext
    );
    return scope.readable;
  });
}
```

- [ ] **Step 6: Add CSS for toggle**

In `modals.css`:

```css
.guardia-mode-toggle-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding: 0 4px;
}
.btn-guardia-mode {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.btn-guardia-mode.is-active {
  background: #166534;
  color: #bbf7d0;
  border-color: #166534;
}
.guardia-mode-switch {
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: var(--border);
  position: relative;
  transition: background 0.2s;
}
.btn-guardia-mode.is-active .guardia-mode-switch {
  background: #22c55e;
}
```

- [ ] **Step 7: Run tests**

```bash
npm test
```

- [ ] **Step 8: Commit**

```bash
git add public/js/features/guardia-board.mjs public/js/clinical-access-runtime.mjs public/styles/modals.css public/partials/modals/root.html
git commit -m "feat(guardia): modo guardia toggle with scope filtering"
```

---

### Task 9: Entrega V3 — double handoff for R2

**Files:**
- Modify: `public/js/features/clinical-entrega.mjs`

R2s must hand off each patient to BOTH their R4 AND one of the 2 R2s de guardia. The `active_guardias` table allows one `covering_user_id` per row, so double handoff means two `active_guardias` rows per patient (one for R4, one for R2 guardia).

- [ ] **Step 1: Update `listEntregaTargets` for R2**

The current R2 flow shows same-service peers and R4. Update to also include the 2 R2s on guardia:

```js
if (rankNorm === 'R2') {
  const r2GuardiaOnCall = salaOnCallR2(teamList, now);
  const r2GuardiaIds = new Set(r2GuardiaOnCall.map((r) => r.user_id));

  // R2 guardia recipients
  const r2GuardiaUsers = all.filter((u) => r2GuardiaIds.has(u.user_id));
  // R4s
  const r4s = all.filter((u) => u.rank === 'R4');

  const targets = uniqueByUserId([...r2GuardiaUsers, ...r4s]);
  return { flow: 'r2_handoff', targets: targets.length ? targets : all };
}
```

- [ ] **Step 2: Update `openEntregaModal` for R2 double-select**

For R2 users, show TWO covering-user selects:

```js
if (rank === 'R2') {
  const r2TargetSelect = document.getElementById('entrega-covering-user-r4');
  const r4TargetSelect = document.getElementById('entrega-covering-user');
  // Populate both with R2 guardia targets and R4s respectively
  // On submit: upsert TWO active_guardias rows (one per receiver)
}
```

Actually, simpler approach: single select, but the modal explains that R2 must hand off twice — once per receiver. The user opens the modal twice per patient.

Even simpler: the modal already covers one handoff at a time. R2 runs it twice — once selecting their R4, once selecting an R2 guardia. No modal changes needed beyond the target list (Step 1).

- [ ] **Step 3: Update `submitEntregaAssignment` to support `active_guardias` without overwriting**

The current `dbGuardiaUpsert` uses `INSERT OR REPLACE` keyed on `(patient_id, covering_user_id)`. Since double handoff creates two rows with different covering_user_ids for the same patient, this already works — no change needed.

- [ ] **Step 4: Add R2 handoff flow label**

In the `flowLabels`:

```js
r2_handoff: 'R2: selecciona R4 de Sala y R2 de guardia (dos entregas separadas).',
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --test-name-pattern="listEntregaTargets"
```

- [ ] **Step 6: Commit**

```bash
git add public/js/features/clinical-entrega.mjs
git commit -m "feat(entrega): R2 double-handoff target list with salaOnCallR2"
```

---

### Task 10: Full integration verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: 0 failures.

- [ ] **Step 2: Verify no broken references**

```bash
rg "on_call_day_index\s*!==\s*weekday\b|on_call_day_index\s*===\s*weekday\b" public/js/
```
Expected: no matches in source files.

- [ ] **Step 3: Rebuild renderer bundle**

```bash
node scripts/bundle-renderer.mjs
```

- [ ] **Step 4: Final run after bundle rebuild**

```bash
npm test
```

- [ ] **Step 5: Commit bundle**

```bash
git add public/js/app.bundle.mjs public/js/app.bundle.mjs.map
git commit -m "chore: rebuild renderer bundle for V3"
```
