# Pilot screen (Resumen) — remove card boxes, stack vitals/labs

## Context

I compared the app's dark-mode Resumen screen (your screenshot) against the mockup's dark variant (screen `1b`, in the design zip). The mockup is explicitly captioned "sin cajas: reglas, columnas mono alineadas, una sola columna de lectura" (no boxes: rule-lines, aligned mono columns, single reading column). The running app uses bordered/rounded "card" boxes for every section (Signos vitales, Labs, Eventualidades, Pendientes, Medicamentos). You picked "big layout change" to close this gap.

I read the full `patient-dashboard.css` (703 lines) and `dashboard-html.mjs` (352 lines) already this turn — no further exploration needed.

## What I found

- Every section (`Signos vitales`, `Labs: Solo alterados`, `Eventualidades`, `Pendientes`, `Medicamentos`) renders through one shared `.card` class (`dashboard-html.mjs` lines 91, 189, 261, 318-327). The box look — background, 12px border-radius, shadow — comes from **one CSS rule**: `.patient-dash .card, button.card, ...` (`patient-dashboard.css:267-278`).
- `.card-h` (the heading row) already has `border-bottom: 1px solid var(--divider)` (`patient-dashboard.css:309-318`) — this is already the "rule line" style the mockup wants. Removing the box background/radius is enough to get the ruled look; the heading underline doesn't need to change.
- Layout: `.bento.vitals-labs` is a 2-column grid (`patient-dashboard.css:191-196, 198-204`) putting Signos vitales and Labs side by side. The mockup stacks them as **one column** (Signos vitales full-width, then Labs fuera-de-rango, then Labs en rango, each full-width, in that order).
- `.bento.rest` (Eventualidades + Pendientes) is already 2-column — the mockup **also** puts these two side by side (`grid-template-columns: 1fr 1fr; gap: 40px` at mockup line 3304), so this pairing is correct as-is, no change needed.
- `.bento.meds-band` (Medicamentos) is already full-width with 3 internal columns — matches the mockup's "Manejo actual" 3-column layout as-is, no change needed.
- `.card, button.card` is scoped entirely under `.patient-dash` / `#patient-ronda-dashboard-host` / `.patient-expediente-classic .patient-dash` — all pilot-screen mount points, nothing outside this screen uses `.card` from this file. Confirmed self-contained: this change cannot leak into other screens.
- `dashboard-html.mjs` does **not** need to change — it already emits `.card`/`.card-h`/`.card-b`/`.bento` wrapper markup; box removal and column stacking are pure CSS.

## What's explicitly out of scope

The mockup's Labs section shows a different **content shape** than today's app: a "Labs fuera de rango" mini-table (Estudio/Valor/Cambio/Nota) plus a separate "Labs en rango" plain list, cut by lab draw time. Today's `renderLabsHtml()` groups by delivery/envio time instead. That's a data-model difference, not a box/spacing difference — restructuring it is a separate future plan, not part of this box-removal pass. Trend arrows (already flagged in the Labs token-cleanup plan) also stay out of scope.

## Plan

All changes in `public/styles/patient-dashboard.css`, no other files:

1. **Remove the box look** from the `.card` rule block (lines 267-285): drop `background: var(--color-elevated)` and `border-radius: 12px`. Keep `border: 0` and `box-shadow: none` (already no-op once background is gone). Keep the `.card.clickable:hover` background tint (`color-mix(in oklab, var(--color-ink) 4%, var(--color-elevated))`) as a row-hover affordance — it reads as a hover highlight, not a box, so it stays consistent with the mockup's plain reading-column feel.
2. **Stack vitals + labs into one column**: change `.bento.vitals-labs` grid-template-columns from `1fr 1fr` to `1fr` (`patient-dashboard.css:198-204`). Check `.vitals-card--empty` (`:348-350`) and the `align-self: stretch` rules (`:206-216`) still make sense in a single column — adjust `align-self` to `start` if the empty-state card would otherwise stretch oddly with nothing beside it.
3. Leave `.bento.rest` and `.bento.meds-band` untouched — both already match the mockup's own layout.
4. Spot-check the `.draw` (lab envio row) and `.abn` (altered lab chip) styles still read fine without a parent card box around them — they have their own border/background already (`patient-dashboard.css:419-436`), so no change expected there.

## Verification

- No JS/HTML changes, so no new colocated test is required per `tests-with-code.md` (behavior/output unchanged — this is CSS-only).
- `npm run build:ui`.
- Local browser preview of this file doesn't render real CSS in this environment (confirmed earlier this session — external stylesheets get stripped in the sandboxed preview). Verification is: build, then ask you to screenshot the running app again for a side-by-side against the mockup, same as how we caught this gap in the first place.

## After approval

Copy this plan into the repo (`docs/superpowers/plans/2026-08-17-pilot-remove-card-boxes.md`), update the teal-workbench roadmap doc, add a row to the Active plans table in `docs/core/20-claude-code-handoff.md`.
