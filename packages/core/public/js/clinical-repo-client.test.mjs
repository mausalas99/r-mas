import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  canExecuteClinicalCommand,
  executeClinicalCommand,
  canProjectClinicalChanges,
  projectUnsyncedClinicalChanges,
  markClinicalChangesSynced,
} from './clinical-repo-client.mjs';
import {
  getPatientById,
  resetClinicalReadModelForTests,
} from './clinical-read-model.mjs';

describe('clinical-repo-client', () => {
  const prev = globalThis.window;

  beforeEach(() => {
    resetClinicalReadModelForTests();
    globalThis.window = {
      electronAPI: {
        dbClinicalCommand: async (payload) => {
          assert.equal(payload.command.type, 'eventualidad.upsert');
          return { ok: true, changedKeys: ['patients'], changeId: 'chg_test' };
        },
        dbClinicalProjectUnsynced: async () => ({
          ok: true,
          mutations: [{ clientMutationId: 'chg_a', ops: [{ path: 'entries/p1/eventualidades', value: {}, updatedAt: 't', actorId: 'u1' }] }],
          skipIds: [],
        }),
        dbClinicalMarkSynced: async (payload) => ({ ok: true, marked: (payload.changeIds || []).length }),
      },
    };
  });

  afterEach(() => {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  });

  it('canExecuteClinicalCommand detects IPC', () => {
    assert.equal(canExecuteClinicalCommand(), true);
  });

  it('executeClinicalCommand invokes electronAPI.dbClinicalCommand', async () => {
    const res = await executeClinicalCommand(
      { type: 'eventualidad.upsert', patientId: 'p1', entry: { text: 'x' } },
      { actorId: 'u1' }
    );
    assert.deepEqual(res, {
      ok: true,
      changedKeys: ['patients'],
      changeId: 'chg_test',
    });
  });

  it('returns ipc_unavailable without API', async () => {
    globalThis.window = {};
    assert.equal(canExecuteClinicalCommand(), false);
    const res = await executeClinicalCommand({ type: 'eventualidad.delete', patientId: 'p1', entryId: 'e1' });
    assert.deepEqual(res, { ok: false, error: 'ipc_unavailable' });
  });

  it('applies patients snapshot into read model when IPC returns patients', async () => {
    globalThis.window.electronAPI.dbClinicalCommand = async () => ({
      ok: true,
      changedKeys: ['patients'],
      changeId: 'chg_snap',
      patients: [{ id: 'p1', nombre: 'Ana', eventualidades: { entries: [{ id: 'e1', text: 'ok' }] } }],
    });
    const res = await executeClinicalCommand(
      { type: 'eventualidad.upsert', patientId: 'p1', entry: { text: 'ok' } },
      { actorId: 'u1' }
    );
    assert.equal(res.ok, true);
    assert.equal(getPatientById('p1')?.eventualidades?.entries?.[0]?.text, 'ok');
  });

  it('project + mark synced IPC helpers', async () => {
    assert.equal(canProjectClinicalChanges(), true);
    const projected = await projectUnsyncedClinicalChanges();
    assert.equal(projected.ok, true);
    assert.equal(projected.mutations.length, 1);
    const marked = await markClinicalChangesSynced({ changeIds: ['chg_a'] });
    assert.equal(marked.ok, true);
    assert.equal(marked.marked, 1);
  });

  it('applies multi-field snapshot into read model when IPC returns domain fields', async () => {
    globalThis.window.electronAPI.dbClinicalCommand = async () => ({
      ok: true,
      changedKeys: ['notes', 'labHistory', 'patients'],
      changeId: 'chg_multi',
      patients: [{ id: 'p1', nombre: 'Ana' }],
      notes: { p1: 'nota' },
      labHistory: { p1: [{ at: 't' }] },
      indicaciones: { p1: 'ind' },
    });
    const res = await executeClinicalCommand(
      { type: 'clinical.persistSnapshot', notes: { p1: 'nota' } },
      { actorId: 'u1' }
    );
    assert.equal(res.ok, true);
    assert.equal(res.notes.p1, 'nota');
    assert.equal(getPatientById('p1')?.nombre, 'Ana');
    const { getNotes, getLabHistory, getIndicaciones } = await import('./clinical-read-model.mjs');
    assert.equal(getNotes('p1'), 'nota');
    assert.deepEqual(getLabHistory('p1'), [{ at: 't' }]);
    assert.equal(getIndicaciones('p1'), 'ind');
  });

  it('forwards echoSnapshot: false in IPC meta', async () => {
    let seen;
    globalThis.window.electronAPI.dbClinicalCommand = async (payload) => {
      seen = payload;
      return { ok: true, changedKeys: ['patients'], changeId: 'chg_echo' };
    };
    await executeClinicalCommand(
      { type: 'eventualidad.upsert', patientId: 'p1', entry: { text: 'x' } },
      { source: 'ui', echoSnapshot: false }
    );
    assert.equal(seen.meta.echoSnapshot, false);
    assert.equal(seen.meta.source, 'ui');
  });

  it('does not apply snapshot fields when echoSnapshot is false', async () => {
    globalThis.window.electronAPI.dbClinicalCommand = async () => ({
      ok: true,
      changedKeys: ['patients'],
      changeId: 'chg_no_echo',
      patients: [{ id: 'p1', nombre: 'ShouldNotApply' }],
    });
    await executeClinicalCommand(
      { type: 'eventualidad.upsert', patientId: 'p1', entry: { text: 'x' } },
      { source: 'ui', echoSnapshot: false }
    );
    assert.equal(getPatientById('p1'), null);
  });

  it('forwards changeIds to project-unsynced IPC', async () => {
    let seen;
    globalThis.window.electronAPI.dbClinicalProjectUnsynced = async (payload) => {
      seen = payload;
      return { ok: true, mutations: [], skipIds: [] };
    };
    await projectUnsyncedClinicalChanges({ changeIds: ['chg_only'] });
    assert.deepEqual(seen.changeIds, ['chg_only']);
  });
});
