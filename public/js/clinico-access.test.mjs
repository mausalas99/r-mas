import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICO_UNLOCK_PHRASE,
  matchesClinicoUnlockPhrase,
  isClinicoUnlocked,
  isClinicoAccessHidden,
  evaluateClinicalScope,
  canR2SalaAbcdefDeficitWrite,
  computeSalaAbcdefDeficitWrite,
} from './clinico-access.mjs';

test('matchesClinicoUnlockPhrase accepts exact phrase', () => {
  assert.equal(matchesClinicoUnlockPhrase(CLINICO_UNLOCK_PHRASE), true);
});

test('matchesClinicoUnlockPhrase ignores case and accents', () => {
  assert.equal(matchesClinicoUnlockPhrase('Entiendo, usare mi criterio clincio'), true);
});

test('isClinicoAccessHidden is true until unlocked', () => {
  assert.equal(isClinicoAccessHidden({}), true);
  assert.equal(isClinicoAccessHidden({ hideManejoSection: false }), false);
});

test('isClinicoUnlocked respects clinicoUnlocked flag', () => {
  assert.equal(isClinicoUnlocked({ clinicoUnlocked: true, hideManejoSection: true }), true);
  assert.equal(
    isClinicoAccessHidden({ clinicoUnlocked: true, hideManejoSection: true }),
    true
  );
  assert.equal(
    isClinicoAccessHidden({ clinicoUnlocked: true, hideManejoSection: false }),
    false
  );
});

const emptyContext = {
  teams: [],
  guardias: [],
  cycle: null,
  assignments: [],
  salaGuardiaToday: [],
  now: '2026-05-31T12:00:00Z',
};

test('evaluateClinicalScope default deny without team or macro match', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2' },
    { id: 'p1', service: 'Torre HU' },
    null,
    emptyContext
  );
  assert.equal(scope.readable, false);
  assert.equal(scope.writable, false);
});

test('R4 can write Sala patient without team membership', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r4', rank: 'R4' },
    { id: 'p1', service: 'Sala A' },
    null,
    emptyContext
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
  assert.match(scope.reasoning, /macro/i);
});

test('incoming assignment is readable but not writable before effective_at', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2' },
    { id: 'p1', service: 'Sala A' },
    null,
    {
      teams: [{ team_id: 't1', service: 'Sala', sub_area_fraction: 'A', members: [] }],
      guardias: [],
      cycle: { preview_start_at: '2026-05-30T00:00:00Z', effective_at: '2026-06-01T00:00:00Z' },
      assignments: [{ patient_id: 'p1', team_id: 't1', effective_at: '2026-06-01T00:00:00Z' }],
      salaGuardiaToday: [],
      now: '2026-05-31T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, false);
  assert.equal(scope.incomingPreview, true);
});

test('Sala ABCDEF deficit grants R2 write to Sala A patient when A has no Guardia', () => {
  const weekday = new Date('2026-05-31T12:00:00Z').getDay();
  const teams = [
    {
      team_id: 'team-a',
      service: 'Sala',
      sub_area_fraction: 'A',
      on_call_day_index: weekday,
      members: [{ user_id: 'r2-other' }],
    },
    {
      team_id: 'team-b',
      service: 'Sala',
      sub_area_fraction: 'B',
      on_call_day_index: weekday,
      members: [{ user_id: 'u2' }],
    },
  ];
  const salaGuardiaToday = [{ team_id: 'team-b', user_id: 'u2' }];
  const context = {
    teams,
    guardias: [],
    cycle: null,
    assignments: [],
    salaGuardiaToday,
    now: '2026-05-31T12:00:00Z',
  };

  assert.equal(
    canR2SalaAbcdefDeficitWrite('u2', { id: 'p1', service: 'Sala A' }, teams.filter((t) =>
      t.members.some((m) => m.user_id === 'u2')
    ), salaGuardiaToday, teams, weekday),
    true
  );

  const scope = evaluateClinicalScope(
    { user_id: 'u2', rank: 'R2' },
    { id: 'p1', service: 'Sala A', sub_area: 'Sala A' },
    null,
    context
  );
  assert.equal(scope.writable, true);
  assert.match(scope.reasoning, /déficit Sala ABCDEF/i);
});

test('computeSalaAbcdefDeficitWrite is false when every Sala letter has Guardia', () => {
  const weekday = new Date('2026-05-31T12:00:00Z').getDay();
  const teams = ['A', 'B', 'C', 'D', 'E', 'F'].map((letter, i) => ({
    team_id: `team-${letter}`,
    service: 'Sala',
    sub_area_fraction: letter,
    on_call_day_index: weekday,
    members: [{ user_id: `u-${letter}` }],
  }));
  const salaGuardiaToday = teams.map((t) => ({
    team_id: t.team_id,
    user_id: `u-${t.sub_area_fraction}`,
  }));
  assert.equal(computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, 'u2', weekday), false);
});

test('Admin has full write on non-incoming patients', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'admin', rank: 'Admin' },
    { id: 'p9', service: 'Torre HU' },
    null,
    emptyContext
  );
  assert.equal(scope.writable, true);
});
