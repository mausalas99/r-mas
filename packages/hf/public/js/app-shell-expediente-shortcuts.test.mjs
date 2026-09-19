import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveExpedienteShortcutTarget } from './app-shell-expediente-shortcuts.mjs';

const SALA = { appMode: 'sala' };
const INTER = { appMode: 'interconsulta' };

describe('resolveExpedienteShortcutTarget', () => {
  it('⌘E: estado actual ↔ eventualidades en Sala', () => {
    assert.equal(resolveExpedienteShortcutTarget('e', 'todo', SALA), 'estadoActual');
    assert.equal(resolveExpedienteShortcutTarget('e', 'estadoActual', SALA), 'eventualidades');
    assert.equal(resolveExpedienteShortcutTarget('e', 'eventualidades', SALA), 'estadoActual');
  });

  it('⌘E en Interconsulta solo abre estado actual', () => {
    assert.equal(resolveExpedienteShortcutTarget('e', 'notas', INTER), 'estadoActual');
    assert.equal(resolveExpedienteShortcutTarget('e', 'estadoActual', INTER), 'estadoActual');
  });

  it('⌘T alterna tendencias y cultivo', () => {
    assert.equal(resolveExpedienteShortcutTarget('t', 'todo', SALA), 'tend');
    assert.equal(resolveExpedienteShortcutTarget('t', 'tend', SALA), 'cult');
    assert.equal(resolveExpedienteShortcutTarget('t', 'cult', SALA), 'tend');
  });

  it('⌘D abre datos de paciente', () => {
    assert.equal(resolveExpedienteShortcutTarget('d', 'todo', SALA), 'datos');
  });
});
