# Apple Hybrid UI — Spec B Chrome + Overlay Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle shell chrome to Hybrid H and ship an ESM overlay kit (dialog / sheet / menu) plus Sonner-grade toasts and instant ⌘K — no React libs.

**Architecture:** `ui-overlay.mjs` owns focus trap, Esc/backdrop via existing `modal-dismiss.mjs`, and sheet drag+velocity via `springTo`/`getReleaseVelocity` from Spec A. CSS utilities `.material-glass` / `.material-solid-elevated` in new `ui-overlay.css`. Migrate toast + ⌘K + one representative dialog + one demo sheet; leave obscure modals on legacy markup (token colors already from A).

**Tech Stack:** Vanilla ESM, `motion` via `ui-motion.mjs`, `public/styles/{sidebar,layout,settings,overlays,cmdk,lab}.css`, `node --test` via `npm run test:one`.

**Depends on:** Spec A landed (`tokens.css` Hybrid H, `springTo`, `.ui-pressable`).  
**Spec:** [`../specs/2026-08-03-apple-hybrid-ui-chrome-overlays-design.md`](../specs/2026-08-03-apple-hybrid-ui-chrome-overlays-design.md)

**Out of scope:** Labs/Pase/Eventualidades sheet migration (C), Expediente/EA (D), React packages.

---

## File map

| File | Role |
| --- | --- |
| `public/js/ui-overlay.mjs` (+ `.test.mjs`) | dialog / sheet / menu primitives |
| `public/styles/ui-overlay.css` | material utilities + sheet/dialog/menu chrome |
| `public/js/ui-toast.mjs` (+ new `.test.mjs`) | swipe, pause on hidden, glass, optional action |
| `public/js/features/command-palette.mjs` + `cmdk.css` | zero open/close anim; glass panel |
| `public/styles/sidebar.css`, `layout.css`, `settings.css`, `overlays.css` | Hybrid H chrome |
| `public/index.src.html` (or CSS link list) | link `ui-overlay.css` |
| Demo sheet stub | minimal HTML+JS proving drag dismiss (e.g. settings subsection or `#hybrid-sheet-demo`) |

---

### Task 1: `ui-overlay` utilities CSS + link

**Files:**
- Create: `public/styles/ui-overlay.css`
- Modify: `public/index.src.html` (add stylesheet after `overlays.css`)

- [ ] **Step 1: Create CSS**

```css
/* Hybrid H · Spec B overlay kit — keep ≤600 lines */
.material-glass {
  background: var(--material-glass-bg);
  backdrop-filter: blur(var(--material-glass-blur)) saturate(var(--material-glass-saturate, 180%));
  -webkit-backdrop-filter: blur(var(--material-glass-blur)) saturate(var(--material-glass-saturate, 180%));
  border: var(--material-glass-border);
}
.material-solid-elevated {
  background: var(--color-elevated);
  border: var(--border-hairline);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.ui-overlay-scrim {
  background: var(--scrim-bg);
}
.ui-overlay-dialog {
  border-radius: var(--radius-container);
  transform-origin: center center;
}
.ui-overlay-sheet {
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  touch-action: none;
}
.ui-overlay-sheet__handle {
  width: 36px;
  height: 4px;
  margin: 8px auto 4px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-ink) 22%, transparent);
}
.ui-overlay-menu {
  border-radius: var(--radius-container);
  transform-origin: var(--ui-overlay-origin, top left);
}
.ui-overlay-nested {
  /* force solid for nested overlays */
  background: var(--color-elevated) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
```

- [ ] **Step 2: Link in `public/index.src.html`** after overlays.css, then `npm run build:ui`.

- [ ] **Step 3: Commit** `feat(ui): Hybrid H material-glass overlay CSS utilities`

---

### Task 2: `ui-overlay.mjs` — tests first

**Files:**
- Create: `public/js/ui-overlay.test.mjs`
- Create: `public/js/ui-overlay.mjs`

- [ ] **Step 1: Write failing tests** covering:
  - `openDialog` stores previous focus and restores on close
  - Esc closes top layer (integrates `modal-dismiss` or internal stack)
  - Nested open applies `.ui-overlay-nested` / `.material-solid-elevated` on inner panel (not second glass)
  - Reduced motion: dialog open does not use scale spring (opacity only / instant end)
  - `openSheet` exposes `close()` and respects `prefersReducedMotion` (no slide)

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDialog, openSheet, openMenu } from './ui-overlay.mjs';
// Use document from Electron-as-Node if available; else skip DOM tests with assert.ok(true) guard.
```

- [ ] **Step 2: Run** `npm run test:one -- public/js/ui-overlay.test.mjs` → FAIL

- [ ] **Step 3: Implement minimal `ui-overlay.mjs`**

API shape:

```js
import { bindBackdropDismiss } from './modal-dismiss.mjs';
import { prefersReducedMotion, springTo, getReleaseVelocity } from './ui-motion.mjs';

/**
 * @param {{ panel: HTMLElement, scrim?: HTMLElement, nested?: boolean, onClose?: () => void }} opts
 * @returns {{ close: (reason?: string) => void }}
 */
export function openDialog(opts) { /* focus trap, scale 0.95→1 or opacity-only, bind dismiss */ }

/**
 * Edge-anchored bottom sheet with pointer drag + velocity dismiss.
 * @param {{ panel: HTMLElement, scrim?: HTMLElement, nested?: boolean, onClose?: () => void, dismissVelocity?: number }} opts
 */
export function openSheet(opts) { /* pointerdown/move/up on handle/panel; springTo; getReleaseVelocity */ }

/** Origin-aware menu/popover */
export function openMenu(opts) { /* set --ui-overlay-origin from trigger getBoundingClientRect */ }
```

Sheet rules: drag 1:1 with pointer capture; rubber-band past 0; on release if velocity ≥ `dismissVelocity` (default `0.11`) or drag > 30% height → dismiss with spring; else spring back. Interruptible: call `controls.stop()` before new `springTo`.

- [ ] **Step 4: Tests PASS** → commit `feat(ui-overlay): dialog/sheet/menu primitives`

---

### Task 3: Upgrade `ui-toast.mjs` (Sonner principles)

**Files:**
- Modify: `public/js/ui-toast.mjs`
- Create: `public/js/ui-toast.test.mjs`
- Modify: toast CSS in `public/styles/lab.css` (and/or move glass rules to `ui-overlay.css`)

- [ ] **Step 1: Failing tests**
  - stack cap 3 (4th drops oldest)
  - `document.hidden` pauses timer (fake timers or inject clock)
  - swipe: synthetic pointer history with `getReleaseVelocity` ≥ 0.11 calls dismiss
  - optional `action: { label: 'Deshacer', onClick }` renders button

- [ ] **Step 2: Implement**
  - Glass: toast panel classes include `material-glass`
  - Enter/exit via CSS transitions on transform+opacity (same axis, e.g. `translateY`), not keyframe-only if interruptible
  - Pause on `mouseenter` / `document.visibilitychange`
  - Keep max stack 3

- [ ] **Step 3: PASS + commit** `feat(toast): Hybrid H glass + swipe dismiss + pause on hidden`

---

### Task 4: ⌘K — zero animation + glass

**Files:**
- Modify: `public/js/features/command-palette.mjs`
- Modify: `public/styles/cmdk.css`
- Modify: `public/js/ui-motion.mjs` usage — **stop calling** `closeOverlayAnimated` for ⌘K (instant hide)

- [ ] **Step 1: Open/close must be instant**
  - Remove enter/exit animation classes on `.cmdk` / `.cmdk-backdrop`
  - On close: set `hidden` immediately; do not use `closeOverlayAnimated`
  - Add test file `public/js/features/command-palette-motion.test.mjs` that reads source or exercises open/close flags asserting no `overlay-anim-out` / transition duration 0

```js
// Source guard (simple, stable):
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'command-palette.mjs'), 'utf8');
assert.equal(src.includes('closeOverlayAnimated'), false);
```

- [ ] **Step 2: CSS** — `.cmdk` uses `.material-glass` (or equivalent tokens); result rows solid elevated / opaque for legibility

- [ ] **Step 3: Commit** `fix(cmdk): instant open/close + Hybrid H glass panel`

---

### Task 5: Shell chrome — sidebar, tabs, LiveSync, titlebar

**Files:**
- Modify: `public/styles/sidebar.css`, `layout.css`, `settings.css`, `overlays.css`

- [ ] **Step 1: Sidebar** — solid `--color-surface`; active patient left bar `2.5px` ink + subtle `--color-accent-soft` fill (remove indigo-looking washes)

- [ ] **Step 2: Tabs** — 2px ink underline active; no floating pill; no motion on keyboard tab (verify no transition on `[role=tab]` selection if present)

- [ ] **Step 3: LiveSync** — `.btn-livesync-header` solid chip bg; semantic colors from tokens; readable light+dark

- [ ] **Step 4: Titlebar** — keep `--titlebar-traffic-gap`; system type already from A

- [ ] **Step 5: Apply `.ui-pressable`** to primary header/sidebar icon buttons (high-traffic only)

- [ ] **Step 6: Commit** `style(chrome): Hybrid H sidebar tabs LiveSync chip`

---

### Task 6: Migrate one dialog + demo sheet

**Files:**
- Pick one high-traffic dialog already using backdrop (e.g. recovery modal or settings subsection) — wire close/focus through `openDialog` **or** thin wrapper that adds material classes without full rewrite
- Add minimal demo sheet: button in Ajustes → “Probar sheet” (dev-only OK) OR hidden test harness invoked from console `window.__hybridDemoSheet()`

- [ ] **Step 1: Representative dialog** gets `material-glass` on panel; nested child uses solid

- [ ] **Step 2: Demo sheet** uses `openSheet`; prove drag + velocity dismiss manually

- [ ] **Step 3: Optionally route `closeOverlayAnimated` non-⌘K callers through spring when motion allowed (keep API); do not break existing modals

- [ ] **Step 4: Commit** `feat(ui-overlay): migrate sample dialog + demo sheet`

---

### Task 7: Verify Spec B

- [ ] `npm run test:one -- public/js/ui-overlay.test.mjs public/js/ui-toast.test.mjs public/js/features/command-palette-motion.test.mjs public/js/modal-dismiss.test.mjs`
- [ ] `npm run build:ui`
- [ ] `npm run metrics:check`
- [ ] Manual: light/dark shell; toast swipe; ⌘K instant; demo sheet interrupt mid-close
- [ ] Changelog: `hybrid-h-chrome`: overlay kit + toast/⌘K/shell — update `project-context.mdc`
- [ ] Commit docs/context if needed

---

## Self-review

| Spec B goal | Task |
| --- | --- |
| Shell/sidebar/tabs/LiveSync Hybrid H | 5 |
| `ui-overlay.mjs` primitives | 1–2 |
| Toast Sonner-grade | 3 |
| ⌘K zero anim + glass | 4 |
| Pressable chrome | 5 |
| One sheet spring dismiss | 6 |
| No React deps | all |
| Eventualidades full sheet = C not B | 6 demo only |
