import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderGuardiaVitalsFeed,
  commitVitalsFeedReorder,
} from './guardia-vitals-feed.mjs';

/**
 * Teal workbench §11c "Llegó un signo fuera de rango": a newly-altered value
 * pulses once, but the chip must NOT reorder itself — only a user tap on the
 * "N nuevos" pill (data-vfeed-reorder) applies the alert-priority order.
 */

function patient(id, opts) {
  return {
    id,
    nombre: 'Paciente ' + id,
    cuarto: '1',
    cama: id,
    monitoreo: {
      historial: [
        {
          values: opts.values || { sat: 97 },
          alteredAt: opts.altered ? { sat: '2026-08-18T08:00:00Z' } : {},
          recordedAt: opts.recordedAt || '2026-08-18T08:00:00Z',
        },
      ],
    },
  };
}

function chipOrder(host) {
  return Array.from(host.querySelectorAll('.vfeed-chip')).map((el) =>
    el.getAttribute('data-patient-id')
  );
}

describe('renderGuardiaVitalsFeed — stable order + single pulse', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML = '<div id="guardia-vitals-feed"></div>';
  });

  it('keeps existing chip order when a value newly goes out of range, and pulses only that chip', () => {
    if (typeof document === 'undefined') return;
    const host = document.getElementById('guardia-vitals-feed');

    // First render: both stable. Bed order p1, p2 (registeredAt tie, natural sort keeps input order-ish).
    const gen1 = [
      patient('p1', { altered: false, recordedAt: '2026-08-18T08:00:00Z' }),
      patient('p2', { altered: false, recordedAt: '2026-08-18T07:00:00Z' }),
    ];
    renderGuardiaVitalsFeed(gen1, ['p1', 'p2']);
    const orderBefore = chipOrder(host);
    assert.deepEqual(orderBefore.sort(), ['p1', 'p2']);
    assert.equal(host.querySelector('.value-alert-pulse'), null);

    // Second render: p2 (currently second/last by recordedAt) newly goes out of range.
    // Under naive alert-first sorting it would jump to the front — it must not.
    const gen2 = [
      patient('p1', { altered: false, recordedAt: '2026-08-18T08:00:00Z' }),
      patient('p2', { altered: true, recordedAt: '2026-08-18T09:00:00Z' }),
    ];
    renderGuardiaVitalsFeed(gen2, ['p1', 'p2']);

    const orderAfter = chipOrder(host);
    assert.deepEqual(orderAfter, orderBefore, 'row must not jump position on its own');

    const pulsed = host.querySelectorAll('.value-alert-pulse');
    assert.equal(pulsed.length, 1);
    assert.equal(pulsed[0].getAttribute('data-patient-id'), 'p2');

    // A "N nuevos" pill appears since the natural (alert-first) order now differs.
    const pill = host.querySelector('[data-vfeed-reorder]');
    assert.ok(pill, 'expected a reorder pill once alert-priority order differs from display order');

    // Re-rendering the SAME state again must not re-pulse (only the arrival transition pulses).
    renderGuardiaVitalsFeed(gen2, ['p1', 'p2']);
    assert.equal(host.querySelectorAll('.value-alert-pulse').length, 0);
  });

  it('commitVitalsFeedReorder() applies the alert-priority order on demand', () => {
    if (typeof document === 'undefined') return;
    const host = document.getElementById('guardia-vitals-feed');

    renderGuardiaVitalsFeed(
      [
        patient('p1', { altered: false, recordedAt: '2026-08-18T08:00:00Z' }),
        patient('p2', { altered: false, recordedAt: '2026-08-18T07:00:00Z' }),
      ],
      ['p1', 'p2']
    );
    renderGuardiaVitalsFeed(
      [
        patient('p1', { altered: false, recordedAt: '2026-08-18T08:00:00Z' }),
        patient('p2', { altered: true, recordedAt: '2026-08-18T09:00:00Z' }),
      ],
      ['p1', 'p2']
    );
    assert.ok(host.querySelector('[data-vfeed-reorder]'));

    commitVitalsFeedReorder();
    renderGuardiaVitalsFeed(
      [
        patient('p1', { altered: false, recordedAt: '2026-08-18T08:00:00Z' }),
        patient('p2', { altered: true, recordedAt: '2026-08-18T09:00:00Z' }),
      ],
      ['p1', 'p2']
    );
    assert.equal(chipOrder(host)[0], 'p2', 'alert-priority order applied after commit');
    assert.equal(host.querySelector('[data-vfeed-reorder]'), null, 'pill clears once committed');
  });
});
