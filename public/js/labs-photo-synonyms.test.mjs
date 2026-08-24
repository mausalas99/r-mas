import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchLabSynonym } from './labs-photo-synonyms.mjs';

test('matches known Spanish lab names exactly', () => {
  assert.deepEqual(matchLabSynonym('HEMOGLOBINA'), { sectionKey: 'BH', key: 'Hb' });
  assert.deepEqual(matchLabSynonym('GLUCOSA EN AYUNO'), { sectionKey: 'QS', key: 'Glu' });
  assert.deepEqual(matchLabSynonym('CREATININA SERICA'), { sectionKey: 'QS', key: 'Cr' });
});

test('is accent and case insensitive', () => {
  assert.deepEqual(matchLabSynonym('creatinina sérica'), { sectionKey: 'QS', key: 'Cr' });
  assert.deepEqual(matchLabSynonym('  Hemoglobina  '), { sectionKey: 'BH', key: 'Hb' });
});

test('falls back to substring match for longer report lines', () => {
  assert.deepEqual(matchLabSynonym('BILIRRUBINA TOTAL EN SUERO'), { sectionKey: 'PFHs', key: 'BT' });
});

test('returns null for unrecognized names', () => {
  assert.equal(matchLabSynonym('EXAMEN GENERAL DE ORINA COLOR'), null);
  assert.equal(matchLabSynonym(''), null);
  assert.equal(matchLabSynonym(null), null);
});
