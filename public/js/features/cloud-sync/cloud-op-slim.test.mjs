import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_LAB_MUTATION_MAX_BYTES,
  CLOUD_MONITOREO_MAX_BYTES,
  slimLabSetForCloud,
  fitLabSetToQuota,
  fitMonitoreoToQuota,
  sanitizeOpsForCloudPush,
  slimCloudOp,
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

describe('fitMonitoreoToQuota', () => {
  it('drops oldest historial rows, keeps newest, when monitoreo is too large', () => {
    const historial = Array.from({ length: 200 }, (_, i) => ({
      id: `m-${i}`,
      recordedAt: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      tas: 120,
      tad: 80,
      fc: 76,
      fr: 18,
      temp: 36.5,
      sat: 96,
      notas: 'x'.repeat(1200),
    }));
    const fitted = fitMonitoreoToQuota({ historial }, CLOUD_MONITOREO_MAX_BYTES);
    assert.ok(fitted);
    assert.ok(utf8JsonBytes(fitted) <= CLOUD_MONITOREO_MAX_BYTES);
    assert.ok(fitted.historial.length >= 1);
    assert.ok(fitted.historial.length < historial.length);
    assert.equal(fitted.historial[fitted.historial.length - 1].id, 'm-199');
  });

  it('returns the value unchanged when it already fits', () => {
    const value = { historial: [{ id: 'm-1', tas: 120 }] };
    assert.equal(fitMonitoreoToQuota(value, CLOUD_MONITOREO_MAX_BYTES), value);
  });

  it('drops the op only when even an empty historial cannot fit', () => {
    const value = { historial: [{ id: 'm-1' }], textoGuardado: 'x'.repeat(1_000_000) };
    assert.equal(fitMonitoreoToQuota(value, 400), null);
  });
});

describe('slimCloudOp for monitoreo paths', () => {
  it('shrinks an oversized monitoreo push instead of dropping it whole', () => {
    const historial = Array.from({ length: 200 }, (_, i) => ({
      id: `m-${i}`,
      recordedAt: `2026-08-01T00:00:${String(i % 60).padStart(2, '0')}.000Z`,
      notas: 'x'.repeat(1200),
    }));
    const slimmed = slimCloudOp({
      path: 'entries/p1/monitoreo',
      value: { historial },
      updatedAt: 't',
      actorId: 'a',
    });
    assert.ok(slimmed);
    assert.ok(utf8JsonBytes(slimmed.value) <= CLOUD_MONITOREO_MAX_BYTES);
    assert.ok(slimmed.value.historial.length < historial.length);
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

  it('shrinks an oversized monitoreo push instead of dropping vitals silently', () => {
    const historial = Array.from({ length: 200 }, (_, i) => ({
      id: `m-${i}`,
      recordedAt: `2026-08-01T00:00:${String(i % 60).padStart(2, '0')}.000Z`,
      notas: 'x'.repeat(1200),
    }));
    const { ops, dropped } = sanitizeOpsForCloudPush([
      {
        path: 'entries/p1/monitoreo',
        value: { historial },
        updatedAt: 't',
        actorId: 'a',
      },
    ]);
    assert.equal(dropped, 0);
    assert.equal(ops.length, 1);
    assert.ok(ops[0].value.historial.length < historial.length);
    assert.ok(ops[0].value.historial.length >= 1);
  });
});
