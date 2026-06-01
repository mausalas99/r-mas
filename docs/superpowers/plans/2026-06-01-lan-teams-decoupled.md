# LAN Teams Decoupled Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple clinical teams from on-call shift declarations; enforce rank-based scope (structural teams + R2 handoffs); give R4/Admin global team browse and full patient census.

**Architecture:** Add `hasElevatedTeamPrivileges` and refactor `evaluateClinicalScope` into an explicit V3 rank matrix (R4/Admin → all; R1 → sala; R2 → joined-team structural ∪ `active_guardias`; R3 → structural + extended services). Remove Guardia hoy UI from Mi rotación. Filter patient sidebar via shared `isPatientReadableInClinicalScope`. Refresh LAN hub R4 section for global teams/census.

**Tech Stack:** Node.js `node:test`, Electron renderer ESM (`public/js/`), SQLCipher via `lib/db/clinical-access-db.mjs`, esbuild bundle (`npm run build:ui` + `node scripts/bundle-renderer.mjs`).

**Spec:** [docs/superpowers/specs/2026-06-01-lan-teams-decoupled-design.md](../specs/2026-06-01-lan-teams-decoupled-design.md)

---

## File map

| File | Action |
|------|--------|
| `lib/db/clinical-privileges.mjs` | Add `hasElevatedTeamPrivileges` |
| `public/js/clinical-privileges.mjs` | Mirror export (keep in sync with lib) |
| `lib/db/clinical-privileges.test.mjs` | **Create** — unit tests for privileges |
| `public/js/clinico-access.mjs` | V3 scope helpers + rewrite `evaluateClinicalScope` normal path |
| `public/js/clinico-access.test.mjs` | Replace/update scope tests for V3 |
| `public/js/features/clinical-teams.mjs` | Remove Guardia UI; use elevated privileges for browse |
| `public/js/features/clinical-teams.test.mjs` | Add test that joined card HTML has no guardia checkbox |
| `public/js/features/patients.mjs` | Scope-aware sidebar + elevated filter toolbar |
| `public/js/features/patients-clinical-filter.test.mjs` | **Create** — sidebar filter unit tests |
| `public/js/features/lan-sync.mjs` | R4/Admin hub: global teams + census (not guardia-only counts) |
| `public/js/features/clinical-onboarding.mjs` | Remove any Guardia-hoy copy in Paso 2 if present |
| `package.json` | Add new test files to `npm test` script |

**Do not change:** `active_guardias` Entrega flows, Modo Guardia board toggles (out of scope). **Dormant:** `db:clinical-teams-guardia-set` IPC — no caller from UI.

---

### Task 1: Privileges + scope V3 core

**Files:**
- Modify: `lib/db/clinical-privileges.mjs`
- Modify: `public/js/clinical-privileges.mjs`
- Create: `lib/db/clinical-privileges.test.mjs`
- Modify: `public/js/clinico-access.mjs`
- Modify: `public/js/clinico-access.test.mjs`
- Modify: `package.json` (test script)

- [ ] **Step 1: Write failing privilege tests**

Create `lib/db/clinical-privileges.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasElevatedTeamPrivileges,
  hasProgramAdminPrivileges,
  effectiveClinicalRank,
} from './clinical-privileges.mjs';

test('hasElevatedTeamPrivileges: R4 without program admin', () => {
  assert.equal(
    hasElevatedTeamPrivileges({ rank: 'R4', is_program_admin: 0 }),
    true
  );
});

test('hasElevatedTeamPrivileges: R1 false', () => {
  assert.equal(
    hasElevatedTeamPrivileges({ rank: 'R1', is_program_admin: 0 }),
    false
  );
});

test('hasElevatedTeamPrivileges: program admin true', () => {
  assert.equal(
    hasElevatedTeamPrivileges({ rank: 'R2', is_program_admin: 1 }),
    true
  );
});

test('hasElevatedTeamPrivileges: Admin rank true', () => {
  assert.equal(hasElevatedTeamPrivileges({ rank: 'Admin' }), true);
});
```

Add the same export to both privilege modules:

```javascript
export function hasElevatedTeamPrivileges(user) {
  if (!user) return false;
  if (hasProgramAdminPrivileges(user)) return true;
  return effectiveClinicalRank(user) === 'R4';
}
```

- [ ] **Step 2: Run privilege tests (expect fail)**

```bash
cd /Users/mauriciosalas/R+
node --test lib/db/clinical-privileges.test.mjs
```

Expected: FAIL — `hasElevatedTeamPrivileges` is not exported.

- [ ] **Step 3: Implement `hasElevatedTeamPrivileges` in both privilege files**

Copy identical function into `lib/db/clinical-privileges.mjs` and `public/js/clinical-privileges.mjs`.

- [ ] **Step 4: Run privilege tests (expect pass)**

```bash
node --test lib/db/clinical-privileges.test.mjs
```

Expected: PASS (4 tests).

- [ ] **Step 5: Write failing V3 scope tests**

Append to `public/js/clinico-access.test.mjs` (import `patientMatchesTeam` if needed):

```javascript
const SALA1 = 'Sala 1';
const baseCtx = {
  teams: [],
  guardias: [],
  cycle: null,
  assignments: [],
  salaGuardiaToday: [],
  guardiaMode: false,
  now: '2026-06-01T12:00:00Z',
};

test('V3 R4: full access without program admin', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r4', rank: 'R4', sala: SALA1, is_program_admin: 0 },
    { id: 'p1', service: 'Torre HU' },
    null,
    baseCtx
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
});

test('V3 R1: sala-wide write (other team letter, same sala)', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1', sala: SALA1 },
    { id: 'p1', service: 'Sala', sub_area: 'Sala B', sala: SALA1 },
    null,
    {
      ...baseCtx,
      teams: [
        {
          team_id: 't-other',
          service: 'Sala',
          sub_area_fraction: 'A',
          sala: SALA1,
          members: [{ user_id: 'other' }],
        },
      ],
    }
  );
  assert.equal(scope.writable, true);
  assert.match(scope.reasoning, /sala/i);
});

test('V3 R1: deny patient outside sala', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1', sala: SALA1 },
    { id: 'p1', service: 'Sala', sala: 'Sala 2' },
    null,
    baseCtx
  );
  assert.equal(scope.writable, false);
});

test('V3 R2: structural team match', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2', sala: SALA1 },
    { id: 'p1', service: 'Sala', sub_area: 'Sala A' },
    null,
    {
      ...baseCtx,
      teams: [
        {
          team_id: 't1',
          service: 'Sala',
          sub_area_fraction: 'A',
          members: [{ user_id: 'r2', rank: 'R2' }],
        },
      ],
    }
  );
  assert.equal(scope.writable, true);
});

test('V3 R2: handoff cross-sala', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2b', rank: 'R2', sala: 'Sala 2' },
    { id: 'p1', service: 'Sala', sala: 'Sala 1' },
    null,
    {
      ...baseCtx,
      guardias: [{ patient_id: 'p1', covering_user_id: 'r2b' }],
    }
  );
  assert.equal(scope.writable, true);
});

test('V3 R3: extended service structural', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r3', rank: 'R3' },
    { id: 'p1', service: 'Torre HU', sub_area: 'A' },
    null,
    {
      ...baseCtx,
      teams: [
        {
          team_id: 't-torre',
          service: 'Torre HU',
          sub_area_fraction: 'A',
          members: [{ user_id: 'r3', rank: 'R3' }],
        },
      ],
    }
  );
  assert.equal(scope.writable, true);
});
```

Update or remove tests that expect **deny** for R1 with assignment-only access (`normal mode: patient assigned to team`) if they conflict — V3 R1 uses sala, not `patient_team_assignment` alone.

- [ ] **Step 6: Run scope tests (expect fail)**

```bash
node --test public/js/clinico-access.test.mjs
```

Expected: new V3 tests FAIL; note which legacy tests fail for Task 1 Step 8.

- [ ] **Step 7: Implement scope helpers in `clinico-access.mjs`**

Add exports:

```javascript
const SALA_NAME_BY_LETTER = { '1': 'Sala 1', '2': 'Sala 2', E: 'Sala E' };

/** @param {{ sala?: string, servicio?: string, service?: string, area?: string, sub_area?: string }} patient */
export function resolvePatientSala(patient) {
  const explicit = String(patient?.sala || '').trim();
  if (explicit) return explicit;
  const letter = extractSalaLetter(
    patient?.servicio || patient?.service || patient?.area || patient?.sub_area || ''
  );
  if (letter === '1') return 'Sala 1';
  if (letter === '2') return 'Sala 2';
  if (letter === 'E') return 'Sala E';
  return '';
}

/** @param {object} patient @param {string} userSala */
export function patientInUserSala(patient, userSala) {
  const ps = resolvePatientSala(patient);
  return ps !== '' && ps === String(userSala || '').trim();
}

/** @param {object} user @param {object} patient @param {object[]} joinedTeams */
export function patientMatchesAnyJoinedTeam(patient, joinedTeams) {
  const mapped = {
    id: patient?.id,
    service: String(patient?.service || patient?.servicio || ''),
    sub_area: String(patient?.sub_area || patient?.area || ''),
    interconsult_type: patient?.interconsult_type,
    sala: patient?.sala,
  };
  return (joinedTeams || []).some((team) => patientMatchesTeam(mapped, team));
}

/** @param {object} user @param {object} patient @param {object[]} joinedTeams */
export function r3ExtendedStructuralAccess(user, patient, joinedTeams) {
  const uid = String(user?.user_id || '');
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    const isExtended = [...R3_EXTENDED_SERVICES].some((s) => svc.includes(s));
    if (!isExtended) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return patientMatchesTeam(
      {
        id: patient?.id,
        service: String(patient?.service || patient?.servicio || ''),
        sub_area: String(patient?.sub_area || patient?.area || ''),
      },
      team
    );
  });
}
```

Rewrite **normal-mode** tail of `evaluateClinicalScope` (after incoming preview, before `guardiaMode` block — keep `guardiaMode` block unchanged per spec):

```javascript
  if (rank === 'R4') {
    return allow('R4: acceso global');
  }

  if (rank === 'R1') {
    if (patientInUserSala(targetPatient, userSala)) {
      return allow('R1: paciente en mi sala');
    }
    return deny('R1: fuera de mi sala');
  }

  if (rank === 'R2') {
    if (patientCoveredByGuardia(patientId, userId, guardias)) {
      return allow('R2: paciente entregado');
    }
    if (patientMatchesAnyJoinedTeam(targetPatient, joinedTeams)) {
      return allow('R2: paciente de mi equipo');
    }
    return deny('R2: sin equipo ni entrega');
  }

  if (rank === 'R3') {
    if (patientMatchesAnyJoinedTeam(targetPatient, joinedTeams)) {
      return allow('R3: paciente de mi equipo');
    }
    if (r3ExtendedStructuralAccess(currentUser, targetPatient, joinedTeams)) {
      return allow('R3: servicio extendido');
    }
    return deny('R3: fuera de alcance');
  }

  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds)) {
    return allow('Paciente del equipo (asignación)');
  }

  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow('Paciente entregado (handoff)');
  }

  return deny('Fuera de alcance');
```

Add shared helper for sidebar:

```javascript
export function isPatientReadableInClinicalScope(user, patient, activeGuardia, context) {
  const scope = evaluateClinicalScope(user, patient, activeGuardia, context);
  return scope.readable === true;
}
```

- [ ] **Step 8: Fix legacy tests in `clinico-access.test.mjs`**

- Update `normal mode: patient assigned to team` — R1 with assignment but different sala: expect **deny** OR change user to R2/R3 as appropriate.
- Keep `handoff:` tests; they should still pass.
- Keep `guardiaMode` tests untouched.

- [ ] **Step 9: Run full clinico-access tests**

```bash
node --test public/js/clinico-access.test.mjs
```

Expected: all PASS.

- [ ] **Step 10: Register tests in package.json**

Add to `"test"` array:

```
lib/db/clinical-privileges.test.mjs
```

( `public/js/clinico-access.test.mjs` — add if not already listed.)

- [ ] **Step 11: Commit**

```bash
git add lib/db/clinical-privileges.mjs public/js/clinical-privileges.mjs \
  lib/db/clinical-privileges.test.mjs public/js/clinico-access.mjs \
  public/js/clinico-access.test.mjs package.json
git commit -m "$(cat <<'EOF'
feat(clinical): scope V3 and elevated team privileges.

R4/Admin global access; R1 sala-wide; R2 team plus handoff; R3 extended services.
EOF
)"
```

---

### Task 2: Mi rotación — remove Guardia hoy

**Files:**
- Modify: `public/js/features/clinical-teams.mjs`
- Modify: `public/js/features/clinical-teams.test.mjs`
- Modify: `public/js/features/clinical-onboarding.mjs` (only if Guardia copy exists)

- [ ] **Step 1: Write failing DOM/structure test**

Add to `public/js/features/clinical-teams.test.mjs`:

```javascript
import { renderJoinedTeamCard } from './clinical-teams.mjs';
// If renderJoinedTeamCard is not exported, export it for testing only or test via static HTML snippet.

// Simpler approach — test helper that builds card inner HTML:
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'clinical-teams.mjs'),
  'utf8'
);

it('Mi rotación source does not render Guardia hoy checkbox class', () => {
  assert.equal(src.includes('clinical-teams-guardia-check'), false);
  assert.equal(src.includes('Guardia hoy'), false);
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
node --test public/js/features/clinical-teams.test.mjs
```

Expected: FAIL — source still contains `clinical-teams-guardia-check`.

- [ ] **Step 3: Remove Guardia UI and handlers**

In `clinical-teams.mjs`:

1. Change lead in `renderClinicalTeamsPanelInto`:

```javascript
'<p class="clinical-teams-lead">Administra tus equipos y membresía en la sala.</p>'
```

2. Replace `const programAdmin = hasProgramAdminPrivileges(user)` with:

```javascript
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
// ...
const elevated = hasElevatedTeamPrivileges(user);
```

Use `elevated` everywhere `programAdmin` controlled browse (`resolveBrowseSala`, `renderDirectorySectionHtml`, `wireBrowseSalaControl`).

3. In `renderJoinedTeamCard`: remove `guardia` / `guardiaLabel` / checkbox block; keep members list and add-member form.

4. Remove `handleGuardiaCheck` function entirely.

5. In `wireClinicalTeamsPanelInteractions`: delete the `document.querySelectorAll('.clinical-teams-guardia-check')` loop.

6. Directory cards: remove any `guardia_today` display lines if present in template strings.

- [ ] **Step 4: Run clinical-teams tests**

```bash
node --test public/js/features/clinical-teams.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Rebuild renderer bundle**

```bash
npm run build:ui && node scripts/bundle-renderer.mjs
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add public/js/features/clinical-teams.mjs public/js/features/clinical-teams.test.mjs \
  public/js/features/clinical-onboarding.mjs public/js/app.bundle.mjs public/js/app.bundle.mjs.map public/js/app.bundle.meta.json
git commit -m "$(cat <<'EOF'
feat(ui): decouple Mi rotación from Guardia hoy.

R4 elevated browse without program-admin flag; remove per-team on-call checkbox.
EOF
)"
```

---

### Task 3: Scope-aware patient sidebar + elevated filters

**Files:**
- Create: `public/js/features/patients-clinical-filter.mjs`
- Create: `public/js/features/patients-clinical-filter.test.mjs`
- Modify: `public/js/features/patients.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing filter module tests**

Create `public/js/features/patients-clinical-filter.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPatientsForClinicalSidebar } from './patients-clinical-filter.mjs';

const userR1 = { user_id: 'u1', rank: 'R1', sala: 'Sala 1' };
const patients = [
  { id: 'p1', servicio: 'Sala', area: 'Sala A', sala: 'Sala 1' },
  { id: 'p2', servicio: 'Sala', area: 'Sala A', sala: 'Sala 2' },
];

test('R1 sidebar includes only same sala', () => {
  const out = filterPatientsForClinicalSidebar(patients, userR1, {
    teams: [],
    guardias: [],
    assignments: [],
    cycle: null,
    now: '2026-06-01T12:00:00Z',
  });
  assert.deepEqual(out.map((p) => p.id), ['p1']);
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
node --test public/js/features/patients-clinical-filter.test.mjs
```

- [ ] **Step 3: Implement `patients-clinical-filter.mjs`**

```javascript
import {
  evaluateClinicalScope,
  isPatientReadableInClinicalScope,
} from '../clinico-access.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';

/** Map chart patient row to scope patient shape */
export function patientForScopeEvaluate(p) {
  return {
    id: String(p?.id || ''),
    service: String(p?.servicio || p?.service || ''),
    sub_area: String(p?.area || p?.sub_area || ''),
    sala: p?.sala,
    interconsult_type: p?.interconsult_type,
  };
}

export function filterPatientsForClinicalSidebar(patients, user, scopeContext) {
  if (!user?.user_id) return patients;
  if (hasElevatedTeamPrivileges(user)) return patients;
  const guardiasMap = scopeContext?.guardiasMap;
  return (patients || []).filter((p) => {
    if (!p) return false;
    const mapped = patientForScopeEvaluate(p);
    const activeGuardia =
      guardiasMap && typeof guardiasMap.get === 'function'
        ? guardiasMap.get(String(p.id)) || null
        : null;
    return isPatientReadableInClinicalScope(user, mapped, activeGuardia, scopeContext);
  });
}

/** Client-only filters for elevated users (sala / teamId / service substring) */
export function applyElevatedPatientFilters(patients, filters) {
  let list = patients || [];
  if (filters.sala && filters.sala !== '__all__') {
    list = list.filter((p) => String(p.sala || '') === filters.sala);
  }
  if (filters.teamId) {
    list = list.filter((p) => String(p._filterTeamId || '') === filters.teamId);
  }
  if (filters.service) {
    const q = String(filters.service).toLowerCase();
    list = list.filter((p) =>
      String(p.servicio || '').toLowerCase().includes(q)
    );
  }
  return list;
}
```

- [ ] **Step 4: Run filter tests (expect pass)**

```bash
node --test public/js/features/patients-clinical-filter.test.mjs
```

- [ ] **Step 5: Wire `patients.mjs`**

1. Import filter helpers and `hasElevatedTeamPrivileges`, `clinicalSessionContext`, `getClinicalScopeContextForEvaluate`.

2. Replace `patientsVisibleInSidebar`:

```javascript
function patientsVisibleInSidebar() {
  const base = filterPatientsForPitchTour(patients);
  const user = clinicalSessionContext.user;
  if (!user) return base;
  const ctx = getClinicalScopeContextForEvaluate();
  ctx.guardiasMap = clinicalSessionContext.guardiasMap;
  return filterPatientsForClinicalSidebar(base, user, ctx);
}
```

3. Add elevated toolbar markup in `renderPatientListNow` **before** search filtering when `hasElevatedTeamPrivileges(clinicalSessionContext.user)`:

- Container `#clinical-census-filters` with selects: `#clinical-filter-sala`, `#clinical-filter-team`, `#clinical-filter-service` (optional).
- Populate team select from `clinicalSessionContext.teams`.
- Store filter state in module-level `elevatedPatientFilters` object; on change call `renderPatientList()`.

4. After `visiblePatients = patientsVisibleInSidebar()`, apply `applyElevatedPatientFilters(visiblePatients, elevatedPatientFilters)` when elevated.

5. Optional: on team filter change, annotate patients with matching `team_id` by scanning joined teams + `patientMatchesTeam` (import from clinico-access) for card badge `data-team-id`.

- [ ] **Step 6: Add package.json test entry + run**

```bash
node --test public/js/features/patients-clinical-filter.test.mjs
npm run build:ui && node scripts/bundle-renderer.mjs
```

- [ ] **Step 7: Commit**

```bash
git add public/js/features/patients-clinical-filter.mjs \
  public/js/features/patients-clinical-filter.test.mjs \
  public/js/features/patients.mjs package.json public/js/app.bundle.*
git commit -m "$(cat <<'EOF'
feat(patients): scope-aware sidebar and R4 census filters.

Hide out-of-scope patients for R1-R3; elevated sala/team/service toolbar.
EOF
)"
```

---

### Task 4: LAN hub R4 global teams + census

**Files:**
- Modify: `public/js/features/lan-sync.mjs` (`buildR4Section`, `renderLanPanel`)

- [ ] **Step 1: Replace `buildR4Section` census card**

In `lan-sync.mjs`, import `hasElevatedTeamPrivileges` from `../clinical-privileges.mjs` and `openClinicalTeamsPanel` path already exists.

Replace guardia-count rows with:

```javascript
function buildR4Section(root) {
  // ... existing team create card ...

  var censusCard = document.createElement('div');
  censusCard.className = 'lan-connect-card lan-hub-census-card';
  censusCard.innerHTML = '<div class="lan-connect-card-title">Censo global</div>';

  var teams = clinicalSessionContext.teams || [];
  var allPatients = typeof patients !== 'undefined' ? patients : [];
  var salas = ['Sala 1', 'Sala 2', 'Sala E'];

  salas.forEach(function (salaName) {
    var salaTeams = teams.filter(function (t) {
      return String(t.sala || '') === salaName;
    });
    var salaPatientCount = allPatients.filter(function (p) {
      return String(p.sala || '') === salaName;
    }).length;
    var row = document.createElement('p');
    row.className = 'lan-connect-card-hint';
    row.textContent =
      salaName + ': ' + salaTeams.length + ' equipos · ' + salaPatientCount + ' pacientes';
    censusCard.appendChild(row);
  });

  var viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'btn-lan-secondary';
  viewBtn.style.width = '100%';
  viewBtn.style.marginTop = '8px';
  viewBtn.textContent = 'Ver censo en lista de pacientes';
  viewBtn.onclick = function () {
    try {
      localStorage.setItem('clinical.browseSala', '__all__');
      localStorage.setItem('clinical.censusFilterSala', '__all__');
    } catch (_e) {}
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    if (typeof runtime.renderPatientList === 'function') runtime.renderPatientList();
    runtime.showToast('Censo global — usa los filtros en la lista de pacientes.', 'info');
  };
  censusCard.appendChild(viewBtn);
  root.appendChild(censusCard);
  // ... retain mobile card ...
}
```

Remove copy: `No hay guardias activas` as primary empty state.

- [ ] **Step 2: Use `hasElevatedTeamPrivileges` for `isElevated` in `renderLanPanel`**

Replace `var isElevated = rank === 'Admin' || rank === 'R4'` with `hasElevatedTeamPrivileges(clinicalSessionContext.user)` for consistency.

- [ ] **Step 3: Manual smoke**

1. Launch app as R4 test user.
2. Open LAN panel → see per-sala team/patient counts.
3. Click “Ver censo…” → patient list shows elevated filters.

- [ ] **Step 4: Rebuild bundle + commit**

```bash
npm run build:ui && node scripts/bundle-renderer.mjs
git add public/js/features/lan-sync.mjs public/js/app.bundle.*
git commit -m "$(cat <<'EOF'
feat(lan-hub): R4 global census card decoupled from active guardias.
EOF
)"
```

---

### Task 5: QA checklist + doc cross-links

**Files:**
- Modify: `docs/superpowers/specs/2026-06-01-clinical-identity-guardia-teams-ux-design.md` (add deprecation note at top)
- Create: `docs/superpowers/plans/2026-06-01-lan-teams-decoupled-qa.md`

- [ ] **Step 1: Add amendment banner to identity spec**

At top of `2026-06-01-clinical-identity-guardia-teams-ux-design.md` after title:

```markdown
> **Amended 2026-06-01:** Guardia hoy on teams and R4 browse rules superseded by [lan-teams-decoupled-design.md](./2026-06-01-lan-teams-decoupled-design.md).
```

- [ ] **Step 2: Create QA checklist**

`docs/superpowers/plans/2026-06-01-lan-teams-decoupled-qa.md` with checkboxes:

- [ ] R4 without program admin: Mi rotación shows “Todas las salas”
- [ ] No “Guardia hoy” checkbox on team cards
- [ ] R1 sees all Sala 1 patients including other teams
- [ ] R2 sees handoff patient from another sala
- [ ] Entrega still creates handoff; recipient opens chart
- [ ] `npm test` passes

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/mauriciosalas/R+ && npm test
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-06-01-lan-teams-decoupled-qa.md \
  docs/superpowers/specs/2026-06-01-clinical-identity-guardia-teams-ux-design.md
git commit -m "$(cat <<'EOF'
docs: QA checklist and cross-link for decoupled LAN teams.
EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Structural `patientMatchesTeam` | Task 1 helpers |
| Shelved Guardia hoy UI | Task 2 |
| R4/Admin global patients | Task 1 + Task 3 |
| R1 sala read/write | Task 1 + Task 3 |
| R2 team + handoff | Task 1 |
| R3 extended services | Task 1 |
| Elevated browse by R4 rank | Task 1–2 |
| Sidebar filters | Task 3 |
| LAN hub global census | Task 4 |
| Entrega unchanged | No Task removes `active_guardias` |
| Modo Guardia out of scope | `guardiaMode` block preserved in Task 1 |

## Entrega regression note

`clinical-entrega.mjs` still uses `isOnCallToday` for **target lists** — acceptable for this phase (spec: Entrega unchanged). Do not remove unless product asks to decouple Entrega suggestions in a follow-up.
