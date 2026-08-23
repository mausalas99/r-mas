import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setLabHistory } from '../../app-state.mjs';
import { emptyCardio } from '../../../../lib/cardio/patient-cardio.mjs';
import {
  todayYmd,
  findConsultaEntry,
  ensureConsultaEntryForDate,
  listConsultaDatesDesc,
  parseTriState,
  buildLabHistoryForPrefill,
} from './consulta-ic-data.mjs';

test('todayYmd returns a YYYY-MM-DD string', () => {
  assert.match(todayYmd(), /^\d{4}-\d{2}-\d{2}$/);
});

test('parseTriState maps the tri-select raw values', () => {
  assert.equal(parseTriState('true'), true);
  assert.equal(parseTriState('false'), false);
  assert.equal(parseTriState(''), null);
});

test('findConsultaEntry finds by date or returns null', () => {
  const cardio = { consultas: [{ date: '2026-01-01', faseSeguimiento: 'x' }] };
  assert.equal(findConsultaEntry(cardio, '2026-01-01').faseSeguimiento, 'x');
  assert.equal(findConsultaEntry(cardio, '2026-01-02'), null);
  assert.equal(findConsultaEntry(null, '2026-01-01'), null);
});

test('ensureConsultaEntryForDate returns the existing entry untouched', () => {
  const patient = { cardio: Object.assign(emptyCardio(), { consultas: [{ date: '2026-01-01', contacto: 'llamada' }] }) };
  const entry = ensureConsultaEntryForDate(patient, '2026-01-01');
  assert.equal(entry.contacto, 'llamada');
  assert.equal(patient.cardio.consultas.length, 1);
});

test('ensureConsultaEntryForDate seeds from the last ronda only for today', () => {
  const today = todayYmd();
  const patient = {
    cardio: Object.assign(emptyCardio(), {
      fenotipo: 'HFrEF',
      etiologia: 'Isquémica',
      rondasByDay: [{ date: '2026-01-05' }],
      consultas: [],
    }),
  };
  const entry = ensureConsultaEntryForDate(patient, today);
  assert.equal(entry.date, today);
  assert.equal(entry.fenotipo, 'HFrEF');
  assert.equal(entry.etiologia, 'Isquémica');
  assert.equal(entry.ultimoInternamientoFecha, '2026-01-05');
});

test('ensureConsultaEntryForDate starts blank for a non-today date with no entry', () => {
  const patient = {
    cardio: Object.assign(emptyCardio(), {
      fenotipo: 'HFrEF',
      rondasByDay: [{ date: '2026-01-05' }],
      consultas: [],
    }),
  };
  const entry = ensureConsultaEntryForDate(patient, '2020-06-01');
  assert.equal(entry.date, '2020-06-01');
  assert.equal(entry.fenotipo, '');
});

test('listConsultaDatesDesc sorts newest first', () => {
  const cardio = { consultas: [{ date: '2026-01-01' }, { date: '2026-03-01' }, { date: '2026-02-01' }] };
  assert.deepEqual(listConsultaDatesDesc(cardio), ['2026-03-01', '2026-02-01', '2026-01-01']);
});

test('buildLabHistoryForPrefill extracts NT-proBNP from raw resLabs rows', () => {
  setLabHistory({
    p1: [
      { resLabs: ['CARD: NT-PROBNP 1850 pg/mL'] },
      { resLabs: ['CARD: NT-PROBNP 900 pg/mL'] },
    ],
  });
  const built = buildLabHistoryForPrefill('p1');
  assert.equal(built.valuesByKey['NT-PROBNP'], '900');
  setLabHistory({});
});

test('buildLabHistoryForPrefill returns an empty map for an unknown patient', () => {
  setLabHistory({});
  const built = buildLabHistoryForPrefill('missing');
  assert.deepEqual(built.valuesByKey, {});
});
