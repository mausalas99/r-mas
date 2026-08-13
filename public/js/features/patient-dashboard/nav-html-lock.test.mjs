import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../partials/layout/app-body.html'),
  'utf8'
);

function buttonBlock(id) {
  const re = new RegExp('<button[^>]*\\sid="' + id + '"[\\s\\S]*?</button>');
  const m = html.match(re);
  assert.ok(m, 'missing #' + id + ' in app-body.html');
  return m[0];
}

test('#apptab-nota visible label includes Paciente, not Expediente', () => {
  const block = buttonBlock('apptab-nota');
  assert.match(block, /<span class="app-tab-label"[^>]*>Paciente<\/span>/);
  assert.doesNotMatch(block, /<span class="app-tab-label"[^>]*>Expediente<\/span>/);
});

test('#itab-paciente aria-label or text is Resumen', () => {
  const block = buttonBlock('itab-paciente');
  assert.match(block, /aria-label="Resumen"|Resumen/);
});

test('#itab-resultados has display:none', () => {
  const block = buttonBlock('itab-resultados');
  assert.match(block, /style="[^"]*display:\s*none/);
});

test('top tabs: apptab-nota appears before apptab-lab', () => {
  const nota = html.indexOf('id="apptab-nota"');
  const lab = html.indexOf('id="apptab-lab"');
  assert.ok(nota >= 0, 'apptab-nota missing');
  assert.ok(lab > nota, 'apptab-nota must appear before apptab-lab');
});
