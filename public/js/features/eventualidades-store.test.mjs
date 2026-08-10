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
  assert.equal(buildEventualidadComposeText({ kind: 'biopsia', detail: 'Médula' }), 'MÉDULA');
});

test('normalizeTransfusionProduct', () => {
  assert.equal(normalizeTransfusionProduct('Plaquetas'), 'plaquetas');
  assert.equal(normalizeTransfusionProduct('invalid'), null);
});

test('resolveEventualidadEntryText falls back to kind label', () => {
  assert.equal(resolveEventualidadEntryText('', 'transfusion'), 'TRANSFUSIÓN');
  assert.equal(resolveEventualidadEntryText('2 U GR', 'transfusion'), '2 U GR');
  assert.equal(resolveEventualidadEntryText('', ''), '');
});
