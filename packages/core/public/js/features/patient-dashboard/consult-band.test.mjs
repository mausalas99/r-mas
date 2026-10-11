import test from 'node:test';
import assert from 'node:assert/strict';
import { setConsultInfo, triageRank } from './consult-band.mjs';
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
