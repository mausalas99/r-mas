import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapBundleEnvelopeToOps } from './mutate-bridge.mjs';
import { __resetMedRecetaIndexForTests, noteCloudMedRecetaOpsSent, markCloudEntryCleared, cloudOversizeDocCount } from './cloud-med-receta-index.mjs';

const meta = { actorId: 'user-1', updatedAt: '2026-08-02T12:00:00.000Z' };

describe('mutate-bridge note / indicaciones ops', () => {
  const at = '2026-09-29T10:00:00.000Z';
  const docOps = (entry) =>
    mapBundleEnvelopeToOps(
      { entries: [{ patient: { id: 'n1', nombre: 'PAC' }, labHistory: [], ...entry }] },
      meta
    ).filter((op) => /\/(note|indicaciones)$/.test(op.path));

  it('a stamped note and indicaciones each send one op with their own clock', () => {
    __resetMedRecetaIndexForTests();
    const ops = docOps({ note: { evolucion: 'A', updatedAt: at }, indicaciones: { dieta: 'B', updatedAt: '2026-09-29T10:05:00.000Z' } });
    assert.deepEqual(ops.map((o) => [o.path, o.updatedAt]), [
      ['entries/n1/note', at],
      ['entries/n1/indicaciones', '2026-09-29T10:05:00.000Z'],
    ]);
  });

  it('an unchanged note is not resent once it was sent', () => {
    __resetMedRecetaIndexForTests();
    const note = { evolucion: 'A', updatedAt: at };
    const first = docOps({ note, indicaciones: {} });
    assert.equal(first.length, 1);
    noteCloudMedRecetaOpsSent(first);
    assert.equal(docOps({ note: { ...note }, indicaciones: {} }).length, 0);
    assert.equal(docOps({ note: { ...note, evolucion: 'A2', updatedAt: '2026-09-29T10:01:00.000Z' }, indicaciones: {} }).length, 1);
  });

  it('a form that fills a default without an edit (same updatedAt) is not resent — no echo', () => {
    __resetMedRecetaIndexForTests();
    const note = { evolucion: 'A', updatedAt: at };
    noteCloudMedRecetaOpsSent(docOps({ note, indicaciones: {} }));
    assert.equal(docOps({ note: { ...note, medico: 'DR DEMO', diagnosticos: [''] }, indicaciones: {} }).length, 0);
  });

  it('a realistic busy note (8,000-char interrogatorio, long evolucion) is far under the doc cap', () => {
    __resetMedRecetaIndexForTests();
    const busy = { interrogatorio: 'x'.repeat(8000), evolucion: 'y'.repeat(6000), estudios: 'z'.repeat(6000), updatedAt: at };
    assert.equal(docOps({ note: busy, indicaciones: {} }).length, 1);
    assert.ok(JSON.stringify(busy).length < 30 * 1024);
  });

  it('a note with no updatedAt (never edited since 8.4.4, or empty) is never sent with a "now" clock', () => {
    __resetMedRecetaIndexForTests();
    assert.equal(docOps({ note: { evolucion: 'VIEJA' }, indicaciones: {} }).length, 0);
    assert.equal(docOps({ note: {}, indicaciones: {} }).length, 0);
  });

  it('a clear (null) goes out only when a delete is pending on this device', () => {
    __resetMedRecetaIndexForTests();
    assert.equal(docOps({ note: null, indicaciones: null }).length, 0);
    markCloudEntryCleared('n1', 'note');
    const ops = docOps({ note: null, indicaciones: null });
    assert.deepEqual(ops.map((o) => [o.path, o.value]), [['entries/n1/note', null]]);
  });

  it('a note over 96 KB is kept local (no op, never truncated) and counted for the «Pendiente» line', () => {
    __resetMedRecetaIndexForTests();
    const big = { interrogatorio: 'x'.repeat(100 * 1024), updatedAt: at };
    assert.equal(docOps({ note: big, indicaciones: {} }).length, 0);
    assert.equal(cloudOversizeDocCount(), 1);
    assert.equal(docOps({ note: { evolucion: 'corta', updatedAt: at }, indicaciones: {} }).length, 1);
    assert.equal(cloudOversizeDocCount(), 0);
  });
});

describe('mutate-bridge note Anteriores', () => {
  const at = '2026-09-29T10:00:00.000Z';
  const copy = (i) => ({ fecha: `d${i}`, guardada: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(), evolucion: 'x'.repeat(8000) });
  const noteOps = (note) =>
    mapBundleEnvelopeToOps({ entries: [{ patient: { id: 'n1', nombre: 'PAC' }, labHistory: [], note, indicaciones: {} }] }, meta)
      .filter((op) => op.path === 'entries/n1/note');

  it('a note whose 30 copies pass the cap still goes out, oldest copies trimmed first', () => {
    __resetMedRecetaIndexForTests();
    const note = { evolucion: 'A', updatedAt: at, anteriores: Array.from({ length: 30 }, (_, i) => copy(29 - i)) };
    const ops = noteOps(note);
    assert.equal(ops.length, 1);
    const sent = ops[0].value.anteriores;
    assert.ok(sent.length > 0 && sent.length < 30);
    assert.equal(sent[0].fecha, 'd29');
    assert.equal(note.anteriores.length, 30);
    assert.equal(cloudOversizeDocCount(), 0);
  });
});

describe('mutate-bridge op mapping', () => {
  /** mapBundleEnvelopeToOps for a single p1 entry carrying the given `monitoreo`. */
  function mapOpsForP1Monitoreo(monitoreo) {
    return mapBundleEnvelopeToOps(
      {
        entries: [
          {
            patient: { id: 'p1', nombre: 'PAC', lanUpdatedAt: '2026-08-03T09:00:00.000Z', monitoreo },
            note: {},
            indicaciones: {},
            labHistory: [],
          },
        ],
      },
      meta
    );
  }

  it('mapBundleEnvelopeToOps still pushes monitoreo when it has no resolvable content clock (falls back to the patient clock instead of dropping the vitals silently)', () => {
    const ops = mapOpsForP1Monitoreo({
      historial: [{ id: 'm1', vitals: { fc: '80' } }],
    });
    const monOp = ops.find((op) => op.path === 'entries/p1/monitoreo');
    assert.ok(monOp);
    assert.equal(monOp.updatedAt, '2026-08-03T09:00:00.000Z');
  });

  it('clockless monitoreo / eventualidades keep the same clock across bundles, so the echo guard skips them (was: every save re-sent every patient, 429 flood)', () => {
    const entry = {
      patient: { id: 'p1', nombre: 'PAC', lanUpdatedAt: '2026-08-03T09:00:00.000Z', monitoreo: { historial: [] }, eventualidades: { entries: [] } },
      note: {},
      indicaciones: {},
      labHistory: [],
    };
    const clocks = (at) =>
      mapBundleEnvelopeToOps({ entries: [entry] }, { ...meta, updatedAt: at })
        .filter((op) => /\/(monitoreo|eventualidades)$/.test(op.path))
        .map((op) => op.updatedAt);
    assert.deepEqual(clocks('2026-08-04T10:00:00.000Z'), clocks('2026-08-04T10:00:05.000Z'));
    assert.equal(clocks('2026-08-04T10:00:00.000Z').length, 2);
  });

  it('a patient with no clock at all gets a fixed floor clock, never the batch "now" (fresh "now" each cycle defeated the echo guard and re-sent every 12 s)', () => {
    const entry = {
      patient: { id: 'p1', nombre: 'PAC', monitoreo: { historial: [] }, eventualidades: { entries: [] } },
      note: {},
      indicaciones: {},
      labHistory: [],
    };
    const clocks = (at) =>
      mapBundleEnvelopeToOps({ entries: [entry] }, { ...meta, updatedAt: at })
        .filter((op) => /\/(monitoreo|eventualidades)$/.test(op.path))
        .map((op) => op.updatedAt);
    assert.deepEqual(clocks('2026-08-04T10:00:00.000Z'), clocks('2026-08-04T10:00:12.000Z'));
    assert.equal(clocks('2026-08-04T10:00:00.000Z').length, 2);
  });
});

// Ways the push timers can slow a save down:
// 1. a second schedule in the same tick cancels the leading 0 ms push and
//    re-arms it at the 1.5 s debounce;
// 2. the outbox coalesce waits the old 500 ms before the first POST;
// 3. a shorter coalesce stops merging a same-tick burst into one flush.
describe('mutate-bridge push timers', () => {
  async function withBridge(fn) {
    const { mock } = await import('node:test');
    const { setCloudRoomConnected } = await import('./nube-sync-policy.mjs');
    const { configureCloudMutateBridge } = await import('./mutate-bridge.mjs');
    const flushes = [];
    const enqueued = [];
    mock.timers.enable({ apis: ['setTimeout'] });
    setCloudRoomConnected(true);
    configureCloudMutateBridge({
      outbox: { enqueue: (row) => enqueued.push(row), list: () => enqueued },
      getRevision: () => 1,
      flush: async () => flushes.push(Date.now()),
    });
    try {
      await fn({ flushes, enqueued, tick: (ms) => mock.timers.tick(ms) });
    } finally {
      mock.timers.reset();
      setCloudRoomConnected(false);
      configureCloudMutateBridge(null);
    }
  }

  it('two patient deletes in one tick flush at once, not after 1.5 s', async () => {
    const { enqueueCloudPatientDelete } = await import('./mutate-bridge.mjs');
    await withBridge(({ flushes, tick }) => {
      enqueueCloudPatientDelete({ id: 'p-a', registro: '' });
      enqueueCloudPatientDelete({ id: 'p-b', registro: '' });
      tick(0);
      assert.equal(flushes.length, 1);
    });
  });

  it('an enqueued edit flushes within 150 ms, and a same-tick burst shares one flush', async () => {
    const { enqueueCloudClinicalOpsValue } = await import('./mutate-bridge.mjs');
    await withBridge(({ flushes, tick }) => {
      enqueueCloudClinicalOpsValue({ a: 1 });
      enqueueCloudClinicalOpsValue({ a: 2 });
      tick(150);
      assert.equal(flushes.length, 1);
    });
  });
});
