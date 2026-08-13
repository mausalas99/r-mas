import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_LABELS,
  SECTION_LABELS,
  LAB_INNER_SECTIONS,
  groupSections,
  buildGroupRowModel,
} from './expediente-group-row.mjs';

const SALA = { appMode: 'sala' };
const INTER = { appMode: 'interconsulta' };

test('groupSections: paciente is a leaf (datos collapse is in-pane, not nav)', () => {
  assert.deepEqual(groupSections('paciente', SALA), []);
  assert.deepEqual(groupSections('paciente', INTER), []);
});

test('groupSections: clinico follows mode', () => {
  assert.deepEqual(groupSections('clinico', SALA), ['estadoActual', 'eventualidades']);
  assert.deepEqual(groupSections('clinico', INTER), ['estadoActual', 'notas', 'indica', 'vpo']);
});

test('groupSections: resultados and salida come from the existing maps', () => {
  assert.deepEqual(groupSections('resultados', SALA), ['tend', 'cult']);
  assert.deepEqual(groupSections('salida', SALA), ['listado', 'vpo', 'recetaHu']);
  assert.deepEqual(groupSections('salida', INTER), []);
});

test('buildGroupRowModel: ids are Resumen Clínico Salida (no Resultados)', () => {
  const model = buildGroupRowModel('resumen', SALA);
  const ids = model.map((g) => g.id);
  assert.deepEqual(ids, ['paciente', 'clinico', 'salida']);
  assert.equal(GROUP_LABELS.paciente, 'Resumen');
  const pac = model.find((g) => g.id === 'paciente');
  assert.equal(pac.active, true);
  assert.equal(pac.label, 'Resumen');
  assert.equal(model.some((g) => g.id === 'resultados'), false);
});

test('buildGroupRowModel: active group and section reflect the granular target', () => {
  const model = buildGroupRowModel('estadoActual', SALA);
  const clinico = model.find((g) => g.id === 'clinico');
  assert.equal(clinico.active, true);
  assert.equal(clinico.sections.find((s) => s.id === 'estadoActual').active, true);
  assert.equal(clinico.sections.find((s) => s.id === 'eventualidades').active, false);
  assert.equal(model.find((g) => g.id === 'paciente').active, false);
});

test('buildGroupRowModel: paciente is active for datos or todo without sub-pills', () => {
  const todoModel = buildGroupRowModel('todo', SALA);
  const pacTodo = todoModel.find((g) => g.id === 'paciente');
  assert.equal(pacTodo.active, true);
  assert.equal(pacTodo.leaf, true);
  assert.deepEqual(pacTodo.sections, []);

  const datosModel = buildGroupRowModel('datos', SALA);
  const pacDatos = datosModel.find((g) => g.id === 'paciente');
  assert.equal(pacDatos.active, true);
  assert.equal(pacDatos.leaf, true);
});

test('LAB_INNER_SECTIONS lists labs tend cult', () => {
  assert.deepEqual(LAB_INNER_SECTIONS, ['labs', 'tend', 'cult']);
  assert.equal(SECTION_LABELS.labs, 'Labs');
});

test('labels exist for every section that can appear', () => {
  ['paciente', 'clinico', 'salida'].forEach((g) => {
    assert.ok(GROUP_LABELS[g], 'group label ' + g);
    [SALA, INTER].forEach((st) => {
      groupSections(g, st).forEach((s) => assert.ok(SECTION_LABELS[s], 'section label ' + s));
    });
  });
  LAB_INNER_SECTIONS.forEach((s) => {
    assert.ok(SECTION_LABELS[s], 'lab inner label ' + s);
  });
});
