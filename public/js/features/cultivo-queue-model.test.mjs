import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  chunkHasAntibiograma,
  cultivoNeedsAtbFollowUp,
  noteMentionsCultivo,
  noteCoversCultivoResult,
  cultivoQueueReasonLabels,
  cultivoQueueStatusLine,
  extractCultivoFollowUpCandidates,
  classifyCultivoFollowUps,
  buildCultivoQueueRows,
} = await import('./cultivo-queue-model.mjs');

const identityNorm = function (raw) {
  return String(raw || '').trim();
};

test('chunkHasAntibiograma detects ATB line and ANTIBIOGRAMA body', () => {
  assert.equal(chunkHasAntibiograma('UROCULTIVO: E. COLI\nATB: MEROPENEM S'), true);
  assert.equal(
    chunkHasAntibiograma('HEMOCULTIVO: PSEUDOMONAS\nANTIBIOGRAMA\n*\nMEROPENEM\n0.5\tS\n*'),
    true
  );
  assert.equal(chunkHasAntibiograma('UROCULTIVO: E. COLI\nCuenta: >100000'), false);
  assert.equal(chunkHasAntibiograma('UROCULTIVO: E. COLI\nANTIBIOGRAMA\n*\n*'), false);
});

test('cultivoNeedsAtbFollowUp only for positives without ATB', () => {
  assert.equal(cultivoNeedsAtbFollowUp({ negativo: true }, 'x'), false);
  assert.equal(cultivoNeedsAtbFollowUp({ negativo: false }, 'ORG\nATB: CIPRO S'), false);
  assert.equal(cultivoNeedsAtbFollowUp({ negativo: false }, 'ORG · Preliminar'), true);
});

test('noteMentionsCultivo matches organism token', () => {
  assert.equal(
    noteMentionsCultivo('Urocultivo con Escherichia coli; se ajustó ATB', {
      organismo: 'Escherichia coli',
    }),
    true
  );
  assert.equal(noteMentionsCultivo('Sin cambios', { organismo: 'Pseudomonas aeruginosa' }), false);
});

test('noteCoversCultivoResult by fecha or mention', () => {
  var item = { fecha: '20/07/2026', organismo: 'E. COLI', sortKeyMs: Date.UTC(2026, 6, 20) };
  assert.equal(
    noteCoversCultivoResult({ fecha: '21/07/2026', estudios: 'BH' }, item, identityNorm),
    true
  );
  assert.equal(
    noteCoversCultivoResult({ fecha: '19/07/2026', estudios: 'BH' }, item, identityNorm),
    false
  );
  assert.equal(
    noteCoversCultivoResult(
      { fecha: '19/07/2026', evolucion: 'E. COLI en urocultivo' },
      item,
      identityNorm
    ),
    true
  );
});

test('cultivoQueueReasonLabels / statusLine', () => {
  assert.match(cultivoQueueReasonLabels(['atb_pendiente', 'sin_nota']), /ATB pendiente/);
  assert.match(cultivoQueueStatusLine(['sin_nota'], 2), /2 cultivos/);
});

test('extract + classify + buildCultivoQueueRows', () => {
  var history = [
    {
      id: 's1',
      fecha: '20/07/2026',
      hora: '10:00',
      resLabs: [
        'BH\tHb\t12',
        'LIQUIDO PERITONEAL 20/07: Escherichia coli\nCuenta: >100000 UFC/ml',
      ],
    },
  ];
  var candidates = extractCultivoFollowUpCandidates(history);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].organismo, /coli/i);

  var items = classifyCultivoFollowUps(candidates, { fecha: '19/07/2026', estudios: '' }, identityNorm);
  assert.ok(items.length === 1);
  assert.ok(items[0].reasons.indexOf('atb_pendiente') !== -1);
  assert.ok(items[0].reasons.indexOf('sin_nota') !== -1);

  var rows = buildCultivoQueueRows(
    [
      { id: 'p1', nombre: 'García', cuarto: '3', cama: 'B' },
      { id: 'p2', nombre: 'Quiet' },
    ],
    {
      normalizeFecha: identityNorm,
      labHistoryByPatient: { p1: history, p2: [] },
      notesByPatient: { p1: { fecha: '19/07/2026' } },
    }
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'p1');
  assert.equal(rows[0].primaryCta, 'cultivos');
  assert.match(rows[0].hint, /3/);
});
