import test from 'node:test';
import assert from 'node:assert/strict';
import { unknownLabRowNames, unknownLabRowsWarning } from './lab-bulk-paste.mjs';
import { DEMO_SOME_LAB_REPORT } from './tour-demo-some-lab.mjs';
import { gas, header, TABLE } from '../../scripts/e2e/some-fixtures.mjs';

const P = { exp: '7300011-1', name: 'DEMO FILAS', room: '811' };
const WHEN = 'Sep 20 2026 8:00AM';

test('unknownLabRowNames — full demo BH/QS report and a gaso panel: no false alarm', () => {
  assert.deepEqual(unknownLabRowNames(DEMO_SOME_LAB_REPORT), []);
  assert.deepEqual(unknownLabRowNames(gas(P, WHEN, '7.30')), []);
});

test('unknownLabRowNames — unknown numeric rows flagged, text rows and known Hb not', () => {
  const text = header(P, WHEN) + 'QUIMICA CLINICA\nQUIMICA SANGUINEA\n' + TABLE +
    'ANALITO 1\t\t*\t<0.01\tmg/dL\t0.5 - 1.5\nANALITO 2\t\t*\tNEGATIVO\tmg/dL\t\nANALITO 3\t\t*\t4.2\tmg/dL\t0.5 - 1.5\n' +
    'HGB\t\tA\t7.9\tg/dL\t12.20 - 18.10\n';
  assert.deepEqual(unknownLabRowNames(text), ['ANALITO 1', 'ANALITO 3']);
  assert.equal(
    unknownLabRowsWarning([{ unknownRowNames: ['A', 'B'] }, { unknownRowNames: ['B', 'C', 'D'] }]),
    '4 filas no reconocidas no se guardaron: A, B, C…'
  );
  assert.equal(unknownLabRowsWarning([{ unknownRowNames: [] }]), null);
});

test('«<» / «>» values keep the sign on screen, chart with the number, skip derived eTFG', async () => {
  const { procesarLabs } = await import('./labs.js');
  const { buildParsedBySectionFromResLabs } = await import('./features/diagrams-parse.mjs');
  const text = header(P, WHEN) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    'HGB\t\tA\t<0.01\tg/dL\t12.20 - 18.10\n' +
    'QUIMICA CLINICA\nQUIMICA SANGUINEA\n' + TABLE + 'CREATININA\t\t*\t> 1000\tmg/dL\t0.7 - 1.2\n';
  const r = procesarLabs(text, { patient: { sexo: 'M', edad: 50 } });
  const out = r.resLabs.join('\n');
  assert.match(out, /Hb <0\.01\*/);
  assert.match(out, /Cr >1000\*/);
  assert.doesNotMatch(out, /eTFG/);
  const pb = buildParsedBySectionFromResLabs(r.resLabs, r.bhExtras);
  assert.equal(pb.QS.Cr, 1000);
  assert.equal(pb.BH.Hb, 0.01);
});
