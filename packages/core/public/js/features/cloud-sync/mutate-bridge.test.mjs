import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapBundleEnvelopeToOps } from './mutate-bridge.mjs';

const meta = { actorId: 'user-1', updatedAt: '2026-08-02T12:00:00.000Z' };

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

});

