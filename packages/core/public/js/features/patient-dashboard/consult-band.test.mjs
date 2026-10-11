import test from 'node:test';
import assert from 'node:assert/strict';
import { setConsultInfo, triageRank, formatElapsed, icTimerHtml, icTimerStatsHtml } from './consult-band.mjs';
import { classifyInterconsultaBoardBucket } from '../../../../lib/clinical-scope/interconsulta-board-buckets.mjs';

test('setConsultInfo keeps triage and unknown keys from the phone', () => {
  const p = { consultInfo: { requestingService: 'Cirugía', reason: 'Dolor', triage: 'critico', extra: 'x' } };
  setConsultInfo(p, { followUpStatus: 'en_curso' });
  assert.deepEqual(p.consultInfo, {
    requestingService: 'Cirugía', reason: 'Dolor', followUpStatus: 'en_curso', triage: 'critico', extra: 'x',
  });
});

test('triageRank orders VPO, Críticos, IC, Seguimiento, then no group', () => {
  const ranks = ['seguimiento', '', 'vpo', 'ic', 'critico', 'raro'].map((t) => triageRank({ consultInfo: { triage: t } }));
  assert.deepEqual(ranks, [3, 4, 0, 2, 1, 4]);
  assert.equal(triageRank({}), 4);
});

test('VPO triage puts a guardia-team patient in Preop, any day', () => {
  const p = { created_at: '2020-01-01T00:00:00Z', consultInfo: { triage: 'vpo' } };
  assert.equal(classifyInterconsultaBoardBucket(p, { isGuardiaTeam: true }), 'preop');
  assert.equal(classifyInterconsultaBoardBucket(p, { isGuardiaTeam: false }), 'pendientes');
  assert.equal(classifyInterconsultaBoardBucket({ consultInfo: { triage: 'critico' } }, { isGuardiaTeam: true }), 'pendientes');
});


const NOW = Date.parse('2026-10-11T18:00:00Z');
const mk = (id, triage, receivedAt, answeredAt) => ({ id, consultInfo: { triage, receivedAt, answeredAt } });

test('formatElapsed', () => {
  assert.equal(formatElapsed(42 * 60000), '42 min');
  assert.equal(formatElapsed(72 * 60000), '1 h 12 min');
});

test('card shows the right control per state', () => {
  assert.match(icTimerHtml(mk('a', 'ic', '', ''), NOW), /data-ic-timer="start"/);
  const run = icTimerHtml(mk('a', 'ic', '2026-10-11T17:18:00Z', ''), NOW);
  assert.match(run, /42 min/);
  assert.match(run, /data-ic-timer="stop"/);
  assert.match(icTimerHtml(mk('a', 'ic', '2026-10-11T16:00:00Z', '2026-10-11T17:12:00Z'), NOW), /1 h 12 min/);
});

test('stats: 7-day average, split VPO / IC, skips old and open', () => {
  const html = icTimerStatsHtml(
    [
      mk('1', 'vpo', '2026-10-11T10:00:00Z', '2026-10-11T10:20:00Z'),
      mk('2', 'ic', '2026-10-11T10:00:00Z', '2026-10-11T11:00:00Z'),
      mk('3', 'ic', '2026-09-01T10:00:00Z', '2026-09-01T12:00:00Z'),
      mk('4', 'ic', '2026-10-11T10:00:00Z', ''),
    ],
    NOW
  );
  assert.match(html, /Promedio 7 días<\/i> 40 min/);
  assert.match(html, /VPO<\/i> 20 min/);
  assert.match(html, /IC<\/i> 1 h 0 min/);
});

test('known follow-ups get no timer and stay out of the average', () => {
  const f = mk('f', 'seguimiento', '2026-10-11T10:00:00Z', '2026-10-11T12:00:00Z');
  assert.equal(icTimerHtml(f, NOW), '');
  assert.equal(icTimerStatsHtml([f], NOW), '');
  assert.match(icTimerHtml(mk('a', 'ic', '', ''), NOW), /data-ic-timer="followup"/);
});
