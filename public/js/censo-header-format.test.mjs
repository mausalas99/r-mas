import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCensoSalaTitleLine,
  formatCensoEquipoLine,
  resolveCensoFimiLabel,
} from './censo-header-format.mjs';

test('formatCensoSalaTitleLine siempre Censo (HF es el único servicio)', () => {
  assert.equal(formatCensoSalaTitleLine({}), 'Censo');
  assert.equal(formatCensoSalaTitleLine({ censoSala: '2' }), 'Censo');
});

test('resolveCensoFimiLabel personalizable', () => {
  assert.equal(resolveCensoFimiLabel({}), 'FIMI');
  assert.equal(resolveCensoFimiLabel({ censoFimiLabel: '  CIRUGÍA  ' }), 'CIRUGÍA');
});

test('formatCensoEquipoLine solo nombres', () => {
  var line = formatCensoEquipoLine({
    residenteR2: 'Ana R2',
    residenteR1a: 'Luis R1',
    residenteR1b: 'Mar R1',
    profesorName: 'Dr. Maestro',
  });
  assert.equal(line, 'Ana R2 · Luis R1 · Mar R1 · Dr. Maestro');
  assert.doesNotMatch(line, /R2:/);
});

test('formatCensoEquipoLine usa censoEquipo/censoJefe flat cuando existen', () => {
  var line = formatCensoEquipoLine({
    censoEquipo: 'Ana\nLuis\nMar',
    censoJefe: 'Dr. Jefe',
    residenteR2: 'legacy no usado',
  });
  assert.equal(line, 'Ana · Luis · Mar · Dr. Jefe');
});
