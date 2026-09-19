# Interconsultas, UX, and Eme Teams — Design

**Date:** 2026-06-05  
**Status:** Approved (Approach A)

## Goal

Wire the already-scaffolded clinical services **Interconsultas**, **UX** (Emergency Department), and **Eme** (Urgent Care / Emergencias) with correct team composition, ABCD rotation, and census access — including UX/Eme residents seeing the full **Interconsultas census** on their off-call days with read+write access.

## Background

Canonical definitions already exist:

| Module | What exists |
|--------|-------------|
| `lib/clinical-salas.mjs` | `Interconsultas`, `UX`, `Eme` in `CLINICAL_SALA_VALUES`; ABCD-only rotation; LAN slugs |
| `lib/clinical-team-composition.mjs` | Slot limits + `OFF_CALL_INTERCONSULTAS_SERVICES` (not wired) |
| `public/js/clinico-access.mjs` | ABCD `default` cycle for non-ward services; scope evaluator |
| `public/js/features/clinical-teams/shared.mjs` | Services listed in team UI |

## Team composition

| Service | R1 | R2 | R3 | Rotation |
|---------|----|----|-----|----------|
| **Interconsultas** | 1 | 1 | 2 | ABCD |
| **UX** | 1 | 1 | 1 | ABCD |
| **Eme** | 1 | 0 | 1 | ABCD |

- **Enforcement:** soft warning in team create/join UI when a rank slot is full; do **not** hard-block DB join.
- **Eme R2:** joining as R2 shows warning that R2 does not participate on Eme teams (`max: 0`).

## Rotation (ABCD)

All three services use the existing `CYCLE_CONFIGS.default` (A–D, day-of-month modulo 4). No Sala R1 primera/segunda línea picker (`clinicalSalaUsesAbcOnlyRotation` already true).

`isOnCallToday(team, rank, now)` determines whether a member is on their primary service that day.

## Census access rules

### 1. Interconsultas team members (always)

- **Assigned patients:** normal team scope via `patientInJoinedTeamScope` (explicit assignment wins).
- Applies every day regardless of on-call letter.

### 2. Interconsultas on-call team (structural)

When a user is a member of an **Interconsultas** team **and** `isOnCallToday` is true for that team:

- **Additionally** grant read+write to **all** Interconsultas patients (including unassigned ephemeral VPOs / new consults).
- Reasoning string: `Interconsultas de guardia: censo del día`.

### 3. UX / Eme off-call → Interconsultas census

When a user is a member of a **UX** or **Eme** team **and** `isOnCallToday` is **false** for that team:

- Grant read+write to **all** Interconsultas patients.
- Reasoning string: `Off-call UX/Eme: censo Interconsultas`.

When on-call for UX/Eme, they only see their own team patients (existing scope paths). No Interconsultas structural access from this rule.

### 4. Priority

New rules integrate in `evaluateClinicalScope` (Approach A) as early returns **after** admin, active guardia, and incoming-preview checks, **before** `guardiaMode` and rank-specific blocks:

```
admin → active guardia → incoming preview
  → off-call UX/Eme + Interconsultas patient → allow (rw)
  → on-call Interconsultas + Interconsultas patient → allow (rw)
  → guardiaMode → rank-specific (R4/R1/R2/R3) → deny
```

Off-call Interconsultas rule does **not** apply when the user is on-call for UX/Eme that day.

### Patient identification

`isInterconsultasPatient(patient)` returns true when:

- `normalizeServiceKey(patient.service)` includes `interconsult`, **or**
- `normalizeServiceKey(patient.sub_area)` includes `interconsult`, **or**
- `patient.interconsult_type` is set and not `'None'`.

## Architecture (Approach A)

All logic lives in `public/js/clinico-access.mjs` as exported helpers called from `evaluateClinicalScope`:

| Helper | Role |
|--------|------|
| `isInterconsultasPatient(patient)` | Patient tagging |
| `userOffCallFromInterconsultasRotationServices(userId, joinedTeams, rank, now)` | UX/Eme member not on-call today |
| `userOnCallForInterconsultasTeam(userId, joinedTeams, rank, now)` | Interconsultas member on-call today |

Import `OFF_CALL_INTERCONSULTAS_SERVICES` from `lib/clinical-team-composition.mjs` (renderer already imports from `lib/`).

Census sidebar (`patients-clinical-filter.mjs`) requires no change — it already calls `isPatientReadableInClinicalScope`.

## UI changes

### Team roster (create / join)

- Show composition hint per service (e.g. "Interconsultas: 1 R1, 1 R2, 2 R3").
- On join attempt, if `validateTeamRankSlot` returns a message, show **non-blocking** warning toast or inline hint; still allow join.
- Reuse `getTeamCompositionLimits` / `serviceUsesStructuredComposition` from `lib/clinical-team-composition.mjs`.

### No new census filter tab

Off-call Interconsultas patients appear automatically in the sidebar when scope allows.

## Out of scope

- Interno mobile slug routes for UX/Eme/Interconsultas (`lib/interno/sala-slug.mjs` partial coverage).
- Hard DB enforcement of rank slots.
- Automatic patient assignment when UX/Eme rotate to Interconsultas.
- LAN room discovery for new salas.

## Testing

| File | Cases |
|------|-------|
| `lib/clinical-team-composition.test.mjs` | Slot validation, Eme R2 blocked message |
| `lib/clinical-salas.test.mjs` | Interconsultas/UX/Eme mapping + ABCD rotation flag |
| `public/js/clinico-access.test.mjs` | Off-call UX → Interconsultas rw; on-call UX → deny unassigned IC; on-call IC team → all IC patients; off-call IC member → assigned only |

## Files touched

| File | Change |
|------|--------|
| `public/js/clinico-access.mjs` | Helpers + scope integration |
| `lib/clinical-team-composition.mjs` | Export only (maybe `isOffCallInterconsultasService` helper) |
| `public/js/features/clinical-teams/teams-roster-render.mjs` | Composition hints + soft warnings |
| `public/js/features/clinical-teams/teams-roster-interactions.mjs` | Warn on join if slot full |
| `lib/clinical-salas.test.mjs` | Extend coverage |
| `lib/clinical-team-composition.test.mjs` | New |
| `public/js/clinico-access.test.mjs` | New scope cases |
