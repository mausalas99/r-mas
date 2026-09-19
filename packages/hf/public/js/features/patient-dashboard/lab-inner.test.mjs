import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LAB_INNER_SECTIONS, SECTION_LABELS } from '../../expediente-group-row.mjs';
import { labInnerFromGranular, innerAfterLeavingLab } from './lab-inner.mjs';

describe('lab inner sections', () => {
  it('exposes Labs Tendencias Cultivos labels', () => {
    assert.deepEqual(LAB_INNER_SECTIONS, ['labs', 'tend', 'cult']);
    assert.equal(SECTION_LABELS.labs, 'Labs');
    assert.equal(SECTION_LABELS.tend, 'Tendencias');
    assert.equal(SECTION_LABELS.cult, 'Cultivos');
  });

  it('maps granular tend/cult onto lab inner, everything else to Labs', () => {
    assert.equal(labInnerFromGranular('tend'), 'tend');
    assert.equal(labInnerFromGranular('cult'), 'cult');
    assert.equal(labInnerFromGranular('resumen'), 'labs');
    assert.equal(labInnerFromGranular('todo'), 'labs');
    assert.equal(labInnerFromGranular('estadoActual'), 'labs');
  });

  it('does not keep tend/cult as Paciente inner when leaving Laboratorio', () => {
    assert.equal(innerAfterLeavingLab('tend'), 'resumen');
    assert.equal(innerAfterLeavingLab('cult'), 'resumen');
    assert.equal(innerAfterLeavingLab('resumen'), 'resumen');
    assert.equal(innerAfterLeavingLab('estadoActual'), 'estadoActual');
  });
});
