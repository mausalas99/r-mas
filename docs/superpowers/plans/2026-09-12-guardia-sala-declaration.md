# Guardia sala declaration (Step 1) — root-cause fix for whole-hospital census

CEO diagnosis (ceo-fable, 2026-09-12), escalated after 3 failed direct fix attempts.

## Diagnosis

Three stacked causes, any one alone gives 74 patients:

1. **Possible stale Electron cache.** Rebuilt JS can still run from Chromium's
   cache after a soft reload since bundle URLs aren't cache-busted. One-time
   check, not the root cause.
2. **`guardiaHomeSala` returns `''` for this account.** `user.sala` is null
   (no profile sala); `resolveActiveTeamFilterId` fallback needs a
   `team_membership` row this admin account doesn't have. `''` falls through
   to `elevatedPatientFilters.sala`, which is `'__all__'` for elevated
   accounts — so the sala filter never runs.
3. **Even a correct sala wouldn't fully separate patients.**
   `session-user.mjs` stamps any local patient missing `sala` with the
   viewer's own profile sala on every bootstrap. On this admin device
   (full-ward pull), that mis-stamps patients from other salas as the
   admin's sala, so filtering on `patient.sala` still leaks patients in.

**Root finding: no "declared sala for tonight" signal exists anywhere in the
codebase.** The mockup's "Step 1: Activar guardia" was never built in the
real app. All three fix attempts guessed at inferring a value that doesn't
exist for this account — that's why none of them changed anything.

## Goal

Guardia mode: user declares the sala for tonight first (Step 1). Census then
shows only that sala's teams (Step 2). No inference from profile,
membership, or `patient.sala`.

## Constraints

- No new modules. Tests go into existing colocated `*.test.mjs`.
- Spanish copy. Synthetic patients only for live checks.
- Do not touch `public/js/censo-*.mjs` or `stable-versions.json`.
- Do not touch `guardia-fin-turno-*`.
- Same turn: `test:one` per touched test, `build:ui`, `metrics:check`,
  handoff row, MISTAKES.md entry.

## Chosen approach

**State.** `localStorage['guardia.sala'] = JSON.stringify({ sala, at })`.
Valid 24h from `at`; older = unset, so Step 1 returns next night. Helpers
`readGuardiaSala()`, `writeGuardiaSala(sala)`, `clearGuardiaSala()` in
`guardia-board-state.mjs`.

**Scope filter.** Filter on the team each patient already resolves to
(`p._filterTeamId`, set by `filterPatientsForGuardiaCensus`), not
`patient.sala`: keep a patient when
`teams.find(t => t.team_id === p._filterTeamId)?.sala === declaredSala`.
Matches how cards are grouped; sidesteps the mis-stamping bug.

**Step 1 UI.** Rendered into `#guardia-census-grid` when no valid sala is
stored: lead text, `<select>` of `CLINICAL_SALA_VALUES`
(`lib/clinical-salas.mjs`) preselecting `user.sala` when present, button
"Empezar guardia". On click: `writeGuardiaSala`, then open the existing
per-team R1 modal `openGuardiaHoyModal({ teams, sala, userId, rank,
salaGuardiaToday })` (has Omitir), then `renderGuardiaBoard(settings)`.

**Step 2 head.** `renderGuardiaCensusHead` shows
`Sala 2 · esta noche · N equipos` plus button `#guardia-btn-cambiar-sala`
(`clearGuardiaSala()` + re-render). Replaces the old "acota con Filtros
censo arriba" hint — Filtros censo no longer applies to Guardia.

## Owner decisions (made by CEO recommendation, standing unless corrected)

1. Step 1 content: **B — sala, then the existing per-team R1 modal**
   (matches the mockup; modal already persists to DB + LAN). Not A
   (sala-only).
2. Patients with no team in the chosen sala: **A — hide them** (only the
   sala's teams, like the mockup). Not B (also showing mis-stamped
   "Sin equipo asignado" patients).

## Task list

**Dev (Haiku), first:** cache triage — quit app, clear
`~/Library/Application Support/r-plus/{Cache,Code Cache,GPUCache}`,
`npm start`, report patient count. Do not investigate further.

**Lead (Sonnet):**
1. `guardia-board-state.mjs`: add the three sala helpers + 24h check + test.
2. `patients-clinical-filter.mjs`: export `filterPatientsByTeamSala(list, sala, teams)` + test.
3. `guardia-census-empty.mjs`: export `buildGuardiaSalaPickerHtml(salas, selectedSala)` and `renderGuardiaSalaPicker(container, { salas, selected, onStart })`, reusing `.empty-state`/`.profile-input`/`.btn-med-primary` + test.
4. `guardia-board-render.mjs`: delete `guardiaHomeSala` + its import; `buildGuardiaCensusPatients` drops the `GUARDIA` gate, filters `{ sala: '__all__', teamId: '', service: '' }` then `filterPatientsByTeamSala`; `renderGuardiaBoard` renders the picker and returns early when `readGuardiaSala()` is empty.
5. `guardia-board-chrome.mjs`: `renderGuardiaCensusHead` takes `{ sala, teamCount }` + Cambiar button, wired via delegated listener; update its test.
6. `pase-board.css`: only if needed.
7. Verify: `test:one` each, `build:ui`, clear cache, `npm start`, open Guardia with a synthetic sala live — confirm Step 1 shows, then only that sala's teams; Cambiar works.
8. Same turn: update handoff row (`docs/core/20-claude-code-handoff.md:173`) + MISTAKES.md entry (two guessed fixes shipped before confirming this account even had a sala signal; prevention: trace the data path end to end before editing).

## Files to touch (6, 0 new)

- `public/js/features/guardia-board-state.mjs` (+ test)
- `public/js/features/patients-clinical-filter.mjs` (+ test)
- `public/js/features/guardia-census-empty.mjs` (+ test)
- `public/js/features/guardia-board-render.mjs`
- `public/js/features/guardia-board-chrome.mjs` (+ test)
- `public/styles/pase-board.css` (only if needed)

## Follow-up, not in this plan

`migrateLocalPatientsClinicalSala` stamps full-ward patients with the
admin's own sala on elevated devices, corrupting `patient.sala` for the
regular (non-Guardia) census sala filter too. Separate task: skip the stamp
for elevated accounts, or stamp from the assigned team's sala.

## Revision 2 (2026-09-12) — derive from home sala, skip the manual step

Owner pushback: the manual Step 1 picker is unnecessary busywork if the
account already has a home sala. Escalated back to CEO for a second look.

**Correction to the original diagnosis:** "no home-base signal exists" was
wrong — it was true only for this one test account. `users.sala` (DB column,
`lib/db/schema-migrate-v1-v10.mjs:75`) IS the home-base signal, required at
onboarding (`clinical-onboarding-gates.mjs:144`) for every account,
admins included. Admins are exempt only from the *team* onboarding step
(`needsTeamOnboarding`), not from having a sala. A `team_membership` row is
not the right fix — it would also enroll the admin as an R1 in the on-call
rotation (`guardia-coverage.mjs:140`), a real side effect nobody asked for.

**New order of resolution:** `localStorage['guardia.sala']` (24h override,
for the rotation case where tonight's coverage isn't your home sala) →
`user.sala` → joined team's sala → Step 1 picker only when all three are
empty. Cambiar keeps working as the nightly override.

**Prerequisite:** fix the `session-user.mjs`/`app-state.mjs` mis-stamping
bug (previously filed as a separate follow-up above) BEFORE setting a sala
on elevated accounts — otherwise setting `user.sala` arms it against
full-ward-pull patients missing their own `sala`.

**Files (7, 0 new):**
- `clinical-census-filters-ui.mjs` (+test) — new `resolveHomeSala(user, teams)`.
- `guardia-board-render.mjs` — resolve declared sala as `readGuardiaSala() || resolveHomeSala(...)`; extract picker into exported `showGuardiaSalaPicker(settings)`; delete `handleGuardiaSalaStart` and the `openGuardiaHoyModal` import (Guardia entry no longer opens that modal — it already runs at the right place, `ensureGuardiaHoyBeforeEntrega`).
- `guardia-board-chrome.mjs` (+test) — Cambiar → `clearGuardiaSala(); showGuardiaSalaPicker(null)`.
- `guardia-census-empty.mjs` (+test) — copy: "Tu perfil no tiene sala. Elige la que cubres esta noche. Para no ver este paso, pon tu sala en Mi rotación."
- `session-user.mjs` + `app-state.mjs` — skip the sala stamp for elevated accounts (`hasElevatedTeamPrivileges`), +test in `clinical-access-runtime.test.mjs`.

**Live check order:** admin with empty sala → Step 1 with new copy → set sala in Mi rotación → reopen Guardia → opens directly on that sala, no modal → Cambiar → picker → pick another sala → confirm regular census patient counts per sala are unchanged (proves the stamp guard held).

Unchanged from revision 1: `guardia-board-state.mjs`, `patients-clinical-filter.mjs`, `guardia-hoy-modal*`.
