# Guardia Letter-Cycle Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace day-of-week scheduling with letter-based day-of-month cycles for all guardia services, and add profile/rank UI to "Mi rotación".

**Architecture:** A central `getCycleConfig(service, rank)` function defines cycle sets (Sala R2: A-F/6, Sala R1: A1-D2/8, others: A-D/4). `isOnCallToday()` uses `(dayOfMonth - 1) % cycleLength` instead of `weekday`. No schema changes. Rank stored in localStorage, displayed/editable in teams panel.

**Tech Stack:** Vanilla JS (ES modules), node:test, SQLCipher (no schema change)

---

### Task 1: Core cycle functions — `getCycleConfig`, `letterIndexForTeam`, `isOnCallToday`

**Files:**
- Modify: `public/js/clinico-access.mjs` — add three new exported functions
- Test: `public/js/clinico-access.test.mjs` — add test block

**Implementation:**
- `getCycleConfig(service, rank)` returns `{ letters: string[], length: number }`
- `letterIndexForTeam(team, rank)` returns index of `sub_area_fraction` in the team's cycle, or -1
- `isOnCallToday(team, rank, now)` returns boolean using `(dayOfMonth - 1) % length === index`

- [ ] **Step 1: Write failing tests for `getCycleConfig`, `letterIndexForTeam`, `isOnCallToday`**

Add after the last test in `public/js/clinico-access.test.mjs`:

```js
import {
  getCycleConfig,
  letterIndexForTeam,
  isOnCallToday,
} from './clinico-access.mjs';

test('getCycleConfig returns Sala R2 config', () => {
  const cfg = getCycleConfig('Sala', 'R2');
  assert.deepEqual(cfg.letters, ['A','B','C','D','E','F']);
  assert.equal(cfg.length, 6);
});

test('getCycleConfig returns Sala R1 config', () => {
  const cfg = getCycleConfig('Sala', 'R1');
  assert.deepEqual(cfg.letters, ['A1','B1','C1','D1','A2','B2','C2','D2']);
  assert.equal(cfg.length, 8);
});

test('getCycleConfig returns ABCD for non-Sala service', () => {
  const cfg = getCycleConfig('Eme', 'R2');
  assert.deepEqual(cfg.letters, ['A','B','C','D']);
  assert.equal(cfg.length, 4);
});

test('getCycleConfig returns ABCD for non-Sala any rank', () => {
  const cfg = getCycleConfig('Torre HU', 'R1');
  assert.deepEqual(cfg.letters, ['A','B','C','D']);
  assert.equal(cfg.length, 4);
});

test('getCycleConfig normalizes service', () => {
  const cfg = getCycleConfig('Área A', 'R1');
  assert.equal(cfg.length, 4);
});

test('letterIndexForTeam returns correct index for Sala R2', () => {
  const team = { service: 'Sala', sub_area_fraction: 'C' };
  assert.equal(letterIndexForTeam(team, 'R2'), 2);
});

test('letterIndexForTeam returns correct index for Sala R1', () => {
  const team = { service: 'Sala', sub_area_fraction: 'A2' };
  assert.equal(letterIndexForTeam(team, 'R1'), 4);
});

test('letterIndexForTeam returns -1 for unknown fraction', () => {
  const team = { service: 'Sala', sub_area_fraction: 'Z' };
  assert.equal(letterIndexForTeam(team, 'R2'), -1);
});

test('letterIndexForTeam returns -1 when no sub_area_fraction', () => {
  const team = { service: 'Sala' };
  assert.equal(letterIndexForTeam(team, 'R2'), -1);
});

test('isOnCallToday returns true when dayOfMonth matches letter', () => {
  // Day 1 = position 0 = A for Sala R2
  const team = { service: 'Sala', sub_area_fraction: 'A' };
  const now = new Date('2026-06-01T12:00:00Z');
  assert.equal(isOnCallToday(team, 'R2', now), true);
});

test('isOnCallToday returns false when dayOfMonth does not match', () => {
  // Day 2 = position 1 = B for Sala R2, team has A
  const team = { service: 'Sala', sub_area_fraction: 'A' };
  const now = new Date('2026-06-02T12:00:00Z');
  assert.equal(isOnCallToday(team, 'R2', now), false);
});

test('isOnCallToday wraps around: day 7 = position 0 = A', () => {
  const team = { service: 'Sala', sub_area_fraction: 'A' };
  const now = new Date('2026-06-07T12:00:00Z');
  assert.equal(isOnCallToday(team, 'R2', now), true);
});

test('isOnCallToday handles R1 A1 on day 1', () => {
  const team = { service: 'Sala', sub_area_fraction: 'A1' };
  const now = new Date('2026-06-01T12:00:00Z');
  assert.equal(isOnCallToday(team, 'R1', now), true);
});

test('isOnCallToday handles R1 A2 on day 5', () => {
  const team = { service: 'Sala', sub_area_fraction: 'A2' };
  const now = new Date('2026-06-05T12:00:00Z');
  assert.equal(isOnCallToday(team, 'R1', now), true);
});

test('isOnCallToday handles ABCD on day 1 = A', () => {
  const team = { service: 'Eme', sub_area_fraction: 'A' };
  const now = new Date('2026-06-01T12:00:00Z');
  assert.equal(isOnCallToday(team, 'R2', now), true);
});
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
npm test -- --test-name-pattern="getCycleConfig|letterIndexForTeam|isOnCallToday"
```
Expected: FAIL — functions not defined.

- [ ] **Step 3: Implement the three core functions in `clinico-access.mjs`**

Add right after `normalizeServiceKey` (around line 116):

```js
const CYCLE_CONFIGS = {
  sala_r2: { letters: ['A','B','C','D','E','F'], length: 6 },
  sala_r1: { letters: ['A1','B1','C1','D1','A2','B2','C2','D2'], length: 8 },
  default: { letters: ['A','B','C','D'], length: 4 },
};

export function getCycleConfig(service, rank) {
  const svc = normalizeServiceKey(service);
  if (svc.includes('sala')) {
    if (rank === 'R2') return CYCLE_CONFIGS.sala_r2;
    if (rank === 'R1') return CYCLE_CONFIGS.sala_r1;
  }
  return CYCLE_CONFIGS.default;
}

export function letterIndexForTeam(team, rank) {
  const frac = String(team?.sub_area_fraction || '').trim().toUpperCase();
  if (!frac) return -1;
  const cfg = getCycleConfig(team?.service, rank);
  return cfg.letters.indexOf(frac);
}

export function isOnCallToday(team, rank, now) {
  const idx = letterIndexForTeam(team, rank);
  if (idx === -1) return false;
  const cfg = getCycleConfig(team?.service, rank);
  const d = now instanceof Date ? now : new Date(String(now));
  const dayOfMonth = d.getDate();
  return (dayOfMonth - 1) % cfg.length === idx;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --test-name-pattern="getCycleConfig|letterIndexForTeam|isOnCallToday"
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/clinico-access.mjs public/js/clinico-access.test.mjs
git commit -m "feat(guardia): add cycle config, letter index, isOnCallToday functions"
```

---

### Task 2: Update `salaLetterForTeamOrArea` to handle R1 sub-indices

**Files:**
- Modify: `public/js/clinico-access.mjs` — update `salaLetterForTeamOrArea`
- Test: `public/js/clinico-access.test.mjs` — add tests

The function currently checks against `SALA_LETTERS` which won't match "A1", "A2", etc. Change it to strip numeric suffixes.

- [ ] **Step 1: Write failing tests**

```js
test('salaLetterForTeamOrArea extracts A from A1', () => {
  const result = salaLetterForTeamOrArea({ sub_area_fraction: 'A1', service: 'Sala' });
  assert.equal(result, 'A');
});

test('salaLetterForTeamOrArea extracts B from B2', () => {
  const result = salaLetterForTeamOrArea({ sub_area_fraction: 'B2', service: 'Sala' });
  assert.equal(result, 'B');
});
```

- [ ] **Step 2: Run to see them fail**

```bash
npm test -- --test-name-pattern="salaLetterForTeamOrArea"
```
Expected: FAIL or wrong result.

- [ ] **Step 3: Modify `salaLetterForTeamOrArea` in `clinico-access.mjs`**

Replace the existing function (around line 148):

```js
export function salaLetterForTeamOrArea(teamOrPatient) {
  const frac = String(teamOrPatient?.sub_area_fraction || '').trim();
  // Strip numeric sub-index for R1 (e.g., "A1" -> "A")
  const bare = frac.replace(/[0-9]+$/, '').toUpperCase();
  if (bare && /^[A-D]$/i.test(bare)) return bare.toUpperCase();
  if (bare && /^[A-F]$/i.test(bare)) return bare.toUpperCase();
  const fromName = extractSalaLetter(teamOrPatient?.name || '');
  if (fromName) return fromName;
  return extractSalaLetter(teamOrPatient?.sub_area || teamOrPatient?.service || '');
}
```

- [ ] **Step 4: Run tests to confirm**

```bash
npm test -- --test-name-pattern="salaLetterForTeamOrArea"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/clinico-access.mjs public/js/clinico-access.test.mjs
git commit -m "feat(guardia): salaLetterForTeamOrArea handles R1 sub-indices"
```

---

### Task 3: Modify `computeSalaAbcdefDeficitWrite` to use letter-cycle

**Files:**
- Modify: `public/js/clinico-access.mjs` — change function
- Modify: `public/js/clinico-access.test.mjs` — update tests
- Modify: `public/js/features/clinical-entrega.mjs` — update call site

- [ ] **Step 1: Update the function signature and body**

Replace the existing `computeSalaAbcdefDeficitWrite` (around line 233) with a version that receives `now` instead of `weekday`:

```js
export function computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, userId, now) {
  const uid = String(userId || '');
  if (!uid) return false;
  const d = now instanceof Date ? now : new Date(String(now));
  // For R2 Sala deficit, check if any letter A-F lacks guardia today
  const r2Cfg = CYCLE_CONFIGS.sala_r2;
  const hasDeficitLetter = r2Cfg.letters.some(
    (letter) => !hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, letter)
  );
  if (!hasDeficitLetter) return false;
  return (teams || []).some((team) => {
    if (!normalizeServiceKey(team.service).includes('sala')) return false;
    if (!isOnCallToday(team, 'R2', d)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return (salaGuardiaToday || []).some(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
  });
}
```

- [ ] **Step 2: Update the test for `computeSalaAbcdefDeficitWrite`**

Replace the existing test (around line 134):

```js
test('computeSalaAbcdefDeficitWrite is false when every Sala letter has Guardia', () => {
  const now = new Date('2026-06-01T12:00:00Z'); // day 1 → position 0 = A
  const teams = ['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => ({
    team_id: `team-${letter}`,
    service: 'Sala',
    sub_area_fraction: letter,
    members: [{ user_id: `u-${letter}` }],
  }));
  // Everyone on guardia today
  const salaGuardiaToday = teams.filter(t =>
    isOnCallToday(t, 'R2', now)
  ).map((t) => ({
    team_id: t.team_id,
    user_id: `u-${t.sub_area_fraction}`,
  }));
  assert.equal(computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, 'u2', now), false);
});
```

Replace the existing test (around line 89) with a clean letter-cycle version:

```js
test('Sala ABCDEF deficit grants R2 write when user is on-call today', () => {
  const now = new Date('2026-06-01T12:00:00Z'); // day 1 → position 0 → letter A
  const teams = [
    {
      team_id: 'team-a',
      service: 'Sala',
      sub_area_fraction: 'A',
      members: [{ user_id: 'u2' }],
    },
    {
      team_id: 'team-b',
      service: 'Sala',
      sub_area_fraction: 'B',
      members: [{ user_id: 'r2-other' }],
    },
  ];
  // u2 declared guardia for team-a (letter A, matches day 1)
  // team-b (letter B) has no guardia → deficit for letter B
  const salaGuardiaToday = [{ team_id: 'team-a', user_id: 'u2' }];
  const context = {
    teams,
    guardias: [],
    cycle: null,
    assignments: [],
    salaGuardiaToday,
    now: now.toISOString(),
  };

  // Patient Sala B with no guardia → deficit write
  assert.equal(
    evaluateClinicalScope(
      { user_id: 'u2', rank: 'R2' },
      { id: 'p1', service: 'Sala B' },
      null,
      context
    ).writable,
    true
  );

  // Patient Sala A (has guardia for A) → no deficit, but u2 is on team-a → equipo write
  assert.equal(
    evaluateClinicalScope(
      { user_id: 'u2', rank: 'R2' },
      { id: 'p2', service: 'Sala A' },
      null,
      context
    ).writable,
    true
  );
});
```

- [ ] **Step 3: Update the call site in `clinical-entrega.mjs`**

In `openEntregaModal` (around line 290), change:
```js
const salaDeficit = computeSalaAbcdefDeficitWrite(
    salaGuardiaToday,
    teams,
    userId,
    weekday
);
```
to:
```js
const salaDeficit = computeSalaAbcdefDeficitWrite(
    salaGuardiaToday,
    teams,
    userId,
    new Date()
);
```

- [ ] **Step 4: Run tests to confirm**

```bash
npm test -- --test-name-pattern="computeSalaAbcdefDeficitWrite|Sala ABCDEF"
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/clinico-access.mjs public/js/clinico-access.test.mjs public/js/features/clinical-entrega.mjs
git commit -m "feat(guardia): computeSalaAbcdefDeficitWrite uses letter-cycle"
```

---

### Task 4: Modify `canR2SalaAbcdefDeficitWrite` to use letter-cycle

**Files:**
- Modify: `public/js/clinico-access.mjs` — change function signature and body
- Modify: `public/js/clinico-access.test.mjs` — update call sites

- [ ] **Step 1: Change function to accept `now` instead of `weekday`**

Replace the function (around line 258):

```js
export function canR2SalaAbcdefDeficitWrite(userId, patient, joinedTeams, salaGuardiaToday, teams, now) {
  if (!normalizeServiceKey(patient?.service).includes('sala') && !extractSalaLetter(patient?.service || '')) {
    return false;
  }
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (!patientLetter) return false;
  if (hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, patientLetter)) return false;

  const uid = String(userId || '');
  return joinedTeams.some((team) => {
    if (!normalizeServiceKey(team.service).includes('sala')) return false;
    if (!isOnCallToday(team, 'R2', now)) return false;
    const declared = (salaGuardiaToday || []).find(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
    return !!declared;
  });
}
```

- [ ] **Step 2: Update `evaluateClinicalScope` call site (around line 398)**

Change:
```js
if (canR2SalaAbcdefDeficitWrite(userId, targetPatient, joinedTeams, salaGuardiaToday, teams, weekday)) {
```
to:
```js
if (canR2SalaAbcdefDeficitWrite(userId, targetPatient, joinedTeams, salaGuardiaToday, teams, now)) {
```

- [ ] **Step 3: Update the test** (the one we modified in Task 3 step 2)

Make sure the test calls `canR2SalaAbcdefDeficitWrite` with `now` instead of `weekday`:
```js
assert.equal(
    canR2SalaAbcdefDeficitWrite('u2', { id: 'p1', service: 'Sala B' }, fixedTeams.filter((t) =>
      t.members.some((m) => m.user_id === 'u2')
    ), salaGuardiaTodayDeficit, fixedTeams, now),
    true
  );
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --test-name-pattern="canR2SalaAbcdefDeficitWrite|Sala ABCDEF"
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add public/js/clinico-access.mjs public/js/clinico-access.test.mjs
git commit -m "feat(guardia): canR2SalaAbcdefDeficitWrite uses letter-cycle"
```

---

### Task 5: Modify R3 cross-coverage in `evaluateClinicalScope`

**Files:**
- Modify: `public/js/clinico-access.mjs` — change R3 scope rule

- [ ] **Step 1: Replace the weekday comparison with `isOnCallToday`**

Around line 385, change:
```js
if (
  joinedTeams.some(
    (team) =>
      Number(team.on_call_day_index) === weekday &&
      normalizeServiceKey(team.service) === normalizeServiceKey(targetPatient?.service)
  )
) {
  return allow('R3: cobertura cruzada por día de guardia', true, true);
}
```
to:
```js
if (
  joinedTeams.some(
    (team) =>
      isOnCallToday(team, 'R3', now) &&
      normalizeServiceKey(team.service) === normalizeServiceKey(targetPatient?.service)
  )
) {
  return allow('R3: cobertura cruzada por día de guardia', true, true);
}
```

- [ ] **Step 2: Run existing tests**

```bash
npm test -- --test-name-pattern="evaluateClinicalScope"
```
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add public/js/clinico-access.mjs
git commit -m "feat(guardia): R3 cross-coverage uses letter-cycle"
```

---

### Task 6: Update `listEntregaTargets` in Entrega modal

**Files:**
- Modify: `public/js/features/clinical-entrega.mjs` — change R2 and R3 filters
- Modify: `public/js/features/clinical-entrega.test.mjs` — update test data

- [ ] **Step 1: Update R3 filter (around line 51-63)**

Replace:
```js
if (rankNorm === 'R3') {
    const suggestedIds = new Set();
    teamList.forEach((team) => {
      if (Number(team.on_call_day_index) !== weekday) return;
      (team.members || []).forEach((m) => {
        if (m?.user_id) suggestedIds.add(String(m.user_id));
      });
    });
```
to:
```js
if (rankNorm === 'R3') {
    const now = new Date();
    const suggestedIds = new Set();
    teamList.forEach((team) => {
      if (!isOnCallToday(team, 'R3', now)) return;
      (team.members || []).forEach((m) => {
        if (m?.user_id) suggestedIds.add(String(m.user_id));
      });
    });
```

- [ ] **Step 2: Import `isOnCallToday` in `clinical-entrega.mjs`**

Add to the existing import from `clinico-access.mjs` (line 9):
```js
import { computeSalaAbcdefDeficitWrite, getJoinedTeams, isOnCallToday } from '../clinico-access.mjs';
```

- [ ] **Step 3: Update R2 Sala deficit filter (around line 80-92)**

Replace:
```js
    if (salaDeficit) {
      deficitR2 = all.filter((u) => {
        if (u.rank !== 'R2') return false;
        return teamList.some((team) => {
          if (!String(team.service || '').toLowerCase().includes('sala')) return false;
          if (Number(team.on_call_day_index) !== weekday) return false;
          const onGuardia =
            team.guardia_today && String(team.guardia_today.user_id) === u.user_id;
          if (!onGuardia) return false;
          return (team.members || []).some((m) => String(m.user_id) === u.user_id);
        });
      });
    }
```
to:
```js
    if (salaDeficit) {
      const now = new Date();
      deficitR2 = all.filter((u) => {
        if (u.rank !== 'R2') return false;
        return teamList.some((team) => {
          if (!String(team.service || '').toLowerCase().includes('sala')) return false;
          if (!isOnCallToday(team, 'R2', now)) return false;
          const onGuardia =
            team.guardia_today && String(team.guardia_today.user_id) === u.user_id;
          if (!onGuardia) return false;
          return (team.members || []).some((m) => String(m.user_id) === u.user_id);
        });
      });
    }
```

- [ ] **Step 4: Update the test file `clinical-entrega.test.mjs`**

The R2 test (line 41) uses `on_call_day_index: 1` with `weekday: 1`. Change to use `sub_area_fraction`:

Replace teams in "R2 targets same service peers and R4":
```js
const teams = [
  {
    team_id: 's1',
    service: 'Sala',
    sub_area_fraction: 'A',
    on_call_day_index: 0,
    members: [
      { user_id: 'r2a', rank: 'R2' },
      { user_id: 'r2b', rank: 'R2' },
    ],
  },
  {
    team_id: 'e1',
    service: 'Eme',
    members: [{ user_id: 'r3x', rank: 'R3' }],
  },
];
const { targets, flow } = listEntregaTargets('R2', teams, users, false, {
  currentUserId: 'r2a',
});
```
(Remove `weekday: 1`, add `now`)

For the R2 deficit test (line 69), update to use `sub_area_fraction`:
```js
it('R2 with sala deficit includes on-call Sala R2', () => {
  const teams = [
    {
      team_id: 's1',
      service: 'Sala',
      sub_area_fraction: 'A',
      on_call_day_index: 0,
      guardia_today: { user_id: 'r2b' },
      members: [
        { user_id: 'r2a', rank: 'R2' },
        { user_id: 'r2b', rank: 'R2' },
      ],
    },
  ];
  const { targets } = listEntregaTargets('R2', teams, users, true, {
    currentUserId: 'r2a',
    now: '2026-06-01T12:00:00Z', // day 1 → position 0 = A
  });
```

For R3 test (line 90), update teams to use `sub_area_fraction`:
```js
it('R3 suggests members on teams matching today', () => {
  const teams = [
    {
      team_id: 't1',
      service: 'Torre HU',
      sub_area_fraction: 'A',
      on_call_day_index: 0,
      members: [
        { user_id: 'r3x', rank: 'R3' },
        { user_id: 'r2a', rank: 'R2' },
      ],
    },
    {
      team_id: 't2',
      service: 'Eme',
      sub_area_fraction: 'B',
      on_call_day_index: 0,
      members: [{ user_id: 'r2b', rank: 'R2' }],
    },
  ];
  const { flow, targets } = listEntregaTargets('R3', teams, users, false, {
    currentUserId: 'r3x',
    now: '2026-06-01T12:00:00Z', // day 1 → position 0 = A (matches t1)
  });
```

- [ ] **Step 5: Add `now` parameter to `listEntregaTargets`**

Modify `listEntregaTargets` signature to accept `now` in opts:
```js
export function listEntregaTargets(rank, teams, users, salaDeficit, opts = {}) {
  const currentUserId = String(opts.currentUserId || '');
  const now = opts.now ? new Date(String(opts.now)) : new Date();
```

Replace all `new Date()` calls in the function with `now`.

- [ ] **Step 6: Run tests to confirm**

```bash
npm test -- --test-name-pattern="listEntregaTargets"
```
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add public/js/features/clinical-entrega.mjs public/js/features/clinical-entrega.test.mjs
git commit -m "feat(guardia): Entrega target filters use letter-cycle"
```

---

### Task 7: Add rank display and editing to "Mi rotación" panel

**Files:**
- Modify: `public/js/features/clinical-teams.mjs` — rank display, rank change UI

- [ ] **Step 1: Add rank display at top of panel**

In `renderClinicalTeamsPanel`, after the lead paragraph, add rank info:

```js
const rank = clinicalSessionContext.user?.rank || 'R1';
const rankSection = `
  <section class="clinical-teams-section clinical-teams-rank-section">
    <h4 class="clinical-teams-section-title">Mi perfil</h4>
    <div class="clinical-teams-rank-row">
      <span class="clinical-teams-rank-badge">Rango: <strong>${escapeHtml(rank)}</strong></span>
      <button type="button" class="btn-med-secondary" id="btn-change-rank">Cambiar rango</button>
    </div>
  </section>`;
```

Insert it after the lead paragraph and before "Mis equipos":

```js
host.innerHTML = `
    <p class="clinical-teams-lead">...</p>
    ${rankSection}
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Mis equipos</h4>
      ...`;
```

- [ ] **Step 2: Add rank change handler**

Add to `wireClinicalTeamsPanelInteractions`:

```js
const changeRankBtn = document.getElementById('btn-change-rank');
if (changeRankBtn && !changeRankBtn._rpcRankWired) {
  changeRankBtn._rpcRankWired = true;
  changeRankBtn.addEventListener('click', () => handleChangeRank());
}
```

Add the handler function:

```js
async function handleChangeRank() {
  const RANKS = ['R1', 'R2', 'R3', 'R4', 'Admin'];
  const current = clinicalSessionContext.user?.rank || 'R1';
  const rankStr = prompt(`Rango actual: ${current}\n\nEscribe el nuevo rango (${RANKS.join(', ')}):`, current);
  if (!rankStr) return;
  const rank = rankStr.trim().toUpperCase();
  if (!RANKS.includes(rank)) {
    toast(`Rango inválido. Debe ser: ${RANKS.join(', ')}`, 'error');
    return;
  }
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {}
  settings.clinicalRank = rank;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) {}
  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.rank = rank;
  }
  toast(`Rango cambiado a ${rank}`, 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await renderClinicalTeamsPanel();
}
```

- [ ] **Step 3: Add CSS for rank display**

Add to a suitable CSS file (e.g., add inline in the modal or use existing modals.css pattern). The simplest approach is inline styles or adding a class to modals.css. Since the panels are dynamically rendered, add a `<style>` block in the modal template or use CSS classes.

Let's add minimal inline styles in the render function by appending a style tag if not present, or simply use existing CSS classes. Since the project has `modals.css`, add:

In `modals.css` add:
```css
.clinical-teams-rank-section {
  border-bottom: 1px solid var(--border, #ddd);
  padding-bottom: 12px;
  margin-bottom: 12px;
}
.clinical-teams-rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.clinical-teams-rank-badge {
  font-size: 14px;
  color: var(--text, #333);
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: no regressions (the UI changes are not tested by existing tests).

- [ ] **Step 5: Commit**

```bash
git add public/js/features/clinical-teams.mjs public/styles/modals.css
git commit -m "feat(guardia): rank display and editing in Mi rotación"
```

---

### Task 8: Dynamic letter dropdown in team creation form

**Files:**
- Modify: `public/js/features/clinical-teams.mjs` — dynamic dropdown based on service+rank

- [ ] **Step 1: Modify `renderCreateTeamForm` to accept context**

The form currently shows a static `ON_CALL_DAY_LABELS` dropdown. Change it to show letter options based on the selected service and current rank.

Replace the `renderCreateTeamForm` function:

```js
function renderCreateTeamForm() {
  const serviceOptions = CLINICAL_TEAM_SERVICES.map(
    (svc) => `<option value="${escapeAttr(svc)}">${escapeHtml(svc)}</option>`
  ).join('');
  const rank = clinicalSessionContext.user?.rank || 'R1';
  const defaultCycle = getCycleConfig(CLINICAL_TEAM_SERVICES[0], rank);
  const letterOptions = defaultCycle.letters.map(
    (letter, idx) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`
  ).join('');

  return `
    <section class="clinical-teams-section">
      <h4 class="clinical-teams-section-title">Crear equipo</h4>
      <form id="clinical-team-create-form" class="clinical-teams-create-form">
        <div class="field-group">
          <label for="clinical-team-create-name">Nombre</label>
          <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Sala A · Equipo noche" required>
        </div>
        <div class="field-group">
          <label for="clinical-team-create-service">Servicio</label>
          <select id="clinical-team-create-service" class="profile-input" required>${serviceOptions}</select>
        </div>
        <div class="field-group">
          <label for="clinical-team-create-fraction">Fracción de sub-área (opcional)</label>
          <input id="clinical-team-create-fraction" type="text" class="profile-input" placeholder="A1, A2…" maxlength="16">
        </div>
        <div class="field-group">
          <label for="clinical-team-create-day">Posición en ciclo</label>
          <select id="clinical-team-create-day" class="profile-input" required>${letterOptions}</select>
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-save">Crear equipo</button>
        </div>
      </form>
    </section>`;
}
```

- [ ] **Step 2: Add dynamic update when service selector changes**

Add to `wireClinicalTeamsPanelInteractions`:

```js
const serviceSelect = document.getElementById('clinical-team-create-service');
if (serviceSelect && !serviceSelect._rpcServiceWired) {
  serviceSelect._rpcServiceWired = true;
  serviceSelect.addEventListener('change', () => {
    const daySelect = document.getElementById('clinical-team-create-day');
    if (!daySelect) return;
    const rank = clinicalSessionContext.user?.rank || 'R1';
    const cfg = getCycleConfig(serviceSelect.value, rank);
    daySelect.innerHTML = cfg.letters.map(
      (letter, idx) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`
    ).join('');
  });
}
```

- [ ] **Step 3: Update `handleCreateTeamSubmit` to save letter as `sub_area_fraction`**

The `onCallDayIndex` is no longer relevant. Change the submission to use the selected letter:

Replace:
```js
const onCallDayIndex = Number(document.getElementById('clinical-team-create-day')?.value ?? 0);
```
with:
```js
const cycleLetter = String(document.getElementById('clinical-team-create-day')?.value || 'A').trim();
```

Then update the create call:
```js
const res = await api.dbClinicalTeamsCreate({
  name,
  service,
  subAreaFraction: cycleLetter,
  onCallDayIndex: 0,
  createdBy: userId,
});
```

Remove the individual `subAreaFraction` field from the form (now redundant with cycle letter), or keep it as an override.

- [ ] **Step 4: Commit**

```bash
git add public/js/features/clinical-teams.mjs
git commit -m "feat(guardia): dynamic letter dropdown in team creation"
```

---

### Task 9: Remove `SALA_LETTERS` constant

**Files:**
- Modify: `public/js/clinico-access.mjs` — remove `SALA_LETTERS`

- [ ] **Step 1: Remove `const SALA_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];` (line 9)**

Replace its usage in `salaLetterForTeamOrArea` with the cycle config or a regex check (already handled in Task 2).

- [ ] **Step 2: Run all tests**

```bash
npm test
```
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add public/js/clinico-access.mjs
git commit -m "chore: remove unused SALA_LETTERS constant"
```

---

### Task 10: Full integration verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: 0 failures.

- [ ] **Step 2: Verify by searching for remaining `on_call_day_index` comparisons**

```bash
rg "on_call_day_index\s*!==\s*weekday\b|on_call_day_index\s*===\s*weekday\b" public/js/
```
Expected: no matches (all replaced with `isOnCallToday`).

- [ ] **Step 3: Verify no remaining references to `SALA_LETTERS`**

```bash
rg "SALA_LETTERS" public/js/ lib/
```
Expected: no matches.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: integration fixes after letter-cycle migration"
```
