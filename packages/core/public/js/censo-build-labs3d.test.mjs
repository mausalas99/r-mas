import test from 'node:test';
import assert from 'node:assert/strict';
import { labs3DiasText } from './censo-build.mjs';

const set = (fecha, hb, na) => ({ fecha, hora: '08:00', parsedBySection: { BH: { Hb: hb }, ESC: { Na: na } } });

test('labs3DiasText: secciones, un analito por línea, 3 valores, * en alterados', () => {
  const hist = [set('01/01/2026', '9.0', '140'), set('02/01/2026', '8.5', '150'), set('03/01/2026', '9.07', '141'), set('04/01/2026', '13', '140')];
  const out = labs3DiasText('p1', () => hist).split('\n');
  assert.equal(out[0], 'Biometría (BH)');
  assert.equal(out[1], 'Hb  8.5* · 9.07* · 13');
  assert.equal(out[2], 'Electrolitos (ESC)');
  assert.equal(out[3], 'Sodio  150* · 141 · 140');
});

test('labs3DiasText: EGO texto (NEG, pH marcado) sale en 3 días', () => {
  const ego = (fecha, body) => ({ fecha, hora: '08:00', resLabs: [body], parsedBySection: {} });
  const hist = [ego('01/01/2026', 'EGO:\n  AMARILLO  pH 5.0*\n  Prot NEG\n  Leu 0-2'), ego('02/01/2026', 'EGO:\n  AMARILLO  pH 6.0\n  Prot 30*\n  Leu 0-2')];
  const out = labs3DiasText('p1', () => hist);
  assert.ok(out.includes('Color  AMARILLO · AMARILLO'), out);
  assert.ok(out.includes('pH  5.0* · 6.0'), out);
  assert.ok(out.includes('Prot  NEG · 30*'), out);
});
