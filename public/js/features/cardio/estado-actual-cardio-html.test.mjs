import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  vexusPillHtml,
  stevensonPillHtml,
  renderIdentityRowHtml,
  renderDescongestionFormHtml,
  renderPocusLogListHtml,
  renderPocusFormHtml,
} from './estado-actual-cardio-html.mjs';

test('vexusPillHtml tones by grade', () => {
  assert.match(vexusPillHtml(0), /--todo-prio-baja/);
  assert.match(vexusPillHtml(1), /--todo-prio-media/);
  assert.match(vexusPillHtml(2), /--todo-prio-alta/);
  assert.match(vexusPillHtml(3), /--todo-prio-alta/);
  assert.match(vexusPillHtml(null), /--text-muted/);
  assert.match(vexusPillHtml(2), />VExUS 2</);
});

test('stevensonPillHtml tones caliente-seco as best, frío-húmedo as worst', () => {
  assert.match(stevensonPillHtml('Caliente-seco'), /--todo-prio-baja/);
  assert.match(stevensonPillHtml('Frío-húmedo'), /--todo-prio-alta/);
  assert.match(stevensonPillHtml('Caliente-húmedo'), /--todo-prio-media/);
  assert.match(stevensonPillHtml(''), /--text-muted/);
});

test('renderIdentityRowHtml carries the six identity fields with their current values', () => {
  const html = renderIdentityRowHtml({
    fenotipo: 'FEr',
    etiologia: 'Isquémica',
    residente: 'Dr. X',
    ekg: 'RSN',
    ritmo: 'Sinusal',
    estrategiaControlFa: 'Control de frecuencia',
  });
  assert.match(html, /data-ea-cardio="fenotipo"/);
  assert.match(html, /value="FEr"/);
  assert.match(html, /data-ea-cardio="estrategiaControlFa"/);
  assert.match(html, /value="Control de frecuencia"/);
});

test('renderDescongestionFormHtml shows a Manual badge only for overridden stats', () => {
  const noOverride = renderDescongestionFormHtml({
    diasInternamiento: 3,
    diasDescongestion: 2,
    diuresisHoyMl: 2000,
    diuresisAcumuladaMl: 3500,
    furosemidaAcumuladaMg: 160,
    balanceAcumuladoMl: -1200,
    inicioDescongestion: '2026-03-12',
    overrides: {},
  });
  assert.doesNotMatch(noOverride, /Manual/);
  assert.match(noOverride, /data-ea-cardio-override="diuresisAcumuladaMl"/);
  assert.match(noOverride, /data-ea-cardio="inicioDescongestion"/);
  assert.match(noOverride, /data-ea-cardio-action="recalcular"/);

  const withOverride = renderDescongestionFormHtml({
    diasInternamiento: 3,
    diasDescongestion: 2,
    diuresisHoyMl: 2000,
    diuresisAcumuladaMl: 9999,
    furosemidaAcumuladaMg: 160,
    balanceAcumuladoMl: -1200,
    inicioDescongestion: '2026-03-12',
    overrides: { diuresisAcumuladaMl: 9999 },
  });
  assert.match(withOverride, /Manual/);
});

test('renderPocusLogListHtml lists saved POCUS days newest first', () => {
  const pocusByDay = [
    {
      date: '2026-03-10',
      vexus: 0,
      checklist: {},
    },
    {
      date: '2026-03-12',
      vexus: 2,
      stevenson: 'Frío-húmedo',
      fevi: '35%',
      congestionScore: 5,
      checklist: { pvy: true, rhy: false },
    },
  ];
  const html = renderPocusLogListHtml(pocusByDay);
  assert.match(html, /2026-03-12/);
  assert.match(html, /VExUS 2/);
  assert.match(html, /data-ea-cardio-action="edit-pocus-day"/);
  assert.match(html, /data-date="2026-03-12"/);
  assert.ok(html.indexOf('2026-03-12') < html.indexOf('2026-03-10'), 'newest day listed first');
});

test('renderPocusLogListHtml shows an empty state with no saved days', () => {
  const html = renderPocusLogListHtml([]);
  assert.match(html, /Sin registros de congestión\/POCUS/);
});

test('renderPocusFormHtml pre-fills fields from a saved day (used by the Registro Congestión modal)', () => {
  const html = renderPocusFormHtml({
    date: '2026-03-12',
    fevi: '35%',
    vexus: 2,
    checklist: { pvy: true },
  });
  assert.match(html, /data-ea-cardio-pocus="date" value="2026-03-12"/);
  assert.match(html, /data-ea-cardio-pocus="fevi" value="35%"/);
});
