import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldConfirmRemotePatientDelete,
  resolveTombstoneActorId,
  readDeclinedRemoteDeletes,
  writeDeclinedRemoteDeletes,
  buildRemoteDeleteConfirmOpts,
  resolveActorDisplayName,
  listPendingRemoteDeletes,
  pendingRemoteDeletesHtml,
  writeDeclinedRemoteDeleteActors,
  partitionCloudTombstonesForConfirm,
} from './remote-patient-delete-confirm.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { setPatients } from '../../app-state.mjs';

describe('remote-patient-delete-confirm', () => {
  /** @type {Storage} */
  let store;

  beforeEach(() => {
    const data = {};
    store = {
      getItem(k) {
        return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
      },
      setItem(k, v) {
        data[k] = String(v);
      },
      removeItem(k) {
        delete data[k];
      },
    };
    globalThis.localStorage = store;
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  it('shouldConfirmRemotePatientDelete is false for own actor echo', () => {
    assert.equal(
      shouldConfirmRemotePatientDelete({
        patientId: 'p1',
        localActorId: 'admin-1',
        tombstoneActorId: 'admin-1',
        patientExistsLocally: true,
      }),
      false
    );
  });

  it('shouldConfirmRemotePatientDelete is true for foreign wipe of local chart', () => {
    assert.equal(
      shouldConfirmRemotePatientDelete({
        patientId: 'p1',
        localActorId: 'r1-mac',
        tombstoneActorId: 'admin-1',
        patientExistsLocally: true,
      }),
      true
    );
  });

  it('shouldConfirmRemotePatientDelete respects declined deletedAt', () => {
    assert.equal(
      shouldConfirmRemotePatientDelete({
        patientId: 'p1',
        localActorId: 'r1',
        tombstoneActorId: 'admin',
        deletedAt: '2026-08-12T12:00:00Z',
        patientExistsLocally: true,
        declinedMap: { p1: '2026-08-12T12:00:00Z' },
      }),
      false
    );
    assert.equal(
      shouldConfirmRemotePatientDelete({
        patientId: 'p1',
        localActorId: 'r1',
        tombstoneActorId: 'admin',
        deletedAt: '2026-08-12T13:00:00Z',
        patientExistsLocally: true,
        declinedMap: { p1: '2026-08-12T12:00:00Z' },
      }),
      true
    );
  });

  it('resolveTombstoneActorId prefers meta then entityVersions', () => {
    assert.equal(
      resolveTombstoneActorId('p1', { actorId: 'from-meta' }, {}),
      'from-meta'
    );
    assert.equal(
      resolveTombstoneActorId('p1', { deletedAt: 't' }, {
        'tombstones/p1': { actorId: 'from-ver' },
      }),
      'from-ver'
    );
  });

  it('declined map round-trips in storage', () => {
    writeDeclinedRemoteDeletes({ p1: 't1' }, store);
    assert.deepEqual(readDeclinedRemoteDeletes(store), { p1: 't1' });
  });

  it('buildRemoteDeleteConfirmOpts uses title, lead and patient list', () => {
    const one = buildRemoteDeleteConfirmOpts([{ patientId: 'p1', deletedAt: 't' }]);
    assert.equal(one.title, 'Quitar de esta Mac');
    assert.match(one.question, /Nube/);
    assert.deepEqual(one.items, ['p1']);
    assert.equal(one.confirmLabel, 'Eliminar aquí');
    assert.equal(one.cancelLabel, 'Conservar aquí');

    const many = buildRemoteDeleteConfirmOpts([
      { patientId: 'a', deletedAt: 't' },
      { patientId: 'b', deletedAt: 't' },
    ]);
    assert.equal(many.title, 'Quitar 2 pacientes de esta Mac');
    assert.equal(many.items.length, 2);
  });

  it('buildRemoteDeleteConfirmOpts names the actor when known', () => {
    clinicalSessionContext.teams = [
      { members: [{ user_id: 'u1', clinical_name: 'Dra. Ruiz' }] },
    ];
    const one = buildRemoteDeleteConfirmOpts([
      { patientId: 'p1', deletedAt: 't', actorId: 'u1' },
    ]);
    assert.match(one.question, /^Dra\. Ruiz lo eliminó en Nube/);
    clinicalSessionContext.teams = [];
  });

  it('resolveActorDisplayName falls back to a device label for unknown actors', () => {
    clinicalSessionContext.teams = [];
    assert.equal(resolveActorDisplayName(''), 'otro equipo');
    assert.equal(resolveActorDisplayName('local'), 'otro equipo');
    assert.match(resolveActorDisplayName('abcdefgh1234'), /^un dispositivo \(abcdefgh…\)$/);
  });

  it('listPendingRemoteDeletes only returns declined deletes still on this Mac', () => {
    setPatients([
      { id: 'p1', nombre: 'BENITEZ', registro: '111-1' },
      { id: 'p2', nombre: 'MARTINEZ', registro: '222-2' },
    ]);
    writeDeclinedRemoteDeletes({ p1: '2026-08-20T10:00:00Z', p3: '2026-08-20T10:00:00Z' }, store);
    writeDeclinedRemoteDeleteActors({ p1: 'u1' }, store);
    clinicalSessionContext.teams = [
      { members: [{ user_id: 'u1', clinical_name: 'Dra. Ruiz' }] },
    ];
    const pending = listPendingRemoteDeletes();
    assert.deepEqual(
      pending.map((r) => r.patientId),
      ['p1']
    );
    assert.match(pending[0].label, /BENITEZ/);
    assert.equal(pending[0].actorName, 'Dra. Ruiz');
    clinicalSessionContext.teams = [];
    setPatients([]);
  });

  it('partitionCloudTombstonesForConfirm keeps an already-declined delete instead of re-applying it', () => {
    setPatients([{ id: 'p1', nombre: 'BENITEZ', registro: '111-1' }]);
    writeDeclinedRemoteDeletes({ p1: '2026-08-20T10:00:00Z' }, store);
    const { silentIds, pendingConfirm } = partitionCloudTombstonesForConfirm(
      { p1: { deletedAt: '2026-08-20T10:00:00Z', actorId: 'admin-1' } },
      { localActorId: 'r1-mac' }
    );
    assert.deepEqual(silentIds, []);
    assert.deepEqual(pendingConfirm, []);
    setPatients([]);
  });

  it('partitionCloudTombstonesForConfirm re-asks when a new delete arrives for a previously-declined patient', () => {
    setPatients([{ id: 'p1', nombre: 'BENITEZ', registro: '111-1' }]);
    writeDeclinedRemoteDeletes({ p1: '2026-08-20T10:00:00Z' }, store);
    const { silentIds, pendingConfirm } = partitionCloudTombstonesForConfirm(
      { p1: { deletedAt: '2026-08-21T09:00:00Z', actorId: 'admin-1' } },
      { localActorId: 'r1-mac' }
    );
    assert.deepEqual(silentIds, []);
    assert.deepEqual(pendingConfirm, [{ patientId: 'p1', deletedAt: '2026-08-21T09:00:00Z', actorId: 'admin-1' }]);
    setPatients([]);
  });

  it('partitionCloudTombstonesForConfirm still applies an own-actor echo silently even if previously declined', () => {
    setPatients([{ id: 'p1', nombre: 'BENITEZ', registro: '111-1' }]);
    writeDeclinedRemoteDeletes({ p1: '2026-08-20T10:00:00Z' }, store);
    const { silentIds, pendingConfirm } = partitionCloudTombstonesForConfirm(
      { p1: { deletedAt: '2026-08-20T10:00:00Z', actorId: 'r1-mac' } },
      { localActorId: 'r1-mac' }
    );
    assert.deepEqual(silentIds, ['p1']);
    assert.deepEqual(pendingConfirm, []);
    setPatients([]);
  });

  it('pendingRemoteDeletesHtml renders a row per pending patient', () => {
    const empty = pendingRemoteDeletesHtml([]);
    assert.match(empty, /No hay pacientes/);
    const html = pendingRemoteDeletesHtml([
      { patientId: 'p1', label: 'BENITEZ · 111-1', deletedAt: 't', actorName: 'Dra. Ruiz' },
    ]);
    assert.match(html, /data-patient-id="p1"/);
    assert.match(html, /Dra\. Ruiz/);
  });
});
