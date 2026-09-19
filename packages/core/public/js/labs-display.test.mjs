import test from 'node:test';
import assert from 'node:assert/strict';
import { escTxt, renderToken, renderEntry } from './labs-display.mjs';

test('escTxt escapes HTML', () => {
  assert.equal(escTxt('<b>&'), '&lt;b&gt;&amp;');
});

test('renderToken marks altered values', () => {
  assert.match(renderToken('12*'), /lab-value-altered/);
  assert.equal(renderToken('12'), '12');
});

test('renderEntry preserves section label on first line', () => {
  const out = renderEntry('BH\tHb 14');
  assert.match(out[0], /section-lbl/);
  assert.match(out[0], /Hb/);
});

test('renderEntry folds a stored BH Hem. Ret row onto the compact BH line', () => {
  const out = renderEntry('BH:\n  Hem.\tRet 1');
  assert.equal(out.length, 1);
  assert.match(out[0], /section-lbl/);
  assert.match(out[0], />BH</);
  assert.match(out[0], /Ret/);
  assert.doesNotMatch(out[0], /Hem\./);
});

test('renderEntry styles FEB like other lab sections', () => {
  const out = renderEntry('FEB\tTifO neg TifH neg Bru neg');
  assert.match(out[0], /section-lbl/);
  assert.match(out[0], />FEB</);
  assert.match(out[0], /TifO/);
});

test('renderEntry styles COAG like BH/QS', () => {
  const out = renderEntry('COAG\tTP 18.6*  TTP 39.4*');
  assert.match(out[0], /section-lbl/);
  assert.match(out[0], />COAG</);
  assert.match(out[0], /TP/);
  const legacy = renderEntry('BH\tHb 6.78\n  Coag.\tTP 18.6*  INR 1.6*');
  assert.match(legacy[1], /section-lbl/);
  assert.match(legacy[1], />COAG</);
});

test('renderEntry inserts a space between label and values spans (inline-consumer word gap bug)', () => {
  const out = renderEntry('UROCULTIVO\tPOR SONDA 16/08: ESCHERICHIA COLI · Preliminar');
  assert.match(out[0], /<\/span> <span/);
  const asText = out[0].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  assert.match(asText, /^UROCULTIVO POR SONDA/);
});

test('renderEntry inserts a space when the study keyword is glued to the next word (no-tab header line)', () => {
  // El portal de laboratorio a veces pega la palabra clave del estudio con la
  // siguiente ("UROCULTIVOPOR SONDA" en vez de "UROCULTIVO POR SONDA"), y esta
  // línea de cabecera no lleva tab. Sin el arreglo, el token completo
  // "UROCULTIVOPOR" quedaba dentro del span de la etiqueta.
  const out = renderEntry('UROCULTIVOPOR SONDA 16/08: ESCHERICHIA COLI');
  assert.equal(out[0], '<span class="section-lbl">UROCULTIVO</span> POR SONDA 16/08: ESCHERICHIA COLI');
});

test('renderEntry(text) without a trendLookup arg produces byte-identical HTML (Fase 5 regression guard)', () => {
  const cases = [
    'BH\tHb 14',
    'QS\tGlu 248* Cr 2.1* eTFG 34',
    'BH\tHb 6.78\n  Coag.\tTP 18.6*  INR 1.6*',
    'FEB\tTifO neg TifH neg Bru neg',
  ];
  cases.forEach((text) => {
    assert.deepEqual(renderEntry(text), renderEntry(text, undefined));
    assert.deepEqual(renderEntry(text), renderEntry(text, null));
  });
});

test('renderEntry emits a trend arrow only for altered values when trendLookup finds a prior draw', () => {
  const lookup = (sectionKey, fieldKey) => {
    if (sectionKey === 'QS' && fieldKey === 'Cr') return { trend: 'up', delta: 0.7 };
    return null;
  };
  const out = renderEntry('QS\tGlu 100 Cr 2.1*', lookup);
  assert.match(out[0], /lab-trend-up/);
  assert.doesNotMatch(out[0].replace(/lab-trend-up[^"]*"[^>]*>/, ''), /lab-trend-up/);
});

test('renderEntry does not emit a trend arrow when trendLookup returns null', () => {
  const out = renderEntry('QS\tCr 2.1*', () => null);
  assert.doesNotMatch(out[0], /lab-trend-(up|down)/);
});

test('renderEntry wraps structured rows (BH/QS) in lab-row-label / lab-row-values-chips columns', () => {
  const out = renderEntry('QS\tGlu 248* Cr 2.1* eTFG 34');
  assert.match(out[0], /<span class="lab-row-label"><span class="section-lbl">QS<\/span><\/span>/);
  assert.match(out[0], /class="lab-row-values lab-row-values-chips"/);
  assert.match(out[0], /<span class="lab-row-value">/);
});

test('renderEntry leaves prose rows (no numeric key/value pairs) unwrapped, no chip gap class', () => {
  const out = renderEntry('Frotis\tHipocromia, anisocitosis +, poiquilocitosis +.');
  assert.match(out[0], /class="lab-row-values">/);
  assert.doesNotMatch(out[0], /lab-row-values-chips/);
  assert.doesNotMatch(out[0], /lab-row-value"/);
});

test('renderEntry wraps EGO-style continuation lines (no tab, no label) in a full-width span', () => {
  // #lab-output-box hace `.out-line`/`.out-indent` display:grid (64px + 1fr) para las filas
  // "SECCION\tclave val…". Sin este wrapper, cada <strong>/span suelto queda como hijo directo
  // del grid y el navegador lo "blockifica" y auto-coloca uno por celda — el bug real de EGO
  // apareciendo como un campo por renglón. El span lab-row-values-full evita eso.
  const out = renderEntry('EGO:\n  AMAR  TURB  pH 6.5  D 1.013\n  Leu 17-18* Eri 2-3');
  assert.equal(out.length, 3);
  assert.match(out[0], /^<span class="section-lbl">EGO:<\/span>$/);
  assert.match(out[1], /^<span class="lab-row-values lab-row-values-full">.*<\/span>$/);
  assert.match(out[1], /AMAR/);
  assert.match(out[2], /^<span class="lab-row-values lab-row-values-full">.*<\/span>$/);
  assert.match(out[2], /Leu <strong[^>]*>17-18<\/strong>/);
});

test('renderEntry maps BH short output labels (Seg) to their trend fieldKey (NeuPct)', () => {
  const seen = [];
  const lookup = (sectionKey, fieldKey) => {
    seen.push([sectionKey, fieldKey]);
    return { trend: 'down', delta: -2 };
  };
  const out = renderEntry('BH\tHb 14 Seg 82*', lookup);
  assert.deepEqual(seen, [['BH', 'NeuPct']]);
  assert.match(out[0], /lab-trend-down/);
});
