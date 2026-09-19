# Spec A — Hybrid H Foundation

> **Program:** [`2026-08-03-apple-hybrid-ui-overhaul-program.md`](2026-08-03-apple-hybrid-ui-overhaul-program.md)  
> **Next:** Spec B (Chrome + Overlay kit)  
> **For implementation:** After approval, **writing-plans** for Foundation only.

**Date:** 2026-08-03  
**Status:** Draft for review  
**Depends on:** Nothing (first phase)

---

## Problem

Hallmark tokens (`Quiet workbench`) optimize for utilitarian density but:

- Brand accent indigo (`#4a52e8`) fights Apple-like calm and night guardia.
- Materials are flat/Rams; floating layers already use weak glass inconsistently.
- Dark (`html.dark`) exists but was not designed as a peer to light under Hybrid H.
- Motion helpers (`ui-motion.mjs`) cover shake/overlay close but lack interruptible springs for sheets.

## Goals

- [ ] Hybrid H token set for **light and dark** (and keep high-contrast variants coherent).
- [ ] Material tokens: `--material-solid-*`, `--material-glass-*` (light/dark).
- [ ] Emil easing tokens + press scale convention documented in `design.md`.
- [ ] Install **`motion`**; wire a thin façade in `ui-motion.mjs` (no feature UI yet).
- [ ] `prefers-reduced-motion` / `prefers-reduced-transparency` / `prefers-contrast` mapped to token overrides.
- [ ] Zero feature layout redesign in this phase — app must look acceptable after token swap alone.

## Non-goals

- Sidebar/tabs visual redesign (Spec B).
- Toast/sheet behavior upgrades (Spec B).
- Labs/Pase restyle (Spec C).
- Changing IBM Plex Mono for lab numeric columns (keep mono for values).

---

## Typography

| Role | Stack | Notes |
| --- | --- | --- |
| UI / chrome | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif` | Optical sizing on; tracking tighten on large titles (`-0.02em` → `-0.035em`) |
| Labs / registro / valores | Keep `--font-mono` (IBM Plex Mono or current mono token) | Tabular nums |
| Display patient name | System UI, weight 600–650, tight leading | Not a marketing display face |

Update `--font-ui` in `tokens.css`. Do **not** remove Plex font files until Spec B confirms no chrome dependency; can leave loaded unused one release if safer.

---

## Color & materials

### Light (solid workbench)

| Token | Value (target) | Role |
| --- | --- | --- |
| `--color-paper` | `#eceae6` | App gap / outer |
| `--color-surface` | `#f7f6f3` | Sidebar / chrome |
| `--color-content` | `#f2f1ed` | Main content well |
| `--color-elevated` | `#ffffff` | Solid cards / tables |
| `--color-ink` | `#1c1c1e` | Primary text + accent |
| `--color-ink-muted` | `#6c6c70` | Secondary |
| `--color-accent` | `var(--color-ink)` | Actions, active tab |
| `--color-on-accent` | `#ffffff` | Text on ink buttons |
| `--color-danger` | `#d70015` | Alterados (light) |
| `--color-success` | `#248a3d` | LiveSync live, success |

### Dark (solid workbench)

| Token | Value (target) | Role |
| --- | --- | --- |
| `--color-paper` | `#0c0e14` | Outer |
| `--color-surface` | `#14161e` | Sidebar |
| `--color-content` | `#0c0e14` | Main well |
| `--color-elevated` | `#1c1e26` | Cards / tables |
| `--color-ink` | `#f5f5f7` | Primary |
| `--color-ink-muted` | `#98989d` | Secondary |
| `--color-accent` | `var(--color-ink)` | Same pattern |
| `--color-on-accent` | `#1c1c1e` | Text on light buttons |
| `--color-danger` | `#ff453a` | Alterados (dark) |
| `--color-success` | `#30d158` | LiveSync live |

### Glass (floating only)

```css
/* light */
--material-glass-bg: color-mix(in oklab, #ffffff 72%, transparent);
--material-glass-blur: 24px;
--material-glass-saturate: 180%;
--material-glass-border: 1px solid color-mix(in oklab, #ffffff 80%, transparent);

/* dark — denser */
--material-glass-bg: color-mix(in oklab, #282a34 78%, transparent);
--material-glass-blur: 28px;
--material-glass-saturate: 160%;
--material-glass-border: 1px solid color-mix(in oklab, #ffffff 12%, transparent);
```

Reduced transparency:

```css
@media (prefers-reduced-transparency: reduce) {
  --material-glass-bg: var(--color-elevated);
  --material-glass-blur: 0px;
}
```

### Retire / remap

- Remap `--color-accent` from indigo `#4a52e8` to ink.
- Keep semantic LiveSync colors; ensure they are not desaturated by glass (status chips sit on **solid** chips, not raw glass).
- Lab header palette tokens may stay for panel section identity; do not use them as app brand accent.

---

## Radius & elevation

| Token | Hybrid H |
| --- | --- |
| `--radius-control` | `8px` (buttons) — drop pill-as-default for primary actions; pills OK for chips |
| `--radius-field` | `8px` |
| `--radius-container` | `12px` |
| `--radius-sheet` | `14px` |
| Shadow on solid cards | Hairline border preferred; soft shadow only on floating glass |

Anti-slop: no gradients on chrome/CTAs; no multi-layer purple glow.

---

## Motion foundation

### Dependency

```bash
npm install motion
```

Use vanilla:

```js
import { animate } from 'motion';
```

### `ui-motion.mjs` façade

Keep existing exports (`prefersReducedMotion`, shake, overlay close helpers). Add:

- `springTo(el, keyframes, { bounce, duration, velocity })` — no-ops / opacity-only when reduced motion.
- `getReleaseVelocity(history)` helper for Spec B sheets.

Do **not** migrate all overlays in Spec A — only the façade + a unit test.

### CSS tokens

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--press-scale: 0.97;
--dur-press: 140ms;
--dur-ui: 200ms;
```

Global press (Spec A can add utility class; Spec B applies broadly):

```css
.ui-pressable:active {
  transform: scale(var(--press-scale));
  transition: transform var(--dur-press) var(--ease-out);
}
```

---

## Files to touch

| Path | Change |
| --- | --- |
| `public/tokens.css` | Hybrid H light/dark/HC materials + easings |
| `design.md` | Replace Hallmark chrome rules with Hybrid H |
| `docs/core/06-design-system.md` | Pointer + summary update |
| `package.json` | Add `motion` |
| `public/js/ui-motion.mjs` (+ test) | Façade for springs |
| `public/styles/` (minimal) | Only if token rename breaks; prefer alias legacy vars |

Legacy aliases (`--action`, `--surface`, `--text`, …) **must keep working** for one phase by pointing at new tokens — Spec A is token-level, not a class rename sweep.

---

## Testing

- `npm run test:one -- public/js/ui-motion.test.mjs`
- Manual: toggle `html.dark` / high-contrast; spot-check Labs alterados contrast.
- `npm run metrics:check` — no boot-graph debt from `motion` if imported only from `ui-motion.mjs` (ensure not static-imported from `app.js` cold path beyond existing motion imports).

## Rollout

1. Land tokens + aliases.
2. Add `motion` + façade tests.
3. Update `design.md` / design-system doc.
4. Visual smoke light/dark on shell as-is (expect accent shift to ink immediately).

## Open questions

None blocking — indigo retirement is explicit. If a clinical team color relied on accent indigo for non-brand meaning, remap that usage in Spec B/C when found.
