import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_LAB_MUTATION_MAX_BYTES,
  slimLabSetForCloud,
  fitLabSetToQuota,
  sanitizeOpsForCloudPush,
  utf8JsonBytes,
  CLOUD_LAB_SET_ALLOWLIST,
} from './cloud-op-slim.mjs';

describe('slimLabSetForCloud', () => {
  it('keeps parsed fields only (no raw SOME sourceText)', () => {
    const slim = slimLabSetForCloud({
      id: 'lab-1',
      fecha: '03/08/2026',
      hora: '08:30',
      resLabs: ['BH\tHb 12'],
      bhExtras: { leu: '7' },
      sourceText: 'Informe SOME texto completo',
      textoBruto: 'bruto',
      parsedBySection: { BH: { Hb: '12' } },
      pdfBase64: 'JVBERi0x',
    });
    assert.deepEqual(Object.keys(slim).sort(), ['bhExtras', 'fecha', 'hora', 'id', 'resLabs']);
    assert.equal(slim.sourceText, undefined);
    assert.equal(slim.parsedBySection, undefined);
    assert.deepEqual(slim.resLabs, ['BH\tHb 12']);
    assert.equal(CLOUD_LAB_SET_ALLOWLIST.includes('sourceText'), false);
  });
});

describe('fitLabSetToQuota', () => {
  it('trims resLabs lines when parsed payload is still too large', () => {
    const fitted = fitLabSetToQuota({
      id: 'big',
      resLabs: ['BH\t' + 'Hb 8 '.repeat(80_000), 'QS\tNa 140'],
    });
    assert.ok(fitted);
    assert.ok(utf8JsonBytes(fitted) <= CLOUD_LAB_MUTATION_MAX_BYTES);
    assert.ok(Array.isArray(fitted.resLabs));
    assert.ok(fitted.resLabs.length >= 1);
    assert.equal(fitted.sourceText, undefined);
  });
});

describe('sanitizeOpsForCloudPush', () => {
  it('keeps parsed lab ops and drops impossible fat blobs', () => {
    const { ops, dropped } = sanitizeOpsForCloudPush([
      {
        path: 'labSidecars/p1/ok',
        value: { id: 'ok', resLabs: ['Hb 12'], sourceText: 'ignored raw' },
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
    assert.ok(lab?.value?.resLabs);
    assert.equal(lab?.value?.sourceText, undefined);
    assert.ok(utf8JsonBytes(lab.value) <= CLOUD_LAB_MUTATION_MAX_BYTES);
    assert.ok(ops.some((op) => op.path === 'entries/p1/note'));
  });
});
