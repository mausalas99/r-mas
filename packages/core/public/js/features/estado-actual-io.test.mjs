import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIoEgresoLine,
  parseIoEvacField,
  parseIoIngresoField,
  computeIoBalanceFromIngEgr,
  formatIoBalanceDisplay,
  isIoBalanceNc,
  formatIoClauseForSoap,
  formatEvacForText,
  diuresisValueFromParts,
  normalizeEvacAbbrev,
  sumIoTurnos,
  ioTurnoAggregate,
  formatIoTurnoTotal,
  ioTurnoEgresoValue,
  ioNumericEgressTotal,
  formatEgresoPartsForText,
} from './estado-actual-io.mjs';
import { parseSatLineVariants, soporteFromSatTail } from './estado-actual-parse-variants.mjs';

test('parseIoEgresoLine — diuresis NC y componentes separados', () => {
  const parts = parseIoEgresoLine('DIURESIS NO CUANTIFICADA, DRENAJE 50 CC, NEFRO IZQ 20 CC');
  assert.equal(parts.length, 3);
  assert.equal(parts[0].kind, 'diuresis');
  assert.equal(parts[0].value, 'NC');
  assert.equal(parts[1].kind, 'drain');
  assert.equal(parts[1].value, 50);
  assert.equal(parts[2].kind, 'nephro');
  assert.match(parts[2].label, /IZQUIERDA/);
  assert.equal(parts[2].value, 20);
});

test('parseIoEgresoLine — ULTRAFILTRADO se clasifica aparte y cuenta en el total', () => {
  const parts = parseIoEgresoLine('DIURESIS 300 CC, ULTRAFILTRADO 3500 ML');
  assert.equal(parts.length, 2);
  assert.equal(parts[1].kind, 'ultrafiltrado');
  assert.equal(parts[1].label, 'ULTRAFILTRADO');
  assert.equal(parts[1].value, 3500);
  assert.equal(ioNumericEgressTotal({ egrParts: parts }), 3800);
});

test('parseIoEgresoLine — forma corta "UF" también se reconoce', () => {
  const parts = parseIoEgresoLine('UF 2800');
  assert.equal(parts[0].kind, 'ultrafiltrado');
  assert.equal(parts[0].value, 2800);
});

test('formatIoBalanceDisplay — NC cuando egresos no cuantificados', () => {
  const partsNc = parseIoEgresoLine('DIURESIS NC');
  assert.equal(isIoBalanceNc({ egrParts: partsNc }), true);
  assert.equal(formatIoBalanceDisplay(645, { egrParts: partsNc }), 'NC');
  assert.equal(formatIoBalanceDisplay(645, { egr: 'NC' }), 'NC');
  assert.equal(formatIoBalanceDisplay(null, { egr: 'NC' }), 'NC');
  assert.equal(formatIoBalanceDisplay(645, {}), '—');
  const partsMixed = parseIoEgresoLine('DIURESIS NC, DRENAJE 50 CC');
  assert.equal(formatIoBalanceDisplay(645, { egrParts: partsMixed }), '+595 CC');
});

test('formatIoBalanceDisplay — NC cuando ingresos NC', () => {
  assert.equal(formatIoBalanceDisplay('NC', { ing: 'NC', egr: 'NC' }), 'NC');
  assert.equal(isIoBalanceNc({ ing: 'NC', egr: 'NC' }), true);
});

test('parseIoIngresoField acepta NC', () => {
  assert.equal(parseIoIngresoField('NC'), 'NC');
  assert.equal(parseIoIngresoField('500'), 500);
});

test('formatIoClauseForSoap — ingresos NC fuerza egresos y balance NC', () => {
  const clause = formatIoClauseForSoap({ ing: 'NC', evac: 'NC' }, NaN);
  assert.match(clause, /INGRESOS NC/);
  assert.match(clause, /DIURESIS NC/);
  assert.match(clause, /BALANCE NC\b/);
  assert.doesNotMatch(clause, /INGRESOS ___ CC/);
});

test('computeIoBalanceFromIngEgr — suma todas las salidas numéricas', () => {
  const parts = parseIoEgresoLine('DIURESIS 300 CC, DRENAJE 50 CC');
  assert.equal(computeIoBalanceFromIngEgr(645, { egrParts: parts }), 295);
  assert.equal(Number.isFinite(computeIoBalanceFromIngEgr(645, { egr: 'NC' })), false);
});

test('computeIoBalanceFromIngEgr — gastrostomía con diuresis no cuantificada', () => {
  const parts = parseIoEgresoLine('DIURESIS NO CUANTIFICADA, GASTROSTOMÍA 120 CC');
  assert.equal(computeIoBalanceFromIngEgr(168, { egrParts: parts }), 48);
});

test('formatIoClauseForSoap — egresos divididos y evacuaciones', () => {
  const parts = parseIoEgresoLine('DIURESIS NO CUANTIFICADA, GASTROSTOMÍA 120 CC');
  const clause = formatIoClauseForSoap(
    { ing: 168, egrParts: parts, evac: 'NC' },
    48
  );
  assert.match(clause, /BALANCE \+48 CC/);
  const partsNcOnly = parseIoEgresoLine('DIURESIS NO CUANTIFICADA');
  const clauseNc = formatIoClauseForSoap(
    { ing: 645, egrParts: partsNcOnly, evac: 'NC' },
    NaN
  );
  assert.match(clause, /INGRESOS 168 CC/);
  assert.match(clause, /GASTROSTOMÍA 120 CC/);
  assert.match(clauseNc, /INGRESOS 645 CC/);
  assert.match(clauseNc, /DIURESIS NC/);
  assert.doesNotMatch(clauseNc, /NO CUANTIFICADA/);
  assert.match(clauseNc, /EVACUACIONES NC/);
  assert.match(clauseNc, /BALANCE NC\b/);
  assert.doesNotMatch(clauseNc, /BALANCE ___ CC/);
  const clauseFromIo = formatIoClauseForSoap(
    { ing: 168, egrParts: parts, evac: 'NC' },
    NaN
  );
  assert.match(clauseFromIo, /BALANCE \+48 CC/);
});

test('parseIoEvacField — NC y variantes sin evacuación', () => {
  assert.equal(parseIoEvacField('NC'), 'NC');
  assert.equal(parseIoEvacField('NO REPORTADAS'), 'NC');
  assert.equal(parseIoEvacField('SIN EVACUACIONES REPORTADAS DURANTE TURNO'), 'NC');
});

test('formatEvacForText — numérico sin CC (conteo, no volumen)', () => {
  assert.equal(formatEvacForText(2), '2');
  assert.doesNotMatch(formatEvacForText(2), /CC/);
});

test('diuresisValueFromParts — primer bloque diuresis', () => {
  const parts = parseIoEgresoLine('DRENAJE 10 CC, DIURESIS 200 CC');
  assert.equal(diuresisValueFromParts(parts), 200);
});

test('sumIoTurnos / formatIoTurnoTotal — suma turnos numéricos, salta NC', () => {
  const ingValues = [200, 'NC', 500].map((v) => parseIoIngresoField(String(v)));
  const totals = sumIoTurnos(ingValues);
  assert.equal(totals.sum, 700);
  assert.equal(totals.count, 2);
  assert.equal(formatIoTurnoTotal(totals), '700 CC (2T)');
  assert.equal(ioTurnoAggregate(totals), 700);
});

test('sumIoTurnos — vacío cuenta igual que NC', () => {
  const values = [parseIoIngresoField(''), parseIoIngresoField('NC'), parseIoIngresoField('300')];
  const totals = sumIoTurnos(values);
  assert.equal(totals.sum, 300);
  assert.equal(totals.count, 1);
});

test('sumIoTurnos — todos NC o vacíos → agregado NC', () => {
  const totals = sumIoTurnos([parseIoIngresoField('NC'), parseIoIngresoField(''), parseIoIngresoField('')]);
  assert.equal(totals.count, 0);
  assert.equal(formatIoTurnoTotal(totals), 'NC');
  assert.equal(ioTurnoAggregate(totals), 'NC');
});

test('ioTurnoEgresoValue — suma partes numéricas de un turno, NC si ninguna cuantificada', () => {
  const parts = parseIoEgresoLine('DIURESIS 300 CC, DRENAJE 50 CC');
  assert.equal(ioTurnoEgresoValue(parts), 350);
  assert.equal(ioTurnoEgresoValue(parseIoEgresoLine('DIURESIS NC')), 'NC');
  assert.equal(ioTurnoEgresoValue([]), 'NC');
});

test('normalizeEvacAbbrev y soporte desde SAT', () => {
  assert.equal(normalizeEvacAbbrev('NO REPORTADAS'), 'NC');
  assert.equal(soporteFromSatTail('AL AIRE AMBIENTE'), 'Aire ambiente');
  assert.equal(soporteFromSatTail('CON TRAQUEOSTOMÍA'), 'Traqueostomía');
  assert.equal(soporteFromSatTail('TQT'), 'Traqueostomía');
  const sat = parseSatLineVariants('SAT: 97% AL AIRE AMBIENTE');
  assert.equal(sat && sat.value, 97);
  assert.equal(sat && sat.soporteHint, 'Aire ambiente');
});

test('formatEgresoPartsForText — 3 turnos NC de diuresis colapsan a uno solo', () => {
  const parts = [
    { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
    { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
    { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
  ];
  assert.deepEqual(formatEgresoPartsForText(parts), ['DIURESIS NC']);
});

test('formatEgresoPartsForText — 1 de 3 turnos cuantificado muestra (valor, 1T)', () => {
  const parts = [
    { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
    { kind: 'diuresis', label: 'DIURESIS', value: 230 },
    { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
  ];
  assert.deepEqual(formatEgresoPartsForText(parts), ['DIURESIS (230, 1T)']);
});

test('formatEgresoPartsForText — 2 de 3 turnos cuantificados suman y muestran (suma, 2T)', () => {
  const parts = [
    { kind: 'diuresis', label: 'DIURESIS', value: 300 },
    { kind: 'diuresis', label: 'DIURESIS', value: 200 },
    { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
  ];
  assert.deepEqual(formatEgresoPartsForText(parts), ['DIURESIS (500, 2T)']);
});

test('formatEgresoPartsForText — otros egresos no se colapsan y mantienen su orden', () => {
  const parts = [
    { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
    { kind: 'drain', label: 'DRENAJE', value: 50 },
    { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
  ];
  assert.deepEqual(formatEgresoPartsForText(parts), ['DIURESIS NC', 'DRENAJE 50 CC']);
});

test('formatIoClauseForSoap — colapsa turnos NC de diuresis en el texto final', () => {
  const clause = formatIoClauseForSoap(
    {
      ing: 1100,
      egrParts: [
        { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
        { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
        { kind: 'diuresis', label: 'DIURESIS', value: 'NC' },
      ],
      evac: 1,
    },
    NaN
  );
  assert.equal(clause, 'INGRESOS 1100 CC, DIURESIS NC, EVACUACIONES 1, BALANCE NC');
});
