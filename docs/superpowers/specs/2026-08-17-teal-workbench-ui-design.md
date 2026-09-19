# Teal workbench — UI spec

> **Source:** design handoff zip `design_handoff_workbench_clinico` (user-provided, 2026-08-17). Static HTML reference, hi-fi. Not code to copy — rebuild in the app's own JS/CSS.

**Date:** 2026-08-17
**Status:** Accepted — supersedes Hybrid H / Warm instrument
**Codename:** Teal workbench
**Supersedes:** Hybrid H (`2026-08-03-apple-hybrid-ui-overhaul-program.md`) + Warm instrument (`2026-08-13-warm-instrument-ui-design.md`) — both now historical, same status as Hallmark before them.
**Plan:** `docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md`
**Related:** `design.md`, `public/tokens.css`

---

## Intent

The residente works under time pressure with ~25 patients and needs to see what's abnormal first. Every screen shares one rule: **altered goes on top and in red; normal collapses to one line.** Hybrid H's ink-only accent is replaced with a single teal action color — the only non-clinical color in the system. Red/amber/green stay reserved for clinical meaning, never decoration.

---

## Decisions locked (2026-08-17)

| Decision | Choice |
| --- | --- |
| Accent | Teal `oklch(0.52 0.09 195)` on light, `oklch(0.62 0.09 195)` on dark (lightened to clear 4.5:1 on `#1e222b`). Replaces ink-accent from Hybrid H. |
| Semantic color | Red/amber/green = **only** for clinical values and status. Never for actions, brand, or decoration. |
| Materials | Solid surfaces everywhere except floating layers (sheets, dialogs, popovers, toasts) — same rule Hybrid H already had. No glass-on-glass. |
| Primary button | One primary per screen, always top-right, always teal. |
| Control radius | 6px badge · 7px row button · 8px bar button (unchanged from Hybrid H's `--radius-control`) · 12px card/window · 14px modal · 999px chip/progress bar **only**, never action buttons. |
| Confirmations | Three weights, one component with a `weight` prop — see "Confirmations" below. |
| Motion | ⌘K, keyboard nav, tab switches: no animation. Loading: skeleton shimmer, never a page spinner. See "Animations". |
| Typography | Two families only: system UI for chrome, IBM Plex Mono for anything compared or read in a column (beds, labs, vitals, hours, status labels). |
| Responsive | Desktop screens are fixed-width by design (a hospital workstation window, not a responsive site). The only mobile screen is the intern's vitals-capture flow. |

---

## Tokens (source of truth: `public/tokens.css`)

Variable **names** are unchanged from Hybrid H so all existing CSS keeps working; only values moved.

| Token | Light | Dark |
| --- | --- | --- |
| `--color-paper` (app-bg) | `#eceae6` | `#171a21` |
| `--color-surface` (chrome) | `#f8f7f4` | `#1e222b` |
| `--color-elevated` (panel) | `#ffffff` | `#1e222b` |
| `--color-ink` | `#1a1a1c` | `#e8eaed` |
| `--color-ink-muted` | `#6c6c70` | `#98989d` |
| `--color-ink-tertiary` (new) | `#98989d` | `#6c6c70` |
| `--color-accent` | `oklch(0.52 0.09 195)` | `oklch(0.62 0.09 195)` |
| `--color-accent-hover` | `oklch(0.42 0.09 195)` | `oklch(0.7 0.09 195)` |
| `--color-danger` (alert) | `#d70015` | `#ff6b6b` |
| `--color-danger-deep` (new) | `#a8000f` | `#ff8a8a` |
| `--color-danger-tint` / `-strong` / `-ring` (new) | `rgba(215,0,21,.045)` / `.06` / `.16` | `rgba(255,107,107,.08)` / `.12` / `.22` |
| `--color-warn` (new base; `--warn` now points here instead of livesync-syncing) | `#8a4208` | `#f0a35e` |
| `--color-success` (ok) | `#1c6b31` | `#5fd18a` |
| `--color-border-strong` (new) | `rgba(28,28,30,.18)` | `rgba(148,163,184,.28)` |
| `--color-border-dashed` (new) | `rgba(28,28,30,.22)` | `rgba(148,163,184,.30)` |
| `--color-empty-fill` (new) | `rgba(28,28,30,.02)` | `rgba(148,163,184,.04)` |
| `--color-rail` (new) | `rgb(246,245,242)` | `#22262f` |
| `--color-panel-header` (new, Phase 0) | `rgb(242,240,236)` | `color-mix(in oklab, --color-ink 4%, --color-surface)` |
| `--color-table-head` (new, Phase 0) | `rgb(249,248,245)` | `color-mix(in oklab, --color-ink 6%, --color-surface)` |

**Phase 0 correction (2026-08-18):** the line below was wrong — Hybrid H's radii/shadows did *not* already match. `--radius-chip` was `8px` (design wants `999px`, chip/progress-bar only); consumers that were badges or row buttons, not chips, now use new `--radius-badge: 6px` / `--radius-row-btn: 7px` instead. `--divider` (hairline) retuned `8%→6%` ink-mix, `--border` `14%→11%` ink-mix, to land in spec's `rgba(28,28,30,.06)` / `.10–.12` range. `--scrim-bg` light `32%→42%` to match spec `rgba(28,28,30,.42)` (and dark, which was already `42%`). Added `--shadow-window`, `--shadow-modal`, `--shadow-counter-alert`. Added the dense `--type-wb-*` scale (section/counter/column-head labels, counter figure, patient name, row 1/2-line, mono data, status label, button, metadata) — see `public/tokens.css`.

~~`--border` / `--border-hairline` untouched (already ink-derived color-mix, shift is negligible). Radii, shadows, and z-index scale untouched — Hybrid H already matched this spec's values.~~

**Fonts:** IBM Plex Mono now loads weights 400/500/600/**700** (was missing 700) — see `public/index.src.html`. Rebuild `index.html` via `npm run build:ui` after any change there.

---

## Layout grammar (shared across every desktop screen)

Four horizontal bands, top to bottom:

1. **Identity/action bar** — `flex-shrink: 0`, ~44px, `justify-content: space-between`. Left: mode name (uppercase) + mono context (date, user, schedule) + one tertiary metadatum. Right: 1–2 secondary buttons, the `⌘/` shortcut, **one** primary teal button.
2. **Counters band** — flex row, white background, cells separated by `1px solid rgba(28,28,30,0.08)`. Each cell: 10px uppercase label + 13px figure. A cell in alert state gets `--color-danger-tint-strong` background + inset red underline (`inset 0 -2px 0 var(--color-danger)`). Max three counters, always the same three per mode.
3. **Body** — `grid-template-columns: 1.75fr 1fr; gap: 14px`. Left: main table/content, internal scroll. Right: card stack, `overflow-y: auto`.
4. Interconsultas (1440×900) breaks the bar into `grid-template-columns: 200px minmax(0,1fr) auto`, height 52px — the one documented exception.

Every scrollable table: fixed card header → fixed column-header row → `overflow-y: auto` body → centered summary line at the end ("16 pacientes sin alterados ni pendientes") that is text, not a table row.

---

## Confirmations — one component, three weights

1. **Destructiva** (loses work, no undo): modal + scrim, title, consequence in one sentence, destructive button in `--color-danger` on the right, secondary cancel. Requires an explicit click.
2. **Con consecuencias** (advances flow, drags pending items along): informative modal, e.g. "Entregar guardia" listing overdue counts and the sentence "Pasan al turno de la mañana tal como están." Footer on `--color-rail`. Primary stays **teal**, not red — it's a legitimate action, just disclosed.
3. **Reversible** (save/mark/send): **no modal.** Runs immediately, ephemeral toast with undo (`.om-rise` in `motion.css` — see "Animations" below).

---

## Animations

Reuse what already exists in `public/styles/motion.css` and `skeleton.css` rather than adding zip-named duplicates:

| Need (zip name) | Reuse | Notes |
| --- | --- | --- |
| Table/panel loading shimmer (`om-shimmer`) | `.skel-line` / `.skel-card` (`skeleton.css`, `skel-shimmer` keyframe) | Already reduced-motion safe. **Phase 0:** retimed `1.4s → 1.1s` per spec. Sweep stays relative-transform (`-100%→100%`), not the zip's fixed `-180px→220px`, since these cards are variable-width, not the mockup's fixed canvas. |
| Button in-flight spinner (`om-spin`) | `btn-spin` keyframe (`motion.css`) | Scope the animation to the pressed button only. |
| Ephemeral save/undo toast (`om-rise`) | `.om-rise` / `om-rise` keyframe (`motion.css`) | **Phase 0 correction:** `toast-in`/`toast-out` drop from above with scale and need a JS-driven class swap — wrong direction, no self-contained cycle. `om-rise` is the real thing: enters +10px→0, holds ~76%, exits, one 4.2s run. Reduced-motion → opacity-only, same timeline. |
| Value goes out of range (`om-pulse`) | **new:** `.value-alert-pulse` / `value-alert-pulse` keyframe (`motion.css`) | 1.4s, 2 reps, then stops — never a permanent blink. Reduced-motion → `animation: none`. |
| Vitals-round progress bar fill (`om-sweep`) | **new:** `.progress-sweep-fill` / `progress-sweep` keyframe (`motion.css`) | 0.5s, fires only on value change, not looping. Reduced-motion → `animation: none`. |

UI transitions: hover 120ms, modal/popover open 160ms ease-out (opacity + `translateY(6px)` — matches existing `modal-in`), tab switch with no animation. `prefers-reduced-motion: reduce` must collapse everything above to instant state changes — clinical data must never depend on animation to be readable.

---

## Screens (12 turnos in the design file, build order in the plan's roadmap)

Reference file: `Paciente Rediseño.dc.html` (zip), ids `12a → 1a`, most recent turno first. Two-id turnos (`6a`/`6b`, `1a`/`1b`) are light/dark variants of the same screen unless noted.

| id(s) | Screen | Notes |
| --- | --- | --- |
| `1a`/`1b` | Sala / Resumen del paciente | Base screen — everything else reuses or extends its content. **Phase 1 pilot.** |
| `2a`/`2b` | Laboratorio | Abnormal on top, mono values, trend arrow vs. previous draw, most recent date leftmost column. |
| `3a`/`3b` | Barra lateral de pacientes | Three variants explored; **3b is the one to build**, already used in `4a`. Document 3a only as "existed." |
| `4a` | Manejo (tratamiento) | "Medicamentos del turno" panel; support therapies (O₂, fluids) counted separately from meds. |
| `5a` | Modo Pase | One window, one patient at a time — no separate projector view. Keyboard bed navigation. |
| `6a`/`6b` | Guardia | `6b` (dark) is the night-shift screen, not a preference toggle. Three counters in fixed order: vitals round → pendientes → ingresos. |
| `7a`/`7b` | Modales — revisar signos / nuevo pendiente | Shared modal patterns used from Guardia. |
| `8a`/`8b` | Ventana del interno (mobile, 390×844) | Only mobile screen in the set — vitals capture, one field per row, numeric keyboard, 44px min touch target. |
| `9a` | Nota de evolución (SOAP) | Subjetivo (free text) · Objetivo (**auto-derived** per zone from vitals+labs, not typed) · Análisis (free text, biggest field) · Plan (per zone, marks: novo / sin cambio / suspende). |
| `10a` | Pendientes del paciente | Grouped: vencidos → en curso → abiertos → resueltos (collapsed). |
| `10b` | Modo interconsultas (1440×900) | Reuses `1a`'s clinical content; new chrome only (consult banner: requesting service, reason, follow-up status). |
| `11a`/`11b`/`11c` | Confirmaciones / Calendario / Animaciones | Shared component specs — see "Confirmations" and "Animations" above. |
| `12a` | Inicio de turno | New screen, no current equivalent. "Lo primero" 4-bed triage table, outgoing handoff card with auto-extracted bed mentions, zone chips, intern roster, two empty states (labs not in yet, no interconsults). |

---

## State shape (names suggested by the design, not imposed)

See the zip README §"State Management" for the full list (`shift`, `census`, `vitalsRound`, `pending`, `labs`, `note`, `handoff`, `consultMode`, UI state). Key rule: labs arrive late by nature (~09:15–09:45) — screens must tolerate their absence with an empty state, never a zero.

---

## No hacer (carried over from Hybrid H, still true)

- Índigo/púrpura como acento.
- Glass en tablas labs o celdas Pase/Guardia.
- Gradientes en botones/cards.
- Hex sueltos en CSS nuevo — siempre `var(--…)`.
- Animar navegación de alta frecuencia (⌘K, J/K, tabs).
- `999px` en botones de acción.
- Rojo/ámbar/verde para algo que no sea un valor o estado clínico.
