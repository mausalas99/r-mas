# Guardia LAN Hub — Design Spec

**Date:** 2026-06-01
**Status:** Draft
**Dependencies:** sala-based-lan-rooms (already implemented)

## Overview

Replace the current LAN connection dropdown with a rank-contextual "Guardia LAN Hub" that consolidates Sala room selection, team joining/creation, handoff mode entry, census monitoring, and mobile pairing into a single panel. The decentralized LAN model stays; auto-discovery replaces manual IP entry. Teams follow a monthly rotation lifecycle managed by R4/Admin.

---

## 1. LAN Connection (Decentralized + Auto-Discovery)

**Current behavior:** User manually enters a host IP or paste an invite link. Pairing/PIN buttons generate share codes.

**New behavior:**

- On startup and on opening the dropdown, R+ scans the local Wi‑Fi network for an active LAN host.
- If a host is found: auto-connects. Status shows "Conectado a la red del hospital."
- If no host is found: status shows "Sin red — buscando…" with a "Convertirse en host" button available to any registered user.
- **Host priority:** Higher-rank users take precedence. If an Admin comes online after an R1 is hosting, the Admin's host supersedes and the R1's host stops. Priority: Admin > R4 > R3 > R2 > R1.
- Every host uses the same team code (from `lan-team-code.txt` or `R_PLUS_LAN_TEAM_CODE` env var) as the shared secret gate.
- No manual IP input, no invite-link-paste for LAN joining. Those inputs are removed from the dropdown.

**No changes to:** LAN server protocol, WebSocket relay, live-sync engine, IPC handlers, DB layer.

---

## 2. Dropdown UX by Rank

The header button toggles a dropdown panel titled **"Conexión guardia"** (replacing "Sala en vivo del equipo"). Content varies by rank.

### 2.1 Top section (all ranks)

**LAN status line:** "Conectado a la red del hospital" or "Sin red — buscando…"

**Sala rooms card** (already implemented in `sala-based-lan-rooms`):
- Sala 1, Sala 2, Sala E with join/leave buttons
- Filtered by `clinicalSala` from `rpc-settings`
- R4/Admin see all 3; R1-R3 see their assigned Sala only

### 2.2 R1 view

- Sala rooms card (their Sala only)
- Team status: "Mi equipo: [team name]" or "Sin equipo — [Unirse a un equipo]" link
- "Modo Guardia" toggle — enters/exits handoff mode
- Mobile link generator (if on desktop and connected to LAN)

### 2.3 R2 view

- Same as R1, plus:
- "Solicitar entrega" — list of patients handed off to them by R1s in their team

### 2.4 R4 / Admin view

- Sala rooms card (all 3 Salas)
- "Crear equipos del mes" — opens team creation flow
- "Vista censo" — condensed census summary across all Salas
- Mobile link generator

### 2.5 Unregistered view (no `clinicalSala`, no `clinicalRank`)

- Prompt: "Completa el Registro de guardia para acceder a la red del hospital."

### 2.6 What is removed from the dropdown

- IP / host URL input ("Dirección en la red")
- Invite link textarea for LAN joining
- "Generar enlace / PIN" button
- "Copiar enlace de invitación" / "Copiar enlace móvil" buttons (replaced by single mobile pairing link)
- "Activar y copiar invitación" button
- "Unirse con enlace" button
- Join-other-Mac collapsible section
- Known sessions section (saved room sessions from localStorage)
- LAN pairing/PIN display (`#lan-pairing-display`)
- Conflict drafts section (removed)
- Disconnect banner preference (removed)
- Back-to-local-host section (no longer needed with auto-discovery)

---

## 3. Team Lifecycle & Monthly Rotation

### 3.1 R4 / Admin creates teams

- Via "Crear equipos del mes" in the dropdown (R4/Admin only)
- Opens a form (inline or modal):
  - Sala (Sala 1, Sala 2, Sala E)
  - Service (Sala, Interconsulta, Eme, Torre HU, UX, Area A)
  - Cycle day (1-31)
  - Team name
  - Expected member count (optional)
  - Pre-assign members by username (optional)
- On submit: team is created in the DB (via existing `dbClinicalTeamsCreate`) and marked as "open for joining"
- Team is visible to users in that Sala as "Disponible para unirse"

### 3.2 R1 / R2 joining a team

- In the dropdown, R1/R2 sees available teams for their Sala
- Clicking "Unirse" adds them to the team (via existing `dbClinicalTeamsMemberAdd`)
- **R1 creates a team:** If an R1 creates a team (via "Mi rotación"), they become the team leader. Only that leader can add/remove members. Save team leader property in DB.
- **R2 joins a team:** When an R2 joins a team, the R2 outranks any R1 leader. R2 gets admin authority over the team.
- One team per user per active rotation (enforced at join time).
- Users can leave a team during the month (except if they have active guardias).

### 3.3 Monthly handover

- R4 clicks "Finalizar rotación" at month end.
- Current teams are archived (marked `inactive` or `archived_at` set).
- Patient assignments carry forward as read-only for the preview window (existing `fetchIncomingAssignments` behavior).
- R4 starts the next rotation by creating new teams.

**No changes to:** `clinical-teams.mjs` modal structure, `clinical-access-db.mjs` core queries, IPC handler signatures. Extended where needed.

---

## 4. Patient Auto-Assignment

**Current behavior:** Patients are assigned to teams either via Explicit handoff (`active_guardias`) or planned rotation assignment (`patient_team_assignment`).

**New behavior:** When a user who is a member of a team creates a patient, that patient is automatically assigned to the user's current team via `patient_team_assignment`. The `effective_at` timestamp is set to `now`. This makes the patient visible to all team members through the existing `evaluateClinicalScope` flow (which already checks `patient_team_assignment` for team membership).

**No changes to:** `evaluateClinicalScope`, `active_guardias`, handoff flow. Only the patient creation path gains an auto-assignment step.

---

## 5. Mobile Pairing (iPad Link)

**Current behavior:** Invite links encode the LAN host URL and team code. Pairing/PIN is a separate flow.

**New behavior:**

- A single "Enlace móvil" button (available when the user is a desktop host connected to the LAN) generates a URL that encodes:
  - LAN host address + team code (so mobile auto-connects to the hospital network)
  - User's `clinicalName`, `clinicalRank`, and `clinicalSala` (pre-fills clinical registration)
  - The user's `user_id` (mobile registers as the same identity, not a separate one)
- Tapping the link on an iPad/mobile:
  1. Opens R+ mobile
  2. Auto-connects to the LAN host
  3. Pre-fills clinical registration with the desktop user's identity
  4. User confirms → connected as the same user with full guardia access

**No changes to:** User identity model, auth system, DB user records. Mobile uses the same `user_id` and shares clinical ops sync.

---

## 6. What Stays (Unchanged)

- LAN server protocol (WebSocket relay, live-sync engine)
- Team code file (`lan-team-code.txt`) and env var (`R_PLUS_LAN_TEAM_CODE`)
- `lan-squad/` backend (host-store, effective-team-code, team-code)
- `joinLanRoom()`, `activeLiveSyncRoomId`, live-sync connection lifecycle
- `clinical-teams.mjs` modal ("Mi rotación") for detailed team member management
- `clinical-registration.mjs` ("Registro de guardia") for first-run identity setup
- `clinical-access-db.mjs` core DB operations
- `evaluateClinicalScope` and guardia board rendering
- All IPC handler signatures
- `patchLanPanelJoinButtons()`

---

## 7. Files Touched

| File | Change |
|------|--------|
| `public/js/features/lan-sync.mjs` | Major — replace `renderLanPanelOnce()` dropdown content, add rank-contextual sections, auto-discovery logic, host priority |
| `public/js/features/clinical-teams.mjs` | Moderate — add team leader tracking, R2 auto-promotion on join |
| `public/js/features/clinical-access-runtime.mjs` | Light — add auto-assign on patient creation |
| `public/js/features/clinical-registration.mjs` | Light — support mobile pre-fill from URL params |
| `public/styles/settings.css` | Light — new styles for rank sections, status bar |
| `public/partials/chrome/header.html` | Light — update dropdown title, remove unused elements |
| `lib/db/clinical-access-db.mjs` | Light — add team leader column, active rotation flag |
| `lib/db/schema.mjs` | Light — `teams` table: add `leader_user_id`, `rotation_active` columns |

---

## 8. Out of Scope

- Changing how `evaluateClinicalScope` determines patient visibility
- Modifying the handoff (Entrega) flow
- Changing the guardia board rendering
- Replacing `lan-squad/` with a new LAN protocol
- Multi-hospital LAN support (single hospital per team code)
- Offline mode for mobile (requires network connection)
