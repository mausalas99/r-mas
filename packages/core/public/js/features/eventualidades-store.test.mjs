import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendEventualidad,
  updateEventualidad,
  inferEventualidadKind,
  resolveEventualidadKind,
  pickHigherPriorityKind,
  normalizeEventualidadKind,
  resolveEventualidadEntryText,
  buildEventualidadComposeText,
  normalizeTransfusionProduct,
  abbreviatedEventualidadLabel,
  TRANSFUSION_PRODUCTS,
  eventualidadDateToIso,
} from './eventualidades-store.mjs';

test('appendEventualidad stores optional kind', () => {
  const next = appendEventualidad({ entries: [] }, '2 U GR', '', eventualidadDateToIso('2026-08-05'), 'transfusion');
  assert.equal(next.entries.length, 1);
  assert.equal(next.entries[0].kind, 'transfusion');
  assert.equal(next.entries[0].text, '2 U GR');
});

test('appendEventualidad ignores invalid kind', () => {
  const next = appendEventualidad({ entries: [] }, 'Nota', '', '', 'invalid');
  assert.equal(next.entries[0].kind, undefined);
});

test('updateEventualidad patches kind', () => {
  const base = appendEventualidad({ entries: [] }, 'Biopsia renal', '', eventualidadDateToIso('2026-08-01'), 'otro');
  const id = base.entries[0].id;
  const next = updateEventualidad(base, id, { kind: 'biopsia' });
  assert.equal(next.entries[0].kind, 'biopsia');
});

test('inferEventualidadKind from text keywords', () => {
  assert.equal(inferEventualidadKind('TRANSFUSIÓN 2 U'), 'transfusion');
  assert.equal(inferEventualidadKind('BIOPSIA RENAL'), 'biopsia');
  assert.equal(inferEventualidadKind('CX APENDICECTOMÍA'), 'procedimiento');
  assert.equal(inferEventualidadKind('Fiebre'), 'otro');
});

test('resolveEventualidadKind prefers stored kind', () => {
  assert.equal(resolveEventualidadKind({ kind: 'procedimiento', text: 'TRANSFUSIÓN' }), 'procedimiento');
  assert.equal(resolveEventualidadKind({ text: 'TRANSFUSIÓN' }), 'transfusion');
});

test('pickHigherPriorityKind', () => {
  assert.equal(pickHigherPriorityKind('otro', 'transfusion'), 'transfusion');
  assert.equal(pickHigherPriorityKind('biopsia', 'procedimiento'), 'biopsia');
});

test('appendEventualidad stores transfusionProduct', () => {
  const next = appendEventualidad(
    { entries: [] },
    'PLAQUETAS',
    '',
    eventualidadDateToIso('2026-08-05'),
    'transfusion',
    'plaquetas'
  );
  assert.equal(next.entries[0].transfusionProduct, 'plaquetas');
  assert.equal(next.entries[0].text, 'PLAQUETAS');
});

test('buildEventualidadComposeText', () => {
  assert.equal(
    buildEventualidadComposeText({ kind: 'transfusion', transfusionProduct: 'plasma', detail: '' }),
    'PLASMA'
  );
  assert.equal(
    buildEventualidadComposeText({ kind: 'transfusion', transfusionProduct: 'eritrocitos', detail: '2 U' }),
    'ERITROCITOS — 2 U'
  );
  assert.equal(
    buildEventualidadComposeText({ kind: 'transfusion', transfusionProduct: 'aferesis', detail: '' }),
    'AFÉRESIS PLAQUETARIA'
  );
  assert.equal(buildEventualidadComposeText({ kind: 'biopsia', detail: 'Médula' }), 'MÉDULA');
});

test('normalizeTransfusionProduct', () => {
  assert.ok(TRANSFUSION_PRODUCTS.includes('aferesis'));
  assert.equal(normalizeTransfusionProduct('Plaquetas'), 'plaquetas');
  assert.equal(normalizeTransfusionProduct('aferesis'), 'aferesis');
  assert.equal(normalizeTransfusionProduct('invalid'), null);
});

test('abbreviatedEventualidadLabel shortens transfusion and kinds', () => {
  assert.equal(
    abbreviatedEventualidadLabel({
      kind: 'transfusion',
      transfusionProduct: 'eritrocitos',
      text: 'ERITROCITOS — 2 U',
    }),
    '2 CE'
  );
  assert.equal(
    abbreviatedEventualidadLabel({
      kind: 'transfusion',
      transfusionProduct: 'plaquetas',
      text: 'PLAQUETAS — 4',
    }),
    '4 Plaq'
  );
  assert.equal(
    abbreviatedEventualidadLabel({
      kind: 'transfusion',
      transfusionProduct: 'plasma',
      text: 'PLASMA',
    }),
    'Plas'
  );
  assert.equal(
    abbreviatedEventualidadLabel({
      kind: 'transfusion',
      transfusionProduct: 'aferesis',
      text: 'AFÉRESIS PLAQUETARIA — 1',
    }),
    '1 AfP'
  );
  assert.equal(abbreviatedEventualidadLabel({ kind: 'transfusion', text: 'TRANSFUSIÓN' }), 'Transf');
  assert.equal(abbreviatedEventualidadLabel({ kind: 'biopsia', text: 'Riñón' }), 'Bx');
  assert.equal(abbreviatedEventualidadLabel({ kind: 'procedimiento', text: 'Toracocentesis' }), 'Proc');
  assert.equal(abbreviatedEventualidadLabel({ kind: 'otro', text: 'Nota' }), 'Ev');
});

test('resolveEventualidadEntryText falls back to kind label', () => {
  assert.equal(resolveEventualidadEntryText('', 'transfusion'), 'TRANSFUSIÓN');
  assert.equal(resolveEventualidadEntryText('2 U GR', 'transfusion'), '2 U GR');
  assert.equal(resolveEventualidadEntryText('', ''), '');
});
