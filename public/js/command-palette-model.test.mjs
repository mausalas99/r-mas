import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_ITEMS,
  buildPaletteItems,
  paletteItemText,
  rankPalette,
} from './command-palette-model.mjs';

const SALA = { appMode: 'sala' };
const PATIENTS = [
  { id: 1, nombre: 'García López, Juan', cuarto: '412', pinned: true },
  { id: 2, nombre: 'Martínez, Ana', cuarto: '410', pinned: false },
];

test('buildPaletteItems: actions, sections, app tabs, patients, and combos', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  assert.ok(items.some((it) => it.kind === 'action' && it.actionId === 'procesar-some'));
  assert.ok(items.some((it) => it.kind === 'action' && it.actionId === 'doc-queue'));
  assert.ok(items.some((it) => it.kind === 'action' && it.actionId === 'entrega-prep'));
  assert.ok(items.some((it) => it.kind === 'action' && it.actionId === 'lab-repo-batch'));
  assert.ok(items.some((it) => it.kind === 'action' && it.actionId === 'export-note'));
  assert.ok(items.some((it) => it.kind === 'action' && it.actionId === 'new-pendiente'));
  assert.ok(items.some((it) => it.kind === 'section' && it.section === 'tend'));
  assert.ok(items.some((it) => it.kind === 'app-tab' && it.tab === 'lab'));
  assert.ok(items.some((it) => it.kind === 'patient' && it.patientId === 1 && it.pinned));
  assert.ok(
    items.some(
      (it) => it.kind === 'patient-section' && it.patientId === 1 && it.section === 'tend'
    )
  );
  assert.equal(ACTION_ITEMS.length >= 6, true);
});

test('rankPalette: "tend gar" resolves to Tendencias of García', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('tend gar', items, 12);
  assert.ok(top.length >= 1);
  assert.equal(top[0].kind, 'patient-section');
  assert.equal(top[0].patientId, 1);
  assert.equal(top[0].section, 'tend');
});

test('rankPalette: empty query lists actions, pinned patients, then others', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('', items, 12);
  assert.ok(top.length > 0 && top.length <= 12);
  assert.equal(top[0].kind, 'action');
  assert.ok(top.every((it) => it.kind === 'action' || it.kind === 'patient' || it.kind === 'section'));
  const firstPatient = top.find((it) => it.kind === 'patient');
  assert.ok(firstPatient);
  assert.equal(firstPatient.patientId, 1);
  assert.equal(firstPatient.pinned, true);
});

test('rankPalette: "procesar some" → Procesar SOME action', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('procesar some', items, 12);
  assert.ok(top.length >= 1);
  assert.equal(top[0].kind, 'action');
  assert.equal(top[0].actionId, 'procesar-some');
});

test('rankPalette: "actualizar labs" → Actualizar labs de mi equipo', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('actualizar labs', items, 12);
  assert.ok(top.length >= 1);
  assert.equal(top[0].kind, 'action');
  assert.equal(top[0].actionId, 'lab-repo-batch');
});

test('rankPalette: "falta documentar" → doc queue action', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('falta documentar', items, 12);
  assert.ok(top.length >= 1);
  assert.equal(top[0].kind, 'action');
  assert.equal(top[0].actionId, 'doc-queue');
});

test('rankPalette: "preparar entrega" → entrega prep action', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('preparar entrega', items, 12);
  assert.ok(top.length >= 1);
  assert.equal(top[0].kind, 'action');
  assert.equal(top[0].actionId, 'entrega-prep');
});

test('rankPalette: "exportar nota" → export action', () => {
  const items = buildPaletteItems(SALA, PATIENTS);
  const top = rankPalette('exportar nota', items, 12);
  assert.ok(top.length >= 1);
  assert.equal(top[0].kind, 'action');
  assert.equal(top[0].actionId, 'export-note');
});

test('paletteItemText includes keywords for actions', () => {
  const action = ACTION_ITEMS.find((it) => it.actionId === 'open-pase');
  assert.ok(action);
  const text = paletteItemText(action);
  assert.match(text, /Abrir pase/i);
  assert.match(text, /ronda/i);
});
