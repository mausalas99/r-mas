import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_LAB_MUTATION_MAX_BYTES,
  slimLabSetForCloud,
  fitLabSetToQuota,
  sanitizeOpsForCloudPush,
  utf8JsonBytes,
} from './cloud-op-slim.mjs';

describe('slimLabSetForCloud', () => {
  it('drops PDF artifacts and keeps sourceText + resLabs', () => {
    const slim = slimLabSetForCloud({
      id: 'lab-1',
      fecha: '03/08/2026',
      resLabs: ['BH\tHb 12'],
      sourceText: 'Informe SOME texto',
      pdfBase64: 'JVBERi0x',
      pdfData: 'AAA',
    });
    assert.equal(slim.id, 'lab-1');
    assert.equal(slim.sourceText, 'Informe SOME texto');
    assert.deepEqual(slim.resLabs, ['BH\tHb 12']);
    assert.equal(slim.pdfBase64, undefined);
    assert.equal(slim.pdfData, undefined);
  });
});

describe('fitLabSetToQuota', () => {
  it('truncates oversized sourceText so the set fits', () => {
    const fitted = fitLabSetToQuota({
      id: 'big',
      resLabs: ['BH\tHb 8'],
      sourceText: 'Z'.repeat(600_000),
    });
    assert.ok(fitted);
    assert.ok(utf8JsonBytes(fitted) <= CLOUD_LAB_MUTATION_MAX_BYTES);
    assert.ok(String(fitted.sourceText || '').length > 0);
    assert.ok(String(fitted.sourceText).length < 600_000);
    assert.deepEqual(fitted.resLabs, ['BH\tHb 8']);
  });
});

describe('sanitizeOpsForCloudPush', () => {
  it('keeps truncated text labs and drops impossible fat blobs', () => {
    const { ops, dropped } = sanitizeOpsForCloudPush([
      {
        path: 'labSidecars/p1/ok',
        value: { id: 'ok', resLabs: ['Hb 12'], sourceText: 'B'.repeat(700_000) },
        updatedAt: 't',
        actorId: 'a',
      },
      {
        path: 'labSidecars/p1/fat',
        value: { id: 'fat', resLabs: ['x'.repeat(600_000)] },
        updatedAt: 't',
        actorId: 'a',
      },
      {
        path: 'entries/p1/note',
        value: { texto: 'ok' },
        updatedAt: 't',
        actorId: 'a',
      },
    ]);
    assert.equal(ops.length, 2);
    assert.equal(dropped, 1);
    const lab = ops.find((op) => op.path === 'labSidecars/p1/ok');
    assert.ok(lab?.value?.sourceText);
    assert.ok(utf8JsonBytes(lab.value) <= CLOUD_LAB_MUTATION_MAX_BYTES);
    assert.ok(ops.some((op) => op.path === 'entries/p1/note'));
  });
});
