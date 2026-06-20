# Hallmark v5 — “Chart desk” UI proposal

**Date:** 2026-06-20  
**Status:** Proposal — not approved  
**Audience:** Product + implementers  
**Builds on:** Quiet workbench (v4), UI audit tracks 1–4 + 1.5  
**North star check:** Shortens TTD, preserves density, no cloud/EMR creep

---

## Why it still looks the same

Tracks 1–4 fixed **plumbing** (tokens, z-index, empty states, radius debt). They deliberately avoided changing the **visual identity**. v5 is the first pass meant to read as “new UI” on first open while keeping the same workbench layout (sidebar + tabs).

---

## Recommended direction: **Chart desk**

**One-line:** A hospital chart on a desk — flat paper, ink hierarchy, accent only where you act; shadow only where something floats.

**Not:** SaaS dashboard, glass chrome, purple gradients, marketing hero, pill-everything.

```text
  Today (Quiet workbench)          v5 (Chart desk)
  ─────────────────────          ────────────────
  Soft gray shell + white cards  Warm paper + bordered panels
  Shadow = hierarchy             Border + spacing = hierarchy
  Indigo everywhere (tabs, chips) Indigo = actions + active only
  Uppercase section labels       Sentence case labels, heavier values
  Arc-rounded shell frame        Tighter frame, sharper grid
```

---

## Visual language (what you will notice)

### 1. Color — warmer paper, quieter accent

| Token | Current | v5 proposal | Effect |
| --- | --- | --- | --- |
| `--color-paper` | `#eceef2` cool gray | `#e8e4df` warm stone | App feels like paper, not SaaS |
| `--color-surface` | `#ffffff` | `#faf9f7` | Cards slightly off-white on paper |
| `--color-ink` | `#1a2332` | `#1c1917` | Warmer black (stone ink) |
| `--color-accent` | `#4a52e8` saturated indigo | `#3d4f9e` desaturated slate-indigo | Less “product blue” |
| `--color-accent` usage | tabs, chips, section headers | **primary buttons, active tab, links only** | Chrome calms down |
| `--border` | 9% ink | 12% ink, visible hairlines | Structure without shadow |

Dark theme: keep neutral charcoal (`#0c0e14`), reduce accent glow on inactive chrome.

**Optional micro-texture:** fixed 2% noise on `--color-paper` only (CSS SVG filter or PNG tile, `pointer-events: none`) — breaks digital flatness without gradient slop.

### 2. Typography — values loud, labels quiet

Keep **IBM Plex Sans / Mono** (already differentiated; no font migration cost).

| Role | Current | v5 |
| --- | --- | --- |
| Section labels | 12.5px bold **UPPERCASE** | 11.5px **medium**, sentence case, `letter-spacing: 0.01em` |
| Patient name (banner) | ~17px | **20px semibold**, `text-wrap: balance` |
| Bed / expediente meta | mixed | **IBM Plex Mono** tabular, 13px |
| Lab values | mono | mono + **semibold** when altered/critical |
| Body | 13.5px | 13.5px (unchanged — density preserved) |

Clinical uppercase (SOME paste, HC narrative) **unchanged**.

### 3. Surfaces — border-first cards

```css
/* v5 card (replaces shadow-first) */
.card-v5 {
  background: var(--color-surface);
  border: var(--border-hairline);
  box-shadow: none;
}
.card-v5:hover {
  border-color: color-mix(in oklab, var(--color-accent) 22%, var(--border));
  /* no lift shadow */
}
.card-v5.is-active {
  border-color: color-mix(in oklab, var(--color-accent) 45%, var(--border));
  box-shadow: inset 3px 0 0 var(--color-accent);
}
```

- **Floating only:** modals, ⌘K, dropdowns, toasts (keep glass + `--elev-overlay`).
- **Lab section headers:** keep semantic tone colors; flatten to **left stripe 3px** + neutral header bg instead of full-width saturated bar.

### 4. Layout — same bones, clearer focus

No sidebar → top-nav (anti-goal for census workflow).

**Changes that read visually:**

| Area | v5 change |
| --- | --- |
| **Header** | 2px bottom border in `--divider`; patient context chip always visible when selected (bed mono + name truncate) |
| **Sidebar** | Patient cards: **bed number dominant** (mono 14px), name secondary; priority = **left rail 3px** (critical/unstable/stable) — extend existing bed-first cards |
| **Tabs** | Active tab: ink text + 2px accent underline; inactive: muted, no background pill |
| **Main scroll** | Slightly more vertical rhythm (+4px gap multiplier on `--density-space`) in Normal mode only |
| **Pase / Guardia** | Board cells: hairline grid, less card shadow; critical row gets ink border not pulse (unless reduced-motion off) |

### 5. Components — signature moments

These are the “screenshots for the team” targets:

1. **Census sidebar** — bed-first, rail color, selected state inset accent (see wire below).
2. **Lab workbench** — flat panels, tone stripe headers, altered values in amber/red mono.
3. **Empty states** — small 24px SVG line icon (clipboard, chart) + existing title/lead (Track 2).
4. **LiveSync header** — thin status bar under header (2px): green/amber/gray; Wi‑Fi icon stays but bar is the at-a-glance signal.
5. **⌘K** — unchanged behavior; slightly tighter list density, accent on matched substring.

---

## Wireframes (ASCII)

### Sidebar patient card (v5)

```text
┌─ sidebar ─────────────┐
│ ▎ 402-A    ← mono bed │  ← 3px rail (critical=red, unstable=amber)
│   García López, Ana   │  ← 13px name, 2-line clamp
│   Dx: Neumonía…       │  ← 11px muted
└───────────────────────┘
   selected: inset accent bar + paper bg, no shadow lift
```

### Header + status strip

```text
┌─ R+ ── [Sala|IC|Guardia|Pase] ──────── ⇄ ⚙ ─┐
│ 402-A · García López · NAC                  │
├──────────────────────────────────────────────┤ ← 2px livesync bar (live=green)
│ Laboratorio │ Expediente │ Manejo │ …        │
└──────────────────────────────────────────────┘
```

### Lab card header (v5)

```text
┌──┬──────────────────────────────────────┐
│█ │ Biometría hemática          [actions]│  ← 3px tone stripe, not full fill
├──┴──────────────────────────────────────┤
│  Hb  7.2 ↓     Hto  22                  │  ← altered = mono semibold + flag
└─────────────────────────────────────────┘
```

---

## Preview mechanism (implement before full rollout)

Add opt-in flag — no big-bang rewrite:

```html
<html class="ui-v5-preview">
```

- Toggle in **Ajustes → Apariencia**: “Vista previa: Chart desk (v5)”
- Persists `localStorage` key `rpc-ui-v5-preview`
- All v5 rules scoped under `html.ui-v5-preview` in new file `public/styles/v5-chart-desk.css` (loaded after `soft-ui.css`)
- Allows side-by-side comparison with one click

---

## Phased delivery (visible impact per phase)

| Phase | Scope | Visible win | Risk |
| --- | --- | --- | --- |
| **v5.0 Tokens + preview flag** | `tokens.css` v5 overrides, preview CSS, Ajustes toggle | Paper warmer, accent calmer | Low |
| **v5.1 Chrome** | header, tabs, livesync strip, sidebar cards | **First “new app” impression** | Low |
| **v5.2 Work panes** | lab cards, expediente sections, EA panel | Daily workflow looks refreshed | Medium |
| **v5.3 Boards** | Pase, Guardia, interno/mobile token pass | Turn board feels cohesive | Medium |
| **v5.4 Default on** | flip default, keep v4 escape hatch 1 release | — | Low if preview baked |

Each phase: `npm run build:ui`, light/dark/HC smoke, `metrics:check`, no clinical logic.

---

## Alternative directions (pick if Chart desk feels too plain)

### Alt B — **“Night shift”** (dark-first)

- Default dark for guardia hours; paper mode for sala day shift.
- Higher contrast borders, dimmer accent, amber for altered labs only.
- Best if team mostly runs `html.dark` already.

### Alt C — **“Compact ink”** (minimal motion)

- v5 surfaces but **no hover lift anywhere**; keyboard-first density.
- Best for R1 users who want zero animation and maximum rows on screen.

**Recommendation:** Chart desk (A) — warm light default matches hospital printed chart metaphor; dark theme inherits same border-first rules.

---

## Explicitly out of scope (v5)

- Layout paradigm change (sidebar removal, three-column marketing grid)
- New font family / icon library dependency
- Gradients on CTAs or cards
- Illustration-heavy empty states or onboarding redesign
- Clinical logic, parser, or sync changes
- Replacing grouped expediente tabs (already shipped in premium UI phase 2)

---

## Success criteria (you’ll know it worked)

1. **5-second test:** resident opens app and says “looks different” before selecting a patient.
2. **Accent pixel count:** indigo area on screen ↓ ~40% vs v4 (measure on Lab + Expediente screenshot).
3. **Shadow count:** card `box-shadow` on main work scroll ↓ ~80%; borders visible at glance.
4. **No TTD regression:** same clicks to paste SOME → export note.
5. **HC / dark / reduce-motion:** all pass contrast spot-check.

---

## Decision needed from you

1. **Direction:** Chart desk (recommended) vs Night shift vs Compact ink?
2. **Preview first?** Yes — v5.0 toggle before changing defaults (recommended).
3. **Warm vs cool paper:** warm stone `#e8e4df` vs keep cool `#eceef2` with border-first only?

Once approved, next artifact is implementation plan `docs/superpowers/plans/2026-06-20-hallmark-v5-chart-desk.md` (v5.0 preview flag + token overrides only, ~1 session).
