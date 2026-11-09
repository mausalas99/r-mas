import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCensoDocumentHeader, resolveCensoEquipoMembers } from './censo-header-format.mjs';

test('cleared R2 stays cleared; legacy only fills never-saved profiles', () => {
  assert.equal(resolveCensoEquipoMembers({ residenteR2: 'Old', medicosPlantilla: { r2: '' } }).r2, '');
  assert.equal(resolveCensoEquipoMembers({ residenteR2: 'Old', medicosPlantilla: { r2: 'New' } }).r2, 'New');
  assert.equal(resolveCensoEquipoMembers({ residenteR2: 'Old' }).r2, 'Old');
});

test('title follows Mi perfil sala over a stale Documentos pick', () => {
  assert.equal(buildCensoDocumentHeader({ censoSala: '2', clinicalSala: 'Sala E' }).titleLine, 'Censo de Sala E');
  assert.equal(buildCensoDocumentHeader({ censoSala: '2', clinicalSala: 'Torre HU' }).titleLine, 'Censo de Torre HU');
  assert.equal(buildCensoDocumentHeader({ censoSala: '2', clinicalSala: 'Interconsultas' }).titleLine, 'Censo de Sala 2');
  assert.equal(buildCensoDocumentHeader({ censoSala: '1' }).titleLine, 'Censo de Sala 1');
});

test('census profesor comes from the Sala team list, not the note profesor', () => {
  assert.equal(resolveCensoEquipoMembers({ profesorName: 'IC prof', medicosPlantilla: { profesor: '' } }).maestro, '');
  assert.equal(resolveCensoEquipoMembers({ profesorName: 'IC prof', medicosPlantilla: { profesor: 'Sala prof' } }).maestro, 'Sala prof');
});

test('equipoLine order: profesor, R4, R2, R1, R1 (2)', () => {
  const medicosPlantilla = { profesor: 'P', r4: 'A', r2: 'B', r1a: 'C', r1b: 'D' };
  assert.equal(buildCensoDocumentHeader({ medicosPlantilla }).equipoLine, 'P · A · B · C · D');
});
