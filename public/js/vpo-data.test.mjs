import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFarmacosFromMedReceta } from './vpo-data.mjs';

test('mergeFarmacosFromMedReceta solo agrega ids nuevos', () => {
  var state = {
    farmacos: [{ sourceMedId: 'med-a', nombreDisplay: 'A', sugerencia: 'X', notaEditable: 'X' }],
  };
  var items = [
    { id: 'med-a', nombreRaw: 'A', suspendido: false },
    { id: 'med-b', nombreRaw: 'B', suspendido: false },
  ];
  mergeFarmacosFromMedReceta(state, items, function (n) {
    return { sugerencia: 'CONTINUAR', notaEditable: 'CONTINUAR — ' + n };
  });
  assert.equal(state.farmacos.length, 2);
  assert.equal(state.farmacos[0].notaEditable, 'X');
  assert.match(state.farmacos[1].nombreDisplay, /B/);
});
