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
  it('drops non-SOME paste and keeps parsed fields', () => {
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
  });

  it('sends SOME sourceText so peers re-parse locally', () => {
    const some =
      'Expediente: 1\nNombre: Ana\nFecha Registro: 03/08/2026 08:00\nHEMATOLOGÍA\n';
    const slim = slimLabSetForCloud({
      id: 'lab-1',
      fecha: '03/08/2026',
      hora: '08:30',
      resLabs: ['BH\tHb 12'],
      sourceText: some,
    });
    assert.equal(slim.sourceText, some);
    assert.deepEqual(slim.resLabs, ['BH\tHb 12']);
    assert.equal(CLOUD_LAB_SET_ALLOWLIST.includes('sourceText'), true);
  });
});

describe('fitLabSetToQuota', () => {
  it('trims resLabs lines when parsed payload is still too large', () => {
    const bigLines = Array.from(
      { length: 30 },
      (_, i) => `BH${i}\t` + 'Hb 8 '.repeat(2_000)
    );
    const fitted = fitLabSetToQuota({ id: 'big', resLabs: bigLines });
    assert.ok(fitted);
    assert.ok(utf8JsonBytes(fitted) <= CLOUD_LAB_MUTATION_MAX_BYTES);
    assert.ok(Array.isArray(fitted.resLabs));
    assert.ok(fitted.resLabs.length >= 1);
    assert.ok(fitted.resLabs.length < bigLines.length);
    assert.equal(fitted.sourceText, undefined);
  });

  it('keeps SOME and drops resLabs when the pair exceeds quota', () => {
    const some =
      'Expediente: 1\nNombre: Ana\nFecha Registro: 03/08/2026 08:00\nHEMATOLOGÍA\n';
    const fitted = fitLabSetToQuota(
      {
        id: 'x',
        sourceText: some,
        resLabs: ['BH\t' + 'Hb 8 '.repeat(400)],
      },
      400
    );
    assert.ok(fitted);
    assert.equal(fitted.sourceText, some);
    assert.equal(fitted.resLabs, undefined);
    assert.ok(utf8JsonBytes(fitted) <= 400);
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
