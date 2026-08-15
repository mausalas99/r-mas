import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPatientSummary, handlePaseLabs } from './pase-labs.js';

// Access internal helpers via named imports — they are not exported, so we test
// buildPatientSummary (exported) and verify sorting / field extraction.

describe('buildPatientSummary', () => {
  it('pulls nombre/cama/expediente from fields', () => {
    const entry = {
      id: 'p1',
      fields: { nombre: 'JUAN PEREZ', cama: '202-1', registro: '1234567-8' },
    };
    const result = buildPatientSummary(entry, {});
    assert.equal(result.nombre, 'JUAN PEREZ');
    assert.equal(result.cama, '202-1');
    assert.equal(result.expediente, '1234567-8');
    assert.deepEqual(result.labs, []);
  });

  it('falls back to top-level entry fields when fields is absent', () => {
    const entry = { id: 'p2', nombre: 'ANA GOMEZ', cama: '101', registro: 'NC' };
    const result = buildPatientSummary(entry, {});
    assert.equal(result.nombre, 'ANA GOMEZ');
    assert.equal(result.expediente, 'NC');
  });

  it('sorts labs newest-first by fecha', () => {
    const older = { id: 'lab-1700000000000', fecha: '12/08', hora: '08:00', resLabs: ['BH Hb 11'] };
    const newer = { id: 'lab-1700100000000', fecha: '13/08', hora: '10:00', resLabs: ['BH Hb 12'] };
    const result = buildPatientSummary({ id: 'p3', fields: {} }, { s1: older, s2: newer });
    assert.equal(result.labs[0], newer, 'newer draw should be first');
    assert.equal(result.labs[1], older);
  });

  it('includes all draws for the same day (no 2-set cap)', () => {
    const a = { fecha: '14/08', hora: '06:00', resLabs: ['BH Hb 10'] };
    const b = { fecha: '14/08', hora: '12:00', resLabs: ['BH Hb 11'] };
    const c = { fecha: '14/08', hora: '20:00', resLabs: ['BH Hb 12'] };
    const result = buildPatientSummary({ id: 'p4', fields: {} }, { a, b, c });
    assert.equal(result.labs.length, 3);
  });

  it('skips null/non-object sidecar values', () => {
    const result = buildPatientSummary(
      { id: 'p5', fields: {} },
      { bad: null, also: 'string', ok: { fecha: '13/08', resLabs: [] } }
    );
    assert.equal(result.labs.length, 1);
  });
});

describe('handlePaseLabs CORS', () => {
  it('OPTIONS preflight returns 204 with CORS headers', async () => {
    const req = new Request('https://worker.example.com/api/sync/v1/pase-labs', {
      method: 'OPTIONS',
    });
    const res = await handlePaseLabs(req, {});
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.ok(res.headers.get('Access-Control-Allow-Methods').includes('GET'));
  });
});
