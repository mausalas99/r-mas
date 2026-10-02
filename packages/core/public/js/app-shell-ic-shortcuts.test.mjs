import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveExpedienteShortcutTarget } from './app-shell-expediente-shortcuts.mjs';
import { nextIcPill } from './app-shell-tab-shortcuts.mjs';

const ic = { appMode: 'interconsulta' };

test('⌘E en IC cicla Estado → Nota → Indic. → VPO', () => {
  assert.equal(resolveExpedienteShortcutTarget('e', 'resumen', ic, false), 'estadoActual');
  assert.equal(resolveExpedienteShortcutTarget('e', 'estadoActual', ic, true), 'notas');
  assert.equal(resolveExpedienteShortcutTarget('e', 'indica', ic, true), 'vpo');
  assert.equal(resolveExpedienteShortcutTarget('e', 'vpo', ic, true), 'estadoActual');
});

test('⌘1 en IC recorre todas las pastillas', () => {
  assert.equal(nextIcPill('resumen'), 'estadoActual');
  assert.equal(nextIcPill('vpo'), 'todo');
  assert.equal(nextIcPill('todo'), 'resumen');
});
