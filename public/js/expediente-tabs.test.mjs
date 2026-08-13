import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSOLIDATED_TABS_SALA,
  resolveConsolidatedTarget,
  consolidatedTabForGranular,
  migrateGranularInner,
  defaultGranularForConsolidatedTab,
  consolidatedInnerTabButtonId,
  getConsolidatedTabs,
  shouldShowConsolidatedTab,
  getClinicoSections,
  getSalidaSections,
  isClinicoTabHidden,
  isManejoSectionHidden,
  isClinicoCompositeVisible,
  getConsolidatedCompositeState,
  applyExpedientePaneLayout,
  resetExpedientePaneLayoutCache,
} from './expediente-tabs.mjs';

const INTER = { appMode: 'interconsulta', hideManejoSection: false };
const SALA = { appMode: 'sala', hideManejoSection: false };
const HIDE_MANEJO_INTER = { appMode: 'interconsulta', hideManejoSection: true, clinicoUnlocked: true };
const HIDE_MANEJO_LEGACY = { appMode: 'interconsulta', hideClinicoTab: true, clinicoUnlocked: true };

test('resolveConsolidatedTarget maps granular tabs to composite groups (interconsulta)', () => {
  assert.deepEqual(resolveConsolidatedTarget('todo', INTER), { tab: 'paciente', section: null });
  assert.deepEqual(resolveConsolidatedTarget('notas', INTER), { tab: 'clinico', section: 'notas' });
  assert.deepEqual(resolveConsolidatedTarget('manejo', INTER), { tab: 'clinico', section: 'notas' });
  assert.deepEqual(resolveConsolidatedTarget('tend', INTER), { tab: 'resultados', section: 'tend' });
  assert.deepEqual(resolveConsolidatedTarget('recetaHu', INTER), { tab: 'salida', section: null });
  assert.deepEqual(resolveConsolidatedTarget('listado', INTER), { tab: 'paciente', section: null });
});

test('resolveConsolidatedTarget maps listado and recetaHu to salida in sala', () => {
  assert.deepEqual(resolveConsolidatedTarget('listado', SALA), { tab: 'salida', section: 'listado' });
  assert.deepEqual(resolveConsolidatedTarget('recetaHu', SALA), { tab: 'salida', section: 'recetaHu' });
  assert.deepEqual(resolveConsolidatedTarget('manejo', SALA), { tab: 'paciente', section: null });
});

test('CONSOLIDATED_TABS_SALA has Resumen Clínico Salida (no Resultados)', () => {
  assert.deepEqual(CONSOLIDATED_TABS_SALA, ['paciente', 'clinico', 'salida']);
});

test('shouldShowConsolidatedTab: Paciente inner groups exclude Resultados', () => {
  assert.equal(shouldShowConsolidatedTab('itab-paciente', SALA), true);
  assert.equal(shouldShowConsolidatedTab('itab-clinico', SALA), true);
  assert.equal(shouldShowConsolidatedTab('itab-salida', SALA), true);
  assert.equal(shouldShowConsolidatedTab('itab-resultados', SALA), false);
  assert.equal(shouldShowConsolidatedTab('itab-resultados', INTER), false);
  assert.equal(shouldShowConsolidatedTab('paciente', SALA), true);
});

test('default paciente granular is resumen', () => {
  assert.equal(defaultGranularForConsolidatedTab('paciente', SALA), 'resumen');
});

test('resolveConsolidatedTarget resumen and todo both map to paciente', () => {
  assert.deepEqual(resolveConsolidatedTarget('resumen', SALA), { tab: 'paciente', section: null });
  assert.deepEqual(resolveConsolidatedTarget('todo', SALA), { tab: 'paciente', section: null });
});

test('resolveConsolidatedTarget estadoActual sala routes to clinico segment', () => {
  assert.deepEqual(resolveConsolidatedTarget('estadoActual', SALA), {
    tab: 'clinico',
    section: 'estadoActual',
  });
});

test('resolveConsolidatedTarget eventualidades sala routes to clinico segment', () => {
  assert.deepEqual(resolveConsolidatedTarget('eventualidades', SALA), {
    tab: 'clinico',
    section: 'eventualidades',
  });
});

test('estadoActual is not a consolidated top tab in either mode', () => {
  assert.equal(getConsolidatedTabs(INTER).includes('estadoActual'), false);
  assert.equal(getConsolidatedTabs(SALA).includes('estadoActual'), false);
});

test('migrateGranularInner keeps known tabs and falls back to resumen', () => {
  assert.equal(migrateGranularInner('indica', INTER), 'indica');
  assert.equal(migrateGranularInner('unknown', INTER), 'resumen');
  assert.equal(migrateGranularInner(null, INTER), 'resumen');
  assert.equal(migrateGranularInner('notas', SALA), 'estadoActual');
  assert.equal(migrateGranularInner('recetaHu', SALA), 'recetaHu');
  assert.equal(migrateGranularInner('listado', INTER), 'resumen');
  assert.equal(migrateGranularInner('estadoActual', SALA), 'estadoActual');
  assert.equal(migrateGranularInner('estadoActual', INTER), 'estadoActual');
  assert.equal(migrateGranularInner('datos', INTER), 'resumen');
  assert.equal(migrateGranularInner('datos', SALA), 'resumen');
  assert.equal(migrateGranularInner('todo', INTER), 'todo');
  assert.equal(migrateGranularInner('tend', SALA), 'tend');
  assert.equal(migrateGranularInner('cult', INTER), 'cult');
});

test('resolveConsolidatedTarget estadoActual inter routes to clinico segment', () => {
  assert.deepEqual(resolveConsolidatedTarget('estadoActual', INTER), {
    tab: 'clinico',
    section: 'estadoActual',
  });
});

test('defaultGranularForConsolidatedTab returns sensible defaults per mode', () => {
  assert.equal(defaultGranularForConsolidatedTab('paciente', INTER), 'resumen');
  assert.equal(defaultGranularForConsolidatedTab('clinico', INTER), 'notas');
  assert.equal(defaultGranularForConsolidatedTab('resultados', INTER), 'tend');
  assert.equal(defaultGranularForConsolidatedTab('salida', INTER), 'recetaHu');
  assert.equal(defaultGranularForConsolidatedTab('clinico', SALA), 'estadoActual');
  assert.equal(defaultGranularForConsolidatedTab('salida', SALA), 'listado');
});

test('consolidatedInnerTabButtonId resolves composite button ids', () => {
  assert.equal(consolidatedInnerTabButtonId('notas', INTER), 'itab-clinico');
  assert.equal(consolidatedInnerTabButtonId('todo', INTER), 'itab-paciente');
  assert.equal(consolidatedInnerTabButtonId('recetaHu', INTER), 'itab-salida');
  assert.equal(consolidatedInnerTabButtonId('listado', SALA), 'itab-salida');
  assert.equal(consolidatedInnerTabButtonId('clinico', INTER), 'itab-clinico');
  assert.equal(consolidatedInnerTabButtonId('estadoActual', SALA), 'itab-clinico');
  assert.equal(consolidatedInnerTabButtonId('eventualidades', SALA), 'itab-clinico');
});

test('consolidatedTabForGranular returns top-level composite tab id', () => {
  assert.equal(consolidatedTabForGranular('cult', INTER), 'resultados');
  assert.equal(consolidatedTabForGranular('datos', INTER), 'paciente');
});

test('getClinicoSections differs by mode (manejo hidden globally)', () => {
  assert.deepEqual(getClinicoSections(INTER), ['estadoActual', 'notas', 'indica', 'vpo']);
  assert.deepEqual(getClinicoSections(SALA), ['estadoActual', 'eventualidades']);
});

test('getSalidaSections only in sala', () => {
  assert.deepEqual(getSalidaSections(SALA), ['listado', 'vpo', 'recetaHu']);
  assert.deepEqual(getSalidaSections(INTER), []);
});

test('isManejoSectionHidden is always true (global product policy)', () => {
  assert.equal(isManejoSectionHidden({}), true);
  assert.equal(isManejoSectionHidden({ hideManejoSection: false, clinicoUnlocked: true }), true);
  assert.equal(isManejoSectionHidden({ hideManejoSection: true, clinicoUnlocked: true }), true);
  assert.equal(isManejoSectionHidden(HIDE_MANEJO_LEGACY), true);
});

test('inter clinico sections include estadoActual first, vpo, no manejo or historia', () => {
  assert.deepEqual(getClinicoSections(INTER), ['estadoActual', 'notas', 'indica', 'vpo']);
});

test('sala salida sections include vpo between listado and recetaHu', () => {
  assert.deepEqual(getSalidaSections(SALA), ['listado', 'vpo', 'recetaHu']);
});

test('resolveConsolidatedTarget vpo in inter maps to clinico', () => {
  assert.deepEqual(resolveConsolidatedTarget('vpo', INTER), { tab: 'clinico', section: 'vpo' });
});

test('resolveConsolidatedTarget vpo in sala maps to salida', () => {
  assert.deepEqual(resolveConsolidatedTarget('vpo', SALA), { tab: 'salida', section: 'vpo' });
});

test('interconsulta keeps clinico tab when only manejo is hidden', () => {
  assert.equal(isClinicoCompositeVisible(INTER), true);
  assert.equal(isClinicoCompositeVisible(HIDE_MANEJO_INTER), true);
  assert.equal(getConsolidatedTabs(HIDE_MANEJO_INTER).includes('clinico'), true);
  assert.deepEqual(getClinicoSections(HIDE_MANEJO_INTER), [
    'estadoActual',
    'notas',
    'indica',
    'vpo',
  ]);
});

test('sala keeps clinico for estado actual when manejo is hidden', () => {
  const hiddenSala = { appMode: 'sala', hideManejoSection: true, clinicoUnlocked: true };
  assert.equal(isClinicoCompositeVisible(hiddenSala), true);
  assert.equal(getConsolidatedTabs(hiddenSala).includes('clinico'), true);
  assert.deepEqual(getClinicoSections(hiddenSala), ['estadoActual', 'eventualidades']);
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
  assert.equal(isClinicoTabHidden({ appMode: 'sala', hideClinicoTab: true, clinicoUnlocked: true }), true);
});

test('getConsolidatedCompositeState keeps clinico visible in sala for historia', () => {
  const hiddenSala = { appMode: 'sala', hideManejoSection: true, clinicoUnlocked: true };
  const state = getConsolidatedCompositeState('todo', hiddenSala);
  assert.equal(state.paciente.visible, true);
  assert.equal(state.paciente.active, true);
  assert.equal(state.clinico.visible, true);
  assert.equal(state.clinico.active, false);
});

test('getConsolidatedCompositeState keeps clinico visible in inter when only manejo hidden', () => {
  const state = getConsolidatedCompositeState('notas', HIDE_MANEJO_INTER);
  assert.equal(state.clinico.visible, true);
  assert.equal(state.clinico.active, true);
  assert.equal(state.estadoActual, undefined);
});

function makeEl(id, className) {
  const classSet = new Set(String(className || '').split(/\s+/).filter(Boolean));
  /** @type {any} */
  const el = {
    id: id || '',
    children: [],
    parentElement: null,
    style: {},
    classList: {
      add: function () {
        for (let i = 0; i < arguments.length; i++) classSet.add(arguments[i]);
      },
      remove: function () {
        for (let i = 0; i < arguments.length; i++) classSet.delete(arguments[i]);
      },
      contains: function (c) {
        return classSet.has(c);
      },
      toggle: function (c, force) {
        if (force === true) classSet.add(c);
        else if (force === false) classSet.delete(c);
        else if (classSet.has(c)) classSet.delete(c);
        else classSet.add(c);
      },
    },
    querySelector: function (sel) {
      if (sel === '.exp-segment-body--resultados') {
        return this._resultadosBody || null;
      }
      if (sel === '.exp-segment-body--clinico') return this._clinicoBody || null;
      if (sel === '.exp-pendientes-mount') return this._pendientes || null;
      if (sel === '.exp-segment-body--salida' || sel === '.exp-salida-mount') {
        return this._salidaBody || null;
      }
      return null;
    },
    appendChild: function (child) {
      if (child.parentElement && child.parentElement.children) {
        child.parentElement.children = child.parentElement.children.filter(function (c) {
          return c !== child;
        });
      }
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
  };
  return el;
}

test('applyExpedientePaneLayout mounts Tendencias into Laboratorio (and remounts on 2nd call)', () => {
  const host = makeEl('expediente-panes-host', 'expediente-panes-host');
  const resultados = makeEl('itab-content-resultados', 'tab-content exp-composite-pane');
  const body = makeEl('', 'exp-segment-body exp-segment-body--resultados');
  resultados._resultadosBody = body;
  body.parentElement = resultados;
  const tendMount = makeEl('lab-inner-tend-mount', 'lab-inner-panel');
  const cultMount = makeEl('lab-inner-cult-mount', 'lab-inner-panel');
  const tend = makeEl('itab-content-tend', 'tab-content');
  const cult = makeEl('itab-content-cult', 'tab-content');
  host.appendChild(resultados);
  host.appendChild(tend);
  host.appendChild(cult);

  const byId = {
    'expediente-panes-host': host,
    'itab-content-resultados': resultados,
    'lab-inner-tend-mount': tendMount,
    'lab-inner-cult-mount': cultMount,
    'itab-content-tend': tend,
    'itab-content-cult': cult,
    'itab-content-paciente': makeEl('itab-content-paciente', 'tab-content exp-composite-pane'),
    'itab-content-clinico': makeEl('itab-content-clinico', 'tab-content exp-composite-pane'),
    'itab-content-salida': makeEl('itab-content-salida', 'tab-content exp-composite-pane'),
    'exp-segment-clinico': makeEl('exp-segment-clinico', ''),
    'exp-segment-salida': makeEl('exp-segment-salida', ''),
    'itab-estadoActual': makeEl('itab-estadoActual', ''),
  };
  byId['itab-content-paciente']._pendientes = makeEl('', 'exp-pendientes-mount');
  byId['itab-content-clinico']._clinicoBody = makeEl('', 'exp-segment-body--clinico');
  byId['itab-content-salida']._salidaBody = makeEl('', 'exp-segment-body--salida');

  const prevDoc = globalThis.document;
  globalThis.document = {
    getElementById: function (id) {
      return byId[id] || null;
    },
    querySelector: function (sel) {
      if (sel && sel.charAt(0) === '#') return byId[sel.slice(1)] || null;
      return null;
    },
  };

  try {
    resetExpedientePaneLayoutCache();
    applyExpedientePaneLayout(SALA);
    assert.equal(tend.parentElement, tendMount);
    assert.equal(tend.classList.contains('tab-content'), false);
    assert.equal(tend.classList.contains('exp-segment-panel'), true);
    assert.equal(cult.parentElement, cultMount);

    // Simulate a DOM reset that orphans tend back under the host.
    host.appendChild(tend);
    tend.classList.add('tab-content');
    tend.classList.remove('exp-segment-panel');
    applyExpedientePaneLayout(SALA);
    assert.equal(tend.parentElement, tendMount, 'second apply must remount Tendencias');
    assert.equal(tend.classList.contains('exp-segment-panel'), true);
  } finally {
    resetExpedientePaneLayoutCache();
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
});
