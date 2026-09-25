import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeLastActivityIso,
  clinicalUserActivityTier,
  formatClinicalUserLastActivity,
  formatClinicalUserActivityAbsolute,
  formatClinicalUserActivityBadge,
  formatClinicalUserActivityHistory,
  clinicalUserActivityHistoryEntries,
  clinicalUserActivitySourceLabel,
} from './clinical-user-activity.mjs';

describe('clinical-user-activity', () => {
  const now = new Date('2026-06-10T18:00:00.000Z').getTime();

  it('mergeLastActivityIso keeps the newest ISO timestamp', () => {
    assert.equal(
      mergeLastActivityIso('2026-06-09T10:00:00.000Z', '2026-06-10T08:00:00.000Z'),
      '2026-06-10T08:00:00.000Z'
    );
    assert.equal(mergeLastActivityIso('', '2026-06-10T08:00:00.000Z'), '2026-06-10T08:00:00.000Z');
  });

  it('clinicalUserActivityTier classifies active, recent, and stale', () => {
    assert.equal(
      clinicalUserActivityTier('2026-06-10T17:30:00.000Z', now),
      'active'
    );
    assert.equal(
      clinicalUserActivityTier('2026-06-08T18:00:00.000Z', now),
      'recent'
    );
    assert.equal(
      clinicalUserActivityTier('2026-05-01T18:00:00.000Z', now),
      'stale'
    );
    assert.equal(clinicalUserActivityTier(null, now), 'unknown');
  });

  it('formatClinicalUserLastActivity returns Spanish relative última labels', () => {
    assert.equal(formatClinicalUserLastActivity('2026-06-10T17:59:00.000Z', now), 'Última: hace 1 min');
    assert.equal(formatClinicalUserLastActivity('2026-06-09T18:00:00.000Z', now), 'Última: ayer');
    assert.equal(formatClinicalUserLastActivity(null, now), 'Sin actividad registrada');
  });

  it('formatClinicalUserActivityBadge includes absolute datetime', () => {
    const iso = '2026-06-10T17:30:00.000Z';
    const badge = formatClinicalUserActivityBadge(iso, now);
    assert.match(badge, /Última:/);
    assert.match(badge, / · /);
    assert.ok(formatClinicalUserActivityAbsolute(iso).length > 0);
    assert.equal(formatClinicalUserActivityBadge(null, now), 'Sin actividad registrada');
  });

  it('formatClinicalUserActivityHistory lists timeline with source labels', () => {
    assert.equal(clinicalUserActivitySourceLabel('seed_created'), 'Creado');
    assert.equal(clinicalUserActivitySourceLabel('session'), 'Sesión');
    const history = [
      { at: '2026-08-07T16:00:00.000Z', source: 'session' },
      { at: '2026-06-10T08:00:00.000Z', source: 'seed_created' },
    ];
    const text = formatClinicalUserActivityHistory(history, 8);
    assert.match(text, /^Historial:/);
    assert.match(text, /Creado/);
    assert.match(text, /Sesión/);
    const entries = clinicalUserActivityHistoryEntries(history, 8);
    assert.equal(entries.total, 2);
    assert.equal(entries.entries.length, 2);
    assert.equal(entries.entries[0].source, 'Creado');
    assert.equal(entries.entries[1].source, 'Sesión');
  });
});
