# Clinical Onboarding Main + Collapsible Census Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move clinical onboarding (usuario → equipos → unirse/crear) to a blocking main-area panel after DB unlock, retire the separate registration modal gate, and make Sala/Equipo/Servicio filters collapsible for elevated users only (R4/Admin/program admin).

**Architecture:** New `clinical-onboarding-main.mjs` owns `#clinical-onboarding-main` in `#main-area` and calls shared render logic from `clinical-onboarding.mjs`. Boot in `app.js` runs `initClinicalAccessRuntime` then `showMainClinicalOnboarding()` when `needsClinicalOnboarding()`. `patients.mjs` keeps `hasElevatedTeamPrivileges` gate before creating `#clinical-census-filters`; adds toggle + `localStorage` persistence. No DB/IPC changes.

**Tech Stack:** Vanilla JS renderer, `node:test`, Electron, `npm run build:ui` + `node scripts/bundle-renderer.mjs`.

**Spec:** [docs/superpowers/specs/2026-06-02-clinical-onboarding-main-collapsible-filters-design.md](../specs/2026-06-02-clinical-onboarding-main-collapsible-filters-design.md)

---

## Visibility rule (locked)

Filtros **Sala / Equipo / Servicio** solo existen cuando:

```javascript
const elevated = user && hasElevatedTeamPrivileges(user);
// true for: rank R4, rank Admin, is_program_admin
// false for: R1, R2, R3
```

Implemented in `syncClinicalCensusFiltersBar()` — if `!elevated`, `bar.remove()` and return. **Do not widen** to R1–R3. Collapsible UI is only built inside this branch.

---

## File map

| File | Role |
|------|------|
| `public/js/clinical-privileges.mjs` | Unchanged — source of truth for elevated gate |
| `public/js/features/patients.mjs` | Collapsible filter markup + persistence; gate unchanged |
| `public/js/features/patients-clinical-filter.test.mjs` | **Modify** — elevated gate + collapse key tests |
| `public/js/features/clinical-onboarding.mjs` | Export `renderOnboardingPanelInto`; completion calls `hideMainClinicalOnboarding` |
| `public/js/features/clinical-onboarding-main.mjs` | **Create** — show/hide main host, boot hook |
| `public/js/features/clinical-onboarding-main.test.mjs` | **Create** — host helpers |
| `public/js/features/clinical-registration.mjs` | First-run delegates to main onboarding |
| `public/js/features/clinical-teams.mjs` | Incomplete onboarding → focus main, no wizard in modal |
| `public/js/app.js` | Boot sequence |
| `public/styles/pase-board.css` | Onboarding main + filter toggle styles |
| `package.json` | Add test path if new file |

---

## Task 1: Lock elevated-only filter visibility (tests)

**Files:**
- Modify: `public/js/features/patients-clinical-filter.test.mjs`
- Create: `public/js/features/clinical-census-filters-ui.mjs` (pure helpers for collapse state)
- Create: `public/js/features/clinical-census-filters-ui.test.mjs`

- [ ] **Step 1: Add collapse storage helpers**

Create `public/js/features/clinical-census-filters-ui.mjs`:

```javascript
export const CLINICAL_CENSUS_FILTERS_COLLAPSED_LS = 'rpc.clinicalCensusFiltersCollapsed';

export function readCensusFiltersCollapsed(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS) === '1';
  } catch (_e) {
    return false;
  }
}

export function writeCensusFiltersCollapsed(collapsed, storage = globalThis.localStorage) {
  try {
    if (collapsed) storage?.setItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS, '1');
    else storage?.removeItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS);
  } catch (_e) {}
}
```

- [ ] **Step 2: Write failing tests**

Create `public/js/features/clinical-census-filters-ui.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import {
  readCensusFiltersCollapsed,
  writeCensusFiltersCollapsed,
  CLINICAL_CENSUS_FILTERS_COLLAPSED_LS,
} from './clinical-census-filters-ui.mjs';

describe('clinical census filters visibility', () => {
  it('elevated only for R4 Admin program admin', () => {
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R4' }), true);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'Admin' }), true);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R1', is_program_admin: 1 }), true);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R1' }), false);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R2' }), false);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R3' }), false);
  });
});

describe('clinical census filters collapse storage', () => {
  it('defaults expanded', () => {
    const mem = new Map();
    const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
    assert.equal(readCensusFiltersCollapsed(storage), false);
    writeCensusFiltersCollapsed(true, storage);
    assert.equal(mem.get(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS), '1');
    assert.equal(readCensusFiltersCollapsed(storage), true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
node --test public/js/features/clinical-census-filters-ui.test.mjs
```

Expected: PASS

- [ ] **Step 4: Add to package.json test script** (if not globbed)

Append path to `"test"` array in `package.json`.

---

## Task 2: Collapsible census filters (R4/Admin only)

**Files:**
- Modify: `public/js/features/patients.mjs` — `syncClinicalCensusFiltersBar`
- Modify: `public/styles/pase-board.css`

- [ ] **Step 1: Update markup in `syncClinicalCensusFiltersBar`**

Import helpers:

```javascript
import {
  readCensusFiltersCollapsed,
  writeCensusFiltersCollapsed,
} from './clinical-census-filters-ui.mjs';
```

When creating `bar`, use structure:

```javascript
bar.innerHTML =
  '<button type="button" id="btn-clinical-census-filters-toggle" class="clinical-census-filters-toggle" aria-expanded="true" aria-controls="clinical-census-filters-body">' +
  '<span class="clinical-census-filters-toggle-label">Filtros censo</span>' +
  '<span class="clinical-census-filters-chevron" aria-hidden="true"></span></button>' +
  '<div id="clinical-census-filters-body" class="clinical-census-filters-body">' +
  '<label class="clinical-census-filter"><span>Sala</span><select id="clinical-filter-sala" class="profile-input">...</select></label>' +
  '<label class="clinical-census-filter"><span>Equipo</span><select id="clinical-filter-team" class="profile-input"><option value="">Todos</option></select></label>' +
  '<label class="clinical-census-filter"><span>Servicio</span><input type="search" id="clinical-filter-service" class="profile-input" placeholder="Filtrar…" autocomplete="off"></label>' +
  '</div>';
```

Wire toggle once:

```javascript
function applyCensusFiltersCollapsedUi(collapsed) {
  const btn = document.getElementById('btn-clinical-census-filters-toggle');
  const body = document.getElementById('clinical-census-filters-body');
  if (!btn || !body) return;
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  body.hidden = collapsed;
  bar.classList.toggle('is-collapsed', collapsed);
}

const collapsed = readCensusFiltersCollapsed();
applyCensusFiltersCollapsedUi(collapsed);
toggleBtn.addEventListener('click', () => {
  const next = !readCensusFiltersCollapsed();
  writeCensusFiltersCollapsed(next);
  applyCensusFiltersCollapsedUi(next);
});
```

Keep existing `change`/`input` listeners on sala/team/service inside body.

- [ ] **Step 2: CSS in `pase-board.css`**

```css
.clinical-census-filters-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--text-muted, #8e8a9f);
  font-size: 0.72rem;
  cursor: pointer;
}
.clinical-census-filters-chevron::before { content: '▾'; }
.clinical-census-filters.is-collapsed .clinical-census-filters-chevron::before { content: '▸'; }
.clinical-census-filters-body { display: flex; flex-direction: column; gap: 6px; }
.clinical-census-filters-body[hidden] { display: none; }
```

- [ ] **Step 3: Manual check**

As R4: filters + toggle visible. As R1: no `#clinical-census-filters` in DOM.

---

## Task 3: Main-area onboarding host module

**Files:**
- Create: `public/js/features/clinical-onboarding-main.mjs`
- Create: `public/js/features/clinical-onboarding-main.test.mjs`
- Modify: `public/js/features/clinical-onboarding.mjs`

- [ ] **Step 1: Test host id constant**

`clinical-onboarding-main.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CLINICAL_ONBOARDING_MAIN_ID, CLINICAL_ONBOARDING_ACTIVE_CLASS } from './clinical-onboarding-main.mjs';

describe('clinical-onboarding-main', () => {
  it('exports stable host id', () => {
    assert.equal(CLINICAL_ONBOARDING_MAIN_ID, 'clinical-onboarding-main');
    assert.equal(CLINICAL_ONBOARDING_ACTIVE_CLASS, 'clinical-onboarding-active');
  });
});
```

- [ ] **Step 2: Implement `clinical-onboarding-main.mjs`**

```javascript
import { ensureClinicalPanelSession } from './clinical-panel-host.mjs';
import { needsClinicalOnboarding, renderOnboardingPanelInto } from './clinical-onboarding.mjs';
import { prefillRegistrationFromUrlParams } from './clinical-registration.mjs';

export const CLINICAL_ONBOARDING_MAIN_ID = 'clinical-onboarding-main';
export const CLINICAL_ONBOARDING_ACTIVE_CLASS = 'clinical-onboarding-active';

export function getClinicalOnboardingMainHost() {
  return document.getElementById(CLINICAL_ONBOARDING_MAIN_ID);
}

export function isMainClinicalOnboardingActive() {
  return document.documentElement.classList.contains(CLINICAL_ONBOARDING_ACTIVE_CLASS);
}

export async function showMainClinicalOnboarding() {
  if (!needsClinicalOnboarding()) {
    hideMainClinicalOnboarding();
    return;
  }
  const main = document.getElementById('main-area');
  if (!main) return;

  let host = getClinicalOnboardingMainHost();
  if (!host) {
    host = document.createElement('div');
    host.id = CLINICAL_ONBOARDING_MAIN_ID;
    host.className = 'clinical-onboarding-main';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Configura tu rotación');
    main.prepend(host);
  }

  document.documentElement.classList.add(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  prefillRegistrationFromUrlParams();

  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    host.innerHTML =
      '<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Desbloquea la base de datos para configurar tu rotación.</p></div>';
    return;
  }

  host.innerHTML = '<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Cargando…</p></div>';
  try {
    await renderOnboardingPanelInto(host.querySelector('.clinical-onboarding-card') || host);
  } catch (err) {
    host.innerHTML = `<div class="clinical-onboarding-card"><p class="clinical-registration-error">${err instanceof Error ? err.message : 'Error'}</p></div>`;
  }
}

export function hideMainClinicalOnboarding() {
  document.documentElement.classList.remove(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  const host = getClinicalOnboardingMainHost();
  if (host) host.remove();
}

export function focusMainClinicalOnboarding() {
  const host = getClinicalOnboardingMainHost();
  if (host) {
    host.scrollIntoView({ block: 'nearest' });
    return true;
  }
  return false;
}

export async function refreshMainClinicalOnboardingIfNeeded() {
  if (needsClinicalOnboarding()) await showMainClinicalOnboarding();
  else hideMainClinicalOnboarding();
}
```

- [ ] **Step 3: Refactor `clinical-onboarding.mjs`**

- Rename internal `renderOnboardingPanelInto` → export it (keep `renderOnboardingPanel` for modal fallback using `safeRenderClinicalTeamsPanel`).
- At end of successful onboarding (when `!needsClinicalOnboarding()` after join/profile):

```javascript
import { hideMainClinicalOnboarding } from './clinical-onboarding-main.mjs';
// ...
hideMainClinicalOnboarding();
```

- Replace completion copy «Cierra y vuelve a abrir Mi rotación» with «Listo. Usa Mi rotación para gestionar tu equipo.»

- [ ] **Step 4: Run tests**

```bash
node --test public/js/features/clinical-onboarding-main.test.mjs
```

---

## Task 4: Boot + registration modal retirement

**Files:**
- Modify: `public/js/app.js`
- Modify: `public/js/features/clinical-registration.mjs`

- [ ] **Step 1: Change `app.js` boot chain**

Replace:

```javascript
promptClinicalRegistrationIfNeeded(settings)
  .then(function () {
    loadSettings();
    return initClinicalAccessRuntime(settings, getClinicalClientId());
  })
```

With:

```javascript
initClinicalAccessRuntime(settings, getClinicalClientId())
  .then(function () {
    loadSettings();
    return import('./features/clinical-onboarding-main.mjs');
  })
  .then(function (mod) {
    return mod.showMainClinicalOnboarding();
  })
```

Remove `promptClinicalRegistrationIfNeeded` import if unused.

- [ ] **Step 2: `promptClinicalRegistrationIfNeeded` → delegate**

```javascript
export function promptClinicalRegistrationIfNeeded(settings) {
  if (!needsClinicalRegistration(settings)) return Promise.resolve(false);
  return import('./clinical-onboarding-main.mjs').then((mod) => {
    return mod.showMainClinicalOnboarding().then(() => true);
  });
}
```

Keep `openClinicalRegistrationModal` for manual/debug but document deprecated for first-run.

- [ ] **Step 3: Listen for teams-changed to refresh main gate**

In `clinical-onboarding-main.mjs` (once):

```javascript
document.addEventListener('rpc-clinical-teams-changed', () => {
  void refreshMainClinicalOnboardingIfNeeded();
});
```

---

## Task 5: Mi rotación modal when onboarding incomplete

**Files:**
- Modify: `public/js/features/clinical-teams.mjs`

- [ ] **Step 1: Update `openClinicalTeamsPanel`**

```javascript
import { needsClinicalOnboarding } from './clinical-onboarding.mjs';
import { focusMainClinicalOnboarding, showMainClinicalOnboarding } from './clinical-onboarding-main.mjs';

// inside openClinicalTeamsPanel, after sessionOk:
if (needsClinicalOnboarding()) {
  closeClinicalTeamsPanel(); // or never open backdrop
  if (typeof window.showToast === 'function') {
    window.showToast('Completa tu perfil en la pantalla principal.', 'info');
  }
  if (!focusMainClinicalOnboarding()) void showMainClinicalOnboarding();
  return;
}
```

Remove `renderOnboardingPanel()` branch from modal path.

---

## Task 6: Main onboarding styles

**Files:**
- Modify: `public/styles/pase-board.css`

- [ ] **Step 1: Add styles**

```css
html.clinical-onboarding-active #appcontent-lab,
html.clinical-onboarding-active #appcontent-med,
html.clinical-onboarding-active #appcontent-nota,
html.clinical-onboarding-active #appcontent-agenda,
html.clinical-onboarding-active #appcontent-pase,
html.clinical-onboarding-active #appcontent-guardia {
  pointer-events: none;
  opacity: 0.35;
}

.clinical-onboarding-main {
  position: relative;
  z-index: 2;
  padding: 24px 20px 32px;
  max-width: 520px;
  margin: 0 auto;
}

.clinical-onboarding-card {
  background: var(--card, #1a1d24);
  border: 1px solid var(--border, rgba(255,255,255,0.08));
  border-radius: 12px;
  padding: 20px 18px;
}

.clinical-onboarding-card .clinical-onboarding-progress { margin-bottom: 12px; }
```

Wrap rendered onboarding content in `.clinical-onboarding-card` inside `renderOnboardingPanelInto` root if not already.

---

## Task 7: Bundle + verification

- [ ] **Step 1: Ensure imports reachable from bundle entry**

If `clinical-onboarding-main` is only imported from `app.js`, verify `app.js` is in bundle graph.

- [ ] **Step 2: Build**

```bash
npm run build:ui && node scripts/bundle-renderer.mjs
```

- [ ] **Step 3: Run tests**

```bash
node --test public/js/features/clinical-census-filters-ui.test.mjs public/js/features/clinical-onboarding-main.test.mjs public/js/features/clinical-onboarding.test.mjs
```

- [ ] **Step 4: Manual QA checklist**

| User | Expect |
|------|--------|
| Fresh DB | Main onboarding Paso 1; no registration modal |
| R1 after onboarding | No census filters in sidebar |
| R4 | Filters + «Filtros censo» toggle; collapse hides 3 fields only |
| Guardia → Mi rotación (incomplete) | Toast + focus main panel |
| Complete join | Main panel removed; tabs usable |

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Main inline onboarding | 3, 4, 6 |
| No registration modal gate | 4 |
| Mi rotación no duplicate wizard | 5 |
| Filters R4/Admin only | 1, 2 |
| Collapsible 3 filters only | 2 |
| localStorage collapse | 1, 2 |
| No IPC changes | — |

---

## Commit suggestion (single feature branch)

```bash
git add public/js/features/clinical-onboarding-main.mjs public/js/features/clinical-onboarding-main.test.mjs \
  public/js/features/clinical-census-filters-ui.mjs public/js/features/clinical-census-filters-ui.test.mjs \
  public/js/features/clinical-onboarding.mjs public/js/features/clinical-registration.mjs \
  public/js/features/clinical-teams.mjs public/js/features/patients.mjs public/js/app.js \
  public/styles/pase-board.css package.json docs/superpowers/
git commit -m "$(cat <<'EOF'
feat(clinical): main-screen onboarding and collapsible R4 census filters.

Single wizard on #main-area after DB unlock; census filters collapsible for elevated ranks only.
EOF
)"
```
