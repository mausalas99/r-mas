# Apple Hybrid UI — Spec A Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Hybrid H design tokens (light/dark/HC + glass materials + Emil easings), install `motion`, and extend `ui-motion.mjs` with a spring façade — zero feature chrome redesign.

**Architecture:** Token-first swap in `public/tokens.css` with legacy CSS var aliases (`--action`, `--surface`, `--overlay-*`, …) remapped so the app stays usable. Motion stays behind `ui-motion.mjs` (`springTo`, `getReleaseVelocity`); Spec B consumes them for sheets/toasts. Docs (`design.md`, `06-design-system.md`) become Hybrid H source of truth.

**Tech Stack:** Electron ESM renderer, `public/tokens.css`, `motion` (motion.dev vanilla `animate`), `node --test` via `npm run test:one`, esbuild bundle (`npm run build:ui`).

**Spec:** [`docs/superpowers/specs/2026-08-03-apple-hybrid-ui-foundation-design.md`](../specs/2026-08-03-apple-hybrid-ui-foundation-design.md)  
**Program:** [`docs/superpowers/specs/2026-08-03-apple-hybrid-ui-overhaul-program.md`](../specs/2026-08-03-apple-hybrid-ui-overhaul-program.md)

**Out of scope (do not touch):** Spec B overlays/shell, Spec C Labs/Pase, Spec D domains, unrelated dirty worktree files, React UI libraries.

---

## File map

| File | Responsibility |
| --- | --- |
| `package.json` / lockfile | Add runtime dep `motion` |
| `public/tokens.css` | Hybrid H colors, materials, radii, easings, a11y media queries; legacy aliases |
| `public/styles/motion.css` | `.ui-pressable` utility (press scale) |
| `public/js/ui-motion.mjs` | Keep shake/overlay helpers; add `springTo` + `getReleaseVelocity` |
| `public/js/ui-motion.test.mjs` | Unit tests for velocity + reduced-motion spring path |
| `design.md` | Replace Hallmark Quiet workbench chrome rules with Hybrid H |
| `docs/core/06-design-system.md` | Pointer + summary update |
| `.cursor/rules/project-context.mdc` | Changelog bullet on architectural commit |

---

### Task 1: Install `motion`

**Files:**
- Modify: `package.json`
- Modify: package lockfile (npm-managed)

- [ ] **Step 1: Install the package**

Run:

```bash
npm install motion
```

Expected: `package.json` `dependencies` includes `"motion": "<version>"`; install exits 0.

- [ ] **Step 2: Verify import resolves**

Run:

```bash
node -e "import('motion').then(m => console.log(typeof m.animate)).catch(e => { console.error(e); process.exit(1); })"
```

Expected: prints `function`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore(ui): add motion dependency for Hybrid H springs

EOF
)"
```

---

### Task 2: Failing tests for motion façade

**Files:**
- Modify: `public/js/ui-motion.test.mjs`
- Test: `public/js/ui-motion.test.mjs`

- [ ] **Step 1: Extend the test file**

Keep existing `resolvePatientFieldIds` tests. Append:

```js
import {
  resolvePatientFieldIds,
  getReleaseVelocity,
  springTo,
  prefersReducedMotion,
} from './ui-motion.mjs';

// --- existing resolvePatientFieldIds tests stay ---

test('getReleaseVelocity — empty / single sample → 0', () => {
  assert.equal(getReleaseVelocity([]), 0);
  assert.equal(getReleaseVelocity([{ t: 100, y: 10 }]), 0);
});

test('getReleaseVelocity — y axis over window', () => {
  const history = [
    { t: 900, y: 0 },
    { t: 950, y: 20 },
    { t: 1000, y: 50 },
  ];
  // (50 - 0) / (1000 - 900) = 0.5 px/ms
  assert.equal(getReleaseVelocity(history, { axis: 'y', windowMs: 100, now: 1000 }), 0.5);
});

test('getReleaseVelocity — ignores samples outside window', () => {
  const history = [
    { t: 0, y: 0 },
    { t: 950, y: 10 },
    { t: 1000, y: 20 },
  ];
  // window 100ms from now=1000 → samples at 950 and 1000 only
  assert.equal(getReleaseVelocity(history, { axis: 'y', windowMs: 100, now: 1000 }), 0.2);
});

test('getReleaseVelocity — x axis', () => {
  const history = [
    { t: 0, x: 0 },
    { t: 100, x: -40 },
  ];
  assert.equal(getReleaseVelocity(history, { axis: 'x', windowMs: 200, now: 100 }), -0.4);
});

test('springTo — invalid el returns null', () => {
  assert.equal(springTo(null, { opacity: 0 }), null);
  assert.equal(springTo({}, { opacity: 0 }), null);
});

test('springTo — reduced motion snaps opacity and skips spring', async () => {
  const prev = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({
    matches: String(q).includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
  try {
    assert.equal(prefersReducedMotion(), true);
    const el = {
      style: { opacity: '1' },
    };
    // Not a real HTMLElement — springTo must reject non-elements before motion
    Object.setPrototypeOf(el, HTMLElement.prototype);
    const ctrl = springTo(el, { opacity: 0.2 }, { bounce: 0.5, duration: 0.8 });
    assert.ok(ctrl);
    assert.equal(typeof ctrl.stop, 'function');
    await ctrl.finished;
    assert.equal(el.style.opacity, '0.2');
  } finally {
    globalThis.matchMedia = prev;
  }
});
```

**Note:** If `Object.setPrototypeOf(el, HTMLElement.prototype)` fails in Electron’s Node (no `HTMLElement`), use this alternate last test instead:

```js
test('springTo — reduced motion snaps opacity on HTMLElement', async () => {
  const prev = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({
    matches: String(q).includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
  try {
    const { JSDOM } = await import('jsdom').catch(() => ({ JSDOM: null }));
    if (!JSDOM && typeof document === 'undefined') {
      // Electron-as-Node often has no document; skip DOM branch.
      assert.equal(springTo(null, { opacity: 0 }), null);
      return;
    }
    const el = (typeof document !== 'undefined')
      ? document.createElement('div')
      : new JSDOM('<!doctype html><div id="t"></div>').window.document.getElementById('t');
    el.style.opacity = '1';
    const ctrl = springTo(el, { opacity: 0.2 }, { bounce: 0.5 });
    assert.ok(ctrl);
    await ctrl.finished;
    assert.equal(el.style.opacity, '0.2');
  } finally {
    globalThis.matchMedia = prev;
  }
});
```

Prefer the **document.createElement** path when `document` exists under `ELECTRON_RUN_AS_NODE`; otherwise keep the null-el assertion + pure `getReleaseVelocity` coverage as the gate.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:one -- public/js/ui-motion.test.mjs
```

Expected: FAIL — `getReleaseVelocity` / `springTo` not exported (or not defined).

---

### Task 3: Implement `springTo` + `getReleaseVelocity`

**Files:**
- Modify: `public/js/ui-motion.mjs`

- [ ] **Step 1: Add imports and helpers at top of `ui-motion.mjs`**

After the file header comment, add:

```js
import { animate } from 'motion';

/**
 * Pointer release velocity from recent samples (px/ms, signed).
 * @param {Array<{ t: number, x?: number, y?: number }>} history
 * @param {{ axis?: 'x'|'y', windowMs?: number, now?: number }} [opts]
 * @returns {number}
 */
export function getReleaseVelocity(history, opts) {
  opts = opts || {};
  var axis = opts.axis === 'x' ? 'x' : 'y';
  var windowMs = opts.windowMs == null ? 100 : opts.windowMs;
  var list = Array.isArray(history) ? history : [];
  var now = opts.now != null
    ? opts.now
    : (list.length ? list[list.length - 1].t : 0);
  var samples = list.filter(function (p) {
    if (!p || typeof p.t !== 'number') return false;
    var age = now - p.t;
    return age >= 0 && age <= windowMs;
  });
  if (samples.length < 2) return 0;
  var a = samples[0];
  var b = samples[samples.length - 1];
  var dt = b.t - a.t;
  if (dt <= 0) return 0;
  var da = (Number(b[axis]) || 0) - (Number(a[axis]) || 0);
  return da / dt;
}

function keyframeEndValue(value) {
  if (Array.isArray(value)) return value[value.length - 1];
  return value;
}

/**
 * Interruptible spring via motion.dev. Reduced motion → snap end values
 * (opacity always; transform axes when provided) without calling animate.
 * @param {HTMLElement|null|undefined} el
 * @param {Record<string, unknown>} keyframes
 * @param {{ bounce?: number, duration?: number, velocity?: number }} [options]
 * @returns {{ stop: () => void, finished: Promise<unknown> } | null}
 */
export function springTo(el, keyframes, options) {
  if (!el || (typeof HTMLElement !== 'undefined' && !(el instanceof HTMLElement))) {
    return null;
  }
  options = options || {};
  var bounce = options.bounce == null ? 0 : options.bounce;
  var duration = options.duration == null ? 0.35 : options.duration;
  var kf = keyframes || {};

  if (prefersReducedMotion()) {
    Object.keys(kf).forEach(function (key) {
      var end = keyframeEndValue(kf[key]);
      if (end == null) return;
      if (key === 'opacity') {
        el.style.opacity = String(end);
        return;
      }
      // Motion number keys (x/y/scale) — leave DOM style alone; Spec B sets transforms.
      // Snap opacity is the a11y contract for Spec A.
    });
    return {
      stop: function () {},
      finished: Promise.resolve(),
    };
  }

  var animOpts = { type: 'spring', bounce: bounce, duration: duration };
  if (options.velocity != null) animOpts.velocity = options.velocity;
  var controls = animate(el, kf, animOpts);
  return {
    stop: function () {
      try { controls.stop(); } catch (_e) { void _e; }
    },
    finished: controls.finished || Promise.resolve(),
  };
}
```

Keep all existing exports (`prefersReducedMotion`, `shakeField`, `closeModalAnimated`, `closeOverlayAnimated`, `setAsyncButtonLoading`, …) unchanged.

- [ ] **Step 2: Run tests — expect PASS**

```bash
npm run test:one -- public/js/ui-motion.test.mjs
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add public/js/ui-motion.mjs public/js/ui-motion.test.mjs
git commit -m "$(cat <<'EOF'
feat(ui-motion): springTo + getReleaseVelocity façade over motion

EOF
)"
```

---

### Task 4: Hybrid H tokens — `:root` light + materials + motion CSS vars

**Files:**
- Modify: `public/tokens.css` (header + `:root` block)

- [ ] **Step 1: Replace the file stamp and light color core**

Change the top stamp to:

```css
/* Hybrid H · soft workbench + glass floating · 2026-08-03
 * Solid chrome/content; glass only on overlays (Spec B+). Ink accent.
 * contrast: pass (tokens + HC)
 */
```

In `:root`, set these values (replace existing counterparts; keep unrelated tokens unless listed):

```css
  --color-paper: #eceae6;
  --color-surface: #f7f6f3;
  --color-content: #f2f1ed;
  --color-elevated: #ffffff;
  --color-ink: #1c1c1e;
  --color-ink-muted: #6c6c70;
  --color-accent: var(--color-ink);
  --color-accent-hover: #000000;
  --color-accent-soft: color-mix(in oklab, var(--color-ink) 8%, transparent);
  --color-accent-soft-text: var(--color-ink);
  --color-on-accent: #ffffff;
  --color-danger: #d70015;
  --color-success: #248a3d;
  --color-success-emphasis: var(--color-success);
  --color-success-emphasis-hover: color-mix(in oklab, var(--color-success) 88%, #000000);
  --color-on-success: #ffffff;
  --color-livesync-live: var(--color-success);
  --color-livesync-local: var(--color-ink-muted);
```

Map danger aliases:

```css
  --error: var(--color-danger);
  --danger: var(--color-danger);
  --success: var(--color-success);
  --surface-elevated: var(--color-elevated);
```

Keep `--action` / `--action-hover` / `--bg` / `--surface` / `--text` / `--text-muted` as aliases of the new colors (already pattern — ensure they still point at accent/paper/surface/ink).

- [ ] **Step 2: Add material tokens + remapped overlay aliases**

Still in `:root`, replace the glass/overlay block with:

```css
  /* Hybrid H materials — glass for floating layers only */
  --material-solid-surface: var(--color-surface);
  --material-solid-content: var(--color-content);
  --material-solid-elevated: var(--color-elevated);
  --material-glass-bg: color-mix(in oklab, #ffffff 72%, transparent);
  --material-glass-blur: 24px;
  --material-glass-saturate: 180%;
  --material-glass-border: 1px solid color-mix(in oklab, #ffffff 80%, transparent);
  /* Legacy overlay aliases → glass materials (Spec B restyles consumers) */
  --overlay-bg: var(--material-glass-bg);
  --overlay-blur: var(--material-glass-blur);
  --overlay-border: var(--material-glass-border);
```

- [ ] **Step 3: Radii + Emil easings + press tokens**

```css
  --radius-control: 8px;
  --radius-field: 8px;
  --radius-container: 12px;
  --radius-sheet: 14px;
  /* keep --radius-pill: 999px for chips only; do not use as default control */

  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --press-scale: 0.97;
  --dur-press: 140ms;
  --dur-ui: 200ms;
  /* keep --dur-fast / --dur-normal / --dur-slow for motion-mode presets;
     align defaults toward Emil UI timing */
  --dur-fast: 140ms;
  --dur-normal: 200ms;
  --dur-slow: 300ms;
```

Leave `--ease-spring` defined (used by motion-mode presets); point default at non-bouncy ease:

```css
  --ease-spring: var(--ease-out);
```

- [ ] **Step 4: Typography stack**

```css
  --font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

Do **not** delete IBM Plex Sans font files in this phase.

- [ ] **Step 5: Commit**

```bash
git add public/tokens.css
git commit -m "$(cat <<'EOF'
feat(tokens): Hybrid H light materials, ink accent, Emil easings

EOF
)"
```

---

### Task 5: Dark + high-contrast + a11y media queries

**Files:**
- Modify: `public/tokens.css` (`html.dark`, `html.high-contrast`, media queries)

- [ ] **Step 1: Update `html.dark` solid + glass**

Replace dark color core:

```css
html.dark {
  --color-paper: #0c0e14;
  --color-surface: #14161e;
  --color-content: #0c0e14;
  --color-elevated: #1c1e26;
  --color-ink: #f5f5f7;
  --color-ink-muted: #98989d;
  --color-accent: var(--color-ink);
  --color-accent-hover: #ffffff;
  --color-accent-soft: color-mix(in oklab, var(--color-ink) 12%, transparent);
  --color-accent-soft-text: var(--color-ink);
  --color-on-accent: #1c1c1e;
  --color-danger: #ff453a;
  --color-success: #30d158;
  --color-success-emphasis: var(--color-success);
  --color-success-emphasis-hover: color-mix(in oklab, var(--color-success) 88%, #ffffff);
  --color-on-success: #0c0e14;
  --color-livesync-live: var(--color-success);
  --color-livesync-local: var(--color-ink-muted);

  --error: var(--color-danger);
  --danger: var(--color-danger);
  --success: var(--color-success);
  --surface-elevated: var(--color-elevated);

  --material-glass-bg: color-mix(in oklab, #282a34 78%, transparent);
  --material-glass-blur: 28px;
  --material-glass-saturate: 160%;
  --material-glass-border: 1px solid color-mix(in oklab, #ffffff 12%, transparent);
  --overlay-bg: var(--material-glass-bg);
  --overlay-blur: var(--material-glass-blur);
  --overlay-border: var(--material-glass-border);

  /* keep existing border/divider/shadow/lab-header remaps, but drop indigo-tinted
     channel pill — use ink soft fill */
  --color-channel-pill-bg: color-mix(in oklab, var(--color-ink) 18%, var(--color-surface));
  --color-channel-pill-fg: var(--color-ink);
  ...
}
```

Keep lab header identity colors (panel section identity) as they are in dark today.

- [ ] **Step 2: Coherent HC — ink accent (retire blue brand)**

In `html.high-contrast`:

```css
  --color-accent: #000000;
  --color-accent-hover: #000000;
  --color-danger: #b00000;
  --color-success: #006400;
  --error: var(--color-danger);
  --success: var(--color-success);
  --material-glass-bg: var(--color-surface);
  --material-glass-blur: 0px;
  --overlay-bg: var(--material-glass-bg);
  --overlay-blur: 0px;
```

In `html.high-contrast.dark`:

```css
  --color-accent: #ffffff;
  --color-accent-hover: #ffffff;
  --color-danger: #ff6b6b;
  --color-success: #5eea7a;
  --error: var(--color-danger);
  --success: var(--color-success);
  --material-glass-bg: var(--color-surface);
  --material-glass-blur: 0px;
```

- [ ] **Step 3: Add reduced-transparency + prefer-contrast hooks**

Append before `@supports (height: 100dvh)`:

```css
@media (prefers-reduced-transparency: reduce) {
  :root,
  html.dark {
    --material-glass-bg: var(--color-elevated);
    --material-glass-blur: 0px;
    --material-glass-saturate: 100%;
    --overlay-bg: var(--material-glass-bg);
    --overlay-blur: 0px;
  }
}

@media (prefers-contrast: more) {
  :root {
    --border: color-mix(in oklab, var(--color-ink) 28%, transparent);
    --border-hairline: 1px solid color-mix(in oklab, var(--color-ink) 28%, transparent);
  }
}
```

Keep existing `@media (prefers-reduced-motion: reduce)` duration collapse; also set:

```css
@media (prefers-reduced-motion: reduce) {
  :root,
  html.motion-sobrio,
  html.motion-expresivo {
    --dur-fast: 1ms;
    --dur-normal: 1ms;
    --dur-slow: 1ms;
    --dur-press: 1ms;
    --dur-ui: 1ms;
    --ease-spring: linear;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add public/tokens.css
git commit -m "$(cat <<'EOF'
feat(tokens): Hybrid H dark/HC + reduced transparency/contrast

EOF
)"
```

---

### Task 6: `.ui-pressable` utility

**Files:**
- Modify: `public/styles/motion.css`

- [ ] **Step 1: Append pressable utility**

At end of `public/styles/motion.css`:

```css
/* Hybrid H · Spec A — press feedback (Spec B applies broadly) */
.ui-pressable:active {
  transform: scale(var(--press-scale));
  transition: transform var(--dur-press) var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .ui-pressable:active {
    transform: none;
    transition: none;
  }
}
```

Do **not** mass-apply the class to chrome yet (Spec B).

- [ ] **Step 2: Commit**

```bash
git add public/styles/motion.css
git commit -m "$(cat <<'EOF'
feat(ui): add .ui-pressable Hybrid H press scale utility

EOF
)"
```

---

### Task 7: Docs — `design.md` + design-system pointer

**Files:**
- Modify: `design.md`
- Modify: `docs/core/06-design-system.md`

- [ ] **Step 1: Replace `design.md` content**

```markdown
# R+ — Design system (Hybrid H)

**Genre:** utilitarian clinical · **Theme:** Hybrid H (solid workbench + glass floating)  
**Program:** `docs/superpowers/specs/2026-08-03-apple-hybrid-ui-overhaul-program.md`  
**Última actualización:** Spec A foundation (2026-08-03)

## Principios

- Densidad alta sin ruido: bordes y tipografía antes que color.
- Acento **ink** (`--color-accent` = `--color-ink`); éxito/error semánticos, no segundo brand.
- **Solid** para sidebar, tabs, contenido, tablas labs, Pase; **glass** solo en capas flotantes (sheets, dialogs, menús, toasts, ⌘K).
- Nunca glass-on-glass: overlay anidado = superficie elevated sólida.
- Sin gradientes en chrome/CTAs; sin glow índigo/púrpura.
- Tipografía: system UI (`-apple-system` / SF) para chrome; IBM Plex Mono para labs/valores.
- Motion: Emil easings; press `scale(0.97)`; ⌘K **sin** animación open/close; springs vía `ui-motion.mjs` + `motion`.

## Tokens (fuente de verdad)

Archivo: `public/tokens.css`

| Token | Uso |
| --- | --- |
| `--color-paper` / `--color-surface` / `--color-content` / `--color-elevated` | App gap, chrome, well, cards/tables |
| `--color-ink` / `--color-ink-muted` | Texto |
| `--color-accent` | Acciones / tab activa (= ink) |
| `--color-danger` / `--color-success` | Alterados / LiveSync live |
| `--material-glass-*` | Floating layers only |
| `--ease-out` / `--ease-in-out` / `--ease-drawer` | Emil curves |
| `--press-scale` / `--dur-press` / `--dur-ui` | Press + UI timing |
| `--font-ui` / `--font-mono` | System UI + mono labs |

Legacy aliases (`--action`, `--surface`, `--text`, `--overlay-bg`, …) apuntan a tokens Hybrid H.

## Materiales

1. Solid workbench — hairline borders; soft shadow solo en glass flotante.
2. Glass — `color-mix` + blur; dark denser than light.
3. `prefers-reduced-transparency` → glass = elevated solid, blur 0.

## Motion

| Frecuencia | Política |
| --- | --- |
| ⌘K, J/K paciente, tabs teclado | Sin animación |
| Press | `.ui-pressable` → `--press-scale` |
| Toast / sheet / dialog | Spec B; springs `springTo` |
| Reduced motion | Opacity snap / cross-fade only |

## Temas

- `html` — claro Hybrid H  
- `html.dark` — oscuro peer (first-class)  
- `html.high-contrast` / `.dark` — WCAG; accent ink  

## No hacer (anti-slop)

- Índigo/púrpura como brand accent.
- Glass en tablas labs o celdas Pase.
- Gradientes en botones/cards; multi-layer glow.
- Hex sueltos en CSS nuevo: siempre `var(--…)`.
- Animar navegación de alta frecuencia.

## Stamp (CSS)

```css
/* Hybrid H · soft workbench + glass floating · 2026-08-03
 * contrast: pass (tokens + HC)
 */
```
```

- [ ] **Step 2: Update `docs/core/06-design-system.md`**

```markdown
---
type: "core"
name: "Design System"
status: "stable"
description: "Pointer to Hybrid H UI tokens and conventions for R+."
---

# Design System

**Source of truth:** [`design.md`](../../design.md) and [`public/tokens.css`](../../public/tokens.css).  
**Program:** Apple Hybrid UI overhaul — Spec A foundation landed; Spec B+ for chrome/overlays/clinical surfaces.

## Principles (summary)

- High information density; borders and type over color.
- Ink accent (`--color-accent` = `--color-ink`); semantic danger/success only.
- Solid workbench + glass floating layers only (never glass-on-glass).
- System UI for chrome; IBM Plex Mono for labs/values.
- Dark is first-class; honor reduced motion/transparency.

## Key tokens

| Token | Role |
|-------|------|
| `--color-paper` / `--color-surface` / `--color-content` / `--color-elevated` | Surfaces |
| `--color-ink` / `--color-accent` | Text + actions |
| `--material-glass-*` | Floating overlays |
| `--color-livesync-*` | LiveSync Wi‑Fi header states (solid chips) |

## Layout modes

- **Normal:** sidebar + main tabs (Laboratorio, Expediente, …)
- **Pase:** `appcontent-pase` round board
- **Guardia:** compact metrics + phase bar (`guardia-board.mjs`)

## Related

- Styles: `public/styles/`
- Motion façade: `public/js/ui-motion.mjs`
- Shell: `public/js/app-shell.mjs`
```

- [ ] **Step 3: Commit**

```bash
git add design.md docs/core/06-design-system.md
git commit -m "$(cat <<'EOF'
docs(design): Hybrid H replaces Hallmark Quiet workbench chrome rules

EOF
)"
```

---

### Task 8: Verify bundle, metrics, visual smoke checklist

**Files:**
- Modify: `.cursor/rules/project-context.mdc` (changelog only, with final commit)

- [ ] **Step 1: Rebuild UI bundle**

```bash
npm run build:ui
```

Expected: exits 0; `motion` resolves through esbuild into chunks that import `ui-motion.mjs` (no hand-edit of `app.bundle.mjs`).

- [ ] **Step 2: Re-run motion tests**

```bash
npm run test:one -- public/js/ui-motion.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Debt gate**

```bash
npm run metrics:check
```

Expected: pass (totalScore ≤ baseline). Do **not** edit `scripts/metrics/baseline.json`. Confirm no new static import of a cold feature from `app.js` / `app-runtimes.mjs` / `app-shell.mjs` — `motion` may only enter via `ui-motion.mjs`.

- [ ] **Step 4: Manual smoke (implementer checklist)**

1. `npm start` → shell loads light theme; primary actions read **ink**, not indigo.
2. Toggle dark (`html.dark` / Ajustes) → surfaces match Spec A dark table; alterados still `#ff453a`-class danger.
3. Open any existing modal/⌘K → still usable (glass tokens may look stronger; behavior Spec B).
4. Labs table: alterados contrast acceptable light + dark.
5. Optional: OS reduce transparency → overlays denser/solid.

- [ ] **Step 5: Changelog + final commit**

Prepend under `## Changelog` in `.cursor/rules/project-context.mdc` (keep ≤20 entries; edit same-day `scope` if present rather than duplicate):

```markdown
- **2026-08-03** `hybrid-h-foundation`: Hybrid H tokens light/dark/HC + `motion` façade (`springTo`); `public/tokens.css`, `public/js/ui-motion.mjs`, `design.md`.
```

```bash
git add .cursor/rules/project-context.mdc public/js/app.bundle.mjs public/js/app.bundle.mjs.map public/js/chunks 2>/dev/null || true
# Prefer only sources if bundles are gitignored — stage what the repo tracks:
git status --short
git add design.md docs/core/06-design-system.md public/tokens.css public/styles/motion.css public/js/ui-motion.mjs public/js/ui-motion.test.mjs package.json package-lock.json .cursor/rules/project-context.mdc
git commit -m "$(cat <<'EOF'
feat(ui): Hybrid H foundation — tokens, motion façade, design docs

docs(context): hybrid-h-foundation changelog
EOF
)"
```

If earlier task commits already landed pieces, this step only commits remaining files + changelog (do not re-commit identical trees).

---

## Self-review (plan vs Spec A)

| Spec A requirement | Task |
| --- | --- |
| Hybrid H light/dark/HC tokens | 4, 5 |
| Material solid + glass tokens | 4, 5 |
| Emil easings + press scale | 4, 6 |
| Install `motion` | 1 |
| `ui-motion` façade + test | 2, 3 |
| `prefers-reduced-motion/transparency/contrast` | 5 (+ spring path in 3) |
| `design.md` + `06-design-system.md` | 7 |
| Legacy aliases still work | 4 (`--action`, `--overlay-*`, `--error`, …) |
| Zero feature layout redesign | Explicit out of scope |
| Keep mono for labs | Task 4 `--font-mono` unchanged family |
| metrics / no bad boot import | Task 8 |
| No Sonner/cmdk/base-ui React pkgs | Not installed |

**Placeholders:** none intentional.  
**API names:** `springTo`, `getReleaseVelocity` consistent across tasks 2–3 and Spec B dependency note.

---

## Stop gate

**Do not start Spec B** until this plan is implemented and the app is visually smoke-checked light/dark.

After user approves this plan, choose execution mode:

1. **Subagent-Driven** (recommended) — fresh subagent per task + review between tasks  
2. **Inline Execution** — execute in-session with checkpoints  

Specs for the program are force-staged separately (`git add -f docs/superpowers/specs/2026-08-03-apple-hybrid-ui-*.md`) — commit those when the user asks (do not mix with unrelated WIP).
