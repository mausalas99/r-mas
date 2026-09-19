# Warm instrument UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the accepted Warm instrument spec as craft on the existing Hybrid H workbench — button language, tokens, overlay springs, SOME settle — without changing layout or removing tour confetti.

**Architecture:** Tokens and shared CSS first (one accent story, 8px controls, press). Pure physics helpers (`projectMomentum`, `rubberband`) in a new leaf module consumed by `ui-overlay.mjs` and `ui-toast.mjs`. Overlay kit bounce 0 + trigger origin. Lab output calls `settlePasteSurface`. Dead `+1 día` control removed from source HTML. Docs (`design.md`, project-context changelog) update in the last task.

**Tech Stack:** Vanilla ESM renderer, `motion` (already installed), `node --test` via `npm run test:one`, `npm run build:ui` after `public/` source edits. Do not hand-edit `public/js/app.bundle.mjs` or `public/js/chunks/`.

**Spec:** `docs/superpowers/specs/2026-08-13-warm-instrument-ui-design.md`  
**Preview (reference only):** `docs/demos/warm-instrument-preview.html`

**Hard constraints**

- No layout moves (sidebar, tabs, Resumen stack, gutters stay).
- Keep `launchConfetti()` on tour complete.
- Neutral Spanish only (tú / impersonal). No voseo.
- Labs / Pase stay Tufte-flat (no glass, no card lift).
- No animation on ⌘K, J/K, keyboard tabs.
- Resumen `.dash-name` stays `0.86em` (spec: skip display type if it reads as layout).
- New `*.test.mjs` paths must be added to `package.json` `scripts.test` (manifest drift guard).
- Do not edit `cloud/sync-pages/public/mobile/js/chunks/` or other generated copies.

---

## File map

| File | Responsibility |
| --- | --- |
| `public/tokens.css` | `--color-warm`, light `--color-accent-soft`, dark primary stays `#6eb6ff` |
| `public/styles/warm-instrument.test.mjs` | **Create.** CSS contract: tokens, no indigo glow, no white dark primary, 8px actions, no `#med-dia-btn` |
| `public/styles/components.css` | Default press on action buttons |
| `public/styles/layout.css` | Kill indigo glow on guided-empty primary |
| `public/styles/lab.css` | Dark secondary border; remove `--dia` styles |
| `public/styles/expediente.css` | Unwrap capsule group; Importar SOME is a lone 8px button |
| `public/styles/patient-dashboard.css` | Chips use `--color-accent-soft` / `--color-warm` |
| `public/styles/motion.css` | Press uses `--press-scale` / `--dur-press` |
| `public/partials/layout/app-body.html` | Remove `#med-dia-btn` and `.med-active-btn-group` wrapper |
| `public/js/ui-physics.mjs` | **Create.** `projectMomentum`, `rubberband` |
| `public/js/ui-physics.test.mjs` | **Create.** |
| `public/js/ui-overlay.mjs` | bounce 0; `trigger` origin; physics rubber-band + project |
| `public/js/ui-overlay.test.mjs` | Update + origin/bounce cases |
| `public/js/ui-toast.mjs` | Project + rubber-band on swipe |
| `public/js/ui-toast.test.mjs` | Project-based dismiss |
| `public/js/ui-motion.mjs` | `settlePasteSurface` |
| `public/js/ui-motion.test.mjs` | Reduced-motion snap |
| `public/js/features/lab-panel-parse.mjs` | Call settle after reveal |
| `public/js/features/medications-utils.mjs` | Remove `setMedDiaBtnVisible` |
| `public/js/features/medications-panel-render.mjs` | Drop `setMedDiaBtnVisible` calls |
| `public/js/features/medications.mjs` | Drop `incrementMedDiaTratamiento` from `windowHandlers` |
| `public/js/features/patient-dashboard/ic-modal.mjs` | Pass `trigger` into `openDialog` |
| `public/js/features/todos-list-render.mjs` | Empty-state verbs |
| `design.md` | Warm instrument notes |
| `.cursor/rules/project-context.mdc` | Changelog line |
| `package.json` | Register new tests |

`incrementMedDiaTratamiento` in `medications-actions.mjs` may stay as an unused export for this pass (no UI). Do not wire it back.

---

### Task 1: CSS contract tests (fail first)

**Files:**
- Create: `public/styles/warm-instrument.test.mjs`
- Modify: `package.json` (`scripts.test` — append the new path next to other `public/styles/` tests)

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('tokens define --color-warm and light accent-soft uses it', () => {
  const css = read('public/tokens.css');
  assert.match(css, /--color-warm:\s*oklch\(/);
  assert.match(css, /--color-accent-soft:\s*color-mix\(in oklab,\s*var\(--color-warm\)/);
});

test('guided-empty primary has no indigo glow', () => {
  const css = read('public/styles/layout.css');
  assert.equal(/rgba\(\s*79\s*,\s*86\s*,\s*255/.test(css), false);
});

test('action buttons use --radius-control, not pill', () => {
  const lab = read('public/styles/lab.css');
  assert.match(lab, /\.btn-generate\s*\{[^}]*border-radius:\s*var\(--radius-control\)/s);
  assert.match(lab, /\.btn-med-secondary\s*\{[^}]*border-radius:\s*var\(--radius-control\)/s);
});

test('app-body has Importar SOME and no +1 día control', () => {
  const html = read('public/partials/layout/app-body.html');
  assert.match(html, /id="med-import-open-btn"/);
  assert.equal(html.includes('id="med-dia-btn"'), false);
  assert.equal(html.includes('med-active-btn-group'), false);
  assert.equal(html.includes('+1 día'), false);
});
```

- [ ] **Step 2: Register the test in `package.json` `scripts.test`**

Add a space-separated path: `public/styles/warm-instrument.test.mjs` (place it alphabetically near other `public/styles/` entries). If you add the file and forget this step, `scripts/lib/test-manifest.test.mjs` fails in CI.

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:one -- public/styles/warm-instrument.test.mjs
```

Expected: FAIL on `--color-warm` and/or `#med-dia-btn` still present.

- [ ] **Step 4: Do not implement yet.** Commit only if the user asked to commit. Continue to Task 2.

---

### Task 2: Tokens — warm accent-soft, dark primary stays blue

**Files:**
- Modify: `public/tokens.css` (light `:root` ~L16–20; `html.dark` accent block ~L238–243)
- Test: `public/styles/warm-instrument.test.mjs`

- [ ] **Step 1: In `:root`, add warm and point accent-soft at it**

After `--color-ink-muted`:

```css
  --color-warm: oklch(0.55 0.08 52);
  --color-accent: var(--color-ink);
  --color-accent-hover: #000000;
  --color-accent-soft: color-mix(in oklab, var(--color-warm) 16%, transparent);
  --color-accent-soft-text: oklch(0.38 0.08 52);
```

Do **not** change `--color-accent` in light (stays ink). Do **not** change dark `--color-accent: #6eb6ff` (that is the dark primary).

- [ ] **Step 2: In `html.dark`, keep clinical blue on accent; add a warm token for chips**

```css
  --color-warm: oklch(0.78 0.08 52);
  --color-accent: #6eb6ff;
  --color-accent-hover: #8ec7ff;
  --color-accent-soft: color-mix(in oklab, var(--color-warm) 22%, transparent);
  --color-accent-soft-text: oklch(0.88 0.07 52);
```

Selected *chrome* that must stay blue (tabs that already use `--action` / `--color-accent`) is fine. Chips and wells use `--color-accent-soft` (warm).

- [ ] **Step 3: Re-run Task 1 token assertion**

```bash
npm run test:one -- public/styles/warm-instrument.test.mjs
```

Expected: token test PASS; HTML `+1 día` test still FAIL.

---

### Task 3: Button language + press + kill indigo glow

**Files:**
- Modify: `public/styles/layout.css` (`.guided-empty-actions button.primary` ~L1131)
- Modify: `public/styles/lab.css` (`.btn-med-secondary` ~L1979 and `html.dark .btn-med-secondary` ~L2024)
- Modify: `public/styles/components.css` (press block at top)
- Modify: `public/styles/motion.css` (`.ui-pressable:active` ~L431)
- Test: `public/styles/warm-instrument.test.mjs`

- [ ] **Step 1: Remove indigo glow**

In `layout.css` replace:

```css
.guided-empty-actions button.primary {
  background: var(--action);
  color: var(--color-on-accent);
  border: none;
  box-shadow: 0 2px 10px rgba(79, 86, 255, 0.2);
}
```

with:

```css
.guided-empty-actions button.primary {
  background: var(--action);
  color: var(--color-on-accent);
  border: none;
  box-shadow: none;
  border-radius: var(--radius-control);
}
```

- [ ] **Step 2: Dark secondary — visible border, elevated fill**

`html.dark .btn-med-secondary` must not be gray-on-gray. Use:

```css
html.dark .btn-med-secondary {
  background: var(--color-elevated);
  border: 1px solid color-mix(in oklab, var(--color-ink) 42%, transparent);
  color: var(--color-ink);
  border-radius: var(--radius-control);
}
```

Confirm `.btn-med-secondary` (light) already has `border-radius: var(--radius-control)`. If it uses `--radius-pill`, change it to `--radius-control`.

- [ ] **Step 3: Default press on action buttons**

In `components.css`, replace the 0.96 scale list with tokenized press, and broaden selectors:

```css
.btn-generate:active:not(:disabled):not(.loading),
.btn-save:active:not(:disabled):not(.loading),
.btn-cancel:active:not(:disabled),
.btn-med-secondary:active:not(:disabled),
.btn-primary:active:not(:disabled),
.btn-add:active:not(:disabled),
.btn-header-icon:active:not(:disabled),
.guided-empty-actions button:active:not(:disabled) {
  transform: scale(var(--press-scale));
  transition: transform var(--dur-press) var(--ease-out);
}
```

Keep `.ui-pressable:active` in `motion.css` on the same tokens. Do **not** add `button:active` globally (would hit tab bars / census cards). Do **not** change inner-tab / filter pill radius (those are nav, not action buttons).

- [ ] **Step 4: Grep for dark primaries that fill with ink**

```bash
rg -n "background:\\s*var\\(--color-ink\\)" public/styles --glob '*.css'
```

Any **primary / CTA** that uses `--color-ink` as fill will become white in dark (`--color-ink: #f5f5f7`). Change those fills to `var(--color-accent)` and label to `var(--color-on-accent)`. Do not change text color rules that use `--color-ink` for body copy.

- [ ] **Step 5: Run contract tests**

```bash
npm run test:one -- public/styles/warm-instrument.test.mjs
```

Expected: glow + radius assertions PASS; `+1 día` HTML still FAIL.

---

### Task 4: Remove `+1 día` and the capsule group

**Files:**
- Modify: `public/partials/layout/app-body.html` (~L291–303)
- Modify: `public/styles/expediente.css` (`.med-active-btn-group` ~L129–189)
- Modify: `public/styles/lab.css` (`.btn-med-secondary--dia` ~L2006–2036)
- Modify: `public/js/features/medications-utils.mjs`
- Modify: `public/js/features/medications-panel-render.mjs`
- Modify: `public/js/features/medications.mjs`
- Test: `public/styles/warm-instrument.test.mjs`

- [ ] **Step 1: HTML — lone Importar SOME**

Replace the group in `app-body.html`:

```html
            <span class="med-active-header-actions">
              <button type="button" class="btn-med-secondary" id="med-import-open-btn" onclick="openMedRecetaPasteModal()" title="Pegar listado SOME del hospital">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Importar SOME
              </button>
              <span id="med-fecha-actualizacion" class="med-active-fecha" hidden></span>
            </span>
```

Do not edit `public/index.html` by hand — `npm run build:ui` assembles it.

Leave `overlays.html` “Insertar ejemplo…” button alone (tour helper, not `+1 día`).

- [ ] **Step 2: Delete capsule + dia CSS**

Remove `.med-active-btn-group` and `#med-dia-btn[hidden]` rules from `expediente.css`. Keep `#med-import-open-btn[hidden]` if it exists.

Remove `.btn-med-secondary--dia` and `html.dark .btn-med-secondary--dia` from `lab.css`.

- [ ] **Step 3: Stop toggling a missing button**

Delete `setMedDiaBtnVisible` from `medications-utils.mjs`.

In `medications-panel-render.mjs` remove the import and every `setMedDiaBtnVisible(...)` call (empty + content paths).

In `medications.mjs` remove `incrementMedDiaTratamiento` from `windowHandlers` / re-exports used only for that onclick. Leave `incrementMedDiaTratamiento` in `medications-actions.mjs` unused.

- [ ] **Step 4: Run contract test**

```bash
npm run test:one -- public/styles/warm-instrument.test.mjs
```

Expected: PASS (including no `#med-dia-btn`).

---

### Task 5: Physics helpers

**Files:**
- Create: `public/js/ui-physics.mjs`
- Create: `public/js/ui-physics.test.mjs`
- Modify: `package.json` `scripts.test` (add `public/js/ui-physics.test.mjs` next to `public/js/ui-motion.test.mjs`)

- [ ] **Step 1: Write failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { projectMomentum, rubberband } from './ui-physics.mjs';

test('projectMomentum matches Apple exponential decay', () => {
  const d = 0.998;
  const v = 110; // px/s
  assert.equal(projectMomentum(v, d), (v / 1000) * d / (1 - d));
});

test('rubberband resists more as overshoot grows', () => {
  const a = rubberband(-40, 400, 0.55);
  const b = rubberband(-80, 400, 0.55);
  assert.ok(a > -40 && a < 0);
  assert.ok(Math.abs(b) < 80);
  assert.ok(Math.abs(b) > Math.abs(a));
});

test('rubberband zero / bad dimension', () => {
  assert.equal(rubberband(0, 400), 0);
  assert.equal(rubberband(-10, 0), 0);
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

```bash
npm run test:one -- public/js/ui-physics.test.mjs
```

- [ ] **Step 3: Implement**

```js
/** Apple Designing Fluid Interfaces — px/s → projected delta px. */
export function projectMomentum(initialVelocityPxPerSec, decelerationRate) {
  var d = decelerationRate == null ? 0.998 : decelerationRate;
  if (!Number.isFinite(initialVelocityPxPerSec) || d >= 1 || d <= 0) return 0;
  return (initialVelocityPxPerSec / 1000) * d / (1 - d);
}

/** Progressive resistance past a bound. `overshoot` and `dimension` in px. */
export function rubberband(overshoot, dimension, constant) {
  var c = constant == null ? 0.55 : constant;
  if (!overshoot || !(dimension > 0)) return 0;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}
```

`getReleaseVelocity` returns **px/ms**. Callers convert: `projectMomentum(velocityPxMs * 1000)`.

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test:one -- public/js/ui-physics.test.mjs
```

---

### Task 6: Overlay kit — bounce 0, trigger origin, physics

**Files:**
- Modify: `public/js/ui-overlay.mjs`
- Modify: `public/styles/ui-overlay.css` (`.ui-overlay-dialog` origin)
- Modify: `public/js/ui-overlay.test.mjs`
- Modify: `public/js/features/patient-dashboard/ic-modal.mjs`

- [ ] **Step 1: Update tests first**

Replace `rubberBandSheetOffset(-40)` expectation. New signature: `rubberBandSheetOffset(dragPx, dimension)`.

```js
test('rubberBandSheetOffset resists upward drag', () => {
  const y = rubberBandSheetOffset(-40, 400);
  assert.ok(y > -40 && y < 0);
});

test('shouldDismissSheet uses projected travel', () => {
  // velocity is px/ms (getReleaseVelocity units). 0.2 px/ms = 200 px/s → ~100px project
  assert.equal(shouldDismissSheet(0, 400, 0.25, 0.11), true);
  assert.equal(shouldDismissSheet(0, 400, -0.2, 0.11), false);
});

test('openDialog sets transform origin from trigger', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<button type="button" id="dlg-tr" style="position:absolute;left:10px;top:20px;width:40px;height:20px"></button>' +
    '<div id="scrim-o" hidden><div id="panel-o" role="dialog"></div></div>';
  openDialog({
    panel: document.getElementById('panel-o'),
    scrim: document.getElementById('scrim-o'),
    trigger: document.getElementById('dlg-tr'),
  });
  const origin = document.getElementById('panel-o').style.getPropertyValue('--ui-overlay-origin');
  assert.ok(origin.includes('px'));
});
```

- [ ] **Step 2: Run — expect FAIL on new origin test / rubber-band numbers**

```bash
npm run test:one -- public/js/ui-overlay.test.mjs
```

- [ ] **Step 3: Implement overlay changes**

At top of `ui-overlay.mjs`:

```js
import { projectMomentum, rubberband } from './ui-physics.mjs';
```

`rubberBandSheetOffset`:

```js
export function rubberBandSheetOffset(dragPx, dimension) {
  if (dragPx <= 0) return rubberband(dragPx, dimension || 400, 0.55);
  return dragPx;
}
```

`shouldDismissSheet` — velocity sign + projection (velocity arg is px/ms):

```js
export function shouldDismissSheet(dragPx, height, velocity, threshold) {
  var v = threshold == null ? DEFAULT_DISMISS_VELOCITY : threshold;
  if (typeof velocity === 'number' && velocity < 0) return false;
  var projected = dragPx + projectMomentum((velocity || 0) * 1000);
  if (height > 0 && projected > height * SHEET_DISMISS_FRACTION) return true;
  if (typeof velocity === 'number' && velocity >= v && dragPx > 0) return true;
  return false;
}
```

In `wireSheetPointer` `onPointerMove`, pass height: `dragPx = rubberBandSheetOffset(delta, sheetHeight)`.

Open springs — **bounce 0**:

```js
animControls = runSpring(panel, openKf, { bounce: 0, duration: 0.32 }); // dialog
animControls = runSpring(panel, openKf, { bounce: 0, duration: 0.26 }); // menu
```

Sheet **open** bounce 0. Sheet **snap-back after flick** may pass `bounce: 0.08` only when `Math.abs(velocity) > 0.15`.

Rename `setMenuOrigin` → `setOverlayOrigin` (same body). Call it from `openDialog` when `opts.trigger` is set.

`ui-overlay.css`:

```css
.ui-overlay-dialog {
  border-radius: var(--radius-container);
  transform-origin: var(--ui-overlay-origin, center center);
}
```

- [ ] **Step 4: Pass trigger from IC modal**

`openInterconsultModal` already receives a click. Change signature to accept `opts.trigger` and:

```js
icLayer = openDialog({
  panel: dom.panel,
  scrim: dom.scrim,
  nested: true,
  trigger: opts && opts.trigger,
});
```

In `dashboard-mount.mjs`, when handling `ic-add` / open, pass `trigger: ev.currentTarget` (or the clicked `.svc-add`).

- [ ] **Step 5: Run overlay + ic-modal tests**

```bash
npm run test:one -- public/js/ui-overlay.test.mjs public/js/features/patient-dashboard/ic-modal.test.mjs
```

Expected: PASS.

---

### Task 7: Toast project + rubber-band

**Files:**
- Modify: `public/js/ui-toast.mjs`
- Modify: `public/js/ui-toast.test.mjs`

- [ ] **Step 1: Extend dismiss helper**

```js
import { projectMomentum, rubberband } from './ui-physics.mjs';

export function shouldDismissToastSwipe(velocityX, dragX) {
  var projected = (Number(dragX) || 0) + projectMomentum((Number(velocityX) || 0) * 1000);
  return projected > 80 || Number(velocityX) >= TOAST_SWIPE_DISMISS_VELOCITY;
}
```

In `onPointerMove`, if `dragX < 0` and not reduced motion: `translateX(rubberband(dragX, 220))`.

`onPointerUp`: `shouldDismissToastSwipe(velocity, dragX)`.

- [ ] **Step 2: Update test**

```js
test('swipe dismiss uses velocity or projected travel', () => {
  const history = [
    { t: 0, x: 0, y: 0 },
    { t: 50, x: 8, y: 0 },
  ];
  const velocity = getReleaseVelocity(history, { axis: 'x', now: 50 });
  assert.equal(shouldDismissToastSwipe(velocity, 0), true);
  assert.equal(shouldDismissToastSwipe(0.05, 0), false);
  assert.equal(shouldDismissToastSwipe(0.02, 90), true);
});
```

- [ ] **Step 3: Run**

```bash
npm run test:one -- public/js/ui-toast.test.mjs
```

Expected: PASS.

---

### Task 8: SOME paste settle

**Files:**
- Modify: `public/js/ui-motion.mjs`
- Modify: `public/js/ui-motion.test.mjs`
- Modify: `public/js/features/lab-panel-parse.mjs`

- [ ] **Step 1: Test `settlePasteSurface`**

```js
test('settlePasteSurface reduced motion snaps opacity', async () => {
  const prev = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({
    matches: String(q).includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
  try {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.style.opacity = '0';
    const ctrl = settlePasteSurface(el);
    assert.ok(ctrl);
    await ctrl.finished;
    assert.equal(el.style.opacity, '1');
  } finally {
    globalThis.matchMedia = prev;
  }
});
```

Export `settlePasteSurface` from `ui-motion.mjs`.

- [ ] **Step 2: Implement**

```js
export function settlePasteSurface(el) {
  if (!el || typeof el.style !== 'object') return { stop: function () {}, finished: Promise.resolve() };
  if (prefersReducedMotion()) {
    el.style.opacity = '1';
    el.style.transform = '';
    return { stop: function () {}, finished: Promise.resolve() };
  }
  el.style.opacity = '0';
  return springTo(el, { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0)'] }, {
    bounce: 0,
    duration: 0.3,
  });
}
```

Keep `ui-motion.mjs` under 600 lines. If over, put this function in `public/js/ui-paste-settle.mjs` instead and test that file (then register it in `scripts.test`).

- [ ] **Step 3: Call after lab output reveal**

In `lab-panel-parse.mjs`, after `lab-output-section` is shown:

```js
import { settlePasteSurface } from '../ui-motion.mjs';
// ...
var outSec = document.getElementById('lab-output-section');
outSec.style.display = 'block';
settlePasteSurface(outSec);
```

Do not animate ⌘K or tab switches.

- [ ] **Step 4: Run**

```bash
npm run test:one -- public/js/ui-motion.test.mjs
```

Expected: PASS.

---

### Task 9: Empty-state verbs + dashboard chips

**Files:**
- Modify: `public/js/features/todos-list-render.mjs` (~L307–343)
- Modify: `public/styles/patient-dashboard.css` (`.chip` ~L78)
- Modify: `public/js/features/patient-dashboard/patient-dashboard-css.test.mjs` only if chip selectors change

- [ ] **Step 1: Empty copy (neutral Spanish)**

```js
// handoff
'<span class="empty-state-title">Sin pendientes del turno anterior</span>' +
'<span class="empty-state-lead">Los que quedaron abiertos al cerrar el turno previo aparecen aquí.</span>';

// default
'<span class="empty-state-title">Sin pendientes</span>' +
'<span class="empty-state-lead">Escribe uno arriba para agregarlo.</span>';

// no patient
'<span class="empty-state-title">Elige un paciente para ver pendientes</span>' +
'<span class="empty-state-lead">Selecciona uno en la lista de la izquierda.</span>';
```

No voseo. No new buttons in the empty well if the input is already above (mapping stays).

- [ ] **Step 2: Dashboard chips use tokens**

```css
.patient-dash .chip {
  background: var(--color-accent-soft);
  border: 0;
  border-radius: var(--radius-chip);
  padding: 3px 8px;
  font-size: 0.82em;
  font-weight: 600;
  color: var(--color-accent-soft-text);
}
html.dark .patient-dash .chip {
  background: var(--color-accent-soft);
  color: var(--color-accent-soft-text);
}
```

Do **not** change `.dash-name` font size.

- [ ] **Step 3: Run dashboard CSS test**

```bash
npm run test:one -- public/js/features/patient-dashboard/patient-dashboard-css.test.mjs
```

Expected: PASS (dash-name still 0.86em).

---

### Task 10: Docs + build

**Files:**
- Modify: `design.md`
- Modify: `.cursor/rules/project-context.mdc` (changelog, ≤20 entries; edit same-week `guardia-wip` or prepend `warm-instrument`)
- Modify: `docs/superpowers/specs/2026-08-13-warm-instrument-ui-design.md` — set **Status:** Accepted

- [ ] **Step 1: `design.md`**

- Última actualización: Warm instrument (2026-08-13)
- Accent row: light ink; dark `#6eb6ff` on primaries; `--color-warm` / `--color-accent-soft` for chips
- Press: action buttons, not only `.ui-pressable`
- Link the spec
- Anti-slop: add “no white-filled primary on dark”, “no 999px on action buttons”, “no voseo”

- [ ] **Step 2: Changelog**

```markdown
- **2026-08-13** `warm-instrument`: button language + warm accent-soft + overlay bounce 0 / trigger origin + SOME settle; remove +1 día capsule; `ui-physics.mjs`, `tokens.css`.
```

- [ ] **Step 3: Targeted tests then UI build**

```bash
npm run test:one -- public/styles/warm-instrument.test.mjs public/js/ui-physics.test.mjs public/js/ui-overlay.test.mjs public/js/ui-toast.test.mjs public/js/ui-motion.test.mjs public/js/features/patient-dashboard/patient-dashboard-css.test.mjs public/js/features/patient-dashboard/ic-modal.test.mjs
npm run build:ui
```

Expected: all tests exit 0; `public/index.html` no longer contains `med-dia-btn`.

- [ ] **Step 4: Manual check (human)**

- Light + dark: primary is never white-on-black.
- Manejo: only Importar SOME; no capsule; no `+1 día`.
- Pegar SOME: rows settle once.
- Tour complete: confetti still runs.
- ⌘K / J/K: still instant.

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| No layout change | Constraint + dash-name unchanged (T9) |
| Keep confetti | Constraint; no task touches `launchConfetti` |
| Dark first-class / no white primary | T2, T3 |
| Neutral Spanish | T9 + constraint |
| Warm accent-soft | T2, T9 |
| 8px action radius | T3 |
| Remove +1 día / capsule | T4 |
| Press default on actions | T3 |
| bounce 0 + trigger origin | T6 |
| Rubber-band + project | T5, T6, T7 |
| SOME settle | T8 |
| Empty verbs | T9 |
| No high-freq motion | Constraint |
| design.md / context | T10 |

## Placeholder scan

No TBD / “add tests later” / “similar to Task N”. New APIs: `projectMomentum`, `rubberband`, `settlePasteSurface`, `openDialog({ trigger })`, `rubberBandSheetOffset(dragPx, dimension)`, `shouldDismissToastSwipe(velocityX, dragX)`.
