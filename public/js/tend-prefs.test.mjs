import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  seriesColorKey,
  readSeriesColor,
  writeSeriesColor,
  readGroupVisibleFields,
  writeGroupVisibleFields,
  readGroupTableHidden,
  writeGroupTableHidden,
  readGroupPanelOrder,
  writeGroupPanelOrder,
  readGroupPanelHidden,
  writeGroupPanelHidden,
  writeGroupPanelTitle,
  resolvePanelTitle,
  defaultPanelLabel,
  defaultSeriesColor,
  DEFAULT_COLORS
} from './tend-prefs.mjs';

const mem = Object.create(null);
global.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); }
};

beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k];
});

test('colores globales por section|field', () => {
  writeSeriesColor('BH', 'Hb', '#ff0000');
  assert.equal(readSeriesColor('BH', 'Hb'), '#ff0000');
  assert.equal(seriesColorKey('BH', 'Hb'), 'BH|Hb');
});

test('visibles por paciente+sección', () => {
  writeGroupVisibleFields('p1', 'BH', ['Hb', 'Hto']);
  assert.deepEqual(readGroupVisibleFields('p1', 'BH'), ['Hb', 'Hto']);
});

test('ocultos tabla por paciente+sección', () => {
  writeGroupTableHidden('p1', 'BH', { rows: ['NeuPct'], cols: ['t:123'] });
  assert.deepEqual(readGroupTableHidden('p1', 'BH'), { rows: ['NeuPct'], cols: ['t:123'] });
});

test('orden y ocultos de paneles por paciente+sección', () => {
  writeGroupPanelOrder('p1', 'BH', ['gases', 'percent-rbc']);
  writeGroupPanelHidden('p1', 'BH', ['absolute']);
  assert.deepEqual(readGroupPanelOrder('p1', 'BH'), ['gases', 'percent-rbc']);
  assert.deepEqual(readGroupPanelHidden('p1', 'BH'), ['absolute']);
});

test('títulos de paneles personalizables por paciente+sección', () => {
  assert.equal(defaultPanelLabel('gases'), 'Gasometría');
  assert.equal(resolvePanelTitle('p1', 'BH', 'gases'), 'Gasometría');
  writeGroupPanelTitle('p1', 'BH', 'gases', 'Gases arteriales');
  assert.equal(resolvePanelTitle('p1', 'BH', 'gases'), 'Gases arteriales');
  writeGroupPanelTitle('p1', 'BH', 'gases', 'Gasometría');
  assert.equal(resolvePanelTitle('p1', 'BH', 'gases'), 'Gasometría');
});

test('defaultSeriesColor rota paleta de 8 colores', () => {
  assert.equal(defaultSeriesColor(0), DEFAULT_COLORS[0]);
  assert.equal(defaultSeriesColor(8), DEFAULT_COLORS[0]);
  assert.equal(defaultSeriesColor(3), DEFAULT_COLORS[3]);
});
