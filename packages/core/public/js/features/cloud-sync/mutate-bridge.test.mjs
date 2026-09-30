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
