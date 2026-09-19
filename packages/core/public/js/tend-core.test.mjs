import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeTrendSetsForSeries, buildTrendAxisMeta, classifyTendPanelFamily, familyOrderForSection, migratePanelFamilyKey, formatTendSeriesLabel, parseTrendNumeric, formatTrendColumnHeader, buildSectionTableModel } from './tend-core.mjs';

function mockSet(fecha, hora, sectionKey, fieldKey, val) {
  return {
    fecha,
    hora,
    parsedBySection: {
      [sectionKey]: { [fieldKey]: { val: String(val), ab: false } }
    }
  };
}

test('dedupe: mismo día distinta hora → dos sets', () => {
  const sets = [
    mockSet('18/05/2026', '03:24', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '14:00', 'BH', 'Hb', 11.5)
  ];
  const out = dedupeTrendSetsForSeries(sets, 'BH', 'Hb');
  assert.equal(out.length, 2);
});

test('dedupe: misma fecha hora y valor → uno', () => {
  const sets = [
    mockSet('18/05/2026', '03:24', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '03:24', 'BH', 'Hb', 12)
  ];
  const out = dedupeTrendSetsForSeries(sets, 'BH', 'Hb');
  assert.equal(out.length, 1);
});

test('buildTrendAxisMeta: mismo día → x distintos', () => {
  const sets = [
    mockSet('18/05/2026', '03:24', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '14:00', 'BH', 'Hb', 11.5)
  ];
  const meta = buildTrendAxisMeta(sets);
  assert.equal(meta.points.length, 2);
  assert.notEqual(meta.points[0].x, meta.points[1].x);
  assert.match(meta.points[0].dayLabel, /18\/05/);
});

test('classifyTendPanelFamily: gases y QS genérico', () => {
  assert.equal(classifyTendPanelFamily('GASES', 'pH', '%'), 'gases');
  assert.equal(classifyTendPanelFamily('QS', 'Glu', 'mg/dL'), 'absolute');
});

test('classifyTendPanelFamily: LCR/Liq porcentajes van al panel de valores absolutos', () => {
  assert.equal(classifyTendPanelFamily('LCR', 'PMN', '%'), 'absolute');
  assert.equal(classifyTendPanelFamily('LCR', 'Linf', '%'), 'absolute');
  assert.equal(classifyTendPanelFamily('Liq', 'PMN', '%'), 'absolute');
});

test('classifyTendPanelFamily: BH en 4 paneles', () => {
  assert.equal(classifyTendPanelFamily('BH', 'Hb', 'g/dL'), 'bh-absolute');
  assert.equal(classifyTendPanelFamily('BH', 'Neu', 'K/μL'), 'bh-absolute');
  assert.equal(classifyTendPanelFamily('BH', 'Leu', 'K/μL'), 'bh-absolute');
  assert.equal(classifyTendPanelFamily('BH', 'Plt', 'K/μL'), 'bh-absolute');
  assert.equal(classifyTendPanelFamily('BH', 'RDW', '%'), 'bh-quality');
  assert.equal(classifyTendPanelFamily('BH', 'VCM', 'fL'), 'bh-quality');
  assert.equal(classifyTendPanelFamily('BH', 'CHCM', 'g/dL'), 'bh-quality');
  assert.equal(classifyTendPanelFamily('BH', 'Hto', '%'), 'bh-quality');
  assert.equal(classifyTendPanelFamily('BH', 'NeuPct', '%'), 'bh-diff-manual');
  assert.equal(classifyTendPanelFamily('BH', 'Bandas', '%'), 'bh-diff-manual');
  assert.equal(classifyTendPanelFamily('BH', 'TP', 's'), 'bh-coag');
  assert.equal(classifyTendPanelFamily('BH', 'INR', ''), 'bh-coag');
});

test('familyOrderForSection: BH tiene 4 familias', () => {
  const order = familyOrderForSection('BH');
  assert.equal(order.length, 4);
  assert.deepEqual(order, ['bh-absolute', 'bh-quality', 'bh-diff-manual', 'bh-coag']);
});

test('migratePanelFamilyKey: BH legacy', () => {
  assert.equal(migratePanelFamilyKey('BH', 'percent-rbc'), 'bh-quality');
  assert.equal(migratePanelFamilyKey('BH', 'percent-diff'), 'bh-diff-manual');
  assert.equal(migratePanelFamilyKey('BH', 'bh-diff'), 'bh-diff-manual');
  assert.equal(migratePanelFamilyKey('BH', 'absolute'), 'bh-absolute');
  assert.equal(migratePanelFamilyKey('QS', 'absolute'), 'absolute');
});

test('formatTrendColumnHeader: hora solo si mismo día con horas distintas', () => {
  const solo = [mockSet('18/05/2026', '06:43', 'BH', 'Hb', 12)];
  assert.equal(formatTrendColumnHeader(solo[0], solo), '18/05/2026');

  const mismoDia = [
    mockSet('18/05/2026', '06:43', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '14:00', 'BH', 'Hb', 11)
  ];
  assert.equal(formatTrendColumnHeader(mismoDia[0], mismoDia), '18/05/2026 06:43');
  assert.equal(formatTrendColumnHeader(mismoDia[1], mismoDia), '18/05/2026 14:00');
  assert.equal(formatTrendColumnHeader(mismoDia[0], mismoDia, { showTime: false }), '18/05/2026');
  assert.equal(formatTrendColumnHeader(mismoDia[1], mismoDia, { showTime: false }), '18/05/2026');

  const diasDistintos = [
    mockSet('17/05/2026', '06:43', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '14:00', 'BH', 'Hb', 11)
  ];
  assert.equal(formatTrendColumnHeader(diasDistintos[0], diasDistintos), '17/05/2026');
  assert.equal(formatTrendColumnHeader(diasDistintos[1], diasDistintos), '18/05/2026');
});

test('buildTrendAxisMeta: etiquetas solo fecha, también el mismo día', () => {
  const sets = [
    mockSet('17/05/2026', '08:00', 'BH', 'Hb', 12),
    mockSet('18/05/2026', '05:05', 'BH', 'Hb', 11),
    mockSet('18/05/2026', '17:02', 'BH', 'Hb', 10)
  ];
  const meta = buildTrendAxisMeta(sets);
  assert.deepEqual(meta.labels, ['17/05', '18/05', '18/05']);
});

test('formatTendSeriesLabel: sin porcentaje duplicado', () => {
  const f = formatTendSeriesLabel('Monocitos %', 'MonoPct', '%');
  assert.equal(f.name, 'Monocitos');
  assert.equal(f.unit, '%');
});

test('buildSectionTableModel: sin groupByDay, una columna por toma', () => {
  const sets = [
    mockSet('16/08/2026', '08:00', 'BH', 'Hb', 5.61),
    mockSet('16/08/2026', '20:00', 'BH', 'Hb', 6.2)
  ];
  const specs = [{ fieldKey: 'Hb', cardTitle: 'Hb', unit: 'g/dL', sectionKey: 'BH' }];
  const getValue = (set, sp) => Number(set.parsedBySection.BH[sp.fieldKey].val);
  const model = buildSectionTableModel(sets, specs, getValue);
  assert.equal(model.columns.length, 2);
  assert.deepEqual(model.rows[0].values, [5.61, 6.2]);
});

test('buildSectionTableModel: filas de secciones distintas usan su propio sectionKey', () => {
  const bh = mockSet('16/08/2026', '08:00', 'BH', 'Hb', 12);
  bh.parsedBySection.QS = { Glu: { val: '95', ab: false } };
  const specs = [
    { fieldKey: 'Hb', cardTitle: 'Hb', unit: 'g/dL', sectionKey: 'BH' },
    { fieldKey: 'Glu', cardTitle: 'Glu', unit: 'mg/dL', sectionKey: 'QS' }
  ];
  const getValue = (set, sp) => {
    const bucket = set.parsedBySection[sp.sectionKey];
    return bucket && bucket[sp.fieldKey] ? Number(bucket[sp.fieldKey].val) : null;
  };
  const model = buildSectionTableModel([bh], specs, getValue);
  assert.deepEqual(model.rows[0].values, [12]);
  assert.deepEqual(model.rows[1].values, [95]);
});

test('buildSectionTableModel: groupByDay agrupa y usa la toma más reciente', () => {
  const sets = [
    mockSet('16/08/2026', '08:00', 'BH', 'Hb', 5.61),
    mockSet('16/08/2026', '20:00', 'BH', 'Hb', 6.2),
    mockSet('17/05/2026', '08:00', 'BH', 'Hb', 8.4)
  ];
  const specs = [{ fieldKey: 'Hb', cardTitle: 'Hb', unit: 'g/dL', sectionKey: 'BH' }];
  const getValue = (set, sp) => Number(set.parsedBySection.BH[sp.fieldKey].val);
  const model = buildSectionTableModel(sets, specs, getValue, { groupByDay: true });
  assert.equal(model.columns.length, 2);
  assert.deepEqual(model.rows[0].values, [6.2, 8.4]);
});

test('buildSectionTableModel: groupByDay no borra un analito con una toma parcial posterior', () => {
  const full = mockSet('16/08/2026', '08:00', 'BH', 'Hb', 7.68);
  full.parsedBySection.BH.Plt = { val: '9.73', ab: false };
  const parcial = mockSet('16/08/2026', '20:00', 'BH', 'Plt', 5.61);
  const specs = [
    { fieldKey: 'Hb', cardTitle: 'Hb', unit: 'g/dL', sectionKey: 'BH' },
    { fieldKey: 'Plt', cardTitle: 'Plt', unit: 'K/uL', sectionKey: 'BH' }
  ];
  const getValue = (set, sp) =>
    set.parsedBySection.BH[sp.fieldKey] ? Number(set.parsedBySection.BH[sp.fieldKey].val) : null;
  const model = buildSectionTableModel([full, parcial], specs, getValue, { groupByDay: true });
  assert.equal(model.columns.length, 1);
  assert.deepEqual(model.rows[0].values, [7.68]); // Hb viene de la toma completa
  assert.deepEqual(model.rows[1].values, [5.61]); // Plt viene de la toma parcial (más reciente)
  assert.equal(model.rows[0].refSets[0], full);
  assert.equal(model.rows[1].refSets[0], parcial);
});

test('parseTrendNumeric: menor que y decimales', () => {
  assert.equal(parseTrendNumeric('<0.01'), 0.01);
  assert.equal(parseTrendNumeric('0,08'), 0.08);
  assert.equal(parseTrendNumeric({ val: '4.08*' }), 4.08);
});
