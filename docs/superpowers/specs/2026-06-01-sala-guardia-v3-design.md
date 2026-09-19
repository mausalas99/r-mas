# Sala + Guardia V3 — Design Spec

## Overview

Re-architect clinical operations (teams, handoff, on-call) for the residency program. This spec covers **Sala** (3 Salas: Sala 1, Sala 2, Sala E) as the foundation. Other services (Torre, ER, Urgent Care, Interconsults, Area A) will follow the same pattern in subsequent specs.

## Architecture

**Mega-LAN**: single server for all Salas. One SQLCipher database. Scope (who sees what) is enforced by `evaluateClinicalScope`, not by separate networks.

- Any resident hosts the server (WebSocket + Express, existing in R+)
- Host election if the current host leaves
- Clients connect to the active host and receive data filtered by scope
- Each resident has a **clinical profile** (real name: `Nombre Apellido`) linked to their machine `clientId`

## Team Structure

### Sala Teams

3 Salas, 4 teams each = **12 teams total**.

Each team:
- 1 **R2** (team leader — team is named after them, e.g. `Dr. Gutiérrez`)
- 2 **R1s**: R1(1) and R1(2)
- 1 **R4** per Sala overseeing all 4 teams of that Sala
- 1 **R4 de guardia** (global) overseeing all 3 Salas + Torre (future)

### Letter Cycles

| Role | Cycle | Length | Scope |
|------|-------|--------|-------|
| R1 | A1, B1, C1, D1, A2, B2, C2, D2 | 8 days | Per-team position. R1(1) gets A1-D1, R1(2) gets A2-D2 |
| R2 | A, B, C, D, E, F | 6 days | Across all 12 Sala teams. 2 R2s on-call per day |

`sub_area_fraction` stores the cycle letter (e.g. `A1`, `B2`, `C`) and determines who is on-call today via `(dayOfMonth - 1) % cycleLength === index`.

### Guardia assignments

1. **R1 guardia**: 1 per Sala. Sees all patients in their Sala in Modo Guardia.
2. **R2 guardia**: 2 total, covering all 3 Salas transversally. They split incoming patients from departing R2s manually.
3. **R4 de guardia**: sees all 3 Salas + Torre.

### Guardia swaps

The cycle defines the **default** on-call person, but any team member can declare themselves on-call via the existing `Guardia` checkbox. The declared person overrides the cycle default.

## Scope Rules

### Normal mode (diurno)

| Role | Visibility |
|------|-----------|
| R1 | Only patients of their team |
| R2 | Only patients of their team |
| R4 Sala | All patients of their Sala (4 teams) |

### Handoff mode (entrega, ~4pm onward)

- **R1 → R1 guardia**: R1 opens Entrega modal, selects R1 guardia of their Sala, hands off patient by patient. Each confirmed handoff makes that patient visible to the receiver.
- **R2 → R4 + R2 guardia**: R2 hands off to their R4 AND to one of the 2 R2s de guardia (manual split). Patient becomes visible to both.
- Handoffs are progressive: visibility unlocks per patient, not per team or Sala.

### Guardia mode (nocturno, manual toggle)

| Role | Visibility | Capabilities |
|------|-----------|-------------|
| R1 guardia | All patients in their Sala | Add eventualidades only |
| R2 guardia | Patients handed off to them by departing R2s | Add eventualidades only |
| R4 guardia | All Salas + Torre | Add eventualidades only |

Modo Guardia is a **toggle** — the resident can switch between normal view and guardia view. In normal view they continue working on their own patients' labs, notes, etc. In guardia view they see the expanded scope.

**Vitals alerts**: when a patient's vitals check is overdue, the system auto-activates Modo Guardia to surface uncollected signs.

## Handoff Mechanics

1. Departing resident opens Entrega modal on a patient
2. Selects the receiver (R1 guardia, R4, or one of the 2 R2s de guardia)
3. Confirms — patient becomes visible in receiver's scope
4. Repeats for each patient

**Double handoff (R2)**: R2 hands off each patient to BOTH their R4 AND one R2 de guardia. The Entrega modal supports selecting two destinations.

## Team Registration

Any team member (R1 or R2) can create the team:

1. Select Sala (1, 2, or E)
2. Select cycle letter (A, B, C, D)
3. Team name is automatically the creating R2's name (or can be set by R1 with the R2's name)

**Joining**:
- Self-serve: R1s see available teams in their Sala and join, taking the next free R1 slot (A1 or A2)
- The creating user can also add members by their clinical name

**Validations**:
- R1 can only be in 1 Sala team
- R2 can only lead 1 team
- Max 4 teams per Sala
- Max 2 R1s per team

## Clinical Profiles

Users register once with:
- Real name (`Nombre Apellido`)
- Rank (`R1`, `R2`, `R3`, `R4`, `Admin`)
- Default Sala assignment

This profile is linked to the machine's `clientId`. In the LAN directory, users see each other by clinical name, not machine ID.

## Data Model Changes

**New/modified columns:**

`users` table:
- `clinical_name`: string (real name, e.g. `Mauricio Salas`)
- `sala`: `Sala 1 | Sala 2 | Sala E` (nullable, null for non-Sala services)

`teams` table:
- `sala`: `Sala 1 | Sala 2 | Sala E` (nullable)
- `team_leader_name`: string (the R2's clinical name, used as team display name)

`sub_area_fraction`: unchanged — stores cycle letter (A1, B1, C, etc.)

`active_guardias`: unchanged — supports all handoff types via existing `covering_user_id`, `source_team_id`, `patient_id`

**Scope evaluation (`evaluateClinicalScope`)** extensions:
- Modo normal: team membership + sala letter matching
- Modo Guardia R1: `sala == mySala` → full Sala visibility
- Modo Guardia R2: `active_guardias.covering_user_id == myUserId` → handed-off patients
- Modo Guardia R4: unrestricted

## What This Spec Does NOT Cover

- Torre, ER, Urgent Care, Interconsults, Area A — separate specs following same pattern
- LAN host election mechanism — TBD in networking spec
- Auto-reconnect / failover details
- Vitals alerting system details (exists in `session-manager.mjs`)
