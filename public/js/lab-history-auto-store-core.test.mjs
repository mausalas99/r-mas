import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLabLine,
  areLabSetsEquivalent,
  isDuplicateAgainstLatest,
  areDuplicateLabSets,
  findDuplicateLabSetIdsToRemove,
  stripExactDuplicateLabSets,
  analyteFingerprintFromResLabs,
  stripDuplicateLabSets,
  findNormalizedSourceDuplicateGroups,
  findConflictingSameDateTimeGroups,
  findLabSetsByDateTime,
  planLabHistoryDateTimeUpsert,
  gasometriaFingerprintFromResLabs,
} from './lab-history-auto-store-core.mjs';

test('normalizeLabLine colapsa espacios y trim', () => {
  assert.equal(normalizeLabLine('  Hb   12.1   g/dL  '), 'Hb 12.1 g/dL');
});

test('areLabSetsEquivalent detecta igualdad semantica', () => {
  var a = ['Hb  12.1 g/dL', 'Cr 1.0 mg/dL'];
  var b = [' Hb 12.1 g/dL ', 'Cr   1.0 mg/dL'];
  assert.equal(areLabSetsEquivalent(a, b), true);
});

test('isDuplicateAgainstLatest true cuando coincide fecha/hora/labs', () => {
  var latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  var incoming = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), true);
});

test('isDuplicateAgainstLatest false cuando cambia hora', () => {
  var latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  var incoming = { fecha: '01/05/2026', hora: '10:00', resLabs: ['Hb 12.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), false);
});

test('isDuplicateAgainstLatest false cuando cambia una linea', () => {
  var latest = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1', 'Cr 1.0'] };
  var incoming = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1', 'Cr 1.1'] };
  assert.equal(isDuplicateAgainstLatest(latest, incoming), false);
});

test('areDuplicateLabSets simétrico', () => {
  var x = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  var y = { fecha: '01/05/2026', hora: '08:30', resLabs: ['Hb 12.1'] };
  assert.equal(areDuplicateLabSets(x, y), true);
  assert.equal(areDuplicateLabSets(y, x), true);
});

test('findDuplicateLabSetIdsToRemove conserva id más antiguo', () => {
  var sets = [
    { id: '200', fecha: '01/01/2026', hora: '10:00', resLabs: ['Hb 12.1'] },
    { id: '100', fecha: '01/01/2026', hora: '10:00', resLabs: ['Hb 12.1'] },
  ];
  assert.deepEqual(findDuplicateLabSetIdsToRemove(sets), ['200']);
});

test('findDuplicateLabSetIdsToRemove cadena triple deja uno', () => {
  var sets = [
    { id: '10', fecha: '01/01/2026', hora: '10:00', resLabs: ['A'] },
    { id: '20', fecha: '01/01/2026', hora: '10:00', resLabs: ['A'] },
    { id: '30', fecha: '01/01/2026', hora: '10:00', resLabs: ['A'] },
  ];
  var rm = findDuplicateLabSetIdsToRemove(sets).sort();
  assert.deepEqual(rm, ['20', '30']);
});

test('findDuplicateLabSetIdsToRemove vacío si hora distinta', () => {
  var sets = [
    { id: '100', fecha: '01/01/2026', hora: '10:00', resLabs: ['Hb 12.1'] },
    { id: '200', fecha: '01/01/2026', hora: '11:00', resLabs: ['Hb 12.1'] },
  ];
  assert.deepEqual(findDuplicateLabSetIdsToRemove(sets), []);
});

test('stripExactDuplicateLabSets deja un set por firma y no toca horas distintas', () => {
  var stripped = stripExactDuplicateLabSets([
    { id: '200', fecha: '13/08/2026', hora: '11:40', resLabs: ['COAG\tTTP 39.3*'] },
    { id: '100', fecha: '13/08/2026', hora: '11:40', resLabs: ['COAG\tTTP 39.3*'] },
    { id: '300', fecha: '13/08/2026', hora: '09:13', resLabs: ['FEB\tTifO neg'] },
  ]);
  assert.deepEqual(stripped.removedIds, ['200']);
  assert.equal(stripped.sets.length, 2);
  assert.equal(stripped.sets[0].id, '100');
  assert.equal(stripped.sets[1].id, '300');
});

test('analyteFingerprintFromResLabs ignora formato de línea y cultivos sin números', () => {
  var a = analyteFingerprintFromResLabs(['COAG\tTP 12.9 TTP 39.3* INR 1.1']);
  var b = analyteFingerprintFromResLabs(['COAG TP 12.9 TTP 39.3* INR 1.1']);
  assert.equal(a, b);
  assert.match(a, /COAG\.TTP:39\.3/);
  assert.equal(analyteFingerprintFromResLabs(['UROCULTIVO: NEGATIVO A LA FECHA']), '');
});

test('stripDuplicateLabSets une clones de Nube con mismo analito y otra hora/id', () => {
  var stripped = stripDuplicateLabSets([
    { id: 'nube', fecha: '13/08/2026', hora: '11:41', resLabs: ['COAG\tTP 12.9 TTP 39.3* INR 1.1'] },
    { id: 'local', fecha: '13/08/2026', hora: '11:40', resLabs: ['COAG TP 12.9 TTP 39.3* INR 1.1'] },
    { id: 'am', fecha: '13/08/2026', hora: '04:23', resLabs: ['BH\tHb 12.3* Hto 36.8*'] },
  ]);
  assert.equal(stripped.sets.length, 2);
  assert.deepEqual(
    stripped.sets.map(function (s) {
      return s.id;
    }).sort(),
    ['am', 'local'],
  );
});

test('findNormalizedSourceDuplicateGroups mismo sourceText distinto id', () => {
  var longSrc =
    'LABORATORIO CLÍNICO INFORME MUY LARGO PARA SUPERAR UMBRAL DE FILTRO mínimo requerido en el analizador de duplicados';
  var sets = [
    { id: '1', fecha: '01/01/2026', hora: '10:00', resLabs: ['Hb 12'], sourceText: longSrc },
    { id: '2', fecha: '02/01/2026', hora: '', resLabs: ['Cr 1'], sourceText: '  ' + longSrc + '  ' },
  ];
  var g = findNormalizedSourceDuplicateGroups(sets);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].ids.sort(), ['1', '2']);
});

test('findConflictingSameDateTimeGroups detecta misma fecha/hora labs distintos', () => {
  var sets = [
    { id: '1', fecha: '01/01/2026', hora: '10:00', resLabs: ['Hb 12'] },
    { id: '2', fecha: '01/01/2026', hora: '10:00', resLabs: ['Hb 13'] },
  ];
  var g = findConflictingSameDateTimeGroups(sets);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].ids.sort(), ['1', '2']);
});

test('findConflictingSameDateTimeGroups vacío si contenido equivalente', () => {
  var sets = [
    { id: '1', fecha: '01/01/2026', hora: '10:00', resLabs: ['Hb  12'] },
    { id: '2', fecha: '01/01/2026', hora: '10:00', resLabs: ['Hb 12'] },
  ];
  assert.deepEqual(findConflictingSameDateTimeGroups(sets), []);
});

test('findLabSetsByDateTime ordena por id y exige hora', () => {
  var sets = [
    { id: '200', fecha: '31/07/2026', hora: '13:51', resLabs: ['BH\tHb 12'] },
    { id: '100', fecha: '31/07/2026', hora: '13:51', resLabs: ['QS\tGlu 90'] },
    { id: '300', fecha: '31/07/2026', hora: '', resLabs: ['BH\tHb 11'] },
  ];
  var m = findLabSetsByDateTime(sets, '31/07/2026', '13:51');
  assert.deepEqual(
    m.map(function (s) {
      return s.id;
    }),
    ['100', '200']
  );
  assert.deepEqual(findLabSetsByDateTime(sets, '31/07/2026', ''), []);
});

test('planLabHistoryDateTimeUpsert skip / merge / add', () => {
  var existing = [{ id: '1', fecha: '31/07/2026', hora: '13:51', resLabs: ['BH\tHb 12.9'] }];
  assert.equal(
    planLabHistoryDateTimeUpsert(existing, {
      fecha: '31/07/2026',
      hora: '13:51',
      resLabs: ['BH\tHb 12.9'],
    }).action,
    'skip'
  );
  assert.equal(
    planLabHistoryDateTimeUpsert(existing, {
      fecha: '31/07/2026',
      hora: '13:51',
      resLabs: ['QS\tGlu 83'],
    }).action,
    'merge'
  );
  assert.equal(
    planLabHistoryDateTimeUpsert(existing, {
      fecha: '31/07/2026',
      hora: '14:00',
      resLabs: ['BH\tHb 12.9'],
    }).action,
    'add'
  );
});

test('gasometriaFingerprintFromResLabs igual para mismos GASES', () => {
  var a = gasometriaFingerprintFromResLabs(['BH\tHb 12', 'GASES\tpH 7.36 pCO2 40']);
  var b = gasometriaFingerprintFromResLabs(['GASES\t  pH 7.36   pCO2 40', 'QS\tGlu 90']);
  var c = gasometriaFingerprintFromResLabs(['GASES\tpH 7.30 pCO2 40']);
  assert.ok(a);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('gasometriaFingerprintFromResLabs ignora AG/AGc/Delta (mismo draw)', () => {
  var lean = gasometriaFingerprintFromResLabs([
    'GASES\tpH 7.32 pCO2 44 pO2 70 Lactato 0.8 Bica 22.7',
  ]);
  var rich = gasometriaFingerprintFromResLabs([
    'GASES\tpH 7.32 pCO2 44 pO2 70 Lactato 0.8 Bica 22.7 AG 11.5 AGc 16.5 Delta-Delta 3.5',
  ]);
  assert.ok(lean);
  assert.equal(lean, rich);
});

test('planLabHistoryDateTimeUpsert trata 05:51 y 05:51:00 como la misma hora', () => {
  var existing = [{ id: '1', fecha: '03/08/2026', hora: '05:51', resLabs: ['BH\tHb 9'] }];
  var plan = planLabHistoryDateTimeUpsert(existing, {
    fecha: '03/08/2026',
    hora: '05:51:00',
    resLabs: ['QS\tGlu 73'],
  });
  assert.equal(plan.action, 'merge');
});

test('planLabHistoryDateTimeUpsert merge colapsa hermanos misma hora', () => {
  var existing = [
    { id: '1', fecha: '31/07/2026', hora: '13:51', resLabs: ['BH\tHb 12'] },
    { id: '2', fecha: '31/07/2026', hora: '13:51', resLabs: ['BH\tHb 12'] },
  ];
  var plan = planLabHistoryDateTimeUpsert(existing, {
    fecha: '31/07/2026',
    hora: '13:51',
    resLabs: ['BH\tHb 12'],
  });
  assert.equal(plan.action, 'merge');
  assert.equal(plan.keeper.id, '1');
  assert.equal(plan.siblings.length, 1);
});
