import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCenso3dModel } from './censo-3dias-data.mjs';

test('buildCenso3dModel: 3 newest days oldest->newest, flags, missing', () => {
  const set = (fecha, hb, pcr) => ({ fecha, hora: '06:00', parsedBySection: { BH: { Hb: hb }, QS: pcr ? { PCR: pcr } : {} } });
  const hist = [set('01/03/2026', '13'), set('02/03/2026', '11.2'), set('03/03/2026', '10.8', '10'), set('04/03/2026', '10.1', '5')];
  const model = buildCenso3dModel([{ id: 'a' }, { id: 'b' }], {
    getHist: (id) => (id === 'a' ? hist : []),
    getVitals: (p) => (p.id === 'a' ? { fc: 104, tas: 132, tad: 80, sat: 96 } : {}),
  });
  const hb = model.labs.find((l) => l.label === 'Hb');
  assert.deepEqual(hb.cells[0].map((c) => c.text), ['11.2', '10.8', '10.1']);
  assert.ok(hb.cells[0].every((c) => c.alt));
  assert.deepEqual(hb.cells[1], []);
  const pcr = model.labs.find((l) => l.label === 'PCR');
  assert.deepEqual(pcr.cells[0], [{ text: '10', alt: true }, { text: '5', alt: false }]);
  const byLabel = Object.fromEntries(model.vitals.map((v) => [v.label, v.cells]));
  assert.deepEqual(byLabel['T/A'][0], { text: '132/80', alt: true });
  assert.deepEqual(byLabel['FC'][0], { text: '104', alt: true });
  assert.deepEqual(byLabel['SatO₂'][0], { text: '96', alt: false });
  assert.deepEqual(byLabel['Temp'][1], { text: '—', alt: false });
});

test('buildCenso3dModel: rows with no data on the page are omitted; section order holds', () => {
  const hist = [{ fecha: '01/03/2026', hora: '06:00', parsedBySection: { PFHS: { Alb: '3.1' }, QS: { Glu: '90' }, BH: { Hb: '12' }, TIR: { TSH: '2.5' } } }];
  const model = buildCenso3dModel([{ id: 'a' }, { id: 'b' }], { getHist: (id) => (id === 'a' ? hist : []), getVitals: () => ({}) });
  assert.deepEqual(model.labs.map((l) => l.label), ['Hb', 'Glucosa', 'Albúmina', 'TSH']);
  assert.equal(model.labs[3].ref, '—');
  assert.equal(model.labs[2].cells[0][0].text, '3.1'); // PFHS key matches catalog PFHs
  const empty = buildCenso3dModel([{ id: 'b' }], { getHist: () => [], getVitals: () => ({}) });
  assert.equal(empty.labs.length, 0);
});
