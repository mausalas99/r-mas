# Design System Foundation (Premium UI Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the token-level design system (elevation, typography, glass overlays, motion engine with user-selectable intensity) that every later UI phase consumes.

**Architecture:** Everything lands in the existing CSS-custom-property system: `public/tokens.css` defines tokens for all four theme contexts (light, `html.dark`, `html.high-contrast`, `html.high-contrast.dark`); a new `public/styles/overlays.css` applies the glass treatment to existing overlay selectors; a new pure module `public/js/motion-mode.mjs` + wiring in `public/js/features/chrome.mjs` implements the Sobrio/Mixto/Expresivo setting following the exact pattern of the existing theme/density settings.

**Tech Stack:** Vanilla CSS custom properties (oklab `color-mix`), vanilla ESM, `node:test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-10-premium-ui-audit-remediation-design.md` (Phase 1 section).

**Critical context for the implementer:**
- `public/index.html` is GENERATED from `public/index.src.html` + `public/partials/` by `npm run build:ui`. Never edit `public/index.html` directly; always edit the source and rebuild.
- `npm test` runs a HAND-MAINTAINED file list in `package.json` (glob discovery arrives in a later phase). Any new `*.test.mjs` file MUST be appended to that list or it will never run.
- The app boots with `npm start` (Electron). For quick visual checks, `node server.js` + browser on `http://localhost:3738` also works.
- Settings pattern to copy (in `public/js/features/chrome.mjs`): localStorage key `rpc-<thing>` → `get<Thing>()` / `apply<Thing>()` / `set<Thing>()` / `sync<Thing>Buttons()` → strings in the `I18N_ES` map → onclick globals via the `windowHandlers` export → applied at boot inside `initChromeAppearance()` (chrome.mjs:389).

---

### Task 1: Elevation + interaction-state tokens

**Files:**
- Modify: `public/tokens.css`

- [ ] **Step 1: Add elevation/state tokens to the light theme**

In `public/tokens.css`, inside the `:root` block, directly after the existing `--shadow-md` line (~line 73):

```css
  /* Elevation scale (premium UI phase 1) — flat / raised / floating / overlay */
  --elev-flat: none;
  --elev-raised: 0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.06);
  --elev-floating: 0 6px 22px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(15, 23, 42, 0.05);
  --elev-overlay: 0 18px 48px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.08);
  --border-hairline: 1px solid color-mix(in oklab, var(--color-ink) 9%, transparent);
  /* Interaction-state fills, layered over any surface */
  --state-hover-bg: color-mix(in oklab, var(--color-ink) 4%, transparent);
  --state-active-bg: color-mix(in oklab, var(--color-ink) 7%, transparent);
  --focus-ring: 0 0 0 3px var(--color-focus-ring);
```

- [ ] **Step 2: Add dark-theme overrides**

Inside the `html.dark` block, directly after its `--shadow-md` line (~line 145):

```css
  --elev-raised: 0 1px 3px rgba(0, 0, 0, 0.35);
  --elev-floating: 0 8px 26px rgba(0, 0, 0, 0.38), 0 2px 6px rgba(0, 0, 0, 0.24);
  --elev-overlay: 0 18px 52px rgba(0, 0, 0, 0.55), 0 4px 14px rgba(0, 0, 0, 0.35);
  --border-hairline: 1px solid rgba(148, 163, 184, 0.16);
  --state-hover-bg: color-mix(in oklab, var(--color-ink) 6%, transparent);
  --state-active-bg: color-mix(in oklab, var(--color-ink) 10%, transparent);
```

- [ ] **Step 3: Add high-contrast overrides (shadows off, states visible)**

Inside `html.high-contrast`, after its `--shadow-sm: none;` line (~line 192):

```css
  --elev-flat: none;
  --elev-raised: none;
  --elev-floating: none;
  --elev-overlay: none;
  --border-hairline: 1px solid var(--border);
  --state-hover-bg: color-mix(in oklab, var(--color-accent) 12%, transparent);
  --state-active-bg: color-mix(in oklab, var(--color-accent) 20%, transparent);
```

(`html.high-contrast.dark` inherits these from `html.high-contrast`; no extra block needed because the values reference variables that the dark HC block already overrides.)

- [ ] **Step 4: Verify build + no visual regression**

Run: `npm run build:ui && node server.js` then open `http://localhost:3738`.
Expected: app renders identically (tokens are defined but unconsumed). Toggle dark mode and high contrast via the header buttons — no console errors.

- [ ] **Step 5: Commit**

```bash
git add public/tokens.css public/index.html
git commit -m "feat(design-system): elevation, hairline, state and focus tokens for all themes"
```

---

### Task 2: Typography scale tokens + tabular numerals

**Files:**
- Modify: `public/tokens.css`
- Modify: `public/styles/base.css`
- Modify: `public/styles/lab.css`

- [ ] **Step 1: Add type-scale tokens**

In `public/tokens.css` `:root`, after the `--font-mono` line (~line 94):

```css
  /* Type scale (font shorthand: weight size/line-height family) */
  --type-display: 600 calc(22px * var(--density-font)) / 1.25 var(--font-ui);
  --type-title: 600 calc(17px * var(--density-font)) / 1.3 var(--font-ui);
  --type-section: 700 calc(12.5px * var(--density-font)) / 1.35 var(--font-ui);
  --type-body: 400 calc(13.5px * var(--density-font)) / 1.5 var(--font-ui);
  --type-caption: 500 calc(11.5px * var(--density-font)) / 1.4 var(--font-ui);
  --tracking-section: 0.04em;
```

- [ ] **Step 2: Add utility classes in base.css**

At the end of `public/styles/base.css`:

```css
/* ── Type scale utilities (design system phase 1) ────────── */
.type-display { font: var(--type-display); }
.type-title { font: var(--type-title); }
.type-section { font: var(--type-section); letter-spacing: var(--tracking-section); text-transform: uppercase; }
.type-body { font: var(--type-body); }
.type-caption { font: var(--type-caption); color: var(--text-muted); }
.num-tabular { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 3: Find the lab output containers**

Run: `grep -n "lab-output\|lab-history" public/styles/lab.css | head -20`
Expected: selectors like `#lab-output` / `.lab-output-*` / `#lab-history-body` exist. Use the top-level container selectors found.

- [ ] **Step 4: Apply tabular numerals to clinical number surfaces**

At the end of `public/styles/lab.css` (adjust selector list to what Step 3 found — the intent is: lab report output, lab history, and trends render numbers with aligned digits):

```css
/* Aligned digits for clinical values (design system phase 1) */
#lab-output,
#lab-history-body,
.tend-card,
.tend-detail-body {
  font-variant-numeric: tabular-nums;
}
```

Verify `.tend-card` exists: `grep -rn "tend-card" public/styles/*.css | head -3`. If trends styles live in another file (e.g. `expediente.css`), put the `.tend-*` selectors there instead.

- [ ] **Step 5: Verify + commit**

Run: `npm run build:ui && node server.js`, paste any lab report in Laboratorio, process, confirm digits align in columns and nothing else shifted.

```bash
git add public/tokens.css public/styles/base.css public/styles/lab.css public/index.html
git commit -m "feat(design-system): type scale tokens and tabular numerals for clinical values"
```

---

### Task 3: Motion preset tokens (CSS side)

**Files:**
- Modify: `public/tokens.css`
- Modify: `public/styles/motion.css`

- [ ] **Step 1: Extend motion tokens (Mixto = defaults)**

In `public/tokens.css` `:root`, replace:

```css
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 150ms;
  --dur-normal: 220ms;
```

with:

```css
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-fast: 150ms;
  --dur-normal: 220ms;
  --dur-slow: 320ms;
```

- [ ] **Step 2: Add preset classes at the end of tokens.css**

```css
/* ── Motion presets (Ajustes → Animaciones). Mixto = :root defaults ── */
html.motion-sobrio {
  --dur-fast: 100ms;
  --dur-normal: 160ms;
  --dur-slow: 200ms;
  --ease-spring: var(--ease-out);
}

html.motion-expresivo {
  --dur-fast: 170ms;
  --dur-normal: 260ms;
  --dur-slow: 380ms;
}

@media (prefers-reduced-motion: reduce) {
  html,
  html.motion-sobrio,
  html.motion-expresivo {
    --dur-fast: 1ms;
    --dur-normal: 1ms;
    --dur-slow: 1ms;
    --ease-spring: linear;
  }
}
```

(The `html,` selectors inside the media query are required: `html.motion-expresivo` outspecifies `:root`, so the reduce-motion override must match at equal-or-higher specificity.)

- [ ] **Step 3: Sobrio kills springs in motion.css**

At the end of `public/styles/motion.css`:

```css
/* Sobrio: spring-flavored animations degrade to simple fades */
html.motion-sobrio .field-shake {
  animation-duration: 0.2s;
}
html.motion-sobrio .todo-prio-chip.todo-prio-chip--pulse {
  animation: none;
}
```

- [ ] **Step 4: Verify + commit**

Run: `npm run build:ui && node server.js`. In DevTools console: `document.documentElement.classList.add('motion-sobrio')` → interactions feel snappier (e.g., settings dropdown). Remove the class, add `motion-expresivo` → slightly more easeful. No layout change in either.

```bash
git add public/tokens.css public/styles/motion.css public/index.html
git commit -m "feat(design-system): motion preset tokens (sobrio/mixto/expresivo) with reduced-motion override"
```

---

### Task 4: motion-mode.mjs pure module (TDD)

**Files:**
- Create: `public/js/motion-mode.mjs`
- Create: `public/js/motion-mode.test.mjs`
- Modify: `package.json` (test list)

- [ ] **Step 1: Write the failing test**

Create `public/js/motion-mode.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOTION_MODES, ALL_MOTION_CLASSES, normalizeMotionMode, motionClassFor } from './motion-mode.mjs';

test('MOTION_MODES lists the three presets', () => {
  assert.deepEqual(MOTION_MODES, ['sobrio', 'mixto', 'expresivo']);
});

test('normalizeMotionMode passes valid modes through', () => {
  assert.equal(normalizeMotionMode('sobrio'), 'sobrio');
  assert.equal(normalizeMotionMode('mixto'), 'mixto');
  assert.equal(normalizeMotionMode('expresivo'), 'expresivo');
});

test('normalizeMotionMode defaults everything else to mixto', () => {
  assert.equal(normalizeMotionMode(null), 'mixto');
  assert.equal(normalizeMotionMode(undefined), 'mixto');
  assert.equal(normalizeMotionMode(''), 'mixto');
  assert.equal(normalizeMotionMode('full'), 'mixto');
  assert.equal(normalizeMotionMode(42), 'mixto');
});

test('motionClassFor maps mixto to null and others to html classes', () => {
  assert.equal(motionClassFor('mixto'), null);
  assert.equal(motionClassFor('sobrio'), 'motion-sobrio');
  assert.equal(motionClassFor('expresivo'), 'motion-expresivo');
  assert.equal(motionClassFor('garbage'), null);
});

test('ALL_MOTION_CLASSES covers every non-default class', () => {
  assert.deepEqual(ALL_MOTION_CLASSES, ['motion-sobrio', 'motion-expresivo']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test public/js/motion-mode.test.mjs`
Expected: FAIL — `Cannot find module ... motion-mode.mjs`

- [ ] **Step 3: Write the implementation**

Create `public/js/motion-mode.mjs`:

```js
/**
 * Motion intensity presets (Ajustes → Animaciones).
 * 'mixto' is the default and maps to no html class (:root token values).
 */
export const MOTION_MODES = ['sobrio', 'mixto', 'expresivo'];
export const ALL_MOTION_CLASSES = ['motion-sobrio', 'motion-expresivo'];

export function normalizeMotionMode(raw) {
  return MOTION_MODES.includes(raw) ? raw : 'mixto';
}

export function motionClassFor(mode) {
  const m = normalizeMotionMode(mode);
  return m === 'mixto' ? null : 'motion-' + m;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test public/js/motion-mode.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Register the test file in package.json**

In `package.json`, the `test` script is one long `node --test <files…>` string. Insert `public/js/motion-mode.test.mjs ` immediately after `node --test ` (start of the list). Verify: `npm test 2>&1 | grep motion-mode` shows the file ran.

- [ ] **Step 6: Commit**

```bash
git add public/js/motion-mode.mjs public/js/motion-mode.test.mjs package.json
git commit -m "feat(design-system): motion-mode module with normalization and class mapping"
```

---

### Task 5: Motion setting in Ajustes (wiring + UI)

**Files:**
- Modify: `public/js/features/chrome.mjs`
- Modify: `public/partials/chrome/header.html`

- [ ] **Step 1: Inspect the existing theme-buttons markup**

Run: `sed -n '63,80p' public/partials/chrome/header.html`
Note the exact container class around `settings-theme-light` / `settings-theme-dark` (a row div inside the "Apariencia" `<details class="settings-accordion">`). The new control copies that structure.

- [ ] **Step 2: Add chrome.mjs wiring**

In `public/js/features/chrome.mjs`:

(a) At the top, after the existing imports (if the file has none, add as the first lines):

```js
import { normalizeMotionMode, motionClassFor, ALL_MOTION_CLASSES } from '../motion-mode.mjs';
```

(b) Next to the other LS constants (~line 34):

```js
const MOTION_MODE_LS = 'rpc-motion-mode';
```

(c) In the `I18N_ES` map, after the `settings.hcOn` entry:

```js
  'settings.motion': 'Animaciones',
  'settings.motionHint': 'Sobrio: mínimas · Mixto: equilibrado (recomendado) · Expresivo: completas.',
  'settings.motionSobrio': 'Sobrio',
  'settings.motionMixto': 'Mixto',
  'settings.motionExpresivo': 'Expresivo',
```

(d) After the `toggleHighContrast` function (~line 194):

```js
export function getMotionMode() {
  return normalizeMotionMode(localStorage.getItem(MOTION_MODE_LS));
}

export function applyMotionMode() {
  const cls = motionClassFor(getMotionMode());
  ALL_MOTION_CLASSES.forEach((c) => document.documentElement.classList.remove(c));
  if (cls) document.documentElement.classList.add(cls);
}

export function syncMotionButtons() {
  const mode = getMotionMode();
  ['sobrio', 'mixto', 'expresivo'].forEach((m) => {
    const btn = document.getElementById('settings-motion-' + m);
    if (btn) {
      btn.classList.toggle('active', m === mode);
      btn.setAttribute('aria-pressed', m === mode ? 'true' : 'false');
    }
  });
}

export function setMotionMode(mode) {
  localStorage.setItem(MOTION_MODE_LS, normalizeMotionMode(mode));
  applyMotionMode();
  syncMotionButtons();
}
```

(e) Inside `initChromeAppearance()` (chrome.mjs:389), after `applyHighContrast();`:

```js
  applyMotionMode();
```

and after `syncHighContrastButtons();`:

```js
  syncMotionButtons();
```

(f) In the `windowHandlers` export at the bottom, after `toggleHighContrast,`:

```js
  setMotionMode,
```

- [ ] **Step 3: Add the Ajustes control**

In `public/partials/chrome/header.html`, inside the "Apariencia" accordion, after the high-contrast button group (search for `settings-hc-on` and insert after its closing row `</div>`), matching the container classes observed in Step 1:

```html
          <div class="profile-field-label settings-acc-label-spaced" data-i18n="settings.motion">Animaciones</div>
          <p class="overview-hint settings-acc-hint" data-i18n="settings.motionHint">Sobrio: mínimas · Mixto: equilibrado (recomendado) · Expresivo: completas.</p>
          <div class="settings-theme-row">
            <button type="button" class="settings-theme-btn" id="settings-motion-sobrio" onclick="setMotionMode('sobrio')" data-i18n="settings.motionSobrio">Sobrio</button>
            <button type="button" class="settings-theme-btn" id="settings-motion-mixto" onclick="setMotionMode('mixto')" data-i18n="settings.motionMixto">Mixto</button>
            <button type="button" class="settings-theme-btn" id="settings-motion-expresivo" onclick="setMotionMode('expresivo')" data-i18n="settings.motionExpresivo">Expresivo</button>
          </div>
```

(If Step 1 showed a different row/button class than `settings-theme-row`/`settings-theme-btn`, use what the theme buttons actually use.)

- [ ] **Step 4: Verify end to end**

Run: `npm run build:ui && npm start`
- Ajustes (gear) → Apariencia shows "Animaciones" with Mixto active by default.
- Click Sobrio → `document.documentElement.className` includes `motion-sobrio`; localStorage `rpc-motion-mode` = `sobrio`; dropdowns/transitions feel faster.
- Restart the app → Sobrio persists, button state correct.
- Click Mixto → class removed.
- Run `npm test` → all green.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/chrome.mjs public/partials/chrome/header.html public/index.html
git commit -m "feat(design-system): motion intensity setting (sobrio/mixto/expresivo) in Ajustes"
```

---

### Task 6: Glass overlay treatment

**Files:**
- Modify: `public/tokens.css`
- Create: `public/styles/overlays.css`
- Modify: `public/index.src.html`

- [ ] **Step 1: Verify the overlay selectors exist**

Run: `grep -n "^\.settings-dropdown {" public/styles/settings.css; grep -rn "^\.modal {" public/styles/*.css | head -3; grep -n "^\.toast {" public/styles/base.css; grep -n "connection-dropdown {" public/styles/settings.css`
Expected: each selector found (note which file defines `.modal` — likely `modals.css`). Note their current `background:` declarations; the new file overrides them by load order.

- [ ] **Step 2: Overlay tokens in tokens.css**

In `:root` after the elevation tokens from Task 1:

```css
  /* Glass overlay surfaces (modals, dropdowns, palette, toasts) */
  --overlay-bg: color-mix(in oklab, var(--surface) 78%, transparent);
  --overlay-blur: 14px;
  --overlay-border: 1px solid color-mix(in oklab, #ffffff 65%, transparent);
```

In `html.dark` after its elevation tokens:

```css
  --overlay-bg: color-mix(in oklab, var(--surface) 84%, transparent);
  --overlay-border: 1px solid rgba(148, 163, 184, 0.18);
```

In `html.high-contrast` after its elevation tokens (HC gets NO glass):

```css
  --overlay-bg: var(--surface);
  --overlay-blur: 0px;
  --overlay-border: 1px solid var(--border);
```

- [ ] **Step 3: Create `public/styles/overlays.css`**

```css
/* Glass treatment for overlay surfaces (design system phase 1).
 * Content panes stay opaque; only floating chrome gets glass.
 * html.no-blur is the performance escape hatch (see spec risk #2). */

.settings-dropdown,
.connection-dropdown,
.modal,
.toast {
  background: var(--overlay-bg);
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  backdrop-filter: blur(var(--overlay-blur));
  border: var(--overlay-border);
  box-shadow: var(--elev-overlay);
}

@supports not (backdrop-filter: blur(1px)) {
  .settings-dropdown,
  .connection-dropdown,
  .modal,
  .toast {
    background: var(--surface);
  }
}

html.no-blur .settings-dropdown,
html.no-blur .connection-dropdown,
html.no-blur .modal,
html.no-blur .toast {
  background: var(--surface);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
```

- [ ] **Step 4: Load it last**

In `public/index.src.html`, after the `/styles/rpc-date-picker.css` link (~line 95), add:

```html
<link rel="stylesheet" href="/styles/overlays.css">
```

- [ ] **Step 5: Verify across themes**

Run: `npm run build:ui && npm start`
- Open Ajustes dropdown, the connection dropdown, any modal (e.g., Mi Perfil), and trigger a toast: all show translucent blur over the content behind, readable text.
- Dark mode: same, slightly more opaque. High contrast: fully opaque, no blur.
- DevTools: `document.documentElement.classList.add('no-blur')` → solid surfaces return.

- [ ] **Step 6: Commit**

```bash
git add public/tokens.css public/styles/overlays.css public/index.src.html public/index.html
git commit -m "feat(design-system): glass overlay treatment with no-blur and high-contrast fallbacks"
```

---

### Task 7: Blur performance gate (manual, decides the default)

**Files:**
- Possibly modify: `public/tokens.css` (only if the gate fails)

- [ ] **Step 1: Test on the oldest target machine**

On the oldest Mac that runs R+ in production (GPU acceleration is disabled in `main.js`, so blur is CPU-composited — this is the whole reason for the gate): `npm start`, then open/close the Ajustes dropdown 10×, open the largest modal over a full Expediente, trigger toasts during a lab processing run.
Expected: open/close animations stay smooth (no visible stutter vs. `html.no-blur`).

- [ ] **Step 2: Record the decision**

- If smooth: no change. Note "blur gate passed on <machine>" in the commit/PR description for this phase.
- If it stutters: make `no-blur` the default by changing `--overlay-blur` to `0px` and `--overlay-bg` to `var(--surface)` in `:root` of `public/tokens.css`, keeping the glass values only under a new opt-in class `html.glass` (invert the `html.no-blur` block in `overlays.css` accordingly). Commit with `fix(design-system): default to no-blur overlays (perf gate failed on <machine>)`.

---

### Task 8: Migrate core chrome CSS to the new tokens

One sub-task per file; same recipe. Scope: ONLY swap raw values for equivalent tokens (shadows → `--elev-*`/`--shadow*`, raw `ms` durations → `--dur-*`, raw cubic-beziers matching the spring/out curves → `--ease-*`, focus outlines → `--focus-ring`). No redesign in this task — pixel-identical output is the acceptance bar.

**Files (in order):**
- Modify: `public/styles/base.css`
- Modify: `public/styles/layout.css`
- Modify: `public/styles/sidebar.css`
- Modify: `public/styles/settings.css`
- Modify: `public/styles/modals.css`

For EACH file:

- [ ] **Step 1: Inventory hardcoded values**

```bash
grep -nE "box-shadow: *0 [0-9]" public/styles/<file>.css
grep -nE "transition[^;]*[0-9]+ms" public/styles/<file>.css
grep -nE "cubic-bezier" public/styles/<file>.css
```

- [ ] **Step 2: Replace mechanically**

- Shadow stacks visually equivalent to the sm/default/md scale → `var(--shadow-sm)` / `var(--shadow)` / `var(--shadow-md)`; one-off small card shadows → `var(--elev-raised)`; dropdown/popover shadows → `var(--elev-floating)` or `var(--elev-overlay)`.
- `150ms`→`var(--dur-fast)`, `200–240ms`→`var(--dur-normal)`, `300–350ms`→`var(--dur-slow)`. Durations outside those bands: leave them and add nothing.
- `cubic-bezier(0.16, 1, 0.3, 1)` → `var(--ease-out)`; `cubic-bezier(0.34, 1.56, 0.64, 1)` (and near-identical springs) → `var(--ease-spring)`.
- If a value doesn't clearly map, LEAVE IT — this task must not change rendering.

- [ ] **Step 3: Verify per file**

Run: `npm run build:ui && node server.js`. Walk the surfaces that file styles (base: cards/toasts; layout: header/tabs; sidebar: patient list + auto-hide; settings: both dropdowns; modals: 2–3 modals) in light AND dark themes. Pixel-identical expectation.

- [ ] **Step 4: Commit per file**

```bash
git add public/styles/<file>.css public/index.html
git commit -m "refactor(design-system): tokenize shadows/durations in <file>.css"
```

---

### Task 9: Dark-parity check + full verification

**Files:** none new (fixes only if gaps found)

- [ ] **Step 1: Token parity audit**

```bash
grep -oE "^\s*--[a-z-]+:" public/tokens.css | sort | uniq -c | sort -rn | head -40
```

Every token added in Tasks 1–6 (`--elev-*`, `--overlay-*`, `--state-*`, `--border-hairline`, `--focus-ring`, `--type-*`, `--dur-slow`, `--ease-spring`) must appear in `:root`; `--elev-*`, `--overlay-*`, `--state-*`, `--border-hairline` must ALSO appear in `html.dark` and `html.high-contrast`. Add any missing override.

- [ ] **Step 2: Full suite + smoke matrix**

Run: `npm test` → green. `npm run build:ui && npm start` → walk: Laboratorio, every Expediente group tab, Manejo, Agenda, Pase board, Guardia board, Ajustes, one modal, one toast — × light/dark × Mixto/Sobrio/Expresivo (spot-check) × high-contrast (spot-check).

- [ ] **Step 3: Update agent changelog and commit**

Append a line to `docs/logs/agent-changelog.md` (existing convention — check its format first: `head -20 docs/logs/agent-changelog.md`) describing Phase 1 completion.

```bash
git add docs/logs/agent-changelog.md
git commit -m "docs: design system foundation (phase 1) complete"
```

---

## Self-review notes

- Spec coverage: elevation ✔ (T1), neutral-ramp/state/focus ✔ (T1), typography + tabular-nums ✔ (T2), motion tokens + presets ✔ (T3), setting in Ajustes + persistence + reduce-motion ✔ (T3 media block, T4, T5), glass overlays + fallback ✔ (T6), perf gate ✔ (T7), CSS migration to tokens ✔ (T8 — scoped to chrome files; remaining feature CSS is tokenized during the Phase 2 per-surface restyle, which restyles those files anyway), dark parity ✔ (T1/T2/T6 inline + T9 audit).
- The "neutral ramp" from the spec is implemented as the state/hairline tokens plus the existing `--text`/`--text-muted` pair; a wider ramp would be YAGNI until Phase 2 surfaces demand more steps.
- Types/names consistent: `motion-mode.mjs` exports used identically in T4 tests and T5 wiring; `--elev-overlay` consumed by T6.
