import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROTACION_PENDING, salaPickerOptionsHtml, salaPickerRotacionHtml } from './sala-picker.mjs';

test('folds the three rotation salas into one «Otra rotación» option', () => {
  const html = salaPickerOptionsHtml('');
  assert.ok(html.includes('>Sala 1<'));
  assert.ok(!html.includes('UCI'));
  assert.match(html, new RegExp(`value="${ROTACION_PENDING}" data-rotacion >Otra rotación \\(fuera de MI\\)`));
  assert.match(salaPickerRotacionHtml(''), /data-rotacion-pick hidden/);
});

test('prefills a rotation sala: option carries the canonical value, pill pressed, hint shown', () => {
  assert.match(salaPickerOptionsHtml('PostQx'), /value="PostQx" data-rotacion selected/);
  const pills = salaPickerRotacionHtml('PostQx');
  assert.doesNotMatch(pills, /data-rotacion-pick hidden/);
  assert.match(pills, /data-rotacion-sala="PostQx" aria-pressed="true">PostQx</);
  assert.match(pills, /data-rotacion-sala="UCI" aria-pressed="false">UCI</);
  assert.match(pills, /aria-pressed="false">Subespecialidad</);
  assert.ok(pills.includes('¿En qué servicio? *'));
  assert.ok(pills.includes('Tu sala Nube será PostQx.'));
});
