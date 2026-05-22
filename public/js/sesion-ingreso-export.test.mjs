import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupToSesionTable } from './sesion-ingreso-export.mjs';

test('groupToSesionTable maps export model rows', () => {
  const group = {
    title: 'BH',
    rows: [
      {
        estudio: 'Hb',
        resultado: '10.2',
        ref: '13-17',
        abnormal: true,
        flag: 'A',
      },
    ],
  };
  const table = groupToSesionTable(group, {
    tabTitle: 'Al ingreso — BH',
    isAdmission: true,
  });
  assert.equal(table.tabTitle, 'Al ingreso — BH');
  assert.equal(table.isAdmission, true);
  assert.equal(table.rows[0].variable, 'Hb');
  assert.equal(table.rows[0].result, '10.2');
});
