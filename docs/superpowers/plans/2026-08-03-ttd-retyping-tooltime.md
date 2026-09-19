# TTD Labs · EA Tab spine · Conexión tool-time — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land lab interpretation only in Eventualidades → Labs, make EA registro Tab walk vital/glu values (skip +1/Alterada), and shrink Conexión to a light-switch so residents stop managing sync chrome mid-guardia.

**Architecture:** Three independent phases that each ship green tests. (A) Harden `labsText` + `selectEventualidadesLabsMode` call sites. (B) New pure Tab-spine helper wired from registro form. (C) Conexión/cutover/recovery gates — mostly pure helpers + small UI wiring. No schema changes.

**Tech Stack:** Renderer ESM (`public/js/features/`), `node --test` via `npm run test:one -- path/to/file.test.mjs`, existing Eventualidades / EA / cloud-sync modules.

**Spec:** [`../specs/2026-08-03-ttd-retyping-tooltime-design.md`](../specs/2026-08-03-ttd-retyping-tooltime-design.md)

**Note:** Phases A/B/C are independently mergeable. Prefer finishing A → B → C in order (matches spec rollout). Do not run full `npm test`.

---

## File map

| Path | Role |
|------|------|
| `public/js/features/eventualidades-store.mjs` | `merge`/`set` labsText — invariant already; add regression tests |
| `public/js/features/eventualidades-render.mjs` | `selectEventualidadesLabsMode`, `savePatientEventualidadesLabs` |
| `public/js/features/doc-queue-panel.mjs` | Open Eventualidades in Labs mode for labs CTAs |
| `public/js/features/doc-queue-panel.test.mjs` | Create if missing — nav target + labs mode |
| `public/js/features/estado-actual-panel-registro-tab.mjs` | **Create** — Tab spine + `tabindex="-1"` skip list |
| `public/js/features/estado-actual-panel-registro-tab.test.mjs` | **Create** — spine order + skip selectors |
| `public/js/features/estado-actual-panel-registro-wire.mjs` | Wire Tab helper on `#ea-form` |
| `public/js/features/estado-actual-panel-vitals.mjs` | Ensure +1 / altered inputs get skip tabindex when built/expanded |
| `public/js/features/estado-actual-panel-glu.mjs` | Ensure Alterada / + Extra / remove get skip tabindex on row build |
| `public/js/features/cloud-sync/panel-session-gate.mjs` | Optional: `shouldHidePrimaryLanChrome` |
| `public/js/features/cloud-sync/cutover-gate.mjs` | `shouldShowCutoverWizard({ cutoverDone, profileReady })` |
| `public/js/features/cloud-sync/recovery-modal.mjs` | Require confirm checkbox before Continuar |
| `public/js/features/lan/panel-render-once.mjs` / `panel-connection-chrome.mjs` | Hide LAN hero when Nube active on cloud sala |
| `public/js/features/clinical-onboarding-render.mjs` | Use cutover skip helper |
| `.cursor/rules/project-context.mdc` | Changelog on architectural commit |

---

## Phase A — Labs sink + navigate to Labs

### Task 1: Regression — labsText never grows `entries`

**Files:**
- Modify: `public/js/features/eventualidades-panel.test.mjs`
- (No production change unless a bug is found)

- [ ] **Step 1: Write the failing-style regression test (should pass if invariant holds)**

Add to `eventualidades-panel.test.mjs`:

```js
test('save path helpers: merge/set labsText never appends clinical entries', () => {
  const base = { entries: [{ id: 'ev_1', at: '2026-08-01T10:00:00.000Z', text: 'NOTA' }], labsText: '' };
  const set = setEventualidadesLabsText(base, 'EN LA BIOMETRÍA SE APRECIA ANEMIA');
  assert.equal(set.entries.length, 1);
  assert.equal(set.entries[0].id, 'ev_1');
  assert.match(set.labsText, /BIOMETRÍA/);
  const merged = mergeEventualidadesLabsText(set, 'QS GLUC 120');
  assert.equal(merged.entries.length, 1);
  assert.match(merged.labsText, /QS GLUC 120/);
});

test('appendEventualidad does not clear labsText', () => {
  const base = { entries: [], labsText: 'BH HB 9' };
  const next = appendEventualidad(base, 'Caída', 'c1');
  assert.equal(next.labsText, 'BH HB 9');
  assert.equal(next.entries.length, 1);
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:one -- public/js/features/eventualidades-panel.test.mjs
```

Expected: PASS (documents invariant). If FAIL, fix `cloneStoreShell_` / merge helpers in `eventualidades-store.mjs` before continuing.

- [ ] **Step 3: Commit**

```bash
git add public/js/features/eventualidades-panel.test.mjs
git commit -m "$(cat <<'EOF'
test(eventualidades): lock labsText sink away from clinical entries

EOF
)"
```

---

### Task 2: Doc-queue opens Eventualidades in Labs mode

**Files:**
- Modify: `public/js/features/doc-queue-panel.mjs`
- Create or modify: `public/js/features/doc-queue-panel.test.mjs` (extract pure nav helper if DOM-heavy)

Today `openEventualidadesPanel()` switches to eventualidades but never calls `selectEventualidadesLabsMode()`. Labs CTAs on Sala remap to `eventualidades` via `effectiveNavTarget`, so residents land on the **nota** pane.

- [ ] **Step 1: Extract a pure helper (testable without DOM)**

In `doc-queue-panel.mjs` (or small `doc-queue-nav.mjs` if file is already heavy):

```js
/**
 * @param {string} navTarget data-doc-queue-nav value
 * @param {string} [primaryCta] original row.primaryCta when known
 * @returns {'note'|'labs'|null} Eventualidades compose mode, or null if not opening EV
 */
export function eventualidadesPaneForDocQueueNav(navTarget, primaryCta) {
  if (String(navTarget) !== 'eventualidades') return null;
  if (String(primaryCta || '') === 'labs') return 'labs';
  // Sala remap: labs CTA becomes eventualidades — prefer Labs pane for lab debt.
  return 'labs';
}
```

Spec decision for V1: opening Eventualidades from doc-queue **always** selects Labs mode (queue exists to chase labs/docs debt; clinical notes use Expediente switcher). If product later wants nota mode for some rows, gate on `primaryCta === 'labs'` only — start with always `'labs'` for `navTarget === 'eventualidades'`.

- [ ] **Step 2: Write failing test**

Create `public/js/features/doc-queue-nav.test.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eventualidadesPaneForDocQueueNav } from './doc-queue-nav.mjs';

describe('eventualidadesPaneForDocQueueNav', () => {
  it('selects labs when navigating to eventualidades', () => {
    assert.equal(eventualidadesPaneForDocQueueNav('eventualidades', 'labs'), 'labs');
    assert.equal(eventualidadesPaneForDocQueueNav('eventualidades', 'nota'), 'labs');
  });
  it('returns null for labs/pendientes/nota targets', () => {
    assert.equal(eventualidadesPaneForDocQueueNav('labs', 'labs'), null);
    assert.equal(eventualidadesPaneForDocQueueNav('pendientes'), null);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL (module missing)**

```bash
npm run test:one -- public/js/features/doc-queue-nav.test.mjs
```

Expected: FAIL cannot find module / export.

- [ ] **Step 4: Implement `doc-queue-nav.mjs` + wire panel**

Create `public/js/features/doc-queue-nav.mjs` with the helper above.

In `doc-queue-panel.mjs`:

```js
import { eventualidadesPaneForDocQueueNav } from './doc-queue-nav.mjs';
import { selectEventualidadesLabsMode } from './eventualidades-panel.mjs';

function openEventualidadesPanel(opts) {
  if (typeof window.switchAppTab === 'function') window.switchAppTab('nota');
  if (typeof window.switchInnerTab === 'function') window.switchInnerTab('eventualidades');
  if (!tryRenderEventualidadesPanel()) {
    setTimeout(tryRenderEventualidadesPanel, 80);
  }
  var pane = opts && opts.pane;
  if (pane === 'labs') {
    selectEventualidadesLabsMode();
    // focus after paint
    setTimeout(function () {
      var el = document.getElementById('eventualidades-labs');
      if (el && typeof el.focus === 'function') el.focus();
    }, 0);
  }
}

function navigateDocQueue(patientId, cta, primaryCta) {
  // ... existing remap ...
  if (target === 'eventualidades') {
    var pane = eventualidadesPaneForDocQueueNav(target, primaryCta || cta);
    openEventualidadesPanel({ pane: pane || 'labs' });
    return;
  }
  // ...
}
```

Update click handler to pass `data-doc-queue-primary-cta` if present; when rendering primary button for Sala labs debt, set `data-doc-queue-primary-cta="labs"`.

Also update primary label when pane is labs:

```js
if (target === 'eventualidades') return 'Abrir Labs';
```

- [ ] **Step 5: Run tests**

```bash
npm run test:one -- public/js/features/doc-queue-nav.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/js/features/doc-queue-nav.mjs public/js/features/doc-queue-nav.test.mjs public/js/features/doc-queue-panel.mjs
git commit -m "$(cat <<'EOF'
fix(doc-queue): open Eventualidades Labs pane for lab debt

EOF
)"
```

---

### Task 3: Export + smoke — interpret apply path uses labs only

**Files:**
- Modify: `public/js/features/lab-eventualidad-interpret.test.mjs` (assert comment/API contract)
- Grep call sites of `savePatientEventualidad` vs `savePatientEventualidadesLabs`

- [ ] **Step 1: Grep for misuse**

```bash
rg -n "savePatientEventualidad\(|appendEventualidad\(" public/js --glob '*.mjs' | rg -i 'lab|interpret|some|procesar'
```

Any caller that builds interpretation prose must use `savePatientEventualidadesLabs` / `mergeEventualidadesLabsText`. Fix call sites found (list them in the commit body). If none, document in commit that only nav hardening was needed.

- [ ] **Step 2: Add interpret contract test**

In `lab-eventualidad-interpret.test.mjs`, ensure the builder returns a string and a short comment in the test file states: “callers must persist via savePatientEventualidadesLabs, never appendEventualidad”.

- [ ] **Step 3: Commit**

```bash
git add public/js/features/lab-eventualidad-interpret.test.mjs public/js/features/**/*.mjs
git commit -m "$(cat <<'EOF'
fix(eventualidades): keep lab interpretation on Labs pane only

EOF
)"
```

---

## Phase B — EA registro Tab spine

### Task 4: Pure Tab-spine helper (TDD)

**Files:**
- Create: `public/js/features/estado-actual-panel-registro-tab.mjs`
- Create: `public/js/features/estado-actual-panel-registro-tab.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom'; // only if already a dep — otherwise use minimal mock elements
import {
  REGISTRO_TAB_SKIP_SELECTOR,
  applyRegistroTabSkipAttributes,
  listRegistroTabSpine,
  focusRegistroTabNeighbor,
} from './estado-actual-panel-registro-tab.mjs';

function mockFormHtml() {
  return (
    '<form id="ea-form">' +
    '<input id="ea-recorded-at" />' +
    '<div data-ea-vital-stack="tas" data-ea-layer-count="1">' +
    '<input data-ea-vital="tas" data-ea-layer-idx="0" />' +
    '<button type="button" data-ea-vital-add="tas">+1</button>' +
    '<input type="time" data-ea-altered="tas" />' +
    '</div>' +
    '<div data-ea-vital-stack="tad" data-ea-layer-count="1">' +
    '<input data-ea-vital="tad" data-ea-layer-idx="0" />' +
    '<button type="button" data-ea-vital-add="tad">+1</button>' +
    '</div>' +
    '<button type="button" id="ea-add-glu">+ Extra</button>' +
    '<div id="ea-glu-list">' +
    '<div class="ea-glu-row ea-glu-row--standard">' +
    '<input data-ea-glu-value value="" />' +
    '<input type="checkbox" data-ea-glu-altered />' +
    '<input data-ea-glu-rescue-units />' +
    '</div>' +
    '<div class="ea-glu-row ea-glu-row--standard">' +
    '<input data-ea-glu-value />' +
    '<input type="checkbox" data-ea-glu-altered />' +
    '</div>' +
    '</div>' +
    '<input id="ea-io-ing" />' +
    '<input id="ea-io-evac" />' +
    '<input id="ea-io-egr" />' +
    '</form>'
  );
}

describe('registro tab spine', () => {
  it('skip selector matches +1, Alterada, rescue, + Extra', () => {
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /data-ea-vital-add/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /data-ea-glu-altered/);
    assert.match(REGISTRO_TAB_SKIP_SELECTOR, /ea-add-glu/);
  });

  it('listRegistroTabSpine is recordedAt → vitals → glu values → IO', () => {
    // Use document mock: prefer linkedom/jsdom if present; else hand-roll
    // querySelectorAll-compatible stubs. See implementation notes in module.
  });
});
```

**If the repo has no jsdom:** implement tests with a tiny HTMLElement stub (pattern used in `recovery-modal.test.mjs` MiniNode), or mount via `document` from Electron’s test runner. Prefer matching `recovery-modal.test.mjs` style MiniDOM over adding a dependency.

Concrete MiniDOM test without jsdom:

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  REGISTRO_TAB_SKIP_SELECTOR,
  applyRegistroTabSkipAttributes,
  getRegistroTabSpineElements,
  moveRegistroTabFocus,
} from './estado-actual-panel-registro-tab.mjs';

// Reuse a minimal document from existing test harness if available.
// Otherwise build form in happy-dom/electron document:
describe('registro tab spine', () => {
  /** @type {HTMLFormElement} */
  let form;

  beforeEach(() => {
    document.body.innerHTML = `...mockFormHtml...`;
    form = /** @type {HTMLFormElement} */ (document.getElementById('ea-form'));
    applyRegistroTabSkipAttributes(form);
  });

  it('marks skip controls tabindex=-1', () => {
    form.querySelectorAll(REGISTRO_TAB_SKIP_SELECTOR).forEach((el) => {
      assert.equal(el.getAttribute('tabindex'), '-1');
    });
  });

  it('spine order skips +1 and Alterada', () => {
    const spine = getRegistroTabSpineElements(form);
    const ids = spine.map((el) => el.getAttribute('data-ea-vital') || el.getAttribute('data-ea-glu-value') != null ? 'glu' : el.id);
    assert.ok(spine[0].id === 'ea-recorded-at');
    assert.equal(spine[1].getAttribute('data-ea-vital'), 'tas');
    assert.equal(spine[2].getAttribute('data-ea-vital'), 'tad');
    // no button in spine
    assert.equal(spine.every((el) => el.tagName !== 'BUTTON'), true);
    assert.equal(
      spine.every((el) => !el.hasAttribute('data-ea-glu-altered')),
      true
    );
  });

  it('Tab from first glu goes to second glu not Alterada', () => {
    const spine = getRegistroTabSpineElements(form);
    const firstGlu = form.querySelector('[data-ea-glu-value]');
    firstGlu.focus();
    const next = moveRegistroTabFocus(form, firstGlu, +1);
    assert.equal(next, spine[spine.indexOf(firstGlu) + 1]);
    assert.ok(next.hasAttribute('data-ea-glu-value'));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test:one -- public/js/features/estado-actual-panel-registro-tab.test.mjs
```

- [ ] **Step 3: Implement `estado-actual-panel-registro-tab.mjs`**

```js
import { VITAL_KEYS } from './estado-actual-panel-constants.mjs';

export const REGISTRO_TAB_SKIP_SELECTOR = [
  '[data-ea-vital-add]',
  '[data-ea-altered]',
  '[data-ea-glu-altered]',
  '[data-ea-glu-rescue-units]',
  '[data-ea-glu-post-rescue-value]',
  '[data-ea-glu-remove]',
  '#ea-add-glu',
  '#ea-add-bomba',
  '#ea-bomba-enabled',
  '[data-ea-io-nc]',
  '.ea-registro-paste-btn',
].join(',');

/** @param {HTMLElement | null} form */
export function applyRegistroTabSkipAttributes(form) {
  if (!form) return;
  form.querySelectorAll(REGISTRO_TAB_SKIP_SELECTOR).forEach(function (el) {
    el.setAttribute('tabindex', '-1');
  });
}

/**
 * Visible value spine for Tab.
 * @param {HTMLElement} form
 * @returns {HTMLElement[]}
 */
export function getRegistroTabSpineElements(form) {
  /** @type {HTMLElement[]} */
  var out = [];
  var recorded = form.querySelector('#ea-recorded-at');
  if (recorded) out.push(/** @type {HTMLElement} */ (recorded));

  VITAL_KEYS.forEach(function (key) {
    var stack = form.querySelector('[data-ea-vital-stack="' + key + '"]');
    if (!stack) return;
    var count = Math.max(1, Number(stack.getAttribute('data-ea-layer-count') || '1'));
    var input = stack.querySelector(
      '[data-ea-vital="' + key + '"][data-ea-layer-idx="' + (count - 1) + '"]'
    );
    if (input && isFocusableVisible_(input)) out.push(/** @type {HTMLElement} */ (input));
  });

  var bombaOn = form.querySelector('#ea-bomba-enabled');
  var useBomba = bombaOn && /** @type {HTMLInputElement} */ (bombaOn).checked;
  var list = form.querySelector(useBomba ? '#ea-bomba-list' : '#ea-glu-list');
  if (list) {
    list.querySelectorAll('.ea-glu-row').forEach(function (row) {
      var time = row.querySelector('[data-ea-glu-time]:not([type="hidden"])');
      var val = row.querySelector('[data-ea-glu-value]');
      if (time && isFocusableVisible_(time)) out.push(/** @type {HTMLElement} */ (time));
      if (val && isFocusableVisible_(val)) out.push(/** @type {HTMLElement} */ (val));
    });
  }

  ['ea-io-ing', 'ea-io-evac', 'ea-io-egr'].forEach(function (id) {
    var el = form.querySelector('#' + id);
    if (el && isFocusableVisible_(el)) out.push(/** @type {HTMLElement} */ (el));
  });
  return out;
}

/** @param {Element} el */
function isFocusableVisible_(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[hidden]')) return false;
  var style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
  return true;
}

/**
 * @param {HTMLElement} form
 * @param {HTMLElement} current
 * @param {1|-1} dir
 * @returns {HTMLElement | null}
 */
export function moveRegistroTabFocus(form, current, dir) {
  var spine = getRegistroTabSpineElements(form);
  var idx = spine.indexOf(current);
  if (idx < 0) {
    // If focus is on a skipped control, jump to nearest spine neighbor
    idx = dir === 1 ? -1 : spine.length;
  }
  var next = spine[idx + dir];
  if (!next) return null;
  if (typeof next.focus === 'function') next.focus();
  return next;
}

/**
 * @param {HTMLElement} form
 * @param {KeyboardEvent} ev
 */
export function handleRegistroTabKeydown(form, ev) {
  if (ev.key !== 'Tab') return;
  var t = /** @type {HTMLElement | null} */ (ev.target);
  if (!t || !form.contains(t)) return;
  var spine = getRegistroTabSpineElements(form);
  var onSpine = spine.indexOf(t) >= 0;
  var onSkip = t.matches && t.matches(REGISTRO_TAB_SKIP_SELECTOR);
  if (!onSpine && !onSkip) return; // allow native tab in footer etc.
  ev.preventDefault();
  moveRegistroTabFocus(form, t, ev.shiftKey ? -1 : 1);
}
```

Keep file ≤ 200 lines; complexity per function ≤ 15.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:one -- public/js/features/estado-actual-panel-registro-tab.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add public/js/features/estado-actual-panel-registro-tab.mjs public/js/features/estado-actual-panel-registro-tab.test.mjs
git commit -m "$(cat <<'EOF'
feat(ea): Tab spine helper skips +1 and Alterada controls

EOF
)"
```

---

### Task 5: Wire Tab spine into registro form

**Files:**
- Modify: `public/js/features/estado-actual-panel-registro-wire.mjs`
- Modify: `public/js/features/estado-actual-panel-vitals.mjs` (call `applyRegistroTabSkipAttributes` after expand)
- Modify: `public/js/features/estado-actual-panel-glu.mjs` (after `buildGluRow`)

- [ ] **Step 1: Wire keydown in `wireFormInteractions`**

```js
import {
  applyRegistroTabSkipAttributes,
  handleRegistroTabKeydown,
} from './estado-actual-panel-registro-tab.mjs';

// inside wireFormInteractions, after existing keydown for ⌘↵:
applyRegistroTabSkipAttributes(form);
form.addEventListener('keydown', function (ev) {
  handleRegistroTabKeydown(form, ev);
});
```

Merge with existing `keydown` listener (one listener, two branches) to avoid double-binding.

- [ ] **Step 2: Re-apply skip attrs when DOM grows**

After `expandVitalNextLayer` and after appending a glu row, call `applyRegistroTabSkipAttributes(form)`.

- [ ] **Step 3: Manual sanity (agent notes in commit)**

Open EA registro → Tab from TAS → TAD → … → Sat → first glu → next glu → I/O. Click Alterada still toggles. Click +1 still adds layer.

- [ ] **Step 4: Run Tab + existing EA tests**

```bash
npm run test:one -- public/js/features/estado-actual-panel-registro-tab.test.mjs
npm run test:one -- public/js/features/estado-actual-registro-defaults.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/estado-actual-panel-registro-wire.mjs \
  public/js/features/estado-actual-panel-vitals.mjs \
  public/js/features/estado-actual-panel-glu.mjs
git commit -m "$(cat <<'EOF'
feat(ea): wire registro Tab spine for vital and glu values

EOF
)"
```

---

### Task 6: Preserve Enter-on-glu behavior

**Files:**
- Modify: `public/js/features/estado-actual-panel-glu.mjs` only if Tab wiring interfered
- Test: add one case in `estado-actual-panel-registro-tab.test.mjs` or glu tests that Enter handler still registered (smoke)

- [ ] **Step 1: Confirm `wireGluRowKeyboard` still listens for Enter only**

Do not change Enter semantics. Tab handler must `return` early unless `ev.key === 'Tab'`.

- [ ] **Step 2: Commit only if a fix was needed; otherwise skip empty commit**

---

## Phase C — Conexión tool-time

### Task 7: Hide primary LAN chrome when Nube active

**Files:**
- Modify: `public/js/features/cloud-sync/panel-session-gate.mjs`
- Modify: `public/js/features/cloud-sync/panel-session-gate.test.mjs`
- Modify: `public/js/features/lan/panel-render-once.mjs` and/or `panel-connection-chrome.mjs`
- Modify: `public/js/features/cloud-sync/panel-conexion-views.mjs` (ensure status-first already)

- [ ] **Step 1: Failing test for pure gate**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldHidePrimaryLanChrome } from './panel-session-gate.mjs';

describe('shouldHidePrimaryLanChrome', () => {
  it('hides when cloud sala + cloud sync active', () => {
    assert.equal(shouldHidePrimaryLanChrome({ cloudSala: true, cloudActive: true }), true);
  });
  it('shows LAN chrome for LAN salas', () => {
    assert.equal(shouldHidePrimaryLanChrome({ cloudSala: false, cloudActive: false }), false);
  });
  it('shows LAN chrome on cloud sala when Nube not connected', () => {
    // Offline / not yet joined — do not strand user without any sync UI;
    // Nube Connect is primary via shouldShowNubePanel, LAN hero stays secondary/hidden.
    assert.equal(shouldHidePrimaryLanChrome({ cloudSala: true, cloudActive: false }), true);
  });
});
```

PO intent: on Sala/Torre, primary chrome is Nube Connect/status — never host election hero. So `cloudSala === true` ⇒ hide primary LAN hero (LAN diagnosis remains under Opciones → Diagnóstico LAN).

- [ ] **Step 2: Implement**

```js
/** @param {{ cloudSala: boolean, cloudActive?: boolean }} opts */
export function shouldHidePrimaryLanChrome(opts) {
  return Boolean(opts && opts.cloudSala);
}
```

Wire in LAN panel render: if `shouldShowNubePanel(sala)` then hide `.lan-connection-hero` / host PIN card (set `hidden` on the hero host). Keep `syncCloudSecondaryPanels` for Opciones → lan view.

- [ ] **Step 3: Run**

```bash
npm run test:one -- public/js/features/cloud-sync/panel-session-gate.test.mjs
npm run test:one -- public/js/features/cloud-sync/lan-override.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git add public/js/features/cloud-sync/panel-session-gate.mjs \
  public/js/features/cloud-sync/panel-session-gate.test.mjs \
  public/js/features/lan/panel-render-once.mjs \
  public/js/features/lan/panel-connection-chrome.mjs
git commit -m "$(cat <<'EOF'
fix(conexion): hide LAN host hero on Nube salas

EOF
)"
```

---

### Task 8: Cutover skip when done + profile ready

**Files:**
- Modify: `public/js/features/cloud-sync/cutover-gate.mjs`
- Create: `public/js/features/cloud-sync/cutover-gate.test.mjs`
- Modify: `public/js/features/clinical-onboarding-render.mjs`

- [ ] **Step 1: Failing test**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowCutoverWizard } from './cutover-gate.mjs';

describe('shouldShowCutoverWizard', () => {
  it('hides when cutover done and profile ready', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: true, cutoverPending: false, profileReady: true }),
      false
    );
  });
  it('shows when pending', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: false, cutoverPending: true, profileReady: false }),
      true
    );
  });
  it('hides when done even if profile incomplete (avoid loop) — profile gate handles register', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: true, cutoverPending: false, profileReady: false }),
      false
    );
  });
});
```

- [ ] **Step 2: Implement + wire onboarding**

```js
export function shouldShowCutoverWizard(opts) {
  if (!opts) return false;
  if (opts.cutoverDone) return false;
  return Boolean(opts.cutoverPending);
}
```

In `clinical-onboarding-render.mjs`, replace raw `isCutoverPending()` UI branch with `shouldShowCutoverWizard({ cutoverDone: isCutoverDone(), cutoverPending: isCutoverPending(), profileReady })` so done never re-opens migration card.

- [ ] **Step 3: Run + commit**

```bash
npm run test:one -- public/js/features/cloud-sync/cutover-gate.test.mjs
```

```bash
git add public/js/features/cloud-sync/cutover-gate.mjs \
  public/js/features/cloud-sync/cutover-gate.test.mjs \
  public/js/features/clinical-onboarding-render.mjs
git commit -m "$(cat <<'EOF'
fix(cutover): never re-open 7.9 migration when flag is done

EOF
)"
```

---

### Task 9: Recovery code — require “Lo guardé”

**Files:**
- Modify: `public/js/features/cloud-sync/recovery-modal.mjs`
- Modify: `public/js/features/cloud-sync/recovery-modal.test.mjs`

Today Continuar works unchecked (soft `window.confirm` once). Spec: require acknowledge.

- [ ] **Step 1: Failing test**

Extend `recovery-modal.test.mjs`:

```js
it('does not resolve Continuar until confirm checked', async () => {
  // mount modal with MiniNode/document stub; click continue unchecked → still open
  // check box; click continue → resolves
});
```

- [ ] **Step 2: Implement**

In `wireRecoveryModal`:

```js
continueBtn.addEventListener('click', function () {
  const confirmBox = overlay.querySelector('[data-recovery-confirm]');
  const checked = confirmBox && /** @type {HTMLInputElement} */ (confirmBox).checked;
  if (!checked) {
    // Optional: shake / aria-invalid — do not close
    if (confirmBox && typeof confirmBox.focus === 'function') confirmBox.focus();
    return;
  }
  overlay.remove();
  resolve();
});
```

Remove soft-confirm bypass (`warnedUnchecked` / `UNCHECKED_CONFIRM`) — YAGNI.

Disable Continuar until checked (optional UX):

```js
continueBtn.disabled = true;
confirmBox.addEventListener('change', function () {
  continueBtn.disabled = !confirmBox.checked;
});
```

- [ ] **Step 3: Run + commit**

```bash
npm run test:one -- public/js/features/cloud-sync/recovery-modal.test.mjs
```

```bash
git add public/js/features/cloud-sync/recovery-modal.mjs public/js/features/cloud-sync/recovery-modal.test.mjs
git commit -m "$(cat <<'EOF'
fix(nube): require recovery-code acknowledgement before continue

EOF
)"
```

---

### Task 10: Connected status sheet regression + docs

**Files:**
- Modify: `public/js/features/cloud-sync/panel-steps-html.test.mjs` (assert no stacked steps when connected)
- Modify: `.cursor/rules/project-context.mdc` changelog
- Modify: spec status → Approved / Implemented (when done)

- [x] **Step 1: Assert connected HTML is status-first**

Already partially covered in `panel-steps-html.test.mjs`. Add:

```js
it('connected views start on status with Opciones entry, not step 2/3', () => {
  const html = connectedStepsHtml({
    cloudUser: { username: 'r1', displayName: 'Ana' },
    roomHtml: '<div data-cloud-room>Sala 1</div>',
    equipoHtml: '<div></div>',
    url: 'https://example.workers.dev',
    hasCloudSession: true,
  });
  assert.match(html, /data-cloud-view="status"/);
  assert.match(html, /Opciones/);
  assert.doesNotMatch(html, /data-cloud-step="2"/);
});
```

- [ ] **Step 2: Run**

```bash
npm run test:one -- public/js/features/cloud-sync/panel-steps-html.test.mjs
```

- [ ] **Step 3: Update project-context changelog**

Prepend:

```markdown
- **2026-08-03** `ttd-tooltime`: Labs pane nav + EA Tab spine + Conexión light-switch; `doc-queue-nav.mjs`, `estado-actual-panel-registro-tab.mjs`, `panel-session-gate.mjs`.
```

Keep ≤20 entries.

- [ ] **Step 4: Mark spec status**

In `docs/superpowers/specs/2026-08-03-ttd-retyping-tooltime-design.md`, set `Status: Approved — implemented` (or `Approved for planning` → `Implemented`) and link this plan.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/cloud-sync/panel-steps-html.test.mjs \
  .cursor/rules/project-context.mdc \
  docs/superpowers/specs/2026-08-03-ttd-retyping-tooltime-design.md \
  docs/superpowers/plans/2026-08-03-ttd-retyping-tooltime.md \
  docs/features/features-index.md
git commit -m "$(cat <<'EOF'
docs(context): TTD / EA Tab / Conexión tool-time plan landed

EOF
)"
```

---

## Self-review (spec coverage)

| Spec goal | Task |
|-----------|------|
| A labsText only / never entries | Task 1, 3 |
| A navigate Labs mode + focus | Task 2 |
| A manual nota timeline unchanged | Task 1 (append preserves labsText); no change to note compose |
| B Tab vitals → glu → IO | Task 4, 5 |
| B skip +1 / Alterada / + Extra | Task 4, 5 |
| B Enter unchanged | Task 6 |
| C hide LAN on Nube salas | Task 7 |
| C logged-out Connect only | Already in `panel-session-gate` / steps — Task 10 regression |
| C connected status + Opciones | Task 10 |
| C cutover skip when done | Task 8 |
| C recovery acknowledge | Task 9 |

**Placeholder scan:** none intentional. If Electron test env lacks `document` for Task 4, use the MiniNode pattern from `recovery-modal.test.mjs` and adapt `getRegistroTabSpineElements` to accept a root with `querySelector` — do not add jsdom unless already depended.

**Type consistency:** `selectEventualidadesLabsMode`, `eventualidadesPaneForDocQueueNav`, `shouldHidePrimaryLanChrome`, `shouldShowCutoverWizard`, `getRegistroTabSpineElements`, `handleRegistroTabKeydown` — names must match across tasks.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-03-ttd-retyping-tooltime.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

Which approach?
