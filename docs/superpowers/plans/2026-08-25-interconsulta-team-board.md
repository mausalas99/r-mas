# Interconsulta mode: team board redesign

## Context

Interconsulta mode today shows a flat list split into workflow zones (Fijados /
Nuevas / En seguimiento / Archivados). This does not match how the team
actually works: **4 teams** (Equipo A/B/C/D) rotate daily through 3 roles —
**guardia** (on-call: owns preop valuations, every new IC request that day,
and their own concurrent patients), **post-guardia** (just finished, not in
the hospital), and **activo** ×2 (the other two teams, managing their own
follow-ups). When a team goes post-guardia, their active patients are
redistributed across the 3 remaining teams so nothing is left unmanaged.
Some patients are **"Under"** — informal monitoring, no formal IC request,
kept anyway. Today this structure lives only in a manually-maintained Google
Doc. Goal: rebuild the interconsulta board to show this directly, and drop
the manual doc.

Confirmed with user:
- **Per-team lane**, not one shared cross-team section. Each team's lane
  shows its patients grouped into status buckets.
- Only the **guardia** (on-call) team's lane shows **Preop / Nuevas hoy** —
  the other 3 teams never show that bucket.
- All active teams (guardia + 2×activo) show **Pendientes** and **Under**.
  Post-guardia shows neither — their patients have moved on.
- A filter narrows the whole board to just the on-call team's
  Preop/Nuevas-hoy work.
- **On team-role rollover** (post-guardia team steps out), that team's
  active patients (Pendientes + Under, not yet resolved) get **redistributed
  across the 3 remaining teams**, and evolution notes travel with the
  patient so continuity of care isn't lost.
- "Under" is a saved patient status (not a UI-only tag) — persists and
  syncs like any other field.
- **Access is not team-restricted**: any Interconsultas team member can see
  and edit any patient regardless of which team's lane they sit in. Team
  assignment on the board is for ownership/organization only, not a
  permission boundary. (Confirmed — 4 teams total, 3 present/active on any
  given day: guardia + 2 activo; 1 postguardia, resting, not counted as
  active.)

## Existing pieces to reuse (do not rebuild)

- **Rotation**: `teams.on_call_day_index` already drives daily on-call
  rotation (`userOnCallForInterconsultasTeam()` in
  [lib/clinical-scope/interconsultas.mjs](lib/clinical-scope/interconsultas.mjs)).
  With 4 teams, role-per-day is derivable from this same index —
  `guardia = teams[dayIndex % 4]`, `postguardia = teams[(dayIndex-1) % 4]`,
  the other two are `activo`. **No new rotation schema needed.**
- **Team-grouped board pattern**:
  [unified-patient-grid-board.mjs](public/js/features/unified-patient-grid-board.mjs) +
  [unified-patient-grid-team-groups.mjs](public/js/features/unified-patient-grid-team-groups.mjs) —
  adapt this grouping pattern instead of writing a new one.
- **Team/patient link**: `patient_team_assignment` table (patient_id,
  team_id, effective_at — latest row wins), written today via
  `assignPatientToTeam()` in
  [lib/db/clinical-access-assignments.mjs](lib/db/clinical-access-assignments.mjs).
  Currently only called for manual "Heredar pacientes" / Nube-join cases —
  this plan adds the first *automatic* caller (role rollover).
- **Continuity of care already works without new sync**: evolution notes
  (`patient.monitoreo.notaEvolucion`, see
  [public/js/features/nota-evolucion/](public/js/features/nota-evolucion/))
  are patient-scoped, not team-scoped — any team assigned to the patient can
  already read them, and Nube's room-wide LWW sync
  (`cloud/sync-worker`) already propagates them in near-real-time. Reassigning
  a patient's team does **not** require any new sync work.
- **Card rendering**: [patients-card-html.mjs](public/js/features/patients-card-html.mjs)
  and [consult-band.mjs](public/js/features/patient-dashboard/consult-band.mjs).
- **Board CSS**: `.patient-chips-grid`, `.r4-section-divider` in
  [pase-board.css](public/styles/pase-board.css).
- **Zone builder to replace**: `buildInterconsultaZones` in
  [interconsulta-mode-chrome.mjs](public/js/features/interconsulta-mode-chrome.mjs) —
  the team board replaces the sidebar entirely, which makes **"Fijados"
  (pinned) obsolete** — every patient already has a visible home (their
  team's lane), so a separate pin-to-top mechanism has no purpose. Drop the
  Fijados concept and its UI. "Archivados" (resolved) stays, as a
  collapsed section below the board.

## Data model change

`interconsult_type` CHECK constraint in
[lib/db/schema-primitives.mjs](lib/db/schema-primitives.mjs) (line ~89) is
`('Ephemeral_VPO', 'Follow-up', 'None')`. Add `'Under'` as a fourth value.
Bump the schema version per [lib/db/schema.mjs](lib/db/schema.mjs)
convention, add a migration + colocated test.

No other schema change: team role-per-day is computed, not stored;
patient→team reassignment reuses the existing `patient_team_assignment`
table.

## New logic

**`lib/clinical-scope/interconsulta-team-roles.mjs`** (new) — given the 4
Interconsultas teams and today's `on_call_day_index`, return
`{ guardia, postguardia, activo: [team, team] }`.

**`lib/clinical-scope/interconsulta-board-buckets.mjs`** (new) — per-patient
bucket classification:
- **Preop / Nuevas hoy** — only computed for the guardia team's patients:
  `interconsult_type === 'Ephemeral_VPO'`, or `followUpStatus ===
  'pendiente'` and the consult was created today.
- **Pendientes** — `interconsult_status` in `Pending`/`Active`, not caught
  by the rule above.
- **Under** — `interconsult_type === 'Under'`.
- **Archivados** — `interconsult_status === 'Resolved'` (unchanged, stays
  outside the team board).

Colocated tests for both modules.

**`lib/clinical-scope/interconsulta-role-rollover.mjs`** (new) —
`redistributePostCallPatients(postCallTeamId, remainingTeamIds, now)`: finds
that team's non-resolved patients via `patient_team_assignment`, splits them
across `remainingTeamIds` (simple round-robin), calls the existing
`assignPatientToTeam()` for each. No note/indicaciones copying needed —
they're patient-scoped already (see above), so they just show up correctly
for the new team. Triggered manually by a "Terminar guardia y repartir"
button (explicit action, not silent/automatic on a timer — matches how shift
changes actually happen).

Colocated test: round-robin split is even, only non-resolved patients move.

## UI changes — CORRECTED 2026-08-25 (navigation model)

> **Supersedes the old "replace sidebar zones" framing.** The first build
> (uncommitted, on disk now) put the team lanes *inside the narrow sidebar*
> with Resumen still open beside them. The user rejected that layout. The
> corrected model: **no sidebar at all in interconsulta mode**. The team
> board IS the main window — a full-width dashboard that replaces Resumen
> as the mode's default view. Clicking a patient card **drills down** into
> that patient's Resumen (full window, board gone). This is a drill-down
> flow, not a split-pane.

**Navigation model:**
- Entering interconsulta mode → team board fills the main window. The
  patient sidebar is hidden entirely (not narrowed, not repurposed).
- Click a patient card → that patient's Resumen fills the main window.
- Back to board: a **"← Tablero" back button** in the interconsulta bar
  (`wb-ic-bar`), visible only while a patient's Resumen is open. `Esc` does
  the same. No breadcrumb trail needed — the hierarchy is only 2 levels.
- Leaving interconsulta mode restores the normal sidebar+Resumen layout.

**`public/js/features/interconsulta-team-board.mjs`** — lane/bucket logic
is already built and stays as-is; only its *mount target* changes (main
panel instead of sidebar):
- 4 team lanes, ordered guardia → activo → activo → postguardia. Full-width
  lanes now have room — render lanes as columns (kanban-style) or stacked
  rows, whichever `pase-board.css` grid classes give for free.
- Guardia lane: Preop/Nuevas hoy (highlighted, `--border-accent`) +
  Pendientes + Under.
- Activo lanes: Pendientes + Under only.
- Postguardia lane: dimmed, empty state note, no buckets.
- "Terminar guardia y repartir pacientes" button — visible only to
  guardia-team members — calls `interconsulta-role-rollover.mjs`.
- Keep Archivados as a collapsed section below the board.

In [interconsulta-mode-chrome.mjs](public/js/features/interconsulta-mode-chrome.mjs):
- **Keep**: the "Solo guardia de hoy" filter toggle already in the
  uncommitted diff (button + `isInterconsultaGuardiaOnlyFilterActive()`)
  — it works the same on the main-window board.
- **Rework**: whatever currently mounts the team lanes in the sidebar must
  instead (a) hide the sidebar in IC mode, (b) mount the board in the main
  panel as the default view, (c) add the board↔Resumen drill-down state +
  "← Tablero" back button + `Esc` handler.
- Remove the pin/Fijar action from interconsulta mode (unchanged decision).
  If the pinned flag is shared with sala mode, drop only the IC-mode UI,
  not the field — confirm at implementation time.

Colocated tests: `interconsulta-team-board.test.mjs` (existing tests stay)
plus new cases in `interconsulta-mode-chrome.test.mjs`: sidebar hidden in
IC mode, board is the default main view, card click swaps to Resumen, back
button/Esc returns to board, layout restored on mode exit.

**Done-check (MISTAKES.md standing rule)**: this exact task was mis-built
once already from the same plan text. The implementer must screenshot the
real running app in IC mode and confirm — visually, not from tests — that
no sidebar is present and the board fills the window, before calling it
done.

## Files touched (summary)

| File | Change |
|---|---|
| `lib/db/schema-primitives.mjs` | Add `'Under'` to `interconsult_type` CHECK |
| `lib/db/schema.mjs` | Bump schema version, migration |
| `lib/clinical-scope/interconsulta-team-roles.mjs` (new) | Daily role-per-team from rotation index |
| `lib/clinical-scope/interconsulta-board-buckets.mjs` (new) | Bucket classification |
| `lib/clinical-scope/interconsulta-role-rollover.mjs` (new) | Post-call patient redistribution |
| `+` colocated `.test.mjs` for each of the 3 above | |
| `public/js/features/interconsulta-team-board.mjs` (new) | 4-lane board renderer + rollover button |
| `public/js/features/interconsulta-team-board.test.mjs` (new) | Render/bucket/filter/rollover-button tests |
| `public/js/features/interconsulta-mode-chrome.mjs` | Hide sidebar in IC mode, board-as-main-view, drill-down + back button, filter; drop Fijados, keep Archivados |
| `public/styles/pase-board.css` | Full-width 4-lane layout for the main panel |
| `public/styles/layout.css` | Hide sidebar / main-panel takeover in IC mode |

Out of scope: eventualidades import in interconsulta mode (confirmed
non-goal in existing spec), preop clinical calculator (`vpo-panel.mjs`,
unrelated), automatic/scheduled rollover (stays a manual button-press),
copying notes on reassignment (unnecessary — already patient-scoped).

## Verification

```bash
npm run test:one -- lib/clinical-scope/interconsulta-team-roles.test.mjs
npm run test:one -- lib/clinical-scope/interconsulta-board-buckets.test.mjs
npm run test:one -- lib/clinical-scope/interconsulta-role-rollover.test.mjs
npm run test:one -- public/js/features/interconsulta-team-board.test.mjs
npm run build:ui
npm run metrics:check
```

Then run the app and manually check interconsulta mode: **no sidebar —
the team board fills the main window as the default view**; clicking a
patient card opens their Resumen full-window; "← Tablero" and `Esc` return
to the board; 4 team lanes;
guardia lane shows Preop/Nuevas hoy + Pendientes + Under; activo lanes show
Pendientes + Under only; postguardia lane is dimmed/empty; filter narrows to
guardia's Preop/Nuevas-hoy; pressing "Terminar guardia y repartir
pacientes" moves that team's patients evenly to the other 3 and their
evolution notes are still visible to the new team; mark an existing IC
patient as "Under" and confirm it persists after reload.

### Status — 2026-08-25 (claude, dwight-mt9278dp)

Navigation rework done, uncommitted: sidebar hidden entirely in IC mode
(`html.ic-board-mode aside.patient-sidebar` in `layout.css`), team board
mounted into `#ic-board-mount` (new sibling of `#empty-state`/`#patient-view`
in `public/partials/layout/app-body.html`) as the main window's default IC
view, card click drills into full-window Resumen, "← Tablero" + `Esc`
return to the board. `interconsulta-mode-chrome.mjs` now owns board
mounting + the rollover-IPC call (moved out of `patients-list.mjs`, which no
longer has any interconsulta-specific branching — the sidebar renders its
normal Fijados/Activos/Archivados zones same as Sala, just hidden by CSS).

Verified against the real running app (not just tests), per the
Done-check above:
- `npm run test:one` green on all touched files (37 tests: interconsulta-mode-chrome, patients-list, interconsulta-team-board, interconsulta-team-roles, interconsulta-board-buckets, interconsulta-role-rollover).
- `npm run build:ui` clean.
- `npm run metrics:check`: OK, except the pre-existing spacing-ratchet FAIL (+1 hardcoded px) — traced to unrelated pre-existing uncommitted `.header-mode-seg-dots` CSS (chrome-mode-seg-dots feature), not this change; this change's own CSS additions use rem/no new hardcoded px.
- Screenshots (`scripts/verify/interconsulta-team-board-{nav,drill,back}.mjs` + `.png`): confirm no sidebar, board fills the main window, card click opens Resumen full-window, "← Tablero" returns to the board.

Not done: the 4 lanes render correctly in code (tested), but the demo/seed
data has no configured Interconsultas teams, so the screenshot shows
"Sin equipo de guardia hoy" / "Sin equipo" catch-all rather than 4 populated
lanes — needs real team config to verify visually, out of scope here.
"Under" persistence-after-reload and the rollover button's actual
redistribution were not re-verified live in this pass (unit-tested only,
unchanged from the prior session).
