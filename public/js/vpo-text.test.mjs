import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVpoFullCopyText } from './vpo-text.mjs';

test('buildVpoFullCopyText orden institucional', () => {
  var t = buildVpoFullCopyText({
    ekgBlock: 'EKG',
    rxBlock: 'RX',
    diagnosticosBlock: 'DX',
    valoracionBlock: 'SE REALIZA VALORACIÓN PREOPERATORIA.\nLEE: 0',
  });
  assert.ok(t.indexOf('EKG') < t.indexOf('RX'));
  assert.ok(t.indexOf('RX') < t.indexOf('DX'));
  assert.ok(t.indexOf('VALORACIÓN') > t.indexOf('DX'));
});
