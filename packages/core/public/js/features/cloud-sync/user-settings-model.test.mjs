import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isEncryptedContentPath } from './cloud-sync-crypto-wire.mjs';
import {
  nextUpdatedAt,
  pickUserSettings,
  planRemoteUserSettingsApply,
  planUserSettingsPush,
} from './user-settings-model.mjs';

const local = {
  doctorName: ' Dr. Demo ',
  medicosPlantilla: { profesor: 'P', r4: 'R4', r2: '', r1a: 'A', r1b: 'B' },
  defaultServicio: 'MI',
  censoSala: 'Sala 2',
  censoTorre: '',
  censoFimiLabel: 'FIMI demo',
  quickOutputFormat: 'pdf',
  labPortalUrl: 'https://example.test',
};

describe('pickUserSettings', () => {
  it('keeps only the synced keys, trimmed, in fixed shape', () => {
    const p = pickUserSettings(local);
    assert.deepEqual(Object.keys(p), [
      'doctorName',
      'medicosPlantilla',
      'defaultServicio',
      'censoSala',
      'censoTorre',
      'censoFimiLabel',
    ]);
    assert.equal(p.doctorName, 'Dr. Demo');
    assert.deepEqual(Object.keys(p.medicosPlantilla), ['profesor', 'r4', 'r2', 'r1a', 'r1b']);
    assert.equal(p.quickOutputFormat, undefined);
    assert.equal(p.labPortalUrl, undefined);
  });

  it('fills missing values with empty strings', () => {
    const p = pickUserSettings({});
    assert.equal(p.doctorName, '');
    assert.deepEqual(p.medicosPlantilla, { profesor: '', r4: '', r2: '', r1a: '', r1b: '' });
  });
});

describe('nextUpdatedAt', () => {
  it('uses now when it is past the last stamp', () => {
    assert.equal(nextUpdatedAt('2026-11-01T10:00:00.000Z', '2026-11-01T11:00:00.000Z'), '2026-11-01T11:00:00.000Z');
  });
  it('bumps past the last stamp when the clock is behind', () => {
    assert.equal(nextUpdatedAt('2026-11-01T10:00:00.000Z', '2026-11-01T09:00:00.000Z'), '2026-11-01T10:00:00.001Z');
  });
});

describe('planUserSettingsPush', () => {
  it('builds one op value with updatedAt and the picked fields', () => {
    const plan = planUserSettingsPush({ userId: 'u1', settings: local, stamp: null, nowIso: '2026-11-01T11:00:00.000Z' });
    assert.equal(plan.updatedAt, '2026-11-01T11:00:00.000Z');
    assert.equal(plan.value.updatedAt, plan.updatedAt);
    assert.equal(plan.value.doctorName, 'Dr. Demo');
    assert.equal(plan.value.quickOutputFormat, undefined);
    assert.equal(plan.stamp.userId, 'u1');
  });

  it('returns null when nothing changed since the stamp', () => {
    const first = planUserSettingsPush({ userId: 'u1', settings: local, stamp: null, nowIso: '2026-11-01T11:00:00.000Z' });
    const again = planUserSettingsPush({ userId: 'u1', settings: local, stamp: first.stamp, nowIso: '2026-11-01T12:00:00.000Z' });
    assert.equal(again, null);
  });

  it('pushes again after a synced field changes, with a newer stamp', () => {
    const first = planUserSettingsPush({ userId: 'u1', settings: local, stamp: null, nowIso: '2026-11-01T11:00:00.000Z' });
    const next = planUserSettingsPush({
      userId: 'u1',
      settings: { ...local, censoSala: 'Sala 3' },
      stamp: first.stamp,
      nowIso: '2026-11-01T12:00:00.000Z',
    });
    assert.equal(next.value.censoSala, 'Sala 3');
    assert.ok(next.updatedAt > first.updatedAt);
  });

  it('ignores a stamp that belongs to another user', () => {
    const other = { userId: 'u2', updatedAt: '2026-11-01T20:00:00.000Z', json: '{}' };
    const plan = planUserSettingsPush({ userId: 'u1', settings: local, stamp: other, nowIso: '2026-11-01T11:00:00.000Z' });
    assert.equal(plan.updatedAt, '2026-11-01T11:00:00.000Z');
  });
});

describe('planRemoteUserSettingsApply', () => {
  const remote = {
    updatedAt: '2026-11-01T12:00:00.000Z',
    doctorName: 'Dra. Remota',
    medicosPlantilla: { profesor: 'X', r4: '', r2: '', r1a: '', r1b: '' },
    defaultServicio: 'UCI',
    censoSala: 'Sala 5',
    censoTorre: 'Torre 1',
    censoFimiLabel: '',
  };

  it('writes only the synced keys and keeps every other rpc-settings key', () => {
    const plan = planRemoteUserSettingsApply({ userId: 'u1', remote, settings: local, stamp: null });
    assert.equal(plan.settings.doctorName, 'Dra. Remota');
    assert.equal(plan.settings.censoTorre, 'Torre 1');
    assert.deepEqual(plan.settings.medicosPlantilla, remote.medicosPlantilla);
    assert.equal(plan.settings.quickOutputFormat, 'pdf');
    assert.equal(plan.settings.labPortalUrl, 'https://example.test');
  });

  it('after apply, the same values do not push back', () => {
    const plan = planRemoteUserSettingsApply({ userId: 'u1', remote, settings: local, stamp: null });
    const back = planUserSettingsPush({
      userId: 'u1',
      settings: plan.settings,
      stamp: plan.stamp,
      nowIso: '2026-11-01T13:00:00.000Z',
    });
    assert.equal(back, null);
  });

  it('ignores a remote value that is not newer than the stamp (LWW)', () => {
    const stamp = { userId: 'u1', updatedAt: '2026-11-01T12:00:00.000Z', json: '{}' };
    assert.equal(planRemoteUserSettingsApply({ userId: 'u1', remote, settings: local, stamp }), null);
    const older = { ...remote, updatedAt: '2026-11-01T11:00:00.000Z' };
    assert.equal(planRemoteUserSettingsApply({ userId: 'u1', remote: older, settings: local, stamp }), null);
  });

  it('applies a newer remote value over an older stamp', () => {
    const stamp = { userId: 'u1', updatedAt: '2026-11-01T11:00:00.000Z', json: '{}' };
    assert.ok(planRemoteUserSettingsApply({ userId: 'u1', remote, settings: local, stamp }));
  });

  it('returns null without a remote stamp time', () => {
    assert.equal(planRemoteUserSettingsApply({ userId: 'u1', remote: { doctorName: 'x' }, settings: local, stamp: null }), null);
  });
});

describe('settings path is sealed on push', () => {
  it('settings/{userId} counts as encrypted content', () => {
    assert.equal(isEncryptedContentPath('settings/u1'), true);
    assert.equal(isEncryptedContentPath('settings/u1/extra'), false);
  });
});
