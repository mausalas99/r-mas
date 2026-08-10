import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMedFieldItems,
  serializeMedFieldItems,
  addMedFieldItem,
  removeMedFieldItem,
  medCategoryHasContent,
  renderMedCategoryGrid,
} from './estado-actual-med-ui.mjs';
import { emptyMonitoreo } from './estado-actual-data.mjs';

test('parseMedFieldItems splits pipe-separated meds', () => {
  assert.deepEqual(parseMedFieldItems('A | B | C'), ['A', 'B', 'C']);
  assert.deepEqual(parseMedFieldItems(''), []);
});

test('addMedFieldItem appends without duplicates', () => {
  const m = emptyMonitoreo();
  addMedFieldItem(m, 'abx', 'MEROPENEM 1 G IV C/8H');
  addMedFieldItem(m, 'abx', 'FLUCONAZOL 400MG VO C/24H');
  addMedFieldItem(m, 'abx', 'MEROPENEM 1 G IV C/8H');
  assert.equal(m.estadoClinico.abx, 'MEROPENEM 1 G IV C/8H | FLUCONAZOL 400MG VO C/24H');
  assert.equal(m.confirmado.abx, true);
});

test('removeMedFieldItem drops by index', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.nm = serializeMedFieldItems(['INSULINA GLARGINA 12UI SC C/24H', 'LEVOTIROXINA 50MCG VO C/24H']);
  removeMedFieldItem(m, 'nm', 0);
  assert.equal(m.estadoClinico.nm, 'LEVOTIROXINA 50MCG VO C/24H');
});

test('medCategoryHasContent — vacío sin propuesta', () => {
  const m = emptyMonitoreo();
  assert.equal(medCategoryHasContent('analgesia', m, null, {}), false);
  m.estadoClinico.analgesia = 'PARACETAMOL 500MG';
  assert.equal(medCategoryHasContent('analgesia', m, null, {}), true);
});

test('renderMedCategoryGrid omite categorías vacías y ofrece añadir', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.analgesia = 'PARACETAMOL 500MG';
  const html = renderMedCategoryGrid(m, null, {});
  assert.match(html, /data-ea-med-cat="analgesia"/);
  assert.doesNotMatch(html, /data-ea-med-cat="antiemeticos"/);
  assert.match(html, /data-ea-med-pick-category/);
  assert.match(html, /\+ Añadir categoría/);
  assert.doesNotMatch(html, /Sin medicamentos/);
});
