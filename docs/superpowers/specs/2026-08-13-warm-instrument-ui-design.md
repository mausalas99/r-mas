# Warm instrument — UI spec

> **For implementation:** After review, use **writing-plans**. Do not ship until this spec is accepted. Preview is not the app.

**Date:** 2026-08-13  
**Status:** Accepted  
**Codename:** Warm instrument  
**Parent:** Hybrid H (`2026-08-03-apple-hybrid-ui-overhaul-program.md`)  
**Preview:** [`docs/demos/warm-instrument-preview.html`](../../demos/warm-instrument-preview.html)  
**Related:** `apple-design`, `design.md`, `public/tokens.css`

---

## Intent

Hybrid H left a correct workbench that feels lifeless: ink-on-paper with no hue, discordant button languages, and leftover Hallmark (indigo glow, unused `+1 día` capsule). This spec adds **craft**, not a new layout.

Personality: a warm clinical instrument (Braun / SF), not whimsy. Delight is press, materials, and the SOME-paste settle — plus the existing tour confetti.

---

## Decisions locked (2026-08-13)

| Decision | Choice |
| --- | --- |
| Layout | **No change.** Same sidebar, tabs, Resumen stack, density, gutters. |
| Confetti | **Keep** `launchConfetti()` on tour complete. Integral. |
| Dark | **First-class.** Designed with light, not an invert. |
| UI copy | Neutral Spanish. **No voseo** (no *vos*, *pegá*, *arrastrá*). Tú or impersonal, like the rest of the app. |
| Accent (light) | Ink `#1c1c1e` on actions. Warm hue 52 only on `--color-accent-soft` / chips. |
| Accent (dark) | Clinical blue `#6eb6ff` on primary. **Never** a white-filled primary on black. |
| Control radius | `--radius-control` **8px** on action buttons. No `999px` pills on primaries / secondaries / header actions. |
| Dead control | Remove **`+1 día`** (`#med-dia-btn` / `.btn-med-secondary--dia`). `Importar SOME` is a single button, not a capsule pair. |
| Motion (high-freq) | Still **none** on ⌘K, J/K, keyboard tabs. |
| Springs | Overlay kit: bounce **0** on open. Bounce only after a flick. Dialogs grow from the trigger. |

---

## Button language

Three roles. Same family in light and dark.

| Role | Light | Dark | Shape |
| --- | --- | --- | --- |
| Primary | Ink fill, white label. No glow. | `#6eb6ff` fill, `#0c0e14` label. | 8px |
| Secondary | Elevated surface + visible border, ink label. | `--color-elevated` + stronger border (`~42%` ink mix). Not gray-on-gray. | 8px |
| Ghost / chip | Warm `--color-accent-soft` | Warm soft (hue 52) or blue-soft only if it is a *selected* control | 8px |

**Forbidden**

- White (or near-white) fill primary on dark paper.
- Indigo glow (`rgba(79, 86, 255, …)` on `.guided-empty-actions button.primary`).
- `.med-active-btn-group` capsule joining two actions.
- Lifeless secondary: fill ≈ content background + hairline you cannot see.

**Press:** `scale(var(--press-scale, 0.97))` on pointer-down / `:active` for `button`, `.btn-*`, chips. Not opt-in `.ui-pressable` only.

---

## Surfaces (craft, not layout)

- **Resumen name:** may use `--type-display` + tracking `−0.02em`. Same row, same actions. If it reads as a layout change in review, keep today’s 0.86em.
- **Chips / selection wells:** promote dashboard `oklch(… 52)` into `--color-warm` / `--color-accent-soft`. No third ad-hoc palette.
- **Labs / Pase:** stay Tufte-flat. No glass, no card lift.
- **Empty wells:** one verb (e.g. *Agregar pendiente*, *Pega el reporte*). No indigo glow CTA.

---

## Motion

| Moment | Spec |
| --- | --- |
| Overlay open | `springTo`, bounce 0, from **trigger origin** (not viewport center). |
| Sheet / toast | Apple rubber-band `0.55`; `project(v, 0.998)` before snap vs dismiss. Velocity handoff. |
| SOME paste → rows | Critically damped settle (bounce 0, ~300ms) on `#lab-output-section` / new rows. |
| Tour complete | Existing confetti. Do not replace with a toast. |
| Reduced motion | Opacity cross-fade only. Honor `motion-sobrio`. |

Legacy CSS `@keyframes modal-in` stays until a surface is migrated to `openDialog` / `openSheet`. New work uses the overlay kit.

---

## Out of scope

- Rearranging Paciente / Laboratorio / Pendientes.
- New brand color, gradients, glass on lab tables.
- Animating ⌘K, J/K, or keyboard tab changes.
- Argentine or other regional voseo in UI strings.
- Implementing from the HTML preview without a writing-plan.

---

## Preview

Open [`docs/demos/warm-instrument-preview.html`](../../demos/warm-instrument-preview.html).

- **Hoy / Propuesta** — current vs this spec (buttons, type, motion).
- **Claro / Oscuro / Ambos** — dark is visible, not a hidden toggle.
- **Laboratorio** — *Pegar y estructurar*, *Limpiar*, *Importar SOME* / *+1 día*.
- **Gestos** — dialog origin, sheet, toast, confetti.

The preview is a simulacro. It does not change `public/` until this spec is accepted and planned.
