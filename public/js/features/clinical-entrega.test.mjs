import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listEntregaTargets,
  resolveR1GuardiaCovering,
  resolveEntregaActorRole,
  loadGuardiaGridViewContext,
  startEntregaPhase,
  endEntregaPhase,
  ensureEntregaTargetUser,
  collectEntregaScopeUsers,
} from './clinical-entrega.mjs';
import { isOnCallToday, getCycleConfig, salaOnCallR2 } from '../clinico-access.mjs';

const users = [
  { user_id: 'r1a', username: 'r1a', rank: 'R1' },
  { user_id: 'r1b', username: 'r1b', rank: 'R1' },
  { user_id: 'r2a', username: 'r2a', rank: 'R2' },
  { user_id: 'r2b', username: 'r2b', rank: 'R2' },
  { user_id: 'r4x', username: 'r4x', rank: 'R4' },
  { user_id: 'r3x', username: 'r3x', rank: 'R3' },
];

describe('listEntregaTargets', () => {
  it('R1 targets on-call guardia for sala even from another team', () => {
    const now = '2026-06-01T12:00:00Z';
    const teams = [
      {
        team_id: 't1',
        service: 'Sala',
        sala: 'Sala 1',
        sub_area_fraction: 'A1',
        members: [{ user_id: 'r1a', rank: 'R1' }],
      },
      {
        team_id: 't2',
        service: 'Sala',
        sala: 'Sala 1',
        sub_area_fraction: 'B1',
        members: [{ user_id: 'r1b', rank: 'R1' }],
      },
    ];
    const { targets, flow } = listEntregaTargets('R1', teams, users, false, {
      currentUserId: 'r1b',
      now,
    });
    assert.equal(flow, 'r1');
    const ids = targets.map((u) => u.user_id);
    assert.ok(ids.includes('r1a'), 'on-call R1 for the sala must be an entrega target');
  });

  it('R1 targets same team or sub_area_fraction', () => {
    const teams = [
      {
        team_id: 't1',
        service: 'Sala',
        sub_area_fraction: 'A1',
        members: [
          { user_id: 'r1a', rank: 'R1' },
          { user_id: 'r1b', rank: 'R1' },
        ],
      },
      {
        team_id: 't2',
        service: 'Sala',
        sub_area_fraction: 'A1',
        members: [{ user_id: 'r1b', rank: 'R1' }],
      },
    ];
    const { targets, flow } = listEntregaTargets('R1', teams, users, false, {
      currentUserId: 'r1a',
    });
    assert.equal(flow, 'r1');
    const ids = targets.map((u) => u.user_id).sort();
    assert.deepEqual(ids, ['r1a', 'r1b']);
  });

  it('R2 handoff targets R2 guardia on-call and R4s', () => {
    const now = '2026-06-01T12:00:00Z'; // day 1 -> position 0 = A
    const teams = [
      {
        team_id: 's1',
        service: 'Sala',
        sub_area_fraction: 'A',
        sala: 'Sala 1',
        members: [
          { user_id: 'r2a', rank: 'R2' },
          { user_id: 'r2b', rank: 'R2' },
        ],
      },
      {
        team_id: 's2',
        service: 'Sala',
        sub_area_fraction: 'B',
        sala: 'Sala 2',
        members: [{ user_id: 'r3x', rank: 'R3' }],
      },
    ];
    const { targets, flow } = listEntregaTargets('R2', teams, users, false, {
      currentUserId: 'r2a',
      now,
    });
    assert.equal(flow, 'r2_handoff');
    const ids = new Set(targets.map((u) => u.user_id));
    assert.ok(ids.has('r4x'));
    assert.ok(ids.has('r2a'));
    assert.ok(ids.has('r2b'));
  });

  it('R3 suggests members on teams matching today', () => {
    const now = '2026-06-01T12:00:00Z'; // day 1 -> position 0 = A
    const teams = [
      {
        team_id: 't1',
        service: 'Torre HU',
        sub_area_fraction: 'A',
        members: [
          { user_id: 'r3x', rank: 'R3' },
          { user_id: 'r2a', rank: 'R2' },
        ],
      },
      {
        team_id: 't2',
        service: 'Eme',
        sub_area_fraction: 'B',
        members: [{ user_id: 'r2b', rank: 'R2' }],
      },
    ];
    const { flow, targets } = listEntregaTargets('R3', teams, users, false, {
      currentUserId: 'r3x',
      now,
    });
    assert.equal(flow, 'r3_suggest');
    const ids = targets.map((u) => u.user_id);
    assert.ok(ids.includes('r3x'));
    assert.ok(ids.includes('r2a'));
    assert.equal(ids.includes('r2b'), false);
  });

  it('generic flow returns all registered users', () => {
    const { flow, targets } = listEntregaTargets('Admin', [], users, false, {});
    assert.equal(flow, 'generic');
    assert.equal(targets.length, users.length);
  });
});

describe('resolveEntregaActorRole', () => {
  it('diurno when no existing guardia', () => {
    assert.deepEqual(resolveEntregaActorRole({ user_id: 'u1', rank: 'R1' }, null), {
      role: 'diurno',
      userId: 'u1',
      rank: 'R1',
    });
    assert.deepEqual(resolveEntregaActorRole({ user_id: 'u1' }, {}), {
      role: 'diurno',
      userId: 'u1',
      rank: '',
    });
  });

  it('guardia when updating own coverage', () => {
    assert.equal(
      resolveEntregaActorRole(
        { user_id: 'u1' },
        { guardia_id: 'g-1', covering_user_id: 'u1' }
      ).role,
      'guardia'
    );
    assert.equal(
      resolveEntregaActorRole({ user_id: 'u1' }, { guardiaId: 'g-2', covering_user_id: 'u1' })
        .role,
      'guardia'
    );
  });

  it('diurno when handoff belongs to another covering user', () => {
    assert.equal(
      resolveEntregaActorRole(
        { user_id: 'u1' },
        { guardia_id: 'g-1', covering_user_id: 'u2' }
      ).role,
      'diurno'
    );
  });
});

describe('collectEntregaScopeUsers', () => {
  it('includes session user and team members when scope users missing', () => {
    const roster = collectEntregaScopeUsers(
      {},
      [
        {
          team_id: 't1',
          members: [{ user_id: 'r1b', username: 'r1b', rank: 'R1', clinical_name: 'Ana' }],
        },
      ],
      { user_id: 'self1', username: 'msalas', rank: 'R1', clinical_name: 'Mauricio' }
    );
    const ids = roster.map((u) => u.user_id);
    assert.ok(ids.includes('self1'));
    assert.ok(ids.includes('r1b'));
  });
});

describe('ensureEntregaTargetUser', () => {
  it('adds existing covering user when absent from rank-based targets', () => {
    const targets = [{ user_id: 'r4x', username: 'r4x', rank: 'R4', clinical_name: '' }];
    const merged = ensureEntregaTargetUser(targets, users, 'r1b');
    assert.equal(merged.length, 2);
    assert.equal(merged[0].user_id, 'r1b');
  });

  it('does not duplicate when user already in list', () => {
    const targets = [{ user_id: 'r1b', username: 'r1b', rank: 'R1', clinical_name: '' }];
    const merged = ensureEntregaTargetUser(targets, users, 'r1b');
    assert.equal(merged.length, 1);
  });
});

describe('resolveR1GuardiaCovering', () => {
  it('returns R1 on call for the sala', () => {
    const now = '2026-06-01T12:00:00Z';
    const teams = [
      {
        team_id: 's1',
        service: 'Sala',
        sala: 'Sala 1',
        sub_area_fraction: 'A1',
        members: [{ user_id: 'r1a', rank: 'R1' }],
      },
    ];
    const covering = resolveR1GuardiaCovering(teams, users, 'Sala 1', now);
    assert.ok(covering);
    assert.equal(covering.coveringUserId, 'r1a');
    assert.equal(covering.sala, 'Sala 1');
  });
});

describe('entrega phase session', () => {
  const mem = new Map();

  before(() => {
    globalThis.localStorage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => {
        mem.set(k, v);
      },
      removeItem: (k) => {
        mem.delete(k);
      },
    };
  });

  afterEach(() => {
    mem.clear();
    endEntregaPhase();
  });

  it('loadGuardiaGridViewContext is HANDOFF while phase active', () => {
    assert.equal(loadGuardiaGridViewContext(), 'GUARDIA');
    startEntregaPhase({
      coveringUserId: 'r1b',
      sala: 'Sala 1',
      coveringLabel: 'r1b · Test (R1)',
    });
    assert.equal(loadGuardiaGridViewContext(), 'HANDOFF');
    endEntregaPhase();
    assert.equal(loadGuardiaGridViewContext(), 'GUARDIA');
  });
});
