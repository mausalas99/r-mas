import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  useConsolidatedExpedienteTabs,
  resolveConsolidatedTarget,
  consolidatedTabForGranular,
  migrateGranularInner,
  defaultGranularForConsolidatedTab,
  consolidatedInnerTabButtonId,
  getClinicoSections,
  getSalidaSections,
} from './expediente-tabs.mjs';

const INTER = { appMode: 'interconsulta' };
const SALA = { appMode: 'sala' };

test('useConsolidatedExpedienteTabs is always true', () => {
  assert.equal(useConsolidatedExpedienteTabs(SALA), true);
  assert.equal(useConsolidatedExpedienteTabs(INTER), true);
  assert.equal(useConsolidatedExpedienteTabs(null), true);
});

test('resolveConsolidatedTarget maps granular tabs to composite groups (interconsulta)', () => {
  assert.deepEqual(resolveConsolidatedTarget('todo', INTER), { tab: 'paciente', section: null });
  assert.deepEqual(resolveConsolidatedTarget('notas', INTER), { tab: 'clinico', section: 'notas' });
  assert.deepEqual(resolveConsolidatedTarget('manejo', INTER), { tab: 'clinico', section: 'manejo' });
  assert.deepEqual(resolveConsolidatedTarget('tend', INTER), { tab: 'resultados', section: 'tend' });
  assert.deepEqual(resolveConsolidatedTarget('recetaHu', INTER), { tab: 'salida', section: null });
  assert.deepEqual(resolveConsolidatedTarget('listado', INTER), { tab: 'paciente', section: null });
});

test('resolveConsolidatedTarget maps listado and recetaHu to salida in sala', () => {
  assert.deepEqual(resolveConsolidatedTarget('listado', SALA), { tab: 'salida', section: 'listado' });
  assert.deepEqual(resolveConsolidatedTarget('recetaHu', SALA), { tab: 'salida', section: 'recetaHu' });
  assert.deepEqual(resolveConsolidatedTarget('manejo', SALA), { tab: 'clinico', section: 'manejo' });
});

test('migrateGranularInner keeps known tabs and falls back to todo', () => {
  assert.equal(migrateGranularInner('indica', INTER), 'indica');
  assert.equal(migrateGranularInner('unknown', INTER), 'todo');
  assert.equal(migrateGranularInner(null, INTER), 'todo');
  assert.equal(migrateGranularInner('notas', SALA), 'manejo');
  assert.equal(migrateGranularInner('recetaHu', SALA), 'recetaHu');
  assert.equal(migrateGranularInner('listado', INTER), 'todo');
});

test('defaultGranularForConsolidatedTab returns sensible defaults per mode', () => {
  assert.equal(defaultGranularForConsolidatedTab('paciente', INTER), 'todo');
  assert.equal(defaultGranularForConsolidatedTab('clinico', INTER), 'notas');
  assert.equal(defaultGranularForConsolidatedTab('resultados', INTER), 'tend');
  assert.equal(defaultGranularForConsolidatedTab('salida', INTER), 'recetaHu');
  assert.equal(defaultGranularForConsolidatedTab('clinico', SALA), 'manejo');
  assert.equal(defaultGranularForConsolidatedTab('salida', SALA), 'listado');
});

test('consolidatedInnerTabButtonId resolves composite button ids', () => {
  assert.equal(consolidatedInnerTabButtonId('notas', INTER), 'itab-clinico');
  assert.equal(consolidatedInnerTabButtonId('todo', INTER), 'itab-paciente');
  assert.equal(consolidatedInnerTabButtonId('recetaHu', INTER), 'itab-salida');
  assert.equal(consolidatedInnerTabButtonId('listado', SALA), 'itab-salida');
  assert.equal(consolidatedInnerTabButtonId('clinico', INTER), 'itab-clinico');
});

test('consolidatedTabForGranular returns top-level composite tab id', () => {
  assert.equal(consolidatedTabForGranular('cult', INTER), 'resultados');
  assert.equal(consolidatedTabForGranular('datos', INTER), 'paciente');
});

test('getClinicoSections differs by mode', () => {
  assert.deepEqual(getClinicoSections(INTER), ['notas', 'indica', 'manejo']);
  assert.deepEqual(getClinicoSections(SALA), ['manejo']);
});

test('getSalidaSections only in sala', () => {
  assert.deepEqual(getSalidaSections(SALA), ['listado', 'recetaHu']);
  assert.deepEqual(getSalidaSections(INTER), []);
});
