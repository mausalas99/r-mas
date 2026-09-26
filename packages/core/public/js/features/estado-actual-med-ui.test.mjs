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
  assert.match(html, /\+ Categoría/);
  assert.doesNotMatch(html, /Sin medicamentos/);
});

test('renderMedCategoryGrid pone title con el texto completo y escapado', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.analgesia = 'PARACETAMOL 500MG "dosis alta" <riesgo>';
  const html = renderMedCategoryGrid(m, null, {});
  assert.match(html, /class="ea-med-item-text" title="PARACETAMOL 500MG &quot;dosis alta&quot; &lt;riesgo&gt;"/);
  assert.doesNotMatch(html, /title="[^"]*<riesgo/);
});

test('renderMedCategoryGrid avanza día de ATB sin reimportar SOME', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.abx = 'LINEZOLID 600MG VO C/12H DÍA 5';
  m.confirmado.abx = true;
  const receta = {
    p1: {
      fechaActualizacion: '10/08/2026',
      items: [
        {
          id: 'a',
          nombreRaw: 'LINEZOLID 600 MG',
          dosisRaw: '600 MG // *DIA# 5*',
          viaRaw: 'VO',
          frecuenciaRaw: 'CADA 12 HORAS',
          diaTratamiento: 5,
        },
      ],
    },
  };
  const html = renderMedCategoryGrid(m, 'p1', receta, undefined, new Date(2026, 7, 13));
  assert.match(html, /ea-med-item-text" title="[^"]*DIA 8/);
  assert.doesNotMatch(html, /ea-med-item-text" title="[^"]*DÍA 5/);
  assert.doesNotMatch(html, /ea-med-item-text" title="[^"]*DIA 5/);
});

test('renderMedCategoryGrid titula "NM" junto a Antidiabéticos', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.nm = serializeMedFieldItems([
    'INSULINA GLARGINA 30UI SC C/24H',
    'ACIDO FOLICO 5MG VO C/24H',
  ]);
  const html = renderMedCategoryGrid(m, null, {});
  assert.match(html, /Antidiabéticos[\s\S]*INSULINA GLARGINA[\s\S]*ea-med-subcat-title">NM<[\s\S]*ACIDO FOLICO/);
  assert.match(html, /data-ea-med-remove="nm" data-ea-med-idx="1"/);
  m.estadoClinico.nm = 'ACIDO FOLICO 5MG VO C/24H';
  assert.doesNotMatch(renderMedCategoryGrid(m, null, {}), /ea-med-subcat/);
});

test('renderMedCategoryGrid fija cada categoría a su mitad', () => {
  const colOf = (html, key) => {
    const i = html.indexOf('data-ea-med-cat="' + key + '"');
    return html.slice(0, i).match(/data-ea-med-col="(\d)"/g).pop();
  };
  const a = emptyMonitoreo();
  a.estadoClinico.estatinas = 'ATORVASTATINA 40MG VO C/24H';
  a.estadoClinico.nm = 'LEVOTIROXINA 175MCG VO C/24H';
  const b = emptyMonitoreo();
  b.estadoClinico.analgesia = 'PARACETAMOL 1 G VO C/8H';
  b.estadoClinico.abx = 'CEFTRIAXONA 1 G IV C/24H';
  b.estadoClinico.estatinas = 'ATORVASTATINA 40MG VO C/24H';
  b.estadoClinico.nm = 'LEVOTIROXINA 175MCG VO C/24H';
  const ha = renderMedCategoryGrid(a, null, {});
  const hb = renderMedCategoryGrid(b, null, {});
  assert.equal((ha.match(/class="ea-med-col"/g) || []).length, 2);
  assert.equal(colOf(ha, 'estatinas'), colOf(hb, 'estatinas'));
  assert.equal(colOf(ha, 'nm'), colOf(hb, 'nm'));
  assert.equal(colOf(hb, 'nm'), 'data-ea-med-col="1"');
  assert.equal(colOf(hb, 'abx'), 'data-ea-med-col="0"');
});

test('renderMedCategoryGrid separa nombre y dosis sin perder texto', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.antihta = serializeMedFieldItems(['NIFEDIPINO 30MG VO C/24H', 'RESCATES DE INSULINA']);
  const html = renderMedCategoryGrid(m, null, {});
  assert.match(html, /<span class="ea-med-item-name">NIFEDIPINO<\/span> <span class="ea-med-item-dose">30MG VO C\/24H<\/span>/);
  assert.match(html, /title="RESCATES DE INSULINA">RESCATES DE INSULINA</);
});

test('grupo plegado muestra solo nombres de fármacos', () => {
  const m = emptyMonitoreo();
  m.estadoClinico.antihta = serializeMedFieldItems(['NIFEDIPINO 30MG VO C/24H', 'TELMISARTAN 40MG VO C/24H']);
  const html = renderMedCategoryGrid(m, null, {});
  assert.match(html, /ea-med-cat-preview ea-muted">NIFEDIPINO · TELMISARTAN</);
});
