import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  vexusPillHtml,
  stevensonPillHtml,
  renderIdentityRowHtml,
  renderDescongestionFormHtml,
  renderPocusLogListHtml,
  renderPocusFormHtml,
  renderPocusStep1Html,
  renderPocusStep2Html,
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

test('renderIdentityRowHtml keeps fenotipo as a real dropdown (plain codes, no percentages) next to an inline FEVI box', () => {
  const html = renderIdentityRowHtml({
    fenotipo: 'HFrEF',
    fevi: '35',
    etiologia: 'Isquémica',
    residente: 'Dr. X',
    ekg: 'RSN',
    ritmo: 'Sinusal',
    estrategiaControlFa: 'Control de frecuencia',
  });
  assert.match(html, /<select[^>]*data-ea-cardio="fenotipo"/);
  const fenotipoSelectMatch = html.match(/<select[^>]*data-ea-cardio="fenotipo"[^>]*>[\s\S]*?<\/select>/);
  assert.doesNotMatch(fenotipoSelectMatch[0], /%/);
  assert.doesNotMatch(html, /HFrEF \(/);
  assert.match(html, />HFrEF</);
  assert.match(html, />HFmrEF</);
  assert.match(html, />HFpEF</);
  assert.match(html, />HFimpEF</);
  assert.match(html, /data-ea-cardio="fevi"/);
  assert.match(html, /value="35"/);
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

test('renderPocusFormHtml renders an 8-zone lung-US grid alongside the legacy free-text fields', () => {
  const html = renderPocusFormHtml({
    date: '2026-03-12',
    lungPattern: 'B',
    lungLinesB: '3-4',
    lungZones: { rAntSup: '1-2', lLatInf: 'Coalescentes' },
  });
  // Legacy fields kept as-is.
  assert.match(html, /data-ea-cardio-pocus="lungPattern" value="B"/);
  assert.match(html, /data-ea-cardio-pocus="lungLinesB" value="3-4"/);
  // New per-zone grid, 8 selects.
  const zoneMatches = html.match(/data-ea-cardio-pocus-zone="/g) || [];
  assert.equal(zoneMatches.length, 8);
  assert.match(html, /data-ea-cardio-pocus-zone="rAntSup"[^]*?value="1-2" selected/);
  assert.match(html, /data-ea-cardio-pocus-zone="lLatInf"[^]*?value="Coalescentes" selected/);
});

test('renderPocusFormHtml renders a 6MWT numeric field pre-filled from the day draft', () => {
  const html = renderPocusFormHtml({ date: '2026-03-12', sixMwtMeters: 320 });
  assert.match(html, /data-ea-cardio-pocus="sixMwtMeters" value="320"/);
});

test('renderPocusStep1Html/renderPocusStep2Html together cover every field renderPocusFormHtml has, split without dropping any', () => {
  const day = {
    date: '2026-03-12',
    vciCm: '2.1',
    fevi: '35%',
    vexus: 2,
    stevenson: 'Caliente-húmedo',
    sixMwtMeters: 320,
    lungPattern: 'B',
    lungLinesB: '3-4',
    lungZones: { rAntSup: '1-2', lLatInf: 'Coalescentes' },
    note: 'nota de prueba',
  };
  const step1 = renderPocusStep1Html(day);
  const step2 = renderPocusStep2Html(day);
  // Step 1: clinical eval + VCI/VExUS + Stevenson (and 6MWT, same "escalas"
  // section) + the legacy free-text lung-pattern fields (grouped here for
  // headroom, see pocusStep1SectionsHtml's doc comment).
  assert.match(step1, /data-ea-cardio-pocus="date" value="2026-03-12"/);
  assert.match(step1, /data-ea-cardio-pocus="vciCm" value="2.1"/);
  assert.match(step1, /data-ea-cardio-pocus="fevi" value="35%"/);
  assert.match(step1, /data-ea-cardio-pocus="sixMwtMeters" value="320"/);
  assert.match(step1, /data-ea-cardio-pocus="lungPattern" value="B"/);
  assert.doesNotMatch(step1, /data-ea-cardio-pocus-zone=/);
  // Step 2: 8-zone lung-US grid + note.
  assert.doesNotMatch(step2, /data-ea-cardio-pocus="lungPattern"/);
  assert.equal((step2.match(/data-ea-cardio-pocus-zone="/g) || []).length, 8);
  assert.match(step2, />nota de prueba</);
  assert.doesNotMatch(step2, /data-ea-cardio-pocus="vciCm"/);
  // renderPocusFormHtml (legacy single-screen form, still used by earlier
  // tests) carries the union of both steps' fields.
  const full = renderPocusFormHtml(day);
  assert.match(full, /data-ea-cardio-pocus="vciCm" value="2.1"/);
  assert.equal((full.match(/data-ea-cardio-pocus-zone="/g) || []).length, 8);
});
