import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { markHistoriaPendingLanSync } from './historia-clinica-lan-sync.mjs';

describe('markHistoriaPendingLanSync', () => {
  it('stores pending flags and replay metadata on patient', () => {
    const patient = {
      id: 'p1',
      historiaClinica: { version: 2, data: { motivoConsulta: 'dolor' } },
    };
    markHistoriaPendingLanSync(patient, {
      expectedVersion: 1,
      baseData: { motivoConsulta: '' },
      changedKeys: ['motivoConsulta', 'padecimientoActual'],
      source: 'drive-import',
    });
    assert.equal(patient.historiaClinica.pendingLanSync, true);
    assert.deepEqual(patient.historiaClinica.lanSyncPending.changedKeys, [
      'motivoConsulta',
      'padecimientoActual',
    ]);
    assert.equal(patient.historiaClinica.lanSyncPending.expectedVersion, 1);
    assert.equal(patient.historiaClinica.lanSyncPending.source, 'drive-import');
  });
});
