import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import {
  handleRemoveMemberClick,
  handleLeaveTeamClick,
  handleDeleteTeamClick,
  handleEditTeamSubmit,
} from './teams-roster-manage.mjs';

// handleEditTeamSubmit does `instanceof HTMLInputElement/HTMLSelectElement` on
// the form fields it reads — stand in minimal classes so those checks pass
// under Electron's Node test runtime, which has no real `document`.
class FakeInputElement {
  constructor(value) {
    this.value = value;
  }
}
class FakeSelectElement {
  constructor(value) {
    this.value = value;
  }
}
class FakeButtonElement {
  constructor() {
    this.disabled = false;
  }
}

/** @param {{ name?: string, sala?: string, succeeds?: string, rotationActive?: string }} fields */
function fakeEditForm({ name = 'Equipo', sala = 'Sala 1', succeeds, rotationActive } = {}) {
  const byClass = {
    '.clinical-teams-edit-name': new FakeInputElement(name),
    '.clinical-teams-edit-sala': new FakeSelectElement(sala),
    '.clinical-teams-edit-succeeds': succeeds === undefined ? null : new FakeSelectElement(succeeds),
    '.clinical-teams-edit-rotation-active':
      rotationActive === undefined ? null : new FakeSelectElement(rotationActive),
    'button[type="submit"]': new FakeButtonElement(),
  };
  return {
    dataset: { teamId: 't1' },
    querySelector: (sel) => byClass[sel] ?? null,
  };
}

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

function fakeEditEvent() {
  return { preventDefault: mock.fn() };
}

describe('handleEditTeamSubmit rotation override', () => {
  const prevWindow = globalThis.window;
  const prevUser = clinicalSessionContext.user;
  const prevInputEl = globalThis.HTMLInputElement;
  const prevSelectEl = globalThis.HTMLSelectElement;
  const prevButtonEl = globalThis.HTMLButtonElement;

  beforeEach(() => {
    clinicalSessionContext.user = { user_id: 'u1', rank: 'R4' };
    globalThis.HTMLInputElement = FakeInputElement;
    globalThis.HTMLSelectElement = FakeSelectElement;
    globalThis.HTMLButtonElement = FakeButtonElement;
  });

  afterEach(() => {
    globalThis.window = prevWindow;
    clinicalSessionContext.user = prevUser;
    globalThis.HTMLInputElement = prevInputEl;
    globalThis.HTMLSelectElement = prevSelectEl;
    globalThis.HTMLButtonElement = prevButtonEl;
  });

  // dbClinicalTeamsUpdate rejects so submitTeamEdit never reaches its success
  // toast (ensureToastStack needs a real `document`, unavailable here — same
  // dodge the existing confirm-gating tests above use for their "confirm"
  // branch). The mock still records the call args before it throws.
  it('forwards the chosen rotation option as rotationActive', async () => {
    const dbClinicalTeamsUpdate = mock.fn(async () => {
      throw new Error('probe-edit-team');
    });
    globalThis.window = { rplusDb: { dbClinicalTeamsUpdate } };

    const form = fakeEditForm({ rotationActive: '1' });
    await assert.rejects(handleEditTeamSubmit(fakeEditEvent(), form), /probe-edit-team/);

    assert.equal(dbClinicalTeamsUpdate.mock.callCount(), 1);
    const opts = dbClinicalTeamsUpdate.mock.calls[0].arguments[0];
    assert.equal(opts.rotationActive, 1);
    assert.equal(opts.teamId, 't1');
  });

  it('sends undefined (leave unchanged) when the rotation select is absent', async () => {
    const dbClinicalTeamsUpdate = mock.fn(async () => {
      throw new Error('probe-edit-team-2');
    });
    globalThis.window = { rplusDb: { dbClinicalTeamsUpdate } };

    const form = fakeEditForm();
    await assert.rejects(handleEditTeamSubmit(fakeEditEvent(), form), /probe-edit-team-2/);

    const opts = dbClinicalTeamsUpdate.mock.calls[0].arguments[0];
    assert.equal(opts.rotationActive, undefined);
  });
});
