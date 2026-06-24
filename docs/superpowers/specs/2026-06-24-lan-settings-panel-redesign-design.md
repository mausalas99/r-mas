# LAN ⇄ + Ajustes panel redesign — Hero + unified list

**Date:** 2026-06-24  
**Status:** Approved (2026-06-24)  
**Inputs:** Brainstorm session (pain points B hierarchy, C consistency); mockup option **1 — Héroe + lista unificada** approved  
**Design system:** Hallmark · Quiet workbench · `design.md`, `public/tokens.css`

## Goal

Make **Conexión guardia (⇄)** and **Ajustes** scannable in under 5 seconds during guardia: one clear hero zone at the top, then a single visual grammar for every row below. Fix hierarchy confusion and jagged right-edge controls **without** changing LAN behavior, rank logic, or settings functionality.

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| Layout direction | **Option 1** — status/PIN hero + unified `settings-card-stack` list (no tabs, no two-column dashboard) |
| Visual identity | Evolve Hallmark tokens — no new accent color, no font swap, no marketing chrome |
| Scope | CSS + markup structure in renderer partials/JS builders — **no** sync protocol, DB, or server changes |
| Primary CTA rule | Solid accent (`btn-lan-primary` / `btn-generate`) only for **disconnected → Convertirse en host** and modal-level actions; panel rows use ghost/text or chevron |
| PIN display | Monospace digits in hero (`IBM Plex Mono`), **not** purple pill; copy actions as ghost buttons |
| Warnings | Conflict / offline as **alert strip** above the stack, not a competing card with solid purple button |
| Ajustes shell | Keep split-pane nav (`settings-split`); unify **panel interiors** to same row grammar |
| Build | Edit `public/partials/` + `public/js/features/` sources; `npm run build:ui` — never hand-edit `public/index.html` |
| Verification | `npm run build:ui:check`, `npm run metrics:check`, targeted visual smoke (host / client / R4 / conflict) |

## Problem (today)

### Conexión guardia

- `lan-connection-panel-root` uses a **2-column grid** with three group layouts (`stack`, `list`, `grid`) — visually heterogeneous.
- Group titles are **visually hidden** in the modal; sections bleed together.
- Controls mix **purple solid buttons**, chevron disclosures, checkboxes, and PIN pill on the same tier.
- `lan-shift-pin-card`, `lan-turn-reset-card`, `lan-hub-status-card`, and `rpc-disclosure` rows each have different padding, borders, and action placement.
- Orphan **LWW toast** checkbox floats above the panel without row alignment.

### Ajustes

- Split-pane nav works; **panel bodies** are inconsistent: `settings-form` grids, `settings-card-stack`, raw `btn-edit-templates` walls (especially Respaldos), and inline-styled checkboxes.
- Backup section presents 10+ equal-weight purple-outline buttons — no hierarchy.

## Solution overview

```
┌─ Modal head: Conexión guardia ─────────────────────────┐
│ HERO: status line (dot + one sentence)                 │
│ HERO: PIN row (mono code + ghost Copiar/Nuevo + meta)  │
│ [optional alert strip: conflict / offline]             │
├─ settings-card-stack (single list) ──────────────────┤
│ Row ›  iPad / R+ Móvil          [chevron]              │
│ Row ›  Otra Mac del equipo      [chevron]              │
│ Row ›  Salas de guardia         [chevron]              │
│ Row    Mi equipo                (read-only subtext)     │
│ Row ◉  Fijar anfitrión          [toggle]               │
│ Row ›  Estado de sincronización [chevron]              │
│ Row    Censo LAN                [Abrir ghost]          │
│ Row ›  QR Internos              [chevron]              │
│ Row ◉  Avisar sobrescritura LWW [toggle]               │
└────────────────────────────────────────────────────────┘
```

Same row component powers Ajustes panel interiors (nav unchanged).

---

## 1. Row grammar (canonical)

Introduce one shared row pattern — extend existing `settings-card` / `settings-card-stack` (no new framework).

| Right affordance | When | Class / element |
| --- | --- | --- |
| Chevron `›` | Navigates or expands inline (`<details>`) | `.settings-card__chevron` on summary rows |
| Ghost button | Single inline action (Copiar, Abrir, Restablecer) | `.btn-settings-row` |
| Toggle | Boolean preference | `.settings-card--toggle` + `.settings-card__toggle` (existing) |
| None | Read-only status row | omit action column |
| Warn ghost | Destructive / conflict action | `.btn-settings-row.btn-settings-row--warn` (amber border, not solid purple) |

**Rules:**

1. Never place solid accent button and chevron on adjacent rows at the same visual weight.
2. Row min-height **44px** touch target (existing `settings-card` toggle label already does this).
3. Title 12px/700, subtitle 11px muted — same as current `settings-card__title` / `__desc`.
4. Disclosures use `lan-settings-card-summary` chevron (::after) aligned to the **same column** as list chevrons.

---

## 2. Conexión guardia — structure

### 2.1 Modal shell (`public/partials/modals/root.html`)

- Keep centered modal dimensions (~840px).
- **Remove** standalone `lan-connection-prefs` block above the panel root; fold LWW preference into the unified stack as the last toggle row.
- `lan-connection-panel-root` becomes **single-column** (`display: flex; flex-direction: column; gap: 10px`).

### 2.2 Hero zone (new CSS block)

Classes:

- `.lan-connection-hero` — wrapper, no border (flush under modal head divider).
- `.lan-connection-hero__status` — flex row, dot + status line (reuse `lan-hub-status-dot` colors).
- `.lan-connection-hero__pin` — flex row: mono code + action group + expiry meta below.
- `.lan-pin-code` — `font-family: var(--font-mono); font-size: 1.25rem; letter-spacing: 0.08em; font-weight: 600;` — **no** `--color-channel-pill-bg` background.

Refactor builders:

| Current module | Change |
| --- | --- |
| `lan-hub-panel-shell.mjs` `appendLanHubStatusCard` | Emit hero status fragment (not bordered `lan-connect-card`) |
| `panel-host-pin.mjs` `appendLanShiftPinSection` | PIN into hero; toolbar buttons → ghost |
| `panel-host-pin.mjs` `appendLanHostAddressCopyButton` | Ghost button inline in hero or pin row |

**Disconnected state:** full-width `btn-lan-primary` **only** inside hero below status line (“Convertirse en host”). Invite-paste textarea stays in hero as secondary block (not a separate card).

### 2.3 Alert strip

| Current | New |
| --- | --- |
| `lan-turn-reset-card` with solid Restablecer | `.lan-alert-strip` above stack when conflict detected; warn ghost button right |
| `lan-offline-banner` separate card | Same alert strip pattern (offline tone) |

Keep footnote copy in strip body; drop nested `settings-card-stack` wrapper for warnings.

### 2.4 Unified navigation stack

Replace `appendLanPanelGroup` triple layout with:

1. Hero (+ alert if needed)
2. **One** `settings-card-stack.lan-connection-stack` for all navigable rows
3. Optional **second stack** `.lan-connection-stack--admin` only when elevated (diagnostics, censo, interno QR, equipos) — still same row grammar, visually separated by 8px gap + optional subtle section label (visible, sentence case: “Administración”, not uppercase hidden heading)

Migrate into stack:

| Feature | Row type |
| --- | --- |
| iPad / invite share | Chevron disclosure (`appendLanInviteShareCards`) |
| Otra Mac | Chevron disclosure |
| Salas (`appendLanHubRoomsCard`) | Chevron disclosure; active sala in subtitle |
| Mi equipo / rank sections | Read-only or chevron per existing rank builders |
| Host pin override | Toggle row (existing `settings-card--toggle`) |
| Sync diagnostics | Chevron disclosure |
| Censo LAN | Ghost “Abrir” |
| Interno QR / Equipos QR | Chevron disclosure |
| LWW toast | Toggle row (moved from modal pref) |

**Delete / simplify CSS:**

- `lan-connection-panel-root` 2-column grid
- `lan-panel-group--grid`, `--list` layout variants in connection modal context (keep `panel-group.mjs` API but default connection modal to `stack` + single list child)
- Redundant borders on nested `lan-connect-card` inside list group

### 2.5 JS touch map (⇄)

| File | Work |
| --- | --- |
| `panel-render-once.mjs` | Flatten render order: hero → alert → one stack → admin stack |
| `panel-group.mjs` | Optional `appendLanConnectionStack(root)` helper returning stack body |
| `lan-hub-panel-shell.mjs` | Hero status + rooms as stack rows |
| `panel-host-pin.mjs` | Hero PIN + alert strip + toggle rows |
| `panel-diagnostics.mjs` | Summary row only; body unchanged inside disclosure |
| `host-patients-panel.mjs` | Row + ghost Abrir |
| `interno-qr-panel.mjs`, `equipos-qr-panel.mjs` | Chevron stack rows |
| `settings.css` | Hero, alert, stack, `btn-settings-row` styles; remove conflicting grid rules |

---

## 3. Ajustes — structure

Ajustes gets the **same row grammar** as ⇄ but keeps its **split-pane shell** — the left nav is the right pattern for 10+ sections; the problem is panel interiors, not the nav.

Mockup: `.superpowers/brainstorm/lan-settings-redesign/03-ajustes-detail.html`

### 3.1 Shell (mostly unchanged)

| Element | Change |
| --- | --- |
| Centered modal ~820px | **Keep** |
| `settings-split` nav + panels | **Keep** — `settings-dropdown.mjs` split-pane init unchanged |
| Header (Tutoriales / Ayuda / ×) | **Keep** |
| Nav items | **Polish only**: 11px → **12px**, padding 5px → **8px** vertical |
| `settings-clinical-sync-mode` banner | **Keep** above split when visible |

### 3.2 Panel-by-panel

#### Apariencia — **no layout change**

The `settings-form--compact` 2-column grid (Tema, Tamaño, Densidad, Alto contraste, Animaciones) already has clear label → control hierarchy. Only token pass if needed (border radius consistency).

#### Laboratorio

**Today:** hint paragraph + standalone `btn-edit-templates`.

**Target:** one `settings-card-stack` row:

- Title: «Duplicados en historial de labs»
- Subtitle: hint text (one line)
- Right: ghost «Revisar…»

#### Documentos y salida

**Today:** one `settings-card` (carpeta) + loose labels, select, inline checkbox, hidden censo button.

**Target:** single stack:

| Row | Right |
| --- | --- |
| Carpeta de salida + path as subtitle | ghost «Cambiar» |
| Salida rápida + `<select>` inline in action column | — |
| Ocultar «Copiar prompt IA» | toggle |
| Exportar censo PDF (when visible) | ghost «Exportar…» |

Foot hint below stack (`.settings-card-stack__foot`), not between rows.

#### Respaldos, sync y recuperación — **biggest win**

**Today:** two compare cards (good) then a **6-button grid** of identical `btn-edit-templates`, then more buttons stacked vertically — no grouping.

**Target:**

1. **Keep** `settings-data-sync-compare` intro cards at top.
2. **Keep** pre-import restore box when visible (as alert-style inset, not a row).
3. **Section labels** (sentence case, 11px muted, not uppercase): `Exportar`, `Importar`, `Auto-respaldo`, `Catálogo medicamentos`, `Sync entre equipos`.
4. Each group = `settings-card-stack` with titled rows + ghost actions.
5. «Deshacer última operación» = disabled ghost row (subtitle explains limit).
6. «Exportar bitácora» = row in Exportar group or standalone at bottom.

Example Exportar stack rows:

- Copia de seguridad completa → Exportar…
- Paciente actual → Exportar…
- Por rango → Exportar…
- Bitácora → Exportar…

Importar stack mirrors with Importar… actions.

Auto-respaldo: two select rows (frecuencia, retención) + «Generar ahora» ghost row.

#### Rendimiento

**Today:** inline checkbox with `style=`.

**Target:** `settings-card--toggle` row — «Aceleración por hardware (GPU)» + hint as subtitle.

#### Plantillas y flujo de trabajo

**Today:** three sections separated by `<hr>` + buttons.

**Target:** one stack, three rows:

- Administrar plantillas → ghost «Abrir…»
- Búsqueda unificada → ghost «Abrir…»
- Modo enfoque → ghost «Activar» / dynamic label

#### Privacidad y datos

**Target stack:**

- Bloqueo inactividad → `<select>` in action column
- Cambiar PIN → ghost «Cambiar…»
- Carpeta de datos + path → ghost «Abrir carpeta…»
- **Danger zone** (separate small stack or bottom rows): «Borrar datos…» with `btn-settings-row--danger`

#### Aplicación y actualizaciones

**Target:**

- Versión → read-only text in subtitle (no button)
- Canal de actualizaciones → select row
- Telemetría → toggle row
- Buscar actualizaciones → ghost row
- Reinstalar versión actual → ghost row
- Restaurar versión estable → downgrade block stays but buttons become ghost rows inside a stack

#### Expediente

Nav item **hidden** when panel body is empty (`syncSettingsNavVisibility` already supports this).

#### LAN · servidor (admin-only)

When visible: stack rows for team code input row + ghost «Guardar» + danger ghost «Restablecer estado LAN…».

### 3.3 Button migration

| Class | Use in Ajustes |
| --- | --- |
| `btn-settings-row` | Default panel action (ghost, bordered) |
| `btn-settings-row--danger` | Wipe data, LAN host reset |
| `btn-edit-templates` | **Remove** from panel interiors; keep only for modals opened *from* a row if needed |
| `settings-theme-btn` | **Keep** inside Apariencia form only |

### 3.4 Markup cleanup (`settings-dropdown.html`)

- Remove all inline `style=` on checkboxes → `settings-card--toggle`.
- Replace `settings-acc-btn-grid` blocks with `settings-card-stack` sections.
- Replace `settings-acc-btn-stack` vertical button lists with stacks.
- Hidden file inputs stay at bottom of modal (unchanged).

### 3.5 CSS (`settings.css`)

- Add shared `.btn-settings-row` (used by both ⇄ and Ajustes).
- Add `.settings-section-label` for Exportar / Importar group headers inside panels.
- Deprecate or narrow `.settings-acc-btn-grid` rules once markup migrated.
- Ensure `.settings-panel` padding and stack spacing match ⇄ modal (`gap: 8px` between stacks).

---

## 4. CSS additions (`public/styles/settings.css`)

```css
/* New — names finalized in implementation */
.lan-connection-hero { … }
.lan-connection-hero__status { … }
.lan-connection-hero__pin { … }
.lan-pin-code { font-family: var(--font-mono); … }
.lan-alert-strip { background: var(--color-warn-surface); border: 1px solid var(--color-warn-border); … }
.lan-connection-stack { /* extends settings-card-stack */ }
.btn-settings-row { /* ghost: border, no fill, min-height 32px */ }
.btn-settings-row--warn { /* amber border/text */ }
.btn-settings-row--danger { /* existing danger hover tokens */ }
.settings-card__chevron { /* align with disclosure ::after */ }
```

**Dark mode:** all new surfaces use `var(--surface)`, `var(--border)`, `color-mix` — no new hex.

**Density:** respect `var(--density-space)` / `var(--density-font)` on padding.

---

## 5. Accessibility

- Hero status: `role="status"` + `aria-live="polite"` on status line container.
- Stack disclosures: keep native `<details>` / `summary` with `aria-expanded`.
- Toggle rows: `label` wraps copy + associates `input` by `for`/`id`.
- Focus order: modal head → hero actions → stack top-to-bottom.
- Contrast: hero PIN and titles use `var(--text)` not muted; hints stay `var(--text-muted)` ≥ 4.5:1 on `--surface` in dark (verify with HC mode).

---

## 6. Error handling & states

| State | UX |
| --- | --- |
| Offline | Alert strip + Reconectar ghost in strip (not separate card) |
| Two hosts | Warn alert strip; Restablecer warn ghost |
| No PIN / expired | Hero shows muted “Sin PIN activo” + ghost Generar |
| Rank guard cards | Unchanged copy; render **above** hero as single stack row linking to Mi rotación |
| Settings panel hidden | `syncSettingsNavVisibility` unchanged |

No new toast types. Existing `showToast` on copy/PIN actions preserved.

---

## 7. Testing

| Check | How |
| --- | --- |
| Build | `npm run build:ui:check` |
| Debt | `npm run metrics:check` — Tier 1 on touched `.mjs` / CSS |
| LAN wiring | `npm run test:one -- public/js/lan-sync-wiring.test.mjs` |
| Panel unit | `npm run test:one -- public/js/features/lan/panel*.test.mjs` if selectors/assertions touch class names |
| Visual smoke | Desktop dark: (1) Mac as host + PIN, (2) client connected, (3) conflict banner, (4) R1 sala filter, (5) Ajustes → Respaldos scroll, (6) Apariencia toggles |

Update tests only where DOM class names or structure assertions change.

---

## 8. Out of scope

- Tabbed LAN hub (brainstorm option 2)
- Two-column LAN layout (option 3)
- LAN auto-discovery / protocol changes
- Shrinking Ajustes feature set or moving sections to other modals
- Interno mobile web ⇄ panel (inherits tokens only)
- Light-mode-only redesign pass (both themes ship together)

---

## 9. Implementation phases (for plan doc)

| Phase | Deliverable |
| --- | --- |
| **A** | CSS primitives: hero, alert strip, `btn-settings-row`, single-column panel root |
| **B** | ⇄ hero + alert refactor (`lan-hub-panel-shell`, `panel-host-pin`) |
| **C** | ⇄ unified stack migration (render-once + section builders) |
| **D** | Ajustes panel interiors (HTML partial + ghost row buttons) |
| **E** | Polish: nav 12px, remove dead CSS grid rules, visual smoke + metrics |

Phases A–C shippable as one PR; D as second PR or same if small.

---

## 10. Success criteria

1. User can identify **server role + PIN** within 2 seconds of opening ⇄.
2. Right edge of every stack row aligns to one of: chevron, toggle, ghost button, or empty.
3. ≤ **1** solid accent button visible in ⇄ panel at a time (disconnected host CTA exception).
4. Ajustes Respaldos section has no wall of identical purple-outline buttons.
5. `npm run metrics:check` passes; no boot-graph static import additions.

---

## Changelog

- **2026-06-24** — Initial spec from brainstorm; option 1 approved by user.
