import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExtendedLabPanels_ } from './labs-panel-parse.mjs';

const HEAD = 'Servicio de Reumatología Hoja: 1/1\nLaboratorio Clínico\nPaciente: X Id: 1\n';

const QFT =
  HEAD +
  'PARAMETRO MEDIDO Ag-TB1 (ESAT-6) Ag-TB2 (CFP-10) Mitógeno Interpretación Quantiferón TB\n' +
  'UNIDADES REFERENCIA\nRESULTADO UBICACION 0.0\nUI/mL <0.35\n0.13\nUI/mL <0.35\n0.83\nUI/mL\nNEGATIVO\nNegativo\nMuestra: Plasma.\n';

const PANEL =
  HEAD +
  'C3 - <4.0 mg/dL 90-180 [ * ]\nC4 - <1.5 mg/dL 10-40 [ * ]\n' +
  'AC-4 MOTEADO FINO (NUCLEAR) + 1:1280\n' +
  'Anti-dsDNA Título: POSITIVO 1:80 (ref. <1:20)\n' +
  'Anti-dsDNA-NcX (IgG): POSITIVO 192.6 UI/mL (ref. <100.0)\n' +
  'Anti-SS-A/Ro (Ro60 kDa): Negativo <2.0 U/mL (ref. 0-20)\n' +
  'Anti SS-B/La: Negativo <2.0 U/mL (ref. 0-20)\n' +
  'Anti-Sm: Positivo >200.0 U/mL (ref. 0-20)\n' +
  'ß2-Glicoproteína 1 IgG: NEGATIVO 2.3 UR/mL (<20.0)\n' +
  'ß2-Glicoproteína 1 IgA: NEGATIVO 11.8 UR/mL (<20.0)\n' +
  'B2GP1: NEGATIVO <3.6 CU (<20.0)\n' +
  'Cardiolipina IgG: 3.5 U IgG-FL/mL (0-12)\nCardiolipina IgM: 15.7 U IgM-FL/mL (0-12)\n';

const line = (k, ls) => ls.find((l) => l.startsWith(k + '\t'));

test('Quantiferón: valores desordenados del PDF', () => {
  assert.equal(line('TB', parseExtendedLabPanels_(QFT)), 'TB\tTB1 0.0 TB2 0.13 Mit 0.83 QFT neg');
});

test('Reumatología: C3/C4 bajos', () => {
  assert.equal(line('INM', parseExtendedLabPanels_(PANEL)), 'INM\tC3 <4.0* C4 <1.5*');
});

test('Reumatología: autoinmunidad', () => {
  const ls = parseExtendedLabPanels_(PANEL);
  assert.equal(line('ANA', ls), 'ANA\tANA 1:1280* ICAP AC-4 dsDNA 1:80* NcX 192.6*');
  assert.equal(line('ENA', ls), 'ENA\tSSA <2.0 SSB <2.0 Sm >200.0*');
  assert.equal(line('APL', ls), 'APL\tB2GP-G 2.3 B2GP-A 11.8 B2GP-CIA <3.6 aCL-G 3.5 aCL-M 15.7*');
});

test('sin encabezado del laboratorio no emite nada', () => {
  assert.deepEqual(parseExtendedLabPanels_('C3 - 100 mg/dL 90-180'), []);
});

import { buildBulkLabPreview } from './lab-bulk-paste.mjs';

const PAGE = (n, body) =>
  `Servicio de Reumatología Hoja: ${n}/2\n[INSTITUCIÓN]\nLaboratorio Clínico\n` +
  'Paciente: SINTETICO1   Id: T-1   Edad: 35 años\n' +
  'Médico: DR PRUEBA   Fecha: 22-SEP-2026   Hora: 16:18\nCédula: 1   Cuarto: 2\n' +
  body +
  'Fec: 24-SEP-2026 Hora: 19:38\nMOP-254-07-RC-006\n________________________\n';

test('pegado Reumatología: páginas se unen y salen paneles + cabecera', () => {
  const text =
    PAGE(1, 'C3 - <4.0 mg/dL 90-180 [ * ]\n') +
    PAGE(2, 'Anti-Sm: Positivo >200.0 U/mL (ref. 0-20)\nCardiolipina IgG: 3.5 U IgG-FL/mL (0-12)\n');
  const [block] = buildBulkLabPreview(text, {});
  const rep = block.reports[0];
  assert.equal(block.reports.length, 1);
  assert.equal(rep.ok, true);
  assert.equal(rep.expediente, 'T-1');
  assert.equal(rep.nombre, 'SINTETICO1');
  assert.match(rep.fecha, /22/);
  assert.match(rep.hora, /16:18/);
  const all = rep.result.resLabs.join('\n');
  assert.match(all, /INM\tC3 <4\.0\*/);
  assert.match(all, /ENA\tSm >200\.0\*/);
  assert.match(all, /APL\taCL-G 3\.5/);
});

test('Reumatología: variante con «C3:», «(ref. …)» y «(título)»', () => {
  const v2 =
    HEAD +
    'C3: <4.0 mg/dL (ref. 90-180) [ * ]\nC4: 20 mg/dL (ref. 10-40)\n' +
    'Anti-dsDNA (título): POSITIVO 1:80 (ref. <1:20)\n' +
    'Cardiolipina IgM: 2.7 U IgM-FL/mL (ref. 0-12)\nCardiolipina IgA: 15.7 U IgA-FL/mL (ref. 0-12)\n';
  const ls = parseExtendedLabPanels_(v2);
  assert.equal(line('INM', ls), 'INM\tC3 <4.0* C4 20');
  assert.equal(line('ANA', ls), 'ANA\tdsDNA 1:80*');
  assert.equal(line('APL', ls), 'APL\taCL-M 2.7 aCL-A 15.7*');
});

import { reumToSomeShape } from './labs-reum-parse.mjs';

test('sin línea «Servicio», Id vacío y registro por nombre del censo', () => {
  const raw =
    'Laboratorio Clínico\nPaciente: SINTETICO1   Id:   Edad: 35 años\n' +
    'Médico: DR PRUEBA   Fecha: 22/09/2026   Hora: 16:18\nC3: 100 mg/dL (ref. 90-180)\n';
  const byName = reumToSomeShape(raw, (n) => (n === 'SINTETICO1' ? 'REG-A' : ''));
  assert.match(byName, /^Expediente: REG-A\nNombre: SINTETICO1\nEdad: 35 años/);
  assert.match(byName, /Fecha Registro: 22\/09\/2026 16:18/);
  assert.match(reumToSomeShape(raw), /^Expediente: S\/N\nNombre: SINTETICO1/);
});

import { setNameAlias } from './patient-name-match.mjs';

test('asignación manual guardada: el nombre del reporte usa el registro elegido', () => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) };
  try {
    setNameAlias('sintetico1', 'REG-Z');
    const [block] = buildBulkLabPreview(PAGE(1, 'C3 - <4.0 mg/dL 90-180 [ * ]\n'), {});
    assert.equal(block.reports[0].expediente, 'REG-Z');
  } finally {
    delete globalThis.localStorage;
  }
});

test('PDF en orden visual: celdas pegadas, ref antes del valor, columnas invertidas', () => {
  const t =
    HEAD +
    'C3                          -<4.0   mg/dL   [  *|   ]   90   180\n' +
    'AC-4 MOTEADO FINO (NUCLEAR)        +   1: 1280\n' +
    'Anti-dsDNA          Título     <1:20 POSITIVO 1:80\n' +
    'Anti-dsDNA-NcX (IgG)     UI/mL     <100.0 POSITIVO 192.6\n' +
    'Anti-SS-A/Ro       U/mL     0 - 20 Negativo   <2.0\n' +
    'Anti SS-B/La       -Negativo   <2.0   U/mL   0   20\n' +
    'Anti-Sm            -Positivo   >200.0   U/mL   0   20\n' +
    'ß2-Glicoproteína 1 IgG      UR/mL      <20.0 NEGATIVO 2.3\n' +
    'B2GP1       CU       <20.0 NEGATIVO <3.6\n' +
    'Cardiolipina IgA        - 15.7   U IgA-FL/mL   0   12\n' +
    'Ag-TB1 (ESAT-6)      UI/mL      <0.35 0.0\n' +
    'Ag-TB2 (CFP-10)      UI/mL      <0.35 0.9\n' +
    'Mitógeno      UI/mL 0.83\n' +
    'Interpretación       Negativo NEGATIVO\n';
  const ls = parseExtendedLabPanels_(t);
  assert.equal(line('INM', ls), 'INM\tC3 <4.0*');
  assert.equal(line('ANA', ls), 'ANA\tANA 1:1280* ICAP AC-4 dsDNA 1:80* NcX 192.6*');
  assert.equal(line('ENA', ls), 'ENA\tSSA <2.0 SSB <2.0 Sm >200.0*');
  assert.equal(line('APL', ls), 'APL\tB2GP-G 2.3 B2GP-CIA <3.6 aCL-A 15.7*');
  assert.equal(line('TB', ls), 'TB\tTB1 0.0 TB2 0.9* Mit 0.83 QFT neg');
});

test('Fecha y Hora separadas por otras celdas: la hora se conserva', () => {
  const text = PAGE(1, 'C3 - <4.0 mg/dL 90-180 [ * ]\n').replace(
    'Fecha: 22-SEP-2026   Hora: 16:18',
    'Fecha: 22-SEP-2026   Folio: 99   Hora: 16:18'
  );
  const [block] = buildBulkLabPreview(text, {});
  assert.match(block.reports[0].hora, /16:18/);
});
