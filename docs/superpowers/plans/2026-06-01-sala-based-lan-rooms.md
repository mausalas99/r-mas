# Sala-Based LAN Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the arbitrary "Salas en vivo" room card in the LAN dropdown with a fixed Sala-based system (Sala 1/2/E) where R1-R3 users see only their assigned Sala and R4/Admin see all 3.

**Architecture:** Modify `renderLanPanelOnce()` in `lan-sync.mjs` to remove the `GET /api/lan/v1/rooms` fetch and the dynamic room card, replacing them with a static Sala rooms card driven by `localStorage['rpc-settings']` (clinicalRank, clinicalSala). Room joining uses the existing `joinLanRoom()` with sala room IDs.

**Tech Stack:** Vanilla JS DOM manipulation (existing pattern), no new dependencies.

---

### Task 1: Remove server room fetch and create-room action

**Files:**
- Modify: `public/js/features/lan-sync.mjs:2666-2690` (rooms fetch block)
- Modify: `public/js/features/lan-sync.mjs:750-752` (create-room action in event delegation)

- [ ] **Step 1: Remove the rooms fetch block**

In `renderLanPanelOnce()`, remove the entire `roomsFetch` declaration and fetch try/catch block. Delete lines 2667 through 2690:

```javascript
  // DELETE these lines (2667-2690):
  // var roomsFetch = { ok: false, rooms: [], httpStatus: 0, errorDetail: '', networkError: false };
  // try {
  //   var respRooms = await lanFetchAuthed('/api/lan/v1/rooms');
  //   ... (entire try/catch block through line 2690)
```

After removal, the code should flow directly from:
```
  await ensureLanClientTeamCodeAligned();
```
to:
```
  if (lanPanelRenderStale(gen)) return;
```

Actually the flow simplifies since there's no fetch. Remove both:
- The `var roomsFetch = ...` declaration
- The entire `try { var respRooms = await lanFetchAuthed... } catch...` block

The `await ensureLanClientTeamCodeAligned();` line should be followed directly by:
```javascript
  if (lanPanelRenderStale(gen)) return;
  root.innerHTML = '';
```

- [ ] **Step 2: Remove the create-room action from event delegation**

Remove lines 750-752 in `wireLanPanelDelegation()`:

Delete:
```javascript
    } else if (action === 'create-room') {
      createLanRoomFromUi();
```

- [ ] **Step 3: Verify the edit**

Run `node scripts/bundle-renderer.mjs` to confirm the bundle compiles without syntax errors.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lan-sync.mjs public/js/app.bundle.mjs
git commit -m "feat: remove server room fetch and create-room action from LAN panel"
```

---

### Task 2: Replace rooms card with Sala-based card

**Files:**
- Modify: `public/js/features/lan-sync.mjs:2787-2917` (rooms card rendering)

- [ ] **Step 1: Remove the old rooms card code**

Delete lines 2787 through 2917 (the entire `roomsCard` block including the create input, network error, HTTP error, empty state, and dynamic room list).

This is everything from:
```javascript
  var roomsCard = document.createElement('div');
  roomsCard.className = 'lan-connect-card lan-rooms-panel';
```
through:
```javascript
  patchLanPanelJoinButtons();
}
```

But keep the closing `}` of `renderLanPanelOnce()`. The deleted section is lines 2787-2917 in the current file.

- [ ] **Step 2: Add the Sala-based rooms card code**

Insert the following code immediately after `void maybeShowLanMigrationNotice();` (currently around line 2785) — **before** where the old rooms card was:

```javascript
  var s = {};
  try {
    s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_se) {}

  var rank = String(s.clinicalRank || '').trim();
  var userSala = String(s.clinicalSala || '').trim();
  var isElevated = rank === 'Admin' || rank === 'R4';

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
    if (!visibleSalaDefs.length) {
      visibleSalaDefs = salaDefs;
    }
  } else {
    visibleSalaDefs = [];
  }

  var roomsCard = document.createElement('div');
  roomsCard.className = 'lan-connect-card lan-rooms-panel';
  var roomsTitle = document.createElement('div');
  roomsTitle.className = 'lan-connect-card-title';
  roomsTitle.textContent = 'Salas de guardia';
  roomsCard.appendChild(roomsTitle);

  if (!userSala && !isElevated) {
    var noSalaHint = document.createElement('p');
    noSalaHint.className = 'lan-connect-card-hint';
    noSalaHint.innerHTML =
      'Completa el <strong>Registro de guardia</strong> para asignarte una Sala y poder conectarte en vivo.';
    roomsCard.appendChild(noSalaHint);
  } else if (!visibleSalaDefs.length) {
    var emptyHint = document.createElement('p');
    emptyHint.className = 'lan-connect-card-hint';
    emptyHint.textContent = 'No tienes una Sala asignada. Contacta a un R4 o Admin.';
    roomsCard.appendChild(emptyHint);
  } else {
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
```

- [ ] **Step 3: Verify the edit compiles**

Run `node scripts/bundle-renderer.mjs` to confirm the bundle regenerates without errors.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/lan-sync.mjs public/js/app.bundle.mjs
git commit -m "feat: replace dynamic LAN rooms with fixed Sala-based rooms"
```

---

### Task 3: Functional smoke test

- [ ] **Step 1: Start the app**

```bash
npm start
```

- [ ] **Step 2: Verify as R1 user**

Open DevTools console, simulate an R1 user in Sala 1:
```javascript
var s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
s.clinicalRank = 'R1';
s.clinicalSala = 'Sala 1';
s.clinicalRegistered = true;
localStorage.setItem('rpc-settings', JSON.stringify(s));
```
Open the LAN dropdown. Verify: only "Sala 1" appears (single room). Click "Unirse" — verify it triggers `joinLanRoom('sala-1', 'Sala 1')`.

- [ ] **Step 3: Verify as R4 or Admin**

Set rank to R4 or Admin and open the LAN dropdown:
```javascript
var s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
s.clinicalRank = 'Admin';
localStorage.setItem('rpc-settings', JSON.stringify(s));
```
Verify: all 3 Salas appear (Sala 1, Sala 2, Sala E). Each has an "Unirse" button. Verify the "En sala" state toggles correctly for the active room.

- [ ] **Step 4: Verify no-Sala edge case**

Set clinicalSala to empty and rank to R1:
```javascript
var s = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
s.clinicalRank = 'R1';
s.clinicalSala = '';
localStorage.setItem('rpc-settings', JSON.stringify(s));
```
Verify: the Sala rooms card shows a hint to complete registration, no room list.

- [ ] **Step 5: Commit if any fixes were needed**

```bash
git add public/js/features/lan-sync.mjs public/js/app.bundle.mjs
git commit -m "fix: minor corrections from LAN sala rooms smoke test"
```
