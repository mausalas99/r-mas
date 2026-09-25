import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractWeekdayScheduleLabel,
  formatRhzeComboSoapShort,
  isRhzeComboMedicationItem,
} from './med-receta-format.mjs';
import { formatMedicationSoapShort, parseMedicationPaste } from './med-receta-core.mjs';

test('isRhzeComboMedicationItem detecta FDC RHZE', () => {
  assert.equal(
    isRhzeComboMedicationItem({
      nombreRaw: 'RIFAMPICINA/ISONIAZIDA/PIRAZINAMIDA/ETAMBUTOL 150/75/400/300 MG TABLETA',
    }),
    true
  );
  assert.equal(isRhzeComboMedicationItem({ nombreRaw: 'RIFAMPICINA 300 MG TABLETA' }), false);
});

test('extractWeekdayScheduleLabel lee LUN-MIE-VIE en comentario de dosis', () => {
  assert.equal(
    extractWeekdayScheduleLabel('4 TABLETA // DAR LOS LUNES - MIE - VIE *DIA# 7*'),
    'LUN-MIE-VIE'
  );
  assert.equal(extractWeekdayScheduleLabel('4 TABLETA // *DIA# 3*'), null);
});

test('formatRhzeComboSoapShort — mantenimiento LUN-MIE-VIE vs intensivo C/24H', () => {
  var maintLine =
    '02/05/2026 08:31:38 a.m.\tMEDICAMENTOS\tRIFAMPICINA/ISONIAZIDA/PIRAZINAMIDA/ETAMBUTOL 150/75/400/300 MG TABLETA\tVIA ORAL\t4 TABLETA // DAR LOS LUNES - MIE - VIE *DIA# 7*\tCADA 24 HORAS\tNW';
  var dailyLine =
    '02/05/2026 08:31:38 a.m.\tMEDICAMENTOS\tRIFAMPICINA/ISONIAZIDA/PIRAZINAMIDA/ETAMBUTOL 150/75/400/300 MG TABLETA\tVIA ORAL\t4 TABLETA // *DIA# 3*\tCADA 24 HORAS\tNW';

  var maint = parseMedicationPaste(maintLine).items[0];
  var daily = parseMedicationPaste(dailyLine).items[0];

  assert.equal(formatRhzeComboSoapShort(maint), 'DOTBAL 4 TABLETAS LUN-MIE-VIE DIA 7');
  assert.equal(formatRhzeComboSoapShort(daily), 'DOTBAL 4 TABLETAS C/24H DIA 3');
  assert.equal(formatMedicationSoapShort(maint), 'DOTBAL 4 TABLETAS LUN-MIE-VIE DIA 7');
  assert.equal(formatMedicationSoapShort(daily), 'DOTBAL 4 TABLETAS C/24H DIA 3');
});
