import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractMentionedBeds, mentionedBedsSummaryLabel } from './inicio-turno-bed-mentions.mjs';

describe('extractMentionedBeds', () => {
  it('returns an empty list for empty/missing text', () => {
    assert.deepEqual(extractMentionedBeds(''), []);
    assert.deepEqual(extractMentionedBeds(null), []);
    assert.deepEqual(extractMentionedBeds(undefined), []);
  });

  it('extracts 3-digit and hyphenated wing beds, ignoring clock times', () => {
    const text =
      'Noche tranquila salvo 219, que se hipotensó a las 23:00 y no alcancé a revalorar ' +
      'después de la carga. 214-B lleva dos reposiciones de potasio, falta control. ' +
      'La de 222 llegó a las 04:20 con dolor abdominal, ya tiene labs pedidos.';
    assert.deepEqual(extractMentionedBeds(text), ['219', '214-B', '222']);
  });

  it('de-duplicates repeated mentions, keeping first-seen order', () => {
    const text = 'Revisar 305 de nuevo. El de 305 sigue igual. También 118.';
    assert.deepEqual(extractMentionedBeds(text), ['305', '118']);
  });

  it('does not split a bare clock time into a false bed match', () => {
    assert.deepEqual(extractMentionedBeds('Firmada 06:48, sin novedades.'), []);
  });

  it('uppercases the wing letter', () => {
    assert.deepEqual(extractMentionedBeds('cama 214-b revisada'), ['214-B']);
  });
});

describe('mentionedBedsSummaryLabel', () => {
  it('returns empty string when there are no mentions', () => {
    assert.equal(mentionedBedsSummaryLabel('Guardia sin novedades.'), '');
  });

  it('formats the summary line with count and comma-joined beds', () => {
    const text = 'Pendiente 219 y 214-B, además 222 con labs pedidos.';
    assert.equal(
      mentionedBedsSummaryLabel(text),
      '3 pacientes mencionados · 219, 214-B, 222'
    );
  });

  it('uses singular wording for exactly one mention', () => {
    assert.equal(mentionedBedsSummaryLabel('Solo pendiente 219.'), '1 paciente mencionado · 219');
  });
});
