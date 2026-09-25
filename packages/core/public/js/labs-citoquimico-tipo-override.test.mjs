import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citoquimicoTipoFingerprintFromLine_,
  citoquimicoTipoValueFromLine_,
  getCitoquimicoTipoOverride,
  setCitoquimicoTipoOverride,
  clearCitoquimicoTipoOverrideForTests,
} from './labs-citoquimico-tipo-override.mjs';

test('citoquimicoTipoValueFromLine_ — extrae el valor actual de Tipo', () => {
  var line = 'Liq:\tTipo LIQUIDO PERITONEAL Dens 1.010 pH 7.40';
  assert.equal(citoquimicoTipoValueFromLine_(line), 'LIQUIDO PERITONEAL');
});

test('citoquimicoTipoFingerprintFromLine_ — ignora el valor de Tipo, usa el resto de columnas', () => {
  var withWrongTipo = 'Liq:\tTipo BACTERIOLOGIA Dens 1.010 pH 7.40 Glu 90';
  var withRightTipo = 'Liq:\tTipo LIQUIDO PERITONEAL Dens 1.010 pH 7.40 Glu 90';
  var differentBlock = 'Liq:\tTipo LIQUIDO PERITONEAL Dens 1.020 pH 7.40 Glu 90';
  assert.equal(
    citoquimicoTipoFingerprintFromLine_(withWrongTipo),
    citoquimicoTipoFingerprintFromLine_(withRightTipo)
  );
  assert.notEqual(
    citoquimicoTipoFingerprintFromLine_(withRightTipo),
    citoquimicoTipoFingerprintFromLine_(differentBlock)
  );
});

test('setCitoquimicoTipoOverride/getCitoquimicoTipoOverride — round trip por huella', () => {
  clearCitoquimicoTipoOverrideForTests();
  var fp = citoquimicoTipoFingerprintFromLine_('Liq:\tTipo BACTERIOLOGIA Dens 1.010 pH 7.40');
  assert.equal(getCitoquimicoTipoOverride(fp), '');
  setCitoquimicoTipoOverride(fp, 'liquido peritoneal');
  assert.equal(getCitoquimicoTipoOverride(fp), 'LIQUIDO PERITONEAL');
  clearCitoquimicoTipoOverrideForTests();
  assert.equal(getCitoquimicoTipoOverride(fp), '', 'clearCitoquimicoTipoOverrideForTests reinicia la caché en memoria');
});

test('setCitoquimicoTipoOverride — nombre vacío borra el override', () => {
  clearCitoquimicoTipoOverrideForTests();
  var fp = citoquimicoTipoFingerprintFromLine_('Liq:\tTipo BACTERIOLOGIA Dens 1.010 pH 7.40');
  setCitoquimicoTipoOverride(fp, 'LIQUIDO ASCITICO');
  assert.equal(getCitoquimicoTipoOverride(fp), 'LIQUIDO ASCITICO');
  setCitoquimicoTipoOverride(fp, '');
  assert.equal(getCitoquimicoTipoOverride(fp), '');
  clearCitoquimicoTipoOverrideForTests();
});
