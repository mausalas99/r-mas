# Sala-Based LAN Rooms Design

**Date:** 2026-06-01  
**Context:** The LAN dropdown currently shows arbitrary user-created rooms ("Salas en vivo" card). This should be replaced with a fixed set of 3 Sala rooms (Sala 1, Sala 2, Sala E) that are always available. Users sync within their assigned Sala; admins can join any.

## Current State

`public/js/features/lan-sync.mjs` `renderLanPanelOnce()` (line 2787-2917) renders a "Salas en vivo" card when a LAN host is connected:

- Fetches rooms from `GET /api/lan/v1/rooms`
- Room name input + "Crear sala" button
- Room list with display name, "Unirse"/"En sala" toggle, "Eliminar" button
- Error/empty states for network, HTTP errors, no rooms

Rooms are UUID-based, arbitrary, created/deleted by any LAN participant.

## Design

### Room System

Replace arbitrary rooms with 3 fixed Sala rooms. Room identifiers:

| Sala | Room ID |
|------|---------|
| Sala 1 | `sala-1` |
| Sala 2 | `sala-2` |
| Sala E | `sala-e` |

Room IDs use these string constants — no UUIDs, no server-side room CRUD.

### Access Control

- **Regular users (R1-R4):** see only their assigned Sala room (from `clinicalSala` in localStorage `rpc-settings`). A single join/leave button for that room.
- **Admin users:** see all 3 Sala rooms. Can join any of them freely.

### UI Changes

**What to replace** (lines 2787-2917): The entire "Salas en vivo" card.

**What to keep:** Status card, pairing/PIN, invite links, known sessions, join-other-Mac section, conflict drafts, disconnect banner — all unchanged.

**New card behavior:**

- Title: "Salas de guardia"
- Hint: explains that each Sala is a live sync channel
- **Regular user view:** single line showing their Sala name + "Unirse"/"En sala" button
- **Admin user view:** 3 lines, one per Sala, each with a "Unirse"/"En sala" button
- No create input, no delete button
- No server fetch needed — rooms are local constants

### Rank / Sala Resolution

- Read `s.clinicalRank` and `s.clinicalSala` from `JSON.parse(localStorage.getItem('rpc-settings'))`
- Map sala values to room IDs: `Sala 1` → `sala-1`, `Sala 2` → `sala-2`, `Sala E` → `sala-e`
- Admin check: `s.clinicalRank === 'Admin'`
- If no sala is assigned, show a hint to complete clinical registration

### Join Mechanism

Room joining uses existing `joinLanRoom(rid, label)` (line 735) via `data-lan-action="join-room"`. The room ID is the sala ID (`sala-1`, etc.).

Underlying `lanClient` WebSocket and sync mechanisms are unchanged — only the room identifiers change.

### Files Affected

| File | Change |
|------|--------|
| `public/js/features/lan-sync.mjs` | Replace rooms card rendering in `renderLanPanelOnce()` |
| `public/js/app.bundle.mjs` | Regenerate bundle after source change |

No changes to LAN server (`lan-squad/`), IPC handlers, DB layer, or CSS.

### Edge Cases

1. **User has no Sala assigned:** Show a hint instructing them to complete clinical registration. Sala room list is empty.
2. **User Sala doesn't match any of the 3:** Fall back to showing all 3 Salas (treat like admin for safety) or show a hint.
3. **Admin with no Sala assigned:** Show all 3 Salas (already handled).
4. **LAN host not connected:** The Sala rooms card only renders in PATH B (when `lanClient.baseUrl()` exists). The unconnected PATH A is unchanged.
