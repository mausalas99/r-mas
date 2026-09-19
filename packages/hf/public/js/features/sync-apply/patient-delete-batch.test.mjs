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
  var cloud = [];
  return Object.assign(
    {
      removed: removed,
      tombs: tombs,
      cloud: cloud,
      removeLocal: function (id) {
        removed.push(id);
        return true;
      },
      rememberTombstone: function (snap) {
        tombs.push(snap);
      },
      enqueueCloudDelete: function (snap) {
        cloud.push(snap);
      },
      patientsList: [
        { id: 'p1', registro: 'R1', nombre: 'Uno' },
        { id: 'p2', registro: 'R2', nombre: 'Dos' },
      ],
    },
    overrides || {}
  );
}

describe('commitPatientDeletes (Nube)', () => {
  it('removes locally, tombstones, and enqueues cloud wipe', async () => {
    var deps = makeDeps();
    var summary = await commitPatientDeletes(['p1', 'p2'], { deps: deps });
    assert.equal(summary.ok, 2);
    assert.deepEqual(deps.removed, ['p1', 'p2']);
    assert.equal(deps.tombs.length, 2);
    assert.equal(deps.cloud.length, 2);
    assert.equal(deps.cloud[0].registro, 'R1');
    assert.equal(deps.cloud[1].id, 'p2');
  });

  it('skips demo ids', async () => {
    var deps = makeDeps();
    var summary = await commitPatientDeletes(['demo-x', 'p1'], { deps: deps });
    assert.equal(summary.skippedDemo, 1);
    assert.equal(summary.ok, 1);
    assert.deepEqual(deps.removed, ['p1']);
    assert.equal(deps.cloud.length, 1);
  });

  it('always enqueues cloud delete (bridge no-ops when offline)', async () => {
    var deps = makeDeps();
    var summary = await commitOnePatientDelete('p1', { deps: deps });
    assert.equal(summary.status, 'ok');
    assert.equal(deps.cloud.length, 1);
    assert.equal(deps.tombs[0].id, 'p1');
  });

  it('dedupes ids', async () => {
    var deps = makeDeps();
    var summary = await commitPatientDeletes(['p1', 'p1', 'p1'], { deps: deps });
    assert.equal(summary.ok, 1);
    assert.equal(deps.removed.length, 1);
    assert.equal(deps.cloud.length, 1);
  });
});

describe('formatPatientDeleteSummary', () => {
  it('formats ok and failed', () => {
    assert.match(
      formatPatientDeleteSummary({ ok: 2, failed: 0 }),
      /2 pacientes eliminados/
    );
    assert.match(
      formatPatientDeleteSummary({ ok: 0, failed: 1 }),
      /1 fallo al sync/
    );
    assert.equal(formatPatientDeleteSummary({ ok: 0, failed: 0 }), 'Nada que eliminar');
  });
});
