import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePipeHeader, parseFichaIdentificacion, mergeHeader } from './parse-header.mjs';

test('parsePipeHeader', () => {
  const h = parsePipeHeader([
    '214-4 | PRUEBA FICTICIO SINTETICO | 64 AÑOS | 8100006-2 | CHOQUE SÉPTICO',
  ]);
  assert.equal(h?.registro, '8100006-2');
  assert.equal(h?.edad, '64');
  assert.equal(h?.cama, '214-4');
});

test('parsePipeHeader accepts double pipe separators', () => {
  const h = parsePipeHeader([
    '204-3 || SIMULADO GENERICO SUPUESTO CASOAE || 32 AÑOS || 9000004-8 || ERC KDIGO5',
  ]);
  assert.equal(h?.registro, '9000004-8');
  assert.equal(h?.nombre, 'SIMULADO GENERICO SUPUESTO CASOAE');
  assert.equal(h?.cama, '204-3');
});

test('parsePipeHeader accepts name-first line without cama', () => {
  const h = parsePipeHeader([
    'NOMBRE SINTETICO DOS | 27 | 8100013-7 | ERC KDIGO 5 AGUDIZADA',
  ]);
  assert.equal(h?.nombre, 'NOMBRE SINTETICO DOS');
  assert.equal(h?.edad, '27');
  assert.equal(h?.registro, '8100013-7');
  assert.equal(h?.cama, '');
});

test('parsePipeHeader accepts numeric cama without hyphen', () => {
  const h = parsePipeHeader(['213 || NOMBRE SINTETICO TRES || 20 AÑOS || 8100025-7 || LLA']);
  assert.equal(h?.cama, '213');
  assert.equal(h?.nombre, 'NOMBRE SINTETICO TRES');
  assert.equal(h?.edad, '20');
});

test('parsePipeHeader accepts age without AÑOS suffix', () => {
  const h = parsePipeHeader([
    '433-5 || NOMBRE SINTETICO CUATRO || 48 || 8100009-3 || ISQUEMIA MIOCARDICA',
  ]);
  assert.equal(h?.cama, '433-5');
  assert.equal(h?.edad, '48');
  assert.equal(h?.registro, '8100009-3');
});

test('parseFichaIdentificacion maps fields and sexo', () => {
  const f = parseFichaIdentificacion(
    ['NOMBRE: MUESTRA PRUEBA', 'SEXO: MASCULINO', 'ORIGEN: DOCTOR ARROYO'].join('\n'),
  );
  assert.equal(f.identificacion.nombre, 'MUESTRA PRUEBA');
  assert.equal(f.sexo, 'M');
  assert.equal(f.identificacion.lugarNacimiento, 'DOCTOR ARROYO');
});

test('mergeHeader prefers ficha nombre over pipe', () => {
  const pipe = parsePipeHeader(['214-4 | SHORT | 64 AÑOS | 1-2 | DX']);
  const ficha = parseFichaIdentificacion('NOMBRE: SINTETICO EJEMPLO B');
  const m = mergeHeader(pipe, ficha);
  assert.equal(m.nombre, 'SINTETICO EJEMPLO B');
});
