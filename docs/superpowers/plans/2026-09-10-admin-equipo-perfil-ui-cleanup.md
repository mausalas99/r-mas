# Clear up Admin, Equipo, and Mi Perfil screens

## Context

You said these 4 screens are unclear, hard to manage, and messy, each in its own
way, after several past tries. I checked why the past tries didn't stick.

Finding: these screens were never part of the Teal workbench redesign. That
redesign has a pixel-exact mockup file and covers 12 clinical screens (turno,
pase, laboratorio, guardia, etc.) — not Admin, not Equipo, not Mi Perfil. Those
3 areas only picked up the new colors, not a real layout. So past passes were
guessing at layout with no reference to converge on, which is why they kept
drifting without landing.

The actual clutter, screen by screen:

- **Admin → Usuarios**: each user row crams a checkbox, handle, 2 status
  badges, name, a history button, a placement label, and (if the user has a
  Nube account) a whole second block of buttons — all always visible, all the
  same visual weight. [panel-admin-equipos-html.mjs](public/js/features/cloud-sync/panel-admin-equipos-html.mjs)
- **Admin → Red**: one flat table of every patient in every room, with 2 text
  action links per row, and destructive bulk buttons (Eliminar) sitting right
  next to routine ones (Actualizar) with the same styling.
- **Equipo**: up to 8 unrelated sections stacked in one scroll — rotation
  admin, create-team, join-by-code, browse-directory, your joined team, and
  config — in an order that changes depending on state, so it never looks the
  same twice. [teams-roster-panel.mjs](public/js/features/clinical-teams/teams-roster-panel.mjs)
- **Mi Perfil**: work-mode, signature fields, and clinical templates all sit
  in one flat page with no priority — used-daily and used-never fields look
  the same.

## Approach

Good news: this app already has reusable pieces for exactly this — they're
just not used on these 4 screens. No new CSS classes, no new library — reuse
what's already built:

- `wb-row` / `wb-row--twoline` (`workbench-kit.css`) — a row with a bold line
  and a muted line under it, already the base of other lists in the app.
- `wb-menu` / `wb-menu-panel` / `wb-menu-item` (`workbench-kit.css`) — the
  "⋯" overflow menu already used in `interconsulta-mode-chrome.mjs`.
- `clinical-teams-card` / `-title` / `-meta` / `-actions` — the card shape
  already used for team cards, just not for anything else yet.

**1. Row pattern** (Admin → Usuarios, Admin → Red)
Switch each row to `wb-row--twoline`: bold identity line (name + at most one
status pill) over a muted meta line (sala, rango, last activity), actions
pinned right. Rare actions (reset password, remove, Nube session details)
move into a `wb-menu` "⋯" button instead of sitting always-open next to the
row — same pattern already live elsewhere in the app, so it will look
familiar, not new.

**2. Bulk/danger action bar**
Selection-triggered actions (Guardar seleccionados, Eliminar seleccionados)
move to a bar that's visually quiet and disabled until ≥1 row is checked, kept
apart from the routine per-row actions (Abrir expediente, Editar).

**3. Section-card pattern** (Equipo, Mi Perfil)
Reuse the `clinical-teams-card` shape for every section, not just team
cards. Fixed order by how often it's used. Equipo: your team + rotation
first, browse/join second, create-team and admin config collapsed under one
"Más opciones" `<details>` at the bottom — so the layout stops reordering
itself depending on state. Mi Perfil: 2 cards — "Cómo trabajo" (modo,
servicio, salida clínica) and "Firma y formatos" (firma, cédula, formatos
clínicos).

## Files touched (markup + CSS only — no data/behavior changes)

- `public/js/features/cloud-sync/panel-admin-equipos-html.mjs` — `renderEquiposUserRow` and siblings
- `public/js/features/cloud-sync/panel-admin-html.mjs` + its Red-tab table helper
- `public/js/features/clinical-teams/teams-roster-panel-build.mjs` — section order/collapsing
- `public/js/features/clinical-teams/teams-roster-team-cards.mjs` — card layout
- `public/partials` template + `public/js/features/profile.mjs` wiring for Mi Perfil
- `public/styles/cloud-sync.css`, `public/styles/settings.css` — only for the
  bulk-bar and small layout tweaks that `workbench-kit.css` doesn't cover

No new dependency, no new component library, almost no new CSS — this is
mostly swapping each screen's one-off row/card markup for the `wb-row`,
`wb-menu`, and `clinical-teams-card` classes that already exist and are
already used elsewhere in the app.

## Order

1. Admin → Usuarios (worst offender) → build → screenshot in the running app,
   light and dark → you review.
2. Only after your OK: Admin → Red, then Equipo, then Mi Perfil, same pattern.

## Verification

- `npm run build:ui` after each screen's edits.
- Launch the running app (the real `npm start` Electron window, not a
  separate preview) and screenshot each changed screen, light + dark.
- `npm run test:one -- <touched file>.test.mjs` for any file with a colocated
  test (several already exist: `teams-roster-manage.test.mjs`, etc.) — markup
  reshuffling should not change existing behavior tests.
