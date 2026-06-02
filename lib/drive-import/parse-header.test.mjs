import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePipeHeader, parseFichaIdentificacion, mergeHeader } from './parse-header.mjs';

test('parsePipeHeader', () => {
  const h = parsePipeHeader([
    '214-4 | VÍCTOR IRACHETA TORRES | 64 AÑOS | 1123383-2 | CHOQUE SÉPTICO',
  ]);
  assert.equal(h?.registro, '1123383-2');
  assert.equal(h?.edad, '64');
  assert.equal(h?.cama, '214-4');
});

test('parseFichaIdentificacion maps fields and sexo', () => {
  const f = parseFichaIdentificacion(
    ['NOMBRE: VÍCTOR IRACHETA', 'SEXO: MASCULINO', 'ORIGEN: DOCTOR ARROYO'].join('\n'),
  );
  assert.equal(f.identificacion.nombre, 'VÍCTOR IRACHETA');
  assert.equal(f.sexo, 'M');
  assert.equal(f.identificacion.lugarNacimiento, 'DOCTOR ARROYO');
});

test('mergeHeader prefers ficha nombre over pipe', () => {
  const pipe = parsePipeHeader(['214-4 | SHORT | 64 AÑOS | 1-2 | DX']);
  const ficha = parseFichaIdentificacion('NOMBRE: FULL NAME');
  const m = mergeHeader(pipe, ficha);
  assert.equal(m.nombre, 'FULL NAME');
});
