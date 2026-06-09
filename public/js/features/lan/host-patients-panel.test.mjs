import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { annotateLanHostPatientRows } from './host-patients-annotate.mjs';

describe('annotateLanHostPatientRows', () => {
  it('marks host-only rows as ghost', () => {
    const out = annotateLanHostPatientRows(
      [{ id: 'h1', nombre: 'Host only', registro: 'R1' }],
      [{ id: 'l1', nombre: 'Local', registro: 'R2' }]
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].status, 'ghost');
  });

  it('marks rows present locally as local', () => {
    const out = annotateLanHostPatientRows(
      [{ id: 'p1', nombre: 'Shared', registro: 'R9' }],
      [{ id: 'p1', nombre: 'Shared', registro: 'R9' }]
    );
    assert.equal(out[0].status, 'local');
  });
});
