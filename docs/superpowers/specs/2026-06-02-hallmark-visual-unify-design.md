# Hallmark visual unify — R+ guardia + a11y

**Date:** 2026-06-02  
**Status:** Implemented (waves 1–4)

## Wave 4 (2026-06-02)

- **mobile.css:** ATB R/I/S chips and hover panels use `--error`, `--todo-prio-media`, `--success` (removed duplicate `html.dark` hex blocks); tend sparklines, search marks, template delete hover, and focus rings tokenized.
- **estado-actual.css:** Pending/confirmed badges, snapshot altered/glu, vital altered slots, paste error preview, and IO balance use semantic tokens; dropped redundant `html.dark` overrides; residual shadows use `--color-ink` mixes.
- **historia-clinica.css:** Calc alerts (`--warn` / `--high`) and toolbar shadow use `--todo-prio-media`, `--error`, `--action`.
- **eventualidades.css:** Delete hover and dark compose surfaces use `--error`, `--bg`, `--input-fill`, `--color-focus-ring` (no loose slate hex).

## Wave 2 (2026-06-02)

- Removed decorative `uppercase` from manejo, estado-actual, modals (UI labels), lab (except `otros-item input`), sidebar section labels, expediente med headers.
- Settings dropdown: `aria-modal="true"`, `aria-hidden` sync, focus first control on open, return focus to trigger on close.

## Wave 3 (2026-06-02)

- Removed decorative `uppercase` from settings, med-pharm-profile, manejo-guia, receta-hu, rpc-date-picker, pase-board (Pase labels), mobile, eventualidades (UI chrome), vpo section titles.
- **Kept** clinical uppercase: SOAP/eventualidades/historia inputs & narrative blocks, `otros-item input`, VPO dx fields, `hc-vitals-ingreso__text`, `ev-card__text`.

## Goal

Align guardia/censo UI with `design.md` Quiet workbench tokens; remove emoji chrome; fix top a11y gaps from audit without unrelated refactors.

## Scope

1. **Guardia CSS** (`pase-board.css` L1–~540): replace iOS hex palette with `var(--color-*)` / legacy aliases; soften critical pulse under `prefers-reduced-motion`; replace 4px error stripe with full-border emphasis.
2. **Chrome**: header guardia chip matches `header-pase-mode-chip`; SVG moon icon; no emoji in HTML.
3. **JS copy**: `unified-patient-grid-board.mjs` vitals strings without emoji; update test.
4. **Guardia summary**: SVG icons in `guardia-board.mjs`.
5. **A11y**: patient search `<label>`; `.btn-round-seen` 44px; global `:focus-visible` for text inputs; `expediente`/`lab` `white` → `var(--surface)`.
6. **Manejo**: flat card header (no gradient).
7. **Build**: `npm run build:ui` after partial/HTML edits.

## Out of scope

- Repo-wide uppercase purge in manejo/modals.
- Full `index.html` hand-edit (use `index.src.html` + build-ui).

## Success

- No `#ff3b30` / `#7961f6` in guardia block of `pase-board.css`.
- No emoji in guardia header or vitals banner strings.
- Tests pass for `unified-patient-grid-board.test.mjs`.
