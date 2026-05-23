import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupToSesionTable,
  mapFlag,
  formatTabTitleWithContext,
  buildSesionPayload,
  listSelectableTables,
} from './sesion-ingreso-export.mjs';

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
  assert.equal(table.rows[0].flag, 'low');
});

test('mapFlag detects high from range', () => {
  assert.equal(
    mapFlag({ abnormal: true, result: '20', range: '13-17', flag: 'A' }),
    'high',
  );
});

test('formatTabTitleWithContext prefixes report date', () => {
  assert.equal(
    formatTabTitleWithContext('HEMATOLOGIA — BH', '22/05/2026'),
    '22/05 · HEMATOLOGIA — BH',
  );
  assert.equal(
    formatTabTitleWithContext('22/05 · HEMATOLOGIA', '22/05/2026'),
    '22/05 · HEMATOLOGIA',
  );
});

test('buildSesionPayload includes kind lab-tables', () => {
  const parsed = {
    departments: [
      {
        key: 'HEMATOLOGIA',
        label: 'HEMATOLOGIA',
        groups: [
          {
            title: 'BH',
            rows: [{ estudio: 'Hb', resultado: '12', ref: '13-17', abnormal: false, flag: '*' }],
          },
        ],
      },
    ],
  };
  const items = listSelectableTables(parsed, { reportDate: '22/05/2026' });
  const payload = buildSesionPayload([items[0].id], parsed, 'ROLR', { reportDate: '22/05/2026' });
  assert.equal(payload.kind, 'lab-tables');
  assert.equal(payload.tables.length, 1);
  assert.match(payload.tables[0].tabTitle, /^22\/05 ·/);
});
