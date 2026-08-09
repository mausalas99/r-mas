import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIndicacionesPaste } from './med-receta-parse.mjs';
import { classifyMedicationSoapCategory } from './med-receta-core.mjs';
import { bucketsFromRecetaItems } from './features/estado-actual-meds-receta-buckets.mjs';
import {
  isInsulinPrandialMedicationItem,
  parseInsulinPrandialSlot,
  patientHasInsulinPrandialMeds,
  insulinPrandialItemsFromList,
} from './insulin-prandial-detect.mjs';
import {
  insulinPrandialNmSoapFragment,
  INSULIN_PRANDIAL_NM_PREFIX,
} from './insulin-prandial-display.mjs';
import { isInsulinRescateMedicationItem } from './insulin-rescate-detect.mjs';

var PRANDIAL_MEAL_NAMES_PASTE =
  '09/08/2026 11:53:05 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t7 UI // ANTES DE LA CENA\tUNICA VEZ\tCA-STBY\n' +
  '09/08/2026 11:53:05 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t7 UI // ANTES DEL DESAYUNO\tUNICA VEZ\tCA-STBY\n' +
  '09/08/2026 11:53:05 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t7 UI // ANTES DE LA COMIDA\tUNICA VEZ\tCA-STBY\n' +
  '09/08/2026 11:54:10 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t8 UI // ANTES DEL DESAYUNO\tUNICA VEZ\tSTBY\n' +
  '09/08/2026 11:54:10 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t8 UI // ANTES DE LA COMIDA\tUNICA VEZ\tSTBY\n' +
  '09/08/2026 11:54:10 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t8 UI // ANTES DE LA CENA\tUNICA VEZ\tSTBY\n' +
  '09/08/2026 09:34:07 a.m.\tMEDICAMENTOS\tINSULINA GLARGINA\tVIA SUBCUTANEA\t25 UI //\tCADA 24 HORAS\tNW\n' +
  '09/08/2026 09:33:43 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t2 UI // CRITERIO PRN: EN CASO DE DESTROXTIS ENTRE 140 - 180\tPRN\tNW';

var PRANDIAL_AM_PM_PASTE =
  '09/08/2026 11:55:11 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t8 UI // EN AM\tUNICA VEZ\tSTBY\n' +
  '09/08/2026 11:55:11 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t8 UI // EN MEDIODIA\tUNICA VEZ\tSTBY\n' +
  '09/08/2026 11:55:11 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t8 UI // EN PM\tUNICA VEZ\tSTBY\n' +
  '09/08/2026 09:34:07 a.m.\tMEDICAMENTOS\tINSULINA GLARGINA\tVIA SUBCUTANEA\t25 UI //\tCADA 24 HORAS\tNW';

test('parseInsulinPrandialSlot — comida y turno AM/PM', () => {
  assert.equal(parseInsulinPrandialSlot('7 UI // ANTES DEL DESAYUNO'), 'desayuno');
  assert.equal(parseInsulinPrandialSlot('7 UI // ANTES DE LA COMIDA'), 'comida');
  assert.equal(parseInsulinPrandialSlot('7 UI // ANTES DE LA CENA'), 'cena');
  assert.equal(parseInsulinPrandialSlot('8 UI // EN AM'), 'desayuno');
  assert.equal(parseInsulinPrandialSlot('8 UI // EN MEDIODIA'), 'comida');
  assert.equal(parseInsulinPrandialSlot('8 UI // EN PM'), 'cena');
  assert.equal(parseInsulinPrandialSlot('25 UI //'), null);
  assert.equal(parseInsulinPrandialSlot('2 UI // CRITERIO PRN: DESTROXTIS 140-180'), null);
});

test('isInsulinPrandialMedicationItem — paste con nombres de comida', () => {
  var parsed = parseIndicacionesPaste(PRANDIAL_MEAL_NAMES_PASTE);
  var prandial = insulinPrandialItemsFromList(parsed.items);
  assert.equal(prandial.length, 6);
  assert.equal(patientHasInsulinPrandialMeds(parsed.items), true);
  prandial.forEach(function (it) {
    assert.equal(isInsulinPrandialMedicationItem(it), true);
    assert.equal(isInsulinRescateMedicationItem(it), false);
  });
  var glargina = parsed.items.find(function (it) {
    return /GLARGINA/i.test(it.nombreRaw || '');
  });
  assert.equal(isInsulinPrandialMedicationItem(glargina), false);
  var rescate = parsed.items.find(function (it) {
    return /DESTROXTIS/i.test(it.dosisRaw || '');
  });
  assert.equal(isInsulinPrandialMedicationItem(rescate), false);
  assert.equal(isInsulinRescateMedicationItem(rescate), true);
});

test('isInsulinPrandialMedicationItem — paste con EN AM/MEDIODIA/PM', () => {
  var parsed = parseIndicacionesPaste(PRANDIAL_AM_PM_PASTE);
  var prandial = insulinPrandialItemsFromList(parsed.items);
  assert.equal(prandial.length, 3);
  assert.deepEqual(
    prandial.map(function (it) {
      return parseInsulinPrandialSlot(it.dosisRaw);
    }),
    ['desayuno', 'comida', 'cena']
  );
});

test('insulinPrandialNmSoapFragment — agrupa por comida con última dosis', () => {
  var parsed = parseIndicacionesPaste(PRANDIAL_MEAL_NAMES_PASTE);
  var prandial = insulinPrandialItemsFromList(parsed.items);
  var frag = insulinPrandialNmSoapFragment(parsed.items, prandial);
  assert.equal(frag, 'INSULINA PREPRANDIAL: 8 UI SC PREVIO A COMIDAS');
});

test('insulinPrandialNmSoapFragment — EN AM/MEDIODIA/PM', () => {
  var parsed = parseIndicacionesPaste(PRANDIAL_AM_PM_PASTE);
  var frag = insulinPrandialNmSoapFragment(parsed.items, parsed.items);
  assert.equal(frag, 'INSULINA PREPRANDIAL: 8 UI SC PREVIO A COMIDAS');
});

test('insulinPrandialNmSoapFragment — dosis distintas por comida', () => {
  var parsed = parseIndicacionesPaste(
    '09/08/2026 11:55:11 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t6 UI // EN AM\tUNICA VEZ\tSTBY\n' +
      '09/08/2026 11:55:11 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t8 UI // EN MEDIODIA\tUNICA VEZ\tSTBY\n' +
      '09/08/2026 11:55:11 a.m.\tMEDICAMENTOS\tINSULINA HUMANA RAPIDA\tVIA SUBCUTANEA\t10 UI // EN PM\tUNICA VEZ\tSTBY'
  );
  var frag = insulinPrandialNmSoapFragment(parsed.items, parsed.items);
  assert.equal(
    frag,
    'INSULINA PREPRANDIAL: 6 UI SC DESAYUNO, 8 UI SC COMIDA, 10 UI SC CENA'
  );
});

test('bucketsFromRecetaItems — preprandial consolidada en NM sin líneas sueltas', () => {
  var parsed = parseIndicacionesPaste(PRANDIAL_MEAL_NAMES_PASTE);
  var sel = {};
  parsed.items.forEach(function (it) {
    sel[it.id] = true;
  });
  var buckets = bucketsFromRecetaItems(parsed.items, sel, classifyMedicationSoapCategory);
  assert.match(buckets.nm, /^INSULINA PREPRANDIAL:/);
  assert.match(buckets.nm, /INSULINA GLARGINA/);
  assert.match(buckets.nm, /RESCATES DE INSULINA/);
  assert.doesNotMatch(buckets.nm, /ANTES DE LA CENA/i);
});
