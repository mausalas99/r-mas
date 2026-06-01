import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listEntregaTargets } from './clinical-entrega.mjs';
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
