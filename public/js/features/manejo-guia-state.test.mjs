import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIA_MODES,
  getGuiaMode,
  setGuiaMode,
  getGuiaView,
  getGuiaEntityId,
  navigateGuia,
  migrateLegacyManejoSubtab,
  resetGuiaStateForTests,
} from './manejo-guia-state.mjs';

test('GUIA_MODES includes patologia infusion atb', () => {
  assert.deepEqual(GUIA_MODES, ['patologia', 'infusion', 'atb']);
});

test('migrateLegacyManejoSubtab maps old subtabs', () => {
  resetGuiaStateForTests();
  assert.equal(migrateLegacyManejoSubtab('patologias'), 'patologia');
  assert.equal(migrateLegacyManejoSubtab('infusiones'), 'infusion');
  assert.equal(migrateLegacyManejoSubtab('protocolos'), 'infusion');
  assert.equal(migrateLegacyManejoSubtab('atb'), 'atb');
  assert.equal(migrateLegacyManejoSubtab('cad-ehh'), 'patologia');
  assert.equal(migrateLegacyManejoSubtab('electrolitos'), null);
});

test('navigateGuia sets mode view entity', () => {
  resetGuiaStateForTests();
  navigateGuia({ mode: 'patologia', view: 'lectura', entityId: 'hyperkalemia-acute' });
  assert.equal(getGuiaMode(), 'patologia');
  assert.equal(getGuiaView(), 'lectura');
  assert.equal(getGuiaEntityId(), 'hyperkalemia-acute');
});

test('setGuiaMode from lectura resets to indice', () => {
  resetGuiaStateForTests();
  navigateGuia({ mode: 'patologia', view: 'lectura', entityId: 'x' });
  setGuiaMode('infusion');
  assert.equal(getGuiaView(), 'indice');
  assert.equal(getGuiaEntityId(), '');
});
