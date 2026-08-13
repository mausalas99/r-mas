import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldConfirmRemotePatientDelete,
  resolveTombstoneActorId,
  readDeclinedRemoteDeletes,
  writeDeclinedRemoteDeletes,
  buildRemoteDeleteConfirmOpts,
} from './remote-patient-delete-confirm.mjs';

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
});
