import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { autoAdmitStubPatientsFromBulkBlocks } = await import('./lab-bulk-stub-admit.mjs');

describe('autoAdmitStubPatientsFromBulkBlocks', () => {
  it('no crea pacientes cuando el bloque ya tiene match', () => {
    var created = autoAdmitStubPatientsFromBulkBlocks([
      {
        status: 'ok',
        okReportCount: 1,
        canProcess: true,
        patient: { id: 'p1', nombre: 'TEST' },
      },
    ]);
    assert.equal(created.length, 0);
  });

  it('no crea sin reportes válidos', () => {
    var created = autoAdmitStubPatientsFromBulkBlocks([
      { status: 'no-patient', okReportCount: 0, canProcess: false, reports: [] },
    ]);
    assert.equal(created.length, 0);
  });
});
