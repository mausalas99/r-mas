# Guardia Letter Cycle Fix — Perfil, Schedule y Scope

**Date:** 2026-05-31
**Status:** Approved (brainstorming)
**Component:** Guardia schedule, scope evaluation, profile/rank UI
**Application:** r-mas (R+) — local-first Electron, SQLCipher, optional LAN LiveSync
**Builds on:** [2026-05-31-clinical-teams-handoff-v2-design.md](./2026-05-31-clinical-teams-handoff-v2-design.md)

## Problem

The V2 clinical teams implementation uses `on_call_day_index` (0–6) as a **day-of-week index**, compared against `weekday` in scope evaluation. This does not match the actual hospital scheduling, which uses **letter-based cycles** mapped to **day-of-month**:

| Role | Service | Cycle | Positions |
|------|---------|-------|-----------|
| R2 | Sala | A B C D E F | 6 |
| R1 | Sala | A1 B1 C1 D1 A2 B2 C2 D2 | 8 |
| All ranks | Eme, Torre HU, UX, Interconsultas, Área A | A B C D | 4 |

Additionally, the user's rank/profile is only shown during initial registration (one-time modal), with no way to view or change it afterward from the "Mi rotación" panel.

## Solution

### 1. Universal letter-based cycle

Replace all `on_call_day_index === weekday` comparisons with a central function that computes the active position from day-of-month:

```
posición activa hoy = letras[(díaDelMes - 1) % longitudCiclo]
```

Where `longitudCiclo` and `letras` depend on service + rank:

```js
function getCycleConfig(service, rank) {
  const svc = (service || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (svc.includes('sala')) {
    if (rank === 'R2') return { letters: ['A','B','C','D','E','F'], length: 6 };
    if (rank === 'R1') return { letters: ['A1','B1','C1','D1','A2','B2','C2','D2'], length: 8 };
  }
  return { letters: ['A','B','C','D'], length: 4 };
}
```

The team's position in the cycle is derived from `sub_area_fraction` (e.g., "A1", "B", "C2"). The `on_call_day_index` column is kept but always set to 0 — it is no longer used for scheduling (all services use letter-cycle per hospital practice). The CHECK constraint (0–6) is left unchanged; the value 0 satisfies it.

### 2. Functions to add/modify

**New:**
- `getCycleConfig(service, rank)` — returns `{ letters, length }` for a service+rank combination
- `letterIndexForTeam(team, rank)` — returns the position index of a team's `sub_area_fraction` in the appropriate cycle

**Modified (replacing `on_call_day_index === weekday`):**

| Location | Function | Change |
|----------|----------|--------|
| `clinico-access.mjs:233-248` | `computeSalaAbcdefDeficitWrite` | Call `isOnCallToday(team, rank, now)` instead of comparing `on_call_day_index !== weekday` |
| `clinico-access.mjs:258-275` | `canR2SalaAbcdefDeficitWrite` | Same |
| `clinico-access.mjs:385-392` | R3 cross-coverage check | Same |
| `clinico-access.mjs:140-155` | `salaLetterForTeamOrArea` | Extended to handle R1 sub-indices (A1, B1, etc.) |
| `clinical-entrega.mjs:51-54` | `listEntregaTargets` R3 filter | Use letter-cycle matching |
| `clinical-entrega.mjs:80-92` | `listEntregaTargets` R2 deficit | Use letter-cycle matching |

**Removed:**
- `SALA_LETTERS` constant (`['A','B','C','D','E','F']`) — replaced by cycle config
- `on_call_day_index` usage in scope for Sala teams

### 3. Profile/rank UI

**"Mi rotación" panel changes:**
- Show current rank at top (e.g., "R1 · Sala")
- Add "Cambiar rango" button that opens a rank selector (R1–R4, Admin)
- Rank selection persists to `localStorage.settings.clinicalRank`

**Team creation form changes:**
- "Día de guardia (0–6)" replaced by "Posición en ciclo"
- Dropdown options are dynamic based on service + creator's rank:
  - Sala + R2: A, B, C, D, E, F
  - Sala + R1: A1, B1, C1, D1, A2, B2, C2, D2
  - Other services: A, B, C, D
- Selected letter stores to `sub_area_fraction`
- `on_call_day_index` set to 0 (unused for Sala)

### 4. Entrega modal

No functional changes to Entrega in this iteration beyond the target filtering fix (section 2). The LAN handshake batch handoff is deferred to a separate spec.

### 5. Equipo de guardia modal

Separate modal listing who IS on guardia today per letter/position. Only shows declared guardias — no "deficit" markers. Deferred to a separate spec.

## Files changed

| File | Change |
|------|--------|
| `public/js/clinico-access.mjs` | Add `getCycleConfig`, `isOnCallToday`, `letterIndexForTeam`; modify all weekday comparisons; remove `SALA_LETTERS` constant |
| `public/js/features/clinical-teams.mjs` | Add rank display; dynamic letter dropdown in create form; rank change UI |
| `public/js/features/clinical-entrega.mjs` | Fix `listEntregaTargets` filters to use letter-cycle |
| `public/js/features/clinical-registration.mjs` | No changes (existing registration flow remains) |
| `public/js/clinical-access-runtime.mjs` | No changes (profile settings still come from localStorage) |
| `lib/db/clinical-access-db.mjs` | No schema changes (position derived from `sub_area_fraction`, not `on_call_day_index`) |
| `public/js/clinico-access.test.mjs` | Update Sala ABCDEF tests to use letter-cycle; add `getCycleConfig` tests |
| `public/js/features/clinical-entrega.test.mjs` | Update target filtering tests |
| `public/partials/modals/root.html` | No changes (teams panel body is dynamically rendered) |

## Testing

- `getCycleConfig` returns correct config for each service+rank combo
- `isOnCallToday` returns true when day-of-month matches team's letter
- `computeSalaAbcdefDeficitWrite` uses day-of-month cycle, not weekday
- R2 Sala deficit writes work correctly with letter-cycle (not `weekday`)
- R3 cross-coverage uses letter-cycle for Sala
- Team creation form shows correct letter options per service+rank
- Rank change updates scope evaluations

## Out of scope

- LAN handshake batch handoff (separate spec)
- Equipo de guardia modal (separate spec)
- Full Entrega UX redesign
- Changing `on_call_day_index` schema constraint

## Migration

No database migration needed. Existing teams need `sub_area_fraction` set to a valid letter (A, B, A1, etc.) to participate in the letter-cycle. Teams without `sub_area_fraction` will not match any cycle position (treated as not on-call). The `on_call_day_index` column is no longer read for any team — all scheduling uses the letter-cycle.
