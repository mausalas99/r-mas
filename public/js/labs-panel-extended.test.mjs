import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExtendedLabPanels_, LAB_EXTENDED_SECTION_KEYS } from './labs-panel-parse.mjs';
import { parsePFH_, procesarLabs } from './labs.js';

/** Bloque SOME sintético numérico (layout típico HU). */
function someNum(name, value, unit, ref) {
  return (
    name +
    '\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
    name +
    '\t\n*\n' +
    value +
    '\n' +
    unit +
    '\t' +
    ref +
    '\n'
  );
}

/** Bloque SOME sintético cualitativo (pos/neg + S/CO opcional). */
function someQual(name, qual, sco) {
  var scoLine = sco != null ? String(sco) + '\n' : '';
  return (
    name +
    '\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
    name +
    '\t\n' +
    scoLine +
    qual +
    '\n'
  );
}

const FIXTURE_ALL =
  'QUIMICA CLINICA\n' +
  someNum('TSH', '2.5', 'uUI/mL', '0.4 - 4.0') +
  someNum('T4 LIBRE', '1.1', 'ng/dL', '0.8 - 1.8') +
  someNum('T3 LIBRE', '3.2', 'pg/mL', '2.0 - 4.4') +
  someNum('HEMOGLOBINA GLICOSILADA', '6.8', '%', '4.0 - 5.6') +
  someNum('CORTISOL', '12.5', 'ug/dL', '5.0 - 25.0') +
  someNum('PTH', '45', 'pg/mL', '15 - 65') +
  someNum('VITAMINA D 25 OH', '22', 'ng/mL', '30 - 100') +
  someNum('NT-PROBNP', '850', 'pg/mL', '0 - 125') +
  someNum('CK-MB', '4.2', 'ng/mL', '0 - 5.0') +
  someNum('HIERRO SERICO', '35', 'ug/dL', '50 - 170') +
  someNum('CAPACIDAD DE FIJACION DE HIERRO', '320', 'ug/dL', '250 - 450') +
  someNum('% DE SATURACION DE TRANSFERRINA', '11', '%', '20 - 50') +
  someNum('FERRITINA', '12', 'ng/mL', '30 - 400') +
  someNum('FACTOR REUMATOIDE', '8', 'UI/mL', '0 - 14') +
  someNum('COMPLEMENTO C3', '95', 'mg/dL', '90 - 180') +
  someNum('COMPLEMENTO C4', '18', 'mg/dL', '10 - 40') +
  someNum('GGT', '88', 'U/L', '0 - 55') +
  someNum('PROTEINAS TOTALES', '6.2', 'g/dL', '6.0 - 8.3') +
  someNum('CISTATINA C', '1.4', 'mg/L', '0.5 - 1.0') +
  someNum('MICROALBUMINURIA', '45', 'mg/g', '0 - 30') +
  someNum('AMONIO', '55', 'umol/L', '11 - 32') +
  someNum('OSMOLARIDAD SERICA', '295', 'mOsm/kg', '275 - 295') +
  someNum('VANCOMICINA', '18', 'ug/mL', '10 - 20') +
  someNum('DIGOXINA', '1.8', 'ng/mL', '0.8 - 2.0') +
  someNum('AFP', '3.2', 'ng/mL', '0 - 8.0') +
  someNum('CEA', '2.1', 'ng/mL', '0 - 5.0') +
  someNum('CA 125', '22', 'U/mL', '0 - 35') +
  someNum('PSA', '1.2', 'ng/mL', '0 - 4.0') +
  someNum('VITAMINA B12', '180', 'pg/mL', '200 - 900') +
  someNum('ACIDO FOLICO', '3.1', 'ng/mL', '3.0 - 17') +
  someNum('CALPROTECTINA FECAL', '180', 'ug/g', '0 - 50') +
  someNum('ETANOL', '0', 'mg/dL', '0 - 10') +
  someQual('ANTICUERPOS ANTI-HBS', 'NEGATIVO', '0.12') +
  someQual('ANTICUERPOS ANTI-HBC IG M', 'NEGATIVO', '0.08') +
  someQual('VDRL', 'NEGATIVO') +
  someQual('ANTICUERPOS IGM TOXOPLASMA', 'NEGATIVO') +
  someQual('ANTIGENO LEGIONELLA EN ORINA', 'NEGATIVO') +
  someQual('SANGRE OCULTA EN HECES', 'NEGATIVO');

function lineFor(sectionKey, lines) {
  return (lines || []).find(function (l) {
    return l.startsWith(sectionKey + '\t');
  });
}

test('LAB_EXTENDED_SECTION_KEYS tiene los grupos scaffold', () => {
  for (var i = 0; i < LAB_EXTENDED_SECTION_KEYS.length; i++) {
    assert.equal(typeof LAB_EXTENDED_SECTION_KEYS[i], 'string');
  }
  assert.ok(LAB_EXTENDED_SECTION_KEYS.indexOf('TIR') >= 0);
  assert.ok(LAB_EXTENDED_SECTION_KEYS.indexOf('CARD') >= 0);
  assert.ok(LAB_EXTENDED_SECTION_KEYS.indexOf('HEPB') >= 0);
});

test('parseExtendedLabPanels_ emite TIR ENDO CARD FE', () => {
  var lines = parseExtendedLabPanels_(FIXTURE_ALL);
  assert.match(lineFor('TIR', lines), /\bTSH 2\.5\b/);
  assert.match(lineFor('TIR', lines), /\bT4L 1\.1\b/);
  assert.match(lineFor('ENDO', lines), /\bHbA1c 6\.8\*/);
  assert.match(lineFor('CARD', lines), /\bNTproBNP 850\*/);
  assert.match(lineFor('FE', lines), /\bFe 35\*/);
  assert.match(lineFor('FE', lines), /\bFerr 12\*/);
});

test('parseExtendedLabPanels_ emite INFL INM META NEF NIVEL TM NUT GI', () => {
  var lines = parseExtendedLabPanels_(FIXTURE_ALL);
  assert.match(lineFor('INFL', lines), /\bFR 8\b/);
  assert.match(lineFor('INM', lines), /\bC3 95\b/);
  assert.match(lineFor('META', lines), /\bNH3 55\*/);
  assert.match(lineFor('NEF', lines), /\bCysC 1\.4\*/);
  assert.match(lineFor('NIVEL', lines), /\bVanco 18\b/);
  assert.match(lineFor('TM', lines), /\bAFP 3\.2\b/);
  assert.match(lineFor('NUT', lines), /\bB12 180\*/);
  assert.match(lineFor('GI', lines), /\bCalpro 180\*/);
});

test('parseExtendedLabPanels_ emite paneles cualitativos HEPB VIRAL MICRO', () => {
  var lines = parseExtendedLabPanels_(FIXTURE_ALL);
  assert.match(lineFor('HEPB', lines), /\bAntiHBs neg/);
  assert.match(lineFor('VIRAL', lines), /\bVDRL neg/);
  assert.match(lineFor('VIRAL', lines), /\bToxoIgM neg/);
  assert.match(lineFor('MICRO', lines), /\bLegAg neg/);
  assert.match(lineFor('GI', lines), /\bSOH neg/);
});

test('parseExtendedLabPanels_ no inventa secciones sin marcadores', () => {
  var lines = parseExtendedLabPanels_('QUIMICA CLINICA\nGLUCOSA EN SANGRE\n95\nmg/dL\t70 - 100\n');
  assert.deepEqual(lines, []);
});

test('parsePFH_ incluye GGT y Prot totales', () => {
  var t =
    'ALBUMINA\n3.8\ng/dL\t3.5 - 5.2\n' +
    'GGT\n88\nU/L\t0 - 55\n' +
    'PROTEINAS TOTALES\n6.2\ng/dL\t6.0 - 8.3\n';
  var out = parsePFH_(t);
  assert.match(out, /\bGGT 88\*/);
  assert.match(out, /\bProt 6\.2\b/);
});

test('procesarLabs cablea paneles extendidos', () => {
  var { resLabs } = procesarLabs(FIXTURE_ALL);
  assert.ok(resLabs.some((l) => l.startsWith('TIR\t')));
  assert.ok(resLabs.some((l) => l.startsWith('CARD\t')));
  assert.ok(resLabs.some((l) => l.startsWith('HEPB\t')));
});

import { replaceLabPanelOverlayForTests, clearLabPanelOverlayForTests } from './labs-panel-overlay-store.mjs';

test('parseExtendedLabPanels_ honors overlay store patch', () => {
  replaceLabPanelOverlayForTests([{
    panelId: 'user:zz',
    sectionKey: 'CUST',
    mode: 'num',
    gates: ['MARCADOR ZZ'],
    fields: [{ key: 'Zz', labels: ['MARCADOR ZZ'] }],
    updatedAt: 1,
    updatedBy: 't',
  }]);
  try {
    var t = 'QUIMICA CLINICA\n' + someNum('MARCADOR ZZ', '9', 'ng/mL', '0 - 5');
    var lines = parseExtendedLabPanels_(t);
    assert.ok(lines.some((l) => l.startsWith('CUST\t') && /\bZz 9\*/.test(l)));
  } finally {
    clearLabPanelOverlayForTests();
  }
});
