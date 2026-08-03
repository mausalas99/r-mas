import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCensoMedsFromReceta } from './censo-meds-format.mjs';

function rescateItem(id, units, min, max) {
  return {
    id: id,
    nombreRaw: 'INSULINA HUMANA RAPIDA',
    viaRaw: 'VIA SUBCUTANEA',
    dosisRaw:
      units +
      ' UI // CRITERIO PRN: EN CASO DE DESTROXTIS ENTRE ' +
      min +
      ' - ' +
      max,
    frecuenciaRaw: 'PRN',
    suspendido: false,
  };
}

test('formatCensoMedsFromReceta solo nombre y día', () => {
  var text = formatCensoMedsFromReceta({
    items: [
      {
        nombreRaw: 'Meropenem 1g',
        viaRaw: 'INTRAVENOSA',
        frecuenciaRaw: 'c/8h',
        dosisRaw: '1 g',
        diaTratamiento: 3,
        suspendido: false,
      },
    ],
  });
  assert.equal(text, 'MEROPENEM · Día 3');
  assert.doesNotMatch(text, /IV|c\/8h|1\s*g/i);
});

test('sin día solo nombre', () => {
  var text = formatCensoMedsFromReceta({
    items: [{ nombreRaw: 'Fenitoína 100mg', suspendido: false }],
  });
  assert.equal(text, 'FENITOÍNA');
});

test('omite suspendidos', () => {
  var text = formatCensoMedsFromReceta({
    items: [{ nombreRaw: 'X', suspendido: true }],
  });
  assert.equal(text, '');
});

test('bloque null devuelve vacío', () => {
  assert.equal(formatCensoMedsFromReceta(null), '');
});

test('agrupa insulinas PRN SC como RESCATES DE INSULINA', () => {
  var text = formatCensoMedsFromReceta({
    items: [
      rescateItem('r1', 2, 140, 180),
      rescateItem('r2', 4, 180, 220),
      rescateItem('r3', 6, 220, 280),
      {
        nombreRaw: 'LOSARTAN 50 MG',
        viaRaw: 'VIA ORAL',
        dosisRaw: '50 MG //',
        frecuenciaRaw: 'CADA 24 HORAS',
        suspendido: false,
      },
    ],
  });
  assert.match(text, /^RESCATES DE INSULINA\nLOSARTAN$/m);
  assert.equal((text.match(/INSULINA HUMANA RAPIDA/gi) || []).length, 0);
  assert.equal((text.match(/RESCATES DE INSULINA/g) || []).length, 1);
});

test('suplemento nutricional sale como DIETA y no como med', () => {
  var text = formatCensoMedsFromReceta({
    items: [
      {
        nombreRaw: 'ALIMENTACION ADULTO SUPLEMENTO 237 ML',
        viaRaw: 'VIA GASTROSTOMIA',
        dosisRaw: '600 ML // DIVIDIDO EN 5 TOMAS (120 CC POR TOMA)',
        frecuenciaRaw: 'CADA 24 HORAS',
        suspendido: false,
      },
      {
        nombreRaw: 'CEFTRIAXONA 1 G SOL INY 10 ML',
        viaRaw: 'VIA INTRAVENOSA',
        dosisRaw: '1 G // *DIA# 6*',
        frecuenciaRaw: 'CADA 12 HORAS',
        diaTratamiento: 6,
        suspendido: false,
      },
    ],
  });
  assert.match(text, /^DIETA SUPLEMENTO\nCEFTRIAXONA · Día 6$/);
  assert.doesNotMatch(text, /ALIMENTACION/i);
});

test('dietas SOME también aparecen como DIETA', () => {
  var text = formatCensoMedsFromReceta({
    items: [{ nombreRaw: 'ATORVASTATINA 40 MG', suspendido: false }],
    dietas: [{ descripcionRaw: 'SUPLEMENTO', suspendido: false }],
  });
  assert.match(text, /^DIETA SUPLEMENTO\nATORVASTATINA$/);
});
