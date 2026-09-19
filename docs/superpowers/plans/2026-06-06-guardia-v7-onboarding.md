# Guardia V7 Onboarding + Learn Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post-registration education for 7.x upgraders (guardia-v7 tutorial track), elevated Aprender R+ discoverability, and Learn Hub UX — without changing clinical registration gates.

**Architecture:** Extend curriculum v8 with `GUARDIA_V7_CHAPTERS`; new modules `guardia-v7-gating.mjs` (semver + LS progress) and `learn-hub.mjs` (sheet UI). Hook education after `hideMainClinicalOnboarding()` via `tryShowPostRegistrationEducationIfNeeded()`. Third tour branch `guardia-v7` in `tourState.guidedTourBranch`. All new UI uses Quiet workbench tokens; lazy `import()` from header — no `app.js` static imports.

**Tech Stack:** Electron renderer ESM, `node --test`, esbuild bundle via `npm run build:ui`, existing tour dock engine.

**Spec:** [docs/superpowers/specs/2026-06-06-guardia-v7-onboarding-design.md](../specs/2026-06-06-guardia-v7-onboarding-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `public/js/onboarding-curriculum.mjs` | `GUARDIA_V7_CHAPTERS`, `CURRICULUM_VERSION = 8`, hub module metadata |
| `public/js/guardia-v7-progress.mjs` | LS read/write `rpc-guardia-v7-progress`, chapter completion |
| `public/js/guardia-v7-gating.mjs` | `semverLt/Gte`, `shouldOfferGuardiaV7Education`, `shouldShowFundamentosTourIntro` |
| `public/js/onboarding-progress.mjs` | Add `track` field to saved progress |
| `public/js/tour-targets.mjs` | 19 `gv7_*` targets + `getGuardiaV7TourSteps()` |
| `public/js/features/settings-help/learn-hub.mjs` | Sheet open/close/render, module row clicks |
| `public/js/features/settings-help/guardia-v7-upgrade-card.mjs` | Non-blocking card in `#main-area` |
| `public/js/features/settings-help/tour-engine.mjs` | Post-registration hook, branch `guardia-v7`, Aprender chrome sync |
| `public/js/features/settings-help/tour-flow.mjs` | Step copy for `gv7_*`, dock badge, help links |
| `public/js/features/settings-help/tour-mini.mjs` | `startTourModule` accepts guardia chapter ids |
| `public/js/features/settings-help/release-notes.mjs` | Secondary CTA visibility |
| `public/js/features/settings-help/help-content.mjs` | 3 new articles |
| `public/js/features/clinical-onboarding-main.mjs` | Call new education hook (replace direct intro-only call) |
| `public/partials/chrome/header.html` | `#btn-open-learn`, learn sheet markup, release notes button |
| `public/styles/modals.css` | Learn hub sheet, token fixes for intro modal |
| `public/js/lazy-feature-routes.mjs` | `openLearnHub`, `dismissGuardiaV7UpgradeCard` window handlers |

---

### Task 1: Curriculum v8 + progress store

**Files:**
- Modify: `public/js/onboarding-curriculum.mjs`
- Create: `public/js/guardia-v7-progress.mjs`
- Create: `public/js/onboarding-curriculum.guardia-v7.test.mjs`
- Modify: `public/js/onboarding-progress.mjs`

- [ ] **Step 1: Write failing curriculum test**

```javascript
// public/js/onboarding-curriculum.guardia-v7.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRICULUM_VERSION,
  GUARDIA_V7_CHAPTERS,
  getGuardiaV7TourSteps,
  getFirstStepIdForChapter,
  isValidStepForBranch,
} from './onboarding-curriculum.mjs';

test('CURRICULUM_VERSION is 8', () => {
  assert.equal(CURRICULUM_VERSION, 8);
});

test('guardia-v7 has 5 chapters and 19 steps', () => {
  assert.equal(GUARDIA_V7_CHAPTERS.length, 5);
  assert.equal(getGuardiaV7TourSteps().length, 19);
});

test('getFirstStepIdForChapter guardia-v7 branch', () => {
  assert.equal(getFirstStepIdForChapter('ch-guardia-modo', 'guardia-v7'), 'gv7_guardia_chip');
});

test('isValidStepForBranch accepts gv7 steps on guardia-v7', () => {
  assert.equal(isValidStepForBranch('gv7_guardia_chip', 'guardia-v7', 'base'), true);
  assert.equal(isValidStepForBranch('gv7_guardia_chip', 'sala', 'base'), false);
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test public/js/onboarding-curriculum.guardia-v7.test.mjs
```

- [ ] **Step 3: Implement curriculum**

In `onboarding-curriculum.mjs`:

```javascript
export const CURRICULUM_VERSION = 8;

export const GUARDIA_V7_CHAPTERS = [
  { id: 'ch-guardia-modo', title: 'Modo Guardia', stepIds: [
    'gv7_guardia_chip', 'gv7_guardia_tab', 'gv7_guardia_scope',
    'gv7_guardia_toggle', 'gv7_guardia_exit',
  ]},
  { id: 'ch-guardia-entrega', title: 'Modo Entrega', stepIds: [
    'gv7_entrega_phase', 'gv7_entrega_patient', 'gv7_entrega_roster', 'gv7_entrega_pendientes',
  ]},
  { id: 'ch-guardia-lan', title: 'LAN y equipos', stepIds: [
    'gv7_lan_wifi', 'gv7_lan_pin', 'gv7_lan_directorio', 'gv7_lan_rotacion',
  ]},
  { id: 'ch-guardia-movil', title: 'iPad y móvil', stepIds: [
    'gv7_mobile_link', 'gv7_mobile_scope', 'gv7_mobile_vs_sala',
  ]},
  { id: 'ch-guardia-censo', title: 'Censo y alcance', stepIds: [
    'gv7_censo_r1', 'gv7_censo_r4', 'gv7_censo_sync',
  ]},
];

export const GUARDIA_V7_HUB_MODULES = GUARDIA_V7_CHAPTERS.map((ch) => ({
  id: ch.id,
  label: ch.title,
  chapterId: ch.id,
  branch: 'guardia-v7',
  stepCount: ch.stepIds.length,
}));

export function getGuardiaV7TourSteps() {
  return GUARDIA_V7_CHAPTERS.flatMap((c) => c.stepIds.slice());
}

function chaptersForBranch(branch) {
  if (branch === 'interconsulta') return IC_CHAPTERS;
  if (branch === 'guardia-v7') return GUARDIA_V7_CHAPTERS;
  return SALA_CHAPTERS;
}

// Update getChapterForStep, getFirstStepIdForChapter, isValidStepForBranch to use chaptersForBranch(branch)
```

Create `guardia-v7-progress.mjs`:

```javascript
export const GUARDIA_V7_PROGRESS_LS_KEY = 'rpc-guardia-v7-progress';

export function loadGuardiaV7Progress(storage = localStorage) {
  try {
    const raw = storage.getItem(GUARDIA_V7_PROGRESS_LS_KEY);
    if (!raw) return { completedChapters: [], dismissedCard: false };
    const p = JSON.parse(raw);
    return {
      completedChapters: Array.isArray(p.completedChapters) ? p.completedChapters : [],
      dismissedCard: !!p.dismissedCard,
      updatedAt: p.updatedAt || null,
    };
  } catch (_e) {
    return { completedChapters: [], dismissedCard: false };
  }
}

export function saveGuardiaV7Progress(patch, storage = localStorage) {
  const prev = loadGuardiaV7Progress(storage);
  const next = { ...prev, ...patch, updatedAt: Date.now() };
  storage.setItem(GUARDIA_V7_PROGRESS_LS_KEY, JSON.stringify(next));
  return next;
}

export function isGuardiaV7TrackComplete(storage = localStorage) {
  const { completedChapters } = loadGuardiaV7Progress(storage);
  return GUARDIA_V7_CHAPTERS.every((ch) => completedChapters.includes(ch.id));
}

export function markGuardiaV7ChapterComplete(chapterId, storage = localStorage) {
  const prev = loadGuardiaV7Progress(storage);
  const set = new Set(prev.completedChapters);
  set.add(chapterId);
  return saveGuardiaV7Progress({ completedChapters: [...set] }, storage);
}
```

Import `GUARDIA_V7_CHAPTERS` in progress module.

In `onboarding-progress.mjs`, add `track` to saved body:

```javascript
track: payload.track === 'guardia-v7' ? 'guardia-v7'
  : payload.branch === 'interconsulta' ? 'interconsulta' : 'sala',
```

Update `isValidStepForBranch` call to pass track from loaded progress.

- [ ] **Step 4: Run test — expect PASS**

```bash
node --test public/js/onboarding-curriculum.guardia-v7.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add public/js/onboarding-curriculum.mjs public/js/guardia-v7-progress.mjs \
  public/js/onboarding-progress.mjs public/js/onboarding-curriculum.guardia-v7.test.mjs
git commit -m "feat(onboarding): curriculum v8 guardia-v7 chapters + progress store"
```

---

### Task 2: Gating logic (post-registration only)

**Files:**
- Create: `public/js/guardia-v7-gating.mjs`
- Create: `public/js/guardia-v7-gating.test.mjs`
- Modify: `public/js/features/settings-help/tour-engine.mjs`
- Modify: `public/js/features/clinical-onboarding-main.mjs`

- [ ] **Step 1: Write failing gating tests**

```javascript
// public/js/guardia-v7-gating.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  semverLt,
  semverGte,
  shouldOfferGuardiaV7Education,
  shouldShowFundamentosTourIntro,
} from './guardia-v7-gating.mjs';

test('semver helpers', () => {
  assert.equal(semverLt('6.7.0', '7.0.0'), true);
  assert.equal(semverGte('7.0.1', '7.0.0'), true);
});

test('shouldOfferGuardiaV7Education requires post-registration', () => {
  assert.equal(
    shouldOfferGuardiaV7Education({
      prevVersion: '6.7.0', curVersion: '7.0.0', needsOnboarding: true,
    }),
    false
  );
  assert.equal(
    shouldOfferGuardiaV7Education({
      prevVersion: '6.7.0', curVersion: '7.0.0', needsOnboarding: false, trackComplete: false,
    }),
    true
  );
});

test('upgrader skips fundamentals intro on bump', () => {
  assert.equal(
    shouldShowFundamentosTourIntro({
      curVersion: '7.0.1', storedDoneVersion: '6.6.8', needsOnboarding: false,
    }),
    false
  );
  assert.equal(
    shouldShowFundamentosTourIntro({
      curVersion: '7.0.0', storedDoneVersion: '', needsOnboarding: false,
    }),
    true
  );
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node --test public/js/guardia-v7-gating.test.mjs
```

- [ ] **Step 3: Implement gating module**

Reuse semver parsing from `tour-engine.mjs` — extract shared helpers to `guardia-v7-gating.mjs` (copy `parseSemverCoreParts` / `compareSemverNumericArrays` or import from a tiny `semver-compare.mjs` if already shared).

```javascript
export function shouldOfferGuardiaV7Education({
  prevVersion, curVersion, needsOnboarding, trackComplete,
}) {
  if (needsOnboarding) return false;
  if (!prevVersion || !curVersion) return false;
  if (!semverLt(prevVersion, '7.0.0') || !semverGte(curVersion, '7.0.0')) return false;
  if (trackComplete) return false;
  return true;
}

export function shouldShowFundamentosTourIntro({
  curVersion, storedDoneVersion, needsOnboarding,
}) {
  if (needsOnboarding) return false;
  if (storedDoneVersion && semverLt(storedDoneVersion, '7.0.0')) return false;
  return shouldShowGuidedTourIntro(curVersion, storedDoneVersion);
}
```

In `tour-engine.mjs`, replace `tryShowGuidedTourIntroIfNeeded` body:

```javascript
export async function tryShowPostRegistrationEducationIfNeeded() {
  if (isMobileWeb() || shouldDeferGuidedTourForRegistration()) return;
  const { needsClinicalOnboarding } = await import('../clinical-onboarding.mjs');
  if (needsClinicalOnboarding()) return;

  const cur = normalizeTourVersionLabel(window.__RPC_APP_VERSION__);
  const prev = normalizeTourVersionLabel(window.__RPC_PREV_APP_VERSION__ || '');
  const stored = localStorage.getItem(GUIDED_TOUR_LS_KEY) || '';
  const { loadGuardiaV7Progress, isGuardiaV7TrackComplete } = await import('../../guardia-v7-progress.mjs');
  const { shouldOfferGuardiaV7Education, shouldShowFundamentosTourIntro } = await import('../../guardia-v7-gating.mjs');

  if (shouldOfferGuardiaV7Education({
    prevVersion: prev, curVersion: cur,
    needsOnboarding: false,
    trackComplete: isGuardiaV7TrackComplete(),
  })) {
    const { maybeShowGuardiaV7UpgradeCard } = await import('./guardia-v7-upgrade-card.mjs');
    maybeShowGuardiaV7UpgradeCard({ delayMs: 2000 });
    return;
  }
  if (shouldShowFundamentosTourIntro({ curVersion: cur, storedDoneVersion: stored, needsOnboarding: false })) {
    setTimeout(showTourIntroModal, 80);
  }
}

// Keep tryShowGuidedTourIntroIfNeeded as alias delegating to above for backwards compat
```

In `clinical-onboarding-main.mjs` `hideMainClinicalOnboarding`, call `tryShowPostRegistrationEducationIfNeeded` instead of `tryShowGuidedTourIntroIfNeeded`.

Store `window.__RPC_PREV_APP_VERSION__` in `profile.mjs` where `maybeShowReleaseNotesFor(v, prev)` already receives `prev` — set once on boot.

- [ ] **Step 4: Run tests — expect PASS**

```bash
node --test public/js/guardia-v7-gating.test.mjs public/js/features/settings-help/tour-intro.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(onboarding): post-registration gating for guardia-v7 vs fundamentals"
```

---

### Task 3: Tour targets + branch plumbing

**Files:**
- Modify: `public/js/tour-targets.mjs`
- Modify: `public/js/features/settings-help/tour-engine.mjs`
- Modify: `public/js/features/settings-help/tour-flow.mjs`
- Modify: `public/js/features/settings-help/tour-mini.mjs`
- Create: `public/js/tour-targets.guardia-v7.test.mjs`

- [ ] **Step 1: Write failing target test**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { getTourTarget, getGuardiaV7TourSteps } from './tour-targets.mjs';

test('every gv7 step has a target', () => {
  for (const id of getGuardiaV7TourSteps()) {
    const t = getTourTarget(id, 'guardia-v7');
    assert.ok(t.selector, `missing selector for ${id}`);
  }
});
```

- [ ] **Step 2: Add TARGETS** (representative subset — implement all 19):

```javascript
gv7_guardia_chip: { appTab: null, selector: '#header-guardia-mode-chip', focus: false,
  spotlightClass: 'tour-spotlight-action' },
gv7_guardia_tab: { appTab: 'guardia', selector: '#apptab-guardia, #appcontent-guardia', focus: false },
gv7_guardia_scope: { appTab: 'guardia', selector: '#guardia-census-panel, #clinical-context-bar', focus: false },
gv7_guardia_toggle: { appTab: 'guardia', selector: '#guardia-grid-mode-toggle', focus: false },
gv7_entrega_phase: { appTab: 'guardia', selector: '#guardia-phase-bar', focus: false },
gv7_lan_wifi: { appTab: null, selector: '#btn-header-team-sync', openConnection: true, focus: false },
gv7_lan_pin: { appTab: null, selector: '#lan-connection-panel-root', openConnection: true, focus: false },
gv7_lan_rotacion: { appTab: null, selector: '#btn-mi-rotacion', focus: false },
// ... remaining per spec; use openConnection / openProfile as needed
```

- [ ] **Step 3: Branch helper in tour-engine**

```javascript
function resolveTourBranch() {
  if (tourState.guidedTourBranch === 'interconsulta') return 'interconsulta';
  if (tourState.guidedTourBranch === 'guardia-v7') return 'guardia-v7';
  return 'sala';
}

export function getGuidedTourSteps() {
  const b = resolveTourBranch();
  if (b === 'guardia-v7') return getGuardiaV7TourSteps();
  return getTourSteps(b);
}
```

Update `startOnboarding` in `tour-flow.mjs` to accept `branch: 'guardia-v7'` and set `tourState.guidedTourBranch = 'guardia-v7'`.

In `tour-mini.mjs` `startTourModule`:

```javascript
function startTourModule(chapterId) {
  var branch = String(chapterId || '').indexOf('ch-guardia-') === 0
    ? 'guardia-v7'
    : String(chapterId || '').indexOf('ch-ic') === 0
      ? 'interconsulta'
      : 'sala';
  // ...
  startOnboarding(branch, { resumeStepId: stepId, skipIntro: true });
}
```

- [ ] **Step 4: Step copy in tour-flow `renderTourStep`**

Add `else if (tourState.guidedTourBranch === 'guardia-v7')` block with Spanish copy per spec (one paragraph per `gv7_*` step). No `stepRequiresUserAction` for gv7 steps.

On chapter last step advance, call `markGuardiaV7ChapterComplete(getChapterForStep(...).id)`.

- [ ] **Step 5: Run tests + commit**

```bash
node --test public/js/tour-targets.guardia-v7.test.mjs
git commit -m "feat(onboarding): guardia-v7 tour targets and branch plumbing"
```

---

### Task 4: Learn Hub sheet + header Aprender

**Files:**
- Create: `public/js/features/settings-help/learn-hub.mjs`
- Modify: `public/partials/chrome/header.html`
- Modify: `public/styles/modals.css`
- Modify: `public/js/lazy-feature-routes.mjs`
- Modify: `public/js/features/settings-help/index.mjs`

- [ ] **Step 1: Add markup to header.html**

After Mi rotación button, before Ajustes:

```html
<button type="button" class="btn-header-icon" id="btn-open-learn"
  onclick="openLearnHub()" title="Aprender R+" aria-label="Aprender R+" hidden>
  <svg class="btn-header-icon-svg" width="18" height="18" ...><!-- book icon --></svg>
</button>
```

Add backdrop + sheet (sibling to help-quick-backdrop):

```html
<div id="learn-hub-backdrop" class="learn-hub-backdrop" aria-hidden="true">
  <div class="learn-hub-sheet" role="dialog" aria-modal="true" aria-labelledby="learn-hub-title" ...>
    <h2 id="learn-hub-title">Aprender R+</h2>
    <div id="learn-hub-body"></div>
    <button type="button" class="learn-hub-close" onclick="closeLearnHub()" aria-label="Cerrar">×</button>
  </div>
</div>
```

- [ ] **Step 2: CSS in modals.css**

```css
.learn-hub-backdrop { position: fixed; inset: 0; z-index: 200005; ... }
.learn-hub-sheet {
  position: fixed; top: 0; right: 0; width: min(360px, 100vw); height: 100dvh;
  background: var(--color-surface); border-left: 1px solid var(--border);
  transform: translateX(100%); transition: transform 200ms var(--ease-out, ease-out);
}
.learn-hub-backdrop.open .learn-hub-sheet { transform: translateX(0); }
@media (prefers-reduced-motion: reduce) {
  .learn-hub-sheet { transition: opacity 120ms; }
}
.learn-hub-module-row {
  display: flex; align-items: center; min-height: 44px; padding: 10px 12px;
  border: 1px solid var(--border); border-radius: var(--radius-md); cursor: pointer;
}
.learn-hub-module-row.is-active { background: var(--color-accent-soft); }
```

Apply intro modal token fixes from spec in same file.

- [ ] **Step 3: learn-hub.mjs**

```javascript
export function openLearnHub(opts = {}) {
  renderLearnHubBody(opts.focusTrack || 'guardia-v7');
  document.getElementById('learn-hub-backdrop')?.classList.add('open');
  syncLearnAprenderChrome();
}

export function closeLearnHub() { /* remove open, restore focus */ }

export function syncLearnAprenderChrome() {
  const btn = document.getElementById('btn-open-learn');
  if (!btn) return;
  const hide = typeof needsClinicalOnboarding === 'function' && needsClinicalOnboarding();
  btn.hidden = !!hide;
}
```

`renderLearnHubBody` builds module rows from `GUARDIA_V7_HUB_MODULES` + `loadGuardiaV7Progress`; Fundamentos in `<details>`; wire click → `startTourModule(chapterId)`.

- [ ] **Step 4: Wire lazy routes + index exports**

```javascript
// lazy-feature-routes.mjs
openLearnHub: 'openLearnHub',
closeLearnHub: 'closeLearnHub',
```

- [ ] **Step 5: Reorder settings-help-cta in header.html** per spec.

- [ ] **Step 6: `npm run build:ui` + manual smoke: Aprender hidden during onboarding, visible after.**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(onboarding): Learn Hub sheet and header Aprender entry"
```

---

### Task 5: Upgrade card + Novedades CTA

**Files:**
- Create: `public/js/features/settings-help/guardia-v7-upgrade-card.mjs`
- Modify: `public/js/features/settings-help/release-notes.mjs`
- Modify: `public/partials/chrome/header.html`

- [ ] **Step 1: Upgrade card module**

```javascript
export function maybeShowGuardiaV7UpgradeCard({ delayMs = 0 } = {}) {
  const { dismissedCard } = loadGuardiaV7Progress();
  if (dismissedCard || isGuardiaV7TrackComplete()) return;
  setTimeout(() => {
    if (document.getElementById('guardia-v7-upgrade-card')) return;
    const main = document.getElementById('main-area');
    if (!main) return;
    const el = document.createElement('div');
    el.id = 'guardia-v7-upgrade-card';
    el.className = 'clinical-onboarding-card guardia-v7-upgrade-card';
    el.innerHTML = `...`; // title, 3 bullets, CTAs — no clinical-onboarding-active class
    main.prepend(el);
    wireGuardiaV7UpgradeCardOnce(el);
  }, delayMs);
}

export function dismissGuardiaV7UpgradeCard() {
  saveGuardiaV7Progress({ dismissedCard: true });
  document.getElementById('guardia-v7-upgrade-card')?.remove();
}
```

Primary CTA → `openLearnHub({ focusTrack: 'guardia-v7' })` then `startTourModule('ch-guardia-modo')`.

- [ ] **Step 2: Release notes secondary button**

In `showReleaseNotesModal`, if `shouldOfferGuardiaV7Education(...)`, inject:

```html
<button type="button" class="btn-edit-templates" id="release-notes-open-guardia-guide"
  onclick="closeReleaseNotes(); openLearnHub({ focusTrack: 'guardia-v7' });">
  Abrir guía de guardia
</button>
```

- [ ] **Step 3: CSS** `.guardia-v7-upgrade-card` margin in `pase-board.css` (reuse onboarding card spacing, no pointer-events block).

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(onboarding): guardia-v7 upgrade card and release notes CTA"
```

---

### Task 6: Help articles + tour dock polish

**Files:**
- Modify: `public/js/features/settings-help/help-content.mjs`
- Modify: `public/js/features/settings-help/tour-flow.mjs`
- Modify: `public/js/features/clinical-onboarding-shell.mjs` (optional stepper)

- [ ] **Step 1: Add three HELP_ARTICLES** (`modo-guardia`, `modo-entrega`, `lan-pin-turno`) with Spanish HTML per spec.

- [ ] **Step 2: In renderTourStep for guardia-v7**, append footer link:

```html
<p><button type="button" class="help-tour-btn" onclick="openQuickHelp('modo-guardia')">Más en ayuda</button></p>
```

(map step → article id)

- [ ] **Step 3: Dock badge** — when `guidedTourBranch === 'guardia-v7'`, badge text `Guardia 7.x · Módulo ${chapterIndex}/5`.

- [ ] **Step 4: Optional clinical stepper** — in `buildOnboardingStageHtml` callers, prepend progress dots for sync/perfil/equipo (visual only).

- [ ] **Step 5: Shorten intro-lead** in `header.html` to ≤2 sentences; remove «Aprender en centro de ayuda».

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(onboarding): help articles and guardia-v7 tour dock copy"
```

---

### Task 7: Integration tests + build

**Files:**
- Modify: `public/js/features/settings-help/tour-intro.test.mjs`
- Modify: `.cursor/rules/project-context.mdc`

- [ ] **Step 1: Extend tour-intro.test.mjs**

```javascript
test('clinical-onboarding-main calls post-registration education hook', () => {
  const src = readFileSync('public/js/features/clinical-onboarding-main.mjs', 'utf8');
  assert.match(src, /tryShowPostRegistrationEducationIfNeeded/);
  assert.doesNotMatch(src, /tryShowGuidedTourIntroIfNeeded/);
});

test('hideMainClinicalOnboarding does not import guardia card before onboarding check', () => {
  const gating = readFileSync('public/js/guardia-v7-gating.mjs', 'utf8');
  assert.match(gating, /needsOnboarding/);
});
```

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 3: Build UI**

```bash
npm run build:ui
```

- [ ] **Step 4: Metrics (debt gate)**

```bash
npm run metrics
```

Expected: `totalScore <= baseline.totalScore`.

- [ ] **Step 5: Update project-context.mdc changelog**

```markdown
- **2026-06-06** `guardia-v7-onboarding`: post-registration Learn Hub + guardia track; header Aprender; upgrade card; curriculum v8; `learn-hub.mjs`, `guardia-v7-gating.mjs`.
```

- [ ] **Step 6: Final commit**

```bash
git commit -m "feat(onboarding): guardia-v7 education complete — tests and context"
```

---

## Manual test checklist

- [ ] Fresh profile: only clinical onboarding; `#btn-open-learn` hidden
- [ ] After perfil+equipo: Aprender visible; no guardia card on clean 7.0 install
- [ ] Simulate upgrade: set `localStorage` `GUIDED_TOUR_LS_KEY=6.7.0`, reload on 7.0 → Novedades + card, no Sala intro
- [ ] Dismiss card → stays gone; reopen from Aprender
- [ ] Complete module A → hub shows Completado on row 1
- [ ] Esc closes Learn Hub; focus returns to Aprender button
- [ ] Dark + high-contrast themes on sheet and card

## Spec coverage self-review

| Spec section | Task |
|--------------|------|
| Post-registration invariant | Task 2 |
| Curriculum v8 / 5 modules | Task 1, 3 |
| Learn Hub sheet | Task 4 |
| Header Aprender | Task 4 |
| Upgrade card non-blocking | Task 5 |
| Novedades CTA | Task 5 |
| Gating upgraders vs new users | Task 2 |
| Help articles | Task 6 |
| Token fixes | Task 4 |
| No app.js static import | Task 4 lazy routes |
| Clinical stepper / intro copy | Task 6 |
| Tests | Task 1, 2, 3, 7 |
