import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLabLine,
  areLabSetsEquivalent,
  isDuplicateAgainstLatest,
} from './lab-history-auto-store-core.mjs';

test('normalizeLabLine colapsa espacios y trim', () => {
  assert.equal(normalizeLabLine('  Hb   12.1   g/dL  '), 'Hb 12.1 g/dL');
});

test('areLabSetsEquivalent detecta igualdad semantica', () => {
  var a = ['Hb  12.1 g/dL', 'Cr 1.0 mg/dL'];
  var b = [' Hb 12.1 g/dL ', 'Cr   1.0 mg/dL'];
  assert.equal(areLabSetsEquivalent(a, b), true);
});

test('isDuplicateAgainstLatest true cuando coincide fecha/hora/labs', () => {
  var latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  var incoming = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), true);
});

test('isDuplicateAgainstLatest false cuando cambia hora', () => {
  var latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  var incoming = { fecha: '01/05/2026', hora: '10:00', resLabs: ['Hb 12.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), false);
});

test('isDuplicateAgainstLatest false cuando cambia una linea', () => {
  var latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1', 'Cr 1.0'] };
  var incoming = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1', 'Cr 1.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), false);
});
