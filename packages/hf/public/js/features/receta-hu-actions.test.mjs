import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rt } from './receta-hu-shared.mjs';
import { recetaHuAddConsultService } from './receta-hu-actions.mjs';

function mountContainer() {
  document.body.innerHTML =
    '<div id="receta-hu-container"><select id="receta-hu-consult-servicio"></select></div>';
}

test('recetaHuAddConsultService shows a DOM modal (not window.prompt) and adds the typed service', async () => {
  if (typeof document === 'undefined') return;
  mountContainer();
  rt.getActiveId = function () {
    return null;
  };
  var settings = { recetaHuConsultServices: [] };
  rt.getSettings = function () {
    return settings;
  };

  var pending = recetaHuAddConsultService();
  var input = document.querySelector('[data-text-prompt-input]');
  assert.ok(input, 'modal input should be in the DOM');
  input.value = 'Nefrología';
  document.querySelector('[data-text-prompt-confirm]').click();
  await pending;

  assert.ok(settings.recetaHuConsultServices.includes('Nefrología'));
  var sel = document.getElementById('receta-hu-consult-servicio');
  assert.equal(sel.value, 'Nefrología');
});

test('recetaHuAddConsultService adds nothing when the modal is cancelled', async () => {
  if (typeof document === 'undefined') return;
  mountContainer();
  rt.getActiveId = function () {
    return null;
  };
  var settings = { recetaHuConsultServices: [] };
  rt.getSettings = function () {
    return settings;
  };

  var pending = recetaHuAddConsultService();
  document.querySelector('[data-text-prompt-cancel]').click();
  await pending;

  assert.deepEqual(settings.recetaHuConsultServices, []);
});
