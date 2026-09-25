import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPitchLiveAlertVitalsEntry } from './tour-pitch-monitoreo.mjs';

/**
 * Teal workbench §11c "Llegó un signo fuera de rango" (Phase 0, 2026-08-19 rollout
 * plan): buildPitchLiveAlertVitalsEntry() must be a valid "just arrived" out-of-range
 * vital, so pitch seed data can drive a real one-shot pulse. The Guardia vitals
 * feed it used to drive (guardia-vitals-feed.mjs) was removed 2026-09-24 — dead
 * since the turno activo flow lost its only UI button in 7.2.6.
 */

describe('buildPitchLiveAlertVitalsEntry', () => {
  it('is a single out-of-range FC reading recorded "now"', () => {
    const now = new Date('2026-08-19T14:32:00Z');
    const entry = buildPitchLiveAlertVitalsEntry(now);
    assert.equal(entry.recordedAt, now.toISOString());
    assert.equal(entry.vitals.fc, 142);
    assert.ok(entry.alteredAt.fc, 'fc must be flagged as altered');
  });

  it('defaults to Date.now() when no ref is passed', () => {
    const before = Date.now();
    const entry = buildPitchLiveAlertVitalsEntry();
    const after = Date.now();
    const recordedAtMs = new Date(entry.recordedAt).getTime();
    assert.ok(recordedAtMs >= before && recordedAtMs <= after);
  });
});
