import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  commitOnePatientDelete,
  commitPatientDeletes,
  formatPatientDeleteSummary,
} from './patient-delete-batch.mjs';

function makeDeps(overrides) {
  var removed = [];
  var tombs = [];
  var purged = [];
  var emitted = [];
  return Object.assign(
    {
      removed: removed,
      tombs: tombs,
      purged: purged,
      emitted: emitted,
      removeLocal: function (id) {
        removed.push(id);
        return true;
      },
      rememberTombstone: function (snap) {
        tombs.push(snap);
      },
      purgeHost: async function (id, opts) {
        purged.push({ id: id, opts: opts });
        return { ok: true };
      },
      emitDelete: function (snap) {
        emitted.push(snap);
      },
      getRoomId: function () {
        return 'room-1';
      },
      patientsList: [
        { id: 'p1', registro: 'R1', nombre: 'Uno' },
        { id: 'p2', registro: 'R2', nombre: 'Dos' },
      ],
    },
    overrides || {}
  );
}

describe('commitPatientDeletes', () => {
  it('purges host for each id when room is active', async () => {
    var deps = makeDeps();
    var summary = await commitPatientDeletes(['p1', 'p2'], { deps: deps, force: false });
    assert.equal(summary.ok, 2);
    assert.deepEqual(deps.removed, ['p1', 'p2']);
    assert.equal(deps.purged.length, 2);
    assert.equal(deps.purged[0].opts.registro, 'R1');
  });

  it('skips demo ids', async () => {
    var deps = makeDeps();
    var summary = await commitPatientDeletes(['demo-x', 'p1'], { deps: deps });
    assert.equal(summary.skippedDemo, 1);
    assert.equal(summary.ok, 1);
    assert.deepEqual(deps.removed, ['p1']);
  });

  it('tombstones locally without room', async () => {
    var deps = makeDeps({
      getRoomId: function () {
        return '';
      },
    });
    var summary = await commitOnePatientDelete('p1', { deps: deps });
    assert.equal(summary.status, 'ok');
    assert.equal(deps.purged.length, 0);
    assert.equal(deps.tombs.length, 1);
    assert.equal(deps.tombs[0].id, 'p1');
  });

  it('reports owned_by_other_client and still tombstones', async () => {
    var deps = makeDeps({
      purgeHost: async function () {
        return { ok: false, error: 'owned_by_other_client', skipped: true };
      },
    });
    var summary = await commitPatientDeletes(['p1'], { deps: deps, force: false });
    assert.equal(summary.skippedOwned, 1);
    assert.equal(deps.tombs.length, 1);
  });

  it('emits delete when host REST is not configured', async () => {
    var deps = makeDeps({
      purgeHost: async function () {
        return { ok: false, error: 'not_configured' };
      },
    });
    var summary = await commitOnePatientDelete('p1', { deps: deps });
    assert.equal(summary.status, 'ok');
    assert.equal(deps.emitted.length, 1);
    assert.equal(deps.tombs.length, 1);
  });

  it('passes force to purgeHost', async () => {
    var deps = makeDeps();
    await commitOnePatientDelete('p1', { deps: deps, force: true });
    assert.equal(deps.purged[0].opts.force, true);
  });

  it('dedupes ids', async () => {
    var deps = makeDeps();
    var summary = await commitPatientDeletes(['p1', 'p1', 'p1'], { deps: deps });
    assert.equal(summary.ok, 1);
    assert.equal(deps.removed.length, 1);
  });
});

describe('formatPatientDeleteSummary', () => {
  it('formats mixed outcomes', () => {
    assert.match(
      formatPatientDeleteSummary({ ok: 2, skippedOwned: 1, failed: 0 }),
      /2 pacientes eliminados/
    );
    assert.match(
      formatPatientDeleteSummary({ ok: 0, skippedOwned: 1, failed: 1 }),
      /sin permiso/
    );
  });
});
