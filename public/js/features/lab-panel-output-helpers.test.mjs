import test from 'node:test';
import assert from 'node:assert/strict';
import {
  representativeFechaHoraForGroup_,
  appendResLabChunksToBox,
  buildCurrentSetForGroup_,
} from './lab-panel-output-helpers.mjs';

test('representativeFechaHoraForGroup_: picks the most recent set in the cluster', () => {
  var group = {
    sets: [
      { fecha: '10/08/2026', hora: '08:00' },
      { fecha: '10/08/2026', hora: '11:44' },
      { fecha: '09/08/2026', hora: '23:00' },
    ],
  };
  var rep = representativeFechaHoraForGroup_(group);
  assert.equal(rep.fecha, '10/08/2026');
  assert.equal(rep.hora, '11:44');
});

test('representativeFechaHoraForGroup_: falls back to the first set when timestamps are unparseable', () => {
  var group = { sets: [{ fecha: '', hora: '' }, { fecha: '', hora: '' }] };
  var rep = representativeFechaHoraForGroup_(group);
  assert.equal(rep, group.sets[0]);
});

test('representativeFechaHoraForGroup_: empty group returns an empty object', () => {
  assert.deepEqual(representativeFechaHoraForGroup_({}), {});
  assert.deepEqual(representativeFechaHoraForGroup_(null), {});
});

test('appendResLabChunksToBox is exported for the Laboratorio render path', () => {
  assert.equal(typeof appendResLabChunksToBox, 'function');
});

test('buildCurrentSetForGroup_: combined parsedBySection wins over the representative record\'s own stale one', () => {
  // Biometria llega primero (fragmento propio, guardado con su parsedBySection parcial);
  // Quimica Sanguinea del mismo estudio llega despues con otra hora y se vuelve el
  // registro "representativo" (mas reciente) del grupo — pero su propio parsedBySection
  // solo trae QS, no BH. El combinado (buildParsedBySectionFromResLabs sobre TODO el
  // resLabs del grupo) debe ganar siempre.
  var bhFragment = {
    fecha: '19/08/2026',
    hora: '07:00',
    resLabs: ['BH\tHb 6.75*'],
    parsedBySection: { BH: { Hb: 6.75 } },
  };
  var qsFragment = {
    fecha: '19/08/2026',
    hora: '09:30',
    resLabs: ['QS\tGlu 77'],
    parsedBySection: { QS: { Glu: 77 } },
  };
  var group = {
    sets: [bhFragment, qsFragment],
    resLabs: ['BH\tHb 6.75*', 'QS\tGlu 77'],
    bhExtras: {},
  };
  var combined = { BH: { Hb: 6.75 }, QS: { Glu: 77 } };
  var buildParsedBySectionFromResLabs = function (resLabs) {
    assert.deepEqual(resLabs, group.resLabs, 'debe parsear el resLabs combinado del grupo, no el de un fragmento');
    return combined;
  };
  var currentSet = buildCurrentSetForGroup_(group, buildParsedBySectionFromResLabs);
  assert.equal(currentSet.fecha, '19/08/2026');
  assert.equal(currentSet.hora, '09:30'); // fecha/hora sí viene del representativo (más reciente)
  assert.deepEqual(currentSet.parsedBySection, combined); // pero parsedBySection es el combinado
  assert.ok(currentSet.parsedBySection.BH, 'BH no debe perderse por el parsedBySection parcial de qsFragment');
});
