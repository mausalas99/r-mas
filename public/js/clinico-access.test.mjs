import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICO_UNLOCK_PHRASE,
  matchesClinicoUnlockPhrase,
  isClinicoUnlocked,
  isClinicoAccessHidden,
  evaluateClinicalScope,
  computeSalaAbcdefDeficitWrite,
  patientAssignedToTeam,
  patientCoveredByGuardia,
  getCycleConfig,
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
  formatMemberCycleLabel,
  letterIndexForTeam,
  isOnCallToday,
  salaLetterForTeamOrArea,
  salaOnCallR1,
  salaOnCallR2,
  teamGuardiaOverride,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
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
  guardiaMode: false,
  now: '2026-05-31T12:00:00Z',
};

test('evaluateClinicalScope default deny without team or handoff', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2' },
    { id: 'p1', service: 'Torre HU' },
    null,
    emptyContext
  );
  assert.equal(scope.readable, false);
  assert.equal(scope.writable, false);
});

test('patientAssignedToTeam returns true when patient is in assignments', () => {
  const assignments = [
    { patient_id: 'p1', team_id: 't1' },
    { patient_id: 'p2', team_id: 't2' },
  ];
  const joinedTeamIds = new Set(['t1']);
  assert.equal(patientAssignedToTeam('p1', assignments, joinedTeamIds), true);
  assert.equal(patientAssignedToTeam('p2', assignments, joinedTeamIds), false);
});

test('patientCoveredByGuardia returns true for matching patient and user', () => {
  const guardias = [
    { patient_id: 'p1', covering_user_id: 'u1' },
    { patient_id: 'p2', covering_user_id: 'u2' },
  ];
  assert.equal(patientCoveredByGuardia('p1', 'u1', guardias), true);
  assert.equal(patientCoveredByGuardia('p1', 'u2', guardias), false);
});

test('normal mode: R1 sees patient in same sala', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1', sala: 'Sala 1' },
    { id: 'p1', service: 'Sala', sub_area: 'Sala B', sala: 'Sala 1' },
    null,
    {
      teams: [
        {
          team_id: 't-other',
          service: 'Sala',
          sub_area_fraction: 'A',
          sala: 'Sala 1',
          members: [{ user_id: 'other' }],
        },
      ],
      assignments: [],
      guardias: [],
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
  assert.match(scope.reasoning, /sala/i);
});

test('normal mode: R2 sees patient in same sala without team or handoff', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2', sala: 'Sala 2' },
    { id: 'p1', service: 'Sala', sala: 'Sala 2' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [],
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.match(scope.reasoning, /sala/i);
});

test('stampPatientClinicalSala uses creator profile sala', () => {
  const patient = { id: 'p1', servicio: 'Sala', area: 'A' };
  stampPatientClinicalSala(patient, { sala: 'Sala 2' });
  assert.equal(patient.sala, 'Sala 2');
});

test('resolveMembershipCycleForUser keeps saved member subcycle', () => {
  const team = {
    service: 'Sala',
    members: [{ user_id: 'u1', rank: 'R1', sub_area_fraction: 'D2' }],
  };
  assert.equal(resolveMembershipCycleForUser(team, 'u1', 'R1'), 'D2');
  assert.equal(resolveMembershipCycleForUser(team, 'u2', 'R1'), 'A1');
});

test('migratePatientsClinicalSala backfills only untagged charts', () => {
  const list = [
    { id: 'p1', servicio: 'Sala' },
    { id: 'p2', servicio: 'Sala', sala: 'Sala 1' },
    { id: 'demo-pitch', servicio: 'Sala', isDemo: true },
  ];
  const n = migratePatientsClinicalSala(list, { sala: 'Sala 2' });
  assert.equal(n, 1);
  assert.equal(list[0].sala, 'Sala 2');
  assert.equal(list[1].sala, 'Sala 1');
});

test('normal mode: R1 denied patient outside sala', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1', sala: 'Sala 1' },
    { id: 'p2', service: 'Sala', sala: 'Sala 2' },
    null,
    {
      teams: [{ team_id: 't1', members: [{ user_id: 'r1' }] }],
      assignments: [{ patient_id: 'p1', team_id: 't1' }],
      guardias: [],
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, false);
});

test('handoff: patient covered by guardia is visible for R2', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2x', rank: 'R2', sala: 'Sala 1' },
    { id: 'p1', service: 'Sala', sala: 'Sala 2' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [{ patient_id: 'p1', covering_user_id: 'r2x' }],
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
});

test('guardia mode R1: sees all in same Sala', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1', sala: 'Sala 1' },
    { id: 'p1', sala: 'Sala 1' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [],
      guardiaMode: true,
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, false);
});

test('guardia mode R1: denied for different Sala', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1', sala: 'Sala 1' },
    { id: 'p1', sala: 'Sala 2' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [],
      guardiaMode: true,
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, false);
});

test('guardia mode R2: sees handed-off patients', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2' },
    { id: 'p1' },
    null,
    {
      teams: [],
      assignments: [],
      guardias: [{ patient_id: 'p1', covering_user_id: 'r2' }],
      guardiaMode: true,
      now: '2026-06-01T12:00:00Z',
    }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, false);
});

test('guardia mode R4: sees Sala and Torre', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r4', rank: 'R4' },
    { id: 'p1', service: 'Sala' },
    null,
    { teams: [], assignments: [], guardias: [], guardiaMode: true, now: '2026-06-01T12:00:00Z' }
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, false);
});

test('active guardia covering user has full access', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r1', rank: 'R1' },
    { id: 'p1' },
    { covering_user_id: 'r1' },
    { teams: [], assignments: [], guardias: [], now: '2026-06-01T12:00:00Z' }
  );
  assert.equal(scope.writable, true);
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

test('Admin has full write on non-incoming patients', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'admin', rank: 'Admin' },
    { id: 'p9', service: 'Torre HU' },
    null,
    emptyContext
  );
  assert.equal(scope.writable, true);
});

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

test('getCycleLettersForTeamCreate splits Sala R1 lines', () => {
  assert.deepEqual(getCycleLettersForTeamCreate('Sala', 'R1', 0), ['A1', 'B1', 'C1', 'D1']);
  assert.deepEqual(getCycleLettersForTeamCreate('Sala', 'R1', 1), ['A2', 'B2', 'C2', 'D2']);
  assert.deepEqual(getCycleLettersForTeamCreate('Sala', 'R2', 0), ['A', 'B', 'C', 'D', 'E', 'F']);
});

test('getCycleFieldMetaForTeamCreate describes R2 vs R1', () => {
  assert.match(getCycleFieldMetaForTeamCreate('Sala', 'R2').label, /R2/i);
  assert.match(getCycleFieldMetaForTeamCreate('Sala', 'R1', 1).label, /segunda/i);
});

test('inferMembershipCycleForJoin assigns free R1 subcycle', () => {
  const team = {
    service: 'Sala',
    members: [{ rank: 'R1', sub_area_fraction: 'D2' }],
  };
  assert.equal(inferMembershipCycleForJoin(team, 'R1'), 'A1');
});

test('formatMemberCycleLabel shows R1 subcycle', () => {
  assert.equal(
    formatMemberCycleLabel({ rank: 'R1', sub_area_fraction: 'D1' }),
    'Subciclo R1 · D1'
  );
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

test('salaLetterForTeamOrArea extracts A from A1', () => {
  const result = salaLetterForTeamOrArea({ sub_area_fraction: 'A1', service: 'Sala' });
  assert.equal(result, 'A');
});

test('salaLetterForTeamOrArea extracts B from B2', () => {
  const result = salaLetterForTeamOrArea({ sub_area_fraction: 'B2', service: 'Sala' });
  assert.equal(result, 'B');
});

test('isOnCallToday handles ABCD on day 1 = A', () => {
  const team = { service: 'Eme', sub_area_fraction: 'A' };
  const now = new Date('2026-06-01T12:00:00Z');
  assert.equal(isOnCallToday(team, 'R2', now), true);
});

test('salaOnCallR1 returns R1 on call for Sala 1 on day 1', () => {
  const now = new Date('2026-06-01T12:00:00Z'); // day 1 → position 0 = A1
  const teams = [
    { team_id: 't-a1', sala: 'Sala 1', service: 'Sala', sub_area_fraction: 'A1', members: [
      { user_id: 'r1-a1', rank: 'R1' }
    ]},
    { team_id: 't-b1', sala: 'Sala 1', service: 'Sala', sub_area_fraction: 'B1', members: [
      { user_id: 'r1-b1', rank: 'R1' }
    ]},
    { team_id: 't-s2', sala: 'Sala 2', service: 'Sala', sub_area_fraction: 'A1', members: [
      { user_id: 'r1-s2', rank: 'R1' }
    ]},
  ];
  const result = salaOnCallR1(teams, 'Sala 1', now);
  assert.equal(result.length, 1);
  assert.equal(result[0].team_id, 't-a1');
  assert.equal(result[0].user_id, 'r1-a1');
});

test('salaOnCallR1 empty when no team is on-call for that Sala', () => {
  const now = new Date('2026-06-02T12:00:00Z'); // day 2 → position 1 = B1
  const teams = [
    { team_id: 't-a', sala: 'Sala 1', service: 'Sala', sub_area_fraction: 'A1', members: [
      { user_id: 'r1-a1', rank: 'R1' }
    ]},
  ];
  const result = salaOnCallR1(teams, 'Sala 1', now);
  assert.equal(result.length, 0);
});

test('salaOnCallR2 returns R2s with matching cycle letter today', () => {
  const now = new Date('2026-06-01T12:00:00Z'); // day 1 → position 0 = A
  const teams = [
    { team_id: 't-a', sala: 'Sala 1', service: 'Sala', sub_area_fraction: 'A', members: [
      { user_id: 'r2-a', rank: 'R2' }
    ]},
    { team_id: 't-b', sala: 'Sala 1', service: 'Sala', sub_area_fraction: 'B', members: [
      { user_id: 'r2-b', rank: 'R2' }
    ]},
  ];
  const result = salaOnCallR2(teams, now);
  const ids = result.map((r) => r.user_id);
  assert.ok(ids.includes('r2-a'));
  assert.equal(ids.includes('r2-b'), false);
});

test('salaOnCallR2 returns exactly 2 R2s on day 2 = B', () => {
  const now = new Date('2026-06-02T12:00:00Z'); // day 2 → position 1 = B
  const teams = ['A','B','C','D','E','F','A','B','C','D','E','F'].map((letter, i) => ({
    team_id: `t-${letter}-${i}`,
    sala: `Sala ${Math.floor(i/4) + 1}`,
    service: 'Sala',
    sub_area_fraction: letter,
    members: [{ user_id: `r2-${letter}-${i}`, rank: 'R2' }],
  }));
  const result = salaOnCallR2(teams, now);
  assert.equal(result.length, 2);
});

test('teamGuardiaOverride returns null when no guardia_today', () => {
  assert.equal(teamGuardiaOverride({}), null);
});

test('teamGuardiaOverride returns user_id from guardia_today', () => {
  const team = { guardia_today: { user_id: 'r1' } };
  assert.equal(teamGuardiaOverride(team), 'r1');
});

const SALA1 = 'Sala 1';
const v3Ctx = {
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
    v3Ctx
  );
  assert.equal(scope.readable, true);
  assert.equal(scope.writable, true);
});

test('V3 R2: structural team match', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r2', rank: 'R2', sala: SALA1 },
    { id: 'p1', service: 'Sala', sub_area: 'Sala A' },
    null,
    {
      ...v3Ctx,
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

test('V3 R3: extended service structural', () => {
  const scope = evaluateClinicalScope(
    { user_id: 'r3', rank: 'R3' },
    { id: 'p1', service: 'Torre HU', sub_area: 'A' },
    null,
    {
      ...v3Ctx,
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
