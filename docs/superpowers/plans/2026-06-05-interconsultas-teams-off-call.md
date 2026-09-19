# Interconsultas, UX, and Eme Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Interconsultas / UX / Eme team composition, ABCD rotation, and off-call Interconsultas census access in the clinical scope evaluator and team roster UI.

**Architecture:** Approach A — add `isInterconsultasPatient`, off-call/on-call helpers in `clinico-access.mjs`, call them from `evaluateClinicalScope` before rank blocks. Soft slot warnings in team roster via existing `validateTeamRankSlot`.

**Tech Stack:** Node `--test`, ES modules, Electron renderer (`public/js/**/*.mjs`), shared `lib/` modules.

**Spec:** `docs/superpowers/specs/2026-06-05-interconsultas-teams-off-call-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/clinical-team-composition.mjs` | Slot limits, off-call service set, `validateTeamRankSlot` |
| `lib/clinical-salas.mjs` | Sala labels, ABCD-only flag (no change expected) |
| `public/js/clinico-access.mjs` | Scope evaluation + new helpers |
| `public/js/features/clinical-teams/teams-roster-render.mjs` | Composition hints in create form |
| `public/js/features/clinical-teams/teams-roster-interactions.mjs` | Soft warn on join |
| `*.test.mjs` | Unit tests |

---

### Task 1: Team composition unit tests

**Files:**
- Create: `lib/clinical-team-composition.test.mjs`

- [ ] **Step 1: Write tests**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTeamCompositionLimits,
  validateTeamRankSlot,
  OFF_CALL_INTERCONSULTAS_SERVICES,
} from './clinical-team-composition.mjs';

describe('clinical-team-composition', () => {
  it('interconsultas limits', () => {
    assert.deepEqual(getTeamCompositionLimits('Interconsultas'), { r1: 1, r2: 1, r3: 2 });
  });

  it('eme has no R2 slot', () => {
    const err = validateTeamRankSlot('Eme', 'R2', []);
    assert.match(err, /no participa/);
  });

  it('ux r3 slot full', () => {
    const members = [{ rank: 'R3' }];
    const err = validateTeamRankSlot('UX', 'R3', members);
    assert.match(err, /máximo/);
  });

  it('off-call services set', () => {
    assert.ok(OFF_CALL_INTERCONSULTAS_SERVICES.has('ux'));
    assert.ok(OFF_CALL_INTERCONSULTAS_SERVICES.has('eme'));
  });
});
```

- [ ] **Step 2: Run tests**

Run: `node --test lib/clinical-team-composition.test.mjs`  
Expected: PASS (module already implements logic)

- [ ] **Step 3: Commit**

```bash
git add lib/clinical-team-composition.test.mjs
git commit -m "test: clinical team composition slot limits"
```

---

### Task 2: Extend clinical-salas tests

**Files:**
- Modify: `lib/clinical-salas.test.mjs`

- [ ] **Step 1: Add cases for Interconsultas, UX, Eme**

```javascript
it('clinicalServiceForSala maps Interconsultas UX Eme', () => {
  assert.equal(clinicalServiceForSala('Interconsultas'), 'Interconsultas');
  assert.equal(clinicalServiceForSala('UX'), 'UX');
  assert.equal(clinicalServiceForSala('Eme'), 'Eme');
});

it('clinicalSalaUsesAbcOnlyRotation for Interconsultas UX Eme', () => {
  assert.equal(clinicalSalaUsesAbcOnlyRotation('Interconsultas'), true);
  assert.equal(clinicalSalaUsesAbcOnlyRotation('UX'), true);
  assert.equal(clinicalSalaUsesAbcOnlyRotation('Eme'), true);
});
```

- [ ] **Step 2: Run**

Run: `node --test lib/clinical-salas.test.mjs`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/clinical-salas.test.mjs
git commit -m "test: clinical salas Interconsultas UX Eme mapping"
```

---

### Task 3: Scope helpers (failing tests first)

**Files:**
- Modify: `public/js/clinico-access.test.mjs`
- Modify: `public/js/clinico-access.mjs`

- [ ] **Step 1: Add failing tests**

Add imports: `isInterconsultasPatient`, `userOffCallFromInterconsultasRotationServices`, `userOnCallForInterconsultasTeam` (export from clinico-access after step 3).

```javascript
test('isInterconsultasPatient by service', () => {
  assert.equal(isInterconsultasPatient({ service: 'Interconsultas' }), true);
  assert.equal(isInterconsultasPatient({ service: 'UX' }), false);
});

test('off-call UX resident gets Interconsultas census rw', () => {
  // day 2 = B; team letter A → off call
  const scope = evaluateClinicalScope(
    { user_id: 'r1-ux', rank: 'R1', sala: 'UX' },
    { id: 'p-ic', service: 'Interconsultas', sub_area: 'A' },
    null,
    {
      teams: [{
        team_id: 't-ux',
        service: 'UX',
        sub_area_fraction: 'A',
        members: [{ user_id: 'r1-ux', rank: 'R1' }],
      }],
      assignments: [],
      guardias: [],
      now: '2026-06-02T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
  assert.match(scope.reasoning, /Off-call/);
});

test('on-call UX resident denied unassigned Interconsultas patient', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1-ux', rank: 'R1', sala: 'UX' },
    { id: 'p-ic', service: 'Interconsultas' },
    null,
    {
      teams: [{
        team_id: 't-ux',
        service: 'UX',
        sub_area_fraction: 'A',
        members: [{ user_id: 'r1-ux', rank: 'R1' }],
      }],
      assignments: [],
      guardias: [],
      now: '2026-06-01T12:00:00Z', // day 1 = A = on call
    }
  );
  assert.equal(scope.writable, false);
});

test('on-call Interconsultas team sees all Interconsultas patients', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2-ic', rank: 'R2', sala: 'Interconsultas' },
    { id: 'p-ic', service: 'Interconsultas', sub_area: 'C' },
    null,
    {
      teams: [{
        team_id: 't-ic',
        service: 'Interconsultas',
        sub_area_fraction: 'A',
        members: [{ user_id: 'r2-ic', rank: 'R2' }],
      }],
      assignments: [],
      guardias: [],
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.writable, true);
  assert.match(scope.reasoning, /guardia|Interconsultas de guardia/i);
});

test('off-call Interconsultas member only via assignment', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r3-ic', rank: 'R3', sala: 'Interconsultas' },
    { id: 'p-ic', service: 'Interconsultas' },
    null,
    {
      teams: [{
        team_id: 't-ic',
        service: 'Interconsultas',
        sub_area_fraction: 'B',
        members: [{ user_id: 'r3-ic', rank: 'R3' }],
      }],
      assignments: [],
      guardias: [],
      now: '2026-06-01T12:00:00Z', // day 1 = A; B team off call
    }
  );
  assert.equal(scope.writable, false);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node --test public/js/clinico-access.test.mjs`  
Expected: new tests FAIL

- [ ] **Step 3: Implement helpers in `clinico-access.mjs`**

Add import at top:

```javascript
import { OFF_CALL_INTERCONSULTAS_SERVICES } from '../../lib/clinical-team-composition.mjs';
```

Add exports (after `patientInUserSala`):

```javascript
export function isInterconsultasPatient(patient) {
  if (!patient) return false;
  const svc = normalizeServiceKey(patient.service || patient.servicio || '');
  const sub = normalizeServiceKey(patient.sub_area || patient.area || '');
  if (svc.includes('interconsult') || sub.includes('interconsult')) return true;
  const ic = String(patient.interconsult_type || 'None');
  return ic !== 'None' && ic !== '';
}

export function userOffCallFromInterconsultasRotationServices(userId, joinedTeams, rank, now) {
  const uid = String(userId || '');
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    if (!OFF_CALL_INTERCONSULTAS_SERVICES.has(svc)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return !isOnCallToday(team, rank, now);
  });
}

export function userOnCallForInterconsultasTeam(userId, joinedTeams, rank, now) {
  const uid = String(userId || '');
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    if (!svc.includes('interconsult')) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return isOnCallToday(team, rank, now);
  });
}
```

- [ ] **Step 4: Wire `evaluateClinicalScope`**

After incoming-preview block (~line 790), before `guardiaMode`:

```javascript
  if (isInterconsultasPatient(targetPatient)) {
    if (userOffCallFromInterconsultasRotationServices(userId, joinedTeams, rank, now)) {
      return allow('Off-call UX/Eme: censo Interconsultas');
    }
    if (userOnCallForInterconsultasTeam(userId, joinedTeams, rank, now)) {
      return allow('Interconsultas de guardia: censo del día');
    }
  }
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `node --test public/js/clinico-access.test.mjs`  
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add public/js/clinico-access.mjs public/js/clinico-access.test.mjs
git commit -m "feat(scope): Interconsultas census for off-call UX/Eme and on-call IC team"
```

---

### Task 4: Team roster composition hints

**Files:**
- Modify: `public/js/features/clinical-teams/teams-roster-render.mjs`

- [ ] **Step 1: Import composition helpers**

```javascript
import {
  getTeamCompositionLimits,
  serviceUsesStructuredComposition,
} from '../../../../lib/clinical-team-composition.mjs';
```

- [ ] **Step 2: Add hint renderer**

```javascript
function compositionHintForService(service) {
  if (!serviceUsesStructuredComposition(service)) return '';
  const limits = getTeamCompositionLimits(service);
  if (!limits) return '';
  const parts = [];
  if (limits.r1) parts.push(`${limits.r1} R1`);
  if (limits.r2) parts.push(`${limits.r2} R2`);
  if (limits.r3) parts.push(`${limits.r3} R3`);
  return parts.length
    ? `<p class="clinical-teams-hint">Composición: ${parts.join(', ')}.</p>`
    : '';
}
```

- [ ] **Step 3: Inject hint below service select in `renderCreateTeamFormStandard`**

After service row, call `compositionHintForService(defaultService)` and update on service change in existing change handler (same pattern as cycle letter refresh).

- [ ] **Step 4: Manual smoke**

Run: `npm run build:ui`  
Open Mi rotación → Crear equipo → select Interconsultas / UX / Eme → verify hint text.

- [ ] **Step 5: Commit**

```bash
git add public/js/features/clinical-teams/teams-roster-render.mjs
git commit -m "feat(teams): show Interconsultas UX Eme composition hints"
```

---

### Task 5: Soft warn on join when slot full

**Files:**
- Modify: `public/js/features/clinical-teams/teams-roster-interactions.mjs`

- [ ] **Step 1: Import `validateTeamRankSlot`**

- [ ] **Step 2: Before `joinTeam` API call**, load team members + service from team object; if `validateTeamRankSlot` returns message, call existing toast/warn helper (e.g. `showToast`) with the message but **continue** join.

```javascript
const slotWarn = validateTeamRankSlot(team.service, myRank, team.members || []);
if (slotWarn) showToast(slotWarn, { variant: 'warning' });
// proceed with joinTeam(...)
```

- [ ] **Step 3: Commit**

```bash
git add public/js/features/clinical-teams/teams-roster-interactions.mjs
git commit -m "feat(teams): soft warn when rank slot full on join"
```

---

### Task 6: Full verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`  
Expected: PASS

- [ ] **Step 2: Run metrics (if wired)**

Run: `npm run metrics`  
Expected: `totalScore` ≤ baseline

- [ ] **Step 3: Rebuild UI**

Run: `npm run build:ui`

- [ ] **Step 4: Update project context changelog** (if committing release-worthy work)

Add to `.cursor/rules/project-context.mdc`:

```markdown
- **2026-06-05** `interconsultas-teams`: IC/UX/Eme ABCD teams + off-call Interconsultas census; `clinico-access.mjs`, `clinical-team-composition.mjs`, `teams-roster-*`.
```

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| Team composition limits | Task 1, 4, 5 |
| ABCD rotation (existing) | Task 2 (verify only) |
| Off-call UX/Eme → IC census rw | Task 3 |
| On-call IC structural access | Task 3 |
| Soft slot warnings | Task 5 |
| Interconsultas assigned patients (existing path) | Task 3 off-call IC test confirms no leak |

No placeholders remain. Type names consistent across tasks.
