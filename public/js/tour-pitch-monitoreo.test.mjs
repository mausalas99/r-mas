import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPitchLiveAlertVitalsEntry } from './tour-pitch-monitoreo.mjs';
import { renderGuardiaVitalsFeed } from './features/guardia-vitals-feed.mjs';

/**
 * Teal workbench §11c "Llegó un signo fuera de rango" (Phase 0, 2026-08-19 rollout
 * plan): buildPitchLiveAlertVitalsEntry() must be a valid "just arrived" out-of-range
 * vital that the Guardia vitals feed treats as a fresh alert (one-shot pulse), so
 * Phase 2 can screenshot the Movimiento pulse animation with real synthetic data.
 */

function pitchPatient(historial) {
  return {
    id: 'pitch-live-alert-patient',
    nombre: 'Paciente Demo',
    cuarto: '3',
    cama: 'A',
    monitoreo: { historial },
  };
}

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

  it('drives a real one-shot pulse through renderGuardiaVitalsFeed when it newly arrives', () => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML = '<div id="guardia-vitals-feed"></div>';
    const host = document.getElementById('guardia-vitals-feed');

    const baseline = {
      id: 'pitch-ea-baseline',
      recordedAt: '2026-08-19T14:00:00.000Z',
      vitals: { tas: 118, tad: 72, fc: 88, fr: 18, temp: 36.8, sat: 96 },
      alteredAt: {},
    };
    renderGuardiaVitalsFeed(
      [pitchPatient([baseline])],
      ['pitch-live-alert-patient']
    );
    assert.equal(host.querySelector('.value-alert-pulse'), null, 'no pulse before the alert arrives');

    const liveAlert = buildPitchLiveAlertVitalsEntry(new Date('2026-08-19T14:32:00Z'));
    renderGuardiaVitalsFeed(
      [pitchPatient([baseline, liveAlert])],
      ['pitch-live-alert-patient']
    );
    const pulsed = host.querySelectorAll('.value-alert-pulse');
    assert.equal(pulsed.length, 1, 'exactly one chip pulses when the out-of-range vital newly arrives');
    assert.equal(pulsed[0].getAttribute('data-patient-id'), 'pitch-live-alert-patient');

    // Re-rendering the same state must not re-pulse.
    renderGuardiaVitalsFeed(
      [pitchPatient([baseline, liveAlert])],
      ['pitch-live-alert-patient']
    );
    assert.equal(host.querySelectorAll('.value-alert-pulse').length, 0);
  });
});
