import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCultivosForCenso } from './censo-cultivo-format.mjs';

test('formatCultivosForCenso condensa sitio, organismo, ATB y cuenta en una sola línea', () => {
  var chunk = [
    'LIQUIDO PERITONEAL 07/05: PSEUDOMONAS AERUGINOSA',
    'ATB R: CAZ | I: FEP | S: CIPRO, IMI, LVX, MERO, PIP/TAZO, TOBRA',
    'Cuenta: +100 UFC',
  ].join('\n');
  var history = [
    {
      id: 'set-1',
      fecha: '07/05/2026',
      hora: '',
      resLabs: [chunk],
    },
  ];
  var out = formatCultivosForCenso(history);
  assert.match(out, /^LIQ PERIT 07\/05: P\. aeruginosa/);
  assert.doesNotMatch(out, /07\/05\/2026/);
  assert.doesNotMatch(out, /PSEUDOMONAS AERUGINOSA/);
  assert.match(out, /ATB R: CAZ \| I: FEP \| S: CIPRO, IMI, LVX, MERO, PIP\/TAZO, TOBRA/);
  assert.match(out, /Cuenta: \+100 UFC/);
  assert.equal(out.split('\n').length, 1);
});

test('formatCultivosForCenso detecta cultivo por encabezado de sitio en mayúsculas', () => {
  var chunk = [
    'LIQUIDO PERITONEAL 07/05: PSEUDOMONAS AERUGINOSA',
    'ATB R: CAZ',
    'Cuenta: +100 UFC',
  ].join('\n');
  var history = [
    {
      id: 'set-caps',
      fecha: '07/05/2026',
      hora: '',
      resLabs: [chunk],
    },
  ];
  var out = formatCultivosForCenso(history);
  assert.match(out, /LIQ PERIT 07\/05: P\. aeruginosa/);
});
