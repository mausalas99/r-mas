# Guardia LAN Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current LAN connection dropdown with a rank-contextual "Guardia LAN Hub" that consolidates Sala room selection, team joining/creation, handoff mode entry, census monitoring, and mobile pairing into a single panel. Add auto-discovery for LAN hosts with rank-based priority, monthly team lifecycle, and patient auto-assignment.

**Architecture:** The existing `renderLanPanelOnce()` in `lan-sync.mjs` is completely rewritten to emit a rank-contextual panel. Team lifecycle leverages the existing `clinical-teams.mjs` modal and `clinical-access-db.mjs` backend with added leader/rotation columns. Patient auto-assignment is a small hook in `commitPatient()`. Mobile pairing encodes clinical identity into the join URL.

**Tech Stack:** Vanilla JS (ES modules), Better-SQLite3, existing IPC handler pattern, CSS custom properties.

---

## Task 1: Schema migration v4 — leader_user_id and rotation_active

**Files:**
- Modify: `lib/db/schema.mjs:1-228`
- Modify: `lib/db/clinical-access-db.mjs:302-327`

- [ ] **Step 1: Bump schema version and add migrateToV4**

In `lib/db/schema.mjs`, change `SCHEMA_VERSION` from 3 to 4:

```js
// line 1
export const SCHEMA_VERSION = 4;
```

Add the `migrateToV4` function before `applyMigrations`. Insert it after `migrateToV3` (after line 197):

```js
/** @param {import('better-sqlite3').Database} db */
function migrateToV4(db) {
  // Add leader_user_id and rotation_active to teams
  const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  if (!teamCols.includes('leader_user_id')) {
    db.exec('ALTER TABLE teams ADD COLUMN leader_user_id TEXT REFERENCES users(user_id)');
  }
  if (!teamCols.includes('rotation_active')) {
    db.exec("ALTER TABLE teams ADD COLUMN rotation_active INTEGER NOT NULL DEFAULT 1 CHECK(rotation_active IN (0, 1))");
  }

  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '4');
}
```

In `applyMigrations`, add the v4 migration call after the v3 block (after line 217, inside the transaction):

```js
    if (version < 4) {
      migrateToV4(db);
    }
```

- [ ] **Step 2: Update createTeam to accept and persist leader_user_id**

In `lib/db/clinical-access-db.mjs`, update `createTeam` function signature and INSERT to include `leader_user_id`. Change lines 302-327:

```js
export function createTeam(db, { name, service, onCallDayIndex, subAreaFraction, sala, teamLeaderName, createdBy, leaderUserId }) {
  const teamId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, sala, team_leader_name, created_by, leader_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    teamId,
    String(name),
    String(service),
    subAreaFraction ?? null,
    Number(onCallDayIndex),
    sala ?? null,
    teamLeaderName ?? null,
    createdBy ?? null,
    leaderUserId ?? createdBy ?? null
  );
  return {
    team_id: teamId,
    name: String(name),
    service: String(service),
    sub_area_fraction: subAreaFraction ?? null,
    on_call_day_index: Number(onCallDayIndex),
    sala: sala ?? null,
    team_leader_name: teamLeaderName ?? null,
    created_by: createdBy ?? null,
    leader_user_id: leaderUserId ?? createdBy ?? null,
    rotation_active: 1,
  };
}
```

Update `listActiveTeams` (lines 332-341) to include the new columns:

```js
export function listActiveTeams(db) {
  return db
    .prepare(
      `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at, sala, team_leader_name, leader_user_id, rotation_active
       FROM teams
       WHERE archived_at IS NULL
       ORDER BY name`
    )
    .all();
}
```

Update `archiveRotationAndTeams` (lines 260-266) to set `rotation_active = 0` instead of/during archive:

```js
export function archiveRotationAndTeams(db) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE rotation_cycles SET archived_at = ? WHERE archived_at IS NULL`).run(now);
  db.prepare(`UPDATE teams SET archived_at = ?, rotation_active = 0 WHERE archived_at IS NULL`).run(now);
  db.prepare(`DELETE FROM active_guardias`).run();
  db.prepare(`DELETE FROM team_guardia_today`).run();
}
```

- [ ] **Step 3: Run to verify migration applies cleanly**

Run the app and verify the DB migrates without errors. Check via the app's startup logs or a quick manual test.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.mjs lib/db/clinical-access-db.mjs
git commit -m "feat: add leader_user_id and rotation_active columns to teams (schema v4)"
```

---

## Task 2: Add team-related DB functions to clinical-access-db.mjs

**Files:**
- Modify: `lib/db/clinical-access-db.mjs`

- [ ] **Step 1: Add promoteTeamLeader function**

At the end of `clinical-access-db.mjs`, add:

```js
/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 */
export function promoteTeamLeader(db, teamId, userId) {
  db.prepare(
    `UPDATE teams SET leader_user_id = ? WHERE team_id = ?`
  ).run(userId, teamId);
  return db.prepare('SELECT team_id, leader_user_id FROM teams WHERE team_id = ?').get(teamId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 */
export function getTeamById(db, teamId) {
  return db.prepare(
    `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
            archived_at, sala, team_leader_name, leader_user_id, rotation_active
     FROM teams WHERE team_id = ?`
  ).get(teamId);
}
```

- [ ] **Step 2: Add findUserTeamForAutoAssign function**

```js
/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @returns {{ team_id: string }|null}
 */
export function findUserTeamForAutoAssign(db, userId) {
  return db.prepare(
    `SELECT tm.team_id
     FROM team_membership tm
     JOIN teams t ON t.team_id = tm.team_id
     WHERE tm.user_id = ? AND t.rotation_active = 1 AND t.archived_at IS NULL
     LIMIT 1`
  ).get(userId) || null;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/clinical-access-db.mjs
git commit -m "feat: add promoteTeamLeader, getTeamById, findUserTeamForAutoAssign to clinical-access-db"
```

---

## Task 3: Wire IPC handlers for new DB functions

**Files:**
- Modify: the file that exposes `dbClinicalTeamsCreate`, `dbClinicalTeamsMemberAdd`, etc. (find via `grep`)

- [ ] **Step 1: Find the IPC handler registration file**

Run:
```bash
grep -rn "dbClinicalTeamsCreate" lib/ --include="*.mjs" | head -5
```

- [ ] **Step 2: Read that file and add new IPC handlers**

Read the identified file. Add handlers for:
- `dbClinicalTeamsPromoteLeader` → calls `promoteTeamLeader()`
- `dbClinicalTeamGetById` → calls `getTeamById()`
- `dbClinicalFindUserTeam` → calls `findUserTeamForAutoAssign()`

Following the existing handler pattern in that file, add these three handlers. Each should accept the args, call the DB function, and return `{ ok: true, ...result }` or `{ ok: false, error: ... }`.

- [ ] **Step 3: Update preload/context bridge to expose new APIs**

If there's a preload script that exposes DB functions to the renderer, add the three new function names there.

- [ ] **Step 4: Commit**

```bash
git add <ipc-handler-file> <preload-file>
git commit -m "feat: wire IPC handlers for team leader, getById, and findUserTeam"
```

---

## Task 4: Remove deprecated sections from renderLanPanelOnce

**Files:**
- Modify: `public/js/features/lan-sync.mjs:2549-2845`

- [ ] **Step 1: Remove the no-URL-configured branch**

The entire block from line 2559 (`if (!lanClient.baseUrl())`) to line 2661 (`return;`) that shows the "Activar sala en vivo" / "Unirse al equipo" form with IP input/invite textarea is replaced by the new auto-discovery flow. Delete lines 2559-2661.

- [ ] **Step 2: Remove deprecated sections from the connected branch**

In the remaining connected block (lines 2667-2845), remove:
- `appendLanBackToLocalHostSection(root)` (line 2668)
- `appendLanKnownSessionsSection(root)` (line 2669)
- `appendLanJoinOtherMacSection(root)` (line 2670)
- The status card with IP display, pairing display, mint pairing button, copy invite link, copy mobile link (lines 2672-2758)
- `void maybeShowLanMigrationNotice()` (line 2760)

Keep the Sala rooms card building (lines 2762-2843) which reads `rpc-settings` for rank and Sala, filters `salaDefs`, and builds the rooms card. This becomes the Sala section of the new panel.

- [ ] **Step 3: Commit**

```bash
git add public/js/features/lan-sync.mjs
git commit -m "refactor: remove deprecated LAN dropdown sections (IP input, pairing, known sessions, etc.)"
```

---

## Task 5: Build the new LAN status line and auto-discovery scaffold

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Add helper functions for LAN status and rank context**

At the top of the file (after existing helpers), add:

```js
function getClinicalSettings() {
  try {
    return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {
    return {};
  }
}

function getClinicalRank() {
  var s = getClinicalSettings();
  return String(s.clinicalRank || '').trim();
}

function getUserSala() {
  var s = getClinicalSettings();
  return String(s.clinicalSala || '').trim();
}

function isClinicalRegistered() {
  var s = getClinicalSettings();
  return s.clinicalRegistered === true;
}

function isLanHostActive() {
  return !!lanClient.connected;
}

function lanHostUrl() {
  return lanClient.baseUrl() || '';
}
```

- [ ] **Step 2: Rewrite renderLanPanelOnce to emit the new panel structure**

Replace the entire `renderLanPanelOnce` function body (from the current state after Task 4) with:

```js
async function renderLanPanelOnce() {
  var gen = ++_lanPanelRenderGen;
  var root = document.getElementById('lan-connection-panel-root');
  if (!root) return;

  await ensureLanElectronHostReady();
  if (lanPanelRenderStale(gen)) return;

  root.innerHTML = '';

  var registered = isClinicalRegistered();
  var userSala = getUserSala();
  var rank = getClinicalRank();

  // ---- UNREGISTERED ----
  if (!registered) {
    var unregCard = document.createElement('div');
    unregCard.className = 'lan-connect-card';
    unregCard.innerHTML =
      '<p class="lan-connect-card-hint">Completa el <strong>Registro de guardia</strong> para acceder a la red del hospital.</p>';
    root.appendChild(unregCard);
    return;
  }

  // ---- NO SALA ----
  if (!userSala && rank !== 'Admin' && rank !== 'R4') {
    var noSalaCard = document.createElement('div');
    noSalaCard.className = 'lan-connect-card';
    noSalaCard.innerHTML =
      '<p class="lan-connect-card-hint">No tienes una Sala asignada. Contacta a un R4 o Admin.</p>';
    root.appendChild(noSalaCard);
    return;
  }

  var isElevated = rank === 'Admin' || rank === 'R4';

  // ---- LAN STATUS LINE ----
  var statusCard = document.createElement('div');
  statusCard.className = 'lan-connect-card lan-hub-status-card';
  var connected = isLanHostActive();
  statusCard.innerHTML =
    '<div class="lan-hub-status-line">' +
    (connected
      ? '<span class="lan-hub-status-dot lan-hub-status-dot--online"></span> Conectado a la red del hospital'
      : '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span> Sin red — buscando…') +
    '</div>';
  if (!connected) {
    var becomeHostBtn = document.createElement('button');
    becomeHostBtn.type = 'button';
    becomeHostBtn.className = 'btn-lan-primary';
    becomeHostBtn.style.marginTop = '8px';
    becomeHostBtn.style.width = '100%';
    becomeHostBtn.textContent = 'Convertirse en host';
    becomeHostBtn.onclick = function () {
      void ensureLanElectronHostReady().then(function () {
        renderLanPanel();
        runtime.showToast('Esta Mac ahora es el servidor del turno.', 'success');
      });
    };
    statusCard.appendChild(becomeHostBtn);
  }
  root.appendChild(statusCard);

  // ---- SALA ROOMS CARD ----
  var salaDefs = [
    { id: 'sala-1', label: 'Sala 1', key: 'Sala 1' },
    { id: 'sala-2', label: 'Sala 2', key: 'Sala 2' },
    { id: 'sala-e', label: 'Sala E', key: 'Sala E' }
  ];

  var visibleSalaDefs;
  if (isElevated) {
    visibleSalaDefs = salaDefs;
  } else if (userSala) {
    visibleSalaDefs = salaDefs.filter(function (d) {
      return d.key === userSala;
    });
    if (!visibleSalaDefs.length) visibleSalaDefs = salaDefs;
  } else {
    visibleSalaDefs = [];
  }

  var roomsCard = document.createElement('div');
  roomsCard.className = 'lan-connect-card lan-rooms-panel';
  roomsCard.innerHTML = '<div class="lan-connect-card-title">Salas de guardia</div>';

  if (visibleSalaDefs.length) {
    var list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    visibleSalaDefs.forEach(function (d) {
      var li = document.createElement('li');
      li.style.display = 'flex';
      li.style.gap = '8px';
      li.style.alignItems = 'center';
      li.style.marginBottom = '8px';

      var name = document.createElement('span');
      name.style.flex = '1';
      name.style.fontSize = '13px';
      name.textContent = d.label;

      var joinBtn = document.createElement('button');
      joinBtn.type = 'button';
      joinBtn.className = 'btn-lan-secondary';
      joinBtn.style.flex = '0 0 auto';
      var inRoom = activeLiveSyncRoomId === d.id;
      joinBtn.textContent = inRoom ? 'En sala' : 'Unirse';
      joinBtn.disabled = inRoom;
      joinBtn.setAttribute('data-lan-action', 'join-room');
      joinBtn.setAttribute('data-room-id', d.id);
      joinBtn.setAttribute('data-room-label', d.label);

      li.appendChild(name);
      li.appendChild(joinBtn);
      list.appendChild(li);
    });
    roomsCard.appendChild(list);
  }
  root.appendChild(roomsCard);

  // ---- RANK-CONTEXTUAL SECTIONS ----
  if (rank === 'R1') {
    buildR1Section(root);
  } else if (rank === 'R2') {
    buildR2Section(root);
  } else if (isElevated) {
    buildR4Section(root);
  }
}
```

- [ ] **Step 3: Add placeholder build functions**

At the bottom of the file (before `resolveLanHostUrlForShare`), add:

```js
function buildR1Section(root) {
  // Task 6 fills this in
}

function buildR2Section(root) {
  // Task 7 fills this in
}

function buildR4Section(root) {
  // Task 8 fills this in
}
```

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lan-sync.mjs
git commit -m "feat: rewrite LAN dropdown with status line, Sala rooms, and rank-contextual scaffold"
```

---

## Task 6: Build R1 section — team status, Modo Guardia, mobile link

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Implement buildR1Section**

Replace the `buildR1Section` placeholder with:

```js
function buildR1Section(root) {
  var card = document.createElement('div');
  card.className = 'lan-connect-card lan-hub-team-card';
  card.innerHTML = '<div class="lan-connect-card-title">Mi equipo</div>';

  var userId = String(getClinicalUserUserId());
  var teams = clinicalSessionContext.teams || [];
  var myTeam = teams.find(function (t) {
    return (t.members || []).some(function (m) {
      return String(m.user_id) === userId;
    });
  });

  if (myTeam) {
    var teamName = document.createElement('p');
    teamName.className = 'lan-hub-team-name';
    teamName.textContent = 'Mi equipo: ' + (myTeam.name || 'Sin nombre');
    card.appendChild(teamName);
  } else {
    var noTeam = document.createElement('p');
    noTeam.className = 'lan-connect-card-hint';
    noTeam.innerHTML = 'Sin equipo — <button type="button" class="lan-hub-link-btn" id="lan-hub-join-team">Unirse a un equipo</button>';
    card.appendChild(noTeam);
    // join-team click handler will be wired in Task 9
  }

  root.appendChild(card);

  // ---- MODO GUARDIA TOGGLE ----
  var modoCard = document.createElement('div');
  modoCard.className = 'lan-connect-card lan-hub-modo-card';
  var modoLabel = document.createElement('label');
  modoLabel.className = 'lan-hub-modo-label';
  modoLabel.setAttribute('for', 'lan-hub-guardia-toggle');
  var modoCheck = document.createElement('input');
  modoCheck.type = 'checkbox';
  modoCheck.id = 'lan-hub-guardia-toggle';
  modoCheck.className = 'lan-hub-guardia-check';
  modoCheck.checked = !!clinicalSessionContext.guardiaMode;
  modoCheck.onchange = function () {
    clinicalSessionContext.guardiaMode = modoCheck.checked;
    // re-render guardia board
    if (typeof renderGuardiaBoard === 'function') {
      var s = {};
      try { s = JSON.parse(localStorage.getItem('rpc-settings') || '{}'); } catch (_e) {}
      renderGuardiaBoard(s);
    }
  };
  modoLabel.appendChild(modoCheck);
  modoLabel.appendChild(document.createTextNode(' Modo Guardia'));
  modoCard.appendChild(modoLabel);
  root.appendChild(modoCard);

  // ---- MOBILE LINK ----
  if (isLanElectronDesktop() && isLanHostActive()) {
    var mobileCard = document.createElement('div');
    mobileCard.className = 'lan-connect-card lan-hub-mobile-card';
    mobileCard.innerHTML = '<div class="lan-connect-card-title">Enlace móvil</div>';
    var mobileBtn = document.createElement('button');
    mobileBtn.type = 'button';
    mobileBtn.className = 'btn-lan-primary';
    mobileBtn.style.width = '100%';
    mobileBtn.textContent = 'Copiar enlace para iPad';
    mobileBtn.onclick = function () {
      void generateMobilePairingLink().then(function (url) {
        if (url) {
          copyToClipboardSafe(url);
          runtime.showToast('Enlace móvil copiado. Pégalo en Safari en el iPad.', 'success');
        }
      });
    };
    mobileCard.appendChild(mobileBtn);
    root.appendChild(mobileCard);
  }
}
```

- [ ] **Step 2: Add helper function getClinicalUserUserId and clinicalSessionContext import**

At the top of the file, add an import for clinicalSessionContext (Task 11 handles import wiring). For now, add:

```js
function getClinicalUserUserId() {
  try {
    var user = typeof clinicalSessionContext !== 'undefined' ? clinicalSessionContext.user : null;
    return user ? String(user.user_id || '') : '';
  } catch (_e) {
    return '';
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add public/js/features/lan-sync.mjs
git commit -m "feat: R1 section with team status, Modo Guardia toggle, mobile link button"
```

---

## Task 7: Build R2 section — Solicitar entrega

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Implement buildR2Section**

Replace the `buildR2Section` placeholder with:

```js
function buildR2Section(root) {
  // R2 gets the same as R1 plus "Solicitar entrega"
  buildR1Section(root);

  var userId = String(getClinicalUserUserId());
  var teams = clinicalSessionContext.teams || [];
  var myTeam = teams.find(function (t) {
    return (t.members || []).some(function (m) {
      return String(m.user_id) === userId;
    });
  });

  if (!myTeam) return;

  // "Solicitar entrega" — show patients handed off by R1s in the team
  var entregaCard = document.createElement('div');
  entregaCard.className = 'lan-connect-card lan-hub-entrega-card';
  entregaCard.innerHTML = '<div class="lan-connect-card-title">Solicitar entrega</div>';

  var guardiasForTeam = (clinicalSessionContext.guardias || []).filter(function (g) {
    return g && String(g.source_team_id) === String(myTeam.team_id);
  });

  if (!guardiasForTeam.length) {
    var emptyHint = document.createElement('p');
    emptyHint.className = 'lan-connect-card-hint';
    emptyHint.textContent = 'No hay pacientes entregados por tu equipo.';
    entregaCard.appendChild(emptyHint);
  } else {
    var entregaList = document.createElement('ul');
    entregaList.style.listStyle = 'none';
    entregaList.style.padding = '0';
    entregaList.style.margin = '0';
    guardiasForTeam.forEach(function (g) {
      var li = document.createElement('li');
      li.style.marginBottom = '6px';
      li.style.fontSize = '12px';
      li.textContent = 'Paciente ' + String(g.patient_id || '').slice(0, 8) + '… — ' + (g.covering_user_id || '');
      entregaList.appendChild(li);
    });
    entregaCard.appendChild(entregaList);
  }

  root.appendChild(entregaCard);
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/features/lan-sync.mjs
git commit -m "feat: R2 section with Solicitar entrega (team guardia list)"
```

---

## Task 8: Build R4/Admin section — team creation, census, mobile link

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Implement buildR4Section**

Replace the `buildR4Section` placeholder with:

```js
function buildR4Section(root) {
  // ---- TEAM CREATION ----
  var teamCard = document.createElement('div');
  teamCard.className = 'lan-connect-card lan-hub-team-create-card';
  teamCard.innerHTML = '<div class="lan-connect-card-title">Crear equipos del mes</div>';

  var btnCreate = document.createElement('button');
  btnCreate.type = 'button';
  btnCreate.className = 'btn-lan-primary';
  btnCreate.style.width = '100%';
  btnCreate.textContent = 'Crear equipos del mes';
  btnCreate.onclick = function () {
    openR4TeamCreationModal();
  };
  teamCard.appendChild(btnCreate);
  root.appendChild(teamCard);

  // ---- CENSUS VIEW ----
  var censusCard = document.createElement('div');
  censusCard.className = 'lan-connect-card lan-hub-census-card';
  censusCard.innerHTML = '<div class="lan-connect-card-title">Vista censo</div>';

  var allGuardias = clinicalSessionContext.guardias || [];
  var teams = clinicalSessionContext.teams || [];

  var salas = ['Sala 1', 'Sala 2', 'Sala E'];
  salas.forEach(function (salaName) {
    var salaTeams = teams.filter(function (t) {
      return String(t.sala || '') === salaName;
    });
    var salaGuardias = allGuardias.filter(function (g) {
      return salaTeams.some(function (t) {
        return String(t.team_id) === String(g.source_team_id);
      });
    });

    var row = document.createElement('p');
    row.className = 'lan-connect-card-hint';
    row.style.marginBottom = '4px';
    row.textContent = salaName + ': ' + salaTeams.length + ' equipos, ' + salaGuardias.length + ' en guardia';
    censusCard.appendChild(row);
  });

  if (!allGuardias.length) {
    var emptyCensus = document.createElement('p');
    emptyCensus.className = 'lan-connect-card-hint';
    emptyCensus.textContent = 'No hay guardias activas.';
    censusCard.appendChild(emptyCensus);
  }

  root.appendChild(censusCard);

  // ---- MOBILE LINK ----
  if (isLanElectronDesktop() && isLanHostActive()) {
    var mobileCard = document.createElement('div');
    mobileCard.className = 'lan-connect-card lan-hub-mobile-card';
    mobileCard.innerHTML = '<div class="lan-connect-card-title">Enlace móvil</div>';
    var mobileBtn = document.createElement('button');
    mobileBtn.type = 'button';
    mobileBtn.className = 'btn-lan-primary';
    mobileBtn.style.width = '100%';
    mobileBtn.textContent = 'Copiar enlace para iPad';
    mobileBtn.onclick = function () {
      void generateMobilePairingLink().then(function (url) {
        if (url) {
          copyToClipboardSafe(url);
          runtime.showToast('Enlace móvil copiado. Pégalo en Safari en el iPad.', 'success');
        }
      });
    };
    mobileCard.appendChild(mobileBtn);
    root.appendChild(mobileCard);
  }

  // ---- ROTATION CONTROL ----
  var rotCard = document.createElement('div');
  rotCard.className = 'lan-connect-card lan-hub-rotation-card';
  rotCard.innerHTML = '<div class="lan-connect-card-title">Rotación</div>';
  var btnFinalizar = document.createElement('button');
  btnFinalizar.type = 'button';
  btnFinalizar.className = 'btn-lan-secondary';
  btnFinalizar.style.width = '100%';
  btnFinalizar.style.color = 'var(--danger)';
  btnFinalizar.textContent = 'Finalizar rotación (archivar equipos)';
  btnFinalizar.onclick = function () {
    void handleFinalizarRotacion();
  };
  rotCard.appendChild(btnFinalizar);
  root.appendChild(rotCard);
}
```

- [ ] **Step 2: Add helper functions**

Add before the `buildR4Section` definition:

```js
function openR4TeamCreationModal() {
  // Opens the existing "Crear equipos del mes" modal inline or uses the clinical-teams panel
  if (typeof openClinicalTeamsPanel === 'function') {
    openClinicalTeamsPanel();
  } else {
    runtime.showToast('Panel de equipos no disponible.', 'error');
  }
}

async function handleFinalizarRotacion() {
  var api = typeof window !== 'undefined' ? (window.rplusDb || window.electronAPI) : null;
  if (!api || typeof api.dbRotationArchive !== 'function') {
    runtime.showToast('Operación no disponible.', 'error');
    return;
  }
  var res = await api.dbRotationArchive();
  if (res && res.ok) {
    runtime.showToast('Rotación finalizada. Crea nuevos equipos para el siguiente mes.', 'success');
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    renderLanPanel();
  } else {
    runtime.showToast(res?.error || 'No se pudo finalizar la rotación.', 'error');
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add public/js/features/lan-sync.mjs
git commit -m "feat: R4/Admin section with team creation, census, mobile link, rotation finalize"
```

---

## Task 9: Team joining UI — available teams list for R1/R2

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Add available teams list rendering**

Add to `buildR1Section` (inside the "Sin equipo" branch). When clicking "Unirse a un equipo", show available teams for the user's Sala. Add after the `myTeam` check block:

Replace the `// join-team click handler will be wired in Task 9` comment area with actual implementation.

Add this new function:

```js
function buildAvailableTeamsSection(root, userSala) {
  var teams = clinicalSessionContext.teams || [];
  var available = teams.filter(function (t) {
    return String(t.sala || '') === userSala && !t.archived_at;
  });

  if (!available.length) {
    var empty = document.createElement('p');
    empty.className = 'lan-connect-card-hint';
    empty.textContent = 'No hay equipos disponibles en tu Sala.';
    root.appendChild(empty);
    return;
  }

  var list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';
  available.forEach(function (t) {
    var li = document.createElement('li');
    li.style.display = 'flex';
    li.style.gap = '8px';
    li.style.alignItems = 'center';
    li.style.marginBottom = '6px';

    var info = document.createElement('span');
    info.style.flex = '1';
    info.style.fontSize = '12px';
    info.textContent = (t.name || 'Equipo') + ' · ' + (t.service || '') + ' · día ' + (t.on_call_day_index || 0);

    var joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.className = 'btn-lan-secondary';
    joinBtn.style.flex = '0 0 auto';
    joinBtn.textContent = 'Unirse';
    joinBtn.onclick = function () {
      void joinClinicalTeam(String(t.team_id));
    };

    li.appendChild(info);
    li.appendChild(joinBtn);
    list.appendChild(li);
  });
  root.appendChild(list);
}

async function joinClinicalTeam(teamId) {
  var api = typeof window !== 'undefined' ? (window.rplusDb || window.electronAPI) : null;
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    runtime.showToast('Base de datos no disponible.', 'error');
    return;
  }
  var userId = getClinicalUserUserId();
  if (!userId) {
    runtime.showToast('No hay sesión clínica activa.', 'error');
    return;
  }

  var addRes = await api.dbClinicalTeamsMemberAdd({ teamId: teamId, userId: userId });
  if (!addRes || addRes.ok === false) {
    runtime.showToast(addRes?.error || 'No se pudo unir al equipo.', 'error');
    return;
  }

  // R2 auto-promotion: if the joining user is R2, promote them to leader
  var rank = getClinicalRank();
  if (rank === 'R2' && api && typeof api.dbClinicalTeamsPromoteLeader === 'function') {
    await api.dbClinicalTeamsPromoteLeader({ teamId: teamId, userId: userId });
  }

  runtime.showToast('Unido al equipo.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await refreshClinicalSessionTeams();
  renderLanPanel();
}

async function refreshClinicalSessionTeams() {
  var api = typeof window !== 'undefined' ? (window.rplusDb || window.electronAPI) : null;
  if (!api || typeof api.dbClinicalScopeContext !== 'function') return;
  var userId = getClinicalUserUserId();
  var res = await api.dbClinicalScopeContext({ userId: userId });
  if (res && res.ok && Array.isArray(res.context?.teams)) {
    clinicalSessionContext.teams = res.context.teams;
  }
}
```

Update the `buildR1Section` "Sin equipo" branch to use a click handler:

```js
// Change the Sin equipo line to:
noTeam.innerHTML = 'Sin equipo — <button type="button" class="lan-hub-link-btn" id="lan-hub-join-team">Unirse a un equipo</button>';

// After appending the team card, wire the button:
root.appendChild(card);
var joinTeamBtn = card.querySelector('#lan-hub-join-team');
if (joinTeamBtn) {
  joinTeamBtn.onclick = function () {
    var availCard = document.getElementById('lan-hub-available-teams');
    if (availCard) {
      availCard.remove();
      return;
    }
    var avail = document.createElement('div');
    avail.id = 'lan-hub-available-teams';
    avail.className = 'lan-connect-card';
    avail.innerHTML = '<div class="lan-connect-card-title">Equipos disponibles</div>';
    buildAvailableTeamsSection(avail, userSala);
    card.parentNode.insertBefore(avail, card.nextSibling);
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/features/lan-sync.mjs
git commit -m "feat: team joining UI for R1/R2 with available teams list and R2 auto-promotion"
```

---

## Task 10: Patient auto-assignment on creation

**Files:**
- Modify: `public/js/features/patients.mjs`

- [ ] **Step 1: Add import for auto-assignment DB call**

At the top of `patients.mjs`, add:

```js
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
```

- [ ] **Step 2: Add auto-assignment call in commitPatient**

In `commitPatient` (line 1472), after the patient is pushed and before `saveState()`, add:

```js
  // Auto-assign patient to user's team
  try {
    var api = typeof window !== 'undefined' ? (window.rplusDb || window.electronAPI) : null;
    var user = clinicalSessionContext && clinicalSessionContext.user;
    if (api && user && user.user_id && typeof api.dbClinicalFindUserTeam === 'function') {
      var teamRes = await api.dbClinicalFindUserTeam({ userId: String(user.user_id) });
      if (teamRes && teamRes.ok && teamRes.teamId) {
        await api.dbClinicalAssignPatientToTeam({
          patientId: patient.id,
          teamId: teamRes.teamId,
          effectiveAt: new Date().toISOString(),
        });
      }
    }
  } catch (_eAutoAssign) {
    // non-fatal
  }
```

Place this after line 1525 (`patients.push(patient);`) and before line 1526 (`saveState();`).

Note: Since `commitPatient` is not async, wrap the auto-assignment in a non-blocking IIFE:

```js
  patients.push(patient);

  // Auto-assign to team (non-blocking)
  (function () {
    try {
      var _api = typeof window !== 'undefined' ? (window.rplusDb || window.electronAPI) : null;
      var _user = clinicalSessionContext && clinicalSessionContext.user;
      if (_api && _user && _user.user_id && typeof _api.dbClinicalFindUserTeam === 'function') {
        void _api.dbClinicalFindUserTeam({ userId: String(_user.user_id) }).then(function (teamRes) {
          if (teamRes && teamRes.ok && teamRes.teamId) {
            return _api.dbClinicalAssignPatientToTeam({
              patientId: patient.id,
              teamId: teamRes.teamId,
              effectiveAt: new Date().toISOString(),
            });
          }
        }).catch(function () {});
      }
    } catch (_e) {}
  })();

  saveState();
```

- [ ] **Step 3: Wire IPC handler for dbClinicalAssignPatientToTeam**

Find the IPC handler file (same as Task 3) and add:

```js
// Handler for dbClinicalAssignPatientToTeam
ipcMain.handle('db:clinical-assign-patient-to-team', async (_event, opts) => {
  const db = getDb();
  try {
    assignPatientToTeam(db, {
      patientId: opts.patientId,
      teamId: opts.teamId,
      effectiveAt: opts.effectiveAt,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
```

And add `dbClinicalFindUserTeam` handler:

```js
// Handler for dbClinicalFindUserTeam
ipcMain.handle('db:clinical-find-user-team', async (_event, { userId }) => {
  const db = getDb();
  try {
    const row = findUserTeamForAutoAssign(db, userId);
    return { ok: true, teamId: row ? row.team_id : null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
```

Also expose via preload.
- [ ] **Step 4: Commit**

```bash
git add public/js/features/patients.mjs <ipc-handler-file> <preload-file>
git commit -m "feat: auto-assign patient to team on creation"
```

---

## Task 11: Mobile pairing link with pre-filled credentials

**Files:**
- Modify: `public/js/features/lan-sync.mjs`
- Modify: `public/js/features/clinical-registration.mjs`

- [ ] **Step 1: Add generateMobilePairingLink function**

In `lan-sync.mjs`, add:

```js
async function generateMobilePairingLink() {
  var hostUrl = lanClient.baseUrl();
  if (!hostUrl) return '';
  var teamCode = getLanTeamCodeFromConfig();
  if (!teamCode) return '';

  var s = getClinicalSettings();
  var params = new URLSearchParams();
  params.set('host', hostUrl.replace(/\/+$/, ''));
  params.set('code', teamCode);

  // Pre-fill clinical registration
  if (s.clinicalDisplayName) params.set('name', s.clinicalDisplayName);
  if (s.clinicalRank) params.set('rank', s.clinicalRank);
  if (s.clinicalSala) params.set('sala', s.clinicalSala);

  return hostUrl + '/?' + params.toString();
}
```

- [ ] **Step 2: Support pre-fill from URL params in clinical-registration.mjs**

In `public/js/features/clinical-registration.mjs`, add a function and call it in `promptClinicalRegistrationIfNeeded`:

Add after imports:

```js
/**
 * Pre-fill registration form from URL query params (mobile pairing link).
 */
export function prefillRegistrationFromUrlParams() {
  if (typeof window === 'undefined') return;
  var params = new URLSearchParams(window.location.search);
  var name = params.get('name') || '';
  var rank = params.get('rank') || '';
  var sala = params.get('sala') || '';
  if (!name && !rank && !sala) return;

  var nameInput = document.getElementById('clinical-reg-name');
  var rankSelect = document.getElementById('clinical-reg-rank');
  var salaSelect = document.getElementById('clinical-reg-sala');

  if (nameInput && name) nameInput.value = name;
  if (rankSelect && rank) rankSelect.value = rank;
  if (salaSelect && sala) salaSelect.value = sala;
}
```

In `promptClinicalRegistrationIfNeeded`, call it after `wireRegistrationFormOnce()`:

```js
export function promptClinicalRegistrationIfNeeded(settings) {
  if (!needsClinicalRegistration(settings)) return Promise.resolve(false);
  wireRegistrationFormOnce();
  prefillRegistrationFromUrlParams();  // <-- add this
  // ... rest stays the same
```

- [ ] **Step 3: Auto-connect from URL params on page load**

In `promptClinicalRegistrationIfNeeded`, also handle auto-connection: if the URL has `host` and `code` params, auto-configure the LAN client after registration is complete. Add this after form submission callback in `wireRegistrationFormOnce`:

```js
    // After closeClinicalRegistrationModal() and before pendingResolve:
    // Auto-connect to LAN host from URL params
    var params = new URLSearchParams(window.location.search);
    var host = params.get('host') || '';
    var code = params.get('code') || '';
    if (host && code) {
      try {
        persistLanClientConfig(host, code);  // this function needs to be accessible
      } catch (_e) {}
    }
```

Since `persistLanClientConfig` is in `lan-sync.mjs`, import it. Add at top of `clinical-registration.mjs`:

```js
import { persistLanClientConfig } from './lan-sync.mjs';
```

And export `persistLanClientConfig` from `lan-sync.mjs` (currently it's module-private). Change its declaration in `lan-sync.mjs`:

```js
export function persistLanClientConfig(hostUrl, teamCode) {
```

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lan-sync.mjs public/js/features/clinical-registration.mjs
git commit -m "feat: mobile pairing link with pre-filled clinical credentials"
```

---

## Task 12: Auto-discovery network scanner for LAN hosts

**Files:**
- Modify: `public/js/features/lan-sync.mjs`

- [ ] **Step 1: Add Wi-Fi LAN scanner function**

Add to `lan-sync.mjs`:

```js
var _lanScanTimer = null;
var LAN_SCAN_INTERVAL_MS = 5000;

function startLanAutoDiscovery() {
  if (_lanScanTimer) return;
  _lanScanTimer = setInterval(function () {
    void scanLanHosts();
  }, LAN_SCAN_INTERVAL_MS);
  void scanLanHosts();
}

function stopLanAutoDiscovery() {
  if (_lanScanTimer) {
    clearInterval(_lanScanTimer);
    _lanScanTimer = null;
  }
}

async function scanLanHosts() {
  if (!isLanElectronDesktop()) return;
  if (isLanRemoteJoinMode()) return;

  // Use the existing lan-surrogate-host ping mechanism to discover hosts
  // on the local network. We scan known peers and common IPs.
  var teamCode = getLanTeamCodeFromConfig();
  if (!teamCode) return;

  // Check if there's a higher-rank host that should supersede us
  try {
    var peers = listLivePeerHostUrls(getLanClientId());
    var currentRank = getClinicalRank();

    for (var i = 0; i < peers.length; i += 1) {
      var peerUrl = peers[i];
      if (!peerUrl) continue;
      var alive = await pingLanHostUrl(peerUrl, teamCode);
      if (!alive) continue;

      // Determine peer's rank via a lightweight endpoint
      try {
        var resp = await fetch(peerUrl + '/api/lan/v1/host-rank', {
          headers: { 'Authorization': 'Bearer ' + teamCode },
          signal: AbortSignal.timeout(3000),
        });
        if (resp.ok) {
          var data = await resp.json();
          var peerRank = String(data.rank || '').trim();
          if (shouldSupersede(peerRank, currentRank)) {
            // This peer outranks us — switch to client mode
            if (isLanElectronDesktop()) {
              applyLanHostUrlSwitch(peerUrl, teamCode, { skipRememberPrimary: true });
              runtime.showToast('Un host de mayor rango (' + peerRank + ') está activo. Conectando como cliente.', 'info');
              renderLanPanel();
              return;
            }
          }
        }
      } catch (_peerErr) {
        // peer not reachable, skip
      }
    }
  } catch (_scanErr) {
    // scan errors are non-fatal
  }
}

function shouldSupersede(peerRank, myRank) {
  var priority = { Admin: 5, R4: 4, R3: 3, R2: 2, R1: 1 };
  return (priority[peerRank] || 0) > (priority[myRank] || 0);
}
```

- [ ] **Step 2: Initialize auto-discovery on startup**

In the module-level initialization (after `initLanClientFromStorage()`), add:

```js
if (typeof document !== 'undefined' && isLanElectronDesktop()) {
  startLanAutoDiscovery();
}
```

- [ ] **Step 3: Stop auto-discovery on page unload**

```js
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', function () {
    if (activeLiveSyncRoomId) saveLocalRoomSnapshot(activeLiveSyncRoomId);
    stopLanAutoDiscovery();
  });
}
```

(Update the existing `beforeunload` handler near line 2452)

- [ ] **Step 4: Add lightweight host-rank API endpoint**

In the LAN server code (find the API routes file), add:

```
GET /api/lan/v1/host-rank → returns { rank: 'R4' } from the user's clinical settings
```

This is in the Electron main process. Find the LAN API route registration and add:

```js
// In the LAN API router:
router.get('/api/lan/v1/host-rank', authMiddleware, (req, res) => {
  // Returns the clinical rank of the host user
  const rank = getClinicalRankFromSettings(); // reads from stored settings
  res.json({ rank: rank || 'R1' });
});
```

The implementation of `getClinicalRankFromSettings()` should read from the same `rpc-settings` storage that the renderer uses, typically via the main process storage module.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/lan-sync.mjs <lan-api-file>
git commit -m "feat: auto-discovery LAN scanner with rank-based host priority"
```

---

## Task 13: Header dropdown title update

**Files:**
- Modify: `public/partials/chrome/header.html`

- [ ] **Step 1: Change dropdown title**

In `header.html`, change the dropdown title from "Sala en vivo del equipo" to "Conexión guardia":

```html
<!-- line 33 -->
<div class="connection-dropdown-head-title">Conexión guardia</div>
```

And update the subtitle (line 34) to:

```html
<p class="connection-dropdown-head-sub">Red local del hospital. Conéctate a la sala de guardia y administra tu equipo.</p>
```

- [ ] **Step 2: Commit**

```bash
git add public/partials/chrome/header.html
git commit -m "feat: update dropdown title to 'Conexión guardia'"
```

---

## Task 14: CSS updates for new LAN hub styles

**Files:**
- Modify: `public/styles/settings.css`

- [ ] **Step 1: Add new CSS classes**

At the end of `settings.css` (or after existing LAN styles around line 185-200), add:

```css
/* ── Guardia LAN Hub ──────────────────────────── */
.lan-hub-status-card {
  padding: 10px 14px !important;
  margin-bottom: 10px;
}

.lan-hub-status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.lan-hub-status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.lan-hub-status-dot--online {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.lan-hub-status-dot--offline {
  background: #9ca3af;
  box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.15);
}

.lan-hub-team-card,
.lan-hub-modo-card,
.lan-hub-mobile-card,
.lan-hub-census-card,
.lan-hub-rotation-card,
.lan-hub-team-create-card,
.lan-hub-entrega-card {
  margin-bottom: 10px;
}

.lan-hub-team-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px;
}

.lan-hub-link-btn {
  background: none;
  border: none;
  color: var(--action);
  font-size: inherit;
  font-family: inherit;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.lan-hub-link-btn:hover {
  color: var(--action-hover);
}

.lan-hub-modo-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}

.lan-hub-guardia-check {
  width: 18px;
  height: 18px;
  accent-color: var(--action);
}

/* Remove leftover migration/pairing elements */
.lan-connect-other-mac,
.lan-connect-back-to-local,
.lan-disconnect-banner-pref {
  display: none !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/styles/settings.css
git commit -m "style: add Guardia LAN Hub CSS (status dot, team cards, mode toggle)"
```

---

## Task 15: Integration wiring — imports, exports, and runtime

**Files:**
- Modify: `public/js/features/lan-sync.mjs`
- Modify: `public/js/features/clinical-teams.mjs`

- [ ] **Step 1: Ensure clinicalSessionContext is accessible in lan-sync.mjs**

`lan-sync.mjs` uses `clinicalSessionContext` in `buildR1Section`, `buildR2Section`, `buildR4Section`. Since `clinicalSessionContext` is defined in `clinical-access-runtime.mjs`, we need to import it. However, `lan-sync.mjs` already imports `{ guardAndSignLiveSyncMutation } from "../clinical-access-runtime.mjs"`. Add `clinicalSessionContext` to that import:

```js
// Top of lan-sync.mjs, modify the import from clinical-access-runtime
import {
  guardAndSignLiveSyncMutation,
  clinicalSessionContext,
} from "../clinical-access-runtime.mjs";
```

- [ ] **Step 2: Export persistLanClientConfig**

In `lan-sync.mjs`, change line 212 from:

```js
function persistLanClientConfig(hostUrl, teamCode) {
```

to:

```js
export function persistLanClientConfig(hostUrl, teamCode) {
```

- [ ] **Step 3: Add clinicalSessionContext.guardiaMode initialization**

In `clinical-access-runtime.mjs`, in `clinicalSessionContext`, the `guardiaMode` property is already present at line 22. No change needed.

- [ ] **Step 4: Verify all imports resolve**

Run a build or check for import errors:

```bash
# If there's a build step:
npm run build 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add public/js/features/lan-sync.mjs public/js/features/clinical-teams.mjs
git commit -m "fix: wire clinicalSessionContext import and export persistLanClientConfig"
```

---

## Task 16: Final verification and cleanup

**Files:**
- (No new files — verification only)

- [ ] **Step 1: Start the app and verify the dropdown renders correctly for each rank**

Set `clinicalRank` in `rpc-settings` localStorage to R1, R2, R4, Admin, and verify each renders the correct sections. Check unregistered state.

- [ ] **Step 2: Verify Sala rooms join/leave still works**

Click "Unirse" on a Sala, verify it connects. Click "En sala" to confirm it shows as joined. Leave the room, verify button reverts.

- [ ] **Step 3: Verify team creation and joining**

As R4, create a team. As R1 in the same Sala, join the team. Verify R2 auto-promotion.

- [ ] **Step 4: Verify patient auto-assignment**

As a team member, create a new patient. Check that `patient_team_assignment` table has a row linking the patient to the team.

- [ ] **Step 5: Verify mobile link generation**

As desktop host, click "Copiar enlace para iPad". Open the link on another device. Verify it auto-connects and pre-fills the registration form.

- [ ] **Step 6: Run any existing tests**

```bash
npm test 2>&1 | tail -20
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup for Guardia LAN Hub"
```

---
