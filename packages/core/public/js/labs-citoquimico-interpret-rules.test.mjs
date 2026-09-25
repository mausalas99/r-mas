import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarLcrPhSanity_,
  evaluarPbeAscitis_,
  evaluarPleuralInfeccion_,
  evaluarLcrEtiologia_,
} from './labs-citoquimico-interpret-rules.mjs';

test('evaluarPleuralInfeccion_ — pH exactamente 7.20 ahora dispara la alerta (BTS 2023: <=7.2)', () => {
  const at = evaluarPleuralInfeccion_(7.2, null, null);
  assert.equal(at.length, 1);
  assert.match(at[0], /≤7\.20/);

  const above = evaluarPleuralInfeccion_(7.21, null, null);
  assert.equal(above.length, 0);

  const below = evaluarPleuralInfeccion_(7.1, null, null);
  assert.match(below[0], /≤7\.20/);
});

test('evaluarPleuralInfeccion_ — glucosa y leucocitos, sin cambios', () => {
  assert.match(evaluarPleuralInfeccion_(null, 59, null)[0], /<60 mg\/dL/);
  assert.equal(evaluarPleuralInfeccion_(null, 60, null).length, 0);
  assert.match(evaluarPleuralInfeccion_(null, null, 50000)[0], /≥50k/);
  assert.equal(evaluarPleuralInfeccion_(null, null, null).length, 0);
});

test('evaluarPbeAscitis_ — un Gram que describe células ya no dispara la alerta de infección', () => {
  const alerts = evaluarPbeAscitis_(100, { pmnNum: null, pmnPct: null, predominant: false }, 'ABUNDANTES LEUCOCITOS');
  assert.equal(alerts.length, 0);
});

test('evaluarPbeAscitis_ — un Gram realmente positivo sigue disparando', () => {
  const alerts = evaluarPbeAscitis_(
    100,
    { pmnNum: null, pmnPct: null, predominant: false },
    'COCOS GRAM POSITIVOS'
  );
  assert.match(alerts.join(' '), /infección bacteriana/i);
});

test('evaluarLcrPhSanity_ — límites', () => {
  assert.equal(evaluarLcrPhSanity_(7.35), '');
  assert.match(evaluarLcrPhSanity_(7.2), /fuera de rango/);
  assert.equal(evaluarLcrPhSanity_(null), '');
});

test('evaluarLcrEtiologia_ — normocelular no alerta', () => {
  assert.deepEqual(evaluarLcrEtiologia_(2, 60, 30, 'NEGATIVO', 'NEGATIVO', 90), []);
});
