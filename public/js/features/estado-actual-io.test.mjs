import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIoEgresoLine,
  parseIoEvacField,
  computeIoBalanceFromIngEgr,
  formatIoClauseForSoap,
  formatEvacForText,
  diuresisValueFromParts,
  normalizeEvacAbbrev,
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
  assert.match(clauseNc, /BALANCE ___ CC/);
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

test('normalizeEvacAbbrev y soporte desde SAT', () => {
  assert.equal(normalizeEvacAbbrev('NO REPORTADAS'), 'NC');
  assert.equal(soporteFromSatTail('AL AIRE AMBIENTE'), 'Aire ambiente');
  const sat = parseSatLineVariants('SAT: 97% AL AIRE AMBIENTE');
  assert.equal(sat && sat.value, 97);
  assert.equal(sat && sat.soporteHint, 'Aire ambiente');
});
