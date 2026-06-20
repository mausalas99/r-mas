# Hallmark UI audit remediation — four tracks

**Date:** 2026-06-20  
**Status:** Approved pending implementation  
**Inputs:** UI audit (redesign-existing-projects skill, 2026-06-20 session); `design.md`, `public/tokens.css`, premium UI phases 1–5 (partially landed)

## Goal

Close the highest-impact gaps from the June 2026 UI audit **without** changing clinical behavior, navigation architecture, or the Hallmark “Quiet workbench” identity (density, sidebar census, single indigo accent). Four independent tracks land as separate PR-sized commits; each is shippable alone.

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| Visual direction | **Evolve** existing Hallmark tokens — no font swap, no marketing layout, no sidebar → top-nav |
| Accent color | Keep `#4a52e8` / dark `#7b82f5`; track 3 only replaces *hardcoded* duplicates, not the accent |
| Uppercase section labels | **Keep** `.type-section` and clinical data uppercase; track 2 empty states use **sentence case** |
| Scope boundary | CSS + markup + empty-state copy only; **no** parser/sync/DB changes |
| Clients | Track 1 skip-link + viewport: desktop (`index.src.html`) + `public/interno/index.html`; tracks 2–4 desktop-first; interno/mobile inherit tokens automatically |
| Build | Edit `public/index.src.html` + partials; run `npm run build:ui` — never hand-edit `public/index.html` |
| Verification | `npm run build:ui:check`, `npm run metrics:check`, targeted visual smoke per track |

## Track 1 — Quick wins (foundation hygiene)

### Problem

Modal scrims use pure `rgba(0,0,0,…)`; some shells still use bare `100vh` (iOS Safari jump); no skip-to-content link; z-index values are ad hoc (`9990`, `99999`, `200010`).

### Solution

1. **Scrim token** — `--scrim-bg` in `tokens.css` (light + dark + HC), tinted with `--color-ink` via `color-mix`, not pure black.
2. **Viewport** — `--app-height: 100dvh` with `100vh` fallback on `html`/shell; modal `max-height` uses `min(…dvh, …vh)`.
3. **Skip link** — visually hidden until focus; targets `#main-area` (desktop) / interno main landmark.
4. **Z-index scale** — named tokens in `tokens.css`; migrate overlay stack in `modals.css`, `overlays.css`, `sidebar.css`, `med-pharm-profile.css`, `mobile.css`, `lab.css` duplicate backdrops.

### Z-index scale (canonical)

| Token | Value | Use |
| --- | ---: | --- |
| `--z-base` | 0 | in-flow stacking |
| `--z-sticky` | 10 | header, sticky bars |
| `--z-dropdown` | 100 | settings/connection menus |
| `--z-sidebar-rail` | 450 | auto-hide census rail |
| `--z-floating` | 1000 | tooltips, lab popovers |
| `--z-modal` | 9000 | modal backdrops + dialogs |
| `--z-modal-nested` | 9010 | modal-on-modal (release notes over modal) |
| `--z-clinical-teams-lower` | 9005 | Mi rotación under directorio LAN |
| `--z-clinical-lan-users` | 9020 | directorio LAN panel |
| `--z-clinical-admin` | 9030 | admin code modal |
| `--z-clinical-lan-directory` | 9040 | directorio LAN when stacked above rotación |
| `--z-header-backdrop` | 9100 | Ajustes / ⇄ menu scrims |
| `--z-header-dropdown` | 9101 | settings dropdown panel |
| `--z-header-dropdown-front` | 9102 | ⇄ connection panel (above settings) |
| `--z-popover` | 9200 | RPC date picker, floating pickers |
| `--z-banner` | 9400 | mobile boot banner |
| `--z-toast` | 9500 | toasts |
| `--z-celebration` | 9600 | confetti (above toast, below cmdk) |
| `--z-cmdk` | 9800 | command palette |
| `--z-db-unlock` | 9900 | SQLCipher unlock (must win over cmdk) |

Local stacking (1–6 inside a card) stays as literal small integers — do not tokenize.

### Out of scope (track 1)

- Changing modal open/close JS

---

## Track 1.5 — Deferred overlay z-index (2026-06-20 follow-up)

**Status:** Implemented

Normalize remaining ad-hoc stacks deferred from track 1:

| File | Mappings |
| --- | --- |
| `settings.css` | 10199–10202 → `--z-header-backdrop` / `--z-header-dropdown` / `--z-header-dropdown-front`; scrims → ink mix |
| `mobile.css` | connection dropdown + boot banner → header/banner tokens |
| `pase-board.css` | LAN directorio 100020–100050 → clinical stack; invite gate → `--z-modal-nested` |
| `estado-actual.css` | EA charts backdrop → `--z-modal` + `--scrim-bg`; dvh max-height |
| `rpc-date-picker.css` | 10600 → `--z-popover` |
| `lab.css` | fixed output menu 1200 → `--z-floating` |

**Success:** zero literal `z-index` values ≥ 1000 in `public/styles/**/*.css`.

---

## Track 2 — Empty states (composed “getting started”)

### Problem

Census empty states (`#empty-state`, `#med-empty-guided`) already use title + lead + optional actions. EA panel, ⌘K, todos, and some chart shells show a single muted line — users miss the next step.

### Solution

Introduce a **shared empty-state block** (CSS only; no new component framework):

```html
<div class="empty-state empty-state--compact" role="status">
  <h3 class="empty-state-title">…</h3>
  <p class="empty-state-lead">…</p>
  <!-- optional: .empty-state-actions with .btn-med-secondary -->
</div>
```

Reuse existing classes in `layout.css`; add `--compact` modifier (less padding, left-aligned in work panes).

### Surfaces (must ship)

| Surface | File | Trigger copy (Spanish, sentence case) |
| --- | --- | --- |
| Estado Actual (no patient) | `estado-actual-panel.mjs` | Title: “Selecciona un paciente para monitoreo” · Lead: censo + registrar signos |
| ⌘K no results | `command-palette.mjs` | Title: “Sin coincidencias” · Lead: prueba otro término o abre una pestaña desde el encabezado |
| ⌘K empty query hint | `command-palette.mjs` | (optional) show lead when query empty — only if palette already opens empty |
| Pendientes (no patient) | `todos.mjs` | Title + lead mirroring expediente pattern |
| Pendientes (empty list) | `todos.mjs` | Keep contextual filter copy; add lead line for handoff vs normal |
| EA charts summary empty | `estado-actual-charts-modal.mjs` or CSS hook | Title + lead for “sin datos de gráfica” |

### Surfaces (nice-to-have, same PR if cheap)

| Surface | Notes |
| --- | --- |
| Guardia vitals feed | Already has `.vfeed-empty` + sub — align typography to `.empty-state-title` / `.empty-state-lead` |
| `cmdk.css` | Style `.cmdk-empty` as composed block when markup upgrades |

### Out of scope (track 2)

- Illustrations/icons in empty states
- Onboarding tour changes
- Empty states inside modals (entrega, censo PDF)

---

## Track 3 — Token debt (lab + pase-board hex migration)

### Problem

`lab.css` has **42** raw hex literals; `pase-board.css` has **68**. Many duplicate semantics already in `tokens.css` (`--error`, `--success`, `--todo-prio-media`, `--color-ink`). Card header tone colors in lab are a isolated palette not wired to tokens.

### Solution

1. **Add missing semantic tokens** (only where repeated ≥3 times or thematically grouped):

| New token | Light | Role |
| --- | --- | --- |
| `--color-scrim` | (track 1) | modal backdrop |
| `--color-danger-hover-bg` | `color-mix(in oklab, var(--error) 12%, var(--surface))` | delete hover rows |
| `--color-on-danger-hover` | inherits | text on danger hover |
| `--lab-header-slate` … | map from existing `.card-header--tone-*` | lab section headers (7 tones) |

2. **Migrate top 30 bare hex usages** (priority order):

**lab.css (15):** `.btn-delete-card:hover` / `.btn-remove:hover` `#fee2e2` → danger hover token; `.card-header--tone-*` backgrounds → `--lab-header-*`; `#fff` / `#f9fafb` on headers → `var(--color-on-accent)` or `--color-on-success`; dark link `#93c5fd` → `var(--color-accent-soft-text)`; `#f8fafc` panel bg → `var(--input-fill)`.

**pase-board.css (15):** `#666` fallbacks in `var(--text-muted, #666)` → drop fallback; `#c0392b` / `#c53030` danger fallbacks → `var(--danger)` only; `#16a34a` / `#ca8a04` status chips → `var(--success)` / `var(--todo-prio-media)`; `#c9a227` → `var(--todo-prio-media)`; ink scrims `#1a2332` / `#0f172a` → `var(--color-ink)`.

3. **Rule going forward:** new CSS in these files must not introduce raw hex (eslint-style comment banner at top of touched sections).

### Out of scope (track 3)

- Full repo hex purge (expediente, modals, settings remain)
- Changing lab header color semantics (same hues, tokenized)
- Dark-theme re-design of guardia board

---

## Track 4 — Radius hierarchy (soften Arc-soft)

### Problem

`soft-ui.css` applies `border-radius: var(--radius-xl) !important` to all `.card` containers **and** `var(--radius-control)` (pill) to most inputs/buttons. Dense tables and list rows feel overly rounded; inner/outer hierarchy is flat.

### Solution

1. **New radius tokens** in `tokens.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--radius-field` | `12px` | text inputs, textareas in tables/lists |
| `--radius-chip` | `8px` | ATB chips, small badges (already ~6–10px in places) |
| `--radius-inner` | `var(--radius-md)` | rows, nested panels |
| `--radius-shell` | unchanged (`28px`) | app chrome, sidebar |
| `--radius-container` | `var(--radius-lg)` | cards (replace xl on `.card`) |

2. **Rewrite `soft-ui.css`** in three tiers (remove blanket `!important` where specificity allows):

- **Tier A — containers:** `.card`, `.pase-section`, `.indica-section`, `.listado-section` → `--radius-container` (lg, not xl).
- **Tier B — rows:** `.listado-row`, `.todo-row` → `--radius-inner` (keep lg, not pill).
- **Tier C — controls:** primary/secondary buttons, theme toggles → keep `--radius-control` (pill).
- **Tier D — fields:** listado/todo/agenda text inputs → `--radius-field` (not pill).

3. **Explicit exclusions (never pill):** `table`, `.cultivos-table`, `.ea-card` data grids, `input[type="date"]` inside `.cultivos-table`, monospaced lab output blocks.

4. **Visual check surfaces:** Laboratorio listado, Pendientes rows, Manejo receta wrap, Pase mini-cards, Expediente datos tab actions.

### Out of scope (track 4)

- Changing `--radius-shell` / window chrome
- Mobile interno complete re-pass (inherits tokens; spot-check only)

---

## Cross-track dependencies

```
Track 1 (tokens: scrim, z-index, viewport)
    ↓ optional ordering
Track 3 (uses --color-scrim; same tokens.css edit window)
Track 4 (radius tokens in same file — merge carefully or sequential PRs)
Track 2 (independent; can parallelize)
```

**Recommended merge order:** 1 → 4 → 3 → 2 (1 unblocks scrim token for 3; 4 touches tokens before 3 adds lab header tokens; 2 is isolated).

---

## Verification matrix (all tracks)

| Check | Tracks |
| --- | --- |
| Light + dark + high-contrast | 1, 3, 4 |
| Modal open/close, ⌘K, toast stack order | 1 |
| iPad Safari / interno viewport | 1 |
| Keyboard: skip link → main content | 1 |
| No patient → EA, pendientes, expediente empty copy | 2 |
| Lab card headers colors unchanged to eye | 3 |
| Listado/pendientes row shape | 4 |
| `npm run metrics:check` | all |
| `npm run build:ui:check` | all |

---

## Risks

1. **Z-index regression** — modal under toast or cmdk under modal; mitigated by canonical table + manual stack test checklist.
2. **Radius change user muscle memory** — subtle; guard with before/after screenshots of lab + pendientes.
3. **Token rename churn** — lab header tones referenced in JS? Grep before rename; classes stay, values move to tokens.
4. **`!important` removal in soft-ui** — specificity fights with feature CSS; use targeted overrides, keep `!important` only where proven necessary (document why).

---

## Explicitly out of scope (all tracks)

- Font change off IBM Plex
- Marketing-style layout (asymmetric hero, grain textures)
- Sidebar → top navigation
- Decorative uppercase purge (Hallmark wave 2–3 already did partial pass)
- Inline style purge in `medications.mjs` (separate hygiene ticket)
- `text-wrap: pretty` (follow-up micro-track)

---

## Success criteria

- [ ] Zero `rgba(0,0,0,` modal scrims in `modals.css` / canonical backdrops
- [ ] `--z-*` scale documented in `tokens.css`; no value &gt; 10000 except celebration/confetti
- [ ] Skip link visible on Tab from page load (desktop + interno)
- [ ] EA / cmdk / todos empty states use title + lead pattern
- [ ] ≤12 bare hex remaining in `lab.css` and ≤53 in `pase-board.css` (30 migrated)
- [ ] `.card` uses `--radius-container` (lg); list inputs use `--radius-field`
- [ ] `design.md` changelog line or pointer to this spec
