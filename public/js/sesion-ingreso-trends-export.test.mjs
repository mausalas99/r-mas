import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabTrendsPayload,
  listSelectablePanels,
  registerSesionIngresoTrendsRuntime,
} from './sesion-ingreso-trends-export.mjs';

registerSesionIngresoTrendsRuntime({
  buildCatalog: () => [
    { sectionKey: 'BH', fieldKey: 'Hb', cardTitle: 'Hb' },
    { sectionKey: 'BH', fieldKey: 'Leu', cardTitle: 'Leucocitos' },
    { sectionKey: 'BH', fieldKey: 'Plt', cardTitle: 'Plaquetas' },
  ],
  sectionLabel: (sk) => (sk === 'BH' ? 'Biometría hemática' : sk),
  unitForField: (fk) => (fk === 'Hb' ? 'g/dL' : 'K/µL'),
  getPatientId: () => 'p1',
});

const history = [
  {
    fecha: '20/05/2026',
    hora: '08:00',
    parsedBySection: { BH: { Hb: 10.2, Leu: 11, Plt: 140 } },
  },
  {
    fecha: '22/05/2026',
    hora: '08:00',
    parsedBySection: { BH: { Hb: 11.5, Leu: 9, Plt: 136 } },
  },
];

test('listSelectablePanels returns panel blocks like R+ group charts', () => {
  const panels = listSelectablePanels(history, 'p1');
  assert.ok(panels.length >= 1);
  assert.match(panels[0].id, /^BH:/);
  assert.ok(panels[0].title);
});

test('buildLabTrendsPayload exports shared labels and aligned values', () => {
  const panels = listSelectablePanels(history, 'p1');
  const payload = buildLabTrendsPayload(history, 'ROLR', {
    panelIds: [panels[0].id],
    patientId: 'p1',
  });
  assert.equal(payload.kind, 'lab-trends');
  const group = payload.trends[0].groups[0];
  assert.ok(Array.isArray(group.labels));
  assert.equal(group.labels.length, 2);
  assert.ok(group.series.length >= 1);
  assert.equal(group.series[0].values.length, group.labels.length);
  assert.ok('visible' in group.series[0]);
  assert.ok(group.series[0].color);
});
