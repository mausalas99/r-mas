import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  pickConfirmedEstadoClinico,
  buildEaIndicacionesClipboardLines,
  pruneEmptyIndicacionesLines,
  buildEaIndicacionesClipboardText,
  hasEaIndicacionesClipboardContent,
} = await import('./ea-indicaciones-clipboard.mjs');

test('pickConfirmedEstadoClinico drops unconfirmed pending meds', () => {
  var ec = pickConfirmedEstadoClinico({
    estadoClinico: {
      abx: 'MEROPENEM 1G IV C/8H',
      analgesia: 'KETOROLACO 30MG IV C/8H',
    },
    pendienteReceta: {
      abx: 'MEROPENEM 1G IV C/8H',
      analgesia: 'PROPUESTA ANALGESIA',
    },
    confirmado: { analgesia: true },
  });
  assert.match(String(ec.analgesia), /KETOROLACO/i);
  assert.equal(ec.abx, undefined);
});

test('buildEaIndicacionesClipboardText includes confirmed meds + bomba', () => {
  var text = buildEaIndicacionesClipboardText({
    estadoClinico: {
      abx: 'PIPERACILINA/TAZOBACTAM 4.5G IV C/6H',
      nm: 'OMEPRAZOL 40MG IV C/24H | INSULINA GLARGINA 20UI SC C/24H',
      dieta: 'BLANDA',
      kcalKg: '25',
      kcal: '1800',
    },
    confirmado: { abx: true, nm: true, dieta: true },
    bombaInsulinaAlgoritmo: 2,
  });
  assert.match(text, /ANTIBIOTICOTERAPIA:.*PIPERACILINA/i);
  assert.match(text, /OMEPRAZOL/i);
  assert.match(text, /BOMBA DE INSULINA EN ALGORITMO 2/i);
  assert.match(text, /DIETA BLANDA/i);
  assert.doesNotMatch(text, /^VASOPRESORES:\s*$/m);
});

test('pruneEmptyIndicacionesLines removes blank labels', () => {
  var pruned = pruneEmptyIndicacionesLines([
    'ANALGESIA: KETOROLACO',
    'VASOPRESORES: ',
    'NM: DIETA AYUNO',
  ]);
  assert.deepEqual(pruned, ['ANALGESIA: KETOROLACO', 'NM: DIETA AYUNO']);
});

test('hasEaIndicacionesClipboardContent', () => {
  assert.equal(hasEaIndicacionesClipboardContent({ estadoClinico: {} }), false);
  assert.equal(
    hasEaIndicacionesClipboardContent({
      estadoClinico: { abx: 'CIPROFLOXACINO' },
      confirmado: { abx: true },
    }),
    true
  );
});

test('buildEaIndicacionesClipboardLines keeps structure', () => {
  var lines = buildEaIndicacionesClipboardLines(
    { analgesia: 'PARACETAMOL 1G IV C/8H | ONDANSETRON 8MG IV C/8H', abx: 'CEFTRIAXONA' },
    null
  );
  assert.ok(lines.some((l) => /ANALGESIA:.*PARACETAMOL/i.test(l)));
  assert.ok(lines.some((l) => /ANTIEMETICOS:.*ONDANSETRON/i.test(l)));
  assert.ok(lines.some((l) => /ANTIBIOTICOTERAPIA:.*CEFTRIAXONA/i.test(l)));
});
