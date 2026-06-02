import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDriveDocument } from './parse-drive-document.mjs';

const FICHA_SAMPLE = [
  '214-4 | VÍCTOR IRACHETA TORRES | 64 AÑOS | 1123383-2 | CHOQUE SÉPTICO',
  'INTERROGATORIO',
  'HISTORIA CLÍNICA',
  'FICHA DE IDENTIFICACIÓN',
  'NOMBRE: VÍCTOR IRACHETA TORRES',
  'SEXO: MASCULINO',
  'ORIGEN: DOCTOR ARROYO',
  'ANTECEDENTES HEREDOFAMILIARES',
  'MADRE: FINADA',
  'ANTECEDENTES PERSONALES NO PATOLÓGICOS',
  'TABAQUISMO: POSITIVO',
  'ANTECEDENTES PERSONALES PATOLÓGICOS',
  'DIABETES MELLITUS TIPO 2',
  'PADECIMIENTO ACTUAL / PEEA',
  'PACIENTE MASCULINO DE 64 AÑOS CON FIEBRE',
  'EVENTUALIDADES EN ESTE INTERNAMIENTO',
  '23/05',
  'SE SUSPENDE PLAN DE LIQUIDOS',
  'EVENTUALIDADES',
  '22/05',
  'SE PASA 250 ML DE HARTMANN',
].join('\n');

test('parseDriveDocument picks ficha profile', () => {
  const r = parseDriveDocument(FICHA_SAMPLE);
  assert.equal(r.profileId, 'drive-ficha-hc-v1');
  assert.equal(r.header.registro, '1123383-2');
  assert.ok(r.eventualidades.entries.length >= 2);
  assert.ok(r.hcPatch.padecimientoActual);
});

test('parseDriveDocument pipe profile for classic HC', () => {
  const text = [
    '215-4| ANDRÉS GARCÍA | 29 AÑOS | 2109946-3 | ANASARCA',
    'MOTIVO DE CONSULTA: DOLOR',
    'HISTORIA CLÍNICA',
    'ORIGEN: MONTERREY',
    'PEEA',
    'NARRATIVA LARGA',
    'EVENTUALIDADES',
    '1/06',
    'NOTA',
  ].join('\n');
  const r = parseDriveDocument(text);
  assert.equal(r.profileId, 'drive-pipe-hc-v1');
  assert.match(r.hcPatch.motivoConsulta || '', /DOLOR/);
});

test('eventos-only for short fragment', () => {
  const text = ['02/06', 'LINEA UNO', '01/06/2026', 'LINEA DOS'].join('\n');
  const r = parseDriveDocument(text, 'drive-eventos-only-v1');
  assert.equal(Object.keys(r.hcPatch).length, 0);
  assert.equal(r.eventualidades.entries.length, 2);
});
