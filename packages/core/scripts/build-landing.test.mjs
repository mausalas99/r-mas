import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNotes, renderNotes } from './build-landing.mjs';

const NOTES = `R+ 9.9.9 (estable)
=====

Fecha: 2030-01-02

## Resumen

Labs nuevos. Las tablas de SOME se leen mejor.

Segundo párrafo que no sale.

## Nuevo / mejorado

- **Nuevo (Laboratorio):** diseño nuevo. Las tablas de SOME se leen mejor.
- **Arreglado (labs):** la bomba se detecta cuando SOME la manda así.
- **Nuevo:** usa \`<b>\` y <script>.

## Instalación

- Mac: \`R+-9.9.9.dmg\`
`;

test('parseNotes: date, first summary paragraph, bullets; drops lab-system sentences and install', () => {
  const n = parseNotes(NOTES, '9.9.9');
  assert.equal(n.date, '2030-01-02');
  assert.equal(n.summary, 'Labs nuevos.');
  assert.deepEqual(n.items, ['**Nuevo (Laboratorio):** diseño nuevo.', '**Nuevo:** usa `<b>` y <script>.']);
});

test('renderNotes escapes HTML and keeps bold and code', () => {
  const html = renderNotes([parseNotes(NOTES, '9.9.9')]);
  assert.match(html, /<strong>Nuevo:<\/strong> usa <code>&lt;b&gt;<\/code> y &lt;script&gt;\./);
  assert.match(html, /id="v9\.9\.9"/);
  assert.doesNotMatch(html, /SOME|Instalación/);
});
