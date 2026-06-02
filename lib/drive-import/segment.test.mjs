import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitDocumentSections } from './segment.mjs';

test('splitDocumentSections finds EVENTUALIDADES and excludes ESTADO ACTUAL body', () => {
  const text = [
    'EVENTUALIDADES',
    '01/06',
    'NOTA DEL DIA',
    'ESTADO ACTUAL',
    'N: ALERTA',
    '01/06',
    'OTRA NOTA',
  ].join('\n');
  const s = splitDocumentSections(text);
  assert.ok(s.eventualidadesBlocks.length >= 1);
  const evText = s.eventualidadesBlocks.join('\n');
  assert.match(evText, /OTRA NOTA/);
  assert.doesNotMatch(evText, /N: ALERTA/);
});

test('splitDocumentSections merges two EVENTUALIDADES blocks', () => {
  const text = [
    'EVENTUALIDADES EN ESTE INTERNAMIENTO',
    '23/05',
    'NOTA CORTA',
    'EVENTUALIDADES',
    '22/05',
    'NOTA LARGA',
  ].join('\n');
  const s = splitDocumentSections(text);
  assert.equal(s.eventualidadesBlocks.length, 2);
});

test('splitDocumentSections captures HISTORIA CLINICA section', () => {
  const text = ['DX:', '1. DM2', 'HISTORIA CLÍNICA', 'ORIGEN: MTY', 'PEEA', 'NARRATIVA'].join('\n');
  const s = splitDocumentSections(text);
  assert.match(s.sections.historiaClinica || '', /ORIGEN/);
  assert.match(s.sections.peea || '', /NARRATIVA/);
});
