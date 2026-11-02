import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyOps, emptyState } from './lww.js';
import {
  ownUserSettingsFromOps,
  ownUserSettingsFromState,
  stateWithoutUserSettings,
  stripUserSettingsOps,
} from './user-settings.js';

const val = (doctorName) => ({ updatedAt: '2026-11-01T10:00:00.000Z', doctorName });
const op = (userId, value, updatedAt, actorId = `ios:${userId}`) => ({
  path: `settings/${userId}`,
  value: { ...value, updatedAt },
  updatedAt,
  actorId,
});

describe('settings/{userId} LWW', () => {
  it('owner write is stored under its own user id', () => {
    const r = applyOps(emptyState(), [op('u1', val('Dr A'), '2026-11-01T10:00:00.000Z')], 'u1');
    assert.equal(r.applied.length, 1);
    assert.equal(r.state.userSettings.u1.doctorName, 'Dr A');
  });

  it('other user write is rejected as forbidden_path', () => {
    const r = applyOps(emptyState(), [op('u1', val('Dr A'), '2026-11-01T10:00:00.000Z')], 'u2');
    assert.equal(r.applied.length, 0);
    assert.equal(r.rejected[0].reason, 'forbidden_path');
    assert.equal(r.state.userSettings?.u1, undefined);
  });

  it('write with no session user id is rejected', () => {
    const r = applyOps(emptyState(), [op('u1', val('Dr A'), '2026-11-01T10:00:00.000Z')]);
    assert.equal(r.rejected[0].reason, 'forbidden_path');
  });

  it('stale settings op is rejected and newer one wins', () => {
    let s = emptyState();
    ({ state: s } = applyOps(s, [op('u1', val('new'), '2026-11-01T12:00:00.000Z')], 'u1'));
    const stale = applyOps(s, [op('u1', val('old'), '2026-11-01T09:00:00.000Z')], 'u1');
    assert.equal(stale.rejected[0].reason, 'stale');
    assert.equal(stale.state.userSettings.u1.doctorName, 'new');
  });
});

describe('settings pull scoping', () => {
  it('ops never carry settings; caller gets only its own op value', () => {
    const ops = [
      { path: 'agenda', value: [], updatedAt: 'a', actorId: 'x' },
      op('u1', val('mine'), '2026-11-01T10:00:00.000Z'),
      op('u2', val('theirs'), '2026-11-01T11:00:00.000Z'),
    ];
    assert.deepEqual(stripUserSettingsOps(ops).map((o) => o.path), ['agenda']);
    assert.deepEqual(ownUserSettingsFromOps(ops, 'u1'), { u1: { updatedAt: '2026-11-01T10:00:00.000Z', doctorName: 'mine' } });
    assert.deepEqual(ownUserSettingsFromOps(ops, 'u3'), {});
    assert.deepEqual(ownUserSettingsFromOps(ops, ''), {});
  });

  it('snapshot keeps only the caller value and strips the rest', () => {
    const state = { ...emptyState(), userSettings: { u1: 'env1', u2: 'env2' } };
    assert.deepEqual(ownUserSettingsFromState(state, 'u1'), { u1: 'env1' });
    assert.deepEqual(ownUserSettingsFromState(state, 'u9'), {});
    assert.equal('userSettings' in stateWithoutUserSettings(state), false);
  });
});
