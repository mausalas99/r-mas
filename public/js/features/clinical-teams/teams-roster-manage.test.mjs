import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import {
  handleRemoveMemberClick,
  handleLeaveTeamClick,
  handleDeleteTeamClick,
} from './teams-roster-manage.mjs';

function fakeBtn(dataset) {
  return { dataset, disabled: false };
}

describe('teams-roster-manage confirm gating', () => {
  const prevWindow = globalThis.window;
  const prevUser = clinicalSessionContext.user;

  beforeEach(() => {
    clinicalSessionContext.user = { user_id: 'u1', rank: 'R2' };
  });

  afterEach(() => {
    globalThis.window = prevWindow;
    clinicalSessionContext.user = prevUser;
  });

  it('handleRemoveMemberClick asks a destructive confirm and does not call the API on cancel', async () => {
    const confirmFn = mock.fn(async () => 'cancel');
    const dbClinicalUserDelete = mock.fn(async () => ({ ok: true }));
    globalThis.window = { rplusDb: { dbClinicalUserDelete } };

    const btn = fakeBtn({ userId: 'u9', userLabel: 'Pérez García' });
    await handleRemoveMemberClick(btn, confirmFn);

    assert.equal(confirmFn.mock.callCount(), 1);
    const opts = confirmFn.mock.calls[0].arguments[0];
    assert.equal(opts.weight, 'destructive');
    assert.match(opts.title, /Quitar a «Pérez García» del equipo/);
    assert.equal(dbClinicalUserDelete.mock.callCount(), 0);
    assert.equal(btn.disabled, false);
  });

  it('handleRemoveMemberClick only proceeds to the API when confirm resolves "confirm"', async () => {
    const confirmFn = mock.fn(async () => 'confirm');
    const dbClinicalUserDelete = mock.fn(async () => {
      throw new Error('probe-remove-member');
    });
    globalThis.window = { rplusDb: { dbClinicalUserDelete } };

    const btn = fakeBtn({ userId: 'u9', userLabel: 'Pérez García' });
    await assert.rejects(handleRemoveMemberClick(btn, confirmFn), /probe-remove-member/);
    assert.equal(dbClinicalUserDelete.mock.callCount(), 1);
  });

  it('handleLeaveTeamClick asks a consequence confirm and does not call the API on cancel', async () => {
    const confirmFn = mock.fn(async () => 'cancel');
    const dbClinicalTeamsMemberRemove = mock.fn(async () => ({ ok: true }));
    globalThis.window = { rplusDb: { dbClinicalTeamsMemberRemove } };

    const btn = fakeBtn({ teamId: 't1', teamName: 'Dra. Leslie' });
    await handleLeaveTeamClick(btn, confirmFn);

    assert.equal(confirmFn.mock.callCount(), 1);
    const opts = confirmFn.mock.calls[0].arguments[0];
    assert.equal(opts.weight, 'consequence');
    assert.match(opts.title, /Salir del equipo «Dra\. Leslie»/);
    assert.equal(dbClinicalTeamsMemberRemove.mock.callCount(), 0);
  });

  it('handleLeaveTeamClick only proceeds to the API when confirm resolves "confirm"', async () => {
    const confirmFn = mock.fn(async () => 'confirm');
    const dbClinicalTeamsMemberRemove = mock.fn(async () => {
      throw new Error('probe-leave-team');
    });
    globalThis.window = { rplusDb: { dbClinicalTeamsMemberRemove } };

    const btn = fakeBtn({ teamId: 't1', teamName: 'Dra. Leslie' });
    await assert.rejects(handleLeaveTeamClick(btn, confirmFn), /probe-leave-team/);
    assert.equal(dbClinicalTeamsMemberRemove.mock.callCount(), 1);
  });

  it('handleDeleteTeamClick asks a destructive confirm and does not call the API on cancel', async () => {
    const confirmFn = mock.fn(async () => 'cancel');
    const dbClinicalTeamsArchive = mock.fn(async () => ({ ok: true }));
    globalThis.window = { rplusDb: { dbClinicalTeamsArchive } };

    const btn = fakeBtn({ teamId: 't1', teamName: 'Dra. Leslie' });
    await handleDeleteTeamClick(btn, confirmFn);

    assert.equal(confirmFn.mock.callCount(), 1);
    const opts = confirmFn.mock.calls[0].arguments[0];
    assert.equal(opts.weight, 'destructive');
    assert.match(opts.title, /Eliminar el equipo «Dra\. Leslie»/);
    assert.match(opts.message, /no se puede deshacer/);
    assert.equal(dbClinicalTeamsArchive.mock.callCount(), 0);
  });

  it('handleDeleteTeamClick only proceeds to the API when confirm resolves "confirm"', async () => {
    const confirmFn = mock.fn(async () => 'confirm');
    const dbClinicalTeamsArchive = mock.fn(async () => {
      throw new Error('probe-delete-team');
    });
    globalThis.window = { rplusDb: { dbClinicalTeamsArchive } };

    const btn = fakeBtn({ teamId: 't1', teamName: 'Dra. Leslie' });
    await assert.rejects(handleDeleteTeamClick(btn, confirmFn), /probe-delete-team/);
    assert.equal(dbClinicalTeamsArchive.mock.callCount(), 1);
  });
});
