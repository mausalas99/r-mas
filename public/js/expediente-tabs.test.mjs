import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSOLIDATED_TABS_SALA,
  useConsolidatedExpedienteTabs,
  resolveConsolidatedTarget,
  consolidatedTabForGranular,
  migrateGranularInner,
  defaultGranularForConsolidatedTab,
  consolidatedInnerTabButtonId,
  getConsolidatedTabs,
  getClinicoSections,
  getSalidaSections,
  isClinicoTabHidden,
  isManejoSectionHidden,
  isClinicoCompositeVisible,
} from './expediente-tabs.mjs';

const INTER = { appMode: 'interconsulta' };
const SALA = { appMode: 'sala' };
const HIDE_MANEJO_INTER = { appMode: 'interconsulta', hideManejoSection: true };
const HIDE_MANEJO_LEGACY = { appMode: 'interconsulta', hideClinicoTab: true };

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

test('CONSOLIDATED_TABS_SALA includes estadoActual between clinico and resultados', () => {
  assert.deepEqual(CONSOLIDATED_TABS_SALA, [
    'paciente',
    'clinico',
    'estadoActual',
    'resultados',
    'salida',
  ]);
});

test("resolveConsolidatedTarget estadoActual sala", () => {
  assert.deepEqual(resolveConsolidatedTarget('estadoActual', SALA), { tab: 'estadoActual', section: null });
});

test('estadoActual is not an interconsulta consolidated tab', () => {
  assert.equal(getConsolidatedTabs(INTER).includes('estadoActual'), false);
  assert.equal(getConsolidatedTabs(SALA).includes('estadoActual'), true);
});

test('migrateGranularInner keeps known tabs and falls back to todo', () => {
  assert.equal(migrateGranularInner('indica', INTER), 'indica');
  assert.equal(migrateGranularInner('unknown', INTER), 'todo');
  assert.equal(migrateGranularInner(null, INTER), 'todo');
  assert.equal(migrateGranularInner('notas', SALA), 'manejo');
  assert.equal(migrateGranularInner('recetaHu', SALA), 'recetaHu');
  assert.equal(migrateGranularInner('listado', INTER), 'todo');
  assert.equal(migrateGranularInner('estadoActual', SALA), 'estadoActual');
  assert.equal(migrateGranularInner('estadoActual', INTER), 'todo');
});

test('defaultGranularForConsolidatedTab returns sensible defaults per mode', () => {
  assert.equal(defaultGranularForConsolidatedTab('paciente', INTER), 'todo');
  assert.equal(defaultGranularForConsolidatedTab('clinico', INTER), 'notas');
  assert.equal(defaultGranularForConsolidatedTab('resultados', INTER), 'tend');
  assert.equal(defaultGranularForConsolidatedTab('salida', INTER), 'recetaHu');
  assert.equal(defaultGranularForConsolidatedTab('clinico', SALA), 'manejo');
  assert.equal(defaultGranularForConsolidatedTab('salida', SALA), 'listado');
  assert.equal(defaultGranularForConsolidatedTab('estadoActual', SALA), 'estadoActual');
});

test('consolidatedInnerTabButtonId resolves composite button ids', () => {
  assert.equal(consolidatedInnerTabButtonId('notas', INTER), 'itab-clinico');
  assert.equal(consolidatedInnerTabButtonId('todo', INTER), 'itab-paciente');
  assert.equal(consolidatedInnerTabButtonId('recetaHu', INTER), 'itab-salida');
  assert.equal(consolidatedInnerTabButtonId('listado', SALA), 'itab-salida');
  assert.equal(consolidatedInnerTabButtonId('clinico', INTER), 'itab-clinico');
  assert.equal(consolidatedInnerTabButtonId('estadoActual', SALA), 'itab-estadoActual');
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

test('isManejoSectionHidden respects hideManejoSection and legacy hideClinicoTab', () => {
  assert.equal(isManejoSectionHidden({}), false);
  assert.equal(isManejoSectionHidden({ hideManejoSection: true }), true);
  assert.equal(isManejoSectionHidden(HIDE_MANEJO_LEGACY), true);
});

test('interconsulta keeps clinico tab when only manejo is hidden', () => {
  assert.equal(isClinicoCompositeVisible(INTER), true);
  assert.equal(isClinicoCompositeVisible(HIDE_MANEJO_INTER), true);
  assert.equal(getConsolidatedTabs(HIDE_MANEJO_INTER).includes('clinico'), true);
  assert.deepEqual(getClinicoSections(HIDE_MANEJO_INTER), ['notas', 'indica']);
});

test('sala omits clinico composite when manejo is hidden', () => {
  const hiddenSala = { appMode: 'sala', hideManejoSection: true };
  assert.equal(isClinicoCompositeVisible(hiddenSala), false);
  assert.equal(getConsolidatedTabs(hiddenSala).includes('clinico'), false);
  assert.deepEqual(getClinicoSections(hiddenSala), []);
});

test('migrateGranularInner keeps notas and indica when manejo is hidden (inter)', () => {
  assert.equal(migrateGranularInner('notas', HIDE_MANEJO_INTER), 'notas');
  assert.equal(migrateGranularInner('indica', HIDE_MANEJO_INTER), 'indica');
  assert.equal(migrateGranularInner('manejo', HIDE_MANEJO_INTER), 'notas');
});

test('consolidatedInnerTabButtonId keeps clinico for notas when manejo hidden', () => {
  assert.equal(consolidatedInnerTabButtonId('notas', HIDE_MANEJO_INTER), 'itab-clinico');
  assert.equal(consolidatedInnerTabButtonId('indica', HIDE_MANEJO_INTER), 'itab-clinico');
  assert.equal(consolidatedInnerTabButtonId('manejo', HIDE_MANEJO_INTER), 'itab-clinico');
});

test('resolveConsolidatedTarget redirects manejo to notas when hidden (inter)', () => {
  assert.deepEqual(resolveConsolidatedTarget('manejo', HIDE_MANEJO_INTER), {
    tab: 'clinico',
    section: 'notas',
  });
});

test('legacy isClinicoTabHidden only true in sala', () => {
  assert.equal(isClinicoTabHidden(HIDE_MANEJO_INTER), false);
  assert.equal(isClinicoTabHidden({ appMode: 'sala', hideClinicoTab: true }), true);
});
